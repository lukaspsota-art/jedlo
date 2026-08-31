#!/usr/bin/env node
// Hľadá recepty, ktorých NÁZOV sľubuje surovinu, čo v recepte nie je.
// Príčina: import z portálov (a generovanie „variantov“ z jedného zdrojového receptu)
// vyrobil názvy, ktoré s obsahom nesúvisia — „Fazuľová polievka bez mäsa“ s údenými
// rebierkami, „Banán“ ako kakaová torta.
// Metóda: slová názvu, ktoré sú niekde v databáze názvom suroviny, sa hľadajú
// v surovinách a v postupe TOHTO receptu (kmeň + prefix, kvôli skloňovaniu).
// Spusti: node scripts/audit_nazvy.js [--limit N] [--kategoria X] [--json súbor]
"use strict";
const fs = require("fs");
const L = require("./lib_recepty");

const bezDia = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slova = s => bezDia(s).replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);

// slová, ktoré nie sú surovinou: predložky, spojky, druhy jedál, spôsoby prípravy, prívlastky
const STOP = new Set(`a i s so v vo z zo na do od pre bez po pri za k ku o u nad pod cez medzi
alebo ale aj ani ako co ze je su ich nas vas moj tvoj ten ta to tie ti tento tato toto
salat salatik polievka polievocka natierka nakyp kolac kolacik torta torticka zakusok rezy rez
sendvic sendvice wrap wrapy toast toasty bageta bagetka pizza pizzy cestoviny cestovinovy
rizoto gulas kasa kasicka smoothie sejk shake napoj drink kokteil koktail limonada caj kava
placky placka palacinky palacinka lievance muffiny muffin susienky susienka chlieb chlebik
zemla zemle rozok rozky buchty buchta kolacky knedla knedle halusky pirohy pirohy tortilla
peceny pecena pecene peceni vyprazany vyprazana vyprazane duseny dusena dusene varena vareny
varene grilovany grilovana grilovane zapekany zapekana zapekane plneny plnena plnene
studeny studena studene teply tepla teple horuci horuca horuce rychly rychla rychle rychlo
domaci domaca domace domaci klasicky klasicka klasicke jednoduchy jednoducha jednoduche
letny letna letne zimny zimna zimne jesenny jarny svieza sviezi sviezy lahky lahka lahke
krasny krasna vyborny vyborna slovensky slovenska slovenske taliansky talianska talianske
francuzsky francuzska anglicky anglicka americky americka nemecky nemecka grecky grecka
azijsky azijska cinsky cinska japonsky japonska indicky indicka thajsky thajska mexicky mexicka
spanielsky spanielska madarsky madarska rakusky rakuska polsky polska turecky turecka
babkin babkina mamin mamina fitness proteinovy proteinova proteinove dietny dietna bezlepkovy
vegan veganske vegetarianske nizkosacharidovy fotorecept recept variant verzia style stylu
mini maxi velky velka male maly velke novy nova nove stary stara priloha prilohy
biely biela biele bielym bielou cierny cierna cierno zelen zeleny hnedy hneda hnedej
plnom plnou podla sladko kyslo pare hriby platky plece pasteta pita lavas bucatini
tagliatelle spaghetti massaman tzatziki creme fish chips bravas pyre panzanella
morskou jarne jarny pestre pestry mliecne mliecny susenym susena peceny pecena pecenej
pecenymi husacia neprava falosna maso masom masa masovy masove kari
kremovy kremova kremove hustý hust chrumkavy chrumkava chrumkave stavnaty pikantny pikantna
pikantne sladky sladka sladke slany slana slane kysly kysla kysle jemny jemna jemne
raňajky ranajky obed vecera desiata olovrant snack dezert dezertik
zmes zmesi omacka omacke omackou dresing dresingom sirup krem naplň naplna kruста krusta
kusky kuskami plnkou plnka bowl misa misy tanier tanieri porcia porcie kus kusov
na v s zo`.split(/\s+/).filter(Boolean));

const R = L.nacitaj();

