# Nasadenie dizajnu — koncepcia B „Bloky"

**Agent:** NASADENIE-DIZAJNU · vetva `e1` · 31. 8. 2026
**Zadanie:** preniesť odsúhlasený prototyp `dizajn/koncepcia-b.html` do appky tak, aby appka
vyzerala a fungovala ako prototyp, ale nestratila nič z funkčnosti.

---

## 1. Čo je nasadené

### 1.1 Téma je jeden ohraničený blok — a má vlastný zdroj
Pôvodná téma *Organic* (terakota + krém) medzi `/* Organic theme — start/end */` je **nahradená**
blokom `/* Bloky theme — start/end */`. Disciplína je rovnaká: blok pôvodné CSS iba prebíja,
nič v ňom nemaže, odstránenie témy = zmazať blok.

Novinka oproti Organicu: téma sa už neudržiava priamo v šablóne.
Zdroj je **`dizajn/tema-bloky.css`** (366 riadkov, čitateľné, komentované) a do
`data/sablona.html` ju aj s base64 fontmi vloží **`python3 scripts/vloz_temu.py`**.
Skript zároveň dopĺňa `<meta name="theme-color">` pre svetlú aj tmavú tému a padne,
keby sa v téme objavil literál `</script>`.

### 1.2 Tokeny — a preklad starých na nové
```
--zem #E7E4DD   --doska #FFFFFF  --tint #DBD7CE   --text #1E1B16  --text2 #5A544A
--linka #D3CEC3 --okraj #7E796F  --tlac #1E1B16 / --na-tlaci #F4F1EA
--blok-a #6E2A55 (slivka)  --blok-b #0E5A70 (more)  --blok-c #4B5A15 (oliva)  --na-bloku #FFFFFF
--signal #A82C19   --zlato #725700   --akcent / --akcent-tlac = farba práve zobrazeného bloku
--skala --cil --cil-in --r --r-mala --r-btn
```
Kľúčové rozhodnutie: **staré tokeny sú premapované na nové** (`--bg:var(--zem)`,
`--ink:var(--text)`, `--accent:var(--akcent)`, `--warn:var(--signal)`, …).
Vďaka tomu sa 900 riadkov pôvodného CSS — a všetky inline štýly v `app.js`, ktoré tie tokeny
používajú — prefarbí naraz a bez toho, aby sa v nich čokoľvek prepisovalo.

`--zlato` som oproti návrhu stmavil z `#7A5D00` na `#725700`: na tónovanej ploche `--tint`
dávalo 4,31:1, teraz dáva 4,75:1.

### 1.3 Tmavá téma vrátane stavu bez stampu
Dva vstupy, jedna sada hodnôt:
* výslovná voľba používateľa → `body.dark`
* systémové nastavenie → `@media(prefers-color-scheme:dark){ body:not(.svetla) }`

`applyVzhlad()` po novom pridáva na `<body>` triedu **`svetla` ako stamp**. Kým JS nebeží,
appka je tmavá podľa systému; keď si používateľ tmavý režim vypne, stamp systém prebije.
Overené v prehliadači: pred spustením JS aj po ňom rovnaké `rgb(21,19,16)` / `rgb(240,235,225)`.
`scripts/kontrast_bloky.py` navyše kontroluje, že sa obe sady tokenov **do písmena zhodujú**
(16/16 tokenov) — inak by appka pred štartom JS vyzerala inak než po ňom.

### 1.4 Fonty — offline, s overenou diakritikou
**Archivo** (nadpisy, čísla) a **Instrument Sans** (text), base64 `data:` URI, žiadny `@import`,
žiadne CDN. Oba sú **premenlivé fonty** (os `wght`), preto stačia **4 súbory / 106 KB** namiesto
ôsmich duplikátov, ktoré ležali v `dizajn/fonty/` (600 a 800 boli bit po bite ten istý súbor).

Diakritiku som overil cez `fontTools` na skutočnom `cmap` každej podmnožiny:

