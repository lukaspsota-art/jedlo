# Prompt pre Claude Code — opravy appky Kuchárka

Ako to použiť: otvor terminál v priečinku `Jedlo`, spusti `claude`, a vlož **Etapu 0 + Etapu 1**.
Až keď Etapa 1 prejde a appka sa vygeneruje, pokračuj Etapou 2 atď. Neposielaj všetko naraz —
každá etapa mení výpočty a treba ju overiť samostatne.
Podklad k číslam je v `AUDIT_KUCHARKA_2026-08-18.md` v tom istom priečinku.

---

## Etapa 0 — príprava (vlož raz, spolu s Etapou 1)

```
Pracuješ v projekte „Jedlo“ — offline single-file webová kuchárka. Prečítaj CLAUDE.md a AUDIT_KUCHARKA_2026-08-18.md.

Pravidlá pre celú túto prácu:
1. kucharka.html NIKDY needituj priamo — je to generovaný artefakt. Zdroje sú data/app.js, data/sablona.html,
   data/potraviny.json, recepty/*.json. Po každej zmene spusti: python3 generuj_kucharku.py
2. Po každej zmene app.js spusti: node --check data/app.js && node test_prepocty.js && node test_porcie.js
3. Git: v priečinku je nekompletný .git z cloudu. Najprv: rm -rf .git && git init && git add -A &&
   git commit -m "Initial commit — kuchárka pred auditnými opravami". Potom commituj po každom hotovom bode
   (jeden commit = jeden nález, správa začína ID nálezu, napr. "B2: g_za_ks pre potraviny s jednotkou ks").
4. Postav si testovací harness a nechaj ho v repozitári ako test_harness.js:
   - prečítaj data/app.js, nahraď prvé tri riadky (const RECEPTY/POTRAVINY/JEDALNICKY = __DATA__…) reálnymi dátami
     z recepty/*.json a data/potraviny.json,
   - spusti ho v node:vm s stubmi (document.getElementById → fake element s innerHTML/classList/addEventListener,
     localStorage → objekt v pamäti, MutationObserver, window, speechSynthesis),
   - po načítaní prepíš renderery (renderPlan/renderDash/renderNakup/toast/confirmModal) na no-op,
   - exportuj kontext, aby testy mohli volať vyzivaReceptu, gramy, najdiPotravinu, generujJedalnicek, nakupPolozky…
   Tento harness je predpoklad pre všetky ďalšie etapy — bez neho nemáš ako dokázať, že oprava funguje.
5. Ku každému nálezu, ktorý opravíš, doplň test (test_vypocty.js, test_generator.js) s KONKRÉTNYM číslom
   z auditu ako očakávanou hodnotou. Testy musia padnúť pred opravou a prejsť po nej — over si to.
6. Nemeň naraz viac vecí, než vieš otestovať. Ak nález nevieš opraviť bez zmeny dátového modelu, zastav sa
   a napíš mi návrh namiesto improvizácie.
```

---

## Etapa 1 — pravda o číslach (najvyššia priorita)

