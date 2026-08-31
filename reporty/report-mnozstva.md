# Množstvá — oprava P1 (nákup pýtal 2,4× viac jedla, než plán hlásil)

Vetva `f1`, commit `2a45eaf`. Menené súbory: `recepty/*.json`, `generuj_kucharku.py`
(len kontrola množstiev), `test_regresie.js` (jedna zle napísaná výnimka), nové skripty
v `scripts/`. Na `data/app.js`, `data/sablona.html` ani `data/potraviny.json` som nesiahol.

---

## ZHRNUTIE

| | pred | po |
|---|---|---|
| **pomer nákup/plán** (`node scripts/qa/nakup_vs_plan.js`, 20 týždňov) | **2,39** medián (max 3,77) | **1,15** medián (max 1,28) |
| to isté na 60 týždňoch (30 seedov × 2) | 2,31 medián | **1,11** medián |
| týždňov s odchýlkou > 100 % | 12 / 20 | **0 / 20** |
| týždňov s odchýlkou > 25 % | 15 / 20 | 2 / 20 |
| **nákup na týždeň pre dvoch** (`node scripts/qa/nakup_hmotnost.js`) | **23,5 kg** | **18,4 kg** (60 týždňov) |
| `audit_mnozstva`: receptov s podozrivým množstvom | 50 | **8** |
| … z toho nad 1200 g jedla na porciu | 17 | **0** |
| … z toho nad 2000 g jedla na porciu | 6 | **0** |
| `test_regresie` | 1 otvorená chyba (R1) | **0 otvorených** |
| testy | 10/10 | 10/10 |

Opravených **252 receptov, 349 zmien**. Cieľ „medián do 1,15×" je splnený,
cieľ „pod 13 kg" splnený nie je a **nedá sa splniť opravou dát** — vysvetlenie nižšie.

---

## 1. PRÍČINA — dohľadaná, nie odhadnutá

Chyba nie je v zbere z webu, ale v jednom skripte, ktorý sa ho snažil opraviť.

`scripts/oprav_jednotky_ks.js` riešil surovinu, ktorá mala z importu jednotku „ks",
hoci sa na kusy nepočíta („Soľ 1 ks", „Olivový olej 5 ks"). Vetva 1 tohto skriptu znie:

```js
if (p && p.balenie_g) { i.mnozstvo = Math.round(i.mnozstvo * p.balenie_g); i.jednotka = "g"; }
```

**Balenie nie je porcia.** „Olivový olej 5 ks" (v origináli 5 lyžíc) sa tým premenilo na
5 × 920 g = **4600 g** — päť litrových fliaš oleja. Overené na commite `42250e7` (baseline):

| recept | v baseline | po konverzii | balenie_g |
|---|---|---|---|
| `ratatouille` | Olivový olej **5 ks** | 4600 g | 920 |
| `kuracie-fajitas` | Hladká múka **24 ks** (= 24 tortíl) | 24 000 g | 1000 |
| `garlic-butter-shrimp` | Krevety **36 ks** | 7200 g | 200 |
| `salat-z-pecenej-papriky-a-paradajok` | Celozrnný chlieb **4 plátky** | 4000 g | 1000 |
| `kuracie-so-spenatom-sag` | Lasagne plátky **9 ks** | 4500 g | 500 |
| `bravcovy-eintopf-s-porom` | Maslo **25 ks** | 6250 g | 250 |

Konverzia bežala **425×** naprieč 307 receptami. V čase, keď bežala, `potraviny.json` ešte
nemalo `g_za_ks`; dnes ho má (olivový olej 15 g = lyžica, kreveta 15 g, plátok eidamu 20 g),
takže sa dá zopakovať správnou váhou kusa. To je jadro opravy.

**Prečo to appka nevidela:** plán aj Výživa hlásia kurátorované `kcal_na_porciu` (pravidlo B4),
nákup kupuje suroviny. Recept s 4 kg chleba teda v pláne vyzeral na 320 kcal a v obchode
na päť kíl chleba. Appka to sama priznávala vetou „⚠️ Nákup pokrýva o 230 % viac kalórií",
ale nemala ako uhádnuť, ktoré číslo je zlé.

---

## 2. NÁLEZY PODĽA TRIEDY PRÍČINY

