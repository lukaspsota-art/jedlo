#!/bin/sh
# AUDIT: hľadá kľúče/tajomstvá v repozitári, v kucharka.html aj v docs/index.html (GitHub Pages, verejné)
cd "$(dirname "$0")/../.."
echo "=== .gitignore ==="; cat .gitignore
echo
echo "=== súbory sync-config* v repo ==="; ls -la sync-config* 2>/dev/null || echo "(žiadne)"
echo "  v gite:"; git ls-files | grep -i "sync-config" || echo "  (žiadne)"
echo
echo "=== SYNC_CONFIG v build výstupoch ==="
for f in kucharka.html docs/index.html; do
  [ -f "$f" ] || continue
  echo "--- $f"
  grep -c "SYNC_CONFIG" "$f" | sed 's/^/  výskytov SYNC_CONFIG: /'
  grep -o 'sync-config[^"'"'"']*' "$f" | sort -u | sed 's/^/  odkaz: /'
done
echo
echo "=== vzory tajomstiev naprieč celým repom (bez .git) ==="
PAT='eyJhbGciOi|supabase\.co|SUPABASE_|service_role|anon[ _-]?key|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY'
grep -rInE "$PAT" . --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null | grep -viE "example|HOSTING\.md|README|CLAUDE\.md" | head -20 || true
echo "(hore je zoznam skutočných zásahov; nasleduje kontrola príkladových súborov)"
echo
echo "=== example / dokumentačné výskyty (očakávané) ==="
grep -rlnE "$PAT" . --exclude-dir=.git 2>/dev/null | head -20
echo
echo "=== git história: bol sync-config.js niekedy commitnutý? ==="
git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep -i "sync-config" || echo "  nikdy"
echo
echo "=== docs/ obsah ==="; ls -la docs/
echo
echo "=== je docs/index.html identická kópia kucharka.html? ==="
if cmp -s kucharka.html docs/index.html; then echo "  áno (bajt na bajt)"; else echo "  NIE — líšia sa"; fi
