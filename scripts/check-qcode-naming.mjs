import { readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = new URL('../', import.meta.url)
const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
})
if (listed.status !== 0) {
  process.stderr.write(listed.stderr)
  process.exit(listed.status ?? 1)
}

const files = [...new Set(listed.stdout.split('\0').filter(Boolean))]
  .filter(path => !path.startsWith('deepseek-harness/') && !path.startsWith('vendor/') && !path.startsWith('dist/'))

const violations = []
let checked = 0
for (const path of files) {
  const url = new URL(path.replaceAll('\\', '/'), root)
  try {
    if (!statSync(url).isFile()) continue
  } catch {
    continue
  }
  if (path === 'scripts/check-qcode-naming.mjs' || path === 'docs/qcode-renaming-plan.md') continue
  checked++
  if (/agent[-_ ]isles/i.test(path)) violations.push(`${path}: legacy name remains in a file or directory name`)

  const buffer = readFileSync(url)
  if (buffer.includes(0)) continue
  const text = buffer.toString('utf8')
  const rules = [
    [/@agent-isles\//g, 'legacy package scope'],
    [/\bAgentIsles/g, 'legacy TypeScript or product identifier'],
    [/\bagentIsles[A-Za-z0-9_]*/g, 'legacy camelCase identifier'],
    [/\bagent_isles_[a-z0-9_]+/g, 'legacy snake_case identifier'],
    [/data-agent-isles/g, 'legacy DOM namespace'],
    [/agent-isles\.(?:exe|lnk)/gi, 'legacy Windows executable or shortcut'],
    [/agent-isles-(?:setup|windows|darwin)/gi, 'legacy release artifact'],
    [/github\.com\/Qiuner\/agent-isles/gi, 'legacy GitHub repository URL'],
    [/qiuner\.github\.io\/agent-isles/gi, 'legacy GitHub Pages URL'],
  ]
  for (const [pattern, label] of rules) {
    for (const match of text.matchAll(pattern)) {
      if (match[0] === 'agentIslesWorldBridge' && [
        'games/mosslight/web/shell.html',
        'games/mosslight/scripts/island.gd',
        'packages/qcode-web/tests/world-bridge.test.mjs',
      ].includes(path)) continue
      if (match[0] === 'agent_isles_tutorials' && path === 'packages/qcode-web/src/tutorial.ts') continue
      const line = text.slice(0, match.index).split('\n').length
      violations.push(`${path}:${line}: ${label}: ${match[0]}`)
    }
  }
}

if (violations.length > 0) {
  console.error('QCode naming check failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log(`QCode naming check passed for ${checked} repository files.`)