```
Etapa 1: oprav výpočty, aby appka počítala zo správnych vstupov. Poradie dodrž.

B2 — „ks“ bez hmotnosti sa počíta ako 60 g (app.js:86).
  - Napíš jednorazový skript (scripts/najdi_ks.py), ktorý vypíše všetky potraviny, ktoré sa v recepty/*.json
    vyskytujú s jednotkou ks/kus/rožok/žemľa a nemajú g_za_ks v data/potraviny.json. Očekávaj ~111 ingrediencií.
  - Doplň g_za_ks realistickými hodnotami (kardamóm 0,3 g, klinček 0,1 g, bobkový list 0,1 g, kuracie stehno 130 g,
    plátok slaniny 25 g atď.). Kde hodnota nemá zmysel (korenie), použi malú reálnu hmotnosť.
  - Potom v gramy() nahraď paušál 60 g návratom 0 g a nastav príznak „nedopočítané“, ktorý sa v UI zobrazí
    ako „≈“ pri kcal (tichých 60 g je horšie ako priznaná neznáma hodnota).
  - Test: chicken-biryani „Kardamómy 4 ks“ ≤ 5 g (dnes 240 g); chicken-adobo kcal/porcia spadne z 760 na ~520.

B3 — g_za_ks prebíja KS_DEF (app.js:83–85).
  - V gramy() testuj KS_DEF[j] PRED g_za_ks a g_za_ks používaj len pre ks/kus.
  - Kde je g_za_ks v skutočnosti hmotnosť plátku/listu (nori, toastový chlieb), pridaj do potraviny.json
    pole g_za_platok a použi ho pre jednotku plátok.
  - Uprav aj gramyNaJed, aby platilo gramyNaJed(gramy(x), x.jednotka, p) === x.mnozstvo (dnes to nesedí:
    1 strúčik → 3 g → 0,6 strúčika). Test na 5 jednotkách: g, ks, strúčik, plátok, list.
  - Test: „Šalát 4 list“ ≤ 60 g (dnes 1200 g); tortilla-wrap-sunka-eidam kcal 463 → ~397.

B1 — párovanie surovín na potraviny.json zlyháva na slovenskom skloňovaní a modifikátoroch (app.js:66–70).
  - Prepíš najdiPotravinu: normalizuj názov aj kluc (malé písmená, bez diakritiky, odrež slovenské koncovky
    ohybných slov — stačí heuristika typu „ého|ého|ovej|ového|ami|ách|och|iek|ov“), porovnávaj na HRANICE SLOV
    (nie ľubovoľný podreťazec — dnes „olej na opekanie“ matchuje „pekan“), a pri rovnakej dĺžke preferuj kľúč,
    ktorý sedí od začiatku názvu.
  - Doplň do potraviny.json chýbajúce presné položky: kokosový olej, kokosové mlieko (aj tvar „kokosového mlieka“),
    maslová tekvica, vanilkový cukor, kondenzované mlieko, paradajkový pretlak, rastlinná smotana
    (kokosová/sójová/ryžová/ovsená — BEZ alergénu mlieko), krabie mäso, ementál, krupica, sušené hríby,
    lístkové cesto, lasagne pláty, bucatini, tzatziki, balzamikový krém.
  - Zo zoznamu ingrediencií odstráň nepotraviny („Špáradlá“).
  - Test: „Kokosového mlieka 400 ml“ → 197 kcal/100 g a ~2,00 € (dnes 660 kcal, 8,00 €);
    „Maslová tekvica 300 g“ ≤ 200 kcal (dnes 2151); „Olej na opekanie“ → olej, nie pekanový orech;
    „Kokosová smotana“ nesmie mať alergén mlieko.
  - Kontrolný skript: vypíš všetky ingrediencie, kde je pred nájdeným kľúčom ďalšie slovo (dnes 459 párov)
    a nechaj ma ten zoznam prejsť.

B5 — 27 potravín bez cena100.
  - Vypíš ich (skript) a doplň realistické ceny € / 100 g pre slovenský Kaufland/Lidl 2026.
  - Vo vyzivaReceptu a nakupPolozky veď príznak „cena nekompletná“ a v súhrne píš „~ 86 € (3 položky bez ceny)“
    namiesto podhodnoteného čísla.
  - Test: v týždennom pláne 2 stravníkov nesmie byť žiadna položka nákupu s cenou 0,00 €.

B6 — vláknina a sodík chýbajú u 67 % potravín a počítajú sa ako 0.
  - Doplň vlaknina a sodik pre všetky potraviny v oddeleniach Omáčky a dochucovadlá, Mäso a ryby,
    Trvanlivé a konzervy, Pečivo, Mliečne a vajcia (sójová omáčka ~5500 mg Na/100 g, kečup, horčica, saláma, vývar…).
  - Vo vyzivaReceptu počítaj „pokrytie“ = podiel hmoty dňa so známou hodnotou. Ak je pod 70 %,
    dlaždica vo Výžive ukáže „≥ 9 g (66 % surovín má dáta)“ a NEsvieti zeleno pri sodíku.
  - Test: týždeň so sójovou omáčkou musí ukázať sodík > 2000 mg/deň (dnes 1274 mg).

B4 — záchranná brzda na kcal (app.js:110–116) sa spúšťa až pri 1,6× rozdiele.
  - Zmeň na: ak recept má kcal_na_porciu, ver mu VŽDY (kcal ber z JSON) a výpočet zo surovín použi len na makrá
    a cenu, prepočítané rovnakým faktorom. Vlákninu a sodík faktorom NEprepočítavaj.
  - Recept, kde sa výpočet a JSON líšia >10 %, označ v detaile „≈ odhad“.
  - Test: beef-rendang zobrazí 600 kcal (dnes 941), kuracie-nugetky 397 (dnes 633),
    a recept bez kcal_na_porciu sa nesmie zmeniť.

Na konci etapy: python3 generuj_kucharku.py, otvor appku, over Domov/Výživa/Nákup a napíš mi
tabuľku „pred / po“ pre: priemer kcal/deň, priemer bielkovín/deň, sodík/deň, cena týždňa.
```

