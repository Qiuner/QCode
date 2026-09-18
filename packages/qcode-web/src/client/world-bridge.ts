export const WORLD_BRIDGE_VERSION = 1 as const
export const QCODE_HOST_SOURCE = 'qcode-host' as const
export const QCODE_WORLD_SOURCE = 'qcode-world' as const
export const LEGACY_HOST_SOURCE = 'agent-isles-host' as const
export const LEGACY_WORLD_SOURCE = 'agent-isles-world' as const

export function worldFrameUrl(hostHref: string): URL {
  const url = new URL(new URL(hostHref).protocol === 'dsh-app:' ? '/api/qcode/world/index.html?embed=1' : '/world/?embed=1', hostHref)
  return url
}

export type ResidentId = 'coder' | 'file_keeper' | 'teacher' | 'coordinator'
export type ResidentStatus = 'idle' | 'thinking' | 'working' | 'approval' | 'completed' | 'failed'
export type WorldLocale = 'zh' | 'en'
export interface RegionLoadState {
  stage: 'waiting' | 'downloading' | 'installing' | 'failed' | 'ready'
  detail: string
}

export interface ResidentView {
  id: ResidentId
  displayName: string
  status: ResidentStatus
}

export type HostToWorldMessage =
  | { source: typeof QCODE_HOST_SOURCE; version: typeof WORLD_BRIDGE_VERSION; type: 'tutorial:keeper'; payload: { encounterId: string; action: 'arrive' | 'home' | 'cancel'; reducedMotion: boolean } }
  | {
      source: typeof QCODE_HOST_SOURCE
      version: typeof WORLD_BRIDGE_VERSION
      type: 'world:show-guide' | 'world:retry-neighbors'
    }
  | {
      source: typeof QCODE_HOST_SOURCE
      version: typeof WORLD_BRIDGE_VERSION
      type: 'world:init'
      payload: {
        locale: WorldLocale
        workspace: { workspaceId: string; title: string } | null
        sessionId: string | null
        panelOpen: boolean
        residents: readonly ResidentView[]
      }
    }
  | {
      source: typeof QCODE_HOST_SOURCE
      version: typeof WORLD_BRIDGE_VERSION
      type: 'world:locale'
      payload: { locale: WorldLocale }
    }
  | {
      source: typeof QCODE_HOST_SOURCE
      version: typeof WORLD_BRIDGE_VERSION
      type: 'workspace:changed'
      payload: { workspaceId: string; title: string } | null
    }
  | {
      source: typeof QCODE_HOST_SOURCE
      version: typeof WORLD_BRIDGE_VERSION
      type: 'resident:status'
      payload: ResidentView
    }

export type WorldToHostMessage =
  | { source: typeof QCODE_WORLD_SOURCE | typeof LEGACY_WORLD_SOURCE; version: typeof WORLD_BRIDGE_VERSION; type: 'tutorial:keeper'; payload: { encounterId: string; status: 'arrived' | 'home' | 'cancelled' } }
  | { source: typeof QCODE_WORLD_SOURCE | typeof LEGACY_WORLD_SOURCE; version: typeof WORLD_BRIDGE_VERSION; type: 'world:ready' | 'world:playable' }
  | { source: typeof QCODE_WORLD_SOURCE | typeof LEGACY_WORLD_SOURCE; version: typeof WORLD_BRIDGE_VERSION; type: 'world:regions'; payload: RegionLoadState }
  | {
      source: typeof QCODE_WORLD_SOURCE | typeof LEGACY_WORLD_SOURCE
      version: typeof WORLD_BRIDGE_VERSION
      type: 'resident:selected'
      payload: { residentId: ResidentId }
    }

export function isWorldToHostMessage(value: unknown): value is WorldToHostMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<WorldToHostMessage>
  if ((message.source !== QCODE_WORLD_SOURCE && message.source !== LEGACY_WORLD_SOURCE) || message.version !== WORLD_BRIDGE_VERSION) return false
  if (message.type === 'tutorial:keeper') return !!message.payload && typeof message.payload.encounterId === 'string' && /^[\w-]{1,160}$/.test(message.payload.encounterId) && ['arrived', 'home', 'cancelled'].includes(message.payload.status)
  if (message.type === 'world:ready' || message.type === 'world:playable') return true
  if (message.type === 'world:regions') {
    return !!message.payload && ['waiting', 'downloading', 'installing', 'failed', 'ready'].includes(message.payload.stage)
      && typeof message.payload.detail === 'string' && message.payload.detail.length <= 240
  }
  if (message.type !== 'resident:selected') return false
  const residentId = message.payload?.residentId
  return residentId === 'coder' || residentId === 'file_keeper'
    || residentId === 'teacher' || residentId === 'coordinator'
}
