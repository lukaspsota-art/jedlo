// AUDIT konzistencie data/potraviny.json — „zdravý rozum" nad databázou potravín.
//
//   node scripts/audit_potraviny.js              všetky kontroly
//   node scripts/audit_potraviny.js --kod K3     len jedna kontrola
//   node scripts/audit_potraviny.js --csv        strojovo spracovateľný výstup
//
// Kontroly:
//   K1  kcal ≉ 4·B + 9·T + 4·S (tolerancia 20 % a ±25 kcal)
//   K2  záporné hodnoty / nezmyselné nuly (0 kcal pri surovine s makrami, 0 kcal mimo whitelistu)
//   K3  hustota mimo 0,5–1,5
//   K4  g_za_ks / g_za_platok mimo rozumného rozsahu
//   K5  oddelenie mimo číselníka PORADIE_ODDELENI
//   K6  chýbajúci zjavný alergén (orechy, mlieko, lepok, vajcia, ryby, sója, sezam)
//   K7  duplicitné kľúče a prekrývajúce sa kľúče s ROZDIELNYMI hodnotami
//   K8  cena100: null (neznáma cena) a cena mimo rozumného rozsahu
//   K9  chýbajúca vláknina/sodík tam, kde ich surovina mať má
//   K10 balenie_g bez balenie_popis (a naopak) / nezmyselná veľkosť balenia
const { load } = require("../test_harness");
const app = load({ stav: {} });
const P = app.POTRAVINY;
const argv = process.argv.slice(2);
const iba = (argv.indexOf("--kod") >= 0) ? argv[argv.indexOf("--kod") + 1] : null;
const csv = argv.includes("--csv");

const bezDia = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const N = [];
const chyba = (kod, p, text) => { if (!iba || iba === kod) N.push({ kod, kluc: p.kluc, text }); };

// ── K1 energetická bilancia ────────────────────────────────────────────────────
// Atwater počíta vlákninu 2 kcal/g, nie 4 — bez toho by každá korenina vyzerala ako chyba.
// Alkohol (7 kcal/g etanolu) a polyoly do makier vôbec nevstupujú, preto sú mimo kontroly.
const ETANOL = p => p.oddelenie === "Alkohol" ||
  /^(vodka|gin|rum|tequila|whisk|bourbon|brandy|konak|cognac|kalvados|cachaca|kirsch|sherry|vino|pivo|prosecco|sampanske|aperol|campari|bitter|becherovka|amaretto|limoncello|mirin|shaoxing|vanilkov|kavovy liker|blue curacao|creme de cassis|jahodovy liker|kirschwasser|triple sec|skotska whisky|sladky vermut|suchy vermut|mandlova aroma|rumova aroma|vaječn)/.test(bezDia(p.kluc));
const POLYOL = p => /^(xylitol|erythritol|stévi|sladidlo|kypriac|prášok do pečiva|kypriaci prášok|sóda|psyllium)/.test(p.kluc);
P.forEach(p => {
  if (ETANOL(p) || POLYOL(p)) return;
  const vl = Math.min(p.vlaknina || 0, p.sacharidy || 0);
  const vyp = 4 * (p.bielkoviny || 0) + 9 * (p.tuky || 0) + 4 * ((p.sacharidy || 0) - vl) + 2 * vl;
  if (p.kcal === 0 && vyp === 0) return;
  const d = Math.abs(vyp - p.kcal);
  // pri surovinách bohatých na vlákninu je Atwater len hrubý odhad (databázy uvádzajú
  // meranú energiu), preto širšia toleranciа
  const tol = (p.vlaknina || 0) >= 15 ? 0.4 : 0.2;
  if (d > 25 && d > tol * Math.max(p.kcal, vyp))
    chyba("K1", p, "kcal " + p.kcal + " vs. 4B+9T+4(S−vl)+2vl = " + Math.round(vyp) +
      "  (B " + p.bielkoviny + " / T " + p.tuky + " / S " + p.sacharidy + " / vl " + p.vlaknina + ", tol " + Math.round(tol*100) + " %)");
});

// ── K2 záporné a nezmyselné nuly ───────────────────────────────────────────────
const NULA_OK = ["soľ", "voda", "ľad", "sóda", "korenie", "stévi", "perlivá voda", "bylinková soľ",
  "rýchlosoľ", "sanitra", "želatín", "agar", "agarov", "kypriac", "škrob", "psyllium", "minerálk", "sóda bikarbóna", "jedlá sóda"];
