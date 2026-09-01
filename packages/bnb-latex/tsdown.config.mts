import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  outDir: 'dist',
  target: 'node24',
  platform: 'node',
})
