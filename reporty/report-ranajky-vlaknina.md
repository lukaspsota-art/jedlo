# RAŇAJKY-A-VLÁKNINA — report

Agent **RAŇAJKY-A-VLÁKNINA**, vetva `g2`, commit `e388922` (nad `b9a37f8`).
Zadanie: dve dátové medzery zo `ZAVER.md` — hrdlo raňajok (bod 2) a vláknina 18,5 g/deň (bod 3).
Obe riešené **receptami a číslami v databáze potravín**, do generátora ani do `data/app.js`
sa nezasahovalo.

Merané `node scripts/metriky.js 30` (seed 20260818, 210 dní) a tam, kde je jeden seed
priúzky, viacsemennými sondami v `scripts/qa/`.

---

## 1. Čo pribudlo

**205 nových receptov**, všetky s dohľadateľným `zdroj`, `kcal_zdroj: "vypocet"` a `foto: ""`.

| kategória | ks |
|---|---|
| Raňajky | 115 |
| Hlavné jedlo | 50 |
| Polievka | 14 |
| Šalát | 12 |
| Cestoviny | 8 |
| Príloha | 6 |
| **spolu** | **205** |

Zdroje sú v `scripts/`:
`data_vlna5_ranajky.js` (65) · `data_vlna5_ranajky2.js` (24) ·
`data_vlna5_vlaknina.js` (36) · `…2.js` (26) · `…3.js` (28) · `…4.js` (26).
Zapisuje ich **`node scripts/nove_recepty_vlna5.js`** — a to je aj kontrolór:

- `kcal_na_porciu` sa **nepíše ručne**, dopočíta sa zo surovín cez `test_harness` tou istou
  cestou ako `scripts/dopocitaj_kcal.js`. Deklarácia a suroviny tak nemôžu ísť od seba:
  **max odchýlka od dopočtu 0,00 %**, nad 15 % nula receptov.
- padne na nenapárovanej surovine, na surovine s 0 g, na porcii nad 700 g
  (**max 619 g/porcia**), na postupe pod 3 kroky, na kroku, ktorý nezačína rozkazovacím
  spôsobom 2. osoby jednotného čísla (uzavretý zoznam 80 slovies), a na chýbajúcich
  `tipy` / `tagy` / `hlavna_surovina`.
- raňajky navyše musia vyjsť na 230–430 kcal (cieľ slotu je 319).

Skript je idempotentný — druhý beh prepíše tie isté súbory, cudzí recept s rovnakým `id`
je chyba a nič sa nezapíše.

---

## 2. Problém 1 — raňajky

### Hrdlo pred a po

| | pred | po |
|---|---|---|
| pool Raňajky (po profile) | 331 | **443** |
| z toho sendvič/wrap (`jeSendvic`) | 41 | **135** |
| sendvičov v kcal-okne slotu (319 kcal, 0,6–1,45×) | 32 | **126** |
| sendvičov s ≥ 8 g bielkovín / 100 kcal | **0** | **18** (medián 4,2 → 5,3) |
| sendvičov s ≥ 2 g vlákniny / 100 kcal | 4 | **49** |
| raňajok s ≥ 8 g bielkovín / 100 kcal (celý pool) | 19 | **48** |

Merané `node scripts/qa/ranajky_pool.js` — tie isté riadky, aké meral
`report-generator-doladenie.md` §2.

### Rozloženie báz

`ranajkyBaza` pozná **päť sendvičových tried** (tortilla · bagel · bageta · toast · rožok).
Pita, kváskový, ražný a knäckebrot spadnú do triedy `toast`, žemľa a croissant do triedy
`rožok` — na tanieri sú to iné bázy, pre pravidlo „iná báza na blok" nie.

Sendvičové raňajky v kcal-okne slotu:

