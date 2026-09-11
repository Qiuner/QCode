import { readFile, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-client-connection'
import { createModelTestHandler, type ModelTestServices } from './model-test.js'
import { createResidentStateHandler } from './resident-state.js'
import { createBrowserEntry } from './browser-entry.js'

export const inject = ['webServer', 'llm', 'agentDefaultModel']

const WORLD_ROUTE = '/world'
const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pck': 'application/octet-stream',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
}

function end(res: ServerResponse, status: number, body = ''): void {
  res.writeHead(status, body === '' ? undefined : { 'content-type': 'text/plain; charset=utf-8' })
  res.end(body)
}

export async function serveWorld(req: IncomingMessage, res: ServerResponse, worldRoot: string): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    end(res, 405)
    return
  }
  let pathname: string
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://agent-isles.local').pathname) }
  catch { end(res, 400); return }
  if (pathname === WORLD_ROUTE) {
    res.writeHead(308, { location: `${WORLD_ROUTE}/` })
    res.end()
    return
  }
  const requested = pathname.slice(`${WORLD_ROUTE}/`.length) || 'index.html'
  const target = resolve(worldRoot, requested)
  const traversal = relative(worldRoot, target)
  if (traversal === '..' || traversal.startsWith(`..${sep}`) || resolve(target) === resolve(worldRoot)) {
    end(res, 403)
    return
  }
  try {
    const source = await stat(target)
    if (!source.isFile()) {
      end(res, 404)
      return
    }
    let file = target
    let info = source
    let encoding: string | undefined
    const accepted = new Map((req.headers['accept-encoding'] ?? '').split(',').map(value => {
      const [name, ...parameters] = value.trim().toLowerCase().split(';')
      const quality = parameters.map(item => item.trim()).find(item => item.startsWith('q='))
      const q = quality ? Number(quality.slice(2)) : 1
      return [name, Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0] as const
    }))
    const candidates = ['br', 'gzip'].map(name => ({ name, q: accepted.get(name) ?? accepted.get('*') ?? 0 }))
      .filter(item => item.q > 0).sort((a, b) => b.q - a.q)
    for (const candidate of candidates) {
      const compressed = `${target}.${candidate.name === 'br' ? 'br' : 'gz'}`
      const compressedInfo = await stat(compressed).catch(error => {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
        throw error
      })
      if (compressedInfo?.isFile() && compressedInfo.mtimeMs >= source.mtimeMs) {
        file = compressed; info = compressedInfo; encoding = candidate.name
        break
      }
    }
    const etag = `"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-${encoding ?? 'identity'}"`
    const headers = {
      'cache-control': 'no-cache',
      vary: 'Accept-Encoding',
      etag,
      'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
      ...(encoding ? { 'content-encoding': encoding } : {}),
    }
    if (req.headers['if-none-match']?.split(',').some(value => value.trim().replace(/^W\//, '') === etag || value.trim() === '*')) {
      res.writeHead(304, headers); res.end(); return
    }
    res.writeHead(200, { ...headers, 'content-length': info.size })
    if (req.method === 'HEAD') res.end()
    else await pipeline(createReadStream(file), res)
  } catch (error) {
    if (res.headersSent || res.destroyed) { res.destroy(); return }
    const code = (error as NodeJS.ErrnoException).code
    end(res, code === 'ENOENT' || code === 'ENOTDIR' ? 404 : 500,
      code === 'ENOENT' ? 'Godot Web export is missing. Run yarn build:world.' : '')
  }
}

/** Host half: mount the Godot export beside the existing Harness API and SPA. */
export function apply(ctx: Context & ModelTestServices): void {
  const distIndex = process.env.AGENT_ISLES_DIST_INDEX
  if (distIndex) ctx.inject(['connection'], connectionCtx => {
    const handler = createBrowserEntry(
      (req, res) => connectionCtx.connection.authorizeIndex(req, res),
      async () => connectionCtx.webServer.renderIndex(await readFile(distIndex, 'utf8')).replace(/<head(?:\s[^>]*)?>/i, open => `${open}<base href="/">`),
    )
    for (const path of ['/', '/index.html']) connectionCtx.effect(() => connectionCtx.webServer.register({ kind: 'exact', path, handler }), `agent-isles-web: browser entry ${path}`)
  })
  const home = resolve(process.env.DSH_HOME ?? '.agent-isles-home')
  const residentStateHandler = createResidentStateHandler(resolve(home, 'agent-isles-state.json'))
  const modelTestHandler = createModelTestHandler(ctx)
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/agent-isles/resident-state',
    handler: residentStateHandler,
  }), 'agent-isles-web: resident recovery')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/agent-isles/model-test', handler: modelTestHandler,
  }), 'agent-isles-web: model connection test')
  const configuredRoot = process.env.AGENT_ISLES_WORLD_ROOT
  const worldRoot = resolve(process.cwd(), configuredRoot ?? 'games/mosslight/build/web')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: WORLD_ROUTE,
    handler: (req, res) => serveWorld(req, res, worldRoot),
  }), 'agent-isles-web: world assets')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/workbench',
    handler: (_req, res) => {
      res.writeHead(302, { location: '/?agent-isles=workbench' })
      res.end()
    },
  }), 'agent-isles-web: workbench entry')
}
