// Odolnosť: prázdne, nulové a poškodené vstupy. Beh: node test_odolnost.js
//
// Pravidlo tohto súboru: nič nesmie hodiť výnimku a žiadne číslo, ktoré appka ukazuje alebo
// z ktorého ďalej počíta, nesmie byť NaN ani Infinity. Appka je offline jednosúborová —
// nemá kam poslať chybu, takže jediná obrana je, že sa nezasekne.
const assert = require("assert");
const { load } = require("./test_harness");

// Kontroly sa zaraďujú do frontu a púšťajú sekvenčne — časť z nich je asynchrónna
// (generujJedalnicek) a synchrónne „ok()" by vypísalo ✓ skôr, než by assert stihol padnúť.
let bezov = 0;
const FRONTA = [];
function ok(popis, fn) { FRONTA.push({ popis, fn }); }
function nadpis(t) { FRONTA.push({ nadpis: t }); }
process.on("unhandledRejection", e => { console.error("neodchytená chyba: " + (e && (e.stack || e.message) || e)); process.exit(1); });
async function spusti() {
  for (const k of FRONTA) {
    if (k.nadpis !== undefined) { console.log(k.nadpis); continue; }
    await k.fn();
    console.log("  ✓ " + k.popis); bezov++;
  }
}
// každé číslo v (aj vnorenej) štruktúre musí byť konečné
function bezNaN(x, kde) {
  if (typeof x === "number") { assert.ok(Number.isFinite(x), kde + " = " + x); return; }
  if (Array.isArray(x)) return x.forEach((v, i) => bezNaN(v, kde + "[" + i + "]"));
  if (x && typeof x === "object") return Object.keys(x).forEach(k => {
    if (k === "p" || k === "zdroje") return; // odkazy na potravinu / recept, nie výsledky
    bezNaN(x[k], kde + "." + k);
  });
}
function neHodi(popis, fn) { try { return fn(); } catch (e) { assert.fail(popis + " hodilo výnimku: " + (e && e.message)); } }

const PONDELOK = "2026-08-17";
const ZAKLAD = {
  viewOd: PONDELOK, hranice: [true, false, true, false, false, true, false], blokMode: true,
  genCfg: { zachovat: false, cielMode: true, filtre: [] },
  profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }] },
};

nadpis("O1 — prázdny plán");
ok("nákup, ceny aj denné súčty fungujú na prázdnom pláne", () => {
  const a = load({ seed: 1, stav: ZAKLAD });
  const { grp, notes } = neHodi("nakupPolozky", () => a.nakupPolozky());
  assert.strictEqual(Object.keys(grp).length, 0);
  assert.strictEqual(Object.keys(notes).length, 0);
  assert.strictEqual(neHodi("nakupItems", () => a.nakupItems()).length, 0);
  ["spotreba", "balenia", "osoba"].forEach(m => {
    const c = neHodi("cenaTyzdna(" + m + ")", () => a.cenaTyzdna(m));
    assert.ok(Number.isFinite(c) && c === 0, m + " = " + c);
  });
  for (let di = 0; di < 7; di++) {
    assert.strictEqual(a.baseDayKcal(di), 0, "deň " + di);
    const p = a.pocetPorcii(di);
    assert.ok(Number.isFinite(p) && p > 0, "pocetPorcii(" + di + ") = " + p);
    assert.ok(Number.isFinite(a.pocetPorciiDna(di, "Obed")), "pocetPorciiDna");
    assert.ok(Number.isFinite(a.mnozMult(di, "Obed")), "mnozMult");
  }
  assert.strictEqual(a.planItems().length, 0);
  neHodi("renderNakup", () => a.__orig.renderNakup());
  neHodi("renderVyziva", () => a.__orig.renderVyziva());
  neHodi("renderPlan", () => a.__orig.renderPlan());
});

nadpis("\nO2 — 0 receptov v poole");
ok("appka sa naštartuje aj s prázdnou databázou receptov", () => {
  const a = neHodi("load bez receptov", () => load({ seed: 1, recepty: [], stav: ZAKLAD }));
  assert.strictEqual(a.RECEPTY.length, 0);
  neHodi("renderGrid", () => a.__orig.renderGrid());
  assert.strictEqual(a.nakupItems().length, 0);
});
ok("generovanie s prázdnym poolom nespadne a nechá plán prázdny", () => {
  const a = load({ seed: 1, recepty: [], stav: ZAKLAD });
  return a.generujJedalnicek(true).then(() => {
    for (let di = 0; di < 7; di++) a.slotyDna(di).forEach(sl =>
      assert.strictEqual(a.slotIds(di, sl).length, 0, "deň " + di + " / " + sl));
  });
});
ok("appka sa naštartuje aj s prázdnou databázou potravín", () => {
  const a = neHodi("load bez potravín", () => load({ seed: 1, potraviny: [], stav: ZAKLAD }));
  assert.strictEqual(a.najdiPotravinu("Cesnak"), null);
  const r = a.RECEPTY[0];
  bezNaN(a.vyzivaReceptu(r), "vyziva bez potravín");
  neHodi("renderGrid", () => a.__orig.renderGrid());
});

