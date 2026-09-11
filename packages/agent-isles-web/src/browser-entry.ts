import type { IncomingMessage, ServerResponse } from 'node:http'

export const LOGIN_HELP = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>重新连接 · agent-isles</title><style>body{margin:0;background:#edf3ed;color:#254236;font:16px/1.8 system-ui,"Microsoft YaHei",sans-serif;display:grid;min-height:100vh;place-items:center}main{max-width:520px;margin:24px;padding:32px;background:#fff;border:1px solid #bed0bf;border-radius:12px}h1{font-size:24px}small{color:#667867}a{color:#226858}</style><main><small>agent-isles · 本地工作台</small><h1>这个浏览器需要重新连接</h1><p>服务正在运行，但当前浏览器的连接已失效，或尚未获得访问权限。</p><p>请从原来打开小岛的入口重新打开。如果入口由其他人提供，请向对方获取新的访问链接。</p><p><a href="/">已重新连接？返回小岛</a></p><small>重新连接不会清除已保存的项目和工作记录。</small></main></html>`

/** Canonicalize the local browser origin, then retain upstream authentication. */
export function createBrowserEntry(
  authorize: (req: IncomingMessage, response: { writeHead(status: number, headers?: Readonly<Record<string, string>>): unknown; end(body?: string): unknown }) => boolean,
  render: () => Promise<string>,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return }
    const localHost = /^localhost(?::(\d+))?$/i.exec(req.headers.host ?? '')
    if (localHost) {
      const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
      const origin = `http://127.0.0.1${localHost[1] ? `:${localHost[1]}` : ''}`
      res.writeHead(307, {
        location: `${origin}${requestUrl.pathname}${requestUrl.search}`,
        'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
      })
      res.end()
      return
    }
    let unauthorized = false
    const allowed = authorize(req, {
      writeHead(status, headers) {
        unauthorized = status === 401
        return res.writeHead(status, { ...headers, ...(unauthorized ? { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } : {}) })
      },
      end(body) { res.end(req.method === 'HEAD' ? undefined : unauthorized ? LOGIN_HELP : body) },
    })
    if (!allowed) return
    const html = await render()
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(req.method === 'HEAD' ? undefined : html)
  }
}
