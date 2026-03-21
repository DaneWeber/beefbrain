import { listCharacters } from '$lib/server/characters';

export async function load() {
	const characters = await listCharacters();
	return { characters };
}
