// Isolated Electron protocol probe. This is not the official Desktop Host.
const { app, BrowserWindow, protocol } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')
const { createRequire } = require('node:module')
const { pathToFileURL } = require('node:url')
const root = path.resolve(__dirname, '..')
const sharedFetch = process.argv.includes('--shared-fetch')
const worldPath = sharedFetch ? '/api/qcode/world/' : '/world/'
const output = path.join(root, 'dist', sharedFetch ? 'desktop-shared-fetch-probe' : 'desktop-world-probe')
app.setPath('userData', path.join(output, `user-data-${process.pid}`))
protocol.registerSchemesAsPrivileged([{ scheme: 'dsh-app', privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: false, stream: true, codeCache: true,
} }])
const events = []
const requests = []
const routeChecks = {}
const html = `<!doctype html><body><iframe src="${worldPath}index.html?embed=1" style="width:100%;height:90vh"></iframe><script>
window.probeEvents=[];
const frame=document.querySelector('iframe');
window.addEventListener('message', e=>{
  if(e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.source!=='qcode-world'||e.data?.version!==1)return;
  probeEvents.push({origin:e.origin,type:e.data?.type,payload:e.data?.payload});
  if(e.data?.type==='world:ready')frame.contentWindow.postMessage({source:'qcode-host',version:1,type:'world:init',payload:{locale:'en',workspace:null,sessionId:null,panelOpen:false,residents:[]}},location.origin);
});
</script>`
app.whenReady().then(async () => {
  await fs.mkdir(output, { recursive: true })
  const base = await fs.realpath(path.join(root, 'games/mosslight/build/web'))
  const serve = async request => {
    const url = new URL(request.url)
    const target = path.resolve(base, decodeURIComponent(url.pathname.slice(worldPath.length)) || 'index.html')
    if (!target.startsWith(base + path.sep)) return new Response(null, { status: 403 })
    try {
      const real = await fs.realpath(target)
      if (!real.startsWith(base + path.sep)) return new Response(null, { status: 403 })
      const bytes = await fs.readFile(real)
      requests.push({ path: url.pathname, bytes: bytes.length })
      return new Response(request.method === 'HEAD' ? null : bytes, { headers: { 'content-type': ({ '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.webp': 'image/webp' })[path.extname(target)] || 'application/octet-stream' } })
    } catch { return new Response(null, { status: 404 }) }
  }
  let handler
  let ctx
  if (sharedFetch) {
    const target = JSON.parse(await fs.readFile(path.join(root, 'upstream.json'), 'utf8')).desktopTarget
    const upstreamRequire = createRequire(path.join(root, '.yarn/upstream-desktop', target.commit, 'apps/desktop-host/package.json'))
    const { Context } = await import(pathToFileURL(upstreamRequire.resolve('@deepseek-ai/cordis')).href)
    const { HostConnectionService } = await import(pathToFileURL(upstreamRequire.resolve('@deepseek-ai/dsh-client-connection')).href)
    ctx = new Context()
    // The isolated carrier supplies no browser authentication. This tests route
    // registration/dispatch, not the official Web or Desktop trust boundary.
    const connection = new HostConnectionService(ctx, [], {})
    for (const entry of await fs.readdir(base, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue
      const relative = path.relative(base, path.join(entry.parentPath, entry.name)).split(path.sep).map(encodeURIComponent).join('/')
      connection.fetch.register({ path: worldPath + relative, methods: ['GET', 'HEAD'], requestBody: 'buffered', fetch: serve })
    }
    handler = connection.createSharedFetchHandler('/api')
    const missing = await handler.fetch(new Request('dsh-app://app' + worldPath + 'missing.pck'))
    if (missing.status !== 404) throw new Error('Unregistered resources must return 404')
    const head = await handler.fetch(new Request('dsh-app://app' + worldPath + 'index.wasm', { method: 'HEAD' }))
    if (head.status !== 200 || head.headers.get('content-type') !== 'application/wasm' || (await head.arrayBuffer()).byteLength !== 0) throw new Error('Invalid WASM HEAD response')
    const outside = await handler.fetch(new Request('dsh-app://app/api/qcode/package.json'))
    if (outside.status !== 404) throw new Error('Unregistered paths must not expose files')
    Object.assign(routeChecks, { missing: true, wasmHead: true, unregisteredPath: true })
  }
  protocol.handle('dsh-app', async request => {
    const url = new URL(request.url)
    if (url.hostname !== 'app') return new Response(null, { status: 404 })
    if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } })
    if (!url.pathname.startsWith(worldPath)) return new Response(null, { status: 404 })
    return handler ? handler.fetch(request) : serve(request)
  })
  const window = new BrowserWindow({ show: false, width: 1280, height: 800, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, offscreen: true } })
  window.webContents.on('console-message', (_event, level, message) => events.push({ level, message }))
  await window.loadURL('dsh-app://app/')
  // Embedded exports start automatically; observe without replaying clicks.
  const start = Date.now()
  const timer = setInterval(async () => {
    try {
      const result = await window.webContents.executeJavaScript(`(()=>{const f=document.querySelector('iframe');return {origin:location.origin,urlOrigin:new URL(location.href).origin,frameOrigin:f.contentWindow.location.origin,events:probeEvents}})()`)
      const neighborsReady = result.events.some(e => e.type === 'world:regions' && e.payload?.stage === 'ready')
      if (!neighborsReady && Date.now() - start < 120000) return
      clearInterval(timer)
      if (ctx) {
        await ctx.fiber.dispose()
        const disposed = await handler.fetch(new Request('dsh-app://app' + worldPath + 'index.html'))
        if (disposed.status !== 404) throw new Error('Disposed routes must be removed')
        routeChecks.disposal = true
      }
      await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ sharedFetch, routeChecks, electron: process.versions.electron, ...result, requests, console: events }, null, 2))
      console.log(JSON.stringify({ electron: process.versions.electron, origin: result.origin, playable: result.events.some(e => e.type === 'world:playable'), neighborsReady, requests: requests.length }))
      window.destroy()
      app.exit(result.events.some(e => e.type === 'world:playable') && neighborsReady ? 0 : 1)
    } catch (error) {
      clearInterval(timer)
      console.error(error)
      app.exit(1)
    }
  }, 1000)
}).catch(error => { console.error(error); app.exit(1) })
