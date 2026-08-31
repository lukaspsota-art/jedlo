# Nezávislý audit — projekt „Jedlo“ (agent AUDIT, 30. 8. 2026)

Auditovaná verzia: branch `agent9`, `data/app.js` 1996 riadkov / 192 KB, 1956 receptov, 576 potravín,
5 jedálničkov. **Nič v projekte som nemenil** — pribudli len analytické skripty v `scripts/audit/`
(commit `2254dc0`). Každý nález nižšie má skript alebo číslo, ktorým sa dá zopakovať.

---

## Zhrnutie na 10 riadkov

1. **Appka je v podstatne lepšom stave, než tvrdí BASELINE.** Z 39 skriptom overených bodov predošlých auditov, ktoré CHANGELOG v19 označil za vyriešené, je **37 naozaj vyriešených** (`predosle_audity.js`); otvorené sú len dva P3 (B10a, B10b).
2. Kritická vrstva výpočtov je zdravá: `gramy()` a `gramyNaJed()` sú **presne inverzné** (0 nezhôd z ~5 000 kombinácií), 0 NaN/Infinity naprieč 1956 receptami, všetkých 576 potravín má cenu, vlákninu aj sodík.
3. **Najvážnejší nález je v builde:** `generuj_kucharku.py` nekontroluje dáta na `</script>` a na vlastné placeholdery. Jeden recept z Varechy s takým textom vyrobí **syntakticky rozbitú, úplne mŕtvu `kucharka.html` — a build skončí s exit 0.** Reprodukované.
4. **Druhý vážny nález nikto nezadal:** Plán a Výživa hlásia kalórie z `kcal_na_porciu`, ale Nákup kupuje **suroviny**. Za 20 týždňov nakúpi domácnosť **o 9,5 % viac kalórií** (najhorší týždeň +50 %), než jej appka sľubuje.
5. Príčinou je zlá dáta-kvalita v ~40 receptoch: `hovädzí steak z 500 g krkovice` má `porcie: 1` a `kcal_na_porciu: 134`, appka mu **vydelí bielkoviny 10×** a zobrazí 134 kcal / 12,7 g B. Generátor podľa týchto čísel optimalizuje bielkoviny.
6. **Stored XSS je reálne:** meno stravníka a názov uloženého jedálnička idú do `innerHTML` bez escapu. Cesta z cudzieho zariadenia existuje — obe polia sa synchronizujú cez Supabase.
7. `HOSTING.md` navádza (ako „staršiu možnosť“) na RLS politiku `using (true)` nad tabuľkou s celým stavom → **ktokoľvek s verejným anon kľúčom vie stiahnuť aj prepísať celú tabuľku**.
8. Doménové pravidlá sú **vynútené len čiastočne**: štrukturálne (3 bloky, 1 variant/slot/blok, obed ≠ večera, bez carryover C→A) sedia na 100 %, ale „mäkké“ pravidlá (poradie kcal 89–93 %, raňajková báza 13 kolízií zo 150 blokov) sú len preferencie s fallbackom.
9. **Kvóta `localStorage` nie je riziko** (0,44 MB po roku so všetkými hodnoteniami) — ale poškodený JSON je **tichý úplný reset bez varovania** a dve záložky sa navzájom prepíšu.
10. **Licenčný rozpor priamo v CLAUDE.md:** dokument zakazuje Allrecipes/Serious Eats, a v `recepty/` je **5 receptov presne z týchto zdrojov**; 102 zo 113 Wikibooks receptov (CC BY-SA) nemá odkaz.

---

# P1 — kritické

## P1-1 · Build ticho vyrobí mŕtvu appku, keď dáta obsahujú `</script>` alebo placeholder

**Súbor:** `generuj_kucharku.py:47 skontroluj_recepty()`

`skontroluj_recepty()` kontroluje len jednotky. Šablóna vkladá recepty ako JSON **do inline `<script>`**,
a `json.dumps` neescapuje `/`. Navyše sa placeholdery nahrádzajú **v poradí** `__APP_JS__ → __DATA__ →
__POTRAVINY__ → __JEDALNICKY__ → __DATUM__ → __POCET__`, takže reťazec vložený receptom v kroku `__DATA__`
je ešte stále kandidát na nahradenie v ďalších krokoch.

**Dôkaz (reprodukované, `scripts/audit/build_odolnost.sh`):**

| podvrhnuté dáta | výsledok |
|---|---|
| `postup: ["… </script><script>window.__XSS=1</script> …"]` | build **exit 0**, v `kucharka.html` je 5× `</script>` namiesto 2, injektovaný `<script>` prenikol |
| `nazov: "__POTRAVINY__ test"` | build **exit 0**, do názvu receptu sa vložila celá databáza potravín → `node --check` na vygenerovanom `<script>` bloku hlási **SyntaxError** |

```
$ node --check /tmp/ab2/last.js
JS SYNTAX ERROR (celá appka mŕtva)
```

