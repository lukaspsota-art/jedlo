# PWA, offline, export a build — agent PWA-EXPORT

Branch `agent10`, commit `87e47f6`. Všetko overené v Chromiu cez Playwright na lokálnom
`python3 -m http.server` (service worker sa bez `http(s)` nezaregistruje), viewport 393×850.

---

## 1. Offline a PWA

### Čo bolo zlé

**Prvá návšteva nechala cache prázdnu.** Pôvodný `sw.js` nemal precache; SW prevzal kontrolu
(`clients.claim()`) až po tom, čo dokument prišiel po sieti, takže sa nič neuložilo. Dôkaz
z prehliadača (pôvodný stav):

```
1. prvé načítanie (load): 1392 ms
2. service worker: {"scope":"…","active":true,"script":".../sw.js"}
4. cache po prvom načítaní: {}          ← prázdna
```

Kto si appku otvoril raz a stratil signál, mal prázdnu obrazovku. Offline fungovalo až od
druhého načítania.

**Dokument bol network-first.** Pri každom online spustení sa sťahovalo celých 4,7 MB, aj keď
bola v cache identická kópia. Nameraných **14,4 s** na simulovanom 4 Mbit/s (CDP
`Network.emulateNetworkConditions`, 40 ms RTT). To je presne situácia „stojím v obchode
a čakám na nákupný zoznam".

**Nová verzia sa nedala rozpoznať.** Cache `kucharka-v17` bola konštanta, ktorú nič nemenilo.
Online to fungovalo (network-first ťahal novú HTML), ale používateľ nemal ako vedieť, či
pozerá starú verziu, a offline zostával na starej bez akéhokoľvek signálu.

**GitHub Pages nemalo offline vôbec.** Generátor kopíroval do `docs/` len `index.html`,
`sw.js` tam nikdy nebol → registrácia SW končila 404 → žiadna cache.

### Čo je opravené (`sw.js` v19 + `data/app.js`)

| | pred | po |
|---|---|---|
| offline hneď po **prvej** návšteve | ✗ zlyhá | ✓ 576 ms |
| ďalšie online spustenie (4 Mbit/s) | 14,4 s (celých 4,7 MB) | **1,0 s** (z cache) |
| offline spustenie | 1,3 s | 1,3 s |
| nový build sa dostane k používateľovi | len online, ticho | ✓ na pozadí + hláška |
| `docs/` (GitHub Pages) | bez `sw.js` | ✓ generátor ho kopíruje |

Stratégia je teraz **stale-while-revalidate**: appka sa otvorí okamžite z cache a na pozadí
sa **podmieneným** requestom (`cache:"no-cache"`) overí, či server nemá novšiu verziu —
pri nezmenenom súbore príde 304 a nesťahuje sa nič.

> Poznámka k implementácii: prvý pokus bez `cache:"no-cache"` **nefungoval** — Chrome
> odpovedal SW-u z vlastnej HTTP cache a nový build sa nikdy nedoťahal. Odchytené testom,
> nie odhadom.

Precache už nie je natvrdo zapísaný názov súboru: appka po registrácii pošle SW-u
`{typ:"precache", url:location.href}`, takže to funguje pre `kucharka.html` (Netlify)
aj pre `index.html` (GitHub Pages).

Overenie celého aktualizačného cyklu (`update3.js`) — po prepísaní `kucharka.html` na disku:

```
2. návšteva po novom builde: 1159 ms · zobrazený title: Moja kuchárka (stará = správne, z cache)
   nový build už v cache: true  · správy zo SW: ["nova-verzia"]
   toast: "🔄 Stiahla sa nová verzia kuchárky — obnov stránku a načíta sa."
3. návšteva → title: KUCHARKA V2
```

`sync-config.js` a `sw.js` sú z cache natrvalo vylúčené — inak by sa zmena Supabase kľúčov
prejavila až po vyčistení dát prehliadača. Overené: `sync-config.js v cache: false`.

`VERZIA` v `sw.js` sa **nemusí** bumpovať pri každom builde (obsah rieši SWR) — len keď
treba vynútiť vyhodenie celej cache. Je to popísané v `HOSTING.md`.

### Inštalovateľnosť

Appka **je** inštalovateľná. Manifest sa vyrába za behu ako blob a Chrome ho parsuje bez
chýb (CDP `Page.getAppManifest` → `errors: []`). Mala však tri vady:

