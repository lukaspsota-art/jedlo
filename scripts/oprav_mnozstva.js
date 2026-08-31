#!/usr/bin/env node
// OPRAVA POŠKODENÝCH MNOŽSTIEV V recepty/*.json
//
// PRÍČINA (dohľadaná v histórii, nie hádaná): `scripts/oprav_jednotky_ks.js` prepisoval
// „N ks“ na gramy tak, že N vynásobil CELÝM BALENÍM (`balenie_g`) — „Olivový olej 5 ks“
// → 5 × 920 g = 4600 g, „Celozrnný starší chlieb 4 plátky“ → 4 × 1000 g = 4000 g.
// Balenie nie je porcia. Keď to bežalo, `potraviny.json` ešte nemalo `g_za_ks`; dnes ho má
// (olivový olej 15 g = lyžica, kreveta 15 g, plátok eidamu 20 g), takže sa konverzia dá
// zopakovať SPRÁVNOU váhou kusa. Pôvodné „N ks“ sa berie z commitu BASELINE (git), nie
// z hádania — tak sa nedotkneme hodnôt, ktoré ten skript nikdy nemenil.
//
// Triedy opráv:
//   KS_BALENIE  N × balenie_g  →  N × g_za_ks (resp. g_za_platok, resp. tabuľka VAHA_KUSA)
//   PORCIE      množstvá sedia na celý recept, `porcie` hovorí niečo iné (8 rezňov ≠ 2 porcie)
//   DESATINNA   presunutá desatinná čiarka (4000 g → 400 g)
//   RUCNE       tabuľka nižšie — prípady, kde pravidlo rozhodnúť nevie
//   VSIAKNUTIE  legitímne veľký olej na vyprážanie dostane podiel, ktorý sa naozaj zje
// Nemenené: voda, nálev, marináda, vývar — legitímne veľké množstvá (R1/B7).
//
// `kcal_na_porciu` je kurátorované (B4) a slúži ako krížová kontrola; skript ho nemení.
// Výnimky sú vymenované v RUCNE_KCAL a každá má dôvod.
//
// Spusti: node scripts/oprav_mnozstva.js [--dry]
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const DIR = path.join(__dirname, "..", "recepty");
const app = require("../test_harness").load({ stav: { profil: { osoby: 2, kcal: 1450 } }, seed: 1 });
const DRY = process.argv.includes("--dry");
const BASELINE = process.env.MNOZ_BASELINE || "42250e7";   // commit pred zberom/konverziami

// ── prahy ────────────────────────────────────────────────────────────────────────────────
const Q_ROZBITY = 1.5;        // dopočet zo surovín / deklarované kcal — nad tým je recept pokazený
const G_PORCIA = 700;         // g jedla na porciu — bežná porcia hlavného jedla je 300–500 g
const VINNIK_NASOBOK = 5;     // gramáž suroviny na porciu vs. medián tej istej suroviny v databáze
const VINNIK_PODLAHA = 150;
const MIN_VZORKA = 4;
const KS_JED = ["ks", "kus", "plátok", "platok", "rožok", "žemľa"];
const LEGITIMNE = /voda|vody|vodou|nálev|nalev|marinád|marinad|vývar|vyvar|bujón|bujon|ľad|lad$/i;

