import { describe, expect, it } from 'vitest';
import { NOT_APPLICABLE, formatBreakdown, formatMod, parseSumValue } from './format';

/**
 * `.nan` in the YAML marks a roll the character cannot attempt at all — a
 * trained-only skill with no ranks. js-yaml parses it to the number NaN, which
 * must not reach the page as "NaN" or be flattened to a +0 the character does
 * not actually have.
 */
describe('.nan renders as an em-dash', () => {
	it('uses an em-dash for a NaN modifier', () => {
		expect(formatMod(NaN)).toBe(NOT_APPLICABLE);
	});

	it('uses an em-dash for the "NaN" string a NaN total stringifies to', () => {
		// parseSumValue stringifies the total, so callers can hand formatMod
		// either the number or the string.
		expect(parseSumValue([NaN, { 'no-training': NaN }]).total).toBe('NaN');
		expect(formatMod('NaN')).toBe(NOT_APPLICABLE);
	});

	it('uses an em-dash for a NaN breakdown component', () => {
		expect(formatBreakdown({ cha: -2, 'no-training': NaN })).toBe(
			`Cha: -2, No Training: ${NOT_APPLICABLE}`
		);
	});

	it('leaves a real zero bonus as +0, not an em-dash', () => {
		expect(formatMod(0)).toBe('+0');
		expect(formatBreakdown({ str: 0 })).toBe('Str: 0');
	});

	it('still passes non-numeric text through unchanged', () => {
		// Damage dice and similar strings are not numbers, but they are also not
		// missing rolls, so they must not be replaced by an em-dash.
		expect(formatMod('1d6')).toBe('1d6');
		expect(formatMod('19-20/x2')).toBe('19-20/x2');
	});
});
