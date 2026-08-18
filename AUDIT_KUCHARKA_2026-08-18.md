# Audit užívateľskej appky „Kuchárka“ — 18. 08. 2026

Auditovaná verzia: `kucharka.html` z 02. 08. 2026 (2,02 MB), `data/app.js` 1536 riadkov / 166 KB,
**1336 receptov**, **478 potravín**, 5 uložených jedálničkov. Nič som v projekte nemenil — toto je len nález.

---

## 1. Zhrnutie na 30 sekúnd

**Appka je stabilná a kompletná.** Nič nepadá: v prehliadači (desktop 1440 px aj mobil 390 px) som preklikal
všetkých 7 sekcií, vygeneroval jedálniček, nákup, otvoril recept, spustil režim varenia, pridal zásobu do špajze —
**0 chýb v konzole**, stav prežije reload, service worker sa registruje. Build je reprodukovateľný
(zo zdrojov mi vyšiel bajt na bajt identický `kucharka.html`) a dáta receptov sú štruktúrne čisté
(0 chýbajúcich povinných polí, 0 duplicitných ID, 0 neznámych kategórií).

**Problém nie je v tom, či appka funguje, ale v tom, či čísla, ktoré ukazuje, sú pravdivé.** Tri systémové veci:

| # | Čo je zlé | Ako veľmi |
|---|---|---|
| 1 | Generátor trafí 1450 kcal **naťahovaním porcií**, nie výberom vhodných jedál | faktor 0,55–1,95×; 51 % dní potrebuje korekciu >15 %; reálne „2 porcie melónového šalátu na obed“ |
| 2 | **Bielkoviny** nie sú v generátore vôbec zohľadnené | medián **66,5 g/deň** oproti cieľu ~109 g; na cieli je 0,5 % dní (v prehliadači mi vyšlo 49 g a 68 g/deň) |
| 3 | **Matchovanie surovín** na databázu potravín zlyháva na skloňovaní a modifikátoroch | „Kokosového mlieka“ → 660 kcal/2 € namiesto 197 kcal/0,50 € (94 výskytov); „ks“ bez hmotnosti = 60 g (111 ingrediencií, +31 588 kcal v DB) |

Dôsledok: **kalórie sú nadhodnotené o ~14 % v priemere, cena týždňa má rozptyl 31 € / 62 € / 87 € podľa obrazovky,
sodík je podhodnotený 2×** a jedálniček, ktorý appka označí „na cieli 1450 kcal“, môže reálne dať 2100 kcal.

Dobrá správa: takmer všetko sú **opraviteľné veci v jednom súbore** (`data/app.js` + doplnenie `potraviny.json`),
architektúra je zdravá a blokový meal-prep model je bezchybný.

---

## 2. Metodika (čo presne som robil)

1. **Build:** stiahol som zdroje aj výstup, znovu poskladal `sablona.html` + `app.js` + dáta → výsledok identický
   s `kucharka.html` (1 954 075 znakov). `node --check data/app.js` OK, `node test_prepocty.js` OK, `node test_porcie.js` OK.
   `recepty/*.json` = 1336 súborov, žiadny zdroj nie je novší ako build.
2. **Statická analýza:** 205 handler-atribútov (62 v šablóne, 143 v HTML generovanom v JS), 140 `getElementById`,
   318 deklarácií funkcií; simulácia štyroch stavov `localStorage` (prázdny, starý formát, poškodený) v jsdom
   s otvorením **všetkých 1336 receptov**.
3. **Výpočty:** node harness, ktorý spúšťa skutočný `app.js` s reálnymi dátami; prepočet 9 240 ingrediencií,
   673 receptov s deklarovanými kcal, reálny týždenný plán s 1 aj 2 stravníkmi.
4. **Generátor:** **60 vygenerovaných týždňov = 420 dní = 720 výberov** (deterministický seed), vyhodnotených proti
   pravidlám z `CLAUDE.md`.
5. **Prehliadač:** Chromium (Playwright), desktop 1440×900 a mobil 390×844, cez `http://localhost` (aby fungoval SW),
   ~25 screenshotov, sledovanie konzoly a sieťových chýb.

Každý nález nižšie má repro alebo číslo. Nálezy, ktoré som si osobne overil čítaním kódu, sú označené **[overené v kóde]**.

---

