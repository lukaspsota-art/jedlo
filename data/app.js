const RECEPTY = __DATA__;
const POTRAVINY = __POTRAVINY__;
const JEDALNICKY = __JEDALNICKY__;
const DNI = ["Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota","Nedeľa"];
const VSETKY_SLOTY = ["Raňajky","Desiata","Obed","Olovrant","Večera","Snack"];
const DEFAULT_SLOTY = ["Raňajky","Obed","Večera","Snack"];
function SLOTY(){ const v=S.profil&&S.profil.sloty; const akt=(Array.isArray(v)&&v.length)?v:DEFAULT_SLOTY; return VSETKY_SLOTY.filter(s=>akt.includes(s)); }
const ikony = {"Raňajky":"🍳","Desiata":"🥐","Obed":"🍝","Olovrant":"🍏","Večera":"🍽️","Hlavné jedlo":"🍽️","Cestoviny":"🍝","Polievka":"🥣","Šalát":"🥗","Nátierka":"🧈","Snack":"🥪","Dezert":"🍰","Príloha":"🍚","Kokteil":"🍸","Nápoj":"🥤","Pečivo":"🥖"};
const SLOT_KATEGORIE = {"Raňajky":["Raňajky","Nátierka"],"Desiata":["Snack","Dezert","Nátierka"],"Obed":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Olovrant":["Snack","Dezert","Nátierka"],"Večera":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Snack":["Snack","Dezert","Nátierka"]};
function jeHlavnyChodSlot(slot){ return (SLOT_KATEGORIE[slot]||[]).includes("Hlavné jedlo"); }
function jeNatierkovySlot(slot){ return (SLOT_KATEGORIE[slot]||[]).includes("Nátierka"); }
function isMain(r){ return ["Hlavné jedlo","Cestoviny","Polievka","Šalát"].includes(r.kategoria); }
function slotPreKategoriu(kat){ for(const sl of SLOTY()){ if((SLOT_KATEGORIE[sl]||[]).includes(kat)) return sl; } return "Obed"; }
const SEZONA = {"paradajk":[6,7,8,9],"cuketa":[6,7,8,9],"baklažán":[7,8,9],"jahod":[5,6,7],"špargľa":[4,5],"tekvica":[9,10,11],"uhork":[5,6,7,8,9],"paprika":[7,8,9,10],"kapia":[8,9,10],"jablk":[9,10,11],"jarná cibuľka":[4,5,6],"brokolica":[6,9,10],"špenát":[4,5,9,10],"reďkov":[4,5,6],"marhul":[6,7],"slivk":[8,9]};
function jeSezonne(r){ const m=new Date().getMonth()+1; let inS=0,out=0;
  (r.ingrediencie||[]).forEach(i=>{ const n=i.nazov.toLowerCase(); for(const k in SEZONA){ if(n.includes(k)){ if(SEZONA[k].includes(m))inS++; else out++; break; } } });
  return inS>0 && inS>=out; }
// ponytail: heuristika kľúčových slov (nie NLP) na "recept chce prípravu deň/noc vopred";
// môže minúť nezvyčajné formulácie — ak sa to stane často, pridaj štruktúrované pole do JSON receptov
function pripravaVopred(r){ const s=bezDia([r.popis,r.tipy,...(r.postup||[])].join(" "));
  return /cez noc|na noc\b|den vopred|vecer vopred|priprav\w* (vecer )?vopred|aspon (8|9|1[0-9]) hod/.test(s); }
const SUBSTITUCIE = {"maslo":["olej","kokosový tuk"],"smotana":["grécky jogurt","kokosové mlieko"],"smotanový jogurt":["biely jogurt","kyslá smotana"],"shaoxing":["suché sherry","biele víno"],"pecorino":["parmezán","grana padano"],"olivový olej":["repkový olej","slnečnicový olej"],"cukor":["med (menej)","javorový sirup"],"hnedý cukor":["biely cukor + trocha melasy"],"citrón":["limetka","biely ocot (kvapka)"],"jarná cibuľka":["pórik","cibuľa"],"píniové oriešky":["vlašské orechy","mandle"],"eidam":["gouda","syr na strúhanie"]};
const LS="kucharka_v2";
const _prvySpust=(()=>{try{return !localStorage.getItem(LS)}catch(e){return false}})(); // E6: úplne prvé spustenie → nasleduj systémovú tému
function nacitaj(){try{return JSON.parse(localStorage.getItem(LS))||{}}catch(e){return {}}}
function uloz(s){try{localStorage.setItem(LS,JSON.stringify(s))}catch(e){}}
let S = nacitaj();
S.fav=S.fav||{}; S.hodn=S.hodn||{}; S.pozn=S.pozn||{}; S.plan=S.plan||{}; S.ciel=S.ciel||""; S.nakupCheck=S.nakupCheck||{}; S.uvarene=S.uvarene||[]; S.planF=S.planF||{}; S.archiv=S.archiv||[]; S.domaNakup=S.domaNakup||""; S.akcie=S.akcie||""; S.blokMode=(S.blokMode!==undefined?S.blokMode:true);
if(!Array.isArray(S.hranice)||S.hranice.length!==7){ S.hranice=[true,false,true,false,false,true,false]; }
else if(S.blokV!==6 && JSON.stringify(S.hranice)===JSON.stringify([true,false,true,false,true,false,true])){ S.hranice=[true,false,true,false,false,true,false]; }
S.blokV=6; S.spajza=S.spajza||[]; S.spSid=S.spSid||1; S.vahy=S.vahy||[]; S.nakupManual=S.nakupManual||[];
S.genCfg=Object.assign({zachovat:false,cielMode:true,filtre:[]}, S.genCfg||{});
S.dayPpl=S.dayPpl||{}; S.slotPpl=S.slotPpl||{}; S.daySloty=S.daySloty||{};
function isoZDatumu(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); } // lokálny dátum, NIE toISOString() (ten prevádza na UTC a vie posunúť deň)
function pridajDni(iso,n){ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return isoZDatumu(d); }
function pondelokPre(iso){ const d=new Date(iso+"T00:00:00"); const dow=(d.getDay()+6)%7; return pridajDni(iso,-dow); }
function datumPre(di){ return pridajDni(S.viewOd, di); } // di 0-6 → ISO dátum v rámci PRÁVE ZOBRAZENÉHO týždňa v Pláne
S.viewOd=S.viewOd||pondelokPre(dnesISO());
S.tyzdenProfil=S.tyzdenProfil||{};
// migrácia zo starého modelu (S.plan indexovaný "0".."6" dokola, žiadny dátum) → tento reálny týždeň, jednorazovo
(function migrujStaryPlan(){
  const staryKluc=k=>/^[0-6]$/.test(k);
  if(Object.keys(S.plan||{}).some(staryKluc)){ const tt=pondelokPre(dnesISO());
    for(let di=0;di<7;di++){ const iso=pridajDni(tt,di); if(S.plan[di]){ S.plan[iso]=S.plan[di]; delete S.plan[di]; } if(S.planF[di]){ S.planF[iso]=S.planF[di]; delete S.planF[di]; } }
    S.viewOd=tt; }
  if(S.buduci){ delete S.buduci; delete S.planKontext; } // zrušený mechanizmus "budúci týždeň" (nahradený reálnou navigáciou týždňov)
})();
// dayPpl/daySloty/slotPpl boli indexované číslom dňa (0-6), takže „v stredu sme 4" platilo naveky v každom
// týždni. Prekľúčuj ich na dátumy — rovnaký model ako S.plan/S.planF.
(function migrujDenneNastavenia(){
  const staryKluc=k=>/^[0-6]$/.test(k); const tt=pondelokPre(dnesISO());
  ["dayPpl","daySloty","slotPpl"].forEach(f=>{ const o=S[f]||{};
    if(!Object.keys(o).some(staryKluc)) return;
    for(let di=0;di<7;di++){ if(o[di]!==undefined){ o[pridajDni(tt,di)]=o[di]; delete o[di]; } }
    S[f]=o; });
})();
S.skryte=S.skryte||{}; // recepty skryté z generátora/plánu (nie zmazané) — kľúč=id
S.mojeRecepty=S.mojeRecepty||[];
if(Array.isArray(S.mojeRecepty)) S.mojeRecepty.forEach(r=>{ if(!RECEPTY.some(x=>x.id===r.id)) RECEPTY.push(r); });
const VERZIA="v20";
S.profil=Object.assign({osoby:2,kcal:1450,biel:0,ryby:false,lepok:false,mlieko:false,dark:false,big:false,balenia:true,watch:"",zakazane:"",kupSnack:true,cielTyp:"udrzanie",okno:false,oknostart:12,syncId:"",syncOff:false,skupinaId:"",skupinaKod:"",skupinaNazov:"",sloty:DEFAULT_SLOTY.slice()}, S.profil||{});
if(S.ciel && !S.profil._migr){ S.profil.kcal=parseInt(S.ciel)||S.profil.kcal; S.profil._migr=1; }
if(_prvySpust && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches){ S.profil.dark=true; } // E6
function save(){uloz(S); if(typeof syncPush==="function")syncPush(); if(typeof syncOsobnePush==="function")syncOsobnePush(); if(typeof syncSkupinaPush==="function")syncSkupinaPush();}

// B1: párovanie suroviny na potraviny.json. Ľubovoľný podreťazec nestačí — „olej na oPEKANie"
// matchoval pekanový orech a „Kokosového mlieka" strúhaný kokos. Preto:
//   1) porovnávame po SLOVÁCH (kľúč musí sadnúť na súvislú postupnosť slov názvu),
//   2) slovenské skloňovanie riešime kmeňom kľúča + prefixom slova („kokosové mlieko" → kmene
//      „kokosov"+„mliek" sadnú na „kokosového mlieka"),
//   3) pri rovnako dlhom kľúči vyhráva ten, čo sedí bližšie k začiatku názvu.
const _KONCOVKY=["ovanie","ovania","eho","emu","ymi","imi","ami","ach","och","iek","ien","ou","ej","ym","im","ie","ia","iu","ov","om","mi","a","e","i","o","u","y"];
function _kmen(w){ if(w.length<=4) return w;
  // kmeň nesmie klesnúť pod 4 znaky — inak „semien" → „sem" a chytá polovicu špajze
  for(const k of _KONCOVKY){ if(w.length-k.length>=4 && w.slice(-k.length)===k) return w.slice(0,w.length-k.length); }
  return w; }
function _slova(s){ return bezDia(s).replace(/[^a-z0-9]+/g," ").trim().split(" ").filter(Boolean); }
// koľko písmen smie slovo v názve pridať navyše ku kmeňu kľúča (skloňovanie/odvodenina);
// pri krátkych kmeňoch menej, nech „med" nechytí „medvedí"
function _presah(k){ return k.length<=3?2:5; }
function _sadneOd(slova,kmene){
  for(let i=0;i+kmene.length<=slova.length;i++){ let ok=true;
    for(let j=0;j<kmene.length;j++){ const w=slova[i+j],k=kmene[j];
      if(w.length<k.length || w.slice(0,k.length)!==k || w.length-k.length>_presah(k)){ ok=false; break; } }
    if(ok) return i; }
  return -1; }
let _klucKmene=null;
function _klucePripravene(){ if(!_klucKmene) _klucKmene=POTRAVINY.map(p=>({p,kmene:_slova(p.kluc).map(_kmen)})).filter(x=>x.kmene.length);
  return _klucKmene; }
const _potravinaCache=new Map(); // najdiPotravinu beží desaťtisíckrát pri každom prekreslení mriežky
function najdiPotravinu(nazov){
  if(_potravinaCache.has(nazov)) return _potravinaCache.get(nazov);
  const slova=_slova(nazov); let best=null,bestDl=-1,bestPoz=1e9;
  for(const {p,kmene} of _klucePripravene()){
    const poz=_sadneOd(slova,kmene); if(poz<0) continue;
    const dl=p.kluc.length;
    if(dl>bestDl || (dl===bestDl && poz<bestPoz)){ best=p; bestDl=dl; bestPoz=poz; }
  }
  _potravinaCache.set(nazov,best);
  return best;
}
// ml na jednotku pre objemové/lyžicové jednotky
const ML_JED={"pl":15,"lyžica":15,"lyzica":15,"polievková lyžica":15,"čl":5,"cl":5,"lyžička":5,"lyzicka":5,"šálka":250,"salka":250,"hrnček":250,"hrncek":250,"pohár":250,"pohar":250,"dcl":100,"dl":100,"l":1000,"liter":1000};
// približná hmotnosť v g pre počítateľné jednotky bez g_za_ks (ponytail: hrubé defaulty; presné hodnoty patria do potraviny.json v Etape 3)
const KS_DEF={"strúčik":5,"strucik":5,"plátok":20,"platok":20,"list":8,"lístok":1,"listok":1,"hlávka":300,"hlavka":300,"hrsť":30,"hrst":30,"štipka":0.5,"stipka":0.5,"zväzok":60,"zvazok":60,"vetvička":2,"vetvicka":2,"stredná":150,"stredny":150,"stredné":150};
const KS_JEDNOTKY=["ks","kus","rožok","rozok","žemľa","zemla"]; // jednotky, pre ktoré platí g_za_ks
// B3: hmotnosť JEDNÉHO kusa danej jednotky. `g_za_ks` je hmotnosť KUSA — nesmie prebiť „list"/„strúčik"/
// „hrsť" (inak „Šalát 4 list" = 4 hlávky = 1200 g). Plátok má vlastné pole `g_za_platok`
// (toastový chlieb 28 g, nori 3 g), lebo paušálnych 20 g mu nesedí.
function gZaJednotku(j,p){
  if(j==="plátok"||j==="platok") return (p&&p.g_za_platok)||KS_DEF["plátok"];
  if(KS_DEF[j]!=null) return KS_DEF[j];
  if(KS_JEDNOTKY.includes(j)) return (p&&p.g_za_ks)||0;
  if(j==="balenie") return (p&&p.balenie_g)||0; // C6: zásoba v špajzi vedená v baleniach sa dá odpísať
  return 0;
}
function gramy(ing,p){
  if(ing.mnozstvo==null) return 0;
  const j=(ing.jednotka||"").toLowerCase().trim();
  const h=(p&&p.hustota)||1;
  if(j==="g"||j==="gram"||j==="gramov") return ing.mnozstvo;
  if(j==="kg") return ing.mnozstvo*1000;
  if(j==="ml") return ing.mnozstvo*h;
  if(ML_JED[j]!=null) return ing.mnozstvo*ML_JED[j]*h;
  // B2: kus bez g_za_ks nedopočítame — 0 g a viditeľné „≈ odhad" je lepšie ako tichých 60 g
  // (4 kardamómy nie sú 240 g). Chýbajúce hmotnosti vypíše scripts/najdi_ks.py.
  // 0 zostáva aj pre neznámu/popisnú jednotku ("na cesto", "dresing"…) — to je dátový problém.
  return ing.mnozstvo*gZaJednotku(j,p);
}
function jeTekutina(p){ if(!p)return false; if(p.oddelenie==="Oleje a tuky")return true;
  return /mlieko|olej|ocot|víno|vino|vývar|vyvar|smotan|šťav|stav|sirup|voda|kečup|kecup|omáčk|omack|jogurt|nápoj|napoj|džús|dzus|pivo|med|pasírované|passata/.test(p.kluc); }
function povoleneJednotky(p){ if(!p) return ["g","kg","ks","ml","l","balenie"];
  const u=[]; if(p.g_za_ks) u.push("ks"); if(jeTekutina(p)){ u.push("ml","l"); } u.push("g","kg"); if(!u.includes("ks"))u.push("ks"); u.push("balenie");
  return [...new Set(u)]; }
function krokPreJednotku(jed){ const j=(jed||"").toLowerCase(); if(j==="kg"||j==="l")return 0.1; if(j==="ks"||j==="balenie")return 1; return 10; }
// B3: presná inverzia ku gramy() — gramyNaJed(gramy(x),x.jednotka,p) === x.mnozstvo.
// null = jednotku nevieme previesť (volajúci to musí ošetriť, nie hádať).
function gramyNaJed(g,jed,p){ const j=(jed||"").toLowerCase().trim(); const h=(p&&p.hustota)||1;
  if(j==="g"||j==="gram"||j==="gramov")return g; if(j==="kg")return g/1000; if(j==="ml")return g/h;
  if(ML_JED[j]!=null)return g/(ML_JED[j]*h);
  const gj=gZaJednotku(j,p); return gj?g/gj:null; }
// B6: nenapárovaná surovina nemá gramy — do pokrytia ju započítame hrubým odhadom,
// nech sa recept s neznámou hlavnou surovinou netvári, že má 100 % dát
function odhadHmoty(i){ const j=(i.jednotka||"").toLowerCase().trim();
  if(i.mnozstvo==null)return 0;
  if(j==="g"||j==="gram"||j==="gramov"||j==="ml")return i.mnozstvo;
  if(j==="kg")return i.mnozstvo*1000;
  if(ML_JED[j]!=null)return i.mnozstvo*ML_JED[j];
  if(KS_DEF[j]!=null)return i.mnozstvo*KS_DEF[j];
  return i.mnozstvo*50; }
// D1: vyzivaReceptu beží pri každom prekreslení mriežky ~5× na recept (karta, healthScore, diety,
// kolekcie). Výsledok si odložíme priamo na objekt receptu ako NEENUMEROVATEĽNÝ `_vyz` — kópie
// receptu (spread, Object.assign v komponent()) ho nezdedia, takže sa neprenesie na zmenený objekt.
let _vyzivaVerzia=1;
function zabudniVyzivu(){ _vyzivaVerzia++; } // po pridaní/úprave vlastného receptu alebo zmene potravín
function vyzivaReceptu(r){
  if(r&&r._vyz&&r._vyz.v===_vyzivaVerzia) return r._vyz.d;
  const vysl=_vyzivaVypocet(r);
  if(r&&typeof r==="object"){ try{ Object.defineProperty(r,"_vyz",{value:{v:_vyzivaVerzia,d:vysl},writable:true,configurable:true,enumerable:false}); }catch(e){} }
  return vysl;
}
function _vyzivaVypocet(r){
  let kc=0,b=0,t=0,s=0,cena=0,vl=0,na=0,zname=false,bezCeny=0;
  let hmota=0,hmotaVl=0,hmotaNa=0; // B6: koľko hmoty dňa má vôbec údaj o vláknine/sodíku
  (r.ingrediencie||[]).forEach(i=>{
    const p=najdiPotravinu(i.nazov);
    if(!p){ if(i.mnozstvo!=null){ zname=true; bezCeny++; hmota+=odhadHmoty(i); } return; }
    const g=gramy(i,p);
    if(!(g>0)&&i.mnozstvo!=null){ zname=true; return; } // B2: nedopočítaná hmotnosť → kcal je len odhad
    kc+=g*p.kcal/100; b+=g*p.bielkoviny/100; t+=g*p.tuky/100; s+=g*p.sacharidy/100;
    // B5: cena100 == null znamená NEZNÁMA cena (0 je platná cena, napr. voda z vodovodu)
    if(g>0 && p.cena100==null) bezCeny++;
    cena+=g*(p.cena100||0)/100; vl+=g*(p.vlaknina||0)/100; na+=g*(p.sodik||0)/100;
    hmota+=g; if(p.vlaknina!=null)hmotaVl+=g; if(p.sodik!=null)hmotaNa+=g;
  });
  const por=r.porcie||1;
  const v={kcal:kc/por,b:b/por,t:t/por,s:s/por,cena:cena/por,vl:vl/por,na:na/por,pribl:zname,bezCeny:bezCeny,
           hmota:hmota/por,hmotaVl:hmotaVl/por,hmotaNa:hmotaNa/por};
  // B4: kurátorovanému kcal_na_porciu sa verí VŽDY (predtým sa dorovnávalo až pri rozdiele >1,6×,
  // takže 22,6 % receptov ukazovalo zlé číslo). Výpočet zo surovín slúži už len na makrá a cenu —
  // tie sa prepočítajú rovnakým faktorom. Vláknina a sodík sa NEŠKÁLUJÚ: ich chyba je z chýbajúcich
  // dát v potravinách, nie z hmoty, a faktor z kcal by ju len rozmazal.
  const j=r.kcal_na_porciu||0;
  if(j>0){
    if(v.kcal>5){ const q=v.kcal/j, k=1/q;
      ["b","t","s","cena"].forEach(x=>{v[x]*=k;});
      if(Math.abs(q-1)>0.1) v.pribl=true; // v detaile sa ukáže „≈ odhad"
    }
    v.kcal=j;
  }
  return v;
}
function kcalPorcia(r){ const v=vyzivaReceptu(r); return v.kcal>5?Math.round(v.kcal):(r.kcal_na_porciu||0); }
function cenaPorcia(r){ return vyzivaReceptu(r).cena; }
const HS_HI=10, HS_LO=5; // g bielkovín na 100 kcal: ≥HI green, ≥LO amber, inak red (laditeľné)
function healthScore(r){ const v=vyzivaReceptu(r); if(!(v.kcal>5)) return {p100:0,farba:"red"};
  const p100=v.b/(v.kcal/100); return {p100:p100, farba: p100>=HS_HI?"green":(p100>=HS_LO?"amber":"red")}; }
function podielCiela(r){ const ciel=S.profil.kcal||0; if(!(ciel>0)) return 0; return Math.max(0,Math.min(1, kcalPorcia(r)/ciel)); }
function alergenyReceptu(r){ const set=new Set();
  (r.ingrediencie||[]).forEach(i=>{const p=najdiPotravinu(i.nazov); if(p)(p.alergeny||[]).forEach(a=>set.add(a));});
  return Array.from(set); }
function diety(r){ const al=alergenyReceptu(r); let meso=false;
  (r.ingrediencie||[]).forEach(i=>{const p=najdiPotravinu(i.nazov); if(p&&p.meso)meso=true;});
  return {veg:!meso&&!al.includes("ryby"), bezlepku:!al.includes("lepok"), bezlaktozy:!al.includes("mlieko"), ryby:al.includes("ryby")}; }

function fmt(n){ if(n==null)return ""; let x=Math.round(n*100)/100;
  if(Math.abs(x-Math.round(x))<0.01) return String(Math.round(x));
  return String(x).replace(".",","); }
