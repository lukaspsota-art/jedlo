// AUDIT: reťaz ingrediencia → gramy → výživa → deň → týždeň → nákup → cena
// Beh: node scripts/audit/vypocty.js
const { load } = require("../../test_harness");
const app = load({stav:{viewOd:"2026-08-17",hranice:[true,false,true,false,false,true,false],blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:7});

console.log("=== 1. gramy() a gramyNaJed() sú inverzné? ===");
const jednotky=[...new Set(["g","gram","gramov","kg","ml","l",...Object.keys(app.ML_JED),...Object.keys(app.KS_DEF),...app.KS_JEDNOTKY,"balenie"])];
let zle=[],nula=[];
const vzorky=app.POTRAVINY.slice(0,80).concat(app.POTRAVINY.filter(p=>p.g_za_ks||p.g_za_platok||p.balenie_g).slice(0,80));
vzorky.forEach(p=>{ jednotky.forEach(j=>{
  const mn=3.7; const g=app.gramy({mnozstvo:mn,jednotka:j},p);
  const back=app.gramyNaJed(g,j,p);
  if(g===0){ nula.push(p.kluc+"|"+j); return; }
  if(back==null || Math.abs(back-mn)>1e-9) zle.push(p.kluc+"|"+j+" → g="+g+" → späť "+back);
}); });
console.log("  nezhody:",zle.length, zle.slice(0,10));
console.log("  kombinácií, kde gramy()=0 (jednotku nevie previesť):",nula.length,"napr.",[...new Set(nula.map(x=>x.split("|")[1]))].slice(0,20).join(", "));

console.log("\n=== 2. Jednotky použité v receptoch, ktoré gramy() nevie previesť ===");
const pouzite={};
app.RECEPTY.forEach(r=>(r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return;
  const j=(i.jednotka||"").toLowerCase().trim(); const p=app.najdiPotravinu(i.nazov);
  const g=app.gramy(i,p);
  if(!(g>0)){ const k=j+" @ "+(p?p.kluc:"(nenapárované)"); pouzite[k]=(pouzite[k]||0)+1; } }));
const zoz=Object.entries(pouzite).sort((a,b)=>b[1]-a[1]);
console.log("  ingrediencií s nulovými gramami:",zoz.reduce((a,x)=>a+x[1],0));
zoz.slice(0,15).forEach(([k,n])=>console.log("   ",n+"×",k));

console.log("\n=== 3. Recepty, kde sa NEDÁ dopočítať výživa (kcal ≈ 0) ===");
let nulKcal=0, priblizne=0;
app.RECEPTY.forEach(r=>{ const v=app.vyzivaReceptu(r); if(!(v.kcal>5))nulKcal++; if(v.pribl)priblizne++; });
console.log("  kcal ≤ 5:",nulKcal,"/",app.RECEPTY.length,"· označené ako odhad (pribl):",priblizne);

console.log("\n=== 4. Delenie nulou / NaN / Infinity vo výžive ===");
let bad=[];
app.RECEPTY.forEach(r=>{ const v=app.vyzivaReceptu(r);
  for(const k in v){ const x=v[k]; if(typeof x==="number" && !isFinite(x)) bad.push(r.id+"."+k+"="+x); } });
console.log("  nekonečné/NaN hodnoty:",bad.length,bad.slice(0,10));

console.log("\n=== 5. porcie=0 alebo chýbajúce ===");
console.log("  receptov s porcie<=0 alebo null:",app.RECEPTY.filter(r=>!(r.porcie>0)).length);

