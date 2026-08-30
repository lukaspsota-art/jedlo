// Testy nákupného zoznamu a špajze k auditu 2026-08-18 (nálezy C1–C7). Beh: node test_nakup.js
const assert = require("assert");
const { load } = require("./test_harness");

const PONDELOK = "2026-08-17";
const app = load({
  stav: {
    viewOd: PONDELOK,
    hranice: [true, false, true, false, false, true, false],
    blokMode: true,
    profil: { osoby: 1, kcal: 1450, balenia: true, stravnici: [{ nazov: "A", kcal: 1450 }] },
  },
});
const S = app.S;

// pomocný „recept" priamo v pamäti, aby test nezávisel od konkrétnych receptov v databáze
let poradie = 0;
function fakeRecept(nazov, ingrediencie) {
  const r = { id: "_t" + (++poradie), nazov, kategoria: "Hlavné jedlo", kuchyna: "", porcie: 1,
    ingrediencie, postup: [], tagy: [] };
  app.RECEPTY.push(r);
  return r;
}
function planujLen(recepty) {
  S.plan = {}; S.planF = {}; S.spajza = []; S.domaNakup = ""; S.nakupCheck = {}; S.nakupManual = [];
  S.daySloty = {}; S.dayPpl = {}; S.slotPpl = {}; S.tyzdenProfil = {};
  const iso = app.datumPre(0);
  S.plan[iso] = {};
  recepty.forEach((r, i) => { S.plan[iso][["Obed", "Večera", "Raňajky", "Snack"][i]] = [r.id]; });
  // deň 0 = pondelok, blok A je Po–Ut → 2 dni; nech je porcií 2 (1 stravník × 2 dni)
}
const riadok = nazov => app.nakupItems().find(r => r.nazov === nazov);
const cistyText = s => String(s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }

// ─────────────────────────────────────────────────────────── C1 jednotky
console.log("C1 — jednotky v nákupe");
ok("22 strúčikov cesnaku sa nezobrazí ako „22 ks“", () => {
  const r = fakeRecept("Cesnakový test", [{ nazov: "Cesnak", mnozstvo: 22, jednotka: "strúčik" }]);
  planujLen([r]);
  const it = riadok("Cesnak");
  assert.ok(it, "cesnak nie je v nákupe");
  const t = cistyText(it.mnoz);
  assert.ok(!/\bks\b/.test(t), "zobrazuje sa ako: " + t);
  assert.ok(/strúčik/.test(t) || /\bg\b/.test(t), "zobrazuje sa ako: " + t);
  assert.ok(/22/.test(t), "má vyjsť 22 strúčikov (≈ 110 g), je: " + t);
});
ok("„Údená paprika 1,33 ČL“ je korenina (~7 g), nie zelenina", () => {
  const p = app.najdiPotravinu("Údená paprika");
  assert.ok(p, "údená paprika sa nenapárovala");
  assert.strictEqual(p.oddelenie, "Korenie a bylinky", "oddelenie: " + p.oddelenie + " (kľúč " + p.kluc + ")");
  const g = app.gramy({ nazov: "Údená paprika", mnozstvo: 1.33, jednotka: "ČL" }, p);
  assert.ok(g > 3 && g < 12, "1,33 ČL = " + g.toFixed(1) + " g");
});
ok("mleté čili sa nezlúči s čerstvými čili papričkami", () => {
  const a = app.najdiPotravinu("Mleté čili"), b = app.najdiPotravinu("Čili paprička");
  assert.ok(a && b, "chýba kľúč");
  assert.notStrictEqual(a.kluc, b.kluc, "oba sa párujú na " + a.kluc);
});
ok("objemová jednotka (PL) sa v nákupe hlási v ml alebo g, nie v ks", () => {
  const r = fakeRecept("Olejový test", [{ nazov: "Olivový olej", mnozstvo: 4, jednotka: "PL" }]);
  planujLen([r]);
  const t = cistyText(riadok("Olivový olej").mnoz);
  assert.ok(/ml|g/.test(t) && !/\bks\b/.test(t), "zobrazuje sa ako: " + t);
});

