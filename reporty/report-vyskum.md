# Report VÝSKUM — čo appke naozaj chýba

**Agent:** VÝSKUM · **Dátum:** 30. 8. 2026 · **Vetva:** `c4` · **Build:** `kucharka.html` 4,94 MB, 1956 receptov, 882 potravín, 5 jedálničkov

**Metóda.** Najprv som prečítal `PRODUCT.md`, `NAVOD.md`, `CLAUDE.md`, `INSPIRACIA.md`, `STAV_PO_VLNE1.md`. Potom som appku vygeneroval (`python3 generuj_kucharku.py`) a prešiel ju v Chromiu na viewporte **393×850** (Nothing Phone 3a Pro) — Domov, Recepty, Plán, Nákup, Výživa, Špajza, Nastavenia, detail receptu, režim varenia, generovanie týždňa, nákup po vygenerovaní. Skripty prechodu sú v `scripts/vyskum/` (`prechod.js`, `prechod2.js` … `prechod6.js`, `overenie15.js`, `cena_rozbor.js`), snímky v `e2e/screenshoty/vyskum/`. Až potom som robil rešerš konkurencie. **Každé tvrdenie o konkurencii má odkaz, každé tvrdenie o appke má buď snímku, výpis z prehliadača alebo riadok v `data/app.js`.**

---

## 0. Rozhodnutie v troch vetách

