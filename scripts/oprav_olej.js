// OPRAVA VYPRÁŽANÉHO/NAKLADANÉHO OLEJA — zapíše do recepty/*.json príznak `vsiaknutie`
// na tú konkrétnu tukovú ingredienciu, ktorá sa NEZJE celá.
//
// `vsiaknutie` je číslo 0–1 = podiel suroviny, ktorý sa naozaj dostane do jedla.
// Je na INGREDIENCII, nie na recepte, lebo jeden recept mieša oboje: musaka má 600 ml oleja
// na vyprážanie (vsiakne ~25 %) aj 170 g masla v bešamele (zje sa celé).
// Nákup a špajza pracujú s PLNÝM množstvom — olej sa musí kúpiť celý.
//
// Koeficienty (literatúra o vyprážaní + zdravý rozum):
//   0,12  nálev v pohári (nakladaná zelenina/syr) — olej sa zleje, na surovine zostane film
//   0,15  cestíčko (batter), vyprážanie v hlbokom oleji
//   0,18  trojobal (múka-vajce-strúhanka) — strúhanka nasaje viac než cestíčko
//   0,20  opekanie v kaluži oleja na panvici (ryba, obalené mäso)
//   0,25  plátky baklažánu/cukety/zemiakov — hubovitá zelenina nasaje najviac
//   0,30  marináda, z ktorej sa mäso pred grilovaním vyberie
//   1,00  restovanie, zásmažka, cesto, nátierka — tuk sa zje celý (žiadny príznak)
//
//   node scripts/oprav_olej.js            suchý beh
//   node scripts/oprav_olej.js --zapis    zapíše
const fs = require("fs"), path = require("path");
const { load } = require("../test_harness");
const P = require("./lib_patch_json");
const ZAPIS = process.argv.includes("--zapis");
const DIR = path.join(__dirname, "..", "recepty");
const app = load({ stav: {} });

// prepocitaj:true = deklarované kcal_na_porciu bolo samo odvodené z nafúknutého výpočtu → prepíš ho.
// prepocitaj:false = kcal_na_porciu je skutočne kurátorované (z magazínu/knihy) → nechaj, oprav len makrá.
const TABULKA = [
  { id: "vyborne-vyprazane-agatove-kvety", prepocitaj: true,  dovod: "vyprážanie v hlbokom oleji, cestíčko",
    ing: [["Slnečnicový olej", 0.15]], okNenaparene: ["Agátové kvety"] },   // kvet váži ~2 g a nemá kalórie
  { id: "hubovy-cordon-bleu",              prepocitaj: true,  dovod: "vyprážanie v hlbokom oleji, trojobal",
    ing: [["Slnečnicový olej", 0.18]] },
  { id: "medailoniky-z-bravcovej-panenky-s-parmezanom", prepocitaj: true, dovod: "kaluž oleja/masti/masla na vyprážanie obalených medailónikov",
    ing: [["Rastlinný olej", 0.20], ["Bravčová masť", 0.20], ["Maslo", 0.20]] },
  { id: "losos-so-sosovicou",              prepocitaj: true,  dovod: "200 ml oleja na opekanie filiet na panvici",
    ing: [["Olivový olej", 0.20]] },
  { id: "musaka",                          prepocitaj: false, dovod: "600 ml na vyprážanie plátkov baklažánu/cukety/zemiakov; maslo v bešamele sa zje celé",
    ing: [["Slnečnicový olej", 0.25]] },
  { id: "nakladana-mozzarella",            prepocitaj: false, dovod: "olivový olej ako nálev v pohári, zleje sa",
    ing: [["Olivový olej", 0.12]] },
  { id: "nalozene-papriky",                prepocitaj: false, dovod: "slnečnicový olej ako nálev v zaváraninovej fľaši",
    ing: [["Slnečnicový olej", 0.12]] },
  { id: "nakladany-hermelin-na-kyslo",     prepocitaj: true,  dovod: "olej ako nálev v pohári, zleje sa",
    ing: [["Slnečnicový olej", 0.12]] },
  { id: "jelenie-v-pikantnej-marinade",    prepocitaj: true,  dovod: "olej v marináde, mäso sa z nej vyberie a opečie",
    ing: [["Slnečnicový olej", 0.30]] },
  { id: "jahnacie-kare-s-baklazanovym-kaviarom-a-raviolou", prepocitaj: true, dovod: "olej v naložení karé pred grilovaním",
    ing: [["Slnečnicový olej", 0.30]] },
];