Sonda: `node scripts/qa/klasifikuj_mnozstva.js`. Model prijateľnosti je **dátový, nie hádaný**:
pre každú potravinu sa zo všetkých 1808 receptov spočíta **medián gramov na porciu** (väčšina
receptov je zapísaná správne, takže medián hovorí, koľko sa tej suroviny do porcie normálne dáva).
Podozrivá je surovina, ktorá medián prekročí 5× a zároveň dá viac kalórií, než má **celá** porcia
podľa deklarácie.

| trieda príčiny | zmien | čo to je |
|---|---:|---|
| **KS_BALENIE** | **226** | „N ks" × celé balenie → N × váha kusa (`g_za_ks` / `g_za_platok` / tabuľka) |
| **RUCNE** | **72** | pravidlo nevedelo rozhodnúť — každý prípad má v skripte vlastný dôvod |
| **PREPOCET** | **15** | `kcal_zdroj: "vypocet"` — nekurátorované číslo, po oprave surovín zastarané |
| **DEKLARACIA** | **11** | `kcal_na_porciu` popiera vlastný recept (14 kcal pre tapenade zo 100 g syra) |
| **PORCIE** | **10** | množstvá sedia na celý recept, `porcie` hovorí niečo iné (bochník ≠ 1 porcia) |
| **VSIAKNUTIE** | **9** | legitímne veľký nálev — nemení sa gramáž, pridáva sa podiel, ktorý sa zje |
| **DESATINNA** | **6** | posunutá desatinná čiarka (4000 g namiesto 400 g) |

**Neopravované — legitímne veľké:** voda, vývar, bujón, nálev, marináda a olej na vyprážanie
(51 receptov). Tie sa v kuchyni naozaj merajú v litroch. Olej na vyprážanie už `vsiaknutie` mal
(`musaka` 0,25 · `viedensky-rezen` 0,18 · `vyborne-vyprazane-agatove-kvety` 0,15) —
pribudlo len pri zaváraninách, kde sa nálev scedí.

**Zvyšok, ktorý pravidlo nevyriešilo: 23 výskytov** (`export/opravy_mnozstva.json`, kľúč `zvysok`).
Prešiel som ich ručne — všetky sú v poriadku: 1 kg múky na štyri neapolské pizze, 200 ml mlieka
do kakaa, 200 ml bieleho vína do „Dary mora na víne", 3 cherry paradajky v jednoporciovom šaláte.

---

## 3. TABUĽKA NAJVÝRAZNEJŠÍCH OPRÁV

| recept | surovina | pred | po | na porciu | trieda |
|---|---|---|---|---|---|
| `garlic-butter-shrimp` | Krevety | 7200 g | 200 g | 3600 → 100 g | RUCNE |
| `kuracie-fajitas` | Hladká múka | 24 000 g | 480 g | 3000 → 60 g | RUCNE (8 tortíl á 60 g) |
| `ovsena-kasa-s-brusnicami-a-orechmi` | Mlieko | 3000 g | 300 g | 3000 → 300 g | RUCNE |
| `tuniakovy-salat-so-zelenymi-fazuľkami` | Špenátové lístky | 2400 g | 60 g | 2400 → 60 g | RUCNE |
| `kokosovo-limetkovy-napoj` | Ovocný džús | 4000 g | 500 g | 2000 → 250 g | RUCNE |
| `cestovinovy-salat-s-mozzarellou…` | Mladý hrášok | 7200 g | 480 g | 1800 → 120 g | KS_BALENIE |
| `hrube-rezance-s-rukolovym-pestom` | Rukola | 3000 g | 90 g | 1500 → 45 g | KS_BALENIE |
| `pikantny-mangold-s-cukinou-a-chorizom` | Klobása chorizo | 3600 g | 360 g | 1200 → 120 g | KS_BALENIE |
| `ratatouille` | Olivový olej | 4600 g | 75 g | 1150 → 19 g | KS_BALENIE |
| `cviklovo-vajickovy-salat` | Čipsy | 2250 g | 50 g | 1125 → 25 g | RUCNE |
| `kuracie-so-spenatom-sag` | Lasagne plátky | 4500 g | 135 g | 1125 → 34 g | KS_BALENIE |
| `horuce-kakao-s-chilli` | Kryštálový cukor | 1000 g | 10 g | 1000 → 10 g | RUCNE |
| `salat-z-pecenej-papriky-a-paradajok` | Celozrnný starší chlieb | 4000 g | 120 g | 1000 → 30 g | KS_BALENIE |
| `zeleninovy-stir-fry-s-kesu` | Olivový olej | 1840 g | 30 g | 920 → 15 g | KS_BALENIE |
| `bravcovy-eintopf-s-porom` | Maslo | 6250 g | 50 g | 893 → 7 g | RUCNE |
| `bravcove-rezne-s-hubovou-omackou` | Bravčová krkovička | 1600 g | 400 g | 800 → 200 g | RUCNE |
| `treska-pecena-s-paradajkami` | Ryba biela | 1600 g | 400 g | 800 → 200 g | RUCNE |
| `bravcove-kare-s-jablkami-a-cibulou` | Syr eidam plátky | 3600 g | 240 g | 600 → 40 g | KS_BALENIE |
| `lasagne-s-mletym-masom-a-zeleninou` | Lasagne plátky | 6000 g | 180 g | 462 → 14 g | KS_BALENIE |
| `zeleny-smoothie-s-uhorkou` | Sedmokrásky | 600 g | 5 g | 600 → 5 g | RUCNE |
| `spaldova-bublanina` | Vanilínový cukor | 1000 g | 8 g | 91 → 1 g | KS_BALENIE (vrecúško) |
| `lasagne` | Med | 450 g | 20 g | 113 → 5 g | RUCNE |

