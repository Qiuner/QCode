import assert from 'node:assert/strict'
import test from 'node:test'
import { projectResidentEvents, residentPrompt, residentEventStatus } from '../lib/types/client/resident-model.js'

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
  assert.equal(result.messages[0].text, 'Earlier response')
  assert.deepEqual(result.tools.map(tool => tool.key), ['new'])
})

test('each resident receives its role and the complete user request', () => {
  for (const id of ['coder', 'teacher', 'file_keeper']) {
    assert.ok(residentPrompt(id, 'hello.txt\nExplain this').endsWith('hello.txt\nExplain this'))
  }
  assert.match(residentPrompt('coder', ''), /实际验证/)
  assert.match(residentPrompt('teacher', ''), /不要修改文件/)
  assert.match(residentPrompt('file_keeper', ''), /本轮只读/)
})

test('roster status matches the last turn without replaying old messages', () => {
  const items = events(['turn/end', { reason: { kind: 'completed' } }], ['turn/start', {}])
  assert.equal(residentEventStatus(items), 'working')
  assert.equal(residentEventStatus(events(['turn/end', { reason: { kind: 'error' } }])), 'failed')
  assert.equal(residentEventStatus(events(['turn/end', { reason: { kind: 'completed' } }])), 'completed')
  assert.equal(residentEventStatus([]), 'idle')
})
