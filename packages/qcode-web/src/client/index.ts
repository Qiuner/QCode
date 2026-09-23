import { resourcePath } from './resource-path.js'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { QCodeWorld } from './QCodeWorld.js'
import type { QCodeWorldInjected } from './QCodeWorld.js'
import { QCodeBrandMark, QCodeBrandName, QCodeHeroMark } from './Brand.js'
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
import { tutorialInstruction } from '../tutorial-types.js'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import { en, NS, zh } from './locales.js'
import { ResidentBindingCoordinator } from './resident-binding.js'

export const inject = ['connection', 'slots', 'sessions', 'workspaces', 'uiWorkspace', 'uiConversation', 'layout', 'locale', 'remote', 'remote.settings', 'remote.credentials', 'remote.llm', 'remote.session', 'remote.directoryPicker']

/** Replace the generic Web profile branding while retaining its layout and conversation UI. */
export function apply(ctx: Omit<ClientContext, 'sessions' | 'connection'> & { sessions: ISessions; connection: ConnectionHandle }): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'qcode-web: dictionaries')
  const t = ctx.locale.bind(NS)
  const activeLocale = () => ctx.locale.getSnapshot().active.startsWith('zh') ? 'zh' as const : 'en' as const
  const stateRequest = async (update?: { projectId: string; residentId?: ResidentId; sessionId?: string }): Promise<ResidentState> => {
    const response = await fetch(resourcePath('/qcode/resident-state'), {
      method: update ? 'POST' : 'GET', headers: { 'x-qcode-state': '1', 'content-type': 'application/json' },
      ...(update ? { body: JSON.stringify(update) } : {}), signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(t('error.state'))
    return await response.json() as ResidentState
  }
  const residentBindings = new ResidentBindingCoordinator({
    storage: localStorage,
    sessions: {
      refresh: () => ctx.sessions.refresh(),
      snapshot: () => ctx.sessions.list.getSnapshot(),
      create: (workspaceId, sessionId) => ctx.sessions.create({ workspaceId: workspaceId as WorkspaceId, sessionId }),
      rename: async (sessionId, title) => await ctx.sessions.binding(sessionId)?.session.rename(title),
    },
    workspaces: () => ctx.workspaces.list.getSnapshot().items,
    state: stateRequest,
    error: key => t(`error.${key}`),
    randomId: () => crypto.randomUUID(),
  })
  const { sessionForResident, residentForSession, selectResident } = {
    sessionForResident: residentBindings.sessionForResident.bind(residentBindings),
    residentForSession: residentBindings.residentForSession.bind(residentBindings),
    selectResident: residentBindings.selectResident.bind(residentBindings),
  }
  const sendResidentPrompt = async (residentId: ResidentId, workspaceId: string, prompt: string): Promise<void> => {
    const sessionId = await selectResident(residentId, workspaceId)
    const binding = ctx.sessions.binding(sessionId as SessionId)
    if (binding === undefined) throw new Error(t('error.residentDisconnected'))
    await prepareResidentModel(ctx.remote, sessionId as SessionId)
    const text = residentPrompt(residentId, prompt, activeLocale())
    const submission = binding.session.beginSubmission({ mode: 'queue', text, attachments: [] })
    const result = await binding.session.prompt([{ type: 'text', text }], 'queue', undefined, submission.requestId)
    if (!result.ok) throw new Error(result.error.message)
  }

  ctx.effect(() => applyDocumentBranding(document), 'qcode-web: document branding')

  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding', id: 'welcome-notice', priority: -100, order: -100,
  }, TownModelOnboarding))

  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding', id: 'deepseek-official', priority: -100, order: 0,
  }, TownModelOnboarding))

  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.qcodeWorld = ''
    style.textContent = WORLD_STYLES
    document.head.append(style)
    return () => { style.remove() }
  }, 'qcode-web: world styles')
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.register({ name: 'sidebar.brand.mark', priority: -100 }, QCodeBrandMark))
  ctx.slots.inject('sidebar.brand.name', () =>
    ctx.slots.register({ name: 'sidebar.brand.name', priority: -100 }, QCodeBrandName))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -100 }, QCodeHeroMark))
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register({
      name: 'shell.overlay',
      id: 'qcode-world',
      order: -100,
      locale: NS,
      inject: (): QCodeWorldInjected => ({
        localeState: ctx.locale,
        connectionState: ctx.connection?.state,
        tutorials: tutorialActions,
        refreshProjects: id => new Promise<void>((resolve, reject) => {
          if (ctx.workspaces.list.getSnapshot().items.some(item => item.workspaceId === id)) { resolve(); return }
          const timer = setTimeout(() => { unsubscribe(); reject(new Error(t('error.projectSync'))) }, 10000)
          const unsubscribe = ctx.workspaces.list.subscribe(() => {
            if (ctx.workspaces.list.getSnapshot().items.some(item => item.workspaceId === id)) { clearTimeout(timer); unsubscribe(); resolve() }
          })
        }),
        submitTutorial: async (run, draft, followup = false) => {
          if (!run.workspaceId) throw new Error(t('error.chooseProject'))
          if (run.submission && !followup) {
            const binding = ctx.sessions.binding(run.submission.sessionId as SessionId)
            if (!binding) throw new Error(t('error.openOriginal'))
            // DSH deduplicates this identity against both its inbox and durable user messages.
            const result = await binding.session.prompt([{ type: 'text', text: run.submission.text }], 'queue', undefined, run.submission.requestId as Parameters<typeof binding.session.prompt>[3])
            if (!result.ok) throw new Error(result.error.message)
            return run
          }
          const sessionId = followup && run.submission ? run.submission.sessionId : await selectResident('coder', run.workspaceId)
          const binding = ctx.sessions.binding(sessionId as SessionId)
          if (!binding) throw new Error(t('error.residentUnavailable'))
          if (binding.session.getSnapshot().running || binding.session.getSnapshot().queue.length) throw new Error(t('error.waitTask'))
          await prepareResidentModel(ctx.remote, sessionId as SessionId)
          const locale = activeLocale()
          const text = residentPrompt('coder', `${draft}\n\n${tutorialInstruction(locale)}`, locale)
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
            if (!result.ok) throw new Error(t('error.removeKey'))
          },
          test: async () => {
            const response = await fetch(resourcePath('/qcode/model-test'), {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(35_000),
            })
            const result = await response.json() as { ok: boolean; message?: string }
            if (!response.ok || !result.ok) throw new Error(result.message ?? t('error.connectionTest'))
          },
        },
        residentForSession, selectResident, sendResidentPrompt,
        restoreProject: () => residentBindings.restoreProject(),
        saveProject: projectId => residentBindings.saveProject(projectId),
        readRecentSession: async (id, signal) => {
          for await (const frame of ctx.remote.session.follow({ address: { kind: 'session', sessionId: id as SessionId }, maxMessages: 8 }, signal)) {
            if (frame.type === 'snapshot') return projectResidentEvents(frame.records as readonly SessionEventLikeEntry[])
          }
          throw new Error(t('error.readWork'))
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
    }, QCodeWorld))
}
