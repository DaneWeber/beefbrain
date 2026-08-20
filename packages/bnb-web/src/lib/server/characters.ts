import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import yaml from 'js-yaml';
import { validateBeefBrainData, updateCalculatedFields, type BeefBrainData } from 'bnb-core';

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
 * Update a single magic item's name and effects in the character YAML.
 *
 * @param slug - Character file slug (without .yaml)
 * @param location - Inventory location key (e.g. 'equipped', 'pack')
 * @param itemOrderIndex - The numeric index stored at item[4] (1-based sort order)
 * @param newName - Updated item name (item[0])
 * @param newEffects - Updated effects as a flat key:value object (replaces item[5] properties)
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
	const data = yaml.load(raw) as CharacterData;

	const items: unknown[] = data?.character?.inventory?.[location];
	if (!Array.isArray(items)) throw new Error(`Location "${location}" not found`);

	const idx = items.findIndex((item) => Array.isArray(item) && item[4] === itemOrderIndex);
	if (idx === -1) throw new Error(`Item with order index ${itemOrderIndex} not found`);

	const item = items[idx] as unknown[];
	item[0] = newName;

	// Determine where properties object sits (may or may not exist)
	const tagsPos = Array.isArray(item[item.length - 1]) ? item.length - 1 : -1;
	const tags = tagsPos >= 0 ? item[tagsPos] : null;

	// Build new effects object; omit if empty
	const effectKeys = Object.keys(newEffects).filter((k) => k.trim() !== '');
	if (effectKeys.length > 0) {
		const effectsObj: Record<string, unknown> = {};
		for (const k of effectKeys) {
			const raw = newEffects[k].trim();
			// Coerce numeric values
			const num = Number(raw);
			effectsObj[k.trim()] = Number.isFinite(num) && raw !== '' ? num : raw;
		}
		// Slot 5 is properties (if tags at end), or append before tags
		if (tagsPos === 6) {
			item[5] = effectsObj;
		} else if (tagsPos === 5) {
			// Currently: [name, qty, type, weight, order, [tags]] — insert effects
			item.splice(5, 0, effectsObj);
		} else if (tagsPos < 0) {
			// No tags — just set or append at 5
			item[5] = effectsObj;
		} else {
			item[5] = effectsObj;
		}
	} else {
		// Remove effects object if present (keep tags)
		if (tagsPos === 6 && item[5] && typeof item[5] === 'object' && !Array.isArray(item[5])) {
			item.splice(5, 1);
		} else if (tagsPos < 0 && item.length > 5 && typeof item[5] === 'object' && !Array.isArray(item[5])) {
			item.splice(5, 1);
		}
	}

	// Restore tags at end if they were shifted
	if (tags !== null) {
		const currentLast = item[item.length - 1];
		if (!Array.isArray(currentLast)) {
			item.push(tags);
		}
	}

	const newYaml = yaml.dump(data, { lineWidth: -1, quotingType: '"' });
	await writeFile(filePath, `---\n${newYaml}`, 'utf-8');
}
