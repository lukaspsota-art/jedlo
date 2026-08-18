// Výpočtové testy k auditu 2026-08-18 (nálezy B1–B6). Beh: node test_vypocty.js
// Očakávané hodnoty sú KONKRÉTNE čísla z auditu — každý test padne na kóde spred opravy.
const assert = require("assert");
const { load } = require("./test_harness");

const app = load({ stav: {} });
const g = (nazov, mnozstvo, jednotka) => {
  const p = app.najdiPotravinu(nazov);
  return app.gramy({ nazov, mnozstvo, jednotka }, p);
};
const ing = (id, vzor) => {
  const r = app.receptById(id);
  assert.ok(r, "recept neexistuje: " + id);
  const i = (r.ingrediencie || []).find(x => vzor.test(x.nazov));
  assert.ok(i, "ingrediencia " + vzor + " nie je v " + id);
  return i;
};

let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }

// ─────────────────────────────────────────────────────────── B2: „ks" bez hmotnosti
console.log("B2 — počítateľné jednotky bez g_za_ks (predtým paušál 60 g)");
ok("chicken-biryani: Kardamómy 4 ks ≤ 5 g (predtým 240 g)", () => {
  const i = ing("chicken-biryani", /ardam/i);
  const gr = app.gramy(i, app.najdiPotravinu(i.nazov));
  assert.ok(gr <= 5, "kardamómy = " + gr + " g");
});
ok("chicken-adobo: 3 bobkové listy prestali robiť 141 kcal/porciu (760 → 619)", () => {
  // zvyšok cesty na deklarovaných 520 kcal dorobí B1 (Kuracích stehien → kľúč „kuracie steh")
  const k = app.kcalPorcia(app.receptById("chicken-adobo"));
  assert.ok(k <= 630, "chicken-adobo = " + k + " kcal");
});
ok("grilovane-jalapeno: 14 plátkov slaniny ≤ 400 g (predtým 840 g)", () => {
  const i = ing("grilovane-jalapeno-syr-slanina", /slanin/i);
  const gr = app.gramy(i, app.najdiPotravinu(i.nazov));
  assert.ok(gr > 0 && gr <= 400, "slanina = " + gr + " g");
});
ok("bobkový list 3 ks ≤ 1 g (predtým 180 g)", () => {
  const gr = g("Bobkový list", 3, "ks");
  assert.ok(gr > 0 && gr <= 1, "bobkový list = " + gr + " g");
});
ok("neznáma hmotnosť kusa → 0 g a príznak „≈ odhad\"", () => {
  const fake = { nazov: "Vymyslená surovina", mnozstvo: 2, jednotka: "ks" };
  assert.strictEqual(app.gramy(fake, { kluc: "x", hustota: 1 }), 0);
  const r = { id: "_t", nazov: "T", porcie: 1, ingrediencie: [{ nazov: "Sezam", mnozstvo: 3, jednotka: "ks" }] };
  assert.ok(app.vyzivaReceptu(r).pribl, "recept s nedopočítanou surovinou musí byť označený ako odhad");
});

// ─────────────────────────────────────────────────────────── B3: KS_DEF vs g_za_ks
console.log("\nB3 — jednotka listu/plátku/strúčika sa už neráta ako celý kus");
ok("„Šalát 4 list“ ≤ 60 g (predtým 1200 g = 4 hlávky)", () => {
  const gr = g("Hlávkový šalát", 4, "list");
  assert.ok(gr > 0 && gr <= 60, "šalát = " + gr + " g");
});
ok("tortilla-wrap-sunka-eidam: 463 → ≤ 425 kcal/porcia (dekl. 397)", () => {
  const k = app.kcalPorcia(app.receptById("tortilla-wrap-sunka-eidam"));
  assert.ok(k <= 425, "wrap = " + k + " kcal");
});
ok("„Šalátové listy 2 hrsť“ = 60 g, „Bazalka 24 lístok“ = 24 g", () => {
  assert.strictEqual(g("Šalátové listy", 2, "hrsť"), 60);
  assert.strictEqual(g("Bazalka", 24, "lístok"), 24);
});
ok("plátok má vlastnú hmotnosť: toastový chlieb 2 plátky = 56 g, nori 1 plátok = 3 g", () => {
  assert.strictEqual(g("Toastový chlieb", 2, "plátok"), 56);
  assert.strictEqual(g("Nori riasa", 1, "plátok"), 3);
});
ok("gramyNaJed je inverzná ku gramy (g, ml, ks, strúčik, plátok, list)", () => {
  const vzorky = [
    ["Cesnak", 8, "strúčik"], ["Hlávkový šalát", 4, "list"], ["Toastový chlieb", 2, "plátok"],
    ["Vajce", 3, "ks"], ["Ryža", 250, "g"], ["Mlieko", 200, "ml"], ["Cesnak", 1, "strúčik"],
  ];
  vzorky.forEach(([nazov, mn, jed]) => {
    const p = app.najdiPotravinu(nazov);
    const gr = app.gramy({ nazov, mnozstvo: mn, jednotka: jed }, p);
    assert.ok(gr > 0, nazov + " " + mn + " " + jed + " → 0 g");
    const spat = app.gramyNaJed(gr, jed, p);
    assert.ok(Math.abs(spat - mn) < 1e-9, nazov + ": " + mn + " " + jed + " → " + gr + " g → " + spat + " " + jed);
  });
});

