import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const project = path.join(workspaceRoot, 'games', 'mosslight')
const output = path.join(project, 'build', 'web')
mkdirSync(output, { recursive: true })
const localGodot = 'D:\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64_console.exe'
const godot = process.env.GODOT_BIN ?? (existsSync(localGodot) ? localGodot : 'godot')

for (const args of [
  ['--headless', '--path', project, '--editor', '--import'],
  ['--headless', '--path', project, '--script', 'res://tools/check_ui_font.gd'],
]) {
  const result = spawnSync(godot, args, { cwd: workspaceRoot, stdio: 'inherit' })
  if (result.error || result.status !== 0) {
    console.error('Godot import/font check failed. If glyphs are missing, run tools/subset_font.py.')
    process.exit(result.status ?? 1)
  }
}

const child = spawn(godot, [
  '--headless',
  '--path', project,
  '--export-release', 'Web',
], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: 'inherit',
})

child.once('error', (error) => {
  console.error(`Godot Web export failed to start (${godot}): ${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal === null ? 1 : 128)
  if (process.exitCode === 0) {
    for (const [source, target] of [
      ['web/cover.webp', 'cover.webp'],
      ['web/_headers', '_headers'],
      ['assets/fonts/OFL.txt', 'font-license.txt'],
      ['assets/xi4u-LICENSE.txt', 'xi4u-LICENSE.txt'],
    ]) {
      copyFileSync(path.join(project, source), path.join(output, target))
    }
  }
})
