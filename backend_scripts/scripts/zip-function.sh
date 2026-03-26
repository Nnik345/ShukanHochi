#!/usr/bin/env bash
# Usage (from backend_scripts): ./scripts/zip-function.sh searchUser
# Produces dist/<name>.zip with the same layout as a typical Node Lambda upload:
#   index.js, package.json, package-lock.json (if present), node_modules/, shared/
# Handler after upload: index.handler
set -euo pipefail

FUNC="${1:?Usage: $0 <function-folder-name>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$FUNC/index.js" ]]; then
  echo "Error: $ROOT/$FUNC/index.js not found" >&2
  exit 1
fi

mkdir -p dist
OUT="dist/${FUNC}.zip"
ZIP_TMP="$(mktemp -d)"
trap 'rm -rf "$ZIP_TMP"' EXIT

npm install --omit=dev

# Root-level index.js: rewrite ../shared/ → ./shared/ (shared/ is copied next to index.js in the zip)
sed "s|require('../shared/|require('./shared/|g" "$FUNC/index.js" > "$ZIP_TMP/index.js"

cp -a shared "$ZIP_TMP/"
cp -a node_modules "$ZIP_TMP/"
cp package.json "$ZIP_TMP/"
if [[ -f package-lock.json ]]; then
  cp package-lock.json "$ZIP_TMP/"
fi

if command -v 7z >/dev/null 2>&1; then
  ( cd "$ZIP_TMP" && 7z a -tzip -mx=9 "$ROOT/$OUT" . >/dev/null )
elif command -v zip >/dev/null 2>&1; then
  ( cd "$ZIP_TMP" && zip -r "$ROOT/$OUT" . -q )
else
  python3 - "$ZIP_TMP" "$ROOT/$OUT" <<'PY'
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            path = os.path.join(dirpath, name)
            arc = os.path.relpath(path, root)
            z.write(path, arc)
PY
fi

echo "Created $OUT"
echo "Lambda handler: index.handler"
