# bnb-ext

> VS Code extension for BeefBrain character YAML files

**Status**: 🚧 Alpha — core formatting/validation features implemented, editor integration polish (auto-completion, hover, go-to-definition) still to come.

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

1. Registers `.bnb.yaml`/`.bnb.yml` as the dedicated `bnb-yaml` language,
   with YAML syntax highlighting and BeefBrain as its default formatter.
   This keeps the formatter scoped to BeefBrain files instead of changing
   the default formatter for unrelated YAML.
2. Only activates its own features (formatting, diagnostics) on files whose
   path ends in `.bnb.yaml`/`.bnb.yml`.

If you'd rather not rename your files, set `bnb.associateAllYaml: true` in
your VS Code settings to apply BeefBrain formatting/diagnostics to **every**
`.yaml`/`.yml` file instead. This is off by default so the extension doesn't
surprise you on unrelated YAML files in a workspace.

## Commands

- **BeefBrain: Format and Calculate Character YAML** (`bnb.formatDocument`) —
  also wired up as the document formatter, so "Format Document" and
  format-on-save work for recognized files. Enable `editor.formatOnSave` as
  usual; no `editor.defaultFormatter` setting is needed for `bnb-yaml`.

## Settings

- `bnb.associateAllYaml` (boolean, default `false`) — treat all `.yaml`/`.yml`
  files as BeefBrain data instead of requiring the `.bnb.yaml`/`.bnb.yml`
  naming convention.

## Installing an alpha release

Alpha builds are distributed as self-contained `.vsix` files on the
[GitHub Releases page](https://github.com/DaneWeber/beefbrain/releases).
You do not need to clone this repository or install Node.js:

1. Download `bnb-ext-<version>.vsix` from the latest **bnb-ext** prerelease.
2. In VS Code, open the Extensions view, select the `...` menu, choose
   **Install from VSIX...**, and select the downloaded file.
3. Reload VS Code when prompted, then open a character file whose name ends
   in `.bnb.yaml` or `.bnb.yml`.

You can also install it from a terminal:

```bash
code --install-extension /path/to/bnb-ext-<version>.vsix
```

Run **BeefBrain: Format and Calculate Character YAML** from the Command
Palette, or use VS Code's normal **Format Document** command. Diagnostics are
shown automatically while editing recognized files. Alpha releases do not
update automatically; repeat these steps with a newer VSIX to upgrade.

## Development

```bash
cd packages/bnb-ext
pnpm install
pnpm build       # bundle src/extension.ts -> dist/extension.js via tsdown
pnpm test        # unit tests (Jest) for the vscode-independent core logic
```

To run the extension in a real VS Code window, open **this package folder**
(`packages/bnb-ext`) directly as a VS Code workspace — not the monorepo
root — then press `F5` ("Run Extension"). This launches an Extension
Development Host with `bnb-ext` loaded.

### Running the dev build as a real installed extension

The Extension Development Host is good for quick iteration, but it's a
separate, temporary VS Code instance, and it doesn't exercise the packaged
`.vsix`. The repo's DevContainer launches a background setup from
`postCreateCommand` to build, package, and install `bnb-ext`. A fresh container
may report ready before installation finishes; reload the window after it completes.

After editing `bnb-ext`'s source, refresh the installed copy from an
integrated terminal — no container rebuild needed:

```bash
pnpm ext:install   # build -> vsce package -> install the .vsix
```

Then reload the window (**Developer: Reload Window**) to pick up the new
build. To remove it again:

```bash
code --uninstall-extension daneweber.bnb-ext
```

Because the DevContainer is a disposable, remote VS Code session, this is
also the controlled environment for testing the extension the way a user
would receive it — installing it in the VS Code you use day to day works
identically, just without the throwaway sandbox:

```bash
cd packages/bnb-ext
pnpm run package   # builds, then runs `vsce package` -> bnb-ext-<version>.vsix
code --install-extension bnb-ext-<version>.vsix
```

Note that `pnpm run build` bundles `bnb-core`, `yaml`, and their own
dependencies (e.g. `mathjs`) directly into `dist/extension.js` via esbuild.
A packaged `.vsix` ships no `node_modules`, so everything the extension needs
at runtime must already be inlined there. That's why `pnpm ext:install`
builds `bnb-core` first.

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
and verify the packaged extension activates, registers its command and
formatter, and associates `.bnb.yaml` files with the `bnb-yaml` language. On
Linux CI this needs a virtual display (see the GitHub Actions workflow, which
runs it under `xvfb-run`).

## Next Steps

1. Auto-completion for character/creature fields (schema-aware)
2. Hover information explaining where a value/modifier is derived from
3. Ctrl-click "go to definition" from a modifier to its source (feat/item)
4. Publish to the VS Code Marketplace
