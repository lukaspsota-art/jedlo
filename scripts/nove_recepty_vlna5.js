// Vlna 5 — agent RAŇAJKY-A-VLÁKNINA.
// Zapisuje nové recepty do `recepty/*.json` z definícií nižšie. `kcal_na_porciu` sa NEPÍŠE
// ručne: dopočíta sa zo surovín cez `test_harness` (rovnaká cesta ako `scripts/dopocitaj_kcal.js`),
// takže deklarácia a suroviny nemôžu ísť od seba. Preto `kcal_zdroj: "vypocet"`.
//
//   node scripts/nove_recepty_vlna5.js --dry     len skontroluje a vypíše
//   node scripts/nove_recepty_vlna5.js           zapíše súbory
"use strict";
const fs = require("fs"), path = require("path");
const { load } = require("../test_harness");

const DRY = process.argv.includes("--dry");
const DIR = path.join(__dirname, "..", "recepty");
const ZDROJ = "Kuchárka Jedlo — vlastný recept (vlna 5: raňajky a vláknina)";

// i(nazov, mnozstvo, jednotka, poznamka)
const i = (nazov, mnozstvo, jednotka, poznamka) => ({ nazov, mnozstvo, jednotka, poznamka: poznamka || "" });

const DEFS = require("./data_vlna5_ranajky")
  .concat(require("./data_vlna5_ranajky2"))
  .concat(require("./data_vlna5_vlaknina"))
  .concat(require("./data_vlna5_vlaknina2"))
  .concat(require("./data_vlna5_vlaknina3"))
  .concat(require("./data_vlna5_vlaknina4"));

// D6 (test_pravidla): „pantry staples vždy v nákupe" — soľ a korenie sa v recepte uvádzajú
// BEZ množstva („podľa chuti"), nákup ich vypíše ako poznámku. Do výživy ani do ceny porcie
// nevstupujú (`_vyzivaVypocet` preskočí `mnozstvo: null`), ale v obchode na ne treba myslieť.
// Sladké raňajky soľ nedostanú, korenie dostane len to, čo sa varí.
function pantry(d) {
  const t = (d.tagy || []).join(" ");
  if (/sladké/.test(t)) return [];
  const out = [i("Soľ", null, "", "podľa chuti")];
  if (d.kat !== "Raňajky") out.push(i("Čierne korenie", null, "", "podľa chuti"));
  return out;
}
function postav(d) {
  return {
    id: d.id,
    nazov: d.nazov,
    kategoria: d.kat,
    kuchyna: d.kuchyna || "Slovenská",
    zdroj: ZDROJ,
    zdroj_url: "",
    porcie: d.porcie || 2,
    cas: d.cas,
    kcal_na_porciu: 0,
    kcal_zdroj: "vypocet",
    popis: d.popis,
    hlavna_surovina: d.hlavna,
    narocnost: d.narocnost || "jednoduchá",
    ingrediencie: d.ing.concat(pantry(d)),
    postup: d.postup,
    tipy: d.tipy,
    foto: "",
    tagy: d.tagy
  };
}

const app = load({ stav: {} });
// idempotencia: recept, ktorý už zapísala TÁTO dávka (rovnaké `zdroj`), sa smie prepísať;
// kolízia s cudzím receptom je chyba.
const cudzie = new Set(app.RECEPTY.filter(r => r.zdroj !== ZDROJ).map(r => r.id));
const chyby = [], riadky = [];

// rozkazovací spôsob 2. osoby jednotného čísla — kontroluje sa PRVÉ slovo kroku.
// Zoznam je zámerne uzavretý: keď niekto napíše krok v infinitíve („Nakrájať cibuľu"),
// dávka sa nezapíše a chyba je vidieť hneď, nie až v appke.
const SLOVESA = new Set(["blanšíruj","dochuť","doplň","dus","nahrej","nakrájaj","nalej","naplň","nasekaj","nastrúhaj","natrhaj","natri","nechaj","obaľ","ochuť","okoreň","olúp","opeč","opláchni","opraž","orestuj","osoľ","osuš","peč","podávaj","podlej","podus","pokvapkaj","pomeľ","posyp","potri","poukladaj","predhrej","prekroj","prelej","premiešaj","prepláchni","pridaj","prikry","prilej","primiešaj","rozdeľ","rozmiešaj","rozmixuj","rozober","rozohrej","rozotri","rozpáľ","roztlač","rozšľahaj","restuj","sceď","servíruj","skontroluj","stiahni","stlač","umy","urovnaj","uvar","var","vlož","vmiešaj","vsyp","vyber","vylož","vytvaruj","vytvor","vytlač","zabaľ","zakry","zalej","zamiešaj","zapeč","zjedz","zmiešaj","zohrej","zroluj","zľahka"]);
const prveSlovo = k => k.trim().split(/[\s,.:;]+/)[0].toLowerCase();

