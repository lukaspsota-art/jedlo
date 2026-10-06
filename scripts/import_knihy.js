// Import receptov, ktoré používateľ prepísal z kníh/časopisov do JSON (import_knihy/*.json).
// Zdroj dáva suroviny s vlastnými jednotkami („2 cm", „PL kopcovitá") a odhadom gramov `g_odhad`;
// appka potrebuje jednotky, ktoré vie gramy() a názvy, ktoré sedia na potraviny.json.
// Doplnky (kategória, popis, tagy…) sú v import_knihy/meta.js.
//
//   node scripts/import_knihy.js            skontroluje a vypíše, nič nezapíše
//   node scripts/import_knihy.js --suroviny  vypíše aj párovanie každej suroviny
//   node scripts/import_knihy.js --zapis     zapíše recepty/*.json (+ chýbajúce potraviny)
//   --nahrad=subor.txt   id zo zoznamu (1 na riadok) smie prepísať; id, ktoré import nevyrobí, zmaže
//                        (4. 10. 2026: súbežný import tých istých receptov, import_2026-10-04_zoznam.txt)
"use strict";
const fs = require("fs"), path = require("path");
const { load } = require("../test_harness");
const { PREMENUJ, FRITEZA, FOOD } = require("../import_knihy/meta");

const ROOT = path.join(__dirname, "..");
const ZAPIS = process.argv.includes("--zapis"), SUROVINY = process.argv.includes("--suroviny");
const nahradArg = process.argv.find(a => a.startsWith("--nahrad="));
const NAHRAD = new Set(nahradArg ? fs.readFileSync(path.join(ROOT, nahradArg.slice(9)), "utf8").split(/\r?\n/).filter(Boolean) : []);

const ZDROJE = [
  { subor: "friteza_recepty.json", meta: FRITEZA, zdroj: "Jamie Oliver – Moja teplovzdušná fritéza", tagy: ["air fryer"], spajza: true },
  { subor: "food_5-2026_recepty.json", meta: FOOD, zdroj: "Kaufland FOOD magazín – 5/2026", tagy: [], spajza: false },
];

// Potraviny, ktoré v databáze chýbajú. Výživa: USDA / bežné etikety, cena Kaufland 2026.
const NOVE_POTRAVINY = [
  { kluc: "kačacie prsia", oddelenie: "Mäso a ryby", alergeny: [], kcal: 200, bielkoviny: 19, tuky: 13.5, sacharidy: 0,
    g_za_ks: 150, hustota: 1, meso: true, cena100: 2.2, vlaknina: 0, sodik: 60 },
  { kluc: "rybacia omáčka", oddelenie: "Omáčky a dochucovadlá", alergeny: ["ryby"], kcal: 35, bielkoviny: 5.1, tuky: 0, sacharidy: 3.6,
    g_za_ks: null, hustota: 1.2, meso: false, cena100: 1.6, vlaknina: 0, sodik: 7850, balenie_g: 240, balenie_popis: "200 ml" },
  { kluc: "ovocná pálenka", oddelenie: "Alkohol", alergeny: [], kcal: 231, bielkoviny: 0, tuky: 0, sacharidy: 0,
    g_za_ks: null, hustota: 0.95, meso: false, cena100: 2.5, vlaknina: 0, sodik: 1 },
  // hotové (predvarené) — „rezance" a „šošovic" v databáze sú suché (370 / 352 kcal)
  { kluc: "udon", oddelenie: "Cestoviny a ryža", alergeny: ["lepok"], kcal: 130, bielkoviny: 3.5, tuky: 0.5, sacharidy: 27,
    g_za_ks: null, hustota: 1, meso: false, cena100: 1.2, vlaknina: 1.2, sodik: 150, balenie_g: 200, balenie_popis: "200 g" },
  { kluc: "varená šošovica", oddelenie: "Trvanlivé a konzervy", alergeny: [], kcal: 116, bielkoviny: 9, tuky: 0.4, sacharidy: 20,
    g_za_ks: null, hustota: 1, meso: false, cena100: 0.7, vlaknina: 7.9, sodik: 240, balenie_g: 250, balenie_popis: "250 g" },
  // generické „rezance" sú pšeničné s vajcom — ryžové nemajú lepok ani vajcia
  { kluc: "ryžové rezance", oddelenie: "Cestoviny a ryža", alergeny: [], kcal: 360, bielkoviny: 6, tuky: 0.6, sacharidy: 80,
    g_za_ks: null, hustota: 1, meso: false, cena100: 0.9, vlaknina: 1.6, sodik: 20, balenie_g: 200, balenie_popis: "200 g" },
];

