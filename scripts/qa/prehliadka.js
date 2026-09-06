// QA: prechod appkou ako človek, telefón 393×850 (Nothing Phone 3a Pro).
// Tri prechody: PLÁNOVANIE · OBCHOD · KUCHYŇA. Robí screenshoty a zapisuje, čo je vidieť.
// Beh: node scripts/qa/prehliadka.js        (výstup: e2e/screenshoty/prehliadka/)
"use strict";
const path = require("path");
const fs = require("fs");
const { Tester, vytvorProstredie } = require("../../e2e/lib");

const OUT = path.join(__dirname, "..", "..", "e2e", "screenshoty", "prehliadka");
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
let n = 0;
const P = (s) => console.log(s);

(async () => {
  const t = new Tester();
  const E = await vytvorProstredie(t);
  const snap = async (page, meno) => {
    const f = path.join(OUT, String(++n).padStart(2, "0") + "-" + meno + ".png");
    await page.screenshot({ path: f, fullPage: false }).catch(() => {});
  };
  const cistyText = async (page, sel) => page.evaluate((s) => {
    const e = document.querySelector(s); return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : "‹chýba›";
  }, sel);

  // ═══ PRECHOD 1 — PLÁNOVANIE ═══════════════════════════════════════════════
  P("\n════════ PRECHOD 1: PLÁNOVANIE (393×850) ════════");
  const p = await E.novaStranka({ viewport: { width: 393, height: 850 }, touch: true, stav: null, bezMriezky: true });
  await p.waitForTimeout(700);

  const uvod = await p.evaluate(() => ({
    okno: document.getElementById("pick-overlay").classList.contains("open"),
    nadpis: (document.querySelector("#pick-modal h2") || {}).textContent || "",
    text: (document.getElementById("pick-modal").textContent || "").replace(/\s+/g, " ").slice(0, 300),
    tlacidla: [...document.querySelectorAll("#pick-modal button")].map(b => b.textContent.trim()).filter(Boolean),
  }));
  P("1.1 prvé spustenie — uvítacie okno: " + JSON.stringify(uvod, null, 1));
  await snap(p, "prve-spustenie");

  // stravníci s rôznymi kalóriami priamo v uvítacom okne
  const stravnici = await p.evaluate(() => [...document.querySelectorAll("#pick-modal .strav-row, #pick-modal input")].map(e => e.tagName + ":" + (e.className || "") + ":" + (e.value !== undefined ? e.value : "")).slice(0, 12));
  P("1.2 polia stravníkov v uvítacom okne: " + JSON.stringify(stravnici));
  await p.evaluate(() => {
    // druhý stravník s iným cieľom, ako to spraví človek cez polia
    const inputy = [...document.querySelectorAll("#pick-modal input")];
    return inputy.map(i => ({ typ: i.type, val: i.value, ph: i.placeholder }));
  }).then(x => P("1.3 hodnoty polí: " + JSON.stringify(x)));

  await p.evaluate(() => { window.pridajStravnika && window.pridajStravnika(); window.onboardingModal && window.onboardingModal(); });
  await p.waitForTimeout(300);
  await snap(p, "onboarding-stravnici");
  const poPridani = await p.evaluate(() => (S.profil.stravnici || []).map(s => s.nazov + " " + s.kcal));
  P("1.4 po „+ Pridať stravníka“: " + JSON.stringify(poPridani));

  // nastav rôzne kalórie
  await p.evaluate(() => {
    S.profil.stravnici = [{ nazov: "Ja", kcal: 2100 }, { nazov: "Žena", kcal: 1500 }];
    S.profil.onboarded = true; save();
  });
  await p.evaluate(() => { window.zavriPick(); window.prepni("domov"); });
  await p.waitForTimeout(400);
  await snap(p, "domov-po-onboardingu");
  P("1.5 Domov — panel stravníkov: " + (await cistyText(p, "#dash-strav")).slice(0, 200));
  P("1.5b Domov — celý text (prvých 600 zn.): " + (await cistyText(p, "#v-domov")).slice(0, 600));

  await p.evaluate(() => window.prepni("planovac"));
  await p.waitForTimeout(400);
  await snap(p, "plan-prazdny");
  P("1.6 Prázdny plán hovorí: " + (await cistyText(p, "#v-planovac")).slice(0, 400));

  // zostavenie týždňa cez primárne tlačidlo
  await p.click("#v-planovac button.btn.primary");
  await p.waitForTimeout(500);
  await snap(p, "dotaznik-generovania");
  P("1.7 dotazník: " + (await cistyText(p, "#pick-modal")).slice(0, 400));
  await p.click("#pick-modal [onclick*='generujTlacidlo']");
  await p.waitForTimeout(1200);
  await p.evaluate(() => { try { window.zavriPick(); } catch (e) {} });
  await p.waitForTimeout(300);
  await snap(p, "plan-naplneny");
  P("1.8 plán po vygenerovaní (viditeľný text): " + (await cistyText(p, "#v-planovac")).slice(0, 700));

  const rozvrh = await p.evaluate(() => {
    const b = document.getElementById("rozvrh-pas");
    return { text: b ? b.textContent.replace(/\s+/g, " ").trim().slice(0, 260) : "‹chýba›", vyska: b ? Math.round(b.getBoundingClientRect().height) : 0 };
  });
  P("1.9 pás rozvrhu: " + JSON.stringify(rozvrh));

  // koľko z tabuľky vidno bez skrolovania
  const nadPrehybom = await p.evaluate(() => {
    const vh = innerHeight, out = [];
    document.querySelectorAll("#v-planovac .plan-cell:not(.prazdne)").forEach(c => { const r = c.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) out.push(c.textContent.replace(/\s+/g, " ").trim().slice(0, 40)); });
    const tbl = document.getElementById("plan-table");
    return { viditelnychBuniek: out.length, prve: out.slice(0, 4), tabulkaTop: tbl ? Math.round(tbl.getBoundingClientRect().top) : null, vh };
  });
  P("1.10 čo vidno bez skrolovania: " + JSON.stringify(nadPrehybom));

  // úprava plánu — ✎ zmeniť
  await p.evaluate(() => { const c = document.querySelector("#plan-table .plan-cell:not(.prazdne) .rm"); if (c) c.click(); });
  await p.waitForTimeout(600);
  await snap(p, "zmena-jedla");
  P("1.11 „✎ zmeniť“ otvorí: " + (await cistyText(p, "#pick-modal")).slice(0, 300));
  await p.evaluate(() => window.zavriPick());
  await p.waitForTimeout(200);

  // prestavenie hraníc blokov
  await p.click("#v-planovac .rozvrh-upr");
  await p.waitForTimeout(500);
  await snap(p, "rozvrh-dialog");
  P("1.12 dialóg rozvrhu: " + (await cistyText(p, "#pick-modal")).slice(0, 600));
  await p.evaluate(() => window.pouziRozvrh("tv"));
  await p.waitForTimeout(600);
  await snap(p, "rozvrh-po-zmene");
  P("1.13 po zmene na „Týždeň a víkend“: " + (await cistyText(p, "#pick-modal")).slice(0, 400));
  await p.evaluate(() => window.zavriPick());
  await p.waitForTimeout(400);
  await snap(p, "plan-po-zmene-rozvrhu");
  P("1.14 pás po zmene: " + (await cistyText(p, "#rozvrh-pas")).slice(0, 260));
  // späť na pôvodný rozvrh
  await p.evaluate(() => window.pouziRozvrh("ja"));
  await p.waitForTimeout(400);

  // varný deň / plán varenia
  await p.evaluate(() => { const b = document.querySelector("#rozvrh-pas .rozvrh-blok"); if (b) b.click(); });
  await p.waitForTimeout(600);
  await snap(p, "plan-varenia");
  P("1.15 „plán varenia“ pre blok: " + (await cistyText(p, "#pick-modal")).slice(0, 500));
  await p.evaluate(() => window.zavriPick());
  await p.waitForTimeout(200);

  // ═══ PRECHOD 2 — OBCHOD ═══════════════════════════════════════════════════
  P("\n════════ PRECHOD 2: OBCHOD ════════");
  await p.evaluate(() => window.prepni("nakup"));
  await p.waitForTimeout(600);
  await snap(p, "nakup-hore");
  P("2.1 hlavička nákupu: " + (await cistyText(p, "#v-nakup")).slice(0, 500));

  const suhrn = await p.evaluate(() => {
    const s = document.querySelector(".nakup-suhrn");
    return s ? s.textContent.replace(/\s+/g, " ").trim() : "‹chýba›";
  });
  P("2.2 súhrn nákupu: " + suhrn);

  const oddelenia = await p.evaluate(() => [...document.querySelectorAll("#nakup-list .odd h3, #nakup-list details summary")].map(h => h.textContent.replace(/\s+/g, " ").trim()));
  P("2.3 oddelenia: " + JSON.stringify(oddelenia));

  // odškrtávanie jednou rukou: kde sú riadky voči palcu, či ich neprekrýva spodná lišta
  const palec = await p.evaluate(() => {
    const bot = document.getElementById("botnav");
    const br = bot ? bot.getBoundingClientRect() : null;
    const rows = [...document.querySelectorAll("#nakup-list .nak-row")];
    const vh = innerHeight;
    const zakryte = rows.filter(r => { const q = r.getBoundingClientRect(); return q.top < vh && q.bottom > 0 && br && q.bottom > br.top && q.top < br.bottom; });
    const posledny = rows[rows.length - 1];
    document.getElementById("v-nakup").scrollIntoView && window.scrollTo(0, document.body.scrollHeight);
    return {
      riadkov: rows.length,
      vyskaRiadku: rows[0] ? Math.round(rows[0].getBoundingClientRect().height) : 0,
      botnavTop: br ? Math.round(br.top) : null, vh,
      prekryteSpodnouListou: zakryte.length,
      poslednyText: posledny ? posledny.textContent.replace(/\s+/g, " ").trim().slice(0, 40) : "",
    };
  });
  P("2.4 odškrtávanie: " + JSON.stringify(palec));

  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(400);
  await snap(p, "nakup-koniec");
  const koniec = await p.evaluate(() => {
    const bot = document.getElementById("botnav"); const br = bot.getBoundingClientRect();
    const rows = [...document.querySelectorAll("#nakup-list .nak-row")];
    const posledny = rows[rows.length - 1]; const q = posledny.getBoundingClientRect();
    return { poslednyBottom: Math.round(q.bottom), botnavTop: Math.round(br.top), prekryty: q.bottom > br.top && q.top < br.bottom, text: posledny.textContent.replace(/\s+/g, " ").trim().slice(0, 50) };
  });
  P("2.5 posledná položka vs spodná lišta: " + JSON.stringify(koniec));

  // odškrtnutie ťuknutím na názov
  const pred = await p.evaluate(() => Object.keys(S.nakupCheck).length);
  await p.evaluate(() => { const r = document.querySelector("#nakup-list .nak-row"); r.scrollIntoView({ block: "center" }); });
  await p.waitForTimeout(300);
  const box = await p.evaluate(() => { const e = document.querySelector("#nakup-list .nak-row label .nm2"); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(box.x, box.y);
  await p.waitForTimeout(400);
  const po = await p.evaluate(() => Object.keys(S.nakupCheck).length);
  P("2.6 ťuknutie na názov suroviny odškrtne: " + (po > pred ? "ÁNO" : "NIE") + ` (${pred} → ${po})`);
  await snap(p, "nakup-odskrtnute");

  // ceny
  const ceny = await p.evaluate(() => {
    const s = document.querySelector(".nakup-suhrn");
    return { suhrn: s ? s.textContent.replace(/\s+/g, " ") : "", bezCeny: document.querySelectorAll("#nakup-list .badge.price").length };
  });
  P("2.7 ceny: " + JSON.stringify(ceny).slice(0, 400));

  // špajza
  await p.evaluate(() => window.prepni("spajza"));
  await p.waitForTimeout(400);
  await snap(p, "spajza-prazdna");
  P("2.8 Špajza (prázdna): " + (await cistyText(p, "#v-spajza")).slice(0, 400));

  // ═══ PRECHOD 3 — KUCHYŇA ══════════════════════════════════════════════════
  P("\n════════ PRECHOD 3: KUCHYŇA ════════");
  await p.evaluate(() => window.prepni("planovac"));
  await p.waitForTimeout(400);
  const otvorene = await p.evaluate(() => {
    const b = document.querySelector("#plan-table .plan-cell .pc-odkaz");
    if (!b) return "‹v pláne nie je klikateľný názov jedla›";
    b.click(); return b.textContent.trim();
  });
  await p.waitForTimeout(700);
  await snap(p, "recept-z-planu");
  P("3.1 recept otvorený z plánu: " + otvorene);
  const detail = await p.evaluate(() => ({
    nadpis: (document.querySelector("#modal h2") || {}).textContent || "",
    porcie: (document.querySelector("#modal .porcie-box") || {}).textContent.replace(/\s+/g, " ").trim() || "",
    fotka: !!document.querySelector("#modal .foto img, #modal img"),
    emoji: (document.querySelector("#modal .foto") || {}).textContent || "",
    tlacidla: [...document.querySelectorAll("#modal .btn-row button")].map(b => b.textContent.trim()),
    ing: document.querySelectorAll("#ing-body tr").length,
    kroky: document.querySelectorAll("#postup-ol li").length,
  }));
  P("3.2 detail: " + JSON.stringify(detail));

  // prepočet porcií
  await p.evaluate(() => { const b = [...document.querySelectorAll("#modal .stepper button")].find(x => x.textContent.trim() === "+"); if (b) b.click(); });
  await p.waitForTimeout(300);
  const poPorcii = await p.evaluate(() => ({ porcie: (document.querySelector("#modal .porcie-box") || {}).textContent.replace(/\s+/g, " ").trim(), prvaIng: (document.querySelector("#ing-body tr") || {}).textContent.replace(/\s+/g, " ").trim() }));
  P("3.3 po zvýšení porcií: " + JSON.stringify(poPorcii));
  await snap(p, "recept-porcie");

  // režim varenia
  await p.evaluate(() => window.spustiCook());
  await p.waitForTimeout(700);
  await snap(p, "varenie-1");
  const cook = await p.evaluate(() => ({
    otvorene: document.getElementById("cook").classList.contains("open"),
    text: (document.getElementById("cook").textContent || "").replace(/\s+/g, " ").slice(0, 400),
    tlacidla: [...document.querySelectorAll("#cook button")].map(b => b.textContent.replace(/\s+/g, " ").trim()).slice(0, 14),
    velkostPisma: (() => { const e = document.querySelector("#cook .krok, #cook .cook-krok, #cook p"); return e ? getComputedStyle(e).fontSize : "?"; })(),
  }));
  P("3.4 režim varenia: " + JSON.stringify(cook));

  // časovač
  const casovac = await p.evaluate(() => {
    const b = [...document.querySelectorAll("#cook button")].find(x => /časov/i.test(x.textContent));
    if (!b) return "‹tlačidlo časovača nenájdené›";
    b.click(); return b.textContent.trim();
  });
  await p.waitForTimeout(600);
  await snap(p, "varenie-casovac");
  P("3.5 časovač: " + casovac + " · dialóg: " + (await cistyText(p, "#dlg-modal")).slice(0, 200));
  await p.evaluate(() => { try { window.dlgZavri(null); } catch (e) {} });
  await p.waitForTimeout(200);
  await p.evaluate(() => { try { window.zavriCook(); } catch (e) {} });
  await p.waitForTimeout(300);

  P("\nCHYBY V KONZOLE počas celej prehliadky: " + (p.chyby.length ? JSON.stringify(p.chyby, null, 1) : "žiadne"));
  await E.zavri(p);
  await E.koniec();
  P("\nScreenshoty: " + OUT);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