Riziko nie je teoretické: podľa `PROJEKT_BIBLIA.md` sa recepty pridávajú **z fotky, textu a odkazu**
(1365 z nich je parsovaných z `varecha.pravda.sk`), takže `postup`/`tipy` je nedôveryhodný text z webu.
Dnes je databáza čistá — `scripts/audit/data_bezpecnost.py` našiel jediný neškodný `-->`
(`cokoladovy-fondant.json.postup[7]`).

**Oprava:** do `skontroluj_recepty()` pridať kontrolu na `</script`, `<script`, `__DATA__`,
`__POTRAVINY__`, `__JEDALNICKY__`, `__APP_JS__`, `__DATUM__`, `__POCET__` vo všetkých reťazcoch
(hotový detektor je v `scripts/audit/data_bezpecnost.py`), plus `json.dumps(...).replace("</", "<\\/")`
ako druhá poistka. Reprodukcia: `sh scripts/audit/build_odolnost.sh`.

---

## P1-2 · Nákup kupuje o 9,5 % viac kalórií, než Plán a Výživa hlásia

**Súbory:** `data/app.js:183-190` (`_vyzivaVypocet` — `v.kcal=j`), `data/app.js:1257-1272` (`nakupPolozky`)

Appka má **dva nezávislé zdroje pravdy o kalóriách jedla**:

* Plán, Výživa a Domov berú `kcal_na_porciu` (B4: „kurátorovanému kcal sa verí VŽDY“),
* Nákup nakupuje **skutočné suroviny** (`grams × potravina.kcal/100`).

Keď sa tieto dve čísla rozchádzajú, rozdiel skončí v košíku a nikde sa nezobrazí.

**Dôkaz (`scripts/audit/nakup_vs_plan.js`, 20 vygenerovaných týždňov, 2 stravníci × 1450 kcal):**

```
priemer 20 týždňov: 1.095  → domácnosť nakupuje o 9 % viac kalórií, než jej Plán a Výživa hlásia
najhorší týždeň:    1.50   (kvôli zemiakovy-chlieb-v-rimskom-hrnci-romertopf, pomer 5,9×)
pri 128 €/týždeň to je ~12 € týždenne jedla navyše
```

Zaokrúhľovanie porcií z toho tvorí len **1,5 %** (`scripts/audit/detaily.js`), zvyšok je dátový rozdiel.

**Oprava:** buď (a) do `nakupPolozky()` prepočítať množstvá receptu faktorom `kcal_na_porciu /
Σ(suroviny)` rovnako, ako to už robí `_vyzivaVypocet` pre makrá a cenu — potom je nákup konzistentný
s tým, čo appka sľubuje; alebo (b) prijať, že pravdou sú suroviny, a `kcal_na_porciu` používať len
ako kontrolu s viditeľným varovaním. Dnešný stav (a aj b naraz, každé na inej obrazovke) je najhorší.

---

## P1-3 · 42 receptov má vymyslené makrá; generátor podľa nich optimalizuje bielkoviny

**Súbor:** `data/app.js:184-190`

`_vyzivaVypocet` verí `kcal_na_porciu` a **makrá prepočíta faktorom `1/q`**, kde
`q = vypočítané kcal / deklarované kcal`. Pri zlom `porcie` alebo `kcal_na_porciu` v dátach to vyrobí
čísla, ktoré nemajú so surovinami nič spoločné.

**Dôkaz (`scripts/audit/makra_skalovanie.js`):**

```
hovadzi-steak-s-cesnakovym-maslom   pomer 10,25×  suroviny 1373 kcal / B 130,0 g → zobrazí 134 kcal / B 12,7 g
polievka-z-volskeho-chvosta         pomer 15,31×  suroviny 2006 kcal / B 196,9 g → zobrazí 131 kcal / B 12,9 g
kuzlo-pod-cibulou                   pomer  0,28×  suroviny  119 kcal / B   8,5 g → zobrazí 424 kcal / B 30,2 g
rolky-plnene-kyslou-kapustou        pomer  0,23×  suroviny   96 kcal / B   5,5 g → zobrazí 411 kcal / B 23,4 g

receptov s pomerom > 2×: 30 · < 0,5×: 12
```

`hovadzi-steak-s-cesnakovym-maslom` má v JSON-e `porcie: 1` a ingredienciu `Krkovica hovädzia 500 g` —
teda príčina je v **dátach receptu, nie v kóde**. Dopad je však na kód: `bielkovinyNa100()`
(`app.js:960`) číta práve tieto zobrazené bielkoviny, `vahaReceptu()` (`:965`) je v nich
**multiplikatívna** a `zlepsiBielkoviny()` (`:1062`) podľa nich hill-climbuje. Zo 65 receptov
v kolekcii „Vysoký proteín“ sú 4 také, ktorým bielkoviny vznikli **vynásobením**.

