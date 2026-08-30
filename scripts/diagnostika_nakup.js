// Diagnostika nákupného zoznamu: PREČO nemá položka cenu.
// Beh:  node scripts/diagnostika_nakup.js [pocet_tyzdnov] [--vsetko]
//   [pocet_tyzdnov]  koľko týždňov vygenerovať (default 20; diagnostikuje sa POSLEDNÝ, ako v metriky.js)
//   --vsetko         vypíš aj všetky uložené jedálničky z jedalnicky/*.json
//   --recepty        preskenuj VŠETKY recepty (nie len plán) a vypíš dôvody strát cien
//
// Dôvody, ktoré rozlišuje:
//   NENAPAROVANA   surovina sa nenašla v potraviny.json (najdiPotravinu → null)
//   CENA_NULL      potravina má cena100 == null (NEZNÁMA cena, nie zadarmo)
//   CENA_NULA      potravina má cena100 === 0 (naozaj zadarmo — legitímne, napr. voda)
//   NULA_GRAMOV    napárovaná potravina, ale gramy() vrátilo 0 → cena sa nemá z čoho počítať
//                  (podrobne: NEZNAMA_JEDNOTKA / CHYBA_G_ZA_KS / MNOZSTVO_NULA)
const { load, nacitajJedalnicky } = require("../test_harness");

const args = process.argv.slice(2);
const N = parseInt(args.find(a => /^\d+$/.test(a))) || 20;
const VSETKO = args.includes("--vsetko");
const RECEPTY_SCAN = args.includes("--recepty");
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

// prečo je gramáž 0? (rovnaká logika ako gZaJednotku, len s vysvetlením)
function precoNulaGramov(app, zdroj, p) {
  const j = (zdroj.jednotka || "").toLowerCase().trim();
  if (!(zdroj.mn > 0)) return "MNOZSTVO_NULA (" + zdroj.mn + " " + j + ")";
  if (app.KS_JEDNOTKY.includes(j)) return "CHYBA_G_ZA_KS (jednotka „" + j + "“, potravina „" + p.kluc + "“ nemá g_za_ks)";
  if (j === "plátok" || j === "platok") return "CHYBA_G_ZA_PLATOK";
  if (j === "balenie") return "CHYBA_BALENIE_G (potravina „" + p.kluc + "“ nemá balenie_g)";
  if (app.gZaJednotku(j, p) === 0) return "NEZNAMA_JEDNOTKA („" + (zdroj.jednotka || "(prázdna)") + "“)";
  return "NEZNAMY_DOVOD";
}

function diagnostikuj(app, popis) {
  const rows = app.nakupItems().filter(r => r.gkey);
  const { grp } = app.nakupPolozky();
  const zle = [], zadarmo = [];
  rows.forEach(r => {
    const G = grp[r.gkey];
    if (!r.bezCeny) {
      // cena 0 € je legitímna, keď je ZNÁMA (cena100: 0 — voda z vodovodu) alebo keď potrebu
      // pokryla špajza. To nie je „bez ceny" a nesmie sa s ňou zlúčiť.
      if (!(r.cena > 0)) zadarmo.push(r.nazov + (r.zoSpajze > 0 ? " (pokryté špajzou)" : " (cena100: 0)"));
      return;
    }
    const zaznam = { nazov: r.nazov, key: r.gkey, cena: r.cena, gramy: r.gramy, zoSpajze: r.zoSpajze, dovody: [] };
    if (!G) { zaznam.dovody.push("CHYBA_V_GRP"); zle.push(zaznam); return; }
    if (!G.matched) {
      zaznam.dovody.push("NENAPAROVANA (surovina „" + G.nazov + "“ nie je v potraviny.json)");
    } else {
      const p = G.p;
      if (p.cena100 == null) zaznam.dovody.push("CENA_NULL (potravina „" + p.kluc + "“ má cena100: null)");
      else if (p.cena100 === 0) zaznam.dovody.push("CENA_NULA (potravina „" + p.kluc + "“ má cena100: 0 — zadarmo)");
      if (!(G.grams > 0)) {
        const dov = new Set();
        (G.zdroje || []).forEach(z => dov.add(precoNulaGramov(app, z, p)));
        zaznam.dovody.push("NULA_GRAMOV → " + [...dov].join("; "));
      }
      if (r.zoSpajze > 0 && !(r.gramy > 0)) zaznam.dovody.push("POKRYTE_SPAJZOU");
    }
    if (!zaznam.dovody.length) zaznam.dovody.push("NEZNAMY_DOVOD (cena=" + r.cena + ", gramy=" + r.gramy + ")");
    zaznam.zdroje = (G && G.zdroje || []).slice(0, 3).map(z => z.recept + ": " + z.ing + " " + z.mn + " " + z.jednotka);
    zle.push(zaznam);
  });
  const spot = app.cenaTyzdna("spotreba"), bal = app.cenaTyzdna("balenia"), os = app.cenaTyzdna("osoba");
  console.log("\n=== " + popis + " ===");
  console.log("položiek: " + rows.length + " · BEZ CENY: " + zle.length + " · so známou 0 €: " + zadarmo.length +
    " · spotreba " + spot.toFixed(2) + " € · balenia " + bal.toFixed(2) + " € · osoba " + os.toFixed(2) + " €");
  if (zadarmo.length) console.log("  (0 €, ale ZNÁMA: " + zadarmo.join(", ") + ")");
  // kontrola konzistencie troch režimov + súčtu na cent
  const sucet = rows.reduce((a, r) => a + (r.cenaSpotreba || 0), 0);
  if (Math.abs(Math.round(sucet * 100) - Math.round(spot * 100)) > 1)
    console.log("  ⚠ súčet položiek " + sucet.toFixed(2) + " € ≠ cenaTyzdna(spotreba) " + spot.toFixed(2) + " €");
  if (bal < spot - 0.005) console.log("  ⚠ balenia (" + bal.toFixed(2) + ") < spotreba (" + spot.toFixed(2) + ")");
  zle.forEach(z => {
    console.log("  • " + z.nazov + "  [" + z.key + "]  cena=" + (z.cena || 0).toFixed(4) + " g=" + Math.round(z.gramy || 0));
    z.dovody.forEach(d => console.log("      ↳ " + d));
    (z.zdroje || []).forEach(s => console.log("        zdroj: " + s));
  });
  return zle;
}

