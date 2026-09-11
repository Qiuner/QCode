import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { supervise } from '../src/supervise.mjs'

async function fixture(t, source) {
  const home = await mkdtemp(path.join(tmpdir(), 'isles-supervisor-'))
  t.after(() => rm(home, { recursive: true, force: true }))
  const script = path.join(home, 'child.mjs')
  await writeFile(script, source)
  const controller = new AbortController()
  t.after(() => controller.abort())
  return { home, controller, options: { command: process.execPath, args: [script], home, cwd: home, env: process.env, signal: controller.signal, delays: [10, 10, 10] } }
}

test('crash loop stops after three restarts and logs exits', async t => {
  const f = await fixture(t, 'process.exit(7)')
  assert.equal(await supervise(f.options), 1)
  const log = await readFile(path.join(f.home, 'service.log'), 'utf8')
  assert.equal((log.match(/start pid=/g) ?? []).length, 4)
  assert.equal((log.match(/code=7/g) ?? []).length, 4)
  assert.match(log, /restart limit reached/)
})

test('normal exit is not restarted', async t => {
  const f = await fixture(t, 'process.exit(0)')
  assert.equal(await supervise(f.options), 0)
  assert.doesNotMatch(await readFile(path.join(f.home, 'service.log'), 'utf8'), /restart scheduled/)
})

test('restart retains allocated port, suppresses browser reopen and redacts token', async t => {
  const f = await fixture(t, `import {existsSync,writeFileSync} from 'node:fs';
if (!existsSync('attempt')) { writeFileSync('attempt','1'); console.log('dsh web: http://127.0.0.1:43219/?token=privateToken'); process.exitCode=1; }
else { writeFileSync('args.json', JSON.stringify(process.argv)); }
`)
  f.options.args.push('--port', '0')
  assert.equal(await supervise(f.options), 0)
  const args = JSON.parse(await readFile(path.join(f.home, 'args.json'), 'utf8'))
  assert.equal(args[args.indexOf('--port') + 1], '43219')
  assert.ok(args.includes('--no-open'))
  assert.doesNotMatch(await readFile(path.join(f.home, 'service.log'), 'utf8'), /privateToken/)
})

test('requested stop terminates the child without restart', async t => {
  const f = await fixture(t, `console.log('ready'); setInterval(()=>{},1000)`)
  const result = await supervise({ ...f.options, onLine: line => { if (line === 'ready') f.controller.abort() } })
  assert.equal(result, 0)
  const log = await readFile(path.join(f.home, 'service.log'), 'utf8')
  assert.match(log, /requested=true/)
  assert.doesNotMatch(log, /restart scheduled/)
})

test('stop during backoff cancels the scheduled restart', async t => {
  const f = await fixture(t, 'process.exit(2)')
  await supervise({ ...f.options, onLine: line => { if (line.includes('重试')) f.controller.abort() } })
  const log = await readFile(path.join(f.home, 'service.log'), 'utf8')
  assert.equal((log.match(/start pid=/g) ?? []).length, 1)
})
