// Validácia a import receptov z webu: import_web/staging.jsonl → recepty/<id>.json.
// Zapisuje LEN nové súbory (ekvivalent INSERT): keď v stagingu ostane chyba alebo niektoré id
// už v recepty/ existuje, nezapíše sa nič. Polia začínajúce „_“ sú pracovné (URL, cieľová
// kategória, príznaky) a do receptu nejdú.
// kcal_na_porciu sa dopočíta zo surovín ako v import_mealdb.js (kcal_zdroj "vypocet").
//
//   node scripts/import_web.js --check [--posledne N]   ✗ chyby (blokujú import), ⚑ príznaky na kontrolu
//   node scripts/import_web.js --import                 zapíše; vyžaduje 0 chýb a presné počty kategórií
//   --parovanie   ku každej surovine vypíše, na ktorú potravinu (kľúč, kcal/100 g) sa napárovala
//   --staging <cesta>   iný staging, napr. import_knihy/epub/minecraft_staging.jsonl (scripts/zber_epub.py).
//     Riadok z knihy (_url „kniha:…“) nemá zdroj_url ani cieľové počty; kategória je ktorákoľvek
//     z appky. Fotku z `_foto` import skopíruje do recepty/fotky/<id>.webp a zapíše do ZDROJE.json.
"use strict";
const fs = require("fs"), path = require("path");
const { load } = require("../test_harness");

const KOREN = path.join(__dirname, "..");
const iSt = process.argv.indexOf("--staging");
const STAGING = iSt > 0 ? path.resolve(process.argv[iSt + 1]) : path.join(KOREN, "import_web", "staging.jsonl");
// bez „Snack“ — tá je len pre kúpené výrobky (typ "vyrobok"), snackový slot generátora s tým počíta
const KATEGORIE = ["Raňajky", "Hlavné jedlo", "Cestoviny", "Polievka", "Šalát", "Nátierka", "Príloha", "Pečivo",
  "Dezert", "Kokteil", "Nápoj"];
const FOTKY = path.join(KOREN, "recepty", "fotky");
const DIR = path.join(KOREN, "recepty");
const CIEL = { ranajky: 30, polievky: 40, maso: 70, bezmaso: 40, prilohy: 25, salaty: 25, dezerty: 40, pecenie: 30 };
const KAT_APP = { ranajky: ["Raňajky"], polievky: ["Polievka"], maso: ["Hlavné jedlo", "Cestoviny"],
  bezmaso: ["Hlavné jedlo", "Cestoviny"], prilohy: ["Príloha"], salaty: ["Šalát"], dezerty: ["Dezert"], pecenie: ["Pečivo"] };
// zoznam jednotiek sa berie priamo z buildu, aby sa nerozišli
const JEDNOTKY = new Set([...fs.readFileSync(path.join(KOREN, "generuj_kucharku.py"), "utf8")
  .match(/ZNAME_JEDNOTKY = \{([\s\S]*?)\}/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]));
const IMPORT = process.argv.includes("--import"), PAROVANIE = process.argv.includes("--parovanie");
const iPos = process.argv.indexOf("--posledne");
const POSLEDNE = iPos > 0 ? +process.argv[iPos + 1] : Infinity;

const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const app = load({ stav: {} });
const kluce = r => new Set((r.ingrediencie || []).filter(i => i.mnozstvo != null)
  .map(i => app.najdiPotravinu(i.nazov)).filter(Boolean).map(p => p.kluc));
const jac = (a, b) => { let x = 0; for (const k of a) if (b.has(k)) x++; return x / (a.size + b.size - x || 1); };

const db = app.RECEPTY.map(r => ({ id: r.id, n: norm(r.nazov), k: kluce(r), url: String(r.zdroj_url || "").replace(/\/$/, "") }));
const riadky = (fs.existsSync(STAGING) ? fs.readFileSync(STAGING, "utf8").split("\n") : [])
  .filter(x => x.trim()).map((x, i) => { try { return JSON.parse(x); } catch (e) { return { _zly: i + 1 }; } });

const vid = { id: new Set(), url: new Set(), n: new Map() }, hotove = [];
let spoluE = 0, sPriznakom = 0;
const vypis = [];

