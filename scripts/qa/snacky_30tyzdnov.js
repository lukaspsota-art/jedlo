// QA: slot Snack na dlhom horizonte — 30 po sebe idúcich týždňov, jeden seed (pamäť teda platí).
// Beh: node scripts/qa/snacky_30tyzdnov.js [tyzdnov] [seed]
const { load } = require("../../test_harness");
const N = parseInt(process.argv[2]) || 30;
const SEED = parseInt(process.argv[3]) || 20260818;
const PONDELOK = "2026-08-31";

(async () => {
  const app = load({ stav: {
    viewOd: PONDELOK, hranice: [true, false, true, false, false, true, false], blokMode: true,
    genCfg: { zachovat: false, cielMode: true, filtre: [] },
    profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1200 }] },
  }, seed: SEED });

  const pocty = {}, poctyPrim = {}, poctyDopl = {};
  let slotov = 0, dvojic = 0, holePecivo = 0, sOvocim = 0;
  const tyzdne = [];
  for (let w = 0; w < N; w++) {
    app.S.viewOd = app.pridajDni(PONDELOK, w * 7);
    await app.generujJedalnicek(true);
    const riadok = [];
    for (let di = 0; di < 7; di++) {
      const ids = app.slotIds(di, "Snack");
      const komp = ids.map(id => app.komponent(id)).filter(r => r && !r._priloha);
      if (!komp.length) { riadok.push("—"); continue; }
      slotov++;
      if (komp.length > 1) dvojic++;
      const dr = komp.map(r => app.snackDruh(r));
      if (dr.every(d => d === "pečivo")) holePecivo++;
      if (dr.includes("ovocie")) sOvocim++;
      komp.forEach((r, i) => {
        pocty[r.nazov] = (pocty[r.nazov] || 0) + 1;
        if (i === 0) poctyPrim[r.nazov] = (poctyPrim[r.nazov] || 0) + 1;
        else poctyDopl[r.nazov] = (poctyDopl[r.nazov] || 0) + 1;
      });
      const v = komp.reduce((a, r) => { const x = app.vyzivaReceptu(r); a.k += app.kcalPorcia(r); a.b += x.b; a.c += x.cena || 0; return a; }, { k: 0, b: 0, c: 0 });
      const ok = komp.every(r => r.typ === "vyrobok" && r.kategoria === "Snack" && (r.ingrediencie || []).length === 1 && (r.postup || []).length === 1);
      riadok.push(`${ok ? "✅" : "❌"} ${komp.map(r => r.nazov).join(" + ")} · ${Math.round(v.k)} kcal · ${v.b.toFixed(1)} g B · ${v.c.toFixed(2)} €`);
    }
    tyzdne.push(riadok);
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  console.log(`Seed ${SEED} · ${N} po sebe idúcich týždňov · ${slotov} snackových slotov\n`);
  if (process.env.VYPIS) {
    const DNI = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
    const koniec = parseInt(process.env.VYPIS) || 10;
    for (let w = 0; w < Math.min(koniec, tyzdne.length); w++) {
      console.log(`— týždeň ${w + 1} —`);
      tyzdne[w].forEach((x, di) => console.log(`   ${DNI[di]}  ${x}`));
    }
    console.log("");
  }
  console.log(`dvojíc: ${dvojic} (${(dvojic / slotov * 100).toFixed(1)} %) · holé pečivo: ${(holePecivo / slotov * 100).toFixed(1)} % · so ČERSTVÝM ovocím: ${(sOvocim / slotov * 100).toFixed(1)} %`);
  console.log(`unikátnych výrobkov: ${top(pocty).length} · primárnych: ${top(poctyPrim).length} · doplnkov: ${top(poctyDopl).length}`);
  console.log(`najčastejší výrobok: ${top(pocty)[0][1]}× · najčastejší primárny: ${top(poctyPrim)[0][1]}× · najčastejší doplnok: ${top(poctyDopl).length ? top(poctyDopl)[0][1] : 0}×`);
  console.log("TOP 12 (spolu / z toho primárne):");
  top(pocty).slice(0, 12).forEach(([n, c]) => console.log(`   ${String(c).padStart(3)}× (${String(poctyPrim[n] || 0).padStart(3)} prim.) ${n}`));
  process.exit(0);
})();
