// Načítanie a zápis recepty/*.json bez preformátovania.
// Všetkých 1956 súborov je presne `JSON.stringify(obj, null, odsadenie) + "\n"`
// (1880× odsadenie 1, 76× odsadenie 2, žiadne CRLF) — overené roundtripom.
// Preto stačí zapamätať si odsadenie súboru a poradie kľúčov zostane zachované.
"use strict";
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "recepty");

// Polia, ktoré vlastní iný agent — tento modul ich nikdy nemení.
const CUDZIE_POLIA = ["kcal_na_porciu", "kcal_zdroj", "vsiaknutie", "porcie"];

function odsadenie(txt) { const m = txt.match(/\n([ \t]*)"/); return m ? m[1].length || 1 : 1; }

function nacitaj() {
  return fs.readdirSync(DIR).filter(f => f.endsWith(".json")).sort().map(f => {
    const txt = fs.readFileSync(path.join(DIR, f), "utf8");
    const o = JSON.parse(txt);
    Object.defineProperty(o, "_f", { value: f, enumerable: false });
    Object.defineProperty(o, "_ind", { value: odsadenie(txt), enumerable: false });
    Object.defineProperty(o, "_orig", { value: txt, enumerable: false });
    return o;
  });
}

function zapis(r) {
  for (const k of CUDZIE_POLIA) {
    const p = JSON.parse(r._orig);
    if (JSON.stringify(p[k]) !== JSON.stringify(r[k]))
      throw new Error(r._f + ": pokus o zmenu cudzieho poľa „" + k + "“");
  }
  const txt = JSON.stringify(r, null, r._ind) + "\n";
  JSON.parse(txt);                                   // poistka
  if (txt === r._orig) return false;
  fs.writeFileSync(path.join(DIR, r._f), txt, "utf8");
  return true;
}

function zmaz(r) { fs.unlinkSync(path.join(DIR, r._f)); }

const jeSnack = r => r.kategoria === "Snack";        // cudzí agent — nesahať

module.exports = { DIR, nacitaj, zapis, zmaz, jeSnack, CUDZIE_POLIA };
