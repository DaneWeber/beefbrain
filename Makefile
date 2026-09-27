deflog:
	tail -f /tmp/devcontainer-deferred-setup.log

check:
	pnpm format
	pnpm lint
	pnpm test

TEMPLATE ?= dnd35-detailed
PDF_DIR ?= out/pdfs

pdfs:
	pnpm build
	@failed=0; \
	for f in data/parties/*/*.bnb.yaml; do \
		party=$$(basename $$(dirname "$$f")); \
		name=$$(basename "$$f" .bnb.yaml); \
		mkdir -p "$(PDF_DIR)/$$party"; \
		node packages/bnb-cli/dist/index.mjs latex "$$f" --template $(TEMPLATE) \
			--out "$(PDF_DIR)/$$party/$$name.tex" --pdf || { echo "FAILED: $$f"; failed=1; }; \
	done; \
	echo "PDFs written to $(PDF_DIR)/"; \
	exit $$failed
