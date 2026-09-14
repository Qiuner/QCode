export const FIRST_TUTORIAL = {
  id: 'first-creation', version: 1,
  steps: ['idea', 'folder', 'build', 'inspect', 'improve', 'review', 'return', 'complete'],
} as const

export type TutorialStep = typeof FIRST_TUTORIAL.steps[number]
export type TutorialLocale = 'zh' | 'en'

export function tutorialInstruction(locale: TutorialLocale): string {
  return locale === 'zh'
    ? '请把作品实现为项目根目录的 index.html，CSS 和 JavaScript 内联，不依赖外部网络或安装依赖。保留项目已有文件，只修改完成需求必需的内容，验证后说明结果。'
    : 'Implement the project as index.html in the project root, with inline CSS and JavaScript and no network or installed dependencies. Preserve existing files, change only what the request requires, verify the result, and report what you actually checked.'
}
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