**Zmenené `porcie`** (10): `pecivo-celozrnny` 1 → 12 (bochník je 12 krajcov) ·
`harula` 2 → 4 · `garlic-butter-shrimp` 1 → 2 · `mushroom-risotto` 1 → 4 (1,5 l vývaru) ·
`ryzovy-salat-s-fetou-a-olivami` 2 → 4 · `zemiakovy-gulas` 2 → 4 ·
`kacka-pecena-na-zemiakoch-a-batatoch` 1 → 2 · `listkove-medvedie-slimaciky` 1 → 4 ·
`domace-arasidove-maslo` 1 → 4 · `kokosovy-karamel` 1 → 4.

**Zmenené `kcal_na_porciu`** (11 + 15 prepočtov). Pravidlo B4 zostáva v platnosti — kurátorovanému
číslu sa verí. Menil som len tam, kde deklaráciu popiera vlastný recept:
`olivova-natierka-tapenade` 14 → 368 (100 g syra bambino má 350 kcal) ·
`seitan-steak-na-bazalkovom-fenikli` 15 → 319 · `bylinkovo-cesnakova-natierka-na-chlieb` 14 → 104 ·
`sendvic-croque-monsieur` 260 → 498 · `cuketova-omeleta` 288 → 488 ·
`hruskova-salatova-miska-s-orechmi-a-syrom` 327 → 608 · `kuraci-salat-s-ovocim` 336 → 554 ·
`mangovo-pomarancove-smoothie` 38 → 242 · `domace-arasidove-maslo`, `kokosovy-karamel`,
`garlic-butter-shrimp` (spolu so zmenou `porcie`).
Ďalších **15 receptov má `kcal_zdroj: "vypocet"`** — to číslo nikto neoveroval, dopočítal ho
`scripts/dopocitaj_kcal.js` zo surovín. Po oprave surovín bolo zastarané, takže sa prepočítalo
(napr. `polievka-z-cervenej-fazule` 107 → 213, `bravcove-so-zelim-a-zemiakmi` 581 → 295).
B4 sa na ne nevzťahuje — nie je čo kurátorovať.

**Pridané `vsiaknutie` = 0,2** (9): ocot, cukor a soľ v náleve v `kapustovo-mrkvovy-salat-s-jablkom`,
`zavarana-cvikla-s-cuketou-a-cibulou`, `nakladane-slede`, `paradajky-v-octovom-naleve`.
Nálev sa scedí — do jedla prejde asi pätina. Gramáž ani cena sa nemenia (B7): ocot musíš kúpiť celý.

---

## 4. AKO TO BEŽÍ

```
node scripts/oprav_mnozstva.js --dry     # ukáže, čo by zmenil
node scripts/oprav_mnozstva.js           # zapíše
```

Skript je **idempotentný a konvergujúci**: beží až 6 prechodov a po každom prepočíta mediány.
Bez toho by si sám schoval vinníkov — „Lasagne plátky" majú v databáze 4 výskyty a 3 z nich boli
po kilách, takže medián ukazoval 462 g na porciu a 462 g nevyzeralo podozrivo. Po prvom prechode
medián klesol na 34 g a druhý prechod zvyšné dva recepty našiel.