| trieda bázy | pred | po | pridané |
|---|---|---|---|
| toast (toast, hrianka, pita, ražný, kváskový, knäckebrot) | 15 | **37** | +22 |
| rožok (rožok, žemľa, croissant) | 6 | **24** | +18 |
| tortilla (wrap, burrito) | 6 | **24** | +18 |
| bageta (bageta, panini, ciabatta) | 5 | **23** | +18 |
| bagel | 0 | **18** | +18 |

Toast bol po prvej dávke na 37 zo 102 (36 %) — `report-generator-doladenie.md` §2 pritom
píše výslovne „toast nepridávať". Druhá dávka (`data_vlna5_ranajky2.js`, 24 receptov) je
preto **výhradne bagel, bageta, rožok/žemľa/croissant a tortilla**; toast je dnes na 29 %
a každá z piatich tried má aspoň 18 kandidátov.

**Nástraha pri písaní receptov:** `_ranajkyBazaVypocet` triedi podľa názvu + surovín +
**tagov** a poradie vzoriek je tortilla → bagel → bageta → toast → rožok. Tag `"sendvič"`
obsahuje reťazec `sendvic`, takže na recepte z rožka alebo žemle by ho preklopil do triedy
`toast`. Rožkové recepty preto nesú tag `"obložené pečivo"`, nie `"sendvič"`.

### Rozdelenie nových raňajok

sendvičových **94** zo 115 · nad 8 g bielkovín/100 kcal **32** · priemer **334 kcal** na porciu.
Nesendvičová zvyšná dvadsiatka sú tvarohové/skyrové/cottage misky, proteínové kaše,
vaječné muffiny a lievance — tie držia bielkovinové dno slotu.

### Výpis slotu Raňajky z 10 týždňov

`node scripts/qa/ranajky_10tyzdnov.js 10 20260818` — **10 po sebe idúcich týždňov**,
takže pamäť `nedavneRecepty` naozaj platí. Profil 2 stravníci × 1450 kcal.

| týž. | blok A (Po–Ut) | blok B (St–Pi) | blok C (So–Ne) |
|---|---|---|---|
| 1 | Zapekaný toast so šunkou, syrom a vajcom · toast · 285 kcal · 16 g B · 4,8 g vl | Celozrnná bageta s tuniakom a cibuľkou · bageta · 297 kcal · 29 g B · 6,0 g vl | Voňavé ovsené lievance s jablkami · palacinky · 280 kcal · 11 g B · 7,3 g vl |
| 2 | Celozrnná bageta s morčacou šunkou a rukolou · bageta · 269 kcal · 25 g B · 6,3 g vl | Ražný sendvič s tuniakom a kukuricou · toast · 327 kcal · 30 g B · 7,4 g vl | Celozrnná žemľa s tvarohom a kapustou · rožok · 327 kcal · 23 g B · 7,7 g vl |
| 3 | Celozrnný toast s kuracím mäsom a kapustou · toast · 380 kcal · 39 g B · 8,4 g vl | Grahamový rožok s tuniakom a uhorkou · rožok · 279 kcal · 28 g B · 4,3 g vl | Celozrnná bageta s tvarohom a zeleninou · bageta · 325 kcal · 24 g B · 7,6 g vl |
| 4 | Celozrnný bagel s morčacou šunkou a uhorkou · bagel · 324 kcal · 28 g B · 7,3 g vl | Pita s kuracím mäsom a šalátom · toast · 306 kcal · 30 g B · 5,5 g vl | Skyr s ovsenými otrubami a jablkom · kaša · 289 kcal · 30 g B · 6,8 g vl |
| 5 | Celozrnný bagel s tuniakovou nátierkou · bagel · 352 kcal · 32 g B · 6,3 g vl | Celozrnná žemľa s cottage syrom a uhorkou · rožok · 283 kcal · 20 g B · 5,1 g vl | Knäckebroty s cottage syrom a paradajkou · jogurt · 296 kcal · 18 g B · 8,0 g vl |
| 6 | Raňajková bageta s kuracím mäsom a avokádom · bageta · 364 kcal · 30 g B · 7,2 g vl | Rožok s vajíčkovou nátierkou · rožok · 278 kcal · 16 g B · 3,6 g vl | Tvaroh s ovsenými otrubami a uhorkou · kaša · 254 kcal · 28 g B · 5,0 g vl |
| 7 | Raňajková bageta s tvarohom a reďkovkou · bageta · 308 kcal · 25 g B · 5,3 g vl | Celozrnná pita s cottage syrom a zeleninou · toast · 325 kcal · 23 g B · 7,2 g vl | Tvarohové poháre s jablkom a mrkvou · vajcia · 221 kcal · 16 g B · 3,3 g vl |
| 8 | Celozrnný toast s tvarohom a reďkovkou · toast · 323 kcal · 26 g B · 5,3 g vl | Celozrnný wrap s tuniakom a fazuľou · tortilla · 398 kcal · 32 g B · 10,0 g vl | Knäckebroty s tvarohom a reďkovkou · jogurt · 273 kcal · 19 g B · 8,1 g vl |
| 9 | Ražný sendvič s tvarohom a mrkvou · toast · 328 kcal · 23 g B · 7,9 g vl | Celozrnná žemľa s morčacou šunkou a chrenom · rožok · 278 kcal · 24 g B · 4,2 g vl | Raňajkový wrap s morčacou šunkou a cviklou · tortilla · 316 kcal · 27 g B · 5,2 g vl |
| 10 | Celozrnný toast s cottage syrom a mrkvou · toast · 342 kcal · 24 g B · 8,3 g vl | Celozrnná bageta s vajíčkovou nátierkou · bageta · 332 kcal · 20 g B · 5,2 g vl | Tvaroh so šunkou a paprikou · jogurt · 296 kcal · 34 g B · 2,1 g vl |

