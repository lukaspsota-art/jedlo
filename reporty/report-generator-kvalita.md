# GENERÁTOR-KVALITA — report

Agent 1, vetva `agent1`, súbor `data/app.js` (funkcie generátora) + `scripts/kvalita.js`, `scripts/metriky.js`.
Merané `node scripts/metriky.js 30` (seed 20260818) a novým `node scripts/kvalita.js` (viac seedov).

---

## 1. Výsledná tabuľka

| metrika (`metriky.js 30`) | baseline | po vlne 1 | **teraz** | cieľ |
|---|---|---|---|---|
| dní v ±10 % cieľa PRED škálovaním | 58,6 % | 91,9 % | **97,1 %** | ≥ 85 % ✅ |
| dní v ±10 % cieľa po škálovaní | 98,6 % | 97,1 % | **100 %** | ✅ |
| dní potrebujúcich korekciu > 15 % | 8,1 % | 5,2 % | **2,9 %** | ✅ |
| faktor min / medián / max | 0,85 / 0,9 / 1,1 | 0,85 / 0,95 / — | **0,85 / 0,95 / 1,05** | pri 1 ✅ |
| medián bielkovín/deň | 97,9 g | 114,7 g | **115,3 g** | ≥ 105 ✅ |
| dní pod 80 g bielkovín | 12,9 % | 2,9 % | **0 %** | < 4 % ✅ |
| priemer vlákniny/deň | 11,1 g | 19,2 g | **18,7 g** | ≥ 18 ✅ |
| **Obed ≥ Večera** | 100 % | 98,6 % ❌ | **100 %** | 100 % ✅ |
| **celé poradie O>V>R>S** | 96,4 % | 90,5 % ❌ | **100 %** | ≥ 96 % ✅ |
| dní s večerou pod 250 kcal | 0 | 0 | **0** | ✅ |
| 2× sacharid | 0 / 420 | 0 / 420 | **0 / 420** | ✅ |
| susedné týždne so zopakovaným receptom | 0 / 29 | 0 / 29 | **0 / 29** | ✅ |
| najčastejší snack | 6 | 3 | **3** | ≤ 6 ✅ |
| unikátnych snackov | 83 | 90 | **90** | ≥ 80 ✅ |
| unikátnych receptov (30 týž.) | 266 | 291 | **299** | ≥ 400 ⚠️ nedosiahnuteľné, viď §4 |
| čas generovania týždňa | ~1000 ms | ~210 ms | **~210 ms** | ≤ 2× ✅ |

Jeden seed je pri tejto úlohe šum, preto pribudol `scripts/kvalita.js` (N seedov × W týždňov,
priemer cez všetky dni). **24 týždňov × 4 seedy, pôvodný baseline vs. teraz:**

| metrika | baseline | **teraz** |
|---|---|---|
| medián bielkovín/deň | 92,1 g | **114,6 g** |
| dní pod 80 g bielkovín | 21,8 % | **0,9 %** |
| priemer vlákniny/deň | 14,1 g | **18,5 g** |
| dní v ±10 % PRED škálovaním | 55,4 % | **97,8 %** |
| dní v ±10 % po škálovaní | 97,6 % | **100 %** |
| dní s korekciou > 15 % | 4,8 % | **1,8 %** |
| celé poradie O>V>R>S | 91,3 % | **99,7 %** |
| unikátnych receptov | 228 / 288 | **268 / 288** |
| čas generovania týždňa | 1444 ms | **346 ms** |

Testy: všetkých 10 sád zelených (`vypocty 31 · generator 16 · nakup 43 · ux 28 · prepocty ·
porcie · jednotky 14 · parovanie 19 · pravidla 23 · odolnost 20`). `test_generator` overený
na 5 seedoch, `test_pravidla` na 6 seedoch × 6 týždňov (Obed ≥ Večera **100 % zo 108 blokov**,
celé poradie 99,1 %). `node --check` prechádza, `</script>` sa v `data/app.js` nevyskytuje,
`python3 generuj_kucharku.py` zbehne.