// jednotky zdroja → jednotky, ktoré pozná build (ZNAME_JEDNOTKY v generuj_kucharku.py)
const JED = { g: "g", ml: "ml", ks: "ks", pl: "PL", "čl": "ČL", "strúčik": "strúčik", "vetvička": "vetvička", "hrsť": "hrsť",
  "štipka": "štipka", "hlávka": "hlávka", "lístok": "lístok", "pohára": "pohár" };

const POTR_TXT = fs.readFileSync(path.join(ROOT, "data", "potraviny.json"), "utf8");
const POTR = JSON.parse(POTR_TXT);
const pridatPotraviny = NOVE_POTRAVINY.filter(n => !POTR.some(p => p.kluc === n.kluc));
const app = load({ stav: {}, potraviny: POTR.concat(pridatPotraviny) });

const bezDia = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = s => bezDia(s).toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const velke = s => s.charAt(0).toUpperCase() + s.slice(1);
const cislo = m => ({ 0.25: "¼", 0.5: "½", 1.5: "1½", 2.5: "2½" })[m] || String(m).replace(".", ",");
const cas = min => !min ? "" : min < 60 ? min + " min" : Math.floor(min / 60) + " hod" + (min % 60 ? " " + (min % 60) + " min" : "");

// „kuracie prsia (po 150 g)" → názov „Kuracie prsia", poznámka „po 150 g"; „cícer, konzerva" → „Cícer" + „konzerva"
function nazovAPoznamka(s) {
  const pr = PREMENUJ[s.nazov];
  if (pr) return { n: pr.n, pozn: [pr.p, s.poznamka].filter(Boolean), pr };
  const pozn = [];
  let n = s.nazov.replace(/\s*\(([^)]*)\)/g, (m, x) => { pozn.push(x); return ""; }).trim();
  const c = n.indexOf(", ");
  if (c > 0) { pozn.unshift(n.slice(c + 2)); n = n.slice(0, c); }
  if (s.poznamka) pozn.push(s.poznamka);
  return { n: velke(n), pozn, pr: {} };
}

// Jednotka zdroja ostane, ak ju appka prepočíta a vyjde ±25 % od g_odhad zdroja.
// Inak (2 cm zázvoru, konzerva fazule = 240 g namiesto 400…) sa množstvo prepíše na g_odhad
// (tekutiny v ml) a pôvodný zápis ide do poznámky.
function surovina(s, skupinaPozn) {
  const { n, pozn, pr } = nazovAPoznamka(s);
  const j = (s.jednotka || "").trim(), [zaklad, ...zvysok] = j.toLowerCase().split(/\s+/);
  const p = app.najdiPotravinu(n);
  const out = { nazov: n, mnozstvo: null, jednotka: "", poznamka: "" };
  const poz = [skupinaPozn].concat(pozn);
  const podlaOdhadu = () => { out.mnozstvo = s.g_odhad; out.jednotka = p && app.jeLiata(p) ? "ml" : "g"; };
  if (pr.bezMnozstva) { /* len pripomienka v nákupe */ }
  else if (s.mnozstvo == null) {
    if (s.g_odhad >= 5) podlaOdhadu();
    if (j) poz.unshift(j);
  } else {
    const jj = JED[zaklad], g = jj && p ? app.gramy({ mnozstvo: s.mnozstvo, jednotka: jj }, p) : 0;
    const sedi = g > 0 && (!(s.g_odhad > 0) || (g / s.g_odhad >= 0.75 && g / s.g_odhad <= 1.33));
    if (sedi) { out.mnozstvo = s.mnozstvo; out.jednotka = jj; if (zvysok.length) poz.unshift(zvysok.join(" ")); }
    else if (s.g_odhad > 0) { podlaOdhadu(); if (jj !== out.jednotka) poz.unshift(cislo(s.mnozstvo) + " " + j); }
    else { out.mnozstvo = s.mnozstvo; out.jednotka = jj || j; }
  }
  out.poznamka = poz.filter(Boolean).join(", ");
  if (pr.vsiaknutie != null) out.vsiaknutie = pr.vsiaknutie;
  return { ing: out, p };
}

