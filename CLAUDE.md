# CLAUDE.md — projekt „Jedlo" (osobná kuchárka + plánovač jedál)

Tento súbor je pre Claude Code / vývojára. Vysvetľuje architektúru, build a pravidlá projektu.

## Čo to je
Osobná **offline webová kuchárka** a **meal-prep plánovač** pre domácnosť (po slovensky).
Jeden samostatný súbor `kucharka.html` sa **generuje** zo zdrojov — neupravuje sa ručne.

## Architektúra (dôležité)
`kucharka.html` je **vygenerovaný artefakt**. Needituj ho priamo. Zdroje:

```
data/sablona.html   HTML kostra + všetok CSS + placeholdery (__APP_JS__, __DATA__, __POTRAVINY__, __JEDALNICKY__, __DATUM__, __POCET__)
data/app.js         VŠETOK JavaScript aplikácie (vanilla JS, žiadny framework)
data/potraviny.json  databáza potravín (výživa, ceny, oddelenia, alergény, balenia, mikroživiny)
recepty/*.json       recepty (1 súbor = 1 recept)
recepty/fotky/       fotky receptov (voliteľné)
jedalnicky/*.json    uložené týždenné jedálničky
generuj_kucharku.py  BUILD: poskladá vyššie uvedené → kucharka.html
```

## Build (spusti po KAŽDEJ zmene zdrojov)
```
python3 generuj_kucharku.py
```
Vloží `app.js` na `__APP_JS__`, dáta ako JSON na placeholdery, a zapíše `kucharka.html`.

## Ako overiť
- Syntax JS: `node --check data/app.js`
- Prepočty množstiev: `node test_prepocty.js` (kusy sa škálujú len počtom porcií, nie % veľkosti porcie)
- Build sám kontroluje dáta: množstvo bez jednotky / neznáma jednotka = build padne (`skontroluj_recepty`)
- Otvor `kucharka.html` v prehliadači. Pre PWA/service worker/synchronizáciu spusti lokálny server:
  `python3 -m http.server 8000` a otvor `http://localhost:8000/kucharka.html`.

## Konvencie a nástrahy
- **Offline, single-file:** appka nesmie závisieť od CDN/siete (okrem voliteľnej Supabase synchronizácie). Všetko sa vkladá inline.
- **`app.js` nesmie obsahovať literál `</script>`** (rozbil by inline vloženie).
- Po úprave `app.js`/`sablona.html`/dát **vždy** spusti generátor.
- Stav používateľa je v `localStorage` pod kľúčom **`kucharka_v2`** (obľúbené, hodnotenia, poznámky, plán, špajza, profil/stravníci, váhy, história varenia…).
- `sync-config.js` je **voliteľný a tajný** (Supabase kľúče) — je v `.gitignore`, needituj do neho verejné dáta. Vzor: `sync-config.example.js`, postup: `HOSTING.md`.

## Dátové modely
**Recept** (`recepty/*.json`): `id, nazov, kategoria, kuchyna, zdroj, porcie, cas, kcal_na_porciu?, popis, ingrediencie[{nazov,mnozstvo|null,jednotka,poznamka?}], postup[], tipy, foto, tagy[]`.
Kategórie: Raňajky, Hlavné jedlo, Cestoviny, Polievka, Šalát, Nátierka, Príloha, Pečivo, Snack, Dezert, Kokteil, Nápoj.
**Potravina** (`potraviny.json`): `kluc` (podreťazec názvu suroviny), `oddelenie`, `alergeny[]`, `kcal/bielkoviny/tuky/sacharidy` na 100 g, `cena100` €/100 g, `g_za_ks?`, `hustota`, `meso`, `balenie_g?`, `balenie_popis?`, `vlaknina?`, `sodik?`. Matchovanie: najdlhší `kluc`, ktorý je podreťazcom názvu ingrediencie.
**Jedálniček** (`jedalnicky/*.json`): `id, nazov, od, ciel_kcal, plan{ "0".."6": {slot: id|[ids]} }`.

## Kľúčové koncepty v app.js
- `komponent(id)` / `slotIds` — slot v pláne môže mať viac komponentov (hlavné + príloha). Príloha-tokeny `prf:*` (PRILOHY) sú virtuálne recepty.
- `stravniciList()`, `baseDayKcal`, `pocetPorcii`, `mnozMult`, `porcieNaVar` — prepočet množstiev pre viacerých stravníkov s rôznymi kalóriami (žiadny „%" faktor).
- Bloky (meal-prep): `S.hranice[7]`, `bloky()`, `blokDni()`; default A=Po-Ut, B=St-Št-Pi, C=So-Ne; varný deň = deň pred blokom.
- Generátor: `generujJedalnicek` (kategória→slot `SLOT_KATEGORIE`, pestrosť, sezónnosť `jeSezonne`, akcie `jeVakcii`, watch-list `jeWatch`, kupované snacky, sendviče Po-Pi).
- Špajza: `S.spajza`, expirácie, min. zásoby → nákup, `odpisRecept`.
- Nedeliteľné jednotky (ks/rožok/žemľa/plátok) sa zaokrúhľujú na celé.

## Doménové pravidlá (batch cooking)
3 bloky/týždeň (A: Ne večer→Ut, B: Ut večer→Pi, C: Pi večer→Ne), 1 variant/slot/blok, bez opakovania naprieč blokmi, bez carryover C→A. 4 jedlá (raňajky/obed/snack/večera), poradie kcal obed>večera>raňajky>snack, obed≠večera, raňajky sendvič/wrap iná báza/blok. Cieľ ~1400–1450 kcal/os./deň. Pantry staples vždy do nákupu. RecipeTinEats obmedzene.

## Nápady na ďalší vývoj
Backlog a inšpirácia z 25 aplikácií: `INSPIRACIA.md`. Otvorené (treba backend/dáta): OCR bločkov, živé viac-reťazcové letáky, plné mikroživiny, komunitné zdieľanie, AI import z videa.

## Odporúčaný prvý krok pre Claude Code
0. **Git:** v priečinku je nekompletný `.git` (vznikol v cloudovom prostredí, kde sa git nedal dokončiť). Zmaž ho a založ nanovo:
   `rm -rf .git && git init && git add -A && git commit -m "Initial commit — kuchárka v14"`
1. `python3 -m http.server` a otestovať appku v prehliadači.
2. Zvážiť rozdelenie `app.js` (~70 KB) na moduly + jednoduchý bundling (spájanie), doplniť pár unit testov pre výpočty (kcal, mnozMult, nákup).
3. Rozbehnúť hosting + Supabase synchronizáciu podľa `HOSTING.md`.
