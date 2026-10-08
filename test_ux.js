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
// B3: kopíruje sa predchádzajúci KALENDÁRNY týždeň zo S.plan, nie posledný uložený z archívu,
// a cieľ kcal sa nemení (archív ho prepisoval a rozišiel sa s prvým stravníkom)
ok("kopíruje sa predchádzajúci kalendárny týždeň (podľa dátumov), nie archív, a cieľ kcal sa nemení", () => {
  const app = novy();
  const S = app.S;
  vloz(app, recept("minuly", 500)); vloz(app, recept("archivny", 500));
  S.archiv = [{ id: "a1", nazov: "archív", ciel_kcal: 2000, plan: { 0: { Obed: ["archivny"] } }, planF: {} }];
  S.plan[app.pridajDni(PONDELOK, -7)] = { Obed: ["minuly"] };       // pondelok minulého týždňa
  S.plan[app.pridajDni(PONDELOK, -5)] = { Večera: ["minuly"] };     // streda minulého týždňa
  return app.skopirujMinuly().then(() => {
    assert.deepStrictEqual(Array.from(app.slotIds(0, "Obed")), ["minuly"], "pondelok: " + app.slotIds(0, "Obed"));
    assert.deepStrictEqual(Array.from(app.slotIds(2, "Večera")), ["minuly"], "streda: " + app.slotIds(2, "Večera"));
    assert.strictEqual(S.profil.kcal, 1450, "cieľ kcal sa zmenil na " + S.profil.kcal);
    assert.ok(S.plan[app.pridajDni(PONDELOK, -7)], "minulý týždeň zmizol");
  });
});
ok("prázdny minulý týždeň nič neprepíše", () => {
  const app = novy();
  vloz(app, recept("tento", 500));
  app.S.plan[app.datumPre(0)] = { Obed: ["tento"] };
  return app.skopirujMinuly().then(() => {
    assert.deepStrictEqual(Array.from(app.slotIds(0, "Obed")), ["tento"], "plán sa zmenil: " + app.slotIds(0, "Obed"));
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
ok("v31: „🚫 Už nezobrazovať“ z plánu skryje recept všade a v celom bloku ho vymení", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  const bl = app.blokDni(2), stary = app.slotIds(2, "Obed")[0];
  app.akcieSlotu(2, "Obed");
  assert.ok(app.document.getElementById("pick-modal").innerHTML.includes("nezobrazovatVSlote(2,'Obed')"), "v „⋯ viac“ chýba „Už nezobrazovať“");
  app.nezobrazovatVSlote(2, "Obed");
  assert.ok(app.S.skryte[stary], "recept sa neskryl");
  assert.ok(!app.prejdeProfil(app.receptById(stary)), "skrytý recept stále prechádza do Receptov/návrhov");
  bl.forEach(d => { const id = app.slotIds(d, "Obed")[0]; assert.ok(id && id !== stary, "v dni " + d + " ostal skrytý recept: " + id); });
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

ok("hľadanie viac surovín naraz je AND, nie OR", () => {
  const app = novy();
  const r = vloz(app, misa("v1b", "Letná misa"));
  assert.ok(app.hladaSedi(r, "cicer paradajka"), "obe suroviny v recepte sú");
  assert.ok(app.hladaSedi(r, "cicer, paradajka"), "oddeľovač čiarkou");
  assert.ok(!app.hladaSedi(r, "cicer losos"), "druhá surovina chýba — AND musí zamietnuť");
  assert.ok(app.hladaSedi(r, "letna misa"), "viacslovný názov ostáva nájditeľný");
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

// ─────────────────────────────────────────────────────────── V2 lepšie hľadanie (v33, Balík 6)
nadpis("\nV2 — hľadanie: tvar slova, synonymá, vylúčenie, relevancia, výrobky");
// karty, ktoré pribudli v mriežke po poslednom renderGrid (fake DOM innerHTML="" deti nemaže)
const novyGrid = app => { const g = app.document.getElementById("grid"), od = g.children.length;
  return () => { const mapa = new Map(app.RECEPTY.map(r => [app.escHtml(r.nazov), r]));
    return g.children.slice(od).map(c => mapa.get((c.innerHTML.match(/<h3>(.*?)<\/h3>/) || [])[1])); }; };
const hladaj = (app, q) => app.RECEPTY.filter(r => app.prejdeProfil(r) && app.hladaSedi(r, app.bezDia(q)));
const textReceptu = r => r.nazov + " " + (r.ingrediencie || []).map(i => i.nazov).join(" ") + " " + (r.tagy || []).join(" ");

ok("„mäso“ nechytí maslo, „zeler“ zeleninu; „kinoa“ nájde quinoa a „vajíčka“ vajcia", () => {
  const app = novy();
  const maslo = vloz(app, Object.assign(misa("v33-maslo", "Maslové sušienky"), { ingrediencie: [{ nazov: "Maslo", mnozstvo: 100, jednotka: "g" }] }));
  const zel = vloz(app, Object.assign(misa("v33-zel", "Letná miska"), { ingrediencie: [{ nazov: "Zelenina mrazená", mnozstvo: 100, jednotka: "g" }] }));
  assert.ok(!app.hladaSedi(maslo, "maso"), "„mäso“ našlo recept len s maslom");
  assert.ok(!app.hladaSedi(zel, "zeler"), "„zeler“ našiel recept len so zeleninou");
  const kinoa = hladaj(app, "kinoa").length, quinoa = hladaj(app, "quinoa").length;
  assert.ok(kinoa > 0 && kinoa === quinoa, `kinoa ${kinoa} vs quinoa ${quinoa}`);
  assert.strictEqual(hladaj(app, "vajíčka").length, hladaj(app, "vajcia").length, "vajíčka ≠ vajcia");
});
ok("písanie po písmenkách: „bro“ už nájde brokolicu, celé „med“ ostáva prísne", () => {
  const app = novy();
  const medved = vloz(app, Object.assign(misa("v33-medved", "Jarná nátierka"), { ingrediencie: [{ nazov: "Medvedí cesnak", mnozstvo: 50, jednotka: "g" }] }));
  assert.ok(hladaj(app, "bro").some(r => /brokolic/i.test(r.nazov)), "„bro“ nenašlo brokolicu");
  assert.ok(hladaj(app, "br").length > 100, "„br“ nič nenašlo");
  assert.ok(!app.hladaSedi(medved, "med"), "„med“ našlo medvedí cesnak");
});
ok("„kura bez ryže“ a „kura -ryza“ vylúčia ryžu; „bez mäsa“ = len 🌱 veg", () => {
  const app = novy();
  const s = hladaj(app, "kura ryža"), bez = hladaj(app, "kura bez ryže"), minus = hladaj(app, "kura -ryza"), kura = hladaj(app, "kura");
  assert.ok(s.length > 5 && bez.length > 20, `s ryžou ${s.length}, bez ryže ${bez.length}`);
  assert.ok(bez.length < kura.length, "vylúčenie nič neubralo");
  const zle = bez.filter(r => app.obsahujeSurovinu(textReceptu(r), ["ryza"]));
  assert.strictEqual(zle.length, 0, "„kura bez ryže“ vrátilo ryžu: " + zle.slice(0, 3).map(r => r.nazov).join(", "));
  assert.deepStrictEqual(minus.map(r => r.id), bez.map(r => r.id), "„-ryza“ a „bez ryže“ sa líšia");
  const bm = hladaj(app, "bez mäsa");
  assert.ok(bm.length > 300 && bm.every(r => app.diety(r).veg), "„bez mäsa“ vrátilo nevegetariánsky recept");
});
ok("relevancia: zhoda v názve ide pred zhodu v surovine a karta povie, čo sedí", () => {
  const app = novy();
  app.document.getElementById("hladaj").value = "kura";
  const karty = novyGrid(app); app.__orig.renderGrid();
  const k = karty();
  assert.ok(k.length === 60 && k.every(r => r && app.obsahujeSurovinu(r.nazov, ["kura"])),
    "v prvej dávke „kura“ je recept bez kura v názve: " + k.filter(r => !r || !app.obsahujeSurovinu(r.nazov, ["kura"])).slice(0, 3).map(r => r && r.nazov));
  app.document.getElementById("hladaj").value = "kura ryža";
  const k2 = novyGrid(app); app.__orig.renderGrid();
  const prvy = k2()[0];
  assert.ok(app.obsahujeSurovinu(prvy.nazov, ["kura"]) && app.obsahujeSurovinu(prvy.nazov, ["ryza"]), "1. výsledok „kura ryža“: " + prvy.nazov);
  const r = vloz(app, misa("v33-sedi", "Letná misa"));
  assert.ok(app.kartaHTML(r, "cicer").includes("🥕 sedí: Cícer"), "karta neukázala surovinu, ktorá sedí");
  assert.ok(!app.kartaHTML(r, "letna").includes("sedí:"), "zhoda v názve nemá ukazovať surovinu");
});
ok("hľadanie vidí kuchyňu, kategóriu a zdroj (talianska, BBC, wikibooks)", () => {
  const app = novy();
  const tal = app.RECEPTY.filter(r => r.kuchyna === "Talianska" && app.prejdeProfil(r)).length;
  assert.ok(hladaj(app, "talianska").length >= tal, "„talianska“ nájde menej než filter kuchyne " + tal);
  const bbc = app.RECEPTY.filter(r => app.zdrojRodina(r) === "BBC Good Food").length;
  assert.ok(bbc > 0 && hladaj(app, "BBC").length >= bbc, "„BBC“ " + hladaj(app, "BBC").length + " z " + bbc);
  assert.ok(hladaj(app, "wikibooks").length > 50, "„wikibooks“ nič nenašlo");
});
ok("zakázané „zeler“ neblokuje zeleninu, „mäso“ maslo — pravé zhody ostávajú", () => {
  const app = novy();
  const skus = (zak, ing) => { app.S.profil.zakazane = zak;
    return app.zakazaneChyta({ nazov: "test", kategoria: "Šalát", porcie: 1, postup: [], tagy: [], ingrediencie: [{ nazov: ing, mnozstvo: 1, jednotka: "g" }] }); };
  assert.ok(!skus("zeler", "Zelenina mrazená") && skus("zeler", "Zelerová vňať") && skus("zeler", "Celer bulvový"), "zeler");
  assert.ok(!skus("mäso", "Maslo") && skus("mäso", "Mleté mäso") && skus("mäso", "Kuracie prsia"), "mäso (aj bez slova „mäso“)");
  assert.ok(!skus("kura", "Kurkuma") && skus("kura", "Kurča celé"), "kura");
  // na reálnych dátach: zeler neblokuje nič bez zeleru/celeru (do v33 443 receptov, z toho 344 len cez zeleninu)
  app.S.profil.zakazane = "zeler";
  // od 8. 10. platí aj alergén zeler (vývar, Vegeta, bujón) — to je pre alergika správne, chybou je len zelenina
  const zle = app.RECEPTY.filter(r => app.zakazaneChyta(r) && !/zeler|celer/.test(app.bezDia(textReceptu(r))) && !app.alergenyReceptu(r).includes("zeler"));
  app.S.profil.zakazane = "";
  assert.strictEqual(zle.length, 0, "zeler zablokoval: " + zle.slice(0, 3).map(r => r.nazov).join(", "));
});
ok("kúpené výrobky: v kolekcii preč, prepínač ich vráti, chip „Snack“ ich ukáže vždy", () => {
  const app = novy(), D = app.document, vm = require("vm");
  const pocet = () => parseInt(String(D.getElementById("pocet").textContent));
  app.nastavKolekciu("rychle");
  let karty = novyGrid(app); app.__orig.renderGrid();
  const bez = pocet();
  assert.ok(!karty().some(r => app.jeVyrobok(r)), "v „Do 20 min“ je kúpený výrobok");
  const vp = D.getElementById("vyrobky-prep");
  const m = vp.innerHTML.match(/aj kúpené výrobky \(\+(\d+)\)/);
  assert.ok(!vp.hidden && m && +m[1] > 50, "prepínač výrobkov chýba alebo nehlási počet: " + vp.innerHTML);
  app.prepniVyrobky(); app.__orig.renderGrid();
  assert.strictEqual(pocet(), bez + (+m[1]), "prepínač nevrátil všetky výrobky");
  app.prepniVyrobky(); app.nastavKolekciu("rychle");                       // späť: bez kolekcie
  vm.runInContext('aktivnaKat="Snack"', app);
  D.getElementById("f-sort").value = "cas";
  karty = novyGrid(app); app.__orig.renderGrid();
  assert.ok(karty().some(r => app.jeVyrobok(r)), "chip „Snack“ s radením skryl výrobky");
});
ok("„Najmenej kcal“ dá recept bez kcal na koniec, nie na začiatok", () => {
  const app = novy(); const D = app.document;
  vloz(app, Object.assign(recept("v33-bezkcal", 0), { nazov: "Bez kalórií", ingrediencie: [] }));
  D.getElementById("f-sort").value = "kcal";
  const karty = novyGrid(app); app.__orig.renderGrid();
  const k = karty();
  assert.ok(k.length && app.kcalPorcia(k[0]) > 0, "prvý pri „Najmenej kcal“: " + (k[0] && k[0].nazov) + " " + (k[0] && app.kcalPorcia(k[0])));
});
ok("„Zrušiť filtre“ vráti aj radenie, takže #f-cnt zhasne", () => {
  const app = novy(); const D = app.document;
  D.getElementById("f-sort").value = "cas"; app.__orig.renderGrid();
  assert.strictEqual(String(D.getElementById("f-cnt").textContent), "1");
  app.zrusFiltre(); app.__orig.renderGrid();
  assert.strictEqual(D.getElementById("f-sort").value, "", "radenie ostalo");
  assert.strictEqual(D.getElementById("f-cnt").hidden, true, "#f-cnt svieti aj po „Zrušiť filtre“");
});
ok("prázdny výsledok: rada, skutočný <button> a priznanie vypnutých zdrojov", () => {
  const app = novy({ zdrojeOff: "BBC Good Food" }); const D = app.document;
  // názov BBC receptu, ktorý mimo BBC nič nenájde → mriežka je prázdna, zhoda je vo vypnutom zdroji
  const r = app.RECEPTY.find(r => app.zdrojRodina(r) === "BBC Good Food" && !hladaj(app, r.nazov).length);
  assert.ok(r, "nenašiel som BBC recept s jedinečným názvom");
  D.getElementById("hladaj").value = r.nazov; app.__orig.renderGrid();
  const em = D.getElementById("empty").innerHTML;
  assert.ok(/<button class="btn" onclick="zrusFiltre\(\)">Zrušiť filtre<\/button>/.test(em), "„Zrušiť filtre“ nie je <button>: " + em);
  assert.ok(!/<a onclick/.test(em), "prázdny stav má stále <a> bez href");
  assert.ok(/\d+ recept(y|ov)? (je|sú) vo vypnutých zdrojoch/.test(em), "nepriznal vypnutý zdroj: " + em);
  assert.ok(/menej slov/.test(em), "chýba rada");
});
ok("picker „Aké jedlo?“ za 30 riadkami ponúkne „Zobraziť všetky (N)“", () => {
  const app = novy();
  app.pickSearchInput("kura");
  const box = app.document.getElementById("pick-search-results");
  const n = (box.innerHTML.match(/class="plan-cell"/g) || []).length, m = box.innerHTML.match(/Zobraziť všetky \((\d+)\)/);
  assert.ok(n === 30 && m && +m[1] > 100, `riadkov ${n}, tlačidlo ${m && m[0]}`);
  app.pickSearchInput("kura", true);
  assert.strictEqual((box.innerHTML.match(/class="plan-cell"/g) || []).length, +m[1], "„Zobraziť všetky“ neukázalo všetky");
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
  // renderPlan je v harnesse stubnutý (testy nekreslia), preto kontrolujeme zdroj.
  // v29: markup bunky sa presťahoval do `planBunka()`, aby ho vedela použiť tabuľka
  // týždňa aj blokový zoznam na telefóne — rez teda začína tam, nie pri renderPlan.
  const usek = ZDROJ.slice(ZDROJ.indexOf("function planBunka("), ZDROJ.indexOf("let dragSrc="));
  assert.ok(usek.length > 500, "nenašiel som telo planBunka/renderPlan");
  assert.ok(!/<span class="rm"[^>]*onclick/.test(usek), "„✎ zmeniť“/„⋯ viac“ sú stále span onclick");
  assert.ok(!/<span class="kc"[^>]*onclick/.test(usek), "riadok kcal je stále span onclick");
  assert.ok(!/<span class="nm"[^>]*onclick/.test(usek), "názov jedla je stále span onclick");
  assert.ok(!/<div class="plan-cell prazdne"[^>]*onclick/.test(usek), "prázdna bunka je stále div onclick");
  ["pc-btn", "pc-empty", "pc-znova"].forEach(c => assert.ok(usek.includes(c), "v bunke chýba trieda " + c));
  // B3: ✕ (24 px, 2–4 px od 🎲, mazal celý blok bez návratu) je v „⋯ viac“, nie v bunke
  assert.ok(!usek.includes("odoberKomponent(") && !usek.includes("pc-x"), "✕ odobrať je stále priamo v bunke plánu");
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
  ["function zavri()", "function zavriPick()", "function zavriCook(", "function dlgZavri("].forEach(f => {
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

// ── P3: rozbaľovanie vložených dát (raw DEFLATE) ─────────────────────────────
// Build vkladá recepty skomprimované; keby `_zlInflate` v app.js vrátil čo i len jeden
// zlý bajt, appka sa v prehliadači nespustí vôbec. Preto ho tu ženieme proti zlib.
ok("_zlInflate rozbalí presne to, čo zlib zabalil (fixné, dynamické aj uložené bloky)", () => {
  const zlib = require("zlib");
  const app = novy();
  assert.strictEqual(typeof app._zlInflate, "function", "app.js musí mať _zlInflate");
  const vzorky = [
    Buffer.alloc(0),
    Buffer.from("á"),
    Buffer.from("Kuracie prsia v slaninovom kabáte".repeat(400), "utf8"),
    Buffer.alloc(70000, 0x41),
    require("crypto").randomBytes(50000),                       // nestlačiteľné → uložené bloky
    Buffer.from(JSON.stringify(app.RECEPTY.slice(0, 200)), "utf8"),
  ];
  const Z = zlib.constants;
  for (const v of vzorky) {
    for (const [uroven, strategia] of [[0, Z.Z_DEFAULT_STRATEGY], [1, Z.Z_DEFAULT_STRATEGY],
                                       [9, Z.Z_DEFAULT_STRATEGY], [9, Z.Z_FIXED], [9, Z.Z_RLE]]) {
      const zbalene = zlib.deflateRawSync(v, { level: uroven, strategy: strategia });
      const von = Buffer.from(app._zlInflate(new Uint8Array(zbalene)));
      assert.ok(Buffer.compare(von, v) === 0,
        `rozbalenie sa rozišlo (${v.length} B, úroveň ${uroven}, stratégia ${strategia})`);
    }
  }
});
ok("_rozbal prepustí hotové dáta a rozbalí base64 reťazec", () => {
  const zlib = require("zlib");
  const app = novy();
  const pole = [{ id: "x", nazov: "Šalát ľadový" }];
  assert.strictEqual(app._rozbal(pole), pole, "hotové pole musí prejsť bez zmeny (harness, --data=json)");
  const raw = Buffer.from(JSON.stringify(pole), "utf8");
  const b64 = zlib.deflateRawSync(raw, { level: 9 }).toString("base64");
  // v prehliadači to robí atob + TextDecoder; tu ich doplníme, lebo vo fake DOM nie sú
  app.atob = (t) => Buffer.from(t, "base64").toString("binary");
  app.TextDecoder = class { decode(u) { return Buffer.from(u).toString("utf8"); } };
  // porovnávame cez JSON: objekt z `vm` má prototyp z iného realmu, deepStrictEqual by ho odmietol
  assert.strictEqual(JSON.stringify(app._rozbal(b64)), JSON.stringify(pole),
    "base64 DEFLATE sa musí rozbaliť na pôvodné dáta");
});

// ─────────────────────────────────────────────────────────── v32 „Čo uvarím z toho, čo mám"
nadpis("v32 — „🍳 Čo uvarím z toho, čo mám“");
const receptDoma = (id) => ({ id, nazov: id, kategoria: "Hlavné jedlo", kuchyna: "", porcie: 2, kcal_na_porciu: 400,
  postup: [], tagy: [], ingrediencie: [
    { nazov: "Vajcia", mnozstvo: 4, jednotka: "ks" }, { nazov: "Syr", mnozstvo: 100, jednotka: "g" },
    { nazov: "Soľ", mnozstvo: null, jednotka: "" }, { nazov: "Čierne korenie", mnozstvo: 1, jednotka: "g" },
    { nazov: "Olivový olej", mnozstvo: 2, jednotka: "PL" }] });
ok("skloňovanie („vajce“ = Vajcia) a soľ/korenie/olej sa nerátajú ako chýbajúce", () => {
  const app = novy();
  const s = app.skoreReceptu(receptDoma("doma-1"), ["vajce", "syr"]);
  assert.deepStrictEqual([s.mame, s.spolu, s.chyba.length], [2, 2, 0], JSON.stringify(s));
});
ok("na čele je recept, ktorý uvaríš hneď; žiadny kúpený výrobok ani nápoj", () => {
  const app = novy();
  const z = app.coUvarim(["zemiaky", "vajce", "mlieko", "muka", "maslo"]);
  assert.ok(z.length && z[0].chyba.length === 0, "prvý výsledok musí mať 0 chýbajúcich");
  const zle = z.filter(x => app.jeVyrobok(x.r) || x.r.kategoria === "Nápoj" || x.r.kategoria === "Kokteil");
  assert.strictEqual(zle.length, 0, "vo výsledkoch: " + zle.slice(0, 3).map(x => x.r.nazov).join(", "));
});
ok("radenie: menej chýbajúcich vyššie, pri zhode viac využitých surovín", () => {
  const z = novy().coUvarim(["vajcia", "syr", "paprika", "cestoviny", "cibula"]);
  for (let i = 1; i < z.length; i++) {
    const a = z[i - 1], b = z[i];
    assert.ok(a.chyba.length < b.chyba.length || (a.chyba.length === b.chyba.length && a.mame >= b.mame),
      `poradie ${i}: ${a.r.nazov} (${a.mame}/${a.chyba.length}) pred ${b.r.nazov} (${b.mame}/${b.chyba.length})`);
  }
});
ok("„+ do nákupu“ pridá len to, čo naozaj chýba (bez soli a korenia)", () => {
  const app = novy();
  vloz(app, receptDoma("doma-2"));
  app.S.domaNakup = "vajce"; app.S.nakupManual = []; // v34: jeden zoznam „mám doma"
  app.pridajChybajuceDoNakupu("doma-2");
  assert.deepStrictEqual(app.S.nakupManual.map(m => m.nazov), ["Syr"]);
});

// ─────────────────────────────────────────────────────────── audit 30. 9. — Balík 1
nadpis("\nAudit 30. 9. — synchronizácia, vlastný recept, uložené jedálničky, diéta");
ok("bez Sync ID a prihlásenia nesvieti „Synchronizované“; offline bez zmien nesľubuje nahratie", () => {
  const app = novy();
  app.SYNC_CONFIG = { url: "https://x.supabase.co", key: "k" };   // Supabase je, Sync ID nie
  const el = app.document.getElementById("sync-stav");
  app.__orig.renderSyncStav();
  assert.ok(/nie je nastavená/.test(el.innerHTML) && !/Synchronizované/.test(el.innerHTML), el.innerHTML);
  app.S.profil.syncId = "domacnost"; app.navigator.onLine = false; app.S._dirty = false;
  app.__orig.renderSyncStav();
  assert.ok(/Offline/.test(el.innerHTML) && !/nahrajú/.test(el.innerHTML), el.innerHTML);
  app.S._dirty = true; app.__orig.renderSyncStav();
  assert.ok(/nahrajú po pripojení/.test(el.innerHTML), el.innerHTML);
});
// formulár „+ Nový recept“ vo fake DOM: polia podľa id, riadky surovín cez querySelectorAll
function formular(app, polia, riadky) {
  const vsetky = Object.assign({ "nr-kat": "Hlavné jedlo", "nr-porcie": "2", "nr-kuch": "", "nr-cas": "", "nr-postup": "Uvar.", "nr-tip": "" }, polia);
  Object.keys(vsetky).forEach(id => { app.document.getElementById(id).value = vsetky[id]; });
  const rows = riadky.map(([n, mn, jed]) => ({ querySelector: c => ({ value: { ".nr-in": n, ".nr-mn": mn, ".nr-jed": jed, ".nr-vs": "" }[c] }) }));
  app.document.querySelectorAll = s => (s === "#nr-ing .controls" ? rows : []);
}
ok("vlastný recept sa ukladá surový („Soľ & korenie“) a detail ho escapuje raz", () => {
  const app = novy(); app.toast = () => {};
  formular(app, { "nr-nazov": "Test" }, [["Soľ & korenie", "5", "g"]]);
  app.ulozNovyRecept();
  const r = app.S.mojeRecepty[app.S.mojeRecepty.length - 1];
  assert.strictEqual(r.ingrediencie[0].nazov, "Soľ & korenie");
  const ing = app.document.getElementById("ing-body").innerHTML;
  assert.ok(ing.includes("Soľ &amp; korenie") && !ing.includes("&amp;amp;"), ing);
});
ok("migrácia escV 2 → 3 odescapuje len suroviny vlastného receptu (tie escapoval formulár)", () => {
  const app = load({ stav: { escV: 2, mojeRecepty: [{ id: "moj-1", nazov: "Tom &amp; Jerry", postup: ["x"],
    ingrediencie: [{ nazov: "Soľ &amp; korenie", mnozstvo: 5, jednotka: "&lt;g&gt;" }] }] } });
  const r = app.S.mojeRecepty[0];
  assert.deepStrictEqual([r.nazov, r.ingrediencie[0].nazov, r.ingrediencie[0].jednotka, app.S.escV],
    ["Tom &amp; Jerry", "Soľ & korenie", "<g>", 3]);
});
ok("formulár odmietne nulové a záporné porcie aj množstvo (s hláškou)", () => {
  const app = novy(); const toasty = []; app.toast = m => toasty.push(m);
  const pred = app.S.mojeRecepty.length;
  formular(app, { "nr-nazov": "Zlé porcie", "nr-porcie": "-2" }, [["Ryža", "100", "g"]]);
  app.ulozNovyRecept();
  formular(app, { "nr-nazov": "Zlé množstvo" }, [["Ryža", "0", "g"]]);
  app.ulozNovyRecept();
  assert.strictEqual(app.S.mojeRecepty.length, pred, "uložil sa recept so zlým číslom");
  assert.ok(/porcií/.test(toasty[0]) && /Ryža/.test(toasty[1]), toasty.join(" | "));
});
ok("vlastný recept sa dá upraviť na mieste — id, obľúbené, hodnotenie aj poznámka ostanú", () => {
  const app = novy(); app.toast = () => {};
  formular(app, { "nr-nazov": "Pôvodný" }, [["Ryža", "100", "g"]]);
  app.ulozNovyRecept();
  const id = app.S.mojeRecepty[app.S.mojeRecepty.length - 1].id, n = app.RECEPTY.length;
  assert.ok(app.document.getElementById("modal").innerHTML.includes("novyRecept('" + id + "')"), "v menu detailu chýba ✏️ Upraviť");
  app.S.fav[id] = 1; app.S.hodn[id] = 5; app.S.pozn[id] = "dobré";
  app.hladaSedi(app.receptById(id), "povodny");                    // naplní cache hľadania starým názvom
  app.novyRecept(id);
  const form = app.document.getElementById("pick-modal").innerHTML;
  assert.ok(/Upraviť recept/.test(form) && form.includes('value="Pôvodný"') && form.includes("ulozNovyRecept('" + id + "')"), "formulár nie je predvyplnený");
  formular(app, { "nr-nazov": "Upravený", "nr-porcie": "4" }, [["Ryža", "200", "g"], ["Cesnak", "2", "strúčik"]]);
  app.ulozNovyRecept(id);
  const r = app.receptById(id);
  assert.strictEqual(app.RECEPTY.length, n, "úprava pridala nový recept");
  assert.deepStrictEqual([r.nazov, r.porcie, r.ingrediencie.length, app.S.fav[id], app.S.hodn[id], app.S.pozn[id]], ["Upravený", 4, 2, 1, 5, "dobré"]);
  assert.ok(app.hladaSedi(r, "upraveny") && !app.hladaSedi(r, "povodny"), "hľadanie pozná starý názov");
});
ok("„Dojedz zvyšky“ nenavrhne kúpený výrobok", () => {
  const app = novy();
  const ing = ["Vajcia", "Paprika", "Syr", "Mlieko", "Šunka", "Cibuľa", "Paradajky", "Kuracie prsia"].map(n => ({ nazov: n, mnozstvo: 100, jednotka: "g" }));
  vloz(app, { id: "zv-plan", nazov: "Plán", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: ing, postup: [], tagy: [] });
  vloz(app, { id: "zv-vyrobok", nazov: "Výrobok", kategoria: "Snack", typ: "vyrobok", porcie: 1, ingrediencie: ing, postup: [], tagy: [] });
  app.S.plan[app.datumPre(0)] = { Obed: ["zv-plan"] };
  app.dojedzZvysky();
  const html = app.document.getElementById("zvysky-out").innerHTML;
  assert.ok(/otvor\('/.test(html), "test nemá čo porovnať: " + html.slice(0, 120));
  assert.ok(!html.includes("zv-vyrobok"), "navrhol kúpený výrobok");
});
ok("načítaný jedálniček vymení jedlá, ktoré nesedia s diétou, a šablónu nezmení", () => {
  const app = novy({ lepok: true }); const toasty = []; app.toast = m => toasty.push(m);
  const zlych = plan => Object.values(plan || {}).reduce((a, den) => a + Object.values(den).filter(v => {
    const id = Array.isArray(v) ? v[0] : v; const r = app.receptById(id);
    return typeof id === "string" && !/^(prf|left):/.test(id) && !(r && app.prejdeProfil(r)); }).length, 0);
  const j = app.JEDALNICKY.slice().sort((a, b) => zlych(b.plan) - zlych(a.plan))[0];
  const predJson = JSON.stringify(j.plan), pred = zlych(j.plan);
  assert.ok(pred > 0, "žiadny pribalený jedálniček neporušuje „bez lepku“ — test nemá čo overiť");
  app.nacitajSablonuDoTyzdna(j.plan, j.planF || {});
  const tyzden = {}; for (let di = 0; di < 7; di++) tyzden[di] = app.S.plan[app.datumPre(di)] || {};
  assert.strictEqual(zlych(tyzden), 0, "po načítaní ostali jedlá s lepkom");
  assert.ok(toasty.some(t => /Vymenil som/.test(t)), "chýba toast: " + toasty.join(" | "));
  assert.strictEqual(JSON.stringify(j.plan), predJson, "výmena prepísala pribalený jedálniček");
});
ok("doplnok snacku rešpektuje diétu (bez laktózy, bez rýb)", () => {
  const app = novy({ mlieko: true, ryby: true });
  const snacky = app.RECEPTY.filter(r => app.jeVyrobok(r) && r.kategoria === "Snack" && app.prejdeProfil(r));
  const zle = snacky.map(r => app.snackDoplnok(r)).filter(Boolean).filter(id => !app.prejdeProfil(app.receptById(id)));
  assert.strictEqual(zle.length, 0, "doplnky proti diéte: " + [...new Set(zle)].slice(0, 5).join(", "));
});
ok("„Do plánu“ predvolí dnešok (resp. najbližší deň s prázdnym slotom) a povie, ktorý týždeň", () => {
  const app = novy(); const S = app.S;
  S.viewOd = app.pondelokPre(app.dnesISO());
  const dnes = (new Date(app.dnesISO() + "T00:00:00").getDay() + 6) % 7;
  const id = app.RECEPTY.find(r => r.kategoria === "Hlavné jedlo" && !app.jeVyrobok(r)).id;
  const vybrany = () => (app.document.getElementById("pick-modal").innerHTML.match(/value="(\d)" selected/) || [])[1];
  app.pridajDoPlanu(id);
  assert.strictEqual(vybrany(), String(dnes), "predvolený deň nie je dnešok (audit: vždy Pondelok)");
  assert.ok(app.document.getElementById("pick-modal").innerHTML.includes(app.fmtD(S.viewOd) + "–" + app.fmtD(app.pridajDni(S.viewOd, 6))),
    "dialóg nehovorí, o ktorý týždeň ide");
  if (dnes < 6) {
    S.plan[app.datumPre(dnes)] = { Obed: [id] };
    app.pridajDoPlanu(id);
    assert.strictEqual(vybrany(), String(dnes + 1), "predvolil sa deň, kde už jedlo je");
  }
});

// ─────────────────────────────────────────────────────────── B3 plán a generátor (audit 30. 9.)
nadpis("\nB3 — plán: ↩ Späť, ✕ v „⋯ viac“, 🔒 zámok, bunka, karta bloku");
const tyzdenB3 = app => JSON.stringify([0, 1, 2, 3, 4, 5, 6].map(d => [app.S.plan[app.datumPre(d)] || null, app.S.planF[app.datumPre(d)] || null]));
const toastB3 = app => { const t = { m: "", akc: null }; app.toast = (m, akc) => { t.m = m; t.akc = akc || null; }; return t; };
ok("sklon: 1 jedlo, 2–4 jedlá, 5+ jedál (toast „4 jedál“ v 🎲 bloku)", () => {
  const app = novy();
  assert.deepStrictEqual([0, 1, 2, 4, 5, 11].map(n => app.sklon(n, "jedlo", "jedlá", "jedál")),
    ["0 jedál", "1 jedlo", "2 jedlá", "4 jedlá", "5 jedál", "11 jedál"]);
  assert.ok(!/\+n\+" jedál/.test(ZDROJ), "v app.js je stále „n jedál“ bez skloňovania");
});
ok("„⋯ viac“ pomenuje rozsah bloku a ponúkne 🔒, ✕ prílohu aj ✕ celý slot", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  const hl = app.slotIds(2, "Obed")[0];
  [2, 3, 4].forEach(d => { app.S.plan[app.datumPre(d)].Obed = [hl, "prf:ryza"]; });
  app.akcieSlotu(2, "Obed");
  const h = app.document.getElementById("pick-modal").innerHTML;
  assert.ok(h.includes("Obed · blok B (St–Pi)"), "hlavička nehovorí rozsah bloku: " + h.slice(0, 200));
  assert.ok(h.includes("odoberSlot(2,'Obed')") && h.includes("Odobrať z bloku B (St–Pi)"), "chýba ✕ Odobrať z bloku s rozsahom");
  assert.ok(h.includes("odoberKomponent(2,'Obed','prf:ryza')") && h.includes("Odobrať prílohu"), "príloha sa nedá odobrať");
  assert.ok(h.includes("prepniZamok(2,'Obed')") && h.includes("Zamknúť"), "chýba 🔒 Zamknúť");
});
ok("↩ Späť vráti 🎲 jedla/bloku, ✕, ✎ zmeniť, už nezobrazovať (aj skrytie), vyprázdniť a generovať", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  const t = toastB3(app);
  const spat = (popis, p0) => { assert.ok(t.akc && /Späť/.test(t.akc.text), popis + ": toast nemá „↩ Späť“ (" + t.m + ")");
    assert.notStrictEqual(tyzdenB3(app), p0, popis + ": plán sa nezmenil"); t.akc.fn();
    assert.strictEqual(tyzdenB3(app), p0, popis + ": „↩ Späť“ nevrátil plán"); };
  let p0 = tyzdenB3(app); app.regenerujSlot(2, "Obed"); spat("🎲 jedla", p0);
  p0 = tyzdenB3(app); app.regenerujBlok(1);
  assert.ok(/je prehodený — (1 jedlo|[234] jedlá|([05-9]|\d\d+) jedál)\.$/.test(t.m), "toast 🎲 bloku: " + t.m);
  spat("🎲 bloku", p0);
  p0 = tyzdenB3(app); app.odoberSlot(2, "Obed");
  assert.ok([2, 3, 4].every(d => !app.slotIds(d, "Obed").length), "✕ neodobral jedlo z celého bloku"); spat("✕ odobrať", p0);
  p0 = tyzdenB3(app); app.vyberDoPlanu(2, "Obed");
  app.nastavPlan(app.RECEPTY.find(r => r.kategoria === "Hlavné jedlo" && r.id !== app.slotIds(2, "Obed")[0]).id); spat("✎ zmeniť", p0);
  const id = app.slotIds(2, "Obed")[0];
  p0 = tyzdenB3(app); app.nezobrazovatVSlote(2, "Obed"); assert.ok(app.S.skryte[id], "recept sa neskryl");
  spat("už nezobrazovať", p0); assert.ok(!app.S.skryte[id], "„↩ Späť“ nevrátil skrytie receptu");
  p0 = tyzdenB3(app); await app.vymazPlan(); spat("vyprázdniť", p0);
  p0 = tyzdenB3(app); await app.generujJedalnicek(true);
  assert.ok(/Týždeň je zostavený — \d+ jed(lo|lá|ál)\./.test(t.m), "po generovaní chýba toast s počtom jedál: " + t.m);
  spat("generovať", p0);
});
ok("bunka: kcal a B v jednom riadku, ručné porcie viditeľné, 🔒 namiesto 🎲; zámok platí pre celý blok", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  app.S.slotPpl[app.datumPre(2)] = { Obed: 3 };
  let h = app.planBunka(2, "Obed");
  assert.ok(/<span class="pc-riadok"><span class="kc">[^<]*<\/span><span class="pc-data">\d+ g bielk\. · 👥 3 porcie<\/span><button class="rm pc-btn pc-viac"[^>]*>⋯ viac<\/button><\/span>/.test(h),
    "kcal, bielkoviny a porcie nie sú v jednom riadku: " + h);
  assert.ok(h.includes("pc-znova") && !h.includes("pc-zamok"), "nezamknuté jedlo nemá 🎲");
  app.prepniZamok(2, "Obed");
  assert.ok([2, 3, 4].every(d => app.jeZamknute(d, "Obed")), "zámok neplatí pre celý blok St–Pi");
  h = app.planBunka(3, "Obed");
  assert.ok(h.includes("pc-zamok") && !h.includes("pc-znova"), "zamknuté jedlo má stále 🎲 alebo nemá 🔒");
  app.akcieSlotu(2, "Obed");
  assert.ok(app.document.getElementById("pick-modal").innerHTML.includes("Odomknúť"), "v „⋯ viac“ chýba 🔓 Odomknúť");
  // zámok drží ID jedla: iné jedlo v slote (ručná zmena) už zamknuté nie je
  app.vyberDoPlanu(2, "Obed");
  app.nastavPlan(app.RECEPTY.find(r => r.kategoria === "Hlavné jedlo" && r.id !== app.slotIds(2, "Obed")[0]).id);
  assert.ok(!app.jeZamknute(2, "Obed"), "zámok prešiel na ručne vybrané jedlo");
});
ok("🎲 bloku preskočí zamknuté jedlo", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  const ob = app.slotIds(2, "Obed")[0];
  app.prepniZamok(2, "Obed");
  app.regenerujBlok(1);
  assert.ok([2, 3, 4].every(d => app.slotIds(d, "Obed")[0] === ob), "🎲 bloku prehodilo zamknutý obed");
});
ok("„Zachovať“ + plný týždeň to povie (dovtedy ticho nič); Zamiešať týždeň prehodí", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  const t = toastB3(app); app.S.genCfg.zachovat = true;
  const p0 = tyzdenB3(app);
  await app.generujJedalnicek(true);
  assert.ok(/plný/.test(t.m) && /Zachovať/.test(t.m), "generovanie mlčí: " + t.m);
  assert.strictEqual(tyzdenB3(app), p0, "plný týždeň so „Zachovať“ sa zmenil");
  await app.generujTlacidlo(true);
  assert.notStrictEqual(tyzdenB3(app), p0, "🎲 Zamiešať so zapnutým „Zachovať“ nič neurobilo");
});
ok("karta bloku: „varíš v nedeľu večer“; prvý deň „preč“ nie je prázdny blok; variant s inou porciou má vlastné čísla", async () => {
  const SL = ["Raňajky", "Obed", "Večera", "Snack"];
  const app = novy();
  await app.generujJedalnicek(true);
  app.renderPlanBloky(SL, 1450);
  let h = app.document.getElementById("plan-bloky").innerHTML;
  assert.ok(h.includes("varíš v nedeľu večer") && h.includes("varíš v utorok večer"), "chýba „varíš v nedeľu večer“");
  assert.ok(!/varíš (Pondelok|Utorok|Streda|Štvrtok|Piatok|Sobota|Nedeľa)/.test(h), "hlavička bloku má „varíš Nedeľa večer“");
  // iná veľkosť porcie v jeden deň bloku = iný variant, nie čísla prvého dňa za celý blok
  app.S.planF[app.datumPre(3)] = { Raňajky: 1.15, Obed: 1.15, Večera: 1.15, Snack: 1.15 };
  app.renderPlanBloky(SL, 1450);
  h = app.document.getElementById("plan-bloky").innerHTML;
  assert.ok((h.match(/bk-vynimka/g) || []).length >= 2 && /väčšia porcia/.test(h), "variant s inou porciou sa neukázal");
  const b = novy();
  b.S.tyzdenProfil = { [PONDELOK]: { ludia: null, prec: [0] } };
  await b.generujJedalnicek(true);
  b.renderPlanBloky(SL, 1450);
  h = b.document.getElementById("plan-bloky").innerHTML;
  assert.ok(!h.includes("prázdny blok") && !h.includes("bk-vynimka"), "blok s „preč“ v prvý deň: prázdny blok / výnimky");
  assert.ok(h.includes("varíš v pondelok večer"), "s „preč“ v pondelok sa varí v pondelok večer na utorok");
});
ok("sprievodca: bez „Kupované snacky“ a „Zámer“, ✨ Generovať v lepivej pätičke, dni sa zalamujú, skrolovanie ostane", () => {
  const usek = ZDROJ.slice(ZDROJ.indexOf("function renderGenWizard("), ZDROJ.indexOf("function pridajGenFilter("));
  assert.ok(usek.length > 500, "nenašiel som renderGenWizard");
  assert.ok(!usek.includes("kupSnack") && !usek.includes("Zámer"), "v sprievodcovi je stále voľba bez efektu");
  assert.ok(/class="btn-row akcie-lepiva"><button class="btn primary"[^>]*>✨ Generovať/.test(usek), "✨ Generovať nie je v lepivej pätičke");
  assert.ok(/class="chips" style="flex-wrap:wrap|class="mimo-riadok"/.test(usek), "dni bez varenia sa nezalamujú");
  assert.ok(/scrollTop=y\[0\]/.test(usek), "prekreslenie sprievodcu nevracia pozíciu skrolovania");
});

// ─────────────────────────────────────────────────────────── audit 30. 9. — Balík 4
nadpis("\nAudit 30. 9. — vrstvy okien, hodnotenie, varenie, privítanie");
const vmB4 = require("vm");
// harness nemá skutočný DOM: okno „otvoríme" triedou na fake elemente, menu cez querySelector
function vrstvyApp() { const app = novy(); const doc = app.document; const q = doc.querySelector;
  app._menu = null; doc.querySelector = s => (s === ".menu.open" ? app._menu : q.call(doc, s));
  app.otvorene = id => doc.getElementById(id).classList.contains("open");
  app.otvor_ = (...ids) => ids.forEach(id => doc.getElementById(id).classList.add("open"));
  return app; }
ok("Escape/Späť zatvárajú len najvrchnejšiu vrstvu: dialóg → varenie → detail", async () => {
  const app = vrstvyApp(); app.otvor_("overlay", "cook", "dlg-overlay");
  assert.ok(app.zavriVrchnu()); await new Promise(r => setTimeout(r, 0));
  assert.deepStrictEqual(["overlay", "cook", "dlg-overlay"].map(app.otvorene), [true, true, false], "najprv len dialóg");
  app.zavriVrchnu(); await new Promise(r => setTimeout(r, 0));
  assert.deepStrictEqual(["overlay", "cook"].map(app.otvorene), [true, false], "potom varenie, detail ostane");
  app.zavriVrchnu();
  assert.ok(!app.otvorene("overlay") && !app.zavriVrchnu(), "nakoniec detail; potom už niet čo zavrieť");
});
ok("otvorené „⋯ Viac“ je navrchu: Escape/Späť zavrie menu, okno pod ním ostane", () => {
  const app = vrstvyApp(); app.otvor_("overlay");
  let zavrete = 0; app.zavriMenu = () => { zavrete++; };
  app._menu = { parentElement: null };
  assert.ok(app.zavriVrchnu()); assert.strictEqual(zavrete, 1); assert.ok(app.otvorene("overlay"), "detail sa zavrel spolu s menu");
});
ok("história má záznam za každú otvorenú vrstvu vrátane dialógu a menu", () => {
  const app = vrstvyApp(); app.otvor_("overlay", "cook", "dlg-overlay"); app._menu = {};
  assert.strictEqual(app._pocetVrstiev(), 4);
});
ok("privítanie zavreté akoukoľvek cestou (Escape, Späť, ťuk vedľa) sa už neukáže", () => {
  const app = vrstvyApp(); app.S.profil.onboarded = false; const doc = app.document, q = doc.querySelector;
  doc.querySelector = s => (/dokonciOnboarding/.test(s) ? {} : q(s)); // v okne je tlačidlo privítania
  app.otvor_("pick-overlay"); app.zavriVrchnu();
  assert.strictEqual(app.S.profil.onboarded, true);
  assert.ok(!app.otvorene("pick-overlay"));
});
ok("iné okno výberu privítanie nedokončí", () => {
  const app = vrstvyApp(); app.S.profil.onboarded = false; app.otvor_("pick-overlay"); app.zavriPick();
  assert.strictEqual(app.S.profil.onboarded, false);
});
ok("hodnotenie sa mení na mieste — detail sa neprekreslí (porcie, jednotky ani scroll sa nevrátia)", () => {
  const app = novy(); const id = app.RECEPTY[0].id; let prekreslene = 0; app.otvor = () => { prekreslene++; };
  app.hodnot(id, 3.5); assert.strictEqual(app.S.hodn[id], 3.5);
  app.hodnot(id, 9); assert.strictEqual(app.S.hodn[id], 5, "nad 5 sa zovrie");
  app.hodnot(id, 0); assert.ok(!(id in app.S.hodn), "0 = bez hodnotenia");
  assert.strictEqual(prekreslene, 0, "hodnot() prekreslil detail");
  assert.strictEqual(app.hodnotText(3.5), "3,5 z 5 hviezd"); assert.strictEqual(app.hodnotText(0), "bez hodnotenia");
});
ok("hodnotenie klávesnicou: šípky po 0,5, Home = 0, End = 5; ťuk = celá, druhý ťuk = pol", () => {
  const app = novy(); const id = app.RECEPTY[0].id; app.otvor = () => {};
  const k = key => app.hodnotKlaves({ key, preventDefault() {} }, id);
  k("ArrowRight"); k("ArrowRight"); k("ArrowUp"); assert.strictEqual(app.S.hodn[id], 1.5);
  k("ArrowLeft"); assert.strictEqual(app.S.hodn[id], 1);
  k("End"); k("ArrowRight"); assert.strictEqual(app.S.hodn[id], 5, "End a nad 5 = 5");
  k("Home"); assert.ok(!(id in app.S.hodn));
  const tap = i => app.hodnotKlik({ target: { closest: () => ({ dataset: { i: String(i) } }) } }, id);
  tap(3); assert.strictEqual(app.S.hodn[id], 3); tap(3); assert.strictEqual(app.S.hodn[id], 2.5); tap(3); assert.strictEqual(app.S.hodn[id], 3);
  assert.ok(/class="star-cil" data-i="1"/.test(app.starsHTML(2, true)) && !/star-cil/.test(app.starsHTML(2)), "karta má hviezdy len na čítanie");
});
// recept, ktorého krok spomína surovinu s množstvom (krokHint) — deterministicky prvý taký
function receptSMnozstvomVKroku(app) {
  for (const r of app.RECEPTY) { const p = r.postup || []; if (p.length < 2) continue;
    if (p.some(k => app.krokHint(k, 1, 1, r))) return r; }
  return null; }
ok("varenie ukáže pri kroku aj množstvá surovín a posledný krok je „✓ Hotovo“", async () => {
  const app = novy(); app.toast = () => {}; const r = receptSMnozstvomVKroku(app); assert.ok(r, "žiadny recept s množstvom v kroku");
  app.document.getElementById("cook").style.setProperty = () => {};
  app.otvor(r.id); await app.spustiCook();
  const i = (r.postup || []).findIndex(k => app.krokHint(k, 1, 1, r));
  vmB4.runInContext("cookKrok=" + (i + 1) + "; ukazKrok();", app); // v34: krok 0 je „🧺 Priprav si"
  assert.ok(/krok-mn/.test(app.document.getElementById("cook-mn").innerHTML), "pri kroku chýbajú množstvá");
  vmB4.runInContext("cookKrok=cookKroky.length-1; ukazKrok();", app);
  assert.strictEqual(app.document.getElementById("cook-dalej").textContent, "✓ Hotovo");
});
ok("varenie toho istého receptu pokračuje krokom, kde skončilo", async () => {
  const app = novy(); const toasty = []; app.toast = m => toasty.push(m);
  const r = app.RECEPTY.find(x => (x.postup || []).length >= 4);
  app.document.getElementById("cook").style.setProperty = () => {};
  app.otvor(r.id); await app.spustiCook(); vmB4.runInContext("cookKrok=2;", app);
  app.document.getElementById("cook").classList.remove("open"); await app.spustiCook();
  assert.strictEqual(vmB4.runInContext("cookKrok", app), 2);
  assert.ok(toasty.some(t => /Pokračuješ krokom 3/.test(t)), toasty.join(" | "));
});
ok("časovač ráta podľa hodín; ťuk na bežiaci a zavretie varenia sa najprv opýtajú", async () => {
  const app = novy(); const toasty = []; app.toast = m => toasty.push(m); let otazok = 0, odpoved = false;
  app.confirmModal = () => { otazok++; return Promise.resolve(odpoved); };
  app.pridajCasovacSek(120, "test");
  const cas = () => vmB4.runInContext("casovace", app);
  cas()[0].koniec = Date.now() - 1; app.tickCasovace();            // zmeškané tiky (telefón na pozadí)
  assert.strictEqual(cas()[0].left, 0, "časovač nedobehol podľa hodín");
  assert.ok(toasty.some(t => /dobehol/.test(t)), "dobehnutie sa neohlásilo (aria-live toast)");
  app.pridajCasovacSek(60, "beží"); const id = cas()[1].id;
  await app.zmazCasovacKlik(id); assert.strictEqual(cas().length, 2, "zmazal bez opýtania");
  app.document.getElementById("cook").classList.add("open");
  await app.zavriCook(); assert.ok(app.document.getElementById("cook").classList.contains("open"), "zavrel s bežiacim časovačom bez opýtania");
  odpoved = true; await app.zavriCook();
  assert.ok(!app.document.getElementById("cook").classList.contains("open") && cas().length === 0);
  assert.strictEqual(otazok, 3);
});

// ─────────────────────────────────────────────────────────── v33 „🍸 Môj bar"
nadpis("v33 — „🍸 Môj bar“ (čo namiešam z toho, čo mám)");
const kokteil = (id, ing) => ({ id, nazov: id, kategoria: "Kokteil", kuchyna: "", porcie: 1, postup: [], tagy: [],
  ingrediencie: ing.map(([nazov, mnozstvo]) => ({ nazov, mnozstvo, jednotka: mnozstvo == null ? "" : "ml" })) });
const MOJITO = [["Biely rum", 50], ["Limetková šťava", 25], ["Cukrový sirup", 20], ["Mäta", 6], ["Sóda", 60], ["Ľad", null], ["Limetka", null]];
ok("ľad a ozdoba bez množstva sa nerátajú; plný bar = namiešaš hneď, bez sódy chýba práve sóda", () => {
  const app = novy(), r = vloz(app, kokteil("t-mojito", MOJITO));
  const k = n => app.barKluc({ nazov: n });
  const plny = new Set(MOJITO.filter(x => x[1] != null).map(x => k(x[0])));
  assert.deepEqual(app.barSkore(r, plny).chyba, []);
  assert.strictEqual(app.barSkore(r, plny).spolu, 5, "ľad alebo ozdoba sa započítali");
  plny.delete(k("Sóda"));
  assert.deepEqual(app.barSkore(r, plny).chyba, [k("Sóda")]);
});
ok("čo dokúpiť: vec, ktorá ako jediná chýba najviacerým drinkom, je prvá", () => {
  const app = novy();
  const zoz = [kokteil("t-gt", [["Gin", 50], ["Tonic", 100]]), kokteil("t-vt", [["Vodka", 50], ["Tonic", 100]]),
    kokteil("t-gs", [["Gin", 50], ["Sóda", 100]])].map(r => vloz(app, r));
  const k = n => app.barKluc({ nazov: n });
  const d = app.coDokupit(zoz, new Set([k("Gin"), k("Vodka")]));
  assert.deepEqual(d[0], [k("Tonic"), 2]);
});
ok("všeobecnú „Whisky“ splní bourbon, ale „Bourbon“ nesplní holá whisky; biely a tmavý rum sú dve fľaše", () => {
  const app = novy(), k = n => app.barKluc({ nazov: n });
  const hb = vloz(app, kokteil("t-hb", [["Whisky", 50], ["Sóda", 100]])), of = vloz(app, kokteil("t-of", [["Bourbon", 50]]));
  assert.deepEqual(app.barSkore(hb, new Set([k("Bourbon"), k("Sóda")])).chyba, []);
  assert.deepEqual(app.barSkore(of, new Set([k("Whisky")])).chyba, [k("Bourbon")]);
  assert.notStrictEqual(k("Biely rum"), k("Tmavý rum"));
});
ok("rodina drinku podľa hlavného alkoholu; bez alkoholu = Nealko", () => {
  const app = novy();
  assert.strictEqual(app.zakladDrinku(kokteil("t-m", MOJITO)), "Rum");
  assert.strictEqual(app.zakladDrinku(kokteil("t-n", [["Pomarančová šťava", 100], ["Grenadína", 10]])), "Nealko");
});
ok("S.bar prežije poškodený stav a názov suroviny sa v okne escapuje", () => {
  assert.strictEqual(load({ stav: { bar: 42 } }).S.bar, "");
  const app = novy(); vloz(app, kokteil("t-x", [['<img src=x onerror=alert(1)>', 30]]));
  app.otvorBar();
  const h = app.document.getElementById("bar-zoz").innerHTML;
  assert.ok(h.includes("&lt;img") && !h.includes("<img"), "XSS cez názov suroviny");
});
ok("tlačidlo na Domove hovorí, koľko drinkov namiešaš hneď; prázdny bar = len pozvánka", () => {
  const app = novy(), r = vloz(app, kokteil("t-mojito", MOJITO)), b = app.document.getElementById("bar-dom");
  app.renderBarDom(); assert.strictEqual(b.textContent, "🍸 Môj bar — čo namiešam");
  app.S.bar = app._barSuroviny(r).join("|"); app.renderBarDom();
  assert.match(b.textContent, /namiešaš \d+ kokteil/);
});

console.log("\nv34 — typ stravníka a vegetarián v zmiešanej domácnosti");
ok("dieťa v domácnosti: generátor nevidí alkohol, tatarák ani kávu; Recepty ich ďalej majú", () => {
  const app = novy({ stravnici: [{ nazov: "A", kcal: 2000 }, { nazov: "Malý", kcal: 1400, typ: "dieta" }] });
  const u = app.genUniverzum();
  assert.ok(u.length > 500, "univerzum sa zrútilo: " + u.length);
  assert.strictEqual(u.filter(r => app.nevhodneCitlivym(r)).length, 0);
  assert.ok(app.RECEPTY.some(r => /tatar/i.test(app.bezDia(r.nazov)) && app.prejdeProfil(r)), "tatarák zmizol aj z Receptov");
  assert.ok(!app.nevhodneCitlivym({ id: "t-zem", nazov: "Placky", ingrediencie: [{ nazov: "Korenie na pečené zemiaky" }] }), "„pečené“ ≠ pečeň");
});
ok("vegetarián medzi mäsožravcami: mäso v nákupe × (1 − podiel), za zvyšok tofu; plán to povie", () => {
  const app = novy({ stravnici: [{ nazov: "Otec", kcal: 2000 }, { nazov: "Mama", kcal: 2000, veg: true }] });
  assert.ok(Math.abs(app.vegPodiel() - 0.5) < 1e-9);
  const r = { id: "t-gul", nazov: "Guláš", porcie: 2, ingrediencie: [{ nazov: "Hovädzie mäso", mnozstvo: 400, jednotka: "g" }, { nazov: "Cibuľa", mnozstvo: 1, jednotka: "ks" }] };
  const ing = app.ingrediencieNaNakup(r);
  assert.strictEqual(ing[0].mnozstvo, 200); assert.strictEqual(ing[1].mnozstvo, 1);
  const t = ing.find(i => i.nazov === "Tofu"); assert.ok(t && t.mnozstvo === 300, JSON.stringify(t)); // tofu 1,5× (polovica bielkovín mäsa)
  assert.match(app.vegNahradaText(r), /Mama/);
  const v = novy({ stravnici: [{ nazov: "Otec", kcal: 2000 }, { nazov: "Mama", kcal: 2000, veg: true, typ: "" }, { nazov: "X", kcal: 2000, veg: true }] });
  assert.ok(Math.abs(v.vegPodiel() - 2 / 3) < 1e-9);
  const vsetci = novy({ stravnici: [{ nazov: "A", kcal: 2000, veg: true }] });
  assert.strictEqual(vsetci.vegPodiel(), 0, "jediný (vegetariánsky) stravník nie je zmiešaná domácnosť");
});

console.log("\nv34 — import receptu (JSON-LD aj text)");
ok("riadok suroviny: množstvo, jednotka a názov v oboch poradiach, zlomky, podľa chuti", () => {
  const app = novy(), p = x => JSON.parse(JSON.stringify(app.parseIngRiadok(x)));
  assert.deepStrictEqual(p("250 g hladkej múky"), { nazov: "Hladká múka", mnozstvo: 250, jednotka: "g" });
  assert.deepStrictEqual(p("Múka hladká, 250 g"), { nazov: "Múka hladká", mnozstvo: 250, jednotka: "g" });
  assert.deepStrictEqual(p("1 ½ lyžičky soli"), { nazov: "Soľ", mnozstvo: 1.5, jednotka: "ČL" });
  assert.deepStrictEqual(p("0,5 l mlieka"), { nazov: "Mlieko", mnozstvo: 500, jednotka: "ml" });
  assert.deepStrictEqual(p("soľ podľa chuti"), { nazov: "Soľ", mnozstvo: null, jednotka: "" });
});
ok("JSON-LD v @graph: názov, porcie, čas, suroviny, kroky a zdroj s odkazom", () => {
  const app = novy();
  const r = app.parseReceptImport('<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Recipe"],"name":"Guláš","recipeYield":["4"],"totalTime":"PT1H30M","recipeIngredient":["Cibuľa, 2 ks"],"recipeInstructions":[{"@type":"HowToSection","itemListElement":[{"@type":"HowToStep","text":"Opraž."}]}],"url":"https://www.varecha.sk/r/1"}]}</script>');
  assert.strictEqual(r.nazov, "Guláš"); assert.strictEqual(r.porcie, 4); assert.strictEqual(r.cas, "1 h 30 min");
  assert.deepStrictEqual([...r.postup], ["Opraž."]); assert.strictEqual(r.ingrediencie[0].mnozstvo, 2);
  assert.strictEqual(r.zdroj_url, "https://www.varecha.sk/r/1");
});
ok("slovenské jednotky a 2. pád: dkg, pol, čajová lyžička, plechovka (400 g), hladkej múky → Hladká múka", () => {
  const app = novy(), p = x => JSON.parse(JSON.stringify(app.parseIngRiadok(x)));
  assert.deepStrictEqual([p("10 dkg masla").mnozstvo, p("10 dkg masla").jednotka, p("10 dkg masla").nazov], [100, "g", "Maslo"]);
  assert.strictEqual(p("pol cibule").mnozstvo, 0.5);
  assert.strictEqual(p("1 čajová lyžička cukru").jednotka, "ČL");
  assert.deepStrictEqual([p("1 konzerva paradajok (400 g)").mnozstvo, p("1 konzerva paradajok (400 g)").jednotka], [400, "g"]);
  assert.strictEqual(p("250 g hladkej múky").nazov, "Hladká múka");
  assert.strictEqual(p("1 sáčok prášku do pečiva").nazov, "Prášok do pečiva");
});
ok("obyčajný text s nadpismi Suroviny/Postup", () => {
  const r = novy().parseReceptImport("Palacinky\n4 porcie\nSuroviny\n250 g múky\n2 vajcia\nPostup\n1. Vymiešaj cesto.\n2. Peč.");
  assert.strictEqual(r.nazov, "Palacinky"); assert.strictEqual(r.porcie, 4);
  assert.strictEqual(r.ingrediencie.length, 2); assert.deepStrictEqual([...r.postup], ["Vymiešaj cesto.", "Peč."]);
});

nadpis("\nKolo 3 (8. 10.) — import, jeden hrniec, mimo domu po osobách, snack, zákazy, Späť");
ok("import: pol kila, KL, 2 x 400 g, čas aj porcie v jednom riadku, komentáre preč, koláč bez porcií = 8", () => {
  const app = novy(), p = x => JSON.parse(JSON.stringify(app.parseIngRiadok(x)));
  assert.deepStrictEqual([p("pol kila zemiakov").mnozstvo, p("pol kila zemiakov").jednotka], [500, "g"]);
  assert.strictEqual(p("1 KL soli").jednotka, "ČL");
  assert.deepStrictEqual([p("2 x 400 g paradajok").mnozstvo, p("2 x 400 g paradajok").jednotka], [800, "g"]);
  assert.ok(!/^Šťavo/.test(p("šťava z 1 citróna").nazov), p("šťava z 1 citróna").nazov);
  const r = app.parseReceptImport("Kurací perkelt\nČas: 40 min   Porcie: 4\nSuroviny\n500 g kuracích pŕs\nPostup\n1. Opraž cibuľu.\nKomentáre (12)\nPrihlásiť sa");
  assert.strictEqual(r.porcie, 4); assert.strictEqual(r.cas, "40 min");
  assert.ok(!r.postup.some(x => /Koment|Prihl/.test(x)), JSON.stringify(r.postup));
  const k = app.parseReceptImport("Jablkový koláč\nSuroviny\n300 g múky\n4 jablká\nPostup\n1. Upeč.");
  assert.strictEqual(k.porcie, 8); assert.strictEqual(k.porcieOdhad, true);
});
ok("jeden hrniec: varenie bloku a detail rátajú obed AJ večeru (navarí sa celé, nie polovica)", async () => {
  const app = novy({ jedenHrniec: true });
  await app.generujJedalnicek(true);
  const id = app.slotIds(0, "Obed")[0];
  assert.strictEqual(app.slotIds(0, "Večera")[0], id);
  const x = app.varenieBloku(app.denyBloku(0)).find(v => v.cid === id);
  const ocak = ["Obed", "Večera"].reduce((a, s) => a + app.porcieSlotBlok(0, s, id) * app.pf(0, s), 0);
  assert.deepStrictEqual([...x.sloty], ["Obed", "Večera"]);
  assert.ok(Math.abs(x.por - ocak) < 1e-9, x.por + " vs " + ocak);
  app.otvor(id, { di: 0, slot: "Obed" });
  const pv = require("vm").runInContext("aktPorcie*aktVelkost", app); assert.ok(Math.abs(pv - ocak) < 0.05, pv + " vs " + ocak);
  app.regenerujSlot(0, "Obed");
  assert.strictEqual(app.slotIds(0, "Večera")[0], app.slotIds(0, "Obed")[0], "🎲 obeda rozbilo jeden hrniec");
});
ok("mimo domu po osobách: obed ostane, kým je niekto doma, a porcie sú len pre tých doma", async () => {
  const app = novy({ osoby: 2, kcal: 2000, stravnici: [{ nazov: "Ja", kcal: 2000 }, { nazov: "Peter", kcal: 2000, mimo: "Obed" }] });
  await app.generujJedalnicek(true);
  assert.ok(app.slotyDna(0).includes("Obed") && app.slotyDna(5).includes("Obed"));
  assert.strictEqual(app.cielDna(0), 2000, "cieľ hlavného stravníka sa nesmie zmenšiť");
  const pomer = app.porcieSlot(0, "Obed") / app.porcieSlot(0, "Večera") / (app.pf(0, "Večera") / app.pf(0, "Obed"));
  assert.ok(Math.abs(app.vahaPritomnych(0, "Obed") - 0.5) < 1e-9 && app.vahaPritomnych(5, "Obed") === 1);
  assert.deepStrictEqual([...app.mimoMena(0, "Obed")], ["Peter"]); assert.ok(pomer > 0);
  const b = novy({ osoby: 2, kcal: 2000, stravnici: [{ nazov: "Ja", kcal: 2000, mimo: "Obed" }, { nazov: "Peter", kcal: 2000, mimo: "Obed" }] });
  assert.ok(!b.slotyDna(0).includes("Obed") && b.slotyDna(5).includes("Obed"), "keď sú preč všetci, obed v pracovný deň zmizne");
  assert.ok(/mimo domu/.test(b.planBunka(0, "Obed")) && !/vyp\./.test(b.planBunka(0, "Obed")));
});
ok("doplnok snacku rešpektuje domácnosť (dieťa 4–6 r.): žiadna káva, celé orechy ani proteínový nápoj", () => {
  const app = novy({ osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "Ema", kcal: 1350, typ: "dieta4" }] });
  const zle = app.RECEPTY.filter(r => r.kategoria === "Snack" && app.jeVyrobok(r)).map(r => app.snackDoplnok(r)).filter(Boolean)
    .filter(id => !app.vhodnyPrePlan(app.receptById(id)));
  assert.deepStrictEqual([...zle], []);
  assert.ok(app.nevhodneMalym({ nazov: "Arašidy pražené", typ: "vyrobok", kategoria: "Snack", ingrediencie: [] }));
});
ok("čerstvo zostavený týždeň nehlási „Vymenil som…“ (dieťa v domácnosti, menej soli)", async () => {
  const app = novy({ osoby: 2, kcal: 1450, menejSoli: true, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "Ema", kcal: 1350, typ: "dieta4" }] });
  await app.generujJedalnicek(true);
  assert.ok(!/Vymenil/.test(app.toast._posl || ""), app.toast._posl);
});
ok("zákazy: „bez lepku“, „celiakia“ a „tree nuts“ sú lepok a orechy", () => {
  const app = novy({ zakazane: "bez lepku, celiakia, tree nuts" });
  const t = app.zakazaneTokens();
  assert.ok(t.includes("lepok") && t.includes("orechy"), JSON.stringify(t));
});
ok("diéta: nespárovaná surovina „kuracích pŕs“ urobí jedlo mäsitým; tatár je pre dieťa nevhodný, tatárska omáčka nie", () => {
  const app = novy();
  assert.strictEqual(app.diety({ ingrediencie: [{ nazov: "Kuracích pŕs vykostených", mnozstvo: 300, jednotka: "g" }] }).veg, false);
  assert.ok(app.nevhodneCitlivym({ id: "x1", nazov: "Losos tatár", ingrediencie: [] }));
  assert.ok(!app.nevhodneCitlivym({ id: "x2", nazov: "Ryba s tatárskou omáčkou", ingrediencie: [] }));
});
ok("↩ Späť má 5 krokov: dve 🎲 sa dajú vrátiť až po pôvodné jedlo", async () => {
  const app = novy();
  await app.generujJedalnicek(true);
  const p0 = app.slotIds(2, "Obed")[0];
  app.regenerujSlot(2, "Obed"); app.regenerujSlot(2, "Obed");
  app.vratSpat(); app.vratSpat();
  assert.strictEqual(app.slotIds(2, "Obed")[0], p0);
});

nadpis("\nKolo 4 (9. 10.) — diabetes, farebné témy, jednotky, časovač, jeden hrniec, nákup od dneška");
ok("🩺 diabetes: bez dezertov a sladkostí, sacharidy do 60 % energie, kúpený snack do 20 g; príloha ostáva", () => {
  const app = novy({ diabetes: true });
  const U = app.genUniverzum();
  assert.ok(!U.some(r => r.kategoria === "Dezert"), "dezert v pláne diabetika");
  const zle = U.filter(r => { const v = app.vyzivaReceptu(r); return v.kcal > 0 && (app.jeVyrobok(r) ? v.s > 20 : v.s * 4 / v.kcal > 0.6); });
  assert.strictEqual(zle.length, 0, zle.slice(0, 3).map(r => r.id).join(","));
  assert.ok(app.vhodnyPrePlan(app.komponent("prf:ryza")), "ryža ako príloha musí ostať");
  assert.ok(novy().genUniverzum().length > U.length);
});
ok("🩺 diabetes zníži podiel sacharidov v pláne a bunka ich ukáže", async () => {
  const sach = async dia => { const a = novy({ diabetes: dia, kcal: 2000, stravnici: [{ nazov: "A", kcal: 2000 }] }); await a.generujJedalnicek(true);
    let k = 0, s = 0; for (let di = 0; di < 7; di++) a.slotyDna(di).forEach(sl => a.slotIds(di, sl).forEach(c => { const r = a.komponent(c); if (r) { const v = a.vyzivaReceptu(r); k += v.kcal * a.pf(di, sl); s += v.s * a.pf(di, sl); } }));
    return { p: s * 4 / k, a }; };
  const bez = await sach(false), s = await sach(true);
  assert.ok(s.p < bez.p - 0.04 && s.p < 0.42, (bez.p * 100).toFixed(1) + " % → " + (s.p * 100).toFixed(1) + " %");
  assert.ok(/g sach\./.test(s.a.planBunka(0, "Obed")), "bunka neukazuje sacharidy");
});
ok("🎨 farebné témy: 5 paliet, voľba sa uloží na <html data-paleta> a neznáma hodnota nič nerozbije", () => {
  const app = novy({ paleta: "more" });
  assert.strictEqual(app.PALETY.length, 5);
  app.applyVzhlad();
  assert.strictEqual(app.document.documentElement.dataset.paleta, "more");
  const x = novy({ paleta: "<script>" }); x.applyVzhlad();
  assert.ok(!x.document.documentElement.dataset.paleta, "neznáma paleta sa nesmie zapísať");
});
ok("jednotky sa skloňujú: 1 hrsť · 3 plátky · 6 hrstí · 1,5 strúčika", () => {
  const app = novy();
  assert.deepStrictEqual([app.jednotkaSklon(1, "hrsť"), app.jednotkaSklon(3, "plátok"), app.jednotkaSklon(6, "hrsť"), app.jednotkaSklon(1.5, "strúčik"), app.jednotkaSklon(5, "g")],
    ["hrsť", "plátky", "hrstí", "strúčika", "g"]);
});
ok("časovač zo slov: šesť hodín, 1–1½ hodiny, hodinu, 2 a 1/2 hod.", () => {
  const app = novy(), m = t => app.parseCasSek(t) / 60;
  assert.deepStrictEqual([m("Pečieme šesť hodín."), m("Duste 1–1½ hodiny."), m("Varte hodinu."), m("Peč 2 a 1/2 hod."), m("Peč 1 hodinu 30 minút")], [360, 60, 60, 150, 90]);
});
ok("jeden hrniec je v blokovom zozname JEDNA karta „Obed aj večera“", async () => {
  const app = novy({ jedenHrniec: true });
  await app.generujJedalnicek(true);
  app.renderPlanBloky(["Raňajky", "Obed", "Večera", "Snack"], 1450);
  const h = app.document.getElementById("plan-bloky").innerHTML;
  assert.ok(/Obed aj večera/.test(h), "chýba spoločná karta");
  assert.ok(!/<span class="pc-slot">Večera<\/span>/.test(h), "večera je ešte samostatná karta");
});
ok("nákup: predvolene celý týždeň; „Len od dneška“ zapne várky, ktoré sa ešte nezačali", () => {
  const app = novy();
  app.S.viewOd = app.pondelokPre(app.dnesISO()); app.S.nakupVarky = null;
  assert.strictEqual(app.nakupVyber(), null, "bez voľby sa nesmie nič skryť");
  const dnes = (new Date().getDay() + 6) % 7, b = app.bloky(), cakaju = b.map((d, i) => i).filter(i => b[i][0] > dnes);
  const od = app.nakupVyberOdDnes();
  if (cakaju.length && cakaju.length < b.length) {
    assert.deepStrictEqual([...od], [...cakaju]);
    assert.ok(/Len od dneška/.test(app.varkyHTML(null)), "chýba tlačidlo „Len od dneška“");
    app.nakupOdDnes(); assert.deepStrictEqual([...app.nakupVyber()], [...cakaju]);
  } else assert.strictEqual(od, null);
});

spusti().catch(e => { console.error(String(e.message || e)); process.exit(1); });
