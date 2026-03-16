import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  minify: false,
  target: 'node18',
  platform: 'node',
  banner: {
    js: '#!/usr/bin/env node',
  },
})
