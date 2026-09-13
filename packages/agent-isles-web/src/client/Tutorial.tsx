import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FIRST_TUTORIAL, type TutorialActions, type TutorialRun } from '../tutorial-types.js'
import { scopedTutorial } from './tutorial-api.js'

export function useTutorial(actions: TutorialActions | undefined, workspaceId?: string) {
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
    try { records.current = await actions.list(); setRuns(records.current); setError('') } catch (error) { setError(error instanceof Error ? error.message : String(error)) }
  }
  useEffect(() => {
    if (!actions) return
    const controller = new AbortController()
    void actions.list(controller.signal).then(items => { records.current = items; setRuns(items) }).catch(error => { if (!controller.signal.aborted) setError(String(error.message ?? error)) })
    return () => controller.abort()
  }, [actions])
  function command(action: string, values?: Record<string, unknown>) {
    const targetId = current.current?.id
    const operation = queue.current.then(async () => {
      if (!actions) throw new Error('教程服务不可用。')
      setBusy(true); setError('')
      try {
        const value = accept(await actions.command(action, action === 'start' ? undefined : records.current.find(item => item.id === targetId), values))
        if (action === 'start') { current.current = value; setActiveId(value.id) }
        return value
      }
      catch (error) { setError(error instanceof Error ? error.message : String(error)); throw error }
      finally { setBusy(false) }
    })
    queue.current = operation.catch(() => {})
    return operation
  }
  return { run, runs, error, busy, command, accept, reload, setError, select: setActiveId }
}
export type TutorialController = ReturnType<typeof useTutorial>

