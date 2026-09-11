import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import * as yaml from 'js-yaml';
import type { BeefBrainData } from 'bnb-core';
import { listTemplates, renderLatex, type LatexTemplateKey, type TemplateInfo } from 'bnb-latex';

const require = createRequire(import.meta.url);
const {
	validateBeefBrainData,
	updateCalculatedFields,
	dataToCompactYAML,
	getSkillPointMismatch,
	formatSkillPointMismatch
} = require('bnb-core') as {
	validateBeefBrainData: (raw: string) => boolean;
	updateCalculatedFields: (raw: string) => string;
	dataToCompactYAML: (data: BeefBrainData) => string;
	getSkillPointMismatch: (
		data: unknown
	) => { fieldName: '_points'; available: number; distributed: number } | undefined;
	formatSkillPointMismatch: (mismatch: {
		fieldName: '_points';
		available: number;
		distributed: number;
	}) => string;
};

const DEFAULT_PARTIES_DIR = join(import.meta.dirname, '../../../../../data/parties');

/**
 * Root directory holding one subdirectory per party. Read lazily so tests can
 * point BNB_PARTIES_DIR at a fixture directory after this module is imported.
 */
function getPartiesDir(): string {
	return process.env.BNB_PARTIES_DIR ?? DEFAULT_PARTIES_DIR;
}

const LATEX_TEMPLATES = listTemplates();
const LATEX_TEMPLATE_KEYS = new Set(LATEX_TEMPLATES.map((template) => template.key));

/** Party and character slugs come from URLs, so keep them to plain path-safe names. */
const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function assertSafeSlug(kind: 'party' | 'character', value: string): string {
	if (!SLUG_PATTERN.test(value) || value.includes('..')) {
		throw new Error(`Invalid ${kind} slug "${value}"`);
	}
	return value;
}

function partyDir(party: string): string {
	return join(getPartiesDir(), assertSafeSlug('party', party));
}

const YAML_EXTENSIONS = ['.bnb.yaml', '.bnb.yml', '.yaml', '.yml'];

/** Strip a recognised YAML extension, so `voidan.bnb.yaml` has the slug `voidan`. */
function toCharacterSlug(file: string): string | null {
	const ext = YAML_EXTENSIONS.find((candidate) => file.toLowerCase().endsWith(candidate));
	return ext ? file.slice(0, -ext.length) : null;
}

interface CharacterFile {
	slug: string;
	file: string;
}

