// Testy k Etape 4 (B7, B8, B9, D1, D7, D10). Beh: node test_ux.js
const assert = require("assert");
const { load } = require("./test_harness");

const PONDELOK = "2026-08-17";
function novy(profil) {
  return load({
    stav: {
      viewOd: PONDELOK,
      hranice: [true, false, true, false, false, true, false], // A = Po–Ut, B = St–Pi, C = So–Ne
      blokMode: true,
      genCfg: { zachovat: false, cielMode: true, filtre: [] },
      profil: Object.assign({ osoby: 1, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }] }, profil || {}),
    },
  });
}
function vloz(app, r) { app.RECEPTY.push(r); return r; }
const recept = (id, kcal) => ({ id, nazov: id, kategoria: "Hlavné jedlo", kuchyna: "", porcie: 1,
  kcal_na_porciu: kcal, ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }], postup: [], tagy: [] });

let bezov = 0;
const fronta = [];
// testy bežia v poradí; asynchrónny test (generátor, skopirujMinuly) sa naozaj dočká výsledku
function ok(popis, fn) { fronta.push({ popis, fn }); }
async function spusti() {
  for (const { popis, fn } of fronta) {
    if (popis === null) { console.log(fn); continue; }
    await fn();
    console.log("  ✓ " + popis); bezov++;
  }
  console.log("\nOK — " + bezov + " kontrol prešlo.");
}
const nadpis = t => fronta.push({ popis: null, fn: t });

// ─────────────────────────────────────────────────────────── B7 dni „preč"
nadpis("B7 — dni „preč“ (dovolenka)");
ok("blok Po–Ut s „preč“ v utorok navarí 2 porcie, nie 4", () => {
  const app = novy({ stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }] });
  const S = app.S;
  ["Raňajky", "Obed", "Večera", "Snack"].forEach((sl, i) => vloz(app, recept("r" + i, [360, 510, 440, 140][i])));
  [0, 1].forEach(di => {
    S.plan[app.datumPre(di)] = { Raňajky: ["r0"], Obed: ["r1"], Večera: ["r2"], Snack: ["r3"] };
  });
  const oboch = app.porcieSlotBlok(0, "Obed", "r1");
  S.tyzdenProfil = { [PONDELOK]: { ludia: null, prec: [1] } };  // utorok sme preč
  const jeden = app.porcieSlotBlok(0, "Obed", "r1");
  assert.strictEqual(oboch, 4, "2 dni × 2 stravníci = 4 porcie, dostal som " + oboch);
  assert.strictEqual(jeden, 2, "s „preč“ v utorok má byť 2 porcie, dostal som " + jeden);
});
ok("generátor naplní blok aj keď je preč PRVÝ deň bloku", async () => {
  const app = novy();
  const S = app.S;
  S.tyzdenProfil = { [PONDELOK]: { ludia: null, prec: [0] } };  // pondelok preč, blok A = Po–Ut
  return app.generujJedalnicek(true).then(() => {
    const po = app.slotIds(0, "Obed"), ut = app.slotIds(1, "Obed");
    assert.strictEqual(po.length, 0, "v pondelok sme preč, nemá tam byť nič");
    assert.ok(ut.length > 0, "utorok zostal bez jedla — celý blok vypadol");
  });
});

// ─────────────────────────────────────────────────────────── B8 prah 200 kcal
nadpis("\nB8 — dorovnávanie na cieľ");
ok("47 kcal rozdielu nesmie zmeniť nákup 7×", () => {
  const app = novy();
  const S = app.S;
  vloz(app, recept("male", 175)); vloz(app, recept("vacsie", 222));
  S.plan[app.datumPre(0)] = { Obed: ["male"] };
  const a = app.pocetPorcii(0);
  S.plan[app.datumPre(0)] = { Obed: ["vacsie"] };
  const b = app.pocetPorcii(0);
  assert.ok(Math.abs(a - b) < 1.5, "175 kcal → " + a.toFixed(2) + " porcie, 222 kcal → " + b.toFixed(2));
});
ok("strop je 2× počet stravníkov", () => {
  const app = novy({ stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }] });
  const S = app.S;
  vloz(app, recept("drobec", 60)); vloz(app, recept("drobec2", 60));
  S.plan[app.datumPre(0)] = { Obed: ["drobec"], Večera: ["drobec2"] };
  assert.ok(app.pocetPorcii(0) <= 4.001, "porcií: " + app.pocetPorcii(0));
});
ok("bez prepínača „Dorovnať dni na cieľ“ je počet porcií = počet stravníkov", () => {
  const app = novy();
  const S = app.S;
  S.genCfg.cielMode = false;
  vloz(app, recept("obed", 500)); vloz(app, recept("vecera", 400));
  S.plan[app.datumPre(0)] = { Obed: ["obed"], Večera: ["vecera"] };
  assert.strictEqual(app.pocetPorcii(0), 1);
});
ok("deň s jediným jedlom sa nedorovnáva na celý denný cieľ", () => {
  const app = novy();
  const S = app.S;
  vloz(app, recept("samotny", 400));
  S.plan[app.datumPre(0)] = { Obed: ["samotny"] };
  assert.strictEqual(app.pocetPorcii(0), 1, "jedno jedlo nie je celý deň: " + app.pocetPorcii(0));
});

