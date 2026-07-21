const RECEPTY = __DATA__;
const POTRAVINY = __POTRAVINY__;
const JEDALNICKY = __JEDALNICKY__;
const DNI = ["Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota","Nedeľa"];
const VSETKY_SLOTY = ["Raňajky","Desiata","Obed","Olovrant","Večera","Snack"];
const DEFAULT_SLOTY = ["Raňajky","Obed","Večera","Snack"];
function SLOTY(){ const v=S.profil&&S.profil.sloty; const akt=(Array.isArray(v)&&v.length)?v:DEFAULT_SLOTY; return VSETKY_SLOTY.filter(s=>akt.includes(s)); }
const ikony = {"Raňajky":"🍳","Desiata":"🥐","Obed":"🍝","Olovrant":"🍏","Večera":"🍽️","Hlavné jedlo":"🍽️","Cestoviny":"🍝","Polievka":"🥣","Šalát":"🥗","Nátierka":"🧈","Snack":"🥪","Dezert":"🍰","Príloha":"🍚","Kokteil":"🍸","Nápoj":"🥤","Pečivo":"🥖"};
const SLOT_KATEGORIE = {"Raňajky":["Raňajky","Nátierka","Pečivo"],"Desiata":["Snack","Dezert","Nátierka"],"Obed":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Olovrant":["Snack","Dezert","Nátierka"],"Večera":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Snack":["Snack","Dezert","Nátierka"]};
function jeHlavnyChodSlot(slot){ return (SLOT_KATEGORIE[slot]||[]).includes("Hlavné jedlo"); }
function jeNatierkovySlot(slot){ return (SLOT_KATEGORIE[slot]||[]).includes("Nátierka"); }
function isMain(r){ return ["Hlavné jedlo","Cestoviny","Polievka","Šalát"].includes(r.kategoria); }
function slotPreKategoriu(kat){ for(const sl of SLOTY()){ if((SLOT_KATEGORIE[sl]||[]).includes(kat)) return sl; } return "Obed"; }
const SEZONA = {"paradajk":[6,7,8,9],"cuketa":[6,7,8,9],"baklažán":[7,8,9],"jahod":[5,6,7],"špargľa":[4,5],"tekvica":[9,10,11],"uhork":[5,6,7,8,9],"paprika":[7,8,9,10],"kapia":[8,9,10],"jablk":[9,10,11],"jarná cibuľka":[4,5,6],"brokolica":[6,9,10],"špenát":[4,5,9,10],"reďkov":[4,5,6],"marhul":[6,7],"slivk":[8,9]};
function jeSezonne(r){ const m=new Date().getMonth()+1; let inS=0,out=0;
  (r.ingrediencie||[]).forEach(i=>{ const n=i.nazov.toLowerCase(); for(const k in SEZONA){ if(n.includes(k)){ if(SEZONA[k].includes(m))inS++; else out++; break; } } });
  return inS>0 && inS>=out; }
const SUBSTITUCIE = {"maslo":["olej","kokosový tuk"],"smotana":["grécky jogurt","kokosové mlieko"],"smotanový jogurt":["biely jogurt","kyslá smotana"],"shaoxing":["suché sherry","biele víno"],"pecorino":["parmezán","grana padano"],"olivový olej":["repkový olej","slnečnicový olej"],"cukor":["med (menej)","javorový sirup"],"hnedý cukor":["biely cukor + trocha melasy"],"citrón":["limetka","biely ocot (kvapka)"],"jarná cibuľka":["pórik","cibuľa"],"píniové oriešky":["vlašské orechy","mandle"],"eidam":["gouda","syr na strúhanie"]};
const LS="kucharka_v2";
function nacitaj(){try{return JSON.parse(localStorage.getItem(LS))||{}}catch(e){return {}}}
function uloz(s){try{localStorage.setItem(LS,JSON.stringify(s))}catch(e){}}
let S = nacitaj();
S.fav=S.fav||{}; S.hodn=S.hodn||{}; S.pozn=S.pozn||{}; S.plan=S.plan||{}; S.ciel=S.ciel||""; S.nakupCheck=S.nakupCheck||{}; S.uvarene=S.uvarene||[]; S.planF=S.planF||{}; S.archiv=S.archiv||[]; S.domaNakup=S.domaNakup||""; S.akcie=S.akcie||""; S.blokMode=(S.blokMode!==undefined?S.blokMode:true);
if(!Array.isArray(S.hranice)||S.hranice.length!==7){ S.hranice=[true,false,true,false,false,true,false]; }
else if(S.blokV!==6 && JSON.stringify(S.hranice)===JSON.stringify([true,false,true,false,true,false,true])){ S.hranice=[true,false,true,false,false,true,false]; }
S.blokV=6; S.spajza=S.spajza||[]; S.voda=S.voda||{}; S.spSid=S.spSid||1; S.vahy=S.vahy||[]; S.nakupManual=S.nakupManual||[];
S.genCfg=Object.assign({zachovat:false,cielMode:true,filtre:[]}, S.genCfg||{});
S.dayPpl=S.dayPpl||{}; S.slotPpl=S.slotPpl||{}; S.daySloty=S.daySloty||{};
S.skryte=S.skryte||{}; // recepty skryté z generátora/plánu (nie zmazané) — kľúč=id
S.mojeRecepty=S.mojeRecepty||[];
if(Array.isArray(S.mojeRecepty)) S.mojeRecepty.forEach(r=>{ if(!RECEPTY.some(x=>x.id===r.id)) RECEPTY.push(r); });
const VERZIA="v16";
S.profil=Object.assign({osoby:2,kcal:1450,biel:0,ryby:false,lepok:false,mlieko:false,dark:false,big:false,balenia:true,watch:"",zakazane:"",kupSnack:true,cielTyp:"udrzanie",okno:false,oknostart:12,syncId:"",syncOff:false,skupinaId:"",skupinaKod:"",skupinaNazov:"",sloty:DEFAULT_SLOTY.slice()}, S.profil||{});
if(S.ciel && !S.profil._migr){ S.profil.kcal=parseInt(S.ciel)||S.profil.kcal; S.profil._migr=1; }
function save(){uloz(S); if(typeof syncPush==="function")syncPush(); if(typeof syncSkupinaPush==="function")syncSkupinaPush();}

function najdiPotravinu(nazov){
  const n=nazov.toLowerCase(); let best=null,dl=-1;
  for(const p of POTRAVINY){ if(n.includes(p.kluc)&&p.kluc.length>dl){best=p;dl=p.kluc.length;} }
  return best;
}
// ml na jednotku pre objemové/lyžicové jednotky
const ML_JED={"pl":15,"lyžica":15,"lyzica":15,"polievková lyžica":15,"čl":5,"cl":5,"lyžička":5,"lyzicka":5,"šálka":250,"salka":250,"hrnček":250,"hrncek":250,"pohár":250,"pohar":250,"dcl":100,"dl":100,"l":1000,"liter":1000};
// približná hmotnosť v g pre počítateľné jednotky bez g_za_ks (ponytail: hrubé defaulty; presné hodnoty patria do potraviny.json v Etape 3)
const KS_DEF={"strúčik":5,"strucik":5,"plátok":20,"platok":20,"list":3,"lístok":1,"listok":1,"hlávka":300,"hlavka":300,"hrsť":30,"hrst":30,"štipka":0.5,"stipka":0.5,"zväzok":60,"zvazok":60,"vetvička":2,"vetvicka":2,"stredná":150,"stredny":150,"stredné":150};
function gramy(ing,p){
  if(ing.mnozstvo==null) return 0;
  const j=(ing.jednotka||"").toLowerCase().trim();
  const h=(p&&p.hustota)||1;
  if(j==="g"||j==="gram"||j==="gramov") return ing.mnozstvo;
  if(j==="kg") return ing.mnozstvo*1000;
  if(j==="ml") return ing.mnozstvo*h;
  if(ML_JED[j]!=null) return ing.mnozstvo*ML_JED[j]*h;
  const gk=(p&&p.g_za_ks)||0;
  if(gk) return ing.mnozstvo*gk;
  if(KS_DEF[j]!=null) return ing.mnozstvo*KS_DEF[j];
  if(j==="ks"||j==="kus"||j==="rožok"||j==="rozok"||j==="žemľa"||j==="zemla") return ing.mnozstvo*60; // ponytail: default ks bez g_za_ks
  return 0; // neznáma/popisná jednotka ("na cesto", "dresing"…) — dátový problém, rieši sa čistením dát
}
function jeTekutina(p){ if(!p)return false; if(p.oddelenie==="Oleje a tuky")return true;
  return /mlieko|olej|ocot|víno|vino|vývar|vyvar|smotan|šťav|stav|sirup|voda|kečup|kecup|omáčk|omack|jogurt|nápoj|napoj|džús|dzus|pivo|med|pasírované|passata/.test(p.kluc); }
function povoleneJednotky(p){ if(!p) return ["g","kg","ks","ml","l","balenie"];
  const u=[]; if(p.g_za_ks) u.push("ks"); if(jeTekutina(p)){ u.push("ml","l"); } u.push("g","kg"); if(!u.includes("ks"))u.push("ks"); u.push("balenie");
  return [...new Set(u)]; }
function krokPreJednotku(jed){ const j=(jed||"").toLowerCase(); if(j==="kg"||j==="l")return 0.1; if(j==="ks"||j==="balenie")return 1; return 10; }
function gramyNaJed(g,jed,p){ const j=(jed||"").toLowerCase().trim(); const h=(p&&p.hustota)||1;
  if(j==="g"||j==="gram")return g; if(j==="kg")return g/1000; if(j==="ml")return g/h; if(ML_JED[j]!=null)return g/(ML_JED[j]*h);
  const gk=(p&&p.g_za_ks)||0; if(gk&&(j==="ks"||j==="kus"))return g/gk; if(KS_DEF[j]!=null)return g/KS_DEF[j]; if(j==="ks"||j==="kus")return g/60; return null; }
function vyzivaReceptu(r){
  let kc=0,b=0,t=0,s=0,cena=0,vl=0,na=0,zname=false;
  (r.ingrediencie||[]).forEach(i=>{
    const p=najdiPotravinu(i.nazov);
    if(!p){ if(i.mnozstvo!=null) zname=true; return; }
    const g=gramy(i,p);
    kc+=g*p.kcal/100; b+=g*p.bielkoviny/100; t+=g*p.tuky/100; s+=g*p.sacharidy/100;
    cena+=g*(p.cena100||0)/100; vl+=g*(p.vlaknina||0)/100; na+=g*(p.sodik||0)/100;
  });
  const por=r.porcie||1;
  return {kcal:kc/por,b:b/por,t:t/por,s:s/por,cena:cena/por,vl:vl/por,na:na/por,pribl:zname};
}
function kcalPorcia(r){ const v=vyzivaReceptu(r); return v.kcal>5?Math.round(v.kcal):(r.kcal_na_porciu||0); }
function cenaPorcia(r){ return vyzivaReceptu(r).cena; }
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
function escHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function casMin(r){ const m=(r.cas||"").match(/(\d+)\s*hod/); const mm=(r.cas||"").match(/(\d+)\s*min/);
  let t=0; if(m)t+=parseInt(m[1])*60; if(mm)t+=parseInt(mm[1]); return t||999; }
function receptById(id){ return RECEPTY.find(r=>r.id===id); }

function prepni(v){
  document.querySelectorAll(".side nav a,.side .foot a,.botnav a").forEach(t=>t.classList.toggle("active",t.dataset.v===v));
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("active"));
  const el=document.getElementById("v-"+v); if(el)el.classList.add("active");
  window.scrollTo(0,0);
  if(v==="domov") renderDash();
  if(v==="planovac") renderPlan();
  if(v==="nakup") renderNakup();
  if(v==="vyziva") renderVyziva();
  if(v==="nastavenia") naplnProfil();
  if(v==="spajza") renderSpajza();
}
function tlacView(v){ prepni(v);
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("printme"));
  document.getElementById("v-"+v).classList.add("printme"); window.print(); }
let aktivnaKat="Všetko";
function kategorie(){ const s=new Set(RECEPTY.map(r=>r.kategoria).filter(Boolean)); return ["Všetko",...Array.from(s).sort()]; }
function naplnKuchyne(){ const sel=document.getElementById("f-kuchyna");
  const s=new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean));
  Array.from(s).sort().forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;sel.appendChild(o);}); }
function renderChips(){ const box=document.getElementById("chips"); box.innerHTML="";
  kategorie().forEach(k=>{ const el=document.createElement("div"); el.className="chip"+(k===aktivnaKat?" active":""); el.textContent=k;
    el.onclick=()=>{aktivnaKat=k;renderChips();renderGrid();}; box.appendChild(el); }); }