// Poistka: kcal_na_porciu prepíšeme LEN vtedy, keď je výpočet úplný. Ak recept obsahuje
// nenapárovanú surovinu s hmotnosťou > 100 g (typicky hlavná bielkovina — „Karé jelenie“,
// „Heremelín“), výpočet ju nevidí a prepis by kalórie podstrelil ešte viac než nafúknutý olej.
// Taký recept dostane len príznak `vsiaknutie` a nenapárovaná surovina ide do reportu.
const LIMIT_NENAPARENE = 100;

let zmien = 0;
for (const t of TABULKA) {
  const cesta = path.join(DIR, t.id + ".json");
  if (!fs.existsSync(cesta)) { console.log("CHÝBA " + t.id); continue; }
  let txt = P.nacitaj(cesta);
  const r = JSON.parse(txt);
  const por = r.porcie || 1;
  let kcalPred = 0, kcalPo = 0, oznacene = [], nenaparene = [];
  (r.ingrediencie || []).forEach(i => {
    const p = app.najdiPotravinu(i.nazov);
    if (!p) {
      const h = app.odhadHmoty(i);
      if (h > LIMIT_NENAPARENE && !(t.okNenaparene || []).includes(i.nazov)) nenaparene.push(i.nazov + " ~" + Math.round(h) + " g");
      return;
    }
    const g = app.gramy(i, p);
    if (!(g > 0)) return;
    const kc = g * p.kcal / 100;
    kcalPred += kc;
    const pravidlo = t.ing.find(([n]) => i.nazov.toLowerCase().startsWith(n.toLowerCase()));
    if (pravidlo) { i.vsiaknutie = pravidlo[1]; oznacene.push([i.nazov, pravidlo[1]]); kcalPo += kc * pravidlo[1]; }
    else kcalPo += kc;
  });
  if (!oznacene.length) { console.log("!! " + t.id + " — žiadna ingrediencia nesedela na pravidlo"); continue; }
  const stary = r.kcal_na_porciu || null, novy = Math.round(kcalPo / por);
  const prepis = t.prepocitaj && !nenaparene.length;
  console.log(t.id.padEnd(48).slice(0, 48) + " " + String(Math.round(kcalPred / por)).padStart(5) + " → " +
    String(novy).padStart(5) + " kcal/porcia   dekl=" + (stary == null ? "—" : stary) +
    (prepis ? "  ZAPÍŠEM " + novy : "  (dekl. ponechaná)") + "   [" + oznacene.map(o => o[0] + " ×" + o[1]).join(", ") + "]" +
    (nenaparene.length ? "\n      ⚠ nenapárované: " + nenaparene.join(", ") + " → kcal_na_porciu NEPREPISUJEM, patrí to do potraviny.json" : ""));
  if (!ZAPIS) continue;
  let od = 0;
  for (const [nazov, c] of oznacene) { const v = P.nastavVIngrediencii(txt, nazov, "vsiaknutie", c, od); txt = v.txt; od = v.koniec; }
  if (prepis) {
    txt = P.nastavPole(txt, "kcal_na_porciu", novy, "cas");
    txt = P.nastavPole(txt, "kcal_zdroj", "korekcia_olej", "kcal_na_porciu");
  }
  P.zapis(cesta, txt); zmien++;
}
console.log(ZAPIS ? "\nzapísaných súborov: " + zmien : "\n(suchý beh — spusti s --zapis)");
