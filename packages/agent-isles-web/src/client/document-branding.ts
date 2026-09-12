const PRODUCT_TITLE = 'agent-isles'
const TITLE_SEPARATOR = ' — '

export const AGENT_ISLES_FAVICON = '/agent-isles/brand/favicon.ico'

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
  icon.type = 'image/x-icon'
  icon.href = AGENT_ISLES_FAVICON
  icon.dataset.agentIslesBrand = ''
  document.head.append(icon)
  const touchIcon = document.createElement('link')
  touchIcon.rel = 'apple-touch-icon'
  touchIcon.href = '/agent-isles/brand/apple-touch-icon.png'
  const manifest = document.createElement('link')
  manifest.rel = 'manifest'
  manifest.href = '/agent-isles/brand/site.webmanifest'
  document.head.append(touchIcon)
  document.head.append(manifest)

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
    touchIcon.remove()
    manifest.remove()
    document.title = previousTitle
  }
}
