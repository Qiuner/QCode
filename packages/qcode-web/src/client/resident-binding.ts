import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ResidentState } from '../resident-state.js'
import { readMigratedStorage } from './storage-migration.js'
import type { ResidentId } from './world-bridge.js'

const RESIDENT_SESSION_KEY = 'qcode.resident-sessions.v1'
const LEGACY_RESIDENT_SESSION_KEY = 'agent-isles.resident-sessions.v1'
const RESIDENT_NAMES: Readonly<Record<ResidentId, string>> = {
  coder: 'Coder',
  file_keeper: 'File Keeper',
  teacher: 'Teacher',
  coordinator: 'Coordinator',
}

type ResidentSessions = Partial<Record<string, Partial<Record<ResidentId, string>>>>
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type SessionSummary = { title?: string }
type WorkspaceSummary = { workspaceId: string; title: string; sessionIds: readonly SessionId[] }
type RenameResult = { ok: true } | { ok: false; error: { message: string } }

export interface ResidentBindingAdapters {
  storage: StorageAccess
  sessions: {
    refresh(): Promise<void>
    snapshot(): { phase: string; byId: Partial<Record<SessionId, SessionSummary>> }
    create(workspaceId: string, sessionId: SessionId): Promise<SessionId>
    rename(sessionId: SessionId, title: string): Promise<RenameResult | undefined>
  }
  workspaces(): readonly WorkspaceSummary[]
  state(update?: { projectId: string; residentId?: ResidentId; sessionId?: string }): Promise<ResidentState>
  error(key: 'teacherSession' | 'sessionsLoading' | 'workspaceGone' | 'residentGone' | 'legacyResidents' | 'sessionsRetry'): string
  randomId(): string
}

/** Owns QCode's Workspace + Resident -> Session association lifecycle. */
export class ResidentBindingCoordinator {
  private saved: ResidentState = { sessions: {} }
  private selecting = new Map<string, Promise<string>>()

  constructor(private readonly adapters: ResidentBindingAdapters) {}

  async restoreProject(): Promise<string | undefined> {
    this.saved = await this.adapters.state()
    await this.adapters.sessions.refresh()
    if (this.adapters.sessions.snapshot().phase !== 'ready') throw new Error(this.adapters.error('sessionsRetry'))
    return this.saved.projectId
  }

  async saveProject(projectId: string): Promise<void> {
    this.saved = await this.adapters.state({ projectId })
  }

  sessionForResident(workspaceId: string, residentId: ResidentId): string | undefined {
    const workspace = this.adapters.workspaces().find(item => item.workspaceId === workspaceId)
    const catalog = this.adapters.sessions.snapshot().byId
    const mapped = this.saved.sessions[workspaceId]?.[residentId] ?? this.readLegacySessions()[workspaceId]?.[residentId]
    if (mapped) return workspace?.sessionIds.includes(mapped as SessionId) && catalog[mapped as SessionId] ? mapped : undefined
    const candidates = workspace?.sessionIds.filter(id => catalog[id]?.title?.startsWith(`${RESIDENT_NAMES[residentId]} · `)) ?? []
    return candidates.length === 1 ? candidates[0] : undefined
  }

  residentForSession(workspaceId: string, sessionId: string): ResidentId | undefined {
    return (Object.keys(RESIDENT_NAMES) as ResidentId[]).find(id => this.sessionForResident(workspaceId, id) === sessionId)
  }

  selectResident(residentId: ResidentId, workspaceId: string): Promise<string> {
    if (residentId === 'teacher') return Promise.reject(new Error(this.adapters.error('teacherSession')))
    const key = `${workspaceId}:${residentId}`
    const active = this.selecting.get(key)
    if (active !== undefined) return active
    const operation = this.selectResidentOnce(residentId, workspaceId).finally(() => { this.selecting.delete(key) })
    this.selecting.set(key, operation)
    return operation
  }

  private async selectResidentOnce(residentId: ResidentId, workspaceId: string): Promise<string> {
    await this.adapters.sessions.refresh()
    const sessionSnapshot = this.adapters.sessions.snapshot()
    if (sessionSnapshot.phase !== 'ready') throw new Error(this.adapters.error('sessionsLoading'))
    const workspace = this.adapters.workspaces().find(item => item.workspaceId === workspaceId)
    if (workspace === undefined) throw new Error(this.adapters.error('workspaceGone'))
    const mapped = this.sessionForResident(workspaceId, residentId)
    if (!mapped && (this.saved.sessions[workspaceId]?.[residentId] || this.readLegacySessions()[workspaceId]?.[residentId])) {
      throw new Error(this.adapters.error('residentGone'))
    }
    if (!mapped && workspace.sessionIds.filter(id => sessionSnapshot.byId[id]?.title?.startsWith(`${RESIDENT_NAMES[residentId]} · `)).length > 1) {
      throw new Error(this.adapters.error('legacyResidents'))
    }
    const mappedSessionId = mapped as SessionId | undefined
    if (mappedSessionId !== undefined && workspace.sessionIds.includes(mappedSessionId) && sessionSnapshot.byId[mappedSessionId] !== undefined) {
      this.saved = await this.adapters.state({ projectId: workspaceId, residentId, sessionId: mappedSessionId })
      return mappedSessionId
    }
    const sessionId = await this.adapters.sessions.create(workspace.workspaceId, this.adapters.randomId() as SessionId)
    const renamed = await this.adapters.sessions.rename(sessionId, `${RESIDENT_NAMES[residentId]} · ${workspace.title}`)
    if (renamed !== undefined && !renamed.ok) console.warn(`QCode: resident session rename failed: ${renamed.error.message}`)
    this.writeLegacySession(workspaceId, residentId, sessionId)
    this.saved.sessions[workspaceId] = { ...this.saved.sessions[workspaceId], [residentId]: sessionId }
    this.saved = await this.adapters.state({ projectId: workspaceId, residentId, sessionId })
    return sessionId
  }

  private readLegacySessions(): ResidentSessions {
    try {
      const value: unknown = JSON.parse(readMigratedStorage(this.adapters.storage, RESIDENT_SESSION_KEY, [LEGACY_RESIDENT_SESSION_KEY]) ?? '{}')
      return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as ResidentSessions : {}
    } catch {
      return {}
    }
  }

  private writeLegacySession(workspaceId: string, residentId: ResidentId, sessionId: string): void {
    const mappings = this.readLegacySessions()
    mappings[workspaceId] = { ...mappings[workspaceId], [residentId]: sessionId }
    try { this.adapters.storage.setItem(RESIDENT_SESSION_KEY, JSON.stringify(mappings)) } catch { /* Host owns recovery. */ }
  }
}
