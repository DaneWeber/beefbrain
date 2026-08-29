# bnb-cli

> Command-line interface for BeefBrain character management

**Status**: ✅ Working, needs test coverage

## Overview

A simple command-line tool for validating, calculating, and formatting TTRPG character YAML files. Perfect for Git workflows, scripting, and automation.

Combine this with Git and your favorite text editor, and you have everything you need to manage TTRPG characters in a version-controlled, human-readable format.

## Installation

```bash
pnpm add -g bnb-cli
# or use locally within a project
pnpm add bnb-cli
```

## Usage

### Validate and Format

```bash
bnb gimli.yaml
# Validates and prints formatted YAML to stdout
# Exit code 0 = valid, 1 = invalid
```

### Calculate Derived Fields

```bash
bnb gimli.yaml --calc
# Calculates all derived fields (modifiers, bonuses, etc.)
# Prints complete YAML to stdout
```

### Update Files In Place

```bash
bnb gimli.yaml --write
# Updates the file with calculated fields
# Useful after manually editing base stats
```

### Common Workflows

**After editing a character:**

```bash
bnb characters/*.yaml --write
# Update all character files
```

**Pre-commit validation:**

```bash
for file in characters/*.yaml; do
  bnb "$file" || exit 1
done
```

**View changes before committing:**

```bash
bnb gimli.yaml --calc | diff gimli.yaml -
```

### Generate LaTeX and PDF Character Sheets

```bash
bnb latex gimli.yaml --template dnd35-streamlined --out gimli.tex
bnb latex gimli.yaml --template dnd35-detailed --out gimli.tex --pdf
bnb latex --list-templates
```

## Options

- **(no options)**: Validate and print formatted YAML
- `--calc`: Calculate derived fields and print
- `--write`: Calculate and update file in place
- `latex`: Generate LaTeX files (and optional PDF) from character YAML
- `--help`: Show help message

## Use Cases

- **Version Control**: Keep character files in Git with automatic formatting
- **Batch Updates**: Update all characters after a rule change
- **Validation**: Check files before committing
- **CI/CD**: Validate character files in automated pipelines
- **Scripting**: Integrate into character management workflows

## Dependencies

- [bnb-core](../bnb-core/README.md) - Core calculation and validation library
- [bnb-latex](../bnb-latex/README.md) - Shared LaTeX/PDF rendering package

## Testing

```bash
pnpm build # Build CLI distribution used by integration tests
pnpm test  # Run all tests
```

**Current Status**: ✅ Integration tests in place

Current suite covers:

1. CLI argument parsing and help behavior
2. Validation and calculation flows (`--calc`, `--write`)
3. File error handling and multi-file processing
4. Output behavior and edge cases

**Priority Next Steps for Testing:**

1. Add unit tests for argument parsing and CLI flag handling
2. Add integration tests for file I/O operations and error handling
3. Test batch file processing with multiple YAML files
4. Test error scenarios (invalid files, missing dependencies, permission errors)
5. Add snapshot tests for output formatting

## Next Steps

1. **Add test coverage** (unit + integration tests)
2. **Batch processing**: `bnb *.yaml --write` support
3. **Watch mode**: Auto-format on file changes
4. **Diff mode**: Show what would change without writing
5. **Verbose mode**: Detailed calculation output for debugging
6. **Better arg parsing**: Consider Commander.js for subcommands
7. **Output formats**: JSON output option for scripting
8. **Schema selection**: `--schema dnd35|mnm3` flag

## Examples

### Git Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
for file in $(git diff --cached --name-only | grep '\.yaml$'); do
  bnb "$file" || exit 1
done
```

### Makefile Integration

```makefile
.PHONY: validate update

validate:
	@for file in characters/*.yaml; do \
		bnb "$$file" || exit 1; \
	done

update:
	@for file in characters/*.yaml; do \
		bnb "$$file" --write; \
	done
```

## License

MIT
