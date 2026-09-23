// 迁移自 packages/qcode-web/tests/handbook-browser.mjs（Playwright 脚本，仓库无该依赖，见 PR 迁移映射表）。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TutorialPanel } from '../lib/types/client/Tutorial.js'
import { zh } from '../lib/types/client/locales.js'

const t = (key, params = {}) => Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), zh[key])

function controller(overrides = {}) {
  return { busy: false, command: async () => ({}), setError: () => {}, ...overrides }
}

function render(tutorial, extra = {}) {
  return renderToStaticMarkup(React.createElement(TutorialPanel, {
    tutorial, t, actions: {}, project: undefined, pick: async () => null,
    bindProject: async () => {}, submit: async () => ({}), move: () => {}, modelSettings: () => {}, leave: () => {},
    ...extra,
  }))
}

// 原断言：点「开始学习」后 getByLabel('我的第一个作品') 出现。
test('started tutorial renders the first-project idea prompt', () => {
  const run = { id: 'one', step: 'idea', projectName: '练习作品', draft: '', assistance: [], paused: false }
  const html = render(controller({ run: { ...run } }))
  assert.match(html, /aria-label="首课教学"/)
  assert.match(html, /<label for="tutorial-idea">我的第一个作品<\/label>/)
})

// 原断言：点「继续学习 · 练习作品」后同一引导界面恢复，进度保留。
test('resumed tutorial keeps the saved draft in the idea prompt', () => {
  const run = { id: 'one', step: 'idea', projectName: '练习作品', draft: '做一个待办清单', assistance: [], paused: false }
  const html = render(controller({ run: { ...run } }))
  assert.match(html, /<label for="tutorial-idea">我的第一个作品<\/label>/)
  assert.match(html, /做一个待办清单/)
})

// 原断言：暂停后教程层隐藏，只留可恢复横幅（隐藏接线由下方源码契约测试守护）。
test('paused tutorial offers only the resume banner', () => {
  const run = { id: 'one', step: 'idea', projectName: '练习作品', draft: '做一个待办清单', assistance: [], paused: true }
  const html = render(controller({ run: { ...run } }))
  assert.match(html, /教程已暂停/)
  assert.match(html, /继续教程/)
  assert.doesNotMatch(html, /tutorial-idea/)
})

// 原断言：回到小岛后作品与项目名保留 —— 找回步骤的离开指引。
test('return step guides leaving before the project is found again', () => {
  const run = { id: 'one', step: 'return', projectName: '练习作品', draft: '', assistance: [], paused: false, left: false, returned: false }
  const html = render(controller({ run: { ...run } }))
  assert.match(html, /tutorial\.leave|离开/)
})

// 源码级接线契约：守护曾被 tutorialPanel=null 破坏、而无 DOM harness 可覆盖的入口链路。
test('client world keeps the handbook entry and panel wiring without a model gate', () => {
  const source = readFileSync(new URL('../lib/types/client/QCodeWorld.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /tutorialPanel\s*=\s*null/)
  assert.match(source, /const tutorialPanel =[\s\S]{0,600}\(TutorialPanel,/)
  const block = name => {
    const start = source.indexOf(`async function ${name}(`)
    if (start < 0) return assert.fail(`${name} 不再存在`)
    const end = source.indexOf('\n    }', start)
    return source.slice(start, end)
  }
  assert.doesNotMatch(block('enterLearning'), /modelState\.ready/, 'idea/folder 入口不得提前要求模型配置')
  assert.match(block('enterCreation'), /command\((["'])pause\1\)/, '自由创作必须暂停进行中的教程')
  assert.match(source, /journal\.learnTitle/, '创作手册缺少跟着学区')
  assert.match(source, /journal\.learnResume/, '创作手册缺少继续学习入口')
})
