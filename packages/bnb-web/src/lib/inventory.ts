/**
 * Inventory management utilities for DM tools
 * Handles parsing, enriching, and exporting inventory data from all characters
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CharacterData = Record<string, any>;

/**
 * Represents an inventory item with all relevant fields
 */
export interface InventoryItem {
	id: string; // Unique identifier (e.g., "andy-equipped-001")
	pcName: string; // Character name
	location: string; // equipped, pack, horse, etc.
	category: string; // weapon, armor, gear, supplies, potion, scroll, wand, tool, container, magic, etc.
	description: string; // The display name of the item
	trueDescription: string; // Canonical name/true description (same as description for now, can be enriched)
	auraStrength: string; // none, faint, moderate, strong, overwhelming
	auraType: string; // abjuration, conjuration, divination, etc. - magic school
	origin: string; // Where it came from or special notes
	quantity: number;
	weight: number; // in lbs
	marketValue: number; // in gp
	tags: string[]; // magic, mw, nonlethal, cold-iron, etc.
	notes: string; // Additional metadata as JSON string
}

/**
 * Parse individual item from YAML array format
 * Format: [description, quantity, category, weight, price, metadata?, tags?]
 */
function parseItem(
	itemArray: unknown[],
	characterName: string,
	location: string,
	itemIndex: number
): InventoryItem | null {
	if (!Array.isArray(itemArray) || itemArray.length < 5) return null;

	const [description, quantity, category, weight, price, metadata, tags] = itemArray;

	// Skip non-existent items
	if (!description || !category) return null;

	const id = `${characterName}-${location}-${String(itemIndex).padStart(3, '0')}`;
	const qty = typeof quantity === 'number' ? quantity : 1;
	const wt = parseWeight(weight);
	const val = parsePrice(price);

	// Determine aura info from tags
	const tagList = Array.isArray(tags) ? (tags as string[]) : [];
	const isMagic = tagList.includes('magic');
	const auraStrength = isMagic ? getAuraStrength(val) : 'none';
	const auraType = extractAuraType(String(description), metadata);

	return {
		id,
		pcName: characterName,
		location,
		category: String(category),
		description: String(description),
		trueDescription: String(description), // Can be enriched later with canonical item database
		auraStrength,
		auraType,
		origin: '', // Can be filled in from metadata or external source
		quantity: qty,
		weight: wt,
		marketValue: val,
		tags: tagList,
		notes: metadata && typeof metadata === 'object' ? JSON.stringify(metadata) : ''
	};
}

/**
 * Parse weight string to number (e.g., "1 lb" -> 1, "0.1 lbs" -> 0.1)
 */
function parseWeight(weight: unknown): number {
	if (typeof weight === 'number') return weight;
	if (typeof weight === 'string') {
		const num = parseFloat(weight);
		return isNaN(num) ? 0 : num;
	}
	return 0;
}

/**
 * Parse price string to gold pieces (e.g., "100 gp" -> 100)
 */
function parsePrice(price: unknown): number {
	if (typeof price === 'number') return price;
	if (typeof price === 'string') {
		const num = parseFloat(price);
		return isNaN(num) ? 0 : num;
	}
	return 0;
}

/**
 * Estimate aura strength based on market value
 * D&D 3.5 magic item pricing guidelines
 */
function getAuraStrength(marketValue: number): string {
	if (marketValue === 0) return 'none';
	if (marketValue < 1000) return 'faint';
	if (marketValue < 5000) return 'moderate';
	if (marketValue < 25000) return 'strong';
	return 'overwhelming';
}

/**
 * Extract aura type (magic school) from item description or metadata
 * This is a heuristic that can be improved with a proper item database
 */
