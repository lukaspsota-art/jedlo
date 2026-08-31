// REGRESIE — testy na chyby, ktoré sú DNES otvorené. Beh: node test_regresie.js
//
// AKO SA TENTO SÚBOR SPRÁVA
// Každá kontrola má zapísaný OČAKÁVANÝ stav:
//   "PADÁ"   = chyba je otvorená, kontrola dnes neprejde
//   "PREJDE" = chyba je opravená a kontrola stráži, aby sa nevrátila
// Súbor skončí s kódom 0, kým realita sedí s očakávaním — dnešnú zelenú sadu teda nekazí.
// Skončí s kódom 1, keď sa stav ZMENÍ:
//   • kontrola označená „PADÁ" zrazu prejde → chyba je opravená, prepni ju na "PREJDE"
//     (a prípadne presuň do príslušného zeleného súboru),
//   • kontrola označená „PREJDE" padne → oprava sa rozbila.
// Vďaka tomu súbor nemôže ticho zhniť ani sa vždy zeleniť.
//
// Zdroj nálezov: CLAUDE.md „Stav a otvorené veci", BASELINE.md a merania z 30. 8. 2026.
const assert = require("assert");
const { load } = require("./test_harness");

const PONDELOK = "2026-08-17";
const CIEL = 1450;
const ZAKLAD = {
  viewOd: PONDELOK, hranice: [true, false, true, false, false, true, false], blokMode: true,
  genCfg: { zachovat: false, cielMode: true, filtre: [] },
  profil: { osoby: 2, kcal: CIEL, stravnici: [{ nazov: "A", kcal: CIEL }, { nazov: "B", kcal: CIEL }] },
};
const novy = seed => load({ seed, stav: ZAKLAD });

const FRONTA = [];
function regresia(id, ocakavane, popis, fn) { FRONTA.push({ id, ocakavane, popis, fn }); }
function nadpis(t) { FRONTA.push({ nadpis: t }); }
// Poškodený stav (R5) zhodí app.js aj v asynchrónnej vetve (syncPull sa volá na konci app.js bez
// catch), takže po ňom pristane „unhandledRejection" — je to súčasť tej istej chyby, nie chyba testu.
// Preto sa od začiatku R5 asynchrónne pády tolerujú; R5 je zámerne až na konci súboru, aby sa
// tolerancia nevzťahovala na predošlé kontroly.
let tolerujAsyncPady = false;
process.on("unhandledRejection", e => {
  if (tolerujAsyncPady) return;
  console.error("neodchytená chyba: " + (e && (e.stack || e.message) || e));
  process.exit(1);
});

// ── R1 ────────────────────────────────────────────────────────────────────────
nadpis("R1 — vyprážané recepty rátajú CELÝ olej, nie vsiaknutý");
// OPRAVENÉ (B7): `_vyzivaVypocet` násobí hmotu do výživy poľom `vsiaknutie` na ingrediencii
// (0–1 = podiel, ktorý sa naozaj zje). Do nákupu a ceny ide naďalej celé množstvo, preto test
// meria to isté, čo appka zobrazí: gramy × vsiaknutie. Recept bez príznaku má vsiaknutie = 1,
// takže neoznačený olej na vyprážanie kontrolu naďalej zhodí.
regresia("R1", "PREJDE",
  "olej na vyprážanie nesmie dať viac než polovicu kcal porcie (musaka bola 407 z 430 kcal)", () => {
    const a = novy(1);
    const zle = [];
    a.RECEPTY.forEach(r => {
      const txt = ((r.postup || []).join(" ") + " " + (r.popis || "") + " " + (r.tipy || "")).toLowerCase();
      if (!/vypráž|vypraž|fritéz|fritov|rozpálen.{0,12}olej|ponor/.test(txt)) return;
      const kcalPorcia = a.kcalPorcia(r); if (!(kcalPorcia > 0)) return;
      (r.ingrediencie || []).forEach(i => {
        if (!/olej|masť|sadlo/i.test(i.nazov)) return;
        const p = a.najdiPotravinu(i.nazov); if (!p) return;
        const g = a.gramy(i, p); if (g < 150) return;   // menej než 150 g nie je vyprážanie v hlbokom tuku
        // Kaluž tuku nad 150 g v hlbokom vyprážaní MUSÍ mať kurátorovaný koeficient. Bez neho
        // (vsiaknutie = 1) sa celá kúpeľ započíta do porcie — presne tá chyba, ktorú R1 stráži.
        if (i.vsiaknutie == null) {
          const cely = g * p.kcal / 100 / (r.porcie || 1);
          if (cely > kcalPorcia * 0.5)
            zle.push(r.id + ": neoznačených " + Math.round(cely) + " z " + kcalPorcia + " kcal");
          return;
        }
        // Označený tuk: koeficient musí sedieť s tabuľkou z report-data-kcal.md (0,12–0,30).
        // Cestíčkové jedlá (agátové kvety) majú z vsiaknutého tuku legitímne aj polovicu kcal —
        // strop preto stráži koeficient, nie podiel kalórií.
        if (!(i.vsiaknutie >= 0.10 && i.vsiaknutie <= 0.35))
          zle.push(r.id + ": vsiaknutie " + i.vsiaknutie + " je mimo tabuľky 0,12–0,30");
      });
    });
    assert.strictEqual(zle.length, 0, zle.length + " vyprážaných receptov ráta celý olej: " + zle.join(" · "));
  });
