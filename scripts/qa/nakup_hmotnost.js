// QA: koľko KILOGRAMOV jedla si nákupný zoznam vypýta na týždeň pre dvoch.
// Reálna spotreba dvoch dospelých je ~10–12 kg/týždeň (1,4–1,7 kg na osobu a deň vrátane nápojov).
// Meria rovnakých 10 seedov × 2 týždne ako scripts/qa/nakup_vs_plan.js.
"use strict";
const { load } = require("../../test_harness");
const PON = "2026-08-31";
const stav = () => ({ viewOd: PON, hranice: [true, false, true, false, false, true, false], blokMode: true,
  genCfg: { zachovat: false, cielMode: true, filtre: [] },
  profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1200 }] } });
(async () => {
  const kg = [], velke = {};
  for (const seed of [1, 7, 42, 101, 777, 2026, 31337, 555001, 909090, 20260831]) {
    const app = load({ stav: stav(), seed });
    for (let w = 0; w < 2; w++) {
      app.S.viewOd = app.pridajDni(PON, w * 7);
      await app.generujJedalnicek(true);
      let g = 0;
      app.nakupItems().forEach(r => {
        const x = r.gramy || 0; g += x;
        if (x >= 1500) velke[`${r.nazov} ${(x / 1000).toFixed(1)} kg`] = (velke[`${r.nazov} ${(x / 1000).toFixed(1)} kg`] || 0) + 1;
      });
      kg.push(g / 1000);
    }
  }
  kg.sort((a, b) => a - b);
  const pr = kg.reduce((a, b) => a + b, 0) / kg.length;
  console.log(`Nákup na týždeň pre 2 osoby — min ${kg[0].toFixed(1)} kg · medián ${kg[kg.length >> 1].toFixed(1)} kg · priemer ${pr.toFixed(1)} kg · max ${kg[kg.length - 1].toFixed(1)} kg`);
  console.log(`Na osobu a deň: ${(kg[kg.length >> 1] / 2 / 7).toFixed(2)} kg`);
  const e = Object.entries(velke).sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log(`\nPoložky ≥ 1,5 kg v jednom týždni (${Object.keys(velke).length} druhov):`);
  e.forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}× ${k}`));
})();
