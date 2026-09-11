/**
 * Script to initialize DM item metadata from character YAML files
 * Scans all items and assigns unique IDs, creating each party's item-metadata.yaml
 * Run with: node scripts/init-item-metadata.js [party ...] [--force]
 *
 * Item IDs are only unique within a party, so every party gets its own file at
 * data/parties/<party>/dm/item-metadata.yaml. Existing files are left alone
 * unless --force is passed, since the DM's enrichments are not recoverable.
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARTIES_DIR = process.env.BNB_PARTIES_DIR ?? join(__dirname, '../data/parties');

const YAML_EXTENSIONS = ['.bnb.yaml', '.bnb.yml', '.yaml', '.yml'];

const args = process.argv.slice(2);
const force = args.includes('--force');
const requestedParties = args.filter((arg) => !arg.startsWith('--'));

function isCharacterFile(file) {
	return YAML_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext));
}

async function exists(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/** Every subdirectory of the parties root is a party. */
async function listParties() {
	const entries = await readdir(PARTIES_DIR, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

function recordItem(metadata, charName, location, index, item) {
	if (!Array.isArray(item) || item.length < 5) return;

	const [description, quantity, category, weight, price] = item;
	if (!description || !category) return;

	const key = `${charName}/${location}/${index}`;
	const itemId = metadata.nextId;

	metadata.itemMapping[key] = itemId;
	metadata.items[itemId] = {
		description: String(description),
		marketValue: typeof price === 'number' ? price : 0,
		auraStrength: 'none',
		auraType: 'universal',
		origin: '',
		dmNotes: ''
	};

	metadata.nextId += 1;

	console.log(`  [${itemId}] ${key}: ${description}`);
}

async function initializeParty(party) {
	const partyDir = join(PARTIES_DIR, party);
	const metadataPath = join(partyDir, 'dm', 'item-metadata.yaml');

	if (!force && (await exists(metadataPath))) {
		console.log(`\n${party}: skipped, metadata already exists (pass --force to overwrite)`);
		console.log(`  ${metadataPath}`);
		return { party, skipped: true };
	}

	console.log(`\n${party}: scanning ${partyDir}`);

	const metadata = {
		nextId: 1,
		items: {},
		itemMapping: {}
	};

	const files = (await readdir(partyDir)).filter(isCharacterFile).sort();

	for (const file of files) {
		const raw = await readFile(join(partyDir, file), 'utf-8');
		const data = yaml.load(raw);

		if (!data || typeof data !== 'object' || !('character' in data)) continue;

		const character = data.character;
		const charName = character?.description?.name || file.replace(/\.(bnb\.)?ya?ml$/i, '');
		const inventory = character?.inventory;

		if (!inventory || typeof inventory !== 'object') continue;

		// Get list of locations
		const locations = Array.isArray(inventory._on)
			? inventory._on
			: Object.keys(inventory).filter((k) => !k.startsWith('_') && k !== 'money');

		for (const location of locations) {
			const locationItems = inventory[location];
			if (!Array.isArray(locationItems)) continue;

			for (let i = 0; i < locationItems.length; i++) {
				recordItem(metadata, charName, location, i, locationItems[i]);
			}
		}

		// Mount inventory is also addressable as "mount" for the DM tables
		if (Array.isArray(inventory.horse)) {
			for (let i = 0; i < inventory.horse.length; i++) {
				recordItem(metadata, charName, 'mount', i, inventory.horse[i]);
			}
		}
	}

	const yamlContent = yaml.dump({
		nextId: metadata.nextId,
		items: metadata.items,
		itemMapping: metadata.itemMapping
	});

	await mkdir(dirname(metadataPath), { recursive: true });
	await writeFile(metadataPath, yamlContent, 'utf-8');

	console.log(`✓ Wrote ${metadataPath}`);
	console.log(`✓ Assigned ${metadata.nextId - 1} unique item IDs`);

	return { party, skipped: false, count: metadata.nextId - 1 };
}

async function initializeMetadata() {
	const parties = requestedParties.length ? requestedParties : await listParties();

	if (parties.length === 0) {
		console.log(`No parties found under ${PARTIES_DIR}`);
		return;
	}

	console.log(`Initializing item metadata for: ${parties.join(', ')}`);

	const results = [];
	for (const party of parties) {
		results.push(await initializeParty(party));
	}

	const written = results.filter((result) => !result.skipped);
	const skipped = results.filter((result) => result.skipped);

	console.log(
		`\n✓ ${written.length} part${written.length === 1 ? 'y' : 'ies'} written` +
			(skipped.length ? `, ${skipped.length} skipped` : '')
	);
	console.log('✓ Ready for DM to enrich metadata (descriptions, auras, origins, notes)');
}

initializeMetadata().catch(console.error);
