// The caller supplies Playwright and an authenticated local Harness URL.
// Use a fresh browser process per sample; do not compare reloads with cold starts.
export async function measureWorldStartup(browser, url, { fullMaterials = false, screenshot } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  let page
  try {
    page = await context.newPage()
    if (fullMaterials) {
      await page.route('**/world/?*', async route => {
        const response = await route.fetch()
        const html = await response.text()
        if (!html.includes('await engine.startGame({')) throw new Error('World startup hook not found')
        await route.fulfill({ response, body: html.replace('await engine.startGame({', "await engine.startGame({ args: ['--', '--full-materials'],") })
      })
    }
    await page.addInitScript(() => {
      window.startupTasks = []
      window.startupPrograms = 0
      window.startupCompileMs = 0
      new PerformanceObserver(list => {
        window.startupTasks.push(...list.getEntries().map(entry => ({ at: entry.startTime, ms: entry.duration })))
      }).observe({ entryTypes: ['longtask'] })
      const link = WebGL2RenderingContext.prototype.linkProgram
      WebGL2RenderingContext.prototype.linkProgram = function (program) {
        window.startupPrograms++
        return link.call(this, program)
      }
      const parameter = WebGL2RenderingContext.prototype.getProgramParameter
      WebGL2RenderingContext.prototype.getProgramParameter = function (program, name) {
        const start = performance.now()
        const value = parameter.call(this, program, name)
        window.startupCompileMs += performance.now() - start
        return value
      }
    })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const frame = page.frameLocator('iframe[title="Agentville 小镇"]')
    await frame.locator('#gate[hidden]').waitFor({ state: 'attached', timeout: 120000 })
    const world = page.frames().find(item => new URL(item.url()).pathname.startsWith('/world/'))
    await world.waitForFunction(() => window.neighborState?.stage === 'ready', null, { timeout: 120000 })
    const result = await world.evaluate(() => {
      const marks = Object.fromEntries(performance.getEntriesByType('mark').map(entry => [entry.name, entry.startTime]))
      const canvas = document.querySelector('canvas')
      const gl = canvas.getContext('webgl2')
      const debug = gl.getExtension('WEBGL_debug_renderer_info')
      return {
        sceneMs: Math.round(marks['godot-scene-ready'] - marks['world-start']),
        playableMs: Math.round(marks['world-playable'] - marks['world-start']),
        regionsMs: Math.round(marks['godot-neighbors-ready'] - marks['world-start']),
        longestAfterStartMs: Math.max(0, ...window.startupTasks.filter(task => task.at >= marks['world-playable']).map(task => task.ms)),
        programs: window.startupPrograms,
        compileWaitMs: Math.round(window.startupCompileMs),
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      }
    })
    if (screenshot) {
      await page.getByRole('button', { name: '关闭居民面板', exact: true }).click({ timeout: 1500 }).catch(() => {})
      await page.screenshot({ path: screenshot })
    }
    return { fullMaterials, ...result }
  } finally {
    await page?.unrouteAll({ behavior: 'ignoreErrors' })
    await context.close()
  }
}