**Oprava:** dátová — skript, ktorý vypíše recepty s `q > 2` alebo `q < 0,5`, a ručne opraviť `porcie`
/ `kcal_na_porciu` (často je `porcie: 1` pri surovinách na 4 osoby). V kóde: pri `q` mimo ~⟨0,6; 1,7⟩
nedôverovať ani jednému číslu a recept vylúčiť z bielkovinovej optimalizácie (dnes ho práve
uprednostní). `kcal_zdroj` na to má byť pole — má ho **0 z 1956 receptov**, hoci `CLAUDE.md` ho popisuje.

---

## P1-4 · Stored XSS: meno stravníka a názov jedálnička idú do `innerHTML` neescapované

**Súbory:** `data/app.js:1636` (Výživa → ciele stravníkov), `data/app.js:1807` (Načítať jedálniček)

Zapisovače neescapujú: `zmenStravnika()` (`:1666`) uloží meno tak, ako ho používateľ napísal;
`ulozPlanArchiv()` (`:1235`) uloží názov z `promptModal` bez escapu. Vykresľovače ich vkladajú priamo.

**Dôkaz (`scripts/audit/xss_repro.js`):**

```
1) #vyziva-stravnici (app.js:1636): ❌ ÚTOK PRENIKOL DO innerHTML
   výsek: <div class="sp-row"><span><b><img src=x onerror="alert(1)"></b></span>…
3) #pick-modal / otvorNacitat (app.js:1807): ❌ ÚTOK PRENIKOL DO innerHTML
```

Prečo to nie je „len lokálna appka“: `zbierOsobne()` (`:1962`) posiela do Supabase **celý `S` okrem
metadát** — teda aj `profil.stravnici` a `archiv` — a `syncOsobnePull()` (`:1968`) ich načíta na inom
zariadení a vykreslí. Skupinový blob (`SHARED_FIELDS`, `:1909`) rovnako nesie `spajza` a `nakupManual`
od iného člena domácnosti. Ide teda o cross-device stored XSS v kontexte, kde beží celý stav appky
(vrátane prístupového tokenu v `localStorage["kucharka_auth"]`).

Ďalšie miesta bez escapu, ktoré dnes nesú len dáta z JSON-u, ale sú rovnako zraniteľné, keď ich naplní
sync alebo vlastný recept: `:1402` (`lowStock` zo špajze), `:1373/:1376` (ručná položka nákupu —
`pridajChybajuceDoNakupu()` na `:1728` ju na rozdiel od `pridajNakupPolozku()` **neescapuje**),
`:1774` a `:1762` (špajza), `:1489` a `:1537` (názvy receptov).

**Oprava:** escapovať **pri vykresľovaní**, nie pri zápise — `escHtml()` už existuje, stačí ho dať na
`:1636`, `:1807`, `:1402`, `:1373`, `:1376`, `:1774`, `:1762`. A pri zápise escapovanie **zrušiť**
(viď P2-7, dnes deformuje dáta).

---

## P1-5 · `HOSTING.md` navádza na RLS politiku, ktorá zverejní celý stav domácnosti

**Súbor:** `HOSTING.md:38-40`

```sql
create table kucharka (id text primary key, data jsonb, ts bigint);
create policy "verejne" on kucharka for all using (true) with check (true);
```

Dokument to podáva ako „zdieľanie cez tajné Sync ID“. Tajné však nie je nič: anon kľúč je v klientovi
(`sync-config.js` sa servíruje verejne) a politika `using (true)` **nefiltruje podľa `id`**, takže
`GET /rest/v1/kucharka?select=*` vráti **riadky všetkých používateľov** a `POST` ich prepíše.
V blobe je plán, špajza, nákup, TDEE profil, **váhový denník** a história varenia.

`syncPush()` (`app.js:1902-1903`) do tejto tabuľky posiela celý `S` bez akejkoľvek autentifikácie.

**Oprava:** buď túto možnosť z `HOSTING.md` úplne odstrániť (Krok 3 ju plne nahrádza), alebo
prinajmenšom nahradiť politiku takou, ktorá vyžaduje zhodu `id` z hlavičky, a v dokumente prestať
nazývať Sync ID „tajným“ — pri `using (true)` nechráni nič.

---

# P2 — dôležité

## P2-1 · 730 ingrediencií (v 25,6 % receptov) sa počíta ako 0 g

**Súbor:** `data/app.js:113 gZaJednotku` — `KS_JEDNOTKY` bez `g_za_ks` vráti 0.

Rozhodnutie z B2 („radšej 0 g než tichých 60 g“) je správne, ale dopísanie dát sa nedokončilo:
**427 z 576 potravín (74 %) nemá `g_za_ks`.**

**Dôkaz (`scripts/audit/vyziva_kvalita.js`):**

```
ingrediencií s množstvom: 15 721 · z toho 0 g: 730 (4,6 %) — všetkých 730 má jednotku „ks“
receptov, kde aspoň 1 surovina nemá gramy: 500 / 1956 (25,6 %)
odhadom nezapočítaných: 139 779 kcal a 1 257,54 € v celej databáze
najčastejšie: 176× nenapárovaná surovina, 42× prášok do pečiva, 33× cukor, 31× smotana, 19× soľ, 14× maslo, 13× syr
```

