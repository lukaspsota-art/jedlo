// AUDIT (PRAVDA-V-ČÍSLACH): recepty, kde sa `kcal_na_porciu` a dopočet zo surovín rozchádzajú
// natoľko, že faktor B4 (k = deklarované/dopočítané) makrám vymyslí hodnoty.
// Pásmo dôvery je ⟨0,5; 2⟩ na pomere q = dopočet / deklarované.
//   q > 2   → dopočet je oveľa vyšší: buď `porcie` počíta dávky, alebo je deklarácia podstrelená
//   q < 0,5 → dopočet je oveľa nižší: väčšinou CHÝBAJÚ gramy (ks bez g_za_ks, nenapárovaná surovina)
// Použitie: node scripts/audit_faktor_k.js [--json] [--vsetko]
const { load } = require("../test_harness");
const app = load({ stav: { profil: { osoby: 2, kcal: 1450 } }, seed: 5 });
const json = process.argv.includes("--json");

function rozbor(r) {
  let kc = 0, b = 0, chybaG = 0, chybaP = 0, celkom = 0, hmota = 0;
  (r.ingrediencie || []).forEach(i => {
    if (i.mnozstvo == null) return;
    celkom++;
    const p = app.najdiPotravinu(i.nazov);
    if (!p) { chybaP++; return; }
    const g = app.gramy(i, p) * app.vsiaknuteho(i);
    if (!(g > 0)) { chybaG++; return; }
    kc += g * p.kcal / 100; b += g * p.bielkoviny / 100; hmota += g;
  });
  const por = r.porcie || 1;
  return { kcal: kc / por, b: b / por, hmota: hmota / por, chybaG, chybaP, celkom };
}

const zoz = [];
app.RECEPTY.forEach(r => {
  if (!(r.kcal_na_porciu > 0)) return;
  const c = rozbor(r);
  if (!(c.kcal > 5)) return;
  const q = c.kcal / r.kcal_na_porciu;
  const v = app.vyzivaReceptu(r);
  zoz.push({ id: r.id, kat: r.kategoria, porcie: r.porcie, dekl: r.kcal_na_porciu, zdroj: r.kcal_zdroj || "",
    q, dopocet: Math.round(c.kcal), surB: c.b, hmota: Math.round(c.hmota),
    chybaG: c.chybaG, chybaP: c.chybaP, ing: c.celkom, zobrB: v.b, sporne: !!v.sporne });
});
const mimo = zoz.filter(x => x.q > 2 || x.q < 0.5).sort((a, b) => b.q - a.q);
if (json) { console.log(JSON.stringify(mimo, null, 1)); process.exit(0); }
console.log("receptov s deklaráciou aj dopočtom:", zoz.length);
console.log("mimo pásma ⟨0,5; 2⟩:", mimo.length, " (q>2:", mimo.filter(x=>x.q>2).length, "· q<0,5:", mimo.filter(x=>x.q<0.5).length, ")");
console.log("");
console.log("id".padEnd(50) + "  q      dekl  dopočet  porcie  g/por  chýba(g/pár)/ing  kat");
mimo.forEach(x => console.log(
  x.id.padEnd(50) + "  " + x.q.toFixed(2).padStart(5) + " " + String(x.dekl).padStart(6) +
  String(x.dopocet).padStart(9) + String(x.porcie).padStart(8) + String(x.hmota).padStart(7) +
  ("   " + x.chybaG + "/" + x.chybaP + " z " + x.ing).padEnd(18) + " " + (x.kat || "")));
