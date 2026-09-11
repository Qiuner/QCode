import test from 'node:test'
import assert from 'node:assert/strict'
import { workNarrative } from '../lib/types/client/work-narrative.js'

const run = { step: 'build', paused: false, submission: { sessionId: 'session' } }
test('actual work overrides the old build tutorial label', () => {
  assert.equal(workNarrative({ run, running: true }).title, '正在制作')
  assert.equal(workNarrative({ run, running: true, pending: true }).title, '需要你的决定')
  assert.equal(workNarrative({ run, failed: true }).title, '这一步还没完成')
})
test('completion never claims a verified working product', () => {
  const result = workNarrative({ run, finished: true })
  assert.equal(result.title, '一起检查这次成果')
  assert.match(result.text, /需要核对和体验/)
  assert.equal(workNarrative({ run: { ...run, step: 'inspect' } }).title, '轮到你体验了')
})
test('restoring and paused tutorials do not erase active task state', () => {
  assert.equal(workNarrative({ run, loading: true }).title, '正在找回我们的进度')
  assert.equal(workNarrative({ run: { ...run, paused: true }, running: true }).title, '正在制作')
  assert.equal(workNarrative({ run: { ...run, paused: true } }).title, '学习先歇一会儿')
})
