// AUDIT: kvalita výživových čísel — chýbajúce gramy, príznak „≈ odhad", pokrytie mikroživín.
const { load } = require("../../test_harness");
const app = load({stav:{profil:{osoby:2,kcal:1450}}, seed:11});

let bezGramov=0, ingSpolu=0, receptovSChybou=0, kcalStratene=0, cenaStratena=0;
const podlaJednotky={};
app.RECEPTY.forEach(r=>{ let chyba=false;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; ingSpolu++;
    const p=app.najdiPotravinu(i.nazov); const g=app.gramy(i,p);
    if(!(g>0)){ bezGramov++; chyba=true;
      const j=(i.jednotka||"").toLowerCase().trim(); podlaJednotky[j]=(podlaJednotky[j]||0)+1;
      // hrubý odhad, koľko kcal/€ sa tým stráca
      const oh=app.odhadHmoty(i);
      if(p){ kcalStratene+=oh*p.kcal/100; cenaStratena+=oh*(p.cena100||0)/100; }
    } });
  if(chyba)receptovSChybou++; });
console.log("=== Chýbajúce gramy ===");
console.log("  ingrediencií s množstvom:",ingSpolu,"· z toho 0 g:",bezGramov,"("+(bezGramov/ingSpolu*100).toFixed(1)+" %)");
console.log("  receptov, kde aspoň 1 surovina nemá gramy:",receptovSChybou,"/",app.RECEPTY.length,"("+(receptovSChybou/app.RECEPTY.length*100).toFixed(1)+" %)");
console.log("  odhadom nezapočítaných:",Math.round(kcalStratene),"kcal a",cenaStratena.toFixed(2),"€ v celej databáze");
console.log("  podľa jednotky:",JSON.stringify(podlaJednotky));

console.log("\n=== Priznak odhad (v.pribl) - z coho pochadza ===");
let zChybajucichGramov=0, zKuratovanychKcal=0, oboje=0, ziadny=0;
app.RECEPTY.forEach(r=>{ const v=app.vyzivaReceptu(r); if(!v.pribl){ziadny++;return;}
  const maNedopocitanu=(r.ingrediencie||[]).some(i=>{ if(i.mnozstvo==null)return false;
    const p=app.najdiPotravinu(i.nazov); return !(app.gramy(i,p)>0); });
  const maKur=!!(r.kcal_na_porciu>0);
  if(maNedopocitanu&&maKur)oboje++; else if(maNedopocitanu)zChybajucichGramov++; else if(maKur)zKuratovanychKcal++; });
console.log("  bez príznaku:",ziadny,"· len chýbajúce gramy:",zChybajucichGramov,"· len rozdiel kcal >10 %:",zKuratovanychKcal,"· oboje:",oboje);
console.log("  → spolu s príznakom:",app.RECEPTY.length-ziadny,"("+((app.RECEPTY.length-ziadny)/app.RECEPTY.length*100).toFixed(1)+" % receptov ukazuje odhad)");

console.log("\n=== kcal_na_porciu: dôvera vs výpočet ===");
let bezKcal=0, odch=[];
app.RECEPTY.forEach(r=>{ if(!(r.kcal_na_porciu>0)){bezKcal++;return;}
  const v=app._vyzivaVypocet? null : null; });
// prepočítaj čistý súčet surovín (bez brzdy) manuálne
function cistyKcal(r){ let kc=0; (r.ingrediencie||[]).forEach(i=>{ const p=app.najdiPotravinu(i.nazov); if(!p)return; const g=app.gramy(i,p); if(g>0)kc+=g*p.kcal/100; }); return kc/(r.porcie||1); }
const pomery=[];
app.RECEPTY.forEach(r=>{ if(!(r.kcal_na_porciu>0))return; const c=cistyKcal(r); if(c>5)pomery.push(c/r.kcal_na_porciu); });
const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
console.log("  receptov bez kcal_na_porciu:",bezKcal,"("+(bezKcal/app.RECEPTY.length*100).toFixed(1)+" %) — tam sa zobrazuje čistý súčet surovín, bez kontroly");
console.log("  pomer výpočet/kurátorované: medián",med(pomery).toFixed(3),"· nad 1,5×:",pomery.filter(x=>x>1.5).length,"· pod 0,5×:",pomery.filter(x=>x<0.5).length,"· n =",pomery.length);
console.log("  → makrá sa škálujú faktorom 1/pomer, takže pri pomere 4× sú bielkoviny delené 4");

console.log("\n=== Pokrytie mikroživín v potravinách ===");
const bezVl=app.POTRAVINY.filter(p=>p.vlaknina==null).length, bezNa=app.POTRAVINY.filter(p=>p.sodik==null).length;
const bezCena=app.POTRAVINY.filter(p=>p.cena100==null).length;
console.log("  potravín:",app.POTRAVINY.length,"· bez vlákniny:",bezVl,"· bez sodíka:",bezNa,"· bez ceny:",bezCena);
const bezKs=app.POTRAVINY.filter(p=>!p.g_za_ks).length;
console.log("  bez g_za_ks:",bezKs,"("+(bezKs/app.POTRAVINY.length*100).toFixed(0)+" %) - zdroj nulovych gramov pri jednotke ks");