riadky.forEach((r, i) => {
  const E = [], F = [...(r._flags || [])];
  if (r._zly) { spoluE++; vypis.push(`✗ riadok ${r._zly}: pokazený JSON`); return; }
  const kniha = String(r._url || "").startsWith("kniha:");
  for (const k of ["id", "nazov", "kategoria", "kuchyna", "zdroj", "cas", "popis", "_url", "_web"].concat(kniha ? [] : ["zdroj_url", "_kat"]))
    if (!r[k]) E.push(`chýba ${k}`);
  if (kniha) {
    if (!KATEGORIE.includes(r.kategoria)) E.push(`neznáma kategória „${r.kategoria}“`);
    if (r._foto && !fs.existsSync(path.join(KOREN, r._foto))) E.push(`fotka ${r._foto} neexistuje`);
  } else if (!CIEL[r._kat]) E.push(`neznáma _kat „${r._kat}“`);
  else if (!KAT_APP[r._kat].includes(r.kategoria)) E.push(`kategória „${r.kategoria}“ nesedí k ${r._kat}`);
  if (!(r.porcie > 0)) E.push("porcie");
  if (!/^\d+ (min|hod)( \d+ min)?$/.test(r.cas || "")) E.push(`čas „${r.cas}“`);
  if (!Array.isArray(r.postup) || r.postup.length < 2) E.push("postup má menej ako 2 kroky");
  if (!Array.isArray(r.tagy) || !r.tagy.length) E.push("chýbajú tagy");
  if (r.foto !== "") E.push("foto musí byť prázdne");
  if (!kniha && r.zdroj_url !== r._url) E.push("zdroj_url ≠ _url");
  if (/°F|\bcups?\b|\btbsp\b|\btsp\b|\bounces?\b|\boz\b|\blbs?\b|\binch/i.test((r.postup || []).join(" "))) E.push("postup má americké jednotky");
  if (r._kat === "bezmaso" && !(r.tagy || []).includes("bezmäsité")) E.push("bezmäsité jedlo bez tagu „bezmäsité“");

  if (vid.id.has(r.id)) E.push("duplicitné id v stagingu");
  if (fs.existsSync(path.join(DIR, r.id + ".json"))) E.push("id už existuje v recepty/");
  if (vid.url.has(r._url)) E.push("duplicitná URL v stagingu");
  const n = norm(r.nazov), dz = db.find(d => d.n === n || d.url === String(r._url).replace(/\/$/, ""));
  if (dz) E.push(`duplicita s receptom v DB: ${dz.id}`);
  if (vid.n.has(n)) E.push(`rovnaký názov ako ${vid.n.get(n)}`);

  let g = 0, kcal = 0;
  for (const ing of r.ingrediencie || []) {
    if (ing.mnozstvo != null && !JEDNOTKY.has(String(ing.jednotka).toLowerCase()))
      E.push(`neznáma jednotka „${ing.jednotka}“ (${ing.nazov})`);
    const p = app.najdiPotravinu(ing.nazov);
    if (!p) { if (ing.mnozstvo != null) F.push(`nenapárované: ${ing.nazov}`); continue; }
    if (ing.mnozstvo == null) continue;
    const gg = app.gramy(ing, p) || 0;
    if (!(gg > 0)) { F.push(`0 g: ${ing.nazov} ${ing.mnozstvo} ${ing.jednotka}`); continue; }
    if (!/voda|vývar|nálev|marinád|víno/i.test(ing.nazov)) g += gg;
    kcal += gg * (ing.vsiaknutie == null ? 1 : ing.vsiaknutie) * p.kcal / 100;
  }
  const kp = Math.round(kcal / (r.porcie || 1));
  if (PAROVANIE && i >= riadky.length - POSLEDNE) vypis.push(`${r.id}: ` + (r.ingrediencie || []).map(ing => {
    const p = app.najdiPotravinu(ing.nazov); return `${ing.nazov} → ${p ? p.kluc + " " + p.kcal : "—"}`; }).join(" · "));
  if (g / (r.porcie || 1) > 700) F.push(`${Math.round(g / r.porcie)} g jedla na porciu`);
  if (kp < 60) F.push(`len ${kp} kcal na porciu`);
  if (r._kcal_web && Math.abs(kp - r._kcal_web) / r._kcal_web > 0.25) F.push(`kcal ${kp} vs. web ${r._kcal_web}`);

  const k = kluce(r);
  if (k.size >= 5) {
    const podobny = db.concat(hotove.map(h => ({ id: h.id, k: kluce(h) })))
      .filter(d => d.k.size >= 5).map(d => [d.id, jac(k, d.k)]).sort((a, b) => b[1] - a[1])[0];
    if (podobny && podobny[1] >= 0.75) F.push(`možná duplicita (${Math.round(podobny[1] * 100)} % surovín): ${podobny[0]}`);
  }

  vid.id.add(r.id); vid.url.add(r._url); vid.n.set(n, r.id);
  spoluE += E.length; if (F.length) sPriznakom++;
  const out = {};
  for (const [kk, v] of Object.entries(r)) if (!kk.startsWith("_")) out[kk] = v;
  out.kcal_na_porciu = kp; out.kcal_zdroj = "vypocet";
  if (r._foto) Object.defineProperty(out, "_r", { value: r });   // pre kopírovanie fotky, do JSON nejde
  hotove.push(out);
  if (i >= riadky.length - POSLEDNE && (E.length || F.length))
    vypis.push(`${r.id} [${r._kat}] ${kp} kcal` + E.map(e => "\n  ✗ " + e).join("") + F.map(f => "\n  ⚑ " + f).join(""));
});

