import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import { resolve } from 'node:path'
import { desktopJson } from './desktop-transport.js'
import { createResidentStateHandler } from './resident-state.js'
import { createProjectFilesHandler } from './project-files.js'
import { createModelTestHandler, type ModelTestServices } from './model-test.js'
import { createTutorialHandler, tutorialDomain } from './tutorial.js'
import { qcodeStatePath } from './storage-path.js'

export const inject = ['connection', 'llm', 'agentDefaultModel', 'storageDomain', 'workspaceRegistry', 'sessions', 'sessionPersistence', 'fs']

/** Official Desktop entry: same domain handlers, shared Fetch carrier, no HTTP listener. */
export async function apply(ctx: Context & ModelTestServices) {
  const home = process.env.DSH_HOME
  if (!home) throw new Error('Desktop requires an explicit DSH_HOME')
  const domain = await ctx.storageDomain.open(tutorialDomain)
  ctx.effect(() => () => domain.close(), 'tutorial: close storage')
  const tutorial = createTutorialHandler(ctx, domain.table('runs'))
  ctx.effect(() => () => tutorial.close(), 'tutorial: drain requests')
  const handlers = {
    'resident-state': createResidentStateHandler(qcodeStatePath(home)),
    'project-files': createProjectFilesHandler(ctx),
    'model-test': createModelTestHandler(ctx),
    tutorial: tutorial.handle,
  }
  for (const [name, handler] of Object.entries(handlers)) {
    for (const prefix of ['qcode', 'agent-isles']) {
      ctx.connection.fetch.register({ path: `/api/${prefix}/${name}`, methods: ['GET', 'POST'], requestBody: 'buffered', fetch: desktopJson(handler) })
    }
  }
}