nadpis("\nO3 — chybné recepty");
const CHYBNE = [
  { id: "bez-ing", nazov: "Bez ingrediencií", kategoria: "Hlavné jedlo", porcie: 4, ingrediencie: [], postup: [] },
  { id: "porcie-0", nazov: "Nula porcií", kategoria: "Hlavné jedlo", porcie: 0, ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }], postup: [] },
  { id: "porcie-null", nazov: "Porcie null", kategoria: "Hlavné jedlo", porcie: null, ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }], postup: [] },
  { id: "mnoz-null", nazov: "Množstvo null", kategoria: "Hlavné jedlo", porcie: 2, ingrediencie: [{ nazov: "Soľ", mnozstvo: null, jednotka: "podľa chuti" }], postup: [] },
  { id: "jed-neznama", nazov: "Neznáma jednotka", kategoria: "Hlavné jedlo", porcie: 2, ingrediencie: [{ nazov: "Ryža", mnozstvo: 3, jednotka: "vrecúško" }], postup: [] },
  { id: "ing-neznama", nazov: "Neznáma surovina", kategoria: "Hlavné jedlo", porcie: 2, ingrediencie: [{ nazov: "Zzzqqq", mnozstvo: 100, jednotka: "g" }], postup: [] },
  { id: "bez-poli", nazov: "Bez polí", kategoria: "Hlavné jedlo" },
];
ok("vyzivaReceptu, kcalPorcia, healthScore a diety zvládnu každý chybný recept", () => {
  const a = load({ seed: 1, recepty: CHYBNE, stav: ZAKLAD });
  a.RECEPTY.forEach(r => {
    const v = neHodi("vyzivaReceptu(" + r.id + ")", () => a.vyzivaReceptu(r));
    bezNaN(v, "vyziva(" + r.id + ")");
    ["kcal", "b", "t", "s", "cena", "vl", "na"].forEach(k => assert.ok(v[k] >= 0, r.id + "." + k + " = " + v[k]));
    const k = neHodi("kcalPorcia", () => a.kcalPorcia(r));
    assert.ok(Number.isFinite(k) && k >= 0, r.id + " kcalPorcia = " + k);
    bezNaN(neHodi("healthScore", () => a.healthScore(r)), r.id + " healthScore");
    neHodi("diety", () => a.diety(r));
    neHodi("kartaHTML", () => a.kartaHTML(r));
  });
});
ok("porcie: 0 sa správa ako 1 porcia (nedelí sa nulou)", () => {
  const a = load({ seed: 1, recepty: CHYBNE, stav: ZAKLAD });
  const v0 = a.vyzivaReceptu(a.receptById("porcie-0"));
  const vn = a.vyzivaReceptu(a.receptById("porcie-null"));
  assert.ok(Number.isFinite(v0.kcal) && v0.kcal > 0, "porcie:0 → " + v0.kcal);
  assert.ok(Math.abs(v0.kcal - vn.kcal) < 1e-9, "porcie 0 a null musia dať to isté");
});
ok("chybný recept v pláne nerozbije nákup ani ceny", () => {
  const a = load({ seed: 1, recepty: CHYBNE, stav: ZAKLAD });
  const iso = a.datumPre(0);
  a.S.plan[iso] = { Obed: ["porcie-0"], Večera: ["jed-neznama"], Raňajky: ["bez-ing"], Snack: ["ing-neznama"] };
  const rows = neHodi("nakupItems", () => a.nakupItems());
  rows.forEach(r => bezNaN({ cena: r.cena, cenaSpotreba: r.cenaSpotreba, cenaBalenia: r.cenaBalenia, gramy: r.gramy }, r.nazov));
  ["spotreba", "balenia", "osoba"].forEach(m => assert.ok(Number.isFinite(a.cenaTyzdna(m)), m));
  neHodi("renderNakup", () => a.__orig.renderNakup());
  neHodi("renderPlan", () => a.__orig.renderPlan());
});
ok("neexistujúce id v pláne vráti null a nič nespadne", () => {
  const a = load({ seed: 1, stav: ZAKLAD });
  const iso = a.datumPre(0);
  a.S.plan[iso] = { Obed: ["neexistuje-vobec"], Večera: ["prf:neexistuje"] };
  // kontrakt: „nič" (receptById vracia undefined, príloha null) — volajúci to testuje cez if(!r)
  assert.ok(!a.komponent("neexistuje-vobec"), "neznáme id vrátilo " + a.komponent("neexistuje-vobec"));
  assert.ok(!a.komponent("prf:neexistuje"), "neznáma príloha vrátila " + a.komponent("prf:neexistuje"));
  assert.ok(Number.isFinite(a.baseDayKcal(0)), "baseDayKcal");
  neHodi("nakupItems", () => a.nakupItems());
  neHodi("renderPlan", () => a.__orig.renderPlan());
});

