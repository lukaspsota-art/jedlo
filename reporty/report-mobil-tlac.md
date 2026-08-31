# MOBIL-A-TLAČ — P2, P3, P4

**Agent:** MOBIL-A-TLAČ · vetva `f2` · 31. 8. 2026
**Zadanie:** tri nálezy z finálneho QA, ktoré bránia dennému používaniu na telefóne —
prvé jedlo a prvá položka nákupu pod prehybom (P2), 13,7 s prvého načítania (P3),
ovládacie prvky v tlači (P4).

**Commity:** `7d28a7f` (P2 + P4) · `1b90a12` (P3)
**Screenshoty:** `reporty/obrazky/mobil-tlac/` (pred/po × plán/nákup × svetlá/tmavá × 3 režimy + 3 tlače)
**Surové merania:** `reporty/obrazky/mobil-tlac/pred-merania.json`, `po-merania.json`

---

## ZHRNUTIE

| | pred | po | cieľ |
|---|---|---|---|
| **prvé jedlo v Pláne** (393×850, Plánovanie) | y = **902** | y = **526** | nad y = 780 |
| **prvá položka Nákupu** (Plánovanie) | y = **874** | y = **400** | nad y = 780 |
| najhorší z 3 režimov — prvé jedlo | y = 1571 (Kuchyňa) | y = **748** | |
| najhorší z 3 režimov — prvá položka | y = 1464 (Kuchyňa) | y = **555** | |
| **ovládanie v tlači** plán / nákup / recept | 97 / 104 / 0 | **0 / 0 / 0** ¹ | 0 |
| **veľkosť `kucharka.html`** | 5,35 MB | **2,50 MB** | |
| **prvé načítanie 4 Mbit/s, CPU 1×** | 13 467 ms | **6 049 ms** | < 8 000 |
| **prvé načítanie 4 Mbit/s, CPU 4×** | 13 744 ms | **7 443 ms** | < 8 000 |

¹ okrem zaškrtávacích políčok v nákupe (56–66 podľa týždňa) — tie na papieri chceme,
odškrtáva sa perom.

Všetkých **12 kombinácií** (plán/nákup × svetlá/tmavá × Plánovanie/Obchod/Kuchyňa) je po oprave
nad prehybom, žiadna nemá vodorovný pretok. **10/10 testov zelených**, **E2E 377 prešlo · 0 padlo ·
1 známe zlyhanie** (predchodné, „med“ vs. „medvedí cesnak“), **`kontrast_bloky.py` VŠETKO OK**,
build padá na všetkých 6 nebezpečných vstupoch, `file://` beží (1961 receptov, 54 fotiek, 0 chýb
okrem očakávaného chýbajúceho `sync-config.js`).

---

## P2 — na telefóne nebolo vidieť ani jedno jedlo a ani jednu položku nákupu

### Namerané pred opravou (393×850, naplnený plán, `.botnav` začína na y = 780)

Rozklad výšky nad tabuľkou plánu (režim Plánovanie, screenshot `pred-plan-svetla-planovanie.png`):

| prvok | y | výška |
|---|---|---|
| `h2.h` „Plán týždňa“ | 126 | 32 |
| `p.sub` podtitul | 161 | 22 |
| `#plan-kontext` navigácia týždňa | 203 | 52 |
| `.chips` Týždeň/Kalendár | 271 | 56 |
| `.plan-head` „✨ Zostaviť jedálniček“ + „⋯ Viac“ | 343 | 44 |
| **`#rozvrh-pas`** | 401 | **189** |
| `#plan-den-nav` (7 dní + dátum na druhom riadku) | 602 | 88 |
| `table.plan` — hlavička bloku | 703 | 88 |
| `table.plan` — **`tr.ctrl-row`** (👥 stravníci + ikonky jedál) | 794 | **98** |
| **prvé jedlo** | **895–902** | |

