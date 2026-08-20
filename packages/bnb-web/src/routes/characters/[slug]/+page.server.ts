import { error, fail } from '@sveltejs/kit';
import { loadCharacter, saveCharacterMagicItem, moveCharacterMagicItem, getInventoryLocations } from '$lib/server/characters';

export async function load({ params }) {
	const data = await loadCharacter(params.slug);
	if (!data) {
		error(404, 'Character not found');
	}
	const locations = await getInventoryLocations(params.slug);
	return { character: data.character, slug: params.slug, inventoryLocations: locations };
}

export const actions = {
	updateMagicItem: async ({ request, params }) => {
		const form = await request.formData();
		const location = form.get('location') as string;
		const itemOrderIndex = Number(form.get('itemOrderIndex'));
		const itemArrayIndex = Number(form.get('itemArrayIndex'));
		const newName = (form.get('name') as string | null) ?? '';
		const effectsRaw = (form.get('effects') as string | null) ?? '';

		if (!location || (!Number.isFinite(itemOrderIndex) && !Number.isFinite(itemArrayIndex))) {
			return fail(400, { error: 'Invalid form data' });
		}

		// Parse effects from "key: value\nkey2: value2" format
		const effects: Record<string, string> = {};
		for (const line of effectsRaw.split('\n')) {
			const colonIdx = line.indexOf(':');
			if (colonIdx === -1) continue;
			const k = line.slice(0, colonIdx).trim();
			const v = line.slice(colonIdx + 1).trim();
			if (k) effects[k] = v;
		}

		try {
			await saveCharacterMagicItem(
				params.slug,
				location,
				Number.isFinite(itemArrayIndex) ? itemArrayIndex : null,
				Number.isFinite(itemOrderIndex) ? itemOrderIndex : null,
				newName.trim(),
				effects
			);
		} catch (err) {
			return fail(500, { error: String(err) });
		}

		const data = await loadCharacter(params.slug);
		return { success: true, character: data?.character };
	},

	moveItem: async ({ request, params }) => {
		const form = await request.formData();
		const fromLocation = form.get('fromLocation') as string;
		const toLocation = form.get('toLocation') as string;
		const itemOrderIndex = Number(form.get('itemOrderIndex'));
		const itemArrayIndex = Number(form.get('itemArrayIndex'));

		if (
			!fromLocation ||
			!toLocation ||
			(!Number.isFinite(itemOrderIndex) && !Number.isFinite(itemArrayIndex))
		) {
			return fail(400, { error: 'Invalid form data' });
		}

		try {
			await moveCharacterMagicItem(
				params.slug,
				fromLocation,
				toLocation,
				Number.isFinite(itemArrayIndex) ? itemArrayIndex : null,
				Number.isFinite(itemOrderIndex) ? itemOrderIndex : null
			);
		} catch (err) {
			return fail(500, { error: String(err) });
		}

		const data = await loadCharacter(params.slug);
		const locations = await getInventoryLocations(params.slug);
		return { success: true, character: data?.character, inventoryLocations: locations };
	}
};
