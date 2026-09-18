import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { embedNodeRuntime, materializeAppTree, requireBuiltArtifacts, root } from './pack-app.mjs'

const out = path.join(root, 'dist', `desktop-${Date.now()}`)
const app = path.join(out, 'app')
const compiler = path.join(process.env.WINDIR ?? 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')
const iscc = process.env.ISCC ?? [
  path.join(process.env.LOCALAPPDATA ?? '', 'Programs/Inno Setup 6/ISCC.exe'),
  path.join(process.env['ProgramFiles(x86)'] ?? '', 'Inno Setup 6/ISCC.exe'),
].find(existsSync)
if (!iscc || !existsSync(iscc)) throw new Error('请安装 Inno Setup 6，或通过 ISCC 指定编译器路径')
if (process.platform !== 'win32' || process.arch !== 'x64' || !existsSync(compiler)) throw new Error('需要 Windows x64 和 .NET Framework 4.x 编译器')
requireBuiltArtifacts()
mkdirSync(app, { recursive: true })
const { excludedFiles } = materializeAppTree(app)
await embedNodeRuntime(app, { binaryName: 'node.exe' })
writeFileSync(path.join(app, '发行说明.txt'), 'QCode 本地预览版\r\n双击 QCode.exe 进入。通知区域菜单可重新打开或退出。\r\n数据存放在 %LOCALAPPDATA%\\QCode\\data，首次启动会迁移旧 agent-isles 数据，卸载时保留。\r\n已内置 Node 和固定 DSH 运行时。模型需自行配置；项目所需 Git、Python 等开发工具需另行安装。\r\n第三方依赖许可证随 node_modules、runtime 和世界资源提供。\r\n')
// Windows PowerShell 5.1 needs a BOM to display Chinese text correctly.
writeFileSync(path.join(app, 'uninstall.ps1'), '\uFEFF' + readFileSync(path.join(root, 'apps/desktop/uninstall.ps1'), 'utf8').replace(/^\uFEFF/, ''))
function compile(source, target, extras = []) {
  const result = spawnSync(compiler, ['/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.IO.Compression.dll', '/reference:System.IO.Compression.FileSystem.dll', '/reference:Microsoft.CSharp.dll', `/out:${target}`, ...extras, path.join(root, source)], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`编译失败：${source}`)
}
const brandIcon = `/win32icon:${path.join(root, 'assets/brand/favicon.ico')}`
compile('apps/desktop/Launcher.cs', path.join(app, 'QCode.exe'), [brandIcon])
const zip = path.join(out, 'qcode-windows-x64.zip')
const pack = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:QCODE_PACK_SOURCE, $env:QCODE_PACK_ZIP)'], { env: { ...process.env, QCODE_PACK_SOURCE: app, QCODE_PACK_ZIP: zip }, stdio: 'inherit' })
if (pack.status !== 0) throw new Error('压缩安装资源失败')
console.log(`发行文件已排除 ${excludedFiles} 个声明及调试映射文件`)
const iss = path.join(out, 'qcode.iss')
const template = readFileSync(path.join(root, 'apps/desktop/qcode.iss'), 'utf8')
writeFileSync(iss, template.replace(/\{#SourcePath\}/g, path.join(out, '').replace(/\\/g, '/')))
const setup = path.join(out, 'qcode-setup-x64.exe')
const inno = spawnSync(iscc, ['/Q', iss], { stdio: 'inherit' })
if (inno.status !== 0) throw new Error('Inno Setup 编译失败')
writeFileSync(path.join(out, 'SHA256SUMS.txt'), [setup, zip].map(file => `${createHash('sha256').update(readFileSync(file)).digest('hex')}  ${path.basename(file)}`).join('\n') + '\n')
writeFileSync(path.join(root, 'dist/desktop-latest.txt'), out)
console.log(`安装包：${setup}\n便携包：${zip}`)