function eur(n){ return (Math.round(n*100)/100).toFixed(2).replace(".",",")+" €"; }
function bezDia(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
// „Čo mám doma" — zdieľané so Špajzou (renderDoma) aj Receptami (renderGrid)
function mamZoSpajze(){ return (S.spajza||[]).map(x=>bezDia(x.nazov)).filter(Boolean); }
function skoreReceptu(r, mam){ let mame=0,chyba=[];
  (r.ingrediencie||[]).forEach(i=>{ const nm=bezDia(i.nazov); const ok=mam.some(m=>nm.includes(m)||m.includes(nm.split(" ")[0]));
    if(ok)mame++; else if(i.mnozstvo!=null)chyba.push(i.nazov); });
  const spolu=(r.ingrediencie||[]).length||1;
  return {mame,spolu,pct:Math.round(mame/spolu*100),chyba}; }
let _spajzaSkore=null; // v Receptoch pri režime radenia „zo špajze": mapa id → skóre (inak null)
function escHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function casMin(r){ const m=(r.cas||"").match(/(\d+)\s*hod/); const mm=(r.cas||"").match(/(\d+)\s*min/);
  let t=0; if(m)t+=parseInt(m[1])*60; if(mm)t+=parseInt(mm[1]); return t||999; }
function receptById(id){ return RECEPTY.find(r=>r.id===id); }

const VIAC_VIEWS=["vyziva","spajza","nastavenia"]; // E5: schované za „⋯ Viac" na spodnej lište
const _scrollPos={}; let _curView="domov";
function zobrazView(v){
  if(!document.getElementById("v-"+v)) v="domov";
  if(v!==_curView) _scrollPos[_curView]=window.scrollY; // E7: zapamätaj scroll starej obrazovky
  document.querySelectorAll(".side nav a,.side .foot a,.botnav a").forEach(t=>t.classList.toggle("active", t.dataset.v===v || (t.dataset.v==="_viac"&&VIAC_VIEWS.includes(v))));
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("active"));
  const el=document.getElementById("v-"+v); if(el)el.classList.add("active");
  _curView=v;
  if(v==="domov") renderDash();
  else if(v==="planovac") renderPlan();
  else if(v==="nakup") renderNakup();
  else if(v==="vyziva") renderVyziva();
  else if(v==="nastavenia"){ naplnProfil(); renderSyncStav(); }
  else if(v==="spajza") renderSpajza();
  zpristupniFormulare(el||document); // D6: menovky aj pre polia vykreslené až pri zobrazení sekcie
  window.scrollTo(0, _scrollPos[v]||0); // E7: obnov scroll (0 pre novú obrazovku)
}
function tik(){ try{ navigator.vibrate&&navigator.vibrate(8); }catch(e){} } // X1: jemná haptika na diskrétne akcie
function prepni(v){ tik(); if(("#"+v)!==location.hash){ location.hash=v; } zobrazView(v); } // E8: hash = zdroj pravdy pre deep-link/back
window.addEventListener("hashchange",()=>{ const v=location.hash.slice(1); if(v && v!==_curView && document.getElementById("v-"+v)) zobrazView(v); });
function otvorViac(){ const pol=[["vyziva","📊 Výživa"],["spajza","🧊 Špajza"],["nastavenia","⚙️ Nastavenia"]];
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Viac</h2></div><div class="content2">';
  pol.forEach(([v,t])=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();prepni('${v}')"><span class="nm">${t}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
// U1: bunka plánu mala 5 mini-liniek (20 ovládacích prvkov na obrazovku telefónu).
// Zostala primárna „✎ zmeniť", zvyšok je tu — rovnaký spodný panel ako „⋯ Viac".
// U1: rozdelenie blokov je nastavenie, ktoré meníš raz — 180 px v obrazovke Plánu si nezaslúži.
// Žije v panela; renderBlokEditor() nájde #blok-editor tu, takže toggleHranica → renderPlan ho prekreslí.
function otvorRozdelenie(){
  if(!S.blokMode){ toast("Najprv zapni blokový režim."); return; }
  document.getElementById("pick-modal").innerHTML='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>✂️ Rozdelenie blokov</h2><div class="subx">Klikni na ✂ alebo · medzi dvoma dňami</div></div>'
    +'<div class="content2"><div id="blok-editor" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center"></div></div>';
  renderBlokEditor(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function akcieSlotu(di,slot){
  const pol=[["➕ Pridať doplnok (príloha, pečivo…)",`pridajKomponent(${di},'${slot}')`],
             ["🎲 Vygenerovať toto jedlo znova",`regenerujSlot(${di},'${slot}')`],
             ["👥 Počet porcií pre toto jedlo",`upravSlotPorcie(${di},'${slot}')`],
             ["♻️ Rozpísať ako zvyšok do iného dňa",`pridajZvysok(${di},'${slot}')`]];
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${slot} · ${DNI[di]}</h2></div><div class="content2">`;
  pol.forEach(([t,fn])=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();${fn}"><span class="nm">${t}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function tlacView(v){ prepni(v);
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("printme"));
  document.getElementById("v-"+v).classList.add("printme"); window.print(); }
let aktivnaKat="Všetko";
let aktivnaKolekcia="";
const KOLEKCIE=[
  {id:"rychle",   nazov:"Do 20 min",      ikona:"⏱", test:r=>casMin(r)<=20},
  {id:"protein",  nazov:"Vysoký proteín", ikona:"💪", test:r=>healthScore(r).farba==="green"},
  {id:"sezonne",  nazov:"Sezónne teraz",  ikona:"🌿", test:r=>jeSezonne(r)},
  {id:"lacne",    nazov:"Lacné do 1,5 €", ikona:"💶", test:r=>{const c=cenaPorcia(r); return c>0.01 && c<1.5;}},
  {id:"oblubene", nazov:"Obľúbené",       ikona:"★",  test:r=>!!S.fav[r.id]}
];
function renderKolekcie(){ const box=document.getElementById("kolekcie"); if(!box)return;
  box.innerHTML=KOLEKCIE.map(k=>`<span class="kol-tile${aktivnaKolekcia===k.id?' active':''}" role="button" tabindex="0" aria-pressed="${aktivnaKolekcia===k.id}" onclick="nastavKolekciu('${k.id}')">${k.ikona} ${k.nazov}</span>`).join(""); }
function nastavKolekciu(id){ aktivnaKolekcia=(aktivnaKolekcia===id)?"":id; renderKolekcie(); renderGrid(); }
function kategorie(){ const s=new Set(RECEPTY.map(r=>r.kategoria).filter(Boolean)); return ["Všetko",...Array.from(s).sort()]; }
// D9: volá sa aj po pridaní vlastného receptu, preto musí byť idempotentná (inak by pribúdali duplikáty)
function naplnKuchyne(){ const sel=document.getElementById("f-kuchyna"); if(!sel)return;
  const drz=sel.value;
  sel.innerHTML='<option value="">Všetky kuchyne</option>';
  const s=new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean));
  Array.from(s).sort((a,b)=>a.localeCompare(b,"sk")).forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;sel.appendChild(o);});
  sel.value=drz; }
function renderChips(){ const box=document.getElementById("chips"); box.innerHTML="";
  kategorie().forEach(k=>{ const el=document.createElement("div"); el.className="chip"+(k===aktivnaKat?" active":""); el.textContent=k;
    el.tabIndex=0; el.setAttribute("role","button"); el.setAttribute("aria-pressed",k===aktivnaKat);
    el.onclick=()=>{aktivnaKat=k;renderChips();renderGrid();}; box.appendChild(el); }); }
function zakazaneTokens(){ return (S.profil.zakazane||"").split(/[\n,;]+/).map(x=>bezDia(x.trim())).filter(Boolean); }
// ponytail: matchujem názov receptu + tagy, nielen ingrediencie (chytí "Pečené kura" aj keď ingrediencia je "kurčatá"). Zámerne len substring — kmeňový match by chytal aj kurkuma/kuriatka
function zakazaneChyta(r){ const zt=zakazaneTokens(); if(!zt.length)return false;
  const text=(r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.tagy||[]).join(" ");
  // U2: podstring sám nechytí skloňovanie („mlieko" nenájde „mlieka"), párovanie kmeňov zas nechytí
  // časť slova („syr" v „syrokrém"). Diétny filter má radšej blokovať viac, takže platí OR z oboch.
  // Cena: „med" zablokuje aj „medvedí cesnak" — to je pôvodné chovanie, nemenené.
  return zt.some(t=>bezDia(text).includes(t)) || obsahujeSurovinu(text, zt); }
function prejdeProfil(r){
  if(S.skryte[r.id]) return false; // skryté recepty sa nikdy nedostanú do generátora/plánu/návrhov
  const d=diety(r);
  if(S.profil.ryby && d.ryby) return false;
  if(S.profil.lepok && !d.bezlepku) return false;
  if(S.profil.mlieko && !d.bezlaktozy) return false;
  if(zakazaneChyta(r)) return false;
  return true;
}
function kartaHTML(r){
  const d=diety(r); const v=vyzivaReceptu(r); const kc=v.kcal>5?Math.round(v.kcal):(r.kcal_na_porciu||0); const hod=S.hodn[r.id]||0;
  const hs=healthScore(r); // bodka len pre proteínovo bohaté (green/amber); pri nízkom proteíne žiadna (aby karty neboli more červených)
  const dotEl=(hs.farba!=="red")?'<span class="hdot hs-'+hs.farba+'" title="proteín '+fmt(hs.p100)+' g/100 kcal"></span>':'';
  const db=[dotEl,jeWatch(r)?'<span class="badge">⭐</span>':'',jeVakcii(r)?'<span class="badge price">🏷️ akcia</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 veg</span>':'',pripravaVopred(r)?'<span class="badge" title="Priprav deň/noc vopred">⏰ vopred</span>':''].join('');
  const thumb=r.foto?'<img src="recepty/fotky/'+r.foto+'" alt="">':(ikony[r.kategoria]||"🍴");
  return '<button class="fav" onclick="event.stopPropagation();toggleFav(\''+r.id+'\')">'+(S.fav[r.id]?"★":"☆")+'</button>'+
    '<div class="thumb" onclick="otvor(\''+r.id+'\')">'+thumb+'</div>'+
    '<div class="body" onclick="otvor(\''+r.id+'\')">'+
      '<span class="kat">'+(r.kategoria||"")+'</span><h3>'+r.nazov+'</h3>'+
      '<div class="meta">'+(r.cas?'<span>⏱ '+r.cas+'</span>':"")+(kc?'<span title="'+(v.pribl?"odhad — časť surovín sa nedá dopočítať":"")+'">🔥 '+(v.pribl?"≈ ":"")+kc+' kcal</span>':"")+(v.cena>0.01?'<span>💶 '+eur(v.cena)+'</span>':"")+'</div>'+
      (v.kcal>5?'<div class="macros">B '+fmt(v.b)+' · T '+fmt(v.t)+' · S '+fmt(v.s)+' g</div>':'')+
      '<div class="stars">'+(hod?starsHTML(hod):"")+'</div>'+
      spajzaMatchEl(r)+
      '<div class="diet">'+db+'</div></div>';
}
function spajzaMatchEl(r){ if(!_spajzaSkore)return ""; const s=_spajzaSkore[r.id]; if(!s||s.mame<1)return "";
  const info = s.chyba.length ? "chýba: "+s.chyba.slice(0,3).join(", ")+(s.chyba.length>3?"…":"") : "máš všetko 🎉";
  return '<div class="spajza-match">🧊 '+s.mame+'/'+s.spolu+' · '+info+'</div>';
}
// Vyhľadávanie (Recepty aj picker v Pláne): názov + popis + tagy + ingrediencie.
// Samotný substring nechytí skloňovanie („paradajka" nenájde „paradajky"), preto rovnaký OR
// s kmeňovým párovaním ako pri zakázaných surovinách. Hay sa cachuje mimo receptu (nie ako `r._hay`,
// to by sa uložilo do localStorage pri vlastných receptoch) — inak sa prepočíta pri každom klávese.
// Cachuje sa aj rozklad na slová: kmeňové párovanie ho potrebuje pre KAŽDÝ recept pri každom
// klávese a bez cache to je ~50 ms na úder (2000 receptov × regex split).
const _hayCache=new Map();
function hladaHay(r){ let h=_hayCache.get(r.id);
  if(!h){ const s=bezDia(r.nazov+" "+(r.popis||"")+" "+(r.tagy||[]).join(" ")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" "));
    h={s,slova:_slova(s)}; _hayCache.set(r.id,h); }
  return h; }
function hladaSedi(r,q){ if(!q) return true; const h=hladaHay(r);
  return h.s.includes(q) || _surovinaVSlovach(h.slova,[q]); }
function renderGrid(){
  const grid=document.getElementById("grid");
  const q=bezDia(document.getElementById("hladaj").value.trim());
  const fk=document.getElementById("f-kuchyna").value;
  const fc=parseInt(document.getElementById("f-cas").value)||0;
  const fd=document.getElementById("f-diet").value;
  const fs=(document.getElementById("f-sort")||{}).value||"";
  grid.innerHTML="";
  const showHidden=fd==="skryte";
  let zoz=RECEPTY.filter(r=>{
    if(showHidden) return !!S.skryte[r.id]; // správcovský pohľad: len skryté, ostatné filtre ignoruj
    if(!prejdeProfil(r)) return false; // prejdeProfil už vylučuje skryté
    if(aktivnaKolekcia){ const K=KOLEKCIE.find(k=>k.id===aktivnaKolekcia); if(K && !K.test(r)) return false; }
    if(aktivnaKat!=="Všetko"&&r.kategoria!==aktivnaKat) return false;
    if(fk&&r.kuchyna!==fk) return false;
    if(fc&&casMin(r)>fc) return false;
    if(fd==="fav"&&!S.fav[r.id]) return false;
    if(fd==="veg"&&!diety(r).veg) return false;
    if(fd==="lepok"&&!diety(r).bezlepku) return false;
    if(fd==="mlieko"&&!diety(r).bezlaktozy) return false;
    if(!hladaSedi(r,q)) return false;
    return true;
  });
  _spajzaSkore=null;
  if(fs==="spajza"){ const mam=mamZoSpajze(); // radenie podľa zhody so špajzou + boost pre expirujúce
    if(mam.length){ _spajzaSkore={}; zoz.forEach(r=>{ const s=skoreReceptu(r,mam); _spajzaSkore[r.id]=Object.assign(s,{score:s.mame-1.5*s.chyba.length+expBoost(r)}); });
      zoz.sort((a,b)=>_spajzaSkore[b.id].score-_spajzaSkore[a.id].score); } }
  else if(fs==="nazov") zoz.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk"));
  else if(fs==="cas") zoz.sort((a,b)=>(casMin(a)||999)-(casMin(b)||999));
  else if(fs==="kcal") zoz.sort((a,b)=>(kcalPorcia(a)||0)-(kcalPorcia(b)||0));
  else if(fs==="kcald") zoz.sort((a,b)=>(kcalPorcia(b)||0)-(kcalPorcia(a)||0));
  else if(fs==="hodn") zoz.sort((a,b)=>(S.hodn[b.id]||0)-(S.hodn[a.id]||0));
  const filtreAktivne = q||fk||fc||fd||aktivnaKat!=="Všetko"||aktivnaKolekcia;
  // U1: na telefóne sú selecty schované za tlačidlom „Filtre" — bez počtu by používateľ nevidel, že filtruje
  const fcnt=document.getElementById("f-cnt"); if(fcnt){ const n=[fk,fc,fd,fs].filter(Boolean).length; fcnt.textContent=n; fcnt.hidden=!n; }
  const em=document.getElementById("empty");
  em.style.display=zoz.length?"none":"block";
  if(!zoz.length){ em.innerHTML = filtreAktivne
    ? 'Nič sa nenašlo. <a onclick="zrusFiltre()" style="cursor:pointer;color:var(--accent);text-decoration:underline">Zrušiť filtre</a>'
    : "Zatiaľ žiadne recepty."; }
  if(fs==="spajza" && !_spajzaSkore && zoz.length){ em.style.display="block"; em.innerHTML='🧊 Špajza je prázdna — pridaj zásoby v <a onclick="prepni(\'spajza\')" style="cursor:pointer;color:var(--accent);text-decoration:underline">Špajzi</a>, potom zoradím recepty podľa toho, čo máš doma.'; }
  const pc=document.getElementById("pocet"); if(pc) pc.textContent = filtreAktivne ? (zoz.length+" / "+RECEPTY.length) : RECEPTY.length; // R3: živý počet výsledkov
  zoz.forEach(r=>{ const c=document.createElement("div"); c.className="card"+(S.skryte[r.id]?" skryty":""); c.innerHTML=kartaHTML(r); grid.appendChild(c); });
}
function zrusFiltre(){ const h=document.getElementById("hladaj"); if(h)h.value=""; ["f-kuchyna","f-cas","f-diet"].forEach(id=>{const e=document.getElementById(id); if(e)e.value="";}); aktivnaKat="Všetko"; aktivnaKolekcia=""; renderChips(); renderKolekcie(); renderGrid(); } // R2
// U1: sekundárne panely sú na telefóne zbalené; na počítači ostávajú otvorené (je tam miesto)
function zbalNaMobile(){ if(typeof matchMedia!=="function" || !matchMedia("(max-width:820px)").matches) return;
  document.querySelectorAll("details.mob-zbal[open]").forEach(d=>{ d.open=false; }); }
// U1: na telefóne sú filtre a radenie zbalené za jedno tlačidlo (4 selecty pod sebou zabrali celú obrazovku)
function prepniFiltre(){ const box=document.getElementById("rec-controls"); if(!box)return;
  const otv=box.classList.toggle("f-open"); const b=document.getElementById("f-toggle"); if(b)b.setAttribute("aria-expanded",otv?"true":"false"); }
function toggleFav(id){ S.fav[id]=!S.fav[id]; if(!S.fav[id])delete S.fav[id]; save(); renderGrid(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }
function toggleSkryt(id){ if(S.skryte[id])delete S.skryte[id]; else S.skryte[id]=1; save(); renderGrid(); otvor(id,_poslednyCtx); }
function novyRecept(){ const IST="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px";
  const kats=["Raňajky","Hlavné jedlo","Cestoviny","Polievka","Šalát","Nátierka","Príloha","Pečivo","Snack","Dezert","Nápoj","Kokteil"];
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Nový recept</h2></div><div class="content2">
    <div class="field"><label>Názov *</label><input id="nr-nazov" style="${IST}"></div>
    <div class="field"><label>Kategória</label><select class="f" id="nr-kat">${kats.map(k=>`<option>${k}</option>`).join("")}</select></div>
    <div class="field"><label>Kuchyňa</label><input id="nr-kuch" placeholder="napr. Talianska" style="${IST}"></div>
    <div class="field"><label>Počet porcií</label><input id="nr-porcie" type="number" value="2" style="${IST}"></div>
    <div class="field"><label>Čas</label><input id="nr-cas" placeholder="napr. 30 min" style="${IST}"></div>
    <h4 class="sekcia">Ingrediencie (vyber zo zoznamu potravín)</h4><div id="nr-ing"></div>
    <button class="btn" onclick="pridajIngRiadok()">+ ďalšia surovina</button>
    <h4 class="sekcia">Postup (každý krok na nový riadok)</h4>
    <textarea id="nr-postup" class="doma-in" placeholder="Zmiešaj suroviny...&#10;Peč 20 minút..."></textarea>
    <div class="field"><label>Tip (voliteľné)</label><input id="nr-tip" style="${IST}"></div>
    <div class="btn-row"><button class="btn primary" onclick="ulozNovyRecept()">Uložiť recept</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open");
  pridajIngRiadok(); pridajIngRiadok(); pridajIngRiadok(); }
function pridajIngRiadok(){ const box=document.getElementById("nr-ing"); if(!box)return;
  const d=document.createElement("div"); d.className="controls"; d.style.marginBottom="6px"; d.style.padding="0";
  d.innerHTML=`<input list="potraviny-dl" class="nr-in" placeholder="surovina" style="flex:1;min-width:120px;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" class="nr-mn" placeholder="množ." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px"><input class="nr-jed" list="jedn-dl" placeholder="jedn." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px">`;
  box.appendChild(d); }
function ulozNovyRecept(){ const nazov=escHtml((document.getElementById("nr-nazov").value||"").trim()); if(!nazov){toast("Zadaj názov receptu.");return;}
  const ing=[]; document.querySelectorAll("#nr-ing .controls").forEach(row=>{ const n=(row.querySelector(".nr-in").value||"").trim(); if(!n)return;
    const mn=parseFloat(row.querySelector(".nr-mn").value); const jed=(row.querySelector(".nr-jed").value||"").trim();
    ing.push({nazov:escHtml(n),mnozstvo:isNaN(mn)?null:mn,jednotka:escHtml(jed)}); });
  if(!ing.length){ toast("Pridaj aspoň jednu surovinu."); return; }
  const postup=(document.getElementById("nr-postup").value||"").split(/\n+/).map(x=>escHtml(x.replace(/^\s*\d+[\.\)]\s*/,"").trim())).filter(Boolean);
  const r={ id:"moj-"+(S.spSid++), nazov, kategoria:document.getElementById("nr-kat").value, kuchyna:escHtml((document.getElementById("nr-kuch").value||"").trim()),
    porcie:parseInt(document.getElementById("nr-porcie").value)||2, cas:escHtml((document.getElementById("nr-cas").value||"").trim()), popis:"",
    ingrediencie:ing, postup, tipy:escHtml((document.getElementById("nr-tip").value||"").trim()), foto:"", tagy:["vlastný"], _moj:true };
  S.mojeRecepty.push(r); RECEPTY.push(r); zabudniVyzivu(); naplnKuchyne(); save(); zavriPick(); renderChips(); renderGrid(); otvor(r.id); }
async function zmazMojRecept(id){ if(!await confirmModal("Zmazať tento vlastný recept?"))return;
  S.mojeRecepty=S.mojeRecepty.filter(r=>r.id!==id); const i=RECEPTY.findIndex(r=>r.id===id); if(i>=0)RECEPTY.splice(i,1);
  delete S.fav[id]; delete S.hodn[id]; zabudniVyzivu(); save(); zavri(); renderChips(); renderGrid(); }

let aktualny=null, aktPorcie=1, aktVelkost=1, jednotkaMode="metric";
let _poslednyCtx=null; // D8: kontext plánu (deň/slot/porcie), z ktorého bol detail otvorený
function otvor(id, ctx){
  const r=receptById(id); if(!r)return; aktualny=r; jednotkaMode="metric";
  _poslednyCtx=(ctx&&ctx.di!=null)?ctx:null;
  // Porcie (koľko štandardných porcií) a veľkosť porcie (%, kvôli dennému kalorickému cieľu) sú dve NEZÁVISLÉ veci —
  // predtým sa zaokrúhľovali dokopy na celé číslo, čím sa pri malom počte porcií % veľkosti niekedy stratilo úplne (zaokrúhlilo naspäť na 100 %).
  if(ctx&&ctx.di!==undefined){ aktPorcie=porcieSlotBlok(ctx.di,ctx.slot,id); aktVelkost=pf(ctx.di,ctx.slot); }
  else { aktPorcie=r.porcie||1; aktVelkost=1; }
  const al=alergenyReceptu(r); const d=diety(r);
  const foto=r.foto?`<img src="recepty/fotky/${r.foto}" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin-bottom:14px">`:"";
  const hs=healthScore(r); const pod=Math.round(podielCiela(r)*100);
  const hsBadge=hs.p100>0?`<span class="badge hs-${hs.farba}" title="bielkoviny na 100 kcal">💪 ${fmt(hs.p100)} g/100 kcal</span>`:'';
  const ringBadge=(hs.p100>0 && pod>0)?`<span class="ring" style="background:conic-gradient(var(--accent) ${pod*3.6}deg, var(--line) 0)" title="podiel jednej porcie na dennom cieli"><b>${pod}%</b></span> <span class="badge">podiel dňa</span>`:'';
  const badges=[hsBadge,ringBadge,jeVakcii(r)?'<span class="badge price">🏷️ v akcii</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 vegetariánske</span>':'',d.bezlepku?'<span class="badge">bez lepku</span>':'',d.bezlaktozy?'<span class="badge">bez laktózy</span>':'',pripravaVopred(r)?'<span class="badge" title="Recept spomína prípravu vopred (marinovanie, namáčanie cez noc a pod.)">⏰ priprav vopred</span>':'',...al.map(a=>`<span class="badge alerg">⚠ ${a}</span>`)].join('');
  const hod=S.hodn[r.id]||0;
  const stars=starsHTML(hod,r.id,true);
  const cen=vyzivaReceptu(r).cena; const uv=S.uvarene.filter(u=>u.id===r.id); const dparts=[];
  if(cen>0.01)dparts.push(`💶 ~${eur(cen)}/porcia`);
  if(uv.length)dparts.push(`🍳 uvarené ${uv.length}× (naposledy ${uv[0].datum})`);
  const detailMeta=dparts.length?`<div class="info detail-meta">${dparts.join(" · ")}</div>`:"";
  document.getElementById("modal").innerHTML=`
    <div class="hero"><button class="close" onclick="zavri()">✕</button>
      <h2>${ikony[r.kategoria]||"🍴"} ${r.nazov}</h2>
      <div class="subx">${[r.kategoria,r.kuchyna,r.cas].filter(Boolean).join(" · ")}</div></div>
    <div class="content2">${foto}
      ${r.popis?`<p class="popis">${r.popis}</p>`:""}
      <div class="row-badges">${badges}</div>
      <div class="porcie-box"><label>Porcie:</label>
        <div class="stepper"><button onclick="zmenPorcie(-1)">−</button><input id="pnum" type="number" min="1" max="99" value="${aktPorcie}" onchange="nastavPorcie(this.value)" onfocus="this.select()" title="Zadaj počet porcií" style="width:52px;text-align:center;border:1px solid var(--line);border-radius:8px;padding:5px;font-weight:600;font-size:16px"><button onclick="zmenPorcie(1)">+</button></div>
        <select class="mini" id="unit-mode" onchange="setUnitMode(this.value)"><option value="metric">g / ml</option><option value="spoon">lyžice</option><option value="imperial">oz / cup</option></select></div>
      ${aktVelkost!==1?`<p class="info" style="margin-top:-6px">⚖️ Veľkosť porcie v tomto pláne: <b>${Math.round(aktVelkost*100)}%</b> (kvôli dennému kalorickému cieľu) — ingrediencie a kalórie nižšie to už zohľadňujú.</p>`:""}
      <div class="nutri" id="nutri"></div>
      <div id="nutri-spolu" class="info" style="margin:-2px 0 6px"></div>
      ${detailMeta}
      <h4 class="sekcia">Ingrediencie</h4><table class="ing"><tbody id="ing-body"></tbody></table>
      <div id="subst-box"></div>
      <h4 class="sekcia">Postup</h4><ol class="postup" id="postup-ol"></ol>
      ${r.tipy?`<div class="tipy">💡 <b>Tip:</b> ${r.tipy}</div>`:""}
      ${r.zdroj?`<div class="zdroj">Zdroj: ${r.zdroj_url?`<a href="${escHtml(r.zdroj_url)}" target="_blank" rel="noopener noreferrer">${escHtml(r.zdroj)}</a>`:escHtml(r.zdroj)}</div>`:""}
      <div class="hodnotenie"><span>Hodnotenie:</span><div class="starpick">${stars}</div>
        <button class="mini" onclick="hodnot('${r.id}',0)">zrušiť</button></div>
      <textarea class="pozn" id="poznamka" placeholder="Moja poznámka k receptu…" oninput="ulozPozn('${r.id}')">${(S.pozn[r.id]||"").replace(/</g,'&lt;')}</textarea>
      <div class="btn-row">
        <button class="btn primary" onclick="spustiCook()">👨‍🍳 Variť</button>
        <button class="btn" onclick="pridajDoPlanu('${r.id}')">📅 Do plánu</button>
        <div class="menu-wrap"><button class="btn" onclick="toggleMenu('m-det')">⋯ Viac</button>
          <div class="menu" id="m-det">
            <a onclick="toggleSkryt('${r.id}');zavriMenu()">${S.skryte[r.id]?"👁 Zobraziť v generátore":"🚫 Skryť z generátora"}</a>
            <a onclick="zavriMenu();window.print()">🖨 Tlačiť recept</a>
            ${r._moj?`<a style="color:var(--warn)" onclick="zavriMenu();zmazMojRecept('${r.id}')">🗑 Zmazať recept</a>`:""}
          </div>
        </div></div>
    </div>`;
  renderIng(); renderSubst(); zpristupniKliky(document.getElementById("modal"));
  document.getElementById("overlay").classList.add("open");
  document.body.style.overflow="hidden";
}
function renderIng(){
  const r=aktualny; const fPocet=r.porcie?(aktPorcie/r.porcie):1; let rows="";
  (r.ingrediencie||[]).forEach(i=>{
    let mn="";
    if(i.mnozstvo!=null){ mn=prevodJednotka(skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,aktVelkost), i.jednotka||""); }
    else if(i.poznamka){ mn=i.poznamka; }
    const pozn=(i.mnozstvo!=null&&i.poznamka)?` <span class="pozn">(${i.poznamka})</span>`:"";
    rows+=`<tr><td>${i.nazov}${pozn}</td><td class="mn">${mn}</td></tr>`;
  });
  document.getElementById("ing-body").innerHTML=rows;
  const v=vyzivaReceptu(r); const box=document.getElementById("nutri");
  if(v.kcal>5){ box.style.display="grid";
    box.innerHTML=`<div><b>${v.pribl?"≈ ":""}${Math.round(v.kcal)}</b><small>kcal/porcia${v.pribl?" (odhad)":""}</small></div>
      <div><b>${fmt(v.b)} g</b><small>bielkoviny</small></div>
      <div><b>${fmt(v.t)} g</b><small>tuky</small></div>
      <div><b>${fmt(v.s)} g</b><small>sacharidy</small></div>`;
  } else box.style.display="none";
  const sp=document.getElementById("nutri-spolu");
  if(sp){ if(v.kcal>5 && (aktPorcie>1||aktVelkost!==1)){ sp.style.display="block";
      const nasobok=aktPorcie*aktVelkost;
      sp.innerHTML=`Spolu za <b>${aktPorcie} porcií${aktVelkost!==1?" × "+Math.round(aktVelkost*100)+" %":""}</b>: ${Math.round(v.kcal*nasobok)} kcal · B ${fmt(v.b*nasobok)} g · T ${fmt(v.t*nasobok)} g · S ${fmt(v.s*nasobok)} g`;
    } else sp.style.display="none"; }
  const um=document.getElementById("unit-mode"); if(um)um.value=jednotkaMode;
  renderPostup(fPocet,aktVelkost);
}
function krokHint(text,fPocet,fVelkost){ const h=bezDia(text); const found=[];
  (aktualny.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; const nm=bezDia(i.nazov); const prve=nm.split(" ")[0];
    if(nm.length>2 && (h.includes(nm)||(prve.length>3&&h.includes(prve)))) found.push(`${i.nazov} ${prevodJednotka(skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost),i.jednotka||"")}`); });
  return found.length? ` <span class="krok-mn">▸ ${found.join(" · ")}</span>`:""; }
function renderPostup(fPocet,fVelkost){ const ol=document.getElementById("postup-ol"); if(!ol)return;
  ol.innerHTML=(aktualny.postup||[]).map(k=>`<li>${k}${krokHint(k,fPocet,fVelkost)}</li>`).join(""); }
function renderSubst(){
  const r=aktualny; let items=[];
  (r.ingrediencie||[]).forEach(i=>{ const n=i.nazov.toLowerCase();
    for(const k in SUBSTITUCIE){ if(n.includes(k)){ items.push(`<b>${i.nazov}</b> → ${SUBSTITUCIE[k].join(", ")}`); break; } }
  });
  const box=document.getElementById("subst-box");
  box.innerHTML = items.length ? `<div class="subst">🔄 Náhrady: ${items.join(" · ")}</div>` : "";
}
function zmenPorcie(d){ aktPorcie=Math.max(1,aktPorcie+d); document.getElementById("pnum").value=aktPorcie; renderIng(); }
function nastavPorcie(v){ aktPorcie=Math.max(1,Math.min(99,parseInt(v)||1)); document.getElementById("pnum").value=aktPorcie; renderIng(); } // priame zadanie počtu porcií
function setUnitMode(v){ jednotkaMode=v; renderIng(); }
const NEDELITELNE_JEDNOTKY=["ks","kus","plátok","platok","rožok","rozok","žemľa","zemla"];
// veľkosť porcie (%) sa NEDÁ uplatniť na kus chleba/vajce — tie sa škálujú len počtom porcií, nie kalorickým % (viď skalovanaHodnota)
function skalovanaHodnota(mnozstvo,jednotka,fPocet,fVelkost){ return mnozstvo*(NEDELITELNE_JEDNOTKY.includes((jednotka||"").toLowerCase())?fPocet:fPocet*fVelkost); }
function prevodJednotka(val, jed){
  const j=(jed||"").toLowerCase();
  if(NEDELITELNE_JEDNOTKY.includes(j)){ const n=Math.max(val>0?1:0,Math.round(val)); return n+" "+jed; }
  if(jednotkaMode==="spoon"){
    if(j==="ml"){ return val>=15 ? fmt(val/15)+" PL" : fmt(val/5)+" ČL"; }
    return fmt(val)+(jed?(" "+jed):"");
  }
  if(jednotkaMode==="imperial"){
    if(j==="g"||j==="gram"){ return val>=454 ? fmt(val/453.6)+" lb" : fmt(val/28.35)+" oz"; }
    if(j==="ml"){ return val>=240 ? fmt(val/240)+" cup" : fmt(val/29.57)+" fl oz"; }
    return fmt(val)+(jed?(" "+jed):"");
  }
  return fmt(val)+(jed?(" "+jed):"");
}
// D8: otvor() bez ctx zahodí kontext plánu (272 g → 320 g a zmizne „Veľkosť porcie 85 %"),
// preto si posledný kontext pamätáme a vraciame ho späť.
function hodnot(id,n){ if(n)S.hodn[id]=Math.round(n*2)/2; else delete S.hodn[id]; save(); otvor(id,_poslednyCtx); renderGrid(); }
// klik na ľavú polovicu hviezdy = pol hviezdy, na pravú = celá
function hodnotKlik(e,id,i){ const rect=e.currentTarget.getBoundingClientRect(); const polovica=(e.clientX-rect.left)<rect.width/2; hodnot(id,polovica?(i-0.5):i); }
function starsHTML(hod,id,klikatelne){ let h=""; for(let i=1;i<=5;i++){ const fill=Math.max(0,Math.min(1,hod-(i-1)))*100;
  const onclick=klikatelne?` onclick="hodnotKlik(event,'${id}',${i})"`:"";
  h+=`<span class="star-slot"${onclick}><span class="star-e">★</span><span class="star-f" style="width:${fill}%">★</span></span>`; }
  return h; }
function ulozPozn(id){ S.pozn[id]=document.getElementById("poznamka").value; save(); }
// --- vlastné dialógy namiesto natívnych (toast / confirm / prompt) ---
function toast(msg){ const t=document.getElementById("toast"); if(!t)return; t.textContent=msg; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),3000); }
function dlgZavri(v){ const o=document.getElementById("dlg-overlay"); o.classList.remove("open"); document.body.style.overflow=document.querySelector("#overlay.open,#pick-overlay.open,#cook.open")?"hidden":""; const r=o._res; o._res=null; if(r)r(v); }
function confirmModal(msg,okLabel){ return new Promise(res=>{ const o=document.getElementById("dlg-overlay"); o._res=res; o._cancel=false;
  document.getElementById("dlg-modal").innerHTML=`<div class="content2"><p>${escHtml(msg)}</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" onclick="dlgZavri(false)">Zrušiť</button><button class="btn primary" onclick="dlgZavri(true)">${escHtml(okLabel||"OK")}</button></div></div>`;
  o.classList.add("open"); document.body.style.overflow="hidden"; const bb=o.querySelector(".btn.primary"); if(bb)bb.focus(); }); }