Pôvodné „N ks" berie z commitu `42250e7` (`git archive`), takže sa **nedotkne hodnôt, ktoré tá
konverzia nikdy nemenila** — bez tejto kotvy heuristika strieľala vedľa (chcela zmenšiť 1 kg
zemiakov v haruli a 1 kg múky na štyri pizze).

Poistky v skripte:
- **váha kusa nikdy nesmie byť celé balenie** (`VAHA_MAX`, `w < balenie_g`) — presne to bola pôvodná chyba;
- **„1 ks" veľkého balenia sypkej suroviny** (kilo múky, kilo cukru, liter oleja) → medián × porcie;
- **dolná poistka** — konverzia nesmie surovinu zmenšiť do nezmyslu (20 g cestovín na 4 porcie);
- suroviny vo vrecúšku (vanilínový cukor, prášok do pečiva, sóda, korenie) majú vlastnú tabuľku.

Kompletný zoznam všetkých 349 zmien vrátane dôvodu: `export/opravy_mnozstva.json`.

---

## 5. POISTKA V BUILDE

`generuj_kucharku.py`, funkcia **`skontroluj_mnozstva`** (volaná hneď po `skontroluj_recepty`).

**Prah: 700 g jedla na porciu**, bez vody, vývaru, bujónu, nálevu, marinády a oleja na vyprážanie.

Zdôvodnenie prahu:
- bežná porcia hlavného jedla váži **300–500 g**, veľká polievková s vývarom 600 g;
- v opravenej databáze prah prekračuje **0 receptov** — výpis teda nie je šum, ktorý sa naučíš preskakovať;
- pred opravou by bol vypísal 52 receptov, teda by chybu zachytil v deň, keď vznikla;
- je dosť voľný na to, aby prepustil zaváraniny a várky (10 kg mäsa na 24 porcií klobás),
  a dosť prísny na to, aby zachytil každú desatinnú čiarku posunutú o rád.

Vypisuje sa aj **jedna surovina nad 700 g na porciu**, aj keď celý recept prah nepresiahne —
tak sa chytí „Med 450 g" v lasagniach, kde zvyšok receptu je v poriadku.

**Nie je to tvrdý pád.** Legitímne prípady existujú (zaváranie, kysnuté cestá, kura v soľnej kruste)
a build, ktorý padá na správnych dátach, sa naučíš obchádzať. Je to rámovaný výpis do `stderr`
plus riadok v zhrnutí buildu. Kto to chce prísnejšie (CI), má **`python3 generuj_kucharku.py --striktne`**,
kde varovanie padne ako každá iná chyba dát.

Nápoje a kokteily sú z kontroly vyňaté — nápoj je z definície tekutina a džbán limonády pre dvoch
legitímne váži 1,5 kg.

Overené: po vrátení „Celozrnný starší chlieb 4000 g" build vypíše
`1034 g/porcia · Panzanella` a s `--striktne` padne.

**Filter ⟨0,5; 2⟩ v generátore, ktorý navrhovalo QA, som NEPRIDAL** — a nielen preto, že je to
zakrytie symptómu. `data/app.js` mám zakázané meniť. Navyše po oprave dát už nemá čo zachraňovať:
`node scripts/qa/navrh_opravy_kcal.js` hlási, že by dnes vyhodil **47 receptov namiesto 127**
a pomer by posunul z 1,15 na 1,08. Odporúčanie pre agenta, ktorý vlastní `app.js`, je nižšie.

---

## 6. ČO ZOSTALO — a prečo to už nie je chyba množstiev

Zvyšných ~11–15 % rozdielu medzi nákupom a plánom **nie sú poškodené množstvá**. Rozklad
(5 seedov, plán vs. suroviny vs. nákup):

```
plán (deklarované kcal)      : 92 742
suroviny podľa plánu         : 113 767   → pomer 1,23   ← celý rozdiel je tu
nákup (skutočný zoznam)      : 112 933   → pomer 0,99 voči surovinám
```

Nákupný zoznam teda **nekupuje nič navyše** — balenia, špajza ani zaokrúhľovanie rozdiel nerobia.
Rozdiel je celý medzi deklaráciou a surovinami a má dve zložky:

