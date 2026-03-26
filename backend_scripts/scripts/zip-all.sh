#!/usr/bin/env bash
# Zip every party Lambda (bash). From backend_scripts: ./scripts/zip-all.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FUNCS=(
  searchUser
  partyInvite
  partyInvitesIncoming
  partyInviteAccept
  partyInviteDecline
  partyListMine
  partyLeave
  partyDissolve
)

for name in "${FUNCS[@]}"; do
  echo "=== $name ==="
  "$ROOT/scripts/zip-function.sh" "$name"
done

echo "Done. Archives in $ROOT/dist/"
