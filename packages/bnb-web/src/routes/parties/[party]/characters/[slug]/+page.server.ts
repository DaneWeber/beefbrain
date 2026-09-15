import { error, fail } from '@sveltejs/kit';
import type { Actions } from './$types';
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
		readOnly: process.env.BNB_READ_ONLY === 'true'
	};
}

const nodeActions: Actions = {
	updateMagicItem: async ({ request, params }) => {
		const form = await request.formData();
		const location = String(form.get('location') ?? '');
		const itemOrderIndex = Number(form.get('itemOrderIndex'));
		const newName = String(form.get('name') ?? '');
		const effectsRaw = String(form.get('effects') ?? '');

		if (!location || !Number.isFinite(itemOrderIndex)) {
			return fail(400, { error: 'Invalid form data' });
		}

		const effects: Record<string, string> = {};
		for (const line of effectsRaw.split('\n')) {
			const colonIndex = line.indexOf(':');
			if (colonIndex === -1) continue;
			const key = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim();
			if (key) effects[key] = value;
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
		} catch (error) {
			return fail(500, { error: String(error) });
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
		const fromLocation = String(form.get('fromLocation') ?? '');
		const toLocation = String(form.get('toLocation') ?? '');
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
		} catch (error) {
			return fail(500, { error: String(error) });
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

export const actions: Actions | undefined =
	process.env.GITHUB_PAGES === 'true' ? undefined : nodeActions;