function zakazaneTokens(){ return (S.profil.zakazane||"").split(/[\n,;]+/).map(x=>bezDia(x.trim())).filter(Boolean); }
// ponytail: matchujem názov receptu + tagy, nielen ingrediencie (chytí "Pečené kura" aj keď ingrediencia je "kurčatá"). Zámerne len substring — kmeňový match by chytal aj kurkuma/kuriatka
function zakazaneChyta(r){ const zt=zakazaneTokens(); if(!zt.length)return false;
  const hay=bezDia((r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.tagy||[]).join(" "));
  return zt.some(t=>hay.includes(t)); }
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
  const db=[jeWatch(r)?'<span class="badge">⭐</span>':'',jeVakcii(r)?'<span class="badge price">🏷️ akcia</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 veg</span>':''].join('');
  const thumb=r.foto?'<img src="recepty/fotky/'+r.foto+'" alt="">':(ikony[r.kategoria]||"🍴");
  return '<button class="fav" onclick="event.stopPropagation();toggleFav(\''+r.id+'\')">'+(S.fav[r.id]?"★":"☆")+'</button>'+
    '<div class="thumb" onclick="otvor(\''+r.id+'\')">'+thumb+'</div>'+
    '<div class="body" onclick="otvor(\''+r.id+'\')">'+
      '<span class="kat">'+(r.kategoria||"")+'</span><h3>'+r.nazov+'</h3>'+
      '<div class="meta">'+(r.cas?'<span>⏱ '+r.cas+'</span>':"")+(kc?'<span>🔥 '+kc+' kcal</span>':"")+(v.cena>0.01?'<span>💶 '+eur(v.cena)+'</span>':"")+'</div>'+
      (v.kcal>5?'<div class="macros">B '+fmt(v.b)+' · T '+fmt(v.t)+' · S '+fmt(v.s)+' g</div>':'')+
      '<div class="stars">'+(hod?"★".repeat(hod)+"☆".repeat(5-hod):"")+'</div>'+
      '<div class="diet">'+db+'</div></div>';
}
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
    if(aktivnaKat!=="Všetko"&&r.kategoria!==aktivnaKat) return false;
    if(fk&&r.kuchyna!==fk) return false;
    if(fc&&casMin(r)>fc) return false;
    if(fd==="fav"&&!S.fav[r.id]) return false;
    if(fd==="veg"&&!diety(r).veg) return false;
    if(fd==="lepok"&&!diety(r).bezlepku) return false;
    if(fd==="mlieko"&&!diety(r).bezlaktozy) return false;
    if(q){ const hay=bezDia(r.nazov+" "+(r.popis||"")+" "+(r.tagy||[]).join(" ")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")); if(!hay.includes(q)) return false; }
    return true;
  });
  if(fs==="nazov") zoz.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk"));
  else if(fs==="cas") zoz.sort((a,b)=>(casMin(a)||999)-(casMin(b)||999));
  else if(fs==="kcal") zoz.sort((a,b)=>(kcalPorcia(a)||0)-(kcalPorcia(b)||0));
  else if(fs==="kcald") zoz.sort((a,b)=>(kcalPorcia(b)||0)-(kcalPorcia(a)||0));
  else if(fs==="hodn") zoz.sort((a,b)=>(S.hodn[b.id]||0)-(S.hodn[a.id]||0));
  document.getElementById("empty").style.display=zoz.length?"none":"block";
  zoz.forEach(r=>{ const c=document.createElement("div"); c.className="card"+(S.skryte[r.id]?" skryty":""); c.innerHTML=kartaHTML(r); grid.appendChild(c); });
}
function toggleFav(id){ S.fav[id]=!S.fav[id]; if(!S.fav[id])delete S.fav[id]; save(); renderGrid(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }
function toggleSkryt(id){ if(S.skryte[id])delete S.skryte[id]; else S.skryte[id]=1; save(); renderGrid(); otvor(id); }
let novyIngRows=0;
function novyRecept(){ novyIngRows=0; const IST="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px";
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
  document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open");
  pridajIngRiadok(); pridajIngRiadok(); pridajIngRiadok(); }
function pridajIngRiadok(){ const box=document.getElementById("nr-ing"); if(!box)return;
  const d=document.createElement("div"); d.className="controls"; d.style.marginBottom="6px"; d.style.padding="0";
  d.innerHTML=`<input list="potraviny-dl" class="nr-in" placeholder="surovina" style="flex:1;min-width:120px;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" class="nr-mn" placeholder="množ." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px"><input class="nr-jed" list="jedn-dl" placeholder="jedn." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px">`;
  box.appendChild(d); novyIngRows++; }
function ulozNovyRecept(){ const nazov=escHtml((document.getElementById("nr-nazov").value||"").trim()); if(!nazov){alert("Zadaj názov receptu.");return;}
  const ing=[]; document.querySelectorAll("#nr-ing .controls").forEach(row=>{ const n=(row.querySelector(".nr-in").value||"").trim(); if(!n)return;
    const mn=parseFloat(row.querySelector(".nr-mn").value); const jed=(row.querySelector(".nr-jed").value||"").trim();
    ing.push({nazov:escHtml(n),mnozstvo:isNaN(mn)?null:mn,jednotka:escHtml(jed)}); });
  if(!ing.length){ alert("Pridaj aspoň jednu surovinu."); return; }
  const postup=(document.getElementById("nr-postup").value||"").split(/\n+/).map(x=>escHtml(x.replace(/^\s*\d+[\.\)]\s*/,"").trim())).filter(Boolean);
  const r={ id:"moj-"+(S.spSid++), nazov, kategoria:document.getElementById("nr-kat").value, kuchyna:escHtml((document.getElementById("nr-kuch").value||"").trim()),
    porcie:parseInt(document.getElementById("nr-porcie").value)||2, cas:escHtml((document.getElementById("nr-cas").value||"").trim()), popis:"",
    ingrediencie:ing, postup, tipy:escHtml((document.getElementById("nr-tip").value||"").trim()), foto:"", tagy:["vlastný"], _moj:true };
  S.mojeRecepty.push(r); RECEPTY.push(r); save(); zavriPick(); renderChips(); renderGrid(); otvor(r.id); }
function zmazMojRecept(id){ if(!confirm("Zmazať tento vlastný recept?"))return;
  S.mojeRecepty=S.mojeRecepty.filter(r=>r.id!==id); const i=RECEPTY.findIndex(r=>r.id===id); if(i>=0)RECEPTY.splice(i,1);
  delete S.fav[id]; delete S.hodn[id]; save(); zavri(); renderChips(); renderGrid(); }

