import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { moveCharacterMagicItem, saveCharacterMagicItem } from './characters';

const BLACK_STAG_PATH = join(
	import.meta.dirname,
	'../../../../../reference_material/beefy_boys_spreadsheets/yaml/andy-black-stag.yaml'
);
const HIBL_PATH = join(
	import.meta.dirname,
	'../../../../../reference_material/beefy_boys_spreadsheets/yaml/hibl-burley.yaml'
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadCharacter(raw: string): any {
	return yaml.load(raw);
}

describe.sequential('magic equipment editing persistence', () => {
	let originalYaml = '';
	let originalHiblYaml = '';

	beforeAll(async () => {
		originalYaml = await readFile(BLACK_STAG_PATH, 'utf-8');
		originalHiblYaml = await readFile(HIBL_PATH, 'utf-8');
	});

	afterAll(async () => {
		await writeFile(BLACK_STAG_PATH, originalYaml, 'utf-8');
		await writeFile(HIBL_PATH, originalHiblYaml, 'utf-8');
	});

	it('persists magic-item effect edits and recalculates abilities', async () => {
		const before = loadCharacter(await readFile(BLACK_STAG_PATH, 'utf-8'));
		const equipped = before.character.inventory.equipped as unknown[][];
		const beltIndex = equipped.findIndex((item) => Array.isArray(item) && item[4] === 34);
		expect(beltIndex).toBeGreaterThan(-1);

		await saveCharacterMagicItem(
			'andy-black-stag',
			'equipped',
			beltIndex,
			34,
			"Belt of Giant's Strength +6",
			{
			'str-enhancement': '6'
			}
		);

		const updatedRaw = await readFile(BLACK_STAG_PATH, 'utf-8');
		const updated = loadCharacter(updatedRaw);
		const updatedEquipped = updated.character.inventory.equipped as unknown[][];
		const belt = updatedEquipped.find((item) => Array.isArray(item) && item[4] === 34);

		expect(belt).toBeTruthy();
		expect(belt?.[0]).toBe("Belt of Giant's Strength +6");
		expect((belt?.[5] as Record<string, unknown>)['str-enhancement']).toBe(6);
		expect(updated.character.abilities.strength[0]).toBe(22);
		expect(updated.character.abilities.strength[1].str).toBe(6);
	});

	it('persists moving a magic item between locations and recalculates', async () => {
		const before = loadCharacter(await readFile(BLACK_STAG_PATH, 'utf-8'));
		const equipped = before.character.inventory.equipped as unknown[][];
		const beltIndex = equipped.findIndex((item) => Array.isArray(item) && item[4] === 34);
		expect(beltIndex).toBeGreaterThan(-1);
		await moveCharacterMagicItem('andy-black-stag', 'equipped', 'pack', beltIndex, 34);

		const updatedRaw = await readFile(BLACK_STAG_PATH, 'utf-8');
		const updated = loadCharacter(updatedRaw);
		const updatedEquipped = updated.character.inventory.equipped as unknown[][];
		const pack = updated.character.inventory.pack as unknown[][];
		const equippedBelt = updatedEquipped.find((item) => Array.isArray(item) && item[4] === 34);
		const packedBelt = pack.find((item) => Array.isArray(item) && item[4] === 34);

		expect(equippedBelt).toBeUndefined();
		expect(packedBelt).toBeTruthy();
		expect(updated.character.abilities.strength[0]).toBe(16);
		expect(updated.character.abilities.strength[1].str).toBe(3);
	});

	it('edits and moves items that have non-numeric value in position 4', async () => {
		const before = loadCharacter(await readFile(HIBL_PATH, 'utf-8'));
		const pack = before.character.inventory.pack as unknown[][];
		const scrollIndex = pack.findIndex(
			(item) => Array.isArray(item) && item[0] === 'Scroll Lesser Planar Binding'
		);
		expect(scrollIndex).toBeGreaterThan(-1);
		expect(typeof pack[scrollIndex][4]).toBe('string');

		await saveCharacterMagicItem(
			'hibl-burley',
			'pack',
			scrollIndex,
			null,
			'Scroll Lesser Planar Binding (Edited)',
			{}
		);
		await moveCharacterMagicItem('hibl-burley', 'pack', 'equipped', scrollIndex, null);

		const updated = loadCharacter(await readFile(HIBL_PATH, 'utf-8'));
		const updatedEquipped = updated.character.inventory.equipped as unknown[][];
		expect(
			updatedEquipped.some(
				(item: unknown) =>
					Array.isArray(item) && item[0] === 'Scroll Lesser Planar Binding (Edited)'
			)
		).toBe(true);
	});
});
