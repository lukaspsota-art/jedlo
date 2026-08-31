# Inšpiračný report — aplikácie na plánovanie jedál, recepty a nákupné zoznamy

Prieskum **25** populárnych aplikácií a čo si z nich vziať pre našu osobnú webovú kuchárku (offline HTML appka pre Lukáša). Prvá vlna (appky 1–12) je z 16. 7. 2026, druhá (13–25) pribudla neskôr — preto je odporúčaná časť rozdelená na dve.

**Kontext appky:** recepty s kalóriami/makrami a cenami, týždenný blokový plánovač (meal-prep, bloky A/B/C), automatický generátor jedálnička, nákupný zoznam po oddeleniach + export do Listonic, kategórie jedál, sezónnosť, akcie (Kaufland leták), profil domácnosti, tmavý režim, PWA/offline, voliteľná synchronizácia, nákup ráta balenia, jedlo = hlavný chod + príloha.

Dátum: 2026-07-16

---

## Ako čítať tento report

Pri každej appke je stručný profil (čo robí dobre, unikáty, plán, nákup, škálovanie, výživa) a 1–3 konkrétne nápady pre nás. Na konci je sekcia **TOP odporúčania** zoradená podľa dopadu s poznámkou o realizovateľnosti v offline HTML appke (áno / čiastočne / treba backend).

---

## 1. Mealime

**Čo robí dobre:** rýchle poskladanie týždňa z kurátorovaných receptov s minimom rozhodovania a dôrazom na obmedzenie plytvania jedlom.

**Unikáty:**
- "Grocery intelligence" — recepty sú navrhnuté tak, aby zdieľali ingrediencie a znižovali odpad; indikátor Food Waste vizuálne ukazuje, ako efektívny je plán.
- Hands-free cooking mode — krok posunieš mávnutím ruky nad obrazovkou, obrazovka sa nevypína.
- Silná personalizácia: 8 diét, vylúčenie 12 alergénov, odstránenie 124 neobľúbených ingrediencií.

**Plán:** týždeň dopredu alebo "just-in-time" deň po dni; kombinácia manuálu a auto-generátora. Uvarené jedlo sa označí (fade-out efekt ako motivácia).
**Nákup:** agregácia + triedenie podľa oddelení predajne; pri položke vidno, do ktorého receptu patrí, aké množstvo/veľkosť kúpiť a ako ingrediencia vyzerá.
**Škálovanie:** áno, per recept. **Výživa:** makrá/mikro sú Pro funkcia; kalorické a makro filtre "viac než / menej než"; po uvarení pošle hodnoty do Apple Health.
**Cena:** free + Pro 2,99 $/mes.

**Nápady pre nás:**
1. **Indikátor zdieľania ingrediencií / plytvania** — pri generovaní bloku zvýhodniť recepty, ktoré zdieľajú suroviny, a ukázať skóre "koľko surovín sa využije naprieč týždňom". Sedí na náš blokový meal-prep.
2. **Vizuálny detail pri nákupnej položke** — do ktorých jedál ingrediencia ide (už čiastočne máme cez oddelenia; pridať väzbu položka → recepty).
3. **Označovanie "uvarené / spotrebované"** v pláne s vizuálnym stavom.

## 2. Paprika Recipe Manager

**Čo robí dobre:** organizér vlastných receptov — uložíš recept z webu, máš ho navždy, robíš z neho plán aj nákup.

**Unikáty:**
- Web import cez vstavaný prehliadač (parsuje ingrediencie/postup).
- Interaktívne varenie: odškrtávanie ingrediencií, zvýraznenie aktuálneho kroku, **automatická detekcia časovačov v postupe** (ťuknutím spustíš), pin viacerých receptov naraz.
- Konverzia metrické ↔ imperiálne jednotky.
- **Pantry (špajza)** — označíš, čo máš doma, aby si to nekúpil duplicitne.

**Plán:** deň/týždeň/mesiac; **reusable menus** (šablóny obľúbených jedál použiteľné opakovane). Bez AI generátora.
**Nákup:** triedenie podľa oddelení (prispôsobiteľné), agregácia (1 vajce + 2 vajcia = 3), viac zoznamov.
**Škálovanie:** áno, automatické. **Výživa:** slabé — len voľné textové pole.
**Cena:** jednorazovo ~30 $/platforma; free do 50 receptov bez syncu.

**Nápady pre nás:**
1. **Automatická detekcia časovačov v postupe** — regexom nájsť "20 min", "10 minút" a spraviť z nich klikateľný časovač počas varenia. Ľahké v HTML.
2. **Reusable menus / šablóny týždňa** — uložiť poskladaný blokový plán ako šablónu na opätovné použitie.
3. **Pantry / špajza** — evidencia zásob, ktorá znižuje nákupný zoznam. Nadväzuje na "čo mám doma".

## 3. Eat This Much

**Čo robí dobre:** plne automatický generátor jedálnička podľa kalorických/makro cieľov.

**Unikáty:**
- Algoritmický generátor: zadáš kalórie + makrá + filtre → poskladá deň/týždeň.
- **Rôzne nutričné ciele pre každý deň v týždni** (ideálne na carb-cycling).
- Endless regeneration — jedným klikom nahradíš jedlo iným.
- **Automatic leftovers** — zvyšky sa automaticky zarátajú do ďalších jedál.
- Recurring foods — obľúbené jedlá "na opakovanie".

**Plán:** free = jeden deň; Premium = celý týždeň s per-deň úpravou.
**Nákup:** auto zoznam (Premium), donáškové integrácie, PDF export.
**Škálovanie:** áno — jedlá sa škálujú, aby sedeli na kalorický/makro target.
**Výživa:** jadro produktu — presné kalórie a makrá, per-deň ciele, tracking.
**Cena:** free (denné plány) + Premium 5 $/mes.

