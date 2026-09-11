import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { worldFrameUrl, isWorldToHostMessage } from '../lib/types/client/world-bridge.js'

test('local world uses a different site while retaining the local server port', () => {
  assert.equal(worldFrameUrl('http://127.0.0.1:3081/?token=private').href, 'http://localhost:3081/world/?embed=1')
  assert.equal(worldFrameUrl('http://localhost:3081/').href, 'http://127.0.0.1:3081/world/?embed=1')
})

test('remote deployment retains its own origin and never copies credentials', () => {
  assert.equal(worldFrameUrl('https://town.example/?token=private').href, 'https://town.example/world/?embed=1')
})

test('resident messages require the known protocol and resident', () => {
  const message = { source: 'agent-isles-world', version: 1, type: 'resident:selected', payload: { residentId: 'coordinator' } }
  assert.equal(isWorldToHostMessage(message), true)
  assert.equal(isWorldToHostMessage({ ...message, source: 'agentville-world' }), true)
  assert.equal(isWorldToHostMessage({ ...message, version: 2 }), false)
  assert.equal(isWorldToHostMessage({ ...message, payload: { residentId: 'unknown' } }), false)
})

test('region status requires a known stage and bounded text', () => {
  const message = { source: 'agent-isles-world', version: 1, type: 'world:regions', payload: { stage: 'failed', detail: 'HTTP 503' } }
  assert.equal(isWorldToHostMessage(message), true)
  assert.equal(isWorldToHostMessage({ ...message, payload: { stage: 'unknown', detail: '' } }), false)
  assert.equal(isWorldToHostMessage({ ...message, payload: { stage: 'ready', detail: 'x'.repeat(241) } }), false)
})

test('world accepts only the paired parent and preserves both bridge directions', () => {
  const shell = readFileSync(new URL('../../../games/mosslight/web/shell.html', import.meta.url), 'utf8')
  const source = shell.slice(shell.indexOf('const AGENT_ISLES_BRIDGE_VERSION'), shell.indexOf('const config ='))
  const received = []
  const sent = []
  let listener
  let helpOpened = 0
  const parent = { postMessage: (...args) => sent.push(args) }
  const window = { parent, addEventListener: (_name, handler) => { listener = handler } }
  const document = { body: { dataset: {} }, getElementById: () => ({ showModal: () => { helpOpened++ } }) }
  runInNewContext(source, { URL, URLSearchParams, window, document, location: { origin: 'http://localhost:3081', search: '?embed=1' } })
  window.agentIslesWorldBridge.attachGodot(message => received.push(JSON.parse(message)))
  const data = { source: 'agent-isles-host', version: 1, type: 'world:init', payload: { workspace: { title: 'Test' } } }
  listener({ origin: 'https://untrusted.example', source: parent, data })
  listener({ origin: 'http://127.0.0.1:3081', source: {}, data })
  assert.equal(received.length, 0)
  listener({ origin: 'http://127.0.0.1:3081', source: parent, data })
  assert.equal(received.length, 1)
  assert.equal(document.title, 'Test · AgentIsles')
  listener({ origin: 'http://127.0.0.1:3081', source: parent, data: { ...data, type: 'world:show-guide' } })
  assert.equal(helpOpened, 1)
  assert.equal(sent[0][0].type, 'world:ready')
  assert.equal(sent[0][1], 'http://127.0.0.1:3081')
})
