import { isDesktopRequest } from './desktop-transport.js'
import type { Context } from '@deepseek-ai/cordis'
import { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { open, readdir, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { IncomingMessage, ServerResponse } from 'node:http'

const execute = promisify(execFile)
export const inject = ['workspaceRegistry', 'webServer']

export function createProjectFilesHandler(ctx: Pick<Context, 'workspaceRegistry'>) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    if (!isDesktopRequest(req) && (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
      || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(req.headers.host ?? '')
      || (req.headers['x-qcode-files'] !== '1' && req.headers['x-agent-isles-files'] !== '1')
      || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`))) {
      reply(403, { error: '请求来源无效' }); return
    }
    if (req.method !== 'GET') { reply(405, { error: '仅支持查看' }); return }
    try {
      const params = new URL(req.url ?? '/', 'http://localhost').searchParams
      const workspace = ctx.workspaceRegistry.get(WorkspaceId(params.get('project') ?? ''))
      if (!workspace) { reply(404, { error: '项目已不可用，请重新选择项目。' }); return }
      const root = await realpath(workspace.path)
      const path = params.get('path') ?? ''
      if (isAbsolute(path) || path.includes(':') || path.includes('\0')) { reply(400, { error: '请选择项目内的相对路径。' }); return }
      const target = await realpath(resolve(root, path))
      const inside = relative(root, target)
      if (isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`)) { reply(403, { error: '不能查看项目外的文件。' }); return }
      if (params.get('view') === 'changes') {
        const git = async (args: string[]) => (await execute('git', ['--no-pager', '-c', 'core.quotePath=false', ...args], {
          cwd: root, windowsHide: true, timeout: 10_000, maxBuffer: 1024 * 1024,
          env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
        })).stdout
        // Do not accidentally show changes from a repository above the selected project.
        if (await realpath((await git(['rev-parse', '--show-toplevel'])).trim()) !== root) {
          reply(200, { kind: 'changes', unavailable: '当前项目根目录不是 Git 仓库，暂时无法查看版本差异。' }); return
        }
        const unstaged = await git(['diff', '--no-ext-diff', '--no-textconv', '--'])
        const staged = await git(['diff', '--cached', '--no-ext-diff', '--no-textconv', '--'])
        const untracked = (await git(['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean)
        reply(200, { kind: 'changes', unstaged, staged, untracked }); return
      }
      const info = await stat(target)
      if (info.isDirectory()) {
        const entries = (await readdir(target, { withFileTypes: true })).map(item => ({ name: item.name, directory: item.isDirectory(), link: item.isSymbolicLink() }))
          .sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name))
        reply(200, { kind: 'directory', entries: entries.slice(0, 1000), truncated: entries.length > 1000 }); return
      }
      if (!info.isFile()) { reply(400, { error: '仅支持普通文件和文件夹。' }); return }
      const file = await open(target, 'r')
      try {
        const bytes = Buffer.alloc(512 * 1024 + 1)
        const { bytesRead } = await file.read(bytes, 0, bytes.length, 0)
        if (bytesRead > 512 * 1024) { reply(413, { error: '文件超过 512 KB，暂不提供文本预览。' }); return }
        const content = bytes.subarray(0, bytesRead)
        if (content.includes(0)) { reply(415, { error: '这个文件不是可预览的文本文件。' }); return }
        let text: string
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(content) }
        catch { reply(415, { error: '暂不支持此文件的文本编码。' }); return }
        reply(200, { kind: 'file', text })
      } finally { await file.close() }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      reply(code === 'ENOENT' ? 404 : 400, { error: code === 'ENOENT' ? '文件或 Git 程序不存在。' : '读取失败：请检查文件访问权限；查看修改需要当前项目是 Git 仓库，且差异不超过 1 MB。' })
    }
  }
}

export function apply(ctx: Context) {
  const handler = createProjectFilesHandler(ctx)
  for (const path of ['/qcode/project-files', '/agent-isles/project-files']) {
    ctx.effect(() => ctx.webServer.register({ kind: 'exact', path, handler }), `qcode: project files ${path}`)
  }
}