1. **Kurátorované `kcal_na_porciu` býva systematicky nižšie** než dopočet zo surovín. Medián
   celej databázy je 1,00, ale pri konkrétnych receptoch to kolíše ±20 %.
2. **Generátor vyberá recepty podľa deklarovaných kcal**, takže recept s podhodnotenou deklaráciou
   sa mu javí „menší" a ľahšie sa vojde do slotu — **uprednostňuje práve tie podhodnotené.**
   Preto je priemer vybraných receptov (1,15) horší než priemer databázy (1,00).

Skúsil som to zavrieť hromadným prepísaním deklarácií (prah 1,5×, 140 receptov). Pomer klesol
na 1,11, ale **metriky generátora sa zhoršili**: medián bielkovín 118,5 → 116,1 g, dní pod 80 g
bielkovín 0 → 2,9 %. Preto som to zavrhol a nechal len 11 prípadov, kde deklaráciu popiera
vlastný recept. Je to zapísané v komentári v `scripts/oprav_mnozstva.js`, nech to nikto neskúša znova.

**Odporúčanie pre agenta, ktorý vlastní `data/app.js`:** v `_poolPreSlotVypocet` zúžiť pásmo
výberu z ⟨0,5; 2⟩ na ⟨0,7; 1,4⟩. Odstráni to výberové skreslenie z bodu 2 a podľa
`scripts/qa/navrh_opravy_kcal.js` posunie pomer na ~1,08 pri strate 47 receptov z 1961 (2,4 %).

---

## 7. TÝŽDENNÝ NÁKUP — prečo 13 kg nevychádza

| | pred | po |
|---|---|---|
| kg / týždeň (2 osoby) | 23,5 | **18,4** |
| kg na osobu a deň | 1,68 | **1,31** |
| hustota košíka | 1,75 kcal/g | **1,17 kcal/g** |

Cieľ „pod ~13 kg" som nesplnil a myslím si, že sa splniť nedá bez zmeny receptov, nie dát.
Aritmetika:

- domácnosť má 1450 + 1200 kcal/deň = **18 550 kcal/týždeň**;
- pri pomere 1,11 nakúpi ~20 600 kcal;
- pri hustote košíka 1,17 kcal/g je to **17,6 kg**. Aj pri dokonalom pomere 1,00 by to bolo 15,9 kg;
- na 13 kg by košík musel mať **1,43 kcal/g** — teda podstatne menej zeleniny a viac pečiva,
  cestovín a tuku.

Zloženie dnešného košíka (kg/týždeň): zelenina a ovocie **7,1** · mliečne a vajcia 3,8 ·
mäso a ryby 3,4 · trvanlivé 1,3 · pečivo 1,0 · zvyšok pod 0,4. Sedem kíl zeleniny pre dvoch
je 500 g na osobu a deň — to nie je nafúknuté číslo, to je odporúčaná dávka.
Čísla „10–12 kg" z finálneho QA reportu predpokladali košík s hustotou ~1,7 kcal/g,
čo je presne tá hustota, ktorú mala **pokazená** databáza (1,75) — kilá chleba, lasagní a oleja.

Inými slovami: **18,4 kg je skutočné jedlo, ktoré tá domácnosť naozaj zje.** 23,5 kg bolo
5 kg vymysleného chleba navyše.

---

## 8. METRIKY — čo sa zmenilo a čo to znamená

`node scripts/metriky.js 30 <seed>`, štyri seedy, aby bolo vidieť šum generátora:

| metrika | pred (seedy 42/7/101/2026) | po (tie isté seedy) | verdikt |
|---|---|---|---|
| dní v ±10 % cieľa pred škálovaním | 98,6 · 100 · 100 · 100 % | 97,1 · 98,6 · 97,1 · 100 % | v šume; na predvolenom seede **100 %** |
| dní v ±10 % po škálovaní | 100 % | **100 %** | drží |
| poradie O > V > R > S | 100 % | **100 %** | drží |
| medián bielkovín/deň | 117,5 · 117,7 · 116,6 · 117,1 g | 115,4 · 115,7 · 118,1 · 114,9 g | −1,3 g (viď nižšie) |
| dní pod 80 g bielkovín | 1,4 · 1,4 · 0 · 1,4 % | 2,9 · 4,3 · 1,4 · 1,4 % | +1,6 b. |
| vláknina/deň (priemer) | 22,8 · 22,9 · 22,1 · 22,8 g | 17,3 · 18,2 · 17,5 · 18,1 g | **−5 g** |
| unikátnych receptov / 30 týždňov | 285 (predvolený seed) | **287–291** | lepšie |
| položiek nákupu bez ceny | 0 / 70 | **0 / 70** | drží |

