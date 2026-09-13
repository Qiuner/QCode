type FullscreenDocument = Pick<Document, 'documentElement' | 'fullscreenElement' | 'fullscreenEnabled'>

export function requestProjectFullscreen(target: FullscreenDocument = document): void {
  if (target.fullscreenElement || !target.fullscreenEnabled) return
  const request = target.documentElement.requestFullscreen
  if (typeof request !== 'function') return
  try {
    void request.call(target.documentElement, { navigationUI: 'hide' }).catch(() => {})
  } catch {
    // Fullscreen is optional; browser policy must never block entering a project.
  }
}
