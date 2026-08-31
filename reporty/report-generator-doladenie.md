# GENERÁTOR-DOLADENIE — report

Agent **GENERÁTOR-DOLADENIE**, vetva `e2`, commit `ae6edf9`.
Zadanie: tri čísla, ktoré po vlne 3 nesedeli — **R6 (raňajková báza)**, **dní pod 80 g bielkovín**
a **pestrosť**. Merané `node scripts/metriky.js 30` (seed 20260818) a `node scripts/kvalita.js 24 4`
(viacsemenná sonda cez všetky dni; jednosemenné číslo má ±3 body šumu).

---

## 1. Výsledná tabuľka

### `node scripts/metriky.js 30` — jeden seed, 210 dní

| metrika | baseline | po vlne 1 | po vlne 3 | **po doladení** | |
|---|---|---|---|---|---|
| dní v ±10 % PRED škálovaním | 58,6 % | 91,9 % | 98,6 % | **100 %** | ▲ |
| dní v ±10 % po škálovaní | 98,6 % | 97,1 % | 100 % | **100 %** | = |
| dní potrebujúcich korekciu > 15 % | 3,6 % | 5,2 % | 0 % | **0 %** | = |
| faktor min / medián / max | — | — | 0,85 / 1 / 1,15 | **0,9 / 1 / 1,1** | ▲ |
| medián bielkovín/deň | 97,9 g | 114,7 g | 114,2 g | **116,9 g** | ▲ |
| priemer bielkovín/deň (všetky dni) | — | — | 115,7 g | **119,9 g** | ▲ |
| **dní pod 80 g bielkovín** | 12,9 % | 2,9 % | **5,2 %** ⚠️ | **0 %** | ▲ |
| priemer vlákniny/deň (všetky dni) | 11,1 g | 19,2 g | 20,8 g | **22,9 g** | ▲ |
| medián vlákniny/deň | — | — | 16,3 g | **19,7 g** | ▲ |
| Obed ≥ Večera | 100 % | 98,6 % | 100 % | **100 %** | = |
| celé poradie O>V>R>S | 96,4 % | 90,5 % | 100 % | **100 %** | = |
| dní s večerou pod 250 kcal | 0 | 0 | 0 | **0** | = |
| 2× sacharid | 0 / 420 | 0 / 420 | 0 / 420 | **0 / 420** | = |
| susedné týždne so zopakovaným receptom | 0 / 29 | 0 / 29 | 0 / 29 | **0 / 29** | = |
| položiek nákupu bez ceny | 6 / 69 | 0 / 83 | 0 / 59 | **0 / 56** | = |
| cena týždňa (Nákup) | 120,94 € | 220,47 € | 155,91 € | **137,22 €** | ▲ |
| **unikátnych receptov (30 týž.)** | 266 | 299 | **257** ⚠️ | **285** | ▲ |
| **unikátnych snackov** | 90 | 90 | **53** ⚠️ | **83** | ▲ |
| **najčastejší snack (dní)** | 3 | 3 | **6** ⚠️ | **6** | = |
| receptov v databáze | 1956 | 1956 | 1899 | **1961** (+63 výrobkov) | |
| potravín | 576 | 882 | 972 | **1036** | |

`najčastejší snack` počíta **dni**, nie ťahy: blok St–Pi je 3 dni. Hodnota 6 = jeden výrobok
sa za 30 týždňov (90 ťahov) dostal do plánu **dvakrát**, ostatných 81 raz. Distribúcia sa teda
zásadne zlepšila (53 → 83 unikátnych), maximum ostalo rovnaké. Nižšie sa to už dostať nedá:
pri pamäti 26 týždňov a horizonte 30 sa výrobok z týždňa 1 smie vrátiť v týždni 27.

### `node scripts/kvalita.js 24 4` — 4 seedy × 24 týždňov, 672 dní