// ─────────────────────────────────────────────────────────── B9 dayPpl × pf
nadpis("\nB9 — ručný počet ľudí a % veľkosti porcie");
ok("dayPpl = 4 a faktor 0,8 navarí 4 porcie, nie 3,2", () => {
  const app = novy();
  const S = app.S;
  vloz(app, recept("obed2", 500));
  const iso = app.datumPre(0);
  S.plan[iso] = { Obed: ["obed2"] };
  S.dayPpl = { [iso]: 4 };
  S.planF = { [iso]: { Obed: 0.8 } };
  assert.ok(Math.abs(app.mnozMult(0, "Obed") - 4) < 1e-9, "mnozMult = " + app.mnozMult(0, "Obed"));
});
ok("to isté platí pre týždňový počet ľudí aj pre slotPpl", () => {
  const app = novy();
  const S = app.S;
  vloz(app, recept("obed3", 500));
  const iso = app.datumPre(0);
  S.plan[iso] = { Obed: ["obed3"] };
  S.planF = { [iso]: { Obed: 0.8 } };
  S.tyzdenProfil = { [PONDELOK]: { ludia: 3, prec: [] } };
  assert.ok(Math.abs(app.mnozMult(0, "Obed") - 3) < 1e-9, "týždeň: " + app.mnozMult(0, "Obed"));
  S.slotPpl = { [iso]: { Obed: 5 } };
  assert.ok(Math.abs(app.mnozMult(0, "Obed") - 5) < 1e-9, "slot: " + app.mnozMult(0, "Obed"));
});

// ─────────────────────────────────────────────────────────── D1 výkon
nadpis("\nD1 — výkon hľadania");
ok("4 prekreslenia mriežky (1336 receptov) pod 1,5 s", () => {
  const app = novy();
  const t = Date.now();
  for (let i = 0; i < 4; i++) app.__orig.renderGrid();
  const ms = Date.now() - t;
  assert.ok(ms < 1500, "4 prekreslenia trvali " + ms + " ms");
  console.log("      (nameraných " + ms + " ms)");
});

// ─────────────────────────────────────────────────────────── D7 archív
nadpis("\nD7 — „Skopíruj minulý týždeň“");
ok("kopíruje sa NAJNOVŠÍ uložený týždeň (archív je unshift)", () => {
  const app = novy();
  const S = app.S;
  vloz(app, recept("stary", 500)); vloz(app, recept("novy", 500));
  S.archiv = [
    { id: "a2", nazov: "novší", plan: { 0: { Obed: ["novy"] } }, planF: {} },
    { id: "a1", nazov: "starší", plan: { 0: { Obed: ["stary"] } }, planF: {} },
  ];
  return app.skopirujMinuly().then(() => {
    assert.deepStrictEqual(app.slotIds(0, "Obed"), ["novy"], "skopíroval sa " + app.slotIds(0, "Obed"));
  });
});

// ─────────────────────────────────────────────────────────── D10 stabilné radenie
nadpis("\nD10 — „Čo variť dnes“");
ok("výber nie je závislý od nedefinovaného radenia (Math.random v komparátore)", () => {
  const app = novy();
  const src = require("fs").readFileSync(__dirname + "/data/app.js", "utf8");
  const zle = /\.sort\(\([^)]*\)\s*=>\s*[^)]*Math\.random\(\)/.test(src);
  assert.ok(!zle, "v app.js je stále komparátor s Math.random()");
});