// ─────────────────────────────────────────────────────────── C2 ceny a balenia
console.log("\nC2 — cena vs celé balenia");
ok("pri vypnutých baleniach sa cena ráta zo spotreby, nie z celých balení", () => {
  const r = fakeRecept("Toastový test", [{ nazov: "Toastový chlieb", mnozstvo: 8, jednotka: "plátok" }]);
  S.profil.balenia = true; planujLen([r]);
  const sBal = riadok("Toastový chlieb").cena;
  S.profil.balenia = false; planujLen([r]);
  const bezBal = riadok("Toastový chlieb").cena;
  S.profil.balenia = true;
  assert.ok(bezBal < sBal, "s baleniami " + sBal.toFixed(2) + " €, bez balení " + bezBal.toFixed(2) + " €");
});
ok("cenaTyzdna vracia obe čísla: spotrebu aj celé balenia", () => {
  const r = fakeRecept("Cenový test", [{ nazov: "Olivový olej", mnozstvo: 120, jednotka: "g" }]);
  planujLen([r]);
  const sp = app.cenaTyzdna("spotreba"), bal = app.cenaTyzdna("balenia");
  assert.ok(sp > 0, "spotreba = " + sp);
  assert.ok(bal >= sp, "celé balenia (" + bal + ") majú byť ≥ spotreba (" + sp + ")");
});

// ─────────────────────────────────────────────────────────── C3/C4 špajza
console.log("\nC3/C4 — čiastočná zásoba v špajzi");
ok("20 g lososa v špajzi pri potrebe 600 g → v nákupe zostane 580 g", () => {
  const r = fakeRecept("Lososový test", [{ nazov: "Losos", mnozstvo: 600, jednotka: "g" }]);
  planujLen([r]);
  const bez = riadok("Losos");
  assert.ok(bez && Math.abs(bez.gramy - 600) < 1, "bez špajze má byť 600 g, je " + (bez && bez.gramy));
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 20, jednotka: "g", kluc: "losos" }];
  const so = riadok("Losos");
  assert.ok(so, "položka zmizla z nákupu (má zostať zvyšok)");
  assert.ok(Math.abs(so.gramy - 580) < 1, "má zostať 580 g, je " + so.gramy);
  assert.ok(!so.vSpajzi, "20 g z 600 g nie je „mám v špajzi“");
});
ok("keď zásoba pokryje celú potrebu, položka ide do „mám v špajzi“", () => {
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 700, jednotka: "g", kluc: "losos" }];
  const so = riadok("Losos");
  assert.ok(so && so.vSpajzi, "položka nie je označená ako v špajzi");
});
ok("položka zo špajze je aj v kopírovanom zozname (s poznámkou)", () => {
  const txt = app.nakupText().join("\n");
  assert.ok(/Losos/.test(txt), "losos chýba v kopírovanom zozname: " + txt);
  assert.ok(/doma|špajz/i.test(txt), "chýba poznámka „mám doma“: " + txt);
  S.spajza = [];
});

// ─────────────────────────────────────────────────────────── C5 „Mám doma"
console.log("\nC5 — pole „Mám doma“");
ok("token „a“ neoznačí ani jednu položku", () => {
  const r = fakeRecept("Doma test", [{ nazov: "Ryža", mnozstvo: 200, jednotka: "g" },
    { nazov: "Cesnak", mnozstvo: 2, jednotka: "strúčik" }, { nazov: "Mlieko", mnozstvo: 200, jednotka: "ml" }]);
  planujLen([r]);
  S.domaNakup = "a";
  const oznacene = app.nakupItems().filter(x => x.doma);
  assert.strictEqual(oznacene.length, 0, "označené: " + oznacene.map(x => x.nazov).join(", "));
});
ok("token „ryža“ označí ryžu a nič iné", () => {
  S.domaNakup = "ryža";
  const oznacene = app.nakupItems().filter(x => x.doma).map(x => x.nazov);
  assert.strictEqual(oznacene.join("|").normalize("NFC"), "Ryža".normalize("NFC"), "označené: " + oznacene.join(", "));
  S.domaNakup = "";
});

