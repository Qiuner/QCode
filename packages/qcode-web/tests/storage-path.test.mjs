import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { qcodeStatePath } from '../lib/types/storage-path.js'

test('QCode migrates the legacy Host state file without overwriting', async () => {
  const home = await mkdtemp(join(tmpdir(), 'qcode-state-'))
  try {
    await writeFile(join(home, 'agent-isles-state.json'), '{"kept":true}')
    const current = qcodeStatePath(home)
    assert.equal(await readFile(current, 'utf8'), '{"kept":true}')
    await writeFile(join(home, 'agent-isles-state.json'), '{}')
    assert.throws(() => qcodeStatePath(home), /both/)
  } finally { await rm(home, { recursive: true, force: true }) }
})
