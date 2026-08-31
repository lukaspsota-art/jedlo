// QA sonda: čo naozaj zostane viditeľné v TLAČI, keď sa ide skutočnou cestou appky
// (tlacView / tlacTyzden / tlacRecept — tie injektujú TLAC_CSS), nie iba emulateMedia.
"use strict";
const { Tester, vytvorProstredie } = require("../../e2e/lib");
(async () => {
  const t = new Tester(); const E = await vytvorProstredie(t);
  const page = await E.novaStranka();
  await page.evaluate(async () => { await window.generujJedalnicek(true); });
  await page.evaluate(() => { window.print = () => {}; });
  const zoznam = async (koren) => page.evaluate((sel) => {
    const root = document.querySelector(sel); if (!root) return ["KOREŇ CHÝBA " + sel];
    const vidno = (el) => { let e = el; while (e && e !== document.documentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false; e = e.parentElement; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const out = [];
    root.querySelectorAll("button, select, textarea, input:not([type=hidden]), [onclick], [role=button]").forEach((el) => {
      if (!vidno(el)) return;
      if (el.tagName === "A" && el.hasAttribute("href") && !el.hasAttribute("onclick")) return;
      out.push(el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 26) + " « " + (el.textContent || el.value || el.getAttribute("placeholder") || "").trim().slice(0, 38));
    });
    return out;
  }, koren);

  for (const [meno, akcia, koren] of [
    ["PLÁN (tlacView)", () => window.tlacView("planovac"), "#v-planovac"],
    ["NÁKUP (tlacView)", () => window.tlacView("nakup"), "#v-nakup"],
    ["TÝŽDEŇ (tlacTyzden)", () => window.tlacTyzden(), "#v-planovac"],
  ]) {
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => { document.body.classList.remove("tlac-plan", "tlac-detail"); });
    await page.evaluate(akcia);
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);
    const v = await zoznam(koren);
    console.log(`\n=== ${meno} — ${v.length} viditeľných ovládacích prvkov v tlači ===`);
    const pocty = {}; v.forEach(x => pocty[x.split(" « ")[0]] = (pocty[x.split(" « ")[0]] || 0) + 1);
    Object.entries(pocty).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(3)}× ${k}`));
    await page.screenshot({ path: require("path").join(__dirname, "..", "..", "e2e", "screenshoty", "qa-tlac-" + meno.split(" ")[0] + ".png"), fullPage: true }).catch(()=>{});
  }
  await E.koniec(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
