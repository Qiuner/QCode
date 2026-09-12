import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Folder, File, RefreshCw, X } from 'lucide-react'

type Result = { kind: 'directory'; entries: { name: string; directory: boolean; link: boolean }[]; truncated: boolean }
  | { kind: 'file'; text: string }
  | { kind: 'changes'; unavailable?: string; staged?: string; unstaged?: string; untracked?: string[] }

export function ProjectFiles({ projectId, title, initialView, close }: { projectId: string; title: string; initialView: 'files' | 'changes'; close(): void }) {
  const [view, setView] = useState(initialView)
  const [path, setPath] = useState('')
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<Result>()
  const [error, setError] = useState('')
  const panel = useRef<HTMLElement>(null)
  useEffect(() => { panel.current?.focus() }, [])
  useEffect(() => {
    const controller = new AbortController()
    setResult(undefined); setError('')
    const params = new URLSearchParams({ project: projectId, path: view === 'files' ? path : '', view })
    void fetch(`/agent-isles/project-files?${params}`, { headers: { 'x-agent-isles-files': '1' }, signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? '读取失败')
        if (!controller.signal.aborted) setResult(data)
      }).catch(reason => { if (!controller.signal.aborted) setError(String(reason.message ?? reason)) })
    return () => controller.abort()
  }, [projectId, path, view, revision])
  return <section ref={panel} tabIndex={-1} className="town-files" aria-label="项目文件" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <header><div><small>{title}</small><h2>项目文件</h2></div><button aria-label="返回阿澜对话" title="返回阿澜对话" onClick={close}><X size={20} /></button></header>
    <nav aria-label="文件视图"><button aria-pressed={view === 'files'} onClick={() => setView('files')}>文件</button><button aria-pressed={view === 'changes'} onClick={() => setView('changes')}>修改</button><button title="刷新" aria-label="刷新文件" onClick={() => setRevision(value => value + 1)}><RefreshCw size={17} /></button></nav>
    {view === 'files' && <div className="town-files-path"><button disabled={!path} title="上一级" aria-label="上一级" onClick={() => setPath(path.split('/').slice(0, -1).join('/'))}><ArrowLeft size={18} /></button><span>{path || '项目根目录'}</span></div>}
    <div className="town-files-content">
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">正在读取…</p> : result.kind === 'directory' ? <>
        {!result.entries.length && <p>这个文件夹是空的。</p>}
        {result.entries.map(entry => <button className="town-file-entry" key={entry.name} onClick={() => setPath([path, entry.name].filter(Boolean).join('/'))}>{entry.directory ? <Folder size={18} /> : <File size={18} />}<span>{entry.name}</span>{entry.link && <small>链接</small>}</button>)}
        {result.truncated && <p>目录过大，仅显示前 1000 项。</p>}
      </> : result.kind === 'file' ? <pre>{result.text || '（空文件）'}</pre> : <>
        {result.unavailable ? <p>{result.unavailable}</p> : <>
          {!result.staged && !result.unstaged && !result.untracked?.length && <p>没有未提交的修改。</p>}
          {result.unstaged && <><h3>未暂存</h3><pre>{result.unstaged}</pre></>}
          {result.staged && <><h3>已暂存</h3><pre>{result.staged}</pre></>}
          {!!result.untracked?.length && <><h3>未跟踪文件</h3>{result.untracked.map(name => <button className="town-file-entry" key={name} onClick={() => { setPath(name); setView('files') }}><File size={18} /><span>{name}</span></button>)}</>}
        </>}
      </>}
    </div>
  </section>
}
