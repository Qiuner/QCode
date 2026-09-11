import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ResidentState {
  projectId?: string
  sessions: Record<string, Partial<Record<'coder' | 'teacher' | 'file_keeper' | 'coordinator', string>>>
}

/** Stores only navigation and associations; DSH remains the owner of session history. */
export function createResidentStateHandler(file: string) {
  let writes: Promise<unknown> = Promise.resolve()
  const read = async (): Promise<ResidentState> => {
    try {
      const state = JSON.parse(await readFile(file, 'utf8')) as ResidentState
      if (!state || typeof state !== 'object' || !state.sessions || typeof state.sessions !== 'object' || Array.isArray(state.sessions)) throw new Error('Invalid recovery state')
      return state
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      return { sessions: {} }
    }
  }
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    // World assets are public; recovery data is restricted to same-origin app requests.
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
      || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(req.headers.host ?? '')
      || req.headers['x-agent-isles-state'] !== '1'
      || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) {
      reply(403, { error: '请求来源无效' }); return
    }
    try {
      if (req.method === 'GET') { await writes; reply(200, await read()); return }
      if (req.method !== 'POST') { reply(405, {}); return }
      let body = ''
      for await (const chunk of req) {
        body += chunk
        if (body.length > 4096) { reply(413, {}); return }
      }
      const update = JSON.parse(body) as { projectId?: unknown; residentId?: unknown; sessionId?: unknown }
      const validId = (value: unknown): value is string => typeof value === 'string'
        && /^[\w-]{1,160}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value)
      if (!validId(update.projectId) || (update.residentId !== undefined
        && (!['coder', 'teacher', 'file_keeper', 'coordinator'].includes(String(update.residentId)) || !validId(update.sessionId)))) {
        reply(400, {}); return
      }
      const operation = writes.then(async () => {
        const state = await read()
        if (update.residentId === undefined) state.projectId = update.projectId as string
        else {
          const project = update.projectId as string
          state.sessions[project] = { ...state.sessions[project], [String(update.residentId)]: update.sessionId }
        }
        await mkdir(dirname(file), { recursive: true })
        await writeFile(`${file}.tmp`, JSON.stringify(state), 'utf8')
        await rename(`${file}.tmp`, file)
        return state
      })
      writes = operation.catch(() => {})
      reply(200, await operation)
    } catch { reply(500, { error: '工作记录读取或保存失败，请重试' }) }
  }
}
