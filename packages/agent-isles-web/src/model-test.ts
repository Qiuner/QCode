import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { createMessage } from '@deepseek-ai/dsh-llm/message'
import type { GenerateOptions, LlmFailure } from '@deepseek-ai/dsh-llm/types'
import type { IncomingMessage, ServerResponse } from 'node:http'

export function modelFailureMessage(failure: Pick<LlmFailure, 'code' | 'status'>): string {
  if (failure.status === 401 || failure.status === 403 || failure.code === 'AUTH') return 'API Key 无效或没有访问权限'
  if (failure.status === 402) return '账户余额或额度不足'
  if (failure.status === 429 || failure.code === 'RATE_LIMIT') return '请求受限或额度不足，请检查服务商账户'
  if (failure.status === 404 || ['NO_ADAPTER', 'MODEL_NOT_FOUND'].includes(failure.code)) return '模型或 API 地址不可用'
  if (failure.code === 'ABORTED' || failure.code === 'TIMEOUT') return '连接测试超时或已取消'
  return '模型连接失败，请检查网络、API 地址和模型配置'
}

export interface ModelTestServices {
  llm: Pick<Context['llm'], 'stream'>
  webServer: Pick<Context['webServer'], 'port'>
  agentDefaultModel: { currentSelection(): Pick<GenerateOptions, 'provider' | 'model' | 'reasoningEffort'> }
}

export function createModelTestHandler(ctx: ModelTestServices) {
  let testing = false
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const reply = (status: number, message?: string) => {
      if (res.destroyed) return
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end(JSON.stringify({ ok: status === 200, ...(message ? { message } : {}) }))
    }
    if (req.method !== 'POST') { reply(405); return }
    // Only the local app origin may spend the local user's model quota.
    const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
    const origins = ['127.0.0.1', 'localhost', '[::1]'].map(host => `http://${host}:${ctx.webServer.port}`)
    if (!loopback || !origins.includes(req.headers.origin ?? '')
      || req.headers.origin !== `http://${req.headers.host}`
      || req.headers['content-type'] !== 'application/json') { reply(403); return }
    if (testing) { reply(409, '已有连接测试正在进行'); return }
    testing = true
    req.resume()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    const cancel = () => controller.abort()
    res.once('close', cancel)
    try {
      const selection = ctx.agentDefaultModel.currentSelection()
      let finished = false
      for await (const chunk of ctx.llm.stream({ ...selection, maxTokens: 32, tools: [], signal: controller.signal,
        messages: [createMessage({ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Reply with OK.' }] })],
      })) {
        if (chunk.type !== 'finish') continue
        if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
          reply(502, modelFailureMessage(chunk.reason.failure)); return
        }
        finished = chunk.reason.kind === 'stop' || chunk.reason.kind === 'max-tokens'
      }
      reply(finished ? 200 : 502, finished ? undefined : '模型未返回完整响应，请重试')
    } catch {
      // Provider diagnostics may contain request headers; never return raw errors.
      reply(502, controller.signal.aborted ? '连接测试超时或已取消' : '模型连接失败，请检查配置和网络')
    } finally {
      clearTimeout(timer); res.off('close', cancel); testing = false
    }
  }
}
