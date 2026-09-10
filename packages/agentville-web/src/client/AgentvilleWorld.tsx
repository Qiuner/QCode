import { useEffect, useMemo, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { ModelSettings } from './ModelSettings.js'
import { ModelConfigurationRequired, type ModelSettingsActions } from './model-settings.js'
import {
  WORLD_BRIDGE_VERSION,
  isWorldToHostMessage,
  type HostToWorldMessage,
  type ResidentId,
  type ResidentView,
} from './world-bridge.js'

export interface AgentvilleWorldInjected {
  models: ModelSettingsActions
  residentForSession(workspaceId: string, sessionId: string): ResidentId | undefined
  selectResident(residentId: ResidentId, workspaceId: string): Promise<string>
  sendResidentPrompt(residentId: ResidentId, workspaceId: string, prompt: string): Promise<void>
}

type Props = PropsRuntime<'shell.overlay'> & AgentvilleWorldInjected

const css = {
  connection: 'agentville-connection',
  iframe: 'agentville-iframe',
  overlay: 'agentville-overlay',
  residents: 'agentville-residents',
  residentsHeading: 'agentville-residents-heading',
  resident: 'agentville-resident',
  residentDot: 'agentville-resident-dot',
  residentCopy: 'agentville-resident-copy',
  prompt: 'agentville-prompt',
  returnButton: 'agentville-return-button',
  topbar: 'agentville-topbar',
  world: 'agentville-world',
} as const

const IDLE_RESIDENTS: readonly ResidentView[] = [
  { id: 'coder', displayName: 'Coder · 开发', status: 'idle' },
  { id: 'file_keeper', displayName: 'File Keeper · 整理', status: 'idle' },
  { id: 'teacher', displayName: 'Teacher · 教学', status: 'idle' },
  { id: 'coordinator', displayName: 'Coordinator · 协调', status: 'idle' },
]

const STATUS_LABEL: Readonly<Record<ResidentView['status'], string>> = {
  idle: '待命', thinking: '思考中', working: '工作中', approval: '等待确认', completed: '已完成', failed: '遇到问题',
}

function go(path: string): void {
  window.location.assign(path)
}

function openWorkspacePicker(): boolean {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
  const trigger = buttons.find(button => {
    const label = button.getAttribute('aria-label')
    return label === '添加工作区' || label === 'Add workspace'
  }) ?? buttons.find(button => {
    const label = button.getAttribute('aria-label')
    return label === '选择工作区' || label === 'Choose workspace'
  })
  if (trigger === undefined) return false
  queueMicrotask(() => {
    trigger.click()
    trigger.focus()
  })
  return true
}

export function AgentvilleWorld(props: Props) {
  const workbench = new URLSearchParams(window.location.search).get('agentville') === 'workbench'
    || window.location.pathname === '/workbench'
  const iframe = useRef<HTMLIFrameElement | null>(null)
  const [showModels, setShowModels] = useState(false)
  useEffect(() => {
    let active = true
    void props.models.load().then(snapshot => {
      const provider = snapshot.providers.find(item => item.id === snapshot.selection.provider)
      if (active && (!snapshot.routable || (provider && !provider.credential.configured))) setShowModels(true)
    }).catch(() => { /* The settings panel exposes connection errors on demand. */ })
    return () => { active = false }
  }, [])
  const [worldReady, setWorldReady] = useState(false)
  const [selectedResident, setSelectedResident] = useState<ResidentId | undefined>()
  const [pendingResident, setPendingResident] = useState<ResidentId | undefined>()
  const [connectionMessage, setConnectionMessage] = useState<string | undefined>()
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth > 800)
  const [residentsOpen, setResidentsOpen] = useState(true)
  const currentSessionId = props.useSessions(state => state.current)
  const currentRunning = props.useSessions(state => {
    const current = state.current
    return current === undefined ? false : state.byId[current]?.running ?? false
  })
  const currentCompleted = props.useSessions(state => {
    const current = state.current
    return current === undefined ? false : state.byId[current]?.completed ?? false
  })
  const awaitingApproval = props.useSessionPendingInteraction(state => (
    currentSessionId === undefined ? false : state.has(currentSessionId)
  ))
  const workspaces = props.useWorkspaces(state => state.items)
  const workspace = useMemo(() => {
    if (currentSessionId !== undefined) {
      const current = workspaces.find(item => item.sessionIds.includes(currentSessionId))
      if (current !== undefined) return current
    }
    return workspaces.at(0)
  }, [currentSessionId, workspaces])
  const activeResident = useMemo(() => selectedResident ?? (
    workspace !== undefined && currentSessionId !== undefined
      ? props.residentForSession(workspace.workspaceId, currentSessionId)
      : undefined
  ), [currentSessionId, props, selectedResident, workspace])
  const residents = useMemo<readonly ResidentView[]>(() => IDLE_RESIDENTS.map(resident => (
    resident.id === activeResident && currentSessionId !== undefined
      ? {
          ...resident,
          status: awaitingApproval ? 'approval'
            : currentRunning ? 'working'
              : currentCompleted ? 'completed' : 'idle',
        }
      : resident
  )), [activeResident, awaitingApproval, currentCompleted, currentRunning, currentSessionId])

  const openResident = (residentId: ResidentId): void => {
    setChatOpen(true)
    setResidentsOpen(true)
    if (workspace === undefined) {
      setPendingResident(residentId)
      setConnectionMessage(openWorkspacePicker()
        ? '请选择项目文件夹作为工作区'
        : '请先在右侧选择工作区')
      return
    }
    setConnectionMessage('正在打开居民会话')
    void props.selectResident(residentId, workspace.workspaceId).then(() => {
      setSelectedResident(residentId)
      setConnectionMessage(undefined)
    }, (error: unknown) => {
      setConnectionMessage(error instanceof Error ? error.message : '居民会话打开失败')
    })
  }

  const submitPrompt = (): void => {
    const text = prompt.trim()
    if (text === '' || workspace === undefined || activeResident === undefined || sending) return
    setSending(true)
    setChatOpen(true)
    setConnectionMessage('居民正在接收想法')
    void props.sendResidentPrompt(activeResident, workspace.workspaceId, text).then(() => {
      setPrompt('')
      setConnectionMessage('居民已开始工作')
    }, (error: unknown) => {
      if (error instanceof ModelConfigurationRequired) setShowModels(true)
      setConnectionMessage(error instanceof Error ? error.message : '想法发送失败')
    }).finally(() => { setSending(false) })
  }

  useEffect(() => {
    if (pendingResident === undefined || workspace === undefined) return
    const residentId = pendingResident
    setPendingResident(undefined)
    setConnectionMessage('正在打开居民会话')
    void props.selectResident(residentId, workspace.workspaceId).then(() => {
      setSelectedResident(residentId)
      setConnectionMessage(undefined)
    }, (error: unknown) => {
      setConnectionMessage(error instanceof Error ? error.message : '居民会话打开失败')
    })
  }, [pendingResident, props, workspace])

  useEffect(() => {
    if (!workbench) return
    if (window.location.pathname !== '/workbench') {
      window.history.replaceState(null, '', '/workbench')
    }
  }, [workbench])

  useEffect(() => {
    if (workbench) return
    const frame = document.querySelector<HTMLElement>('[data-shell-overlay]')?.parentElement
    frame?.setAttribute('data-agentville-chat', chatOpen ? 'open' : 'closed')
    return () => { frame?.removeAttribute('data-agentville-chat') }
  }, [chatOpen, workbench])

  useEffect(() => {
    if (workbench) return
    const frame = document.querySelector<HTMLElement>('[data-shell-overlay]')?.parentElement
    frame?.setAttribute('data-agentville-shell', '')
    return () => { frame?.removeAttribute('data-agentville-shell') }
  }, [workbench])

  const post = (message: HostToWorldMessage): void => {
    iframe.current?.contentWindow?.postMessage(message, window.location.origin)
  }

  useEffect(() => {
    if (workbench) return
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow) return
      if (!isWorldToHostMessage(event.data)) return
      if (event.data.type === 'world:ready') setWorldReady(true)
      if (event.data.type === 'resident:selected') {
        openResident(event.data.payload.residentId)
      }
    }
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [props, workbench, workspace])

  useEffect(() => {
    if (!worldReady || workbench) return
    post({
      source: 'agentville-host',
      version: WORLD_BRIDGE_VERSION,
      type: 'world:init',
      payload: {
        workspace: workspace === undefined
          ? null
          : { workspaceId: workspace.workspaceId, title: workspace.title },
        sessionId: currentSessionId ?? null,
        residents,
      },
    })
  }, [currentSessionId, residents, workbench, workspace, worldReady])

  if (workbench) {
    return (
      <button className={css.returnButton} type="button" onClick={() => { go('/') }}>
        <span aria-hidden="true">←</span> 返回 Agentville
      </button>
    )
  }

  return (
    <div className={css.overlay} data-chat-open={chatOpen}>
      {showModels && <ModelSettings actions={props.models} close={() => setShowModels(false)} />}
      <button
        className="agentville-chat-toggle"
        type="button"
        aria-expanded={chatOpen}
        aria-label={chatOpen ? '收起聊天侧栏' : '展开聊天侧栏'}
        onClick={() => { setChatOpen(open => !open) }}
      >
        {chatOpen ? '× 收起聊天' : '☰ 展开聊天'}
      </button>
      <section className={css.world} aria-label="Agentville world">
        <iframe
          ref={iframe}
          className={css.iframe}
          src="/world/?embed=1"
          title="Agentville interactive world"
          onLoad={() => { setWorldReady(true) }}
        />
        <div className={css.topbar}>
          <div>
            <strong>Agentville</strong>
            <span>{workspace?.title ?? '选择右侧工作区开始'}</span>
          </div>
          <button type="button" onClick={() => { go('/workbench') }} aria-label="打开完整工作台" title="打开完整工作台">
            <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className={css.connection} data-ready={worldReady || undefined}>
          <span aria-hidden="true" />{connectionMessage ?? (worldReady ? '世界已连接' : '正在连接世界')}
        </div>
        {!residentsOpen && (
          <button className="agentville-residents-open" type="button" aria-expanded={false} aria-controls="agentville-resident-panel" onClick={() => { setResidentsOpen(true) }}>
            ☰ 选择居民
          </button>
        )}
        <aside id="agentville-resident-panel" className={css.residents} aria-label="居民工作台" hidden={!residentsOpen}>
          <div className={css.residentsHeading}>
            <strong>居民工作台</strong>
            <span>{workspace?.title ?? '未选择工作区'}</span>
            <button className="agentville-residents-close" type="button" aria-label="收起居民选择栏" aria-expanded={true} aria-controls="agentville-resident-panel" onClick={() => { setResidentsOpen(false) }}>
              ×
            </button>
          </div>
          <button type="button" onClick={() => setShowModels(true)}>模型设置</button>
          {residents.map(resident => (
            <button
              key={resident.id}
              className={css.resident}
              type="button"
              aria-pressed={resident.id === activeResident}
              data-active={resident.id === activeResident || undefined}
              data-needs-workspace={workspace === undefined || undefined}
              onClick={() => { openResident(resident.id) }}
            >
              <span className={css.residentDot} data-status={resident.status} />
              <span className={css.residentCopy}>
                <strong>{resident.displayName}</strong>
                <small>{STATUS_LABEL[resident.status]}</small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
          <form className={css.prompt} onSubmit={event => { event.preventDefault(); submitPrompt() }}>
            <label htmlFor="agentville-prompt">告诉居民你想做什么</label>
            <textarea
              id="agentville-prompt"
              value={prompt}
              onChange={event => { setPrompt(event.target.value) }}
              placeholder={activeResident === undefined ? '先选择一位居民' : '例如：帮我看看这个项目怎么加一个开始界面'}
              disabled={activeResident === undefined || workspace === undefined || sending}
              rows={3}
            />
            <button type="submit" disabled={prompt.trim() === '' || activeResident === undefined || workspace === undefined || sending}>
              {sending ? '发送中…' : '交给居民'}
            </button>
          </form>
        </aside>
      </section>
    </div>
  )
}
