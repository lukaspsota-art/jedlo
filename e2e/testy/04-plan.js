// 04 — Plánovač S NAPLNENÝM PLÁNOM (prázdny plán skryje polovicu UI — poučenie z AUDIT_UI_2026-08-19)
"use strict";
const { prepni, zavriOkna, naplnPlan, pocetSlotov } = require("../lib");

module.exports = {
  nazov: "Plánovač (naplnený týždeň)",
  async spusti(E, t) {
    const page = await E.novaStranka();
    await prepni(page, "planovac");

    // ── prázdny plán: mriežka existuje a ponúka „+ pridať“ ──────────────────
    const prazdny = await page.evaluate(() => ({
      riadkov: document.querySelectorAll("#plan-table tr").length,
      pridat: document.querySelectorAll("#plan-table .plan-cell.prazdne").length,
    }));
    await t.ok(prazdny.riadkov >= 5, "prázdny plán vykreslí tabuľku", JSON.stringify(prazdny));
    await t.ok(prazdny.pridat > 0, "prázdne bunky ponúkajú „+ pridať“", prazdny.pridat);

    // ── naplň plán ──────────────────────────────────────────────────────────
    await naplnPlan(page);
    const naplnenych = await pocetSlotov(page);
    await t.ok(naplnenych >= 20, `generátor naplnil plán (${naplnenych} slotov zo 4×7=28)`, naplnenych);
    t.metrika("naplnených slotov v týždni", naplnenych);

    // ── <colgroup> a šírky stĺpcov (regresia: stĺpec „Jedlo“ mal 718 px) ────
    const stlpce = await page.evaluate(() => {
      const tb = document.getElementById("plan-table");
      const cg = tb.querySelector("colgroup");
      const hlav = [...tb.querySelectorAll("tr.dni-hlavicka th")].map((th) => Math.round(th.getBoundingClientRect().width));
      return {
        maCol: !!cg,
        colSlot: !!(cg && cg.querySelector("col.c-slot")),
        colov: cg ? cg.querySelectorAll("col").length : 0,
        span: cg ? [...cg.querySelectorAll("col")].map((c) => c.getAttribute("span") || "1").join(",") : "",
        sirky: hlav,
        layout: getComputedStyle(tb).tableLayout,
        sirkaTabulky: Math.round(tb.getBoundingClientRect().width),
      };
    });
    await t.ok(stlpce.maCol, "table.plan má <colgroup> (bez neho fixed layout berie šírky z colspan riadku)");
    await t.ok(stlpce.colSlot, "colgroup obsahuje col.c-slot pre stĺpec s názvami jedál", JSON.stringify(stlpce));
    const slotW = stlpce.sirky[0], dniW = stlpce.sirky.slice(1);
    await t.ok(slotW > 0 && slotW <= 200,
      `stĺpec „Jedlo“ nezaberá pol tabuľky (${slotW} px z ${stlpce.sirkaTabulky} px)`, JSON.stringify(stlpce.sirky));
    const minD = Math.min(...dniW), maxD = Math.max(...dniW);
    await t.ok(minD >= 100, `stĺpce dní sú použiteľne široké (min ${minD} px)`, JSON.stringify(stlpce.sirky));
    await t.ok(maxD - minD <= 4, `stĺpce dní sú rovnako široké (${minD}–${maxD} px)`, JSON.stringify(stlpce.sirky));
    t.metrika("šírka stĺpca „Jedlo“ / dňa (1440 px)", `${slotW} px / ${minD}–${maxD} px`);

    // ── bunka s jedlom: 1 primárna akcia + „⋯ viac“ ────────────────────────
    const bunka = await page.evaluate(() => {
      const c = document.querySelector("#plan-table .plan-cell:not(.prazdne):not(.vyp)");
      if (!c) return null;
      const rm = [...c.querySelectorAll(".rm")].map((x) => x.textContent.trim());
      return {
        rm,
        nazvov: c.querySelectorAll(".nm").length,
        kc: !!c.querySelector(".kc"),
        odobrat: c.querySelectorAll("a[onclick^='odoberKomponent']").length,
      };
    });
    // v34: bunka = názov + 🎲 + jedno „⋯ viac“ (výber zo zoznamu, porcia a príloha sú v ňom)
    await t.ok(bunka && bunka.rm.length === 1 && /viac/.test(bunka.rm[0]), `v bunke plánu je jediná mini-akcia „⋯ viac“ (bolo ich 5, potom 2)`, JSON.stringify(bunka));

    // klik na „⋯ viac“ otvorí panel so 4 akciami
    await page.locator("#plan-table .plan-cell:not(.prazdne):not(.vyp) .rm", { hasText: "viac" }).first().click();
    await page.waitForTimeout(200);
    const panel = await page.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      polozky: [...document.querySelectorAll("#pick-modal .plan-cell .nm")].map((x) => x.textContent.trim()),
    }));
    await t.ok(panel.otvorene, "„⋯ viac“ v bunke otvorí panel akcií");
    // v31: pri skutočnom recepte pribudla piata „🚫 Už nezobrazovať“ (pri zvyšku/prílohe nie je).
    // B3: ✕ sa z bunky presunul sem (s rozsahom bloku) a pribudol 🔒 Zamknúť; ✕ prílohy, ak ju jedlo má.
    // v34: navrchu tri rozsahy výmeny (🎲 náhodne / ✎ zo zoznamu / 🍽 porcia), potom doplnok, porcie, zvyšok…
    await t.ok(panel.polozky.length >= 9 && /Vymeniť/.test(panel.polozky[0]) && /zoznamu/.test(panel.polozky[1]) && panel.polozky.some(p => /Už nezobrazovať/.test(p)) && panel.polozky.some(p => /Zamknúť/.test(p))
      && /^✕ Odobrať z (bloku|plánu)/.test(panel.polozky[panel.polozky.length - 1]),
      `panel má akcie doplnok, znova, porcie, zvyšok, už nezobrazovať, 🔒, ✕ odobrať — ${panel.polozky.length}`, JSON.stringify(panel));
    await zavriOkna(page);

    // ── B3: ✕ odobrať z „⋯ viac“ → toast „↩ Späť“ (skutočné tlačidlo) jedlo vráti ──────────
    {
      await page.evaluate(() => { if (!S.blokMode) window.prepniBlok(true); });
      const pred = await page.evaluate(() => JSON.stringify([2, 3, 4].map((d) => slotIds(d, "Obed"))));
      await page.evaluate(() => akcieSlotu(2, "Obed"));
      await page.waitForTimeout(150);
      await page.locator("#pick-modal .plan-cell", { hasText: "Odobrať z" }).last().click();
      await page.waitForTimeout(200);
      const po = await page.evaluate(() => ({
        obed: JSON.stringify([2, 3, 4].map((d) => slotIds(d, "Obed"))),
        toast: document.getElementById("toast").textContent,
        tlacidlo: (() => { const b = document.querySelector("#toast button"); if (!b) return null; const r = b.getBoundingClientRect();
          return { text: b.textContent, h: Math.round(r.height), pe: getComputedStyle(b).pointerEvents }; })(),
      }));
      await t.ok(po.obed === "[[],[],[]]", "✕ Odobrať z bloku odoberie obed v celom bloku St–Pi", po.obed);
      await t.ok(po.tlacidlo && /Späť/.test(po.tlacidlo.text) && po.tlacidlo.h >= 44 && po.tlacidlo.pe === "auto",
        "toast po odobratí má skutočné tlačidlo „↩ Späť“ (≥ 44 px, dá sa ťuknúť)", JSON.stringify(po));
      await page.click("#toast button");
      await page.waitForTimeout(200);
      const vratene = await page.evaluate(() => JSON.stringify([2, 3, 4].map((d) => slotIds(d, "Obed"))));
      await t.ok(vratene === pred, "„↩ Späť“ vráti odobraté jedlo", `${pred} → ${vratene}`);
    }

    // ── rozvrh varenia: pás nad tabuľkou + dialóg (vlna 3, NAVOD v15) ──────
    // Predtým sa rozdelenie blokov volalo „✂️ Rozdelenie blokov“ a bolo len v „⋯ Viac“.
    // Dnes je nad tabuľkou pás, ktorý vetou hovorí kedy varíš, a má vlastné „✂️ Upraviť rozvrh“.
    await page.evaluate(() => { if (!S.blokMode) window.prepniBlok(true); });
    await page.waitForTimeout(150);
    const pas = await page.evaluate(() => {
      const b = document.querySelector("#v-planovac .rozvrh-upr");
      const txt = (document.getElementById("v-planovac").textContent || "").replace(/\s+/g, " ");
      return { maTlacidlo: !!b, text: b ? b.textContent.trim() : "", veta: /Varíš vo? .{2,12} večer na /.test(txt), pocetBlokov: /Rozvrh varenia · varíš \d+× týždenne/.test(txt) };
    });
    await t.ok(pas.maTlacidlo && /Upraviť rozvrh/i.test(pas.text), "nad tabuľkou je „✂️ Upraviť rozvrh“", JSON.stringify(pas));
    await t.ok(pas.veta, "rozvrh hovorí celou vetou, kedy a na čo varíš", JSON.stringify(pas));
    await t.ok(pas.pocetBlokov, "rozvrh povie, koľko blokov máš", JSON.stringify(pas));

    const menu = await page.evaluate(() => ({
      polozky: [...document.querySelectorAll("#m-plan a")].map((a) => a.textContent.trim()),
      editorNaObrazovke: (() => { const b = document.getElementById("blok-editor"); return !!(b && b.closest("#v-planovac")); })(),
    }));
    await t.ok(menu.polozky.some((x) => /Rozvrh varenia/i.test(x)), "„🍳 Rozvrh varenia (bloky)“ je aj v menu ⋯ Viac", JSON.stringify(menu.polozky));
    await t.ok(!menu.editorNaObrazovke, "editor rozdelenia nezaberá miesto priamo v obrazovke Plánu");

    // otvor rozvrh reálnym klikom na pás
    await page.click("#v-planovac .rozvrh-upr");
    await page.waitForTimeout(250);
    const rozd = await page.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      nadpis: (document.querySelector("#pick-modal h2") || {}).textContent || "",
      hranic: document.querySelectorAll("#pick-modal [onclick^='toggleHranica']").length,
      predvolby: document.querySelectorAll("#pick-modal [onclick^='pouziRozvrh']").length,
      nahlad: /Varíš vo? .{2,12} večer na /.test((document.getElementById("pick-modal").textContent || "").replace(/\s+/g, " ")),
    }));
    await t.ok(rozd.otvorene && /Rozvrh/i.test(rozd.nadpis), "„✂️ Upraviť rozvrh“ otvorí dialóg rozvrhu", JSON.stringify(rozd));
    await t.ok(rozd.hranic >= 6, "dialóg ponúka hranice medzi dňami (pás Po · Ut ✂ St …)", rozd.hranic);
    await t.ok(rozd.predvolby >= 5, "dialóg ponúka hotové rozvrhy na jedno ťuknutie", rozd.predvolby);
    await t.ok(rozd.nahlad, "dialóg píše náhľad celou vetou", JSON.stringify(rozd));
    await zavriOkna(page);

    // ── denné súčty kcal a cieľ ─────────────────────────────────────────────
    const suma = await page.evaluate(() => {
      const tr = document.querySelector("#plan-table tr.suma");
      if (!tr) return null;
      const bunky = [...tr.querySelectorAll("td")].slice(1).map((td) => td.textContent.trim());
      const cisla = bunky.map((b) => { const m = b.match(/^(\d+)/); return m ? +m[1] : 0; }).filter(Boolean);
      const ciel = S.profil.kcal;
      // kontrolný prepočet z modelu
      const model = [];
      for (let di = 0; di < 7; di++) { let s = 0; slotyDna(di).forEach((sl) => { const f = pf(di, sl); slotIds(di, sl).forEach((c) => { const r = komponent(c); if (r) s += kcalPorcia(r) * f; }); }); model.push(Math.round(s)); }
      return { bunky, cisla, ciel, model, maCiel: bunky.some((b) => b.includes("/" + ciel)) };
    });
    await t.ok(suma && suma.cisla.length === 7, `riadok „Σ kcal/deň“ má číslo pre každý deň (${suma && suma.cisla.length})`, JSON.stringify(suma && suma.bunky));
    await t.ok(suma && suma.maCiel, `denný súčet ukazuje aj cieľ (…/${suma && suma.ciel})`, JSON.stringify(suma && suma.bunky[0]));
    const sedi = suma.cisla.every((c, i) => Math.abs(c - suma.model[i]) <= 1);
    await t.ok(sedi, "denné súčty kcal v tabuľke sedia s prepočtom z modelu", JSON.stringify({ tab: suma.cisla, model: suma.model }));
    const odchylky = suma.cisla.map((c) => Math.abs(c / suma.ciel - 1));
    const vOkne = odchylky.filter((o) => o <= 0.15).length;
    t.metrika("dní v ±15 % cieľa (1 týždeň)", `${vOkne}/7`);
    t.metrika("denné kcal vygenerovaného týždňa", suma.cisla.join(", "));
    await t.ok(vOkne >= 5, `aspoň 5 zo 7 dní je v ±15 % cieľa (${vOkne})`, JSON.stringify({ kcal: suma.cisla, ciel: suma.ciel }));

    // ── „%“ faktor je zovretý 0,85–1,15 ────────────────────────────────────
    const fak = await page.evaluate(() => {
      const out = [];
      for (let di = 0; di < 7; di++) slotyDna(di).forEach((sl) => out.push(pf(di, sl)));
      return { min: Math.min(...out), max: Math.max(...out), unik: [...new Set(out)].sort() };
    });
    // v34: faktor má každé jedlo zvlášť, automatika 0,7–1,5 (FAKTOR_SLOT_MIN/MAX)
    await t.ok(fak.min >= 0.7 - 1e-9 && fak.max <= 1.5 + 1e-9, `faktor jedla je v 0,7–1,5 (${fak.min}–${fak.max})`, JSON.stringify(fak));
    t.metrika("faktor min/max", `${fak.min} / ${fak.max}`);

    // faktor sa dá upraviť a prejaví sa v súčte
    const pred = await page.evaluate(() => document.querySelector("#plan-table tr.suma td:nth-child(2)").textContent.trim());
    await page.evaluate(() => {
      const iso = datumPre(0); const sl = slotyDna(0)[0];
      S.planF[iso] = S.planF[iso] || {}; S.planF[iso][sl] = 1.5; save(); renderPlan();
    });
    const po = await page.evaluate(() => document.querySelector("#plan-table tr.suma td:nth-child(2)").textContent.trim());
    await t.ok(pred !== po, "zmena veľkosti porcie sa prejaví v dennom súčte", `${pred} → ${po}`);
    const kcTxt = await page.evaluate(() => document.querySelector("#plan-table .plan-cell .kc").textContent);
    // v34: faktor má skoro každé jedlo — namiesto „porcie 110 %“ (žargón v každej bunke) bunka povie slovom
    await t.ok(/(väčšia|menšia) porcia/.test(kcTxt), "bunka s upraveným faktorom povie „väčšia/menšia porcia“", kcTxt);

    // ── výmena jedla (picker) ───────────────────────────────────────────────
    await naplnPlan(page);
    const predVymenou = await page.evaluate(() => slotIds(0, slotyDna(0)[0])[0]);
    await page.evaluate(() => vyberDoPlanu(0, slotyDna(0)[0])); // v34: „✎ Vybrať jedlo zo zoznamu“ je v „⋯ viac“
    await page.waitForTimeout(200);
    await t.ok(await page.evaluate(() => document.getElementById("pick-overlay").classList.contains("open")),
      "„✎ zmeniť“ otvorí výber receptu");
    // vyhľadaj a vyber prvý výsledok
    const maHladanie = await page.evaluate(() => !!document.querySelector("#pick-modal input"));
    await t.ok(maHladanie, "výber receptu má vyhľadávacie pole");
    await zavriOkna(page);
    await page.evaluate(() => {
      const sl = slotyDna(0)[0];
      window.pickCiel = { di: 0, slot: sl, blok: false };
      const iny = RECEPTY.find((r) => r.kategoria === "Polievka");
      window.nastavPlan(iny.id);
    });
    await page.waitForTimeout(200);
    const poVymene = await page.evaluate(() => slotIds(0, slotyDna(0)[0])[0]);
    await t.ok(poVymene !== predVymenou, "výmena jedla v slote sa prejaví v pláne", `${predVymenou} → ${poVymene}`);

    // ── navigácia týždňov ───────────────────────────────────────────────────
    const t0 = await page.evaluate(() => S.viewOd);
    await page.evaluate(() => window.posunTyzden(1));
    const t1 = await page.evaluate(() => S.viewOd);
    await t.ok(t1 !== t0, "navigácia na ďalší týždeň mení zobrazený týždeň", `${t0} → ${t1}`);
    const prazdnyDalsi = await pocetSlotov(page);
    await t.ok(prazdnyDalsi === 0, "ďalší týždeň je prázdny (plán je viazaný na dátum, nie na index dňa)", prazdnyDalsi);
    await page.evaluate(() => window.skokNaDnesTyzden());
    await t.ok(await page.evaluate(() => S.viewOd) === t0, "„dnes“ vráti na aktuálny týždeň");

    // ── kalendár ────────────────────────────────────────────────────────────
    await page.evaluate(() => window.planZobraz("kalendar"));
    await page.waitForTimeout(150);
    const kal = await page.evaluate(() => ({
      vidno: getComputedStyle(document.getElementById("plan-kal")).display !== "none",
      dni: document.querySelectorAll("#kal-grid .day").length,
      sPlanom: document.querySelectorAll("#kal-grid .day .ev, #kal-grid .plan-dot").length,
    }));
    await t.ok(kal.vidno && kal.dni >= 28, "kalendárny pohľad sa vykreslí", JSON.stringify(kal));
    await t.ok(kal.sPlanom > 0, "kalendár ukazuje dni s plánom", JSON.stringify(kal));
    await page.evaluate(() => window.planZobraz("tyzden"));

    // ── plán prežije reload ─────────────────────────────────────────────────
    const predR = await pocetSlotov(page);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => typeof RECEPTY !== "undefined");
    await prepni(page, "planovac");
    const poR = await pocetSlotov(page);
    await t.ok(poR === predR, "plán prežije reload", `${predR} → ${poR}`);

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole v plánovači",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
