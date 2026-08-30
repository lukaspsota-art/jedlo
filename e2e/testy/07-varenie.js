// 07 — Režim varenia: kroky, časovače, wake lock, zavretie
// KRITICKÉ (CLAUDE.md): dialóg MUSÍ byť nad režimom varenia, inak sa „➕ Časovač" otvorí
// neviditeľne a appka čaká na odpoveď, ktorú používateľ nemá ako dať.
"use strict";
const { prepni, zavriOkna } = require("../lib");

module.exports = {
  nazov: "Režim varenia",
  async spusti(E, t) {
    const page = await E.novaStranka();
    await prepni(page, "recepty");

    // recept s viacerými krokmi a časom v texte (aby sa objavil krokový časovač)
    const id = await page.evaluate(() =>
      (RECEPTY.find((r) => (r.postup || []).length >= 4 && (r.postup || []).some((k) => /\d+\s*min/i.test(k))) ||
       RECEPTY.find((r) => (r.postup || []).length >= 4)).id);

    await page.evaluate((i) => window.otvor(i), id);
    await page.waitForTimeout(150);
    await page.locator("#modal .btn.primary", { hasText: "Variť" }).click();
    await page.waitForTimeout(300);

    const start = await page.evaluate(() => ({
      otvorene: document.getElementById("cook").classList.contains("open"),
      vidno: getComputedStyle(document.getElementById("cook")).display !== "none",
      titulok: document.getElementById("cook-title").textContent,
      krok: document.getElementById("cook-step").textContent,
      progres: document.getElementById("cook-progress").textContent,
      krokov: cookKroky.length,
    }));
    await t.ok(start.otvorene && start.vidno, "„👨‍🍳 Variť“ otvorí režim varenia", JSON.stringify(start));
    await t.ok(start.titulok.length > 2, "režim varenia ukazuje názov receptu", start.titulok);
    await t.ok(/^1\. /.test(start.krok), "režim varenia začína prvým krokom", start.krok.slice(0, 60));
    await t.ok(start.progres === `1 / ${start.krokov}`, "progres ukazuje 1 / N", start.progres);

    // ── kroky dopredu/dozadu ────────────────────────────────────────────────
    await page.locator("#cook .nav2 button", { hasText: "Ďalej" }).click();
    await page.waitForTimeout(120);
    const k2 = await page.evaluate(() => ({ krok: document.getElementById("cook-step").textContent, p: document.getElementById("cook-progress").textContent }));
    await t.ok(/^2\. /.test(k2.krok) && k2.p === `2 / ${start.krokov}`, "„Ďalej“ posunie na krok 2", JSON.stringify(k2));

    await page.locator("#cook .nav2 button", { hasText: "Späť" }).click();
    await page.waitForTimeout(120);
    const k1 = await page.evaluate(() => document.getElementById("cook-progress").textContent);
    await t.ok(k1 === `1 / ${start.krokov}`, "„Späť“ vráti na krok 1", k1);

    // hranica: „Späť“ na prvom kroku nesmie ísť pod 1
    await page.locator("#cook .nav2 button", { hasText: "Späť" }).click();
    await page.waitForTimeout(100);
    await t.ok(await page.evaluate(() => document.getElementById("cook-progress").textContent) === `1 / ${start.krokov}`,
      "„Späť“ na prvom kroku nespadne pod 1");

    // ── krokový časovač (ak krok spomína minúty) ───────────────────────────
    const maKrokovy = await page.evaluate(() => {
      for (let i = 0; i < cookKroky.length; i++) { cookKrok = i; ukazKrok(); const b = document.getElementById("cook-add-timer"); if (b.style.display !== "none") return { i, text: b.textContent, sek: b.dataset.sek }; }
      cookKrok = 0; ukazKrok(); return null;
    });
    if (maKrokovy) {
      await t.ok(+maKrokovy.sek > 0, `krok s časom ponúka tlačidlo časovača („${maKrokovy.text}“)`, JSON.stringify(maKrokovy));
      await page.evaluate((i) => { cookKrok = i; ukazKrok(); }, maKrokovy.i);
      await page.click("#cook-add-timer");
      await page.waitForTimeout(200);
      const cas = await page.evaluate(() => ({ pocet: casovace.length, dom: document.querySelectorAll("#cook-timers .timer, #cook-timers > *").length, text: document.getElementById("cook-timers").textContent }));
      await t.ok(cas.pocet === 1, "krokový časovač sa pridá", JSON.stringify(cas));
      await t.ok(/\d\d:\d\d/.test(cas.text), "bežiaci časovač ukazuje mm:ss", cas.text);
      // odpočítava
      await page.evaluate(() => { casovace[0].left = 5; renderCasovace(); });
      const t1 = await page.evaluate(() => casovace[0].left);
      await page.waitForTimeout(1800);
      const t2 = await page.evaluate(() => casovace[0].left);
      await t.ok(t2 < t1, `časovač odpočítava (${t1} → ${t2} s)`, `${t1} → ${t2}`);
      await page.evaluate(() => { zmazCasovac(casovace[0].id); });
      await t.ok(await page.evaluate(() => casovace.length) === 0, "časovač sa dá zmazať");
    } else {
      await t.ok(false, "nenašiel sa krok s časovým údajom na test krokového časovača");
    }

    // ── KRITICKÉ: dialóg „➕ Časovač“ musí byť VIDITEĽNÝ nad režimom varenia ─
    const zi = await page.evaluate(() => ({
      cook: +getComputedStyle(document.getElementById("cook")).zIndex,
      dlg: +getComputedStyle(document.getElementById("dlg-overlay")).zIndex,
      overlay: +getComputedStyle(document.getElementById("overlay")).zIndex,
      toast: +getComputedStyle(document.getElementById("toast")).zIndex,
    }));
    await t.ok(zi.dlg > zi.cook, `dialóg (z-index ${zi.dlg}) je nad režimom varenia (${zi.cook})`, JSON.stringify(zi));
    await t.ok(zi.toast > zi.dlg, `toast (${zi.toast}) je nad dialógom (${zi.dlg})`, JSON.stringify(zi));

    // a hlavne: skutočný klik na „➕ Časovač“ v kuchyni
    await page.locator("#cook button.timer", { hasText: "➕ Časovač" }).click();
    await page.waitForTimeout(300);
    const dlg = await page.evaluate(() => {
      const o = document.getElementById("dlg-overlay");
      const btn = document.querySelector("#dlg-modal .btn.primary");
      const inp = document.getElementById("dlg-in");
      if (!btn) return { otvorene: o.classList.contains("open"), btn: null };
      const r = btn.getBoundingClientRect();
      const naVrchu = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const ri = inp.getBoundingClientRect();
      const naVrchuInp = document.elementFromPoint(ri.x + ri.width / 2, ri.y + ri.height / 2);
      return {
        otvorene: o.classList.contains("open"),
        display: getComputedStyle(o).display,
        btnText: btn.textContent,
        btnNaVrchu: naVrchu === btn || btn.contains(naVrchu),
        inpNaVrchu: naVrchuInp === inp,
        prekryva: naVrchu ? naVrchu.tagName + "#" + naVrchu.id + "." + naVrchu.className : null,
      };
    });
    await t.ok(dlg.otvorene && dlg.display !== "none", "„➕ Časovač“ v kuchyni otvorí dialóg", JSON.stringify(dlg));
    await t.ok(dlg.btnNaVrchu === true,
      "tlačidlo OK dialógu je NA VRCHU (nie schované pod čiernou obrazovkou varenia)", JSON.stringify(dlg));
    await t.ok(dlg.inpNaVrchu === true, "pole dialógu je klikateľné nad režimom varenia", JSON.stringify(dlg));

    // dialóg sa dá naozaj obsluhovať a hodnota sa použije
    await page.fill("#dlg-in", "3");
    await page.click("#dlg-modal .btn.primary");
    await page.waitForTimeout(300);
    const poDlg = await page.evaluate(() => ({ pocet: casovace.length, left: casovace[0] && casovace[0].left, otvorene: document.getElementById("dlg-overlay").classList.contains("open") }));
    await t.ok(!poDlg.otvorene, "dialóg sa po potvrdení zavrie", JSON.stringify(poDlg));
    await t.ok(poDlg.pocet === 1 && poDlg.left >= 175 && poDlg.left <= 180, "zadaná hodnota (3 min) vytvorí časovač 180 s", JSON.stringify(poDlg));

    // Escape zatvorí dialóg bez akcie
    await page.evaluate(() => { window.pridajCasovac(); });
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const esc = await page.evaluate(() => ({ dlg: document.getElementById("dlg-overlay").classList.contains("open"), cook: document.getElementById("cook").classList.contains("open"), casovacov: casovace.length }));
    await t.ok(!esc.dlg, "Escape zatvorí dialóg", JSON.stringify(esc));
    await t.ok(esc.cook, "Escape zatvorí najprv dialóg, nie celý režim varenia", JSON.stringify(esc));
    await t.ok(esc.casovacov === 1, "zrušený dialóg nepridá časovač", JSON.stringify(esc));

    // ── wake lock (v headless nemusí byť — ošetrené) ────────────────────────
    const wl = await page.evaluate(() => ({ podpora: "wakeLock" in navigator, drzime: !!window.wakeLock }));
    if (wl.podpora) {
      await t.ok(true, `wake lock je podporovaný a appka si ho pýta (drží: ${wl.drzime})`);
      t.metrika("wake lock", wl.drzime ? "získaný" : "podporovaný, ale nezískaný (headless)");
    } else {
      await t.ok(true, "wake lock nie je v tomto prehliadači — appka to nesmie zhodiť (a nezhodila)");
      t.metrika("wake lock", "nepodporovaný v headless Chromiu");
    }
    await t.ok(page.chyby.filter((c) => /wakeLock|wake lock/i.test(c.text)).length === 0,
      "chýbajúci wake lock nevyhodí chybu do konzoly");

    // ── zavretie režimu varenia ─────────────────────────────────────────────
    await page.locator("#cook .ch button", { hasText: "Koniec" }).click();
    await page.waitForTimeout(250);
    const koniec = await page.evaluate(() => ({
      otvorene: document.getElementById("cook").classList.contains("open"),
      vidno: getComputedStyle(document.getElementById("cook")).display !== "none",
      casovacov: casovace.length,
      timerDom: document.getElementById("cook-timers").textContent.trim(),
      scroll: document.body.style.overflow,
    }));
    await t.ok(!koniec.otvorene && !koniec.vidno, "„✕ Koniec“ zavrie režim varenia", JSON.stringify(koniec));
    await t.ok(koniec.casovacov === 0 && koniec.timerDom === "", "zavretie zruší bežiace časovače", JSON.stringify(koniec));

    // ── dokončenie posledného kroku → zápis do histórie ────────────────────
    await page.evaluate((i) => { window.otvor(i); }, id);
    await page.waitForTimeout(120);
    await page.evaluate(() => window.spustiCook());
    await page.waitForTimeout(150);
    await page.evaluate(async () => {
      cookKrok = cookKroky.length - 1; ukazKrok();
      const p = krok(1);
      await new Promise((r) => setTimeout(r, 120));
      const btn = document.querySelector("#dlg-modal .btn"); // „Zrušiť" — špajza nech ostane nedotknutá
      if (btn) btn.click();
      await p;
    });
    await page.waitForTimeout(250);
    const hist = await page.evaluate((i) => ({ uvarene: (S.uvarene || []).length, prvy: (S.uvarene[0] || {}).id, cook: document.getElementById("cook").classList.contains("open") }), id);
    await t.ok(hist.uvarene >= 1 && hist.prvy === id, "dokončenie posledného kroku zapíše recept do histórie varenia", JSON.stringify(hist));
    await t.ok(!hist.cook, "po dovarení sa režim varenia zavrie", JSON.stringify(hist));

    await zavriOkna(page);
    await t.ok(page.chyby.length === 0, "žiadna chyba v konzole v režime varenia",
      page.chyby.map((c) => `${c.typ}: ${c.text}`).join("\n"));
    await E.zavri(page);
  },
};
