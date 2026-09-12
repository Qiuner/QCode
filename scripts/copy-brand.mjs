import { cpSync, mkdirSync } from 'node:fs'

const target = new URL('../packages/agent-isles-web/lib/brand/', import.meta.url)
mkdirSync(target, { recursive: true })
cpSync(new URL('../assets/brand/', import.meta.url), target, { recursive: true })
cpSync(new URL('../packages/agent-isles-web/static/site.webmanifest', import.meta.url), new URL('site.webmanifest', target))
