# STAV PO 1. VLNE — projekt Jedlo, 30. 8. 2026

Zlúčených 10 vetiev. Toto je nový východiskový stav pre 2. vlnu.

## Testy — všetko zelené (194 kontrol)
| test | pred | po |
|---|---|---|
| test_vypocty  | 31 ✅ | 31 ✅ |
| test_generator| **❌ padal na A2** | **16 ✅** |
| test_nakup    | 15 ✅ | 43 ✅ |
| test_ux       | 18 ✅ | 28 ✅ |
| test_prepocty · test_porcie | ✅ | ✅ |
| test_jednotky · test_parovanie · test_pravidla · test_odolnost | — | 14 · 19 · 23 · 20 ✅ (nové) |
| **test_regresie** | — | **7 padá zámerne** — zoznam otvorených chýb |

## Metriky (`node scripts/metriky.js 30`)
| metrika | baseline | po vlne 1 | cieľ |
|---|---|---|---|
| dní v ±10 % cieľa PRED škálovaním | 58,6 % | **91,9 %** ✅ | ≥ 85 % |
| medián bielkovín/deň | 97,9 g | **114,7 g** ✅ | ≥ 105 |
| dní pod 80 g bielkovín | 12,9 % | **2,9 %** ✅ | < 4 % |
| priemer vlákniny/deň | 11,1 g | **19,2 g** ✅ | ≥ 18 |
| položiek nákupu bez ceny | 6 / 69 | **0 / 83** ✅ | 0 |
| unikátnych receptov (30 týž.) | ~193 | **291** ⚠️ | ≥ 400 |
| DOM uzlov v mriežke | 29 063 | **1 996** ✅ | < 2 000 |
| render mriežky (mobil) | 468 ms | **84 ms** ✅ | < 150 ms |
| **celé poradie O>V>R>S** | 96,4 % | **90,5 %** ❌ | ≥ 96 % (REGRESIA) |
| **Obed ≥ Večera** | 100 % | **98,6 %** ❌ | 100 % (REGRESIA) |
| **cena týždňa** | 120,94 € | **220,47 €** ❓ | overiť |
| potravín v databáze | 576 | 882 | |

## Otvorené P1 (z `report-audit.md` a `test_regresie.js`)
1. **R1 — vyprážaný olej.** agent4 označil 10 receptov poľom `vsiaknutie`, ale **`_vyzivaVypocet` v `data/app.js` ho ešte nečíta**. Špecifikácia je v `report-data-kcal.md` §2.
2. **R2a — „ks" bez `g_za_ks`** dáva 0 g (napr. „Cestoviny 3 ks").
3. **R5a–d — poškodený `localStorage`** iného typu (číslo, boolean, reťazec, pole zlého typu) **zhodí Domov, Nákup aj generátor** (`TypeError: S.spajza.filter is not a function`). Normalizácia `S.spajza = S.spajza || []` pri nesprávnej pravdivej hodnote neopraví nič.
4. **Stored XSS** — meno stravníka (`app.js` `renderStravnici`) a názov uloženého jedálnička idú do `innerHTML` bez escapu. Obe polia sa synchronizujú cez Supabase.
5. **Build ticho vyrobí mŕtvu appku** — `skontroluj_recepty()` nekontroluje dáta na `</script>` ani na placeholdery (`__POTRAVINY__`); build skončí exit 0 a `kucharka.html` má syntaktickú chybu.
6. **`HOSTING.md` navádza na RLS `using (true)`** — ktokoľvek s anon kľúčom vie čítať aj prepísať dáta všetkých.
7. **Nákup vs. Plán sa rozchádzajú o 9,5 %** (najhorší týždeň +50 %). Dva zdroje pravdy: obrazovky veria `kcal_na_porciu`, nákup kupuje suroviny.
8. **42 receptov má vymyslené makrá** (napr. `hovadzi-steak-s-cesnakovym-maslom`: 500 g krkovice, `porcie: 1`, `kcal_na_porciu: 134`).
9. **Nákup v obchode:** položka sa dá odškrtnúť len zásahom do políčka 20×20 px, ťuknutie na riadok (361×38 px) otvorí info-okno.
10. `scripts/metriky.js` reportuje výživu a cenu z **jedného** (posledného) týždňa — čísla nie sú reprodukovateľné medzi N=20 a N=30.

## Ako overiť
```
cd <projekt>
node --check data/app.js
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
  && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
  && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js
node test_regresie.js          # zámerne padá — zoznam otvorených chýb
node scripts/metriky.js 30
python3 generuj_kucharku.py
./e2e/spusti.sh                # 356 kontrol v Chromiu
```
