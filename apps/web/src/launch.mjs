import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const workspaceRoot = path.resolve(appRoot, '..', '..')
const require = createRequire(import.meta.url)
const dshPackagePath = require.resolve('@deepseek-ai/dsh/package.json')
const dshPackage = JSON.parse(readFileSync(dshPackagePath, 'utf8'))
const dshBin = path.resolve(path.dirname(dshPackagePath), dshPackage.bin.dsh)
const overlay = path.resolve(workspaceRoot, 'packages', 'agent-isles-web', 'cordis.patch.yml')
const defaultHome = path.join(workspaceRoot, '.agent-isles-home')

const child = spawn(process.execPath, [dshBin, 'web', '--patch', overlay, ...process.argv.slice(2)], {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    DSH_HOME: process.env.DSH_HOME ?? defaultHome,
  },
  stdio: 'inherit',
})

child.once('error', (error) => {
  console.error(`agent-isles web failed to start: ${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal === null ? 1 : 128)
})
