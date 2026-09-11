import { mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const partiesDir = resolve(repoRoot, 'data', 'parties');
const targetDir = resolve(import.meta.dirname, '..', '.playwright-data', 'parties');

// Two parties, so the party switcher has something to switch between.
await rm(targetDir, { recursive: true, force: true });
await mkdir(resolve(targetDir, 'beefy-boys'), { recursive: true });
await mkdir(resolve(targetDir, 'brainy-boys'), { recursive: true });

// One character per party keeps the switcher assertions deterministic.
await copyFile(
	resolve(partiesDir, 'beefy-boys', 'ryan-landorf.bnb.yaml'),
	resolve(targetDir, 'beefy-boys', 'ryan-landorf.bnb.yaml')
);
await copyFile(
	resolve(partiesDir, 'brainy-boys', 'voidan.bnb.yaml'),
	resolve(targetDir, 'brainy-boys', 'voidan.bnb.yaml')
);

// DM metadata is party-scoped too, so the DM view reads it from the fixture
// party rather than from the real data directory.
await mkdir(resolve(targetDir, 'beefy-boys', 'dm'), { recursive: true });
await copyFile(
	resolve(partiesDir, 'beefy-boys', 'dm', 'item-metadata.yaml'),
	resolve(targetDir, 'beefy-boys', 'dm', 'item-metadata.yaml')
);
