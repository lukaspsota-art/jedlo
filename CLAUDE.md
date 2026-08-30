# CLAUDE.md — projekt „Jedlo" (osobná kuchárka + plánovač jedál)

Tento súbor je pre Claude Code / vývojára. Vysvetľuje architektúru, build a pravidlá projektu.

## Čo to je
Osobná **offline webová kuchárka** a **meal-prep plánovač** pre domácnosť (po slovensky).
Jeden samostatný súbor `kucharka.html` sa **generuje** zo zdrojov — neupravuje sa ručne.

## Architektúra (dôležité)
`kucharka.html` je **vygenerovaný artefakt**. Needituj ho priamo. Zdroje:

```
data/sablona.html   HTML kostra + všetok CSS + placeholdery (__APP_JS__, __DATA__, __POTRAVINY__, __JEDALNICKY__, __DATUM__, __POCET__)
data/app.js         VŠETOK JavaScript aplikácie (vanilla JS, žiadny framework)
data/potraviny.json  databáza potravín (výživa, ceny, oddelenia, alergény, balenia, mikroživiny)
recepty/*.json       recepty (1 súbor = 1 recept)
recepty/fotky/       fotky receptov (voliteľné)
jedalnicky/*.json    uložené týždenné jedálničky
generuj_kucharku.py  BUILD: poskladá vyššie uvedené → kucharka.html
```

## Build (spusti po KAŽDEJ zmene zdrojov)
```
py generuj_kucharku.py        # na Windows; inde python3 generuj_kucharku.py
```
Vloží `app.js` na `__APP_JS__`, dáta ako JSON na placeholdery, a zapíše `kucharka.html`.

## Ako overiť
- Syntax JS: `node --check data/app.js`
- Celá sada (po každej zmene `app.js`):
  `node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js && node test_prepocty.js && node test_porcie.js`
- **`test_harness.js`** spúšťa SKUTOČNÝ `app.js` s reálnymi dátami v `node:vm` (fake DOM,
  localStorage v pamäti, deterministický `Math.random`). Všetky testy stoja na ňom:
  `const app = require("./test_harness").load({stav:{...}, seed:42}); app.vyzivaReceptu(...)`.
  Pozn.: harness číta `const`-y cez export na konci súboru — nové konštanty, ktoré má vidieť test,
  dopíš do `EXPORT_TAIL`.
- Merania pred/po (výživa, cena, pravidlá generátora): `node scripts/metriky.js 30`
- Kontrola párovania surovín: `node scripts/kontrola_parovania.js [--nenapar|--vsetko]`
- Build sám kontroluje dáta: množstvo bez jednotky / neznáma jednotka = build padne (`skontroluj_recepty`)
- Otvor `kucharka.html` v prehliadači. Pre PWA/service worker/synchronizáciu spusti lokálny server:
  `python3 -m http.server 8000` a otvor `http://localhost:8000/kucharka.html`.

## Konvencie a nástrahy
- **Offline, single-file:** appka nesmie závisieť od CDN/siete (okrem voliteľnej Supabase synchronizácie). Všetko sa vkladá inline.
- **`app.js` nesmie obsahovať literál `</script>`** (rozbil by inline vloženie).
- Po úprave `app.js`/`sablona.html`/dát **vždy** spusti generátor.
- Stav používateľa je v `localStorage` pod kľúčom **`kucharka_v2`** (obľúbené, hodnotenia, poznámky, plán, špajza, profil/stravníci, váhy, história varenia…).
- `sync-config.js` je **voliteľný a tajný** (Supabase kľúče) — je v `.gitignore`, needituj do neho verejné dáta. Vzor: `sync-config.example.js`, postup: `HOSTING.md`.