## 3. Nálezy — A. Generátor a nutrícia (najdôležitejšie)

### A1 · P0 — Kalorický cieľ sa dosahuje škálovaním porcií, nie výberom jedla
`app.js:504–508 (rescaleDen)`, `app.js:792` — **[overené v kóde]**

```js
const fac=Math.max(0.5,Math.min(2,Math.round(ciel/dk*20)/20));   // 0,5×–2,0× na VŠETKY jedlá bloku
```

Zo 420 vygenerovaných dní: základný (neškálovaný) súčet dňa má medián 1611 kcal a rozsah **739–2741 kcal**,
takže do ±10 % z cieľa padne prirodzene len **26,4 %** dní. Faktor to dorovná na 100 % dní — ale:

* faktor: min **0,55**, medián 0,90, max **1,95**; presne 100 % má len 9 % jedál
* **51,2 % dní** potrebuje korekciu >15 %, 15,7 % dní ≤70 %, 5,2 % dní ≥150 %
* faktor **ide aj do množstiev a nákupu** (`mnozMult = porcieSlot·pf`)

Konkrétny deň (blok St–Pi, base 739 kcal, faktor 195 %): raňajky *Toast s avokádom a vajcom* → **750 kcal**,
obed *Melónový šalát s fetou* → 269 kcal (t. j. 2 porcie melónového šalátu), večera *Zemiakovo-uhorkový šalát* → 198 kcal.
Appka hlási „1441 kcal, v cieli“. V mojom vlastnom teste v prehliadači svietili v pláne faktory **135 % a 200 %**
(vidno na screenshote `desktop-plan-vygenerovany.png`).

> Pozn.: `CLAUDE.md` tvrdí, že „percentuálny faktor bol v14 zrušený“. Nie je — vrátil sa ako `rescaleDen`/`S.planF`
> a je dnes hlavným mechanizmom, ktorým appka trafí cieľ.

**Oprava:** pred výberom filtrovať pool podľa kcal-okna slotu (podiely dňa Obed 35 % / Večera 30 % / Raňajky 25 % / Snack 10 %),
faktor zovrieť na 0,85–1,15 a pri nevyhovujúcom dni **prehodiť jedlo, nie natiahnuť porciu**. Pool to unesie:
z 564 hlavných jedál je 97 v pásme 350–450 kcal, 117 v 450–550, 89 v 550–700.

### A2 · P0 — Bielkoviny generátor nerieši (66 g namiesto ~109 g)
`app.js:747 (vahaReceptu)`, default `S.profil.biel=0` na `app.js:61`

Váha receptu = `1 + hodnotenie + 0,8·sezónne + 1,2·akcia + 1,0·watch + expBoost`. Bielkovinový bonus `+0,5`
sa aplikuje **len ak je nastavený cieľ bielkovín — a default je 0**. V auguste má preto celý pool len dve váhy
(978 receptov 1,0 a 358 receptov 1,8).

* bielkoviny/deň cez 420 dní: min **34 g**, medián **66,5 g**, max 113 g → **18,4 % energie** namiesto 30 %
* dní na cieli (≥109 g): **0,5 %**; dní pod 80 g: **85 %**
* ani najlepší zo 60 týždňov nemá priemer nad 85 g/deň
* zapnutie cieľa bielkovín posunie medián len na 68,7 g (bonus je príliš slabý)
* pritom pool má 170 z 564 hlavných jedál s ≥30 g bielkovín na porciu

Vo vlastnom teste v prehliadači ukázala Výživa **49,3 g** a **67,9 g bielkovín/deň** — nezávisle to potvrdzuje.

**Oprava:** z bielkovín urobiť multiplikátor váhy (napr. `w *= 0,4 + min(1,6; (g bielkovín/100 kcal)/10)`) a doplniť
denný „repair“ krok: ak deň nemá aspoň 80 % cieľa bielkovín, prehoď slot s najnižším podielom.

### A3 · P0 — Poradie jedál obed > večera > raňajky > snack platí v 38 % dní; večere sú absurdne malé
`app.js:790` (swap iba pre pár Obed/Večera), `app.js:9 SLOT_KATEGORIE`, `app.js:502 potrebujePrilohu`