function promptModal(msg,def){ return new Promise(res=>{ const o=document.getElementById("dlg-overlay"); o._res=res; o._cancel=null;
  document.getElementById("dlg-modal").innerHTML=`<div class="content2"><p>${escHtml(msg)}</p><input id="dlg-in" value="${escHtml(def==null?"":def)}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;font-size:15px"><div class="btn-row" style="justify-content:flex-end;margin-top:14px"><button class="btn" onclick="dlgZavri(null)">Zrušiť</button><button class="btn primary" onclick="dlgPromptOk()">OK</button></div></div>`;
  o.classList.add("open"); document.body.style.overflow="hidden"; const inp=document.getElementById("dlg-in"); if(inp){ inp.focus(); inp.select(); inp.addEventListener("keydown",e=>{ if(e.key==="Enter"){e.preventDefault();dlgPromptOk();} }); } }); }
function dlgPromptOk(){ const inp=document.getElementById("dlg-in"); dlgZavri(inp?inp.value:""); }
document.getElementById("dlg-overlay").addEventListener("click",e=>{ if(e.target.id==="dlg-overlay") dlgZavri(e.currentTarget._cancel); });

function zavri(){ document.getElementById("overlay").classList.remove("open"); document.body.style.overflow=""; _zahodHistoriuModalu(); }
document.getElementById("overlay").addEventListener("click",e=>{if(e.target.id==="overlay")zavri();});
// D4: Escape zatvára aj režim varenia — v kuchyni so zamastenými rukami je „✕ Koniec" mimo dosahu
document.addEventListener("keydown",e=>{if(e.key==="Escape"){ const dg=document.getElementById("dlg-overlay"); if(dg.classList.contains("open")){ dlgZavri(dg._cancel); return; } zavri();zavriPick(); if(typeof zavriCook==="function")zavriCook(); }});

// E2+E4: centrálny stav modálov — zamkni scroll pozadia pri KTOROMKOĽVEK otvorenom modáli a podchyť „späť" (Android/PWA gesto)
function modalOtvoreny(){ return !!document.querySelector("#overlay.open,#pick-overlay.open,#cook.open"); }
let _modalWas=false, _histLock=false, _histPush=0;
function _syncModal(){ const now=modalOtvoreny();
  document.body.style.overflow = now ? "hidden" : "";
  if(now && !_modalWas && !_histLock){ try{history.pushState({m:1},""); _histPush++;}catch(e){} }
  if(now) zpristupniFormulare(document.getElementById("pick-modal")); // D6: menovky aj pre dynamické modály
  _modalWas=now; }
// D5: zatvorenie krížikom/Escape musí zahodiť aj záznam v histórii, inak treba v PWA prvý „Späť" nadarmo
function _zahodHistoriuModalu(){ if(_histLock)return;
  setTimeout(()=>{ if(!modalOtvoreny() && _histPush>0){ _histPush--; _histLock=true;
    try{history.back();}catch(e){} setTimeout(()=>{_histLock=false;},0); } },0); }
["overlay","pick-overlay","cook"].forEach(id=>{ const el=document.getElementById(id); if(el) new MutationObserver(_syncModal).observe(el,{attributes:true,attributeFilter:["class"]}); });
window.addEventListener("popstate",()=>{
  if(modalOtvoreny()){ _histLock=true; _histPush=Math.max(0,_histPush-1); zavri(); zavriPick(); if(typeof zavriCook==="function")zavriCook(); setTimeout(()=>{_histLock=false;},0); } // ponytail: setTimeout kryje async MutationObserver, aby sa push nezopakoval
  else { const v=location.hash.slice(1); if(v && v!==_curView && document.getElementById("v-"+v)) zobrazView(v); }
});
// E3: navigácia prístupná klávesnicou + čítačkou (bez zásahu do 14 <a> v šablóne)
// D6: 41 zo 41 vstupných polí nemalo <label for> (čítačky obrazovky ani autofill nevedeli, čo je čo).
// Väzbu doplníme programovo — platí aj pre polia, ktoré pribudnú do šablóny neskôr.
let _idPolia=0;
function zpristupniFormulare(root){ const r=root||document;
  r.querySelectorAll("input,select,textarea").forEach(el=>{
    if(el.type==="hidden")return;
    if(!el.id)el.id="pole-"+(++_idPolia);
    let lab=el.closest("label");
    // menovku z .field priraď len keď v nej je JEDINÉ pole — inak by jeden <label> „patril"
    // trom inputom (stravníci) a zvyšné by ostali bez menovky
    if(!lab){ const f=el.closest(".field");
      const jedine=f && f.querySelectorAll("input,select,textarea").length===1;
      lab=jedine?f.querySelector("label"):null;
      if(lab && !lab.getAttribute("for")) lab.setAttribute("for",el.id); }
    if(!lab && !el.getAttribute("aria-label")){
      // pri <select> bez menovky poslúži text prvej možnosti („Všetky kuchyne", „Zoradiť: predvolené")
      const t=el.getAttribute("placeholder")||el.getAttribute("title")||
        (el.tagName==="SELECT"&&el.options&&el.options[0]?el.options[0].textContent.trim():"");
      if(t)el.setAttribute("aria-label",t); }
  });
  r.querySelectorAll("button").forEach(b=>{
    if(!b.textContent.trim() && !b.getAttribute("aria-label")) b.setAttribute("aria-label",b.getAttribute("title")||"Zavrieť");
  }); }
// A7: chipy, kolekcie a položky menu sú <span|a onclick> — bez tabindexu ich klávesnica nevidí (WCAG 2.1.1).
// Vždy dostaň KOREŇ prekresleného kontejnera: querySelectorAll nad celým dokumentom prehľadáva aj 19 000
// uzlov mriežky receptov, čo spravilo z renderPlan 0,3 → 2,4 ms. Neinteraktívne chipy majú inline cursor:default.
function zpristupniKliky(root){ (root||document).querySelectorAll(".chip:not([tabindex]),.kol-tile:not([tabindex]),.menu a:not([tabindex]),.plan-cell[onclick]:not([tabindex])").forEach(el=>{
    if(el.style.cursor==="default")return;
    el.setAttribute("tabindex","0"); if(!el.getAttribute("role"))el.setAttribute("role","button"); }); }
function zpristupniNav(){ zpristupniKliky();
  document.querySelectorAll(".side nav a:not([tabindex]),.side .foot a:not([tabindex]),.botnav a:not([tabindex])").forEach(a=>{ a.setAttribute("role","button"); if(!a.hasAttribute("tabindex"))a.setAttribute("tabindex","0"); const ic=a.querySelector(".ic"); if(ic)ic.setAttribute("aria-hidden","true"); if(!a.getAttribute("aria-label"))a.setAttribute("aria-label",a.textContent.trim()); }); }
document.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches(".side a,.botnav a,.menu a,.chip[tabindex],.kol-tile[tabindex]")){ e.preventDefault(); e.target.click(); } });

let cookKrok=0, cookKroky=[], wakeLock=null, cookRecept=null, cookAuto=false;
let casovace=[], casInterval=null, casId=0;
async function spustiCook(){ cookKroky=aktualny.postup||[]; cookKrok=0; cookRecept=aktualny.id;
  document.getElementById("cook-title").textContent=aktualny.nazov;
  document.getElementById("cook").classList.add("open"); ukazKrok();
  if('wakeLock' in navigator){ try{wakeLock=await navigator.wakeLock.request('screen');}catch(e){} } }
function parseCasSek(t){ const m=t.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(min|minút|minut)/i); const se=t.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(sek|sekúnd|sekund)/i); if(m)return parseInt(m[1])*60; if(se)return parseInt(se[1]); return 0; }
function formatCas(x){ const m=Math.floor(x/60),s=x%60; return (m<10?"0":"")+m+":"+(s<10?"0":"")+s; }
function ukazKrok(){ const t=cookKroky[cookKrok]||"";
  document.getElementById("cook-step").textContent=(cookKrok+1)+". "+t;
  document.getElementById("cook-progress").textContent=(cookKrok+1)+" / "+cookKroky.length;
  const sek=parseCasSek(t); const ab=document.getElementById("cook-add-timer");
  if(sek){ ab.style.display="inline-block"; ab.textContent="➕ "+formatCas(sek)+" časovač"; ab.dataset.sek=sek; } else ab.style.display="none";
  if(cookAuto) citajKrok();
}
function tickCasovace(){ casovace.forEach(c=>{ if(c.left>0){ c.left--; if(c.left<=0) pip(); } }); renderCasovace();
  if(!casovace.some(c=>c.left>0)){ clearInterval(casInterval); casInterval=null; } }
function renderCasovace(){ const box=document.getElementById("cook-timers"); if(!box)return;
  box.innerHTML=casovace.map(c=>`<span class="timer ${c.left>0?'run':''}" onclick="zmazCasovac(${c.id})">${c.left>0?'⏲ '+formatCas(c.left):'✅ hotovo'} · ${c.label} ✕</span>`).join(""); }
function pridajCasovacSek(sek,label){ if(!sek)return; casId++; casovace.push({id:casId,left:sek,label:label||formatCas(sek)}); if(!casInterval)casInterval=setInterval(tickCasovace,1000); renderCasovace(); }
function pridajKrokovyCasovac(){ const sek=parseInt(document.getElementById("cook-add-timer").dataset.sek)||0; pridajCasovacSek(sek,"krok "+(cookKrok+1)); }
async function pridajCasovac(){ const v=await promptModal("Časovač na koľko minút?","5"); if(v===null)return; const min=parseFloat(String(v).replace(",","."))||0; pridajCasovacSek(Math.round(min*60),fmt(min)+" min"); }
function zmazCasovac(id){ casovace=casovace.filter(c=>c.id!==id); renderCasovace(); if(!casovace.length&&casInterval){clearInterval(casInterval);casInterval=null;} }
function pip(){ try{const a=new (window.AudioContext||window.webkitAudioContext)();const o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();setTimeout(()=>o.stop(),600);}catch(e){} }
function citajKrok(){ try{ if(!('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance((cookKrok+1)+". "+(cookKroky[cookKrok]||"")); u.lang="sk-SK"; u.rate=0.95; speechSynthesis.speak(u); }catch(e){} }
async function krok(d){ if(d>0 && cookKrok===cookKroky.length-1){ oznacUvarene(cookRecept); const rr=receptById(cookRecept); zavriCook(); if(rr && S.spajza.length && await confirmModal("Uvarené! Odpísať suroviny zo špajze?")) odpisRecept(rr); return; } cookKrok=Math.min(cookKroky.length-1,Math.max(0,cookKrok+d)); ukazKrok(); }
function zavriCook(){ if(!document.getElementById("cook").classList.contains("open"))return; document.getElementById("cook").classList.remove("open"); _zahodHistoriuModalu(); casovace=[]; if(casInterval){clearInterval(casInterval);casInterval=null;} renderCasovace(); try{speechSynthesis.cancel();}catch(e){} if(wakeLock){wakeLock.release();wakeLock=null;} }
function oznacUvarene(id){ if(!id)return; S.uvarene.unshift({id:id,datum:isoZDatumu(new Date())}); S.uvarene=S.uvarene.slice(0,30); save(); }
const PRILOHY = {
 "prf:ryza":{nazov:"Ryža (príloha)", ing:{nazov:"Ryža",mnozstvo:60,jednotka:"g"}},
 "prf:zemiaky":{nazov:"Zemiaky (príloha)", ing:{nazov:"Zemiaky",mnozstvo:250,jednotka:"g"}},
 "prf:cestoviny":{nazov:"Cestoviny (príloha)", ing:{nazov:"Cestoviny",mnozstvo:80,jednotka:"g"}},
 "prf:pecivo":{nazov:"Pečivo", ing:{nazov:"Bageta",mnozstvo:80,jednotka:"g"}},
 "prf:salat":{nazov:"Zeleninový šalát", ing:{nazov:"Paradajky",mnozstvo:120,jednotka:"g"}},
 // A3: polievka a šalát ako hlavné jedlo potrebujú doplnok, inak vyjde večera na 150 kcal
 "prf:bielkovina":{nazov:"Kuracie prsia (doplnok)", ing:{nazov:"Kuracie prsia",mnozstvo:120,jednotka:"g"}},
 "prf:bielkovina_veg":{nazov:"Cottage syr (doplnok)", ing:{nazov:"Cottage syr",mnozstvo:150,jednotka:"g"}}
};
function komponent(id){ if(typeof id==="string" && id.indexOf("prf:")===0){ const p=PRILOHY[id]; if(!p)return null; return {id:id,nazov:p.nazov,kategoria:"Príloha",kuchyna:"",porcie:1,ingrediencie:[p.ing],postup:[],_priloha:true}; }
  if(typeof id==="string" && id.indexOf("left:")===0){ const r=receptById(id.slice(5)); if(!r)return null; return Object.assign({},r,{id:id,_left:true,_srcId:r.id}); } // zvyšok: ráta do kcal, nie do nákupu
  return receptById(id); }
function slotIds(di,slot){ const v=(S.plan[datumPre(di)]||{})[slot]; if(!v)return []; return Array.isArray(v)?v.slice():[v]; }
// A4: sacharid hľadáme aj v NÁZVE receptu a poznáme tvary cestovín/pečiva — inak „Pizza Margherita"
// (múka, voda, droždie) a 39 z 89 receptov kategórie Cestoviny prešlo ako „bez sacharidu" a dostali ryžu.
function maCarb(r){ if(!r) return false; if(r.kategoria==="Cestoviny") return true;
  const s=bezDia((r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" "));
  return /ryz|zemiak|cestovin|spaget|linguin|rezanc|tarhon|kuskus|bulgur|quinoa|chlieb|baget|tortill|rozok|zeml|nudl|halusk|knedl|pecivo|penne|rigatoni|fusilli|farfalle|orzo|tagliatell|bucatini|lasagne|gnocchi|pizza|taco|burrito|wrap|burger|sendvic|panini|toast|pita|plack|kasa|krupic|polenta|ovsen|granola|batat|musli|bagel|focacc|risott|pirohy|strapack|flia[cč]k/.test(s); }
// A3: vráti token prílohy pre hlavný chod, alebo null. Polievka dostane pečivo, šalát bielkovinu.
function prilohaPre(r,rot){ if(!r||!isMain(r)) return null;
  if(r.kategoria==="Polievka") return "prf:pecivo";
  if(r.kategoria==="Šalát") return diety(r).veg?"prf:bielkovina_veg":"prf:bielkovina";
  if(maCarb(r)) return null;
  return vyberPrilohu(r.kuchyna,rot||0); }
function potrebujePrilohu(r){ return !!prilohaPre(r,0); }
function mealKcal(compArr){ return (compArr||[]).reduce((a,id)=>a+kcalPorcia(komponent(id)),0); }
// A1: faktor je už len jemné dorovnanie (±15 %). Cieľ sa trafí výberom jedla, nie tým,
// že zjeme dve porcie melónového šalátu.
const FAKTOR_MIN=0.85, FAKTOR_MAX=1.15;
function rescaleDen(dni){ if(!(S.genCfg&&S.genCfg.cielMode))return;
  const ciel=S.profil.kcal||0, dk=baseDayKcal(dni[0]); if(!(ciel>0 && dk>0))return;
  const fac=Math.max(FAKTOR_MIN,Math.min(FAKTOR_MAX,Math.round(ciel/dk*20)/20));
  dni.forEach(d=>{ const iso=datumPre(d); SLOTY().forEach(s=>{ if(!slotIds(d,s).length)return;
    if(fac!==1){ S.planF[iso]=S.planF[iso]||{}; S.planF[iso][s]=fac; } else if(S.planF[iso]) delete S.planF[iso][s]; }); }); }
function pf(di,slot){ const d=S.planF[datumPre(di)]; return (d&&d[slot])||1; }
function stravniciList(){ const l=S.profil.stravnici; if(Array.isArray(l)&&l.length)return l; const o=S.profil.osoby||1,arr=[]; for(let i=0;i<o;i++)arr.push({nazov:i===0?"Ja":("Osoba "+(i+1)),kcal:S.profil.kcal||1450}); return arr; }
function baseDayKcal(di){ let s=0; slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(cid=>{const k=komponent(cid); if(k)s+=kcalPorcia(k);})); return s; }
function pocetPorcii(di){
  const st=stravniciList(), n=st.length, base=baseDayKcal(di);
  if(!(base>0)) return n;
  // B8: dorovnávanie viazané na prepínač „Dorovnať dni na cieľ", nie na magickú hranicu 200 kcal
  // (predtým 175 kcal → 1 porcia, 222 kcal → 6,53 porcie = 7× drahší nákup)
  if(!(S.genCfg&&S.genCfg.cielMode)) return n;
  const naplnene=slotyDna(di).filter(sl=>slotIds(di,sl).length).length;
  if(naplnene<2) return n; // jedno jedlo ešte nie je celý deň — nedorovnávaj ho na denný cieľ
  const dopyt=st.reduce((a,p)=>a+(p.kcal||S.profil.kcal||1450),0);
  return Math.min(n*2, dopyt/base); } // B8: strop = 2× počet stravníkov
function mnozMult(di,slot){ return porcieSlot(di,slot)*pf(di,slot); }
function tyzdenProfil(){ return S.tyzdenProfil&&S.tyzdenProfil[S.viewOd]; }
function tyzdenProfilEd(){ S.tyzdenProfil[S.viewOd]=S.tyzdenProfil[S.viewOd]||{ludia:null,prec:[]}; return S.tyzdenProfil[S.viewOd]; }
function nastavTyzdenLudia(v){ const tp=tyzdenProfilEd(); const n=parseInt(v); tp.ludia=(n>0)?n:null; save(); }
function toggleTyzdenPrec(di){ const tp=tyzdenProfilEd(); const i=(tp.prec||[]).indexOf(di); if(i>=0)tp.prec.splice(i,1); else (tp.prec=tp.prec||[]).push(di); save(); renderGenWizard(); }
function slotyDna(di){ const tp=tyzdenProfil(); if(tp&&(tp.prec||[]).includes(di))return [];
  const v=S.daySloty&&S.daySloty[datumPre(di)]; if(Array.isArray(v)) return VSETKY_SLOTY.filter(s=>v.includes(s)); return SLOTY(); }
// % veľkosti porcie (rescaleDen) už nesie kcal-korekciu, preto sa ním delí — inak by pôsobila 2×
// (v pocetPorcii aj v pf). B9: delí sa vo VŠETKÝCH vetvách, aj pri ručnom počte ľudí —
// predtým „4 ľudia × 80 %" navarilo 3,2 porcie pre 4 ľudí.
function pocetPorciiDna(di,slot){
  const f=(slot!==undefined)?pf(di,slot):1;
  const n=S.dayPpl&&S.dayPpl[datumPre(di)]; if(n>0)return n/f;
  const tp=tyzdenProfil(); if(tp&&tp.ludia>0)return tp.ludia/f;
  return pocetPorcii(di)/f; }
function porcieSlot(di,slot){ const d=S.slotPpl&&S.slotPpl[datumPre(di)]; const o=d&&d[slot]; return (o>0)?(o/pf(di,slot)):pocetPorciiDna(di,slot); }
// ponytail: hrubá heuristika mäsa (bez NLP) — na "nie 2× rovnaké mäso za sebou"; morčacie spadá pod hydinu
function masoTyp(r){ const s=bezDia((r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.nazov||""));
  if(/kura|kurac|kurca|kurci|slepac|sliepk|morcac|moriak|hydin/.test(s))return "hydina";
  if(/losos|tuniak|treska|ryb(a|y|ac|ie|i)|kreveta|garnat|makrela|pstruh|sardin|krabie/.test(s))return "ryby";
  if(/bravc|slanin|sunk|klobas|parok|panenk|prosciutto/.test(s))return "bravcove";
  if(/hovadz|steak|rostenk|svieckov/.test(s))return "hovadzie";
  return ""; }
// Koľko CELÝCH porcií tohto slotu sa naraz varí (v bloku sa varí raz na celý blok).
// Jeden zdroj pravdy pre detail receptu aj nákupný zoznam — inak detail počíta so zaokrúhleným
// počtom porcií (5) a nákup s nezaokrúhleným (4,69) a množstvá si nesedia.
// B7: deň „preč" (alebo deň bez tohto slotu) sa do porcií nepočíta — inak blok Po–Ut s dovolenkou
// v utorok navarí 4 porcie namiesto 2 a nákup je rovnako drahý ako bez dovolenky.
function porcieSlotBlok(di,slot,cid){ const dni=denyBloku(di).filter(d=>slotyDna(d).includes(slot) && (cid==null||slotIds(d,slot).includes(cid)));
  return Math.max(1,Math.round((dni.length?dni:[di]).reduce((a,d)=>a+porcieSlot(d,slot),0))); }
function jeSendvic(r){ const b=ranajkyBaza(r); if(["tortilla","bageta","toast","rožok","bagel"].includes(b))return true; const t=(r.tagy||[]).join(" ").toLowerCase(); return t.includes("wrap")||t.includes("sendvič")||t.includes("sendvic"); }
function fmtPct(f){ return f===1?"":(" · "+Math.round(f*100)+"%"); }
function planItems(){ const out=[]; for(let di=0;di<7;di++){ slotyDna(di).forEach(sl=>{ slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)out.push({r,cid,di,slot:sl,f:pf(di,sl)}); }); }); } return out; }
function planovaneRecepty(){ return planItems().map(x=>x.r); }
function applyVzhlad(){ document.body.classList.toggle("dark",!!S.profil.dark); document.body.classList.toggle("big",!!S.profil.big); }

