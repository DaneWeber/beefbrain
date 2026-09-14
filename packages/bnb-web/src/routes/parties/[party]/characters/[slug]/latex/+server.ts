import { error } from '@sveltejs/kit';
import { DEFAULT_TEMPLATE_KEY } from 'bnb-latex';
import { characterSheetBaseName, generateCharacterLatex } from '$lib/server/characters';

export async function GET({ params, url }) {
	const templateKey = url.searchParams.get('template') ?? DEFAULT_TEMPLATE_KEY;

	try {
		const rendered = await generateCharacterLatex(params.party, params.slug, templateKey);
		const fileName = `${characterSheetBaseName(params.slug, rendered.templateKey)}.tex`;

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
