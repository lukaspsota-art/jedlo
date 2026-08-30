// OPRAVA KALORICKÝCH ODĽAHLÝCH HODNÔT — zosúladí `kcal_na_porciu` s dopočtom zo `potraviny.json`
// tam, kde je dopočet ÚPLNÝ a dôveryhodný.
//
// Prečo vôbec meniť deklarované číslo: `_vyzivaVypocet` síce kcal preberie z `kcal_na_porciu` (B4),
// ale bielkoviny, tuky, sacharidy a cenu PREŠKÁLUJE faktorom k = deklarované / dopočítané.
// Recept s odchýlkou 500 % teda neukazuje len zlé kcal, ale aj 6× zlé bielkoviny a cenu.
//
// Prepisujeme LEN recepty, kde:
//   · každá surovina s množstvom je napárovaná a prevedie sa na gramy (nič nechýba),
//   · žiadna surovina s podozrivým párovaním nedáva > 30 % kalórií (napr. „Hovädzí vývar
//     z bujónu“ → kľúč „hovädzie“ = 250 kcal/100 g namiesto 4 kcal/100 g),
//   · id nie je na zozname VYNIMKY (ručne posúdené prípady).
// Ostatné idú do reportu — sú to chyby v `potraviny.json`, nie v receptoch.
//
//   node scripts/oprav_kcal_outliers.js            suchý beh + zoznam na ručné posúdenie
//   node scripts/oprav_kcal_outliers.js --zapis
const path = require("path");
const { load } = require("../test_harness");
const P = require("./lib_patch_json");
const app = load({ stav: {} });
const ZAPIS = process.argv.includes("--zapis");
const DIR = path.join(__dirname, "..", "recepty");
const PRAH = Number((process.argv.indexOf("--prah") > 0 ? process.argv[process.argv.indexOf("--prah") + 1] : 40));  // % odchýlky

// Strop kcal na porciu, ktorý ešte dáva zmysel pre danú kategóriu. Keď ho dopočet prekročí,
// chyba nie je v deklarácii, ale v `porcie` (recept počíta bochníky/dávky, nie porcie) —
// a `porcie` nie je pole, ktoré tento skript smie meniť. Taký recept ide do reportu.
const STROP_KCAL = { "Hlavné jedlo": 900, "Cestoviny": 900, "Polievka": 700, "Šalát": 700,
  "Príloha": 700, "Raňajky": 700, "Snack": 500, "Dezert": 500, "Nátierka": 500, "Pečivo": 950,
  "Nápoj": 400, "Kokteil": 400 };
// Strop hmotnosti porcie (g). Nátierka po 330 g alebo šalát po 760 g nie je porcia, ale dávka.
const STROP_G = { "Nátierka": 120, "Snack": 250, "Dezert": 250, "Nápoj": 500, "Kokteil": 500,
  "Polievka": 600, "Šalát": 500, "Príloha": 400, "Raňajky": 500, "Pečivo": 300,
  "Hlavné jedlo": 700, "Cestoviny": 700 };

// Ručne posúdené výnimky: dopočet je síce úplný, ale číslo z neho by bolo horšie než deklarované.
// Ručne overené chyby PÁROVANIA — kľúč z potraviny.json sadol na inú potravinu a nafúkol kcal.
// Opraviť sa dá len v potraviny.json (nový presný kľúč), preto recept nechávame tak a ide do reportu.
const ZLE_PAROVANIE = {
  "dusene-musle": "„Mušle“ → kľúč „müsli“ (380 kcal/100 g namiesto ~86)",
  "hovadzi-vyvar-so-zeleninou": "„Hovädzí vývar“ → kľúč „hovädzie“ (250 kcal/100 g namiesto ~4)",
  "drstkova-polievka": "„Hovädzí vývar z bujónu“ → kľúč „hovädzie“",
  "hovadzie-na-hriboch": "„Vývar hovädzí domáci“ → kľúč „hovädzie“",
  "smoothie-z-hrozna-citrona-a-ananasu": "„Hrozno“ → kľúč „hrozienka“ (299 kcal/100 g namiesto 69)",
  "cestoviny-s-tuniakom-a-citronom": "„Tuniak v olivovom oleji“ → kľúč „olivový olej“ (884 kcal/100 g)",
  "grecke-tzatziki-salatove-osviezenie-z-uhoriek-a-jogurtu": "„Olej olivový extra panenský“ → kľúč „olivy“",
  "bang-bang-kuracie-rezance": "„Kuracích rezancov“ (mäso) → kľúč „rezance“ (cestoviny)",
  "kuzlo-pod-cibulou": "„Prsia kuracie 4 plátok“ = 80 g — kura nemá `g_za_platok`",
};

