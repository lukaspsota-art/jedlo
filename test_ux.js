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
// renderBlokEditor je v harnesse stubnutý (testy nekreslia) — kontrolujeme stráž a kontejner
ok("rozdelenie blokov sa otvorí len v blokovom režime", () => {
  const app = novy();
  app.S.blokMode = false;
  app.otvorRozdelenie();
  assert.ok(!app.document.getElementById("pick-modal").innerHTML.includes("Rozdelenie"),
    "bez blokového režimu sa panel nemá otvoriť");
  app.S.blokMode = true;
  app.otvorRozdelenie();
  const h = app.document.getElementById("pick-modal").innerHTML;
  assert.ok(h.includes('id="blok-editor"'), "v paneli chýba kontejner editora");
  assert.ok(app.document.getElementById("pick-overlay").classList.contains("open"), "panel sa neotvoril");
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

spusti().catch(e => { console.error(String(e.message || e)); process.exit(1); });
