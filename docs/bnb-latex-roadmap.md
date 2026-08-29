# bnb-latex Package Roadmap

This document defines the implementation plan for adding a new package, `bnb-latex`, to BeefBrain. The goal is to provide secure, tested LaTeX and PDF generation from BeefBrain YAML data, reusable by both `bnb-cli` and `bnb-web`.

## Goals

1. Add a new workspace package: `packages/bnb-latex`.
2. Support **template + YAML input** to produce `.tex` output.
3. Support optional `.pdf` compilation from generated `.tex`.
4. Make the package reusable from:
   - `bnb-cli` (command-line workflow)
   - `bnb-web` (downloadable LaTeX workflow)
5. Ship with D&D 3.5 starter templates and multiple sheet variants.
6. Enforce secure defaults and add meaningful automated test coverage.

## Non-Goals (Initial Version)

1. No arbitrary TeX package installation from user input.
2. No unbounded runtime compilation jobs.
3. No browser-side PDF compilation.
4. No full WYSIWYG sheet editor in `bnb-web`.

## High-Level Architecture

```
bnb-cli ----------------------\
                              > bnb-latex ----> .tex output ----> optional PDF compile
bnb-web server route --------/
                      ^
                      |
                 bnb-core (validation + calculation)
```

`bnb-latex` is a pure package-level dependency for both callers. It owns rendering and compile orchestration; callers own UX and input collection.

## Package Design (`packages/bnb-latex`)

### Public API (proposed)

- `renderLatex(input): RenderLatexResult`
  - Validates + calculates YAML using `bnb-core`
  - Renders selected template with sanitized data
  - Returns rendered TeX and metadata
- `compilePdf(input): Promise<CompilePdfResult>`
  - Compiles TeX in an isolated temp directory
  - Returns PDF bytes/path and compiler logs
- `renderAndCompile(input): Promise<RenderAndCompileResult>`
  - Convenience flow for CLI usage
- `listTemplates(): TemplateInfo[]`
  - Returns bundled template keys and descriptions

### Internal Modules (proposed)

- `src/types.ts` - public types/interfaces
- `src/templates/registry.ts` - template registration and lookup
- `src/templates/dnd35/*.tex` - bundled starter templates
- `src/parseInput.ts` - YAML parse/validate/calculate bridge to `bnb-core`
- `src/renderTemplate.ts` - deterministic token replacement layer
- `src/compile/compilePdf.ts` - secure compiler invocation + temp dir handling
- `src/errors.ts` - typed user-facing errors

## D&D 3.5 Template Variants (Initial)

1. `dnd35-streamlined` - table-friendly, play-session focused
2. `dnd35-detailed` - fuller stat breakdown and references
3. `dnd35-spellcaster` - casting-heavy layout preference

Each variant should share common data mapping primitives to avoid drift.

## CLI Integration Plan (`packages/bnb-cli`)

### UX

Add a dedicated mode under `bnb` for LaTeX generation, with non-breaking behavior for existing commands.

Proposed examples:

```bash
bnb latex character.yaml --template dnd35-streamlined --out sheet.tex
bnb latex character.yaml --template dnd35-detailed --out sheet.tex --pdf
bnb latex character.yaml --template-file custom.tex --out custom.tex
```

### Expected Behavior

- Fails fast on invalid YAML or missing template.
- Writes TeX deterministically to requested output path.
- If `--pdf` is set:
  - compiles with secure defaults
  - prints explicit guidance if compiler is unavailable
- Never enables shell-escape.

## Web Integration Plan (`packages/bnb-web`)

### Scope (Initial)

Add a server-side generation flow for downloadable `.tex` files:

- Input: selected character + template variant (or controlled custom template upload)
- Output: downloadable `.tex` file response

### Security Boundaries

- All rendering on server only.
- No arbitrary filesystem path reads from user-provided input.
- Restrict template sources to:
  - bundled templates
  - explicit uploaded content (size limited), if enabled

### Future Extension

Add optional server-side PDF generation endpoint after the TeX flow is stable.

## Security Requirements

1. **Template safety**
   - No eval-based template execution.
   - Use constrained substitution primitives only.
2. **Compiler safety**
   - shell-escape disabled
   - explicit argument list (no shell command string interpolation)
   - hard timeout and process kill on overrun
3. **Filesystem safety**
   - isolated temp working directory
   - canonicalize and validate output paths in CLI
   - allowlist output extensions
4. **Input safety**
   - max YAML/template payload sizes
   - strict UTF-8 text handling
   - clear, non-leaky errors
5. **Operational safety**
   - bounded log output in error paths
   - cleanup of temp artifacts on success/failure

## Testing Strategy

### `bnb-latex` tests (Jest)

1. Rendering tests
   - token replacement
   - missing/optional field handling
   - deterministic output snapshots for each D&D 3.5 template variant
2. Validation bridge tests
   - invalid YAML
   - valid YAML + calculated-field availability
3. Compile orchestration tests
   - compiler command argument safety
   - timeout handling
   - temp directory cleanup
   - unavailable compiler error messaging

### `bnb-cli` tests (Jest)

1. Argument parsing and mode selection for `latex`.
2. TeX output writing success/failure.
3. PDF mode behavior with mocked compiler outcomes.

### `bnb-web` tests (Vitest)

1. Server route/action validation and template selection.
2. Successful TeX response headers/content.
3. Failure cases (invalid input, oversized uploads, template mismatch).

## Delivery Plan (Suggested Commit Slices)

1. **Scaffold package**
   - create `packages/bnb-latex`
   - add package scripts, tsconfig, jest config, exports
2. **Core rendering**
   - template registry + YAML->model mapping + `renderLatex`
3. **PDF compile path**
   - secure subprocess wrapper + timeout + cleanup
4. **CLI integration**
   - `bnb latex` command mode + output options
5. **Web integration**
   - server-side TeX download flow
6. **Hardening and tests**
   - edge cases, security tests, docs polish

## Acceptance Criteria

1. New package builds and tests pass.
2. `bnb-cli` can generate `.tex` from YAML with bundled template keys.
3. `bnb-cli --pdf` compiles or returns clear environment/setup error.
4. `bnb-web` can return downloadable `.tex` for selected character/template.
5. No unvalidated template path access or shell-unsafe compiler invocation.
6. Automated tests cover success and critical failure/security paths.

## Ownership and Handoff Notes

- Keep logic centralized in `bnb-latex`; avoid duplicating render rules in CLI/web.
- Treat `bnb-core` as the canonical data validation/calculation source.
- If implementation spans multiple contributors, assign by commit slice to reduce merge conflicts.
