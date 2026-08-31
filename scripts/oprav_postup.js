#!/usr/bin/env node
// Čistenie POSTUPU receptov prevzatých z Varechy.
// Import zobral text blogového príspevku, takže v postupe zostalo rozprávanie v 1. osobe
// („Ja som posypala jeden obrus múkou“), odkazy na fotky a iné recepty, emotikony
// a kroky dlhé aj 900 znakov — v režime varenia sa postup ukazuje krok po kroku,
// takže dlhý krok znamená, že používateľ pri hrnci nevidí, čo má robiť.
//
// Čo skript robí (v tomto poradí):
//   1. rozbije zlepené vety („.Umyté mäso“ → „. Umyté mäso“) a poskladá vety
//   2. vyhodí odkazy (http…), emotikony a poznámky o fotení
//   3. vzťažné vety v 1. os. mn. č. prepíše na 2. os. j. č. („ktorú sme nakrájali“ → „ktorú si nakrájal“)
//   4. vyhodí vety, ktoré sú číre rozprávanie (obsahujú „som“/„sme“ a žiaden rozkaz)
//   5. rozdelí kroky dlhšie než 400 znakov na hranici viet (cieľ ~300 znakov)
// Recept nikdy neostane bez postupu — ak by po čistení nezostal ani jeden krok,
// pôvodný postup sa ponechá.
// Snacky (177 receptov) patria inému agentovi a skript sa ich nedotýka.
// Spusti: node scripts/oprav_postup.js [--dry] [--ukazky N]
"use strict";
const L = require("./lib_recepty");
const { rozkaz } = require("./lib_slovesa");
const DRY = process.argv.includes("--dry");
const UK = (() => { const i = process.argv.indexOf("--ukazky"); return i > 0 ? +process.argv[i + 1] : 0; })();

const S = (re, f) => new RegExp(re, f || "iu");
const slovo = s => "(?<!\\p{L})(?:" + s + ")(?!\\p{L})";

const ROZKAZY = "nakrájaj|pokrájaj|krájaj|pridaj|primiešaj|premiešaj|zmiešaj|vmiešaj|miešaj|" +
  "opeč|upeč|peč|uvar|var|povar|nechaj|daj|vlož|polož|posyp|zalej|nalej|prilej|vyber|ozdob|" +
  "podávaj|servíruj|rozmixuj|mixuj|rozohrej|predhrej|zohrej|osoľ|okoreň|prikry|sceď|preceď|" +
  "vyšľahaj|šľahaj|nastrúhaj|strúhaj|olúp|ošúp|umy|zlej|rozpusť|natri|nanes|stiahni|odstav|" +
  "obaľ|naklep|vytvaruj|tvaruj|rozvaľkaj|vyvaľkaj|nasyp|vsyp|vysyp|prisyp|odlož|dus|restuj|" +
  "orestuj|smaž|osmaž|opekaj|vypracuj|spracuj|zabaľ|prepláchni|namoč|zaprav|dochuť|ochuť|" +
  "posoľ|očisti|priprav|urob|sprav|použi|skladaj|napichaj|povyberaj|scedi|rozotri|potri|" +
  "vymiešaj|vyklop|preklop|dopeč|dopekaj|dokonči|prevar|zavar|zahusti|zjemni|nakysni|vykysni";
const JE_ROZKAZ = S(slovo(ROZKAZY));
const JE_OSOBA = S(slovo("som|sme"));

// --- 1. veta po vete ------------------------------------------------------
const SKRATKY = /(?:^|\s)(?:hl|pol|napr|tzv|cca|min|hod|kg|dkg|dl|ml|ks|tj|resp|atď|apod|str|obr|č|s|p|ev|príp)\.$/i;
function naVety(t) {
  const rozbite = t
    .replace(/([.!?…])([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ])/g, "$1 $2")   // „.Umyté“ → „. Umyté“
    .replace(/\s*\n+\s*/g, " ");
  const kusy = rozbite.split(/(?<=[.!?…])\s+/);
  const out = [];
  for (const k of kusy) {
    // bodka za skratkou alebo číslom nie je koniec vety — prilep k predchádzajúcemu
    if (out.length && (SKRATKY.test(out[out.length - 1]) || /(?:^|\s)\d+\.$/.test(out[out.length - 1])))
      out[out.length - 1] += " " + k;
    else out.push(k);
  }
  return out.map(v => v.trim()).filter(Boolean);
}

// --- 2. blogový balast ----------------------------------------------------
function ocisti(v) {
  return v
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\((?=[^)]*(?:\p{L}*\bsom\b|\bsme\b))[^)]*\)/giu, "")   // „(my sme to nevydržali)“
    .replace(/[:;=][-^]?[)(DPpo3]+/g, "")                            // :-) :D ;)
    .replace(/[☺☻🙂😊😉😀🤗👍❤️]/gu, "")
    .replace(/\.{3,}/g, " ")
    .replace(/(\p{L}),(?=\p{L})/gu, "$1, ")            // „prepláchni,var“ → „prepláchni, var“
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}

