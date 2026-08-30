// 06 — Nákup: zoznam z plánu, oddelenia, zaškrtávanie + reload, ceny, špajza, „mám doma“, kopírovanie
"use strict";
const { prepni, zavriOkna, naplnPlan } = require("../lib");

module.exports = {
  nazov: "Nákup",
  async spusti(E, t) {
    const page = await E.novaStranka({ permissions: ["clipboard-read", "clipboard-write"] });

    // ── prázdny plán → zrozumiteľný prázdny stav ────────────────────────────
    await prepni(page, "nakup");
    const prazdno = await page.evaluate(() => document.getElementById("nakup-list").textContent.trim());
    await t.ok(/Zatiaľ nič v pláne/i.test(prazdno), "prázdny nákup vysvetlí, čo urobiť", prazdno.slice(0, 80));

    // ── zoznam z plánu ──────────────────────────────────────────────────────
    await prepni(page, "planovac");
    await naplnPlan(page);
    await prepni(page, "nakup");
    const zoz = await page.evaluate(() => {
      const oddelenia = [...document.querySelectorAll("#nakup-list .odd h4")].map((h) => h.textContent.trim());
      return {
        oddelenia,
        polozky: document.querySelectorAll("#nakup-list label").length,
        checkboxov: document.querySelectorAll("#nakup-list input[type=checkbox]").length,
        suhrn: (document.querySelector("#nakup-list .nakup-suhrn") || {}).textContent || "",
      };
    });
    await t.ok(zoz.polozky > 15, `nákupný zoznam sa naplní z plánu (${zoz.polozky} položiek)`, JSON.stringify(zoz.oddelenia));
    await t.ok(zoz.oddelenia.length >= 4, `položky sú rozdelené do oddelení (${zoz.oddelenia.length})`, JSON.stringify(zoz.oddelenia));
    t.metrika("položiek v nákupe (1 týždeň, 2 osoby)", zoz.polozky);
    t.metrika("oddelení v nákupe", zoz.oddelenia.join(" · "));

    // ── poradie oddelení podľa PORADIE_ODDELENI ────────────────────────────
    const poradie = await page.evaluate(() => {
      const por = PORADIE_ODDELENI;
      const zoznam = [...document.querySelectorAll("#nakup-list .odd h4")].map((h) => h.textContent.trim())
        .filter((n) => por.includes(n));
      const idx = zoznam.map((n) => por.indexOf(n));
      return { zoznam, idx, zoradene: idx.every((x, i) => i === 0 || idx[i - 1] < x), por };
    });
    await t.ok(poradie.zoradene, "oddelenia idú v definovanom poradí obchodu", JSON.stringify(poradie.zoznam));
    await t.ok(poradie.zoznam[0] === poradie.por.find((p) => poradie.zoznam.includes(p)),
      `prvé oddelenie je „${poradie.zoznam[0]}“ (podľa PORADIE_ODDELENI)`, JSON.stringify(poradie.zoznam));

    // ── zaškrtávanie a prežitie reloadu ─────────────────────────────────────
    const prvy = page.locator("#nakup-list .odd label input[type=checkbox]:not([disabled])").first();
    const menoPrveho = await page.evaluate(() => {
      const i = document.querySelector("#nakup-list .odd label input[type=checkbox]:not([disabled])");
      return i.closest("label").textContent.trim().slice(0, 40);
    });
    // .click(), nie .check() — checkNakup() prekreslí celý zoznam, takže pôvodný uzol zmizne
    // a overenie stavu v .check() by čakalo na odpojený element.
    await prvy.click();
    await page.waitForTimeout(300);
    const poZaskrtnuti = await page.evaluate(() => ({
      hotove: document.querySelectorAll("#nakup-list .done-sekcia label").length,
      kluce: Object.keys(S.nakupCheck).length,
      maSekciu: [...document.querySelectorAll("#nakup-list .odd h4")].some((h) => /Už máme|v košíku/i.test(h.textContent)),
    }));
    await t.ok(poZaskrtnuti.kluce === 1, "zaškrtnutie sa uloží do stavu", JSON.stringify(poZaskrtnuti));
    await t.ok(poZaskrtnuti.maSekciu, `zaškrtnutá položka („${menoPrveho}“) sa presunie do „Už máme / v košíku“`, JSON.stringify(poZaskrtnuti));

    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => typeof RECEPTY !== "undefined");
    await prepni(page, "nakup");
    const poReloade = await page.evaluate(() => ({
      kluce: Object.keys(S.nakupCheck).length,
      zaskrtnutych: document.querySelectorAll("#nakup-list input[type=checkbox]:checked").length,
    }));
    await t.ok(poReloade.kluce === 1 && poReloade.zaskrtnutych >= 1, "zaškrtnutie prežije reload", JSON.stringify(poReloade));

    // zaškrtnutie je viazané na týždeň — v inom týždni nemá platiť
    await page.evaluate(() => { window.posunTyzden(1); });
    await page.waitForTimeout(150);
    const inyTyzden = await page.evaluate(() => document.querySelectorAll("#nakup-list input[type=checkbox]:checked").length);
    await t.ok(inyTyzden === 0, "zaškrtnutia sú viazané na konkrétny týždeň", inyTyzden);
    await page.evaluate(() => { window.skokNaDnesTyzden(); window.renderNakup(); });
    await page.waitForTimeout(150);

    // ── tri režimy ceny ─────────────────────────────────────────────────────
    const ceny = await page.evaluate(() => ({
      spotreba: cenaTyzdna("spotreba"),
      balenia: cenaTyzdna("balenia"),
      osoba: cenaTyzdna("osoba"),
      ludi: stravniciList().length,
      suhrnText: (document.querySelector("#nakup-list .nakup-suhrn") || {}).textContent || "",
    }));
    await t.ok(ceny.spotreba > 1, `režim „spotreba“ vráti cenu (${ceny.spotreba.toFixed(2)} €)`, JSON.stringify(ceny));
    await t.ok(ceny.balenia >= ceny.spotreba - 0.01, "režim „balenia“ nie je nižší ako spotreba (kupuješ celé balenia)", `${ceny.balenia} vs ${ceny.spotreba}`);
    await t.ok(Math.abs(ceny.osoba - ceny.spotreba / ceny.ludi) < 0.01, "režim „osoba“ = spotreba / počet stravníkov", JSON.stringify(ceny));
    await t.ok(/spotrebuješ/i.test(ceny.suhrnText), "súhrn nákupu ukazuje cenu spotreby", ceny.suhrnText.slice(0, 100));
    await t.ok(/balenia/i.test(ceny.suhrnText) || ceny.balenia <= ceny.spotreba + 0.01,
      "súhrn ukazuje aj cenu za celé balenia", ceny.suhrnText.slice(0, 140));
    t.metrika("cena týždňa spotreba / balenia / osoba", `${ceny.spotreba.toFixed(2)} € / ${ceny.balenia.toFixed(2)} € / ${ceny.osoba.toFixed(2)} €`);
    const bezCeny = await page.evaluate(() => nakupItems().filter((r) => r.bezCeny).length);
    t.metrika("položiek bez ceny", bezCeny);

    // ── „mám doma“ odráta položku ───────────────────────────────────────────
    const surovina = await page.evaluate(() => {
      const r = nakupItems().find((x) => x.gkey && !x.ck && x.nazov.length > 3);
      return r ? r.nazov : null;
    });
    await page.fill("#doma-nakup", surovina);
    await page.dispatchEvent("#doma-nakup", "change");
    await page.waitForTimeout(400);
    const doma = await page.evaluate((s) => {
      const r = nakupItems().find((x) => x.nazov === s);
      return { doma: r && r.doma, ck: r && r.ck, ulozene: S.domaNakup };
    }, surovina);
    await t.ok(doma.doma === true && doma.ck === true, `„Mám doma“ („${surovina}“) položku odškrtne`, JSON.stringify(doma));
    // musí zvládnuť aj skloňovanie — kmeňové párovanie, nie čisté includes
    // obsahujeSurovinu berie POLE tokenov (rovnako ako domaTokens()/zakazaneTokens())
    const sklon = await page.evaluate(() => ({
      cibula: obsahujeSurovinu("Cibuľa červená", ["cibuľa"]) && obsahujeSurovinu("cibule", ["cibuľa"]),
      koriander: obsahujeSurovinu("Koriandrové semienka", ["koriander"]),
      huby: obsahujeSurovinu("Hubový bujón", ["huby"]),
      // opačný smer: nesmie chytať cudzie slovo
      med: obsahujeSurovinu("medvedí cesnak", ["med"]),
    }));
    await t.ok(sklon.cibula && sklon.koriander && sklon.huby,
      "„Mám doma“/zakázané chytá skloňované tvary meniace kmeň (koriandrové, hubový)", JSON.stringify(sklon));
    // Nález: prefixové pravidlo (3–5 znakov, +6 navyše) prepustí cudzie slovo — „med" chytá
    // „Medvedí cesnak", „Datle medjool", „Medovka". AUDIT_UI_2026-08-19 to hlási ako opravené,
    // v tomto builde to opravené nie je. Pre zákazy je nadmerné blokovanie zámer (CLAUDE.md),
    // pre „Mám doma" to znamená nekúpenú surovinu → hlásené ako P3, beh sady to neblokuje.
    t.xfail = true;
    await t.ok(sklon.med === false, "„med“ nechytá „medvedí cesnak“ (prefixové pravidlo prepúšťa cudzie slová)", JSON.stringify(sklon));
    t.xfail = false;
    await page.fill("#doma-nakup", "");
    await page.dispatchEvent("#doma-nakup", "change");
    await page.waitForTimeout(400);

    // ── špajza znižuje potrebu ──────────────────────────────────────────────
    const cielSur = await page.evaluate(() => {
      const r = nakupItems().find((x) => x.gkey && x.gramy > 100 && !x.ck);
      return r ? { nazov: r.nazov, gramy: r.gramy } : null;
    });
    await page.evaluate((c) => {
      S.spajza.push({ id: S.spSid++, nazov: c.nazov, mnozstvo: Math.round(c.gramy / 2), jednotka: "g", miesto: "Špajza", expiry: "", min: 0 });
      save(); renderNakup();
    }, cielSur);
    await page.waitForTimeout(200);
    const poSpajzi = await page.evaluate((c) => {
      const r = nakupItems().find((x) => x.nazov === c.nazov);
      return r ? { gramy: r.gramy, zoSpajze: r.zoSpajze, vSpajzi: r.vSpajzi } : null;
    }, cielSur);
    await t.ok(poSpajzi && poSpajzi.gramy < cielSur.gramy,
      `špajza zníži potrebné množstvo (${cielSur.gramy} g → ${poSpajzi && poSpajzi.gramy} g)`, JSON.stringify(poSpajzi));

    // celá zásoba → položka ide do „Mám v špajzi“
    await page.evaluate((c) => { S.spajza[0].mnozstvo = c.gramy * 3; save(); renderNakup(); }, cielSur);
    await page.waitForTimeout(200);
    const uplne = await page.evaluate((c) => {
      const r = nakupItems().find((x) => x.nazov === c.nazov);
      return { vSpajzi: r && r.vSpajzi, sekcia: [...document.querySelectorAll("#nakup-list .odd h4")].some((h) => /Mám v špajzi/i.test(h.textContent)) };
    }, cielSur);
    await t.ok(uplne.vSpajzi === true && uplne.sekcia, "položka plne krytá špajzou ide do sekcie „Mám v špajzi“", JSON.stringify(uplne));
    await page.evaluate(() => { S.spajza = []; save(); renderNakup(); });

    // ── minimálne zásoby → „Doplniť zásoby“ ────────────────────────────────
    await page.evaluate(() => {
      S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 100, jednotka: "g", miesto: "Špajza", expiry: "", min: 1000 }];
      save(); renderNakup();
    });
    await page.waitForTimeout(150);
    const low = await page.evaluate(() => [...document.querySelectorAll("#nakup-list .odd h4")].some((h) => /Doplniť zásoby/i.test(h.textContent)));
    await t.ok(low, "zásoba pod minimom sa objaví v sekcii „Doplniť zásoby“");
    await page.evaluate(() => { S.spajza = []; save(); renderNakup(); });

    // ── ručná položka ───────────────────────────────────────────────────────
    await page.fill("#nakup-manual", "toaletný papier 2 ks");
    await page.click("#v-nakup .plan-head button.btn:not(.primary)");
    await page.waitForTimeout(200);
    const man = await page.evaluate(() => ({
      pocet: (S.nakupManual || []).length,
      nazov: (S.nakupManual[0] || {}).nazov,
      mnoz: (S.nakupManual[0] || {}).mnoz,
      vDOM: document.getElementById("nakup-list").textContent.includes("toaletný papier"),
    }));
    await t.ok(man.pocet === 1 && man.vDOM, "ručná položka sa pridá do zoznamu", JSON.stringify(man));
    await t.ok(man.nazov === "toaletný papier" && man.mnoz === "2 ks", "ručná položka sa rozdelí na názov + množstvo", JSON.stringify(man));

    // ── kopírovanie zoznamu do schránky ─────────────────────────────────────
    const text = await page.evaluate(() => nakupText());
    await t.ok(Array.isArray(text) && text.length > 10, `nakupText() vráti riadky na kopírovanie (${text.length})`, text.slice(0, 3).join(" | "));
    await t.ok(text.some((r) => /toaletný papier/i.test(r)), "ručné položky sú v kopírovanom zozname");
    await page.evaluate(() => window.kopirujListonic());
    await page.waitForTimeout(400);
    const schranka = await page.evaluate(() => navigator.clipboard.readText().catch(() => "")).catch(() => "");
    await t.ok(typeof schranka === "string" && schranka.split("\n").length > 5,
      `kopírovanie naplní schránku (${String(schranka).split("\n").length} riadkov)`, String(schranka).slice(0, 120));
    const toastTxt = await page.evaluate(() => document.getElementById("toast").textContent);
    await t.ok(/Skopírované/i.test(toastTxt), "po kopírovaní sa ukáže potvrdenie", toastTxt);

    // ── klik na názov suroviny ukáže, v ktorom recepte je ──────────────────
    await page.locator("#nakup-list .odd label .sur-klik").first().click();
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      text: (document.getElementById("pick-modal").textContent || "").slice(0, 120),
    }));
    await t.ok(info.otvorene, "klik na surovinu otvorí info „v ktorom recepte“", JSON.stringify(info));
    await zavriOkna(page);

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole v nákupe",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
