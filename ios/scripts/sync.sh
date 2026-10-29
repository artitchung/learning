#!/usr/bin/env bash
# Copy the built dashboards into the app bundle and regenerate the home-screen summary.
# Run from the repo root after rebuilding the dashboards:
#   (cd bid197 && python3 build.py && python3 build.py --cycle cycle196r2.js) && ios/scripts/sync.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
DEST="$ROOT/ios/CrewBid/CrewBid/Resources/Dashboards"
mkdir -p "$DEST"
cp "$ROOT/bid197/dist/bid196r2.html" "$ROOT/bid197/dist/bid197.html" "$DEST/"
node "$ROOT/ios/scripts/summary.js" > "$ROOT/ios/CrewBid/CrewBid/Resources/summary.json"
echo "synced: $(ls "$DEST" | tr '\n' ' ') + summary.json"
