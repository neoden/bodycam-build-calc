#!/bin/sh
# Re-extract stats from the installed game and rebuild web/data.js. Read-only for the game files.
# Usage: ./update.sh [path to Bodycam install]   (needs: python3 -m venv .venv && .venv/bin/pip install pyooz)
set -e
cd "$(dirname "$0")"
GAME="${1:-$HOME/.steam/steam/steamapps/common/Bodycam}"
RX='Content/BodycamCore/(AbilitySystem/(DT_|GameplayEffects/Weapons)|ItemsDefinition)|BodycamAnimationFramework/Content/Animations/.*(_Montage|BAS_[^/]*)\.(uasset|uexp)$|BodycamAnimationFramework/Content/Blueprints/Animation/AdditiveMotions/.*\.(uasset|uexp)$'
rm -rf extracted
.venv/bin/python tools/pakextract.py "$GAME/Bodycam/Content/Paks" extracted "$RX"
BUILD=$(sed -n 's/.*"buildid"[^"]*"\([0-9]*\)".*/\1/p' "$GAME/../../appmanifest_2406770.acf" 2>/dev/null || true)
# mesh/skeleton headers (for attachment sockets) are discovered from the tables, so build → fetch what is missing → rebuild
for pass in 1 2 3; do
  python3 tools/build_data.py extracted web/data.js "$BUILD"
  [ -f extracted/missing.txt ] || break
  .venv/bin/python tools/pakextract.py "$GAME/Bodycam/Content/Paks" extracted @extracted/missing.txt
done

python3 tools/bundle.py web bodycam-build-calc.html