// Jamie Oliver vynecháva soľ, korenie a olivový olej („zo špajze"), hoci ich postup používa.
// Do nákupu patria ako pripomienka bez množstva — kalórie z knihy ich už obsahujú.
function spajza(ings, postup) {
  const t = postup.join(" ").toLowerCase(), ma = re => ings.some(i => re.test(i.nazov.toLowerCase()));
  const out = [];
  if (/olivov\w* olej|extra panensk/.test(t) && !ma(/olivový olej/)) out.push("Olivový olej");
  if (/soľ|soli\b|osoľ|ochuť/.test(t) && !ma(/^soľ/)) out.push("Soľ");
  if (/korením|okoreň|čiern\w* koren|ochuť/.test(t) && !ma(/čierne korenie/)) out.push("Čierne korenie");
  return out.map(n => ({ nazov: n, mnozstvo: null, jednotka: "", poznamka: n === "Olivový olej" ? "podľa postupu" : "podľa chuti" }));
}

function vyziva(r) {
  let k = 0, b = 0, g = 0;
  for (const ing of r.ingrediencie) {
    const p = app.najdiPotravinu(ing.nazov); if (!p || ing.mnozstvo == null) continue;
    const gg = app.gramy(ing, p) || 0;
    if (!/voda|vývar|víno|nálev|marinád/i.test(ing.nazov)) g += gg;
    const z = gg * (ing.vsiaknutie == null ? 1 : ing.vsiaknutie);
    k += z * p.kcal / 100; b += z * (p.bielkoviny || 0) / 100;
  }
  return { k: k / r.porcie, b: b / r.porcie, g: g / r.porcie };
}

const chyby = [], varovania = [], hotove = [];
const mojeZdroje = ZDROJE.map(z => z.zdroj);
const cudzie = new Set(app.RECEPTY.filter(r => !NAHRAD.has(r.id) && !mojeZdroje.some(z => (r.zdroj || "").startsWith(z))).map(r => r.id));