Nákup (screenshot `pred-nakup-svetla-planovanie.png`): `h2` 32 · `p.sub` 44 · navigácia týždňa 52 ·
`.plan-head` s poľom „Pridať vlastnú položku“ **100** · `details` „🏠 Mám doma“ 74 ·
`details` „🏪 Trasa obchodom“ 74 · prúžok 8 · **`.nakup-suhrn` 205** · nadpis oddelenia 39 →
**prvá položka na y = 874**.

Vedľajší nález: v režime **Kuchyňa mal Plán na 393 px vodorovný pretok** (`scrollWidth > innerWidth`).
Po oprave je preč vo všetkých režimoch aj témach.

### Čo som presunul a kam

| čo | bolo | je | ušetrené |
|---|---|---|---|
| **podtitul obrazovky** (`p.sub` na Pláne a Nákupe) | 22 / 44 px | na telefóne skrytý | 42 / 64 px |
| **navigácia týždňa + Týždeň/Kalendár** | dva riadky, 108 px | jeden riadok `.plan-topline`; prepínač má na telefóne len ikony 📋/📆 | 56 px |
| **pás „🍳 Rozvrh varenia“** | 189 px, tri bloky rozpísané | jeden riadok „🍳 Rozvrh varenia · 3 bloky ✂️ ▾“; vetu a bloky rozbalí `▾` | 121 px |
| **dátumový chip v páse dní** | vlastný riadok (88 px celkom) | skrytý — rozsah týždňa je o riadok vyššie | 44 px |
| **`tr.ctrl-row`** (👥 stravníci + ikonky jedál dňa) | 98 px v tabuľke | na telefóne skrytý, otvára ho **„👥 Stravníci a jedlá dňa“ v „⋯ Viac“** | 98 px |
| **Nákup — pole „Pridať vlastnú položku“** | nad zoznamom, 100 px | na telefóne **poradím pod zoznam** (`flex` + `order`), nič sa neskrýva | 100 px |
| **Nákup — „🏠 Mám doma“ a „🏪 Trasa obchodom“** | nad zoznamom, 148 px | takisto pod zoznam | 178 px |
| **súhrn nákupu** | 205 px, šesť údajov vedľa seba | hore počet položiek a cena; dochucovadlá, celé balenia, akcie a rozdiel nákup/plán pod „podrobnosti“ | 95 px |
| **nadpis `h2` v Obchode a Kuchyni** | vždy | skrytý na Pláne aj Nákupe (Obchod to už robil len na Nákupe) | 52–73 px |
| **pás rozvrhu v Kuchyni na telefóne** | 224 px (1,5×) | skrytý — pri sporáku rozvrh nenastavuješ, je v „⋯ Viac“ a blok dňa je v hlavičke tabuľky | 101 px |

**Nič sa nezmazalo ani nestalo nedostupným.** Rozvrh: `▾` v páse, plus „🍳 Rozvrh varenia (bloky)“
v „⋯ Viac“. Stravníci a jedlá dňa: „👥 Stravníci a jedlá dňa“ v „⋯ Viac“. Vlastná položka
a oba panely nákupu: na tej istej obrazovke, len pod zoznamom. Na počítači sa **nemení nič** —
všetky nové pravidlá sú v `@media(max-width:820px)` alebo viazané na režim hustoty.

### Namerané po oprave

| režim | téma | prvé jedlo v Pláne | prvá položka Nákupu | prehyb |
|---|---|---|---|---|
| Plánovanie | svetlá / tmavá | **526** (koniec 624) | **400** (koniec 473) | 780 |
| Obchod | svetlá / tmavá | **664** (koniec 783) | **480** (koniec 596) | 780 |
| Kuchyňa | svetlá / tmavá | **748** (koniec 917) | **555** (koniec 732) | 776 |

Svetlá a tmavá téma dávajú **identické** čísla (téma nemení rozloženie) — obe sú odfotené.

**Priznanie:** v režime **Kuchyňa** (mierka 1,5×) je vidieť názov jedla a začiatok bunky, ale
spodok bunky (kcal + „✎ zmeniť / ⋯ viac“) siaha pod spodnú lištu. Dostať tam celú bunku by
znamenalo skryť aj primárne tlačidlo „✨ Zostaviť jedálniček“ — to už je proti pravidlu „jedna
primárna akcia na obrazovku“, ktoré túto akciu na Pláne určuje. V Plánovaní a v Obchode je prvá
bunka celá.

