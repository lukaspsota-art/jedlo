// B1: kontrolný zoznam párovania surovín na potraviny.json.
// Vypíše ingrediencie, kde napárovaný kľúč NEZAČÍNA na prvom slove názvu (pred kľúčom je ešte
// nejaké slovo) — presne tie prípady, kde modifikátor mení potravinu („kokosové MLIEKO",
// „maslová TEKVICA", „sušené HRÍBY"). Prejdi ich a čo je zle, doplň ako presný kľúč.
//
//   node scripts/kontrola_parovania.js            zoskupené, najčastejšie hore
//   node scripts/kontrola_parovania.js --nenapar  len nenapárované suroviny
//   node scripts/kontrola_parovania.js --vsetko   všetky páry (aj zhody od prvého slova)
const { load } = require("../test_harness");

const app = load({ stav: {} });
const rezim = process.argv[2] || "";

const pary = new Map();      // "názov→kľúč" → {n, nazov, kluc, poz, priklad}
const nenaparovane = new Map();

app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => {
  const p = app.najdiPotravinu(i.nazov);
  if (!p) {
    const z = nenaparovane.get(i.nazov) || { n: 0, priklad: r.id };
    z.n++; nenaparovane.set(i.nazov, z);
    return;
  }
  const slova = app._slova(i.nazov);
  const poz = app._sadneOd(slova, app._slova(p.kluc).map(app._kmen));
  const k = i.nazov + " → " + p.kluc;
  const z = pary.get(k) || { n: 0, nazov: i.nazov, kluc: p.kluc, poz, kcal: p.kcal, cena: p.cena100, priklad: r.id };
  z.n++; pary.set(k, z);
}));

if (rezim === "--nenapar") {
  [...nenaparovane.entries()].sort((a, b) => b[1].n - a[1].n)
    .forEach(([n, z]) => console.log(String(z.n).padStart(3) + "×  " + n + "   (" + z.priklad + ")"));
  console.log("\nSPOLU nenapárovaných surovín: " + nenaparovane.size);
} else {
  const zoz = [...pary.values()].filter(z => rezim === "--vsetko" || z.poz > 0).sort((a, b) => b.n - a.n);
  zoz.forEach(z => console.log(
    String(z.n).padStart(3) + "×  " + z.nazov.padEnd(38).slice(0, 38) +
    " → " + z.kluc.padEnd(24).slice(0, 24) +
    " (" + z.kcal + " kcal, " + (z.cena != null ? z.cena + " €/100 g" : "BEZ CENY") + ")  " + z.priklad));
  console.log("\nPárov s ďalším slovom PRED kľúčom: " + zoz.length +
    "  ·  všetkých párov: " + pary.size + "  ·  nenapárovaných surovín: " + nenaparovane.size);
}