// slovník surovín: slová z kľúčov databázy potravín (data/potraviny.json) — teda len
// skutočné potraviny. Slová zo samotných receptov by prepustili prívlastky („biele“, „baby“).
const VOCAB = new Set();
for (const p of JSON.parse(require("fs").readFileSync(
      require("path").join(__dirname, "..", "data", "potraviny.json"), "utf8")))
  for (const w of slova(p.kluc)) if (w.length >= 4) VOCAB.add(w);

// Slovenské skloňovanie: odrežeme najdlhšiu známu koncovku, kým zvyšok má aspoň 3 znaky.
// „mätou“→„mät“, „syrom“→„syr“, „hubová“→„hub“, ale „maslom“→„masl“ ≠ „mäso“→„mäs“.
const KONCOVKY = ["ovymi", "ovych", "oveho", "ovej", "ovou", "ovym", "ove", "ova", "ovy", "ovo",
  "ami", "ach", "och", "eho", "ych", "ymi", "imi", "ich", "iam", "ie", "ia", "im", "ou", "ov",
  "om", "ym", "ej", "mi", "ka", "ky", "y", "a", "e", "i", "u", "o"];
function kmen(w) {
  for (const k of KONCOVKY) if (w.length - k.length >= 3 && w.endsWith(k)) return w.slice(0, -k.length);
  return w;
}
// nepravidelné dvojice, kde kmeň nesadne
const SYNONYMA = { vajecn: "vajc", vajec: "vajc", kurac: "kur", kurc: "kur", kuriatk: "kur",
  chill: "cil", chilli: "cil", kvasnic: "drozd", kvasnicov: "drozd", mas: "maso", masov: "maso", ovocn: "ovoci", mliecn: "mliek", hrib: "hub",
  hubov: "hub", zemiacik: "zemiak", tvarohov: "tvaroh", masov: "mas", rybac: "ryb", rybi: "ryb",
  kurac: "kur", kurca: "kur", kuriatk: "kur", morciac: "morcac", bravcov: "bravcov", cokoladov: "cokolad",
  smotanov: "smotan", jogurtov: "jogurt", paradajkov: "paradajk", citronov: "citron", makov: "mak",
  medov: "med", orechov: "orech", syrov: "syr", cesnakov: "cesnak", maslov: "masl", kremov: "krem" };
const norm2 = w => { const k = kmen(w); return SYNONYMA[k] || k; };

function telo(r) {
  // zámerne BEZ popisu a tagov — tie import odvodil z názvu, takže by lož potvrdili
  return slova([(r.ingrediencie || []).map(i => i.nazov + " " + (i.poznamka || "")).join(" "),
    (r.postup || []).join(" ")].join(" "));
}

function analyzuj(r) {
  const t = telo(r);
  const tk = new Set(t.map(norm2));
  const chyba = [];
  for (const w of slova(r.nazov)) {
    if (w.length < 4 || STOP.has(w)) continue;
    const k = norm2(w);
    if (![...VOCAB].some(v => norm2(v) === k)) continue;       // nie je to potravina z číselníka
    if (tk.has(k)) continue;
    if ([...tk].some(x => x.startsWith(k) || k.startsWith(x)) && k.length >= 4) continue;
    chyba.push(w);
  }
  return chyba;
}

const najdene = [];
for (const r of R) {
  const ch = analyzuj(r);
  if (ch.length) najdene.push({ id: r.id, f: r._f, kat: r.kategoria, nazov: r.nazov, chyba: ch,
    sur: (r.ingrediencie || []).map(i => i.nazov).join(", ").slice(0, 90), snack: L.jeSnack(r) });
}
najdene.sort((a, b) => b.chyba.length - a.chyba.length || a.id.localeCompare(b.id));

const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const filtr = arg("--kategoria");
const zoznam = filtr ? najdene.filter(x => x.kat === filtr) : najdene;
const limit = +(arg("--limit") || 60);

console.log(`podozrivých názvov: ${najdene.length} / ${R.length} (${(najdene.length / R.length * 100).toFixed(1)} %)` +
  ` · mimo kategórie Snack: ${najdene.filter(x => !x.snack).length}`);
for (const x of zoznam.slice(0, limit))
  console.log(`  [${x.chyba.join(",")}] ${x.id} (${x.kat}) „${x.nazov}“ ← ${x.sur}`);
const out = arg("--json");
if (out) fs.writeFileSync(out, JSON.stringify(najdene, null, 1));