P.forEach(p => {
  ["kcal", "bielkoviny", "tuky", "sacharidy", "vlaknina", "sodik", "cena100", "hustota"].forEach(k => {
    if (typeof p[k] === "number" && p[k] < 0) chyba("K2", p, k + " je záporné: " + p[k]);
  });
  const vyp = 4 * (p.bielkoviny || 0) + 9 * (p.tuky || 0) + 4 * (p.sacharidy || 0);
  if (p.kcal === 0 && vyp > 20) chyba("K2", p, "kcal = 0, ale makrá dávajú " + Math.round(vyp) + " kcal");
  if (p.kcal === 0 && vyp === 0 && !NULA_OK.includes(p.kluc))
    chyba("K2", p, "nulová energia aj makrá — je to naozaj potravina bez energie?");
  if (!(p.hustota > 0)) chyba("K2", p, "hustota nie je kladná: " + p.hustota);
});

// ── K3 hustota ─────────────────────────────────────────────────────────────────
P.forEach(p => {
  if (p.hustota < 0.3 || p.hustota > 1.5)
    chyba("K3", p, "hustota " + p.hustota + " je mimo 0,3–1,5 (g/ml)");
});

// ── K4 hmotnosť kusa a plátku ──────────────────────────────────────────────────
P.forEach(p => {
  if (p.g_za_ks != null && (p.g_za_ks <= 0 || p.g_za_ks > 3000))
    chyba("K4", p, "g_za_ks = " + p.g_za_ks + " (mimo 0–3000 g)");
  if (p.g_za_platok != null && (p.g_za_platok <= 0 || p.g_za_platok > 200))
    chyba("K4", p, "g_za_platok = " + p.g_za_platok + " (mimo 0–200 g)");
  if (p.g_za_ks != null && p.g_za_platok != null && p.g_za_platok > p.g_za_ks)
    chyba("K4", p, "plátok (" + p.g_za_platok + " g) je ťažší ako celý kus (" + p.g_za_ks + " g)");
});

// ── K5 oddelenia ───────────────────────────────────────────────────────────────
P.forEach(p => {
  if (!app.PORADIE_ODDELENI.includes(p.oddelenie))
    chyba("K5", p, "oddelenie „" + p.oddelenie + "“ nie je v PORADIE_ODDELENI");
});

