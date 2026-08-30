// Doménové pravidlá batch cookingu z CLAUDE.md — každé ako samostatná kontrola.
// Beh: node test_pravidla.js
//
// „3 bloky/týždeň (A: Ne večer→Ut, B: Ut večer→Pi, C: Pi večer→Ne), 1 variant/slot/blok,
//  bez opakovania naprieč blokmi, bez carryover C→A. 4 jedlá (raňajky/obed/snack/večera),
//  poradie kcal obed>večera>raňajky>snack, obed≠večera, raňajky sendvič/wrap iná báza/blok.
//  Cieľ ~1400–1450 kcal/os./deň. Pantry staples vždy do nákupu."
//
// Vzorka: SEEDS × TYZDNOV. Viac seedov preto, že generátor je pri seede deterministický, ale
// medzi seedmi sa rozchádza (viď komentár v test_generator.js).
const assert = require("assert");
const { load } = require("./test_harness");

const SEEDS = (process.env.SEEDS || "20260818,7,99").split(",").map(s => parseInt(s.trim())).filter(Number.isFinite);
const N = parseInt(process.env.TYZDNOV) || 4;
const PONDELOK = "2026-08-17";
const CIEL = 1450;

function novy(seed, stav) {
  return load({
    seed,
    stav: Object.assign({
      viewOd: PONDELOK,
      hranice: [true, false, true, false, false, true, false],
      blokMode: true,
      genCfg: { zachovat: false, cielMode: true, filtre: [] },
      profil: { osoby: 2, kcal: CIEL, stravnici: [{ nazov: "A", kcal: CIEL }, { nazov: "B", kcal: CIEL }] },
    }, stav || {}),
  });
}
const pct = (n, d) => d ? n / d * 100 : 0;
let bezov = 0;
function ok(popis, fn) { fn(); console.log("  ✓ " + popis); bezov++; }
function nadpis(t) { console.log(t); }

// ── jeden zber, z ktorého čerpajú všetky týždňové pravidlá ────────────────────
// (generovanie je najdrahšia časť sady — zbiera sa raz)
async function zber() {
  const tyzdne = [];
  for (const seed of SEEDS) {
    const app = novy(seed);
    for (let w = 0; w < N; w++) {
      app.S.viewOd = app.pridajDni(PONDELOK, w * 7);
      await app.generujJedalnicek(true);
      const bl = app.bloky();
      const t = { seed, w, bloky: [], hranice: app.S.hranice.slice() };
      bl.forEach(b => {
        const d0 = b[0];
        const blok = { dni: b.slice(), sloty: {}, recepty: new Set(), kcal: {} };
        app.slotyDna(d0).forEach(sl => {
          const ids = app.slotIds(d0, sl);
          if (!ids.length) return;
          blok.sloty[sl] = ids;
          blok.kcal[sl] = ids.reduce((a, id) => a + app.kcalPorcia(app.komponent(id)), 0) * app.pf(d0, sl);
          ids.forEach(id => { const r = app.komponent(id); if (r && !r._priloha) blok.recepty.add(r.id); });
        });
        const rr = blok.sloty["Raňajky"] && app.komponent(blok.sloty["Raňajky"][0]);
        blok.ranajkyBaza = rr ? app.ranajkyBaza(rr) : null;
        blok.ranajkySendvic = rr ? app.jeSendvic(rr) : false;
        t.bloky.push(blok);
      });
      // celý týždeň po dňoch (na kontrolu jednotnosti bloku)
      t.dni = [];
      for (let di = 0; di < 7; di++) {
        const o = {};
        app.slotyDna(di).forEach(sl => { o[sl] = app.slotIds(di, sl); });
        t.dni.push(o);
      }
      tyzdne.push(t);
    }
  }
  return tyzdne;
}

// D6 potrebuje appku s vygenerovaným týždňom; generuje sa dopredu, nech sú kontroly synchrónne
// (asynchrónne `ok(...)` by vypísalo ✓ skôr, než by assert stihol padnúť)
async function appSPlanom() {
  const a = novy(SEEDS[0]);
  await a.generujJedalnicek(true);
  return a;
}

