type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function readMigratedStorage(storage: StorageAccess, key: string, legacyKeys: readonly string[]): string | null {
  const current = storage.getItem(key)
  if (current !== null) return current
  for (const legacyKey of legacyKeys) {
    const legacy = storage.getItem(legacyKey)
    if (legacy === null) continue
    try {
      storage.setItem(key, legacy)
      storage.removeItem(legacyKey)
    } catch {
      // Keep the legacy value when storage is read-only or full.
    }
    return legacy
  }
  return null
}