| podmnožina | pokrýva | chýba |
|---|---|---|
| latin | á ä é í ó ô ú ý € | č ď ĺ ľ ň ŕ š ť ž |
| latin-ext | č ď ĺ ľ ň ŕ š ť ž | á ä é í ó ô ú ý € |

Spolu **0 chýbajúcich znakov** zo sady `áäčďéíĺľňóôŕšťúýž` (a ich veľkých písmen) + `€`.
Obe podmnožiny sú preto povinné — vypadnutie latin-ext by zabilo mäkčene.

---

## 2. Tri režimy hustoty

Prepínač **Plánovanie / Obchod / Kuchyňa** je v bočnom paneli (`#rezimy`), na mobile ako vlastný
riadok pod značkou. Voľba je v `S.profil.rezim`, je v `PROFIL_TYPY` (takže prežije aj poškodený
`localStorage`) a **prežije reload**. Nastavuje `data-rezim` na `<html>`:

| režim | `--skala` | `--cil` | namerané: najmenší cieľ | výška riadku nákupu |
|---|---|---|---|---|
| Plánovanie | 1,0 | 44 px | **44 px** | 68 px |
| Obchod | 1,22 | 56 px | **56 px** | 81 px |
| Kuchyňa | 1,5 | 64 px | **64 px** | 168 px |

**Ako je `--skala` nasadená a prečo tak.** Pôvodné CSS má stovky pevných px veľkostí písma;
prepísať ich na `calc(… * var(--skala))` je iná úloha ako táto. `--skala` je preto nasadená ako
**`zoom` na `.content` a `.modal`** — teda na obsah a dialógy. Pevná navigácia (`.side`,
`.botnav`, `.cook`) sa nezoomuje zámerne, aby `position:fixed` prvky nezmenili súradnicovú
sústavu a nevznikla medzera pri spodnej lište.

Z toho vyplýva `--cil-in: calc(var(--cil) / var(--skala))`: vnútri zoomovanej plochy má cieľ
menšiu CSS hodnotu, ale rovnakú **skutočnú** veľkosť. Ciele sú písané ako
`min-height:max(44px, var(--cil-in))`, takže nikdy neklesnú pod 44 px a v Kuchyni majú 64 px.

**Kuchyňa neprebíja režim varenia** — dopĺňa ho. Varenie sa otvára presne ako doteraz
(`spustiCook()` z detailu receptu), Kuchyňa len zväčší všetko okolo.

**Obchod** navyše skryje na Nákupe to, čo pri regáli nepotrebuješ: nadpis, podtitul,
riadok „+ Pridať / ⋯ Viac", panely „Mám doma" a „Trasa obchodom" a poznámku o rozdiele medzi
nákupom a plánom. Nič sa nemaže — v Plánovaní je všetko späť.

---

## 3. Farba = blok, naprieč appkou

Farba **nikdy nie je jediný nosič informácie**. Ku každej farbe patrí písmeno A/B/C
(`znakBloku(bi)` → `<span class="znak blok-x">A</span>` s `title` aj `aria-label`).

| obrazovka | čo nesie farbu bloku | čo nesie ten istý údaj textom |
|---|---|---|
| **Plán** | hlavička bloku (plná plocha), hlavička dňa, jemný nádych bunky (7 %) | „**A** Blok A · Po–Ut", znak v hlavičke dňa („**A** Pon") |
| **Plán — pás rozvrhu** | ľavý znak pri každom bloku | „Varíš v nedeľu večer na pondelok a utorok." |
| **Plán — dialóg rozvrhu** | pruh siedmich dní | písmeno bloku pri každom dni |
| **Nákup** | znak/znaky pri každej položke | písmeno A/B/C + `title` „Kupuješ na blok A" |
| **Domov — hero varenia** | celá plocha vo farbe bloku, na ktorý sa varí | „**A** 🍳 Dnes večer treba navariť — Blok A (na 2 dni)" |
| **Domov — pás týždňa** | prúžok pod kcal každého dňa | „Po A", „St B", „So C" |
| **Domov — Čo dnes ješ** | znak pri každom slote | písmeno |
| **Výživa** | prúžok pod stĺpcom grafu | menovka dňa „Po A" |
| **Varenie** | tlačidlo „Ďalej", pás krokov, znak pri názve | písmeno pri názve receptu |