// Váha jedného kusa/plátku pre suroviny, ktoré ju v potraviny.json (cudzí súbor) nemajú.
const VAHA_KUSA = {
  "hrášok": 30, "rukol": 3, "celozrn": 30, "ovsené vloč": 15, "vločky": 15, "eidam": 20,
  "ovocný džús": 200, "pomarančová šťava": 200, "kuracia pečeň": 40, "lístkové cesto": 400,
  "mäso": 150, "morčac": 150, "kačic": 200, "bažant": 800, "roštenka": 120, "pastrami": 20,
  "kalamáre": 100, "sépi": 80, "mušle": 25, "ryb": 150, "treska": 150, "camembert": 120,
  "jogurt grécky": 150, "kondenzované mlieko": 397, "sóda bikarbóna": 3, "kakaov": 6,
  "karamel": 6, "želé tortové": 20, "rasca": 2, "garam masala": 2, "worchester": 5,
  "worchestrov": 5, "sušené brusnice": 10, "hranolky": 150, "zeleninová mexická zmes": 150,
  "ryžové plátky": 10, "ryža": 60, "pak choi": 150, "šitake": 15, "ďumbier": 10,
  "bravčové karé": 150, "kuracie prsia": 180, "prsia kuracie": 180, "bedl": 60, "dubák": 20,
  "kvety": 2, "artičok": 60, "medvedí cesnak": 3, "sedmokrásk": 1, "púpav": 2, "šalát": 150,
  "mlieko": 250, "kokosové mlieko": 200, "ryžové mlieko": 250, "smotana": 200,
  // sypké prílohy sa na kusy nepočítajú — „1 ks“ znamenalo balenie, ale celé balenie
  // do jedného receptu nejde; berieme bežnú kuchynskú dávku
  "cestoviny": 125, "cestovina penne": 125, "špagety": 125, "lasagne": 15, "lasagne plát": 15,
  "kuskus": 60, "ryža": 75, "strúhanka": 50, "múka": 100, "polohrubá múka": 100,
};
// Váha kusa nikdy nesmie byť celé balenie ani viac než toto — presne to bola pôvodná chyba.
const VAHA_MAX = 400;
// Suroviny, ktoré sa predávajú vo vrecúšku — „1 ks“ je vrecúško, nie kilové balenie cukru/múky.
const VAHA_NAZOV = [
  // POZOR: \w v JS nepokrýva slovenskú diakritiku — „vanil\w*" na „Vanilínový" nesadne.
  [/vanil[^\s]*\s+cukor|cukor\s+vanil/i, 8], [/škoric[^\s]*\s+cukor/i, 20], [/karamelov[^\s]*\s+cukor/i, 8],
  [/prášok do pečiva|kypriac/i, 12], [/sóda bikarbón|sóda na pečenie/i, 5], [/sušené droždie|droždie sušené/i, 7],
  [/puding/i, 40], [/želé|zelatín|želatín/i, 20], [/aróma|aroma/i, 2], [/škrob/i, 20],
  [/šafran|garam masala|rasca|kari korenie|zmes korenia|korenie na/i, 3],
  [/bujón|bujon|masox|vývarová kocka/i, 10],
  [/mlet[^\s]*\s+paprika|paprika\s+mlet|mletá červená paprika/i, 3],
  [/citrónov[^\s]*\s+šťava|šťava z citróna|limetkov[^\s]*\s+šťava|šťava z limetky/i, 40],
  [/sójová omáčka|sojová omáčka|worcest|worchest/i, 15],
  [/^soľ$|^soľ\b|kuchynská soľ|morská soľ/i, 10],
  [/strúhank|struhank/i, 50],
];
const vahaNazov = n => { for (const [re, w] of VAHA_NAZOV) if (re.test(n)) return w; return null; };
const VAHA_ODDELENIE = { "Zelenina a ovocie": 100, "Mäso a ryby": 150, "Mliečne a vajcia": 30,
  "Pečivo": 30, "Pečenie a sladké": 20, "Korenie a bylinky": 2, "Oleje a tuky": 15,
  "Omáčky a dochucovadlá": 15, "Orechy a semená": 5, "Trvanlivé a konzervy": 30,
  "Cestoviny a ryža": 20, "Mrazené": 50, "Nápoje": 200, "Chladené": 100, "Ostatné": 50 };

