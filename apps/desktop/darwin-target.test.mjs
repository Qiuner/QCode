import assert from 'node:assert/strict'
import test from 'node:test'
import {
  darwinHostShellEnv,
  detectDarwinHostTarget,
  readHardwareArm64,
  resolveDarwinTarget,
  resolveHostDarwinTarget,
} from './darwin-target.mjs'

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

test('native Apple Silicon resolves to the arm64 target', () => {
  assert.equal(resolveHostDarwinTarget({ arch: 'arm64', hardwareArm64: true }).archiveArch, 'arm64')
})

test('native Intel is not mistaken for a translated environment', () => {
  assert.equal(resolveHostDarwinTarget({ arch: 'x64', hardwareArm64: false }).archiveArch, 'x64')
})

test('x86_64 process on Apple Silicon hardware is rejected with retry guidance', () => {
  assert.throws(
    () => resolveHostDarwinTarget({ arch: 'x64', hardwareArm64: true }),
    (error) =>
      /Rosetta/.test(error.message) &&
      /arch -arm64/.test(error.message) &&
      /Intel Mac/.test(error.message) &&
      /不会静默/.test(error.message),
  )
})

test('host gating still rejects unsupported architectures', () => {
  assert.throws(() => resolveHostDarwinTarget({ arch: 'ia32', hardwareArm64: false }), /仅支持 x64 和 arm64/)
})

test('readHardwareArm64 maps sysctl output and unknown oid', () => {
  assert.equal(readHardwareArm64(() => '1\n'), true)
  assert.equal(readHardwareArm64(() => '0'), false)
  const unknownOid = Object.assign(new Error('Command failed'), {
    status: 1,
    stderr: "sysctl: unknown oid 'hw.optional.arm64'",
  })
  assert.equal(readHardwareArm64(() => { throw unknownOid }), false)
})

test('sysctl failure is reported as a check failure, never as Intel', () => {
  const missing = Object.assign(new Error('spawnSync sysctl ENOENT'), { status: null, stderr: '' })
  assert.throws(() => readHardwareArm64(() => { throw missing }), /执行环境检测失败/)
  assert.throws(() => readHardwareArm64(() => 'maybe'), /意外值/)
  assert.throws(() => readHardwareArm64(() => ''), /输出为空/)
  assert.throws(() => readHardwareArm64(() => '   \n'), /输出为空/)
})

test('detectDarwinHostTarget rejects translated runs instead of silently switching architecture', () => {
  assert.throws(() => detectDarwinHostTarget({ exec: () => '1\n', arch: 'x64' }), /Rosetta/)
  assert.equal(detectDarwinHostTarget({ exec: () => '1\n', arch: 'arm64' }).archiveArch, 'arm64')
  const unknownOid = Object.assign(new Error('Command failed'), {
    status: 1,
    stderr: "sysctl: unknown oid 'hw.optional.arm64'",
  })
  assert.equal(detectDarwinHostTarget({ exec: () => { throw unknownOid }, arch: 'x64' }).archiveArch, 'x64')
})

test('shell env export mirrors the resolved target architecture', () => {
  assert.equal(darwinHostShellEnv(resolveDarwinTarget('arm64')), 'NODE_ARCH=arm64\nFILE_ARCH=arm64\n')
  assert.equal(darwinHostShellEnv(resolveDarwinTarget('x64')), 'NODE_ARCH=x64\nFILE_ARCH=x86_64\n')
})
