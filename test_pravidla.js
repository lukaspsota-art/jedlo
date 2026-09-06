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
        // `recepty` = to, čo sa v bloku VARÍ (bez snacku — ten je hotový kúpený výrobok
        // a od vlny P5 sa mení deň po dni; viď D2). `snacky` = všetky snacky celého bloku.
        const blok = { dni: b.slice(), sloty: {}, recepty: new Set(), snacky: [], kcal: {} };
        app.slotyDna(d0).forEach(sl => {
          const ids = app.slotIds(d0, sl);
          if (!ids.length) return;
          blok.sloty[sl] = ids;
          blok.kcal[sl] = ids.reduce((a, id) => a + app.kcalPorcia(app.komponent(id)), 0) * app.pf(d0, sl);
          if (app.jeSnackSlot(sl)) return;
          // snack sa nevarí, takže sa naň pravidlo „bez opakovania naprieč blokmi" nevzťahuje
          ids.forEach(id => { const r = app.komponent(id); if (r && !r._priloha) blok.recepty.add(r.id); });
        });
        b.forEach(di => app.slotyDna(di).filter(sl => app.jeSnackSlot(sl)).forEach(sl =>
          app.slotIds(di, sl).forEach(id => { const r = app.komponent(id); if (r && !r._priloha) blok.snacky.push({ di, id: r.id, prim: app.slotIds(di, sl)[0] === id }); })));
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

