import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node24',
  platform: 'node',
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
})