```
slotov: 30 · unikátnych raňajok: 30 · najčastejšie: 1×
z toho VŠEDNÝCH slotov: 20 · unikátnych všedných raňajok: 20 · najčastejšia všedná: 1×
porušení pravidla „iná báza na blok": 0 · sendvič vo všednom bloku: 20/20
rozdelenie tried bázy: toast 8 · bageta 6 · rožok 5 · jogurt 3 · bagel 2 · kaša 2 · tortilla 2 · palacinky 1 · vajcia 1
```

**Raňajky sa prestali opakovať.** Predtým bolo za 30 týždňov 27 unikátnych všedných raňajok
zo 60 ťahov; dnes je 10 týždňov **30 slotov = 30 rôznych receptov** a všedné bloky majú
sendvič v 20 z 20 prípadov. Bielkoviny všedných raňajok sú 16–39 g na porciu, vláknina 3,6–10 g.

---

## 3. Problém 2 — vláknina

### Čo sa pridalo

90 receptov mimo raňajok, medián **14,0 g vlákniny na porciu**, 39 z nich má ≥ 3 g/100 kcal:

- **strukoviny** — šošovicové prívarky a polievky, fazuľové guláše a kotlíky, cícerové kari
  a šaláty, hrachová kaša, chilli sin carne;
- **celozrnné** — celozrnné cestoviny (8 receptov), bulgur, pohánka, quinoa, ryža natural,
  jačmenné krúpy;
- **zelenina** — kapusta a kyslá kapusta, kel, brokolica, mrkva a koreňová zelenina,
  cvikla, paštrnák;
- **prílohy** (6) a **polievky** (14) so strukovinami a koreňovou zeleninou.

### Poznámka k prílohám (dôležité pre ďalšie vlny)