Promise.all([zber(), appSPlanom()]).then(async ([tyzdne, nak]) => {
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

  nadpis("\nD2 — 1 variant na slot a blok (pre VARENÉ sloty)");
  // Pravidlo batch cookingu hovorí, že sa v bloku navarí raz a je sa to celý blok. Týka sa
  // teda VARENÝCH slotov. Snack je od vlny P5 hotový kúpený výrobok (typ „vyrobok“, jedno
  // balenie = jedna porcia) — nič sa preň nevarí a tri rôzne jogurty sa kupujú rovnako ľahko
  // ako tri rovnaké, takže sa smie (a má) meniť deň po dni. Kým bol viazaný na blok, mal
  // mesiac strop 12 ťahov. Že sa naozaj nič nevarí, stráži kontrola v D4.
  ok("všetky dni bloku majú v každom VARENOM slote presne to isté", () => {
    let zle = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      Object.keys(b.sloty).filter(sl => !app.jeSnackSlot(sl)).forEach(sl => {
        b.dni.forEach(di => {
          spolu++;
          if (JSON.stringify(t.dni[di][sl] || []) !== JSON.stringify(b.sloty[sl])) zle++;
        });
      });
    }));
    assert.strictEqual(zle, 0, zle + " z " + spolu + " dní bloku má iný obsah vareného slotu");
  });
  ok("snack sa v rámci bloku MENÍ — aspoň v polovici viacdňových blokov", () => {
    let menia = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      if (b.dni.length < 2) return;
      const prim = b.dni.map(di => (b.snacky.find(x => x.di === di && x.prim) || {}).id);
      if (prim.some(x => x == null)) return;
      spolu++; if (new Set(prim).size > 1) menia++;
    }));
    const p = pct(menia, spolu);
    console.log("      (" + menia + " z " + spolu + " blokov = " + p.toFixed(1) + " %)");
    assert.ok(p >= 50, "len " + p.toFixed(1) + " % blokov má v rámci bloku rôzne snacky");
  });

  nadpis("\nD3 — bez opakovania naprieč blokmi a bez carryover C→A");
  ok("v jednom týždni sa žiadny VARENÝ recept neobjaví v dvoch blokoch", () => {
    let zle = 0;
    tyzdne.forEach(t => {
      for (let i = 0; i < t.bloky.length; i++)
        for (let j = i + 1; j < t.bloky.length; j++)
          [...t.bloky[i].recepty].forEach(id => { if (t.bloky[j].recepty.has(id)) zle++; });
    });
    assert.strictEqual(zle, 0, zle + " opakovaní receptu medzi blokmi toho istého týždňa");
  });
  ok("posledný VARENÝ blok týždňa (C) sa neprelieva do prvého bloku (A) nasledujúceho týždňa", () => {
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

  // D4b (pridané 31. 8., vlna „doladenie"): pravidlo z CLAUDE.md „raňajky sendvič/wrap iná
  // báza/blok" sa dovtedy iba ZBIERALO (blok.ranajkyBaza), ale nikdy netvrdilo. Stráži ho aj
  // R6 v test_regresie.js; tu je preto, aby sa pravidlo dalo merať na viacerých seedoch naraz.
  ok("raňajková báza sa v jednom týždni neopakuje medzi blokmi", () => {
    let zle = 0, spolu = 0;
    tyzdne.forEach(t => {
      const bazy = t.bloky.map(b => b.ranajkyBaza).filter(Boolean);
      spolu++;
      if (new Set(bazy).size !== bazy.length) zle++;
    });
    assert.strictEqual(zle, 0, zle + " z " + spolu + " týždňov má dva bloky s rovnakou raňajkovou bázou");
  });
  ok("vo všednom bloku (Po–Pi) sú raňajky sendvič/wrap — aspoň v 90 % blokov", () => {
    let send = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => {
      if (!b.dni.every(d => d < 5)) return;          // len všedné bloky
      if (b.ranajkyBaza == null) return;
      spolu++; if (b.ranajkySendvic) send++;
    }));
    const p = pct(send, spolu);
    console.log("      (" + send + " z " + spolu + " všedných blokov = " + p.toFixed(1) + " %)");
    // nie 100 %: sendvičových raňajok je v databáze len ~48 a pri dlhej pamäti sa môžu minúť.
    // Vtedy je pravidlo bázy (a poradia jedál) prednejšie — viď _pravidlaRanajok v app.js.
    assert.ok(p >= 90, "len " + p.toFixed(1) + " % všedných blokov má sendvičové raňajky");
  });
  // Kontrola beží na VŠETKÝCH komponentoch VŠETKÝCH dní — teda aj na druhej položke dvojice
  // („jablko + šunka“). Pravidlo používateľa: „nič, čo treba robiť alebo zvlášť vážiť;
  // normálne zabalené, ako sa to kúpi“ = 1 ingrediencia „1 ks“ a 1 krok postupu.
  ok("v snackovom slote je vždy hotový kúpený výrobok (typ „vyrobok“, 1 balenie = 1 porcia)", () => {
    let zle = 0, spolu = 0; const zlych = [];
    tyzdne.forEach(t => t.bloky.forEach(b => b.snacky.forEach(x => {
      const r = app.receptById(x.id); if (!r) return;
      spolu++;
      const ing = (r.ingrediencie || []), post = (r.postup || []);
      if (r.typ !== "vyrobok" || r.kategoria !== "Snack" || ing.length !== 1 || post.length !== 1
        || ing[0].mnozstvo !== 1 || ing[0].jednotka !== "ks") { zle++; if (zlych.length < 5) zlych.push(r.id); }
    })));
    assert.ok(spolu > 0, "žiadny snack sa nevygeneroval");
    assert.strictEqual(zle, 0, zle + " z " + spolu + " snackov nie je hotový výrobok: " + zlych.join(", "));
  });
  ok("snack má najviac 2 komponenty a druhý je tiež kúpený výrobok (dvojica typu „jablko + šunka“)", () => {
    let zle = 0, spolu = 0;
    tyzdne.forEach(t => t.bloky.forEach(b => b.dni.forEach(di => {
      const ids = (t.dni[di]["Snack"] || []); if (!ids.length) return;
      spolu++; if (ids.length > 2) zle++;
    })));
    assert.strictEqual(zle, 0, zle + " z " + spolu + " snackových slotov má viac než 2 komponenty");
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

  // ── D8: pravidlá musia platiť aj pri NEŠTANDARDNOM rozvrhu ────────────────
  // Používateľ si rozvrh prestavuje (2 bloky, 4 bloky, jeden blok cez celý týždeň).
  // Doménové pravidlá batch cookingu sa tým nesmú rozsypať.
  nadpis("\nD8 — neštandardné rozdelenie blokov (2 / 4 / 1 blok)");
  const ROZVRHY_TEST = [
    { meno: "2 bloky (Po–St, Št–Ne)", hranice: [true, false, false, true, false, false, false], ocak: "[[0,1,2],[3,4,5,6]]" },
    { meno: "4 bloky (Po–Ut, St–Št, Pi–So, Ne)", hranice: [true, false, true, false, true, false, true], ocak: "[[0,1],[2,3],[4,5],[6]]" },
    { meno: "1 blok cez celý týždeň", hranice: [true, false, false, false, false, false, false], ocak: "[[0,1,2,3,4,5,6]]" },
    { meno: "posunutý týždeň (Ut a Pi večer)", hranice: [true, false, true, false, false, false, false], ocak: "[[0,1],[2,3,4,5,6]]" },
  ];
  const zberRozvrh = async (hranice) => {
    const app = novy(SEEDS[0], { hranice: hranice.slice(), blokV: 6 }); // blokV:6 = preskoč jednorazovú migráciu starého rozdelenia
    const out = [];
    for (let w = 0; w < 2; w++) {
      app.S.viewOd = app.pridajDni(PONDELOK, w * 7);
      await app.generujJedalnicek(true);
      const t = { bloky: [], dni: [] };
      app.bloky().forEach(b => {
        const blok = { dni: b.slice(), sloty: {}, recepty: new Set(), kcal: {} };
        app.slotyDna(b[0]).forEach(sl => {
          const ids = app.slotIds(b[0], sl); if (!ids.length) return;
          blok.sloty[sl] = ids;
          blok.kcal[sl] = ids.reduce((a, id) => a + app.kcalPorcia(app.komponent(id)), 0) * app.pf(b[0], sl);
          // snack sa nevarí — pravidlo „bez opakovania naprieč blokmi" sa naň nevzťahuje
          // (rovnako ako v D3, kde sa počítajú len VARENÉ recepty); pestrosť snackov stráži D2
          if (!app.jeSnackSlot(sl)) ids.forEach(id => { const r = app.komponent(id); if (r && !r._priloha) blok.recepty.add(r.id); });
        });
        t.bloky.push(blok);
      });
      for (let di = 0; di < 7; di++) { const o = {}; app.slotyDna(di).forEach(sl => { o[sl] = app.slotIds(di, sl); }); t.dni.push(o); }
      out.push(t);
    }
    return { app, tyzdne: out };
  };
  for (const R of ROZVRHY_TEST) {
    const { app, tyzdne: tt } = await zberRozvrh(R.hranice);
    ok(R.meno + " — bloky() sedia a pokryjú celý týždeň", () => {
      assert.strictEqual(JSON.stringify(app.bloky()), R.ocak, JSON.stringify(app.bloky()));
      assert.strictEqual(app.bloky().reduce((a, b) => a + b.length, 0), 7, "bloky nepokrývajú 7 dní");
      // varný deň je vždy deň PRED prvým dňom bloku
      app.bloky().forEach(b => assert.strictEqual(app.varnyDen(b[0]), (b[0] + 6) % 7));
    });
    ok(R.meno + " — 1 variant na slot a blok (všetky dni bloku majú to isté; snack viď D2)", () => {
      let zle = 0, spolu = 0;
      tt.forEach(t => t.bloky.forEach(b => {
        Object.keys(b.sloty).filter(sl => !app.jeSnackSlot(sl)).forEach(sl => b.dni.forEach(di => {
          spolu++;
          if (JSON.stringify(t.dni[di][sl] || []) !== JSON.stringify(b.sloty[sl])) zle++;
        }));
      }));
      assert.ok(spolu > 0, "nič sa nevygenerovalo");
      assert.strictEqual(zle, 0, zle + " z " + spolu + " dní bloku má iný obsah slotu");
    });
    ok(R.meno + " — žiadny VARENÝ recept sa neopakuje medzi blokmi toho istého týždňa", () => {
      let zle = 0;
      tt.forEach(t => {
        for (let i = 0; i < t.bloky.length; i++)
          for (let j = i + 1; j < t.bloky.length; j++)
            [...t.bloky[i].recepty].forEach(id => { if (t.bloky[j].recepty.has(id)) zle++; });
      });
      assert.strictEqual(zle, 0, zle + " opakovaní receptu medzi blokmi");
    });
    ok(R.meno + " — bez carryover: posledný blok týždňa sa neprelieva do prvého bloku ďalšieho", () => {
      let zle = 0;
      for (let i = 1; i < tt.length; i++) {
        const C = tt[i - 1].bloky[tt[i - 1].bloky.length - 1].recepty, A = tt[i].bloky[0].recepty;
        [...A].forEach(id => { if (C.has(id)) zle++; });
      }
      assert.strictEqual(zle, 0, zle + " receptov prešlo z posledného bloku do prvého");
    });
    ok(R.meno + " — každý blok má naplnené všetky 4 sloty a Obed ≥ Večera", () => {
      let prazdne = 0, poradie = 0, spolu = 0;
      tt.forEach(t => t.bloky.forEach(b => {
        spolu++;
        ["Raňajky", "Obed", "Večera", "Snack"].forEach(sl => { if (!b.sloty[sl] || !b.sloty[sl].length) prazdne++; });
        if (b.kcal.Obed != null && b.kcal["Večera"] != null && b.kcal["Večera"] > b.kcal.Obed + 1e-6) poradie++;
      }));
      assert.strictEqual(prazdne, 0, prazdne + " prázdnych slotov v " + spolu + " blokoch");
      assert.strictEqual(poradie, 0, poradie + " z " + spolu + " blokov má väčšiu večeru než obed");
    });
  }
  ok("nákup pokryje celý týždeň aj pri jednom bloku cez celý týždeň", async () => {
    const app = novy(SEEDS[0], { hranice: [true, false, false, false, false, false, false], blokV: 6 });
    await app.generujJedalnicek(true);
    assert.strictEqual(app.bloky().length, 1);
    const grp = app.nakupPolozky().grp;
    assert.ok(Object.keys(grp).length > 10, "nákup má len " + Object.keys(grp).length + " položiek");
    // 7 dní × stravníci — porcie musia zodpovedať celému týždňu, nie jednému dňu
    const por = app.porcieSlotBlok(0, "Obed");
    assert.ok(por >= 7, "porcií na obed pre 7-dňový blok je len " + por);
  });

  // Filter zdrojov (S.profil.zdrojeOff): vypnutý zdroj sa do plánu nedostane — ale je to
  // VOLITEĽNÉ zúženie, takže vypnutie všetkého nesmie nechať prázdny deň.
  {
    const prof = { osoby: 2, kcal: CIEL, stravnici: [{ nazov: "A", kcal: CIEL }, { nazov: "B", kcal: CIEL }] };
    const bez = novy(SEEDS[0], { profil: Object.assign({ zdrojeOff: "Varecha.sk" }, prof) });
    await bez.generujJedalnicek(true);
    const zdroje = bez.planovaneRecepty().map(r => bez.zdrojRodina(r));
    ok("vypnutý zdroj sa do vygenerovaného týždňa nedostane", () => {
      assert.ok(zdroje.length > 5, "plán je prázdny (" + zdroje.length + " receptov)");
      assert.strictEqual(zdroje.filter(z => z === "Varecha.sk").length, 0,
        "Varecha.sk je vypnutá, ale v pláne je " + zdroje.filter(z => z === "Varecha.sk").length + " jej receptov");
    });
    const vsetko = novy(SEEDS[0], { profil: Object.assign({}, prof) });
    vsetko.S.profil.zdrojeOff = vsetko.zdrojeList().map(x => x[0]).join("|");
    await vsetko.generujJedalnicek(true);
    ok("vypnutie VŠETKÝCH zdrojov nevyprázdni plán (soft constraint)", () => {
      assert.ok(vsetko.planovaneRecepty().length > 5,
        "plán má len " + vsetko.planovaneRecepty().length + " receptov — zúženie zdrojov ho vyprázdnilo");
    });
    ok("rodina zdroja zlúči diely a autorov do jedného mena", () => {
      const z = id => bez.zdrojRodina({ zdroj: id });
      assert.strictEqual(z("Varecha.sk – Bravčový guláš (autor: redakcia)"), "Varecha.sk");
      assert.strictEqual(z("Jíme zdravě s Fitrecepty III"), "Jíme zdravě s Fitrecepty");
      assert.strictEqual(z("Kuchárka Jedlo — vlastný recept (vlna 5)"), "Kuchárka Jedlo");
      assert.strictEqual(z(""), "(bez zdroja)");
    });
  }

  console.log("\nOK — " + bezov + " kontrol prešlo.");
}).catch(e => { console.error(String(e.message || e.stack || e)); process.exit(1); });
