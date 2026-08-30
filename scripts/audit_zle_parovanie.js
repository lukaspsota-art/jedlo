// AUDIT: podozrivé (pravdepodobne CHYBNÉ) párovania surovín receptov na potraviny.json.
//
// Chýbajúca potravina je „len" diera v dátach — appka o nej vie (bezCeny, ≈ odhad).
// CHYBNÉ párovanie je horšie: kalórie, cena aj alergény vyzerajú dôveryhodne a sú nesprávne
// („Olej olivový extra virgin" → olivy = 145 kcal namiesto 884; „Hovädzí vývar" → hovädzie = 250 kcal
// namiesto 4). Tento skript hľadá práve tie triedy chýb.
//
//   node scripts/audit_zle_parovanie.js             všetky triedy, zoradené podľa výskytu
//   node scripts/audit_zle_parovanie.js --trieda X  len jedna trieda
//   node scripts/audit_zle_parovanie.js --top 150   ručná revízia N najčastejších surovín
const { load } = require("../test_harness");
const app = load({ stav: {} });
const argv = process.argv.slice(2);
const iba = (argv.indexOf("--trieda") >= 0) ? argv[argv.indexOf("--trieda") + 1] : null;
const topN = (argv.indexOf("--top") >= 0) ? parseInt(argv[argv.indexOf("--top") + 1]) || 100 : 0;

const bezDia = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slova = s => app._slova(s);

// ── HLAVOVÉ SLOVÁ: keď je toto slovo v názve suroviny, POTRAVINA musí byť tá istá vec.
// „X olej" nie je X, „X šťava" nie je X, „X vývar" nie je X. Ak napárovaný kľúč hlavové slovo
// neobsahuje, je to skoro isto zámena spracovanej suroviny za čerstvú.
const HLAVY = [
  { slovo: ["olej", "oleja", "olejom"], kluc: "olej", popis: "olej vs. plod/semeno" },
  { slovo: ["stava", "stavy", "stavou"], kluc: "stav", popis: "šťava vs. celý plod" },
  { slovo: ["kora", "kory", "korou"], kluc: "kor", popis: "kôra vs. celý plod" },
  { slovo: ["vyvar", "vyvaru", "vyvarom"], kluc: "vyvar", popis: "vývar vs. mäso" },
  { slovo: ["muka", "muky", "mukou"], kluc: "muk", popis: "múka vs. zrno/pečivo" },
  { slovo: ["skrob", "skrobu"], kluc: "skrob", popis: "škrob vs. surovina" },
  { slovo: ["pretlak", "pretlaku"], kluc: "pretlak", popis: "pretlak vs. čerstvá surovina" },
  { slovo: ["cukor", "cukru"], kluc: "cukor", popis: "cukor vs. iná surovina" },
  { slovo: ["mast", "masti"], kluc: "mast", popis: "masť vs. mäso" },
  { slovo: ["pesto"], kluc: "pesto", popis: "pesto vs. bylinka" },
  { slovo: ["ocot", "octu", "octom"], kluc: "ocot", popis: "ocot vs. ovocie" },
  { slovo: ["pecen", "pecienka", "pecienku"], kluc: "pecen", popis: "pečeň vs. mäso" },
  { slovo: ["sol", "soli"], kluc: "sol", popis: "soľ vs. bylinka" },
  { slovo: ["liker", "likeru"], kluc: "liker", popis: "likér vs. surovina" },
  { slovo: ["sirup", "sirupu"], kluc: "sirup", popis: "sirup vs. surovina" },
  { slovo: ["prasok", "prasku"], kluc: "prasok", popis: "prášok vs. čerstvá surovina" },
  { slovo: ["mlieko", "mlieka", "mliekom"], kluc: "mliek", popis: "mlieko vs. surovina" },
  { slovo: ["smotana", "smotany"], kluc: "smotan", popis: "smotana vs. surovina" },
  { slovo: ["rasca", "rasce"], kluc: "rasc", popis: "rasca vs. iná surovina" },
];
// ── SPRACOVANÉ vs. ČERSTVÉ: prívlastok, ktorý mení výživu rádovo (voda von / cukor a soľ dnu).
const SPRACOVANIE = ["suseny", "susene", "susena", "susenych", "udeny", "udena", "udene",
  "kondenzovane", "kondenzovany", "kandizovane", "zavarane", "marinovany", "nakladany", "nakladane",
  "prazeny", "prazene", "kysla", "kysle", "kyslej"];
