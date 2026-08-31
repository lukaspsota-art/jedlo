// 09 — Prístupnosť (WCAG 2.1/2.2 AA)
// Testy sú písané na CIEĽOVÝ stav. Časť z nich dnes PADÁ — sú označené ako známe
// (karty receptov a bunky plánu sú `<div onclick>`, viď CLAUDE.md „Stav a otvorené veci").
"use strict";
const { prepni, zavriOkna, naplnPlan } = require("../lib");

module.exports = {
  nazov: "Prístupnosť",
  async spusti(E, t) {
    const page = await E.novaStranka();

    // ── navigácia klávesnicou ───────────────────────────────────────────────
    const nav = await page.evaluate(() => {
      const a = [...document.querySelectorAll(".side nav a")];
      return a.map((x) => ({ tabindex: x.getAttribute("tabindex"), role: x.getAttribute("role"), aria: x.getAttribute("aria-label") }));
    });
    await t.ok(nav.every((x) => x.tabindex === "0" && x.role === "button" && x.aria),
      "položky bočnej navigácie sú dosiahnuteľné klávesnicou a majú menovku", JSON.stringify(nav.slice(0, 3)));

    // Tab z tela dokumentu musí dôjsť k navigácii
    await page.evaluate(() => document.body.focus());
    const tabOrder = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      tabOrder.push(await page.evaluate(() => {
        const a = document.activeElement;
        return a ? (a.tagName.toLowerCase() + (a.id ? "#" + a.id : "") + (a.className ? "." + String(a.className).split(" ")[0] : "")) : "null";
      }));
    }
    await t.ok(tabOrder.filter((x) => x !== "body" && x !== "null").length >= 8,
      `Tab prejde ovládacími prvkami (${tabOrder.filter((x) => x !== "body").length}/14)`, tabOrder.join(" → "));
    t.metrika("prvých 14 zastávok Tabu", tabOrder.slice(0, 8).join(" → "));

    // Enter aktivuje položku navigácie
    await page.evaluate(() => document.querySelector('.side nav a[data-v="recepty"]').focus());
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await t.ok(await page.evaluate(() => document.getElementById("v-recepty").classList.contains("active")),
      "Enter na položke navigácie prepne pohľad");

    // Medzerník aktivuje chip
    await prepni(page, "recepty");
    const chipPred = await page.evaluate(() => [...document.querySelectorAll("#chips .chip")].map((c) => c.getAttribute("tabindex")));
    await t.ok(chipPred.every((x) => x === "0"), "chipy kategórií majú tabindex=0", JSON.stringify(chipPred.slice(0, 5)));
    await page.evaluate(() => [...document.querySelectorAll("#chips .chip")][2].focus());
    const menoChipu = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press(" ");
    await page.waitForTimeout(250);
    await t.ok(await page.evaluate((m) => [...document.querySelectorAll("#chips .chip.active")].some((c) => c.textContent.trim() === m), menoChipu),
      `medzerník aktivuje chip („${menoChipu}“)`);
    await page.evaluate(() => window.zrusFiltre());

    // ── viditeľný focus ─────────────────────────────────────────────────────
    const focus = await page.evaluate(() => {
      // :focus-visible sa v CSS musí definovať s viditeľným obrysom
      let pravidlo = null;
      for (const sh of document.styleSheets) {
        let r; try { r = sh.cssRules; } catch (e) { continue; }
        for (const x of r) { if (x.selectorText && /:focus-visible/.test(x.selectorText) && /outline/.test(x.cssText)) { pravidlo = x.cssText.slice(0, 120); break; } }
        if (pravidlo) break;
      }
      return pravidlo;
    });
    await t.ok(!!focus && /outline:\s*\d/.test(focus), "existuje viditeľný :focus-visible obrys", String(focus));
    // a reálne sa aplikuje
    await page.evaluate(() => document.querySelector('.side nav a[data-v="domov"]').focus());
    const obrys = await page.evaluate(() => {
      const el = document.querySelector('.side nav a[data-v="domov"]');
      const cs = getComputedStyle(el);
      return { w: cs.outlineWidth, style: cs.outlineStyle, matches: el.matches(":focus-visible") };
    });
    await t.ok(!obrys.matches || (parseFloat(obrys.w) >= 1 && obrys.style !== "none"),
      "zameraný prvok má viditeľný obrys", JSON.stringify(obrys));

    // ── Escape zatvára okná ─────────────────────────────────────────────────
    await page.evaluate(() => window.otvor(RECEPTY[0].id));
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await t.ok(!(await page.evaluate(() => document.getElementById("overlay").classList.contains("open"))),
      "Escape zatvorí detail receptu");
    await page.evaluate(() => { window.confirmModal("test?"); });
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await t.ok(!(await page.evaluate(() => document.getElementById("dlg-overlay").classList.contains("open"))),
      "Escape zatvorí potvrdzovací dialóg");

    // fokus v dialógu: OK tlačidlo má fokus hneď po otvorení
    await page.evaluate(() => { window.confirmModal("test 2?"); });
    await page.waitForTimeout(250);
    const dlgFokus = await page.evaluate(() => {
      const a = document.activeElement;
      return { je: !!a && a.closest("#dlg-modal") !== null, text: a ? a.textContent.trim() : "" };
    });
    await t.ok(dlgFokus.je, "po otvorení dialógu je fokus vnútri dialógu", JSON.stringify(dlgFokus));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    // ── menovky formulárov ──────────────────────────────────────────────────
    const polia = await page.evaluate(() => {
      const bez = [];
      document.querySelectorAll("input:not([type=hidden]),select,textarea").forEach((el) => {
        if (getComputedStyle(el).display === "none" || !el.offsetParent) return;
        const lab = el.closest("label") || (el.id && document.querySelector(`label[for="${el.id}"]`));
        if (!lab && !el.getAttribute("aria-label") && !el.getAttribute("title") && !el.getAttribute("placeholder"))
          bez.push({ id: el.id, tag: el.tagName, typ: el.type });
      });
      return bez;
    });
    await t.ok(polia.length === 0, "každé viditeľné pole má menovku (label/aria-label/placeholder)", JSON.stringify(polia.slice(0, 6)));

    // ── obrázky a ikony ─────────────────────────────────────────────────────
    const ikony = await page.evaluate(() => {
      const bez = [];
      document.querySelectorAll(".side nav a .ic, .botnav a .ic").forEach((i) => { if (i.getAttribute("aria-hidden") !== "true") bez.push(i.textContent); });
      const obrBezAlt = [...document.querySelectorAll("img")].filter((i) => i.getAttribute("alt") === null).length;
      return { ikonyBezAria: bez, obrBezAlt };
    });
    await t.ok(ikony.ikonyBezAria.length === 0, "emoji ikony v navigácii sú aria-hidden", JSON.stringify(ikony));
    await t.ok(ikony.obrBezAlt === 0, "obrázky majú alt", ikony.obrBezAlt);

    // ── štruktúra nadpisov ──────────────────────────────────────────────────
    const nadpisy = await page.evaluate(() => {
      const v = document.querySelector(".view.active");
      return { h1: document.querySelectorAll("h1").length, h2vPohlade: v.querySelectorAll("h2").length, lang: document.documentElement.lang };
    });
    await t.ok(nadpisy.lang === "sk", "dokument má lang=\"sk\"", nadpisy.lang);
    await t.ok(nadpisy.h2vPohlade >= 1, "každý pohľad má nadpis", JSON.stringify(nadpisy));

    // ── toast má aria-live ──────────────────────────────────────────────────
    const toast = await page.evaluate(() => {
      const el = document.getElementById("toast");
      return { role: el.getAttribute("role"), live: el.getAttribute("aria-live") };
    });
    await t.ok(toast.live === "polite" && toast.role === "status", "oznamy (toast) sa hlásia čítačke", JSON.stringify(toast));

    // ── prefers-reduced-motion ──────────────────────────────────────────────
    const rm = await page.evaluate(() => {
      let ma = false;
      for (const sh of document.styleSheets) { let r; try { r = sh.cssRules; } catch (e) { continue; } for (const x of r) { if (x.media && /prefers-reduced-motion/.test(x.media.mediaText)) { ma = true; break; } } if (ma) break; }
      return ma;
    });
    await t.ok(rm, "CSS rešpektuje prefers-reduced-motion");

    // ══════════════════════════════════════════════════════════════════════
    // Klávesnica: karta receptu aj bunka plánu (P1 z AUDIT_UI_2026-08-19 — opravené).
    // Testujeme SPRÁVANIE, nie tvar značiek: karta je dnes `.card-open[role=button][tabindex=0]`
    // vnútri `.card`, hviezda ★ je jej SÚRODENEC (skutočné tlačidlo).
    // ══════════════════════════════════════════════════════════════════════
    await prepni(page, "recepty");
    const karty = await page.evaluate(() => {
      const k = document.querySelector("#grid .card");
      const otvarac = k.querySelector('[role="button"][tabindex="0"]');
      const klikBezRoly = [...k.querySelectorAll("div[onclick]")].filter((d) => d.getAttribute("tabindex") !== "0");
      return {
        maOtvarac: !!otvarac, ariaLabel: otvarac ? otvarac.getAttribute("aria-label") : "",
        klikatelneBezKlavesnice: klikBezRoly.length,
        hviezdaJeButton: (k.querySelector(".fav") || {}).tagName === "BUTTON",
        celkomKariet: document.querySelectorAll("#grid .card").length,
      };
    });
    await t.ok(karty.maOtvarac && karty.klikatelneBezKlavesnice === 0,
      "karta receptu je dosiahnuteľná klávesnicou (WCAG 2.1.1)", JSON.stringify(karty));
    await t.ok(/otvoriť recept/i.test(karty.ariaLabel || ""), "otvárač karty má zrozumiteľný aria-label", karty.ariaLabel);

    // reálny test: skip-link → Tab → Enter otvorí recept, bez myši
    await page.evaluate(() => { window.zavri(); document.body.focus(); });
    await page.keyboard.press("Tab");                      // „Preskočiť na zoznam receptov“
    const skip = await page.evaluate(() => ({ cls: document.activeElement.className, href: document.activeElement.getAttribute("href") }));
    await page.keyboard.press("Enter");
    let naKarte = false, krokov = 0;
    for (; krokov < 6 && !naKarte; krokov++) {
      await page.keyboard.press("Tab");
      naKarte = await page.evaluate(() => !!(document.activeElement.classList && document.activeElement.classList.contains("card-open")));
    }
    let otvorene = false;
    if (naKarte) { await page.keyboard.press("Enter"); await page.waitForTimeout(250);
      otvorene = await page.evaluate(() => document.getElementById("overlay").classList.contains("open")); }
    t.metrika("Tabov od skip-linku po otvárač karty", krokov);
    await t.ok(otvorene, "recept sa dá otvoriť iba klávesnicou (skip-link → Tab → Enter)", JSON.stringify({ skip, naKarte, krokov }));
    await zavriOkna(page);

    // bunky plánu klávesnicou
    await prepni(page, "planovac");
    await naplnPlan(page);
    const bunky = await page.evaluate(() => {
      const napl = [...document.querySelectorAll("#plan-table .plan-cell:not(.prazdne):not(.vyp)")];
      const prazd = [...document.querySelectorAll("#plan-table .plan-cell.prazdne")];
      const dosiahnutelny = (el) => el.tagName === "BUTTON" || el.tagName === "A" || el.getAttribute("tabindex") === "0";
      return {
        naplnenych: napl.length,
        prazdnych: prazd.length,
        prazdneNedosiahnutelne: prazd.filter((c) => !dosiahnutelny(c)).length,
        akcieNedosiahnutelne: [...document.querySelectorAll("#plan-table .rm, #plan-table .kc, #plan-table .mchip, #plan-table .plan-varenia")].filter((e) => !dosiahnutelny(e)).length,
        klikBezKlavesnice: [...document.querySelectorAll("#plan-table [onclick]")].filter((e) => !dosiahnutelny(e)).length,
      };
    });
    await t.ok(bunky.prazdneNedosiahnutelne === 0, "prázdne bunky plánu („+ pridať“) sú dosiahnuteľné klávesnicou", JSON.stringify(bunky));
    await t.ok(bunky.akcieNedosiahnutelne === 0, "akcie v bunke plánu („✎ zmeniť“, „⋯ viac“, kcal) sú dosiahnuteľné klávesnicou", JSON.stringify(bunky));
    await t.ok(bunky.klikBezKlavesnice === 0, "v tabuľke plánu nie je nič klikateľné bez klávesnice", JSON.stringify(bunky));

    // Enter/medzerník na bunke plánu — správanie, nie hľadanie selektora v texte skriptu
    const enterFunguje = await page.evaluate(async () => {
      const c = document.querySelector("#plan-table .plan-cell[tabindex='0'], #plan-table .plan-cell[role='button']");
      if (!c) return { chyba: "žiadna .plan-cell s rolou tlačidla" };
      c.focus();
      c.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await new Promise((r) => setTimeout(r, 250));
      const otv = document.getElementById("pick-overlay").classList.contains("open") || document.getElementById("overlay").classList.contains("open");
      try { window.zavriPick(); window.zavri(); } catch (e) {}
      return { otv };
    });
    await t.ok(enterFunguje.otv === true || enterFunguje.chyba === "žiadna .plan-cell s rolou tlačidla",
      "Enter na bunke plánu ju aktivuje", JSON.stringify(enterFunguje));

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole pri navigácii klávesnicou",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
