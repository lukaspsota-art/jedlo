// Import receptov z TheMealDB (otvorené dáta, kanonické názvy jedál).
// Prečo práve tento zdroj: `robots.txt` komerčných portálov (Allrecipes, BBC Good Food, BBC Food,
// Jamie Oliver) dnes zakazuje `anthropic-ai`/`ClaudeBot` → `Disallow: /`, takže sa použiť NESMÚ.
// TheMealDB je verejné API bez takého obmedzenia; `zdroj` + `zdroj_url` nesie atribúciu.
//
// Slovenský text (názov, popis, postup, tipy) NIE JE strojový preklad — píše sa ručne
// do `data_mealdb_davka*.js`. Anglický originál slúži len ako predloha množstiev a poradia krokov.
// `kcal_na_porciu` sa nepíše ručne, dopočíta sa zo surovín rovnakou cestou ako v app.js
// (preto `kcal_zdroj: "vypocet"`) — deklarácia a suroviny tak nemôžu ísť od seba.
//
//   node scripts/import_mealdb.js --dry      len skontroluje a vypíše
//   node scripts/import_mealdb.js --vypis    + tabuľka výživy
//   node scripts/import_mealdb.js            zapíše súbory
"use strict";
const fs = require("fs"), path = require("path");
const { load } = require("../test_harness");

const DRY = process.argv.includes("--dry");
const DIR = path.join(__dirname, "..", "recepty");
const ZDROJ_PREFIX = "TheMealDB";

const DEFS = require("./data_mealdb_davka1");

// Rovnaká brána ako v `nove_recepty_vlna5.js`: krok musí začínať rozkazovacím spôsobom
// 2. osoby jednotného čísla. Zoznam je zámerne uzavretý — infinitív („Nakrájať cibuľu")
// dávku nezapíše a chyba je vidieť hneď, nie až v appke.
const SLOVESA = new Set(["blanšíruj", "dochuť", "doplň", "dus", "nahrej", "nakrájaj", "nalej", "naplň", "nasekaj", "nastrúhaj", "natrhaj", "natri", "nechaj", "obaľ", "ochuť", "okoreň", "olúp", "opeč", "opláchni", "opraž", "orestuj", "osoľ", "osuš", "peč", "podávaj", "podlej", "podus", "pokvapkaj", "pomeľ", "posyp", "potri", "poukladaj", "predhrej", "prekroj", "prelej", "premiešaj", "prepláchni", "pridaj", "prikry", "prilej", "primiešaj", "rozdeľ", "rozmiešaj", "rozmixuj", "rozober", "rozohrej", "rozotri", "rozpáľ", "roztlač", "rozšľahaj", "restuj", "sceď", "servíruj", "skontroluj", "stiahni", "stlač", "umy", "urovnaj", "uvar", "var", "vlož", "vmiešaj", "vsyp", "vyber", "vylož", "vytvaruj", "vytvor", "vytlač", "zabaľ", "zakry", "zalej", "zamiešaj", "zapeč", "zjedz", "zmiešaj", "zohrej", "zroluj", "zľahka",
  // slovesá navyše oproti vlne 5 — všetko rozkazovací spôsob 2. os. j. č.
  "marinuj", "griluj", "posoľ", "pretlač", "vychlaď", "zapraž", "vráť", "odrež", "rozlož",
  "rozpusti", "miesi", "zopakuj", "popichaj", "navŕš", "preceď", "napichaj", "obráť"]);
const prveSlovo = k => k.trim().split(/[\s,.:;]+/)[0].toLowerCase();

function postav(d) {
  const out = {
    id: d.id,
    nazov: d.nazov,
    kategoria: d.kat,
    kuchyna: d.kuchyna,
    zdroj: ZDROJ_PREFIX + " – " + d.en,
    zdroj_url: "https://www.themealdb.com/meal/" + d.mealId,
    porcie: d.porcie || 4,
    cas: d.cas,
    kcal_na_porciu: 0,
    kcal_zdroj: "vypocet",
    popis: d.popis,
    hlavna_surovina: d.hlavna,
    narocnost: d.narocnost || "stredná",
    ingrediencie: d.ing.concat(pantry(d)),
    postup: d.postup,
    tipy: d.tipy,
    foto: "",
    tagy: d.tagy
  };
  return out;
}

// D6 (test_pravidla): pantry staples idú do nákupu ako poznámka — v recepte sú BEZ množstva,
// takže do výživy ani do gramáže porcie nevstupujú. Sladké jedlá soľ a korenie nedostanú.
function pantry(d) {
  if (d.bezPantry) return [];
  const t = (d.tagy || []).join(" ");
  if (/sladké|dezert/.test(t)) return [];
  const out = [{ nazov: "Soľ", mnozstvo: null, jednotka: "podľa chuti", poznamka: "podľa chuti" }];
  out.push({ nazov: "Čierne korenie", mnozstvo: null, jednotka: "podľa chuti", poznamka: "podľa chuti" });
  return out;
}

const app = load({ stav: {} });
// idempotencia: recept, ktorý už zapísal TENTO importér (zdroj začína „TheMealDB"), sa smie
// prepísať; kolízia s cudzím receptom je chyba.
const cudzie = new Set(app.RECEPTY.filter(r => !String(r.zdroj || "").startsWith(ZDROJ_PREFIX)).map(r => r.id));
const uzImportovane = new Map(app.RECEPTY
  .map(r => [String(r.zdroj_url || "").match(/themealdb\.com\/meal\/(\d+)/), r])
  .filter(x => x[0]).map(([m, r]) => [m[1], r.id]));

