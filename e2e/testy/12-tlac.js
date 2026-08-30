// 12 — Tlač: tlačová verzia receptu, plánu a nákupu nesmie obsahovať ovládacie prvky
"use strict";
const { prepni, zavriOkna, naplnPlan } = require("../lib");

// Vráti ovládacie prvky viditeľné v tlačovom režime, rozdelené na:
//   formulare — skutočné formulárové prvky (tlačidlo, select, textarea, input); na papieri sú to
//               prázdne rámčeky a šípky, teda čistý odpad
//   afordancie — ikonky/linky, ktoré existujú len pre klikanie (✎ zmeniť, ⋯ viac, mchipy, +/−)
//   textKlik — bežný text, ktorý má navyše onclick (názov suroviny); na papieri vyzerá ako text,
//              takže sa len počíta
async function ovladacieVTlaci(page, koren) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { chyba: "koreň " + sel + " neexistuje" };
    const vidno = (el) => {
      let e = el;
      while (e && e !== document.documentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        e = e.parentElement;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const AFORDANCIA = ".rm, .mchip, .plan-varenia, .ppl button, .ppl span, .chip, .kol-tile, .close, .fav, .stepper button, .hranica";
    const formulare = [], afordancie = [], textKlik = [];
    root.querySelectorAll("button, select, textarea, input:not([type=hidden]), [onclick], [role=button]").forEach((el) => {
      if (!vidno(el)) return;
      // odkaz na zdroj receptu je v tlači žiaduci (atribúcia)
      if (el.tagName === "A" && el.hasAttribute("href") && !el.hasAttribute("onclick")) return;
      const z = {
        tag: el.tagName.toLowerCase(), tr: String(el.className || "").slice(0, 30), id: el.id,
        text: (el.textContent || el.value || el.getAttribute("placeholder") || "").trim().slice(0, 34),
      };
      if (/^(button|select|textarea|input)$/.test(z.tag)) formulare.push(z);
      else if (el.matches(AFORDANCIA)) afordancie.push(z);
      else textKlik.push(z);
    });
    return { formulare, afordancie, textKlik };
  }, koren);
}

