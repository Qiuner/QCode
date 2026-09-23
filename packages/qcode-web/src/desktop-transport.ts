import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'

const desktopRequests = new WeakSet<object>()
/** Only the desktop Fetch carrier can grant this identity; no renderer header can. */
export function isDesktopRequest(request: IncomingMessage): boolean { return desktopRequests.has(request) }

/** Adapt the existing bounded JSON handlers, retaining their business validation. */
export function desktopJson(handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>) {
  return async (request: Request): Promise<Response> => {
    // 注册即 buffered：先整读请求体再进校验与业务。任何提前返回（403 等）或
    // finally destroy 若留下未消费的 body，取消帧会与 Electron main 在途数据帧竞态，
    // 触发官方 desktop-host 传输层 fatal，拖垮整个 Host 进程。
    const raw = request.body ? Buffer.from(await request.arrayBuffer()) : null
    const url = new URL(request.url)
    const origin = request.headers.get('origin')
    if (url.protocol !== 'dsh-app:' || url.host !== 'app' || (origin !== null && origin !== 'dsh-app://app')) return new Response(null, { status: 403 })
    const req = Object.assign(Readable.from(raw ? [raw] : []), {
      method: request.method, url: url.pathname + url.search, headers: Object.fromEntries(request.headers), socket: {},
    }) as unknown as IncomingMessage
    desktopRequests.add(req)
    let status = 200
    let headers: Record<string, string> = {}
    let body = ''
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      writeHead(code: number, values?: Record<string, string>) { status = code; headers = values ?? {}; return this },
      end(value = '') { body = value; return this },
    })
    const abort = () => { res.destroyed = true; res.emit('close'); req.destroy() }
    request.signal.addEventListener('abort', abort, { once: true })
    try {
      if (request.signal.aborted) throw request.signal.reason
      await handler(req, res as unknown as ServerResponse)
      return new Response(body, { status, headers })
    } finally {
      request.signal.removeEventListener('abort', abort)
      desktopRequests.delete(req)
      req.destroy()
    }
  }
}