| metrika | po vlne 3 | **po doladení** | |
|---|---|---|---|
| medián bielkovín/deň | 115,0 g | **118,2 g** | ▲ |
| **dní pod 80 g bielkovín** | 6,1 % | **1,3 %** | ▲ |
| priemer vlákniny/deň | 21,7 g | **22,5 g** | ▲ |
| medián vlákniny/deň | 17,2 g | **18,0 g** | ▲ |
| dní v ±10 % PRED škálovaním | 97,6 % | **98,7 %** | ▲ |
| dní v ±10 % po škálovaní | 100 % | **100 %** | = |
| dní s korekciou > 15 % | 0 % | **0 %** | = |
| celé poradie O>V>R>S | 99,6 % | **100 %** | ▲ |
| dní s večerou pod 250 kcal | 0 | **0** | = |
| unikátnych receptov (strop 288) | 238,5 | **262,8** | ▲ |
| unikátnych snackov (z 72 ťahov) | 47 | **72 = 100 %** | ▲ |
| najčastejší snack | 6,5 | **3** | ▲ |
| susedné týždne s opakovaním | 0 | **0** | = |
| **čas generovania týždňa** | 446,6 ms | **303,6 ms** | ▲ |

Doménové pravidlá (nové sondy, 8 seedov × 12 týždňov = 96 týždňov):
**raňajková báza sa neopakuje 96/96**, **sendvič vo všedný blok 192/192**.

Testy: **10/10 zelených**, `test_pravidla` 44 → **47 kontrol**.
`test_regresie`: **R6 prepnuté na PREJDE**, spolu 11 z 12 kontrol sedí (viď §6).
`node --check data/app.js` prechádza, `</script>` sa v `data/app.js` nevyskytuje,
`python3 generuj_kucharku.py` zbehne (1961 receptov · 1036 potravín).

---

## 2. R6 — ako sa pravidlo vynútilo

### Čo bolo naozaj zlé

`test_regresie.js` tvrdil, že R6 je „citlivá na dáta, nie na kód" a že jej výsledok je lotéria.
**Nebola to pravda.** Pravidlo `!ctx.pouziteBazy.has(ranajkyBaza(r))` sa vo `vyberDoSlotu`
uplatňuje pri každom výbere aj pri každej opravnej výmene. Chyba bola inde:

`prehodSlot` zapisuje stopu slotu (`ctx.stopa[slot] = {kuchyna, baza, maso}`) cez `zlozSlot`
**hneď pri výmene**. Ale štyri prechody dňa vracali **zamietnutú** výmenu len v `denPlan`
a `ctx.pouzite` — `ctx.stopa` v nich zostala od receptu, ktorý v bloku už nie je:

```js
ctx.pouzite.delete(denPlan[naj][0]); denPlan[naj]=zaloha; ctx.pouzite.add(stary);  // stopa ostala!
```
(`skusPrehod`, `zlepsiBielkoviny`, `zlepsiVlakninu`, `zlacniDen` — štyrikrát ten istý vzorec.)

Hotová stopa bloku sa na konci `skupiny.forEach` sype do týždňovej `pouziteBazy`. Blok A si teda
zaregistroval bázu **zamietnutého kandidáta**. Doslovný výpis inštrumentovaného behu (seed 2, w1):

```
VYBER bazy=[]        -> toast/kuraci-sendvic-domaci-crispy      ← blok A si nechal TOTO
VYBER bazy=[]        -> bageta/bageta-udena-sunka-gouda         ← zamietnutá výmena…
VYBER bazy=[bageta]  -> toast/sendvic-croque-monsieur           ← …ale blok B vylúčil BAGETU
```
Blok A podával toast, do pamäte zapísal „bageta", blok B vylúčil bagetu a vybral toast.
**4 z 12 týždňov** malo dva bloky s rovnakou bázou.

### Oprava (D1)