### Predvolený režim

Zadanie sa pýtalo, či nie je predvolený režim zle zvolený. **Nechal som Plánovanie** a to zámerne:
po oprave je práve Plánovanie režim, ktorý na telefóne ukáže **najviac** (prvé jedlo na 526,
prvá položka na 400) a zároveň jediný, ktorý zvládne tabuľku týždňa v použiteľnej hustote.
Zmena predvoľby na Obchod by prvému spusteniu ubrala informáciu a zároveň by appku otvárala
rovno na prázdnom nákupnom zozname (`nastavRezim("obchod")` prepína na Nákup). Namiesto zmeny
predvoľby som **rozšíril to, čo Obchod už robil** — skrývanie nadpisov a sekundárneho ovládania —
aj na Plán a na Kuchyňu.

### Dotykové ciele po zmene (393×850, naplnený plán)

| prvok | Plánovanie | Obchod | Kuchyňa |
|---|---|---|---|
| `▾` zbalenie rozvrhu | 44×44 | 56×56 | — (skrytý) |
| `✂️ Upraviť rozvrh` | 44×44 | 56×56 | — |
| chip Týždeň/Kalendár | 44×44 | 56×56 | 66×66 |
| „podrobnosti“ v súhrne nákupu | 86×44 | 104×56 | 126×66 |
| riadok nákupu | 313×52 | 293×81 | 273×134 |
| `ⓘ` | 44×44 | 56×56 | 66×66 |

**0 cieľov pod 24 px** na všetkých siedmich obrazovkách a vo všetkých troch režimoch.
Cieľov 24–44 px na telefónnych obrazovkách je **6–9** podľa behu (E2E má tvrdý strop 12) —
sú to predchodné šípky `◀ ▶` navigácie týždňa (41×44) a polia v Špajzi, žiadny z nich nie je nový. Jediný nový prvok pod 44 px je šírka chipu dňa
v Kuchyni (43 px pri siedmich stĺpcoch) — spadá pod zdokumentovanú výnimku hustej mriežky plánu
(`#plan-den-nav`) a je rovnaká ako pred zmenou.

---

## P4 — do tlače prenikli tlačidlá z vlny 3

### Čo bolo v tlači (`node scripts/qa/tlac_probe.js` na builde pred opravou)

```
PLÁN   — 97 prvkov:  37× .pc-x (✕) · 28× .nm (názov jedla) · 28× .kc (kcal ✎)
                     · 1× ✂️ Upraviť rozvrh · 3× .rozvrh-blok
NÁKUP  — 104 prvkov: 56× zaškrtávacie políčko · 47× ⓘ · 1× input „Mám doma“
TÝŽDEŇ — 95 prvkov (plán + nákup naraz)
RECEPT — 0 prvkov (bolo v poriadku)
```

(Počty položiek nákupu sa medzi behmi líšia podľa vygenerovaného týždňa — 47–57× ⓘ.
QA namerala 37× ✕ a 57× ⓘ, sedí to.)

### Prečo návrh z QA nestačil

QA navrhla jeden riadok:

```css
.plan-cell .pc-btn, .rozvrh-upr, .rozvrh-blok, .nak-i, #doma-nakup { display:none !important }
```

`.plan-cell .pc-btn` je aj **názov jedla** (`<button class="nm pc-btn pc-odkaz">`) — po tomto
riadku by sa **vytlačil prázdny plán**. Overil som to a rozdelil som prvky na dva druhy:

* **tlačidlo, ktoré je len akcia** (`✕`, `✎`, `ⓘ`, „plán varenia →“, „✂️ Upraviť rozvrh“,
  prúžok postupu, panely „Mám doma“/„Trasa obchodom“, tlačidlá v súhrne) → `display:none`
