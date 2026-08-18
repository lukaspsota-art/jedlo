# Changelog

Zhrnutie vývoja (v1 = prvá verzia). Detaily funkcií sú v `NAVOD.md`.

- **v1–v2** — základná kuchárka: recepty ako JSON, generátor `generuj_kucharku.py`, HTML prehliadač s vyhľadávaním, filtrom, detailom, prepočtom porcií; import 7 receptov z PDF.
- **v3** — layout s bočným menu + Nástenka; ceny €/porcia, výživa graf, profil domácnosti, „čo variť dnes", dojedz zvyšky, náhrady, história.
- **v4** — automatický jedálniček, škálovanie na kcal, zlúčenie jednotiek v nákupe, prepínač jednotiek, „mám doma", archív, tlač týždňa, tmavý režim.
- **v5** — bohatšie kategórie, generátor v2 (kuchyne/bielkoviny/sezónnosť), balenia v nákupe, akcie, TDEE, záloha dát, režim varenia v2 (časovače + hlas).
- **v6** — nákup exaktné čísla, blokový meal-prep plánovač, dvojkrokový výber, PWA/hosting príprava, voliteľná synchronizácia.
- **v7** — batch cooking podľa pravidiel domácnosti (bloky A/B/C, 4 jedlá, poradie kalórií, sendvičové raňajky).
- **v8** — kompletné jedlá (hlavné + príloha/pečivo), auto-doplnenie prílohy/pečiva.
- **v9** — 16 príloh + 12 snackov ako recepty; databáza potravín rozšírená; prieskum aplikácií (`INSPIRACIA.md`).
- **v10** — modul Špajza/mraznička (miesto, expirácie, min. zásoby, odpis po uvarení) + vodný tracker.
- **v11** — kupované snacky (preferencia), mikroživiny (vláknina/sodík), adaptívny cieľ (váha+trend), okno 16:8, watch-list surovín.
- **v12** — dizajn: menej tlačidiel, rozbaľovacie „⋯ Viac".
- **v13** — otvorenie receptu z plánu, plán varenia na blok, kalendár histórie varenia.
- **v14** — recept z plánu na správny počet porcií (zrušený „%" faktor), stravníci s rôznymi kalóriami, nedeliteľné suroviny na celé, sendviče Po–Pi.
- **handoff** — JS oddelený do `data/app.js`, `CLAUDE.md`/README/CHANGELOG, git; pripravené na Claude Code.
- **v15** — flexibilné jedlá dňa (Desiata/Olovrant, voliteľné sloty cez `SLOTY()`), skrývanie receptov z generátora (`S.skryte`), `escHtml` na vstupoch vlastných receptov.
- **v16** — per-deň/blok počet porcií (aj jednotlivé jedlo) → premieta sa do nákupu aj plánu varenia; maska jedál (vynechať jedlo v dni/bloku, prázdny deň = celý von, sivé „vyp." bunky); filtre generátora ako pravidlá pre rozsah dní (bezmäso, strop času varenia) + „nevariť rovnaké mäso v dvoch blokoch po sebe". Fixy: tolerancia 10 % pri „nad cieľom" (plán na cieli už nesvieti červeno), zakázané suroviny sa kontrolujú aj v názve receptu.
- **v17** — health indikátor na receptoch (proteín/100 kcal): farebná bodka na karte pri proteínovo bohatých, skóre + krúžok podielu na dennom cieli v detaile; auto-kolekcie v Recepty (do 20 min, vysoký proteín, sezónne teraz, lacné do 1,5 €/porcia, obľúbené); nákup — pri kliknutí na surovinu vidno aj jej množstvo v každom recepte.
- **v18** — účty a skupinová (domácnostná) synchronizácia cez Supabase, onboarding sprievodca pri prvom spustení, generátor-wizard (dni „preč", počet ľudí na týždeň, pravidlá pre rozsah dní), per-deň počty osôb a sloty viazané na dátumy, kolekcie receptov, navigácia týždňov v pláne a nákupe, ručné položky v nákupe, PWA + service worker.
- **v19 (audit 18. 8. 2026)** — „pravda o číslach". Kompletné opravy nálezov A1–A7, B1–B9, C1–C7, D1–D11 z `AUDIT_KUCHARKA_2026-08-18.md`:
  - **Výpočty:** párovanie surovín po slovách a s kmeňom (koniec „Kokosového mlieka → strúhaný kokos"), `g_za_ks`/`g_za_platok` namiesto paušálnych 60 g za kus, `KS_DEF` má prednosť pred `g_za_ks`, `gramyNaJed` je presná inverzia `gramy`, doplnené ceny 27 potravín a vláknina/sodík všetkým, `kcal_na_porciu` sa verí vždy (rozdiel > 10 % sa označí „≈ odhad").
  - **Generátor:** kcal-okná na slot namiesto naťahovania porcií (faktor zovretý na 0,85–1,15), bielkoviny ako multiplikátor váhy + oprava dňa, minimum 300 kcal pre hlavné jedlo, príloha aj k polievke a šalátu, `maCarb` pozná cestoviny a pizzu, „kupované snacky" ako váha namiesto filtra, pamäť medzi týždňami.
  - **Nákup a špajza:** správne jednotky (22 strúčikov už nie je „22 ks"), cena podľa spotreby aj celých balení z jednej funkcie `cenaTyzdna`, čiastočná zásoba sa odpočíta a zvyšok zostane v zozname, „Mám doma" ignoruje krátke tokeny, jednotka „balenie" sa dá odpísať.
  - **Použiteľnosť:** debounce a memoizácia (hľadanie 8,2 s → 0,6 s), dni „preč" naozaj šetria, strop dorovnávania porcií, Escape zatvára režim varenia, plán sa zmestí na obrazovku, všetky polia majú menovku, mŕtvy kód preč (vrátane nepoužívaného vodného trackera z v10).
  - **Testy:** `test_harness.js` (app.js s reálnymi dátami v `node:vm`) a sady `test_vypocty.js`, `test_generator.js`, `test_nakup.js`, `test_ux.js`; `scripts/metriky.js` meria pred/po.
