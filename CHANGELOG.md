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
