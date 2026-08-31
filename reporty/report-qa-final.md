# Finálne QA — projekt Jedlo, 31. 8. 2026

Vetva `e3`, commit `16b67b1`. Testované na vygenerovanom `kucharka.html` (5,20 MB, 1898 receptov,
972 potravín) v Chromiu cez Playwright, telefón **393×850** (Nothing Phone 3a Pro) aj 1440×900.
Zdrojové súbory appky som nemenil — menil som len `e2e/` a `scripts/qa/`.

---

## ZHRNUTIE — je appka pripravená na denné používanie?

1. **Na plánovanie a na varenie áno. Na nákup nie.** To je jediná, ale zásadná trhlina.
2. **Nákupný zoznam pýta v každom z 20 testovaných týždňov o 29–288 % viac jedla, než hlási plán**
   (medián 2,40×). Appka to sama priznáva vetou „⚠️ Nákup pokrýva o 230 % viac kalórií".
3. Príčina je v dátach: **127 receptov (6,7 %) má množstvá, ktoré sa rozchádzajú s deklarovanými
   kalóriami viac než 2×** — „Lasagne plátky 4500 g", „Celozrnný starší chlieb 4000 g".
4. Generátor ich vyberá rovnako ochotne ako zdravé recepty, lebo sa riadi deklarovaným `kcal_na_porciu`.
   V obchode to znamená 9 balení lasagní a 5 kg chleba na týždeň pre dvoch. **Toto je P1.**
5. **Druhá vec: na telefóne nevidíš bez skrolovania ani jedno jedlo a ani jednu položku nákupu.**
   Plán aj Nákup majú nad obsahom 5–7 blokov ovládania. V obchode je to trenie pri každom otvorení.
6. **Tretia vec: prvé načítanie na 4 Mbit/s trvá 13,7 s** (5,2 MB v jednom súbore). Druhýkrát je
   to okamžité (service worker), ale po každej aktualizácii sa sťahuje celých 5,2 MB znova.
7. Všetko ostatné drží: **0 chýb v konzole**, **28 z 28 druhov poškodeného `localStorage` appka ustála**,
   **0 prienikov XSS zo 16 pokusov cez 8 vstupov**, build padá na všetkých 6 nebezpečných vstupoch,
   v repozitári ani v `docs/` nie sú žiadne tajomstvá.
8. Zo 15 sľúbených funkcií **12 funguje úplne**, 3 čiastočne (fotky 2,8 % receptov; import len ručný
   formulár + fotka z mobilu; oddelenia nákupu sa prestaviť dajú — `NAVOD.md` to má zastaralé).
9. Režim varenia je najlepšia obrazovka appky — tmavá, 23 px písmo, časovače, hlas, wake lock.
10. **Verdikt: pusti to na plánovanie a varenie hneď, ale nákupný zoznam ešte neber do obchodu,
    kým nebude opravený P1.** Odhad opravy: pol dňa (filter v generátore + oprava 127 receptov).

---

## NÁLEZY PODĽA TOHO, AKO BRÁNIA DENNÉMU POUŽÍVANIU

### P1 — Nákupný zoznam pýta 2,4× viac jedla, než plán sľubuje

**Dôkaz.** `node scripts/qa/nakup_vs_plan.js` — 10 seedov × 2 týždne:

| | hodnota |
|---|---|
| pomer nákup/plán — min / medián / max | **1,29 / 2,40 / 3,88** |
| týždňov s odchýlkou > 5 % | **20 / 20** |
| týždňov s odchýlkou > 100 % | **14 / 20** |
| nakúpených kg / týždeň (2 osoby) | **23,9 kg** (1,7 kg na osobu a deň) |
| cena týždňa (spotreba) | **177,83 €** medián |

Najčastejší vinníci naprieč seedmi: *Špenátové lasagne so zvyškovým kurčaťom* (10×),
*Panzanella — šalát z paradajok a chleba* (10×), *Raňajkový burrito* (7×), *Croque Monsieur* (7×),
*Lasagne s tvarohom* (7×).

**Reprodukcia.** Vygeneruj týždeň → Nákup. V súhrne svieti napr.
„⚠️ Nákup pokrýva o 230 % viac kalórií, než hlási plán." a v zozname:
`Lasagne plátky — 4500 g (bal.: 9× 500 g)` · `Celozrnný starší chlieb — 4200 g (bal.: 5× 1 kg)`.
Screenshoty: `reporty/obrazky/qa-final/12-nakup-hore.png`, `qa-tlac-NÁKUP.png`.