| pravidlo | dodržané |
|---|---|
| Obed ≥ Večera | 100 % (swap funguje) |
| Obed > Raňajky | 80,7 % |
| **Večera > Raňajky** | **38,8 %** (257 porušení zo 420 dní) |
| celé poradie | **37,9 %** |

Mediány kcal/porcia: raňajky 453, obed 665, **večera 366**, snack 120 → reálne podiely dňa 28/41/**23**/7 %.
**Večera pod 250 kcal je v 37,4 % dní**, 24 dní má večeru pod 100 kcal, minimum **28 kcal**
(*Kórejský pikantný uhorkový šalát* ako večera; *Pico de gallo* 35 kcal ako večera).
Príčina: do slotov Obed/Večera smie kategória „Šalát“ (32 % večerí!) a „Polievka“ (18 %), a `potrebujePrilohu`
im explicitne **zakazuje** doplniť pečivo alebo bielkovinu.

**Oprava:** pre hlavné sloty odfiltrovať recepty pod ~300 kcal/porcia (zostane 429 z 564) a povoliť prílohu
aj Polievke/Šalátu (pečivo, bielkovinový komponent).

### A4 · P1 — 2× sacharid: pizza + ryža, lasagne + ryža, penne + zemiaky
`app.js:501 (maCarb)` — potvrdené aj vizuálne v mojom teste na mobile: **„Lasagne bolognese + Ryža (príloha)“**

