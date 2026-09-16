import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export const DOCUMENT_PAIRS = Object.freeze([
  ['README.md', 'README.zh-CN.md'],
  ['CHANGELOG.en.md', 'CHANGELOG.md'],
  ['CODE_OF_CONDUCT.en.md', 'CODE_OF_CONDUCT.md'],
  ['CONTRIBUTING.en.md', 'CONTRIBUTING.md'],
  ['SECURITY.en.md', 'SECURITY.md'],
  ['SUPPORT.en.md', 'SUPPORT.md'],
  ['THIRD_PARTY_NOTICES.en.md', 'THIRD_PARTY_NOTICES.md'],
  ['apps/desktop/README.en.md', 'apps/desktop/README.md'],
])

function normalizePath(file) {
  return file.trim().replaceAll('\\', '/')
}

export function findUnsyncedDocumentPairs(changedFiles, pairs = DOCUMENT_PAIRS) {
  const changed = new Set(changedFiles.map(normalizePath).filter(Boolean))

  return pairs.flatMap(([english, chinese]) => {
    const englishChanged = changed.has(english)
    const chineseChanged = changed.has(chinese)
    if (englishChanged === chineseChanged) return []

    return [{ changed: englishChanged ? english : chinese, missing: englishChanged ? chinese : english }]
  })
}

function gitLines(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
}

function changedFilesForRange(base, head) {
  if (/^0+$/.test(base)) {
    return gitLines(['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '--no-renames', head])
  }
  return gitLines(['diff', '--name-only', '--no-renames', base, head, '--'])
}

function changedFilesInWorkingTree() {
  return [
    ...gitLines(['diff', '--name-only', '--no-renames', 'HEAD', '--']),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ]
}

function main() {
  const args = process.argv.slice(2)
  let changedFiles

  if (args.length === 1 && args[0] === '--working-tree') {
    changedFiles = changedFilesInWorkingTree()
  } else if (args.length === 2) {
    changedFiles = changedFilesForRange(args[0], args[1])
  } else {
    console.error('Usage: node scripts/check-doc-i18n-sync.mjs --working-tree')
    console.error('   or: node scripts/check-doc-i18n-sync.mjs <base-ref> <head-ref>')
    process.exitCode = 2
    return
  }

  const unsynced = findUnsyncedDocumentPairs(changedFiles)
  if (unsynced.length === 0) {
    console.log('Chinese and English documentation changes are synchronized.')
    return
  }

  console.error('Chinese and English documentation must be changed together:')
  for (const { changed, missing } of unsynced) {
    console.error(`- ${changed} changed, but ${missing} did not.`)
  }
  process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
