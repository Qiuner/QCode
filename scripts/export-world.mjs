import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const project = path.join(workspaceRoot, 'games', 'mosslight')
const output = path.join(project, 'build', 'web')
mkdirSync(output, { recursive: true })
const localGodotWin = 'D:\\Godot_v4.7.2-stable_win64.exe\\Godot_v4.7.2-stable_win64_console.exe'
const localGodotMac = path.join(
  process.env.HOME ?? '',
  'Documents/github/_tools/godot-4.7.2/Godot.app/Contents/MacOS/Godot',
)
const godot = process.env.GODOT_BIN
  ?? (existsSync(localGodotWin) ? localGodotWin : null)
  ?? (existsSync(localGodotMac) ? localGodotMac : null)
  ?? 'godot'

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
  if (process.exitCode !== 0) return
  for (const [source, target] of [
    ['web/cover.webp', 'cover.webp'],
    ['web/cover-2560.webp', 'cover-2560.webp'],
    ['web/cover-3840.webp', 'cover-3840.webp'],
    ['web/_headers', '_headers'],
    ['assets/fonts/OFL.txt', 'font-license.txt'],
    ['assets/xi4u-LICENSE.txt', 'xi4u-LICENSE.txt'],
  ]) {
    copyFileSync(path.join(project, source), path.join(output, target))
  }
  // 主岛 HTML/PCK 之后再导出邻近区域 pack；shell 会 fetch('neighbors.pck')。
  const neighbors = spawnSync(godot, [
    '--headless',
    '--path', project,
    '--export-pack', 'Neighbors', path.join(output, 'neighbors.pck'),
  ], { cwd: workspaceRoot, env: process.env, stdio: 'inherit' })
  if (neighbors.error || neighbors.status !== 0) {
    console.error('Godot Neighbors pack export failed.')
    process.exitCode = neighbors.status ?? 1
    return
  }
  if (!existsSync(path.join(output, 'neighbors.pck'))) {
    console.error('neighbors.pck missing after Neighbors export.')
    process.exitCode = 1
  }
})
