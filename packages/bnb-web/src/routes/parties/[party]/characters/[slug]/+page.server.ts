import { error } from '@sveltejs/kit';
import {
	loadCharacter,
	getSkillPointWarning,
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
