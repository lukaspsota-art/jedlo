// e2e/lib.js — spoločný základ E2E sady pre kucharka.html
// Spúšťa SKUTOČNÝ vygenerovaný súbor v Chromiu (Playwright), nie fake DOM.
"use strict";
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const KOREN = path.resolve(__dirname, "..");
const SUBOR = path.join(KOREN, "kucharka.html");
const SHOTS = path.join(__dirname, "screenshoty");

// ── Známe, neškodné hlášky v konzole ─────────────────────────────────────────
// sync-config.js je zámerne voliteľný a tajný (.gitignore) — bez neho appka funguje offline.
const POVOLENE_CHYBY = [
  /sync-config\.js/i,
  /Failed to load resource.*sync-config/i,
];
function jeZnama(txt) { return POVOLENE_CHYBY.some((re) => re.test(txt)); }

// ── Predvolený stav localStorage ─────────────────────────────────────────────
// onboarded:true → uvítacie okno neblokuje testy (onboarding sa testuje zvlášť).
function zakladnyStav(extra) {
  return Object.assign(
    {
      profil: {
        onboarded: true,
        osoby: 2,
        kcal: 1450,
        stravnici: [
          { nazov: "Ja", kcal: 1450 },
          { nazov: "Osoba 2", kcal: 1450 },
        ],
        sloty: ["Raňajky", "Obed", "Večera", "Snack"],
      },
    },
    extra || {}
  );
}

// ── Tester ───────────────────────────────────────────────────────────────────
class Tester {
  constructor() {
    this.vysledky = [];   // {skupina,popis,ok,detail,xfail,shot}
    this.metriky = [];    // {skupina,kluc,hodnota,jednotka}
    this.skupina = "";
    this.xfail = false;   // testy písané na CIEĽOVÝ stav (dnes smú padať)
    this.stranka = null;  // posledná aktívna stránka (na screenshot pri páde)
    this._n = 0;
  }
  setSkupina(s) { this.skupina = s; this.xfail = false; }
  async ok(podmienka, popis, detail) {
    const preslo = !!podmienka;
    const zaznam = {
      skupina: this.skupina,
      popis,
      ok: preslo,
      detail: preslo ? "" : String(detail == null ? "" : detail),
      xfail: this.xfail,
      shot: "",
    };
    if (!preslo && this.stranka) {
      try {
        const meno = `${String(++this._n).padStart(2, "0")}-${this.skupina}-${popis}`
          .replace(/[^a-z0-9A-ZáäčďéíĺľňóôŕšťúýžÁČĎÉÍĽŇÓŠŤÚÝŽ]+/g, "_")
          .slice(0, 90) + ".png";
        const cesta = path.join(SHOTS, meno);
        await this.stranka.screenshot({ path: cesta, fullPage: false, timeout: 8000 });
        zaznam.shot = path.relative(KOREN, cesta);
      } catch (e) { /* screenshot je bonus, nie podmienka */ }
    }
    this.vysledky.push(zaznam);
    return preslo;
  }
  async eq(skutocne, ocakavane, popis) {
    return this.ok(skutocne === ocakavane, popis, `bolo ${JSON.stringify(skutocne)}, čakalo sa ${JSON.stringify(ocakavane)}`);
  }
  // Číselná metrika do reportu (nie pass/fail).
  metrika(kluc, hodnota, jednotka) {
    this.metriky.push({ skupina: this.skupina, kluc, hodnota, jednotka: jednotka || "" });
  }
}

// ── Lokálny server ───────────────────────────────────────────────────────────
function volnyPort() {
  return new Promise((res, rej) => {
    const s = http.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
    s.on("error", rej);
  });
}
async function spustiServer() {
  const port = await volnyPort();
  // PY=py na Windows, kde `python3` neexistuje (viď CLAUDE.md — build sa tiež spúšťa cez `py`)
  const proc = spawn(process.env.PY || "python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
    cwd: KOREN, stdio: "ignore", detached: false,
  });
  // počkaj, kým začne odpovedať
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 60; i++) {
    const zije = await new Promise((res) => {
      const r = http.get(url + "kucharka.html", (resp) => { resp.resume(); res(resp.statusCode === 200); });
      r.on("error", () => res(false));
      r.setTimeout(500, () => { r.destroy(); res(false); });
    });
    if (zije) return { url, port, stop: () => { try { proc.kill("SIGKILL"); } catch (e) {} } };
    await new Promise((r) => setTimeout(r, 250));
  }
  try { proc.kill("SIGKILL"); } catch (e) {}
  throw new Error("Lokálny server sa nespustil na porte " + port);
}

// ── Prostredie ───────────────────────────────────────────────────────────────
const MOBIL = { width: 393, height: 850 };   // Nothing Phone (3a) Pro, CSS viewport
const MALY = { width: 360, height: 640 };
const DESKTOP = { width: 1440, height: 900 };

