// OPRAVA (PRAVDA-V-ČÍSLACH): 41 receptov, kde faktor B4 (k = deklarované/dopočítané) vymýšľal makrá.
// Pásmo dôvery je q = dopočet/deklarované ∈ ⟨0,5; 2⟩ (viď scripts/audit_faktor_k.js).
//
// POSTUP ROZHODOVANIA (rovnaký pre všetky recepty):
//   1. Je `porcie` vierohodné? Ak na porciu vychádza absurdná hmotnosť surovín (pašteta 358 g,
//      dip 210 g, guláš 1 kg), pole počíta DÁVKY, nie porcie → oprav `porcie`.
//   2. Je dopočet úplný (žiadna surovina bez gramov ani nenapárovaná)? Ak áno a q je stále mimo
//      pásma, chyba je v deklarácii → `kcal_na_porciu` = dopočet, `kcal_zdroj: "vypocet"`.
//   3. Ak dopočet úplný NIE JE, deklaráciu nechávam — prepis by ju podstrelil ešte viac.
//      Recept zostane označený ako odhad (`v.sporne`) a ide do zoznamu pre potraviny.json.
//
// Recepty s "kategoria": "Snack" sa NEUPRAVUJÚ — patria inému agentovi. Mimo pásma sú tieto:
//   snack-cherry-paradajky, grilovane-jalapeno-syr-slanina, cuketove-chipsy-s-parmazanom,
//   lahodna-smrzova-prazenica-s-medvedim-cesnakom, nakladany-hermelin-na-kyslo.
const P = require("./lib_patch_json");
const path = require("path");
const fs = require("fs");
const R = f => path.join(__dirname, "..", "recepty", f + ".json");

