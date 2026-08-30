// 08 — Mobil 393×850 (Nothing Phone 3a Pro) + 360×640 + 1440×900
"use strict";
const { prepni, zavriOkna, naplnPlan } = require("../lib");

const VIEWS = ["domov", "recepty", "planovac", "nakup", "vyziva", "spajza", "nastavenia"];

// Vodorovný pretok: dokument nesmie byť širší ako viewport (viac ako 1 px tolerancie).
async function pretok(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const zle = [];
    document.querySelectorAll("body *").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.right > w + 2) {
        // vlastný vodorovný scroll (chipy, tabuľka plánu) je zámer, nie pretok stránky
        let p = el, scrolluje = false;
        while (p && p !== document.body) { const c = getComputedStyle(p); if (/(auto|scroll)/.test(c.overflowX)) { scrolluje = true; break; } p = p.parentElement; }
        if (!scrolluje) zle.push({ tag: el.tagName.toLowerCase(), tr: String(el.className).slice(0, 30), id: el.id, right: Math.round(r.right) });
      }
    });
    return { docW: document.documentElement.scrollWidth, viewW: w, zle: zle.slice(0, 8) };
  });
}

// Dotykové ciele (WCAG 2.5.8). Meriame EFEKTÍVNY cieľ, nie iba samotný uzol:
//  · checkbox v <label>, ktorý sa dá ťuknúť kdekoľvek → cieľ je celý <label>;
//    ak label prekrýva vlastný onclick s preventDefault (nákup), cieľom ostáva samotný checkbox;
//  · odkaz vnútri vety (inline výnimka 2.5.8) sa počíta zvlášť ako informácia, nie ako zlyhanie;
//  · hustá mriežka plánu je zdokumentovaná výnimka z 44 px, ale nie z 24 px.
async function ciele(page) {
  return page.evaluate(() => {
    const SEL = "button, a[onclick], a[href], input:not([type=hidden]), select, textarea, summary, [role=button], .chip, .kol-tile, .rm, .mchip, .hranica, .sur-klik";
    const male = [], velmiMale = [], inline = [];
    const videne = new Set();
    document.querySelectorAll(SEL).forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
      let r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.bottom < 0 || r.top > innerHeight * 6) return;

      // efektívny cieľ pre checkbox/radio v labeli
      let cielEl = el;
      if (el.tagName === "INPUT" && /checkbox|radio/.test(el.type)) {
        const lab = el.closest("label");
        if (lab) {
          let blokuje = false, p = el.parentElement;
          while (p && p !== lab.parentElement) { const oc = p.getAttribute && p.getAttribute("onclick"); if (oc && /preventDefault/.test(oc)) { blokuje = true; break; } p = p.parentElement; }
          if (!blokuje) { cielEl = lab; r = lab.getBoundingClientRect(); }
        }
      }
      if (videne.has(cielEl)) return;
      videne.add(cielEl);

      const vPlane = !!el.closest("#plan-table, .plan-cell, .plan-den-nav");
      const zaznam = {
        tag: el.tagName.toLowerCase(), tr: String(el.className || "").slice(0, 26),
        text: (el.textContent || el.value || "").trim().slice(0, 30),
        w: Math.round(r.width), h: Math.round(r.height), vPlane,
      };
      // inline výnimka: cieľ je v texte vety (rodič má výrazne viac textu a cieľ je inline)
      const rodic = el.parentElement;
      const jeInline = /^inline/.test(getComputedStyle(el).display) && rodic &&
        (rodic.textContent || "").trim().length > (el.textContent || "").trim().length + 3;
      const min = Math.min(r.width, r.height);
      if (jeInline && min < 24) { inline.push(zaznam); return; }
      if (min < 24) velmiMale.push(zaznam);
      else if (min < 44 && !vPlane) male.push(zaznam);
    });
    return { male, velmiMale, inline };
  });
}