Kalórie to dnes väčšinou nepokazí (98 % receptov má `kcal_na_porciu`), ale **cena a nákup áno**
a je to hlavný dôvod, prečo **52,5 % receptov ukazuje na karte „≈ odhad“** (z toho 500 kvôli chýbajúcim
gramom, 523 kvôli rozdielu kcal > 10 %). Značka „≈“ na polovici databázy prestáva niesť informáciu.

**Oprava:** `scripts/najdi_ks.py` už existuje — dobehnúť ho a doplniť `g_za_ks` aspoň pre tých ~40
kľúčov, ktoré pokrývajú väčšinu z 730 výskytov.

## P2-2 · Poškodený recept sa pri builde ticho zahodí a build skončí úspechom

**Súbor:** `generuj_kucharku.py:24-30`

```
$ echo '{ "id": "rozbity", "nazov": "Rozbity",' > recepty/_rozbity.json
$ python3 generuj_kucharku.py
Chyba pri čítaní …/_rozbity.json : Expecting property name…
Hotovo: …/kucharka.html
Receptov: 40                        ← o jeden menej, exit 0
```

Recept zmizne z appky, ale `S.plan`/`jedalnicky/*.json` naň môžu odkazovať; `komponent()` potom vráti
`null` a jedlo v pláne sa jednoducho nevykreslí. **Oprava:** rovnako ako pri jednotkách — zbierať
chyby a `raise SystemExit`, alebo aspoň nenulový exit kód.

## P2-3 · Poškodený `localStorage` = tichý úplný reset; zlyhaný zápis sa tiež prehltne

**Súbor:** `data/app.js:25-26`

```js
function nacitaj(){try{return JSON.parse(localStorage.getItem(LS))||{}}catch(e){return {}}}
function uloz(s){try{localStorage.setItem(LS,JSON.stringify(s))}catch(e){}}
```

Poškodený reťazec → **`{}`**: obľúbené, hodnotenia, poznámky, plán, špajza aj profil sú preč, bez
varovania a bez zálohy pôvodného reťazca (ktorý sa vzápätí prepíše prvým `save()`). Zlyhaný zápis
(privátne okno, zablokované úložisko) appka nezobrazí nijako — používateľ celý večer plánuje týždeň
a po zatvorení karty je preč.

**Kvóta sama riziko nie je** — zmerané (`scripts/audit/perzistencia.js`):

```
po 52 týždňoch generovania + odškrtaných nákupoch: 203 168 B
+ hodnotenia, poznámky a obľúbené ku VŠETKÝM 1956 receptom: 465 635 B (0,44 MB) z ~5 MB
```

**Oprava:** pri neplatnom JSON odložiť pôvodný reťazec do `kucharka_v2_poskodene` a ukázať toast;
v `uloz()` v `catch` zavolať `toast("Nepodarilo sa uložiť…")` a nastaviť príznak, ktorý appka ukáže
v hlavičke. Bonus: `S.plan` (364 kľúčov/rok) a `S.nakupCheck` (4026 kľúčov/rok) sa **nikdy neprerezávajú**,
hoci `nedavneRecepty()` čítá len 4 týždne späť a `nakupCheckKey` viaže odškrtnutia na týždeň.

## P2-4 · Dve otvorené záložky sa navzájom prepíšu

`data/app.js` nemá `addEventListener("storage", …)` (overené) a `uloz()` serializuje **celý** `S`.
Scenár: v jednej karte je Plán, v druhej Nákup. Odškrtnutie položky v karte B zapíše celý stav
z karty B, čím zahodí jedálniček vygenerovaný v karte A. `visibilitychange` (`:1989`) volá len
`syncSkupinaPull()` (Supabase), z `localStorage` sa nikdy nenačítava znova.

**Oprava:** listener na `storage`, ktorý pri zmene kľúča `kucharka_v2` znovu načíta `S` a prekreslí
aktuálnu obrazovku — je to pár riadkov a rieši aj „appka na mobile v dvoch kartách“.

## P2-5 · Licencie: 5 receptov zo zdrojov, ktoré `CLAUDE.md` výslovne zakazuje

**Dôkaz (`scripts/audit/zdroje.py`):**

```
bageta-udena-sunka-gouda      Allrecipes                            (bez zdroj_url)
domace-hovadzie-burgery       Allrecipes — Juiciest Hamburgers      (bez zdroj_url)
cacio-e-pepe                  Serious Eats                          (bez zdroj_url)
shakshuka                     Serious Eats                          (bez zdroj_url)
thai-basil-pork               Serious Eats                          (bez zdroj_url)
```

`CLAUDE.md` pritom hovorí: *„Allrecipes / Serious Eats / Simply Recipes (People Inc.) sa POUŽIŤ NEDAJÚ…
výslovný zákaz TDM, trénovania aj RAG“*. K tomu 1× `Bon Appétit` a 4 recepty so `zdroj: "internet
(@handle)"`, čo popiera vetu *„všetkých 1956 receptov má dohľadateľný zdroj“*.

