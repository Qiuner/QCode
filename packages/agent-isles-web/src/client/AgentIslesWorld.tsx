import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BookOpen, ChevronDown, ArrowRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { WORLD_BRIDGE_VERSION, isWorldToHostMessage, worldFrameUrl, type ResidentId, type RegionLoadState } from './world-bridge.js'
import { RESIDENTS, projectResidentEvents, readResidentDrafts, residentEventStatus } from './resident-model.js'
import { ModelSettings } from './ModelSettings.js'
import { ModelConfigurationRequired, type ModelSettingsActions } from './model-settings.js'
import { RESIDENT_PORTRAITS } from './resident-portraits.js'
import { TutorialPanel, useTutorial } from './Tutorial.js'
import { NativeChat } from './NativeChat.js'
import { NativeSidebar } from './NativeSidebar.js'
import { ProjectFiles } from './ProjectFiles.js'
import { workNarrative } from './work-narrative.js'
import { ResidentNotifications, type NotificationSession } from './ResidentNotifications.js'
import { type TutorialActions, type TutorialRun } from '../tutorial-types.js'
import { requestProjectFullscreen } from './project-fullscreen.js'

export interface AgentIslesWorldInjected {
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

type Props = PropsRuntime<'shell.overlay'> & AgentIslesWorldInjected
function ConnectionNotice({ source }: { source: NonNullable<AgentIslesWorldInjected['connectionState']> }) {
  const state = useSyncExternalStore(source.subscribe, source.getSnapshot)
  if (state === 'connected' || state === undefined) return null
  return <div className="town-connection-notice" role="status">连接断开，正在重连。已提交的任务不会自动重发。</div>
}
const PROJECT_KEY = 'agent-isles.active-workspace.v1'
const DRAFTS_KEY = 'agent-isles.resident-drafts.v1'

function SessionResult({ binding, name, project, run, waiting }: { binding: SessionBinding; name: string; project?: string; run?: TutorialRun; waiting: boolean }) {
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
  const narrative = workNarrative({ run, loading: state.openState === 'loading', running: state.running || state.awaitingFirstTurn, pending: waiting, failed: !!(state.openError || state.promptError || state.lastAgentError) || result.status === 'failed', finished: result.status === 'completed' })
  return <div className="town-results">
    <span className="town-session-status" role="status" title={narrative.text}>{state.awaitingFirstTurn ? '任务已接收，等待开始…' : narrative.title}</span>
    {completedNotice && <div className="town-completion-notice" role="status"><strong>{name} 已完成这一轮</strong><span>可以查看结果，或继续告诉它下一步怎么改。</span><button type="button" onClick={() => setCompletedNotice(false)}>知道了</button></div>}
    {state.queue.length > 0 && <p role="status">还有 {state.queue.length} 条消息等待处理。</p>}
    {(state.openError || state.promptError || state.lastAgentError) && <div role="alert"><p>这一步遇到了问题。请查看原因，再决定怎样继续。</p><details><summary>查看错误详情</summary><p>{state.openError?.message ?? state.promptError?.error.message ?? state.lastAgentError}</p></details></div>}
    {stopError && <p role="alert">{stopError}</p>}
    {state.running && <button type="button" onClick={() => { void binding.session.cancel().then(result => { if (!result.ok) setStopError(result.error.message) }, reason => setStopError(String(reason))) }}>停止本轮</button>}
  </div>
}

export function AgentIslesWorld(props: Props) {
  const [workbench, setWorkbench] = useState(() => location.pathname === '/workbench' || new URLSearchParams(location.search).get('agent-isles') === 'workbench')
  const islandUrl = useRef(workbench ? '/' : location.pathname + location.search + location.hash)
  function switchSurface(next: boolean) {
    if (next === workbench) return
    if (next) islandUrl.current = location.pathname + location.search + location.hash
    history.pushState(null, '', next ? '/workbench' : islandUrl.current)
    setWorkbench(next)
  }
  useEffect(() => {
    const onPopState = () => setWorkbench(location.pathname === '/workbench' || new URLSearchParams(location.search).get('agent-isles') === 'workbench')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const [composerTarget, setComposerTarget] = useState<HTMLDivElement | null>(null)
  const [previewTarget, setPreviewTarget] = useState<HTMLDivElement | null>(null)
  const [expandedWork, setExpandedWork] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  const [worldUrl] = useState(() => worldFrameUrl(location.href))
  const [ready, setReady] = useState(false)
  const [playable, setPlayable] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [modelState, setModelState] = useState<{ ready: boolean | null; detail: string }>({ ready: null, detail: '正在读取模型配置…' })
  useEffect(() => {
    if (showModels) return
    let active = true
    void props.models.load().then(snapshot => {
      const provider = snapshot.providers.find(item => item.id === snapshot.selection.provider)
      const configured = snapshot.routable && (!provider || provider.credential.configured)
      if (active) setModelState({ ready: configured, detail: configured ? `已配置 · ${snapshot.selection.model}` : '尚未配置，请先填写 API Key 并选择模型。' })
    }).catch(() => { if (active) setModelState({ ready: false, detail: '无法读取模型状态，请打开模型设置重试。' }) })
    return () => { active = false }
  }, [showModels])
  const [regions, setRegions] = useState<RegionLoadState>({ stage: 'waiting', detail: '等待主岛就绪' })
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
    try { return localStorage.getItem(PROJECT_KEY) }
    catch { return null }
  })
  const [path, setPath] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try { return readResidentDrafts(localStorage.getItem(DRAFTS_KEY)) }
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
  const tutorial = useTutorial(props.tutorials, workspace?.workspaceId)
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
  const recoveryFailed = restoreError || (workspaceState.state === 'error' ? '项目列表暂时无法读取，请重试。' : '')
  useEffect(() => {
    if (!loadingProjects) return
    const timer = setTimeout(() => setRestoreError('恢复超时，服务可能已断开。请重试或重新连接。'), 15_000)
    return () => clearTimeout(timer)
  }, [loadingProjects, restoreAttempt])
  useEffect(() => {
    if (loadingProjects || recoveryFailed || !workspace) return
    void props.saveProject(workspace.workspaceId).catch(() => setRestoreError('当前项目可使用，但恢复记录保存失败，请重试。'))
  }, [loadingProjects, workspace?.workspaceId])
  useEffect(() => {
    if (loadingProjects || recoveryFailed || projectId || skipAutoProject.current || workspaces.length !== 1) return
    useProject(workspaces[0]!.workspaceId)
  }, [loadingProjects, recoveryFailed, projectId, workspaces])
  const resident = RESIDENTS.find(item => item.id === selected)
  const draftKey = `${projectId}:${selected}`
  const draft = drafts[draftKey] ?? ''
  const binding = bindingId ? props.getBinding(bindingId) : undefined
  const interaction = bindingId ? pending.get(bindingId as SessionId) : undefined
  const approval = interaction?.kind === 'approval' && 'answer' in interaction
    ? interaction as typeof interaction & { toolName: string; reason?: string; callId?: string; answer(decision: 'allowed-once' | 'rejected'): Promise<void> }
    : undefined
  const residentIds = RESIDENTS.map(item => workspace ? props.sessionForResident(workspace.workspaceId, item.id) : undefined).filter((id): id is string => !!id)
  useEffect(() => {
    const unsubscribers = residentIds.flatMap(id => {
      const face = props.getBinding(id)
      return face ? [face.eventSource.subscribe(() => refreshEvents(value => value + 1)), face.session.subscribe(() => refreshEvents(value => value + 1))] : []
    })
    return () => unsubscribers.forEach(unsubscribe => unsubscribe())
  }, [residentIds.join('|')])
  const residents = RESIDENTS.map(item => {
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
    if (id === 'coder' && modelState.ready === false) { setShowModels(true); setError('先连接模型，Qiuner 才能开始制作。'); return }
    const next = workspace && !loadingProjects && !recoveryFailed || id === 'coordinator' || id === 'teacher' || id === 'file_keeper' ? id : 'coordinator'
    if (id === 'file_keeper' && followingKeeper) { setFollowingKeeper(false); moveKeeper('cancel') }
    if (next === selected) return
    ++operation.current
    setSelected(next)
    setError('')
  }

  async function enterLearning(run?: TutorialRun) {
    if (busy || tutorial.busy || !props.tutorials) return
    if (modelState.ready !== true) { setShowModels(true); setError(modelState.ready === null ? '正在读取模型配置…' : '先连接模型，Qiuner 才能带你完成第一个作品。'); return }
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
    if (!workbench) frame?.setAttribute('data-agent-isles-town', '')
    return () => { frame?.removeAttribute('data-agent-isles-town') }
  }, [workbench])
  useEffect(() => {
    if (!workbench && bindingId) props.focusSession(bindingId)
  }, [workbench, bindingId])

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== worldUrl.origin || event.source !== iframe.current?.contentWindow || !isWorldToHostMessage(event.data)) return
      if (event.data.type === 'world:ready') { setReady(true); setPlayable(false) }
      if (event.data.type === 'world:playable') setPlayable(true)
      if (event.data.type === 'world:regions') setRegions(event.data.payload)
      if (event.data.type === 'resident:selected') choose(event.data.payload.residentId)
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [workspace, selected, loadingProjects, recoveryFailed, followingKeeper, tutorial.run?.id, tutorial.run?.paused])

  const worldState = JSON.stringify({ workspace: workspace ? { workspaceId: workspace.workspaceId, title: workspace.title } : null, sessionId: bindingId ?? null, panelOpen: workbench || playable && (selected !== null || showModels), residents })
  useEffect(() => {
    if (!ready) return
    iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'world:init', payload: JSON.parse(worldState) }, worldUrl.origin)
  }, [ready, worldState])

  function useProject(id: string) {
    setFileView(null)
    setProjectMenuOpen(false)
    skipAutoProject.current = false
    setGuideView('welcome')
    if (id === 'coder' && modelState.ready === false) { setShowModels(true); setError('先连接模型，Qiuner 才能开始制作。'); return }
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
    if (selected === 'coder' && modelState.ready === false) { setShowModels(true); setError('先连接模型，Qiuner 才能开始制作。'); return }
    const ticket = operation.current
    const key = draftKey
    setBusy(true); setError('')
    try {
      await props.sendResidentPrompt(selected, workspace.workspaceId, text)
      if (clearDraft) setDrafts(value => value[key] === draft ? { ...value, [key]: '' } : value)
    } catch (reason) {
      if (ticket === operation.current) {
        if (reason instanceof ModelConfigurationRequired) setShowModels(true)
        setError(reason instanceof Error ? reason.message : String(reason))
      }
    }
    finally { if (ticket === operation.current) setBusy(false) }
  }

  function openWorldGuide() {
    iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'world:show-guide' }, worldUrl.origin)
  }

  function moveKeeper(action: 'arrive' | 'home' | 'cancel') {
    if (action === 'cancel') setFollowingKeeper(false)
    if (!tutorial.run) return
    iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'tutorial:keeper', payload: { encounterId: tutorial.run.id, action, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches } }, worldUrl.origin)
    if (action === 'home') { setFollowingKeeper(true); closeConversation() }
  }
  useEffect(() => () => {
    iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'tutorial:keeper', payload: { encounterId: 'reset', action: 'cancel', reducedMotion: true } }, worldUrl.origin)
  }, [tutorial.run?.id, workspace?.workspaceId])
  useEffect(() => {
    if (!tutorial.run || tutorial.run.paused || tutorial.run.step !== 'folder') {
      setFollowingKeeper(false)
      iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'tutorial:keeper', payload: { encounterId: 'reset', action: 'cancel', reducedMotion: true } }, worldUrl.origin)
    }
  }, [tutorial.run?.id, tutorial.run?.paused, tutorial.run?.step, workspace?.workspaceId])
  const workOpen = playable && !showModels && !!resident && selected !== 'coordinator' && selected !== 'teacher' && selected !== 'file_keeper'
  const activeTutorial = tutorial.run && !tutorial.run.paused ? tutorial.run : undefined
  const tutorialSession = (selected === 'coder' ? bindingId ?? activeTutorial?.submission?.sessionId : activeTutorial?.submission?.sessionId) as SessionId | undefined
  const tutorialRunning = !!(tutorialSession && sessionState.byId[tutorialSession]?.running)
  const tutorialWaiting = !!(tutorialSession && pending.has(tutorialSession))
  const tutorialEntries = tutorialSession ? props.getBinding(tutorialSession)?.eventSource.getSnapshot().entries : undefined
  const tutorialStory = workNarrative({ run: activeTutorial, running: tutorialRunning, pending: tutorialWaiting, failed: tutorialEntries ? residentEventStatus(tutorialEntries) === 'failed' : false, finished: tutorialEntries ? residentEventStatus(tutorialEntries) === 'completed' : false })
  const tutorialPanel = null

  return <>{workbench && <button className="town-return-island" onClick={() => switchSurface(false)}>← 返回小岛</button>}<div className="town-shell" style={workbench ? { display: 'none' } : undefined} onClickCapture={event => {
    const anchor = (event.target as Element).closest('a[href="/workbench"]')
    if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    switchSurface(true)
  }} data-workspace={workOpen ? expandedWork ? 'expanded' : 'open' : undefined} data-conversation={playable && resident && !showModels ? '' : undefined} data-regions-pending={regions.stage !== 'ready' ? '' : undefined}>
    {props.connectionState && <ConnectionNotice source={props.connectionState} />}
    <iframe ref={iframe} src={worldUrl.href} title="agent-isles 小镇" onLoad={() => setReady(true)} />
    {!loadingProjects && !recoveryFailed && <ResidentNotifications hidden={workbench} onCount={setNotificationCount} sessions={workspaces.flatMap(project => project.sessionIds.flatMap(id => {
      const resident = props.residentForSession(project.workspaceId, id)
      const summary = sessionState.byId[id]
      const request = pending.get(id)
      if (!resident || !summary) return []
      return [{ id, projectId: project.workspaceId, projectName: project.title, resident, updatedAt: summary.updatedAt, running: summary.running, pending: request ? `${request.kind}:${'callId' in request ? String(request.callId) : ''}` : undefined } satisfies NotificationSession]
    }))} activeSession={!workbench && !showModels && selected && bindingId && binding?.session.getSnapshot().openState === 'open' ? bindingId : undefined} read={props.readRecentSession} open={item => {
      if (!workspaces.some(p => p.workspaceId === item.projectId && p.sessionIds.includes(item.id as SessionId)) || props.sessionForResident(item.projectId, item.resident) !== item.id) { setError('原会话已不可用，请从创作手册检查。'); return }
      switchSurface(false); useProject(item.projectId); setShowModels(false); setSelected(item.resident); setProjectMenuOpen(false)
    }} />}
    {playable && <>
    {!selected && !showModels && <nav className="town-work-entry" aria-label="项目与工作">
      <div className="town-project-menu" ref={projectMenu} onKeyDown={event => {
        if (event.key === 'Escape' && projectMenuOpen) { event.preventDefault(); event.stopPropagation(); setProjectMenuOpen(false); projectTrigger.current?.focus() }
      }} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setProjectMenuOpen(false) }}>
        <button className="town-project-trigger" ref={projectTrigger} title={workspace?.path ?? '选择项目'} aria-expanded={projectMenuOpen} aria-controls="town-project-list" onClick={() => setProjectMenuOpen(value => !value)}><img src="/agent-isles/brand/favicon-32x32.png" alt="" /><span>{loadingProjects ? '正在恢复项目…' : recoveryFailed ? '项目恢复需要处理' : workspace?.title ?? '选择项目'}</span><ChevronDown size={14} aria-hidden="true" /></button>
        {projectMenuOpen && <section id="town-project-list" className="town-project-list" aria-label="切换项目">
          <strong>你的项目</strong>
          {workspace && <p className="town-project-location">{workspace.path}</p>}
          {loadingProjects ? <p role="status">正在恢复项目…</p> : recoveryFailed ? <><p role="alert">{recoveryFailed}</p><button onClick={() => setRestoreAttempt(value => value + 1)}>重试恢复</button></> : <>
            <div className="town-project-items">{workspaces.length ? workspaces.map(item => <button key={item.workspaceId} aria-current={item.workspaceId === projectId ? 'true' : undefined} onClick={() => { useProject(item.workspaceId); projectTrigger.current?.focus() }}><span>{item.title}</span>{item.workspaceId === projectId && <small>当前</small>}</button>) : <p>还没有项目，从一个想法开始吧。</p>}</div>
            <div className="town-project-actions">
              <button disabled={busy} onClick={() => { void bind() }}>打开已有项目…</button>
            </div>
          </>}
          {(error || tutorial.error) && <p role="alert">{error || tutorial.error}</p>}
        </section>}
      </div>
      <button className="town-journal-trigger" aria-label="创作手册" title="创作手册" onClick={() => { choose('coordinator'); setGuideView('records') }}><BookOpen size={21} aria-hidden="true" /></button>
    </nav>}
    {!selected && !showModels && <div className="town-help-reveal">
      <button type="button" aria-label="打开操作帮助" title="操作帮助" aria-haspopup="dialog" onClick={() => {
        ++operation.current; setSelected(null); setShowModels(false); openWorldGuide()
      }}>?</button>
    </div>}
    {regions.stage !== 'ready' && <section className="town-regions" data-stage={regions.stage} aria-label="区域加载状态">
      <strong>溪间庭院 · 晴沙绿洲</strong>
      <p role={regions.stage === 'failed' ? 'alert' : 'status'}>{regions.detail}</p>
      {regions.stage === 'failed'
        ? <button type="button" onClick={() => {
          setRegions({ stage: 'downloading', detail: '正在重新连接…' })
          iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'world:retry-neighbors' }, worldUrl.origin)
        }}>重新加载区域</button>
        : <progress aria-label="邻近区域正在加载" />}
    </section>}

    {showModels ? <ModelSettings actions={props.models} close={() => setShowModels(false)} /> : selected === 'teacher' && historyOpen && !workbench ? <NativeSidebar sessionId={sessionState.current} toggleSidebar={props.toggleSidebar} close={closeConversation} /> : selected === 'file_keeper' && fileView && workspace ? <ProjectFiles key={workspace.workspaceId} projectId={workspace.workspaceId} title={workspace.title} initialView={fileView} close={() => setFileView(null)} /> : resident && <aside ref={conversation} tabIndex={-1} className={`town-panel town-conversation${selected === 'file_keeper' ? ' town-keeper-dialogue' : ''}${workOpen ? ' town-studio' : ''}${selected === 'coordinator' && guideView === 'records' ? ' town-work-panel' : ''}`} aria-label={guideView === 'records' ? '创作手册' : resident.name} onKeyDown={event => {
      if (event.key === 'Escape') {
        const menu = conversation.current?.querySelector<HTMLElement>('.town-chat-menu:popover-open')
        if (menu) { event.preventDefault(); event.stopPropagation(); menu.hidePopover(); return }
        event.preventDefault(); closeConversation()
      }
    }}>
      <header>{guideView !== 'records' && <img className="town-portrait" src={RESIDENT_PORTRAITS[resident.id]} alt="" />}<div className="town-resident-heading"><small>{guideView === 'records' ? workspace?.title ?? '项目工作' : selected === 'coordinator' ? '小镇接待' : selected === 'coder' ? '和你一起做作品' : selected === 'teacher' ? '项目与历史对话' : '查阅文件'}</small><h2>{guideView === 'records' ? '创作手册' : resident.name.split(' · ')[0]}</h2></div>{workOpen && <div className="town-studio-toolbar"><span>{workspace?.title}</span><button type="button" {...{ popovertarget: 'town-work-options' }} onClick={event => {
        const box = event.currentTarget.getBoundingClientRect()
        const menu = document.getElementById('town-work-options')
        if (menu) { menu.style.top = `${box.bottom + 4}px`; menu.style.right = `${Math.max(8, window.innerWidth - box.right)}px` }
      }}>作品选项</button><nav id="town-work-options" className="town-chat-menu" {...{ popover: 'auto' }} aria-label="作品选项" onClick={event => {
        if ((event.target as Element).closest('button, a')) event.currentTarget.hidePopover()
      }}>
        <button onClick={() => setExpandedWork(value => !value)}>{expandedWork ? '收窄工作区' : '展开工作区'}</button>
        <button onClick={() => choose('coordinator')}>返回向导</button>
        <button onClick={() => setShowModels(true)}>模型设置</button>
        <a href="/workbench">会话日志与轨迹 ↗</a>
        <small>项目位置：{workspace?.path}</small>
      </nav></div>}<button type="button" title="回到小岛，正在进行的任务会继续" aria-label="回到小岛" onClick={closeConversation}>回到小岛 ×</button></header>
      <div className="town-conversation-body">
      {selected === 'coordinator' ? <>
        {tutorial.error && <p role="alert">{tutorial.error}<button onClick={() => void tutorial.reload()}>重试读取教程</button></p>}
        {(guideView === 'welcome' || guideView === 'records') && <>
          {loadingProjects && !recoveryFailed ? <p role="status">正在恢复项目和创作手册…</p> : recoveryFailed ? <div role="alert"><p>{recoveryFailed}</p><button onClick={() => { setRestoreAttempt(value => value + 1) }}>重试恢复</button><button onClick={() => window.location.reload()}>重新连接</button></div> : <>
          {!workspace && projectId && <p role="alert">上次项目已不在当前项目列表中，请选择已有项目或重新绑定。原会话不会被自动替换。</p>}
          {guideView === 'records' && <div className="town-handbook">
            <section><img src={RESIDENT_PORTRAITS.coder} alt="" /><div><h3>自由创作</h3><p>带上自己的想法或已有项目，和 Qiuner 一起制作，按自己的节奏探索和修改。</p><button disabled={busy} onClick={() => void enterCreation()}>开始创作</button></div></section>
          </div>}
          {guideView === 'welcome' && <><p className="town-dialogue-line">{workspace ? `你正在项目「${workspace.title}」里，要继续和Qiuner制作吗？` : '欢迎来到小岛。想做点什么，或先认识这里？'}</p>
          <div className="town-dialogue-choices">
            {!workspace ? <button className="town-primary" onClick={() => setGuideView('projects')}>我想做一个东西</button> : !modelState.ready ? <button className="town-primary" disabled={modelState.ready === null} onClick={() => setShowModels(true)}>{modelState.ready === null ? '正在准备…' : '连接模型，开始制作'}</button> : <button className="town-primary" onClick={() => choose('coder')}>找Qiuner聊聊</button>}
            <button onClick={closeConversation}>先逛逛</button>
            <button onClick={() => setGuideView('residents')}>带我认识这里</button>
          </div></>}
          </>}
        </>}
        {guideView === 'projects' && <>
          <p className="town-dialogue-line">这次要安顿一个新项目，还是继续之前的？</p>
          <div className="town-dialogue-choices"><button className="town-primary" disabled={busy} onClick={() => { void bind() }}>选择文件夹</button><button onClick={() => setGuideView('path')}>输入文件夹路径</button></div>
          {workspaces.length > 0 && <label className="town-project-select">已有项目<select value={workspace?.workspaceId ?? ''} disabled={busy} onChange={event => useProject(event.target.value)}><option value="" disabled>选择项目</option>{workspaces.map(item => <option key={item.workspaceId} value={item.workspaceId}>{item.title}</option>)}</select></label>}
        </>}
        {guideView === 'path' && <>
          <p className="town-dialogue-line">把项目文件夹的路径告诉我。</p>
          <form onSubmit={event => { event.preventDefault(); void bind(path.trim()) }}><label htmlFor="town-folder">文件夹路径</label><input id="town-folder" value={path} onChange={event => setPath(event.target.value)} placeholder="D:\Projects\MyProject" /><button disabled={busy || !path.trim()}>安顿在这里</button></form>
        </>}
        {guideView === 'residents' && <><p className="town-dialogue-line">Qiuner帮你制作功能，苔伯帮你找回项目和对话，阿澜帮你查阅文件。靠近居民按 E 就能交谈。</p><div className="town-dialogue-choices">{RESIDENTS.filter(item => item.id !== 'coordinator').map(item => {
          const id = workspace ? props.sessionForResident(workspace.workspaceId, item.id) : undefined
          const summary = id ? sessionState.byId[id as SessionId] : undefined
          const savedDraft = workspace ? drafts[`${workspace.workspaceId}:${item.id}`] : undefined
          const continuing = !!savedDraft || !!summary && !summary.blank
          return <button key={item.id} onClick={() => choose(item.id)}>{continuing ? `继续找${item.name.split(' · ')[0]}` : item.id === 'coder' ? '找Qiuner制作功能' : item.id === 'teacher' ? '找苔伯管理项目与对话' : '找阿澜查看文件'}{continuing && <small>{savedDraft ? '有草稿' : summary?.running ? '正在工作' : '继续会话'}</small>}</button>
        })}</div></>}
        {guideView === 'options' && <><p className="town-dialogue-line">还有什么需要我帮忙的？</p><nav className="town-dialogue-choices" aria-label="小镇设置与帮助"><button onClick={() => setGuideView('projects')}>管理项目</button><button onClick={() => setShowModels(true)}>模型设置</button><button aria-haspopup="dialog" onClick={() => { closeConversation(); openWorldGuide() }}>操作帮助</button><a href="/workbench">高级工作台 ↗</a></nav></>}
        <footer className="town-dialogue-footer">{guideView === 'welcome' ? <><button className="town-text-action" onClick={() => setGuideView('projects')}>{workspace ? '更换项目' : '已有项目 / 输入路径'}</button><button className="town-text-action" onClick={() => setGuideView('options')}>还有件事…</button></> : <button className="town-text-action" onClick={() => { setGuideView('welcome'); setError('') }}>返回对话</button>}</footer>
      </> : selected === 'teacher' ? <>
        <p className="town-dialogue-line">{resident.greeting}</p>
        <div className="town-dialogue-choices">
          <button onClick={() => setHistoryOpen(true)}>查看项目与历史对话</button>
          <button onClick={closeConversation}>下次再来</button>
        </div>
      </> : selected === 'file_keeper' ? <>
        {tutorial.run && !tutorial.run.paused && tutorial.run.step === 'folder' ? tutorialPanel : <>
          <p className="town-dialogue-line">{workspace ? `「${workspace.title}」的文件都在这里。你想看看文件，还是最近的修改？` : '先选好项目，我就能带你看看里面的文件。'}</p>
          <div className="town-dialogue-choices">
            {workspace && !loadingProjects && !recoveryFailed && <><button onClick={() => setFileView('files')}>浏览文件</button><button onClick={() => setFileView('changes')}>查看修改</button></>}
            <button onClick={() => { choose('coordinator'); setGuideView('projects') }}>{workspace ? '更换项目' : '选择项目'}</button>
            <button onClick={closeConversation}>下次再来</button>
          </div>
          {workspace && props.sessionForResident(workspace.workspaceId, 'file_keeper') && <footer className="town-dialogue-footer"><button className="town-text-action" onClick={() => {
            const id = props.sessionForResident(workspace.workspaceId, 'file_keeper')
            if (id) { props.focusSession(id); switchSurface(true) }
          }}>查看以前的对话</button></footer>}
        </>}
      </> : <>
        {!tutorialPanel && !workOpen && <p className="town-dialogue-line">{resident.greeting}</p>}

        {!workOpen && <details className="town-path"><summary>当前项目：{workspace?.title}</summary><p>{workspace?.path}</p></details>}
        {interaction && <div className="town-approval" role="status"><strong>需要你的确认</strong>{approval ? <>
          {tutorialPanel && <p>Qiuner需要你决定是否执行下面的操作。请查看原因与具体内容；允许或拒绝都不会直接推进教程。拒绝后可以让Qiuner说明替代办法。</p>}<p>{approval.toolName}：{approval.reason ?? '本次工具调用需要批准'}</p>
          <pre>{binding && projectResidentEvents(binding.eventSource.getSnapshot().entries).tools.find(tool => tool.key === approval.callId)?.arguments}</pre>
          <button onClick={() => { void approval.answer('allowed-once').catch(reason => setError(String(reason))) }}>仅允许这一次</button>
          <button onClick={() => { void approval.answer('rejected').catch(reason => setError(String(reason))) }}>拒绝</button>
        </> : <p>居民正在等待补充信息。</p>}<a href="/workbench">查看完整请求 ↗</a></div>}
        {binding && <SessionResult key={bindingId} binding={binding} name={resident.name.split(' · ')[0]} project={workspace?.title} run={selected === 'coder' && tutorial.run && !tutorial.run.paused ? tutorial.run : undefined} waiting={!!interaction} />}
        {tutorialPanel && (workOpen && bindingId ? <details className="town-course-disclosure"><summary>首课进度</summary>{tutorialPanel}</details> : tutorialPanel)}
        {!workOpen && <nav className="town-guide-tools" aria-label="会话导航"><button onClick={() => choose('coordinator')}>返回向导</button><button onClick={() => setShowModels(true)}>模型设置</button></nav>}
        {!bindingId && (!tutorialPanel || tutorial.run?.paused || tutorial.run?.step === 'complete') && composerTarget && createPortal(<form onSubmit={event => { event.preventDefault(); void send(draft) }}>
          <label htmlFor="town-request">{selected === 'coder' ? '告诉Qiuner你的想法或想改的地方' : '文件相对路径'}</label>
          <textarea id="town-request" rows={3} value={draft} disabled={busy} placeholder={selected === 'coder' ? '例如：给首页加一个待办清单，可以添加和完成事项。请验证这两个操作。' : undefined} onChange={event => setDrafts(value => ({ ...value, [draftKey]: event.target.value }))} />
          {draft && <small>{draftStorageError ? '草稿暂时只能保留在当前页面，刷新前请复制保存。' : '草稿保存在此浏览器，回来可以继续填写。'}</small>}
          <button title={binding?.session.getSnapshot().running ? '发送补充（排队）' : resident.action} disabled={busy || !binding || !draft.trim()}>{busy ? '连接中' : '发送'}</button>
        </form>, composerTarget)}
      </>}
      {picking ? <div><p role="status">等待系统文件夹选择窗口…</p><button onClick={() => pickerAbort.current?.abort()}>取消选择</button></div> : busy && <p role="status">正在处理…</p>}
      {error && <p role="alert">{error}</p>}
      </div>
      {workOpen && bindingId && !workbench && <NativeChat key={bindingId} sessionId={bindingId} />}
      <div className="town-composer" ref={setComposerTarget} />
      <div className="town-preview-pane" ref={setPreviewTarget} />
    </aside>}
    </>}
  </div></>
}
