# Prístupnosť a výkon — dve otvorené P1

Agent **PRÍSTUPNOSŤ-VÝKON**, 30. 8. 2026 · branch `agent2` · commit `0f410c7`
Menené súbory: `data/app.js`, `data/sablona.html`, `test_ux.js` (nič iné).

---

## Namerané čísla

Chromium (Playwright), viewport **393×850** (Nothing Phone 3a Pro) a **1440×900**,
zakaždým na obrazovke **s dátami** (mriežka s 1956 receptmi, plán s vygenerovaným týždňom).

### Mriežka receptov

| metrika | PRED | PO | cieľ |
|---|---|---|---|
| DOM uzlov v `#grid` | 27 980 | **912** | — |
| DOM uzlov v celom dokumente | 29 063 | **1 996** | < 2 000 ✔ |
| kariet vykreslených naraz | 1 956 | **60** (+ dávky po 60) | — |
| render mriežky, mobil (medián z 9) | 467,5 ms | **83,8 ms** | < 150 ms ✔ |
| render mriežky, desktop (medián z 9) | 360,7 ms | **48,4 ms** | < 150 ms ✔ |
| rozptyl mobil (min–max) | 261–755 ms | **22–139 ms** | — |
| výška scrollu, mobil | 305 025 px | **9 641 px** | — |

### Štart appky (CPU spomalené 4×, profil telefónu)

| | PRED | PO |
|---|---|---|
| `load` | 2 304 ms | 2 049 ms |
| **mriežka pripravená** | **4 624 ms** | **2 248 ms** (−51 %) |
| DOM uzlov po štarte | 29 063 | 1 996 |

Audit z 20. 8. písal, že „postupné dopĺňanie mriežky je najväčšia jediná páka na štart“ —
potvrdilo sa: čas do pripravenej mriežky klesol na polovicu.

### Prístupnosť a dotykové ciele

| metrika | PRED | PO |
|---|---|---|
| fokusovateľných prvkov v mriežke | 1 956 (len ★, karta nie) | 60 kariet + 60 ★ (2 na kartu) |
| prvkov s `onclick` v pláne bez prístupu klávesnicou | **140** | **0** |
| fokusovateľných prvkov v tabuľke plánu | 14 | 192–194 |
| dotykových cieľov pod 24 px, mobil | 0 | **0** |
| dotykových cieľov pod 24 px, **desktop** | **138** | **0** |
| vodorovný pretok (7 obrazoviek × svetlý/tmavý × 2 viewporty) | Nastavenia pretekali | **0** |
| chýb v konzole | 0 | 0 |

*(Jediné hlásenie `ERR_FILE_NOT_FOUND` je voliteľný `sync-config.js` — je v `.gitignore`, tak to má byť.)*

---

## 1. Prístupnosť klávesnicou (P1)

### Karty receptov
Karta mala **dva** `div onclick` (`.thumb` a `.body`) a ani jeden `tabindex`. Teraz je to
**jeden obal** `.card-open` s `role="button" tabindex="0"` a `aria-label="<názov> — otvoriť recept"`.
`★` zostáva samostatné tlačidlo (skutočný `<button>` vnútri `role="button"` by bolo vnorené
tlačidlo, preto je **súrodenec**, nie potomok) a dostal `aria-pressed` + menovku
„Pridať/Odobrať z obľúbených: <názov>“. Na kartu tak vedú **2 tab-stopy** namiesto 1 (predtým iba ★).

### Bunky plánu
Všetok obsah bunky boli `span`/`a` s `onclick`. Teraz sú to skutočné `<button class="pc-btn …">`:
názov jedla, riadok „kcal / %“, `✎ zmeniť`, `⋯ viac`, `✕` aj prázdna bunka `+ pridať`.
Trieda `pc-btn` zoberie tlačidlu vzhľad (`background:none;border:0;font:inherit`), štýl naďalej
nesú `.nm`/`.kc`/`.rm` — vizuálne sa bunka nezmenila. Každé ovládanie má `aria-label`
s kontextom („Zmeniť jedlo — Nedeľa, Raňajky“), lebo sú to samé ikonky a skratky.

### Ďalšie opravené ovládanie
- `mchip` (zapnutie jedla v dni) a hranice blokov `✂/·` → `<button>` s `aria-pressed` / menovkou
- `± stravníci` v riadku plánu → `aria-label` („Viac stravníkov — Pondelok“)
- `🍳 plán varenia`, `celý plán varenia →`, `+ Nový recept`, `✕` pri stravníkoch → `<button class="lnk">`
  (`<a>` bez `href` nie je fokusovateľný)
