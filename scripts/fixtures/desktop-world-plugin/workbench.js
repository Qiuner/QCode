// Preview-only bridge to the official workbench; no resident/session binding yet.
(() => {
  if (document.getElementById('preview-workbench')) return
  const world = document.getElementById('world-probe')
  const panel = document.createElement('section')
  panel.id = 'preview-workbench'
  panel.hidden = true
  panel.setAttribute('aria-label', 'Q 的工作台')
  panel.style.cssText = 'position:fixed;inset:24px;z-index:10;background:white;color:#172122;border-radius:16px;overflow:hidden;box-shadow:0 12px 60px #0005'
  const bar = document.createElement('div')
  bar.style.cssText = 'height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#f5f7f7'
  const label = document.createElement('span')
  label.textContent = 'Q · 创作工作台'
  const close = document.createElement('button')
  close.textContent = '返回小岛 · Esc'
  close.style.cssText = 'font:inherit;border:1px solid #bdc9c6;border-radius:8px;padding:5px 12px;cursor:pointer;background:white'
  bar.append(label, close)
  const workbench = document.createElement('iframe')
  workbench.title = 'DeepSeek Harness 原生工作台'
  workbench.style.cssText = 'position:absolute;top:48px;left:0;width:100%;height:calc(100% - 48px);border:0'
  panel.append(bar, workbench)
  document.body.append(panel)
  function syncWorld(open) {
    world.contentWindow.postMessage({ source: 'agent-isles-host', version: 1, type: 'world:init', payload: {
      locale: 'zh', workspace: null, sessionId: null, panelOpen: open, residents: [],
    } }, location.origin)
  }
  function dismiss() {
    panel.hidden = true
    syncWorld(false)
    world.contentWindow.focus()
    world.contentDocument.querySelector('canvas')?.focus()
  }
  function escape(event) {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); dismiss() }
  }
  close.addEventListener('click', dismiss)
  window.addEventListener('keydown', escape)
  workbench.addEventListener('load', () => workbench.contentWindow.addEventListener('keydown', escape))
  window.addEventListener('message', event => {
    if (event.source !== world.contentWindow || event.origin !== location.origin || event.data?.source !== 'agent-isles-world'
      || event.data?.version !== 1 || event.data.type !== 'resident:selected' || event.data.payload?.residentId !== 'coder') return
    if (!panel.hidden) return
    document.exitPointerLock?.()
    panel.hidden = false
    syncWorld(true)
    if (!workbench.hasAttribute('src')) workbench.src = '/index.html'
    close.focus()
  })
})()
