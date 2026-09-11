import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionBinding } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { WORLD_BRIDGE_VERSION, isWorldToHostMessage, worldFrameUrl, type ResidentId } from './world-bridge.js'
import { RESIDENTS, projectResidentEvents, residentEventStatus } from './resident-model.js'
import { ModelSettings } from './ModelSettings.js'
import { ModelConfigurationRequired, type ModelSettingsActions } from './model-settings.js'

export interface AgentvilleWorldInjected {
  models: ModelSettingsActions
  residentForSession(workspaceId: string, sessionId: string): ResidentId | undefined
  sessionForResident(workspaceId: string, residentId: ResidentId): string | undefined
  selectResident(residentId: ResidentId, workspaceId: string): Promise<string>
  sendResidentPrompt(residentId: ResidentId, workspaceId: string, prompt: string): Promise<void>
  getBinding(id: string): SessionBinding | undefined
  focusSession(id: string): void
  pickDirectory(): Promise<string | null>
  bindWorkspace(path: string): Promise<string>
}

type Props = PropsRuntime<'shell.overlay'> & AgentvilleWorldInjected
const PROJECT_KEY = 'agentville.active-workspace.v1'
const STATUS = { idle: '待命', thinking: '思考中', working: '工作中', approval: '等待确认', completed: '有新结果', failed: '需要处理' }

function SessionResult({ binding }: { binding: SessionBinding }) {
  const [stopError, setStopError] = useState('')
  const state = useSyncExternalStore(binding.session.subscribe.bind(binding.session), binding.session.getSnapshot.bind(binding.session))
  const events = useSyncExternalStore(binding.eventSource.subscribe.bind(binding.eventSource), binding.eventSource.getSnapshot.bind(binding.eventSource))
  const result = useMemo(() => projectResidentEvents(events.entries), [events.entries])
  return <div className="town-results">
    <p role="status">{state.running ? '正在工作' : result.outcome || '等待你的想法'}</p>
    {(state.openError || state.promptError || state.lastAgentError) && <p role="alert">{state.openError?.message ?? state.promptError?.error.message ?? state.lastAgentError}</p>}
    {result.messages.map(message => <article key={message.key}>{message.text}</article>)}
    {result.live && <article>{result.live}</article>}
    {result.tools.length > 0 && <details><summary>执行记录 ({result.tools.length})</summary>{result.tools.map(tool => <pre key={tool.key}>{tool.name}{'\n'}{tool.arguments}</pre>)}</details>}
    {stopError && <p role="alert">{stopError}</p>}
    {state.running && <button type="button" onClick={() => { void binding.session.cancel().then(result => { if (!result.ok) setStopError(result.error.message) }, reason => setStopError(String(reason))) }}>停止本轮</button>}
    {state.hasMore && <button type="button" disabled={state.loadingOlder} onClick={() => { void binding.session.loadOlder() }}>更早的记录</button>}
  </div>
}

