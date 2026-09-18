import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertWorldExportCurrent,
  captureWorldSourceState,
  writeWorldExportState,
} from './world-export-state.mjs'

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'qcode-world-state-'))
  const project = path.join(root, 'games', 'mosslight')
  const output = path.join(project, 'build', 'web')
  for (const directory of ['assets', 'locales', 'scenes', 'scripts', 'web', 'build/web']) {
    mkdirSync(path.join(project, directory), { recursive: true })
  }
  writeFileSync(path.join(project, 'project.godot'), '[application]\nconfig/name="Mosslight"\n')
  writeFileSync(path.join(project, 'export_presets.cfg'), '[preset.0]\nname="Web"\n')
  writeFileSync(path.join(project, 'scenes', 'island.tscn'), '[gd_scene]\n')
  writeFileSync(path.join(project, 'assets', 'resident.png'), 'portrait-v1')
  for (const file of ['index.html', 'index.js', 'index.pck', 'index.wasm', 'neighbors.pck']) {
    writeFileSync(path.join(output, file), file)
  }
  return { root, project, output }
}

test('accepts an export recorded from the current Godot inputs', () => {
  const { root, project, output } = fixture()
  try {
    writeWorldExportState(project, output, captureWorldSourceState(project))
    assert.doesNotThrow(() => assertWorldExportCurrent(project, output))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('rejects an export when the overall Godot input hash changes', () => {
  const { root, project, output } = fixture()
  try {
    writeWorldExportState(project, output, captureWorldSourceState(project))
    writeFileSync(path.join(project, 'assets', 'resident.png'), 'portrait-v2')
    assert.throws(
      () => assertWorldExportCurrent(project, output),
      error => error.message.includes('Godot 源文件已变化')
        && error.message.includes('corepack yarn build:world'),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('explains how to rebuild when the export state is missing', () => {
  const { root, project, output } = fixture()
  try {
    assert.throws(
      () => assertWorldExportCurrent(project, output),
      error => error.message.includes('缺少世界导出状态')
        && error.message.includes('corepack yarn build:world'),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('does not record a state for an incomplete export', () => {
  const { root, project, output } = fixture()
  try {
    unlinkSync(path.join(output, 'index.wasm'))
    assert.throws(
      () => writeWorldExportState(project, output),
      /无法记录世界导出状态：缺少 index\.wasm/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