// ── SUROVÉ vs. VARENÉ: 100 g suchej ryže ≈ 350 kcal, uvarenej ≈ 130.
const VARENE = ["vareny", "varena", "varene", "uvareny", "uvarena", "uvarene", "uvarenych",
  "predvareny", "predvarena", "predvarene", "duseny", "dusena"];
const SUCHE_KLUCE = ["ryza", "cestoviny", "spagety", "sosovic", "cervena sosovica", "fazul", "fazula",
  "biele fazule", "hrach", "krupy", "bulgur", "kuskus", "pohanka", "pohankov", "quinoa", "quino",
  "jahl", "polenta", "tarhona", "penne", "fusilli", "rezance", "spaldov", "celozrn", "muka", "krupica"];
// ── DRUH MÄSA: konkrétny diel nesmie spadnúť na generický kľúč zvieraťa.
const DIELY = ["stehno", "stehna", "prsia", "kridla", "kridielka", "krkovicka", "pliecko", "bocik",
  "kare", "panenka", "svieckovica", "klizka", "hrud", "rebierka", "rebra", "koleno", "kolienko",
  "rostenka", "plece", "chrbat", "orez", "krk", "srdcia", "drzky", "jazyk"];
const GENERICKE_MASO = ["kura", "hovadzie", "bravcov", "morcac", "maso", "sliepka", "celé kura", "jahnac"];
// ── ZLÚČENÉ SUROVINY: „Soľ a mleté čierne korenie" je DVE potraviny, napáruje sa len jedna.
const SPOJKY = [" a ", " aj ", "/", " alebo ", ","];

function tvary(p) { return slova(p.kluc).map(app._kmen); }

const nalezy = new Map();   // trieda|nazov → {n, nazov, kluc, kcal, trieda, preco}
function pridaj(trieda, preco, nazov, p, n) {
  const k = trieda + "|" + nazov;
  const z = nalezy.get(k) || { n: 0, nazov, kluc: p ? p.kluc : "—", kcal: p ? p.kcal : null, trieda, preco };
  z.n += n; nalezy.set(k, z);
}

// zoznam surovín s počtom výskytov
const vyskyt = new Map();
app.RECEPTY.forEach(r => (r.ingrediencie || []).forEach(i => {
  const z = vyskyt.get(i.nazov) || { n: 0, priklad: r.id };
  z.n++; vyskyt.set(i.nazov, z);
}));

// všetky viacslovné kľúče — na kontrolu prehodeného slovosledu
const VIACSLOVNE = app.POTRAVINY.filter(p => slova(p.kluc).length > 1)
  .map(p => ({ p, kmene: tvary(p) }));

