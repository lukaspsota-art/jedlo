// AUDIT: makrá sa škálujú faktorom z kcal-rozdielu. Kde to dáva nezmyselné bielkoviny?
const { load } = require("../../test_harness");
const app = load({stav:{profil:{osoby:2,kcal:1450}}, seed:5});
function cisty(r){ let kc=0,b=0; (r.ingrediencie||[]).forEach(i=>{ const p=app.najdiPotravinu(i.nazov); if(!p)return; const g=app.gramy(i,p); if(g>0){kc+=g*p.kcal/100; b+=g*p.bielkoviny/100;} }); const por=r.porcie||1; return {kcal:kc/por,b:b/por}; }
const zoz=[];
app.RECEPTY.forEach(r=>{ if(!(r.kcal_na_porciu>0))return; const c=cisty(r); if(!(c.kcal>5))return;
  const q=c.kcal/r.kcal_na_porciu; const v=app.vyzivaReceptu(r);
  zoz.push({id:r.id,q,surB:c.b,zobrB:v.b,zobrKcal:v.kcal,surKcal:c.kcal,b100:v.b/(v.kcal/100)}); });
zoz.sort((a,b)=>b.q-a.q);
console.log("=== 15 receptov s najväčším pomerom výpočet/kurátorované (makrá delené týmto pomerom) ===");
zoz.slice(0,15).forEach(x=>console.log(`  ${x.id.padEnd(42)} pomer ${x.q.toFixed(2)}×  suroviny ${Math.round(x.surKcal)} kcal / B ${x.surB.toFixed(1)} g  →  zobrazí ${Math.round(x.zobrKcal)} kcal / B ${x.zobrB.toFixed(1)} g`));
console.log("\n=== 10 s najmenším pomerom (makrá NÁSOBENÉ) ===");
zoz.slice(-10).forEach(x=>console.log(`  ${x.id.padEnd(42)} pomer ${x.q.toFixed(2)}×  suroviny ${Math.round(x.surKcal)} kcal / B ${x.surB.toFixed(1)} g  →  zobrazí ${Math.round(x.zobrKcal)} kcal / B ${x.zobrB.toFixed(1)} g`));
const nad2=zoz.filter(x=>x.q>2).length, pod05=zoz.filter(x=>x.q<0.5).length;
console.log("\n  receptov s pomerom >2×:",nad2," · <0,5×:",pod05);
// dopad na kolekciu „Vysoký proteín" a na generátor (vahaReceptu je multiplikatívna v bielkovinách)
const green=app.RECEPTY.filter(r=>app.healthScore(r).farba==="green").length;
console.log("  receptov v kolekcii Vysoky protein (>=10 g/100 kcal):",green);
console.log("  z toho takých, kde bielkoviny vznikli VYNÁSOBENÍM (pomer<0,8):",
  zoz.filter(x=>x.q<0.8 && x.b100>=10).length);