export function TutorialPanel({ tutorial, actions, project, pick, bindProject, submit, move, modelSettings, leave, composerTarget, previewTarget, running = false, waiting = false, nativeSessionId }: {
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
    catch { tutorial.setError('本机草稿备份失败，请等待保存成功后再关闭。') }
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
    try { await task() } catch (error) { modelSettings(error); tutorial.setError(error instanceof Error ? error.message : String(error)) }
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
  if (run.paused) return <section className="town-tutorial"><h3>教程已暂停</h3><p>作品和学习记录已保留。</p><button disabled={disabled} onClick={() => void act(() => tutorial.command('resume'))}>继续教程</button></section>
  return <section className="town-tutorial" aria-label="首课教学">
    <details className="town-course-menu"><summary>学习选项 · {FIRST_TUTORIAL.title}</summary><button disabled={disabled} onClick={() => void act(async () => { await tutorial.command('draft', { draft: text }); await tutorial.command('pause'); move('cancel') })}>暂停教程</button>{project && <p>作品位置：{project.path}</p>}</details>
    {run.step === 'idea' && <><p>你负责提出想法、体验结果，Q 帮你实现。先说说作品要做什么、最重要的两个功能是什么。</p><label htmlFor="tutorial-idea">我的第一个作品</label><textarea id="tutorial-idea" value={text} maxLength={12000} onChange={event => editText(event.target.value)} /><button disabled={disabled} onClick={() => { editText(FIRST_TUTORIAL.example); void tutorial.command('assist', { assistance: '提示方向' }).catch(() => {}) }}>看看需求示例</button><button disabled={disabled || !text.trim()} onClick={() => void act(async () => { await tutorial.command('idea', { draft: text }); if (!project && !run.encounterSeen) { await tutorial.command('seen'); move('arrive') } })}>确认想法，准备制作</button></>}
    {run.step === 'folder' && <>
      <p className="town-dialogue-line">{folderLine === 0 ? project ? `这个作品要放在「${project.title}」吗？` : 'Q：可以！先给这个作品找个家。' : folderLine === 1 ? '阿澜：每个项目都需要自己的文件夹，代码和图片才不会混在一起。' : '阿澜：来找我，我们给它准备一个家。刚才的想法已经留好了。'}</p>
      {folderLine < 2 && <button onClick={() => setFolderLine(value => value + 1)}>继续听</button>}
      <div className="town-dialogue-choices"><button disabled={disabled} onClick={() => { move('home') }}>跟阿澜去</button><button disabled={disabled} onClick={() => { move('cancel'); setFolder(''); void act(() => chooseFolder()) }}>直接选择文件夹 / 跳过演出</button></div>
      {project && <><p>当前位置：{project.path}</p><button disabled={disabled} onClick={() => void act(() => chooseFolder(true))}>就在当前项目制作</button></>}
      <details className="town-project-preparation" open={preparing || !!folder} onToggle={event => setPreparing(event.currentTarget.open)}><summary>给作品安家 · 名称与位置</summary>
      <label htmlFor="tutorial-project-name">这个作品叫什么？</label><input id="tutorial-project-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} />
      <label htmlFor="tutorial-folder-kind">准备方式</label><select id="tutorial-folder-kind" value={create ? 'new' : 'existing'} onChange={event => setCreate(event.target.value === 'new')}><option value="new">在所选位置创建专用项目文件夹</option><option value="existing">继续已有文件夹，不复制或覆盖文件</option></select>
      <label htmlFor="tutorial-folder">{create ? '放在哪个文件夹下面？' : '已有项目文件夹'}</label><input id="tutorial-folder" value={folder} onChange={event => setFolder(event.target.value)} placeholder="选择文件夹或输入绝对路径" />
      <button disabled={disabled} onClick={() => void act(async () => { const chosen = await pick(); if (chosen) setFolder(chosen) })}>浏览位置</button>
      {folder && <p>将{create ? `在此处新建「${name}」专用目录（带唯一编号）` : '使用这个已有目录，不自动复制模板'}：{folder}</p>}
      <button disabled={disabled || !name.trim() || !folder.trim()} onClick={() => void act(async () => { const saved = await tutorial.command('bind', { folder, create, projectName: name }); if (saved.workspaceId) await bindProject(saved.workspaceId); move('cancel') })}>确认位置，给作品安家</button>
      </details>
    </>}
    {(run.step === 'build' || run.step === 'improve') && <>
      {!run.submission && <p className="town-dialogue-line">{run.step === 'build' ? `「${run.projectName}」安顿好了。看看刚才的想法，准备好就交给我。` : '这次你想改哪里？告诉我现在怎样、希望怎样。'}</p>}
      {nativeSessionId ? <><p>{run.draft}</p><button disabled={disabled || running || waiting} onClick={() => void act(async () => { const checked = await tutorial.command('check', { sessionId: nativeSessionId }); setPreview(await actions.preview(checked)) })}>检查成果，打开作品</button></> : !run.submission ? <>{composer(<><label htmlFor="tutorial-demand">{run.step === 'build' ? '刚才的想法' : '我想做的改动'}</label><textarea id="tutorial-demand" value={text} maxLength={12000} onChange={event => editText(event.target.value)} />
      <button disabled={disabled} onClick={() => void act(() => tutorial.command('assist', { assistance: '提示方向' }))}>给我提示</button>
      {run.assistance.some(item => item === `${run.step}:提示方向`) && <p>我现在看到……我希望改成……改好后，我会这样检查……</p>}
      <button title="确认需求，交给 Q" disabled={disabled || !text.trim()} onClick={() => void act(async () => { const saved = await tutorial.command('draft', { draft: text }); try { tutorial.accept(await submit(saved, text)) } catch (error) { await tutorial.reload(); throw error } })}>发送</button></>)}</> : <>
        {composer(<>
        <label htmlFor="tutorial-answer">{waiting ? '处理请求后，告诉 Q你的决定' : '告诉 Q想改哪里，或补充说明'}</label>
        <textarea id="tutorial-answer" value={text} maxLength={12000} placeholder="例如：先保留现在的样子，请继续检查添加事项是否正常。" onChange={event => editText(event.target.value)} />
        <button title={running ? '发送补充，等待处理' : '交给 Q继续制作'} disabled={disabled || !text.trim()} onClick={() => void act(async () => {
          const saved = await tutorial.command('draft', { draft: text })
          try { tutorial.accept(await submit(saved, text, true)) }
          catch (error) { await tutorial.reload(); throw error }
        })}>发送</button></>)}
        <p>先核对本轮执行和作品文件，核对通过后会打开预览，请亲手试一试。</p><button disabled={disabled || running || waiting} onClick={() => void act(async () => { const checked = await tutorial.command('check'); setPreview(await actions.preview(checked)) })}>{running ? '制作中，完成后可检查' : waiting ? '请先处理上面的请求' : '检查成果，打开作品'}</button>
        <details><summary>任务没有继续？</summary><p>执行或等待审批时，请先处理当前请求。离开对话不会停止任务。</p>
        <button disabled={disabled} onClick={() => void act(() => tutorial.command('retry'))}>本轮失败后，重新编辑</button>
        <button disabled={disabled} onClick={() => void act(async () => { tutorial.accept(await submit(run, run.draft)) })}>连接中断后，重试原提交</button>
        <a href="/workbench">查看原会话 / 停止任务</a>
        </details>
      </>}
    </>}
    {(run.step === 'inspect' || run.step === 'review') && <>
      <p>{run.step === 'inspect' ? '亲自添加一条事项，再标记完成。文件和执行记录已核对，功能是否符合你的目标仍需要你体验。' : '试一试你要求的改动。它符合预期吗？'}</p>
      <button disabled={disabled} onClick={() => void act(async () => { const checked = await tutorial.command('check'); setPreview(await actions.preview(checked)) })}>打开 / 重新核对作品预览</button>
      {preview !== undefined && (previewTarget ? createPortal(<><button onClick={() => setPreview(undefined)}>返回对话 / 收起作品</button><iframe className="town-tutorial-preview" title="我的作品预览" sandbox="allow-scripts" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">${preview}`} /></>, previewTarget) : <p>请展开工作区查看作品。</p>)}
      <p><small>预览禁止网络和主机访问；需要浏览器存储或外部资源的功能请在实际运行环境体验。</small></p>
      <button disabled={disabled || preview === undefined} onClick={() => void act(async () => { await tutorial.command('confirm'); setPreview(undefined) })}>我已体验，可以正常使用</button>
      <button disabled={disabled} onClick={() => void act(() => tutorial.command('revise'))}>我遇到了问题，描述后修正</button>
    </>}
    {run.step === 'return' && <><p>先离开当前项目，再打开创作手册，继续这个作品的学习。历史项目和对话也可以找苔伯查看。</p>{!run.left ? <button disabled={disabled} onClick={() => void act(async () => { await tutorial.command('leave'); leave() })}>离开项目，自己找回来</button> : !run.returned ? <p>打开左上角的创作手册，选择这个作品的“继续学习”。</p> : <><p>你找回了「{run.projectName}」。作品放在哪里？怎么确认它可用？下一次想改什么？</p><button disabled={disabled} onClick={() => void act(() => tutorial.command('complete'))}>我知道怎样继续，完成首课</button></>}</>}
    {run.step === 'complete' && <p>第一个作品和一次自己的改动已完成。你可以继续自由创作；这条记录包含你的体验确认，不代表自动判定已经掌握编程。</p>}
    {disabled && <p role="status">正在保存或读取，请稍候…</p>}
    {tutorial.error && <div role="alert">{tutorial.error}<button onClick={() => void tutorial.reload()}>重新读取记录</button></div>}
  </section>
}
