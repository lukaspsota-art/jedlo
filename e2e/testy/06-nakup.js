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
      const oddelenia = [...document.querySelectorAll("#nakup-list .odd h3")].map((h) => h.textContent.trim());
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
      const zoznam = [...document.querySelectorAll("#nakup-list .odd h3")].map((h) => h.textContent.trim())
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
    await page.waitForTimeout(2000); // kolo 7–10: zoznam sa preusporiada až 1,6 s po poslednom ťuku (riadok neodskočí spod prsta)
    const poZaskrtnuti = await page.evaluate(() => ({
      hotove: document.querySelectorAll("#nakup-list .done-sekcia label").length,
      kluce: Object.keys(S.nakupCheck).length,
      maSekciu: [...document.querySelectorAll("#nakup-list .odd h3")].some((h) => /Už máme|v košíku/i.test(h.textContent)),
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
      zoznamText: (document.getElementById("nakup-list") || {}).textContent || "",
    }));
    await t.ok(ceny.spotreba > 1, `režim „spotreba“ vráti cenu (${ceny.spotreba.toFixed(2)} €)`, JSON.stringify(ceny));
    await t.ok(ceny.balenia >= ceny.spotreba - 0.01, "režim „balenia“ nie je nižší ako spotreba (kupuješ celé balenia)", `${ceny.balenia} vs ${ceny.spotreba}`);
    await t.ok(Math.abs(ceny.osoba - ceny.spotreba / ceny.ludi) < 0.01, "režim „osoba“ = spotreba / počet stravníkov", JSON.stringify(ceny));
    // v31: ceny appka neukazuje — cenaTyzdna ostáva pre generátor (4 cenové úrovne), nie pre obrazovku
    const cenaVZozname = (ceny.zoznamText.match(/[^.]{0,40}(€|\? cena|spotrebuješ)[^.]{0,20}/) || [""])[0];
    await t.ok(!cenaVZozname, "Nákup neukazuje žiadnu cenu (ani súhrn, ani „? cena“ pri položke)", cenaVZozname);
    const zaklady = await page.evaluate(() => { const d = document.querySelector("#nakup-list details.zaklady"); return d ? d.open : null; });
    await t.ok(zaklady !== false, "dochucovadlá a základné veci sú rozbalené (v31)", String(zaklady));
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
    // v33: prefixové pravidlo (3–5 znakov, +6 navyše) je preč — obsahujeSurovinu páruje tvar slova.
    // Zákaz „med" medvedí cesnak blokuje aj tak (podreťazec v zakazaneChyta).
    await t.ok(sklon.med === false, "„med“ nechytá „medvedí cesnak“ (tvar slova, nie prefix)", JSON.stringify(sklon));
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
      return { vSpajzi: r && r.vSpajzi, sekcia: [...document.querySelectorAll("#nakup-list .odd h3")].some((h) => /Mám v špajzi/i.test(h.textContent)) };
    }, cielSur);
    await t.ok(uplne.vSpajzi === true && uplne.sekcia, "položka plne krytá špajzou ide do sekcie „Mám v špajzi“", JSON.stringify(uplne));
    await page.evaluate(() => { S.spajza = []; save(); renderNakup(); });

    // ── minimálne zásoby → „Doplniť zásoby“ ────────────────────────────────
    await page.evaluate(() => {
      S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 100, jednotka: "g", miesto: "Špajza", expiry: "", min: 1000 }];
      save(); renderNakup();
    });
    await page.waitForTimeout(150);
    // audit 30. 9.: zásoba pod minimom je riadok s políčkom v SVOJOM oddelení (do v33 <label> bez
    // checkboxu v sekcii navrchu); keď ryžu pýta aj plán, pribudne „+ doplniť zásobu" k jej riadku
    const low = await page.evaluate(() => { const r = [...document.querySelectorAll("#nakup-list .odd .nak-row")]
      .find((x) => /Ryža/.test(x.textContent) && /pod minimom|doplniť zásobu/.test(x.textContent));
      return r ? { checkbox: !!r.querySelector("input[type=checkbox]"), odd: r.closest(".odd").querySelector("h3").textContent } : null; });
    await t.ok(low && low.checkbox && /Cestoviny a ryža/.test(low.odd), "zásoba pod minimom je v nákupe ako odškrtnuteľná položka vo svojom oddelení", JSON.stringify(low));
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

    // ── vlna 3: celý riadok odškrtáva, info má vlastné tlačidlo ⓘ ──────────
    // Predtým bol názov suroviny klikateľný (.sur-klik) a `preventDefault()` v ňom rušil
    // odškrtnutie labelu. Dnes: <label> = odškrtnutie, ⓘ (súrodenec labelu) = info.
    const stavba = await page.evaluate(() => {
      const row = document.querySelector("#nakup-list .nak-row");
      if (!row) return null;
      const lab = row.querySelector("label"), inf = row.querySelector(".nak-i");
      return {
        maLabel: !!lab, maInfo: !!inf,
        infoVLabeli: !!(inf && lab && lab.contains(inf)),
        klikNaNazve: !!row.querySelector("label .sur-klik, label [onclick]"),
        infoRozmer: inf ? [Math.round(inf.getBoundingClientRect().width), Math.round(inf.getBoundingClientRect().height)] : null,
      };
    });
    await t.ok(stavba && stavba.maLabel && stavba.maInfo, "riadok nákupu má <label> aj tlačidlo ⓘ", JSON.stringify(stavba));
    await t.ok(stavba && !stavba.infoVLabeli, "ⓘ je súrodenec labelu, nie jeho potomok (inak by ho klik prekryl)", JSON.stringify(stavba));
    await t.ok(stavba && !stavba.klikNaNazve, "názov suroviny už nie je samostatný klikací cieľ vnútri labelu", JSON.stringify(stavba));

    await page.locator("#nakup-list .nak-row .nak-i").first().click();
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      text: (document.getElementById("pick-modal").textContent || "").slice(0, 120),
    }));
    await t.ok(info.otvorene, "ⓘ otvorí info „v ktorom recepte · čím nahradiť“", JSON.stringify(info));
    await zavriOkna(page);

    // ── audit 30. 9. (Balík 5): nákup po várkach ────────────────────────────
    await page.evaluate(() => { S.nakupCheck = {}; S.spajza = []; S.nakupVarky = {}; save(); renderNakup(); });
    await page.waitForTimeout(150);
    const varky = await page.evaluate(() => [...document.querySelectorAll("#nakup-list .varka")]
      .map((b) => ({ tag: b.tagName, pressed: b.getAttribute("aria-pressed"), chip: b.classList.contains("chip"), txt: b.textContent })));
    await t.ok(varky.length === 3 && varky.every((v) => v.tag === "BUTTON" && v.pressed === "true" && !v.chip),
      "„Nakupujem na: A · B · C“ sú tlačidlá s aria-pressed, predvolene všetky várky", JSON.stringify(varky));
    await page.click("#varka-0"); await page.waitForTimeout(150);
    await page.click("#varka-1"); await page.waitForTimeout(150);
    const lenC = await page.evaluate(() => ({
      pressed: [...document.querySelectorAll("#nakup-list .varka")].map((b) => b.getAttribute("aria-pressed")).join(","),
      vyber: JSON.stringify(nakupVyber()),
      riadkov: document.querySelectorAll("#nakup-list .odd .nak-row").length,
      znakyMimoC: [...document.querySelectorAll("#nakup-list .odd .nak-row .znak")].filter((z) => z.textContent.trim() !== "C").length,
      vsetkych: nakupItems(null).length, vC: nakupItems([2]).length,
    }));
    await t.ok(lenC.pressed === "false,false,true" && lenC.vyber === "[2]" && lenC.riadkov > 0 && lenC.znakyMimoC === 0 && lenC.vC < lenC.vsetkych,
      `výber „len C“ nechá v zozname len suroviny várky C (${lenC.vC} z ${lenC.vsetkych} riadkov)`, JSON.stringify(lenC));
    await page.click("#varka-0"); await page.waitForTimeout(150);
    await page.click("#varka-1"); await page.waitForTimeout(150);
    await t.ok(await page.evaluate(() => nakupVyber() === null), "zapnutím všetkých várok je nákup opäť na celý týždeň");

    // ── 🎉 a prúžok majú jedno pravidlo; posledné odškrtnutie → „📥 Kúpené do špajze“ ──
    await page.evaluate(() => { const Z = nakupZoznam(null);
      Z.oddelenia.flatMap((o) => o.rows).slice(1).forEach((r) => (r.man ? checkManual(r.id, true) : checkNakup(r.key, true))); });
    await page.waitForTimeout(200);
    const stavNakupu = () => page.evaluate(() => { const p = document.querySelector("#nakup-list .nak-pruh");
      return { oslava: /Máš všetko v košíku/.test(document.getElementById("nakup-list").textContent),
        now: p ? +p.getAttribute("aria-valuenow") : null, max: p ? +p.getAttribute("aria-valuemax") : null,
        pocet: (document.querySelector("#nakup-list .nak-pocet") || {}).textContent || "",
        fokus: document.activeElement ? document.activeElement.tagName : "",
        toast: document.getElementById("toast").textContent, spat: !!document.querySelector("#toast .toast-akcia") }; });
    const predPoslednou = await stavNakupu();
    await t.ok(!predPoslednou.oslava && predPoslednou.now === predPoslednou.max - 1 && /\d+ \/ \d+ v košíku/.test(predPoslednou.pocet),
      `pred poslednou položkou: „${predPoslednou.pocet}“ a 🎉 ešte nesvieti`, JSON.stringify(predPoslednou));
    await page.locator("#nakup-list .odd:not(.done-sekcia) .nak-row label").first().click();
    await page.waitForTimeout(350);
    const poPoslednej = await stavNakupu();
    await t.ok(poPoslednej.oslava && poPoslednej.now === poPoslednej.max,
      "posledné odškrtnutie: prúžok na 100 % a 🎉 naraz", JSON.stringify(poPoslednej));
    // kolo 9 (ovládanie): toast po odškrtnutí je BEZ tlačidla — „↩ Späť" stálo nad ďalším riadkom a chytalo ťuky; späť = ťuk znova
    await t.ok(!poPoslednej.spat && /v košíku/.test(poPoslednej.toast), "odškrtnutie povie „v košíku“ bez tlačidla nad zoznamom", JSON.stringify(poPoslednej));
    await t.ok(poPoslednej.fokus !== "BODY", `fokus po odškrtnutí nespadne na <body> (${poPoslednej.fokus})`, JSON.stringify(poPoslednej));
    const spPred = await page.evaluate(() => S.spajza.length);
    await page.click("#nakup-list .nak-hotovo .btn.primary");
    await page.waitForTimeout(300);
    const spPo = await page.evaluate(() => ({ n: S.spajza.length, odskrtnute: Object.keys(S.nakupCheck).length,
      exp: S.spajza.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.expiry || "")), jednotky: [...new Set(S.spajza.map((x) => x.jednotka))].join(","),
      toast: document.getElementById("toast").textContent }));
    await t.ok(spPo.n > spPred + 10 && spPo.exp && /Do špajze/.test(spPo.toast),
      `„📥 Kúpené do špajze“ presunie odškrtnuté do špajze s odhadom expirácie (${spPo.n} zásob, jednotky ${spPo.jednotky})`, JSON.stringify(spPo));
    t.metrika("kúpené do špajze (1 týždeň, 2 osoby)", `${spPo.n} zásob · jednotky ${spPo.jednotky}`);
    await page.click("#toast .toast-akcia");
    await page.waitForTimeout(200);
    await t.ok(await page.evaluate((n) => S.spajza.length === n, spPred), "„↩ Späť“ vráti špajzu aj odškrtnutie");
    await page.evaluate(() => { S.nakupCheck = {}; save(); renderNakup(); });

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole v nákupe",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
