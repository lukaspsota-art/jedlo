// Druhý priechod cez recepty s vyprážaním / nálevom / marinádou (agent PRAVDA-V-ČÍSLACH).
// Prvý priechod (scripts/oprav_olej.js) označil 10 receptov. Tento dopĺňa 5, ktoré mu ušli:
// hľadal len „tuk > 30 g na porciu", takže recepty s veľa porciami (grilovaná paprika, zelerový
// šalát) a marinády prepadli sitom. Koeficienty sú z tabuľky v report-data-kcal.md §1.
const P = require("./lib_patch_json");
const path = require("path");
const R = f => path.join(__dirname, "..", "recepty", f + ".json");

const OPRAVY = [
  { id: "viedensky-rezen", ing: "Masť domáca bravčová", vs: 0.18,
    dovod: "trojobal (múka–vajce–strúhanka) v 150 ml masti; masť zostáva na panvici a na kuchynskom papieri (postup to výslovne uvádza)" },
  { id: "zelerovy-salat-dia", ing: "Olivový olej", vs: 0.15,
    dovod: "100 ml oleja na vyprážanie zelerových hranoliek; autorka v postupe píše „zeler vôbec nepije olej, viacmenej zostane v panvici“" },
  { id: "kuracie-po-provensalsky", ing: "Slnečnicový olej", vs: 0.30,
    dovod: "7 PL oleja je v 24-hodinovej marináde, z ktorej sa mäso vyberie a vypráža „na mierne omastenej panvici“" },
  { id: "grilovana-paprika-s-cesnakom", ing: "Olivový olej", vs: 0.12,
    dovod: "200 ml oleja je nálev, v ktorom papriky odležia; je to ten istý prípad ako nalozene-papriky" },
  { id: "zbojnicke-kurca-s-klobasou", ing: "Slnečnicový olej", vs: 0.30,
    dovod: "8 PL oleja je v marináde na grilovanie; časť sa potiera na mäso, väčšina odkvapká do grilu" },
];

let n = 0;
for (const o of OPRAVY) {
  const c = R(o.id);
  let txt = P.nacitaj(c);
  const r = P.nastavVIngrediencii(txt, o.ing, "vsiaknutie", o.vs);
  P.zapis(c, r.txt);
  console.log(`${o.id}: ${o.ing} → vsiaknutie ${o.vs}  (${o.dovod})`);
  n++;
}
console.log("upravených receptov:", n);
