// Jednotky a prevody: gramy ↔ gramyNaJed, gZaJednotku, odolnosť voči neznámej jednotke.
// Beh: node test_jednotky.js
//
// CLAUDE.md: „Jednotky → gramy: gZaJednotku (jediné miesto), gramy a gramyNaJed sú navzájom
// inverzné." Tento súbor tú vetu overuje ako property-based test: nie na troch ručne vybraných
// príkladoch, ale na VŠETKÝCH jednotkách, ktoré sa v receptoch reálne vyskytujú, krát vzorka
// potravín s rôznou hustotou / g_za_ks / g_za_platok, krát 40 deterministicky náhodných množstiev.
const assert = require("assert");
const { load, mulberry32 } = require("./test_harness");

const app = load({ seed: 4242 });
let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }
function nadpis(t) { console.log(t); }
const cislo = x => typeof x === "number" && Number.isFinite(x);

// ── inventár jednotiek priamo z dát ────────────────────────────────────────────
// (nie ručný zoznam — keď niekto pridá recept s novou jednotkou, test to musí vidieť)
const JEDNOTKY_V_RECEPTOCH = new Map(); // jednotka → počet výskytov s NENULOVÝM množstvom
app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => {
  if (i.mnozstvo == null) return;
  const j = (i.jednotka || "").toLowerCase().trim();
  JEDNOTKY_V_RECEPTOCH.set(j, (JEDNOTKY_V_RECEPTOCH.get(j) || 0) + 1);
}));
// jednotky, pre ktoré app.js SĽUBUJE prevod na gramy
const HMOTNOSTNE = ["g", "gram", "gramov", "kg"];
const PREVODITELNE = new Set([...HMOTNOSTNE, "ml", ...Object.keys(app.ML_JED), ...Object.keys(app.KS_DEF), ...app.KS_JEDNOTKY, "balenie"]);

// vzorka potravín s rôznymi vlastnosťami — prevody závisia od hustoty a hmotnosti kusa
function vyberPotravinu(test) { return app.POTRAVINY.find(test); }
const VZORKA = [
  { popis: "bez zvláštností", p: app.najdiPotravinu("Soľ") },
  { popis: "hustota ≠ 1 (olej)", p: app.najdiPotravinu("Olivový olej") },
  { popis: "g_za_ks (vajce)", p: vyberPotravinu(p => p.g_za_ks > 0 && /vajc/.test(p.kluc)) || vyberPotravinu(p => p.g_za_ks > 0) },
  { popis: "g_za_platok (toastový chlieb)", p: app.najdiPotravinu("Toastový chlieb") },
  { popis: "balenie_g", p: vyberPotravinu(p => p.balenie_g > 0) },
  { popis: "žiadna potravina (null)", p: null },
].filter(x => x.p !== undefined);

nadpis("J0 — inventár jednotiek");
ok("každá jednotka z receptov je buď prevoditeľná, alebo popisná (bez množstva)", () => {
  const neprevoditelne = [...JEDNOTKY_V_RECEPTOCH.entries()].filter(([j]) => j !== "" && !PREVODITELNE.has(j));
  // popisné jednotky („podľa chuti", „na smaženie") sú dátový, nie kódový problém — test len
  // stráži, aby ich nepribúdalo bez povšimnutia, a vypíše ich
  const spolu = neprevoditelne.reduce((a, [, n]) => a + n, 0);
  console.log("      (" + JEDNOTKY_V_RECEPTOCH.size + " jednotiek; neprevoditeľné s množstvom: " +
    neprevoditelne.length + " druhov / " + spolu + " výskytov)");
  assert.ok(spolu <= 20, spolu + " ingrediencií má množstvo v neprevoditeľnej jednotke: " +
    JSON.stringify(neprevoditelne));
});

