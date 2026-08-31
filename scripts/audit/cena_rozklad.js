// ROZKLAD CENY TÝŽDŇA (agent PRAVDA-V-ČÍSLACH).
// Odpovedá na: z čoho sa skladá 130–230 € týždňa a koľko z toho je CHYBA VÝPOČTU
// (zlá jednotka, nafúknuté množstvo, dvojité započítanie) a koľko skutočný výber surovín.
const { load } = require("../../test_harness");
const N = parseInt(process.argv[2]) || 10;
const SEED = parseInt(process.argv[3]) || 20260818;
const app = load({ stav:{ viewOd:"2026-08-17", hranice:[true,false,true,false,false,true,false], blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:SEED });

(async()=>{
const podlaOdd={}, podlaKluc={}, podozrive=[];
let spolu=0, spoluBal=0, tyzdne=0;
for(let w=0;w<N;w++){
  app.S.viewOd=app.pridajDni("2026-08-17",w*7);
  await app.generujJedalnicek(true);
  const rows=app.nakupItems().filter(r=>r.gkey);
  const s=app.cenaTyzdna("spotreba"), b=app.cenaTyzdna("balenia");
  spolu+=s; spoluBal+=b; tyzdne++;
  rows.forEach(r=>{
    const G=app.nakupPolozky().grp[r.gkey]; if(!G) return;
    podlaOdd[r.odd]=(podlaOdd[r.odd]||0)+(r.cenaSpotreba||0);
    const k=G.p?G.p.kluc:r.nazov;
    if(!podlaKluc[k])podlaKluc[k]={eur:0,g:0,n:0};
    podlaKluc[k].eur+=r.cenaSpotreba||0; podlaKluc[k].g+=G.grams||0; podlaKluc[k].n++;
    // podozrivé množstvá: > 2 kg jednej suroviny na týždeň pre 2 osoby, alebo > 8 € na položku
    if((G.grams>2000&&G.p&&G.p.oddelenie!=="Nápoje")||(r.cenaSpotreba||0)>8)
      podozrive.push({t:w,nazov:r.nazov,g:Math.round(G.grams),eur:+(r.cenaSpotreba||0).toFixed(2),
        zdroje:(G.zdroje||[]).map(z=>z.recept+" "+z.mn+" "+z.jednotka).slice(0,3).join(" · ")});
  });
}
const eur=x=>x.toFixed(2)+" €";
console.log(`${N} týždňov, seed ${SEED}, 2 stravníci × 1450 kcal\n`);
console.log("priemer/týždeň:  spotreba", eur(spolu/tyzdne), " · celé balenia", eur(spoluBal/tyzdne),
  " · na osobu a deň", eur(spolu/tyzdne/2/7));
console.log("\n=== podľa oddelenia (priemer € / týždeň) ===");
Object.entries(podlaOdd).sort((a,b)=>b[1]-a[1]).forEach(([o,v])=>
  console.log("  "+o.padEnd(28)+(v/tyzdne).toFixed(2).padStart(7)+" €   "+Math.round(v/spolu*100)+" %"));
console.log("\n=== 25 najdrahších surovín (priemer € / týždeň, keď sa vyskytnú) ===");
Object.entries(podlaKluc).sort((a,b)=>b[1].eur-a[1].eur).slice(0,25).forEach(([k,v])=>
  console.log("  "+k.padEnd(30)+(v.eur/tyzdne).toFixed(2).padStart(7)+" €/týž  ("+v.n+"× · "+Math.round(v.g/v.n)+" g/výskyt)"));
console.log("\n=== podozrivé riadky (>2 kg alebo >8 € na položku) ===");
podozrive.sort((a,b)=>b.eur-a.eur).slice(0,20).forEach(x=>
  console.log(`  t${x.t} ${x.nazov.padEnd(30)} ${String(x.g).padStart(6)} g  ${String(x.eur).padStart(6)} €   ${x.zdroje}`));
})();
