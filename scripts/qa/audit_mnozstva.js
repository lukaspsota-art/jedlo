// QA: nereálne množstvá v receptoch — koľko GRAMOV jedla na porciu recept pýta.
// Bežná porcia hlavného jedla váži 300–700 g. Nad ~1200 g/porciu je to skoro isto chyba
// pri zbere dát (napr. „6 × 100 g“ prečítané ako 6000 g) a nákup potom pýta kilá navyše.
"use strict";
const { load } = require("../../test_harness");
const app = load({ stav: { profil: { osoby: 2, kcal: 1450 } }, seed: 1 });

const IGNOR = /voda|ľad|^soľ$/i;
const out = [];
for (const r of app.RECEPTY) {
  if (r.typ === "vyrobok" || r._priloha) continue;
  const porcie = r.porcie || 1;
  let g = 0; const velke = [];
  for (const i of (r.ingrediencie || [])) {
    if (i.mnozstvo == null) continue;
    if (IGNOR.test(i.nazov)) continue;
    let gg = 0;
    try { gg = app.gramy(i, r) || 0; } catch (e) { gg = 0; }
    if (!(gg > 0)) continue;
    g += gg;
    if (gg / porcie > 400) velke.push(`${i.nazov} ${i.mnozstvo} ${i.jednotka} = ${Math.round(gg)} g (${Math.round(gg / porcie)} g/porcia)`);
  }
  const naPorciu = g / porcie;
  if (naPorciu > 1200 || velke.length) out.push({ id: r.id, nazov: r.nazov, porcie, naPorciu: Math.round(naPorciu), velke });
}
out.sort((a, b) => b.naPorciu - a.naPorciu);
console.log(`Receptov spolu: ${app.RECEPTY.filter(r => r.typ !== "vyrobok").length}`);
console.log(`Receptov s podozrivým množstvom: ${out.length}`);
console.log(`Z toho nad 1200 g jedla na porciu: ${out.filter(x => x.naPorciu > 1200).length}`);
console.log(`Z toho nad 2000 g jedla na porciu: ${out.filter(x => x.naPorciu > 2000).length}`);
console.log("\nTOP 30:");
out.slice(0, 30).forEach(x => {
  console.log(`  ${String(x.naPorciu).padStart(5)} g/porcia · ${x.nazov} (${x.porcie} porcií) [${x.id}]`);
  x.velke.slice(0, 3).forEach(v => console.log(`        ${v}`));
});
