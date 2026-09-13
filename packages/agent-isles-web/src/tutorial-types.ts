export const FIRST_TUTORIAL = {
  id: 'first-creation', version: 1, title: '第一个作品',
  example: '做一个待办清单，可以添加事项和标记完成。',
  instruction: '请把作品实现为项目根目录的 index.html，CSS 和 JavaScript 内联，不依赖外部网络或安装依赖。保留项目已有文件，只修改完成需求必需的内容，验证后说明结果。',
  steps: { idea: '向 Q说清楚你的想法', folder: '给作品找个家', build: '确认需求，开始制作', inspect: '亲自体验作品', improve: '自己提出一个改动', review: '体验这次改动', return: '离开后找回自己的项目', complete: '继续自由创作' },
} as const

export type TutorialStep = keyof typeof FIRST_TUTORIAL.steps
export interface TutorialRun {
  id: string; version: 1; revision: number; updatedAt: number
  workspaceId?: string; projectName: string; draft: string
  step: TutorialStep; paused: boolean; encounterSeen: boolean
  left: boolean; returned: boolean
  assistance: string[]
  submission?: { sessionId: string; requestId: string; text: string; from: number; stage: 'build' | 'improve' }
  evidence?: { sessionId: string; endSeq: number; hash: string; checkedAt: number }
  firstHash?: string
  receipt?: { id: string; fingerprint: string }
}

export interface TutorialActions {
  list(signal?: AbortSignal): Promise<TutorialRun[]>
  command(action: string, run?: TutorialRun, values?: Record<string, unknown>): Promise<TutorialRun>
  preview(run: TutorialRun): Promise<string>
}
