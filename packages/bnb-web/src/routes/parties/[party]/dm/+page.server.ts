import { loadAllCharacters } from '$lib/server/characters';
import { loadDMMetadata } from '$lib/server/dmMetadata';

export async function load({ params }) {
	const characters = await loadAllCharacters(params.party);
	const dmMetadata = await loadDMMetadata();
	return { characters, dmMetadata };
}
