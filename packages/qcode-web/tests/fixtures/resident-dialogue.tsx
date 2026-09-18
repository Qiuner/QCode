import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QCodeWorld } from '../../src/client/QCodeWorld.js'
import { WORLD_STYLES } from '../../src/client/styles.js'

const control = { pick: 'ok', configured: true, calls: [] as string[], aborted: false, finish: undefined as (() => void) | undefined }
Object.assign(window, { dialogueTest: control })
const sessions = { byId: {}, phase: 'ready' }
const pending = new Map()

function Fixture() {
  const [items, setItems] = useState<Array<{ workspaceId: string; title: string; path: string; sessionIds: string[] }>>([])
  const props = {
    useWorkspaces: (select: (state: unknown) => unknown) => select({ items, phase: 'ready', state: 'idle' }),
    useSessions: (select: (state: unknown) => unknown) => select(sessions),
    useSessionPendingInteraction: (select: (state: unknown) => unknown) => select(pending),
    models: { load: async () => ({ providers: [], routable: control.configured, selection: { model: 'test', provider: 'test' } }) },
    residentForSession: () => undefined,
    sessionForResident: () => undefined,
    selectResident: async (resident: string) => { control.calls.push('resident:' + resident); return 'test-session' },
    getBinding: () => undefined,
    focusSession: () => {},
    restoreProject: async () => undefined,
    saveProject: async () => {},
    readRecentSession: async () => ({ messages: [], history: [], tools: [], status: 'idle', outcome: '', live: '' }),
    sendResidentPrompt: async () => {},
    pickDirectory: async (signal?: AbortSignal) => {
      control.aborted = false
      signal?.addEventListener('abort', () => { control.aborted = true }, { once: true })
      if (control.pick === 'cancel') return null
      if (control.pick === 'fail') throw new Error('文件夹暂时无法打开')
      if (control.pick === 'pending') await new Promise<void>((resolve, reject) => {
        control.finish = resolve
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
      return 'D:\\Projects\\Test'
    },
    bindWorkspace: async (path: string) => {
      control.calls.push('bind:' + path)
      setItems([{ workspaceId: 'test-project', title: 'Test Project', path, sessionIds: [] }])
      return 'test-project'
    },
  } as unknown as React.ComponentProps<typeof QCodeWorld>
  return <><style>{WORLD_STYLES}</style><QCodeWorld {...props} /></>
}

createRoot(document.getElementById('root')!).render(<Fixture />)
