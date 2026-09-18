// Execute the pinned upstream assetHandler in isolation, without altering upstream.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { join, resolve, dirname, normalize, sep, extname } from 'node:path'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '..')
const { desktopTarget } = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8'))
const upstream = join(root, '.yarn/upstream-desktop', desktopTarget.commit)
const source = await readFile(join(upstream, 'apps/desktop-host/src/index.ts'), 'utf8')
const start = source.indexOf('function assetHandler(')
const end = source.indexOf('\nfunction remoteStreamHandler(', start)
assert.ok(start >= 0 && end > start, 'upstream handler boundaries changed; review probe')
const fixture = join(root, 'dist/desktop-route-probe')
await mkdir(fixture, { recursive: true })
await writeFile(join(fixture, 'index.html'), '<html>UPSTREAM_FRONTEND_FIXTURE</html>')
const js = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const handlerFactory = new Function('createRequire', 'join', 'realpathSync', 'dirname', 'readFile', 'renderIndexInjections', 'DESKTOP_TRANSPORT_SCRIPT', 'MIME', 'resolve', 'normalize', 'sep', 'extname', `${js};return assetHandler`)(
  () => ({ resolve: () => join(fixture, 'index.html') }), join, realpathSync, dirname, readFile,
  html => html, '', { '.html': 'text/html' }, resolve, normalize, sep, extname,
)
const handler = handlerFactory({ emit() {}, clientModules: { fetchBundle: () => new Response(null, { status: 404 }) } }, fixture)
const results = []
for (const pathname of ['/world/', '/world/index.wasm', '/world/index.pck', '/qcode/resident-state']) {
  const response = await handler.fetch(new Request(`dsh-app://app${pathname}`))
  const body = await response.text()
  assert.equal(body, '<html>UPSTREAM_FRONTEND_FIXTURE</html>')
  results.push({ pathname, status: response.status, contentType: response.headers.get('content-type'), frontendFallback: true })
}
await writeFile(join(fixture, 'result.json'), JSON.stringify({ commit: desktopTarget.commit, results }, null, 2))
console.log(JSON.stringify(results, null, 2))
