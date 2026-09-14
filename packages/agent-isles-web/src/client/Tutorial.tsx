import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { TutorialActions, TutorialRun } from '../tutorial-types.js'
import { scopedTutorial } from './tutorial-api.js'
import type { AgentIslesTranslate } from './locales.js'

function tutorialError(error: unknown, t?: AgentIslesTranslate): string {
  const message = error instanceof Error ? error.message : String(error)
  return t && /[\p{Script=Han}]/u.test(message) && t('language.menu') !== '界面语言' ? t('tutorial.actionFailed') : message
}

export function useTutorial(actions: TutorialActions | undefined, workspaceId?: string, t?: AgentIslesTranslate) {
  const [runs, setRuns] = useState<TutorialRun[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current = useRef<TutorialRun>()
  const records = useRef<TutorialRun[]>([])
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const active = runs.find(run => run.id === activeId)
  const run = active && (!active.workspaceId || active.workspaceId === workspaceId) ? active : scopedTutorial(runs, workspaceId)
  current.current = run
  const accept = (value: TutorialRun) => {
    if (current.current?.id === value.id) current.current = value
    records.current = [...records.current.filter(item => item.id !== value.id), value]
    setRuns(records.current)
    return value
  }
  async function reload() {
    if (!actions) return
    try { records.current = await actions.list(); setRuns(records.current); setError('') } catch (error) { setError(tutorialError(error, t)) }
  }
  useEffect(() => {
    if (!actions) return
    const controller = new AbortController()
    void actions.list(controller.signal).then(items => { records.current = items; setRuns(items) }).catch(error => { if (!controller.signal.aborted) setError(tutorialError(error, t)) })
    return () => controller.abort()
  }, [actions])
  function command(action: string, values?: Record<string, unknown>) {
    const targetId = current.current?.id
    const operation = queue.current.then(async () => {
      if (!actions) throw new Error(t?.('tutorial.unavailable') ?? 'Tutorial unavailable.')
      setBusy(true); setError('')
      try {
        const value = accept(await actions.command(action, action === 'start' ? undefined : records.current.find(item => item.id === targetId), values))
        if (action === 'start') { current.current = value; setActiveId(value.id) }
        return value
      }
      catch (error) { setError(tutorialError(error, t)); throw error }
      finally { setBusy(false) }
    })
    queue.current = operation.catch(() => {})
    return operation
  }
  return { run, runs, error, busy, command, accept, reload, setError, select: setActiveId }
}
export type TutorialController = ReturnType<typeof useTutorial>

export function TutorialPanel({ tutorial, actions, project, pick, bindProject, submit, move, modelSettings, leave, composerTarget, previewTarget, running = false, waiting = false, nativeSessionId, t }: {
  nativeSessionId?: string
  running?: boolean
  waiting?: boolean
  composerTarget?: HTMLElement | null
  previewTarget?: HTMLElement | null
  tutorial: TutorialController; actions: TutorialActions
  project?: { workspaceId: string; title: string; path: string }
  pick(): Promise<string | null>; bindProject(id: string): Promise<void>
  submit(run: TutorialRun, draft: string, followup?: boolean): Promise<TutorialRun>
  move(action: 'arrive' | 'home' | 'cancel'): void; modelSettings(error: unknown): void
  leave(): void
  t: AgentIslesTranslate
}) {
  const run = tutorial.run!
  const [text, setText] = useState(run.draft)
  const [name, setName] = useState(run.projectName)
  const [folder, setFolder] = useState('')
  const [create, setCreate] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [folderLine, setFolderLine] = useState(0)
  const [preview, setPreview] = useState<string>()
  const [localBusy, setLocalBusy] = useState(false)
  const disabled = tutorial.busy || localBusy
  const composer = (content: ReactNode) => nativeSessionId ? null : composerTarget ? createPortal(<div className="town-tutorial-input">{content}</div>, composerTarget) : <div className="town-tutorial-input">{content}</div>
  const draftKey = `agent-isles:tutorial-draft:${run.id}:${run.step}${run.submission ? `:answer:${run.submission.requestId}` : ''}`
  useEffect(() => {
    let restored = run.submission ? '' : run.draft
    try { restored = localStorage.getItem(draftKey) ?? restored } catch {}
    setText(restored); setName(run.projectName); setPreview(undefined)
  }, [run.id, run.step, run.submission?.requestId])
  function editText(value: string) {
    setText(value)
    try { localStorage.setItem(draftKey, value) }
    catch { tutorial.setError(t('tutorial.draftFailed')) }
  }
  useEffect(() => {
    if (text === run.draft || run.paused || run.submission) return
    const timer = setTimeout(() => { void tutorial.command('draft', { draft: text }).then(() => {
      try { if (localStorage.getItem(draftKey) === text) localStorage.removeItem(draftKey) } catch {}
    }).catch(() => {}) }, 500)
    return () => clearTimeout(timer)
  }, [text, run.draft, run.id, run.paused, run.submission?.requestId])
  async function act(task: () => Promise<unknown>) {
    if (disabled) return
    setLocalBusy(true); tutorial.setError('')
    try { await task() } catch (error) { modelSettings(error); tutorial.setError(tutorialError(error, t)) }
    finally { setLocalBusy(false) }
  }
  async function chooseFolder(existing = false) {
    let values: Record<string, unknown>
    if (existing && project) values = { workspaceId: project.workspaceId }
    else {
      let chosen = folder
      if (!chosen) chosen = await pick() ?? ''
      if (!chosen) return
      setFolder(chosen)
      // Selection only chooses a location; the following confirmation owns creation.
      return
    }
    const saved = await tutorial.command('bind', values)
    if (saved.workspaceId) await bindProject(saved.workspaceId)
    move('cancel')
  }
  if (run.paused) return <section className="town-tutorial"><h3>{t('tutorial.paused')}</h3><p>{t('tutorial.pausedHint')}</p><button disabled={disabled} onClick={() => void act(() => tutorial.command('resume'))}>{t('tutorial.resume')}</button></section>
  return <section className="town-tutorial" aria-label={t('tutorial.aria')}>
    <details className="town-course-menu"><summary>{t('tutorial.options')}</summary><button disabled={disabled} onClick={() => void act(async () => { await tutorial.command('draft', { draft: text }); await tutorial.command('pause'); move('cancel') })}>{t('tutorial.pause')}</button>{project && <p>{t('tutorial.location', { path: project.path })}</p>}</details>
    {run.step === 'idea' && <><p>{t('tutorial.ideaIntro')}</p><label htmlFor="tutorial-idea">{t('tutorial.firstProject')}</label><textarea id="tutorial-idea" value={text} maxLength={12000} onChange={event => editText(event.target.value)} /><button disabled={disabled} onClick={() => { editText(t('tutorial.example')); void tutorial.command('assist', { assistance: 'direction' }).catch(() => {}) }}>{t('tutorial.showExample')}</button><button disabled={disabled || !text.trim()} onClick={() => void act(async () => { await tutorial.command('idea', { draft: text }); if (!project && !run.encounterSeen) { await tutorial.command('seen'); move('arrive') } })}>{t('tutorial.confirmIdea')}</button></>}
    {run.step === 'folder' && <>
      <p className="town-dialogue-line">{folderLine === 0 ? project ? t('tutorial.folderCurrent', { name: project.title }) : t('tutorial.folderQ') : folderLine === 1 ? t('tutorial.folderKeeper') : t('tutorial.folderCome')}</p>
      {folderLine < 2 && <button onClick={() => setFolderLine(value => value + 1)}>{t('tutorial.listen')}</button>}
      <div className="town-dialogue-choices"><button disabled={disabled} onClick={() => { move('home') }}>{t('tutorial.followKeeper')}</button><button disabled={disabled} onClick={() => { move('cancel'); setFolder(''); void act(() => chooseFolder()) }}>{t('tutorial.skipScene')}</button></div>
      {project && <><p>{t('tutorial.currentLocation', { path: project.path })}</p><button disabled={disabled} onClick={() => void act(() => chooseFolder(true))}>{t('tutorial.useCurrent')}</button></>}
      <details className="town-project-preparation" open={preparing || !!folder} onToggle={event => setPreparing(event.currentTarget.open)}><summary>{t('tutorial.home')}</summary>
      <label htmlFor="tutorial-project-name">{t('tutorial.projectName')}</label><input id="tutorial-project-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} />
      <label htmlFor="tutorial-folder-kind">{t('tutorial.setupMethod')}</label><select id="tutorial-folder-kind" value={create ? 'new' : 'existing'} onChange={event => setCreate(event.target.value === 'new')}><option value="new">{t('tutorial.createFolder')}</option><option value="existing">{t('tutorial.useFolder')}</option></select>
      <label htmlFor="tutorial-folder">{create ? t('tutorial.parentFolder') : t('tutorial.existingFolder')}</label><input id="tutorial-folder" value={folder} onChange={event => setFolder(event.target.value)} placeholder={t('tutorial.folderPlaceholder')} />
      <button disabled={disabled} onClick={() => void act(async () => { const chosen = await pick(); if (chosen) setFolder(chosen) })}>{t('tutorial.browse')}</button>
      {folder && <p>{create ? t('tutorial.createSummary', { name, path: folder }) : t('tutorial.existingSummary', { path: folder })}</p>}
      <button disabled={disabled || !name.trim() || !folder.trim()} onClick={() => void act(async () => { const saved = await tutorial.command('bind', { folder, create, projectName: name }); if (saved.workspaceId) await bindProject(saved.workspaceId); move('cancel') })}>{t('tutorial.confirmFolder')}</button>
      </details>
    </>}
    {(run.step === 'build' || run.step === 'improve') && <>
      {!run.submission && <p className="town-dialogue-line">{run.step === 'build' ? t('tutorial.buildReady', { name: run.projectName }) : t('tutorial.improvePrompt')}</p>}
      {nativeSessionId ? <><p>{run.draft}</p><button disabled={disabled || running || waiting} onClick={() => void act(async () => { const checked = await tutorial.command('check', { sessionId: nativeSessionId }); setPreview(await actions.preview(checked)) })}>{t('tutorial.checkOpen')}</button></> : !run.submission ? <>{composer(<><label htmlFor="tutorial-demand">{run.step === 'build' ? t('tutorial.previousIdea') : t('tutorial.myChange')}</label><textarea id="tutorial-demand" value={text} maxLength={12000} onChange={event => editText(event.target.value)} />
      <button disabled={disabled} onClick={() => void act(() => tutorial.command('assist', { assistance: 'direction' }))}>{t('tutorial.hint')}</button>
      {run.assistance.some(item => item === `${run.step}:direction` || item === `${run.step}:提示方向`) && <p>{t('tutorial.hintTemplate')}</p>}
      <button title={t('tutorial.submitTitle')} disabled={disabled || !text.trim()} onClick={() => void act(async () => { const saved = await tutorial.command('draft', { draft: text }); try { tutorial.accept(await submit(saved, text)) } catch (error) { await tutorial.reload(); throw error } })}>{t('tutorial.send')}</button></>)}</> : <>
        {composer(<>
        <label htmlFor="tutorial-answer">{waiting ? t('tutorial.answerDecision') : t('tutorial.answerMore')}</label>
        <textarea id="tutorial-answer" value={text} maxLength={12000} placeholder={t('tutorial.answerPlaceholder')} onChange={event => editText(event.target.value)} />
        <button title={running ? t('tutorial.followupWaiting') : t('tutorial.followup')} disabled={disabled || !text.trim()} onClick={() => void act(async () => {
          const saved = await tutorial.command('draft', { draft: text })
          try { tutorial.accept(await submit(saved, text, true)) }
          catch (error) { await tutorial.reload(); throw error }
        })}>{t('tutorial.send')}</button></>)}
        <p>{t('tutorial.checkHint')}</p><button disabled={disabled || running || waiting} onClick={() => void act(async () => { const checked = await tutorial.command('check'); setPreview(await actions.preview(checked)) })}>{running ? t('tutorial.checkRunning') : waiting ? t('tutorial.checkWaiting') : t('tutorial.checkOpen')}</button>
        <details><summary>{t('tutorial.stuck')}</summary><p>{t('tutorial.stuckHint')}</p>
        <button disabled={disabled} onClick={() => void act(() => tutorial.command('retry'))}>{t('tutorial.retryEdit')}</button>
        <button disabled={disabled} onClick={() => void act(async () => { tutorial.accept(await submit(run, run.draft)) })}>{t('tutorial.retrySubmit')}</button>
        <a href="/workbench">{t('tutorial.openSession')}</a>
        </details>
      </>}
    </>}
    {(run.step === 'inspect' || run.step === 'review') && <>
      <p>{run.step === 'inspect' ? t('tutorial.inspectTask') : t('tutorial.reviewTask')}</p>
      <button disabled={disabled} onClick={() => void act(async () => { const checked = await tutorial.command('check'); setPreview(await actions.preview(checked)) })}>{t('tutorial.previewOpen')}</button>
      {preview !== undefined && (previewTarget ? createPortal(<><button onClick={() => setPreview(undefined)}>{t('tutorial.previewClose')}</button><iframe className="town-tutorial-preview" title={t('tutorial.previewTitle')} sandbox="allow-scripts" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">${preview}`} /></>, previewTarget) : <p>{t('tutorial.expandWorkspace')}</p>)}
      <p><small>{t('tutorial.previewSecurity')}</small></p>
      <button disabled={disabled || preview === undefined} onClick={() => void act(async () => { await tutorial.command('confirm'); setPreview(undefined) })}>{t('tutorial.confirmWorking')}</button>
      <button disabled={disabled} onClick={() => void act(() => tutorial.command('revise'))}>{t('tutorial.revise')}</button>
    </>}
    {run.step === 'return' && <><p>{t('tutorial.returnIntro')}</p>{!run.left ? <button disabled={disabled} onClick={() => void act(async () => { await tutorial.command('leave'); leave() })}>{t('tutorial.leave')}</button> : !run.returned ? <p>{t('tutorial.returnGuide')}</p> : <><p>{t('tutorial.returnQuestions', { name: run.projectName })}</p><button disabled={disabled} onClick={() => void act(() => tutorial.command('complete'))}>{t('tutorial.complete')}</button></>}</>}
    {run.step === 'complete' && <p>{t('tutorial.completed')}</p>}
    {disabled && <p role="status">{t('tutorial.saving')}</p>}
    {tutorial.error && <div role="alert">{tutorial.error}<button onClick={() => void tutorial.reload()}>{t('tutorial.reload')}</button></div>}
  </section>
}