// recept|surovina → [množstvo, jednotka, dôvod]
const RUCNE = {
  "pecivo-celozrnny|Muka celozrnna": [250, "g", "500 ml múky je 250 g (hustota 0,5) — nie 500 g"],
  "pecivo-celozrnny|Muka hladka": [250, "g", "500 ml múky je 250 g"],
  "pecivo-celozrnny|Soľ": [10, "g", "„1 ks soli“ = 1 lyžička na kilo múky"],
  "cviklovo-vajickovy-salat|Čipsy": [50, "g", "15 čipsov ≈ 50 g, nie 15 balení"],
  "cviklovo-vajickovy-salat|Tatárska omáčka": [60, "g", "2 lyžice do šalátu, nie celá vaňička"],
  "kuracie-fajitas|Hladká múka": [480, "g", "„24 ks“ boli tortilly (BBC Good Food), 8 × 60 g"],
  "tuniakovy-salat-so-zelenymi-fazuľkami|Špenátové lístky čerstvé": [60, "g", "hrsť špenátu do šalátu"],
  "domace-arasidove-maslo|Nesolené arašidy": [400, "g", "celý recept dá 400 g masla"],
  "kokosovo-limetkovy-napoj|Ovocný džús": [500, "g", "2 × 250 ml na dva nápoje"],
  "kokosovo-limetkovy-napoj|Kokosové nesladené mlieko": [200, "g", "2 × 100 ml"],
  "horuce-kakao-s-chilli|Kryštálový cukor": [10, "g", "lyžička cukru do hrnčeka"],
  "kavove-ladove-smoothie|Kryštálový cukor": [10, "g", "lyžička cukru"],
  "kavove-ladove-smoothie|Káva": [8, "g", "jedna dávka mletej kávy, nie balenie"],
  "syrova-natierka-s-cesnakom-a-bylinkami|Tavený syr": [200, "g", "7 trojuholníkov taveného syra ≈ 200 g"],
  "smoothie-z-hrozna-citrona-a-ananasu|Hrozno": [120, "g", "hrsť hrozna do smoothie"],
  "zeleny-smoothie-s-uhorkou|Sedmokrásky": [5, "g", "hrsť kvetov do smoothie — 600 g je nezmysel"],
  "zeleny-smoothie-s-uhorkou|Púpavové listy": [20, "g", "hrsť púpavových listov"],
  "zeleny-smoothie-so-spenatom-a-ananasom|Sedmokrásky": [5, "g", "hrsť kvetov do smoothie"],
  "zeleny-smoothie-so-spenatom-a-ananasom|Púpavové listy": [20, "g", "hrsť púpavových listov"],
  "hlavkovy-salat|Sedmokrásky": [5, "g", "hrsť kvetov na ozdobu"],
  "tuniakovy-salat-so-zelenymi-fazuľkami|Paradajky cherry": [90, "g", "3 cherry paradajky ≈ 45 g; „ks“ sa páruje na veľkú paradajku"],
  "farebny-salat-s-pecenou-zeleninou|Mrkva": [640, "g", "8 mrkiev na 15 porcií"],
  "mandlove-kari-s-baby-kukurickami|Baby kukurica": [240, "g", "16 baby kukuričiek ≈ 15 g/ks"],
  "losos-s-quinoa-a-zeleninou|Paradajky cherry": [360, "g", "12 cherry paradajok á 30 g"],
  "zeleninovy-salat-s-vajickom-a-tofu|Paradajky cherry": [90, "g", "3 cherry paradajky"],
  "fusilli-s-cuketou-a-prosciuttom|Paradajky": [240, "g", "3 paradajky á 80 g"],
  "sosovicovy-salat-s-paradajkou-a-rukolou|Paradajky cherry": [300, "g", "10 cherry paradajok á 30 g"],
  "pestre-pruzky|Paprika rôzne farby": [600, "g", "4 papriky na 4 porcie"],
  "ryzove-rezance-s-hovadzim-a-zeleninou|Šampiňóny": [200, "g", "10 šampiňónov á 20 g"],
  "grilovane-jalapeno-syr-slanina|Plátky slaniny": [210, "g", "14 plátkov slaniny á 15 g"],
  "hubove-knedlicky-do-polievky|Grahamové rožky": [150, "g", "3 rožky á 50 g"],
  "zabijackovy-gulas|Cibuľa": [200, "g", "2 cibule na 2 porcie, nie 800 g"],
  "kacka-pecena-na-zemiakoch-a-batatoch|Cibuľa": [110, "g", "1 cibuľa"],
  "lasagne|Med": [20, "g", "lyžica medu do paradajkovej omáčky — „1 ks“ bol pohár medu (450 g)"],
  "bravcovy-eintopf-s-porom|Maslo": [50, "g", "„25 ks masla“ bolo 25 g; 250 g na 7 porcií je 36 g masla na porciu"],
  "zeleninovy-stir-fry-s-kesu|Soľ": [5, "g", "„1 ks soli“ = lyžička"],
  "cestoviny-s-baklazanom-alla-norma|Soľ": [10, "g", "soľ do vody na cestoviny"],
  "kacacie-stehna-s-bielou-hlavkovou-kapustou-a-knedlou|Soľ": [8, "g", "0,5 PL soli = 8 g, nie 1 kg"],
  "moje-nadychane-knedle|Soľ": [8, "g", "lyžička soli do knedlí"],
  "bravcove-rezne-s-hubovou-omackou|Bravčová krkovička": [400, "g", "2 rezne po 200 g (recept je na 2 porcie)"],
  "treska-pecena-s-paradajkami|Ryba biela": [400, "g", "2 filety po 200 g"],
  "paella-valencia|Krevety": [200, "g", "10 kreviet ≈ 200 g"],
  "garlic-butter-shrimp|Krevety": [200, "g", "porcia kreviet; „36 ks“ × balenie bolo 7,2 kg"],
  "garlic-butter-shrimp|Maslo": [30, "g", "0,25 šálky masla na jednu porciu je 57 g; 30 g po prepočte na 1 porciu"],
  "hlivovo-syrova-natierka|Medvedí cesnak": [45, "g", "15 listov medvedieho cesnaku"],
  "farebny-salat-s-pecenou-zeleninou|Ružičkový kel": [300, "g", "10 ružičiek kelu ≈ 300 g, nie 10 hlávok"],
  "kremova-polievka-zo-zeleniny|Ružičkový kel": [180, "g", "6 ružičiek kelu"],
  "hovadzia-podbrusina-pecena-so-zeleninou|Ružičkový kel": [180, "g", "6 ružičiek kelu"],
  "kelovy-privarok|Menší kel": [600, "g", "jeden menší kel ≈ 600 g, nie 900 g"],
  "mix-salat-s-vajickami-na-tvrdo|Zelená cibuľka": [60, "g", "6 stebiel jarnej cibuľky, nie 6 cibúľ"],
  "mangovo-pomarancove-smoothie|Pomaranč": [260, "g", "2 pomaranče — pôvodné „50 ml“ bola šťava"],
  "cviklova-polievka|Cvikla": [600, "g", "5 stredných cvikiel ≈ 600 g"],
  "cviklovy-salat-s-ananasom-alebo-cicerom|Cvikla": [600, "g", "5 stredných cvikiel"],
  "kopcek-zdravia|Cvikla": [150, "g", "jedna cvikla"],
  "orzo-salat|Šalát": [150, "g", "jedna hlávka šalátu, nie 6"],
  "mandlove-kari-s-baby-kukurickami|Baby kukurica": [240, "g", "16 baby kukuričiek ≈ 240 g"],
  "pikantny-mangold-s-cukinou-a-chorizom|Mangold": [300, "g", "4 listy mangoldu"],
  "cestovina-s-dusenym-kalerabom|Mladé kaleráby": [450, "g", "3 mladé kaleráby ≈ 450 g"],
  "rajcinova-polievka-s-ryzou|Paradajky": [600, "g", "10 stredných paradajok ≈ 600 g pri 4 porciách"],
  "zapekane-cukety-s-paradajkami-a-mozzarellou|Paradajky": [240, "g", "4 paradajky na 1 porciu"],
  "tvarohova-natierka-s-medom-a-orechmi|Sladkokyslá uhorka": [60, "g", "1 nakladaná uhorka, nie šalátová"],
  "studeny-cestovinovy-salat-feta-oliv|Šalátová uhorka": [300, "g", "1 uhorka na 2 porcie"],
  "studeny-cestovinovy-salat-feta-oliv|Paradajky": [300, "g", "5 malých paradajok"],
  "domaci-smotanovy-syr|Sedliacky jogurt (3,5 % tuku)": [500, "g", "500 g jogurtu dá ~180 g syra"],
  "treska-s-kuracou-pecenou|Kuracia pečeň": [200, "g", "porcia pečienok"],
  "treska-s-kuracou-pecenou|Treska": [200, "g", "jedna porcia tresky"],
  "kacka-pecena-na-zemiakoch-a-batatoch|Zemiak": [300, "g", "recept je na 1 porciu"],
  "kacka-pecena-na-zemiakoch-a-batatoch|Bataty": [200, "g", "recept je na 1 porciu"],
  "kokosovy-karamel|Kokosové mlieko z plechovky": [400, "g", "plechovka; deklarácia je na celý recept"],
  "ovsena-kasa-s-brusnicami-a-orechmi|Mlieko": [300, "g", "3 dcl mlieka na jednu kašu"],
  "cviklovo-vajickovy-salat|Plátkový syr": [100, "g", "5 plátkov syra (á 20 g)"],
  "cviklovo-vajickovy-salat|Šunka": [120, "g", "8 plátkov šunky (á 15 g)"],
  "domace-pecivo|Soľ": [15, "g", "soľ do cesta na 18 kusov pečiva"],
  "harula|Fazuľa biela sterilizovaná": [400, "g", "jedna plechovka, nie dve"],
  "smoothie-z-hrozna-citrona-a-ananasu|Hrozno": [120, "g", "hrsť hrozna do smoothie"],
  "zeleny-smoothie-s-uhorkou|Sedmokrásky": [5, "g", "hrsť kvetov do smoothie — 600 g je nezmysel"],
  "zeleny-smoothie-s-uhorkou|Púpavové listy": [20, "g", "hrsť púpavových listov"],
  "zeleny-smoothie-so-spenatom-a-ananasom|Sedmokrásky": [5, "g", "hrsť kvetov do smoothie"],
  "zeleny-smoothie-so-spenatom-a-ananasom|Púpavové listy": [20, "g", "hrsť púpavových listov"],
  "hlavkovy-salat|Sedmokrásky": [5, "g", "hrsť kvetov na ozdobu"],
  "tuniakovy-salat-so-zelenymi-fazuľkami|Paradajky cherry": [90, "g", "3 cherry paradajky ≈ 45 g; „ks“ sa páruje na veľkú paradajku"],
  "farebny-salat-s-pecenou-zeleninou|Mrkva": [640, "g", "8 mrkiev na 15 porcií"],
  "mandlove-kari-s-baby-kukurickami|Baby kukurica": [240, "g", "16 baby kukuričiek ≈ 15 g/ks"],
  "losos-s-quinoa-a-zeleninou|Paradajky cherry": [360, "g", "12 cherry paradajok á 30 g"],
  "zeleninovy-salat-s-vajickom-a-tofu|Paradajky cherry": [90, "g", "3 cherry paradajky"],
  "fusilli-s-cuketou-a-prosciuttom|Paradajky": [240, "g", "3 paradajky á 80 g"],
  "sosovicovy-salat-s-paradajkou-a-rukolou|Paradajky cherry": [300, "g", "10 cherry paradajok á 30 g"],
  "pestre-pruzky|Paprika rôzne farby": [600, "g", "4 papriky na 4 porcie"],
  "ryzove-rezance-s-hovadzim-a-zeleninou|Šampiňóny": [200, "g", "10 šampiňónov á 20 g"],
  "grilovane-jalapeno-syr-slanina|Plátky slaniny": [210, "g", "14 plátkov slaniny á 15 g"],
  "hubove-knedlicky-do-polievky|Grahamové rožky": [150, "g", "3 rožky á 50 g"],
  "zabijackovy-gulas|Cibuľa": [200, "g", "2 cibule na 2 porcie, nie 800 g"],
  "kacka-pecena-na-zemiakoch-a-batatoch|Cibuľa": [110, "g", "1 cibuľa"],
  "lasagne|Med": [20, "g", "lyžica medu do paradajkovej omáčky — „1 ks“ bol pohár medu (450 g)"],
  "bravcovy-eintopf-s-porom|Maslo": [50, "g", "„25 ks masla“ bolo 25 g; 250 g na 7 porcií je 36 g masla na porciu"],
};
// Nálev sa nezje — do jedla prejde len časť. Rieši to pole `vsiaknutie` (B7): výživa sa
// zmenší, nákup a cena zostanú plné (ocot aj cukor musíš kúpiť celé). 0,2 = pätina nálevu,
// čo je bežný odhad pre zaváraninu, z ktorej sa scedí. Kľúč je recept|surovina.
const NALEV_VSIAKNUTIE = {
  "kapustovo-mrkvovy-salat-s-jablkom|Cukor kryštál": 0.2,
  "kapustovo-mrkvovy-salat-s-jablkom|Ocot": 0.2,
  "zavarana-cvikla-s-cuketou-a-cibulou|Cukor kryštál": 0.2,
  "zavarana-cvikla-s-cuketou-a-cibulou|Ocot": 0.2,
  "zavarana-cvikla-s-cuketou-a-cibulou|Soľ": 0.2,
  "nakladane-slede|Cukor": 0.2,
  "nakladane-slede|Ocot": 0.2,
  "nakladane-slede|Soľ": 0.2,
  "paradajky-v-octovom-naleve|Ocot vínny": 0.2,
};
// Recepty, kde množstvá sedia na celý recept a chybné je `porcie` (id → [nové porcie, dôvod])
const RUCNE_PORCIE = {
  "harula": [4, "1 kg zemiakov + 1,2 kg fazule je 4 porcie; pri 2 vychádzalo 1100 g jedla na porciu"],
  "pecivo-celozrnny": [12, "bochník z 500 g múky je 12 krajcov, nie jedna porcia"],
  "garlic-butter-shrimp": [2, "0,25 šálky masla a 200 g kreviet sú dve porcie"],
  "domace-arasidove-maslo": [4, "400 g arašidov dá 4 porcie po 100 g — deklarácia je na 100 g"],
  "kokosovy-karamel": [4, "plechovka kokosového mlieka dá 4 porcie — deklarácia je na 100 g"],
  "mushroom-risotto": [4, "1,5 l vývaru a 2 hrste ryže je rizoto pre štyroch (TheMealDB)"],
  "listkove-medvedie-slimaciky": [4, "balenie lístkového cesta dá 4 porcie slimáčikov"],
  "kacka-pecena-na-zemiakoch-a-batatoch": [2, "200 g kačice a pol kila zemiakov s batatmi sú dve porcie"],
  "ryzovy-salat-s-fetou-a-olivami": [4, "180 g ryže, 400 g cíceru a 200 g fety je šalát pre štyroch"],
  "zemiakovy-gulas": [4, "4 zemiaky, 400 g fazule a 2 špekáčiky sú štyri porcie"],
};
// Zjavne chybné `kcal_na_porciu` — výnimka z B4, každá s dôvodom
const RUCNE_KCAL = {
  "domace-arasidove-maslo": [588, "arašidové maslo má 588 kcal/100 g; 2597 bolo za celých 400 g"],
  "kokosovy-karamel": [330, "kokosový karamel ~330 kcal/100 g; 1198 bolo za celú plechovku"],
  "mangovo-pomarancove-smoothie": [242, "2 pomaranče + 200 g manga = 242 kcal; 38 bolo za 50 ml šťavy"],
  "garlic-butter-shrimp": [207, "107 kcal je menej než samotné krevety s maslom (100 g + 15 g = 207 kcal)"],
  // Deklarácie, ktoré popiera vlastný recept: všetky suroviny napárované, žiadna podozrivá
  // gramáž, a napriek tomu je deklarované číslo o polovicu nižšie než to, čo je v miske.
  "sendvic-croque-monsieur": [498, "2 plátky toastu, šunka, gruyère, bešamel a maslo dajú ~500 kcal, nie 260"],
  "cuketova-omeleta": [488, "120 g Lučiny, 50 g grana padano, 50 g sušených paradajok a 4 vajcia na 2 porcie"],
  "hruskova-salatova-miska-s-orechmi-a-syrom": [608, "100 g pizzového cesta na porciu + šunka, kura, ementál, parmezán, olej"],
  "kuraci-salat-s-ovocim": [554, "400 g kuracieho, 100 g mandlí a 100 g arašidov na 5 porcií"],
  "olivova-natierka-tapenade": [368, "14 kcal na porciu je pod hmotnosťou 100 g syra bambino"],
  "seitan-steak-na-bazalkovom-fenikli": [319, "15 kcal na porciu je pod 200 g seitanového steaku"],
  "bylinkovo-cesnakova-natierka-na-chlieb": [104, "14 kcal je menej než 30 g syrokrému s maslom"],
};

