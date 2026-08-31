# CLAUDE.md — projekt „Jedlo" (osobná kuchárka + plánovač jedál)

Tento súbor je pre Claude Code / vývojára. Vysvetľuje architektúru, build a pravidlá projektu.
Používateľský pohľad je v `PRECO_A_AKO.md` a `NAVOD.md`.

> **Čísla označené ⟳ sa ešte hýbu** — do databázy pribúdajú recepty. Premeraj si ich sám:
> `python3 generuj_kucharku.py` (počty a veľkosť) a `node scripts/metriky.js 30` (výživa, cena).
> Stav, z ktorého tento súbor vychádza: 31. 8. 2026, **1995 receptov ⟳ · 1070 potravín ⟳ ·
> 113 fotiek · `kucharka.html` 2,52 MB ⟳ · `data/app.js` 345 KB / 3874 riadkov**.

## Čo to je
Osobná **offline webová kuchárka** a **meal-prep plánovač** pre domácnosť (po slovensky).
Jeden samostatný súbor `kucharka.html` sa **generuje** zo zdrojov — neupravuje sa ručne.

## Architektúra (dôležité)
`kucharka.html` je **vygenerovaný artefakt** (je v `.gitignore`). Needituj ho priamo. Zdroje:

```
data/sablona.html   HTML kostra + všetok CSS + placeholdery (__APP_JS__, __DATUM__, __POCET__)
data/app.js         VŠETOK JavaScript aplikácie (vanilla JS, žiadny framework)
                    + placeholdery dát (__DATA__, __POTRAVINY__, __JEDALNICKY__, __FOTO_ZDROJE__)
data/potraviny.json  databáza potravín (výživa, ceny, oddelenia, alergény, balenia, mikroživiny)
recepty/*.json       recepty (1 súbor = 1 recept)
recepty/fotky/       fotky receptov (`<id>.webp`) + `ZDROJE.json` (licencie a atribúcia)
jedalnicky/*.json    uložené týždenné jedálničky
dizajn/tema-bloky.css  zdroj dizajnovej témy (do šablóny ju vkladá scripts/vloz_temu.py)
generuj_kucharku.py  BUILD: poskladá vyššie uvedené → kucharka.html (+ docs/ pre GitHub Pages)
```

## Build (spusti po KAŽDEJ zmene zdrojov)
```
python3 generuj_kucharku.py              # na Windows: py generuj_kucharku.py
python3 generuj_kucharku.py --data=json  # nekomprimované dáta — čitateľný, o ~2,7 MB väčší súbor na ladenie
python3 generuj_kucharku.py --striktne   # varovanie o množstvách sa berie ako chyba (do CI)
```

**Build je brána, nie prekladač.** Padá s nenulovým kódom a slovenskou hláškou pri: pokazenom
JSON-e receptu, recepte bez `id`, duplicitnom `id`, neznámej/chýbajúcej jednotke, pokazenej
potravine, jedálničku s neexistujúcim receptom, chýbajúcej šablóne alebo `app.js`, literáli
`</script>` v dátach aj v `app.js`, placeholderi v dátach a pri syntaktickej chybe vo
vygenerovanom JS. Keď padne, **`kucharka.html` sa neprepíše** — starý build zostane funkčný.

## Ako overiť
- Syntax JS: `node --check data/app.js`
- Celá sada (po každej zmene `app.js`) — **10 sád, 264 pomenovaných kontrol**:
  ```
  node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
    && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
    && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js
  node test_regresie.js     # 12 kontrol, MUSÍ hlásiť 0 otvorených chýb
  ```
  (vypocty 35 · generator 16 · nakup 65 · ux 46 · jednotky 14 · parovanie 19 · pravidla 49 ·
  odolnost 20 · prepocty ✓ · porcie ✓)
- **`test_regresie.js` je zoznam už opravených chýb**, nie bežný test. Každá kontrola vie,
  či má prejsť alebo padnúť; keď sa stav zmení, test to povie. Nulu treba udržať.
- **`test_harness.js`** spúšťa SKUTOČNÝ `app.js` s reálnymi dátami v `node:vm` (fake DOM,
  localStorage v pamäti, deterministický `Math.random`). Všetky testy stoja na ňom:
  `const app = require("./test_harness").load({stav:{...}, seed:42}); app.vyzivaReceptu(...)`.
  Pozn.: harness číta `const`-y cez export na konci súboru — nové konštanty, ktoré má vidieť test,
  dopíš do `EXPORT_TAIL`.
- **E2E v prehliadači:** `./e2e/spusti.sh` (Playwright + Chromium, ~380 kontrol; `e2e/testy/`
  je 13 skupín od smoke po tlač). `e2e/screenshoty/` je výstup behu a je v `.gitignore`.
- Merania pred/po (výživa, cena, pravidlá generátora): `node scripts/metriky.js 30`
  — jeden seed je ilustrácia. **Na rozhodovanie používaj `node scripts/kvalita.js 24 8`**
  (N seedov × W týždňov), inak meriaš šum ±3 body.
- Kontrola párovania surovín: `node scripts/kontrola_parovania.js [--nenapar|--vsetko]`
- Kontrast farieb: `python3 scripts/kontrast_bloky.py` (padne pri poklese pod WCAG AA)
- Tajomstvá v repozitári: `python3 scripts/kontrola_tajomstiev.py`
- QA sondy (`scripts/qa/`): `nakup_vs_plan.js`, `kcal_deklarovane_vs_suroviny.js`,
  `audit_mnozstva.js`, `nakup_hmotnost.js`, `snacky_10_seedov.js`, `snacky_30tyzdnov.js`,
  `bezpecnost.js` (XSS + poškodený stav), `build_bezpecnost.sh`, `overenie_slubov.js`,
  `vykon_hranice.js`, `dotykove_ciele.js`, `tlac_probe.js`, `prehliadka.js`.
- Otvor `kucharka.html` v prehliadači. Pre PWA/service worker/synchronizáciu spusti lokálny server:
  `python3 -m http.server 8000` a otvor `http://localhost:8000/kucharka.html`.

## Konvencie a nástrahy
- **Offline, single-file:** appka nesmie závisieť od CDN/siete (okrem voliteľnej Supabase
  synchronizácie). Všetko sa vkladá inline — fonty aj fotky ako `data:` URI.