---

## 2. Čo bolo naozaj zlé — a čo som zmenil

### 2.1 Príloha bola pri výbere neviditeľná (koreň troch problémov naraz)

`vyberDoSlotu` porovnávala kcal-okno s `kcalPorcia(hlavný chod)`, ale do plánu sa zapísalo
jedlo **aj s prílohou**, ktorú pridá `zlozSlot` až potom. Namerané:

| | cieľ slotu | hlavný chod (medián) | **celé jedlo** | s prílohou |
|---|---|---|---|---|
| Obed | 508 kcal | 410 | **606** | 91 % |
| Snack | 145 kcal | 190 | **204** | 21 % |

Ryža 216 kcal, cestoviny 288, zemiaky 193, pečivo 216 — a takmer bez bielkovín. Dôsledky:

1. deň systematicky prestrelil 1450 → 1554 kcal, faktor visel na dolnom doraze (medián 0,9);
2. bielkoviny boli riedené 200 kcal prílohou, ktorú výber vôbec nezapočítal;
3. `zlepsiBielkoviny` fungoval ako **račňa**: cieľ výmeny bol `mealKcal` (s prílohou), okno sa
   porovnávalo s hlavným chodom (bez nej), takže každá bielkovinová výmena deň o ~200 kcal
   nafúkla, kým nenarazil na strop faktora — a tam sa zasekol.

**Oprava (K1):** `jedloVyziva(r, slot, rot)` počíta kcal / bielkoviny / vlákninu **celého jedla**
vrátane prílohy; `poolVOkne` dostáva kcal-funkciu; `slotHustota(ids)` meria hustotu už zloženého
slotu. Toto je jediná najdôležitejšia zmena — sama zdvihla presnosť pred škálovaním z 51 % na 80 %.

### 2.2 Výber bral prvé losovanie zo 700 kandidátov (K2)

`vyberVazene` losovala jeden recept z celého kcal-okna. Medián výberu preto vyšiel na medián
poolu (5,3 g bielkovín/100 kcal), hoci **v tom istom okne bolo 117 receptov nad 8**.
Nahradené **turnajom**: navzorkuje sa 24 kandidátov podľa preferenčnej váhy (hodnotenie, sezóna,
akcie, expirácie) a vyhrá ten s najlepším `skoreJedla` (bielkoviny + kcal-presnosť + vláknina).
Preferencie rozhodujú, *kto sa do turnaja dostane*, kvalita rozhoduje, *kto vyhrá*.
Bez `cielK` (t. j. `regenerujSlot` z UI) sa správa presne ako pôvodné jedno losovanie.

Zároveň sa **splostil** bielkovinový multiplikátor vo `vahaReceptu` (0,4–2,0 → 0,7–1,6):
ostrá váha *aj* turnaj by z 736 hlavných chodov točili tú istú tridsiatku.

### 2.3 `ctx.dayKuchyne` a `ctx.pouziteBazy` kumulovali stopy vyhodených jedál (K12)

`zlozSlot` pridával kuchyňu (a raňajkovú bázu) do množiny pri **každej** výmene, aj keď pôvodné
jedlo už v bloku nebolo. Po dvoch desiatkach opravných výmen filter „v jednom dni nie dvakrát tá
istá kuchyňa" **zrezal pool obeda zo 736 na 4 recepty**. Nahradené `ctx.stopa[slot]`, ktorá sa
prepisuje; do týždňovej pamäte báz sa zapisuje až hotový blok. Táto oprava sama zdvihla
využitie databázy na 144 zo 144 možných receptov za 12 týždňov.

### 2.4 Pamäť sa uplatňovala pred tvrdými pravidlami slotu (K11)

