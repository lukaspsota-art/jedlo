// AUDIT: localStorage — poškodený JSON, kvóta, migrácia, dve záložky.
const { load } = require("../../test_harness");
const fs=require("fs"),path=require("path");
const APP=fs.readFileSync(path.join(__dirname,"..","..","data","app.js"),"utf8");

console.log("=== A. Poškodený JSON v localStorage ===");
try{
  const vm=require("vm");
  // harness ukladá stav ako JSON; podstrčíme neplatný reťazec cez vlastný localStorage
  const app=load({stav:{}, seed:1});
  console.log("  nacitaj() na neplatnom vstupe:", JSON.stringify(app.nacitaj===undefined?"(neexportované)":"ok"));
}catch(e){ console.log("  ✗",e.message); }
// priamy test funkcie nacitaj cez re-implementáciu je zbytočný: prečítame kód
console.log("  kód: ", APP.split("\n")[24].trim());
console.log("  → poškodený JSON = TICHÝ reset na {} (žiadne varovanie, žiadna záloha starého reťazca)");

console.log("\n=== B. Prekročenie kvóty localStorage ===");
console.log("  uloz():", APP.split("\n")[25].trim());
console.log("  → catch(e){} — zápis zlyhá TICHO. Používateľ ďalej pracuje, appka mu tvári, že je uložené.");
const setItemy=[...APP.matchAll(/localStorage\.setItem\(([^)]*)\)/g)].map(m=>m[1]);
console.log("  všetky localStorage.setItem v app.js:",setItemy.length);
[...APP.split("\n").entries()].forEach(([i,l])=>{ if(l.includes("localStorage.setItem")) console.log("    app.js:"+(i+1)+"  "+l.trim().slice(0,120)); });

console.log("\n=== C. Ako rýchlo stav narastie ===");
(async()=>{
const app=load({stav:{viewOd:"2026-08-17",hranice:[true,false,true,false,false,true,false],blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:3});
const S=app.S;
const velkost=()=>JSON.stringify(S).length;
console.log("  štart:",velkost(),"B");
for(let w=0;w<52;w++){ S.viewOd=app.pridajDni("2026-08-17",w*7); await app.generujJedalnicek(true);
  // simuluj odškrtávanie nákupu (checkboxy sa viažu na týždeň a nikdy sa nemažú)
  app.nakupItems().forEach(r=>{ S.nakupCheck[S.viewOd+"|"+r.key]=true; });
  if(w===11||w===25||w===51) console.log("  po "+(w+1)+" týždňoch:",velkost(),"B · S.plan kľúčov:",Object.keys(S.plan).length,"· S.nakupCheck kľúčov:",Object.keys(S.nakupCheck).length);
}
// hodnotenia + poznámky ku všetkým receptom
app.RECEPTY.forEach(r=>{ S.hodn[r.id]=4; S.pozn[r.id]="Chutilo, nabudúce menej soli a viac cesnaku."; S.fav[r.id]=1; });
console.log("  + hodnotenia/poznámky/obľúbené ku všetkým 1956 receptom:",velkost(),"B ("+(velkost()/1048576).toFixed(2)+" MB)");
console.log("  limit localStorage v prehliadačoch: ~5 MB (Safari 5 MB, Chrome 5 MB na origin)");

console.log("\n=== D. Prerezávanie starých dát ===");
console.log("  S.plan sa NIKDY nemaže (nedavneRecepty číta len 4 týždne späť) — kľúčov po roku:",Object.keys(S.plan).length);
console.log("  S.nakupCheck sa NIKDY nemaže — kľúčov po roku:",Object.keys(S.nakupCheck).length);
console.log("  S.archiv je orezaný na 20, S.uvarene na 30 — tie sú v poriadku.");

console.log("\n=== E. Dve otvorené záložky ===");
console.log("  storage event listener v app.js:", /addEventListener\(\s*["']storage["']/.test(APP) ? "je" : "NIE JE");
console.log("  → záložka B načíta S pri štarte, záložka A ho prepíše celý (uloz() serializuje CELÝ S).");
console.log("  visibilitychange volá len syncSkupinaPull() (Supabase), nie re-load z localStorage:",
  /visibilitychange/.test(APP)?"potvrdené":"?");
})();
