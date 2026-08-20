import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import yaml from 'js-yaml';
import { validateBeefBrainData, updateCalculatedFields, dataToCompactYAML, type BeefBrainData } from 'bnb-core';

const YAML_DIR = join(
	import.meta.dirname,
	'../../../../../reference_material/beefy_boys_spreadsheets/yaml'
);

export interface CharacterSummary {
	slug: string;
	name: string;
	player: string;
	race: string;
	classes: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CharacterData = Record<string, any>;

export interface LoadedCharacter {
	data: BeefBrainData;
	raw: string;
	isValid: boolean;
	validationError?: string;
}

export async function listCharacters(): Promise<CharacterSummary[]> {
	const files = await readdir(YAML_DIR);
	const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

	const summaries: CharacterSummary[] = [];
	for (const file of yamlFiles) {
		const raw = await readFile(join(YAML_DIR, file), 'utf-8');
		
		// Validate using bnb-core
		if (!validateBeefBrainData(raw)) {
			console.warn(`Invalid character file: ${file}`);
			continue;
		}
		
		const data = yaml.load(raw) as CharacterData;
		const char = data?.character;
		if (!char) continue;

		const desc = char.description ?? {};
		const levels = char.levels ?? {};

		// Extract class names from levels (skip xp, hd, hp, max-hp, ecl, level-adjustment)
		const skipKeys = new Set(['xp', 'hd', 'hp', 'max-hp', 'ecl', 'level-adjustment']);
		const classes = Object.keys(levels)
			.filter((k) => !skipKeys.has(k))
			.map((k) => {
				const val = levels[k];
				const level = Array.isArray(val) ? val[0] : val;
				return `${formatKey(k)} ${level}`;
			})
			.join(' / ');

		summaries.push({
			slug: basename(file, '.yaml'),
			name: desc.name ?? 'Unknown',
			player: desc.player ?? 'Unknown',
			race: desc.race ?? 'Unknown',
			classes
		});
	}

	return summaries;
}

export async function loadAllCharacters(): Promise<{ slug: string; character: CharacterData }[]> {
	const files = await readdir(YAML_DIR);
	const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

	const results: { slug: string; character: CharacterData }[] = [];
	for (const file of yamlFiles) {
		const raw = await readFile(join(YAML_DIR, file), 'utf-8');
		
		// Validate using bnb-core
		if (!validateBeefBrainData(raw)) {
			console.warn(`Invalid character file: ${file}`);
			continue;
		}
		
		const data = yaml.load(raw) as CharacterData;
		if (data?.character) {
			results.push({ slug: basename(file, '.yaml'), character: data.character });
		}
	}
	return results;
}

export async function loadCharacter(slug: string): Promise<CharacterData | null> {
	const filePath = join(YAML_DIR, `${slug}.yaml`);
	try {
		const raw = await readFile(filePath, 'utf-8');
		
		// Validate using bnb-core
		if (!validateBeefBrainData(raw)) {
			console.error(`Invalid character file: ${slug}.yaml`);
			return null;
		}
		
		return yaml.load(raw) as CharacterData;
	} catch {
		return null;
	}
}

/**
 * Load character with validation info and automatic calculations
 */
export async function loadCharacterWithValidation(slug: string): Promise<LoadedCharacter | null> {
	const filePath = join(YAML_DIR, `${slug}.yaml`);
	try {
		const raw = await readFile(filePath, 'utf-8');
		
		// Validate using bnb-core
		const isValid = validateBeefBrainData(raw);
		
		if (!isValid) {
			return {
				data: yaml.load(raw) as BeefBrainData,
				raw,
				isValid: false,
				validationError: 'Invalid character data format'
			};
		}
		
		// Apply automatic calculations from bnb-core
		const calculatedYaml = updateCalculatedFields(raw);
		const data = yaml.load(calculatedYaml) as BeefBrainData;
		
		return {
			data,
			raw: calculatedYaml,
			isValid: true
		};
	} catch (error) {
		console.error(`Error loading character ${slug}:`, error);
		return null;
	}
}

export function formatKey(key: string): string {
	return key
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

/**
 * Mutate an item array in-place: update name and replace the effects object.
 */
function applyItemEdits(
	item: unknown[],
	newName: string,
	newEffects: Record<string, string>
): void {
	item[0] = newName;

	const tagsPos = Array.isArray(item[item.length - 1]) ? item.length - 1 : -1;
	const tags = tagsPos >= 0 ? item[tagsPos] : null;

	const effectKeys = Object.keys(newEffects).filter((k) => k.trim() !== '');
	if (effectKeys.length > 0) {
		const effectsObj: Record<string, unknown> = {};
		for (const k of effectKeys) {
			const v = newEffects[k].trim();
			const num = Number(v);
			effectsObj[k.trim()] = Number.isFinite(num) && v !== '' ? num : v;
		}
		if (tagsPos === 5) {
			// [name, qty, type, weight, order, [tags]] — insert effects before tags
			item.splice(5, 0, effectsObj);
		} else {
			item[5] = effectsObj;
		}
	} else {
		// Remove effects object if present, keep tags
		if (tagsPos === 6 && item[5] && typeof item[5] === 'object' && !Array.isArray(item[5])) {
			item.splice(5, 1);
		} else if (tagsPos < 0 && item.length > 5 && typeof item[5] === 'object' && !Array.isArray(item[5])) {
			item.splice(5, 1);
		}
	}

	// Ensure tags are still last
	if (tags !== null && !Array.isArray(item[item.length - 1])) {
		item.push(tags);
	}
}

/**
 * Write the data back to disk using bnb-core's compact YAML format,
 * then run updateCalculatedFields so derived stats stay in sync.
 */
async function saveAndRecalculate(filePath: string, data: BeefBrainData): Promise<void> {
	const compactYaml = dataToCompactYAML(data);
	const recalculated = updateCalculatedFields(compactYaml);
	await writeFile(filePath, recalculated, 'utf-8');
}

/**
 * Update a single magic item's name and effects in the character YAML,
 * then recalculate all derived fields.
 */
export async function saveCharacterMagicItem(
	slug: string,
	location: string,
	itemOrderIndex: number,
	newName: string,
	newEffects: Record<string, string>
): Promise<void> {
	const filePath = join(YAML_DIR, `${slug}.yaml`);
	const raw = await readFile(filePath, 'utf-8');
	const data = yaml.load(raw) as BeefBrainData;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const items: unknown[] = (data as any)?.character?.inventory?.[location];
	if (!Array.isArray(items)) throw new Error(`Location "${location}" not found`);

	const idx = items.findIndex((item) => Array.isArray(item) && (item as unknown[])[4] === itemOrderIndex);
	if (idx === -1) throw new Error(`Item with order index ${itemOrderIndex} not found`);

	applyItemEdits(items[idx] as unknown[], newName, newEffects);
	await saveAndRecalculate(filePath, data);
}

/**
 * Move a magic item from one inventory location to another.
 * Recalculates derived fields after the move so equipped bonuses update.
 */
export async function moveCharacterMagicItem(
	slug: string,
	fromLocation: string,
	toLocation: string,
	itemOrderIndex: number
): Promise<void> {
	const filePath = join(YAML_DIR, `${slug}.yaml`);
	const raw = await readFile(filePath, 'utf-8');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data = yaml.load(raw) as any;

	const fromItems: unknown[] = data?.character?.inventory?.[fromLocation];
	if (!Array.isArray(fromItems)) throw new Error(`Location "${fromLocation}" not found`);

	const idx = fromItems.findIndex((item) => Array.isArray(item) && (item as unknown[])[4] === itemOrderIndex);
	if (idx === -1) throw new Error(`Item with order index ${itemOrderIndex} not found`);

	const [item] = fromItems.splice(idx, 1);

	const toItems: unknown[] = data?.character?.inventory?.[toLocation];
	if (!Array.isArray(toItems)) throw new Error(`Location "${toLocation}" not found`);
	toItems.push(item);

	await saveAndRecalculate(filePath, data as BeefBrainData);
}

/**
 * Return all inventory location keys for a character (excluding _ prefixed and money).
 */
export async function getInventoryLocations(slug: string): Promise<string[]> {
	const filePath = join(YAML_DIR, `${slug}.yaml`);
	const raw = await readFile(filePath, 'utf-8');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data = yaml.load(raw) as any;
	const inv = data?.character?.inventory ?? {};
	return Object.keys(inv).filter((k) => !k.startsWith('_') && k !== 'money');
}
