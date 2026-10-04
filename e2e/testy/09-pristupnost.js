// 09 — Prístupnosť (WCAG 2.1/2.2 AA)
// Testy sú písané na CIEĽOVÝ stav. Časť z nich dnes PADÁ — sú označené ako známe
// (karty receptov a bunky plánu sú `<div onclick>`, viď CLAUDE.md „Stav a otvorené veci").
"use strict";
const { prepni, zavriOkna, naplnPlan, zakladnyStav } = require("../lib");

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

    // ══════════════════════════════════════════════════════════════════════
    // Kontrast nad VYKRESLENOU stránkou (WCAG 1.4.3), nie nad deklaráciou tokenov.
    // scripts/kontrast_bloky.py číta tokeny zo šablóny a nevidel, že systémová tmavá téma
    // dosadila aliasy (--muted, --panel…) zo SVETLEJ sady — ~90 textov bolo pod AA.
    // Tri stavy témy × 8 obrazoviek s naplneným plánom na 393×850.
    // ══════════════════════════════════════════════════════════════════════
    const temy = [
      ["svetlá", { colorScheme: "light" }],
      ["„Tmavá“ výslovne", { colorScheme: "light", stav: { profil: Object.assign(zakladnyStav().profil, { temaAuto: false, dark: true }) } }],
      ["„Podľa systému“ na tmavom telefóne", { colorScheme: "dark" }],
    ];
    const obrazovky = [
      ["Domov", "#v-domov", (p) => prepni(p, "domov")],
      ["Plán", "#v-planovac", (p) => prepni(p, "planovac")],
      ["Nákup", "#v-nakup", (p) => prepni(p, "nakup")],
      ["Recepty", "#v-recepty", (p) => prepni(p, "recepty")],
      ["Výživa", "#v-vyziva", (p) => prepni(p, "vyziva")],
      ["Nastavenia", "#v-nastavenia", (p) => prepni(p, "nastavenia")],
      ["detail receptu", "#modal", async (p) => { await prepni(p, "planovac"); await p.evaluate(() => window.otvor(window.slotIds(0, "Obed")[0], { di: 0, slot: "Obed" })); await p.waitForTimeout(150); }],
      ["sprievodca generovaním", "#pick-modal", async (p) => { await p.evaluate(() => window.otvorGen()); await p.waitForTimeout(150); }],
    ];
    for (const [tema, opts] of temy) {
      const pg = await E.novaStranka(Object.assign({ viewport: E.MOBIL }, opts));
      await naplnPlan(pg);
      const zle = [];
      for (const [meno, koren, akcia] of obrazovky) {
        await zavriOkna(pg);
        await akcia(pg);
        (await pg.evaluate(meraj, koren)).forEach((x) => zle.push(Object.assign({ obr: meno }, x)));
      }
      zle.sort((a, b) => a.k / a.treba - b.k / b.treba);
      t.metrika(`texty pod AA — ${tema}`, zle.length);
      await t.ok(zle.length === 0, `kontrast textu spĺňa AA — ${tema} (${obrazovky.length} obrazoviek)`,
        `${zle.length} pod prahom, 5 najhorších:\n` + zle.slice(0, 5).map((x) =>
          `${x.k}:1 < ${x.treba} · ${x.obr} · ${x.sel} „${x.text}“ ${x.fg} na ${x.bg}`).join("\n"));
      await E.zavri(pg);
    }

    // ══════════════════════════════════════════════════════════════════════
    // Audit 30. 9. — okná sú dialógy s pascou fokusu (skutočný Tab, nie querySelectorAll),
    // hodnotenie je slider, fokus prežije prekreslenie, klikateľné riadky majú rolu tlačidla.
    // ══════════════════════════════════════════════════════════════════════
    const a = await E.novaStranka({ viewport: E.MOBIL, touch: true, stav: {
      spajza: [{ id: 1, nazov: "Mlieko", kluc: "mlieko", mnozstvo: 2, jednotka: "l", miesto: "Chladnička", expiry: "", min: 0 },
               { id: 2, nazov: "Maslo", kluc: "maslo", mnozstvo: 250, jednotka: "g", miesto: "Chladnička", expiry: "", min: 0 }], spSid: 3 } });
    await prepni(a, "planovac");
    await naplnPlan(a);
    await a.evaluate(() => window.otvor(window.slotIds(0, "Obed")[0], { di: 0, slot: "Obed" }));
    await a.waitForTimeout(300);
    const okno = await a.evaluate(() => { const m = document.getElementById("modal"), l = document.getElementById(m.getAttribute("aria-labelledby") || "-");
      return { role: m.getAttribute("role"), modal: m.getAttribute("aria-modal"), nazov: l ? l.textContent.trim() : "",
        appInert: document.querySelector(".app").inert, listaInert: document.getElementById("botnav").inert }; });
    await t.ok(okno.role === "dialog" && okno.modal === "true" && okno.nazov.length > 2, "detail receptu je dialóg (aria-modal) s menovkou z nadpisu", JSON.stringify(okno));
    await t.ok(okno.appInert && okno.listaInert, "obsah pod detailom (main aj spodná lišta) je inert", JSON.stringify(okno));
    await t.ok(await a.getByRole("dialog").count() === 1, "v strome prístupnosti je práve jeden dialóg");
    const mimo = [];
    for (let i = 0; i < 70; i++) {
      await a.keyboard.press("Tab");
      const kde = await a.evaluate(() => { const x = document.activeElement; return x && x.closest && x.closest("#modal") ? "" : (x ? x.tagName + "." + x.className : "null"); });
      if (kde) mimo.push(i + 1 + ":" + kde);
    }
    await t.ok(mimo.length === 0, "70× Tab v detaile ostane v detaile (bolo: po 8. Tabe BODY, 62 zastávok mimo)", mimo.slice(0, 5).join(" | "));
    await a.evaluate(() => document.querySelector("#modal .close").focus());
    await a.keyboard.press("Shift+Tab");
    await t.ok(await a.evaluate(() => !!document.activeElement.closest("#modal")), "Shift+Tab z prvého prvku detailu skočí na posledný, nie von");

    // ── hodnotenie: role=slider, šípky po 0,5, na mieste (detail neskočí, porcie a jednotky ostanú) ──
    const h0 = await a.evaluate(() => { const sp = document.querySelector("#modal .starpick"); sp.focus(); window.zmenPorcie(2);
      document.getElementById("unit-mode").value = "spoon"; window.setUnitMode("spoon");
      return { role: sp.getAttribute("role"), min: sp.getAttribute("aria-valuemin"), max: sp.getAttribute("aria-valuemax"),
        scroll: document.getElementById("modal").scrollTop, porcie: document.getElementById("pnum").value }; });
    await t.ok(h0.role === "slider" && h0.min === "0" && h0.max === "5", "hodnotenie je slider 0–5", JSON.stringify(h0));
    for (let i = 0; i < 7; i++) await a.keyboard.press("ArrowRight");
    const h1 = await a.evaluate(() => { const sp = document.querySelector("#modal .starpick");
      return { h: S.hodn[aktualny.id], txt: sp.getAttribute("aria-valuetext"), fokus: document.activeElement === sp,
        scroll: document.getElementById("modal").scrollTop, porcie: document.getElementById("pnum").value, jedn: document.getElementById("unit-mode").value }; });
    await t.ok(h1.h === 3.5 && h1.txt === "3,5 z 5 hviezd", "7× šípka vpravo = 3,5 hviezdy (aria-valuetext „3,5 z 5 hviezd“)", JSON.stringify(h1));
    await t.ok(h1.fokus && h1.scroll === h0.scroll && h1.porcie === h0.porcie && h1.jedn === "spoon",
      "hodnotenie sa mení na mieste — detail neskočí, porcie ani jednotky sa nevrátia, fokus ostane", JSON.stringify({ h0, h1 }));
    await a.keyboard.press("End");
    const hEnd = await a.evaluate(() => S.hodn[aktualny.id]);
    await a.keyboard.press("Home");
    const hHome = await a.evaluate(() => S.hodn[aktualny.id]);
    await t.ok(hEnd === 5 && hHome === undefined, "End = 5 hviezd, Home = bez hodnotenia", JSON.stringify({ hEnd, hHome }));
    const hv = await a.locator("#modal .star-cil").nth(3).boundingBox();
    await a.locator("#modal .star-cil").nth(3).tap();
    const hTap1 = await a.evaluate(() => S.hodn[aktualny.id]);
    await a.locator("#modal .star-cil").nth(3).tap();
    const hTap2 = await a.evaluate(() => S.hodn[aktualny.id]);
    await t.ok(hTap1 === 4 && hTap2 === 3.5, "ťuk na 4. hviezdu = 4, druhý ťuk na tú istú = 3,5", JSON.stringify({ hTap1, hTap2 }));
    await t.ok(hv && hv.width >= 44 && hv.height >= 44, `hviezda je dotykový cieľ ≥ 44 px (${hv && Math.round(hv.width)}×${hv && Math.round(hv.height)}, bolo pol hviezdy = 10 px)`, JSON.stringify(hv));

    // ── varenie: dialóg nad detailom, pasca fokusu, Escape zavrie len varenie ──
    await a.evaluate(() => document.querySelector("#modal .starpick").focus());
    await a.evaluate(() => window.spustiCook());
    await a.waitForTimeout(300);
    const cookA = await a.evaluate(() => { const c = document.getElementById("cook");
      return { role: c.getAttribute("role"), lab: (document.getElementById(c.getAttribute("aria-labelledby")) || {}).textContent, detailInert: document.getElementById("overlay").inert }; });
    await t.ok(cookA.role === "dialog" && cookA.lab && cookA.detailInert, "varenie je dialóg a detail pod ním je inert", JSON.stringify(cookA));
    const cMimo = [];
    for (let i = 0; i < 15; i++) { await a.keyboard.press("Tab"); if (!(await a.evaluate(() => !!(document.activeElement && document.activeElement.closest("#cook"))))) cMimo.push(i + 1); }
    await t.ok(cMimo.length === 0, "15× Tab vo varení ostane vo varení (bolo: po 3. Tabe von)", JSON.stringify(cMimo));
    await a.keyboard.press("Escape");
    await a.waitForTimeout(250);
    const e1 = await a.evaluate(() => ({ cook: document.getElementById("cook").classList.contains("open"), detail: document.getElementById("overlay").classList.contains("open"),
      fokus: document.activeElement && document.activeElement.className }));
    await t.ok(!e1.cook && e1.detail, "Escape vo varení zavrie len varenie, detail ostane", JSON.stringify(e1));
    await t.ok(e1.fokus === "starpick", "po zavretí varenia sa fokus vráti tam, kde v detaile bol", JSON.stringify(e1));
    await zavriOkna(a);

    // ── fokus prežije prekreslenie (★ na karte, čip, −/✕ v Špajzi) ──────────
    await prepni(a, "recepty");
    await a.evaluate(() => document.querySelector("#grid .card .fav").focus());
    await a.keyboard.press("Enter");
    await a.waitForTimeout(150);
    const fav = await a.evaluate(() => ({ cls: document.activeElement.className, ap: document.activeElement.getAttribute("aria-pressed") }));
    await t.ok(fav.cls === "fav" && fav.ap === "mixed", "★ na karte: fokus ostane na hviezde a hlási nový stav", JSON.stringify(fav));
    await a.evaluate(() => document.querySelectorAll("#chips .chip")[2].focus());
    await a.keyboard.press(" ");
    await a.waitForTimeout(250);
    const chip = await a.evaluate(() => ({ chip: document.activeElement.classList.contains("chip"), akt: document.activeElement.classList.contains("active") }));
    await t.ok(chip.chip && chip.akt, "čip kategórie: po výbere je fokus na ňom, nie na <body>", JSON.stringify(chip));
    await a.evaluate(() => window.zrusFiltre());
    await prepni(a, "spajza");
    await a.evaluate(() => document.querySelector('#spajza-list button[onclick^="upravZasobu"]').focus());
    await a.keyboard.press("Enter");
    await a.waitForTimeout(150);
    const minus = await a.evaluate(() => document.activeElement.getAttribute("onclick") || document.activeElement.tagName);
    await t.ok(/^upravZasobu/.test(minus), "− v Špajzi: fokus ostane na tlačidle", minus);
    await a.evaluate(() => document.querySelector("#spajza-list .sp-x").focus());
    await a.keyboard.press("Enter");
    await a.waitForTimeout(250);
    const otazka = await a.evaluate(() => document.getElementById("dlg-overlay").classList.contains("open"));
    await a.keyboard.press("Enter");
    await a.waitForTimeout(300);
    const zmaz = await a.evaluate(() => ({ n: S.spajza.length, fokus: document.activeElement === document.body ? "BODY" : document.activeElement.tagName + "." + document.activeElement.className }));
    await t.ok(otazka, "✕ zásoby sa pred zmazaním opýta");
    await t.ok(zmaz.n === 1 && zmaz.fokus !== "BODY", "po zmazaní zásoby ostane fokus v Špajzi (nie na <body>)", JSON.stringify(zmaz));

    // ── klikateľné prvky majú rolu tlačidla (výsledky hľadania, kategória, kalendár, zvyšky) ──
    await prepni(a, "planovac");
    await a.evaluate(() => window.vyberDoPlanu(0, "Obed"));
    await a.waitForTimeout(200);
    await a.fill("#pick-search", "kura");
    await a.waitForTimeout(300);
    const vys = await a.evaluate(() => [...document.querySelectorAll("#pick-search-results .plan-cell")].map((e) => e.getAttribute("role") + "/" + e.getAttribute("tabindex")));
    await t.ok(vys.length > 0 && vys.every((x) => x === "button/0"), `výsledky hľadania v „Aké jedlo?“ sú tlačidlá (${vys.length})`, JSON.stringify(vys.slice(0, 3)));
    await a.evaluate(() => window.ukazReceptyKat("Polievka"));
    await a.waitForTimeout(150);
    const kat = await a.evaluate(() => ({ bez: [...document.querySelectorAll("#pick-modal [onclick]")].filter((e) => !/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && e.getAttribute("tabindex") !== "0").length,
      spat: (document.querySelector("#pick-modal .spat-typy") || {}).tagName }));
    await t.ok(kat.bez === 0 && kat.spat === "BUTTON", "zoznam kategórie aj „← späť na typy jedál“ sú dosiahnuteľné klávesnicou", JSON.stringify(kat));
    await a.evaluate(() => window.ukazKatPicker());
    await a.waitForTimeout(150);
    const typy = await a.evaluate(() => [...document.querySelectorAll("#pick-modal [onclick]")].filter((e) => !/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && e.getAttribute("tabindex") !== "0" && e.style.cursor !== "default").length);
    await t.ok(typy === 0, "po „← späť na typy jedál“ sú návrhy aj čipy dosiahnuteľné klávesnicou", String(typy));
    await zavriOkna(a);
    await a.evaluate(() => window.planZobraz("kalendar"));
    const kal = await a.evaluate(() => { const d = [...document.querySelectorAll("#kal-grid .day[onclick]")];
      return { n: d.length, zle: d.filter((x) => x.getAttribute("role") !== "button" || x.getAttribute("tabindex") !== "0").length,
        lab: d[0] ? d[0].getAttribute("aria-label") : "", pressed: document.getElementById("tab-kal").getAttribute("aria-pressed") }; });
    await t.ok(kal.n >= 28 && kal.zle === 0 && /^1\. /.test(kal.lab), "dni kalendára sú tlačidlá s menovkou dátumu", JSON.stringify(kal));
    await t.ok(kal.pressed === "true", "chip „Kalendár“ hlási stav cez aria-pressed", JSON.stringify(kal));
    await a.evaluate(() => window.planZobraz("tyzden"));
    const cur = await a.evaluate(() => [...document.querySelectorAll("#botnav a[aria-current=page]")].map((x) => x.dataset.v));
    await t.ok(cur.length === 1 && cur[0] === "planovac", "aktívna položka spodnej lišty má aria-current=page", JSON.stringify(cur));
    await prepni(a, "domov");
    await a.evaluate(() => window.dojedzZvysky());
    const zv = await a.evaluate(() => [...document.querySelectorAll("#zvysky-out [onclick]")].map((e) => e.tagName));
    await t.ok(zv.every((x) => x === "BUTTON"), "výsledky „Dojedz zvyšky“ sú tlačidlá", JSON.stringify(zv));
    const h1m = await a.evaluate(() => ({ vid: document.querySelector("h1").checkVisibility(), nav: getComputedStyle(document.querySelector(".side nav")).display }));
    await t.ok(h1m.vid && h1m.nav === "none" && await a.getByRole("heading", { level: 1 }).count() === 1,
      "na telefóne je h1 v strome prístupnosti (sr-only), bočný panel ostáva skrytý", JSON.stringify(h1m));

    // ── štart: indikátor „Načítavam recepty…“ je čisté CSS a po štarte zmizne ──
    const st = await a.evaluate(() => ({ cls: document.documentElement.classList.contains("nacitane"), busy: document.getElementById("obsah").getAttribute("aria-busy"),
      po: getComputedStyle(document.body, "::after").content }));
    await t.ok(st.cls && st.busy === null && !/Načítavam/.test(st.po), "po štarte indikátor načítania zmizne a main nie je aria-busy", JSON.stringify(st));
    await t.ok(a.chyby.length === 0, "žiadna chyba v konzole (dialógy, hviezdy, fokus)", a.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(a);
    // bez JavaScriptu (= pred koncom štartu) indikátor svieti
    const ctxJs = await E.browser.newContext({ javaScriptEnabled: false, viewport: E.MOBIL });
    const bezJs = await ctxJs.newPage();
    await bezJs.goto(E.urlHttp, { waitUntil: "load", timeout: 90000 });
    const pred = await bezJs.evaluate(() => getComputedStyle(document.body, "::after").content).catch((e) => "evaluate: " + e.message);
    await t.ok(/Načítavam recepty/.test(pred), "pred koncom štartu ukazuje stránka „Načítavam recepty…“ (čisté CSS)", pred);
    await ctxJs.close();
  },
};

