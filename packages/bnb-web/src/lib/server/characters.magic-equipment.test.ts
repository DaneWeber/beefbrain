import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import { moveCharacterMagicItem, saveCharacterMagicItem } from './characters';

const BLACK_STAG_PATH = join(
	fileURLToPath(new URL('.', import.meta.url)),
	'../../../../../reference_material/beefy_boys_spreadsheets/yaml/andy-black-stag.yaml'
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadCharacter(raw: string): any {
	return yaml.load(raw);
}

describe.sequential('magic equipment editing persistence', () => {
	let originalYaml = '';

	beforeAll(async () => {
		originalYaml = await readFile(BLACK_STAG_PATH, 'utf-8');
	});

	afterAll(async () => {
		await writeFile(BLACK_STAG_PATH, originalYaml, 'utf-8');
	});

	it('persists magic-item effect edits and recalculates abilities', async () => {
		await saveCharacterMagicItem('andy-black-stag', 'equipped', 34, "Belt of Giant's Strength +6", {
			'str-enhancement': '6'
		});

		const updatedRaw = await readFile(BLACK_STAG_PATH, 'utf-8');
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
		await moveCharacterMagicItem('andy-black-stag', 'equipped', 'pack', 34);

		const updatedRaw = await readFile(BLACK_STAG_PATH, 'utf-8');
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
