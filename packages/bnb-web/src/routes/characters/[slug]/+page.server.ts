import { error } from '@sveltejs/kit';
import { loadCharacter } from '$lib/server/characters';

export async function load({ params }) {
	const data = await loadCharacter(params.slug);
	if (!data) {
		error(404, 'Character not found');
	}
	return { character: data.character, slug: params.slug };
}
