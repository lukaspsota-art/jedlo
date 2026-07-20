# Dizajn — Dávka 2: Vylepšenia generátora a plánu

Dátum: 2026-07-21
Projekt: Jedlo (offline SK kuchárka + meal-prep plánovač)
Súbory: `data/app.js`, `data/sablona.html` (build → `kucharka.html` cez `generuj_kucharku.py`)

## Kontext a cieľ

Generátor jedálnička (`generujJedalnicek`, `data/app.js`) je jadrom appky a je funkčne solídny
(overené 40+ behmi: žiadne prázdne sloty, žiadne opakovanie naprieč blokmi, obed≥večera, kcal na cieli).
Chýbajú mu však ovládacie prvky, ktoré si používateľ vyžiadal:

1. **Iný počet porcií pre konkrétne dni/jedlá** (nielen „hostia" — všeobecný override; deň = default, jedlo = detail).
2. **Vynechať jedlá per deň/blok** — vybrať, ktoré jedlá tam majú byť; prázdny deň = celý von.
3. **Nové filtre:** bezmäsový rozsah, strop času varenia, „nie 2× rovnaké mäso za sebou", kuchyňa (rozšíriť existujúce).

UI prístup: **Hybrid** — plán rieši *čo / pre koľkých* (mriežka), gen-config okno rieši *ako generovať* (pravidlá).

Mimo tejto dávky: nákup/recepty vylepšenia (Dávka 3, samostatný cyklus).

## Dátový model

Nové mapy v `S` (persistované v `localStorage kucharka_v2`, synchronizované cez existujúci `syncPush`):

| Kľúč | Tvar | Význam | Chýba = |
|------|------|--------|---------|
| `S.dayPpl` | `{ [di:0..6]: number }` | počet porcií/osôb pre celý deň (override globálnych stravníkov) | doterajší `pocetPorcii(di)` |
| `S.slotPpl` | `{ [di]: { [slot]: number } }` | override porcií pre konkrétne jedlo (prednosť pred `dayPpl`) | `pocetPorciiDna(di)` |
| `S.daySloty` | `{ [di]: string[] }` | aktívne sloty daného dňa (override `S.profil.sloty`); `[]` = deň celý von | globálne `SLOTY()` |

Inicializácia v bloku `S.x = S.x || {}` pri štarte (vedľa existujúcich `S.plan`, `S.planF`…).
**Spätná kompatibilita:** všetky prázdne = pôvodné správanie. Žiadna migrácia dát.

## Nové helper funkcie

```
slotyDna(di)        -> pole aktívnych slotov dňa: S.daySloty[di] (ak existuje) inak SLOTY(),
                       zoradené podľa VSETKY_SLOTY.
pocetPorciiDna(di)  -> S.dayPpl[di] ak je nastavené (číslo > 0), inak pocetPorcii(di).
porcieSlot(di,slot) -> (S.slotPpl[di] && S.slotPpl[di][slot]) ?? pocetPorciiDna(di).
masoTyp(r)          -> "hydina"|"bravcove"|"hovadzie"|"ryby"|"" z keyword-scanu ingrediencií
                       (malý map, ponytail heuristika; prvý match vyhráva).
```

## Napojenie do existujúceho kódu (call-sites)

**Porcie — jediný choke-point:**
- `mnozMult(di,slot)` sa zmení na `porcieSlot(di,slot) * pf(di,slot)`.
  Tým porcie automaticky potečú do nákupu (`nakupPolozky` používa `mnozMult`) aj plánu varenia
  (`porcieNaVar` → `mnozMult`). `pf` (veľkosť porcie %) ostáva ako jemný doladzovač.

**Maska jedál — nahradiť `SLOTY()` za `slotyDna(di)` tam, kde sa iteruje per deň:**
- `generujJedalnicek` — blok používa `slotyDna(dni[0])`; sloty mimo masky preskočí (nechá prázdne).
- `baseDayKcal(di)`, `planItems()`, `renderDnesPlan()`, `renderVyziva()`, `ukazDenVyzivu(di)`,
  `planVarenia(di)` — iterácia per deň cez `slotyDna(di)`.
- `renderPlan()` — **riadky ostanú = globálne `SLOTY()`** (pravouhlá tabuľka). Ak `slot ∉ slotyDna(di)`,
  bunka sa vykreslí ako sivé needitovateľné **„vyp."**, neráta sa do dennej Σ. Deň s prázdnou maskou =
  celý stĺpec „mimo plánu".

**Blokový režim:** editácia `dayPpl` a `daySloty` sa zapisuje pre všetky dni `blokDni(di)` (ako `setSlotComp`).
Per-slot `slotPpl` sa tiež aplikuje na celý blok, keď je blokový režim zapnutý.

## Filtre (rozšírenie `genCfg`)

Zovšeobecniť položku `genCfg.filtre` z `{od,do,kuchyna}` na `{od, do, kuchyna?, veg?, maxCas?}`.
Jedno pravidlo = viac podmienok naraz (napr. „Po–Pi: talianska, bezmäso, do 30 min").

V `generujJedalnicek` po zložení poolu pre slot aplikovať (každé „mäkké" — ak vyprázdni, uvoľní):
- `veg` → `pool.filter(r => diety(r).veg)`
- `maxCas` → `pool.filter(r => casMin(r) <= maxCas)`
- `kuchyna` → existujúca logika (ostáva)

Globálny switch `genCfg.neMasoZaSebou` (boolean):
- generátor si drží `prevBlokMaso = Set` z `masoTyp` hlavných jedál predošlého bloku;
- v ďalšom bloku pri hlavných slotoch vyfiltruje `pool.filter(r => !prevBlokMaso.has(masoTyp(r)))` (strážené).

**Všetky filtre mäkké:** zúženie, čo by vyprázdnilo pool, sa preskočí (žiadny prázdny slot) — vzor, ktorý generátor už používa (`if(p2.length)pool=p2`).

## UI (Hybrid)

**1. Control-riadok v mriežke plánu** (rozšíri existujúci `renderBlokEditor` / hlavičku bloku):
- „⚙" toggle pri bloku/dni rozbalí kompaktný panel:
  - `👥 −  N  +` stepper = `dayPpl` (celý blok/deň).
  - Chip-y jedál `🍳 🍝 🍽️ 🥪` (z globálnych slotov) — klik toggluje `daySloty`. Vypnuté = sivé.
- Per-jedlo override porcií: malý „👥" prvok na bunke → prompt/stepper nastaví `S.slotPpl[di][slot]`. Nenápadné.

**2. Gen-config okno** (`otvorGenConfig`):
- Sekcia „Pravidlo pre rozsah dní" dostane popri výbere kuchyne aj **☐ len bezmäso** a **pole „do ___ min"**.
- Nový switch dole: **☐ Nevariť rovnaké mäso v dvoch blokoch po sebe** (`neMasoZaSebou`).
- Zoznam pravidiel zobrazí všetky podmienky pravidla (kuchyňa / veg / čas).

**CSS** (`data/sablona.html`): trieda pre sivú „vyp." bunku + štýl control-riadka a `👥` steppera.

## Testovanie

Rovnaký štýl ako B1/B2 — Playwright `browser_evaluate`, žiadny nový framework. Asserty:

- **Porcie:** `S.dayPpl[0]=4` (2 stravníci) → `mnozMult(0,slot)` ≈ 2× oproti default; nákupné množstvá dňa 2×.
  `S.slotPpl[0].Obed=6` → má prednosť pred `dayPpl`.
- **Maska:** `S.daySloty` bez „Raňajky" v bloku B → po `generujJedalnicek(true)` sú raňajky bloku B prázdne;
  opakované generovanie ich nedoplní. Prázdna maska dňa → `baseDayKcal=0`, deň mimo Σ/výživy.
- **Filtre:** veg pravidlo → 0 mäsových v rozsahu; `maxCas=30` → 0 receptov `casMin>30` v rozsahu;
  `neMasoZaSebou` → susedné bloky nemajú spoločný `masoTyp` (keď pool dovolí).
- **Regresia:** 30–40 behov — pôvodné invarianty (žiadny nechcený prázdny slot, kcal na cieli, obed≥večera, žiadne opakovanie naprieč blokmi) stále platia.

## Hranice rozsahu (YAGNI)

- Bez rozpočtu €/deň (nevybraté).
- Bez per-osoba diét (stravníci = len kcal).
- `masoTyp` je hrubá heuristika, nie úplná databáza.
- Maska nemení globálne `S.profil.sloty` (default ostáva); per-deň je len override.
- Bez migrácie dát (spätne kompatibilné).
- Nákup/recepty vylepšenia = Dávka 3.

## Odhad práce

- Veľký: `slotyDna` cez všetky per-deň call-sites (mechanické, ale široké).
- Menšie: porcie (`mnozMult` + helpery), filtre (`genCfg` + generátor), UI control-riadok + gen-config rozšírenie.
- Všetko v `data/app.js` + drobné CSS v `data/sablona.html`. Po každej zmene `py generuj_kucharku.py`.
