import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { QCODE_HOST_SOURCE, QCODE_WORLD_SOURCE, worldFrameUrl, isWorldToHostMessage } from '../lib/types/client/world-bridge.js'

test('tutorial presentation receipts require a bounded encounter identity and known status', () => {
  const message = { source: QCODE_WORLD_SOURCE, version: 1, type: 'tutorial:keeper', payload: { encounterId: 'course-1', status: 'arrived' } }
  assert.equal(isWorldToHostMessage(message), true)
  assert.equal(isWorldToHostMessage({ ...message, payload: { ...message.payload, status: 'complete' } }), false)
  assert.equal(isWorldToHostMessage({ ...message, payload: { ...message.payload, encounterId: 'x'.repeat(161) } }), false)
  assert.equal(isWorldToHostMessage({ ...message, source: 'other' }), false)
  assert.equal(isWorldToHostMessage({ ...message, source: 'agent-isles-world' }), true, 'legacy exports remain readable')
})

test('local world retains the host origin and never copies credentials', () => {
  assert.equal(worldFrameUrl('http://127.0.0.1:3081/?token=private').href, 'http://127.0.0.1:3081/world/?embed=1')
  assert.equal(worldFrameUrl('http://localhost:3081/').href, 'http://localhost:3081/world/?embed=1')
})

test('remote deployment retains its own origin and never copies credentials', () => {
  assert.equal(worldFrameUrl('https://town.example/?token=private').href, 'https://town.example/world/?embed=1')
  assert.equal(worldFrameUrl('dsh-app://app/').href, 'dsh-app://app/api/qcode/world/index.html?embed=1')
})

test('resident messages require the known protocol and resident', () => {
  const message = { source: QCODE_WORLD_SOURCE, version: 1, type: 'resident:selected', payload: { residentId: 'coordinator' } }
  assert.equal(isWorldToHostMessage(message), true)
  assert.equal(isWorldToHostMessage({ ...message, version: 2 }), false)
  assert.equal(isWorldToHostMessage({ ...message, payload: { residentId: 'unknown' } }), false)
})

test('region status requires a known stage and bounded text', () => {
  const message = { source: QCODE_WORLD_SOURCE, version: 1, type: 'world:regions', payload: { stage: 'failed', detail: 'HTTP 503' } }
  assert.equal(isWorldToHostMessage(message), true)
  assert.equal(isWorldToHostMessage({ ...message, payload: { stage: 'unknown', detail: '' } }), false)
  assert.equal(isWorldToHostMessage({ ...message, payload: { stage: 'ready', detail: 'x'.repeat(241) } }), false)
})

test('playable is a separate authenticated bridge event', () => {
  const message = { source: QCODE_WORLD_SOURCE, version: 1, type: 'world:playable' }
  assert.equal(isWorldToHostMessage(message), true)
  assert.equal(isWorldToHostMessage({ ...message, source: 'other' }), false)
  assert.equal(isWorldToHostMessage({ ...message, version: 2 }), false)
})

test('world announces playable only after startup resolves and the loading cover is hidden', async () => {
  const shell = readFileSync(new URL('../../../games/mosslight/web/shell.html', import.meta.url), 'utf8')
  const source = shell.slice(shell.indexOf('async function startGame()'), shell.indexOf("start.addEventListener('click', startGame)"))
  for (const succeeds of [true, false]) {
    let resolve, reject
    const startup = new Promise((yes, no) => { resolve = yes; reject = no })
    const gate = { hidden: false }
    const sent = []
    const scope = {
      started: false, failed: false, start: {}, progress: {}, status: {}, gate,
      canvas: { focus() {} }, performance: { mark() {}, measure() {} },
      document: { getElementById: () => ({ textContent: '' }) },
      shell: key => key,
      Engine: { getMissingFeatures: () => [] }, engine: { startGame: () => startup },
      window: { qcodeWorldBridge: { emit: type => sent.push({ type, covered: !gate.hidden }) } },
      reportFailure() {},
    }
    const finished = runInNewContext(source + '\nstartGame()', scope)
    assert.equal(gate.hidden, false)
    assert.deepEqual(sent, [])
    if (succeeds) resolve(); else reject(new Error('startup failed'))
    await finished
    assert.deepEqual(sent, succeeds ? [{ type: 'world:playable', covered: false }] : [])
  }
})

test('world accepts only the paired parent and preserves both bridge directions', () => {
  const shell = readFileSync(new URL('../../../games/mosslight/web/shell.html', import.meta.url), 'utf8')
  const source = shell.slice(shell.indexOf('const QCODE_BRIDGE_VERSION'), shell.indexOf('const config ='))
  const received = []
  const sent = []
  let listener
  let helpOpened = 0
  const parent = { postMessage: (...args) => sent.push(args) }
  const window = { parent, addEventListener: (_name, handler) => { listener = handler } }
  const element = { firstChild: {}, parentElement: { firstChild: {} }, showModal: () => { helpOpened++ }, set textContent(_value) {}, set ariaLabel(_value) {} }
  const document = { body: { dataset: {} }, getElementById: () => element, querySelector: () => element, querySelectorAll: () => [] }
  runInNewContext(source, { URL, URLSearchParams, window, document, location: { origin: 'http://localhost:3081', search: '?embed=1' } })
  assert.equal(window.agentIslesWorldBridge, window.qcodeWorldBridge, 'legacy bridge name aliases QCode')
  window.qcodeWorldBridge.attachGodot(message => received.push(JSON.parse(message)))
  const data = { source: QCODE_HOST_SOURCE, version: 1, type: 'world:init', payload: { locale: 'en', workspace: { title: 'Test' }, panelOpen: true } }
  listener({ origin: 'https://untrusted.example', source: parent, data })
  listener({ origin: 'http://localhost:3081', source: {}, data })
  assert.equal(received.length, 0)
  listener({ origin: 'http://localhost:3081', source: parent, data })
  assert.equal(received.length, 1)
  assert.equal(document.title, 'Test · QCode')
  assert.equal(received[0].payload.panelOpen, true)
  assert.equal(received[0].payload.locale, 'en')
  listener({ origin: 'http://localhost:3081', source: parent, data: { ...data, source: 'agent-isles-host' } })
  assert.equal(received.at(-1).source, 'agent-isles-host', 'legacy host messages remain readable')
  listener({ origin: 'http://localhost:3081', source: parent, data: { ...data, payload: { ...data.payload, panelOpen: false } } })
  assert.equal(received.at(-1).payload.panelOpen, false)
  listener({ origin: 'http://localhost:3081', source: parent, data: { ...data, type: 'world:show-guide' } })
  assert.equal(helpOpened, 1)
  assert.equal(sent[0][0].type, 'world:ready')
  assert.equal(sent[0][1], 'http://localhost:3081')
  // Godot's JavaScriptBridge supports strings, but not Dictionary arguments.
  // Exercise the serialized payload at the actual shell -> host boundary.
  for (const residentId of ['coordinator', 'coder', 'teacher', 'file_keeper']) {
    window.qcodeWorldBridge.emit('resident:selected', JSON.stringify({ residentId }))
    assert.equal(isWorldToHostMessage(sent.at(-1)[0]), true, `${residentId} reaches the host as a valid resident selection`)
    assert.equal(sent.at(-1)[0].source, QCODE_WORLD_SOURCE)
    assert.equal(sent.at(-1)[0].payload.residentId, residentId)
  }
})
