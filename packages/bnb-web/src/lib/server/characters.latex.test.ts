import { describe, expect, it } from 'vitest';
import { generateCharacterLatex, getLatexTemplateOptions } from './characters';

describe('character latex generation', () => {
	it('returns registered template options', () => {
		const templates = getLatexTemplateOptions();
		expect(templates.length).toBeGreaterThanOrEqual(3);
		expect(templates.map((template) => template.key)).toContain('dnd35-streamlined');
	});

	it('renders latex for a known character and template', async () => {
		const generated = await generateCharacterLatex('andy-black-stag', 'dnd35-streamlined');
		expect(generated.templateKey).toBe('dnd35-streamlined');
		expect(generated.latex).toContain('D\\&D 3.5 Primary Sheet (Streamlined Draft)');
		expect(generated.latex).toContain('Black Stag');
	});

	it('rejects unknown template keys', async () => {
		await expect(generateCharacterLatex('andy-black-stag', 'not-a-template')).rejects.toThrow(
			/Unknown LaTeX template/
		);
	});
});
