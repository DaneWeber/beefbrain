import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const sourceDir = resolve(repoRoot, 'reference_material', 'beefy_boys_spreadsheets', 'yaml');
const targetDir = resolve(import.meta.dirname, '..', '.playwright-data', 'yaml');
const slug = 'ryan-landorf';

await mkdir(targetDir, { recursive: true });
await copyFile(resolve(sourceDir, `${slug}.yaml`), resolve(targetDir, `${slug}.yaml`));
