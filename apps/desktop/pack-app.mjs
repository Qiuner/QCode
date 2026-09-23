// 桌面发行：把 Web 插件、世界资源与 node_modules 打进安装根目录（Win/Mac 共用）。
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertWorldExportCurrent } from '../../scripts/world-export-state.mjs'

export const root = fileURLToPath(new URL('../../', import.meta.url))

export function requireBuiltArtifacts() {
  for (const file of ['packages/qcode-web/lib/client.js', 'games/mosslight/build/web/index.pck']) {
    if (!existsSync(path.join(root, file))) throw new Error(`缺少 ${file}，请先构建 Web 和世界`)
  }
  const project = path.join(root, 'games/mosslight')
  assertWorldExportCurrent(project, path.join(project, 'build/web'))
}

/** @returns {{ excludedFiles: number }} */
export function materializeAppTree(app) {
  mkdirSync(app, { recursive: true })
  let excludedFiles = 0
  function copy(source, destination) {
    cpSync(path.join(root, source), path.join(app, destination ?? source), {
      recursive: true,
      dereference: true,
      filter: file => {
        // Keep executable sources, package metadata and all licenses. Only omit
        // type declarations and JS debugging maps, never entire source folders.
        if (/\.(?:[cm]?js\.map|d\.[cm]?ts(?:\.map)?)$/i.test(file)) {
          excludedFiles++
          return false
        }
        return true
      },
    })
  }
  // Preserve the installed dynamic plugin dependency tree. Workspace junctions are materialized separately.
  for (const item of readdirSync(path.join(root, 'node_modules'), { withFileTypes: true })) {
    if (item.name === '.bin' || item.name === '@qcode' || item.name === '.yarn-state.yml') continue
    copy(`node_modules/${item.name}`)
  }
  for (const file of ['package.json', 'cordis.patch.yml', 'lib']) {
    copy(`packages/qcode-web/${file}`, `node_modules/@qcode/web-plugin/${file}`)
  }
  copy('packages/qcode-web/cordis.patch.yml')
  copy('apps/web/src')
  copy('apps/desktop/boot.mjs')
  copy('games/mosslight/build/web')
  const web = JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'), 'utf8'))
  writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify({ name: 'qcode-installed', private: true, type: 'module', dependencies: web.dependencies }, null, 2),
  )
  return { excludedFiles }
}

export async function embedNodeRuntime(app, { binaryName }) {
  mkdirSync(path.join(app, 'runtime'), { recursive: true })
  cpSync(process.execPath, path.join(app, 'runtime', binaryName))
  // 官方 darwin 发行版 node 动态链接 libnode（rpath 含 @loader_path），
  // 只拷二进制会得到坏包；构建用 node 静态链接时该目录不存在，自然跳过。
  if (process.platform === 'darwin') {
    const libDir = path.join(path.dirname(realpathSync(process.execPath)), '..', 'lib')
    if (existsSync(libDir)) {
      for (const lib of readdirSync(libDir).filter(name => /^libnode\.\d+\.dylib$/.test(name))) {
        cpSync(path.join(libDir, lib), path.join(app, 'runtime', lib))
      }
    }
  }
  const licenseCache = path.join(root, 'dist', `node-${process.version}-LICENSE`)
  if (!existsSync(licenseCache)) {
    mkdirSync(path.join(root, 'dist'), { recursive: true })
    const license = await fetch(`https://raw.githubusercontent.com/nodejs/node/${process.version}/LICENSE`, {
      signal: AbortSignal.timeout(30000),
    })
    if (!license.ok) throw new Error('无法读取对应 Node 版本许可证')
    writeFileSync(licenseCache, await license.text())
  }
  cpSync(licenseCache, path.join(app, 'runtime/LICENSE'))
}
