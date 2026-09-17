// Runs the unchanged official shell + Host with an isolated resource-only plugin.
import { spawn, execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, readdir, symlink, copyFile } from 'node:fs/promises'
import { openSync, closeSync } from 'node:fs'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { buildDesktopPlugin } from './build-desktop-plugin.mjs'

assert.equal(process.platform, 'win32', 'This probe currently validates Windows only')
const root = resolve(import.meta.dirname, '..')
const preview = process.argv.includes('--preview')
const product = process.argv.includes('--product')
const pin = JSON.parse(await readFile(join(root, 'upstream.json'), 'utf8')).desktopTarget
const upstream = join(root, '.yarn/upstream-desktop', pin.commit)
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: upstream, encoding: 'utf8' }).trim(), pin.commit)
const output = join(root, 'dist/official-desktop-probe', String(Date.now()))
const app = join(output, 'app')
const project = join(app, '.desktop-build/development/project')
const modules = join(project, 'node_modules')
const template = join(upstream, 'apps/desktop/.desktop-build/development/project')
const world = join(root, 'games/mosslight/build/web')
await mkdir(modules, { recursive: true })
const link = async (source, target) => symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
// Reuse built packages, without writing into upstream's development profile.
for (const entry of await readdir(join(template, 'node_modules'), { withFileTypes: true })) {
  if (entry.name === '.bin') continue
  const source = join(template, 'node_modules', entry.name)
  const dest = join(modules, entry.name)
  if (entry.name.startsWith('@')) {
    await mkdir(dest)
    for (const child of await readdir(source)) await link(join(source, child), join(dest, child))
  } else await link(source, dest)
}
const pluginName = 'agent-isles-desktop-world-probe'
const plugin = join(modules, pluginName)
await mkdir(plugin)
await writeFile(join(plugin, 'package.json'), JSON.stringify({ name: pluginName, version: '0.0.0', type: 'module', main: 'index.mjs' }))
await copyFile(join(root, 'scripts/fixtures/desktop-world-plugin/index.mjs'), join(plugin, 'index.mjs'))
await copyFile(join(root, 'scripts/fixtures/desktop-world-plugin/preview.html'), join(plugin, 'preview.html'))
await copyFile(join(root, 'scripts/fixtures/desktop-world-plugin/workbench.js'), join(plugin, 'workbench.js'))
const files = (await readdir(world, { recursive: true, withFileTypes: true })).filter(e => e.isFile()).map(e => resolve(e.parentPath, e.name).slice(world.length + 1).replaceAll('\\', '/'))
assert(files.includes('index.html') && files.includes('index.wasm') && files.includes('neighbors.pck'), 'Export the complete world first')
await writeFile(join(plugin, 'world-manifest.json'), JSON.stringify({ root: world, files }))
const profile = JSON.parse(await readFile(join(template, 'package.json'), 'utf8'))
profile.dependencies[pluginName] = '0.0.0'
if (product) {
  await buildDesktopPlugin(root, upstream, modules, output)
  profile.dependencies['@agent-isles/web-plugin'] = '0.0.0'
  await writeFile(join(plugin, 'brand-root.json'), JSON.stringify(join(output, 'brand')))
}
await writeFile(join(project, 'package.json'), JSON.stringify(profile))
await writeFile(join(project, 'cordis.patch.yml'), JSON.stringify([{ insert: [{ id: pluginName, name: pluginName }, ...(product ? [{ id: 'agent-isles', name: '@agent-isles/web-plugin' }] : [])] }]))
const appManifest = JSON.parse(await readFile(join(upstream, 'apps/desktop/package.json'), 'utf8'))
await writeFile(join(app, 'package.json'), JSON.stringify(appManifest))
await link(join(upstream, 'apps/desktop/lib'), join(app, 'lib'))
await link(join(upstream, 'apps/desktop/renderer'), join(app, 'renderer'))
await link(join(upstream, 'apps/desktop/node_modules'), join(app, 'node_modules'))
const electron = join(upstream, 'apps/desktop/node_modules/electron/dist', process.platform === 'win32' ? 'electron.exe' : 'electron')
const log = openSync(join(output, 'shell.log'), 'a')
const child = spawn(electron, ['--remote-debugging-port=0', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--user-data-dir=${join(output, 'user-data')}`, app], {
  detached: preview, windowsHide: !preview, stdio: ['ignore', log, log], env: { ...process.env, DSH_HOME: join(output, 'home'), DSH_DESKTOP_NODE_BINARY: process.execPath, DSH_DESKTOP_HOST_INSPECT_PORT: '19330', DSH_DESKTOP_OPEN_DEVTOOLS: '0' },
})
closeSync(log)
let keepOpen = false
let exited = false
let spawnError
child.once('error', error => { spawnError = error; exited = true })
child.once('exit', () => { exited = true })
const delay = ms => new Promise(r => setTimeout(r, ms))
let socket
let sequence = 0
const pending = new Map()
const timings = {}
const deadline = Date.now() + 300000
async function rpc(method, params = {}) {
  const id = ++sequence
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method} ${params.expression?.slice(0, 90) ?? ''}`)) }, method === 'Browser.close' ? 5000 : 120000)
    pending.set(id, msg => { clearTimeout(timer); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result) })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const response = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails))
  return response.result.value
}
try {
  let port
  while (!port) {
    if (exited || Date.now() > deadline) throw spawnError ?? new Error('Official shell failed to start; see shell.log')
    try { port = Number((await readFile(join(output, 'user-data/DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch {}
    if (!port) await delay(500)
  }
  let page
  while (!page) {
    if (exited) throw new Error('Official shell exited before readiness')
    page = (await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())).find(t => t.type === 'page' && t.url.startsWith('dsh-app://app'))
    if (Date.now() > deadline) throw new Error('Official page not ready')
    if (!page) await delay(500)
  }
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  socket.onmessage = e => { const msg = JSON.parse(e.data); const receive = pending.get(msg.id); if (receive) { pending.delete(msg.id); receive(msg) } }
  console.log('Official page connected:', await evaluate('location.href'))
  while (!await evaluate(`!!window.__DSH_BOOT__`)) {
    if (Date.now() > deadline) throw new Error('Official frontend boot timed out')
    await delay(250)
  }
  if (product) {
    assert.equal(await evaluate(`__DSH_BOOT__.entries.some(e=>e.id==='@agent-isles/web-plugin')`), true)
    await evaluate(`(()=>{window.probeEvents=[];window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.source==='agent-isles-world')probeEvents.push(e.data)});})()`)
  }
  const resourceStart = Date.now()
  const checks = await evaluate(`(async()=>{
    const head=await fetch('/api/agent-isles/world/index.wasm',{method:'HEAD'});
    const missing=await fetch('/api/agent-isles/world/not-exported.pck');
    const outside=await fetch('/api/agent-isles/package.json');
    return {wasmStatus:head.status,mime:head.headers.get('content-type'),headBytes:(await head.arrayBuffer()).byteLength,missing:missing.status,outside:outside.status,origin:location.origin};
  })()`)
  console.log('Resource checks:', checks)
  assert.deepEqual(checks, { wasmStatus: 200, mime: 'application/wasm', headBytes: 0, missing: 404, outside: 404, origin: 'dsh-app://app' })
  timings.resourceChecksMs = Date.now() - resourceStart
  const cancelStart = Date.now()
  const cancellation = await evaluate(`(async()=>{
    const controller=new AbortController();
    const response=await fetch('/api/agent-isles/world/index.pck',{signal:controller.signal});
    const reader=response.body.getReader();await reader.read();controller.abort();
    let aborted=false;try{while(!(await reader.read()).done){}}catch(e){aborted=e.name==='AbortError'}
    const after=await fetch('/api/agent-isles/world/index.html');await after.arrayBuffer();
    return {aborted,afterCancel:after.status};
  })()`)
  assert.deepEqual(cancellation, { aborted: true, afterCancel: 200 })
  timings.cancellationMs = Date.now() - cancelStart
  console.log('Cancellation checks:', cancellation)
  const worldStart = Date.now()
  if (!product) await rpc('Page.navigate', { url: 'dsh-app://app/api/agent-isles/preview' })
  await rpc('Page.bringToFront')
  // Keep the unattended validation advancing while the user works in another app.
  await rpc('Emulation.setFocusEmulationEnabled', { enabled: true })
  console.log('World iframe attached; waiting for playable and neighbors')
  let events
  do {
    if (exited || Date.now() > deadline) throw new Error('World readiness timeout')
    await delay(1000)
    events = await evaluate('window.probeEvents ?? []')
  } while (!events.some(e => e.type === 'world:playable') || !events.some(e => e.type === 'world:regions' && e.payload?.stage === 'ready'))
  timings.worldMs = Date.now() - worldStart
  const interaction = product ? await evaluate(`(async()=>{
    const frame=document.querySelector('.town-shell iframe'),original=frame.contentDocument;
    frame.contentWindow.eval('parent.postMessage({source:"agent-isles-world",version:1,type:"resident:selected",payload:{residentId:"coder"}},location.origin)');
    await new Promise(r=>setTimeout(r,500));
    const opened=!!document.querySelector('.town-conversation,.town-model-settings');
    const seat=document.querySelector('.town-native-chat-seat');
    if(seat){
      const input=document.querySelector('[data-composer-input]');
      if(!input||getComputedStyle(input).visibility!=='visible')throw new Error('Native chat input is hidden');
      const a=input.getBoundingClientRect(),b=seat.getBoundingClientRect();
      if(a.width<=0||a.left<b.left-1||a.right>b.right+1||a.top<b.top||a.bottom>b.bottom)throw new Error('Native chat input is outside its panel');
    }
    const text=document.body.innerText.slice(0,1500);
    return {product:!!document.querySelector('.town-shell'),opened,retained:original===frame.contentDocument,text};
  })()`) : await evaluate(`(async()=>{
    const world=document.querySelector('#world-probe'),worldDocument=world.contentDocument;
    const panel=document.querySelector('#preview-workbench'),chat=panel.querySelector('iframe');
    const message={source:'agent-isles-world',version:1,type:'resident:selected',payload:{residentId:'coder'}};
    window.postMessage(message,location.origin);await new Promise(r=>setTimeout(r,50));
    const rejectedForeignSource=panel.hidden;
    world.contentWindow.eval('parent.postMessage('+JSON.stringify(message)+',location.origin)');
    const until=Date.now()+30000;
    while(!chat.contentDocument?.body?.innerText.includes('DSH')&&Date.now()<until)await new Promise(r=>setTimeout(r,100));
    const opened=!panel.hidden&&chat.contentDocument.body.innerText.includes('DSH');
    const chatDocument=chat.contentDocument;
    panel.querySelector('button').click();
    const returned=panel.hidden&&world.contentDocument===worldDocument;
    world.contentWindow.eval('parent.postMessage('+JSON.stringify(message)+',location.origin)');
    await new Promise(r=>setTimeout(r,50));
    const retained=!panel.hidden&&chat.contentDocument===chatDocument;
    panel.querySelector('button').click();
    return {rejectedForeignSource,opened,returned,retained};
  })()`)
  if (product) { assert.equal(interaction.product, true); assert.equal(interaction.opened, true); assert.equal(interaction.retained, true) }
  else assert.deepEqual(interaction, { rejectedForeignSource: true, opened: true, returned: true, retained: true })
  const result = { commit: pin.commit, checks, cancellation, timings, interaction, events, officialShell: true, officialHostPipe: true }
  await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2))
  const screenshot = await rpc('Page.captureScreenshot')
  await writeFile(join(output, 'preview.png'), Buffer.from(screenshot.data, 'base64'))
  keepOpen = preview
  console.log(`Official Desktop pipe probe passed: ${output}`)
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    if (!keepOpen) await rpc('Browser.close').catch(() => {})
    socket.close()
  }
  if (keepOpen) child.unref()
  else {
    for (let i = 0; !exited && i < 20; i++) await delay(250)
    if (!exited) child.kill()
  }
}
