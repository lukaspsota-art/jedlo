// dizajn/snimky.js — screenshoty a merania nasadeného dizajnu „Bloky" (koncepcia B).
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node dizajn/snimky.js
// Ukladá do dizajn/po/ a vypíše namerané hodnoty (dotykové ciele, pretok, čas renderu, chyby).
"use strict";
const path = require("path");
const fs = require("fs");
const L = require("../e2e/lib.js");

const VON = path.join(__dirname, "po");
fs.mkdirSync(VON, { recursive: true });

const OBRAZOVKY = ["domov", "recepty", "planovac", "nakup", "vyziva", "spajza", "nastavenia"];
const merania = [];
const chybyVsetky = [];

async function pripravStranku(E, viewport, tmava, rezim) {
  // téma sa seje cez localStorage — `let S` v app.js nie je na window
  const page = await E.novaStranka({
    viewport,
    touch: viewport.width < 820,
    stav: {
      blokMode: true,
      profil: { onboarded: true, osoby: 2, kcal: 1450, dark: !!tmava, rezim: rezim || "plan",
        stravnici: [{ nazov: "Ja", kcal: 1750 }, { nazov: "Zuzka", kcal: 1400 }],
        sloty: ["Raňajky", "Obed", "Večera", "Snack"] },
    },
  });
  await L.naplnPlan(page, true);
  await page.waitForTimeout(250);
  return page;
}

async function pretok(page) {
  return page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
}

async function snimky(E, { meno, viewport, tmava }) {
  const page = await pripravStranku(E, viewport, tmava);
  for (const v of OBRAZOVKY) {
    await L.prepni(page, v);
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(VON, `${meno}-${v}.png`), fullPage: false });
    const p = await pretok(page);
    if (p.doc > p.win + 1) merania.push({ kde: `${meno}/${v}`, typ: "PRETOK", hodnota: `${p.doc} > ${p.win}` });
  }
  // detail receptu
  await L.prepni(page, "recepty");
  await page.evaluate(() => otvor(RECEPTY.find((r) => r.postup && r.postup.length > 2).id));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(VON, `${meno}-detail.png`) });
  // režim varenia
  await page.evaluate(async () => { try { await spustiCook(); } catch (e) {} });
  await page.waitForTimeout(250);
  const maCook = await page.evaluate(() => document.getElementById("cook").classList.contains("open"));
  if (maCook) { await page.waitForTimeout(250); await page.screenshot({ path: path.join(VON, `${meno}-varenie.png`) }); }
  await L.zavriOkna(page);
  chybyVsetky.push(...page.chyby.map((c) => `${meno}: ${c.typ} ${c.text.slice(0, 160)}`));
  await E.zavri(page);
  return maCook;
}

