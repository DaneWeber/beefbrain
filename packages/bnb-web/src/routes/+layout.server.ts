import { listParties } from '$lib/server/characters';

export const prerender = process.env.GITHUB_PAGES === 'true';
export const trailingSlash = process.env.GITHUB_PAGES === 'true' ? 'always' : 'never';

export async function load() {
	const parties = await listParties();
	return {
		parties,
		readOnly: process.env.BNB_READ_ONLY === 'true'
	};
}
