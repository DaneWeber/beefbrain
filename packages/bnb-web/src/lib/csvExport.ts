/**
 * CSV export utilities for inventory data
 */

import type { InventoryItem } from './inventory';

/**
 * Convert inventory items to CSV format
 */
export function inventoryToCSV(items: InventoryItem[]): string {
	const headers = [
		'ID',
		'PC',
		'Location',
		'Category',
		'Description',
		'True Description',
		'Aura Strength',
		'Aura Type',
		'Origin',
		'Quantity',
		'Weight (lbs)',
		'Market Value (gp)',
		'Total Value (gp)',
		'Tags',
		'Notes'
	];

	// Escape CSV values
	const escapeCSV = (value: unknown): string => {
		const str = String(value ?? '');
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	};

	// Build rows
	const rows = items.map((item) => [
		escapeCSV(item.id),
		escapeCSV(item.pcName),
		escapeCSV(item.location),
		escapeCSV(item.category),
		escapeCSV(item.description),
		escapeCSV(item.trueDescription),
		escapeCSV(item.auraStrength),
		escapeCSV(item.auraType),
		escapeCSV(item.origin),
		item.quantity,
		item.weight,
		item.marketValue,
		item.marketValue * item.quantity,
		escapeCSV(item.tags.join('; ')),
		escapeCSV(item.notes)
	]);

	// Combine headers and rows
	const csvContent = [
		headers.map(escapeCSV).join(','),
		...rows.map((row) => row.join(','))
	].join('\n');

	return csvContent;
}

/**
 * Download CSV as a file
 */
export function downloadInventoryCSV(items: InventoryItem[], filename = 'inventory.csv'): void {
	if (typeof window === 'undefined') return; // Only works in browser

	const csv = inventoryToCSV(items);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);

	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Clean up
	URL.revokeObjectURL(url);
}
