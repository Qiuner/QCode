import { existsSync, renameSync } from 'node:fs'
import path from 'node:path'

export function resolveQCodeHome(root, configuredHome, migrate = true) {
  if (configuredHome) return path.resolve(configuredHome)
  const current = path.join(root, '.qcode-home')
  const legacy = path.join(root, '.agent-isles-home')
  if (existsSync(current) && existsSync(legacy)) {
    throw new Error(`QCode found both ${current} and legacy ${legacy}; merge or remove the unused directory before startup.`)
  }
  if (!existsSync(current) && existsSync(legacy)) {
    if (!migrate) return legacy
    renameSync(legacy, current)
  }
  return current
}