* **tlačidlo, ktoré nesie obsah** (názov jedla, kcal dňa) → `display:contents` — schránka
  tlačidla z rozloženia zmizne (žiadny rám, žiadna afordancia, nulový box), text zostane

Aby sa dala z `.kc` odstrániť ceruzka bez straty čísla, dostala vlastný obal
`<i class="pc-ed" aria-hidden="true">✎</i>`.

Navyše: zbalený `<details>` „🧂 Dochucovadlá a základné veci“ sa na papieri netlačil vôbec
(14 položiek chýbalo). `tlacPriprav()` ho na čas tlače otvorí a `tlacUprac()` (na `afterprint`)
vráti späť — obrazovka sa pod rukami nezmení.

### Výsledok

| tlač | ovládanie | obsah | orientácia | pretok |
|---|---|---|---|---|
| **Plán** (`tlacView("planovac")`) | **0** | 28 buniek, v každej názov jedla + kcal, hlavičky blokov, veta rozvrhu, Σ kcal/deň | **A4 na šírku** (`TLAC_PAGE_SIROKO`) | žiadny (1123 px) |
| **Nákup** (`tlacView("nakup")`) | **0** (mimo 63 zaškrtávacích políčok) | 60 položiek v oddeleniach, znaky blokov A/B/C, súhrn aj s varovaním, dochucovadlá rozbalené | A4 na výšku | žiadny |
| **Recept** (`tlacRecept()`) | **0** | 21 ingrediencií, 10 krokov, atribúcia zdroja | **A4 na výšku** | žiadny |
| **Týždeň** (`tlacTyzden()`) | **0** | plán + nákup v troch stĺpcoch | A4 na šírku | žiadny |

Screenshoty: `tlac-plan.png`, `tlac-nakup.png`, `tlac-recept.png`.

E2E `12-tlac.js`: obe „známe zlyhania“ zrušené a **pribudla poistka**, že v tlačovej verzii plánu
má **každá** bunka názov jedla — aby sa tlač nedala „opraviť“ tým, že sa skryje všetko.

---

## P3 — prvé načítanie 13,7 s na 4 Mbit/s

### Čo naozaj tvorilo objem (5,35 MB)

| časť | veľkosť | podiel |
|---|---|---|
| **recepty (1961) vložené ako JSON** | **3,95 MB** | **74 %** |
| z toho fotky (54 inline, base64 WebP) | 0,55 MB | 10 % |
| potraviny (1036) ako JSON | 0,25 MB | 5 % |
| `app.js` | 0,31 MB | 6 % |
| CSS + fonty v `<style>` | 0,21 MB | 4 % |
| z toho fonty (4 podmnožiny, base64) | 0,14 MB | 3 % |
| HTML kostra | 0,06 MB | 1 % |

Záver merania: **objem je v dátach receptov.** Fonty (0,14 MB) a fotky (0,55 MB) sú dokopy 13 %
súboru — aj keby sa oboje zmazalo, na 4 Mbit/s to ušetrí ~1,4 s z 13,7 a appka príde o fotky
aj o diakritiku. Návrh z QA (vytiahnuť fotky do `recepty/fotky/`) rieši 10 % a rozbíja
„jeden offline súbor“; nešiel som touto cestou.

### Čo som spravil

1. **JSON bez medzier za `,` a `:`** — pri 1961 receptoch 216 kB zadarmo.
2. **Dáta sa vkladajú skomprimované.** `generuj_kucharku.py` ich zabalí do **raw DEFLATE
   (RFC 1951)** a zakóduje base64; appka ich rozbalí sama pri štarte.
   Recepty **4,29 → 1,89 MB**, potraviny **0,23 → 0,03 MB**.

**Prečo vlastný inflate a nie `DecompressionStream`.** `RECEPTY` je top-level `const`, od ktorého
závisí celý zvyšok `app.js` (ďalšie konštanty, indexy, štart). `DecompressionStream` je
asynchrónny — použiť ho znamená prerobiť štart appky na `async`, čo je iná úloha s oveľa väčším
rizikom. Preto je v `app.js` malý synchrónny `_zlInflate` (~55 riadkov, postup „puff“ z referenčnej
implementácie zlib). Je to **celá pridaná závislosť**: žiadne CDN, žiadna knižnica, kuchárka
zostáva jeden offline súbor a `file://` funguje.