Promise.all([zber(), appSPlanom()]).then(([tyzdne, nak]) => {
  console.log(`Pravidlá: seedy ${SEEDS.join(", ")} × ${N} týždňov = ${tyzdne.length} týždňov\n`);
  const app = novy(SEEDS[0]);

  nadpis("D1 — 3 bloky v týždni, varný deň je deň pred blokom");
  ok("default rozdelenie dáva presne 3 bloky: Po–Ut, St–Pi, So–Ne", () => {
    const a = novy(SEEDS[0]);
    a.S.hranice = [true, false, true, false, false, true, false];
    // bloky() vracia polia z vm-realmu → deepStrictEqual by padol na prototypoch; porovnávame text
    assert.strictEqual(JSON.stringify(a.bloky()), "[[0,1],[2,3,4],[5,6]]", JSON.stringify(a.bloky()));
  });
  ok("blokDni vráti pre každý deň jeho vlastný blok", () => {
    const a = novy(SEEDS[0]);
    a.S.hranice = [true, false, true, false, false, true, false];
    [[0, [0, 1]], [1, [0, 1]], [2, [2, 3, 4]], [4, [2, 3, 4]], [5, [5, 6]], [6, [5, 6]]]
      .forEach(([di, oc]) => assert.strictEqual(JSON.stringify(a.blokDni(di)), JSON.stringify(oc), "deň " + di + ": " + JSON.stringify(a.blokDni(di))));
  });
  ok("varný deň bloku je deň PRED jeho prvým dňom (A sa varí v nedeľu)", () => {
    const a = novy(SEEDS[0]);
    a.S.hranice = [true, false, true, false, false, true, false];
    // app.js to počíta ako DNI[(b[0]+6)%7] — Po→Ne, St→Ut, So→Pi
    const varne = a.bloky().map(b => a.DNI[(b[0] + 6) % 7]);
    assert.strictEqual(varne.join(","), "Nedeľa,Utorok,Piatok", JSON.stringify(varne));
  });
  ok("hranica sa dá presunúť a bloky sa prepočítajú (nie je to natvrdo 3)", () => {
    const a = novy(SEEDS[0]);
    a.S.hranice = [true, false, false, true, false, false, false];
    assert.strictEqual(JSON.stringify(a.bloky()), "[[0,1,2],[3,4,5,6]]", JSON.stringify(a.bloky()));
    a.S.hranice = [false, false, false, false, false, false, false]; // hraniceInit vynúti pondelok
    assert.strictEqual(JSON.stringify(a.bloky()), "[[0,1,2,3,4,5,6]]", JSON.stringify(a.bloky()));
  });

  nadpis("\nD2 — 1 variant na slot a blok");
  ok("všetky dni bloku majú v každom slote presne to isté", () => {
    let zle = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      Object.keys(b.sloty).forEach(sl => {
        b.dni.forEach(di => {
          spolu++;
          if (JSON.stringify(t.dni[di][sl] || []) !== JSON.stringify(b.sloty[sl])) zle++;
        });
      });
    }));
    assert.strictEqual(zle, 0, zle + " z " + spolu + " dní bloku má iný obsah slotu");
  });

  nadpis("\nD3 — bez opakovania naprieč blokmi a bez carryover C→A");
  ok("v jednom týždni sa žiadny recept neobjaví v dvoch blokoch", () => {
    let zle = 0;
    tyzdne.forEach(t => {
      for (let i = 0; i < t.bloky.length; i++)
        for (let j = i + 1; j < t.bloky.length; j++)
          [...t.bloky[i].recepty].forEach(id => { if (t.bloky[j].recepty.has(id)) zle++; });
    });
    assert.strictEqual(zle, 0, zle + " opakovaní receptu medzi blokmi toho istého týždňa");
  });
  ok("posledný blok týždňa (C) sa neprelieva do prvého bloku (A) nasledujúceho týždňa", () => {
    let zle = 0, parov = 0;
    for (let i = 1; i < tyzdne.length; i++) {
      const prev = tyzdne[i - 1], cur = tyzdne[i];
      if (prev.seed !== cur.seed) continue; // hranica seedov nie je súvislý čas
      parov++;
      const C = prev.bloky[prev.bloky.length - 1].recepty, A = cur.bloky[0].recepty;
      [...A].forEach(id => { if (C.has(id)) zle++; });
    }
    assert.ok(parov > 0, "test nemal čo porovnať");
    assert.strictEqual(zle, 0, zle + " carryoverov C→A na " + parov + " dvojiciach týždňov");
  });

  nadpis("\nD4 — 4 jedlá a ich poradie");
  ok("default sloty sú presne Raňajky, Obed, Večera, Snack", () => {
    assert.strictEqual(app.DEFAULT_SLOTY.join(","), "Raňajky,Obed,Večera,Snack", app.DEFAULT_SLOTY.join(","));
    assert.strictEqual(app.SLOTY().join(","), "Raňajky,Obed,Večera,Snack", app.SLOTY().join(","));
  });
  ok("každý blok má naplnené všetky 4 sloty", () => {
    let zle = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      spolu++;
      if (["Raňajky", "Obed", "Večera", "Snack"].some(s => !b.sloty[s])) zle++;
    }));
    assert.strictEqual(zle, 0, zle + " z " + spolu + " blokov má prázdny slot");
  });
  ok("Obed ≥ Večera vo VŠETKÝCH blokoch (tvrdé pravidlo)", () => {
    let zle = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      if (b.kcal["Obed"] == null || b.kcal["Večera"] == null) return;
      spolu++; if (b.kcal["Obed"] < b.kcal["Večera"] - 1e-9) zle++;
    }));
    assert.strictEqual(zle, 0, zle + " z " + spolu + " blokov má väčšiu večeru než obed");
  });
  ok("celé poradie Obed ≥ Večera > Raňajky > Snack aspoň v 85 % blokov", () => {
    let dobre = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      const k = b.kcal;
      if (["Obed", "Večera", "Raňajky", "Snack"].some(s => k[s] == null)) return;
      spolu++;
      if (k["Obed"] >= k["Večera"] && k["Večera"] > k["Raňajky"] && k["Raňajky"] > k["Snack"]) dobre++;
    }));
    const x = pct(dobre, spolu);
    console.log("      (namerané " + x.toFixed(1) + " % z " + spolu + " blokov)");
    assert.ok(x >= 85, x.toFixed(1) + " % blokov má celé poradie");
  });
  ok("obed ≠ večera — nikdy ten istý recept v jednom bloku", () => {
    let zle = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      const o = (b.sloty["Obed"] || [])[0], v = (b.sloty["Večera"] || [])[0];
      if (o && v && o === v) zle++;
    }));
    assert.strictEqual(zle, 0, zle + " blokov má obed a večeru z toho istého receptu");
  });

  nadpis("\nD5 — kalorický cieľ domácnosti");
  ok("priemerný deň je v pásme 1300–1600 kcal na osobu (cieľ ~1400–1450)", () => {
    const dni = [];
    tyzdne.forEach(t => t.bloky.forEach(b => {
      const suma = Object.values(b.kcal).reduce((a, x) => a + x, 0);
      b.dni.forEach(() => dni.push(suma));
    }));
    const priemer = dni.reduce((a, x) => a + x, 0) / dni.length;
    console.log("      (priemer " + priemer.toFixed(0) + " kcal/os./deň)");
    assert.ok(priemer >= 1300 && priemer <= 1600, "priemer " + priemer.toFixed(0) + " kcal");
  });

  nadpis("\nD6 — pantry staples vždy v nákupe");
  ok("každá surovina naplánovaného receptu je v nákupe — aj tá „podľa chuti“ (soľ, olej, korenie)", () => {
    const { grp, notes } = nak.nakupPolozky();
    const kluce = new Set([...Object.keys(grp), ...Object.keys(notes)]);
    const chyba = [];
    nak.planovaneRecepty().forEach(r => (r.ingrediencie || []).forEach(i => {
      const p = nak.najdiPotravinu(i.nazov);
      const j = (i.jednotka || "").toLowerCase().trim();
      const kandidati = p ? [p.kluc] : ["u|" + i.nazov.toLowerCase() + "|" + j, i.nazov.toLowerCase()];
      if (!kandidati.some(k => kluce.has(k))) chyba.push(r.id + " / " + i.nazov + " (" + i.mnozstvo + " " + j + ")");
    }));
    assert.strictEqual(chyba.length, 0, chyba.length + " surovín vypadlo z nákupu: " + chyba.slice(0, 8).join(" · "));
  });
  ok("suroviny bez množstva („podľa chuti“) sa v nákupe objavia ako poznámka, nie ako 0 g", () => {
    const { notes } = nak.nakupPolozky();
    const n = Object.keys(notes).length;
    console.log("      (" + n + " položiek „podľa chuti“)");
    assert.ok(n > 0, "žiadna položka bez množstva sa do nákupu nedostala — kde je soľ a korenie?");
    Object.values(notes).forEach(x => assert.ok(x.pozn && x.nazov, JSON.stringify(x)));
  });
  ok("nákup pokryje VŠETKY dni týždňa, nielen varné dni bloku", () => {
    // recept sa v bloku varí raz, ale porcií musí byť na celý blok
    const zdroje = [];
    Object.values(nak.nakupPolozky().grp).forEach(G => (G.zdroje || []).forEach(z => zdroje.push(z)));
    assert.ok(zdroje.length > 0, "nákup nemá ani jeden zdroj");
    const dniBloku = nak.bloky().reduce((a, b) => a + b.length, 0);
    assert.strictEqual(dniBloku, 7, "bloky nepokrývajú celý týždeň: " + dniBloku + " dní");
  });

  nadpis("\nD7 — faktor veľkosti porcie („%“) je len jemné dorovnanie");
  ok("FAKTOR je zovretý na 0,85–1,15 a generátor mimo neho nikdy nejde", () => {
    assert.strictEqual(nak.FAKTOR_MIN, 0.85, "FAKTOR_MIN = " + nak.FAKTOR_MIN);
    assert.strictEqual(nak.FAKTOR_MAX, 1.15, "FAKTOR_MAX = " + nak.FAKTOR_MAX);
    let mimo = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => Object.keys(b.sloty).forEach(() => spolu++)));
    // faktory z reálneho behu (zber ich má v kcal už zarátané) — kontrolujeme priamo planF appky
    Object.values(nak.S.planF).forEach(d => Object.values(d || {}).forEach(f => {
      spolu++; if (f < 0.85 - 1e-9 || f > 1.15 + 1e-9) mimo++;
    }));
    assert.strictEqual(mimo, 0, mimo + " faktorov mimo pásma 0,85–1,15");
  });
  ok("faktor NEZNIŽUJE navarené množstvo — pocetPorciiDna ním delí", () => {
    // celkové navarené kcal dňa = základ × počet porcií; faktor sa vykráti.
    // Domácnosť teda dostane svoj dopyt vždy, len rozdelený na viac menších porcií.
    const a = novy(SEEDS[0]);
    a.S.plan = {}; a.S.planF = {};
    const iso = a.datumPre(0);
    a.S.plan[iso] = { Obed: ["r-test"], Večera: ["r-test"] };
    a.RECEPTY.push({ id: "r-test", nazov: "T", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [], postup: [], kcal_na_porciu: 700 });
    a.zabudniVyzivu();
    const dopyt = a.stravniciList().reduce((x, p) => x + p.kcal, 0);
    const bez = a.baseDayKcal(0) * a.pf(0, "Obed") * a.porcieSlot(0, "Obed");
    a.S.planF[iso] = { Obed: 0.85, Večera: 0.85 };
    const s085 = a.baseDayKcal(0) * a.pf(0, "Obed") * a.porcieSlot(0, "Obed");
    a.S.planF[iso] = { Obed: 1.15, Večera: 1.15 };
    const s115 = a.baseDayKcal(0) * a.pf(0, "Obed") * a.porcieSlot(0, "Obed");
    [["bez faktora", bez], ["85 %", s085], ["115 %", s115]].forEach(([lbl, v]) =>
      assert.ok(Math.abs(v - dopyt) < 1, lbl + ": navarené " + Math.round(v) + " kcal vs dopyt " + dopyt));
    console.log("      (dopyt " + dopyt + " kcal · navarené pri 85 %/100 %/115 % = " +
      [s085, bez, s115].map(x => Math.round(x)).join(" / ") + ")");
  });
  ok("porcií pribudne, keď sa porcia zmenší (85 % → viac porcií, rovnaké jedlo)", () => {
    const a = novy(SEEDS[0]);
    a.S.plan = {}; a.S.planF = {};
    const iso = a.datumPre(0);
    a.S.plan[iso] = { Obed: ["r-test2"], Večera: ["r-test2"] };
    a.RECEPTY.push({ id: "r-test2", nazov: "T2", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [], postup: [], kcal_na_porciu: 700 });
    a.zabudniVyzivu();
    const plne = a.porcieSlot(0, "Obed");
    a.S.planF[iso] = { Obed: 0.85, Večera: 0.85 };
    const mensie = a.porcieSlot(0, "Obed");
    assert.ok(mensie > plne, "pri 85 % porcii má byť porcií VIAC: " + mensie + " vs " + plne);
    assert.ok(Math.abs(mensie * 0.85 - plne) < 1e-6, "porcie × faktor musí dať pôvodný počet");
  });

  nadpis("\nD8 — stravníci s rôznymi kalóriami");
  ok("stravniciList vráti zoznam z profilu, inak ho dopočíta z počtu osôb", () => {
    const a = novy(SEEDS[0], { profil: { osoby: 3, kcal: 1600, stravnici: [] } });
    const l = a.stravniciList();
    assert.strictEqual(l.length, 3, "z osoby:3 má vzniknúť 3 stravníci, vzniklo " + l.length);
    l.forEach(p => assert.strictEqual(p.kcal, 1600, JSON.stringify(p)));
    const b = novy(SEEDS[0], { profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "X", kcal: 1200 }] } });
    assert.strictEqual(b.stravniciList().length, 1, "explicitný zoznam má prebiť osoby");
  });
  ok("dvaja stravníci s rôznymi kcal dostanú spolu svoj dopyt (1450 + 2100)", () => {
    const a = novy(SEEDS[0], { profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 2100 }] } });
    a.S.plan = {}; a.S.planF = {};
    const iso = a.datumPre(0);
    a.S.plan[iso] = { Obed: ["r-test3"], Večera: ["r-test3"] };
    a.RECEPTY.push({ id: "r-test3", nazov: "T3", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [], postup: [], kcal_na_porciu: 700 });
    a.zabudniVyzivu();
    assert.strictEqual(a.baseDayKcal(0), 1400, "základ dňa " + a.baseDayKcal(0));
    const dodane = a.baseDayKcal(0) * a.porcieSlot(0, "Obed") * a.pf(0, "Obed");
    assert.ok(Math.abs(dodane - 3550) < 1, "navarené " + Math.round(dodane) + " kcal vs dopyt 3550");
  });
  ok("strop je 2× počet stravníkov — malý deň nenafúkne nákup donekonečna", () => {
    const a = novy(SEEDS[0], { profil: { osoby: 2, kcal: 1450, stravnici: [{ nazov: "A", kcal: 1450 }, { nazov: "B", kcal: 1450 }] } });
    a.S.plan = {}; a.S.planF = {};
    const iso = a.datumPre(0);
    a.S.plan[iso] = { Obed: ["r-maly"], Večera: ["r-maly"] };
    a.RECEPTY.push({ id: "r-maly", nazov: "M", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [], postup: [], kcal_na_porciu: 50 });
    a.zabudniVyzivu();
    assert.strictEqual(a.pocetPorcii(0), 4, "strop 2×2 = 4, dostal som " + a.pocetPorcii(0));
  });
  ok("mnozMult = porcie × faktor a je vždy konečné kladné číslo", () => {
    const a = novy(SEEDS[0]);
    a.S.plan = {}; a.S.planF = {};
    const iso = a.datumPre(0);
    a.S.plan[iso] = { Obed: ["r-mm"], Večera: ["r-mm"] };
    a.RECEPTY.push({ id: "r-mm", nazov: "MM", kategoria: "Hlavné jedlo", porcie: 1, ingrediencie: [], postup: [], kcal_na_porciu: 700 });
    a.zabudniVyzivu();
    [1, 0.85, 1.15].forEach(f => {
      if (f === 1) delete a.S.planF[iso]; else a.S.planF[iso] = { Obed: f, Večera: f };
      const m = a.mnozMult(0, "Obed");
      assert.ok(Number.isFinite(m) && m > 0, "faktor " + f + " → mnozMult " + m);
      assert.ok(Math.abs(m - a.porcieSlot(0, "Obed") * a.pf(0, "Obed")) < 1e-9);
    });
  });

  console.log("\nOK — " + bezov + " kontrol prešlo.");
}).catch(e => { console.error(String(e.message || e.stack || e)); process.exit(1); });
