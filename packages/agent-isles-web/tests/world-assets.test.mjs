import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { serveWorld } from '../lib/types/index.js'

test('world assets negotiate compression, revalidate and avoid stale variants', async () => {
  const root = await mkdtemp(join(tmpdir(), 'agent-isles-assets-'))
  const data = 'world mesh data\n'.repeat(256)
  await writeFile(join(root, 'index.wasm'), data)
  await writeFile(join(root, 'index.wasm.gz'), gzipSync(data))
  await writeFile(join(root, 'index.wasm.br'), brotliCompressSync(data))
  const server = createServer((req, res) => { void serveWorld(req, res, root) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/world/index.wasm`
  try {
    const first = await fetch(url, { headers: { 'accept-encoding': 'br, gzip' } })
    assert.equal(first.headers.get('content-encoding'), 'br')
    assert.equal(first.headers.get('content-type'), 'application/wasm')
    assert.equal(first.headers.get('vary'), 'Accept-Encoding')
    assert.equal(first.headers.get('cache-control'), 'no-cache')
    assert.equal(await first.text(), data)
    const etag = first.headers.get('etag')
    const cached = await fetch(url, { headers: { 'accept-encoding': 'br', 'if-none-match': etag } })
    assert.equal(cached.status, 304)
    assert.equal(await cached.text(), '')
    const head = await fetch(url, { method: 'HEAD', headers: { 'accept-encoding': 'br' } })
    assert.equal(await head.text(), '')
    assert.equal(head.headers.get('etag'), etag)
    const gzip = await fetch(url, { headers: { 'accept-encoding': 'br;q=0, gzip;q=0.5' } })
    assert.equal(gzip.headers.get('content-encoding'), 'gzip')
    assert.equal(await gzip.text(), data)
    await writeFile(join(root, 'index.wasm'), 'new build')
    await utimes(join(root, 'index.wasm'), new Date(), new Date(Date.now() + 1000))
    const changed = await fetch(url, { headers: { 'accept-encoding': 'br', 'if-none-match': etag } })
    assert.equal(changed.status, 200)
    assert.equal(changed.headers.get('content-encoding'), null)
    assert.equal(await changed.text(), 'new build')
    assert.equal((await fetch(url.replace('index.wasm', '%ZZ'))).status, 400)
    assert.equal((await fetch(url.replace('index.wasm', 'missing.pck'))).status, 404)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
})
