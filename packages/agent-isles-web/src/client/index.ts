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
import { AgentIslesWorld } from './AgentIslesWorld.js'
import type { AgentIslesWorldInjected } from './AgentIslesWorld.js'
import { AgentIslesBrandMark, AgentIslesBrandName, AgentIslesHeroMark } from './Brand.js'
import { WORLD_STYLES } from './styles.js'
import type { ResidentId } from './world-bridge.js'
import { residentPrompt, projectResidentEvents } from './resident-model.js'
import type { SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { prepareResidentModel, readModelSettings, saveModelSettings } from './model-settings.js'
import { TownModelOnboarding } from './ModelSettings.js'
import { applyDocumentBranding } from './document-branding.js'
import type { ResidentState } from '../resident-state.js'
import { tutorialActions } from './tutorial-api.js'
import { FIRST_TUTORIAL } from '../tutorial-types.js'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'

export const inject = ['connection', 'slots', 'sessions', 'workspaces', 'uiWorkspace', 'uiConversation', 'layout', 'remote', 'remote.settings', 'remote.credentials', 'remote.llm', 'remote.session', 'remote.directoryPicker']

const RESIDENT_SESSION_KEY = 'agent-isles.resident-sessions.v1'
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
  try { localStorage.setItem(RESIDENT_SESSION_KEY, JSON.stringify(mappings)) } catch { /* Host owns recovery. */ }
}

