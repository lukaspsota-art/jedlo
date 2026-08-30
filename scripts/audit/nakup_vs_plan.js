// AUDIT: Plán/Výživa ukazujú kcal z `kcal_na_porciu`, nákup kupuje SUROVINY. Rozdiel?
const { load } = require("../../test_harness");
const app = load({stav:{viewOd:"2026-08-17",hranice:[true,false,true,false,false,true,false],blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:99});
(async()=>{
const pomery=[];
for(let w=0;w<20;w++){
  app.S.viewOd=app.pridajDni("2026-08-17",w*7);
  await app.generujJedalnicek(true);
  const {grp}=app.nakupPolozky();
  let nk=0; Object.values(grp).forEach(G=>{ if(G.matched)nk+=G.grams*G.p.kcal/100; });
  // najväčší prispievateľ rozdielu = recept s najväčším pomerom výpočet/kurátorované v pláne
  let naj=null,najQ=1;
  const varenia=new Set();
  app.planItems().forEach(({r})=>{ if(r._left||r._priloha)return; if(varenia.has(r.id))return; varenia.add(r.id);
    if(!(r.kcal_na_porciu>0))return;
    let kc=0;(r.ingrediencie||[]).forEach(i=>{const p=app.najdiPotravinu(i.nazov); if(p){const g=app.gramy(i,p); if(g>0)kc+=g*p.kcal/100;}});
    const q=(kc/(r.porcie||1))/r.kcal_na_porciu; if(q>najQ){najQ=q;naj=r.id;} });
  pomery.push({w,pom:nk/(2*1450*7),naj,najQ});
}
console.log("týždeň | nákup/dopyt | najhorší recept v pláne (pomer suroviny/deklarované)");
pomery.forEach(p=>console.log(`  ${String(p.w).padStart(2)}   |    ${p.pom.toFixed(2)}     | ${p.naj||"-"} ${p.naj?"("+p.najQ.toFixed(1)+"×)":""}`));
const pr=pomery.reduce((a,p)=>a+p.pom,0)/pomery.length;
console.log("\n  priemer 20 týždňov:",pr.toFixed(3),"→ domácnosť nakupuje o",Math.round((pr-1)*100),"% viac kalórií, než jej Plán a Výživa hlásia");
console.log("  v eurách pri 128 €/týždeň to je ~",Math.round((pr-1)*128),"€ týždenne nadbytočného jedla");
})();