async function vytvorProstredie(t) {
  let browser;
  // PW_CHANNEL=msedge — stroj bez stiahnutého chromia použije systémový prehliadač
  const kanal = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};
  try { browser = await chromium.launch(kanal); }
  catch (e) { browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }); }
  const server = await spustiServer();
  const E = {
    browser,
    server,
    urlHttp: server.url + "kucharka.html",
    urlFile: "file://" + SUBOR,
    t,
    otvorene: [],
    MOBIL, MALY, DESKTOP,
  };

  // Vytvorí kontext + stránku, naseje localStorage, zapne zber chýb, načíta appku.
  E.novaStranka = async function (opts) {
    opts = opts || {};
    const ctx = await browser.newContext({
      viewport: opts.viewport || DESKTOP,
      hasTouch: !!opts.touch,
      isMobile: false,       // Chromium mobile-emulation mení scroll/viewport metriky; breakpoint rieši šírka
      deviceScaleFactor: 1,
      permissions: opts.permissions || [],
      serviceWorkers: opts.serviceWorkers || "allow",
      offline: false,
    });
    const surovyStav =
      opts.stav === null ? null
      : typeof opts.stav === "string" ? opts.stav
      : JSON.stringify(zakladnyStav(opts.stav));
    // Naseje sa LEN pri prvom načítaní karty. Reload musí vidieť to, čo appka uložila —
    // inak by test „prežije reload" meral seed, nie localStorage appky.
    await ctx.addInitScript((s) => {
      try {
        if (!sessionStorage.getItem("__e2e_seed")) {
          sessionStorage.setItem("__e2e_seed", "1");
          if (s === null) localStorage.removeItem("kucharka_v2");
          else localStorage.setItem("kucharka_v2", s);
        }
      } catch (e) {}
      window.__e2e = true;
    }, surovyStav);

    const page = await ctx.newPage();
    const chyby = [];
    const vsetkyLogy = [];
    page.on("console", (m) => {
      const loc = m.location && m.location();
      const txt = m.text() + (loc && loc.url ? "  [" + loc.url + "]" : "");
      vsetkyLogy.push({ typ: m.type(), text: txt });
      if (m.type() === "error" && !jeZnama(txt)) chyby.push({ typ: "console.error", text: txt });
      if (m.type() === "warning" && /uncaught|unhandled/i.test(txt) && !jeZnama(txt))
        chyby.push({ typ: "console.warn", text: txt });
    });
    page.on("pageerror", (e) => {
      const txt = (e && e.message) || String(e);
      if (!jeZnama(txt)) chyby.push({ typ: "pageerror", text: txt + "\n" + ((e && e.stack) || "").split("\n").slice(0, 3).join("\n") });
    });
    page.on("requestfailed", (r) => {
      const u = r.url();
      if (!jeZnama(u) && !u.startsWith("data:")) {
        const err = (r.failure() && r.failure().errorText) || "";
        if (!/ERR_ABORTED/.test(err)) chyby.push({ typ: "requestfailed", text: u + " — " + err });
      }
    });
    page.chyby = chyby;
    page.logy = vsetkyLogy;

    const url = opts.url || E.urlHttp;
    if (!opts.bezNacitania) {
      await page.goto(url, { waitUntil: "load", timeout: 90000 });
      await page.waitForFunction(() => typeof RECEPTY !== "undefined", null, { timeout: 30000 });
      if (!opts.bezMriezky) {
        await page.waitForFunction(() => {
          const g = document.getElementById("grid");
          return g && g.children.length > 0;
        }, null, { timeout: 30000 }).catch(() => {});
      }
    }
    ctx._page = page;
    E.otvorene.push(ctx);
    t.stranka = page;
    page._ctx = ctx;
    return page;
  };

  E.zavri = async function (page) {
    if (!page) return;
    if (t.stranka === page) t.stranka = null;
    const ctx = page._ctx;
    const i = E.otvorene.indexOf(ctx);
    if (i >= 0) E.otvorene.splice(i, 1);
    try { await ctx.close(); } catch (e) {}
  };

  E.koniec = async function () {
    for (const c of E.otvorene) { try { await c.close(); } catch (e) {} }
    try { await browser.close(); } catch (e) {}
    server.stop();
  };
  return E;
}

// ── Drobné pomôcky pre testy ─────────────────────────────────────────────────

// Prepni pohľad cez appkinu funkciu (odolné voči zmenám v HTML navigácie).
async function prepni(page, view) {
  await page.evaluate((v) => window.prepni(v), view);
  await page.waitForTimeout(120);
}

// Zavri prípadné otvorené okno (onboarding, picker, dialóg).
async function zavriOkna(page) {
  await page.evaluate(() => {
    try { window.zavriPick && window.zavriPick(); } catch (e) {}
    try { window.zavri && window.zavri(); } catch (e) {}
    try { window.zavriCook && window.zavriCook(); } catch (e) {}
  });
  await page.waitForTimeout(80);
}

// Naplní týždeň jedálničkom cez appkinu vlastnú funkciu (rovnaká cesta ako tlačidlo v UI).
async function naplnPlan(page, zamiesaj) {
  await page.evaluate(async (z) => { await window.generujJedalnicek(z !== false); }, zamiesaj);
  await page.waitForTimeout(250);
}

// Počet naplnených slotov v aktuálne zobrazenom týždni.
async function pocetSlotov(page) {
  return page.evaluate(() => {
    let n = 0;
    for (let di = 0; di < 7; di++) window.slotyDna(di).forEach((sl) => { if (window.slotIds(di, sl).length) n++; });
    return n;
  });
}

// Bounding boxy viditeľných interaktívnych prvkov v danom koreni.
async function dotykoveCiele(page, sel) {
  return page.evaluate((s) => {
    const von = [];
    document.querySelectorAll(s).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
      if (!el.offsetParent && cs.position !== "fixed") return;
      von.push({
        tag: el.tagName.toLowerCase(),
        trieda: el.className && el.className.baseVal === undefined ? String(el.className).slice(0, 40) : "",
        text: (el.textContent || "").trim().slice(0, 30),
        w: Math.round(r.width), h: Math.round(r.height),
      });
    });
    return von;
  }, sel);
}

module.exports = {
  KOREN, SUBOR, SHOTS, MOBIL, MALY, DESKTOP,
  Tester, vytvorProstredie, zakladnyStav,
  prepni, zavriOkna, naplnPlan, pocetSlotov, dotykoveCiele,
};
