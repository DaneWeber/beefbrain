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
})
