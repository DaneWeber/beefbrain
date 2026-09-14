import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as yaml from 'js-yaml';
import { dmMetadataPath, loadDMMetadata, saveDMMetadata, type DMMetadata } from './dmMetadata';

/** Item ID 1 exists in both parties, with different notes behind it. */
function metadataFor(description: string, dmNotes: string): DMMetadata {
	return {
		nextId: 2,
		items: {
			1: {
				description,
				marketValue: 100,
				auraStrength: 'faint',
				auraType: 'evocation',
				origin: '',
				dmNotes
			}
		},
		itemMapping: { 'Someone/equipped/0': 1 }
	};
}

describe('party-scoped DM metadata', () => {
	let partiesRoot = '';
	let previousPartiesDir: string | undefined;

	beforeAll(async () => {
		partiesRoot = await mkdtemp(join(tmpdir(), 'bnb-web-dm-metadata-'));
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

	beforeEach(async () => {
		for (const party of ['beefy-boys', 'brainy-boys']) {
			await rm(join(partiesRoot, party), { recursive: true, force: true });
			await mkdir(join(partiesRoot, party), { recursive: true });
		}
	});

	it('stores metadata under the party directory', () => {
		expect(dmMetadataPath('beefy-boys')).toBe(
			join(partiesRoot, 'beefy-boys', 'dm', 'item-metadata.yaml')
		);
	});

	it('keeps the same item ID distinct between parties', async () => {
		await saveDMMetadata('beefy-boys', metadataFor('Frost Brand', 'Taken from the frost giant'));
		await saveDMMetadata('brainy-boys', metadataFor('Staff of Storms', 'Voidan built it'));

		const beefy = await loadDMMetadata('beefy-boys');
		const brainy = await loadDMMetadata('brainy-boys');

		expect(beefy.items[1].description).toBe('Frost Brand');
		expect(beefy.items[1].dmNotes).toBe('Taken from the frost giant');
		expect(brainy.items[1].description).toBe('Staff of Storms');
		expect(brainy.items[1].dmNotes).toBe('Voidan built it');
	});

	it('creates the dm directory on first save', async () => {
		await saveDMMetadata('brainy-boys', metadataFor('Staff of Storms', ''));

		const written = yaml.load(
			await readFile(join(partiesRoot, 'brainy-boys', 'dm', 'item-metadata.yaml'), 'utf-8')
		) as DMMetadata;
		expect(written.nextId).toBe(2);
		expect(written.itemMapping).toEqual({ 'Someone/equipped/0': 1 });
	});

	it('returns empty metadata for a party that has none', async () => {
		expect(await loadDMMetadata('beefy-boys')).toEqual({ nextId: 1, items: {}, itemMapping: {} });
	});

	it('returns empty metadata rather than throwing on an unreadable file', async () => {
		await mkdir(join(partiesRoot, 'beefy-boys', 'dm'), { recursive: true });
		await writeFile(dmMetadataPath('beefy-boys'), ': not: valid: yaml:', 'utf-8');

		expect(await loadDMMetadata('beefy-boys')).toEqual({ nextId: 1, items: {}, itemMapping: {} });
	});

	it('refuses to read or write outside the parties root', async () => {
		await expect(loadDMMetadata('../../etc')).rejects.toThrow('Invalid party slug');
		await expect(saveDMMetadata('../../etc', metadataFor('x', ''))).rejects.toThrow(
			'Invalid party slug'
		);
	});
});