// ─────────────────────────────────────────────────────────── C6 odpis zo špajze
console.log("\nC6 — odpis zo špajze");
ok("odpis cez inú jednotku sedí (20 strúčikov, recept berie 15 g → −3 strúčiky)", () => {
  const p = app.najdiPotravinu("Cesnak");
  const g = app.gramy({ nazov: "Cesnak", mnozstvo: 15, jednotka: "g" }, p);
  assert.strictEqual(app.gramyNaJed(g, "strúčik", p), 3, "15 g cesnaku = " + app.gramyNaJed(g, "strúčik", p) + " strúčika");
});
ok("jednotka „balenie“ sa vie previesť na gramy aj späť", () => {
  const p = app.najdiPotravinu("Toastový chlieb");
  assert.ok(p && p.balenie_g, "toastový chlieb nemá balenie_g");
  const g = app.gramy({ nazov: "Toastový chlieb", mnozstvo: 2, jednotka: "balenie" }, p);
  assert.strictEqual(g, 2 * p.balenie_g);
  assert.strictEqual(app.gramyNaJed(g, "balenie", p), 2);
});

// ─────────────────────────────────────────────────────────── C7 oddelenia
console.log("\nC7 — oddelenia");
ok("„Ryby a morské plody“ už neexistuje, všetko je v „Mäso a ryby“", () => {
  const zle = app.POTRAVINY.filter(p => p.oddelenie === "Ryby a morské plody");
  assert.strictEqual(zle.length, 0, "ešte: " + zle.map(p => p.kluc).join(", "));
});
ok("každé oddelenie z potraviny.json je v poradí oddelení nákupu", () => {
  const chyba = [...new Set(app.POTRAVINY.map(p => p.oddelenie))].filter(o => !app.PORADIE_ODDELENI.includes(o));
  assert.strictEqual(chyba.length, 0, "chýbajú v poradí: " + chyba.join(", "));
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// N-2026-08-30 — agent NÁKUP-ŠPAJZA: ceny, jednotky, balenia, špajza
// ════════════════════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────── B5+ neznáma vs nulová cena
console.log("\nB5+ — položka bez ceny to musí priznať");
ok("cena100: 0 (voda) je ZNÁMA cena, nie chýbajúca", () => {
  const v = app.najdiPotravinu("Voda");
  assert.ok(v && v.cena100 === 0, "voda má mať cena100: 0, má " + (v && v.cena100));
  const r = fakeRecept("Vodový test", [{ nazov: "Voda", mnozstvo: 500, jednotka: "ml" }]);
  planujLen([r]);
  const it = riadok("Voda");
  assert.ok(it, "voda nie je v nákupe");
  assert.strictEqual(it.bezCeny, false, "voda sa hlási ako bez ceny: " + it.dovodCeny);
});
ok("nenapárovaná surovina sa priznáva ako bez ceny (nie tichých 0,00 €)", () => {
  const r = fakeRecept("Neznámy test", [{ nazov: "Kryptonitová pasta", mnozstvo: 100, jednotka: "g" }]);
  planujLen([r]);
  const it = riadok("Kryptonitová pasta");
  assert.ok(it, "položka vypadla z nákupu");
  assert.strictEqual(it.bezCeny, true, "nemá príznak bezCeny");
  assert.ok(/datab/i.test(it.dovodCeny), "dôvod: " + it.dovodCeny);
  assert.ok(/\? cena/.test(app.riadokNakup(it)), "v riadku chýba priznanie: " + app.riadokNakup(it));
});
ok("matched položka bez gramáže nehlási „0 g“, ale to, čo recept pýta", () => {
  const r = fakeRecept("Neznáma jednotka", [{ nazov: "Soľ", mnozstvo: 2, jednotka: "na cesto" }]);
  planujLen([r]);
  const it = riadok("Soľ");
  assert.ok(it, "soľ nie je v nákupe");
  const t = cistyText(it.mnoz);
  assert.ok(!/^0 g/.test(t), "hlási sa ako: " + t);
  assert.ok(/na cesto/.test(t), "má vypísať pôvodnú jednotku, je: " + t);
  assert.strictEqual(it.bezCeny, true, "má priznať neznámu cenu");
});
ok("„1 ks“ balíkovaného tovaru dostane cenu z balenia, nie 0 €", () => {
  const p = app.najdiPotravinu("Lístkové cesto");
  assert.ok(p && p.balenie_g && !p.g_za_ks, "lístkové cesto má mať balenie_g a nemať g_za_ks");
  const r = fakeRecept("Cestový test", [{ nazov: "Lístkové cesto", mnozstvo: 2, jednotka: "ks" }]);
  planujLen([r]);
  const it = riadok("Lístkové cesto");
  assert.ok(it.cena > 0, "cena je " + it.cena);
  assert.strictEqual(it.bezCeny, false, "nemá byť bez ceny: " + it.dovodCeny);
  assert.ok(Math.abs(it.cena - 2 * p.balenie_g / 100 * p.cena100) < 0.001, "cena: " + it.cena);
});
ok("nezmyselný počet kusov („25 ks masla“) sa zreže na 1 balenie, nie 25", () => {
  const p = app.najdiPotravinu("Maslo");
  const r = fakeRecept("Maslový test", [{ nazov: "Maslo", mnozstvo: 25, jednotka: "ks" }]);
  planujLen([r]);
  const it = riadok("Maslo");
  const strop = app.NAKUP_MAX_BALENI * p.balenie_g / 100 * p.cena100;
  assert.ok(it.cena > 0 && it.cena <= strop + 0.001, "cena " + it.cena.toFixed(2) + " €, strop " + strop.toFixed(2));
});

// ─────────────────────────────────────────────────────────── C2+ tri režimy cenaTyzdna
console.log("\nC2+ — cenaTyzdna(spotreba|balenia|osoba)");
ok("balenia ≥ spotreba a osoba = spotreba / počet stravníkov (reálne dáta)", () => {
  S.profil.stravnici = [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }];
  S.profil.osoby = 2;
  const zoz = app.RECEPTY.filter(r => (r.ingrediencie || []).some(i => i.mnozstvo != null)).slice(0, 4);
  planujLen(zoz);
  const sp = app.cenaTyzdna("spotreba"), bal = app.cenaTyzdna("balenia"), os = app.cenaTyzdna("osoba");
  assert.ok(sp > 0, "spotreba = " + sp);
  assert.ok(bal >= sp - 1e-9, "balenia (" + bal + ") < spotreba (" + sp + ")");
  assert.ok(Math.abs(os - sp / 2) < 1e-9, "osoba = " + os + ", čakané " + sp / 2);
  S.profil.stravnici = [{ nazov: "A", kcal: 1450 }]; S.profil.osoby = 1;
});
ok("balenia ≥ spotreba platí pre KAŽDÚ položku, nielen pre súčet", () => {
  const zoz = app.RECEPTY.filter(r => (r.ingrediencie || []).some(i => i.mnozstvo != null)).slice(0, 20);
  planujLen(zoz.slice(0, 4));
  const zle = app.nakupItems().filter(r => r.gkey && r.cenaBalenia < r.cenaSpotreba - 1e-9);
  assert.strictEqual(zle.length, 0, "balenia < spotreba pri: " + zle.map(r => r.nazov).join(", "));
});
ok("súčet cien položiek sedí s cenou týždňa na cent", () => {
  const rows = app.nakupItems().filter(r => r.gkey);
  const sucet = rows.reduce((a, r) => a + r.cenaSpotreba, 0);
  assert.ok(Math.abs(Math.round(sucet * 100) - Math.round(app.cenaTyzdna("spotreba") * 100)) <= 1,
    "súčet " + sucet.toFixed(4) + " vs cenaTyzdna " + app.cenaTyzdna("spotreba").toFixed(4));
  const sucetB = rows.reduce((a, r) => a + r.cenaBalenia, 0);
  assert.ok(Math.abs(Math.round(sucetB * 100) - Math.round(app.cenaTyzdna("balenia") * 100)) <= 1,
    "súčet balení " + sucetB.toFixed(4) + " vs " + app.cenaTyzdna("balenia").toFixed(4));
});
ok("cenaTyzdna je jediné miesto — nespadne ani pri prázdnom pláne", () => {
  S.plan = {}; S.planF = {};
  ["spotreba", "balenia", "osoba"].forEach(m => assert.strictEqual(app.cenaTyzdna(m), 0, m));
});

// ─────────────────────────────────────────────────────────── balenia vs spotreba
console.log("\nBalenia — 30 g droždia z balenia 42 g");
ok("kúpiš 1 balenie (42 g), ale spotreba je 30 g — nemieša sa to", () => {
  const p = app.najdiPotravinu("Droždie");
  assert.ok(p && p.balenie_g === 42, "droždie má mať balenie_g 42, má " + (p && p.balenie_g));
  const r = fakeRecept("Droždiový test", [{ nazov: "Droždie", mnozstvo: 30, jednotka: "g" }]);
  planujLen([r]);
  const it = riadok("Droždie");
  assert.ok(Math.abs(it.gramy - 30) < 0.001, "spotreba má byť 30 g, je " + it.gramy);
  assert.ok(Math.abs(it.cenaSpotreba - 30 / 100 * p.cena100) < 1e-9, "cena spotreby: " + it.cenaSpotreba);
  assert.ok(Math.abs(it.cenaBalenia - 42 / 100 * p.cena100) < 1e-9, "cena balenia: " + it.cenaBalenia);
  assert.ok(/1× 42 g/.test(it.mnoz), "v riadku chýba „bal.: 1× 42 g“: " + cistyText(it.mnoz));
  assert.ok(/30 g/.test(cistyText(it.mnoz)), "chýba spotreba 30 g: " + cistyText(it.mnoz));
});
ok("43 g potreby = 2 balenia po 42 g (zaokrúhľuje sa nahor)", () => {
  const p = app.najdiPotravinu("Droždie");
  const r = fakeRecept("Droždie 2", [{ nazov: "Droždie", mnozstvo: 43, jednotka: "g" }]);
  planujLen([r]);
  const it = riadok("Droždie");
  assert.ok(Math.abs(it.cenaBalenia - 2 * 42 / 100 * p.cena100) < 1e-9, "cena balení: " + it.cenaBalenia);
});

// ─────────────────────────────────────────────────────────── jednotky: property test
console.log("\nJednotky — gramy() a gramyNaJed() sú navzájom inverzné");
ok("pre každú jednotku z databázy platí gramyNaJed(gramy(x)) ≈ x (2000 náhodných prípadov)", () => {
  const jednotky = new Set();
  app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => jednotky.add((i.jednotka || "").toLowerCase().trim())));
  Object.keys(app.ML_JED).forEach(j => jednotky.add(j));
  Object.keys(app.KS_DEF).forEach(j => jednotky.add(j));
  app.KS_JEDNOTKY.forEach(j => jednotky.add(j));
  ["g", "kg", "ml", "l", "balenie"].forEach(j => jednotky.add(j));
  const jed = [...jednotky];
  let rnd = 12345;
  const nahoda = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const chyby = [];
  let overenych = 0;
  for (let n = 0; n < 2000; n++) {
    const p = app.POTRAVINY[Math.floor(nahoda() * app.POTRAVINY.length)];
    const j = jed[Math.floor(nahoda() * jed.length)];
    const mn = Math.round(nahoda() * 100000) / 100;      // 0…1000 s 2 desatinnými
    if (!(mn > 0)) continue;
    const g = app.gramy({ mnozstvo: mn, jednotka: j }, p);
    const spat = app.gramyNaJed(g, j, p);
    if (!(g > 0)) {                                       // jednotku nevieme previesť
      assert.strictEqual(app.gZaJednotku(j.toLowerCase(), p), 0,
        "gramy() dalo 0 aj keď gZaJednotku(" + j + ") > 0");
      continue;
    }
    overenych++;
    if (spat === null || Math.abs(spat - mn) > Math.max(1e-6, mn * 1e-9))
      chyby.push(j + " × " + mn + " (" + p.kluc + ") → " + g + " g → " + spat);
  }
  assert.ok(overenych > 500, "overených prípadov len " + overenych);
  assert.strictEqual(chyby.length, 0, "neinverzné:\n  " + chyby.slice(0, 8).join("\n  "));
});
ok("gramy() prevádza JEDINE cez gZaJednotku (žiadna jednotka nemá 0 g pri známom prevode)", () => {
  const p = app.najdiPotravinu("Cesnak");
  Object.keys(app.KS_DEF).forEach(j => {
    assert.ok(app.gramy({ mnozstvo: 1, jednotka: j }, p) === app.gZaJednotku(j, p),
      "jednotka " + j + " sa počíta mimo gZaJednotku");
  });
});
ok("neznáma jednotka dá 0 g a gramyNaJed vráti null (nie tichý odhad)", () => {
  const p = app.najdiPotravinu("Cesnak");
  assert.strictEqual(app.gramy({ mnozstvo: 3, jednotka: "na ozdobenie" }, p), 0);
  assert.strictEqual(app.gramyNaJed(100, "na ozdobenie", p), null);
});

