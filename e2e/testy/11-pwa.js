// 11 — Offline a PWA: service worker, manifest, funkčnosť po odpojení siete
"use strict";
const { prepni, naplnPlan } = require("../lib");

module.exports = {
  nazov: "Offline a PWA",
  async spusti(E, t) {
    // ── manifest ────────────────────────────────────────────────────────────
    const page = await E.novaStranka();
    const mf = await page.evaluate(async () => {
      const link = document.getElementById("mf") || document.querySelector("link[rel=manifest]");
      if (!link) return { chyba: "žiadny <link rel=manifest>" };
      const href = link.getAttribute("href") || "";
      let obsah = null;
      try {
        if (href.startsWith("data:")) obsah = JSON.parse(decodeURIComponent(href.split(",").slice(1).join(",")));
        else obsah = await (await fetch(href)).json();
      } catch (e) { return { href: href.slice(0, 60), chyba: String(e.message) }; }
      return { href: href.slice(0, 40), obsah };
    });
    await t.ok(!mf.chyba, "stránka má manifest", JSON.stringify(mf).slice(0, 200));
    if (mf.obsah) {
      const m = mf.obsah;
      await t.ok(!!m.name || !!m.short_name, "manifest má názov", JSON.stringify({ name: m.name, short_name: m.short_name }));
      await t.ok(m.display === "standalone" || m.display === "fullscreen" || m.display === "minimal-ui",
        `manifest má display pre inštaláciu (${m.display})`, m.display);
      await t.ok(Array.isArray(m.icons) && m.icons.length > 0, "manifest má ikony", JSON.stringify((m.icons || []).length));
      await t.ok(!!m.theme_color || !!m.background_color, "manifest má farby témy", JSON.stringify({ t: m.theme_color, b: m.background_color }));
      // manifest musí byť generovaný z appky (blob:/data:), nie samostatný súbor — appka je jeden súbor
      await t.ok(/^(blob|data):/.test(String(mf.href)), "manifest vzniká v appke (blob:/data:), nie ako druhý súbor", mf.href);
      // farba témy v manifeste musí sedieť s <meta name=theme-color> (inak má nainštalovaná appka inú farbu)
      const meta = await page.evaluate(() => (document.querySelector("meta[name=theme-color]") || {}).content || "");
      await t.ok(String(m.theme_color).toLowerCase() === String(meta).toLowerCase(),
        `theme_color manifestu sedí s <meta name=theme-color> (${m.theme_color} vs ${meta})`,
        JSON.stringify({ manifest: m.theme_color, background: m.background_color, meta }));
      // a Chrome ho musí prijať bez chýb (kritérium inštalovateľnosti)
      const cdpM = await page.context().newCDPSession(page);
      const app = await cdpM.send("Page.getAppManifest");
      await t.ok((app.errors || []).length === 0, "Chrome prijme manifest bez chýb (inštalovateľnosť)", JSON.stringify(app.errors));
      await t.ok(!!app.url, "manifest má platnú URL", String(app.url).slice(0, 40));
      const ikona = await page.evaluate(() => new Promise((res) => {
        const h = document.querySelector("link[rel=icon]").href;
        const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ err: 1 }); im.src = h;
      }));
      await t.ok(ikona.w >= 192 && ikona.h >= 192, `ikona je aspoň 192×192 (${ikona.w}×${ikona.h})`, JSON.stringify(ikona));
      t.metrika("PWA manifest", `${m.name || m.short_name} · display=${m.display} · ikon=${(m.icons || []).length}`);
    }

    // ── service worker sa registruje len cez http(s) ────────────────────────
    const swHttp = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return { je: !!r, scope: r && r.scope, script: r && ((r.active || r.installing || r.waiting) || {}).scriptURL };
    });
    await t.ok(swHttp.je, "service worker sa cez lokálny server zaregistruje", JSON.stringify(swHttp));
    await t.ok(/sw\.js$/.test(String(swHttp.script)), "registruje sa sw.js", String(swHttp.script));

    // ── prvý prechod naplní cache ───────────────────────────────────────────
    await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r; });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => typeof RECEPTY !== "undefined");
    await page.waitForTimeout(1200);
    const cache = await page.evaluate(async () => {
      const ks = await caches.keys();
      const out = {};
      for (const k of ks) { const c = await caches.open(k); out[k] = (await c.keys()).map((r) => r.url.split("/").pop()); }
      return { klice: ks, obsah: out };
    });
    await t.ok(cache.klice.length > 0, "service worker naplní cache", JSON.stringify(cache.klice));
    const maDokument = Object.values(cache.obsah).some((v) => v.some((u) => /kucharka\.html|^$/.test(u)));
    await t.ok(maDokument, "v cache je hlavný dokument", JSON.stringify(cache.obsah));
    t.metrika("cache service workera", JSON.stringify(cache.obsah).slice(0, 160));

    // ── odpojenie siete: appka musí fungovať ───────────────────────────────
    await prepni(page, "planovac");
    await naplnPlan(page);
    const predOffline = await page.evaluate(() => ({ slotov: Object.keys(S.plan).length }));

    await page.context().setOffline(true);
    await page.reload({ waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => typeof RECEPTY !== "undefined", null, { timeout: 30000 });
    const offline = await page.evaluate(() => ({
      online: navigator.onLine,
      recepty: RECEPTY.length,
      kariet: document.getElementById("grid").children.length,
      slotov: Object.keys(S.plan).length,
    }));
    await t.ok(offline.online === false, "prehliadač je naozaj offline", offline.online);
    await t.ok(offline.recepty > 1000 && offline.kariet > 1000, "appka sa načíta offline z cache", JSON.stringify(offline));
    await t.ok(offline.slotov === predOffline.slotov, "plán je offline dostupný", JSON.stringify({ predOffline, offline }));

    // a je použiteľná: hľadanie, plán, nákup, generovanie
    await prepni(page, "recepty");
    await page.fill("#hladaj", "polievka");
    await page.evaluate(() => window.renderGrid());
    await page.waitForTimeout(150);
    const hl = await page.evaluate(() => document.getElementById("grid").children.length);
    await t.ok(hl > 0 && hl < 1956, `hľadanie funguje offline (${hl} výsledkov)`, hl);
    await prepni(page, "planovac");
    await naplnPlan(page);
    const genOffline = await page.evaluate(() => { let n = 0; for (let di = 0; di < 7; di++) slotyDna(di).forEach((s) => { if (slotIds(di, s).length) n++; }); return n; });
    await t.ok(genOffline >= 20, `generovanie jedálnička funguje offline (${genOffline} slotov)`, genOffline);
    await prepni(page, "nakup");
    const nakOffline = await page.evaluate(() => document.querySelectorAll("#nakup-list label").length);
    await t.ok(nakOffline > 10, `nákupný zoznam funguje offline (${nakOffline} položiek)`, nakOffline);
    // zmena stavu offline sa uloží
    await page.evaluate(() => { S.fav["__offline_test"] = 1; save(); });
    await t.ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem("kucharka_v2")).fav["__offline_test"]),
      "zmeny sa offline ukladajú do localStorage");

    const chybyOffline = page.chyby.filter((c) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|net::ERR/i.test(c.text));
    await t.ok(chybyOffline.length === 0, "offline beh nevyhodí chybu do konzoly (okrem očakávaných sieťových)",
      chybyOffline.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await page.context().setOffline(false);
    await E.zavri(page);

    // ── cez file:// sa SW neregistruje (a nesmie to nič zhodiť) ────────────
    const f = await E.novaStranka({ url: E.urlFile });
    const swFile = await f.evaluate(async () => {
      try { const r = await navigator.serviceWorker.getRegistration(); return { je: !!r }; }
      catch (e) { return { je: false, chyba: e.name }; }
    });
    await t.ok(swFile.je === false, "cez file:// sa service worker neregistruje (podmienka location.protocol)", JSON.stringify(swFile));
    await t.ok(f.chyby.length === 0, "file:// beh je bez chýb aj bez service workera", f.chyby.map((c) => c.text).join("\n"));
    await E.zavri(f);
  },
};