Položka nákupu môže patriť do viacerých blokov naraz — vtedy má viac znakov
(napr. cesnak: **A B C**). Údaj vzniká v `nakupPolozky()`, kde si každá várka nesie `bi`
(index bloku) a skupina si zbiera `G.bl`.

**Znak bloku na ploche bloku sa obracia** (`background:var(--na-bloku); color:var(--text)`),
inak by splynul — týka sa `.dnes-varenie-hero`, `table.plan th.blok-*` a `td.blok-hlava`.

---

## 4. Inline farby v `app.js` — kompletný zoznam

`app.js` píše farby priamo do inline štýlov a inline štýl sa nedá prebiť žiadnym selektorom.
CLAUDE.md spomínala štyri miesta (`:381`, `:383`, `:811`, `:1555`); po prehľadaní celého súboru
ich je **26**. Všetky sú teraz na tokenoch. Riadky sú po zmenách:

| riadok | miesto | pôvodne | teraz |
|---|---|---|---|
| 625 | prázdny stav Receptov — „Zrušiť filtre" | `var(--accent)` | `var(--accent)` → `--akcent` (farba bloku) |
| 627 | prázdny stav — odkaz na Špajzu | `var(--accent)` | to isté |
| 791 | prstenec podielu porcie (`conic-gradient`) | `var(--accent)`, `var(--line)` | to isté |
| 830 | „🗑 Zmazať recept" v menu | `var(--warn)` | `var(--warn)` → `--signal` |
| 1327 | dátum v páse týždňa v Pláne | `var(--muted)` | `var(--muted)` → `--text2` |
| 1383 | bunka plánu — trieda podfarbenia | `bloka`/`blokb` (parita) | `bunka-a/b/c` (farba bloku) |
| 1393 | súčet kcal v pláne + progres bar | `${st.c}` z `stavCiel` | to isté, tokeny |
| 2199 | onboarding — podtitul na tmavom heroi | `rgba(255,255,255,.85)` | ponechané (plocha `--tlac` je vždy tmavá) |
| 2220 | „✕" pri filtri generátora | `var(--warn)` | → `--signal` |
| 2831 | `stavCiel()` — farba odchýlky od cieľa | `var(--warn)`/`var(--accent)`/`var(--muted)` | to isté |
| 2834 | `makroBar()` — pruh a hodnota | `var(--line)`, `var(--warn)` | to isté |
| 2842–2843 | `ring()` — SVG prstenec | `var(--accent)`, `var(--line)` | to isté |
| 2880 | dlaždica kcal | `${sK.c}` | to isté |
| 2881 | dlaždica bielkovín | `${sB.c}` | to isté |
| 2884 | dlaždica sodíka | `var(--warn)` | → `--signal` |
| 2894 | stĺpec grafu výživy | `var(--warn)` | → `--signal`; **+ pribudol prúžok bloku** |
| 2904–2905 | `ring()` pre tuky a sacharidy | `var(--accent)` | to isté |
| **2906** | `makroBar` bielkoviny | **`#2e7d54`** (natvrdo) | `var(--blok-b)` |
| **2907** | `makroBar` tuky | **`#e0a800`** (natvrdo) | `var(--blok-c)` |
| **2908** | `makroBar` sacharidy | **`#b06a3b`** (natvrdo) | `var(--blok-a)` |
| 2977 | „Odhlásiť" v účte | `var(--warn)` | → `--signal` |
| **2986** | `auMsg()` — hláška účtu | **`var(--ok,green)`** (token `--ok` neexistoval → systémová zelená) | `var(--blok-c)` / `var(--signal)` |
| 3011, 3013 | špajza — pokrytie receptu | `var(--muted)`, `var(--accent-txt)` | to isté |
| 3066 | riadok špajze | `var(--muted)` | to isté |
| **3197** | graf váhy — body krivky | `var(--accent-dark)` | `var(--akcent)` (`--accent-dark` je teraz tmavá tlačová plocha, v tmavej téme by body zmizli) |
| 3200–3203 | graf váhy — krivky a popisy | `var(--line)`, `var(--accent)`, `var(--muted)` | to isté |
| **3398** | záložná farba PWA manifestu | **`#6d3813`** (terakota z Organicu) | `#E7E4DD` |