const pocty = (k) => riadky.reduce((o, r) => (o[r[k]] = (o[r[k]] || 0) + 1, o), {});
console.log(vypis.join("\n"));
console.log(`\nstaging: ${riadky.length} · chýb ✗ ${spoluE} · receptov s príznakom ⚑ ${sPriznakom}`);
console.log("kategórie: " + JSON.stringify(pocty("_kat")) + "\nweby: " + JSON.stringify(pocty("_web")));

if (!IMPORT) process.exit(spoluE ? 1 : 0);
const zKnihy = riadky.every(r => String(r._url || "").startsWith("kniha:"));
const zlePocty = zKnihy ? [] : Object.keys(CIEL).filter(k => (pocty("_kat")[k] || 0) !== CIEL[k]);
if (spoluE || zlePocty.length) {
  console.log(`\nNIČ SA NEZAPÍSALO — ${spoluE} chýb, počty nesedia v: ${zlePocty.join(", ") || "—"}`);
  process.exit(1);
}
for (const r of hotove) fs.writeFileSync(path.join(DIR, r.id + ".json"), JSON.stringify(r, null, 1) + "\n", { encoding: "utf8", flag: "wx" });
const sFotkou = hotove.filter(r => r._r);
if (sFotkou.length) {
  const ZDROJE = path.join(FOTKY, "ZDROJE.json"), zdroje = JSON.parse(fs.readFileSync(ZDROJE, "utf8"));
  const dnes = new Date().toISOString().slice(0, 10);
  for (const r of sFotkou) {
    const ciel = path.join(FOTKY, r.id + ".webp");
    fs.copyFileSync(path.join(KOREN, r._r._foto), ciel, fs.constants.COPYFILE_EXCL);
    zdroje[r.id] = { autor: r._r._kniha, bajtov: fs.statSync(ciel).size, licencia: `© ${r._r._vydavatel}`,
      rozmer: "480x270", stiahnute: dnes, zdroj: r._r._kniha };
  }
  // rovnaký tvar, aký píše stiahni_fotky.py (sort_keys, indent=1, CRLF z Windows) — diff = len nové záznamy
  const zor = Object.fromEntries(Object.keys(zdroje).sort().map(k => [k, zdroje[k]]));
  fs.writeFileSync(ZDROJE, JSON.stringify(zor, null, 1).replace(/\n/g, "\r\n"));
  console.log(`fotky: ${sFotkou.length} → recepty/fotky/ + ZDROJE.json`);
}
console.log(`\nzapísaných ${hotove.length} nových súborov do recepty/ — spusti: py generuj_kucharku.py`);
