/** Categorize D&D 3.5 skills by play situation, with ability mappings */

/** Which ability governs each skill */
export const skillAbility: Record<string, string> = {
	appraise: 'intelligence',
	balance: 'dexterity',
	bluff: 'charisma',
	climb: 'strength',
	concentration: 'constitution',
	'craft-alchemy': 'intelligence',
	'craft-traps': 'intelligence',
	'decipher-script': 'intelligence',
	diplomacy: 'charisma',
	'disable-device': 'intelligence',
	disguise: 'charisma',
	'escape-artist': 'dexterity',
	forgery: 'intelligence',
	'gather-information': 'charisma',
	'handle-animal': 'charisma',
	heal: 'wisdom',
	hide: 'dexterity',
	intimidate: 'charisma',
	jump: 'strength',
	listen: 'wisdom',
	'move-silently': 'dexterity',
	'open-lock': 'dexterity',
	ride: 'dexterity',
	search: 'intelligence',
	'sense-motive': 'wisdom',
	'sleight-of-hand': 'dexterity',
	spellcraft: 'intelligence',
	spot: 'wisdom',
	survival: 'wisdom',
	swim: 'strength',
	tumble: 'dexterity',
	'use-magic-device': 'charisma',
	'use-rope': 'dexterity'
};

/**
 * Skills that require training (ranks) to use.
 * Matches the D&D 3.5 catalog at bnb-core/catalogs/dnd35/skills.yaml
 * Prefix-matched for knowledge-*, profession-*
 */
const trainedOnlySet = new Set([
	'decipher-script',
	'disable-device',
	'handle-animal',
	'open-lock',
	'sleight-of-hand',
	'speak-language',
	'spellcraft',
	'tumble',
	'use-magic-device'
]);

/** Is this skill trained-only? */
export function isTrainedOnly(key: string): boolean {
	if (trainedOnlySet.has(key)) return true;
	if (key.startsWith('knowledge')) return true;
	if (key.startsWith('profession')) return true;
	return false;
}

/** Guess ability for knowledge-* and perform-* skills */
export function getSkillAbility(key: string): string {
	if (skillAbility[key]) return skillAbility[key];
	if (key.startsWith('knowledge')) return 'intelligence';
	if (key.startsWith('perform')) return 'charisma';
	if (key.startsWith('craft')) return 'intelligence';
	if (key.startsWith('profession')) return 'wisdom';
	return 'intelligence'; // safe fallback
}

export type SkillCategory =
	| 'social'
	| 'detection'
	| 'stealth'
	| 'physical'
	| 'magic'
	| 'practical'
	| 'knowledge'
	| 'other';

const socialSet = new Set([
	'bluff',
	'diplomacy',
	'disguise',
	'gather-information',
	'handle-animal',
	'intimidate',
	'sense-motive'
]);

const detectionSet = new Set(['listen', 'spot', 'search']);

const stealthSet = new Set(['hide', 'move-silently']);

const physicalSet = new Set([
	'balance',
	'climb',
	'escape-artist',
	'jump',
	'ride',
	'swim',
	'tumble'
]);

const magicSet = new Set([
	'concentration',
	'spellcraft',
	'use-magic-device'
]);

const practicalSet = new Set([
	'disable-device',
	'open-lock',
	'sleight-of-hand',
	'heal',
	'appraise',
	'forgery',
	'decipher-script'
]);

/** Default skills to always show per category (even if character doesn't list them) */
export const defaultSkillsByCategory: Record<string, string[]> = {
	social: ['bluff', 'diplomacy', 'disguise', 'gather-information', 'intimidate', 'sense-motive'],
	detection: ['listen', 'spot', 'search', 'survival'],
	stealth: ['hide', 'move-silently'],
	physical: ['balance', 'climb', 'escape-artist', 'jump', 'ride', 'swim', 'tumble'],
	magic: ['concentration', 'spellcraft', 'use-magic-device'],
	practical: ['disable-device', 'heal', 'open-lock', 'sleight-of-hand']
};

export function categorizeSkill(key: string): SkillCategory {
	if (socialSet.has(key) || key.startsWith('perform') || key.startsWith('handle')) return 'social';
	if (detectionSet.has(key)) return 'detection';
	if (stealthSet.has(key)) return 'stealth';
	if (physicalSet.has(key)) return 'physical';
	if (magicSet.has(key)) return 'magic';
	if (practicalSet.has(key)) return 'practical';
	if (key.startsWith('knowledge') || key === 'survival') return 'knowledge';
	return 'other';
}

export interface CategorizedSkills {
	social: [string, unknown][];
	detection: [string, unknown][];
	stealth: [string, unknown][];
	physical: [string, unknown][];
	magic: [string, unknown][];
	practical: [string, unknown][];
	knowledge: [string, unknown][];
	other: [string, unknown][];
}

/**
 * Categorize all skills, filling in defaults at the bare ability mod
 * for skills the character doesn't explicitly list.
 */
export function categorizeAllSkills(
	skills: Record<string, unknown>,
	abilityMods: Record<string, number>
): CategorizedSkills {
	const result: CategorizedSkills = {
		social: [],
		detection: [],
		stealth: [],
		physical: [],
		magic: [],
		practical: [],
		knowledge: [],
		other: []
	};

	// Track which skills we've placed
	const placed = new Set<string>();

	// First, place all skills the character actually has
	for (const [key, val] of Object.entries(skills)) {
		if (key.startsWith('_')) continue;
		const cat = categorizeSkill(key);
		result[cat].push([key, val]);
		placed.add(key);
	}

	// Then fill in defaults for skills not listed (skip trained-only)
	for (const [cat, defaults] of Object.entries(defaultSkillsByCategory)) {
		for (const skillKey of defaults) {
			if (!placed.has(skillKey) && !isTrainedOnly(skillKey)) {
				const ability = getSkillAbility(skillKey);
				const abilMod = abilityMods[ability] ?? 0;
				// Represent as a sum-pattern array: [total, {ability: mod}]
				result[cat as SkillCategory].push([skillKey, [abilMod]]);
				placed.add(skillKey);
			}
		}
	}

	// Sort each category alphabetically
	for (const cat of Object.keys(result) as SkillCategory[]) {
		result[cat].sort(([a], [b]) => a.localeCompare(b));
	}

	return result;
}
