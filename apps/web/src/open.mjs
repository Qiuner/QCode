import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const home = process.env.DSH_HOME ?? path.join(root, '.agent-isles-home')
try {
  const url = (await readFile(path.join(home, 'browser-url.txt'), 'utf8')).trim()
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) throw new Error('本地入口无效，请重新启动服务。')
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(4000) })
  await response.body?.cancel()
  if (response.status !== 303) throw new Error('保存的入口已失效，请重新启动服务。')
  // Keep the validated URL in an environment value, not executable shell text.
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process -FilePath $env:AGENT_ISLES_OPEN_URL'], {
    env: { ...process.env, AGENT_ISLES_OPEN_URL: url }, windowsHide: true, stdio: 'inherit',
  })
  child.on('error', error => { console.error(error.message); process.exitCode = 1 })
  child.on('exit', code => { process.exitCode = code ?? 1 })
} catch {
  console.error('暂时无法打开小岛。请先在项目文件夹运行 corepack yarn dev:web，再双击“打开小岛.cmd”。')
  process.exitCode = 1
}