**Nápady pre nás:**
1. **Per-deň (alebo per-blok) makro ciele v generátore** — náš generátor by mohol mať rôzne targety pre bloky A/B/C alebo tréningový vs. voľný deň.
2. **Automatický výpočet leftovers** — keď navaríme väčšiu dávku (meal-prep), generátor ju sám rozpočíta do viacerých dní. Priamo pasuje na blokový systém.
3. **Endless regeneration** — tlačidlo "vymeň toto jedlo" bez preskladania celého plánu.

## 4. Plan to Eat

**Čo robí dobre:** plánovanie okolo vlastných receptov + automatický nákupný zoznam z kalendára.

**Unikáty:**
- **Freezer modul** — evidencia navarených/zmrazených jedál (množstvo + dátum prípravy). Samostatný nástroj na batch cooking.
- Menus — uloženie a znovupoužitie celých týždňových plánov.
- **Staples list** — často kupované položky jedným klikom.
- Poznámky priamo v kalendári.

**Plán:** kalendár, priraďovanie receptov na dátum + typ jedla, presúvanie, výmena celých týždňov.
**Nákup:** auto z kalendára; **vlastné poradie/úprava oddelení**, samostatné zoznamy pre konkrétne obchody, agregácia.
**Škálovanie:** áno, aj desatinné (napr. 1,5×). **Výživa:** modul so súčtami makier v pláne.
**Cena:** platený SaaS, 5,95 $/mes alebo 49 $/rok.

**Nápady pre nás:**
1. **Freezer / mraznička modul** — čo je navarené a zamrazené, s dátumom a počtom porcií. Perfektne dopĺňa náš meal-prep; generátor môže "siahnuť do mrazáku" namiesto nového varenia.
2. **Staples list** — trvalé položky (soľ, olej, káva), ktoré appka ponúkne pridať bez väzby na recept.
3. **Desatinné škálovanie** porcií.

## 5. Samsung Food (predtým Whisk)

**Čo robí dobre:** veľká komunitná databáza (240 000+ receptov) + AI personalizácia + online nákup, všetko v jednom.

**Unikáty:**
- AI-generované personalizované týždenné jedálničky podľa zdravotných cieľov.
- **Health Score** a nutričný rozklad pre 180 000+ receptov (dáta z Open Food Facts).
- Communities — zdieľané/súkromné komunity a kolaboratívne plány.
- Plánovaná Vision AI (odhad kalórií z fotky jedla).

**Plán:** týždenný/denný, drag & drop medzi dňami, filtre (diéty, alergény, denný kalorický cieľ), kolaborácia s rodinou.
**Nákup:** smart list z receptu/plánu, agregácia, e-commerce checkout z 23 reťazcov, kategorizácia.
**Škálovanie:** áno (Recipe Converter). **Výživa:** silná — kalórie/makrá, denné súčty, Health Score podľa WHO/USDA.
**Cena:** základ zdarma; Food+ 6,99 $/mes (AI plány, ciele).

**Nápady pre nás:**
1. **Health Score / jednoduché skóre jedla** — farebné hodnotenie receptu (napr. pomer bielkovín ku kalóriám, podiel spracovaných surovín). Rýchla vizuálna orientácia. Dá sa počítať lokálne z našich dát.
2. **Drag & drop** presúvanie jedál medzi dňami/blokmi v plánovači.

## 6. Mealie (open-source, self-hosted)

**Čo robí dobre:** self-hosted správca receptov + plán + nákup s REST API. Používateľ vlastní dáta.

**Unikáty:**
- Import z URL, **z obrázka (OCR+AI)** aj **z video URL** (prepis na recept).
- ML parser ingrediencií (množstvo / jednotka / potravina) — základ pre škálovanie a konsolidáciu.
- **Planner Rules** — pravidlá pre náhodný výber receptov (obmedzenie fondu podľa tagov/kategórií, pravidlo pre konkrétny typ jedla alebo deň v týždni).
- **Recipe Actions** — vlastné akcie na recepte (deeplink do Bring!, POST do Home Assistant).
- Cookbooks (uložené filtrované pohľady).

**Plán:** kalendár + tlačidlo random recipe + Planner Rules.
**Nákup:** linkovanie receptov, **Labels** (flexibilná kategorizácia: oddelenie / obchod / mraznička), konsolidácia.
**Škálovanie:** áno (po ML parse). **Výživa:** voliteľné manuálne pole.
**Cena:** zdarma, open-source.

**Nápady pre nás:**
1. **Planner Rules** — nadstavba nad náš generátor: pravidlá typu "v bloku A len obedy z kategórie X", "piatok = ryba", "nikdy dvakrát to isté mäso za sebou". Vysoký dopad na kvalitu auto-generátora.
2. **Import receptu z URL** — parsovanie schema.org/JSON-LD z receptových webov. (Fetch by potreboval sieť, ale parsovanie sa dá robiť aj z vloženého HTML offline.)
3. **Flexibilné labely na nákupnom zozname** — okrem oddelenia aj štítok "mrazák / špajza / drogéria".

## 7. Tandoor (open-source, self-hosted)

**Čo robí dobre:** zrelý self-hosted správca receptov + plánovač + nákup; najbližšie k nášmu projektu.

**Unikáty:**
- **Mapovanie ingrediencií na oddelenia konkrétneho supermarketu** — definuješ "Supermarket Categories" a poradie sekcií, zoznam potom kopíruje trasu obchodom.
- Automatický výpočet výživy, **cien** aj vlastných počítaných polí z ingrediencií (napr. "diet points").
- AI: rozpoznávanie obrázkov, automatické triedenie krokov, dohľadanie výživy.
- Fulltext search (PostgreSQL trigram), rýchle zlučovanie ingrediencií/jednotiek/tagov.