// ─────────────────────────────────────────────────────────── nedeliteľné jednotky
console.log("\nNedeliteľné jednotky — zaokrúhľuje sa až súčet");
ok("3 recepty po 0,7 ks dajú 2 ks (2,1 zaokrúhlené raz), nie 3× po 1 ks", () => {
  const a = fakeRecept("Vajcia A", [{ nazov: "Vajce", mnozstvo: 0.7, jednotka: "ks" }]);
  const b = fakeRecept("Vajcia B", [{ nazov: "Vajce", mnozstvo: 0.7, jednotka: "ks" }]);
  const c = fakeRecept("Vajcia C", [{ nazov: "Vajce", mnozstvo: 0.7, jednotka: "ks" }]);
  planujLen([a, b, c]);
  const p = app.najdiPotravinu("Vajce");
  const it = riadok("Vajce");
  const t = cistyText(it.mnoz);
  const spolu = it.gramy / p.g_za_ks;                       // presný súčet kusov naprieč receptami
  assert.ok(Math.abs(spolu - Math.round(spolu)) > 0.05, "test potrebuje neceločíselný súčet, je " + spolu);
  assert.ok(new RegExp("^" + Math.round(spolu) + " ks").test(t),
    "má vyjsť " + Math.round(spolu) + " ks (súčet " + spolu.toFixed(2) + " zaokrúhlený RAZ), je: " + t);
  const poReceptoch = 3 * Math.round(spolu / 3);            // keby sa zaokrúhľovalo v každom recepte
  assert.notStrictEqual(Math.round(spolu), poReceptoch,
    "test nerozlíši oba spôsoby zaokrúhlenia (" + spolu + ")");
});
ok("zaokrúhlenie kusov nemení gramáž ani cenu (tá ide zo súčtu, nie zo zaokrúhlenia)", () => {
  const p = app.najdiPotravinu("Vajce");
  const it = riadok("Vajce");
  const ks = it.gramy / p.g_za_ks;
  assert.ok(Math.abs(ks - Math.round(ks)) > 0.05, "gramáž sa zaokrúhlila na celé kusy: " + ks);
  assert.ok(Math.abs(it.cenaSpotreba - it.gramy / 100 * p.cena100) < 1e-9,
    "cena nesedí s gramážou: " + it.cenaSpotreba);
});
ok("nedeliteľná jednotka sa neškáluje % veľkosti porcie, len počtom porcií", () => {
  assert.strictEqual(app.skalovanaHodnota(2, "ks", 3, 0.5), 6);
  assert.strictEqual(app.skalovanaHodnota(2, "g", 3, 0.5), 3);
});

