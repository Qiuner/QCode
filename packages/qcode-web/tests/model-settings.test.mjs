import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readModelSettings, saveModelSettings, prepareResidentModel, ModelConfigurationRequired, validateModelInput } from '../lib/types/client/model-settings.js'
import { createModelTestHandler } from '../lib/types/model-test.js'

function fixture(configured = false) {
  const writes = []
  const ok = value => ({ ok: true, value })
  const remote = {
    settings: {
      describe: async () => ok({ writable: true, namespaces: [
        { ns: 'agent-default-model', revision: 7 },
        { ns: 'llm-deepseek', revision: 3, value: { apiKeyEnv: 'CUSTOM_KEY', baseURL: 'https://example.com' } },
      ] }),
      mutate: async (...args) => { writes.push(['profile', ...args]); return ok({}) },
      replace: async (...args) => { writes.push(['default', ...args]); return ok({}) },
    },
    credentials: {
      describe: async refs => { assert.deepEqual(refs, ['CUSTOM_KEY']); return ok({ CUSTOM_KEY: { configured, writable: true } }) },
      set: async (...args) => { writes.push(['credential', ...args]); return ok() },
    },
    llm: { listConfigurableProviders: async () => ok([{ provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [] }]) },
    session: {
      modelCatalog: async () => ok({ default: { provider: 'deepseek-official', model: 'model-a' }, routableProviders: ['deepseek-official'], groups: [{ id: 'deepseek-official', models: [{ id: 'model-a', name: 'A' }] }] }),
      selectModel: async value => { writes.push(['session', value]); return ok() },
    },
  }
  return { remote, writes }
}

test('credential literal only reaches the credential writer; revisions fence settings', async () => {
  const { remote, writes } = fixture()
  const state = await readModelSettings(remote)
  await saveModelSettings(remote, state, state.providers[0], 'model-a', 'sk-test-only', 'https://example.com')
  assert.deepEqual(writes[1], ['credential', 'CUSTOM_KEY', 'sk-test-only'])
  assert.equal(JSON.stringify([writes[0], writes[2]]).includes('sk-test-only'), false)
  assert.equal(writes[0].at(-1), 3)
  assert.equal(writes[2].at(-1), 7)
})

test('missing key blocks session selection; configured key applies default to an existing resident', async () => {
  const missing = fixture()
  await assert.rejects(prepareResidentModel(missing.remote, 'resident-session'), ModelConfigurationRequired)
  assert.deepEqual(missing.writes, [])
  const ready = fixture(true)
  await prepareResidentModel(ready.remote, 'resident-session')
  assert.deepEqual(ready.writes, [['session', { sessionId: 'resident-session', provider: 'deepseek-official', model: 'model-a' }]])
})

test('blank key preserves credentials and read-only credentials cannot be replaced', async () => {
  const { remote, writes } = fixture(true)
  const state = await readModelSettings(remote)
  await saveModelSettings(remote, state, state.providers[0], 'model-a', '', '')
  assert.equal(writes.some(item => item[0] === 'credential'), false)
  state.providers[0].credential.writable = false
  writes.length = 0
  await assert.rejects(saveModelSettings(remote, state, state.providers[0], 'model-a', 'replacement', ''), /只读/)
  assert.deepEqual(writes, [])
})

test('stale settings refuse before writing a credential', async () => {
  const { remote, writes } = fixture()
  remote.settings.mutate = async () => ({ ok: false })
  const state = await readModelSettings(remote)
  await assert.rejects(saveModelSettings(remote, state, state.providers[0], 'model-a', 'secret', ''), /刷新/)
  assert.deepEqual(writes, [])
})

test('key and endpoint validation reject accidental env lines and insecure endpoints', () => {
  for (const key of ['KEY=secret', 'a b', 'a\nb', '"secret"']) assert.throws(() => validateModelInput(key, ''))
  for (const url of ['http://example.com', 'https://user:secret@example.com', 'https://example.com?key=secret']) assert.throws(() => validateModelInput('key', url))
  validateModelInput('key', 'http://127.0.0.1:9000/v1')
})

test('connection probe uses runtime credentials, has no tools, rejects foreign origins and redacts failures', async t => {
  const calls = []
  let failure = false
  const services = {
    webServer: { port: 0 },
    agentDefaultModel: { currentSelection: () => ({ provider: 'deepseek-official', model: 'model-a' }) },
    llm: { async *stream(options) {
      calls.push(options)
      yield { type: 'finish', reason: failure ? { kind: 'error', failure: { code: 'AUTH', status: 401, message: 'secret-must-not-leak' } } : { kind: 'stop' } }
    } },
  }
  const server = createServer(createModelTestHandler(services))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => { server.closeAllConnections(); server.close() })
  services.webServer.port = server.address().port
  const origin = `http://127.0.0.1:${services.webServer.port}`
  const probe = value => fetch(origin, { method: 'POST', headers: { origin: value, 'content-type': 'application/json' }, body: '{}' })
  assert.equal((await probe('https://evil.example')).status, 403)
  assert.equal(calls.length, 0)
  assert.equal((await probe(origin)).status, 200)
  assert.deepEqual(calls[0].tools, [])
  assert.equal(calls[0].maxTokens, 32)
  assert.equal(calls[0].messages.length, 1)
  failure = true
  const response = await probe(origin)
  assert.equal(response.status, 502)
  const body = await response.text()
  assert.match(body, /API Key/)
  assert.equal(body.includes('secret-must-not-leak'), false)
})

test('overlapping model probes are rejected until the first finishes', async t => {
  let release
  let entered
  const started = new Promise(resolve => { entered = resolve })
  const gate = new Promise(resolve => { release = resolve })
  const services = { webServer: { port: 0 }, agentDefaultModel: { currentSelection: () => ({ provider: 'mock', model: 'a' }) },
    llm: { async *stream() { entered(); await gate; yield { type: 'finish', reason: { kind: 'stop' } } } } }
  const server = createServer(createModelTestHandler(services))
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => { release(); server.closeAllConnections(); server.close() })
  services.webServer.port = server.address().port
  const origin = `http://127.0.0.1:${services.webServer.port}`
  const probe = () => fetch(origin, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}' })
  const first = probe()
  await started
  assert.equal((await probe()).status, 409)
  release()
  assert.equal((await first).status, 200)
})
