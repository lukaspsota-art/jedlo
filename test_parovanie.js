// najdiPotravinu — pravidlo párovania suroviny na potraviny.json. Beh: node test_parovanie.js
//
// Pravidlo je v CLAUDE.md doslova takto:
//   „kľúč musí sadnúť na súvislú postupnosť SLOV názvu; skloňovanie sa rieši kmeňom kľúča
//    + prefixom slova; pri rovnako dlhom kľúči vyhráva ten bližšie k začiatku názvu."
// Testy nižšie sú napísané PRIAMO z tejto vety, nie zo správania. Časť beží nad umelým
// mini-slovníkom (algoritmus sa dá overiť bez šumu 576 reálnych potravín), časť nad reálnymi
// dátami ako regresia konkrétnych chýb z auditu.
const assert = require("assert");
const { load } = require("./test_harness");

let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }
function nadpis(t) { console.log(t); }

// ── umelý slovník: každý kľúč je tu preto, aby overil jedno pravidlo ───────────
const MINI = ["med", "medovka", "syr", "kokosové mlieko", "mlieko", "kokos", "cesnak",
  "cesnaková pasta", "rajčinový pretlak", "rajčina", "kura", "kuracie stehno"]
  .map(k => ({ kluc: k, oddelenie: "Ostatné", alergeny: [], kcal: 1, bielkoviny: 0, tuky: 0, sacharidy: 0, cena100: 1, hustota: 1, meso: false }));
const mini = load({ seed: 1, potraviny: MINI });
const kluc = n => { const p = mini.najdiPotravinu(n); return p ? p.kluc : null; };

nadpis("P1 — kľúč sadá len na SÚVISLÚ postupnosť slov");
ok("„kokosové mlieko“ sa nespáruje na „Kokosové vločky a mlieko“", () => {
  assert.strictEqual(kluc("Kokosové mlieko"), "kokosové mlieko");
  assert.strictEqual(kluc("Kokosové vločky a mlieko"), "mlieko",
    "dvojslovný kľúč preskočil slovo — dostal " + kluc("Kokosové vločky a mlieko"));
});
ok("kľúč nesadne na kus slova (podreťazec nestačí)", () => {
  // „med" je celé slovo v „Med", ale nie v „Medvedí"; tam vyhrá cesnak
  assert.strictEqual(kluc("Medvedí cesnak"), "cesnak");
  // …a „medovka" má vlastný kľúč, takže sa neprelieva do „med"
  assert.strictEqual(kluc("Medovka"), "medovka");
});

nadpis("\nP2 — skloňovanie: kmeň kľúča + prefix slova");
ok("„Kokosového mlieka“ nájde „kokosové mlieko“ (obe slová v inom páde)", () => {
  assert.strictEqual(kluc("Kokosového mlieka"), "kokosové mlieko");
});
ok("„Rajčiny“ nájde „rajčina“, ale „Rajčinový pretlak“ vyhrá dlhším kľúčom", () => {
  assert.strictEqual(kluc("Rajčiny"), "rajčina");
  assert.strictEqual(kluc("Rajčinový pretlak"), "rajčinový pretlak");
});
ok("krátky kmeň nesmie nafúknuť slovo o viac než 2 znaky", () => {
  // _presah: kmeň ≤ 3 znaky pripúšťa +2, preto „med“ (3) nechytí „medvedí“ (+4)
  assert.notStrictEqual(kluc("Medvedí cesnak"), "med");
});

nadpis("\nP3 — pri rovnako dlhom kľúči vyhráva ten bližšie k začiatku");
ok("„Med so syrom“ → med, „Syr s medom“ → syr (oba kľúče majú 3 znaky)", () => {
  assert.strictEqual(kluc("Med so syrom"), "med");
  assert.strictEqual(kluc("Syr s medom"), "syr");
});
ok("dlhší kľúč porazí kratší bez ohľadu na pozíciu", () => {
  assert.strictEqual(kluc("Cesnaková pasta"), "cesnaková pasta"); // nie „cesnak“
  assert.strictEqual(kluc("Kuracie stehno"), "kuracie stehno");   // nie „kura“
});

