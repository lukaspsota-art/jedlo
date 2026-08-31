// QA: koľko by pomohlo, keby generátor preskočil recepty, ktorých suroviny sa rozchádzajú
// s deklarovaným `kcal_na_porciu` viac než 2× (rovnaké pásmo, aké už appka pozná ako K_PASMO_HI).
"use strict";
const { load } = require("../../test_harness");
const PON = "2026-08-31";
const stav = () => ({ viewOd: PON, hranice: [true, false, true, false, false, true, false], blokMode: true,
  genCfg: { zachovat: false, cielMode: true, filtre: [] },
  profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1200 }] } });
const SEEDY = [1, 7, 42, 101, 777, 2026, 31337, 555001, 909090, 20260831];

function pomerRec(app, r) {
  const dekl = r.kcal_na_porciu || 0; if (!(dekl > 0)) return 1;
  let sur = 0;
  (r.ingrediencie || []).forEach(i => { const p = app.najdiPotravinu(i.nazov); if (!p) return; const g = app.gramy(i, p) * app.vsiaknuteho(i); if (g > 0) sur += g * p.kcal / 100; });
  const naPorciu = sur / (r.porcie || 1);
  return naPorciu > 20 ? naPorciu / dekl : 1;
}

(async () => {
  for (const [meno, filtruj] of [["DNES (bez filtra)", false], ["S FILTROM pomer ≤ 2×", true]]) {
    const pomery = [], ceny = [], kila = [];
    let vyhodenych = 0;
    for (const seed of SEEDY) {
      const app = load({ stav: stav(), seed });
      if (filtruj) {
        const zle = app.RECEPTY.filter(r => { const q = pomerRec(app, r); return q > 2 || q < 0.5; });
        vyhodenych = zle.length;
        const zlyId = new Set(zle.map(r => r.id));
        for (let i = app.RECEPTY.length - 1; i >= 0; i--) if (zlyId.has(app.RECEPTY[i].id)) app.RECEPTY.splice(i, 1);
      }
      for (let w = 0; w < 2; w++) {
        app.S.viewOd = app.pridajDni(PON, w * 7);
        await app.generujJedalnicek(true);
        pomery.push(app.nakupVsPlan().pomer);
        const rows = app.nakupItems();
        ceny.push(rows.reduce((a, r) => a + (r.cena || 0), 0));
        kila.push(rows.reduce((a, r) => a + (r.gramy || 0), 0) / 1000);
      }
    }
    pomery.sort((a, b) => a - b); ceny.sort((a, b) => a - b); kila.sort((a, b) => a - b);
    console.log(`${meno.padEnd(24)} receptov vyhodených: ${vyhodenych} · pomer nákup/plán medián ${pomery[pomery.length >> 1].toFixed(2)} (max ${pomery[pomery.length - 1].toFixed(2)}) · týždňov nad +25 %: ${pomery.filter(x => x > 1.25).length}/${pomery.length} · cena týždňa medián ${ceny[ceny.length >> 1].toFixed(2)} € · nakúpených kg medián ${kila[kila.length >> 1].toFixed(1)} kg`);
  }
})();
