// QA: nájde recepty s nereálnym množstvom a ZATRIEDI ich podľa PRÍČINY, nie podľa veľkosti.
//
// Model prijateľnosti je dátový, nie hádaný: pre každú potravinu sa z celej databázy spočíta
// MEDIÁN gramov na porciu (medzi ~1800 receptami je väčšina zapísaná správne, medián teda
// hovorí, koľko tej suroviny do porcie normálne ide). Výskyt, ktorý medián prekročí viac než
// NASOBOK-krát a zároveň je nad absolútnou podlahou, je podozrivý.
//
// Triedy príčin:
//   KS_BALENIE  — import dal jednotku „ks“ a scripts/oprav_jednotky_ks.js ju vynásobil CELÝM
//                 balením (`balenie_g`): „Olivový olej 5 ks“ → 5 × 920 g = 4600 g
//   DESATINNA   — hodnota je presný 10/100/1000-násobok rozumnej („4000 g“ namiesto „400 g“)
//   JEDNOTKA    — ml u sypkej suroviny (múka, cukor, soľ) alebo g u nápoja
//   PORCIE      — množstvá sedia na celý recept, ale `porcie` hovorí niečo iné
//   NALEV       — legitímne veľké: voda, nálev, marináda, olej na vyprážanie (neopravuje sa,
//                 patrí mu pole `vsiaknutie`, ak sa zje len časť)
//   DEKLARACIA  — suroviny sú v poriadku, chybné je `kcal_na_porciu`
//   NEZNAMA     — treba ručne
"use strict";
const { load } = require("../../test_harness");
const app = load({ stav: { profil: { osoby: 2, kcal: 1450 } }, seed: 1 });

const NASOBOK = 4, PODLAHA = 120;          // podozrivé: gp > max(NASOBOK × medián, PODLAHA)
const HMOTNOST_PORCIE = 700;               // g jedla na porciu, nad ktorým je recept podozrivý
const NALEV = /voda|vody|nálev|nalev|marinád|marinad|ľad$|^ľad|vývar|vyvar|bujón|bujon/i;
const SYPKE = /múk|muk|cukor|soľ|sol$|krupic|škrob|skrob|vločk|vlock|strúhank|struhank|kakao|prášok|prasok|ryž|ryz|krupa|mak$/i;

function analyzuj() {
  const R = app.RECEPTY.filter(r => r.typ !== "vyrobok" && !r._priloha);
  // 1) mediány gramov na porciu podľa potraviny
  const zoz = {};
  const rec = R.map(r => {
    const por = r.porcie || 1;
    const ings = (r.ingrediencie || []).map(i => {
      const p = app.najdiPotravinu(i.nazov);
      let g = 0; try { g = app.gramy(i, p) || 0; } catch (e) {}
      const gp = g / por;
      if (p && g > 0) (zoz[p.kluc] = zoz[p.kluc] || []).push(gp);
      return { i, p, g, gp, kcal: p ? gp * (p.kcal || 0) / 100 * app.vsiaknuteho(i) : 0 };
    });
    return { r, por, ings };
  });
  const med = {}, n = {};
  for (const k in zoz) { const a = zoz[k].sort((x, y) => x - y); med[k] = a[a.length >> 1]; n[k] = a.length; }

  const nalezy = [];
  for (const x of rec) {
    const dekl = x.r.kcal_na_porciu || 0;
    const kcalIngr = x.ings.reduce((a, b) => a + b.kcal, 0);
    const gp = x.ings.filter(b => b.p && !NALEV.test(b.i.nazov)).reduce((a, b) => a + b.gp, 0);
    const q = dekl ? kcalIngr / dekl : null;
    const podozrive = x.ings.filter(b => b.p && n[b.p.kluc] >= 5 && b.gp > Math.max(NASOBOK * med[b.p.kluc], PODLAHA));
    if (!podozrive.length && gp <= HMOTNOST_PORCIE && !(q > 2)) continue;
    nalezy.push({ id: x.r.id, nazov: x.r.nazov, por: x.por, dekl, kcalIngr: Math.round(kcalIngr), q: q ? +q.toFixed(2) : null,
      gp: Math.round(gp), trieda: trieda(x, podozrive), podozrive: podozrive.map(b => ({
        nazov: b.i.nazov, m: b.i.mnozstvo, j: b.i.jednotka, g: Math.round(b.g), gp: Math.round(b.gp),
        med: Math.round(med[b.p.kluc]), n: n[b.p.kluc], kcal: Math.round(b.kcal) })) });
  }
  return { nalezy, med, n, rec };
}

function trieda(x, podozrive) {
  if (!podozrive.length) return x.r.kcal_na_porciu && x.ings.reduce((a, b) => a + b.kcal, 0) / x.r.kcal_na_porciu > 2 ? "DEKLARACIA" : "NEZNAMA";
  const p = podozrive[0];
  const j = (p.i.jednotka || "").toLowerCase();
  if (NALEV.test(p.i.nazov)) return "NALEV";
  if (j === "ml" && SYPKE.test(p.i.nazov)) return "JEDNOTKA";
  if (j === "g" && p.i.mnozstvo % 10 === 0 && p.p.balenie_g && p.i.mnozstvo % p.p.balenie_g === 0) return "KS_BALENIE";
  if (j === "g" && p.i.mnozstvo >= 1000 && p.i.mnozstvo % 1000 === 0) return "DESATINNA";
  return "NEZNAMA";
}

if (require.main === module) {
  const { nalezy } = analyzuj();
  const tr = {};
  nalezy.forEach(x => (tr[x.trieda] = (tr[x.trieda] || 0) + 1));
  console.log(`Receptov spolu: ${app.RECEPTY.filter(r => r.typ !== "vyrobok").length}`);
  console.log(`Receptov s nálezom: ${nalezy.length}`);
  console.log("Podľa triedy: " + Object.entries(tr).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
  console.log(`Nad ${HMOTNOST_PORCIE} g jedla na porciu: ${nalezy.filter(x => x.gp > HMOTNOST_PORCIE).length}` +
    ` · nad 1000 g: ${nalezy.filter(x => x.gp > 1000).length}`);
  nalezy.sort((a, b) => (b.podozrive[0] ? b.podozrive[0].gp : 0) - (a.podozrive[0] ? a.podozrive[0].gp : 0));
  console.log("\nTOP 40:");
  nalezy.slice(0, 40).forEach(x => {
    console.log(`  [${x.trieda}] ${x.nazov} (${x.por} porcií) q=${x.q} gp=${x.gp} [${x.id}]`);
    x.podozrive.slice(0, 3).forEach(p => console.log(`      ${p.nazov} ${p.m} ${p.j} = ${p.g} g → ${p.gp} g/porcia (medián databázy ${p.med} g, n=${p.n})`));
  });
}
module.exports = { analyzuj, NASOBOK, PODLAHA, HMOTNOST_PORCIE };
