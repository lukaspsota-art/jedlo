// AUDIT: nedeliteľné jednotky (ks/plátok/rožok/žemľa) sa NEškálujú faktorom veľkosti porcie,
// ale počet porcií sa faktorom DELÍ → do nákupu ide 1/f násobok kusov.
//   skalovanaHodnota()  app.js:532  — nedeliteľné × fPocet (bez fVelkost)
//   pocetPorciiDna()    app.js:711  — vracia pocetPorcii(di)/f
const { load } = require("../../test_harness");
const app = load({stav:{viewOd:"2026-08-17",hranice:[true,false,true,false,false,true,false],blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:99});
(async()=>{
let ksSpravne=0, ksSkutocne=0, delSpravne=0, delSkutocne=0, faktory={};
let ukazky=[];
for(let w=0;w<20;w++){
  app.S.viewOd=app.pridajDni("2026-08-17",w*7);
  await app.generujJedalnicek(true);
  const varenia={};
  app.planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return;
    const k=(cid||r.id)+"|"+slot+"|"+app.denyBloku(di)[0];
    if(varenia[k])return;
    const dni=app.denyBloku(di).filter(d=>app.slotyDna(d).includes(slot)&&app.slotIds(d,slot).includes(cid));
    const presne=(dni.length?dni:[di]).reduce((a,d)=>a+app.porcieSlot(d,slot),0);
    varenia[k]={r,presne,zaokr:app.porcieSlotBlok(di,slot,cid),f:app.pf(di,slot)}; });
  Object.values(varenia).forEach(({r,presne,zaokr,f})=>{
    faktory[f]=(faktory[f]||0)+1;
    (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return;
      const nedel=app.NEDELITELNE_JEDNOTKY.includes((i.jednotka||"").toLowerCase());
      const perPor=i.mnozstvo/(r.porcie||1);
      // koľko sa reálne dostane do nákupu
      const skut=app.skalovanaHodnota(i.mnozstvo, i.jednotka, zaokr/(r.porcie||1), f);
      // koľko by malo byť: presný počet porcií × faktor (kalorický dopyt domácnosti)
      const spravne=perPor*presne*f;
      if(nedel){ ksSpravne+=spravne; ksSkutocne+=skut;
        if(ukazky.length<6 && Math.abs(skut-spravne)>0.5) ukazky.push(`${r.id} · ${i.nazov} ${i.mnozstvo} ${i.jednotka} · f=${f} → nákup ${skut.toFixed(2)}, správne ${spravne.toFixed(2)}`); }
      else { delSpravne+=spravne; delSkutocne+=skut; } });
  });
}
const p=(a,b)=>((a/b-1)*100).toFixed(1)+" %";
console.log("20 vygenerovaných týždňov, 2 stravníci × 1450 kcal");
console.log("  faktory v pláne:",JSON.stringify(faktory));
console.log("  DELITEĽNÉ jednotky (g/ml/PL…): nákup",delSkutocne.toFixed(0),"vs správne",delSpravne.toFixed(0),"→",p(delSkutocne,delSpravne));
console.log("  NEDELITEĽNÉ (ks/plátok/rožok/žemľa): nákup",ksSkutocne.toFixed(1),"vs správne",ksSpravne.toFixed(1),"→",p(ksSkutocne,ksSpravne));
console.log("\n  ukážky:"); ukazky.forEach(u=>console.log("   ",u));
console.log("\n  Dopad: vajcia, rožky, žemle, plátky syra/šunky sa kupujú o ~1/f viac, než domácnosť zje.");
})();
