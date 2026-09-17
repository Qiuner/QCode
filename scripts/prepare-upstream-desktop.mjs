import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const upstream = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'))
const target = upstream.desktopTarget
if (!target || !/^[a-f0-9]{40}$/.test(target.commit)) throw new Error('Missing pinned desktop target')
const directory = join(root, '.yarn', 'upstream-desktop', target.commit)
const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
mkdirSync(directory, { recursive: true })
if (!existsSync(join(directory, '.git'))) {
  git('init')
  git('remote', 'add', 'origin', upstream.repository)
}
if (git('remote', 'get-url', 'origin') !== upstream.repository) throw new Error('Unexpected upstream remote')
if (git('status', '--porcelain') !== '') throw new Error('Desktop checkout has local changes; refusing to replace them')
git('fetch', '--depth=1', 'origin', `refs/tags/${target.tag}`)
if (git('rev-parse', 'FETCH_HEAD^{commit}') !== target.commit) throw new Error('Desktop tag does not match pinned commit')
git('checkout', '--detach', target.commit)
const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
if (pkg.version !== target.sourceVersion) throw new Error('Desktop source version mismatch')
console.log(`Verified desktop target ${pkg.version}: ${directory}`)