// --- 3. rozprávanie v 1. osobe → rozkaz v 2. os. j. č. -------------------
// „Ja som pridala cukor“ → „Pridaj cukor“; „ktorú sme nakrájali“ → „ktorú nakrájaj“.
// Prevádza sa LEN l-príčastie, ktoré stojí do štyroch slov od pomocného „som/sme“
// (slovenské „som“ sa viaže na svoje sloveso) a prípadné sloveso pripojené za „a“/„,“.
// Príčastia v inej vete alebo vo vedľajšej vete („Keď sa varila 5 minút“) sa nechávajú tak,
// inak by vznikli nezmysly.
function prepisOsobu(v) {
  if (!/(?<!\p{L})(som|sme)(?!\p{L})/iu.test(v)) return { v, ok: true };
  const tok = v.split(/(\s+)/);                       // aj medzery, aby sa dal text zložiť späť
  const je = i => tok[i] !== undefined && /\p{L}/u.test(tok[i]);
  const holy = i => (tok[i] || "").replace(/[^\p{L}]/gu, "");
  const zvysok = i => (tok[i] || "").slice(holy(i).length ? (tok[i].indexOf(holy(i)) + holy(i).length) : 0);
  let zmena = false;
  for (let i = 0; i < tok.length; i++) {
    if (!/^(som|sme)$/i.test(holy(i))) continue;
    let kde = -1;
    for (let d = 1; d <= 8 && kde < 0; d++) {          // ±4 slová = ±8 tokenov (slovo, medzera…)
      for (const j of [i - d, i + d]) {
        if (!je(j) || j === i) continue;
        if (rozkaz(holy(j))) { kde = j; break; }
      }
    }
    if (kde < 0) continue;
    const nahrad = k => {
      const h = holy(k), r = rozkaz(h);
      if (!r) return false;
      const vel = h[0] === h[0].toUpperCase() && h[0] !== h[0].toLowerCase();
      tok[k] = tok[k].replace(h, vel ? r[0].toUpperCase() + r.slice(1) : r);
      return true;
    };
    nahrad(kde); zmena = true;
    // „…zlial a dal variť“ → aj druhé sloveso za spojkou
    for (let j = kde + 2; j < Math.min(kde + 7, tok.length); j += 2) {
      const h = holy(j);
      if (/^(a|aj|potom|následne)$/i.test(h) || /^[,]$/.test(tok[j])) continue;
      if (rozkaz(h)) { nahrad(j); }
      break;
    }
    tok[i] = tok[i].replace(/(?<!\p{L})(som|sme)(?!\p{L})/iu, "");
    if (je(i - 2) && /^(ja|my)$/i.test(holy(i - 2))) tok[i - 2] = tok[i - 2].replace(/(?<!\p{L})(ja|my)(?!\p{L})/iu, "");
    if (je(i + 2) && /^si$/i.test(holy(i + 2))) { /* „som si“ → „si“ ostáva */ }
  }
  if (!zmena) return { v, ok: false };
  let t = tok.join("")
    .replace(/\s{2,}/g, " ").replace(/\s+([,.;!?])/g, "$1")
    .replace(/^[\s,]+/, "").trim();
  if (t) t = t[0].toUpperCase() + t.slice(1);
  return { v: t, ok: true };
}

// vety, ktoré oslovujú čitateľa blogu a nie sú návodom
const BLOG = /^(verím|dúfam|prajem|snáď|tak toto|a tak|čuduj sa|tu je|pozn\.|foto|nefoť)/iu;

// --- 5. delenie dlhých krokov --------------------------------------------
function rozdel(krok, max = 400, ciel = 300) {
  if (krok.length <= max) return [krok];
  const vety = naVety(krok);
  if (vety.length < 2) return [krok];
  const out = []; let cur = "";
  for (const v of vety) {
    if (cur && (cur + " " + v).length > ciel) { out.push(cur); cur = v; }
    else cur = cur ? cur + " " + v : v;
  }
  if (cur) out.push(cur);
  return out;
}

const R = L.nacitaj().filter(r => !L.jeSnack(r));
let zmenene = 0, zmazVet = 0, prepis = 0, rozdelene = 0, balast = 0;
const ukazky = [];

for (const r of R) {
  const povodny = r.postup || [];
  if (!povodny.length) continue;
  let novy = [];
  for (const krok of povodny) {
    const vety = naVety(String(krok));
    const ostatok = [];
    for (let v of vety) {
      const pred = v;
      v = ocisti(v);
      if (JE_OSOBA.test(v)) { const p = prepisOsobu(v); if (p.ok && p.v !== v) { v = p.v; prepis++; } }
      if (!v || !/\p{L}/u.test(v)) continue;
      if (JE_OSOBA.test(v) && !JE_ROZKAZ.test(v)) { zmazVet++; continue; }   // rozprávanie, ktoré sa prepísať nedá
      if (BLOG.test(v) && !JE_ROZKAZ.test(v)) { zmazVet++; continue; }        // oslovenie čitateľa blogu
      if (v !== pred) balast++;
      ostatok.push(v);
    }
    if (ostatok.length) novy.push(ostatok.join(" "));
  }
  if (!novy.length) novy = povodny.slice();                                  // poistka
  const pred = novy.length;
  novy = novy.flatMap(k => rozdel(k));
  rozdelene += novy.length - pred;
  if (JSON.stringify(novy) !== JSON.stringify(povodny)) {
    if (ukazky.length < UK) ukazky.push({ id: r.id, pred: povodny, po: novy });
    r.postup = novy;
    if (!DRY) L.zapis(r);
    zmenene++;
  }
}
console.log((DRY ? "[DRY] " : "") +
  `upravených receptov: ${zmenene} · zmazaných naratívnych viet: ${zmazVet} · ` +
  `prepísaných na 2. osobu: ${prepis} · nových krokov delením: ${rozdelene} · očistených viet: ${balast}`);
for (const u of ukazky) {
  console.log("\n=== " + u.id);
  u.pred.forEach((k, i) => console.log("  - " + k.slice(0, 200)));
  console.log("  →");
  u.po.forEach(k => console.log("  + " + k.slice(0, 200)));
}
