/**
 * Populates auraStrength and auraType fields in item-metadata.yaml
 * using D&D 3.5 SRD rules and pattern matching on item descriptions.
 *
 * Aura strength is based on caster level:
 *   faint: CL 1-5
 *   moderate: CL 6-11
 *   strong: CL 12-20
 *   overwhelming: CL 21+
 *
 * Run with: node scripts/populate-aura-data.js
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const METADATA_PATH = join(__dirname, '../reference_material/dm-only/item-metadata.yaml');

/**
 * Returns { auraStrength, auraType } based on caster level and school.
 */
function aura(cl, school) {
	let strength;
	if (cl <= 0) strength = 'none';
	else if (cl <= 5) strength = 'faint';
	else if (cl <= 11) strength = 'moderate';
	else if (cl <= 20) strength = 'strong';
	else strength = 'overwhelming';
	return { auraStrength: strength, auraType: school };
}

/**
 * Infer aura from item description using D&D 3.5 SRD patterns.
 * Returns { auraStrength, auraType } or null if mundane/unknown.
 */
function inferAura(description, marketValue) {
	const d = description.toLowerCase();

	// ---- Mundane items (explicitly non-magic) ----
	const mundanePatterns = [
		/^(dagger|sword|axe|mace|flail|spear|quarterstaff|sling|bow|crossbow|arrows?|bolts?|javelin)/,
		/^(dagger mw|rapier mw|sword mw)/,
		/^(backpack|bedroll|rope|candle|torch|chalk|waterskin|rations|soap|towel)/,
		/^(clothes|clothing|outfit|cloak(?! of))/,
		/^(flask|iron pot|sack|bag(?! of (holding|tricks))|pouch(?! spell))/,
		/^(flint and steel|crowbar|fishhook|sewing needle|parchment|inkpen|ink)/,
		/^(riding|saddle(?! exotic)|bridle|bit)/,
		/^(coins?|money|pp|gp|sp|cp)/,
		/^(horse|warhorse|mule|bison)(?! (named|of|that))/,
		/^(spellbook|spell component)/,
		/^(wooden bowl|smokestick|turkey bone|leather mask)/,
		/^holy symbol (wooden|of)/,
		/^(bolts? cold iron|bolts? silver|bolts? adamantine)/,
		/^sling ammo/,
		/^(potion cure light wounds 1d8\+1|potion barkskin|potion fly|potion blur|potion reduce person)/,
	];
	// Don't use mundane check — just fall through to the patterns below.

	// ---- Potions (faint, school varies) ----
	if (d.startsWith('potion')) {
		if (/cure|heal|restoration/.test(d)) return aura(1, 'conjuration');
		if (/barkskin|bull.s strength|bear.s endurance|enlarge|reduce|fly|haste|expeditious|cat.s grace|fox.s cunning|owl.s wisdom/.test(d)) return aura(3, 'transmutation');
		if (/blur|invisibility|mirror image/.test(d)) return aura(3, 'illusion');
		if (/mage armor|shield|protection/.test(d)) return aura(1, 'abjuration');
		if (/endure elements|resist energy/.test(d)) return aura(1, 'abjuration');
		if (/glibness/.test(d)) return aura(5, 'transmutation');
		if (/spider climb/.test(d)) return aura(3, 'transmutation');
		if (/water breathing/.test(d)) return aura(5, 'transmutation');
		if (/remove fear|remove paralysis|remove curse/.test(d)) return aura(3, 'abjuration');
		if (/lesser restoration/.test(d)) return aura(3, 'conjuration');
		if (/cure moderate/.test(d)) return aura(3, 'conjuration');
		if (/shield of faith/.test(d)) return aura(1, 'abjuration');
		if (/righteous wrath/.test(d)) return aura(9, 'evocation');
		return aura(3, 'conjuration'); // default potion
	}

	// ---- Wands ----
	if (d.startsWith('wand')) {
		if (/cure light|cure moderate/.test(d)) return aura(1, 'conjuration');
		if (/magic missile/.test(d)) {
			const clMatch = d.match(/(\d+)(st|nd|rd|th)?\s+level/);
			const cl = clMatch ? parseInt(clMatch[1]) : 5;
			return aura(cl, 'evocation');
		}
		if (/lightning bolt/.test(d)) {
			const clMatch = d.match(/(\d+)(st|nd|rd|th)?\s+level/);
			const cl = clMatch ? parseInt(clMatch[1]) : 9;
			return aura(cl, 'evocation');
		}
		if (/bull.s strength/.test(d)) return aura(3, 'transmutation');
		if (/invisibility/.test(d)) return aura(3, 'illusion');
		if (/floating disk|tenser.s floating/.test(d)) return aura(1, 'evocation');
		if (/resist energy/.test(d)) return aura(3, 'abjuration');
		if (/non.?detection/.test(d)) return aura(3, 'abjuration');
		return aura(3, 'evocation'); // default wand
	}

	// ---- Scroll Case (mundane container) ----
	if (/^scroll case/.test(d)) return null;

	// ---- Scrolls ----
	if (d.startsWith('scroll')) {
		// Abjuration scrolls
		if (/endure elements|resist energy|protection from|shield of faith|remove curse|dispel magic/.test(d)) return aura(1, 'abjuration');
		// Conjuration scrolls
		if (/cure|heal|lesser restoration|summon|planar binding|plane shift|delay poison|mage armor/.test(d)) {
			if (/plane shift/.test(d)) return aura(13, 'conjuration');
			if (/lesser planar binding/.test(d)) return aura(9, 'conjuration');
			if (/delay poison/.test(d)) return aura(3, 'conjuration');
			if (/mage armor/.test(d)) return aura(1, 'conjuration');
			return aura(3, 'conjuration');
		}
		// Divination scrolls
		if (/see invisible|detect|identify|augury|divination/.test(d)) return aura(3, 'divination');
		// Enchantment scrolls
		if (/bane|charm|hold|command|confusion|dominate|suggestion|sleep/.test(d)) return aura(1, 'enchantment');
		// Evocation scrolls
		if (/magic missile|fireball|lightning bolt|flame|burning hands|burning|shocking grasp/.test(d)) return aura(1, 'evocation');
		// Illusion scrolls
		if (/invisibility|mirror image|blur|silent image|major image|non.?detection/.test(d)) return aura(3, 'illusion');
		// Necromancy scrolls
		if (/animate dead|cause fear|chill touch|death|slay living|undead/.test(d)) return aura(3, 'necromancy');
		// Transmutation scrolls
		if (/enlarge|reduce|haste|slow|bull.s|bear.s|cat.s|fox.s|owl.s|knock|magic weapon|entangle|expeditious/.test(d)) return aura(1, 'transmutation');
		if (/entangle/.test(d)) return aura(1, 'transmutation');
		if (/knock/.test(d)) return aura(3, 'transmutation');
		if (/magic weapon/.test(d)) return aura(1, 'transmutation');
		return aura(3, 'divination'); // default scroll fallback
	}

	// ---- Rings ----
	if (d.startsWith('ring of protection')) {
		return aura(5, 'abjuration'); // SRD: faint abjuration CL 5
	}
	if (d.startsWith('ring of mind shielding')) {
		return aura(3, 'abjuration');
	}
	if (/ring of (use magic device|umd)/.test(d)) {
		return aura(3, 'transmutation');
	}
	if (/ring of misdirection/.test(d)) {
		return aura(3, 'illusion');
	}
	if (/ring of wishes/.test(d) || /ring.*wishes/.test(d)) {
		return aura(20, 'universal');
	}
	if (d.startsWith('+') && d.includes('ring of protection')) {
		return aura(5, 'abjuration');
	}
	if (/\+2 ring of protection/.test(d)) return aura(5, 'abjuration');
	if (/\+1 ring of protection/.test(d)) return aura(5, 'abjuration');

	// ---- Ability score items ----
	// Belt/Gloves/Cloak of Str/Dex/Cha etc.
	if (/belt of (giant.s )?strength/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}
	if (/gloves of dexterity/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}
	if (/cloak of charisma/.test(d) || /(charisma cloak|\+\d cloak)/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}
	if (/headband of intellect/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}
	if (/periapt of wisdom/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}
	if (/amulet of health/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}

	// ---- Cloaks of Resistance ----
	if (/cloak of resistance/.test(d) || /vest of resistance/.test(d)) {
		return aura(5, 'abjuration'); // SRD: faint abjuration CL 5 for all values
	}

	// ---- Armor enhancements ----
	if (/bracers of armor/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'abjuration');
	}
	if (/amulet of natural armor/.test(d)) {
		const bonus = extractEnhancementBonus(d) || 1;
		// CL 5 for +1 (faint), CL 9 for +2/+3 (moderate), etc.
		const cl = bonus <= 1 ? 5 : bonus <= 3 ? 9 : 12;
		return aura(cl, 'transmutation');
	}

	// ---- Named magic items (hardcoded) ----

	// Bags
	if (/heward.s handy haversack/.test(d)) return aura(9, 'conjuration');
	if (/bag of holding/.test(d)) return aura(9, 'conjuration');
	if (/bag of tricks/.test(d)) return aura(3, 'conjuration');

	// Robes
	if (/robe of the archmagi/.test(d)) return aura(14, 'abjuration');
	if (/monk.s robe/.test(d)) return aura(10, 'transmutation');

	// Belts
	if (/belt of battle/.test(d)) return aura(11, 'transmutation');

	// Boots / movement
	if (/winged boots/.test(d)) return aura(5, 'transmutation');
	if (/dimension stride boots/.test(d)) return aura(7, 'transmutation');
	if (/boots of speed/.test(d)) return aura(10, 'transmutation');

	// Eyes / Third Eye
	if (/third eye (clarity|improvisation)/.test(d)) return aura(3, 'divination');
	if (/third eye/.test(d)) return aura(3, 'divination');

	// Healing items
	if (/healing belt/.test(d)) return aura(1, 'conjuration');
	if (/armband of maximized healing/.test(d)) return aura(11, 'conjuration');
	if (/blessed bandage/.test(d)) return aura(1, 'conjuration');

	// Everburning torch/candle
	if (/everburning (torch|candle)/.test(d)) return aura(1, 'transmutation');

	// Immovable rod
	if (/immovable rod/.test(d)) return aura(3, 'transmutation');

	// Rogue's Vest
	if (/rogue.s vest/.test(d)) return aura(9, 'transmutation');

	// Celestial Armor
	if (/celestial armor/.test(d)) return aura(5, 'abjuration');

	// Mithril Plate of Speed
	if (/mithril plate of speed/.test(d)) return aura(10, 'transmutation');

	// Frost Brand
	if (/frost brand/.test(d)) return aura(14, 'evocation');

	// Lion Shield
	if (/lion shield/.test(d)) return aura(10, 'conjuration');

	// Resurrection Gem
	if (/resurrection gem/.test(d)) return aura(13, 'conjuration');

	// Sphere of Awakening
	if (/sphere of awakening/.test(d)) return aura(9, 'transmutation');

	// Pearl of Speech
	if (/pearl of speech/.test(d)) return aura(5, 'divination');

	// Vanisher Cloak
	if (/vanisher cloak/.test(d)) return aura(3, 'illusion');

	// Filcher's Friend
	if (/filcher.s friend/.test(d)) return aura(3, 'transmutation');

	// Feather token
	if (/feather token/.test(d)) return aura(12, 'conjuration');

	// Metamagic rods
	if (/metamagic rod/.test(d)) return aura(17, 'transmutation');

	// Staff of Fire & Ice
	if (/staff of fire/.test(d)) return aura(13, 'evocation');

	// Deathstrike Bracers
	if (/deathstrike bracers/.test(d)) return aura(9, 'necromancy');

	// Chrono Charm / Horizon Walker
	if (/chrono charm/.test(d)) return aura(7, 'transmutation');

	// Belt of Battle
	if (/belt of battle/.test(d)) return aura(11, 'transmutation');

	// Dimension Stride Boots
	if (/dimension stride/.test(d)) return aura(7, 'conjuration');

	// Mirror / time-hop
	if (/mirror of time/.test(d) || /time.hop/.test(d)) return aura(9, 'transmutation');

	// Orb of environmental adaptation
	if (/orb of environmental/.test(d)) return aura(5, 'abjuration');

	// Armband of Maximized Healing
	if (/armband.*healing/.test(d)) return aura(11, 'conjuration');

	// Ring of Use Magic Device
	if (/ring.*use magic device/.test(d)) return aura(3, 'transmutation');

	// Battle Bridle
	if (/battle bridle/.test(d)) return aura(7, 'transmutation');

	// Amazing chest / magic chest
	if (/amazing chest/.test(d) || /magic chest/.test(d)) return aura(17, 'conjuration');

	// Wand of Floating Disk
	if (/wand.*floating disk/.test(d)) return aura(1, 'evocation');

	// Tanglefoot bag
	if (/tanglefoot bag/.test(d)) return null; // alchemical, not magic

	// Weapons with enhancement bonus or special abilities
	const weaponEnhancementMatch = d.match(/^[+](\d)\s+(.*?)(greatsword|sword|dagger|mace|flail|sickle|rapier|longbow|shortbow|sling|staff|spear)/);
	if (weaponEnhancementMatch) {
		const bonus = parseInt(weaponEnhancementMatch[1]);
		if (/holy/.test(d)) return aura(7, 'evocation');
		if (/frost brand/.test(d)) return aura(14, 'evocation');
		if (/flaming|shocking|frost|acid|sonic/.test(d)) return aura(7, 'evocation');
		if (/bane/.test(d)) return aura(8, 'transmutation');
		if (/ghost touch/.test(d)) return aura(7, 'conjuration');
		if (/vicious/.test(d)) return aura(9, 'necromancy');
		const cl = Math.max(3, bonus * 2 + 1);
		return aura(cl, 'transmutation');
	}

	// Weapon crystals
	if (/weapon crystal.*acid/.test(d)) return aura(7, 'conjuration');
	if (/weapon crystal.*shock/.test(d)) return aura(7, 'evocation');
	if (/weapon crystal.*fire/.test(d)) return aura(7, 'evocation');
	if (/weapon crystal/.test(d)) return aura(7, 'evocation');

	// Sling +1 Holy
	if (/sling.*holy/.test(d)) return aura(7, 'evocation');

	// Armor with special properties
	if (/blurring.*plate|plate.*blur/.test(d)) return aura(10, 'illusion');
	if (/\+\d.*full plate/.test(d)) return aura(7, 'transmutation');

	// Horned Helm
	if (/horned helm/.test(d)) return aura(9, 'transmutation');

	// Deathward / Mindarmor / Stamina chain
	if (/deathward|mindarmor|stamina|agility|mithralmist/.test(d)) return aura(14, 'abjuration');

	// Bow of the Wintermoon
	if (/bow of the wintermoon/.test(d)) return aura(7, 'transmutation');

	// Everburning items
	if (/everburning/.test(d)) return aura(1, 'transmutation');

	// Healing cloak / cloak with charges
	if (/cloak.*charge/.test(d)) return aura(5, 'transmutation');

	// Pearl (identification)
	if (/^pearl/.test(d) && /identify|for identify/.test(d)) return aura(1, 'divination');

	// Ghost Oil
	if (/ghost oil/.test(d)) return aura(7, 'transmutation');

	// Oil Bless Weapon
	if (/oil bless weapon/.test(d)) return aura(1, 'evocation');

	// Incense of Obsession
	if (/incense of obsession/.test(d)) return aura(6, 'enchantment');

	// Rapier +1 Ghost Touch
	if (/rapier.*ghost touch/.test(d)) return aura(9, 'conjuration');

	// Rapier MW
	if (/rapier mw/.test(d)) return null;

	// MW Mighty composite longbow
	if (/mw mighty.*longbow/.test(d)) return null;

	// +1 Arrow
	if (/\+1 arrow/.test(d)) return aura(3, 'transmutation');

	// Composite longbow/shortbow +1
	if (/\+1 composite (short|long)bow/.test(d)) return aura(3, 'transmutation');

	// Universal Solvent
	if (/universal solvent/.test(d)) return null;

	// Life Saver (likely a potion/item for hp)
	if (/life saver/.test(d)) return aura(1, 'conjuration');

	// Silver Sheen
	if (/silver sheen/.test(d)) return null; // alchemical

	// Climbing Kit
	if (/climbing kit/.test(d)) return null;

	// Dimension Stride Boots
	if (/dimension stride boots/.test(d)) return aura(7, 'conjuration');

	// Alchemist Arrow
	if (/alchemist arrow/.test(d)) return null;

	// Spellbook (in bag-of-holding, likely mundane written in)
	if (/spellbook/.test(d)) return null;

	// Vigor (likely Vigour spell)
	if (/^vigor/.test(d)) return aura(1, 'conjuration');

	// Ornate Iron Key
	if (/ornate iron key/.test(d)) return null;

	// Gloves of Dex (abbreviated form)
	if (/gloves of dex/.test(d)) {
		const bonus = extractEnhancementBonus(d);
		return abilityItemAura(bonus, 'transmutation');
	}

	// Generic weapon with enhancement bonus + special property
	if (/^(bastard sword|greatsword|longsword|shortsword|rapier|dagger|mace|flail|sickle|club|spear|glaive|handaxe|battleaxe|greataxe|halberd|guisarme|scythe|kukri).*\+\d/.test(d) ||
		/^\+\d.*(bastard sword|greatsword|longsword|shortsword|rapier|dagger|mace|flail|sickle|spear|glaive|handaxe|battleaxe|halberd|guisarme|scythe|kukri)/.test(d)) {
		if (/holy/.test(d)) return aura(7, 'evocation');
		if (/ghost touch/.test(d)) return aura(9, 'conjuration');
		if (/bane/.test(d)) return aura(8, 'transmutation');
		if (/flaming|shocking|frost|acid|sonic/.test(d)) return aura(7, 'evocation');
		if (/vicious/.test(d)) return aura(9, 'necromancy');
		const bonus = extractEnhancementBonus(d);
		const cl = Math.max(3, bonus * 2 + 1);
		return aura(cl, 'transmutation');
	}

	// Composite bow with enhancement
	if (/composite.*bow.*\+\d|\+\d.*composite.*bow/.test(d)) {
		return aura(3, 'transmutation');
	}

	// No match
	return null;
}

