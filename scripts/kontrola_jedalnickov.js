#!/usr/bin/env node
// Kontrola uložených jedálničkov (jedalnicky/*.json) proti SKUTOČNÉMU app.js.
//
// Overuje to, čo používateľ zistí až v Plánovači alebo v obchode:
//   • existujú všetky id receptov (build to už aj tvrdo vynucuje),
//   • dni sú „0"–„6" a 0 = PONDELOK (app.js: DNI[0]) — plán uložený od nedele
//     by sa načítal posunutý o deň,
//   • dopočítané kcal dňa sedia na ciel_kcal,
//   • ktoré sloty sú prázdne.
//
// Spusti: node scripts/kontrola_jedalnickov.js
// Vráti 1 pri tvrdej chybe (chýbajúce id, zlý kľúč dňa).
const fs = require("fs"), path = require("path");
const ROOT = path.dirname(__dirname);
const app = require(path.join(ROOT, "test_harness")).load({ seed: 42 });

const DNI = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const SLOTY = ["Raňajky", "Obed", "Večera", "Snack"];
const TOLERANCIA = 0.15; // ±15 % okolo cieľa; appka to dorovnáva faktorom 0,85–1,15

let chyby = 0;
const dir = path.join(ROOT, "jedalnicky");
for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".json")).sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const ciel = j.ciel_kcal || 0;
  console.log(`\n${f}  „${j.nazov || j.id}"  cieľ ${ciel || "—"} kcal/deň`);

  const plan = j.plan || {};
  for (const k of Object.keys(plan)) {
    if (!/^[0-6]$/.test(k)) { console.log(`  ✗ neplatný kľúč dňa „${k}" (povolené 0=Po … 6=Ne)`); chyby++; }
  }

  const dni = [];
  for (let d = 0; d < 7; d++) {
    const den = plan[String(d)] || {};
    let kcal = 0;
    const chybaSlot = [];
    for (const s of SLOTY) {
      const v = den[s];
      if (v === undefined) { chybaSlot.push(s); continue; }
      for (const id of (Array.isArray(v) ? v : [v])) {
        const k = app.komponent(id);
        if (!k) { console.log(`  ✗ ${DNI[d]} ${s}: recept „${id}" neexistuje`); chyby++; continue; }
        kcal += app.kcalPorcia(k);
      }
    }
    dni.push({ d, kcal: Math.round(kcal), chybaSlot, prazdny: Object.keys(den).length === 0 });
  }

  const naplnene = dni.filter(x => !x.prazdny);
  for (const x of naplnene) {
    const pct = ciel ? Math.round(x.kcal / ciel * 100) : 0;
    const mimo = ciel && Math.abs(x.kcal - ciel) > ciel * TOLERANCIA;
    console.log(`  ${mimo ? "⚠" : "·"} ${DNI[x.d]}: ${x.kcal} kcal${ciel ? ` (${pct} % cieľa)` : ""}` +
      (x.chybaSlot.length ? `  · chýba: ${x.chybaSlot.join(", ")}` : ""));
  }
  const prazdne = dni.filter(x => x.prazdny).map(x => DNI[x.d]);
  if (prazdne.length) console.log(`  ⚠ úplne prázdne dni: ${prazdne.join(", ")}`);
  const priemer = naplnene.length ? Math.round(naplnene.reduce((a, b) => a + b.kcal, 0) / naplnene.length) : 0;
  console.log(`  Σ naplnených dní: ${naplnene.length}/7 · priemer ${priemer} kcal` +
    (ciel ? ` (${Math.round(priemer / ciel * 100)} % cieľa)` : ""));
}

console.log(chyby ? `\n✗ ${chyby} tvrdých chýb.` : "\n✅ Všetky jedálničky odkazujú na existujúce recepty a majú platné dni.");
process.exit(chyby ? 1 : 0);
