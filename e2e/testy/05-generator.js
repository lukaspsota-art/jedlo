// 05 — Generátor jedálnička: naplní týždeň, kcal sedia k cieľu, opakované generovanie dá iný platný výsledok
"use strict";
const { prepni, zavriOkna, naplnPlan, pocetSlotov } = require("../lib");

async function snimok(page) {
  return page.evaluate(() => {
    const out = {};
    for (let di = 0; di < 7; di++) { out[di] = {}; slotyDna(di).forEach((sl) => { out[di][sl] = slotIds(di, sl).join("+"); }); }
    return out;
  });
}
async function dennyKcal(page) {
  return page.evaluate(() => {
    const out = [];
    for (let di = 0; di < 7; di++) { let s = 0; slotyDna(di).forEach((sl) => { const f = pf(di, sl); slotIds(di, sl).forEach((c) => { const r = komponent(c); if (r) s += kcalPorcia(r) * f; }); }); out.push(Math.round(s)); }
    return out;
  });
}

module.exports = {
  nazov: "Generátor jedálnička",
  async spusti(E, t) {
    const page = await E.novaStranka();
    await prepni(page, "planovac");

    // ── generovanie cez UI tlačidlo (dialóg generovania) ────────────────────
    await page.click("#v-planovac button.btn.primary");
    await page.waitForTimeout(300);
    const wiz = await page.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      text: (document.getElementById("pick-modal").textContent || "").slice(0, 120),
      maTlacidlo: !!document.querySelector("#pick-modal [onclick*='generujJedalnicek']"),
    }));
    await t.ok(wiz.otvorene, "„✨ Zostaviť jedálniček“ otvorí dotazník generovania", JSON.stringify(wiz));
    await t.ok(wiz.maTlacidlo, "dotazník má tlačidlo na spustenie generovania", JSON.stringify(wiz));
    await page.click("#pick-modal [onclick*='generujJedalnicek']");
    await page.waitForTimeout(600);
    await zavriOkna(page);

    const n1 = await pocetSlotov(page);
    await t.ok(n1 >= 20, `generovanie z UI naplní plán (${n1} slotov)`, n1);

    const s1 = await snimok(page);
    const k1 = await dennyKcal(page);
    const ciel = await page.evaluate(() => S.profil.kcal);

    // ── denné kcal sedia k cieľu ────────────────────────────────────────────
    const v10 = k1.filter((k) => Math.abs(k / ciel - 1) <= 0.10).length;
    const v15 = k1.filter((k) => Math.abs(k / ciel - 1) <= 0.15).length;
    t.metrika("beh 1 — denné kcal", k1.join(", "));
    t.metrika("beh 1 — dní v ±10 % / ±15 % cieľa", `${v10}/7 · ${v15}/7`);
    await t.ok(v15 === 7, `všetkých 7 dní je v ±15 % cieľa ${ciel} kcal (${v15}/7)`, JSON.stringify(k1));
    await t.ok(v10 >= 5, `aspoň 5 dní je v ±10 % cieľa (${v10}/7)`, JSON.stringify(k1));

    // ── doménové pravidlá: obed ≥ večera, žiadne opakovanie v týždni ────────
    const pravidla = await page.evaluate(() => {
      const kcalSlotu = (di, sl) => slotIds(di, sl).reduce((a, c) => { const r = komponent(c); return a + (r ? kcalPorcia(r) : 0); }, 0);
      let obedVecera = 0, dni = 0;
      const idcka = [];
      for (let di = 0; di < 7; di++) {
        const sl = slotyDna(di);
        if (sl.includes("Obed") && sl.includes("Večera")) { dni++; if (kcalSlotu(di, "Obed") >= kcalSlotu(di, "Večera")) obedVecera++; }
        sl.forEach((s) => slotIds(di, s).forEach((c) => { if (String(c).indexOf("prf:") !== 0) idcka.push(c); }));
      }
      const unik = new Set(idcka);
      // opakovanie v rámci bloku je v poriadku (navaríš raz, ješ viac dní) — počítaj unikáty na blok
      const blokIdcka = [];
      bloky().forEach((b) => { const s = new Set(); b.forEach((di) => slotyDna(di).forEach((sl) => slotIds(di, sl).forEach((c) => { if (String(c).indexOf("prf:") !== 0) s.add(c); }))); blokIdcka.push([...s]); });
      const naprieBlokmi = blokIdcka.flat();
      const duplNaprie = naprieBlokmi.length - new Set(naprieBlokmi).size;
      return { obedVecera, dni, unikatov: unik.size, spolu: idcka.length, duplNaprie, blokov: blokIdcka.length };
    });
    await t.ok(pravidla.obedVecera === pravidla.dni,
      `obed ≥ večera vo všetkých dňoch (${pravidla.obedVecera}/${pravidla.dni})`, JSON.stringify(pravidla));
    await t.ok(pravidla.duplNaprie === 0,
      `žiadny recept sa neopakuje naprieč blokmi (${pravidla.blokov} bloky)`, JSON.stringify(pravidla));
    t.metrika("unikátnych receptov v týždni", `${pravidla.unikatov} (z ${pravidla.spolu} zápisov)`);

    // ── opakované generovanie: iný, ale platný výsledok ────────────────────
    let rozdielov = 0, behov = 0;
    const kcalVsetkych = [k1];
    for (let i = 0; i < 3; i++) {
      await naplnPlan(page, true);
      behov++;
      const s2 = await snimok(page);
      const k2 = await dennyKcal(page);
      kcalVsetkych.push(k2);
      let zmien = 0, spolu = 0;
      for (const di in s1) for (const sl in s1[di]) { spolu++; if (s1[di][sl] !== (s2[di] || {})[sl]) zmien++; }
      if (zmien > spolu * 0.3) rozdielov++;
      const n = await pocetSlotov(page);
      await t.ok(n >= 20, `opakované generovanie #${i + 1} naplní plán (${n} slotov)`, n);
      const ok15 = k2.filter((k) => Math.abs(k / ciel - 1) <= 0.15).length;
      await t.ok(ok15 === 7, `opakované generovanie #${i + 1}: všetkých 7 dní v ±15 % cieľa`, JSON.stringify(k2));
    }
    await t.ok(rozdielov === behov, `každé opakované generovanie dá výrazne iný týždeň (${rozdielov}/${behov})`,
      JSON.stringify({ beh1: s1[0], posledny: (await snimok(page))[0] }));
    t.metrika("denné kcal 4 behov", kcalVsetkych.map((k) => k.join("/")).join("  |  "));

    // ── čas generovania týždňa ──────────────────────────────────────────────
    const casy = [];
    for (let i = 0; i < 3; i++) {
      const ms = await page.evaluate(async () => { const t0 = performance.now(); await generujJedalnicek(true); return Math.round(performance.now() - t0); });
      casy.push(ms);
    }
    const median = casy.sort((a, b) => a - b)[1];
    t.metrika("čas generovania týždňa (medián z 3)", median, "ms");
    await t.ok(median < 4000, `generovanie týždňa je pod 4 s (${median} ms)`, casy.join(", "));

    // ── generovanie rešpektuje zakázané suroviny ───────────────────────────
    await page.evaluate(() => { S.profil.zakazane = "huby, koriander"; save(); });
    await naplnPlan(page, true);
    const zakaz = await page.evaluate(() => {
      const zle = [];
      for (let di = 0; di < 7; di++) slotyDna(di).forEach((sl) => slotIds(di, sl).forEach((c) => {
        const r = komponent(c); if (r && !r._priloha && zakazaneChyta(r)) zle.push(r.nazov);
      }));
      return zle;
    });
    await t.ok(zakaz.length === 0, "generátor nezaradí recept so zakázanou surovinou", zakaz.join(", "));
    await page.evaluate(() => { S.profil.zakazane = ""; save(); });

    // ── generovanie rešpektuje skryté recepty ──────────────────────────────
    await page.evaluate(() => {
      const ids = RECEPTY.filter((r) => r.kategoria === "Polievka").slice(0, 30).map((r) => r.id);
      ids.forEach((i) => S.skryte[i] = 1); save();
    });
    await naplnPlan(page, true);
    const skryte = await page.evaluate(() => {
      const zle = [];
      for (let di = 0; di < 7; di++) slotyDna(di).forEach((sl) => slotIds(di, sl).forEach((c) => { if (S.skryte[c]) zle.push(c); }));
      return zle;
    });
    await t.ok(skryte.length === 0, "generátor nezaradí skrytý recept", skryte.join(", "));
    await page.evaluate(() => { S.skryte = {}; save(); });

    // ── vyprázdnenie plánu ──────────────────────────────────────────────────
    await naplnPlan(page, true);
    await page.evaluate(async () => { const p = vymazPlan(); await new Promise((r) => setTimeout(r, 50)); document.querySelector("#dlg-modal .btn.primary, #dlg-modal button.primary").click(); await p; });
    await page.waitForTimeout(200);
    await t.ok(await pocetSlotov(page) === 0, "„Vyprázdniť týždeň“ (s potvrdením) plán vymaže");

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole pri generovaní",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
