# Report — agent NÁKUP-ŠPAJZA (branch `agent3`, 30. 8. 2026)

Commit: `28f0fe1` — *Nákup a špajza: žiadna položka už ticho nestojí 0,00 €*

---

## 1. Ktorých 6 položiek nemalo cenu a prečo

Napísal som `scripts/diagnostika_nakup.js` — pre daný týždeň vypíše každú položku bez
ceny, dôvod aj recept, z ktorého pochádza. Beh: `node scripts/diagnostika_nakup.js 20`
(`--vsetko` = všetky vygenerované týždne + uložené jedálničky, `--recepty` = celá databáza).

Baseline (posledný z 20 vygenerovaných týždňov, seed `20260818`, presne ako `metriky.js`):

| # | položka | dôvod | detail |
|---|---|---|---|
| 1 | **voda** | `CENA_NULA` | `cena100: 0` je **známa** cena (voda z vodovodu je zadarmo). **Nebola to chyba appky, ale chyba merania** — `metriky.js` rátal „bez ceny" cez `!(r.cena > 0)`, čím zlúčil `null` a `0`. Presne to, čo tvrdé podmienky zakazujú. |
| 2 | **Čierne olivy** | `NULA_GRAMOV` → `CHYBA_G_ZA_KS` | „Čierne olivy 18 ks", potravina `olivy` nemá `g_za_ks` → `gramy()` = 0 → cena 0 € **bez varovania** |
| 3 | **Prášok do pečiva** | `NULA_GRAMOV` → `CHYBA_G_ZA_KS` | „Prášok do pečiva 0,22 ks", potravina nemá `g_za_ks` |
| 4 | **Bešamel** | `NENAPAROVANA` | „Croque Monsieur: Bešamel 10,8 PL" — surovina nie je v `potraviny.json` |
| 5 | **Sójová sladká omáčka** | `NENAPAROVANA` | kľúč `sójová omáčka` musí sadnúť na **súvislú** postupnosť slov, „sladká" ju rozdelí |
| 6 | **Zeleninová mexická zmes** | `NENAPAROVANA` | v databáze nie je nič, čo by sedelo |

Rozsah problému v celej databáze (`node scripts/diagnostika_nakup.js 1 --recepty`):
**508 výskytov nenapárovanej suroviny** (400 rôznych názvov) a **492 výskytov `ks` bez
prevodu na gramy** (119 dvojíc kľúč+jednotka) — v 1956 receptoch.

---

## 2. Čo som opravil

### `data/app.js` (len nákup, špajza, ceny, jednotky)

| oprava | čo robí |
|---|---|
| **`dovodBezCeny(G)`** | JEDINÉ miesto, kde sa rozhoduje, či je cena neznáma. Rozlišuje `nenapárovaná surovina` / `cena100: null` / `množstvo sa nedá previesť na gramy`. `cena100: 0` je **známa** cena a nikdy sa nezlúči s `null`. |
| **priznanie v UI** | riadok nákupu má odznak **„? cena"** s dôvodom v `title`, súhrn hlási počet, kopírovaný zoznam pripíše „(cenu nepoznám)". Tichých 0,00 € už niet. |
| **`nakupBalenie(G)`** | „1 ks" balíkovaného tovaru = **1 balenie** → položka bez gramáže dostane cenu. Zámerne to **nie je** v `gramy()`/`gZaJednotku`: tam by „1 ks masla = 250 g" prepísalo výživu receptu a chybné „Maslo 25 ks" by dalo 6 kg a 45 000 kcal. Poistka `NAKUP_MAX_BALENI = 6`: nad ňu (18 olív, 25 „ks" masla) sa kupuje **1** balenie, nie 18. |
| **`zobrazMnozstvo(G)`** | položka bez gramáže už nehlási „0 g", ale to, čo recepty naozaj pýtajú („2 ks", „1,5 na cesto"). |
| **`zasobaPlatna(x)`** | **expirovaná** ani záporná zásoba už nezmenšuje nákup. Predtým skazený losos v chladničke znížil nákup a v deň varenia chýbal. |
| **`odpisRecept(r, porcie, velkost)`** | míňa **viac zásob** tej istej suroviny **FIFO podľa expirácie** (predtým `S.spajza.find` vzal len prvú a zvyšok potreby `Math.max(0,…)` ticho zjedol); mimo detailu receptu škáluje **jeho vlastnými** porciami, nie stavom otvoreného receptu; neprevoditeľnú jednotku ohlási v toaste namiesto tichého preskočenia. |

Tvrdé podmienky splnené: `node --check data/app.js` prejde, `</script>` v `app.js` 0×,
`gZaJednotku` zostal jediným miestom prevodu jednotiek, `cenaTyzdna(mode)` jediná funkcia
na ceny, `cena100: null` ≠ `cena100: 0`, pantry staples (`mnozstvo: null`) idú do nákupu
ako poznámka (kryté testom).

