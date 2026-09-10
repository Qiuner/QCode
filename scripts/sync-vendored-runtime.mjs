import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, relative, resolve, sep } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const upstreamPath = join(root, 'upstream.json')
const workspacePath = join(root, 'package.json')
const mode = process.argv[2]

if (mode !== '--write' && mode !== '--check') {
  throw new Error('usage: node scripts/sync-vendored-runtime.mjs <--write|--check>')
}

const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const fail = message => { throw new Error(`sync-vendored-runtime: ${message}`) }
const isDshPackage = name => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')
const isDshResolution = selector => selector === '@deepseek-ai/dsh'
  || selector.startsWith('@deepseek-ai/dsh@')
  || selector.startsWith('@deepseek-ai/dsh-')

const upstreamDocument = readJson(upstreamPath)
const channel = upstreamDocument.activeChannel
const upstream = upstreamDocument.channels?.[channel]
if (upstream === undefined) fail(`missing active upstream channel ${JSON.stringify(channel)}`)

const version = upstream.sourceVersion
if (typeof version !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z.-]*$/u.test(version)) {
  fail(`unsafe source version ${JSON.stringify(version)}`)
}

const vendorRelative = `vendor/dsh-runtime/${version}`
const vendorDirectory = join(root, ...vendorRelative.split('/'))
const manifestPath = join(vendorDirectory, 'manifest.json')

function packageName(filename) {
  const suffix = `-${version}.tgz`
  if (!filename.startsWith('deepseek-ai-') || !filename.endsWith(suffix)) {
    fail(`unexpected upstream tarball name ${JSON.stringify(filename)}`)
  }
  return `@deepseek-ai/${filename.slice('deepseek-ai-'.length, -suffix.length)}`
}

function resolutionSelector(name, range = version) {
  return `${name}@npm:${range}`
}

function expectedResolution(entry) {
  return `file:${vendorRelative}/${entry.filename}`
}

function writeVendor() {
  const packedDirectory = join(root, 'deepseek-harness', 'dist', 'npm')
  const orderPath = join(packedDirectory, 'publish-order.txt')
  if (!existsSync(orderPath)) {
    fail('missing upstream tarballs; run yarn upstream:prepare-runtime after upstream install/build works')
  }

  const filenames = readFileSync(orderPath, 'utf8').trim().split(/\r?\n/u).filter(Boolean)
  if (filenames.length === 0 || new Set(filenames).size !== filenames.length) {
    fail('upstream publish order is empty or contains duplicate tarballs')
  }

  mkdirSync(vendorDirectory, { recursive: true })
  const packages = filenames.map((filename) => {
    if (basename(filename) !== filename) fail(`tarball path escapes directory: ${JSON.stringify(filename)}`)
    const source = join(packedDirectory, filename)
    if (!existsSync(source) || !statSync(source).isFile()) fail(`missing packed tarball ${filename}`)
    const target = join(vendorDirectory, filename)
    copyFileSync(source, target)
    return {
      name: packageName(filename),
      version,
      filename,
      size: statSync(source).size,
      sha256: sha256(source),
    }
  })

  const expectedFiles = new Set([...filenames, 'manifest.json'])
  for (const entry of readdirSync(vendorDirectory, { withFileTypes: true })) {
    if (expectedFiles.has(entry.name)) continue
    if (!entry.isFile()) fail(`unexpected directory in vendored runtime: ${entry.name}`)
    unlinkSync(join(vendorDirectory, entry.name))
  }

  writeJson(manifestPath, {
    formatVersion: 1,
    repository: upstreamDocument.repository,
    commit: upstream.commit,
    version,
    buildProfile: 'official',
    packages,
  })

  upstream.runtimePackageVersion = version
  upstream.runtimeSource = `${vendorRelative}/manifest.json`
  writeJson(upstreamPath, upstreamDocument)

  const workspace = readJson(workspacePath)
  const resolutions = Object.fromEntries(Object.entries(workspace.resolutions ?? {})
    .filter(([selector]) => !isDshResolution(selector)))
  for (const entry of packages) {
    resolutions[resolutionSelector(entry.name)] = expectedResolution(entry)
    resolutions[resolutionSelector(entry.name, `^${version}`)] = expectedResolution(entry)
  }
  workspace.resolutions = resolutions
  writeJson(workspacePath, workspace)
}

function cleanPackedOutput() {
  const packedRoot = join(root, 'deepseek-harness', 'dist')
  if (!existsSync(packedRoot)) return
  const submoduleRoot = resolve(root, 'deepseek-harness')
  if (!packedRoot.startsWith(`${submoduleRoot}${sep}`)) {
    fail(`refusing to clean path outside upstream submodule: ${packedRoot}`)
  }
  rmSync(packedRoot, { recursive: true, force: true })
}

function checkVendor() {
  if (!existsSync(manifestPath)) fail(`missing ${relative(root, manifestPath)}`)
  const manifest = readJson(manifestPath)
  if (manifest.formatVersion !== 1) fail('unsupported vendored runtime manifest format')
  if (manifest.repository !== upstreamDocument.repository || manifest.commit !== upstream.commit) {
    fail('manifest source differs from upstream.json')
  }
  if (manifest.version !== version || upstream.runtimePackageVersion !== version) {
    fail('source, runtime, and manifest versions must match')
  }
  if (manifest.buildProfile !== 'official') fail('vendored runtime must use the official build profile')

  const workspace = readJson(workspacePath)
  const resolutions = workspace.resolutions ?? {}
  for (const entry of manifest.packages ?? []) {
    if (!isDshPackage(entry.name)) fail(`unexpected runtime package ${entry.name}`)
    const packagePath = join(vendorDirectory, entry.filename)
    if (!existsSync(packagePath) || !statSync(packagePath).isFile()) fail(`missing vendored tarball ${entry.filename}`)
    if (statSync(packagePath).size !== entry.size || sha256(packagePath) !== entry.sha256) {
      fail(`integrity mismatch for ${entry.filename}`)
    }
    if (resolutions[resolutionSelector(entry.name)] !== expectedResolution(entry)
      || resolutions[resolutionSelector(entry.name, `^${version}`)] !== expectedResolution(entry)) {
      fail(`workspace resolution differs for ${entry.name}`)
    }
  }

  process.stdout.write(`sync-vendored-runtime: ${version} runtime verified\n`)
}

if (mode === '--write') writeVendor()
checkVendor()
if (mode === '--write') cleanPackedOutput()