async function main() {
  const app = load({ stav: stavPre(), seed: 20260818 });
  const S = app.S;
  let spolu = 0;

  for (let w = 0; w < N; w++) {
    S.viewOd = app.pridajDni(PRVY_PONDELOK, w * 7);
    await app.generujJedalnicek(true);
  }
  S.viewOd = app.pridajDni(PRVY_PONDELOK, (N - 1) * 7);
  spolu += diagnostikuj(app, "Vygenerovaný týždeň " + N + " (seed 20260818) — ako v metriky.js").length;

  if (VSETKO) {
    // aj všetky predchádzajúce vygenerované týždne
    for (let w = 0; w < N - 1; w++) {
      S.viewOd = app.pridajDni(PRVY_PONDELOK, w * 7);
      spolu += diagnostikuj(app, "Vygenerovaný týždeň " + (w + 1)).length;
    }
    // a uložené jedálničky z jedalnicky/*.json
    nacitajJedalnicky().forEach(j => {
      S.viewOd = j.od; S.plan = {};
      for (let di = 0; di < 7; di++) {
        const iso = app.datumPre(di), den = (j.plan || {})[String(di)] || {};
        S.plan[iso] = {};
        for (const sl in den) S.plan[iso][sl] = Array.isArray(den[sl]) ? den[sl] : [den[sl]];
      }
      spolu += diagnostikuj(app, "Uložený jedálniček „" + (j.nazov || j.id) + "“ (" + j.od + ")").length;
    });
  }

  if (RECEPTY_SCAN) {
    // celá databáza: ktoré suroviny by v nákupe stratili cenu
    const dov = {};
    app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => {
      if (i.mnozstvo == null) return;
      const p = app.najdiPotravinu(i.nazov);
      let d = null;
      if (!p) d = "NENAPAROVANA";
      else if (p.cena100 == null) d = "CENA_NULL:" + p.kluc;
      else if (!(app.gramy(i, p) > 0)) d = "NULA_GRAMOV:" + precoNulaGramov(app, { mn: i.mnozstvo, jednotka: i.jednotka }, p);
      if (!d) return;
      (dov[d] = dov[d] || { n: 0, vzorky: new Set() }).n++;
      if (dov[d].vzorky.size < 4) dov[d].vzorky.add(i.nazov + " " + i.mnozstvo + " " + (i.jednotka || "-") + " (" + r.id + ")");
    }));
    console.log("\n=== CELÁ DATABÁZA RECEPTOV (" + app.RECEPTY.length + ") — ingrediencie bez ceny ===");
    Object.entries(dov).sort((a, b) => b[1].n - a[1].n).forEach(([d, v]) =>
      console.log("  " + String(v.n).padStart(5) + "× " + d + "\n        " + [...v.vzorky].join("\n        ")));
  }

  console.log("\nSPOLU položiek bez ceny: " + spolu);
  process.exit(spolu > 0 && !VSETKO && !RECEPTY_SCAN ? 0 : 0);
}
main();
