import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { extractAllInventoryItems } from '$lib/inventory';
import { listCharacters, listParties, loadAllCharacters } from './characters';
import { loadDMMetadata } from './dmMetadata';

/**
 * These run against the real data/parties directory rather than a fixture, so
 * they catch a party's characters going missing or its DM metadata coming
 * unlinked from the item IDs in their inventories.
 */
const MIGRATED_SLUGS = [
	'andy-black-stag',
	'ben-surfeit',
	'chuck-phileum-collins',
	'don-cade',
	'hibl-burley',
	'jason-tallinn',
	'mike-illigrim',
	'runa-frostwhisper',
	'ryan-landorf'
];

describe('the real beefy-boys party', () => {
	let previousPartiesDir: string | undefined;

	beforeAll(() => {
		previousPartiesDir = process.env.BNB_PARTIES_DIR;
		delete process.env.BNB_PARTIES_DIR;
	});

	afterAll(() => {
		if (previousPartiesDir !== undefined) {
			process.env.BNB_PARTIES_DIR = previousPartiesDir;
		}
	});

	it('holds every migrated character', async () => {
		const slugs = (await listCharacters('beefy-boys')).map((character) => character.slug);
		expect(slugs).toEqual(expect.arrayContaining(MIGRATED_SLUGS));
	});

	it('counts them on the party listing', async () => {
		const beefy = (await listParties()).find((party) => party.slug === 'beefy-boys');
		expect(beefy?.characterCount).toBeGreaterThanOrEqual(MIGRATED_SLUGS.length);
	});

	it('resolves DM metadata for inventory item IDs', async () => {
		const characters = await loadAllCharacters('beefy-boys');
		const metadata = await loadDMMetadata('beefy-boys');
		const items = extractAllInventoryItems(characters, metadata);

		// Landorf's Bastard Sword carries ID 209; its value and aura live only in
		// the party's item-metadata.yaml.
		const bastardSword = items.find((item) => item.itemId === 209);
		expect(bastardSword).toMatchObject({
			pcName: 'Landorf',
			trueDescription: 'Bastard Sword +2 Giant-Bane',
			auraStrength: 'moderate',
			auraType: 'transmutation',
			marketValue: 18335
		});
	});

	it('enriches items across the whole party, not just one character', async () => {
		const characters = await loadAllCharacters('beefy-boys');
		const metadata = await loadDMMetadata('beefy-boys');
		const items = extractAllInventoryItems(characters, metadata);

		const enrichedOwners = new Set(
			items.filter((item) => item.itemId > 0 && item.marketValue > 0).map((item) => item.pcName)
		);
		expect(enrichedOwners.size).toBeGreaterThan(1);
	});
});
