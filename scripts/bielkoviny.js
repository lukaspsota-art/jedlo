// Rozloženie bielkovín cez viac týždňov — koľko % energie dňa tvoria bielkoviny.
// Beh:  node scripts/bielkoviny.js [pocet_tyzdnov] [ciel_kcal]     (default 12 2000)
// Načo: `cieloveMakra` mieri na 30 % energie a `zlepsiBielkoviny` deň naň vytiahne, ale nadol
// deň neťahalo nič. Táto sonda ukazuje CHVOST — p90/p95/max a podiel dní nad stropom 35 %
// (horná hranica pásma AMDR). Strop drží `znizBielkoviny` v data/app.js.
const { load } = require("../test_harness");
const N=parseInt(process.argv[2])||12, CIEL=parseInt(process.argv[3])||2000;
const app = load({ stav:{ viewOd:"2026-08-17", hranice:[true,false,true,false,false,true,false], blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:CIEL,stravnici:[{nazov:"A",kcal:CIEL},{nazov:"B",kcal:CIEL}]} }, seed:20260818 });
const S=app.S; const pod=[];
for(let w=0;w<N;w++){
  app.generujJedalnicek(true);
  for(let di=0;di<7;di++){
    const sl=app.slotyDna(di); let kc=0,b=0;
    sl.forEach(s=>{ const f=app.pf(di,s); app.slotIds(di,s).forEach(cid=>{ const r=app.komponent(cid); if(!r)return;
      kc+=app.kcalPorcia(r)*f; b+=app.vyzivaReceptu(r).b*f; }); });
    if(kc>0) pod.push({kc,b,pct:b*4/kc*100});
  }
  S.viewOd=app.pridajDni(S.viewOd,7);
}
pod.sort((x,y)=>x.pct-y.pct);
const q=p=>pod[Math.floor((pod.length-1)*p)];
const nad=t=>pod.filter(x=>x.pct>t).length;
console.log("dní:",pod.length,"| cieľ:",CIEL,"kcal");
console.log("bielkoviny ako % energie — min/medián/p90/p95/max:",
  q(0).pct.toFixed(1), q(.5).pct.toFixed(1), q(.9).pct.toFixed(1), q(.95).pct.toFixed(1), q(1).pct.toFixed(1));
console.log("gramy — medián/p95/max:", q(.5).b.toFixed(0), q(.95).b.toFixed(0), q(1).b.toFixed(0));
console.log("dní nad 35 % energie:", nad(35), "("+(nad(35)/pod.length*100).toFixed(1)+" %)");
