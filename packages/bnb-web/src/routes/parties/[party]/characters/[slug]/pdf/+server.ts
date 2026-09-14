import { error } from '@sveltejs/kit';
import { LatexGenerationError } from 'bnb-latex';
import { generateCharacterPdf } from '$lib/server/characters';

/** How the compiler failed, in terms a browser and a user can both act on. */
const COMPILE_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
	PDF_COMPILER_MISSING: {
		status: 503,
		message:
			'No LaTeX compiler on the server. Install pdflatex (e.g. "sudo apt install texlive-latex-base ' +
			'texlive-latex-recommended texlive-fonts-recommended") and try again, or download the LaTeX instead.'
	},
	PDF_TIMEOUT: {
		status: 504,
		message: 'LaTeX compilation timed out. Download the LaTeX and compile it locally.'
	},
	PDF_COMPILE_FAILED: {
		status: 500,
		message: 'pdflatex could not compile this character sheet. See the server log for its output.'
	},
	INPUT_TOO_LARGE: {
		status: 413,
		message: 'This character sheet is too large to compile.'
	}
};

export async function GET({ params, url }) {
	const templateKey = url.searchParams.get('template') ?? 'dnd35-streamlined';

	try {
		const { pdf, fileName } = await generateCharacterPdf(params.party, params.slug, templateKey);

		// Copied into a plain Uint8Array: a Node Buffer is backed by ArrayBufferLike,
		// which no longer satisfies BodyInit's ArrayBufferView<ArrayBuffer>.
		const body = new Uint8Array(pdf.byteLength);
		body.set(pdf);

		return new Response(body, {
			headers: {
				'content-type': 'application/pdf',
				'content-length': String(body.byteLength),
				'content-disposition': `attachment; filename="${fileName}"`,
				'cache-control': 'no-store'
			}
		});
	} catch (err) {
		if (err instanceof Error && err.message.startsWith('Unknown LaTeX template')) {
			error(400, err.message);
		}

		if (err instanceof LatexGenerationError) {
			// The compiler log is long and can name server paths, so it stays in the log.
			console.error(`PDF generation failed for ${params.party}/${params.slug}:`, err.message);
			const mapped = COMPILE_ERROR_RESPONSES[err.code];
			if (mapped) {
				error(mapped.status, mapped.message);
			}
		}

		error(500, 'Failed to generate a PDF for this character');
	}
}
