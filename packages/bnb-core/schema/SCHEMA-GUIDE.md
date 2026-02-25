# BeefBrain Schema Guide

## Overview

BeefBrain schemas define the structure and automatic calculations for character sheets in tabletop RPG systems. This guide explains how to create your own schema for custom game systems.

## Schema File Structure

A BeefBrain schema is a JSON file that defines:
1. **Types** - The structural elements of your character data
2. **Validations** - Rules for what values are allowed
3. **Calculations** - Automatic computation of derived values

### Basic Schema Template

```json
{
  "root": {
    "children": [
      {
        "name": "character",
        "type": "Character"
      }
    ]
  },
  "Character": {
    "children": [
      {
        "name": "abilities",
        "type": "Abilities"
      }
    ]
  }
}
```

## Type Definitions

### Children Structure

Use `children` for objects with named properties:

```json
"Abilities": {
  "children": [
    {
      "name": "strength",
      "type": "AbilityScore"
    },
    {
      "name": "dexterity",
      "type": "AbilityScore"
    }
  ]
}
```

This corresponds to YAML like:
```yaml
abilities:
  strength: 15
  dexterity: 12
```

### Array Structure

Use `array` for positional data (tuples):

```json
"StrengthScore": {
  "array": {
    "0": {
      "type": "AbilityScore"
    },
    "1": {
      "name": "str",
      "type": "AbilityModifier"
    },
    "2": {
      "type": "AbilityScoreComponents",
      "optional": true
    }
  }
}
```

This corresponds to YAML like:
```yaml
strength: [15, str: 2, {base: 11, racial: 2, level: 2}]
```

### Simple Types

For scalar values:

```json
"AbilityScore": {
  "type": "number",
  "validValues": [
    {
      "integers": {
        "min": 1,
        "max": 30
      }
    }
  ]
}
```

## Calculations

Calculations automatically compute derived values based on formulas.

### Basic Calculation Structure

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

### Formula Syntax

