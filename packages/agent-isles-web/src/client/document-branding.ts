const PRODUCT_TITLE = 'agent-isles'
const TITLE_SEPARATOR = ' — '

export const AGENT_ISLES_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="2" y="2" width="13" height="13" rx="3" fill="#1f6f5c"/>
  <rect x="17" y="2" width="13" height="13" rx="3" fill="#e0a12f"/>
  <rect x="2" y="17" width="13" height="13" rx="3" fill="#d45b48"/>
  <rect x="17" y="17" width="13" height="13" rx="3" fill="#3977b8"/>
</svg>`)}`

export function agentIslesDocumentTitle(title: string): string {
  const separator = title.lastIndexOf(TITLE_SEPARATOR)
  if (separator === -1) return PRODUCT_TITLE
  const sessionTitle = title.slice(0, separator).trim()
  return sessionTitle === '' ? PRODUCT_TITLE : `${sessionTitle}${TITLE_SEPARATOR}${PRODUCT_TITLE}`
}

export function applyDocumentBranding(
  document: Document,
  Observer: typeof MutationObserver = MutationObserver,
): () => void {
  const previousTitle = document.title
  const icon = document.createElement('link')
  icon.rel = 'icon'
  icon.type = 'image/svg+xml'
  icon.href = AGENT_ISLES_FAVICON
  icon.dataset.agentIslesBrand = ''
  document.head.append(icon)

  let updating = false
  const updateTitle = (): void => {
    if (updating) return
    const title = agentIslesDocumentTitle(document.title)
    if (title === document.title) return
    updating = true
    document.title = title
    updating = false
  }
  updateTitle()

  const observer = new Observer(updateTitle)
  observer.observe(document.querySelector('title') ?? document.head, { childList: true, subtree: true })

  return () => {
    observer.disconnect()
    icon.remove()
    document.title = previousTitle
  }
}