1. **`vratSlot(denPlan,slot,ctx,zaloha)`** — jedno miesto, ktoré vracia slot: `denPlan`,
   `ctx.pouzite` **aj `ctx.stopa`** (prepočítanú z pôvodného receptu cez nové `_stopaPre`).
   Nasadená vo všetkých štyroch prechodoch namiesto ručného vracania.
2. **`_pravidlaRanajok(pool,ctx)`** — pravidlo raňajok (sendvič vo všedný blok → iná báza)
   ako jedna funkcia, ktorá sa uplatňuje aj na **zálohu poolu** `sirsi`. Tou sa obchádza pamäť,
   keď zúžený pool vyprázdni; predtým sa cez ňu prepašovala aj rovnaká báza do druhého bloku.
   Uvoľniť sa smie len *voliteľné* zúženie (kuchyňa dňa, mäso za sebou), nie doménové pravidlo.

Výsledok: **0 porušení z 96 týždňov** (8 seedov × 12 týždňov), a ako vedľajší efekt aj
**192/192 všedných blokov so sendvičom** (predtým 4 z 160 blokov sendvič nemalo).

### Kde je hrdlo aj po oprave — čísla

Pravidlo je vynútené, ale **pestrosť všedných raňajok je stále limitovaná dátami**:

| | dnes |
|---|---|
| pool Raňajky (po profile) | 324 |
| z toho sendvič/wrap (`jeSendvic`) | **40** (bolo 48 — vlna 3 recepty ubrala) |
| sendvičov v kcal-okne slotu (319 kcal, 0,6–1,45×) | **32** |
| rozdelenie báz v okne | toast 15 · rožok 6 · tortilla 6 · bageta 5 |
| sendvičov s ≥ 8 g bielkovín / 100 kcal | **0** (medián 3,7) |
| ťahov na všedné raňajky za 30 týždňov | 60 |
| unikátnych všedných raňajok za 30 týždňov | 27 / 60 |

**Návrh na doplnenie receptov** (nie generátora — ten je na doraze):

- **+40 sendvičových/wrapových raňajok** v pásme 250–400 kcal, s dôrazom na **tortillu, rožok
  a bagetu** (dnes 6/6/5 v okne). Zdvihne strop všedných raňajok z 32 na ~70, čiže z 27 unikátnych
  za 30 týždňov na ~50. Toast nepridávať — tých je 15 a už dnes dominuje.
- **+20 sendvičových raňajok nad 8 g bielkovín/100 kcal** (dnes **nula**): tvarohová nátierka
  na tmavom pečive, wrap s tuniakom/cottage, sendvič s vareným vajcom a šunkou.
  Toto je posledné veľké výživové hrdlo — kalorický podiel raňajok je kvôli nemu stlačený
  na 0,22 dňa (`SLOT_PODIEL`) a bez neho sa vrátiť nedá.
- Bázu **bagel** má dnes **1 recept** — buď doplniť 5–8, alebo ju z `ranajkyBaza` zlúčiť s rožkom.

---

## 3. Bielkoviny späť pod kontrolu — bez návratu varených snackov

### Príčina zhoršenia nebola v tom, že snacky sú menšie

Diagnostika 19 dní pod 80 g (4 seedy × 18 týždňov) ukázala, že chýbajúce gramy nie sú
rozdelené rovnomerne — a hlavne, že **generátor sa k bielkovinovým výrobkom vôbec nedostal**:

```
pool Snack po vlne 3: 71 zo 90 výrobkov     medián hustoty 3,5 g bielkovín/100 kcal
```

Chýbajúcich 19 výrobkov vyhodil **`_cenovyStrop`** — mäkký strop na luxus, ktorý meria
€/100 kcal. Snack je ale hotový výrobok s **60–150 kcal**, takže mu €/100 kcal vyjde vysoké aj
pri úplne bežnej cene. Zoznam vyhodených hovorí sám za seba:

