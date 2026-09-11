import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { getParty, listCharacters, listParties, loadCharacter } from './characters';

const REPO_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../../../../../');
const VOIDAN_YAML = join(REPO_ROOT, 'data/parties/brainy-boys/voidan.bnb.yaml');
const RUNA_YAML = join(REPO_ROOT, 'data/parties/beefy-boys/runa-frostwhisper.bnb.yaml');

describe('party discovery', () => {
	let partiesRoot = '';
	let previousPartiesDir: string | undefined;

	beforeAll(async () => {
		partiesRoot = await mkdtemp(join(tmpdir(), 'bnb-web-party-list-'));
		await mkdir(join(partiesRoot, 'brainy-boys'), { recursive: true });
		await mkdir(join(partiesRoot, 'beefy-boys'), { recursive: true });
		await copyFile(VOIDAN_YAML, join(partiesRoot, 'brainy-boys', 'voidan.bnb.yaml'));
		await copyFile(RUNA_YAML, join(partiesRoot, 'beefy-boys', 'runa-frostwhisper.bnb.yaml'));

		previousPartiesDir = process.env.BNB_PARTIES_DIR;
		process.env.BNB_PARTIES_DIR = partiesRoot;
	});

	afterAll(async () => {
		if (previousPartiesDir === undefined) {
			delete process.env.BNB_PARTIES_DIR;
		} else {
			process.env.BNB_PARTIES_DIR = previousPartiesDir;
		}
		await rm(partiesRoot, { recursive: true, force: true });
	});

	it('lists each directory as a party with a display name and count', async () => {
		const parties = await listParties();
		expect(parties).toEqual([
			{ slug: 'beefy-boys', name: 'Beefy Boys', characterCount: 1 },
			{ slug: 'brainy-boys', name: 'Brainy Boys', characterCount: 1 }
		]);
	});

	it('scopes the character list to one party', async () => {
		const brainy = await listCharacters('brainy-boys');
		expect(brainy.map((character) => character.name)).toEqual(['Voidan']);

		const beefy = await listCharacters('beefy-boys');
		expect(beefy.map((character) => character.name)).toEqual(['Runa Frostwhisper']);
	});

	it('derives slugs without the .bnb.yaml extension', async () => {
		const [voidan] = await listCharacters('brainy-boys');
		expect(voidan.slug).toBe('voidan');

		const loaded = await loadCharacter('brainy-boys', 'voidan');
		expect(loaded?.character?.description?.name).toBe('Voidan');
	});

	it('does not resolve a character from another party', async () => {
		expect(await loadCharacter('beefy-boys', 'voidan')).toBeNull();
	});

	it('rejects unknown parties and path traversal', async () => {
		expect(await getParty('no-such-party')).toBeNull();
		expect(await getParty('../..')).toBeNull();
		expect(await loadCharacter('brainy-boys', '../../etc/passwd')).toBeNull();
	});
});