nadpis("\nO4 — potravina bez ceny a bez výživových údajov");
ok("cena100 = null znamená NEZNÁMA cena a je to vidieť (v.bezCeny), nie tichá nula", () => {
  const P = [{ kluc: "tajomna", oddelenie: "Ostatné", alergeny: [], kcal: 100, bielkoviny: 1, tuky: 1, sacharidy: 1, cena100: null, hustota: 1, meso: false }];
  const R = [{ id: "x", nazov: "X", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [{ nazov: "Tajomná", mnozstvo: 200, jednotka: "g" }], postup: [] }];
  const a = load({ seed: 1, recepty: R, potraviny: P, stav: ZAKLAD });
  const v = a.vyzivaReceptu(a.receptById("x"));
  bezNaN(v, "vyziva");
  assert.strictEqual(v.cena, 0, "neznáma cena sa má rátať ako 0 €");
  assert.ok(v.bezCeny > 0, "recept nepriznal, že cenu nepozná (bezCeny = " + v.bezCeny + ")");
});
ok("cena100 = 0 je platná cena (voda), nie neznáma", () => {
  const a = load({ seed: 1, stav: ZAKLAD });
  const voda = a.najdiPotravinu("Voda");
  if (!voda) return; // ak voda v databáze nie je, kontrola nemá čo overiť
  assert.strictEqual(voda.cena100, 0, "voda má cenu " + voda.cena100);
});
ok("potravina bez hustoty/vlákniny/sodíka nespôsobí NaN", () => {
  const P = [{ kluc: "holá", oddelenie: "Ostatné", alergeny: [], kcal: 50, bielkoviny: 0, tuky: 0, sacharidy: 0, cena100: 1, meso: false }];
  const R = [{ id: "y", nazov: "Y", kategoria: "Hlavné jedlo", porcie: 2, ingrediencie: [{ nazov: "Holá", mnozstvo: 100, jednotka: "ml" }], postup: [] }];
  const a = load({ seed: 1, recepty: R, potraviny: P, stav: ZAKLAD });
  bezNaN(a.vyzivaReceptu(a.receptById("y")), "vyziva bez hustoty");
  assert.strictEqual(a.gramy({ mnozstvo: 100, jednotka: "ml" }, P[0]), 100, "chýbajúca hustota = 1");
});

nadpis("\nO5 — poškodený localStorage");
[
  ["nevalidný JSON", "{nevalidny json"],
  ["prázdny reťazec", ""],
  ["null", "null"],
  ["pole namiesto objektu", "[1,2,3]"],
  ["orezaný JSON", '{"plan":{"2026-08-17":{"Obed":'],
  ["hranice zlej dĺžky", '{"hranice":[true,false]}'],
  ["neznáme kľúče navyše", '{"nieco":1,"plan":{},"__proto__x":2}'],
  // POZOR: skalárny JSON ("42", "true", "\"text\"") a polia zlého typu ("spajza":"x") appku dnes
  // ZHODIA — to je otvorená chyba, testuje ju test_regresie.js (R5). Sem patria len stavy,
  // ktoré appka už dnes prežije, aby sa to nezhoršilo.
].forEach(([popis, raw]) => {
  ok("appka sa naštartuje pri stave: " + popis, () => {
    const a = neHodi("load(" + popis + ")", () => load({ seed: 1, rawStav: raw }));
    assert.ok(a.S && typeof a.S === "object", "S nie je objekt");
    assert.ok(Array.isArray(a.S.hranice) && a.S.hranice.length === 7, "hranice: " + JSON.stringify(a.S.hranice));
    assert.ok(a.S.profil && a.S.profil.kcal > 0, "profil: " + JSON.stringify(a.S.profil));
    assert.ok(Number.isFinite(a.pocetPorcii(0)), "pocetPorcii");
    neHodi("nakupItems", () => a.nakupItems());
    neHodi("bloky", () => a.bloky());
  });
});

