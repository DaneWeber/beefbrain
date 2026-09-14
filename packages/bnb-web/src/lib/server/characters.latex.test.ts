import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
	characterSheetBaseName,
	generateCharacterLatex,
	generateCharacterPdf,
	getLatexTemplateOptions
} from './characters';

/** The PDF path needs a real pdflatex; CI runners without TeX skip those cases. */
const hasPdflatex = (() => {
	const probe = spawnSync('pdflatex', ['--version'], { stdio: 'ignore' });
	return !probe.error && probe.status === 0;
})();

const SOURCE_YAML = join(
	fileURLToPath(new URL('.', import.meta.url)),
	'../../../../../data/parties/beefy-boys/andy-black-stag.bnb.yaml'
);

const PARTY = 'test-party';
const SLUG = 'andy-black-stag';

describe('character latex generation', () => {
	let partiesRoot = '';
	let previousPartiesDir: string | undefined;

	beforeAll(async () => {
		partiesRoot = await mkdtemp(join(tmpdir(), 'bnb-web-latex-'));
		await mkdir(join(partiesRoot, PARTY), { recursive: true });
		await copyFile(SOURCE_YAML, join(partiesRoot, PARTY, `${SLUG}.yaml`));

		previousPartiesDir = process.env.BNB_PARTIES_DIR;
		process.env.BNB_PARTIES_DIR = partiesRoot;
	});

	afterAll(async () => {
		if (previousPartiesDir === undefined) {
			delete process.env.BNB_PARTIES_DIR;
		} else {
			process.env.BNB_PARTIES_DIR = previousPartiesDir;
		}
		await rm(partiesRoot, { recursive: true, force: true });
	});

	it('returns registered template options', () => {
		const templates = getLatexTemplateOptions();
		expect(templates.length).toBeGreaterThanOrEqual(3);
		expect(templates.map((template) => template.key)).toContain('dnd35-streamlined');
	});

	it('renders latex for a known character and template', async () => {
		const generated = await generateCharacterLatex(PARTY, SLUG, 'dnd35-streamlined');
		expect(generated.templateKey).toBe('dnd35-streamlined');
		expect(generated.latex).toContain('D\\&D 3.5 Primary Sheet (Streamlined Draft)');
		expect(generated.latex).toContain('Black Stag');
	});

	it('rejects unknown template keys', async () => {
		await expect(generateCharacterLatex(PARTY, SLUG, 'not-a-template')).rejects.toThrow(
			/Unknown LaTeX template/
		);
	});

	it('builds a download base name from the slug and template', () => {
		expect(characterSheetBaseName('andy black/stag', 'dnd35-streamlined')).toBe(
			'andy-black-stag-dnd35-streamlined'
		);
	});

	it('rejects unknown template keys for PDFs too', async () => {
		await expect(generateCharacterPdf(PARTY, SLUG, 'not-a-template')).rejects.toThrow(
			/Unknown LaTeX template/
		);
	});

	it.runIf(hasPdflatex)('compiles a PDF for a known character', { timeout: 30_000 }, async () => {
		const generated = await generateCharacterPdf(PARTY, SLUG, 'dnd35-streamlined');
		expect(generated.templateKey).toBe('dnd35-streamlined');
		expect(generated.fileName).toBe('andy-black-stag-dnd35-streamlined.pdf');
		expect(generated.pdf.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
	});
});