Zadanie hovorí „prílohy sú dôležité, generátor ich pridáva k hlavným jedlám". **Nie je to tak.**
`SLOT_KATEGORIE` v `data/app.js:120` nepozná kategóriu `Príloha` v žiadnom slote; prílohu do
plánu dáva `prilohaPre` ako **virtuálny token `prf:*`** z natvrdo zapísanej tabuľky
`PRILOHY` (`data/app.js:1134`) — ryža, zemiaky, cestoviny, pečivo, šalát, kuracie prsia,
cottage. Recept kategórie `Príloha` sa teda do jedálnička nedostane a na vlákninu v pláne
nemá vplyv; je viditeľný len v katalógu receptov.
**Vláknina v pláne sa dá zdvihnúť len hlavnými chodmi, polievkami, šalátmi, cestovinami
a raňajkami** — a presne tam smeruje 199 z 205 nových receptov.
Ak má vláknina stúpnuť ešte ďalej, najlacnejší zásah je vymeniť `prf:ryza` / `prf:cestoviny`
za celozrnné varianty a `prf:pecivo` za ražné — to je ale zmena v `app.js`, mimo tohto zadania.

### Výsledok

| | pred | po |
|---|---|---|
| priemer vlákniny/deň, `metriky.js 30` | 18,5 g | **24,1 g** |
| medián vlákniny/deň, `metriky.js 30` | 18,4 g | **23,5 g** |
| priemer vlákniny/deň, 5 seedov × 20 týž. (700 dní) | 17,95 g | **24,36 g** |

Cieľ ≥ 24 g/deň je splnený na jednom seede aj na piatich.

---

## 4. Diery vo `vlaknina` (`data/potraviny.json`)

### Nulové hodnoty tam, kde nemajú byť

Po oprave je v rastlinných oddeleniach (Zelenina a ovocie, Cestoviny a ryža, Pečivo,
Orechy a semená, Trvanlivé a konzervy, Mrazené) **6 potravín s nulovou vlákninou a všetkých
šesť ju má nulovú právom**: `vývar` (73 použití), `zeleninový vývar` (66), `ančovič` (4),
`sardel` (3), `ančovičková pasta` (1), `zavináč` (1). **Žiadna skutočná diera nezostala.**

### Opravené hodnoty — 52 kľúčov

Vláknina 2,5 g bola v databáze **výplňový default**: niesol ju naraz bulgur, pohánka, quinoa,
ovsené vločky, jačmenné aj žitné vločky, celozrnné špagety a červená šošovica — teda presne
tie suroviny, ktoré majú vlákniny najviac. Druhý taký default bola hodnota **8,0 g** na
ľanových, sezamových aj slnečnicových semienkach a lieskových orechoch naraz, hoci sa
reálne líšia trojnásobne. V jedálničku to vyzeralo ako chýbajúca vláknina, hoci chýbalo
len číslo v databáze.

Najväčšie opravy (celý zoznam a zdôvodnenie sú v `scripts/doplnit_vlakninu_a_bazy.py`,
hodnoty na **suchú** surovinu, lebo `kcal` v databáze sú tiež na suchú, podľa USDA FDC):

| kľúč | bolo | je |
|---|---|---|
| `chia` | 8,0 | 34,0 |
| `ľanové semien` / `ľanov` / `ľanové semienko` | 8,0 | 27,3 |
| `žitné vločky` | 2,5 | 15,0 |
| `goji` (3 kľúče) | 2,0 | 13,0 |
| `bulgur` | 2,5 | 12,5 |
| `sezamové semien` / `sezam` / `sezamové` | 8,0 | 11,8 |
| `červená šošovica` | 2,5 | 10,8 |
| `šošovic` | 8 | 10,7 |
| `ovsené vloč`, `pohánk`, `jačmenné vločky` (7 kľúčov) | 2,5 | 10,0 |
| `figy` | 2,0 | 9,8 |
| `celozrnné špaget` | 2,5 | 9,0 |
| `jáhl` | 2,5 | 8,5 |
| `datle` / `datl`, `špaldov` | 2,0 / 2,5 | 8,0 |
| `sušené slivky` | 2,0 | 7,1 |
| `quinoa` (3 kľúče), `kukuričn` | 2,5 | 7,0 |
| `avokádo` | 2,0 | 6,7 |
| `malin` | 2,0 | 6,5 |
| `arašidové maslo`, `hummus`, `polenta` | 1,0 / 4 / 2,5 | 6,0 |
| `brusnice sušené` (2 kľúče), `černic` | 2,0 | 5,7 / 5,3 |
| `hrozien`, `rezance`/`penne`/`tarhoňa` | 2,0 / 2,5 | 3,7 / 3,2 |
| `hrušky`, `kiwi`, `baklažán`, `batát`, `hranolky`, `múka` | 1,0–2,5 | 2,7–3,1 |

