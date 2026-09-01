#!/usr/bin/env bash
# Builds bnb-ext, packages it as a .vsix, and installs it into this
# devcontainer's VS Code so it can be tested as a real installed extension
# (not just via the Extension Development Host).
#
# Runs automatically once via postCreateCommand when this devcontainer
# config is used. Re-run manually from an integrated terminal after editing
# bnb-ext's source to refresh the installed extension:
#   bash .devcontainer/bnb-ext-test/install-extension.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# Non-interactive: avoids pnpm's "purge node_modules?" prompt when the repo's
# host-built node_modules is bind-mounted into the container.
CI=true pnpm install
pnpm --filter bnb-core build

rm -f packages/bnb-ext/bnb-ext-*.vsix
pnpm --filter bnb-ext run package

vsix=$(ls packages/bnb-ext/bnb-ext-*.vsix | sort -V | tail -n1)

# The base image ships a `code` stub that exists on PATH but fails at
# invocation time (not just "command not found") until a real VS Code window
# has attached to this container and its remote server has replaced it.
if ! code --install-extension "$vsix" --force; then
  echo >&2
  echo "error: 'code --install-extension' failed (see above)." >&2
  echo "This container was probably started without a VS Code window attached." >&2
  echo "Built and packaged fine -- open this folder with VS Code's Dev Containers" >&2
  echo "extension (Reopen in Container, picking 'bnb-ext (extension test)'), then" >&2
  echo "re-run: bash .devcontainer/bnb-ext-test/install-extension.sh" >&2
  exit 1
fi

echo "Installed $vsix -- reload the window (Developer: Reload Window) to activate it."