## Dátové modely
**Recept** (`recepty/*.json`): `id, nazov, kategoria, kuchyna, zdroj, zdroj_url?, porcie, cas, kcal_na_porciu?, popis, ingrediencie[{nazov,mnozstvo|null,jednotka,poznamka?}], postup[], tipy, foto, tagy[]`.
`zdroj_url` = odkaz na pôvodný recept; detail ho vykreslí ako aktívny odkaz (Varecha to vyžaduje v Content Policy).
Kategórie: Raňajky, Hlavné jedlo, Cestoviny, Polievka, Šalát, Nátierka, Príloha, Pečivo, Snack, Dezert, Kokteil, Nápoj.
**Potravina** (`potraviny.json`): `kluc`, `oddelenie`, `alergeny[]`, `kcal/bielkoviny/tuky/sacharidy` na 100 g, `cena100` €/100 g (**`null` = neznáma cena, `0` = naozaj zadarmo**), `g_za_ks?` (hmotnosť kusa), `g_za_platok?` (hmotnosť plátku), `hustota`, `meso`, `balenie_g?`, `balenie_popis?`, `vlaknina?`, `sodik?`.
**Matchovanie (`najdiPotravinu`)**: kľúč musí sadnúť na súvislú postupnosť SLOV názvu; skloňovanie sa rieši kmeňom kľúča + prefixom slova; pri rovnako dlhom kľúči vyhráva ten bližšie k začiatku názvu. Výsledok je cachovaný.
`recepty/*.json` majú navyše `kcal_zdroj?: "vypocet"` — kcal_na_porciu nie je kurátorované, ale dopočítané (`scripts/dopocitaj_kcal.js`).
**Jedálniček** (`jedalnicky/*.json`): `id, nazov, od, ciel_kcal, plan{ "0".."6": {slot: id|[ids]} }`.

## Kľúčové koncepty v app.js
- `komponent(id)` / `slotIds` — slot v pláne môže mať viac komponentov (hlavné + príloha). Príloha-tokeny `prf:*` (PRILOHY) sú virtuálne recepty.
- `stravniciList()`, `baseDayKcal`, `pocetPorcii`, `mnozMult` — prepočet množstiev pre viacerých stravníkov s rôznymi kalóriami.
- **„%" faktor (`S.planF`, `rescaleDen`, `pf()`) existuje** — je to jemné dorovnanie dňa na cieľ, zovreté na **0,85–1,15**. Množstvá ním NEklesajú: `pocetPorciiDna` ním delí, takže domácnosť dostane vždy svoj kalorický dopyt, len rozdelený na viac menších porcií.
- Bloky (meal-prep): `S.hranice[7]`, `bloky()`, `blokDni()`; default A=Po-Ut, B=St-Št-Pi, C=So-Ne; varný deň = deň pred blokom.
- Generátor: `generujJedalnicek` → `vyberDoSlotu` (pool + kcal-okno `cielSlotu`/`poolVOkne`) → `zlozSlot` → `opravDen` (kcal → poradie jedál → bielkoviny, prehodením jedla) → `zlepsiBielkoviny` (hill-climb) → faktor. Váha receptu (`vahaReceptu`) je multiplikatívna v bielkovinách; pamäť medzi týždňami je `nedavneRecepty` (4 týždne, snacky 26).
- Špajza: `S.spajza`, expirácie, min. zásoby → nákup, `odpisRecept`.
- Nedeliteľné jednotky (ks/rožok/žemľa/plátok) sa zaokrúhľujú na celé.
- Jednotky → gramy: `gZaJednotku` (jediné miesto), `gramy` a `gramyNaJed` sú navzájom inverzné.
- Ceny: **jedna funkcia `cenaTyzdna(mode)`** — `"spotreba"` (domácnosť), `"balenia"` (celé balenia), `"osoba"`.