function hraniceInit(){ if(!Array.isArray(S.hranice)||S.hranice.length!==7)S.hranice=[true,false,true,false,false,true,false]; S.hranice[0]=true; }
function bloky(){ hraniceInit(); const out=[]; let cur=null; for(let i=0;i<7;i++){ if(i===0||S.hranice[i]){ cur=[i]; out.push(cur); } else cur.push(i); } return out; }
function blokDni(di){ let start=di; while(start>0 && !S.hranice[start]) start--; const dni=[start]; for(let j=start+1;j<7;j++){ if(S.hranice[j])break; dni.push(j); } return dni; }
function prepniBlok(v){ S.blokMode=v; save(); renderPlan(); }
function denyBloku(di){ return S.blokMode?blokDni(di):[di]; }
function zmenDenPpl(di,delta){ const dni=denyBloku(di); const cur=(S.dayPpl[datumPre(di)]!=null)?S.dayPpl[datumPre(di)]:stravniciList().length; const nova=Math.max(1,cur+delta); dni.forEach(d=>{ S.dayPpl[datumPre(d)]=nova; }); save(); renderPlan(); }
function toggleDenSlot(di,slot){ const dni=denyBloku(di); const akt=slotyDna(di).slice(); const i=akt.indexOf(slot); if(i>=0)akt.splice(i,1); else { akt.push(slot); akt.sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b)); } dni.forEach(d=>{ S.daySloty[datumPre(d)]=akt.slice(); }); save(); renderPlan(); }
async function upravSlotPorcie(di,slot){ const cur=Math.round(porcieSlot(di,slot)); const v=await promptModal("Počet porcií pre toto jedlo (prázdne = podľa dňa):",cur); if(v===null)return; const dni=denyBloku(di); if(v.trim()===""){ dni.forEach(d=>{ const iso=datumPre(d); if(S.slotPpl[iso])delete S.slotPpl[iso][slot]; }); } else { const n=Math.max(1,parseInt(v)||cur); dni.forEach(d=>{ const iso=datumPre(d); S.slotPpl[iso]=S.slotPpl[iso]||{}; S.slotPpl[iso][slot]=n; }); } save(); renderPlan(); }
function toggleHranica(i){ hraniceInit(); S.hranice[i]=!S.hranice[i]; save(); renderPlan(); }
function renderBlokEditor(){ const box=document.getElementById("blok-editor"); if(!box)return;
  if(!S.blokMode){ box.style.display="none"; return; } box.style.display="flex"; hraniceInit();
  let h='<span class="info" style="margin-right:6px">Rozdelenie (klikni medzi dni):</span>';
  for(let i=0;i<7;i++){ h+=`<span class="chip" style="cursor:default;padding:6px 10px">${DNI[i].slice(0,2)}</span>`;
    if(i<6){ const sp=S.hranice[i+1]; h+=`<span class="hranica" onclick="toggleHranica(${i+1})" style="color:${sp?'var(--accent)':'#ccc'}" title="${sp?'spojiť tieto dni do jedného bloku':'rozdeliť medzi dva bloky'}">${sp?'✂':'·'}</span>`; } }
  box.innerHTML=h;
}
function fmtD(iso){ const d=new Date(iso+"T00:00:00"); return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."; }
// Plán aj Nákup ukazujú ten istý zvolený týždeň — nech je to vidieť na oboch obrazovkách, nielen v Pláne
function posunTyzden(delta){ S.viewOd=pridajDni(S.viewOd,delta*7); save(); prekresliTyzden(); }
function skokNaDnesTyzden(){ S.viewOd=pondelokPre(dnesISO()); save(); prekresliTyzden(); }
function prekresliTyzden(){ renderPlan(); if(_curView==="nakup")renderNakup(); if(_curView==="vyziva")renderVyziva(); }
function tyzdenNavHTML(){ const jeTentoTyzden=S.viewOd===pondelokPre(dnesISO());
  return `<div class="chips" style="padding:0 0 8px;align-items:center">
    <span class="chip" style="cursor:pointer" onclick="posunTyzden(-1)" title="Predchádzajúci týždeň">◀</span>
    <span class="chip" style="cursor:default;font-weight:600">${fmtD(S.viewOd)}–${fmtD(pridajDni(S.viewOd,6))}</span>
    <span class="chip" style="cursor:pointer" onclick="posunTyzden(1)" title="Ďalší týždeň">▶</span>
    ${jeTentoTyzden?"":'<span class="chip" style="cursor:pointer" onclick="skokNaDnesTyzden()">📅 Tento týždeň</span>'}
  </div>`; }
function renderTyzdenNav(){ const el=document.getElementById("plan-kontext"); if(el){el.innerHTML=tyzdenNavHTML(); zpristupniKliky(el);} }
// Na mobile sa 7 stĺpcov nezmestí — ukazujeme jeden deň naraz (CSS skryje ostatné stĺpce, dáta ostávajú tie isté).
let planDen=(new Date().getDay()+6)%7;
function planDenNa(di){ planDen=di; renderPlan(); }
function renderDenNav(){ const box=document.getElementById("plan-den-nav"); if(!box)return;
  box.innerHTML=DNI.map((d,i)=>`<span class="chip${i===planDen?' active':''}" onclick="planDenNa(${i})">${d.slice(0,2)}</span>`).join("")
    +`<span class="chip" style="cursor:default;background:none;border:none;color:var(--muted)">${fmtD(datumPre(planDen))}</span>`;
  zpristupniKliky(box); }
function renderPlan(){
  renderTyzdenNav(); hraniceInit(); const pb=document.getElementById("p-blok"); if(pb)pb.checked=!!S.blokMode; renderBlokEditor(); renderDenNav();
  const bl=bloky(); const parita={}; bl.forEach((b,idx)=>b.forEach(di=>parita[di]=idx%2));
  // trieda, nie inline background — inline štýl prebíja body.dark a v tmavom režime robí tabuľku nečitateľnou
  const tint=di=>S.blokMode?(parita[di]?'blokb':'bloka'):'';
  const t=document.getElementById("plan-table"); 
  // table-layout:fixed berie šírky z PRVÉHO riadku; ten má v blokovom režime colspan bunky, takže
  // zvyšok šírky spadol do stĺpca s názvami jedál (718 px) a dni dostali 51 px. <colgroup> to určí priamo.
  let h='<colgroup><col class="c-slot"><col span="7"></colgroup>';
  // riadky = zjednotenie globálnych slotov + čokoľvek v per-deň maskách (aby slot v maske po zmene globálnych slotov nezmizol z UI, no stále sa počítal)
  const rowSloty=[...new Set([...SLOTY(), ...[0,1,2,3,4,5,6].flatMap(di=>(S.daySloty||{})[datumPre(di)]||[])])].filter(s=>VSETKY_SLOTY.includes(s)).sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b));
  if(S.blokMode){ h+='<tr><td class="slotname rohova"></td>';
    bl.forEach((b,idx)=>{ const pism=String.fromCharCode(65+idx); const vari=DNI[(b[0]+6)%7].slice(0,2); h+=`<td colspan="${b.length}" data-d="${b.join(" ")}" class="${tint(b[0])}" style="text-align:center;font-size:12px"><b>Blok ${pism} · ${DNI[b[0]].slice(0,2)}–${DNI[b[b.length-1]].slice(0,2)}</b><br><a class="plan-varenia" onclick="planVarenia(${b[0]})" style="cursor:pointer;text-decoration:underline;color:var(--accent-txt)">🍳 plán varenia (${vari} večer)</a></td>`; }); h+="</tr>"; }
  h+='<tr class="dni-hlavicka"><th>Jedlo</th>'; DNI.forEach((d,di)=>h+=`<th data-d="${di}">${d.slice(0,3)}</th>`); h+="</tr>";
  h+='<tr class="ctrl-row"><td class="slotname rohova"></td>';
  DNI.forEach((d,di)=>{ const custom=(S.dayPpl[datumPre(di)]!=null); const ppl=custom?S.dayPpl[datumPre(di)]:stravniciList().length;
    const chips=rowSloty.map(s=>{ const on=slotyDna(di).indexOf(s)>=0; return `<span class="mchip${on?' on':''}" title="${s}" onclick="toggleDenSlot(${di},'${s}')">${ikony[s]||s[0]}</span>`; }).join("");
    h+=`<td data-d="${di}" class="ctrl ${tint(di)}"><div class="ppl"><button onclick="zmenDenPpl(${di},-1)">−</button><span class="pplnum${custom?' cust':''}" title="Počet stravníkov v tento deň (presné porcie sú pri každom jedle cez 👥 porcie)">👥 ${ppl}</span><button onclick="zmenDenPpl(${di},1)">+</button></div><div class="mchips">${chips}</div></td>`;
  });
  h+="</tr>";
  rowSloty.forEach(slot=>{
    h+=`<tr><td class="slotname">${slot}</td>`;
    DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);
      if(slotyDna(di).indexOf(slot)<0){ h+=`<td data-d="${di}" class="${tint(di)}"><div class="plan-cell vyp">vyp.</div></td>`; return; }
      if(ids.length){ let kc=0;
        const riadky=ids.map(cid=>{const k=komponent(cid); if(!k)return ""; kc+=kcalPorcia(k);
          const nm=k._priloha?`<span class="nm">+ ${k.nazov}</span>`:k._left?`<span class="nm" style="cursor:pointer" onclick="otvor('${k._srcId}')" title="Zvyšok — zobraziť recept">♻️ ${k.nazov} <small>(zvyšok)</small></span>`:`<span class="nm" style="cursor:pointer;text-decoration:underline" onclick="otvor('${cid}',{di:${di},slot:'${slot}'})" title="Zobraziť recept">${k.nazov}</span>`;
          return `<div style="display:flex;justify-content:space-between;gap:4px;align-items:start">${nm}<a onclick="odoberKomponent(${di},'${slot}','${cid}')" style="color:var(--warn);cursor:pointer" title="odobrať">✕</a></div>`;}).join("");
        h+=`<td data-d="${di}" class="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')"><div class="plan-cell" draggable="true" ondragstart="dragStart(event,${di},'${slot}')" title="Potiahni pre presun">${riadky}<span class="kc" style="cursor:pointer" title="Upraviť veľkosť porcie" onclick="upravFaktor(${di},'${slot}')">${Math.round(kc*f)} kcal ${fmtPct(f)} ✎</span><span style="display:flex;gap:14px;margin-top:2px"><span class="rm" style="color:var(--accent)" onclick="vyberDoPlanu(${di},'${slot}')">✎ zmeniť</span><span class="rm" style="color:var(--accent)" onclick="akcieSlotu(${di},'${slot}')" title="Doplnok, znova, porcie, zvyšok">⋯ viac</span></span></div></td>`;
      } else h+=`<td data-d="${di}" class="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')"><div class="plan-cell prazdne" onclick="vyberDoPlanu(${di},'${slot}')">+ pridať</div></td>`;
    });
    h+="</tr>";
  });
  const ciel=parseInt(S.profil.kcal)||0;
  h+='<tr class="suma"><td>Σ kcal/deň</td>';
  DNI.forEach((d,di)=>{ let sum=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); sum=Math.round(sum);
    if(!sum){ h+=`<td data-d="${di}"></td>`; return; }
    const st=stavCiel(sum,ciel); const over=ciel&&sum>ciel*1.1; const pct=ciel?Math.min(100,Math.round(sum/ciel*100)):0; // denný progress voči cieľu
    h+=`<td data-d="${di}" class="${over?'over':''}" title="${st.d?st.d+' kcal vs cieľ':''}"><span style="color:${st.c}">${sum}${ciel?'<span class="ciel-mini">/'+ciel+'</span>':''}</span>${over?" ⚠":""}${ciel?`<div class="kc-bar"><i style="width:${pct}%;background:${st.c||'var(--accent)'}"></i></div>`:""}</td>`; });
  h+="</tr>"; t.innerHTML=h; t.className="plan d"+planDen;
}
let dragSrc=null;
function dragStart(e,di,slot){ dragSrc={di,slot}; try{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text","x");}catch(_){} }
function dragOver(e){ e.preventDefault(); try{e.dataTransfer.dropEffect="move";}catch(_){} }
function dragDrop(e,di,slot){ e.preventDefault(); if(!dragSrc)return; if(!(dragSrc.di===di&&dragSrc.slot===slot)) presunSlot(dragSrc.di,dragSrc.slot,di,slot); dragSrc=null; }
function setSlotComp(di,slot,comp){ const dni=S.blokMode?blokDni(di):[di]; dni.forEach(d=>{ const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; if(comp&&comp.length)S.plan[iso][slot]=comp.slice(); else if(S.plan[iso])delete S.plan[iso][slot]; }); }
function presunSlot(fromDi,fromSlot,toDi,toSlot){ const a=slotIds(fromDi,fromSlot), b=slotIds(toDi,toSlot);
  setSlotComp(toDi,toSlot,a); setSlotComp(fromDi,fromSlot,b); save(); renderPlan(); }
let pickCiel=null;
function vyberDoPlanu(di,slot){ pickCiel={di,slot,blok:S.blokMode}; ukazKatPicker(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function pickRozsah(){ if(S.blokMode && pickCiel.blok){ const d=blokDni(pickCiel.di); return DNI[d[0]].slice(0,2)+"–"+DNI[d[d.length-1]].slice(0,2); } return DNI[pickCiel.di]; }
function ukazKatPicker(){
  const kats=[...new Set(RECEPTY.filter(r=>prejdeProfil(r)).map(r=>r.kategoria))];
  const odp=SLOT_KATEGORIE[pickCiel.slot]||[];
  kats.sort((a,b)=>((odp.includes(b)?1:0)-(odp.includes(a)?1:0)) || a.localeCompare(b,"sk"));
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Aké jedlo?</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  h+=`<div style="position:relative;margin-bottom:14px"><input id="pick-search" type="text" placeholder="🔍 Hľadať recept alebo surovinu…" oninput="pickSearchInput(this.value)" autocomplete="off" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:15px"><div id="pick-search-results" class="pick-dropdown"></div></div>`;
  if(S.blokMode) h+=`<label class="switch" style="margin-bottom:12px"><input type="checkbox" ${pickCiel.blok?"checked":""} onchange="pickCiel.blok=this.checked;document.querySelector('.modal .subx').textContent=pickRozsah()+' · '+pickCiel.slot"> Použiť na celý blok</label>`;
  h+='<div class="chips">';
  kats.forEach(k=>{ const zvyr=odp.includes(k); h+=`<span class="chip${zvyr?' active':''}" onclick="ukazReceptyKat('${k.replace(/'/g,"")}')">${ikony[k]||"🍴"} ${k}</span>`; });
  h+=`</div><div class="btn-row"><button class="btn" onclick="ukazReceptyKat('')">Zobraziť všetky recepty</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h;
}
// keď zhoda nie je v názve, ukáž ktorá ingrediencia sedí — inak výsledok vyzerá náhodne
function pickSurovina(r,qq){ if(bezDia(r.nazov).includes(qq)) return null;
  return (r.ingrediencie||[]).find(i=>bezDia(i.nazov).includes(qq)||obsahujeSurovinu(i.nazov,[qq])); }
function pickSearchRiadok(r,qq){ const ing=pickSurovina(r,qq);
  return `<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span><span class="kc">${ing?"🥕 "+ing.nazov+" · ":""}${r.kategoria}${r.kuchyna?" · "+r.kuchyna:""} · ${kcalPorcia(r)} kcal</span></div>`; }
function pickSearchInput(q){
  const box=document.getElementById("pick-search-results"); if(!box)return;
  q=q.trim();
  if(!q){ box.style.display="none"; box.innerHTML=""; return; }
  const qq=bezDia(q);
  // zhody v názve idú hore, až za nimi tie, čo sedia len ingredienciou
  const list=RECEPTY.filter(r=>prejdeProfil(r) && hladaSedi(r,qq))
    .sort((a,b)=>(bezDia(b.nazov).includes(qq)-bezDia(a.nazov).includes(qq)) || a.nazov.localeCompare(b.nazov,"sk")).slice(0,8);
  box.style.display="block";
  box.innerHTML = list.length ? list.map(r=>pickSearchRiadok(r,qq)).join("") : '<p class="info" style="padding:10px;margin:0">Nič sa nenašlo.</p>';
}
function ukazReceptyKat(kat){
  let list=RECEPTY.filter(r=>prejdeProfil(r) && (!kat||r.kategoria===kat)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk"));
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${kat||"Všetky recepty"}</h2><div class="subx"><span onclick="ukazKatPicker()" style="cursor:pointer;text-decoration:underline">← späť na typy jedál</span></div></div><div class="content2" style="max-height:60vh;overflow:auto">`;
  if(!list.length) h+='<p class="info">Žiadny recept v tejto kategórii.</p>';
  list.forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span><span class="kc">${r.kategoria}${r.kuchyna?" · "+r.kuchyna:""} · ${kcalPorcia(r)} kcal</span></div>`; });
  h+="</div>";
  document.getElementById("pick-modal").innerHTML=h;
}
function nastavPlan(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  const r=receptById(id); let comp=[id];
  { const pr=jeHlavnyChodSlot(c.slot)?prilohaPre(r,0):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(c.slot) && r && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  dni.forEach(di=>{ const iso=datumPre(di); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][c.slot]=comp.slice(); });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); }
function pridajKomponent(di,slot){ pickCiel={di,slot,blok:S.blokMode,pridat:true}; ukazDoplnok(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function ukazDoplnok(){ let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Pridať doplnok</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  h+='<div class="chips">'; Object.keys(PRILOHY).forEach(k=>{ h+=`<span class="chip" onclick="pridajDoplnok('${k}')">${PRILOHY[k].nazov}</span>`; });
  h+='</div><h4 class="sekcia">Alebo recept (príloha / šalát)</h4><div style="max-height:40vh;overflow:auto">';
  RECEPTY.filter(r=>["Príloha","Šalát","Nátierka","Pečivo"].includes(r.kategoria)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="pridajDoplnok('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span><span class="kc">${r.kategoria}</span></div>`; });
  h+="</div></div>"; document.getElementById("pick-modal").innerHTML=h; }
function pridajDoplnok(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  dni.forEach(di=>{ const iso=datumPre(di); S.plan[iso]=S.plan[iso]||{}; const cur=slotIds(di,c.slot); if(cur.indexOf(id)<0)cur.push(id); S.plan[iso][c.slot]=cur; });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); }
function odoberKomponent(di,slot,cid){ const dni=S.blokMode?blokDni(di):[di];
  dni.forEach(d=>{ const iso=datumPre(d); if(S.plan[iso]){ const cur=slotIds(d,slot).filter(x=>x!==cid); if(cur.length)S.plan[iso][slot]=cur; else delete S.plan[iso][slot]; } });
  rescaleDen(dni); save(); renderPlan(); }
// Leftovers: rozpíš navarené jedlo ako zvyšok do iného dňa/slotu (ráta do kcal, nie do nákupu)
function pridajZvysok(di,slot){
  const src=slotIds(di,slot).map(cid=>komponent(cid)).find(k=>k && !k._priloha && !k._left);
  if(!src){ toast("Tu nie je jedlo, z ktorého by bol zvyšok."); return; }
  const srcId=src._srcId||src.id;
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>♻️ Zvyšok</h2><div class="subx">${src.nazov} → kam ho rozpísať?</div></div><div class="content2">`;
  for(let d=0;d<7;d++){ const sl=slotyDna(d); if(!sl.length)continue;
    h+=`<div class="sp-row" style="flex-wrap:wrap;gap:6px"><span style="min-width:60px"><b>${DNI[d].slice(0,2)}</b></span><span style="display:flex;gap:6px;flex-wrap:wrap">`;
    sl.forEach(s=>{ const same=(d===di&&s===slot); h+=`<button class="mini" ${same?"disabled":""} onclick="umiestniZvysok('${srcId}',${d},'${s}')">${ikony[s]||""} ${s}</button>`; });
    h+="</span></div>"; }
  h+='<p class="info" style="margin-top:10px">Zvyšok sa ráta do kalórií daného dňa, ale nepridáva sa do nákupu (navaríš raz).</p></div>';
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function umiestniZvysok(srcId,di,slot){ const iso=datumPre(di); S.plan[iso]=S.plan[iso]||{}; const cur=slotIds(di,slot); cur.push("left:"+srcId); S.plan[iso][slot]=cur; save(); zavriPick(); renderPlan(); }
function regenerujSlot(di,slot){ const dni=S.blokMode?blokDni(di):[di];
  const pouzite=new Set(); for(let d=0;d<7;d++) SLOTY().forEach(sl=>slotIds(d,sl).forEach(id=>pouzite.add(id)));
  const nedavne=new Set(S.uvarene.slice(0,4).map(u=>u.id)), kf=filterKuchynaPreDen(dni[0]), pr=pravidloPreDen(dni[0]);
  let pool=poolPreSlot(slot).filter(r=>!nedavne.has(r.id)); if(!pool.length)pool=poolPreSlot(slot);
  if(kf && slot!=="Raňajky"){ const pk=pool.filter(r=>(r.kuchyna||"").toLowerCase()===kf.toLowerCase()); if(pk.length)pool=pk; }
  if(pr&&pr.veg){ const pv=pool.filter(r=>diety(r).veg); if(pv.length)pool=pv; }
  if(pr&&pr.maxCas>0){ const pc=pool.filter(r=>casMin(r)<=pr.maxCas); if(pc.length)pool=pc; }
  if(slot==="Raňajky" && dni.every(d=>d<5)){ const ps=pool.filter(r=>jeSendvic(r)); if(ps.length)pool=ps; }
  const r=vyberVazene(pool,pouzite); if(!r)return;
  let comp=[r.id];
  { const pr=jeHlavnyChodSlot(slot)?prilohaPre(r,Math.floor(Math.random()*3)):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  dni.forEach(d=>{ const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][slot]=comp.slice(); });
  rescaleDen(dni); save(); renderPlan(); }
function zavriPick(){ document.getElementById("pick-overlay").classList.remove("open"); _zahodHistoriuModalu(); }
document.getElementById("pick-overlay").addEventListener("click",e=>{if(e.target.id==="pick-overlay")zavriPick();});
// nahradí obsah PRÁVE ZOBRAZENÉHO týždňa (7 dátumov od S.viewOd) šablónou indexovanou 0-6 (z archívu/JEDALNICKY) — S.plan mimo tohto rozsahu (iné týždne) sa nedotkne
function nacitajSablonuDoTyzdna(planTpl,planFTpl){ for(let di=0;di<7;di++){ const iso=datumPre(di);
  if(planTpl&&planTpl[di])S.plan[iso]=planTpl[di]; else delete S.plan[iso];
  if(planFTpl&&planFTpl[di])S.planF[iso]=planFTpl[di]; else delete S.planF[iso]; } }
async function vymazPlan(){ if(await confirmModal("Vyprázdniť tento týždenný plán?")){ nacitajSablonuDoTyzdna({},{}); save(); renderPlan(); } }
async function skopirujMinuly(){ const a=(S.archiv||[]).slice(); if(!a.length){ toast("Zatiaľ nemáš uložený žiadny týždeň. Ulož si aktuálny cez ⋯ Viac → Uložiť tento plán."); return; }
  const j=a[0]; if(!await confirmModal(`Skopírovať posledný uložený týždeň „${j.nazov||j.id}"? Prepíše sa tento týždeň.`))return;
  nacitajSablonuDoTyzdna(j.plan||{},j.planF||{}); if(j.ciel_kcal)S.profil.kcal=j.ciel_kcal; save(); renderPlan(); }
function pridajDoPlanu(id){ const r=receptById(id); if(!r)return; zavri();
  const slot=slotPreKategoriu(r.kategoria); const dni=["Po","Ut","St","Št","Pi","So","Ne"]; const sloty=SLOTY();
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Do plánu: ${r.nazov}</h2></div><div class="content2">
    <div class="field"><label>Deň</label><select class="f" id="pdp-den">${dni.map((d,i)=>`<option value="${i}">${d}</option>`).join("")}</select></div>
    <div class="field"><label>Jedlo (slot)</label><select class="f" id="pdp-slot">${sloty.map(s=>`<option ${s===slot?"selected":""}>${s}</option>`).join("")}</select></div>
    <p class="info">Pridá sa na prvé miesto slotu${S.blokMode?" (na celý blok)":""}.</p>
    <div class="btn-row"><button class="btn primary" onclick="ulozDoPlanu('${id}')">📅 Pridať do plánu</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function ulozDoPlanu(id){ const di=parseInt(document.getElementById("pdp-den").value)||0; const slot=document.getElementById("pdp-slot").value; const r=receptById(id); if(!r)return;
  let comp=[id];
  { const pr=jeHlavnyChodSlot(slot)?prilohaPre(r,0):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  const cur=slotIds(di,slot).filter(x=>!comp.includes(x)); const nove=comp.concat(cur);
  const dni=S.blokMode?blokDni(di):[di]; dni.forEach(d=>{ const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][slot]=nove.slice(); });
  rescaleDen(dni); save(); zavriPick(); prepni("planovac"); }
// A7: skutočné triedy raňajok. Predtým všetko nesendvičové vrátilo unikát ("iná:id"),
// takže dedup báz nerobil nič a týždeň mohol byť 5× ovsená kaša.
function ranajkyBaza(r){ const s=bezDia(r.nazov+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+((r.tagy||[]).join(" ")));
  if(/tortill|wrap|burrito|quesadill/.test(s)) return "tortilla";
  if(/bagel/.test(s)) return "bagel";
  if(/baget|panini|ciabatt|focacc/.test(s)) return "bageta";
  if(/toast|hrianka|sendvic|chlebik/.test(s)) return "toast";
  if(/rozok|zeml|kaizer|croissant|buchta|vecka/.test(s)) return "rožok";
  // najprv FORMA jedla (lievance, praženica), až potom surovina (ovsené vločky) —
  // inak sú „Ovsené lievance" kaša a dedup báz si myslí, že si mal 3× to isté
  if(/palacink|lievanc|vafl|plack|trhanec/.test(s)) return "palacinky";
  if(/vajc|vajic|omelet|prazenic|shakshuk|volsk/.test(s)) return "vajcia";
  if(/smoothie|shake|koktail|bowl/.test(s)) return "smoothie";
  if(/ovsen|kasa|musli|granola|porridge|jahl|chia/.test(s)) return "kaša";
  if(/jogurt|skyr|tvaroh|cottage|kefir/.test(s)) return "jogurt";
  if(/natierk|pomazank|hummus|pate/.test(s)) return "nátierka";
  return "iná:"+r.id; }
function poolPreSlot(slot){
  let pool=RECEPTY.filter(r=>prejdeProfil(r));
  const kats=SLOT_KATEGORIE[slot]||[];
  let p=pool.filter(r=>kats.includes(r.kategoria));
  if(p.length) return p;
  return pool.filter(r=>r.kategoria!=="Kokteil"&&r.kategoria!=="Nápoj");
}
function akcieTokens(){ return (S.akcie||"").toLowerCase().split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); }
function jeVakcii(r){ const t=akcieTokens(); if(!t.length)return false; return (r.ingrediencie||[]).some(i=>{const n=i.nazov.toLowerCase(); return t.some(x=>n.includes(x));}); }
function ingVakcii(nazov){ const t=akcieTokens(); if(!t.length)return false; const n=nazov.toLowerCase(); return t.some(x=>n.includes(x)); }
function watchTokens(){ return (S.profil.watch||"").toLowerCase().split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); }
function jeWatch(r){ const t=watchTokens(); if(!t.length)return false; return (r.ingrediencie||[]).some(i=>{const n=i.nazov.toLowerCase();return t.some(x=>n.includes(x));}); }
// g bielkovín na 100 kcal — hlavné kritérium kvality receptu (HS_HI=10 je „veľa")
function bielkovinyNa100(r){ const v=vyzivaReceptu(r); return v.kcal>5 ? v.b/(v.kcal/100) : 0; }
// A2: bielkoviny sú MULTIPLIKÁTOR váhy, nie prirážka +0,5 pri zapnutom cieli. Predtým mal celý pool
// v auguste len dve váhy a medián dňa bol 66 g bielkovín oproti cieľu ~109 g.
function vahaReceptu(r,slot){ let w=1+(S.hodn[r.id]||0); if(jeSezonne(r))w+=0.8; if(jeVakcii(r))w+=1.2; if(jeWatch(r))w+=1.0; w+=expBoost(r);
  // pri malom jedle (snack) je bielkovinový bonus miernejší — inak sa z 351 snackov točí 16 tvarohových
  w*= (slot==="Snack") ? (0.8+Math.min(0.8,bielkovinyNa100(r)/12)) : (0.4+Math.min(1.6,bielkovinyNa100(r)/HS_HI));
  // A5: „kupované" je preferencia, nie podmienka (tvrdý filter zúžil pool snackov z 351 na 36)
  if(slot==="Snack" && S.profil.kupSnack && (r.tagy||[]).includes("kupované")) w*=2;
  return Math.max(0.02,w); }
function vyberVazene(pool,pouzite,slot){
  let cand=pool.filter(r=>!pouzite.has(r.id)); if(!cand.length)cand=pool.slice(); if(!cand.length)return null;
  const vahy=cand.map(r=>vahaReceptu(r,slot));
  let sum=vahy.reduce((a,w)=>a+w,0), x=Math.random()*sum;
  for(let i=0;i<cand.length;i++){ x-=vahy[i]; if(x<=0)return cand[i]; } return cand[0];
}
// ── A1: kcal-okná na slot ─────────────────────────────────────────────────────
// Cieľ dňa sa rozdelí medzi jedlá podľa podielov; z toho vzniká okno, v ktorom sa recept vôbec hľadá.
// Predtým sa cieľ trafil až dodatočným natiahnutím porcií (faktor 0,55–1,95×).
const SLOT_PODIEL={"Raňajky":0.25,"Desiata":0.10,"Obed":0.35,"Olovrant":0.10,"Večera":0.30,"Snack":0.10};
const OKNO_DOLE=0.6, OKNO_HORE=1.45, MIN_POOL=8, MIN_KCAL_HLAVNY=300;
function cielSlotu(slot,sloty,ciel){
  const suma=(sloty||[]).reduce((a,s)=>a+(SLOT_PODIEL[s]||0.1),0)||1;
  return ciel*(SLOT_PODIEL[slot]||0.1)/suma; }
// zúž pool na recepty okolo cieľovej kcal; okno rozširuj, kým nemáš aspoň MIN_POOL kandidátov
function poolVOkne(pool,cielK,dole,hore){
  if(!(cielK>0)||!pool.length) return pool;
  let d=dole||OKNO_DOLE, h=hore||OKNO_HORE;
  for(let i=0;i<8;i++){
    const p=pool.filter(r=>{ const k=kcalPorcia(r); return k>=cielK*d && k<=cielK*h; });
    if(p.length>=MIN_POOL) return p;
    d*=0.75; h*=1.35;
  }
  return pool; }
const CARB_PRILOHY=["prf:ryza","prf:zemiaky","prf:cestoviny"];
const ASIJSKE=["japonská","japonska","čínska","cinska","thajská","thajska","ázijská","azijska","kórejská","korejska","vietnamská","vietnamska","indická","indicka"];
function vyberPrilohu(kuchyna,rot){ const k=(kuchyna||"").toLowerCase(); if(ASIJSKE.some(a=>k.includes(a)))return "prf:ryza"; return CARB_PRILOHY[rot%CARB_PRILOHY.length]; }
function filterKuchynaPreDen(di){ const f=(S.genCfg.filtre||[]).find(x=>di>=x.od&&di<=x.do&&x.kuchyna); return f?f.kuchyna:null; }
function pravidloPreDen(di){ const fs=(S.genCfg.filtre||[]).filter(x=>di>=x.od&&di<=x.do); if(!fs.length)return null;
  const veg=fs.some(f=>f.veg); const casy=fs.map(f=>f.maxCas).filter(c=>c>0); const maxCas=casy.length?Math.min(...casy):0;
  return (veg||maxCas>0)?{veg,maxCas}:null; }
// A6: pamäť medzi týždňami — nielen história varenia, ale aj minulý zobrazený týždeň a posledný archív.
// Bez toho sa v 11 z 29 dvojíc susedných týždňov zopakoval recept.
// Hlavné chody majú užší pool (429 nad 300 kcal), snacky široký (351) — preto sa snack nesmie
// vrátiť oveľa dlhšie, inak sa z celej sekcie točí desať tvarohov.
const TYZDNE_PAMATE=4, TYZDNE_PAMATE_SNACK=26;
function nedavneRecepty(tyzdnov){
  const set=new Set(S.uvarene.slice(0,4).map(u=>u.id));
  const pridaj=v=>(Array.isArray(v)?v:[v]).forEach(id=>{ if(typeof id!=="string")return;
    set.add(id.indexOf("left:")===0?id.slice(5):id); });
  for(let di=-(tyzdnov||TYZDNE_PAMATE)*7;di<0;di++){ const d=S.plan[pridajDni(S.viewOd,di)]; if(d) Object.values(d).forEach(pridaj); }
  const a0=(S.archiv||[])[0]; if(a0&&a0.plan) Object.values(a0.plan).forEach(d=>Object.values(d||{}).forEach(pridaj));
  return set;
}
// jeden výber do slotu; ctx nesie filtre a pamäť bloku. cielK = stred kcal-okna.
function vyberDoSlotu(slot,ctx,cielK,minB100){
  const pamat=(slot==="Snack"||slot==="Desiata"||slot==="Olovrant")?ctx.nedavneSnack:ctx.nedavne;
  let pool=poolPreSlot(slot).filter(r=>!pamat.has(r.id)); if(!pool.length)pool=poolPreSlot(slot);
  // A3: hlavný chod pod 300 kcal je večera za 28 kcal (Kórejský uhorkový šalát), nie jedlo
  if(jeHlavnyChodSlot(slot)){ const p=pool.filter(r=>kcalPorcia(r)>=MIN_KCAL_HLAVNY); if(p.length>=MIN_POOL)pool=p; }
  if(ctx.kf && slot!=="Raňajky"){ const pk=pool.filter(r=>(r.kuchyna||"").toLowerCase()===ctx.kf.toLowerCase()); if(pk.length)pool=pk; }
  if(ctx.pr&&ctx.pr.veg){ const pv=pool.filter(r=>diety(r).veg); if(pv.length)pool=pv; }
  if(ctx.pr&&ctx.pr.maxCas>0){ const pc=pool.filter(r=>casMin(r)<=ctx.pr.maxCas); if(pc.length)pool=pc; }
  if(ctx.cfg.neMasoZaSebou && jeHlavnyChodSlot(slot) && ctx.prevBlokMaso.size){ const pm=pool.filter(r=>{const mt=masoTyp(r); return !mt||!ctx.prevBlokMaso.has(mt);}); if(pm.length)pool=pm; }
  if(slot==="Raňajky"){ if(ctx.vsednyBlok){ const ps=pool.filter(r=>jeSendvic(r)); if(ps.length)pool=ps; }
    const p2=pool.filter(r=>!ctx.pouziteBazy.has(ranajkyBaza(r))); if(p2.length)pool=p2; }
  else { const p2=pool.filter(r=>!r.kuchyna||!ctx.dayKuchyne.has(r.kuchyna)); if(p2.length)pool=p2; }
  if(minB100>0){ const pb=pool.filter(r=>bielkovinyNa100(r)>=minB100); if(pb.length>=3)pool=pb; }
  pool=poolVOkne(pool,cielK);
  return vyberVazene(pool,ctx.pouzite,slot);
}
// zloží komponenty slotu (hlavné jedlo + príloha) a zapíše si do ctx, čo už bolo použité
function zlozSlot(r,slot,ctx){
  ctx.pouzite.add(r.id);
  if(slot==="Raňajky")ctx.pouziteBazy.add(ranajkyBaza(r)); else if(r.kuchyna)ctx.dayKuchyne.add(r.kuchyna);
  const mt=masoTyp(r); if(mt && jeHlavnyChodSlot(slot))ctx.blokMaso.add(mt);
  const comp=[r.id];
  if(jeHlavnyChodSlot(slot)){ const pr=prilohaPre(r,ctx.prilRot++); if(pr)comp.push(pr); }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  return comp;
}
// A1/A2/A3: namiesto naťahovania porcií prehoď jedlo. potrebaK = koľko kcal má slot mať.
function prehodSlot(denPlan,slot,ctx,potrebaK,minB100){
  const stary=denPlan[slot]&&denPlan[slot][0];
  if(stary)ctx.pouzite.delete(stary);
  const r=vyberDoSlotu(slot,ctx,potrebaK,minB100);
  if(!r || r.id===stary){ if(stary)ctx.pouzite.add(stary); return false; }
  denPlan[slot]=zlozSlot(r,slot,ctx);
  return true;
}
const PORADIE_SLOTOV=["Obed","Večera","Raňajky","Desiata","Olovrant","Snack"]; // od najväčšieho jedla po najmenšie
function denKcal(denPlan,sloty){ let dk=0; sloty.forEach(s=>{ if(denPlan[s])dk+=mealKcal(denPlan[s]); }); return dk; }
function denBielkoviny(denPlan,sloty){ let b=0; sloty.forEach(s=>(denPlan[s]||[]).forEach(id=>{ const k=komponent(id); if(k)b+=vyzivaReceptu(k).b; })); return b; }
function denJeOk(denPlan,sloty,ciel){
  const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length); if(!napln.length) return true;
  const dk=denKcal(denPlan,sloty);
  if(ciel>0&&dk>0){ const p=ciel/dk; if(p>FAKTOR_MAX||p<FAKTOR_MIN) return false; }
  const kc={}; napln.forEach(s=>{ kc[s]=mealKcal(denPlan[s]); });
  const por=PORADIE_SLOTOV.filter(s=>kc[s]!=null);
  for(let i=1;i<por.length;i++) if(kc[por[i]]>=kc[por[i-1]]) return false;
  return true; }
