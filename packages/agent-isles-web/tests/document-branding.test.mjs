import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AGENT_ISLES_FAVICON,
  agentIslesDocumentTitle,
  applyDocumentBranding,
} from '../lib/types/client/document-branding.js'

test('document title retains the current session and replaces the product name', () => {
  assert.equal(agentIslesDocumentTitle('DeepSeek Harness'), 'agent-isles')
  assert.equal(agentIslesDocumentTitle('你好 — DeepSeek Harness'), '你好 — agent-isles')
  assert.equal(agentIslesDocumentTitle('agent-isles'), 'agent-isles')
})

test('document branding installs the favicon, follows title changes, and cleans up', () => {
  const links = []
  const titleNode = {}
  const document = {
    title: 'DeepSeek Harness',
    head: { append: link => links.push(link) },
    createElement: () => ({
      dataset: {},
      remove() { links.splice(links.indexOf(this), 1) },
    }),
    querySelector: selector => selector === 'title' ? titleNode : null,
  }
  let callback
  let disconnected = false
  class Observer {
    constructor(next) { callback = next }
    observe(target, options) {
      assert.equal(target, titleNode)
      assert.deepEqual(options, { childList: true, subtree: true })
    }
    disconnect() { disconnected = true }
  }

  const dispose = applyDocumentBranding(document, Observer)
  assert.equal(document.title, 'agent-isles')
  assert.equal(links.length, 3)
  assert.equal(links[0].rel, 'icon')
  assert.equal(links[0].type, 'image/x-icon')
  assert.equal(links[1].rel, 'apple-touch-icon')
  assert.equal(links[2].rel, 'manifest')
  assert.equal(links[0].href, AGENT_ISLES_FAVICON)

  document.title = '新的会话 — DeepSeek Harness'
  callback()
  assert.equal(document.title, '新的会话 — agent-isles')

  dispose()
  assert.equal(disconnected, true)
  assert.equal(links.length, 0)
  assert.equal(document.title, 'DeepSeek Harness')
})