nadpis("\nO6 — extrémne hodnoty profilu");
ok("cieľ 0 kcal, 0 osôb a prázdny zoznam stravníkov nevyrobia delenie nulou", () => {
  [{ osoby: 0, kcal: 0, stravnici: [] }, { osoby: 1, kcal: 0, stravnici: [] }, { osoby: 99, kcal: 100, stravnici: [] }]
    .forEach(profil => {
      const a = load({ seed: 1, stav: Object.assign({}, ZAKLAD, { profil }) });
      assert.ok(a.stravniciList().length >= 0, "stravniciList");
      assert.ok(Number.isFinite(a.pocetPorcii(0)), JSON.stringify(profil) + " → " + a.pocetPorcii(0));
      ["spotreba", "balenia", "osoba"].forEach(m => assert.ok(Number.isFinite(a.cenaTyzdna(m)), m + " pri " + JSON.stringify(profil)));
      assert.ok(a.cieloveMakra(0) === null || Number.isFinite(a.cieloveMakra(0).b), "cieloveMakra(0)");
    });
});
ok("všetky dni „preč“ → generátor nič nenaplánuje a nespadne", () => {
  const a = load({ seed: 1, stav: Object.assign({}, ZAKLAD, { tyzdenProfil: { [PONDELOK]: { ludia: null, prec: [0, 1, 2, 3, 4, 5, 6] } } }) });
  return a.generujJedalnicek(true).then(() => {
    for (let di = 0; di < 7; di++) assert.strictEqual(a.slotyDna(di).length, 0, "deň " + di + " nemá byť naplánovaný");
    assert.strictEqual(a.nakupItems().length, 0, "nákup má byť prázdny");
  });
});

nadpis("\nO7 — poškodený vlastný recept (záloha, synchronizácia)");
// Do v32 každý z nich zhodil štart appky (alergenyReceptu, hľadanie) a s ním Domov aj Recepty.
[
  ["ingrediencie ako reťazec", { id: "moj-a", nazov: "A", ingrediencie: "abc", postup: ["Krok"] }],
  ["ingrediencie a postup [null]", { id: "moj-b", nazov: "B", ingrediencie: [null], postup: [null] }],
  ["surovina s číselným názvom, postup ako reťazec", { id: "moj-c", nazov: "C", ingrediencie: [{ nazov: 5, mnozstvo: "abc", jednotka: 7 }], postup: "Krok" }],
  ["tagy ako reťazec, záporné porcie, javascript: odkaz", { id: "moj-d", nazov: "D", porcie: -3, tagy: "x", zdroj: "Ja", zdroj_url: "javascript:alert(1)",
    ingrediencie: [{ nazov: "Ryža", mnozstvo: -100, jednotka: "g" }, null, { nazov: "Cesnak", mnozstvo: 2, jednotka: "strúčik" }], postup: "x" }],
  ["id s úvodzovkou (onclick)", { id: "x');alert(1);('", nazov: "E", ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }], postup: [] }],
].forEach(([popis, r]) => ok("appka sa naštartuje s vlastným receptom: " + popis, () => {
  const a = neHodi("load", () => load({ seed: 1, stav: Object.assign({}, ZAKLAD, { mojeRecepty: [r] }) }));
  neHodi("renderGrid", () => a.__orig.renderGrid());
  neHodi("renderDash", () => a.__orig.renderDash());
  a.RECEPTY.filter(x => x._moj).forEach(x => {
    neHodi("hladaSedi", () => a.hladaSedi(x, "ryza cesnak"));
    neHodi("diety", () => a.diety(x));
    assert.ok(Array.isArray(x.ingrediencie) && x.ingrediencie.every(i => typeof i.nazov === "string" && (i.mnozstvo === null || i.mnozstvo > 0)), "ingrediencie: " + JSON.stringify(x.ingrediencie));
    assert.ok(Array.isArray(x.postup) && x.postup.every(k => typeof k === "string"), "postup: " + JSON.stringify(x.postup));
    assert.ok(Array.isArray(x.tagy) && x.porcie > 0, "tagy/porcie: " + JSON.stringify([x.tagy, x.porcie]));
    assert.ok(!x.zdroj_url || /^https?:/.test(x.zdroj_url), "zdroj_url: " + x.zdroj_url);
    assert.ok(/^[\w-]+$/.test(x.id), "id: " + x.id);
  });
  // recept bez jedinej suroviny aj kroku sa zahodí, ostatné sa opravia a ostanú
  assert.strictEqual(a.S.mojeRecepty.length, r.id === "moj-b" || r.id.includes("'") ? 0 : 1, "počet vlastných receptov");
}));