// ── načítanie a zápis bez preformátovania ────────────────────────────────────────────────
function nacitaj() {
  return fs.readdirSync(DIR).filter(f => f.endsWith(".json")).sort().map(f => {
    const txt = fs.readFileSync(path.join(DIR, f), "utf8");
    const o = JSON.parse(txt);
    const m = txt.match(/\n([ \t]*)"/);
    Object.defineProperty(o, "_f", { value: f, enumerable: false });
    Object.defineProperty(o, "_ind", { value: m ? (m[1].length || 1) : 1, enumerable: false });
    Object.defineProperty(o, "_orig", { value: txt, enumerable: false });
    return o;
  });
}
function zapis(r) {
  const txt = JSON.stringify(r, null, r._ind) + "\n";
  JSON.parse(txt);
  if (txt === r._orig) return false;
  if (!DRY) fs.writeFileSync(path.join(DIR, r._f), txt, "utf8");
  return true;
}
// pôvodné (zberové) verzie receptov z commitu BASELINE
let BASE = {};
try {
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "mnoz-"));
  cp.execSync(`git archive ${BASELINE} recepty | tar -x -C ${tmp}`, { cwd: path.join(__dirname, ".."), stdio: "pipe" });
  for (const f of fs.readdirSync(path.join(tmp, "recepty"))) {
    try { BASE[f] = JSON.parse(fs.readFileSync(path.join(tmp, "recepty", f), "utf8")); } catch (e) {}
  }
} catch (e) { console.error("POZOR: baseline z gitu sa nedá načítať (" + e.message.split("\n")[0] + ") — trieda KS_BALENIE sa preskočí."); }

