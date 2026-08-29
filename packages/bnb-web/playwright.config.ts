import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
	webServer: {
		command: 'node tests/prepare-playwright-fixtures.mjs && pnpm run dev -- --host 127.0.0.1 --port 4173',
		port: 4173,
		timeout: 300 * 1000,
		env: {
			BNB_YAML_DIR: resolve(import.meta.dirname, '.playwright-data/yaml')
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
