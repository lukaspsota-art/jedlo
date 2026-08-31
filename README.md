# 🍲 Moja kuchárka

Osobná offline webová kuchárka a meal-prep plánovač pre domácnosť. Recepty s kalóriami, makrami
a cenami, blokový plánovač (meal-prep A/B/C s nastaviteľným rozvrhom varenia), automatický
jedálniček na kalorický cieľ, nákupný zoznam po oddeleniach, špajza s expiráciami, kalendár
varenia, režim varenia s časovačmi — všetko v **jednom súbore, ktorý funguje bez internetu**.

## Otvorenie
Otvor **`kucharka.html`** v prehliadači (funguje offline, aj na mobile cez „Pridať na plochu").

## Vývoj
`kucharka.html` sa **generuje** — needituj ho ručne (je v `.gitignore`).
Uprav zdroje a spusti build:

```bash
python3 generuj_kucharku.py
```

Zdroje: `data/sablona.html` (HTML+CSS), `data/app.js` (JS), `data/potraviny.json`,
`recepty/*.json`, `recepty/fotky/`, `jedalnicky/*.json`, `dizajn/tema-bloky.css`.
Podrobnosti pre vývoj (architektúra, dátové modely, pravidlá, čo sa nesmie rozbiť) sú
v **`CLAUDE.md`**.

## Overenie
```bash
node --check data/app.js
node test_vypocty.js && node test_generator.js && node test_nakup.js && node test_ux.js \
  && node test_prepocty.js && node test_porcie.js && node test_jednotky.js \
  && node test_parovanie.js && node test_pravidla.js && node test_odolnost.js
node test_regresie.js              # zoznam opravených chýb — musí hlásiť 0 otvorených
node scripts/metriky.js 30         # výživa, cena, pravidlá generátora
node scripts/kvalita.js 24 8       # to isté cez viac seedov — na rozhodovanie použi TOTO
python3 scripts/kontrast_bloky.py  # WCAG AA v oboch témach
./e2e/spusti.sh                    # ~380 kontrol v skutočnom prehliadači (Playwright)
python3 -m http.server 8000        # potom http://localhost:8000/kucharka.html (PWA, sync)
```

## Dokumentácia
- `PRECO_A_AKO.md` — **začni tu**: načo to je a ako sa to používa (pre používateľa)
- `NAVOD.md` — zoznam funkcií a história verzií
- `CLAUDE.md` — architektúra a pravidlá pre vývoj
- `PROJEKT_BIBLIA.md` — ako projekt beží (kde čo žije, týždenný rituál s letákom)
- `MOBIL_NAVOD.md` — pridávanie receptov z telefónu cez Claude
- `HOSTING.md` — nasadenie online + synchronizácia (Netlify + Supabase)
- `INSPIRACIA.md` — prieskum 25 podobných appiek + backlog nápadov
- `CHANGELOG.md` — história verzií s číslami
- `reporty/` — reporty agentov: čo sa menilo, prečo, a čím je to zmerané