// ── K6 alergény ────────────────────────────────────────────────────────────────
// rastlinné náhrady nesú názov „mlieko"/„smotana"/„maslo", ale alergén mlieko NEMAJÚ
const RASTLINNE = /(kokos|mand[ľl]|sój|ovsen|ryžov|rastlinn|kešu|arašid|tekvic|sezam|para |pistác|lieskov)/;
const ALERG = [
  { a: "mlieko", re: /\b(mlieko|smotan|syr|tvaroh|jogurt|maslo|smotanov|bryndz|mascarpone|ricott|feta|parmez|eidam|ementa|gouda|cedar|čedar|niva|mozzarel|mozarel|camembert|hermel|oštiepok|parenic|žervé|šľahačk|kefír|skyr|cottage|ghí|lučina|syrokrém|salko|cmar)/, nie: RASTLINNE },
  { a: "lepok", nie: /(kukuričn|cícerov|ryžov|pohánkov|mandľov|bezlepk|krupicový cukor|cukor krupica|krupica cukor|amarant|quino)/, re: /\b(múka|chlieb|pečivo|rožok|rožky|rohlík|žeml|bageta|cestovin|špaget|rezanc|krupic|strúhank|kuskus|bulgur|krúpy|lasagne|penne|fusilli|farfalle|makarón|tagliatelle|orzo|maces|knedľ|veka|otrub|piškót|krutón|praclík|ciabatt|focacc|croissant|brioš|pita|naan|lavash|kaizerk|bagel)/ },
  { a: "vajcia", re: /\b(vajc|vajíčk|žĺt|bielok|bielka|majonéz|majolenk|majolk|remoulade|tatárska|vaječn)/ },
  { a: "ryby", re: /\b(ryb|losos|tuniak|treska|pstruh|sardink|sardel|ančovič|sleď|makrel|zubáč|kapor|ostriež|šťuk|zavináč)/ },
  { a: "orechy", re: /\b(vlašské orechy|orech|mandle|mandľov|lieskov|pekan|pistác|kešu|para orechy|píniov|nutella)/ },
  { a: "sója", re: /\b(sójov|tofu|tempeh|edamame|miso|tamari)\b/ },
  { a: "sezam", re: /\b(sezam|tahin|hummus|za'atar)/ },
];
P.forEach(p => {
  const k = p.kluc.toLowerCase(), al = p.alergeny || [];
  ALERG.forEach(({ a, re, nie }) => {
    if (nie && nie.test(k)) return;
    if (re.test(k) && !al.includes(a)) chyba("K6", p, "kľúč naznačuje alergén „" + a + "“, chýba (má: " + (al.join(", ") || "—") + ")");
  });
});

// ── K7 duplicity a prekryvy ────────────────────────────────────────────────────
const podlaKluca = {};
P.forEach(p => (podlaKluca[p.kluc] = podlaKluca[p.kluc] || []).push(p));
Object.entries(podlaKluca).forEach(([k, v]) => { if (v.length > 1) chyba("K7", v[0], "kľúč „" + k + "“ je v databáze " + v.length + "×"); });
// prekryv: kľúč A je prefixom kmeňa kľúča B (jednoslovné) → B nikdy nevyhrá nad dlhším A,
// ale ak majú ROZDIELNE hodnoty, je to riziko. Aliasy s rovnakými hodnotami sú v poriadku.
const jedno = P.filter(p => app._slova(p.kluc).length === 1);
for (let i = 0; i < jedno.length; i++) for (let j = 0; j < jedno.length; j++) {
  if (i === j) continue;
  const a = jedno[i], b = jedno[j];
  const ka = app._kmen(bezDia(a.kluc)), kb = app._kmen(bezDia(b.kluc));
  if (ka === kb && a.kluc < b.kluc) {
    const rozdiel = Math.abs(a.kcal - b.kcal) > 25 || a.oddelenie !== b.oddelenie;
    if (rozdiel) chyba("K7", a, "rovnaký kmeň „" + ka + "“ ako „" + b.kluc + "“, ale INÉ hodnoty (" +
      a.kcal + " kcal / " + a.oddelenie + "  vs  " + b.kcal + " kcal / " + b.oddelenie + ")");
  }
}

// ── K8 ceny ────────────────────────────────────────────────────────────────────
P.forEach(p => {
  if (p.cena100 == null) chyba("K8", p, "cena100 = null (NEZNÁMA cena; 0 by znamenalo „zadarmo“)");
  else if (p.cena100 < 0) chyba("K8", p, "záporná cena " + p.cena100);
  else if (p.cena100 === 0 && p.kluc !== "voda") chyba("K8", p, "cena100 = 0 (naozaj zadarmo?)");
  else if (p.cena100 > 20 && !["šafran", "vanilkov", "vanilkový extrakt"].includes(p.kluc))
    chyba("K8", p, "cena " + p.cena100 + " €/100 g je podozrivo vysoká");
});

// ── K9 vláknina a sodík ────────────────────────────────────────────────────────
const MA_VLAKNINU = ["Zelenina a ovocie", "Orechy a semená", "Cestoviny a ryža", "Korenie a bylinky"];
const BEZ_VLAKNINY = /^(voda|ľad|soľ|olej|maslo|masť|ghí|hera|margarín|omastok|husacia masť|bravčová masť|masť bravčová|.*olej.*|.*šťava.*|víno|pivo|rum|vodka|gin|tequila|brandy|whisk|koňak|cognac)/;
P.forEach(p => {
  if (p.vlaknina == null) { chyba("K9", p, "vlaknina chýba (null)"); return; }
  if (p.vlaknina === 0 && MA_VLAKNINU.includes(p.oddelenie) && !BEZ_VLAKNINY.test(bezDia(p.kluc)) && p.kcal > 5)
    chyba("K9", p, "vláknina 0 g, hoci ide o " + p.oddelenie.toLowerCase() + " (" + p.kcal + " kcal)");
  if (p.sodik == null) chyba("K9", p, "sodik chýba (null)");
});

// ── K10 balenia ────────────────────────────────────────────────────────────────
P.forEach(p => {
  const g = p.balenie_g, pop = p.balenie_popis;
  if ((g == null) !== (pop == null)) chyba("K10", p, "balenie_g=" + g + " / balenie_popis=" + JSON.stringify(pop) + " — jedno bez druhého");
  if (g != null && (g <= 0 || g > 5000)) chyba("K10", p, "balenie_g = " + g + " (mimo 0–5000 g)");
});

// ── výstup ─────────────────────────────────────────────────────────────────────
if (csv) {
  console.log("kod;kluc;popis");
  N.forEach(x => console.log(x.kod + ";" + x.kluc + ";" + x.text));
} else {
  const podla = {};
  N.forEach(x => (podla[x.kod] = podla[x.kod] || []).push(x));
  Object.keys(podla).sort().forEach(k => {
    console.log("\n=== " + k + " — " + podla[k].length + " nálezov ===");
    podla[k].slice(0, 80).forEach(x => console.log("  " + x.kluc.padEnd(26).slice(0, 26) + "  " + x.text));
    if (podla[k].length > 80) console.log("  … a ďalších " + (podla[k].length - 80));
  });
  console.log("\nSPOLU: " + N.length + " nálezov v " + P.length + " potravinách");
}
process.exitCode = 0;
