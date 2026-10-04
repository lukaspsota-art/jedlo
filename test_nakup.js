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
  // v31: ceny appka neukazuje — príznak bezCeny ostáva pre dáta, do riadku nákupu nepatrí
  assert.ok(!/cena|€/.test(app.riadokNakup(it)), "v riadku nákupu je cena: " + app.riadokNakup(it));
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
ok("3 recepty po 0,7 ks: kusy sa zaokrúhlia NAHOR a raz, na súčte (nie po receptoch)", () => {
  const a = fakeRecept("Vajcia A", [{ nazov: "Vajce", mnozstvo: 0.7, jednotka: "ks" }]);
  const b = fakeRecept("Vajcia B", [{ nazov: "Vajce", mnozstvo: 0.7, jednotka: "ks" }]);
  const c = fakeRecept("Vajcia C", [{ nazov: "Vajce", mnozstvo: 0.7, jednotka: "ks" }]);
  planujLen([a, b, c]);
  const p = app.najdiPotravinu("Vajce");
  const it = riadok("Vajce");
  const t = cistyText(it.mnoz);
  const spolu = it.gramy / p.g_za_ks;                       // presný súčet kusov naprieč receptami
  assert.ok(Math.abs(spolu - Math.round(spolu)) > 0.05, "test potrebuje neceločíselný súčet, je " + spolu);
  // audit 30. 9.: kusy sa kupujú nahor (1,32 ks čakanky = 2 ks, nie 1) — v riadku je to „treba N ks"
  assert.ok(new RegExp("(^|treba )" + Math.ceil(spolu) + " ks").test(t),
    "má vyjsť " + Math.ceil(spolu) + " ks (súčet " + spolu.toFixed(2) + " zaokrúhlený nahor RAZ), je: " + t);
  const poReceptoch = 3 * Math.ceil(spolu / 3);             // keby sa zaokrúhľovalo v každom recepte
  assert.notStrictEqual(Math.ceil(spolu), poReceptoch,
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

// ════════════════════════════════════════════════════════════════════════════════════════════
// N-2026-08-31 — agent NÁKUP-V-OBCHODE: odškrtávanie jednou rukou, trasa obchodom, šum v zozname
// ════════════════════════════════════════════════════════════════════════════════════════════

console.log("\nP1 — riadok sa odškrtne ťuknutím kamkoľvek");
ok("riadok nemá onclick ani preventDefault, ktorý by rušil aktiváciu <label>", () => {
  const r = fakeRecept("Riadkový test", [{ nazov: "Ryža", mnozstvo: 200, jednotka: "g" }]);
  planujLen([r]);
  const html = app.riadokNakup(riadok("Ryža"));
  assert.ok(!/preventDefault/.test(html), "riadok stále volá preventDefault: " + html);
  const label = html.match(/<label[^>]*>/)[0];
  assert.ok(!/onclick/.test(label), "<label> má onclick, ktorý prebije odškrtnutie: " + label);
  assert.ok(/<input type="checkbox"[^>]*onchange="checkNakup\(/.test(html), "chýba checkbox s checkNakup: " + html);
});
ok("„v ktorom recepte“ má vlastné tlačidlo mimo <label>", () => {
  const html = app.riadokNakup(riadok("Ryža"));
  assert.ok(/<button class="nak-i"[^>]*onclick="surovinaInfo\(/.test(html), "chýba tlačidlo ⓘ: " + html);
  const predLabelom = html.split("</label>")[1] || "";
  assert.ok(/nak-i/.test(predLabelom), "ⓘ je vnútri <label> — klik naň by odškrtol položku");
});
ok("ručná položka má tiež jeden veľký cieľ a mazanie ako tlačidlo", () => {
  const html = app.riadokNakup({ man: true, id: "m1", nazov: "Toaletný papier", mnoz: "2 ks", ck: false });
  assert.ok(/<label[^>]*><input type="checkbox"/.test(html), "ručný riadok nemá checkbox v labeli: " + html);
  assert.ok(/<button class="nak-i warn"[^>]*zmazManual/.test(html), "mazanie nie je tlačidlo: " + html);
});

console.log("\nTrasa obchodom — poradie oddelení sa dá prestaviť");
// presety čítame cez poradieOddeleni() (S.obchod), nech test nezávisí od exportu konštánt
function poradiePre(kluc) { const bolo = S.obchod; S.obchod = kluc; const p = app.poradieOddeleni(); S.obchod = bolo; return p; }
ok("každý preset obsahuje VŠETKY oddelenia z potraviny.json a bez duplicít", () => {
  const vsetky = [...new Set(app.POTRAVINY.map(p => p.oddelenie))];
  ["kaufland", "lidl"].forEach(k => {
    const por = poradiePre(k);
    const chyba = vsetky.filter(o => !por.includes(o));
    assert.strictEqual(chyba.length, 0, k + " nemá: " + chyba.join(", "));
    assert.strictEqual(new Set(por).size, por.length, k + " má duplicitu");
  });
});
ok("Kaufland a Lidl sa naozaj líšia (inak je nastavenie na nič)", () => {
  assert.notStrictEqual(JSON.stringify(poradiePre("kaufland")), JSON.stringify(poradiePre("lidl")));
});
ok("neznámy obchod v stave spadne späť na predvolenú trasu", () => {
  assert.deepStrictEqual(poradiePre("neexistujuci"), app.PORADIE_ODDELENI);
});
ok("ozdravPoradie doplní chýbajúce oddelenie a vyhodí neznáme aj duplicitné", () => {
  const p = app.ozdravPoradie(["Pečivo", "Pečivo", "Vymyslené oddelenie"]);
  assert.strictEqual(p[0], "Pečivo");
  assert.strictEqual(new Set(p).size, p.length, "duplicita: " + p.join(", "));
  assert.ok(!p.includes("Vymyslené oddelenie"), "neznáme oddelenie zostalo");
  app.PORADIE_ODDELENI.forEach(o => assert.ok(p.includes(o), "chýba " + o));
});
ok("posunOddelenie prehodí dve oddelenia a prepne na vlastné poradie", () => {
  S.obchod = "kaufland"; delete S.obchodPor;
  const pred = app.poradieOddeleni().slice();
  app.posunOddelenie(1, -1);
  const po = app.poradieOddeleni();
  assert.strictEqual(S.obchod, "vlastne", "neprepol sa na vlastné poradie");
  assert.strictEqual(po[0], pred[1], "poradie sa nezmenilo: " + po.slice(0, 3).join(", "));
  assert.strictEqual(po[1], pred[0]);
  S.obchod = "kaufland"; delete S.obchodPor;
});
ok("posun mimo rozsahu nič nerozbije", () => {
  S.obchod = "kaufland"; delete S.obchodPor;
  app.posunOddelenie(0, -1);
  assert.strictEqual(app.poradieOddeleni().length, app.PORADIE_ODDELENI.length);
  S.obchod = "kaufland"; delete S.obchodPor;
});

console.log("\nRegál podľa názvu — omáčka nesmie skončiť v zelenine");
ok("„Cesnaková omáčka“ ide k omáčkam, nie k cesnaku do zeleniny", () => {
  const p = app.najdiPotravinu("Cesnaková omáčka");
  assert.strictEqual(p && p.oddelenie, "Zelenina a ovocie", "test stráca zmysel, párovanie sa zmenilo");
  assert.strictEqual(app.oddelenieRiadku("Cesnaková omáčka", p.oddelenie), "Omáčky a dochucovadlá");
});
ok("kompót a konzerva idú medzi trvanlivé, mrazené medzi mrazené", () => {
  assert.strictEqual(app.oddelenieRiadku("Ananásový kompót", "Zelenina a ovocie"), "Trvanlivé a konzervy");
  assert.strictEqual(app.oddelenieRiadku("Kukurica v konzerve", "Zelenina a ovocie"), "Trvanlivé a konzervy");
  assert.strictEqual(app.oddelenieRiadku("Mrazený špenát", "Zelenina a ovocie"), "Mrazené");
});
ok("sušené: bylinka ku koreniu, ovocie k trvanlivým, čerstvé sa nedotkne", () => {
  assert.strictEqual(app.oddelenieRiadku("Sušený cesnak", "Zelenina a ovocie"), "Korenie a bylinky");
  assert.strictEqual(app.oddelenieRiadku("Sušené marhule", "Zelenina a ovocie"), "Trvanlivé a konzervy");
  assert.strictEqual(app.oddelenieRiadku("Mrkva", "Zelenina a ovocie"), "Zelenina a ovocie");
});
ok("bežný názov si oddelenie potraviny ponechá", () => {
  assert.strictEqual(app.oddelenieRiadku("Kuracie prsia", "Mäso a ryby"), "Mäso a ryby");
  assert.strictEqual(app.oddelenieRiadku("Neznáma vec", ""), "Ostatné");
});

console.log("\nJednotky — mililitre len pri tekutine");
ok("pevná surovina zadaná v šálkach sa v nákupe vypíše v gramoch, nie v ml", () => {
  const r = fakeRecept("Kapustový test", [{ nazov: "Kapusta čínska", mnozstvo: 3, jednotka: "šálka" }]);
  planujLen([r]);
  const t = cistyText(riadok("Kapusta čínska").mnoz);
  assert.ok(!/\bml\b/.test(t), "kapusta sa hlási v ml: " + t);
  assert.ok(/\bg\b/.test(t), "chýbajú gramy: " + t);
});
ok("tekutina zadaná v lyžiciach zostáva v ml", () => {
  const r = fakeRecept("Olejový test", [{ nazov: "Olivový olej", mnozstvo: 4, jednotka: "PL" }]);
  planujLen([r]);
  const t = cistyText(riadok("Olivový olej").mnoz);
  assert.ok(/\bml\b/.test(t), "olej sa nehlási v ml: " + t);
});
ok("nenapárovaná surovina s prevediteľnou jednotkou má gramáž (nie 0 g)", () => {
  const r = fakeRecept("Neznámy mix", [{ nazov: "Burrito seasoning mix", mnozstvo: 4, jednotka: "ČL" }]);
  planujLen([r]);
  const it = riadok("Burrito seasoning mix");
  assert.ok(it && it.gramy > 0, "gramáž je " + (it && it.gramy));
  assert.strictEqual(it.matched, false, "test predpokladá surovinu mimo databázy");
  assert.strictEqual(it.bezCeny, true, "cena musí zostať priznane neznáma");
  assert.ok(/ČL/.test(cistyText(it.mnoz)), "množstvo sa má vypísať v jednotke receptu: " + cistyText(it.mnoz));
});

console.log("\nDochucovadlá — 36 % zoznamu, ktoré v obchode nekupuješ");
ok("2 g korenia je „základná vec“, 100 g papriky na guláš nie", () => {
  assert.strictEqual(app.jeZakladnaVec({ odd: "Korenie a bylinky", gramy: 2 }), true);
  assert.strictEqual(app.jeZakladnaVec({ odd: "Korenie a bylinky", gramy: 100 }), false);
  assert.strictEqual(app.jeZakladnaVec({ odd: "Zelenina a ovocie", gramy: 2 }), false);
});
ok("„podľa chuti“ (bez množstva) je vždy základná vec a nezmizne zo zoznamu", () => {
  const r = fakeRecept("Chuťový test", [
    { nazov: "Ryža", mnozstvo: 200, jednotka: "g" },
    { nazov: "Soľ", mnozstvo: null, jednotka: "", poznamka: "podľa chuti" }]);
  planujLen([r]);
  const sol = app.nakupItems().find(x => /Soľ/.test(x.nazov));
  assert.ok(sol, "soľ zo zoznamu úplne zmizla");
  assert.strictEqual(sol.zaklad, true, "soľ „podľa chuti“ nie je označená ako základná vec");
  const ryza = riadok("Ryža");
  assert.strictEqual(ryza.zaklad, false, "ryža sa označila ako dochucovadlo");
});

console.log("\n„Mám doma“ vs zakázané suroviny — opačná cena chyby");
ok("„med“ nechytí „medvedí cesnak“ v „Mám doma“ (ale v zákazoch áno)", () => {
  assert.strictEqual(app.jeDoma("Medvedí cesnak", ["med"]), false, "med označil medvedí cesnak ako „máš doma“");
  assert.strictEqual(app.jeDoma("Medovka", ["med"]), false, "med označil medovku");
  // v33: obsahujeSurovinu páruje TVAR slova (med ≠ medvedí); zákaz blokuje aj tak — podreťazcom v zakazaneChyta
  const zak = app.S.profil.zakazane; app.S.profil.zakazane = "med";
  assert.strictEqual(app.zakazaneChyta({ nazov: "x", ingrediencie: [{ nazov: "Medvedí cesnak" }], tagy: [] }), true, "zákazy majú blokovať radšej viac");
  app.S.profil.zakazane = zak;
});
ok("„Mám doma“ ďalej chytá skloňovanie vlastnej suroviny", () => {
  assert.strictEqual(app.jeDoma("Med kvetový", ["med"]), true);
  assert.strictEqual(app.jeDoma("Cibuľa červená", ["cibuľa"]), true);
  assert.strictEqual(app.jeDoma("Ryža basmati", ["ryža"]), true);
});

console.log("\nŠpajza — položka s neznámym miestom");
ok("zásoba s neznámym `miesto` sa dostane do sekcie (nie je neviditeľná)", () => {
  S.spajza = [
    { id: 1, nazov: "Tajomná zásoba", mnozstvo: 500, jednotka: "g", miesto: "Pivnica", expiry: "", min: 0 },
    { id: 2, nazov: "Maslo", mnozstvo: 250, jednotka: "g", miesto: "Chladnička", expiry: "", min: 0 },
    { id: 3, nazov: "Bez miesta", mnozstvo: 100, jednotka: "g", expiry: "", min: 0 }];
  const sk = app.spajzaSkupiny();
  const vidno = new Set();
  sk.forEach(s => s.polozky.forEach(x => vidno.add(x.id)));
  S.spajza.forEach(x => assert.ok(vidno.has(x.id), "položka " + x.nazov + " (miesto: " + x.miesto + ") sa nikde nevykreslí"));
  assert.ok(sk.some(s => /Bez zaradenia/.test(s.nadpis)), "chýba sekcia pre neznáme miesto");
  const html = app.spRow(S.spajza[0]);
  assert.ok(/zmazZasobu\(1\)/.test(html), "nedá sa zmazať: " + html);
  S.spajza = [];
});
ok("každá položka špajze patrí práve do jednej sekcie miesta", () => {
  S.spajza = ["Chladnička", "Mraznička", "Špajza", "Pivnica", undefined, ""].map((m, i) =>
    ({ id: 10 + i, nazov: "Vec " + i, mnozstvo: 1, jednotka: "ks", miesto: m, expiry: "", min: 0 }));
  const miestne = app.spajzaSkupiny().filter(s => !s.duplicit);
  const pocty = {};
  miestne.forEach(s => s.polozky.forEach(x => pocty[x.id] = (pocty[x.id] || 0) + 1));
  S.spajza.forEach(x => assert.strictEqual(pocty[x.id], 1, "položka " + x.nazov + " je v " + (pocty[x.id] || 0) + " sekciách"));
  S.spajza = [];
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// Audit 30. 9. 2026 — Balík 1 (dáta a bezpečnosť)
// ════════════════════════════════════════════════════════════════════════════════════════════
console.log("\nAudit 30. 9. — špajza, odpis, Nákup");
ok("odpis po varení z detailu berie porcie bloku aj veľkosť porcie (2 → 4 porcie × 95 % = 266 g)", () => {
  const r = fakeRecept("Odpis z plánu", [{ nazov: "Ryža", mnozstvo: 140, jednotka: "g" }]); r.porcie = 2;
  require("vm").runInContext("aktualny=receptById('" + r.id + "'); aktPorcie=4; aktVelkost=0.95;", app);
  S.spajza = [{ id: 1, nazov: "Ryža", mnozstvo: 1000, jednotka: "g", kluc: "ryža" }];
  app.odpisRecept(r);                                  // tak ho volá varenie: bez porcií, zo stavu detailu
  assert.ok(Math.abs(S.spajza[0].mnozstvo - (1000 - 266)) < 0.01, "zostalo " + S.spajza[0].mnozstvo + " g, čakané 734");
  require("vm").runInContext("aktualny=null;", app);
  S.spajza = [];
});
ok("špajza páruje po potravine a slovách, nie podreťazcom", () => {
  const sedi = (zasoba, ing) => app.spajzaSedi({ nazov: zasoba }, ing, app.najdiPotravinu(ing));
  [["Mlieko", "Kokosové mlieko"], ["Maslo", "Arašidové maslo"], ["Cesnak", "Cesnakový dresing"], ["Olej", "Sezamový olej"]]
    .forEach(([z, i]) => assert.strictEqual(sedi(z, i), false, "„" + z + "“ v špajzi pokrylo „" + i + "“"));
  [["Mlieko", "Mlieko polotučné"], ["Vajcia", "Vajcia M"], ["Cesnak", "Strúčiky cesnaku"]]
    .forEach(([z, i]) => assert.strictEqual(sedi(z, i), true, "„" + z + "“ v špajzi nepokrylo „" + i + "“"));
  S.spajza = [{ id: 1, nazov: "Mlieko", mnozstvo: 1, jednotka: "l" }];
  app.odpisRecept({ id: "_kok", nazov: "Kari", porcie: 1, ingrediencie: [{ nazov: "Kokosové mlieko", mnozstvo: 400, jednotka: "ml" }] }, 1, 1);
  assert.strictEqual(S.spajza[0].mnozstvo, 1, "kokosové mlieko sa odpísalo z kravského");
  S.spajza = [];
});
ok("jedna zásoba sa rozdelí medzi riadky nákupu raz (nie celá na každý)", () => {
  // názvy mimo databázy potravín — páruje sa menom, takže zásoba sedí na oba riadky
  const r = fakeRecept("Dva riadky", [{ nazov: "Qqzx zmes červená", mnozstvo: 300, jednotka: "g" },
    { nazov: "Qqzx zmes biela", mnozstvo: 400, jednotka: "g" }]);
  planujLen([r]);                                     // 2 porcie → 600 g + 800 g
  S.spajza = [{ id: 1, nazov: "Qqzx zmes", mnozstvo: 500, jednotka: "g" }];
  const rows = app.nakupItems().filter(x => /Qqzx/.test(x.nazov));
  assert.strictEqual(rows.length, 2, "test čaká dva riadky: " + rows.map(x => x.nazov));
  const odratane = rows.reduce((a, x) => a + (x.vSpajzi ? x.gramy : x.zoSpajze), 0);
  assert.ok(Math.abs(odratane - 500) < 0.01, "500 g zásoby odrátalo z nákupu " + odratane + " g");
  S.spajza = [];
});
ok("expirovaná zásoba sa neodpisuje prvá a „Doplniť zásoby“ ju nepočíta", () => {
  const r = fakeRecept("Odpis exp", [{ nazov: "Losos", mnozstvo: 400, jednotka: "g" }]);
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 500, jednotka: "g", kluc: "losos", expiry: "2020-01-01" },
              { id: 2, nazov: "Losos", mnozstvo: 500, jednotka: "g", kluc: "losos", expiry: "2099-01-01" }];
  app.odpisRecept(r, 1, 1);
  assert.strictEqual(S.spajza.find(x => x.id === 1).mnozstvo, 500, "minula sa expirovaná zásoba");
  assert.strictEqual(S.spajza.find(x => x.id === 2).mnozstvo, 100, "platná zásoba sa neminula");
  assert.strictEqual(app.chybaDoMinima({ nazov: "Ryža", mnozstvo: 800, jednotka: "g", min: 500, expiry: "2020-01-01" }), 500,
    "expirovaná ryža nad minimom sa tvári ako zásoba");
  assert.strictEqual(app.chybaDoMinima({ nazov: "Ryža", mnozstvo: 800, jednotka: "g", min: 500 }), 0);
  S.spajza = [];
});
ok("oddelenie a id ručnej položky sa v Nákupe vykreslia ako text (stored XSS)", () => {
  planujLen([]);
  S.nakupManual = [{ id: "x');window.__xss=1;('", nazov: "Papier", odd: "<img src=x onerror=window.__xss=1>", done: false }];
  app.__orig.renderNakup();
  const html = app.document.getElementById("nakup-list").innerHTML;
  assert.ok(!/<img/i.test(html), "oddelenie sa vložilo ako HTML: " + html.slice(0, 200));
  const onclick = html.replace(/&#39;/g, "'");          // tak ho prehliadač dekóduje pred spustením JS
  assert.ok(!/[^\\]'\);window\.__xss/.test(onclick), "id ručnej položky ukončilo JS reťazec v onclick");
  const n = app.normalizujStav({ nakupManual: [{ id: "m1", nazov: "A", odd: { x: 1 } }, { nazov: "bez id" }] }).nakupManual;
  assert.strictEqual(n.length, 1, "položka bez id prežila normalizáciu");
  assert.strictEqual(n[0].odd, undefined, "oddelenie, ktoré nie je reťazec, prežilo normalizáciu");
  S.nakupManual = [];
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// Audit 30. 9. 2026 — Balík 5 (Nákup a Špajza): várky, kúpené do špajze, synonymá, nálezy 1–11
// ════════════════════════════════════════════════════════════════════════════════════════════
// bloky testu: A = Po–Ut (0,1), B = St–Pi (2,3,4), C = So–Ne (5,6)
function planujVarky(polozky) {
  S.plan = {}; S.planF = {}; S.spajza = []; S.domaNakup = ""; S.nakupCheck = {}; S.nakupManual = []; S.nakupVarky = {};
  S.daySloty = {}; S.dayPpl = {}; S.slotPpl = {}; S.tyzdenProfil = {};
  polozky.forEach(([di, slot, r]) => { const iso = app.datumPre(di); S.plan[iso] = S.plan[iso] || {}; S.plan[iso][slot] = [r.id]; });
}
const vRiadok = (sel, nazov) => app.nakupItems(sel).find(r => r.nazov === nazov);
const htmlNakupu = () => { app.__orig.renderNakup(); return app.document.getElementById("nakup-list").innerHTML; };

console.log("\nBalík 5 — A: nákup po várkach");
ok("výber várky C ukáže presne potrebu bloku C (a nič z iných várok)", () => {
  const rA = fakeRecept("Várka A", [{ nazov: "Losos", mnozstvo: 100, jednotka: "g" }]);
  const rC = fakeRecept("Várka C", [{ nazov: "Losos", mnozstvo: 150, jednotka: "g" }, { nazov: "Ryža", mnozstvo: 80, jednotka: "g" }]);
  planujVarky([[0, "Obed", rA], [5, "Obed", rC]]);
  const G = app.nakupPolozky().grp["losos"];
  assert.deepStrictEqual(Object.keys(G.po).sort(), ["0", "2"], "losos má byť vo várkach A a C");
  const c = vRiadok([2], "Losos");
  assert.ok(Math.abs(c.gramy - G.po[2].grams) < 1e-6, "várka C: " + c.gramy + " g, potreba C " + G.po[2].grams);
  assert.strictEqual(JSON.stringify(c.bloky), "[2]", "znaky blokov vo výbere C");
  assert.ok(!vRiadok([0], "Ryža"), "ryža je len vo várke C, vo výbere A nemá byť");
  assert.ok(Math.abs(vRiadok(null, "Losos").gramy - G.grams) < 1e-6, "celý týždeň = A + C");
});
ok("po nákupe na A+B ukáže C celú potrebu C mínus špajza — kúpené pre A sa pri C neráta ako kúpené", () => {
  const G = app.nakupPolozky().grp["losos"];
  S.nakupVarky = { od: S.viewOd, bl: [0, 1] };
  assert.strictEqual(JSON.stringify(app.nakupVyber()), "[0,1]");
  app.checkNakup("losos", true);
  assert.ok(vRiadok([0, 1], "Losos").ck, "vo výbere A+B je losos kúpený");
  S.nakupVarky = { od: S.viewOd, bl: [2] };
  const c = vRiadok([2], "Losos");
  assert.ok(!c.ck && !c.dokupit, "pre C nie je nič kúpené: " + JSON.stringify({ ck: c.ck, dokupit: c.dokupit }));
  assert.ok(Math.abs(c.gramy - G.po[2].grams) < 1e-6, "C má ukázať celú potrebu C, ukazuje " + c.gramy);
  // zásoba sa míňa chronologicky, ale len na NEKÚPENÉ — A je kúpené, takže 100 g ide na C
  S.spajza = [{ id: 1, nazov: "Losos", mnozstvo: 100, jednotka: "g", kluc: "losos" }];
  assert.ok(Math.abs(vRiadok([2], "Losos").gramy - (G.po[2].grams - 100)) < 1e-6, "špajza sa neodrátala z C");
  const v = vRiadok(null, "Losos");                    // celý týždeň: A kúpené, chýba C mínus špajza
  assert.ok(!v.ck && v.dokupit && Math.abs(v.gramy - (G.po[2].grams - 100)) < 1e-6, "celý týždeň: " + JSON.stringify({ ck: v.ck, dokupit: v.dokupit, g: v.gramy }));
  S.spajza = [];
});
ok("všetky várky = celý týždeň; výber z iného týždňa a bez blokov sa neuplatní", () => {
  const zoz = app.RECEPTY.filter(r => (r.ingrediencie || []).some(i => i.mnozstvo != null)).slice(0, 6);
  planujVarky([[0, "Obed", zoz[0]], [1, "Večera", zoz[1]], [2, "Obed", zoz[2]], [4, "Večera", zoz[3]], [5, "Obed", zoz[4]], [6, "Raňajky", zoz[5]]]);
  const a = app.nakupItems(null), b = app.nakupItems([0, 1, 2]);
  assert.strictEqual(JSON.stringify(b.map(r => r.key + "|" + r.mnoz + "|" + r.gramy)), JSON.stringify(a.map(r => r.key + "|" + r.mnoz + "|" + r.gramy)));
  S.nakupVarky = { od: S.viewOd, bl: [0, 1, 2] }; assert.strictEqual(app.nakupVyber(), null, "všetky várky = celý týždeň");
  S.nakupVarky = { od: "2026-08-10", bl: [2] }; assert.strictEqual(app.nakupVyber(), null, "výber z iného týždňa platí");
  S.nakupVarky = { od: S.viewOd, bl: [2] };
  const h = htmlNakupu();
  assert.ok(/id="varka-2"[^>]*aria-pressed="true"/.test(h) && /id="varka-0"[^>]*aria-pressed="false"/.test(h), "prepínače várok: " + h.slice(0, 400));
  assert.ok(!/chip/.test((h.match(/<div class="nak-varky"[\s\S]*?<\/div>/) || [""])[0]), "várky nesmú byť .chip (opačný význam v generátore)");
  S.blokMode = false;
  assert.strictEqual(app.nakupVyber(), null, "bez blokov sa výber neuplatní");
  assert.ok(!/nak-varky/.test(htmlNakupu()), "bez blokov sa výber nezobrazí");
  S.blokMode = true; S.nakupVarky = {};
});

console.log("\nBalík 5 — #4: odškrtnutie si pamätá množstvo");
ok("plán po odškrtnutí narastie → riadok sa vráti ako „dokúpiť +X“", () => {
  const r1 = fakeRecept("Paprika 1", [{ nazov: "Paprika červená", mnozstvo: 150, jednotka: "g" }]);
  const r2 = fakeRecept("Paprika 2", [{ nazov: "Paprika červená", mnozstvo: 30, jednotka: "g" }]);
  planujVarky([[0, "Obed", r1]]);
  const pred = vRiadok(null, "Paprika červená").gramy;
  app.checkNakup("paprika", true);
  assert.ok(vRiadok(null, "Paprika červená").ck, "po odškrtnutí má byť kúpená");
  S.plan[app.datumPre(0)]["Večera"] = [r2.id];
  const spolu = app.nakupPolozky().grp["paprika"].grams;
  const po = vRiadok(null, "Paprika červená");
  assert.ok(!po.ck && po.dokupit, "po náraste plánu ostala „kúpená“: " + JSON.stringify({ ck: po.ck, dokupit: po.dokupit }));
  assert.ok(Math.abs(po.gramy - (spolu - pred)) < 1e-6, "dokúpiť " + po.gramy + " g, čakané " + (spolu - pred));
  assert.ok(/dokúpiť \+/.test(app.riadokNakup(po)), "riadok nehovorí „dokúpiť“");
});
ok("kúpené balenie kryje rast plánu — 1 kg cibule ostane kúpený, kým plán neprekročí 1 kg", () => {
  const r1 = fakeRecept("Cibuľa 1", [{ nazov: "Cibuľa", mnozstvo: 400, jednotka: "g" }]);
  const r2 = fakeRecept("Cibuľa 2", [{ nazov: "Cibuľa", mnozstvo: 50, jednotka: "g" }]);
  planujVarky([[0, "Obed", r1]]);
  assert.ok(vRiadok(null, "Cibuľa").gramy < 1000, "test čaká potrebu pod 1 kg");
  app.checkNakup("cibuľa", true);
  S.plan[app.datumPre(0)]["Večera"] = [r2.id];
  assert.ok(app.nakupPolozky().grp["cibuľa"].grams <= 1000, "test čaká stále do 1 kg");
  assert.ok(vRiadok(null, "Cibuľa").ck, "1 kg balenie pokrýva aj väčšiu potrebu, netreba dokupovať");
});

console.log("\nBalík 5 — B: „Kúpené do špajze“");
ok("odškrtnuté prejdú do špajze (balenie, jednotka, miesto, expirácia), zlúčia sa so zásobou a dajú sa vrátiť", () => {
  const r = fakeRecept("Nákup do špajze", [{ nazov: "Vajcia", mnozstvo: 3, jednotka: "ks" }, { nazov: "Cibuľa", mnozstvo: 300, jednotka: "g" },
    { nazov: "Olivový olej", mnozstvo: 2, jednotka: "PL" }, { nazov: "Losos", mnozstvo: 200, jednotka: "g" }, { nazov: "Soľ", mnozstvo: null, jednotka: "" }]);
  planujVarky([[0, "Obed", r]]);
  S.spajza = [{ id: 7, nazov: "Vajíčka", kluc: "vajíčk", mnozstvo: 4, jednotka: "ks", miesto: "Chladnička", expiry: "2099-01-01", min: 0 }];
  const losos = vRiadok(null, "Losos").gramy;
  ["vajc", "cibuľa", "olivový olej", "losos"].forEach(k => app.checkNakup(k, true));
  const t0 = app.toast; let posl = null; app.toast = (m, a) => { posl = { m, a }; };
  app.kupeneDoSpajze();
  const spat = posl && posl.a;
  const z = n => S.spajza.filter(x => x.nazov === n);
  assert.strictEqual(S.spajza.find(x => x.id === 7).mnozstvo, 14, "vajcia (1 balenie = 10 ks) sa nepripočítali k zásobe „Vajíčka“: " + JSON.stringify(S.spajza));
  assert.strictEqual(z("Vajcia").length, 0, "synonymum vytvorilo druhú zásobu");
  assert.ok(S.spajza.find(x => x.id === 7).expiry < "2099-01-01", "zlúčená zásoba má mať skoršiu expiráciu");
  const cib = z("Cibuľa")[0];
  assert.ok(cib && cib.mnozstvo === 1000 && cib.jednotka === "g" && cib.miesto === "Špajza" && /^\d{4}-\d{2}-\d{2}$/.test(cib.expiry), "cibuľa: " + JSON.stringify(cib));
  const olej = z("Olivový olej")[0];
  const po = app.najdiPotravinu("Olivový olej");
  assert.ok(olej && olej.jednotka === "ml" && olej.mnozstvo === Math.round(po.balenie_g / po.hustota), "olej (1 fľaša) má ísť v ml: " + JSON.stringify(olej));
  const los = z("Losos")[0];
  assert.ok(los && Math.abs(los.mnozstvo - Math.round(losos)) < 1e-9 && los.miesto === "Chladnička", "losos: " + JSON.stringify(los));
  assert.strictEqual(z("Soľ").length, 0, "neodškrtnuté dochucovadlo sa presunulo");
  assert.strictEqual(Object.keys(S.nakupCheck).length, 0, "presunuté ostali odškrtnuté");
  assert.ok(vRiadok(null, "Cibuľa").vSpajzi, "presunutú cibuľu má kryť špajza");
  const dlzka = S.spajza.length;
  app.kupeneDoSpajze();                                  // druhé ťuknutie nič nezdvojí
  assert.strictEqual(S.spajza.length, dlzka);
  assert.ok(spat && /Späť/.test(spat.text), "chýba „↩ Späť“: " + JSON.stringify(posl));
  spat.fn();
  assert.strictEqual(S.spajza.length, 1, "↩ Späť nevrátil špajzu");
  assert.strictEqual(S.spajza[0].mnozstvo, 4);
  assert.strictEqual(Object.keys(S.nakupCheck).length, 4, "↩ Späť nevrátil odškrtnutie");
  app.toast = t0; S.spajza = [];
});

console.log("\nBalík 5 — C: synonymá potravín");
ok("kanon v potraviny.json ukazuje na existujúcu potravinu, ktorá sama kanon nemá", () => {
  const k = new Map(app.POTRAVINY.map(p => [p.kluc, p]));
  const zle = app.POTRAVINY.filter(p => p.kanon != null && (typeof p.kanon !== "string" || !k.has(p.kanon) || k.get(p.kanon).kanon || p.kanon === p.kluc));
  assert.strictEqual(zle.length, 0, "zlý kanon: " + zle.map(p => p.kluc + " → " + p.kanon).join(", "));
  assert.ok(app.POTRAVINY.filter(p => p.kanon).length > 50, "synonymá chýbajú");
});
ok("vajcia + vajíčka aj rasca + kmín + mletá rasca sú v nákupe JEDEN riadok s jedným balením", () => {
  const r = fakeRecept("Vajcia a vajíčka", [{ nazov: "Vajcia", mnozstvo: 3, jednotka: "ks" }, { nazov: "Vajíčka", mnozstvo: 2, jednotka: "ks" },
    { nazov: "Rasca", mnozstvo: 1, jednotka: "ČL" }, { nazov: "Kmín", mnozstvo: 1, jednotka: "ČL" }, { nazov: "Mletá rasca", mnozstvo: 1, jednotka: "ČL" }]);
  planujVarky([[0, "Obed", r]]);
  const rows = app.nakupItems();
  const vaj = rows.filter(x => x.p && x.p.kluc === "vajc");
  assert.strictEqual(vaj.length, 1, "vajcia v " + vaj.length + " riadkoch");
  assert.ok(/^1× 10 ks/.test(cistyText(vaj[0].mnoz)), "5 ks na porciu = 1 balenie, je: " + cistyText(vaj[0].mnoz));
  assert.strictEqual(rows.filter(x => x.p && x.p.kluc === "rasca").length, 1, "rasca v " + rows.filter(x => /rasca|kmín/i.test(x.nazov)).map(x => x.nazov));
});
ok("12 cherry paradajok je 12 × 15 g; prepeličie vajcia nesadnú na slepačie", () => {
  const p = app.najdiPotravinu("Paradajky cherry");
  assert.strictEqual(app.gramy({ mnozstvo: 12, jednotka: "ks" }, p), 180, "cherry = bežná paradajka 120 g/ks?");
  assert.strictEqual(app.kanonKluc(app.najdiPotravinu("Cherry paradajky, balenie vanička 500 g").kluc), app.kanonKluc(app.najdiPotravinu("Cherry paradajky").kluc));
  assert.strictEqual(app.kanonKluc(app.najdiPotravinu("Vajíčka prepeličie").kluc), "prepeličie vajcia");
  assert.notStrictEqual(app.kanonKluc(app.najdiPotravinu("Vajíčka prepeličie").kluc), app.kanonKluc("vajc"));
});
ok("špajza aj „Mám doma“ zoskupujú podľa kanonu, ale prídavné meno („kmínový“) cez synonymum nič nepokryje", () => {
  const r = fakeRecept("Vajcia doma", [{ nazov: "Vajcia", mnozstvo: 2, jednotka: "ks" }, { nazov: "Rasca", mnozstvo: 1, jednotka: "ČL" }]);
  planujVarky([[0, "Obed", r]]);
  S.spajza = [{ id: 1, nazov: "Vajíčka", kluc: "vajíčk", mnozstvo: 30, jednotka: "ks" }];
  assert.ok(vRiadok(null, "Vajcia").vSpajzi, "„Vajíčka“ v špajzi nepokryli „Vajcia“");
  S.spajza = []; S.domaNakup = "vajíčka";
  assert.ok(vRiadok(null, "Vajcia").doma, "„vajíčka“ v Mám doma nepokryli „Vajcia“");
  S.domaNakup = "kmín";
  assert.ok(vRiadok(null, "Rasca").doma, "„kmín“ (synonymum) nepokryl rascu");
  S.domaNakup = "kmínový";
  assert.ok(!vRiadok(null, "Rasca").doma, "„kmínový“ pokryl rascu cez synonymum");
  S.domaNakup = "";
});

console.log("\nBalík 5 — nálezy 1–11");
ok("#1: počítadlo, prúžok a 🎉 majú jedno pravidlo (dochucovadlá ani špajza ho nezastavia, ručná položka áno)", () => {
  const r = fakeRecept("Pravidlo", [{ nazov: "Losos", mnozstvo: 200, jednotka: "g" }, { nazov: "Ryža", mnozstvo: 100, jednotka: "g" },
    { nazov: "Soľ", mnozstvo: null, jednotka: "" }]);
  planujVarky([[0, "Obed", r]]);
  S.spajza = [{ id: 1, nazov: "Ryža", kluc: "ryža", mnozstvo: 5000, jednotka: "g" }];
  app.checkNakup("losos", true);
  const Z = app.nakupZoznam(null);
  assert.ok(Z.spolu === 1 && Z.hotovo === 1, "spolu/hotovo: " + Z.spolu + "/" + Z.hotovo);
  let h = htmlNakupu();
  assert.ok(/Máš všetko v košíku/.test(h) && /aria-valuenow="1"/.test(h) && /aria-valuemax="1"/.test(h), "🎉 a prúžok nesedia");
  assert.ok(/<b>1<\/b> \/ 1 v košíku/.test(h), "počítadlo „1 / 1 v košíku“ chýba");
  assert.ok(/kupeneDoSpajze\(\)/.test(h), "🎉 neponúka „Kúpené do špajze“");
  S.nakupManual = [{ id: "m1", nazov: "Papier", done: false, tyzden: S.viewOd }];
  h = htmlNakupu();
  assert.ok(!/Máš všetko v košíku/.test(h) && /<b>1<\/b> \/ 2 v košíku/.test(h), "neodškrtnutá ručná položka a 🎉");
  S.nakupManual = []; S.spajza = [];
});
ok("#2: kopírovaný zoznam ide po trase s hlavičkami, ručná položka má množstvo, zásoby v oddelení, dochucovadlá na konci", () => {
  const r = fakeRecept("Text", [{ nazov: "Losos", mnozstvo: 200, jednotka: "g" }, { nazov: "Cibuľa", mnozstvo: 100, jednotka: "g" },
    { nazov: "Soľ", mnozstvo: null, jednotka: "" }]);
  planujVarky([[0, "Obed", r]]);
  S.nakupManual = [{ id: "m1", nazov: "mlieko", mnoz: "2 l", odd: "Mliečne a vajcia", done: false, tyzden: S.viewOd }];
  S.spajza = [{ id: 3, nazov: "Ryža", kluc: "ryža", mnozstvo: 100, jednotka: "g", miesto: "Špajza", min: 500 }];
  S.obchod = "kaufland";
  const t = app.nakupText(), i = h => t.indexOf(h);
  assert.ok(i("Zelenina a ovocie:") === 0 && i("Zelenina a ovocie:") < i("Mäso a ryby:") && i("Mäso a ryby:") < i("Mliečne a vajcia:"), t.join(" | "));
  assert.ok(t.includes("mlieko 2 l"), "ručná položka stratila množstvo: " + t.join(" | "));
  assert.ok(i("Cestoviny a ryža:") > 0 && t[i("Cestoviny a ryža:") + 1] === "Ryža 400 g", "zásoba pod minimom: " + t.join(" | "));
  assert.ok(i("Dochucovadlá (len ak došli):") > i("Cestoviny a ryža:") && /^Soľ/.test(t[t.length - 1]), "dochucovadlá: " + t.join(" | "));
  assert.strictEqual(t.poloziek, 5, "počet položiek bez hlavičiek");
  S.nakupManual = []; S.spajza = [];
});
ok("#3: zásoba pod minimom sa dá odškrtnúť a s položkou z plánu sa zlúči (olivový olej nie dvakrát)", () => {
  const r = fakeRecept("Olej", [{ nazov: "Olivový olej", mnozstvo: 3, jednotka: "PL" }]);
  planujVarky([[0, "Obed", r]]);
  S.spajza = [{ id: 4, nazov: "Olivový olej", kluc: "olivový olej", mnozstvo: 10, jednotka: "ml", miesto: "Špajza", min: 500 },
              { id: 5, nazov: "Ryža", kluc: "ryža", mnozstvo: 100, jednotka: "g", miesto: "Špajza", min: 500 }];
  const vsetky = app.nakupZoznam(null).oddelenia.flatMap(o => o.rows);
  const oleje = vsetky.filter(x => /olej/i.test(x.nazov));
  assert.strictEqual(oleje.length, 1, "olej v " + oleje.length + " riadkoch");
  assert.ok(oleje[0].doplnit && /doplniť zásobu/.test(app.riadokNakup(oleje[0])), "riadok oleja nehovorí o doplnení zásoby");
  const ryza = vsetky.find(x => x.low && x.nazov === "Ryža");
  assert.ok(ryza && /<input type="checkbox"/.test(app.riadokNakup(ryza)), "zásoba pod minimom nemá políčko");
  assert.strictEqual(ryza.odd, "Cestoviny a ryža", "zásoba pod minimom nie je vo svojom oddelení");
  app.checkNakup(ryza.key, true);
  assert.ok(app.nakupZoznam(null).hotove.some(x => x.low && x.nazov === "Ryža"), "odškrtnutá zásoba nie je v „Už máme“");
  S.spajza = [];
});
ok("#5: ručná položka patrí týždňu, „2 l mlieka“ sa rozparsuje, dvakrát „mlieko“ sa zlúči, prázdne pole niečo povie", () => {
  planujVarky([]);
  const t0 = app.toast; let posl = null; app.toast = m => { posl = m; };
  app.pridajNakupPolozku("2 l mlieka");
  assert.deepStrictEqual([S.nakupManual[0].nazov, S.nakupManual[0].mnoz, S.nakupManual[0].tyzden], ["mlieka", "2 l", S.viewOd]);
  app.pridajNakupPolozku("Mlieko 1 l");
  assert.strictEqual(S.nakupManual.length, 1, "druhé „mlieko“ je nová položka: " + JSON.stringify(S.nakupManual));
  assert.strictEqual(S.nakupManual[0].mnoz, "3 l");
  app.pridajNakupPolozku("Celozrnný chlieb"); app.pridajNakupPolozku("Chlieb");
  assert.strictEqual(S.nakupManual.length, 3, "„Chlieb“ sa zlúčil s „Celozrnný chlieb“");
  app.pridajNakupPolozku("100 % pomarančový džús");
  assert.deepStrictEqual([S.nakupManual[3].nazov, S.nakupManual[3].mnoz], ["100 % pomarančový džús", ""]);
  posl = null; app.pridajNakupPolozku("");
  assert.ok(/Napíš/.test(posl || ""), "prázdne pole nič nepovedalo");
  S.nakupManual = [{ id: "a", nazov: "Papier", done: true, tyzden: S.viewOd }, { id: "b", nazov: "Mydlo", done: false, tyzden: S.viewOd }];
  const tyz = S.viewOd; S.viewOd = app.pridajDni(tyz, 7);
  const Z = app.nakupZoznam(null);
  const vidno = Z.oddelenia.flatMap(o => o.rows).concat(Z.hotove).filter(x => x.man).map(x => x.nazov);
  assert.strictEqual(JSON.stringify(vidno), JSON.stringify(["Mydlo"]), "odškrtnutá visí v ďalšom týždni / nekúpená sa nepreniesla");
  app.checkManual("b", true);
  assert.strictEqual(S.nakupManual[1].tyzden, S.viewOd, "kúpená prenesená položka nepatrí týždňu nákupu");
  S.viewOd = tyz;
  assert.ok(!app.nakupZoznam(null).hotove.some(x => x.nazov === "Mydlo"), "mydlo kúpené v ďalšom týždni svieti aj v tomto");
  assert.ok(/pridajNakupRychlo\(\)/.test(htmlNakupu()), "chýba rýchle pridanie (režim Obchod skrýva pole)");
  app.toast = t0; S.nakupManual = [];
});
ok("#6: hlavný údaj je balenie z regálu, spotreba menším; výrobok „1 ks“ je len „N ks“; tekutiny v ml", () => {
  const r = fakeRecept("Zobrazenie", [{ nazov: "Cibuľa", mnozstvo: 444, jednotka: "g" }, { nazov: "Hruška, balenie 1 ks (170 g)", mnozstvo: 3, jednotka: "ks" },
    { nazov: "Citrónová šťava", mnozstvo: 45, jednotka: "g" }, { nazov: "Mäta", mnozstvo: 8, jednotka: "list" }]);
  planujVarky([[0, "Obed", r]]);
  const c = vRiadok(null, "Cibuľa");
  assert.ok(/^<b>1× 1 kg<\/b>/.test(c.mnoz) && /\(treba \d+ g\)/.test(cistyText(c.mnoz)), "cibuľa: " + c.mnoz);
  const h = vRiadok(null, "Hruška");
  assert.ok(h, "názov výrobku si nechal „, balenie …“: " + app.nakupItems().map(x => x.nazov).join(", "));
  assert.ok(/^\d+ ks$/.test(cistyText(h.mnoz)), "hruška: " + cistyText(h.mnoz));
  const s = vRiadok(null, "Citrónová šťava");
  assert.ok(/treba \d+ ml/.test(cistyText(s.mnoz)), "šťava nie je v ml: " + cistyText(s.mnoz));
  assert.ok(/8 list/.test(cistyText(vRiadok(null, "Mäta").mnoz)) && vRiadok(null, "Mäta").gramy < 10, "8 lístkov mäty nie je " + vRiadok(null, "Mäta").gramy + " g");
});
ok("#7: kusy sa kupujú nahor — 1,32 ks čakanky sú 2 ks (2,0000001 ostane 2)", () => {
  const p = app.najdiPotravinu("Červená čakanka");
  const G = { matched: true, p, hasKs: true, hasG: false, hasMl: false, pocty: { ks: 1.32 }, grams: 1.32 * p.g_za_ks, ziadane: 1.32, zdroje: [] };
  assert.ok(/^2 ks/.test(cistyText(app.zobrazMnozstvo(G))), cistyText(app.zobrazMnozstvo(G)));
  G.pocty.ks = 2.0000001;
  assert.ok(/^2 ks/.test(cistyText(app.zobrazMnozstvo(G))), cistyText(app.zobrazMnozstvo(G)));
});
ok("#8, #10: dochucovadlá si pamätajú zbalenie; prázdny nákup neodkazuje „vyššie“", () => {
  const r = fakeRecept("Chuť", [{ nazov: "Ryža", mnozstvo: 100, jednotka: "g" }, { nazov: "Soľ", mnozstvo: null, jednotka: "" }]);
  planujVarky([[0, "Obed", r]]);
  assert.ok(/<details class="odd zaklady" open/.test(htmlNakupu()), "dochucovadlá majú byť rozbalené");
  require("vm").runInContext("_zakladyOtvorene=false;", app);
  assert.ok(/<details class="odd zaklady" ontoggle/.test(htmlNakupu()), "po zbalení sa dochucovadlá znova otvorili");
  require("vm").runInContext("_zakladyOtvorene=true;", app);
  planujVarky([]);
  assert.ok(!/vyššie/.test(htmlNakupu()), "prázdny nákup odkazuje „vyššie“");
});
ok("#11: záporná zásoba sa v špajzi prizná; id zásoby ide do onclick vždy ako číslo", () => {
  assert.ok(/záporné/.test(app.spRow({ id: 3, nazov: "Ryža", mnozstvo: -500, jednotka: "g", miesto: "Špajza" })));
  const html = app.spRow({ id: "1);alert(1);(", nazov: "X", mnozstvo: 1, jednotka: "g" });
  assert.ok(!/alert/.test(html) && /upravZasobu\(0,-1\)/.test(html), html);
});

console.log("\nOK — " + bezov + " kontrol prešlo.");
