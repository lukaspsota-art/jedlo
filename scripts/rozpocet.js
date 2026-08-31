// Meracia sonda pre CENU jedálnička: rozdelenie ceny týždňa, čo ju ťahá, rozptyl medzi týždňami.
// Beh:  node scripts/rozpocet.js [pocet_tyzdnov] [seed]     (default 30, 20260818)
// Rovnaký harness aj seed ako scripts/metriky.js — čísla sú porovnateľné.
//
// Cena sa NEODVODZUJE z vyzivaReceptu (tá je škálovaná kurátorovaným kcal_na_porciu), ale
// z rovnakého agregátu, ktorý vidí Nákup (nakupPolozky → grp.zdroje). Preto sedí súčet
// „po receptoch" aj „po surovinách" na cenu týždňa v režime „spotreba" do centov.
const { load } = require("../test_harness");

const N = parseInt(process.argv[2]) || 30;
const SEED = parseInt(process.argv[3]) || 20260818;
const PRVY_PONDELOK = "2026-08-17";

function stavPre() {
  return {
    viewOd: PRVY_PONDELOK,
    hranice: [true, false, true, false, false, true, false],
    blokMode: true,
    genCfg: { zachovat: false, cielMode: true, filtre: [] },
    profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }] },
  };
}
function median(a) { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
function kvantil(a, q) { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; }
const e2 = n => (Math.round(n * 100) / 100).toFixed(2);

async function main() {
  const app = load({ stav: stavPre(), seed: SEED });
  const S = app.S;
  const osob = app.stravniciList().length || 1;

  const tyzdne = [];              // {spotreba, balenia, naOsobuDen}
  const receptCena = new Map();   // id → {nazov, suma, krat}
  const surovinaCena = new Map(); // kľúč → {nazov, suma, gramy, krat}
  const jedloCenaSlot = {};       // slot → [€/porcia]
  let dniSpolu = 0;

  for (let w = 0; w < N; w++) {
    S.viewOd = app.pridajDni(PRVY_PONDELOK, w * 7);
    await app.generujJedalnicek(true);

    const spotreba = app.cenaTyzdna("spotreba");
    const balenia = app.cenaTyzdna("balenia");
    let dniTyzdna = 0;
    for (let di = 0; di < 7; di++) if (app.slotyDna(di).length) dniTyzdna++;
    dniSpolu += dniTyzdna;
    tyzdne.push({ spotreba, balenia, naOsobuDen: spotreba / (osob * (dniTyzdna || 7)) });

    // rozklad ceny na recepty a suroviny — z rovnakého agregátu ako Nákup
    const { grp } = app.nakupPolozky();
    Object.values(grp).forEach(G => {
      if (!G.matched || !G.p || G.p.cena100 == null) return;
      (G.zdroje || []).forEach(z => {
        const g = app.gramy({ mnozstvo: z.mn, jednotka: z.jednotka }, G.p);
        if (!(g > 0)) return;
        const c = g / 100 * G.p.cena100;
        const r = receptCena.get(z.id) || { nazov: z.recept, suma: 0, krat: new Set() };
        r.suma += c; r.krat.add(w); receptCena.set(z.id, r);
        const s = surovinaCena.get(G.p.kluc) || { nazov: G.nazov, suma: 0, gramy: 0, krat: new Set() };
        s.suma += c; s.gramy += g; s.krat.add(w); surovinaCena.set(G.p.kluc, s);
      });
    });

    // €/porcia zvoleného jedla podľa slotu (to je číslo, ktoré vidí generátor)
    for (let di = 0; di < 7; di++) app.slotyDna(di).forEach(sl => {
      const ids = app.slotIds(di, sl); if (!ids.length) return;
      let c = 0; ids.forEach(cid => { const r = app.komponent(cid); if (r) c += app.vyzivaReceptu(r).cena || 0; });
      (jedloCenaSlot[sl] = jedloCenaSlot[sl] || []).push(c);
    });
  }

  const sp = tyzdne.map(t => t.spotreba), ba = tyzdne.map(t => t.balenia), od = tyzdne.map(t => t.naOsobuDen);
  const priem = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const sd = a => { const m = priem(a); return Math.sqrt(priem(a.map(x => (x - m) * (x - m)))); };

  const T = (a, b) => console.log("| " + a.padEnd(44) + " | " + String(b).padStart(24) + " |");
  console.log(`\n=== CENA TÝŽDŇA (${N} týždňov, ${osob} stravníci × 1450 kcal, seed ${SEED}) ===`);
  T("spotreba: priemer", e2(priem(sp)) + " €");
  T("spotreba: medián", e2(median(sp)) + " €");
  T("spotreba: min / max", e2(Math.min(...sp)) + " / " + e2(Math.max(...sp)) + " €");
  T("spotreba: p25 / p75", e2(kvantil(sp, 0.25)) + " / " + e2(kvantil(sp, 0.75)) + " €");
  T("spotreba: smerodajná odchýlka", e2(sd(sp)) + " € (" + Math.round(sd(sp) / priem(sp) * 100) + " %)");
  T("balenia: priemer", e2(priem(ba)) + " €");
  T("balenia / spotreba", Math.round(priem(ba) / priem(sp) * 100) + " %");
  T("€ / osoba / deň (priemer)", e2(priem(od)) + " €");
  T("€ / osoba / deň (medián)", e2(median(od)) + " €");
  T("€ / osoba / deň (min / max)", e2(Math.min(...od)) + " / " + e2(Math.max(...od)) + " €");
  T("€ / osoba / týždeň (priemer)", e2(priem(od) * 7) + " €");

  console.log(`\n=== €/porcia zvoleného jedla podľa slotu (medián / p90) ===`);
  Object.keys(jedloCenaSlot).forEach(sl => T(sl, e2(median(jedloCenaSlot[sl])) + " / " + e2(kvantil(jedloCenaSlot[sl], 0.9)) + " €"));

  const celkom = priem(sp) * N;
  const zoradene = a => a.sort((x, y) => y[1].suma - x[1].suma);
  console.log(`\n=== TOP 20 SUROVÍN (podiel na celkovej cene ${N} týždňov) ===`);
  console.log("| " + "surovina".padEnd(34) + " | " + "€ spolu".padStart(9) + " | " + "€/týž.".padStart(8) + " | " + "% ceny".padStart(6) + " | " + "týž.".padStart(4) + " |");
  zoradene([...surovinaCena.entries()]).slice(0, 20).forEach(([k, v]) => {
    console.log("| " + v.nazov.slice(0, 34).padEnd(34) + " | " + e2(v.suma).padStart(9) + " | " + e2(v.suma / N).padStart(8)
      + " | " + (Math.round(v.suma / celkom * 1000) / 10 + "").padStart(6) + " | " + String(v.krat.size).padStart(4) + " |");
  });

  console.log(`\n=== TOP 20 RECEPTOV (cena za jedno uvarenie pre domácnosť) ===`);
  console.log("| " + "recept".padEnd(40) + " | " + "€ spolu".padStart(9) + " | " + "€/varenie".padStart(9) + " | " + "×".padStart(3) + " |");
  const rec = [...receptCena.entries()].map(([k, v]) => [k, v]);
  rec.sort((x, y) => y[1].suma / y[1].krat.size - x[1].suma / x[1].krat.size);
  rec.slice(0, 20).forEach(([k, v]) => {
    console.log("| " + v.nazov.slice(0, 40).padEnd(40) + " | " + e2(v.suma).padStart(9) + " | " + e2(v.suma / v.krat.size).padStart(9)
      + " | " + String(v.krat.size).padStart(3) + " |");
  });

  // koľko z ceny nesie najdrahších 10 % receptov
  const perVarenie = rec.map(([k, v]) => v.suma / v.krat.size).sort((a, b) => b - a);
  const sumaVsetko = rec.reduce((a, [k, v]) => a + v.suma, 0);
  const top10 = zoradene([...receptCena.entries()]).slice(0, Math.ceil(rec.length * 0.1)).reduce((a, [k, v]) => a + v.suma, 0);
  console.log("");
  T("rôznych receptov s cenou", rec.length);
  T("podiel top 10 % receptov na cene", Math.round(top10 / sumaVsetko * 100) + " %");
  T("kontrola: Σ po surovinách vs. cena týždňov", e2(sumaVsetko) + " / " + e2(celkom) + " €");
  console.log("");
}

main().catch(e => { console.error(e); process.exit(1); });
