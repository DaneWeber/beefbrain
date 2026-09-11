import { listParties } from '$lib/server/characters';

export async function load() {
	const parties = await listParties();
	return { parties };
}
