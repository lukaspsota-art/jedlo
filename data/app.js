const RECEPTY = __DATA__;
const POTRAVINY = __POTRAVINY__;
const JEDALNICKY = __JEDALNICKY__;
const DNI = ["Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota","Nedeľa"];
const SLOTY = ["Raňajky","Obed","Večera","Snack"];
const ikony = {"Raňajky":"🍳","Obed":"🍝","Večera":"🍽️","Hlavné jedlo":"🍽️","Cestoviny":"🍝","Polievka":"🥣","Šalát":"🥗","Nátierka":"🧈","Snack":"🥪","Dezert":"🍰","Príloha":"🍚","Kokteil":"🍸","Nápoj":"🥤","Pečivo":"🥖"};
const SLOT_KATEGORIE = {"Raňajky":["Raňajky","Nátierka","Pečivo"],"Obed":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Večera":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Snack":["Snack","Dezert","Nátierka"]};
function isMain(r){ return ["Hlavné jedlo","Cestoviny","Polievka","Šalát"].includes(r.kategoria); }
function slotPreKategoriu(kat){ for(const sl of SLOTY){ if((SLOT_KATEGORIE[sl]||[]).includes(kat)) return sl; } return "Obed"; }
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
S.blokV=6; S.spajza=S.spajza||[]; S.voda=S.voda||{}; S.spSid=S.spSid||1; S.vahy=S.vahy||[];
S.profil=Object.assign({osoby:2,kcal:1450,biel:0,ryby:false,lepok:false,mlieko:false,dark:false,big:false,balenia:true,watch:"",kupSnack:true,cielTyp:"udrzanie",okno:false,oknostart:12}, S.profil||{});
if(S.ciel && !S.profil._migr){ S.profil.kcal=parseInt(S.ciel)||S.profil.kcal; S.profil._migr=1; }
function save(){uloz(S); if(typeof syncPush==="function")syncPush();}

