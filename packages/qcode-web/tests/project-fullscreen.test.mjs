import test from 'node:test'
import assert from 'node:assert/strict'
import { requestProjectFullscreen } from '../lib/types/client/project-fullscreen.js'

test('project entry requests fullscreen with browser navigation hidden', () => {
  let options
  const target = {
    fullscreenElement: null,
    fullscreenEnabled: true,
    documentElement: {
      requestFullscreen(next) {
        options = next
        return Promise.resolve()
      },
    },
  }
  requestProjectFullscreen(target)
  assert.deepEqual(options, { navigationUI: 'hide' })
})

test('existing fullscreen, unsupported APIs and browser refusal are harmless', async () => {
  let calls = 0
  requestProjectFullscreen({
    fullscreenElement: {}, fullscreenEnabled: true,
    documentElement: { requestFullscreen: () => { calls++; return Promise.resolve() } },
  })
  requestProjectFullscreen({ fullscreenElement: null, fullscreenEnabled: false, documentElement: {} })
  requestProjectFullscreen({
    fullscreenElement: null, fullscreenEnabled: true,
    documentElement: { requestFullscreen: () => { calls++; return Promise.reject(new Error('denied')) } },
  })
  await Promise.resolve()
  assert.equal(calls, 1)
})
