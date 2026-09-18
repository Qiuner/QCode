import { resourcePath } from './resource-path.js'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Folder, File, RefreshCw, X } from 'lucide-react'
import type { QCodeTranslate } from './locales.js'

type Result = { kind: 'directory'; entries: { name: string; directory: boolean; link: boolean }[]; truncated: boolean }
  | { kind: 'file'; text: string }
  | { kind: 'changes'; unavailable?: string; staged?: string; unstaged?: string; untracked?: string[] }

export function ProjectFiles({ projectId, title, initialView, close, t }: { projectId: string; title: string; initialView: 'files' | 'changes'; close(): void; t: QCodeTranslate }) {
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
    void fetch(`${resourcePath('/qcode/project-files')}?${params}`, { headers: { 'x-qcode-files': '1' }, signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? t('file.readFailed'))
        if (!controller.signal.aborted) setResult(data)
      }).catch(reason => { if (!controller.signal.aborted) setError(String(reason.message ?? reason)) })
    return () => controller.abort()
  }, [projectId, path, view, revision])
  return <section ref={panel} tabIndex={-1} className="town-files" aria-label={t('file.title')} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <header><div><small>{title}</small><h2>{t('file.title')}</h2></div><button aria-label={t('file.back')} title={t('file.back')} onClick={close}><X size={20} /></button></header>
    <nav aria-label={t('file.views')}><button aria-pressed={view === 'files'} onClick={() => setView('files')}>{t('file.files')}</button><button aria-pressed={view === 'changes'} onClick={() => setView('changes')}>{t('file.changes')}</button><button title={t('common.refresh')} aria-label={t('file.refresh')} onClick={() => setRevision(value => value + 1)}><RefreshCw size={17} /></button></nav>
    {view === 'files' && <div className="town-files-path"><button disabled={!path} title={t('file.parent')} aria-label={t('file.parent')} onClick={() => setPath(path.split('/').slice(0, -1).join('/'))}><ArrowLeft size={18} /></button><span>{path || t('file.root')}</span></div>}
    <div className="town-files-content">
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">{t('common.reading')}</p> : result.kind === 'directory' ? <>
        {!result.entries.length && <p>{t('file.emptyFolder')}</p>}
        {result.entries.map(entry => <button className="town-file-entry" key={entry.name} onClick={() => setPath([path, entry.name].filter(Boolean).join('/'))}>{entry.directory ? <Folder size={18} /> : <File size={18} />}<span>{entry.name}</span>{entry.link && <small>{t('file.link')}</small>}</button>)}
        {result.truncated && <p>{t('file.truncated')}</p>}
      </> : result.kind === 'file' ? <pre>{result.text || t('file.emptyFile')}</pre> : <>
        {result.unavailable ? <p>{result.unavailable}</p> : <>
          {!result.staged && !result.unstaged && !result.untracked?.length && <p>{t('file.clean')}</p>}
          {result.unstaged && <><h3>{t('file.unstaged')}</h3><pre>{result.unstaged}</pre></>}
          {result.staged && <><h3>{t('file.staged')}</h3><pre>{result.staged}</pre></>}
          {!!result.untracked?.length && <><h3>{t('file.untracked')}</h3>{result.untracked.map(name => <button className="town-file-entry" key={name} onClick={() => { setPath(name); setView('files') }}><File size={18} /><span>{name}</span></button>)}</>}
        </>}
      </>}
    </div>
  </section>
}
