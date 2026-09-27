#!/usr/bin/env bash
# Mirrors the current wwwroot/ build into the finance-family-8rj preview repo
# (https://finance-family-8rj.pages.dev) with search indexing blocked, then pushes it.
# Usage, from projects/finance-family:  node scripts/build.mjs && bash scripts/mirror-preview.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="$SRC/../finance-family-8rj"
[ -d "$DST/.git" ] || { echo "preview repo not found at $DST (gh repo clone jet-vaults/finance-family-8rj projects/finance-family-8rj)"; exit 1; }
rm -rf "$DST/wwwroot"
cp -r "$SRC/wwwroot" "$DST/wwwroot"
printf 'User-agent: *\nDisallow: /\n' > "$DST/wwwroot/robots.txt"
grep -rl 'name="robots"' "$DST/wwwroot" --include=index.html --include=404.html | xargs sed -i 's|<meta name="robots" content="index,follow,max-image-preview:large">|<meta name="robots" content="noindex,nofollow">|'
cd "$DST"
git -c core.quotepath=false add -A
if git diff --cached --quiet; then echo "preview already up to date"; exit 0; fi
git -c core.quotepath=false commit -q -m "Mirror finance-family build $(date +%Y-%m-%d)"
git push -q origin main
echo "preview updated: https://finance-family-8rj.pages.dev"