**Wikibooks Cookbook (CC BY-SA):** 113 receptov, `zdroj` korektne obsahuje „(CC BY-SA)“, ale
**len 11 z nich má `zdroj_url`**. CC BY-SA vyžaduje odkaz na zdroj (a na licenciu); detail receptu
vykreslí odkaz len keď `zdroj_url` existuje (`app.js:469`), takže 102 receptov licenciu nespĺňa.

**Varecha je naopak v poriadku:** 1365/1365 má `zdroj_url` na `varecha.pravda.sk`, všetky `https://`,
detail ich renderuje ako aktívny odkaz. 0 duplicitných `id`.

**Oprava:** 5 zakázaných receptov nahradiť (BBC Good Food / TheMealDB majú kanonické verzie
carbonary, shakshuky aj Thai basil pork) a k Wikibooks doplniť `zdroj_url`
(`https://en.wikibooks.org/wiki/Cookbook:<Názov>`, formát už používa 11 receptov).

## P2-6 · Šesť rôznych implementácií „obsahuje túto surovinu“ — a `CLAUDE.md` tvrdí, že je jedna

`CLAUDE.md` píše: *„Zakázané suroviny a ‚Mám doma‘ zdieľajú `obsahujeSurovinu`“*. To platí pre
**Nákup**, ale sekcia **„Čo mám doma“** používa niečo iné:

| miesto | funkcia | algoritmus |
|---|---|---|
| Nákup „Mám doma“, zakázané suroviny | `jeDoma`/`obsahujeSurovinu` `:1329` | kmeň + prefix 3–5 znakov |
| **Čo mám doma, radenie „zo špajze“** | `skoreReceptu` `:213` | `nm.includes(m) \|\| m.includes(nm.split(" ")[0])` |
| **„+ do nákupu“ (čo chýba)** | `pridajChybajuceDoNakupu` `:1726` | to isté, znova napísané |
| Špajza ↔ surovina | `spajzaSedi` `:1339` | `kluc` alebo obojsmerný `includes` |
| Odpis zo špajze | `odpisRecept` `:1792` | ďalší variant `includes` |
| Expirácia / akcie / watch-list | `expBoost` `:1788`, `jeVakcii` `:955`, `jeWatch` `:958` | čistý `toLowerCase().includes` |

Dôsledok pre používateľa: napíše „mlieko“ do **Nákupu** a odráta sa mu aj „mlieka“; napíše to isté
do **„Čo mám doma“** a recept s „Kokosového mlieka“ sa nenájde. Dve obrazovky s tým istým názvom
sa správajú inak. Zároveň je to zdroj budúceho rozídenia — sedem miest, ktoré treba meniť naraz.

**Oprava:** `skoreReceptu` a `pridajChybajuceDoNakupu` prepnúť na `obsahujeSurovinu`; ostatné tri
nechať, ale do `CLAUDE.md` napísať pravdu (dnes tvrdí niečo, čo neplatí).

## P2-7 · `escHtml()` pri zápise deformuje dáta — vlastný recept sa nedá nájsť podľa vlastného názvu

**Súbory:** `data/app.js:416, 419, 422-424` (vlastný recept), `:1414` (ručná položka), `:1755` (špajza)

Escapuje sa **pri ukladaní**, takže do `S` sa uloží HTML entita a tá potom putuje všade — do
vyhľadávania, do párovania na potraviny, do schránky pre Listonic, do `textContent` v režime varenia.

**Dôkaz (`scripts/audit/vykon.js`):**

```
uložený názov vlastného receptu: "Kuracie &amp; ryža"
hladaSedi(r,'kuracie & ryza') = false     ← recept sa nedá nájsť podľa svojho názvu
hladaSedi(r,'amp')            = true      ← entita sa stala hľadateľným slovom
```

`spustiCook()` (`:628`) navyše robí `cook-title.textContent = aktualny.nazov`, takže v režime varenia
sa nad sporákom svieti doslovné `Kuracie &amp; ryža`.

**Oprava:** ukladať surový text, escapovať až pri vykresľovaní (spolu s P1-4 je to jedna zmena).

## P2-8 · Doménové pravidlá: štrukturálne 100 %, „mäkké“ 89–93 %

**Dôkaz (`scripts/audit/gen_pravidla.js`, 50 týždňov, seed 20260830):**

```
blokov v týždni:                        {"3": 50}          ✅
1 variant/slot/blok:                    0 / 1400 porušení  ✅
obed ≠ večera:                          0 / 350            ✅
bez carryover C→A (medzi týždňami):     0 / 196            ✅
nenaplnené sloty:                       0 / 1400           ✅
bez opakovania naprieč blokmi:          1 / 600 (0,2 %)    ⚠️
celé poradie O>V>R>S:                   89,4 % (313/350)   ⚠️
   porušené páry: Raňajky>Snack 22 · Večera>Raňajky 12 · Obed>Večera 3
raňajky — iná báza pre každý blok:      13 kolízií / 150 blokov (8,7 %)  ⚠️
```