nadpis("\nJ1 — gramy ↔ gramyNaJed sú navzájom inverzné (property-based)");
ok("pre každú prevoditeľnú jednotku × vzorku potravín × 40 množstiev platí gramyNaJed(gramy(x)) = x", () => {
  const rnd = mulberry32(20260830);
  const jednotky = [...PREVODITELNE].filter(j => j !== "balenie"); // balenie sa testuje zvlášť (závisí od balenie_g)
  let kontrol = 0, preskocene = 0;
  jednotky.forEach(jed => {
    VZORKA.forEach(({ popis, p }) => {
      for (let i = 0; i < 40; i++) {
        const mn = Math.round(rnd() * 5000) / 100 + 0.01; // 0,01 – 50,01
        const g = app.gramy({ mnozstvo: mn, jednotka: jed }, p);
        assert.ok(cislo(g), `gramy(${mn} ${jed}, ${popis}) = ${g}`);
        assert.ok(g >= 0, `gramy(${mn} ${jed}, ${popis}) = ${g} < 0`);
        const spat = app.gramyNaJed(g, jed, p);
        if (g === 0) { // jednotku nevieme previesť (napr. „ks" bez g_za_ks) — kontrakt je 0 g a null späť
          assert.strictEqual(spat, null, `gramy=0 pri ${jed}/${popis}, ale gramyNaJed vrátilo ${spat}`);
          preskocene++; continue;
        }
        assert.ok(cislo(spat), `gramyNaJed(${g}, ${jed}, ${popis}) = ${spat}`);
        assert.ok(Math.abs(spat - mn) < 1e-9,
          `${mn} ${jed} (${popis}) → ${g} g → ${spat} ${jed}`);
        kontrol++;
      }
    });
  });
  console.log("      (" + kontrol + " uzavretých prevodov, " + preskocene + " × neprevoditeľná dvojica jednotka/potravina)");
  assert.ok(kontrol > 500, "test prakticky nič neoveril: len " + kontrol + " prevodov");
});
ok("jednotka „balenie“ je inverzná tam, kde potravina má balenie_g", () => {
  const p = app.POTRAVINY.find(x => x.balenie_g > 0);
  assert.ok(p, "v potraviny.json nie je ani jedna potravina s balenie_g");
  [0.5, 1, 2, 3.25].forEach(n => {
    const g = app.gramy({ mnozstvo: n, jednotka: "balenie" }, p);
    assert.ok(Math.abs(g - n * p.balenie_g) < 1e-9, n + " balenie = " + g + " g");
    assert.ok(Math.abs(app.gramyNaJed(g, "balenie", p) - n) < 1e-9, "spätný prevod balenia");
  });
});
ok("gramy je lineárne v množstve (2× množstvo = 2× gramy)", () => {
  [...PREVODITELNE].forEach(jed => VZORKA.forEach(({ p }) => {
    const a = app.gramy({ mnozstvo: 3, jednotka: jed }, p);
    const b = app.gramy({ mnozstvo: 6, jednotka: jed }, p);
    assert.ok(Math.abs(b - 2 * a) < 1e-9, jed + ": 3→" + a + ", 6→" + b);
  }));
});
ok("hustota sa uplatní na ml aj na lyžice (olej 0,92 g/ml)", () => {
  const olej = app.najdiPotravinu("Olivový olej");
  assert.ok(olej && olej.hustota && olej.hustota !== 1, "olej nemá hustotu ≠ 1: " + JSON.stringify(olej && olej.hustota));
  assert.ok(Math.abs(app.gramy({ mnozstvo: 100, jednotka: "ml" }, olej) - 100 * olej.hustota) < 1e-9);
  assert.ok(Math.abs(app.gramy({ mnozstvo: 2, jednotka: "PL" }, olej) - 2 * 15 * olej.hustota) < 1e-9,
    "2 PL oleja = " + app.gramy({ mnozstvo: 2, jednotka: "PL" }, olej) + " g");
});

