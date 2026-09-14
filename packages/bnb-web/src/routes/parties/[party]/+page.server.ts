import { listCharacters } from '$lib/server/characters';

export async function load({ params }) {
	const characters = await listCharacters(params.party);
	return { characters };
}
