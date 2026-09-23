import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { ICONSET_ENTRIES, buildDarwinAppIcon, DARWIN_ICON_SOURCE } from './darwin-icon.mjs'

const scratch = () => mkdtempSync(path.join(tmpdir(), 'qcode-icon-test.'))

test('iconset covers Finder and Retina scales derived from the 512px brand source', () => {
  assert.deepEqual(
    ICONSET_ENTRIES.map(({ outputName, pixelWidth }) => `${pixelWidth}:${outputName}`),
    [
      '16:icon_16x16.png',
      '32:icon_16x16@2x.png',
      '32:icon_32x32.png',
      '64:icon_32x32@2x.png',
      '128:icon_128x128.png',
      '256:icon_128x128@2x.png',
      '256:icon_256x256.png',
      '512:icon_256x256@2x.png',
      '512:icon_512x512.png',
    ],
  )
  assert.ok(DARWIN_ICON_SOURCE.endsWith('.png'))
})

test('missing brand source fails the build instead of shipping an unbranded bundle', () => {
  assert.throws(
    () => buildDarwinAppIcon({ sourcePath: '/nonexistent/brand.png', resourcesDir: scratch(), exec: () => {} }),
    /缺少 macOS 应用图标源图.*拒绝静默产出无品牌便携包/s,
  )
})

test('sips failure names the scale that broke', () => {
  const failing = (command) => {
    if (command === 'sips') throw new Error('sips boom')
  }
  assert.throws(
    () => buildDarwinAppIcon({ sourcePath: import.meta.filename, resourcesDir: scratch(), exec: failing }),
    /生成应用图标尺寸 icon_16x16\.png 失败/,
  )
})

test('iconutil failure aborts before the bundle is accepted', () => {
  const exec = (command) => {
    if (command === 'iconutil') throw new Error('iconutil boom')
  }
  assert.throws(
    () => buildDarwinAppIcon({ sourcePath: import.meta.filename, resourcesDir: scratch(), exec }),
    /打包 ICNS 失败.*不产出缺少品牌图标的便携包/s,
  )
})

test('success path runs every scale, writes AppIcon.icns, and cleans the workdir', () => {
  const source = path.join(scratch(), 'brand.png')
  writeFileSync(source, 'png')
  const resourcesDir = scratch()
  const workdir = scratch()
  const calls = []
  const exec = (command, args) => {
    calls.push([command, args[0]])
    if (command === 'sips') writeFileSync(args[args.length - 1], 'scaled')
    if (command === 'iconutil') writeFileSync(args[args.length - 1], 'icns')
  }
  const icnsPath = buildDarwinAppIcon({
    sourcePath: source,
    resourcesDir,
    exec,
    makeWorkdir: () => workdir,
  })
  assert.equal(icnsPath, path.join(resourcesDir, 'AppIcon.icns'))
  assert.ok(existsSync(icnsPath))
  assert.equal(calls.filter(([command]) => command === 'sips').length, ICONSET_ENTRIES.length)
  assert.deepEqual(calls.at(-1), ['iconutil', '-c'])
  assert.ok(!existsSync(path.join(workdir, 'AppIcon.iconset')))
})
