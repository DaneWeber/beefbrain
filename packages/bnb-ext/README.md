# bnb-ext

> VS Code extension for BeefBrain character YAML files

**Status**: 🚧 Scaffold — core formatting/validation features implemented, editor integration polish (auto-completion, hover, go-to-definition) still to come.

## Overview

`bnb-ext` brings [bnb-core](../bnb-core/README.md) into the editor:

- **Format Document** recalculates derived fields (modifiers, saves, combat
  stats, etc.) and re-serializes the file with bnb-core's compact YAML style.
- **Diagnostics** report YAML syntax errors (with real line/column ranges)
  and calculation errors raised by bnb-core's propagation engine, as you type.

Hover information (where a value comes from) and ctrl-click "go to
definition" for modifiers are planned follow-ups — see [Next Steps](#next-steps).

## Which files does it apply to?

By convention, BeefBrain character files use the compound extension
**`.bnb.yaml`** (or `.bnb.yml`). This extension:

1. Registers `.bnb.yaml`/`.bnb.yml` as additional file associations for
   VS Code's built-in `yaml` language, so they get YAML syntax highlighting
   out of the box (with or without another YAML extension installed) —
   compound extensions like this work fine in VS Code's language
   registration; `extensions` entries match on filename suffix, and the
   longest/most specific match wins over a plain `.yaml` association.
2. Only activates its own features (formatting, diagnostics) on files whose
   path ends in `.bnb.yaml`/`.bnb.yml`.

If you'd rather not rename your files, set `bnb.associateAllYaml: true` in
your VS Code settings to apply BeefBrain formatting/diagnostics to **every**
`.yaml`/`.yml` file instead. This is off by default so the extension doesn't
surprise you on unrelated YAML files in a workspace.

## Commands

- **BeefBrain: Format and Calculate Character YAML** (`bnb.formatDocument`) —
  also wired up as the document formatter, so "Format Document" and
  format-on-save work for recognized files.

## Settings

- `bnb.associateAllYaml` (boolean, default `false`) — treat all `.yaml`/`.yml`
  files as BeefBrain data instead of requiring the `.bnb.yaml`/`.bnb.yml`
  naming convention.

## Development

```bash
cd packages/bnb-ext
pnpm install
pnpm build       # bundle src/extension.ts -> dist/extension.js via tsup
pnpm test        # unit tests (Jest) for the vscode-independent core logic
```

To run the extension in a real VS Code window, open **this package folder**
(`packages/bnb-ext`) directly as a VS Code workspace — not the monorepo
root — then press `F5` ("Run Extension"). This launches an Extension
Development Host with `bnb-ext` loaded.

### Architecture

Logic is split so most of it can be unit tested without the `vscode` module:

- `src/core/*` — pure functions (formatting, diagnostics, file-association
  rules) with no dependency on `vscode`. Covered by Jest unit tests.
- `src/extension.ts` — thin adapter that wires the core functions into VS
  Code's formatting/diagnostics/command APIs. Covered by an end-to-end smoke
  test (see below), not Jest.

## Testing

**Unit tests** (`pnpm test`): Jest tests for `src/core/*` — formatting,
diagnostics (including real YAML error line/column ranges), and the
`.bnb.yaml` file-association rule. These run in plain Node, no editor needed.

**End-to-end tests** (`pnpm test:e2e`): uses `@vscode/test-cli` /
`@vscode/test-electron` to launch a real (headless-capable) VS Code instance
and verify the packaged extension activates, registers its command, and
associates `.bnb.yaml` files with the `yaml` language. On Linux CI this needs
a virtual display (see the GitHub Actions workflow, which runs it under
`xvfb-run`).

## Next Steps

1. Auto-completion for character/creature fields (schema-aware)
2. Hover information explaining where a value/modifier is derived from
3. Ctrl-click "go to definition" from a modifier to its source (feat/item)
4. Publish to the VS Code Marketplace
