// Meracia sonda pre audit: „pred / po“ čísla pre výživu, nákup a generátor.
// Beh:  node scripts/metriky.js [pocet_tyzdnov]     (default 30)
// Používa test_harness.js — teda skutočný app.js so skutočnými dátami a deterministickým seedom.
const { load } = require("../test_harness");

const N = parseInt(process.argv[2]) || 30;

// Nezávislý (referenčný) detektor sacharidového jedla — schválne NIE app.maCarb, aby sa dal
// zmerať aj stav PRED opravou A4. Sem patrí všetko, čo človek vníma ako prílohu-v-jedle.
function jeSacharidove(r) {
  const s = (r.nazov + " " + (r.ingrediencie || []).map(i => i.nazov).join(" ")).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (r.kategoria === "Cestoviny") return true;
  return /ryz|zemiak|cestovin|spaget|linguin|rezanc|tarho|kuskus|bulgur|quinoa|chlieb|bageta|tortilla|rozok|zeml|nudl|halusk|knedl|pecivo|penne|rigatoni|fusilli|farfalle|orzo|tagliatelle|bucatini|lasagne|gnocchi|pizza|taco|burrito|wrap|burger|sendvic|panini|toast|pita|placka|kasa|krupic|polenta|ovsen|granola|batat|musli|mua?ka \+ drozdie/.test(s);
}
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
const pct = (n, d) => d ? Math.round(n / d * 1000) / 10 : 0;