function extractAuraType(description: string, metadata: unknown): string {
	const desc = description.toLowerCase();

	// Heuristic mappings based on common item keywords
	const schools: Record<string, string[]> = {
		evocation: ['fire', 'ice', 'frost', 'lightning', 'lightning', 'flame', 'staff of fire'],
		divination: ['see', 'detect', 'knowledge', 'detect'],
		transmutation: ['enhance', 'boost', 'increase', 'mighty', 'composite', 'gloves of dex'],
		abjuration: ['resist', 'resistance', 'cloak', 'protection', 'ring of protection'],
		conjuration: ['bag', 'portable', 'container'],
		enchantment: ['charm', 'compulsion', 'wish', 'ring of'],
		necromancy: ['death', 'curse']
	};

	for (const [school, keywords] of Object.entries(schools)) {
		if (keywords.some((kw) => desc.includes(kw))) {
			return school;
		}
	}

	// If metadata has school info, use it
	if (metadata && typeof metadata === 'object' && 'school' in metadata) {
		return String(metadata.school);
	}

	return 'universal'; // Generic aura type for items that don't match
}

/**
 * Extract all inventory items from all characters
 */
export function extractAllInventoryItems(characters: { slug: string; character: CharacterData }[]): InventoryItem[] {
	const items: InventoryItem[] = [];

	for (const { slug, character } of characters) {
		const charName = character.description?.name ?? slug;
		const inventory = character.inventory;

		if (!inventory || typeof inventory !== 'object') continue;

		// Get list of locations to check
		const locations = Array.isArray(inventory._on)
			? (inventory._on as string[])
			: Object.keys(inventory).filter((k) => !k.startsWith('_') && k !== 'money');

		// Process each location
		for (const location of locations) {
			const locationItems = inventory[location];
			if (!Array.isArray(locationItems)) continue;

			// Parse each item at this location
			for (let i = 0; i < locationItems.length; i++) {
				const item = parseItem(locationItems[i] as unknown[], charName, location, i);
				if (item) {
					items.push(item);
				}
			}
		}

		// Also check for companion inventory
		if (inventory.horse && Array.isArray(inventory.horse)) {
			for (let i = 0; i < inventory.horse.length; i++) {
				const item = parseItem(inventory.horse[i] as unknown[], charName, 'mount', i);
				if (item) {
					items.push(item);
				}
			}
		}
	}

	return items;
}

/**
 * Sort and filter inventory items
 */
export function sortInventoryItems(
	items: InventoryItem[],
	sortBy: 'pc' | 'location' | 'category' | 'value' = 'pc'
): InventoryItem[] {
	const sorted = [...items];

	switch (sortBy) {
		case 'pc':
			sorted.sort((a, b) => a.pcName.localeCompare(b.pcName) || a.location.localeCompare(b.location));
			break;
		case 'location':
			sorted.sort((a, b) => a.location.localeCompare(b.location) || a.pcName.localeCompare(b.pcName));
			break;
		case 'category':
			sorted.sort((a, b) => a.category.localeCompare(b.category) || a.pcName.localeCompare(b.pcName));
			break;
		case 'value':
			sorted.sort(
				(a, b) => b.marketValue * b.quantity - (a.marketValue * a.quantity) || a.pcName.localeCompare(b.pcName)
			);
			break;
	}

	return sorted;
}

/**
 * Get summary statistics
 */
export function getInventorySummary(items: InventoryItem[]) {
	const totalValue = items.reduce((sum, item) => sum + item.marketValue * item.quantity, 0);
	const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
	const magicItemCount = items.filter((item) => item.tags.includes('magic')).length;
	const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

	return {
		totalItems,
		totalValue,
		totalWeight,
		magicItemCount,
		byCategory: groupBy(items, (item) => item.category),
		byPC: groupBy(items, (item) => item.pcName)
	};
}

/**
 * Group items by a key function
 */
function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
	const groups: Record<string, T[]> = {};
	for (const item of items) {
		const key = keyFn(item);
		if (!groups[key]) groups[key] = [];
		groups[key].push(item);
	}
	return groups;
}