const chyby = [], riadky = [], hotove = [];

for (const d of DEFS) {
  const r = postav(d);
  if (cudzie.has(r.id)) { chyby.push(`${r.id}: id už používa cudzí recept`); continue; }
  if (hotove.some(x => x.id === r.id)) { chyby.push(`${r.id}: duplicitné id v dávke`); continue; }
  const staryId = uzImportovane.get(String(d.mealId));
  if (staryId && staryId !== r.id) { chyby.push(`${r.id}: meal ${d.mealId} už je v DB ako „${staryId}"`); continue; }

  let g = 0; const nenapar = [];
  for (const ing of r.ingrediencie) {
    const p = app.najdiPotravinu(ing.nazov);
    if (!p) { nenapar.push(ing.nazov); continue; }
    if (ing.mnozstvo == null) continue;
    const gg = app.gramy(ing, p) || 0;
    if (!(gg > 0)) { nenapar.push(ing.nazov + " (0 g)"); continue; }
    if (!/voda|vývar|nálev|marinád|víno/i.test(ing.nazov)) g += gg;
  }
  if (nenapar.length) chyby.push(`${r.id}: nenapárované/0 g — ${nenapar.join(", ")}`);
  const gp = g / r.porcie;
  if (gp > 700) chyby.push(`${r.id}: ${Math.round(gp)} g jedla na porciu (strop 700)`);
  if (r.postup.length < 3) chyby.push(`${r.id}: postup má ${r.postup.length} krokov (min. 3)`);
  r.postup.forEach((k, n) => { if (!SLOVESA.has(prveSlovo(k))) chyby.push(`${r.id}: krok ${n + 1} nezačína rozkazovacím spôsobom — „${k.slice(0, 40)}…"`); });
  if (!r.tipy || r.tipy.length < 10) chyby.push(`${r.id}: chýbajú tipy`);
  if (!r.tagy || !r.tagy.length) chyby.push(`${r.id}: chýbajú tagy`);
  if (!r.hlavna_surovina) chyby.push(`${r.id}: chýba hlavna_surovina`);
  if (!d.mealId) chyby.push(`${r.id}: chýba mealId (bez neho nie je zdroj_url)`);
  if (!d.en) chyby.push(`${r.id}: chýba anglický názov (atribúcia)`);
  hotove.push(r);
  riadky.push({ r, gp });
}

// výživa sa počíta tou istou cestou ako v app.js — harness číta RECEPTY z disku,
// takže nový recept tam ešte nie je.
function vyziva(r) {
  let k = 0, b = 0, vl = 0;
  for (const ing of r.ingrediencie) {
    const p = app.najdiPotravinu(ing.nazov); if (!p || ing.mnozstvo == null) continue;
    const gg = (app.gramy(ing, p) || 0) * (ing.vsiaknutie == null ? 1 : ing.vsiaknutie);
    k += gg * p.kcal / 100; b += gg * (p.bielkoviny || 0) / 100; vl += gg * (p.vlaknina || 0) / 100;
  }
  const n = r.porcie || 1;
  return { k: k / n, b: b / n, vl: vl / n };
}

riadky.forEach(x => {
  const v = vyziva(x.r);
  x.r.kcal_na_porciu = Math.round(v.k);
  x.v = v;
  x.b100 = v.k > 0 ? v.b / (v.k / 100) : 0;
  x.vl100 = v.k > 0 ? v.vl / (v.k / 100) : 0;
  if (v.k < 60) chyby.push(`${x.r.id}: len ${Math.round(v.k)} kcal na porciu`);
  if (v.k > 1100) chyby.push(`${x.r.id}: ${Math.round(v.k)} kcal na porciu — over množstvá`);
});

console.log(`definícií: ${DEFS.length} · pripravených: ${hotove.length} · chýb: ${chyby.length}`);
chyby.forEach(c => console.log("  ✗ " + c));

const podlaKat = {};
riadky.forEach(x => { podlaKat[x.r.kategoria] = (podlaKat[x.r.kategoria] || 0) + 1; });
console.log("podľa kategórie: " + JSON.stringify(podlaKat));

if (process.argv.includes("--vypis")) {
  riadky.forEach(x => console.log(
    `  ${x.r.id.padEnd(40)} ${String(Math.round(x.v.k)).padStart(4)} kcal · B ${x.v.b.toFixed(1).padStart(5)} g (${x.b100.toFixed(1)}/100) · vl ${x.v.vl.toFixed(1).padStart(5)} g (${x.vl100.toFixed(1)}/100) · ${Math.round(x.gp)} g/porcia`));
}

if (chyby.length) { console.log("\nNIČ SA NEZAPÍSALO — najprv oprav chyby."); process.exit(1); }
if (DRY) { console.log("\n(suchý beh — spusti bez --dry)"); process.exit(0); }

hotove.forEach(r => fs.writeFileSync(path.join(DIR, r.id + ".json"), JSON.stringify(r, null, 1) + "\n", "utf8"));
console.log(`\nzapísaných ${hotove.length} súborov do recepty/`);