---

## Etapa 2 — generátor jedálničkov

```
Etapa 2: generátor. Cieľ: prestať naťahovať porcie a začať vyberať vhodné jedlá. Meraj na 30+ vygenerovaných
týždňoch cez test_generator.js (harness z Etapy 0, deterministický seed namiesto Math.random).

A1 — cieľ 1450 kcal sa dnes dosahuje faktorom 0,55–1,95× (rescaleDen, app.js:504–508, 792).
  - Zaveď kcal-okná na slot: podiely dňa Raňajky 25 %, Obed 35 %, Večera 30 %, Snack 10 %
    (a Desiata/Olovrant 10 %). Pri výbere z poolu preferuj recepty v pásme 0,6–1,45× cieľa slotu;
    ak by pool spadol pod ~8 receptov, pásmo rozšír (nikdy nenechaj prázdny pool).
  - Faktor v rescaleDen zovri na 0,85–1,15. Ak sa deň nevmestí, prehoď (re-roll) slot s najväčšou odchýlkou
    od cieľa slotu — nenaťahuj porciu.
  - Akceptačné kritérium: podiel dní, ktoré potrebujú korekciu >15 %, spadne z 51 % pod 15 %;
    žiadne jedlo s faktorom >150 %; dní v ±10 % cieľa aspoň 90 %.

A2 — bielkoviny generátor ignoruje (vahaReceptu, app.js:747; S.profil.biel default 0).
  - Z bielkovín urob multiplikátor váhy, nie prirážku: w *= 0,4 + min(1,6; (g bielkovín na 100 kcal)/10).
    (HS_HI=10 už v kóde je.)
  - Za naplnenie dňa pridaj repair krok: ak deň nemá aspoň 80 % cieľa bielkovín, prehoď slot s najnižším
    podielom bielkovín na 100 kcal.
  - Akceptačné kritérium: medián bielkovín z 30 týždňov stúpne zo 66,5 g na ≥ 95 g/deň pri cieli 1450 kcal,
    a podiel dní pod 80 g spadne z 85 % pod 20 %.

A3 — poradie obed > večera > raňajky > snack platí len v 38 % dní; večera býva 28–250 kcal.
  - Pre sloty, kde jeHlavnyChodSlot(slot), odfiltruj recepty pod 300 kcal/porcia (pool 564 → 429, stačí).
  - potrebujePrilohu (app.js:502) uprav tak, aby prílohu dostala aj Polievka a Šalát
    (Polievka → prf:pecivo, Šalát → bielkovinový komponent).
  - Po naplnení dňa vynúť celé poradie kcal, nie len swap Obed/Večera — ale prehadzuj len medzi slotmi,
    ktoré danú kategóriu pripúšťajú, inak re-roll.
  - Akceptačné kritérium: celé poradie dodržané v ≥ 85 % dní; 0 dní s večerou pod 250 kcal.

A4 — 2× sacharid (maCarb, app.js:501): pizza + ryža, lasagne + ryža, penne + zemiaky.
  - maCarb nech skenuje aj názov receptu a pozná tvary cestovín a pečiva
    (penne, rigatoni, fusilli, farfalle, orzo, tagliatelle, bucatini, lasagne, gnocchi, pizza, taco, burrito,
    wrap, burger, sendvič, panini, toast, pita, placka, kaša, krupica, polenta, ovsené, granola, batat,
    hladká múka + droždie).
  - potrebujePrilohu nech vylúči kategóriu „Cestoviny“ paušálne.
  - Akceptačné kritérium: 0 z 360 hlavných chodov nedostane sacharidovú prílohu k sacharidovému jedlu
    (dnes 35).

A5 — snacky: filter „kupované“ (app.js:783) zúži pool z 351 na 36 receptov.
  - Zmeň tvrdý filter na váhu (w *= 2 pre tag „kupované“) a doplň kcal-okno pre snack.
  - Akceptačné kritérium: 30 týždňov použije ≥ 80 unikátnych snackov (dnes 35), žiadny snack viac ako 6×.

A6 — žiadna pamäť medzi týždňami (nedavne, app.js:764).
  - Do nedavne pridaj recepty z plánu predchádzajúceho týždňa a z S.archiv[0].
  - Akceptačné kritérium: v 30 sekvenčných týždňoch sa nezopakuje recept medzi susednými týždňami
    (dnes 11 z 29 párov).

A7 — ranajkyBaza (app.js:729) pri nesendvičových raňajkách vracia unikát, takže dedup nič nerobí.
  - Rozšír na skutočné triedy: ovsená kaša, jogurt/skyr, vajcia, palacinky, smoothie, nátierka, sendvič-báza.

Na konci etapy: vygeneruj 30 týždňov a ukáž mi tabuľku dodržania pravidiel z CLAUDE.md
(rovnaké riadky ako v kapitole 3 auditu) — pred a po.
```

