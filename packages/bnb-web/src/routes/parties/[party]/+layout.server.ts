import { error } from '@sveltejs/kit';
import { getParty } from '$lib/server/characters';

export async function load({ params }) {
	const party = await getParty(params.party);
	if (!party) {
		error(404, `Unknown party "${params.party}"`);
	}
	return { party };
}