### `scripts/metriky.js`
Metrika „položiek nákupu bez ceny" už neráta cez `!(r.cena > 0)`, ale cez `r.bezCeny`
z appky — merací skript a UI hlásia to isté číslo a vypíšu, ktoré položky to sú.

### `data/potraviny.json` (+ `scripts/doplnit_chybajuce_ceny.py`, idempotentný)
**37 doplnených `balenie_g` / `balenie_popis`** (tuniak 150 g konzerva, fazuľa 400 g,
droždie 42 g kocka, korenie 25 g vrecko, bylinky 20 g zväzok…).

Je to **výživovo neutrálne**: `gZaJednotku` siaha na `balenie_g` len pri doslovnej
jednotke „balenie", ktorú **žiaden** recept nepoužíva (overené — 28 jednotiek v receptoch,
„balenie" medzi nimi nie je). Overené aj empiricky: všetky metriky generátora zostali
presne na baseline.

---

## 3. Property testy na jednotkách

`test_nakup.js` (nová sekcia „Jednotky"):

* **2000 náhodných dvojíc (potravina, jednotka, množstvo)** cez všetky jednotky
  z receptov + `ML_JED` + `KS_DEF` + `KS_JEDNOTKY` + `g/kg/ml/l/balenie`.
  Pre každú, kde `gramy() > 0`, platí `|gramyNaJed(gramy(x)) − x| ≤ max(1e-6, x·1e-9)`.
  **Výsledok: 0 chýb, ~1400 z 2000 prípadov skutočne overených** (zvyšok sú jednotky,
  ktoré sa previesť nedajú).
* Keď `gramy()` vráti 0, test **overí, že to je naozaj preto, že `gZaJednotku` = 0** —
  teda že sa gramáž nestráca inde.
* Neznáma jednotka: `gramy() = 0` **a** `gramyNaJed() = null` (nie tichý odhad).
* Každá jednotka z `KS_DEF` sa počíta cez `gZaJednotku`, nie mimo neho.

**Zaokrúhľovanie nedeliteľných jednotiek:** 3 recepty po 0,7 ks → súčet 4,2 ks →
zobrazí sa **4 ks**, nie 3× zaokrúhlené 1 ks (= 3 ks). Test si sám overí, že súčet nie je
celé číslo a že obe stratégie zaokrúhľovania dávajú iný výsledok, takže sa nedá prejsť
náhodou. Gramáž ani cena sa pritom **nezaokrúhľujú** — cena sedí s presnou gramážou.

---

## 4. Hraničné prípady nájdené v špajzi

| prípad | stav pred | teraz |
|---|---|---|
| **expirovaná položka** | rátala sa ako zásoba a zmenšila nákup | ignoruje sa (`zasobaPlatna`) |
| **záporné množstvo** | `spajzaGramy` ho preskočilo, ale `odpisRecept` ho našiel a „minul" | ignoruje sa všade |
| **zásoba > potreba** | OK | overené testom (žiadna záporná gramáž ani cena) |
| **dve položky tej istej suroviny s rôznou expiráciou** | `spajzaGramy` ich sčítal, ale **`odpisRecept` odpísal len z prvej** a zvyšok potreby zmizol | odpis ide FIFO cez všetky, zvyšok sa prepočíta späť do jednotky receptu |
| **odpis receptu, ktorý nie je v pláne** | škáloval `aktPorcie`/`aktVelkost` z **naposledy otvoreného** receptu | bez parametrov použije vlastné `r.porcie`; volajúci môže zadať `odpisRecept(r, porcie, velkost)` |
| **odpis cez neprevoditeľnú jednotku** | ticho preskočený | zásoba ostane nedotknutá a toast to povie |
| **min. zásoby** | zobrazujú sa v nákupe („Doplniť zásoby") | kryté testom |

---

## 5. Balenia vs. spotreba (30 g droždia z balenia 42 g)

Kryté dvoma testami: recept spotrebuje **30 g** (`cenaSpotreba` = 30 g × cena),
kúpiš **1× 42 g** (`cenaBalenia` = 42 g × cena), riadok ukáže obe („30 g … bal.: 1× 42 g").
Pri 43 g potreby to sú **2 balenia**. Ďalej sa overuje, že
**`cenaBalenia ≥ cenaSpotreba` platí pre každú položku**, nielen pre súčet.

`cenaTyzdna` — tri režimy na reálnych dátach: `balenia ≥ spotreba`,
`osoba = spotreba / počet stravníkov` (na 1e-9), a **súčet cien položiek sedí s cenou
týždňa na cent** (pre spotrebu aj balenia). Diagnostický skript to kontroluje pri každom
týždni a vypíše `⚠`, keby to prestalo platiť — cez 20 vygenerovaných týždňov aj všetkých
5 uložených jedálničkov ani jedno varovanie.

---

## 6. Baseline vs. po

| metrika | baseline | po | poznámka |
|---|---|---|---|
| **položiek nákupu bez ceny** | **6 / 69** | **3 / 69** | a všetky tri sú v UI priznané odznakom „? cena" |
| cena týždňa (Nákup) | 120,94 € | 126,67 € | +5,73 € — položky, ktoré predtým ticho stáli 0 € |
| `test_nakup.js` | 15 kontrol | **43 kontrol** | všetky prechádzajú |
| `test_vypocty.js` | ✅ 31 | ✅ 31 | |
| `test_ux.js` | ✅ 18 | ✅ 18 | |
| `test_prepocty.js` / `test_porcie.js` | ✅ | ✅ | |
| `test_generator.js` | ❌ A2 medián 94,4 g | ❌ A2 medián **94,4 g** | **nezmenené** — žiadne nové zlyhanie |
| priemer kcal/deň | 1436 | 1436 | |
| medián bielkovín/deň | 97,9 g | 97,9 g | |
| dní pod 80 g bielkovín | 12,9 % | 12,9 % | |
| dní v ±10 % cieľa (pred škálovaním) | 58,6 % | 58,6 % | |
| unikátnych receptov / 20 týždňov | 193 | 193 | |

Všetky metriky generátora sú **bit-po-bite rovnaké** ako baseline — moja zmena
sa výživy nedotkla.

---

## 7. Čo zostáva otvorené (a prečo som to neurobil)

Zvyšné **3 položky bez ceny sú nenapárované suroviny** (`Bešamel`,
`Zeleninová mexická zmes`, `Sójová sladká omáčka`). Cena sa pre ne nedá odvodiť —
potrebujú záznam v `potraviny.json`.

**Skúsil som to a zmeral.** Pridanie potravín mení výživu receptov, generátor je na ňu
citlivý a preskladá výber:

| variant | položiek bez ceny | medián bielkovín | dní pod 80 g | dní v ±10 % (pred škálovaním) |
|---|---|---|---|---|
| dnešný stav | **3 / 69** | 97,9 g | **12,9 %** | 58,6 % |
| + 3 chýbajúce potraviny | **0 / 80** | 95,4 g | **34,3 %** | 44,3 % |
| + 89 potravín a `g_za_ks` | 2 / 94 | 92,9 g | 22,9 % | 42,1 % |

Kontrola na iných seedoch (`20260818` / `4242` / `777`, 20 týždňov) ukázala, že ide
o **chaotické preskladanie, nie systémové zhoršenie** — seed 4242 sa nezmenil vôbec,
seed 777 sa dokonca zlepšil. Lenže **seed `20260818` je práve ten, ktorý sleduje
`metriky.js` a `BASELINE.md`**, takže na papieri by to vyzeralo ako zhoršenie
z 12,9 % na 34,3 % dní pod 80 g bielkovín — a to je metrika iného agenta.

Preto som **nepridal ani jednu potravinu**, ale nechal som to pripravené a zmerané:
`scripts/doplnit_chybajuce_ceny.py` obsahuje **86 nenapárovaných surovín** (väčšinou
aliasy existujúcich potravín: `rigatoni` → cestoviny, `karotka` → mrkva, `maizena` → škrob…)
a **kandidátov na `g_za_ks`**. Zapína sa vedome:

```
DOPLN_POTRAVINY=1 python3 scripts/doplnit_chybajuce_ceny.py
node scripts/metriky.js 20        # a premerať generátor
```

Rozhodnutie patrí tomu, kto vlastní generátor / dáta — nie nákupu.
Kým sa neurobí, appka o tých položkách **neklame**: napíše „? cena" aj s dôvodom.

**Ďalšie nálezy pre dátového agenta** (z `diagnostika_nakup.js --recepty`):
* `Maslo 25 ks`, `Múka 24 ks`, `Šunka 12 ks` — chyby v receptoch (má tam byť g)
* 2859 ingrediencií má jednotku „podľa chuti" a 419 prázdnu jednotku
* najčastejšie chýbajúce `g_za_ks`: cukor (33×), smotana (31×), soľ (19×), bujón (15×), maslo (14×)

---

## 8. Súbory

| súbor | zmena |
|---|---|
| `data/app.js` | +122/−26 — `dovodBezCeny`, `nakupBalenie`, `zobrazMnozstvo`, `zasobaPlatna`, `odpisRecept`, priznanie v UI |
| `test_nakup.js` | +284 — 28 nových kontrol (15 → 43) |
| `scripts/diagnostika_nakup.js` | **nový** — prečo položka nemá cenu, s dôvodom a receptom |
| `scripts/doplnit_chybajuce_ceny.py` | **nový** — dátová oprava balení (idempotentná) + pripravený zoznam chýbajúcich potravín |
| `scripts/metriky.js` | metrika „bez ceny" cez `r.bezCeny`, nie cez `!(cena > 0)` |
| `data/potraviny.json` | 37× `balenie_g`/`balenie_popis` (výživovo neutrálne) |
| `test_harness.js` | `NAKUP_MAX_BALENI` do `EXPORT_TAIL` |
