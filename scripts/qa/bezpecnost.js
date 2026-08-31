// QA: nezávislé overenie bezpečnostných tvrdení STAV_PO_VLNE3.
//  A) escapovanie používateľských dát (XSS cez 5 vstupov)
//  B) appka sa nedá zložiť poškodeným localStorage (24 druhov poškodenia)
// Beh: node scripts/qa/bezpecnost.js
"use strict";
const { Tester, vytvorProstredie } = require("../../e2e/lib");

const XSS = '"><img src=x onerror="window.__xss=(window.__xss||0)+1"><script>window.__xss=(window.__xss||0)+1<\/script>';
const XSS2 = "'\"><svg onload=\"window.__xss=(window.__xss||0)+1\">";

(async () => {
  const t = new Tester();
  const E = await vytvorProstredie(t);
  let zle = 0;

  // ── A) XSS ────────────────────────────────────────────────────────────────
  console.log("══ A) Escapovanie používateľských dát ══");
  const p = await E.novaStranka({ viewport: { width: 393, height: 850 } });
  await p.evaluate(async () => { window.prepni("planovac"); await window.generujJedalnicek(true); });
  await p.waitForTimeout(600);

  const vektory = [
    ["meno stravníka", (x) => { S.profil.stravnici = [{ nazov: x, kcal: 1450 }, { nazov: "B", kcal: 1200 }]; save(); prepni("domov"); renderDash(); prepni("planovac"); renderPlan(); prepni("nastavenia"); renderProfil && renderProfil(); }],
    ["názov jedálnička (archív)", (x) => { S.archiv = [{ id: "a1", nazov: x, od: S.viewOd, plan: {} }]; save(); window.otvorArchiv && window.otvorArchiv(); }],
    ["poznámka k receptu", (x) => { const id = RECEPTY[0].id; S.pozn[id] = x; save(); otvor(id); }],
    ["vlastná položka nákupu", (x) => { S.nakupManual = [{ id: "m1", nazov: x, mnoz: x, odd: "Ostatné", done: false }]; save(); prepni("nakup"); renderNakup(); }],
    ["vlastný recept", (x) => {
      S.moje = [{ id: "moj-xss", nazov: x, kategoria: "Hlavné jedlo", kuchyna: x, porcie: 2, cas: x, popis: x,
        ingrediencie: [{ nazov: x, mnozstvo: 1, jednotka: "g", poznamka: x }], postup: [x], tipy: x, tagy: [x], _moj: true }];
      save(); location.reload();
    }],
    ["položka špajze", (x) => { S.spajza = [{ id: 1, nazov: x, mnozstvo: 1, jednotka: x, miesto: x, expiry: "2026-09-02", min: 0 }]; save(); prepni("spajza"); renderSpajza(); }],
    ["akcie / watch-list / zakázané", (x) => { S.akcie = x; S.profil.watch = x; S.profil.zakazane = x; save(); prepni("recepty"); renderGrid(); prepni("nastavenia"); }],
    ["názov vlastného rozvrhu", (x) => { S.rozvrhy = [{ id: "r1", nazov: x, hranice: [true, false, true, false, false, true, false] }]; save(); otvorRozvrh(); }],
  ];

  for (const [meno, fn] of vektory) {
    for (const utok of [XSS, XSS2]) {
      await p.evaluate(() => { window.__xss = 0; });
      try { await p.evaluate(`(${fn.toString()})(${JSON.stringify(utok)})`); } catch (e) { /* reload vo vlastnom recepte */ }
      await p.waitForTimeout(400);
      // po reloade treba počkať na appku
      await p.waitForFunction(() => typeof RECEPTY !== "undefined", null, { timeout: 15000 }).catch(() => {});
      const r = await p.evaluate(() => ({
        xss: window.__xss || 0,
        injektovane: document.querySelectorAll("img[src='x'], svg[onload]").length,
        text: document.body.innerText.includes("onerror=") || document.body.innerText.includes("<img"),
      }));
      const ok = r.xss === 0 && r.injektovane === 0;
      if (!ok) zle++;
      console.log(`  ${ok ? "BEZPEČNÉ" : "PRENIKLO "} ${meno.padEnd(28)} ${JSON.stringify(r)}`);
      await p.evaluate(() => { try { zavriPick(); zavri(); } catch (e) {} localStorage.removeItem("kucharka_v2"); });
    }
    await p.goto(E.urlHttp, { waitUntil: "load" });
    await p.waitForFunction(() => typeof RECEPTY !== "undefined", null, { timeout: 20000 });
    await p.evaluate(async () => { window.prepni("planovac"); await window.generujJedalnicek(true); });
  }
  await E.zavri(p);

  // ── B) poškodený localStorage ─────────────────────────────────────────────
  console.log("\n══ B) Poškodený localStorage (24 druhov) ══");
  const POSKODENIA = [
    ["nevalidný JSON", "{ toto nie je JSON ]]"],
    ["prázdny reťazec", ""],
    ["null literál", "null"],
    ["pole namiesto objektu", "[1,2,3]"],
    ["číslo", "42"],
    ["reťazec", '"ahoj"'],
    ["true", "true"],
    ["hlboko zanorený objekt", JSON.stringify({ a: { b: { c: { d: { e: { f: 1 } } } } } })],
    ["plan je reťazec", JSON.stringify({ plan: "nie objekt", profil: { kcal: 1450 } })],
    ["plan má neplatné hodnoty", JSON.stringify({ plan: { "2026-08-31": { Obed: 5 }, x: null } })],
    ["profil je pole", JSON.stringify({ profil: [1, 2] })],
    ["profil.kcal je text", JSON.stringify({ profil: { kcal: "veľa", osoby: "dve" } })],
    ["stravníci sú čísla", JSON.stringify({ profil: { stravnici: [1, 2, 3] } })],
    ["stravníci s NaN kcal", JSON.stringify({ profil: { stravnici: [{ nazov: "A", kcal: null }, { nazov: null, kcal: -5 }] } })],
    ["hranice sú krátke pole", JSON.stringify({ hranice: [true] })],
    ["hranice sú objekt", JSON.stringify({ hranice: { 0: true } })],
    ["fav/hodn/pozn sú polia", JSON.stringify({ fav: [], hodn: [], pozn: [] })],
    ["spajza je objekt", JSON.stringify({ spajza: { a: 1 } })],
    ["spajza s nezmyslami", JSON.stringify({ spajza: [{ id: 1, nazov: 5, mnozstvo: "x", expiry: 7, min: {} }] })],
    ["nakupCheck je reťazec", JSON.stringify({ nakupCheck: "x" })],
    ["nakupManual je číslo", JSON.stringify({ nakupManual: 7 })],
    ["archiv je reťazec", JSON.stringify({ archiv: "nic" })],
    ["uvarene s neplatnými id", JSON.stringify({ uvarene: [{ id: null, datum: 12 }, 5, "x"] })],
    ["viewOd je nezmysel", JSON.stringify({ viewOd: "toto nie je dátum" })],
    ["genCfg je pole", JSON.stringify({ genCfg: [1, 2] })],
    ["obrovský reťazec v profile", JSON.stringify({ profil: { kcal: 1450, syncId: "x".repeat(50000) } })],
    ["prototype pollution", '{"__proto__":{"polluted":1},"profil":{"kcal":1450}}'],
    ["moje recepty sú nezmysel", JSON.stringify({ moje: [null, 5, { id: null }] })],
  ];
  let zlyLS = 0;
  for (const [meno, stav] of POSKODENIA) {
    const q = await E.novaStranka({ viewport: { width: 393, height: 850 }, stav, bezMriezky: true });
    await q.waitForTimeout(200);
    let ok = true, detail = {};
    try {
      await q.waitForFunction(() => typeof RECEPTY !== "undefined", null, { timeout: 15000 });
      for (const v of ["domov", "recepty", "planovac", "nakup", "vyziva", "spajza", "doma", "nastavenia"]) {
        await q.evaluate((x) => window.prepni(x), v);
      }
      await q.evaluate(async () => { await window.generujJedalnicek(true); });
      await q.evaluate(() => { window.renderNakup(); window.renderPlan(); window.renderDash(); window.save(); });
      detail = await q.evaluate(() => ({
        recepty: RECEPTY.length, kariet: document.getElementById("grid").children.length,
        kcal: S.profil.kcal, stravnikov: (S.profil.stravnici || []).length,
        polluted: ({}).polluted === undefined ? "nie" : "ÁNO",
        ulozene: (() => { try { return typeof JSON.parse(localStorage.getItem("kucharka_v2")) === "object"; } catch (e) { return false; } })(),
      }));
      ok = detail.recepty > 1000 && detail.kariet > 0 && detail.kcal > 0 && detail.ulozene && detail.polluted === "nie" && q.chyby.length === 0;
      if (q.chyby.length) detail.chyby = q.chyby.slice(0, 2).map(c => c.text.slice(0, 120));
    } catch (e) { ok = false; detail = { vynimka: String(e).slice(0, 140) }; }
    if (!ok) zlyLS++;
    console.log(`  ${ok ? "PREŽILA " : "PADLA   "} ${meno.padEnd(32)} ${JSON.stringify(detail)}`);
    await E.zavri(q);
  }

  console.log(`\nXSS: ${zle} prienikov z ${vektory.length * 2} pokusov`);
  console.log(`localStorage: ${POSKODENIA.length - zlyLS} / ${POSKODENIA.length} druhov poškodenia appka ustála`);
  await E.koniec();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
