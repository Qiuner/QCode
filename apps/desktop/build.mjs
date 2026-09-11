import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const out = path.join(root, 'dist', `desktop-${Date.now()}`)
const app = path.join(out, 'app')
const compiler = path.join(process.env.WINDIR ?? 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe')
if (process.platform !== 'win32' || process.arch !== 'x64' || !existsSync(compiler)) throw new Error('需要 Windows x64 和 .NET Framework 4.x 编译器')
for (const file of ['packages/agent-isles-web/lib/client.js', 'games/mosslight/build/web/index.pck']) {
  if (!existsSync(path.join(root, file))) throw new Error(`缺少 ${file}，请先构建 Web 和世界`)
}
mkdirSync(app, { recursive: true })
function copy(source, destination) { cpSync(path.join(root, source), path.join(app, destination ?? source), { recursive: true, dereference: true }) }
// Preserve the installed dynamic plugin dependency tree. Workspace junctions are materialized separately.
for (const item of readdirSync(path.join(root, 'node_modules'), { withFileTypes: true })) {
  if (item.name === '.bin' || item.name === '@agent-isles' || item.name === '.yarn-state.yml') continue
  copy(`node_modules/${item.name}`)
}
for (const file of ['package.json', 'cordis.patch.yml', 'lib']) copy(`packages/agent-isles-web/${file}`, `node_modules/@agent-isles/web-plugin/${file}`)
copy('packages/agent-isles-web/cordis.patch.yml')
copy('apps/web/src/launch.mjs')
copy('apps/web/src/supervise.mjs')
copy('apps/desktop/boot.mjs')
copy('games/mosslight/build/web')
const web = JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'), 'utf8'))
writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'agent-isles-installed', private: true, type: 'module', dependencies: web.dependencies }, null, 2))
mkdirSync(path.join(app, 'runtime'))
cpSync(process.execPath, path.join(app, 'runtime/node.exe'))
const licenseCache = path.join(root, 'dist', `node-${process.version}-LICENSE`)
if (!existsSync(licenseCache)) {
  const license = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`, { signal: AbortSignal.timeout(30000) })
  if (!license.ok) throw new Error('无法读取对应 Node 版本许可证')
  writeFileSync(licenseCache, await license.text())
}
cpSync(licenseCache, path.join(app, 'runtime/LICENSE'))
writeFileSync(path.join(app, '发行说明.txt'), 'agent-isles 本地预览版\r\n双击 agent-isles.exe 进入。通知区域菜单可重新打开或退出。\r\n数据存放在 %LOCALAPPDATA%\\agent-isles\\data，卸载时保留。\r\n已内置 Node 和固定 DSH 运行时。模型需自行配置；项目所需 Git、Python 等开发工具需另行安装。\r\n第三方依赖许可证随 node_modules、runtime 和世界资源提供。\r\n')
// Windows PowerShell 5.1 needs a BOM to display Chinese text correctly.
writeFileSync(path.join(app, 'uninstall.ps1'), '\uFEFF' + readFileSync(path.join(root, 'apps/desktop/uninstall.ps1'), 'utf8').replace(/^\uFEFF/, ''))
function compile(source, target, extras = []) {
  const result = spawnSync(compiler, ['/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.IO.Compression.dll', '/reference:System.IO.Compression.FileSystem.dll', '/reference:Microsoft.CSharp.dll', `/out:${target}`, ...extras, path.join(root, source)], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`编译失败：${source}`)
}
compile('apps/desktop/Launcher.cs', path.join(app, 'agent-isles.exe'))
const zip = path.join(out, 'agent-isles-windows-x64.zip')
const pack = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:AGENT_ISLES_PACK_SOURCE, $env:AGENT_ISLES_PACK_ZIP)'], { env: { ...process.env, AGENT_ISLES_PACK_SOURCE: app, AGENT_ISLES_PACK_ZIP: zip }, stdio: 'inherit' })
if (pack.status !== 0) throw new Error('压缩安装资源失败')
const setup = path.join(out, 'agent-isles-setup-x64.exe')
compile('apps/desktop/Setup.cs', setup, [`/resource:${zip},payload.zip`])
writeFileSync(path.join(out, 'SHA256SUMS.txt'), [setup, zip].map(file => `${createHash('sha256').update(readFileSync(file)).digest('hex')}  ${path.basename(file)}`).join('\n') + '\n')
writeFileSync(path.join(root, 'dist/desktop-latest.txt'), out)
console.log(`安装包：${setup}\n便携包：${zip}`)