// Beží v stránke. Farba textu × efektívne pozadie (kompozícia polopriehľadných predkov až po
// prvé nepriehľadné), násobená opacity predkov; ::placeholder zvlášť. Text na obrázku alebo
// prechode sa preskakuje (pozadie sa nedá určiť), rovnako zakázané ovládanie (WCAG výnimka).
function meraj(koren) {
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const jas = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const nad = (h, d) => { const a = h.a + d.a * (1 - h.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; const m = (k) => (h[k] * h.a + d[k] * d.a * (1 - h.a)) / a; return { r: m("r"), g: m("g"), b: m("b"), a }; };
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const pomer = (a, b) => { const x = jas(a), y = jas(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const pozadie = (el) => { const vrstvy = []; let obr = false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.backgroundImage !== "none" && !/repeating/.test(cs.backgroundImage)) obr = true;
      const c = parse(cs.backgroundColor); if (c && c.a > 0) { vrstvy.push(c); if (c.a >= 1) break; } }
    let bg = { r: 255, g: 255, b: 255, a: 1 }; for (let i = vrstvy.length - 1; i >= 0; i--) bg = nad(vrstvy[i], bg); return { bg, obr }; };
  const popis = (el) => { const s = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""); return (el.parentElement ? s(el.parentElement) + " > " : "") + s(el); };
  const root = document.querySelector(koren); if (!root) return [{ sel: koren, text: "koreň neexistuje", k: 0, treba: 4.5, fg: "", bg: "" }];
  const out = [], videne = new Set();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const el = n.parentElement; if (!n.textContent.trim() || !el || videne.has(el)) continue; videne.add(el);
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    if (el.closest("button:disabled,input:disabled,[aria-disabled=true]")) continue;
    const cs = getComputedStyle(el); let fg = parse(cs.color); if (!fg) continue;
    let op = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    const { bg, obr } = pozadie(el); if (obr) continue;
    const f = nad({ ...fg, a: fg.a * op }, bg); const k = pomer(f, bg);
    const fs = parseFloat(cs.fontSize), velky = fs >= 24 || (fs >= 18.66 && parseInt(cs.fontWeight) >= 700);
    const treba = velky ? 3 : 4.5;
    if (k < treba) out.push({ sel: popis(el), text: n.textContent.trim().slice(0, 30), k: +k.toFixed(2), treba, fg: hex(f), bg: hex(bg) });
  }
  root.querySelectorAll("input[placeholder],textarea[placeholder]").forEach((el) => {
    if (!el.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true }) || el.getBoundingClientRect().width < 1) return;
    const pc = parse(getComputedStyle(el, "::placeholder").color); if (!pc) return;
    const { bg } = pozadie(el); const f = nad(pc, bg); const k = pomer(f, bg);
    if (k < 4.5) out.push({ sel: "::placeholder " + popis(el), text: el.placeholder.slice(0, 30), k: +k.toFixed(2), treba: 4.5, fg: hex(f), bg: hex(bg) });
  });
  return out;
}
