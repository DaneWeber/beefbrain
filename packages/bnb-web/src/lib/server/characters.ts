import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import yaml from 'js-yaml';

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

export async function listCharacters(): Promise<CharacterSummary[]> {
	const files = await readdir(YAML_DIR);
	const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort();

	const summaries: CharacterSummary[] = [];
	for (const file of yamlFiles) {
		const raw = await readFile(join(YAML_DIR, file), 'utf-8');
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
		return yaml.load(raw) as CharacterData;
	} catch {
		return null;
	}
}

export function formatKey(key: string): string {
	return key
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}