/** Replace the generic Web profile branding while retaining its layout and conversation UI. */
export function apply(ctx: Omit<ClientContext, 'sessions' | 'connection'> & { sessions: ISessions; connection: ConnectionHandle }): void {
  const selecting = new Map<string, Promise<string>>()
  let saved: ResidentState = { sessions: {} }
  const stateRequest = async (update?: { projectId: string; residentId?: ResidentId; sessionId?: string }): Promise<ResidentState> => {
    const response = await fetch('/agent-isles/resident-state', {
      method: update ? 'POST' : 'GET', headers: { 'x-agent-isles-state': '1', 'content-type': 'application/json' },
      ...(update ? { body: JSON.stringify(update) } : {}), signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('工作记录暂时无法恢复或保存，请重试')
    return await response.json() as ResidentState
  }
  const sessionForResident = (workspaceId: string, residentId: ResidentId): string | undefined => {
    const workspace = ctx.workspaces.list.getSnapshot().items.find(item => item.workspaceId === workspaceId)
    const catalog = ctx.sessions.list.getSnapshot().byId
    const mapped = saved.sessions[workspaceId]?.[residentId] ?? readResidentSessions()[workspaceId]?.[residentId]
    if (mapped) return workspace?.sessionIds.includes(mapped as SessionId) && catalog[mapped as SessionId] ? mapped : undefined
    // Migrate only an unambiguous legacy resident title, within its owning workspace.
    const candidates = workspace?.sessionIds.filter(id => catalog[id]?.title?.startsWith(`${RESIDENT_NAMES[residentId]} · `)) ?? []
    return candidates.length === 1 ? candidates[0] : undefined
  }
  const residentForSession = (workspaceId: string, sessionId: string): ResidentId | undefined => {
    return (Object.keys(RESIDENT_NAMES) as ResidentId[]).find(id => sessionForResident(workspaceId, id) === sessionId)
  }
  const selectResident = (residentId: ResidentId, workspaceId: string): Promise<string> => {
    if (residentId === 'teacher') return Promise.reject(new Error('苔伯通过项目与历史对话管理界面操作，不创建模型会话。'))
    const key = `${workspaceId}:${residentId}`
    const active = selecting.get(key)
    if (active !== undefined) return active
    const operation = (async (): Promise<string> => {
      // A restored workspace can arrive before the session catalog. Do not
      // replace its saved resident mapping while that catalog is still loading.
      await ctx.sessions.refresh()
      if (ctx.sessions.list.getSnapshot().phase !== 'ready') throw new Error('会话记录尚未加载，请稍后重试')
      const workspace = ctx.workspaces.list.getSnapshot().items
        .find(candidate => candidate.workspaceId === workspaceId)
      if (workspace === undefined) throw new Error('工作区已不可用，请重新选择')
      const mapped = sessionForResident(workspaceId, residentId)
      if (!mapped && (saved.sessions[workspaceId]?.[residentId] || readResidentSessions()[workspaceId]?.[residentId])) {
        throw new Error('原居民会话已不在当前项目中，请到高级工作台检查历史记录；未创建替代会话。')
      }
      if (!mapped && workspace.sessionIds.filter(id => ctx.sessions.list.getSnapshot().byId[id]?.title?.startsWith(`${RESIDENT_NAMES[residentId]} · `)).length > 1) {
        throw new Error('找到多个旧居民会话，请在高级工作台确认要继续哪一个；未创建替代会话。')
      }
      const mappedSessionId = mapped as SessionId | undefined
      if (mappedSessionId !== undefined
        && workspace.sessionIds.includes(mappedSessionId)
        && ctx.sessions.list.getSnapshot().byId[mappedSessionId] !== undefined) {
        saved = await stateRequest({ projectId: workspaceId, residentId, sessionId: mappedSessionId })
        return mappedSessionId
      }
      const sessionId = await ctx.sessions.create({ workspaceId: workspace.workspaceId, sessionId: crypto.randomUUID() as SessionId })
      const renamed = await ctx.sessions.binding(sessionId)?.session.rename(
        `${RESIDENT_NAMES[residentId]} · ${workspace.title}`)
      if (renamed !== undefined && !renamed.ok) {
        console.warn(`agent-isles: resident session rename failed: ${renamed.error.message}`)
      }
      writeResidentSession(workspaceId, residentId, sessionId)
      saved.sessions[workspaceId] = { ...saved.sessions[workspaceId], [residentId]: sessionId }
      saved = await stateRequest({ projectId: workspaceId, residentId, sessionId })
      return sessionId
    })().finally(() => { selecting.delete(key) })
    selecting.set(key, operation)
    return operation
  }
  const sendResidentPrompt = async (residentId: ResidentId, workspaceId: string, prompt: string): Promise<void> => {
    const sessionId = await selectResident(residentId, workspaceId)
    const binding = ctx.sessions.binding(sessionId as SessionId)
    if (binding === undefined) throw new Error('居民会话已断开，请重新打开')
    await prepareResidentModel(ctx.remote, sessionId as SessionId)
    const text = residentPrompt(residentId, prompt)
    const submission = binding.session.beginSubmission({ mode: 'queue', text, attachments: [] })
    const result = await binding.session.prompt([{ type: 'text', text }], 'queue', undefined, submission.requestId)
    if (!result.ok) throw new Error(result.error.message)
  }

  ctx.effect(() => applyDocumentBranding(document), 'agent-isles-web: document branding')

  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding', id: 'deepseek-official', priority: -100, order: 0,
  }, TownModelOnboarding))

  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.agentIslesWorld = ''
    style.textContent = WORLD_STYLES
    document.head.append(style)
    return () => { style.remove() }
  }, 'agent-isles-web: world styles')
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.register({ name: 'sidebar.brand.mark', priority: -100 }, AgentIslesBrandMark))
  ctx.slots.inject('sidebar.brand.name', () =>
    ctx.slots.register({ name: 'sidebar.brand.name', priority: -100 }, AgentIslesBrandName))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -100 }, AgentIslesHeroMark))
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register({
      name: 'shell.overlay',
      id: 'agent-isles-world',
      order: -100,
      inject: (): AgentIslesWorldInjected => ({
        connectionState: ctx.connection?.state,
        tutorials: tutorialActions,
        refreshProjects: id => new Promise<void>((resolve, reject) => {
          if (ctx.workspaces.list.getSnapshot().items.some(item => item.workspaceId === id)) { resolve(); return }
          const timer = setTimeout(() => { unsubscribe(); reject(new Error('项目已保存，列表同步尚未完成。请重新读取项目。')) }, 10000)
          const unsubscribe = ctx.workspaces.list.subscribe(() => {
            if (ctx.workspaces.list.getSnapshot().items.some(item => item.workspaceId === id)) { clearTimeout(timer); unsubscribe(); resolve() }
          })
        }),
        submitTutorial: async (run, draft, followup = false) => {
          if (!run.workspaceId) throw new Error('请先为作品选择项目。')
          if (run.submission && !followup) {
            const binding = ctx.sessions.binding(run.submission.sessionId as SessionId)
            if (!binding) throw new Error('请先打开原居民会话，再重试这条提交。')
            // DSH deduplicates this identity against both its inbox and durable user messages.
            const result = await binding.session.prompt([{ type: 'text', text: run.submission.text }], 'queue', undefined, run.submission.requestId as Parameters<typeof binding.session.prompt>[3])
            if (!result.ok) throw new Error(result.error.message)
            return run
          }
          const sessionId = followup && run.submission ? run.submission.sessionId : await selectResident('coder', run.workspaceId)
          const binding = ctx.sessions.binding(sessionId as SessionId)
          if (!binding) throw new Error('居民会话暂不可用。')
          if (binding.session.getSnapshot().running || binding.session.getSnapshot().queue.length) throw new Error('请等待当前任务结束，再开始教程这一轮。')
          await prepareResidentModel(ctx.remote, sessionId as SessionId)
          const text = residentPrompt('coder', `${draft}\n\n${FIRST_TUTORIAL.instruction}`)
          const submission = binding.session.beginSubmission({ mode: 'queue', text, attachments: [] })
          let prepared
          try { prepared = await tutorialActions.command(followup ? 'followup' : 'submit', run, { sessionId, submissionId: submission.requestId, text }) }
          catch (error) { submission.abandon(); throw error }
          const result = await binding.session.prompt([{ type: 'text', text }], 'queue', undefined, submission.requestId)
          if (!result.ok) throw new Error(result.error.message)
          return prepared
        },
        models: {
          load: () => readModelSettings(ctx.remote),
          save: (...args) => saveModelSettings(ctx.remote, ...args),
          remove: async ref => {
            const result = await ctx.remote.credentials.unset(ref)
            if (!result.ok) throw new Error('密钥删除失败，可能由启动环境或只读配置管理')
          },
          test: async () => {
            const response = await fetch('/agent-isles/model-test', {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(35_000),
            })
            const result = await response.json() as { ok: boolean; message?: string }
            if (!response.ok || !result.ok) throw new Error(result.message ?? '连接测试失败')
          },
        },
        residentForSession, selectResident, sendResidentPrompt,
        restoreProject: async () => {
          saved = await stateRequest()
          await ctx.sessions.refresh()
          if (ctx.sessions.list.getSnapshot().phase !== 'ready') throw new Error('会话记录尚未加载，请重试')
          return saved.projectId
        },
        saveProject: async projectId => { saved = await stateRequest({ projectId }) },
        readRecentSession: async (id, signal) => {
          for await (const frame of ctx.remote.session.follow({ address: { kind: 'session', sessionId: id as SessionId }, maxMessages: 8 }, signal)) {
            if (frame.type === 'snapshot') return projectResidentEvents(frame.records as readonly SessionEventLikeEntry[])
          }
          throw new Error('工作记录暂时无法读取')
        },
        getBinding: id => ctx.sessions.binding(id as SessionId),
        focusSession: id => ctx.sessions.open(id as SessionId),
        toggleSidebar: () => ctx.layout.toggleSidebar(),
        sessionForResident,
        pickDirectory: async signal => {
          const result = await ctx.remote.directoryPicker.pick(signal)
          if (!result.ok) throw new Error(result.error.message)
          return result.value
        },
        bindWorkspace: async path => (await ctx.workspaces.create({ path })).workspaceId,
      }),
    }, AgentIslesWorld))
}