**Jediné hexy, ktoré v `app.js` zostali zámerne**, sú `COOK_BLOKY` na riadku 1008
(`#E39CC4 #6FCBE4 #BCD05E`). Plocha varenia je tmavá **vždy**, aj v svetlej téme, a potrebuje
svetlé varianty farieb blokov — svetlá slivka `#6E2A55` by na `#141210` dala 2,3:1 a tlačidlo
„Ďalej" by zhaslo. Kontroluje ich `scripts/kontrast_bloky.py`.

**Nález pri práci:** `--akcent` sa nastavuje cez `setProperty` na `<html>`, takže `var()` v jeho
hodnote sa substituuje **na `<html>`**, nie na mieste použitia. Prototyp na tom stavia
prefarbovanie varenia — v skutočnosti to nefunguje: `.cook{--blok-a:…}` sa už neuplatní.
Riešené tým, že `spustiCook()` nastavuje `--akcent` priamo na `#cook`, a to podľa bloku,
v ktorom sa daný recept naozaj varí (`blokReceptu()`); mimo plánu má fallback `#6FCBE4`.

---

## 5. Namerané hodnoty

### 5.1 Kontrast — WCAG AA, obe témy (`python3 scripts/kontrast_bloky.py`)

| pár | svetlá | tmavá | prah |
|---|---|---|---|
| text / zem · doska · tint | 13,52 · 17,16 · 11,95 | 15,61 · 13,98 · 12,33 | 4,5 |
| text2 / zem · doska · tint | 5,90 · 7,50 · 5,22 | 7,01 · 6,28 · 5,54 | 4,5 |
| blok-a / zem · doska · tint | 7,78 · 9,88 · 6,88 | 7,62 · 6,83 · 6,02 | 4,5 |
| blok-b / zem · doska · tint | 6,09 · 7,73 · 5,39 | 8,95 · 8,02 · 7,07 | 4,5 |
| blok-c / zem · doska · tint | 5,97 · 7,57 · 5,27 | 9,39 · 8,41 · 7,42 | 4,5 |
| signal / zem · doska · tint | 5,44 · 6,91 · 4,81 | 7,21 · 6,46 · 5,70 | 4,5 |
| zlato / zem · doska · tint | 4,87 · 6,19 · 4,75 | 8,89 · 7,96 · 7,02 | 4,5 |
| na-tlaci / tlac | 15,22 | 13,47 | 4,5 |
| okraj / zem · doska · tint (1.4.11) | 3,41 · 4,33 · 3,01 | 5,01 · 4,48 · 3,95 | 3,0 |
| vyrazený text na ploche bloku a/b/c | 9,88 · 7,73 · 7,57 | 7,62 · 8,95 · 9,39 | 4,5 |
| varenie: blok-a/b/c a text na `#141210` | 8,74 · 10,09 · 10,97 · 16,32 | (rovnaké — plocha je vždy tmavá) | 4,5 |

`--linka` (1,24 / 1,48) je vypísaná informatívne — je to vlasový oddeľovač, nie ohraničenie
ovládacieho prvku; ovládanie ohraničuje `--okraj`, ktorý prah 3:1 spĺňa.
**Výsledok: `VŠETKO OK`, návratový kód 0.**

### 5.2 Dotykové ciele (Playwright, naplnený plán)