let aktualny=null, aktPorcie=1, jednotkaMode="metric";
function otvor(id, ctx){
  const r=receptById(id); if(!r)return; aktualny=r; aktPorcie=(ctx&&ctx.di!==undefined)?Math.max(1,Math.round(porcieNaVar(ctx.di,ctx.slot))):(r.porcie||1); jednotkaMode="metric";
  const al=alergenyReceptu(r); const d=diety(r);
  const foto=r.foto?`<img src="recepty/fotky/${r.foto}" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin-bottom:14px">`:"";
  const badges=[jeVakcii(r)?'<span class="badge price">🏷️ v akcii</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 vegetariánske</span>':'',d.bezlepku?'<span class="badge">bez lepku</span>':'',d.bezlaktozy?'<span class="badge">bez laktózy</span>':'',...al.map(a=>`<span class="badge alerg">⚠ ${a}</span>`)].join('');
  const hod=S.hodn[r.id]||0;
  const stars=[1,2,3,4,5].map(i=>`<span class="${i<=hod?'on':''}" onclick="hodnot('${r.id}',${i})">★</span>`).join('');
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
        <div class="stepper"><button onclick="zmenPorcie(-1)">−</button><span id="pnum">${aktPorcie}</span><button onclick="zmenPorcie(1)">+</button></div>
        <button class="mini" onclick="naJednu()">na 1 porciu</button>
        <select class="mini" id="unit-mode" onchange="setUnitMode(this.value)"><option value="metric">g / ml</option><option value="spoon">lyžice</option><option value="imperial">oz / cup</option></select></div>
      <div class="nutri" id="nutri"></div>
      <div id="nutri-spolu" class="info" style="margin:-2px 0 6px"></div>
      ${detailMeta}
      <h4 class="sekcia">Ingrediencie</h4><table class="ing"><tbody id="ing-body"></tbody></table>
      <div id="subst-box"></div>
      <h4 class="sekcia">Postup</h4><ol class="postup" id="postup-ol"></ol>
      ${r.tipy?`<div class="tipy">💡 <b>Tip:</b> ${r.tipy}</div>`:""}
      ${r.zdroj?`<div class="zdroj">Zdroj: ${r.zdroj}</div>`:""}
      <div class="hodnotenie"><span>Hodnotenie:</span><div class="starpick">${stars}</div>
        <button class="mini" onclick="hodnot('${r.id}',0)">zrušiť</button></div>
      <textarea class="pozn" id="poznamka" placeholder="Moja poznámka k receptu…" oninput="ulozPozn('${r.id}')">${(S.pozn[r.id]||"").replace(/</g,'&lt;')}</textarea>
      <div class="btn-row">
        <button class="btn primary" onclick="spustiCook()">👨‍🍳 Variť</button>
        <button class="btn" onclick="pridajDoPlanu('${r.id}')">📅 Do plánu</button>
        <button class="btn" onclick="window.print()">🖨 Tlačiť</button>
        <button class="btn" onclick="toggleSkryt('${r.id}')">${S.skryte[r.id]?"👁 Zobraziť v generátore":"🚫 Skryť z generátora"}</button>
        ${r._moj?`<button class="btn" style="color:var(--warn);border-color:var(--warn)" onclick="zmazMojRecept('${r.id}')">🗑 Zmazať</button>`:""}</div>
    </div>`;
  renderIng(); renderSubst();
  document.getElementById("overlay").classList.add("open");
  document.body.style.overflow="hidden";
}
function renderIng(){
  const r=aktualny; const f=r.porcie?(aktPorcie/r.porcie):1; let rows="";
  (r.ingrediencie||[]).forEach(i=>{
    let mn="";
    if(i.mnozstvo!=null){ mn=prevodJednotka(i.mnozstvo*f, i.jednotka||""); }
    else if(i.poznamka){ mn=i.poznamka; }
    const pozn=(i.mnozstvo!=null&&i.poznamka)?` <span class="pozn">(${i.poznamka})</span>`:"";
    rows+=`<tr><td>${i.nazov}${pozn}</td><td class="mn">${mn}</td></tr>`;
  });
  document.getElementById("ing-body").innerHTML=rows;
  const v=vyzivaReceptu(r); const box=document.getElementById("nutri");
  if(v.kcal>5){ box.style.display="grid";
    box.innerHTML=`<div><b>${Math.round(v.kcal)}</b><small>kcal/porcia</small></div>
      <div><b>${fmt(v.b)} g</b><small>bielkoviny</small></div>
      <div><b>${fmt(v.t)} g</b><small>tuky</small></div>
      <div><b>${fmt(v.s)} g</b><small>sacharidy</small></div>`;
  } else box.style.display="none";
  const sp=document.getElementById("nutri-spolu");
  if(sp){ if(v.kcal>5 && aktPorcie>1){ sp.style.display="block";
      sp.innerHTML=`Spolu za <b>${aktPorcie} porcií</b>: ${Math.round(v.kcal*aktPorcie)} kcal · B ${fmt(v.b*aktPorcie)} g · T ${fmt(v.t*aktPorcie)} g · S ${fmt(v.s*aktPorcie)} g`;
    } else sp.style.display="none"; }
  const um=document.getElementById("unit-mode"); if(um)um.value=jednotkaMode;
  renderPostup(f);
}
function krokHint(text,f){ const h=bezDia(text); const found=[];
  (aktualny.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; const nm=bezDia(i.nazov); const prve=nm.split(" ")[0];
    if(nm.length>2 && (h.includes(nm)||(prve.length>3&&h.includes(prve)))) found.push(`${i.nazov} ${prevodJednotka(i.mnozstvo*f,i.jednotka||"")}`); });
  return found.length? ` <span class="krok-mn">▸ ${found.join(" · ")}</span>`:""; }
function renderPostup(f){ const ol=document.getElementById("postup-ol"); if(!ol)return;
  ol.innerHTML=(aktualny.postup||[]).map(k=>`<li>${k}${krokHint(k,f)}</li>`).join(""); }
function renderSubst(){
  const r=aktualny; let items=[];
  (r.ingrediencie||[]).forEach(i=>{ const n=i.nazov.toLowerCase();
    for(const k in SUBSTITUCIE){ if(n.includes(k)){ items.push(`<b>${i.nazov}</b> → ${SUBSTITUCIE[k].join(", ")}`); break; } }
  });
  const box=document.getElementById("subst-box");
  box.innerHTML = items.length ? `<div class="subst">🔄 Náhrady: ${items.join(" · ")}</div>` : "";
}
function zmenPorcie(d){ aktPorcie=Math.max(1,aktPorcie+d); document.getElementById("pnum").textContent=aktPorcie; renderIng(); }
function naJednu(){ aktPorcie=1; document.getElementById("pnum").textContent=1; renderIng(); }
function setUnitMode(v){ jednotkaMode=v; renderIng(); }
function prevodJednotka(val, jed){
  const j=(jed||"").toLowerCase();
  if(["ks","kus","plátok","platok","rožok","rozok","žemľa","zemla"].includes(j)){ const n=Math.max(val>0?1:0,Math.round(val)); return n+" "+jed; }
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
function hodnot(id,n){ if(n)S.hodn[id]=n; else delete S.hodn[id]; save(); otvor(id); renderGrid(); }
function ulozPozn(id){ S.pozn[id]=document.getElementById("poznamka").value; save(); }
function zavri(){ document.getElementById("overlay").classList.remove("open"); document.body.style.overflow=""; }
document.getElementById("overlay").addEventListener("click",e=>{if(e.target.id==="overlay")zavri();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){zavri();zavriPick();}});

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
function pridajCasovac(){ const v=prompt("Časovač na koľko minút?","5"); if(v===null)return; const min=parseFloat(String(v).replace(",","."))||0; pridajCasovacSek(Math.round(min*60),fmt(min)+" min"); }
function zmazCasovac(id){ casovace=casovace.filter(c=>c.id!==id); renderCasovace(); if(!casovace.length&&casInterval){clearInterval(casInterval);casInterval=null;} }
function pip(){ try{const a=new (window.AudioContext||window.webkitAudioContext)();const o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();setTimeout(()=>o.stop(),600);}catch(e){} }
function citajKrok(){ try{ if(!('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance((cookKrok+1)+". "+(cookKroky[cookKrok]||"")); u.lang="sk-SK"; u.rate=0.95; speechSynthesis.speak(u); }catch(e){} }
function krok(d){ if(d>0 && cookKrok===cookKroky.length-1){ oznacUvarene(cookRecept); const rr=receptById(cookRecept); zavriCook(); if(rr && S.spajza.length && confirm("Uvarené! Odpísať suroviny zo špajze?")) odpisRecept(rr); return; } cookKrok=Math.min(cookKroky.length-1,Math.max(0,cookKrok+d)); ukazKrok(); }
function zavriCook(){ document.getElementById("cook").classList.remove("open"); casovace=[]; if(casInterval){clearInterval(casInterval);casInterval=null;} renderCasovace(); try{speechSynthesis.cancel();}catch(e){} if(wakeLock){wakeLock.release();wakeLock=null;} }
function oznacUvarene(id){ if(!id)return; S.uvarene.unshift({id:id,datum:new Date().toISOString().slice(0,10)}); S.uvarene=S.uvarene.slice(0,30); save(); }
const PRILOHY = {
 "prf:ryza":{nazov:"Ryža (príloha)", ing:{nazov:"Ryža",mnozstvo:60,jednotka:"g"}},
 "prf:zemiaky":{nazov:"Zemiaky (príloha)", ing:{nazov:"Zemiaky",mnozstvo:250,jednotka:"g"}},
 "prf:cestoviny":{nazov:"Cestoviny (príloha)", ing:{nazov:"Cestoviny",mnozstvo:80,jednotka:"g"}},
 "prf:pecivo":{nazov:"Pečivo", ing:{nazov:"Bageta",mnozstvo:80,jednotka:"g"}},
 "prf:salat":{nazov:"Zeleninový šalát", ing:{nazov:"Paradajky",mnozstvo:120,jednotka:"g"}}
};
function komponent(id){ if(typeof id==="string" && id.indexOf("prf:")===0){ const p=PRILOHY[id]; if(!p)return null; return {id:id,nazov:p.nazov,kategoria:"Príloha",kuchyna:"",porcie:1,ingrediencie:[p.ing],postup:[],_priloha:true}; } return receptById(id); }
function slotIds(di,slot){ const v=(S.plan[di]||{})[slot]; if(!v)return []; return Array.isArray(v)?v.slice():[v]; }
function maCarb(r){ const s=(r.ingrediencie||[]).map(i=>i.nazov.toLowerCase()).join(" "); return /ryž|ryza|zemiak|cestovin|špaget|spaget|linguin|rezanc|tarho|kuskus|bulgur|quinoa|chlieb|bageta|tortilla|rožok|rozok|žeml|nudl|halušk|knedl|pečivo/.test(s); }
function potrebujePrilohu(r){ return r && isMain(r) && r.kategoria!=="Polievka" && r.kategoria!=="Šalát" && !maCarb(r); }
function mealKcal(compArr){ return (compArr||[]).reduce((a,id)=>a+kcalPorcia(komponent(id)),0); }
function rescaleDen(dni){ if(!(S.genCfg&&S.genCfg.cielMode))return;
  const ciel=S.profil.kcal||0, dk=baseDayKcal(dni[0]); if(!(ciel>0 && dk>0))return;
  const fac=Math.max(0.5,Math.min(2,Math.round(ciel/dk*20)/20));
  dni.forEach(d=>{ SLOTY().forEach(s=>{ if(!slotIds(d,s).length)return;
    if(fac!==1){ S.planF[d]=S.planF[d]||{}; S.planF[d][s]=fac; } else if(S.planF[d]) delete S.planF[d][s]; }); }); }
function pf(di,slot){ return (S.planF[di]&&S.planF[di][slot])||1; }
function stravniciList(){ const l=S.profil.stravnici; if(Array.isArray(l)&&l.length)return l; const o=S.profil.osoby||1,arr=[]; for(let i=0;i<o;i++)arr.push({nazov:i===0?"Ja":("Osoba "+(i+1)),kcal:S.profil.kcal||1450}); return arr; }
function baseDayKcal(di){ let s=0; slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(cid=>{const k=komponent(cid); if(k)s+=kcalPorcia(k);})); return s; }
function pocetPorcii(di){ const base=baseDayKcal(di); const st=stravniciList(); if(base<200) return st.length; return st.reduce((a,p)=>a+((p.kcal||S.profil.kcal||1450)/base),0); }
function mnozMult(di,slot){ return porcieSlot(di,slot)*pf(di,slot); }
function slotyDna(di){ const v=S.daySloty&&S.daySloty[di]; if(Array.isArray(v)) return VSETKY_SLOTY.filter(s=>v.includes(s)); return SLOTY(); }
function pocetPorciiDna(di){ const n=S.dayPpl&&S.dayPpl[di]; return (n>0)?n:pocetPorcii(di); }
function porcieSlot(di,slot){ const o=S.slotPpl&&S.slotPpl[di]&&S.slotPpl[di][slot]; return (o>0)?o:pocetPorciiDna(di); }
// ponytail: hrubá heuristika mäsa (bez NLP) — na "nie 2× rovnaké mäso za sebou"; morčacie spadá pod hydinu
function masoTyp(r){ const s=bezDia((r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.nazov||""));
  if(/kur|slepac|sliepk|morcac|moriak|hydin/.test(s))return "hydina";
  if(/losos|tuniak|treska|ryb|kreveta|garnat|makrela|pstruh|sardin|krab/.test(s))return "ryby";
  if(/bravc|slanin|sunk|klobas|parok|panenk|prosciutto/.test(s))return "bravcove";
  if(/hovadz|steak|rostenk|svieckov/.test(s))return "hovadzie";
  return ""; }
function porcieNaVar(di,slot){ const bd=(S.blokMode?blokDni(di).length:1); return bd*mnozMult(di,slot); }
function jeSendvic(r){ const b=ranajkyBaza(r); if(["tortilla","bageta","toast","rožok"].includes(b))return true; const t=(r.tagy||[]).join(" ").toLowerCase(); return t.includes("wrap")||t.includes("sendvič")||t.includes("sendvic"); }
function fmtPct(f){ return f===1?"":(" · "+Math.round(f*100)+"%"); }
function planItems(){ const out=[]; for(let di=0;di<7;di++){ slotyDna(di).forEach(sl=>{ slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)out.push({r,di,slot:sl,f:pf(di,sl)}); }); }); } return out; }
function planovaneRecepty(){ return planItems().map(x=>x.r); }
function applyVzhlad(){ document.body.classList.toggle("dark",!!S.profil.dark); document.body.classList.toggle("big",!!S.profil.big); }

function hraniceInit(){ if(!Array.isArray(S.hranice)||S.hranice.length!==7)S.hranice=[true,false,true,false,false,true,false]; S.hranice[0]=true; }
function bloky(){ hraniceInit(); const out=[]; let cur=null; for(let i=0;i<7;i++){ if(i===0||S.hranice[i]){ cur=[i]; out.push(cur); } else cur.push(i); } return out; }
function blokDni(di){ let start=di; while(start>0 && !S.hranice[start]) start--; const dni=[start]; for(let j=start+1;j<7;j++){ if(S.hranice[j])break; dni.push(j); } return dni; }
function prepniBlok(v){ S.blokMode=v; save(); renderPlan(); }
function denyBloku(di){ return S.blokMode?blokDni(di):[di]; }
function zmenDenPpl(di,delta){ const dni=denyBloku(di); const cur=(S.dayPpl[di]!=null)?S.dayPpl[di]:stravniciList().length; const nova=Math.max(1,cur+delta); dni.forEach(d=>{ S.dayPpl[d]=nova; }); save(); renderPlan(); }
function toggleDenSlot(di,slot){ const dni=denyBloku(di); const akt=slotyDna(di).slice(); const i=akt.indexOf(slot); if(i>=0)akt.splice(i,1); else { akt.push(slot); akt.sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b)); } dni.forEach(d=>{ S.daySloty[d]=akt.slice(); }); save(); renderPlan(); }
function upravSlotPorcie(di,slot){ const cur=Math.round(porcieSlot(di,slot)); const v=prompt("Počet porcií pre toto jedlo (prázdne = podľa dňa):",cur); if(v===null)return; const dni=denyBloku(di); if(v.trim()===""){ dni.forEach(d=>{ if(S.slotPpl[d])delete S.slotPpl[d][slot]; }); } else { const n=Math.max(1,parseInt(v)||cur); dni.forEach(d=>{ S.slotPpl[d]=S.slotPpl[d]||{}; S.slotPpl[d][slot]=n; }); } save(); renderPlan(); }
function toggleHranica(i){ hraniceInit(); S.hranice[i]=!S.hranice[i]; save(); renderPlan(); }
function renderBlokEditor(){ const box=document.getElementById("blok-editor"); if(!box)return;
  if(!S.blokMode){ box.style.display="none"; return; } box.style.display="flex"; hraniceInit();
  let h='<span class="info" style="margin-right:6px">Rozdelenie (klikni medzi dni):</span>';
  for(let i=0;i<7;i++){ h+=`<span class="chip" style="cursor:default;padding:6px 10px">${DNI[i].slice(0,2)}</span>`;
    if(i<6){ const sp=S.hranice[i+1]; h+=`<span onclick="toggleHranica(${i+1})" style="cursor:pointer;font-size:18px;color:${sp?'var(--accent)':'#ccc'}" title="${sp?'spojiť':'rozdeliť'}">${sp?'✂':'·'}</span>`; } }
  box.innerHTML=h;
}
function renderPlan(){
  hraniceInit(); const pb=document.getElementById("p-blok"); if(pb)pb.checked=!!S.blokMode; renderBlokEditor();
  const bl=bloky(); const parita={}; bl.forEach((b,idx)=>b.forEach(di=>parita[di]=idx%2));
  const tint=di=>S.blokMode?('background:'+(parita[di]?'#f4f8f5':'#e8f1eb')):'';
  const t=document.getElementById("plan-table"); let h="";
  // riadky = zjednotenie globálnych slotov + čokoľvek v per-deň maskách (aby slot v maske po zmene globálnych slotov nezmizol z UI, no stále sa počítal)
  const rowSloty=[...new Set([...SLOTY(), ...Object.keys(S.daySloty||{}).flatMap(di=>S.daySloty[di]||[])])].filter(s=>VSETKY_SLOTY.includes(s)).sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b));
  if(S.blokMode){ h+='<tr><td class="slotname" style="background:#fff;border:none"></td>';
    bl.forEach((b,idx)=>{ const pism=String.fromCharCode(65+idx); const vari=DNI[(b[0]+6)%7].slice(0,2); h+=`<td colspan="${b.length}" style="text-align:center;font-size:12px;${tint(b[0])}"><b>Blok ${pism} · ${DNI[b[0]].slice(0,2)}–${DNI[b[b.length-1]].slice(0,2)}</b><br><a onclick="planVarenia(${b[0]})" style="cursor:pointer;text-decoration:underline;color:var(--accent-dark)">🍳 plán varenia (${vari} večer)</a></td>`; }); h+="</tr>"; }
  h+="<tr><th>Jedlo</th>"; DNI.forEach((d,di)=>h+=`<th>${d.slice(0,3)}</th>`); h+="</tr>";
  h+='<tr class="ctrl-row"><td class="slotname" style="background:#fff;border:none"></td>';
  DNI.forEach((d,di)=>{ const custom=(S.dayPpl[di]!=null); const ppl=custom?S.dayPpl[di]:stravniciList().length;
    const chips=rowSloty.map(s=>{ const on=slotyDna(di).indexOf(s)>=0; return `<span class="mchip${on?' on':''}" title="${s}" onclick="toggleDenSlot(${di},'${s}')">${ikony[s]||s[0]}</span>`; }).join("");
    h+=`<td class="ctrl" style="${tint(di)}"><div class="ppl"><button onclick="zmenDenPpl(${di},-1)">−</button><span class="pplnum${custom?' cust':''}" title="Počet porcií na deň">👥 ${ppl}</span><button onclick="zmenDenPpl(${di},1)">+</button></div><div class="mchips">${chips}</div></td>`;
  });
  h+="</tr>";
  rowSloty.forEach(slot=>{
    h+=`<tr><td class="slotname">${slot}</td>`;
    DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);
      if(slotyDna(di).indexOf(slot)<0){ h+=`<td style="${tint(di)}"><div class="plan-cell vyp">vyp.</div></td>`; return; }
      if(ids.length){ let kc=0;
        const riadky=ids.map(cid=>{const k=komponent(cid); if(!k)return ""; kc+=kcalPorcia(k);
          const nm=k._priloha?`<span class="nm">+ ${k.nazov}</span>`:`<span class="nm" style="cursor:pointer;text-decoration:underline" onclick="otvor('${cid}',{di:${di},slot:'${slot}'})" title="Zobraziť recept">${k.nazov}</span>`;
          return `<div style="display:flex;justify-content:space-between;gap:4px;align-items:start">${nm}<a onclick="odoberKomponent(${di},'${slot}','${cid}')" style="color:var(--warn);cursor:pointer" title="odobrať">✕</a></div>`;}).join("");
        h+=`<td style="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')"><div class="plan-cell" draggable="true" ondragstart="dragStart(event,${di},'${slot}')" title="Potiahni pre presun">${riadky}<span class="kc" style="cursor:pointer" title="Upraviť veľkosť porcie" onclick="upravFaktor(${di},'${slot}')">${Math.round(kc*f)} kcal ${fmtPct(f)} ✎</span><span style="display:flex;gap:12px;margin-top:2px"><span class="rm" style="color:var(--accent)" onclick="vyberDoPlanu(${di},'${slot}')">✎ zmeniť</span><span class="rm" style="color:var(--accent)" onclick="pridajKomponent(${di},'${slot}')">+ doplnok</span><span class="rm" style="color:var(--accent)" onclick="regenerujSlot(${di},'${slot}')" title="Vygenerovať znova len toto jedlo">🎲 znova</span><span class="rm" style="color:var(--accent)" onclick="upravSlotPorcie(${di},'${slot}')" title="Počet porcií pre toto jedlo">👥 porcie</span></span></div></td>`;
      } else h+=`<td style="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')"><div class="plan-cell prazdne" onclick="vyberDoPlanu(${di},'${slot}')">+ pridať</div></td>`;
    });
    h+="</tr>";
  });
  const ciel=parseInt(S.profil.kcal)||0;
  h+='<tr class="suma"><td>Σ kcal/deň</td>';
  DNI.forEach((d,di)=>{ let sum=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); sum=Math.round(sum);
    const over=ciel&&sum>ciel*1.1; h+=`<td class="${over?'over':''}">${sum?sum+(ciel?'<span class="ciel-mini">/'+ciel+'</span>':''):""}${over?" ⚠":""}</td>`; });
  h+="</tr>"; t.innerHTML=h;
}
let dragSrc=null;
function dragStart(e,di,slot){ dragSrc={di,slot}; try{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text","x");}catch(_){} }
function dragOver(e){ e.preventDefault(); try{e.dataTransfer.dropEffect="move";}catch(_){} }
function dragDrop(e,di,slot){ e.preventDefault(); if(!dragSrc)return; if(!(dragSrc.di===di&&dragSrc.slot===slot)) presunSlot(dragSrc.di,dragSrc.slot,di,slot); dragSrc=null; }
function setSlotComp(di,slot,comp){ const dni=S.blokMode?blokDni(di):[di]; dni.forEach(d=>{ S.plan[d]=S.plan[d]||{}; if(comp&&comp.length)S.plan[d][slot]=comp.slice(); else if(S.plan[d])delete S.plan[d][slot]; }); }
function presunSlot(fromDi,fromSlot,toDi,toSlot){ const a=slotIds(fromDi,fromSlot), b=slotIds(toDi,toSlot);
  setSlotComp(toDi,toSlot,a); setSlotComp(fromDi,fromSlot,b); save(); renderPlan(); }
let pickCiel=null;
function vyberDoPlanu(di,slot){ pickCiel={di,slot,blok:S.blokMode}; ukazKatPicker(); document.getElementById("pick-overlay").classList.add("open"); }
function pickRozsah(){ if(S.blokMode && pickCiel.blok){ const d=blokDni(pickCiel.di); return DNI[d[0]].slice(0,2)+"–"+DNI[d[d.length-1]].slice(0,2); } return DNI[pickCiel.di]; }
function ukazKatPicker(){
  const kats=[...new Set(RECEPTY.filter(r=>prejdeProfil(r)).map(r=>r.kategoria))];
  const odp=SLOT_KATEGORIE[pickCiel.slot]||[];
  kats.sort((a,b)=>((odp.includes(b)?1:0)-(odp.includes(a)?1:0)) || a.localeCompare(b,"sk"));
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Aké jedlo?</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  if(S.blokMode) h+=`<label class="switch" style="margin-bottom:12px"><input type="checkbox" ${pickCiel.blok?"checked":""} onchange="pickCiel.blok=this.checked;document.querySelector('.modal .subx').textContent=pickRozsah()+' · '+pickCiel.slot"> Použiť na celý blok</label>`;
  h+='<div class="chips">';
  kats.forEach(k=>{ const zvyr=odp.includes(k); h+=`<span class="chip${zvyr?' active':''}" onclick="ukazReceptyKat('${k.replace(/'/g,"")}')">${ikony[k]||"🍴"} ${k}</span>`; });
  h+=`</div><div class="btn-row"><button class="btn" onclick="ukazReceptyKat('')">Zobraziť všetky recepty</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h;
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
  if(jeHlavnyChodSlot(c.slot) && potrebujePrilohu(r)) comp.push("prf:ryza");
  if(jeNatierkovySlot(c.slot) && r && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  dni.forEach(di=>{ S.plan[di]=S.plan[di]||{}; S.plan[di][c.slot]=comp.slice(); });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); }
