import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { updateCalculatedFields, validateBeefBrainData } from 'bnb-core';
import yaml from 'js-yaml';

const YAML_DIR = join(
	import.meta.dirname,
	'../../../../../reference_material/beefy_boys_spreadsheets/yaml'
);
const LEVEL_SKIP_KEYS = new Set(['xp', 'hd', 'hp', 'max-hp', 'ecl', 'level-adjustment']);

export interface CharacterSummary {
	slug: string;
	name: string;
	player: string;
	race: string;
	classes: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CharacterData = Record<string, any>;

export function parseCharacterYamlContent(raw: string, sourceName: string): CharacterData {
	if (!validateBeefBrainData(raw)) {
		throw new Error(`Invalid character YAML in "${sourceName}"`);
	}

	const calculated = updateCalculatedFields(raw);
	const parsed = yaml.load(calculated);
	if (!parsed || typeof parsed !== 'object') {
		throw new Error(`Character YAML in "${sourceName}" did not parse to an object`);
	}

	return parsed as CharacterData;
}

export function isYamlFileName(fileName: string): boolean {
	return fileName.endsWith('.yaml') || fileName.endsWith('.yml');
}

export function fileNameToSlug(fileName: string): string {
	if (fileName.endsWith('.yaml')) {
		return basename(fileName, '.yaml');
	}
	if (fileName.endsWith('.yml')) {
		return basename(fileName, '.yml');
	}
	return fileName;
}

export async function listCharacters(): Promise<CharacterSummary[]> {
	const files = await readdir(YAML_DIR);
	const yamlFiles = files.filter((f) => isYamlFileName(f)).sort();

	const summaries: CharacterSummary[] = [];
	for (const file of yamlFiles) {
		const raw = await readFile(join(YAML_DIR, file), 'utf-8');
		const data = parseCharacterYamlContent(raw, file);
		const char = data?.character;
		if (!char) continue;

		const desc = char.description ?? {};
		const levels = char.levels ?? {};

		// Extract class names from levels (skip non-class fields)
		const classes = Object.keys(levels)
			.filter((k) => !LEVEL_SKIP_KEYS.has(k))
			.map((k) => {
				const val = levels[k];
				const level = Array.isArray(val) ? val[0] : val;
				return `${formatKey(k)} ${level}`;
			})
			.join(' / ');

		summaries.push({
			slug: fileNameToSlug(file),
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
	const yamlFiles = files.filter((f) => isYamlFileName(f)).sort();

	const results: { slug: string; character: CharacterData }[] = [];
	for (const file of yamlFiles) {
		const raw = await readFile(join(YAML_DIR, file), 'utf-8');
		const data = parseCharacterYamlContent(raw, file);
		if (data?.character) {
			results.push({ slug: fileNameToSlug(file), character: data.character });
		}
	}
	return results;
}

export async function loadCharacter(slug: string): Promise<CharacterData | null> {
	const filePath = join(YAML_DIR, `${slug}.yaml`);
	try {
		const raw = await readFile(filePath, 'utf-8');
		return parseCharacterYamlContent(raw, `${slug}.yaml`);
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

export function formatKey(key: string): string {
	return key
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}