**Plán:** kalendár s drag & drop, viac jedál na deň, export do kalendára, priama tvorba nákupu.
**Nákup:** z plánu/receptu, agregácia, triedenie podľa oddelení konkrétneho obchodu, real-time zdieľanie. Nemá promo/letáky.
**Škálovanie:** áno, zlomky aj desatinné. **Výživa:** cez OpenFoodFacts, súčty na úrovni receptu aj plánu.
**Cena:** zdarma, open-source.

**Nápady pre nás:**
1. **Poradie oddelení podľa MÔJHO obchodu** — používateľ si nastaví trasu (Kaufland vs. Lidl) a zoznam sa zoradí presne podľa nej. Priamo rozširuje náš nákup po oddeleniach.
2. **Cena a výživa ako počítané pole z ingrediencií** — už máme ceny; potvrdenie, že prepočet na porciu/balenie je správna cesta. Prípadne "cena za porciu bloku".
3. **Rýchle zlučovanie/premenovanie ingrediencií a jednotiek** — nástroj na údržbu databázy (dedup surovín).

## 8. Bring! (nákupný zoznam)

**Čo robí dobre:** najpopulárnejší zdieľaný nákupný zoznam v Európe — vizuálny, rýchly, zábavný.

**Unikáty:**
- Vizuálny zoznam s **obrázkovými dlaždicami** položiek, auto-triedenie do kategórií.
- **Akcie a letáky obchodov v okolí** priamo v appke + notifikácie na zľavy u obľúbených obchodov. (Toto máme cez Kaufland leták — Bring! to rieši ako hlavnú funkciu.)
- Inspiration Stream — denné recepty, ingrediencie na zoznam jedným klikom.
- Sezónne odporúčania, Bring! Wallet (vernostné karty), integrácia Alexa/Siri/hodinky.

**Plán:** nie je plnohodnotný meal planner; plánovanie skôr cez recepty.
**Nákup:** jadro produktu — kategórie, real-time zdieľanie, viac zoznamov pre rôzne obchody.
**Škálovanie:** áno, quantity calculator pri receptoch. **Výživa:** nerieši.
**Cena:** free, monetizácia cez retail media / reklamu obchodov.

**Nápady pre nás:**
1. **Prepojenie akcií/letákov na nákupný zoznam** — pri položke ukázať "je v akcii v Kauflande" (už máme akcie; stačí ich napárovať na položky zoznamu). Vysoká hodnota pri cenách.
2. **Vizuálne ikony/emoji pri položkách** — rýchlejšie čítanie zoznamu v obchode; ľahké v HTML.
3. **Sezónne odporúčania** pri návrhu jedál (už máme sezónnosť — dá sa zvýrazniť v generátore).

## 9. KptnCook

**Čo robí dobre:** kurátorský prístup proti rozhodovacej únave — 3 testované recepty denne namiesto nekonečného scrollovania.

**Unikáty:**
- Model **3 recepty denne** + týždenný special.
- **Fotonávod krok za krokom** — každý krok ilustrovaný číslovanou fotkou.
- AI asistent "Skippi" (tipy, náhrady ingrediencií).
- **Farebný krúžok** pri výživovej hodnote = podiel na priemernej dennej potrebe.
- Fridge Finds (varenie z toho, čo máš doma).

**Plán:** Weekly Planner (platený) + tlačidlo "Surprise" na náhodný návrh.
**Nákup:** zoznam per recept, zdieľanie, **odhad cien** (pri váženom tovare priemerné hmotnosti). Nerieši oddelenia/akcie.
**Škálovanie:** áno, prepočet z 2–4 porcií. **Výživa:** hodnoty na porciu z národnej databázy.
**Cena:** freemium.

**Nápady pre nás:**
1. **"3 návrhy denne / Surprise" tlačidlo** — proti rozhodovacej únave: appka ponúkne pár kurátorovaných návrhov namiesto celého zoznamu. Ľahké nad našou databázou.
2. **Farebný krúžok / progress bar podielu na dennej potrebe** — vizualizácia kalórií a makier voči cieľu profilu. Pekné a lokálne počítateľné.
3. **Fotonávod krok za krokom** — ak máme fotky, číslované kroky s obrázkom zlepšia zážitok z varenia.

## 10. AnyList (nákupný zoznam a recepty)

**Čo robí dobre:** najlepšie zvládnutý zdieľaný nákupný zoznam pre domácnosti + solídny plánovač.

**Unikáty:**
- **Prispôsobiteľné poradie oddelení podľa layoutu tvojho obchodu.**
- Automatická kategorizácia položiek pri písaní (autocomplete → oddelenie).
- Master list cez Favorites, location-based reminders (pripomienka pri príchode k obchodu).
- Ceny položiek (sledovanie rozpočtu), fotky, poznámky.

**Plán:** plnohodnotný kalendár, priraďovanie receptov + poznámky, **zostavenie nákupu z rozsahu dátumov**, sync s Google Calendar.
**Nákup:** auto-triedenie do oddelení + vlastné poradie, agregácia, real-time zdieľanie, viac zoznamov + priečinky.
**Škálovanie:** áno. **Výživa:** nerieši.
**Cena:** free + Complete 9,99 $/rok (jednotlivec) / 14,99 $/rok (domácnosť).