Formulas use a [Math.js](https://mathjs.org/index.html) for mathematical operations. See [Math.js Syntax](https://mathjs.org/docs/expressions/syntax.html) for details on the syntax.

#### Common Functions

- `sum(array)` - Sum of all elements in an array
- `floor(value)` - Round down to nearest integer
- `ceil(value)` - Round up to nearest integer
- `max(a, b)` - Maximum of two values
- `min(a, b)` - Minimum of two values
- `(condition) ? (trueValue) : (falseValue)` - Conditional expression
- `["high", "medium", "low"][index]` - Array indexing for categorical outputs
- `z = (a == b) ? 1 : 2; ["equal", "different"][z]` - Statement separator `;` for multiple operations

### Variables and Paths

Variables reference data from the same YAML file using paths as understood by [jqjs](https://github.com/mwh/jqjs).

#### Absolute Paths

Reference data from anywhere in the character sheet using dot notation starting with `.`:

- `".character.abilities[]"` - All numeric values from abilities object
- `".character.abilities.strength[0]"` - First element of strength array

Example (Mutants & Masterminds):
```json
"PowerPointsAssigned": {
  "type": "number",
  "calculation": {
    "formula": "2 * sum(abilityScores)",
    "variables": {
      "abilityScores": ".character.abilities[]"
    }
  }
}
```

#### Relative Paths

Reference data relative to the current field:

- `"parent[0]"` - First element in parent array
- `"parent(2)"` - Reference the parent of the parent
- `"parent[2][]"` - All numeric values from third element (object or array)

Example:
```json
"calculation": {
  "formula": "sum(components)",
  "variables": {
    "components": "parent[2][]"
  }
}
```

For YAML like `strength: [15, str: 2, {base: 11, racial: 2, level: 2}]`, `parent[2][]` extracts `[11, 2, 2]`.

##### Parent Function

Because accessing the parent is common in BeefBrain, `parent(n)` is defined as `getpath(path(x) | .[0:(-n)])` in jqjs, where `x` is the current path of the field to be calculated and `n` is the depth of parent. `parent` is a shorthand for `parent(1)`.

#### Path Syntax Rules

1. **Absolute paths**: Start with `.` and use dot notation
2. **Relative paths**: Use `parent()` to access parents and siblings.
3. **Property access**: Use dots like `.character.abilities`
4. **Array index**: Use brackets like `[0]` for specific index
5. **Array collection**: Use `[]` to collect all numeric values
6. **Nested access**: Combine as needed like `.character.level.stats[1]`

### Complete Calculation Examples

#### Example 1: D&D 3.5e Ability Modifier

```json
"AbilityModifier": {
  "type": "number",
  "validValues": [
    {
      "integers": {
        "min": -5
      }
    }
  ],
  "calculation": {
    "formula": "score == '_' ? 0 : floor((score - 10) / 2)",
    "variables": {
      "score": "parent[0]"
    }
  }
}
```

This calculates: `(ability_score - 10) / 2`, rounded down, with special handling for `"_"` (undefined ability).

#### Example 2: Component Sum

```json
"AbilityScore": {
  "type": "number",
  "calculation": {
    "formula": "sum(components)",
    "variables": {
      "components": "parent[2][]"
    }
  }
}
```

This sums all values in the third array element, like `{base: 11, racial: 2, level: 2}` → `15`.

#### Example 3: Cross-Reference Calculation

```json
"PowerPointsAssigned": {
  "type": "number",
  "calculation": {
    "formula": "2 * sum(abilityScores)",
    "variables": {
      "abilityScores": ".character.abilities[]"
    }
  }
}
```

This sums all ability scores from anywhere in the character and doubles the result.

## Validation

### Valid Values

Define what inputs are acceptable:

```json
"validValues": [
  {
    "integers": {
      "min": 1,
      "max": 30
    }
  }
]
```

### Multiple Valid Value Sets

Use an array to allow multiple types:

```json
"validValues": [
  "_",
  {
    "integers": {
      "min": 1
    }
  }
]
```

This allows either the literal string `"_"` or an integer ≥ 1.

## Optional Fields

Mark fields as optional:

```json
{
  "name": "description",
  "type": "Description",
  "optional": true
}
```

## Best Practices

### 1. Start Simple

Begin with basic structure and add calculations incrementally:

```json
{
  "root": {
    "children": [
      {
        "name": "character",
        "type": "Character"
      }
    ]
  },
  "Character": {
    "children": [
      {
        "name": "name",
        "type": "string"
      }
    ]
  }
}
```

### 2. Use Descriptive Type Names

Type names should clearly indicate their purpose:
- ✅ `"StrengthScore"`, `"MeleeAttackBonus"`
- ❌ `"Score1"`, `"Value"`

### 3. Document Complex Formulas

Add comments in your YAML data to explain the calculation purpose:

```yaml
# Ability modifier: (score - 10) / 2, rounded down
strength: [15, str: 2, {base: 11, racial: 2, level: 2}]
```

### 4. Keep Formulas Simple

Break complex calculations into multiple steps:

```json
"TotalAC": {
  "calculation": {
    "formula": "base + dex + armor",
    "variables": {
      "base": "parent[1].base",
      "dex": ".character.abilities.dexterity[1]",
      "armor": "parent[1].armor"
    }
  }
}
```

### 5. Test Incrementally

Add one calculation at a time and verify it works before adding more.

## Example Schemas

### Minimal Example

See `mnm3-character.json` for a simple schema with basic calculations.

### Complex Example

See `dnd35-character.json` for array-based structures with multi-step calculations.

## Schema Location

Place your schema files in:
```
packages/bnb-core/schema/<system-name>/<system-name>-character.json
```

For example:
- `packages/bnb-core/schema/dnd35/dnd35-character.json`
- `packages/bnb-core/schema/mnm3/mnm3-character.json`

## Testing Your Schema

Create test YAML files in:
```
packages/bnb-core/src/examples/
  unchanged/<system>-<character>.yaml
  update/<system>-<character>-<change>.yaml
  final/<system>-<character>.yaml
```

Then add integration tests to verify calculations update correctly.

## Common Pitfalls

### 1. Path References

❌ **Wrong**: `"character.abilities[]"` (missing leading `.`)
✅ **Right**: `".character.abilities[]"`

### 2. Array Syntax

❌ **Wrong**: Type with both `array` and `children`
✅ **Right**: Use either `array` OR `children`, not both

### 3. Circular References

❌ **Wrong**: Field A depends on Field B, which depends on Field A
✅ **Right**: Ensure dependency graph is acyclic

### 4. Formula Safety

❌ **Wrong**: `"formula": "deleteAllData()"`
✅ **Right**: Only use mathematical and logical operations

## Advanced Topics

### Conditional Calculations

Use ternary operators for branching logic:

```json
"formula": "hasArmor ? 10 + armor + dex : 10 + dex"
```

### Multi-Variable Formulas

Reference multiple data points:

```json
"formula": "bab + strMod + sizeBonus + misc",
"variables": {
  "bab": ".character.combat.bab",
  "strMod": ".character.abilities.strength[1]",
  "sizeBonus": ".character.size.attackBonus",
  "misc": "parent[1].misc"
}
```

### Nested Arrays

Use multiple array accesses:

```json
"variables": {
  "firstWeaponDamage": ".character.weapons[0].damage[0]"
}
```

## Getting Help

- Check existing schemas for patterns
- Review test files for examples
- Ensure formulas are pure mathematical expressions
- Test with simple data first, then add complexity

## Schema Version

Current schema format version: **1.0**

Future versions may add:
- String manipulation functions
- Lookup tables
- Custom function definitions
- Validation helpers