// ─────────────────────────────────────────────────────────── B1: párovanie surovín
console.log("\nB1 — párovanie surovín na potraviny.json (skloňovanie a modifikátory)");
ok("„Kokosového mlieka 400 ml“ → 197 kcal/100 g a ~2,00 € (predtým 660 kcal / 8,00 €)", () => {
  const p = app.najdiPotravinu("Kokosového mlieka");
  assert.ok(p, "kokosové mlieko sa nenapárovalo");
  assert.ok(p.kcal <= 250, "kcal/100 g = " + p.kcal + " (kľúč " + p.kluc + ")");
  const gr = app.gramy({ nazov: "Kokosového mlieka", mnozstvo: 400, jednotka: "ml" }, p);
  const cena = gr / 100 * (p.cena100 || 0);
  assert.ok(cena > 0.5 && cena < 3.5, "400 ml stojí " + cena.toFixed(2) + " €");
});
ok("„Maslová tekvica 300 g“ ≤ 200 kcal (predtým 2151 — párovalo sa na maslo)", () => {
  const p = app.najdiPotravinu("Maslová tekvica");
  assert.ok(p, "maslová tekvica sa nenapárovala");
  assert.ok(3 * p.kcal <= 200, "300 g = " + 3 * p.kcal + " kcal (kľúč " + p.kluc + ")");
});
ok("„Olej na opekanie“ → olej, nie pekanový orech (o-PEKAN-ie)", () => {
  const p = app.najdiPotravinu("Olej na opekanie");
  assert.ok(p && /olej/.test(p.kluc), "napárované na " + (p && p.kluc));
});
ok("„Kokosová smotana“ nesmie mať alergén mlieko", () => {
  const p = app.najdiPotravinu("Kokosová smotana");
  assert.ok(p, "kokosová smotana sa nenapárovala");
  assert.ok(!(p.alergeny || []).includes("mlieko"), "kľúč " + p.kluc + " má alergény " + p.alergeny);
});
ok("„Vanilkový cukor 1 ks“ nestojí 3,20 €", () => {
  const p = app.najdiPotravinu("Vanilkový cukor");
  const gr = app.gramy({ nazov: "Vanilkový cukor", mnozstvo: 1, jednotka: "ks" }, p);
  const cena = gr / 100 * ((p && p.cena100) || 0);
  assert.ok(cena < 0.6, "1 ks vanilkového cukru = " + cena.toFixed(2) + " € (kľúč " + (p && p.kluc) + ")");
});
ok("chicken-adobo: kcal/porcia ≈ 520 (Kuracích stehien → kľúč „kuracie steh“)", () => {
  const k = app.kcalPorcia(app.receptById("chicken-adobo"));
  assert.ok(k >= 460 && k <= 570, "chicken-adobo = " + k + " kcal (dekl. 520)");
});
ok("„Kondenzované mlieko“ nie je obyčajné mlieko (64 kcal)", () => {
  const p = app.najdiPotravinu("Kondenzované mlieko");
  assert.ok(p && p.kcal > 200, "kondenzované mlieko = " + (p && p.kcal) + " kcal (kľúč " + (p && p.kluc) + ")");
});
ok("„Krabie mäso 200 g“ má cenu", () => {
  const p = app.najdiPotravinu("Krabie mäso");
  assert.ok(p && p.cena100 > 0, "krabie mäso: kľúč " + (p && p.kluc) + ", cena " + (p && p.cena100));
});
ok("nepotravina „Špáradlá“ zmizla z ingrediencií", () => {
  const zle = app.RECEPTY.filter(r => (r.ingrediencie || []).some(i => /špáradl|sparadl/i.test(i.nazov)));
  assert.strictEqual(zle.length, 0, "ešte v: " + zle.map(r => r.id).join(", "));
});
ok("22 predtým nenapárovaných surovín (Krupica, Ementál, Bucatini…) sa páruje", () => {
  ["Krupica", "Ementál", "Sušené hríby", "Lístkové cesto", "Lasagne pláty", "Bucatini",
   "Tzatziki", "Balzamikový krém", "Paradajkový pretlak"].forEach(n => {
    assert.ok(app.najdiPotravinu(n), n + " sa stále nepáruje");
  });
});

