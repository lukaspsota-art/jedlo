#!/usr/bin/env bash
# Jeden príkaz, ktorý spustí celú kontrolu projektu Jedlo.
#
#   bash scripts/testuj.sh            # syntax + celá sada + regresie + metriky
#   bash scripts/testuj.sh --rychlo   # bez metrík (metriky sú najpomalšia časť)
#   JOBS=1 bash scripts/testuj.sh     # sekvenčne (default = počet jadier)
#   METRIKY_TYZDNOV=20 ...            # koľko týždňov merať (20 = rovnako ako BASELINE.md)
#
# Exit kód: 0 = všetko sedí, 1 = niečo padlo (syntax, test alebo ZMENA stavu regresie).
# Skript sa dá púšťať opakovane, nič nezapisuje do repa (len do dočasného priečinka).
set -uo pipefail

KOREN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$KOREN"
LOG="$(mktemp -d)"
trap 'rm -rf "$LOG"' EXIT

# 4 procesy aj na 2 jadrách: testy sú prevažne CPU-bound, ale stroj býva zdieľaný a väčší pool
# udrží sadu pod 3 minútami; pamäťovo je to bezpečné (~0,2 GB na proces). Prepíš cez JOBS=.
JOBS="${JOBS:-4}"
METRIKY_TYZDNOV="${METRIKY_TYZDNOV:-20}"
BEZ_METRIK=0
for arg in "$@"; do [ "$arg" = "--rychlo" ] && BEZ_METRIK=1; done

C_OK=$'\033[32m'; C_ZLE=$'\033[31m'; C_UPOZ=$'\033[33m'; C_SIV=$'\033[90m'; C_0=$'\033[0m'
if [ ! -t 1 ]; then C_OK=""; C_ZLE=""; C_UPOZ=""; C_SIV=""; C_0=""; fi

ZLYHANI=0
hlavicka() { printf '\n%s\n%s\n' "$1" "$(printf '%.0s─' $(seq 1 ${#1}))"; }

# ── 1. syntax ────────────────────────────────────────────────────────────────
hlavicka "1) Syntax"
SYNTAX_ZLE=0
for f in data/app.js test_*.js scripts/*.js; do
  [ -e "$f" ] || continue
  if out=$(node --check "$f" 2>&1); then
    printf '  %s✓%s %s\n' "$C_OK" "$C_0" "$f"
  else
    printf '  %s✗%s %s\n      %s\n' "$C_ZLE" "$C_0" "$f" "$(echo "$out" | head -3 | tr '\n' ' ')"
    SYNTAX_ZLE=$((SYNTAX_ZLE+1)); ZLYHANI=$((ZLYHANI+1))
  fi
done
if [ "$SYNTAX_ZLE" -gt 0 ]; then
  printf '\n%sSyntax je rozbitá — ďalej nemá zmysel pokračovať.%s\n' "$C_ZLE" "$C_0"
  exit 1
fi

# ── 2. testová sada ──────────────────────────────────────────────────────────
# Poradie = od najpomalšieho, nech pool nečaká na dobehnutie jedného dlhého testu.
SADA=(test_generator.js test_regresie.js test_pravidla.js test_odolnost.js
      test_vypocty.js test_nakup.js test_parovanie.js test_jednotky.js test_porcie.js test_prepocty.js)
# test_ux.js meria ČAS prekreslenia mriežky (D1) — paralelne s inými procesmi je to lotéria,
# preto beží sám, až keď pool dobehne.
SAM=(test_ux.js)

spusti_test() { # $1 = súbor
  local t0 t1
  t0=$(date +%s%N)
  node "$1" >"$LOG/$1.out" 2>&1
  echo "$?" >"$LOG/$1.kod"
  t1=$(date +%s%N)
  echo $(( (t1 - t0) / 1000000 )) >"$LOG/$1.ms"
}

hlavicka "2) Testy ($JOBS paralelne)"
bezi=0
for t in "${SADA[@]}"; do
  [ -e "$t" ] || continue
  spusti_test "$t" &
  bezi=$((bezi+1))
  if [ "$bezi" -ge "$JOBS" ]; then wait -n; bezi=$((bezi-1)); fi
done
wait
for t in "${SAM[@]}"; do
  [ -e "$t" ] || continue
  spusti_test "$t"        # výkonnostné testy: samostatne, nič iné nesmie bežať
done
SADA+=("${SAM[@]}")

CELKOM_KONTROL=0
for t in "${SADA[@]}"; do
  [ -e "$t" ] || continue
  kod=$(cat "$LOG/$t.kod" 2>/dev/null || echo 99)
  ms=$(cat "$LOG/$t.ms" 2>/dev/null || echo 0)
  # počet kontrol: „OK — N kontrol", inak počet riadkov s ✓
  n=$(grep -oE '(OK — [0-9]+ kontrol|[0-9]+ kontrol sedí)' "$LOG/$t.out" 2>/dev/null | grep -oE '[0-9]+' | tail -1)
  if [ -z "$n" ]; then n=$(grep -c '✓' "$LOG/$t.out" 2>/dev/null); fi
  n=$(printf '%s' "${n:-0}" | head -1 | tr -cd '0-9'); n="${n:-0}"
  # test_porcie.js a test_prepocty.js kontrolujú cez holé assert-y a počet nehlásia
  [ "$n" = "0" ] && n_zobraz="—" || n_zobraz="$n"
  CELKOM_KONTROL=$((CELKOM_KONTROL + n))
  if [ "$kod" = "0" ]; then
    printf '  %s✓%s %-22s %3s kontrol %s(%s ms)%s\n' "$C_OK" "$C_0" "$t" "$n_zobraz" "$C_SIV" "$ms" "$C_0"
  else
    ZLYHANI=$((ZLYHANI+1))
    printf '  %s✗%s %-22s kód %s %s(%s ms)%s\n' "$C_ZLE" "$C_0" "$t" "$kod" "$C_SIV" "$ms" "$C_0"
    grep -vE '^\s*✓' "$LOG/$t.out" | tail -12 | sed 's/^/      /'
  fi
done

# test_regresie.js má vlastnú sémantiku — vypíšeme jeho zhrnutie vždy
if [ -e "$LOG/test_regresie.js.out" ]; then
  hlavicka "3) Známe otvorené chyby (test_regresie.js)"
  grep -E '^\s+(✗|✓|‼) \[' "$LOG/test_regresie.js.out" | sed 's/^ */  /'
  grep -E 'kontrol sedí s očakávaním' "$LOG/test_regresie.js.out" | sed 's/^/  /'
  if [ "$(cat "$LOG/test_regresie.js.kod" 2>/dev/null)" != "0" ]; then
    printf '  %s‼ Stav niektorej známej chyby sa ZMENIL — aktualizuj test_regresie.js.%s\n' "$C_UPOZ" "$C_0"
  fi
