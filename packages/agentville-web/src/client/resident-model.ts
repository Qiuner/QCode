import type { SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ResidentId, ResidentStatus } from './world-bridge.js'

export const RESIDENTS = [
  { id: 'coordinator', name: '向导 · 项目接待', greeting: '欢迎来到小镇。先为你的项目选一个文件夹，我会安排大家在这里工作。', action: '绑定项目' },
  { id: 'coder', name: '芽芽 · Coder', greeting: '告诉我你想制作什么，我会在这个项目里动手实现。', action: '开始制作' },
  { id: 'teacher', name: '苔伯 · Teacher', greeting: '有什么不明白的？我们可以结合项目，一步一步来看。', action: '向老师提问' },
  { id: 'file_keeper', name: '阿澜 · File Keeper', greeting: '我帮你查找项目文件，也可以打开指定文件看看。', action: '查看文件' },
] as const

export function residentPrompt(id: ResidentId, text: string): string {
  const instructions: Record<ResidentId, string> = {
    coder: '你是小镇的制作居民 Coder。先检查当前项目，再实现用户要求；运行适当验证，回答中分开说明修改文件、实际验证结果和未完成事项。不要把任务结束当成验证通过。',
    teacher: '你是小镇的教学居民 Teacher。本轮只做讲解，可以读取相关项目文件；不要修改文件或执行有副作用的命令。用中文、具体例子和简短步骤回答，最后给一个可选练习。',
    file_keeper: '你是小镇的文件管理员 File Keeper。本轮只读。必须实际使用文件工具，列目录时给出真实相对路径，读取时展示实际内容。不要编造文件、不要修改或删除文件，不要主动读取密钥或凭据文件。',
    coordinator: '你是小镇的项目向导。',
  }
  return `${instructions[id]}\n\n用户请求：\n${text}`
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
  const messages: { key: string; text: string }[] = []
  const tools: { key: string; name: string; arguments: string }[] = []
  let status: ResidentStatus = 'idle'
  let outcome = ''
  let live = ''
  for (const { event } of entries) {
    if (event.type === 'turn/start') { status = 'working'; outcome = ''; live = ''; tools.length = 0 }
    if (event.type === 'assistant/message') {
      const text = event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
      if (text) messages.push({ key: String(event.seq), text })
    }
    if (event.type === 'assistant/live-chunk' && event.data.chunk.type === 'text-delta') live += event.data.chunk.text
    if (event.type === 'tool/call') tools.push({ key: event.data.callId, name: event.data.name, arguments: event.data.arguments })
    if (event.type === 'turn/end') {
      const reason = event.data.reason
      status = reason.kind === 'completed' ? 'completed' : 'failed'
      outcome = reason.kind === 'completed' ? '本轮已结束' : reason.kind === 'error' ? reason.error.message : `本轮未完成：${reason.kind}`
    }
  }
  return { messages, tools, status, outcome, live }
}
