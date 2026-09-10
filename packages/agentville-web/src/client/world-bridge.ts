export const WORLD_BRIDGE_VERSION = 1 as const

export type ResidentId = 'coder' | 'file_keeper' | 'teacher' | 'coordinator'
export type ResidentStatus = 'idle' | 'thinking' | 'working' | 'approval' | 'completed' | 'failed'

export interface ResidentView {
  id: ResidentId
  displayName: string
  status: ResidentStatus
}

export type HostToWorldMessage =
  | {
      source: 'agentville-host'
      version: typeof WORLD_BRIDGE_VERSION
      type: 'world:init'
      payload: {
        workspace: { workspaceId: string; title: string } | null
        sessionId: string | null
        residents: readonly ResidentView[]
      }
    }
  | {
      source: 'agentville-host'
      version: typeof WORLD_BRIDGE_VERSION
      type: 'workspace:changed'
      payload: { workspaceId: string; title: string } | null
    }
  | {
      source: 'agentville-host'
      version: typeof WORLD_BRIDGE_VERSION
      type: 'resident:status'
      payload: ResidentView
    }

export type WorldToHostMessage =
  | { source: 'agentville-world'; version: typeof WORLD_BRIDGE_VERSION; type: 'world:ready' }
  | {
      source: 'agentville-world'
      version: typeof WORLD_BRIDGE_VERSION
      type: 'resident:selected'
      payload: { residentId: ResidentId }
    }

export function isWorldToHostMessage(value: unknown): value is WorldToHostMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<WorldToHostMessage>
  if (message.source !== 'agentville-world' || message.version !== WORLD_BRIDGE_VERSION) return false
  if (message.type === 'world:ready') return true
  if (message.type !== 'resident:selected') return false
  const residentId = message.payload?.residentId
  return residentId === 'coder' || residentId === 'file_keeper'
    || residentId === 'teacher' || residentId === 'coordinator'
}