```
skyr biely 1,11 €/100 kcal · skyr vanilkový 1,03 · skyr jahodový 1,06 · skyr čokoládový 1,00
proteínový jogurt 1,00 · proteínový nápoj čoko 1,25 / jahoda 1,45 / vanilka 1,45
šunka kuracia 1,18 · šunka morčacia 1,33 · šunka výberová 1,25 · tuniak 1,10
sušené hovädzie 2,20 · kurací wrap 0,97       (strop bol 3,0 × 0,29 = 0,87)
```

Vyhodilo teda **presne tie výrobky, kvôli ktorým slot existuje** — skyr, proteínové nápoje,
všetky tri šunky, tuniak. 88 kcal skyr za 0,98 € je pritom v absolútnych číslach lacný snack.

### Oprava (D2)

V **snackovom slote** sa strop meria **na porcii**, nie na 100 kcal:

```
strop = max( rozpočet slotu (podiel na dni, ~0,42 €),  medián ceny porcie v katalógu ) × CENA_LUX
```

Mediánová poistka je tam preto, že rozpočet 0,42 €/porcia je na hotové balené výrobky nereálny
(medián katalógu je ~1,0 €) a sám by vyhodil aj obyčajnú šunku. Takto je zo stropu **detektor
outlierov v rámci katalógu**, nie nástroj na škrtanie bielkovín. Údený losos za 2,60 €/porcia
ním stále neprejde. Týždenný rozpočet naďalej stráži `zlacniDen` a cenová pokuta v `skoreJedla`,
ktoré vidia celý deň — nie tento predfilter.

Efekt sám o sebe (bez nových výrobkov, 4 seedy × 24 týždňov):

| | pred | po |
|---|---|---|
| pool Snack | 71 z 90 | **86 z 90** |
| výrobkov s ≥ 8 g bielkovín/100 kcal v poole | 16 | **29** |
| dní pod 80 g bielkovín | 6,1 % | **1,6 %** |
| medián bielkovín/deň | 115,0 g | **116,6 g** |

Zvyšok dorobil rozšírený katalóg (§4) — spolu **1,3 % dní pod 80 g** a **118,2 g medián**
(jeden seed: **0 %** a 116,9 g).

### Čo sa NEurobilo
Varené snacky sa nevrátili, `SLOT_KATEGORIE` ani `jeVyrobok` sa nedotkli, `SLOT_PODIEL` zostal
nezmenený. Dôkaz vygenerovaním 10 týždňov je v §5.

### Vláknina ako vedľajší efekt (D3)
Bielkovinové mliečne výrobky majú nulovú vlákninu, takže po D2 klesol medián vlákniny
z 17,2 na 16,5 g. Riešenie: **`zlepsiVlakninu` smie minúť bielkoviny NAD denným cieľom.**
Predtým nesmela výmena zhoršiť bielkoviny o viac než 1 g bez ohľadu na to, či deň má 95 alebo
125 g. Odteraz je podlahou denný cieľ (109 g pri 1450 kcal); pod ním platí pôvodné „nesmie
klesnúť". Vláknina: 21,2 → **22,5 g** priemer a 16,5 → **18,0 g** medián, bez straty bielkovín.

---

## 4. Pestrosť — katalóg aj pamäť, obe

Rozhodnutie: **oboje**, lebo jedno bez druhého nefunguje. Pamäť snackov sa nedá predĺžiť nad
katalóg — `_uplatniPamat` prijme stupeň pamäte, len ak v poole nechá aspoň 40 % receptov.
Pri 90 výrobkoch (pool 71) pamäť 26 týždňov vyprázdnila pool a ticho spadla na ~8 týždňov.

