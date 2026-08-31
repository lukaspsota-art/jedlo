# Report — agent **DÁTA-KCAL** (vyprážaný olej + kalorické odľahlé hodnoty)

Branch `agent4`, commit `b7982e1`. Menené len `recepty/*.json` (polia `kcal_na_porciu`,
`kcal_zdroj`, nový príznak `vsiaknutie` na ingrediencii) a `scripts/`.
`data/app.js`, `data/potraviny.json` ani `data/sablona.html` som sa nedotkol.

---

## 1. Rozsah problému s vyprážaným olejom — menší, než sa čakalo

`scripts/audit_olej.js` prešiel všetkých 1956 receptov. Zadanie čakalo „desiatky" receptov;
skutočnosť je **10**. Prečo:

| meranie | počet |
|---|---|
| receptov, ktoré v postupe vôbec spomínajú vyprážanie (`vypráž/fritéz/hlbok…`) | **45** |
| z nich s tukom > 60 kcal na porciu | 15 |
| receptov s tukovou surovinou > 30 g/porciu **a** vyprážaním v postupe | **2** |
| receptov, kde tuk NIE je zjedený (vyprážanie + nálev + marináda) — finálny zoznam | **10** |

Väčšina slovenských receptov (hlavne z Varechy) má olej ako `„podľa chuti"` → `mnozstvo: null`
→ do výživy nevstupuje vôbec. Preto sa problém neprejavuje plošne. Recept
`treska-v-cesticku` z CLAUDE.md už medzitým **nie je** ten prípad — má `kcal_na_porciu: 394`
a olej `podľa chuti`; poznámku v CLAUDE.md treba prepísať.

**Dôležitejší nález než samotné kcal:** `_vyzivaVypocet` deklarovanému `kcal_na_porciu` verí (B4),
ale bielkoviny, tuky, sacharidy a **cenu preškáluje faktorom `k = deklarované / dopočítané`**.
Nafúknutý olej teda neznižuje len presnosť kcal — pri musake stlačil `k` na 0,43, takže recept
ukazoval **43 % skutočných bielkovín a 43 % ceny**. Toto je hlavný dôvod, prečo sa oplatí
zaviesť koeficient vsiaknutia v engine, nie len prepísať číslo.

### Zavedený mechanizmus: `vsiaknutie` na ingrediencii

```jsonc
{ "nazov": "Slnečnicový olej", "mnozstvo": 600, "jednotka": "ml",
  "poznamka": "500–700 ml, na vyprážanie", "vsiaknutie": 0.25 }
```

`vsiaknutie` = číslo 0–1, **podiel suroviny, ktorý sa naozaj dostane do jedla**.
Je **na ingrediencii, nie na recepte** — jeden recept mieša oboje: musaka má 600 ml oleja
na vyprážanie (vsiakne ~25 %) **aj** 170 g masla v bešamele (zje sa celé). Recept-level
`olej_vsiaknutie` by bešamelové maslo nesprávne odpísal.

Použité koeficienty a ich zdôvodnenie:

| koef. | situácia | prečo |
|---|---|---|
| 0,12 | nálev v pohári (nakladaná zelenina/syr) | olej sa zleje, na surovine zostane len film |
| 0,15 | cestíčko (batter) v hlbokom oleji | hladký povrch nasiakne menej |
| 0,18 | trojobal múka–vajce–strúhanka | strúhanka nasaje viac než cestíčko |
| 0,20 | opekanie v kaluži oleja na panvici (ryba, obalené mäso) | kratší kontakt, menšia plocha |
| 0,25 | plátky baklažánu / cukety / zemiakov | hubovitá zelenina nasaje najviac |
| 0,30 | marináda, z ktorej sa mäso pred grilovaním vyberie | väčšina marinády ostane v miske |
| 1,00 | restovanie, zásmažka, cesto, nátierka | **nie je vyprážanie** — tuk sa zje celý, príznak sa nedáva |

### Opravených 10 receptov

