import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createResidentStateHandler } from '../lib/types/resident-state.js'
import { apply } from '../lib/types/client/index.js'
import { zh } from '../lib/types/client/locales.js'
import { ResidentBindingCoordinator } from '../lib/types/client/resident-binding.js'

test('resident binding serializes concurrent selection and releases failed operations', async () => {
  const state = { sessions: {} }
  let creates = 0
  let failRefresh = true
  let releaseCreate
  const createGate = new Promise(resolve => { releaseCreate = resolve })
  const storage = { getItem: () => null, setItem() {}, removeItem() {} }
  const coordinator = new ResidentBindingCoordinator({
    storage,
    sessions: {
      refresh: async () => { if (failRefresh) { failRefresh = false; throw new Error('refresh failed') } },
      snapshot: () => ({ phase: 'ready', byId: {} }),
      create: async () => { creates++; await createGate; return 'new-session' },
      rename: async () => ({ ok: true }),
    },
    workspaces: () => [{ workspaceId: 'project', title: 'Project', sessionIds: [] }],
    state: async update => {
      if (update?.residentId) state.sessions[update.projectId] = { [update.residentId]: update.sessionId }
      return structuredClone(state)
    },
    error: key => key,
    randomId: () => 'request-id',
  })

  await assert.rejects(coordinator.selectResident('coder', 'project'), /refresh failed/)
  const first = coordinator.selectResident('coder', 'project')
  const second = coordinator.selectResident('coder', 'project')
  assert.equal(first, second)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(creates, 1)
  releaseCreate()
  assert.deepEqual(await Promise.all([first, second]), ['new-session', 'new-session'])
  assert.equal(coordinator.sessionForResident('project', 'coder'), undefined, 'DSH catalog remains the source of session existence')
})

test('recovery survives a new handler and concurrent resident updates without losing associations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'qcode-recovery-'))
  const file = join(directory, 'state.json')
  let handler = createResidentStateHandler(file)
  const server = createServer((req, res) => { void handler(req, res) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  const request = body => fetch(url, { method: body ? 'POST' : 'GET', headers: { 'x-qcode-state': '1' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  try {
    assert.equal((await fetch(url)).status, 403)
    assert.equal((await fetch(url, { headers: { 'x-qcode-state': '1', origin: 'http://untrusted.test' } })).status, 403)
    assert.equal((await fetch(url, { headers: { 'x-agent-isles-state': '1' } })).status, 200, 'legacy header remains compatible')
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

function clientFixture(t, { state = { sessions: {} }, rows = [], members = rows.map(row => row.id) } = {}) {
  const originals = { window: globalThis.window, localStorage: globalThis.localStorage, fetch: globalThis.fetch }
  t.after(() => Object.assign(globalThis, originals))
  globalThis.window = { location: { search: '', pathname: '/' } }
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('storage disabled') },
  }
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
    locale: { bind: () => key => zh[key], getSnapshot: () => ({ active: 'zh' }) },
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