`hrušky` boli 2,0 g, kým kľúč `hruška` v tej istej databáze mal 3,1 g — vnútorný rozpor,
nie len nepresnosť.

### Diery, ktoré ZOSTALI otvorené (nekritické, neopravené)

| kľúč | vláknina | očakávané | prečo som to nechal |
|---|---|---|---|
| `chia marmeláda` | 1,0 | ~3–5 | hotový výrobok, chia je v ňom len časť — reálnu hodnotu treba z etikety, nie z tabuliek |
| `zelená fazuľa` | 2,6 | 2,7 | v rozptyle tabuliek |
| `cukrový hrášok` | 2,0 | 2,6 | v rozptyle tabuliek |
| `lieskov` | 8,0 | 9,7 | 21 % rozdiel, v rozptyle tabuliek — zadanie hovorí „doplň len tie kritické" |
| `jablková šťava` | 0,2 | 0,2 | číslo je správne, zachytil ho len substringový audit na `jablk` |
| `jablkový ocot`, `tekvicový olej`, `sezamový olej` | 0 | 0 | správne, falošné zhody auditu |
| `skyr malinovy balenie`, `jemny tvaroh v kelimku balenie` | 0,6 / 0 | — | snackové výrobky — **patria inému agentovi**, nedotkol som sa ich |

### Nové potraviny (17)

Bázy pečiva a suroviny, ktoré sa nemali na čo napárovať:
`celozrnná bageta`, `celozrnná tortilla`, `grahamový rožok`, `celozrnný bagel`, `knäckebrot`,
`pita chlieb`, `celozrnná pita`, `kváskový chlieb`, `ražný chlieb`, `celozrnný toastový chlieb`,
`celozrnná žemľa`, `celozrnné cestoviny`, `ryža natural`, `ovsené otruby`, `paštrnák`,
`ružičkový kel`, `edamame`.

Vkladajú sa **na začiatok poľa** — `najdiPotravinu` rieši rovnako dlhé kľúče poradím v poli
a „Paštrnák" (8 znakov) sa dovtedy pároval na „pastrami" (tiež 8), teda mäso namiesto
koreňovej zeleniny.

---

## 5. Tabuľka metrík pred / po

`node scripts/metriky.js 30`, seed 20260818, 210 dní. „pred" je HEAD `b9a37f8` premeraný
nanovo v čistom klone — čísla v `ZAVER.md` sedia okrem ceny týždňa (137,22 € tam je z iného behu).