// R1b: opačná poistka — príznak `vsiaknutie` nesmie zlacniť nákup. 600 ml oleja sa kupuje celých.
regresia("R1b", "PREJDE",
  "vsiaknutie mení výživu, NIE cenu porcie ani gramáž do nákupu", () => {
    const a = novy(1);
    const r = a.RECEPTY.find(x => x.id === "musaka");
    assert.ok(r, "recept musaka chýba");
    const i = (r.ingrediencie || []).find(x => x.vsiaknutie != null);
    assert.ok(i, "musaka nemá ingredienciu s poľom vsiaknutie");
    const p = a.najdiPotravinu(i.nazov);
    assert.strictEqual(a.gramy(i, p), 600 * (p.hustota || 1), "gramy() musí vrátiť PLNÉ množstvo");
    // cena porcie počítaná z plných gramov: porovnaj s receptom bez príznaku
    const bez = JSON.parse(JSON.stringify(r)); bez.id = "musaka-bez";
    bez.ingrediencie.forEach(x => { delete x.vsiaknutie; });
    const vA = a.vyzivaReceptu(r), vB = a.vyzivaReceptu(bez);
    assert.ok(vA.t < vB.t * 0.85, "tuky s vsiaknutím musia klesnúť (" + vA.t.toFixed(1) + " vs " + vB.t.toFixed(1) + " g)");
  });

// ── R2 ────────────────────────────────────────────────────────────────────────
nadpis("\nR2 — položky nákupu bez ceny / bez hmotnosti");
// opravené 31. 8. 2026 (agent NÁKUP-V-OBCHODE): 211× doplnené `g_za_ks` / 15× `g_za_platok`
// v potraviny.json + nenapárovaná surovina s prevediteľnou jednotkou („4 ČL") dostane gramáž v nakupPolozky.
regresia("R2a", "PREJDE",
  "žiadna napárovaná položka nákupu nemá 0 g (bolo: „Cestoviny 3 ks“ = 0 g, lebo ks nemá g_za_ks)", () => {
    const a = novy(20260818);
    return a.generujJedalnicek(true).then(() => {
      const zle = a.nakupItems().filter(r => r.gkey && !(r.gramy > 0)).map(r => r.nazov + " (" + r.mnoz.replace(/<[^>]*>/g, "").trim() + ")");
      assert.strictEqual(zle.length, 0, zle.length + " položiek má 0 g: " + zle.join(", "));
    });
  });
