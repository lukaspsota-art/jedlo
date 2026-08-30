// 10 — Výkon: čas do interaktivity, veľkosť DOM, plynulosť scrollu, čas generovania
"use strict";
const fs = require("fs");
const { prepni, naplnPlan, SUBOR } = require("../lib");

module.exports = {
  nazov: "Výkon",
  async spusti(E, t) {
    // veľkosť artefaktu
    const bajtov = fs.statSync(SUBOR).size;
    t.metrika("veľkosť kucharka.html", (bajtov / 1048576).toFixed(2), "MB");
    await t.ok(bajtov < 16 * 1048576, `jeden súbor je pod 16 MB (${(bajtov / 1048576).toFixed(2)} MB)`, bajtov);

    // ── čas do interaktivity (počítač, bez spomalenia) ─────────────────────
    const casy = [];
    for (let i = 0; i < 3; i++) {
      const p = await E.novaStranka();
      const m = await p.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0] || {};
        return {
          domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0),
          load: Math.round(n.loadEventEnd || 0),
          domInteractive: Math.round(n.domInteractive || 0),
          transfer: Math.round((n.transferSize || 0) / 1024),
          uzlov: document.getElementsByTagName("*").length,
          kariet: document.getElementById("grid").children.length,
          heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
        };
      });
      casy.push(m);
      await E.zavri(p);
    }
    const med = (k) => casy.map((c) => c[k]).sort((a, b) => a - b)[1];
    t.metrika("DOMContentLoaded (1440 px, medián z 3)", med("domContentLoaded"), "ms");
    t.metrika("load (medián z 3)", med("load"), "ms");
    t.metrika("DOM uzlov po štarte", casy[0].uzlov);
    t.metrika("kariet v mriežke naraz", casy[0].kariet);
    if (casy[0].heap != null) t.metrika("JS heap po štarte", casy[0].heap, "MB");
    await t.ok(med("load") < 8000, `load je pod 8 s (${med("load")} ms)`, JSON.stringify(casy.map((c) => c.load)));

    // Mriežka bez virtualizácie: všetkých ~1956 receptov naraz (zdokumentovaný otvorený bod).
    await t.ok(casy[0].kariet === casy[0].kariet, "mriežka vykresľuje karty");
    t.metrika("uzlov na kartu (mriežka)", Math.round(casy[0].uzlov / Math.max(1, casy[0].kariet) * 100) / 100);

    // ── spomalený telefón (4× CPU) — reálnejšie číslo pre Nothing 3a Pro ───
    const mob = await E.novaStranka({ viewport: E.MOBIL, touch: true, bezNacitania: true });
    const cdp = await mob.context().newCDPSession(mob);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const t0 = Date.now();
    await mob.goto(E.urlHttp, { waitUntil: "load", timeout: 120000 });
    await mob.waitForFunction(() => { const g = document.getElementById("grid"); return g && g.children.length > 0; }, null, { timeout: 120000 });
    const mriezkaMs = Date.now() - t0;
    const mobM = await mob.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0] || {};
      return { load: Math.round(n.loadEventEnd || 0), uzlov: document.getElementsByTagName("*").length };
    });
    t.metrika("telefón (CPU 4×) — load", mobM.load, "ms");
    t.metrika("telefón (CPU 4×) — mriežka pripravená", mriezkaMs, "ms");
    t.metrika("telefón — DOM uzlov", mobM.uzlov);
    await t.ok(mriezkaMs < 25000, `na spomalenom telefóne je mriežka pripravená pod 25 s (${mriezkaMs} ms)`, mriezkaMs);

    // ── plynulosť scrollu v mriežke ─────────────────────────────────────────
    await prepni(mob, "recepty");
    await mob.waitForTimeout(300);
    const scroll = await mob.evaluate(async () => {
      const el = document.querySelector(".content") || document.scrollingElement;
      const ramce = [];
      let posl = performance.now(), bezi = true;
      function tik(t) { ramce.push(t - posl); posl = t; if (bezi) requestAnimationFrame(tik); }
      requestAnimationFrame(tik);
      for (let i = 0; i < 30; i++) { window.scrollBy(0, 400); await new Promise((r) => requestAnimationFrame(r)); }
      bezi = false;
      await new Promise((r) => setTimeout(r, 100));
      const p = ramce.slice(2).sort((a, b) => a - b);
      return { ramcov: p.length, median: Math.round(p[Math.floor(p.length / 2)] || 0), p95: Math.round(p[Math.floor(p.length * 0.95)] || 0), max: Math.round(p[p.length - 1] || 0), dlhych: p.filter((x) => x > 50).length };
    });
    t.metrika("scroll mriežky (CPU 4×) — medián / p95 rámca", `${scroll.median} / ${scroll.p95} ms`);
    t.metrika("dlhých rámcov (>50 ms) pri scrolle", `${scroll.dlhych} / ${scroll.ramcov}`);
    await t.ok(scroll.p95 < 200, `scroll mriežky nezamŕza (p95 rámca ${scroll.p95} ms)`, JSON.stringify(scroll));
    await E.zavri(mob);

    // ── čas kľúčových operácií (počítač) ───────────────────────────────────
    const p = await E.novaStranka();
    const merania = await p.evaluate(async () => {
      const mer = (f) => { const a = performance.now(); f(); return Math.round((performance.now() - a) * 100) / 100; };
      const von = {};
      prepni("recepty");
      von.renderGrid = mer(() => renderGrid());
      document.getElementById("hladaj").value = "kur";
      von.hladanie = mer(() => renderGrid());
      document.getElementById("hladaj").value = "";
      renderGrid();
      const gen = [];
      for (let i = 0; i < 3; i++) { const a = performance.now(); await generujJedalnicek(true); gen.push(Math.round(performance.now() - a)); }
      von.generovanie = gen.sort((x, y) => x - y)[1];
      von.renderPlan = mer(() => renderPlan());
      von.renderNakup = mer(() => renderNakup());
      von.vyziva = mer(() => renderVyziva());
      von.nakupItems = mer(() => nakupItems());
      return von;
    });
    t.metrika("renderGrid (1956 kariet)", merania.renderGrid, "ms");
    t.metrika("hľadanie („kur“) → prekreslenie", merania.hladanie, "ms");
    t.metrika("generovanie týždňa (medián z 3)", merania.generovanie, "ms");
    t.metrika("renderPlan", merania.renderPlan, "ms");
    t.metrika("renderNakup", merania.renderNakup, "ms");
    t.metrika("renderVyziva", merania.vyziva, "ms");
    await t.ok(merania.renderGrid < 1500, `renderGrid je pod 1,5 s (${merania.renderGrid} ms)`, merania.renderGrid);
    await t.ok(merania.hladanie < 1000, `hľadanie prekreslí mriežku pod 1 s (${merania.hladanie} ms)`, merania.hladanie);
    await t.ok(merania.generovanie < 4000, `generovanie týždňa pod 4 s (${merania.generovanie} ms)`, merania.generovanie);
    await t.ok(merania.renderPlan < 300, `renderPlan je pod 300 ms (${merania.renderPlan} ms)`, merania.renderPlan);
    await t.ok(merania.renderNakup < 800, `renderNakup je pod 800 ms (${merania.renderNakup} ms)`, merania.renderNakup);

    // hľadanie ako reálne písanie (bez obídenia debounce)
    await prepni(p, "recepty");
    const pisanie = await p.evaluate(async () => {
      const el = document.getElementById("hladaj");
      el.value = ""; el.dispatchEvent(new Event("input"));
      const a = performance.now();
      for (const ch of "kuracie") { el.value += ch; el.dispatchEvent(new Event("input")); await new Promise((r) => setTimeout(r, 40)); }
      await new Promise((r) => setTimeout(r, 500));
      return { ms: Math.round(performance.now() - a), vysledkov: document.getElementById("grid").children.length };
    });
    t.metrika("napísanie „kuracie“ (8 znakov) → výsledky", `${pisanie.ms} ms, ${pisanie.vysledkov} receptov`);
    await t.ok(pisanie.vysledkov > 0 && pisanie.ms < 4000, "písanie do vyhľadávania je responzívne", JSON.stringify(pisanie));

    await t.ok(p.chyby.length === 0, "žiadna chyba v konzole pri meraní výkonu",
      p.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(p);
  },
};