vyskyt.forEach((z, nazov) => {
  const p = app.najdiPotravinu(nazov);
  if (!p) return;                       // chýbajúce rieši kontrola_parovania.js
  const w = slova(nazov), kk = bezDia(p.kluc);

  // 1) hlavové slovo v názve, ktoré kľúč nepokrýva
  HLAVY.forEach(h => {
    if (!w.some(x => h.slovo.includes(x))) return;
    if (kk.includes(h.kluc)) return;
    // „Soľ" v kľúči „soľ" je v poriadku; kontrolujeme len keď kľúč je NIEČO INÉ
    pridaj("hlava", h.popis, nazov, p, z.n);
  });

  // 2) spracovaná vs. čerstvá
  if (w.some(x => SPRACOVANIE.includes(x)) && !SPRACOVANIE.some(s => kk.includes(s.slice(0, 5))))
    pridaj("spracovanie", "prívlastok mení výživu, kľúč ho nemá", nazov, p, z.n);

  // 3) surové vs. varené
  if (w.some(x => VARENE.includes(x)) && SUCHE_KLUCE.includes(kk))
    pridaj("varene", "varená surovina napárovaná na SUCHÚ (kcal ~2,5× viac)", nazov, p, z.n);

  // 4) diel mäsa na generickom kľúči
  if (w.some(x => DIELY.includes(x)) && GENERICKE_MASO.includes(kk))
    pridaj("diel-masa", "konkrétny diel mäsa na generickom kľúči", nazov, p, z.n);

  // 5) zlúčené suroviny
  const nl = " " + bezDia(nazov) + " ";
  if (SPOJKY.some(s => nl.includes(s)) && w.length >= 3)
    pridaj("zlucene", "názov spája viac surovín, započíta sa len jedna", nazov, p, z.n);

  // 6) prehodený slovosled viacslovného kľúča (napr. „Prsia kuracie" vs. kľúč „kuracie prsia")
  VIACSLOVNE.forEach(({ p: q, kmene }) => {
    if (q.kluc === p.kluc) return;
    if (kmene.length > w.length) return;
    const vsetky = kmene.every(k => w.some(x => x.length >= k.length && x.slice(0, k.length) === k && x.length - k.length <= 5));
    if (!vsetky) return;
    if (app._sadneOd(w, kmene) >= 0) return;   // sadlo by aj tak
    // hlásime len vtedy, keď by iné poradie znamenalo INÚ potravinu — „Červená mletá paprika"
    // sedí na „mletá paprika" aj na „červená paprika", ale rozdiel 282 vs 31 kcal je podstatný
    const rozdiel = Math.abs(q.kcal - p.kcal);
    if (!(rozdiel > 25 && rozdiel > 0.25 * Math.max(q.kcal, p.kcal))) return;
    pridaj("slovosled", "obsahuje všetky slová kľúča „" + q.kluc + "“ (" + q.kcal + " kcal) v inom poradí", nazov, p, z.n);
  });

  // 7) nulové kalórie pri surovine, ktorá ich mať má
  if (p.kcal === 0 && !["sol", "voda", "lad", "soda", "korenie", "stevi", "xylitol"].includes(kk) === false) { /* ok */ }
});

const zoz = [...nalezy.values()].filter(x => !iba || x.trieda === iba).sort((a, b) => b.n - a.n);
const podla = {};
zoz.forEach(x => (podla[x.trieda] = podla[x.trieda] || []).push(x));
Object.keys(podla).sort((a, b) => podla[b].reduce((s, x) => s + x.n, 0) - podla[a].reduce((s, x) => s + x.n, 0))
  .forEach(t => {
    const v = podla[t];
    console.log("\n=== " + t.toUpperCase() + " — " + v.length + " surovín, " + v.reduce((s, x) => s + x.n, 0) + " výskytov ===");
    v.slice(0, 60).forEach(x => console.log(
      String(x.n).padStart(4) + "×  " + x.nazov.padEnd(40).slice(0, 40) + " → " + x.kluc.padEnd(22).slice(0, 22) +
      " (" + x.kcal + " kcal)   " + x.preco));
    if (v.length > 60) console.log("      … a ďalších " + (v.length - 60));
  });
console.log("\nSPOLU podozrivých párovaní: " + zoz.length + " surovín / " + zoz.reduce((s, x) => s + x.n, 0) + " výskytov");

if (topN) {
  console.log("\n\n=== RUČNÁ REVÍZIA: " + topN + " NAJČASTEJŠÍCH SUROVÍN ===");
  [...vyskyt.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, topN).forEach(([nazov, z]) => {
    const p = app.najdiPotravinu(nazov);
    console.log(String(z.n).padStart(4) + "×  " + nazov.padEnd(40).slice(0, 40) + " → " +
      (p ? p.kluc.padEnd(22).slice(0, 22) + " " + String(p.kcal).padStart(4) + " kcal  " +
        String(p.bielkoviny).padStart(5) + " B  " + (p.cena100 != null ? p.cena100 + " €" : "BEZ CENY") + "  [" + p.oddelenie + "]"
        : "*** NENAPÁROVANÉ ***"));
  });
}
