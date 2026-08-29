import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
	webServer: {
		command: 'pnpm --filter bnb-core build && node tests/prepare-playwright-fixtures.mjs && pnpm run build && pnpm run preview',
		port: 4173,
		timeout: 240 * 1000,
		env: {
			BNB_YAML_DIR: resolve(import.meta.dirname, '.playwright-data/yaml')
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