// ─────────────────────────────────────────────────────────── U1 mobilné UI
nadpis("\nU1 — menej tlačidiel v bunke plánu");
ok("„⋯ viac“ v bunke plánu ponúkne všetky 4 sekundárne akcie", () => {
  const app = novy();
  app.akcieSlotu(2, "Obed");
  const h = app.document.getElementById("pick-modal").innerHTML;
  ["pridajKomponent(2,'Obed')", "regenerujSlot(2,'Obed')", "upravSlotPorcie(2,'Obed')", "pridajZvysok(2,'Obed')"]
    .forEach(fn => assert.ok(h.includes(fn), "v paneli chýba " + fn));
  assert.ok(app.document.getElementById("pick-overlay").classList.contains("open"), "panel sa neotvoril");
});

// ─────────────────────────────────────────────────────── U6 rozvrh varenia (bloky)
nadpis("\nU6 — rozvrh varenia (bloky)");
ok("dialóg rozvrhu sa otvorí VŽDY, aj keď sú bloky vypnuté", () => {
  const app = novy();
  app.S.blokMode = false;
  app.otvorRozvrh();
  const h = app.document.getElementById("pick-modal").innerHTML;
  assert.ok(h.includes("Rozvrh varenia"), "dialóg sa neotvoril bez blokového režimu");
  assert.ok(app.document.getElementById("pick-overlay").classList.contains("open"), "panel sa neotvoril");
});
ok("dialóg ponúka hotové predvoľby vrátane rozvrhu používateľa (Ne/Ut/Pi večer)", () => {
  const app = novy();
  app.otvorRozvrh();
  const h = app.document.getElementById("rozvrh-body").innerHTML;
  ["ja", "2x", "tv", "1x", "4x", "denne"].forEach(id =>
    assert.ok(h.includes("pouziRozvrh('" + id + "')"), "chýba predvoľba " + id));
  const ja = app.ROZVRHY_PRED.find(r => r.id === "ja");
  assert.strictEqual(JSON.stringify(app.hraniceNaBloky(ja.hranice)), "[[0,1],[2,3,4],[5,6]]");
});
ok("stará cesta otvorRozdelenie() nikoho nevyhodí — otvorí nový dialóg", () => {
  const app = novy();
  app.otvorRozdelenie();
  assert.ok(app.document.getElementById("pick-modal").innerHTML.includes("Rozvrh varenia"));
});
ok("predvoľba prestaví bloky (1 blok / 4 bloky / denný režim)", () => {
  const app = novy();
  app.S.blokMode = true;
  app.pouziRozvrh("1x");
  assert.strictEqual(JSON.stringify(app.bloky()), "[[0,1,2,3,4,5,6]]", JSON.stringify(app.bloky()));
  app.pouziRozvrh("4x");
  assert.strictEqual(JSON.stringify(app.bloky()), "[[0,1],[2,3],[4,5],[6]]", JSON.stringify(app.bloky()));
  app.pouziRozvrh("denne");
  assert.strictEqual(app.S.blokMode, false, "„Každý deň zvlášť“ nevyplo bloky");
});
ok("↩︎ Vrátiť pôvodný vráti hranice aj režim", () => {
  const app = novy();
  app.S.blokMode = true;
  const pred = JSON.stringify(app.S.hranice);
  app.pouziRozvrh("1x");
  assert.notStrictEqual(JSON.stringify(app.S.hranice), pred, "zmena sa nepremietla");
  app.vratRozvrh();
  assert.strictEqual(JSON.stringify(app.S.hranice), pred, "vrátenie nefunguje");
  assert.strictEqual(app.S.blokMode, true);
});
ok("hranica sa dá preklikať aj priamo (ťuknutie medzi dva dni)", () => {
  const app = novy();
  app.S.blokMode = true;
  app.S.hranice = [true, false, true, false, false, true, false];
  app.toggleHranica(2);                       // spoj Po–Ut s St–Pi
  assert.strictEqual(JSON.stringify(app.bloky()), "[[0,1,2,3,4],[5,6]]", JSON.stringify(app.bloky()));
  app.toggleHranica(2);
  assert.strictEqual(JSON.stringify(app.bloky()), "[[0,1],[2,3,4],[5,6]]", JSON.stringify(app.bloky()));
});
ok("vlastný rozvrh sa dá uložiť a znovu použiť", async () => {
  const app = novy();
  app.S.blokMode = true;
  app.promptModal = () => Promise.resolve("Sťahovací týždeň");
  app.S.hranice = [true, false, false, true, false, false, false];
  await app.ulozRozvrh();
  assert.strictEqual((app.S.rozvrhy || []).length, 1, "rozvrh sa neuložil");
  assert.strictEqual(app.S.rozvrhy[0].nazov, "Sťahovací týždeň");
  app.pouziRozvrh("1x");
  app.pouziRozvrh("u:" + app.S.rozvrhy[0].id);
  assert.strictEqual(JSON.stringify(app.bloky()), "[[0,1,2],[3,4,5,6]]", JSON.stringify(app.bloky()));
});
ok("zmena rozvrhu NEZMAŽE naplnený plán, len ohlási nejednotné bloky", async () => {
  const app = novy();
  app.S.blokMode = true;
  app.S.hranice = [true, false, true, false, false, true, false];
  await app.generujJedalnicek(true);
  const pred = JSON.stringify(app.S.plan);
  assert.strictEqual(JSON.stringify(app.nejednotneBloky()), "[]", "vygenerovaný týždeň má byť jednotný");
  app.toggleHranica(2);                       // Po–Ut + St–Pi do jedného bloku
  assert.strictEqual(JSON.stringify(app.S.plan), pred, "zmena rozvrhu prepísala plán");
  assert.strictEqual(JSON.stringify(app.nejednotneBloky()), "[0]", JSON.stringify(app.nejednotneBloky()));
});
ok("„Zjednotiť bloky“ zrovná blok podľa prvého dňa (a nič nezmaže)", async () => {
  const app = novy();
  app.S.blokMode = true;
  await app.generujJedalnicek(true);
  app.toggleHranica(2);
  const prvyDen = JSON.stringify(app.S.plan[app.datumPre(0)]);
  app.zjednotBloky();
  assert.strictEqual(JSON.stringify(app.nejednotneBloky()), "[]", "bloky sa nezjednotili");
  [0, 1, 2, 3, 4].forEach(di =>
    assert.strictEqual(JSON.stringify(app.S.plan[app.datumPre(di)]), prvyDen, "deň " + di + " nesedí"));
});
ok("dialóg povie, čo sa stane s naplneným plánom", async () => {
  const app = novy();
  app.S.blokMode = true;
  await app.generujJedalnicek(true);
  app.otvorRozvrh();
  app.toggleHranica(2);
  const h = app.document.getElementById("rozvrh-body").innerHTML;
  assert.ok(h.includes("nič nemaže"), "chýba veta, že sa nič nemaže");
  assert.ok(h.includes("zjednotBloky()"), "chýba ponuka zjednotiť bloky");
  assert.ok(h.includes("vratRozvrh()"), "chýba možnosť vrátiť pôvodný rozvrh");
});
ok("pás nad plánom hovorí varný deň vetou („Varíš v nedeľu večer na…“)", () => {
  const app = novy();
  app.S.blokMode = true;
  app.S.hranice = [true, false, true, false, false, true, false];
  const bl = app.bloky();
  assert.strictEqual(app.vetaBloku(bl[0]), "Varíš v nedeľu večer na pondelok a utorok.", app.vetaBloku(bl[0]));
  assert.strictEqual(app.vetaBloku(bl[1]), "Varíš v utorok večer na stredu, štvrtok a piatok.", app.vetaBloku(bl[1]));
  assert.strictEqual(app.vetaBloku(bl[2]), "Varíš v piatok večer na sobotu a nedeľu.", app.vetaBloku(bl[2]));
  assert.ok(app.rozvrhZhrnutie().includes("3×"), app.rozvrhZhrnutie());
});
ok("generovanie nad naplneným plánom sa najprv opýta", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  let pytane = null;
  app.confirmModal = (t) => { pytane = t; return Promise.resolve(false); };
  const pred = JSON.stringify(app.S.plan);
  await app.generujTlacidlo(false);
  assert.ok(pytane && /prepíše/i.test(pytane), "neopýtalo sa: " + pytane);
  assert.strictEqual(JSON.stringify(app.S.plan), pred, "plán sa prepísal napriek zamietnutiu");
});
ok("nad prázdnym týždňom sa generovanie nepýta na nič", async () => {
  const app = novy();
  let pytane = false;
  app.confirmModal = () => { pytane = true; return Promise.resolve(true); };
  await app.generujTlacidlo(false);
  assert.ok(!pytane, "zbytočná otázka nad prázdnym týždňom");
});