// A2: keď je deň inak v poriadku, ešte skús vymeniť najslabší slot za bielkovinovejší.
// Zmena sa ponechá len vtedy, keď deň zostane platný a bielkovín naozaj pribudne.
function zlepsiBielkoviny(denPlan,sloty,ctx,ciel){
  const cielB=(cieloveMakra(ciel)||{}).b||0; if(!cielB) return;
  const vzdane=new Set(); // slot, na ktorom sa výmena nepodarila — skús ďalší v poradí zisku
  for(let i=0;i<16;i++){
    const b=denBielkoviny(denPlan,sloty); if(b>=cielB) return;
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length&&!vzdane.has(s));
    // vyber slot s najväčším POTENCIÁLOM zisku (kcal × koľko bielkovín mu chýba do HS_HI),
    // nie ten s najhorším pomerom — inak sa vymieňa stále ten istý 145 kcal snack
    let naj=null,najB=0,najZisk=0;
    napln.forEach(s=>{ const k=komponent(denPlan[s][0]); if(!k)return;
      const x=bielkovinyNa100(k), zisk=mealKcal(denPlan[s])*Math.max(0,HS_HI-x)/100;
      if(zisk>najZisk){ najZisk=zisk; najB=x; naj=s; } });
    if(!naj) return;
    const zaloha=denPlan[naj].slice(), stary=zaloha[0];
    if(!prehodSlot(denPlan,naj,ctx,mealKcal(zaloha),najB+1)){ vzdane.add(naj); continue; }
    if(denJeOk(denPlan,sloty,ciel) && denBielkoviny(denPlan,sloty)>b) continue;
    ctx.pouzite.delete(denPlan[naj][0]); denPlan[naj]=zaloha; ctx.pouzite.add(stary); // späť
    vzdane.add(naj);
  } }
// Oprava dňa: kcal → poradie jedál → bielkoviny. Každý krok rieši JEDEN slot a začne odznova.
function opravDen(denPlan,sloty,ctx,ciel){
  const cielB=(cieloveMakra(ciel)||{}).b||0;
  for(let iter=0;iter<24;iter++){
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length);
    if(!napln.length) return;
    const kcal={}; let dk=0;
    napln.forEach(s=>{ kcal[s]=mealKcal(denPlan[s]); dk+=kcal[s]; });
    // (a) kcal dňa mimo ±15 % → prehoď slot s najväčšou odchýlkou od svojho podielu
    if(ciel>0 && dk>0){
      const pomer=ciel/dk;
      if(pomer>FAKTOR_MAX || pomer<FAKTOR_MIN){
        let worst=null,worstD=0;
        napln.forEach(s=>{ const c=cielSlotu(s,napln,ciel); const d=(kcal[s]-c)/c*(pomer<1?1:-1);
          if(d>worstD){ worstD=d; worst=s; } });
        if(worst && prehodSlot(denPlan,worst,ctx,kcal[worst]+(ciel-dk))) continue;
      }
    }
    // (b) poradie jedál: Obed ≥ Večera > Raňajky > Snack
    const por=PORADIE_SLOTOV.filter(s=>kcal[s]!=null);
    if(denPlan.Obed && denPlan.Večera && kcal["Večera"]>kcal["Obed"]){
      const t=denPlan.Obed; denPlan.Obed=denPlan.Večera; denPlan.Večera=t; continue; // Obed a Večera majú rovnaké kategórie
    }
    let zleI=-1;
    for(let i=1;i<por.length;i++){ if(kcal[por[i]]>=kcal[por[i-1]]){ zleI=i; break; } }
    if(zleI>=0){
      const maly=por[zleI], velky=por[zleI-1];
      // menšie jedlo zmenši tesne pod väčšie; ak sa nedá, skús zväčšiť to väčšie
      if(prehodSlot(denPlan,maly,ctx,Math.max(60,kcal[velky]*0.75))) continue;
      if(prehodSlot(denPlan,velky,ctx,kcal[maly]*1.35)) continue;
    }
    // (c) bielkoviny dňa pod 80 % cieľa → prehoď slot s najhorším pomerom bielkovín
    if(cielB>0){
      let db=0; napln.forEach(s=>(denPlan[s]||[]).forEach(id=>{ const k=komponent(id); if(k)db+=vyzivaReceptu(k).b; }));
      if(db<cielB*0.8){
        let naj=null,najB=1e9;
        napln.forEach(s=>{ const k=komponent(denPlan[s][0]); if(!k)return; const b=bielkovinyNa100(k); if(b<najB){najB=b;naj=s;} });
        if(naj && prehodSlot(denPlan,naj,ctx,kcal[naj],Math.max(HS_LO,najB+2))) continue;
      }
    }
    return; // deň je v poriadku
  }
}
async function generujJedalnicek(zamiesaj){
  const cfg=S.genCfg||{}; const zachovat=!!cfg.zachovat;
  const naplnene=[0,1,2,3,4,5,6].map(datumPre).some(iso=>S.plan[iso]&&Object.keys(S.plan[iso]).length);
  if(naplnene && !zamiesaj && !zachovat && !await confirmModal("Vygenerovať nový jedálniček? Prepíše sa tento týždeň.")) return;
  const pouzite=new Set(), pouziteBazy=new Set(), nedavne=nedavneRecepty(), nedavneSnack=nedavneRecepty(TYZDNE_PAMATE_SNACK), plan={}, planF={};
  const ciel=cfg.cielMode?(S.profil.kcal||0):0;
  if(zachovat){ for(let di=0;di<7;di++) slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(id=>pouzite.add(id))); }
  const skupiny = S.blokMode ? bloky() : [[0],[1],[2],[3],[4],[5],[6]];
  let prilRot=0, prevBlokMaso=new Set();
  skupiny.forEach(dni=>{
    // B7: masku slotov ber ako ZJEDNOTENIE dní bloku — inak stačí mať preč prvý deň
    // a celý blok zostane bez jedla. Do konkrétneho dňa sa potom zapíšu len jeho vlastné sloty.
    const sloty=VSETKY_SLOTY.filter(s=>dni.some(d=>slotyDna(d).includes(s)));
    const ctx={ cfg, pouzite, pouziteBazy, nedavne, nedavneSnack, dayKuchyne:new Set(), blokMaso:new Set(), prevBlokMaso,
      kf:filterKuchynaPreDen(dni[0]), pr:pravidloPreDen(dni[0]), vsednyBlok:dni.every(d=>d<5), prilRot };
    const denPlan={};
    if(zachovat){ sloty.forEach(sl=>{ const d0=dni.find(d=>slotIds(d,sl).length); if(d0==null)return; const ex=slotIds(d0,sl); denPlan[sl]=ex.slice(); const r0=komponent(ex[0]); if(r0&&r0.kuchyna)ctx.dayKuchyne.add(r0.kuchyna); }); }
    sloty.forEach(slot=>{ if(denPlan[slot])return;
      const r=vyberDoSlotu(slot,ctx,cielSlotu(slot,sloty,ciel));
      if(r) denPlan[slot]=zlozSlot(r,slot,ctx); });
    if(ciel>0){ opravDen(denPlan,sloty,ctx,ciel); zlepsiBielkoviny(denPlan,sloty,ctx,ciel); }
    else if(denPlan.Obed && denPlan.Večera && mealKcal(denPlan.Večera)>mealKcal(denPlan.Obed)){ const t=denPlan.Obed; denPlan.Obed=denPlan.Večera; denPlan.Večera=t; }
    prilRot=ctx.prilRot;
    let fac=1;
    if(ciel>0){ let dk=0; sloty.forEach(s=>{ if(denPlan[s])dk+=mealKcal(denPlan[s]); }); if(dk>0) fac=Math.max(FAKTOR_MIN,Math.min(FAKTOR_MAX,Math.round(ciel/dk*20)/20)); }
    dni.forEach(di=>{ const sd=slotyDna(di); plan[di]={}; planF[di]={};
      sd.forEach(s2=>{ if(denPlan[s2]){ plan[di][s2]=denPlan[s2].slice(); if(fac!==1)planF[di][s2]=fac; } }); });
    prevBlokMaso=ctx.blokMaso;
  });
  nacitajSablonuDoTyzdna(plan,planF); save(); renderPlan();
  if(document.getElementById("v-domov").classList.contains("active"))renderDash();
}
function kuchyneList(){ return [...new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"sk")); }
// Dotazník generovania — jedno okno, prednačíta z profilu, každá zmena píše priamo do S.profil/S.genCfg.
function otvorGen(){ renderGenWizard(); }
// Onboarding — ľahký privítač pri prvom spustení (reuse handlerov stravníkov/profilu)
function onboardingModal(){ normStravnici(); const l=stravniciList();
  const ct=S.profil.cielTyp||"udrzanie"; const opt=(v,t)=>`<option value="${v}" ${ct===v?"selected":""}>${t}</option>`;
  const IST="padding:8px;border:1px solid var(--line);border-radius:8px";
  const h=`<div class="hero"><button class="close" onclick="dokonciOnboarding();zavriPick()">✕</button><h2>👋 Vitaj v kuchárke</h2><p class="info" style="margin:4px 0 0;color:rgba(255,255,255,.85)">Pár vecí na začiatok — všetko sa dá zmeniť v Nastaveniach.</p></div><div class="content2">
    <h4 class="sekcia">👥 Pre koho varíš?</h4>
    ${l.map((p,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px"><input value="${escHtml(p.nazov||"")}" onchange="zmenStravnika(${i},'nazov',this.value)" placeholder="meno" style="flex:1;${IST}"><input type="number" value="${p.kcal||""}" onchange="zmenStravnika(${i},'kcal',this.value)" title="kcal/deň" style="width:110px;${IST}">${l.length>1?`<a onclick="zmazStravnika(${i});onboardingModal()" style="color:var(--warn);cursor:pointer;align-self:center" title="odobrať">✕</a>`:""}</div>`).join("")}
    <button class="btn ghost" onclick="pridajStravnika();onboardingModal()">+ Pridať stravníka</button>
    <h4 class="sekcia">🎯 Tvoj cieľ</h4>
    <div class="field"><label>Zámer</label><select class="f" onchange="S.profil.cielTyp=this.value;save()">${opt("udrzanie","Udržať váhu")}${opt("chudnutie","Chudnutie")}${opt("priberanie","Priberanie")}</select></div>
    <div class="field"><label>Cieľ kcal / deň (hlavný stravník)</label><input type="number" value="${S.profil.kcal}" onchange="S.profil.kcal=parseInt(this.value)||1450;save()" style="width:130px;${IST}"></div>
    <p class="info">Presný výpočet (TDEE) nájdeš v ⚙️ Nastaveniach.</p>
    <h4 class="sekcia">🥗 Máš nejaké obmedzenia?</h4>
    <label class="switch"><input type="checkbox" ${S.profil.ryby?"checked":""} onchange="S.profil.ryby=this.checked;save()"> Nejem ryby</label>
    <label class="switch"><input type="checkbox" ${S.profil.lepok?"checked":""} onchange="S.profil.lepok=this.checked;save()"> Bez lepku</label>
    <label class="switch"><input type="checkbox" ${S.profil.mlieko?"checked":""} onchange="S.profil.mlieko=this.checked;save()"> Bez laktózy</label>
    <div class="btn-row" style="margin-top:18px;justify-content:space-between"><button class="btn ghost" onclick="dokonciOnboarding();zavriPick()">Preskočiť</button><button class="btn primary" onclick="dokonciOnboarding();zavriPick();prepni('planovac');generujJedalnicek(true)">✨ Zostaviť prvý jedálniček</button></div>
  </div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function dokonciOnboarding(){ S.profil.onboarded=true; save(); }
function genWEsc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;"); }
function renderGenWizard(){ const cfg=S.genCfg; const dni=["Po","Ut","St","Št","Pi","So","Ne"]; const kuch=kuchyneList();
  normStravnici(); const l=stravniciList();
  const ct=S.profil.cielTyp||"udrzanie"; const opt=(v,t)=>`<option value="${v}" ${ct===v?"selected":""}>${t}</option>`;
  const popisPr=f=>[f.kuchyna,(f.veg?"bezmäso":""),(f.maxCas>0?("do "+f.maxCas+" min"):"")].filter(Boolean).join(" · ")||"(bez podmienky)";
  const fh=(cfg.filtre||[]).map((f,i)=>`<div class="sp-row"><span>${dni[f.od]}–${dni[f.do]}: <b>${popisPr(f)}</b></span><a onclick="zmazGenFilter(${i})" style="color:var(--warn);cursor:pointer">✕</a></div>`).join("")||'<p class="info">Zatiaľ žiadne pravidlá.</p>';
  const denOpts=sel=>dni.map((d,i)=>`<option value="${i}" ${i===sel?"selected":""}>${d}</option>`).join("");
  const tp=S.tyzdenProfil[S.viewOd]||{};
  const c=`
    <h4 class="sekcia">📆 Tento týždeň (${fmtD(S.viewOd)}–${fmtD(pridajDni(S.viewOd,6))})</h4>
    <div class="field"><label>Koľko ľudí tento týždeň (prázdne = ako obvykle)</label><input type="number" min="1" value="${tp.ludia||""}" placeholder="${stravniciList().length}" onchange="nastavTyzdenLudia(this.value)" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>
    <div class="field"><label>Dni bez varenia (preč — hostia inde, dovolenka a pod.)</label><div class="chips">${dni.map((d,i)=>`<span class="chip${(tp.prec||[]).includes(i)?" active":""}" onclick="toggleTyzdenPrec(${i})">${d}</span>`).join("")}</div></div>
    <h4 class="sekcia">👥 Stravníci</h4>
    ${l.map((p,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px"><input value="${(p.nazov||"").replace(/"/g,"")}" onchange="zmenStravnika(${i},'nazov',this.value)" placeholder="meno" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" value="${p.kcal||""}" onchange="zmenStravnika(${i},'kcal',this.value)" title="kcal/deň" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px">${l.length>1?`<a onclick="zmazStravnika(${i});renderGenWizard()" style="color:var(--warn);cursor:pointer;align-self:center" title="odobrať">✕</a>`:""}</div>`).join("")}
    <button class="btn ghost" onclick="pridajStravnika();renderGenWizard()">+ Pridať stravníka</button>

    <h4 class="sekcia">🎯 Cieľ</h4>
    <div class="field"><label>Zámer</label><select class="f" onchange="S.profil.cielTyp=this.value;save()">${opt("udrzanie","Udržať váhu")}${opt("chudnutie","Chudnutie")}${opt("priberanie","Priberanie")}</select></div>
    <div class="field"><label>Cieľ kcal / deň (hlavný stravník)</label><input type="number" value="${S.profil.kcal}" onchange="S.profil.kcal=parseInt(this.value)||1450;save()" style="width:130px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>
    <label class="switch"><input type="checkbox" ${cfg.cielMode?"checked":""} onchange="S.genCfg.cielMode=this.checked;save()"> Dorovnať dni na cieľ (upraví veľkosť porcií)</label>

    <h4 class="sekcia">🥗 Diéty a suroviny</h4>
    <label class="switch"><input type="checkbox" ${S.profil.ryby?"checked":""} onchange="S.profil.ryby=this.checked;save()"> Nejem ryby</label>
    <label class="switch"><input type="checkbox" ${S.profil.lepok?"checked":""} onchange="S.profil.lepok=this.checked;save()"> Bez lepku</label>
    <label class="switch"><input type="checkbox" ${S.profil.mlieko?"checked":""} onchange="S.profil.mlieko=this.checked;save()"> Bez laktózy</label>
    <div class="field"><label>Zakázané suroviny (nikdy, oddeľ čiarkou)</label><textarea onchange="S.profil.zakazane=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${genWEsc(S.profil.zakazane)}</textarea></div>
    <div class="field"><label>Chcem uprednostniť / spotrebovať</label><textarea onchange="S.profil.watch=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${genWEsc(S.profil.watch)}</textarea></div>
    <div class="field"><label>Min. bielkovín / deň (0 = neriešiť)</label><input type="number" value="${S.profil.biel||0}" onchange="S.profil.biel=parseInt(this.value)||0;save()" style="width:130px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>

    <h4 class="sekcia">🍳 Kuchyne a pravidlá</h4>
    <label class="switch"><input type="checkbox" ${cfg.zachovat?"checked":""} onchange="S.genCfg.zachovat=this.checked;save()"> Zachovať už naplánované jedlá (kotvy)</label>
    <label class="switch"><input type="checkbox" ${cfg.neMasoZaSebou?"checked":""} onchange="S.genCfg.neMasoZaSebou=this.checked;save()"> Nevariť rovnaké mäso v dvoch blokoch po sebe</label>
    <label class="switch"><input type="checkbox" ${S.profil.kupSnack!==false?"checked":""} onchange="S.profil.kupSnack=this.checked;save()"> Kupované snacky (nemusím ich variť)</label>
    <div class="field"><label>Suroviny v akcii (uprednostní ich)</label><textarea onchange="S.akcie=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${genWEsc(S.akcie)}</textarea></div>
    <div class="field"><label>Pravidlo pre rozsah dní (kuchyňa / bezmäso / čas)</label>
    <div class="controls" style="align-items:center;flex-wrap:wrap">
      <select class="f" id="gf-od">${denOpts(0)}</select><span>–</span><select class="f" id="gf-do">${denOpts(6)}</select>
      <select class="f" id="gf-kuch"><option value="">(kuchyňa: ľubovoľná)</option>${kuch.map(k=>`<option>${k}</option>`).join("")}</select>
      <label class="switch" style="margin:0"><input type="checkbox" id="gf-veg"> bezmäso</label>
      <input type="number" id="gf-cas" placeholder="do min" style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">
      <button class="btn" onclick="pridajGenFilter()">+ Pridať pravidlo</button></div>
    <div id="gf-list" style="margin-top:8px">${fh}</div></div>`;
  const nav=`<div class="btn-row" style="margin-top:16px"><button class="btn primary" onclick="zavriPick();generujJedalnicek(true);prepni('planovac')">✨ Generovať</button></div>`;
  const h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>✨ Zostaviť jedálniček</h2><p class="info" style="margin:4px 0 0">Označ a vyplň, čo generovať</p></div><div class="content2">${c}${nav}</div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function pridajGenFilter(){ const od=parseInt(document.getElementById("gf-od").value)||0, doo=parseInt(document.getElementById("gf-do").value)||0, kuchyna=document.getElementById("gf-kuch").value, veg=document.getElementById("gf-veg").checked, maxCas=parseInt(document.getElementById("gf-cas").value)||0;
  if(doo<od){ toast("Koniec rozsahu je pred začiatkom."); return; }
  if(!kuchyna && !veg && !(maxCas>0)){ toast("Nastav aspoň jednu podmienku (kuchyňa, bezmäso alebo čas)."); return; }
  const pr={od,do:doo}; if(kuchyna)pr.kuchyna=kuchyna; if(veg)pr.veg=true; if(maxCas>0)pr.maxCas=maxCas;
  S.genCfg.filtre.push(pr); save(); renderGenWizard(); }
function zmazGenFilter(i){ S.genCfg.filtre.splice(i,1); save(); renderGenWizard(); }
function vsetkyJedalnicky(){ return JEDALNICKY.concat(S.archiv||[]); }
// vytiahne PRÁVE ZOBRAZENÝ týždeň (7 dátumov od S.viewOd) a re-key na 0-6 pre prenosný archívny formát
function tydenAkoSablonu(){ const plan={},planF={}; for(let di=0;di<7;di++){ const iso=datumPre(di); if(S.plan[iso])plan[di]=S.plan[iso]; if(S.planF[iso])planF[di]=S.planF[iso]; } return {plan,planF}; }
async function ulozPlanArchiv(){ const {plan,planF}=tydenAkoSablonu(); if(!Object.keys(plan).length){toast("Plán je prázdny.");return;}
  const nazov=await promptModal("Názov jedálnička:", "Týždeň "+new Date().toLocaleDateString("sk")); if(!nazov)return;
  S.archiv.unshift({id:"a"+Date.now(), nazov:nazov, od:S.viewOd, plan, planF, ciel_kcal:S.profil.kcal});
  S.archiv=S.archiv.slice(0,20); save(); toast("Uložené do jedálničkov."); }
function tlacTyzden(){ prepni("planovac"); renderNakup(); document.querySelectorAll(".view").forEach(el=>el.classList.remove("printme"));
  document.getElementById("v-planovac").classList.add("printme"); document.getElementById("v-nakup").classList.add("printme"); window.print(); }

// C5: token kratší ako 3 znaky by označil polovicu nákupu ako „máš doma" (a checkbox by sa nedal odškrtnúť)
// D2: pole „Mám doma" písalo do localStorage a spúšťalo sync po KAŽDOM znaku (serializácia celého
// stavu). Ukladáme s odkladom 400 ms, prekreslenie nákupu tiež.
let _domaTimer=null;
function domaNakupZmena(v,hned){ S.domaNakup=v; clearTimeout(_domaTimer);
  if(hned){ save(); renderNakup(); return; }
  _domaTimer=setTimeout(()=>{ save(); renderNakup(); },400); }
function domaTokens(){ return (S.domaNakup||"").toLowerCase().split(/[\n,;]+/).map(x=>x.trim()).filter(x=>x.length>=3); }
function nakupPolozky(){
  const grp={}, notes={};
  // Recept sa v bloku varí RAZ, aj keď je v pláne na viac dní — zoskup podľa (recept, slot, blok)
  // a použi rovnaký počet porcií (porcieSlotBlok) aj rovnaké škálovanie (skalovanaHodnota) ako detail
  // receptu, inak si nákup a recept nesedia (nezaokrúhlené porcie, % veľkosti porcie na kusoch).
  const varenia={};
  planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return; // zvyšok = už uvarené v inom bloku
    const k=(cid||r.id)+"|"+slot+"|"+denyBloku(di)[0];
    if(!varenia[k])varenia[k]={r,porcie:porcieSlotBlok(di,slot,cid),fVelkost:pf(di,slot)}; });
  Object.values(varenia).forEach(({r,porcie,fVelkost})=>{ const fPocet=porcie/(r.porcie||1);
    (r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov);
      if(i.mnozstvo==null){ const kk=(p?p.kluc:i.nazov.toLowerCase()); if(!notes[kk])notes[kk]={nazov:i.nazov,pozn:i.poznamka||"podľa chuti",oddelenie:(p||{}).oddelenie||"Ostatné"}; return; }
      const j=(i.jednotka||"").toLowerCase().trim();
      const rodina=rodinaJednotky(j);
      const mn=skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost);
      if(p){ const kluc=p.kluc; if(!grp[kluc])grp[kluc]={key:kluc,nazov:i.nazov,oddelenie:p.oddelenie||"Ostatné",p:p,matched:true,grams:0,cena:0,hasKs:false,hasMl:false,hasG:false,pocty:{},bezCeny:p.cena100==null,zdroje:[]};
        const G=grp[kluc]; const g=gramy({mnozstvo:mn,jednotka:i.jednotka},p);
        G.grams+=g; G.cena+=g/100*(p.cena100||0);
        G.zdroje.push({recept:r.nazov,id:r.id,ing:i.nazov,mn,jednotka:i.jednotka||""});
        // C1: pamätáme si PÔVODNÚ počítateľnú jednotku (strúčik, plátok, list), nie univerzálne „ks"
        if(rodina==="pocet"){ G.hasKs=true; G.pocty[i.jednotka||"ks"]=(G.pocty[i.jednotka||"ks"]||0)+mn; }
        else if(rodina==="ml")G.hasMl=true; else G.hasG=true;
      } else { const kluc="u|"+i.nazov.toLowerCase()+"|"+j; if(!grp[kluc])grp[kluc]={key:kluc,nazov:i.nazov,oddelenie:"Ostatné",matched:false,raw:0,jednotka:i.jednotka||"",cena:0,zdroje:[]};
        grp[kluc].raw+=mn; grp[kluc].zdroje.push({recept:r.nazov,id:r.id,ing:i.nazov,mn,jednotka:i.jednotka||""}); }
    });
  });
  return {grp,notes};
}
// C1: rodina jednotky sa určí z tabuliek, nie z „všetko okrem g a ml je ks".
// Vďaka tomu skončí PL/ČL medzi objemami a strúčik/plátok/list ostane počítateľnou jednotkou.
function rodinaJednotky(jed){ const j=(jed||"").toLowerCase().trim();
  if(j==="ml"||j==="l"||ML_JED[j]!=null) return "ml";
  if(j==="g"||j==="gram"||j==="gramov"||j==="kg"||j==="") return "g";
  if(KS_DEF[j]!=null||KS_JEDNOTKY.includes(j)) return "pocet";
  return "g"; }
function zobrazMnozstvo(G){
  if(!G.matched){ const cnt=rodinaJednotky(G.jednotka)==="pocet"; const val=cnt?Math.max(1,Math.round(G.raw)):Math.round(G.raw*10)/10; return fmt(val)+(G.jednotka?" "+G.jednotka:""); }
  const p=G.p;
  // počítateľné len keď sú počítateľné VŠETKY zdroje — inak riadok hlási „12 ks" pri receptoch,
  // čo pýtajú 200 g + 990 g. A vypíše sa pôvodná jednotka („22 strúčik"), nie univerzálne „ks".
  const poc=Object.keys(G.pocty||{});
  if(G.hasKs && !G.hasG && !G.hasMl && poc.length===1){
    const n=Math.max(1,Math.round(G.pocty[poc[0]]));
    const g=Math.round(G.grams);
    return fmt(n)+" "+poc[0]+(g>0?` <span class="info">(≈ ${fmt(g)} g)</span>`:"");
  }
  if(G.hasMl && !G.hasG){ return fmt(Math.round(G.grams/(p.hustota||1)))+" ml"; }
  return fmt(Math.round(G.grams))+" g";
}
// C7: poradie oddelení v nákupe = poradie regálov v obchode. Musí obsahovať VŠETKY oddelenia,
// ktoré sa v potraviny.json vyskytujú, inak osamotené („Mrazené", „Alkohol") vypadnú až za „Ostatné".
const PORADIE_ODDELENI=["Zelenina a ovocie","Mäso a ryby","Mliečne a vajcia","Chladené","Mrazené","Pečivo",
  "Cestoviny a ryža","Trvanlivé a konzervy","Omáčky a dochucovadlá","Oleje a tuky","Orechy a semená",
  "Pečenie a sladké","Korenie a bylinky","Nápoje","Alkohol","Ostatné"];
// C2: JEDNO miesto, kde sa počíta cena týždňa — Domov, Výživa aj Nákup hlásili tri rôzne čísla.
//  "spotreba" = suroviny, ktoré recepty naozaj minú (celá domácnosť)
//  "balenia"  = koľko zaplatíš v obchode, keď kupuješ celé balenia
//  "osoba"    = spotreba delená počtom stravníkov
function cenaTyzdna(mode){
  const rows=nakupItems().filter(r=>r.gkey);
  const spotreba=rows.reduce((a,r)=>a+(r.cenaSpotreba||0),0);
  if(mode==="balenia") return rows.reduce((a,r)=>a+(r.cenaBalenia||0),0);
  if(mode==="osoba") return spotreba/(stravniciList().length||1);
  return spotreba; }
// C5: krátky token („a") označoval 39 z 48 položiek. Porovnávame na hranice slov a ignorujeme
// tokeny kratšie ako 3 znaky.
// jediné miesto, kde sa text porovnáva so zoznamom surovín (kmeň + prefix, zvláda skloňovanie).
// Používa to „Mám doma" v nákupe aj zakázané suroviny v profile.
// U4: „koriander" → „koriandrová" a „huby" → „hubová" menia kmeň, nie príponu, takže kmeňové
// párovanie ich nechytí. Preto sa porovnáva aj začiatok slova (min. 3, max. 5 znakov, do +6 navyše).
// Rozklad tokenu sa cachuje — rovnaké tokeny idú cez všetkých ~2000 receptov (zákazy aj hľadanie).
const _tokCache=new Map();
function _tokRozklad(t){ let x=_tokCache.get(t);
  if(!x){ const kmene=_slova(t).map(_kmen), pref=t.slice(0,Math.max(3,Math.min(5,t.length-1)));
    x={kmene,pref:(kmene.length===1&&pref.length>=3)?pref:null}; _tokCache.set(t,x); }
  return x; }
// jadro pracuje nad už rozloženými slovami — hľadanie v Receptoch si rozklad cachuje (hladaHay)
function _surovinaVSlovach(slova,tok){ if(!tok||!tok.length) return false;
  return tok.some(t=>{ const x=_tokRozklad(t);
    if(x.kmene.length>0 && _sadneOd(slova,x.kmene)>=0) return true;
    return !!x.pref && slova.some(w=>w.startsWith(x.pref) && w.length-x.pref.length<=6); }); }
function obsahujeSurovinu(text,tok){ return _surovinaVSlovach(_slova(text),tok); }
function jeDoma(nazov,tok){ return obsahujeSurovinu(nazov,tok); }
function nakupBalenie(G){ if(G.matched && G.p && G.p.balenie_g && G.grams>0){ const n=Math.max(1,Math.ceil(G.grams/G.p.balenie_g)); return {n:n,pop:G.p.balenie_popis,celkG:n*G.p.balenie_g}; } return null; }
// C2: celé balenia sa účtujú len keď ich používateľ chce vidieť — inak riadok hlásil 8 plátkov
// toastu a cena bola za celý bochník.
function nakupCena(G){ if(S.profil.balenia!==false){ const b=nakupBalenie(G); if(b) return b.celkG/100*((G.p&&G.p.cena100)||0); } return G.cena||0; }
function nakupCenaSpotreba(G){ return G.cena||0; }
function nakupCenaBalenia(G){ const b=nakupBalenie(G); return b? b.celkG/100*((G.p&&G.p.cena100)||0) : (G.cena||0); }
function nakupMnozstvo(G){ const ex=zobrazMnozstvo(G); if(S.profil.balenia!==false){ const b=nakupBalenie(G); if(b) return ex+` <span class="info">(bal.: ${b.n}× ${b.pop})</span>`; } return ex; }
async function upravFaktor(di,slot){ const cur=Math.round(pf(di,slot)*100); const v=await promptModal("Veľkosť porcie v % (100 = normál):",cur); if(v===null)return; let f=Math.max(10,Math.min(400,parseInt(v)||100))/100; const iso=datumPre(di); S.planF[iso]=S.planF[iso]||{}; S.planF[iso][slot]=Math.round(f*100)/100; save(); renderPlan(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }
function spajzaSedi(x,nazov,p){ const key=p?p.kluc:bezDia(nazov);
  const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||""; const xn=bezDia(x.nazov), n=bezDia(nazov);
  return (xk&&xk===key) || xn===n || xn.includes(n) || n.includes(xn); }
function mamVSpajzi(nazov){ const p=najdiPotravinu(nazov);
  return S.spajza.some(x=>x.mnozstvo>0 && spajzaSedi(x,nazov,p)); }
// C3: koľko GRAMOV tejto suroviny mám naozaj v špajzi (nie len „mám/nemám")
function spajzaGramy(nazov,p){ let g=0;
  (S.spajza||[]).forEach(x=>{ if(!(x.mnozstvo>0))return; if(!spajzaSedi(x,nazov,p))return;
    const pp=p||najdiPotravinu(x.nazov);
    const gg=gramy({mnozstvo:x.mnozstvo,jednotka:x.jednotka},pp);
    if(gg>0)g+=gg; });
  return g; }
// zvyšok po odpočítaní zásoby — položka nezmizne z nákupu, len sa zmenší
function zmensiOSpajzu(G,sg){ const zvysok=Math.max(0,(G.grams||0)-sg); const k=G.grams>0?zvysok/G.grams:0;
  const pocty={}; for(const j in (G.pocty||{})) pocty[j]=G.pocty[j]*k;
  return Object.assign({},G,{grams:zvysok,cena:(G.cena||0)*k,pocty:pocty,zoSpajze:sg}); }
// "už kúpené" sa viaže na KONKRÉTNY zobrazený týždeň (S.viewOd), nie natrvalo na názov suroviny —
// inak by odfajknutý cesnak z minulotýždňového nákupu ostal navždy odfajknutý aj v úplne iných týždňoch.
function nakupCheckKey(key){ return S.viewOd+"|"+key; }
function nakupItems(){
  const {grp,notes}=nakupPolozky(); const tok=domaTokens(); const rows=[];
  Object.values(grp).forEach(G0=>{ const key=G0.key.replace(/'/g,""); const doma=jeDoma(G0.nazov,tok);
    // C3: od potreby odpočítaj skutočnú zásobu; „mám v špajzi" len keď zásoba pokryje celú potrebu
    const sg=spajzaGramy(G0.nazov,G0.p);
    const vSpajzi = sg>0 && sg>=(G0.grams||0)-0.001;
    const G = (sg>0 && !vSpajzi) ? zmensiOSpajzu(G0,sg) : G0;
    rows.push({key,gkey:G.key,odd:G.oddelenie||"Ostatné",nazov:G.nazov,mnoz:nakupMnozstvo(G),cena:nakupCena(G),
      cenaSpotreba:nakupCenaSpotreba(G),cenaBalenia:nakupCenaBalenia(G),gramy:G.grams,zoSpajze:sg,
      bezCeny:!!G.bezCeny,akc:ingVakcii(G.nazov),doma,vSpajzi,klik:true,ck:!!(S.nakupCheck[nakupCheckKey(key)]||doma)}); });
  Object.values(notes).forEach(N=>{ const key="note|"+bezDia(N.nazov); const doma=jeDoma(N.nazov,tok);
    rows.push({key,odd:N.oddelenie||"Ostatné",nazov:N.nazov,mnoz:"<i>"+N.pozn+"</i>",akc:false,doma,klik:true,ck:!!(S.nakupCheck[nakupCheckKey(key)]||doma)}); });
  return rows;
}
function riadokNakup(r){ const en=r.nazov.replace(/'/g,"\\'");
  if(r.man){ return `<label class="${r.ck?'checked':''}"><span class="nm2"><input type="checkbox" ${r.ck?'checked':''} onchange="checkManual('${r.id}',this.checked)"> ${r.nazov}${r.mnoz?' — <b>'+r.mnoz+'</b>':''} <span class="info">(ručné)</span></span><a onclick="zmazManual('${r.id}')" style="color:var(--warn);cursor:pointer">✕</a></label>`; } // N1: ručná položka v oddelení
  // klik na text = otvor info (v ktorom recepte); kúpené len klikom na políčko
  const guard=r.klik?` onclick="if(!event.target.closest('input')){event.preventDefault();surovinaInfo('${(r.gkey||"").replace(/'/g,"\\'")}','${en}')}" style="cursor:pointer" title="v ktorom recepte · čím nahradiť"`:'';
  const meno=r.klik?`<span class="sur-klik">${r.nazov}</span>`:r.nazov;
  return `<label class="${r.ck?'checked':''}"><span class="nm2"${guard}><input type="checkbox" ${r.ck?'checked':''} ${r.doma?'disabled':''} onchange="checkNakup('${r.key}',this.checked)"> ${meno} — <b>${r.mnoz}</b>${r.akc?' <span class="badge price">🏷️ akcia</span>':''}${r.doma?' <span class="info">(máš doma)</span>':''}</span></label>`; }