const hotove = [];
for (const d of DEFS) {
  const r = postav(d);
  if (cudzie.has(r.id)) { chyby.push(`${r.id}: id už používa cudzí recept`); continue; }
  if (hotove.some(x => x.id === r.id)) { chyby.push(`${r.id}: duplicitné id v dávke`); continue; }
  // párovanie + gramáž
  let g = 0, nenapar = [];
  for (const ing of r.ingrediencie) {
    const p = app.najdiPotravinu(ing.nazov);
    if (!p) { nenapar.push(ing.nazov); continue; }
    if (ing.mnozstvo == null) continue;
    const gg = app.gramy(ing, p) || 0;
    if (!(gg > 0)) { nenapar.push(ing.nazov + " (0 g)"); continue; }
    if (!/voda|vývar|nálev|marinád/i.test(ing.nazov)) g += gg;
  }
  if (nenapar.length) chyby.push(`${r.id}: nenapárované/0 g — ${nenapar.join(", ")}`);
  const gp = g / r.porcie;
  if (gp > 700) chyby.push(`${r.id}: ${Math.round(gp)} g jedla na porciu (strop 700)`);
  if (r.postup.length < 3) chyby.push(`${r.id}: postup má ${r.postup.length} krokov (min. 3)`);
  r.postup.forEach((k, n) => { if (!SLOVESA.has(prveSlovo(k))) chyby.push(`${r.id}: krok ${n + 1} nezačína rozkazovacím spôsobom — „${k.slice(0, 40)}…"`); });
  if (!r.tipy || r.tipy.length < 10) chyby.push(`${r.id}: chýbajú tipy`);
  if (!r.tagy || !r.tagy.length) chyby.push(`${r.id}: chýbajú tagy`);
  if (!r.hlavna_surovina) chyby.push(`${r.id}: chýba hlavna_surovina`);
  hotove.push(r);
  riadky.push({ r, gp });
}

// kcal a výživa sa počítajú až keď je recept v RECEPTY (harness ich číta z disku),
// preto sa výživa počíta ručne tou istou cestou, akou to robí app.js.
function vyziva(r) {
  let k = 0, b = 0, vl = 0, c = 0;
  for (const ing of r.ingrediencie) {
    const p = app.najdiPotravinu(ing.nazov); if (!p || ing.mnozstvo == null) continue;
    const gg = (app.gramy(ing, p) || 0) * (ing.vsiaknutie == null ? 1 : ing.vsiaknutie);
    k += gg * p.kcal / 100; b += gg * (p.bielkoviny || 0) / 100;
    vl += gg * (p.vlaknina || 0) / 100; c += gg * (p.cena100 || 0) / 100;
  }
  const n = r.porcie || 1;
  return { k: k / n, b: b / n, vl: vl / n, c: c / n };
}

riadky.forEach(x => {
  const v = vyziva(x.r);
  x.r.kcal_na_porciu = Math.round(v.k);
  x.v = v;
  x.b100 = v.k > 0 ? v.b / (v.k / 100) : 0;
  x.vl100 = v.k > 0 ? v.vl / (v.k / 100) : 0;
  if (x.r.kategoria === "Raňajky" && (v.k < 230 || v.k > 430)) chyby.push(`${x.r.id}: raňajky ${Math.round(v.k)} kcal (chcem 250–400)`);
  if (v.k < 60) chyby.push(`${x.r.id}: len ${Math.round(v.k)} kcal na porciu`);
});

console.log(`definícií: ${DEFS.length} · pripravených: ${hotove.length} · chýb: ${chyby.length}`);
chyby.forEach(c => console.log("  ✗ " + c));

const podlaKat = {};
riadky.forEach(x => { podlaKat[x.r.kategoria] = (podlaKat[x.r.kategoria] || 0) + 1; });
console.log("podľa kategórie: " + JSON.stringify(podlaKat));

if (process.argv.includes("--vypis")) {
  riadky.forEach(x => console.log(
    `  ${x.r.id.padEnd(42)} ${String(Math.round(x.v.k)).padStart(4)} kcal · B ${x.v.b.toFixed(1).padStart(5)} g (${x.b100.toFixed(1)}/100) · vl ${x.v.vl.toFixed(1).padStart(5)} g (${x.vl100.toFixed(1)}/100) · ${Math.round(x.gp)} g/porcia · ${x.v.c.toFixed(2)} €`));
}

if (chyby.length) { console.log("\nNIČ SA NEZAPÍSALO — najprv oprav chyby."); process.exit(1); }
if (DRY) { console.log("\n(suchý beh — spusti bez --dry)"); process.exit(0); }

hotove.forEach(r => fs.writeFileSync(path.join(DIR, r.id + ".json"), JSON.stringify(r, null, 1) + "\n", "utf8"));
console.log(`\nzapísaných ${hotove.length} súborov do recepty/`);