fi

# ── 4. metriky proti BASELINE.md ─────────────────────────────────────────────
if [ "$BEZ_METRIK" = "0" ] && [ -e scripts/metriky.js ]; then
  hlavicka "4) Metriky vs BASELINE.md (${METRIKY_TYZDNOV} týždňov)"
  if node scripts/metriky.js "$METRIKY_TYZDNOV" >"$LOG/metriky.out" 2>&1; then
    # názov metriky | baseline | smer, kde smer: + = viac je lepšie, - = menej je lepšie, 0 = len info
    while IFS='|' read -r nazov base smer; do
      [ -z "$nazov" ] && continue
      riadok=$(grep -F "| $nazov" "$LOG/metriky.out" | head -1)
      hodnota=$(echo "$riadok" | awk -F'|' '{print $3}' | sed 's/^ *//;s/ *$//')
      [ -z "$hodnota" ] && { printf '  %s?%s %-42s (metrika sa nenašla)\n' "$C_UPOZ" "$C_0" "$nazov"; continue; }
      cislo=$(echo "$hodnota" | grep -oE '^-?[0-9]+([.,][0-9]+)?' | tr ',' '.')
      znak=" "; farba="$C_SIV"
      if [ -n "$cislo" ] && [ "$smer" != "0" ]; then
        lepsie=$(awk -v a="$cislo" -v b="$base" -v s="$smer" 'BEGIN{d=a-b; if(s=="+"){print (d>0.0001)?1:((d<-0.0001)?-1:0)} else {print (d<-0.0001)?1:((d>0.0001)?-1:0)}}')
        case "$lepsie" in 1) znak="↑"; farba="$C_OK";; -1) znak="↓"; farba="$C_ZLE";; *) znak="=";; esac
      fi
      printf '  %s%s%s %-42s %-14s %s(baseline %s)%s\n' "$farba" "$znak" "$C_0" "$nazov" "$hodnota" "$C_SIV" "$base" "$C_0"
    done <<'METRIKY'
medián bielkovín/deň|97.9|+
dní pod 80 g bielkovín|12.9|-
priemer vlákniny/deň|11.1|+
priemer sodíka/deň|1391|0
dní v ±10 % cieľa (pred škálovaním)|58.6|+
dní potrebujúcich korekciu > 15 %|3.6|-
celé poradie O>V>R>S|96.4|+
cena týždňa (Nákup)|120.94|0
položiek nákupu bez ceny|6|-
unikátnych receptov spolu|193|+
METRIKY
    printf '  %s(↑ lepšie než baseline · ↓ horšie · metriky sú informatívne, prahy strážia testy)%s\n' "$C_SIV" "$C_0"
  else
    printf '  %s✗%s scripts/metriky.js padol\n' "$C_ZLE" "$C_0"
    tail -8 "$LOG/metriky.out" | sed 's/^/      /'
    ZLYHANI=$((ZLYHANI+1))
  fi
fi

# ── 5. súhrn ─────────────────────────────────────────────────────────────────
hlavicka "Súhrn"
printf '  kontrol spolu: %s\n' "$CELKOM_KONTROL"
if [ "$ZLYHANI" -eq 0 ]; then
  printf '  %s✓ všetko prešlo%s\n' "$C_OK" "$C_0"
  exit 0
fi
printf '  %s✗ zlyhaní: %s%s\n' "$C_ZLE" "$ZLYHANI" "$C_0"
exit 1
