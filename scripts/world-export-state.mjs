import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const STATE_FILE = '.qcode-world-export.json'
const SOURCE_ENTRIES = [
  'project.godot',
  'export_presets.cfg',
  'assets',
  'locales',
  'scenes',
  'scripts',
  'web',
]
const REQUIRED_EXPORTS = ['index.html', 'index.js', 'index.pck', 'index.wasm', 'neighbors.pck']
const REBUILD = '请运行 corepack yarn build:world 重新导出世界。'

function sourceFiles(project) {
  const files = []
  function visit(target) {
    const stat = statSync(target)
    if (stat.isDirectory()) {
      for (const entry of readdirSync(target).sort()) visit(path.join(target, entry))
    } else if (stat.isFile()) {
      files.push(target)
    }
  }
  for (const entry of SOURCE_ENTRIES) visit(path.join(project, entry))
  return files.sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
}

export function captureWorldSourceState(project) {
  const hash = createHash('sha256')
  for (const file of sourceFiles(project)) {
    const relative = path.relative(project, file).replaceAll('\\', '/')
    hash.update(relative)
    hash.update('\0')
    hash.update(readFileSync(file))
    hash.update('\0')
  }
  return { algorithm: 'sha256', sourceHash: hash.digest('hex') }
}

export function writeWorldExportState(project, output, state = captureWorldSourceState(project)) {
  for (const file of REQUIRED_EXPORTS) {
    if (!existsSync(path.join(output, file))) throw new Error(`无法记录世界导出状态：缺少 ${file}。`)
  }
  writeFileSync(path.join(output, STATE_FILE), `${JSON.stringify({ version: 1, ...state }, null, 2)}\n`)
}

export function assertWorldExportCurrent(project, output) {
  for (const file of REQUIRED_EXPORTS) {
    if (!existsSync(path.join(output, file))) {
      throw new Error(`缺少世界导出文件 ${file}。${REBUILD}`)
    }
  }
  const statePath = path.join(output, STATE_FILE)
  if (!existsSync(statePath)) throw new Error(`缺少世界导出状态 ${STATE_FILE}。${REBUILD}`)
  let recorded
  try {
    recorded = JSON.parse(readFileSync(statePath, 'utf8'))
  } catch {
    throw new Error(`世界导出状态 ${STATE_FILE} 无法读取。${REBUILD}`)
  }
  const current = captureWorldSourceState(project)
  if (recorded.version !== 1 || recorded.algorithm !== current.algorithm || recorded.sourceHash !== current.sourceHash) {
    throw new Error(`Godot 源文件已变化，当前 Web 世界导出不是最新版本。${REBUILD}`)
  }
  return current
}
