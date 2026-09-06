#!/usr/bin/env bash
PY="${PY:-python3}"   # na Windows spusti s PY=py — `python3` tam neexistuje
# e2e/spusti.sh — jeden príkaz, celá E2E sada proti SKUTOČNÉMU kucharka.html v prehliadači.
#
#   ./e2e/spusti.sh              # build + celá sada
#   ./e2e/spusti.sh 04 07        # len vybrané skupiny (podľa čísla alebo mena súboru)
#   BEZ_BUILDU=1 ./e2e/spusti.sh # netreba pregenerovať kucharka.html
#
# Návratový kód: 0 = všetko prešlo, 1 = niečo padlo, 2 = sada sa nedala spustiť.
# Screenshoty zlyhaní: e2e/screenshoty/   ·   surové dáta: e2e/posledny-beh.json
set -uo pipefail

KOREN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$KOREN" || exit 2

C_OK=$'\e[32m'; C_BAD=$'\e[31m'; C_INFO=$'\e[90m'; C_RESET=$'\e[0m'
[ -t 1 ] || { C_OK=""; C_BAD=""; C_INFO=""; C_RESET=""; }

echo "${C_INFO}── E2E: Jedlo / kucharka.html ─────────────────────────────────────${C_RESET}"

# 1) Build vygenerovaného artefaktu (testuje sa ON, nie zdroje)
if [ "${BEZ_BUILDU:-0}" != "1" ]; then
  echo "${C_INFO}▸ build: $PY generuj_kucharku.py${C_RESET}"
  if ! "$PY" generuj_kucharku.py; then
    echo "${C_BAD}Build padol — E2E sa nespúšťa.${C_RESET}"
    exit 2
  fi
fi
if [ ! -f kucharka.html ]; then
  echo "${C_BAD}kucharka.html neexistuje. Spusti: $PY generuj_kucharku.py${C_RESET}"
  exit 2
fi
echo "${C_INFO}  kucharka.html: $(du -h kucharka.html | cut -f1)${C_RESET}"

# 2) Predpoklady prostredia
command -v node >/dev/null 2>&1 || { echo "${C_BAD}Chýba node.${C_RESET}"; exit 2; }
command -v "$PY" >/dev/null 2>&1 || { echo "${C_BAD}Chýba $PY (lokálny server pre PWA/service worker).${C_RESET}"; exit 2; }
node -e "require('playwright')" 2>/dev/null || { echo "${C_BAD}Chýba balík playwright (npm i -g playwright).${C_RESET}"; exit 2; }
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 3) Sada
node "$KOREN/e2e/beh.js" "$@"
KOD=$?

echo
if [ $KOD -eq 0 ]; then
  echo "${C_OK}✔ E2E: všetko prešlo.${C_RESET}"
else
  echo "${C_BAD}✘ E2E: niečo padlo (kód $KOD). Screenshoty: e2e/screenshoty/${C_RESET}"
fi
exit $KOD