function renderNakup(){
  const box=document.getElementById("nakup-list");
  const nk=document.getElementById("nakup-kontext"); if(nk){nk.innerHTML=tyzdenNavHTML(); zpristupniKliky(nk);} // nákup je na zvolený týždeň — treba to vidieť
  const domaEl=document.getElementById("doma-nakup"); if(domaEl){ if(document.activeElement===domaEl){S.domaNakup=domaEl.value;save();} else domaEl.value=S.domaNakup||""; }
  const rows=nakupItems();
  const lowStock=S.spajza.filter(x=>x.min>0 && x.mnozstvo<x.min);
  const manual=S.nakupManual||[];
  if(!rows.length && !lowStock.length && !manual.length){ box.innerHTML='<p class="info">Zatiaľ nič v pláne. Pridaj recepty v <b>Pláne</b>, alebo pridaj vlastnú položku vyššie.</p>'; return; }
  const poradie=PORADIE_ODDELENI;
  const nez=rows.filter(r=>!r.ck && !r.vSpajzi), vSp=rows.filter(r=>!r.ck && r.vSpajzi), zas=rows.filter(r=>r.ck);
  const podla={}; nez.forEach(r=>(podla[r.odd]=podla[r.odd]||[]).push(r));
  const manRows=(S.nakupManual||[]).map(m=>({man:true,id:m.id,nazov:m.nazov,mnoz:m.mnoz||"",odd:m.odd||"Ostatné",ck:!!m.done})); // N1
  manRows.filter(r=>!r.ck).forEach(r=>(podla[r.odd]=podla[r.odd]||[]).push(r));
  const oddPor=poradie.filter(o=>podla[o]).concat(Object.keys(podla).filter(o=>!poradie.includes(o)));
  let h="";
  const spotreba=nez.reduce((a,r)=>a+(r.cenaSpotreba||0),0);
  const sBaleniami=nez.reduce((a,r)=>a+(r.cenaBalenia||0),0);
  const akciaN=nez.filter(r=>r.akc).length;
  const bezCenyN=nez.filter(r=>r.bezCeny).length; // B5: radšej „~ 86 € (3 bez ceny)" než tiché podhodnotenie
  // C2: obe čísla naraz — spotrebované suroviny aj to, čo reálne zaplatíš za celé balenia
  if(nez.length){ h+=`<div class="nakup-suhrn"><span><b>${nez.length}</b> položiek na kúpu</span>`+
    `<span title="Suroviny spotrebované receptami">spotrebuješ ~ <b>${eur(spotreba)}</b>${bezCenyN?` <span class="info">(${bezCenyN} bez ceny)</span>`:""}</span>`+
    (sBaleniami>spotreba+0.01?`<span title="Vrátane zvyšku v celých baleniach">v celých baleniach ~ <b>${eur(sBaleniami)}</b></span>`:"")+
    `${akciaN?`<span class="badge price">🏷️ ${akciaN} v akcii</span>`:""}</div>`; }
  if(lowStock.length){ h+='<div class="odd"><h4>🧊 Doplniť zásoby (pod minimom)</h4>'; lowStock.forEach(x=>{ h+=`<label><span class="nm2">${x.nazov} — <b>${fmt(Math.max(0,x.min-x.mnozstvo))} ${x.jednotka}</b></span></label>`; }); h+="</div>"; }
  oddPor.forEach(o=>{ h+=`<div class="odd"><h4>${o}</h4>`; podla[o].sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; });
  if(vSp.length){ h+='<div class="odd done-sekcia"><h4>🏠 Mám v špajzi (over pred nákupom)</h4>'; vSp.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; }
  const zasVsetko=zas.concat(manRows.filter(r=>r.ck)); // N1: hotové ručné položky do „Už máme"
  if(zasVsetko.length){ h+='<div class="odd done-sekcia"><h4>✓ Už máme / v košíku</h4>'; zasVsetko.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; }
  box.innerHTML=h;
}
function checkNakup(key,val){ tik(); const k=nakupCheckKey(key); S.nakupCheck[k]=val; if(!val)delete S.nakupCheck[k]; save(); renderNakup(); }
function pridajNakupPolozku(){ const el=document.getElementById("nakup-manual"); if(!el)return; const v=(el.value||"").trim(); if(!v)return;
  const m=v.match(/^(.*?)[\s,]+(\d+(?:[.,]\d+)?\s*\S*)$/); // N1: "mlieko 2 l" → názov + množstvo
  let nazov=v, mnoz=""; if(m){ nazov=m[1].trim(); mnoz=m[2].trim(); }
  const p=najdiPotravinu(nazov); // N1: auto-oddelenie zo slovníka potravín
  S.nakupManual.push({id:"m"+(S.spSid++),nazov:escHtml(nazov),mnoz:escHtml(mnoz),odd:p?p.oddelenie:"Ostatné",done:false}); el.value=""; save(); renderNakup(); }
function checkManual(id,val){ tik(); const m=S.nakupManual.find(x=>x.id===id); if(m){m.done=val;save();renderNakup();} }
function zmazManual(id){ S.nakupManual=S.nakupManual.filter(x=>x.id!==id); save(); renderNakup(); }
// Rozpis musí byť z TOHO ISTÉHO výpočtu ako nákup (nakupPolozky.zdroje), nie z hrubého i.mnozstvo —
// inak tu svieti množstvo na 1 porciu receptu a v nákupe prepočítané na plán, a nesedí to.
function surovinaInfo(key,nazov){ const n=bezDia(nazov||key);
  const G=nakupPolozky().grp[key];
  const zdroje=(G&&G.zdroje)||[];
  let nah=[]; for(const k in SUBSTITUCIE){ if(n.includes(bezDia(k))){ nah=SUBSTITUCIE[k]; break; } }
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${nazov||key}</h2></div><div class="content2">`;
  h+=`<h4 class="sekcia">🍲 V ktorom recepte (z plánu)</h4>`;
  if(G) h+=`<p class="info" style="margin-top:0">Spolu na nákup: <b>${zobrazMnozstvo(G)}</b></p>`;
  if(!zdroje.length){ // „podľa chuti" položky nemajú množstvo — aspoň ukáž, ktoré recepty ju používajú
    planovaneRecepty().forEach(r=>{ if((r.ingrediencie||[]).some(i=>{const nn=bezDia(i.nazov);return nn.includes(n)||n.includes(nn.split(" ")[0]);})
      && !zdroje.some(z=>z.id===r.id)) zdroje.push({recept:r.nazov,id:r.id,ing:"",mn:null}); }); }
  h+= zdroje.length? zdroje.map(z=>{ const r=receptById(z.id);
      return `<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvor('${z.id}')"><span class="nm">${(r&&ikony[r.kategoria])||"🍴"} ${z.recept}${z.ing&&z.ing!==(G&&G.nazov)?` <small class="meta2">(${z.ing})</small>`:""}</span><span class="kc">${z.mn==null?"podľa chuti":prevodJednotka(z.mn,z.jednotka)}</span></div>`; }).join("")
    : '<p class="info">V aktuálnom pláne túto surovinu nepoužíva žiadny recept.</p>';
  h+='<h4 class="sekcia">🔄 Čím nahradiť</h4>';
  h+= nah.length? `<p>${nah.join(", ")}</p>` : '<p class="info">Pre túto surovinu nemám návrh náhrady.</p>';
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function nakupText(){ // len nekúpené položky (pre kopírovanie/zdieľanie)
  // C4: položky zo špajze sa NEVYNECHÁVAJÚ — v obchode by chýbali, keď sa zásoba medzitým minula.
  // Idú na koniec s poznámkou „mám doma".
  const rows=nakupItems().filter(r=>!r.ck);
  const text=r=>r.nazov+" "+r.mnoz.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
  const riadky=rows.filter(r=>!r.vSpajzi).map(text);
  (S.nakupManual||[]).filter(m=>!m.done).forEach(m=>riadky.push(m.nazov));
  rows.filter(r=>r.vSpajzi).forEach(r=>riadky.push(text(r)+" (mám doma)"));
  return riadky;
}
function kopirujListonic(){
  const riadky=nakupText();
  if(!riadky.length){ toast("Zoznam je prázdny."); return; }
  const txt=riadky.join("\n");
  if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(()=>toast("Skopírované ("+riadky.length+" položiek). Vlož do Listonic."),()=>promptFallback(txt)); }
  else promptFallback(txt);
}
function zdielajNakup(){
  const riadky=nakupText();
  if(!riadky.length){ toast("Zoznam je prázdny."); return; }
  const txt="🛒 Nákupný zoznam:\n"+riadky.join("\n");
  if(navigator.share){ navigator.share({title:"Nákupný zoznam",text:txt}).catch(()=>{}); }
  else kopirujListonic();
}
function promptFallback(txt){ window.prompt("Skopíruj (Ctrl+C):",txt); }

function pozdravText(){ const h=new Date().getHours(); const cast=h<10?"Dobré ráno":(h<18?"Dobrý deň":"Dobrý večer");
  const meno=(stravniciList()[0]||{}).nazov||""; return meno?`${cast}, ${meno}`:cast; }
function renderDash(){
  // Domov hovorí vždy o REÁLNOM tomto týždni — aj keď si v Pláne listuješ dopredu. Prepneme na tento týždeň,
  // vykreslíme všetko (vrátane renderDnesPlan) a na konci S.viewOd vrátime.
  const povodnyViewOd=S.viewOd; S.viewOd=pondelokPre(dnesISO());
  const plan=planItems();
  const pz=document.getElementById("pozdrav"); if(pz)pz.textContent=pozdravText();
  let totB=0,totCena=0; const dniSet={};
  // bielkoviny = na osobu (voči osobnému cieľu), cena = za celú domácnosť (rovnaká logika ako Nákup)
  plan.forEach(p=>{ const v=vyzivaReceptu(p.r); totB+=v.b*p.f; dniSet[p.di]=1; });
  const nd=Object.keys(dniSet).length||1;
  totCena=cenaTyzdna("spotreba"); // C2: rovnaký zdroj čísla ako Nákup, nech tri obrazovky nehlásia tri ceny
  document.getElementById("dash-tiles").innerHTML=`
    <div class="tile"><div class="lbl">Receptov</div><div class="val">${RECEPTY.length}</div></div>
    <div class="tile"><div class="lbl">Jedál v pláne</div><div class="val">${plan.length}</div></div>
    <div class="tile"><div class="lbl">Priemer bielkovín/deň</div><div class="val">${plan.length?fmt(totB/nd)+"<small> g</small>":"–"}</div></div>
    <div class="tile" title="Spotrebované suroviny za celú domácnosť — rovnaké číslo ako v Nákupe"><div class="lbl">Cena/deň (domácnosť)</div><div class="val">${plan.length?eur(totCena/nd):"–"}</div></div>`;
  renderDnesPlan();
  vyberDnes();
  const fav=RECEPTY.filter(r=>S.fav[r.id]).slice(0,4);
  document.getElementById("dash-fav").innerHTML = fav.length? fav.map(r=>'<div class="card">'+kartaHTML(r)+'</div>').join("") : '<p class="info">Zatiaľ žiadne obľúbené — klikni na ★ pri recepte.</p>';
  // mini-štatistika + naposledy varené ako karty
  const favN=Object.keys(S.fav).length;
  const poc={}; S.uvarene.forEach(u=>poc[u.id]=(poc[u.id]||0)+1);
  let najId=null,najN=0; for(const id in poc){ if(poc[id]>najN){najN=poc[id];najId=id;} }
  const najR=najId?receptById(najId):null;
  const statLine=`<div class="hist-stats">❤️ <b>${favN}</b> obľúbených${najR&&najN>1?` · 🍳 najčastejšie varíš <b>${najR.nazov}</b> (${najN}×)`:""}</div>`;
  const hist=S.uvarene.slice(0,6).map(u=>{const r=receptById(u.id);return r?`<span class="hist-item">${ikony[r.kategoria]||"🍴"} ${r.nazov} <span class="hist-date">${u.datum}</span></span>`:null;}).filter(Boolean);
  document.getElementById("dash-hist").innerHTML = statLine + (hist.length? '<div class="hist-wrap">'+hist.join("")+'</div>' : '<p class="info">Nič zatiaľ. Po dokončení režimu varenia sa recept zapíše sem.</p>');
  renderDashSpajza(); renderOkno();
  S.viewOd=povodnyViewOd; // vráť späť — Plán nech ostane na týždni, ktorý si si zvolil
}
function uvarZoSpajze(){ prepni("spajza"); domaZoSpajze(); }
function renderDnesPlan(){
  const el=document.getElementById("dnes-plan"); if(!el)return;
  // S.viewOd je tu už prepnutý na reálny týždeň (rieši renderDash, jediný volajúci).
  // Kliky sa však vykonajú NESKÔR, preto si so sebou nesú vlastné prepnutie.
  const naTentoTyzden="S.viewOd=pondelokPre(dnesISO());";
  const di=(new Date().getDay()+6)%7;
  let hVar="";
  if(S.blokMode){ bloky().forEach((bk,idx)=>{ if((bk[0]+6)%7!==di)return;
    hVar+=`<div class="dnes-varenie-hero"><b>🍳 Dnes večer treba navariť — Blok ${String.fromCharCode(65+idx)} (na ${bk.length} dni)</b>`;
    slotyDna(bk[0]).forEach(sl=>{ const ids=slotIds(bk[0],sl); if(!ids.length)return;
      ids.forEach(cid=>{ const k=komponent(cid); if(!k)return; const por=porcieSlotBlok(bk[0],sl,cid);
        hVar+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span>${pripravaVopred(k)?"⏰ ":""}${k.nazov} <small>(${por} porcií)</small></span></div>`; }); });
    hVar+=`<a style="cursor:pointer;color:var(--accent-txt);text-decoration:underline;font-size:13px" onclick="${naTentoTyzden}planVarenia(${bk[0]})">celý plán varenia →</a></div>`;
  }); }
  let h="",kc=0,b=0,t=0,sx=0,any=false;
  slotyDna(di).forEach(sl=>{ const ids=slotIds(di,sl); const f=pf(di,sl);
    if(!ids.length){ h+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span class="info">—</span></div>`; return; }
    any=true;
    const mena=ids.map(cid=>{const k=komponent(cid); if(!k)return null; kc+=kcalPorcia(k)*f; const v=vyzivaReceptu(k); b+=v.b*f;t+=v.t*f;sx+=v.s*f;
      return k._priloha?("+ "+k.nazov):`<span class="sur-klik" onclick="${naTentoTyzden}otvor('${cid}',{di:${di},slot:'${sl}'})">${k.nazov}</span>`;}).filter(Boolean).join(", ");
    h+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span>${mena}</span></div>`;
  });
  const cot=document.getElementById("cotvarit-panel");
  if(!any && !hVar){ el.innerHTML='<p class="info">Na dnes nič naplánované. Zostav jedálniček alebo pridaj jedlá v Pláne.</p>'; if(cot)cot.style.display=""; return; }
  if(cot)cot.style.display="none";
  let out=hVar;
  if(any){ const ciel=S.profil.kcal||0;
    out+=(hVar?'<h4 class="sekcia" style="margin-top:0">Čo dnes ješ</h4>':'')+h+`<div class="dnes-makra"><b>${Math.round(kc)}${ciel?" / "+ciel:""}</b> kcal · B ${fmt(b)} g · T ${fmt(t)} g · S ${fmt(sx)} g</div>`;
  }
  el.innerHTML=out;
}
function vyberDnes(){
  const nedavne=new Set(S.uvarene.slice(0,5).map(u=>u.id));
  let kand=RECEPTY.filter(r=>prejdeProfil(r) && isMain(r) && !nedavne.has(r.id));
  if(!kand.length)kand=RECEPTY.filter(r=>prejdeProfil(r));
  // D10: komparátor s Math.random() nie je konzistentný (výsledok radenia je nedefinovaný) —
  // najprv deterministicky zoraď podľa hodnotenia, náhoda vstupuje až pri výbere z vrchnej skupiny
  kand.sort((a,b)=>(S.hodn[b.id]||0)-(S.hodn[a.id]||0));
  const top=kand.slice(0,Math.min(8,kand.length));
  const r=top[Math.floor(Math.random()*top.length)]||RECEPTY[0];
  const el=document.getElementById("dnes"); if(!r){el.innerHTML="Žiadny recept.";return;}
  const thumb=r.foto?`<img src="recepty/fotky/${r.foto}">`:(ikony[r.kategoria]||"🍴");
  el.innerHTML=`<div class="thumb">${thumb}</div><div style="flex:1"><div class="nm">${r.nazov}</div><div class="mt">${[r.kategoria,r.cas,kcalPorcia(r)+" kcal"].filter(Boolean).join(" · ")}</div></div>
    <div style="display:flex;gap:8px"><button class="btn primary" onclick="otvor('${r.id}')">Zobraziť</button><button class="btn" onclick="vyberDnes()">Iný návrh</button></div>`;
}
function dojedzZvysky(){
  const plan=planovaneRecepty(); const out=document.getElementById("zvysky-out");
  if(!plan.length){ out.innerHTML='<p class="info">Najprv si naplánuj týždeň — potom nájdem recepty, čo dojedia zvyšné suroviny.</p>'; return; }
  const planId=new Set(plan.map(r=>r.id));
  const suroviny=new Set(); plan.forEach(r=>(r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov); if(p && ["Zelenina a ovocie","Mliečne a vajcia","Mäso a ryby"].includes(p.oddelenie)) suroviny.add(p.kluc); }));
  const navrhy=RECEPTY.filter(r=>!planId.has(r.id) && prejdeProfil(r)).map(r=>{
    let zhoda=[]; (r.ingrediencie||[]).forEach(i=>{const p=najdiPotravinu(i.nazov); if(p&&suroviny.has(p.kluc))zhoda.push(i.nazov);});
    return {r,zhoda};
  }).filter(x=>x.zhoda.length>=2).sort((a,b)=>b.zhoda.length-a.zhoda.length).slice(0,4);
  out.innerHTML = navrhy.length ? navrhy.map(x=>`<div class="match"><b style="cursor:pointer" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${x.r.nazov}</b><div class="info" style="margin-top:4px">využije: ${x.zhoda.slice(0,5).join(", ")}</div></div>`).join("") : '<p class="info">Nenašiel som recept, čo by využil rovnaké suroviny.</p>';
}

function cieloveMakra(kcal){ if(!kcal)return null; const b=S.profil.biel?S.profil.biel:Math.round(kcal*0.30/4); const t=Math.round(kcal*0.30/9); const s=Math.max(0,Math.round((kcal-b*4-t*9)/4)); return {b,t,s}; }
// V1/V2: farba voči cieľu (±10 % tolerancia). floor=true → pod cieľ je zle (bielkoviny)
function stavCiel(act,tgt,floor){ if(!tgt||!act)return {c:"",d:""}; const r=act/tgt;
  const c = floor ? (r<0.9?"var(--warn)":"var(--accent)") : (r>1.1?"var(--warn)":(r<0.9?"var(--muted)":"var(--accent)"));
  const diff=Math.round(act-tgt); return {c, d:(diff>0?"+":"")+diff}; }
function makroBar(emoji,label,color,act,tgt){ const pct=tgt?Math.min(100,Math.round(act/tgt*100)):0; const over=tgt&&act>tgt*1.1;
  return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${emoji} ${label}</span><span style="${over?'color:var(--warn)':''}">${fmt(act)}${tgt?" / "+fmt(tgt):""} g</span></div><div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${color}"></div></div></div>`; }
let vyzivaMode="tyzden", vyzivaDi=null;
function vyzivaZobraz(m){ vyzivaMode=m; if(m==="den"&&vyzivaDi==null) vyzivaDi=(new Date().getDay()+6)%7;
  const tt=document.getElementById("vt-tyzden"), td=document.getElementById("vt-den");
  if(tt)tt.classList.toggle("active",m==="tyzden"); if(td)td.classList.toggle("active",m==="den"); renderVyziva(); }
function vyzivaDenPosun(delta){ vyzivaDi=((vyzivaDi==null?0:vyzivaDi)+delta+7)%7; renderVyziva(); }
function vyzivaBar(i){ vyzivaDi=i; if(vyzivaMode==="den") renderVyziva(); else ukazDenVyzivu(i); }
// kruhový ukazovateľ (donut) — act/tgt s farbou stavu
function ring(act,tgt,col,label){ const R=26,C=2*Math.PI*R,pct=tgt?Math.min(1,act/tgt):0,off=C*(1-pct),c=col||"var(--accent)";
  return `<div style="text-align:center;flex:1;min-width:68px"><svg viewBox="0 0 64 64" style="width:60px;height:60px"><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--line)" stroke-width="7"></circle><circle cx="32" cy="32" r="${R}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 32 32)"></circle><text x="32" y="31" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${Math.round(act)}</text><text x="32" y="44" text-anchor="middle" font-size="8" fill="var(--muted)">${tgt?"/"+Math.round(tgt):""}</text></svg><div style="font-size:12px;color:var(--muted)">${label}</div></div>`; }
function ukazDenVyzivu(di){ const el=document.getElementById("vyziva-den"); if(!el)return; let h=`<h4 class="sekcia">${DNI[di]} — rozpad jedál</h4>`; let any=false,dk=0;
  slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(!r)return; any=true; const v=vyzivaReceptu(r); dk+=v.kcal*f;
    h+=`<div class="sp-row"><span>${r._priloha?"+ ":""}<b>${r.nazov}</b> <span class="meta2">${sl}</span></span><span class="meta2">${Math.round(v.kcal*f)} kcal · B ${fmt(v.b*f)} · T ${fmt(v.t*f)} · S ${fmt(v.s*f)}</span></div>`; }); });
  if(any)h+=`<div class="dnes-makra"><b>Spolu ${Math.round(dk)} kcal</b></div>`;
  el.innerHTML = any? h : `<p class="info">${DNI[di]}: nič naplánované.</p>`; }
function renderVyziva(){
  const dni=[]; for(let di=0;di<7;di++){ let kc=0,b=0,t=0,sx=0,vl=0,na=0,ce=0,hm=0,hmVl=0,hmNa=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r){const v=vyzivaReceptu(r); kc+=v.kcal*f;b+=v.b*f;t+=v.t*f;sx+=v.s*f;vl+=(v.vl||0)*f;na+=(v.na||0)*f;ce+=(v.cena||0)*f;hm+=(v.hmota||0)*f;hmVl+=(v.hmotaVl||0)*f;hmNa+=(v.hmotaNa||0)*f;}}); }); dni.push({kc:Math.round(kc),b,t,s:sx,vl:vl,na:na,ce:ce,hm:hm,hmVl:hmVl,hmNa:hmNa}); }
  const maxKc=Math.max(S.profil.kcal||0,...dni.map(d=>d.kc),1);
  const akt=dni.filter(d=>d.kc>0);
  const priemKc=akt.length?Math.round(akt.reduce((a,d)=>a+d.kc,0)/akt.length):0;
  const priemB=akt.length?akt.reduce((a,d)=>a+d.b,0)/akt.length:0;
  const priemVl=akt.length?akt.reduce((a,d)=>a+d.vl,0)/akt.length:0;
  const priemNa=akt.length?akt.reduce((a,d)=>a+d.na,0)/akt.length:0;
  const priemCe=akt.length?akt.reduce((a,d)=>a+d.ce,0)/akt.length:0;
  const priemT=akt.length?akt.reduce((a,d)=>a+d.t,0)/akt.length:0;
  const priemS=akt.length?akt.reduce((a,d)=>a+d.s,0)/akt.length:0;
  const vahaKg=S.vahy.length?S.vahy[S.vahy.length-1].kg:0;
  // deň vs týždeň: src = hodnoty pre zvolený deň alebo priemer týždňa
  const isDen = vyzivaMode==="den" && vyzivaDi!=null;
  const sum=f=>akt.reduce((a,d)=>a+f(d),0);
  const src = isDen ? dni[vyzivaDi] : {kc:priemKc,b:priemB,t:priemT,s:priemS,vl:priemVl,na:priemNa,ce:priemCe,
    hm:sum(d=>d.hm),hmVl:sum(d=>d.hmVl),hmNa:sum(d=>d.hmNa)};
  // B6: koľko percent hmoty má vôbec údaj — pod 70 % je tvrdé číslo klamlivé (sodík vychádzal 2× nižší)
  const pokr=(znama,celkom)=>celkom>0?znama/celkom:1;
  const pokrVl=pokr(src.hmVl,src.hm), pokrNa=pokr(src.hmNa,src.hm);
  const PRAH_POKRYTIA=0.7;
  const dlazdicaHodnota=(hodnota,pokrytie)=>(pokrytie<PRAH_POKRYTIA
    ? "≥ "+hodnota+'<small class="lbl"> ('+Math.round(pokrytie*100)+" % surovín má dáta)</small>"
    : hodnota);
  const maPlan = isDen ? (dni[vyzivaDi].kc>0) : (akt.length>0);
  const dn=document.getElementById("vyziva-daynav");
  if(dn){ if(isDen){ dn.style.display=""; dn.innerHTML=`<div class="plan-head" style="align-items:center;justify-content:center;gap:12px"><button class="btn" onclick="vyzivaDenPosun(-1)">‹</button><b style="min-width:110px;text-align:center">${DNI[vyzivaDi]}</b><button class="btn" onclick="vyzivaDenPosun(1)">›</button></div>`; } else dn.style.display="none"; }
  const sK=stavCiel(src.kc,S.profil.kcal), sB=stavCiel(src.b,S.profil.biel,true); // V1/V2
  const lblK = isDen ? "kcal · "+DNI[vyzivaDi].slice(0,2) : "Priemer kcal/deň";
  const lblB = isDen ? "Bielkoviny · "+DNI[vyzivaDi].slice(0,2) : "Priemer bielkovín/deň";
  document.getElementById("vyziva-tiles").innerHTML=`
    <div class="tile"><div class="lbl">${lblK}</div><div class="val" style="color:${sK.c}">${maPlan?src.kc:"–"}<small> /${S.profil.kcal}</small></div>${(sK.d&&maPlan)?`<div class="lbl" style="color:${sK.c}">${sK.d} kcal vs cieľ</div>`:""}</div>
    <div class="tile"><div class="lbl">${lblB}</div><div class="val" style="color:${S.profil.biel?sB.c:''}">${maPlan?fmt(src.b)+" g":"–"}${S.profil.biel?'<small> /'+S.profil.biel+'</small>':''}</div>${(S.profil.biel&&sB.d&&maPlan)?`<div class="lbl" style="color:${sB.c}">${sB.d} g vs cieľ</div>`:""}</div>
    <div class="tile"><div class="lbl">Naplánovaných dní</div><div class="val">${akt.length}/7</div></div>
    <div class="tile"><div class="lbl">Vláknina${isDen?" · "+DNI[vyzivaDi].slice(0,2):"/deň"}</div><div class="val">${maPlan?dlazdicaHodnota(fmt(src.vl)+" g",pokrVl):"–"}<small> /30</small></div></div>
    <div class="tile"><div class="lbl">Sodík${isDen?" · "+DNI[vyzivaDi].slice(0,2):"/deň"}</div><div class="val" style="${(src.na>2300&&pokrNa>=PRAH_POKRYTIA)?'color:var(--warn)':''}">${maPlan?dlazdicaHodnota(Math.round(src.na)+" mg",pokrNa):"–"}<small> /2300</small></div></div>
    <div class="tile" title="Na jedného stravníka; celá domácnosť je na Domove a v Nákupe"><div class="lbl">Cena${isDen?" · "+DNI[vyzivaDi].slice(0,2):"/deň"} · na osobu</div><div class="val">${maPlan?eur(src.ce):"–"}</div></div>
    <div class="tile"><div class="lbl">Bielkoviny na kg</div><div class="val">${(maPlan&&vahaKg)?fmt(src.b/vahaKg)+"<small> g/kg</small>":"–"}</div></div>`;
  const ciel=S.profil.kcal||0;
  let ch = ciel?`<div class="cielline" style="bottom:${Math.min(100,ciel/maxKc*100)}%"><span>cieľ ${ciel}</span></div>`:"";
  dni.forEach((d,i)=>{ const hgt=Math.round(d.kc/maxKc*100); const over=ciel&&d.kc>ciel*1.1;
    const mc=d.b*4+d.t*9+d.s*4||1;
    const seg=d.kc>0?`<div class="seg segB" style="height:${d.b*4/mc*100}%"></div><div class="seg segT" style="height:${d.t*9/mc*100}%"></div><div class="seg segS" style="height:${d.s*4/mc*100}%"></div>`:"";
    const sel=isDen&&vyzivaDi===i?' style="cursor:pointer;font-weight:700;text-decoration:underline"':' style="cursor:pointer"';
    ch+=`<div class="col"${sel} title="Zobraziť deň" onclick="vyzivaBar(${i})"><span class="v" style="${over?'color:var(--warn)':''}">${d.kc||""}</span><div class="bar2" style="height:${hgt}%">${seg}</div><span class="d">${DNI[i].slice(0,2)}</span></div>`; });
  document.getElementById("vyziva-chart").innerHTML=ch;
  document.getElementById("vyziva-ciel").innerHTML = (ciel? `Prerušovaná čiara = denný cieľ ${ciel} kcal. Klikni na stĺpec pre rozpad jedál dňa.` : "Nastav si denný cieľ v Nastaveniach.") + ` <span class="chart-leg"><span class="lg segB"></span> bielkoviny<span class="lg segT"></span> tuky<span class="lg segS"></span> sacharidy</span>`;
  // makrá: rings (na prvý pohľad) + detailné pruhy pod nimi
  const cm=cieloveMakra(ciel);
  const rB=stavCiel(src.b,S.profil.biel||(cm?cm.b:0),true).c;
  document.getElementById("vyziva-makro").innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      ${ring(src.kc,ciel,sK.c,"kcal")}
      ${ring(src.b,cm?cm.b:0,rB,"Biel. g")}
      ${ring(src.t,cm?cm.t:0,"var(--accent)","Tuky g")}
      ${ring(src.s,cm?cm.s:0,"var(--accent)","Sach. g")}</div>
    ${makroBar("🟩","Bielkoviny","#2e7d54",src.b,cm?cm.b:0)}
    ${makroBar("🟨","Tuky","#e0a800",src.t,cm?cm.t:0)}
    ${makroBar("🟫","Sacharidy","#b06a3b",src.s,cm?cm.s:0)}
    <p class="info" style="margin-top:6px">${isDen?DNI[vyzivaDi]:"Priemer na deň"}${cm?" oproti cieľu (z "+ciel+" kcal)":""}.</p>`;
  // ciele stravníkov
  const strav=stravniciList(); const sp=document.getElementById("vyziva-stravnici");
  if(sp) sp.innerHTML = strav.map(p=>{ const k=p.kcal||S.profil.kcal||0; const m=cieloveMakra(k);
    return `<div class="sp-row"><span><b>${p.nazov||"Stravník"}</b></span><span class="meta2">${k} kcal · B ${m?m.b:"–"} g · T ${m?m.t:"–"} g · S ${m?m.s:"–"} g</span></div>`; }).join("");
  // rozpad jedál: v deň režime zvolený deň, inak prvý naplánovaný
  if(isDen){ ukazDenVyzivu(vyzivaDi); }
  else { const prvy=dni.findIndex(d=>d.kc>0); if(prvy>=0) ukazDenVyzivu(prvy); else { const dd=document.getElementById("vyziva-den"); if(dd)dd.innerHTML=""; } }
}

function vypocitajCiel(){ const poh=document.getElementById("t-poh").value; const vek=parseInt(document.getElementById("t-vek").value)||30; const vys=parseInt(document.getElementById("t-vyska").value)||175; const vah=parseInt(document.getElementById("t-vaha").value)||75; const akt=parseFloat(document.getElementById("t-akt").value)||1.55;
  const bmr=10*vah+6.25*vys-5*vek+(poh==="m"?5:-161); let tdee=bmr*akt;
  const cielTyp=((document.getElementById("p-cieltyp")||{}).value)||"udrzanie";
  // ponytail: fixný deficit/surplus -15 %/+10 %; ak treba jemnejšie, sprav z toho pole
  if(cielTyp==="chudnutie")tdee*=0.85; else if(cielTyp==="priberanie")tdee*=1.10;
  tdee=Math.max(1000,Math.round(tdee/10)*10);
  normStravnici();
  const idx=Math.min(Math.max(0,parseInt((document.getElementById("t-koho")||{}).value)||0), S.profil.stravnici.length-1);
  if(S.profil.stravnici[idx])S.profil.stravnici[idx].kcal=tdee;
  if(idx===0){ S.profil.kcal=tdee; const pk=document.getElementById("p-kcal"); if(pk)pk.value=tdee; }
  S.profil.cielTyp=cielTyp; save(); renderStravnici();
  const meno=(S.profil.stravnici[idx]&&S.profil.stravnici[idx].nazov)||"stravník";
  const popis={chudnutie:"chudnutie −15 %",priberanie:"priberanie +10 %",udrzanie:"udržanie"}[cielTyp];
  document.getElementById("tdee-ok").textContent=meno+": "+tdee+" kcal/deň ("+popis+"). Uložené ✓"; }
function naplnKohoSelect(){ const s=document.getElementById("t-koho"); if(!s)return; const l=stravniciList(); const cur=parseInt(s.value); s.innerHTML=l.map((p,i)=>`<option value="${i}">${(p.nazov||("Osoba "+(i+1))).replace(/</g,"")}</option>`).join(""); if(cur>=0&&cur<l.length)s.value=cur; }
function zalohuj(){ try{ const blob=new Blob([JSON.stringify(S)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="kucharka-zaloha.json"; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ toast("Zálohovanie zlyhalo."); } }
function obnov(file){ if(!file)return; const rd=new FileReader(); rd.onload=e=>{ try{ const o=JSON.parse(e.target.result); S=Object.assign(S,o); save(); toast("Obnovené. Stránka sa načíta znova."); location.reload(); }catch(err){ toast("Neplatný súbor zálohy."); } }; rd.readAsText(file); }
async function resetApp(){ if(!await confirmModal("Naozaj vymazať VŠETKY dáta (obľúbené, plán, špajza, profil, história)? Táto akcia sa nedá vrátiť."))return;
  if(!await confirmModal("Posledné varovanie — appka sa vráti do úvodného stavu. Pokračovať?"))return;
  try{ localStorage.removeItem(LS); }catch(e){} location.reload(); }
function normStravnici(){ if(!Array.isArray(S.profil.stravnici)||!S.profil.stravnici.length){ S.profil.stravnici=stravniciList(); } S.profil.osoby=S.profil.stravnici.length; }
function renderStravnici(){ const box=document.getElementById("stravnici-box"); if(!box)return; const l=stravniciList();
  box.innerHTML=l.map((p,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px"><input value="${(p.nazov||"").replace(/"/g,"")}" onchange="zmenStravnika(${i},'nazov',this.value)" placeholder="meno" title="meno stravníka" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" value="${p.kcal||""}" onchange="zmenStravnika(${i},'kcal',this.value)" title="kcal/deň" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"><a onclick="zmazStravnika(${i})" style="color:var(--warn);cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px" title="odobrať stravníka">✕</a></div>`).join(""); naplnKohoSelect(); zpristupniFormulare(box); } // D6: menovky aj pre dynamicky vykreslené polia
