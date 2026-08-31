// QA: výkon (reálne throttlovanie siete aj CPU) a hraničné prípady.
// Beh: node scripts/qa/vykon_hranice.js
"use strict";
const fs = require("fs");
const path = require("path");
const { Tester, vytvorProstredie, SUBOR } = require("../../e2e/lib");
const P = (s) => console.log(s);

async function cdp(page) { return page.context().newCDPSession(page); }

(async () => {
  const t = new Tester();
  const E = await vytvorProstredie(t);

  P("══ VÝKON ══");
  P(`veľkosť kucharka.html: ${(fs.statSync(SUBOR).size / 1048576).toFixed(2)} MB`);
  P(`veľkosť docs/index.html: ${(fs.statSync(path.join(__dirname, "..", "..", "docs", "index.html")).size / 1048576).toFixed(2)} MB`);

  // 1) načítanie na 4 Mbit/s (reálne throttlovanie cez CDP), čistá cache
  for (const [meno, mbit, cpu] of [["4 Mbit/s, CPU 1×", 4, 1], ["4 Mbit/s, CPU 4×", 4, 4], ["bez obmedzenia", 0, 1]]) {
    const q = await E.novaStranka({ viewport: { width: 393, height: 850 }, bezNacitania: true });
    const s = await cdp(q);
    await s.send("Network.enable");
    if (mbit) await s.send("Network.emulateNetworkConditions", { offline: false, latency: 40, downloadThroughput: mbit * 1024 * 1024 / 8, uploadThroughput: mbit * 1024 * 1024 / 8 });
    if (cpu > 1) await s.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    const t0 = Date.now();
    await q.goto(E.urlHttp, { waitUntil: "load", timeout: 300000 });
    await q.waitForFunction(() => typeof RECEPTY !== "undefined", null, { timeout: 300000 });
    const load = Date.now() - t0;
    await q.waitForFunction(() => { const g = document.getElementById("grid"); return g && g.children.length > 0; }, null, { timeout: 300000 }).catch(() => {});
    const pripravena = Date.now() - t0;
    const m = await q.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0] || {};
      return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0), uzlov: document.getElementsByTagName("*").length,
        heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    });
    P(`  ${meno.padEnd(18)} do RECEPTY ${String(load).padStart(6)} ms · mriežka ${String(pripravena).padStart(6)} ms · DCL ${m.dcl} ms · DOM ${m.uzlov} uzlov · heap ${m.heap} MB`);
    await E.zavri(q);
  }

  // 2) merania v appke (CPU 4×, telefón)
  const p = await E.novaStranka({ viewport: { width: 393, height: 850 } });
  const s = await cdp(p);
  await s.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const casy = await p.evaluate(async () => {
    const mer = (f) => { const a = performance.now(); f(); return Math.round((performance.now() - a) * 10) / 10; };
    const out = {};
    out.renderGrid = mer(() => window.renderGrid());
    document.getElementById("hladaj").value = "kur"; out.hladanie = mer(() => window.renderGrid());
    document.getElementById("hladaj").value = "";
    window.renderGrid();
    const g = [];
    for (let i = 0; i < 3; i++) { const a = performance.now(); await window.generujJedalnicek(true); g.push(Math.round(performance.now() - a)); }
    out.generovanie = g.sort((x, y) => x - y)[1];
    out.renderPlan = mer(() => window.renderPlan());
    out.renderNakup = mer(() => window.renderNakup());
    out.renderVyziva = mer(() => window.renderVyziva());
    out.renderDash = mer(() => window.renderDash());
    out.uzlovPoStarte = document.getElementsByTagName("*").length;
    return out;
  });
  P(`  CPU 4× · renderGrid ${casy.renderGrid} ms · hľadanie ${casy.hladanie} ms · generovanie týždňa ${casy.generovanie} ms`);
  P(`  CPU 4× · renderPlan ${casy.renderPlan} ms · renderNakup ${casy.renderNakup} ms · renderVyziva ${casy.renderVyziva} ms · renderDash ${casy.renderDash} ms`);
  P(`  DOM uzlov po štarte: ${casy.uzlovPoStarte}`);

  // 3) plynulosť scrollu mriežky (CPU 4×)
  await p.evaluate(() => window.prepni("recepty"));
  const scroll = await p.evaluate(async () => {
    const ramce = [];
    let posl = performance.now(), bezi = true;
    const tik = () => { const n = performance.now(); ramce.push(n - posl); posl = n; if (bezi) requestAnimationFrame(tik); };
    requestAnimationFrame(tik);
    for (let i = 0; i < 30; i++) { window.scrollBy(0, 240); await new Promise(r => setTimeout(r, 50)); }
    bezi = false;
    const z = ramce.slice(2).sort((a, b) => a - b);
    return { median: Math.round(z[z.length >> 1]), p95: Math.round(z[Math.floor(z.length * 0.95)]), dlhych: z.filter(x => x > 50).length, spolu: z.length, kariet: document.getElementById("grid").children.length };
  });
  P(`  scroll mriežky (CPU 4×): medián ${scroll.median} ms · p95 ${scroll.p95} ms · rámcov >50 ms: ${scroll.dlhych}/${scroll.spolu} · kariet po scrolle: ${scroll.kariet}`);
  await s.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  // ══ HRANIČNÉ PRÍPADY ══
  P("\n══ HRANIČNÉ PRÍPADY ══");
  const skus = async (meno, fn) => {
    try { const r = await fn(); P(`  OK    ${meno.padEnd(38)} ${typeof r === "string" ? r : JSON.stringify(r)}`); }
    catch (e) { P(`  CHYBA ${meno.padEnd(38)} ${String(e).slice(0, 160)}`); }
  };

  await skus("prázdny plán — všetky obrazovky", async () => {
    await p.evaluate(() => { S.plan = {}; S.planF = {}; save(); });
    for (const v of ["domov", "planovac", "nakup", "vyziva"]) await p.evaluate((x) => window.prepni(x), v);
    return p.evaluate(() => ({
      plan: (document.getElementById("v-planovac").textContent.match(/Zatiaľ|prázdn|Zostav[^.]{0,40}/i) || [""])[0],
      nakup: (document.getElementById("nakup-list").textContent || "").replace(/\s+/g, " ").trim().slice(0, 90),
      vyziva: (document.getElementById("v-vyziva").textContent || "").replace(/\s+/g, " ").slice(0, 70),
      chyby: 0,
    }));
  });

  await skus("jeden jediný recept v knižnici", async () => {
    return p.evaluate(async () => {
      const zaloha = RECEPTY.slice();
      RECEPTY.length = 0; RECEPTY.push(zaloha.find(r => r.kategoria === "Hlavné jedlo"));
      window.renderGrid(); window.prepni("planovac");
      let vysl;
      try { await window.generujJedalnicek(true); vysl = { generovanie: "prešlo", naplnenych: (() => { let n = 0; for (let d = 0; d < 7; d++) window.slotyDna(d).forEach(sl => { if (window.slotIds(d, sl).length) n++; }); return n; })() }; }
      catch (e) { vysl = { generovanie: "VÝNIMKA: " + String(e).slice(0, 90) }; }
      RECEPTY.length = 0; zaloha.forEach(r => RECEPTY.push(r)); window.renderGrid();
      return vysl;
    });
  });

  await skus("veľmi dlhý názov stravníka + suroviny", async () => {
    await p.evaluate(() => {
      const D = "Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".repeat(3);
      S.profil.stravnici = [{ nazov: D, kcal: 1450 }];
      S.nakupManual = [{ id: "m1", nazov: D, mnoz: D, odd: "Ostatné", done: false }];
      S.spajza = [{ id: 1, nazov: D, mnozstvo: 1, jednotka: "g", miesto: "Špajza", expiry: "", min: 0 }];
      save(); window.prepni("nakup"); window.renderNakup(); window.renderDash();
    });
    return p.evaluate(() => ({ docW: document.documentElement.scrollWidth, viewW: document.documentElement.clientWidth, pretecie: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 }));
  });

  await skus("dva týždne dozadu a dopredu", async () => {
    return p.evaluate(async () => {
      const out = [];
      const zaklad = S.viewOd;
      for (const d of [-14, -7, 0, 7, 14]) {
        S.viewOd = window.pridajDni(zaklad, d);
        window.renderPlan(); window.renderNakup(); window.renderVyziva(); window.renderDash();
        out.push(d + ":" + S.viewOd + " sloty=" + (() => { let n = 0; for (let i = 0; i < 7; i++) window.slotyDna(i).forEach(sl => { if (window.slotIds(i, sl).length) n++; }); return n; })());
      }
      S.viewOd = zaklad; window.renderPlan();
      return out.join(" · ");
    });
  });

  await skus("zaplnený localStorage (kvóta)", async () => {
    return p.evaluate(() => {
      // zaplň localStorage balastom, potom skús uložiť
      let n = 0;
      try { for (; n < 400; n++) localStorage.setItem("__balast" + n, "x".repeat(50000)); }
      catch (e) { /* kvóta */ }
      let vysledok;
      try { S.pozn["x"] = "y".repeat(1000); window.save(); vysledok = "save() nevyhodil výnimku"; }
      catch (e) { vysledok = "save() VYHODIL VÝNIMKU: " + String(e).slice(0, 90); }
      let dalej;
      try { window.renderPlan(); window.renderNakup(); window.renderDash(); dalej = "appka po tom kreslí ďalej"; }
      catch (e) { dalej = "appka PADLA: " + String(e).slice(0, 90); }
      const toast = (document.getElementById("toast").textContent || "").slice(0, 80);
      for (let i = 0; i < n; i++) localStorage.removeItem("__balast" + i);
      return { zapisov: n, vysledok, dalej, toast };
    });
  });

  P("\nCHYBY V KONZOLE: " + (p.chyby.length ? JSON.stringify(p.chyby.slice(0, 8), null, 1) : "žiadne"));
  await E.koniec();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
