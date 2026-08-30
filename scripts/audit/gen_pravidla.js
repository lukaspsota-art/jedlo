// AUDIT: overí doménové pravidlá generátora z CLAUDE.md na N vygenerovaných týždňoch.
// Beh: node scripts/audit/gen_pravidla.js [N]   (default 50)
const { load } = require("../../test_harness");
const N = parseInt(process.argv[2]) || 50;
const PRVY = "2026-08-17";

function stav(){ return {
  viewOd: PRVY, hranice:[true,false,true,false,false,true,false], blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]} }; }

const pct=(n,d)=>d?Math.round(n/d*1000)/10:0;

(async()=>{
const app=load({stav:stav(),seed:20260830});
const S=app.S;
const R={
  blokovVTyzdni:{}, variantPorusenia:0, variantSpolu:0,
  krizBlokov:0, krizBlokovSpolu:0,
  carryCA:0, carryCASpolu:0,
  obedVecera:0, obedVeceraSpolu:0,
  poradiePlne:0, poradieSpolu:0,
  paryZle:{}, // "Obed>Večera" atď
  ranajkyBazaKolizia:0, ranajkyBlokov:0,
  slotyNenaplnene:0, slotySpolu:0,
  dniKcal:[], dniKcalPoSkalovani:[],
};
let prevC=null;
for(let w=0;w<N;w++){
  S.viewOd=app.pridajDni(PRVY,w*7);
  await app.generujJedalnicek(true);
  const bl=app.bloky();
  R.blokovVTyzdni[bl.length]=(R.blokovVTyzdni[bl.length]||0)+1;

  // (2) 1 variant / slot / blok
  const blokSety=bl.map(b=>{
    const set=new Set();
    app.SLOTY().forEach(sl=>{
      const ref=JSON.stringify(app.slotIds(b[0],sl));
      b.forEach(d=>{ R.variantSpolu++; if(JSON.stringify(app.slotIds(d,sl))!==ref) R.variantPorusenia++; });
      app.slotIds(b[0],sl).forEach(id=>{ if(typeof id==="string"&&id.indexOf("prf:")!==0) set.add(id.replace(/^left:/,"")); });
    });
    return set;
  });
  // (3) bez opakovania naprieč blokmi v týždni
  for(let i=0;i<blokSety.length;i++) for(let j=i+1;j<blokSety.length;j++){
    blokSety[i].forEach(id=>{ R.krizBlokovSpolu++; if(blokSety[j].has(id)) R.krizBlokov++; });
  }
  // (4) carryover C→A: recept z posledného bloku minulého týždňa v prvom bloku tohto
  if(prevC){ blokSety[0].forEach(id=>{ R.carryCASpolu++; if(prevC.has(id)) R.carryCA++; }); }
  prevC=blokSety[blokSety.length-1];

  // (5,6) poradie kcal a obed≠večera + naplnenie slotov
  for(let di=0;di<7;di++){
    const sloty=app.slotyDna(di); if(!sloty.length)continue;
    const kc={}; let sum=0, sumBase=0;
    sloty.forEach(sl=>{ const ids=app.slotIds(di,sl); R.slotySpolu++; if(!ids.length){R.slotyNenaplnene++;return;}
      const f=app.pf(di,sl); const base=ids.reduce((a,cid)=>a+app.kcalPorcia(app.komponent(cid)),0);
      kc[sl]=base; sumBase+=base; sum+=base*f; });
    R.dniKcal.push(sumBase); R.dniKcalPoSkalovani.push(sum);
    const o=app.slotIds(di,"Obed")[0], v=app.slotIds(di,"Večera")[0];
    if(o!=null&&v!=null){ R.obedVeceraSpolu++; if(o===v)R.obedVecera++; }
    const por=["Obed","Večera","Raňajky","Snack"].filter(s=>kc[s]!=null);
    if(por.length===4){ R.poradieSpolu++; let ok=true;
      for(let i=1;i<por.length;i++){ if(kc[por[i]]>=kc[por[i-1]]){ ok=false;
        const kk=por[i-1]+">"+por[i]; R.paryZle[kk]=(R.paryZle[kk]||0)+1; } }
      if(ok)R.poradiePlne++; }
  }
  // (7) raňajky: iná báza pre každý blok
  const bazy=bl.map(b=>{ const id=app.slotIds(b[0],"Raňajky")[0]; const r=id&&app.komponent(id); return r?app.ranajkyBaza(r):null; }).filter(Boolean);
  R.ranajkyBlokov+=bazy.length;
  if(new Set(bazy).size<bazy.length) R.ranajkyBazaKolizia+=bazy.length-new Set(bazy).size;
}
const med=a=>{const b=a.slice().sort((x,y)=>x-y);const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};
console.log("=== Pravidlá generátora, "+N+" týždňov ===");
console.log("blokov v týždni:", JSON.stringify(R.blokovVTyzdni));
console.log("1 variant/slot/blok: porušení "+R.variantPorusenia+" / "+R.variantSpolu+" ("+pct(R.variantPorusenia,R.variantSpolu)+" %)");
console.log("bez opakovania naprieč blokmi: porušení "+R.krizBlokov+" / "+R.krizBlokovSpolu+" ("+pct(R.krizBlokov,R.krizBlokovSpolu)+" %)");
console.log("bez carryover C→A (medzi týždňami): porušení "+R.carryCA+" / "+R.carryCASpolu+" ("+pct(R.carryCA,R.carryCASpolu)+" %)");
console.log("obed ≠ večera: porušení "+R.obedVecera+" / "+R.obedVeceraSpolu);
console.log("celé poradie O>V>R>S: "+pct(R.poradiePlne,R.poradieSpolu)+" % ("+R.poradiePlne+"/"+R.poradieSpolu+")");
console.log("  porušené páry:", JSON.stringify(R.paryZle));
console.log("raňajky iná báza/blok: kolízií "+R.ranajkyBazaKolizia+" / "+R.ranajkyBlokov+" blokov");
console.log("nenaplnené sloty: "+R.slotyNenaplnene+" / "+R.slotySpolu);
console.log("kcal/deň pred škálovaním: medián "+Math.round(med(R.dniKcal))+", min "+Math.round(Math.min(...R.dniKcal))+", max "+Math.round(Math.max(...R.dniKcal)));
console.log("kcal/deň po škálovaní:    medián "+Math.round(med(R.dniKcalPoSkalovani))+", min "+Math.round(Math.min(...R.dniKcalPoSkalovani))+", max "+Math.round(Math.max(...R.dniKcalPoSkalovani)));
})();
