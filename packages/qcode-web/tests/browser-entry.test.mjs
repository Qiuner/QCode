import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer, request } from 'node:http'
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

test('localhost redirects GET and HEAD before authentication, preserving path, port and token', async () => {
  let authenticated = 0
  const handler = createBrowserEntry((_req, res) => {
    authenticated++; res.writeHead(401); res.end(); return false
  }, async () => 'private')
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const send = (host, method = 'GET') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: '/workbench?token=example&view=chat', method, headers: { host } }, res => {
      let body = ''; res.on('data', chunk => { body += chunk }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject); req.end()
  })
  try {
    for (const method of ['GET', 'HEAD']) {
      const response = await send(`localhost:${port}`, method)
      assert.equal(response.status, 307)
      assert.equal(response.headers.location, `http://127.0.0.1:${port}/workbench?token=example&view=chat`)
      assert.equal(response.headers['cache-control'], 'no-store')
      assert.equal(response.headers['referrer-policy'], 'no-referrer')
      assert.equal(response.headers['set-cookie'], undefined)
      assert.equal(response.body, '')
    }
    assert.equal(authenticated, 0)
    assert.equal((await send(`localhost:${port}`, 'POST')).status, 405)
    for (const host of [`127.0.0.1:${port}`, `localhost.example:${port}`]) {
      const response = await send(host)
      assert.equal(response.status, 401)
      assert.equal(response.headers.location, undefined)
    }
    assert.equal(authenticated, 2)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
