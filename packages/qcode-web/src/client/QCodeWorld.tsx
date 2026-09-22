import { resourcePath } from './resource-path.js'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BookOpen, ChevronDown, ArrowRight, Languages } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { WorldBridgeSession, type ResidentId, type WorldLocale } from './world-bridge.js'
import { localizedResidents, projectResidentEvents, readResidentDrafts, residentEventStatus } from './resident-model.js'
import { ModelSettings } from './ModelSettings.js'
import { localizedModelError, ModelConfigurationRequired, type ModelSettingsActions } from './model-settings.js'
import { PLAYER_PORTRAIT, RESIDENT_PORTRAITS } from './resident-portraits.js'
import { TutorialPanel, useTutorial } from './Tutorial.js'
import { NativeChat } from './NativeChat.js'
import { NativeSidebar } from './NativeSidebar.js'
import { ProjectFiles } from './ProjectFiles.js'
import { workNarrative } from './work-narrative.js'
import { ResidentNotifications, type NotificationSession } from './ResidentNotifications.js'
import { type TutorialActions, type TutorialRun } from '../tutorial-types.js'
import { requestProjectFullscreen } from './project-fullscreen.js'
import { NS, type QCodeTranslate } from './locales.js'
import { readMigratedStorage } from './storage-migration.js'

export interface QCodeWorldInjected {
  localeState: { getSnapshot(): { active: string }; subscribe(listener: () => void): () => void; setLocale(id: string): void }
  connectionState?: { getSnapshot(): string | undefined; subscribe(listener: () => void): () => void }
  tutorials?: TutorialActions
  submitTutorial?(run: TutorialRun, draft: string, followup?: boolean): Promise<TutorialRun>
  models: ModelSettingsActions
  residentForSession(workspaceId: string, sessionId: string): ResidentId | undefined
  sessionForResident(workspaceId: string, residentId: ResidentId): string | undefined
  selectResident(residentId: ResidentId, workspaceId: string): Promise<string>
  sendResidentPrompt(residentId: ResidentId, workspaceId: string, prompt: string): Promise<void>
  getBinding(id: string): SessionBinding | undefined
  focusSession(id: string): void
  toggleSidebar(): void
  pickDirectory(signal?: AbortSignal): Promise<string | null>
  bindWorkspace(path: string): Promise<string>
  refreshProjects?(id: string): Promise<unknown>
  restoreProject(): Promise<string | undefined>
  saveProject(projectId: string): Promise<void>
  readRecentSession(id: string, signal: AbortSignal): Promise<ReturnType<typeof projectResidentEvents>>
}

type Props = PropsRuntime<'shell.overlay'> & PropsLocale<typeof NS> & QCodeWorldInjected
function ConnectionNotice({ source, t }: { source: NonNullable<QCodeWorldInjected['connectionState']>; t: QCodeTranslate }) {
  const state = useSyncExternalStore(source.subscribe, source.getSnapshot)
  if (state === 'connected' || state === undefined) return null
  return <div className="town-connection-notice" role="status">{t('connection.reconnecting')}</div>
}
const PROJECT_KEY = 'qcode.active-workspace.v1'
const DRAFTS_KEY = 'qcode.resident-drafts.v1'
const LEGACY_PROJECT_KEY = 'agent-isles.active-workspace.v1'
const LEGACY_DRAFTS_KEY = 'agent-isles.resident-drafts.v1'

function SessionResult({ binding, name, project, run, waiting, t }: { binding: SessionBinding; name: string; project?: string; run?: TutorialRun; waiting: boolean; t: QCodeTranslate }) {
  const [stopError, setStopError] = useState('')
  const [completedNotice, setCompletedNotice] = useState(false)
  const wasRunning = useRef(false)
  const state = useSyncExternalStore(binding.session.subscribe.bind(binding.session), binding.session.getSnapshot.bind(binding.session))
  const events = useSyncExternalStore(binding.eventSource.subscribe.bind(binding.eventSource), binding.eventSource.getSnapshot.bind(binding.eventSource))
  const result = projectResidentEvents(events.entries)
  useEffect(() => {
    if (state.running || state.awaitingFirstTurn) wasRunning.current = true
    else if (wasRunning.current && result.status === 'completed') {
      wasRunning.current = false
      setCompletedNotice(true)
    }
  }, [state.running, state.awaitingFirstTurn, result.status])
  const narrative = workNarrative({ run, loading: state.openState === 'loading', running: state.running || state.awaitingFirstTurn, pending: waiting, failed: !!(state.openError || state.promptError || state.lastAgentError) || result.status === 'failed', finished: result.status === 'completed' }, t)
  return <div className="town-results">
    <span className="town-session-status" role="status" title={narrative.text}>{state.awaitingFirstTurn ? t('task.accepted') : narrative.title}</span>
    {completedNotice && <div className="town-completion-notice" role="status"><strong>{t('task.completed', { name })}</strong><span>{t('task.completedHint')}</span><button type="button" onClick={() => setCompletedNotice(false)}>{t('task.acknowledge')}</button></div>}
    {state.queue.length > 0 && <p role="status">{t('task.queued', { count: state.queue.length })}</p>}
    {(state.openError || state.promptError || state.lastAgentError) && <div role="alert"><p>{t('task.problem')}</p><details><summary>{t('task.errorDetails')}</summary><p>{state.openError?.message ?? state.promptError?.error.message ?? state.lastAgentError}</p></details></div>}
    {stopError && <p role="alert">{stopError}</p>}
    {state.running && <button type="button" onClick={() => { void binding.session.cancel().then(result => { if (!result.ok) setStopError(result.error.message) }, reason => setStopError(String(reason))) }}>{t('task.stop')}</button>}
  </div>
}