async function main() {
  const app = load({ stav: stavPre(), seed: 20260818 });
  const S = app.S;

  const dni = [];            // jeden záznam na deň
  const slotKcal = {};       // slot → [kcal]
  const faktory = [];
  const snacky = {};         // id → počet
  const pouziteVTyzdni = []; // Set na týždeň
  const vsetkyRecepty = new Set();
  let carbNaCarb = 0, hlavnychChodov = 0;

  for (let w = 0; w < N; w++) {
    S.viewOd = app.pridajDni(PRVY_PONDELOK, w * 7);
    await app.generujJedalnicek(true);

    const tyzden = new Set();
    for (let di = 0; di < 7; di++) {
      const sloty = app.slotyDna(di);
      if (!sloty.length) continue;
      const zaznam = { kcal: 0, base: 0, b: 0, na: 0, vl: 0, sloty: {} };
      let fac = 1;
      sloty.forEach(sl => {
        const ids = app.slotIds(di, sl);
        if (!ids.length) return;
        fac = app.pf(di, sl);
        let k = 0, b = 0, na = 0, vl = 0;
        ids.forEach(cid => {
          const r = app.komponent(cid); if (!r) return;
          const v = app.vyzivaReceptu(r);
          k += app.kcalPorcia(r); b += v.b; na += v.na || 0; vl += v.vl || 0;
          if (!r._priloha) { tyzden.add(r.id); vsetkyRecepty.add(r.id); }
          if (sl === "Snack" && !r._priloha) snacky[r.id] = (snacky[r.id] || 0) + 1;
        });
        // 2× sacharid: hlavný chod, ktorý už má sacharid, dostal sacharidovú prílohu
        const hlavny = app.komponent(ids[0]);
        if (hlavny && app.jeHlavnyChodSlot(sl)) {
          hlavnychChodov++;
          if (jeSacharidove(hlavny) && ids.slice(1).some(x => app.CARB_PRILOHY.includes(x))) carbNaCarb++;
        }
        zaznam.sloty[sl] = k * fac;
        zaznam.base += k; zaznam.kcal += k * fac; zaznam.b += b * fac; zaznam.na += na * fac; zaznam.vl += vl * fac;
        (slotKcal[sl] = slotKcal[sl] || []).push(k * fac);
      });
      if (zaznam.base > 0) { dni.push(zaznam); faktory.push(fac); }
    }
    pouziteVTyzdni.push(tyzden);
  }

  // ── výživa + cena za JEDEN (posledný) týždeň, tak ako to ukazuje appka
  S.viewOd = app.pridajDni(PRVY_PONDELOK, (N - 1) * 7);
  const rows = app.nakupItems();
  const cenaTyzdna = rows.reduce((a, r) => a + (r.cena || 0), 0);
  const bezCeny = rows.filter(r => !(r.cena > 0)).length;

  const posledne = dni.slice(-7);
  const priem = f => posledne.reduce((a, d) => a + f(d), 0) / (posledne.length || 1);

  // ── pravidlá z kapitoly 3 auditu
  const ciel = S.profil.kcal;
  const maSlot = (d, s) => d.sloty[s] !== undefined;
  const dniOVR = dni.filter(d => maSlot(d, "Obed") && maSlot(d, "Večera") && maSlot(d, "Raňajky"));
  const obedVecera = dniOVR.filter(d => d.sloty["Obed"] >= d.sloty["Večera"]).length;
  const obedRanajky = dniOVR.filter(d => d.sloty["Obed"] > d.sloty["Raňajky"]).length;
  const veceraRanajky = dniOVR.filter(d => d.sloty["Večera"] > d.sloty["Raňajky"]).length;
  const celePoradie = dniOVR.filter(d => {
    const sn = maSlot(d, "Snack") ? d.sloty["Snack"] : -1;
    return d.sloty["Obed"] >= d.sloty["Večera"] && d.sloty["Večera"] > d.sloty["Raňajky"] && d.sloty["Raňajky"] > sn;
  }).length;
  const veceraPod250 = dni.filter(d => maSlot(d, "Večera") && d.sloty["Večera"] < 250).length;
  const korekcia15 = faktory.filter(f => Math.abs(f - 1) > 0.15).length;
  const faktorNad150 = faktory.filter(f => f > 1.5).length;
  const baseV10 = dni.filter(d => Math.abs(d.base - ciel) <= ciel * 0.1).length;
  const poV10 = dni.filter(d => Math.abs(d.kcal - ciel) <= ciel * 0.1).length;
  const bielMed = median(dni.map(d => d.b));
  const bielPod80 = dni.filter(d => d.b < 80).length;
  let opakovanieSusedne = 0;
  for (let i = 1; i < pouziteVTyzdni.length; i++)
    if ([...pouziteVTyzdni[i]].some(id => pouziteVTyzdni[i - 1].has(id))) opakovanieSusedne++;
  const snackIds = Object.keys(snacky);
  const maxSnack = snackIds.length ? Math.max(...snackIds.map(k => snacky[k])) : 0;

  const T = (a, b) => console.log("| " + a.padEnd(46) + " | " + String(b).padStart(22) + " |");
  console.log(`\n=== VÝŽIVA A CENA (posledný týždeň, 2 stravníci × 1450 kcal) ===`);
  T("priemer kcal/deň (so škálovaním)", Math.round(priem(d => d.kcal)));
  T("priemer kcal/deň (bez škálovania)", Math.round(priem(d => d.base)));
  T("priemer bielkovín/deň", Math.round(priem(d => d.b) * 10) / 10 + " g");
  T("priemer vlákniny/deň", Math.round(priem(d => d.vl) * 10) / 10 + " g");
  T("priemer sodíka/deň", Math.round(priem(d => d.na)) + " mg");
  T("cena týždňa (Nákup)", (Math.round(cenaTyzdna * 100) / 100).toFixed(2) + " €");
  T("položiek nákupu bez ceny", bezCeny + " / " + rows.length);

  console.log(`\n=== GENERÁTOR (${N} týždňov = ${dni.length} dní) ===`);
  T("Obed ≥ Večera", pct(obedVecera, dniOVR.length) + " %");
  T("Obed > Raňajky", pct(obedRanajky, dniOVR.length) + " %");
  T("Večera > Raňajky", pct(veceraRanajky, dniOVR.length) + " %");
  T("celé poradie O>V>R>S", pct(celePoradie, dniOVR.length) + " %");
  T("dní s večerou pod 250 kcal", veceraPod250 + " (" + pct(veceraPod250, dni.length) + " %)");
  T("dní potrebujúcich korekciu > 15 %", pct(korekcia15, faktory.length) + " %");
  T("jedál s faktorom > 150 %", faktorNad150);
  T("faktor min / medián / max", Math.min(...faktory) + " / " + median(faktory) + " / " + Math.max(...faktory));
  T("dní v ±10 % cieľa (pred škálovaním)", pct(baseV10, dni.length) + " %");
  T("dní v ±10 % cieľa (po škálovaní)", pct(poV10, dni.length) + " %");
  T("medián bielkovín/deň", Math.round(bielMed * 10) / 10 + " g");
  T("dní pod 80 g bielkovín", pct(bielPod80, dni.length) + " %");
  T("medián kcal Raňajky/Obed/Večera/Snack",
    ["Raňajky", "Obed", "Večera", "Snack"].map(s => Math.round(median(slotKcal[s] || [0]))).join(" / "));
  T("2× sacharid (príloha k sach. jedlu)", carbNaCarb + " / " + hlavnychChodov);
  T("unikátnych snackov", snackIds.length);
  T("najčastejší snack (počet)", maxSnack);
  T("susedné týždne so zopakovaným receptom", opakovanieSusedne + " / " + (pouziteVTyzdni.length - 1));
  T("unikátnych receptov spolu", vsetkyRecepty.size);
  console.log("");
}

main().catch(e => { console.error(e); process.exit(1); });
