// AUDIT: overenie, či body označené za vyriešené (CHANGELOG v19) naozaj vyriešené sú.
const { load } = require("../../test_harness");
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..","..");
const APP=fs.readFileSync(path.join(R,"data","app.js"),"utf8");
const SAB=fs.readFileSync(path.join(R,"data","sablona.html"),"utf8");
const app=load({stav:{profil:{osoby:2,kcal:1450}},seed:2});
const ok=(id,t,podm,dokaz)=>console.log(`  ${podm?"✅":"❌"} ${id} — ${t}${dokaz?"   ["+dokaz+"]":""}`);

console.log("=== AUDIT 18.8. — A (generátor) ===");
ok("A1","faktor zovretý na 0,85–1,15", /FAKTOR_MIN=0\.85, FAKTOR_MAX=1\.15/.test(APP));
ok("A2","bielkoviny ako multiplikátor váhy", /w\*=\s*\(slot==="Snack"\)/.test(APP));
ok("A3","min. kcal pre hlavný chod", /MIN_KCAL_HLAVNY=300/.test(APP));
ok("A4","maCarb pozná Cestoviny/pizzu", app.maCarb({kategoria:"Cestoviny",nazov:"Cacio e Pepe",ingrediencie:[]}) && app.maCarb({kategoria:"Hlavné jedlo",nazov:"Pizza Margherita",ingrediencie:[]}));
ok("A5","kupované snacky = váha, nie filter", /kupSnack && \(r\.tagy\|\|\[\]\)\.includes\("kupované"\)\) w\*=2/.test(APP));
ok("A6","pamäť medzi týždňami", /TYZDNE_PAMATE=4/.test(APP));

