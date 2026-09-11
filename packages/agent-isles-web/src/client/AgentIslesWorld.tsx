import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
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

export interface AgentIslesWorldInjected {
  models: ModelSettingsActions
  residentForSession(workspaceId: string, sessionId: string): ResidentId | undefined
  sessionForResident(workspaceId: string, residentId: ResidentId): string | undefined
  selectResident(residentId: ResidentId, workspaceId: string): Promise<string>
  sendResidentPrompt(residentId: ResidentId, workspaceId: string, prompt: string): Promise<void>
  getBinding(id: string): SessionBinding | undefined
  focusSession(id: string): void
  pickDirectory(signal?: AbortSignal): Promise<string | null>
  bindWorkspace(path: string): Promise<string>
  restoreProject(): Promise<string | undefined>
  saveProject(projectId: string): Promise<void>
  readRecentSession(id: string, signal: AbortSignal): Promise<ReturnType<typeof projectResidentEvents>>
}

type Props = PropsRuntime<'shell.overlay'> & AgentIslesWorldInjected
const PROJECT_KEY = 'agent-isles.active-workspace.v1'
const DRAFTS_KEY = 'agent-isles.resident-drafts.v1'

function RecentWork({ id, updatedAt, running, read }: { id: string; updatedAt: number; running: boolean; read: AgentIslesWorldInjected['readRecentSession'] }) {
  const [recent, setRecent] = useState<Awaited<ReturnType<typeof read>>>()
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timer = setTimeout(() => controller.abort(), 10_000)
    setRecent(undefined); setError('')
    void read(id, controller.signal).then(value => { if (active) setRecent(value) })
      .catch(() => { if (active) setError('摘要暂不可用，请打开会话查看或重试。') })
      .finally(() => { clearTimeout(timer); controller.abort() })
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [id, updatedAt, running])
  if (error) return <small>{error}</small>
  if (!recent) return <small>正在读取最近任务…</small>
  const messages = [...recent.history, ...recent.messages]
  const request = messages.filter(item => item.role === 'user').at(-1)?.text
  const reply = messages.filter(item => item.role === 'assistant').at(-1)?.text
  return <>{request && <small>上次需求：{request.slice(0, 140)}</small>}{reply && <small>最近回复：{reply.slice(0, 140)}</small>}{!running && <small>{recent.status === 'working' ? '上次执行未记录结束，请检查后继续。' : recent.outcome || '打开会话查看完整记录'}{recent.status === 'completed' ? '，请检查成果与验证。' : ''}</small>}</>
}

function SessionResult({ binding }: { binding: SessionBinding }) {
  const [stopError, setStopError] = useState('')
  const state = useSyncExternalStore(binding.session.subscribe.bind(binding.session), binding.session.getSnapshot.bind(binding.session))
  const events = useSyncExternalStore(binding.eventSource.subscribe.bind(binding.eventSource), binding.eventSource.getSnapshot.bind(binding.eventSource))
  const result = useMemo(() => projectResidentEvents(events.entries), [events.entries])
  return <div className="town-results">
    <h3>本轮进展</h3>
    <p role="status">{state.openState === 'loading' ? '正在恢复会话…' : state.running ? '正在工作，你可以先回小镇，稍后再来查看。' : state.awaitingFirstTurn ? '任务已接收，等待开始…' : result.outcome || '等待你的想法'}</p>
    {state.queue.length > 0 && <p role="status">还有 {state.queue.length} 条消息等待处理。</p>}
    {(state.openError || state.promptError || state.lastAgentError) && <p role="alert">{state.openError?.message ?? state.promptError?.error.message ?? state.lastAgentError}</p>}
    {result.messages.map(message => <article key={message.key}><strong>{message.role === 'user' ? '你的请求' : '居民回复'}</strong><p>{message.text}</p></article>)}
    {result.live && <article>{result.live}</article>}
    {!state.running && result.status === 'completed' && <p>请查看回复中的修改和验证结果；有遗漏或新想法，可以在下方继续补充。</p>}
    {result.tools.length > 0 && <details><summary>执行记录 ({result.tools.length})</summary>{result.tools.map(tool => <details key={tool.key}><summary>{tool.name} · {tool.result === undefined ? '已请求' : tool.failed ? '执行失败' : '已返回结果'}</summary><pre>{tool.arguments}</pre>{tool.result !== undefined && <pre>{tool.result}</pre>}</details>)}</details>}
    {stopError && <p role="alert">{stopError}</p>}
    {state.running && <button type="button" onClick={() => { void binding.session.cancel().then(result => { if (!result.ok) setStopError(result.error.message) }, reason => setStopError(String(reason))) }}>停止本轮</button>}
    {state.hasMore && <button type="button" disabled={state.loadingOlder} onClick={() => { void binding.session.loadOlder() }}>更早的记录</button>}
    {result.history.length > 0 && <details><summary>之前的对话 ({result.history.length})</summary>{result.history.map(message => <article key={message.key}><strong>{message.role === 'user' ? '你的请求' : '居民回复'}</strong><p>{message.text}</p></article>)}</details>}
  </div>
}