**Koreň.** Dva zdroje pravdy o kalóriách. `vyzivaReceptu` (app.js:353–369, komentár B4) **vždy verí
`kcal_na_porciu`**, nákup kupuje suroviny. Rozdiel meria `node scripts/qa/kcal_deklarovane_vs_suroviny.js`:

| pomer suroviny / deklarované | receptov |
|---|---|
| medián celej databázy | 1,00 ✔ |
| > 1,25× | 312 (17,5 %) |
| > 2× | **125 (7,0 %)** |
| > 3× | 68 (3,8 %) |
| > 5× | **39 (2,2 %)** |

Najhoršie: *Ratatouille* 96,9× (Olivový olej 4600 g), *Garlic Butter Shrimp* 84,3× (Krevety 7200 g),
*Kuracie fajitas* 17,4× (Hladká múka 24 000 g), *Bravčový eintopf s pórom* 16,7× (Maslo 6250 g).
Sú to chyby zberu dát (pravdepodobne „6 × 100 g" prečítané ako 6000 g), nie chyba kódu.
`node scripts/qa/audit_mnozstva.js` nájde **50 receptov s podozrivým množstvom, 17 nad 1200 g jedla
na porciu, 6 nad 2000 g**.

**Návrh opravy (odmerané, `node scripts/qa/navrh_opravy_kcal.js`).**
Nech generátor preskočí recepty, kde `(kcal zo surovín na porciu) / kcal_na_porciu` vypadne
z pásma ⟨0,5; 2⟩ — appka toto pásmo už pozná ako `K_PASMO_LO/HI` a používa ho na makrá.
Vyhodí 127 z 1898 receptov (6,7 %):

| | dnes | s filtrom |
|---|---|---|
| pomer nákup/plán — medián (max) | 2,40 (3,88) | **1,14 (1,32)** |
| týždňov nad +25 % | 20/20 | **3/20** |
| nakúpených kg / týždeň | 23,9 kg | **18,3 kg** |
| cena týždňa | 177,83 € | 164,63 € |

Je to jednoriadková poistka v `_poolPreSlotVypocet`. Trvalá oprava je opraviť tých 127 receptov
(zoznam vypíše `scripts/qa/kcal_deklarovane_vs_suroviny.js`) a filter nechať ako sieť pod novými dátami.

**Vedľajší dopad.** Rovnaká chyba zhodila regresný test `R1` (`node test_regresie.js`):
*„olej na vyprážanie nesmie dať viac než polovicu kcal porcie"* — `zeleninovy-stir-fry-s-kesu`
má 8133 z 8942 kcal z neoznačeného oleja (1840 g). `STAV_PO_VLNE3.md` tvrdí, že v `test_regresie`
zostáva 1 otvorená chyba; **v skutočnosti sú otvorené 2 — R6 aj znovu-otvorené R1.**

---

### P2 — Na telefóne nevidno bez skrolovania ani jedno jedlo a ani jednu položku nákupu

**Dôkaz (393×850, po vygenerovaní týždňa).**
- **Plán:** tabuľka začína na `y = 636 px` z 850. Nad ňou: nadpis + podnadpis, navigácia týždňa,
  prepínač Týždeň/Kalendár, „✨ Zostaviť jedálniček" + „⋯ Viac", **pás rozvrhu (189 px)**,
  pás dní, dátum, hlavička bloku, krokovač počtu osôb. Viditeľných buniek plánu: **1**
  (a tá je odrezaná spodnou lištou). → `reporty/obrazky/qa-final/06-plan-naplneny.png`
- **Nákup:** prvá položka je pod prehybom. Nad ňou: nadpis + podnadpis, navigácia týždňa,
  pole „Pridať vlastnú položku" + „+ Pridať", „⋯ Viac", panel „🏠 Mám doma", panel „🏪 Trasa obchodom",
  súhrn s cenami a varovaním. → `reporty/obrazky/qa-final/12-nakup-hore.png`

**Prečo to bolí.** `PRODUCT.md`: „v obchode — jedna ruka, košík v druhej, veľké ciele, rýchle
odškrtávanie". Dnes je pred prvým odškrtnutím jedno skrolovanie navyše, zakaždým.
Rovnako v Pláne: `NAVOD.md` v15 sľubuje „Na telefóne je vidieť blok pre práve zvolený deň" —
pás dnes ukazuje **všetky tri bloky** a zaberie 189 px.

**Návrh opravy.**
1. Pás rozvrhu na mobile zbaliť na jeden riadok (veta + „✂️ Upraviť rozvrh"), bloky rozbaliť na ťuknutie —
   alebo ukázať len blok práve zvoleného dňa, ako to `NAVOD.md` sľubuje.
2. „🏠 Mám doma" a „🏪 Trasa obchodom" na mobile zabaliť do „⋯ Viac" (sú to veci na počítač, nie do obchodu).
3. Pole „Pridať vlastnú položku" presunúť pod zoznam alebo do „⋯ Viac".
4. Podnadpisy („Z receptov v pláne, zoradené podľa oddelení v obchode.") na mobile skryť.

---

### P3 — Prvé načítanie na 4 Mbit/s trvá 13,7 s

`node scripts/qa/vykon_hranice.js`, reálne throttlovanie cez CDP, čistá cache:

| podmienky | do `RECEPTY` | mriežka pripravená |
|---|---|---|
| 4 Mbit/s, CPU 1× | **13 744 ms** | 13 752 ms |
| 4 Mbit/s, CPU 4× | 13 085 ms | 13 090 ms |
| bez obmedzenia | 662 ms | 664 ms |

Build sám hlási odhad „~10,9 s na 4 Mbit/s" — realita je o 26 % horšia.
Service worker (`kucharka-v19`) cachuje `kucharka.html`, takže **druhé a ďalšie otvorenie je okamžité**;
plná cena sa platí pri prvom spustení a po každej aktualizácii (celých 5,2 MB znova).

**Návrh.** Fotky (0,55 MB, 10 % súboru) vytiahnuť z inline `data:` do `recepty/fotky/` a načítať
`loading="lazy"` — pri hostovanej verzii to je čistá výhra; pri „jeden súbor na disku" sa dá
ponechať dnešný režim ako voľbu (`--fotky inline` už existuje).

---

### P4 — Do tlače prenikli ovládacie prvky pridané vo vlne 3

`node scripts/qa/tlac_probe.js` (ide skutočnou cestou `tlacView`/`tlacTyzden`, teda s `TLAC_CSS`):

| tlač | viditeľné ovládanie na papieri |
|---|---|
| Plán / Týždeň | 37× `✕` pri každom jedle, 28× názov jedla ako tlačidlo, 28× `kcal ✎`, 3× blok, 1× „✂️ Upraviť rozvrh" |
| Nákup | 57× `ⓘ`, 1× textové pole „Mám doma" (zaškrtávacie políčka sú v poriadku — odškrtávaš perom) |

Screenshoty: `reporty/obrazky/qa-final/qa-tlac-PLÁN.png`, `qa-tlac-NÁKUP.png`.
`TLAC_CSS` skrýva `.plan-cell a`, ale bunky plánu majú dnes `<button class="pc-btn">`.

**Oprava — jeden riadok do `TLAC_CSS`:**

    .plan-cell .pc-btn, .rozvrh-upr, .rozvrh-blok, .nak-i, #doma-nakup { display:none !important }

V E2E je to označené ako známe zlyhanie (`e2e/testy/12-tlac.js`, `t.xfail`), aby sa na to nezabudlo.

---

### P5 — Snacky: v mesiaci uvidíš 12 rôznych, z toho pätina je holý chlieb

`node scripts/qa/snacky_10_seedov.js` — 10 seedov × 4 týždne = 280 snackov:

- **Pravidlo „hotový kúpený výrobok" drží: 0 porušení z 280.** Žiadny snack sa nevarí ani neváži. ✔
- Ale **každý seed dá presne 12 unikátnych snackov na 4 týždne** (28 slotov) — každý ~2–3×.
- **21,1 % snackov je holé pečivo** (Celozrnný chlieb 2 plátky 26×, Grahamový rožok 23×, Žemľa 13×,
  Ražný chrumkavý chlieb 10×). „2 plátky chleba" ako olovrant nie je snack.
- **Čerstvé ovocie tvorí 2,5 %** (Pomaranč 5×, Kiwi 2×). Jablko (78 kcal), mandarínky (74),
  čučoriedky (71), jahody (80) sú **pod spodnou hranicou kcal-okna** (0,6 × 145 = 87 kcal),
  takže do plánu nemôžu padnúť vôbec.

**Návrh.** Pre snackový slot rozšíriť `OKNO_DOLE` (napr. 0,45) alebo dorovnať malé snacky
dvojitou porciou; a v poole snackov znížiť váhu čistého pečiva, aby jogurty/tvarohy/ovocie
dostali priestor. Katalóg snackov (90 výrobkov) je dosť veľký — brzdou je okno a váhy, nie dáta.

---

### P6 — Drobnosti, ktoré vidno

| vec | dôkaz | návrh |
|---|---|---|
| **HTML v texte 15 receptov** — v detaile sa doslova zobrazí `Komerčný recept<br />` | screenshot `16-recept-z-planu.png`; `popis` 12×, `postup` 3× | odstrániť značky pri builde |
| **Reklamný text v receptoch** — „NÁŠ TIP: Vyskúšajte HYZA DUO Gril…" | `zbojnicke-kurca-s-klobasou` | vyčistiť `popis` |
| **Pozdrav „Dobré ráno, Ja"** — predvolené meno stravníka „Ja" preteká do pozdravu | `03-domov-po-onboardingu.png` | pri predvolenom mene pozdraviť bez mena |
| **Nástenka otvára 4 metrikami**, dve z nich sú pri prvom spustení pomlčky; `PRODUCT.md` má „12 metrík na úvod" ako anti-referenciu | `03-domov-po-onboardingu.png` | nechať „Jedál v pláne", ostatné pod „⋯ Viac" |
| **59 zo 113 stiahnutých fotiek patrí receptom, ktoré už v `recepty/` nie sú** (vlna 3 ich zmazala) | `recepty/fotky/ZDROJE.json` vs `recepty/*.json` | vyčistiť `recepty/fotky/` a `ZDROJE.json` |
| **Chip „podiel dňa" vedľa prstenca vyzerá ako prázdna značka** | `04b-recept-bez-fotky.png` | zlúčiť prstenec a menovku do jedného prvku |
| **`NAVOD.md` je zastaraný** — tvrdí, že fotky nie sú vôbec (sú, 54), že poradie oddelení je pevné (nie je), že import je len cez Clauda (fotka z mobilu vo vlastnom recepte funguje) | overené nižšie | prepísať tabuľku 15 funkcií |
| **`CLAUDE.md` je zastaraná** — 1956 receptov (dnes 1898), padajúce A2 (dnes prechádza), nulové fotky, „mriežka renderuje všetkých 1336 naraz" (dnes 60 po dávkach) | | prepísať sekciu „Stav a otvorené veci" |

---

## OVERENIE SĽUBOV — 15 funkcií z `NAVOD.md`

`node scripts/qa/overenie_slubov.js` — každá overená v prehliadači na 393×850.

| # | funkcia | stav | čo som nameral |
|---|---|---|---|
| 1 | Obľúbené (★) | ✅ | ★ na karte aj v detaile, prežije reload |
| 2 | Hodnotenie 1–5 + poznámka | ✅ | 15 klikacích polovíc hviezd, poznámka sa ukladá priebežne |
| 3 | Filtre kategória/kuchyňa/čas/diéta | ✅ | 13 chipov, 44 kuchýň, 6 diét, 7 radení; počítadlo `#f-cnt` |
| 4 | **Fotky receptov** | ⚠️ **čiastočne** | **54 z 1898 receptov = 2,8 %**; 12 z nich sú nápoje, ktoré appka do plánu nedá. Fotka sa zobrazí správne (176 px, atribúcia „Foto: TheCocktailDB"). **Recept bez fotky vyzerá dobre** — nie je tam diera, hero má emoji kategórie. |
| 5 | Plánovač Po–Ne × 4 sloty | ✅ | 28 naplnených slotov, 7 dní |
| 6 | Nákupný zoznam z plánu | ✅ | 50–79 položiek podľa týždňa (ale viď P1) |
| 7 | **Nákup podľa oddelení** | ✅ **lepšie, než NAVOD tvrdí** | 12–14 oddelení; **poradie sa prestaviť dá**: Kaufland / Lidl / Vlastné + ↑↓ v paneli „🏪 Trasa obchodom", zmena sa prejaví v zozname |
| 8 | „Čo mám doma" | ✅ | 12 návrhov na 3 suroviny, „Načítať zo špajze" funguje |
| 9 | Makrá zo surovín | ✅ | kcal/B/T/S + vláknina + sodík; pri rozpore so surovinami sa recept priznáva ako „≈ odhad" |
| 10 | Denný cieľ + upozornenie | ✅ | riadok „Σ kcal/deň 1433/1450…" s pásikom, ⚠ pri prekročení |
| 11 | Alergény a diétne značky | ✅ | badge `⚠ orechy / lepok / mlieko / vajcia`, 6 diétnych filtrov |
| 12 | **Import z fotky/textu/odkazu** | ⚠️ **čiastočne** | Ručný formulár „+ Nový recept" **áno**, **fotka z mobilu áno** (`nrFotoZmena` — canvas 320×180 WebP, nič sa neposiela von). Parser JSON-LD z odkazu **nie**, OCR **nie**. `NAVOD.md` fotku z mobilu vôbec nespomína. |
| 13 | Prepočet porcií, g/ml · PL/ČL · oz/cup | ✅ | 500 g → 541,67 g po +1 porcii → 1,19 lb v imperiálnych |
| 14 | Režim varenia | ✅ | tmavý, **23 px písmo na mobile**, krok 1/3, „➕ Časovač" (viac naraz), „🔊 Prečítať", wake lock podporovaný |
| 15 | Tlač / PDF | ✅ | recept, plán, nákup aj „Týždeň (plán+nákup)" — `window.print()` zavolaný v každom prípade (obsah viď P4) |
| — | **Synchronizácia PC ↔ mobil** | ⚙️ **pripravené, nie zapnuté** | funkcie `syncPush/syncPull` existujú, v Nastaveniach je sekcia; `sync-config.js` zámerne chýba (a je v `.gitignore`). Bez neho appka beží normálne a v konzole nie je chyba |
| — | **Offline** | ✅ | po `setOffline(true)` + reload sa appka načíta z cache, 1898 receptov, plán aj nákup dostupné |

**Zhrnutie: 12 z 15 funguje úplne, 3 čiastočne — a #7 funguje lepšie, než návod tvrdí.**

---

## OVERENIE TVRDENÍ Z `STAV_PO_VLNE3.md` — vlastným meraním

| tvrdenie | verdikt | dôkaz |
|---|---|---|
| „Snacky sú hotové kúpené výrobky, žiadny sa nevarí ani neváži" | ✅ **platí** | 10 seedov × 4 týždne = **280 snackov, 0 porušení**. Kokteily a nápoje sa do plánu nedostali ani raz. |
| „Appka sa nedá zložiť poškodeným `localStorage`" | ✅ **platí, aj nad rámec** | **28 z 28 druhov poškodenia** appka ustála: nevalidný JSON, prázdny reťazec, `null`, pole, číslo, boolean, `plan` ako reťazec, `profil` ako pole, `kcal` ako text, stravníci ako čísla, `hranice` ako objekt, `spajza` s NaN, `nakupCheck` ako reťazec, `archiv` ako reťazec, nezmyselné `viewOd`, 50 kB reťazec v profile, **pokus o prototype pollution** aj poškodené vlastné recepty. Vždy: 1898 receptov, mriežka sa vykreslí, `kcal` sa vráti na 1450, stav sa prepíše validným JSON-om, **0 chýb v konzole**. |
| „Používateľské dáta sa escapujú" | ✅ **platí** | **0 prienikov zo 16 pokusov** (2 payloady × 8 vstupov): meno stravníka, názov jedálnička v archíve, poznámka k receptu, vlastná položka nákupu, **vlastný recept** (názov, kuchyňa, popis, ingrediencia, postup, tip, tag), položka špajze, akcie/watch-list/zakázané suroviny, názov vlastného rozvrhu. Payload sa vždy vykreslil ako text. |
| „Build padne pri `</script>` alebo placeholderi v dátach" | ✅ **platí, chytá 6/6** | `scripts/qa/build_bezpecnost.sh`: `</script>` v recepte, placeholder `__APP_JS__`/`__DATA__` v recepte, množstvo bez jednotky, neznáma jednotka, `</script>` v `app.js`, syntaktická chyba v `app.js`. **Žiadny nepustil.** |
| „Celý riadok nákupu je dotykový cieľ, nič nie je pod 24 px" | ✅ **platí** | riadok `<label>` **313×48–61 px**, `ⓘ` je jeho **súrodenec** 44×44 px. Ťuknutie na názov suroviny riadok **odškrtne** (a neotvorí info-okno). Pod 24 px sú len samotné `<input type=checkbox>` 20×20 v Nastaveniach — **všetkých 15 sedí vnútri `<label class="switch">` 327×40 px**, takže skutočný cieľ je 40 px. |
| „V repozitári, v `kucharka.html` ani v `docs/` nie sú tajomstvá" | ✅ **platí** | `python3 scripts/kontrola_tajomstiev.py` — 2045 súborov, 0 nálezov (Supabase URL/JWT/kľúče, GitHub tokeny, OpenAI/Anthropic kľúče, AWS kľúče, vyplnené Sync ID). |
| „test_regresie: z 8 chýb zostáva 1" | ❌ **neplatí — sú 2** | R6 padá (raňajková báza: 4 z 12 týždňov má dva bloky s tou istou bázou) **a R1 sa znovu otvorilo** (`zeleninovy-stir-fry-s-kesu`: 8133 z 8942 kcal z neoznačeného oleja). Naopak R2b a R5a–d už prechádzajú — test ich stále čaká padať. |
| „10/10 zelených, 257 kontrol" | ✅ **platí** | vypocty 35 · generator 16 · nakup 65 · ux 44 · pravidla 44 · odolnost 20 · parovanie 19 · jednotky 14 · prepocty ✓ · porcie ✓ |
| Metriky generátora (`node scripts/metriky.js 30`) | ✅ **sedia** | dní v ±10 % po škálovaní 100 % · poradie O>V>R>S 100 % · korekcia > 15 % 0 % · 0/59 položiek bez ceny · unikátnych snackov 53 · najčastejší snack 6× · unikátnych receptov 257. Pozor: **kcal sa merajú proti deklarovanému `kcal_na_porciu`**, teda proti tomu istému číslu, ktoré je pri 7 % receptov chybné (viď P1). |

---

## VÝKON — namerané čísla

**Veľkosť a načítanie**

| | |
|---|---|
| `kucharka.html` | **5,20 MB** (z toho fotky 0,55 MB = 10 %) |
| `docs/index.html` | 5,20 MB |
| 4 Mbit/s, CPU 1× — do `RECEPTY` / mriežka | **13 744 ms / 13 752 ms** |
| 4 Mbit/s, CPU 4× | 13 085 ms / 13 090 ms |
| bez obmedzenia (1440 px) | 662 ms / 664 ms · DOMContentLoaded 631 ms |
| druhé otvorenie (service worker `kucharka-v19`) | okamžité |

**DOM a pamäť**

| | |
|---|---|
| DOM uzlov po štarte | **2 436** |
| DOM uzlov po prejdení všetkých obrazoviek + generovaní | 3 546 |
| JS heap po štarte | **20–21 MB** |
| kariet v mriežke naraz | **60** (prvá dávka), +60 na každé doskrolovanie |
| uzlov na kartu | 40,6 |

**Časy (CPU spomalené 4×, telefón 393×850)**

| operácia | čas |
|---|---|
| `renderGrid` | 76,1 ms |
| hľadanie („kur") → prekreslenie | 316,4 ms |
| **generovanie týždňa** | **882 ms** (bez spomalenia 145–220 ms) |
| `renderPlan` | 17,8 ms |
| `renderNakup` | 98,7 ms |
| `renderVyziva` | 20,1 ms |
| `renderDash` | 60,3 ms |
| **scroll mriežky** | medián **17 ms**, p95 **20 ms**, **0 rámcov nad 50 ms z 90** |

Mriežka sa dopĺňa správne aj reálnym scrollom: 60 → 120 → 180 → … (overené 12 doskrolovaní,
`IntersectionObserver` + tlačidlo „Načítať ďalších 60 · zostáva N" ako záloha pre klávesnicu).

**Hraničné prípady — všetky bez pádu a bez chyby v konzole**

| prípad | výsledok |
|---|---|
| prázdny plán | Plán ponúkne „Zostaviť jedálniček"; Nákup: „Zatiaľ nič v pláne…"; Výživa nespadne |
| jeden jediný recept v knižnici | generovanie prešlo, naplnilo 28 slotov |
| veľmi dlhé názvy (180 znakov: stravník, položka nákupu, špajza) | dokument **393 px**, nepreteká |
| dva týždne dozadu a dopredu | `-14 / -7 / 0 / +7 / +14` — plán, nákup, výživa aj nástenka sa prekreslia, 0 chýb |
| **zaplnený `localStorage`** (kvóta vyčerpaná, potom 3000 poznámok) | `save()` **nevyhodí výnimku**, ukáže presný toast „⚠️ Zmeny sa nedajú uložiť do tohto prehliadača (plná pamäť alebo súkromné okno). Zálohuj si dáta cez Nastavenia → Zálohovať." a **appka kreslí ďalej** |

---

## ČO JE V PORIADKU — nestrácajte na tom čas

- **Stabilita.** Počas celej prehliadky (3 prechody, ~40 interakcií) **0 chýb v konzole**.
  Rovnako pri všetkých 28 poškodených stavoch a pri 16 XSS pokusoch.
- **Normalizácia stavu** je najlepšie spravená časť kódu — prežije čokoľvek vrátane prototype pollution.
- **Režim varenia**: tmavý, 23 px, krok 1/3, viac časovačov naraz, hlasové čítanie, wake lock,
  Escape zatvára. Screenshot `18-varenie-1.png` — toto je referenčná obrazovka appky.
- **Rozvrh varenia (vlna 3)** je zrozumiteľný: veta „Varíš v nedeľu večer na pondelok a utorok.",
  6 hotových predvolieb, pás `Po · Ut ✂ St`, náhľad vetou, „↩︎ Vrátiť pôvodný",
  a **dialóg vopred povie, čo sa stane s naplneným plánom**.
- **Generovanie nad naplneným týždňom sa pýta** a pripomenie „Uložiť tento plán" — a zrušenie
  naozaj nechá plán nedotknutý (overené).
- **Prístupnosť** — všetky štyri P1 z `AUDIT_UI_2026-08-19` sú **opravené** (viď nižšie).
- **Prepočty**: porcie, jednotky (g/ml · PL/ČL · oz/cup), nedeliteľné suroviny, viac stravníkov
  s rôznymi kalóriami — všetko sedí.
- **Špajza**: expirácie, minimá do nákupu, FIFO odpis, a položka s neznámym „miesto" dostane
  sekciu „📦 Bez zaradenia (neznáme miesto — oprav cez ✎ alebo zmaž)".
- **Ceny**: 0–1 položiek bez ceny na týždeň; položka bez ceny to priznáva značkou „? cena".
- **Tlač receptu** je čistá: 0 formulárových prvkov, 0 afordancií, atribúcia zdroja zostáva.
- **Build**: 0,83 s, sám si overí syntax vygenerovaného JS a padne na všetkých 6 nebezpečných vstupoch.

---

## VYZERALO TO AKO CHYBA, ALE NIE JE

| podozrenie | ako to je naozaj |
|---|---|
| „Mriežka ukazuje len 60 receptov" | Zámerné dávkovanie (A9). Reálnym scrollom sa dopĺňa 60 → 120 → 180 → …, plus tlačidlo „Načítať ďalších" pre klávesnicu a prehliadače bez `IntersectionObserver`. Overené 12 doskrolovaní. |
| „„plán varenia →" nič nerobí" | Robí. Otvára sa do `#modal`/`#overlay`, nie do `#pick-modal` — moja prvá sonda merala zlý prvok. Dialóg „🍳 Plán varenia — Blok A" vypíše jedlá bloku s presnými porciami a odkazom na recept. |
| „Karty receptov nie sú dosiahnuteľné klávesnicou" (4 známe zlyhania v E2E) | **Opravené.** Karta je `.card-open[role="button"][tabindex="0"]`, ★ je jej súrodenec-`<button>`, bunky plánu majú skutočné tlačidlá a `zpristupniKliky` im dáva tabindex. Overené správaním: **skip-link → Tab → Tab → Enter otvorí recept**. Staré testy hľadali `tabindex` na `.card` a text selektora v zdroji skriptu. |
| „Písmo v režime varenia je 16 px" | Nie — `.cook .step` je 30 px na počítači a **23 px na mobile**. |
| „Poradie oddelení v nákupe sa nedá prestaviť" (tvrdí `NAVOD.md`) | Dá. Kaufland / Lidl / Vlastné + ↑↓ v paneli „🏪 Trasa obchodom". |
| „V nákupe spodné položky prekrýva spodná lišta" | Zoznam sa doskroluje, posledná položka končí nad lištou. Lišta prekrýva 2 riadky v ktoromkoľvek okamihu, ale všetky sú dosiahnuteľné. |
| „Payload XSS je vidieť v texte stránky" | To je správne správanie — escapované, teda **zobrazené ako text**, nie vykonané. `window.__xss` zostalo 0 vo všetkých 16 pokusoch. |

---

## E2E SADA — čo som s ňou spravil

**Pred:** 264 prešlo · **15 padlo** · 5 známych zlyhaní.
**Po:** **374 prešlo · 0 padlo · 3 známe zlyhania**, stabilné na **tri behy za sebou**.

Z 15 zlyhaní bolo **13 zastaraných testov** (appka sa zlepšila) a **2 skutočné chyby**:

| skupina | čo padalo | príčina | čo som spravil |
|---|---|---|---|
| 02 Recepty (3×) | „mriežka vykreslí recepty (60)" | mriežka sa od vlny 3 dopĺňa po 60 (výkon) | testy čítajú logický počet z `#pocet`; **pribudli 4 nové kontroly** na samotné dávkovanie |
| 04 Plánovač (2×) | „✂️ Rozdelenie blokov" v menu | premenované na „🍳 Rozvrh varenia (bloky)" + nový pás „✂️ Upraviť rozvrh" | test na nový pás, vetu, počet blokov, 6 predvolieb a náhľad |
| 05 Generátor (2×) | `[onclick*='generujJedalnicek']` | tlačidlo volá `generujTlacidlo()`, aby sa hotový týždeň neprepísal bez otázky (B3) | nový selektor + **kontrola, že sa naozaj pýta a že „Zrušiť" nechá plán nedotknutý** |
| 06 Nákup (1×) | `.odd label .sur-klik` | názov už nie je klikací — celý riadok odškrtáva, `ⓘ` je súrodenec | test na novú stavbu riadku + klik na `ⓘ` |
| 08 Mobil (1×) | to isté | to isté | + kontrola, že riadok má ≥44 px a že ťuknutie na názov odškrtne, nie otvorí okno |
| 11 PWA, 13 Odolnosť (2×) | „kariet > 1000" | dávkovanie mriežky | kontrola, že offline je v súbore všetkých 1898 receptov |
| 13 Odolnosť (1×) | „riadkov === položiek" v špajzi | sekcia „⏰ Spotrebuj čoskoro" je zámerne duplicitná | kontrola, že **každá** položka má aspoň jeden riadok + že neznáme „miesto" dostane „📦 Bez zaradenia" |
| 12 Tlač (1×) | `a[onclick*='window.print']` | položka volá `tlacRecept()` (pripraví `TLAC_CSS`) | nový selektor |
| 09 Prístupnosť (4× známe) | karty/bunky klávesnicou | **už opravené v appke**, testy boli zastarané | prepísané na správanie, `xfail` zrušený |
| **12 Tlač (2×)** | **ovládanie v tlači** | **skutočná chyba (P4)** | ponechané ako `xfail` s presným návodom na opravu v komentári |
| 06 Nákup (1× známe) | „med" chytá „medvedí cesnak" | skutočná chyba (P3 z predošlého auditu) | ponechané ako `xfail` |

Ďalej: `e2e/screenshoty/` je odteraz v `.gitignore` (je to výstup behu, nie zdroj).

**Nové QA sondy v `scripts/qa/`** (dajú sa spúšťať samostatne):

| skript | čo meria |
|---|---|
| `nakup_vs_plan.js` | rozchod nákupu a plánu naprieč seedmi (P1) |
| `kcal_deklarovane_vs_suroviny.js` | zoznam receptov, kde suroviny nesedia s deklarovanými kcal |
| `audit_mnozstva.js` | recepty s nereálnym množstvom (g jedla na porciu) |
| `navrh_opravy_kcal.js` | odmeraný dopad navrhovaného filtra v generátore |
| `snacky_10_seedov.js` | pravidlo „hotový kúpený výrobok" + pestrosť snackov |
| `bezpecnost.js` | 16 XSS pokusov cez 8 vstupov + 28 druhov poškodeného `localStorage` |
| `build_bezpecnost.sh` | build musí padnúť na 6 nebezpečných vstupoch |
| `overenie_slubov.js` | 15 funkcií z `NAVOD.md` v prehliadači |
| `prehliadka.js` | prechod človekom na 393×850, 19 screenshotov |
| `vykon_hranice.js` | reálne throttlovanie 4 Mbit/s + CPU 4×, hraničné prípady |
| `dotykove_ciele.js` | dotykové ciele po obrazovkách |
| `tlac_probe.js` | čo zostane viditeľné v skutočnej tlači |

---

## ČO BY SOM ROBIL RÁNO, V TOMTO PORADÍ

1. **P1** — filter v generátore (`_poolPreSlotVypocet`) + oprava 127 receptov. Bez toho nemá zmysel
   ísť s appkou do obchodu. Meranie dopadu je pripravené: `node scripts/qa/navrh_opravy_kcal.js`.
2. **P2** — zbaliť pás rozvrhu a panely nákupu na mobile. Dve hodiny práce, ale zmení to pocit
   z appky viac než čokoľvek iné.
3. **P4** — jeden riadok do `TLAC_CSS`.
4. **P3** — fotky mimo inline (voľba pri builde už existuje).
5. **P5** — okno kcal pre snacky + váha pečiva.
6. Prepísať `NAVOD.md` a `CLAUDE.md` — obe klamú o stave, ktorý je dnes lepší, než tvrdia.

---

*Screenshoty k reportu: `reporty/obrazky/qa-final/` · surové dáta posledného behu E2E:
`e3/e2e/posledny-beh.json` · celá prehliadka: `e3/e2e/screenshoty/prehliadka/`*
