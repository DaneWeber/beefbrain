import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import { moveCharacterMagicItem, saveCharacterMagicItem } from './characters';

const SOURCE_YAML = join(
	fileURLToPath(new URL('.', import.meta.url)),
	'../../../../../data/parties/beefy-boys/andy-black-stag.bnb.yaml'
);

const PARTY = 'test-party';
const SLUG = 'andy-black-stag';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadCharacter(raw: string): any {
	return yaml.load(raw);
}

describe.sequential('magic equipment editing persistence', () => {
	let partiesRoot = '';
	let characterPath = '';
	let previousPartiesDir: string | undefined;

	beforeAll(async () => {
		// Edit a throwaway copy so the repository's YAML is never rewritten.
		partiesRoot = await mkdtemp(join(tmpdir(), 'bnb-web-parties-'));
		await mkdir(join(partiesRoot, PARTY), { recursive: true });
		characterPath = join(partiesRoot, PARTY, `${SLUG}.yaml`);
		await copyFile(SOURCE_YAML, characterPath);

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

	it('persists magic-item effect edits and recalculates abilities', async () => {
		await saveCharacterMagicItem(PARTY, SLUG, 'equipped', 34, "Belt of Giant's Strength +6", {
			'str-enhancement': '6'
		});

		const updatedRaw = await readFile(characterPath, 'utf-8');
		const updated = loadCharacter(updatedRaw);
		const equipped = updated.character.inventory.equipped as unknown[][];
		const belt = equipped.find((item) => Array.isArray(item) && item[4] === 34);

		expect(belt).toBeTruthy();
		expect(belt?.[0]).toBe("Belt of Giant's Strength +6");
		expect((belt?.[5] as Record<string, unknown>)['str-enhancement']).toBe(6);
		expect(updated.character.abilities.strength[0]).toBe(22);
		expect(updated.character.abilities.strength[1].str).toBe(6);
	});

	it('persists moving a magic item between locations and recalculates', async () => {
		await moveCharacterMagicItem(PARTY, SLUG, 'equipped', 'pack', 34);

		const updatedRaw = await readFile(characterPath, 'utf-8');
		const updated = loadCharacter(updatedRaw);
		const equipped = updated.character.inventory.equipped as unknown[][];
		const pack = updated.character.inventory.pack as unknown[][];
		const equippedBelt = equipped.find((item) => Array.isArray(item) && item[4] === 34);
		const packedBelt = pack.find((item) => Array.isArray(item) && item[4] === 34);

		expect(equippedBelt).toBeUndefined();
		expect(packedBelt).toBeTruthy();
		expect(updated.character.abilities.strength[0]).toBe(16);
		expect(updated.character.abilities.strength[1].str).toBe(3);
	});
});
