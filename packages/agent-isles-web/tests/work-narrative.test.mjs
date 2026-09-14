import test from 'node:test'
import assert from 'node:assert/strict'
import { workNarrative } from '../lib/types/client/work-narrative.js'
import { zh } from '../lib/types/client/locales.js'

const t = key => zh[key]

const run = { step: 'build', paused: false, submission: { sessionId: 'session' } }
test('actual work overrides the old build tutorial label', () => {
  assert.equal(workNarrative({ run, running: true }, t).title, '正在制作')
  assert.equal(workNarrative({ run, running: true, pending: true }, t).title, '需要你的决定')
  assert.equal(workNarrative({ run, failed: true }, t).title, '这一步还没完成')
})
test('completion never claims a verified working product', () => {
  const result = workNarrative({ run, finished: true }, t)
  assert.equal(result.title, '一起检查这次成果')
  assert.match(result.text, /需要核对和体验/)
  assert.equal(workNarrative({ run: { ...run, step: 'inspect' } }, t).title, '轮到你体验了')
})
test('restoring and paused tutorials do not erase active task state', () => {
  assert.equal(workNarrative({ run, loading: true }, t).title, '正在找回我们的进度')
  assert.equal(workNarrative({ run: { ...run, paused: true }, running: true }, t).title, '正在制作')
  assert.equal(workNarrative({ run: { ...run, paused: true } }, t).title, '学习先歇一会儿')
})
