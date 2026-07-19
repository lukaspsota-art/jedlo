# Projekt Jedlo — biblia

**Kuchárka (`kucharka.html`) je centrálny zdroj pravdy tohto projektu.** Všetko, čo sa
týka jedla — recepty, výživa, jedálničky, nákupy — vychádza z nej a vracia sa do nej.

## Pravidlá projektu
1. **Recepty žijú v `recepty/`** (jeden `.json` na recept). Nič sa nepridáva „mimo" —
   každý nový recept (z fotky, textu, odkazu, alebo použitý v jedálničku) sa uloží sem.
2. **Databáza potravín `data/potraviny.json`** je zdroj pre kalórie, makrá, alergény a
   zaradenie surovín do oddelení v nákupe. Nová surovina = nový záznam tu.
3. **Jedálničky žijú v `jedalnicky/`** (jeden `.json` na týždeň). Načítajú sa v appke
   cez tlačidlo „📥 Načítať jedálniček" v Plánovači.
4. **Po každej zmene sa spúšťa `generuj_kucharku.py`**, ktorý znova postaví `kucharka.html`.

## Týždenný jedálniček (piatok podľa letáku Kauflandu)
V **piatok o 12:00** príde pripomienka a odkaz na aktuálny leták Kauflandu (mení sa vo štvrtok).
Ty nahráš leták (PDF/fotky) alebo vypíšeš hlavné zľavy a napíšeš „poďme na jedálniček". Potom:
- z letáku sa prečítajú zľavnené suroviny a zostaví sa jedálniček na budúci týždeň, ktorý ich uprednostní (cieľ ~1450 kcal/deň, pestrosť),
- ak treba nový recept, **automaticky sa pridá do `recepty/`** (+ chýbajúce suroviny do `potraviny.json`),
- jedálniček sa uloží do `jedalnicky/`, kuchárka sa znova vygeneruje,
- vznikne nákupný zoznam po oddeleniach so zvýraznením zliav; v Plánovači jedálniček načítaš jedným klikom.

Pozn.: leták Kauflandu sú obrázky, takže konkrétne zľavy sa nedajú prečítať plne automaticky — treba ho nahrať.

## Pridávanie z mobilu
Fotku receptu pridáš do projektu Jedlo v Claude appke; v pondelok a piatok ráno sa
automaticky spracuje do kuchárky (viď `MOBIL_NAVOD.md`).

## Súbory
- `kucharka.html` — appka (otvor dvojklikom)
- `recepty/` — recepty · `recepty/fotky/` — fotky
- `jedalnicky/` — týždenné jedálničky
- `data/potraviny.json` — databáza potravín · `data/sablona.html` — vzhľad
- `generuj_kucharku.py` — generátor
- `NAVOD.md`, `MOBIL_NAVOD.md`, `PROJEKT_BIBLIA.md` — návody