// ─────────────────────────────────────────────────────────── B5: chýbajúce ceny
console.log("\nB5 — ceny potravín");
ok("žiadna potravina nemá neznámu cenu (predtým 27 z 478)", () => {
  const bez = app.POTRAVINY.filter(p => p.cena100 == null).map(p => p.kluc);
  assert.strictEqual(bez.length, 0, "bez ceny: " + bez.join(", "));
});
ok("v týždennom pláne 2 stravníkov nie je položka nákupu s cenou 0,00 €", () => {
  const S = app.S;
  S.viewOd = "2026-08-17";
  S.hranice = [true, false, true, false, false, true, false];
  S.blokMode = true;
  S.profil.stravnici = [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }];
  S.plan = {}; S.planF = {};
  // deterministický plán: prvých 28 receptov s ingredienciami do slotov týždňa
  const zoz = app.RECEPTY.filter(r => (r.ingrediencie || []).some(i => i.mnozstvo != null)).slice(0, 28);
  let k = 0;
  for (let di = 0; di < 7; di++) {
    const iso = app.datumPre(di); S.plan[iso] = {};
    ["Raňajky", "Obed", "Večera", "Snack"].forEach(sl => { S.plan[iso][sl] = [zoz[k++ % zoz.length].id]; });
  }
  const rows = app.nakupItems().filter(r => r.gkey);
  const nezname = rows.filter(r => r.bezCeny);
  assert.strictEqual(nezname.length, 0, "neznáma cena: " + nezname.map(r => r.nazov).join(", "));
  // jediná legitímna nula je voda z vodovodu — všetko ostatné musí mať cenu
  const nulove = rows.filter(r => !(r.cena > 0) && !/vod[au]?$/i.test(r.nazov.trim()));
  assert.strictEqual(nulove.length, 0, "nulová cena: " + nulove.map(r => r.nazov).join(", "));
  S.plan = {}; S.planF = {};
});
ok("recept s nedopočítanou cenou to vie priznať (v.bezCeny)", () => {
  const r = { id: "_c", nazov: "C", porcie: 1, ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }] };
  assert.strictEqual(app.vyzivaReceptu(r).bezCeny, 0);
  const r2 = { id: "_c2", nazov: "C2", porcie: 1, ingrediencie: [{ nazov: "Neznáma vec xyz", mnozstvo: 100, jednotka: "g" }] };
  assert.ok(app.vyzivaReceptu(r2).bezCeny > 0, "nenapárovaná surovina sa má rátať ako chýbajúca cena");
});

// ─────────────────────────────────────────────────────────── B6: vláknina a sodík
console.log("\nB6 — vláknina a sodík");
ok("sójová omáčka prispieva ~5500 mg Na/100 g (predtým 0)", () => {
  const p = app.najdiPotravinu("Sójová omáčka");
  assert.ok(p && p.sodik > 4000, "sójová omáčka: " + (p && p.sodik) + " mg Na/100 g");
});
ok("týždeň so sójovou omáčkou ukáže sodík > 2000 mg/deň (predtým 1274)", () => {
  const S = app.S;
  S.viewOd = "2026-08-17";
  S.plan = {}; S.planF = {};
  const sojove = app.RECEPTY.filter(r => (r.ingrediencie || []).some(i => /sójov[aá] omáčk/i.test(i.nazov)));
  assert.ok(sojove.length >= 7, "málo receptov so sójovou omáčkou: " + sojove.length);
  let k = 0, sodikDni = [];
  for (let di = 0; di < 7; di++) {
    const iso = app.datumPre(di); S.plan[iso] = {};
    ["Raňajky", "Obed", "Večera", "Snack"].forEach(sl => { S.plan[iso][sl] = [sojove[k++ % sojove.length].id]; });
    let na = 0;
    app.slotyDna(di).forEach(sl => app.slotIds(di, sl).forEach(cid => { na += app.vyzivaReceptu(app.komponent(cid)).na || 0; }));
    sodikDni.push(na);
  }
  const priemer = sodikDni.reduce((a, x) => a + x, 0) / 7;
  assert.ok(priemer > 2000, "sodík = " + Math.round(priemer) + " mg/deň");
  S.plan = {}; S.planF = {};
});
ok("vyzivaReceptu hlási pokrytie hmoty údajmi (v.hmota / v.hmotaNa)", () => {
  const r = { id: "_p", nazov: "P", porcie: 1, ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }] };
  const v = app.vyzivaReceptu(r);
  assert.ok(v.hmota > 0, "hmota sa neráta");
  assert.ok(v.hmotaNa / v.hmota > 0.99, "ryža má známy sodík, pokrytie má byť 100 %");
  const r2 = { id: "_p2", nazov: "P2", porcie: 1,
    ingrediencie: [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }, { nazov: "Zázračná zmes", mnozstvo: 100, jednotka: "g" }] };
  const v2 = app.vyzivaReceptu(r2);
  assert.ok(v2.hmotaNa / v2.hmota < 1, "nenapárovaná surovina má znížiť pokrytie");
});

console.log("\nOK — " + bezov + " kontrol prešlo.");