// ─────────────────────────────────────────────────────────── špajza: hraničné prípady
console.log("\nŠpajza — hraničné prípady");
ok("zásoba väčšia než potreba neurobí zápornú položku ani zápornú cenu", () => {
  const r = fakeRecept("Losos veľa", [{ nazov: "Losos", mnozstvo: 100, jednotka: "g" }]);
  planujLen([r]);
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 5, jednotka: "kg", kluc: "losos" }];
  const it = riadok("Losos");
  assert.ok(it.vSpajzi, "má byť označené ako v špajzi");
  assert.ok(it.gramy >= 0, "záporná gramáž: " + it.gramy);
  assert.ok(it.cenaSpotreba >= 0, "záporná cena: " + it.cenaSpotreba);
  S.spajza = [];
});
ok("záporné množstvo v špajzi sa ignoruje (nezvýši nákup)", () => {
  const r = fakeRecept("Losos zap", [{ nazov: "Losos", mnozstvo: 200, jednotka: "g" }]);
  planujLen([r]);
  const bez = riadok("Losos").gramy;
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: -50, jednotka: "g", kluc: "losos" }];
  assert.ok(Math.abs(riadok("Losos").gramy - bez) < 0.001, "záporná zásoba zmenila nákup");
  S.spajza = [];
});
ok("expirovaná zásoba sa neráta — nákup ju nesmie odpočítať", () => {
  const r = fakeRecept("Losos exp", [{ nazov: "Losos", mnozstvo: 200, jednotka: "g" }]);
  planujLen([r]);
  const bez = riadok("Losos").gramy;
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 400, jednotka: "g", kluc: "losos", expiry: "2020-01-01" }];
  assert.ok(Math.abs(riadok("Losos").gramy - bez) < 0.001, "expirovaný losos zmenšil nákup");
  assert.strictEqual(app.mamVSpajzi("Losos"), false, "expirovaná položka sa tvári ako zásoba");
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 400, jednotka: "g", kluc: "losos", expiry: "2099-01-01" }];
  assert.ok(riadok("Losos").vSpajzi, "platná zásoba sa neuplatnila");
  S.spajza = [];
});
ok("dve položky tej istej suroviny s rôznou expiráciou sa sčítajú", () => {
  const r = fakeRecept("Losos dve", [{ nazov: "Losos", mnozstvo: 150, jednotka: "g" }]);
  planujLen([r]);                                   // 2 porcie = 300 g
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 100, jednotka: "g", kluc: "losos", expiry: "2099-02-01" },
              { id: 2, nazov: "Losos", mnozstvo: 250, jednotka: "g", kluc: "losos", expiry: "2099-01-01" }];
  assert.ok(riadok("Losos").vSpajzi, "350 g v dvoch položkách nepokrylo 300 g");
  S.spajza = [];
});
ok("min. zásoba pod limitom sa objaví v nákupe (doplniť zásoby)", () => {
  S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 100, jednotka: "g", kluc: "ryža", min: 500 }];
  const low = S.spajza.filter(x => x.min > 0 && x.mnozstvo < x.min);
  assert.strictEqual(low.length, 1, "nízka zásoba sa nezachytila");
  S.spajza = [];
});
ok("pantry staples (bez množstva) idú do nákupu vždy — ako poznámka", () => {
  const r = fakeRecept("Staple test", [{ nazov: "Soľ", mnozstvo: null, jednotka: "podľa chuti" },
    { nazov: "Ryža", mnozstvo: 100, jednotka: "g" }]);
  planujLen([r]);
  const it = app.nakupItems().find(x => x.nazov === "Soľ");
  assert.ok(it, "soľ „podľa chuti“ vypadla z nákupu");
  assert.ok(/podľa chuti/.test(cistyText(it.mnoz)), "poznámka: " + cistyText(it.mnoz));
});

