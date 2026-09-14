import type { TutorialRun } from '../tutorial-types.js'
import type { AgentIslesTranslate } from './locales.js'

export function workNarrative({ run, running, pending, failed, finished, loading }: {
  run?: TutorialRun; running?: boolean; pending?: boolean; failed?: boolean; finished?: boolean; loading?: boolean
}, t: AgentIslesTranslate) {
  if (loading) return { title: t('work.loading.title'), text: t('work.loading.text') }
  if (pending) return { title: t('work.pending.title'), text: t('work.pending.text') }
  if (running) return { title: t('work.running.title'), text: t('work.running.text') }
  if (failed) return { title: t('work.failed.title'), text: t('work.failed.text') }
  if (run?.paused) return { title: t('work.paused.title'), text: t('work.paused.text') }
  if (run?.step === 'inspect' || run?.step === 'review') return { title: t('work.inspect.title'), text: t('work.inspect.text') }
  if (finished) return { title: t('work.finished.title'), text: t('work.finished.text') }
  if (run?.submission) return { title: t('work.submitted.title'), text: t('work.submitted.text') }
  if (run && run.step !== 'complete') return { title: t(`tutorial.step.${run.step}`), text: run.step === 'build' ? t('work.tutorialBuild') : t('work.tutorial') }
  return { title: t('work.default.title'), text: t('work.default.text') }
}
