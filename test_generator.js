// Testy generátora jedálnička k auditu 2026-08-18 (nálezy A1–A7). Beh: node test_generator.js
// Meria sa na 30 vygenerovaných týždňoch s deterministickým seedom (Math.random je v harnesse
// nahradený mulberry32), takže čísla sú opakovateľné a porovnateľné s auditom.
const assert = require("assert");
const { load } = require("./test_harness");

const N = parseInt(process.env.TYZDNOV) || 30;
const PONDELOK = "2026-08-17";
const CIEL = 1450;

const app = load({
  seed: parseInt(process.env.SEED) || 20260818,
  stav: {
    viewOd: PONDELOK,
    hranice: [true, false, true, false, false, true, false],
    blokMode: true,
    genCfg: { zachovat: false, cielMode: true, filtre: [] },
    profil: { osoby: 2, kcal: CIEL, stravnici: [{ nazov: "A", kcal: CIEL }, { nazov: "B", kcal: CIEL }] },
  },
});

// referenčný (nezávislý) detektor sacharidového jedla — nie app.maCarb, nech test meria aj stav pred opravou
function jeSacharidove(r) {
  const s = (r.nazov + " " + (r.ingrediencie || []).map(i => i.nazov).join(" ")).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (r.kategoria === "Cestoviny") return true;
  return /ryz|zemiak|cestovin|spaget|linguin|rezanc|tarho|kuskus|bulgur|quinoa|chlieb|bageta|tortilla|rozok|zeml|nudl|halusk|knedl|pecivo|penne|rigatoni|fusilli|farfalle|orzo|tagliatelle|bucatini|lasagne|gnocchi|pizza|taco|burrito|wrap|burger|sendvic|panini|toast|pita|placka|kasa|krupic|polenta|ovsen|granola|batat|musli/.test(s);
}
const median = a => { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const pct = (n, d) => d ? n / d * 100 : 0;

async function zbierData() {
  const S = app.S;
  const dni = [], faktory = [], snacky = {}, tyzdne = [];
  let carbNaCarb = 0, hlavnych = 0;
  for (let w = 0; w < N; w++) {
    S.viewOd = app.pridajDni(PONDELOK, w * 7);
    await app.generujJedalnicek(true);
    const tyzden = new Set();
    for (let di = 0; di < 7; di++) {
      const sloty = app.slotyDna(di);
      if (!sloty.length) continue;
      const d = { base: 0, kcal: 0, b: 0, sloty: {}, fac: 1 };
      sloty.forEach(sl => {
        const ids = app.slotIds(di, sl);
        if (!ids.length) return;
        const f = app.pf(di, sl);
        d.fac = f;
        let k = 0, b = 0;
        ids.forEach(cid => {
          const r = app.komponent(cid); if (!r) return;
          k += app.kcalPorcia(r); b += app.vyzivaReceptu(r).b;
          if (!r._priloha) tyzden.add(r.id);
          if (sl === "Snack" && !r._priloha) snacky[r.id] = (snacky[r.id] || 0) + 1;
        });
        const hlavny = app.komponent(ids[0]);
        if (hlavny && app.jeHlavnyChodSlot(sl)) {
          hlavnych++;
          if (jeSacharidove(hlavny) && ids.slice(1).some(x => app.CARB_PRILOHY.includes(x))) carbNaCarb++;
        }
        d.sloty[sl] = k * f; d.base += k; d.kcal += k * f; d.b += b * f;
      });
      if (d.base > 0) { dni.push(d); faktory.push(d.fac); }
    }
    tyzdne.push(tyzden);
  }
  return { dni, faktory, snacky, tyzdne, carbNaCarb, hlavnych };
}

let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }

