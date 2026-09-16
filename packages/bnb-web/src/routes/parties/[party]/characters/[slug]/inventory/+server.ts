import { json } from '@sveltejs/kit';
import {
	moveCharacterMagicItem,
	saveCharacterMagicItem
} from '$lib/server/characters';

export async function POST({ request, params }) {
	const form = await request.formData();
	const action = form.get('action');
	const itemOrderIndex = Number(form.get('itemOrderIndex'));

	if (!Number.isFinite(itemOrderIndex)) {
		return json({ error: 'Invalid item order index' }, { status: 400 });
	}

	try {
		if (action === 'updateMagicItem') {
			const location = String(form.get('location') ?? '');
			const name = String(form.get('name') ?? '');
			const effectsRaw = String(form.get('effects') ?? '');
			if (!location) {
				return json({ error: 'Inventory location is required' }, { status: 400 });
			}

			const effects: Record<string, string> = {};
			for (const line of effectsRaw.split('\n')) {
				const colonIndex = line.indexOf(':');
				if (colonIndex === -1) continue;
				const key = line.slice(0, colonIndex).trim();
				const value = line.slice(colonIndex + 1).trim();
				if (key) effects[key] = value;
			}

			await saveCharacterMagicItem(
				params.party,
				params.slug,
				location,
				itemOrderIndex,
				name.trim(),
				effects
			);
			return json({ success: true });
		}

		if (action === 'moveItem') {
			const fromLocation = String(form.get('fromLocation') ?? '');
			const toLocation = String(form.get('toLocation') ?? '');
			if (!fromLocation || !toLocation) {
				return json({ error: 'Source and destination locations are required' }, { status: 400 });
			}

			await moveCharacterMagicItem(
				params.party,
				params.slug,
				fromLocation,
				toLocation,
				itemOrderIndex
			);
			return json({ success: true });
		}

		return json({ error: 'Unknown inventory action' }, { status: 400 });
	} catch (error) {
		console.error(`Inventory update failed for ${params.party}/${params.slug}:`, error);
		return json({ error: 'Failed to update inventory' }, { status: 500 });
	}
}