(async () => {
  const t = new L.Tester();
  const E = await L.vytvorProstredie(t);
  try {
    // 1) screenshoty všetkých obrazoviek — mobil aj počítač, svetlá aj tmavá
    const maCook = {};
    maCook.a = await snimky(E, { meno: "mobil-svetla", viewport: L.MOBIL, tmava: false });
    maCook.b = await snimky(E, { meno: "mobil-tmava", viewport: L.MOBIL, tmava: true });
    maCook.c = await snimky(E, { meno: "pc-svetla", viewport: L.DESKTOP, tmava: false });
    maCook.d = await snimky(E, { meno: "pc-tmava", viewport: L.DESKTOP, tmava: true });
    merania.push({ kde: "varenie", typ: "screenshot", hodnota: JSON.stringify(maCook) });

    // 2) režimy hustoty — nákup na mobile
    for (const r of ["plan", "obchod", "kuchyna"]) {
      const page = await pripravStranku(E, L.MOBIL, false, r);
      await L.prepni(page, "nakup");
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(VON, `mobil-rezim-${r}-nakup.png`) });
      const ciele = await L.dotykoveCiele(page, "#v-nakup .nak-row>label, #v-nakup .nak-i, .botnav a, #rezimy button, .btn");
      const min = ciele.reduce((a, c) => Math.min(a, Math.min(c.w, c.h)), 1e9);
      const podHranicou = ciele.filter((c) => c.h < 24 || c.w < 24);
      const label = ciele.filter((c) => c.trieda === "" && c.tag === "label");
      merania.push({ kde: `rezim ${r}`, typ: "najmenší cieľ (px)", hodnota: `${min}` });
      merania.push({ kde: `rezim ${r}`, typ: "cieľov pod 24 px", hodnota: `${podHranicou.length}` });
      merania.push({ kde: `rezim ${r}`, typ: "výška riadku nákupu (px)", hodnota: label.length ? `${label[0].h}` : "–" });
      merania.push({ kde: `rezim ${r}`, typ: "data-rezim", hodnota: await page.evaluate(() => document.documentElement.dataset.rezim) });
      const p = await pretok(page);
      merania.push({ kde: `rezim ${r}`, typ: "pretok", hodnota: p.doc > p.win + 1 ? `ÁNO ${p.doc}>${p.win}` : "nie" });
      chybyVsetky.push(...page.chyby.map((c) => `rezim ${r}: ${c.typ} ${c.text.slice(0, 160)}`));
      await E.zavri(page);
    }

    // 3) pretok na štyroch šírkach (naplnený plán, všetky obrazovky)
    for (const w of [360, 393, 768, 1440]) {
      const page = await pripravStranku(E, { width: w, height: 900 }, false);
      let zle = [];
      for (const v of OBRAZOVKY) {
        await L.prepni(page, v);
        await page.waitForTimeout(150);
        const p = await pretok(page);
        if (p.doc > p.win + 1) zle.push(`${v} ${p.doc}>${p.win}`);
      }
      merania.push({ kde: `šírka ${w}`, typ: "vodorovný pretok", hodnota: zle.length ? zle.join(", ") : "žiadny" });
      chybyVsetky.push(...page.chyby.map((c) => `${w}px: ${c.typ} ${c.text.slice(0, 160)}`));
      await E.zavri(page);
    }

    // 4) čas renderu mriežky receptov (baseline ~84 ms)
    const page = await pripravStranku(E, L.DESKTOP, false);
    await L.prepni(page, "recepty");
    const cas = await page.evaluate(() => {
      const t0 = performance.now();
      for (let i = 0; i < 4; i++) renderGrid();
      return (performance.now() - t0) / 4;
    });
    merania.push({ kde: "Recepty", typ: "render mriežky (ms, priemer zo 4)", hodnota: cas.toFixed(1) });
    // dotykové ciele na počítači v pláne (hustá mriežka — nikdy pod 24 px)
    await L.prepni(page, "planovac");
    const cieleP = await L.dotykoveCiele(page, ".plan-cell button, .plan-cell a, .mchip, .ctrl-row .ppl button, .hranica");
    const podP = cieleP.filter((c) => c.h < 24 || c.w < 24);
    merania.push({ kde: "Plán/počítač", typ: "ovládaní pod 24 px", hodnota: `${podP.length} z ${cieleP.length}` });
    if (podP.length) merania.push({ kde: "Plán/počítač", typ: "najmenšie", hodnota: JSON.stringify(podP.slice(0, 5)) });
    chybyVsetky.push(...page.chyby.map((c) => `pc: ${c.typ} ${c.text.slice(0, 160)}`));
    await E.zavri(page);

    // 5) mobilné dotykové ciele naprieč obrazovkami
    const m = await pripravStranku(E, L.MOBIL, false);
    for (const v of OBRAZOVKY) {
      await L.prepni(m, v);
      await m.waitForTimeout(150);
      const c = await L.dotykoveCiele(m, ".btn, .chip, .kol-tile, button.mini, .botnav a, #rezimy button, .nak-row>label, .nak-i, details.panel>summary, .card-open .fav");
      const pod24 = c.filter((x) => x.h < 24 || x.w < 24);
      const pod44 = c.filter((x) => x.h < 44);
      merania.push({ kde: `mobil/${v}`, typ: "ciele", hodnota: `${c.length} prvkov · pod 44 px: ${pod44.length} · pod 24 px: ${pod24.length}` });
      if (pod24.length) merania.push({ kde: `mobil/${v}`, typ: "POD 24 px", hodnota: JSON.stringify(pod24.slice(0, 4)) });
    }
    chybyVsetky.push(...m.chyby.map((c) => `mobil: ${c.typ} ${c.text.slice(0, 160)}`));
    await E.zavri(m);
  } finally {
    await E.koniec();
  }

  console.log("\n── MERANIA ────────────────────────────────────────────────");
  merania.forEach((x) => console.log(`  ${x.kde.padEnd(20)} ${x.typ.padEnd(34)} ${x.hodnota}`));
  console.log("\n── CHYBY V KONZOLE ────────────────────────────────────────");
  console.log(chybyVsetky.length ? chybyVsetky.join("\n") : "  žiadne");
  fs.writeFileSync(path.join(VON, "merania.json"), JSON.stringify({ merania, chyby: chybyVsetky }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
