import type { Context } from '@deepseek-ai/cordis'
import { defineDomain, domainTable, type KvTable } from '@deepseek-ai/dsh-storage-domain'
import { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-fs'
import type { SessionId, SessionEvent } from '@deepseek-ai/dsh-session'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { mkdir, realpath, stat } from 'node:fs/promises'
import { resolve, isAbsolute } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { TutorialRun } from './tutorial-types.js'

const id = z.string().regex(/^[\w-]{1,160}$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value))
export const tutorialSchema = z.object({
  id, version: z.literal(1), revision: z.number().int().nonnegative(), updatedAt: z.number(),
  workspaceId: id.optional(), projectName: z.string().max(80), draft: z.string().max(12000),
  step: z.enum(['idea', 'folder', 'build', 'inspect', 'improve', 'review', 'return', 'complete']),
  paused: z.boolean(), encounterSeen: z.boolean(), left: z.boolean(), returned: z.boolean(),
  assistance: z.array(z.string().max(80)).max(80),
  submission: z.object({ sessionId: id, requestId: id, text: z.string().max(16000), from: z.number().int(), stage: z.enum(['build', 'improve']) }).optional(),
  evidence: z.object({ sessionId: id, endSeq: z.number(), hash: z.string(), checkedAt: z.number() }).optional(),
  firstHash: z.string().optional(), receipt: z.object({ id, fingerprint: z.string() }).optional(),
})
export const tutorialDomain = defineDomain({ name: 'agent_isles_tutorials', version: 1, tables: { runs: domainTable<string, TutorialRun>(tutorialSchema) } })
const commandSchema = z.object({ action: z.enum(['start', 'draft', 'idea', 'bind', 'pause', 'resume', 'seen', 'submit', 'followup', 'retry', 'revise', 'check', 'confirm', 'assist', 'leave', 'returned', 'complete']), requestId: id, runId: id.optional(), revision: z.number().int().nonnegative().optional(),
  draft: z.string().max(12000).optional(), projectName: z.string().trim().min(1).max(80).optional(), workspaceId: id.optional(),
  folder: z.string().max(2048).optional(), create: z.boolean().optional(), sessionId: id.optional(), submissionId: id.optional(), text: z.string().max(16000).optional(), assistance: z.enum(['提示方向', '共同完成', '代做并讲解']).optional(),
}).strict()

export class TutorialError extends Error { constructor(message: string, readonly status = 409) { super(message) } }

