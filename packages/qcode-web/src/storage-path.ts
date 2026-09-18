import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'

export function qcodeStatePath(home: string): string {
  const current = resolve(home, 'qcode-state.json')
  const legacy = resolve(home, 'agent-isles-state.json')
  if (existsSync(current) && existsSync(legacy)) {
    throw new Error(`QCode found both ${current} and legacy ${legacy}; merge or remove the unused file before startup.`)
  }
  if (!existsSync(current) && existsSync(legacy)) renameSync(legacy, current)
  return current
}