**a) 63 nových hotových balených výrobkov** (`recepty/kup-*.json` + 63 potravín v `potraviny.json`).
Pravidlo dodržané doslova: kategória `Snack`, `typ:"vyrobok"`, **jedna ingrediencia `1 ks`**,
**jeden krok postupu** („Otvor balenie a zjedz."), reálna výživa na balenie, cena €/100 g,
zdroj Kaufland. Nič sa nevaria ani neváži.

| skupina | ks | príklady |
|---|---|---|
| mliečne bielkovinové | 23 | skyr 5 príchutí, pitný skyr, proteínový jogurt ×3, proteínový tvaroh, proteínové pudingy ×2, proteínové nápoje ×3, grécky jogurt 0 %, cottage light/uhorka/bylinky, jemný tvaroh |
| syry | 9 | gouda, ementál, eidam 30 %, oštiepok, feta, tavené plátky, mini camembert, nesolené korbáčiky, mozzarella guľôčky |
| mäso a ryby | 10 | dusená šunka, údené kuracie prsia, sušené kuracie mäso, kabanos, údený losos, makrela, sardinky v paradajke, tuniakový šalát, krabie tyčinky, údené tofu |
| tyčinky a chrumkavé | 8 | proteínová tyčinka orechová, proteínové chipsy, pražený cícer, arašidové maslo vo vrecku, špaldové chlebíčky, hummus s cviklou |
| orechy a sušené | 6 | para orechy, slnečnicové semienka, orechovo-brusnicová zmes, figy, sušené mango, jablkové chipsy |
| ovocie a zelenina | 10 | nektárinka, broskyňa, slivky, maliny, nakrájaný ananás a melón, mini uhorky, reďkovky, zeleninový mix |

Balenia sú volené tak, aby čo najviac výrobkov padlo do **kcal-okna slotu** (87–210 kcal pri cieli
145): orechy 30–40 g, sušené ovocie 50–60 g, nie 100 g vrecká. Pool Snack **71 → 152**,
z toho **84 výrobkov s ≥ 5 g** a **62 s ≥ 8 g bielkovín/100 kcal** (bolo 27 / 16).

**b) `TYZDNE_PAMATE_SNACK` 14 → 26 týždňov.** Namerané po rozšírení katalógu:

| pamäť | unikátnych snackov / 72 ťahov | najčastejší | dní pod 80 g |
|---|---|---|---|
| 14 (dnešok) | 52,5 | 6 | 1,2 % |
| 20 | 64,7 | 6,3 | 1,6 % |
| **26** | **72 (100 %)** | **3** | **1,3 %** |
| 30 | 72 | 3 | 1,3 % (pamäť sa už neuplatní, spadne o stupeň) |

Nad 26 sa nič nedeje — dlhšia pamäť už neprejde cez 40 % prah, takže 26 je maximum, ktoré dáta
unesú. `TYZDNE_PAMATE` (hlavné jedlá) som nechal na 22; unikátnych receptov to aj tak zdvihlo
z 238,5 na 262,8 z teoretického stropu 288 (**91 %**), lebo pestrejšie snacky uvoľnili opravné
prechody, ktoré predtým míňali pokusy na výmenu snacku.

---

## 5. Dôkaz: slot Snack z 10 týždňov

`node scripts/…` ekvivalent: jeden profil (2 stravníci × 1450 kcal), **10 po sebe idúcich
týždňov** (pamäť teda platí), seed 20260818, 3 bloky = 30 slotov.
✅ = `typ:"vyrobok"` + kategória `Snack` + presne 1 ingrediencia + presne 1 krok postupu.

