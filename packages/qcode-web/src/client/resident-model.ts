import type { SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ResidentId, ResidentStatus } from './world-bridge.js'
import type { QCodeTranslate } from './locales.js'

export const RESIDENTS = [
  { id: 'coordinator', name: '苔伯 · 项目管理', greeting: '先为作品选择一个项目文件夹，也可以继续已有项目。', action: '绑定项目' },
  { id: 'coder', name: 'Q · 计算机', greeting: '告诉我你想制作什么，我会在这个项目里动手实现。', action: '开始制作' },
  { id: 'teacher', name: '苔伯 · 项目与对话管理', greeting: '可以在这里选择或切换项目，也可以找回之前的项目和对话。', action: '查看项目与历史对话' },
  { id: 'file_keeper', name: '阿澜 · File Keeper', greeting: '我帮你查找项目文件，也可以打开指定文件看看。', action: '查看文件' },
] as const

export function localizedResidents(t: QCodeTranslate): readonly { id: ResidentId; name: string; greeting: string; action: string }[] {
  return [
    { id: 'coordinator', name: t('resident.coordinator.name'), greeting: t('resident.coordinator.greeting'), action: t('resident.coordinator.action') },
    { id: 'coder', name: t('resident.coder.name'), greeting: t('resident.coder.greeting'), action: t('resident.coder.action') },
    { id: 'teacher', name: t('resident.teacher.name'), greeting: t('resident.teacher.greeting'), action: t('resident.teacher.action') },
    { id: 'file_keeper', name: t('resident.fileKeeper.name'), greeting: t('resident.fileKeeper.greeting'), action: t('resident.fileKeeper.action') },
  ]
}

export function residentPrompt(id: ResidentId, text: string, locale: 'zh' | 'en' = 'zh'): string {
  const zhInstructions: Record<ResidentId, string> = {
    coder: '你是小镇的制作居民 Coder。先检查当前项目，再实现用户要求；运行适当验证，回答中分开说明修改文件、实际验证结果和未完成事项。不要把任务结束当成验证通过。',
    teacher: '苔伯负责项目与历史对话管理，操作通过原生管理界面完成。',
    file_keeper: '你是小镇的文件管理员 File Keeper。本轮只读。必须实际使用文件工具，列目录时给出真实相对路径，读取时展示实际内容。不要编造文件、不要修改或删除文件，不要主动读取密钥或凭据文件。',
    coordinator: '这是苔伯负责的项目选择与切换入口。',
  }
  const enInstructions: Record<ResidentId, string> = {
    coder: 'You are Coder, the town resident who builds software. Inspect the current project before implementing the request. Run appropriate checks, then separately report changed files, checks actually run, and anything unfinished. A completed task is not proof that verification passed.',
    teacher: 'Uncle Moss manages projects and conversation history through the native management interface.',
    file_keeper: 'You are the town File Keeper. This turn is read-only. You must use file tools, give real relative paths when listing directories, and show actual content when reading. Do not invent, edit, or delete files, and do not proactively read secrets or credential files.',
    coordinator: 'This is Uncle Moss\'s project selection and switching entrance.',
  }
  return `${locale === 'zh' ? zhInstructions[id] : enInstructions[id]}\n\n${locale === 'zh' ? '用户请求：' : 'User request:'}\n${text}`
}

export function residentEventStatus(entries: readonly SessionEventLikeEntry[]): ResidentStatus {
  for (let index = entries.length - 1; index >= 0; index--) {
    const event = entries[index]!.event
    if (event.type === 'turn/end') return event.data.reason.kind === 'completed' ? 'completed' : 'failed'
    if (event.type === 'turn/start') return 'working'
  }
  return 'idle'
}

export function projectResidentEvents(entries: readonly SessionEventLikeEntry[]) {
  const messages: { key: string; text: string; role: 'user' | 'assistant' }[] = []
  const history: typeof messages = []
  const tools: { key: string; name: string; arguments: string; result?: string; failed?: boolean }[] = []
  let status: ResidentStatus = 'idle'
  let outcome = ''
  let live = ''
  let ended: { seq: number; failed: boolean; worked: boolean } | undefined
  for (const { event } of entries) {
    if (event.type === 'turn/start') {
      history.push(...messages); messages.length = 0
      status = 'working'; outcome = ''; live = ''; tools.length = 0
    }
    if (event.type === 'assistant/message') {
      const text = event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
      if (text) messages.push({ key: String(event.seq), text, role: 'assistant' })
    }
    if (event.type === 'user/message' && event.data.source.kind === 'user') {
      let text = event.data.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
      const prefix = RESIDENTS.flatMap(resident => [residentPrompt(resident.id, '', 'zh'), residentPrompt(resident.id, '', 'en')]).find(prefix => text.startsWith(prefix))
      if (prefix) text = text.slice(prefix.length)
      if (text) messages.push({ key: String(event.seq), text, role: 'user' })
    }
    if (event.type === 'assistant/live-chunk' && event.data.chunk.type === 'text-delta') live += event.data.chunk.text
    if (event.type === 'tool/call') tools.push({ key: event.data.callId, name: event.data.name, arguments: event.data.arguments })
    if (event.type === 'tool/result') {
      const tool = tools.find(tool => tool.key === event.data.message.source.callId)
      if (tool) {
        const result = event.data.message.content[0]
        tool.result = result.content.filter(block => block.type === 'text').map(block => block.text).join('\n') || '工具已返回非文本结果，请在高级工作台查看。'
        tool.failed = !!event.data.error || !!result.isError
      }
    }
    if (event.type === 'turn/end') {
      const reason = event.data.reason
      ended = { seq: event.seq, failed: reason.kind !== 'completed', worked: tools.length > 0 }
      status = reason.kind === 'completed' ? 'completed' : 'failed'
      outcome = reason.kind === 'completed' ? '本轮已结束' : reason.kind === 'error' ? reason.error.message : `本轮未完成：${reason.kind}`
    }
  }
  return { messages, history, tools, status, outcome, live, ended }
}

/** Browser drafts contain only user text, never model credentials. */
export function readResidentDrafts(raw: string | null): Record<string, string> {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  } catch { return {} }
}