// [id, novePorcie|null, noveKcal|null, kcalZdroj|null, dôvod]
const OPRAVY = [
  // ── 1. `porcie` počítalo dávky/bochníky/celý hrniec (deklarované kcal sú rozumná porcia) ──
  ["madarsky-gulas-nasa-verzia",       8, null, null, "1,5 kg hovädziny + 800 g cibule = 8 porcií guláša, nie 2 (na porciu vychádzalo 1,6 kg surovín)"],
  ["grilovana-chobotnica",             6, null, null, "1,6 kg chobotnice na „1 porciu“ = 2,2 kg surovín na tanieri"],
  ["zemiakovy-chlieb-v-rimskom-hrnci-romertopf", 6, null, null, "1 kg múky = 2 bochníky ≈ 6 porcií; `porcie: 2` počítalo bochníky"],
  ["granola-s-mandlovym-maslom",       5, null, null, "615 g granoly nie sú 2 porcie; pri 5 porciách dopočet 316 kcal sedí s deklarovanými 325"],
  ["jablckova-granola",                5, null, null, "490 g granoly; pri 5 porciách dopočet 181 kcal sedí s deklarovanými 189"],
  ["zapeceny-bob-s-tahini",                   4, null, null, "400 g bôbu + 3 špekáčiky + 3 vajcia = 1,2 kg na „1 porciu“"],
  ["chlieb-bezlepkovy-a-zemle-asi-najjednoduchsie", 12, null, null, "395 g chlebovej zmesi = ~12 žemlí; pri 12 dopočet 169 kcal sedí so 164"],
  ["kukuricny-dip",                    6, null, null, "650 g dipu nie sú 2 porcie; pri 6 dopočet 145 kcal sedí so 144"],
  ["chrenova-rozkova-omacka",         10, null, null, "10 vajec + 10 rožkov = 10 porcií; pri 10 dopočet 216 kcal sedí s 213"],
  ["sladky-dynovy-dip",                5, null, null, "365 g dipu nie sú 2 porcie; pri 5 dopočet 112 kcal sedí so 116"],
  ["huby-s-nivou",                     2, null, null, "400 g šampiňónov + 120 g nivy + 2 vajcia je jedlo pre dvoch"],
  ["telaci-smotanovy-gulas",           4, null, null, "600 g teľacej hrude + 1 l vývaru = 4 porcie (na porciu vychádzal 1 kg)"],
  ["dip-z-arasidoveho-masla",          5, null, null, "420 g dipu nie sú 2 porcie; pri 5 dopočet 218 kcal sedí s 237"],
  ["pecenova-pasteta-s-vinom",        12, null, null, "800 g pečene + 240 g masla = 12 porcií paštéty; pri 6 vychádzalo 358 g paštéty na porciu"],
  ["bruschetta-s-vajcom",              8, null, null, "8 plátkov bagety = 8 porcií, nie 15 (kcal nechávam — v recepte chýbajú vajcia z názvu)"],

  // ── 2. `porcie` aj `kcal_na_porciu` boli mimo ──
  ["polievka-z-volskeho-chvosta-king-dun-niu-wei", 4, 501, "vypocet", "750 g volského chvosta je polievka pre 4, nie „1 porcia“; 131 kcal je pri 750 g mäsa nemožných"],
  ["penne-s-bazalkovym-pestom",        4,  229, "vypocet", "200 g pesta na „1 porciu“; deklarovaných 60 kcal pre cestoviny s pestom je nezmysel. Dopočet je stále neúplný — „Cestovina Penne 1 ks“ = 0 g (chýba g_za_ks)"],
  ["hovadzi-steak-s-cesnakovym-maslom", 2, 687, "vypocet", "500 g hovädzej krkovice = 2 steaky po 250 g, nie „1 porcia“; deklarovaných 134 kcal robilo z 130 g bielkovín 12,7 g"],
  ["pecene-kura-so-zeleninou-z-jedneho-plechu", 8, 662, "vypocet", "2 celé jarné kurčatá (2 kg) sú 8 porcií, nie 4. Pozn.: dopočet berie kurča vrátane kostí — výťažnosť patrí do potraviny.json"],

  // ── 3. `porcie` sedí, chybná bola deklarácia (dopočet je úplný) ──
  ["rybacia-kari-polievka",         null, 419, "vypocet", "1,5 kg ryby na 4 porcie nemôže dať 96 kcal na porciu"],
  ["rybacia-polievka",              null, 419, "vypocet", "duplikát predošlého receptu, tá istá chyba"],
  ["irish-coffee",                  null, 167, "vypocet", "44 ml whisky je samo 104 kcal, plus cukor a smotana"],
  ["whiskey-sour",                  null, 209, "vypocet", "59 ml whisky = 139 kcal; deklarovaných 77 kcal je pod hodnotou samotného alkoholu"],
  ["cestoviny-s-klobasou-a-paprikou", null, 819, "vypocet", "300 g niťoviek na 2 porcie = 150 g suchých cestovín na osobu; 286 kcal je menej než samotné cestoviny"],
  ["capellini-s-bazalkou-a-paradajkami", null, 920, "vypocet", "450 g cestovín + 125 ml olivového oleja na 3 porcie"],
  ["tagliatelle-s-mletym-masom",    null, 815, "vypocet", "500 g cestovín + 500 g mletého hovädzieho na 4 porcie"],
  ["rybacia-kremova-polievka",      null, 573, "vypocet", "400 g filé + 300 ml crème fraîche + 200 g kreviet na 4 porcie"],
  ["telacie-pliecko-na-dubakoch-so-zemiakovym-pyre", null, 543, "vypocet", "800 g teľacieho pliecka + 1 kg zemiakov na 4 porcie"],
  ["salat-z-pecenej-papriky-a-paradajok", null, 320, "vypocet", "6 PL olivového oleja + 4 plátky celozrnného chleba na 4 porcie. Pozn.: „Oregano 6 list“ = 48 g je chyba jednotky, nafukuje o ~32 kcal/porcia"],
  ["hydinove-ministeaky-s-jablkami-so-sampinonmi-a-s-kalvadoso", null, 627, "vypocet", "600 g hydinových pŕs + 200 ml šľahačky + 80 g masla na 4 porcie"],

  // ── 4. deklarácia bola odvodená z CELÉHO oleja, ktorý sa nezje (po zavedení `vsiaknutie`) ──
  ["grilovana-paprika-s-cesnakom",  null,  49, "korekcia_olej", "224 kcal bolo 200 ml olivového oleja v náleve; papriky sa z neho vyberajú"],
  ["zelerovy-salat-dia",            null,  45, "korekcia_olej", "206 kcal bolo 100 ml oleja na vyprážanie; autorka píše, že zeler olej nepije. Pozn.: „Zeler 1 ks“ = 40 g podstreľuje hlavnú surovinu"],
];

let n = 0;
for (const [id, porcie, kcal, zdroj, dovod] of OPRAVY) {
  const c = R(id);
  if (!fs.existsSync(c)) { console.error("CHÝBA:", id); process.exitCode = 1; continue; }
  let txt = P.nacitaj(c);
  const pred = JSON.parse(txt);
  if (pred.kategoria === "Snack") { console.error("PRESKAKUJEM (Snack, iný agent):", id); continue; }
  if (porcie != null) txt = P.nastavPole(txt, "porcie", porcie, "cas");
  if (kcal != null) txt = P.nastavPole(txt, "kcal_na_porciu", kcal, "porcie");
  if (zdroj != null) txt = P.nastavPole(txt, "kcal_zdroj", zdroj, "kcal_na_porciu");
  P.zapis(c, txt);
  const po = JSON.parse(P.nacitaj(c));
  console.log(`${id}\n   porcie ${pred.porcie} → ${po.porcie} · kcal ${pred.kcal_na_porciu} → ${po.kcal_na_porciu}\n   ${dovod}`);
  n++;
}
console.log("\nupravených receptov:", n);
