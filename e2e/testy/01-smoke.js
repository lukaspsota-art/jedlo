// 01 — Smoke: načítanie, prechod všetkými pohľadmi, čistá konzola
"use strict";
const { prepni, zavriOkna, naplnPlan } = require("../lib");

const VIEWS = ["domov", "recepty", "planovac", "nakup", "vyziva", "spajza", "nastavenia"];

module.exports = {
  nazov: "Smoke a konzola",
  async spusti(E, t) {
    // ── 1. cez lokálny server ────────────────────────────────────────────────
    const page = await E.novaStranka({ url: E.urlHttp });
    await t.ok(await page.title() === "Moja kuchárka", "titulok stránky je „Moja kuchárka“", await page.title());
    const zaklad = await page.evaluate(() => ({
      recepty: RECEPTY.length, potraviny: POTRAVINY.length, jed: JEDALNICKY.length,
    }));
    await t.ok(zaklad.recepty > 1000, "dáta receptov sa nahrali", zaklad.recepty);
    await t.ok(zaklad.potraviny > 300, "databáza potravín sa nahrala", zaklad.potraviny);
    t.metrika("receptov v builde", zaklad.recepty);
    t.metrika("potravín v builde", zaklad.potraviny);

    // prejdi všetky pohľady a over, že sa naozaj prepnú a nič sa nerozsype
    for (const v of VIEWS) {
      await prepni(page, v);
      const stav = await page.evaluate((vv) => {
        const el = document.getElementById("v-" + vv);
        return { aktivny: !!el && el.classList.contains("active"), hash: location.hash, vyska: el ? el.scrollHeight : 0 };
      }, v);
      await t.ok(stav.aktivny, `pohľad „${v}“ sa prepne (má .active)`);
      await t.ok(stav.vyska > 40, `pohľad „${v}“ nie je prázdny (${stav.vyska} px obsahu)`, stav.vyska);
    }
    // hash deep-link
    await t.ok((await page.evaluate(() => location.hash)) === "#nastavenia", "hash sleduje aktívny pohľad (deep-link)");

    // s naplnenými dátami: plán + nákup + výživa
    await prepni(page, "planovac");
    await naplnPlan(page);
    for (const v of ["planovac", "nakup", "vyziva", "domov"]) {
      await prepni(page, v);
      await page.waitForTimeout(150);
    }

    // v32: „🍳 Čo uvarím z toho, čo mám" — tlačidlo na Domove → okno → výsledky → detail receptu
    await page.click('#v-domov .akcie button:has-text("Čo uvarím")');
    await page.fill("#cu-in", "zemiaky, vajce, mlieko, múka, maslo");
    await page.waitForTimeout(600);   // debounce 300 ms
    const cu = await page.evaluate(() => ({
      nadpisy: [...document.querySelectorAll("#cu-out h3")].map((h) => h.textContent),
      riadky: document.querySelectorAll("#cu-out .match").length, ulozene: S.mamDoma,
    }));
    await t.ok(/Uvaríš hneď/.test(cu.nadpisy[0] || "") && cu.riadky > 0,
      "„Čo uvarím“ nájde recepty, ktoré uvaríš hneď", JSON.stringify(cu));
    await t.ok(cu.ulozene === "zemiaky, vajce, mlieko, múka, maslo", "zoznam „čo mám doma“ sa zapamätá", cu.ulozene);
    await page.click("#cu-out .match .cu-nazov");
    await t.ok(await page.evaluate(() => document.getElementById("overlay").classList.contains("open")
      && !document.getElementById("pick-overlay").classList.contains("open")), "klik na názov otvorí detail receptu");
    await zavriOkna(page);

    // v33: „🍸 Môj bar" — Domov ⋯ Viac → okno → zaškrtnúť fľašu → „Chýba 1 vec" + „Čo dokúpiť"
    await page.click('#v-domov .akcie button:has-text("Viac")');
    await page.click('#m-dom a:has-text("Môj bar")');
    await page.check('#bar-zoz input[data-bar="limoncello"]');
    const bar = await page.evaluate(() => ({
      nadpisy: [...document.querySelectorAll("#bar-out h3")].map((h) => h.textContent).join(" | "),
      ulozene: S.bar, chipy: document.querySelectorAll("#bar-chips .chip").length,
    }));
    await t.ok(/Chýba 1 vec/.test(bar.nadpisy) && /Čo dokúpiť/.test(bar.nadpisy) && bar.ulozene === "limoncello",
      "„Môj bar“ po zaškrtnutí limoncella ukáže, čomu chýba 1 vec a čo dokúpiť", JSON.stringify(bar));
    await t.ok(bar.chipy > 2, "„Môj bar“ má chipy podľa destilátu", String(bar.chipy));
    await zavriOkna(page);

    await t.ok(page.chyby.length === 0, "žiadna chyba/výnimka v konzole počas celého priechodu (http)",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));

    // ── 2. deep-link priamo na hash ─────────────────────────────────────────
    const dl = await E.novaStranka({ url: E.urlHttp + "#nakup" });
    await t.ok(await dl.evaluate(() => document.getElementById("v-nakup").classList.contains("active")),
      "deep-link #nakup otvorí Nákup hneď po načítaní");
    await E.zavri(dl);

    // ── 3. cez file:// (offline single-file) ────────────────────────────────
    const f = await E.novaStranka({ url: E.urlFile });
    const okFile = await f.evaluate(() => typeof RECEPTY !== "undefined" && document.getElementById("grid").children.length > 0);
    await t.ok(okFile, "appka funguje aj z file:// (offline jeden súbor)");
    for (const v of VIEWS) { await prepni(f, v); }
    await prepni(f, "planovac");
    await naplnPlan(f);
    await prepni(f, "nakup");
    await t.ok(f.chyby.length === 0, "žiadna chyba/výnimka v konzole cez file://",
      f.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    // localStorage musí fungovať aj z file:// — inak by sa nič neuložilo
    const lsFile = await f.evaluate(() => { try { return !!localStorage.getItem("kucharka_v2"); } catch (e) { return "THROW:" + e.name; } });
    await t.ok(lsFile === true, "localStorage funguje aj z file://", lsFile);
    await E.zavri(f);

    // ── 4. prvý spust: onboarding ───────────────────────────────────────────
    const nov = await E.novaStranka({ stav: null });
    const ob = await nov.evaluate(() => ({
      otvorene: document.getElementById("pick-overlay").classList.contains("open"),
      text: (document.getElementById("pick-modal").textContent || "").slice(0, 60),
    }));
    await t.ok(ob.otvorene && /Vitaj/.test(ob.text), "pri prvom spustení sa otvorí onboarding", JSON.stringify(ob));
    // „Preskočiť“ musí okno zavrieť a zapamätať si to
    await nov.evaluate(() => { window.dokonciOnboarding(); window.zavriPick(); });
    await nov.waitForTimeout(400);   // zavriPick zahodí history-stav modálu; reload až potom
    await nov.reload({ waitUntil: "load" });
    await nov.waitForFunction(() => typeof RECEPTY !== "undefined");
    await t.ok(!(await nov.evaluate(() => document.getElementById("pick-overlay").classList.contains("open"))),
      "po dokončení onboardingu sa už pri reloade neotvára");
    await E.zavri(nov);

    await E.zavri(page);
  },
};
