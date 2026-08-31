// QA: overenie 15 funkcií, ktoré sľubuje NAVOD.md — každá v skutočnom prehliadači.
// Beh: node scripts/qa/overenie_slubov.js
"use strict";
const path = require("path");
const fs = require("fs");
const { Tester, vytvorProstredie } = require("../../e2e/lib");
const OUT = path.join(__dirname, "..", "..", "e2e", "screenshoty", "sluby");
fs.mkdirSync(OUT, { recursive: true });

const V = [];
function vysledok(c, stav, popis) { V.push({ c, stav, popis }); console.log(`${String(c).padStart(2)} ${stav.padEnd(9)} ${popis}`); }

(async () => {
  const t = new Tester();
  const E = await vytvorProstredie(t);
  const p = await E.novaStranka({ viewport: { width: 393, height: 850 }, touch: true });
  const snap = async (m) => p.screenshot({ path: path.join(OUT, m + ".png") }).catch(() => {});

  // 1 — obľúbené
  const fav = await p.evaluate(() => {
    const id = RECEPTY[0].id; window.toggleFav(id);
    const naKarte = !!document.querySelector("#grid .card .fav");
    window.otvor(id); const vDetaile = !!document.querySelector("#modal .fav, #modal .starpick");
    window.zavri(); const ulozene = !!S.fav[id]; window.toggleFav(id);
    return { naKarte, vDetaile, ulozene };
  });
  vysledok(1, fav.naKarte && fav.ulozene ? "FUNGUJE" : "CHYBA", "Obľúbené (★ na karte aj v detaile) — " + JSON.stringify(fav));

  // 2 — hodnotenie + poznámka
  const hodn = await p.evaluate(() => {
    const id = RECEPTY[0].id; window.otvor(id);
    const hviezd = document.querySelectorAll("#modal .starpick .st, #modal .starpick *").length;
    window.hodnot(id, 4); S.pozn[id] = "test"; save();
    const r = { hviezd, hodn: S.hodn[id], pozn: S.pozn[id], maTextarea: !!document.getElementById("poznamka") };
    window.zavri(); delete S.hodn[id]; delete S.pozn[id]; save(); return r;
  });
  vysledok(2, hodn.hodn === 4 && hodn.maTextarea ? "FUNGUJE" : "CHYBA", "Hodnotenie 1–5 + poznámka — " + JSON.stringify(hodn));

  // 3 — filtre
  const filt = await p.evaluate(() => {
    window.prepni("recepty");
    const sel = ["f-kuchyna", "f-cas", "f-diet", "f-sort"].map(id => { const e = document.getElementById(id); return e ? { id, moznosti: e.options.length } : { id, moznosti: 0 }; });
    const chipy = document.querySelectorAll("#chips .chip").length;
    document.getElementById("f-cas").value = "35"; window.renderGrid();
    const poFiltri = document.getElementById("pocet").textContent;
    window.zrusFiltre();
    return { sel, chipy, poFiltri };
  });
  vysledok(3, filt.chipy > 5 && filt.sel.every(s => s.moznosti > 1) ? "FUNGUJE" : "CHYBA", "Filtre kategória/kuchyňa/čas/diéta — " + JSON.stringify(filt));

  // 4 — fotky
  const foto = await p.evaluate(() => {
    const sFoto = RECEPTY.filter(r => r.foto);
    const bez = RECEPTY.find(r => !r.foto && r.kategoria === "Hlavné jedlo");
    return { spolu: RECEPTY.length, sFoto: sFoto.length, prikladSFoto: sFoto[0] && sFoto[0].id, prikladBez: bez && bez.id };
  });
  await p.evaluate((id) => { window.prepni("recepty"); window.otvor(id); }, foto.prikladSFoto);
  await p.waitForTimeout(400); await snap("04a-recept-s-fotkou");
  const sFotoDom = await p.evaluate(() => {
    const img = document.querySelector("#modal img");
    const karta = (() => { document.getElementById("hladaj").value = ""; return null; })();
    return { maImg: !!img, src: img ? img.getAttribute("src").slice(0, 24) : "", vyska: img ? Math.round(img.getBoundingClientRect().height) : 0,
             atribucia: (document.getElementById("modal").textContent.match(/Foto[^·\n]{0,80}/) || [""])[0] };
  });
  await p.evaluate(() => window.zavri());
  await p.evaluate((id) => window.otvor(id), foto.prikladBez);
  await p.waitForTimeout(400); await snap("04b-recept-bez-fotky");
  const bezFotoDom = await p.evaluate(() => ({ maImg: !!document.querySelector("#modal img"), hero: (document.querySelector("#modal .hero h2") || {}).textContent || "" }));
  await p.evaluate(() => window.zavri());
  vysledok(4, foto.sFoto > 0 && sFotoDom.maImg ? "ČIASTOČNE" : "CHYBA",
    `Fotky receptov — ${foto.sFoto} z ${foto.spolu} receptov (${(foto.sFoto / foto.spolu * 100).toFixed(1)} %); s fotkou: ${JSON.stringify(sFotoDom)}; bez fotky: ${JSON.stringify(bezFotoDom)}`);

  // 5 — plánovač týždňa
  await p.evaluate(async () => { window.prepni("planovac"); await window.generujJedalnicek(true); });
  await p.waitForTimeout(600);
  const plan = await p.evaluate(() => {
    let n = 0; const sloty = new Set();
    for (let di = 0; di < 7; di++) window.slotyDna(di).forEach(sl => { sloty.add(sl); if (window.slotIds(di, sl).length) n++; });
    return { naplnenych: n, sloty: [...sloty], dni: document.querySelectorAll("#plan-table th[data-d]").length };
  });
  vysledok(5, plan.naplnenych >= 24 ? "FUNGUJE" : "CHYBA", "Plánovač Po–Ne × 4 sloty — " + JSON.stringify(plan));

  // 6 + 7 — nákup z plánu, oddelenia
  const nak = await p.evaluate(() => {
    window.prepni("nakup"); window.renderNakup();
    return {
      polozky: document.querySelectorAll("#nakup-list .nak-row").length,
      oddelenia: [...document.querySelectorAll("#nakup-list .odd h4")].map(h => h.textContent.trim()),
      daSaPrestavit: typeof window.otvorPoradieOddeleni === "function" || !!document.querySelector("[onclick*='oradieOdd']"),
    };
  });
  vysledok(6, nak.polozky > 20 ? "FUNGUJE" : "CHYBA", `Nákupný zoznam z plánu — ${nak.polozky} položiek`);
  vysledok(7, nak.oddelenia.length > 5 && nak.daSaPrestavit ? "FUNGUJE" : "ČIASTOČNE",
    `Nákup podľa oddelení (${nak.oddelenia.length}), poradie prestaviteľné: ${nak.daSaPrestavit}`);

  // 8 — čo mám doma
  const doma = await p.evaluate(() => {
    window.prepni("doma");
    const el = document.getElementById("doma-in"); if (!el) return { chyba: "chýba pole" };
    el.value = "kuracie prsia, ryža, paradajka"; window.renderDoma();
    return { navrhy: document.querySelectorAll("#doma-out .match").length, text: (document.getElementById("doma-out").textContent || "").slice(0, 90) };
  });
  vysledok(8, doma.navrhy > 0 ? "FUNGUJE" : "CHYBA", "„Čo mám doma“ — " + JSON.stringify(doma));

  // 9 — makrá
  const makra = await p.evaluate(() => {
    const r = RECEPTY.find(x => x.kategoria === "Hlavné jedlo"); const v = window.vyzivaReceptu(r);
    window.prepni("recepty"); window.otvor(r.id);
    const dlazdice = [...document.querySelectorAll("#modal .tile, #modal .nut, #modal .macro")].map(e => e.textContent.replace(/\s+/g, " ").trim()).slice(0, 6);
    window.zavri();
    return { kcal: Math.round(v.kcal), b: Math.round(v.b), t: Math.round(v.t), s: Math.round(v.s), vl: Math.round(v.vl || 0), na: Math.round(v.na || 0), dlazdice };
  });
  vysledok(9, makra.kcal > 0 && makra.b > 0 ? "FUNGUJE" : "CHYBA", "Makrá zo surovín — " + JSON.stringify(makra));

  // 10 — denný cieľ + upozornenie
  const ciel = await p.evaluate(() => {
    window.prepni("planovac"); window.renderPlan();
    const tr = document.querySelector("#plan-table tr.suma");
    return { riadok: tr ? tr.textContent.replace(/\s+/g, " ").trim().slice(0, 120) : "‹chýba›", maPasik: !!document.querySelector("#plan-table tr.suma .bar, #plan-table tr.suma [style*='width']") };
  });
  vysledok(10, /\/\d+/.test(ciel.riadok) ? "FUNGUJE" : "CHYBA", "Denný kalorický cieľ v pláne — " + JSON.stringify(ciel));

  // 11 — alergény a diéty
  const alerg = await p.evaluate(() => {
    const r = RECEPTY.find(x => window.alergenyReceptu ? window.alergenyReceptu(x).length : (x.tagy || []).length);
    window.prepni("recepty"); const opt = [...document.getElementById("f-diet").options].map(o => o.value + ":" + o.textContent);
    const id = RECEPTY.find(x => (x.ingrediencie || []).some(i => /mlieko|syr/i.test(i.nazov)));
    window.otvor(id.id);
    const badge = [...document.querySelectorAll("#modal .badge")].map(b => b.textContent.trim());
    window.zavri();
    return { opt, badge };
  });
  vysledok(11, alerg.badge.some(b => /⚠/.test(b)) && alerg.opt.length >= 4 ? "FUNGUJE" : "ČIASTOČNE", "Alergény + diétne filtre — " + JSON.stringify(alerg).slice(0, 260));

  // 12 — import z fotky/textu/odkazu
  const imp = await p.evaluate(() => ({
    maFormular: typeof window.novyRecept === "function",
    maFotkuVFormulari: typeof window.nrFotoZmena === "function",
    maParserURL: /jsonld|application\/ld\+json|parseRecipe|importUrl/i.test(String(window.novyRecept)) || typeof window.importZUrl === "function",
    maOCR: typeof window.ocr === "function",
    fetchNaSupabase: true,
  }));
  vysledok(12, imp.maFormular && imp.maFotkuVFormulari && !imp.maParserURL ? "ČIASTOČNE" : (imp.maParserURL ? "FUNGUJE" : "CHYBA"),
    "Import receptu — ručný formulár + fotka z mobilu ÁNO, parser z odkazu/textu/OCR NIE: " + JSON.stringify(imp));

  // 13 — prepočet porcií a jednotiek
  const porcie = await p.evaluate(() => {
    const r = RECEPTY.find(x => (x.ingrediencie || []).some(i => i.jednotka === "g" && i.mnozstvo > 0));
    window.prepni("recepty"); window.otvor(r.id);
    const prv = () => (document.querySelector("#ing-body tr") || {}).textContent.replace(/\s+/g, " ").trim();
    const pred = prv();
    const plus = [...document.querySelectorAll("#modal .stepper button")].find(b => b.textContent.trim() === "+"); if (plus) plus.click();
    const po = prv();
    const seg = [...document.querySelectorAll("#modal .seg button, #modal .seg label")].map(x => x.textContent.trim());
    const sel = document.querySelector("#modal select"); let imperial = "";
    if (sel) { sel.value = [...sel.options].map(o => o.value).find(v => /imp|oz/i.test(v)) || sel.value; sel.dispatchEvent(new Event("change")); imperial = prv(); }
    window.zavri();
    return { pred, po, seg, imperial, zmenilo: pred !== po };
  });
  vysledok(13, porcie.zmenilo ? "FUNGUJE" : "CHYBA", "Prepočet porcií a jednotiek — " + JSON.stringify(porcie).slice(0, 300));

  // 14 — režim varenia
  const cook = await p.evaluate(() => {
    const r = RECEPTY.find(x => (x.postup || []).length >= 3);
    window.otvor(r.id); window.spustiCook();
    const st = {
      otvorene: document.getElementById("cook").classList.contains("open"),
      pismo: getComputedStyle(document.querySelector("#cook .krok") || document.getElementById("cook")).fontSize,
      maCasovac: !!document.querySelector("#cook [onclick*='asovac'], #cook [onclick*='Timer']"),
      maHlas: !!document.querySelector("#cook [onclick*='hlas'], #cook [onclick*='cita']"),
      wakeLock: typeof navigator.wakeLock !== "undefined",
      krokov: document.querySelectorAll("#cook .krok").length || 1,
    };
    window.zavriCook(); window.zavri(); return st;
  });
  vysledok(14, cook.otvorene && cook.maCasovac ? "FUNGUJE" : "CHYBA", "Režim varenia — " + JSON.stringify(cook));

  // 15 — tlač
  await p.evaluate(() => { window.__p = 0; window.print = () => window.__p++; });
  const tlac = await p.evaluate(() => {
    window.tlacView("nakup"); const a = window.__p;
    window.tlacTyzden(); const b = window.__p;
    const r = RECEPTY[0]; window.otvor(r.id); window.tlacRecept(); const c = window.__p;
    window.zavri(); document.body.classList.remove("tlac-plan", "tlac-detail");
    return { nakup: a, tyzden: b, recept: c };
  });
  vysledok(15, tlac.recept === 3 ? "FUNGUJE" : "CHYBA", "Tlač / PDF (recept, plán, nákup, týždeň) — " + JSON.stringify(tlac));

  // synchronizácia
  const sync = await p.evaluate(() => ({
    maFunkcie: typeof window.syncTeraz === "function" || typeof window.syncPush === "function",
    konfigNacitany: typeof window.SYNC_CONFIG !== "undefined" && !!window.SYNC_CONFIG,
    vNastaveniach: /Synchroniz/i.test(document.getElementById("v-nastavenia").textContent || ""),
  }));
  vysledok("S", sync.maFunkcie ? "PRIPRAVENÉ" : "CHYBA", "Synchronizácia PC↔mobil (Supabase, voliteľná) — " + JSON.stringify(sync));

  // offline
  await p.context().setOffline(true);
  await p.reload({ waitUntil: "load", timeout: 60000 }).catch(() => {});
  const off = await p.evaluate(() => ({ online: navigator.onLine, recepty: typeof RECEPTY !== "undefined" ? RECEPTY.length : 0 })).catch(() => ({ chyba: 1 }));
  await p.context().setOffline(false);
  vysledok("O", off.recepty > 1000 ? "FUNGUJE" : "CHYBA", "Offline (service worker) — " + JSON.stringify(off));

  console.log("\nCHYBY V KONZOLE: " + (p.chyby.length ? JSON.stringify(p.chyby.slice(0, 6)) : "žiadne"));
  await E.koniec();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
