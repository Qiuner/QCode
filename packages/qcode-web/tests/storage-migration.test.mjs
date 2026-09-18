import assert from 'node:assert/strict'
import test from 'node:test'
import { readMigratedStorage } from '../lib/types/client/storage-migration.js'

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries))
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    values,
  }
}

test('QCode storage keeps current values and migrates legacy values once', () => {
  const current = memoryStorage({ 'qcode.value': 'new', 'agent-isles.value': 'old' })
  assert.equal(readMigratedStorage(current, 'qcode.value', ['agent-isles.value']), 'new')
  assert.equal(current.values.get('agent-isles.value'), 'old')

  const legacy = memoryStorage({ 'agent-isles.value': 'old' })
  assert.equal(readMigratedStorage(legacy, 'qcode.value', ['agent-isles.value']), 'old')
  assert.equal(legacy.values.get('qcode.value'), 'old')
  assert.equal(legacy.values.has('agent-isles.value'), false)
})

test('failed writes preserve the legacy value', () => {
  const storage = memoryStorage({ 'agent-isles.value': 'old' })
  storage.setItem = () => { throw new Error('read only') }
  assert.equal(readMigratedStorage(storage, 'qcode.value', ['agent-isles.value']), 'old')
  assert.equal(storage.values.get('agent-isles.value'), 'old')
})