| id | dôvod | tuk pred | kcal/porcia pred | po |
|---|---|---|---|---|
| `vyborne-vyprazane-agatove-kvety` | 500 ml, cestíčko | 460 g | 421 | **107** |
| `hubovy-cordon-bleu` | 500 ml, trojobal | 460 g | 344 | **177** |
| `losos-so-sosovicou` | 200 ml na panvici | 202 g | 416 | **299** |
| `medailoniky-z-bravcovej-panenky-s-parmezanom` | kaluž olej+masť+maslo | 173 g | 418 | **297** |
| `musaka` | 600 ml na plátky zeleniny | 756 g | 430 (ponechané) | 430 · dopočet 1008 → 703 |
| `nakladana-mozzarella` | 500 ml nálev | 455 g | 196 (ponechané) | 196 · dopočet 436 → 215 |
| `nalozene-papriky` | 600 ml nálev | 552 g | 50 (ponechané) | 50 · dopočet 228 → 56 |
| `nakladany-hermelin-na-kyslo` | 250 ml nálev | 230 g | 205 (ponechané) | dopočet je neúplný (Hermelín) |
| `jelenie-v-pikantnej-marinade` | 150 ml marináda | 138 g | 356 (ponechané) | dopočet je neúplný (Karé jelenie) |
| `jahnacie-kare-s-baklazanovym-kaviarom-a-raviolou` | 150 ml naloženie | 184 g | 426 (ponechané) | dopočet je neúplný (Karé jahňacie) |

Prvé štyri mali `kcal_na_porciu` **presne rovné** nafúknutému dopočtu (t. j. číslo bolo kedysi
dopočítané, nie kurátorované) → prepísané, `kcal_zdroj: "korekcia_olej"`.
Zvyšné majú buď skutočne kurátorovanú hodnotu (Kaufland, Fitrecepty), alebo im v dopočte chýba
hlavná bielkovina — prepis by ich podstrelil ešte viac. Dostali len `vsiaknutie`; po zmene
v `app.js` sa im narovnajú makrá a cena.

---

## 2. ŠPECIFIKÁCIA ZMENY PRE `data/app.js` (pre agenta, ktorý robí engine)

Jediné miesto zmeny je **`_vyzivaVypocet`** (`data/app.js`, ~riadok 165), vnútri
`(r.ingrediencie||[]).forEach(i => { … })`, hneď za výpočtom `const g = gramy(i,p);`
a za existujúcou poistkou `if(!(g>0)&&i.mnozstvo!=null){ … }`.

**Pôvodný blok:**
```js
const g=gramy(i,p);
if(!(g>0)&&i.mnozstvo!=null){ zname=true; return; }
kc+=g*p.kcal/100; b+=g*p.bielkoviny/100; t+=g*p.tuky/100; s+=g*p.sacharidy/100;
if(g>0 && p.cena100==null) bezCeny++;
cena+=g*(p.cena100||0)/100; vl+=g*(p.vlaknina||0)/100; na+=g*(p.sodik||0)/100;
hmota+=g; if(p.vlaknina!=null)hmotaVl+=g; if(p.sodik!=null)hmotaNa+=g;
```

**Nový blok:**
```js
const g=gramy(i,p);
if(!(g>0)&&i.mnozstvo!=null){ zname=true; return; }
// B7: `vsiaknutie` = podiel suroviny, ktorý sa naozaj zje. Olej na vyprážanie/nálev/marinádu
// sa z 300 ml (2650 kcal) skonzumuje z 10–30 %. Do VÝŽIVY ide len zjedená hmota `gz`,
// do CENY a do nákupu naďalej celé `g` — olej sa musí kúpiť celý.
const vs=(typeof i.vsiaknutie==="number"&&i.vsiaknutie>=0&&i.vsiaknutie<=1)?i.vsiaknutie:1;
const gz=g*vs;
kc+=gz*p.kcal/100; b+=gz*p.bielkoviny/100; t+=gz*p.tuky/100; s+=gz*p.sacharidy/100;
if(g>0 && p.cena100==null) bezCeny++;
cena+=g*(p.cena100||0)/100; vl+=gz*(p.vlaknina||0)/100; na+=gz*(p.sodik||0)/100;
hmota+=gz; if(p.vlaknina!=null)hmotaVl+=gz; if(p.sodik!=null)hmotaNa+=gz;
```

