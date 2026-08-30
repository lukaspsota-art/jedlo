// AUDIT: NAVOD.md sľubuje 15 funkcií — existuje ku každej kód aj UI prvok?
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..","..");
const APP=fs.readFileSync(path.join(R,"data","app.js"),"utf8");
const SAB=fs.readFileSync(path.join(R,"data","sablona.html"),"utf8");
const V=APP+SAB;
const F=[
 ["1. Obľúbené (hviezda na karte)", ()=>/function toggleFav/.test(APP)&&/class="fav"/.test(APP)],
 ["2. Hodnotenie 1–5 + poznámka", ()=>/function hodnot\(/.test(APP)&&/function ulozPozn/.test(APP)],
 ["3. Filtre: kategória, kuchyňa, čas, diéta/obľúbené", ()=>/id="f-kuchyna"/.test(SAB)&&/id="f-cas"/.test(SAB)&&/id="f-diet"/.test(SAB)],
 ["4. Fotky receptov", ()=>/recepty\/fotky\//.test(APP)],
 ["5. Plánovač týždňa", ()=>/function renderPlan/.test(APP)],
 ["6. Nákupný zoznam z plánu", ()=>/function nakupPolozky/.test(APP)],
 ["7. Nákup podľa oddelení", ()=>/PORADIE_ODDELENI/.test(APP)],
 ["8. „Čo mám doma\"", ()=>/function renderDoma/.test(APP)&&/id="doma-in"/.test(SAB)],
 ["9. Makrá zo surovín", ()=>/function _vyzivaVypocet/.test(APP)],
 ["10. Denný cieľ + upozornenie", ()=>/stavCiel/.test(APP)&&/over\?'\s*⚠|⚠/.test(APP)],
 ["11. Alergény a diétne značky", ()=>/function alergenyReceptu/.test(APP)&&/function diety/.test(APP)],
 ["12. Import z fotky/textu/odkazu (spraví Claude)", ()=>"MANUÁLNY PROCES — v appke je len „Nový recept\" ("+(/function novyRecept/.test(APP)?"existuje":"chýba")+")"],
 ["13. Prepočet porcií, na 1 porciu, ml→lyžice", ()=>/function prevodJednotka/.test(APP)&&/spoon/.test(APP)],
 ["14. Režim varenia (veľké písmo, časovače, obrazovka nezhasne)", ()=>/wakeLock/.test(APP)&&/pridajCasovacSek/.test(APP)],
 ["15. Tlač / PDF (recept, plán, nákup)", ()=>/function tlacView/.test(APP)&&/function tlacTyzden/.test(APP)&&/@media print/.test(SAB)],
];
console.log("=== NAVOD.md: 15 sľúbených funkcií ===");
F.forEach(([n,t])=>{ const r=t(); console.log(`  ${r===true?"✅":(typeof r==="string"?"⚠️ ":"❌")} ${n}${typeof r==="string"?"  — "+r:""}`); });

console.log("\n=== Fotky (funkcia 4) ===");
const glob=require("fs");
const rec=glob.readdirSync(path.join(R,"recepty")).filter(f=>f.endsWith(".json"));
let sFoto=0; rec.forEach(f=>{ const r=JSON.parse(glob.readFileSync(path.join(R,"recepty",f),"utf8")); if((r.foto||"").trim())sFoto++; });
const fotkyDir=path.join(R,"recepty","fotky");
console.log("  receptov s vyplneným `foto`:",sFoto,"/",rec.length);
console.log("  priečinok recepty/fotky/ existuje:",glob.existsSync(fotkyDir)?("áno, súborov: "+glob.readdirSync(fotkyDir).length):"NIE");
console.log("  → appka má kód na fotky, UI na ne pripravené, ale 0 dát. NAVOD ich uvádza medzi funkciami bez výhrady;");
console.log("     rovnako sľubuje „Fotku receptu pridáš do projektu Jedlo\" (PROJEKT_BIBLIA) — priečinok recepty/_prijate/ tiež neexistuje:",
  glob.existsSync(path.join(R,"recepty","_prijate"))?"existuje":"NEEXISTUJE");

console.log("\n=== Ďalšie sľuby v dokumentácii vs. realita ===");
const kontrola=[
 ["CLAUDE.md: „vzor sync-config.example.js\"", glob.existsSync(path.join(R,"sync-config.example.js"))],
 ["CLAUDE.md: „recepty majú kcal_zdroj?: 'vypocet'\"", rec.some(f=>/"kcal_zdroj"/.test(glob.readFileSync(path.join(R,"recepty",f),"utf8")))],
 ["CLAUDE.md: „scripts/dopocitaj_kcal.js\"", glob.existsSync(path.join(R,"scripts","dopocitaj_kcal.js"))],
 ["CLAUDE.md: „mnozMult — prepočet množstiev\" (kľúčový koncept)", /\bmnozMult\b[\s\S]*\bmnozMult\b/.test(APP)],
 ["CLAUDE.md: „potrebujePrilohu\" sa používa", (APP.match(/\bpotrebujePrilohu\b/g)||[]).length>1],
 ["CLAUDE.md: INSPIRACIA.md", glob.existsSync(path.join(R,"INSPIRACIA.md"))],
 ["CLAUDE.md: AUDIT_UI_2026-08-19.md", glob.existsSync(path.join(R,"AUDIT_UI_2026-08-19.md"))],
 ["NAVOD: „Pridať na plochu\" / PWA (manifest)", /manifest|apple-mobile-web-app/.test(SAB)],
 ["NAVOD: service worker sw.js", glob.existsSync(path.join(R,"sw.js"))],
 ["CLAUDE.md: VERZIA v kóde zodpovedá v22", /const VERZIA="v22"/.test(APP)],
];
kontrola.forEach(([n,v])=>console.log(`  ${v?"✅":"❌"} ${n}`));
console.log("  VERZIA v app.js =", (APP.match(/const VERZIA="([^"]+)"/)||[])[1]);
