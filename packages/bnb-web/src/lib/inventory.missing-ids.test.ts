import { describe, expect, it } from 'vitest';
import {
	extractAllInventoryItems,
	formatMissingItemIdWarning,
	getMissingItemIds,
	type CharacterData
} from './inventory';

/** Position 4 holds the item's unique ID; a price string there means it has none. */
function character(
	name: string,
	equipped: unknown[][]
): { slug: string; character: CharacterData } {
	return {
		slug: name.toLowerCase(),
		character: {
			description: { name },
			inventory: { _on: ['equipped'], equipped }
		}
	};
}

const WITH_IDS = character('Landorf', [
	['Dagger', 1, 'weapon', '1 lb', 208],
	['Lion Shield +2', 1, 'shield', '15 lbs', 212]
]);

const WITHOUT_IDS = character('Runa Frostwhisper', [
	['Mithril Breastplate MW', 1, 'armor', '15 lbs', '4200 gp'],
	['Dagger', 1, 'weapon', '1 lb', '2 gp'],
	['Throwing Axe', 1, 'weapon', '2 lbs', '8 gp']
]);

describe('missing item IDs', () => {
	it('reports nothing when every item has an ID', () => {
		const items = extractAllInventoryItems([WITH_IDS]);
		expect(getMissingItemIds(items)).toBeUndefined();
	});

	it('counts the items that have no ID, per character', () => {
		const items = extractAllInventoryItems([WITH_IDS, WITHOUT_IDS]);
		const missing = getMissingItemIds(items);

		expect(missing).toEqual({
			count: 3,
			byCharacter: [{ pcName: 'Runa Frostwhisper', count: 3 }]
		});
	});

	it('orders characters by how many items are unlinked', () => {
		const items = extractAllInventoryItems([
			WITHOUT_IDS,
			character('Surfeit', [['Bedroll', 1, 'gear', '5 lbs', '0.1 gp']])
		]);

		expect(getMissingItemIds(items)?.byCharacter).toEqual([
			{ pcName: 'Runa Frostwhisper', count: 3 },
			{ pcName: 'Surfeit', count: 1 }
		]);
	});

	it('formats a warning naming the owners', () => {
		const items = extractAllInventoryItems([WITHOUT_IDS]);
		const missing = getMissingItemIds(items);

		expect(formatMissingItemIdWarning(missing!)).toBe(
			'3 items have no unique ID, so DM metadata cannot be attached: Runa Frostwhisper (3).'
		);
	});

	it('uses the singular for one item', () => {
		const items = extractAllInventoryItems([
			character('Surfeit', [['Bedroll', 1, 'gear', '5 lbs', '0.1 gp']])
		]);

		expect(formatMissingItemIdWarning(getMissingItemIds(items)!)).toBe(
			'1 item has no unique ID, so DM metadata cannot be attached: Surfeit (1).'
		);
	});

	it('gives unlinked items distinct placeholder IDs so they all render', () => {
		const items = extractAllInventoryItems([WITHOUT_IDS]);
		const ids = items.map((item) => item.itemId);

		expect(ids.every((id) => id < 0)).toBe(true);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
