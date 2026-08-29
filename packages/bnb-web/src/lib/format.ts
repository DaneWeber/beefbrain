/** Format a hyphenated key to Title Case, preserving +N modifiers */
export function formatKey(key: string): string {
	return key
		.split('-')
		.map((w) => {
			if (w.startsWith('+') || w.startsWith('−')) return w;
			return w.charAt(0).toUpperCase() + w.slice(1);
		})
		.join(' ')
		.replace(/(\w)(\+)/g, '$1 $2');
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
		.map(([k, v]) => {
			// Handle nested ranks structure: [total, {breakdown}]
			if (k === 'ranks' && Array.isArray(v) && v.length >= 2) {
				const ranksTotal = v[0];
				const ranksBreakdown = v[1];
				
				// If there's a breakdown, show it
				if (ranksBreakdown && typeof ranksBreakdown === 'object' && !Array.isArray(ranksBreakdown)) {
					const breakdownStr = Object.entries(ranksBreakdown)
						.map(([cls, pts]) => `${formatKey(cls)}: ${pts}`)
						.join(', ');
					return `${formatKey(k)}: ${ranksTotal} (${breakdownStr})`;
				}
				
				// Otherwise just show the total
				return `${formatKey(k)}: ${ranksTotal}`;
			}
			
			// Default formatting
			return `${formatKey(k)}: ${v}`;
		})
		.join(', ');
}

/** Format a modifier value with explicit +/- sign */
export function formatMod(val: number | string): string {
	const n = Number(val);
	if (isNaN(n)) return String(val);
	return n >= 0 ? `+${n}` : String(n);
}