const R = nacitaj();
const gramov = (i, p) => { try { return app.gramy(i, p) || 0; } catch (e) { return 0; } };
// Medián gramov na porciu pre každú potravinu. Prepočítava sa po každom prechode: kým sú v
// databáze pokazené hodnoty, ťahajú medián hore a schovávajú ďalších vinníkov (4 recepty
// s lasagne, 3 z nich po kilách → medián 462 g/porcia). Preto skript beží dovtedy, kým sa
// niečo mení.
const MED = {}, N = {};
function prepocitajMediany() {
  const zoz = {};
  for (const r of R) { const por = r.porcie || 1;
    for (const i of r.ingrediencie || []) { const p = app.najdiPotravinu(i.nazov); const g = gramov(i, p);
      if (p && g > 0) (zoz[p.kluc] = zoz[p.kluc] || []).push(g / por); } }
  for (const k in MED) { delete MED[k]; delete N[k]; }
  for (const k in zoz) { const a = zoz[k].sort((x, y) => x - y); MED[k] = a[a.length >> 1]; N[k] = a.length; }
}

const kcalReceptu = r => (r.ingrediencie || []).reduce((a, i) => {
  const p = app.najdiPotravinu(i.nazov);
  return a + (p ? gramov(i, p) * (p.kcal || 0) / 100 * app.vsiaknuteho(i) : 0); }, 0) / (r.porcie || 1);