`node scripts/metriky.js 30` dáva pre poradie 92,9 % — čiže **BASELINE-ových „96,4 %“ nie je konštanta,
ale vzorka.** Tých zvyšných 7–11 % nie je náhoda ani chyba, je to **architektúra**: každý filter
v `vyberDoSlotu()` (`:1016-1027`) má tvar `if(p.length) pool=p`, teda pri prázdnom výsledku sa pravidlo
ticho zahodí, a `vyberVazene()` (`:970`) má `if(!cand.length) cand=pool.slice()`, čo je presne zdroj
toho jedného opakovania naprieč blokmi. `opravDen()` (`:1082`) sa po 24 iteráciách alebo po dvoch
neúspešných `prehodSlot` jednoducho vzdá (`return` na `:1121`).

To je **legitímny dizajn** (radšej vyplnený deň než prázdny slot), ale nikde to nie je vidieť:
používateľ nemá ako zistiť, že jeho utorok pravidlo porušuje. **Oprava:** buď to zdokumentovať
v `CLAUDE.md` ako „soft constraints“ a testy nastaviť na prah, alebo v bunke plánu, kde pravidlo
padlo, ukázať diskrétny príznak.

Drobnosť v tej istej oblasti: `prehodSlot()` pri odvolanej výmene (`:1078`) vráti `denPlan` aj
`ctx.pouzite`, ale **nie `ctx.pouziteBazy` a `ctx.dayKuchyne`** — tie si nechajú zápis od receptu,
ktorý nakoniec v pláne nie je, čím sa pool pre ďalšie sloty zbytočne zužuje.

## P2-9 · `scripts/metriky.js` reportuje výživu a cenu z JEDNÉHO týždňa — BASELINE je nereprodukovateľná

**Súbor:** `scripts/metriky.js:114` — `=== VÝŽIVA A CENA (posledný týždeň …) ===`

```
node scripts/metriky.js 20  →  cena 120,94 € · vláknina 11,1 g · sodík 1391 mg · bez ceny 6/69
node scripts/metriky.js 30  →  cena 182,48 € · vláknina 18,5 g · sodík 2547 mg · bez ceny 2/75
```

`BASELINE.md` uvádza čísla z `metriky.js 20`, ale `CLAUDE.md` aj samotná BASELINE hovoria spúšťať
`metriky.js 30`. Ktokoľvek z ostatných agentov porovná „pred/po“ pri inom `N`, uvidí **+51 % ceny
a +66 % vlákniny ako svoj vlastný výsledok.** Aj agregované metriky sú hlučné: medián bielkovín
97,9 g (N=20) vs 94,4 g (N=30) — a `test_generator.js` A2 má prah **95 g**, teda **presne v šume**.
Preto ten test padá „náhodne“, nie kvôli regresii.

**Oprava:** výživu a cenu priemerovať cez všetkých N týždňov (dáta sa už zbierajú), a prah A2 buď
znížiť pod šum, alebo test počítať na fixnom veľkom N s fixným seedom.

## P2-10 · PWA manifest má stále starú zelenú tému a tri rôzne čísla verzie

* `data/sablona.html:15` — manifest: `background_color:"#1f5c3c"`, `theme_color:"#1f5c3c"` (pôvodná
  **zelená**), kým `<meta name="theme-color">` na `:7` je terakotová `#6d3813` a celá téma v22 je
  terakota + krém. Na Androide teda splash screen a prepínač úloh svietia zeleno.
* `sw.js:1` — `CACHE="kucharka-v17"`, `app.js:60` — `VERZIA="v20"`, `CLAUDE.md` — dizajn „v22“,
  `CHANGELOG.md` — v19. Nastavenia ukazujú používateľovi „Verzia kuchárky: v20“.

**Oprava:** zosúladiť tri konštanty s jedným zdrojom (napr. vložiť verziu do šablóny placeholderom)
a manifest prefarbiť na tokeny Organic témy.

## P2-11 · Padajúci test A2 zamaskuje 10 ďalších kontrol generátora

**Súbor:** `test_generator.js:71` — `function ok(popis, fn) { fn(); … }`

`ok()` nechytá výnimku, takže prvé zlyhanie zhodí celý skript. A2 (medián bielkovín ≥ 95 g) padá
na `:92`, a **A3 až A7 sa nikdy nespustia**:

```
$ node test_generator.js
A1 …  ✓ ✓ ✓
A2 — bielkoviny ako multiplikátor váhy + oprava dňa
medián = 94.4 g          ← koniec, exit 1
```

Nespustené kontroly (`test_generator.js:96-156`, 10 assertov): dní pod 80 g bielkovín, celé poradie
jedál, večera pod 250 kcal, 2× sacharid, unikátne snacky, najčastejší snack, pamäť medzi týždňami,
7 kontrol `ranajkyBaza`. Sada generátora je teda dnes reálne **3 kontroly hlboká** a regresia
v poradí jedál, prílohách či snackoch je neviditeľná. (Podľa `metriky.js 30` by A3 aj A5 dnes prešli —
92,9 % a 83 unikátnych snackov —, ale nikto to nevidí.)

