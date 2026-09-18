import { cp, mkdir, readFile, writeFile, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { stripTypeScriptTypes } from 'node:module'

/** Compile the real product plugin against the isolated official dependency graph. */
export async function buildDesktopPlugin(root, upstream, modules, output) {
  const source = join(root, 'packages/qcode-web')
  const target = join(modules, '@qcode/web-plugin')
  await mkdir(target, { recursive: true })
  await cp(join(source, 'src'), join(target, 'src'), { recursive: true })
  await symlink(join(upstream, 'node_modules/.pnpm/node_modules'), join(target, 'node_modules'), 'junction')
  const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
  manifest.main = 'lib/types/desktop.js'
  manifest.exports['.'].default = './lib/types/desktop.js'
  // The profile owns the fixed runtime graph; never resolve 0.1.3 alongside it.
  delete manifest.dependencies
  delete manifest.devDependencies
  await writeFile(join(target, 'package.json'), JSON.stringify(manifest))
  await writeFile(join(target, 'tsconfig.json'), JSON.stringify({
    extends: join(root, 'tsconfig.base.json'), compilerOptions: { jsx: 'react-jsx', rootDir: 'src', outDir: 'lib/types', declaration: true }, include: ['src'],
  }))
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(target, 'tsconfig.json')], { stdio: 'inherit' })
  await writeFile(join(target, 'tsdown.config.mjs'), stripTypeScriptTypes(await readFile(join(source, 'tsdown.config.ts'), 'utf8')))
  execFileSync(process.execPath, [join(root, 'node_modules/tsdown/dist/run.mjs'), '--config', join(target, 'tsdown.config.mjs'), '--env.DSH_BUILD_FACE', 'client'], { cwd: target, stdio: 'inherit' })
  await cp(join(root, 'assets/brand'), join(output, 'brand'), { recursive: true })
  await cp(join(source, 'static/site.webmanifest'), join(output, 'brand/site.webmanifest'))
  return target
}
