import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationDecision } from '../lib/types/client/notification-state.js'
import { projectResidentEvents } from '../lib/types/client/resident-model.js'

test('first history establishes a baseline; reconnect never repeats an event', () => {
  assert.deepEqual(notificationDecision(undefined, 12, false, false), { advance: true, unread: false, announce: false })
  assert.deepEqual(notificationDecision(12, 12, true, false), { advance: false, unread: false, announce: false })
  assert.equal(notificationDecision(12, 10, true, false).advance, false)
})
test('offline completion is unread without replaying a toast', () => {
  assert.deepEqual(notificationDecision(12, 20, false, false), { advance: true, unread: true, announce: false })
})
test('background completion announces, current conversation does not', () => {
  assert.deepEqual(notificationDecision(12, 20, true, false), { advance: true, unread: true, announce: true })
  assert.deepEqual(notificationDecision(12, 20, true, true), { advance: true, unread: false, announce: false })
  assert.equal(notificationDecision(undefined, 20, true, false).announce, true)
})
test('streaming is not a completion; actual turn end supplies stable identity', () => {
  const events = [{ event: { seq: 1, type: 'assistant/live-chunk', data: { chunk: { type: 'text-delta', text: 'hello' } } } }]
  assert.equal(projectResidentEvents(events).ended, undefined)
  events.push({ event: { seq: 2, type: 'turn/end', data: { reason: { kind: 'completed' } } } })
  assert.deepEqual(projectResidentEvents(events).ended, { seq: 2, failed: false, worked: false })
})
