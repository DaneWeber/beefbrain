#!/usr/bin/env bash
set -euo pipefail

readonly FONT_COMMIT="7925f50f649b3813257faf2f4c0b381011f434f1"
readonly FONT_BASE_URL="https://raw.githubusercontent.com/google/fonts/${FONT_COMMIT}/ofl/atkinsonhyperlegiblenext"
readonly FONT_DIR="/usr/local/share/fonts/atkinson-hyperlegible-next"

install -d "$FONT_DIR"
curl --fail --location --silent --show-error \
  "${FONT_BASE_URL}/AtkinsonHyperlegibleNext%5Bwght%5D.ttf" \
  --output "${FONT_DIR}/AtkinsonHyperlegibleNext[wght].ttf"
curl --fail --location --silent --show-error \
  "${FONT_BASE_URL}/AtkinsonHyperlegibleNext-Italic%5Bwght%5D.ttf" \
  --output "${FONT_DIR}/AtkinsonHyperlegibleNext-Italic[wght].ttf"

fc-cache --force
luaotfload-tool --update