function najdiPotravinu(nazov){
  const n=nazov.toLowerCase(); let best=null,dl=-1;
  for(const p of POTRAVINY){ if(n.includes(p.kluc)&&p.kluc.length>dl){best=p;dl=p.kluc.length;} }
  return best;
}
function gramy(ing,p){
  if(ing.mnozstvo==null) return 0;
  const j=(ing.jednotka||"").toLowerCase();
  if(j==="g"||j==="gram") return ing.mnozstvo;
  if(j==="ml") return ing.mnozstvo*((p&&p.hustota)||1);
  const gk=(p&&p.g_za_ks)||0; return ing.mnozstvo*gk;
}
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
function prejdeProfil(r){
  const d=diety(r);
  if(S.profil.ryby && d.ryby) return false;
  if(S.profil.lepok && !d.bezlepku) return false;
  if(S.profil.mlieko && !d.bezlaktozy) return false;
  return true;
}
function kartaHTML(r){
  const d=diety(r); const kc=kcalPorcia(r); const hod=S.hodn[r.id]||0; const c=cenaPorcia(r);
  const db=[jeWatch(r)?'<span class="badge">⭐</span>':'',jeVakcii(r)?'<span class="badge price">🏷️ akcia</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 veg</span>':'',c>0.05?'<span class="badge price">'+eur(c)+'</span>':''].join('');
  const thumb=r.foto?'<img src="recepty/fotky/'+r.foto+'" alt="">':(ikony[r.kategoria]||"🍴");
  return '<button class="fav" onclick="event.stopPropagation();toggleFav(\''+r.id+'\')">'+(S.fav[r.id]?"★":"☆")+'</button>'+
    '<div class="thumb" onclick="otvor(\''+r.id+'\')">'+thumb+'</div>'+
    '<div class="body" onclick="otvor(\''+r.id+'\')">'+
      '<span class="kat">'+(r.kategoria||"")+'</span><h3>'+r.nazov+'</h3>'+
      '<div class="meta">'+(r.cas?'<span>⏱ '+r.cas+'</span>':"")+(kc?'<span>🔥 '+kc+' kcal</span>':"")+'</div>'+
      '<div class="stars">'+(hod?"★".repeat(hod)+"☆".repeat(5-hod):"")+'</div>'+
      '<div class="diet">'+db+'</div></div>';
}
function renderGrid(){
  const grid=document.getElementById("grid");
  const q=document.getElementById("hladaj").value.trim().toLowerCase();
  const fk=document.getElementById("f-kuchyna").value;
  const fc=parseInt(document.getElementById("f-cas").value)||0;
  const fd=document.getElementById("f-diet").value;
  grid.innerHTML="";
  let zoz=RECEPTY.filter(r=>{
    if(!prejdeProfil(r)) return false;
    if(aktivnaKat!=="Všetko"&&r.kategoria!==aktivnaKat) return false;
    if(fk&&r.kuchyna!==fk) return false;
    if(fc&&casMin(r)>fc) return false;
    if(fd==="fav"&&!S.fav[r.id]) return false;
    if(fd==="veg"&&!diety(r).veg) return false;
    if(fd==="lepok"&&!diety(r).bezlepku) return false;
    if(fd==="mlieko"&&!diety(r).bezlaktozy) return false;
    if(q){ const hay=(r.nazov+" "+(r.popis||"")+" "+(r.tagy||[]).join(" ")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")).toLowerCase(); if(!hay.includes(q)) return false; }
    return true;
  });
  document.getElementById("empty").style.display=zoz.length?"none":"block";
  zoz.forEach(r=>{ const c=document.createElement("div"); c.className="card"; c.innerHTML=kartaHTML(r); grid.appendChild(c); });
}
function toggleFav(id){ S.fav[id]=!S.fav[id]; if(!S.fav[id])delete S.fav[id]; save(); renderGrid(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }

let aktualny=null, aktPorcie=1, jednotkaMode="metric";
function otvor(id, ctx){
  const r=receptById(id); if(!r)return; aktualny=r; aktPorcie=(ctx&&ctx.di!==undefined)?Math.max(1,Math.round(porcieNaVar(ctx.di,ctx.slot))):(r.porcie||1); jednotkaMode="metric";
  const al=alergenyReceptu(r); const d=diety(r);
  const foto=r.foto?`<img src="recepty/fotky/${r.foto}" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin-bottom:14px">`:"";
  const postup=(r.postup||[]).map(k=>`<li>${k}</li>`).join("");
  const badges=[jeVakcii(r)?'<span class="badge price">🏷️ v akcii</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 vegetariánske</span>':'',d.bezlepku?'<span class="badge">bez lepku</span>':'',d.bezlaktozy?'<span class="badge">bez laktózy</span>':'',...al.map(a=>`<span class="badge alerg">⚠ ${a}</span>`)].join('');
  const hod=S.hodn[r.id]||0;
  const stars=[1,2,3,4,5].map(i=>`<span class="${i<=hod?'on':''}" onclick="hodnot('${r.id}',${i})">★</span>`).join('');
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
      <h4 class="sekcia">Ingrediencie</h4><table class="ing"><tbody id="ing-body"></tbody></table>
      <div id="subst-box"></div>
      <h4 class="sekcia">Postup</h4><ol class="postup">${postup}</ol>
      ${r.tipy?`<div class="tipy">💡 <b>Tip:</b> ${r.tipy}</div>`:""}
      ${r.zdroj?`<div class="zdroj">Zdroj: ${r.zdroj}</div>`:""}
      <div class="hodnotenie"><span>Hodnotenie:</span><div class="starpick">${stars}</div>
        <button class="mini" onclick="hodnot('${r.id}',0)">zrušiť</button></div>
      <textarea class="pozn" id="poznamka" placeholder="Moja poznámka k receptu…" oninput="ulozPozn('${r.id}')">${(S.pozn[r.id]||"").replace(/</g,'&lt;')}</textarea>
      <div class="btn-row">
        <button class="btn primary" onclick="spustiCook()">👨‍🍳 Variť</button>
        <button class="btn" onclick="pridajDoPlanu('${r.id}')">📅 Do plánu</button>
        <button class="btn" onclick="window.print()">🖨 Tlačiť</button></div>
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
      <div><b>${fmt(v.s)} g</b><small>sacharidy</small></div>
      <div><b>${eur(v.cena)}</b><small>cena/porcia</small></div>`;
  } else box.style.display="none";
  const um=document.getElementById("unit-mode"); if(um)um.value=jednotkaMode;
}
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
function pf(di,slot){ return (S.planF[di]&&S.planF[di][slot])||1; }
function stravniciList(){ const l=S.profil.stravnici; if(Array.isArray(l)&&l.length)return l; const o=S.profil.osoby||1,arr=[]; for(let i=0;i<o;i++)arr.push({nazov:i===0?"Ja":("Osoba "+(i+1)),kcal:S.profil.kcal||1450}); return arr; }
function baseDayKcal(di){ let s=0; SLOTY.forEach(sl=>slotIds(di,sl).forEach(cid=>{const k=komponent(cid); if(k)s+=kcalPorcia(k);})); return s; }
function pocetPorcii(di){ const base=baseDayKcal(di); const st=stravniciList(); if(base<200) return st.length; return st.reduce((a,p)=>a+((p.kcal||S.profil.kcal||1450)/base),0); }
function mnozMult(di,slot){ return pocetPorcii(di)*pf(di,slot); }
function porcieNaVar(di,slot){ const bd=(S.blokMode?blokDni(di).length:1); return bd*mnozMult(di,slot); }
function jeSendvic(r){ const b=ranajkyBaza(r); if(["tortilla","bageta","toast","rožok"].includes(b))return true; const t=(r.tagy||[]).join(" ").toLowerCase(); return t.includes("wrap")||t.includes("sendvič")||t.includes("sendvic"); }
function fmtPct(f){ return f===1?"":(" · "+Math.round(f*100)+"%"); }
function planItems(){ const out=[]; for(let di=0;di<7;di++){ SLOTY.forEach(sl=>{ slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)out.push({r,di,slot:sl,f:pf(di,sl)}); }); }); } return out; }
function planovaneRecepty(){ return planItems().map(x=>x.r); }
function applyVzhlad(){ document.body.classList.toggle("dark",!!S.profil.dark); document.body.classList.toggle("big",!!S.profil.big); }

function hraniceInit(){ if(!Array.isArray(S.hranice)||S.hranice.length!==7)S.hranice=[true,false,true,false,false,true,false]; S.hranice[0]=true; }
function bloky(){ hraniceInit(); const out=[]; let cur=null; for(let i=0;i<7;i++){ if(i===0||S.hranice[i]){ cur=[i]; out.push(cur); } else cur.push(i); } return out; }
function blokDni(di){ let start=di; while(start>0 && !S.hranice[start]) start--; const dni=[start]; for(let j=start+1;j<7;j++){ if(S.hranice[j])break; dni.push(j); } return dni; }
function prepniBlok(v){ S.blokMode=v; save(); renderPlan(); }
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
  if(S.blokMode){ h+='<tr><td class="slotname" style="background:#fff;border:none"></td>';
    bl.forEach((b,idx)=>{ const pism=String.fromCharCode(65+idx); const vari=DNI[(b[0]+6)%7].slice(0,2); h+=`<td colspan="${b.length}" style="text-align:center;font-size:12px;${tint(b[0])}"><b>Blok ${pism} · ${DNI[b[0]].slice(0,2)}–${DNI[b[b.length-1]].slice(0,2)}</b><br><a onclick="planVarenia(${b[0]})" style="cursor:pointer;text-decoration:underline;color:var(--accent-dark)">🍳 plán varenia (${vari} večer)</a></td>`; }); h+="</tr>"; }
  h+="<tr><th>Jedlo</th>"; DNI.forEach((d,di)=>h+=`<th>${d.slice(0,3)}</th>`); h+="</tr>";
  SLOTY.forEach(slot=>{
    h+=`<tr><td class="slotname">${slot}</td>`;
    DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);
      if(ids.length){ let kc=0,cena=0;
        const riadky=ids.map(cid=>{const k=komponent(cid); if(!k)return ""; kc+=kcalPorcia(k); cena+=cenaPorcia(k);
          const nm=k._priloha?`<span class="nm">+ ${k.nazov}</span>`:`<span class="nm" style="cursor:pointer;text-decoration:underline" onclick="otvor('${cid}',{di:${di},slot:'${slot}'})" title="Zobraziť recept">${k.nazov}</span>`;
          return `<div style="display:flex;justify-content:space-between;gap:4px;align-items:start">${nm}<a onclick="odoberKomponent(${di},'${slot}','${cid}')" style="color:var(--warn);cursor:pointer" title="odobrať">✕</a></div>`;}).join("");
        h+=`<td style="${tint(di)}"><div class="plan-cell">${riadky}<span class="kc" style="cursor:pointer" title="Upraviť veľkosť porcie" onclick="upravFaktor(${di},'${slot}')">${Math.round(kc*f)} kcal · ${eur(cena*mnozMult(di,slot))}${fmtPct(f)} ✎</span><span style="display:flex;gap:12px;margin-top:2px"><span class="rm" style="color:var(--accent)" onclick="vyberDoPlanu(${di},'${slot}')">✎ zmeniť</span><span class="rm" style="color:var(--accent)" onclick="pridajKomponent(${di},'${slot}')">+ doplnok</span></span></div></td>`;
      } else h+=`<td style="${tint(di)}"><div class="plan-cell prazdne" onclick="vyberDoPlanu(${di},'${slot}')">+ pridať</div></td>`;
    });
    h+="</tr>";
  });
  const ciel=parseInt(S.profil.kcal)||0;
  h+='<tr class="suma"><td>Σ kcal/deň</td>';
  DNI.forEach((d,di)=>{ let sum=0; SLOTY.forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); sum=Math.round(sum);
    const over=ciel&&sum>ciel; h+=`<td class="${over?'over':''}">${sum||""}${over?" ⚠":""}</td>`; });
  h+="</tr>";
  h+='<tr class="suma"><td>Σ cena/deň</td>';
  DNI.forEach((d,di)=>{ let c=0; SLOTY.forEach(sl=>{ const m=mnozMult(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)c+=cenaPorcia(r)*m;}); });
    h+=`<td>${c>0.05?eur(c):""}</td>`; });
  h+="</tr>"; t.innerHTML=h;
}
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
  if((c.slot==="Obed"||c.slot==="Večera") && potrebujePrilohu(r)) comp.push("prf:ryza");
  if((c.slot==="Raňajky"||c.slot==="Snack") && r && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  dni.forEach(di=>{ S.plan[di]=S.plan[di]||{}; S.plan[di][c.slot]=comp.slice(); if(S.planF[di])delete S.planF[di][c.slot]; });
  save(); zavriPick(); renderPlan(); }
function pridajKomponent(di,slot){ pickCiel={di,slot,blok:S.blokMode,pridat:true}; ukazDoplnok(); document.getElementById("pick-overlay").classList.add("open"); }
function ukazDoplnok(){ let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Pridať doplnok</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  h+='<div class="chips">'; Object.keys(PRILOHY).forEach(k=>{ h+=`<span class="chip" onclick="pridajDoplnok('${k}')">${PRILOHY[k].nazov}</span>`; });
  h+='</div><h4 class="sekcia">Alebo recept (príloha / šalát)</h4><div style="max-height:40vh;overflow:auto">';
  RECEPTY.filter(r=>["Príloha","Šalát","Nátierka","Pečivo"].includes(r.kategoria)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="pridajDoplnok('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span><span class="kc">${r.kategoria}</span></div>`; });
  h+="</div></div>"; document.getElementById("pick-modal").innerHTML=h; }
function pridajDoplnok(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  dni.forEach(di=>{ S.plan[di]=S.plan[di]||{}; const cur=slotIds(di,c.slot); if(cur.indexOf(id)<0)cur.push(id); S.plan[di][c.slot]=cur; });
  save(); zavriPick(); renderPlan(); }
function odoberKomponent(di,slot,cid){ const dni=S.blokMode?blokDni(di):[di];
  dni.forEach(d=>{ if(S.plan[d]){ const cur=slotIds(d,slot).filter(x=>x!==cid); if(cur.length)S.plan[d][slot]=cur; else delete S.plan[d][slot]; } });
  save(); renderPlan(); }
function zmazZPlanu(di,slot){ if(S.plan[di])delete S.plan[di][slot]; if(S.planF[di])delete S.planF[di][slot]; save(); renderPlan(); }
function zavriPick(){ document.getElementById("pick-overlay").classList.remove("open"); }
document.getElementById("pick-overlay").addEventListener("click",e=>{if(e.target.id==="pick-overlay")zavriPick();});
function vymazPlan(){ if(confirm("Vyprázdniť celý týždenný plán?")){ S.plan={}; S.planF={}; save(); renderPlan(); } }
function pridajDoPlanu(id){ zavri(); prepni("planovac");
  const r=receptById(id); const slot=slotPreKategoriu(r.kategoria); let comp=[id];
  if((slot==="Obed"||slot==="Večera") && potrebujePrilohu(r)) comp.push("prf:ryza");
  if((slot==="Raňajky"||slot==="Snack") && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  for(let di=0;di<7;di++){ if(!slotIds(di,slot).length){ S.plan[di]=S.plan[di]||{}; S.plan[di][slot]=comp.slice(); save(); break; } }
  renderPlan();
}
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
function generujJedalnicek(zamiesaj){
  const naplnene=Object.values(S.plan).some(d=>d&&Object.keys(d).length);
  if(naplnene && !zamiesaj && !confirm("Vygenerovať nový jedálniček? Prepíše sa aktuálny plán.")) return;
  const pouzite=new Set(), pouziteBazy=new Set(), nedavne=new Set(S.uvarene.slice(0,4).map(u=>u.id)), ciel=S.profil.kcal||0, plan={}, planF={}, sloty=["Raňajky","Obed","Večera","Snack"];
  const skupiny = S.blokMode ? bloky() : [[0],[1],[2],[3],[4],[5],[6]];
  skupiny.forEach(dni=>{
    const denPlan={}, denF={}, dayKuchyne=new Set();
    sloty.forEach(slot=>{ let pool=poolPreSlot(slot).filter(r=>!nedavne.has(r.id)); if(!pool.length)pool=poolPreSlot(slot);
      if(slot==="Raňajky"){ if(dni.every(d=>d<5)){ const ps=pool.filter(r=>jeSendvic(r)); if(ps.length)pool=ps; } const p2=pool.filter(r=>!pouziteBazy.has(ranajkyBaza(r))); if(p2.length)pool=p2; }
      else { const p2=pool.filter(r=>!r.kuchyna||!dayKuchyne.has(r.kuchyna)); if(p2.length)pool=p2; }
      if(slot==="Snack" && S.profil.kupSnack){ const p3=pool.filter(r=>(r.tagy||[]).includes("kupované")); if(p3.length)pool=p3; }
      const r=vyberVazene(pool,pouzite); if(r){ let comp=[r.id]; pouzite.add(r.id);
        if(slot==="Raňajky")pouziteBazy.add(ranajkyBaza(r)); else if(r.kuchyna)dayKuchyne.add(r.kuchyna);
        if((slot==="Obed"||slot==="Večera") && potrebujePrilohu(r)) comp.push("prf:ryza");
        if((slot==="Raňajky"||slot==="Snack") && r.kategoria==="Nátierka") comp.push("prf:pecivo");
        denPlan[slot]=comp; } });
    if(denPlan.Obed && denPlan.Večera && mealKcal(denPlan.Večera)>mealKcal(denPlan.Obed)){ const t=denPlan.Obed; denPlan.Obed=denPlan.Večera; denPlan.Večera=t; }
    dni.forEach(di=>{ plan[di]={}; sloty.forEach(s2=>{ if(denPlan[s2])plan[di][s2]=denPlan[s2].slice(); }); planF[di]={}; });
  });
  S.plan=plan; S.planF=planF; save(); renderPlan();
  if(document.getElementById("v-domov").classList.contains("active"))renderDash();
}
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
function renderNakup(){
  const box=document.getElementById("nakup-list");
  const domaEl=document.getElementById("doma-nakup"); if(domaEl){ if(document.activeElement===domaEl){S.domaNakup=domaEl.value;save();} else domaEl.value=S.domaNakup||""; }
  const tok=domaTokens();
  const {grp,notes}=nakupPolozky();
  const lowStock=S.spajza.filter(x=>x.min>0 && x.mnozstvo<x.min);
  const polozky=Object.values(grp); if(!polozky.length && !Object.keys(notes).length && !lowStock.length){ box.innerHTML='<p class="info">Zatiaľ nič v pláne. Pridaj recepty v <b>Pláne</b>.</p>'; return; }
  const podla={}; let total=0;
  polozky.forEach(G=>{ (podla[G.oddelenie]=podla[G.oddelenie]||[]).push(G); if(!jeDoma(G.nazov,tok))total+=(G.cena||0); });
  Object.values(notes).forEach(N=>{ (podla[N.oddelenie]=podla[N.oddelenie]||[]).push(N); });
  const poradie=["Zelenina a ovocie","Mäso a ryby","Mliečne a vajcia","Pečivo","Cestoviny a ryža","Trvanlivé a konzervy","Omáčky a dochucovadlá","Oleje a tuky","Orechy a semená","Pečenie a sladké","Korenie a bylinky","Ostatné"];
  let h=`<div class="tile" style="margin-bottom:16px"><div class="lbl">Odhadovaná cena nákupu (${stravniciList().length} os.)</div><div class="val">${eur(total)}</div></div>`;
  if(lowStock.length){ h+='<div class="odd"><h4>🧊 Doplniť zásoby (pod minimom)</h4>'; lowStock.forEach(x=>{ h+=`<label><span class="nm2">${x.nazov} — <b>${fmt(Math.max(0,x.min-x.mnozstvo))} ${x.jednotka}</b></span><span class="cena"></span></label>`; }); h+="</div>"; }
  poradie.filter(o=>podla[o]).forEach(o=>{
    h+=`<div class="odd"><h4>${o}</h4>`;
    podla[o].sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(G=>{
      if(G.pozn!==undefined){ h+=`<label><span class="nm2">${G.nazov} — <i>${G.pozn}</i></span><span class="cena"></span></label>`; return; }
      const doma=jeDoma(G.nazov,tok); const mn=nakupMnozstvo(G); const akc=ingVakcii(G.nazov);
      const key=(G.key).replace(/'/g,""); const ck=S.nakupCheck[key]||doma;
      h+=`<label class="${ck?'checked':''}"><span class="nm2"><input type="checkbox" ${ck?'checked':''} ${doma?'disabled':''} onchange="checkNakup('${key}',this.checked,this)"> ${G.nazov} — <b>${mn}</b>${akc?' <span class="badge price">🏷️ akcia</span>':''}${doma?' <span class="info">(máš doma)</span>':''}</span><span class="cena">${!doma&&(G.cena||0)>0.005?eur(G.cena):""}</span></label>`;
    });
    h+="</div>";
  });
  box.innerHTML=h;
}
function checkNakup(key,val,el){ S.nakupCheck[key]=val; if(!val)delete S.nakupCheck[key]; save(); el.closest("label").classList.toggle("checked",val); }
function kopirujListonic(){
  const tok=domaTokens(); const {grp,notes}=nakupPolozky();
  const riadky=Object.values(grp).filter(G=>!jeDoma(G.nazov,tok)).map(G=>G.nazov+" "+zobrazMnozstvo(G));
  Object.values(notes).forEach(N=>{ if(!jeDoma(N.nazov,tok))riadky.push(N.nazov); });
  if(!riadky.length){ alert("Plán je prázdny."); return; }
  const txt=riadky.join("\n");
  if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(()=>alert("Skopírované ("+riadky.length+" položiek). Vlož do Listonic."),()=>promptFallback(txt)); }
  else promptFallback(txt);
}
function promptFallback(txt){ window.prompt("Skopíruj (Ctrl+C):",txt); }

function renderDash(){
  const plan=planItems();
  let kcalDni=[],cenaTyz=0; for(let di=0;di<7;di++){ let sum=0,ma=false; SLOTY.forEach(sl=>{ const f=pf(di,sl), m=mnozMult(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r){ma=true; sum+=kcalPorcia(r)*f; cenaTyz+=cenaPorcia(r)*m;}}); }); if(ma)kcalDni.push(Math.round(sum)); }
  const priemer=kcalDni.length?Math.round(kcalDni.reduce((a,b)=>a+b,0)/kcalDni.length):0;
  document.getElementById("dash-tiles").innerHTML=`
    <div class="tile"><div class="lbl">Receptov</div><div class="val">${RECEPTY.length}</div></div>
    <div class="tile"><div class="lbl">Jedál v pláne</div><div class="val">${plan.length}</div></div>
    <div class="tile"><div class="lbl">Priemer kcal/deň</div><div class="val">${priemer||"–"}<small> /${S.profil.kcal}</small></div></div>
    <div class="tile"><div class="lbl">Cena týždňa</div><div class="val">${cenaTyz>0.05?eur(cenaTyz):"–"}</div></div>`;
  vyberDnes();
  const fav=RECEPTY.filter(r=>S.fav[r.id]).slice(0,4);
  document.getElementById("dash-fav").innerHTML = fav.length? fav.map(r=>'<div class="card">'+kartaHTML(r)+'</div>').join("") : '<p class="info">Zatiaľ žiadne obľúbené — klikni na ★ pri recepte.</p>';
  const hist=S.uvarene.slice(0,6).map(u=>{const r=receptById(u.id);return r?`${r.nazov} <span style="color:var(--muted)">(${u.datum})</span>`:null;}).filter(Boolean);
  document.getElementById("dash-hist").innerHTML = hist.length? hist.join("<br>") : "Nič zatiaľ. Po dokončení režimu varenia sa recept zapíše sem.";
  renderDashSpajza(); renderVoda("dash-voda"); renderOkno();
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

function renderVyziva(){
  const dni=[]; for(let di=0;di<7;di++){ let kc=0,b=0,t=0,sx=0,vl=0,na=0; SLOTY.forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r){const v=vyzivaReceptu(r); kc+=v.kcal*f;b+=v.b*f;t+=v.t*f;sx+=v.s*f;vl+=(v.vl||0)*f;na+=(v.na||0)*f;}}); }); dni.push({kc:Math.round(kc),b,t,s:sx,vl:vl,na:na}); }
  const maxKc=Math.max(S.profil.kcal||0,...dni.map(d=>d.kc),1);
  const akt=dni.filter(d=>d.kc>0);
  const priemKc=akt.length?Math.round(akt.reduce((a,d)=>a+d.kc,0)/akt.length):0;
  const priemB=akt.length?akt.reduce((a,d)=>a+d.b,0)/akt.length:0;
  const priemVl=akt.length?akt.reduce((a,d)=>a+d.vl,0)/akt.length:0;
  const priemNa=akt.length?akt.reduce((a,d)=>a+d.na,0)/akt.length:0;
  document.getElementById("vyziva-tiles").innerHTML=`
    <div class="tile"><div class="lbl">Priemer kcal/deň</div><div class="val">${priemKc||"–"}<small> /${S.profil.kcal}</small></div></div>
    <div class="tile"><div class="lbl">Priemer bielkovín/deň</div><div class="val">${akt.length?fmt(priemB)+" g":"–"}${S.profil.biel?'<small> /'+S.profil.biel+'</small>':''}</div></div>
    <div class="tile"><div class="lbl">Naplánovaných dní</div><div class="val">${akt.length}/7</div></div>
    <div class="tile"><div class="lbl">Vláknina/deň</div><div class="val">${akt.length?fmt(priemVl)+" g":"–"}<small> /30</small></div></div>
    <div class="tile"><div class="lbl">Sodík/deň</div><div class="val" style="${priemNa>2300?'color:var(--warn)':''}">${akt.length?Math.round(priemNa)+" mg":"–"}<small> /2300</small></div></div>`;
  const ciel=S.profil.kcal||0;
  let ch=""; dni.forEach((d,i)=>{ const hgt=Math.round(d.kc/maxKc*100); const over=ciel&&d.kc>ciel;
    ch+=`<div class="col"><span class="v">${d.kc||""}</span><div class="bar2 ${over?'over':''}" style="height:${hgt}%"></div><span class="d">${DNI[i].slice(0,2)}</span></div>`; });
  document.getElementById("vyziva-chart").innerHTML=ch;
  document.getElementById("vyziva-ciel").textContent = ciel? `Denný cieľ ${ciel} kcal. Stĺpce nad cieľom sú červené.` : "Nastav si denný cieľ v Nastaveniach.";
  let B=0,T=0,Sx=0; dni.forEach(d=>{B+=d.b;T+=d.t;Sx+=d.s;});
  const tot=B*4+T*9+Sx*4||1;
  document.getElementById("vyziva-makro").innerHTML=`
    <div style="display:flex;height:26px;border-radius:8px;overflow:hidden;margin-bottom:10px">
      <div style="width:${B*4/tot*100}%;background:#2e7d54"></div>
      <div style="width:${T*9/tot*100}%;background:#e0a800"></div>
      <div style="width:${Sx*4/tot*100}%;background:#b06a3b"></div></div>
    <div class="info">🟩 Bielkoviny ${fmt(B)} g · 🟨 Tuky ${fmt(T)} g · 🟫 Sacharidy ${fmt(Sx)} g (za týždeň)</div>`;
}

