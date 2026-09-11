import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createResidentStateHandler } from '../lib/types/resident-state.js'
import { apply } from '../lib/types/client/index.js'

test('recovery survives a new handler and concurrent resident updates without losing associations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'agentville-recovery-'))
  const file = join(directory, 'state.json')
  let handler = createResidentStateHandler(file)
  const server = createServer((req, res) => { void handler(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  const request = body => fetch(url, { method: body ? 'POST' : 'GET', headers: { 'x-agentville-state': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  try {
    assert.equal((await fetch(url)).status, 403)
    assert.equal((await fetch(url, { headers: { 'x-agentville-state': '1', origin: 'http://untrusted.test' } })).status, 403)
    assert.deepEqual(await (await request()).json(), { sessions: {} })
    const results = await Promise.all([
      request({ projectId: 'project' }),
      request({ projectId: 'project', residentId: 'coder', sessionId: 'coder-session' }),
      request({ projectId: 'project', residentId: 'teacher', sessionId: 'teacher-session' }),
    ])
    assert.ok(results.every(response => response.status === 200))
    handler = createResidentStateHandler(file)
    assert.deepEqual(await (await request()).json(), { projectId: 'project', sessions: { project: { coder: 'coder-session', teacher: 'teacher-session' } } })
    assert.equal((await request({ projectId: '__proto__', residentId: 'coder', sessionId: 'x' })).status, 400)
    await writeFile(file, 'corrupt')
    assert.equal((await request()).status, 500)
    assert.equal((await request({ projectId: 'other' })).status, 500)
    assert.equal(await readFile(file, 'utf8'), 'corrupt', 'corrupt data is not overwritten')
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

function clientFixture(t, { state = { sessions: {} }, local = {}, rows = [], members = rows.map(row => row.id) } = {}) {
  const originals = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch }
  t.after(() => Object.assign(globalThis, originals))
  globalThis.window = { location: { search: '', pathname: '/' } }
  globalThis.localStorage = { getItem: () => JSON.stringify(local), setItem: () => { throw new Error('storage disabled') } }
  const writes = []
  globalThis.fetch = async (_url, options) => {
    if (options.method === 'POST') {
      const update = JSON.parse(options.body)
      writes.push(update)
      if (update.residentId) state.sessions[update.projectId] = { ...state.sessions[update.projectId], [update.residentId]: update.sessionId }
      else state.projectId = update.projectId
    }
    return { ok: true, json: async () => structuredClone(state) }
  }
  let injected
  let created = 0
  const ctx = {
    effect() {}, remote: {},
    slots: { inject: (_name, callback) => callback(), register: options => { if (options.inject) injected = options.inject() } },
    workspaces: { list: { getSnapshot: () => ({ items: [{ workspaceId: 'project', title: 'Project', sessionIds: members }] }) } },
    sessions: {
      refresh: async () => {}, list: { getSnapshot: () => ({ phase: 'ready', byId: Object.fromEntries(rows.map(row => [row.id, row])) }) },
      create: async () => { created++; return 'new-session' },
      binding: () => ({ session: { rename: async () => ({ ok: true }) } }),
    },
  }
  apply(ctx)
  return { api: injected, writes, created: () => created }
}

test('fresh browser recovers host project and resident session without creating another', async t => {
  const fixture = clientFixture(t, { state: { projectId: 'project', sessions: { project: { coder: 'old' } } }, rows: [{ id: 'old', title: 'User renamed this' }] })
  assert.equal(await fixture.api.restoreProject(), 'project')
  assert.equal(fixture.api.sessionForResident('project', 'coder'), 'old')
  assert.equal(await fixture.api.selectResident('coder', 'project'), 'old')
  assert.equal(fixture.created(), 0)
})

test('legacy browser mapping migrates even with storage unavailable for writes', async t => {
  const fixture = clientFixture(t, { local: { project: { coder: 'old' } }, rows: [{ id: 'old' }] })
  await fixture.api.restoreProject()
  assert.equal(await fixture.api.selectResident('coder', 'project'), 'old')
  assert.equal(fixture.writes.at(-1).sessionId, 'old')
  assert.equal(fixture.created(), 0)
})

test('unique legacy title recovers only inside the owning workspace', async t => {
  const fixture = clientFixture(t, { rows: [{ id: 'old', title: 'Coder · Project' }, { id: 'foreign', title: 'Coder · Elsewhere' }], members: ['old'] })
  await fixture.api.restoreProject()
  assert.equal(await fixture.api.selectResident('coder', 'project'), 'old')
  assert.equal(fixture.created(), 0)
})

test('deleted mapping blocks replacement session creation', async t => {
  const fixture = clientFixture(t, { state: { sessions: { project: { coder: 'deleted' } } }, rows: [{ id: 'older', title: 'Coder · Project' }] })
  await fixture.api.restoreProject()
  await assert.rejects(fixture.api.selectResident('coder', 'project'), /原居民会话/)
  assert.equal(fixture.created(), 0)
})

test('ambiguous legacy sessions are not silently claimed or replaced', async t => {
  const fixture = clientFixture(t, { rows: [{ id: 'a', title: 'Coder · Project' }, { id: 'b', title: 'Coder · Project' }] })
  await fixture.api.restoreProject()
  await assert.rejects(fixture.api.selectResident('coder', 'project'), /多个旧居民会话/)
  assert.equal(fixture.created(), 0)
})
