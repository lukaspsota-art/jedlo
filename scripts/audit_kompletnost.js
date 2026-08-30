#!/usr/bin/env node
// Audit kompletnosti receptov: kuchyňa, postup, tipy, popis, tagy, kategória, čas.
// Spusti: node scripts/audit_kompletnost.js [--detail <sekcia>]
"use strict";
const fs = require("fs"), path = require("path");

const DIR = path.join(__dirname, "..", "recepty");
const R = fs.readdirSync(DIR).filter(f => f.endsWith(".json"))
  .map(f => Object.assign(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")), { _f: f }));

const KATEGORIE = ["Raňajky", "Hlavné jedlo", "Cestoviny", "Polievka", "Šalát", "Nátierka",
  "Príloha", "Pečivo", "Snack", "Dezert", "Kokteil", "Nápoj"];

const CAS_OK = /^(\d+ min|\d+ hod|\d+ hod \d+ min)$/;
const prazdne = s => !String(s == null ? "" : s).trim();

// --- jednotlivé kontroly -------------------------------------------------
const CHECKS = [
  ["bez kuchyne", r => prazdne(r.kuchyna)],
  ["postup: 1 krok", r => (r.postup || []).length === 1],
  ["postup: 1 krok a > 300 znakov", r => (r.postup || []).length === 1 && r.postup[0].length > 300],
  ["postup: 1 krok a > 150 znakov", r => (r.postup || []).length === 1 && r.postup[0].length > 150],
  ["postup: 1 krok s viacerými vetami", r => (r.postup || []).length === 1 &&
      (r.postup[0].match(/[.!?](\s|$)/g) || []).length >= 2],
  ["postup: prázdny", r => !(r.postup || []).length],
  ["postup: krok > 400 znakov", r => (r.postup || []).some(k => k.length > 400)],
  ["prázdne tipy", r => prazdne(r.tipy)],
  ["prázdny popis", r => prazdne(r.popis)],
  ["prázdne tagy", r => !(r.tagy || []).length],
  ["tagy: menej než 3", r => (r.tagy || []).length < 3],
  ["kategória mimo číselníka", r => !KATEGORIE.includes(r.kategoria)],
  ["čas: prázdny", r => prazdne(r.cas)],
  ["čas: nekonzistentný formát", r => !prazdne(r.cas) && !CAS_OK.test(r.cas)],
  ["čas: nedosiahnuteľný filtrom (casMin=999)", r => {
      const c = r.cas || ""; return !/\d+\s*hod/.test(c) && !/\d+\s*min/.test(c); }],
  ["tón: 1. os. mn. č. („nakrájame\")", r => JAZYK.my(r)],
  ["tón: 1. os. j. č. („nakrájal som\")", r => JAZYK.ja(r)],
  ["tón: rozkazovací spôsob (cieľ)", r => JAZYK.rozkaz(r) && !JAZYK.my(r) && !JAZYK.ja(r)],
  ["jazyk: anglické zvyšky", r => JAZYK.anglicky(r)],
];

// --- detekcia tónu -------------------------------------------------------
const SLOVES_MY = /\b\p{L}*(ujeme|ujme|ávame|ieme|áme|íme|yme|eme|íme|ime|ime)\b/giu;
const JAZYK = {
  txt: r => (r.postup || []).join(" "),
  my(r) { return /\b\p{Ll}*(ujeme|ávame|ieme|áme|íme|neme|jeme|zme|šme|kame|deme)\b/iu.test(this.txt(r)); },
  ja(r) { return /\b(som|sme)\b/i.test(this.txt(r)); },
  rozkaz(r) {
    // rozkazovací spôsob: bežné kuchárske slovesá v 2. os. j. č.
    return /\b(nakrájaj|pridaj|premiešaj|zmiešaj|opeč|upeč|uvar|var|nechaj|daj|vlož|posyp|zalej|nalej|vyber|ozdob|podávaj|rozmixuj|rozohrej|predhrej|osoľ|okoreň|prikry|scedi|sceď|vyšľahaj|šľahaj|nastrúhaj|olúpaj|umy|slej|zohrej|rozpusť|servíruj|skladaj|natri|nanes|preceď|stiahni|odstav)\b/iu.test(this.txt(r));
  },
  anglicky(r) {
    const t = [(r.postup || []).join(" "), r.popis || "", r.tipy || ""].join(" ");
    const EN = /\b(the|and|with|into|until|about|minutes|heat|serve|add|stir|bowl|then|remove|cook|place|preheat|mixture|together|shake|blend|glass|ice|garnish|strain|pour)\b/gi;
    const m = new Set((t.match(EN) || []).map(x => x.toLowerCase()));
    return m.size >= 2;
  },
};

// --- výpis ---------------------------------------------------------------
const kategorie = [...new Set(R.map(r => r.kategoria))].sort();
const detail = process.argv.includes("--detail") ? process.argv[process.argv.indexOf("--detail") + 1] : null;

console.log(`AUDIT KOMPLETNOSTI — ${R.length} receptov\n`);
const w = 42;
console.log("problém".padEnd(w) + "počet".padStart(7) + "  %");
console.log("-".repeat(w + 14));
for (const [nazov, fn] of CHECKS) {
  const n = R.filter(fn).length;
  console.log(nazov.padEnd(w) + String(n).padStart(7) + "  " + (100 * n / R.length).toFixed(1) + " %");
}

console.log("\n\nPO KATEGÓRIÁCH");
const stlpce = ["bez kuchyne", "postup: 1 krok", "prázdne tipy", "prázdny popis", "čas: prázdny",
  "čas: nekonzistentný formát", "tón: 1. os. mn. č. („nakrájame\")", "tón: 1. os. j. č. („nakrájal som\")"];
const hlav = ["kategória".padEnd(16), "spolu".padStart(6), "kuch".padStart(6), "1krok".padStart(6),
  "tipy".padStart(6), "popis".padStart(6), "čas0".padStart(6), "čas?".padStart(6), "my".padStart(6), "ja".padStart(6)];
console.log(hlav.join(""));
console.log("-".repeat(hlav.join("").length));
for (const k of kategorie) {
  const sub = R.filter(r => r.kategoria === k);
  const row = [String(k).padEnd(16), String(sub.length).padStart(6)];
  for (const s of stlpce) {
    const fn = CHECKS.find(c => c[0] === s)[1];
    row.push(String(sub.filter(fn).length).padStart(6));
  }
  console.log(row.join(""));
}

console.log("\nKUCHYNE: " + [...new Set(R.map(r => r.kuchyna))].filter(Boolean).length + " rôznych hodnôt");
const mimo = R.filter(r => !KATEGORIE.includes(r.kategoria));
if (mimo.length) console.log("MIMO ČÍSELNÍKA: " + mimo.map(r => r.id + " (" + r.kategoria + ")").join(", "));

if (detail) {
  const fn = CHECKS.find(c => c[0].startsWith(detail));
  if (fn) {
    console.log("\nDETAIL — " + fn[0]);
    R.filter(fn[1]).forEach(r => console.log("  " + r.id + "  [" + r.kategoria + "] " + (r.cas || "")));
  }
}