- **Enter/medzerník**: pravidlo bolo vymenovaný zoznam selektorov, v ktorom `.plan-cell[tabindex]`
  chýbal — riadky všetkých pickerov boli fokusovateľné, ale **Enter s nimi nerobil nič**.
  Teraz je to jedno pravidlo pre všetko s `[role="button"][tabindex="0"]`.
- `zpristupniKliky()` už nepečiatkuje rolu na skutočné `<button>` (duplikovalo by ju) a doplní
  `aria-label` z textu. Naďalej sa jej dáva **koreň prekresleného kontejnera**, nie `document`.

### Fokus a Escape
- Po otvorení modálu ide fokus na `✕` v dialógu (`_fokusDoModalu`) — inak Tab pokračoval
  v mriežke **pod** prekrytím.
- Po zavretí (Escape, `✕`, klik mimo) sa fokus vracia na prvok, z ktorého sa otváralo
  (`_vratFokus` v `zavri`, `zavriPick`, `zavriCook`, `dlgZavri`). Prvok si pamätáme len pri
  **klávesovom** otvorení; pri vnorenom dialógu nad pickerom sa fokus nevracia predčasne
  (stráž `MODALY_SEL`).

### Focus ring
`:focus-visible` bol v projekte už predtým. Karta má `overflow:hidden`, takže vonkajší prstenec
by sa orezal — `.card-open:focus-visible` používa `outline:3px solid var(--accent);outline-offset:-3px`.
`--accent` (`#9a4f1c`) má na kréme 4,84–7,46:1, v tmavom režime je zosvetlená verzia —
`scripts/kontrast_organic.py` prechádza (**žiadne farby som nemenil**). Overené aj vizuálne:
`obrazky/mriezka-fokus-svetly.png`, `mriezka-fokus-tmavy.png`, `plan-fokus-{svetly,tmavy}.png`.

### Dotykové ciele
CLAUDE.md pripúšťa hustú mriežku plánu ako výnimku z 44 px, ale **nikdy nie pod 24 px**.
Na mobile to platilo od v20, na počítači boli tie isté prvky 16–20 px (P2 z auditu 19. 8.) —
pravidlá `.plan-cell .rm/.nm/.kc/.pc-x{min-height:24px}` sú teraz v základnom CSS,
nie len v `@media(max-width:820px)`. **Desktop: 138 → 0 prvkov pod 24 px.**

### Bonus: pretok v Nastaveniach
Riadok stravníka (`meno | kcal | ✕`) pretekal na 393 px o 31 px — `flex:1` input má implicitné
`min-width:auto`. Doplnené `min-width:0` a kcal pole zúžené na 96 px. Bolo to **v baseline**,
nie regresia; opravil som to, lebo `✕` v tom riadku som aj tak menil na tlačidlo.

---

## 2. Výkon mriežky (P1)

**Zvolené riešenie: dávky + `IntersectionObserver`, bez knižnice.** Vyhralo nad
`content-visibility:auto` (šetrí kreslenie, ale nie DOM uzly ani pamäť) aj nad plnou
virtualizáciou (potrebuje pevné výšky riadkov, ktoré karta s dvoj-riadkovým názvom nemá).

- `renderGrid()` filtruje a radí **celý** zoznam ako doteraz, uloží ho do `_gridZoz`
  a vykreslí prvých **60** kariet.
- Pätička `#grid-viac` je zároveň cieľ observera (`rootMargin: 600px`) **aj** plnohodnotné
  tlačidlo „Načítať ďalších 60 · zostáva N“ — funguje teda aj bez `IntersectionObserver`
  a je dosiahnuteľná klávesnicou.
- IO ohlási pretínanie len pri **zmene**; keby pätička po dávke ostala v okne, druhýkrát sa
  neozve. Preto sa po každej dávke poloha pätičky kontroluje sama (`_gridDopln` + `rAF`),
  takže sa vysoký desktop naplní až po spodok okna.
- **Stráž:** Recepty sa kreslia aj keď je obrazovka skrytá (štart je na Domove) — vtedy má
  pätička nulový rámček a `top` je 0. Bez stráže `if(!r.width && !r.height) return;` sa slučkou
  naliala celá zásoba (presne to, čomu sa vyhýbame). `zobrazView("recepty")` po zobrazení
  dopočíta, koľko sa naozaj zmestí.

**Čo sa nezmenilo:** vyhľadávanie, všetky 4 selecty, chipy kategórií, kolekcie, `zrusFiltre()`,
`#pocet` („201 / 1956“) aj `#f-cnt` počítajú nad **celým** výsledkom, nie nad vykreslenou dávkou.
Otestované v prehliadači aj v `test_ux.js`.

---

## Overenie

