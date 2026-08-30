// 02 — Recepty: hľadanie, filtre, chipy, prázdny výsledok, obľúbené/hodnotenie/poznámka + reload
"use strict";
const { prepni, zavriOkna } = require("../lib");

async function pocetKariet(page) {
  return page.evaluate(() => document.getElementById("grid").children.length);
}
async function hladaj(page, q) {
  await page.fill("#hladaj", q);
  await page.evaluate(() => window.renderGrid());   // obídeme 200 ms debounce, výsledok je identický
  await page.waitForTimeout(60);
}

module.exports = {
  nazov: "Recepty (hľadanie a filtre)",
  async spusti(E, t) {
    const page = await E.novaStranka();
    await prepni(page, "recepty");
    const vsetkyN = await pocetKariet(page);
    await t.ok(vsetkyN > 1000, "mriežka vykreslí recepty", vsetkyN);

    // ── hľadanie podľa názvu ─────────────────────────────────────────────────
    await hladaj(page, "guláš");
    const gulas = await pocetKariet(page);
    await t.ok(gulas > 0 && gulas < vsetkyN, `hľadanie podľa názvu („guláš“) filtruje: ${gulas} z ${vsetkyN}`, gulas);
    const nazvySedia = await page.evaluate(() =>
      [...document.querySelectorAll("#grid .card h3")].slice(0, 10).map((h) => h.textContent));
    await t.ok(nazvySedia.length > 0, "výsledky hľadania majú názvy");

    // ── hľadanie podľa suroviny (nie je v názve) ────────────────────────────
    await hladaj(page, "kmín");
    const kmin = await pocetKariet(page);
    const kminBezNazvu = await page.evaluate(() => {
      // aspoň jeden zásah, ktorý slovo NEMÁ v názve → našlo sa cez ingredienciu/popis
      return [...document.querySelectorAll("#grid .card h3")]
        .some((h) => !h.textContent.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes("kmin"));
    });
    await t.ok(kmin > 0, `hľadanie podľa suroviny („kmín“) nájde recepty: ${kmin}`, kmin);
    await t.ok(kminBezNazvu, "hľadanie prehľadáva aj ingrediencie, nielen názov");

    // ── skloňovanie (iný pád) ───────────────────────────────────────────────
    await hladaj(page, "paradajka");
    const p1 = await pocetKariet(page);
    await hladaj(page, "paradajky");
    const p2 = await pocetKariet(page);
    await t.ok(p1 > 0, "„paradajka“ (1. pád) nájde recepty — kmeňové párovanie", p1);
    await t.ok(p2 > 0, "„paradajky“ (iný pád) nájde recepty", p2);
    t.metrika("zásahov „paradajka“ / „paradajky“", `${p1} / ${p2}`);

    // ── prázdny výsledok ────────────────────────────────────────────────────
    await hladaj(page, "xyzquwabc");
    const prazdny = await page.evaluate(() => {
      const em = document.getElementById("empty");
      return { kariet: document.getElementById("grid").children.length, vidno: getComputedStyle(em).display !== "none", text: em.textContent.trim() };
    });
    await t.ok(prazdny.kariet === 0 && prazdny.vidno, "prázdny výsledok zobrazí hlášku", JSON.stringify(prazdny));
    await t.ok(/Zrušiť filtre/i.test(prazdny.text), "prázdny stav ponúka „Zrušiť filtre“", prazdny.text);
    // zrušenie filtrov vráti všetko
    await page.evaluate(() => window.zrusFiltre());
    await t.ok(await pocetKariet(page) === vsetkyN, "„Zrušiť filtre“ obnoví celý zoznam");

    // ── počítadlo aktívnych filtrov #f-cnt ──────────────────────────────────
    const cnt = async () => page.evaluate(() => {
      const e = document.getElementById("f-cnt");
      return { text: e.textContent, hidden: e.hidden };
    });
    await t.ok((await cnt()).hidden, "#f-cnt je skryté, kým nie je aktívny filter");
    await page.selectOption("#f-cas", "35");
    await page.evaluate(() => window.renderGrid());
    let c = await cnt();
    await t.ok(!c.hidden && c.text === "1", "#f-cnt ukáže 1 po zapnutí filtra času", JSON.stringify(c));
    await page.selectOption("#f-diet", "veg");
    await page.evaluate(() => window.renderGrid());
    c = await cnt();
    await t.ok(!c.hidden && c.text === "2", "#f-cnt ukáže 2 pri dvoch filtroch", JSON.stringify(c));

    // ── kombinácia filtrov naozaj zužuje ────────────────────────────────────
    const vegRychle = await pocetKariet(page);
    await page.selectOption("#f-diet", "");
    await page.evaluate(() => window.renderGrid());
    const lenRychle = await pocetKariet(page);
    await t.ok(vegRychle > 0 && vegRychle < lenRychle,
      `kombinácia „do 35 min“ + „vegetariánske“ zúži výsledok (${vegRychle} < ${lenRychle})`, `${vegRychle} vs ${lenRychle}`);
    // over, že filter „do 35 min“ naozaj drží
    const casOk = await page.evaluate(() => [...document.querySelectorAll("#grid .card")].slice(0, 40)
      .every((k) => { const m = (k.querySelector(".meta") || {}).textContent || ""; const mm = m.match(/(\d+)\s*min/); return !mm || +mm[1] <= 35; }));
    await t.ok(casOk, "filter času naozaj vylučuje dlhšie recepty");
    await page.evaluate(() => window.zrusFiltre());

    // ── radenie ─────────────────────────────────────────────────────────────
    await page.selectOption("#f-sort", "nazov");
    await page.evaluate(() => window.renderGrid());
    const zoradene = await page.evaluate(() =>
      [...document.querySelectorAll("#grid .card h3")].slice(0, 30).map((h) => h.textContent));
    const spravne = zoradene.every((x, i) => i === 0 || zoradene[i - 1].localeCompare(x, "sk") <= 0);
    await t.ok(spravne, "radenie „Názov A–Z“ zoradí mriežku", zoradene.slice(0, 4).join(" | "));
    await page.selectOption("#f-sort", "");
    await page.evaluate(() => window.renderGrid());

    // ── chipy kategórií ─────────────────────────────────────────────────────
    const chipy = await page.evaluate(() => [...document.querySelectorAll("#chips .chip")].map((c) => c.textContent.trim()));
    await t.ok(chipy.length > 3 && chipy[0] === "Všetko", `chipy kategórií sa vykreslia (${chipy.length})`, chipy.join(", "));
    const kat = chipy.find((x) => x === "Polievka") || chipy[1];
    await page.evaluate((k) => {
      [...document.querySelectorAll("#chips .chip")].find((c) => c.textContent.trim() === k).click();
    }, kat);
    await page.waitForTimeout(150);
    const poKat = await pocetKariet(page);
    const vsetkyRovnake = await page.evaluate((k) =>
      [...document.querySelectorAll("#grid .card .kat")].slice(0, 50).every((e) => e.textContent.trim() === k), kat);
    await t.ok(poKat > 0 && poKat < vsetkyN, `chip kategórie „${kat}“ filtruje (${poKat})`, poKat);
    await t.ok(vsetkyRovnake, `všetky karty po chipe „${kat}“ majú túto kategóriu`);
    const aktivny = await page.evaluate(() => document.querySelectorAll("#chips .chip.active").length);
    await t.ok(aktivny === 1, "aktívny je práve jeden chip", aktivny);
    await page.evaluate(() => window.zrusFiltre());

    // ── obľúbené / hodnotenie / poznámka + prežitie reloadu ─────────────────
    const id = await page.evaluate(() => RECEPTY.find((r) => (r.postup || []).length >= 2).id);
    await page.evaluate((i) => window.toggleFav(i), id);
    await page.evaluate((i) => window.hodnot(i, 4), id);
    await page.evaluate(() => window.zavri());
    await page.evaluate((i) => { S.pozn[i] = "moja e2e poznámka"; save(); }, id);

    const predReloadom = await page.evaluate((i) => ({ fav: !!S.fav[i], hodn: S.hodn[i], pozn: S.pozn[i] }), id);
    await t.ok(predReloadom.fav === true && predReloadom.hodn === 4, "obľúbené a hodnotenie sa nastavili", JSON.stringify(predReloadom));

    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => typeof RECEPTY !== "undefined");
    const poReloade = await page.evaluate((i) => ({ fav: !!S.fav[i], hodn: S.hodn[i], pozn: S.pozn[i] }), id);
    await t.ok(poReloade.fav === true, "obľúbené prežije reload (localStorage kucharka_v2)", JSON.stringify(poReloade));
    await t.ok(poReloade.hodn === 4, "hodnotenie prežije reload", JSON.stringify(poReloade));
    await t.ok(poReloade.pozn === "moja e2e poznámka", "poznámka prežije reload", JSON.stringify(poReloade));

    // hviezdička na karte odráža obľúbené
    await prepni(page, "recepty");
    await page.selectOption("#f-diet", "fav");
    await page.evaluate(() => window.renderGrid());
    const favN = await pocetKariet(page);
    await t.ok(favN === 1, "filter „Len obľúbené“ ukáže práve označený recept", favN);
    const hviezda = await page.evaluate(() => (document.querySelector("#grid .card .fav") || {}).textContent);
    await t.ok(hviezda === "★", "karta obľúbeného receptu má plnú hviezdu", hviezda);
    await page.evaluate(() => window.zrusFiltre());

    // ── poznámka sa píše do textarey (skutočný input, nie iba API) ──────────
    await page.evaluate((i) => window.otvor(i), id);
    await page.fill("#poznamka", "prepísané z UI");
    await page.waitForTimeout(80);
    const poznUI = await page.evaluate((i) => S.pozn[i], id);
    await t.ok(poznUI === "prepísané z UI", "písanie do poznámky sa ukladá priebežne", poznUI);
    await zavriOkna(page);

    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole počas práce s receptami",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
