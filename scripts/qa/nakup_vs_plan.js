// QA: ako často a ako veľmi sa nákup rozchádza s plánom (chybné množstvá v receptoch).
"use strict";
const { load } = require("../../test_harness");
const PON = "2026-08-31";
const stav = () => ({ viewOd: PON, hranice: [true, false, true, false, false, true, false], blokMode: true,
  genCfg: { zachovat: false, cielMode: true, filtre: [] },
  profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1200 }] } });
(async () => {
  const vinniki = {};
  const pomery = [];
  const drahe = [];
  for (const seed of [1, 7, 42, 101, 777, 2026, 31337, 555001, 909090, 20260831]) {
    const app = load({ stav: stav(), seed });
    for (let w = 0; w < 2; w++) {
      app.S.viewOd = app.pridajDni(PON, w * 7);
      await app.generujJedalnicek(true);
      const d = app.nakupVsPlan();
      pomery.push(d.pomer);
      (d.top || []).forEach(t => { vinniki[t.nazov] = (vinniki[t.nazov] || 0) + 1; });
      const rows = app.nakupItems();
      rows.forEach(r => { const g = r.mnozstvo || 0; if (r.jednotka === "g" && g >= 2000) drahe.push(`${r.nazov} ${Math.round(g)} g`); });
    }
  }
  const nad = (p) => pomery.filter(x => Math.abs(x - 1) > p).length;
  pomery.sort((a, b) => a - b);
  console.log(`Týždňov: ${pomery.length}`);
  console.log(`pomer nákup/plán  min ${pomery[0].toFixed(2)} · medián ${pomery[pomery.length >> 1].toFixed(2)} · max ${pomery[pomery.length - 1].toFixed(2)}`);
  console.log(`týždňov s odchýlkou > 5 %:  ${nad(0.05)} / ${pomery.length}`);
  console.log(`týždňov s odchýlkou > 25 %: ${nad(0.25)} / ${pomery.length}`);
  console.log(`týždňov s odchýlkou > 100 %: ${nad(1.0)} / ${pomery.length}`);
  console.log("\nNajčastejší vinníci (recept/surovina hlásená appkou):");
  Object.entries(vinniki).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}× ${k}`));
  const p = {}; drahe.forEach(x => p[x] = (p[x] || 0) + 1);
  console.log("\nPoložky nákupu ≥ 2 kg (na 2 osoby / týždeň):");
  Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}× ${k}`));
})();
