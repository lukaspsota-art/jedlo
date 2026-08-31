// Prevod slovenského l-príčastia (minulý čas) na rozkazovací spôsob 2. os. j. č.
// Používa scripts/oprav_postup.js pri prepise varechovského rozprávania
// („Ja som pridala cukor“ → „Pridaj cukor“).
"use strict";

// základ (bez -l/-la/-lo/-li) → rozkazovací spôsob
const ZAKLADY = {
  "da": "daj", "prida": "pridaj", "vloži": "vlož", "polož": "polož", "poklad": "poklaď",
  "nakrája": "nakrájaj", "pokrája": "pokrájaj", "krája": "krájaj", "rozkrája": "rozkrájaj",
  "zmieša": "zmiešaj", "premieša": "premiešaj", "vmieša": "vmiešaj", "primieša": "primiešaj",
  "mieša": "miešaj", "vymieša": "vymiešaj", "rozmieša": "rozmiešaj", "zamieša": "zamiešaj",
  "uvari": "uvar", "vari": "var", "povari": "povar", "rozvari": "rozvar", "zavari": "zavar",
  "prevari": "prevar", "dovari": "dovar", "necha": "nechaj", "posypa": "posyp", "sypa": "sypaj",
  "zalia": "zalej", "nalia": "nalej", "prilia": "prilej", "vylia": "vylej", "zlia": "zlej",
  "vybra": "vyber", "ozdobi": "ozdob", "podáva": "podávaj", "servírova": "servíruj",
  "rozmixova": "rozmixuj", "zmixova": "zmixuj", "mixova": "mixuj",
  "rozohria": "rozohrej", "predhria": "predhrej", "zohria": "zohrej",
  "osoli": "osoľ", "posoli": "posoľ", "soli": "soľ", "okoreni": "okoreň", "prikry": "prikry",
  "scedi": "sceď", "precedi": "preceď", "vyšľaha": "vyšľahaj", "šľaha": "šľahaj",
  "nastrúha": "nastrúhaj", "strúha": "strúhaj", "olúpa": "olúp", "ošúpa": "ošúp",
  "umy": "umy", "opláchol": "opláchni", "rozpusti": "rozpusť", "natre": "natri",
  "rozotre": "rozotri", "potre": "potri", "stiahol": "stiahni", "odstavi": "odstav",
  "obali": "obaľ", "naklepa": "naklep", "vytvarova": "vytvaruj", "tvarova": "tvaruj",
  "rozvaľka": "rozvaľkaj", "vyvaľka": "vyvaľkaj", "vaľka": "vaľkaj",
  "nasypa": "nasyp", "vsypa": "vsyp", "vysypa": "vysyp", "prisypa": "prisyp",
  "odloži": "odlož", "dusi": "dus", "podusi": "podus", "restova": "restuj", "orestova": "orestuj",
  "smaži": "smaž", "osmaži": "osmaž", "opieka": "opekaj", "opeka": "opekaj",
  "vypracova": "vypracuj", "spracova": "spracuj", "zabali": "zabaľ", "zavinu": "zaviň",
  "prepláchol": "prepláchni", "namoči": "namoč", "dochuti": "dochuť", "ochuti": "ochuť",
  "očisti": "očisti", "priprava": "priprav", "pripravi": "priprav", "urobi": "urob",
  "spravi": "sprav", "použi": "použi", "pridáva": "pridávaj", "zahusti": "zahusti",
  "vymasti": "vymasti", "pomel": "pomeľ", "zomlel": "zomeľ", "pomlel": "pomeľ",
  "vydlaba": "vydlab", "vydlabá": "vydlab", "popuči": "popuč", "roztlači": "roztlač",
  "rozdeli": "rozdeľ", "prekroji": "prekroj", "rozreza": "rozrež", "nareza": "narež",
  "zohna": "zohni", "postavi": "postav", "vyleji": "vylej", "prela": "prelej", "prelia": "prelej",
  "odkrojí": "odkroj", "odkroji": "odkroj", "odreza": "odrež", "posekal": "posekaj",
  "naseka": "nasekaj", "poseka": "posekaj", "seka": "sekaj", "zmrazi": "zmraz",
  "vychladi": "vychlaď", "schladi": "schlaď", "prehria": "prehrej", "dopiekol": "dopeč",
  "prekry": "prikry", "prepáli": "prepáľ", "zapeka": "zapekaj", "zapiekol": "zapeč",
  "namaza": "namaž", "vymaza": "vymasť", "poliala": "polej", "polia": "polej",
  "obráti": "obráť", "otoči": "otoč", "poobraca": "poobracaj", "premiestni": "premiestni",
  "skontrolova": "skontroluj", "necháva": "nechávaj", "vyklopi": "vyklop", "preklopi": "preklop",
  "rozrobi": "rozrob", "pokračova": "pokračuj", "opraži": "opraž", "praži": "praž",
  "upraži": "upraž", "zapraži": "zapraž", "vymiesi": "vymies", "zamiesi": "zamies",
  "osuši": "osuš", "usuši": "usuš", "utre": "utri", "navrstvi": "navrstvi", "uloži": "ulož",
  "zakry": "zakry", "odstráni": "odstráň", "vyhodi": "vyhoď", "prisoli": "prisoľ",
  "zjemni": "zjemni", "prevráti": "prevráť", "marinova": "marinuj", "zamarinova": "zamarinuj",
  "blanšírova": "blanšíruj", "pokvapka": "pokvapkaj", "zredukova": "zredukuj",
  "nastavi": "nastav", "zapol": "zapni", "vypol": "vypni", "ohria": "ohrej",
  "okrája": "okrájaj", "ostrúha": "ostrúhaj", "podával": "podávaj", "zaprava": "zaprav",
  "prepasírova": "prepasíruj", "precvič": "precvič", "odšťavi": "odšťav", "vytlači": "vytlač",
  "pretlači": "pretlač", "prelisova": "prelisuj", "zahustí": "zahusti", "nariedi": "narieď",
  "ubra": "uber", "doplni": "doplň", "vyplni": "vyplň", "naplni": "naplň", "plni": "plň",
};
// nepravidelné celé tvary
const TVARY = {
  "dal": "daj", "dala": "daj", "dali": "daj",
  "opiekol": "opeč", "opiekla": "opeč", "opiekli": "opeč",
  "upiekol": "upeč", "upiekla": "upeč", "upiekli": "upeč",
  "piekol": "peč", "piekla": "peč", "piekli": "peč", "piekol som": "peč",
  "zmiesil": "zmies", "vymiesil": "vymies", "miesil": "mies", "miesila": "mies",
  "natrel": "natri", "natrela": "natri", "natreli": "natri",
  "potrel": "potri", "potrela": "potri", "rozotrel": "rozotri", "rozotrela": "rozotri",
  "stiahol": "stiahni", "stiahla": "stiahni", "vytiahol": "vytiahni", "vytiahla": "vytiahni",
  "zaliala": "zalej", "zalial": "zalej", "naliala": "nalej", "nalial": "nalej",
  "priliala": "prilej", "prilial": "prilej", "vyliala": "vylej", "vylial": "vylej",
  "zliala": "zlej", "zlial": "zlej", "preliala": "prelej", "prelial": "prelej",
  "poliala": "polej", "polial": "polej", "vybral": "vyber", "vybrala": "vyber",
  "zomlel": "zomeľ", "zomlela": "zomeľ", "pomlel": "pomeľ", "pomlela": "pomeľ",
  "prepláchol": "prepláchni", "prepláchla": "prepláchni",
  "opláchol": "opláchni", "opláchla": "opláchni",
  "rozpustil": "rozpusť", "rozpustila": "rozpusť",
  "dopiekol": "dopeč", "dopiekla": "dopeč", "zapiekol": "zapeč", "zapiekla": "zapeč",
  "začal": "začni", "začala": "začni", "nechal": "nechaj", "nechala": "nechaj", "nechali": "nechaj",
};

const KONC = ["li", "la", "lo", "l"];

// vráti rozkazovací tvar pre l-príčastie, alebo null
function rozkaz(slovo) {
  const s = slovo.toLowerCase();
  if (TVARY[s]) return TVARY[s];
  for (const k of KONC) {
    if (!s.endsWith(k)) continue;
    const z = s.slice(0, -k.length);
    if (ZAKLADY[z]) return ZAKLADY[z];
    if (z.endsWith("i") && ZAKLADY[z]) return ZAKLADY[z];
  }
  return null;
}

module.exports = { rozkaz, ZAKLADY, TVARY };