for (const Z of ZDROJE) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, "import_knihy", Z.subor), "utf8")).recepty;
  for (const s of src) {
    const m = Z.meta[s.nazov];
    if (!m) { chyby.push(`${s.nazov}: chýba v import_knihy/meta.js`); continue; }
    const porcie = m.porcie || s.porcie;
    if (typeof porcie !== "number") { chyby.push(`${s.nazov}: porcie „${porcie}" nie sú číslo — doplň do meta.js`); continue; }
    const nazov = m.nazov || s.nazov, id = slug(nazov);
    const ings = [], riadky = [];
    for (const x of (m.ing || s.suroviny)) {
      const { ing, p } = surovina(x, x.skupina);
      ings.push(ing);
      riadky.push(`      ${x.nazov.padEnd(44)} → ${ing.nazov} ${ing.mnozstvo == null ? "—" : cislo(ing.mnozstvo) + " " + ing.jednotka}` +
        `${ing.poznamka ? " (" + ing.poznamka + ")" : ""}  ⇒ ${p ? p.kluc + " " + p.kcal + " kcal" : "NENAPÁROVANÉ"}`);
      if (ing.mnozstvo != null && (!p || !(app.gramy(ing, p) > 0))) chyby.push(`${id}: „${ing.nazov}" ${p ? "má 0 g" : "nemá potravinu"}`);
    }
    if (Z.spajza) ings.push(...spajza(ings, s.postup));
    const kniha = m.kcal || (s.vyziva_na_porciu && s.vyziva_na_porciu.kcal) || 0;
    const r = {
      id, nazov, kategoria: m.kat, kuchyna: m.kuch,
      zdroj: Z.zdroj + (s.strana ? ` (s. ${s.strana})` : ""),
      porcie, cas: m.cas || cas(s.spolu_min),
      kcal_na_porciu: kniha,
      ...(kniha ? {} : { kcal_zdroj: "vypocet" }),
      popis: m.popis,
      ingrediencie: ings,
      postup: s.postup,
      tipy: m.tip !== undefined ? m.tip : (s.tip || ""),
      foto: "",
      tagy: [...new Set(Z.tagy.concat(s.tagy || [], m.tagy || []))],
    };
    if (cudzie.has(id)) chyby.push(`${id}: id už má iný recept`);
    if (hotove.some(h => h.r.id === id)) chyby.push(`${id}: duplicitné id v dávke`);
    const v = vyziva(r);
    if (!kniha) r.kcal_na_porciu = Math.round(v.k);
    if (v.g > 700) varovania.push(`${id}: ${Math.round(v.g)} g jedla na porciu`);
    if (kniha && (v.k / kniha < 0.6 || v.k / kniha > 1.6)) varovania.push(`${id}: kniha ${kniha} kcal, suroviny ${Math.round(v.k)} kcal`);
    hotove.push({ r, v, riadky });
  }
}

for (const { r, v, riadky } of hotove) {
  console.log(`${r.id.padEnd(46)} ${r.kategoria.padEnd(12)} ${String(r.kcal_na_porciu).padStart(4)} kcal${r.kcal_zdroj ? "*" : " "}` +
    ` (suroviny ${String(Math.round(v.k)).padStart(4)}) · B ${v.b.toFixed(0).padStart(3)} g · ${Math.round(v.g)} g/porcia`);
  if (SUROVINY) riadky.forEach(x => console.log(x));
}
console.log(`\n${hotove.length} receptov · * = kcal dopočítané zo surovín · nové potraviny: ${pridatPotraviny.map(p => p.kluc).join(", ") || "žiadne"}`);
varovania.forEach(x => console.log("  ! " + x));
chyby.forEach(x => console.log("  ✗ " + x));
if (chyby.length) { console.log("\nNIČ SA NEZAPÍSALO — najprv oprav chyby."); process.exit(1); }
if (!ZAPIS) { console.log("\n(suchý beh — zapíš cez --zapis)"); process.exit(0); }

if (pridatPotraviny.length) {
  // súbor je presne JSON.stringify(…, null, 2) bez koncového riadku — formát sa zachová
  if (JSON.stringify(POTR, null, 2) !== POTR_TXT) throw new Error("data/potraviny.json nemá očakávaný formát — nezapisujem");
  fs.writeFileSync(path.join(ROOT, "data", "potraviny.json"), JSON.stringify(POTR.concat(pridatPotraviny), null, 2), "utf8");
}
hotove.forEach(({ r }) => fs.writeFileSync(path.join(ROOT, "recepty", r.id + ".json"), JSON.stringify(r, null, 1) + "\n", "utf8"));
const zmazat = [...NAHRAD].filter(id => !hotove.some(h => h.r.id === id) && fs.existsSync(path.join(ROOT, "recepty", id + ".json")));
zmazat.forEach(id => fs.unlinkSync(path.join(ROOT, "recepty", id + ".json")));
console.log(`\nzapísaných ${hotove.length} receptov do recepty/, ${pridatPotraviny.length} potravín do data/potraviny.json` +
  (zmazat.length ? `, zmazané nahradené: ${zmazat.join(", ")}` : ""));
