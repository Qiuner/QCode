import path from 'node:path'
import { assertWorldExportCurrent } from './world-export-state.mjs'

const root = path.resolve(import.meta.dirname, '..')
const project = path.join(root, 'games', 'mosslight')
try {
  assertWorldExportCurrent(project, path.join(project, 'build', 'web'))
  console.log('Godot 源文件与 Web 世界导出一致。')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