const gPorcie = r => (r.ingrediencie || []).reduce((a, i) =>
  a + (LEGITIMNE.test(i.nazov) ? 0 : gramov(i, app.najdiPotravinu(i.nazov))), 0) / (r.porcie || 1);
const strop = p => (N[p.kluc] >= MIN_VZORKA ? Math.max(VINNIK_NASOBOK * MED[p.kluc], VINNIK_PODLAHA) : G_PORCIA);
// Druhá, nezávislá kontrola vinníka: jedna surovina nesmie sama dať viac kalórií, než má CELÁ
// porcia podľa kurátorovaného `kcal_na_porciu`. Chytá aj prípady, kde je medián databázy
// nepoužiteľný, lebo tú surovinu má málo receptov a väčšina z nich je pokazená rovnako
// („Lasagne plátky“: 4 výskyty, 3 z nich po kilách).
function nadKcal(i, p, r) {
  const dekl = r.kcal_na_porciu || 0; if (!dekl) return false;
  const kc = gramov(i, p) * (p.kcal || 0) / 100 * app.vsiaknuteho(i) / (r.porcie || 1);
  return kc > dekl && gramov(i, p) / (r.porcie || 1) > (MED[p.kluc] || 0);
}

function vahaKusa(p, jed, nazov) {
  const vn = nazov && vahaNazov(nazov); if (vn) return vn;
  const ok = w => w > 0 && w <= VAHA_MAX && !(p && p.balenie_g && w >= p.balenie_g);
  if (jed && /^pl[aá]t/i.test(jed) && p && ok(p.g_za_platok)) return p.g_za_platok;
  if (p && VAHA_KUSA[p.kluc] != null) return VAHA_KUSA[p.kluc];
  if (p && ok(p.g_za_ks)) return p.g_za_ks;
  if (p && ok(p.g_za_platok)) return p.g_za_platok;
  return (p && VAHA_ODDELENIE[p.oddelenie]) || 50;
}
// bola táto gramáž vyrobená z „N ks“ vynásobením balením? vráti N
function zBaleniaKs(r, i, p) {
  const b = BASE[r._f]; if (!b) return null;
  const bi = (b.ingrediencie || []).find(x => x.nazov === i.nazov);
  if (!bi || bi.mnozstvo == null) return null;
  if (!KS_JED.includes((bi.jednotka || "").toLowerCase())) return null;
  if ((i.jednotka || "").toLowerCase() !== "g") return null;
  for (const d of [p && p.balenie_g, 200, 150]) {
    if (d && Math.abs(Math.round(bi.mnozstvo * d) - i.mnozstvo) < 1) return { n: bi.mnozstvo, jed: bi.jednotka, d };
  }
  return null;
}

