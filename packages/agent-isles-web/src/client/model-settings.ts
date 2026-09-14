import type { ClientRemote, CredentialInfo } from '@deepseek-ai/dsh-api-remotes/client'
import type { ModelCatalog, ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types'
import type { AgentIslesLocaleKey, AgentIslesTranslate } from './locales.js'

const MODEL_ERROR_KEYS: Record<string, AgentIslesLocaleKey> = {
  'API Key 格式不正确，请只填写密钥本身': 'model.error.keyFormat',
  'API 地址无效': 'model.error.urlInvalid',
  'API 地址须使用 HTTPS；本机服务可使用 HTTP，且不能包含凭据、查询参数或片段': 'model.error.urlSecurity',
  '无法读取模型配置，请检查本机服务连接': 'model.error.load',
  '无法读取凭据状态': 'model.error.credentials',
  '当前模型配置不可保存': 'model.error.readonly',
  '请填写 API Key': 'model.error.keyRequired',
  '凭据由启动环境或只读配置管理，无法覆盖': 'model.error.keyReadonly',
  '配置保存失败或已被其他窗口修改，请刷新后重试': 'model.error.conflict',
  '服务地址已保存，但密钥保存失败；请刷新并重新填写密钥': 'model.error.keySave',
  '凭据和服务地址已保存，但默认模型未更新；请刷新后重试': 'model.error.defaultSave',
  '当前模型服务不可用，请重新配置': 'model.error.unroutable',
  '请先配置模型的 API Key': 'model.error.configureKey',
  '请先选择模型': 'model.error.choose',
  '无法应用居民模型配置，请稍后重试': 'model.error.apply',
}

export function localizedModelError(reason: unknown, t: AgentIslesTranslate): string {
  const message = reason instanceof Error ? reason.message : String(reason)
  const key = MODEL_ERROR_KEYS[message]
  return key ? t(key) : message
}

export interface ModelProvider {
  id: string
  name: string
  ns: string
  path: readonly string[]
  ref: string
  baseURL: string
  revision: number
  credential: CredentialInfo
  models: ModelCatalog['groups'][number]['models']
}
export interface ModelSettingsSnapshot {
  providers: ModelProvider[]
  selection: ModelSelection
  revision: number
  writable: boolean
  routable: boolean
}
export class ModelConfigurationRequired extends Error {}

export interface ModelSettingsActions {
  load(): Promise<ModelSettingsSnapshot>
  save(snapshot: ModelSettingsSnapshot, provider: ModelProvider, model: string, key: string, baseURL: string): Promise<void>
  remove(ref: string): Promise<void>
  test(): Promise<void>
}

export function validateModelInput(key: string, baseURL: string): void {
  if (key && (!/^[\x21-\x7e]+$/.test(key) || /^[A-Z_][A-Z0-9_]*=/.test(key) || /^["']|["']$/.test(key))) {
    throw new Error('API Key 格式不正确，请只填写密钥本身')
  }
  if (baseURL) {
    let url: URL
    try { url = new URL(baseURL) } catch { throw new Error('API 地址无效') }
    if (url.username || url.password || url.search || url.hash
      || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
      throw new Error('API 地址须使用 HTTPS；本机服务可使用 HTTP，且不能包含凭据、查询参数或片段')
    }
  }
}

export async function readModelSettings(remote: ClientRemote): Promise<ModelSettingsSnapshot> {
  const [settings, catalog, directory] = await Promise.all([
    remote.settings.describe(), remote.session.modelCatalog(), remote.llm.listConfigurableProviders(),
  ])
  if (!settings.ok || !catalog.ok || !directory.ok) throw new Error('无法读取模型配置，请检查本机服务连接')
  const defaults = settings.value.namespaces.find(item => item.ns === 'agent-default-model')
  const providers: Omit<ModelProvider, 'credential'>[] = []
  for (const entry of directory.value) {
    const group = catalog.value.groups.find(item => item.id === entry.provider)
    const section = settings.value.namespaces.find(item => item.ns === entry.settingsNs)
    if (!group || !section) continue
    let profile = section.value as Record<string, unknown> | undefined
    for (const part of entry.settingsPath) profile = profile?.[part] as typeof profile
    // Providers using native authorization stay in the full workbench.
    const ref = typeof profile?.apiKeyEnv === 'string' ? profile.apiKeyEnv
      : entry.provider === 'deepseek-official' ? 'DEEPSEEK_API_KEY' : undefined
    if (!ref) continue
    providers.push({ id: entry.provider, name: entry.displayName, ns: entry.settingsNs,
      path: entry.settingsPath, ref, revision: section.revision, models: group.models,
      baseURL: typeof profile?.baseURL === 'string' ? profile.baseURL : '',
    })
  }
  const credentials = await remote.credentials.describe([...new Set(providers.map(item => item.ref))])
  if (!credentials.ok) throw new Error('无法读取凭据状态')
  return { providers: providers.map(item => ({ ...item, credential: credentials.value[item.ref] ?? { configured: false, writable: false } })),
    selection: catalog.value.default, revision: defaults?.revision ?? 0,
    routable: catalog.value.routableProviders.includes(catalog.value.default.provider),
    writable: settings.value.writable && defaults !== undefined }
}

export async function saveModelSettings(remote: ClientRemote, snapshot: ModelSettingsSnapshot, provider: ModelProvider, model: string, key: string, baseURL: string): Promise<void> {
  key = key.trim(); baseURL = baseURL.trim()
  validateModelInput(key, baseURL)
  if (!snapshot.writable || !model) throw new Error('当前模型配置不可保存')
  if (!key && !provider.credential.configured) throw new Error('请填写 API Key')
  if (key && !provider.credential.writable) throw new Error('凭据由启动环境或只读配置管理，无法覆盖')
  // Fence every settings write against the view the user edited.
  const profile = await remote.settings.mutate(provider.ns, [
    { op: 'set', path: [...provider.path, 'apiKeyEnv'], value: provider.ref },
    baseURL ? { op: 'set', path: [...provider.path, 'baseURL'], value: baseURL }
      : { op: 'unset', path: [...provider.path, 'baseURL'] },
  ], provider.revision)
  if (!profile.ok) throw new Error('配置保存失败或已被其他窗口修改，请刷新后重试')
  if (key) {
    const result = await remote.credentials.set(provider.ref, key).catch(() => ({ ok: false as const }))
    if (!result.ok) throw new Error('服务地址已保存，但密钥保存失败；请刷新并重新填写密钥')
  }
  const result = await remote.settings.replace('agent-default-model', { provider: provider.id, model }, snapshot.revision)
  if (!result.ok) throw new Error('凭据和服务地址已保存，但默认模型未更新；请刷新后重试')
}

export async function prepareResidentModel(remote: ClientRemote, sessionId: Parameters<ClientRemote['session']['selectModel']>[0]['sessionId']): Promise<void> {
  const snapshot = await readModelSettings(remote)
  if (!snapshot.routable) throw new ModelConfigurationRequired('当前模型服务不可用，请重新配置')
  const provider = snapshot.providers.find(item => item.id === snapshot.selection.provider)
  if (provider && !provider.credential.configured) throw new ModelConfigurationRequired('请先配置模型的 API Key')
  if (!snapshot.selection.model) throw new ModelConfigurationRequired('请先选择模型')
  const result = await remote.session.selectModel({ sessionId, ...snapshot.selection })
  if (!result.ok) throw new Error('无法应用居民模型配置，请稍后重试')
}