- **`app.js` nesmie obsahovať literál `</script>`** (rozbil by inline vloženie).
- Po úprave `app.js`/`sablona.html`/dát **vždy** spusti generátor.
- Stav používateľa je v `localStorage` pod kľúčom **`kucharka_v2`** (obľúbené, hodnotenia, poznámky,
  plán, špajza, profil/stravníci, váhy, história varenia…).
- `sync-config.js` je **voliteľný a tajný** (Supabase kľúče) — je v `.gitignore`, needituj do neho
  verejné dáta. Vzor: `sync-config.example.js`, postup: `HOSTING.md`.

## Dáta v súbore sú skomprimované (od v25)
`generuj_kucharku.py` vkladá recepty, potraviny, jedálničky a zdroje fotiek ako **raw DEFLATE
(RFC 1951) + base64** (recepty 4,32 → 1,89 MB, potraviny 0,23 → 0,03 MB; súbor 5,35 → 2,52 MB,
prvé načítanie na 4 Mbit/s 13,5 → 6,0 s).
- Rozbaľuje `_rozbal()` + `_zlInflate()` na začiatku `app.js`. Musí to byť **SYNCHRÓNNE**:
  `RECEPTY` je top-level `const`, od ktorého závisí zvyšok súboru, takže `DecompressionStream`
  (async) sa použiť nedá. `_zlInflate` (~55 riadkov, postup „puff" zo zlib) je **jediná pridaná
  závislosť** — žiadne CDN, žiadna knižnica, `file://` funguje.
- `_rozbal` prepustí hotové pole/objekt bez zmeny → `test_harness.js` aj `--data=json` fungujú.
- Fotky ostávajú inline; base64 WebP sa nekomprimuje, ale ani nezväčší.
- Kontroluje to `test_ux.js` (`_zlInflate` proti `zlib`, 6 vzoriek × 5 nastavení).
- **Placeholder (`__DATA__`, `__POTRAVINY__`, `__JEDALNICKY__`, `__FOTO_ZDROJE__`) smie byť
  v `app.js` PRÁVE RAZ — aj v komentári.** Generátor nahrádza všetky výskyty jedným prechodom;
  druhý výskyt (aj zakomentovaný) vloží dáta druhýkrát a súbor narastie o ~1,9 MB. Build na to
  padne. To isté platí pre `__APP_JS__`, `__DATUM__`, `__POCET__` v šablóne.
- Cena, ktorú treba poznať: JS heap tesne po štarte narástol z 20 na 38 MB (dočasné
  medzivýsledky rozbaľovania). Na telefóne to nie je problém; ak by raz bol, ďalší krok je
  rozbaľovať po častiach.

## Dátové modely
**Recept** (`recepty/*.json`): `id, nazov, kategoria, kuchyna, zdroj, zdroj_url?, porcie, cas,
kcal_na_porciu?, kcal_zdroj?, popis, ingrediencie[{nazov, mnozstvo|null, jednotka, poznamka?,
vsiaknutie?}], postup[], tipy, foto, tagy[], typ?`.
- `zdroj_url` = odkaz na pôvodný recept; detail ho vykreslí ako aktívny odkaz (Varecha aj
  CC BY-SA to vyžadujú).
- **`vsiaknutie` (0–1) na INGREDIENCII** = podiel suroviny, ktorý sa naozaj dostane do jedla.
  Olej na vyprážanie, nálev v pohári, marináda. Do **výživy** ide len zjedená hmota
  (`g × vsiaknutie`), do **ceny a do nákupu vždy plné množstvo** — 600 ml oleja musíš kúpiť celé.
  Je to na ingrediencii, nie na recepte: musaka má 600 ml oleja na vyprážanie (vsiakne ~25 %)
  **aj** 170 g masla v bešamele (zje sa celé). Chýbajúce/neplatné = 1 (dnešné správanie).
  Používané koeficienty: 0,12 nálev · 0,15 cestíčko · 0,18 trojobal · 0,20 kaluž na panvici ·
  0,25 plátky zeleniny · 0,30 marináda. Restovanie, zásmažka a nátierka príznak **nedostávajú**.
- `kcal_zdroj` má tri hodnoty: `"vypocet"` (dopočítané zo surovín, nekurátorované),
  `"korekcia_olej"`, prípadne chýba (kurátorované číslo).
- `typ: "vyrobok"` = hotový kúpený výrobok (snacky, viď nižšie).
- Kategórie: Raňajky, Hlavné jedlo, Cestoviny, Polievka, Šalát, Nátierka, Príloha, Pečivo, Snack,
  Dezert, Kokteil, Nápoj.
- **Fotka sa neviaže cez pole `foto`, ale konvenciou súboru.** Ak je `foto` prázdne, build skúsi
  `recepty/fotky/<id>.webp` a vloží ho ako base64. Dnes je v priečinku **113 fotiek, z toho 54
  sedí na existujúci recept** — zvyšných 59 patrí receptom, ktoré vypadli pri čistke dát vo
  vlne 3, a `recepty/fotky/` aj `ZDROJE.json` by sa mali od nich vyčistiť. Rozpočet na inline
  fotky je `FOTKY_ROZPOCET_MB = 2,5` — nie je to tvrdý limit, build to len vypíše.

**Potravina** (`potraviny.json`): `kluc`, `oddelenie`, `alergeny[]`, `kcal/bielkoviny/tuky/sacharidy`
na 100 g, `cena100` €/100 g (**`null` = neznáma cena, `0` = naozaj zadarmo**), `g_za_ks?`
(hmotnosť kusa), `g_za_platok?`, `hustota`, `meso`, `balenie_g?`, `balenie_popis?`, `vlaknina?`, `sodik?`.

**Matchovanie (`najdiPotravinu`)**: kľúč musí sadnúť na súvislú postupnosť SLOV názvu; skloňovanie
sa rieši kmeňom kľúča + prefixom slova; pri rovnako dlhom kľúči vyhráva ten bližšie k začiatku
názvu. Výsledok je cachovaný.

**Jedálniček** (`jedalnicky/*.json`): `id, nazov, od, ciel_kcal, plan{ "0".."6": {slot: id|[ids]} }`.
`DNI[0] = "Pondelok"` — jedálniček uložený s nedeľou na indexe 0 sa načíta posunutý.

## Kľúčové koncepty v app.js
- `komponent(id)` / `slotIds` — slot v pláne môže mať viac komponentov (hlavné + príloha).
  Príloha-tokeny `prf:*` (PRILOHY) sú virtuálne recepty. **Snackový slot môže mať dvojicu**
  (jablko + orechy), ale oba komponenty sú **skutočné kúpené výrobky**, nie `prf:` tokeny —
  majú vlastnú kartu, vlastný riadok v nákupe aj vlastnú cenu.
- `stravniciList()`, `baseDayKcal`, `pocetPorcii` — prepočet množstiev pre viacerých stravníkov
  s rôznymi kalóriami.
- **„%" faktor (`S.planF`, `rescaleDen`, `pf()`) existuje** — jemné dorovnanie dňa na cieľ,
  zovreté na **0,85–1,15**. Množstvá ním NEklesajú: `pocetPorciiDna` ním delí, takže domácnosť
  dostane vždy svoj kalorický dopyt, len rozdelený na viac menších porcií.
- Bloky (meal-prep): `S.hranice[7]`, `bloky()`, `blokDni()`; default A=Po-Ut, B=St-Št-Pi, C=So-Ne;
  varný deň = deň pred blokom. **Rozvrh je nastaviteľný** — 6 predvolieb + vlastné rozdelenie
  (`otvorRozdelenie`), vlastný rozvrh sa dá uložiť.
- Generátor: `generujJedalnicek` → `vyberDoSlotu` (pool + kcal-okno `cielSlotu`/`poolVOkne`
  + turnaj 24 kandidátov podľa `skoreJedla`) → `zlozSlot` → `opravDen` (kcal → poradie jedál →
  bielkoviny) → `zlepsiBielkoviny` / `zlepsiVlakninu` (hill-climb) → `snackyPoDnoch` → faktor.
  - **Bielkoviny aj vláknina sa optimalizujú PO škálovaní** (`denBielkovinyPoSkal`,
    `denVlakninaPoSkal`) — deň so 100 g v 1700 kcal má po zmenšení porcií reálne 85 g.
  - **`vratSlot(denPlan, slot, ctx, zaloha)` je JEDINÉ miesto, ktoré vracia zamietnutú výmenu.**
    Vracia `denPlan`, `ctx.pouzite` **aj `ctx.stopa`**. Keď sa stopa nevrátila, blok si
    zaregistroval bázu/kuchyňu receptu, ktorý v ňom nakoniec nebol — a pool ďalších blokov sa
    tým zbytočne zúžil (to bola príčina R6). Nikdy nevracaj slot ručne.
  - `_pravidlaRanajok(pool, ctx)` — doménové pravidlo raňajok sa uplatňuje aj na **zálohu poolu**
    (`sirsi`). Uvoľniť sa smie len *voliteľné* zúženie (kuchyňa dňa, mäso za sebou),
    nikdy doménové pravidlo.
  - Pamäť medzi týždňami: `nedavneRecepty`, `TYZDNE_PAMATE` 22, `TYZDNE_PAMATE_SNACK` 14.
    `_uplatniPamat` prijme stupeň pamäte, len ak v poole nechá aspoň ~35–40 % receptov —
    dlhšia pamäť, než katalóg unesie, sa **ticho neuplatní**.
  - **Rozpočet / cenový strop:** `_cenovyStrop(p, slot)` s `CENA_LUX = 3,0` je mäkký strop na
    luxus. V bežnom slote sa meria €/100 kcal; **v snackovom slote na PORCII** a s mediánovou
    poistkou — hotový výrobok má 60–150 kcal, takže €/100 kcal mu vyjde vysoké aj pri bežnej
    cene a strop by vyhodil presne skyr, šunku a tuniak, kvôli ktorým slot existuje.
- Špajza: `S.spajza`, expirácie, min. zásoby → nákup, `odpisRecept` (FIFO podľa expirácie),
  `zasobaPlatna` (expirovaná ani záporná zásoba nezmenšuje nákup).
- Nedeliteľné jednotky (ks/rožok/žemľa/plátok) sa zaokrúhľujú na celé, a to až na **súčte**
  v nákupe, nie po receptoch.
- Jednotky → gramy: `gZaJednotku` (jediné miesto), `gramy` a `gramyNaJed` sú navzájom inverzné.
- Ceny: **jedna funkcia `cenaTyzdna(mode)`** — `"spotreba"` (domácnosť), `"balenia"` (celé
  balenia), `"osoba"`. `dovodBezCeny(G)` je jediné miesto, kde sa rozhoduje, či je cena neznáma;
  položka bez ceny to v UI **priznáva** odznakom „? cena" s dôvodom.
- Nákup po oddeleniach: `PORADIE_ODDELENI` je len **predvoľba Kauflandu**. Skutočné poradie dáva
  `poradieOddeleni()` podľa `S.obchod` (`kaufland` / `lidl` / `vlastne`); vlastné poradie sa
  prestavuje šípkami ↑↓ v paneli „🏪 Trasa obchodom" a `ozdravPoradie` ho dopĺňa a čistí voči
  `PORADIE_ODDELENI`, takže nové oddelenie nikdy nevypadne.

## Bezpečnosť a odolnosť (nerozbi to)
- **Normalizácia stavu podľa typov.** `STAV_TYPY` popisuje očakávaný typ každého kľúča a
  `normalizujStav(o)` z neho vyrobí platný stav. Appka sa **nedá zložiť poškodeným
  `localStorage`** — overených 28 druhov poškodenia (nevalidný JSON, prázdny reťazec, `null`,
  pole, číslo, boolean, `plan` ako reťazec, `spajza` s NaN, 50 kB reťazec v profile, **pokus
  o prototype pollution**, poškodené vlastné recepty). Vždy: mriežka sa vykreslí, `kcal` sa vráti
  na predvolenú hodnotu, stav sa prepíše validným JSON-om, **0 chýb v konzole**.
  Keď pridávaš nový kľúč do `S`, pridaj ho do `STAV_TYPY`. Kryje to `test_odolnost.js`.
- **Escapuje sa pri VYKRESĽOVANÍ, nie pri zápise** — `escHtml()`. Escapovanie pri zápise kedysi
  deformovalo dáta (uložené „Kuracie &amp; ryža" sa nedalo nájsť podľa vlastného názvu a vo
  varení sa doslova svietilo `&amp;`); `unescHtml` beží raz nad starými stavmi (`S.escV`).
  Overené: 0 prienikov zo 16 XSS pokusov cez 8 vstupov (meno stravníka, názov jedálnička,
  poznámka, vlastná položka nákupu, vlastný recept, špajza, watch-list, názov rozvrhu).
- **`uloz()` zlyhanie neprehltne** — pri plnej kvóte alebo v súkromnom okne ukáže toast
  a appka kreslí ďalej.
- Build padá na **všetkých 6 nebezpečných vstupoch** (`scripts/qa/build_bezpecnost.sh`).
- V repozitári, v `kucharka.html` ani v `docs/` nie sú tajomstvá
  (`scripts/kontrola_tajomstiev.py`, 2045 súborov, 0 nálezov).

## Vzhľad — dizajnový systém „Bloky" (v24, koncepcia B)
Paleta stojí na jednej myšlienke: **farba = varný blok**. Týždeň má tri bloky a každý má
vlastnú farbu, ktorá ide cez plán, nákup, domov aj varenie — v pláne aj v nákupe hneď vidieť,
na ktorú várku položka patrí. `--signal` je len na STAV (nad cieľom, odobrať, po expirácii),
nikdy nie na identitu. Podklad je teplá šeď `--zem`, nie krém.

Celá téma je JEDEN blok na konci `<style>` v `data/sablona.html` medzi
`/* Bloky theme — start */` a `/* Bloky theme — end */`. Blok pôvodné CSS iba **prebíja**,
nič v ňom nemaže — odstránenie témy = zmazať blok.
- Zdroj témy je **`dizajn/tema-bloky.css`**; do šablóny (aj s base64 fontmi) ju vloží
  **`python3 scripts/vloz_temu.py`**. Šablónu needituj v tomto bloku ručne.
- Fonty **Archivo** (nadpisy a čísla, premenlivá váha 400–800) a **Instrument Sans** (text)
  sú base64 `data:` URI, 4 súbory / 106 KB (latin + latin-ext pre každý). Appka musí zostať
  jeden offline súbor — nepridávaj `@import` ani CDN. **Slovenskú diakritiku nesie latin-ext**
  (č ď ľ ň ŕ š ť ž), latin nesie á é í ó ô ú ý a €; bez oboch podmnožín text ochorie.
- **Tokeny:** `--zem --doska --tint --text --text2 --linka --okraj --tlac/--na-tlaci`,
  bloky `--blok-a` (slivka) `--blok-b` (more) `--blok-c` (oliva) + `--na-bloku`,
  `--signal`, `--zlato`, `--akcent`/`--akcent-tlac` (= farba práve zobrazeného bloku),
  `--skala --cil --cil-in --r --r-mala --r-btn`.
  Staré tokeny (`--bg --panel --ink --muted --line --chip --accent --accent-fill
  --accent-dark --warn --gold`) sú na ne **premapované** — pôvodné CSS sa tým prefarbí naraz.
- **Tmavá téma má dva vstupy:** výslovná voľba `body.dark` a systémové nastavenie
  `@media(prefers-color-scheme:dark){ body:not(.svetla) }`. `applyVzhlad()` pridáva na `<body>`
  triedu `svetla` ako STAMP — bez nej platí systém ešte pred spustením JS. Obe sady tokenov
  musia byť identické; kontroluje to `scripts/kontrast_bloky.py`.
- `python3 scripts/kontrast_bloky.py` číta tokeny priamo zo šablóny a **padne**, ak niektorý
  pár klesne pod WCAG AA (obe témy + natrvalo tmavá plocha varenia). Spusti po každej zmene farieb.
- **Farba nikdy nesmie byť jediný nosič informácie** (WCAG 1.4.1): ku každej farbe bloku patrí
  písmeno A/B/C — `znakBloku(bi)` vyrába `<span class="znak blok-x">A</span>`. Používa sa
  v hlavičke plánu, v riadku nákupu, na Domove, v páse týždňa, v grafe výživy aj vo varení.
  Položka nákupu môže patriť do viacerých blokov naraz — vtedy má viac znakov (**A B C**).
- **Znak bloku NA ploche bloku sa musí obrátiť** (`background:var(--na-bloku);color:var(--text)`),
  inak splynie — týka sa `.dnes-varenie-hero`, `table.plan th.blok-*` a `td.blok-hlava`.

## Tri režimy hustoty (jadro koncepcie B)
Prepínač **Plánovanie / Obchod / Kuchyňa** je v bočnom paneli (`#rezimy`, na mobile vlastný
riadok pod značkou). Voľba žije v `S.profil.rezim` (je v `STAV_TYPY`, takže prežije aj poškodený
stav), prežije reload a nastavuje na `<html>` atribút `data-rezim`, ktorý mení dva tokeny:

| režim | `--skala` | `--cil` | situácia |
|---|---|---|---|
| Plánovanie | 1,0 | 44 px | v pokoji, hustejšia informácia, tabuľka týždňa |
| Obchod | 1,22 | 56 px | jedna ruka, košík v druhej, rýchle odškrtávanie |
| Kuchyňa | 1,5 | 64 px | mastné ruky, telefón opretý, veľké písmo |

- `--skala` je nasadená ako **`zoom` na `.content` a `.modal`** — pôvodné CSS má stovky pevných
  px a prepísať ich všetky by bola iná úloha. Pevná navigácia (`.side`, `.botnav`, `.cook`)
  sa nezoomuje, aby fixed-position prvky nezmenili súradnicovú sústavu.
- Preto sú vnútri zoomovanej plochy dotykové ciele `max(44px, var(--cil-in))`, kde
  `--cil-in = var(--cil) / var(--skala)`; mimo nej sa používa `--cil` priamo.
- **Kuchyňa NEPREBÍJA režim varenia** — dopĺňa ho. Varenie sa otvára ako doteraz.
- Režim Obchod skrýva na Nákupe nadpis, podtitul, riadok „+ Pridať / ⋯ Viac", panely
  „Mám doma"/„Trasa obchodom" a poznámku o pokrytí kalórií. V Plánovaní sú späť.

## Mobilné UI (mobil je hlavné zariadenie)
Cieľové zariadenie: **Nothing Phone (3a) Pro** → CSS viewport **393×850**, breakpoint je `820px`.

**Meradlo (v25):** na 393×850 s naplneným plánom musí byť **prvé jedlo v Pláne a prvá položka
v Nákupe viditeľné bez skrolovania vo všetkých troch režimoch hustoty** (`.botnav` začína na
y ≈ 780). Namerané po oprave: Plánovanie 526 / 400 · Obchod 664 / 480 · Kuchyňa 748 / 555.
- `p.sub` je na telefóne na Pláne a Nákupe skrytý; `h2.h` navyše v Obchode a Kuchyni.
- `.plan-topline` drží navigáciu týždňa a prepínač Týždeň/Kalendár na jednom riadku;
  `#plan-kontext` má `flex:1 1 190px`, aby sa pri 1,5× zalomil prepínač, nie navigácia.
- `#rozvrh-pas` je na telefóne zbalený na jeden riadok (`prepniRozvrhPas()`, trieda `otvoreny`);
  v Kuchyni je na telefóne skrytý celý (pri sporáku rozvrh nenastavuješ).
- `tr.ctrl-row` (👥 stravníci + ikonky jedál dňa) je na telefóne skrytá, otvára ju
  `prepniPlanCtrl()` z „⋯ Viac" (`body.plan-ctrl`).
- `#v-nakup` je na telefóne `display:flex;flex-direction:column` + `order` — pole „Pridať vlastnú
  položku" a panely „Mám doma"/„Trasa obchodom" sú POD zoznamom. Pravidlo musí byť na
  `#v-nakup.view.active`, inak by bol pohľad viditeľný vždy.
- Súhrn nákupu má sekundárne údaje v `<details class="suhrn-viac">`; `renderNakup` mu dáva
  `open` len na počítači (`jeMobil()`).
- **Nič sa neskrýva bez náhrady.** Všetko skryté je dosiahnuteľné z „⋯ Viac" alebo rozbaľovacím
  `▾`. Priznaná výnimka: v režime Kuchyňa (1,5×) je nad prehybom názov jedla a začiatok bunky,
  ale nie jej spodok — získať ďalších ~100 px sa dá len skrytím primárneho tlačidla
  „✨ Zostaviť jedálniček", čo je proti pravidlu „jedna primárna akcia na obrazovku".

Ďalšie mobilné pravidlá:
- **Jedna primárna akcia na obrazovku**, zvyšok do `.menu-wrap` + `.menu` („⋯ Viac"). Na mobile je
  `.menu` spodný panel (`position:fixed`), na počítači dropdown. **`.menu`/`.menu-wrap` musia byť
  v CSS definované PRED `@media(max-width:820px)`** — inak prebijú mobilné pravidlá.
- **`<details class="panel mob-zbal">`** = sekundárny panel: na počítači otvorený (`open` v HTML),
  na telefóne ho zavrie `zbalNaMobile()` pri starte. `<details class="panel">` bez `mob-zbal` je
  zbalený všade. Polia vnútra zostávajú v DOM, takže `ulozProfil()` ich vidí aj zavreté.
- **Filtre v Receptoch:** selecty sú v `.f-body`, na mobile ich odomkne `prepniFiltre()`
  (`.controls.f-open`); počet aktívnych filtrov píše `renderGrid` do `#f-cnt`.
- **`app.js` píše farby do INLINE štýlov a inline štýl sa nedá prebiť žiadnym selektorom.**
  Jediné miesto opravy je hodnota tokenu, preto tam smú byť **len tokeny, nikdy hex**.
  Je to **26 miest** (prázdny stav Receptov, prstenec podielu, „Zmazať recept", dátum v páse
  týždňa, súčet kcal v pláne, onboarding, filtre generátora, `stavCiel`, `makroBar`, `ring`,
  dlaždice Výživy, graf, makrá, účet, špajza, graf váhy) — presné riadky sa posúvajú, nájdi ich
  `grep -n "style=.*var(--" data/app.js`.
  Jediné hexy, ktoré v `app.js` smú zostať, sú **`COOK_BLOKY`** — plocha varenia je natrvalo tmavá
  a potrebuje SVETLÉ varianty farieb blokov (svetlá slivka `#6E2A55` by na `#141210` dala 2,3:1
  a tlačidlo „Ďalej" by zhaslo) — a záložná farba manifestu.
- **`--akcent` sa počíta na `<html>`** (`nastavAkcent(bi)` cez `setProperty`), takže sa
  vnútri `.cook` NEprefarbí sám: `var()` v hodnote vlastnej vlastnosti sa substituuje na prvku,
  kde je deklarovaná. Preto `spustiCook()` nastavuje `--akcent` priamo na `#cook`.
- **Dotykové ciele ≥44 px na mobile, nikdy nie pod 24 px** — a to aj na počítači.
  Výnimka: hustá mriežka plánu (`#plan-den-nav`).
- **Nové ovládanie píš ako `<button class="btn">`.** `<span onclick>` nie je dosiahnuteľný
  klávesnicou; chipy/kolekcie/menu to dorovnáva `zpristupniKliky(root)` — **vždy jej dávaj
  koreň prekresleného kontejnera**, nie `document`. `zpristupniKliky` preskakuje skutočné
  `<button>` (nepečiatkuje na ne rolu druhýkrát).
- Karta receptu je **jeden obal** `.card-open[role="button"][tabindex="0"]`, `★` je jej
  **súrodenec**-`<button>` (skutočný button vnútri `role="button"` by bol vnorený button).
- Fokus: po otvorení modálu ide na `✕` (`_fokusDoModalu`), po zavretí sa vracia na prvok,
  z ktorého sa otváralo (`_vratFokus` v `zavri`, `zavriPick`, `zavriCook`, `dlgZavri`).
- Štýly viaž na **triedu, nie na element** (`select.f` nechalo `input.f` bez štýlu).
- **V bunke plánu je 1 primárna akcia + `⋯ viac`** (`akcieSlotu`), rozdelenie blokov je v `⋯ Viac`
  (`otvorRozdelenie`). Nepridávaj ďalšie mini-linky do bunky — bolo ich 5 a plán vyzeral rozbito.
- **`table.plan` má `<colgroup>`** — `table-layout:fixed` inak berie šírky z riadku s `colspan`
  a stĺpec s názvami jedál zabral 718 px. Na mobile je `table-layout:auto` (jeden viditeľný deň).
- **Mriežka receptov sa kreslí po dávkach 60** (`_gridZoz`, `#grid-viac`, `IntersectionObserver`
  s `rootMargin:600px` + plnohodnotné tlačidlo „Načítať ďalších 60"). Filtre, hľadanie, `#pocet`
  aj `#f-cnt` počítajú nad **celým** výsledkom, nie nad vykreslenou dávkou. Stráž
  `if(!r.width && !r.height) return;` je nutná — Recepty sa kreslia aj keď je obrazovka skrytá.
- **Poradie vrstiev (z-index):** dropdown 20 < menu 40 (70 na mobile) < spodná lišta 50 < prekrytie 60
  < režim varenia 80 < **dialóg 90** < **toast 100**. Dialóg MUSÍ byť nad varením — inak sa „➕ Časovač"
  v kuchyni otvorí neviditeľne a appka čaká na odpoveď. Kontroluje to test v `test_ux.js`.
- **Zakázané suroviny a „Mám doma" zdieľajú `obsahujeSurovinu`** (kmeň + prefix 3–5 znakov).
  Diétny filter radšej blokuje viac; nepridávaj tam čisté `includes`, prepustí skloňovanie.
  Pozor: „Čo mám doma" (`skoreReceptu`) a `pridajChybajuceDoNakupu` majú **vlastný, voľnejší
  algoritmus** — dve obrazovky s tým istým názvom sa preto správajú mierne inak. Je to otvorené.
- **Testuj obrazovky s dátami** — prázdny plán skryl 5 ovládacích prvkov na bunku aj malé ciele.

## Tlač (v25)
V tlači sa rozlišujú **dva druhy tlačidiel**:
- **len akcia** (`.pc-x`, `.pc-ed`, `.nak-i`, `.plan-varenia`, `.rozvrh-upr`, `.rozvrh-bloky`,
  `.plan-zbal`, `.nak-pruh`, panely nákupu) → `display:none`
- **nesie obsah** (`.plan-cell .nm.pc-btn`, `.plan-cell .kc.pc-btn`) → **`display:contents`**:
  schránka tlačidla zmizne z rozloženia, text sa vytlačí. **Skryť ich cez `.plan-cell .pc-btn`
  by vytlačilo PRÁZDNY plán** — názov jedla je tiež `.pc-btn`.

Aby sa dala z `.kc` odstrániť ceruzka bez straty čísla, má vlastný obal
`<i class="pc-ed" aria-hidden="true">✎</i>`.
`tlacPriprav()` na čas tlače otvára zbalené `#v-nakup details.odd` (inak by 14 položiek
dochucovadiel na papieri chýbalo) a `tlacUprac()` ich na `afterprint` vracia — obrazovka sa
pod rukami nezmení. Plán a Týždeň sa tlačia **A4 na šírku** (`TLAC_PAGE_SIROKO`), recept a nákup
na výšku. Zaškrtávacie políčka v nákupe sa na papieri **nechávajú** — odškrtáva sa perom.
Stav: **0 ovládacích prvkov** v tlači plánu, nákupu, receptu aj týždňa; kontroluje
`node scripts/qa/tlac_probe.js` a E2E `12-tlac.js` (vrátane poistky, že každá bunka plánu má názov).

## PWA a offline
- `sw.js` beží v režime **stale-while-revalidate**: appka sa otvorí okamžite z cache a na pozadí
  sa **podmieneným** requestom (`cache:"no-cache"`) overí novšia verzia. Bez `no-cache` Chrome
  odpovedá service workeru z vlastnej HTTP cache a nový build sa nikdy nedotiahne.
- Precache nie je natvrdo zapísaný názov súboru — appka pošle SW-u `{typ:"precache", url:location.href}`,
  takže to funguje pre `kucharka.html` (Netlify) aj `index.html` (GitHub Pages).
- `sync-config.js` a `sw.js` sú z cache natrvalo vylúčené.
- `VERZIA` v `sw.js` sa **nemusí** bumpovať pri každom builde (obsah rieši SWR) — len keď treba
  vynútiť vyhodenie celej cache.
- Generátor kopíruje do `docs/` aj `sw.js` (bez neho GitHub Pages nemá offline).
- Synchronizácia je voliteľná (Supabase). Push posúva timestamp **až po overenom úspechu**,
  inak sa stav označí ako nenahratý (`_dirty`) a dotlačí sa pri `online`. Konflikt rieši
  „posledná úprava vyhráva" nad celým blokom `SHARED_FIELDS` — je to vedomý dizajn, viď `HOSTING.md`.

## Doménové pravidlá (batch cooking)
3 bloky/týždeň (A: Ne večer→Ut, B: Ut večer→Pi, C: Pi večer→Ne — **nastaviteľné**),
1 variant/slot/blok, bez opakovania VARENÉHO receptu naprieč blokmi, bez carryover C→A,
4 jedlá (raňajky/obed/snack/večera), poradie kcal **obed > večera > raňajky > snack**,
obed ≠ večera, raňajky sendvič/wrap vo všedný blok a iná báza na blok.
Cieľ ~1400–1450 kcal/os./deň. Pantry staples vždy do nákupu. RecipeTinEats obmedzene.

**Snack je výnimka a nesmie sa do batch cookingu vtiahnuť.**
- **Snack = hotový kúpený výrobok** z Kauflandu. Nič, čo sa varí, mixuje alebo váži.
  Jedno balenie alebo kus = jedna porcia, výživa reálna **na balenie**, nie na 100 g.
  Formát: `kategoria: "Snack"`, `typ: "vyrobok"`, `porcie: 1`, `ingrediencie` jedna položka
  `1 ks`, `postup` jeden krok („Otvor balenie a zjedz."), `cas: "1 min"`, `zdroj: "Kaufland"`,
  tagy `kúpené` a `bez prípravy`. Každý výrobok potrebuje záznam v `data/potraviny.json`
  s reálnou slovenskou cenou 2026.
- **Snack sa NEVIAŽE na bloky.** Losuje sa na každý deň (`snackyPoDnoch`, `_inySnack`), lebo
  pravidlo „1 variant na slot a blok" je pravidlo *varenia* — tri rôzne jogurty sa kupujú
  rovnako ľahko ako tri rovnaké. Bez toho je strop pestrosti 12 snackov na mesiac (4 týždne ×
  3 bloky), nech je katalóg akokoľvek veľký. Per-denné snacky sa dopĺňajú **až po dogenerovaní
  všetkých blokov** — keď bežali vnútri bloku, ich voľby cez `ctx.pouzite` zúžili pool
  nasledujúcich blokov a zaplatili to hlavné jedlá.
- **Snack smie byť dvojica** (jablko + orechy, jogurt + banán). Doplnok dostane výrobok, ktorý
  nie je snack sám o sebe: príliš malý (< 85 kcal) alebo výživovo chudobný (< 4 g bielkovín /
  100 kcal — sem padá holý rožok, holý chlieb, popcorn aj čokoláda). Bielkovinový doplnok
  k ovociu/zelenine/pečivu/orechom, ovocie k mliečnym/syrom/mäsu/sladkému. Voľba je
  **deterministická** (hash id + poradie týždňa) — keď závisela od priebežného `ctx.pouzite`,
  optimalizátor rátal s inou dvojicou, než sa do plánu zapísala.
- `nejednotneBloky()` snackový slot **ignoruje** — „nejednotný blok" je varovanie o tom, že sa
  v bloku varí viackrát, a snack sa nevarí.
- Pestrosť snackov sa neriadi kuchyňou (výrobky žiadnu nemajú), ale **druhom regálu**
  (`snackDruh`: ovocie / zelenina / mliečne / syr / mäso / orechy / sušené / pečivo / tyčinka /
  sladké / slané / nápoj).
- Doménové pravidlá stráži `test_pravidla.js` (49 kontrol) na viacerých seedoch:
  `SEEDS=1,2,3,7,42,99,555,20260818 TYZDNOV=6 node test_pravidla.js`.

**Pozor na „soft constraints".** Filtre vo `vyberDoSlotu` majú tvar `if(p.length) pool=p` —
pri prázdnom výsledku sa voliteľné zúženie ticho zahodí (radšej vyplnený deň než prázdny slot).
Doménové pravidlá (raňajková báza, snack = výrobok) sú z tohto vyňaté a vynucujú sa aj na zálohe
poolu. Keď pridávaš pravidlo, rozhodni sa vedome, do ktorej skupiny patrí.

## Nápady na ďalší vývoj
Backlog a inšpirácia z 25 aplikácií: `INSPIRACIA.md`. Otvorené (treba backend/dáta): OCR bločkov,
živé viac-reťazcové letáky, plné mikroživiny, komunitné zdieľanie, AI import z videa,
denník skutočného príjmu (nie plánu), `.ics` export plánu do kalendára.

## Zdroje receptov
**Každý recept má dohľadateľný zdroj** — žiadny `vlastný recept` ani prázdne pole (⟳ dnes 1995):
Varecha.sk 1282 · Fitrecepty (kniha) 303 · Kaufland 235 (z toho 187 kúpených snackov) ·
Wikibooks Cookbook (CC BY-SA) 116 · BBC Good Food 17 · TheCocktailDB 12 · TheMealDB 10 ·
RecipeTin Eats 5 · iné ~15.
- **Varecha.sk:** `robots.txt` povoľuje `Claude-User` (user-initiated fetch), zakazuje `ClaudeBot`
  (training). Content Policy vyžaduje **atribúciu + aktívny odkaz** → preto `zdroj` aj `zdroj_url`
  v každom recepte. Recepty sa parsujú z `application/ld+json` (schema.org Recipe), množstvá sú
  v `recipeIngredient` ako `„názov, 250 g"`.
- **Wikibooks Cookbook (CC BY-SA):** licencia vyžaduje odkaz na zdroj — **všetkých 116 receptov
  má `zdroj_url`** (doplnené vo vlne 3, stránky overené cez API).
- **Anglické portály:** kanonické medzinárodné jedlá berieme z **BBC Good Food**
  (`robots.txt` blokuje len `GPTBot`; JSON-LD má aj výživu) a **TheMealDB** (otvorené dáta,
  kanonické názvy — „Spaghetti alla Carbonara", nie varecha „Carbonara so špenátom").
- **Allrecipes / Serious Eats / Simply Recipes / Bon Appétit (People Inc.) sa POUŽIŤ NEDAJÚ.**
  V `robots.txt` majú `anthropic-ai` aj `Claude-SearchBot` → `Disallow: /` a v hlavičke výslovný
  zákaz TDM, trénovania **aj RAG**. Šesť receptov, ktoré sa cez to prepašovali, bolo vo vlne 3
  prepísaných; **dnes je zo zakázaných zdrojov 0 receptov** — over si to pred každým importom.
- Párovanie SK názvu na anglický index: len **konkrétne názvy jedál** (`dish_query`), generické
  slová („nátierka", „šalát") dávajú nezmysly. Ďalej penalizuj varianty (`vegan`, `keto`,
  `air-fryer`) a zmenu hlavnej suroviny („Kuracie fajitas" ≠ „Chickpea Fajitas").
- Kľúčové filtre proti zlým zhodám: druh jedla (posledné slovo pred predložkou), jadro názvu,
  zhoda bielkoviny a **zhoda kurzu podľa varecha `keywords`** (`Polievky`/`Šaláty`/`Nápoje`…).

## Kvalita dát receptov — čo sa už raz pokazilo
- **„N ks" × celé balenie je chyba, nie prevod.** `scripts/oprav_jednotky_ks.js` kedysi previedol
  „Olivový olej 5 ks" (= 5 lyžíc) na 5 × 920 g = 4600 g. Bežalo to 425× naprieč 307 receptami
  a nákup potom pýtal **2,4× viac jedla, než plán hlásil**. Opravených 252 receptov / 349 zmien
  (`scripts/oprav_mnozstva.js`, dôvod ku každej zmene v `export/opravy_mnozstva.json`).
  **Váha kusa nikdy nesmie byť celé balenie** — `g_za_ks` / `g_za_platok`, nie `balenie_g`.
- **Poistka v builde: `skontroluj_mnozstva`**, prah **700 g jedla na porciu** (bez vody, vývaru,
  bujónu, nálevu, marinády a oleja na vyprážanie; nápoje a kokteily vyňaté). Vypisuje aj jednu
  surovinu nad 700 g na porciu, aj keď celý recept prah nepresiahne. Nie je to tvrdý pád
  (legitímne prípady existujú) — pád si vyžiadaš cez `--striktne`.
- **Nákup vs. plán je dnes 1,15×** (bolo 2,4×). Zvyšok **nie sú poškodené množstvá**: nákup
  nekupuje nič navyše (0,99 voči surovinám), rozdiel je medzi *deklarovaným* `kcal_na_porciu`
  a dopočtom zo surovín — a generátor vyberá podľa deklarácie, takže uprednostňuje recepty
  s podhodnotenou deklaráciou. **Hromadné prepisovanie deklarácií je zamietnuté** (skúšané:
  pomer 1,15 → 1,11, ale medián bielkovín 118,5 → 116,1 g a dní pod 80 g 0 → 2,9 %).
  Otvorená cesta je zúžiť pásmo výberu v `_poolPreSlotVypocet` z ⟨0,5; 2⟩ na ⟨0,7; 1,4⟩.
- **B4 platí:** kurátorovanému `kcal_na_porciu` sa verí; makrá a cena sa škálujú faktorom
  `k = deklarované / dopočítané`, **vláknina a sodík nie** (ich chyba je z chýbajúcich dát,
  nie z hmoty). Rozdiel > 10 % appka priznáva značkou „≈ odhad".
- **Vláknina 22,9 g/deň bola chyba merania, nie méta.** Ťahal ju jeden recept s kilogramom
  chleba na porciu. Skutočnosť je ~18,5 g ⟳ proti odporúčaným 25–30.

## Stav a otvorené veci (31. 8. 2026)
Všetkých 10 testovacích sád je zelených (264 kontrol), `test_regresie.js` hlási **0 otvorených
chýb**, E2E sada v prehliadači prechádza, `kontrast_bloky.py` je OK, build padá na všetkých
6 nebezpečných vstupoch. Audit z 18. 8. (`AUDIT_KUCHARKA_2026-08-18.md`) je vyriešený celý;
z UI auditu z 19. 8. (`AUDIT_UI_2026-08-19.md`) sú **všetky štyri P1 opravené** — karty receptov
aj bunky plánu sú dosiahnuteľné klávesnicou a mriežka sa kreslí po dávkach 60, nie naraz.

Otvorené je toto:

1. **Najčastejší snack sa objaví 6–7× za 30 týždňov ⟳**, cieľ je 3×. Nie je to chyba výberu:
   210 snackových dní by si vyžiadalo pamäť ~70 ťahov, ale `_uplatniPamat` nesmie vyprázdniť
   pool. Riešenie je väčší katalóg — odhad ~100 ďalších kúpených výrobkov.
2. **Raňajky sú najužšie hrdlo generátora.** Sendvičových raňajok je 40, z toho 32 sa vojde
   do kcal-okna a **ani jedna** nemá nad 8 g bielkovín na 100 kcal (medián 3,7). Pravidlo
   „vo všedný blok sendvič/wrap, iná báza na blok" má tak k dispozícii príliš málo: unikátnych
   všedných raňajok je 27 z 60 ťahov. Návrh: **+40 wrap/rožok/bageta** (toast nepridávať, tých je
   15 a dominuje) a **+20 vysokobielkovinových raňajok**. Bázu `bagel` má dnes 1 recept — buď
   doplniť 5–8, alebo ju v `ranajkyBaza` zlúčiť s rožkom.
3. **Vláknina 18,5 g/deň ⟳** proti odporúčaným 25–30. Reálna, novo viditeľná úloha pre pool a váhy.
4. **Diverzita má aritmetický strop.** 3 bloky × 4 jedlá = **12 rôznych varených receptov na
   týždeň**, nech je databáza akokoľvek veľká. Za 30 týždňov je strop 360 a sme na ~85 %.
   Cieľ „400 unikátnych za 20 týždňov" je 1,7× nad stropom 240 — posunúť sa dá len zmenou
   doménového pravidla (4 bloky, alebo 2 varianty na slot v bloku), čo je produktové rozhodnutie.
5. **`recepty/fotky/` má 59 osirelých fotiek** (patria receptom zmazaným pri čistke dát).
   Vyčistiť priečinok aj `ZDROJE.json`.
6. **Verzia sa hlási na troch miestach a nesedí.** `app.js` má `VERZIA = "v20"` (a `sw.js` z nej
   odvodzuje názov cache), `CHANGELOG.md` je na v25, dizajn je „Bloky v24". Nastavenia teda
   používateľovi ukazujú „v20". Treba jeden zdroj pravdy (napr. placeholder v šablóne).
7. **`data/app.js` má 345 KB / 3874 riadkov** — rozdelenie na moduly + spájanie v generátore je
   stále otvorené; pozor na poradie top-level `const`-ov (funkcie sú hoistnuté, konštanty nie).
8. **Nové top-level konštanty nie sú v `EXPORT_TAIL`** (`_memoMaso`, `_memoBaza`, `GEN_SK`,
   `PAMAT_STUPNE`, `KCAL_PASMO`, `VLAKNINA_CIEL`). Žiadny test ich zatiaľ nepotrebuje.
9. **Profil so 6 slotmi** (Desiata, Olovrant) nie je premeraný ani po jednej vlne.
   `SLOT_PODIEL`, `VLAKNINA_CIEL` aj `_cenovyStrop` sa normalizujú počtom slotov, takže *by* mal
   sedieť — ale je to nepremerané.
10. **Dve otvorené záložky sa navzájom prepíšu** — `app.js` nemá listener na `storage`
    a `uloz()` serializuje celý `S`.
11. **`zjednotBloky()`** („Zjednotiť bloky" v UI) skopíruje prvý deň bloku na ostatné **vrátane
    snacku**, čím zruší per-denné snacky. Je to výslovná voľba používateľa a `nejednotneBloky()`
    ju sama neponúka, ale je to nekonzistentné.
12. **Šesť implementácií „obsahuje túto surovinu".** Nákup a zakázané suroviny zdieľajú
    `obsahujeSurovinu`, ale „Čo mám doma", `pridajChybajuceDoNakupu`, `spajzaSedi`, `odpisRecept`
    a `expBoost`/`jeVakcii`/`jeWatch` majú vlastné varianty. Dôsledok: to isté slovo funguje
    v Nákupe a nefunguje v „Čo mám doma".
13. **Import receptu z fotky/textu/odkazu appka nemá** — nie je v nej parser JSON-LD ani OCR.
    Appka má ručný formulár „+ Nový recept" (aj s fotkou z mobilu cez `nrFotoZmena`, canvas
    320×180 WebP, nič sa neposiela von). Import robí Claude mimo appky — píš to tak všade.
14. **`.ics` export plánu** chýba (tlačidlo v menu v šablóne + ~20 riadkov).
