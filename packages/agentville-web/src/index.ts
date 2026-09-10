import { readFile, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, relative, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { createModelTestHandler, type ModelTestServices } from './model-test.js'

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

async function serveWorld(req: IncomingMessage, res: ServerResponse, worldRoot: string): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    end(res, 405)
    return
  }
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://agentville.local').pathname)
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
    if (!(await stat(target)).isFile()) {
      end(res, 404)
      return
    }
    const body = await readFile(target)
    res.writeHead(200, {
      'cache-control': extname(target) === '.html' ? 'no-cache' : 'public, max-age=3600',
      'content-length': body.byteLength,
      'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
    })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    end(res, code === 'ENOENT' || code === 'ENOTDIR' ? 404 : 500,
      code === 'ENOENT' ? 'Godot Web export is missing. Run yarn build:world.' : '')
  }
}

/** Host half: mount the Godot export beside the existing Harness API and SPA. */
export function apply(ctx: Context & ModelTestServices): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/agentville/model-test', handler: createModelTestHandler(ctx),
  }), 'agentville-web: model connection test')
  const configuredRoot = process.env.AGENTVILLE_WORLD_ROOT
  const worldRoot = resolve(process.cwd(), configuredRoot ?? 'games/mosslight/build/web')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: WORLD_ROUTE,
    handler: (req, res) => serveWorld(req, res, worldRoot),
  }), 'agentville-web: world assets')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/workbench',
    handler: (_req, res) => {
      res.writeHead(302, { location: '/?agentville=workbench' })
      res.end()
    },
  }), 'agentville-web: workbench entry')
}