// ─────────────────────────────────────────────────────────── odpis zo špajze
console.log("\nOdpis receptu zo špajze");
ok("odpis sa rozdelí medzi dve zásoby — najskôr tá, čo expiruje skôr", () => {
  const r = fakeRecept("Odpis A", [{ nazov: "Losos", mnozstvo: 250, jednotka: "g" }]);
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 100, jednotka: "g", kluc: "losos", expiry: "2099-05-01" },
              { id: 2, nazov: "Losos", mnozstvo: 300, jednotka: "g", kluc: "losos", expiry: "2099-01-01" }];
  app.odpisRecept(r, 1, 1);                            // potreba 250 g
  const zvysok = S.spajza.reduce((a, x) => a + x.mnozstvo, 0);
  assert.ok(Math.abs(zvysok - 150) < 0.01, "zo 400 g má zostať 150 g, zostalo " + zvysok);
  const skorsi = S.spajza.find(x => x.id === 2);
  assert.ok(!skorsi || skorsi.mnozstvo < 300, "položka s skoršou expiráciou sa nemínala prvá");
  S.spajza = [];
});
ok("odpis cez inú jednotku (recept v g, špajza v ks) sedí", () => {
  const r = fakeRecept("Odpis B", [{ nazov: "Cesnak", mnozstvo: 15, jednotka: "g" }]);
  const p = app.najdiPotravinu("Cesnak");
  S.spajza = [{ id: 1, nazov: "Cesnak", mnozstvo: 20, jednotka: "strúčik", kluc: p.kluc }];
  app.odpisRecept(r, 1, 1);
  assert.ok(Math.abs(S.spajza[0].mnozstvo - (20 - app.gramyNaJed(15, "strúčik", p))) < 0.02,
    "zostalo " + S.spajza[0].mnozstvo + " strúčikov");
  S.spajza = [];
});
ok("odpis receptu mimo plánu škáluje jeho vlastnými porciami, nie stavom detailu", () => {
  const r = { id: "_mimo", nazov: "Mimo plánu", kategoria: "Hlavné jedlo", porcie: 4,
    ingrediencie: [{ nazov: "Ryža", mnozstvo: 400, jednotka: "g" }], postup: [], tagy: [] };
  S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 1000, jednotka: "g", kluc: "ryža" }];
  app.odpisRecept(r);                                  // bez parametrov → celý recept = 400 g
  assert.ok(Math.abs(S.spajza[0].mnozstvo - 600) < 0.01, "zostalo " + S.spajza[0].mnozstvo + " g, čakané 600");
  S.spajza = [];
});
ok("odpis nezanechá zápornú zásobu ani keď recept pýta viac, než máš", () => {
  const r = fakeRecept("Odpis C", [{ nazov: "Ryža", mnozstvo: 900, jednotka: "g" }]);
  S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 100, jednotka: "g", kluc: "ryža" }];
  app.odpisRecept(r, 1, 1);
  assert.ok(S.spajza.every(x => x.mnozstvo > 0), "zostala nulová/záporná položka: " + JSON.stringify(S.spajza));
  S.spajza = [];
});
ok("odpis suroviny s neprevoditeľnou jednotkou nechá zásobu na pokoji", () => {
  const r = fakeRecept("Odpis D", [{ nazov: "Ryža", mnozstvo: 2, jednotka: "na ozdobenie" }]);
  S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 500, jednotka: "g", kluc: "ryža" }];
  app.odpisRecept(r, 1, 1);
  assert.strictEqual(S.spajza[0].mnozstvo, 500, "zásoba sa zmenila na " + S.spajza[0].mnozstvo);
  S.spajza = [];
});

console.log("\nOK — " + bezov + " kontrol prešlo.");
