import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, Check } from 'lucide-react'
import type { ResidentId } from './world-bridge.js'
import { RESIDENTS, localizedResidents } from './resident-model.js'
import { RESIDENT_PORTRAITS } from './resident-portraits.js'
import type { AgentIslesWorldInjected } from './AgentIslesWorld.js'
import { notificationDecision } from './notification-state.js'
import type { AgentIslesTranslate, AgentIslesLocaleKey } from './locales.js'

export interface NotificationSession {
  id: string; projectId: string; projectName: string; resident: ResidentId
  updatedAt: number; running: boolean; pending?: string
}
type NoticeMessageKey = Extract<AgentIslesLocaleKey, `notification.${string}`>
interface Notice extends NotificationSession { key: string; messageKey?: NoticeMessageKey; params?: { name: string }; text?: string; requiresAction: boolean }
const STORAGE_KEY = 'agent-isles.notifications.v1'

export function ResidentNotifications({ sessions, activeSession, read, open, onCount, t, hidden = false }: {
  sessions: NotificationSession[]; activeSession?: string
  read: AgentIslesWorldInjected['readRecentSession']; open(item: NotificationSession): void
  onCount(count: number): void
  t: AgentIslesTranslate
  hidden?: boolean
}) {
  const [saved] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
      return { seen: value.seen && typeof value.seen === 'object' ? Object.fromEntries(Object.entries(value.seen).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))) : {}, notices: Array.isArray(value.notices) ? value.notices.filter((n: Notice) => n && typeof n.id === 'string' && typeof n.projectId === 'string' && typeof n.projectName === 'string' && typeof n.key === 'string' && (typeof n.text === 'string' || typeof n.messageKey === 'string') && RESIDENTS.some(r => r.id === n.resident)) as Notice[] : [] }
    } catch { return { seen: {} as Record<string, number>, notices: [] as Notice[] } }
  })
  const seen = useRef(saved.seen)
  const initialized = useRef(new Set<string>())
  const pendingKeys = useRef(new Map<string, string>())
  const active = useRef(activeSession)
  active.current = activeSession
  const [notices, setNotices] = useState<Notice[]>(saved.notices)
  const [toast, setToast] = useState<Notice>()
  const [expanded, setExpanded] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const [readFailed, setReadFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const signature = JSON.stringify(sessions.map(s => ({ ...s, updatedAt: s.running ? 0 : s.updatedAt })))
  const names = localizedResidents(t)
  const noticeText = (notice: Notice) => notice.messageKey
    ? t(notice.messageKey, { ...notice.params, name: names.find(item => item.id === notice.resident)!.name.split(' · ')[0] })
    : notice.text ?? ''
  useEffect(() => {
    onCount(notices.length)
  }, [notices.length, onCount])
  useEffect(() => {
    const controller = new AbortController()
    let reading = 0
    const timeout = setTimeout(() => { if (reading) setReadFailed(true); controller.abort() }, 15000)
    function publish(item: Notice, announce: boolean) {
      setNotices(current => [...current.filter(n => n.id !== item.id), item])
      if (announce && active.current !== item.id && document.visibilityState === 'visible') setToast(item)
    }
    setReadFailed(false)
    const ids = new Set(sessions.map(s => s.id))
    setNotices(current => current.filter(n => ids.has(n.id) && (!n.requiresAction || sessions.some(s => s.id === n.id && s.pending))))
    for (const session of sessions) {
      if (session.pending) {
        if (pendingKeys.current.get(session.id) !== session.pending) {
          publish({ ...session, key: `pending:${session.pending}`, messageKey: session.pending.startsWith('approval') ? 'notification.approval' : 'notification.question', requiresAction: true }, initialized.current.has(session.id))
          pendingKeys.current.set(session.id, session.pending)
        }
      } else pendingKeys.current.delete(session.id)
      if (session.running || session.pending) { initialized.current.add(session.id); continue }
      reading++
      void read(session.id, controller.signal).then(result => {
        if (controller.signal.aborted) return
        const wasInitialized = initialized.current.has(session.id)
        initialized.current.add(session.id)
        const end = result.ended
        if (!end) return
        const previous = seen.current[session.id]
        const decision = notificationDecision(previous, end.seq, wasInitialized, active.current === session.id && document.visibilityState === 'visible')
        if (!decision.advance) return
        seen.current[session.id] = end.seq
        if (decision.unread) {
          publish({ ...session, key: `end:${end.seq}`, messageKey: end.failed ? 'notification.failed' : end.worked ? 'notification.completed' : 'notification.reply', requiresAction: false }, decision.announce)
        } else setNotices(current => [...current])
      }).catch(() => { if (!controller.signal.aborted) setReadFailed(true) }).finally(() => { reading-- })
    }
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [signature, retry, t])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ seen: seen.current, notices })); setStorageFailed(false) }
    catch { setStorageFailed(true) }
  }, [notices])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(undefined), 8000)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (toast && (toast.id === activeSession || !notices.some(n => n.id === toast.id && n.key === toast.key))) setToast(undefined)
  }, [activeSession, notices, toast])
  const visibleToast = toast && toast.id !== activeSession ? toast : undefined
  if (hidden) return null
  return createPortal(<div className="town-shell town-notification-layer" data-conversation={activeSession ? '' : undefined}><section className="town-notifications" aria-label={t('notification.title')}>
    {visibleToast && <div className="town-notification-toast" role="status"><button onClick={() => { open(visibleToast); setToast(undefined) }}><img src={RESIDENT_PORTRAITS[visibleToast.resident]} alt="" /><span><small>{visibleToast.projectName}</small>{noticeText(visibleToast)}</span></button><button aria-label={t('notification.collapse')} title={t('notification.collapse')} onClick={() => setToast(undefined)}><X size={16} /></button></div>}
    <button className="town-notification-toggle" aria-label={t('notification.toggle', { count: notices.length })} aria-expanded={expanded} onClick={() => setExpanded(value => !value)} title={t('notification.title')}><Bell size={19} />{notices.length > 0 && <span>{notices.length}</span>}</button>
    {expanded && <div className="town-notification-list"><header><strong>{t('notification.letters')}</strong><button aria-label={t('notification.close')} onClick={() => setExpanded(false)}><X size={16} /></button></header>
      {(storageFailed || readFailed) && <p role="alert">{storageFailed ? t('notification.storageFailed') : t('notification.readFailed')}{readFailed && <button onClick={() => setRetry(value => value + 1)}>{t('common.retry')}</button>}</p>}
      {!notices.length && <p>{t('notification.empty')}</p>}
      {notices.map(item => { const text = noticeText(item); return <div className="town-notification-item" key={`${item.id}:${item.key}`}><button onClick={() => { open(item); setExpanded(false); setToast(undefined) }}><img src={RESIDENT_PORTRAITS[item.resident]} alt="" /><span><small>{item.projectName}</small>{text}</span></button>{!item.requiresAction && <button aria-label={t('notification.markRead', { text })} title={t('notification.markReadTitle')} onClick={() => setNotices(current => current.filter(n => n.id !== item.id))}><Check size={16} /></button>}</div> })}
    </div>}
  </section></div>, document.body)
}
