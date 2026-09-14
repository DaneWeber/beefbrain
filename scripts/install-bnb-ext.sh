#!/usr/bin/env bash
# Build bnb-ext from source, package it as a .vsix, and install it into the
# VS Code attached to this DevContainer, so the extension can be exercised as a
# real installed extension rather than through the Extension Development Host.
#
# Run it with:
#   pnpm ext:install
#
# It also runs once automatically from .devcontainer/post-create.sh, so a fresh
# container comes up with the dev build already installed. Re-run it by hand
# after editing bnb-ext's source to refresh the installed copy.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# bnb-ext's bundle inlines bnb-core (see packages/bnb-ext/esbuild.mjs -- a
# packaged .vsix ships no node_modules), and `pnpm run package` type-checks
# against bnb-core's .d.mts. Both need bnb-core's dist/ to be current.
pnpm --filter bnb-core build

# vsce names the file after the manifest version, so bumping the version leaves
# the old .vsix behind and the `ls ... | tail -n1` below could pick either one.
rm -f packages/bnb-ext/bnb-ext-*.vsix
pnpm --filter bnb-ext run package

vsix="$(ls packages/bnb-ext/bnb-ext-*.vsix | sort -V | tail -n1)"

# Two ways to install, and which one is available depends on whether a VS Code
# window is attached yet:
#
#   - `code` is the remote CLI, which talks to the running server over the
#     socket in VSCODE_IPC_HOOK_CLI. It only exists in an integrated terminal.
#     Preferred when present: the live window notices the new extension and
#     offers to reload.
#   - `code-server` is the server's own CLI. It writes straight to the
#     extensions directory with no window involved, which is what makes this
#     work from postCreateCommand, before anything has attached. The server is
#     installed under one of a few layouts depending on how it was fetched, and
#     /vscode is a volume shared across containers that accumulates one
#     directory per VS Code version -- hence the glob and the newest-first sort.
install_extension() {
	if [ -n "${VSCODE_IPC_HOOK_CLI:-}" ] && command -v code >/dev/null 2>&1; then
		code --install-extension "$vsix" --force && return 0
	fi

	local candidates=()
	while IFS= read -r -d '' candidate; do
		candidates+=("$candidate")
	done < <(
		find \
			/vscode/vscode-server/bin \
			"$HOME/.vscode-server/bin" \
			"$HOME/.vscode-server/cli/servers" \
			-maxdepth 4 -name code-server -type f -printf '%T@\t%p\0' \
			2>/dev/null | sort -zrn | cut -z -f2-
	)

	if [ ${#candidates[@]} -gt 0 ]; then
		"${candidates[0]}" --install-extension "$vsix" --force && return 0
	fi

	return 1
}

if ! install_extension; then
	echo >&2
	echo "error: built and packaged $vsix, but could not install it." >&2
	echo "No VS Code CLI was reachable, which usually means this container was" >&2
	echo "started without VS Code (the 'devcontainer' CLI, say). Open the repo" >&2
	echo "with Dev Containers: Reopen in Container, then re-run:" >&2
	echo "    pnpm ext:install" >&2
	exit 1
fi

echo "Installed $vsix -- reload the window (Developer: Reload Window) to activate it."