**Oprava:** `ok()` obaliť `try/catch`, zbierať zlyhania a `process.exit(1)` až na konci — presne tak,
ako to robia ostatné testy v projekte.

---

# P3 — drobnosti (s dôkazom)

## P3-1 · Nedeliteľné jednotky sa kupujú o 5,8 % navyše

`skalovanaHodnota()` (`:532`) zámerne **nenásobí** nedeliteľné jednotky faktorom veľkosti porcie,
ale `pocetPorciiDna()` (`:711-715`) počet porcií tým istým faktorom **delí** — kompenzácia sa tak
uplatní len na jednej strane.

**Dôkaz (`scripts/audit/nedelitelne_faktor.js`, 20 týždňov):**

```
faktory v pláne: {1:66, 0,95:34, 0,9:122, 1,05:22, 0,85:50, 1,1:12}
DELITEĽNÉ jednotky (g/ml/PL…):        nákup 182 674 vs správne 182 556  →  +0,1 %   ✅
NEDELITEĽNÉ (ks/plátok/rožok/žemľa):  nákup   1399,7 vs správne   1323,3 →  +5,8 %  ⚠️
  madarsky-hemendex · Vajcia 3 ks · f=0,95 → nákup 12,00, správne 11,18
  madarsky-hemendex · Šunka 2 plátok · f=0,95 → nákup 8,00, správne 7,45
```

## P3-2 · `NEDELITELNE_JEDNOTKY` stále neobsahuje strúčik/hrsť/štipka (B10b z augusta)

`app.js:530` — `["ks","kus","plátok","platok","rožok","rozok","žemľa","zemla"]`.
V receptoch je **1012 ingrediencií** s počítateľnou jednotkou mimo tohto zoznamu
(477× strúčik, 282× štipka, 178× hrsť, 36× list, 31× zväzok, 2× hlávka…).
`prevodJednotka(2.92,'strúčik')` → **„2,92 strúčik“**, `prevodJednotka(1.4,'hlávka')` → „1,4 hlávka“.
V Nákupe je to už opravené (`rodinaJednotky` ich pozná), v **detaile receptu nie**.

## P3-3 · Tri mŕtve funkcie — a dve z nich `CLAUDE.md` uvádza ako kľúčové koncepty

`scripts/audit/mrtvy_kod.js` (358 funkcií, 61 top-level `const`, 0 volaní neexistujúcej funkcie,
**0 TDZ rizík** v poradí konštánt):

```
app.js:701   mnozMult            — definované, nikde nevolané
app.js:678   potrebujePrilohu    — definované, nikde nevolané
app.js:1342  mamVSpajzi          — definované, nikde nevolané
```

`CLAUDE.md` pritom v sekcii „Kľúčové koncepty v app.js“ vymenúva `mnozMult` medzi mechanizmami prepočtu
množstiev a `potrebujePrilohu` sa cituje v predošlom audite. Obe sú dnes bez efektu — riziko je, že
niekto pri oprave zmení `mnozMult` a bude sa čudovať, že sa nič nedeje.

## P3-4 · Dokumentácia sľubuje súbory, ktoré neexistujú

| tvrdenie | realita |
|---|---|
| `CLAUDE.md`, `NAVOD.md`: „vzor `sync-config.example.js`“ | súbor **neexistuje** |
| `CLAUDE.md`: „`recepty/fotky/` je prázdny“ | priečinok **vôbec neexistuje** |
| `PROJEKT_BIBLIA.md`: workflow „fotku pridáš do projektu“ | `recepty/_prijate/` **neexistuje** |
| `CLAUDE.md`: „recepty majú `kcal_zdroj?: "vypocet"`“ | **0 z 1956** receptov ho má |
| `NAVOD.md` funkcia č. 4 „Fotky receptov“ | **0 z 1956** receptov má vyplnené `foto` |

Zvyšných 14 z 15 funkcií z `NAVOD.md` som overil — všetky majú kód aj UI prvok
(`scripts/audit/slubz_vs_realita.js`). Funkcia 12 („Import z fotky/textu/odkazu“) je manuálny
proces cez Claude, nie funkcia appky; v zozname 15 funkcií to nie je označené.

## P3-5 · `pridaj_sa()` je `SECURITY DEFINER` bez `set search_path`

`HOSTING.md:83-91`. Postgres funkcia so `security definer` a premenlivým `search_path` je štandardný
lint Supabase advisora („Function Search Path Mutable“). **Oprava:** doplniť
`set search_path = public, pg_temp`. Zvyšok RLS z Kroku 3 je v poriadku (`ud_all`, `sd_all`
aj `sk_sel` filtrujú podľa `auth.uid()`).

## P3-6 · Výkon: `renderGrid` prekresľuje 1956 kariet, `renderDash` prepočítava celý nákup

```
renderGrid (1956 kariet):  335 ms   (v node, bez layoutu ~19 000 uzlov)
renderDash:                 42 ms   (volá cenaTyzdna → nakupItems → celý nákupný zoznam)
```

