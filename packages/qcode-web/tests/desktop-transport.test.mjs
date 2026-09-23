import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { desktopJson, isDesktopRequest } from '../lib/types/desktop-transport.js'
import { createResidentStateHandler } from '../lib/types/resident-state.js'

test('desktop carrier restricts origin, preserves validation and persistence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'qcode-desktop-'))
  try {
    const handler = desktopJson(createResidentStateHandler(join(root, 'state.json')))
    const url = 'dsh-app://app/api/qcode/resident-state'
    assert.equal((await handler(new Request('https://evil.test/api/qcode/resident-state'))).status, 403)
    assert.equal((await handler(new Request(url, { headers: { origin: 'https://evil.test' } }))).status, 403)
    const response = await handler(new Request(url, { method: 'POST', body: JSON.stringify({ projectId: 'project-1', residentId: 'coder', sessionId: 'session-1' }) }))
    assert.equal(response.status, 200)
    const state = await (await handler(new Request(url))).json()
    assert.equal(state.sessions['project-1'].coder, 'session-1')
    assert.equal((await handler(new Request(url, { method: 'POST', body: JSON.stringify({ projectId: '../outside' }) }))).status, 400)
    assert.equal(isDesktopRequest({ headers: { 'x-desktop': '1' } }), false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('desktop carrier cancels bounded handlers and removes trust after return', async () => {
  let captured
  const controller = new AbortController()
  let closed = false
  const handler = desktopJson(async (req, res) => {
    captured = req
    assert.equal(isDesktopRequest(req), true)
    await new Promise(resolve => { res.once('close', () => { closed = true; resolve() }); controller.abort() })
    res.writeHead(200); res.end('{}')
  })
  await handler(new Request('dsh-app://app/api/qcode/test', { signal: controller.signal }))
  assert.equal(closed, true)
  assert.equal(isDesktopRequest(captured), false)
})

test('desktop carrier drains the request body on every path', async () => {
  let cancelled = false
  const source = () => new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('{}')); c.close() },
    cancel() { cancelled = true },
  })
  const ignored = new Request('dsh-app://app/api/qcode/model-test', { method: 'POST', duplex: 'half', body: source() })
  await desktopJson(async (_req, res) => { res.writeHead(200); res.end("{}") })(ignored)
  assert.equal(ignored.bodyUsed, true)
  const rejected = new Request('dsh-app://app/api/qcode/model-test', { method: 'POST', duplex: 'half', headers: { origin: 'https://evil.test' }, body: source() })
  assert.equal((await desktopJson(async () => {})(rejected)).status, 403)
  assert.equal(rejected.bodyUsed, true)
  assert.equal(cancelled, false)
})