nadpis("\nO8 — poškodené zámky jedál (S.zamky, B3)");
[["reťazec", "zamky"], ["pole", [1, 2]], ["číslo", 5], ["null", null]].forEach(([nazov, hodnota]) =>
  ok("S.zamky ako " + nazov + " sa zmení na {} a plán, zámok aj generátor fungujú", async () => {
    const a = load({ seed: 3, stav: Object.assign({}, ZAKLAD, { zamky: hodnota }) });
    assert.ok(a.S.zamky && typeof a.S.zamky === "object" && !Array.isArray(a.S.zamky), "zamky = " + JSON.stringify(a.S.zamky));
    await a.generujJedalnicek(true);
    neHodi("prepniZamok", () => a.prepniZamok(2, "Obed"));
    assert.ok(a.jeZamknute(2, "Obed"), "zámok sa po oprave stavu nedá zapnúť");
  }));
ok("zámok dňa ako reťazec / číslo / pole a cudzie id nič nezamknú a nič nezhodia", async () => {
  const a = load({ seed: 3, stav: ZAKLAD });
  await a.generujJedalnicek(true);
  a.S.zamky = { [a.datumPre(0)]: "Obed", [a.datumPre(1)]: 7, [a.datumPre(2)]: ["Obed"], [a.datumPre(3)]: { Obed: "neexistuje", Večera: 1 } };
  for (let di = 0; di < 7; di++) ["Raňajky", "Obed", "Večera", "Snack"].forEach(sl =>
    assert.strictEqual(neHodi("jeZamknute", () => a.jeZamknute(di, sl)), false, "deň " + di + " " + sl + " je zamknutý"));
  neHodi("prepniZamok na reťazci", () => a.prepniZamok(0, "Obed"));
  assert.ok(a.jeZamknute(0, "Obed"), "zámok na poškodenom dni sa nedá zapnúť");
  await a.generujJedalnicek(true);
  assert.ok(a.planItems().length > 10, "generátor so zámkami nenaplánoval nič");
});

nadpis("\nO9 — id zásoby zo synchronizácie / zálohy (audit 30. 9., Balík 5)");
ok("textové id zásoby („1);alert(1);(“) sa prečísluje, zásoba ostane a onclick je neškodný", () => {
  const zly = { id: "1);alert(1);(", nazov: "Ryža", mnozstvo: 500, jednotka: "g", miesto: "Špajza" };
  const a = load({ seed: 1, stav: Object.assign({}, ZAKLAD, { spSid: 2, spajza: [zly,
    { id: 1, nazov: "Cestoviny", mnozstvo: 500, jednotka: "g", miesto: "Špajza" },
    { id: 1, nazov: "Duplicitné id", mnozstvo: 1, jednotka: "ks", miesto: "Špajza" }, { nazov: "Bez id", mnozstvo: 1, jednotka: "ks" }] }) });
  const ids = a.S.spajza.map(x => x.id);
  assert.strictEqual(a.S.spajza.length, 4, "zásoba sa zahodila: " + JSON.stringify(a.S.spajza));
  assert.ok(ids.every(x => typeof x === "number" && Number.isFinite(x)), "id nie je číslo: " + JSON.stringify(ids));
  assert.strictEqual(new Set(ids).size, 4, "id nie sú jedinečné: " + JSON.stringify(ids));
  assert.ok(a.S.spSid > Math.max(...ids), "nové zásoby by dostali existujúce id (spSid " + a.S.spSid + ")");
  const html = a.S.spajza.map(x => a.spRow(x)).join("");
  assert.ok(!/alert/.test(html), "do onclick sa dostal cudzí JS: " + html.slice(0, 300));
  // to isté cez synchronizáciu skupiny (normalizujStav nad prijatým blobom)
  const s = a.normalizujStav({ spajza: [Object.assign({}, zly)] });
  assert.ok(typeof s.spajza[0].id === "number" && s.spajza[0].nazov === "Ryža", JSON.stringify(s.spajza));
  neHodi("nakupItems", () => a.nakupItems());
});

spusti().then(() => console.log("\nOK — " + bezov + " kontrol prešlo."))
  .catch(e => { console.error(String((e && e.message) || e)); process.exit(1); });