- `background_color` aj `theme_color` boli **`#1f5c3c` (zelená)** — hodnoty spred témy
  Organic. Splash screen aj farba v prepínači úloh sa rozišli s terakotovou appkou.
- **chýbal `start_url`** a **`id`** — bez `id` by zmena URL (napr. presun z Netlify na Pages)
  vyrobila druhú, samostatnú inštaláciu na ploche.
- ikona bola deklarovaná ako `purpose:"any maskable"` naraz.

Manifest sa teraz prepisuje v `app.js` z reálneho `<meta name="theme-color">`, takže sa
s témou už rozísť nemôže. Po oprave:

```
manifest errors: []
{"id":"…/kucharka.html","start_url":"…/kucharka.html","scope":"…/",
 "background_color":"#6d3813","theme_color":"#6d3813",
 "icons":[{"sizes":"512x512","purpose":"any"},{"sizes":"512x512","purpose":"maskable"}]}
```

Ikona (512×512 PNG, base64), `apple-touch-icon`, `apple-mobile-web-app-*` aj oba
`theme-color` (light/dark) v šablóne sú v poriadku.

### 4,7 MB na telefóne — je cachovanie kontraproduktívne?

Nie, naopak — **bez** cachovania to bolo kontraproduktívne. Čísla:

- nekomprimované 4 713 051 B, **gzip 1 205 228 B** (Netlify aj GitHub Pages komprimujú,
  lokálny `http.server` nie — reálne prvé stiahnutie bude ~4× rýchlejšie než nameraných 14,4 s)
- base64 fonty a ikony sú len 3 % veľkosti; zvyšok je 1956 receptov + 576 potravín
- prvé načítanie treba prežiť raz; každé ďalšie je 1 s z cache

Cache je teda jediné, čo appku na telefóne robí použiteľnou. Otvorené na neskôr: rozdeliť
dáta na lazy-loadovaný `recepty.json` mimo HTML — dnes je celá databáza v jednom súbore
a mriežka aj tak renderuje všetkých 1956 receptov naraz (P1 z `BASELINE.md`, nie moja oblasť).

---

## 2. Bezpečnosť synchronizácie

### Kontrola tajomstiev — výsledok: čisté

Nový `scripts/kontrola_tajomstiev.py` prehľadáva **celý repozitár vrátane `kucharka.html`
a `docs/`** (GitHub Pages je verejné) a rozlišuje, či je nález v súbore, ktorý sa commituje.

```
Prehľadaných súborov: 2010
✅ Žiadne tajomstvá v repozitári, v kucharka.html ani v docs/.
```

Hľadá: Supabase project URL, JWT (anon aj servisný), `sb_publishable_`/`sb_secret_`,
GitHub/OpenAI/Anthropic tokeny, AWS kľúče, a v `sync-config*.js` navyše vyplnené `id`/`key`
a slovo pre servisný kľúč. Naviac kontroluje, že `sync-config.js` **aj** `docs/sync-config.js`
sú v `.gitignore` (sú — `git check-ignore` to potvrdilo pre obe cesty).

Skript som otestoval podstrčeným reálne vyzerajúcim kľúčom: v `sync-config.js` ho nájde
a označí ako neškodný (ignorovaný), v `data/_unik.js` padne s návratovým kódom 1.

### Appka bez `sync-config.js`

Funguje. Šablóna ho ťahá cez `<script src="sync-config.js" onerror="void 0">`, 404 je
očakávaná a jediná chyba v konzole. Overené offline aj online:

```
offline stav appky: {"receptov":1956,"potravin":576,"jedalnickov":5,"syncConfig":false}
offline interakcia: {"kariet":1956,"ok":true}
chyby: žiadne (okrem 404 sync-config.js)
```

### Výpadok siete uprostred synchronizácie — našiel som tichú stratu dát

Pôvodný kód nastavil timestamp **pred** fetchom a hneď ho uložil:

```js
S._skupTs = Date.now(); uloz(S);
await authFetch(…);          // padne pri výpadku — a nikto to nevráti späť
```

Následky, keď fetch zlyhá (typicky: odškrtávanie nákupu v obchode so slabým signálom):

