import { cp, rm, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { defineConfig } from 'tsup'

const extensionDir = __dirname
const schemaDir = resolve(extensionDir, 'schema')

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
  onSuccess: async () => {
    await rm(schemaDir, { recursive: true, force: true })
    await cp(resolve(extensionDir, '../bnb-core/schema'), schemaDir, {
      recursive: true,
      filter: async (source) =>
        (await stat(source)).isDirectory() || extname(source) === '.json',
    })
  },
})