Pravidlá, ktoré sa NESMÚ zmeniť:
- **`gramy()` sa nemení.** Nákupný zoznam, špajza a `odpisRecept` musia ďalej pracovať
  s plným množstvom — 600 ml oleja sa naozaj kupuje.
- **`cena` zostáva na plnom `g`** (viď riadok vyššie) — inak by nákup a cena porcie nesedeli.
- Vláknina a sodík sa škálujú `gz` (sú to skutočné živiny v jedle), ale naďalej sa
  **nepreškáľujú** faktorom z `kcal_na_porciu` — B4 to má správne.
- `vsiaknutie` je voliteľné; chýbajúce/neplatné = 1, teda dnešné správanie.

Ďalšie (voliteľné, ale odporúčané) drobnosti:
1. **Editor vlastného receptu** (`ulozRecept` / formulár ingrediencií): pri prestavbe objektu
   ingrediencie zachovaj `vsiaknutie` (dnes sa skladá z pevných polí a pole by sa stratilo).
   Ideálne pridať do formulára voliteľné pole „koľko % sa zje" pre olej na vyprážanie.
2. **Detail receptu**: pri surovine s `vsiaknutie < 1` zobraz poznámku typu
   „600 ml na vyprážanie · do jedla ide ~25 %", nech je používateľovi jasné, prečo kcal nesedia
   s hrubým súčtom.
3. **Test**: `test_vypocty.js` — nová kontrola, že recept s `vsiaknutie: 0.2` na ingrediencii
   má kcal a tuky presne 5× nižšie z tejto suroviny, ale **cenu rovnakú**, a že
   `nakupPolozky` naďalej nakupuje plných 600 ml.
4. Po zmene enginu doplniť do `test_harness.js` `EXPORT_TAIL` nič netreba — nová konštanta
   nevzniká.

---

## 3. Kalorické odľahlé hodnoty

`scripts/audit_kcal_outliers.js` porovnáva `kcal_na_porciu` s dopočtom zo `potraviny.json`.