function pridajKomponent(di,slot){ pickCiel={di,slot,blok:S.blokMode,pridat:true}; ukazDoplnok(); document.getElementById("pick-overlay").classList.add("open"); }
function ukazDoplnok(){ let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Pridať doplnok</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  h+='<div class="chips">'; Object.keys(PRILOHY).forEach(k=>{ h+=`<span class="chip" onclick="pridajDoplnok('${k}')">${PRILOHY[k].nazov}</span>`; });
  h+='</div><h4 class="sekcia">Alebo recept (príloha / šalát)</h4><div style="max-height:40vh;overflow:auto">';
  RECEPTY.filter(r=>["Príloha","Šalát","Nátierka","Pečivo"].includes(r.kategoria)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="pridajDoplnok('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span><span class="kc">${r.kategoria}</span></div>`; });
  h+="</div></div>"; document.getElementById("pick-modal").innerHTML=h; }
function pridajDoplnok(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  dni.forEach(di=>{ S.plan[di]=S.plan[di]||{}; const cur=slotIds(di,c.slot); if(cur.indexOf(id)<0)cur.push(id); S.plan[di][c.slot]=cur; });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); }
function odoberKomponent(di,slot,cid){ const dni=S.blokMode?blokDni(di):[di];
  dni.forEach(d=>{ if(S.plan[d]){ const cur=slotIds(d,slot).filter(x=>x!==cid); if(cur.length)S.plan[d][slot]=cur; else delete S.plan[d][slot]; } });
  rescaleDen(dni); save(); renderPlan(); }
function zmazZPlanu(di,slot){ if(S.plan[di])delete S.plan[di][slot]; if(S.planF[di])delete S.planF[di][slot]; save(); renderPlan(); }
function regenerujSlot(di,slot){ const dni=S.blokMode?blokDni(di):[di];
  const pouzite=new Set(); for(let d=0;d<7;d++) SLOTY().forEach(sl=>slotIds(d,sl).forEach(id=>pouzite.add(id)));
  const nedavne=new Set(S.uvarene.slice(0,4).map(u=>u.id)), kf=filterKuchynaPreDen(dni[0]);
  let pool=poolPreSlot(slot).filter(r=>!nedavne.has(r.id)); if(!pool.length)pool=poolPreSlot(slot);
  if(kf && slot!=="Raňajky"){ const pk=pool.filter(r=>(r.kuchyna||"").toLowerCase()===kf.toLowerCase()); if(pk.length)pool=pk; }
  if(slot==="Raňajky" && dni.every(d=>d<5)){ const ps=pool.filter(r=>jeSendvic(r)); if(ps.length)pool=ps; }
  const r=vyberVazene(pool,pouzite); if(!r)return;
  let comp=[r.id];
  if(jeHlavnyChodSlot(slot) && potrebujePrilohu(r)) comp.push(vyberPrilohu(r.kuchyna,Math.floor(Math.random()*3)));
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  dni.forEach(d=>{ S.plan[d]=S.plan[d]||{}; S.plan[d][slot]=comp.slice(); });
  rescaleDen(dni); save(); renderPlan(); }
function zavriPick(){ document.getElementById("pick-overlay").classList.remove("open"); }
document.getElementById("pick-overlay").addEventListener("click",e=>{if(e.target.id==="pick-overlay")zavriPick();});
function vymazPlan(){ if(confirm("Vyprázdniť celý týždenný plán?")){ S.plan={}; S.planF={}; save(); renderPlan(); } }
function skopirujMinuly(){ const a=(S.archiv||[]).slice(); if(!a.length){ alert("Zatiaľ nemáš uložený žiadny týždeň. Ulož si aktuálny cez ⋯ Viac → Uložiť tento plán."); return; }
  const j=a[a.length-1]; if(!confirm(`Skopírovať posledný uložený týždeň „${j.nazov||j.id}"? Prepíše sa aktuálny plán.`))return;
  S.plan=JSON.parse(JSON.stringify(j.plan||{})); S.planF=JSON.parse(JSON.stringify(j.planF||{})); if(j.ciel_kcal)S.profil.kcal=j.ciel_kcal; save(); renderPlan(); }
function pridajDoPlanu(id){ const r=receptById(id); if(!r)return; zavri();
  const slot=slotPreKategoriu(r.kategoria); const dni=["Po","Ut","St","Št","Pi","So","Ne"]; const sloty=SLOTY();
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Do plánu: ${r.nazov}</h2></div><div class="content2">
    <div class="field"><label>Deň</label><select class="f" id="pdp-den">${dni.map((d,i)=>`<option value="${i}">${d}</option>`).join("")}</select></div>
    <div class="field"><label>Jedlo (slot)</label><select class="f" id="pdp-slot">${sloty.map(s=>`<option ${s===slot?"selected":""}>${s}</option>`).join("")}</select></div>
    <p class="info">Pridá sa na prvé miesto slotu${S.blokMode?" (na celý blok)":""}.</p>
    <div class="btn-row"><button class="btn primary" onclick="ulozDoPlanu('${id}')">📅 Pridať do plánu</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); }
function ulozDoPlanu(id){ const di=parseInt(document.getElementById("pdp-den").value)||0; const slot=document.getElementById("pdp-slot").value; const r=receptById(id); if(!r)return;
  let comp=[id];
  if(jeHlavnyChodSlot(slot) && potrebujePrilohu(r)) comp.push(vyberPrilohu(r.kuchyna,0));
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  const cur=slotIds(di,slot).filter(x=>!comp.includes(x)); const nove=comp.concat(cur);
  const dni=S.blokMode?blokDni(di):[di]; dni.forEach(d=>{ S.plan[d]=S.plan[d]||{}; S.plan[d][slot]=nove.slice(); });
  rescaleDen(dni); save(); zavriPick(); prepni("planovac"); }
