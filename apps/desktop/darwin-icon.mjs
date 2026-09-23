// 从品牌源图可复现地生成 macOS 原生应用图标（ICNS），供 QCode.app bundle 使用。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const DARWIN_ICON_SOURCE = 'assets/brand/android-chrome-512x512.png'
export const DARWIN_ICNS_BASENAME = 'AppIcon'

// iconset 命名遵循 Apple 规范；源图 512px 是仓库现有最高分辨率品牌图，
// 不做超采样补 1024 档——Finder 与 Dock 最大只消费到 512。
export const ICONSET_ENTRIES = [
  { outputName: 'icon_16x16.png', pixelWidth: 16 },
  { outputName: 'icon_16x16@2x.png', pixelWidth: 32 },
  { outputName: 'icon_32x32.png', pixelWidth: 32 },
  { outputName: 'icon_32x32@2x.png', pixelWidth: 64 },
  { outputName: 'icon_128x128.png', pixelWidth: 128 },
  { outputName: 'icon_128x128@2x.png', pixelWidth: 256 },
  { outputName: 'icon_256x256.png', pixelWidth: 256 },
  { outputName: 'icon_256x256@2x.png', pixelWidth: 512 },
  { outputName: 'icon_512x512.png', pixelWidth: 512 },
]

export function missingIconSourceError(sourcePath) {
  return new Error(
    `缺少 macOS 应用图标源图：${sourcePath}。构建拒绝静默产出无品牌便携包，请恢复 assets/brand/ 下的品牌资源后重试。`,
  )
}

// exec 注入以便跨平台测试；真实 macOS 构建走 sips + iconutil，生成方式即代码。
export function buildDarwinAppIcon({
  sourcePath,
  resourcesDir,
  exec = execFileSync,
  makeWorkdir = () => mkdtempSync(path.join(tmpdir(), 'qcode-iconset.')),
} = {}) {
  if (!existsSync(sourcePath)) {
    throw missingIconSourceError(sourcePath)
  }
  const workdir = makeWorkdir()
  const iconset = path.join(workdir, `${DARWIN_ICNS_BASENAME}.iconset`)
  try {
    mkdirSync(iconset)
    for (const { outputName, pixelWidth } of ICONSET_ENTRIES) {
      const target = path.join(iconset, outputName)
      try {
        exec('sips', ['-z', String(pixelWidth), String(pixelWidth), sourcePath, '--out', target])
      } catch (error) {
        throw new Error(
          `生成应用图标尺寸 ${outputName} 失败：sips 未能缩放品牌源图（${error?.message ?? error}）。` +
            '请确认在装有 Xcode Command Line Tools 的 macOS 上构建。',
        )
      }
    }
    const icnsPath = path.join(resourcesDir, `${DARWIN_ICNS_BASENAME}.icns`)
    try {
      exec('iconutil', ['-c', 'icns', iconset, '-o', icnsPath])
    } catch (error) {
      throw new Error(
        `打包 ICNS 失败：iconutil 未能在 ${icnsPath} 产出应用图标（${error?.message ?? error}）。` +
          '构建中止，不产出缺少品牌图标的便携包。',
      )
    }
    return icnsPath
  } finally {
    rmSync(workdir, { recursive: true, force: true })
  }
}