const zmeny = [], triedy = {};
let zvysok = [];
const zmenene_subory = new Set();
for (let prechod = 1; prechod <= 6; prechod++) {
prepocitajMediany();
zvysok = [];
const predPoctom = zmeny.length;
for (const r of R) {
  const por0 = r.porcie || 1;
  const dekl = r.kcal_na_porciu || 0;
  // Trieda KS_BALENIE je chyba konverzie, nie chyba receptu — hľadá sa vo VŠETKÝCH receptoch.
  const maKs = (r.ingrediencie || []).some(i => {
    const p = app.najdiPotravinu(i.nazov); if (!p || i.mnozstvo == null) return false;
    const k = zBaleniaKs(r, i, p); return k && (k.n >= 2 || vahaNazov(i.nazov)); });
  const maRucne = RUCNE_PORCIE[r.id] || RUCNE_KCAL[r.id] ||
    (r.ingrediencie || []).some(i => NALEV_VSIAKNUTIE[r.id + "|" + i.nazov] != null) ||
    (r.ingrediencie || []).some(i => RUCNE[r.id + "|" + i.nazov]);
  if (!maKs && !maRucne && !(dekl && kcalReceptu(r) / dekl > Q_ROZBITY) && !(gPorcie(r) > G_PORCIA)) continue;

  let zmenene = false;
  // `porcie` sa opraví ako prvé — mení referenciu pre všetky ďalšie kontroly v tomto recepte
  if (RUCNE_PORCIE[r.id] && r.porcie !== RUCNE_PORCIE[r.id][0]) {
    zmeny.push({ id: r.id, nazov: r.nazov, sur: "porcie", pred: String(r.porcie), po: String(RUCNE_PORCIE[r.id][0]),
      trieda: "PORCIE", gpPred: Math.round(gPorcie(r)), gpPo: 0, dovod: RUCNE_PORCIE[r.id][1] });
    r.porcie = RUCNE_PORCIE[r.id][0];
    triedy.PORCIE = (triedy.PORCIE || 0) + 1; zmenene = true;
  }
  for (const i of r.ingrediencie || []) {
    if (i.mnozstvo == null) continue;
    const p = app.najdiPotravinu(i.nazov);
    if (!p) continue;
    const rk = RUCNE[r.id + "|" + i.nazov];
    const gp = gramov(i, p) / (r.porcie || 1);
    const ks = rk ? null : zBaleniaKs(r, i, p);
    const podozrive = !LEGITIMNE.test(i.nazov) && (gp > strop(p) || nadKcal(i, p, r));
    // „N ks“ × balenie sa prepočítava vždy, keď N ≥ 2 — dve celé balenia masla či syra do
    // jedného receptu nikto nedáva, tá konverzia je pokazená bez ohľadu na to, ako veľký je
    // výsledok. Pri N ≤ 1 je „1 ks“ = jedno balenie vierohodné (kelímok smotany), takže sa
    // mení, len keď je aj tak podozrivé alebo ide o vrecúško (vanilkový cukor v kilovom balení).
    const ksPrepocitat = ks && (ks.n >= 2 || podozrive || vahaNazov(i.nazov));
    if (!rk && !ksPrepocitat && !podozrive) continue;
    const pred = i.mnozstvo + " " + i.jednotka;
    let trieda = null, novy = null, jed = i.jednotka;
    if (rk) { trieda = "RUCNE"; novy = rk[0]; jed = rk[1]; }
    else if (ksPrepocitat) { trieda = "KS_BALENIE"; novy = Math.max(1, Math.round(ks.n * vahaKusa(p, ks.jed, i.nazov))); jed = "g"; }
    else {
      const j = (i.jednotka || "").toLowerCase();
      if ((j === "g" || j === "ml") && i.mnozstvo >= 1000)
        for (const d of [10, 100]) { const v = i.mnozstvo / d;
          if (v / (r.porcie || 1) <= strop(p)) { trieda = "DESATINNA"; novy = Math.round(v); break; } }
    }
    if (novy == null) { zvysok.push({ id: r.id, nazov: r.nazov, sur: i.nazov, m: pred, gp: Math.round(gp), med: Math.round(MED[p.kluc] || 0), n: N[p.kluc] || 0 }); continue; }
    if (novy === i.mnozstvo && jed === i.jednotka) continue;
    i.mnozstvo = novy; i.jednotka = jed; zmenene = true;
    triedy[trieda] = (triedy[trieda] || 0) + 1;
    zmeny.push({ id: r.id, nazov: r.nazov, sur: i.nazov, pred, po: novy + " " + jed, trieda,
      gpPred: Math.round(gp), gpPo: Math.round(gramov(i, p) / (r.porcie || 1)),
      dovod: rk ? rk[2] : (trieda === "KS_BALENIE" ? "„N ks“ × balenie → N × váha kusa" : "presunutá desatinná čiarka") });
  }
  for (const i of r.ingrediencie || []) {
    const v = NALEV_VSIAKNUTIE[r.id + "|" + i.nazov];
    if (v == null || i.vsiaknutie === v) continue;
    i.vsiaknutie = v; zmenene = true;
    triedy.VSIAKNUTIE = (triedy.VSIAKNUTIE || 0) + 1;
    zmeny.push({ id: r.id, nazov: r.nazov, sur: i.nazov, pred: "bez vsiaknutia", po: "vsiaknutie " + v,
      trieda: "VSIAKNUTIE", gpPred: 0, gpPo: 0, dovod: "nálev sa scedí — do jedla prejde asi pätina" });
  }
  if (RUCNE_KCAL[r.id] && r.kcal_na_porciu !== RUCNE_KCAL[r.id][0]) {
    zmeny.push({ id: r.id, nazov: r.nazov, sur: "kcal_na_porciu", pred: String(r.kcal_na_porciu),
      po: String(RUCNE_KCAL[r.id][0]), trieda: "DEKLARACIA", gpPred: 0, gpPo: 0, dovod: RUCNE_KCAL[r.id][1] });
    r.kcal_na_porciu = RUCNE_KCAL[r.id][0]; delete r.kcal_zdroj;
    triedy.DEKLARACIA = (triedy.DEKLARACIA || 0) + 1; zmenene = true;
  }
  if (zmenene && zapis(r)) zmenene_subory.add(r._f);
}
  if (zmeny.length === predPoctom) break;
}



