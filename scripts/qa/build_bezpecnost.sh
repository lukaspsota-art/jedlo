#!/usr/bin/env bash
# QA: build MUSÍ padnúť, ak sa do dát dostane </script> alebo placeholder šablóny.
# Nezávislé overenie tvrdenia zo STAV_PO_VLNE3. Zdroje sa vrátia do pôvodného stavu.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 2
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
OK=0; ZLE=0
skus() { # meno, súbor, obsah
  local meno="$1" subor="$2" obsah="$3"
  local mal=0; [ -f "$subor" ] && { cp "$subor" "$TMP/zaloha"; mal=1; }
  printf '%s' "$obsah" > "$subor"
  if python3 generuj_kucharku.py >"$TMP/out" 2>&1; then
    echo "  NEPADOL   $meno  ← build prešiel, hoci nemal"
    ZLE=$((ZLE+1))
  else
    echo "  PADOL     $meno  → $(grep -iE 'chyb|script|placeholder|__|padol' "$TMP/out" | head -1 | cut -c1-120)"
    OK=$((OK+1))
  fi
  if [ "$mal" = 1 ]; then cp "$TMP/zaloha" "$subor"; else rm -f "$subor"; fi
}

echo "══ Build musí padnúť na nebezpečných dátach ══"
NOVY="recepty/__qa_test.json"

skus "recept obsahuje </script>" "$NOVY" '{"id":"qa-test","nazov":"QA </script><script>alert(1)</script>","kategoria":"Snack","kuchyna":"","porcie":1,"cas":"1 min","popis":"x","ingrediencie":[{"nazov":"Voda","mnozstvo":1,"jednotka":"ml","poznamka":""}],"postup":["x"],"tipy":"","foto":"","tagy":[],"zdroj":"QA"}'
rm -f "$NOVY"

skus "recept obsahuje placeholder __APP_JS__" "$NOVY" '{"id":"qa-test2","nazov":"QA __APP_JS__","kategoria":"Snack","kuchyna":"","porcie":1,"cas":"1 min","popis":"__DATA__","ingrediencie":[{"nazov":"Voda","mnozstvo":1,"jednotka":"ml","poznamka":""}],"postup":["__POTRAVINY__"],"tipy":"","foto":"","tagy":[],"zdroj":"QA"}'
rm -f "$NOVY"

skus "recept s množstvom bez jednotky" "$NOVY" '{"id":"qa-test3","nazov":"QA bez jednotky","kategoria":"Snack","kuchyna":"","porcie":1,"cas":"1 min","popis":"x","ingrediencie":[{"nazov":"Voda","mnozstvo":1,"jednotka":"","poznamka":""}],"postup":["x"],"tipy":"","foto":"","tagy":[],"zdroj":"QA"}'
rm -f "$NOVY"

skus "recept s neznámou jednotkou" "$NOVY" '{"id":"qa-test4","nazov":"QA zlá jednotka","kategoria":"Snack","kuchyna":"","porcie":1,"cas":"1 min","popis":"x","ingrediencie":[{"nazov":"Voda","mnozstvo":1,"jednotka":"vedro","poznamka":""}],"postup":["x"],"tipy":"","foto":"","tagy":[],"zdroj":"QA"}'
rm -f "$NOVY"

# app.js so </script> — kopírujeme a hneď vraciame
cp data/app.js "$TMP/app.js.bak"
printf '\n// QA test <\057script>\n' >> data/app.js
if python3 generuj_kucharku.py >"$TMP/out" 2>&1; then
  echo "  NEPADOL   app.js obsahuje </script>"
  ZLE=$((ZLE+1))
else
  echo "  PADOL     app.js obsahuje </script>  → $(grep -iE 'script|chyb' "$TMP/out" | head -1 | cut -c1-120)"
  OK=$((OK+1))
fi
cp "$TMP/app.js.bak" data/app.js

# app.js so syntaktickou chybou
cp data/app.js "$TMP/app.js.bak2"
printf '\nfunction ( { qa\n' >> data/app.js
if python3 generuj_kucharku.py >"$TMP/out" 2>&1; then
  echo "  NEPADOL   app.js má syntaktickú chybu"
  ZLE=$((ZLE+1))
else
  echo "  PADOL     app.js má syntaktickú chybu  → $(grep -iE 'syntax|chyb' "$TMP/out" | head -1 | cut -c1-120)"
  OK=$((OK+1))
fi
cp "$TMP/app.js.bak2" data/app.js

echo
echo "Zachytených: $OK · prepustených: $ZLE"
python3 generuj_kucharku.py >/dev/null 2>&1 && echo "Build po teste opäť prechádza." || { echo "POZOR: build po teste NEPRECHÁDZA"; exit 1; }
[ "$ZLE" -eq 0 ]
