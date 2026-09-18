import assert from 'node:assert/strict'
import test from 'node:test'

import { findUnsyncedDocumentPairs } from './check-doc-i18n-sync.mjs'

test('accepts changes to both documents in a language pair', () => {
  assert.deepEqual(findUnsyncedDocumentPairs(['README.md', 'README.zh-CN.md']), [])
})

test('rejects an English-only documentation change', () => {
  assert.deepEqual(findUnsyncedDocumentPairs(['SUPPORT.en.md']), [
    { changed: 'SUPPORT.en.md', missing: 'SUPPORT.md' },
  ])
})

test('rejects a Chinese-only documentation change', () => {
  assert.deepEqual(findUnsyncedDocumentPairs(['apps/desktop/README.md']), [
    { changed: 'apps/desktop/README.md', missing: 'apps/desktop/README.en.md' },
  ])
})

test('normalizes Windows paths and ignores unrelated files', () => {
  assert.deepEqual(
    findUnsyncedDocumentPairs([
      'packages/qcode-web/src/client/index.ts',
      'apps\\desktop\\README.md',
      'apps\\desktop\\README.en.md',
    ]),
    [],
  )
})

test('reports every unsynchronized pair', () => {
  assert.deepEqual(findUnsyncedDocumentPairs(['README.md', 'CHANGELOG.md']), [
    { changed: 'README.md', missing: 'README.zh-CN.md' },
    { changed: 'CHANGELOG.md', missing: 'CHANGELOG.en.md' },
  ])
})
