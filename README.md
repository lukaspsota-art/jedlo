# 🍲 Moja kuchárka

Osobná offline webová kuchárka a meal-prep plánovač pre domácnosť. Recepty s kalóriami/makrami a cenami, blokový plánovač (meal-prep A/B/C), automatický jedálniček, nákupný zoznam po oddeleniach, špajza s expiráciami, kalendár varenia a viac.

## Otvorenie
Otvor **`kucharka.html`** v prehliadači (funguje offline, aj na mobile cez „Pridať na plochu").

## Vývoj
`kucharka.html` sa **generuje** — needituj ho ručne. Uprav zdroje a spusti build:

```bash
python3 generuj_kucharku.py
```

Zdroje: `data/sablona.html` (HTML+CSS), `data/app.js` (JS), `data/potraviny.json`, `recepty/*.json`, `jedalnicky/*.json`.
Podrobnosti pre vývoj (architektúra, dátové modely, pravidlá) sú v **`CLAUDE.md`**.

## Dokumentácia
- `CLAUDE.md` — architektúra a pravidlá pre vývoj
- `NAVOD.md` — funkcie appky (používateľsky)
- `HOSTING.md` — nasadenie online + synchronizácia (Netlify + Supabase)
- `INSPIRACIA.md` — prieskum 25 podobných appiek + backlog nápadov
- `CHANGELOG.md` — história verzií
- `PROJEKT_BIBLIA.md` — pravidlá projektu (kuchárka = zdroj pravdy)

## Overenie
```bash
node --check data/app.js
python3 -m http.server 8000   # potom http://localhost:8000/kucharka.html
```
