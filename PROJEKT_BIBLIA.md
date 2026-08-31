# Projekt Jedlo — ako to celé beží

Tento súbor hovorí, **kde čo žije a ako sa s projektom pracuje**. Nie je to vývojárska
dokumentácia (tá je v `CLAUDE.md`) ani zoznam funkcií (ten je v `NAVOD.md`).
Ak hľadáš „načo to je a ako to používať", začni v `PRECO_A_AKO.md`.

*(Aktualizované 31. 8. 2026 — predchádzajúca verzia bola z júla a popisovala appku,
ktorá už neexistuje.)*

## Jedno pravidlo nad ostatnými
**Zdrojom pravdy sú súbory v repozitári, nie `kucharka.html`.**
`kucharka.html` je **vygenerovaný artefakt** — postaví ho `generuj_kucharku.py` a je
v `.gitignore`. Keď sa niečo v appke má zmeniť, mení sa zdroj a build sa spustí znova.
Ručná úprava `kucharka.html` sa pri najbližšom builde stratí.

## Kde čo žije
| kde | čo |
|---|---|
| `recepty/*.json` | recepty — jeden súbor = jeden recept. **Nič sa nepridáva „mimo"**: každý nový recept (z fotky, textu, odkazu alebo použitý v jedálničku) sa uloží sem. |
| `recepty/fotky/` | fotky (`<id>.webp`) + `ZDROJE.json` s licenciou a atribúciou ku každej |
| `data/potraviny.json` | kalórie, makrá, vláknina, sodík, alergény, ceny a oddelenie v obchode. **Nová surovina = nový záznam tu**, inak sa objaví v nákupe bez ceny. |
| `jedalnicky/*.json` | uložené týždenné jedálničky; v appke sa načítajú cez „📥 Načítať jedálniček" |
| `data/app.js`, `data/sablona.html`, `dizajn/tema-bloky.css` | samotná appka — kód, kostra a vzhľad |
| `reporty/` | reporty agentov: čo sa menilo, prečo, a čím je to zmerané |
| `export/` | strojové výpisy z buildu (nie zdroj — generujú sa) |

**Po každej zmene sa spúšťa `python3 generuj_kucharku.py`.** Build je zároveň brána: keď sú
dáta pokazené (chýbajúce `id`, duplicitné `id`, neznáma jednotka, nezmyselná gramáž,
jedálniček odkazujúci na neexistujúci recept), **padne a starý `kucharka.html` nechá tak**.

## Recept sa neberie odkiaľkoľvek
Každý recept musí mať **dohľadateľný zdroj** a pri zdrojoch, ktoré to vyžadujú, aj **aktívny
odkaz** (`zdroj_url`) — Varecha.sk to má v Content Policy, Wikibooks Cookbook v licencii CC BY-SA.
**Allrecipes, Serious Eats, Simply Recipes a Bon Appétit sa použiť nedajú** — majú výslovný
zákaz v `robots.txt` aj v podmienkach. Zoznam povolených zdrojov a pravidlá párovania sú
v `CLAUDE.md`, sekcia „Zdroje receptov".

## Týždenný jedálniček (piatok podľa letáku Kauflandu)
Leták Kauflandu sa mení vo štvrtok. V piatok:
1. Nahráš leták (PDF/fotky) alebo vypíšeš hlavné zľavy a napíšeš „poďme na jedálniček".
2. Z letáku sa prečítajú zľavnené suroviny a zostaví sa jedálniček na budúci týždeň, ktorý ich
   uprednostní (cieľ ~1450 kcal/deň, pestrosť, poradie jedál, rozvrh varenia podľa tvojich blokov).
3. Ak treba nový recept, **pridá sa do `recepty/`** a chýbajúce suroviny do `potraviny.json`.
4. Jedálniček sa uloží do `jedalnicky/`, kuchárka sa znova vygeneruje.
5. V Plánovači ho načítaš jedným klikom; nákupný zoznam vznikne sám, po oddeleniach.

Pozn.: leták je obrázky, takže zľavy sa nedajú prečítať plne automaticky — treba ho nahrať.
Appka sama akcie nepozná; v Nastaveniach je zoznam „čo je tento týždeň v akcii", ktorý si
zadávaš ručne a generátor ho zohľadní.

## Pridávanie z mobilu
Fotku receptu pridáš do projektu **Jedlo** v Claude appke a keď si pri počítači, napíšeš
„pozri nové recepty z mobilu". Podrobne v `MOBIL_NAVOD.md`.
Nie je to zatiaľ automatické — naplánovanú úlohu vieme zapnúť, ale musí sa zapnúť vedome.

Pozor na rozdiel: **„+ Nový recept" priamo v appke** ukladá recept len do pamäte prehliadača
(`localStorage`), nie do `recepty/`. Taký recept sa nedostane do zálohy projektu ani na druhé
zariadenie. Ak má prežiť, musí prejsť do `recepty/`.

## Pre vývojára
Architektúra, dátové modely, doménové pravidlá generátora, čo sa nesmie rozbiť a ako sa to
overuje — všetko je v **`CLAUDE.md`**. Tento súbor to zámerne neduplikuje: dve miesta s tými
istými pravidlami sa vždy rozídu a potom sa nedá zistiť, ktoré platí.
