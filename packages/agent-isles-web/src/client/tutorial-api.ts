import { resourcePath } from './resource-path.js'
import type { TutorialActions, TutorialRun } from '../tutorial-types.js'

async function request(body?: unknown, signal?: AbortSignal) {
  const response = await fetch(resourcePath('/agent-isles/tutorial'), {
    method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-agent-isles-tutorial': '1' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: signal ?? AbortSignal.timeout(15000),
  })
  if (response.status === 404) throw new Error('教程服务尚未加载，请重启小岛服务后刷新页面。')
  if (response.status === 401 || response.status === 403) throw new Error('教程连接已失效，请从小岛启动入口重新连接。')
  const value = await response.json().catch(() => undefined)
  if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : `教程服务暂时不可用（${response.status}），请稍后重试。`)
  if (!value || typeof value !== 'object') throw new Error('教程服务返回的数据不完整，请刷新页面后重试。')
  return value
}

export const tutorialActions: TutorialActions = {
  list: signal => request(undefined, signal),
  command: (action, run, values) => request({ action, requestId: crypto.randomUUID(), ...(run ? { runId: run.id, revision: run.revision } : {}), ...values }),
  preview: async run => (await request({ action: 'preview', runId: run.id })).html as string,
}

export function scopedTutorial(runs: TutorialRun[], workspaceId?: string) {
  return runs.filter(run => run.workspaceId === workspaceId && run.step !== 'complete').sort((a, b) => b.updatedAt - a.updatedAt)[0]
}
