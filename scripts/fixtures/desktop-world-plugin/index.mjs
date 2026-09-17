// Minimal Host plugin for the pinned official Desktop integration probe.
import { open, realpath, readFile, readdir } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { extname, resolve, sep } from 'node:path'

export const name = 'agent-isles-desktop-world-probe'
export const inject = ['connection']

export async function apply(ctx) {
  const brandRoot = await readFile(new URL('./brand-root.json', import.meta.url), 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error })
  if (brandRoot) for (const file of await readdir(brandRoot)) {
    const bytes = await readFile(resolve(brandRoot, file))
    ctx.connection.fetch.register({ path: '/api/agent-isles/brand/' + file, methods: ['GET', 'HEAD'], requestBody: 'buffered',
      async fetch(request) { return new Response(request.method === 'HEAD' ? null : bytes, { headers: { 'content-type': file.endsWith('.png') ? 'image/png' : file.endsWith('.ico') ? 'image/x-icon' : 'application/manifest+json' } }) },
    })
  }
  const workbench = await readFile(new URL('./workbench.js', import.meta.url), 'utf8')
  ctx.connection.fetch.register({
    path: '/api/agent-isles/preview-workbench.js', methods: ['GET', 'HEAD'], requestBody: 'buffered',
    async fetch(request) {
      return new Response(request.method === 'HEAD' ? null : workbench, { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } })
    },
  })
  const preview = await readFile(new URL('./preview.html', import.meta.url), 'utf8')
  ctx.connection.fetch.register({
    path: '/api/agent-isles/preview', methods: ['GET', 'HEAD'], requestBody: 'buffered',
    async fetch(request) {
      return new Response(request.method === 'HEAD' ? null : preview, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
    },
  })
  const manifest = JSON.parse(await readFile(new URL('./world-manifest.json', import.meta.url), 'utf8'))
  const root = await realpath(manifest.root)
  const lifetime = new AbortController()
  ctx.on('dispose', () => lifetime.abort())
  for (const relative of manifest.files) {
    const path = resolve(root, relative)
    if (!path.startsWith(root + sep)) throw new Error('World manifest escapes resource root')
    const route = '/api/agent-isles/world/' + relative.split('/').map(encodeURIComponent).join('/')
    ctx.connection.fetch.register({
      path: route, methods: ['GET', 'HEAD'], requestBody: 'buffered',
      async fetch(request) {
        let file
        try {
          const actual = await realpath(path)
          if (!actual.startsWith(root + sep)) return new Response(null, { status: 403 })
          file = await open(actual, 'r')
          const stat = await file.stat()
          if (!stat.isFile()) { await file.close(); return new Response(null, { status: 404 }) }
          const headers = {
            'content-type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wasm': 'application/wasm', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(actual)] ?? 'application/octet-stream',
            'content-length': String(stat.size), 'cache-control': 'no-store',
          }
          if (request.method === 'HEAD') { await file.close(); return new Response(null, { headers }) }
          const stream = file.createReadStream({ signal: AbortSignal.any([request.signal, lifetime.signal]) })
          return new Response(Readable.toWeb(stream), { headers })
        } catch (error) {
          if (file) await file.close()
          if (error.code === 'ENOENT') return new Response(null, { status: 404 })
          throw error
        }
      },
    })
  }
}
