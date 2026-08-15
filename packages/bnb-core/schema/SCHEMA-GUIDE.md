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
strength: [15, str: 2, { base: 11, racial: 2, level: 2 }]
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

Formulas use [Math.js](https://mathjs.org/) for mathematical operations. See [Math.js documentation](https://mathjs.org/docs/expressions/syntax.html) for complete syntax details.

#### Supported Operations

- **Arithmetic**: `+`, `-`, `*`, `/`, `^` (power), `%` (modulo)
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `and`, `or`, `not`
- **Ternary**: `condition ? trueValue : falseValue`

#### Common Math Functions

- `sum(array)` - Sum all elements in an array
- `floor(value)` - Round down to nearest integer
- `ceil(value)` - Round up to nearest integer
- `round(value)` - Round to nearest integer
- `abs(value)` - Absolute value
- `max(a, b, ...)` - Maximum of values
- `min(a, b, ...)` - Minimum of values
- `sqrt(value)` - Square root
- `pow(base, exponent)` - Raise to power

#### String Operations

Because this is evaluated in a math context, strings must be compared using functions that do not conflict with Math.js operations.

- `concat(str1, str2, ...)` - Concatenate strings
- `equalText(str1, str2)` - Compare strings for equality
- `class.includes("War")` - Check if class string includes "War"

#### Type Checking

- `isNum(value)` - Check if value is a number
- `isStr(value)` - Check if value is a string
- `isArray(value)` - Check if value is an array
- `isObject(value)` - Check if value is an object

These custom functions have been added to make type-checking easier in formulas. The following are the equivalent checks:

- `isNum(value)` → `typeof value === 'number'`
- `isStr(value)` → `typeof value === 'string'`
- `isArray(value)` → `Array.isArray(value)`
- `isObject(value)` → `typeof value === 'object' && !Array.isArray(value)`

### Variables and Paths

Variables reference data from the YAML file using **jq-style path syntax**. BeefBrain implements a custom path resolver supporting common jq patterns.

#### Absolute Paths

Reference data from anywhere in the character sheet using dot notation starting with `.`:

- `".character.abilities[]"` - All numeric values from the abilities object
- `".character.abilities.strength[0]"` - First element of the strength array
- `".character.level.power-level"` - A specific property value

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

Reference data relative to the current field's location in the data structure:

**Basic parent access:**

- `"parent[0]"` - First element in parent array
- `"parent[1]"` - Second element in parent array
- `"parent[2][]"` - All numeric values from third element (if it's an object or array)

**Parent function (for navigating up multiple levels):**

- `"parent(1)"` or `"parent"` - One level up (same as accessing parent directly)
- `"parent(2)"` - Two levels up (grandparent)
- `"parent(3)"` - Three levels up (great-grandparent)
- `"parent(2)[0]"` - First element of grandparent array

The `parent(n)` function navigates `n` levels up in the data hierarchy from the current field's path.

Example:

```json
"calculation": {
  "formula": "sum(components)",
  "variables": {
    "components": "parent[2][]"
  }
}
```

For YAML like `strength: [15, str: 2, {base: 11, racial: 2, level: 2}]`, when calculating the score (position 0), `parent[2][]` extracts `[11, 2, 2]` from the components object.

#### Path Syntax Rules

1. **Absolute paths**: Start with `.` and use dot notation (`.character.abilities`)
2. **Relative paths**: Use `parent` or `parent(n)` to navigate up the hierarchy
3. **Property access**: Use dots to access nested properties (`.character.abilities.strength`)
4. **Array index**: Use brackets with a number for specific index (`strength[0]`)
5. **Array collection**: Use empty brackets `[]` to collect all numeric values from an object or array
6. **Nested access**: Combine syntax as needed (`.character.weapons[0].damage[1]`)

#### Supported Path Patterns

✅ **Implemented:**

- `.character.abilities[]` - Collect all numeric values
- `.character.abilities.strength[0]` - Access specific array index
- `parent[0]` - Access parent array element
- `parent(2)` - Navigate up multiple levels
- `parent[2][]` - Collect from parent's element

❌ **Not Yet Implemented:**

- Complex jq filters (`select`, `map`, etc.)
- Recursive descent (`..`)
- Pipe operations (`|`)
- Advanced jq functions

For most character sheet calculations, the supported patterns are sufficient.

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
strength: [15, str: 2, { base: 11, racial: 2, level: 2 }]
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

BeefBrain uses [Math.js](https://mathjs.org/) for formula evaluation, which provides:

- ✅ **Sandboxed evaluation** - No access to file system, network, or process
- ✅ **No arbitrary code execution** - Only mathematical and logical operations
- ✅ **Type safety** - Automatic type checking and conversion
- ✅ **Deterministic** - Same input always produces same output

**Safe operations:**

- Mathematical expressions: `(score - 10) / 2`
- Comparisons and logic: `score > 10 and dex <= 20`
- Built-in functions: `floor()`, `sum()`, `max()`, etc.
- Ternary operators: `condition ? value1 : value2`

**Not available (and that's good):**

- File/network access
- System calls
- Variable mutation
- Arbitrary function execution
- Access to JavaScript globals

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
