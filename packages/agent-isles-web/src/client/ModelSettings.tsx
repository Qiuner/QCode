import { useEffect, useState } from 'react'
import type { ModelSettingsActions, ModelSettingsSnapshot } from './model-settings.js'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

const MODEL_SETTINGS_STYLES = `
.town-model-settings { position: absolute; z-index: 3; right: 20px; top: 84px; bottom: 110px; width: min(410px, calc(100% - 40px)); overflow: auto; padding: 18px; border: 1px solid #aac3b5; border-radius: 8px; background: #f7faf5f7; color: #203c37; font: 14px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; pointer-events: auto; }
.town-model-settings * { box-sizing: border-box; letter-spacing: 0; }
.town-model-settings > header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.town-model-settings h2 { font-size: 18px; margin: 0; }
.town-model-settings button { font: inherit; cursor: pointer; min-height: 36px; padding: 7px 12px; border: 1px solid #a8c0b7; border-radius: 6px; color: #203c37; background: #f4f8f3; }
.town-model-settings button:disabled { opacity: .55; cursor: not-allowed; }
.town-model-settings > header button { width: 36px; height: 36px; padding: 0; font-size: 24px; }
.town-model-settings form { display: grid; gap: 8px; margin: 16px 0; }
.town-model-settings fieldset { display: grid; gap: 10px; min-width: 0; padding: 0; border: 0; }
.town-model-settings input, .town-model-settings select { display: block; width: 100%; min-width: 0; font: inherit; padding: 9px; color: #203c37; background: #fff; border: 1px solid #aac3b5; border-radius: 5px; }
.town-model-settings select { text-overflow: ellipsis; }
.town-model-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.town-model-settings details input { margin-top: 8px; }
.town-model-settings p { overflow-wrap: anywhere; }
.town-model-settings a { color: #235950; }
.town-model-settings [role='alert'] { color: #a53d36; }
.town-model-settings :is(button,a,input,select):focus-visible { outline: 2px solid #1b8171; outline-offset: 3px; }
@media (max-width: 600px) { .town-model-settings { right: 12px; width: calc(100% - 24px); top: 92px; bottom: 164px; padding: 14px; } }
`

// The town owns first-use guidance and defers key setup until it is needed.
export function TownModelOnboarding({ complete }: PropsRuntime<'settings.onboarding'>) {
  useEffect(() => { complete() }, [complete])
  return null
}

export function ModelSettings({ actions, close }: { actions: ModelSettingsActions; close(): void }) {
  const [snapshot, setSnapshot] = useState<ModelSettingsSnapshot>()
  const [providerId, setProviderId] = useState('')
  const [model, setModel] = useState('')
  const [key, setKey] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const provider = snapshot?.providers.find(item => item.id === providerId)

  async function refresh() {
    const next = await actions.load()
    setSnapshot(next)
    const selected = next.providers.find(item => item.id === next.selection.provider)
      ?? next.providers.find(item => item.id === 'deepseek-official') ?? next.providers[0]
    setProviderId(selected?.id ?? '')
    setModel(selected?.id === next.selection.provider ? next.selection.model : selected?.models[0]?.id ?? '')
    setBaseURL(selected?.baseURL ?? ''); setKey(''); setDirty(false); setConfirmRemove(false)
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setStatus('')
    try { await action() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败，请重试') }
    finally { setBusy(false) }
  }
  useEffect(() => { void run(refresh) }, [])

  return <aside className="town-panel town-model-settings" aria-label="模型设置">
    <style>{MODEL_SETTINGS_STYLES}</style>
    <header><h2>模型设置</h2><button type="button" title="关闭模型设置" aria-label="关闭模型设置" disabled={busy} onClick={close}>×</button></header>
    {snapshot && provider && <form onSubmit={event => {
      event.preventDefault()
      void run(async () => {
        try { await actions.save(snapshot, provider, model, key, baseURL) }
        finally { setKey('') }
        await refresh(); setStatus('已保存')
      })
    }}>
      <fieldset disabled={busy}>
        <label htmlFor="town-provider">服务商</label>
        <select id="town-provider" value={providerId} onChange={event => {
          const next = snapshot.providers.find(item => item.id === event.target.value)!
          setProviderId(next.id); setModel(next.models[0]?.id ?? ''); setBaseURL(next.baseURL)
          setKey(''); setDirty(true); setStatus(''); setConfirmRemove(false)
        }}>{snapshot.providers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <label htmlFor="town-model">模型</label>
        <select id="town-model" value={model} onChange={event => { setModel(event.target.value); setDirty(true); setStatus('') }}>
          {!provider.models.some(item => item.id === model) && model && <option value={model}>{model}</option>}
          {provider.models.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label htmlFor="town-api-key">API Key</label>
        <input id="town-api-key" type="password" autoComplete="new-password" spellCheck={false} value={key}
          disabled={!provider.credential.writable} placeholder={provider.credential.configured ? '已配置；留空保留现有密钥' : '填写 API Key'}
          onChange={event => { setKey(event.target.value); setDirty(true); setStatus('') }} />
        <p role="status">{provider.credential.configured ? '密钥已配置' : '尚未配置密钥'}{!provider.credential.writable ? ' · 由启动环境或只读配置管理' : ''}</p>
        <details><summary>高级设置</summary><label htmlFor="town-api-url">API 地址</label>
          <input id="town-api-url" type="url" value={baseURL} placeholder={provider.id === 'deepseek-official' ? 'https://api.deepseek.com' : '服务商默认地址'}
            onChange={event => { setBaseURL(event.target.value); setDirty(true); setStatus('') }} />
        </details>
        <div className="town-model-actions"><button type="submit" disabled={!snapshot.writable || !model}>保存</button>
          <button type="button" disabled={dirty || !provider.credential.configured || snapshot.selection.provider !== providerId} onClick={() => { void run(async () => { await actions.test(); setStatus('连接成功，模型已响应') }) }}>测试连接</button>
        </div>
        <small>连接测试会发送一个短请求，可能产生少量费用。</small>
        {provider.credential.configured && provider.credential.writable && <div className="town-model-actions">
          {confirmRemove ? <><button type="button" onClick={() => { void run(async () => { await actions.remove(provider.ref); await refresh(); setStatus('已移除本机保存的密钥') }) }}>确认删除密钥</button><button type="button" onClick={() => setConfirmRemove(false)}>取消</button></>
            : <button type="button" onClick={() => setConfirmRemove(true)}>删除密钥</button>}
        </div>}
      </fieldset>
    </form>}
    {snapshot && !provider && <p>没有可在此配置的服务商，请前往高级工作台添加。</p>}
    <div className="town-model-actions"><button type="button" disabled={busy} onClick={() => { void run(refresh) }}>刷新配置</button><a href="/workbench">高级工作台</a></div>
    {busy && <p role="status">正在处理…</p>}
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </aside>
}
