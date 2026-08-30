#!/bin/sh
# AUDIT: čo spraví generuj_kucharku.py s poškodenými / nepriateľskými dátami.
# Pracuje v KÓPII repa v /tmp — nič v projekte nemení.
set -e
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
T="${TMPDIR:-/tmp}/audit_build_$$"
rm -rf "$T"; mkdir -p "$T"
cp -r "$SRC/data" "$SRC/jedalnicky" "$SRC/generuj_kucharku.py" "$T/"
mkdir -p "$T/recepty"
# malá vzorka receptov, nech je build rýchly
ls "$SRC/recepty"/*.json | head -40 | while read f; do cp "$f" "$T/recepty/"; done

run(){ ( cd "$T" && python3 generuj_kucharku.py 2>&1 | tail -4 ); echo "  exit=$?"; }

echo "=== 0. čistý build (kontrola) ==="; run

echo; echo "=== 1. Poškodený JSON receptu ==="
echo '{ "id": "rozbity", "nazov": "Rozbity",' > "$T/recepty/_rozbity.json"
run
echo "  → recept sa v kucharka.html nachádza?"; grep -c '"rozbity"' "$T/kucharka.html" || true
rm -f "$T/recepty/_rozbity.json"

echo; echo "=== 2. Recept s literálom </script> v postupe ==="
python3 - "$T" <<'PY'
import json,sys,os
t=sys.argv[1]
r={"id":"utok-script","nazov":"Test","kategoria":"Snack","kuchyna":"","zdroj":"test","porcie":1,"cas":"5 min",
   "popis":"","ingrediencie":[{"nazov":"Voda","mnozstvo":100,"jednotka":"ml"}],
   "postup":["Normálny krok </script><script>window.__XSS=1</script> a pokračuj"],
   "tipy":"","foto":"","tagy":[]}
json.dump(r,open(os.path.join(t,"recepty","_utok.json"),"w"),ensure_ascii=False)
PY
run
echo "  → koľkokrát je v kucharka.html reťazec '</script>' (čistý build má 1–2):"
grep -o '</script>' "$T/kucharka.html" | wc -l
echo "  → prenikol injektovaný <script>window.__XSS=1</script>?"
grep -c 'window.__XSS=1</script>' "$T/kucharka.html" || true
rm -f "$T/recepty/_utok.json"

echo; echo "=== 3. Recept s placeholderom __POTRAVINY__ v texte ==="
python3 - "$T" <<'PY'
import json,sys,os
t=sys.argv[1]
r={"id":"placeholder","nazov":"__POTRAVINY__ test","kategoria":"Snack","kuchyna":"","zdroj":"test","porcie":1,
   "cas":"5 min","popis":"__DATUM__ a __POCET__","ingrediencie":[{"nazov":"Voda","mnozstvo":100,"jednotka":"ml"}],
   "postup":["krok"],"tipy":"","foto":"","tagy":[]}
json.dump(r,open(os.path.join(t,"recepty","_ph.json"),"w"),ensure_ascii=False)
PY
run
echo "  → je v názve receptu v HTML stále __POTRAVINY__, alebo sa nahradil celou databázou?"
python3 - "$T" <<'PY'
import re,sys,os
h=open(os.path.join(sys.argv[1],"kucharka.html"),encoding="utf-8").read()
i=h.find('"id":"placeholder"')
print("   výsek:", h[i:i+120] if i>=0 else "(recept nenájdený)")
print("   veľkosť súboru:", len(h), "B")
PY
rm -f "$T/recepty/_ph.json"

echo; echo "=== 4. Recept s neznámou potravinou (nie je v potraviny.json) ==="
python3 - "$T" <<'PY'
import json,sys,os
t=sys.argv[1]
r={"id":"neznama","nazov":"Neznáma surovina","kategoria":"Snack","kuchyna":"","zdroj":"test","porcie":1,
   "cas":"5 min","popis":"","ingrediencie":[{"nazov":"Kryptonit","mnozstvo":500,"jednotka":"g"}],
   "postup":["krok"],"tipy":"","foto":"","tagy":[]}
json.dump(r,open(os.path.join(t,"recepty","_nez.json"),"w"),ensure_ascii=False)
PY
run
rm -f "$T/recepty/_nez.json"

echo; echo "=== 5. Recept s množstvom bez jednotky (má build zhodiť) ==="
python3 - "$T" <<'PY'
import json,sys,os
t=sys.argv[1]
r={"id":"bezjed","nazov":"Bez jednotky","kategoria":"Snack","kuchyna":"","zdroj":"test","porcie":1,
   "cas":"5 min","popis":"","ingrediencie":[{"nazov":"Voda","mnozstvo":100,"jednotka":""}],
   "postup":["krok"],"tipy":"","foto":"","tagy":[]}
json.dump(r,open(os.path.join(t,"recepty","_bj.json"),"w"),ensure_ascii=False)
PY
( cd "$T" && python3 generuj_kucharku.py 2>&1 | tail -3; echo "  exit=$?" )
rm -f "$T/recepty/_bj.json"
rm -rf "$T"