const VYNIMKY = {
  "au-jus-sendvic-s-hovadzim": "kontroluje ho test_vypocty B4 (881 kcal) — deklarácia je zámerná",
  "musaka": "kurátorované z Kaufland FOOD magazínu; olej rieši `vsiaknutie`",
  "nakladana-mozzarella": "olej je nálev, rieši ho `vsiaknutie`",
  "nalozene-papriky": "olej je nálev, rieši ho `vsiaknutie`",
  "domace-arasidove-maslo": "1 porcia = celá dóza nátierky, číslo je správne",
  "lieskovooriskovy-krem": "1 porcia = celá dóza nátierky, číslo je správne",
  "prepustene-maslo": "1 porcia = celý pohár prepusteného masla, číslo je správne",
};

// Extrémy (< 30 / > 1800 kcal na porciu), kde strop kategórie síce prepis blokuje,
// ale deklarované číslo je preukázateľne celá dávka, nie porcia.
const VYNUT = {
  "pohankove-krupky-so-skoricou": "deklarovaných 1837 kcal je celá dávka (1877 kcal); porcie=2 → 939",
};

const rows = [];
app.RECEPTY.forEach(r => {
  const dekl = r.kcal_na_porciu || 0;
  const v = app.vyzivaReceptu({ ...r, kcal_na_porciu: 0 });
  if (!(dekl > 0) || !(v.kcal > 5)) return;
  const odch = Math.abs(v.kcal / dekl - 1) * 100;
  if (odch < PRAH) return;

  const por = r.porcie || 1;
  let neuplne = [], g = 0;
  (r.ingrediencie || []).forEach(i => {
    if (i.mnozstvo == null) return;
    const p = app.najdiPotravinu(i.nazov);
    if (!p) { neuplne.push(i.nazov + " (nenapárované)"); return; }
    const gi = app.gramy(i, p);
    if (!(gi > 0)) { neuplne.push(i.nazov + " (" + i.jednotka + " → 0 g)"); return; }
    g += gi;
  });
  const gp = g / por, strop = STROP_KCAL[r.kategoria] || 700, stropG = STROP_G[r.kategoria] || 800;
  const porcieZle = v.kcal > strop || gp > stropG;
  // recepty už opravené scriptom oprav_olej.js sa nesmú prepísať späť na nafúknuté číslo —
  // ich `vsiaknutie` uvidí až upravený app.js
  const cisty = (!neuplne.length && !ZLE_PAROVANIE[r.id] && !VYNIMKY[r.id] && !porcieZle &&
    r.kcal_zdroj !== "korekcia_olej") || !!VYNUT[r.id];
  rows.push({ id: r.id, kat: r.kategoria, por, dekl, vyp: Math.round(v.kcal), gp: Math.round(gp),
    odch: Math.round(odch), cisty, neuplne, porcieZle,
    parovanie: ZLE_PAROVANIE[r.id] || null, vynimka: VYNIMKY[r.id] || null });
});
rows.sort((a, b) => b.odch - a.odch);

const opravit = rows.filter(z => z.cisty);
console.log("odľahlých (> " + PRAH + " %): " + rows.length + "   ·   opraviteľných dopočtom: " + opravit.length +
  "   ·   na ruku/do potraviny.json: " + (rows.length - opravit.length) + "\n");
console.log("── PREPÍŠEM (dopočet je úplný) ────────────────────────────────────");
opravit.forEach(z => console.log("  " + z.id.padEnd(48).slice(0, 48) + " por=" + String(z.por).padStart(2) +
  "  " + String(z.dekl).padStart(5) + " → " + String(z.vyp).padStart(5) + " kcal (" + z.odch + " %)"));
console.log("\n── NEPREPISUJEM ───────────────────────────────────────────────────");
rows.filter(z => !z.cisty).forEach(z => console.log("  " + z.id.padEnd(48).slice(0, 48) +
  " " + String(z.dekl).padStart(5) + " vs " + String(z.vyp).padStart(5) + "  " +
  (z.vynimka ? "výnimka: " + z.vynimka
    : z.parovanie ? "PÁROVANIE: " + z.parovanie
    : z.neuplne.length ? "neúplné: " + z.neuplne.slice(0, 3).join("; ")
    : "PORCIE: " + z.vyp + " kcal / " + z.gp + " g na porciu je na kategóriu " + z.kat + " nereálne")));

if (!ZAPIS) { console.log("\n(suchý beh — spusti s --zapis)"); process.exit(0); }
let n = 0;
for (const z of opravit) {
  const cesta = path.join(DIR, z.id + ".json");
  let txt = P.nacitaj(cesta);
  txt = P.nastavPole(txt, "kcal_na_porciu", z.vyp, "cas");
  txt = P.nastavPole(txt, "kcal_zdroj", "vypocet", "kcal_na_porciu");
  P.zapis(cesta, txt); n++;
}
console.log("\nzapísaných: " + n);