nadpis("\nJ2 — gZaJednotku pre každú jednotku z receptov");
ok("počítateľná jednotka má kladnú hmotnosť kusa a nepreberá g_za_ks", () => {
  // KS_DEF má prednosť pred g_za_ks: „Šalát 4 list" nesmie byť 4 hlávky
  const salat = app.najdiPotravinu("Šalát");
  Object.keys(app.KS_DEF).forEach(j => {
    const g = app.gZaJednotku(j, salat);
    assert.strictEqual(g, app.KS_DEF[j], j + " → " + g + " (KS_DEF hovorí " + app.KS_DEF[j] + ")");
    assert.ok(g > 0, j + " má nulovú hmotnosť");
  });
});
ok("„plátok“ berie g_za_platok potraviny, nie paušálnych 20 g", () => {
  const toast = app.najdiPotravinu("Toastový chlieb");
  assert.ok(toast && toast.g_za_platok > 0, "toastový chlieb nemá g_za_platok");
  assert.strictEqual(app.gZaJednotku("plátok", toast), toast.g_za_platok);
  assert.strictEqual(app.gZaJednotku("plátok", null), app.KS_DEF["plátok"]); // bez potraviny paušál
});
ok("„ks“ bez g_za_ks vráti 0 (radšej nič než tichých 60 g)", () => {
  const bez = app.POTRAVINY.find(p => !p.g_za_ks);
  assert.ok(bez, "každá potravina má g_za_ks — test stratil zmysel");
  app.KS_JEDNOTKY.forEach(j => assert.strictEqual(app.gZaJednotku(j, bez), 0, j + " bez g_za_ks"));
  assert.strictEqual(app.gZaJednotku("ks", null), 0);
});
ok("neznáma / popisná jednotka vráti 0 a nikdy NaN", () => {
  ["podľa chuti", "na smaženie", "na ozdobenie", "nezmysel", "", "  ", "🍕"].forEach(j => {
    const g = app.gZaJednotku(j, app.najdiPotravinu("Soľ"));
    assert.ok(cislo(g), j + " → " + g);
    assert.strictEqual(g, 0, j + " → " + g);
    assert.strictEqual(app.gramy({ mnozstvo: 5, jednotka: j }, app.najdiPotravinu("Soľ")), 0);
    assert.strictEqual(app.gramyNaJed(100, j, app.najdiPotravinu("Soľ")), null, j + " má vrátiť null");
  });
});
ok("každá jednotka z receptov prejde cez gramy bez NaN/Infinity (aj bez potraviny)", () => {
  [...JEDNOTKY_V_RECEPTOCH.keys()].forEach(j => {
    [null, app.najdiPotravinu("Soľ"), app.najdiPotravinu("Olivový olej")].forEach(p => {
      const g = app.gramy({ mnozstvo: 7, jednotka: j }, p);
      assert.ok(cislo(g) && g >= 0, "jednotka „" + j + "“ → " + g);
    });
  });
});

nadpis("\nJ3 — celý recepár: žiadna ingrediencia nevyrobí NaN");
ok("gramy() na všetkých 1956 receptoch vracia konečné nezáporné číslo", () => {
  let n = 0, nula = 0;
  app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => {
    const p = app.najdiPotravinu(i.nazov);
    const g = app.gramy(i, p);
    assert.ok(cislo(g) && g >= 0, r.id + " / " + i.nazov + " " + i.mnozstvo + " " + i.jednotka + " → " + g);
    n++; if (g === 0) nula++;
  }));
  console.log("      (" + n + " ingrediencií, z toho " + nula + " s nulovými gramami)");
});
ok("mnozstvo:null je vždy 0 g, nikdy NaN", () => {
  ["g", "ks", "ml", "PL", "podľa chuti", ""].forEach(j =>
    assert.strictEqual(app.gramy({ mnozstvo: null, jednotka: j }, app.najdiPotravinu("Soľ")), 0, j));
});

nadpis("\nJ4 — nedeliteľné jednotky sa zaokrúhľujú na celé");
ok("skalovanaHodnota nedeliteľnú jednotku neškáluje faktorom veľkosti porcie", () => {
  // kus/plátok/rožok: 2 porcie × 85 % nesmie dať 1,7 vajca — faktor veľkosti sa naň neuplatní
  app.NEDELITELNE_JEDNOTKY.forEach(j => {
    assert.strictEqual(app.skalovanaHodnota(2, j, 2, 0.85), 4, j);
  });
  assert.ok(Math.abs(app.skalovanaHodnota(100, "g", 2, 0.85) - 170) < 1e-9, "gramy sa škálujú oboma faktormi");
});
ok("prevodJednotka nedeliteľnú jednotku zaokrúhli na celé a nikdy nedá 0 pri kladnom množstve", () => {
  app.NEDELITELNE_JEDNOTKY.forEach(j => {
    assert.strictEqual(app.prevodJednotka(0.3, j), "1 " + j, "0,3 " + j + " → " + app.prevodJednotka(0.3, j));
    assert.strictEqual(app.prevodJednotka(2.6, j), "3 " + j, "2,6 " + j + " → " + app.prevodJednotka(2.6, j));
    assert.strictEqual(app.prevodJednotka(0, j), "0 " + j, "0 " + j + " → " + app.prevodJednotka(0, j));
  });
  // deliteľná jednotka sa zaokrúhľovať nesmie
  assert.ok(app.prevodJednotka(2.6, "g").startsWith("2,6") || app.prevodJednotka(2.6, "g").startsWith("2.6"),
    "2,6 g → " + app.prevodJednotka(2.6, "g"));
  // to isté cez nákup: 0,4 ks sa nesmie zobraziť ako „0 ks“
  const G = { matched: false, raw: 0.4, jednotka: "ks", zdroje: [] };
  assert.strictEqual(app.zobrazMnozstvo(G), "1 ks", app.zobrazMnozstvo(G));
});

console.log("\nOK — " + bezov + " kontrol prešlo.");