function pridajStravnika(){ const l=stravniciList().slice(); l.push({nazov:"Ďalší",kcal:S.profil.kcal||1450}); S.profil.stravnici=l; S.profil.osoby=l.length; save(); renderStravnici(); }
function zmenStravnika(i,k,v){ const l=stravniciList().slice(); if(!l[i])return; l[i][k]=(k==="kcal")?(parseInt(v)||0):v; S.profil.stravnici=l; S.profil.osoby=l.length; save(); }
function zmazStravnika(i){ let l=stravniciList().slice(); if(l.length<=1)return; l.splice(i,1); S.profil.stravnici=l; S.profil.osoby=l.length; save(); renderStravnici(); }
function renderSlotyBox(){ const box=document.getElementById("sloty-box"); if(!box)return;
  const akt=(Array.isArray(S.profil.sloty)&&S.profil.sloty.length)?S.profil.sloty:DEFAULT_SLOTY;
  box.innerHTML=VSETKY_SLOTY.map(s=>`<label class="switch"><input type="checkbox" data-slot="${s}" ${akt.includes(s)?"checked":""}> ${ikony[s]||""} ${s}</label>`).join(""); }
function naplnProfil(){ renderStravnici(); renderSlotyBox(); document.getElementById("p-kcal").value=S.profil.kcal;
  document.getElementById("p-biel").value=S.profil.biel||0; document.getElementById("p-ryby").checked=!!S.profil.ryby;
  document.getElementById("p-lepok").checked=!!S.profil.lepok; document.getElementById("p-mlieko").checked=!!S.profil.mlieko; var pd=document.getElementById("p-dark"); if(pd)pd.checked=!!S.profil.dark; var pb=document.getElementById("p-big"); if(pb)pb.checked=!!S.profil.big; var pa=document.getElementById("p-akcie"); if(pa)pa.value=S.akcie||""; var pbal=document.getElementById("p-balenia"); if(pbal)pbal.checked=(S.profil.balenia!==false); var pw=document.getElementById("p-watch"); if(pw)pw.value=S.profil.watch||""; var pz=document.getElementById("p-zakazane"); if(pz)pz.value=S.profil.zakazane||""; var pks=document.getElementById("p-kupsnack"); if(pks)pks.checked=(S.profil.kupSnack!==false); var pct=document.getElementById("p-cieltyp"); if(pct)pct.value=S.profil.cielTyp||"udrzanie"; var pok=document.getElementById("p-okno"); if(pok)pok.checked=!!S.profil.okno; var pos=document.getElementById("p-oknostart"); if(pos)pos.value=S.profil.oknostart||12;
  var pso=document.getElementById("p-syncoff"); if(pso)pso.checked=!!S.profil.syncOff; var psi=document.getElementById("p-syncid"); if(psi)psi.value=S.profil.syncId||"";
  naplnUcet();
  var vi=document.getElementById("verzia-info"); if(vi)vi.textContent="Verzia kuchárky: "+(typeof VERZIA!=="undefined"?VERZIA:"?");
  document.getElementById("profil-ok").textContent=""; renderVahy(); }
function naplnUcet(){ const box=document.getElementById("ucet-box"); if(!box)return;
  if(typeof syncMozne!=="function"||!syncMozne()){ box.innerHTML='<p class="info">Prihlásenie a skupiny vyžadujú nastavenú synchronizáciu (Supabase). Pozri HOSTING.md, Krok 3.</p>'; return; }
  const u=authUser();
  if(!u){ box.innerHTML='<div class="field"><label>E-mail</label><input type="email" id="au-email" placeholder="ty@email.sk"></div>'
    +'<div class="field"><label>Heslo</label><input type="password" id="au-pass" placeholder="aspoň 6 znakov"></div>'
    +'<div class="btn-row" style="margin-top:12px"><button class="btn primary" onclick="uiLogin()">Prihlásiť</button><button class="btn" onclick="uiSignup()">Registrovať</button></div>'
    +'<p class="info" id="au-msg"></p>'; return; }
  let h='<p class="info">Prihlásený: <b>'+(u.email||"").replace(/</g,"&lt;")+'</b> &nbsp;<a onclick="uiLogout()" style="cursor:pointer;color:var(--warn)">Odhlásiť</a></p>'
    +'<p class="info">Tvoje osobné údaje (obľúbené, plán, nastavenia…) sa ukladajú k účtu a načítajú po prihlásení na hocijakom zariadení.</p>';
  if(!S.profil.skupinaId){ h+='<p class="info">Skupina zdieľa plán, nákupný zoznam a špajzu s pozvanými členmi.</p>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="au-nazov" placeholder="názov skupiny" style="flex:1;min-width:140px;padding:8px;border:1px solid var(--line);border-radius:8px"><button class="btn primary" onclick="uiSkupinaVytvor()">Vytvoriť skupinu</button></div>'
    +'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input type="text" id="au-kod" placeholder="pozývací kód" style="flex:1;min-width:140px;padding:8px;border:1px solid var(--line);border-radius:8px"><button class="ghost" onclick="uiSkupinaPripoj()">Pripojiť sa</button></div>'; }
  else { h+='<p class="info">Skupina: <b>'+((S.profil.skupinaNazov||"(bez názvu)")).replace(/</g,"&lt;")+'</b></p>'
    +'<div class="field"><label>Pozývací kód (pošli ho členom)</label><input type="text" id="au-kodshow" readonly value="'+(S.profil.skupinaKod||"").replace(/"/g,"")+'" onclick="this.select()" style="font-weight:700;letter-spacing:1px"></div>'
    +'<button class="ghost" onclick="uiSkupinaOpusti()">Opustiť skupinu</button>'; }
  h+='<p class="info" id="au-msg"></p>'; box.innerHTML=h; }
function auMsg(t,err){ const m=document.getElementById("au-msg"); if(m){ m.textContent=t; m.style.color=err?"var(--warn)":"var(--ok,green)"; } }
async function uiLogin(){ try{ await authLogin(document.getElementById("au-email").value.trim(),document.getElementById("au-pass").value); await syncSkupinaPull(); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
async function uiSignup(){ try{ await authSignup(document.getElementById("au-email").value.trim(),document.getElementById("au-pass").value); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
async function uiLogout(){ if(!await confirmModal("Odhlásiť sa? Tvoje údaje ostanú uložené v účte a načítajú sa po ďalšom prihlásení. Z tohto zariadenia sa vyčistia."))return; await authLogout(); }
async function uiSkupinaVytvor(){ try{ await skupinaVytvor(document.getElementById("au-nazov").value.trim()); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
async function uiSkupinaPripoj(){ try{ await skupinaPripoj(document.getElementById("au-kod").value); naplnUcet(); renderPlan(); renderNakup(); renderDash(); }catch(e){ auMsg(e.message,true); } }
async function uiSkupinaOpusti(){ if(!await confirmModal("Opustiť skupinu? Zdieľaný plán a nákup sa prestanú synchronizovať."))return; await skupinaOpusti(); naplnUcet(); }
function ulozProfil(){ normStravnici();
  const sbox=document.getElementById("sloty-box"); if(sbox){ const izb=[...sbox.querySelectorAll("input[data-slot]")].filter(i=>i.checked).map(i=>i.dataset.slot); S.profil.sloty=izb.length?izb:DEFAULT_SLOTY.slice(); }
  S.profil.kcal=parseInt(document.getElementById("p-kcal").value)||1450; S.profil.biel=parseInt(document.getElementById("p-biel").value)||0;
  S.profil.ryby=document.getElementById("p-ryby").checked; S.profil.lepok=document.getElementById("p-lepok").checked; S.profil.mlieko=document.getElementById("p-mlieko").checked; S.profil.dark=document.getElementById("p-dark").checked; S.profil.big=document.getElementById("p-big").checked; S.akcie=document.getElementById("p-akcie").value; S.profil.balenia=document.getElementById("p-balenia").checked; S.profil.watch=document.getElementById("p-watch").value; S.profil.zakazane=document.getElementById("p-zakazane").value; S.profil.kupSnack=document.getElementById("p-kupsnack").checked; S.profil.cielTyp=document.getElementById("p-cieltyp").value; S.profil.okno=document.getElementById("p-okno").checked; S.profil.oknostart=parseInt(document.getElementById("p-oknostart").value)||12;
  applyVzhlad(); save(); document.getElementById("profil-ok").textContent="Uložené ✓"; renderGrid(); }

function renderDoma(){
  const raw=document.getElementById("doma-in").value.toLowerCase();
  const mam=raw.split(/[\n,;]+/).map(x=>bezDia(x.trim())).filter(Boolean);
  const out=document.getElementById("doma-out");
  if(!mam.length){ out.innerHTML='<p class="info">Napíš aspoň jednu surovinu.</p>'; return; }
  // skóre: uprednostní komplexné recepty, ktorým chýba málo (nie triviálne 100 % placky)
  const skore=RECEPTY.filter(prejdeProfil).map(r=>{ const s=skoreReceptu(r,mam); return {r,...s,score:s.mame-1.5*s.chyba.length};
  }).filter(x=>x.mame>0).sort((a,b)=>b.score-a.score);
  if(!skore.length){ out.innerHTML='<p class="info">Nenašli sa žiadne recepty.</p>'; return; }
  out.innerHTML=skore.slice(0,12).map(x=>`<div class="match">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <b style="cursor:pointer" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${x.r.nazov}</b>
      <span style="color:var(--muted);font-size:14px;white-space:nowrap">${x.mame}/${x.spolu}</span></div>
    <div class="bar"><i style="width:${x.pct}%"></i></div>
    ${x.chyba.length?`<div style="font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;align-items:center"><span>${x.chyba.length<=2?'<b style="color:var(--accent-txt)">Chýba len:</b> ':'Chýba: '}${x.chyba.slice(0,6).join(", ")}${x.chyba.length>6?"…":""}</span><button class="mini" onclick="pridajChybajuceDoNakupu('${x.r.id}')">+ do nákupu</button></div>`:'<div style="font-size:13px;color:var(--accent)">Máš všetko! 🎉</div>'}
  </div>`).join("");
}
function pridajChybajuceDoNakupu(id){ const r=receptById(id); if(!r)return;
  const raw=(document.getElementById("doma-in")||{}).value||""; const mam=raw.toLowerCase().split(/[\n,;]+/).map(x=>bezDia(x.trim())).filter(Boolean);
  const chyb=(r.ingrediencie||[]).filter(i=>{ if(i.mnozstvo==null)return false; const nm=bezDia(i.nazov); return !mam.some(m=>nm.includes(m)||m.includes(nm.split(" ")[0])); }).map(i=>i.nazov);
  if(!chyb.length){ toast("Nič nechýba 🎉"); return; }
  chyb.forEach(nz=>{ if(!S.nakupManual.some(m=>bezDia(m.nazov)===bezDia(nz))) S.nakupManual.push({id:"m"+(S.spSid++),nazov:nz,done:false}); });
  save(); toast("Pridané do nákupu: "+chyb.join(", ")); }
// D1: prekreslenie 1336 kariet po každom znaku trvalo 8,2 s. Debounce 200 ms a len „input"
// (pri <select> chodí input aj change, takže render bežal 2×).
let _gridTimer=null;
function renderGridDebounce(){ clearTimeout(_gridTimer); _gridTimer=setTimeout(renderGrid,200); }
["hladaj","f-kuchyna","f-cas","f-diet","f-sort"].forEach(id=>{
  const el=document.getElementById(id); if(!el)return;
  el.addEventListener("input",renderGridDebounce);
});
function dnesISO(){ return isoZDatumu(new Date()); }
function dniDo(iso){ if(!iso)return null; return Math.round((new Date(iso+"T00:00:00")-new Date(dnesISO()+"T00:00:00"))/86400000); }
function expTrieda(iso){ const n=dniDo(iso); if(n===null)return ""; if(n<0)return "exp-over"; if(n<=4)return "exp-soon"; return ""; }
function expText(iso){ const n=dniDo(iso); if(n===null)return ""; if(n<0)return "expirované ("+(-n)+" d)"; if(n===0)return "spotrebuj dnes"; if(n<=4)return "o "+n+" d"; return iso; }
// S1: hrubý odhad trvanlivosti podľa oddelenia + miesta (editovateľné) — ponytail: default dni, presné dátumy na balení
const TRVANLIVOST_DNI={"Pečivo":3,"Mäso a ryby":3,"Zelenina a ovocie":7,"Mliečne a vajcia":10,"Omáčky a dochucovadlá":120,"Oleje a tuky":180,"Orechy a semená":180,"Nápoje":180,"Korenie a bylinky":180,"Cestoviny a ryža":365,"Pečenie a sladké":365,"Trvanlivé a konzervy":365,"Chladené":7,"Mrazené":180,"Alkohol":1095,"Ostatné":30};
function navrhExpiry(nazov,miesto){ const p=najdiPotravinu(nazov); let d=(p&&TRVANLIVOST_DNI[p.oddelenie])||30; if(miesto==="Mraznička")d=Math.max(d,180); const dt=new Date(); dt.setDate(dt.getDate()+d); return isoZDatumu(dt); }
function naplnPotravinyDatalist(){ const dl=document.getElementById("potraviny-dl"); if(!dl)return;
  const mena=[...new Set(POTRAVINY.map(p=>p.kluc))].sort((a,b)=>a.localeCompare(b,"sk"));
  dl.innerHTML=mena.map(m=>`<option value="${m.replace(/"/g,"")}"></option>`).join(""); }
function aktualizujJednotky(){ const sel=document.getElementById("sp-jed"); if(!sel)return;
  const nazov=(document.getElementById("sp-nazov")||{}).value||""; const p=najdiPotravinu(nazov); const cur=sel.value;
  const u=povoleneJednotky(p); sel.innerHTML=u.map(x=>`<option>${x}</option>`).join(""); if(u.includes(cur))sel.value=cur;
  const ex=document.getElementById("sp-exp"); if(ex&&!ex.value&&nazov.trim()){ ex.value=navrhExpiry(nazov,(document.getElementById("sp-miesto")||{}).value); } } // S1: predvyplň odhad expirácie
function pridajZasobu(){ const nazov=document.getElementById("sp-nazov").value.trim(); if(!nazov){toast("Zadaj surovinu.");return;}
  const p=najdiPotravinu(nazov);
  const miesto=document.getElementById("sp-miesto").value;
  S.spajza.push({id:S.spSid++,nazov:escHtml(nazov),kluc:p?p.kluc:"",mnozstvo:parseFloat(document.getElementById("sp-mn").value)||0,jednotka:document.getElementById("sp-jed").value,miesto:miesto,expiry:document.getElementById("sp-exp").value||navrhExpiry(nazov,miesto),min:parseFloat(document.getElementById("sp-min").value)||0}); // S1: fallback odhad expirácie
  save(); ["sp-nazov","sp-mn","sp-exp","sp-min"].forEach(id=>document.getElementById(id).value=""); aktualizujJednotky(); renderSpajza(); }
function zmazZasobu(id){ S.spajza=S.spajza.filter(x=>x.id!==id); save(); renderSpajza(); }
function upravZasobu(id,dir){ const it=S.spajza.find(x=>x.id===id); if(!it)return; const k=krokPreJednotku(it.jednotka);
  it.mnozstvo=Math.max(0,Math.round((it.mnozstvo+dir*k)*100)/100); save(); renderSpajza(); }
function upravSpajzu(id){ const x=S.spajza.find(s=>s.id===id); if(!x)return; const st="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px";
  const jedn=povoleneJednotky(najdiPotravinu(x.nazov)); if(!jedn.includes(x.jednotka))jedn.unshift(x.jednotka);
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Upraviť: ${x.nazov}</h2></div><div class="content2">
    <div class="field"><label>Množstvo</label><input type="number" id="up-mn" value="${x.mnozstvo}" style="${st}"></div>
    <div class="field"><label>Jednotka</label><select class="f" id="up-jed">${jedn.map(u=>`<option ${u===x.jednotka?"selected":""}>${u}</option>`).join("")}</select></div>
    <div class="field"><label>Miesto</label><select class="f" id="up-miesto">${["Špajza","Chladnička","Mraznička"].map(m=>`<option ${m===x.miesto?"selected":""}>${m}</option>`).join("")}</select></div>
    <div class="field"><label>Dátum spotreby</label><input type="date" id="up-exp" value="${x.expiry||""}" style="${st}"></div>
    <div class="field"><label>Minimum (0 = vypnuté)</label><input type="number" id="up-min" value="${x.min||0}" style="${st}"></div>
    <div class="btn-row"><button class="btn primary" onclick="ulozSpajzu(${id})">Uložiť</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
function ulozSpajzu(id){ const x=S.spajza.find(s=>s.id===id); if(!x)return;
  x.mnozstvo=parseFloat(document.getElementById("up-mn").value)||0; x.jednotka=document.getElementById("up-jed").value; x.miesto=document.getElementById("up-miesto").value; x.expiry=document.getElementById("up-exp").value||""; x.min=parseFloat(document.getElementById("up-min").value)||0;
  save(); zavriPick(); renderSpajza(); }
function spRow(x){ const low=x.min>0&&x.mnozstvo<x.min;
  return `<div class="sp-row"><span><b>${x.nazov}</b> <span class="meta2">${fmt(x.mnozstvo)} ${x.jednotka}${x.min?" · min "+fmt(x.min):""}${low?' <span class="low">(doplniť)</span>':""}${x.expiry?' · <span class="'+expTrieda(x.expiry)+'">'+expText(x.expiry)+'</span>':""}</span></span><span style="display:flex;gap:6px;align-items:center"><button class="mini" onclick="upravZasobu(${x.id},-1)">−</button><button class="mini" onclick="upravZasobu(${x.id},1)">+</button><button class="mini" onclick="upravSpajzu(${x.id})">✎</button><a onclick="zmazZasobu(${x.id})" style="color:var(--warn);cursor:pointer">✕</a></span></div>`; }
function renderSpajza(){ const box=document.getElementById("spajza-list"); if(!box)return;
  if(!S.spajza.length){ box.innerHTML='<p class="info">Zatiaľ prázdne. Pridaj zásoby vyššie.</p>'; return; }
  let h=""; const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=4;}).sort((a,b)=>dniDo(a.expiry)-dniDo(b.expiry));
  if(soon.length){ h+='<div class="odd"><h4>⏰ Spotrebuj čoskoro</h4>'; soon.forEach(x=>h+=spRow(x)); h+="</div>"; }
  ["Chladnička","Mraznička","Špajza"].forEach(m=>{ const arr=S.spajza.filter(x=>x.miesto===m); if(!arr.length)return; h+=`<div class="odd"><h4>${m}</h4>`; arr.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(x=>h+=spRow(x)); h+="</div>"; });
  box.innerHTML=h; }
function renderDashSpajza(){ const el=document.getElementById("dash-spajza"); if(!el)return;
  const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=4;}).sort((a,b)=>dniDo(a.expiry)-dniDo(b.expiry));
  const low=S.spajza.filter(x=>x.min>0&&x.mnozstvo<x.min); let h="";
  if(soon.length) h+="⏰ "+soon.map(x=>x.nazov+' <span class="'+expTrieda(x.expiry)+'">('+expText(x.expiry)+')</span>').join(", ")+"<br>";
  if(low.length) h+="🛒 Doplniť: "+low.map(x=>x.nazov).join(", ");
  el.innerHTML=h||"Špajza je v poriadku."; }
function domaZoSpajze(){ document.getElementById("doma-in").value=S.spajza.map(x=>x.nazov).join(", "); renderDoma(); }
function expBoost(r){ const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=5;}).map(x=>x.nazov.toLowerCase());
  if(!soon.length)return 0; return (r.ingrediencie||[]).some(i=>{const nn=i.nazov.toLowerCase();return soon.some(sx=>nn.includes(sx)||sx.includes(nn.split(" ")[0]));})?1.5:0; }
function odpisRecept(r){ if(!r)return; if(!S.spajza.length){toast("Špajza je prázdna.");return;} let zmen=0;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; const p=najdiPotravinu(i.nazov); const kk=p?p.kluc:"";
    const it=S.spajza.find(x=>{ const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||""; if(kk&&xk&&kk===xk)return true;
      const a=bezDia(x.nazov),b=bezDia(i.nazov); return a.includes(b)||b.includes(a.split(" ")[0]); });
    if(!it)return; const potreba=skalovanaHodnota(i.mnozstvo,i.jednotka,aktPorcie/(r.porcie||1),aktVelkost);
    let uber=null;
    if(it.jednotka===i.jednotka) uber=potreba;
    else { const g=gramy({mnozstvo:potreba,jednotka:i.jednotka},p); if(g>0) uber=gramyNaJed(g,it.jednotka,p); }
    if(uber!=null){ it.mnozstvo=Math.max(0,Math.round((it.mnozstvo-uber)*100)/100); zmen++; } });
  S.spajza=S.spajza.filter(x=>x.mnozstvo>0); save();
  toast(zmen?("Odpísané zo špajze: "+zmen+" surovín."):"Nenašla sa zhoda (skontroluj názvy v špajzi)."); }