function ranajkyBaza(r){ const s=(r.nazov+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")).toLowerCase();
  if(s.includes("tortilla")||s.includes("wrap")) return "tortilla";
  if(s.includes("bageta")) return "bageta";
  if(s.includes("toast")) return "toast";
  if(s.includes("rožok")||s.includes("rozok")||s.includes("žeml")) return "rožok";
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
function vahaReceptu(r){ let w=1+(S.hodn[r.id]||0); if(jeSezonne(r))w+=0.8; if(jeVakcii(r))w+=1.2; if(jeWatch(r))w+=1.0; w+=expBoost(r); if(S.profil.biel){ const v=vyzivaReceptu(r); if(v.b>25)w+=0.5; } return w; }
function vyberVazene(pool,pouzite){
  let cand=pool.filter(r=>!pouzite.has(r.id)); if(!cand.length)cand=pool.slice(); if(!cand.length)return null;
  let sum=cand.reduce((a,r)=>a+vahaReceptu(r),0), x=Math.random()*sum;
  for(const r of cand){ x-=vahaReceptu(r); if(x<=0)return r; } return cand[0];
}
const CARB_PRILOHY=["prf:ryza","prf:zemiaky","prf:cestoviny"];
const ASIJSKE=["japonská","japonska","čínska","cinska","thajská","thajska","ázijská","azijska","kórejská","korejska","vietnamská","vietnamska","indická","indicka"];
function vyberPrilohu(kuchyna,rot){ const k=(kuchyna||"").toLowerCase(); if(ASIJSKE.some(a=>k.includes(a)))return "prf:ryza"; return CARB_PRILOHY[rot%CARB_PRILOHY.length]; }
function filterKuchynaPreDen(di){ const f=(S.genCfg.filtre||[]).find(x=>di>=x.od&&di<=x.do&&x.kuchyna); return f?f.kuchyna:null; }
function pravidloPreDen(di){ const f=(S.genCfg.filtre||[]).find(x=>di>=x.od&&di<=x.do&&(x.veg||x.maxCas>0)); return f||null; }
function generujJedalnicek(zamiesaj){
  const cfg=S.genCfg||{}; const zachovat=!!cfg.zachovat;
  const naplnene=Object.values(S.plan).some(d=>d&&Object.keys(d).length);
  if(naplnene && !zamiesaj && !zachovat && !confirm("Vygenerovať nový jedálniček? Prepíše sa aktuálny plán.")) return;
  const pouzite=new Set(), pouziteBazy=new Set(), nedavne=new Set(S.uvarene.slice(0,4).map(u=>u.id)), plan={}, planF={};
  if(zachovat){ for(let di=0;di<7;di++) slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(id=>pouzite.add(id))); }
  const skupiny = S.blokMode ? bloky() : [[0],[1],[2],[3],[4],[5],[6]];
  let prilRot=0, prevBlokMaso=new Set();
  skupiny.forEach(dni=>{
    const kf=filterKuchynaPreDen(dni[0]);
    const pr=pravidloPreDen(dni[0]);
    const blokMaso=new Set();
    const sloty=slotyDna(dni[0]);
    const denPlan={}, dayKuchyne=new Set();
    if(zachovat){ sloty.forEach(sl=>{ const ex=slotIds(dni[0],sl); if(ex.length){ denPlan[sl]=ex.slice(); const r0=komponent(ex[0]); if(r0&&r0.kuchyna)dayKuchyne.add(r0.kuchyna); } }); }
    sloty.forEach(slot=>{ if(denPlan[slot])return;
      let pool=poolPreSlot(slot).filter(r=>!nedavne.has(r.id)); if(!pool.length)pool=poolPreSlot(slot);
      if(kf && slot!=="Raňajky"){ const pk=pool.filter(r=>(r.kuchyna||"").toLowerCase()===kf.toLowerCase()); if(pk.length)pool=pk; }
      if(pr&&pr.veg){ const pv=pool.filter(r=>diety(r).veg); if(pv.length)pool=pv; }
      if(pr&&pr.maxCas>0){ const pc=pool.filter(r=>casMin(r)<=pr.maxCas); if(pc.length)pool=pc; }
      if(cfg.neMasoZaSebou && jeHlavnyChodSlot(slot) && prevBlokMaso.size){ const pm=pool.filter(r=>{const mt=masoTyp(r); return !mt||!prevBlokMaso.has(mt);}); if(pm.length)pool=pm; }
      if(slot==="Raňajky"){ if(dni.every(d=>d<5)){ const ps=pool.filter(r=>jeSendvic(r)); if(ps.length)pool=ps; } const p2=pool.filter(r=>!pouziteBazy.has(ranajkyBaza(r))); if(p2.length)pool=p2; }
      else { const p2=pool.filter(r=>!r.kuchyna||!dayKuchyne.has(r.kuchyna)); if(p2.length)pool=p2; }
      if(slot==="Snack" && S.profil.kupSnack){ const p3=pool.filter(r=>(r.tagy||[]).includes("kupované")); if(p3.length)pool=p3; }
      const r=vyberVazene(pool,pouzite); if(r){ let comp=[r.id]; pouzite.add(r.id);
        if(slot==="Raňajky")pouziteBazy.add(ranajkyBaza(r)); else if(r.kuchyna)dayKuchyne.add(r.kuchyna);
        { const mt=masoTyp(r); if(mt && jeHlavnyChodSlot(slot))blokMaso.add(mt); }
        if(jeHlavnyChodSlot(slot) && potrebujePrilohu(r)) comp.push(vyberPrilohu(r.kuchyna,prilRot++));
        if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
        denPlan[slot]=comp; } });
    if(denPlan.Obed && denPlan.Večera && mealKcal(denPlan.Večera)>mealKcal(denPlan.Obed)){ const t=denPlan.Obed; denPlan.Obed=denPlan.Večera; denPlan.Večera=t; }
    let fac=1;
    if(cfg.cielMode){ const ciel=S.profil.kcal||0; let dk=0; sloty.forEach(s=>{ if(denPlan[s])dk+=mealKcal(denPlan[s]); }); if(ciel>0 && dk>0) fac=Math.max(0.5,Math.min(2,Math.round(ciel/dk*20)/20)); }
    dni.forEach(di=>{ plan[di]={}; sloty.forEach(s2=>{ if(denPlan[s2])plan[di][s2]=denPlan[s2].slice(); }); planF[di]={}; if(fac!==1) sloty.forEach(s2=>{ if(denPlan[s2])planF[di][s2]=fac; }); });
    prevBlokMaso=blokMaso;
  });
  S.plan=plan; S.planF=planF; save(); renderPlan();
  if(document.getElementById("v-domov").classList.contains("active"))renderDash();
}
function kuchyneList(){ return [...new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"sk")); }
function otvorGenConfig(){ const cfg=S.genCfg; const dni=["Po","Ut","St","Št","Pi","So","Ne"]; const kuch=kuchyneList();
  const popisPr=f=>[f.kuchyna,(f.veg?"bezmäso":""),(f.maxCas>0?("do "+f.maxCas+" min"):"")].filter(Boolean).join(" · ")||"(bez podmienky)";
  const fh=(cfg.filtre||[]).map((f,i)=>`<div class="sp-row"><span>${dni[f.od]}–${dni[f.do]}: <b>${popisPr(f)}</b></span><a onclick="zmazGenFilter(${i})" style="color:var(--warn);cursor:pointer">✕</a></div>`).join("")||'<p class="info">Zatiaľ žiadne pravidlá.</p>';
  const denOpts=sel=>dni.map((d,i)=>`<option value="${i}" ${i===sel?"selected":""}>${d}</option>`).join("");
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>⚙ Nastavenie generovania</h2></div><div class="content2">
    <label class="switch"><input type="checkbox" ${cfg.zachovat?"checked":""} onchange="S.genCfg.zachovat=this.checked;save()"> Zachovať už naplánované jedlá (kotvy — čo si nastavíš, generátor nechá)</label>
    <label class="switch"><input type="checkbox" ${cfg.cielMode?"checked":""} onchange="S.genCfg.cielMode=this.checked;save()"> Dorovnať dni na cieľ ${S.profil.kcal} kcal (upraví veľkosť porcií)</label>
    <label class="switch"><input type="checkbox" data-gen="nemaso" ${cfg.neMasoZaSebou?"checked":""} onchange="S.genCfg.neMasoZaSebou=this.checked;save()"> Nevariť rovnaké mäso v dvoch blokoch po sebe</label>
    <h4 class="sekcia">Pravidlo pre rozsah dní</h4>
    <div class="controls" style="align-items:center;flex-wrap:wrap">
      <select class="f" id="gf-od">${denOpts(0)}</select><span>–</span><select class="f" id="gf-do">${denOpts(6)}</select>
      <select class="f" id="gf-kuch"><option value="">(kuchyňa: ľubovoľná)</option>${kuch.map(k=>`<option>${k}</option>`).join("")}</select>
      <label class="switch" style="margin:0"><input type="checkbox" id="gf-veg"> bezmäso</label>
      <input type="number" id="gf-cas" placeholder="do min" style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">
      <button class="btn" onclick="pridajGenFilter()">+ Pridať pravidlo</button></div>
    <div id="gf-list" style="margin-top:8px">${fh}</div>
    <div class="btn-row" style="margin-top:16px"><button class="btn primary" onclick="zavriPick();generujJedalnicek(true)">✨ Generovať</button></div>
  </div>`;
  document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); }
function pridajGenFilter(){ const od=parseInt(document.getElementById("gf-od").value)||0, doo=parseInt(document.getElementById("gf-do").value)||0, kuchyna=document.getElementById("gf-kuch").value, veg=document.getElementById("gf-veg").checked, maxCas=parseInt(document.getElementById("gf-cas").value)||0;
  if(doo<od){ alert("Koniec rozsahu je pred začiatkom."); return; }
  if(!kuchyna && !veg && !(maxCas>0)){ alert("Nastav aspoň jednu podmienku (kuchyňa, bezmäso alebo čas)."); return; }
  const pr={od,do:doo}; if(kuchyna)pr.kuchyna=kuchyna; if(veg)pr.veg=true; if(maxCas>0)pr.maxCas=maxCas;
  S.genCfg.filtre.push(pr); save(); otvorGenConfig(); }
function zmazGenFilter(i){ S.genCfg.filtre.splice(i,1); save(); otvorGenConfig(); }
function vsetkyJedalnicky(){ return JEDALNICKY.concat(S.archiv||[]); }
function naplnJedalnicky(){ const sel=document.getElementById("jed-select"); const btn=document.getElementById("jed-load"); if(!sel||!btn)return;
  const all=vsetkyJedalnicky(); if(!all.length){ sel.style.display="none"; btn.style.display="none"; return; }
  sel.style.display=""; btn.style.display="";
  const z=all.slice().sort((a,b)=>(b.od||b.id||"").localeCompare(a.od||a.id||""));
  sel.innerHTML=z.map(j=>`<option value="${j.id}">${(String(j.id)[0]==="a"?"🖫 ":"")}${j.nazov||j.id}</option>`).join(""); }
function nacitajJedalnicek(){ const id=document.getElementById("jed-select").value; const j=vsetkyJedalnicky().find(x=>x.id===id); if(!j)return;
  if(!confirm(`Načítať „${j.nazov||j.id}"? Prepíše sa aktuálny plán.`))return;
  S.plan=JSON.parse(JSON.stringify(j.plan||{})); S.planF=JSON.parse(JSON.stringify(j.planF||{})); if(j.ciel_kcal)S.profil.kcal=j.ciel_kcal; save(); renderPlan(); }
function ulozPlanArchiv(){ const naplnene=Object.values(S.plan).some(d=>d&&Object.keys(d).length); if(!naplnene){alert("Plán je prázdny.");return;}
  const nazov=prompt("Názov jedálnička:", "Týždeň "+new Date().toLocaleDateString("sk")); if(!nazov)return;
  S.archiv.unshift({id:"a"+Date.now(), nazov:nazov, od:new Date().toISOString().slice(0,10), plan:JSON.parse(JSON.stringify(S.plan)), planF:JSON.parse(JSON.stringify(S.planF)), ciel_kcal:S.profil.kcal});
  S.archiv=S.archiv.slice(0,20); save(); naplnJedalnicky(); alert("Uložené do jedálničkov."); }
function tlacTyzden(){ prepni("planovac"); renderNakup(); document.querySelectorAll(".view").forEach(el=>el.classList.remove("printme"));
  document.getElementById("v-planovac").classList.add("printme"); document.getElementById("v-nakup").classList.add("printme"); window.print(); }

