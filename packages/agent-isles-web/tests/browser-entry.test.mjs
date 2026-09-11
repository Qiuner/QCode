import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { createBrowserEntry } from '../lib/types/browser-entry.js'

test('entry translates denial without exposing the app and preserves auth redirects', async () => {
  let renders = 0
  const handler = createBrowserEntry((req, res) => {
    if (req.url === '/?token=valid') {
      res.writeHead(303, { location: '/', 'set-cookie': 'test-cookie=valid', 'cache-control': 'no-store' }); res.end(); return false
    }
    if (req.headers.cookie === 'test-cookie=valid') return true
    res.writeHead(401, { 'content-type': 'text/plain' }); res.end('upstream denial'); return false
  }, async () => { renders++; return '<html>private app</html>' })
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const denied = await fetch(base)
    assert.equal(denied.status, 401)
    const help = await denied.text()
    assert.match(help, /这个浏览器需要重新连接/)
    assert.doesNotMatch(help, /\.cmd|token=|源码|项目文件夹/)
    assert.equal(renders, 0)
    const redirect = await fetch(base + '/?token=valid', { redirect: 'manual' })
    assert.equal(redirect.status, 303)
    assert.equal(redirect.headers.get('set-cookie'), 'test-cookie=valid')
    assert.equal(redirect.headers.get('location'), '/')
    const allowed = await fetch(base, { headers: { cookie: 'test-cookie=valid' } })
    assert.equal(await allowed.text(), '<html>private app</html>')
    const head = await fetch(base, { method: 'HEAD' })
    assert.equal(head.status, 401)
    assert.equal(await head.text(), '')
    assert.equal((await fetch(base, { method: 'POST' })).status, 405)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