export function QCodeWorld(props: Props) {
  const localeSnapshot = useSyncExternalStore(props.localeState.subscribe.bind(props.localeState), props.localeState.getSnapshot.bind(props.localeState))
  const locale: WorldLocale = localeSnapshot.active.startsWith('zh') ? 'zh' : 'en'
  const t = props.t
  const residentCatalog = localizedResidents(t)
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--qcode-hero-title', JSON.stringify(t('brand.hero')))
    root.style.setProperty('--qcode-hero-subtitle', JSON.stringify(t('brand.subtitle')))
    return () => {
      root.style.removeProperty('--qcode-hero-title')
      root.style.removeProperty('--qcode-hero-subtitle')
    }
  }, [locale, t])
  const [workbench, setWorkbench] = useState(() => location.pathname === '/workbench' || ['qcode', 'agent-isles'].some(key => new URLSearchParams(location.search).get(key) === 'workbench'))
  const islandUrl = useRef(workbench ? '/' : location.pathname + location.search + location.hash)
  function switchSurface(next: boolean) {
    if (next === workbench) return
    if (next) islandUrl.current = location.pathname + location.search + location.hash
    history.pushState(null, '', next ? '/workbench' : islandUrl.current)
    setWorkbench(next)
  }
  useEffect(() => {
    const onPopState = () => setWorkbench(location.pathname === '/workbench' || ['qcode', 'agent-isles'].some(key => new URLSearchParams(location.search).get(key) === 'workbench'))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const [composerTarget, setComposerTarget] = useState<HTMLDivElement | null>(null)
  const [previewTarget, setPreviewTarget] = useState<HTMLDivElement | null>(null)
  const [expandedWork, setExpandedWork] = useState(false)
  const iframe = useRef<HTMLIFrameElement | null>(null)
  const [worldBridge] = useState(() => new WorldBridgeSession(location.href, { stage: 'waiting', detail: t('world.waiting') }))
  const worldSnapshot = useSyncExternalStore(worldBridge.subscribe, worldBridge.getSnapshot)
  const { ready, playable, regions } = worldSnapshot
  const bindWorldFrame = useCallback((node: HTMLIFrameElement | null) => {
    iframe.current = node
    worldBridge.bindFrame(node?.contentWindow ?? null)
  }, [worldBridge])
  const [showModels, setShowModels] = useState(false)
  const [modelState, setModelState] = useState<{ ready: boolean | null; detail: string }>({ ready: null, detail: t('model.loading') })
  useEffect(() => {
    if (showModels) return
    let active = true
    void props.models.load().then(snapshot => {
      const provider = snapshot.providers.find(item => item.id === snapshot.selection.provider)
      const configured = snapshot.routable && (!provider || provider.credential.configured)
      if (active) setModelState({ ready: configured, detail: configured ? t('model.configured', { model: snapshot.selection.model }) : t('model.missing') })
    }).catch(() => { if (active) setModelState({ ready: false, detail: t('model.loadFailed') }) })
    return () => { active = false }
  }, [showModels, locale, t])
  const [selected, setSelected] = useState<ResidentId | null>(null)
  const [fileView, setFileView] = useState<'files' | 'changes' | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [guideView, setGuideView] = useState<'welcome' | 'records' | 'projects' | 'path' | 'residents' | 'options'>('welcome')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [, setNotificationCount] = useState(0)
  const projectMenu = useRef<HTMLDivElement>(null)
  const projectTrigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!projectMenuOpen) return
    const outside = (event: PointerEvent) => { if (!projectMenu.current?.contains(event.target as Node)) setProjectMenuOpen(false) }
    const blur = () => setProjectMenuOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('blur', blur)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('blur', blur) }
  }, [projectMenuOpen])
  const conversation = useRef<HTMLElement>(null)
  const [projectId, setProjectId] = useState<string | null>(() => {
    try { return readMigratedStorage(localStorage, PROJECT_KEY, [LEGACY_PROJECT_KEY]) }
    catch { return null }
  })
  const [path, setPath] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try { return readResidentDrafts(readMigratedStorage(localStorage, DRAFTS_KEY, [LEGACY_DRAFTS_KEY])) }
    catch { return {} }
  })
  const [draftStorageError, setDraftStorageError] = useState(false)
  useEffect(() => {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); setDraftStorageError(false) }
    catch { setDraftStorageError(true) }
  }, [drafts])
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const pickerAbort = useRef<AbortController>()
  const [error, setError] = useState('')
  const [bindingId, setBindingId] = useState<string>()
  const operation = useRef(0)
  const [, refreshEvents] = useState(0)
  const workspaceState = props.useWorkspaces(state => state)
  const workspaces = workspaceState.items
  const sessionState = props.useSessions(state => state)
  const pending = props.useSessionPendingInteraction(state => state)
  const workspace = workspaces.find(item => item.workspaceId === projectId)
  const tutorial = useTutorial(props.tutorials, workspace?.workspaceId, t)
  const [followingKeeper, setFollowingKeeper] = useState(false)
  const skipAutoProject = useRef(false)
  useEffect(() => {
    if (!workspace || document.fullscreenElement) return
    const enter = () => requestProjectFullscreen()
    window.addEventListener('pointerdown', enter, { capture: true, once: true })
    return () => window.removeEventListener('pointerdown', enter, true)
  }, [workspace?.workspaceId])
  useEffect(() => {
    let active = true
    setRestoring(true); setRestoreError('')
    void props.restoreProject().then(id => {
      if (active && id) setProjectId(id)
    }).catch(reason => { if (active) setRestoreError(String(reason.message ?? reason)) })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [restoreAttempt])
  const loadingProjects = restoring || workspaceState.phase !== 'ready' || sessionState.phase !== 'ready'
  const recoveryFailed = restoreError || (workspaceState.state === 'error' ? t('project.recoveryRequired') : '')
  useEffect(() => {
    if (!loadingProjects) return
    const timer = setTimeout(() => setRestoreError(t('error.restoreTimeout')), 15_000)
    return () => clearTimeout(timer)
  }, [loadingProjects, restoreAttempt])
  useEffect(() => {
    if (loadingProjects || recoveryFailed || !workspace) return
    void props.saveProject(workspace.workspaceId).catch(() => setRestoreError(t('error.saveRecovery')))
  }, [loadingProjects, workspace?.workspaceId])
  useEffect(() => {
    if (loadingProjects || recoveryFailed || projectId || skipAutoProject.current || workspaces.length !== 1) return
    useProject(workspaces[0]!.workspaceId)
  }, [loadingProjects, recoveryFailed, projectId, workspaces])
  const resident = residentCatalog.find(item => item.id === selected)
  const draftKey = `${projectId}:${selected}`
  const draft = drafts[draftKey] ?? ''
  const binding = bindingId ? props.getBinding(bindingId) : undefined
  const interaction = bindingId ? pending.get(bindingId as SessionId) : undefined
  const approval = interaction?.kind === 'approval' && 'answer' in interaction
    ? interaction as typeof interaction & { toolName: string; reason?: string; callId?: string; answer(decision: 'allowed-once' | 'rejected'): Promise<void> }
    : undefined
  const residentIds = residentCatalog.map(item => workspace ? props.sessionForResident(workspace.workspaceId, item.id) : undefined).filter((id): id is string => !!id)
  useEffect(() => {
    const unsubscribers = residentIds.flatMap(id => {
      const face = props.getBinding(id)
      return face ? [face.eventSource.subscribe(() => refreshEvents(value => value + 1)), face.session.subscribe(() => refreshEvents(value => value + 1))] : []
    })
    return () => unsubscribers.forEach(unsubscribe => unsubscribe())
  }, [residentIds.join('|')])
  const residents = residentCatalog.map(item => {
    const id = workspace ? props.sessionForResident(workspace.workspaceId, item.id) : undefined
    const summary = id ? sessionState.byId[id as SessionId] : undefined
    const events = id ? props.getBinding(id)?.eventSource.getSnapshot().entries : undefined
    return { id: item.id, displayName: item.name, status: id && pending.has(id as SessionId) ? 'approval' as const : summary?.running ? 'working' as const : events ? residentEventStatus(events) : 'idle' as const }
  })

  function choose(id: ResidentId) {
    setFileView(null)
    setProjectMenuOpen(false)
    setShowModels(false)
    setGuideView('welcome')
    if (id === 'coder' && modelState.ready === false) { setShowModels(true); setError(t('model.connectFirst')); return }
    const next = workspace && !loadingProjects && !recoveryFailed || id === 'coordinator' || id === 'teacher' || id === 'file_keeper' ? id : 'coordinator'
    if (id === 'file_keeper' && followingKeeper) { setFollowingKeeper(false); moveKeeper('cancel') }
    if (next === selected) return
    ++operation.current
    setSelected(next)
    setError('')
  }

  async function enterLearning(run?: TutorialRun) {
    if (busy || tutorial.busy || !props.tutorials) return
    if (modelState.ready !== true) { setShowModels(true); setError(modelState.ready === null ? t('model.loading') : t('model.connectTutorial')); return }
    requestProjectFullscreen()
    setBusy(true); setError('')
    try {
      let next = run
      if (!next) next = await tutorial.command('start')
      else {
        if (next.paused) next = await props.tutorials.command('resume', next)
        if (next.left && !next.returned) next = await props.tutorials.command('returned', next)
        tutorial.accept(next)
      }
      tutorial.select(next.id)
      if (next.workspaceId) useProject(next.workspaceId)
      setSelected('coder'); setGuideView('welcome')
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }

  async function enterCreation() {
    if (busy) return
    requestProjectFullscreen()
    setBusy(true); setError('')
    try {
      moveKeeper('cancel'); setFollowingKeeper(false)
      setGuideView('welcome')
      closeConversation()
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setBusy(false) }
  }

  function closeConversation() {
    setHistoryOpen(false)
    setFileView(null)
    pickerAbort.current?.abort()
    ++operation.current
    setSelected(null)
    setBindingId(undefined)
    setShowModels(false)
    iframe.current?.focus()
  }

  useEffect(() => {
    if (playable && selected && !showModels) conversation.current?.focus({ preventScroll: true })
  }, [playable, selected, showModels, guideView, fileView])

  useEffect(() => {
    const ticket = ++operation.current
    setBindingId(undefined); setError(''); setBusy(false); setPicking(false)
    if (!workspace || !selected || selected === 'coordinator' || selected === 'teacher' || selected === 'file_keeper' || loadingProjects || recoveryFailed) return
    setBusy(true)
    void props.selectResident(selected, workspace.workspaceId).then(id => {
      if (ticket === operation.current) { props.focusSession(id); setBindingId(id) }
    }, reason => { if (ticket === operation.current) setError(String(reason.message ?? reason)) })
      .finally(() => { if (ticket === operation.current) setBusy(false) })
    return () => { ++operation.current }
  }, [selected, workspace?.workspaceId, loadingProjects, recoveryFailed])

  useEffect(() => () => { pickerAbort.current?.abort() }, [selected])

  useEffect(() => {
    const frame = document.querySelector<HTMLElement>('[data-shell-overlay]')?.parentElement
    if (!workbench) frame?.setAttribute('data-qcode-town', '')
    return () => { frame?.removeAttribute('data-qcode-town') }
  }, [workbench])
  useEffect(() => {
    if (!workbench && bindingId) props.focusSession(bindingId)
  }, [workbench, bindingId])

  useEffect(() => {
    return worldBridge.listen(window, message => {
      if (message.type === 'resident:selected') choose(message.payload.residentId)
    })
  }, [worldBridge, workspace, selected, loadingProjects, recoveryFailed, followingKeeper, tutorial.run?.id, tutorial.run?.paused])

  const worldState = JSON.stringify({ locale, workspace: workspace ? { workspaceId: workspace.workspaceId, title: workspace.title } : null, sessionId: bindingId ?? null, panelOpen: workbench || playable && (selected !== null || showModels), residents })
  useEffect(() => {
    worldBridge.initialize(JSON.parse(worldState))
  }, [ready, worldState])
  useEffect(() => {
    worldBridge.setLocale(locale)
  }, [ready, locale, worldBridge])

  function useProject(id: string) {
    setFileView(null)
    setProjectMenuOpen(false)
    skipAutoProject.current = false
    setGuideView('welcome')
    if (id === 'coder' && modelState.ready === false) { setShowModels(true); setError(t('model.connectFirst')); return }
    if (id === projectId) return
    ++operation.current
    setProjectId(id)
    try { localStorage.setItem(PROJECT_KEY, id) } catch { /* Current tab still owns the selection. */ }
    setBindingId(undefined); setError('')
  }

  async function bind(folder?: string) {
    if (busy || pickerAbort.current || folder !== undefined && !folder.trim()) return
    const ticket = operation.current
    const controller = new AbortController()
    pickerAbort.current = controller
    setBusy(true); setError('')
    try {
      if (folder === undefined) {
        setPicking(true)
        folder = await props.pickDirectory(controller.signal) ?? undefined
        if (ticket === operation.current) setPicking(false)
      }
      if (controller.signal.aborted) return
      if (folder && ticket === operation.current) {
        const id = await props.bindWorkspace(folder)
        if (ticket === operation.current) { setBusy(false); useProject(id); setPath(folder); setGuideView('welcome') }
      }
    } catch (reason) { if (ticket === operation.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)) }
    finally {
      if (pickerAbort.current === controller) pickerAbort.current = undefined
      if (ticket === operation.current) { setBusy(false); setPicking(false) }
    }
  }

  async function send(text: string, clearDraft = true) {
    if (!workspace || !selected || selected === 'coordinator' || busy || !text.trim()) return
    if (selected === 'coder' && modelState.ready === false) { setShowModels(true); setError(t('model.connectFirst')); return }
    const ticket = operation.current
    const key = draftKey
    setBusy(true); setError('')
    try {
      await props.sendResidentPrompt(selected, workspace.workspaceId, text)
      if (clearDraft) setDrafts(value => value[key] === draft ? { ...value, [key]: '' } : value)
    } catch (reason) {
      if (ticket === operation.current) {
        if (reason instanceof ModelConfigurationRequired) setShowModels(true)
        setError(reason instanceof Error ? localizedModelError(reason, t) : String(reason))
      }
    }
    finally { if (ticket === operation.current) setBusy(false) }
  }

  function openWorldGuide() {
    worldBridge.showGuide()
  }

  function moveKeeper(action: 'arrive' | 'home' | 'cancel') {
    if (action === 'cancel') setFollowingKeeper(false)
    if (!tutorial.run) return
    worldBridge.moveKeeper(tutorial.run.id, action, matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (action === 'home') { setFollowingKeeper(true); closeConversation() }
  }
  useEffect(() => () => {
    worldBridge.resetKeeper()
  }, [tutorial.run?.id, workspace?.workspaceId])
  useEffect(() => {
    if (!tutorial.run || tutorial.run.paused || tutorial.run.step !== 'folder') {
      setFollowingKeeper(false)
      worldBridge.resetKeeper()
    }
  }, [tutorial.run?.id, tutorial.run?.paused, tutorial.run?.step, workspace?.workspaceId])
  const workOpen = playable && !showModels && !!resident && selected !== 'coordinator' && selected !== 'teacher' && selected !== 'file_keeper'
  const activeTutorial = tutorial.run && !tutorial.run.paused ? tutorial.run : undefined
  const tutorialSession = (selected === 'coder' ? bindingId ?? activeTutorial?.submission?.sessionId : activeTutorial?.submission?.sessionId) as SessionId | undefined
  const tutorialRunning = !!(tutorialSession && sessionState.byId[tutorialSession]?.running)
  const tutorialWaiting = !!(tutorialSession && pending.has(tutorialSession))
  const tutorialEntries = tutorialSession ? props.getBinding(tutorialSession)?.eventSource.getSnapshot().entries : undefined
  const tutorialStory = workNarrative({ run: activeTutorial, running: tutorialRunning, pending: tutorialWaiting, failed: tutorialEntries ? residentEventStatus(tutorialEntries) === 'failed' : false, finished: tutorialEntries ? residentEventStatus(tutorialEntries) === 'completed' : false }, t)
  const tutorialPanel = null

  return <>{workbench && <button className="town-return-island" onClick={() => switchSurface(false)}>← {t('world.return')}</button>}<div className="town-shell" style={workbench ? { display: 'none' } : undefined} onClickCapture={event => {
    const anchor = (event.target as Element).closest('a[href="/workbench"]')
    if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    switchSurface(true)
  }} data-workspace={workOpen ? expandedWork ? 'expanded' : 'open' : undefined} data-conversation={playable && resident && !showModels ? '' : undefined} data-regions-pending={regions.stage !== 'ready' ? '' : undefined}>
    {props.connectionState && <ConnectionNotice source={props.connectionState} t={t} />}
    <iframe ref={bindWorldFrame} src={worldBridge.url.href} title={t('world.title')} onLoad={() => worldBridge.frameLoaded()} />
    {!loadingProjects && !recoveryFailed && <ResidentNotifications t={t} hidden={workbench} onCount={setNotificationCount} sessions={workspaces.flatMap(project => project.sessionIds.flatMap(id => {
      const resident = props.residentForSession(project.workspaceId, id)
      const summary = sessionState.byId[id]
      const request = pending.get(id)
      if (!resident || !summary) return []
      return [{ id, projectId: project.workspaceId, projectName: project.title, resident, updatedAt: summary.updatedAt, running: summary.running, pending: request ? `${request.kind}:${'callId' in request ? String(request.callId) : ''}` : undefined } satisfies NotificationSession]
    }))} activeSession={!workbench && !showModels && selected && bindingId && binding?.session.getSnapshot().openState === 'open' ? bindingId : undefined} read={props.readRecentSession} open={item => {
      if (!workspaces.some(p => p.workspaceId === item.projectId && p.sessionIds.includes(item.id as SessionId)) || props.sessionForResident(item.projectId, item.resident) !== item.id) { setError(t('project.unavailable')); return }
      switchSurface(false); useProject(item.projectId); setShowModels(false); setSelected(item.resident); setProjectMenuOpen(false)
    }} />}
    {playable && <>
    {!selected && !showModels && <nav className="town-work-entry" aria-label={t('project.workAria')}>
      <div className="town-project-menu" ref={projectMenu} onKeyDown={event => {
        if (event.key === 'Escape' && projectMenuOpen) { event.preventDefault(); event.stopPropagation(); setProjectMenuOpen(false); projectTrigger.current?.focus() }
      }} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setProjectMenuOpen(false) }}>
        <button className="town-project-trigger" ref={projectTrigger} title={workspace?.path ?? t('project.choose')} aria-expanded={projectMenuOpen} aria-controls="town-project-list" onClick={() => setProjectMenuOpen(value => !value)}><img src={resourcePath("/qcode/brand/favicon-32x32.png")} alt="" /><span>{loadingProjects ? t('project.restoring') : recoveryFailed ? t('project.recoveryRequired') : workspace?.title ?? t('project.choose')}</span><ChevronDown size={14} aria-hidden="true" /></button>
        {projectMenuOpen && <section id="town-project-list" className="town-project-list" aria-label={t('project.switch')}>
          <strong>{t('project.yours')}</strong>
          {workspace && <p className="town-project-location">{workspace.path}</p>}
          {loadingProjects ? <p role="status">{t('project.restoring')}</p> : recoveryFailed ? <><p role="alert">{recoveryFailed}</p><button onClick={() => setRestoreAttempt(value => value + 1)}>{t('project.retryRestore')}</button></> : <>
            <div className="town-project-items">{workspaces.length ? workspaces.map(item => <button key={item.workspaceId} aria-current={item.workspaceId === projectId ? 'true' : undefined} onClick={() => { useProject(item.workspaceId); projectTrigger.current?.focus() }}><span>{item.title}</span>{item.workspaceId === projectId && <small>{t('project.current')}</small>}</button>) : <p>{t('project.empty')}</p>}</div>
            <div className="town-project-actions">
              <button disabled={busy} onClick={() => { void bind() }}>{t('project.openExisting')}</button>
            </div>
          </>}
          {(error || tutorial.error) && <p role="alert">{error || tutorial.error}</p>}
        </section>}
      </div>
      <button className="town-journal-trigger" aria-label={t('journal.title')} title={t('journal.title')} onClick={() => { choose('coordinator'); setGuideView('records') }}><BookOpen size={21} aria-hidden="true" /></button>
    </nav>}
    {!selected && !showModels && <div className="town-help-reveal">
      <button type="button" aria-label={t('world.helpOpen')} title={t('world.help')} aria-haspopup="dialog" onClick={() => {
        ++operation.current; setSelected(null); setShowModels(false); openWorldGuide()
      }}>?</button>
    </div>}
    {!selected && !showModels && <div className="town-locale-control">
      <button type="button" {...{ popovertarget: 'town-language-menu' }} aria-label={t('language.choose')} title={t('language.choose')}><Languages size={19} /></button>
      <div id="town-language-menu" className="town-language-menu" {...{ popover: 'auto' }} aria-label={t('language.menu')}>
        <button type="button" aria-pressed={locale === 'zh'} onClick={() => props.localeState.setLocale('zh')}>中文</button>
        <button type="button" aria-pressed={locale === 'en'} onClick={() => props.localeState.setLocale('en')}>English</button>
      </div>
    </div>}
    {regions.stage !== 'ready' && <section className="town-regions" data-stage={regions.stage} aria-label={t('regions.status')}>
      <strong>{t('regions.name')}</strong>
      <p role={regions.stage === 'failed' ? 'alert' : 'status'}>{regions.detail}</p>
      {regions.stage === 'failed'
        ? <button type="button" onClick={() => {
          worldBridge.retryNeighbors(t('regions.reconnecting'))
        }}>{t('regions.reload')}</button>
        : <progress aria-label={t('regions.loading')} />}
    </section>}

    {showModels ? <ModelSettings actions={props.models} close={() => setShowModels(false)} t={t} /> : selected === 'teacher' && historyOpen && !workbench ? <NativeSidebar sessionId={sessionState.current} toggleSidebar={props.toggleSidebar} close={closeConversation} t={t} /> : selected === 'file_keeper' && fileView && workspace ? <ProjectFiles key={workspace.workspaceId} projectId={workspace.workspaceId} title={workspace.title} initialView={fileView} close={() => setFileView(null)} t={t} /> : resident && <aside ref={conversation} tabIndex={-1} className={`town-panel town-conversation${selected === 'file_keeper' ? ' town-keeper-dialogue' : ''}${workOpen ? ' town-studio' : ''}${selected === 'coordinator' && guideView === 'records' ? ' town-work-panel' : ''}${selected === 'coordinator' && guideView !== 'records' ? ' town-cinematic-dialogue' : ''}`} aria-label={guideView === 'records' ? t('journal.title') : resident.name} onKeyDown={event => {
      if (event.key === 'Escape') {
        const menu = conversation.current?.querySelector<HTMLElement>('.town-chat-menu:popover-open')
        if (menu) { event.preventDefault(); event.stopPropagation(); menu.hidePopover(); return }
        event.preventDefault(); closeConversation()
      }
    }}>
      {selected === 'coordinator' && guideView !== 'records' && <div className="town-cinematic-cast" aria-hidden="true"><img src={PLAYER_PORTRAIT} alt="" /><img src={RESIDENT_PORTRAITS.coordinator} alt="" /></div>}
      <header>{guideView !== 'records' && <img className="town-portrait" src={RESIDENT_PORTRAITS[resident.id]} alt="" />}<div className="town-resident-heading"><small>{guideView === 'records' ? workspace?.title ?? t('project.work') : selected === 'coordinator' ? t('project.manage') : selected === 'coder' ? t('resident.makeTogether') : selected === 'teacher' ? t('resident.history') : t('resident.files')}</small><h2>{guideView === 'records' ? t('journal.title') : resident.name.split(' · ')[0]}</h2></div>{workOpen && <div className="town-studio-toolbar"><span>{workspace?.title}</span><button type="button" {...{ popovertarget: 'town-work-options' }} onClick={event => {
        const box = event.currentTarget.getBoundingClientRect()
        const menu = document.getElementById('town-work-options')
        if (menu) { menu.style.top = `${box.bottom + 4}px`; menu.style.right = `${Math.max(8, window.innerWidth - box.right)}px` }
      }}>{t('project.options')}</button><nav id="town-work-options" className="town-chat-menu" {...{ popover: 'auto' }} aria-label={t('project.options')} onClick={event => {
        if ((event.target as Element).closest('button, a')) event.currentTarget.hidePopover()
      }}>
        <button onClick={() => setExpandedWork(value => !value)}>{expandedWork ? t('project.narrow') : t('project.expand')}</button>
        <button onClick={() => choose('coordinator')}>{t('project.manage')}</button>
        <button onClick={() => setShowModels(true)}>{t('model.settings')}</button>
        <a href="/workbench">{t('project.logs')}</a>
        <small>{t('project.position', { path: workspace?.path ?? '' })}</small>
      </nav></div>}<button type="button" title={t('world.returnTitle')} aria-label={t('world.return')} onClick={closeConversation}>{t('world.returnButton')}</button></header>
      <div className="town-conversation-body">
      {selected === 'coordinator' ? <>
        {tutorial.error && <p role="alert">{tutorial.error}<button onClick={() => void tutorial.reload()}>{t('journal.retry')}</button></p>}
        {(guideView === 'welcome' || guideView === 'records') && <>
          {loadingProjects && !recoveryFailed ? <p role="status">{t('journal.restore')}</p> : recoveryFailed ? <div role="alert"><p>{recoveryFailed}</p><button onClick={() => { setRestoreAttempt(value => value + 1) }}>{t('project.retryRestore')}</button><button onClick={() => window.location.reload()}>{t('common.reconnect')}</button></div> : <>
          {!workspace && projectId && <p role="alert">{t('project.previousMissing')}</p>}
          {guideView === 'records' && <div className="town-handbook">
            <section><img src={RESIDENT_PORTRAITS.coder} alt="" /><div><h3>{t('journal.freeCreation')}</h3><p>{t('journal.freeCreationHint')}</p><button disabled={busy} onClick={() => void enterCreation()}>{t('journal.startCreation')}</button></div></section>
          </div>}
          {guideView === 'welcome' && <><p className="town-dialogue-line">{workspace ? t('guide.welcomeProject', { name: workspace.title }) : t('guide.welcome')}</p>
          <div className="town-dialogue-choices">
            {!workspace ? <button className="town-primary" onClick={() => setGuideView('projects')}>{t('guide.makeSomething')}</button> : !modelState.ready ? <button className="town-primary" disabled={modelState.ready === null} onClick={() => setShowModels(true)}>{modelState.ready === null ? t('guide.preparing') : t('guide.connectModel')}</button> : <button className="town-primary" onClick={() => choose('coder')}>{t('guide.talkQ')}</button>}
            <button onClick={closeConversation}>{t('guide.explore')}</button>
            <button onClick={() => setGuideView('residents')}>{t('guide.meetResidents')}</button>
          </div></>}
          </>}
        </>}
        {guideView === 'projects' && <>
          <p className="town-dialogue-line">{t('guide.projectQuestion')}</p>
          <div className="town-dialogue-choices"><button className="town-primary" disabled={busy} onClick={() => { void bind() }}>{t('guide.chooseFolder')}</button><button onClick={() => setGuideView('path')}>{t('guide.enterPath')}</button></div>
          {workspaces.length > 0 && <label className="town-project-select">{t('guide.existingProject')}<select value={workspace?.workspaceId ?? ''} disabled={busy} onChange={event => useProject(event.target.value)}><option value="" disabled>{t('project.choose')}</option>{workspaces.map(item => <option key={item.workspaceId} value={item.workspaceId}>{item.title}</option>)}</select></label>}
        </>}
        {guideView === 'path' && <>
          <p className="town-dialogue-line">{t('guide.pathPrompt')}</p>
          <form onSubmit={event => { event.preventDefault(); void bind(path.trim()) }}><label htmlFor="town-folder">{t('guide.folderPath')}</label><input id="town-folder" value={path} onChange={event => setPath(event.target.value)} placeholder="D:\Projects\MyProject" /><button disabled={busy || !path.trim()}>{t('guide.settleHere')}</button></form>
        </>}
        {guideView === 'residents' && <><p className="town-dialogue-line">{t('guide.residents')}</p><div className="town-dialogue-choices">{residentCatalog.filter(item => item.id !== 'coordinator').map(item => {
          const id = workspace ? props.sessionForResident(workspace.workspaceId, item.id) : undefined
          const summary = id ? sessionState.byId[id as SessionId] : undefined
          const savedDraft = workspace ? drafts[`${workspace.workspaceId}:${item.id}`] : undefined
          const continuing = !!savedDraft || !!summary && !summary.blank
          return <button key={item.id} onClick={() => choose(item.id)}>{continuing ? t('guide.continueResident', { name: item.name.split(' · ')[0] }) : item.id === 'coder' ? t('guide.findCoder') : item.id === 'teacher' ? t('guide.findTeacher') : t('guide.findKeeper')}{continuing && <small>{savedDraft ? t('guide.hasDraft') : summary?.running ? t('guide.working') : t('guide.continueConversation')}</small>}</button>
        })}</div></>}
        {guideView === 'options' && <><p className="town-dialogue-line">{t('guide.moreHelp')}</p><nav className="town-dialogue-choices" aria-label={t('guide.settingsAria')}><button onClick={() => setGuideView('projects')}>{t('project.manage')}</button><button onClick={() => setShowModels(true)}>{t('model.settings')}</button><button aria-haspopup="dialog" onClick={() => { closeConversation(); openWorldGuide() }}>{t('world.help')}</button><a href="/workbench">{t('guide.advancedWorkbench')}</a></nav></>}
        <footer className="town-dialogue-footer">{guideView === 'welcome' ? <><button className="town-text-action" onClick={() => setGuideView('projects')}>{workspace ? t('guide.changeProject') : t('guide.existingOrPath')}</button><button className="town-text-action" onClick={() => setGuideView('options')}>{t('guide.oneMoreThing')}</button></> : <button className="town-text-action" onClick={() => { setGuideView('welcome'); setError('') }}>{t('guide.back')}</button>}</footer>
      </> : selected === 'teacher' ? <>
        <p className="town-dialogue-line">{resident.greeting}</p>
        <div className="town-dialogue-choices">
          <button onClick={() => { choose('coordinator'); setGuideView('projects') }}>{workspace ? t('resident.chooseOrSwitch') : t('project.choose')}</button>
          <button onClick={() => setHistoryOpen(true)}>{t('resident.teacher.action')}</button>
          <button onClick={closeConversation}>{t('common.nextTime')}</button>
        </div>
      </> : selected === 'file_keeper' ? <>
        {tutorial.run && !tutorial.run.paused && tutorial.run.step === 'folder' ? tutorialPanel : <>
          <p className="town-dialogue-line">{workspace ? t('file.projectPrompt', { name: workspace.title }) : t('file.chooseProjectFirst')}</p>
          <div className="town-dialogue-choices">
            {workspace && !loadingProjects && !recoveryFailed && <><button onClick={() => setFileView('files')}>{t('resident.browseFiles')}</button><button onClick={() => setFileView('changes')}>{t('resident.viewChanges')}</button></>}
            <button onClick={() => { choose('coordinator'); setGuideView('projects') }}>{workspace ? t('guide.changeProject') : t('project.choose')}</button>
            <button onClick={closeConversation}>{t('common.nextTime')}</button>
          </div>
          {workspace && props.sessionForResident(workspace.workspaceId, 'file_keeper') && <footer className="town-dialogue-footer"><button className="town-text-action" onClick={() => {
            const id = props.sessionForResident(workspace.workspaceId, 'file_keeper')
            if (id) { props.focusSession(id); switchSurface(true) }
          }}>{t('resident.viewHistory')}</button></footer>}
        </>}
      </> : <>
        {!tutorialPanel && !workOpen && <p className="town-dialogue-line">{resident.greeting}</p>}

        {!workOpen && <details className="town-path"><summary>{t('dialogue.currentProject', { name: workspace?.title ?? '' })}</summary><p>{workspace?.path}</p></details>}
        {interaction && <div className="town-approval" role="status"><strong>{t('dialogue.confirmation')}</strong>{approval ? <>
          {tutorialPanel && <p>{t('dialogue.approvalHint')}</p>}<p>{approval.toolName}：{approval.reason ?? t('dialogue.approvalFallback')}</p>
          <pre>{binding && projectResidentEvents(binding.eventSource.getSnapshot().entries).tools.find(tool => tool.key === approval.callId)?.arguments}</pre>
          <button onClick={() => { void approval.answer('allowed-once').catch(reason => setError(String(reason))) }}>{t('dialogue.allowOnce')}</button>
          <button onClick={() => { void approval.answer('rejected').catch(reason => setError(String(reason))) }}>{t('dialogue.reject')}</button>
        </> : <p>{t('dialogue.waiting')}</p>}<a href="/workbench">{t('dialogue.fullRequest')}</a></div>}
        {binding && <SessionResult key={bindingId} binding={binding} name={resident.name.split(' · ')[0]} project={workspace?.title} run={selected === 'coder' && tutorial.run && !tutorial.run.paused ? tutorial.run : undefined} waiting={!!interaction} t={t} />}
        {tutorialPanel && (workOpen && bindingId ? <details className="town-course-disclosure"><summary>{t('dialogue.courseProgress')}</summary>{tutorialPanel}</details> : tutorialPanel)}
        {!workOpen && <nav className="town-guide-tools" aria-label={t('dialogue.nav')}><button onClick={() => choose('coordinator')}>{t('project.manage')}</button><button onClick={() => setShowModels(true)}>{t('model.settings')}</button></nav>}
        {!bindingId && (!tutorialPanel || tutorial.run?.paused || tutorial.run?.step === 'complete') && composerTarget && createPortal(<form onSubmit={event => { event.preventDefault(); void send(draft) }}>
          <label htmlFor="town-request">{selected === 'coder' ? t('dialogue.requestCoder') : t('dialogue.requestFile')}</label>
          <textarea id="town-request" rows={3} value={draft} disabled={busy} placeholder={selected === 'coder' ? t('dialogue.example') : undefined} onChange={event => setDrafts(value => ({ ...value, [draftKey]: event.target.value }))} />
          {draft && <small>{draftStorageError ? t('dialogue.draftTemporary') : t('dialogue.draftSaved')}</small>}
          <button title={binding?.session.getSnapshot().running ? t('dialogue.queueTitle') : resident.action} disabled={busy || !binding || !draft.trim()}>{busy ? t('dialogue.connecting') : t('dialogue.send')}</button>
        </form>, composerTarget)}
      </>}
      {picking ? <div><p role="status">{t('dialogue.waitingPicker')}</p><button onClick={() => pickerAbort.current?.abort()}>{t('common.cancel')}</button></div> : busy && <p role="status">{t('common.loading')}</p>}
      {error && <p role="alert">{error}</p>}
      </div>
      {workOpen && bindingId && !workbench && <NativeChat key={bindingId} sessionId={bindingId} t={t} />}
      <div className="town-composer" ref={setComposerTarget} />
      <div className="town-preview-pane" ref={setPreviewTarget} />
    </aside>}
    </>}
  </div></>
}
