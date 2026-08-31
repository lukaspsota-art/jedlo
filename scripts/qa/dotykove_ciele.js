// QA: dotykové ciele na 393×850 — čo je pod 44 px a čo pod 24 px, po obrazovkách.
"use strict";
const { Tester, vytvorProstredie } = require("../../e2e/lib");
const SEL = "button, a[onclick], a[href], input, select, textarea, [role=button], [onclick], summary, label";
(async () => {
  const t = new Tester(); const E = await vytvorProstredie(t);
  const p = await E.novaStranka({ viewport: { width: 393, height: 850 }, touch: true });
  await p.evaluate(async () => { window.prepni("planovac"); await window.generujJedalnicek(true); });
  await p.waitForTimeout(500);
  let pod24 = 0, pod44 = 0;
  for (const v of ["domov", "recepty", "planovac", "nakup", "vyziva", "spajza", "doma", "nastavenia"]) {
    await p.evaluate((x) => window.prepni(x), v);
    await p.waitForTimeout(250);
    const r = await p.evaluate((sel) => {
      const von = [];
      document.querySelectorAll("#v-" + document.querySelector(".view.active").id.slice(2) + " " + sel).forEach(el => {
        const q = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return;
        if (q.width < 1 || q.height < 1) return;
        // vnorené prvky (label s inputom) rátame raz — cieľom je ten väčší
        const m = Math.min(q.width, q.height);
        if (m < 44) von.push({ t: el.tagName.toLowerCase(), c: String(el.className || "").slice(0, 22), txt: (el.textContent || el.value || "").trim().slice(0, 22), w: Math.round(q.width), h: Math.round(q.height) });
      });
      return von;
    }, SEL);
    const p24 = r.filter(x => Math.min(x.w, x.h) < 24);
    pod24 += p24.length; pod44 += r.length;
    console.log(`\n── ${v} ── pod 44 px: ${r.length} · pod 24 px: ${p24.length}`);
    const zhluk = {};
    r.forEach(x => { const k = `${x.t}.${x.c}`; (zhluk[k] = zhluk[k] || []).push(`${x.w}×${x.h}`); });
    Object.entries(zhluk).sort((a, b) => b[1].length - a[1].length).slice(0, 8).forEach(([k, v2]) => console.log(`   ${String(v2.length).padStart(3)}× ${k.padEnd(30)} ${v2.slice(0, 3).join(" ")}`));
    if (p24.length) console.log("   POD 24 px: " + JSON.stringify(p24));
  }
  console.log(`\nSPOLU pod 44 px: ${pod44} · pod 24 px: ${pod24}`);
  await E.koniec(); process.exit(0);
})();
