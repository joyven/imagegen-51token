#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="${IMAGEGEN_NODE:-node}"

exec "$NODE_BIN" "$SCRIPT_DIR/images_image_gen.mjs" "$@"
