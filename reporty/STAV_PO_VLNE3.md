# STAV PO 3. VLNE — 31. 8. 2026, 05:15

Zlúčených 9 vetiev vlny 3. Doručené na disk používateľa, commit `8a53cd1`.

## Testy — 10/10 zelených, 257 pomenovaných kontrol (bolo 194)
test_vypocty 35 · test_generator 16 · test_nakup 65 · test_ux 44 · test_pravidla 44 ·
test_odolnost 20 · test_parovanie 19 · test_jednotky 14 · test_prepocty ✓ · test_porcie ✓

**test_regresie: z 8 otvorených chýb zostáva 1** (bolo 8).

## Metriky (`node scripts/metriky.js 30`)
| metrika | baseline | po vlne 1 | **po vlne 3** |
|---|---|---|---|
| dní v ±10 % PRED škálovaním | 58,6 % | 91,9 % | **98,6 %** |
| dní v ±10 % po škálovaní | 98,6 % | 97,1 % | **100 %** |
| medián bielkovín/deň | 97,9 g | 114,7 g | **114,2 g** |
| **dní pod 80 g bielkovín** | 12,9 % | 2,9 % | **5,2 %** ⚠️ zhoršenie |
| priemer vlákniny/deň | 11,1 g | 19,2 g | **20,8 g** |
| celé poradie O>V>R>S | 96,4 % | 90,5 % | **100 %** |
| dní potrebujúcich korekciu > 15 % | 3,6 % | 5,2 % | **0 %** |
| položiek nákupu bez ceny | 6 / 69 | 0 / 83 | **0 / 59** |
| cena týždňa | 120,94 € | 220,47 € | **155,91 €** |
| **unikátnych receptov (30 týž.)** | 266 | 299 | **257** ⚠️ |
| **unikátnych snackov** | 90 | 90 | **53** ⚠️ |
| **najčastejší snack (počet)** | 3 | 3 | **6** ⚠️ |
| receptov v databáze | 1956 | 1956 | **1899** |
| potravín | 576 | 882 | **972** |
| fotiek receptov | 0 | 0 | **113** (53 sa vojde do rozpočtu buildu) |

## Čo je hotové
- **Snacky sú hotové kúpené výrobky.** Overené vygenerovaním týždňa: „Proteínový mliečny nápoj
  jahodový (fľaša 250 ml)", „Cottage cheese s paradajkami (vanička 150 g)", „Morčacia šunka
  plátky (balenie 100 g)". Žiadny snack sa nevarí ani neváži. Kokteily a nápoje sa do plánu
  nedostanú vôbec.
- Bezpečnosť: normalizácia stavu podľa typov (appka sa nedá zložiť poškodeným `localStorage`),
  escapovanie používateľských dát, build padne pri `</script>` alebo placeholderi v dátach
  a sám overí syntax vygenerovaného JS.
- Nákup: celý riadok je dotykový cieľ, info má vlastné tlačidlo 44 px, poradie oddelení
  nastaviteľné, koreniny a „podľa chuti" v zbalenej sekcii.
- Kalórie: `vsiaknutie` oleja pri vyprážaní sa uplatňuje na kcal a makrá, cena zostáva na plnom
  množstve; nákup priznáva rozdiel voči plánu.
- Rozpočet ako kritérium generátora (cenový strop na €/100 kcal).
- Fotky: 113 stiahnutých s licenciami, inline `data:` URI v rozpočte 2,5 MB.
- PWA: dokument stale-while-revalidate, hlásenie o novej verzii, opravený manifest.

## Čo zostáva otvorené
1. **R6 padá** — pravidlo z CLAUDE.md „raňajky sendvič/wrap iná báza/blok": dnes 2 z 3 blokov
   dostanú toast.
2. **Dní pod 80 g bielkovín 5,2 %** (po vlne 1 bolo 0 %). Súvisí s menšími snackmi.
3. **Pestrosť klesla**: 257 unikátnych receptov (bolo 299), snackov 53 (bolo 90),
   najčastejší snack 6× za 30 týždňov (bolo 3×). Katalóg snackov je menší.
4. **Nový dizajn nie je nasadený.** V `dizajn/` sú dve hotové koncepcie s prototypmi
   a screenshotmi; appka stále beží na téme Organic (terakota + krém).
5. `CLAUDE.md` je zastaraná — hovorí o 1956 receptoch, padajúcom A2 a nulových fotkách.

## Ako overiť
```
python3 generuj_kucharku.py
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
 && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
 && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js
node test_regresie.js        # zámerne padá — zoznam otvorených chýb
node scripts/metriky.js 30
./e2e/spusti.sh
```
