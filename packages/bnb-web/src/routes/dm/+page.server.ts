import { loadAllCharacters } from '$lib/server/characters';

export async function load() {
	const characters = await loadAllCharacters();
	return { characters };
}