**Nápady pre nás:**
1. **Generovanie nákupu z rozsahu dátumov / vybraných blokov** — nie len celý týždeň, ale "od–do" alebo len blok A. Flexibilnejšie ako fixný týždeň.
2. **Autocomplete s auto-kategorizáciou** pri manuálnom pridávaní položky (naučená mapa surovina → oddelenie).
3. **Location reminder** — cez PWA notifikácie (čiastočne, vyžaduje povolenia prehliadača).

## 11. Crouton (správca receptov, iOS/Mac)

**Čo robí dobre:** elegantný UX a najlepší "cook mode" (Apple Design Award).

**Unikáty:**
- **Hands-free mode** — prechod medzi krokmi bez dotyku obrazovky.
- **Samo-pomenované časovače** (napr. "Bake Cookies", "Overnight marinade"), viac súbežných, auto-detekcia časov v krokoch.
- OCR skenovanie receptu z kuchárskej knihy.
- Recept môže byť vo viacerých priečinkoch naraz (tagy + folders).
- **Auto-generovanie plánu** z uložených večerí.

**Plán:** weekly planner + auto-generovanie. **Nákup:** cez Apple Reminders (nemá vlastné oddelenia).
**Škálovanie:** áno. **Výživa:** vytiahne pri analýze receptu. **Offline:** áno.
**Cena:** freemium, ~8,99 $/rok alebo lifetime 24,99 $ (ceny sa medzi zdrojmi líšia).

**Nápady pre nás:**
1. **Viac súbežných pomenovaných časovačov** počas varenia — silné pre meal-prep, kde beží viac vecí naraz. Realizovateľné v HTML (Web Workers / setInterval + Notifications).
2. **Cook mode / focus na jeden krok** s veľkým písmom, obrazovka nezhasne (Wake Lock API).
3. Recept vo viacerých kategóriách naraz (many-to-many tagovanie).

## 12. NYT Cooking

**Čo robí dobre:** kurátorský, redakčne overený obsah + výborná komunita.

**Unikáty:**
- 125+ redakčne kurátorovaných **kolekcií** (rýchle večere, no-recipe recipes...).
- Recipe Box — ukladanie a organizácia do vlastných kolekcií.
- **Community Notes** — pri každom recepte poznámky používateľov s úpravami, náhradami a tipmi.

**Plán:** nemá klasický kalendár; "plánovanie" cez Recipe Box → nákupný zoznam.
**Nákup:** jeden zoznam z vybraných receptov, integrácia Instacart. Bez vlastných oddelení.
**Škálovanie:** nepotvrdené. **Výživa:** väčšinou nezobrazuje.
**Cena:** samostatné predplatné ~5 $/mes alebo ~40 $/rok.

**Nápady pre nás:**
1. **Osobné poznámky / varianty k receptu** (á la Community Notes, ale pre jedného používateľa) — "minule som dal menej soli", "funguje aj s cícerom". Odškrtnuté zmeny, história úprav receptu.
2. **Kurátorované kolekcie** — tematické zbierky ("rýchle do 20 min", "lacné pod 1,5 €/porcia", "vysoký proteín"). Dá sa generovať automaticky z filtrov nad našimi dátami.

---

## TOP ODPORÚČANIA (zoradené podľa dopadu)

| # | Nápad | Zdroj | Dopad | Realizovateľné offline HTML |
|---|-------|-------|-------|------------------------------|
| 1 | **Planner Rules pre generátor** — pravidlá "piatok = ryba", "nie 2× rovnaké mäso za sebou", "blok A len z kategórie X", per-blok makro ciele | Mealie, Eat This Much | Veľmi vysoký — priamo zlepšuje jadro (auto-generátor) | **Áno** (čistá logika nad dátami) |
| 2 | **Freezer / mraznička + Pantry modul** — evidencia navareného a zásob; generátor ich zaráta a znižuje nákup | Plan to Eat, Paprika | Veľmi vysoký — sedí na meal-prep, šetrí peniaze aj varenie | **Áno** (lokálny stav) |
| 3 | **Automatic leftovers** — navarená dávka sa rozpočíta do viacerých dní/blokov | Eat This Much | Vysoký — presne blokový systém A/B/C | **Áno** |
| 4 | **Prepojenie akcií/letákov na položky nákupu** — pri surovine ukázať "v akcii Kaufland", zvýhodniť v generátore lacnejšie jedlá | Bring! | Vysoký — už máme akcie aj ceny, treba len napárovať | **Áno** (párovanie na existujúce dáta) |
| 5 | **Poradie oddelení podľa môjho obchodu** — nastaviteľná trasa (Kaufland/Lidl), zoznam sa zoradí podľa nej | Tandoor, AnyList | Vysoký — praktické pri každom nákupe | **Áno** |
| 6 | **Viac súbežných pomenovaných časovačov + cook mode** (obrazovka nezhasne, focus na krok) | Crouton, Paprika | Vysoký — reálny zážitok pri varení/meal-prepe | **Áno** (Wake Lock + Notifications API) |
| 7 | **Endless regeneration / "vymeň toto jedlo"** — nahradenie jedného jedla bez preskladania celého plánu | Eat This Much, KptnCook | Vysoký — pohodlie pri ladení plánu | **Áno** |
| 8 | **Farebný krúžok/progress bar podielu na dennej potrebe** — kalórie a makrá voči cieľu profilu | KptnCook, Samsung Food | Stredne vysoký — lepšia orientácia vo výžive, ktorú už počítame | **Áno** |
| 9 | **Reusable menus / šablóny blokového týždňa** — uložiť a znovu použiť osvedčený plán | Paprika, Plan to Eat | Stredný — šetrí čas | **Áno** |
| 10 | **Import receptu z URL** (parsovanie schema.org / JSON-LD) | Mealie, Tandoor, Paprika | Stredný — rýchle plnenie databázy | **Čiastočne** (parsovanie offline; fetch stránky potrebuje sieť) |
| 11 | **Osobné poznámky a história úprav receptu** — "minule menej soli", varianty | NYT Cooking | Stredný — postupné vylepšovanie receptov | **Áno** |
| 12 | **Auto-kategorizácia položky pri písaní** (naučená mapa surovina → oddelenie) + staples list | AnyList, Plan to Eat | Stredný — rýchlejší manuálny nákup | **Áno** |