console.log("\n=== 6. Kumulácia zaokrúhľovania: týždeň, 2 stravníci ===");
(async()=>{
await app.generujJedalnicek(true);
// súčet kcal, ktorý appka ukazuje v Pláne (na osobu) vs. kalorický dopyt domácnosti vs. nákup
let planKcalOsoba=0;
for(let di=0;di<7;di++){ app.slotyDna(di).forEach(sl=>{ const f=app.pf(di,sl);
  app.slotIds(di,sl).forEach(cid=>{ const k=app.komponent(cid); if(k)planKcalOsoba+=app.kcalPorcia(k)*f; }); }); }
// koľko kcal reálne obsahuje nákupný zoznam (celá domácnosť)
const {grp}=app.nakupPolozky();
let nakupKcal=0, nakupCena=0, bezCeny=0, hmotaBezCeny=0, hmota=0;
Object.values(grp).forEach(G=>{ if(!G.matched){ return; }
  nakupKcal+=G.grams*G.p.kcal/100; hmota+=G.grams;
  if(G.p.cena100==null){ bezCeny++; hmotaBezCeny+=G.grams; } else nakupCena+=G.grams/100*G.p.cena100; });
const nenapar=Object.values(grp).filter(G=>!G.matched);
console.log("  Plán ukazuje (na osobu, 7 dní):", Math.round(planKcalOsoba),"kcal");
console.log("  Dopyt domácnosti (2×1450×7):", 2*1450*7,"kcal");
console.log("  Nákup obsahuje:", Math.round(nakupKcal),"kcal  → pomer k dopytu:",(nakupKcal/(2*1450*7)).toFixed(3));
console.log("  cena spotreby:",app.cenaTyzdna("spotreba").toFixed(2),"€ · balenia:",app.cenaTyzdna("balenia").toFixed(2),"€ · na osobu:",app.cenaTyzdna("osoba").toFixed(2),"€");
console.log("  položiek bez ceny:",bezCeny,"/",Object.keys(grp).length,"· neocenená hmota:",Math.round(hmotaBezCeny),"g z",Math.round(hmota),"g ("+Math.round(hmotaBezCeny/hmota*100)+" %)");
console.log("  nenapárovaných položiek v nákupe:",nenapar.length, nenapar.slice(0,8).map(G=>G.nazov+" ("+Math.round(G.raw)+" "+G.jednotka+")"));

console.log("\n=== 7. Detail receptu vs nákup: sedia množstvá? ===");
let nezhody=0, porovnane=0, ukazky=[];
const varenia={};
app.planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return;
  const k=(cid||r.id)+"|"+slot+"|"+app.denyBloku(di)[0];
  if(!varenia[k])varenia[k]={r,cid,di,slot,porcie:app.porcieSlotBlok(di,slot,cid),f:app.pf(di,slot)}; });
Object.values(varenia).forEach(({r,porcie,f})=>{
  const fPocet=porcie/(r.porcie||1);
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; porovnane++;
    const detail=app.skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,f);
    // nákup používa tú istú funkciu — kontrolujeme, či zobrazené (zaokrúhlené) číslo sedí
    const zobr=app.prevodJednotka(detail,i.jednotka||"");
    if(/NaN|Infinity/.test(zobr)){ nezhody++; if(ukazky.length<5)ukazky.push(r.id+" "+i.nazov+" → "+zobr); }
  }); });
console.log("  porovnaných ingrediencií:",porovnane,"· chybných zobrazení:",nezhody,ukazky);

console.log("\n=== 8. Nedeliteľné jednotky: zaokrúhľovanie hore v každom recepte ===");
// koľko gramov navyše vznikne zaokrúhlením nedeliteľných jednotiek v nákupe
let extra=0, pol=0;
Object.values(grp).forEach(G=>{ if(!G.matched)return; const poc=Object.keys(G.pocty||{});
  if(G.hasKs && !G.hasG && !G.hasMl && poc.length===1){ const presne=G.pocty[poc[0]]; const zaokr=Math.max(1,Math.round(presne));
    if(Math.abs(zaokr-presne)>0.01){ pol++; extra+=(zaokr-presne)*app.gZaJednotku(poc[0].toLowerCase(),G.p); } } });
console.log("  položiek so zaokrúhlením:",pol,"· rozdiel hmoty:",Math.round(extra),"g (nezapočítaný do ceny ani kcal)");
})();
