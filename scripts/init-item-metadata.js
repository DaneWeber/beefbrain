/**
 * Script to initialize DM item metadata from all character YAML files
 * Scans all items and assigns unique IDs, creating the item-metadata.yaml file
 * Run with: node scripts/init-item-metadata.js
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const YAML_DIR = join(__dirname, '../reference_material/beefy_boys_spreadsheets/yaml');
const METADATA_PATH = join(__dirname, '../reference_material/dm-only/item-metadata.yaml');

async function initializeMetadata() {
	console.log('Initializing item metadata from YAML files...');

	const metadata = {
		nextId: 1,
		items: {},
		itemMapping: {}
	};

	// Read all YAML files
	const files = await readdir(YAML_DIR);
	const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

	for (const file of yamlFiles) {
		const filePath = join(YAML_DIR, file);
		const raw = await readFile(filePath, 'utf-8');
		const data = yaml.load(raw);

		if (!data || typeof data !== 'object' || !('character' in data)) continue;

		const character = data.character;
		const charName = character?.description?.name || file.replace('.yaml', '');
		const inventory = character?.inventory;

		if (!inventory || typeof inventory !== 'object') continue;

		// Get list of locations
		const locations = Array.isArray(inventory._on)
			? inventory._on
			: Object.keys(inventory).filter((k) => !k.startsWith('_') && k !== 'money');

		// Process each location
		for (const location of locations) {
			const locationItems = inventory[location];
			if (!Array.isArray(locationItems)) continue;

			// Process each item
			for (let i = 0; i < locationItems.length; i++) {
				const item = locationItems[i];
				if (!Array.isArray(item) || item.length < 5) continue;

				const [description, quantity, category, weight, price] = item;
				if (!description || !category) continue;

				// Create mapping key
				const key = `${charName}/${location}/${i}`;
				const itemId = metadata.nextId;

				// Add to mapping
				metadata.itemMapping[key] = itemId;

				// Initialize item metadata
				metadata.items[itemId] = {
					description: String(description),
					marketValue: typeof price === 'number' ? price : 0,
					auraStrength: 'none',
					auraType: 'universal',
					origin: '',
					dmNotes: ''
				};

				metadata.nextId += 1;

				console.log(`  [${itemId}] ${charName}/${location}/${i}: ${description}`);
			}
		}

		// Handle horse/mount inventory
		if (inventory.horse && Array.isArray(inventory.horse)) {
			for (let i = 0; i < inventory.horse.length; i++) {
				const item = inventory.horse[i];
				if (!Array.isArray(item) || item.length < 5) continue;

				const [description, quantity, category, weight, price] = item;
				if (!description || !category) continue;

				const key = `${charName}/mount/${i}`;
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

				console.log(`  [${itemId}] ${charName}/mount/${i}: ${description}`);
			}
		}
	}

	// Write metadata file
	const yamlContent = yaml.dump({
		nextId: metadata.nextId,
		items: metadata.items,
		itemMapping: metadata.itemMapping
	});

	await writeFile(METADATA_PATH, yamlContent, 'utf-8');
	console.log(`\n✓ Created ${METADATA_PATH}`);
	console.log(`✓ Assigned ${metadata.nextId - 1} unique item IDs`);
	console.log(`✓ Ready for DM to enrich metadata (descriptions, auras, origins, notes)`);
}

initializeMetadata().catch(console.error);
