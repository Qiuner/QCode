import path from 'node:path'
import { writeWorldExportState } from './world-export-state.mjs'

const root = path.resolve(import.meta.dirname, '..')
const project = path.join(root, 'games', 'mosslight')
writeWorldExportState(project, path.join(project, 'build', 'web'))
