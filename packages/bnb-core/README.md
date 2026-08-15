# bnb-core

> Core library for BeefBrain - TTRPG character calculation and validation

## Overview

The foundation of the BeefBrain ecosystem. This TypeScript library handles validation, automatic calculation, and formatting of YAML character data files for tabletop RPG systems.

**Status**: ✅ Core functionality complete and well-tested (60+ tests)

## Features

### ✅ Implemented

- **YAML validation**: Validates YAML files for proper syntax and structure
- **Automatic calculations**: Computes derived fields like ability modifiers using game system rules
- **YAML formatting**: Outputs compact, human-readable YAML with consistent styling
- **D&D 3.5e support**: Complete calculation engine for D&D 3.5 edition with 60+ comprehensive tests
- **Type safety**: Full TypeScript type definitions for character data
- **Schema system**: Extensible schema framework for game system definitions
- **Minimal dependencies**: Single runtime dependency (yaml library only)

### 🚧 In Progress

- M&M 3e schema and calculations
- Enhanced validation error messages with field paths

### 📋 Planned

- Modifier/template application API (apply effects to characters)
- Performance optimization for large files
- Additional game system support
- Calculation debugging/tracing mode

## Installation

```bash
pnpm add bnb-core
```

## Usage

```typescript
import {
  validateBeefBrainData,
  updateCalculatedFields,
  dataToCompactYAML,
} from 'bnb-core'

// Validate a YAML string
const yamlContent = `---
character:
  name: Gimli
  abilities:
    strength: [16, {str: 3}]
`

if (validateBeefBrainData(yamlContent)) {
  console.log('Valid character data!')
}

// Calculate derived fields
const updated = updateCalculatedFields(yamlContent)
console.log(updated) // YAML with all calculated fields

// Format to compact YAML
const data = { character: { name: 'Gimli' } }
const formatted = dataToCompactYAML(data)
```

## API Reference

### `validateBeefBrainData(yaml: string): boolean`

Validates a YAML string against the BeefBrain schema.

### `updateCalculatedFields(yaml: string): string`

Calculates all derived fields and returns formatted YAML.

### `dataToCompactYAML(data: BeefBrainData): string`

Converts JavaScript object to compact YAML format.

## Testing

Comprehensive test suite with 60+ tests:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage report
```

Test coverage includes:

- Validation logic
- Ability score calculations
- Skill bonus calculations (including synergies, class skills)
- Saving throw calculations
- Combat stat calculations (AC, initiative, attacks)
- Magic item bonuses
- Equipment-derived stats
- Integration tests with real character files

## Schema System

Schemas define game system rules in JSON format. See [SCHEMA-GUIDE.md](schema/SCHEMA-GUIDE.md) for complete documentation on the schema format, formula syntax, and validation rules.

### Supported Systems

- **D&D 3.5e**: `schema/dnd35/` (complete)
- **M&M 3e**: `schema/mnm3/` (in progress)

### Adding a New Game System

To add support for a new TTRPG system:

1. Create a schema file in `schema/<system-name>/`
2. Define types, validations, and calculation formulas
3. Create example character files
4. Add integration tests
5. See [SCHEMA-GUIDE.md](schema/SCHEMA-GUIDE.md#adding-a-new-game-system) for detailed step-by-step instructions

### How Schemas Work

Schemas consist of three parts:

- **Type Definitions**: The structure of character data (abilities, skills, combat, etc.)
- **Validations**: Rules for what values are allowed (min/max ranges, specific values)
- **Calculations**: Automatic computation of derived fields using mathematical formulas

Example calculation (D&D 3.5e ability modifier):

```json
"AbilityModifier": {
  "type": "number",
  "calculation": {
    "formula": "floor((score - 10) / 2)",
    "variables": {
      "score": "parent[0]"
    }
  }
}
```

Formulas use [Math.js](https://mathjs.org/) for safe, sandboxed evaluation with support for:

- Arithmetic operations: `+`, `-`, `*`, `/`, `^`, `%`
- Comparisons: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical operators: `and`, `or`, `not`
- Built-in functions: `floor()`, `ceil()`, `sum()`, `max()`, `min()`, etc.
- Variable references using jq-style paths

## Development

```bash
pnpm build         # Build once
pnpm build:watch   # Build on changes
pnpm test:watch    # Test on changes
pnpm lint          # Check code style
pnpm format        # Format code
```

## Used By

- [bnb-cli](../bnb-cli/README.md) - Command-line tool
- [bnb-web](../bnb-web/README.md) - Web application (integration pending)
- [bnb-ext](../bnb-ext/README.md) - VS Code extension (planned)

## Next Steps

1. Complete M&M 3e schema and calculations
2. Improve validation error messages with specific field paths
3. Add modifier application API (`applyModifier`, `applyTemplate`)
4. Document calculation formulas and rules
5. Performance profiling and optimization
6. Add calculation debugging/tracing mode

## License

MIT
