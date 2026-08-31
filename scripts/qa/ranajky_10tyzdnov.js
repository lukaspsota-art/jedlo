// QA: dôkaz, že sa raňajky prestali opakovať. 10 PO SEBE IDÚCICH týždňov (pamäť teda platí),
// jeden profil (2 stravníci × 1450 kcal), seed 20260818. Vypíše slot Raňajky pre každý blok
// aj triedu bázy podľa `ranajkyBaza` — pravidlo „iná báza na blok" musí držať v každom týždni.
"use strict";
const { load } = require("../../test_harness");
(async () => {
  const app = load({ stav: { profil: { osoby: 2, kcal: 1450 } }, seed: parseInt(process.argv[3]) || 20260818 });
  const S = app.S, PRVY = "2026-08-17", N = parseInt(process.argv[2]) || 10;
  const vsetky = new Map(); const vsedne = new Map(); const bazy = {}; let porusenia = 0, sendvicVsedne = 0, vsednych = 0;
  const riadky = [];
  for (let w = 0; w < N; w++) {
    S.viewOd = app.pridajDni(PRVY, w * 7);
    await app.generujJedalnicek(true);
    const bunky = [], pouziteBazy = new Set();
    app.bloky().forEach((bl, bi) => {
      const di = app.blokDni(bl[0])[0];
      const ids = app.slotIds(di, "Raňajky");
      const r = app.komponent(ids[0]);
      if (!r) { bunky.push("—"); return; }
      const b = app.ranajkyBaza(r), v = app.vyzivaReceptu(r), k = app.kcalPorcia(r);
      vsetky.set(r.id, (vsetky.get(r.id) || 0) + 1);
      bazy[b] = (bazy[b] || 0) + 1;
      if (pouziteBazy.has(b)) porusenia++;
      pouziteBazy.add(b);
      const vsedny = app.blokDni(bl[0]).every(d => d < 5);
      if (vsedny) { vsednych++; vsedne.set(r.id, (vsedne.get(r.id)||0)+1); if (app.jeSendvic(r)) sendvicVsedne++; }
      bunky.push(`${r.nazov} · ${b} · ${Math.round(k)} kcal · ${v.b.toFixed(0)} g B · ${v.vl.toFixed(1)} g vl`);
    });
    riadky.push(`| ${w + 1} | ${bunky.join(" | ")} |`);
  }
  console.log("| týž. | blok A (Po–Ut) | blok B (St–Pi) | blok C (So–Ne) |");
  console.log("|---|---|---|---|");
  if (!process.argv.includes("--bez-tabulky")) riadky.forEach(r => console.log(r));
  const pocty = [...vsetky.values()];
  console.log(`\nslotov: ${pocty.reduce((a, b) => a + b, 0)} · unikátnych raňajok: ${vsetky.size} · najčastejšie: ${Math.max(...pocty)}×`);
  console.log(`z toho VŠEDNÝCH slotov: ${vsednych} · unikátnych všedných raňajok: ${vsedne.size} · najčastejšia všedná: ${Math.max(...vsedne.values())}×`);
  console.log(`porušení pravidla „iná báza na blok": ${porusenia} · sendvič vo všednom bloku: ${sendvicVsedne}/${vsednych}`);
  console.log("rozdelenie tried bázy: " + Object.entries(bazy).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
})();
