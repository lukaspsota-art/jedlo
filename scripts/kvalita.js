// Viacsemenná sonda kvality generátora — doplnok k scripts/metriky.js.
// metriky.js meria JEDEN seed (a výživu/cenu len za posledný týždeň), takže jeho čísla
// medzi behmi poskakujú a ladiť sa podľa nich nedá. Tento skript spustí N seedov × W týždňov
// a vypíše priemer + rozptyl kľúčových metrík cez VŠETKY dni.
//   node scripts/kvalita.js [tyzdnov=12] [seedov=4]
const { load } = require("../test_harness");
const W = parseInt(process.argv[2]) || 12;
const SEEDS = parseInt(process.argv[3]) || 4;
const PONDELOK = "2026-08-17", CIEL = 1450;
const median = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const pct = (n, d) => d ? n / d * 100 : 0;

async function jedenSeed(seed) {
  const app = load({ seed, stav: {
    viewOd: PONDELOK, hranice: [true, false, true, false, false, true, false], blokMode: true,
    genCfg: { zachovat: false, cielMode: true, filtre: [] },
    profil: { osoby: 2, kcal: CIEL, stravnici: [{ nazov: "A", kcal: CIEL }, { nazov: "B", kcal: CIEL }] } } });
  const S = app.S, SL = ["Raňajky", "Obed", "Večera", "Snack"];
  const dni = [], unik = new Set(), snacky = {}, tyzdne = [];
  const t0 = Date.now();
  for (let w = 0; w < W; w++) {
    S.viewOd = app.pridajDni(PONDELOK, w * 7);
    await app.generujJedalnicek(true);
    const tyz = new Set();
    for (let di = 0; di < 7; di++) {
      const d = { base: 0, kcal: 0, b: 0, vl: 0, sloty: {} };
      let fac = 1;
      SL.forEach(sl => {
        const ids = app.slotIds(di, sl); if (!ids.length) return;
        fac = app.pf(di, sl);
        let k = 0, b = 0, vl = 0;
        ids.forEach(id => { const c = app.komponent(id); if (!c) return;
          const v = app.vyzivaReceptu(c); k += app.kcalPorcia(c); b += v.b; vl += v.vl || 0;
          if (!c._priloha) { unik.add(c.id); tyz.add(c.id); if (sl === "Snack") snacky[c.id] = (snacky[c.id] || 0) + 1; } });
        d.sloty[sl] = k * fac; d.base += k; d.kcal += k * fac; d.b += b * fac; d.vl += vl * fac;
      });
      if (d.base > 0) dni.push(d);
    }
    tyzdne.push(tyz);
  }
  let susedne = 0;
  for (let i = 1; i < tyzdne.length; i++) if ([...tyzdne[i]].some(id => tyzdne[i - 1].has(id))) susedne++;
  const uplne = dni.filter(d => ["Obed", "Večera", "Raňajky"].every(s => d.sloty[s] != null));
  return {
    medB: median(dni.map(d => d.b)),
    pod80: pct(dni.filter(d => d.b < 80).length, dni.length),
    vl: dni.reduce((a, d) => a + d.vl, 0) / dni.length,
    vlMed: median(dni.map(d => d.vl)),
    pred10: pct(dni.filter(d => Math.abs(d.base - CIEL) <= CIEL * 0.1).length, dni.length),
    po10: pct(dni.filter(d => Math.abs(d.kcal - CIEL) <= CIEL * 0.1).length, dni.length),
    kor15: pct(dni.filter(d => Math.abs(CIEL / d.base - 1) > 0.15).length, dni.length),
    poradie: pct(uplne.filter(d => { const sn = d.sloty["Snack"] != null ? d.sloty["Snack"] : -1;
      return d.sloty["Obed"] >= d.sloty["Večera"] && d.sloty["Večera"] > d.sloty["Raňajky"] && d.sloty["Raňajky"] > sn; }).length, uplne.length),
    vecera250: dni.filter(d => d.sloty["Večera"] != null && d.sloty["Večera"] < 250).length,
    unik: unik.size, strop: W * 12,
    snackUnik: Object.keys(snacky).length,
    snackMax: Math.max(0, ...Object.values(snacky)),
    susedne, cas: Date.now() - t0,
  };
}

(async () => {
  const vys = [];
  for (let i = 0; i < SEEDS; i++) vys.push(await jedenSeed(20260818 + i * 1009));
  const kol = k => vys.map(v => v[k]);
  const pr = k => kol(k).reduce((a, b) => a + b, 0) / vys.length;
  const R = (n, d) => Math.round(n * (d || 10)) / (d || 10);
  const T = (a, b, c) => console.log("| " + a.padEnd(38) + " | " + String(b).padStart(9) + " | " + String(c || "").padEnd(34) + " |");
  console.log(`\n=== KVALITA: ${SEEDS} seedov × ${W} týždňov (${SEEDS * W * 7} dní) ===`);
  T("metrika", "priemer", "po seedoch");
  T("medián bielkovín/deň", R(pr("medB")) + " g", kol("medB").map(x => R(x)).join(" "));
  T("dní pod 80 g bielkovín", R(pr("pod80")) + " %", kol("pod80").map(x => R(x)).join(" "));
  T("priemer vlákniny/deň", R(pr("vl")) + " g", kol("vl").map(x => R(x)).join(" "));
  T("medián vlákniny/deň", R(pr("vlMed")) + " g", kol("vlMed").map(x => R(x)).join(" "));
  T("dní v ±10 % PRED škálovaním", R(pr("pred10")) + " %", kol("pred10").map(x => R(x)).join(" "));
  T("dní v ±10 % po škálovaní", R(pr("po10")) + " %", kol("po10").map(x => R(x)).join(" "));
  T("dní s korekciou > 15 %", R(pr("kor15")) + " %", kol("kor15").map(x => R(x)).join(" "));
  T("celé poradie O>V>R>S", R(pr("poradie")) + " %", kol("poradie").map(x => R(x)).join(" "));
  T("dní s večerou pod 250 kcal", R(pr("vecera250")), kol("vecera250").join(" "));
  T("unikátnych receptov", R(pr("unik")), kol("unik").join(" ") + "  (strop " + vys[0].strop + ")");
  T("unikátnych snackov", R(pr("snackUnik")), kol("snackUnik").join(" "));
  T("najčastejší snack", R(pr("snackMax")), kol("snackMax").join(" "));
  T("susedné týždne s opakovaním", R(pr("susedne")), kol("susedne").join(" "));
  T("čas generovania týždňa", R(pr("cas") / W) + " ms", kol("cas").map(c => R(c / W)).join(" "));
  console.log("");
})();
