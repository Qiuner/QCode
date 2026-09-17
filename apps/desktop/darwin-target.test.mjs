import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveDarwinTarget } from './darwin-target.mjs'

test('Apple Silicon builds a native arm64 archive targeting macOS 13.5', () => {
  assert.deepEqual(resolveDarwinTarget('arm64'), {
    archiveArch: 'arm64',
    displayName: 'macOS Apple Silicon（arm64）',
    fileArchitecture: 'arm64',
    minimumSystemVersion: '13.5',
    swiftTarget: 'arm64-apple-macos13.5',
    unameArchitecture: 'arm64',
  })
})

test('Intel keeps its existing x64 archive name and deployment target', () => {
  assert.deepEqual(resolveDarwinTarget('x64'), {
    archiveArch: 'x64',
    displayName: 'macOS Intel（x86_64）',
    fileArchitecture: 'x86_64',
    minimumSystemVersion: '13.5',
    swiftTarget: 'x86_64-apple-macos13.5',
    unameArchitecture: 'x86_64',
  })
})

test('unsupported architectures fail before packaging', () => {
  assert.throws(() => resolveDarwinTarget('ia32'), /仅支持 x64 和 arm64/)
})