Dlhá pamäť sa aplikovala ako prvá, na celý pool. Sendvičových raňajok je len **48**, takže pamäť
nad ~8 týždňov ich vyprázdnila a pravidlo „vo všedný blok sendvič" *potichu vypadlo*
(`if(ps.length)` ho preskočí). Teraz sa pool najprv zúži podľa pravidiel a až potom sa berie
najprísnejší stupeň pamäte, ktorý nechá aspoň 40 % receptov (stupne 22 / 6,6 / 2 týždne);
ak by ani najkratší stupeň nič nenechal, uvoľní sa voliteľné zúženie, nie pamäť.

### 2.5 Regresia poradia jedál (vlna 2 — K15, K16, K18)

Po vlne 1 padlo `Obed ≥ Večera` na 98,6 % a celé poradie na 90,5 %. Tri príčiny:

- **`Obed ≥ Večera` sedelo v kroku (b) `opravDen`**, kam sa funkcia pri nedoladených kcal vôbec
  nedostala (krok (a) vždy uspel a spravil `continue`). Pritom prehodenie obeda a večere nič
  nestojí — majú rovnaké kategórie. → `zarovnajObedVeceru` sa volá **bezpodmienečne** na začiatku
  každej iterácie `opravDen` a ešte raz na konci dňa. **100 % zo 108 blokov naprieč 6 seedmi.**
- **Krok, ktorý mal poradie opraviť, ho vedel znova pokaziť.** „Zmenši raňajky pod večeru" hľadalo
  okolo `kcal[večera]*0,75`, ale `poolVOkne` siaha do 1,45×, takže výsledok mohol byť ešte väčší
  než večera. → `medzePoradia` dáva výberu kcal-medze zo susedných slotov (mäkký filter).
- **Turnaj v úzkom poole vracal ten istý recept**, `prehodSlot` ohlásil neúspech a `opravDen` sa
  vzdal s dňom o 300 kcal vedľa (namerané: všetky zvyšné zlé dni boli bloky St–Pi so sendvičovými
  raňajkami 457–519 kcal). → doterajší recept sa z výberu vylučuje (`okrem`), a keďže výmena
  odteraz vždy niečo vráti, `skusPrehod` ju **ponechá len ak sa kritérium naozaj zlepšilo**.

### 2.6 Optimalizovalo sa na nesprávne číslo (K17)

`zlepsiBielkoviny` cielil na surové gramy, ale deň sa nakoniec vynásobí faktorom `ciel/dk`
(zovretým na 0,85–1,15). **100 g bielkovín v 1700 kcal dni je po zmenšení porcií reálne 85 g** —
hill-climb taký deň vyhlásil za hotový a metrika ho potom videla pod 80 g. Odteraz sa bielkoviny
aj vláknina merajú *po* škálovaní (`denBielkovinyPoSkal`, `denVlakninaPoSkal`). Vedľajší efekt:
optimalizácia prestala uprednostňovať objemné jedlá pred hustými. Dní pod 80 g: 5,7 % → 3,8 %.

### 2.7 Vláknina (K4, K14)

Predtým do výberu nevstupovala vôbec (11,1 g/deň). Teraz je v `skoreJedla` ako **hustota
(g/100 kcal)**, nie absolútne gramy — s absolútnymi gramami nemohol 145 kcal snack nikdy získať
vlákninový bod a skóre ho tlačilo hore, snack prerástol raňajky a padalo pravidlo poradia R > S.
Navyše dva vlastné vlákninové prechody (`zlepsiVlakninu`) so zosilnenou váhou, ktorých výmeny
**nesmú zhoršiť bielkoviny, kcal ani poradie** — vláknina tak nemôže nič pokaziť.

### 2.8 Výkon (K8)