function domaTokens(){ return (S.domaNakup||"").toLowerCase().split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); }
function nakupPolozky(){
  const items=planItems(); const grp={}, notes={};
  items.forEach(({r,di,slot})=>{ const nas=mnozMult(di,slot)/(r.porcie||1);
    (r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov);
      if(i.mnozstvo==null){ const kk=(p?p.kluc:i.nazov.toLowerCase()); if(!notes[kk])notes[kk]={nazov:i.nazov,pozn:i.poznamka||"podľa chuti",oddelenie:(p||{}).oddelenie||"Ostatné"}; return; }
      const j=(i.jednotka||"").toLowerCase();
      const rodina = j==="ml" ? "ml" : ((j==="g"||j==="gram") ? "g" : "ks");
      if(p){ const kluc=p.kluc; if(!grp[kluc])grp[kluc]={key:kluc,nazov:i.nazov,oddelenie:p.oddelenie||"Ostatné",p:p,matched:true,grams:0,cena:0,hasKs:false,hasMl:false,hasG:false};
        const G=grp[kluc]; const g=gramy({mnozstvo:i.mnozstvo*nas,jednotka:i.jednotka},p);
        G.grams+=g; G.cena+=g/100*(p.cena100||0);
        if(rodina==="ks")G.hasKs=true; else if(rodina==="ml")G.hasMl=true; else G.hasG=true;
      } else { const kluc="u|"+i.nazov.toLowerCase()+"|"+j; if(!grp[kluc])grp[kluc]={key:kluc,nazov:i.nazov,oddelenie:"Ostatné",matched:false,raw:0,jednotka:i.jednotka||"",cena:0};
        grp[kluc].raw+=i.mnozstvo*nas; }
    });
  });
  return {grp,notes};
}
function zobrazMnozstvo(G){
  if(!G.matched){ const jj=(G.jednotka||"").toLowerCase(); const cnt=["ks","kus","plátok","platok","rožok","rozok","žemľa","zemla"].includes(jj); const val=cnt?Math.max(1,Math.round(G.raw)):Math.round(G.raw*10)/10; return fmt(val)+(G.jednotka?" "+G.jednotka:""); }
  const p=G.p;
  if(G.hasKs && p.g_za_ks){ return Math.max(1,Math.round(G.grams/p.g_za_ks))+" ks"; }
  if(G.hasMl && !G.hasG){ return fmt(Math.round(G.grams/(p.hustota||1)))+" ml"; }
  return fmt(Math.round(G.grams))+" g";
}
function jeDoma(nazov,tok){ const n=nazov.toLowerCase(); return tok.some(t=>n.includes(t)||t.includes(n.split(" ")[0])); }
function nakupBalenie(G){ if(G.matched && G.p && G.p.balenie_g){ const n=Math.max(1,Math.ceil(G.grams/G.p.balenie_g)); return {n:n,pop:G.p.balenie_popis,celkG:n*G.p.balenie_g}; } return null; }
function nakupCena(G){ const b=nakupBalenie(G); if(b) return b.celkG/100*((G.p&&G.p.cena100)||0); return G.cena||0; }
function nakupMnozstvo(G){ const ex=zobrazMnozstvo(G); if(S.profil.balenia!==false){ const b=nakupBalenie(G); if(b) return ex+` <span class="info">(bal.: ${b.n}× ${b.pop})</span>`; } return ex; }
function upravFaktor(di,slot){ const cur=Math.round(pf(di,slot)*100); const v=prompt("Veľkosť porcie v % (100 = normál):",cur); if(v===null)return; let f=Math.max(10,Math.min(400,parseInt(v)||100))/100; S.planF[di]=S.planF[di]||{}; S.planF[di][slot]=Math.round(f*100)/100; save(); renderPlan(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }
function mamVSpajzi(nazov){ const p=najdiPotravinu(nazov); const key=p?p.kluc:bezDia(nazov); const n=bezDia(nazov);
  return S.spajza.some(x=>{ if(x.mnozstvo<=0)return false; const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||""; const xn=bezDia(x.nazov);
    return (xk&&xk===key) || xn.includes(n) || n.includes(xn.split(" ")[0]); }); }
function nakupItems(){
  const {grp,notes}=nakupPolozky(); const tok=domaTokens(); const rows=[];
  Object.values(grp).forEach(G=>{ const key=G.key.replace(/'/g,""); const doma=jeDoma(G.nazov,tok);
    rows.push({key,odd:G.oddelenie||"Ostatné",nazov:G.nazov,mnoz:nakupMnozstvo(G),cena:nakupCena(G),akc:ingVakcii(G.nazov),doma,vSpajzi:mamVSpajzi(G.nazov),klik:true,ck:!!(S.nakupCheck[key]||doma)}); });
  Object.values(notes).forEach(N=>{ const key="note|"+bezDia(N.nazov); const doma=jeDoma(N.nazov,tok);
    rows.push({key,odd:N.oddelenie||"Ostatné",nazov:N.nazov,mnoz:"<i>"+N.pozn+"</i>",akc:false,doma,klik:true,ck:!!(S.nakupCheck[key]||doma)}); });
  return rows;
}
function riadokNakup(r){ const en=r.nazov.replace(/'/g,"\\'");
  const meno=r.klik?`<span class="sur-klik" onclick="surovinaInfo('${en}')" title="v ktorom recepte · čím nahradiť">${r.nazov}</span>`:r.nazov;
  return `<label class="${r.ck?'checked':''}"><span class="nm2"><input type="checkbox" ${r.ck?'checked':''} ${r.doma?'disabled':''} onchange="checkNakup('${r.key}',this.checked)"> ${meno} — <b>${r.mnoz}</b>${r.akc?' <span class="badge price">🏷️ akcia</span>':''}${r.doma?' <span class="info">(máš doma)</span>':''}</span></label>`; }
function renderNakup(){
  const box=document.getElementById("nakup-list");
  const domaEl=document.getElementById("doma-nakup"); if(domaEl){ if(document.activeElement===domaEl){S.domaNakup=domaEl.value;save();} else domaEl.value=S.domaNakup||""; }
  const rows=nakupItems();
  const lowStock=S.spajza.filter(x=>x.min>0 && x.mnozstvo<x.min);
  const manual=S.nakupManual||[];
  if(!rows.length && !lowStock.length && !manual.length){ box.innerHTML='<p class="info">Zatiaľ nič v pláne. Pridaj recepty v <b>Pláne</b>, alebo pridaj vlastnú položku vyššie.</p>'; return; }
  const poradie=["Zelenina a ovocie","Mäso a ryby","Mliečne a vajcia","Pečivo","Cestoviny a ryža","Trvanlivé a konzervy","Omáčky a dochucovadlá","Oleje a tuky","Orechy a semená","Pečenie a sladké","Korenie a bylinky","Ostatné"];
  const nez=rows.filter(r=>!r.ck && !r.vSpajzi), vSp=rows.filter(r=>!r.ck && r.vSpajzi), zas=rows.filter(r=>r.ck);
  const podla={}; nez.forEach(r=>(podla[r.odd]=podla[r.odd]||[]).push(r));
  const oddPor=poradie.filter(o=>podla[o]).concat(Object.keys(podla).filter(o=>!poradie.includes(o)));
  let h="";
  const totalCena=nez.reduce((a,r)=>a+(r.cena||0),0); const akciaN=nez.filter(r=>r.akc).length;
  if(nez.length){ h+=`<div class="nakup-suhrn"><span><b>${nez.length}</b> položiek na kúpu</span><span>~ <b>${eur(totalCena)}</b></span>${akciaN?`<span class="badge price">🏷️ ${akciaN} v akcii</span>`:""}</div>`; }
  if(lowStock.length){ h+='<div class="odd"><h4>🧊 Doplniť zásoby (pod minimom)</h4>'; lowStock.forEach(x=>{ h+=`<label><span class="nm2">${x.nazov} — <b>${fmt(Math.max(0,x.min-x.mnozstvo))} ${x.jednotka}</b></span></label>`; }); h+="</div>"; }
  if(manual.length){ h+='<div class="odd"><h4>📝 Ručne pridané</h4>'; manual.forEach(m=>{ h+=`<label class="${m.done?'checked':''}"><span class="nm2"><input type="checkbox" ${m.done?'checked':''} onchange="checkManual('${m.id}',this.checked)"> ${m.nazov}</span><a onclick="zmazManual('${m.id}')" style="color:var(--warn);cursor:pointer">✕</a></label>`; }); h+="</div>"; }
  oddPor.forEach(o=>{ h+=`<div class="odd"><h4>${o}</h4>`; podla[o].sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; });
  if(vSp.length){ h+='<div class="odd done-sekcia"><h4>🏠 Mám v špajzi (over pred nákupom)</h4>'; vSp.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; }
  if(zas.length){ h+='<div class="odd done-sekcia"><h4>✓ Už máme / v košíku</h4>'; zas.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; }
  box.innerHTML=h;
}
function checkNakup(key,val){ S.nakupCheck[key]=val; if(!val)delete S.nakupCheck[key]; save(); renderNakup(); }
function pridajNakupPolozku(){ const el=document.getElementById("nakup-manual"); if(!el)return; const v=(el.value||"").trim(); if(!v)return;
  S.nakupManual.push({id:"m"+(S.spSid++),nazov:escHtml(v),done:false}); el.value=""; save(); renderNakup(); }
function checkManual(id,val){ const m=S.nakupManual.find(x=>x.id===id); if(m){m.done=val;save();renderNakup();} }
function zmazManual(id){ S.nakupManual=S.nakupManual.filter(x=>x.id!==id); save(); renderNakup(); }
function surovinaInfo(nazov){ const n=bezDia(nazov);
  const videne=new Set();
  const recepty=planovaneRecepty().filter(r=>(r.ingrediencie||[]).some(i=>{const nn=bezDia(i.nazov);return nn.includes(n)||n.includes(nn.split(" ")[0]);}))
    .filter(r=>{ if(videne.has(r.id))return false; videne.add(r.id); return true; });
  let nah=[]; for(const k in SUBSTITUCIE){ if(n.includes(bezDia(k))){ nah=SUBSTITUCIE[k]; break; } }
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${nazov}</h2></div><div class="content2">`;
  h+='<h4 class="sekcia">🍲 V ktorom recepte (z plánu)</h4>';
  h+= recepty.length? recepty.map(r=>`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvor('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span></div>`).join("") : '<p class="info">V aktuálnom pláne túto surovinu nepoužíva žiadny recept.</p>';
  h+='<h4 class="sekcia">🔄 Čím nahradiť</h4>';
  h+= nah.length? `<p>${nah.join(", ")}</p>` : '<p class="info">Pre túto surovinu nemám návrh náhrady.</p>';
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); }
function nakupText(){ // len nekúpené položky (pre kopírovanie/zdieľanie)
  const riadky=nakupItems().filter(r=>!r.ck && !r.vSpajzi).map(r=>r.nazov+" "+r.mnoz.replace(/<[^>]+>/g,"").trim());
  (S.nakupManual||[]).filter(m=>!m.done).forEach(m=>riadky.push(m.nazov));
  return riadky;
}
function kopirujListonic(){
  const riadky=nakupText();
  if(!riadky.length){ alert("Zoznam je prázdny."); return; }
  const txt=riadky.join("\n");
  if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(()=>alert("Skopírované ("+riadky.length+" položiek). Vlož do Listonic."),()=>promptFallback(txt)); }
  else promptFallback(txt);
}
function zdielajNakup(){
  const riadky=nakupText();
  if(!riadky.length){ alert("Zoznam je prázdny."); return; }
  const txt="🛒 Nákupný zoznam:\n"+riadky.join("\n");
  if(navigator.share){ navigator.share({title:"Nákupný zoznam",text:txt}).catch(()=>{}); }
  else kopirujListonic();
}
function promptFallback(txt){ window.prompt("Skopíruj (Ctrl+C):",txt); }

function pozdravText(){ const h=new Date().getHours(); const cast=h<10?"Dobré ráno":(h<18?"Dobrý deň":"Dobrý večer");
  const meno=(stravniciList()[0]||{}).nazov||""; return meno?`${cast}, ${meno}`:cast; }
function renderDash(){
  const plan=planItems();
  const pz=document.getElementById("pozdrav"); if(pz)pz.textContent=pozdravText();
  let totB=0,totCena=0; const dniSet={};
  plan.forEach(p=>{ const v=vyzivaReceptu(p.r); totB+=v.b*p.f; totCena+=v.cena*p.f; dniSet[p.di]=1; });
  const nd=Object.keys(dniSet).length||1;
  document.getElementById("dash-tiles").innerHTML=`
    <div class="tile"><div class="lbl">Receptov</div><div class="val">${RECEPTY.length}</div></div>
    <div class="tile"><div class="lbl">Jedál v pláne</div><div class="val">${plan.length}</div></div>
    <div class="tile"><div class="lbl">Priemer bielkovín/deň</div><div class="val">${plan.length?fmt(totB/nd)+"<small> g</small>":"–"}</div></div>
    <div class="tile"><div class="lbl">Cena/deň</div><div class="val">${plan.length?eur(totCena/nd):"–"}</div></div>`;
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
}
function uvarZoSpajze(){ prepni("spajza"); domaZoSpajze(); }
function renderDnesPlan(){
  const el=document.getElementById("dnes-plan"); if(!el)return;
  const di=(new Date().getDay()+6)%7;
  let h="",kc=0,b=0,t=0,sx=0,any=false;
  slotyDna(di).forEach(sl=>{ const ids=slotIds(di,sl); const f=pf(di,sl);
    if(!ids.length){ h+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span class="info">—</span></div>`; return; }
    any=true;
    const mena=ids.map(cid=>{const k=komponent(cid); if(!k)return null; kc+=kcalPorcia(k)*f; const v=vyzivaReceptu(k); b+=v.b*f;t+=v.t*f;sx+=v.s*f;
      return k._priloha?("+ "+k.nazov):`<span class="sur-klik" onclick="otvor('${cid}',{di:${di},slot:'${sl}'})">${k.nazov}</span>`;}).filter(Boolean).join(", ");
    h+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span>${mena}</span></div>`;
  });
  const cot=document.getElementById("cotvarit-panel");
  if(!any){ el.innerHTML='<p class="info">Na dnes nič naplánované. Zostav jedálniček alebo pridaj jedlá v Pláne.</p>'; if(cot)cot.style.display=""; return; }
  if(cot)cot.style.display="none";
  if(S.blokMode){ bloky().forEach((bk,idx)=>{ if((bk[0]+6)%7===di) h+=`<div class="dnes-varenie"><a style="cursor:pointer;color:var(--accent-dark);text-decoration:underline" onclick="planVarenia(${bk[0]})">🍳 Dnes večer varíš blok ${String.fromCharCode(65+idx)} (na ${bk.length} dni)</a></div>`; }); }
  const ciel=S.profil.kcal||0;
  h+=`<div class="dnes-makra"><b>${Math.round(kc)}${ciel?" / "+ciel:""}</b> kcal · B ${fmt(b)} g · T ${fmt(t)} g · S ${fmt(sx)} g</div>`;
  el.innerHTML=h;
}
let dnesId=null;
function vyberDnes(){
  const nedavne=new Set(S.uvarene.slice(0,5).map(u=>u.id));
  let kand=RECEPTY.filter(r=>prejdeProfil(r) && isMain(r) && !nedavne.has(r.id));
  if(!kand.length)kand=RECEPTY.filter(r=>prejdeProfil(r));
  kand.sort((a,b)=>((S.hodn[b.id]||0)-(S.hodn[a.id]||0)) + (Math.random()-0.5));
  const top=kand.slice(0,Math.min(5,kand.length));
  const r=top[Math.floor(Math.random()*top.length)]||RECEPTY[0]; dnesId=r?r.id:null;
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
function makroBar(emoji,label,color,act,tgt){ const pct=tgt?Math.min(100,Math.round(act/tgt*100)):0; const over=tgt&&act>tgt*1.1;
  return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>${emoji} ${label}</span><span style="${over?'color:var(--warn)':''}">${fmt(act)}${tgt?" / "+fmt(tgt):""} g</span></div><div style="height:10px;background:var(--line);border-radius:6px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${color}"></div></div></div>`; }
function ukazDenVyzivu(di){ const el=document.getElementById("vyziva-den"); if(!el)return; let h=`<h4 class="sekcia">${DNI[di]} — rozpad jedál</h4>`; let any=false,dk=0;
  slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(!r)return; any=true; const v=vyzivaReceptu(r); dk+=v.kcal*f;
    h+=`<div class="sp-row"><span>${r._priloha?"+ ":""}<b>${r.nazov}</b> <span class="meta2">${sl}</span></span><span class="meta2">${Math.round(v.kcal*f)} kcal · B ${fmt(v.b*f)} · T ${fmt(v.t*f)} · S ${fmt(v.s*f)}</span></div>`; }); });
  if(any)h+=`<div class="dnes-makra"><b>Spolu ${Math.round(dk)} kcal</b></div>`;
  el.innerHTML = any? h : `<p class="info">${DNI[di]}: nič naplánované.</p>`; }
function renderVyziva(){
  const dni=[]; for(let di=0;di<7;di++){ let kc=0,b=0,t=0,sx=0,vl=0,na=0,ce=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r){const v=vyzivaReceptu(r); kc+=v.kcal*f;b+=v.b*f;t+=v.t*f;sx+=v.s*f;vl+=(v.vl||0)*f;na+=(v.na||0)*f;ce+=(v.cena||0)*f;}}); }); dni.push({kc:Math.round(kc),b,t,s:sx,vl:vl,na:na,ce:ce}); }
  const maxKc=Math.max(S.profil.kcal||0,...dni.map(d=>d.kc),1);
  const akt=dni.filter(d=>d.kc>0);
  const priemKc=akt.length?Math.round(akt.reduce((a,d)=>a+d.kc,0)/akt.length):0;
  const priemB=akt.length?akt.reduce((a,d)=>a+d.b,0)/akt.length:0;
  const priemVl=akt.length?akt.reduce((a,d)=>a+d.vl,0)/akt.length:0;
  const priemNa=akt.length?akt.reduce((a,d)=>a+d.na,0)/akt.length:0;
  const priemCe=akt.length?akt.reduce((a,d)=>a+d.ce,0)/akt.length:0;
  const vahaKg=S.vahy.length?S.vahy[S.vahy.length-1].kg:0;
  document.getElementById("vyziva-tiles").innerHTML=`
    <div class="tile"><div class="lbl">Priemer kcal/deň</div><div class="val">${priemKc||"–"}<small> /${S.profil.kcal}</small></div></div>
    <div class="tile"><div class="lbl">Priemer bielkovín/deň</div><div class="val">${akt.length?fmt(priemB)+" g":"–"}${S.profil.biel?'<small> /'+S.profil.biel+'</small>':''}</div></div>
    <div class="tile"><div class="lbl">Naplánovaných dní</div><div class="val">${akt.length}/7</div></div>
    <div class="tile"><div class="lbl">Vláknina/deň</div><div class="val">${akt.length?fmt(priemVl)+" g":"–"}<small> /30</small></div></div>
    <div class="tile"><div class="lbl">Sodík/deň</div><div class="val" style="${priemNa>2300?'color:var(--warn)':''}">${akt.length?Math.round(priemNa)+" mg":"–"}<small> /2300</small></div></div>
    <div class="tile"><div class="lbl">Cena/deň</div><div class="val">${akt.length?eur(priemCe):"–"}</div></div>
    <div class="tile"><div class="lbl">Bielkoviny na kg</div><div class="val">${(akt.length&&vahaKg)?fmt(priemB/vahaKg)+"<small> g/kg</small>":"–"}</div></div>`;
  const ciel=S.profil.kcal||0;
  let ch = ciel?`<div class="cielline" style="bottom:${Math.min(100,ciel/maxKc*100)}%"><span>cieľ ${ciel}</span></div>`:"";
  dni.forEach((d,i)=>{ const hgt=Math.round(d.kc/maxKc*100); const over=ciel&&d.kc>ciel*1.1;
    const mc=d.b*4+d.t*9+d.s*4||1;
    const seg=d.kc>0?`<div class="seg segB" style="height:${d.b*4/mc*100}%"></div><div class="seg segT" style="height:${d.t*9/mc*100}%"></div><div class="seg segS" style="height:${d.s*4/mc*100}%"></div>`:"";
    ch+=`<div class="col" style="cursor:pointer" title="Zobraziť jedlá dňa" onclick="ukazDenVyzivu(${i})"><span class="v" style="${over?'color:var(--warn)':''}">${d.kc||""}</span><div class="bar2" style="height:${hgt}%">${seg}</div><span class="d">${DNI[i].slice(0,2)}</span></div>`; });
  document.getElementById("vyziva-chart").innerHTML=ch;
  document.getElementById("vyziva-ciel").innerHTML = (ciel? `Prerušovaná čiara = denný cieľ ${ciel} kcal. Klikni na stĺpec pre rozpad jedál dňa.` : "Nastav si denný cieľ v Nastaveniach.") + ` <span class="chart-leg"><span class="lg segB"></span> bielkoviny<span class="lg segT"></span> tuky<span class="lg segS"></span> sacharidy</span>`;
  // makrá: priemer dňa vs cieľ
  const priemT=akt.length?akt.reduce((a,d)=>a+d.t,0)/akt.length:0;
  const priemS=akt.length?akt.reduce((a,d)=>a+d.s,0)/akt.length:0;
  const cm=cieloveMakra(ciel); const tot=priemB*4+priemT*9+priemS*4||1;
  document.getElementById("vyziva-makro").innerHTML=`
    <div style="display:flex;height:22px;border-radius:8px;overflow:hidden;margin-bottom:14px">
      <div style="width:${priemB*4/tot*100}%;background:#2e7d54" title="Bielkoviny"></div>
      <div style="width:${priemT*9/tot*100}%;background:#e0a800" title="Tuky"></div>
      <div style="width:${priemS*4/tot*100}%;background:#b06a3b" title="Sacharidy"></div></div>
    ${makroBar("🟩","Bielkoviny","#2e7d54",priemB,cm?cm.b:0)}
    ${makroBar("🟨","Tuky","#e0a800",priemT,cm?cm.t:0)}
    ${makroBar("🟫","Sacharidy","#b06a3b",priemS,cm?cm.s:0)}
    <p class="info" style="margin-top:6px">Priemer na deň${cm?" oproti cieľu (z "+ciel+" kcal)":""}.</p>`;
  // ciele stravníkov
  const strav=stravniciList(); const sp=document.getElementById("vyziva-stravnici");
  if(sp) sp.innerHTML = strav.map(p=>{ const k=p.kcal||S.profil.kcal||0; const m=cieloveMakra(k);
    return `<div class="sp-row"><span><b>${p.nazov||"Stravník"}</b></span><span class="meta2">${k} kcal · B ${m?m.b:"–"} g · T ${m?m.t:"–"} g · S ${m?m.s:"–"} g</span></div>`; }).join("");
  // prvý naplánovaný deň v rozpade
  const prvy=dni.findIndex(d=>d.kc>0); if(prvy>=0) ukazDenVyzivu(prvy); else { const dd=document.getElementById("vyziva-den"); if(dd)dd.innerHTML=""; }
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
function zalohuj(){ try{ const blob=new Blob([JSON.stringify(S)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="kucharka-zaloha.json"; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ alert("Zálohovanie zlyhalo."); } }
function obnov(file){ if(!file)return; const rd=new FileReader(); rd.onload=e=>{ try{ const o=JSON.parse(e.target.result); S=Object.assign(S,o); save(); alert("Obnovené. Stránka sa načíta znova."); location.reload(); }catch(err){ alert("Neplatný súbor zálohy."); } }; rd.readAsText(file); }
function resetApp(){ if(!confirm("Naozaj vymazať VŠETKY dáta (obľúbené, plán, špajza, profil, história)? Táto akcia sa nedá vrátiť."))return;
  if(!confirm("Posledné varovanie — appka sa vráti do úvodného stavu. Pokračovať?"))return;
  try{ localStorage.removeItem(LS); }catch(e){} location.reload(); }
function normStravnici(){ if(!Array.isArray(S.profil.stravnici)||!S.profil.stravnici.length){ S.profil.stravnici=stravniciList(); } S.profil.osoby=S.profil.stravnici.length; }
function renderStravnici(){ const box=document.getElementById("stravnici-box"); if(!box)return; const l=stravniciList();
  box.innerHTML=l.map((p,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px"><input value="${(p.nazov||"").replace(/"/g,"")}" onchange="zmenStravnika(${i},'nazov',this.value)" placeholder="meno" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" value="${p.kcal||""}" onchange="zmenStravnika(${i},'kcal',this.value)" title="kcal/deň" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"><a onclick="zmazStravnika(${i})" style="color:var(--warn);cursor:pointer;align-self:center" title="odobrať">✕</a></div>`).join(""); naplnKohoSelect(); }
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
    +'<div style="display:flex;gap:8px"><button onclick="uiLogin()">Prihlásiť</button><button class="ghost" onclick="uiSignup()">Registrovať</button></div>'
    +'<p class="info" id="au-msg"></p>'; return; }
  let h='<p class="info">Prihlásený: <b>'+(u.email||"").replace(/</g,"&lt;")+'</b> &nbsp;<a onclick="uiLogout()" style="cursor:pointer;color:var(--warn)">Odhlásiť</a></p>';
  if(!S.profil.skupinaId){ h+='<p class="info">Skupina zdieľa plán, nákupný zoznam a špajzu s pozvanými členmi.</p>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><input type="text" id="au-nazov" placeholder="názov skupiny" style="flex:1;min-width:140px;padding:8px;border:1px solid var(--line);border-radius:8px"><button onclick="uiSkupinaVytvor()">Vytvoriť skupinu</button></div>'
    +'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input type="text" id="au-kod" placeholder="pozývací kód" style="flex:1;min-width:140px;padding:8px;border:1px solid var(--line);border-radius:8px"><button class="ghost" onclick="uiSkupinaPripoj()">Pripojiť sa</button></div>'; }
  else { h+='<p class="info">Skupina: <b>'+((S.profil.skupinaNazov||"(bez názvu)")).replace(/</g,"&lt;")+'</b></p>'
    +'<div class="field"><label>Pozývací kód (pošli ho členom)</label><input type="text" id="au-kodshow" readonly value="'+(S.profil.skupinaKod||"").replace(/"/g,"")+'" onclick="this.select()" style="font-weight:700;letter-spacing:1px"></div>'
    +'<button class="ghost" onclick="uiSkupinaOpusti()">Opustiť skupinu</button>'; }
  h+='<p class="info" id="au-msg"></p>'; box.innerHTML=h; }
function auMsg(t,err){ const m=document.getElementById("au-msg"); if(m){ m.textContent=t; m.style.color=err?"var(--warn)":"var(--ok,green)"; } }
async function uiLogin(){ try{ await authLogin(document.getElementById("au-email").value.trim(),document.getElementById("au-pass").value); await syncSkupinaPull(); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
async function uiSignup(){ try{ await authSignup(document.getElementById("au-email").value.trim(),document.getElementById("au-pass").value); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
function uiLogout(){ authLogout(); naplnUcet(); }
async function uiSkupinaVytvor(){ try{ await skupinaVytvor(document.getElementById("au-nazov").value.trim()); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
async function uiSkupinaPripoj(){ try{ await skupinaPripoj(document.getElementById("au-kod").value); naplnUcet(); renderPlan(); renderNakup(); renderDash(); }catch(e){ auMsg(e.message,true); } }
async function uiSkupinaOpusti(){ if(!confirm("Opustiť skupinu? Zdieľaný plán a nákup sa prestanú synchronizovať."))return; await skupinaOpusti(); naplnUcet(); }
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
  const skore=RECEPTY.filter(prejdeProfil).map(r=>{ let mame=0,chyba=[];
    (r.ingrediencie||[]).forEach(i=>{ const nm=bezDia(i.nazov); const ok=mam.some(m=>nm.includes(m)||m.includes(nm.split(" ")[0]));
      if(ok)mame++; else if(i.mnozstvo!=null)chyba.push(i.nazov); });
    const spolu=(r.ingrediencie||[]).length||1;
    // skóre: uprednostní komplexné recepty, ktorým chýba málo (nie triviálne 100 % placky)
    return {r,mame,spolu,pct:Math.round(mame/spolu*100),chyba,score:mame-1.5*chyba.length};
  }).filter(x=>x.mame>0).sort((a,b)=>b.score-a.score);
  if(!skore.length){ out.innerHTML='<p class="info">Nenašli sa žiadne recepty.</p>'; return; }
  out.innerHTML=skore.slice(0,12).map(x=>`<div class="match">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <b style="cursor:pointer" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${x.r.nazov}</b>
      <span style="color:var(--muted);font-size:14px;white-space:nowrap">${x.mame}/${x.spolu}</span></div>
    <div class="bar"><i style="width:${x.pct}%"></i></div>
    ${x.chyba.length?`<div style="font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;align-items:center"><span>${x.chyba.length<=2?'<b style="color:var(--accent-dark)">Chýba len:</b> ':'Chýba: '}${x.chyba.slice(0,6).join(", ")}${x.chyba.length>6?"…":""}</span><button class="mini" onclick="pridajChybajuceDoNakupu('${x.r.id}')">+ do nákupu</button></div>`:'<div style="font-size:13px;color:var(--accent)">Máš všetko! 🎉</div>'}
  </div>`).join("");
}
function pridajChybajuceDoNakupu(id){ const r=receptById(id); if(!r)return;
  const raw=(document.getElementById("doma-in")||{}).value||""; const mam=raw.toLowerCase().split(/[\n,;]+/).map(x=>bezDia(x.trim())).filter(Boolean);
  const chyb=(r.ingrediencie||[]).filter(i=>{ if(i.mnozstvo==null)return false; const nm=bezDia(i.nazov); return !mam.some(m=>nm.includes(m)||m.includes(nm.split(" ")[0])); }).map(i=>i.nazov);
  if(!chyb.length){ alert("Nič nechýba 🎉"); return; }
  chyb.forEach(nz=>{ if(!S.nakupManual.some(m=>bezDia(m.nazov)===bezDia(nz))) S.nakupManual.push({id:"m"+(S.spSid++),nazov:nz,done:false}); });
  save(); alert("Pridané do nákupu: "+chyb.join(", ")); }
["hladaj","f-kuchyna","f-cas","f-diet","f-sort"].forEach(id=>{
  const el=document.getElementById(id); if(!el)return;
  el.addEventListener("input",renderGrid); el.addEventListener("change",renderGrid);
});
function dnesISO(){ return new Date().toISOString().slice(0,10); }
function dniDo(iso){ if(!iso)return null; return Math.round((new Date(iso+"T00:00:00")-new Date(dnesISO()+"T00:00:00"))/86400000); }
function expTrieda(iso){ const n=dniDo(iso); if(n===null)return ""; if(n<0)return "exp-over"; if(n<=4)return "exp-soon"; return ""; }
function expText(iso){ const n=dniDo(iso); if(n===null)return ""; if(n<0)return "expirované ("+(-n)+" d)"; if(n===0)return "spotrebuj dnes"; if(n<=4)return "o "+n+" d"; return iso; }
function naplnPotravinyDatalist(){ const dl=document.getElementById("potraviny-dl"); if(!dl)return;
  const mena=[...new Set(POTRAVINY.map(p=>p.kluc))].sort((a,b)=>a.localeCompare(b,"sk"));
  dl.innerHTML=mena.map(m=>`<option value="${m.replace(/"/g,"")}"></option>`).join(""); }
function aktualizujJednotky(){ const sel=document.getElementById("sp-jed"); if(!sel)return;
  const nazov=(document.getElementById("sp-nazov")||{}).value||""; const p=najdiPotravinu(nazov); const cur=sel.value;
  const u=povoleneJednotky(p); sel.innerHTML=u.map(x=>`<option>${x}</option>`).join(""); if(u.includes(cur))sel.value=cur; }
function pridajZasobu(){ const nazov=document.getElementById("sp-nazov").value.trim(); if(!nazov){alert("Zadaj surovinu.");return;}
  const p=najdiPotravinu(nazov);
  S.spajza.push({id:S.spSid++,nazov:escHtml(nazov),kluc:p?p.kluc:"",mnozstvo:parseFloat(document.getElementById("sp-mn").value)||0,jednotka:document.getElementById("sp-jed").value,miesto:document.getElementById("sp-miesto").value,expiry:document.getElementById("sp-exp").value||"",min:parseFloat(document.getElementById("sp-min").value)||0});
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
  document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); }
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
function odpisRecept(r){ if(!r)return; if(!S.spajza.length){alert("Špajza je prázdna.");return;} let zmen=0;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; const p=najdiPotravinu(i.nazov); const kk=p?p.kluc:"";
    const it=S.spajza.find(x=>{ const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||""; if(kk&&xk&&kk===xk)return true;
      const a=bezDia(x.nazov),b=bezDia(i.nazov); return a.includes(b)||b.includes(a.split(" ")[0]); });
    if(!it)return; const potreba=i.mnozstvo*(aktPorcie/(r.porcie||1));
    let uber=null;
    if(it.jednotka===i.jednotka) uber=potreba;
    else { const g=gramy({mnozstvo:potreba,jednotka:i.jednotka},p); if(g>0) uber=gramyNaJed(g,it.jednotka,p); }
    if(uber!=null){ it.mnozstvo=Math.max(0,Math.round((it.mnozstvo-uber)*100)/100); zmen++; } });
  S.spajza=S.spajza.filter(x=>x.mnozstvo>0); save();
  alert(zmen?("Odpísané zo špajze: "+zmen+" surovín."):"Nenašla sa zhoda (skontroluj názvy v špajzi)."); }
function toggleMenu(id){ document.querySelectorAll(".menu").forEach(m=>{ if(m.id!==id)m.classList.remove("open"); }); const el=document.getElementById(id); if(el)el.classList.toggle("open"); }
function zavriMenu(){ document.querySelectorAll(".menu").forEach(m=>m.classList.remove("open")); }
document.addEventListener("click",e=>{ if(!e.target.closest(".menu-wrap")) zavriMenu(); });
function otvorNacitat(){ const all=vsetkyJedalnicky(); if(!all.length){ alert("Zatiaľ žiadne uložené jedálničky. Najprv daj ⋯ Viac → Uložiť tento plán."); return; }
  const z=all.slice().sort((a,b)=>(b.od||b.id||"").localeCompare(a.od||a.id||""));
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Načítať jedálniček</h2></div><div class="content2" style="max-height:60vh;overflow:auto">';
  z.forEach(j=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nacitajJedalnicekId('${j.id}')"><span class="nm">${(String(j.id)[0]==="a"?"🖫 ":"📅 ")}${j.nazov||j.id}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); }
function nacitajJedalnicekId(id){ const j=vsetkyJedalnicky().find(x=>x.id===id); if(!j)return; if(!confirm(`Načítať „${j.nazov||j.id}"? Prepíše sa aktuálny plán.`))return;
  S.plan=JSON.parse(JSON.stringify(j.plan||{})); S.planF=JSON.parse(JSON.stringify(j.planF||{})); if(j.ciel_kcal)S.profil.kcal=j.ciel_kcal; save(); zavriPick(); renderPlan(); }
let planMode="tyzden";
function planZobraz(m){ planMode=m;
  const t=document.getElementById("plan-tyzden"), k=document.getElementById("plan-kal");
  if(t)t.style.display=(m==="tyzden")?"":"none"; if(k)k.style.display=(m==="kalendar")?"":"none";
  const tt=document.getElementById("tab-tyzden"), tk=document.getElementById("tab-kal");
  if(tt)tt.classList.toggle("active",m==="tyzden"); if(tk)tk.classList.toggle("active",m==="kalendar");
  if(m==="kalendar")renderKalendar(); }
let kalD=new Date();
function kalPosun(delta){ kalD=new Date(kalD.getFullYear(),kalD.getMonth()+delta,1); renderKalendar(); }
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
    h+=`<div class="day${iso===dnes?' dnes':''}" style="cursor:pointer" title="Upraviť plán tohto dňa" onclick="planZobraz('tyzden')"><div class="dn">${d}</div>${ev.map(n=>`<div class="ev" title="${n}">${n}</div>`).join("")}</div>`; }
  h+="</div>"; if(!(S.uvarene||[]).length) h+='<p class="info" style="margin-top:10px">Zatiaľ žiadna história. Po dokončení režimu varenia sa jedlo zapíše do kalendára.</p>';
  grid.innerHTML=h; }
function planVarenia(di){ const dni=blokDni(di); const den=S.plan[dni[0]]||{};
  const bi=bloky().findIndex(b=>b[0]===dni[0]); const pism=String.fromCharCode(65+(bi<0?0:bi)); const vari=DNI[(dni[0]+6)%7].slice(0,2);
  let h=`<div class="hero"><button class="close" onclick="zavri()">✕</button><h2>🍳 Plán varenia — Blok ${pism}</h2><div class="subx">${DNI[dni[0]].slice(0,2)}–${DNI[dni[dni.length-1]].slice(0,2)} · varí sa ${vari} večer</div></div><div class="content2">`;
  let any=false;
  slotyDna(dni[0]).forEach(sl=>{ const ids=slotIds(dni[0],sl); if(!ids.length)return; any=true; h+=`<h4 class="sekcia">${ikony[sl]||""} ${sl}</h4>`;
    const por=Math.max(1,Math.round(porcieNaVar(dni[0],sl)));
    ids.forEach(cid=>{ const k=komponent(cid); if(!k)return; const btn=k._priloha?"":`<button class="mini" onclick="zavri();otvor('${cid}',{di:${dni[0]},slot:'${sl}'})">recept</button>`;
      h+=`<div class="sp-row"><span><b>${k.nazov}</b> <span class="meta2">${por} porcií · ${Math.round(kcalPorcia(k))} kcal/porcia</span></span>${btn}</div>`; }); });
  if(!any) h+='<p class="info">V tomto bloku nie sú naplánované jedlá. Zostav jedálniček alebo klikni do buniek.</p>';
  else h+=`<div class="tipy">💡 Navar dávku na celý blok (${dni.length} dni × ${stravniciList().length} os.). Presné porcie sú pri každom jedle; suroviny spolu nájdeš v Nákupe.</div>`;
  h+="</div>"; document.getElementById("modal").innerHTML=h; document.getElementById("overlay").classList.add("open"); document.body.style.overflow="hidden"; }
function renderOkno(){ const el=document.getElementById("dash-okno"); if(!el)return; const pan=document.getElementById("okno-panel");
  if(!S.profil.okno){ el.innerHTML=""; if(pan)pan.style.display="none"; return; } if(pan)pan.style.display="";
  const st=S.profil.oknostart||12; const en=(st+8)%24; const now=new Date().getHours()+new Date().getMinutes()/60;
  const vOkne = st<en ? (now>=st&&now<en) : (now>=st||now<en);
  el.innerHTML = `🕒 Okno jedenia ${st}:00–${en}:00 · ${vOkne?'<span class="exp-soon">teraz môžeš jesť</span>':'mimo okna (pôst)'}`; }
function zapisVahu(){ const kg=parseFloat(document.getElementById("v-vaha").value); if(!kg){alert("Zadaj váhu.");return;} const d=dnesISO();
  const ex=S.vahy.find(x=>x.d===d); if(ex)ex.kg=kg; else S.vahy.push({d:d,kg:kg}); S.vahy.sort((a,b)=>a.d.localeCompare(b.d)); save(); document.getElementById("v-vaha").value=""; renderVahy(); }
function tyzdennaZmena(){ if(S.vahy.length<2)return null; const last=S.vahy[S.vahy.length-1],prvy=S.vahy[0]; const dni=(new Date(last.d)-new Date(prvy.d))/86400000; if(dni<1)return null; return (last.kg-prvy.kg)/dni*7; }
function sparkVahy(){ const v=S.vahy; if(v.length<2)return ""; const W=300,H=70,P=8;
  const ks=v.map(x=>x.kg); const mn=Math.min(...ks),mx=Math.max(...ks),rng=(mx-mn)||1;
  const x=i=>P+i*(W-2*P)/(v.length-1); const y=k=>H-P-(k-mn)/rng*(H-2*P);
  const pts=v.map((p,i)=>x(i).toFixed(1)+","+y(p.kg).toFixed(1)).join(" ");
  const dots=v.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.5" fill="var(--accent-dark)"></circle>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;margin-top:10px" preserveAspectRatio="xMidYMid meet">
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>${dots}
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
function syncPush(){ if(!syncNakonfig())return; clearTimeout(syncTimer); syncTimer=setTimeout(async()=>{ try{ S._ts=Date.now(); localStorage.setItem(LS,JSON.stringify(S));
  await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka",{method:"POST",headers:{apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify({id:syncId(),data:S,ts:S._ts})}); }catch(e){} },1500); }
async function syncPull(){ if(!syncNakonfig())return; try{
  const r=await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka?id=eq."+encodeURIComponent(syncId())+"&select=data,ts",{headers:{apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key}});
  const j=await r.json(); if(Array.isArray(j)&&j[0]&&j[0].ts>((S._ts)||0)){ S=Object.assign(S,j[0].data); uloz(S); location.reload(); } }catch(e){} }
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
  authUloz({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user}); }
async function authSignup(email,pass){ if(!syncMozne())throw new Error("Synchronizácia nie je nastavená.");
  const r=await fetch(SYNC_CONFIG.url+"/auth/v1/signup",{method:"POST",headers:{apikey:SYNC_CONFIG.key,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
  const j=await r.json(); if(!r.ok)throw new Error(j.error_description||j.msg||j.error||"Registrácia zlyhala.");
  if(j.access_token){ authUloz({access_token:j.access_token,refresh_token:j.refresh_token,user:j.user}); }
  else { await authLogin(email,pass); } }
function authLogout(){ authUloz(null); S.profil.skupinaId=""; S.profil.skupinaKod=""; S.profil.skupinaNazov=""; uloz(S); }
function randKod(){ const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const buf=new Uint32Array(10); crypto.getRandomValues(buf); let s=""; for(let i=0;i<10;i++)s+=abc[buf[i]%abc.length]; return "RODINA-"+s; } // 10× z 32-znak. abecedy (~50 bit) cez CSPRNG; abc.length delí 2^32 => bez modulo bias. ponytail: rate-limit na pridaj_sa je serverový strop, netreba pre domácnosť
async function skupinaVytvor(nazov){ if(!authUser())throw new Error("Najprv sa prihlás.");
  const kod=randKod();
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/skupiny",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({nazov:nazov||"Moja domácnosť",kod})});
  const j=await r.json(); if(!r.ok||!j[0])throw new Error((j&&j.message)||"Nepodarilo sa vytvoriť skupinu.");
  const sid=j[0].id;
  const rc=await authFetch(SYNC_CONFIG.url+"/rest/v1/clenstvo",{method:"POST",body:JSON.stringify({skupina_id:sid})});
  if(!rc.ok){ const e=await rc.json().catch(()=>({})); throw new Error(e.message||"Nepodarilo sa pridať členstvo."); }
  S.profil.skupinaId=sid; S.profil.skupinaKod=kod; S.profil.skupinaNazov=j[0].nazov; uloz(S);
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
function zbierZdielane(){ const o={}; SHARED_FIELDS.forEach(f=>o[f]=S[f]); return o; }
// ponytail: zdieľaný blob = posledný vyhráva + pull pri fokuse; per-field merge/realtime len ak sa domácnosť často „bije" o tú istú bunku
function syncSkupinaPush(hned){ if(!skupinaNakonfig())return Promise.resolve(); clearTimeout(skupTimer);
  return new Promise(res=>{ skupTimer=setTimeout(async()=>{ try{ S._skupTs=Date.now(); uloz(S);
    await authFetch(SYNC_CONFIG.url+"/rest/v1/skupina_data",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({skupina_id:S.profil.skupinaId,data:zbierZdielane(),ts:S._skupTs})}); }catch(e){} res(); }, hned?0:1500); }); }
async function syncSkupinaPull(){ if(!skupinaNakonfig())return; try{
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/skupina_data?skupina_id=eq."+encodeURIComponent(S.profil.skupinaId)+"&select=data,ts");
  const j=await r.json(); if(Array.isArray(j)&&j[0]&&j[0].data&&j[0].ts>((S._skupTs)||0)){ SHARED_FIELDS.forEach(f=>{ if(j[0].data[f]!==undefined)S[f]=j[0].data[f]; }); S._skupTs=j[0].ts; uloz(S);
    if(typeof renderPlan==="function")renderPlan(); if(typeof renderNakup==="function")renderNakup(); if(typeof renderDash==="function")renderDash(); } }catch(e){} }
document.addEventListener("visibilitychange",()=>{ if(!document.hidden){ syncSkupinaPull(); } });
if('serviceWorker' in navigator && location.protocol.startsWith('http')){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
syncPull(); syncSkupinaPull();
applyVzhlad(); naplnKuchyne(); renderChips(); renderGrid(); naplnJedalnicky(); naplnPotravinyDatalist(); aktualizujJednotky(); renderDash();
