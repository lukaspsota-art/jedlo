// AUDIT KALORICKÝCH ODĽAHLÝCH HODNÔT — kde sa deklarované `kcal_na_porciu` a dopočet
// zo `potraviny.json` rozchádzajú o viac než PRAH %.
//
// Prečo na tom záleží: `_vyzivaVypocet` verí deklarovanému kcal (B4), ale makrá a cenu
// PREŠKÁLUJE faktorom k = deklarované / dopočítané. Odchýlka 60 % teda neznamená len zlé kcal —
// znamená, že recept ukazuje o 60 % zlé bielkoviny aj cenu. Preto sa oplatí ísť po najhorších.
//
//   node scripts/audit_kcal_outliers.js              tabuľka, najhoršie hore
//   node scripts/audit_kcal_outliers.js --prah 25    iný prah
//   node scripts/audit_kcal_outliers.js --json
//   node scripts/audit_kcal_outliers.js --extremy    len < MIN_KCAL alebo > MAX_KCAL na porciu
const { load } = require("../test_harness");
const app = load({ stav: {} });

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
const PRAH = Number(arg("prah", 40));
const JSONOUT = process.argv.includes("--json");
const EXTREMY = process.argv.includes("--extremy");
const MIN_KCAL = 30, MAX_KCAL = 1800;   // hranice zdravého rozumu na porciu

const TUKY = new Set(app.POTRAVINY.filter(p => p.oddelenie === "Oleje a tuky").map(p => p.kluc));
["maslo", "masť", "omastok", "ghí"].forEach(k => TUKY.add(k));

function rozbor(r) {
  const por = r.porcie || 1;
  let tukKcal = 0, nenaparene = [], bezGramov = [], top = [];
  (r.ingrediencie || []).forEach(i => {
    const p = app.najdiPotravinu(i.nazov);
    if (!p) { if (i.mnozstvo != null) nenaparene.push(i.nazov + " (" + i.mnozstvo + " " + i.jednotka + ")"); return; }
    const g = app.gramy(i, p);
    if (!(g > 0)) { if (i.mnozstvo != null) bezGramov.push(i.nazov + " (" + i.mnozstvo + " " + i.jednotka + " → " + p.kluc + ")"); return; }
    const kc = g * p.kcal / 100;
    if (TUKY.has(p.kluc)) tukKcal += kc;
    top.push({ nazov: i.nazov, kluc: p.kluc, g: Math.round(g), kcal: Math.round(kc / por) });
  });
  top.sort((a, b) => b.kcal - a.kcal);
  return { tukKcalPor: tukKcal / por, nenaparene, bezGramov, top: top.slice(0, 4) };
}

const rows = [];
app.RECEPTY.forEach(r => {
  const dekl = r.kcal_na_porciu || 0;
  const v = app.vyzivaReceptu({ ...r, kcal_na_porciu: 0 });
  const vyp = v.kcal;
  const d = rozbor(r);
  const extrem = (dekl && (dekl < MIN_KCAL || dekl > MAX_KCAL)) ||
                 (!dekl && vyp > 5 && (vyp < MIN_KCAL || vyp > MAX_KCAL));
  if (!(dekl > 0) || !(vyp > 5)) {
    if (extrem || !dekl) rows.push({ id: r.id, nazov: r.nazov, porcie: r.porcie || 1, dekl: dekl || null,
      vyp: Math.round(vyp), odch: null, extrem, ...d, pricina: !dekl ? "bez deklarácie" : "nedopočítateľné" });
    return;
  }
  const q = vyp / dekl, odch = Math.abs(q - 1) * 100;
  if (!EXTREMY && odch < PRAH && !extrem) return;
  if (EXTREMY && !extrem) return;
  // hypotéza príčiny
  let pricina = "?";
  if (d.nenaparene.length && q < 1) pricina = "nenapárované suroviny";
  else if (d.tukKcalPor > 0.35 * vyp && q > 1) pricina = "tuk (vyprážanie/marináda?)";
  else if (q > 1 && d.top[0] && d.top[0].kcal > 0.5 * vyp) pricina = "dominuje " + d.top[0].kluc;
  else if (q > 1) pricina = "výpočet vyšší";
  else pricina = "výpočet nižší";
  rows.push({ id: r.id, nazov: r.nazov, porcie: r.porcie || 1, dekl, vyp: Math.round(vyp),
    odch: Math.round(odch), q: +q.toFixed(2), extrem, pricina, ...d });
});

rows.sort((a, b) => (b.odch || 1e9) - (a.odch || 1e9));

if (JSONOUT) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

console.log("prah odchýlky: " + PRAH + " %   ·   extrémy: < " + MIN_KCAL + " alebo > " + MAX_KCAL + " kcal/porcia");
console.log("nájdených: " + rows.length + "\n");
console.log("id".padEnd(44) + "por".padStart(4) + "dekl".padStart(6) + "výpoč".padStart(7) + "odch%".padStart(7) + "  príčina");
rows.forEach(z => console.log(
  z.id.padEnd(44).slice(0, 44) + String(z.porcie).padStart(4) + String(z.dekl == null ? "—" : z.dekl).padStart(6) +
  String(z.vyp).padStart(7) + String(z.odch == null ? "—" : z.odch).padStart(7) + "  " +
  (z.extrem ? "‼ " : "") + z.pricina +
  (z.nenaparene.length ? "  [nenapárené: " + z.nenaparene.slice(0, 2).join("; ").slice(0, 50) + "]" : "") +
  (z.bezGramov.length ? "  [bez gramov: " + z.bezGramov.slice(0, 2).join("; ").slice(0, 50) + "]" : "")));
