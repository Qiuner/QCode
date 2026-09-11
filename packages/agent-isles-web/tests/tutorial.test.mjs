import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative } from 'node:path'
import { createServer } from 'node:http'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { JsonStorageBackend } from '@deepseek-ai/dsh-storage-json'
import { createTutorialHandler, tutorialDomain } from '../lib/types/tutorial.js'

test('tutorial persists, protects project scope and requires completed execution plus explicit experience', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'isles-tutorial-'))
  const backend = new JsonStorageBackend(join(dir, 'storage'))
  const facility = new DomainFacility({ storage: { backend: { get: () => backend } }, emit() {} }, { backend: 'json' })
  let domain = await facility.open(tutorialDomain)
  const workspace = { id: 'project', title: '练习', path: dir, sessionIds: ['session'] }
  let events = []
  let flushes = 0
  const ctx = {
    workspaceRegistry: { get: id => id === workspace.id ? workspace : undefined },
    sessions: { get: () => ({ snapshotEvents: () => events }) },
    sessionPersistence: { flush: async () => { flushes++ } },
    fs: {
      resolve: async (path, options = {}) => realpath(resolve(options.cwd ?? dir, path)),
      contains: (root, path) => !relative(root, path).startsWith('..'),
      readBytes: path => readFile(path),
    },
  }
  let handler = createTutorialHandler(ctx, domain.table('runs'))
  const server = createServer((req, res) => void handler.handle(req, res))
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  const url = `http://127.0.0.1:${server.address().port}`
  const post = body => fetch(url, { method: 'POST', headers: { 'x-agent-isles-tutorial': '1' }, body: JSON.stringify(body) })
  let run
  const command = async (action, values = {}, expected = 200) => {
    const response = await post({ action, requestId: crypto.randomUUID(), ...(run ? { runId: run.id, revision: run.revision } : {}), ...values })
    const result = await response.json()
    assert.equal(response.status, expected, JSON.stringify(result))
    if (expected === 200) run = result
    return result
  }
  const event = (type, data) => { events.push({ seq: events.length, type, data }) }
  const user = (text, rpcId) => ({ source: { kind: 'user', rpcId }, content: [{ type: 'text', text }] })
  const result = (turn, isError = false) => ({ turn, message: { content: [{ type: 'tool-result', isError }] } })
  try {
    assert.equal((await fetch(url)).status, 403)
    assert.equal((await fetch(url, { headers: { 'x-agent-isles-tutorial': '1', origin: 'http://evil.test' } })).status, 403)
    await command('start')
    await command('idea', { draft: '做一个待办清单' })
    const stale = { runId: run.id, revision: run.revision }
    await command('draft', { draft: '保留无项目需求' })
    await command('pause', stale, 409)
    await handler.close(); await domain.close()
    domain = await facility.open(tutorialDomain)
    handler = createTutorialHandler(ctx, domain.table('runs'))
    const restored = await (await fetch(url, { headers: { 'x-agent-isles-tutorial': '1' } })).json()
    assert.equal(restored[0].draft, '保留无项目需求')
    assert.equal(restored[0].workspaceId, undefined)
    await command('bind', { workspaceId: 'project' })
    assert.equal(run.step, 'build')
    assert.equal(events.length, 0, 'binding never submits a model message')
    await command('submit', { sessionId: 'other', submissionId: 'request', text: 'build' }, 400)
    await command('submit', { sessionId: 'session', submissionId: 'request', text: 'build' })
    await command('check', {}, 409)
    event('turn/start', { turn: 1 }); event('user/message', user('build', 'request'))
    event('tool/result', result(1, true)); event('turn/end', { turn: 1, reason: { kind: 'failed' } })
    event('turn/start', { turn: 2 }); event('user/message', user('unrelated'))
    event('tool/result', result(2)); event('turn/end', { turn: 2, reason: { kind: 'completed' } })
    await writeFile(join(dir, 'index.html'), '<html><body>first</body></html>')
    await command('check', {}, 409)
    await command('retry')
    await command('submit', { sessionId: 'session', submissionId: 'request-2', text: 'build again' })
    event('turn/start', { turn: 3 }); event('user/message', user('build again', 'request-2'))
    await command('followup', { sessionId: 'session', submissionId: 'answer-1', text: '蓝色' }, 409)
    event('turn/end', { turn: 3, reason: { kind: 'completed' } })
    await command('check', {}, 409)
    await command('followup', { sessionId: 'other', submissionId: 'answer-1', text: '蓝色' }, 400)
    await command('followup', { sessionId: 'session', submissionId: 'answer-1', text: '蓝色' })
    assert.equal(run.step, 'build', 'answer stays in the same teaching step')
    await command('check', {}, 409)
    event('turn/start', { turn: 30 }); event('user/message', user('蓝色', 'answer-1'))
    event('tool/result', result(30)); event('turn/end', { turn: 30, reason: { kind: 'completed' } })
    await command('check'); assert.equal(run.step, 'inspect')
    assert.equal(run.evidence.endSeq, events.at(-1).seq, 'check follows the answer execution')
    await writeFile(join(dir, 'index.html'), '<html><body>fixed</body></html>')
    await command('confirm', {}, 409)
    await command('check'); await command('revise')
    assert.equal(run.step, 'build'); assert.equal(run.submission, undefined)
    await command('submit', { sessionId: 'session', submissionId: 'request-3', text: 'fix' })
    event('turn/start', { turn: 4 }); event('user/message', user('fix', 'request-3'))
    event('tool/result', result(4)); event('turn/end', { turn: 4, reason: { kind: 'completed' } })
    await command('check'); await command('confirm'); assert.equal(run.step, 'improve')
    await command('submit', { sessionId: 'session', submissionId: 'request-4', text: 'improve' })
    event('turn/start', { turn: 5 }); event('user/message', user('improve', 'request-4'))
    event('tool/result', result(5)); event('turn/end', { turn: 5, reason: { kind: 'completed' } })
    await command('check', {}, 409)
    await writeFile(join(dir, 'index.html'), '<html><body>improved</body></html>')
    await command('check'); await command('confirm')
    await command('complete', {}, 409)
    await command('leave'); await command('returned'); await command('complete')
    assert.equal(run.step, 'complete'); assert.ok(flushes > 0)
    await handler.close()
    assert.equal((await fetch(url, { headers: { 'x-agent-isles-tutorial': '1' } })).status, 503)
  } finally {
    await handler.close(); await domain.close(); await backend.close()
    await new Promise(done => server.close(done))
    await rm(dir, { recursive: true, force: true })
  }
})
