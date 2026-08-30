// 13 — Odolnosť: poškodený localStorage, prázdny plán, veľmi dlhé názvy, nezmyselné dáta
"use strict";
const { prepni, zavriOkna, naplnPlan } = require("../lib");

const DLHY = "Extrémne dlhý názov receptu bez jediného zalomenia " + "Aaaaaaaaaaaaaaaaaaaaaa".repeat(12);
// 40 znakov bez medzery — realistický preklep alebo zlepené slovo. Merané: pretekať začína pri 30.
const DLHE_SLOVO = "Instantnékakaovéraňajkovévločkyjemné1000g";

module.exports = {
  nazov: "Odolnosť",
  async spusti(E, t) {
    // ── 1. nevalidný JSON v kucharka_v2 ─────────────────────────────────────
    const zly = await E.novaStranka({ stav: "{ toto nie je JSON ]]" });
    const s1 = await zly.evaluate(() => ({
      recepty: typeof RECEPTY !== "undefined" ? RECEPTY.length : 0,
      kariet: document.getElementById("grid").children.length,
      profil: !!(typeof S !== "undefined" && S.profil && S.profil.kcal),
    }));
    await t.ok(s1.recepty > 1000 && s1.kariet > 1000, "appka sa načíta aj s poškodeným localStorage", JSON.stringify(s1));
    await t.ok(s1.profil, "poškodený stav sa nahradí predvoleným profilom", JSON.stringify(s1));
    for (const v of ["recepty", "planovac", "nakup", "vyziva", "spajza", "nastavenia", "domov"]) await prepni(zly, v);
    await t.ok(zly.chyby.length === 0, "poškodený localStorage nevyhodí chybu do konzoly",
      zly.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    // a appka si stav opraví
    await zly.evaluate(() => save());
    const opraveny = await zly.evaluate(() => { try { return typeof JSON.parse(localStorage.getItem("kucharka_v2")) === "object"; } catch (e) { return false; } });
    await t.ok(opraveny, "prvý zápis prepíše poškodený stav validným JSON-om");
    await E.zavri(zly);

    // ── 2. stav so správnym JSON, ale nezmyselnými typmi ───────────────────
    // Reálna cesta: „Obnoviť zo zálohy" berie ľubovoľný JSON súbor (S = Object.assign(S, o))
    // a syncPull tiež. Ak niektoré pole príde ako iný typ, appka to nesmie zložiť.
    const POLIA = [
      ["spajza", { a: 1 }], ["uvarene", "x"], ["fav", "x"], ["plan", [1, 2]], ["hodn", null],
      ["nakupManual", 5], ["archiv", "y"], ["vahy", {}], ["mojeRecepty", "z"], ["hranice", "abc"],
      ["planF", 42], ["skryte", "q"], ["dayPpl", "w"], ["nakupCheck", "e"], ["pozn", 1],
      ["genCfg", "g"], ["daySloty", "d"], ["slotPpl", "s"], ["tyzdenProfil", "t"], ["profil", "text"],
    ];
    const padli = [];
    for (const [kluc, hodnota] of POLIA) {
      const st = { profil: { onboarded: true, kcal: 1450 } };
      st[kluc] = hodnota;
      const p2 = await E.novaStranka({ stav: JSON.stringify(st) });
      const zle = [];
      for (const v of ["domov", "recepty", "planovac", "nakup", "vyziva", "spajza", "nastavenia"]) {
        try { await p2.evaluate((vv) => window.prepni(vv), v); }
        catch (e) { zle.push(v + ": " + String(e.message).split("\n")[0].replace(/^page\.evaluate: /, "").slice(0, 70)); }
      }
      try { await p2.evaluate(async () => { await generujJedalnicek(true); }); }
      catch (e) { zle.push("generovanie: " + String(e.message).split("\n")[0].replace(/^page\.evaluate: /, "").slice(0, 70)); }
      if (zle.length || p2.chyby.length) padli.push({ kluc, hodnota: JSON.stringify(hodnota), zle, konzola: p2.chyby.map((c) => c.text.slice(0, 70)) });
      await E.zavri(p2);
    }
    t.metrika("polí stavu s nesprávnym typom, ktoré zložia appku", `${padli.length} / ${POLIA.length}`);
    await t.ok(padli.length === 0,
      `žiadne pole stavu s nesprávnym typom nezloží appku (padlo ${padli.length} z ${POLIA.length}: ${padli.map((x) => x.kluc).join(", ")})`,
      JSON.stringify(padli, null, 1).slice(0, 900));

    // ── 3. plán odkazujúci na neexistujúci recept ──────────────────────────
    const dnes = new Date();
    const pon = new Date(dnes); pon.setDate(dnes.getDate() - ((dnes.getDay() + 6) % 7));
    const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const duch = await E.novaStranka({
      stav: {
        profil: { onboarded: true, kcal: 1450, stravnici: [{ nazov: "Ja", kcal: 1450 }] },
        plan: { [iso(pon)]: { Obed: ["neexistujuci-recept-xyz"], Večera: ["prf:neznama-priloha"], Raňajky: [] } },
      },
    });
    await prepni(duch, "planovac");
    await duch.waitForTimeout(200);
    const s3 = await duch.evaluate(() => ({
      riadkov: document.querySelectorAll("#plan-table tr").length,
      suma: (document.querySelector("#plan-table tr.suma") || {}).textContent || "",
    }));
    await t.ok(s3.riadkov > 3, "plán s neexistujúcim receptom sa vykreslí", JSON.stringify(s3));
    await prepni(duch, "nakup");
    await prepni(duch, "vyziva");
    await duch.waitForTimeout(200);
    await t.ok(duch.chyby.length === 0, "neexistujúci recept v pláne nevyhodí chybu (nákup ani výživa)",
      duch.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(duch);

    // ── 4. prázdny plán vo všetkých pohľadoch ──────────────────────────────
    const prazdny = await E.novaStranka();
    for (const v of ["domov", "planovac", "nakup", "vyziva"]) {
      await prepni(prazdny, v);
      await prazdny.waitForTimeout(150);
      const obsah = await prazdny.evaluate((vv) => {
        const el = document.getElementById("v-" + vv);
        return { dlzka: el.textContent.replace(/\s+/g, " ").trim().length, vyska: el.scrollHeight };
      }, v);
      await t.ok(obsah.dlzka > 40 && obsah.vyska > 60, `prázdny plán — pohľad „${v}“ nie je prázdna obrazovka`, JSON.stringify(obsah));
    }
    const prazdneStavy = await prazdny.evaluate(() => ({
      nakup: document.getElementById("nakup-list").textContent.trim().slice(0, 60),
      vyziva: document.getElementById("vyziva-tiles").textContent.replace(/\s+/g, " ").trim().slice(0, 60),
    }));
    await t.ok(/Zatiaľ nič v pláne|Pridaj/.test(prazdneStavy.nakup), "prázdny nákup vysvetlí ďalší krok", prazdneStavy.nakup);
    await t.ok(prazdny.chyby.length === 0, "prázdny plán nevyhodí chybu", prazdny.chyby.map((c) => c.text).join("\n"));
    await E.zavri(prazdny);

    // ── 5. veľmi dlhé názvy ─────────────────────────────────────────────────
    const dlhe = await E.novaStranka({ viewport: E.MOBIL, touch: true });
    // vlastný recept s extrémne dlhým názvom a nedeliteľným slovom
    await prepni(dlhe, "recepty");
    await dlhe.evaluate(async ([n, w]) => {
      novyRecept();
      document.getElementById("nr-nazov").value = n;
      document.getElementById("nr-kuch").value = w;
      const riadok = document.querySelector("#nr-ing .controls");
      riadok.querySelector(".nr-in").value = w;
      riadok.querySelector(".nr-mn").value = "250";
      riadok.querySelector(".nr-jed").value = "g";
      document.getElementById("nr-postup").value = w + "\n" + n;
      ulozNovyRecept();
    }, [DLHY, DLHE_SLOVO]);
    await dlhe.waitForTimeout(400);
    const s5 = await dlhe.evaluate(() => ({
      otvorene: document.getElementById("overlay").classList.contains("open"),
      nadpis: ((document.querySelector("#modal .hero h2") || {}).textContent || "").length,
      docW: document.documentElement.scrollWidth,
      viewW: document.documentElement.clientWidth,
    }));
    await t.ok(s5.otvorene && s5.nadpis > 100, "vlastný recept s extrémne dlhým názvom sa uloží a otvorí", JSON.stringify(s5));
    await t.ok(s5.docW <= s5.viewW + 2, `dlhý názov nespôsobí vodorovný pretok detailu (${s5.docW} vs ${s5.viewW} px)`, JSON.stringify(s5));
    await zavriOkna(dlhe);

    // v mriežke
    const s5b = await dlhe.evaluate(() => {
      document.getElementById("hladaj").value = "Extrémne dlhý";
      renderGrid();
      const k = document.querySelector("#grid .card");
      const r = k.getBoundingClientRect();
      return { kariet: document.getElementById("grid").children.length, w: Math.round(r.width), docW: document.documentElement.scrollWidth, viewW: document.documentElement.clientWidth };
    });
    await t.ok(s5b.kariet >= 1 && s5b.docW <= s5b.viewW + 2,
      `dlhý názov nerozbije mriežku (karta ${s5b.w} px, dokument ${s5b.docW} px)`, JSON.stringify(s5b));

    // v pláne
    await dlhe.evaluate(() => {
      const id = RECEPTY.find((r) => r._moj).id;
      const isoD = datumPre(0);
      S.plan[isoD] = S.plan[isoD] || {};
      S.plan[isoD].Obed = [id];
      save();
    });
    await prepni(dlhe, "planovac");
    await dlhe.waitForTimeout(250);
    const s5c = await dlhe.evaluate(() => ({ docW: document.documentElement.scrollWidth, viewW: document.documentElement.clientWidth }));
    await t.ok(s5c.docW <= s5c.viewW + 2, `dlhý názov v pláne nepretečie (${s5c.docW} vs ${s5c.viewW} px)`, JSON.stringify(s5c));

    // v nákupe
    await prepni(dlhe, "nakup");
    await dlhe.waitForTimeout(250);
    const s5d = await dlhe.evaluate(() => ({ docW: document.documentElement.scrollWidth, viewW: document.documentElement.clientWidth, polozky: document.querySelectorAll("#nakup-list label").length }));
    await t.ok(s5d.docW <= s5d.viewW + 2 && s5d.polozky > 0, `dlhý názov suroviny v nákupe nepretečie (${s5d.docW} px)`, JSON.stringify(s5d));

    // dlhá ručná položka
    await dlhe.fill("#nakup-manual", DLHE_SLOVO);
    await dlhe.evaluate(() => window.pridajNakupPolozku());
    await dlhe.waitForTimeout(250);
    const s5e = await dlhe.evaluate(() => ({ docW: document.documentElement.scrollWidth, viewW: document.documentElement.clientWidth }));
    await t.ok(s5e.docW <= s5e.viewW + 2, `dlhá ručná položka nepretečie (${s5e.docW} vs ${s5e.viewW} px)`, JSON.stringify(s5e));

    // dlhé meno stravníka
    await prepni(dlhe, "nastavenia");
    await dlhe.evaluate((w) => { S.profil.stravnici = [{ nazov: w, kcal: 1450 }]; save(); renderStravnici(); }, DLHE_SLOVO);
    await dlhe.waitForTimeout(200);
    const s5f = await dlhe.evaluate(() => ({ docW: document.documentElement.scrollWidth, viewW: document.documentElement.clientWidth }));
    t.metrika("šírka dokumentu s dlhým menom stravníka (393 px)", `${s5f.docW} px`);

    await t.ok(dlhe.chyby.length === 0, "dlhé názvy nevyhodia chybu do konzoly", dlhe.chyby.map((c) => c.text).join("\n"));
    await E.zavri(dlhe);

    // ── 6. XSS: názov s HTML sa nesmie vykonať ─────────────────────────────
    const xss = await E.novaStranka();
    const s6 = await xss.evaluate(() => {
      window.__xss = 0;
      novyRecept();
      document.getElementById("nr-nazov").value = '<img src=x onerror="window.__xss=1">';
      const riadok = document.querySelector("#nr-ing .controls");
      riadok.querySelector(".nr-in").value = '<script>window.__xss=2<\/script>';
      riadok.querySelector(".nr-mn").value = "10";
      riadok.querySelector(".nr-jed").value = "g";
      ulozNovyRecept();
      return { nadpis: (document.querySelector("#modal .hero h2") || {}).textContent || "" };
    });
    await xss.waitForTimeout(500);
    const vykonane = await xss.evaluate(() => window.__xss);
    await t.ok(vykonane === 0, "HTML v názve vlastného receptu sa neuplatní (žiadne XSS)", `__xss=${vykonane}, nadpis=${s6.nadpis.slice(0, 40)}`);
    await t.ok(/img src=x|&lt;img/.test(s6.nadpis) || s6.nadpis.includes("<img"), "názov sa zobrazí ako text", s6.nadpis.slice(0, 60));
    await E.zavri(xss);

    // ── 7. všetky sloty vypnuté ────────────────────────────────────────────
    const bezSlotov = await E.novaStranka({ stav: { profil: { onboarded: true, kcal: 1450, sloty: [] } } });
    await prepni(bezSlotov, "planovac");
    await naplnPlan(bezSlotov);
    await bezSlotov.waitForTimeout(200);
    await prepni(bezSlotov, "nakup");
    await prepni(bezSlotov, "vyziva");
    await bezSlotov.waitForTimeout(200);
    await t.ok(bezSlotov.chyby.length === 0, "prázdny zoznam jedál (žiadne sloty) nevyhodí chybu",
      bezSlotov.chyby.map((c) => c.text).join("\n"));
    await E.zavri(bezSlotov);

    // ── 8. špajza s nezmyselnými hodnotami ─────────────────────────────────
    const spajza = await E.novaStranka({
      stav: {
        profil: { onboarded: true, kcal: 1450 },
        spajza: [
          { id: 1, nazov: "", mnozstvo: NaN, jednotka: "", miesto: "", expiry: "nedatum", min: -5 },
          { id: 2, nazov: "Ryža", mnozstvo: -100, jednotka: "kg", expiry: "2000-01-01", min: 0 },
          { id: 3, nazov: "Mlieko", mnozstvo: 1e9, jednotka: "ml", expiry: "", min: 0 },
        ],
      },
    });
    await prepni(spajza, "spajza");
    await spajza.waitForTimeout(250);
    const s8 = await spajza.evaluate(() => ({
      riadkov: document.querySelectorAll("#spajza-list .sp-row").length,
      vStave: S.spajza.length,
      text: document.getElementById("spajza-list").textContent.replace(/\s+/g, " ").slice(0, 120),
    }));
    await t.ok(s8.riadkov >= 1, "špajza s nezmyselnými hodnotami sa vykreslí a nepadne", JSON.stringify(s8));
    // Každá položka špajze musí byť v prehľade viditeľná — inak sa nedá zmazať ani opraviť,
    // hoci ďalej ovplyvňuje nákup a upozornenia na expiráciu.
    await t.ok(s8.riadkov === s8.vStave,
      `každá položka špajze je viditeľná v prehľade (${s8.riadkov} z ${s8.vStave}) — položky s neznámym „miesto“ sa nevykreslia`,
      JSON.stringify(s8));
    await prepni(spajza, "nakup");
    await prepni(spajza, "domov");
    await spajza.waitForTimeout(200);
    await t.ok(spajza.chyby.length === 0, "nezmyselné hodnoty v špajzi nevyhodia chybu",
      spajza.chyby.map((c) => c.text).join("\n"));
    await E.zavri(spajza);

    // ── 9. zaplnený localStorage (kvóta) ───────────────────────────────────
    const kvota = await E.novaStranka();
    const s9 = await kvota.evaluate(() => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; };
      let hodilo = false;
      try { S.fav["kvota-test"] = 1; save(); } catch (e) { hodilo = true; }
      Storage.prototype.setItem = orig;
      return { hodilo, stavVPamati: !!S.fav["kvota-test"] };
    });
    await t.ok(s9.hodilo === false, "zaplnený localStorage nezhodí appku (uloz má try/catch)", JSON.stringify(s9));
    await prepni(kvota, "planovac");
    await naplnPlan(kvota);
    await t.ok(kvota.chyby.length === 0, "po neúspešnom zápise appka ďalej funguje", kvota.chyby.map((c) => c.text).join("\n"));
    await E.zavri(kvota);
  },
};
