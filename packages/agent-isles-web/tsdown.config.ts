import type { UserConfig } from 'tsdown'

const config: UserConfig = {
  name: '@agent-isles/web-plugin/client',
  entry: { client: 'lib/types/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  clean: false,
  dts: false,
  sourcemap: true,
  deps: {
    neverBundle: specifier => specifier === 'react' || specifier === 'react/jsx-runtime',
    alwaysBundle: specifier => specifier !== 'react' && specifier !== 'react/jsx-runtime',
  },
  outputOptions: {
    entryFileNames: 'client.js',
    sourcemapExcludeSources: false,
    banner: 'window.__ModuleLoader__.load({ id: "@agent-isles/web-plugin", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default config