| týž. | blok A (Po–Ut) | blok B (St–Pi) | blok C (So–Ne) |
|---|---|---|---|
| 1 | ✅ Celozrnný chlieb (2 plátky, 70 g) · 168 kcal · 6 g B · 0,21 € | ✅ Proteínový puding vanilkový (kelímok 200 g) · 146 kcal · 20 g B · 1,20 € | ✅ Ražný chrumkavý chlieb (3 ks, 30 g) · 99 kcal · 3 g B · 0,18 € |
| 2 | ✅ Proteínový puding čokoládový (kelímok 200 g) · 150 kcal · 20 g B · 1,30 € | ✅ Proteínový tvaroh vanilkový (kelímok 200 g) · 156 kcal · 24 g B · 1,24 € | ✅ Proteínový nápoj čokoládový (fľaša 330 ml) · 198 kcal · 24,1 g B · 2,48 € |
| 3 | ✅ Proteínová tyčinka orechová (tyčinka 55 g) · 192 kcal · 18,1 g B · 1,21 € | ✅ Proteínový jogurt lesné ovocie (kelímok 200 g) · 124 kcal · 20 g B · 1,10 € | ✅ Proteínový puding karamelový (kelímok 200 g) · 148 kcal · 20 g B · 1,20 € |
| 4 | ✅ Cottage cheese natural (vanička 180 g) · 176 kcal · 22,4 g B · 1,26 € | ✅ Skyr malinový (kelímok 140 g) · 95 kcal · 13,8 g B · 1,01 € | ✅ Cottage cheese s paradajkami (vanička 150 g) · 142 kcal · 16,4 g B · 1,08 € |
| 5 | ✅ Pražený cícer solený (balenie 40 g) · 168 kcal · 8 g B · 0,60 € | ✅ Cottage cheese s uhorkou (vanička 150 g) · 141 kcal · 16,5 g B · 1,08 € | ✅ Tuniak vo vlastnej šťave (konzerva 185 g) · 145 kcal · 34,8 g B · 1,60 € |
| 6 | ✅ Tekvicové semienka (vrecko 30 g) · 168 kcal · 8,7 g B · 0,45 € | ✅ Skyr kokosový (kelímok 140 g) · 106 kcal · 13,1 g B · 1,03 € | ✅ Grahamový rožok (1 ks, 60 g) · 156 kcal · 5,4 g B · 0,21 € |
| 7 | ✅ Paprika (2 ks, 300 g) · 93 kcal · 3 g B · 1,35 € | ✅ Tvaroh odtučnený (balenie 250 g) · 180 kcal · 40 g B · 1,25 € | ✅ Pitný skyr natural (fľaša 250 ml) · 140 kcal · 22,5 g B · 1,25 € |
| 8 | ✅ Cottage cheese s bylinkami (vanička 150 g) · 146 kcal · 16,6 g B · 1,08 € | ✅ Skyr čučoriedkový (kelímok 140 g) · 95 kcal · 13,7 g B · 1,01 € | ✅ Sušené kuracie mäso (balenie 40 g) · 116 kcal · 22 g B · 1,12 € |
| 9 | ✅ Skyr čokoládový (kelímok 140 g) · 101 kcal · 13,3 g B · 1,01 € | ✅ Skyr jahodový (kelímok 140 g) · 95 kcal · 13,7 g B · 1,01 € | ✅ Banán (1 ks, 120 g) · 107 kcal · 1,3 g B · 0,22 € |
| 10 | ✅ Maliny (balenie 125 g) · 65 kcal · 1,5 g B · 1,63 € | ✅ Proteínový mliečny nápoj banánový (fľaša 250 ml) · 120 kcal · 20 g B · 1,25 € | ✅ Proteínový jogurt biely (kelímok 200 g) · 120 kcal · 20 g B · 1,20 € |

**30 slotov · 0 nevýrobkov · 30 unikátnych výrobkov · najčastejší 1×.**

