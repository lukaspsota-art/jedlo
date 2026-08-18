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

// dva „recepty" s pevnými kcal_na_porciu — POTRAVINY sú prázdne, takže vyzivaReceptu vráti 0
// a kcalPorcia spadne na kcal_na_porciu (600 kcal). Deň s 2 slotmi = 1200 kcal základ.
const FAKE = JSON.stringify([
  { id: "r1", nazov: "R1", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [], postup: [], kcal_na_porciu: 600 },
]);

const src = fs.readFileSync(__dirname + "/data/app.js", "utf8")
  .replace("__DATA__", FAKE).replace("__POTRAVINY__", "[]").replace("__JEDALNICKY__", "[]")
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
// B9 (audit 2026-08-18): % veľkosti porcie je kalorická korekcia, nie zľava z množstva jedla —
// domácnosť dostane vždy svoj dopyt, len rozdelený na viac menších porcií. 3 dni × 2 stravníci
// pri 85 % porcii = 7 porcií po 85 % (≈ 6 plných) a množstvo surovín na deň zostáva 2 porcie.
assert.strictEqual(porcie, 7, `3 dni × 2 stravníci pri 85 % porcii = 7 porcií, dostal som ${porcie}`);
assert.ok(Math.abs(box.mnozMult(di, slot) - 2) < 1e-9,
  `množstvo/deň = 2 plné porcie (stravníci), dostal som ${box.mnozMult(di, slot)}`);

// bez % faktora sa kcal-korekcia musí naďalej robiť cez pocetPorcii
delete box.__S.planF["2026-07-29"];
assert.strictEqual(box.pf(di, slot), 1);
assert.ok(box.porcieSlot(di, slot) > 0, "fallback na pocetPorcii má stále fungovať");

// --- stravníci s ROZDIELNYMI kcal: navarené množstvo musí pokryť domácnosť, nie len hlavného stravníka ---
// (predtým sa pri zapnutom „Dorovnať dni na cieľ" vrátil čistý počet osôb a druhý stravník ostal hladný)
const S2 = box.__S;
S2.profil.stravnici = [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 2100 }];
S2.plan = { "2026-07-29": { Obed: "r1", Večera: "r1" } };   // 600 + 600 = 1200 kcal základ dňa
S2.planF = { "2026-07-29": { Obed: 0.85, Večera: 0.85 } };

const base = box.baseDayKcal(di);
assert.strictEqual(base, 1200, `základ dňa má byť 1200 kcal, dostal som ${base}`);

const dopyt = 1450 + 2100;
const dodane = base * box.pf(di, "Obed") * box.porcieSlot(di, "Obed");
assert.ok(Math.abs(dodane - dopyt) < 1,
  `navarené kcal (${Math.round(dodane)}) musia sedieť s dopytom domácnosti (${dopyt})`);

// s rovnakými kcal pre všetkých ostáva výsledok pri počte osôb
S2.profil.stravnici = [{ nazov: "A", kcal: 1200 }, { nazov: "B", kcal: 1200 }];
assert.ok(Math.abs(box.porcieSlot(di, "Obed") - 2 / 0.85) < 0.001,
  "pri rovnakých cieľoch = počet osôb / % veľkosti porcie");

console.log("OK — porcie z plánu:", porcie, "× " + Math.round(0.85 * 100) + "%",
  "| domácnosť 1450+2100 kcal dostane", Math.round(dodane), "kcal");
