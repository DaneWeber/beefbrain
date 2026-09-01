import { build } from 'esbuild'

await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node24',
  outfile: 'dist/extension.js',
  sourcemap: true,
  external: ['vscode'],
  logLevel: 'warning',
})
