import assert from 'node:assert/strict'
import test from 'node:test'
import {
  QCODE_FAVICON,
  qcodeDocumentTitle,
  applyDocumentBranding,
} from '../lib/types/client/document-branding.js'

test('document title retains the current session and replaces the product name', () => {
  assert.equal(qcodeDocumentTitle('DeepSeek Harness'), 'QCode')
  assert.equal(qcodeDocumentTitle('你好 — DeepSeek Harness'), '你好 — QCode')
  assert.equal(qcodeDocumentTitle('QCode'), 'QCode')
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
  assert.equal(document.title, 'QCode')
  assert.equal(links.length, 3)
  assert.equal(links[0].rel, 'icon')
  assert.equal(links[0].type, 'image/x-icon')
  assert.equal(links[1].rel, 'apple-touch-icon')
  assert.equal(links[2].rel, 'manifest')
  assert.equal(links[0].href, QCODE_FAVICON)

  document.title = '新的会话 — DeepSeek Harness'
  callback()
  assert.equal(document.title, '新的会话 — QCode')

  dispose()
  assert.equal(disconnected, true)
  assert.equal(links.length, 0)
  assert.equal(document.title, 'DeepSeek Harness')
})