| obrazovka (393 px) | prvkov | pod 44 px | pod 24 px |
|---|---|---|---|
| Domov | 14 | 0 | 0 |
| Recepty | 28 | 0 | 0 |
| Plán | 24 | 1 ¹ | 0 |
| Nákup | 132 | 0 | 0 |
| Výživa | 10 | 0 | 0 |
| Špajza | 12 | 0 | 0 |
| Nastavenia | 24 | 0 | 0 |
| **Plán na počítači** (bunky, mchipy, hranice) | 188 | — | **0** |

¹ Jediný prvok je `<span class="chip">31.08.</span>` v páse dní — **nie je ovládací prvok**
(`cursor:default`, bez rámu, bez akcie), je to menovka dátumu. 35 px, ďaleko nad hranicou 24 px.

### 5.3 Vodorovný pretok

| šírka | pred opravou | po |
|---|---|---|
| 360 px | 370 > 360 | **žiadny** |
| 393 px | 403 > 393 | **žiadny** |
| 768 px | 778 > 768 | **žiadny** |
| 1440 px | žiadny | **žiadny** |

Príčina bola v novom prepínači režimov: `flex:0 0 100%` + vodorovné okraje = 100 % + 20 px.
Opravené na `flex:0 0 auto; width:calc(100% - 20px)`. Merané na všetkých siedmich obrazovkách
s naplneným plánom, aj vo všetkých troch režimoch hustoty.

### 5.4 Výkon a konzola

| metrika | pred (baseline) | po |
|---|---|---|
| render mriežky receptov (priemer zo 4) | ~84 ms | **26,7 ms** |
| chyby v konzole (4 viewporty × 7 obrazoviek × 2 témy × 3 režimy) | — | **0** |
| veľkosť `kucharka.html` | 5,20 MB | 5,40 MB |

Nárast 200 KB je cena za fonty (106 KB surovo → ~145 KB v base64) plus samotné CSS témy.

### 5.5 Testy

`python3 generuj_kucharku.py` · `node --check data/app.js` · 0 literálov `</script>` — všetko OK.

**10/10 testov zelených:** `test_vypocty` · `test_generator` · `test_nakup` (65) · `test_ux` (44)
· `test_prepocty` · `test_porcie` · `test_jednotky` · `test_parovanie` · `test_pravidla` ·
`test_odolnost` (20).

**E2E (`./e2e/spusti.sh`): 264 prešlo · 15 padlo · 5 známych.**
Toto číslo som overil aj proti stavu **pred** mojimi zmenami (odložil som `data/`, prebuildoval
a spustil celú sadu znova): **presne rovnakých 264 / 15 / 5**. Žiadne z tých 15 zlyhaní
nepribudlo mojou prácou — sú to testy písané na staršie UI (mriežka po dávkach 60 kariet,
premenovaná položka menu „Rozdelenie blokov" → „Rozvrh varenia (bloky)", zmenený selektor
dialógu generátora, tlačová verzia, špajza s neznámym miestom). Skupiny *Smoke*, *Detail*,
*Režim varenia*, *Prístupnosť* a *Výkon* sú zelené v oboch behoch.

### 5.6 Tvrdé podmienky zo zadania

| podmienka | stav |
|---|---|
| `node --check data/app.js` | OK |
| žiadny literál `</script>` v `app.js` | 0 výskytov |
| `python3 generuj_kucharku.py` prejde | OK (1898 receptov, 972 potravín) |
| offline single-file, bez CDN a frameworku | OK — 4 `@font-face` s `data:` URI, žiadny `@import` |
| poradie vrstiev 20 < 40/70 < 50 < 60 < 80 < **90** < 100 | nezmenené; `test_ux` U3 zelený |
| `table.plan` má `<colgroup>`, na mobile `table-layout:auto` | OK — téma `table-layout` nediktuje |
| dotykové ciele ≥ 44 px na mobile, nikdy pod 24 px | OK (viď 5.2) |
| kontrast WCAG AA v oboch témach | OK (viď 5.1) |
| všetkých 10 testov | 10/10 |

