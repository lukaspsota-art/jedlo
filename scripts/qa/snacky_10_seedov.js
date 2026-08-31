// QA: snacky — pravidlo „hotový kúpený výrobok“ + pestrosť a skladba.
// Nezávislé meranie: 10 rôznych seedov × 4 týždne, každý snack sa vyhodnotí.
// Beh: node scripts/qa/snacky_10_seedov.js
const { load } = require("../../test_harness");

const SEEDY = [1, 7, 42, 101, 777, 2026, 31337, 555001, 909090, 20260831];
const PRVY_PONDELOK = "2026-08-31";
const TYZDNOV = 4;

function stav() {
  return {
    viewOd: PRVY_PONDELOK,
    hranice: [true, false, true, false, false, true, false],
    blokMode: true,
    genCfg: { zachovat: false, cielMode: true, filtre: [] },
    profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1200 }] },
  };
}

// „Kúpený výrobok“ = má v názve balenie (fľaša/vanička/balenie/kus…) ALEBO
// nemá viac než 1 ingredienciu a nemá postup s varením.
const VARNE_SLOVESA = /\bvar|piec|smaž|opeč|dus|zohrej|uvar|upeč|rozohr|blanš|griluj|restuj|zapeč|mixuj|šľahaj|cesto|marinuj/i;

(async () => {
  const nalezy = [];
  let slotov = 0, komponentov = 0, dvojic = 0;
  let holePecivo = 0, sOvocim = 0, primarOvocie = 0;
  const pocty = {}, poctyPrim = {};
  const unikaty = new Set(), unikatyPrim = new Set();
  const druhy = {};
  const perSeed = [];

  for (const seed of SEEDY) {
    const app = load({ stav: stav(), seed });
    const lokal = {}, lokalPrim = {};
    for (let w = 0; w < TYZDNOV; w++) {
      app.S.viewOd = app.pridajDni(PRVY_PONDELOK, w * 7);
      await app.generujJedalnicek(true);
      for (let di = 0; di < 7; di++) {
        const ids = app.slotIds(di, "Snack");
        const komp = ids.map(id => app.komponent(id)).filter(r => r && !r._priloha);
        if (!komp.length) continue;
        slotov++;
        if (komp.length > 1) dvojic++;
        const dr = komp.map(r => app.snackDruh(r));
        if (dr.every(d => d === "pečivo")) holePecivo++;
        if (dr.includes("ovocie")) sOvocim++;
        if (dr[0] === "ovocie") primarOvocie++;
        komp.forEach((r, i) => {
          komponentov++;
          unikaty.add(r.id);
          pocty[r.nazov] = (pocty[r.nazov] || 0) + 1;
          lokal[r.nazov] = (lokal[r.nazov] || 0) + 1;
          druhy[dr[i]] = (druhy[dr[i]] || 0) + 1;
          if (i === 0) { unikatyPrim.add(r.id); poctyPrim[r.nazov] = (poctyPrim[r.nazov] || 0) + 1; lokalPrim[r.nazov] = (lokalPrim[r.nazov] || 0) + 1; }
          const postup = (r.postup || []).join(" ");
          const ing = (r.ingrediencie || []).length;
          const maBalenie = /\((?:fľaša|vanička|balenie|kus|plátky|sáčok|téglik|krabička|tyčinka|vrecko|pohár|dóza|kelímok|ks)[^)]*\)/i.test(r.nazov);
          const vari = VARNE_SLOVESA.test(postup);
          if (r.typ !== "vyrobok" || r.kategoria !== "Snack") nalezy.push({ typ: "NIE JE VÝROBOK", seed, nazov: r.nazov, dovod: r.kategoria + "/" + r.typ });
          else if (vari) nalezy.push({ typ: "VARÍ SA", seed, nazov: r.nazov, dovod: postup.slice(0, 90) });
          else if (!maBalenie && ing > 3) nalezy.push({ typ: "VIAC NEŽ 3 SUROVINY", seed, nazov: r.nazov, dovod: ing + " ingrediencií" });
          else if (ing !== 1) nalezy.push({ typ: "NIE 1 BALENIE = 1 PORCIA", seed, nazov: r.nazov, dovod: ing + " ingrediencií" });
        });
      }
    }
    const lz = Object.entries(lokal).sort((a, b) => b[1] - a[1]);
    const lp = Object.entries(lokalPrim).sort((a, b) => b[1] - a[1]);
    perSeed.push({ seed, unik: lz.length, top: lz[0], unikP: lp.length, topP: lp[0] });
  }

  const zoradene = Object.entries(pocty).sort((a, b) => b[1] - a[1]);
  const zoradeneP = Object.entries(poctyPrim).sort((a, b) => b[1] - a[1]);
  console.log("Na seed (4 týždne = mesiac) — unikátnych / najčastejší:");
  perSeed.forEach(x => console.log(
    `   seed ${String(x.seed).padStart(9)}: ${String(x.unik).padStart(2)} unikátnych výrobkov (${String(x.unikP).padStart(2)} primárnych)` +
    `, najčastejší ${x.top[1]}× „${x.top[0]}“ / primárny ${x.topP[1]}× „${x.topP[0]}“`));
  console.log(`Seedov: ${SEEDY.length} × ${TYZDNOV} týždňov = ${SEEDY.length * TYZDNOV} týždňov`);
  console.log(`Snackových slotov: ${slotov} · komponentov: ${komponentov} · dvojíc: ${dvojic} (${(dvojic / slotov * 100).toFixed(1)} %)`);
  console.log(`Unikátnych výrobkov: ${unikaty.size} · unikátnych primárnych: ${unikatyPrim.size}`);
  console.log(`Holé pečivo: ${holePecivo} slotov = ${(holePecivo / slotov * 100).toFixed(1)} %`);
  console.log(`So ČERSTVÝM ovocím: ${sOvocim} slotov = ${(sOvocim / slotov * 100).toFixed(1)} % (z toho ovocie ako primárny: ${(primarOvocie / slotov * 100).toFixed(1)} %)`);
  console.log(`Druhy komponentov: ${JSON.stringify(druhy)}`);
  console.log(`Najčastejších 12 (komponenty):`);
  zoradene.slice(0, 12).forEach(([n, c]) => console.log(`   ${String(c).padStart(4)}× ${n}`));
  console.log(`Najčastejších 6 (primárne):`);
  zoradeneP.slice(0, 6).forEach(([n, c]) => console.log(`   ${String(c).padStart(4)}× ${n}`));
  console.log(`\nPorušenia pravidla „hotový kúpený výrobok“: ${nalezy.length}`);
  const podlaTypu = {};
  nalezy.forEach(n => (podlaTypu[n.typ + " · " + n.nazov] = (podlaTypu[n.typ + " · " + n.nazov] || 0) + 1));
  Object.entries(podlaTypu).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log(`   ${String(v).padStart(4)}× ${k}`));
  process.exit(0);
})();
