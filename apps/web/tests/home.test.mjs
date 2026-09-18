import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveQCodeHome } from '../src/home.mjs'

test('QCode migrates the legacy development home without overwriting data', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qcode-home-'))
  try {
    const legacy = path.join(root, '.agent-isles-home')
    await mkdir(legacy)
    await writeFile(path.join(legacy, 'state.json'), 'kept')
    const current = resolveQCodeHome(root)
    assert.equal(current, path.join(root, '.qcode-home'))
    assert.equal(await import('node:fs/promises').then(fs => fs.readFile(path.join(current, 'state.json'), 'utf8')), 'kept')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('QCode refuses ambiguous homes and leaves explicit homes untouched', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qcode-home-'))
  try {
    await mkdir(path.join(root, '.agent-isles-home'))
    await mkdir(path.join(root, '.qcode-home'))
    assert.throws(() => resolveQCodeHome(root), /both/)
    assert.equal(resolveQCodeHome(root, './custom-home'), path.resolve('./custom-home'))
  } finally { await rm(root, { recursive: true, force: true }) }
})