export function AgentvilleWorld(props: Props) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [worldUrl] = useState(() => worldFrameUrl(location.href))
  const [ready, setReady] = useState(false)
  const [showModels, setShowModels] = useState(false)
  useEffect(() => {
    let active = true
    void props.models.load().then(snapshot => {
      const provider = snapshot.providers.find(item => item.id === snapshot.selection.provider)
      if (active && (!snapshot.routable || (provider && !provider.credential.configured))) setShowModels(true)
    }).catch(() => { /* The settings panel exposes connection errors on demand. */ })
    return () => { active = false }
  }, [])
  const [selected, setSelected] = useState<ResidentId | null>('coordinator')
  const [projectId, setProjectId] = useState<string | null>(() => { try { return localStorage.getItem(PROJECT_KEY) } catch { return null } })
  const [path, setPath] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bindingId, setBindingId] = useState<string>()
  const operation = useRef(0)
  const [, refreshEvents] = useState(0)
  const workspaces = props.useWorkspaces(state => state.items)
  const sessionState = props.useSessions(state => state)
  const pending = props.useSessionPendingInteraction(state => state)
  const workspace = workspaces.find(item => item.workspaceId === projectId)
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
    const next = workspace || id === 'coordinator' ? id : 'coordinator'
    if (next === selected) return
    ++operation.current
    setSelected(next)
    setError('')
  }

  useEffect(() => {
    const ticket = ++operation.current
    setBindingId(undefined); setError(''); setBusy(false)
    if (!workspace || !selected || selected === 'coordinator') return
    setBusy(true)
    void props.selectResident(selected, workspace.workspaceId).then(id => {
      if (ticket === operation.current) { props.focusSession(id); setBindingId(id) }
    }, reason => { if (ticket === operation.current) setError(String(reason.message ?? reason)) })
      .finally(() => { if (ticket === operation.current) setBusy(false) })
    return () => { ++operation.current }
  }, [selected, workspace?.workspaceId])

  useEffect(() => {
    const frame = document.querySelector<HTMLElement>('[data-shell-overlay]')?.parentElement
    frame?.setAttribute('data-agentville-town', '')
    return () => { frame?.removeAttribute('data-agentville-town') }
  }, [])

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== worldUrl.origin || event.source !== iframe.current?.contentWindow || !isWorldToHostMessage(event.data)) return
      if (event.data.type === 'world:ready') setReady(true)
      if (event.data.type === 'resident:selected') choose(event.data.payload.residentId)
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [workspace, selected])

  const worldState = JSON.stringify({ workspace: workspace ? { workspaceId: workspace.workspaceId, title: workspace.title } : null, sessionId: bindingId ?? null, residents })
  useEffect(() => {
    if (!ready) return
    iframe.current?.contentWindow?.postMessage({ source: 'agentville-host', version: WORLD_BRIDGE_VERSION, type: 'world:init', payload: JSON.parse(worldState) }, worldUrl.origin)
  }, [ready, worldState])

  function useProject(id: string) {
    if (id === projectId) return
    ++operation.current
    setProjectId(id)
    try { localStorage.setItem(PROJECT_KEY, id) } catch { /* Current tab still owns the selection. */ }
    setBindingId(undefined); setError('')
  }

  async function bind(pick: boolean) {
    const ticket = operation.current
    setBusy(true); setError('')
    try {
      const folder = pick ? await props.pickDirectory() : path.trim()
      if (folder && ticket === operation.current) {
        const id = await props.bindWorkspace(folder)
        if (ticket === operation.current) { setBusy(false); useProject(id); setPath(folder) }
      }
    } catch (reason) { if (ticket === operation.current) setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { if (ticket === operation.current) setBusy(false) }
  }

  async function send(text: string) {
    if (!workspace || !selected || selected === 'coordinator' || busy || !text.trim()) return
    const ticket = operation.current
    const key = draftKey
    setBusy(true); setError('')
    try {
      await props.sendResidentPrompt(selected, workspace.workspaceId, text)
      setDrafts(value => ({ ...value, [key]: '' }))
    } catch (reason) {
      if (ticket === operation.current) {
        if (reason instanceof ModelConfigurationRequired) setShowModels(true)
        setError(reason instanceof Error ? reason.message : String(reason))
      }
    }
    finally { if (ticket === operation.current) setBusy(false) }
  }

  function openWorldGuide() {
    iframe.current?.contentWindow?.postMessage({ source: 'agentville-host', version: WORLD_BRIDGE_VERSION, type: 'world:show-guide' }, worldUrl.origin)
  }

  return <div className="town-shell">
    <iframe ref={iframe} src={worldUrl.href} title="Agentville 小镇" onLoad={() => setReady(true)} />
    <header className="town-top"><div><strong>Agentville</strong><span>{workspace ? `当前项目：${workspace.title}` : '尚未绑定项目'}</span></div><nav className="town-actions" aria-label="世界工具"><button className="town-help-button" type="button" title="查看世界操作" aria-label="查看世界操作" aria-haspopup="dialog" onClick={openWorldGuide}>?</button><a href="/workbench" title="打开高级工作台">高级工作台 ↗</a></nav></header>
    <nav className="town-roster" aria-label="小镇居民">{residents.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => choose(item.id)}><strong>{item.displayName}</strong><small>{STATUS[item.status]}</small></button>)}</nav>
    {showModels ? <ModelSettings actions={props.models} close={() => setShowModels(false)} /> : resident && <aside className="town-panel" aria-label={resident.name}>
      <header><h2>{resident.name}</h2><button type="button" title="关闭居民面板" aria-label="关闭居民面板" onClick={() => { ++operation.current; setSelected(null) }}>×</button></header>
      <p>{resident.greeting}</p>
      {selected === 'coordinator' ? <>
        <button type="button" onClick={() => setShowModels(true)}>模型设置</button>
        <h3>{workspace ? '当前项目' : '安顿你的项目'}</h3>
        {workspace && <p className="town-path">{workspace.path}</p>}
        <button type="button" disabled={busy} onClick={() => { void bind(true) }}>选择项目文件夹</button>
        <form onSubmit={event => { event.preventDefault(); void bind(false) }}><label htmlFor="town-folder">项目文件夹路径</label><input id="town-folder" value={path} onChange={event => setPath(event.target.value)} placeholder="D:\Projects\MyProject" /><button disabled={busy || !path.trim()}>绑定这个文件夹</button></form>
        {workspaces.length > 0 && <><label htmlFor="town-projects">已有项目</label><select id="town-projects" value={workspace?.workspaceId ?? ''} disabled={busy} onChange={event => useProject(event.target.value)}><option value="" disabled>选择项目</option>{workspaces.map(item => <option key={item.workspaceId} value={item.workspaceId}>{item.title}</option>)}</select></>}
        {workspace && <div className="town-introductions"><button onClick={() => choose('coder')}>找芽芽制作功能</button><button onClick={() => choose('teacher')}>找苔伯学习项目</button><button onClick={() => choose('file_keeper')}>找阿澜查看文件</button></div>}
      </> : <>
        {selected === 'file_keeper' && <button disabled={busy || !binding} onClick={() => { void send('列出当前项目根目录的文件和子目录，注明各项类型。最多列出 80 项，不要递归扫描。') }}>列出项目文件</button>}
        <form onSubmit={event => { event.preventDefault(); void send(selected === 'file_keeper' ? `读取这个项目内的文件：${draft}` : draft) }}>
          <label htmlFor="town-request">{selected === 'coder' ? '想制作的功能' : selected === 'teacher' ? '你的问题' : '文件相对路径'}</label>
          <textarea id="town-request" rows={3} value={draft} disabled={busy} onChange={event => setDrafts(value => ({ ...value, [draftKey]: event.target.value }))} />
          <button disabled={busy || !binding || !draft.trim()}>{busy ? '正在连接…' : resident.action}</button>
        </form>
        {interaction && <div className="town-approval" role="status"><strong>需要你的确认</strong>{approval ? <>
          <p>{approval.toolName}：{approval.reason ?? '本次工具调用需要批准'}</p>
          <pre>{binding && projectResidentEvents(binding.eventSource.getSnapshot().entries).tools.find(tool => tool.key === approval.callId)?.arguments}</pre>
          <button onClick={() => { void approval.answer('allowed-once').catch(reason => setError(String(reason))) }}>仅允许这一次</button>
          <button onClick={() => { void approval.answer('rejected').catch(reason => setError(String(reason))) }}>拒绝</button>
        </> : <p>居民正在等待补充信息。</p>}<a href="/workbench">查看完整请求 ↗</a></div>}
        {binding && <SessionResult key={bindingId} binding={binding} />}
      </>}
      {busy && <p role="status">正在处理…</p>}
      {error && <p role="alert">{error}</p>}
    </aside>}
  </div>
}