function toggleMenu(id){ document.querySelectorAll(".menu").forEach(m=>{ if(m.id!==id)m.classList.remove("open"); }); const el=document.getElementById(id); if(el)el.classList.toggle("open"); }
function zavriMenu(){ document.querySelectorAll(".menu").forEach(m=>m.classList.remove("open")); }
document.addEventListener("click",e=>{ if(!e.target.closest(".menu-wrap")) zavriMenu(); });
function otvorNacitat(){ const all=vsetkyJedalnicky(); if(!all.length){ toast("Zatiaľ žiadne uložené jedálničky. Najprv daj ⋯ Viac → Uložiť tento plán."); return; }
  const z=all.slice().sort((a,b)=>(b.od||b.id||"").localeCompare(a.od||a.id||""));
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Načítať jedálniček</h2></div><div class="content2" style="max-height:60vh;overflow:auto">';
  z.forEach(j=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nacitajJedalnicekId('${j.id}')"><span class="nm">${(String(j.id)[0]==="a"?"🖫 ":"📅 ")}${j.nazov||j.id}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); }
async function nacitajJedalnicekId(id){ const j=vsetkyJedalnicky().find(x=>x.id===id); if(!j)return; if(!await confirmModal(`Načítať „${j.nazov||j.id}"? Prepíše sa tento týždeň.`))return;
  nacitajSablonuDoTyzdna(j.plan||{},j.planF||{}); if(j.ciel_kcal)S.profil.kcal=j.ciel_kcal; save(); zavriPick(); renderPlan(); }
function planZobraz(m){
  const t=document.getElementById("plan-tyzden"), k=document.getElementById("plan-kal");
  if(t)t.style.display=(m==="tyzden")?"":"none"; if(k)k.style.display=(m==="kalendar")?"":"none";
  const tt=document.getElementById("tab-tyzden"), tk=document.getElementById("tab-kal");
  if(tt)tt.classList.toggle("active",m==="tyzden"); if(tk)tk.classList.toggle("active",m==="kalendar");
  if(m==="kalendar")renderKalendar(); }
let kalD=new Date();
function kalPosun(delta){ kalD=new Date(kalD.getFullYear(),kalD.getMonth()+delta,1); renderKalendar(); }
function skokNaTyzdenDna(iso){ S.viewOd=pondelokPre(iso); save(); prepni("planovac"); planZobraz("tyzden"); }
function renderKalendar(){ const grid=document.getElementById("kal-grid"), lab=document.getElementById("kal-label"); if(!grid)return;
  const rok=kalD.getFullYear(), mes=kalD.getMonth();
  const mena=["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"];
  if(lab)lab.textContent=mena[mes]+" "+rok;
  const mapa={}; (S.uvarene||[]).forEach(u=>{ const r=receptById(u.id); (mapa[u.datum]=mapa[u.datum]||[]).push(r?r.nazov:u.id); });
  const start=(new Date(rok,mes,1).getDay()+6)%7, dniVMes=new Date(rok,mes+1,0).getDate(), dnes=dnesISO();
  const dow=["Po","Ut","St","Št","Pi","So","Ne"];
  let h='<div class="kal">'+dow.map(d=>`<div class="dow">${d}</div>`).join("");
  for(let i=0;i<start;i++) h+='<div class="day mimo"></div>';
  for(let d=1;d<=dniVMes;d++){ const iso=rok+"-"+String(mes+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); const ev=mapa[iso]||[];
    const naplanovane=S.plan[iso]&&Object.keys(S.plan[iso]).length>0;
    h+=`<div class="day${iso===dnes?' dnes':''}" style="cursor:pointer" title="Ísť na týždeň tohto dňa v Pláne" onclick="skokNaTyzdenDna('${iso}')"><div class="dn">${d}${naplanovane?'<span class="plan-dot" title="naplánované">●</span>':''}</div>${ev.map(n=>`<div class="ev" title="${n}">${n}</div>`).join("")}</div>`; }
  h+="</div>"; if(!(S.uvarene||[]).length) h+='<p class="info" style="margin-top:10px">Zatiaľ žiadna história. Po dokončení režimu varenia sa jedlo zapíše do kalendára.</p>';
  grid.innerHTML=h; }
function planVarenia(di){ const dni=blokDni(di); const den=S.plan[datumPre(dni[0])]||{};
  const bi=bloky().findIndex(b=>b[0]===dni[0]); const pism=String.fromCharCode(65+(bi<0?0:bi)); const vari=DNI[(dni[0]+6)%7].slice(0,2);
  let h=`<div class="hero"><button class="close" onclick="zavri()">✕</button><h2>🍳 Plán varenia — Blok ${pism}</h2><div class="subx">${DNI[dni[0]].slice(0,2)}–${DNI[dni[dni.length-1]].slice(0,2)} · varí sa ${vari} večer</div></div><div class="content2">`;
  let any=false;
  slotyDna(dni[0]).forEach(sl=>{ const ids=slotIds(dni[0],sl); if(!ids.length)return; any=true; h+=`<h4 class="sekcia">${ikony[sl]||""} ${sl}</h4>`;
    ids.forEach(cid=>{ const k=komponent(cid); if(!k)return; const por=porcieSlotBlok(dni[0],sl,cid); const btn=k._priloha?"":`<button class="mini" onclick="zavri();otvor('${cid}',{di:${dni[0]},slot:'${sl}'})">recept</button>`;
      h+=`<div class="sp-row"><span><b>${pripravaVopred(k)?"⏰ ":""}${k.nazov}</b> <span class="meta2">${por} porcií · ${Math.round(kcalPorcia(k))} kcal/porcia</span></span>${btn}</div>`; }); });
  if(!any) h+='<p class="info">V tomto bloku nie sú naplánované jedlá. Zostav jedálniček alebo klikni do buniek.</p>';
  else h+=`<div class="tipy">💡 Navar dávku na celý blok (${dni.length} dni × ${stravniciList().length} os.). Presné porcie sú pri každom jedle; suroviny spolu nájdeš v Nákupe.</div>`;
  h+="</div>"; document.getElementById("modal").innerHTML=h; document.getElementById("overlay").classList.add("open"); document.body.style.overflow="hidden"; }
function renderOkno(){ const el=document.getElementById("dash-okno"); if(!el)return; const pan=document.getElementById("okno-panel");
  if(!S.profil.okno){ el.innerHTML=""; if(pan)pan.style.display="none"; return; } if(pan)pan.style.display="";
  const st=S.profil.oknostart||12; const en=(st+8)%24; const now=new Date().getHours()+new Date().getMinutes()/60;
  const vOkne = st<en ? (now>=st&&now<en) : (now>=st||now<en);
  el.innerHTML = `🕒 Okno jedenia ${st}:00–${en}:00 · ${vOkne?'<span class="exp-soon">teraz môžeš jesť</span>':'mimo okna (pôst)'}`; }
function zapisVahu(){ const kg=parseFloat(document.getElementById("v-vaha").value); if(!kg){toast("Zadaj váhu.");return;} const d=dnesISO();
  const ex=S.vahy.find(x=>x.d===d); if(ex)ex.kg=kg; else S.vahy.push({d:d,kg:kg}); S.vahy.sort((a,b)=>a.d.localeCompare(b.d)); save(); document.getElementById("v-vaha").value=""; renderVahy(); }
// NS1: trend cez lineárnu regresiu (least squares) — odolnejšie voči dennému šumu než prvý-vs-posledný bod
function tyzdennaZmena(){ const v=S.vahy; if(v.length<2)return null; const t0=new Date(v[0].d).getTime();
  const xs=v.map(p=>(new Date(p.d).getTime()-t0)/86400000); if((xs[xs.length-1]-xs[0])<1)return null;
  const n=v.length, mx=xs.reduce((a,b)=>a+b,0)/n, my=v.reduce((a,p)=>a+p.kg,0)/n;
  let num=0,den=0; for(let i=0;i<n;i++){ num+=(xs[i]-mx)*(v[i].kg-my); den+=(xs[i]-mx)*(xs[i]-mx); }
  return den?num/den*7:null; }
function emaVahy(){ const v=S.vahy, a=0.3, out=[]; v.forEach((p,i)=>{ out[i]= i===0?p.kg : a*p.kg+(1-a)*out[i-1]; }); return out; } // NS1: vyhladený trend
function sparkVahy(){ const v=S.vahy; if(v.length<2)return ""; const W=300,H=70,P=8;
  const ks=v.map(x=>x.kg); const mn=Math.min(...ks),mx=Math.max(...ks),rng=(mx-mn)||1;
  const x=i=>P+i*(W-2*P)/(v.length-1); const y=k=>H-P-(k-mn)/rng*(H-2*P);
  const pts=v.map((p,i)=>x(i).toFixed(1)+","+y(p.kg).toFixed(1)).join(" ");
  const dots=v.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.5" fill="var(--accent-dark)"></circle>`).join("");
  const ema=emaVahy(); const emaPts=v.map((p,i)=>x(i).toFixed(1)+","+y(ema[i]).toFixed(1)).join(" "); // NS1: trendová čiara
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;margin-top:10px" preserveAspectRatio="xMidYMid meet">
    <polyline points="${pts}" fill="none" stroke="var(--line)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
    <polyline points="${emaPts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>${dots}
    <text x="${P}" y="12" font-size="10" fill="var(--muted)">${fmt(mx)} kg</text>
    <text x="${P}" y="${H-1}" font-size="10" fill="var(--muted)">${fmt(mn)} kg</text></svg>`; }
function renderVahy(){ const el=document.getElementById("vahy-info"); if(!el)return; if(!S.vahy.length){el.innerHTML="Zatiaľ žiadny záznam.";return;}
  const last=S.vahy[S.vahy.length-1]; const z=tyzdennaZmena();
  el.innerHTML=`Posledná: <b>${fmt(last.kg)} kg</b> (${last.d})${z!==null?" · trend <b>"+(z>0?"+":"")+fmt(z)+" kg/týž</b> ("+S.vahy.length+" meraní)":" · pre trend zapíš aspoň 2 merania"}`+sparkVahy(); }
function prispobitCiel(){ const z=tyzdennaZmena(); const ok=document.getElementById("vaha-ok"); if(z===null){ok.textContent="Potrebujem aspoň 2 merania s odstupom.";return;}
  const ciel=S.profil.cielTyp||"udrzanie"; let uprava=0;
  if(ciel==="chudnutie"){ if(z>-0.25)uprava=-150; else if(z<-0.8)uprava=100; }
  else if(ciel==="priberanie"){ if(z<0.25)uprava=150; else if(z>0.6)uprava=-100; }
  else { if(z>0.3)uprava=-120; else if(z<-0.3)uprava=120; }
  if(!uprava){ ok.textContent="Trend sedí s cieľom — netreba meniť."; return; }
  S.profil.kcal=Math.max(1000,(parseInt(S.profil.kcal)||1450)+uprava); save(); naplnProfil();
  ok.textContent="Cieľ upravený o "+(uprava>0?"+":"")+uprava+" kcal → "+S.profil.kcal+" kcal/deň."; }
// --- voliteľná synchronizácia PC <-> mobil (Supabase); aktivuje sa až keď existuje sync-config.js ---
let syncTimer=null;
function syncId(){ return (S.profil.syncId||"").trim() || ((typeof SYNC_CONFIG!=="undefined"&&SYNC_CONFIG)?SYNC_CONFIG.id:""); }
function syncNakonfig(){ return !S.profil.syncOff && typeof SYNC_CONFIG!=="undefined" && SYNC_CONFIG && SYNC_CONFIG.url && SYNC_CONFIG.key && !!syncId(); }
// --- viditeľný stav synchronizácie + toast pri chybe ---
const SYNC_TS_LS="kucharka_sync_ts"; let _syncStav="idle", _syncErrOznamene=false;
function syncCasText(){ const t=parseInt(localStorage.getItem(SYNC_TS_LS)||"0"); if(!t)return ""; const s=Math.floor((Date.now()-t)/1000);
  if(s<60)return "pred chvíľou"; if(s<3600)return "pred "+Math.floor(s/60)+" min"; if(s<86400)return "pred "+Math.floor(s/3600)+" h"; return new Date(t).toLocaleDateString("sk"); }
function setSyncStav(stav){ _syncStav=stav;
  if(stav==="ok"){ try{localStorage.setItem(SYNC_TS_LS,String(Date.now()))}catch(e){} _syncErrOznamene=false; }
  if(stav==="error" && !_syncErrOznamene){ _syncErrOznamene=true; toast("⚠ Synchronizácia zlyhala — dáta sú uložené lokálne."); }
  renderSyncStav(); }
function renderSyncStav(){ const el=document.getElementById("sync-stav"); if(!el)return;
  if(!syncMozne()){ el.innerHTML='<span class="info">Nie je nastavená — dáta sú len v tomto zariadení.</span>'; return; }
  if(S.profil.syncOff){ el.innerHTML='<span class="info">Na tomto zariadení vypnutá.</span>'; return; }
  let ic,txt;
  if(!navigator.onLine){ ic="⚪"; txt="Offline — zmeny sa nahrajú po pripojení"; }
  else if(_syncStav==="saving"){ ic="⏳"; txt="Ukladám…"; }
  else if(_syncStav==="error"){ ic="🔴"; txt="Chyba synchronizácie"; }
  else { const c=syncCasText(); ic="🟢"; txt="Synchronizované"+(c?" · "+c:""); }
  el.innerHTML=`<b>${ic} ${txt}</b>`; }
window.addEventListener("online",renderSyncStav); window.addEventListener("offline",renderSyncStav);
function syncPush(){ if(!syncNakonfig())return; clearTimeout(syncTimer); syncTimer=setTimeout(async()=>{ try{ setSyncStav("saving"); S._ts=Date.now(); localStorage.setItem(LS,JSON.stringify(S));
  await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka",{method:"POST",headers:{apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify({id:syncId(),data:S,ts:S._ts})}); setSyncStav("ok"); }catch(e){ setSyncStav("error"); } },1500); }
async function syncPull(){ if(!syncNakonfig())return; try{
  const r=await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka?id=eq."+encodeURIComponent(syncId())+"&select=data,ts",{headers:{apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key}});
  const j=await r.json(); setSyncStav("ok"); if(Array.isArray(j)&&j[0]&&j[0].ts>((S._ts)||0)){ S=Object.assign(S,j[0].data); uloz(S); location.reload(); } }catch(e){ setSyncStav("error"); } }
// --- prihlásenie (Supabase Auth) + skupiny + cielený sync len zdieľaných polí ---
const AUTH_LS="kucharka_auth";
const SHARED_FIELDS=["plan","planF","nakupCheck","nakupManual","spajza","spSid"];
let skupTimer=null;
function authNacitaj(){ try{return JSON.parse(localStorage.getItem(AUTH_LS))||null}catch(e){return null} }
function authUloz(a){ if(a)localStorage.setItem(AUTH_LS,JSON.stringify(a)); else localStorage.removeItem(AUTH_LS); }
function authUser(){ const a=authNacitaj(); return a&&a.user?a.user:null; }
function syncMozne(){ return typeof SYNC_CONFIG!=="undefined" && SYNC_CONFIG && SYNC_CONFIG.url && SYNC_CONFIG.key; }
function authHeaders(){ const a=authNacitaj(); return {apikey:SYNC_CONFIG.key, Authorization:"Bearer "+((a&&a.access_token)||SYNC_CONFIG.key), "Content-Type":"application/json"}; }
async function authRefresh(){ const a=authNacitaj(); if(!a||!a.refresh_token)return false;
  try{ const r=await fetch(SYNC_CONFIG.url+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:SYNC_CONFIG.key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:a.refresh_token})});
    if(!r.ok)return false; const j=await r.json(); authUloz({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user}); return true; }catch(e){ return false; } }
async function authFetch(url,opts){ opts=opts||{}; opts.headers=Object.assign({},authHeaders(),opts.headers||{});
  let r=await fetch(url,opts);
  if(r.status===401 && await authRefresh()){ opts.headers=Object.assign({},authHeaders(),opts.headers||{}); r=await fetch(url,opts); }
  return r; }
async function authLogin(email,pass){ if(!syncMozne())throw new Error("Synchronizácia nie je nastavená.");
  const r=await fetch(SYNC_CONFIG.url+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:SYNC_CONFIG.key,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
  const j=await r.json(); if(!r.ok||!j.access_token)throw new Error(j.error_description||j.msg||"Prihlásenie zlyhalo.");
  authUloz({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user});
  await syncOsobnePull(); }
async function authSignup(email,pass){ if(!syncMozne())throw new Error("Synchronizácia nie je nastavená.");
  const r=await fetch(SYNC_CONFIG.url+"/auth/v1/signup",{method:"POST",headers:{apikey:SYNC_CONFIG.key,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
  const j=await r.json(); if(!r.ok)throw new Error(j.error_description||j.msg||j.error||"Registrácia zlyhala.");
  if(j.access_token){ authUloz({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user}); }
  else { await authLogin(email,pass); return; }
  // nový účet: nahraj doň aktuálne (lokálne) osobné dáta ako počiatočné
  S._uid=(authUser()||{}).id; uloz(S); await syncOsobnePush(true); }
async function authLogout(){ try{ await syncOsobnePush(true); await syncSkupinaPush(true); }catch(e){}
  authUloz(null); try{ localStorage.removeItem(LS); }catch(e){} location.reload(); }
function randKod(){ const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const buf=new Uint32Array(10); crypto.getRandomValues(buf); let s=""; for(let i=0;i<10;i++)s+=abc[buf[i]%abc.length]; return "RODINA-"+s; } // 10× z 32-znak. abecedy (~50 bit) cez CSPRNG; abc.length delí 2^32 => bez modulo bias. ponytail: rate-limit na pridaj_sa je serverový strop, netreba pre domácnosť
async function skupinaVytvor(nazov){ if(!authUser())throw new Error("Najprv sa prihlás.");
  // id generujeme klientom + return=minimal — owner nevidí skupinu cez SELECT, kým nie je členom (RLS), takže sa nečíta späť
  const kod=randKod(); const sid=crypto.randomUUID(); const nz=nazov||"Moja domácnosť";
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/skupiny",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({id:sid,nazov:nz,kod,owner:authUser().id})});
  if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error(e.message||"Nepodarilo sa vytvoriť skupinu."); }
  const rc=await authFetch(SYNC_CONFIG.url+"/rest/v1/clenstvo",{method:"POST",body:JSON.stringify({skupina_id:sid})});
  if(!rc.ok){ const e=await rc.json().catch(()=>({})); throw new Error(e.message||"Nepodarilo sa pridať členstvo."); }
  S.profil.skupinaId=sid; S.profil.skupinaKod=kod; S.profil.skupinaNazov=nz; uloz(S);
  await syncSkupinaPush(true); }
async function skupinaPripoj(kod){ if(!authUser())throw new Error("Najprv sa prihlás.");
  kod=(kod||"").trim().toUpperCase();
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/rpc/pridaj_sa",{method:"POST",body:JSON.stringify({kod})});
  const j=await r.json(); if(!r.ok||!j)throw new Error((j&&j.message)||"Neplatný kód.");
  S.profil.skupinaId=j; S.profil.skupinaKod=kod; S.profil.skupinaNazov=""; uloz(S);
  await syncSkupinaPull(); }
async function skupinaOpusti(){ const sid=S.profil.skupinaId; if(sid&&authUser()){ try{ await authFetch(SYNC_CONFIG.url+"/rest/v1/clenstvo?skupina_id=eq."+encodeURIComponent(sid),{method:"DELETE"}); }catch(e){} }
  S.profil.skupinaId=""; S.profil.skupinaKod=""; S.profil.skupinaNazov=""; uloz(S); }
function skupinaNakonfig(){ return syncMozne() && !!authUser() && !!S.profil.skupinaId; }
// --- osobné dáta viazané na účet (obľúbené, plán, nastavenia…) ---
// V skupine sú SHARED_FIELDS majetkom skupiny (idú do skupina_data), preto ich osobný blob vynecháva;
// bez skupiny je plán/nákup/špajza osobný a ukladá sa tiež k účtu.
let osobTimer=null;
const OSOB_META=["_ts","_osobTs","_skupTs","_uid"];
function osobneExcl(){ return S.profil.skupinaId ? SHARED_FIELDS : []; }
function zbierOsobne(){ const o={}; const ex=osobneExcl(); for(const k in S){ if(OSOB_META.includes(k)||ex.includes(k))continue; o[k]=S[k]; } return o; }
function pouziOsobne(d){ const ex=osobneExcl(); for(const k in d){ if(OSOB_META.includes(k)||ex.includes(k))continue; S[k]=d[k]; } }
// ponytail: osobný blob = posledný vyhráva; pull pri prihlásení/štarte (nie pri každom fokuse) — pre 1 osobu na viacerých zariadeniach stačí
function syncOsobnePush(hned){ if(!syncMozne()||!authUser())return Promise.resolve(); clearTimeout(osobTimer);
  return new Promise(res=>{ osobTimer=setTimeout(async()=>{ try{ setSyncStav("saving"); S._osobTs=Date.now(); uloz(S);
    await authFetch(SYNC_CONFIG.url+"/rest/v1/pouzivatel_data",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({user_id:authUser().id,data:zbierOsobne(),ts:S._osobTs})}); setSyncStav("ok"); }catch(e){ setSyncStav("error"); } res(); }, hned?0:1500); }); }
async function syncOsobnePull(){ if(!syncMozne()||!authUser())return; try{
  const uid=authUser().id;
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/pouzivatel_data?user_id=eq."+encodeURIComponent(uid)+"&select=data,ts");
  const j=await r.json(); setSyncStav("ok");
  if(Array.isArray(j)&&j[0]&&j[0].data){
    if(j[0].ts>((S._osobTs)||0) || S._uid!==uid){ pouziOsobne(j[0].data); S._osobTs=j[0].ts; S._uid=uid; uloz(S); location.reload(); return; }
    S._uid=uid; uloz(S);
  } else {
    // účet zatiaľ nemá dáta — pri prepnutí na iný účet vyčisti lokál, nech nededí cudzie údaje
    if(S._uid && S._uid!==uid){ try{localStorage.removeItem(LS);}catch(e){} location.reload(); return; }
    S._uid=uid; uloz(S);
  } }catch(e){ setSyncStav("error"); } }
function zbierZdielane(){ const o={}; SHARED_FIELDS.forEach(f=>o[f]=S[f]); return o; }
// ponytail: zdieľaný blob = posledný vyhráva + pull pri fokuse; per-field merge/realtime len ak sa domácnosť často „bije" o tú istú bunku
function syncSkupinaPush(hned){ if(!skupinaNakonfig())return Promise.resolve(); clearTimeout(skupTimer);
  return new Promise(res=>{ skupTimer=setTimeout(async()=>{ try{ setSyncStav("saving"); S._skupTs=Date.now(); uloz(S);
    await authFetch(SYNC_CONFIG.url+"/rest/v1/skupina_data",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({skupina_id:S.profil.skupinaId,data:zbierZdielane(),ts:S._skupTs})}); setSyncStav("ok"); }catch(e){ setSyncStav("error"); } res(); }, hned?0:1500); }); }
async function syncSkupinaPull(){ if(!skupinaNakonfig())return; try{
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/skupina_data?skupina_id=eq."+encodeURIComponent(S.profil.skupinaId)+"&select=data,ts");
  const j=await r.json(); setSyncStav("ok"); if(Array.isArray(j)&&j[0]&&j[0].data&&j[0].ts>((S._skupTs)||0)){ SHARED_FIELDS.forEach(f=>{ if(j[0].data[f]!==undefined)S[f]=j[0].data[f]; }); S._skupTs=j[0].ts; uloz(S);
    if(typeof renderPlan==="function")renderPlan(); if(typeof renderNakup==="function")renderNakup(); if(typeof renderDash==="function")renderDash(); } }catch(e){ setSyncStav("error"); } }
document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ syncSkupinaPull(); } });
if('serviceWorker' in navigator && location.protocol.startsWith('http')){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
syncPull();
(async()=>{ try{ if(typeof authUser==="function"&&authUser())await syncOsobnePull(); }catch(e){} syncSkupinaPull(); })();
applyVzhlad(); naplnKuchyne(); renderChips(); renderKolekcie(); renderGrid(); naplnPotravinyDatalist(); aktualizujJednotky(); renderDash(); zbalNaMobile();
zpristupniNav(); zpristupniFormulare(); // E3 + D6
{ const hv=location.hash.slice(1); if(hv && hv!=="domov" && document.getElementById("v-"+hv)) zobrazView(hv); } // E8: obnov obrazovku z deep-linku
if(_prvySpust && !S.profil.onboarded) onboardingModal(); // Onboarding pri prvom spustení
