import { error, fail } from '@sveltejs/kit';
import { DEFAULT_TEMPLATE_KEY } from 'bnb-latex';
import {
	loadCharacter,
	getSkillPointWarning,
	saveCharacterMagicItem,
	moveCharacterMagicItem,
	getInventoryLocations,
	getLatexTemplateOptions
} from '$lib/server/characters';

export async function load({ params }) {
	const data = await loadCharacter(params.party, params.slug);
	if (!data) {
		error(404, 'Character not found');
	}
	const locations = await getInventoryLocations(params.party, params.slug);
	return {
		character: data.character,
		skillPointWarning: getSkillPointWarning(data),
		slug: params.slug,
		inventoryLocations: locations,
		latexTemplates: getLatexTemplateOptions(),
		defaultLatexTemplate: DEFAULT_TEMPLATE_KEY
	};
}

export const actions = {
	updateMagicItem: async ({ request, params }) => {
		const form = await request.formData();
		const location = form.get('location') as string;
		const itemOrderIndex = Number(form.get('itemOrderIndex'));
		const newName = (form.get('name') as string | null) ?? '';
		const effectsRaw = (form.get('effects') as string | null) ?? '';

		if (!location || !Number.isFinite(itemOrderIndex)) {
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
				params.party,
				params.slug,
				location,
				itemOrderIndex,
				newName.trim(),
				effects
			);
		} catch (err) {
			return fail(500, { error: String(err) });
		}

		const data = await loadCharacter(params.party, params.slug);
		return {
			success: true,
			character: data?.character,
			skillPointWarning: getSkillPointWarning(data)
		};
	},

	moveItem: async ({ request, params }) => {
		const form = await request.formData();
		const fromLocation = form.get('fromLocation') as string;
		const toLocation = form.get('toLocation') as string;
		const itemOrderIndex = Number(form.get('itemOrderIndex'));

		if (!fromLocation || !toLocation || !Number.isFinite(itemOrderIndex)) {
			return fail(400, { error: 'Invalid form data' });
		}

		try {
			await moveCharacterMagicItem(
				params.party,
				params.slug,
				fromLocation,
				toLocation,
				itemOrderIndex
			);
		} catch (err) {
			return fail(500, { error: String(err) });
		}

		const data = await loadCharacter(params.party, params.slug);
		const locations = await getInventoryLocations(params.party, params.slug);
		return {
			success: true,
			character: data?.character,
			inventoryLocations: locations,
			skillPointWarning: getSkillPointWarning(data)
		};
	}
};