`toggleFav()` (`:394`) volá `renderGrid()` **a** `renderDash()` — jeden klik na hviezdičku teda stojí
takmer 0,4 s výpočtu plus layout. To je ten istý otvorený P1c z augustového UI auditu (mriežka bez
stránkovania), len s číslom navyše: aj bez písania do hľadania sa platí pri každom obľúbenom.

---

# Vyzeralo to ako chyba, ale nie je (aby to ostatní nehľadali)

* **`gramy()` a `gramyNaJed()` sú presne inverzné.** Testoval som ~5 000 kombinácií (160 potravín ×
  31 jednotiek): **0 nezhôd** (`scripts/audit/vypocty.js`). Aj `gZaJednotku` je naozaj jediné miesto,
  kde sa prevádzajú *počítateľné* jednotky. Objemové prevody (`ML_JED`, `hustota`) sú v `gramy()`
  a `gramyNaJed()` symetricky, a `odhadHmoty()` (`:144`) je **zámerne** iná, hrubá tabuľka len pre
  pokrytie vlákniny/sodíka — nie duplicita, ale je vhodné to poznamenať pri prípadnej zmene jednotiek.
* **Kvóta `localStorage` nie je hrozba.** Rok generovania + hodnotenia, poznámky a obľúbené ku všetkým
  1956 receptom = **0,44 MB z ~5 MB**. Rast je ~200 KB/rok.
* **V repozitári ani vo vygenerovaných súboroch nie sú žiadne tajomstvá.** `sync-config.js` nebol
  nikdy commitnutý (`git log --all --diff-filter=A`), `.gitignore` ho pokrýva na všetkých úrovniach
  (teda aj `docs/sync-config.js`), a `docs/index.html` je **bajt na bajt** kópia `kucharka.html`
  bez akéhokoľvek kľúča (`scripts/audit/tajomstva.sh`).
* **Predošlé audity sú naozaj vyriešené.** Z 39 skriptom overených bodov (A1–A6, B1–B10, C1–C7,
  D1–D11) prešlo **37**; otvorené ostávajú len dva P3 (B10a hustota, B10b nedeliteľné jednotky)
  a tri P1 z UI auditu, ktoré `BASELINE.md` sama priznáva. Konkrétne som overil, že „Kokosového mlieka“
  sa páruje na `kokosové mlieko`, `4 list šalátu` = 32 g (nie 1200 g), `4 ks kardamómu` = 0 g (nie 240 g).
* **`hustota: 1` u 477 z 576 potravín je neškodná.** Hustota vstupuje do výpočtu len pri `ml`/`l`
  a lyžicových jednotkách. Reálne dotknutých je **53 tekutín, z toho 31 s hustotou 1** — a väčšina
  z nich (voda, mlieko, jogurt, vývar, šťava, kokosové mlieko) má hustotu ≈ 1 aj v skutočnosti.
  Za pozretie stoja len omáčky (hoisin, ustricová ≈ 1,2).
* **Cenová a mikroživinová databáza je kompletná:** 0 z 576 potravín bez `cena100`, `vlaknina`
  aj `sodik`. B5/B6 z augusta sú dorobené na 100 %.
* **`cieloveMakra` už nespadne na 0 g sacharidov** ani pri cieli 200 g bielkovín (`{b:200,t:48,s:55}`).
* **Kontrast prejde:** `python3 scripts/kontrast_organic.py` — všetky páry spĺňajú WCAG AA
  (najhorší 4,86:1).
* **Testy:** `test_vypocty` 31 ✅, `test_nakup` 15 ✅, `test_ux` 18 ✅, `test_prepocty` ✅,
  `test_porcie` ✅; `test_generator` padá na A2 (94,4 g < 95 g) — viď P2-9, je to prah v šume,
  nie regresia kódu. Pozor však na P2-11: tým pádom sa nespustí A3–A7.

---

# Odporúčané poradie opráv

1. **P1-1** (jeden `if` v `skontroluj_recepty` — ochrana pred mŕtvym buildom) a **P2-2** (nenulový exit).
2. **P1-4 + P2-7** naraz: escapovať pri vykresľovaní, prestať escapovať pri zápise.
3. **P1-5**: vyhodiť `using (true)` variant z `HOSTING.md`.
4. **P1-3** (dáta ~42 receptov) → až potom **P1-2** (zjednotiť zdroj pravdy o kalóriách), lebo P1-2 sa
   bez P1-3 nedá poriadne zmerať.
5. **P2-9 + P2-11** (metriky a test harness) pred akýmkoľvek ladením generátora — inak ostatní
   agenti merajú šum a 10 kontrol im vôbec nebeží.
6. Zvyšok podľa poradia vyššie.

---

*Skripty: `scripts/audit/` (commit `2254dc0`, branch `agent9`). Všetko sa dá zopakovať —
`node scripts/audit/<skript>.js`, `sh scripts/audit/build_odolnost.sh`,
`python3 scripts/audit/{zdroje,data_bezpecnost}.py`.*