| metrika | pred (`b9a37f8`) | **po** | |
|---|---|---|---|
| dní v ±10 % cieľa pred škálovaním | 98,6 % | **100 %** | ▲ |
| dní v ±10 % cieľa po škálovaní | 100 % | **100 %** | = |
| dní potrebujúcich korekciu > 15 % | 0 % | **0 %** | = |
| jedál s faktorom > 150 % | 0 | **0** | = |
| faktor min / medián / max | 0,9 / 1 / 1,05 | **0,9 / 1 / 1,1** | = |
| medián bielkovín/deň | 118 g | **119 g** | ▲ |
| priemer bielkovín/deň | 118,2 g | **122 g** | ▲ |
| dní pod 80 g bielkovín | 1,4 % | **0 %** | ▲ |
| **priemer vlákniny/deň** | **18,5 g** | **24,1 g** | ▲ |
| medián vlákniny/deň | 18,4 g | **23,5 g** | ▲ |
| Obed ≥ Večera | 100 % | **100 %** | = |
| celé poradie O>V>R>S | 100 % | **100 %** | = |
| dní s večerou pod 250 kcal | 0 | **0** | = |
| 2× sacharid | 0 / 420 | **0 / 420** | = |
| položiek nákupu bez ceny | 0 / 64 | **0 / 58** | = |
| **unikátnych receptov (30 týž.)** | **306** | **332** | ▲ |
| unikátnych snackov | 102 | **106** | ▲ |
| **najčastejší snack (dní za 30 týž.)** | **6** | **12** | ▼ viď §6 |
| **susedné týždne so zopakovaným receptom** | **0 / 29** | **1 / 29** | ▼ viď §6 |
| receptov · potravín | 1995 · 1070 | **2200 · 1087** | |

Ceny sa merajú na jednom týždni, čo je pri 30-týždňovom behu lotéria (namerané 136–168 €
podľa toho, ktorý týždeň vyjde posledný). Priemer za 8 týždňov je stabilnejší:

| | pred | po |
|---|---|---|
| cena týždňa — spotreba domácnosti | 113,10 € | **108,79 €** ▲ |
| cena týždňa — celé balenia (Nákup) | 166,00 € | **151,10 €** ▲ |
| **nákup vs. plán** | 1,468× | **1,389×** ▲ |

Testy: **10/10 zelených**, `node --check data/app.js` prechádza,
`python3 generuj_kucharku.py` zbehne (2200 receptov · 1087 potravín),
`node test_regresie.js` → **12 kontrol sedí s očakávaním, 0 zmenilo stav**.

---

## 6. Regresia, ktorú som nevedel opraviť zvnútra svojho zadania

**Najčastejší snack stúpol zo 6 na 12 dní za 30 týždňov a susedné týždne majú 1 opakovanie
namiesto 0.** Nie je to šum jedného seedu — nameral som to na piatich
(`scripts/qa/` sonda, 30 týždňov na seed):

| | pred (`b9a37f8`) | po |
|---|---|---|
| najčastejší snack, priemer 5 seedov | **6,6×** | **9,0×** |
| susedné týždne s opakovaním, priemer 5 seedov | **0,2 / 29** | **1,0 / 29** |
| unikátnych snackov, priemer 5 seedov | 100,8 | **104,0** ▲ |

### Príčina — `snackDoplnok`, nie výber snacku

Opakujúci sa recept je vo **všetkých piatich seedoch snackový DOPLNOK**, nie primárny snack:

```
seed 20260818 · týždeň 23 vs 24: kup-tuniak-mini      [Snack d6] → [Snack d1]
seed 42       · týždeň 13 vs 14: kup-varene-vajce     [Snack d1] → [Snack d5]
seed 42       · týždeň 14 vs 15: kup-skyr-biely       [Snack d4] → [Snack d6]
seed 99       · týždeň 14 vs 15: kup-skyr-biely       [Snack d6] → [Snack d6]
seed 2026     · týždeň 16 vs 17: kup-sunka-morcacia   [Snack d1] → [Snack d6]
```

`kup-tuniak-mini` sa za 30 týždňov objaví 12×, **z toho 0× ako primárny snack a 12× ako
doplnok**. Overené inštrumentáciou:

- `_uplatniPamat` (`data/app.js:2031`) na snacky **vždy zaberie** — ani raz nevrátila `null`,
  takže cesta „pamäť vypadla, lebo vyprázdnila pool" to nie je;
- záložná vetva `ctx.bezPamate = true` v `opravDen` (`data/app.js:2385`) sa v celom behu
  **ani raz nespustila**;