---

## Etapa 3 — nákup a špajza

```
Etapa 3: nákupný zoznam a špajza. Testy do test_nakup.js.

C1 — v nákupe sa všetko okrem g/ml hlási ako „ks“ (nakupPolozky, app.js:898).
  - rodina sa musí určovať z tabuliek: ML_JED → „ml“, KS_DEF/ks → počítateľná jednotka, inak „g“.
  - zobrazMnozstvo nech vypisuje pôvodnú počítateľnú jednotku (strúčik, plátok, list), nie univerzálne „ks“.
  - Zlučovací kľúč nesmie byť len p.kluc, keď sa mieša korenina a zelenina (mleté čili vs čili papričky,
    mletá paprika vs paprika).
  - Test: 22 strúčikov cesnaku sa v nákupe zobrazí ako „~66 g (1 hlávka)“ alebo „22 strúčikov“, nie „22 ks“;
    „Údená paprika 1,33 ČL“ skončí v oddelení Korenie a bylinky s ~7 g.

C2 — cena vždy počíta celé balenia, aj keď sú balenia vypnuté (nakupCena, app.js:921).
  - nakupCena nech použije balenie len keď S.profil.balenia !== false.
  - V súhrne nákupu ukáž dve čísla: „spotrebované ~62 €“ a „vrátane celých balení ~87 €“.
  - Zjednoť ceny do jednej funkcie cenaTyzdna(mode) — dnes hlásia Výživa 31 €, Domov 62 €, Nákup 87 €
    pre ten istý týždeň. Dlaždica vo Výžive musí mať v štítku „na osobu“.

C3, C4 — špajza je binárna a vyhadzuje položky z nákupu aj z exportu (mamVSpajzi app.js:924, nakupText app.js:994).
  - Od potrebných gramov odpočítaj skutočné množstvo zo špajze (prepočítané cez gramy), zvyšok nechaj v nákupe.
  - Do „mám v špajzi“ presuň položku iba ak zásoba pokryje celú potrebu.
  - Do kopírovaného/zdieľaného zoznamu zaraď aj položky zo špajze (s poznámkou „mám doma“), nech v obchode nechýbajú.
  - Test: 20 g lososa v špajzi pri potrebe 600 g → v nákupe zostane 580 g (dnes položka zmizne a súčet spadne o 27 €).

C5 — „Mám doma“: krátky token vyprázdni nákup (jeDoma, app.js:919).
  - Ignoruj tokeny kratšie ako 3 znaky a porovnávaj na hranice slov.
  - Test: token „a“ neoznačí ani jednu položku (dnes 39 zo 48, a nedajú sa odškrtnúť).

C6 — odpis zo špajze (odpisRecept, gramyNaJed app.js:95–97).
  - Po oprave B3 over round-trip; doplň jednotku „balenie“ (cez p.balenie_g) alebo ju prestaň nabízať
    ako jednotku zásoby — dnes sa taká zásoba nikdy neodpíše a toast tvrdí „nenašla sa zhoda“.

C7 — zjednoť oddelenia: „Ryby a morské plody“ (2 položky) presuň do „Mäso a ryby“;
  do poradia oddelení doplň všetky hodnoty, ktoré sa v potraviny.json reálne vyskytujú.
```

---

## Etapa 4 — UX, mobil, robustnosť

