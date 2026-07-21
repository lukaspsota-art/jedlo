# Dizajn — Dávka 3: Vylepšenia receptov a nákupu

Dátum: 2026-07-21
Projekt: Jedlo (offline SK kuchárka + meal-prep plánovač), stav po v16
Súbory: `data/app.js`, `data/sablona.html` (build → `kucharka.html` cez `generuj_kucharku.py`)

## Kontext a cieľ

Po Dávke 2 (generátor: porcie/maska/filtre) rieši Dávka 3 objaviteľnosť a orientáciu v receptoch.
Používateľ vybral 3 funkcie (poradie oddelení v nákupe zámerne vynechané — YAGNI):

1. **Health indikátor** na recepte — rýchly signál kvality + podiel na dennom cieli.
2. **Auto-kolekcie** — fixná sada predfiltrovaných zbierok receptov.
3. **Vylepšiť položka→recept** — v existujúcom `surovinaInfo` ukázať aj množstvo suroviny na recept.

Všetko sa počíta z už existujúcich dát/funkcií (`vyzivaReceptu`, `kcalPorcia`, `casMin`, `cenaPorcia`,
`jeSezonne`, `S.fav`). Žiadny nový perzistentný stav, žiadne nové závislosti.

## A) Health indikátor (skóre + krúžok)

**Výpočet (nové funkcie):**
- `healthScore(r)` → `{ p100:number, farba:"green"|"amber"|"red" }`, kde `p100` = gramy bielkovín na 100 kcal
  = `v.b / (v.kcal/100)` z `vyzivaReceptu(r)` (0 ak `v.kcal<=5`).
  Prahy (laditeľné konštanty): `HS_HI=10` (≥ → green), `HS_LO=5` (≥ → amber, inak red).
- `podielCiela(r)` → `kcalPorcia(r) / (S.profil.kcal||1)` orezané na [0,1] (podiel jednej porcie na dennom cieli).

**Zobrazenie:**
- **Karta** (`kartaHTML`): len malá farebná **bodka** (green/amber/red) ako rýchly signál — bez čísel, aby karta ostala čistá. Title/tooltip = „proteín X g/100 kcal".
- **Detail receptu** (`otvor`): plný indikátor — číselné skóre `💪 X g/100 kcal` (farebné) + **krúžok** s `% denného cieľa` (napr. „◐ 28 % denného cieľa") + 1 veta vysvetlenia. Krúžok = jednoduchý inline SVG/CSS conic-gradient.

**Bez perzistencie** — všetko derived.

## B) Auto-kolekcie (fixná sada)

**Definícia (nová konštanta):**
```
KOLEKCIE = [
  { id:"rychle",   nazov:"Do 20 min",      ikona:"⏱", test:r=>casMin(r)<=20 },
  { id:"protein",  nazov:"Vysoký proteín", ikona:"💪", test:r=>healthScore(r).farba==="green" },
  { id:"sezonne",  nazov:"Sezónne teraz",  ikona:"🌿", test:r=>jeSezonne(r) },
  { id:"lacne",    nazov:"Lacné (<1,5 €)", ikona:"💶", test:r=>{const c=cenaPorcia(r); return c>0 && c<1.5;} },
  { id:"oblubene", nazov:"Obľúbené",       ikona:"★",  test:r=>!!S.fav[r.id] },
]
```

**UI a správanie:**
- Nový riadok dlaždíc nad chip-mi kategórií v pohľade *Recepty* (`renderKolekcie()`).
- Prechodný stav `aktivnaKolekcia` (string id alebo `""`), analógia k `aktivnaKat`.
- Klik na dlaždicu → nastaví `aktivnaKolekcia`, zvýrazní ju, `renderGrid()`. Klik na aktívnu = zruší.
- `renderGrid` v reťazci filtrov pridá: ak `aktivnaKolekcia`, `if(!KOLEKCIE.find(k=>k.id===aktivnaKolekcia).test(r)) return false;`.
- Kombinuje sa s existujúcimi filtrami (kategória, kuchyňa, čas, diéta, hľadanie) — kolekcia je ďalší AND filter.
- `aktivnaKat` a `aktivnaKolekcia` sú nezávislé; „Všetko" v kategóriách nemení kolekciu a naopak.

**Bez perzistencie** — `aktivnaKolekcia` je runtime premenná (ako `aktivnaKat`).

## C) Vylepšiť položka→recept

V `surovinaInfo(nazov)` pri každom vypísanom recepte doplniť **množstvo danej suroviny v ňom**:
- Nájsť v recepte ingredienciu, ktorá matchuje (rovnaká logika ako v surovinaInfo: `bezDia` includes),
  a zobraziť jej surové `mnozstvo + jednotka` (ak `mnozstvo==null` → jej `poznamka`/„podľa chuti").
- Formát: `<názov receptu> — <množstvo>` (surové recepturné množstvo, neprepočítané na porcie plánu — jednoduché a jednoznačné).

## UI / CSS

- `data/sablona.html`: trieda pre farebnú bodku `.hdot` (3 varianty farby), štýl riadka kolekcií `.kolekcie`
  a aktívnej dlaždice, a jednoduchý krúžok `.ring` (conic-gradient) pre detail.

## Testovanie (Playwright `browser_evaluate`, ako v Dávke 2)

- `healthScore`: recept s vysokým proteínom → `farba==="green"`, dezert → `"red"`; `p100` číselne sedí.
- `podielCiela`: porcia ~ polovica cieľa → ~0.5.
- Kolekcie: každá `test` vráti neprázdny podzoznam a len zodpovedajúce recepty (napr. „rychle" → všetky `casMin<=20`).
- `renderGrid` s `aktivnaKolekcia="protein"` + `aktivnaKat` + hľadanie súčasne → nespadne, zúži správne.
- `surovinaInfo`: HTML obsahuje množstvo pri aspoň jednom recepte.
- Karta: `kartaHTML` obsahuje `.hdot` so správnou triedou farby.

## Hranice rozsahu (YAGNI)

- Bez nastaviteľného poradia oddelení v nákupe.
- Bez vlastných/ručných kolekcií (len fixná sada).
- Bez mikroživín/nutri-score kompozitu — skóre je len proteín/100 kcal.
- Žiadny nový perzistentný stav (žiadny dopad na sync/účty z v16+).

## Odhad práce

Malá dávka: 2 helpery + zobrazenie na karte/detaile (A), 1 konštanta + riadok dlaždíc + 1 filter v `renderGrid` (B),
drobnosť v `surovinaInfo` (C), + trocha CSS. Všetko v `data/app.js` + `data/sablona.html`. Po zmenách `py generuj_kucharku.py`.
