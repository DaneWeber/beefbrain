import { describe, expect, it } from 'vitest';
import { parseCharacterYamlContent } from './characters';

describe('parseCharacterYamlContent', () => {
	it('validates and calculates character YAML through bnb-core', () => {
		const raw = `---
character:
  abilities:
    strength: [99, { str: 99 }, { base: 10 }]
`;

		const parsed = parseCharacterYamlContent(raw, 'test.yaml');
		expect(parsed.character.abilities.strength[0]).toBe(10);
		expect(parsed.character.abilities.strength[1].str).toBe(0);
	});

	it('throws on invalid YAML', () => {
		const raw = `---
character: abilities: strength: [15, str: 2]
`;

		expect(() => parseCharacterYamlContent(raw, 'broken.yaml')).toThrow(
			'Invalid character YAML in "broken.yaml"'
		);
	});

	it('throws when parsed content is not an object', () => {
		expect(() => parseCharacterYamlContent('42', 'scalar.yaml')).toThrow(
			'Character YAML in "scalar.yaml" did not parse to an object'
		);
	});
});