Appka je v jadre plánovania **lepšia než komerčná konkurencia** — blokový batch cooking s varnými dňami, stravníci s rôznymi kalóriami zdieľajúci jednu várku, generátor s tvrdými doménovými pravidlami a 1956 receptov s dohľadateľným zdrojom robí niečo, čo Mealime ani Eat This Much nevie. Slabina nie je v plánovaní, je **za ním**: v obchode (odškrtávanie cez 20×20 px, 85 riadkov, z toho 16 korenín a 15× „podľa chuti", cena 131–207 € na týždeň pre dvoch), pri hrnci (nula fotiek z 1956 receptov, jedlá vyberáš z abecedného zoznamu, ktorý začína koktailmi) a po varení (nič nezachytí, čo naozaj zostalo a čo si naozaj zjedol). **Ďalšie kolo nemá pridávať funkcie do Plánu — má opraviť nákup, dať generátoru rozpočet a zaviesť „zvyšok v mrazničke" ako stav.**

---

## 1. Porovnávacia tabuľka

Vybral som 12 appiek, ktoré sú pre tento prípad najrelevantnejšie (nie najznámejšie). Legenda: **✅** má a robí dobre · **◐** má čiastočne/za peniaze · **❌** nemá.

| Schopnosť | **Táto appka** | Mealime | Eat This Much | Plan to Eat | Paprika 3 | Mealie | Tandoor | Grocy | Bring! | AnyList | Crouton | MacroFactor | Cronometer |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Batch cooking / bloky s varným dňom** | ✅ **A/B/C, varný deň v hlavičke bloku** | ❌ | ❌ | ◐ „Prep for Freezer" [1] | ❌ | ❌ | ❌ | ◐ „Consume recipe" s výstupným produktom [2] | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Auto-generátor týždňa na kalorický cieľ** | ✅ + tvrdé pravidlá (obed≥večera, obed≠večera, iná báza raňajok/blok) | ◐ | ✅ (týždeň len v Premium) [3] | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (recenzia: „nerozhoduje, čo variť") [4] | ❌ | ❌ |
| **Viac stravníkov s RÔZNYMI kcal z jednej várky** | ✅ **unikát** | ◐ len veľkosť domácnosti | ❌ 1 profil | ❌ | ❌ | ◐ households (roly, nie kcal) [5] | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Ceny jedla v € a cena týždňa** | ✅ €/porcia, €/deň, €/týždeň | ❌ | ◐ odhad (recenzia: reálne až 2× viac) [3] | ❌ | ❌ | ❌ | ✅ meal cost [6] | ✅ náklady/porcia [2] | ◐ akcie | ◐ ceny položiek (platené) [7] | ❌ | ❌ | ❌ |
| **Rozpočet ako obmedzenie generátora** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Nákup po oddeleniach** | ✅ pevné poradie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| **Poradie oddelení podľa MÔJHO obchodu** | ❌ (`PORADIE_ODDELENI` je konštanta) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ aisle sorting [6] | ◐ | ✅ „customizable ordering to match specific supermarket layouts" [8] | ✅ [7] | ❌ | — | — |
| **Odškrtávanie v obchode jednou rukou** | ❌ **riadok 284×26 px otvára info-okno; odškrtne len 20×20 px** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| **Špajza / zásoby + expirácie** | ✅ miesto, expirácia, minimum, odpis po varení | ❌ | ◐ „virtual pantry" [3] | ✅ | ✅ | ◐ | ✅ | ✅ **plná kontrola dostupnosti receptu** [2] | ❌ | ❌ | ❌ | ❌ | ❌ |
| **„Mám na to doma?" pri recepte (3 stavy)** | ◐ len radenie „najviac z mojej špajze" | ❌ | ❌ | ❌ | ◐ | ❌ | ◐ | ✅ *Enough / už na zozname / nedostatok* [2] | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fotky receptov** | ❌ **0 / 1956** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◐ | ✅ | ◐ platené [7] | ✅ | — | — |
| **Režim varenia (kroky, časovače, obraz. nezhasne)** | ✅ + hlasové čítanie | ✅ hands-free | ◐ | ◐ | ✅ [9] | ◐ | ◐ | ❌ | ❌ | ❌ | ✅ **Apple Design Award 2024** [4] | ❌ | ❌ |
| **Import receptu z URL/textu/fotky v appke** | ❌ (robí to Claude mimo appky) | ❌ | ❌ | ✅ | ✅ clipper [9] | ✅ | ✅ | ◐ | ✅ | ◐ 5 zdarma za život [7] | ✅ + AI foto (extra predplatné) [4] | ✅ | ✅ |
| **Denník skutočného príjmu (nie plánu)** | ❌ | ◐ export do Apple Health | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Mikroživiny** | ◐ vláknina + sodík | ❌ | ◐ | ❌ | ❌ | ❌ | ◐ | ❌ | ❌ | ❌ | ❌ | ◐ ~16 živín [10] | ✅ **~84 živín, NCCDB** [10] |
| **Adaptívny kalorický cieľ z trendu váhy** | ✅ váhový denník + „Prispôsobiť cieľ" | ❌ | ◐ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **best-in-class, 7–21 dňové okno** [10] | ❌ |
| **Plne offline, bez účtu, bez siete** | ✅ **jeden súbor 4,9 MB** | ❌ | ❌ | ❌ | ✅ lokálne úložisko [9] | ❌ | ❌ | ◐ self-host | ❌ | ❌ | ◐ | ❌ | ❌ |
| **Slovenské recepty a slovenské €** | ✅ 1365× Varecha.sk, ceny v € | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ◐ SK letáky | ❌ | ❌ | ❌ | ❌ |
| **Cena za rok** | **0 €** | 49,99 $ [11] | 60 $ [3] | ~49 $ | ~5 $ mobil + ~30 $ desktop [9] | 0 € | 0 € | 0 € | 8,99 $ [8] | 9,99–14,99 $ [7] | 24,99 $ + 14,99 $/rok [4] | 71,99 $ [10] | 54,95 $ [10] |

### Kde je táto appka objektívne lepšia
1. **Blokový batch cooking je celý model, nie doplnok.** Plan to Eat má „Prep for Freezer" ako vedľajšiu funkciu [1], Grocy vie výstupný produkt z receptu [2] — ale ani jedna appka nestavia týždeň okolo *„navaríš v nedeľu večer, ješ Po–Ut"*, s varným dňom v hlavičke bloku a plánom varenia na celý blok. Overil som v prehliadači: hlavička bloku píše „Blok C · So–Ne · 🍳 plán varenia (Pi večer)".
2. **Stravníci s rôznymi kalóriami z jednej várky.** Nenašiel som appku, ktorá to rieši. Ollie má profily na osobu, ale iba pre alergie a preferencie, nie pre delenie jednej várky podľa kalorického dopytu [12]. Mealime má dokonca strop 4 porcie po dvoch — najžiadanejšia zmena v ich komunite [11].
3. **Offline single-file bez účtu.** Jediné, čo sa tomu blíži, je Paprika (lokálne úložisko) [9] a self-hosted Mealie/Tandoor — ale tie potrebujú Docker a server; cooklang porovnanie explicitne píše, že Mealie ani Tandoor offline nefungujú [5].
4. **Ceny v eurách a slovenské recepty.** Žiadna z 12 appiek nemá slovenskú databázu potravín s €/100 g.
5. **Tvrdé doménové pravidlá v generátore.** Poradie obed ≥ večera, obed ≠ večera, iná báza raňajok na blok, sendviče Po–Pi — to je pravidlový systém, aký INSPIRACIA odporúčala ako #1 („Planner Rules") a už je postavený.

### Kde je horšia
1. **Nákup v obchode.** Riadok je 284×26 px a ťuknutie naň otvára info-okno (`onclick="…surovinaInfo(…)"`, `data/app.js:~1790`); odškrtne sa len 20×20 px checkbox. Každá iná appka v tabuľke odškrtne položku ťuknutím kamkoľvek na riadok. Toto je **jediná najhoršia interakcia v appke** a deje sa presne v tom nepriateľskom kontexte, ktorý popisuje `PRODUCT.md`.
2. **Fotky.** 0 z 1956 (`recepty/fotky/` neexistuje, žiadny recept nemá `foto`; v detaile receptu je **0 `<img>` a ani obrázkový zástupný prvok**). Každá komerčná appka fotky má.
3. **Import receptu.** V `data/app.js` nie je `fetch`, `ld+json`, OCR ani nič podobné — appka vie iba ručný formulár `novyRecept()`. Mealie, Tandoor, Paprika, Plan to Eat, Crouton, Samsung Food to vedia z URL jedným ťuknutím [5][9][13].
4. **Mikroživiny.** Vláknina + sodík proti Cronometeru s ~84 živinami na databáze NCCDB [10].
5. **Denník skutočného príjmu.** Výživa ukazuje **plán**, nie to, čo si zjedol. Nikde sa nezapíše „obed som vynechal". MacroFactor a Cronometer stoja práve na tomto.

### Kde je vyrovnaná
Nákup po oddeleniach a agregácia množstiev, tlač, tmavý režim, škálovanie porcií, hodnotenia a poznámky, alergény a diétne filtre, adaptívny cieľ z trendu váhy (tu lepšie než u všetkých okrem MacroFactora), režim varenia s časovačmi.

---

## 2. Čo appka sľubuje a nedodáva

Prešiel som 15 funkcií z `NAVOD.md` po jednej v prehliadači (`scripts/vyskum/overenie15.js`).

| # | Sľub v `NAVOD.md` | Realita | Verdikt |
|---|---|---|---|
| 1 | Obľúbené (hviezda na karte) | hviezda je v mriežke, stav `S.fav` | ✅ |
| 2 | Hodnotenie 1–5 + poznámka | `S.hodn`, `S.pozn` v stave, hviezdičky v detaile | ✅ |
| 3 | Filtre kategória/kuchyňa/čas/diéta | `f-kuchyna`, `f-cas`, `f-diet`, `f-sort` + chipy | ✅ |
| **4** | **Fotky receptov** | **0 / 1956 receptov má `foto`; `recepty/fotky/` neexistuje; v detaile 0 `<img>` a ani zástupný obrázok** | ❌ **nedodané** |
| 5 | Plánovač Po–Ne × 4 sloty | funguje, blokový aj denný režim | ✅ |
| 6 | Nákupný zoznam z plánu | 73–85 položiek, sčítané | ✅ |
| 7 | Nákup po oddeleniach | ✅ ale **poradie je konštanta `PORADIE_ODDELENI` (`app.js:1654`)** — nedá sa prispôsobiť obchodu | ◐ |
| 8 | „Čo mám doma" → návrh receptov | je (radenie „🧊 Najviac z mojej špajze", `mamZoSpajze`, `skoreReceptu`) | ✅ |
| 9 | Makrá zo surovín | ✅ | ✅ |
| 10 | Kalorický cieľ + upozornenie | ✅ | ✅ |
| 11 | Alergény a diétne značky | `alergenyReceptu`, badge „⚠ lepok / sója / sezam" v detaile — videl som | ✅ |
| **12** | **Import z fotky/textu/odkazu** | **appka to nevie.** V `data/app.js` nie je fetch, JSON-LD parser ani OCR. Existuje len ručný formulár `novyRecept()`. `NAVOD.md` to priznáva („spraví Claude"), ale je to v zozname funkcií appky. | ❌ **nedodané appkou** |
| 13 | Prepočet porcií, ml→lyžice, imperiálne | ✅ prepínač g/ml · lyžice · oz/cup v detaile — videl som | ✅ |
| 14 | Režim varenia (kroky, časovače, obrazovka nezhasne) | Kroky, viac súbežných časovačov, hlasové čítanie — všetko funguje (snímka `50-varenie.png`). Wake Lock sa žiada v `app.js:736`; overil som, že `navigator.wakeLock` je dostupné aj pri otvorení cez `file://` (Chromium považuje `file://` za secure context), takže sľub platí aj pri otvorení dvojklikom. Na samotnom Nothing Phone som to netestoval. | ✅ |
| 15 | Tlač / export do PDF | `tlacRecept`, `tlacTyzden`, `tlacView` + `@media print` | ✅ |

**Nové zistenia nad rámec fotiek a importu:**

- **7 · Poradie oddelení sa nedá zmeniť.** V Kauflande a v Lidli sa chodí inak. `PORADIE_ODDELENI` je hard-coded konštanta.
- **Nákup má zlé oddelenia.** V mojom vygenerovanom týždni skončili v oddelení **„Zelenina a ovocie"**: *Cesnaková omáčka, Omáčka mango, Kyslé uhorky*. V obchode to znamená hľadať majonézu pri paradajkách.
- **Nákup má zlé jednotky.** Videl som: **„Pekinská kapusta — 750 ml"**, **„Sušený cesnak — 36 ml"**, **„Petržlenová nasekaná vňať — 66 ml"**, **„Borievky — 0 g"**, v detaile receptu **„Uvarená ryža — 4,8 PL"**. Ryža na lyžice a kapusta v mililitroch.
- **`test_regresie.js` R5 stále reprodukujem v prehliadači.** Poškodený `localStorage`: `S.spajza=5` → *„S.spajza.filter is not a function"*, `S.uvarene="text"` → *„S.uvarene.slice(...).map is not a function"*. Domov sa v oboch prípadoch nevykreslí. (`S.plan=true` a `S.fav=[]` prežijú.)
- **Stored XSS cez meno stravníka sa mi reprodukovať nepodarilo** — vložil som `<img src=x onerror=…>` do `profil.stravnici[0].meno` a skript sa nespustil. Netvrdím, že je opravený všade (názov uloženého jedálnička som netestoval), len že touto cestou nevyšiel.

---

## 3. Chýbajúce schopnosti — zoradené podľa hodnoty pre TEBA

Kritérium nie je „koľko appiek to má", ale „koľko to ušetrí jednej domácnosti na Slovensku, ktorá varí v blokoch, má cieľ ~1450 kcal/os./deň a nakupuje v Kauflande/Lidli/Bille". Preto tu **nie sú** veci ako komunitné zdieľanie, donáška, Apple Health či AI chat — pre milión používateľov dávajú zmysel, tebe nie.

### ⭐ 1. Odškrtávanie celého riadku v nákupe + režim „som v obchode"
**Čo to je.** Ťuknutie kamkoľvek na riadok položku odškrtne. Info-okno („v ktorom recepte, čím nahradiť") sa presunie na dlhé podržanie alebo na malý „ⓘ" vpravo. K tomu prepínač, ktorý v obchode skryje ceny a balenia a nechá len názov + množstvo, riadky ≥44 px.
**Prečo tu.** `PRODUCT.md` píše, že telefón v obchode je hlavný režim: jedna ruka, košík v druhej, zlé svetlo. Dnes musíš trafiť **20×20 px** a keď netrafíš, otvorí sa dialóg, ktorý musíš zavrieť. To je jediné miesto, kde je appka horšia než každá appka v tabuľke. Redditové sťažnosti na nákupné zoznamy sú presne o tomto: *„clunky imports, too many taps"* [14].
**Náročnosť.** **Malá.** Prehodenie `onclick` na riadku, `checkNakup` namiesto `surovinaInfo`, CSS `min-height:44px`, jeden prepínač do `S.profil`.
**Vyžaduje.** Nič navyše. Zmena v `renderNakup` + CSS v `sablona.html`.

### ⭐ 2. Rozpočet ako vstup generátora
**Čo to je.** Pole „max € na týždeň" v dialógu generovania a cenový člen vo váhe receptu, plus zobrazenie „ušetríš X €" keď je surovina v akcii.
**Prečo tu.** Overil som `_vahaVypocet` (`app.js:1123`): váha ráta hodnotenie, sezónnosť, akciu, watch-list, expirácie, hustotu bielkovín a kupované snacky — **cena tam nie je vôbec**. `GEN_SK = {turnaj, b, kcal, vl, …}` tiež nie. Dôsledok som odmeral: vygenerovaný týždeň pre 2 osoby stál **131 € v spotrebe a 208 € v celých baleniach**, ťahané krevetami (12,10 €), Quornom (10,08 €), lososom (9,97 €) a tuniakom (9,08 €) — generátor ide po hustote bielkovín a nemá dôvod nesiahnuť po najdrahšom zdroji. To je **~9,30 €/osoba/deň pri 1450 kcal**, čo je pre slovenskú domácnosť približne dvojnásobok toho, čo by malo byť. `STAV_PO_VLNE1.md` to má ako otvorenú otázku („cena týždňa 120,94 → 220,47 € ❓ overiť") — toto je odpoveď: nie je to chyba výpočtu, je to chýbajúce obmedzenie. Presne na to sa sťažujú aj používatelia Eat This Much: *„weekly lists can run near 2× the app's estimate"* [3].
**Náročnosť.** **Stredná.** Cena receptu sa už počíta (`cenaTyzdna`, `nakupCenaSpotreba`), takže ide o pridanie člena do `_vahaVypocet`/`skoreJedla` a o jeden prechod, ktorý vymení najdrahšie jedlo, kým sa týždeň nezmestí do rozpočtu — analogicky k existujúcemu `zlepsiBielkoviny` (hill-climb).
**Vyžaduje.** Overiť ceny v `potraviny.json` (bez toho by rozpočet optimalizoval fikciu) a nový test do `test_generator.js`.

### ⭐ 3. „Zvyšok" ako stav, nie ako ručný token
**Čo to je.** Po dokončení varenia sa zapíše, koľko porcií vzniklo a koľko sa zjedlo; prebytok ide do „mrazničky" so zoznamom „X porcií Y z 24. 8.". Pri plánovaní ďalšieho týždňa sa dá zvyšok umiestniť do slotu a **nákup ho nekúpi znova**.
**Prečo tu.** Toto je jadro batch cookingu a appka je od neho krok. Infraštruktúra už existuje: token `left:<id>` sa do kcal ráta a do nákupu nie (`app.js:770`, `1601`) a `umiestniZvysok` ho vie položiť (`app.js:1003`) — **ale nikto nikde nezapíše, koľko zvyšku vlastne je**. Plan to Eat presne toto rieši ako „Prep for Freezer": zadáš počet jedál a porcií, appka upraví množstvá, mrazničku vedie so „servings, number of meals, date frozen" a pri naplánovaní pridá poznámku „rozmraziť deň vopred" [1]. Grocy to má ako „Consume recipe" s voliteľným výstupným produktom [2].
**Náročnosť.** **Stredná.** Nový kus stavu `S.mraznicka[]` + hák do `krok()` na konci varenia (tam už je dialóg „Odpísať suroviny zo špajze?", `app.js:756`) + položka do výberu jedla v pláne.
**Vyžaduje.** Rozhodnúť, či to je samostatná vec alebo iba typ položky v `S.spajza` (miesto = mraznička). **Odporúčam druhé** — špajza už má miesto, expiráciu aj minimum a nechceš dve evidencie.

### ⭐ 4. Poradie oddelení podľa obchodu + potlačenie šumu v zozname
**Čo to je.** (a) Presúvateľné poradie oddelení, uložené na profil obchodu (Kaufland / Lidl / Billa). (b) Označenie potravín ako „mám vždy doma" (soľ, korenie, olej, ocot) — do zoznamu sa dostanú len ako pripomienka, keď dochádzajú, nie každý týždeň.
**Prečo tu.** V mojom týždni malo **16 z 85 riadkov oddelenie „Korenie a bylinky"** (Borievky 0 g, Kardamóm 11 g, Oregano 5 g, Čierne mleté korenie 2 g…) a ďalších **15 riadkov bolo „podľa chuti"** bez množstva. To je **36 % zoznamu, ktorý nekupuješ.** `CLAUDE.md` má pravidlo „pantry staples vždy do nákupu" — dáva zmysel pre múku a ryžu, nie pre 2 g čierneho korenia. Bring! má vlastné poradie podľa layoutu konkrétneho obchodu [8], Tandoor a AnyList tiež [6][7]. INSPIRACIA to má ako #5 a #11 a stále to nie je postavené.
**Náročnosť.** **Malá až stredná.** Poradie = pole v `S.profil` namiesto konštanty `PORADIE_ODDELENI` + jednoduchý zoznam so šípkami hore/dole (nie drag & drop, ten je na telefóne bolestivý). Staples = príznak v `potraviny.json` + filter v `nakupPolozky`.
**Vyžaduje.** Prejsť `potraviny.json` a označiť staples (~80–120 položiek). Jednorazová práca.

### 5. Fotka pri recepte — aspoň niečo
**Čo to je.** Nie 1956 fotiek. **Konzistentný vizuálny zástupca:** veľké emoji podľa kategórie/hlavnej suroviny na farebnom podklade odvodenom z názvu, aby sa karty od seba líšili. A možnosť pridať vlastnú fotku k receptu, ktorý naozaj varíš, cez `<input type="file">` → `FileReader` → data URI do `localStorage`.
**Prečo tu.** Mriežka 1956 receptov bez fotiek je stena textu; v detaile nie je **ani obrázok, ani zástupný prvok** (overil som: 0 `<img>`). Fotky ku všetkým receptom sú v `NAVOD.md` roky odložené („väčšia práca") — a správne, lebo 1956 obrázkov by rozbilo 4,9 MB single-file. Ale vlastné fotky pri ~30 receptoch, ktoré reálne varíte, sú lacné a robia z appky vašu kuchárku.
**Náročnosť.** **Malá.** Zástupca je čisté CSS + hash názvu. Vlastná fotka: `FileReader`, zmenšenie cez `<canvas>` na ~400 px, uloženie do `S.fotky[id]`.
**Vyžaduje.** Strop na veľkosť (localStorage má ~5 MB) — zmenšovať a limitovať počet.

### 6. Denník „čo som naozaj zjedol"
**Čo to je.** V pláne pri každom jedle ťuknutie „zjedené / vynechané / iné". Výživa potom ukazuje dve čiary: plán a skutočnosť.
**Prečo tu.** Máš cieľ 1450 kcal a adaptívny cieľ z trendu váhy. Ten trend sa ale dnes porovnáva s **plánom**, nie s príjmom — a keď v stredu obed vynecháš, appka o tom nevie a „Prispôsobiť cieľ" ti poradí na základe fikcie. MacroFactor stavia celý adaptívny algoritmus na skutočnom príjme v 7–21 dňovom okne [10]. Bez tohto je adaptívny cieľ v appke slabší, než vyzerá.
**Náročnosť.** **Malá.** Jeden trojstavový príznak na (deň, slot) v `S`, druhý rad v grafe Výživy.
**Vyžaduje.** Nič. Ale pozor na disciplínu — ak sa to nebude klikať, čísla budú horšie než teraz.

### 7. Pri recepte: „mám na to doma?" v troch stavoch
**Čo to je.** Grocy model — pri každom recepte značka **„máš všetko" / „chýba 2 veci, sú na nákupe" / „chýba 2 veci"** a tlačidlo „doplniť chýbajúce do nákupu" [2].
**Prečo tu.** Špajza aj `skoreReceptu` (mám/chýba) už existujú; dnes ich vidno len ako *radenie* „🧊 Najviac z mojej špajze". Ako značka priamo na karte je to o rád užitočnejšie — najmä keď plán zlyhá a v stredu večer treba niečo z toho, čo je v chladničke.
**Náročnosť.** **Malá.** Funkcia je hotová, chýba jej zobrazenie.
**Vyžaduje.** Aby špajza bola naplnená — čo je jej najväčší problém (viď nižšie).

### 8. Rýchle naplnenie špajze z nákupu
**Čo to je.** Po nákupe jedno tlačidlo „nakúpené → do špajze": odškrtnuté položky sa pridajú ako zásoby s množstvom, ktoré si kúpil.
**Prečo tu.** Špajza je pri mojom prechode **prázdna** a nič ju nenapĺňa automaticky — všetko sa zadáva ručne. To je presne to, na čom padajú špajzové appky. Recenzie NoWaste (3,2/5): *„You need to add how many milligrams… the amount of calories, and everything down to the minute detail"* a *„each item takes up so much room… you have to do a lot of scrolling"* [15]. Bez lacného plnenia je špajza mŕtvy modul a s ňou padnú aj body 3 a 7.
**Náročnosť.** **Malá.** Nákup už vie, čo je odškrtnuté (`S.nakupCheck`) a koľko toho je.
**Vyžaduje.** Nič.

### 9. Vlastné poradie / lepšia predvoľba v Receptoch
**Čo to je.** Zmeniť predvolené radenie mriežky a pridať „najlacnejšie" a „naposledy pridané".
**Prečo tu.** Prvá obrazovka Receptov na mobile ukazuje: *155 Belmont · 3-Mile Long Island Iced Tea · 4 x fazuľa · A midsummernight dream · Abbey Cocktail · Abbey Martini* — **päť koktailov z prvých šiestich**. V databáze je 63 koktailov + 62 nápojov + 153 dezertov = **278 receptov (14 %), ktoré v meal-prep pláne na 1450 kcal nikdy nepoužiješ**, a stoja na začiatku abecedy. Ponuka radenia je `predvolené · špajza · A–Z · najrýchlejšie · najmenej kcal · najviac kcal · najlepšie hodnotené` — **cena tam nie je**, hoci sa pri každej karte zobrazuje.
**Náročnosť.** **Veľmi malá.** Zmena predvoleného kľúča + dve položky do `f-sort`.
**Vyžaduje.** Nič.

### 10. Import receptu z textu vloženého do appky
**Čo to je.** Textové pole „nalep sem recept" → jednoduchý parser, ktorý rozdelí ingrediencie a kroky a napáruje suroviny cez `najdiPotravinu`.
**Prečo tu.** `NAVOD.md` sľubuje import a appka ho nemá. Fetch z URL offline nikdy nepôjde — ale **90 % hodnoty importu je v parsovaní, nie v sťahovaní**. Skopírovať text z prehliadača a nalepiť ho vieš aj offline. Reddit sťažnosť na túto kategóriu: appky zvládajú čisté webové importy, ale nie *„screenshoty, fotky stránok z kuchárok, staré ručne písané karty"* [14].
**Náročnosť.** **Stredná.** Parser „množstvo + jednotka + názov" pre slovenčinu, ale máš už `gZaJednotku`, `povoleneJednotky` aj `najdiPotravinu` — teda ťažšiu polovicu.
**Vyžaduje.** Rozhodnutie, že ručne opravovať 20 % zle rozparsovaných riadkov je v poriadku.

### Vedome NEODPORÚČAM (aj keď to konkurencia má)
- **Živé letáky Kaufland/Lidl/Billa z internetu.** Vyžaduje sieť a scraping stránok tretích strán; `S.akcie` je dnes zoznam slov bez cien, takže z akcie aj tak nevypadne konkrétna úspora. Kým nie sú spoľahlivé ceny, pridáva to len ilúziu presnosti.
- **OCR bločkov / skener čiarových kódov.** Knižnica by rozbila single-file a databáza čiarových kódov je online služba.
- **Komunitné zdieľanie, donáška, Instacart.** Na Slovensku bezpredmetné.
- **Plné mikroživiny (84 živín ako Cronometer).** Dáta pre 882 slovenských potravín neexistujú v použiteľnej forme; vláknina + sodík je správny strop.
- **AI chat nad receptami.** Potrebuje model, teda sieť.

---

## 4. Čo vyhodiť alebo zjednodušiť

Toto vypadlo z prechodu appkou, nie z porovnávania.

1. **„⋯ Viac" znamená na jednej obrazovke tri rôzne veci.** Na Domove je „⋯ Viac" pri rýchlych akciách (obsahuje: *Uvar zo špajze · Dojedz zvyšky · Výživa za týždeň*), v Pláne je „⋯ Viac" pri generovaní (*Nastavenie generovania, Zamiešať, Uložiť…*) a v spodnej lište je „⋯ Viac" pre navigáciu. Tri menu s tou istou menovkou naraz na obrazovke. **Premenuj ich** (napr. „Ďalšie akcie", „Možnosti plánu", nav nechať ako „Viac") alebo zruš to na Domove — tri položky sa tam zmestia priamo.
2. **Dva paralelné výberové systémy pre jedlo v pláne.** V bunke je súčasne `✕` pri každom komponente, `✎ zmeniť`, `+ pridať`, `⋯ viac` a klik na názov otvára recept. `CLAUDE.md` píše „v bunke plánu je 1 primárna akcia + ⋯ viac", ale v naplnenej bunke som napočítal 4 ovládacie prvky na komponent. Presuň `✕` do `⋯ viac`.
3. **Nastavenia generovania vs. Nastavenia domácnosti sú z veľkej časti tá istá vec.** Dialóg „Zostaviť jedálniček" obsahuje stravníkov, cieľ kcal, zámer, diéty (ryby/lepok/laktóza), zakázané suroviny, akcie — všetko duplikuje sekciu Nastavenia. Používateľ nemá ako vedieť, ktoré vyhráva. **Nechaj v dialógu len to, čo je iné pre TENTO týždeň** (dni bez varenia, koľko ľudí, pravidlá pre rozsah dní, akcie) a na zvyšok daj odkaz „upraviť v Nastaveniach".
4. **Zoznam 47 kuchýň v selecte pravidla generovania.** *Estónska, Etiópska, Maltská, Uruguajská, Portugalsko-africká, Západoafrická…* — na telefóne je to nekonečný roletník. Nechaj 10–12, ktoré máš v databáze viac než 20-krát, a „iné".
5. **Tri miesta, kde sa nastavuje to isté.** Stravníkov, cieľ kcal, zámer a diéty zadávaš v úvodnom sprievodcovi, znova v Nastaveniach a tretíkrát v dialógu „Zostaviť jedálniček". Videl som všetky tri obrazovky obsahovať tie isté polia. Nechaj jedno miesto pravdy (Nastavenia) a inde len odkaz.
6. **63 koktailov + 62 nápojov v hlavnej mriežke.** Nemazať — ale dať ich za jeden filter „Nápoje a koktaily" a vylúčiť z predvoleného zobrazenia. Sú to 3× viac receptov než všetky prílohy dokopy a v meal-prep pláne na 1450 kcal nemajú miesto.
7. **„v celých baleniach ~207,81 €" ako druhý súčet hneď pod prvým.** `NAVOD.md` v12 hovorí, že primárne je exaktné množstvo a balenie je len v zátvorke — ale hlavička ukazuje obe sumy vedľa seba a rozdiel 50 € vyzerá ako chyba. Nechaj jednu sumu, druhú za ťuknutím.

---

## 5. Odporúčanie — 5 vecí, ktoré by som postavil ako ďalšie

| # | Čo | Prečo práve toto | Náročnosť |
|---|---|---|---|
| **1** | **Nákup použiteľný jednou rukou** — celý riadok odškrtáva, ≥44 px, info na „ⓘ"; režim „v obchode" (bez cien a balení); staples a „podľa chuti" zbalené pod „Základné veci (skontroluj)"; oprava zlých oddelení a jednotiek (`Pekinská kapusta 750 ml`, `Cesnaková omáčka` v zelenine) | Toto je jediné miesto, kde je appka horšia než celá tabuľka konkurencie, a je to hlavný scenár z `PRODUCT.md`. Zároveň zmizne 36 % šumu zo zoznamu. Najväčší pomer úžitku k práci v celom backlogu. | **Malá** (1 vlna) |
| **2** | **Rozpočet v generátore** — pole „max €/týždeň", cenový člen vo váhe receptu, prechod „zlacni týždeň" analogický k `zlepsiBielkoviny`, v nákupe „ušetril si X € oproti bežnému výberu" | Odmerané: 131–208 €/týždeň pre dvoch, ~9,30 €/os./deň pri 1450 kcal, ťahané krevetami a lososom. `_vahaVypocet` cenu nepozná vôbec. Bez tohto je „Ceny" v appke iba displej, nie nástroj — a `STAV_PO_VLNE1.md` má cenu ako otvorenú otázku. | **Stredná** (1 vlna, treba nový test) |
| **3** | **Zvyšok a mraznička ako stav** — po varení zapíš, koľko porcií vzniklo a koľko sa zje; prebytok do špajze s miestom „mraznička"; pri plánovaní ho vieš položiť do slotu a nákup ho nekúpi znova. K tomu **„nakúpené → do špajze"** jedným tlačidlom. | Dokončuje batch cooking, ktorý je najsilnejšia vec appky, a zároveň oživuje špajzu, ktorá je dnes prázdna, lebo ju nič nenapĺňa. Token `left:` a `umiestniZvysok` už existujú — chýba len množstvo. Plan to Eat („Prep for Freezer") a Grocy („Consume recipe" s výstupom) ukazujú, ako to má vyzerať. | **Stredná** (1 vlna) |
| **4** | **Recepty, ktoré vyzerajú ako jedlo** — konzistentný vizuálny zástupca podľa kategórie/suroviny, vlastná fotka z telefónu (canvas → data URI → `localStorage`), predvolené radenie inak než abecedne, „najlacnejšie" a „naposledy pridané" do `f-sort`, nápoje a koktaily mimo predvoleného zobrazenia | Prvá obrazovka Receptov dnes ukazuje päť koktailov zo šiestich. Fotky sú jediná funkcia z `NAVOD.md`, ktorá je 100 % nedodaná, a 1956 fotiek nikdy nebude — ale zástupca a 30 vlastných fotiek áno. | **Malá** |
| **5** | **Odolnosť a poctivosť čísel** — opraviť R5 (poškodený `localStorage` zhodí Domov: `S.spajza=5`, `S.uvarene="text"` — reprodukované), R1 (vyprážaný olej, pole `vsiaknutie` v receptoch existuje, `_vyzivaVypocet` ho nečíta), rozchod Plán vs. Nákup 9,5 %, 42 receptov s vymyslenými makrami | Body 2 a 3 stoja na cene a na výžive. Ak sú tie čísla o 9,5 % (v najhoršom týždni +50 %) vedľa, optimalizuješ šum. A appka, ktorú zhodí jedna zlá hodnota v `localStorage`, je offline appka bez záchrannej siete — nemáš server, ktorý to opraví. | **Stredná** (väčšinou už zadefinované v `report-data-kcal.md` a `test_regresie.js`) |

**Poradie je zámerné.** 1 je najlacnejšie a najviac cítiť. 2 a 3 sú to, čím appka prerastie konkurenciu tam, kde už teraz vedie. 4 je kozmetika s veľkým dopadom na to, či sa appka používa. 5 je poistka — bez nej sa 2 a 3 stavajú na piesku.

**Čo NErobiť v ďalšom kole:** ďalšie funkcie do Plánu a generátora. `NAVOD.md` má 14 verzií a väčšina pridávala do plánovania. Plánovanie je hotové a je lepšie než u konkurencie. Rozbité je to, čo sa deje po ňom.

---

## 6. Čo v `INSPIRACIA.md` chýba alebo je zastarané

`INSPIRACIA.md` (25 appiek, 16. 7. 2026) je dobrá a väčšina jej TOP-12 je medzitým postavená (bloky, špajza, expirácie, akcie, watch-list, adaptívny cieľ, vodný tracker, viac časovačov, okno jedenia). Doplnenia:

1. **Chýba téma „nákup v obchode ako fyzická činnosť".** Report rieši *obsah* zoznamu (oddelenia, balenia, ceny), nie *interakciu* (veľkosť cieľa, jedna ruka, čo sa stane pri ťuknutí). To je pritom najhoršie miesto v appke.
2. **Chýba rozpočet ako obmedzenie.** Report má „prepojenie akcií na nákup" (#4) a „napárovanie akcie na plán" (#7), ale nikde nie je „generuj tak, aby sa týždeň zmestil do X €". Práve to je rozdiel medzi appkou, ktorá cenu ukazuje, a appkou, ktorá cenu rieši.
3. **Chýba denník skutočného príjmu.** MacroFactor je v reporte kvôli adaptívnemu cieľu a trendovej hmotnosti (#21, #22), ale nie kvôli tomu, na čom ten algoritmus stojí — na logovanom príjme.
4. **„Automatic leftovers" (#3) je označené ako vysoký dopad a stále nie je postavené** — a `INSPIRACIA` ho popisuje príliš úzko („dávka sa rozpočíta do viacerých dní"), čo blokový režim už robí. Skutočná diera je *evidencia zvyšku po bloku*.
5. **Odhad realizovateľnosti pri „Import receptu z URL" (#10) je zavádzajúci.** Označené ako „čiastočne — fetch potrebuje sieť". V praxi je použiteľná verzia **nalepenie textu**, ktorá sieť nepotrebuje vôbec — a je to príležitosť, nie prekážka.
6. **Ceny predplatných sú zastarané.** Mealime bolo v reporte 2,99 $/mes., dnes je Pro **49,99 $/rok** resp. 5,99 $/mes. po zmene free vrstvy [11][16]; Crouton má dnes rozdelené *Plus* (24,99 $ jednorazovo) a *Discover* (14,99 $/rok) [4]. Poznámka pod tabuľkou to pripúšťa, ale čísla sú v tele reportu.
7. **Nové mená, ktoré v reporte nie sú a stoja za sledovanie:** **KitchenOwl** (household-first, čiastočne offline nákupný zoznam so sync-om [5]) a **Ollie** (profily na člena domácnosti — najbližšie k „viac stravníkov", pričom stále nerieši rôzne kalórie z jednej várky [12]).

---

## 7. Zdroje

[1] Plan to Eat — Freezer Cooking: https://learn.plantoeat.com/help/app-freezer-cooking
[2] Grocy — Recipe Management and Meal Planning (DeepWiki nad `grocy/grocy`): https://deepwiki.com/grocy/grocy/2.2-recipe-management-and-meal-planning · https://grocy.info/
[3] Eat This Much Review 2026 (ProMealPlan): https://www.promealplan.com/en/blog/eat-this-much-review-2026
[4] Crouton App Review 2026 (Pann): https://www.pann-app.com/blog/crouton-app-review
[5] Tandoor vs Mealie vs KitchenOwl (Cooklang, 2026): https://cooklang.org/blog/42-tandoor-vs-mealie-vs-kitchenowl/
[6] Tandoor — shopping features: https://docs.tandoor.dev/features/shopping/ · https://tandoor.dev/
[7] AnyList Review (Pann): https://www.pann-app.com/blog/anylist-review
[8] Bring! Grocery Shopping List (App Store): https://apps.apple.com/us/app/bring-grocery-shopping-list/id580669177
[9] Paprika App Review 2026: https://eathealthy365.com/paprika-app-review-2026-is-it-the-best-recipe-manager/
[10] Cronometer vs MacroFactor 2026: https://clinicalnutritionreport.com/compare/cronometer-vs-macrofactor/
[11] Mealime Review 2026 (Sunrise Digest): https://thesunrisedigest.com/eat/mealime-review-2026/
[12] Ollie Meal Planner review (MealThinker): https://mealthinker.com/blog/ollie-meal-planner-review
[13] Samsung Food / Whisk review: https://home-cooks.co.uk/pages/review-whisk
[14] Čo hovoria používatelia na Reddite o plánovačoch jedál: https://home.organizeat.com/blog/meal-planner-app-reddit/
[15] NoWaste: Food Inventory Lists — Google Play (3,2/5, 271 recenzií): https://play.google.com/store/apps/details?id=com.khcreations.nowaste
[16] Mealime free tier changes 2026 (MealThinker): https://mealthinker.com/blog/mealime-alternative
[17] Mealie: https://github.com/mealie-recipes/mealie · https://docs.mealie.io/documentation/getting-started/features/

**Poznámka k cenám.** Predplatné sa líši podľa regiónu a platformy a mohlo sa od dátumu týchto stránok zmeniť; údaje sú z recenzií a obchodov, nie z faktúr. Pred akýmkoľvek rozhodnutím podľa ceny over v príslušnom obchode.

**Čo som nevedel overiť.** (a) Či `sw.js` a PWA inštalácia fungujú na Nothing Phone 3a Pro — testoval som v desktopovom Chromiu cez `file://`. (b) Či je stored XSS cez názov uloženého jedálnička stále živý (testoval som len meno stravníka, kde sa mi nespustil). (c) Reálne maloobchodné ceny v Kauflande/Lidli/Bille k dnešku — hodnotenie „~2× viac, než by malo byť" je odhad z €/kcal, nie z bločku. (d) Recenzie v Google Play a App Store som čítal cez agregátory a redakčné recenzie, nie priamo v obchodoch. (e) Wake Lock som overil len v desktopovom Chromiu; správanie mobilného Chrome pri `file://` môže byť iné.

---

## Prílohy
- Skripty prechodu a merania: `scripts/vyskum/prechod.js`, `prechod2.js`, `prechod3.js`, `prechod4.js`, `prechod5.js`, `prechod6.js`, `overenie15.js`, `cena_rozbor.js`
- Snímky obrazovky (393×850): `e2e/screenshoty/vyskum/` — Domov, Recepty, Plán (prázdny aj vygenerovaný), Nákup, Výživa, Špajza, Nastavenia, dialóg generovania, detail receptu, režim varenia
- Textové výpisy obrazoviek: `e2e/screenshoty/vyskum/prechod*.txt`, `overenie15.txt`