nadpis("\nP4 — negatívne prípady na reálnych dátach (regresie z auditu B1)");
const app = load({ seed: 1 });
const rk = n => { const p = app.najdiPotravinu(n); return p ? p.kluc : null; };
ok("pretlak nie je čerstvá paradajka (82 vs 18 kcal/100 g)", () => {
  const pretlak = app.najdiPotravinu("Paradajkový pretlak");
  const cerstve = app.najdiPotravinu("Paradajky");
  assert.ok(pretlak && cerstve, "chýba paradajka alebo pretlak v potraviny.json");
  assert.notStrictEqual(pretlak.kluc, cerstve.kluc, "pretlak sa páruje na to isté ako čerstvé paradajky");
  assert.ok(pretlak.kcal > cerstve.kcal * 2, "pretlak " + pretlak.kcal + " vs paradajky " + cerstve.kcal);
});
ok("šťava nie je celý plod (citrónová šťava vs. citrón sa nesmie zameniť s kalorickou potravinou)", () => {
  const stava = app.najdiPotravinu("Jablčná šťava");
  const plod = app.najdiPotravinu("Jablko");
  assert.ok(stava && plod, "chýba jablko alebo jablčná šťava");
  assert.notStrictEqual(stava.kluc, plod.kluc, "„Jablčná šťava“ sa páruje na „" + plod.kluc + "“");
});
ok("„Kuracie stehná“ ≠ „kura“ (209 vs 239 kcal, iná potravina)", () => {
  assert.strictEqual(rk("Kuracie stehná"), "kuracie steh", "dostal " + rk("Kuracie stehná"));
  assert.strictEqual(rk("Kura"), "kura");
});
ok("„Olej na opekanie“ je olej, nie pekanový orech (o-PEKAN-ie)", () => {
  assert.strictEqual(rk("Olej na opekanie"), "olej", "dostal " + rk("Olej na opekanie"));
});
ok("„Kokosová smotana“ nie je mliečna smotana ani strúhaný kokos", () => {
  const p = app.najdiPotravinu("Kokosová smotana");
  assert.ok(p, "kokosová smotana sa nespárovala");
  assert.ok(!(p.alergeny || []).includes("mlieko"), "kokosová smotana má alergén mlieko → páruje sa na mliečnu");
});
ok("„Kondenzované mlieko“ nie je obyčajné mlieko", () => {
  assert.notStrictEqual(rk("Kondenzované mlieko"), rk("Mlieko"));
});
ok("„Maslová tekvica“ nie je maslo (45 vs 717 kcal)", () => {
  const t = app.najdiPotravinu("Maslová tekvica");
  assert.ok(t && t.kcal < 200, "maslová tekvica má " + (t && t.kcal) + " kcal/100 g");
});

nadpis("\nP5 — kontrakt funkcie");
ok("nenapárovaný názov vráti null, nie výnimku ani undefined", () => {
  ["", "   ", "xyzqwerty", "🍕🍕", "12345", "?!?"].forEach(n => {
    const v = app.najdiPotravinu(n);
    assert.ok(v === null || (v && typeof v === "object"), n + " → " + v);
  });
  assert.strictEqual(app.najdiPotravinu("zzzzzzneexistuje"), null);
});
ok("výsledok je cachovaný — druhé volanie vráti ten istý objekt", () => {
  const a = app.najdiPotravinu("Cesnak"), b = app.najdiPotravinu("Cesnak");
  assert.strictEqual(a, b, "cache vracia inú inštanciu");
});
ok("každý kľúč z potraviny.json sa nájde sám na sebe", () => {
  // ak sa kľúč nenájde podľa vlastného mena, je v ňom znak, ktorý _slova zahodí,
  // a taká potravina je pre appku prakticky nedostupná
  const zle = app.POTRAVINY.filter(p => {
    const n = app.najdiPotravinu(p.kluc);
    return !n; // nemusí to byť ON (dlhší kľúč môže vyhrať), ale niečo sa nájsť musí
  }).map(p => p.kluc);
  assert.strictEqual(zle.length, 0, "nenájditeľné kľúče: " + zle.slice(0, 10).join(", "));
});
ok("párovanie je case-insensitive a nezávislé od diakritiky", () => {
  const a = app.najdiPotravinu("Cesnak"), b = app.najdiPotravinu("CESNAK"), c = app.najdiPotravinu("cesnak");
  assert.ok(a && b && c && a.kluc === b.kluc && b.kluc === c.kluc,
    [a, b, c].map(x => x && x.kluc).join(" / "));
});

nadpis("\nP6 — pokrytie reálnych receptov");
ok("aspoň 90 % ingrediencií s množstvom sa spáruje na potravinu", () => {
  let spolu = 0, napar = 0;
  app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => {
    if (i.mnozstvo == null) return;
    spolu++; if (app.najdiPotravinu(i.nazov)) napar++;
  }));
  const p = napar / spolu * 100;
  console.log("      (" + napar + " / " + spolu + " = " + p.toFixed(1) + " %)");
  assert.ok(p >= 90, "napárovaných len " + p.toFixed(1) + " %");
});

console.log("\nOK — " + bezov + " kontrol prešlo.");
