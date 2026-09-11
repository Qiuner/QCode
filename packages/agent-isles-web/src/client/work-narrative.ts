import { FIRST_TUTORIAL, type TutorialRun } from '../tutorial-types.js'

export function workNarrative({ run, running, pending, failed, finished, loading }: {
  run?: TutorialRun; running?: boolean; pending?: boolean; failed?: boolean; finished?: boolean; loading?: boolean
}) {
  if (loading) return { title: '正在找回我们的进度', text: '我正在读取之前的对话和执行记录，请稍等。' }
  if (pending) return { title: '需要你的决定', text: '我遇到了一项需要你确认的请求。请先看清请求内容，再决定怎样继续。' }
  if (running) return { title: '正在制作', text: '我正在处理你的需求。你可以补充想法，也可以回小岛逛逛，制作会继续。' }
  if (failed) return { title: '这一步还没完成', text: '本轮执行中断或遇到了问题。请查看制作过程中的原因，再告诉我希望怎样继续。' }
  if (run?.paused) return { title: '学习先歇一会儿', text: '学习记录已保留。你可以继续教程，也可以直接告诉我想做什么。' }
  if (run?.step === 'inspect' || run?.step === 'review') return { title: '轮到你体验了', text: '作品文件和执行记录已核对。请打开作品，亲手试一试，再告诉我是否符合你的想法。' }
  if (finished) return { title: '一起检查这次成果', text: '这轮制作已经停止，是否可用还需要核对和体验。先查看结果，再决定下一步。' }
  if (run?.submission) return { title: '确认这次制作的进度', text: '你的需求已经提交。我们先核对执行记录，再决定继续制作还是体验作品。' }
  if (run && run.step !== 'complete') return { title: FIRST_TUTORIAL.steps[run.step], text: run.step === 'build' ? '我们已经给作品找好了位置。再看看你的想法，确认后我就开始制作。' : '我们一步步把想法变成作品。下面是现在可以一起做的事。' }
  return { title: '一起做点什么', text: '告诉我你想做什么、希望它怎样使用。我会在当前项目里动手，再和你一起检查结果。' }
}
