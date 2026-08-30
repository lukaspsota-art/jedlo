// AUDIT VYPRÁŽANIA — koľko oleja recept naozaj skonzumuje.
//
// Problém: appka ráta VŠETOK olej z ingrediencií do výživy. Pri vyprážaní sa však olej
// z hrnca nezje — vsiakne len 10–25 % podľa typu jedla. 300 ml oleja = 2 650 kcal,
// čo rozbije nielen recept, ale aj celý deň v jedálničku.
//
// Skript nájde recepty, kde JE ZÁROVEŇ:
//   1) tuk (Oleje a tuky + maslo) v množstve neprimeranom počtu porcií  (> PRAH g/porcia)
//   2) v postupe vyprážanie (vypráž, fritéza, ponor, rozohrej olej, v hlbokom oleji…)
//
//   node scripts/audit_olej.js               tabuľka
//   node scripts/audit_olej.js --json        strojovo čitateľný výstup
//   node scripts/audit_olej.js --prah 15     iný prah g tuku na porciu
const { load } = require("../test_harness");
const app = load({ stav: {} });

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const PRAH = Number(arg("prah", 30));           // g tuku na porciu
const JSONOUT = process.argv.includes("--json");

// vyprážanie v postupe/tipoch — nie „restovanie“ (tam sa olej zje celý)
const RE_VYPRAZ = /vypráž|vyprаž|vyprážan|fritéz|fritov|ponor(?:te|íme|iť|)\s|do\s+rozpálen|rozpálen(?:om|ý|ého)\s+olej|hlbok(?:om|ého)\s+olej|v\s+oleji\s+z\s+oboch|smaž(?:te|íme)?\s+v\s+oleji|plávať|olej\s+rozohrej|rozohrejte\s+olej|rozohrej(?:eme|te)?\s+(?:v\s+)?(?:hrnc|fritéz|panvic)[^.]{0,40}olej|na\s+fritovanie|na\s+vyprážanie/i;
// zvlášť: palacinky/lievance — tenká vrstva, olej sa zje celý
const RE_TENKA = /palacink|lievanc|plack[ay]|omelet/i;

const jeTuk = p => p && (p.oddelenie === "Oleje a tuky" || /maslo|masť|mast$|omastok|ghí|bravčová masť/.test(p.kluc));

const najdene = [];
app.RECEPTY.forEach(r => {
  const por = r.porcie || 1;
  const text = [(r.postup || []).join(" "), r.tipy || "", r.popis || ""].join(" ");
  let tukG = 0, tukKcal = 0, polozky = [];
  (r.ingrediencie || []).forEach(i => {
    const p = app.najdiPotravinu(i.nazov);
    if (!jeTuk(p)) return;
    const g = app.gramy(i, p);
    if (!(g > 0)) return;
    tukG += g; tukKcal += g * p.kcal / 100;
    polozky.push({ nazov: i.nazov, mnozstvo: i.mnozstvo, jednotka: i.jednotka, g: Math.round(g), kcal: Math.round(g * p.kcal / 100), kluc: p.kluc });
  });
  if (!tukG) return;
  const gNaPorciu = tukG / por;
  const vypraza = RE_VYPRAZ.test(text);
  if (!(gNaPorciu > PRAH && vypraza)) return;

  const v = app.vyzivaReceptu({ ...r, kcal_na_porciu: 0 });   // čistý súčet surovín, bez brzdy B4
  const sTukom = Math.round(v.kcal);
  const bezTuku = Math.round(v.kcal - tukKcal / por);
  najdene.push({
    id: r.id, nazov: r.nazov, kategoria: r.kategoria, porcie: por,
    deklarovane: r.kcal_na_porciu || null, kcal_zdroj: r.kcal_zdroj || null,
    tukG: Math.round(tukG), tukGnaPorciu: Math.round(gNaPorciu), tukKcalNaPorciu: Math.round(tukKcal / por),
    kcalSTukom: sTukom, kcalBezTuku: bezTuku, tenka: RE_TENKA.test(r.nazov + " " + text),
    polozky
  });
});

najdene.sort((a, b) => b.tukKcalNaPorciu - a.tukKcalNaPorciu);

if (JSONOUT) { console.log(JSON.stringify(najdene, null, 1)); process.exit(0); }

console.log("prah: > " + PRAH + " g tuku na porciu + vyprážanie v postupe");
console.log("nájdených receptov: " + najdene.length + " z " + app.RECEPTY.length + "\n");
console.log("id".padEnd(38) + "por".padStart(4) + "tuk g".padStart(7) + "g/por".padStart(6) +
  "kcal_tuk".padStart(9) + "kcal_s".padStart(8) + "kcal_bez".padStart(9) + "  deklar.");
najdene.forEach(z => console.log(
  z.id.padEnd(38).slice(0, 38) + String(z.porcie).padStart(4) + String(z.tukG).padStart(7) +
  String(z.tukGnaPorciu).padStart(6) + String(z.tukKcalNaPorciu).padStart(9) +
  String(z.kcalSTukom).padStart(8) + String(z.kcalBezTuku).padStart(9) +
  "  " + (z.deklarovane != null ? z.deklarovane + (z.kcal_zdroj ? " (" + z.kcal_zdroj + ")" : " (kurát.)") : "—")));
const sucet = najdene.reduce((a, z) => a + z.tukKcalNaPorciu, 0);
console.log("\npriemer kcal z tuku na porciu: " + Math.round(sucet / (najdene.length || 1)));
