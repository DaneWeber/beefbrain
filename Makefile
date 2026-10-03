deflog:
	tail -f /tmp/devcontainer-deferred-setup.log

check:
	pnpm format
	pnpm lint
	pnpm test

# Every sheet is made with each template, named <character>-<template>.pdf
# as the web app names its downloads. One template: make pdfs TEMPLATES=dnd35-detailed
TEMPLATES ?= dnd35-detailed dnd35-quick-reference
PDF_DIR ?= out/pdfs

pdfs:
	pnpm build
	@failed=0; \
	for f in data/parties/*/*.bnb.yaml; do \
		party=$$(basename $$(dirname "$$f")); \
		name=$$(basename "$$f" .bnb.yaml); \
		mkdir -p "$(PDF_DIR)/$$party"; \
		for template in $(TEMPLATES); do \
			node packages/bnb-cli/dist/index.mjs latex "$$f" --template $$template \
				--out "$(PDF_DIR)/$$party/$$name-$$template.tex" --pdf \
				|| { echo "FAILED: $$f ($$template)"; failed=1; }; \
		done; \
	done; \
	echo "PDFs written to $(PDF_DIR)/"; \
	exit $$failed
