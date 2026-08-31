// ROZKLAD rozdielu „Nákup vs. Plán“ (agent PRAVDA-V-ČÍSLACH).
// Plán/Výživa hlásia Σ kcal_na_porciu, Nákup kupuje suroviny. Kde presne rozdiel vzniká?
//   A) zaokrúhlenie porcií — recept sa varí na celé porcie, deň potrebuje zlomok
//   B) nedeliteľné jednotky (ks/rožok/plátok) sa zaokrúhľujú nahor
//   C) dátový rozdiel receptu: Σ(suroviny)/porcia ≠ kcal_na_porciu (faktor q)
//   D) suroviny bez množstva („podľa chuti") — v nákupe nemajú gramáž, v pláne kcal áno
const { load } = require("../../test_harness");
const N = parseInt(process.argv[2]) || 20;
const SEED = parseInt(process.argv[3]) || 99;
const app = load({ stav:{ viewOd:"2026-08-17", hranice:[true,false,true,false,false,true,false], blokMode:true,
  genCfg:{ zachovat:false, cielMode:true, filtre:[] },
  profil:{ osoby:2, kcal:1450, stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}] } }, seed:SEED });

function surovinyKcal(r){ let k=0; (r.ingrediencie||[]).forEach(i=>{ const p=app.najdiPotravinu(i.nazov);
  if(!p) return; const g=app.gramy(i,p)*app.vsiaknuteho(i); if(g>0) k+=g*p.kcal/100; }); return k; }

(async()=>{
const sum={plan:0,nakup:0,varene:0,varenePlan:0};
const podiel={};   // recept → koľko kcal navyše priniesol jeho faktor q
for(let w=0;w<N;w++){
  app.S.viewOd=app.pridajDni("2026-08-17",w*7);
  await app.generujJedalnicek(true);

  // 1) čo appka SĽUBUJE zjesť (Plán/Výživa): kcal_na_porciu × porcie dňa × faktor
  let plan=0;
  for(let di=0;di<7;di++){
    app.slotyDna(di).forEach(sl=>{
      app.slotIds(di,sl).forEach(cid=>{ const r=app.komponent(cid); if(!r)return;
        plan+=app.vyzivaReceptu(r).kcal*app.pocetPorciiDna(di)*app.pf(di,sl); });
    });
  }
  // 2) čo sa NAVARÍ (celé porcie na blok) — v kcal_na_porciu aj v surovinách
  const varenia={};
  app.planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return;
    const k=(cid||r.id)+"|"+slot+"|"+app.denyBloku(di)[0];
    if(!varenia[k])varenia[k]={r,porcie:app.porcieSlotBlok(di,slot,cid),f:app.pf(di,slot)}; });
  let varene=0,varenePlan=0;
  Object.values(varenia).forEach(({r,porcie,f})=>{
    const fPocet=porcie/(r.porcie||1);
    varenePlan+=app.vyzivaReceptu(r).kcal*porcie*f;
    const sk=surovinyKcal(r)*fPocet*f;
    varene+=sk;
    const rozdiel=sk-app.vyzivaReceptu(r).kcal*porcie*f;
    if(Math.abs(rozdiel)>1) podiel[r.id]=(podiel[r.id]||0)+rozdiel;
  });
  // 3) čo sa KÚPI (nákupný zoznam, po zaokrúhlení jednotiek)
  const {grp}=app.nakupPolozky();
  let nakup=0; Object.values(grp).forEach(G=>{ if(G.matched)nakup+=G.grams*G.p.kcal/100; });

  sum.plan+=plan; sum.nakup+=nakup; sum.varene+=varene; sum.varenePlan+=varenePlan;
}
const f=x=>x.toFixed(3);
console.log(`${N} týždňov, seed ${SEED}, 2 stravníci × 1450 kcal\n`);
console.log("  Plán/Výživa sľubuje                 ", Math.round(sum.plan), "kcal");
console.log("  Navarí sa (celé porcie, kcal_na_porciu)", Math.round(sum.varenePlan), "kcal  → pomer", f(sum.varenePlan/sum.plan));
console.log("  Tie isté varenia v SUROVINÁCH       ", Math.round(sum.varene), "kcal  → pomer", f(sum.varene/sum.varenePlan));
console.log("  Nákupný zoznam (po zaokrúhlení)     ", Math.round(sum.nakup), "kcal  → pomer", f(sum.nakup/sum.varene));
console.log("\n  CELKOM nákup / plán =", f(sum.nakup/sum.plan));
console.log("  z toho:  A) zaokrúhlenie porcií  ×"+f(sum.varenePlan/sum.plan));
console.log("           C) dátový rozdiel receptov ×"+f(sum.varene/sum.varenePlan));
console.log("           B+D) jednotky a chýbajúce gramy ×"+f(sum.nakup/sum.varene));
const top=Object.entries(podiel).sort((a,b)=>b[1]-a[1]).slice(0,12);
console.log("\n  najväčší prispievatelia dátového rozdielu (kcal navyše za "+N+" týždňov):");
top.forEach(([id,v])=>console.log("   "+id.padEnd(52)+Math.round(v)));
const dole=Object.entries(podiel).sort((a,b)=>a[1]-b[1]).slice(0,6);
console.log("  a naopak (kcal chýbajúce v surovinách):");
dole.forEach(([id,v])=>console.log("   "+id.padEnd(52)+Math.round(v)));
})();