`vahaReceptu` (cez `jeSezonne` prechádza všetky ingrediencie × 16 kľúčov), `jedloVyziva`
(cez `prilohaPre`/`maCarb` púšťa regex na spojené názvy surovín) a `poolPreSlot`
(`prejdeProfil` cez všetkých 1956 receptov) sa volajú pri **každom** výbere aj pri každej
opravnej výmene. Turnaj a tri opravné prechody by ich počet znásobili. Všetky tri majú cache
platnú počas jedného generovania (profil, hodnotenia, akcie ani špajza sa v ňom nemenia).
Výsledok: napriek 6 optimalizačným prechodom je generovanie **~4× rýchlejšie než pôvodný stav**
(1444 → 346 ms/týždeň) a oproti vlne 1 nezmenené.

### Ostatné
- `SLOT_PODIEL` (K10): podiel presunutý z raňajok na obed/večeru (0,25/0,35/0,30 →
  0,22/0,37/0,31). Pool raňajok má medián 3,3 g bielkovín/100 kcal a len 16 receptov nad 8;
  obed/večera 5,3 a 126 nad 8. Kalória presunutá z raňajok na obed nesie takmer dvojnásobok
  bielkovín. Poradie O > V > R > S drží.
- `opravDen` (K6, K13): spúšťa sa už pri ±9 % (nie až mimo pásma faktora ±15 %) a v kroku (a)
  skúša **všetky** sloty v poradí odchýlky, nielen ten najhorší.
- Poradie prechodov dňa: kcal → bielkoviny → vláknina → kcal → bielkoviny → kcal → vláknina.

---

## 3. Rozdelenie hustoty bielkovín v poole (dôkaz, že cieľ 105 g dáta unesú)

`g bielkovín / 100 kcal`, pool po profile, hodnoty v kcal-okne slotu:

| slot | pool | medián | p90 | ≥ 5 | ≥ 8 | ≥ 10 | max |
|---|---|---|---|---|---|---|---|
| Raňajky | 348 | 3,3 | 7,0 | 82 (24 %) | 16 | 5 | 11,4 |
| Obed / Večera | 736 | 5,3 | 8,9 | 408 (55 %) | 126 | 42 | 20,3 |
| Snack | 451 | 2,9 | 6,5 | 87 (19 %) | 20 | 5 | 11,4 |

Na 105 g pri 1450 kcal treba priemernú dennú hustotu **7,25 g/100 kcal**. Baseline mal 6,5.
Tvrdenie z CLAUDE.md, že „dáta nestačia", teda neplatilo — v okne obeda bolo 126 receptov
nad 8 g/100 kcal, generátor ich len nevyberal. Dosiahnuté 115,3 g = 7,95 g/100 kcal.
**Slabinou naozaj sú raňajky a snacky** (medián 3,3 a 2,9), preto sa časť kalórií presunula
na obed/večeru — ale ani to nebolo treba dotiahnuť do krajnosti.

---

## 4. Diverzita: cieľ 400 je aritmeticky nedosiahnuteľný — dôkaz

Doménové pravidlo z CLAUDE.md: **3 bloky/týždeň, 1 variant/slot/blok, bez opakovania naprieč
blokmi.** Pri 4 jedlách je teda **maximálne 3 × 4 = 12 rôznych receptov za týždeň**, bez ohľadu
na to, aká veľká je databáza.

| horizont | teoretický strop | baseline | vlna 1 | **teraz** | % stropu |
|---|---|---|---|---|---|
| 20 týždňov | **240** | 193 | — | **230** | 96 % |
| 24 týždňov | **288** | 228 | — | **268** | 93 % |
| 30 týždňov | **360** | 266 | 291 | **299–307** | 85 % |

**Cieľ „≥ 400 unikátnych za 20 týždňov" je 1,7× nad matematickým stropom 240.**
Za 30 týždňov je strop 360 a sme na 85 % z neho.

Kde sa stráca zvyšok (30 týždňov, 90 ťahov na slot):