---

## 6. Screenshoty

**Pred:** `dizajn/pred/` (21 súborov, téma Organic)
**Po:** `dizajn/po/` (40 súborov + `merania.json`), generuje ich `node dizajn/snimky.js`

| obrazovka | pred | po |
|---|---|---|
| Domov | `pred/mobil-domov.png`, `pred/pc-svetly-domov.png` | `po/mobil-svetla-domov.png`, `po/pc-svetla-domov.png` (+ `mobil-tmava-`, `pc-tmava-`) |
| Recepty | `pred/mobil-recepty.png` | `po/mobil-svetla-recepty.png` … |
| Detail receptu | `pred/mobil-detail.png` | `po/mobil-svetla-detail.png` … |
| Plán | `pred/mobil-plan.png`, `pred/pc-svetly-plan.png` | `po/mobil-svetla-planovac.png`, `po/pc-svetla-planovac.png` … |
| Nákup | `pred/mobil-nakup.png` | `po/mobil-svetla-nakup.png` … |
| Výživa | `pred/mobil-vyziva.png` | `po/mobil-svetla-vyziva.png` … |
| Špajza | `pred/mobil-spajza.png` | `po/mobil-svetla-spajza.png` … |
| Nastavenia | `pred/mobil-nastavenia.png` | `po/mobil-svetla-nastavenia.png` … |
| Režim varenia | `pred/mobil-varenie.png` | `po/mobil-svetla-varenie.png` … |
| **Režimy hustoty** | — | `po/mobil-rezim-plan-nakup.png`, `-obchod-`, `-kuchyna-` |
| **Systémová tmavá bez stampu** | — | `po/mobil-systemtmava-bez-stampu.png` |

Každá obrazovka je v štyroch kombináciách: mobil 393×850 a počítač 1440×900 × svetlá a tmavá.

---

## 7. Čo sa z prototypu nedalo preniesť — a prečo

1. **Horná hlavička namiesto bočného panela.** Prototyp má vodorovnú hlavičku so značkou,
   prepínačom režimov a navigáciou. Appka má na počítači bočný panel (`.side`) so šiestimi
   sekciami plus Nastavenia; prepísanie kostry by znamenalo prepísať `zobrazView`,
   `zpristupniNav`, skip-link, tlačové pravidlá aj polovicu mobilných media queries — teda
   riziko vo funkčnosti, nie v dizajne. **Bočný panel som preto ponechal a pretvaroslovil**
   na jazyk koncepcie B: plocha `--doska`, 2px deliaca čiara v `--text`, položky v `--text2`,
   aktívna položka orámovaná (nie vyplnená). Prepínač režimov je v ňom hneď pod značkou.
2. **Spodná lišta ako ikonové štvorčeky.** Prototyp má abstraktné štvorčeky s rámom; appka má
   emoji, ktoré sú zavedené aj v menu, v bunkách plánu a v nákupe. Vymeniť ich len v lište by
   rozbilo jednotu ikonografie. Prevzatý je vzhľad lišty (doska + 2px linka + `--tint` pod
   aktívnou položkou), nie ikony.
3. **`.plocha-bloku` ako karta „dnes večer sa varí" s odkazom vo vnútri.** Prevzaté, ale na
   `.dnes-varenie-hero`, ktorý appka už mala — vrátane jeho zoznamu porcií a odkazu na plán
   varenia. Prototypové tlačidlo `.btn.svetly` cez celú šírku som nenasadil, lebo hero v appke
   ponúka odkaz *„celý plán varenia →"*, ktorý vedie inam než prototypové *„Otvoriť plán varenia"*.
