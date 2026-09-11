import { createConnection, createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, openSync, closeSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const home = path.resolve(process.env.DSH_HOME ?? path.join(root, '.agent-isles-home'))
const pipe = `\\\\.\\pipe\\agent-isles-${createHash('sha256').update(home.toLowerCase()).digest('hex').slice(0, 24)}`
const action = process.argv[2] ?? 'start'
function request(command) {
  return new Promise((resolve, reject) => {
    const socket = createConnection(pipe)
    let response = ''
    socket.setTimeout(2000, () => socket.destroy(new Error('后台控制连接超时')))
    socket.on('connect', () => socket.write(command + '\n'))
    socket.on('data', chunk => { response += chunk })
    socket.on('error', reject)
    socket.on('end', () => resolve(response))
  })
}
if (action === '--run') {
  const server = createServer({ allowHalfOpen: true }, socket => {
    let command = ''
    socket.setTimeout(2000, () => socket.destroy())
    socket.on('error', () => {})
    socket.on('data', chunk => {
      command += chunk
      if (command.length > 32) { socket.destroy(); return }
      if (!command.includes('\n')) return
      if (command.trim() === 'stop') {
        socket.end('正在停止小岛后台服务。')
        process.emit('SIGTERM')
      } else socket.end('小岛后台托管正在运行。')
    })
  })
  server.on('error', error => { console.error(error.message); process.exitCode = 1 })
  server.listen(pipe, async () => {
    process.argv = [process.execPath, fileURLToPath(new URL('./launch.mjs', import.meta.url)), '--no-open', ...process.argv.slice(3)]
    process.env.DSH_HOME = home
    try { await import('./launch.mjs') }
    catch (error) { console.error(error); process.exitCode = 1 }
    finally { server.close() }
  })
} else if (['start', 'status', 'stop'].includes(action)) {
  try { console.log(await request(action)) }
  catch (error) {
    if (!['ENOENT', 'ECONNREFUSED'].includes(error.code)) throw error
    if (action !== 'start') console.log('小岛后台托管未运行。')
    else {
      mkdirSync(home, { recursive: true })
      const log = openSync(path.join(home, 'background.log'), 'a')
      const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--run', ...process.argv.slice(3)], {
        cwd: root, env: { ...process.env, DSH_HOME: home }, detached: true, windowsHide: true, stdio: ['ignore', log, log],
      })
      child.on('error', error => { console.error(error.message); process.exitCode = 1 })
      child.unref(); closeSync(log)
      console.log('已启动独立后台托管；运行 node apps/web/src/background.mjs status 查看状态。')
    }
  }
} else throw new Error('用法：node apps/web/src/background.mjs start|status|stop')