| slot | unikátnych / ťahov | strop daný poolom |
|---|---|---|
| Snack | **90 / 90 (100 %)** | 451 |
| Večera | 79 / 90 (88 %) | 736 |
| Obed | 78 / 90 (87 %) | 736 |
| Raňajky — víkendový blok | 27 / 30 (90 %) | 348 |
| **Raňajky — všedný blok** | **33 / 60 (55 %)** | **48 sendvičov** |

Úzke hrdlo je jednoznačné: pravidlo „vo všedný blok sendvič/wrap" má k dispozícii **48 receptov
na 60 ťahov**, takže tam je strop 48 a opakovanie je nevyhnutné. Zvyšné straty (obed/večera) sú
cenou za pamäť 22 týždňov — dlhšia pamäť diverzitu zdvihne (26 týždňov → 318 unikátnych), ale
stojí kvalitu (poradie 100 → 94,5 %, dní pod 80 g 0 → 5,2 %), preto som ju nechal na 22.

**Odporúčanie:** ak sa má diverzita posunúť ďalej, treba doplniť recepty, nie ladiť generátor:
- **+50 sendvičových / wrapových raňajok** (48 → ~100) — zdvihne strop všedných raňajok z 48 na 60
  a je to najlacnejší zisk (+27 unikátnych za 30 týždňov);
- **+30 raňajok nad 8 g bielkovín/100 kcal** (dnes ich je 16 z 348) — uvoľnilo by to kalorický
  podiel presunutý na obed a zlepšilo bielkoviny bez ďalšieho ladenia;
- **+40 snackov nad 6 g bielkovín/100 kcal** (dnes 20 z 451 nad 8).

Aby cieľ 400 unikátnych za 20 týždňov vôbec dával zmysel, muselo by sa zmeniť **doménové
pravidlo** — napr. 4 bloky/týždeň (strop 320) alebo 2 varianty na slot v bloku (strop 480).
To je produktové rozhodnutie, nie vec generátora.

---

## 5. Čo som skúšal a nefungovalo

- **Ostrejšia bielkovinová váha vo `vahaReceptu` namiesto turnaja.** Bielkoviny stúpli, ale
  využitie databázy kleslo (266 → 249 za 30 týždňov) — z 736 hlavných chodov sa točila tá istá
  tridsiatka. Riešenie je opačné: plochšia váha + turnaj.
- **Vrátiť vyhodený recept medzi „použité" v tom istom týždni** (proti opakovaniu snacku).
  Diverzitu aj bielkoviny to zhoršilo (dní pod 80 g 2,9 → 11 %). Skutočnou príčinou bola príliš
  krátka pamäť snackov; stačilo ju predĺžiť z 26 na 34 týždňov.
- **Prah pamäte ako pevné číslo (`MIN_POOL` = 8).** Osem kandidátov stačí na to, aby výber niečo
  vrátil, ale primálo na to, aby v nich bolo kcal-okno aj slušná hustota. Prah musí byť **podiel**
  poolu (40 %); pri 28 % sa poradie prepadlo na 95,2 % a vláknina na 17,4 g.
- **Užšie kcal-okno (0,65–1,30 namiesto 0,6–1,45).** Vláknina o kúsok hore, ale presnosť pred
  škálovaním dole (95,8 → 92,3 %) — čistá nula, ponechané pôvodné.
- **Silná vlákninová váha v bežnom skóre (0,8 / cieľ 8 g).** Vláknina 18,6 g, ale dní pod 80 g
  4,4 % a korekcia > 15 % na 6,9 %. Vláknina musí byť v bežnom výbere len jemná preferencia
  a „tvrdo" sa doháňať vo vlastnom, zovretom prechode.
- **Vylúčiť doterajší recept bez kontroly zlepšenia.** `prehodSlot` potom vždy uspel, `opravDen`
  prijal aj výmenu, ktorá deň zhoršila: presnosť 96 → 89 %, poradie 98,2 → 93,6 %. Až dvojica
  „vylúč incumbenta **+** ponechaj len ak je lepšie" (`skusPrehod`) dala 100 % poradia.