## Mobilné UI (v20 — mobil je hlavné zariadenie)
Cieľové zariadenie: **Nothing Phone (3a) Pro** → CSS viewport **393×850**, breakpoint je `820px`.
- **Jedna primárna akcia na obrazovku**, zvyšok do `.menu-wrap` + `.menu` („⋯ Viac"). Na mobile je
  `.menu` spodný panel (`position:fixed`), na počítači dropdown. **`.menu`/`.menu-wrap` musia byť
  v CSS definované PRED `@media(max-width:820px)`** — inak prebijú mobilné pravidlá.
- **`<details class="panel mob-zbal">`** = sekundárny panel: na počítači otvorený (`open` v HTML),
  na telefóne ho zavrie `zbalNaMobile()` pri starte. `<details class="panel">` bez `mob-zbal` je
  zbalený všade. Polia vnútra zostávajú v DOM, takže `ulozProfil()` ich vidí aj zavreté.
- **Filtre v Receptoch:** selecty sú v `.f-body`, na mobile ich odomkne `prepniFiltre()`
  (`.controls.f-open`); počet aktívnych filtrov píše `renderGrid` do `#f-cnt`.
- **Farby pod bielym textom používaj `--accent-fill`, nie `--accent`.** `--accent` je v tmavom
  režime zosvetlený pre TEXT (na bielom písme dáva 3,26:1); `--accent-fill` sa nezosvetľuje.
- **Dotykové ciele ≥44 px na mobile**, nikdy nie pod 24 px. Výnimka: hustá mriežka plánu.
- **Nové ovládanie píš ako `<button class="btn">`.** `<span onclick>` nie je dosiahnuteľný
  klávesnicou; chipy/kolekcie/menu to dorovnáva `zpristupniKliky(root)` — **vždy jej dávaj
  koreň prekresleného kontejnera**, nie `document` (mriežka má 19 000 uzlov).
- Štýly viaž na **triedu, nie na element** (`select.f` nechalo `input.f` bez štýlu).
- **V bunke plánu je 1 primárna akcia + `⋯ viac`** (`akcieSlotu`), rozdelenie blokov je v `⋯ Viac`
  (`otvorRozdelenie`). Nepridávaj ďalšie mini-linky do bunky — bolo ich 5 a plán vyzeral rozbito.
- **`table.plan` má `<colgroup>`** — `table-layout:fixed` inak berie šírky z riadku s `colspan`
  a stĺpec s názvami jedál zabral 718 px. Na mobile je `table-layout:auto` (jeden viditeľný deň).
- **Poradie vrstiev (z-index):** dropdown 20 < menu 40 (70 na mobile) < spodná lišta 50 < prekrytie 60
  < režim varenia 80 < **dialóg 90** < **toast 100**. Dialóg MUSÍ byť nad varením — inak sa „➕ Časovač"
  v kuchyni otvorí neviditeľne a appka čaká na odpoveď. Kontroluje to test v `test_ux.js`.
- **Zakázané suroviny a „Mám doma" zdieľajú `obsahujeSurovinu`** (kmeň + prefix 3–5 znakov).
  Diétny filter radšej blokuje viac; nepridávaj tam čisté `includes`, prepustí skloňovanie.
- Meranie/regresie: skripty v scratchpade session (Playwright + Edge, viď `AUDIT_UI_2026-08-19.md`).
  **Testuj obrazovky s dátami** — prázdny plán skryl 5 ovládacích prvkov na bunku aj malé ciele.

## Doménové pravidlá (batch cooking)
3 bloky/týždeň (A: Ne večer→Ut, B: Ut večer→Pi, C: Pi večer→Ne), 1 variant/slot/blok, bez opakovania naprieč blokmi, bez carryover C→A. 4 jedlá (raňajky/obed/snack/večera), poradie kcal obed>večera>raňajky>snack, obed≠večera, raňajky sendvič/wrap iná báza/blok. Cieľ ~1400–1450 kcal/os./deň. Pantry staples vždy do nákupu. RecipeTinEats obmedzene.

## Nápady na ďalší vývoj
Backlog a inšpirácia z 25 aplikácií: `INSPIRACIA.md`. Otvorené (treba backend/dáta): OCR bločkov, živé viac-reťazcové letáky, plné mikroživiny, komunitné zdieľanie, AI import z videa.

## Zdroje receptov (od v21)
Všetkých **1956 receptov má dohľadateľný zdroj** — žiadny `vlastný recept` ani prázdne pole:
Varecha.sk 1365 · Fitrecepty (kniha) 309 · Wikibooks Cookbook (CC BY-SA) 113 · TheCocktailDB 71 ·
Kaufland 48 · BBC Good Food 16 · TheMealDB 10 · iné 24.
- **Varecha.sk:** `robots.txt` povoľuje `Claude-User` (user-initiated fetch), zakazuje `ClaudeBot` (training).
  Content Policy vyžaduje **atribúciu + aktívny odkaz** → preto `zdroj` aj `zdroj_url` v každom recepte.
  Recepty sa parsujú z `application/ld+json` (schema.org Recipe), množstvá sú v `recipeIngredient` ako `„názov, 250 g"`.
- **Anglické portály (od 20. 8. 2026):** kanonické medzinárodné jedlá berieme z **BBC Good Food**
  (`robots.txt` blokuje len `GPTBot`, `User-agent: *` recepty povoľuje; JSON-LD má aj výživu)
  a **TheMealDB** (otvorené dáta, kanonické názvy — „Spaghetti alla Carbonara", nie varecha
  „Carbonara so špenátom"). Indexy: BBC 17 102 receptov zo sitemap, TheMealDB 789.
- **Allrecipes / Serious Eats / Simply Recipes (People Inc.) sa POUŽIŤ NEDAJÚ.** V `robots.txt`
  majú `anthropic-ai` aj `Claude-SearchBot` → `Disallow: /` a v hlavičke výslovný zákaz TDM,
  trénovania **aj RAG** a vytvárania datasetov z ich obsahu. Nepokúšaj sa to obchádzať iným UA.
- Párovanie SK názvu na anglický index: len **konkrétne názvy jedál** (`dish_query`), generické
  slová („nátierka", „šalát") dávajú nezmysly. Ďalej penalizuj varianty (`vegan`, `keto`,
  `air-fryer`) a zmenu hlavnej suroviny („Kuracie fajitas" ≠ „Chickpea Fajitas").
- Pipeline (audit → index → priradenie → náhrada → nové) je v `%TEMP%\jedlo_audit\` (mimo repa, `jed_*.py`).
  Kľúčové filtre proti zlým zhodám: druh jedla (posledné slovo pred predložkou), jadro názvu,
  zhoda bielkoviny a **zhoda kurzu podľa varecha `keywords`** (`Polievky`/`Šaláty`/`Nápoje`…).

## Stav a otvorené veci
- Git je v poriadku (história od v1). Audit z 18. 8. 2026 (`AUDIT_KUCHARKA_2026-08-18.md`) je vyriešený celý — viď `CHANGELOG.md` v19.
- UI audit z 19. 8. 2026 (`AUDIT_UI_2026-08-19.md`): 16/20, dva priechody (druhý s naplneným plánom).
  Otvorené P1 — karty receptov a bunky tabuľky plánu nie sú dosiahnuteľné klávesnicou (`<div onclick>`);
  mriežka renderuje všetkých 1336 receptov naraz.
- `data/app.js` má **~192 KB / 1600 riadkov**. Rozdelenie na moduly + spájanie v generátore je stále otvorené;
  pozor na poradie top-level `const`-ov (funkcie sú hoistnuté, konštanty nie).
- Fotky receptov: pole `foto` nemá nastavené ani jeden recept, `recepty/fotky/` je prázdny — v UI sú emoji.
- 45 receptov má postup na jeden krok (snacky, pečivo, kokteily — je to v poriadku)
  a 60 nemá `kuchyna` (snacky a prílohy, kde kuchyňa nedáva zmysel).
- `treska-v-cesticku` nemá `kcal_na_porciu`: počíta sa celých 300 ml oleja na vyprážanie.
  Rovnaká chyba (vsiaknutý vs. použitý olej) sa týka aj ďalších vyprážaných receptov.
- **`test_generator.js` A2 padá** (medián bielkovín ~90 g/deň, test chce ≥ 95). Nie je to regresia kódu:
  skutočné recepty majú nižšiu hustotu bielkovín (g/100 kcal) než predchádzajúce vymyslené.
  Slabina sú raňajky (2,8 g/100 kcal) a snacky (2,4). Buď doplniť ďalšie bielkovinovo husté raňajky,
  alebo upraviť prah testu — pridávanie priemerných receptov medián naopak riedi.
