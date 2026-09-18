import assert from 'node:assert/strict'
import test from 'node:test'
import { tutorialActions } from '../lib/types/client/tutorial-api.js'

test('tutorial API gives recovery instructions for an old Host returning empty 404', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }))
  await assert.rejects(tutorialActions.list(), /教程服务尚未加载.*重启/)
})

test('tutorial API handles empty or malformed responses without exposing JSON parser errors', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }))
  await assert.rejects(tutorialActions.list(), /教程服务暂时不可用.*503/)
  mock.mock.mockImplementation(async () => new Response('<html>unavailable</html>'))
  await assert.rejects(tutorialActions.list(), /教程服务返回的数据不完整/)
})

test('tutorial API preserves domain errors and successful records', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: '学习记录已更新，请重新读取。' }, { status: 409 }))
  await assert.rejects(tutorialActions.list(), /学习记录已更新/)
  mock.mock.mockImplementation(async () => Response.json([]))
  assert.deepEqual(await tutorialActions.list(), [])
})