```
Etapa 4: výkon a použiteľnosť.

D1 — hľadanie prekresľuje 1336 kariet po každom znaku (app.js:1275).
  - Debounce 200 ms, naviaž len „input“ (dnes je aj „change“ → pri select beží render 2×),
    memoizuj vyzivaReceptu / healthScore / diety podľa r.id (cache v Map, invaliduj pri zmene vlastných receptov).
  - Akceptačné kritérium: napísanie 4 znakov do hľadania pod 1,5 s (dnes 8,2 s v Chromiu na desktope).

D2 — pole „Mám doma“ ukladá stav a spúšťa sync po každom znaku (sablona.html:420 oninput="renderNakup()").
  - Ukladaj na change alebo s debounce 400 ms.

B7 — dni „preč“ (dovolenka) nešetria nič a vedia vyprázdniť celý blok.
  - porcieSlotBlok (app.js:538): do filtra pridaj && slotyDna(d).includes(slot).
  - Generátor (app.js:772): masku slotov počítaj per deň, nie z prvého dňa bloku
    (dnes stačí mať preč prvý deň bloku a celý blok zostane bez jedla).
  - Test: blok Po–Ut s „preč“ v utorok → 2 porcie a nižšia cena nákupu (dnes 4 porcie a rovnaká cena).

B8 — prah baseDayKcal < 200 (pocetPorcii, app.js:512): 175 kcal → 1 porcia, 222 kcal → 7 porcií.
  - Dorovnávanie na cieľ viaž na explicitný prepínač, nie na magickú hranicu, a strop obmedz
    (max 2× počet stravníkov). Nekompletne naplánovaný deň nedorovnávaj.

B9 — ručný počet ľudí × % veľkosti porcie (pocetPorciiDna, app.js:520–528).
  - Deleniť pf konzistentne vo všetkých vetvách (dnes: dayPpl=4 a pf=0,8 → navarí 3,2 porcie pre 4 ľudí).

D3 — tabuľka plánu má 1731 px, obsah je limitovaný na 998 px → 3 zo 7 dní treba doscrollovať aj na 1440 px.
  - Na desktope nechaj plán využiť celú šírku okna (alebo pridaj prepínač dní ako na mobile,
    prípadne kompaktný režim „len názvy“).

D4 — Escape nezatvorí režim varenia (app.js:444) → doplň zavriCook().
D5 — zavri()/zavriPick() nerobia history.back() → v PWA treba prvý „Späť“ nadarmo (app.js:451).
D6 — 41 zo 41 inputov nemá <label for> a 2 tlačidlá sú bez textu aj aria-label → doplň.
D7 — skopirujMinuly berie a[a.length-1], kým archív je unshift → má byť a[0] (app.js:712).
D8 — hodnot() a toggleSkryt() volajú otvor(id) bez ctx → detail stratí kontext plánu (272 g → 320 g).
     Pamätaj si posledný ctx v globále a podaj ho späť.
D9 — naplnKuchyne() sa volá len pri starte → nová kuchyňa z vlastného receptu sa objaví až po reloade.
D10 — komparátor s Math.random() (app.js:1084) → najprv zoraď podľa hodnotenia, potom premiešaj vrchnú skupinu.
D11 — vyčisti mŕtvy kód (otvorGenConfig, novyIngRows, dnesId, planMode) a rozhodni o S.voda:
      vodný tracker sa ukladá, ale nikde sa nečíta — buď ho vráť do UI, alebo odstráň.

Nakoniec: aktualizuj CHANGELOG.md (končí na v17, hoci v kóde sú účty a skupinová synchronizácia, onboarding
sprievodca, generátor-wizard s dňami „preč“, per-deň počty osôb, kolekcie) a CLAUDE.md
(tvrdí app.js ~70 KB — reálne 166 KB; tvrdí, že percentuálny faktor bol v v14 zrušený — v skutočnosti
sa vrátil ako rescaleDen/S.planF a je hlavným mechanizmom trafenia cieľa).
```

---

## Etapa 5 — voliteľné, keď bude čas

```
Voliteľné vylepšenia (nie chyby):
- Fotky receptov: pole foto nemá nastavené ani jeden z 1336 receptov, recepty/fotky/ je prázdny.
  Navrhni, ako to naplniť (vlastné fotky pri varení cez režim varenia? generovanie ilustrácií?),
  alebo z UI odstráň emoji placeholder a rieš to inak.
- 663 receptov (49,6 %) nemá kcal_na_porciu — po Etape 1 dopočítaj a zapíš do JSON tie,
  kde je párovanie surovín 100 % (bude ich väčšina), aby existovala kontrola voči výpočtu.
- 60 receptov bez kuchyna (rozbíja striedanie kuchýň), 50 receptov s postupom kratším ako 2 kroky,
  duplicitné názvy Cacio e Pepe a Zemiaková kaša — dočisti.
- Rozdeliť app.js (166 KB, 1536 riadkov) na moduly a spájať ich v generátore.
```
