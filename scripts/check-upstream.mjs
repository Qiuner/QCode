import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const submodulePath = path.join(root, 'deepseek-harness')
const upstreamPath = path.join(root, 'upstream.json')

const upstream = JSON.parse(fs.readFileSync(upstreamPath, 'utf8'))
const submoduleGit = path.join(submodulePath, '.git')
const submoduleEntries = fs.existsSync(submodulePath) ? fs.readdirSync(submodulePath) : []
const channel = upstream.activeChannel
const channelConfig = upstream.channels?.[channel]

if (!fs.existsSync(submodulePath)) {
  console.error('deepseek-harness submodule is missing.')
  process.exit(1)
}

if (!fs.existsSync(submoduleGit) && submoduleEntries.length === 0) {
  console.warn('deepseek-harness exists but is not initialized as a git submodule.')
}

if (typeof channel !== 'string' || channelConfig === undefined) {
  console.error('upstream.json does not define a valid activeChannel.')
  process.exit(1)
}

if (fs.existsSync(submoduleGit)) {
  const actualCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: submodulePath,
    encoding: 'utf8',
  }).trim()
  const expectedCommit = channelConfig.commit

  if (expectedCommit && actualCommit !== expectedCommit) {
    console.error(`deepseek-harness commit mismatch: expected ${expectedCommit}, got ${actualCommit}`)
    process.exit(1)
  }
  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: submodulePath,
    encoding: 'utf8',
  }).trim()
  if (status !== '') {
    console.error('deepseek-harness contains local changes; restore the submodule before continuing.')
    console.error(status)
    process.exit(1)
  }
}

console.log('upstream skeleton looks present.')
