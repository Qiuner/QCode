// 构建 macOS Intel（darwin-x64）便携包：内置 Node、Web 插件、Godot 世界与菜单栏启动器。
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { embedNodeRuntime, materializeAppTree, requireBuiltArtifacts, root } from './pack-app.mjs'

if (process.platform !== 'darwin') throw new Error('需要在 macOS 上构建 darwin 便携包')
if (process.arch !== 'x64') throw new Error('本预览版仅构建 macOS Intel（x64）；Apple Silicon 另议')

requireBuiltArtifacts()

const out = path.join(root, 'dist', `desktop-darwin-${Date.now()}`)
const app = path.join(out, 'app')
mkdirSync(app, { recursive: true })

const { excludedFiles } = materializeAppTree(app)
await embedNodeRuntime(app, { binaryName: 'node' })
chmodSync(path.join(app, 'runtime/node'), 0o755)

writeFileSync(
  path.join(app, '发行说明.txt'),
  [
    'agent-isles macOS Intel 本地预览版',
    '双击「Agent Isles.app」进入。菜单栏图标可重新打开或退出。',
    '数据存放在 ~/Library/Application Support/agent-isles/data，删除应用时保留。',
    '已内置 Node 和固定 DSH 运行时。模型需自行配置；项目所需 Git、Python 等开发工具需另行安装。',
    '预览版未签名：若 Gatekeeper 拦截，请在系统设置中允许，或右键打开。',
    '第三方依赖许可证随 node_modules、runtime 和世界资源提供。',
    '',
  ].join('\n'),
)

const bundle = path.join(app, 'Agent Isles.app')
const macosDir = path.join(bundle, 'Contents', 'MacOS')
const resourcesDir = path.join(bundle, 'Contents', 'Resources')
mkdirSync(macosDir, { recursive: true })
mkdirSync(resourcesDir, { recursive: true })

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>agent-isles</string>
  <key>CFBundleDisplayName</key><string>Agent Isles</string>
  <key>CFBundleIdentifier</key><string>com.qiuner.agent-isles</string>
  <key>CFBundleVersion</key><string>0.0.0-preview</string>
  <key>CFBundleShortVersionString</key><string>0.0.0-preview</string>
  <key>CFBundleExecutable</key><string>agent-isles</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`
writeFileSync(path.join(bundle, 'Contents', 'Info.plist'), infoPlist)

const iconSource = path.join(root, 'assets/brand/favicon.ico')
if (existsSync(iconSource)) cpSync(iconSource, path.join(resourcesDir, 'favicon.ico'))

const binary = path.join(macosDir, 'agent-isles')
const compile = spawnSync(
  'swiftc',
  [
    '-O',
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

const zip = path.join(out, 'agent-isles-darwin-x64.zip')
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
console.log(`发行文件已排除 ${excludedFiles} 个声明及调试映射文件`)
console.log(`便携包：${zip}`)
