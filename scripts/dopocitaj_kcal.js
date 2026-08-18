// Dopočíta kcal_na_porciu receptom, ktoré ho nemajú — ale len tam, kde sa VŠETKY suroviny
// s množstvom napárovali na potraviny.json a dajú sa previesť na gramy. Zapíše aj
// kcal_zdroj:"vypocet", aby bolo jasné, že číslo nie je kurátorované, ale odvodené.
//
// Zmysel: appka po oprave B4 verí kcal_na_porciu vždy. Zapísaná hodnota je zároveň kontrolný bod —
// keď sa neskôr zmenia dáta potravín a výpočet sa rozíde o viac ako 10 %, recept sa v detaile
// označí „≈ odhad" a je vidieť, že sa niečo pohlo.
//
//   node scripts/dopocitaj_kcal.js            len vypíše, čo by urobil
//   node scripts/dopocitaj_kcal.js --zapis    zapíše do recepty/*.json
const fs = require("fs"), path = require("path");
const { load } = require("../test_harness");

const ZAPIS = process.argv.includes("--zapis");
const MIN = 3, MAX = 1200;   // mimo tohto rozsahu radšej nechaj prázdne a nech to niekto pozrie

const app = load({ stav: {} });
const DIR = path.join(__dirname, "..", "recepty");

const kandidati = [], podozrive = [], neuplne = [];
app.RECEPTY.forEach(r => {
  if (r.kcal_na_porciu || r._moj) return;
  const ing = (r.ingrediencie || []).filter(i => i.mnozstvo != null);
  if (!ing.length) { neuplne.push([r.id, "žiadna surovina s množstvom"]); return; }
  const chyba = ing.filter(i => { const p = app.najdiPotravinu(i.nazov); return !p || !(app.gramy(i, p) > 0); });
  if (chyba.length) { neuplne.push([r.id, "nedopočítané: " + chyba.map(i => i.nazov).join(", ")]); return; }
  const kcal = Math.round(app.vyzivaReceptu(r).kcal);
  if (kcal < MIN || kcal > MAX) { podozrive.push([r.id, kcal + " kcal/porcia"]); return; }
  kandidati.push({ id: r.id, kcal });
});

console.log("dopočítateľných: " + kandidati.length + ", podozrivých: " + podozrive.length + ", neúplných: " + neuplne.length);
podozrive.slice(0, 40).forEach(([id, d]) => console.log("  ? " + id + " — " + d));
neuplne.slice(0, 20).forEach(([id, d]) => console.log("  ! " + id + " — " + d));

if (!ZAPIS) { console.log("\n(suchý beh — spusti s --zapis)"); process.exit(0); }

let zapisanych = 0;
for (const { id, kcal } of kandidati) {
  const cesta = path.join(DIR, id + ".json");
  if (!fs.existsSync(cesta)) { console.log("  chýba súbor: " + cesta); continue; }
  const r = JSON.parse(fs.readFileSync(cesta, "utf8"));
  if (r.kcal_na_porciu) continue;
  // pole vlož za „cas" (ak existuje), nech je poradie kľúčov rovnaké ako pri ostatných receptoch
  const novy = {};
  let vlozene = false;
  for (const k of Object.keys(r)) {
    novy[k] = r[k];
    if (k === "cas") { novy.kcal_na_porciu = kcal; novy.kcal_zdroj = "vypocet"; vlozene = true; }
  }
  if (!vlozene) { novy.kcal_na_porciu = kcal; novy.kcal_zdroj = "vypocet"; }
  fs.writeFileSync(cesta, JSON.stringify(novy, null, 2) + "\n", "utf8");
  zapisanych++;
}
console.log("zapísaných: " + zapisanych);
