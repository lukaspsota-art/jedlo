#!/usr/bin/env node
// „Soľ 1 ks“, „Voda 2 ks“, „Kyslá smotana 1 ks“ — import z Varechy dal jednotku „ks“
// aj surovinám, ktoré sa na kusy nepočítajú. `gZaJednotku` na ne nemá `g_za_ks`,
// takže app.js im TICHO priradí 0 g → 0 kcal a 0 € v nákupe (audit P2-1, R2a).
// Oprava (bez vymýšľania čísel, kde sa dá):
//   1. potravina má `balenie_g` → „1 ks“ = jedno balenie, prepíše sa na gramy
//   2. korenie, bylinky a nenapárované suroviny → množstvo `null` + „podľa chuti“
//   3. zelenina a ovocie → 150 g za kus (stredne veľký kus), mäso a ryby → 200 g
// data/potraviny.json patrí inému agentovi, preto sa mení recept, nie číselník.
// Spusti: node scripts/oprav_jednotky_ks.js [--dry]
"use strict";
const L = require("./lib_recepty");
const app = require("../test_harness").load({ seed: 1 });
const DRY = process.argv.includes("--dry");

const KS = ["ks", "kus", "plátok", "platok"];
const NA_KUS = { "Zelenina a ovocie": 150, "Mäso a ryby": 200 };

const R = L.nacitaj();
let bal = 0, chut = 0, odhad = 0, suborov = 0;
for (const r of R) {
  if (L.jeSnack(r)) continue;
  let zmena = false;
  for (const i of r.ingrediencie || []) {
    if (i.mnozstvo == null) continue;
    const j = (i.jednotka || "").toLowerCase();
    if (!KS.includes(j)) continue;
    const p = app.najdiPotravinu(i.nazov);
    const g = p && (j.startsWith("pl") ? p.g_za_platok : p.g_za_ks);
    if (g) continue;                                    // v poriadku, prepočet existuje
    if (p && p.balenie_g) { i.mnozstvo = Math.round(i.mnozstvo * p.balenie_g); i.jednotka = "g"; bal++; }
    else if (p && NA_KUS[p.oddelenie]) { i.mnozstvo = Math.round(i.mnozstvo * NA_KUS[p.oddelenie]); i.jednotka = "g"; odhad++; }
    else { i.mnozstvo = null; i.jednotka = ""; if (!i.poznamka) i.poznamka = "podľa chuti"; chut++; }
    zmena = true;
  }
  if (zmena) { if (!DRY) L.zapis(r); suborov++; }
}
console.log((DRY ? "[DRY] " : "") +
  `receptov: ${suborov} · prepočítaných cez balenie: ${bal} · odhad podľa kusa: ${odhad} · „podľa chuti“: ${chut}`);
