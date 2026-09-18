import assert from 'node:assert/strict'
import test from 'node:test'
import { en, zh } from '../lib/types/client/locales.js'

test('Chinese and English dictionaries have the same keys', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
})

test('core project and resident actions have real translations', () => {
  for (const key of ['project.choose', 'resident.teacher.name', 'resident.fileKeeper.name', 'dialogue.send']) {
    assert.ok(zh[key])
    assert.ok(en[key])
    assert.notEqual(en[key], zh[key])
  }
})

test('translated templates preserve their placeholders', () => {
  for (const key of Object.keys(zh)) {
    const placeholders = value => [...value.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort()
    assert.deepEqual(placeholders(en[key]), placeholders(zh[key]), key)
  }
})