regresia("R2b", "PREJDE",
  "každá položka nákupu má cenu (výnimka: potravina s cena100 === 0, napr. voda)", () => {
    const a = novy(20260818);
    return a.generujJedalnicek(true).then(() => {
      const rows = a.nakupItems().filter(r => r.gkey);
      // „bez ceny" je presne to, čo appka sama prizná príznakom `bezCeny` (dovodBezCeny).
      // Pôvodná výnimka `r.p && r.p.cena100 === 0` nikdy neplatila — riadok nákupu nemá pole `p` —
      // a doslovné `/^voda$/` neprepustilo „Voda horúca". Potravina s cena100 === 0 je legitímne
      // zadarmo, nie chýbajúca cena, a `bezCeny` ju už správne necháva na pokoji.
      const zle = rows.filter(r => r.bezCeny).map(r => r.nazov);
      assert.strictEqual(zle.length, 0, zle.length + " z " + rows.length + " položiek bez ceny: " + zle.join(", "));
    });
  });

// ── R3 / R7 ───────────────────────────────────────────────────────────────────
// zpristupniKliky() dorovnáva len tieto triedy — čokoľvek iné s onclick musí mať tabindex
// priamo v HTML, inak sa na to klávesnicou nedá dostať.
const KRYTE_ZPRISTUPNI = /class="[^"]*\b(chip|kol-tile|plan-cell)\b/;
function klikateľnéBezKlávesnice(html) {
  return (html.match(/<(div|span|td|li)\b[^>]*\bonclick=[^>]*>/g) || [])
    .filter(x => !/\btabindex=/.test(x) && !/\brole="button"/.test(x) && !KRYTE_ZPRISTUPNI.test(x));
}
nadpis("\nR3 — karty receptov nie sú dosiahnuteľné klávesnicou (P1 z AUDIT_UI_2026-08-19)");
regresia("R3", "PREJDE",
  "kartaHTML nesmie mať <div onclick> bez tabindex — otvorenie receptu musí ísť aj Tab+Enter", () => {
    const a = novy(1);
    const zle = klikateľnéBezKlávesnice(a.kartaHTML(a.RECEPTY[0]));
    assert.strictEqual(zle.length, 0, zle.length + " nedosiahnuteľných prvkov na karte: " + zle.join(" "));
  });
