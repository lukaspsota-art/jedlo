// Výpočtové testy k auditu 2026-08-18 (nálezy B1–B6). Beh: node test_vypocty.js
// Očakávané hodnoty sú KONKRÉTNE čísla z auditu — každý test padne na kóde spred opravy.
const assert = require("assert");
const { load } = require("./test_harness");

const app = load({ stav: {} });
const g = (nazov, mnozstvo, jednotka) => {
  const p = app.najdiPotravinu(nazov);
  return app.gramy({ nazov, mnozstvo, jednotka }, p);
};
const ing = (id, vzor) => {
  const r = app.receptById(id);
  assert.ok(r, "recept neexistuje: " + id);
  const i = (r.ingrediencie || []).find(x => vzor.test(x.nazov));
  assert.ok(i, "ingrediencia " + vzor + " nie je v " + id);
  return i;
};

let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }

// ─────────────────────────────────────────────────────────── B2: „ks" bez hmotnosti
console.log("B2 — počítateľné jednotky bez g_za_ks (predtým paušál 60 g)");
ok("chicken-biryani: Kardamómy 4 ks ≤ 5 g (predtým 240 g)", () => {
  const i = ing("chicken-biryani", /ardam/i);
  const gr = app.gramy(i, app.najdiPotravinu(i.nazov));
  assert.ok(gr <= 5, "kardamómy = " + gr + " g");
});
ok("chicken-adobo: 3 bobkové listy prestali robiť 141 kcal/porciu (760 → 619)", () => {
  // zvyšok cesty na deklarovaných 520 kcal dorobí B1 (Kuracích stehien → kľúč „kuracie steh")
  const k = app.kcalPorcia(app.receptById("chicken-adobo"));
  assert.ok(k <= 630, "chicken-adobo = " + k + " kcal");
});
ok("grilovane-jalapeno: 14 plátkov slaniny ≤ 400 g (predtým 840 g)", () => {
  const i = ing("grilovane-jalapeno-syr-slanina", /slanin/i);
  const gr = app.gramy(i, app.najdiPotravinu(i.nazov));
  assert.ok(gr > 0 && gr <= 400, "slanina = " + gr + " g");
});
ok("bobkový list 3 ks ≤ 1 g (predtým 180 g)", () => {
  const gr = g("Bobkový list", 3, "ks");
  assert.ok(gr > 0 && gr <= 1, "bobkový list = " + gr + " g");
});
ok("neznáma hmotnosť kusa → 0 g a príznak „≈ odhad\"", () => {
  const fake = { nazov: "Vymyslená surovina", mnozstvo: 2, jednotka: "ks" };
  assert.strictEqual(app.gramy(fake, { kluc: "x", hustota: 1 }), 0);
  const r = { id: "_t", nazov: "T", porcie: 1, ingrediencie: [{ nazov: "Sezam", mnozstvo: 3, jednotka: "ks" }] };
  assert.ok(app.vyzivaReceptu(r).pribl, "recept s nedopočítanou surovinou musí byť označený ako odhad");
});

console.log("\nOK — " + bezov + " kontrol prešlo.");