4. **Farba bloku na stĺpci grafu výživy.** Prototyp farbí celý stĺpec farbou bloku. Appka
   v stĺpci ukazuje **rozpad na bielkoviny / tuky / sacharidy** — informáciu, ktorú prototyp
   nemá. Funkčnosť vyhráva: segmenty zostali, ale prefarbil som ich na **tónový rebrík z
   `--text`** (100 % / 62 % / 30 %), aby farby blokov neznamenali raz blok a raz živinu.
   Príslušnosť k bloku nesie **prúžok pod stĺpcom + písmeno v menovke dňa** („Po A").
5. **Prototypové `.riadok`, `.polozka`, `.kk`, `table.ing`, `ol.postup`** sú v appke tie isté
   veci pod inými menami (`.nak-row>label`, `.card`, `table.ing`, `ol.postup`). Vzhľad je
   prenesený cez ne; nové triedy som nezavádzal, aby sa neroztrhla väzba na `app.js`.
6. **`--skala` ako násobiteľ každej veľkosti písma.** Prototyp má `calc(15px * var(--skala))`
   pri každom rozmere, lebo je písaný od nuly. V appke je 900 riadkov CSS s pevnými px —
   riešené `zoom`om na `.content` a `.modal` (viď 2). Výsledok je rovnaký (merané 44/56/64 px),
   cesta iná; poctivé prepísanie všetkých rozmerov na `calc()` nechávam ako samostatnú úlohu.
7. **Prototypový `.kosik`** (plávajúca lišta so súčtom v režime Obchod). Nenasadené: appka má
   spodnú navigáciu na tom istom mieste a súčet ukazuje `.nakup-suhrn` hore. Namiesto neho
   pribudol **prúžok postupu nákupu** (`.nak-pruh`) — odpovedá na tú istú otázku („koľko ešte")
   a nekonkuruje spodnej lište.
8. **`.dennav`** (sedem dní ako veľké dlaždice s prúžkom bloku na mobile). Appka má
   `.plan-den-nav` (sedem chipov v gride), ktorý funguje a je otestovaný. Namiesto duplikovania
   som prototypový vzor použil tam, kde v appke chýbal ekvivalent — na **páse týždňa na Domove**
   (`.tyzden-pas`: kcal, skratka dňa + písmeno bloku, prúžok vo farbe bloku).

---

## 8. Čo pribudlo nad rámec prototypu (a prečo)

* **Prúžok postupu nákupu** `.nak-pruh` — v obchode je najdôležitejšia otázka „koľko ešte".
* **Pás krokov v režime varenia** (`#cook-kroky`) — prototypové `.kroky`; ukazuje, koľko krokov
  zostáva, čitateľné aj cez pol kuchyne.
* **Znak bloku pri názve receptu vo varení** + tlačidlo „Ďalej" vo farbe toho bloku.
* **`.fav` dostalo `z-index:3`** — náhľad receptu (`.thumb`, `position:relative`) hviezdičku
  prekrýval, takže na kartách nebola vidieť vôbec. Regresia z tejto témy, opravená.
* **Výživa na mobile má 2 stĺpce dlaždíc** namiesto 3 (štvrtá visela sama na riadku).

---

## 9. Otvorené / na ďalší raz

1. **`--skala` cez `zoom`, nie cez `calc()`.** Funguje a je zmerané, ale je to náhrada za
   prepísanie pevných px v pôvodnom CSS. Kým to platí, `--cil` sa vnútri `.content` musí deliť
   `--skala` (`--cil-in`) — je to zdroj možného omylu pri ďalších úpravách.
2. **15 zlyhaní v E2E** je predchodné a nesúvisí s dizajnom, ale sada je tým pádom „červená"
   a nedá sa použiť ako brána. Väčšina je len zastaraný selektor v teste.
3. **Horná hlavička podľa prototypu** by si zaslúžila vlastnú vlnu — spolu s presunom
   Nastavení a Špajze z „⋯ Viac" do navigácie.
4. **`scripts/kontrast_organic.py` je zmazaný** (téma, ktorú čítal, už neexistuje);
   nahradil ho `scripts/kontrast_bloky.py`. `dizajn/kontrast_koncepcie.py` som nechal — číta
   prototypy, nie appku, a stále platí.
