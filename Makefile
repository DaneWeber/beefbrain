deflog:
	tail -f /tmp/devcontainer-deferred-setup.log

check:
	pnpm format
	pnpm lint
	pnpm test