// ─────────────────────────────────────────────────────────── U2 zakázané suroviny
nadpis("\nU2 — zakázané suroviny");
ok("zachytí aj skloňovaný tvar a časť slova, nie však inú surovinu", () => {
  const skus = (zakazane, nazovSuroviny) => {
    const app = novy({ zakazane });
    return app.zakazaneChyta({ nazov: "test", kategoria: "Šalát", porcie: 1, postup: [],
      ingrediencie: [{ nazov: nazovSuroviny, mnozstvo: 1, jednotka: "g" }] });
  };
  assert.ok(skus("koriander", "Koriander"), "základný tvar");
  assert.ok(skus("mlieko", "mlieka"), "skloňovanie (mlieko → mlieka)");
  assert.ok(skus("syr", "syrokrém"), "časť slova (syr → syrokrém)");
  assert.ok(skus("huby", "sušené huby"), "surovina vo viacslovnom názve");
  assert.ok(!skus("huby", "šampiňóny"), "iná surovina sa nesmie zablokovať");
  // U4: tvary, ktoré menia kmeň — reálne prípady z receptov, ktoré filtru predtým unikali
  assert.ok(skus("koriander", "Koriandrové semienka"), "koriander → koriandrové");
  assert.ok(skus("huby", "Hubový bujón"), "huby → hubový");
  assert.ok(skus("ryby", "Rybia omáčka"), "ryby → rybia");
  assert.ok(!skus("huby", "jednohubky"), "jednohubky nie sú huby");
});
ok("generátor nedá do plánu zakázanú surovinu", async () => {
  const app = novy({ zakazane: "huby, koriander", kcal: 1500, osoby: 1 });
  await app.generujJedalnicek(true);
  const zle = [];
  Object.values(app.S.plan || {}).forEach(slots => Object.values(slots).forEach(v =>
    [].concat(v).forEach(id => { const k = app.komponent(id);
      if (k && app.zakazaneChyta(k)) zle.push(k.nazov); })));
  assert.strictEqual(zle.length, 0, "v pláne: " + zle.join(", "));
});