Doplnkové (nižší dopad, ľahké): vizuálne emoji/ikony pri nákupných položkách (Bring!), automatická detekcia časov v postupe → klikateľný časovač (Paprika), auto-generované tematické kolekcie z filtrov (NYT), skóre zdieľania ingrediencií pri generovaní bloku (Mealime), desatinné škálovanie porcií (Plan to Eat), recept vo viacerých kategóriách naraz (Crouton).

**Čo by potrebovalo backend / sieť (mimo čistej offline appky):** online nákup/donáška (Instacart, Kroger...) — nerelevantné pre SK; komunitné zdieľanie receptov medzi používateľmi; AI OCR/video import; real-time viacpoužívateľské zdieľanie zoznamu (dá sa cez voliteľnú synchronizáciu, ktorú už plánujeme); live letáky z internetu (my ich riešime importom Kaufland letáku).

---

## Zdroje

**Mealime:** https://www.mealime.com/ · https://support.mealime.com/article/151-getting-started-guide
**Paprika:** https://www.paprikaapp.com/ · https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/
**Eat This Much:** https://www.eatthismuch.com/ · https://www.eatthismuch.com/pricing
**Plan to Eat:** https://www.plantoeat.com/ · https://www.plantoeat.com/tour/meal-planner/
**Samsung Food:** https://samsungfood.com/ · https://samsungfood.com/meal-planner/
**Mealie:** https://github.com/mealie-recipes/mealie · https://docs.mealie.io/documentation/getting-started/features/
**Tandoor:** https://tandoor.dev/ · https://docs.tandoor.dev/features/shopping/ · https://docs.tandoor.dev/features/import_export/
**Bring!:** https://www.getbring.com/en/why-bring · https://www.getbring.com/en/features/inspired · https://www.bringlabs.com/en/platform
**KptnCook:** https://www.kptncook.com/ · https://www.kptncook.com/faqs · https://www.kptncook.com/plans
**AnyList:** https://www.anylist.com/ · https://www.anylist.com/features · https://www.anylist.com/meal-planning
**Crouton:** https://crouton.app/ · https://www.macstories.net/reviews/crouton-review-an-elegant-modern-recipe-manager-and-cooking-aid/
**NYT Cooking:** https://apps.apple.com/us/app/nyt-cooking-quick-tasty-meals/id911422904 · https://eathealthy365.com/new-york-times-cooking-price-a-full-2025-breakdown/

*Poznámka k cenám: predplatné sa líši podľa regiónu a platformy a mohlo sa od dátumu prieskumu zmeniť (najmä Paprika per-platforma, Crouton, Bring!/KptnCook Premium). Pred prípadnou publikáciou over v príslušnom app store.*

---

# Druhá vlna — ďalšie aplikácie a nápady

Rozšírenie reportu o 13 nových aplikácií, ktoré prvá vlna nepokrývala. Dôraz na výživové trackery, správu špajze/plytvanie, letáky a lokálne (EU/DACH) appky. Ku každej krátky profil, čo robí unikátne a 1–3 nápady pre nás. Na konci veľký tematický backlog (28 nápadov) a zdroje.

Dátum: 2026-07-16

---

## 13. Grocy (self-hosted, "ERP beyond your fridge")

**Čo robí unikátne:** open-source domáce ERP — nie appka na recepty, ale kompletná evidencia zásob domácnosti. Sleduje stavy, dátumy spotreby, históriu spotreby, lokácie (chladnička/špajza/mraznička), obchody a vlastné polia produktov. Nákupný zoznam sa **automaticky dopĺňa podľa minimálnej zásoby** ("mám menej ako 2 ks → pridaj"). Recept vie skontrolovať dostupnosť surovín a jedným klikom pridať chýbajúce na zoznam. Má aj REST API a modul na domáce úlohy/batérie/vybavenie.

**Nápady pre nás:**
1. **Minimálne zásoby (par levels)** — v module "Čo mám doma" nastaviť pri staple surovinách prah; keď klesne pod, automaticky navrhne do nákupu. Realizovateľné čisto v offline HTML (stav držíme v localStorage).
2. **Model spotreby cez recept** — po uvarení jedla odpočítať suroviny zo zásoby (na základe množstiev z receptu). Prepája plánovač so špajzou.
3. **Lokácie zásoby** (chladnička / špajza / mraznička) + dátum spotreby pri položke — základ pre upozornenia na blížiacu sa expiráciu.

## 14. NoWaste (Your Food)

**Čo robí unikátne:** čistý inventár chladničky/mrazničky/špajze zameraný na **dátumy spotreby a boj proti plytvaniu**. Pridávanie skenom čiarového kódu, bločka alebo fotky; triedenie a filtrovanie podľa expirácie/kategórie/umiestnenia; upozornenia niekoľko dní/týždňov vopred podľa typu potraviny. Navrhuje recepty z toho, čo máš, s prioritou na suroviny pred spotrebou. Zdieľanie špajze v rámci domácnosti.

