import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const home = process.env.DSH_HOME ?? defaultHome

const child = spawn(process.execPath, [dshBin, 'web', '--patch', overlay, ...process.argv.slice(2)], {
  cwd: workspaceRoot,
  env: {
    ...process.env,
    DSH_HOME: home,
    AGENT_ISLES_DIST_INDEX: require.resolve('@deepseek-ai/dsh-web-frontend/dist/index.html'),
  },
  stdio: ['inherit', 'pipe', 'inherit'],
})

let output = ''
child.stdout.setEncoding('utf8')
child.stdout.on('data', chunk => {
  process.stdout.write(chunk)
  output += chunk
  let newline
  while ((newline = output.indexOf('\n')) !== -1) {
    const line = output.slice(0, newline)
    output = output.slice(newline + 1)
    const url = line.match(/^dsh web: (http:\/\/(?:127\.0\.0\.1|localhost):\d+\/\?token=[A-Za-z0-9_-]+)/)?.[1]
    if (!url) continue
    try {
      mkdirSync(home, { recursive: true })
      writeFileSync(path.join(home, 'browser-url.txt'), url, { mode: 0o600 })
      console.log('agent-isles：开发访问入口已更新，可使用“打开小岛.cmd”直接打开。')
    } catch (error) { console.error('无法保存本地入口：', error.message) }
  }
})

child.once('error', (error) => {
  console.error(`agent-isles web failed to start: ${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal === null ? 1 : 128)
})