nadpis("\nR7 — bunky plánu nie sú dosiahnuteľné klávesnicou (P1 z AUDIT_UI_2026-08-19)");
regresia("R7", "PREJDE",
  "tabuľka plánu nesmie mať klikateľné span/div bez tabindex (dnes ~180: .rm, .kc, .mchip)", () => {
    const a = novy(20260818);
    return a.generujJedalnicek(true).then(() => {
      a.__orig.renderPlan();
      const zle = klikateľnéBezKlávesnice(a.document.getElementById("plan-table").innerHTML);
      const triedy = {};
      zle.forEach(x => { const c = (x.match(/class="([^"]*)"/) || [, "(bez triedy)"])[1]; triedy[c] = (triedy[c] || 0) + 1; });
      assert.strictEqual(zle.length, 0, zle.length + " nedosiahnuteľných prvkov: " + JSON.stringify(triedy));
    });
  });

// ── R4 ────────────────────────────────────────────────────────────────────────
nadpis("\nR4 — mriežka renderuje všetky recepty naraz");
regresia("R4", "PREJDE",
  "renderGrid nesmie vložiť do DOM viac ako 200 kariet naraz (dnes všetkých ~1900)", () => {
    const a = novy(1);
    a.__orig.renderGrid();
    const n = a.document.getElementById("grid").children.length;
    assert.ok(n <= 200, n + " kariet v DOM naraz (z " + a.RECEPTY.length + " receptov)");
  });

// ── R6 ────────────────────────────────────────────────────────────────────────
nadpis("\nR6 — raňajková báza sa v jednom týždni zopakuje (oprava dňa obchádza pravidlo)");
// OPRAVENÉ (D1, 31. 8.): príčinou nebola „citlivosť na dáta", ale STAROBA `ctx.stopa`.
// `prehodSlot` zapíše stopu slotu hneď pri výmene, no štyri prechody dňa (`skusPrehod`,
// `zlepsiBielkoviny`, `zlepsiVlakninu`, `zlacniDen`) zamietnutú výmenu vracali len v `denPlan`
// a `ctx.pouzite`. V stope tak zostala báza receptu, ktorý v bloku nie je, a keďže sa hotová
// stopa na konci bloku sype do týždňovej `pouziteBazy`, blok A si zaregistroval napr. „bageta",
// hoci podával toast — blok B potom vylúčil bagetu, vybral toast a pravidlo padlo.
// Opravou je `vratSlot`, ktorá vracia aj `ctx.stopa`; `_pravidlaRanajok` navyše platí aj na
// zálohe poolu, ktorou sa obchádza pamäť. Namerané po oprave: 0 porušení z 80 týždňov (8 seedov).
regresia("R6", "PREJDE",
  "CLAUDE.md: „raňajky sendvič/wrap iná báza/blok“ — tri bloky týždňa musia mať tri rôzne " +
  "raňajkové bázy (toast / tortilla / bageta / rožok / kaša / vajcia / jogurt / …)", () => {
    const SEEDS = [99, 2], N = 6;
    let zle = 0, spolu = 0;
    const kroky = [];
    SEEDS.forEach(seed => kroky.push(async () => {
      const a = novy(seed);
      for (let w = 0; w < N; w++) {
        a.S.viewOd = a.pridajDni(PONDELOK, w * 7);
        await a.generujJedalnicek(true);
        const bazy = a.bloky().map(b => {
          const ids = a.slotIds(b[0], "Raňajky");
          const r = ids.length ? a.komponent(ids[0]) : null;
          return r ? a.ranajkyBaza(r) : null;
        }).filter(Boolean);
        spolu++;
        if (new Set(bazy).size !== bazy.length) zle++;
      }
    }));
    return kroky.reduce((p, k) => p.then(k), Promise.resolve()).then(() => {
      assert.strictEqual(zle, 0, zle + " z " + spolu + " týždňov má dva bloky s rovnakou raňajkovou bázou");
    });
  });

// ── R5 ────────────────────────────────────────────────────────────────────────
nadpis("\nR5 — poškodený localStorage zhodí štart appky");
[
  ["číslo", "42"],
  ["boolean", "true"],
  ["reťazec", '"ahoj"'],
  ["pole zlého typu v stave", '{"plan":"toto nie je objekt","spajza":"ani toto","profil":5}'],
].forEach(([popis, raw], i) => {
  regresia("R5" + "abcd"[i], "PREJDE",
    "kľúč kucharka_v2 = " + popis + " → appka sa musí naštartovať s prázdnym stavom, nie spadnúť", () => {
      tolerujAsyncPady = true;
      const a = load({ seed: 1, rawStav: raw });
      assert.ok(a.S && typeof a.S === "object" && !Array.isArray(a.S), "S = " + JSON.stringify(a.S));
      assert.ok(a.S.profil && a.S.profil.kcal > 0, "profil sa neinicializoval");
    });
});

// ── beh ───────────────────────────────────────────────────────────────────────
(async () => {
  let sedi = 0, zmenene = [];
  for (const k of FRONTA) {
    if (k.nadpis !== undefined) { console.log(k.nadpis); continue; }
    let preslo = true, dovod = "";
    try { await k.fn(); } catch (e) {
      preslo = false;
      // stack z vm-u je dlhý a v prehľade nepomáha — stačí prvý riadok dôvodu
      dovod = String((e && e.message) || e).split("\n").filter(Boolean)[0] || "";
    }
    const skutocne = preslo ? "PREJDE" : "PADÁ";
    if (skutocne === k.ocakavane) {
      sedi++;
      console.log("  " + (preslo ? "✓" : "✗") + " [" + k.id + " " + k.ocakavane + "] " + k.popis);
      if (!preslo) console.log("      → " + dovod);
    } else {
      zmenene.push({ k, skutocne, dovod });
      console.log("  ‼ [" + k.id + "] ZMENA STAVU: očakávané " + k.ocakavane + ", skutočné " + skutocne);
      console.log("      " + k.popis);
      if (!preslo) console.log("      → " + dovod);
    }
  }
  console.log("\n" + sedi + " kontrol sedí s očakávaním, " + zmenene.length + " zmenilo stav.");
  if (zmenene.length) {
    console.log("Aktualizuj test_regresie.js: " + zmenene.map(x => x.k.id + "→" + x.skutocne).join(", ") +
      "\n(opravená chyba = prepni na \"PREJDE\" a presuň kontrolu do zelenej sady)");
    process.exit(1);
  }
})().catch(e => { console.error(String((e && e.stack) || e)); process.exit(1); });