1. lokálne `_skupTs` je novšie ako serverové → `syncSkupinaPull()` má podmienku
   `j[0].ts > S._skupTs`, ktorá už nikdy neplatí → **zariadenie si nikdy nestiahne zmeny z PC**;
2. push sa neopakoval (na `online` visel len prekreslovač ikonky) → **zmena z telefónu sa
   nikdy nenahrá**;
3. návratový kód sa nekontroloval (`r.ok`), takže 401 alebo 409 sa tvárilo ako úspech.

Opravené vo všetkých troch push funkciách (`syncPush`, `syncOsobnePush`, `syncSkupinaPush`):
timestamp sa posúva až po overenom úspechu, inak sa stav označí ako nenahratý
(`_dirty`/`_osobDirty`/`_skupDirty`) a dotlačí sa pri udalosti `online` alebo pri návrate
na kartu. Kým sú nenahraté zmeny, pull sa preskočí — inak by prepísal to, čo používateľ
práve odškrtol.

### Konflikt (zmena na PC aj na telefóne)

Vyhráva ten, kto uložil **neskôr**, a to **celým blokom** — `SHARED_FIELDS` (plán, `planF`,
odškrtnutý nákup, ručné položky, špajza) sa prenášajú ako jeden JSON. Ak teda jeden odškrtne
mlieko a druhý v tej istej minúte chlieb, jedna z tých zmien sa stratí. Je to vedomý dizajn
(`HOSTING.md`: „posledná úprava vyhráva") a pre 2–4-člennú domácnosť postačuje; zlučovanie
po položkách je otvorené. Doplnil som to do `HOSTING.md` aj s tým, čo sa deje pri výpadku.

`sync-config.example.js` **neexistoval**, hoci `HOSTING.md` ho predpokladá — vytvorený,
s komentármi a bez akýchkoľvek skutočných hodnôt (kontrola tajomstiev cezeň prejde).

---

## 3. Export, import, tlač

### Tlač — dva vážne nálezy

**Tlač receptu dávala 229 strán A4.** `.overlay` je v DOM mimo `.view`, takže sa vytlačila
celá mriežka 1956 receptov a samotný recept skončil až na poslednej strane. Overené:
`pdfinfo` na výstupe `page.pdf()` s `emulateMedia({media:'print'})` → `Pages: 229`,
strana 1 = „155 Belmont, 3-Mile Long Island Iced Tea…", strana 229 = shakshuka.

**Tlač plánu na A4 na výšku vytlačila jeden deň.** A4 portrait má 794 CSS px, čo je pod
mobilným breakpointom 820 px, kde `table.plan.dN [data-d]:not(…)` skrýva ostatných šesť dní.
Výstup obsahoval len „Blok C · So–Ne".

Naviac na papieri ostávalo ovládanie: „✎ zmeniť", „⋯ viac", krížiky, „+ pridať", steppery
počtu ľudí, pole „Mám doma", 43 tlačidiel a 11 selectov.

Opravené vloženým print stylesheetom priamo z `app.js` (šablóna nie je moja oblasť) —
`tlacPriprav()` nastaví režim `plan`/`detail` a pridá `@page{size:A4 landscape}` len pre plán.

| | pred | po |
|---|---|---|
| tlač receptu | 229 strán, recept na poslednej | **3 strany**, len recept |
| tlač plánu | 1 deň zo 7 | **celý týždeň** na 1 strane |
| plán + nákup | 5 strán (1 deň) | 5 strán (7 dní, nákup v 3 stĺpcoch) |
| viditeľné ovládanie | 43 tlačidiel, 11 selectov | `.menu-wrap 0/3, .rm 0/48, ctrl-row 0/1, prazdne 0/4` |

Zvyšná kozmetika: v bunke plánu ostáva znak „✎" za počtom kcal — je to textový uzol
vnútri `.kc`, CSS ho neskryje, a `renderPlan` patrí inému agentovi.

### Export

- **Nákupný zoznam do schránky** (Listonic) funguje: 100 riadkov, formát
  `Banán 2 ks (≈ 240 g)` / `Mlieko 640 ml (bal.: 1× 1 l)`. Prípony `(bal.: …)` sú pre
  parser nákupnej appky šum, ale zoznam je čitateľný. `zdielajNakup()` používa
  `navigator.share` (na Androide je) a padá späť na schránku.
- **Záloha do súboru** funguje: `kucharka-zaloha.json`, 27 kľúčov, obsahuje plán, obľúbené,
  špajzu aj vlastné recepty. **Obnova zo súboru overená round-tripom** — po vymazaní
  a načítaní späť: `{"fav":1,"planDni":7,"spajza":1}`.
- **Export plánu do kalendára (.ics) NEEXISTUJE.** Zámerne som ho nedopĺňal: tlačidlo by
  muselo pribudnúť do menu v `data/sablona.html`, čo nie je môj súbor. Je to čistý kandidát
  na ďalší krok (~20 riadkov + jedna položka menu).
- **`export/jedlo_data.json`** (4 MB) bola ručná kópia `recepty/` + `data/potraviny.json`.
  Obsahovo zhodná, ale pri prvej zmene receptu by sa ticho rozišla. Generátor ju teraz
  vyrába, takže platí vždy.

### Import receptu z fotky/textu/odkazu

**Appka to nevie a ani na to nemá kód.** Overené: `window.importRecept`, `window.importZUrl`,
`window.ocr` sú `undefined`. Jediná cesta je formulár „+ Nový recept" (`novyRecept()`) —
ručné vyplnenie názvu, kategórie, surovín a krokov, uložené do `S.mojeRecepty`
v `localStorage`, **nie** do `recepty/*.json`.

`NAVOD.md` to uvádza ako funkciu č. 12 v zozname „Funkcie (15)". Zátvorka „(spraví Claude)"
je poctivá a sekcia „Pridanie receptu" to vysvetľuje, ale v číslovanom zozname funkcií appky
to čitateľ prečíta ako tlačidlo, ktoré neexistuje. `NAVOD.md` nie je môj súbor, preto len
návrh znenia:

> 12. ~~Import z fotky/textu/odkazu (spraví Claude)~~
> 12. Vlastné recepty — ručný formulár v appke. Import z fotky, textu alebo odkazu
>     nie je v appke: recept pošli Claudovi, uloží ho do `recepty/` a znova vygeneruje kuchárku.

(Rovnaká vec platí pre bod 4 „Fotky receptov" — `foto` nemá nastavené ani jeden z 1956
receptov a `recepty/fotky/` je prázdny. Známe z `CLAUDE.md`.)

Ešte jedna drobnosť z tejto oblasti: vlastné recepty dostávajú `id` tvaru `moj-<S.spSid>`,
ale `spSid` je v `SHARED_FIELDS` — dvaja členovia skupiny si vedia vyrobiť dva rôzne recepty
s tým istým `id`.

---

## 4. Jedálničky — všetkých päť

`node scripts/kontrola_jedalnickov.js` (nový skript, beží nad **skutočným** `app.js`
cez `test_harness`).

**Recepty:** všetkých 5 jedálničkov odkazuje výhradne na existujúce `id`. Žiadny nález.
Build to odteraz aj vynucuje.

**Našiel som posun dní.** `app.js` má `DNI[0] = "Pondelok"`, ale tri jedálničky boli uložené
inak, takže sa v Plánovači načítali na nesprávne dni týždňa:

| súbor | bolo | podľa zdroja | oprava |
|---|---|---|---|
| `2026-07-05` | deň 0 = nedeľa (len večera) | `jedalnicek-kw27.jsx`: blok A „Ne večera → Ut", `days: "Ne + Po"` | rotácia 0→6, 1→0 … |
| `2026-03-22` | deň 0 = nedeľa (len večera) | rovnaký vzor (varný večer v nedeľu) | rotácia 0→6, 1→0 … |
| `2026-06-11` | bloky B a C stlačené na dni 0–3 | `jedalnicek-kw24.jsx`: blok B „utorok večer → piatok" (St–Pi), blok C „piatok večer → nedeľa" (So–Ne) | 0→2, 1→3, 2→5, 3→6 |

Sú to čisté presuny — nič som nepridal ani nezmazal. `od` som zarovnal na pondelok týždňa.
Overené v prehliadači, offline, načítaním do Plánovača:

```
načítanie jedálnička 2026-07-05 offline:
{"Pondelok":"Raňajky+Obed+Večera","Utorok":"Raňajky+Obed+Večera",
 "Streda":"Raňajky+Obed+Večera","Štvrtok":"Raňajky+Obed","Nedeľa":"Večera"}
```

**Kalórie a naplnenosť** (po oprave):

| jedálniček | cieľ | naplnených dní | priemer | poznámka |
|---|---|---|---|---|
| 2026-03-22 | 1450 | 7/7 | 1158 (80 %) | nedeľa je varný večer (430 kcal); bez snackov |
| 2026-05-11 | 1450 | 7/7 | **1463 (101 %)** | v poriadku |
| 2026-06-11 | 1400 | 4/7 | 1013 (72 %) | prázdne Po, Ut, Pi; So/Ne bez večere |
| 2026-07-05 | 1420 | 5/7 | 1033 (73 %) | prázdne Pi, So; nedeľa varný večer |
| 2026-07-20 | 1450 | 7/7 | **1416 (98 %)** | najkompletnejší |

Prázdne dni a chýbajúce sloty **som nedopĺňal**. Nie je to chyba dát: zdrojové `.jsx`
pokrývajú len časť týždňa (KW27 = Ne–Št, KW24 = blok B + C) a ich snacky sú kupované
produkty („Skyr 130 g", „Miša tvarohový krém") — recept pre ne neexistuje a vymyslieť ich
by znamenalo dopísať používateľovi do plánu jedlo, ktoré si nevybral. Snack chýba
v **32 zo 35 dní** naprieč všetkými piatimi; denný faktor 0,85–1,15 to dorovná, ale je
to dôvod, prečo sedia na 80–101 % cieľa a nie presnejšie.

`nazov` niektorých súborov nesedí s dátumom (`2026-06-11` sa volá „KW24 (11.–17.6.2026)",
KW24 2026 je pritom 8.–14. 6.). Sú to používateľove popisky, nechal som ich tak.

---

## 5. Build

`skontroluj_recepty` naozaj existovala a neznámu jednotku chytala. Nechytala však toto:

**Pokazený JSON receptu build ticho preskočil.** Hláška sa vypísala medzi tri riadky
úspechu a build skončil s kódom 0 — recept z kuchárky nenápadne zmizol:

```
Chyba pri čítaní …/recepty/_pokus.json : Expecting property name…
Hotovo: …/kucharka.html
Receptov: 1956 · …                       ← build „prešiel"
```

**Chýbajúca šablóna alebo `app.js` dala Python traceback** (`FileNotFoundError`).
**Recept bez `id` prešiel**, hoci ho nemožno dať do plánu. Duplicitné `id`, pokazená
potravina ani jedálniček s neexistujúcim receptom sa nekontrolovali vôbec.

Po oprave — každý prípad padne s návratovým kódom 1 a povie **ktorý súbor a čo je zle**:

```
A) pokazený JSON     recepty/_p.json: pokazený JSON — riadok 1, stĺpec 16: Expecting property name…
B) neznáma jednotka  recepty/_p2.json (id pokus4): „Vajcia" má neznámu jednotku „hrniec"
                     (app.js ju neprepočíta na gramy → 0 kcal a 0 € v nákupe)
C) recept bez id     recepty/_p3.json: chýba pole „id" (bez neho sa recept nedá dať do plánu)
D) duplicitné id     recepty/shakshuka.json: id „shakshuka" už používa recepty/_p4.json
E) pokazená potravina „žervé" nemá „oddelenie" (vypadne z radenia nákupného zoznamu)
                     „acidofilné mlieko" nemá číselné pole „kcal" (recepty s ňou budú mať 0 kcal)
F) zlý jedálniček    jedalnicky/2026-05-11.json: deň 0, Obed → recept „neexistuje-xyz" neexistuje
G) chýbajúca šablóna CHÝBA SÚBOR: data/sablona.html (HTML šablóna).
```

Každá hláška končí `Build zastavený, kucharka.html sa NEPREPÍSALA.` — starý build teda
ostane funkčný. Pribudla aj kontrola literálu `</script>` v dátach a v `app.js`
a kontrola, že šablóna má všetky placeholdery.

**„Chýbajúca potravina" v zmysle nenapárovanej suroviny sa tvrdo kontrolovať nedá** —
`node scripts/kontrola_parovania.js` hlási 461 nenapárovaných surovín z 2724 párov,
build by nikdy neprešiel. Kontrolujem preto integritu `potraviny.json` (kľúč, oddelenie,
číselná výživa, `cena100` číslo alebo `null`); párovanie ostáva na samostatnom skripte.

Generátor navyše kopíruje `sw.js` do `docs/` (bez neho GitHub Pages nemalo offline)
a `sync-config.js`, ak existuje (obe cesty sú v `.gitignore`).

---

## Overenie

```
python3 generuj_kucharku.py            ✓  1956 receptov · 576 potravín · 5 jedálničkov
node --check data/app.js               ✓   (a sw.js aj sync-config.example.js)
grep -c "</script>" data/app.js        ✓  0
python3 scripts/kontrola_tajomstiev.py ✓  žiadne tajomstvá (2010 súborov)
node scripts/kontrola_jedalnickov.js   ✓  všetky id existujú, dni platné

test_vypocty   OK      test_nakup    OK      test_prepocty OK      test_porcie OK
test_generator FAIL — A2, medián bielkovín 94,4 g (padá aj v baseline, viď BASELINE.md)
test_ux        nestabilný — D1/B7 sú časové limity, nie logika
```

`test_ux` D1 meria 4 prekreslenia mriežky 1956 receptov proti limitu 1500 ms. Zmeral som
najlepší z troch behov na baseline aj na tejto vetve, striedavo:

```
BASELINE 1454 ms · PO ZMENÁCH 1074 ms · BASELINE 1273 ms · PO ZMENÁCH 1389 ms
```

Baseline je na limite rovnako ako táto vetva — nie je to regresia, je to test, ktorý na
vyťaženom stroji padá v oboch. Moje zmeny sa `renderGrid` nedotýkajú.

---

## Čo ostáva otvorené

1. **`display:"fullscreen"` v manifeste** — nainštalovaná appka schová stavový riadok
   (hodiny, batéria). Pri varení s časovačom by som čakal `standalone`. Nechal som pôvodnú
   hodnotu, je to produktové rozhodnutie.
2. **Manifest sa opravuje z `app.js`.** Správne miesto je inline skript v `data/sablona.html`
   (riadok 15), ktorý má stále zelené farby. Šablóna nie je moja oblasť — keď ju bude niekto
   upravovať, oplatí sa opravu presunúť tam a z `app.js` ju vyhodiť.
3. **`.ics` export plánu do kalendára** — chýba tlačidlo v menu v šablóne.
4. **Zlučovanie synchronizácie po položkách.** Dnes „posledná úprava vyhráva" nad celým
   blokom; súbežné odškrtávanie nákupu na dvoch zariadeniach o jednu zmenu príde.
5. **`NAVOD.md` body 4 a 12** sľubujú fotky receptov a import z fotky/textu/odkazu —
   ani jedno v appke nie je. Návrh znenia je vyššie.
6. **`docs/index.html` a `docs/sw.js` nie sú v gite** (build artefakty). Pri hostovaní cez
   GitHub Pages ich treba po builde commitnúť — doplnil som to do `HOSTING.md`.
7. **4,7 MB v jednom súbore.** gzip to zráža na 1,2 MB a cache prvé stiahnutie amortizuje,
   ale rozdelenie dát na lazy-loadovaný JSON by prvý štart aj pamäť výrazne zlepšilo.
8. **`shakshuka.json` má `Zdroj: Serious Eats`** — všimol som si to pri tlači receptu.
   `CLAUDE.md` hovorí, že obsah People Inc. (Allrecipes / Serious Eats / Simply Recipes)
   sa použiť nedá. Patrí to inému agentovi, ale stojí za kontrolu naprieč `recepty/`.

## Zmenené súbory

```
sw.js                            prepísaný — SWR, precache, oznámenie o novej verzii
data/app.js                      +124/-13 — PWA registrácia, manifest, tlač, sync
generuj_kucharku.py              tvrdé kontroly so slovenskými hláškami, docs/, export/
HOSTING.md                       aktualizácia, sekcia o konfliktoch a aktualizáciách
sync-config.example.js           NOVÝ
scripts/kontrola_tajomstiev.py   NOVÝ
scripts/kontrola_jedalnickov.js  NOVÝ
jedalnicky/2026-03-22.json       posun dní
jedalnicky/2026-06-11.json       posun dní
jedalnicky/2026-07-05.json       posun dní
export/jedlo_data.json           odteraz generovaný
```