**Nápady pre nás:**
1. **Zoznam "spotrebuj čoskoro"** — položky v špajze zoradené podľa dátumu spotreby, s farebným varovaním. Offline áno.
2. **Návrh receptu z toho, čo expiruje** — generátor uprednostní recepty využívajúce práve dochádzajúce/expirujúce suroviny (rozšírenie nášho "Čo mám doma").
3. **Odlíšenie mraznička vs. špajza vs. chladnička** — pri meal-prepe užitočné (uvarené bloky do mrazáku s dátumom).

## 15. Cooklist (Plan • Shop • Cook)

**Čo robí unikátne:** napojenie na **vernostné karty obchodov a bločky** — automaticky sťahuje nákupy do digitálnej špajze (75+ reťazcov, príp. sken účtenky fotkou). Potom feed receptov "toto vieš uvariť z toho, čo máš". Nákupný zoznam generuje len z chýbajúcich surovín. Sleduje aj vek jednotlivých položiek v špajze.

**Nápady pre nás:**
1. **Sken účtenky → doplnenie špajze** (OCR). U nás realizovateľné len čiastočne — samotné OCR potrebuje knižnicu/službu, ale ručné rýchlopridanie z textu bločka vieme.
2. **"Čo viem uvariť teraz"** ako samostatný filter receptov podľa aktuálnej špajze (máme základ, rozšíriť o presné množstvá).
3. **Vek položky v špajze** — koľko dní tam surovina je, jednoduchý ukazovateľ.

## 16. MacroFactor

**Čo robí unikátne:** **adaptívny výdaj energie (TDEE)** — nepoužíva statický Mifflin-St Jeor vzorec, ale spätne dopočíta reálny výdaj z trendu hmotnosti a skutočného príjmu za niekoľko týždňov. Coach potom týždenne upravuje makro cieľ podľa toho, ako sa hmotnosť naozaj vyvíja. Veľká overená databáza, skener kódov, makrá aj mikroživiny.

**Nápady pre nás:**
1. **Adaptívny kalorický cieľ** — okrem TDEE zo vzorca ponúknuť "dolaď podľa reality": používateľ zadá hmotnosti za pár týždňov + priemerný príjem, appka dopočíta reálny výdaj a upraví cieľ. Offline áno (čistá matematika, dáta v localStorage).
2. **Trendová hmotnosť** (kĺzavý priemer) namiesto surových denných výkyvov — pokojnejší graf, lepšie rozhodovanie.
3. **Týždenný "coach" tip** — automatický odkaz typu "za posledné 3 týždne priberáš rýchlejšie, ako je cieľ; navrhujem znížiť dennú porciu o ~X kcal".

## 17. Cronometer

**Čo robí unikátne:** **mikroživinový etalón** — sleduje 84 živín (vitamíny, minerály, esenciálne aminokyseliny, omega-3/6, trans-tuky) na kurátorovanej databáze. Každá živina ako % dennej potreby, farebne (červená deficit → zelená OK → žltá nadbytok). Plnohodnotný web/desktop, export dát, bez reklám aj v free.

**Nápady pre nás:**
1. **Farebné % dennej potreby** — nielen kalórie a 3 makrá, ale aj pár kľúčových mikroživín (vláknina, sodík, vápnik, železo, vit. C/D) ako farebné prúžky. Realizovateľné, ak doplníme mikro dáta do databázy potravín (čiastočne — treba dáta).
2. **Upozornenie na nadbytok/deficit** cez týždeň (napr. veľa sodíka, málo vlákniny) — dá sa dopočítať z plánu.
3. **Denný "nutričný štítok"** jedálnička v štýle obalovej tabuľky.

## 18. Yazio

**Čo robí unikátne:** kombinuje **kalorický denník + intervalový pôst** (timery 16:8, 5:2, 6:1 a ďalšie) + goal-friendly recepty a jedálničky. AI foto tracking príjmu, vodný tracker s pripomienkami, filtre low-carb/vegetarián/vegan.

**Nápady pre nás:**
1. **Voliteľné okno jedenia / pôst** — jednoduchý timer a poznámka "prvé/posledné jedlo dnes", nech si používateľ vie držať 16:8. Offline áno.
2. **Vodný tracker** — malý denný počítadlo pohárov s cieľom podľa TDEE/hmotnosti. Triviálne offline.
3. **Recepty označkované podľa cieľa** ("na chudnutie", "na naberanie") ako rýchly filter nad existujúcimi diétnymi značkami.

## 19. Jow

**Čo robí unikátne:** **jednominútový nákup** — pri onboardingu zadáš spotrebiče, veľkosť domácnosti a preferencie; appka z receptov postaví "smart cart" presne na počet porcií, pridáš staple položky a objedná do vybraného obchodu. Silný dôraz na to, aby si kúpil len čo treba (menej plytvania, ~10 % úspora).

**Nápady pre nás:**
1. **Onboarding profilu domácnosti raz** (spotrebiče, počet osôb, obľúbené) → generátor to rešpektuje vždy. Máme profil, doplniť "spotrebiče/vybavenie" ako filter (napr. bez rúry).
2. **Staple/základná polička** — trvalé položky (soľ, olej, koreniny), ktoré appka nepridáva zbytočne do nákupu, ale pripomenie pri dochádzaní. Offline áno.
3. **Presné škálovanie nákupu na počet porcií** naprieč celým týždňom (máme; Jow potvrdzuje, že je to core hodnota — dôraz na "kúp len čo treba").

## 20. Cookidoo (Thermomix)

**Čo robí unikátne:** **guided cooking** — recept vedie krok za krokom, u Thermomixu aj automaticky nastaví čas/teplotu/rýchlosť. "My Week" plánovač: pod receptom ADD → do konkrétneho dňa, z toho sa syncne nákupný zoznam. 100 000+ testovaných receptov.