// ─────────────────────────────────────────────────────────── U3 poradie vrstiev
nadpis("\nU3 — poradie vrstiev (z-index)");
ok("dialóg je nad režimom varenia a toast nad dialógom", () => {
  const css = require("fs").readFileSync(__dirname + "/data/sablona.html", "utf8");
  const z = re => { const m = css.match(re); return m ? parseInt(m[1]) : null; };
  const cook = z(/\.cook\{[^}]*z-index:(\d+)/);
  const dlg = z(/#dlg-overlay\{[^}]*z-index:(\d+)/);
  const toast = z(/#toast\{[^}]*z-index:(\d+)/);
  assert.ok(cook && dlg && toast, `nenašiel som z-index: cook=${cook} dlg=${dlg} toast=${toast}`);
  // „➕ Časovač" v kuchyni otvára prompt — pod režimom varenia by bol neviditeľný a appka by čakala naprázdno
  assert.ok(dlg > cook, `dialóg (${dlg}) musí byť nad režimom varenia (${cook})`);
  assert.ok(toast >= dlg, `toast (${toast}) nesmie byť pod dialógom (${dlg})`);
});

// ─────────────────────────────────────────────────────────── V1 vyhľadávanie
nadpis("\nV1 — vyhľadávanie (názov aj surovina)");
const misa = (id, nazov) => ({ id, nazov, kategoria: "Hlavné jedlo", kuchyna: "", porcie: 2, kcal_na_porciu: 500,
  ingrediencie: [{ nazov: "Cícer", mnozstvo: 200, jednotka: "g" }, { nazov: "Paradajky", mnozstvo: 2, jednotka: "ks" }],
  postup: [], tagy: [] });

ok("hľadanie chytí surovinu aj v inom páde, nie cudziu", () => {
  const app = novy();
  const r = vloz(app, misa("v1", "Letná misa"));
  assert.ok(app.hladaSedi(r, "letna"), "názov");
  assert.ok(app.hladaSedi(r, "cicer"), "surovina");
  assert.ok(app.hladaSedi(r, "paradajka"), "surovina v inom páde („paradajka“ vs „Paradajky“)");
  assert.ok(!app.hladaSedi(r, "losos"), "surovina, ktorá v recepte nie je");
});

ok("picker v pláne hľadá aj podľa suroviny a ukáže ktorá sedí", () => {
  const app = novy();
  const r = vloz(app, misa("v2", "Nedeľný obed"));
  r.ingrediencie.push({ nazov: "Zubrovka", mnozstvo: 1, jednotka: "pl" }); // surovina, ktorú nemá žiadny reálny recept
  app.pickSearchInput("žubrovky");
  const html = app.document.getElementById("pick-search-results").innerHTML;
  assert.ok(html.includes("Nedeľný obed"), "picker nenašiel recept podľa suroviny: " + html.slice(0, 200));
  assert.ok(html.includes("🥕 Zubrovka"), "chýba hint, ktorá surovina sedí: " + html.slice(0, 200));
});

// ─────────────────────────────────────────────────────────── A8 prístupnosť klávesnicou
nadpis("\nA8 — klávesnica (WCAG 2.1.1 / 2.4.3)");
const ZDROJ = require("fs").readFileSync(__dirname + "/data/app.js", "utf8");

ok("karta receptu je JEDEN obal s rolou tlačidla, tabindexom a aria-label", () => {
  const app = novy();
  const h = app.kartaHTML(app.RECEPTY[0]);
  assert.ok(h.includes('class="card-open" role="button" tabindex="0"'), "karta nemá obal card-open s rolou: " + h.slice(0, 160));
  assert.ok(/aria-label="[^"]+ — otvoriť recept"/.test(h), "karte chýba aria-label s názvom receptu");
  // pôvodný stav: `.thumb` aj `.body` mali vlastný onclick a ani jeden nebol dosiahnuteľný Tabom
  assert.ok(!/<div class="thumb"[^>]*onclick/.test(h), "thumb má stále vlastný onclick");
  assert.ok(!/<div class="body"[^>]*onclick/.test(h), "body má stále vlastný onclick");
  assert.strictEqual((h.match(/onclick=/g) || []).length, 2, "na karte majú byť práve 2 akcie (★ a otvorenie)");
});

ok("★ na karte má aria-label aj aria-pressed", () => {
  const app = novy();
  const h = app.kartaHTML(app.RECEPTY[0]);
  assert.ok(/class="fav" aria-pressed="(true|false)" aria-label="[^"]+"/.test(h), "★ nemá stav ani menovku: " + h.slice(0, 120));
});

ok("bunka plánu je zo skutočných <button>, nie zo `span onclick`", () => {
  // renderPlan je v harnesse stubnutý (testy nekreslia), preto kontrolujeme zdroj
  const usek = ZDROJ.slice(ZDROJ.indexOf("function renderPlan("), ZDROJ.indexOf("let dragSrc="));
  assert.ok(usek.length > 500, "nenašiel som telo renderPlan");
  assert.ok(!/<span class="rm"[^>]*onclick/.test(usek), "„✎ zmeniť“/„⋯ viac“ sú stále span onclick");
  assert.ok(!/<span class="kc"[^>]*onclick/.test(usek), "riadok kcal je stále span onclick");
  assert.ok(!/<span class="nm"[^>]*onclick/.test(usek), "názov jedla je stále span onclick");
  assert.ok(!/<div class="plan-cell prazdne"[^>]*onclick/.test(usek), "prázdna bunka je stále div onclick");
  ["pc-btn", "pc-empty", "pc-x"].forEach(c => assert.ok(usek.includes(c), "v bunke chýba trieda " + c));
  // každé ovládanie v bunke musí mať menovku — sú to samé ikonky a skratky
  assert.ok((usek.match(/aria-label=/g) || []).length >= 6, "v bunke plánu je málo aria-label");
});

ok("skip-link je prvý tab-stop a v Receptoch mieri rovno na mriežku", () => {
  const html = require("fs").readFileSync(__dirname + "/data/sablona.html", "utf8");
  const telo = html.slice(html.indexOf("<body>"));
  assert.ok(/^<body>\s*<a class="skip"/.test(telo.trim().replace(/\n/g, "")) || /<body>\s*\n?<a class="skip"/.test(telo),
    "skip-link nie je prvý prvok v <body>");
  assert.ok(html.includes('id="grid" tabindex="-1"'), "mriežka nie je cieľom skip-linku (chýba tabindex=-1)");
  assert.ok(html.includes('id="obsah" tabindex="-1"'), "obsah nie je fokusovateľný cieľ");
  assert.ok(/\.skip\{[^}]*left:-9999px/.test(html) && /\.skip:focus\{[^}]*left:0/.test(html),
    "skip-link nie je schovaný mimo obrazovky, kým nedostane fokus");
  assert.ok(ZDROJ.includes("function preskocNaObsah"), "chýba preskocNaObsah");
  assert.ok(/aktualizujSkip\(\)/.test(ZDROJ), "text skip-linku sa nemení podľa obrazovky");
});
ok("predvolené radenie receptov dá jedlá pred nápoje a kokteily", () => {
  const app = novy();
  const grid = app.document.getElementById("grid");
  const pred = grid.children.length;
  app.__orig.renderGrid();                                  // prvá dávka = to, čo človek vidí ako prvé
  const davka = [...grid.children].slice(pred);
  assert.ok(davka.length >= 30, "malá dávka: " + davka.length);
  const napoje = davka.filter(c => /Kokteil|Nápoj/.test(c.innerHTML));
  assert.strictEqual(napoje.length, 0, "na prvej obrazovke Receptov je " + napoje.length + " nápojov/kokteilov");
  // nič sa nesmie stratiť — počítadlo ukazuje všetkých 1956
  assert.strictEqual(app.document.getElementById("pocet").textContent, app.RECEPTY.length,
    "predvolené radenie zmenilo počet receptov");
});
ok("stravníci sú na Domove, nielen v Nastaveniach", () => {
  const html = require("fs").readFileSync(__dirname + "/data/sablona.html", "utf8");
  const domov = html.slice(html.indexOf('id="v-domov"'), html.indexOf('id="v-recepty"'));
  assert.ok(domov.includes('id="dash-stravnici"'), "Domov nemá panel stravníkov");
  assert.ok(ZDROJ.includes("function renderDashStravnici"), "chýba renderDashStravnici");
  assert.ok(ZDROJ.includes("function otvorStravnici"), "stravníci sa z Domova nedajú upraviť");
  // jeden zdroj pravdy pre riadok stravníka (pretekal na 393 px)
  assert.ok(ZDROJ.includes("function stravniciRiadkyHTML"), "chýba spoločný riadok stravníka");
  assert.ok(/\.strav-row\{[^}]*flex-wrap:wrap/.test(html), "riadok stravníka sa nezalamuje");
});
ok("prázdny týždeň v pláne ponúka, čo s tým", () => {
  const app = novy();
  app.S.plan = {};
  app.renderPlanPrazdny();
  const h = app.document.getElementById("plan-prazdny").innerHTML;
  assert.ok(h.includes("prázdny"), "prázdny stav nič nehovorí");
  assert.ok(h.includes("skopirujMinuly()") && h.includes("otvorNacitat()"), "prázdny stav neponúka východiská");
});

ok("mchip a hranica sú tlačidlá so stavom", () => {
  assert.ok(/<button class="mchip\$\{on\?' on':''\}"[^`]*aria-pressed/.test(ZDROJ), "mchip nie je button s aria-pressed");
  assert.ok(/<button class="hranica/.test(ZDROJ), "hranica blokov nie je button");
  assert.ok(/class="hranica[^\n]{0,220}aria-label=/.test(ZDROJ), "hranica blokov nemá aria-label");
});

ok("Enter/medzerník aktivuje čokoľvek s rolou tlačidla (aj riadky pickerov)", () => {
  // predtým bol zoznam vymenovaný ručne a `.plan-cell[tabindex]` v ňom chýbal:
  // riadky pickerov boli fokusovateľné, ale Enter s nimi neurobil nič
  assert.ok(ZDROJ.includes(`t.matches('[role="button"][tabindex="0"],.side a,.botnav a,.menu a')`),
    "chýba všeobecné pravidlo pre Enter/medzerník");
});

ok("zavretie modálu vracia fokus tam, odkiaľ sa otváral", () => {
  ["function zavri()", "function zavriPick()", "function zavriCook()", "function dlgZavri("].forEach(f => {
    const i = ZDROJ.indexOf(f);
    assert.ok(i > 0, "nenašiel som " + f);
    assert.ok(ZDROJ.slice(i, i + 420).includes("_vratFokus()"), f + " nevracia fokus");
  });
  assert.ok(ZDROJ.includes("_fokusDoModalu"), "fokus sa po otvorení nepresúva do dialógu");
});

ok("zpristupniKliky nepečiatkuje rolu na skutočné <button>", () => {
  const i = ZDROJ.indexOf("function zpristupniKliky(");
  assert.ok(ZDROJ.slice(i, i + 500).includes('el.tagName==="BUTTON"'), "pečiatkovanie by duplikovalo rolu tlačidla");
});

// ─────────────────────────────────────────────────────────── A9 výkon mriežky
nadpis("\nA9 — mriežka sa dopĺňa po dávkach");
ok("prvé vykreslenie dá 60 kariet, nie 1956", () => {
  const app = novy();
  const grid = app.document.getElementById("grid");
  const pred = grid.children.length;                 // fake DOM innerHTML="" deti nemaže, meriame prírastok
  app.__orig.renderGrid();
  const prva = grid.children.length - pred;
  assert.strictEqual(prva, 60, "prvá dávka má 60 kariet, dostal som " + prva);
  assert.ok(app.RECEPTY.length > 1000, "kontrola dáva zmysel len na plnej zásobe");
});
ok("„Načítať ďalšie“ pridá ďalšiu dávku a na konci zoznamu skončí", () => {
  const app = novy();
  const grid = app.document.getElementById("grid");
  app.__orig.renderGrid();
  const po1 = grid.children.length;
  app.gridViac();
  assert.strictEqual(grid.children.length - po1, 60, "druhá dávka nemá 60 kariet");
  // dojazd na koniec krátkeho zoznamu
  const app2 = novy();
  app2.RECEPTY.length = 0;
  for (let i = 0; i < 70; i++) vloz(app2, recept("g" + i, 400));
  const g2 = app2.document.getElementById("grid");
  const p2 = g2.children.length;
  app2.__orig.renderGrid();
  assert.strictEqual(g2.children.length - p2, 60, "prvá dávka zo 70 receptov");
  app2.gridViac();
  assert.strictEqual(g2.children.length - p2, 70, "druhá dávka mala dobrať zvyšných 10");
  app2.gridViac();
  assert.strictEqual(g2.children.length - p2, 70, "za koncom zoznamu sa už nesmie nič pridať");
});
ok("filtre, hľadanie a počítadlá pracujú nad CELÝM zoznamom, nie nad vykreslenou dávkou", () => {
  const app = novy();
  const D = app.document;
  app.__orig.renderGrid();
  assert.strictEqual(String(D.getElementById("pocet").textContent), String(app.RECEPTY.length), "#pocet bez filtra = celá zásoba");
  assert.strictEqual(D.getElementById("f-cnt").hidden, true, "#f-cnt má byť skrytý bez filtrov");
  D.getElementById("hladaj").value = "kuracie";
  const grid = D.getElementById("grid");
  const pred = grid.children.length;
  app.__orig.renderGrid();
  const p = String(D.getElementById("pocet").textContent);
  assert.ok(/^\d+ \/ \d+$/.test(p), "#pocet pri filtri má tvar „X / Y“, dostal som " + p);
  const najdene = parseInt(p);
  assert.ok(najdene > 60, "test má zmysel len keď je výsledkov viac než jedna dávka (" + najdene + ")");
  assert.strictEqual(grid.children.length - pred, 60, "vykreslená je dávka, ale #pocet hlási celý výsledok");
  D.getElementById("f-diet").value = "veg";
  app.__orig.renderGrid();
  assert.strictEqual(String(D.getElementById("f-cnt").textContent), "1", "#f-cnt má počítať 1 aktívny filter");
  assert.strictEqual(D.getElementById("f-cnt").hidden, false, "#f-cnt sa má zobraziť");
});

spusti().catch(e => { console.error(String(e.message || e)); process.exit(1); });