async function listCharacterFiles(party: string): Promise<CharacterFile[]> {
	let entries: string[];
	try {
		entries = await readdir(partyDir(party));
	} catch {
		return [];
	}

	return entries
		.map((file) => {
			const slug = toCharacterSlug(file);
			return slug ? { slug, file } : null;
		})
		.filter((entry): entry is CharacterFile => entry !== null)
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Resolve a character slug to its file on disk, whatever YAML extension it uses. */
async function characterPath(party: string, slug: string): Promise<string> {
	assertSafeSlug('character', slug);
	const match = (await listCharacterFiles(party)).find((entry) => entry.slug === slug);
	if (!match) {
		throw new Error(`Character "${slug}" not found in party "${party}"`);
	}
	return join(partyDir(party), match.file);
}

export interface PartySummary {
	slug: string;
	name: string;
	characterCount: number;
}

export interface CharacterSummary {
	slug: string;
	name: string;
	player: string;
	race: string;
	classes: string;
}

/** Every subdirectory of the parties root is a party. */
export async function listParties(): Promise<PartySummary[]> {
	let entries;
	try {
		entries = await readdir(getPartiesDir(), { withFileTypes: true });
	} catch {
		return [];
	}

	const parties: PartySummary[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory() || !SLUG_PATTERN.test(entry.name)) continue;
		const files = await listCharacterFiles(entry.name);
		parties.push({
			slug: entry.name,
			name: formatKey(entry.name),
			characterCount: files.length
		});
	}

	return parties.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getParty(party: string): Promise<PartySummary | null> {
	if (!SLUG_PATTERN.test(party) || party.includes('..')) return null;

	try {
		if (!(await stat(partyDir(party))).isDirectory()) return null;
	} catch {
		return null;
	}

	const files = await listCharacterFiles(party);
	return { slug: party, name: formatKey(party), characterCount: files.length };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CharacterData = Record<string, any>;

export function getSkillPointWarning(data: unknown): string | undefined {
	const mismatch = getSkillPointMismatch(data);
	return mismatch ? formatSkillPointMismatch(mismatch) : undefined;
}

export interface LoadedCharacter {
	data: BeefBrainData;
	raw: string;
	isValid: boolean;
	validationError?: string;
}

export async function listCharacters(party: string): Promise<CharacterSummary[]> {
	const summaries: CharacterSummary[] = [];
	for (const { slug, file } of await listCharacterFiles(party)) {
		const raw = await readFile(join(partyDir(party), file), 'utf-8');

		// Validate using bnb-core
		if (!validateBeefBrainData(raw)) {
			console.warn(`Invalid character file: ${party}/${file}`);
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
			slug,
			name: desc.name ?? 'Unknown',
			player: desc.player ?? 'Unknown',
			race: desc.race ?? 'Unknown',
			classes
		});
	}

	return summaries;
}

export async function loadAllCharacters(
	party: string
): Promise<{ slug: string; character: CharacterData }[]> {
	const results: { slug: string; character: CharacterData }[] = [];
	for (const { slug, file } of await listCharacterFiles(party)) {
		const raw = await readFile(join(partyDir(party), file), 'utf-8');

		// Validate using bnb-core
		if (!validateBeefBrainData(raw)) {
			console.warn(`Invalid character file: ${party}/${file}`);
			continue;
		}

		const data = yaml.load(raw) as CharacterData;
		if (data?.character) {
			results.push({ slug, character: data.character });
		}
	}
	return results;
}

export async function loadCharacter(party: string, slug: string): Promise<CharacterData | null> {
	try {
		const raw = await readFile(await characterPath(party, slug), 'utf-8');

		// Validate using bnb-core
		if (!validateBeefBrainData(raw)) {
			console.error(`Invalid character file: ${party}/${slug}`);
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
export async function loadCharacterWithValidation(
	party: string,
	slug: string
): Promise<LoadedCharacter | null> {
	try {
		const raw = await readFile(await characterPath(party, slug), 'utf-8');

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
		} else if (
			tagsPos < 0 &&
			item.length > 5 &&
			typeof item[5] === 'object' &&
			!Array.isArray(item[5])
		) {
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
	party: string,
	slug: string,
	location: string,
	itemOrderIndex: number,
	newName: string,
	newEffects: Record<string, string>
): Promise<void> {
	const filePath = await characterPath(party, slug);
	const raw = await readFile(filePath, 'utf-8');
	const data = yaml.load(raw) as BeefBrainData;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const items: unknown[] = (data as any)?.character?.inventory?.[location];
	if (!Array.isArray(items)) throw new Error(`Location "${location}" not found`);

	const idx = items.findIndex((item) => {
		if (!Array.isArray(item)) return false;
		const orderIndex = Number((item as unknown[])[4]);
		return Number.isFinite(orderIndex) && orderIndex === itemOrderIndex;
	});
	if (idx === -1) throw new Error(`Item with order index ${itemOrderIndex} not found`);

	applyItemEdits(items[idx] as unknown[], newName, newEffects);
	await saveAndRecalculate(filePath, data);
}

/**
 * Move a magic item from one inventory location to another.
 * Recalculates derived fields after the move so equipped bonuses update.
 */
export async function moveCharacterMagicItem(
	party: string,
	slug: string,
	fromLocation: string,
	toLocation: string,
	itemOrderIndex: number
): Promise<void> {
	const filePath = await characterPath(party, slug);
	const raw = await readFile(filePath, 'utf-8');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data = yaml.load(raw) as any;

	const fromItems: unknown[] = data?.character?.inventory?.[fromLocation];
	if (!Array.isArray(fromItems)) throw new Error(`Location "${fromLocation}" not found`);

	const idx = fromItems.findIndex((item) => {
		if (!Array.isArray(item)) return false;
		const orderIndex = Number((item as unknown[])[4]);
		return Number.isFinite(orderIndex) && orderIndex === itemOrderIndex;
	});
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
export async function getInventoryLocations(party: string, slug: string): Promise<string[]> {
	const raw = await readFile(await characterPath(party, slug), 'utf-8');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data = yaml.load(raw) as any;
	const inv = data?.character?.inventory ?? {};
	return Object.keys(inv).filter((k) => !k.startsWith('_') && k !== 'money');
}

export function getLatexTemplateOptions(): TemplateInfo[] {
	return LATEX_TEMPLATES;
}

export async function generateCharacterLatex(
	party: string,
	slug: string,
	templateKey: string
): Promise<{ latex: string; templateKey: LatexTemplateKey }> {
	if (!LATEX_TEMPLATE_KEYS.has(templateKey as LatexTemplateKey)) {
		throw new Error(`Unknown LaTeX template "${templateKey}"`);
	}

	const raw = await readFile(await characterPath(party, slug), 'utf-8');
	const rendered = renderLatex({
		yaml: raw,
		templateKey: templateKey as LatexTemplateKey
	});

	return {
		latex: rendered.latex,
		templateKey: rendered.template.key
	};
}