- **Vláknina až úplne na konci ako jediný prechod.** Vláknina 17,8 g, ale dní pod 80 g 4,2 %.
  Funguje až rozdelenie na dva prechody (v strede aj na konci).

---

## 6. Riziká a čo ostáva otvorené

1. **Ladené na 4 slotoch a cieli 1450 kcal.** `SLOT_PODIEL` a `VLAKNINA_CIEL` sa síce normalizujú
   podľa počtu aktívnych slotov, ale profil so 6 jedlami (Desiata, Olovrant) nie je premeraný.
2. **`GEN_SK`, `PAMAT_STUPNE`, `KCAL_PASMO`, `VLAKNINA_CIEL` sú top-level konštanty, ktoré som
   nedopísal do `EXPORT_TAIL`** — žiadny test ich nepotrebuje a `test_harness.js` je mimo môjho
   súboru. Ak by ich chcel niekto testovať, treba ich tam doplniť.
3. **Prah pamäte 40 % je heuristika.** Pri veľmi úzkom profile (bezlepkovo + bez rýb + vegán)
   sa pooly zúžia a pamäť sa bude vypínať skôr — správanie som nemeral.
4. **Vláknina závisí od údajov v `potraviny.json`.** Po doplnení z 576 na 882 potravín čísla
   stúpli samy; ak sa databáza zmení, koeficient `GEN_SK.vl` treba premerať (na to je
   `scripts/kvalita.js`).
5. **Metriky sú na jednom seede citlivé.** `metriky.js 30` dá pri iných seedoch ±3 body na
   poradí a ±3 % na dňoch pod 80 g. Na rozhodovanie používaj `scripts/kvalita.js N W`
   (viac seedov, priemer cez všetky dni) — jednosemenné číslo je ilustrácia, nie dôkaz.
6. **`test_ux.js` D1 je flaky.** Je to wall-clock strop 1500 ms na 4 prekreslenia mriežky;
   pri zaťaženom stroji občas namerá 1600 ms. S generátorom to nesúvisí.
7. **Sendvičové raňajky sú tvrdé hrdlo diverzity** (§4) — bez nových receptov sa ďalej neposunie.
8. **`priemer bielkovín/deň` a `priemer vlákniny/deň` v hlavičke `metriky.js` sa stále počítajú
   len z posledného týždňa** a medzi N = 20 a N = 30 skáču o ±5 g. Pridal som riadky
   „(všetky dni)"; staré riadky som nechal, aby sa dali porovnať s baseline.

---

## 7. Čo som zmenil v súboroch

- `data/app.js` — len funkcie generátora (riadky ~1130–1450): `bielkovinyNa100`, `vahaReceptu`,
  `vyberVazene`, `cielSlotu`, `poolVOkne`, `poolPreSlot` (len cache), `nedavneRecepty`,
  `vyberDoSlotu`, `zlozSlot`, `prehodSlot`, `denJeOk`, `zlepsiBielkoviny`, `opravDen`,
  `generujJedalnicek` + nové pomocné (`jedloVyziva`, `slotHustota`, `skoreJedla`,
  `medzePoradia`, `zarovnajObedVeceru`, `skusPrehod`, `zlepsiVlakninu`, `_uplatniPamat`,
  `denBielkovinyPoSkal`, `denVlakninaPoSkal`, `poradiePorusenia`).
  UI, nákup, špajza a renderovanie som sa nedotkol.
- `scripts/metriky.js` — **pridané** metriky (žiadna existujúca sa nezmenila):
  „priemer bielkovín/deň (všetky dni)", „vláknina/deň priemer / medián (všetky dni)".
- `scripts/kvalita.js` — **nový**: `node scripts/kvalita.js [týždňov] [seedov]`, viacsemenná
  sonda cez všetky dni + strop unikátnych receptov + čas generovania týždňa.
