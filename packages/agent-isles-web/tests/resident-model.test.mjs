import assert from 'node:assert/strict'
import test from 'node:test'
import { projectResidentEvents, residentPrompt, readResidentDrafts, residentEventStatus } from '../lib/types/client/resident-model.js'

function events(...items) {
  return items.map(([type, data], seq) => ({ event: { type, data, seq } }))
}

test('completed turn does not imply verification passed', () => {
  const result = projectResidentEvents(events(
    ['turn/start', {}],
    ['assistant/message', { message: { content: [{ type: 'text', text: 'Tests were not run.' }] } }],
    ['turn/end', { reason: { kind: 'completed' } }],
  ))
  assert.equal(result.status, 'completed')
  assert.equal(result.outcome, '本轮已结束')
  assert.equal(result.messages[0].text, 'Tests were not run.')
})

test('failure and cancellation cannot appear as completion', () => {
  const failed = projectResidentEvents(events(['turn/end', { reason: { kind: 'error', error: { message: 'Connection lost' } } }]))
  assert.equal(failed.status, 'failed')
  assert.equal(failed.outcome, 'Connection lost')
  const cancelled = projectResidentEvents(events(['turn/end', { reason: { kind: 'aborted' } }]))
  assert.equal(cancelled.status, 'failed')
  assert.match(cancelled.outcome, /aborted/)
})

test('next turn clears stale outcome and calls while retaining history', () => {
  const result = projectResidentEvents(events(
    ['assistant/message', { message: { content: [{ type: 'text', text: 'Earlier response' }] } }],
    ['tool/call', { callId: 'old', name: 'read', arguments: '{}' }],
    ['turn/end', { reason: { kind: 'completed' } }],
    ['turn/start', {}],
    ['tool/call', { callId: 'new', name: 'list', arguments: '{"path":"."}' }],
    ['assistant/live-chunk', { chunk: { type: 'text-delta', text: 'Looking' } }],
    ['assistant/live-chunk', { chunk: { type: 'text-delta', text: ' now' } }],
  ))
  assert.equal(result.status, 'working')
  assert.equal(result.outcome, '')
  assert.equal(result.live, 'Looking now')
  assert.equal(result.history[0].text, 'Earlier response')
  assert.deepEqual(result.messages, [])
  assert.deepEqual(result.tools.map(tool => tool.key), ['new'])
})

test('draft restoration ignores corrupt or non-text browser data', () => {
  for (const raw of [null, '{', '[]', 'null', 'false']) assert.deepEqual(readResidentDrafts(raw), {})
  assert.deepEqual(readResidentDrafts('{"project:coder":"unfinished idea","invalid":42}'), { 'project:coder': 'unfinished idea' })
})

test('current request is readable without role instructions or injected context', () => {
  const result = projectResidentEvents(events(
    ['turn/start', {}],
    ['user/message', { source: { kind: 'plugin' }, content: [{ type: 'text', text: 'Internal context' }] }],
    ['user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: residentPrompt('coder', 'Build a timer\n用户请求：\nkeep this') }] }],
  ))
  assert.deepEqual(result.messages.map(item => [item.role, item.text]), [['user', 'Build a timer\n用户请求：\nkeep this']])
})

test('tool results match call identities and failures are visible', () => {
  const result = projectResidentEvents(events(
    ['tool/call', { callId: 'a', name: 'test', arguments: '{}' }],
    ['tool/call', { callId: 'b', name: 'read', arguments: '{}' }],
    ['tool/result', { message: { source: { callId: 'b' }, content: [{ type: 'tool-result', content: [{ type: 'text', text: 'file content' }] }] } }],
    ['tool/result', { message: { source: { callId: 'a' }, content: [{ type: 'tool-result', isError: true, content: [{ type: 'text', text: 'exit 1' }] }] } }],
    ['turn/end', { reason: { kind: 'completed' } }],
  ))
  assert.equal(result.tools[0].failed, true)
  assert.match(result.tools[0].result, /exit 1/)
  assert.equal(result.tools[1].failed, false)
  assert.match(result.tools[1].result, /file content/)
  assert.equal(result.outcome, '本轮已结束')
})

test('each resident receives its role and the complete user request', () => {
  for (const id of ['coder', 'teacher', 'file_keeper']) {
    assert.ok(residentPrompt(id, 'hello.txt\nExplain this').endsWith('hello.txt\nExplain this'))
  }
  assert.match(residentPrompt('coder', ''), /实际验证/)
  assert.match(residentPrompt('teacher', ''), /项目与历史对话管理/)
  assert.doesNotMatch(residentPrompt('teacher', ''), /教学|练习|讲解/)
  assert.match(residentPrompt('file_keeper', ''), /本轮只读/)
})

test('roster status matches the last turn without replaying old messages', () => {
  const items = events(['turn/end', { reason: { kind: 'completed' } }], ['turn/start', {}])
  assert.equal(residentEventStatus(items), 'working')
  assert.equal(residentEventStatus(events(['turn/end', { reason: { kind: 'error' } }])), 'failed')
  assert.equal(residentEventStatus(events(['turn/end', { reason: { kind: 'completed' } }])), 'completed')
  assert.equal(residentEventStatus([]), 'idle')
})
