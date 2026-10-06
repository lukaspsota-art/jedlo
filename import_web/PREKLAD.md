# Preklad receptov z webu → staging (pravidlá pre dávku 10 receptov)

Vstup: riadky `import_web/raw.jsonl` (anglické fakty + predloha postupu).
Výstup: pripíš **jeden JSON na riadok** do `import_web/staging.jsonl` (append, nikdy neprepisuj
existujúce riadky). Preskoč URL, ktorá už v stagingu je (`_url`). Recepty nevypisuj do chatu.

## Formát riadku
```json
{"_url":"<raw.url>","_web":"<raw.web>","_kat":"<raw.kat>","_kcal_web":<raw.kcal_web|null>,"_flags":[],
 "id":"slug-zo-sk-nazvu","nazov":"…","kategoria":"…","kuchyna":"…",
 "zdroj":"BBC Good Food – <raw.nazov_en>","zdroj_url":"<raw.url>","porcie":4,"cas":"45 min",
 "kcal_na_porciu":0,"kcal_zdroj":"vypocet","popis":"…","hlavna_surovina":"…","narocnost":"ľahká|stredná|náročná",
 "ingrediencie":[{"nazov":"…","mnozstvo":250,"jednotka":"g","poznamka":"…"}],
 "postup":["…"],"tipy":"","foto":"","tagy":["…"]}
```
- `zdroj`: `BBC Good Food – …` alebo `Natasha's Kitchen – …` + pôvodný anglický názov.
- `id`: malé písmená bez diakritiky, pomlčky (`kuracie-kari-s-kokosom`).
- `kategoria` podľa `_kat`: ranajky→Raňajky · polievky→Polievka · maso/bezmaso→Hlavné jedlo
  (cestoviny → Cestoviny) · prilohy→Príloha · salaty→Šalát · dezerty→Dezert · pecenie→Pečivo.
- `cas`: `raw.min` → `"45 min"`, `"1 hod"`, `"1 hod 20 min"`. Keď je 0, odhadni podľa krokov
  a pridaj príznak.
- `porcie`: `raw.porcie` (pri koláči/chlebe počet kúskov/plátkov). Chýba → príznak.
- `tagy`: 2–5 malými písmenami, napr. `hlavné jedlo`, `kuracie`/`bravčové`/`hovädzie`/`ryba`,
  `bezmäsité` (**povinné** pri `_kat` bezmaso), `polievka`, `šalát`, `príloha`, `dezert`,
  `pečivo`, `raňajky`, `rýchle` (≤ 30 min), `vegánske`.
- `kuchyna`: prídavné meno (`Britská`, `Americká`, `Talianska`, `Indická`, `Mexická`…).

## Ingrediencie
- **Množstvo a jednotku ber z `raw.ing[].q` a `raw.ing[].u`** — skript ich už previedol
  (cup/oz/lb → g/ml, tbsp → PL, tsp → ČL). Nič neprepočítavaj znova. Výnimka: keď `orig`
  uvádza aj hmotnosť („4 cups 1 lb cherries“, „3 cups or about 2 lbs“), použi hmotnosť
  (1 lb = 454 g, 1 oz = 28 g). Rozsah („2-3 cups“) → skript vzal dolnú hranicu, to stačí.
- Kde má raw `flag`, alebo `u` je `šálka`/`null` pri surovine, ktorá množstvo potrebuje,
  **nehádaj**: nechaj pôvodné množstvo s jednotkou, ktorú vieš obhájiť, a pridaj do `_flags`
  text `neistý prevod: <orig>`.
- Povolené jednotky: `g ml ks PL ČL štipka strúčik plátok hrsť zväzok vetvička list kg l dl
  šálka hrnček hlávka`. Bez množstva: `"mnozstvo":null,"jednotka":"podľa chuti"`.
- `nazov` = slovenský názov suroviny, ktorý sa spáruje s `data/potraviny.json`
  (napr. `Kuracie prsia`, `Hladká múka`, `Smotana na šľahanie 33 %`, `Maslo`, `Cibuľa`).
  Poznámky (nakrájaná, mäkká, na ozdobu) patria do `poznamka`, nie do názvu.
  Americké suroviny nahraď slovenskými: heavy cream → Smotana na šľahanie 33 %,
  all-purpose flour → Hladká múka, ground beef → Mleté hovädzie mäso, scallions → Jarná cibuľka,
  cilantro → Koriandrová vňať, zucchini/courgette → Cuketa, eggplant/aubergine → Baklažán,
  baking soda / bicarbonate → Jedlá sóda, broth/stock → Vývar, buttermilk → Cmar,
  half-and-half → Smotana na varenie 12 %, confectioners'/icing sugar → Práškový cukor.
- Soľ a korenie bez množstva: `Soľ` / `Čierne korenie`, `null`, `podľa chuti`.

## Postup (autorský text sa NEKOPÍRUJE)
- Napíš **vlastnými slovami**, stručne, 3–8 krokov, **rozkazovací spôsob 2. os. j. č.**
  („Nakrájaj…“, „Rozohrej…“, „Peč…“). Nie doslovný preklad vety po vete — zlúč a skráť.
