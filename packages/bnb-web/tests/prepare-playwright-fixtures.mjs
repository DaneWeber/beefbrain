import { mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const legacyYamlDir = resolve(repoRoot, 'reference_material', 'beefy_boys_spreadsheets', 'yaml');
const partiesDir = resolve(repoRoot, 'data', 'parties');
const targetDir = resolve(import.meta.dirname, '..', '.playwright-data', 'parties');

// Two parties, so the party switcher has something to switch between.
await rm(targetDir, { recursive: true, force: true });
await mkdir(resolve(targetDir, 'beefy-boys'), { recursive: true });
await mkdir(resolve(targetDir, 'brainy-boys'), { recursive: true });

await copyFile(
	resolve(legacyYamlDir, 'ryan-landorf.yaml'),
	resolve(targetDir, 'beefy-boys', 'ryan-landorf.yaml')
);
await copyFile(
	resolve(partiesDir, 'brainy-boys', 'voidan.bnb.yaml'),
	resolve(targetDir, 'brainy-boys', 'voidan.bnb.yaml')
);
