/**
 * DM-only metadata management for inventory items
 * Tracks unique item IDs, descriptions, values, auras, and notes
 *
 * Metadata is scoped per party: item IDs live in each character's YAML and are
 * only unique within a party, so two parties would otherwise read each other's
 * notes for any ID they happen to share.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as yaml from 'js-yaml';
import { partyDir } from './parties';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YAMLData = Record<string, any>;

/** DM metadata sits beside the party's character files, in its own subdirectory. */
export function dmMetadataPath(party: string): string {
	return join(partyDir(party), 'dm', 'item-metadata.yaml');
}

/**
 * Item metadata stored per unique ID
 */
export interface ItemMetadata {
	description: string; // Canonical/true description
	marketValue: number; // In gold pieces
	auraStrength: 'none' | 'faint' | 'moderate' | 'strong' | 'overwhelming';
	auraType: string; // Magic school or 'universal'
	origin: string; // Where/how it was acquired
	dmNotes: string; // DM-only notes
}

/**
 * Complete DM metadata structure
 */
export interface DMMetadata {
	nextId: number;
	items: Record<number, ItemMetadata>;
	itemMapping: Record<string, number>; // "pcName/location/index" -> itemId
}

/** Metadata for a party with nothing recorded yet. */
function emptyMetadata(): DMMetadata {
	return { nextId: 1, items: {}, itemMapping: {} };
}

/**
 * Load one party's DM metadata, or empty metadata when the party has none.
 */
export async function loadDMMetadata(party: string): Promise<DMMetadata> {
	// Resolved outside the try so an invalid party slug raises instead of being
	// reported as "this party has no metadata".
	const filePath = dmMetadataPath(party);
	try {
		const raw = await readFile(filePath, 'utf-8');
		const data = yaml.load(raw) as YAMLData;
		return {
			nextId: data.nextId ?? 1,
			items: data.items ?? {},
			itemMapping: data.itemMapping ?? {}
		};
	} catch {
		// Return empty metadata if the party has no file (or an unreadable one)
		return emptyMetadata();
	}
}

/**
 * Save one party's DM metadata, creating its directory on first write.
 */
export async function saveDMMetadata(party: string, metadata: DMMetadata): Promise<void> {
	const filePath = dmMetadataPath(party);
	const yamlContent = yaml.dump({
		nextId: metadata.nextId,
		items: metadata.items,
		itemMapping: metadata.itemMapping
	});
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, yamlContent, 'utf-8');
}

/**
 * Get or create item ID for a specific item instance
 * @param pcName Character name
 * @param location Inventory location (equipped, pack, horse, etc)
 * @param itemIndex Index of item in location array
 * @param metadata Current metadata (will be updated if needed)
 * @returns { itemId, isNew }
 */
export function getOrCreateItemId(
	pcName: string,
	location: string,
	itemIndex: number,
	metadata: DMMetadata
): { itemId: number; isNew: boolean } {
	const key = `${pcName}/${location}/${itemIndex}`;

	if (key in metadata.itemMapping) {
		return { itemId: metadata.itemMapping[key], isNew: false };
	}

	// Create new ID
	const itemId = metadata.nextId;
	metadata.nextId += 1;
	metadata.itemMapping[key] = itemId;

	// Initialize item metadata with defaults
	if (!(itemId in metadata.items)) {
		metadata.items[itemId] = {
			description: '',
			marketValue: 0,
			auraStrength: 'none',
			auraType: 'universal',
			origin: '',
			dmNotes: ''
		};
	}

	return { itemId, isNew: true };
}

/**
 * Get metadata for an item ID
 */
export function getItemMetadata(itemId: number, metadata: DMMetadata): ItemMetadata | null {
	return metadata.items[itemId] ?? null;
}

/**
 * Update metadata for an item ID
 */
export function updateItemMetadata(
	itemId: number,
	updates: Partial<ItemMetadata>,
	metadata: DMMetadata
): void {
	if (!(itemId in metadata.items)) {
		metadata.items[itemId] = {
			description: '',
			marketValue: 0,
			auraStrength: 'none',
			auraType: 'universal',
			origin: '',
			dmNotes: ''
		};
	}
	metadata.items[itemId] = { ...metadata.items[itemId], ...updates };
}

/**
 * Find item ID by location key
 */
export function findItemIdByLocation(key: string, metadata: DMMetadata): number | null {
	return metadata.itemMapping[key] ?? null;
}

/**
 * Get all item IDs
 */
export function getAllItemIds(metadata: DMMetadata): number[] {
	return Object.values(metadata.itemMapping)
		.filter((id, idx, arr) => arr.indexOf(id) === idx)
		.sort((a, b) => a - b);
}
