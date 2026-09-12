import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TutorialPanel } from '../lib/types/client/Tutorial.js'

function render(state) {
  return renderToStaticMarkup(React.createElement(TutorialPanel, {
    tutorial: { run: { id: 'one', step: 'build', projectName: '待办清单', draft: '', assistance: [], submission: { requestId: 'request', sessionId: 'session' } }, busy: false },
    actions: {}, ...state,
  }))
}
test('running work cannot open an unverified preview', () => {
  const html = render({ running: true })
  assert.match(html, /disabled="">制作中，完成后可检查/)
  assert.match(html, /发送补充，等待处理/)
  assert.doesNotMatch(html, /确认需求，开始制作/)
})
test('pending request takes precedence over preview and generic answer prompts', () => {
  const html = render({ waiting: true })
  assert.match(html, /disabled="">请先处理上面的请求/)
  assert.match(html, /处理请求后，告诉芽芽你的决定/)
})
test('idle submitted work offers verification rather than claiming success', () => {
  const html = render({})
  assert.match(html, /检查成果，打开作品/)
  assert.match(html, /核对通过后会打开预览/)
  assert.match(html, /告诉芽芽想改哪里，或补充说明/)
})

test('native session keeps tutorial checks without rendering a second composer', () => {
  const html = render({ nativeSessionId: 'session' })
  assert.doesNotMatch(html, /<textarea|tutorial-answer/)
  assert.match(html, /检查成果，打开作品/)
})
