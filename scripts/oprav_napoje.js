#!/usr/bin/env node
// Nápoje a kokteily — pozri report-cistka-dat.md, sekcia „Nápoje a koktaily“.
// 1) Maže 54 kokteilov z TheCocktailDB: neprekladané anglické názvy (zaberali prvú obrazovku
//    Receptov, ktorá sa radí abecedne), strojové prevody unc na ml (14,8 ml / 44,4 ml),
//    šablónový popis („Kokteil. Základ: …“), dva opakované „tipy“ a nezmyselné ozdoby.
//    Do jedálnička sa dostať nemôžu — app.js:1072 kategórie Kokteil a Nápoj z poolu vyraďuje.
// 2) Ponecháva 9 kurátorovaných kokteilov (Kaufland FOOD magazín, Varecha) — slovenské názvy,
//    reálne množstvá, vlastný popis aj tip.
// 3) Maže 5 rozbitých nealko nápojov a opravuje texty a množstvá u zvyšku.
"use strict";
const L = require("./lib_recepty");
const DRY = process.argv.includes("--dry");

const ZMAZ_NAPOJE = {
  "cola-s-citronom": "cola so siedmimi kvapkami citróna nie je recept",
  "jogurtovy-chladeny-napoj": "ingrediencia „Fruit 240 ml“ — neprekladaný zástupný text z importu",
  "kiwi-papaya-smoothie": "dve suroviny v ml („Papaya 12,5 ml“), anglický názov, žiadny postup",
  "lassi-khara-slane-indicke-lassi": "postup pracuje s karí listami, ktoré v surovinách nie sú",
  "egg-cream-sodovy-napoj-so-sirupom": "„Čokoláda 2 PL“ ako sirup, 177,4 ml mlieka — nezmyselné dáta",
};

// id → [novýNázov, novýPopis]
const OPRAV = {
  "banana-strawberry-shake": ["Jahodovo-banánový šejk",
    "Hustý ovocný šejk z jahôd, banánu a bieleho jogurtu — hotový za dve minúty v mixéri."],
  "afterglow": ["Afterglow (nealko drink s grenadínou)",
    "Nealkoholický drink z grenadíny, pomarančovej šťavy a ananásu, podávaný na ľade."],
  "bananovo-melonove-smoothie": [null,
    "Dvojzložkové smoothie z cantaloupe melóna a banánu — sladké bez pridaného cukru."],
  "citronovy-napoj-so-zazvorovou-limonadou": [null,
    "Citrónový nápoj dolievaný zázvorovou limonádou — ostrý, sviežy, nealkoholický."],
  "horuca-cokolada-so-skoricou": [null,
    "Hustá horúca čokoláda šľahaná vo vodnom kúpeli, dochutená škoricou."],
  "horuca-cokolada-so-smotanou": [null,
    "Hustá horúca čokoláda s maslom, vanilkou a smotanou, ozdobená marshmallows."],
  "jahodovo-jablkovy-chladeny-napoj": [null,
    "Chladený nápoj z jahôd naložených v cukre, jablkovej šťavy a sódy — na celý džbán."],
  "mangovo-pomarancove-smoothie": [null,
    "Smoothie z manga a pomaranča — dve suroviny, žiadny pridaný cukor."],
  "matovo-ovocne-smoothie": ["Mätovo-čokoládový šejk",
    "Studený šejk z mlieka, čokolády a čerstvej mäty."],
  "melya-espresso-s-medom-a-kakaom": [null,
    "Melya — espresso rozmiešané s medom a nesladeným kakaom, podávané so smotanou."],
  "smoothie-z-hrozna-citrona-a-ananasu": [null,
    "Smoothie z hrozna s citrónom a ananásom — svieže a ľahké."],
  "zazvorovo-citronovy-napoj-na-prechladnutie": [null,
    "Horúci nápoj zo zázvorovej a citrónovej šťavy — klasika na prechladnutie."],
};

// id → [názovSuroviny, nováHodnota, nováJednotka]  (strojové prevody unc na ml pri pevných surovinách)
const MNOZSTVA = [
  ["bananovo-melonove-smoothie", "Banán", 1, "ks"],
  ["bananovo-melonove-smoothie", "Cantaloupe", 500, "g"],
  ["mangovo-pomarancove-smoothie", "Mango", 200, "g"],
  ["mangovo-pomarancove-smoothie", "Pomaranč", 2, "ks"],
  ["smoothie-z-hrozna-citrona-a-ananasu", "Hrozno", 240, "g"],
  ["smoothie-z-hrozna-citrona-a-ananasu", "Citrón", 0.5, "ks"],
  ["smoothie-z-hrozna-citrona-a-ananasu", "Ananás", 100, "g"],
  ["horuca-cokolada-so-skoricou", "Čokoláda", 90, "g"],
  ["horuca-cokolada-so-skoricou", "Vajcia", 1, "ks"],
  ["horuca-cokolada-so-smotanou", "Čokoláda", 200, "g"],
  ["jahodovo-jablkovy-chladeny-napoj", "Citrón", 1, "ks"],
  ["jahodovo-jablkovy-chladeny-napoj", "Jablko", 1, "ks"],
  ["jahodovo-jablkovy-chladeny-napoj", "Jahody", 240, "g"],
  ["jahodovo-jablkovy-chladeny-napoj", "Jablková šťava", 500, "ml"],
  ["banana-strawberry-shake", "Jahody", 150, "g"],
  ["zazvorovo-citronovy-napoj-na-prechladnutie", "Citrón", 0.5, "ks"],
  ["afterglow", "Ananás", 100, "g"],
];

const R = L.nacitaj();
const podlaId = Object.fromEntries(R.map(r => [r.id, r]));
let zmazKok = 0, zmazNap = 0, upr = 0, mn = 0;

for (const r of R) {
  if (r.kategoria === "Kokteil" && /TheCocktailDB/.test(r.zdroj || "")) {
    if (!DRY) L.zmaz(r); zmazKok++; continue;
  }
  if (ZMAZ_NAPOJE[r.id]) { if (!DRY) L.zmaz(r); zmazNap++; continue; }
}
for (const [id, [nazov, popis]] of Object.entries(OPRAV)) {
  const r = podlaId[id]; if (!r) { console.error("chýba", id); continue; }
  if (nazov) r.nazov = nazov;
  if (popis) r.popis = popis;
  upr++;
}
for (const [id, nazov, hod, jed] of MNOZSTVA) {
  const r = podlaId[id]; if (!r) continue;
  const i = (r.ingrediencie || []).find(x => x.nazov === nazov);
  if (!i) { console.error("chýba surovina", id, nazov); continue; }
  i.mnozstvo = hod; i.jednotka = jed; mn++;
}
if (!DRY) for (const id of Object.keys(OPRAV)) if (podlaId[id]) L.zapis(podlaId[id]);
console.log((DRY ? "[DRY] " : "") + `zmazané kokteily: ${zmazKok} · zmazané nápoje: ${zmazNap} · upravené texty: ${upr} · opravené množstvá: ${mn}`);
