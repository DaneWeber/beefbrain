# bnb-latex

> LaTeX generation utilities for BeefBrain character sheets

`bnb-latex` is a shared package for turning BeefBrain YAML into LaTeX output.
It validates and calculates character data through `bnb-core`, then renders a
selected template with safe token substitution.

## Current scope

- Render `.tex` from BeefBrain YAML
- Compile rendered `.tex` to `.pdf` with secure defaults:
  - `-no-shell-escape`
  - isolated temp working directory
  - compile timeout
- D&D 3.5 starter templates:
  - `dnd35-streamlined`
  - `dnd35-detailed`
  - `dnd35-spellcaster`
- Input size guards for YAML and custom templates
- Escaped text substitution for LaTeX safety

## Design guidance

- D&D 3.5e print-layout direction: `../../docs/bnb-latex-character-sheet-design.md`
- Item/feat effect sources shown in skill/attack breakdowns: `../../docs/bnb-core-item-feat-effects.md`

## PDF prerequisite

`compilePdf` requires `lualatex` on your system `PATH`. The Detailed template
also requires Atkinson Hyperlegible Next to be installed as a system font.

For WSL (Ubuntu):

```bash
sudo apt update
sudo apt install -y fontconfig texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-luatex
sudo bash scripts/install-atkinson-hyperlegible-next.sh
```

From repo root, you can verify with:

```bash
pnpm doctor:latex
```

## Example

```ts
import { renderLatex } from 'bnb-latex'

const result = renderLatex({
  yaml: characterYaml,
  templateKey: 'dnd35-detailed',
})

console.log(result.latex)
```

```ts
import { compilePdf } from 'bnb-latex'

const { pdfBuffer } = await compilePdf({
  latex: result.latex,
  outputBaseName: 'landorf-sheet',
})
```

## Development

```bash
pnpm --filter bnb-latex build
pnpm --filter bnb-latex test
```
