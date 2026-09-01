import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  target: 'node18',
  platform: 'node',
  external: ['vscode'],
  // tsup treats a package's `dependencies` as external by default, and it
  // does this recursively for every package.json it walks through (bnb-core's
  // deps, mathjs's deps, ...). Force everything except `vscode` to be
  // inlined, so dist/extension.js is fully self-contained once packaged into
  // a .vsix — no node_modules ships. (A bare `/.*/` would also swallow the
  // `external: ['vscode']` above, so `vscode` must be excluded here too.)
  noExternal: [/^(?!vscode$).+/],
})
