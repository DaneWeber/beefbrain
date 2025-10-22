#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Check that script is executing from the repo root
if [ ! -f "init-update.sh" ]; then
    echo "Error: This script must be run from the repository root."
    exit 1
fi

# Set PNPM store-dir to .pnpm-store in the repo root to share with host
export PNPM_STORE_DIR="$(pwd)/.pnpm-store"
mkdir -p "$PNPM_STORE_DIR"

# Set PNPM_HOME to the new store directory via .bashrc if not already set
if ! grep -q 'export PNPM_HOME=' ~/.bashrc; then
    echo '# pnpm' >> ~/.bashrc
    echo "export PNPM_HOME=$PNPM_STORE_DIR" >> ~/.bashrc
    echo 'case ":$PATH:" in' >> ~/.bashrc
    echo '  *":$PNPM_HOME:"*) ;;' >> ~/.bashrc
    echo '  *) export PATH="$PNPM_HOME:$PATH" ;;' >> ~/.bashrc
    echo 'esac' >> ~/.bashrc
    echo '# pnpm end' >> ~/.bashrc
fi

source ~/.bashrc

# PNPM update
pnpm self-update
