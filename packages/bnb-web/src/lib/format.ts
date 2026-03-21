/** Format a hyphenated key to Title Case */
export function formatKey(key: string): string {
	return key
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

/**
 * Extract the total value and breakdown from a beefbrain "sum pattern" value.
 * Sum pattern: [total, {breakdown}] or [total, key: val, {breakdown}]
 * Returns { total, breakdown } where breakdown is a record of source->value.
 */
export function parseSumValue(val: unknown): { total: string; breakdown: Record<string, unknown> } {
	if (!Array.isArray(val)) {
		return { total: String(val ?? ''), breakdown: {} };
	}
	const total = String(val[0] ?? '');
	const breakdown: Record<string, unknown> = {};
	for (let i = 1; i < val.length; i++) {
		const item = val[i];
		if (item && typeof item === 'object' && !Array.isArray(item)) {
			Object.assign(breakdown, item);
		}
	}
	return { total, breakdown };
}

/** Format a breakdown object as a compact string like "str: 6, ranks: 13, acp: -4" */
export function formatBreakdown(bd: Record<string, unknown>): string {
	return Object.entries(bd)
		.filter(([k]) => !k.startsWith('_'))
		.map(([k, v]) => `${formatKey(k)}: ${v}`)
		.join(', ');
}

/** Format a modifier value with explicit +/- sign */
export function formatMod(val: number | string): string {
	const n = Number(val);
	if (isNaN(n)) return String(val);
	return n >= 0 ? `+${n}` : String(n);
}
