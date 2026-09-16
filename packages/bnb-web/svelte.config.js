import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';

const githubPages = process.env.GITHUB_PAGES === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: githubPages
			? adapterStatic({
					pages: 'build',
					assets: 'build',
					strict: false
				})
			: adapterNode(),
		paths: {
			base: githubPages ? (process.env.BASE_PATH ?? '') : ''
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