// ── kcal_zdroj: "vypocet" — dopočítané, nie kurátorované ─────────────────────────────────
// 66 receptov má `kcal_zdroj: "vypocet"`: ich `kcal_na_porciu` nikto neoveroval, dopočítal ho
// scripts/dopocitaj_kcal.js zo surovín. Keď sa suroviny opravia, je to číslo zastarané a
// pravidlo B4 sa naň nevzťahuje — nie je čo kurátorovať. Prepočíta sa znova.
prepocitajMediany();
for (const r of R) {
  if (r.kcal_zdroj !== "vypocet" || !r.kcal_na_porciu) continue;
  const ing = (r.ingrediencie || []).filter(i => i.mnozstvo != null);
  if (!ing.length) continue;
  if (ing.some(i => { const p = app.najdiPotravinu(i.nazov); return !p || !(gramov(i, p) > 0); })) continue;
  const kc = Math.round(kcalReceptu(r));
  if (kc < 3 || kc > 1200 || kc === r.kcal_na_porciu) continue;
  if (Math.abs(kc / r.kcal_na_porciu - 1) <= 0.05) continue;
  zmeny.push({ id: r.id, nazov: r.nazov, sur: "kcal_na_porciu", pred: String(r.kcal_na_porciu), po: String(kc),
    trieda: "PREPOCET", gpPred: 0, gpPo: 0, dovod: "kcal_zdroj = vypocet (nekurátorované) — dopočet po oprave surovín" });
  r.kcal_na_porciu = kc;
  triedy.PREPOCET = (triedy.PREPOCET || 0) + 1;
  if (zapis(r)) zmenene_subory.add(r._f);
}

// Poznámka k zvyšku rozdielu nákup/plán: po oprave množstiev zostáva ~15 %, ktoré NIE JE
// chybou množstiev — je to systematický sklon kurátorovaného `kcal_na_porciu` byť nižší než
// dopočet zo surovín, zosilnený tým, že generátor vyberá recepty podľa deklarovaných kcal, a
// teda uprednostňuje práve tie podhodnotené (výberové skreslenie). Hromadné prepísanie
// deklarácií to síce zráža na 1,11×, ale zhoršuje metriky generátora (medián bielkovín
// 118,5 → 116,1 g, dni pod 80 g bielkovín 0 → 2,9 %), takže sa NEROBÍ. Menia sa len
// deklarácie v RUCNE_KCAL — tie, kde je číslo preukázateľne mimo.


const suborov = zmenene_subory.size;
console.log((DRY ? "[DRY] " : "") + `Opravených receptov: ${suborov} · zmien: ${zmeny.length}`);
console.log("Triedy: " + Object.entries(triedy).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
console.log(`Podozrivé, ktoré pravidlo nevyriešilo: ${zvysok.length}`);
console.log("\nNajvýraznejšie opravy:");
zmeny.slice(0, 45).forEach(z => console.log(
  `  ${z.gpPred} → ${z.gpPo} g/porcia · ${z.sur}: ${z.pred} → ${z.po} · [${z.trieda}] ${z.nazov} (${z.id})`));
if (zvysok.length) { console.log("\nZvyšok (ručne):");
  zvysok.sort((a, b) => b.gp - a.gp).slice(0, 40).forEach(z =>
    console.log(`  ${z.gp} g/porcia (medián ${z.med}, n=${z.n}) · ${z.sur} ${z.m} · ${z.nazov} (${z.id})`)); }
fs.writeFileSync(path.join(__dirname, "..", "export", "opravy_mnozstva.json"), JSON.stringify({ zmeny, zvysok }, null, 1));