- zostáva `snackDoplnok` (`data/app.js:1794`). Doplnok sa losuje z natvrdo zapísaného
  **21-položkového** `SNACK_DOPL_BIELKOVINA` (`:1744`) modulom z hashu výrobku.
  Cez `_genPamatSnack` sa síce filtrujú kusy z posledných 14 týždňov, ale doplnkov sa za
  30 týždňov ťahá ~60 a kandidátov je 21 — pamäť teda zoznam vyprázdni,
  `if(c.length) kand = c` sa preskočí a modulo dopadne stále na ten istý kus.
  Cez týždne sa doplnok dedupuje len cez `ctx.pouzite`, čo je **pamäť jedného týždňa**
  (`snackDoplnokPre`, `:1816`).

### Prečo som to neopravil

Zoznam `SNACK_DOPL_BIELKOVINA` je v `data/app.js`, na ktorý mám zákaz siahať, a rozšíriť
ho novými snackovými výrobkami nejde — je natvrdo vymenovaný, takže ani ~100 nových výrobkov
od agenta na snacky ho nepredĺži. **Jediná oprava je v `app.js`**: buď doplnok naozaj vyberať
z celého poolu (`_snackDoplKandidati` to už vie a pamäť rešpektuje — stačí ho použiť aj pre
nominálny doplnok, nielen pre náhradu), alebo v `snackDoplnokPre` použiť viacúrovňovú pamäť
`ctx.nedavneSnack` namiesto jednotýždňového `ctx.pouzite`.

### Prečo som napriek tomu commitol

- **`test_generator.js` A5 aj A6 prechádzajú** (3 seedy × 12 týždňov) — to je tvrdá brána
  a je zelená. Zhoršenie sa prejaví až na 30-týždňovom horizonte `metriky.js`.
- Metrika je **chaotická voči akejkoľvek zmene dát, nie monotónna v mojej**: overil som to
  bisekciou. Bez opravy potravín vyšla 7,2×, s ňou 9,0×; keď som skúšobne vrátil samotnú
  šošovicu, vyšla tiež 9,0× (a susedné týždne sa dokonca zhoršili na 1,4). Jedna zmena
  jedného čísla hýbe jedným seedom o 5 → 12. Vyberať „správne" hodnoty vlákniny podľa toho,
  ako dopadne táto metrika, by bolo ladenie na šum, nie inžinierstvo.
- Je to **presne bod 1 zo `ZAVER.md`** („najčastejší snack 6–7, cieľ 3"), teda otvorená vec
  agenta na snacky. Tento report mu dáva mechanizmus aj miesto v kóde.

---

## 7. Čo som NEurobil

- Nedotkol som sa `data/app.js`, `data/sablona.html`, dokumentácie ani žiadneho receptu
  s `"kategoria": "Snack"` (overené: v commite nie je ani jeden zmenený existujúci recept,
  všetkých 205 je nových).
- `SLOT_KATEGORIE`, `SLOT_PODIEL`, `PRILOHY`, `VLAKNINA_CIEL` ani pravidlá generátora
  zostali nezmenené.
- Fotky nových receptov sú prázdne (`foto: ""`) — v UI sa vykreslí emoji, ako pri zvyšku
  databázy.

## 8. Overenie

```
cd /home/claude/g2
python3 generuj_kucharku.py                      # 2200 receptov · 1087 potravín
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
 && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
 && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js   # 10/10
node test_regresie.js                            # 12 sedí, 0 zmenilo stav
node scripts/metriky.js 30                       # vláknina 24,1 g · unikátnych receptov 332

node scripts/qa/ranajky_pool.js                  # hrdlo raňajok v číslach
node scripts/qa/ranajky_10tyzdnov.js 10 20260818 # výpis slotu Raňajky
node scripts/nove_recepty_vlna5.js --dry         # kontrola všetkých 205 definícií
python3 scripts/doplnit_vlakninu_a_bazy.py --dry # idempotentné, hlási 0 zmien
```