/** Serializes cross-record uniqueness and external preparation; the domain owns durability. */
export function createTutorialHandler(ctx: Context, runs: KvTable<string, TutorialRun>) {
  let tail: Promise<unknown> = Promise.resolve()
  let closing = false
  const lifetime = new AbortController()
  const workspaceFor = (run: TutorialRun) => {
    const workspace = run.workspaceId && ctx.workspaceRegistry.get(WorkspaceId(run.workspaceId))
    if (!workspace) throw new TutorialError('原项目已不可用，请先恢复项目。')
    return workspace
  }
  const eventsFor = async (sessionId: string): Promise<readonly SessionEvent[]> => {
    const live = ctx.sessions.get(sessionId as SessionId)
    if (live) return live.snapshotEvents()
    const handle = await ctx.sessionPersistence.open(sessionId as SessionId, 'read', { signal: lifetime.signal })
    try { return await handle.read(0, undefined, { signal: lifetime.signal }) } finally { await handle.close() }
  }
  const artifact = async (run: TutorialRun) => {
    const workspace = workspaceFor(run)
    const root = await ctx.fs.resolve(workspace.path, { signal: lifetime.signal })
    const target = await ctx.fs.resolve('index.html', { cwd: workspace.path, signal: lifetime.signal })
    if (!ctx.fs.contains(root, target)) throw new TutorialError('作品文件必须位于当前项目内。', 400)
    const bytes = await ctx.fs.readBytes(target, lifetime.signal, 1024 * 1024)
    return { html: new TextDecoder().decode(bytes), hash: createHash('sha256').update(bytes).digest('hex') }
  }
  const runCommand = async (input: unknown) => {
    const cmd = commandSchema.parse(input)
    const fingerprint = JSON.stringify({ ...cmd, requestId: undefined, revision: undefined })
    let run = cmd.runId ? runs.get(cmd.runId) : undefined
    if (cmd.action === 'start') {
      const existing = runs.get(cmd.requestId)
      if (existing) return existing
      run = { id: cmd.requestId, version: 1, revision: 0, updatedAt: Date.now(), projectName: '我的待办清单', draft: '', step: 'idea', paused: false, encounterSeen: false, left: false, returned: false, assistance: [] }
    } else {
      if (!run) throw new TutorialError('学习记录不存在。', 404)
      if (run.receipt?.id === cmd.requestId) {
        if (run.receipt.fingerprint !== fingerprint) throw new TutorialError('重复请求的内容不一致。')
        return run
      }
      if (run.revision !== cmd.revision) throw new TutorialError('学习记录已在其他页面更新，请重新读取后继续。')
      run = structuredClone(run)
      if (run.paused && !['resume', 'draft'].includes(cmd.action)) throw new TutorialError('请先继续教程。')
    }
    switch (cmd.action) {
      case 'draft':
        if (cmd.draft === undefined) throw new TutorialError('缺少草稿。', 400)
        run.draft = cmd.draft; break
      case 'idea':
        if (run.step !== 'idea' || !cmd.draft?.trim()) throw new TutorialError('先告诉Qiuner想做什么。')
        run.draft = cmd.draft; run.step = 'folder'; break
      case 'seen': run.encounterSeen = true; break
      case 'bind': {
        if (run.step !== 'folder') throw new TutorialError('当前不在项目准备步骤。')
        let workspace = cmd.workspaceId ? ctx.workspaceRegistry.get(WorkspaceId(cmd.workspaceId)) : undefined
        if (!workspace) {
          if (!cmd.folder || !isAbsolute(cmd.folder)) throw new TutorialError('请选择一个有效的绝对目录。', 400)
          const parent = await realpath(cmd.folder)
          if (!(await stat(parent)).isDirectory()) throw new TutorialError('所选位置不是文件夹。', 400)
          let folder = parent
          if (cmd.create) {
            if (!cmd.projectName || !/^[^<>:"/\\|?*\x00-\x1f]+$/.test(cmd.projectName) || /[. ]$/.test(cmd.projectName) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cmd.projectName)) throw new TutorialError('请使用有效的项目文件夹名称。', 400)
            // Never claim an existing directory as newly created. An interrupted creation
            // can be recovered explicitly using the existing-folder option.
            folder = resolve(parent, `${cmd.projectName}-${run.id}`)
            try { await mkdir(folder) } catch (error) {
              if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new TutorialError(`目录已存在：${folder}。若是上次中断创建的目录，请选择“继续已有文件夹”恢复。`)
              throw error
            }
            if (await realpath(folder) !== folder || !(await stat(folder)).isDirectory()) throw new TutorialError('项目目录发生变化，请重新选择。')
          }
          workspace = await ctx.workspaceRegistry.create(folder, cmd.projectName)
        }
        if (!workspace) throw new TutorialError('项目已不可用。')
        if ([...runs.entries()].some(([key, item]) => key !== run!.id && item.workspaceId === workspace!.id && item.step !== 'complete')) throw new TutorialError('这个项目已有未完成教程，请从工作记录继续。')
        run.workspaceId = workspace.id; run.projectName = workspace.title; run.step = 'build'; break
      }
      case 'pause': run.paused = true; break
      case 'resume': run.paused = false; break
      case 'submit':
      case 'followup': {
        if (!['build', 'improve'].includes(run.step) || (cmd.action === 'submit' ? !!run.submission : !run.submission)) throw new TutorialError('请先核对当前制作结果，避免重复发送。')
        if (!cmd.sessionId || !cmd.submissionId || !cmd.text?.trim()) throw new TutorialError('提交信息不完整。', 400)
        const workspace = workspaceFor(run)
        if (!workspace.sessionIds.includes(cmd.sessionId as SessionId)) throw new TutorialError('会话不属于这个项目。', 400)
        const events = await eventsFor(cmd.sessionId)
        if (cmd.action === 'followup') {
          const previous = run.submission!
          if (previous.sessionId !== cmd.sessionId) throw new TutorialError('请在原会话回答Qiuner。', 400)
          const index = events.findIndex(event => event.type === 'user/message' && 'rpcId' in event.data.source && event.data.source.rpcId === previous.requestId)
          const start = events.slice(0, index).reverse().find(event => event.type === 'turn/start')
          if (index < 0 || start?.type !== 'turn/start' || !events.some(event => event.type === 'turn/end' && event.data.turn === start.data.turn)) throw new TutorialError('Qiuner仍在执行或等待审批，请先处理当前请求。')
        }
        run.submission = { sessionId: cmd.sessionId, requestId: cmd.submissionId, text: cmd.text, from: events.length, stage: run.step as 'build' | 'improve' }
        run.evidence = undefined
        break
      }
      case 'retry': {
        if (!run.submission) break
        const events = (await eventsFor(run.submission.sessionId)).slice(run.submission.from)
        const userIndex = events.findIndex(event => event.type === 'user/message' && event.data.source.kind === 'user' && 'rpcId' in event.data.source && event.data.source.rpcId === run!.submission!.requestId)
        const start = events.slice(0, userIndex).reverse().find(event => event.type === 'turn/start')
        const end = start?.type === 'turn/start' ? events.find(event => event.type === 'turn/end' && event.data.turn === start.data.turn) : undefined
        if (userIndex < 0 || !end || end.type !== 'turn/end' || end.data.reason.kind === 'completed') throw new TutorialError('提交结果尚不能确认；请在原会话查看或停止本轮，不能自动重发。')
        run.submission = undefined; break
      }
      case 'revise':
        if (!['inspect', 'review'].includes(run.step)) throw new TutorialError('先核对作品，再描述需要修正的问题。')
        run.step = run.step === 'inspect' ? 'build' : 'improve'
        run.submission = undefined; run.evidence = undefined
        run.draft = cmd.draft ?? '我进行了……操作，实际出现……，我希望……。'
        break
      case 'check': {
        if (cmd.sessionId) {
          const workspace = workspaceFor(run)
          if (!['build', 'improve'].includes(run.step) || !workspace.sessionIds.includes(cmd.sessionId as SessionId)) throw new TutorialError('请在当前项目的制作会话检查成果。')
          const events = await eventsFor(cmd.sessionId)
          const user = [...events].reverse().find(event => event.type === 'user/message' && event.data.source.kind === 'user')
          if (!user || user.type !== 'user/message' || !('rpcId' in user.data.source) || !user.data.source.rpcId) throw new TutorialError('先在对话框发送本轮需求。')
          const requestId = String(user.data.source.rpcId)
          if (run.evidence && user.seq <= run.evidence.endSeq) throw new TutorialError('请先发送新的修改需求。')
          run.submission = { sessionId: cmd.sessionId, requestId, text: user.data.content.filter(block => block.type === 'text').map(block => block.text).join('\n').slice(0, 16000), from: 0, stage: run.step as 'build' | 'improve' }
        }
        const submission = run.submission
        if (!submission || !['build', 'improve', 'inspect', 'review'].includes(run.step)) throw new TutorialError('先发送这一轮需求。')
        const workspace = workspaceFor(run)
        if (!workspace.sessionIds.includes(submission.sessionId as SessionId)) throw new TutorialError('原会话已不属于当前项目。')
        const events = (await eventsFor(submission.sessionId)).slice(submission.from)
        const userIndex = events.findIndex(event => event.type === 'user/message' && event.data.source.kind === 'user' && 'rpcId' in event.data.source && event.data.source.rpcId === submission.requestId)
        const start = events.slice(0, userIndex).reverse().find(event => event.type === 'turn/start')
        const end = start?.type === 'turn/start' ? events.find(event => event.type === 'turn/end' && event.data.turn === start.data.turn) : undefined
        if (userIndex < 0 || !end || end.type !== 'turn/end' || end.data.reason.kind !== 'completed') throw new TutorialError('本轮尚未确认完成，请查看执行或等待后再检查。')
        if (!events.some(event => event.type === 'tool/result' && event.data.turn === end.data.turn && !event.data.error && !event.data.message.content[0].isError)) throw new TutorialError('还没有可核对的工具执行记录，请让Qiuner实际制作并验证。')
        await ctx.sessionPersistence.flush()
        const result = await artifact(run)
        if (!/<(?:html|body|!doctype)\b/i.test(result.html)) throw new TutorialError('项目根目录还没有可预览的 HTML 作品。')
        if (submission.stage === 'improve' && result.hash === run.firstHash) throw new TutorialError('作品与第一次检查相同，请确认改动已保存到 index.html。')
        run.evidence = { sessionId: submission.sessionId, endSeq: end.seq, hash: result.hash, checkedAt: Date.now() }
        run.step = submission.stage === 'build' ? 'inspect' : 'review'; run.draft = ''
        break
      }
      case 'confirm':
        if (!run.evidence || !['inspect', 'review'].includes(run.step)) throw new TutorialError('先核对本轮作品。')
        if ((await artifact(run)).hash !== run.evidence.hash) throw new TutorialError('作品已经变化，请回到Qiuner重新核对，不能确认旧预览。')
        if (run.step === 'inspect') { run.firstHash = run.evidence.hash; run.step = 'improve' } else run.step = 'return'
        run.submission = undefined
        break
      case 'assist':
        if (cmd.assistance && run.assistance.length < 80) run.assistance.push(`${run.step}:${cmd.assistance}`)
        break
      case 'leave': if (run.step !== 'return') throw new TutorialError('先完成一次自己的改动。'); run.left = true; break
      case 'returned': if (run.step === 'return' && run.left) run.returned = true; break
      case 'complete': if (run.step !== 'return' || !run.returned) throw new TutorialError('先从工作记录找回项目。'); run.step = 'complete'; break
    }
    run.revision++; run.updatedAt = Date.now(); run.receipt = { id: cmd.requestId, fingerprint }
    const value = tutorialSchema.parse(run)
    await runs.put(run.id, value)
    return value
  }
  return {
    async handle(req: IncomingMessage, res: ServerResponse) {
      const reply = (status: number, body: unknown) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)) }
      if (closing) { reply(503, { error: '教程服务正在关闭。' }); return }
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(req.headers.host ?? '') || req.headers['x-agent-isles-tutorial'] !== '1' || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) { reply(403, { error: '请求来源无效。' }); return }
      try {
        if (req.method === 'GET') { await tail; reply(200, [...runs.entries()].map(([, run]) => run)); return }
        if (req.method !== 'POST') { reply(405, {}); return }
        let body = ''
        for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 64000) { reply(413, {}); return } }
        const input = JSON.parse(body)
        const operation = tail.then(async () => {
          if (closing) throw new TutorialError('教程服务正在关闭。', 503)
          if (input.action === 'preview') { const run = runs.get(id.parse(input.runId)); if (!run?.workspaceId) throw new TutorialError('请先绑定项目。'); return artifact(run) }
          return runCommand(input)
        })
        tail = operation.catch(() => {})
        reply(200, await operation)
      } catch (error) { reply(error instanceof TutorialError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500, { error: error instanceof TutorialError ? error.message : '教程读取或保存失败，请检查项目与连接后重试。' }) }
    },
    async close() { closing = true; lifetime.abort(); await tail },
  }
}

export const inject = ['webServer', 'storageDomain', 'workspaceRegistry', 'sessions', 'sessionPersistence', 'fs']
export async function apply(ctx: Context) {
  const domain = await ctx.storageDomain.open(tutorialDomain)
  ctx.effect(() => () => domain.close(), 'tutorial: close storage')
  const handler = createTutorialHandler(ctx, domain.table('runs'))
  ctx.effect(() => () => handler.close(), 'tutorial: drain requests')
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: '/agent-isles/tutorial', handler: handler.handle }), 'tutorial: endpoint')
}