**Nápady pre nás:**
1. **Guided krokový režim s parametrami** — pri každom kroku zvýrazniť teplotu/čas/rýchlosť ako štruktúrované polia (nielen text), naviazané na náš časovač. Máme režim varenia, obohatiť o parametre. Offline áno.
2. **"Pridaj do dňa" priamo z receptu** dvojklikom (rýchle plnenie plánu) — UX drobnosť, offline áno.
3. **Značka "testované/overené"** pri vlastných receptoch (spolu s históriou úprav z 1. vlny).

## 21. Chefkoch

**Čo robí unikátne:** najväčšia recept-platforma v EU (370 000+ receptov), vlastný Kochbuch, hodnotenia, poznámky, týždenný plánovač (Premium) a najmä **"Resteverwertung"** — zadáš, čo máš v kuchyni, a dostaneš pasujúce recepty. Veľmi blízke nášmu regiónu (DACH, podobná kuchyňa).

**Nápady pre nás:**
1. **"Zvyškovar" (Resteverwertung)** — rýchly vstup 2–5 surovín "mám doma" a okamžitý zoznam receptov, ktoré ich využijú (kombinácia s NoWaste/BigOven prístupom). Offline áno.
2. **Recept dňa / týždňa** na nástenke z našej databázy (rotácia podľa sezóny/akcií). Offline áno.
3. **Regionálne/lokálne kategórie** jedál blízke SK/CZ kuchyni ako filter.

## 22. Kitchen Stories

**Čo robí unikátne:** **cooking mode s foto-krokmi a HD videami**, smart filtre (kuchyňa, náročnosť, čas, suroviny doma), prevodník mier, porcie, tipy od šéfkuchárov. Dizajnovo veľmi čisté.

**Nápady pre nás:**
1. **Filter podľa náročnosti a času prípravy** ako prominentné rýchle prepínače (máme čas; pridať náročnosť). Offline áno.
2. **Foto pri krokoch** (voliteľné) v režime varenia — vyššia zrozumiteľnosť. Offline áno (ak máme obrázky lokálne).
3. **Vstavaný prevodník mier / náhrad jednotiek** priamo v recepte (lyžica ↔ g, hrnček ↔ ml). Offline áno.

## 23. Flipp

**Čo robí unikátne:** agreguje **letáky viacerých reťazcov** na jednom mieste; položku z letáka klikneš rovno do nákupného zoznamu; **watch list** (sledované položky) ťa upozorní na novú zľavu; porovnanie ceny položky medzi obchodmi; zoznam sa dá triediť podľa obchodu.

**Nápady pre nás:**
1. **Watch list surovín** — používateľ označí "sleduj bravčové karé, maslo"; keď sa objaví v importe Kaufland letáka, appka upozorní a navrhne recept. Offline áno (leták už importujeme).
2. **Napárovanie akcie na plán** — pri generovaní zvýhodniť recepty, ktorých hlavná surovina je práve v akcii (rozšírenie našej práce s letákom). Offline áno.
3. **Označenie položiek v nákupe, ktoré sú v akcii** (ikonka + ušetrená suma). Offline áno.

## 24. Kimbino (slovenský pôvod)

**Čo robí unikátne:** letáky 140+ obchodov, **notifikácia pri vydaní nového letáka** obľúbeného obchodu, úložisko vernostných kariet, filter podľa kategórií a obľúbených predajní. Relevantné, lebo pokrýva SK reťazce.

**Nápady pre nás:**
1. **Úložisko vernostných kariet** (čiarový kód karty Kaufland/Lidl/Tesco) v profile — zobrazí sa pri pokladni. Offline áno (obrázok/kód v localStorage).
2. **Viac reťazcov v akciách** — rozšíriť import letákov nad Kaufland (Lidl, Tesco, Billa) ako zdroje. Čiastočne (parsovanie letákov jednotlivých reťazcov je prácne).
3. **Kategorizované akcie** — v sekcii akcií filter podľa oddelenia (mäso, mliečne, pečivo). Offline áno.

## 25. BigOven

**Čo robí unikátne:** funkcia **"Use Up Leftovers"** — zadáš až 3 suroviny a z 1M+ receptov ukáže, čo z nich uvaríš. Nákupný zoznam triedený podľa oddelenia alebo receptu, zdieľaný v domácnosti.

**Nápady pre nás:**
1. **"3 suroviny → recept"** — minimalistický vstup presne troch hlavných surovín a rýchly výsledok (jednoduchší ako plný filter, dobrý na "čo dnes"). Offline áno.
2. **Prepínač triedenia nákupu: podľa oddelenia ↔ podľa receptu** (máme oddelenia; pridať pohľad "po jedlách"). Offline áno.

---

## ROZŠÍRENÝ BACKLOG NÁPADOV

28 nápadov z druhej vlny, zoradených do tém. Značka realizovateľnosti: **[offline]** = ide čisto v našej HTML/PWA appke · **[čiastočne]** = jadro áno, plná verzia potrebuje dáta/knižnicu · **[backend]** = vyžaduje server/sieť.

### Plánovanie
1. **"Pridaj do dňa" priamo z receptu** dvojklikom, rýchle plnenie plánu (Cookidoo). **[offline]**
2. **Filter podľa náročnosti + času prípravy** ako prominentné prepínače (Kitchen Stories). **[offline]**
3. **Recept dňa/týždňa na nástenke** s rotáciou podľa sezóny/akcií (Chefkoch). **[offline]**
4. **Filter spotrebičov/vybavenia** (napr. "bez rúry", "len jeden hrniec") v generátore (Jow). **[offline]**
5. **Skóre zdieľania surovín v bloku** — generátor uprednostní recepty s prekryvom surovín (Mealime/Jow, posilnenie). **[offline]**