module.exports = {
  nazov: "Tlač",
  async spusti(E, t) {
    const page = await E.novaStranka();
    // window.print v headless otvorí dialóg — nahradíme ho zápisníkom volaní
    await page.addInitScript(() => { window.__print = 0; });
    await page.evaluate(() => { window.__print = 0; window.print = () => { window.__print++; }; });

    await prepni(page, "planovac");
    await naplnPlan(page);

    // ── tlač plánu ──────────────────────────────────────────────────────────
    await page.evaluate(() => window.tlacView("planovac"));
    await page.waitForTimeout(200);
    const volane = await page.evaluate(() => ({ n: window.__print, printme: [...document.querySelectorAll(".view.printme")].map((v) => v.id) }));
    await t.ok(volane.n === 1, "„🖨 Tlačiť plán“ zavolá window.print()", JSON.stringify(volane));
    await t.ok(volane.printme.length === 1 && volane.printme[0] === "v-planovac",
      "tlačí sa práve jeden pohľad (v-planovac)", JSON.stringify(volane));

    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);
    const tlacStav = await page.evaluate(() => ({
      pohladov: [...document.querySelectorAll(".view")].filter((v) => getComputedStyle(v).display !== "none").map((v) => v.id),
      side: getComputedStyle(document.querySelector(".side")).display,
      botnav: getComputedStyle(document.getElementById("botnav")).display,
    }));
    await t.ok(tlacStav.pohladov.length === 1, "v tlači je viditeľný len tlačený pohľad", JSON.stringify(tlacStav));
    await t.ok(tlacStav.side === "none" && tlacStav.botnav === "none", "navigácia sa netlačí", JSON.stringify(tlacStav));

    const planOvl = await ovladacieVTlaci(page, "#v-planovac");
    t.metrika("tlač plánu — formulárové prvky / afordancie / klikateľný text",
      `${planOvl.formulare.length} / ${planOvl.afordancie.length} / ${planOvl.textKlik.length}`);
    await t.ok(planOvl.formulare.length === 0, "tlačová verzia plánu neobsahuje formulárové prvky",
      JSON.stringify(planOvl.formulare.slice(0, 8)));
    await t.ok(planOvl.afordancie.length === 0, "tlačová verzia plánu neobsahuje klikacie afordancie (✎ zmeniť, ⋯ viac, mchipy, +/−)",
      JSON.stringify(planOvl.afordancie.slice(0, 10)));
    await page.screenshot({ path: require("path").join(__dirname, "..", "screenshoty", "tlac-plan.png"), fullPage: false }).catch(() => {});
    await page.emulateMedia({ media: "screen" });

    // ── tlač nákupu ─────────────────────────────────────────────────────────
    await page.evaluate(() => { window.__print = 0; window.tlacView("nakup"); });
    await page.waitForTimeout(200);
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);
    const nakupOvl = await ovladacieVTlaci(page, "#v-nakup");
    // zaškrtávacie políčka na papieri sú v poriadku (odškrtávaš perom), zvyšok nie
    const bezCheckboxov = nakupOvl.formulare.filter((x) => !(x.tag === "input" && /^(on|)$/.test(x.text)));
    t.metrika("tlač nákupu — formulárové prvky mimo políčok / afordancie / klikateľný text",
      `${bezCheckboxov.length} / ${nakupOvl.afordancie.length} / ${nakupOvl.textKlik.length}`);
    await t.ok(bezCheckboxov.length === 0, "tlačová verzia nákupu neobsahuje formulárové prvky (okrem zaškrtávacích políčok)",
      JSON.stringify(bezCheckboxov.slice(0, 8)));
    await t.ok(nakupOvl.afordancie.length === 0, "tlačová verzia nákupu neobsahuje klikacie afordancie",
      JSON.stringify(nakupOvl.afordancie.slice(0, 8)));
    const maPolozky = await page.evaluate(() => document.querySelectorAll("#nakup-list label").length);
    await t.ok(maPolozky > 10, `tlačová verzia nákupu obsahuje položky (${maPolozky})`, maPolozky);
    await page.screenshot({ path: require("path").join(__dirname, "..", "screenshoty", "tlac-nakup.png"), fullPage: false }).catch(() => {});
    await page.emulateMedia({ media: "screen" });

    // ── tlač receptu (detail je v .overlay/.modal) ──────────────────────────
    await prepni(page, "recepty");
    const id = await page.evaluate(() => RECEPTY.find((r) => (r.postup || []).length >= 3 && r.zdroj_url).id);
    await page.evaluate((i) => window.otvor(i), id);
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.__print = 0; document.querySelector("#m-det a[onclick*='window.print']").click(); });
    await page.waitForTimeout(200);
    await t.ok(await page.evaluate(() => window.__print) === 1, "„🖨 Tlačiť recept“ zavolá window.print()");

    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);
    const receptTlac = await page.evaluate(() => ({
      modalVidno: getComputedStyle(document.getElementById("modal")).display !== "none",
      ing: document.querySelectorAll("#ing-body tr").length,
      kroky: document.querySelectorAll("#postup-ol li").length,
      zdroj: (document.querySelector("#modal .zdroj") || {}).textContent || "",
      hodnotenie: getComputedStyle(document.querySelector("#modal .hodnotenie")).display,
      btnRow: getComputedStyle(document.querySelector("#modal .btn-row")).display,
      close: getComputedStyle(document.querySelector("#modal .close")).display,
    }));
    await t.ok(receptTlac.modalVidno && receptTlac.ing > 0 && receptTlac.kroky > 0,
      "tlačová verzia receptu obsahuje ingrediencie aj postup", JSON.stringify(receptTlac));
    await t.ok(/Zdroj/.test(receptTlac.zdroj), "tlačová verzia receptu obsahuje atribúciu zdroja", receptTlac.zdroj.slice(0, 60));
    await t.ok(receptTlac.hodnotenie === "none" && receptTlac.btnRow === "none" && receptTlac.close === "none",
      "hodnotenie, tlačidlá a ✕ sa netlačia", JSON.stringify(receptTlac));

    const receptOvl = await ovladacieVTlaci(page, "#modal");
    t.metrika("tlač receptu — formulárové prvky / afordancie / klikateľný text",
      `${receptOvl.formulare.length} / ${receptOvl.afordancie.length} / ${receptOvl.textKlik.length}`);
    await t.ok(receptOvl.formulare.length === 0, "tlačová verzia receptu neobsahuje formulárové prvky (porcie, jednotky, poznámka)",
      JSON.stringify(receptOvl.formulare.slice(0, 8)));
    await t.ok(receptOvl.afordancie.length === 0, "tlačová verzia receptu neobsahuje klikacie afordancie",
      JSON.stringify(receptOvl.afordancie.slice(0, 8)));
    await page.screenshot({ path: require("path").join(__dirname, "..", "screenshoty", "tlac-recept.png"), fullPage: false }).catch(() => {});
    await page.emulateMedia({ media: "screen" });
    await zavriOkna(page);

    // ── „Tlačiť týždeň (plán + nákup)“ ─────────────────────────────────────
    await page.evaluate(() => { window.__print = 0; window.tlacTyzden(); });
    await page.waitForTimeout(250);
    const tyzden = await page.evaluate(() => ({ n: window.__print, printme: [...document.querySelectorAll(".view.printme")].map((v) => v.id) }));
    await t.ok(tyzden.n === 1 && tyzden.printme.length === 2,
      "„Tlačiť týždeň“ pripraví plán aj nákup naraz", JSON.stringify(tyzden));
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(200);
    const obe = await page.evaluate(() => [...document.querySelectorAll(".view")].filter((v) => getComputedStyle(v).display !== "none").map((v) => v.id));
    await t.ok(obe.length === 2 && obe.includes("v-planovac") && obe.includes("v-nakup"),
      "v tlači týždňa sú viditeľné oba pohľady", JSON.stringify(obe));
    await page.emulateMedia({ media: "screen" });

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole pri tlači",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
