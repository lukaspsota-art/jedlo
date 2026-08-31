# BASELINE — projekt Jedlo, 30. 8. 2026

Namerané pred zásahom agentov. Toto sú čísla, ktoré musíme zlepšiť, nie zhoršiť.

## Testy (node, celá sada)
| test | stav |
|---|---|
| test_vypocty.js  | ✅ 31 kontrol |
| test_generator.js| ❌ **PADÁ na A2** — medián bielkovín 94,4 g/deň, test chce ≥ 95 |
| test_nakup.js    | ✅ 15 kontrol |
| test_ux.js       | ✅ 18 kontrol |
| test_prepocty.js | ✅ |
| test_porcie.js   | ✅ |

## Metriky (`node scripts/metriky.js 20`, 20 týždňov = 140 dní, 2 stravníci × 1450 kcal)
| metrika | hodnota | poznámka |
|---|---|---|
| priemer kcal/deň (po škálovaní) | 1436 | OK |
| priemer kcal/deň (bez škálovania) | 1475 | |
| dní v ±10 % cieľa PRED škálovaním | **58,6 %** | slabé — generátor sa spolieha na faktor |
| dní v ±10 % cieľa po škálovaní | 98,6 % | |
| medián bielkovín/deň | **97,9 g** | hraničné |
| dní pod 80 g bielkovín | **12,9 %** | slabé |
| priemer vlákniny/deň | **11,1 g** | veľmi málo (odporúčanie 25–30 g) |
| priemer sodíka/deň | 1391 mg | OK |
| cena týždňa | 120,94 € | |
| položiek nákupu bez ceny | **6 / 69** | |
| Obed ≥ Večera | 100 % | OK |
| celé poradie O>V>R>S | 96,4 % | OK |
| dní potrebujúcich korekciu > 15 % | 3,6 % | OK |
| faktor min/medián/max | 0,85 / 0,9 / 1,1 | často na spodnom doraze |
| medián kcal R/O/V/S | 298 / 547 / 392 / 189 | |
| unikátnych receptov za 20 týždňov | 193 | z 1956 — využíva sa 10 % databázy |
| susedné týždne so zopakovaným receptom | 0 / 19 | OK |

## Otvorené veci z CLAUDE.md
- **P1 prístupnosť:** karty receptov a bunky plánu sú `<div onclick>` — nedosiahnuteľné klávesnicou
- **Výkon:** mriežka renderuje všetkých 1956 receptov naraz (~19 000 uzlov)
- `data/app.js` má ~192 KB / 1996 riadkov — monolit
- Fotky: pole `foto` nemá nastavené ani jeden recept, `recepty/fotky/` je prázdny
- 60 receptov nemá `kuchyna`, 45 má postup na jeden krok
- Vyprážané recepty rátajú celý olej, nie vsiaknutý (`treska-v-cesticku` nemá `kcal_na_porciu`)

## Ako sa overuje
```
node --check data/app.js
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js && node test_prepocty.js && node test_porcie.js
node scripts/metriky.js 30
node scripts/kontrola_parovania.js
py generuj_kucharku.py   # v kontajneri: python3
```