### Nákup a rozpočet
6. **Watch list surovín** s upozornením, keď sa objaví v akcii (Flipp). **[offline]**
7. **Napárovanie akcie na plán** — zvýhodniť recepty, ktorých hlavná surovina je v Kaufland letáku (Flipp). **[offline]**
8. **Označenie akciových položiek v nákupe** + ušetrená suma (Flipp). **[offline]**
9. **Prepínač triedenia nákupu: oddelenie ↔ recept** (BigOven). **[offline]**
10. **Úložisko vernostných kariet** (čiarový kód) v profile (Kimbino). **[offline]**
11. **Staple/základná polička** — trvalé položky sa nepridávajú zbytočne, len pripomenú pri dochádzaní (Jow/Grocy). **[offline]**
12. **Viac reťazcov v akciách** (Lidl, Tesco, Billa okrem Kauflandu) (Kimbino). **[čiastočne]**

### Špajza / plytvanie
13. **Minimálne zásoby (par levels)** — pod prah → auto-návrh do nákupu (Grocy). **[offline]**
14. **Odpočet surovín zo špajze po uvarení** podľa množstiev v recepte (Grocy). **[offline]**
15. **Lokácie zásoby** chladnička/špajza/mraznička + dátum spotreby (Grocy/NoWaste). **[offline]**
16. **Zoznam "spotrebuj čoskoro"** s farebným varovaním podľa expirácie (NoWaste). **[offline]**
17. **Generátor uprednostní expirujúce suroviny** (NoWaste). **[offline]**
18. **"Zvyškovar" / 3 suroviny → recept** — rýchly vstup a výsledok (Chefkoch/BigOven). **[offline]**
19. **Vek položky v špajze** (koľko dní tam je) (Cooklist). **[offline]**
20. **Sken účtenky → doplnenie špajze** (OCR) (Cooklist). **[čiastočne]**

### Výživa
21. **Adaptívny kalorický cieľ** dopočítaný z trendu hmotnosti a reálneho príjmu (MacroFactor). **[offline]**
22. **Trendová hmotnosť (kĺzavý priemer)** namiesto surových denných hodnôt (MacroFactor). **[offline]**
23. **Týždenný "coach" tip** podľa vývoja hmotnosti vs. cieľ (MacroFactor). **[offline]**
24. **Farebné % dennej potreby pri mikroživinách** (vláknina, sodík, vápnik, železo, vit. C/D) (Cronometer). **[čiastočne]**
25. **Voliteľné okno jedenia / pôst** (16:8) + jednoduchý timer (Yazio). **[offline]**
26. **Vodný tracker** s denným cieľom (Yazio). **[offline]**

### Zážitok / UX
27. **Guided krokový režim s parametrami** (teplota/čas/rýchlosť ako polia naviazané na časovač) + voliteľné foto pri krokoch (Cookidoo/Kitchen Stories). **[offline]**
28. **Vstavaný prevodník mier a náhrad jednotiek** priamo v recepte (lyžica ↔ g, hrnček ↔ ml) (Kitchen Stories). **[offline]**

**Dáta / automatizácia (poznámka):** väčšina výživových a špajzových nápadov stojí a padá na kvalite dát v našej databáze potravín (mikroživiny, prepočty jednotiek). Odporúčanie: dopĺňať postupne — najprv vláknina/sodík (najužitočnejšie), potom ostatné. OCR účteniek a multi-reťazcové letáky sú jediné, čo reálne ťaží mimo čistého offline (knižnica alebo voliteľný online krok).

---

## Zdroje (druhá vlna)

**Grocy:** https://grocy.info/ · https://github.com/grocy/grocy
**NoWaste / Your Food:** https://www.nowasteapp.com/ · https://nowaste.ai/ · https://yourfood.app/features/
**Cooklist:** https://cooklist.com/cooklist-app · https://apps.apple.com/us/app/cooklist-pantry-meals-recipes/id1352600944
**MacroFactor:** https://macrofactor.com/macrofactor/ · https://macrofactorapp.com/algorithm-accuracy/
**Cronometer:** https://cronometer.com/index.html · https://cronometer.com/features/index.html
**Yazio:** https://www.yazio.com/en · https://help.yazio.com/hc/en-us/articles/11804776635281-Tutorial-of-the-YAZIO-app
**Jow:** https://jow.com/ · https://apps.apple.com/us/app/jow-easy-recipes-groceries/id1301257625
**Cookidoo (Thermomix):** https://cookidoo.thermomix.com/ · https://www.thermomix.com/pages/cookidoo-app
**Chefkoch:** https://play.google.com/store/apps/details?id=de.pixelhouse · https://apps.apple.com/de/app/chefkoch-rezepte-kochen/id478618165
**Kitchen Stories:** https://pages.kitchenstories.com/en/app · https://apps.apple.com/us/app/kitchen-stories-easy-recipes/id771068291
**Flipp:** https://flipp.com/ · https://apps.apple.com/us/app/flipp-shop-grocery-deals/id725097967
**Kimbino:** https://www.kimbino.com/ · https://play.google.com/store/apps/details?id=sk.kimbinogreen.kimbino
**BigOven:** https://www.bigoven.com/use-up-leftovers · https://www.bigoven.com/our-apps

*Poznámka k cenám a funkciám: predplatné a rozsah funkcií (najmä Premium/Plus vrstvy MacroFactor, Cronometer, Yazio, Cookidoo, Kitchen Stories, Chefkoch) sa líšia podľa regiónu a platformy a mohli sa od dátumu prieskumu zmeniť. Flipp/Cooklist fungujú primárne v US/CA; pre SK sú relevantné najmä ako inšpirácia funkciami, nie ako zdroj dát.*
