#!/usr/bin/env node
// e2e/beh.js — spustí celú E2E sadu proti vygenerovanému kucharka.html
"use strict";
const fs = require("fs");
const path = require("path");
const { Tester, vytvorProstredie, SHOTS, SUBOR, KOREN } = require("./lib");

const SKUPINY = [
  "01-smoke", "02-recepty", "03-detail", "04-plan", "05-generator",
  "06-nakup", "07-varenie", "08-mobil", "09-pristupnost", "10-vykon",
  "11-pwa", "12-tlac", "13-odolnost",
];

const farba = process.stdout.isTTY;
const Z = (s) => (farba ? `\x1b[32m${s}\x1b[0m` : s);
const C = (s) => (farba ? `\x1b[31m${s}\x1b[0m` : s);
const Y = (s) => (farba ? `\x1b[33m${s}\x1b[0m` : s);
const SED = (s) => (farba ? `\x1b[90m${s}\x1b[0m` : s);

(async () => {
  if (!fs.existsSync(SUBOR)) {
    console.error(C("kucharka.html neexistuje — spusti najprv: python3 generuj_kucharku.py"));
    process.exit(2);
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const f of fs.readdirSync(SHOTS)) { if (f.endsWith(".png")) fs.unlinkSync(path.join(SHOTS, f)); }

  const filter = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const t = new Tester();
  const E = await vytvorProstredie(t);
  const zoznam = SKUPINY.filter((s) => !filter.length || filter.some((f) => s.includes(f)));

  const casy = {};
  for (const meno of zoznam) {
    const mod = require("./testy/" + meno);
    t.setSkupina(mod.nazov);
    const t0 = Date.now();
    process.stdout.write(SED(`▸ ${mod.nazov} … `));
    try {
      await mod.spusti(E, t);
    } catch (e) {
      await t.ok(false, "skupina dobehla bez výnimky", (e && e.stack ? e.stack.split("\n").slice(0, 4).join(" | ") : String(e)));
    }
    // po každej skupine zavri stránky, aby sa nehromadili
    for (const c of E.otvorene.slice()) { try { await c.close(); } catch (e) {} }
    E.otvorene.length = 0;
    t.stranka = null;
    casy[mod.nazov] = Date.now() - t0;
    const mojich = t.vysledky.filter((v) => v.skupina === mod.nazov);
    const pad = mojich.filter((v) => !v.ok && !v.xfail).length;
    const xf = mojich.filter((v) => !v.ok && v.xfail).length;
    process.stdout.write(
      (pad ? C(`${pad} PADLO`) : Z("OK")) + (xf ? Y(` · ${xf} známych`) : "") +
      SED(`  (${mojich.length} kontrol, ${(casy[mod.nazov] / 1000).toFixed(1)} s)\n`)
    );
  }
  await E.koniec();

  // ── Súhrn ──────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(74));
  console.log("SÚHRN E2E");
  console.log("=".repeat(74));
  const skupiny = [...new Set(t.vysledky.map((v) => v.skupina))];
  let celkPad = 0, celkXf = 0, celkOk = 0;
  for (const s of skupiny) {
    const v = t.vysledky.filter((x) => x.skupina === s);
    const ok = v.filter((x) => x.ok).length;
    const pad = v.filter((x) => !x.ok && !x.xfail).length;
    const xf = v.filter((x) => !x.ok && x.xfail).length;
    celkOk += ok; celkPad += pad; celkXf += xf;
    const stav = pad ? C("PADLO") : xf ? Y("OK*") : Z("OK");
    console.log(`  ${stav.padEnd(farba ? 18 : 6)} ${s.padEnd(34)} ${ok}/${v.length} prešlo` + (xf ? Y(`  (+${xf} známych)`) : "") + SED(`  ${(casy[s] / 1000).toFixed(1)} s`));
  }
  console.log("-".repeat(74));
  console.log(`  Spolu: ${celkOk} prešlo · ${celkPad} padlo · ${celkXf} známych zlyhaní (cieľový stav)`);

  if (celkPad) {
    console.log("\n" + C("PADNUTÉ KONTROLY:"));
    t.vysledky.filter((v) => !v.ok && !v.xfail).forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.skupina}] ${v.popis}`);
      if (v.detail) console.log(SED("     → " + v.detail.replace(/\n/g, "\n       ")));
      if (v.shot) console.log(SED("     📷 " + v.shot));
    });
  }
  if (celkXf) {
    console.log("\n" + Y("ZNÁME ZLYHANIA (testy písané na cieľový stav, dnes padajú):"));
    t.vysledky.filter((v) => !v.ok && v.xfail).forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.skupina}] ${v.popis}`);
      if (v.detail) console.log(SED("     → " + v.detail.replace(/\n/g, "\n       ")));
      if (v.shot) console.log(SED("     📷 " + v.shot));
    });
  }
  if (t.metriky.length) {
    console.log("\nNAMERANÉ ČÍSLA:");
    t.metriky.forEach((m) => console.log(`  ${(m.kluc + ":").padEnd(46)} ${m.hodnota}${m.jednotka ? " " + m.jednotka : ""}`));
  }

  fs.writeFileSync(path.join(__dirname, "posledny-beh.json"),
    JSON.stringify({ datum: new Date().toISOString(), vysledky: t.vysledky, metriky: t.metriky, casy }, null, 2));
  console.log(SED(`\nDetail: ${path.relative(KOREN, path.join(__dirname, "posledny-beh.json"))}`));

  process.exit(celkPad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