Kontrola na 10 RÔZNYCH seedoch (každý týždeň iný seed, teda bez pamäte) dala tiež
**30/30 výrobkov, 0 nevýrobkov**. Ani v jednom prípade sa v slote neobjavilo nič, čo sa varí,
váži alebo skladá z viacerých surovín. Toto pravidlo je odteraz aj **testom**
(`test_pravidla.js` — „v snackovom slote je vždy hotový kúpený výrobok").

---

## 6. Čo som zmenil v súboroch

- **`data/app.js`** — len generátor:
  - `_stopaPre`, **`vratSlot`** (nové) + `zlozSlot`, `skusPrehod`, `zlepsiBielkoviny`,
    `zlepsiVlakninu`, `zlacniDen` — vrátenie slotu vracia aj `ctx.stopa` (D1);
  - **`_pravidlaRanajok`** (nové) + `vyberDoSlotu` — pravidlo raňajok na jednom mieste, platí
    aj na zálohe poolu (D1);
  - `_cenovyStrop(p, slot)` + `_poolPreSlotVypocet` — strop luxusu na porcii v snackovom
    slote (D2), `_medianCenaPoolu` (nové) + `_genCacheReset` (cache mediánu);
  - `_zlepsiVlakninu` — vláknina smie minúť bielkoviny nad denným cieľom (D3);
  - `TYZDNE_PAMATE_SNACK` 14 → 26;
  - `masoTyp`/`ranajkyBaza` — memo `_memoMaso`/`_memoBaza` (výkon), lenivá `sirsi`.
  - **Nedotknuté:** UI, nákup, `_vyzivaVypocet`, normalizácia stavu, tlač, `sablona.html`, CSS.
- **`recepty/kup-*.json`** — 63 **nových** súborov (hotové balené výrobky). Žiadny existujúci
  recept sa nemenil.
- **`data/potraviny.json`** — +63 položiek k novým výrobkom, +1 chýbajúca (`ochucovadlo kurca`,
  kvôli ktorej mala jedna položka nákupu neznámu cenu).
- **`test_pravidla.js`** — +3 kontroly (44 → 47): raňajková báza/blok, sendvič vo všedný blok
  (prah 90 %), snack = hotový výrobok.
- **`test_regresie.js`** — R6 prepnuté na **PREJDE** s vysvetlením príčiny; R2b a R5a–d prepnuté
  na PREJDE (boli opravené v predošlých vlnách, len sa to nezapísalo).

---

## 7. Čo som skúšal a nefungovalo

- **Realistický rozpočet snacku aj v turnaji** (`cenaSlotu` = `max(podiel, medián katalógu)`).
  Znie to správne — dnes dostane plnú cenovú pokutu každý výrobok nad 0,84 €, čiže všetky
  bielkovinové, a cena tak nerozlišuje skyr za 0,98 € od lososa za 2,60 €. Namerané je to však
  **horšie**: dní pod 80 g 1,6 → 3,2 %, poradie 100 → 99,4 %, susedné týždne 0 → 0,3, a cena
  klesla len o 2 €. Slabá rovnomerná pokuta funguje lepšie než ostrá na drahej polovici poolu.
  Zamietnuté, dôvod je zapísaný v komentári D2c.
- **Pustiť cenu do výživovej rezervy** (`zlacniDen` smie ísť s bielkovinami po denný cieľ a
  s vlákninou po jej cieľ — teda to isté, čo dostala vláknina v D3). Cena 173,3 → 169,4 €/týždeň
  (−2 %), ale dní pod 80 g 1,3 → 2,1 % a vláknina 22,2 → 21,5 g. Zlý obchod, zamietnuté (D4).
- **Pamäť snackov 30+ týždňov.** Nad 26 sa už neuplatní (prah 40 % poolu), čísla sú identické
  s 26 — len sa premrhá jeden stupeň pamäte.
- **Vyhodiť z katalógu nízkobielkovinové ovocie a zeleninu**, aby sa nedali vybrať. Neurobil som
  to: sú to reálne snacky, používateľ si ich vie vybrať ručne, a generátor ich aj tak vyberá
  zriedka (turnaj ich prebije bielkovinami). V 30-slotovom dôkaze sú 3 z 30.

---

## 8. Riziká a čo ostáva otvorené

1. **Cena týždňa je jednosemenne lepšia, viacsemenne horšia.** `metriky.js 30` dáva
   **137,22 €** (bolo 155,91 €), ale priemer cez 36 týždňov × 3 seedy je **173,3 €** oproti
   163,9 € predtým (**+5,7 %**). Je to priama cena za zadanie: skyr stojí 1,00 €, jablko 0,35 €,
   a snacky sa berú 3× do týždňa. Dve možnosti, ak by to prekážalo: znížiť `CENA_LUX` pre snack
   z 3,0 na ~2,0 (odreže najdrahšiu desatinu katalógu), alebo doplniť lacnejšie bielkovinové
   výrobky (tvaroh v alobale, vlastná značka). Nerobil som ani jedno — cena nebola v zadaní
   a obe zmeny berú bielkoviny.
2. **`R1` v `test_regresie.js` dnes padá a nie je to moja zmena.**
   `recepty/zeleninovy-stir-fry-s-kesu.json` má **1840 g olivového oleja na 2 porcie**
   (8133 z 8942 kcal receptu). Je to dátová chyba z vlny 3 (zjavne zlá konverzia jednotky),
   nie regresia generátora. Recept je kategórie „Hlavné jedlo", takže mimo môjho rozsahu
   (smel som meniť len nové súbory a existujúce `Snack`). Oprava = doplniť `vsiaknutie`
   alebo opraviť množstvo; kým sa to nestane, `test_regresie.js` končí kódom 1.
3. **`_memoMaso` a `_memoBaza` sú nové top-level `const`, ktoré nie sú v `EXPORT_TAIL`.**
   `test_harness.js` nie je v mojom rozsahu súborov a žiadny test tie mapy nepotrebuje.
   Ak by ich chcel niekto testovať, treba ich tam dopísať (rovnaká poznámka ako po vlne 1
   pri `GEN_SK`, `PAMAT_STUPNE`, `KCAL_PASMO`, `VLAKNINA_CIEL`).
4. **Sendvičové raňajky sú posledné veľké hrdlo** — 40 receptov, z toho 32 v kcal-okne a
   **nula** nad 8 g bielkovín/100 kcal. Konkrétny návrh je v §2. Bez neho sa `SLOT_PODIEL`
   raňajok (0,22) nedá vrátiť hore a unikátnych všedných raňajok zostane 27 z 60.
5. **Memo `_memoMaso`/`_memoBaza` je trvalé (nie per-generovanie).** Je to bezpečné, kým sa
   recept počas behu appky nemení — `RECEPTY` je konštantné pole z buildu. Ak by pribudol
   používateľský recept za behu, memo sa oň nepostará (kľúč je `r.id`, takže nový recept
   dostane vlastný záznam — problém by nastal len pri ZMENE existujúceho receptu za behu).
6. **`najčastejší snack` v `metriky.js` sa nedá dostať pod 6** pri horizonte 30 týždňov a
   pamäti 26. Nie je to chyba: 83 z 90 ťahov je unikátnych.
7. **Nemeral som profil so 6 slotmi** (Desiata, Olovrant). `SLOT_PODIEL` aj `VLAKNINA_CIEL` sa
   normalizujú počtom slotov, `_cenovyStrop` používa `cielSlotu(slot, SLOTY(), …)`, takže by mal
   sedieť — ale je to nepremerané, rovnako ako po vlne 1.

---

## 9. Ako to overiť

```
cd /home/claude/e2
python3 generuj_kucharku.py && node --check data/app.js
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
  && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
  && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js
node test_regresie.js            # R6 = PREJDE; padá už len R1 (dátová chyba, viď §8.2)
node scripts/metriky.js 30
node scripts/kvalita.js 24 4     # na rozhodovanie používaj TOTO, nie jeden seed
SEEDS=1,2,3,7,42,99,555,20260818 TYZDNOV=6 node test_pravidla.js   # pravidlá na 8 seedoch
```