**Vláknina a bielkoviny klesli, lebo to boli vymyslené čísla.** `vlaknina` sa v `_vyzivaVypocet`
zámerne **neškáluje** faktorom `k` (komentár B4: „ich chyba je z chýbajúcich dát, nie z hmoty").
Kým bol v Panzanelle **1 kg chleba na porciu**, appka do dňa započítala **107 g vlákniny z jedného
šalátu** — a Panzanella padla do plánu v 20 z 20 testovaných týždňov. To isté s bielkovinami:
`garlic-butter-shrimp` s 3,6 kg kreviet na porciu dával 840 g bielkovín.

Najväčšie „straty" vlákniny sú presne tie recepty: chlieb 4000 → 120 g (−104 g vlákniny/porcia),
hrášok 7200 → 480 g (−84 g), kakao 200 → 12 g (−62 g), špenát 2400 → 60 g (−52 g).
Žiadne z tých čísel nikto nikdy nezjedol.

**22,9 g vlákniny nebola métа, bola to chyba merania.** Skutočná vláknina tohto jedálnička je
17,5–18 g/deň, čo je pod odporúčaných 25–30 g. To je **reálna, novo viditeľná úloha pre agenta
generátora** (pool a váhy), nie regresia, ktorú by som mal zakryť tým, že vrátim kilá chleba.
Rovnako 2,9 % dní pod 80 g bielkovín (6 dní z 210) je odteraz pravda, nie 0 % z nafúknutých surovín.

---

## 9. VEDĽAJŠIE OPRAVY

- **`test_regresie` R1 znovu prechádza.** Padal na `zeleninovy-stir-fry-s-kesu`, ktorý mal
  8133 z 8942 kcal z neoznačeného oleja — bolo to 1840 g olivového oleja (2 ks × 920 g).
  Po oprave na 30 g je R1 zelené bez toho, aby som sa testu dotkol.
- **`test_regresie` R2b — oprava testu, nie appky.** Výnimka „potravina s cena100 === 0 je
  legitímne zadarmo" bola napísaná ako `r.p && r.p.cena100 === 0`, lenže riadok nákupu pole `p`
  nemá — tá vetva nikdy neplatila a fungovalo len doslovné `/^voda$/`, ktoré neprepustilo
  „Voda horúca". Kontroluje sa príznak `bezCeny`, ktorý appka sama vyrába v `dovodBezCeny`.
- **„Burrito seasoning mix" → „Korenie na burrito"** (`ranajkovy-burrito`). Anglický názov sa
  nepároval na žiadnu potravinu, takže položka išla do nákupu bez ceny. Teraz sa páruje na „korenie".
- Build `scripts/qa/build_bezpecnost.sh` naďalej chytá **6/6** nebezpečných vstupov.

---

## 10. NOVÉ NÁSTROJE

| skript | čo robí |
|---|---|
| `scripts/oprav_mnozstva.js` | samotná oprava — konverguje, `--dry` ukáže náhľad, dôvod ku každej zmene |
| `scripts/qa/klasifikuj_mnozstva.js` | nálezy podľa **príčiny** (KS_BALENIE / DESATINNA / JEDNOTKA / PORCIE / NALEV / DEKLARACIA) |
| `scripts/qa/nakup_hmotnost.js` | koľko **kilogramov** si nákup vypýta na týždeň pre dvoch, + položky ≥ 1,5 kg |
| `export/opravy_mnozstva.json` | všetkých 349 zmien s pôvodnou aj novou hodnotou a dôvodom |

Overovacia sada, ktorá po oprave prechádza celá:

```
python3 generuj_kucharku.py                 # 0 varovaní o množstvách
node test_vypocty.js … test_odolnost.js     # 10/10
node test_regresie.js                       # 12 kontrol, 0 otvorených chýb
node scripts/qa/nakup_vs_plan.js            # medián 1,15
node scripts/qa/audit_mnozstva.js           # 8 podozrivých, 0 nad 1200 g/porcia
node scripts/qa/nakup_hmotnost.js           # 18–19 kg / týždeň
node scripts/metriky.js 30
```
