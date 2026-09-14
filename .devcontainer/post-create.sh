#!/usr/bin/env bash
# postCreateCommand for .devcontainer/devcontainer.json.
#
# Idempotent -- re-run it by hand from an integrated terminal if setup looks
# incomplete (a browser install that failed while the network was down, say):
#   bash .devcontainer/post-create.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/home/node/.cache/ms-playwright}"

# Docker creates named-volume mounts (see devcontainer.json "mounts") owned by
# root, which leaves them unwritable by the "node" user that runs the tooling.
sudo chown -R node:node /home/node/.claude
sudo mkdir -p "$BROWSERS_PATH"
sudo chown -R node:node "$BROWSERS_PATH"

# Same problem, different owner: the claude-code devcontainer feature installs
# into npm's global prefix as root, so Claude Code's own updater can't replace
# the package. Background updates fail with "no_permissions" and the CLI goes
# stale without ever saying so. Group stays "npm" to match the rest of the
# prefix (it's setgid).
CLAUDE_CODE_PKG="$(npm -g config get prefix)/lib/node_modules/@anthropic-ai"
if [ -d "$CLAUDE_CODE_PKG" ]; then
	sudo chown -R node:npm "$CLAUDE_CODE_PKG"
fi

# pdflatex, for bnb-latex / bnb-cli --pdf.
sudo apt-get update
sudo apt-get install -y \
	texlive-latex-base \
	texlive-latex-recommended \
	texlive-fonts-recommended

# The one step the bnb-web e2e suite can't run without. Playwright needs two
# separate things and only one of them survives a rebuild:
#   - the browser builds (~650MB), which live in the named volume at
#     PLAYWRIGHT_BROWSERS_PATH and do persist
#   - their shared libraries (libnss3, libasound2, ...), which are plain apt
#     packages in the container filesystem and do not
# Hence every rebuild. It's quick once the volume is warm: `--with-deps` no-ops
# on the apt side and the download is skipped.
#
# CI=true is load-bearing. pnpm checks that node_modules is up to date before
# `exec`, and against a bind-mounted node_modules installed from the host it
# wants to purge and reinstall -- a prompt that hard-fails with
# ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY when there's no TTY.
#
# chromium only: the one browser the suite and CI both use
# (.github/workflows/bnb-web-prs.yml installs exactly this).
if ! CI=true pnpm --filter bnb-web exec playwright install --with-deps chromium; then
	# Deliberately not fatal. A failure here is usually a flaky network, and
	# letting it fail the build would mark the whole container broken when in
	# fact everything except the e2e suite is ready to use.
	echo >&2
	echo "warning: 'playwright install' failed (see above)." >&2
	echo "The container is usable, but the bnb-web e2e suite won't run until" >&2
	echo "this succeeds. Retry with:" >&2
	echo "    pnpm --filter bnb-web run test:e2e:install" >&2
fi