- Len °C (skript už pridal `(= … °C)` k °F), cm namiesto palcov, žiadne cups/oz/tbsp.
  BBC „200C/180C fan/gas 6“ → „Rúru predhrej na 200 °C (s ventilátorom 180 °C).“
- `popis`: jedna vlastná veta o jedle (nie autorov úvod). `tipy`: `""`.

## Po zapísaní dávky
`node scripts/import_web.js --check --posledne 10` — oprav každé ✗ (chyba) v SVOJICH riadkoch
(prepíš len ne). ⚑ `nenapárované: X` skús vyriešiť iným slovenským názvom, ktorý je
v `potraviny.json` — všetky kľúče sú po jednom na riadok v `import_web/_kluce.txt`
(`grep -i "<kmeň>" import_web/_kluce.txt`); čo sa nedá, nechaj ⚑.

## Knihy (EPUB → `import_knihy/epub/<kod>_raw.jsonl`, scripts/zber_epub.py)
Rovnaké pravidlá ako vyššie, s týmito rozdielmi. Výstup: `import_knihy/epub/<kod>_staging.jsonl`.
- Pracovné polia: `"_url":<raw.url>,"_web":<raw.web>,"_kniha":<raw.kniha>,"_vydavatel":<raw.vydavatel>,
  "_foto":<raw.foto>,"_flags":[]` — **bez `_kat`, `_kcal_web` a bez `zdroj_url`** (kniha odkaz nemá).
- `zdroj`: `"<raw.kniha> – <raw.nazov_en>"` (pomlčka „–“ s medzerami, anglický názov presne z raw).
- `kategoria`: z appky — Raňajky, Hlavné jedlo, Cestoviny, Polievka, Šalát, Nátierka,
  Príloha, Pečivo, Dezert, Kokteil (s alkoholom), Nápoj (bez alkoholu). Rozhoduje jedlo,
  nie kapitola knihy (`raw.kategoria_web` je len nápoveda). Omáčka, dresing, korenie → Príloha.
  **Nikdy `Snack`** — tá kategória je len pre kúpené výrobky (`typ: "vyrobok"`); predjedlo,
  finger food, chuťovky → Príloha.
- `nazov`: **herný názov z knihy + pomlčka + slovensky, čo je to za jedlo**, keď je anglický názov
  hravý/herný: „Moa Wings – pikantné vyprážané kuracie krídla v cmare“, „Dragon’s Breath – cesnakový
  dresing…“. Herný názov ostáva po anglicky so správnymi veľkými písmenami (of/and/the malé,
  apostrof ’, úvodzovky „…“); slovenská časť začína malým písmenom. Keď anglický názov len opisuje
  jedlo (Sushi, Churros, Hot Chocolate, Baked Potato Bites), je `nazov` iba slovenský. Musí sa
  líšiť od názvov v DB (check hlási duplicitu).
- `popis`: jedna vlastná veta o jedle; herný kontext smie byť v polovici vety. `tipy`: `""`.
- `porcie`/`cas`: z `raw.porcie`/`raw.min`; keď je 0, vyčítaj z `raw.meta` (YIELD, PREP/COOK TIME).
  Výťažok v kusoch (16 brownies, 12 tamales) = porcie. „1 loaf“, „One 2-layer cake“ → odhadni
  plátky/kúsky a pridaj príznak. Kokteil/nápoj na 1 pohár = 1 porcia.
- `tagy`: navyše vždy `herná kuchárka`; bezmäsité jedlo → `bezmäsité` (diéty appka ráta zo surovín).
- Ingrediencie: `raw.ing[].skupina` (časť receptu, napr. „MUD BLOCKS“) daj preložené do `poznamka`
  („na tmavú vrstvu“). Polotovar z iného receptu knihy („1 recipe Redstone Dust Rub“) → názov
  slovensky, `mnozstvo` 1, `jednotka` `ks`, príznak `odkaz na iný recept`.
  Lieh: `Rum`, `Vodka`, `Gin`, `Whisky`, `Tequila`, `Víno` … (pozri `_kluce.txt`); oz/shot → ml
  (1 oz = 30 ml, 1 shot = 45 ml, dash = 1 ml).
- Postup: herné vtipy vynechaj, jedlo musí byť podľa krokov uvariteľné.
- **Párovanie over**: `node scripts/import_web.js --staging <súbor> --check --parovanie` vypíše
  `surovina → kľúč kcal/100 g`. Prídavné meno príchute môže skĺznuť na inú potravinu
  („Čokoládová zmrzlina → čokoládov 570“, „Kokosová voda → kokos 660“): vtedy píš základ
  („Zmrzlina“) a príchuť daj do `poznamka`. Hotová omáčka/polotovar ≠ jej hlavná surovina.
- **Dezert, Nápoj a Kokteil nesmú mať mäso medzi surovinami** (test_pravidla) — mäsová ozdoba
  (jerky v bloody mary, slanina na dezerte) ide len do postupu: „kniha pridáva aj prúžok jerky“.