export function AgentIslesWorld(props: Props) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [worldUrl] = useState(() => worldFrameUrl(location.href))
  const [ready, setReady] = useState(false)
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
  const [selected, setSelected] = useState<ResidentId | null>('coordinator')
  const [restoring, setRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [guideView, setGuideView] = useState<'welcome' | 'projects' | 'path' | 'residents' | 'options'>('welcome')
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
    if (loadingProjects || recoveryFailed || projectId || workspaces.length !== 1) return
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
    setShowModels(false)
    setGuideView('welcome')
    const next = workspace && !loadingProjects && !recoveryFailed || id === 'coordinator' ? id : 'coordinator'
    if (next === selected) return
    ++operation.current
    setSelected(next)
    setError('')
  }

  function closeConversation() {
    pickerAbort.current?.abort()
    ++operation.current
    setSelected(null)
    setShowModels(false)
    iframe.current?.focus()
  }

  useEffect(() => {
    if (selected && !showModels) conversation.current?.focus({ preventScroll: true })
  }, [selected, showModels, guideView])

  useEffect(() => {
    const ticket = ++operation.current
    setBindingId(undefined); setError(''); setBusy(false); setPicking(false)
    if (!workspace || !selected || selected === 'coordinator' || loadingProjects || recoveryFailed) return
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
    frame?.setAttribute('data-agent-isles-town', '')
    return () => { frame?.removeAttribute('data-agent-isles-town') }
  }, [])

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== worldUrl.origin || event.source !== iframe.current?.contentWindow || !isWorldToHostMessage(event.data)) return
      if (event.data.type === 'world:ready') setReady(true)
      if (event.data.type === 'world:regions') setRegions(event.data.payload)
      if (event.data.type === 'resident:selected') choose(event.data.payload.residentId)
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [workspace, selected, loadingProjects, recoveryFailed])

  const worldState = JSON.stringify({ workspace: workspace ? { workspaceId: workspace.workspaceId, title: workspace.title } : null, sessionId: bindingId ?? null, residents })
  useEffect(() => {
    if (!ready) return
    iframe.current?.contentWindow?.postMessage({ source: 'agent-isles-host', version: WORLD_BRIDGE_VERSION, type: 'world:init', payload: JSON.parse(worldState) }, worldUrl.origin)
  }, [ready, worldState])

  function useProject(id: string) {
    setGuideView('welcome')
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

  return <div className="town-shell" data-conversation={resident && !showModels ? '' : undefined} data-regions-pending={regions.stage !== 'ready' ? '' : undefined}>
    <iframe ref={iframe} src={worldUrl.href} title="agent-isles 小镇" onLoad={() => setReady(true)} />
    {!selected && !showModels && <button className="town-work-entry" onClick={() => choose('coordinator')}>{workspace ? `${workspace.title} · 工作记录` : '项目与工作记录'}</button>}
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
    {showModels ? <ModelSettings actions={props.models} close={() => setShowModels(false)} /> : resident && <aside ref={conversation} tabIndex={-1} className="town-panel town-conversation" aria-label={resident.name} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); closeConversation() }
    }}>
      <header><img className="town-portrait" src={RESIDENT_PORTRAITS[resident.id]} alt="" /><div><small>{selected === 'coordinator' ? '小镇接待' : selected === 'coder' ? '制作功能' : selected === 'teacher' ? '一起学习' : '查阅文件'}</small><h2>{resident.name.split(' · ')[0]}</h2></div><button type="button" title="关闭居民面板" aria-label="关闭居民面板" onClick={closeConversation}>×</button></header>
      <div className="town-conversation-body">
      {selected === 'coordinator' ? <>
        {guideView === 'welcome' && <>
          {loadingProjects && !recoveryFailed ? <p role="status">正在恢复项目和工作记录…</p> : recoveryFailed ? <div role="alert"><p>{recoveryFailed}</p><button onClick={() => { setRestoreAttempt(value => value + 1) }}>重试恢复</button><button onClick={() => window.location.reload()}>重新连接</button></div> : <>
          {!workspace && projectId && <p role="alert">上次项目已不在当前项目列表中，请选择已有项目或重新绑定。原会话不会被自动替换。</p>}
          {!workspace && workspaces.length > 0 && <section aria-label="已有项目"><h3>继续之前的项目</h3><div className="town-dialogue-choices">{workspaces.map(item => <button key={item.workspaceId} onClick={() => useProject(item.workspaceId)}>{item.title}<small>{item.path}</small></button>)}</div></section>}
          {workspace && <section aria-label="居民工作记录"><h3>{workspace.title} · 工作记录</h3><p className="town-path">{workspace.path}</p><div className="town-dialogue-choices">{RESIDENTS.filter(item => item.id !== 'coordinator').map(item => {
            const id = props.sessionForResident(workspace.workspaceId, item.id)
            const summary = id ? sessionState.byId[id as SessionId] : undefined
            const savedDraft = drafts[`${workspace.workspaceId}:${item.id}`]
            const events = id ? props.getBinding(id)?.eventSource.getSnapshot().entries : undefined
            const status = events?.length ? residentEventStatus(events) : 'idle'
            const detail = id && pending.has(id as SessionId) ? '等待你的确认' : summary?.running ? '正在工作' : status === 'failed' ? '本轮未完成，可查看记录并继续' : status === 'completed' ? '本轮已结束，请检查成果与验证' : summary && !summary.blank ? '已有工作记录，查看结果或继续' : savedDraft ? '有未发送的草稿' : '还没有任务'
            return <button key={item.id} onClick={() => choose(item.id)}><strong>{item.name.split(' · ')[0]} · {summary && !summary.blank ? '查看记录 / 继续' : '开始对话'}</strong><small>{detail}</small>{summary && !summary.blank && <><small>最近活动：{new Date(summary.updatedAt).toLocaleString('zh-CN')}</small><RecentWork id={summary.id} updatedAt={summary.updatedAt} running={summary.running} read={props.readRecentSession} /></>}{savedDraft && <small>草稿：{savedDraft.slice(0, 80)}</small>}</button>
          })}</div>{workspace.sessionIds.some(id => !props.residentForSession(workspace.workspaceId, id) && sessionState.byId[id] && !sessionState.byId[id]!.blank) && <p>还有未关联居民的历史会话，可在<a href="/workbench">高级工作台</a>查看；不会自动分配给居民。</p>}</section>}
          <p className="town-dialogue-line">{!workspace ? '欢迎来到小镇！要把哪个项目安顿在这里？' : modelState.ready === null ? `「${workspace.title}」已经安顿好了。我看看大家准备好了没有。` : !modelState.ready ? `「${workspace.title}」已经安顿好了。再接通模型，大家就能开始工作。` : `「${workspace.title}」已经安顿好了。芽芽可以帮你把想法做出来，要见见她吗？`}</p>
          <div className="town-dialogue-choices">
            {!workspace ? <button className="town-primary" disabled={busy} onClick={() => { void bind() }}>选择文件夹</button> : !modelState.ready ? <button className="town-primary" disabled={modelState.ready === null} onClick={() => setShowModels(true)}>{modelState.ready === null ? '正在准备…' : '连接模型'}</button> : <button className="town-primary" onClick={() => choose('coder')}>找芽芽聊聊</button>}
            <button onClick={closeConversation}>先逛逛</button>
            {workspace && <button onClick={() => setGuideView('residents')}>认识其他居民</button>}
          </div>
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
        {guideView === 'residents' && workspace && <><p className="town-dialogue-line">你想和谁聊聊？</p><div className="town-dialogue-choices">{RESIDENTS.filter(item => item.id !== 'coordinator').map(item => {
          const id = props.sessionForResident(workspace.workspaceId, item.id)
          const summary = id ? sessionState.byId[id as SessionId] : undefined
          const savedDraft = drafts[`${workspace.workspaceId}:${item.id}`]
          const continuing = !!savedDraft || !!summary && !summary.blank
          return <button key={item.id} onClick={() => choose(item.id)}>{continuing ? `继续找${item.name.split(' · ')[0]}` : item.id === 'coder' ? '找芽芽制作功能' : item.id === 'teacher' ? '找苔伯学习项目' : '找阿澜查看文件'}{continuing && <small>{savedDraft ? '有草稿' : summary?.running ? '正在工作' : '继续会话'}</small>}</button>
        })}</div></>}
        {guideView === 'options' && <><p className="town-dialogue-line">还有什么需要我帮忙的？</p><nav className="town-dialogue-choices" aria-label="小镇设置与帮助"><button onClick={() => setGuideView('projects')}>管理项目</button><button onClick={() => setShowModels(true)}>模型设置</button><button aria-haspopup="dialog" onClick={() => { closeConversation(); openWorldGuide() }}>操作帮助</button><a href="/workbench">高级工作台 ↗</a></nav></>}
        <footer className="town-dialogue-footer">{guideView === 'welcome' ? <><button className="town-text-action" onClick={() => setGuideView('projects')}>{workspace ? '更换项目' : '已有项目 / 输入路径'}</button><button className="town-text-action" onClick={() => setGuideView('options')}>还有件事…</button></> : <button className="town-text-action" onClick={() => { setGuideView('welcome'); setError('') }}>返回对话</button>}</footer>
      </> : <>
        <p className="town-dialogue-line">{resident.greeting}</p>
        <nav className="town-guide-tools" aria-label="会话导航"><button onClick={() => choose('coordinator')}>返回向导</button><button onClick={() => setShowModels(true)}>模型设置</button></nav>
        <details className="town-path"><summary>当前项目：{workspace?.title}</summary><p>{workspace?.path}</p></details>
        {interaction && <div className="town-approval" role="status"><strong>需要你的确认</strong>{approval ? <>
          <p>{approval.toolName}：{approval.reason ?? '本次工具调用需要批准'}</p>
          <pre>{binding && projectResidentEvents(binding.eventSource.getSnapshot().entries).tools.find(tool => tool.key === approval.callId)?.arguments}</pre>
          <button onClick={() => { void approval.answer('allowed-once').catch(reason => setError(String(reason))) }}>仅允许这一次</button>
          <button onClick={() => { void approval.answer('rejected').catch(reason => setError(String(reason))) }}>拒绝</button>
        </> : <p>居民正在等待补充信息。</p>}<a href="/workbench">查看完整请求 ↗</a></div>}
        {binding && <SessionResult key={bindingId} binding={binding} />}
        {selected === 'file_keeper' && <button disabled={busy || !binding} onClick={() => { void send('列出当前项目根目录的文件和子目录，注明各项类型。最多列出 80 项，不要递归扫描。', false) }}>列出项目文件</button>}
        <form onSubmit={event => { event.preventDefault(); void send(selected === 'file_keeper' ? `读取这个项目内的文件：${draft}` : draft) }}>
          <label htmlFor="town-request">{selected === 'coder' ? '想制作的功能' : selected === 'teacher' ? '你的问题' : '文件相对路径'}</label>
          <textarea id="town-request" rows={3} value={draft} disabled={busy} placeholder={selected === 'coder' ? '例如：给首页加一个待办清单，可以添加和完成事项。请验证这两个操作。' : undefined} onChange={event => setDrafts(value => ({ ...value, [draftKey]: event.target.value }))} />
          {draft && <small>{draftStorageError ? '草稿暂时只能保留在当前页面，刷新前请复制保存。' : '草稿保存在此浏览器，回来可以继续填写。'}</small>}
          <button disabled={busy || !binding || !draft.trim()}>{busy ? '正在连接…' : binding?.session.getSnapshot().running ? '发送补充（排队）' : resident.action}</button>
        </form>
      </>}
      {picking ? <div><p role="status">等待系统文件夹选择窗口…</p><button onClick={() => pickerAbort.current?.abort()}>取消选择</button></div> : busy && <p role="status">正在处理…</p>}
      {error && <p role="alert">{error}</p>}
      </div>
    </aside>}
  </div>
}
