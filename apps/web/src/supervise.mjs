import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import path from 'node:path'

/** Restart only the service process; this layer never submits session work. */
export async function supervise({ command, args, cwd, env, home, signal, onLine = () => {}, delays = [1000, 3000, 10000], stableMs = 300000 }) {
  mkdirSync(home, { recursive: true })
  const logFile = path.join(home, 'service.log')
  const record = (line) => {
    if (existsSync(logFile) && statSync(logFile).size > 5 * 1024 * 1024) renameSync(logFile, logFile + '.previous')
    appendFileSync(logFile, `${new Date().toISOString()} ${line.replace(/token=[A-Za-z0-9_-]+/g, 'token=[redacted]')}\n`)
  }
  let failures = 0
  let port
  while (!signal.aborted) {
    const started = Date.now()
    const nextArgs = [...args]
    if (port) {
      const at = nextArgs.indexOf('--port')
      if (at >= 0) nextArgs.splice(at, 2)
      for (let i = nextArgs.length - 1; i >= 0; i--) if (nextArgs[i].startsWith('--port=')) nextArgs.splice(i, 1)
      nextArgs.push('--port', port)
    }
    if (failures && !nextArgs.includes('--no-open')) nextArgs.push('--no-open')
    const child = spawn(command, nextArgs, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    record(`start pid=${child.pid ?? 'unavailable'} attempt=${failures + 1}`)
    const stop = () => {
      if (!child.pid || child.exitCode !== null) return
      if (process.platform === 'win32') {
        const cleanup = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
        cleanup.once('error', error => { record(`process cleanup failed: ${error.message}`); child.kill() })
      } else child.kill()
    }
    signal.addEventListener('abort', stop, { once: true })
    if (signal.aborted) stop()
    for (const [name, stream] of [['stdout', child.stdout], ['stderr', child.stderr]]) {
      let pending = ''
      stream.setEncoding('utf8')
      const emit = line => {
        record(`${name} ${line}`)
        const match = line.match(/^dsh web: (http:\/\/(?:127\.0\.0\.1|localhost):\d+\/\?token=[A-Za-z0-9_-]+)/)
        if (match) port = new URL(match[1]).port
        onLine(line, name)
      }
      stream.on('data', chunk => {
        pending += chunk
        let at
        while ((at = pending.indexOf('\n')) >= 0) { emit(pending.slice(0, at)); pending = pending.slice(at + 1) }
        if (pending.length > 65536) { emit(pending); pending = '' }
      })
      stream.on('end', () => { if (pending) emit(pending) })
    }
    const result = await new Promise(resolve => {
      child.once('error', error => record(`spawn error: ${error.message}`))
      child.once('close', (code, exitSignal) => resolve({ code, signal: exitSignal }))
    })
    signal.removeEventListener('abort', stop)
    record(`exit pid=${child.pid ?? 'unavailable'} code=${result.code} signal=${result.signal} requested=${signal.aborted}`)
    if (signal.aborted || result.code === 0) return 0
    if (Date.now() - started >= stableMs) failures = 0
    if (failures >= delays.length) { record('restart limit reached'); return 1 }
    const delay = delays[failures++]
    record(`restart scheduled delayMs=${delay}`)
    onLine(`QCode：服务意外停止，${delay / 1000} 秒后重试（${failures}/${delays.length}）。`, 'stderr')
    await new Promise(resolve => {
      const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve() }
      const timer = setTimeout(finish, delay)
      signal.addEventListener('abort', finish, { once: true })
      if (signal.aborted) finish()
    })
  }
  return 0
}
