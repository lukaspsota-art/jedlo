// QA: dva zdroje pravdy o kalóriách — `kcal_na_porciu` (čo hlási Plán a Výživa)
// vs. kalórie spočítané zo surovín (čo sa naozaj kúpi a zje).
"use strict";
const { load } = require("../../test_harness");
const app = load({ stav: { profil: { osoby: 2, kcal: 1450 } }, seed: 1 });
const rows = [];
for (const r of app.RECEPTY) {
  if (r.typ === "vyrobok") continue;
  const dekl = r.kcal_na_porciu || 0; if (!(dekl > 0)) continue;
  let sur = 0, napar = 0, spolu = 0;
  (r.ingrediencie || []).forEach(i => { spolu++; const p = app.najdiPotravinu(i.nazov); if (!p) return; napar++; const g = app.gramy(i, p) * app.vsiaknuteho(i); if (g > 0) sur += g * p.kcal / 100; });
  const naPorciu = sur / (r.porcie || 1);
  if (!(naPorciu > 20)) continue;
  rows.push({ id: r.id, nazov: r.nazov, dekl, sur: Math.round(naPorciu), pomer: naPorciu / dekl, zdroj: r.kcal_zdroj || "kurátor", pokrytie: spolu ? napar / spolu : 0 });
}
rows.sort((a, b) => b.pomer - a.pomer);
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
const p = rows.map(x => x.pomer);
console.log(`Receptov s porovnateľnými kcal: ${rows.length}`);
console.log(`pomer suroviny/deklarované — medián ${med(p).toFixed(2)} · priemer ${(p.reduce((a,b)=>a+b,0)/p.length).toFixed(2)}`);
for (const h of [1.25, 1.5, 2, 3, 5]) console.log(`  receptov, kde suroviny dávajú viac než ${h}× deklarované: ${p.filter(x => x > h).length} (${(p.filter(x=>x>h).length/p.length*100).toFixed(1)} %)`);
console.log(`  receptov, kde suroviny dávajú menej než 0,7× deklarované: ${p.filter(x => x < 0.7).length}`);
const dekl = {}; rows.forEach(r => dekl[r.zdroj] = (dekl[r.zdroj] || 0) + 1);
console.log(`  podľa kcal_zdroj: ${JSON.stringify(dekl)}`);
const vypocet = rows.filter(r => r.zdroj === "vypocet"), kurator = rows.filter(r => r.zdroj !== "vypocet");
console.log(`  medián pomeru — kcal_zdroj=vypocet: ${med(vypocet.map(x=>x.pomer)).toFixed(2)} (${vypocet.length}) · kurátorované: ${med(kurator.map(x=>x.pomer)).toFixed(2)} (${kurator.length})`);
console.log("\nTOP 20 najhorších:");
rows.slice(0, 20).forEach(x => console.log(`  ${x.pomer.toFixed(1).padStart(6)}×  deklarované ${String(x.dekl).padStart(4)} · zo surovín ${String(x.sur).padStart(5)}  ${x.nazov} [${x.id}]`));