console.log("\n=== AUDIT 18.8. — B (výpočty) ===");
const kokos=app.najdiPotravinu("Kokosového mlieka");
ok("B1","„Kokosového mlieka\" sa páruje správne", kokos && kokos.kluc.includes("kokosov") && kokos.kluc.includes("mliek"), kokos?kokos.kluc:"nenapárované");
ok("B2","„ks\" bez g_za_ks NIE je 60 g", app.gramy({mnozstvo:4,jednotka:"ks"},{kluc:"kardamóm"})===0);
ok("B3","KS_DEF má prednosť pred g_za_ks", app.gramy({mnozstvo:4,jednotka:"list"},{kluc:"šalát",g_za_ks:300})===32, "4 list = "+app.gramy({mnozstvo:4,jednotka:"list"},{kluc:"šalát",g_za_ks:300})+" g");
ok("B4","kurátorovanému kcal sa verí vždy", /v\.kcal=j;/.test(APP));
ok("B5","všetky potraviny majú cenu", app.POTRAVINY.filter(p=>p.cena100==null).length===0);
ok("B6","všetky potraviny majú vlákninu aj sodík", app.POTRAVINY.filter(p=>p.vlaknina==null||p.sodik==null).length===0);
ok("B7","dni „preč\" sa nerátajú do porcií", /porcieSlotBlok\(di,slot,cid\)\{ const dni=denyBloku\(di\)\.filter/.test(APP));
ok("B8","prah 200 kcal nahradený prepínačom", !/base<200/.test(APP) && /naplnene<2/.test(APP));
ok("B9","dayPpl sa delí faktorom", /if\(n>0\)return n\/f;/.test(APP));
ok("B10a","hustota doplnená", app.POTRAVINY.filter(p=>p.hustota===1).length < app.POTRAVINY.length*0.7, app.POTRAVINY.filter(p=>p.hustota===1).length+"/"+app.POTRAVINY.length+" má hustotu 1");
ok("B10b","NEDELITELNE_JEDNOTKY obsahuje strúčik/list/hlávka", app.NEDELITELNE_JEDNOTKY.includes("strúčik"), "["+app.NEDELITELNE_JEDNOTKY.join(", ")+"] → prevodJednotka(2.92,'strúčik') = "+app.prevodJednotka(2.92,"strúčik"));
const cm=(()=>{const s=app.S; s.profil.biel=200; const r=app.cieloveMakra(1450); s.profil.biel=0; return r;})();
ok("B10c","cieloveMakra nespadne na 0 g sacharidov pri vysokom cieli bielkovín", cm.s>0, "biel=200 → "+JSON.stringify(cm));

console.log("\n=== AUDIT 18.8. — C (nákup a špajza) ===");
ok("C1","PL/ČL nie sú „ks\"", app.rodinaJednotky("ČL")==="ml" && app.rodinaJednotky("strúčik")==="pocet");
ok("C2","nakupCena rešpektuje prepínač balení", /nakupCena\(G\)\{ if\(S\.profil\.balenia!==false\)/.test(APP));
ok("C3","špajza sa odpočítava po gramoch", /function spajzaGramy/.test(APP));
ok("C4","položky zo špajze sú v kopírovanom zozname", /mám doma/.test(APP));
ok("C5","tokeny „Mám doma\" min. 3 znaky", /filter\(x=>x\.length>=3\)/.test(APP));
ok("C6","gramy/gramyNaJed inverzné", app.gramyNaJed(app.gramy({mnozstvo:5,jednotka:"strúčik"},null),"strúčik",null)===5);
ok("C7","všetky oddelenia v poradí", app.POTRAVINY.every(p=>app.PORADIE_ODDELENI.includes(p.oddelenie||"Ostatné")));

console.log("\n=== AUDIT 19.8. — D/UI ===");
ok("D1","debounce hľadania", /_gridTimer=setTimeout\(renderGrid,200\)/.test(APP));
ok("D2","„Mám doma\" s odkladom", /_domaTimer=setTimeout/.test(APP));
ok("D4","Escape zatvára varenie", /zavri\(\);zavriPick\(\); if\(typeof zavriCook==="function"\)zavriCook\(\)/.test(APP));
ok("D5","zatvorenie modálu zahodí históriu", /_zahodHistoriuModalu/.test(APP));
ok("D6","polia dostanú label programovo", /function zpristupniFormulare/.test(APP));
ok("D7","„skopíruj minulý týždeň\" berie NAJNOVŠÍ", /const j=a\[0\];/.test(APP));
ok("D8","hodnotenie nezahodí kontext plánu", /function hodnot\(id,n\).*otvor\(id,_poslednyCtx\)/.test(APP));
ok("D9","naplnKuchyne po pridaní receptu", /zabudniVyzivu\(\); naplnKuchyne\(\);/.test(APP));
ok("D10","vyberDnes bez Math.random v komparátore", !/sort\(\([^)]*\)=>Math\.random/.test(APP));
["otvorGenConfig","novyIngRows","dnesId","planMode"].forEach(f=>ok("D11","mŕtva funkcia "+f+" odstránená", !new RegExp("\\b"+f+"\\b").test(APP)));
ok("D11","vodný tracker (S.voda) — buď funkčný, alebo preč", !/S\.voda/.test(APP), /S\.voda/.test(APP)?"stále v kóde":"odstránený");

console.log("\n=== AUDIT 19.8. — OTVORENÉ P1 (BASELINE ich priznáva) ===");
ok("P1a","karty receptov sú dosiahnuteľné klávesnicou",
  /class="card"[^>]*tabindex|<button class="thumb"/.test(APP), "kartaHTML používa: "+(APP.match(/<div class="thumb" onclick[^"]*"/)||["?"])[0]);
ok("P1b","bunky plánu sú dosiahnuteľné klávesnicou",
  /zpristupniKliky[\s\S]{0,200}\.card/.test(APP), "zpristupniKliky selektor: "+(APP.match(/querySelectorAll\("\.chip:not[^"]*"/)||["?"])[0].slice(0,140));
ok("P1c","mriežka nerenderuje všetkých 1956 receptov naraz",
  /slice\(0,\s*\d+\)[\s\S]{0,80}grid\.appendChild|IntersectionObserver/.test(APP), "renderGrid robí zoz.forEach(...) bez stránkovania");
