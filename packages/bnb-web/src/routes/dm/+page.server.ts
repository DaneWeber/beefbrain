import { loadAllCharacters } from '$lib/server/characters';
import { loadDMMetadata } from '$lib/server/dmMetadata';

export async function load() {
	const characters = await loadAllCharacters();
	const dmMetadata = await loadDMMetadata();
	return { characters, dmMetadata };
}
