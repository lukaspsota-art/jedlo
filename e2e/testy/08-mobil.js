// 08 — Mobil 393×850 (Nothing Phone 3a Pro) + 360×640 + 1440×900
"use strict";
const { prepni, zavriOkna, naplnPlan, zakladnyStav } = require("../lib");

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
    // v33: pribudol „🍸 Môj bar“, kolo 6 „🎨 Vzhľad“
    await t.ok(["Výživa","Špajza","Nastavenia"].every(x=>viac.polozky.some(p=>p.includes(x))) && viac.polozky.length === 5 && viac.polozky.some(p=>/Vzhľad/.test(p)), `panel „Viac“ obsahuje Výživa/Špajza/Nastavenia/Môj bar/Vzhľad (${viac.polozky.join(", ")})`, JSON.stringify(viac));
    await m.locator("#pick-modal .plan-cell", { hasText: "Špajza" }).click();
    await m.waitForTimeout(250);
    await t.ok(await m.evaluate(() => document.getElementById("v-spajza").classList.contains("active")),
      "položka z panela „Viac“ prepne pohľad");
    await zavriOkna(m);
    // v31: „⋯ Viac → Nastavenia“ musí fungovať aj keď je v URL hash (po ťuknutí na spodnú lištu).
    // Do v30 oneskorený history.back() zo zavriPick vrátil predošlú obrazovku — Nastavenia bliklo
    // a zmizlo. Kontrola vyššie to nechytila: bežala na čerstvej stránke bez hashu.
    for (const [cil, text] of [["nastavenia", "Nastavenia"], ["vyziva", "Výživa"]]) {
      await prepni(m, "planovac");
      await m.locator("#botnav a", { hasText: "Viac" }).click();
      await m.waitForTimeout(250);
      await m.locator("#pick-modal .plan-cell", { hasText: text }).click();
      await m.waitForTimeout(400);
      const st = await m.evaluate((c) => ({ akt: document.getElementById("v-" + c).classList.contains("active"), hash: location.hash }), cil);
      await t.ok(st.akt && st.hash === "#" + cil, `„⋯ Viac → ${text}“ ostane otvorené aj po prechode z inej obrazovky`, JSON.stringify(st));
      await m.goBack();
      await m.waitForTimeout(300);
      const spat = await m.evaluate(() => document.getElementById("v-planovac").classList.contains("active"));
      await t.ok(spat, `„Späť“ z ${text} vráti na Plán, nie do prázdneho okna`, String(spat));
    }
    await zavriOkna(m);

    // ── <details class="panel mob-zbal"> je pri štarte zbalený ──────────────
    // Výnimka (audit 30. 9.): pri PRÁZDNEJ špajzi je „➕ Pridať zásobu" otvorené — je to jediná akcia
    // obrazovky a zbalené nad „Zatiaľ prázdne" pôsobilo, že sa nedá nič robiť.
    const det = await m.evaluate(() => ({
      mobZbal: [...document.querySelectorAll("details.panel.mob-zbal")].map((d) => ({ t: (d.querySelector("summary") || {}).textContent, open: d.open })),
      otvorenych: [...document.querySelectorAll("details.panel.mob-zbal[open]")].filter((d) => !(d.id === "sp-pridaj" && !S.spajza.length)).length,
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
    // v33: pribudol filter zdrojov #f-zdroj
    await t.ok(po.selektov === 5, `všetkých 5 selectov je po odomknutí viditeľných (${po.selektov})`, JSON.stringify(po));
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
    // v29: na telefóne už Plán nie je tabuľka s preklikávaním dní, ale BLOKOVÝ zoznam.
    // Týždeň má 28 naplnených buniek, ale len 16 rôznych jedál — v bloku je každý slot
    // jeden variant (to je zmysel batch cookingu) a od v29 aj snack. Staré kontroly
    // (table-layout, šírka bunky, šírka stĺpca slotov) merali pohľad, ktorý sa na mobile
    // už nekreslí; tabuľka ostala pre počítač a pre papier, kde je vidieť 7 dní.
    const planM = await m.evaluate(() => {
      const vid = (e) => e && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0;
      const bl = document.getElementById("plan-bloky");
      const karty = [...bl.querySelectorAll(".blok-karta")];
      const bunka = [...bl.querySelectorAll(".plan-cell:not(.prazdne):not(.vyp)")].find((x) => x.getBoundingClientRect().width > 0);
      const znovy = [...bl.querySelectorAll(".bk-znova")];
      return {
        blokyVidno: vid(bl),
        tabulkaSkryta: !vid(document.querySelector(".plan-grid")),
        kariet: karty.length,
        znova: znovy.length,
        znovaMin: znovy.length ? Math.min(...znovy.map((e) => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); })) : 0,
        jedal: bl.querySelectorAll(".plan-cell").length,
        bunkaW: bunka ? Math.round(bunka.getBoundingClientRect().width) : 0,
        akcii: bunka ? bunka.querySelectorAll(".rm").length : 0,
        slot: (() => { const x = bunka && bunka.querySelector(".pc-slot"); return vid(x) ? x.textContent.trim() : ""; })(),
        pcData: (() => { const d = bunka && bunka.querySelector(".pc-data"); return d ? getComputedStyle(d).display : "none"; })(),
        // B3: kcal a bielkoviny v jednom riadku (stred riadku kcal ≈ stred riadku B)
        jedenRiadok: (() => { const k = bunka && bunka.querySelector(".kc"), d = bunka && bunka.querySelector(".pc-data"); if (!k || !d) return 99;
          const a = k.getBoundingClientRect(), b = d.getBoundingClientRect(); return Math.round(Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2)); })(),
        bunkaH: bunka ? Math.round(bunka.getBoundingClientRect().height) : 0,
        krizik: bl.querySelectorAll(".pc-x, [onclick^='odoberKomponent']").length,
        kocka: (() => { const d = bunka && bunka.querySelector(".pc-znova"); if (!vid(d)) return 0; const r = d.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); })(),
        hlava: karty[0] ? karty[0].innerText.replace(/\s+/g, " ") : "",
        taby: document.querySelector(".plan-tabs").innerText.replace(/\s+/g, " "),
        sipka: (document.querySelector("#plan-kontext .chip") || {}).getAttribute
          ? document.querySelector("#plan-kontext .chip").getAttribute("aria-label") : "",
      };
    });
    await t.ok(planM.blokyVidno && planM.tabulkaSkryta, "na mobile kreslí Plán blokový zoznam, nie tabuľku dní", JSON.stringify(planM));
    await t.ok(planM.kariet === 3, `týždeň je v troch blokoch bez preklikávania (${planM.kariet})`, JSON.stringify(planM));
    await t.ok(planM.jedal >= 9 && planM.jedal <= 16, `celý týždeň je ${planM.jedal} jedál na jedno skrolovanie (bolo 28 buniek za 7 klikmi)`, JSON.stringify(planM));
    await t.ok(planM.znova === 3 && planM.znovaMin >= 44, `každý blok má 🎲 znova a dosahuje 44 px (${planM.znovaMin} px)`, JSON.stringify(planM));
    await t.ok(planM.bunkaW > 150, `bunka s jedlom je použiteľne široká (${planM.bunkaW} px, kedysi 16 px)`, JSON.stringify(planM));
    await t.ok(planM.akcii === 1, "bunka plánu má na mobile jedinú mini-akciu „⋯ viac“ (+ 🎲 pri názve)", planM.akcii);
    await t.ok(planM.slot.length > 2, `menovka jedla je v karte, nie vo vlastnom stĺpci (.pc-slot = „${planM.slot}")`, JSON.stringify(planM));
    await t.ok(planM.pcData === "block", "bielkoviny sú v bunke aj mimo Kompaktu", JSON.stringify(planM));
    await t.ok(planM.jedenRiadok <= 6, `kcal a bielkoviny sú v bunke v jednom riadku (posun ${planM.jedenRiadok} px; bunka ${planM.bunkaH} px, bolo 143–156)`, JSON.stringify(planM));
    await t.ok(planM.krizik === 0, "✕ odobrať nie je v bunke plánu (je v „⋯ viac“ s rozsahom a „↩ Späť“)", planM.krizik);
    // v31: 🎲 hneď vedľa názvu jedla = okamžitá výmena v celom bloku
    await t.ok(planM.kocka >= 44, `🎲 vymeniť je vedľa názvu jedla a má ${planM.kocka} px`, JSON.stringify(planM));
    {
      const zn = m.locator("#plan-bloky .pc-znova").first();
      const [, di, slot] = (await zn.getAttribute("onclick")).match(/regenerujSlot\((\d+),'([^']+)'\)/);
      const blokJedla = () => m.evaluate(([d, s]) => blokDni(+d).map((x) => slotIds(x, s)[0]), [di, slot]);
      const pred = await blokJedla();
      await zn.click();
      await m.waitForTimeout(200);
      const po = await blokJedla();
      await t.ok(po[0] && po[0] !== pred[0] && po.every((x) => x === po[0]),
        "🎲 vymení jedlo jedným ťuknutím naraz v celom bloku", JSON.stringify({ pred, po }));
    }
    await t.ok(/varíš/.test(planM.hlava) && /kcal\/deň/.test(planM.hlava),
      "hlavička bloku hovorí varný deň aj súčet voči cieľu", planM.hlava.slice(0, 90));
    await t.ok(/Týždeň/.test(planM.taby) && /Kalendár/.test(planM.taby),
      "prepínač Týždeň/Kalendár má textové menovky, nie holé emoji", planM.taby);
    await t.ok(/týžd/i.test(planM.sipka) && planM.sipka.length > 3,
      `šípka týždňa má menovku zo slov, nie znak („${planM.sipka}")`, planM.sipka);
    // B3: sprievodca „✨ Zostaviť jedálniček“ na telefóne — Generovať v lepivej pätičke, dni sa
    // zalamujú (chip „Ne“ bol mimo obrazovky) a „+ Pridať pravidlo“ nevyhodí skrolovanie na vrch
    {
      await m.evaluate(() => otvorGen());
      await m.waitForTimeout(300);
      const sp = await m.evaluate(() => {
        const pm = document.getElementById("pick-modal");
        const ne = [...pm.querySelectorAll(".chip, .mimo-riadok label")].find((c) => c.textContent.trim() === "Ne");
        const pata = pm.querySelector(".akcie-lepiva"), r = pata ? pata.getBoundingClientRect() : null;
        return { neVpravo: ne ? Math.round(ne.getBoundingClientRect().right) : 9999, w: innerWidth, h: innerHeight,
          pata: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), text: pata.textContent.trim() } : null };
      });
      await t.ok(sp.neVpravo <= sp.w, `v sprievodcovi je chip „Ne“ na obrazovke (pravý okraj ${sp.neVpravo} px z ${sp.w})`, JSON.stringify(sp));
      await t.ok(sp.pata && /Generovať/.test(sp.pata.text) && sp.pata.bottom <= sp.h && sp.pata.top < sp.h - 40,
        "„✨ Generovať“ je v lepivej pätičke hneď po otvorení sprievodcu", JSON.stringify(sp));
      // skroluje panel (spodný panel na telefóne) alebo prekrytie — meraj ten, čo sa naozaj skroluje
      const skrolEl = () => { const pm = document.getElementById("pick-modal"), ov = document.getElementById("pick-overlay");
        return pm.scrollHeight > pm.clientHeight + 1 ? pm : ov; };
      const y = await m.evaluate((f) => { const el = eval(f)(); el.scrollTop = 1200; return el.scrollTop; }, "(" + skrolEl + ")");
      await m.evaluate(() => { document.getElementById("gf-veg").checked = true; pridajGenFilter(); });
      await m.waitForTimeout(200);
      const y2 = await m.evaluate((f) => eval(f)().scrollTop, "(" + skrolEl + ")");
      await t.ok(y > 300 && Math.abs(y2 - y) < 5, `„+ Pridať pravidlo“ ponechá pozíciu skrolovania (${Math.round(y)} → ${Math.round(y2)} px)`);
      await m.evaluate(() => { S.genCfg.filtre = []; save(); zavriPick(); });
    }

    // ── vodorovný pretok vo všetkých pohľadoch ─────────────────────────────
    for (const v of VIEWS) {
      await prepni(m, v);
      await m.waitForTimeout(150);
      const p = await pretok(m);
      await t.ok(p.zle.length === 0 && p.docW <= p.viewW + 2,
        `393 px — žiadny vodorovný pretok v pohľade „${v}“`, JSON.stringify(p));
      // v31: ceny appka neukazuje nikde (s naplneným plánom, kde by sa ukázali)
      const euro = await m.evaluate((x) => { const s = document.getElementById("v-" + x).innerText, i = s.indexOf("€"); return i < 0 ? "" : s.slice(Math.max(0, i - 40), i + 3); }, v);
      await t.ok(!euro, `v pohľade „${v}“ nie je žiadna cena`, euro);
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

    // ── režimy hustoty: Kompakt zmenšuje zoomom, a zoom < 1 zmenšuje aj ciele ──
    // Kompakt (--skala 0,82) je jediný režim pod 1,0. Prvky, ktoré nestoja na
    // max(44px, var(--cil-in)) — text v bunke plánu, odkazy-tlačidlá — v ňom klesnú
    // pod dokumentovanú podlahu 24 px, ak im niekto vezme min-height (napr. inline
    // štýlom z app.js, ktorý sa selektorom prebiť nedá). Preto sa meria každý režim.
    const REZIMY_T = ["plan", "obchod"]; // v34: dva režimy (Normálne / Veľké písmo); Kompakt a Kuchyňa sa migrujú
    const nadPrehybom = {};
    for (const r of REZIMY_T) {
      await m.evaluate((x) => nastavRezim(x), r);
      await m.waitForTimeout(200);
      await t.ok(await m.evaluate((x) => document.documentElement.getAttribute("data-rezim") === x, r),
        `režim „${r}“ sa zapíše na <html>`);
      for (const v of primarne) {
        await prepni(m, v);
        await m.waitForTimeout(180);
        const c = await ciele(m);
        await t.ok(c.velmiMale.length === 0,
          `režim „${r}“ — žiadny dotykový cieľ pod 24 px v „${v}“`, JSON.stringify(c.velmiMale.slice(0, 6)));
      }
      await prepni(m, "nakup");
      await m.waitForTimeout(200);
      nadPrehybom[r] = await m.evaluate(() => [...document.querySelectorAll("#nakup-list .nak-row")]
        .filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.bottom <= 780; }).length);
    }
    t.metrika("položiek nákupu nad prehybom (normálne/veľké)",
      REZIMY_T.map((r) => nadPrehybom[r]).join(" / "));
    await t.ok(nadPrehybom.plan >= 1 && nadPrehybom.obchod >= 1, "v oboch režimoch je nad prehybom aspoň jedna položka nákupu", JSON.stringify(nadPrehybom));
    await m.evaluate(() => nastavRezim("plan"));
    await m.waitForTimeout(200);

    // ── nákup v obchode: odškrtnutie jednou rukou ──────────────────────────
    await prepni(m, "nakup");
    await m.waitForTimeout(250);
    // Vlna 3: cieľom je CELÝ riadok (<label>), nie 20×20 px políčko. Info má vlastné tlačidlo ⓘ.
    await m.evaluate(() => { const r = document.querySelector("#nakup-list .nak-row"); if (r) r.scrollIntoView({ block: "center" }); });
    await m.waitForTimeout(250);
    const rc = await m.evaluate(() => {
      const lab = document.querySelector("#nakup-list .nak-row label");
      const inp = lab.querySelector("input[type=checkbox]");
      const nm = lab.querySelector(".nm2");
      const inf = lab.parentElement.querySelector(".nak-i");
      const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: Math.round(r.width), h: Math.round(r.height) }; };
      return { label: R(lab), input: R(inp), nm: R(nm), info: R(inf) };
    });
    const predKlik = await m.evaluate(() => Object.keys(S.nakupCheck).length);
    // ťuknutie na NÁZOV (najpravdepodobnejšie miesto palca) musí odškrtnúť, nie otvoriť okno
    await m.mouse.click(rc.nm.x + rc.nm.w / 2, rc.nm.y + rc.nm.h / 2);
    await m.waitForTimeout(400);
    const poKlik = await m.evaluate(() => ({ n: Object.keys(S.nakupCheck).length, pick: document.getElementById("pick-overlay").classList.contains("open") }));
    await zavriOkna(m);
    t.metrika("nákup — riadok / odškrtávací cieľ (393 px)", `${rc.label.w}×${rc.label.h} px / ${rc.input.w}×${rc.input.h} px`);
    t.metrika("nákup — tlačidlo ⓘ (393 px)", rc.info ? `${rc.info.w}×${rc.info.h} px` : "chýba");
    await t.ok(rc.label.h >= 44, `celý riadok nákupu je dotykový cieľ ≥44 px (${rc.label.w}×${rc.label.h})`, JSON.stringify(rc));
    await t.ok(poKlik.n > predKlik && !poKlik.pick,
      "ťuknutie na názov suroviny ju odškrtne (a neotvorí info-okno)", JSON.stringify({ rc, predKlik, poKlik }));
    await t.ok(rc.info && Math.min(rc.info.w, rc.info.h) >= 40,
      `ⓘ má vlastný cieľ aspoň 40 px (${rc.info && rc.info.w}×${rc.info && rc.info.h})`, JSON.stringify(rc.info));

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

    // ── Späť a Escape zatvárajú LEN najvrchnejšiu vrstvu (audit 30. 9.) ─────
    // Do v32 mal celý zásobník okien jeden záznam v histórii a dialóg ani menu žiadny: Späť nad
    // dialógom prepol obrazovku a dialóg nechal visieť, Späť z varenia zavrelo aj detail.
    const z = await E.novaStranka({ viewport: E.MOBIL, touch: true });
    await prepni(z, "planovac");
    await naplnPlan(z);
    const vrstvy = () => z.evaluate(() => ({ view: document.querySelector(".view.active").id,
      okna: ["overlay", "pick-overlay", "dlg-overlay", "cook"].filter((i) => document.getElementById(i).classList.contains("open")).join(","),
      menu: !!document.querySelector(".menu.open"), dni: Object.keys(S.plan).length }));
    const menuPlan = "#v-planovac .plan-head .menu-wrap > button";
    await z.click(menuPlan); await z.waitForTimeout(250);
    await z.goBack(); await z.waitForTimeout(400);
    let v1 = await vrstvy();
    await t.ok(!v1.menu && v1.view === "v-planovac", "„⋯ Viac“ → Späť zavrie len menu, Plán ostane", JSON.stringify(v1));
    await z.click(menuPlan); await z.waitForTimeout(250);
    await z.keyboard.press("Escape"); await z.waitForTimeout(250);
    v1 = await vrstvy();
    await t.ok(!v1.menu && v1.view === "v-planovac", "„⋯ Viac“ → Escape zavrie menu", JSON.stringify(v1));
    const dniPred = v1.dni;
    await z.evaluate(() => { window.confirmModal("Vyprázdniť tento týždenný plán?"); });
    await z.waitForTimeout(250);
    await z.goBack(); await z.waitForTimeout(400);
    v1 = await vrstvy();
    await t.ok(v1.okna === "" && v1.view === "v-planovac" && v1.dni === dniPred,
      "potvrdzovací dialóg → Späť ho zavrie (= Zrušiť) a obrazovka sa nezmení", JSON.stringify(v1));
    await z.evaluate(() => window.otvor(window.slotIds(0, "Obed")[0], { di: 0, slot: "Obed" })); await z.waitForTimeout(300);
    await z.evaluate(() => window.spustiCook()); await z.waitForTimeout(300);
    await z.locator('#cook button[onclick="pridajCasovac()"]').click(); await z.waitForTimeout(300);
    v1 = await vrstvy();
    await t.ok(v1.okna === "overlay,dlg-overlay,cook", "detail → varenie → ➕ Časovač sú tri vrstvy", JSON.stringify(v1));
    await z.goBack(); await z.waitForTimeout(400);
    v1 = await vrstvy();
    await t.ok(v1.okna === "overlay,cook", "dialóg časovača → Späť zavrie len dialóg, varenie ostane", JSON.stringify(v1));
    await z.goBack(); await z.waitForTimeout(400);
    v1 = await vrstvy();
    await t.ok(v1.okna === "overlay", "varenie → Späť vráti do detailu receptu (detail ostane otvorený)", JSON.stringify(v1));
    await z.goBack(); await z.waitForTimeout(400);
    v1 = await vrstvy();
    await t.ok(v1.okna === "" && v1.view === "v-planovac", "detail → Späť → Plán", JSON.stringify(v1));
    await t.ok(z.chyby.length === 0, "žiadna chyba v konzole pri Späť/Escape", z.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(z);

    // privítanie zavreté cez Escape sa pri ďalšom štarte už neukáže (dokončovali ho len ✕ a Preskočiť)
    const ob = await E.novaStranka({ viewport: E.MOBIL, touch: true, stav: null });
    const obPred = await ob.evaluate(() => document.getElementById("pick-overlay").classList.contains("open"));
    await ob.keyboard.press("Escape");
    await ob.waitForTimeout(400);
    await ob.reload({ waitUntil: "load" });
    await ob.waitForFunction(() => typeof RECEPTY !== "undefined");
    await ob.waitForTimeout(150);
    const obPo = await ob.evaluate(() => document.getElementById("pick-overlay").classList.contains("open"));
    await t.ok(obPred && !obPo, "privítanie zavreté cez Escape sa pri ďalšom štarte neukáže", JSON.stringify({ obPred, obPo }));
    await E.zavri(ob);

    // ── dotykové ciele v Kompakte (zoom 0,82): to, čo stálo na pevných 44 CSS px, malo 36 ──
    const k = await E.novaStranka({ viewport: E.MOBIL, touch: true, stav: {
      profil: Object.assign(zakladnyStav().profil, { rezim: "kompakt" }),
      spajza: [{ id: 1, nazov: "Mlieko", kluc: "mlieko", mnozstvo: 2, jednotka: "l", miesto: "Chladnička", expiry: "", min: 0 }], spSid: 2 } });
    await prepni(k, "planovac");
    await naplnPlan(k);
    const kMin = (sel) => k.evaluate((s) => { const v = [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length && e.checkVisibility())
      .map((e) => { const r = (e.matches("input[type=checkbox]") && e.closest("label") ? e.closest("label") : e).getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); });
      return v.length ? Math.min(...v) : null; }, sel);
    const kc = {};
    kc["◀ ▶ týždňa"] = await kMin("#plan-kontext .chip[onclick]");
    await k.click(menuPlan); await k.waitForTimeout(200);
    kc["položky ⋯ Viac"] = await kMin("#m-plan a");
    await k.keyboard.press("Escape");
    await k.evaluate(() => window.planZobraz("kalendar")); kc["‹ › kalendára"] = await kMin("#plan-kal .plan-head .btn");
    await k.evaluate(() => window.planZobraz("tyzden"));
    await k.evaluate(() => window.otvor(window.slotIds(0, "Obed")[0], { di: 0, slot: "Obed" })); await k.waitForTimeout(250);
    kc["✕ detailu"] = await kMin("#modal .close"); kc["−/+ porcií"] = await kMin("#modal .stepper button"); kc["hviezda"] = await kMin("#modal .star-cil");
    await zavriOkna(k);
    await prepni(k, "domov"); kc["riadok Dnešný plán"] = await kMin("#dnes-plan .sur-klik");
    await prepni(k, "recepty"); kc["hľadanie"] = await kMin("#hladaj");
    await prepni(k, "nastavenia"); await k.evaluate(() => document.querySelectorAll("#v-nastavenia details").forEach((d) => { d.open = true; }));
    kc["prepínač v Nastaveniach"] = await kMin("#v-nastavenia .switch input[type=checkbox]");
    await k.evaluate(() => { window.prepni("vyziva"); window.vyzivaZobraz("den"); }); kc["‹ › Výživa-deň"] = await kMin("#vyziva-daynav .btn");
    await prepni(k, "spajza"); kc["− + ✎ ✕ v Špajzi"] = await kMin("#spajza-list button");
    const pod44 = Object.entries(kc).filter(([, v]) => v !== null && v < 44);
    await t.ok(pod44.length === 0, "Kompakt: ✕, −/+, menu, prepínače, šípky, Špajza a hviezdy majú ≥ 44 px", JSON.stringify(kc));
    await k.evaluate(() => window.otvorRozvrh()); await k.waitForTimeout(200);
    const hr = await kMin("#pick-modal .hranica");
    await t.ok(hr >= 24, `Kompakt: hranica dní v Rozvrhu má ≥ 24 px (${hr}; 44 sa so 7 dňami do riadku nezmestí)`, String(hr));
    await E.zavri(k);

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
