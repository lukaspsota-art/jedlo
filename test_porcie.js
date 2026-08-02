// Kontrola: počet porcií pri otvorení receptu z plánu = dni bloku × stravníci (nie kcal-podiel na druhú).
// Spustenie: node test_porcie.js
const fs = require("fs"), vm = require("vm"), assert = require("assert");

const STAV = {
  viewOd: "2026-07-27",                                   // pondelok
  hranice: [true, false, true, false, false, true, false], // bloky A=Po-Ut, B=St-Št-Pi, C=So-Ne
  blokMode: true,
  profil: { kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }] },
  plan: { "2026-07-29": { "Obed": "x" } },
  planF: { "2026-07-29": { "Obed": 0.85 } },              // rescaleDen: deň bol o ~18 % nad cieľom
};

const src = fs.readFileSync(__dirname + "/data/app.js", "utf8")
  .replace("__DATA__", "[]").replace("__POTRAVINY__", "[]").replace("__JEDALNICKY__", "[]")
  // ponytail: capture hneď po inicializácii S — zvyšok skriptu je DOM a padne, funkcie sú už hoistnuté
  .replace("S.blokMode=(S.blokMode!==undefined?S.blokMode:true);",
           "S.blokMode=(S.blokMode!==undefined?S.blokMode:true); globalThis.__S=S;");

const box = { localStorage: { getItem: () => JSON.stringify(STAV), setItem() {} }, console };
try { vm.runInNewContext(src, box); } catch (e) { /* DOM init padne, nezaujíma nás */ }
assert.ok(box.__S, "S sa nezachytilo — zmenil sa init v app.js?");

const di = 2, slot = "Obed";                              // streda = blok B (St-Št-Pi)
const blokLen = box.blokDni(di).length;
const porcie = Math.round(blokLen * box.porcieSlot(di, slot));

assert.strictEqual(blokLen, 3, "blok B má mať 3 dni");
assert.strictEqual(box.pf(di, slot), 0.85, "% veľkosti porcie sa má načítať z planF");
assert.strictEqual(porcie, 6, `3 dni × 2 stravníci = 6 porcií, dostal som ${porcie}`);
assert.strictEqual(box.mnozMult(di, slot), 2 * 0.85, "množstvo/deň = stravníci × %, nie × % na druhú");

// bez % faktora sa kcal-korekcia musí naďalej robiť cez pocetPorcii
delete box.__S.planF["2026-07-29"];
assert.strictEqual(box.pf(di, slot), 1);
assert.ok(box.porcieSlot(di, slot) > 0, "fallback na pocetPorcii má stále fungovať");

console.log("OK — porcie z plánu:", porcie, "× " + Math.round(0.85 * 100) + "%");
