import { useLayoutEffect, useRef } from 'react'
import type { AgentIslesTranslate } from './locales.js'

/** Lay out the existing DSH outlet without remounting its scoped React tree. */
export function NativeChat({ sessionId, t }: { sessionId: string; t: AgentIslesTranslate }) {
  const seat = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = seat.current
    if (!element) return
    const style = document.createElement('style')
    style.dataset.agentIslesNativeChat = ''
    document.head.append(style)
    const place = () => {
      const box = element.getBoundingClientRect()
      style.textContent = `
        [data-agent-isles-town] :is([data-slot="conversation"], [data-slot="main.conversation"]) {
          display: block !important; position: fixed; z-index: 21;
          left: ${box.left}px; top: ${box.top}px; width: ${box.width}px; height: ${box.height}px;
          visibility: visible; pointer-events: auto; overflow: hidden;
        }
        [data-agent-isles-town] :is([data-slot="conversation"], [data-slot="main.conversation"]) > [data-phase] {
          --dsh-chat-content-width: 100%; --dsh-composer-side-clearance: 0px;
          height: 100%; min-height: 0;
          --dsw-alias-bg-base: #fcfdf8; background: #fcfdf8;
        }
        [data-agent-isles-town] [data-slot="conversation.session.header"],
        [data-agent-isles-town] [data-width-handle] { display: none !important; }
        /* Workspace changes must go through the island project menu. Keep the
           native composer, model, permission and attachment controls intact. */
        [data-agent-isles-town] :is([aria-label="选择工作区"], [aria-label="Select workspace"]) { display: none !important; }
        [data-agent-isles-town]:not([data-details-collapsed]) [data-slot="details"] {
          display: block !important; position: fixed; z-index: 22;
          top: ${box.top}px; right: ${Math.max(0, window.innerWidth - box.right)}px;
          width: ${box.width}px; height: ${box.height}px;
          background: var(--dsw-alias-bg-base); visibility: visible; pointer-events: auto;
        }
      `
    }
    const observer = new ResizeObserver(place)
    observer.observe(element)
    // Tutorial disclosures and the preview can move the seat without resizing it.
    const panel = element.closest('aside')
    if (panel) observer.observe(panel)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    place()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      style.remove()
    }
  }, [sessionId])
  return <div className="town-native-chat-seat" ref={seat} aria-label={t('history.nativeChat')} />
}
