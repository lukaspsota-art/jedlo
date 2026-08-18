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
py generuj_kucharku.py        # na Windows; inde python3 generuj_kucharku.py
```
Vloží `app.js` na `__APP_JS__`, dáta ako JSON na placeholdery, a zapíše `kucharka.html`.

## Ako overiť
- Syntax JS: `node --check data/app.js`
- Celá sada (po každej zmene `app.js`):
  `node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js && node test_prepocty.js && node test_porcie.js`
- **`test_harness.js`** spúšťa SKUTOČNÝ `app.js` s reálnymi dátami v `node:vm` (fake DOM,
  localStorage v pamäti, deterministický `Math.random`). Všetky testy stoja na ňom:
  `const app = require("./test_harness").load({stav:{...}, seed:42}); app.vyzivaReceptu(...)`.
  Pozn.: harness číta `const`-y cez export na konci súboru — nové konštanty, ktoré má vidieť test,
  dopíš do `EXPORT_TAIL`.
- Merania pred/po (výživa, cena, pravidlá generátora): `node scripts/metriky.js 30`
- Kontrola párovania surovín: `node scripts/kontrola_parovania.js [--nenapar|--vsetko]`
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
**Potravina** (`potraviny.json`): `kluc`, `oddelenie`, `alergeny[]`, `kcal/bielkoviny/tuky/sacharidy` na 100 g, `cena100` €/100 g (**`null` = neznáma cena, `0` = naozaj zadarmo**), `g_za_ks?` (hmotnosť kusa), `g_za_platok?` (hmotnosť plátku), `hustota`, `meso`, `balenie_g?`, `balenie_popis?`, `vlaknina?`, `sodik?`.
**Matchovanie (`najdiPotravinu`)**: kľúč musí sadnúť na súvislú postupnosť SLOV názvu; skloňovanie sa rieši kmeňom kľúča + prefixom slova; pri rovnako dlhom kľúči vyhráva ten bližšie k začiatku názvu. Výsledok je cachovaný.
`recepty/*.json` majú navyše `kcal_zdroj?: "vypocet"` — kcal_na_porciu nie je kurátorované, ale dopočítané (`scripts/dopocitaj_kcal.js`).
**Jedálniček** (`jedalnicky/*.json`): `id, nazov, od, ciel_kcal, plan{ "0".."6": {slot: id|[ids]} }`.

## Kľúčové koncepty v app.js
- `komponent(id)` / `slotIds` — slot v pláne môže mať viac komponentov (hlavné + príloha). Príloha-tokeny `prf:*` (PRILOHY) sú virtuálne recepty.
- `stravniciList()`, `baseDayKcal`, `pocetPorcii`, `mnozMult` — prepočet množstiev pre viacerých stravníkov s rôznymi kalóriami.
- **„%" faktor (`S.planF`, `rescaleDen`, `pf()`) existuje** — je to jemné dorovnanie dňa na cieľ, zovreté na **0,85–1,15**. Množstvá ním NEklesajú: `pocetPorciiDna` ním delí, takže domácnosť dostane vždy svoj kalorický dopyt, len rozdelený na viac menších porcií.
- Bloky (meal-prep): `S.hranice[7]`, `bloky()`, `blokDni()`; default A=Po-Ut, B=St-Št-Pi, C=So-Ne; varný deň = deň pred blokom.
- Generátor: `generujJedalnicek` → `vyberDoSlotu` (pool + kcal-okno `cielSlotu`/`poolVOkne`) → `zlozSlot` → `opravDen` (kcal → poradie jedál → bielkoviny, prehodením jedla) → `zlepsiBielkoviny` (hill-climb) → faktor. Váha receptu (`vahaReceptu`) je multiplikatívna v bielkovinách; pamäť medzi týždňami je `nedavneRecepty` (4 týždne, snacky 26).
- Špajza: `S.spajza`, expirácie, min. zásoby → nákup, `odpisRecept`.
- Nedeliteľné jednotky (ks/rožok/žemľa/plátok) sa zaokrúhľujú na celé.
- Jednotky → gramy: `gZaJednotku` (jediné miesto), `gramy` a `gramyNaJed` sú navzájom inverzné.
- Ceny: **jedna funkcia `cenaTyzdna(mode)`** — `"spotreba"` (domácnosť), `"balenia"` (celé balenia), `"osoba"`.

## Doménové pravidlá (batch cooking)
3 bloky/týždeň (A: Ne večer→Ut, B: Ut večer→Pi, C: Pi večer→Ne), 1 variant/slot/blok, bez opakovania naprieč blokmi, bez carryover C→A. 4 jedlá (raňajky/obed/snack/večera), poradie kcal obed>večera>raňajky>snack, obed≠večera, raňajky sendvič/wrap iná báza/blok. Cieľ ~1400–1450 kcal/os./deň. Pantry staples vždy do nákupu. RecipeTinEats obmedzene.

## Nápady na ďalší vývoj
Backlog a inšpirácia z 25 aplikácií: `INSPIRACIA.md`. Otvorené (treba backend/dáta): OCR bločkov, živé viac-reťazcové letáky, plné mikroživiny, komunitné zdieľanie, AI import z videa.

## Stav a otvorené veci
- Git je v poriadku (história od v1). Audit z 18. 8. 2026 (`AUDIT_KUCHARKA_2026-08-18.md`) je vyriešený celý — viď `CHANGELOG.md` v19.
- `data/app.js` má **~192 KB / 1600 riadkov**. Rozdelenie na moduly + spájanie v generátore je stále otvorené;
  pozor na poradie top-level `const`-ov (funkcie sú hoistnuté, konštanty nie).
- Fotky receptov: pole `foto` nemá nastavené ani jeden recept, `recepty/fotky/` je prázdny — v UI sú emoji.
- 45 receptov má postup na jeden krok (snacky, pečivo, kokteily — je to v poriadku)
  a 60 nemá `kuchyna` (snacky a prílohy, kde kuchyňa nedáva zmysel).
- `treska-v-cesticku` nemá `kcal_na_porciu`: počíta sa celých 300 ml oleja na vyprážanie.
  Rovnaká chyba (vsiaknutý vs. použitý olej) sa týka aj ďalších vyprážaných receptov.