function extractEnhancementBonus(description) {
	const match = description.match(/[+](\d)/);
	return match ? parseInt(match[1]) : 0;
}

/**
 * Ability score items: +2 = CL 4 (faint), +4 = CL 8 (moderate), +6 = CL 12 (strong)
 */
function abilityItemAura(bonus, school) {
	const cl = bonus <= 2 ? 4 : bonus <= 4 ? 8 : 12;
	return aura(cl, school);
}

async function populateAuras() {
	const raw = await readFile(METADATA_PATH, 'utf-8');
	const metadata = yaml.load(raw);

	// Fix known bad descriptions from YAML parsing issues
	const descriptionFixes = {
		'71': 'USED: Diamond dust for Glyph of Warding (200gp/casting)',
		'72': 'USED: Powdered silver for Wall of Good (25gp/casting)',
	};
	for (const [id, desc] of Object.entries(descriptionFixes)) {
		if (metadata.items[id]) {
			metadata.items[id].description = desc;
			console.log(`  Fixed description for [${id}]: ${desc}`);
		}
	}

	let updated = 0;
	let skipped = 0;
	let already = 0;

	for (const [id, item] of Object.entries(metadata.items)) {
		if (!item || !item.description) continue;

		// Skip items that already have non-default aura data,
		// EXCEPT scrolls that got the generic divination fallback — re-process those.
		const isGenericScroll =
			item.description.toLowerCase().startsWith('scroll') &&
			item.auraType === 'divination' &&
			item.auraStrength === 'faint';

		if (item.auraStrength !== 'none' || item.auraType !== 'universal') {
			if (!isGenericScroll) {
				already++;
				continue;
			}
		}

		const result = inferAura(item.description, item.marketValue);
		if (result) {
			item.auraStrength = result.auraStrength;
			item.auraType = result.auraType;
			updated++;
			console.log(`  [${id}] ${item.description}: ${result.auraStrength} ${result.auraType}`);
		} else {
			skipped++;
		}
	}

	// Write updated metadata
	const newYaml = yaml.dump(
		{ nextId: metadata.nextId, items: metadata.items, itemMapping: metadata.itemMapping },
		{ lineWidth: -1 }
	);
	await writeFile(METADATA_PATH, newYaml, 'utf-8');

	console.log(`\n✓ Updated ${updated} items`);
	console.log(`  Already set: ${already}`);
	console.log(`  Left as none/universal (mundane or unknown): ${skipped}`);
}

populateAuras().catch(console.error);
