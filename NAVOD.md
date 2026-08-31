# Moja kuchárka — návod

Ak hľadáš skôr „načo to je a ako to používať", začni súborom **`PRECO_A_AKO.md`**.
Tento návod je zoznam funkcií a história verzií.

## Súbory
- **`kucharka.html`** — otvor dvojklikom. Celá appka (recepty, plánovač, nákup, výživa).
  Je to jeden súbor, ~2,5 MB, funguje bez internetu.
- **`recepty/`** — každý recept je jeden `.json`. `recepty/fotky/` sú fotky (`<id>.webp`)
  a `ZDROJE.json` s licenciou ku každej.
- **`data/potraviny.json`** — databáza potravín (kalórie, makrá, oddelenia v obchode, alergény, ceny).
- **`data/sablona.html`** — vzhľad appky.
- **`generuj_kucharku.py`** — z receptov + databázy znova postaví `kucharka.html`.

## Funkcie (15) — a čo z nich appka naozaj robí
Overené v prehliadači 31. 8. 2026 (Chromium, 393×850 aj 1440×900) na vygenerovanom `kucharka.html`.
**✅ = appka to vie sama · ◐ = vie to čiastočne · 🤖 = robí to Claude mimo appky.**

| # | Funkcia | Stav | Kde to je |
|---|---|---|---|
| 1 | Obľúbené (hviezda na karte) | ✅ | ★ na karte v Receptoch aj v detaile, prežije zatvorenie appky |
| 2 | Hodnotenie 1–5 + vlastná poznámka | ✅ | detail receptu (aj polovičné hviezdy), poznámka sa ukladá priebežne |
| 3 | Filtre: kategória, kuchyňa, čas, diéta/obľúbené | ✅ | Recepty → „⚙ Filtre a radenie" — 13 kategórií, 44 kuchýň, 6 diét, 7 spôsobov radenia; tlačidlo píše, koľko filtrov je zapnutých |
| 4 | Fotky receptov | ◐ **niektoré** | fotku má **54 receptov**; ostatné majú namiesto nej veľké emoji kategórie — nie je tam diera. Pri fotke je uvedený zdroj („Foto: TheCocktailDB"). |
| 5 | Plánovač týždňa (Po–Ne × Raňajky/Obed/Snack/Večera) | ✅ | Plán → 📋 Týždeň, 28 slotov |
| 6 | Nákupný zoznam z plánu (sčítané suroviny) | ✅ | Nákup — podľa týždňa 50–80 položiek, s cenou a s počtom balení |
| 7 | Nákup zoradený podľa oddelení v obchode | ✅ **a poradie si prestavíš** | Nákup → „🏪 Trasa obchodom": Kaufland / Lidl / Vlastné + šípky ↑↓. Zmena sa hneď prejaví v zozname. |
| 8 | „Čo mám doma" — návrh receptov podľa surovín | ✅ | Recepty → radenie „🧊 Najviac z mojej špajze"; Špajza → „Nájdi recepty zo špajze"; Domov → „⋯ Viac → 🧊 Uvar zo špajze" |
| 9 | Makrá: kalórie, bielkoviny, tuky, sacharidy zo surovín | ✅ | karta receptu, detail, Plán, Výživa — plus vláknina a sodík. Keď deklarované kalórie nesedia so surovinami, recept to prizná značkou „≈ odhad". |
| 10 | Denný kalorický cieľ + upozornenie pri prekročení | ✅ | riadok „Σ kcal/deň" v Pláne (pásik + ⚠) |
| 11 | Alergény a diétne značky | ✅ | badge v detaile (⚠ orechy / lepok / mlieko / vajcia), 6 diétnych filtrov |
| 12 | Import z fotky/textu/odkazu | 🤖 **appka to nevie** | Appka má **ručný formulár „+ Nový recept"** — a v ňom aj **fotku z mobilu** (odfotíš jedlo, uloží sa v zariadení, nič sa neposiela von). Prečítať recept z fotky, textu alebo odkazu appka nevie: v `data/app.js` nie je parser ani OCR. **Pošli mi recept a ja ho do kuchárky pridám.** |
| 13 | Prepočet porcií, „na 1 porciu", ml → lyžice, imperiálne | ✅ | detail receptu — stepper porcií + prepínač g/ml · PL/ČL · oz/cup |
| 14 | Režim varenia (veľké písmo, kroky, časovače, obrazovka nezhasne) | ✅ | „Variť" v detaile; tmavá obrazovka, 23 px písmo na mobile, viac súbežných časovačov, hlasové čítanie, Wake Lock, Escape zatvára |
| 15 | Tlač / export do PDF (recept, plán, nákup) | ✅ | „🖨 Tlačiť" v každej sekcii + „🖨 Týždeň (plán+nákup)". Na papieri nezostane ani jedno tlačidlo — okrem zaškrtávacích políčok v nákupe, ktoré tam chceme. |
| — | Práca bez internetu | ✅ | po prvom otvorení sa appka načíta aj offline, so všetkými receptmi |
| — | Synchronizácia PC ↔ mobil | ⚙️ **pripravené, nezapnuté** | funkcie aj sekcia v Nastaveniach existujú; zapne sa až vytvorením `sync-config.js` (viď `HOSTING.md`). Bez neho appka beží normálne. |

**Zhrnutie: 14 z 15 robí appka sama** (jedna z nich, fotky, zatiaľ len pri časti receptov),
**1 (čítanie receptu z fotky/textu/odkazu) robí Claude.**

## Pridanie receptu
**Najjednoduchšie:** pošli mi recept textom, fotku alebo odkaz — uložím ho a znova vygenerujem kuchárku.

**Priamo v appke:** „+ Nový recept" v Receptoch. Vyplníš názov, kategóriu, suroviny a kroky,
môžeš pridať vlastnú fotku z telefónu. Takýto recept žije **len v tvojom zariadení**
(v pamäti prehliadača), nie v priečinku `recepty/` — takže sa nedostane do zálohy projektu
ani na druhé zariadenie, kým mi ho nepošleš.

**Ručne v súboroch:** skopíruj existujúci súbor v `recepty/`, uprav polia, spusti
`python3 generuj_kucharku.py` (alebo ma poprosi a spravím to). Pri surovine „podľa chuti"
nechaj `"mnozstvo": null`.

## Zobrazenie na mobile
- Telefón je hlavné zariadenie — appka je stavaná na 393×850 (Nothing Phone 3a Pro).
- Otvor `kucharka.html` v mobilnom prehliadači a daj „Pridať na plochu" — bude sa tváriť ako appka.
- Recepty sú vložené priamo v `kucharka.html`, takže súbor funguje samostatne offline.
  Prvé načítanie na pomalom pripojení trvá ~6 s, každé ďalšie je okamžité.
- Pozn.: obľúbené, hodnotenia a plán sa ukladajú **v danom zariadení** — kým nie je zapnutá
  synchronizácia, PC a telefón o sebe nevedia. Ak chceš plnú synchronizáciu, viem nastaviť
  online (hostovanú) verziu — povedz.

---

## Verzia 3 — nový layout a funkcie
Layout: **bočné menu** (na počítači vľavo, na mobile spodná lišta) + úvodná **Nástenka (Domov)**.
Sekcie: Domov · Recepty · Plán · Nákup · Výživa · Čo mám doma · Nastavenia.

Nové funkcie:
- **Ceny** — €/porcia pri recepte, cena/deň a cena/týždeň v pláne, odhad ceny nákupu (podľa počtu osôb z profilu).
- **Nákup s cenami + Listonic** — tlačidlo „Kopírovať (Listonic)" skopíruje zoznam po riadkoch.
- **Výživa** — graf kalórií po dňoch oproti cieľu, priemer kcal a bielkovín, rozklad makier za týždeň.
- **Profil domácnosti** (Nastavenia) — počet osôb, cieľ kcal a bielkovín, prepínače bez rýb / bez lepku / bez laktózy (filtrujú recepty).
- **Čo variť dnes** — návrh na Nástenke podľa hodnotenia a čo si dávno nevaril.
- **Dojedz zvyšky** — nájde recepty, čo využijú suroviny z aktuálneho plánu.
- **Náhrady surovín** — pri recepte ukáže alternatívy (maslo→olej…).
- **História** — po dokončení režimu varenia sa recept zapíše do „Naposledy varené".
- **Appka na mobile** — „Pridať na plochu" (PWA meta), ceny/plán/obľúbené sa ukladajú v zariadení.

---

## Verzia 4 — plánovanie a nákup
- **Automatický jedálniček** — „✨ Vygenerovať" / „🎲 Zamiešať" v Pláne (podľa profilu, pestrosti, hodnotení, histórie).
- **Škálovanie na kalorický cieľ** — pri generovaní sa jedlá dňa prepočítajú, aby deň sedel na cieľ (napr. 500→400 kcal = porcie na 80 %). Faktor sa ukáže v bunke (napr. „· 80 %") a premietne sa do kalórií, ceny aj nákupu.
- **Nákup: zlúčenie jednotiek** — rovnaká surovina v ks aj g sa spočíta do jedného riadku (napr. vajcia).
- **Prepínač jednotiek** pri recepte — g/ml · lyžice (PL/ČL) · imperiálne (oz/cup/lb).
- **Mám doma** — v Nákupe napíšeš, čo už máš; odráta sa z ceny aj zoznamu.
- **Archív jedálničkov** — „💾 Uložiť plán" uloží aktuálny týždeň; načítaš ho cez „📥 Načítať jedálniček".
- **Tlač týždňa** — „🖨 Týždeň (plán+nákup)" vytlačí plán aj nákup naraz.
- **Tmavý režim** a **väčšie písmo** — v Nastaveniach.
- Recept z odkazu/textu pridávam ja — pošli mi URL alebo text a doplním ho do kuchárky.

---

## Verzia 5 — kategórie a inteligencia
- **Bohatšie kategórie** — Raňajky, Hlavné jedlo, Cestoviny, Polievka, Šalát, Nátierka, Príloha, Snack, Dezert, Kokteil, Nápoj. Nápoje s alkoholom (limoncello…) sú Kokteil.
- **Generátor v2** — používa mapovanie kategória→slot (nedá kokteil do obeda), strieda kuchyne v rámci dňa, uprednostní vysoko-bielkovinové (ak máš cieľ) a sezónne recepty.
- **Sezónnosť** — recepty so sezónnymi surovinami majú badge „🌿 sezónne" (podľa mesiaca) a generátor ich preferuje.
- **Balenia v nákupe** — zaokrúhli na predajné balenia (maslo 250 g, ryža 1 kg…), ukáže prebytok a počíta cenu za celé balenia.
- **Ručné škálovanie porcie** — v Pláne klikni na riadok s kcal (✎) a zadaj % veľkosti porcie.
- **Akcie** — v Nastaveniach zadáš, čo je tento týždeň v akcii; recepty dostanú „🏷️ akcia", generátor ich uprednostní, v nákupe sú označené.
- **Výpočet cieľa (TDEE)** — v Nastaveniach z pohlavia/veku/výšky/váhy/aktivity predvyplní kalorický cieľ.
- **Záloha dát** — export/import nastavení do súboru (aby si neprišiel o obľúbené/plán).
- **Režim varenia v2** — viac súbežných časovačov naraz, hlasové čítanie krokov (🔊 / prepínač „hlas").

### Zatiaľ neurobené (stav k 31. 8. 2026)
- Porovnanie Kaufland vs Lidl (treba dva letáky). *Poradie oddelení podľa Lidla už appka vie —
  viď funkcia 7 — ale ceny sú z jedného reťazca.*
- Fotky ku **každému** receptu. Časť receptov už fotku má (funkcia 4), zvyšok má emoji.
- Online verzia so synchronizáciou PC ↔ mobil (potrebný hosting) — kód je hotový,
  chýba len konfigurácia, viď `HOSTING.md`.
- Ceny v databáze sú odhad reálnych slovenských cien 2026 — pri niektorých surovinách ich
  možno bude treba spresniť. Položku bez ceny appka priznáva odznakom „? cena".

---

## Verzia 6 — bloky, výber jedla, hosting
- **Nákup = presné čísla** — primárne exaktné množstvo a cena; balenie len v zátvorke „(bal.: 2× 250 g)", dá sa vypnúť v Nastaveniach.
- **Blokový plán (meal-prep)** — dni sa zoskupia do blokov. Navaríš raz, je sa cez blok; nákup automaticky znásobí množstvá podľa dní v bloku. *(Predvolené rozdelenie aj ovládanie sa medzitým zmenili — platí verzia 15 nižšie.)*
- **Dvojkrokový výber** — klik na bunku → najprv typ jedla (kategória), potom recept z nej. V bloku sa dá vybrať „na celý blok" alebo len jeden deň.
- **PWA / hosting** — appka je pripravená ako inštalovateľná offline appka (`sw.js`). Návod na nasadenie: `HOSTING.md`.
- **Synchronizácia PC ↔ mobil** — voliteľná cez Supabase; aktivuje sa vytvorením `sync-config.js` (vzor `sync-config.example.js`, postup v `HOSTING.md`). Bez nej appka beží normálne.

---

## Verzia 7 — batch cooking podľa tvojich pravidiel
- **Bloky A/B/C** presne podľa tvojho systému: Blok A = Po-Ut (varí sa **Ne večer**), Blok B = St-Št-Pi (**Ut večer**), Blok C = So-Ne (**Pi večer**). V hlavičke bloku vidno aj varný deň.
- **4 jedlá** — generátor plní aj **Snack** (raňajky/obed/snack/večera).
- **Poradie kalórií** — generátor zabezpečí **obed ≥ večera** (v prípade potreby ich prehodí); obed ≠ večera automaticky (žiadne opakovanie naprieč blokmi).
- **Raňajky** — iná báza (tortilla/toast/bageta) pre každý blok.
- Hranice blokov aj režim vieš stále meniť; ostatné pravidlá (RecipeTinEats obmedzene, pantry staples do nákupu, kalórie pred receptami…) mám v pamäti a použijem ich, keď spolu staviame jedálniček.

---

## Verzia 8 — kompletné jedlá (hlavné + doplnok)
- Jedlo v slote môže mať **viac komponentov**: hlavné jedlo + príloha/pečivo/šalát.
- Generátor **automaticky dopĺňa**: k mäsu/hlavnému jedlu bez vlastného sacharidu pridá prílohu (ryža), k nátierke pridá pečivo. Jedlá, čo už sacharid majú (ryža, zemiaky, cestoviny…), nechá tak.
- **Samotná príloha nie je jedlo** — do obeda/večere sa ako hlavné nikdy nevloží, len ako doplnok.
- V pláne pri bunke máš **„+ doplnok"** (ryža/zemiaky/cestoviny/pečivo/šalát alebo recept-príloha) a pri každom komponente **✕** na odobratie.
- Kalórie, cena aj nákup rátajú so všetkými komponentmi (v bloku sa doplnok pridá/odoberie pre celý blok).

---

## Verzia 9 — prílohy, snacky a prieskum
- **16 základných príloh** ako recepty s kalóriami: ryža (varená, jazmínová, hnedá natur, dusená s cibuľkou), zemiaky (varené, kaša, opekané, pečené z plechu, americké), pečené hranolky, kuskus, dusená zelenina, a pečivo (rožok, celozrnný chlieb, bageta, toast).
- **12 bežných snackov**: skyr, grécky jogurt s medom, tvarohový dezert, krém typu Miša, cereálna/proteínová tyčinka, jablko, banán, hrsť orieškov, hummus so zeleninou, ryžové chlebíčky s arašidovým maslom, syr s hroznom.
- Databáza potravín rozšírená na **151 položiek** (kuskus, skyr, grécky jogurt, mandle, banán, hrozno, hummus, ryžové chlebíčky, celozrnný chlieb, rožok, arašidové maslo…).
- Prílohy aj pečivo sa dajú pridať cez **„+ doplnok"** v pláne; snacky idú do slotu Snack.
- **Prieskum 8+ aplikácií** → `INSPIRACIA.md` (12 appiek, konkrétne nápady a TOP odporúčania pre ďalší vývoj).

---

## Verzia 10 — Špajza / mraznička (+ vodný tracker)
- **Nová sekcia „🧊 Špajza"** — evidencia zásob s **miestom** (chladnička/mraznička/špajza), **dátumom spotreby** a **minimálnym množstvom**.
- **Spotrebuj čoskoro** — položky do 4 dní pred expiráciou sú zvýraznené (žlté/červené) v Špajzi aj na Nástenke.
- **Doplniť zásoby** — položky pod minimom sa automaticky ponúknu v **Nákupe** (blok „Doplniť zásoby").
- **Odpíš zo špajze** — tlačidlo pri recepte odráta jeho suroviny zo zásob (podľa počtu osôb).
- **Prepojenie** — zo Špajze sa dá jedným tlačidlom nájsť, čo sa z nej dá uvariť („Nájdi recepty zo špajze"), a v Receptoch je radenie „🧊 Najviac z mojej špajze"; **generátor uprednostní** recepty využívajúce suroviny pred spotrebou.
- **Vodný tracker** — na Nástenke poháre vody na deň (💧 0/8).

*Pozn.: knižnica receptov medzitým narástla (sync) — appka ich zobrazuje všetky.*

---

## Verzia 11 — kupované snacky, mikroživiny, adaptívny cieľ
- **Kupované snacky** — pridané ďalšie kúpené snacky (kefír, puding, cottage, korbáčik, krekry, ovocná kapsička, proteínový puding, čokoládová tyčinka) a existujúce označené. V Nastaveniach prepínač **„Preferovať kupované snacky"** — generátor dá do slotu Snack prednostne kupované.
- **Mikroživiny** — databáza má vlákninu a sodík; vo **Výžive** pribudli dlaždice **Vláknina/deň (/30 g)** a **Sodík/deň (/2300 mg, varovanie pri prekročení)**.
- **Adaptívny kalorický cieľ** — v Nastaveniach **váhový denník**; z trendu (kg/týždeň) a zvoleného **cieľa** (chudnutie/udržanie/priberanie) tlačidlo „Prispôsobiť cieľ" upraví kalórie.
- **Okno jedenia 16:8** — prepínač + hodina začiatku; na Nástenke ukazuje okno a či si v ňom.
- **Watch-list surovín** — v Nastaveniach zoznam sledovaných surovín; recepty s nimi majú ⭐ a generátor ich uprednostní.

### Ešte otvorené (potrebujú backend/externé dáta)
- OCR bločkov, viac-reťazcové živé letáky, komunitné zdieľanie, AI import z videa. Mikroživiny sú doplnené pre bežné potraviny (nie pre všetkých 369).

---

## Verzia 12 — prehľadnejší dizajn (menej tlačidiel)
- **Plán** má teraz len jedno primárne tlačidlo **„✨ Zostaviť jedálniček"** + **„⋯ Viac"** (Zamiešať, Načítať uložený, Uložiť plán, Vyprázdniť, Tlač) — namiesto 8 tlačidiel.
- **Detail receptu** má 3 tlačidlá: Variť · Do plánu · Tlačiť. Odpis surovín zo špajze sa ponúkne **na konci varenia** (nie samostatné tlačidlo).
- **Nákup** — odstránené „Obnoviť"; pole „Mám doma" prepočíta samo. Ostali len Kopírovať + Tlačiť.
- **Nástenka** — rýchle akcie zúžené na „Zostaviť jedálniček" + „Dojedz zvyšky" (ostatné sú v bočnom menu).
- Vedľajšie akcie sú pod rozbaľovacím **„⋯ Viac"** — appka je prehľadnejšia.

---

## Verzia 13 — recept z plánu, plán varenia, kalendár
- **Otvorenie receptu z plánu** — klik na názov jedla v pláne otvorí recept. Zmena jedla je cez **„✎ zmeniť"**, pridanie prílohy cez **„+ doplnok"**.
- **Plán varenia na blok** — v hlavičke bloku je **„🍳 plán varenia (deň večer)"**; otvorí prehľad, čo a na koľko porcií navariť pre celý blok naraz + odkaz na recept.
- **Kalendár histórie** — v Pláne prepínač **📋 Týždeň / 📆 Kalendár**. Kalendár ukazuje po mesiacoch, čo si v ktorý deň uvaril (zapisuje sa po dokončení režimu varenia), s posunom medzi mesiacmi.

---

## Verzia 14 — porcie, stravníci, nedeliteľné, sendviče
- **Recept z plánu = správne porcie** — zrušený mätúci „%" faktor; klik na jedlo v pláne otvorí recept rovno na **počet porcií, ktoré treba navariť** (podľa stravníkov a dĺžky bloku).
- **Stravníci s rôznymi kalóriami** — v Nastaveniach zoznam **Stravníci** (napr. Ja 1450, Žena 1200). Množstvá surovín, cena aj počet porcií sa prepočítajú podľa ich cieľov (každý dostane svoj kalorický príjem z tej istej várky).
- **Nedeliteľné suroviny** — žemľa, rožok, kus, plátok sa zaokrúhľujú na **celé** (0,7 žemle → 1). Gramy/ml ostávajú presné.
- **Raňajky Po–Pi = sendviče/wrapy** — generátor ich cez pracovný týždeň uprednostní (víkend voľnejšie).
- **Plán varenia na blok** ukazuje presné porcie na navarenie pre celý blok.

---

## Verzia 15 — rozvrh varenia (bloky nastaviteľné a zrozumiteľné)

**Rozvrh varenia je teraz vidieť priamo v Pláne**, nie schovaný v podmenu. Nad tabuľkou týždňa je pás,
ktorý vetou hovorí, kedy varíš a na čo:

> 🍳 **Rozvrh varenia · 3 bloky** — Varíš 3× do týždňa: Ne, Ut a Pi večer.
> **A** Varíš v nedeľu večer na pondelok a utorok. · Po–Ut · 2 dni z jednej várky · plán varenia →
> **B** Varíš v utorok večer na stredu, štvrtok a piatok. · St–Pi · 3 dni z jednej várky
> **C** Varíš v piatok večer na sobotu a nedeľu. · So–Ne · 2 dni z jednej várky

Hlavička bloku v tabuľke má okrem rozsahu aj varný deň („🍳 varíš Ne večer").

*(Pás bol na telefóne pôvodne rozpísaný na tri bloky a zaberal 189 px, takže pod ním nebolo
vidieť ani jedno jedlo. Od v25 je na telefóne zbalený na jeden riadok „🍳 Rozvrh varenia ·
3 bloky ✂️ ▾" a bloky rozbalíš šípkou `▾`. Viď verzia 22–25 nižšie.)*

### Ako rozvrh zmeniť
**Plán → „✂️ Upraviť rozvrh"** (alebo ⋯ Viac → „🍳 Rozvrh varenia (bloky)").

**Hotové rozvrhy — jedno ťuknutie:**

| Rozvrh | Varíš | Bloky |
|---|---|---|
| **Ako varím ja** (predvolený) | Ne · Ut · Pi večer | Po–Ut · St–Pi · So–Ne |
| Dvakrát do týždňa | Ne a St večer | Po–St · Št–Ne |
| Týždeň a víkend | Ne a Pi večer | Po–Pi · So–Ne |
| Raz na celý týždeň | Ne večer | Po–Ne |
| Štyrikrát do týždňa | Ne · Ut · Št · So večer | Po–Ut · St–Št · Pi–So · Ne |
| Každý deň zvlášť | každý deň | bez blokov |

**Vlastné rozdelenie:** pod predvoľbami je pás dní `Po · Ut ✂ St · Št · Pi ✂ So · Ne`.
Ťuknutie medzi dva dni prepne, či tam začína nový blok (**✂**) alebo dni patria k sebe (**·**).
Náhľad pod pásom hneď píše celou vetou, čo z toho vyšlo. Vlastný rozvrh si uložíš tlačidlom
**„💾 Uložiť ako môj rozvrh"** a nabudúce ho vyberieš zo zoznamu ako predvoľbu.

### Čo sa stane s už naplneným plánom
**Zmena rozvrhu nič nemaže.** Každý deň si necháva jedlá, ktoré mal.
Ak po zmene niektorý blok obsahuje dni s rôznymi jedlami (varil by si viackrát), dialóg to povie
a ponúkne dve možnosti — **„Zjednotiť bloky podľa prvého dňa"** (skopíruje prvý deň bloku do
ostatných) alebo **„Nechať tak"**. Navyše je tam **„↩︎ Vrátiť pôvodný"**, ktoré vráti rozvrh,
aký bol pri otvorení dialógu.

### Ďalšie zmeny v tejto verzii
- **Generovanie nad naplneným plánom sa pýta.** „✨ Generovať" aj „🎲 Zamiešať" predtým prepísali
  hotový týždeň bez varovania. Teraz sa opýtajú a pripomenú „Uložiť tento plán".
- **Prázdny týždeň v Pláne** hovorí, čo s ním — zostaviť jedálniček, skopírovať minulý týždeň
  alebo načítať uložený.
- **Stravníci sú na Domove**, nie len v Nastaveniach: panel „👥 Pre koho varíš" ukazuje každého
  s jeho kalorickým cieľom a „✎ Upraviť" ich zmení na mieste. Riadok stravníka sa už na 393 px
  nepreteká.
- **Recepty začínajú jedlom, nie kokteilom.** Predvolené radenie posúva 125 nápojov a kokteilov
  na koniec zoznamu (chip „🍸 Kokteil" ich ukáže hneď, nič sa nestratilo).
- **Preskočiť navigáciu** — prvý Tab na stránke ukáže odkaz, ktorý preskočí menu; v Receptoch
  mieri rovno na mriežku. Predtým trvalo 23 stlačení Tab, kým sa dalo prejsť na prvý recept.

---

## Verzia 22–25 — nový vzhľad, tri režimy, snacky z regálu (31. 8. 2026)

### Farba = varný blok
Celá appka dostala nový vzhľad postavený na jednej myšlienke: **každý z troch varných blokov
má svoju farbu** a tá ide cez plán, nákup, Domov aj varenie. V nákupe teda hneď vidíš, na ktorú
várku položka patrí. Ku každej farbe patrí aj **písmeno A / B / C**, takže sa to dá čítať aj
bez farieb (a vytlačiť načierno). Podklad je teplá šeď, tmavý režim sa riadi buď tvojou voľbou,
alebo systémom telefónu.

### Tri režimy hustoty — Plánovanie · Obchod · Kuchyňa
Nový prepínač (v bočnom menu, na telefóne v riadku pod názvom) mení veľkosť písma a tlačidiel
podľa toho, čo práve robíš:

| režim | na čo | ako vyzerá |
|---|---|---|
| **Plánovanie** | v pokoji pri stole | normálna veľkosť, tabuľka celého týždňa, najviac informácií |
| **Obchod** | jedna ruka, košík v druhej | všetko o štvrtinu väčšie, ciele 56 px; na Nákupe zmiznú nadpisy a panely, ktoré pri regáli nepotrebuješ |
| **Kuchyňa** | mastné ruky, telefón opretý | všetko o polovicu väčšie, ciele 64 px |

Voľba sa pamätá. **Kuchyňa nenahrádza režim varenia** — ten sa stále otvára tlačidlom „Variť"
v recepte; Kuchyňa len zväčší všetko okolo.

### Na telefóne vidíš jedlo hneď, bez skrolovania
Predtým bolo nad prvým jedlom v Pláne (a nad prvou položkou v Nákupe) päť až sedem blokov
ovládania, takže si musel pred každým odškrtnutím skrolovať. Teraz je prvé jedlo aj prvá
položka nad prehybom vo všetkých troch režimoch. **Nič sa nezmazalo** — podnadpisy sú na
telefóne skryté, rozvrh varenia je zbalený do jedného riadku (rozbalíš `▾`), riadok
so stravníkmi je v „⋯ Viac", a pole „Pridať vlastnú položku" spolu s panelmi „🏠 Mám doma"
a „🏪 Trasa obchodom" sa presunuli **pod** zoznam. Na počítači sa nezmenilo nič.

### Poradie oddelení v nákupe si prestavíš
V Nákupe → **„🏪 Trasa obchodom"** si vyberieš **Kaufland**, **Lidl** alebo **Vlastné** a šípkami
↑↓ si oddelenia presunieš tak, ako ich obchádzaš vo svojom obchode. Zoznam sa preskupí hneď.
*(Predchádzajúce vydanie tohto návodu tvrdilo, že poradie je pevné — nebola to pravda.)*

### Snacky sú to, čo si naozaj kúpiš
Snack je odteraz **hotový výrobok z regálu**: jogurt, skyr, cottage, syr, šunka, ovocie,
porciové orechy, tyčinka. Nič, čo sa varí, mixuje alebo váži. Jedno balenie alebo kus = jedna
porcia a výživa je uvedená **na balenie**, nie na 100 g. V databáze je 187 takých výrobkov
s reálnymi slovenskými cenami.

Dve veci sa pritom zmenili aj v tom, ako sa snack vyberá:
- **Snack sa losuje na každý deň zvlášť**, nie raz na celý blok. Tri rôzne jogurty sa kupujú
  rovnako ľahko ako tri rovnaké, tak nemá zmysel viazať ich na várku. Za mesiac tak uvidíš
  **33–36 rôznych snackov** namiesto dvanástich.
- **Snack môže byť dvojica** — jablko + hrsť orieškov, jogurt + banán. Samotné jablko má 78 kcal
  a ako desiata je málo; suchý rožok zase nie je desiata. Preto malé alebo výživovo chudobné
  položky dostanú doplnok: k ovociu a pečivu niečo bielkovinové, k jogurtu alebo syru ovocie.
  Obe položky sú plnohodnotné výrobky — majú vlastnú kartu, vlastný riadok v nákupe aj cenu.

Holý chlieb a suchý rožok ako olovrant zmizli sami (tvorili pätinu snackov). Ak ich chceš,
pridáš si ich do plánu ručne.

### Fotky receptov
Fotku má **54 receptov** — zobrazí sa v detaile aj na karte, aj s uvedeným zdrojom. Recept bez
fotky má veľké emoji podľa kategórie a vyzerá dobre, nie je tam prázdne miesto.

### Nákupný zoznam konečne sedí s plánom
Nákup pýtal **2,4× viac jedla, než plán sľuboval** — v obchode to znamenalo napríklad 9 balení
lasagní a 5 kg chleba na týždeň pre dvoch. Príčina bola v dátach: pri 252 receptoch sa
„5 lyžíc oleja" kedysi premenilo na „5 fliaš oleja". Opravených 349 množstiev, dnes je pomer
**1,15×** a týždenný nákup pre dvoch váži ~18 kg namiesto 23,5 kg. Build odteraz sám vypíše
každý recept, ktorý by mal viac než 700 g jedla na porciu, takže sa to nemôže vrátiť ticho.

Vedľajší dôsledok, ktorý treba povedať nahlas: **vláknina a bielkoviny v štatistike klesli**,
lebo predtým ich ťahali vymyslené kilá chleba a kreviet. Dnešné čísla sú pravdivé.

### Rýchlejšie a menšie
`kucharka.html` má **2,5 MB namiesto 5,35 MB** (dáta sa do súboru vkladajú zbalené a appka si
ich rozbalí sama). Prvé načítanie na pomalom pripojení kleslo z ~13,5 s na ~6 s. Druhé a každé
ďalšie otvorenie je okamžité aj bez internetu.

### Tlač
Z papiera zmizli všetky tlačidlá, krížiky a ceruzky, ktoré tam nemali čo robiť — pri zachovaní
obsahu (názvy jedál a kalórie zostali). Plán a „Týždeň" sa tlačia **na šírku**, recept a nákup
na výšku. Zbalená sekcia „🧂 Dochucovadlá a základné veci" sa na čas tlače otvorí, aby jej
14 položiek na papieri nechýbalo. Zaškrtávacie políčka v nákupe zostávajú — odškrtáva sa perom.

### Drobnosti
- **Klávesnica a prístupnosť:** karty receptov aj bunky plánu sa dajú otvoriť Tabom a Enterom,
  po zatvorení okna sa fokus vráti tam, odkiaľ si ho otvoril. Prvý Tab ponúkne „Preskočiť na obsah".
- **Mriežka receptov sa načítava po 60** — appka sa otvorí rýchlo aj s takmer 2000 receptmi.
- **Položka bez ceny to prizná** odznakom „? cena" aj s dôvodom, namiesto tichých 0,00 €.
- **Appku nerozbije poškodené uloženie** — otestovaných 28 druhov poškodenia, vždy sa naštartuje.
- **Expirovaná zásoba v špajzi už nezmenšuje nákup** (predtým skazený losos „ušetril" nákup
  a v deň varenia chýbal).
