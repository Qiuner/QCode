import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageSquare, X } from 'lucide-react'
import { NativeChat } from './NativeChat.js'

/** Position the mounted native sidebar without replacing its scoped React tree. */
export function NativeSidebar({ sessionId, toggleSidebar, close }: { sessionId?: string; toggleSidebar(): void; close(): void }) {
  const seat = useRef<HTMLDivElement>(null)
  const onClose = useRef(close)
  onClose.current = close
  const [chat, setChat] = useState(false)
  useLayoutEffect(() => {
    const element = seat.current!
    const root = document.querySelector('[data-agent-isles-town]')
    const collapsed = !!root?.hasAttribute('data-sidebar-collapsed')
    if (collapsed) toggleSidebar()
    const collapseObserver = new MutationObserver(() => {
      if (root?.hasAttribute('data-sidebar-collapsed')) toggleSidebar()
    })
    if (root) collapseObserver.observe(root, { attributes: true, attributeFilter: ['data-sidebar-collapsed'] })
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('[role="dialog"], dialog[open], [role="menu"]')) {
        event.preventDefault()
        onClose.current()
      }
    }
    window.addEventListener('keydown', escape)
    const style = document.createElement('style')
    document.head.append(style)
    const place = () => {
      const box = element.getBoundingClientRect()
      style.textContent = `
        [data-agent-isles-town] [data-slot="sidebar"] button[aria-label="收起侧边栏"] { display: none; }
        [data-agent-isles-town] [data-slot="sidebar"] > * {
          position: fixed !important; z-index: 23; left: ${box.left}px; top: ${box.top}px;
          width: ${box.width}px !important; height: ${box.height}px !important;
          visibility: ${box.width ? 'visible' : 'hidden'}; pointer-events: ${box.width ? 'auto' : 'none'};
          background: var(--dsw-alias-bg-base); border-left: 1px solid #ddd;
        }
      `
    }
    const observer = new ResizeObserver(place)
    observer.observe(element)
    window.addEventListener('resize', place)
    place()
    return () => {
      observer.disconnect()
      collapseObserver.disconnect()
      window.removeEventListener('keydown', escape)
      window.removeEventListener('resize', place)
      style.remove()
      if (root && root.hasAttribute('data-sidebar-collapsed') !== collapsed) toggleSidebar()
    }
  }, [toggleSidebar])
  return <aside className="town-history" data-chat={chat && sessionId ? '' : undefined} aria-label="项目与历史对话">
    <header><strong>项目与历史对话</strong><button aria-label="关闭项目与历史对话" title="回到小岛" onClick={close}><X size={18} /></button></header>
    <div className="town-history-sidebar" ref={seat} />
    <footer><button disabled={!sessionId} onClick={() => setChat(value => !value)}><MessageSquare size={16} />{chat ? '收起对话' : '查看当前对话'}</button></footer>
    {chat && sessionId && <section className="town-history-chat" aria-label="历史对话内容"><header><button aria-label="返回项目与历史对话" onClick={() => setChat(false)}><ArrowLeft size={18} /></button><strong>当前对话</strong></header><NativeChat sessionId={sessionId} /></section>}
  </aside>
}