module.exports = {
  nazov: "Mobil a responzivita",
  async spusti(E, t) {
    // ── 393×850: hlavné zariadenie ──────────────────────────────────────────
    const m = await E.novaStranka({ viewport: E.MOBIL, touch: true });

    // breakpoint: bočná navigácia preč, spodná lišta von
    const nav = await m.evaluate(() => ({
      side: getComputedStyle(document.querySelector(".side nav")).display,
      botnav: getComputedStyle(document.getElementById("botnav")).display,
      botPos: getComputedStyle(document.getElementById("botnav")).position,
      polozky: [...document.querySelectorAll("#botnav a")].map((a) => a.textContent.trim()),
    }));
    await t.ok(nav.side === "none", "na mobile je bočná navigácia skrytá", JSON.stringify(nav));
    await t.ok(nav.botnav === "flex" && nav.botPos === "fixed", "spodná lišta je fixne dole", JSON.stringify(nav));
    await t.ok(nav.polozky.length === 5 && /Viac/.test(nav.polozky[4]), "spodná lišta má 4 pohľady + „⋯ Viac“", JSON.stringify(nav.polozky));

    // „⋯ Viac“ otvorí panel s ostatnými pohľadmi
    await m.locator("#botnav a", { hasText: "Viac" }).click();
    await m.waitForTimeout(250);
    const viac = await m.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      polozky: [...document.querySelectorAll("#pick-modal .plan-cell .nm")].map((x) => x.textContent.trim()),
    }));
    await t.ok(viac.otvorene, "„⋯ Viac“ na spodnej lište otvorí panel");
    await t.ok(viac.polozky.length === 3, `panel „Viac“ obsahuje Výživa/Špajza/Nastavenia (${viac.polozky.join(", ")})`, JSON.stringify(viac));
    await m.locator("#pick-modal .plan-cell", { hasText: "Špajza" }).click();
    await m.waitForTimeout(250);
    await t.ok(await m.evaluate(() => document.getElementById("v-spajza").classList.contains("active")),
      "položka z panela „Viac“ prepne pohľad");
    await zavriOkna(m);

    // ── <details class="panel mob-zbal"> je pri štarte zbalený ──────────────
    const det = await m.evaluate(() => ({
      mobZbal: [...document.querySelectorAll("details.panel.mob-zbal")].map((d) => ({ t: (d.querySelector("summary") || {}).textContent, open: d.open })),
      otvorenych: document.querySelectorAll("details.panel.mob-zbal[open]").length,
      poliaVDom: document.querySelectorAll("details.panel input, details.panel select").length,
    }));
    await t.ok(det.mobZbal.length > 0, `na stránke sú sekundárne panely mob-zbal (${det.mobZbal.length})`);
    await t.ok(det.otvorenych === 0, "na mobile sú všetky mob-zbal panely pri štarte zbalené", JSON.stringify(det.mobZbal));
    await t.ok(det.poliaVDom > 0, "polia zbalených panelov zostávajú v DOM (ulozProfil ich vidí)", det.poliaVDom);

    // ── filtre v Receptoch sa odomknú cez prepniFiltre() ───────────────────
    await prepni(m, "recepty");
    const pred = await m.evaluate(() => ({
      fbody: getComputedStyle(document.getElementById("f-body")).display,
      aria: document.getElementById("f-toggle").getAttribute("aria-expanded"),
      toggleVidno: getComputedStyle(document.getElementById("f-toggle")).display !== "none",
    }));
    await t.ok(pred.fbody === "none", "na mobile sú selecty filtrov zbalené", JSON.stringify(pred));
    await t.ok(pred.toggleVidno && pred.aria === "false", "tlačidlo „⚙ Filtre a radenie“ je viditeľné a hlási zbalený stav", JSON.stringify(pred));
    await m.click("#f-toggle");
    await m.waitForTimeout(200);
    const po = await m.evaluate(() => ({
      fbody: getComputedStyle(document.getElementById("f-body")).display,
      aria: document.getElementById("f-toggle").getAttribute("aria-expanded"),
      trieda: document.getElementById("rec-controls").className,
      selektov: [...document.querySelectorAll("#f-body select")].filter((s) => getComputedStyle(s).display !== "none").length,
    }));
    await t.ok(po.fbody !== "none" && /f-open/.test(po.trieda), "prepniFiltre() odomkne filtre", JSON.stringify(po));
    await t.ok(po.aria === "true", "aria-expanded sa aktualizuje", JSON.stringify(po));
    await t.ok(po.selektov === 4, `všetky 4 selecty sú po odomknutí viditeľné (${po.selektov})`, JSON.stringify(po));
    // #f-cnt musí byť viditeľné aj so zbalenými filtrami
    await m.selectOption("#f-cas", "20");
    await m.evaluate(() => window.renderGrid());
    await m.click("#f-toggle");
    await m.waitForTimeout(150);
    const cnt = await m.evaluate(() => {
      const e = document.getElementById("f-cnt"); const r = e.getBoundingClientRect();
      return { hidden: e.hidden, text: e.textContent, vidno: r.width > 0 && r.height > 0 };
    });
    await t.ok(!cnt.hidden && cnt.vidno && cnt.text === "1",
      "so zbalenými filtrami je vidno počet aktívnych filtrov", JSON.stringify(cnt));
    await m.evaluate(() => window.zrusFiltre());

    // ── plán s dátami (prázdny plán skryje polovicu ovládania) ─────────────
    await prepni(m, "planovac");
    await naplnPlan(m);
    await m.waitForTimeout(200);
    const planM = await m.evaluate(() => {
      const tb = document.getElementById("plan-table");
      const bunka = document.querySelector("#plan-table .plan-cell:not(.prazdne):not(.vyp)");
      return {
        layout: getComputedStyle(tb).tableLayout,
        hlavickaDni: getComputedStyle(document.querySelector("#plan-table tr.dni-hlavicka")).display,
        denNav: document.querySelectorAll("#plan-den-nav .chip").length,
        bunkaW: (() => { const b = [...document.querySelectorAll("#plan-table .plan-cell:not(.prazdne):not(.vyp)")].find((x) => x.getBoundingClientRect().width > 0); return b ? Math.round(b.getBoundingClientRect().width) : 0; })(),
        slotW: Math.round(document.querySelector("#plan-table td.slotname").getBoundingClientRect().width),
        akcii: bunka ? bunka.querySelectorAll(".rm").length : 0,
      };
    });
    await t.ok(planM.layout === "auto", "na mobile má tabuľka plánu table-layout:auto (jeden viditeľný deň)", planM.layout);
    await t.ok(planM.hlavickaDni === "none", "riadok s názvami dní je na mobile skrytý (deň hovorí den-nav)", planM.hlavickaDni);
    await t.ok(planM.denNav >= 7, `navigácia dní má 7 dní (${planM.denNav})`, planM.denNav);
    await t.ok(planM.bunkaW > 150, `bunka s jedlom je použiteľne široká (${planM.bunkaW} px, kedysi 16 px)`, JSON.stringify(planM));
    await t.ok(planM.slotW <= 100, `stĺpec s názvom slotu nezaberá obrazovku (${planM.slotW} px, kedysi 313 px)`, JSON.stringify(planM));
    await t.ok(planM.akcii === 2, "bunka plánu má na mobile 2 akcie", planM.akcii);

    // ── vodorovný pretok vo všetkých pohľadoch ─────────────────────────────
    for (const v of VIEWS) {
      await prepni(m, v);
      await m.waitForTimeout(150);
      const p = await pretok(m);
      await t.ok(p.zle.length === 0 && p.docW <= p.viewW + 2,
        `393 px — žiadny vodorovný pretok v pohľade „${v}“`, JSON.stringify(p));
    }
    // aj s otvoreným detailom receptu
    await prepni(m, "recepty");
    await m.evaluate(() => window.otvor(RECEPTY.find((r) => (r.postup || []).length > 3).id));
    await m.waitForTimeout(250);
    const pDetail = await pretok(m);
    await t.ok(pDetail.zle.length === 0, "393 px — žiadny pretok v detaile receptu", JSON.stringify(pDetail));

    // ── dotykové ciele ──────────────────────────────────────────────────────
    const cDetail = await ciele(m);
    await t.ok(cDetail.velmiMale.length === 0, "detail receptu: žiadny dotykový cieľ pod 24 px", JSON.stringify(cDetail.velmiMale.slice(0, 6)));
    await zavriOkna(m);

    let malychSpolu = 0, velmiMalychSpolu = 0, inlineSpolu = 0;
    const detaily = {};
    for (const v of VIEWS) {
      await prepni(m, v);
      await m.waitForTimeout(180);
      const c = await ciele(m);
      malychSpolu += c.male.length;
      velmiMalychSpolu += c.velmiMale.length;
      inlineSpolu += c.inline.length;
      detaily[v] = { pod44: c.male.length, pod24: c.velmiMale.length, inline: c.inline.length, ukazky: c.velmiMale.slice(0, 4) };
      await t.ok(c.velmiMale.length === 0, `393 px — žiadny dotykový cieľ pod 24 px v „${v}“`, JSON.stringify(c.velmiMale.slice(0, 6)));
    }
    t.metrika("dotykových cieľov pod 44 px (393 px, mimo mriežky plánu)", malychSpolu);
    t.metrika("dotykových cieľov pod 24 px (393 px)", velmiMalychSpolu);
    t.metrika("odkazov vo vete pod 24 px (inline výnimka 2.5.8)", inlineSpolu);
    // Nastavenia sú podľa PRODUCT.md úloha pre počítač; tvrdý limit držíme na obrazovkách,
    // ktoré sa reálne obsluhujú jednou rukou v obchode a pri sporáku.
    const primarne = ["domov", "recepty", "planovac", "nakup"];
    const malychPrim = primarne.reduce((a, v) => a + detaily[v].pod44, 0);
    t.metrika("cieľov 24–44 px na telefónnych obrazovkách", malychPrim);
    await t.ok(malychPrim <= 12, `na telefónnych obrazovkách je málo cieľov pod 44 px (${malychPrim})`,
      JSON.stringify(primarne.map((v) => v + ":" + detaily[v].pod44).join(" ")));

    // ── nákup v obchode: odškrtnutie jednou rukou ──────────────────────────
    await prepni(m, "nakup");
    await m.waitForTimeout(250);
    const rc = await m.evaluate(() => {
      const lab = document.querySelector("#nakup-list .odd label");
      const inp = lab.querySelector("input[type=checkbox]");
      const nm = lab.querySelector(".sur-klik");
      const R = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height) }; };
      return { label: R(lab), input: R(inp), nm: R(nm) };
    });
    const predKlik = await m.evaluate(() => Object.keys(S.nakupCheck).length);
    await m.mouse.click(rc.nm.x + rc.nm.w / 2, rc.nm.y + rc.nm.h / 2);
    await m.waitForTimeout(400);
    const poKlik = await m.evaluate(() => ({ n: Object.keys(S.nakupCheck).length, pick: document.getElementById("pick-overlay").classList.contains("open") }));
    await zavriOkna(m);
    t.metrika("nákup — riadok / odškrtávací cieľ (393 px)", `${rc.label.w}×${rc.label.h} px / ${rc.input.w}×${rc.input.h} px`);
    await t.ok(Math.min(rc.input.w, rc.input.h) >= 24 || poKlik.n > predKlik,
      `položku nákupu sa dá odškrtnúť väčším cieľom než ${rc.input.w}×${rc.input.h} px (riadok má ${rc.label.w}×${rc.label.h} px)`,
      JSON.stringify({ rc, predKlik, poKlik }));

    // ── spodné menu „⋯ Viac“ na obrazovke Plánu je spodný panel ────────────
    await prepni(m, "planovac");
    await m.click("#v-planovac .plan-head .menu-wrap > button");
    await m.waitForTimeout(200);
    const menu = await m.evaluate(() => {
      const el = document.getElementById("m-plan"); const r = el.getBoundingClientRect();
      return { pos: getComputedStyle(el).position, z: +getComputedStyle(el).zIndex, vidno: getComputedStyle(el).display !== "none", top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight, vw: innerWidth };
    });
    await t.ok(menu.vidno && menu.pos === "fixed", "na mobile je „⋯ Viac“ spodný fixný panel, nie dropdown", JSON.stringify(menu));
    await t.ok(menu.left >= 0 && menu.right <= menu.vw, "panel menu sa zmestí do šírky obrazovky", JSON.stringify(menu));
    await t.ok(menu.bottom <= menu.vh, "panel menu nekončí pod spodnou hranou obrazovky", JSON.stringify(menu));
    await t.ok(menu.z > 50, `panel menu je nad spodnou lištou (z-index ${menu.z} > 50)`, JSON.stringify(menu));
    // klik mimo zavrie
    await m.mouse.click(5, 5);
    await m.waitForTimeout(150);
    await t.ok(await m.evaluate(() => !document.getElementById("m-plan").classList.contains("open")), "klik mimo zavrie panel menu");

    // ── vstupné polia ≥16 px (iOS nezoomuje) ───────────────────────────────
    const fonty = await m.evaluate(() => {
      const zle = [];
      document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]), select, textarea").forEach((el) => {
        if (getComputedStyle(el).display === "none") return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 16) zle.push({ id: el.id, tag: el.tagName, fs });
      });
      return zle;
    });
    await t.ok(fonty.length === 0, "všetky vstupné polia majú ≥16 px (iOS nezoomuje)", JSON.stringify(fonty.slice(0, 6)));

    await t.ok(m.chyby.length === 0, "žiadna chyba v konzole na mobile",
      m.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(m);

    // ── 360×640: najužší reálny telefón ────────────────────────────────────
    const s = await E.novaStranka({ viewport: E.MALY, touch: true });
    await prepni(s, "planovac");
    await naplnPlan(s);
    for (const v of VIEWS) {
      await prepni(s, v);
      await s.waitForTimeout(140);
      const p = await pretok(s);
      await t.ok(p.zle.length === 0 && p.docW <= p.viewW + 2, `360 px — žiadny vodorovný pretok v „${v}“`, JSON.stringify(p));
    }
    const c360 = await ciele(s);
    await t.ok(c360.velmiMale.length === 0, "360 px — žiadny dotykový cieľ pod 24 px", JSON.stringify(c360.velmiMale.slice(0, 6)));
    await t.ok(s.chyby.length === 0, "žiadna chyba v konzole na 360 px", s.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(s);

    // ── 1440×900: počítač ───────────────────────────────────────────────────
    const d = await E.novaStranka({ viewport: E.DESKTOP });
    const desk = await d.evaluate(() => ({
      side: getComputedStyle(document.querySelector(".side nav")).display,
      botnav: getComputedStyle(document.getElementById("botnav")).display,
      fbody: getComputedStyle(document.getElementById("f-body")).display,
      mobZbalOtvorenych: document.querySelectorAll("details.panel.mob-zbal[open]").length,
      mobZbalSpolu: document.querySelectorAll("details.panel.mob-zbal").length,
    }));
    await t.ok(desk.side !== "none", "na počítači je bočná navigácia viditeľná", JSON.stringify(desk));
    await t.ok(desk.botnav === "none", "na počítači je spodná lišta skrytá", JSON.stringify(desk));
    await t.ok(desk.fbody !== "none", "na počítači sú filtre rozbalené bez klikania", JSON.stringify(desk));
    await t.ok(desk.mobZbalOtvorenych === desk.mobZbalSpolu, "na počítači zostávajú sekundárne panely otvorené", JSON.stringify(desk));
    await prepni(d, "planovac");
    await naplnPlan(d);
    for (const v of VIEWS) {
      await prepni(d, v);
      await d.waitForTimeout(140);
      const p = await pretok(d);
      await t.ok(p.zle.length === 0, `1440 px — žiadny vodorovný pretok v „${v}“`, JSON.stringify(p));
    }
    // na počítači je „⋯ Viac“ dropdown pri tlačidle
    await prepni(d, "planovac");
    await d.click("#v-planovac .plan-head .menu-wrap > button");
    await d.waitForTimeout(150);
    const dm = await d.evaluate(() => { const el = document.getElementById("m-plan"); return { pos: getComputedStyle(el).position, vidno: getComputedStyle(el).display !== "none" }; });
    await t.ok(dm.vidno && dm.pos === "absolute", "na počítači je „⋯ Viac“ dropdown (absolute)", JSON.stringify(dm));
    await t.ok(d.chyby.length === 0, "žiadna chyba v konzole na počítači", d.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(d);
  },
};
