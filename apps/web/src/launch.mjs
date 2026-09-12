import { supervise } from './supervise.mjs'
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

const lifetime = new AbortController()
process.once('SIGINT', () => lifetime.abort())
process.once('SIGTERM', () => lifetime.abort())
process.exitCode = await supervise({
  command: process.execPath,
  args: [dshBin, 'web', '--patch', overlay, ...process.argv.slice(2)],
  cwd: workspaceRoot, home, signal: lifetime.signal,
  env: { ...process.env, DSH_PERMISSION_MODE: process.env.DSH_PERMISSION_MODE ?? 'danger-full-access', DSH_HOME: home, AGENT_ISLES_DIST_INDEX: require.resolve('@deepseek-ai/dsh-web-frontend/dist/index.html') },
  onLine(line, channel) {
    const url = line.match(/^dsh web: (http:\/\/(?:127\.0\.0\.1|localhost):\d+\/\?token=[A-Za-z0-9_-]+)/)?.[1]
    if (url) {
      mkdirSync(home, { recursive: true })
      writeFileSync(path.join(home, 'browser-url.txt'), url, { mode: 0o600 })
      // The desktop launcher consumes this handshake; persistent logs redact it.
      if (process.env.AGENT_ISLES_DESKTOP === '1') console.log(line)
      else console.log('agent-isles：小岛已就绪，可使用“打开小岛.cmd”进入。')
    } else if (channel === 'stderr') console.error(line.replace(/token=[A-Za-z0-9_-]+/g, 'token=[redacted]'))
    else console.log(line.replace(/token=[A-Za-z0-9_-]+/g, 'token=[redacted]'))
  },
})
