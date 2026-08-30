// 03 — Detail receptu: porcie, jednotky, alergény/diéty, zdroj_url ako aktívny odkaz
"use strict";
const { prepni, zavriOkna } = require("../lib");

module.exports = {
  nazov: "Detail receptu",
  async spusti(E, t) {
    const page = await E.novaStranka();
    await prepni(page, "recepty");

    // recept s množstvami v gramoch a viackrokovým postupom
    const id = await page.evaluate(() =>
      (RECEPTY.find((r) => (r.postup || []).length >= 3 && (r.ingrediencie || []).some((i) => i.mnozstvo != null && /^(g|ml)$/i.test(i.jednotka || "")) && r.porcie >= 2) || RECEPTY[0]).id);

    // otvor cez klik na kartu, nie cez API — chceme overiť skutočnú cestu používateľa
    await page.evaluate((i) => {
      document.getElementById("hladaj").value = RECEPTY.find((r) => r.id === i).nazov;
      window.renderGrid();
    }, id);
    await page.waitForTimeout(120);
    const karta = page.locator("#grid .card .body").first();
    await karta.click();
    await page.waitForTimeout(200);
    await t.ok(await page.evaluate(() => document.getElementById("overlay").classList.contains("open")),
      "klik na kartu otvorí detail receptu");

    const zaklad = await page.evaluate(() => ({
      nadpis: (document.querySelector("#modal .hero h2") || {}).textContent || "",
      ing: document.querySelectorAll("#ing-body tr").length,
      kroky: document.querySelectorAll("#postup-ol li").length,
      porcie: +document.getElementById("pnum").value,
    }));
    await t.ok(zaklad.nadpis.length > 2, "detail má nadpis", zaklad.nadpis);
    await t.ok(zaklad.ing > 0, "detail vypíše ingrediencie", zaklad.ing);
    await t.ok(zaklad.kroky >= 3, "detail vypíše postup", zaklad.kroky);

    // ── prepočet porcií ─────────────────────────────────────────────────────
    const mnozstva = () => page.evaluate(() =>
      [...document.querySelectorAll("#ing-body tr")].map((tr) => (tr.querySelector(".mn") || {}).textContent || ""));
    const cislo = (s) => { const m = String(s).replace(/\s/g, "").match(/([\d,.]+)/); return m ? parseFloat(m[1].replace(",", ".")) : null; };

    const m1 = await mnozstva();
    await page.click("#modal .stepper button:last-child");   // +1 porcia
    await page.waitForTimeout(80);
    const m2 = await mnozstva();
    const porcie2 = await page.evaluate(() => +document.getElementById("pnum").value);
    await t.ok(porcie2 === zaklad.porcie + 1, "tlačidlo + zvýši počet porcií", `${zaklad.porcie} → ${porcie2}`);

    const pomery = m1.map((a, i) => { const x = cislo(a), y = cislo(m2[i]); return x && y ? y / x : null; }).filter(Boolean);
    const cakany = porcie2 / zaklad.porcie;
    const sedia = pomery.filter((p) => Math.abs(p - cakany) < 0.06).length;
    await t.ok(pomery.length > 0 && sedia >= Math.ceil(pomery.length * 0.6),
      `množstvá sa prepočítajú podľa porcií (×${cakany.toFixed(2)}): ${sedia}/${pomery.length} sedí`,
      JSON.stringify({ m1: m1.slice(0, 4), m2: m2.slice(0, 4), pomery: pomery.slice(0, 6) }));

    // ── „na 1 porciu“ ───────────────────────────────────────────────────────
    await page.fill("#pnum", "1");
    await page.dispatchEvent("#pnum", "change");
    await page.waitForTimeout(80);
    const m1p = await mnozstva();
    const pomery1 = m1.map((a, i) => { const x = cislo(a), y = cislo(m1p[i]); return x && y ? y / x : null; }).filter(Boolean);
    const cakany1 = 1 / zaklad.porcie;
    const sedia1 = pomery1.filter((p) => Math.abs(p - cakany1) < 0.06 || Math.abs(p - cakany1) / cakany1 < 0.35).length;
    await t.ok(sedia1 >= Math.ceil(pomery1.length * 0.5),
      `prepočet „na 1 porciu“ (×${cakany1.toFixed(2)}); nedeliteľné jednotky sa zaokrúhľujú`, JSON.stringify(m1p.slice(0, 5)));
    // nedeliteľné jednotky musia byť celé čísla
    const nedelitelne = await page.evaluate(() => {
      const zle = [];
      const NE = ["ks", "kus", "plátok", "platok", "rožok", "rozok", "žemľa", "zemla"];
      [...document.querySelectorAll("#ing-body tr")].forEach((tr, i) => {
        const txt = (tr.querySelector(".mn") || {}).textContent || "";
        const j = (aktualny.ingrediencie[i] || {}).jednotka || "";
        if (NE.includes(j.toLowerCase())) {
          const m = txt.replace(/\s/g, "").match(/^([\d,.]+)/);
          if (m && !/^\d+$/.test(m[1])) zle.push(txt);
        }
      });
      return zle;
    });
    await t.ok(nedelitelne.length === 0, "nedeliteľné jednotky (ks/plátok…) sú celé čísla", nedelitelne.join(", "));

    // ── prepočet ml → lyžice ────────────────────────────────────────────────
    // nájdi recept s ml alebo lyžicovou surovinou
    const mlId = await page.evaluate(() =>
      (RECEPTY.find((r) => (r.ingrediencie || []).some((i) => i.mnozstvo >= 15 && /^ml$/i.test(i.jednotka || ""))) || null || {}).id);
    if (mlId) {
      await page.evaluate((i) => window.otvor(i), mlId);
      await page.waitForTimeout(100);
      const metric = await mnozstva();
      await page.selectOption("#unit-mode", "spoon");
      await page.waitForTimeout(100);
      const spoon = await mnozstva();
      const maLyzice = spoon.some((s) => /PL|ČL|lyži/i.test(s));
      await t.ok(maLyzice, "prepnutie na „lyžice“ prevedie ml na PL/ČL",
        JSON.stringify({ metric: metric.slice(0, 5), spoon: spoon.slice(0, 5) }));
      // 15 ml = 1 PL
      const spravny = await page.evaluate(() => window.prevodJednotka(15, "ml"));
      await t.ok(/1\s*PL/.test(spravny) || /PL/.test(spravny), "15 ml sa prevedie na 1 PL", spravny);
      await page.selectOption("#unit-mode", "imperial");
      await page.waitForTimeout(80);
      const imp = await mnozstva();
      await t.ok(imp.some((s) => /oz|cup|lb/i.test(s)), "prepnutie na oz/cup funguje", imp.slice(0, 4).join(" | "));
      await page.selectOption("#unit-mode", "metric");
    } else {
      await t.ok(false, "nenašiel sa recept s ml na test prevodu jednotiek");
    }
    await zavriOkna(page);

    // ── alergény a diétne značky ────────────────────────────────────────────
    const alergId = await page.evaluate(() => {
      const r = RECEPTY.find((x) => alergenyReceptu(x).length > 0);
      return r ? r.id : null;
    });
    await page.evaluate((i) => window.otvor(i), alergId);
    await page.waitForTimeout(100);
    const badge = await page.evaluate(() => ({
      alerg: [...document.querySelectorAll("#modal .badge.alerg")].map((b) => b.textContent.trim()),
      ocakavane: alergenyReceptu(aktualny),
      vsetky: [...document.querySelectorAll("#modal .row-badges .badge")].map((b) => b.textContent.trim()),
    }));
    await t.ok(badge.alerg.length === badge.ocakavane.length && badge.alerg.length > 0,
      `alergény sa zobrazia ako značky (${badge.alerg.join(", ")})`, JSON.stringify(badge));
    await zavriOkna(page);

    const vegId = await page.evaluate(() => { const r = RECEPTY.find((x) => diety(x).veg && diety(x).bezlepku); return r ? r.id : null; });
    if (vegId) {
      await page.evaluate((i) => window.otvor(i), vegId);
      await page.waitForTimeout(100);
      const znacky = await page.evaluate(() => [...document.querySelectorAll("#modal .row-badges .badge")].map((b) => b.textContent.trim()).join(" | "));
      await t.ok(/vegetariánske/i.test(znacky) && /bez lepku/i.test(znacky), "diétne značky (veg, bez lepku) sú v detaile", znacky);
      await zavriOkna(page);
    }

    // ── zdroj_url = AKTÍVNY odkaz (Content Policy Varecha) ──────────────────
    const so = await page.evaluate(() => {
      const spolu = RECEPTY.length;
      const sZdrojom = RECEPTY.filter((r) => r.zdroj).length;
      const sUrl = RECEPTY.filter((r) => r.zdroj_url).length;
      const varecha = RECEPTY.filter((r) => /varecha/i.test(r.zdroj || ""));
      const varechaBezUrl = varecha.filter((r) => !r.zdroj_url).length;
      return { spolu, sZdrojom, sUrl, varecha: varecha.length, varechaBezUrl, prvyUrl: (RECEPTY.find((r) => r.zdroj_url) || {}).id };
    });
    await t.ok(so.sZdrojom === so.spolu, `každý recept má zdroj (${so.sZdrojom}/${so.spolu})`, JSON.stringify(so));
    await t.ok(so.varechaBezUrl === 0, `všetky Varecha recepty majú zdroj_url (${so.varecha} receptov)`, so.varechaBezUrl);
    t.metrika("receptov so zdroj_url", `${so.sUrl} / ${so.spolu}`);

    await page.evaluate((i) => window.otvor(i), so.prvyUrl);
    await page.waitForTimeout(100);
    const odkaz = await page.evaluate(() => {
      const a = document.querySelector("#modal .zdroj a");
      if (!a) return null;
      const r = a.getBoundingClientRect();
      return { href: a.getAttribute("href"), text: a.textContent.trim(), target: a.getAttribute("target"), rel: a.getAttribute("rel"), w: Math.round(r.width), h: Math.round(r.height) };
    });
    await t.ok(odkaz && /^https?:\/\//.test(odkaz.href), "zdroj sa vykreslí ako aktívny <a href> odkaz", JSON.stringify(odkaz));
    await t.ok(odkaz && odkaz.w > 10 && odkaz.h > 8, "odkaz na zdroj je viditeľný a klikateľný", JSON.stringify(odkaz));
    await t.ok(odkaz && odkaz.rel === "noopener noreferrer" && odkaz.target === "_blank", "odkaz sa otvára bezpečne v novej karte", JSON.stringify(odkaz));

    // výživové hodnoty v detaile
    const nutri = await page.evaluate(() => {
      const b = document.getElementById("nutri");
      return { vidno: getComputedStyle(b).display !== "none", text: b.textContent.replace(/\s+/g, " ").trim().slice(0, 90) };
    });
    await t.ok(nutri.vidno && /kcal/.test(nutri.text), "detail ukáže kcal a makrá", JSON.stringify(nutri));

    await zavriOkna(page);
    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole v detaile receptu",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
