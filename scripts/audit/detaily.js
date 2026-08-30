const { load } = require("../../test_harness");
const app = load({stav:{viewOd:"2026-08-17",hranice:[true,false,true,false,false,true,false],blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:99});

console.log("=== B10a: hustota=1 tam, kde na nej záleží ===");
const tek=app.POTRAVINY.filter(p=>app.jeTekutina(p));
console.log("  potravín považovaných za tekutinu:",tek.length,"· z nich hustota===1:",tek.filter(p=>p.hustota===1).length);
console.log("  príklady:",tek.filter(p=>p.hustota===1).slice(0,12).map(p=>p.kluc).join(", "));
// koľko ingrediencií používa objemovú jednotku pri suchej surovine (múka, cukor v PL)
let objemSuche=0, ukazky=[];
app.RECEPTY.forEach(r=>(r.ingrediencie||[]).forEach(i=>{ const j=(i.jednotka||"").toLowerCase().trim();
  if(app.ML_JED[j]==null && j!=="ml" && j!=="l")return;
  const p=app.najdiPotravinu(i.nazov); if(!p||app.jeTekutina(p))return;
  objemSuche++; if(ukazky.length<8)ukazky.push(i.mnozstvo+" "+i.jednotka+" "+i.nazov+" → "+app.gramy(i,p).toFixed(1)+" g"); }));
console.log("  ingrediencií objem x sucha surovina (PL/CL/salka):",objemSuche);
ukazky.forEach(u=>console.log("    ",u));

console.log("\n=== B10b: počítateľné jednotky, ktoré sa zobrazujú s desatinami ===");
const POC=["strúčik","strucik","list","lístok","listok","hlávka","hlavka","zväzok","zvazok","hrsť","hrst","vetvička","vetvicka","štipka","stipka"];
let n=0; const podla={};
app.RECEPTY.forEach(r=>(r.ingrediencie||[]).forEach(i=>{ const j=(i.jednotka||"").toLowerCase().trim();
  if(POC.includes(j)){ n++; podla[j]=(podla[j]||0)+1; } }));
console.log("  ingrediencií s takou jednotkou:",n,JSON.stringify(podla));
console.log("  ukážka pri 2,3 porciách: prevodJednotka(2.92,'strúčik') =",app.prevodJednotka(2.92,"strúčik"),
  "· ('hlávka') =",app.prevodJednotka(1.4,"hlávka"),"· ('vajce v ks') =",app.prevodJednotka(2.92,"ks"));

(async()=>{
console.log("\n=== Nákup obsahuje viac kcal, než domácnosť potrebuje — odkiaľ? ===");
let sumNad=0, sumDopyt=0, dniPocet=0, rozdiely=[];
for(let w=0;w<8;w++){
  app.S.viewOd=app.pridajDni("2026-08-17",w*7);
  await app.generujJedalnicek(true);
  const {grp}=app.nakupPolozky();
  let nk=0; Object.values(grp).forEach(G=>{ if(G.matched)nk+=G.grams*G.p.kcal/100; });
  const dopyt=2*1450*7; sumNad+=nk; sumDopyt+=dopyt; rozdiely.push(nk/dopyt);
}
console.log("  8 týždňov: nákup/dopyt =",(sumNad/sumDopyt).toFixed(3),"· po týždňoch:",rozdiely.map(x=>x.toFixed(2)).join(" "));
// zdroj: zaokrúhlenie porcieSlotBlok
let presne=0, zaokr=0;
const varenia={};
app.planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return; const k=(cid||r.id)+"|"+slot+"|"+app.denyBloku(di)[0];
  if(!varenia[k]){ const dni=app.denyBloku(di).filter(d=>app.slotyDna(d).includes(slot)&&app.slotIds(d,slot).includes(cid));
    const suma=(dni.length?dni:[di]).reduce((a,d)=>a+app.porcieSlot(d,slot),0);
    varenia[k]={suma,zaokr:Math.max(1,Math.round(suma))}; } });
Object.values(varenia).forEach(v=>{ presne+=v.suma; zaokr+=v.zaokr; });
console.log("  porcie spolu: presne",presne.toFixed(2),"→ po Math.round",zaokr,"("+((zaokr/presne-1)*100).toFixed(1)+" % navyše)");
console.log("  → to je zdroj rozdielu; navyše kcal sa NEUKÁŽE nikde (Výživa aj Plán počítajú z receptov, nie z nákupu)");

console.log("\n=== Výkon renderGrid (1956 kariet) ===");
const t0=Date.now(); app.__orig.renderGrid(); const t1=Date.now();
app.__orig.renderGrid(); const t2=Date.now();
console.log("  1. prekreslenie:",t1-t0,"ms (studená cache výživy) · 2.:",t2-t1,"ms — v prehliadači sa k tomu pridá layout ~19 000 uzlov");
})();
