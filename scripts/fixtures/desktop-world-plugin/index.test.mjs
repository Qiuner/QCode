import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, copyFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

test('resource manifest confines files, streams bytes, handles HEAD and disposal', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'qcode-resource-'))
  try {
    const world = join(temp, 'world')
    await mkdir(world)
    const bytes = Buffer.alloc(1024 * 1024, 7)
    await writeFile(join(world, 'index.wasm'), bytes)
    await mkdir(join(temp, 'outside'))
    await writeFile(join(temp, 'outside/secret.txt'), 'private')
    await symlink(join(temp, 'outside'), join(world, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
    await copyFile(new URL('./index.mjs', import.meta.url), join(temp, 'index.mjs'))
    await copyFile(new URL('./preview.html', import.meta.url), join(temp, 'preview.html'))
    await copyFile(new URL('./workbench.js', import.meta.url), join(temp, 'workbench.js'))
    await writeFile(join(temp, 'world-manifest.json'), JSON.stringify({ root: world, files: ['index.wasm', 'missing.pck', 'escape/secret.txt'] }))
    const { apply } = await import(pathToFileURL(join(temp, 'index.mjs')))
    const routes = new Map()
    let dispose
    await apply({ connection: { fetch: { register: route => routes.set(route.path, route) } }, on: (_, fn) => { dispose = fn } })
    const fetchFile = (file, init) => routes.get('/api/qcode/world/' + file).fetch(new Request('dsh-app://app/api/qcode/world/' + file, init))
    const head = await fetchFile('index.wasm', { method: 'HEAD' })
    assert.equal(head.headers.get('content-type'), 'application/wasm')
    assert.equal(head.headers.get('content-length'), String(bytes.length))
    assert.equal((await head.arrayBuffer()).byteLength, 0)
    assert.deepEqual(Buffer.from(await (await fetchFile('index.wasm')).arrayBuffer()), bytes)
    assert.equal((await fetchFile('missing.pck')).status, 404)
    assert.equal((await fetchFile('escape/secret.txt')).status, 403)
    const controller = new AbortController()
    const reader = (await fetchFile('index.wasm', { signal: controller.signal })).body.getReader()
    await reader.read()
    controller.abort()
    await assert.rejects(async () => { while (!(await reader.read()).done) {} }, { name: 'AbortError' })
    const disposed = (await fetchFile('index.wasm')).body.getReader()
    dispose()
    await assert.rejects(async () => { while (!(await disposed.read()).done) {} }, { name: 'AbortError' })
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
