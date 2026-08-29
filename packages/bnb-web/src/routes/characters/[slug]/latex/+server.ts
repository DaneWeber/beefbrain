import { error } from '@sveltejs/kit';
import { generateCharacterLatex } from '$lib/server/characters';

function toSafeFilePart(value: string): string {
	return value.replace(/[^A-Za-z0-9._-]/g, '-');
}

export async function GET({ params, url }) {
	const templateKey = url.searchParams.get('template') ?? 'dnd35-streamlined';

	try {
		const rendered = await generateCharacterLatex(params.slug, templateKey);
		const safeSlug = toSafeFilePart(params.slug);
		const fileName = `${safeSlug}-${rendered.templateKey}.tex`;

		return new Response(rendered.latex, {
			headers: {
				'content-type': 'application/x-tex; charset=utf-8',
				'content-disposition': `attachment; filename="${fileName}"`,
				'cache-control': 'no-store'
			}
		});
	} catch (err) {
		if (err instanceof Error && err.message.startsWith('Unknown LaTeX template')) {
			error(400, err.message);
		}

		error(500, 'Failed to generate LaTeX for this character');
	}
}