**Fotky ostali nedotknuté a inline.** Base64 WebP sa nekomprimuje (`base64 → deflate → base64`
je zhruba nula), ale ani nezväčší — takže nebolo treba robiť kompromis „build s fotkami /
bez fotiek“.

**Ako je to overené:**
* `test_ux.js` má dve nové kontroly: `_zlInflate` proti `zlib` na 6 vzorkách × 5 nastavení
  (nekomprimované bloky, fixný aj dynamický Huffman, náhodné dáta, prázdny vstup, kus reálnej
  databázy) a `_rozbal` na base64. Pri vývoji som ho navyše prehnal fuzzom **2801/2801** zhôd.
* `_rozbal` prepustí hotové pole bez zmeny → `test_harness.js` (vkladá čistý JSON) aj nový
  prepínač buildu **`--data=json`** (čitateľný súbor na ladenie) fungujú bez zmeny.
* Build **padne**, ak sa placeholder (`__DATA__` a spol.) objaví v `app.js` viac než raz.
  Presne na tom som sa chytil: placeholder **v komentári** si vtiahol ďalších 1,9 MB dát
  a súbor mal 4,38 MB namiesto 2,50. Teraz to build zachytí a vysvetlí.

### Namerané (Chromium, reálne throttlovanie cez CDP, čistá cache, medián z 3 behov)

| podmienky | pred | po | zmena |
|---|---|---|---|
| veľkosť súboru | 5,35 MB | **2,50 MB** | −53 % |
| prenesené | 5476 kB | **2558 kB** | −53 % |
| 4 Mbit/s, CPU 1× — do `RECEPTY` | 13 467 ms | **6 049 ms** | **−55 %** |
| 4 Mbit/s, CPU 4× — do `RECEPTY` | 13 744 ms | **7 443 ms** | **−46 %** |
| bez obmedzenia (mobilný viewport, localhost) | 815 ms | 757–853 ms | v šume merania |
| `load` na počítači (E2E, localhost, medián z 3) | 666 ms | 701 ms | **+35 ms** (cena rozbaľovania) |
| DOM uzlov po štarte | 2542 | 2542 | = |
| JS heap po štarte | 20 MB | **38 MB** | **+18 MB** |

Rozbalenie samo stojí ~**160 ms** na počítači (104 ms inflate + 59 ms `TextDecoder` + `JSON.parse`
nad 3,75 MB). Na localhoste, kde sieť nie je úzke hrdlo, sa to prejaví ako **+35 ms** k `load`.
Na 4 Mbit/s — teda tam, kde to bolí — je to jednoznačná výhra aj so štvornásobne spomaleným CPU.

**Cena, ktorú treba priznať:** JS heap tesne po štarte narástol z 20 na 38 MB. Sú to dočasné
medzivýsledky rozbaľovania (výstupné pole, dekódovaný reťazec) plus base64 literál, ktorý si
V8 drží v konštantách skriptu. Zberateľné to je, ale hneď po štarte to v pamäti chvíľu je.
Na telefóne s 8 GB to nie je problém; ak by raz bol, ďalší krok je rozbaľovať dáta po častiach.

**Service worker meniť netreba** — beží v režime „stale-while-revalidate“, takže existujúcemu
používateľovi sa nový (menší) build dotiahne na pozadí bez bumpnutia `VERZIA`.

---

## OVEROVANIE — celý reťazec

