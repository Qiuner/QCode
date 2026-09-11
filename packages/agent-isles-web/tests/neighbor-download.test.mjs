import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const shell = readFileSync(new URL('../../../games/mosslight/web/shell.html', import.meta.url), 'utf8')
const source = shell.slice(shell.indexOf('let loadingNeighbors'), shell.indexOf("const canvas = document.getElementById('canvas')"))

test('neighbor download copies the pack before notifying Godot and allows retry', async () => {
  const actions = []
  const states = []
  let requests = 0
  let fail = true
  const window = { agentIslesWorldBridge: { emit: (_type, payload) => states.push(payload) } }
  runInNewContext(source, {
    window, AbortController, setTimeout, clearTimeout, Uint8Array,
    AGENT_ISLES_BRIDGE_VERSION: 1,
    console: { error() {} },
    fetch: async () => {
      requests++
      const data = new Uint8Array(128)
      data.set([71, 68, 80, 67])
      return new Response(data, { status: fail ? 503 : 200 })
    },
    engine: { copyToFS: (path, buffer) => actions.push({ path, bytes: [...buffer] }) },
    godotMessageHandler: message => actions.push(JSON.parse(message)),
  })
  await window.loadNeighborRegions()
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(actions.at(-1).type, 'world:neighbors-failed')
  assert.equal(requests, 2, 'transient failure retries once')
  assert.equal(states.at(-1).stage, 'failed')
  assert.match(states.at(-1).detail, /503/)
  fail = false
  await window.loadNeighborRegions()
  await new Promise(resolve => setTimeout(resolve, 10))
  const copied = actions.find(action => action.path)
  assert.equal(copied.path, '/neighbors.pck')
  assert.deepEqual(copied.bytes.slice(0, 4), [71, 68, 80, 67])
  assert.equal(actions.at(-1).type, 'world:neighbors-downloaded')
  assert.equal(states.at(-1).stage, 'installing', 'download completion is not scene readiness')
  window.prepareNeighborRegion('test region')
  assert.equal(states.at(-1).stage, 'installing', 'render preparation keeps the region loading')
  assert.match(states.at(-1).detail, /test region/)
  window.finishNeighborRegions(true)
  assert.equal(states.at(-1).stage, 'ready')
  await window.loadNeighborRegions()
  assert.equal(requests, 3, 'completed regions do not download again')
})
