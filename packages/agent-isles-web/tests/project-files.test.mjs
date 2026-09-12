import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { createProjectFilesHandler } from '../lib/types/project-files.js'

test('project file reader confines paths, previews files and exposes read-only Git changes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'isles-files-'))
  const project = join(dir, 'project')
  await mkdir(project)
  await writeFile(join(project, 'hello.txt'), 'hello <script>')
  await writeFile(join(project, 'binary'), Buffer.from([0, 1]))
  await writeFile(join(project, 'large'), Buffer.alloc(512 * 1024 + 1, 65))
  await mkdir(join(dir, 'outside'))
  await writeFile(join(dir, 'outside', 'secret'), 'outside')
  await symlink(join(dir, 'outside'), join(project, 'link'), 'junction')
  const handler = createProjectFilesHandler({ workspaceRegistry: { get: id => id === 'test' ? { path: project } : undefined } })
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const get = (params = {}, headers = { 'x-agent-isles-files': '1' }) => fetch(`${base}/?${new URLSearchParams({ project: 'test', ...params })}`, { headers })
  const git = (...args) => execFileSync('git', args, { cwd: project, windowsHide: true })
  try {
    assert.equal((await get({}, {})).status, 403)
    assert.equal((await get({}, { 'x-agent-isles-files': '1', origin: 'http://evil.test' })).status, 403)
    assert.equal((await get({ project: 'missing' })).status, 404)
    assert.equal((await get({ path: '../outside/secret' })).status, 403)
    assert.equal((await get({ path: 'link/secret' })).status, 403)
    assert.equal((await get({ path: 'C:/Windows' })).status, 400)
    assert.equal((await get({ path: 'binary' })).status, 415)
    assert.equal((await get({ path: 'large' })).status, 413)
    assert.equal((await get({ path: 'absent' })).status, 404)
    assert.equal((await (await get({ path: 'hello.txt' })).json()).text, 'hello <script>')
    assert.ok((await (await get()).json()).entries.some(entry => entry.name === 'hello.txt'))
    git('init', '--quiet')
    git('add', 'hello.txt')
    let result = await (await get({ view: 'changes' })).json()
    assert.match(result.staged, /hello <script>/)
    assert.ok(result.untracked.includes('binary'))
    await writeFile(join(project, 'hello.txt'), 'changed')
    result = await (await get({ view: 'changes' })).json()
    assert.match(result.unstaged, /\+changed/)
    await mkdir(join(project, 'nested'))
    const nestedHandler = createProjectFilesHandler({ workspaceRegistry: { get: () => ({ path: join(project, 'nested') }) } })
    server.removeAllListeners('request'); server.on('request', nestedHandler)
    assert.match((await (await get({ view: 'changes' })).json()).unavailable, /根目录不是 Git/)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(dir, { recursive: true, force: true })
  }
})