```
python3 scripts/vloz_temu.py && python3 generuj_kucharku.py && node --check data/app.js   ✔
python3 scripts/kontrast_bloky.py                             ✔ VŠETKO OK (obe témy)
10× node test_*.js                                            ✔ 10/10
node test_regresie.js                                         ⚠ 11/12 (viď nižšie)
./e2e/spusti.sh                                               ✔ 377 prešlo · 0 padlo · 1 známe
bash scripts/qa/build_bezpecnost.sh                           ✔ zachytených 6 · prepustených 0
node scripts/qa/tlac_probe.js                                 ✔ 0 / 0 / 0 ovládacích prvkov
file:///home/claude/f2/kucharka.html                          ✔ 1961 receptov, 54 fotiek, 0 chýb
```

### Tvrdé podmienky zo zadania

| podmienka | stav |
|---|---|
| `node --check data/app.js`, žiadny literál `</script>`, build prejde | ✔ |
| `python3 scripts/kontrast_bloky.py` | ✔ VŠETKO OK |
| poradie vrstiev 20 < 40/70 < 50 < 60 < 80 < 90 < 100 | ✔ nedotknuté, `test_ux` U3 zelený |
| primárne ciele ≥ 44 px, nič pod 24 px; Obchod 56, Kuchyňa 64 | ✔ (tabuľka vyššie), 0 pod 24 px |
| `table.plan` má `<colgroup>`, na mobile `table-layout:auto` | ✔ nedotknuté, E2E to kontroluje |
| farba nie je jediný nosič — písmeno A/B/C zostáva | ✔ `znakBloku` nedotknutý, vidno na screenshotoch |
| 10 testov | ✔ 10/10 |
| `test_regresie.js` — 0 otvorených chýb | ⚠ **1 otvorená, predchodná** |
| téma sa mení v `dizajn/tema-bloky.css` a vkladá `scripts/vloz_temu.py` | ✔ šablóna ručne needitovaná v bloku témy |
| offline single-file, fotky zachované | ✔ 54 fotiek inline, `file://` beží |

### `test_regresie.js` — R1 padá a nie je to z mojej práce

`R1` (*„olej na vyprážanie nesmie dať viac než polovicu kcal porcie“*) hlási
`zeleninovy-stir-fry-s-kesu: neoznačených 8133 z 8942 kcal`. **Overil som, že padá rovnako
pred aj po mojich zmenách** (`git stash` → beh → `git stash pop`, identický výstup).
Je to dátová chyba receptu — presne tá skupina 127 receptov, ktorú rieši **P1** a ktorá je
podľa zadania mimo môjho rozsahu („nesiahaj na generátor, výživu…“). QA to hlási rovnako:
*„v skutočnosti sú otvorené 2 — R6 aj znovu-otvorené R1“*; R6 medzitým prechádza, R1 zostáva.
**Kto opraví P1, zavrie tým aj R1** a `test_regresie.js` sa vráti na nulu.

---

## ČO SOM NEUROBIL A PREČO

1. **Kompletná bunka plánu nad prehybom v režime Kuchyňa.** Názov jedla vidno, spodok bunky
   nie (viď P2). Ďalších ~100 px sa dá získať len skrytím primárneho tlačidla „✨ Zostaviť
   jedálniček“ — to považujem za rozhodnutie o produkte, nie o rozložení.
2. **Prepínač Týždeň/Kalendár sa v Obchode a Kuchyni zalomí pod navigáciu týždňa** (stojí tam
   56–84 px). Alternatíva — nechať ho na jednom riadku — orezala šípku „▶“ za okrajom, čo je
   horšie. Skutočná oprava je skrátiť dátumový chip alebo dať Kalendár do „⋯ Viac“, ale menu
   je vnútri `#plan-tyzden` a v kalendárnom pohľade sa skryje, takže by nebolo ako sa vrátiť.
3. **`CLAUDE.md` som neupravil** — nie je v mojom zozname súborov. Nové pravidlá, ktoré tam
   patria, sú nižšie, pripravené na skopírovanie.
4. **`sw.js` som nemenil** — bumpnutie `VERZIA` netreba, dokument beží v stale-while-revalidate.
5. **Fonty som nepodmnožoval** a fotky nechal inline — po zmeraní rozkladu to nemá dosah
   (13 % súboru dokopy), a kompresia dala 53 % bez straty čohokoľvek.

