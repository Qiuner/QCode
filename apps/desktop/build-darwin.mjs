// 构建当前 Mac 架构的便携包：内置 Node、Web 插件、Godot 世界与菜单栏启动器。
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { embedNodeRuntime, materializeAppTree, requireBuiltArtifacts, root } from './pack-app.mjs'
import { detectDarwinHostTarget } from './darwin-target.mjs'
import { buildDarwinAppIcon, missingIconSourceError, DARWIN_ICON_SOURCE, DARWIN_ICNS_BASENAME } from './darwin-icon.mjs'

if (process.platform !== 'darwin') throw new Error('需要在 macOS 上构建 darwin 便携包')
// 在产生任何构建产物前拒绝 Rosetta 翻译环境，架构判定与 verify-darwin.sh 共用同一规则。
const target = detectDarwinHostTarget()
if (!existsSync(path.join(root, DARWIN_ICON_SOURCE))) {
  throw missingIconSourceError(DARWIN_ICON_SOURCE)
}

requireBuiltArtifacts()

const out = path.join(root, 'dist', `desktop-darwin-${Date.now()}`)
// 工具失败（sips / iconutil / swiftc / ditto 等）时不遗留本次构建输出；成功前进程非零退出即清理。
let buildCompleted = false
process.on('exit', code => {
  if (!buildCompleted && code !== 0) {
    rmSync(out, { recursive: true, force: true })
    console.error(`本次构建输出目录已清理：${out}`)
  }
})
const app = path.join(out, 'app')
mkdirSync(app, { recursive: true })

const { excludedFiles } = materializeAppTree(app)
await embedNodeRuntime(app, { binaryName: 'node' })
chmodSync(path.join(app, 'runtime/node'), 0o755)

writeFileSync(
  path.join(app, '发行说明.txt'),
  [
    `QCode ${target.displayName} 本地预览版`,
    '双击「QCode.app」进入。菜单栏图标可重新打开或退出。',
    '数据存放在 ~/Library/Application Support/QCode/data，首次启动会迁移旧 agent-isles 数据，删除应用时保留。',
    '已内置 Node 和固定 DSH 运行时。模型需自行配置；项目所需 Git、Python 等开发工具需另行安装。',
    '预览版未签名：若 Gatekeeper 拦截，请在系统设置中允许，或右键打开。',
    '第三方依赖许可证随 node_modules、runtime 和世界资源提供。',
    '',
  ].join('\n'),
)

const bundle = path.join(app, 'QCode.app')
const macosDir = path.join(bundle, 'Contents', 'MacOS')
const resourcesDir = path.join(bundle, 'Contents', 'Resources')
mkdirSync(macosDir, { recursive: true })
mkdirSync(resourcesDir, { recursive: true })

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>QCode</string>
  <key>CFBundleDisplayName</key><string>QCode</string>
  <!-- Keep the historical identifier so existing macOS preferences and app identity remain stable. -->
  <key>CFBundleIdentifier</key><string>com.qiuner.agent-isles</string>
  <key>CFBundleVersion</key><string>0.0.0-preview</string>
  <key>CFBundleShortVersionString</key><string>0.0.0-preview</string>
  <key>CFBundleExecutable</key><string>qcode</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleIconFile</key><string>${DARWIN_ICNS_BASENAME}</string>
  <key>LSMinimumSystemVersion</key><string>${target.minimumSystemVersion}</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`
writeFileSync(path.join(bundle, 'Contents', 'Info.plist'), infoPlist)

// 图标缺失或生成失败必须中止构建，禁止静默产出无品牌发布物。
buildDarwinAppIcon({ sourcePath: path.join(root, DARWIN_ICON_SOURCE), resourcesDir })

const binary = path.join(macosDir, 'qcode')
const compile = spawnSync(
  'swiftc',
  [
    '-O',
    '-target', target.swiftTarget,
    '-framework', 'AppKit',
    '-framework', 'Foundation',
    path.join(root, 'apps/desktop/macos/Launcher.swift'),
    '-o',
    binary,
  ],
  { stdio: 'inherit' },
)
if (compile.status !== 0) throw new Error('Swift 启动器编译失败')
chmodSync(binary, 0o755)

const zip = path.join(out, `qcode-darwin-${target.archiveArch}.zip`)
const ditto = spawnSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, zip], { stdio: 'inherit' })
if (ditto.status !== 0) {
  // ditto --keepParent expects a named folder; zip the app directory contents via ditto on parent
  const alt = spawnSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', path.basename(app), zip], {
    cwd: out,
    stdio: 'inherit',
  })
  if (alt.status !== 0) throw new Error('压缩便携包失败')
}

writeFileSync(
  path.join(out, 'SHA256SUMS.txt'),
  `${createHash('sha256').update(readFileSync(zip)).digest('hex')}  ${path.basename(zip)}\n`,
)
writeFileSync(path.join(root, 'dist/desktop-darwin-latest.txt'), out)
buildCompleted = true
console.log(`发行文件已排除 ${excludedFiles} 个声明及调试映射文件`)
console.log(`便携包：${zip}`)