function vypocitajCiel(){ const poh=document.getElementById("t-poh").value; const vek=parseInt(document.getElementById("t-vek").value)||30; const vys=parseInt(document.getElementById("t-vyska").value)||175; const vah=parseInt(document.getElementById("t-vaha").value)||75; const akt=parseFloat(document.getElementById("t-akt").value)||1.55; const bmr=10*vah+6.25*vys-5*vek+(poh==="m"?5:-161); const tdee=Math.round(bmr*akt/10)*10; document.getElementById("p-kcal").value=tdee; document.getElementById("tdee-ok").textContent="Odhad udržiavacieho príjmu: "+tdee+" kcal/deň. Ulož vyššie tlačidlom Uložiť."; }
function zalohuj(){ try{ const blob=new Blob([JSON.stringify(S)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="kucharka-zaloha.json"; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ alert("Zálohovanie zlyhalo."); } }
function obnov(file){ if(!file)return; const rd=new FileReader(); rd.onload=e=>{ try{ const o=JSON.parse(e.target.result); S=Object.assign(S,o); save(); alert("Obnovené. Stránka sa načíta znova."); location.reload(); }catch(err){ alert("Neplatný súbor zálohy."); } }; rd.readAsText(file); }
function normStravnici(){ if(!Array.isArray(S.profil.stravnici)||!S.profil.stravnici.length){ S.profil.stravnici=stravniciList(); } S.profil.osoby=S.profil.stravnici.length; }
function renderStravnici(){ const box=document.getElementById("stravnici-box"); if(!box)return; const l=stravniciList();
  box.innerHTML=l.map((p,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px"><input value="${(p.nazov||"").replace(/"/g,"")}" onchange="zmenStravnika(${i},'nazov',this.value)" placeholder="meno" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" value="${p.kcal||""}" onchange="zmenStravnika(${i},'kcal',this.value)" title="kcal/deň" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"><a onclick="zmazStravnika(${i})" style="color:var(--warn);cursor:pointer;align-self:center" title="odobrať">✕</a></div>`).join(""); }
function pridajStravnika(){ const l=stravniciList().slice(); l.push({nazov:"Ďalší",kcal:S.profil.kcal||1450}); S.profil.stravnici=l; S.profil.osoby=l.length; save(); renderStravnici(); }
function zmenStravnika(i,k,v){ const l=stravniciList().slice(); if(!l[i])return; l[i][k]=(k==="kcal")?(parseInt(v)||0):v; S.profil.stravnici=l; S.profil.osoby=l.length; save(); }
function zmazStravnika(i){ let l=stravniciList().slice(); if(l.length<=1)return; l.splice(i,1); S.profil.stravnici=l; S.profil.osoby=l.length; save(); renderStravnici(); }
function naplnProfil(){ renderStravnici(); document.getElementById("p-kcal").value=S.profil.kcal;
  document.getElementById("p-biel").value=S.profil.biel||0; document.getElementById("p-ryby").checked=!!S.profil.ryby;
  document.getElementById("p-lepok").checked=!!S.profil.lepok; document.getElementById("p-mlieko").checked=!!S.profil.mlieko; var pd=document.getElementById("p-dark"); if(pd)pd.checked=!!S.profil.dark; var pb=document.getElementById("p-big"); if(pb)pb.checked=!!S.profil.big; var pa=document.getElementById("p-akcie"); if(pa)pa.value=S.akcie||""; var pbal=document.getElementById("p-balenia"); if(pbal)pbal.checked=(S.profil.balenia!==false); var pw=document.getElementById("p-watch"); if(pw)pw.value=S.profil.watch||""; var pks=document.getElementById("p-kupsnack"); if(pks)pks.checked=(S.profil.kupSnack!==false); var pct=document.getElementById("p-cieltyp"); if(pct)pct.value=S.profil.cielTyp||"udrzanie"; var pok=document.getElementById("p-okno"); if(pok)pok.checked=!!S.profil.okno; var pos=document.getElementById("p-oknostart"); if(pos)pos.value=S.profil.oknostart||12;
  document.getElementById("profil-ok").textContent=""; renderVahy(); }
function ulozProfil(){ normStravnici();
  S.profil.kcal=parseInt(document.getElementById("p-kcal").value)||1450; S.profil.biel=parseInt(document.getElementById("p-biel").value)||0;
  S.profil.ryby=document.getElementById("p-ryby").checked; S.profil.lepok=document.getElementById("p-lepok").checked; S.profil.mlieko=document.getElementById("p-mlieko").checked; S.profil.dark=document.getElementById("p-dark").checked; S.profil.big=document.getElementById("p-big").checked; S.akcie=document.getElementById("p-akcie").value; S.profil.balenia=document.getElementById("p-balenia").checked; S.profil.watch=document.getElementById("p-watch").value; S.profil.kupSnack=document.getElementById("p-kupsnack").checked; S.profil.cielTyp=document.getElementById("p-cieltyp").value; S.profil.okno=document.getElementById("p-okno").checked; S.profil.oknostart=parseInt(document.getElementById("p-oknostart").value)||12;
  applyVzhlad(); save(); document.getElementById("profil-ok").textContent="Uložené ✓"; renderGrid(); }

function renderDoma(){
  const raw=document.getElementById("doma-in").value.toLowerCase();
  const mam=raw.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
  const out=document.getElementById("doma-out");
  if(!mam.length){ out.innerHTML='<p class="info">Napíš aspoň jednu surovinu.</p>'; return; }
  const skore=RECEPTY.map(r=>{ let mame=0,chyba=[];
    (r.ingrediencie||[]).forEach(i=>{ const nm=i.nazov.toLowerCase(); const ok=mam.some(m=>nm.includes(m)||m.includes(nm.split(" ")[0]));
      if(ok)mame++; else if(i.mnozstvo!=null)chyba.push(i.nazov); });
    const spolu=(r.ingrediencie||[]).length||1; return {r,pct:Math.round(mame/spolu*100),chyba};
  }).filter(x=>x.pct>0).sort((a,b)=>b.pct-a.pct);
  if(!skore.length){ out.innerHTML='<p class="info">Nenašli sa žiadne recepty.</p>'; return; }
  out.innerHTML=skore.slice(0,12).map(x=>`<div class="match">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <b style="cursor:pointer" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${x.r.nazov}</b>
      <span style="color:var(--muted);font-size:14px">${x.pct}%</span></div>
    <div class="bar"><i style="width:${x.pct}%"></i></div>
    ${x.chyba.length?`<div style="font-size:13px;color:var(--muted)">Chýba: ${x.chyba.slice(0,6).join(", ")}${x.chyba.length>6?"…":""}</div>`:'<div style="font-size:13px;color:var(--accent)">Máš všetko! 🎉</div>'}
  </div>`).join("");
}
["hladaj","f-kuchyna","f-cas","f-diet"].forEach(id=>{
  const el=document.getElementById(id); if(!el)return;
  el.addEventListener("input",renderGrid); el.addEventListener("change",renderGrid);
});
function dnesISO(){ return new Date().toISOString().slice(0,10); }
function dniDo(iso){ if(!iso)return null; return Math.round((new Date(iso+"T00:00:00")-new Date(dnesISO()+"T00:00:00"))/86400000); }
function expTrieda(iso){ const n=dniDo(iso); if(n===null)return ""; if(n<0)return "exp-over"; if(n<=4)return "exp-soon"; return ""; }
function expText(iso){ const n=dniDo(iso); if(n===null)return ""; if(n<0)return "expirované ("+(-n)+" d)"; if(n===0)return "spotrebuj dnes"; if(n<=4)return "o "+n+" d"; return iso; }
function pridajZasobu(){ const nazov=document.getElementById("sp-nazov").value.trim(); if(!nazov){alert("Zadaj surovinu.");return;}
  S.spajza.push({id:S.spSid++,nazov:nazov,mnozstvo:parseFloat(document.getElementById("sp-mn").value)||0,jednotka:document.getElementById("sp-jed").value,miesto:document.getElementById("sp-miesto").value,expiry:document.getElementById("sp-exp").value||"",min:parseFloat(document.getElementById("sp-min").value)||0});
  save(); ["sp-nazov","sp-mn","sp-exp","sp-min"].forEach(id=>document.getElementById(id).value=""); renderSpajza(); }
function zmazZasobu(id){ S.spajza=S.spajza.filter(x=>x.id!==id); save(); renderSpajza(); }
function upravZasobu(id,d){ const it=S.spajza.find(x=>x.id===id); if(it){ it.mnozstvo=Math.max(0,Math.round((it.mnozstvo+d)*100)/100); save(); renderSpajza(); } }
function spRow(x){ const low=x.min>0&&x.mnozstvo<x.min;
  return `<div class="sp-row"><span><b>${x.nazov}</b> <span class="meta2">${fmt(x.mnozstvo)} ${x.jednotka}${x.min?" · min "+fmt(x.min):""}${low?' <span class="low">(doplniť)</span>':""}${x.expiry?' · <span class="'+expTrieda(x.expiry)+'">'+expText(x.expiry)+'</span>':""}</span></span><span style="display:flex;gap:6px;align-items:center"><button class="mini" onclick="upravZasobu(${x.id},-1)">−</button><button class="mini" onclick="upravZasobu(${x.id},1)">+</button><a onclick="zmazZasobu(${x.id})" style="color:var(--warn);cursor:pointer">✕</a></span></div>`; }
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
function renderVoda(elid){ const el=document.getElementById(elid); if(!el)return; const d=dnesISO(); const n=S.voda[d]||0; let h="";
  for(let i=1;i<=8;i++) h+=`<span class="glass ${i<=n?'on':''}" onclick="setVoda(${i})">💧</span>`;
  h+=`<span style="margin-left:8px;color:var(--muted)">${n}/8 pohárov</span>`; el.innerHTML=h; }
function setVoda(n){ const d=dnesISO(); S.voda[d]=(S.voda[d]===n)?n-1:n; save(); renderVoda("dash-voda"); }
function domaZoSpajze(){ document.getElementById("doma-in").value=S.spajza.map(x=>x.nazov).join(", "); renderDoma(); }
function expBoost(r){ const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=5;}).map(x=>x.nazov.toLowerCase());
  if(!soon.length)return 0; return (r.ingrediencie||[]).some(i=>{const nn=i.nazov.toLowerCase();return soon.some(sx=>nn.includes(sx)||sx.includes(nn.split(" ")[0]));})?1.5:0; }
function odpisRecept(r){ if(!r)return; if(!S.spajza.length){alert("Špajza je prázdna.");return;} let zmen=0;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; const it=S.spajza.find(x=>{const a=x.nazov.toLowerCase(),b=i.nazov.toLowerCase();return (a.includes(b)||b.includes(a.split(" ")[0]))&&x.jednotka===i.jednotka;});
    if(it){ it.mnozstvo=Math.max(0,Math.round((it.mnozstvo-i.mnozstvo*(S.profil.osoby/(r.porcie||1)))*100)/100); zmen++; } });
  S.spajza=S.spajza.filter(x=>x.mnozstvo>0); save();
  alert(zmen?("Odpísané zo špajze: "+zmen+" surovín."):"Nenašla sa zhoda (skontroluj názvy a jednotky v špajzi)."); }
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
    h+=`<div class="day${iso===dnes?' dnes':''}"><div class="dn">${d}</div>${ev.map(n=>`<div class="ev" title="${n}">${n}</div>`).join("")}</div>`; }
  h+="</div>"; if(!(S.uvarene||[]).length) h+='<p class="info" style="margin-top:10px">Zatiaľ žiadna história. Po dokončení režimu varenia sa jedlo zapíše do kalendára.</p>';
  grid.innerHTML=h; }
function planVarenia(di){ const dni=blokDni(di); const den=S.plan[dni[0]]||{};
  const bi=bloky().findIndex(b=>b[0]===dni[0]); const pism=String.fromCharCode(65+(bi<0?0:bi)); const vari=DNI[(dni[0]+6)%7].slice(0,2);
  let h=`<div class="hero"><button class="close" onclick="zavri()">✕</button><h2>🍳 Plán varenia — Blok ${pism}</h2><div class="subx">${DNI[dni[0]].slice(0,2)}–${DNI[dni[dni.length-1]].slice(0,2)} · varí sa ${vari} večer</div></div><div class="content2">`;
  let any=false;
  SLOTY.forEach(sl=>{ const ids=slotIds(dni[0],sl); if(!ids.length)return; any=true; h+=`<h4 class="sekcia">${ikony[sl]||""} ${sl}</h4>`;
    const por=Math.max(1,Math.round(porcieNaVar(dni[0],sl)));
    ids.forEach(cid=>{ const k=komponent(cid); if(!k)return; const btn=k._priloha?"":`<button class="mini" onclick="zavri();otvor('${cid}',{di:${dni[0]},slot:'${sl}'})">recept</button>`;
      h+=`<div class="sp-row"><span><b>${k.nazov}</b> <span class="meta2">${por} porcií · ${Math.round(kcalPorcia(k))} kcal/porcia</span></span>${btn}</div>`; }); });
  if(!any) h+='<p class="info">V tomto bloku nie sú naplánované jedlá. Zostav jedálniček alebo klikni do buniek.</p>';
  else h+=`<div class="tipy">💡 Navar dávku na celý blok (${dni.length} dni × ${stravniciList().length} os.). Presné porcie sú pri každom jedle; suroviny spolu nájdeš v Nákupe.</div>`;
  h+="</div>"; document.getElementById("modal").innerHTML=h; document.getElementById("overlay").classList.add("open"); document.body.style.overflow="hidden"; }
function renderOkno(){ const el=document.getElementById("dash-okno"); if(!el)return; if(!S.profil.okno){el.innerHTML="";return;}
  const st=S.profil.oknostart||12; const en=(st+8)%24; const now=new Date().getHours()+new Date().getMinutes()/60;
  const vOkne = st<en ? (now>=st&&now<en) : (now>=st||now<en);
  el.innerHTML = `🕒 Okno jedenia ${st}:00–${en}:00 · ${vOkne?'<span class="exp-soon">teraz môžeš jesť</span>':'mimo okna (pôst)'}`; }
function zapisVahu(){ const kg=parseFloat(document.getElementById("v-vaha").value); if(!kg){alert("Zadaj váhu.");return;} const d=dnesISO();
  const ex=S.vahy.find(x=>x.d===d); if(ex)ex.kg=kg; else S.vahy.push({d:d,kg:kg}); S.vahy.sort((a,b)=>a.d.localeCompare(b.d)); save(); document.getElementById("v-vaha").value=""; renderVahy(); }
function tyzdennaZmena(){ if(S.vahy.length<2)return null; const last=S.vahy[S.vahy.length-1],prvy=S.vahy[0]; const dni=(new Date(last.d)-new Date(prvy.d))/86400000; if(dni<1)return null; return (last.kg-prvy.kg)/dni*7; }
function renderVahy(){ const el=document.getElementById("vahy-info"); if(!el)return; if(!S.vahy.length){el.innerHTML="Zatiaľ žiadny záznam.";return;}
  const last=S.vahy[S.vahy.length-1]; const z=tyzdennaZmena();
  el.innerHTML=`Posledná: <b>${fmt(last.kg)} kg</b> (${last.d})${z!==null?" · trend <b>"+(z>0?"+":"")+fmt(z)+" kg/týž</b> ("+S.vahy.length+" meraní)":" · pre trend zapíš aspoň 2 merania"}`; }
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
function syncNakonfig(){ return typeof SYNC_CONFIG!=="undefined" && SYNC_CONFIG && SYNC_CONFIG.url && SYNC_CONFIG.key && SYNC_CONFIG.id; }
function syncPush(){ if(!syncNakonfig())return; clearTimeout(syncTimer); syncTimer=setTimeout(async()=>{ try{ S._ts=Date.now(); localStorage.setItem(LS,JSON.stringify(S));
  await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka",{method:"POST",headers:{apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify({id:SYNC_CONFIG.id,data:S,ts:S._ts})}); }catch(e){} },1500); }
async function syncPull(){ if(!syncNakonfig())return; try{
  const r=await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka?id=eq."+encodeURIComponent(SYNC_CONFIG.id)+"&select=data,ts",{headers:{apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key}});
  const j=await r.json(); if(Array.isArray(j)&&j[0]&&j[0].ts>((S._ts)||0)){ S=Object.assign(S,j[0].data); uloz(S); location.reload(); } }catch(e){} }
if('serviceWorker' in navigator && location.protocol.startsWith('http')){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
syncPull();
applyVzhlad(); naplnKuchyne(); renderChips(); renderGrid(); naplnJedalnicky(); renderDash();