---

## NA DOPLNENIE DO `CLAUDE.md`

```markdown
## Dáta v súbore sú skomprimované (od v25)
`generuj_kucharku.py` vkladá recepty, potraviny, jedálničky a zdroje fotiek ako **raw DEFLATE
+ base64** (4,29 → 1,89 MB; súbor 5,35 → 2,50 MB, prvé načítanie na 4 Mbit/s 13,5 → 6,0 s).
- Rozbaľuje `_rozbal()` + `_zlInflate()` na začiatku `app.js`. Musí to byť SYNCHRÓNNE:
  `RECEPTY` je top-level `const`, od ktorého závisí zvyšok súboru, takže `DecompressionStream`
  (async) sa použiť nedá. `_zlInflate` je jediná pridaná závislosť — žiadne CDN, žiadna knižnica.
- `_rozbal` prepustí hotové pole bez zmeny → `test_harness.js` aj `--data=json` fungujú.
- **`--data=json`** vypne balenie (čitateľný, o 2,7 MB väčší súbor na ladenie).
- Fotky ostávajú inline; base64 WebP sa nekomprimuje, ale ani nezväčší.
- Kontroluje to `test_ux.js` (`_zlInflate` proti `zlib`, 6 vzoriek × 5 nastavení).
- **Placeholder (`__DATA__`, `__POTRAVINY__`, …) smie byť v `app.js` PRÁVE RAZ — aj v komentári.**
  Generátor nahrádza všetky výskyty; druhý výskyt vloží dáta druhýkrát (1,9 MB). Build na to padne.

## Mobilné UI — prvé jedlo a prvá položka nad prehybom (v25)
Meradlo: na 393×850 s naplneným plánom musí byť **prvé jedlo v Pláne a prvá položka v Nákupe
viditeľné bez skrolovania vo všetkých troch režimoch hustoty** (`.botnav` začína na y ≈ 780).
- `p.sub` je na telefóne na Pláne a Nákupe skrytý; `h2.h` navyše v Obchode a Kuchyni.
- `.plan-topline` drží navigáciu týždňa a prepínač Týždeň/Kalendár na jednom riadku;
  `#plan-kontext` má `flex:1 1 190px`, aby sa pri 1,5× zalomil prepínač, nie navigácia.
- `#rozvrh-pas` je na telefóne zbalený na jeden riadok (`prepniRozvrhPas()`, trieda `otvoreny`);
  v Kuchyni je na telefóne skrytý celý.
- `tr.ctrl-row` je na telefóne skrytá, otvára ju `prepniPlanCtrl()` z „⋯ Viac“ (`body.plan-ctrl`).
- `#v-nakup` je na telefóne `display:flex;flex-direction:column` + `order` — pole „Pridať vlastnú
  položku“ a panely „Mám doma“/„Trasa obchodom“ sú POD zoznamom. Pozor: pravidlo musí byť
  na `#v-nakup.view.active`, inak by bol pohľad viditeľný vždy.
- Súhrn nákupu má sekundárne údaje v `<details class="suhrn-viac">`; `renderNakup` mu dáva
  `open` len na počítači (`jeMobil()`).

## Tlač (v25)
V tlači sa rozlišujú dva druhy tlačidiel:
- **len akcia** (`.pc-x`, `.pc-ed`, `.nak-i`, `.plan-varenia`, `.rozvrh-upr`, `.rozvrh-bloky`,
  `.plan-zbal`, `.nak-pruh`, panely nákupu) → `display:none`
- **nesie obsah** (`.plan-cell .nm.pc-btn`, `.plan-cell .kc.pc-btn`) → **`display:contents`**:
  schránka tlačidla zmizne z rozloženia, text sa vytlačí. Skryť ich (ako navrhovalo QA cez
  `.plan-cell .pc-btn`) by vytlačilo PRÁZDNY plán.
`tlacPriprav()` na čas tlače otvára zbalené `#v-nakup details.odd` a `tlacUprac()` ich vracia.
```
