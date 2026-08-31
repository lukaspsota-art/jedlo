# Posledné štyri veci — 31. 8. 2026

Projekt „Jedlo" je po štyroch vlnách hotový: 10/10 testovacích sád, 0 otvorených regresií,
celá E2E sada v prehliadači prechádza, appka je doručená a commitnutá (`d5ae259`).
Zostali **štyri veci, a všetky sú dátové medzery alebo dokumentácia**, nie chyby v kóde.

## Stav, ktorý sa nesmie zhoršiť (`node scripts/metriky.js 30`)
| metrika | teraz |
|---|---|
| dní v ±10 % cieľa pred škálovaním | 98,6 % |
| dní v ±10 % cieľa po škálovaní | 100 % |
| medián bielkovín/deň | 118 g |
| dní pod 80 g bielkovín | 1,4 % |
| priemer vlákniny/deň | **18,5 g** ← treba zdvihnúť |
| celé poradie O>V>R>S | 100 % |
| dní potrebujúcich korekciu > 15 % | 0 % |
| unikátnych receptov (30 týž.) | 306 |
| unikátnych snackov | 102 |
| **najčastejší snack (počet za 30 týž.)** | **6–7** ← treba znížiť na ≤ 3 |
| nákup vs. plán | 1,15× |
| cena týždňa (2 osoby) | 137,22 € |
| receptov · potravín · fotiek | 1995 · 1070 · 113 |

## Štyri otvorené veci
1. **Najčastejší snack sa objaví 6–7× za 30 týždňov**, cieľ 3×. Nie je to chyba výberu:
   210 snackových dní by si vyžiadalo pamäť ~70 ťahov, ale `_uplatniPamat` nesmie vyprázdniť
   pool (40 % prah). Riešenie je väčší katalóg — odhad ~100 ďalších výrobkov.
2. **Raňajky sú najužšie hrdlo generátora.** Sendvičových raňajok je 40, z toho 32 sa vojde
   do kcal-okna a **ani jedna** nemá nad 8 g bielkovín na 100 kcal. Pravidlo „vo všedný blok
   sendvič/wrap, iná báza na blok" má tak k dispozícii príliš málo. Návrh z reportu:
   +40 wrap/rožok/bageta, +20 vysokobielkovinových raňajok.
3. **Vláknina 18,5 g/deň** proti odporúčaným 25–30. Predtým to vyzeralo na 22,9 g, ale to číslo
   ťahal jeden recept s kilogramom chleba na porciu; po oprave množstiev je vidieť skutočnosť.
4. **Dokumentácia je pozadu.** `report-mobil-tlac.md` má na konci pripravené nové invarianty
   pre `CLAUDE.md` (skomprimované dáta a `_rozbal`, pravidlo „placeholder práve raz aj
   v komentári", rozdelenie tlačidiel v tlači). `NAVOD.md`, `CHANGELOG.md` a `PRODUCT.md`
   nezodpovedajú tomu, čo appka po štyroch vlnách naozaj robí.

## Pravidlá, ktoré platia stále
- **Snack = hotový kúpený výrobok** z Kauflandu. Nič, čo sa varí, mixuje alebo váži.
  Jedno balenie alebo kus = jedna porcia, výživa reálna **na balenie**, nie na 100 g.
  Formát: `ingrediencie` jedna položka, `postup` jeden krok („Otvor a zjedz."), `cas: "1 min"`,
  `zdroj: "Kaufland"`, tagy `kúpené` a `bez prípravy`. Každý výrobok potrebuje záznam
  v `data/potraviny.json` s reálnou slovenskou cenou 2026.
- **Doménové pravidlá batch cookingu**: 3 bloky/týždeň, 1 variant na slot a blok, bez opakovania
  VARENÉHO receptu naprieč blokmi, bez carryover C→A, poradie kcal obed>večera>raňajky>snack,
  obed≠večera, raňajky sendvič/wrap iná báza na blok. Snack sa nevarí — na neho sa
  „1 variant na blok" nevzťahuje, losuje sa na každý deň.
- `app.js` nesmie obsahovať literál `</script>`; farby v `app.js` len ako tokeny, nikdy hex.
- Appka je **offline single-file** — žiadne CDN, žiadny framework, fonty ako base64.

## Overenie
```
python3 generuj_kucharku.py && node --check data/app.js && python3 scripts/kontrast_bloky.py
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
 && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
 && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js
node test_regresie.js        # musí zostať 0 otvorených
node scripts/metriky.js 30
./e2e/spusti.sh
```
