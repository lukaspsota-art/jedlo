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

console.log("\nOK — " + bezov + " kontrol prešlo.");