`maCarb` hľadá sacharid **len v názvoch ingrediencií** a nepozná tvary cestovín ani pizzu:
39 z 89 receptov kategórie „Cestoviny“ prejde ako „bez sacharidu“ (*Cacio e Pepe*, *Bucatini all'amatriciana*,
*Penne all'arrabbiata*), rovnako *Pizza Margherita* (ingrediencie: múka, voda, droždie).
V pláne dostane redundantnú prílohu **9,7 % hlavných chodov**.

**Oprava:** rozšíriť regex na názov receptu + tvary cestovín/pizze/pečiva a vylúčiť kategóriu „Cestoviny“ paušálne.

### A5 · P2 — Snacky sa zasekli na 36 receptoch a ťahajú deň dole
`app.js:783` — filter „kupované“ je tvrdý (default `kupSnack:true`), pool 351 → **36**.
Za 60 týždňov sa použilo len **35 unikátnych snackov**; *Cherry paradajky* 15×, *Puding* 11×.
Medián snacku 120 kcal, *Cherry paradajky* = 27 kcal a 1,4 g bielkovín (v tom istom poole je *Cottage syr* 176 kcal / 19,8 g).

**Oprava:** „kupované“ zmeniť z filtra na váhu (×2) + kcal-okno pre snack.

### A6 · P2 — Žiadna pamäť medzi týždňami
`app.js:764` — `nedavne` sa plní len z `S.uvarene` (história z režimu varenia). V teste 30 sekvenčných týždňov sa
v **11 z 29** párov susedných týždňov aspoň jeden recept zopakoval. Pravidlo „bez carryover C→A“ platí v rámci
týždňa, ale nie medzi týždňami. **Oprava:** doplniť `nedavne` z plánu predchádzajúceho týždňa a z `S.archiv[0]`.

### A7 · P2 — Pestrosť: 60 týždňov využilo 29 % receptov
388 z 1336 receptov; snacky 10 % poolu. Kombinácia tvrdých filtrov a plochých váh. Súvisí s A2 a A5.

---

## 4. Nálezy — B. Výpočty a databáza potravín

### B1 · P0 — Skloňovanie a modifikátory rozbíjajú párovanie surovín
`app.js:66–70 (najdiPotravinu)` — **[overené v kóde a v dátach]**

Matchuje sa „najdlhší `kluc`, ktorý je podreťazcom názvu suroviny“. Slovenčina to poráža:
„**Kokosového mlieka** 400 ml“ neobsahuje `kokosové mlieko`, ale obsahuje `kokosové` → napáruje sa
**strúhaný kokos 660 kcal, 2 €/100 g** namiesto kokosového mlieka (197 kcal, 0,50 €).
Výsledok: 400 ml → **2640 kcal / 8,00 €** namiesto 788 kcal / 2,00 €. V dátach je **94 výskytov**
kokosového mlieka/oleja. Ďalšie potvrdené prípady:

| surovina | napárovaná na | dopad |
|---|---|---|
| Maslová tekvica 300 g | `maslo` (717 kcal) | 2151 kcal namiesto ~135 |
| Kokosový olej | `kokos` (hustota 0,35) | 50 ml → 17,5 g namiesto 46 g |
| Vanilkový cukor 1 ks | `vanilkov` (80 €/100 g) | **3,20 €** namiesto ~0,30 € |
| Krabie mäso 200 g | `mäso` (bez ceny) | 500 kcal / **0,00 €** |
| Olej na opekanie | `pekan` (o-**pekan**-ie) | orech namiesto oleja |
| Kondenzované mlieko | `mlieko` (64 kcal) | 64 namiesto 321 kcal |
| Kokosová/sójová/ryžová smotana | `smotana` | falošný alergén **mlieko** |

Dopad na recept: *beef-rendang* deklaruje 600 kcal, appka ukáže **941**; *chicken-biryani* 620 → 790.
V databáze je 45 kľúčov kratších ako 5 znakov (`mäso`, `syr`, `olej`, `voda`, `med`, `ľad`…) — trvalý zdroj falošných zhôd.

**Oprava:** párovať na hranice slov + normalizovať slovenské koncovky (lemmatizácia „kokosového“→„kokosov“),
pri rovnakej dĺžke preferovať kľúč od začiatku názvu, a doplniť chýbajúce presné kľúče
(`kokosový olej`, `kokosové mlieko`, `maslová tekvica`, `vanilkový cukor`, `kondenzované mlieko`, `rastlinná smotana`…).

### B2 · P0 — „ks“ bez hmotnosti = 60 g (klinčeky, bobkový list, kardamóm)
`app.js:86` — **[overené v kóde]**: `if(j==="ks"…) return ing.mnozstvo*60;`

380 zo 478 potravín nemá `g_za_ks`. V receptoch je **111 takých ingrediencií** a spolu pridávajú
**+31 588 kcal a +362 €** do databázy:

```
chicken-biryani:  Kardamómy 4 ks  → 240 g / 746 kcal / 19,20 €   (má byť ~1 g)
chicken-adobo:    bobkový list 3 ks → 180 g / 563 kcal / 5,40 €   → recept 520 → 760 kcal
grilovane-jalapeno: Plátky slaniny 14 ks → 840 g / 4200 kcal
pikantne-kura-ryza: Kuracie stehná 8 ks → 480 g (má byť ~1000 g)
```

**Oprava:** doplniť `g_za_ks` pre všetky potraviny, ktoré sa v receptoch vyskytujú s „ks“ (skript ich vypíše),
a pre neznáme radšej vrátiť 0 g + viditeľné „nedopočítané“ ako tichých 60 g.

### B3 · P0 — `g_za_ks` prebíja `KS_DEF`: „4 listy šalátu“ = 1200 g
`app.js:83–85` — **[overené v kóde]**: `g_za_ks` sa testuje **pred** `KS_DEF`, hoci je to hmotnosť „ks“, nie „listu“/„hrsti“/„plátku“.
Zasiahnutých **370 ingrediencií** (260× cesnak/strúčik).

```
„Šalát 4 list“ → g_za_ks 300 → 1200 g (recept 397 → 463 kcal, nákup „Šalát 4 ks“ = 4 hlávky)
„Šalátové listy 2 hrsť“ → 600 g (správne 60 g)
„Bazalka 24 lístok“ → 72 g (správne 24 g)
```

**Oprava:** `KS_DEF` testovať pred `g_za_ks`, `g_za_ks` použiť len pre `ks`/`kus`; kde je `g_za_ks` reálne hmotnosť
plátku (nori, toastový chlieb), zaviesť samostatné pole.

### B4 · P1 — „Záchranná brzda“ na kcal je útes, nie brzda
`app.js:110–116` — brzda dorovná výpočet na `kcal_na_porciu`, ale len keď sa líšia **>1,6×**.

| pomer výpočet/deklarované | receptov (z 673) |
|---|---|
| 0,9–1,1× (dobré) | 309 (45,9 %) |
| odchýlka >20 %, brzda **neaktívna** → na obrazovke je zlé číslo | **152 (22,6 %)** |
| brzda aktívna | 72 (10,7 %) |

Priemerný pomer **1,141** → systematické nadhodnotenie kcal o ~14 %. **663 z 1336 receptov (49,6 %) nemá
`kcal_na_porciu` vôbec**, tam brzda neexistuje. Útes: recept s pomerom 1,594 zobrazí 633 kcal (dekl. 397),
recept s pomerom 4,68 zobrazí správnych 325 kcal — dve rovnako zlé dáta dostanú diametrálne odlišný výsledok.
Brzda navyše prepočítava aj vlákninu a sodík faktorom, ktorý vznikol z kcal-chyby.

**Oprava:** hranicu na ~1,25×/0,8×, alebo: „ak je `kcal_na_porciu`, ver mu vždy a výpočet použi len na makrá“,
a recept viditeľne označiť „≈ odhad“ pri rozdiele >10 %.

### B5 · P1 — Ceny: 27 potravín bez ceny → týždeň podhodnotený o ~20 %, a zároveň nadhodnotený o 39 % baleniami
27 zo 478 potravín nemá `cena100` (`bravčov, tuniak, chlieb, saláma, gouda, mäso, uhorka, brokolica, fazuľa,
kukurica, šalát, majonéza, vývar, rezance, škrob…`) → **708 z 8 028** ingrediencií má cenu 0 €,
**18,6 % hmoty** je neocenená, **39 % receptov** obsahuje aspoň jednu tichú nulu.

Reálny týždeň (2 stravníci): suroviny 62,35 €, s baleniami 86,90 €, neocenená hmota ~21 €.
Kolekcia **„Lacné do 1,5 €“** obsahuje 57 receptov (6 %), ktoré tam nepatria (*tuniakový wrap* 0,68 € vs reálne 6,08 €).

A tri obrazovky hlásia tri ceny toho istého týždňa — **[overené v prehliadači: Výživa 5,18 €/deň = 36 €/týž., Nákup 86,15 €]**:

| obrazovka | cena týždňa | prečo |
|---|---|---|
| Výživa „Cena/deň“ | 31 € | na 1 osobu (štítok to nehovorí) |
| Domov „Cena/deň (domácnosť)“ | 62 € | celá domácnosť, čisté suroviny |
| Nákup | 87 € | účtuje celé balenia (olivový olej 114 g → celý liter 6,44 €) |

**Oprava:** doplniť ceny; jedna funkcia `cenaTyzdna(mode)` a jednotné štítky; v Nákupe rozdeliť
„spotrebované“ vs „doplnenie zásob (celé balenia)“; pri neúplných dátach písať „~ X € (n položiek bez ceny)“.

### B6 · P1 — Vláknina a sodík chýbajú u 67 % potravín a počítajú sa ako nula
321/478 bez `vlaknina`, 322/478 bez `sodik`. Najhoršie je pokryté práve to, čo rozhoduje:
**Omáčky a dochucovadlá 20 z 29 bez sodíka** (sójová omáčka, rybia omáčka, kečup, horčica), aj saláma, parmezán, vývar.

Reálny týždeň: appka ukáže **1274 mg sodíka/deň** (tile bez varovania), s doplnenými dátami **2673 mg = 1,16× nad limitom**.
Vláknina 9,0 g vs reálne ~12,3 g. Jedna položka: sójová omáčka 109 g prispeje 0 mg namiesto ~6000 mg.
**[overené v prehliadači: „Vláknina/deň 9,68 g /30“, „Sodík/deň 656 mg /2300“]**

**Oprava:** doplniť aspoň oddelenia Omáčky, Mäso a ryby, Trvanlivé, Pečivo, Mliečne; a keď je pokrytie hmoty
pod ~70 %, zobraziť „≥ 9 g (66 % surovín má dáta)“, nie tvrdé číslo pod limitom.

### B7 · P1 — Dni „preč“ (dovolenka) nešetria nič a vedia vyprázdniť celý blok
`app.js:538 (porcieSlotBlok)` a `app.js:772` — **[overené v kóde]**

* `porcieSlotBlok` sčíta porcie za všetky dni bloku bez kontroly, či v ten deň vôbec jete → blok Po–Ut s „preč“ v utorok
  dá **4 porcie namiesto 2** a cena nákupu je **116,30 € s „preč“ aj bez neho**.
* Generátor si berie masku slotov len z **prvého** dňa bloku (`slotyDna(dni[0])`) → ak je preč prvý deň,
  ostane bez jedla **celý blok**.

### B8 · P1 — Prah `baseDayKcal < 200` je skok: 47 kcal rozdielu = 7× nákup
`app.js:512 (pocetPorcii)` — **[overené v kóde]**

```
deň s jedným jedlom 175 kcal → 1,00 porcie
deň s jedným jedlom 222 kcal → 6,53 → nákup na 7 porcií
```
Reálny scenár „na sobotu mám naplánovaný len obed“ → appka nakúpi 3–4 obedy pre jedného.

### B9 · P1 — Ručný počet ľudí × % veľkosti porcie sa násobí namiesto delenia
`app.js:520–528` — **[overené v kóde]**: `pocetPorciiDna` delí faktorom `pf` len vo fallback vetve;
keď je nastavené `S.dayPpl` (per-deň počet ľudí), vráti počet ľudí bez delenia, ale `mnozMult` `pf` aj tak vynásobí.
`dayPpl=4`, `pf=0,8` → navarí **3,2 porcie pre 4 ľudí** (−20 %). To isté pre `S.slotPpl` a `tyzdenProfil().ludia`.

### B10 · P3 — Ďalšie potvrdené drobnosti vo výpočtoch
* `hustota=1` u 413 z 478 potravín → „1 PL múky“ = 15 g (reálne ~9 g), cukor 15 g (~12 g).
* `NEDELITELNE_JEDNOTKY` neobsahuje `strúčik, list, lístok, hlávka, zväzok` → v detaile vidno „2,92 strúčik“.
* `cieloveMakra`: pri vysokom cieli bielkovín ticho vypadnú sacharidy na 0 g (cieľ potom nesedí s kcal).
* 22 ingrediencií sa nenapáruje vôbec (0,2 %): Krupica, Ementál, Sušené hríby, Lístkové cesto, Lasagne pláty,
  Bucatini, Tzatziki, HP omáčka, Balzamikový krém… a „**Špáradlá**“ (do ingrediencií prenikla nepotravina).

---

## 5. Nálezy — C. Nákup a špajza

| ID | P | Nález | Repro |
|---|---|---|---|
| C1 | P1 | **Všetko, čo nie je g/ml, sa v nákupe hlási ako „ks“** (`app.js:898`): do „ks“ spadnú aj PL, ČL, strúčik, plátok, štipka | „Cesnak — **22 ks**“ (reálne 22 strúčikov = 66 g, teda 1 hlávka) — **vidno na mojom screenshote nákupu: „Strúčik cesnaku — 4 ks“**; „Údená paprika 1,33 ČL“ → „1 ks“ v oddelení Zelenina; mleté čili sa zlúči s čili papričkami na „243 g“ |
| C2 | P2 | **Cena vždy počíta celé balenia**, aj keď je zobrazovanie balení vypnuté (`nakupCena` ignoruje `S.profil.balenia`, `app.js:921`) — **[overené v kóde]** | riadok hlási „8 ks“ toastu, cena 2,00 € (celé balenie) namiesto 0,90 € → sumár nesedí so zobrazenými množstvami |
| C3 | P2 | **Špajza je binárna** (`mamVSpajzi`, `app.js:924`) — **[overené v kóde]**: `mnozstvo>0` stačí | 20 g lososa v špajzi vyhodí z nákupu celých 600 g; súčet spadne z 86,90 € na 59,46 € |
| C4 | P2 | Položka „mám v špajzi“ **vypadne aj z kopírovaného/zdieľaného zoznamu** (Listonic) | 1 g chleba v špajzi → chlieb v obchode chýba |
| C5 | P2 | **Krátky token v „Mám doma“ vyprázdni nákup** (`jeDoma`, `app.js:919`, bez minimálnej dĺžky) — **[overené v kóde]** | napíš „a“ → 39 zo 48 položiek sa označí ako „máš doma“ a **nedajú sa odškrtnúť** (checkbox disabled) |
| C6 | P2 | **Odpis zo špajze cez inú jednotku je nesprávny** (`gramyNaJed` nie je inverzná ku `gramy`) | 20 strúčikov cesnaku, recept berie 15 g → odpíše 3 namiesto 5; zásoba v jednotke „balenie“ sa neodpíše nikdy a toast tvrdí „nenašla sa zhoda“ |
| C7 | P3 | Oddelenie „**Ryby a morské plody**“ (2 potraviny) nie je v poradí oddelení → vypadne až za „Ostatné“; duplikuje „Mäso a ryby“ (34) | rovnako osamotené „Mrazené“ (1), „Alkohol“ (1), „Chladené“ (3) |

---

## 6. Nálezy — D. UI, mobil, prístupnosť

| ID | P | Nález | Čísla |
|---|---|---|---|
| D1 | P1 | **Hľadanie v receptoch prekresľuje 1336 kariet po každom znaku, bez debounce** (`app.js:1275`, naviazané na `input` **aj** `change` → pri `<select>` beží 2×) | 1 prekreslenie = 1886 ms v jsdom; v Chromiu mi napísanie 4 znakov („kura“) trvalo **8,2 s desktop / 7,6 s mobil**. Na telefóne to je viditeľné zaseknutie. Oprava: debounce 200 ms + memoizovať `vyzivaReceptu` podľa `r.id` |
| D2 | P2 | **Písanie do „Mám doma“ ukladá do localStorage a spúšťa sync po každom znaku** (`sablona.html:420` `oninput="renderNakup()"`) | serializácia celého stavu (2 MB dát v pamäti) na každý stlačený znak |
| D3 | P2 | **Tabuľka plánu má 1731 px, ale obsah je limitovaný na 998 px** → 3 zo 7 dní treba doscrollovať vodorovne aj na 1440 px monitore | overené: `table 1731 px / wrapper 998 px` pri 1440, 1280 aj 1024 px. Na mobile je to vyriešené prepínačom dní — na desktope chýba |
| D4 | P2 | **Escape nezatvorí režim varenia** (`app.js:444` zatvára len modály) — **[overené v prehliadači]** | v kuchyni pri zamastených rukách nepríjemné; zatvorí to len „✕ Koniec“ |
| D5 | P2 | Modál zatvorený ✕/Esc nechá v histórii mŕtvy záznam → v PWA na Androide treba prvý „Späť“ nadarmo | `app.js:451` pushuje stav, `zavri()` nerobí `history.back()` |
| D6 | P2 | **41 zo 41 vstupných polí nemá `<label for>`** → čítačky obrazovky a autofill; 2 tlačidlá bez textu aj `aria-label` | `lang="sk"` je OK, žiadne obrázky bez `alt` (obrázky v appke nie sú vôbec) |
| D7 | P3 | „Skopíruj minulý týždeň“ vezme **najstarší** uložený týždeň (`app.js:712` `a[a.length-1]`, kým `ulozPlanArchiv` robí `unshift`) — **[overené v kóde]** | dialóg ohlási iný týždeň, než sa skopíruje |
| D8 | P3 | Hodnotenie receptu (klik na hviezdičku) **zahodí kontext plánu** → detail prepne z 272 g na 320 g a zmizne info „Veľkosť porcie 85 %“ | `hodnot()` volá `otvor(id)` bez `ctx`; to isté `toggleSkryt` |
| D9 | P3 | Nový vlastný recept nedoplní svoju kuchyňu do filtra až do reloadu (`naplnKuchyne` sa volá raz pri starte) | |
| D10 | P3 | Komparátor s `Math.random()` v „Čo variť dnes“ (`app.js:1084`) je nekonzistentný → výsledok radenia nie je definovaný | |
| D11 | P3 | Mŕtvy kód: `otvorGenConfig`, `S.voda` (vodný tracker sa ukladá, ale nikde nečíta), `novyIngRows`, `dnesId`, `planMode` | vodný tracker z v10 teda de facto zmizol z UI |

---

## 7. Nálezy — E. Dáta a dokumentácia

* **Fotky receptov: 0 z 1336.** Pole `foto` nemá nastavené ani jeden recept, `recepty/fotky/` je prázdny
  a `recepty/_prijate/` tiež. Celý mobilný workflow „nafoť recept → pridaj do projektu“ nie je použitý;
  v UI sú namiesto fotiek emoji.
* **663 z 1336 receptov (49,6 %) nemá `kcal_na_porciu`** → polovica receptov nemá voči čomu skontrolovať výpočet (viď B4).
* **60 receptov bez `kuchyna`** → logika „striedaj kuchyne v jednom dni“ ich nevie rozlíšiť; **121 bez tipov**;
  **50 receptov má postup kratší ako 2 kroky**.
* 2 duplicitné názvy: *Cacio e Pepe*, *Zemiaková kaša* (rôzne ID, obsahovo blízke).
* `CHANGELOG.md` končí na **v17**, hoci v kóde je jednoznačne viac (účty a skupinová synchronizácia,
  onboarding sprievodca, generátor-wizard s dňami „preč“, per-deň počty osôb, kolekcie).
  `CLAUDE.md` tvrdí `app.js ~70 KB` (reálne **166 KB**) a že „percentuálny faktor bol zrušený“ (viď A1). **Dokumentácia je pozadu.**
* Naopak čisté: 0 chýbajúcich povinných polí, 0 duplicitných ID receptov, 0 duplicitných kľúčov potravín,
  0 neznámych kategórií, 0 podozrivých výživových hodnôt (kcal >900 alebo súčet makier >100 g),
  všetky recepty v uložených jedálničkoch existujú.

---

## 8. Čo funguje dobre (nekaziť pri opravách)

* **Blokový meal-prep model je bezchybný.** Zo 720 slotov 0 porušení „1 variant na slot na blok“,
  0 zo 180 blokov malo obed = večera, 0 zo 60 týždňov zopakovalo recept naprieč blokmi.
* **Prepočet porcií na kalorický dopyt domácnosti je matematicky presný**: pri 1 aj 2 stravníkoch
  (1450 + 2100 kcal) je `Σ kcal × množstvo` presne `Σ cieľov × 7 dní` (pomer 1,000).
* **Detail receptu a nákupný zoznam si sedia** pri nedeliteľných jednotkách (135 porovnaných párov, 0 nezhôd);
  `test_prepocty.js` a `test_porcie.js` to pripínajú.
* **Žiadny odkaz na neexistujúcu funkciu ani chýbajúci element** (205 handlerov, 140 selektorov, 318 funkcií, 0 duplikátov).
* **Prázdny aj poškodený `localStorage` prežije**: 4 scenáre × ~200 funkcií × otvorenie všetkých 1336 receptov = 0 výnimiek.
  Migrácie starých formátov plánu držia.
* **Build je deterministický a validácia dát pri builde reálne chráni** — `skontroluj_recepty` je dôvod,
  prečo ani jedna z 8 049 ingrediencií nespadne na 0 g.
* **Onboarding sprievodca, PWA a offline chod fungujú**: service worker sa registruje, sekcie sú responzívne,
  mobilné „⋯ Viac“ dá Výživu/Špajzu/Nastavenia, stav prežije reload, sprievodca sa druhýkrát neukáže.
* Sekcia **Nákup je prehľadná a použiteľná** (oddelenia, zdieľanie, kopírovanie, tlač, checkboxy per týždeň —
  odfajknuté položky sa správne neprenášajú do iného týždňa).

---

## 9. Odporúčaný postup opráv (v tomto poradí)

**Etapa 1 — pravda o číslach (1 sedenie).** B1 párovanie surovín, B2 `g_za_ks`, B3 poradie `KS_DEF`,
doplniť `cena100` (27), doplniť `vlaknina`/`sodik` pre omáčky a mäso, B4 hranica brzdy.
Bez tohto nemá zmysel ladiť generátor — počíta zo zlých vstupov.

**Etapa 2 — generátor (1–2 sedenia).** A1 kcal-okná namiesto naťahovania porcií, A2 bielkoviny ako multiplikátor,
A3 minimum kcal pre hlavné sloty + príloha k polievke/šalátu, A4 `maCarb`.

**Etapa 3 — nákup a špajza.** C1 jednotky, C2 ceny vs balenia, C3–C4 množstvá v špajzi, C5 „Mám doma“, C6 odpis.

**Etapa 4 — UX a robustnosť.** D1 debounce hľadania, B7 dni „preč“, B8 prah 200 kcal, B9 `dayPpl` × `pf`,
D3 tabuľka plánu na desktope, D4 Escape, D6 labely, D7/D8 drobnosti; aktualizovať `CHANGELOG.md` a `CLAUDE.md`.

**Priebežne:** ku každej etape doplniť test do `test_*.js` (harness na `app.js` v `vm` s reálnymi dátami existuje,
opísaný je v prompte pre Claude Code) — inak sa tieto veci vrátia.