```
node --check data/app.js                    ✔   (0 literálov </script>)
python3 scripts/kontrast_organic.py         ✔   všetky páry spĺňajú WCAG AA
node test_vypocty.js                        ✔
node test_nakup.js                          ✔
node test_prepocty.js                       ✔
node test_porcie.js                         ✔
node test_ux.js                             ✔   28 kontrol (bolo 18, +10 nových)
node test_generator.js                      ✘   A2, medián 94,4 g — PADÁ AJ V BASELINE
python3 generuj_kucharku.py                 ✔
```

`test_generator.js` padá na presne rovnakej hodnote ako v `BASELINE.md` (94,4 g < 95) —
nie je to moja zmena a **žiadne nové zlyhanie som nepridal**.

### Nové testy v `test_ux.js`
**A8 (klávesnica):** karta je jeden obal s rolou/tabindexom/menovkou a nemá dva `onclick`;
`★` má `aria-pressed` + menovku; v tele `renderPlan` nezostal `span onclick` a sú tam triedy
`pc-btn`/`pc-empty`/`pc-x` a ≥ 6 `aria-label`; `mchip`/`hranica` sú tlačidlá; existuje
všeobecné pravidlo pre Enter/medzerník; všetky štyri zatváracie funkcie volajú `_vratFokus()`;
`zpristupniKliky` preskakuje `<button>`.
**A9 (mriežka):** prvé vykreslenie dá presne 60 kariet; `gridViac()` pridá ďalších 60 a na
konci krátkeho zoznamu (70 receptov) doberie zvyšných 10 a potom už nič; `#pocet` a `#f-cnt`
hlásia celý výsledok, nie dávku.

### Prehliadačové kontroly (`funkcne.js`, 393 px aj 1440 px — obe 19/19)
Tab sa dostane na kartu · Enter aj medzerník otvoria recept · fokus skočí do dialógu ·
Escape zavrie · fokus sa vráti **na tú istú kartu** · scroll doplní karty (60 → 180) ·
tlačidlo „Načítať ďalšie“ pridá dávku · hľadanie mení `#pocet` · `#f-cnt` počíta filtre ·
`zrusFiltre()` vráti mriežku na prvú dávku · v pláne **0** prvkov bez klávesnice ·
`table.plan` si zachoval `<colgroup>` · `✎ zmeniť` je fokusovateľné a má menovku ·
Enter otvorí picker · Escape ho zavrie a fokus sa vráti do bunky · žiadny vodorovný pretok ·
žiadna chyba v konzole.

**Sweep** (7 obrazoviek × svetlý/tmavý × mobil/desktop = 28 kombinácií): 0 pretokov,
0 cieľov pod 24 px, 0 chýb v konzole.

### Screenshoty
`/home/claude/reporty/obrazky/` — `mriezka-fokus-{svetly,tmavy}.png` (focus ring na karte),
`plan-fokus-{svetly,tmavy}.png` (focus ring v bunke plánu, mobil),
`plan-desktop.png`, `mriezka-desktop.png`, `mriezka-po-scrollovani-{svetly,tmavy}.png`.

---

## Čo ostáva otvorené

1. **Tab k prvej karte trvá 21 (mobil) / 24 (desktop) stlačení** — cestou sú navigácia,
   hľadanie, tlačidlo filtrov, kolekcie a chipy kategórií. Pomohol by „skip link“
   („Preskočiť na recepty“) alebo `role="tablist"` s navigáciou šípkami pre chipy.
   Neurobil som to — je to nová funkcia, nie oprava P1.
2. **Hodnotenie hviezdičkami** (`.star-slot` v detaile receptu) zostáva myšou: pol hviezdy sa
   určuje z X-ovej pozície kliknutia. Klávesová alternatíva potrebuje iný vstup (šípky/číslo),
   čo je zmena správania, nie iba dosiahnuteľnosť.
3. **Veľkosť dávky 60 je natvrdo.** Na veľmi vysokom monitore sa doplní druhá dávka hneď pri
   zobrazení (funguje, ale je to jeden `rAF` navyše). Adaptívna dávka podľa výšky okna by bola
   presnejšia.
4. **Pamäť medzi filtrami:** po zmene filtra sa mriežka vždy vracia na prvú dávku. Je to zámer
   (výsledok je iný zoznam), ale používateľ, ktorý si doscrolloval 300 kariet a odklikol filter
   späť, začína odznova.
5. **P2/P3 z auditu, ktorých som sa nedotkol:** bočné pásiky v `.tipy` a `.dnes-varenie-hero`,
   prázdne dlaždice na Domove pri prázdnom pláne, svetlé náhľady kariet v tmavom režime
   (`.card .thumb` gradient má tmavý variant, `linear-gradient(#3d2f24,#2c221a)` — vyzerá to
   v poriadku, hlásenie 1,16:1 bol falošný poplach s emoji).
6. **`data/app.js` má stále ~2 040 riadkov** — rozdelenie na moduly je otvorené.