zbierData().then(({ dni, faktory, snacky, tyzdne, carbNaCarb, hlavnych }) => {
  console.log(`Generátor: ${N} týždňov = ${dni.length} dní\n`);

  console.log("A1 — kcal-okná namiesto naťahovania porcií");
  ok("dní s potrebnou korekciou > 15 % je pod 15 % (predtým 51–64 %)", () => {
    // potrebná korekcia = cieľ / neškálovaný súčet dňa (nie aplikovaný faktor, ten je už zovretý)
    const x = pct(dni.filter(d => Math.abs(CIEL / d.base - 1) > 0.15).length, dni.length);
    assert.ok(x < 15, x.toFixed(1) + " % dní potrebuje korekciu > 15 %");
  });
  ok("žiadne jedlo nemá faktor > 150 %", () => {
    const zle = faktory.filter(f => f > 1.5001).length;
    assert.strictEqual(zle, 0, zle + " jedál s faktorom > 150 %");
  });
  ok("aspoň 90 % dní je v ±10 % cieľa (predtým 18–26 % pred škálovaním)", () => {
    const x = pct(dni.filter(d => Math.abs(d.kcal - CIEL) <= CIEL * 0.1).length, dni.length);
    assert.ok(x >= 90, x.toFixed(1) + " % dní v ±10 % cieľa");
  });

  console.log("\nA2 — bielkoviny ako multiplikátor váhy + oprava dňa");
  ok("medián bielkovín ≥ 95 g/deň (predtým 66,5)", () => {
    const m = median(dni.map(d => d.b));
    assert.ok(m >= 95, "medián = " + m.toFixed(1) + " g");
  });
  ok("dní pod 80 g bielkovín je menej ako 20 % (predtým 85 %)", () => {
    const x = pct(dni.filter(d => d.b < 80).length, dni.length);
    assert.ok(x < 20, x.toFixed(1) + " % dní pod 80 g");
  });

  console.log("\nA3 — poradie jedál a veľkosť večere");
  ok("celé poradie Obed ≥ Večera > Raňajky > Snack v ≥ 85 % dní (predtým 38 %)", () => {
    const uplne = dni.filter(d => ["Obed", "Večera", "Raňajky"].every(s => d.sloty[s] != null));
    const dobre = uplne.filter(d => {
      const sn = d.sloty["Snack"] != null ? d.sloty["Snack"] : -1;
      return d.sloty["Obed"] >= d.sloty["Večera"] && d.sloty["Večera"] > d.sloty["Raňajky"] && d.sloty["Raňajky"] > sn;
    }).length;
    const x = pct(dobre, uplne.length);
    assert.ok(x >= 85, x.toFixed(1) + " % dní má celé poradie");
  });
  ok("žiadny deň nemá večeru pod 250 kcal (predtým 37 %)", () => {
    const zle = dni.filter(d => d.sloty["Večera"] != null && d.sloty["Večera"] < 250);
    assert.strictEqual(zle.length, 0, zle.length + " dní s večerou pod 250 kcal");
  });

  console.log("\nA4 — 2× sacharid");
  ok("žiadny sacharidový hlavný chod nedostane sacharidovú prílohu (predtým 35 z 360)", () => {
    assert.strictEqual(carbNaCarb, 0, carbNaCarb + " z " + hlavnych + " hlavných chodov má 2× sacharid");
  });

  console.log("\nA5 — snacky");
  ok("≥ 80 unikátnych snackov na 30 týždňov (predtým 35)", () => {
    const n = Object.keys(snacky).length;
    assert.ok(n >= 80 * N / 30, n + " unikátnych snackov");
  });
  ok("žiadny snack sa nepoužije viac ako 6× (predtým 15×)", () => {
    const max = Math.max(0, ...Object.values(snacky));
    assert.ok(max <= 6, "najčastejší snack " + max + "×");
  });

  console.log("\nA6 — pamäť medzi týždňami");
  ok("susedné týždne nezdieľajú recept (predtým 11 z 29 párov)", () => {
    let zle = 0;
    for (let i = 1; i < tyzdne.length; i++)
      if ([...tyzdne[i]].some(id => tyzdne[i - 1].has(id))) zle++;
    assert.strictEqual(zle, 0, zle + " z " + (tyzdne.length - 1) + " párov susedných týždňov sa prekrýva");
  });

  console.log("\nA7 — triedy raňajkových báz");
  ok("ranajkyBaza rozoznáva kašu, jogurt, vajcia, palacinky, smoothie, nátierku aj sendvič", () => {
    const vzorky = {
      "kaša": { nazov: "Ovsená kaša s banánom", ingrediencie: [{ nazov: "Ovsené vločky" }] },
      "jogurt": { nazov: "Skyr s ovocím", ingrediencie: [{ nazov: "Skyr" }] },
      "vajcia": { nazov: "Praženica so slaninou", ingrediencie: [{ nazov: "Vajcia" }] },
      "palacinky": { nazov: "Ovsené lievance", ingrediencie: [{ nazov: "Múka" }] },
      "smoothie": { nazov: "Banánové smoothie", ingrediencie: [{ nazov: "Banán" }] },
      "nátierka": { nazov: "Hummus na chlieb", ingrediencie: [{ nazov: "Cícer" }] },
      "toast": { nazov: "Avokádový toast", ingrediencie: [{ nazov: "Toastový chlieb" }] },
      "tortilla": { nazov: "Raňajkový wrap", ingrediencie: [{ nazov: "Tortilla" }] },
    };
    Object.entries(vzorky).forEach(([ocakavane, r]) => {
      const b = app.ranajkyBaza({ id: "x" + ocakavane, tagy: [], ...r });
      assert.strictEqual(b, ocakavane, r.nazov + " → " + b);
    });
  });

  console.log("\nOK — " + bezov + " kontrol prešlo.");
}).catch(e => { console.error(String(e.message || e)); process.exit(1); });