| | pred | po |
|---|---|---|
| receptov s deklaráciou aj dopočtom | 1919 | 1931 |
| odchýlka > 10 % (v UI „≈ odhad") | 415 | **365** |
| **odchýlka > 40 %** | **114** | **62** |
| receptov bez `kcal_na_porciu` | 37 | **25** |

Prešiel som **všetkých 116** riadkov nad 40 % (nielen 60) a rozhodol pri každom.
Rozdelenie príčin:

| príčina | počet | čo som s tým urobil |
|---|---|---|
| **chyba v deklarácii** (dopočet je úplný a dôveryhodný) | 54 | prepísané na dopočet, `kcal_zdroj: "vypocet"` |
| **chyba v `porcie`** (recept počíta dávky/bochníky, nie porcie) | 22 | **nemenené** — `porcie` nie je moje pole, zoznam nižšie |
| **chyba v párovaní** na `potraviny.json` | 9 | nemenené, zoznam v §5 |
| **chýbajúca surovina / `g_za_ks`** (dopočet neúplný) | 28 | nemenené, zoznam v §5 |
| výnimky (test B4, „1 porcia = celá dóza") | 3 | nemenené |

Pravidlá prepisu sú zapísané priamo v `scripts/oprav_kcal_outliers.js` (tabuľky
`ZLE_PAROVANIE`, `VYNIMKY`, `VYNUT`, stropy `STROP_KCAL` / `STROP_G` na porciu podľa kategórie),
takže sa dajú prebehnúť znova a skontrolovať.

### Najvýraznejšie opravy

| id | pred | po | dôvod |
|---|---|---|---|
| `pohankove-krupky-so-skoricou` | 1837 | **939** | deklarovaných 1837 bola celá dávka (1877 kcal), nie porcia |
| `syrove-rozky-s-bylinkami` | 114 | **372** | 500 g múky na 7 rožkov — 114 kcal/rožok je nemožné |
| `marocke-kuracie-tagine-s-citronom` | 304 | **674** | 8 kuracích stehien (1040 g) na 4 porcie |
| `kuracie-rolky` | 278 | **608** | 540 g kuracích pŕs + 2 PL oleja na 2 porcie |
| `cestoviny-s-cicerom-a-paradajkami` | 394 | **844** | 100 ml oleja + cestoviny + cícer na 4 porcie |
| `tortillove-hovadzie-kebaby` | 556 | **858** | mleté hovädzie + tortilly |
| `kura-na-paprike` | 560 | **827** | vykostené stehná + cestoviny |
| `syrove-chipsy-pecene` / `syrove-tycinky-pecene` | 158 | **333** | 300 g syra + 300 g šunky + 6 vajec na 6 porcií |
| `limoncello-sunrise` | 190 | **388** | 100 ml limoncella je samo 350 kcal |
| `madarsky-hemendex` | 284 | **523** | |
| `thajske-kuracie-kari` | 400 | **707** | |
| `snack-hummus-zelenina` | 221 | **69** | 1249 kcal na 18 porcií = 69, nie 221 |
| `salat-z-pecenej-papriky-a-paradajok` | 358 | **153** | pečená paprika a paradajky nemajú 358 kcal/porcia |
| `kuracie-na-sposob-vindaloo` | 374 | **179** | |
| `libanonsky-salat-tabbouleh` | 305 | **166** | |
| `trojfazulovy-salat` | 342 | **173** | |
| `kukuricny-chlieb` | 299 | **147** | |
| `nakladane-slede` | 270 | **138** | |
| `salat-mexicka-pasta-s-ciernou-fazulou` | 434 | **255** | |
| `ciccerove-kari-vegetarianske` | 456 | **258** | |

Celý zoznam 70 zmenených hodnôt je v `git show b7982e1 -- recepty`.

### 12 receptov dostalo `kcal_na_porciu` po prvý raz
`scripts/dopocitaj_kcal.js` (upravený tak, aby súbory **nepreformátoval**):
`bellini` 145 · `brynzovy-sendvic-slaninka` 584 · `citronovy-napoj-so-zazvorovou-limonadou` 34 ·
`matovo-ovocne-smoothie` 307 · `menemenovy-sendvic` 584 · `mimosa` 28 · `musubi-sunka-vajce-havajsky` 584 ·
`paloma` 97 · `screwdriver` 130 · `sex-on-the-beach` 74 · `simit-syrovy-sendvic` 584 · `tequila-sunrise` 110.
Zvyšných 25 receptov bez `kcal_na_porciu` dopočítať nejde — chýba im napárovanie surovín (§5c).

> Pozn. pre agenta na recepty: `brynzovy-sendvic-slaninka`, `menemenovy-sendvic`,
> `musubi-sunka-vajce-havajsky` a `simit-syrovy-sendvic` majú **identický zoznam ingrediencií**
> (chlieb 4 ks + šunka + tvrdý syr + tatárska omáčka) — názvy sú rôzne, obsah je kópia.
> Preto majú všetky 584 kcal. Nie je to chyba kcal, je to chyba receptov.
> `mimosa` má šampanské bez množstva (`podľa chuti`), preto vyšlo 28 kcal namiesto ~120.

---

## 4. Extrémy zdravého rozumu (< 30 / > 1800 kcal na porciu)

Prešiel som všetkých 18 (dnes 15 + 3).

**Nad 1800 — všetky 3 sú v poriadku, sú to zásoby, nie porcie:**
`domace-arasidove-maslo` 2597, `lieskovooriskovy-krem` 2209, `prepustene-maslo` 1906 —
„1 porcia" = celá dóza/pohár. Opravený bol štvrtý, `pohankove-krupky-so-skoricou` (1837 → 939).

**Pod 30 kcal:**

| id | kcal | verdikt |
|---|---|---|
| `gumovi-medvidci-bez-cukru` | 6 (bolo 11) | **v poriadku** — 170 kcal na 30 medvedíkov |
| `celozrnne-piskoty` | 14 | **v poriadku** — 650 kcal na 60 piškót |
| `bazalkova/broskynova/domaca-citronova/jablcna/kivi-limonada` | 29 | **v poriadku** — limonády s medom, dopočet 39 |
| `zazvorovo-citronovy-napoj-na-prechladnutie` | 26 | **v poriadku** |
| `mimosa` | 28 | chýba množstvo šampanského (recept, nie kcal) |
| `gazpacho` | 14 | **chyba receptu** — z TheMealDB sa preniesol len paradajkový pretlak, chýba uhorka, paprika, chlieb, olej |
| `bylinkovo-cesnakova-natierka-na-chlieb` | 14 | **chyba dát** — `Syrokrém` nenapárovaný, `Maslo 0,25 ks` = 0 g |
| `cesnakova-natierka-s-bazalkou-a-olivovym-olejom` | 14 | to isté |
| `olivova-natierka-tapenade` | 14 | **chyba dát** — `Zelené olivy 1 ks` a `Syr bambino 1 ks` = 0 g |
| `seitan-steak-na-bazalkovom-fenikli` | 15 | **chyba dát** — `Seitan steak 1 ks` nenapárovaný |
| `bezlepkove-lievance-s-javorovym-sirupom` | 26 | **chyba dát** — `Palacinky bezgluténové v prášku Novalim 1 ks` |

Tie štyri „chyby dát" sa nedajú opraviť bez `potraviny.json` — sú v §5.

---

## 5. Pre agenta, ktorý robí `potraviny.json`

### 5a. Chybné párovanie — kľúč sadol na inú potravinu a nafúkol/podfúkol kcal

| recept | surovina | sadlo na | dôsledok |
|---|---|---|---|
| `dusene-musle` | „Mušle" 1,5 kg | **`müsli`** | 380 kcal/100 g namiesto ~86 → 1606 kcal/porcia |
| `hovadzi-vyvar-so-zeleninou` | „Hovädzí vývar" 600 ml | **`hovädzie`** | 250 kcal/100 g namiesto ~4 |
| `drstkova-polievka` | „Hovädzí vývar z bujónu" 2000 ml | **`hovädzie`** | 5000 kcal z vývaru |
| `hovadzie-na-hriboch` | „Vývar hovädzí domáci" | **`hovädzie`** | to isté |
| `smoothie-z-hrozna-citrona-a-ananasu` | „Hrozno" 240 ml | **`hrozienka`** | 299 kcal/100 g namiesto 69 |
| `cestoviny-s-tuniakom-a-citronom` | „Tuniak v olivovom oleji" 160 g | **`olivový olej`** | 884 kcal/100 g |
| `grecke-tzatziki-salatove-osviezenie-z-uhoriek-a-jogurtu` | „Olej olivový extra panenský" | **`olivy`** | 145 namiesto 884 kcal/100 g |
| `bang-bang-kuracie-rezance` | „Kuracích rezancov" (mäso) | **`rezance`** | mäso sa počíta ako cestoviny |
| `kuzlo-pod-cibulou` | „Prsia kuracie 4 **plátok**" | `kura`, ale plátok = 20 g | 80 g kuraťa na 5 porcií |

**Návrh:** pridať presné kľúče `hovädzí vývar` / `vývar hovädzí`, `mušle`, `hrozno`,
`tuniak v oleji`, `olej olivový` (aby kľúč `olivy` nevyhral), `kuracie rezance`,
a `g_za_platok` pre `kura`.

### 5b. Jednotka „ks/plátok" bez `g_za_ks` / `g_za_platok` → 0 g (43 prípadov v odľahlých receptoch)

Najčastejšie: `Mozzarella` (3×), `Kryštálový cukor` (3×), `Šunka` (2×), `Maslo` (2×),
`Tavený syr` (2×), `Mlieko` (2×), `Sterilizovaný cícer`, `Tofu`, `Kokosová smotana`,
`Hráškové struky`, `Olivový olej`, `Krevety`, `Kalamáre`, `Krabie tyčinky`, `Syr bambino`,
`Cola`, `Kakaový prášok`, `Bazalkové listy`, `Parmezán`, `Vlašské orechy`, `Ovsené vločky`,
`Smotana na šľahanie`, `Stužovač šľahačky`, `Tuniak vo vlastnej šťave`, `Kapary v náleve`,
`Paradajkový pretlak`, `Syr eidam plátky`, `Zelené olivy`, `Ľad`, `Soľ` (4×).
Úplný zoznam s počtami sa vypíše cez:
`node -e` snippet v §6, alebo `node scripts/audit_kcal_outliers.js` (stĺpec „bez gramov").

### 5c. Úplne nenapárované suroviny (41 v odľahlých receptoch)

Podstatné (hlavná bielkovina, bez nej je recept kaloricky nezmyselný):
`Predvarené držky`, `Hruď teľacia`, `Karé jelenie`, `Karé jahňacie`, `Danielí chrbát`,
`Kačica`, `Bravé karé` (preklep, má byť „Bravčové karé"), `Údený pstruh`, `Špekáčiky`,
`Makaróny krátke`, `Mozarella` (preklep), `Heremelín` (preklep), `Seitan steak`.
Ostatné: `Syrokrém`, `Kocka syrokrému`, `Bešamel`, `Jemný Ajvar`, `Gulášová pasta`,
`Shan´shi Teriyaki omáčka`, `Cognac`, `Cointreau`, `Vaječný koňak`, `Dlhé piškóty`,
`Papaya`, `Cantaloupe`, `Žltý melón`, `Rebarbora`, `Granola`, `Proteínový prášok`,
`Sardelové filetky`, `Veto`, `Fruit`, `Fruit punch`, `Káva`, `Zapekacie misky` (nie je potravina),
`Huby šitake`, `Ovocný džús`, `Vločky`, `Pečivo`, `Mrazená zelenina`, `Zelenina`,
`Orechy vlašské posekané na hrubo`, `Vajíčka uvarené natvrdo`, `Agátové kvety`.

### 5d. Zle nastavené `porcie` (pre agenta na recepty, nie na potraviny)

22 receptov, kde `porcie` počíta dávky/bochníky. Deklarované kcal sú rozumná porcia,
ale dopočet zo surovín vychádza 2–6× vyššie:
`zemiakovy-chlieb-v-rimskom-hrnci-romertopf` (2 bochníky z 1 kg múky),
`granola-s-mandlovym-maslom` (2 porcie z 615 g granoly), `jablckova-granola`,
`madarsky-gulas-nasa-verzia` (2 porcie z 1,5 kg mäsa), `telaci-smotanovy-gulas`,
`kukuricny-dip`, `sladky-dynovy-dip`, `dip-z-arasidoveho-masla`, `pecenova-pasteta-s-vinom`,
`pasteta-z-peceneho-kurata`, `cuketove-chipsy-s-parmazanom`, `chipsy-z-cervenej-repy`,
`pikantne-kura-ryza-plech`, `dary-mora-na-vine`, `kari-indonezsky-tofu`,
`paradajkove-rizoto-s-tofu`, `chrumkave-kusky-z-bocika`, `zemlova-knedla`,
`tarhona-s-bryndzou`, `husta-gulasova-polievka-z-mleteho-masa`,
`pecene-kura-so-zeleninou-z-jedneho-plechu`, `hummus-s-cervenou-repou`.
Plus `hovadzi-steak-s-cesnakovym-maslom` (500 g krkovice na „1 porciu", deklarovaných 134 kcal)
a `polievka-z-volskeho-chvosta…` (948 g na porciu).

---

## 6. Nové a upravené skripty

| súbor | čo robí |
|---|---|
| `scripts/audit_olej.js` | nájde recepty s neprimeraným tukom + vyprážaním; `--prah N`, `--json` |
| `scripts/audit_kcal_outliers.js` | odchýlka deklarácia vs. dopočet; `--prah N`, `--extremy`, `--json` |
| `scripts/oprav_olej.js` | zapíše `vsiaknutie` + prepočíta kcal (kurátorovaná tabuľka s dôvodmi) |
| `scripts/oprav_kcal_outliers.js` | zosúladí kcal s dopočtom tam, kde je dopočet úplný |
| `scripts/lib_patch_json.js` | **textové** úpravy `recepty/*.json` bez preformátovania (súbory majú 3 štýly odsadenia aj CRLF) |
| `scripts/dopocitaj_kcal.js` | upravený tak, aby používal `lib_patch_json` namiesto `JSON.stringify` |

---

## 7. Overenie

```
python3 generuj_kucharku.py              ✅ 1956 receptov, build prešiel
node test_vypocty.js                     ✅ 31 kontrol
node test_generator.js                   ❌ A2 (medián bielkovín 90,6 g, prah 95) — padal aj v baseline (94,4 g)
node test_nakup.js                       ✅ 15 kontrol
node test_ux.js                          ⚠  D1 „4 prekreslenia pod 1,5 s" je v tomto kontajneri flaky
                                            (2049 ms) — padá aj na nezmenených dátach, 2 z 3 behov OK
node test_prepocty.js                    ✅
node test_porcie.js                      ✅
1956/1956 súborov je platný JSON
```

### Metriky (`node scripts/metriky.js 20`) — baseline vs. po zásahu

| metrika | BASELINE | po | |
|---|---|---|---|
| priemer kcal/deň (po škálovaní) | 1436 | **1450** | presnejšie na cieľ 1450 |
| dní v ±10 % cieľa po škálovaní | 98,6 % | **100 %** | ↑ |
| priemer vlákniny/deň | 11,1 g | **13,8 g** | ↑ (makrá už nie sú stlačené faktorom) |
| položiek nákupu bez ceny | 6 / 69 | **0 / 70** | ↑ |
| Obed ≥ Večera | 100 % | 100 % | = |
| dní v ±10 % pred škálovaním | 58,6 % | 51,4 % | ↓ |
| celé poradie O>V>R>S | 96,4 % | 91,4 % | ↓ |
| medián bielkovín/deň | 97,9 g | 94,2 g | ↓ |
| dní pod 80 g bielkovín | 12,9 % | 25,7 % | ↓ |
| cena týždňa | 120,94 € | 131,61 € | ↑ (reálnejšia, makrá už nie sú podhodnotené) |

**K poklesu bielkovín:** je to **šum generátora, nie regresia**. Faktor B4 škáluje kcal aj
bielkoviny rovnako, takže **bielkoviny na kcal sa mojimi zmenami nemenia** — mení sa len to,
ktoré recepty padnú do kcal-okna slotu, a tým celá náhodná postupnosť. Overené:

| beh (40 týždňov) | medián bielkovín | dní pod 80 g |
|---|---|---|
| baseline, seed 20260818 | 94,3 g | 21,8 % |
| **baseline, seed 12345** | **89,5 g** | **29,3 %** |
| po zásahu, seed 20260818 | 90,8 g | 26,8 % |
| po zásahu (len opravy > 100 %), seed 20260818 | 89,8 g | 22,1 % |

Rozptyl medzi seedmi na nezmenených dátach (94,3 vs. 89,5 g) je väčší než rozdiel
pred/po. Menší zásah (7 opráv) dal dokonca nižší medián než väčší (54 opráv) — smer zmeny
teda s metrikou nekoreluje. Skutočnú príčinu pomenúva CLAUDE.md: slabé sú raňajky
(2,8 g bielkovín/100 kcal) a snacky (2,4) — to je práca pre agenta na recepty/potraviny.

---

## 8. Čo treba prepísať v `CLAUDE.md` (návrh pre agenta, ktorý vlastní dokumentáciu)

- Sekcia „Stav a otvorené veci": odrážka o `treska-v-cesticku` už neplatí — recept má
  `kcal_na_porciu: 394` a olej `podľa chuti`. Nahradiť odkazom na `vsiaknutie`.
- Sekcia „Dátové modely", model Recept: doplniť
  `ingrediencie[{nazov, mnozstvo|null, jednotka, poznamka?, vsiaknutie?}]` —
  *`vsiaknutie` 0–1 = podiel suroviny, ktorý sa naozaj zje (olej na vyprážanie, nálev, marináda);
  do nákupu a ceny ide vždy plné množstvo.*
- `kcal_zdroj` má teraz dve hodnoty: `"vypocet"` a `"korekcia_olej"`.
