import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { AgentvilleWorld } from './AgentvilleWorld.js'
import type { AgentvilleWorldInjected } from './AgentvilleWorld.js'
import { AgentvilleBrandMark, AgentvilleBrandName, AgentvilleHeroMark } from './Brand.js'
import { WORLD_STYLES } from './styles.js'
import type { ResidentId } from './world-bridge.js'

export const inject = ['slots', 'sessions', 'workspaces']

const RESIDENT_SESSION_KEY = 'agentville.resident-sessions.v1'
const RESIDENT_NAMES: Readonly<Record<ResidentId, string>> = {
  coder: 'Coder',
  file_keeper: 'File Keeper',
  teacher: 'Teacher',
  coordinator: 'Coordinator',
}

type ResidentSessions = Partial<Record<string, Partial<Record<ResidentId, string>>>>

function readResidentSessions(): ResidentSessions {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RESIDENT_SESSION_KEY) ?? '{}')
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as ResidentSessions
      : {}
  } catch (_invalidStoredValue) {
    return {}
  }
}

function writeResidentSession(workspaceId: string, residentId: ResidentId, sessionId: string): void {
  const mappings = readResidentSessions()
  mappings[workspaceId] = { ...mappings[workspaceId], [residentId]: sessionId }
  localStorage.setItem(RESIDENT_SESSION_KEY, JSON.stringify(mappings))
}

/** Replace the generic Web profile branding while retaining its layout and conversation UI. */
export function apply(ctx: ClientContext): void {
  const workbench = new URLSearchParams(window.location.search).get('agentville') === 'workbench'
    || window.location.pathname === '/workbench'
  const selecting = new Map<string, Promise<string>>()
  const residentForSession = (workspaceId: string, sessionId: string): ResidentId | undefined => {
    const mapping = readResidentSessions()[workspaceId]
    return (Object.entries(mapping ?? {}) as [ResidentId, string][])
      .find(([, candidate]) => candidate === sessionId)?.[0]
  }
  const selectResident = (residentId: ResidentId, workspaceId: string): Promise<string> => {
    const key = `${workspaceId}:${residentId}`
    const active = selecting.get(key)
    if (active !== undefined) return active
    const operation = (async (): Promise<string> => {
      const workspace = ctx.workspaces.list.getSnapshot().items
        .find(candidate => candidate.workspaceId === workspaceId)
      if (workspace === undefined) throw new Error('工作区已不可用，请重新选择')
      const mapped = readResidentSessions()[workspaceId]?.[residentId]
      const mappedSessionId = mapped as SessionId | undefined
      if (mappedSessionId !== undefined
        && workspace.sessionIds.includes(mappedSessionId)
        && ctx.sessions.list.getSnapshot().byId[mappedSessionId] !== undefined) {
        ctx.sessions.open(mappedSessionId)
        return mappedSessionId
      }
      const sessionId = await ctx.sessions.create({ workspaceId: workspace.workspaceId })
      const renamed = await ctx.sessions.binding(sessionId)?.session.rename(
        `${RESIDENT_NAMES[residentId]} · ${workspace.title}`)
      if (renamed !== undefined && !renamed.ok) {
        console.warn(`agentville: resident session rename failed: ${renamed.error.message}`)
      }
      writeResidentSession(workspaceId, residentId, sessionId)
      ctx.sessions.open(sessionId)
      return sessionId
    })().finally(() => { selecting.delete(key) })
    selecting.set(key, operation)
    return operation
  }
  const sendResidentPrompt = async (residentId: ResidentId, workspaceId: string, prompt: string): Promise<void> => {
    const sessionId = await selectResident(residentId, workspaceId)
    const binding = ctx.sessions.binding(sessionId as SessionId)
    if (binding === undefined) throw new Error('居民会话已断开，请重新打开')
    const result = await binding.session.prompt([{ type: 'text', text: prompt }], 'queue')
    if (!result.ok) throw new Error(result.error.message)
  }

  if (workbench) return

  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.agentvilleWorld = ''
    style.textContent = WORLD_STYLES
    document.head.append(style)
    return () => { style.remove() }
  }, 'agentville-web: world styles')
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.register({ name: 'sidebar.brand.mark', priority: -100 }, AgentvilleBrandMark))
  ctx.slots.inject('sidebar.brand.name', () =>
    ctx.slots.register({ name: 'sidebar.brand.name', priority: -100 }, AgentvilleBrandName))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -100 }, AgentvilleHeroMark))
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register({
      name: 'shell.overlay',
      id: 'agentville-world',
      order: -100,
      inject: (): AgentvilleWorldInjected => ({ residentForSession, selectResident, sendResidentPrompt }),
    }, AgentvilleWorld))
}
