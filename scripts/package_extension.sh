#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
MANIFEST_PATH="$ROOT_DIR/extension/manifest.json"

VERSION="$(
  python3 - <<'PY' "$MANIFEST_PATH"
import json
import sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
with manifest_path.open() as handle:
    manifest = json.load(handle)
print(manifest["version"])
PY
)"

OUTPUT_NAME="youtube-activity-cleaner-${VERSION}.zip"
OUTPUT_PATH="$DIST_DIR/$OUTPUT_NAME"

mkdir -p "$DIST_DIR"

(
  cd "$ROOT_DIR/extension"
  zip -qr "$OUTPUT_PATH" .
)

echo "Created $OUTPUT_PATH"
