# bnb-latex

> LaTeX generation utilities for BeefBrain character sheets

`bnb-latex` is a shared package for turning BeefBrain YAML into LaTeX output.
It validates and calculates character data through `bnb-core`, then renders a
selected template with safe token substitution.

## Current scope

- Render `.tex` from BeefBrain YAML
- D&D 3.5 starter templates:
  - `dnd35-streamlined`
  - `dnd35-detailed`
  - `dnd35-spellcaster`
- Input size guards for YAML and custom templates
- Escaped text substitution for LaTeX safety

## Example

```ts
import { renderLatex } from 'bnb-latex'

const result = renderLatex({
  yaml: characterYaml,
  templateKey: 'dnd35-streamlined',
})

console.log(result.latex)
```

## Development

```bash
pnpm --filter bnb-latex build
pnpm --filter bnb-latex test
```
