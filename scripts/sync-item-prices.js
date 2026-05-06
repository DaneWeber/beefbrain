/**
 * Reads each character YAML file, extracts "X gp" prices from inventory items,
 * populates marketValue in item-metadata.yaml, and replaces the price string
 * with the item's integer ID in the character YAML file.
 *
 * Run with: node scripts/sync-item-prices.js
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const YAML_DIR = join(__dirname, '../reference_material/beefy_boys_spreadsheets/yaml');
const METADATA_PATH = join(__dirname, '../reference_material/dm-only/item-metadata.yaml');

/**
 * Parses "X gp" or "X.Y gp" strings into a number.
 * Returns the number, or null if priceField is already a number (i.e. an ID)
 * or is otherwise unrecognized.
 */
function parseGpString(priceField) {
	if (typeof priceField === 'number') return null; // already an ID
	if (typeof priceField === 'string') {
		const match = priceField.match(/^([\d.]+)\s*gp$/i);
		if (match) return parseFloat(match[1]);
	}
	return null;
}

/**
 * Escapes a string for safe use in a RegExp.
 */
function escapeRegex(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function syncPrices() {
	// --- Load metadata ---
	const metaRaw = await readFile(METADATA_PATH, 'utf-8');
	const metadata = yaml.load(metaRaw);
	let metadataChanged = false;

	// --- Process each character YAML ---
	const files = (await readdir(YAML_DIR)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

	for (const file of files) {
		const filePath = join(YAML_DIR, file);
		let rawText = await readFile(filePath, 'utf-8');
		const data = yaml.load(rawText);

		if (!data?.character) continue;
		const charName = data.character?.description?.name;
		if (!charName) continue;
		const inventory = data.character?.inventory;
		if (!inventory) continue;

		let fileChanged = false;

		// Collect all (location → mappingPrefix) pairs to process
		const locationPairs = [];

		// Equipped / pack / etc. from _on or all non-underscore, non-money keys
		const onLocations = Array.isArray(inventory._on)
			? inventory._on
			: Object.keys(inventory).filter((k) => !k.startsWith('_') && k !== 'money' && k !== 'horse');
		for (const loc of onLocations) {
			locationPairs.push({ sectionKey: loc, mappingPrefix: loc });
		}

		// Horse always maps to "mount"
		if (inventory.horse && Array.isArray(inventory.horse)) {
			locationPairs.push({ sectionKey: 'horse', mappingPrefix: 'mount' });
		}

		for (const { sectionKey, mappingPrefix } of locationPairs) {
			const items = inventory[sectionKey];
			if (!Array.isArray(items)) continue;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (!Array.isArray(item) || item.length < 5) continue;

				const [description, , , weight, priceField] = item;
				const gpValue = parseGpString(priceField);
				if (gpValue === null) continue; // already an ID or unrecognized

				const mappingKey = `${charName}/${mappingPrefix}/${i}`;
				const itemId = metadata.itemMapping[mappingKey];

				if (!itemId) {
					console.warn(`  WARNING: No mapping found for "${mappingKey}"`);
					continue;
				}

				// --- Update metadata ---
				if (metadata.items[itemId]) {
					if (metadata.items[itemId].marketValue !== gpValue) {
						metadata.items[itemId].marketValue = gpValue;
						metadataChanged = true;
					}
				} else {
					console.warn(`  WARNING: No metadata entry for ID ${itemId} (${mappingKey})`);
					continue;
				}

				// --- Replace price in raw character YAML text ---
				// Strategy: match the weight field immediately followed by the price string.
				// Using first-occurrence replace and processing items in order means duplicates
				// are handled correctly: each call removes the next remaining occurrence.
				const escapedWeight = escapeRegex(String(weight));
				const escapedPrice = escapeRegex(String(priceField));

				// Matches: "WEIGHT,  PRICE gp" followed by "," or "]"
				const regex = new RegExp(`(${escapedWeight},\\s*)${escapedPrice}(\\s*[,\\]])`);
				const newText = rawText.replace(regex, `$1${itemId}$2`);

				if (newText !== rawText) {
					rawText = newText;
					fileChanged = true;
					console.log(`  [${itemId}] ${mappingKey}: "${priceField}" → ${itemId} (marketValue: ${gpValue})`);
				} else {
					console.warn(`  WARNING: Could not replace price in ${file} for "${mappingKey}" — weight="${weight}" price="${priceField}"`);
				}
			}
		}

		if (fileChanged) {
			await writeFile(filePath, rawText, 'utf-8');
			console.log(`✓ Updated character file: ${file}`);
		} else {
			console.log(`  (no changes needed for ${file})`);
		}
	}

	// --- Write metadata ---
	if (metadataChanged) {
		// Dump with lineWidth -1 to prevent wrapping long descriptions
		const yamlContent = yaml.dump(
			{ nextId: metadata.nextId, items: metadata.items, itemMapping: metadata.itemMapping },
			{ lineWidth: -1 }
		);
		await writeFile(METADATA_PATH, yamlContent, 'utf-8');
		console.log('\n✓ Updated item-metadata.yaml');
	} else {
		console.log('\n(no metadata changes needed)');
	}

	console.log('\nDone.');
}

syncPrices().catch(console.error);
