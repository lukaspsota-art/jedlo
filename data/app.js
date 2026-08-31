// ── Rozbalenie vložených dát (P3: veľkosť súboru) ─────────────────────────────
// 1961 receptov ako obyčajný JSON = 3,95 MB z 5,35 MB súboru, teda ~11 s prvého načítania
// na 4 Mbit/s. Build ich preto vkladá skomprimované (raw DEFLATE, RFC 1951, base64).
// Rozbalenie MUSÍ byť synchrónne: RECEPTY je top-level const, od ktorého závisí celý
// zvyšok súboru, a `DecompressionStream` je asynchrónny (prerobiť appku na async štart
// je iná úloha). Preto je tu malý inflate — je to celá podpora, ktorú appka potrebuje,
// a kuchárka zostáva JEDEN offline súbor bez CDN a bez knižnice.
// `_rozbal` prepustí hotové pole/objekt bez zmeny: tak dostáva dáta test_harness.js
// (vkladá do placeholderu priamo JSON) aj build s prepínačom `--data=json`.
const _ZL_LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
const _ZL_LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
const _ZL_DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
const _ZL_DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
const _ZL_ORD=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
// kanonický Huffmanov strom podľa dĺžok kódov (postup „puff“ z referenčnej implementácie zlib)
function _zlStrom(lens,off,n){ const count=new Int32Array(16);
  for(let i=0;i<n;i++)count[lens[off+i]]++;
  count[0]=0;
  const offs=new Int32Array(16); for(let i=1;i<16;i++)offs[i]=offs[i-1]+count[i-1];
  const symbol=new Int32Array(n); for(let i=0;i<n;i++){ const l=lens[off+i]; if(l)symbol[offs[l]++]=i; }
  return {c:count,s:symbol}; }
function _zlInflate(src){
  let out=new Uint8Array(Math.max(4096,src.length*5)),olen=0;
  const rez=n=>{ if(olen+n<=out.length)return; let c=out.length; while(c<olen+n)c*=2;
    const b=new Uint8Array(c); b.set(out.subarray(0,olen)); out=b; };
  let pos=0,buf=0,cnt=0;
  const bits=n=>{ while(cnt<n){ buf|=src[pos++]<<cnt; cnt+=8; } const v=buf&((1<<n)-1); buf>>>=n; cnt-=n; return v; };
  const dec=h=>{ let code=0,first=0,index=0;
    for(let len=1;len<16;len++){ code|=bits(1); const c=h.c[len];
      if(code-first<c) return h.s[index+(code-first)];
      index+=c; first=(first+c)<<1; code<<=1; }
    throw new Error("poškodené dáta (Huffman)"); };
  let fixL=null,fixD=null;
  for(;;){
    const posl=bits(1), typ=bits(2);
    if(typ===0){ pos-=cnt>>3; buf=0; cnt=0;            // nekomprimovaný blok: zarovnaj na bajt
      const len=src[pos]|(src[pos+1]<<8); pos+=4;
      rez(len); out.set(src.subarray(pos,pos+len),olen); olen+=len; pos+=len; }
    else{
      let L,D;
      if(typ===1){ if(!fixL){ const l=new Uint8Array(288); let i=0;
          for(;i<144;i++)l[i]=8; for(;i<256;i++)l[i]=9; for(;i<280;i++)l[i]=7; for(;i<288;i++)l[i]=8;
          fixL=_zlStrom(l,0,288); const d=new Uint8Array(30); d.fill(5); fixD=_zlStrom(d,0,30); }
        L=fixL; D=fixD; }
      else if(typ===2){
        const nl=bits(5)+257, nd=bits(5)+1, nc=bits(4)+4;
        const cl=new Uint8Array(19);
        for(let i=0;i<nc;i++) cl[_ZL_ORD[i]]=bits(3);
        const CH=_zlStrom(cl,0,19);
        const lens=new Uint8Array(nl+nd);
        let i=0;
        while(i<nl+nd){ const sym=dec(CH);
          if(sym<16) lens[i++]=sym;
          else{ let hod=0,op=0;
            if(sym===16){ hod=lens[i-1]; op=3+bits(2); }
            else if(sym===17){ op=3+bits(3); }
            else { op=11+bits(7); }
            while(op--) lens[i++]=hod; } }
        L=_zlStrom(lens,0,nl); D=_zlStrom(lens,nl,nd); }
      else throw new Error("poškodené dáta (typ bloku)");
      for(;;){ const sym=dec(L);
        if(sym<256){ rez(1); out[olen++]=sym; }
        else if(sym===256) break;
        else { const si=sym-257; const dl=_ZL_LB[si]+bits(_ZL_LE[si]);
          const di=dec(D); const vzd=_ZL_DB[di]+bits(_ZL_DE[di]);
          rez(dl); let p=olen-vzd; for(let k=0;k<dl;k++) out[olen++]=out[p++]; } }
    }
    if(posl)break;
  }
  return out.subarray(0,olen); }
function _rozbal(x){ if(typeof x!=="string") return x;      // hotové dáta (harness, --data=json)
  const bin=atob(x), n=bin.length, u=new Uint8Array(n);
  for(let i=0;i<n;i++) u[i]=bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(_zlInflate(u))); }

const RECEPTY = _rozbal(__DATA__);
const POTRAVINY = _rozbal(__POTRAVINY__);
const JEDALNICKY = _rozbal(__JEDALNICKY__);
// ── Fotky receptov ─────────────────────────────────────────────────────────────
// `foto` je BUĎ prázdne, BUĎ názov súboru v `recepty/fotky/`, BUĎ priamo `data:` URI.
// Build (generuj_kucharku.py --fotky=inline, predvolené) vkladá miniatúry ako data: URI,
// aby kuchárka zostala JEDEN offline súbor; `--fotky=subor` necháva názvy súborov.
// Vlastné recepty z mobilu si ukladajú data: URI (zmenšené cez canvas) do localStorage.
// FOTO_ZDROJE = atribúcia k fotke (autor, licencia, odkaz) — vykresľuje sa POD fotkou v detaile.
const FOTO_ZDROJE = _rozbal(__FOTO_ZDROJE__);
// Prísna validácia: `foto` sa dostáva aj zo synchronizovaného localStorage, takže do `src`
// nesmie ísť ľubovoľný reťazec (`" onerror=…` by bol XSS). Čokoľvek iné = žiadna fotka.
function fotoSrc(r){ const f=(r&&r.foto)||"";
  if(typeof f!=="string"||!f) return "";
  if(/^data:image\/(webp|jpeg|png|avif);base64,[A-Za-z0-9+/=]+$/.test(f)) return f;
  if(/^[A-Za-z0-9._-]{1,80}\.(webp|jpg|jpeg|png|avif)$/.test(f)) return "recepty/fotky/"+f;
  return ""; }
function maFoto(r){ return !!fotoSrc(r); }
// Recept BEZ fotky je väčšina databázy. Bez odlíšenia je mriežka rad rovnakých béžových
// obdĺžnikov, takže každý recept dostane deterministicky jeden zo 6 odtieňov palety.
// Farby sú TRIEDY v šablóne (aj pre tmavý režim) — inline štýl by tmavý režim rozbil.
function fotoTon(r){ const s=(r&&r.id)||""; let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return "t"+(h%6); }
// Emoji je POD obrázkom, nie namiesto neho: keď sa obrázok nenačíta (chýbajúci priečinok,
// prehliadač bez WebP), `onerror` ho odstráni a ostane presne dnešný vzhľad.
function thumbHTML(r,lazy){ const em=ikony[r.kategoria]||"🍴"; const src=fotoSrc(r);
  return '<span class="ikon" aria-hidden="true">'+em+'</span>'
    +(src?'<img src="'+src+'" alt="" '+(lazy?'loading="lazy" ':'')+'decoding="async" onerror="this.remove()">':''); }
function thumbTrieda(r){ return "thumb "+fotoTon(r)+(maFoto(r)?" ma-foto":""); }
// Atribúcia pri fotke — Wikimedia (CC BY-SA) aj TheMealDB/TheCocktailDB ju vyžadujú,
// a musí byť vidieť PRI fotke, nie len v pätičke receptu.
function fotoPopisHTML(r){ const z=FOTO_ZDROJE&&FOTO_ZDROJE[r.id]; if(!z)return "";
  const a=z.a?escHtml(z.a):""; const l=z.l?escHtml(z.l):"";
  const lic=l?(z.lu?'<a href="'+escHtml(z.lu)+'" target="_blank" rel="noopener noreferrer">'+l+'</a>':l):"";
  const kde=z.u?'<a href="'+escHtml(z.u)+'" target="_blank" rel="noopener noreferrer">zdroj fotky</a>':"";
  const casti=[a?"Foto: "+a:"Foto", lic, kde].filter(Boolean);
  return '<figcaption class="foto-kredit">'+casti.join(" · ")+'</figcaption>'; }
const DNI = ["Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota","Nedeľa"];
const VSETKY_SLOTY = ["Raňajky","Desiata","Obed","Olovrant","Večera","Snack"];
const DEFAULT_SLOTY = ["Raňajky","Obed","Večera","Snack"];
function SLOTY(){ const v=S.profil&&S.profil.sloty; const akt=(Array.isArray(v)&&v.length)?v:DEFAULT_SLOTY; return VSETKY_SLOTY.filter(s=>akt.includes(s)); }
const ikony = {"Raňajky":"🍳","Desiata":"🥐","Obed":"🍝","Olovrant":"🍏","Večera":"🍽️","Hlavné jedlo":"🍽️","Cestoviny":"🍝","Polievka":"🥣","Šalát":"🥗","Nátierka":"🧈","Snack":"🥪","Dezert":"🍰","Príloha":"🍚","Kokteil":"🍸","Nápoj":"🥤","Pečivo":"🥖"};
// Snackový slot berie UŽ LEN kategóriu Snack a v nej len hotové kúpené výrobky (viď jeVyrobok).
// Dezert a Nátierka sa odtiaľ vypustili: požiadavka používateľa je „nič, čo treba robiť
// alebo zvlášť vážiť — normálne zabalené, ako sa to kúpi".
const SLOT_KATEGORIE = {"Raňajky":["Raňajky","Nátierka"],"Desiata":["Snack"],"Obed":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Olovrant":["Snack"],"Večera":["Hlavné jedlo","Cestoviny","Polievka","Šalát"],"Snack":["Snack"]};
const SNACK_SLOTY=["Desiata","Olovrant","Snack"];
function jeSnackSlot(slot){ return SNACK_SLOTY.includes(slot); }
// hotový kúpený výrobok: jedno balenie = jedna porcia, otvor a zjedz (`typ:"vyrobok"` v recepte)
function jeVyrobok(r){ return !!r && r.typ==="vyrobok"; }
// do ktorého slotu ponúknuť recept pri ručnom pridaní do plánu; generátor sa riadi SLOT_KATEGORIE,
// toto je len predvoľba v rozbaľovacom zozname (dezert si používateľ dá kam chce)
const SLOT_PREDVOLBA = {"Dezert":"Snack","Kokteil":"Snack","Nápoj":"Snack","Príloha":"Obed","Pečivo":"Raňajky"};
function jeHlavnyChodSlot(slot){ return (SLOT_KATEGORIE[slot]||[]).includes("Hlavné jedlo"); }
function jeNatierkovySlot(slot){ return (SLOT_KATEGORIE[slot]||[]).includes("Nátierka"); }
function isMain(r){ return ["Hlavné jedlo","Cestoviny","Polievka","Šalát"].includes(r.kategoria); }
function slotPreKategoriu(kat){ for(const sl of SLOTY()){ if((SLOT_KATEGORIE[sl]||[]).includes(kat)) return sl; }
  const pv=SLOT_PREDVOLBA[kat]; if(pv && SLOTY().includes(pv)) return pv;
  return "Obed"; }
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
function nacitaj(){try{return JSON.parse(localStorage.getItem(LS))}catch(e){return null}}
// Zlyhaný zápis (plná kvóta, súkromné okno) sa nesmie stratiť ticho — používateľ by celý večer
// plánoval do prázdna. Prvé zlyhanie povie nahlas, ďalšie už len do konzoly.
let _ulozZlyhalo=false;
function uloz(s){try{localStorage.setItem(LS,JSON.stringify(s)); _ulozZlyhalo=false;}catch(e){
  if(!_ulozZlyhalo){ _ulozZlyhalo=true;
    if(typeof toast==="function") toast("⚠️ Zmeny sa nedajú uložiť do tohto prehliadača (plná pamäť alebo súkromné okno). Zálohuj si dáta cez Nastavenia → Zálohovať.");
    else if(typeof console!=="undefined") console.warn("localStorage zápis zlyhal:",e); } }}

// ── NORMALIZÁCIA STAVU ───────────────────────────────────────────────────────────────────────
// Stav vstupuje do appky TROMI cestami a ani jedna nie je dôveryhodná:
//   1) localStorage pri štarte (kľúč sa dá prepísať čímkoľvek),
//   2) obnova zo zálohy — obnov() dostane ľubovoľný JSON súbor,
//   3) synchronizácia — syncPull / syncOsobnePull / syncSkupinaPull ťahajú blob z Supabase,
//      teda z iného zariadenia, prípadne z inej verzie appky.
// Pôvodné `S.spajza = S.spajza || []` opravilo len CHÝBAJÚCU hodnotu. Pri pravdivej, ale
// nesprávnej (`{}`, `"text"`, `5`) neopravilo nič a renderNakup, renderDash aj generujJedalnicek
// padli na `S.spajza.filter is not a function`. Poškodený stav sa navyše uložil späť, takže
// Domov a Nákup ostali rozbité natrvalo a z UI neviedla von žiadna cesta okrem
// „Vymazať všetky dáta".
// Preto je tu JEDNA tabuľka očakávaných typov a JEDNA funkcia, ktorá ju vynúti na všetkých troch
// vstupoch. Typy: o = objekt · a = pole · ao = pole objektov (prvky iného typu sa zahodia)
//                 s = reťazec · n = konečné číslo · b = boolean
const STAV_TYPY={
  fav:"o", hodn:"o", pozn:"o", plan:"o", planF:"o", nakupCheck:"o", skryte:"o", dayPpl:"o",
  slotPpl:"o", daySloty:"o", tyzdenProfil:"o", genCfg:"o", profil:"o",
  uvarene:"ao", archiv:"ao", spajza:"ao", vahy:"ao", nakupManual:"ao", mojeRecepty:"ao",
  hranice:"a",
  ciel:"s", domaNakup:"s", akcie:"s", viewOd:"s", _uid:"s",
  spSid:"n", blokV:"n", escV:"n", _ts:"n", _osobTs:"n", _skupTs:"n",
  blokMode:"b", _dirty:"b", _osobDirty:"b", _skupDirty:"b" };
const PROFIL_TYPY={
  stravnici:"ao", sloty:"a",
  osoby:"n", kcal:"n", biel:"n", oknostart:"n",
  ryby:"b", lepok:"b", mlieko:"b", dark:"b", big:"b", balenia:"b", okno:"b", kupSnack:"b",
  syncOff:"b", onboarded:"b",
  watch:"s", zakazane:"s", cielTyp:"s", syncId:"s", skupinaId:"s", skupinaKod:"s", skupinaNazov:"s",
  rezim:"s" };
const GENCFG_TYPY={ zachovat:"b", cielMode:"b", neMasoZaSebou:"b", filtre:"ao" };
// Prvok poľa, ktorému chýba pole na zobrazenie alebo radenie, sa v UI nedá ani ukázať, ani
// zmazať — a `a.nazov.localeCompare(b.nazov)` v renderNakup na ňom zhodí celý Nákup. Zdieľaný
// blob zo skupiny (SHARED_FIELDS nesie `spajza` aj `nakupManual`) taký prvok priniesť vie,
// preto sa zahadzuje. Reťazcové polia musia byť neprázdne, číselné konečné.
const POVINNE_V_POLI={ spajza:{nazov:"s"}, nakupManual:{nazov:"s"}, mojeRecepty:{id:"s",nazov:"s"},
  archiv:{id:"s"}, uvarene:{id:"s",datum:"s"}, vahy:{d:"s",kg:"n"} };
function prvokPouzitelny(x,poziadavky){
  for(const k in poziadavky){ const t=poziadavky[k];
    if(!sediTyp(x[k],t)) return false;
    if(t==="s" && !x[k].trim()) return false; }
  return true; }
// JSON zvonku nesmie siahnuť na prototyp: Object.assign(S, o) volá setter, takže "__proto__"
// v zálohe alebo v sync blobe by znečistil Object.prototype celej appky.
const NEBEZPECNE_KLUCE=["__proto__","constructor","prototype"];
function jeObjekt(v){ return v!==null && typeof v==="object" && !Array.isArray(v); }
function sediTyp(v,t){
  if(t==="o") return jeObjekt(v);
  if(t==="a"||t==="ao") return Array.isArray(v);
  if(t==="s") return typeof v==="string";
  if(t==="n") return typeof v==="number" && isFinite(v);
  if(t==="b") return typeof v==="boolean";
  return true; }
function prazdnaHodnota(t){ return t==="o"?{}:(t==="a"||t==="ao")?[]:t==="s"?"":t==="n"?0:false; }
// Očistí VSTUPNÝ blob (záloha, sync): pole nesprávneho typu sa ZAHODÍ, nie prepíše prázdnou
// hodnotou — inak by prázdna špajza z pokazeného blobu prepísala plnú lokálnu. Neznáme polia
// (staršia/novšia verzia appky) sa nechávajú tak.
function ocistiVstup(o,typy){
  if(!jeObjekt(o)) return {};
  NEBEZPECNE_KLUCE.forEach(k=>{ if(Object.prototype.hasOwnProperty.call(o,k)) delete o[k]; });
  for(const k in typy){
    if(!Object.prototype.hasOwnProperty.call(o,k)) continue;
    const t=typy[k];
    if(o[k]==null || !sediTyp(o[k],t)){ delete o[k]; continue; }
    if(t==="ao") o[k]=o[k].filter(jeObjekt); }
  if(typy===STAV_TYPY){
    if(jeObjekt(o.profil)) ocistiVstup(o.profil,PROFIL_TYPY);
    if(jeObjekt(o.genCfg)) ocistiVstup(o.genCfg,GENCFG_TYPY); }
  return o; }
// Vynúti tvar na CELOM stave. Kontajner (objekt/pole) nesprávneho typu → prázdny kontajner
// správneho typu, lebo kód s ním ráta bez kontroly (`S.spajza.filter`). Skalár nesprávneho typu
// sa len zahodí, nech platí východzia hodnota z Object.assign nižšie — nastaviť kcal na 0 by
// bolo horšie než nechať 1450.
function normalizujStav(o){
  const s=ocistiVstup(jeObjekt(o)?o:{},STAV_TYPY);
  for(const k in STAV_TYPY){ const t=STAV_TYPY[k];
    if((t==="o"||t==="a"||t==="ao") && !sediTyp(s[k],t)) s[k]=prazdnaHodnota(t); }
  for(const k in POVINNE_V_POLI) s[k]=s[k].filter(x=>prvokPouzitelny(x,POVINNE_V_POLI[k]));
  if(!sediTyp(s.profil.stravnici,"ao")) delete s.profil.stravnici;
  if(!sediTyp(s.profil.sloty,"a")) delete s.profil.sloty;
  if(!sediTyp(s.genCfg.filtre,"ao")) s.genCfg.filtre=[];
  return s; }
let S = normalizujStav(nacitaj());
S.ciel=S.ciel||""; S.domaNakup=S.domaNakup||""; S.akcie=S.akcie||""; S.blokMode=(S.blokMode!==undefined?S.blokMode:true);
if(!Array.isArray(S.hranice)||S.hranice.length!==7){ S.hranice=[true,false,true,false,false,true,false]; }
else if(S.blokV!==6 && JSON.stringify(S.hranice)===JSON.stringify([true,false,true,false,true,false,true])){ S.hranice=[true,false,true,false,false,true,false]; }
S.blokV=6; S.spajza=S.spajza||[]; S.spSid=S.spSid||1; S.vahy=S.vahy||[]; S.nakupManual=S.nakupManual||[];
S.genCfg=Object.assign({zachovat:false,cielMode:true,filtre:[]}, S.genCfg||{});
S.rozvrhy=Array.isArray(S.rozvrhy)?S.rozvrhy:[]; // vlastné uložené rozvrhy varenia (bloky)
S.dayPpl=S.dayPpl||{}; S.slotPpl=S.slotPpl||{}; S.daySloty=S.daySloty||{};
function isoZDatumu(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); } // lokálny dátum, NIE toISOString() (ten prevádza na UTC a vie posunúť deň)
function pridajDni(iso,n){ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return isoZDatumu(d); }
function pondelokPre(iso){ const d=new Date(iso+"T00:00:00"); const dow=(d.getDay()+6)%7; return pridajDni(iso,-dow); }
function datumPre(di){ return pridajDni(S.viewOd, di); } // di 0-6 → ISO dátum v rámci PRÁVE ZOBRAZENÉHO týždňa v Pláne
S.viewOd=/^\d{4}-\d{2}-\d{2}$/.test(S.viewOd)?S.viewOd:pondelokPre(dnesISO()); // nie len „nejaký reťazec" — nevalidný dátum by rozsypal celý Plánovač
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
// Migrácia: staršie verzie escapovali PRI ZÁPISE, takže v stave sedia „Cesnak &amp; smotana"
// a „Sůl &quot;hrubá&quot;". Odteraz sa escapuje až pri vykresľovaní, tak to raz vráť späť na text.
// Beží presne raz (S.escV), nad poľami, ktoré escHtml() kedysi prehnal.
function unescHtml(s){ return typeof s==="string" ? s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&") : s; }
(function migrujEscape(){ if(S.escV===2)return;
  const pole=(o,k)=>{ if(o&&typeof o[k]==="string") o[k]=unescHtml(o[k]); };
  S.mojeRecepty.forEach(r=>{ ["nazov","kuchyna","cas","tipy","popis"].forEach(k=>pole(r,k));
    if(Array.isArray(r.ingrediencie)) r.ingrediencie.forEach(i=>{ pole(i,"nazov"); pole(i,"jednotka"); });
    if(Array.isArray(r.postup)) r.postup=r.postup.map(unescHtml); });
  S.nakupManual.forEach(m=>{ pole(m,"nazov"); pole(m,"mnoz"); });
  S.spajza.forEach(x=>pole(x,"nazov"));
  S.escV=2; })();
// S.skryte (recepty skryté z generátora/plánu, nie zmazané — kľúč=id) a S.mojeRecepty už otypoval normalizujStav
S.mojeRecepty.forEach(r=>{ if(!RECEPTY.some(x=>x.id===r.id)) RECEPTY.push(r); });
const VERZIA="v20";
// ROZPOČET: cieľ je „€ na OSOBU a DEŇ" — rovnaká jednotka ako kalorický cieľ, takže sa nemení
// pri pridaní stravníka ani pri neúplnom týždni, a dá sa priamo porovnať so štatistikou.
// Predvolená hodnota vychádza z ŠÚ SR (Výdavky súkromných domácností 2025, zverejnené 12. 8. 2026):
// potraviny a nealko nápoje = 112 €/osoba/mesiac = 3,68 €/os./deň (kraje 80,3 € BA … 128,8 € TT).
// Náš plán pokrýva 100 % jedál doma (priemer v štatistike má časť jedál mimo domu) a appka počíta
// cenu SPOTREBY, nie celých balení, preto je predvolený cieľ o kúsok vyššie: 4,20 €/os./deň
// (= 29,40 €/os./týždeň = 128 €/mesiac, teda na úrovni najdrahšieho kraja). 0 = rozpočet vypnutý.
const CENA_CIEL_DEF=4.2;
S.profil=Object.assign({osoby:2,kcal:1450,biel:0,ryby:false,lepok:false,mlieko:false,dark:false,big:false,balenia:true,watch:"",zakazane:"",kupSnack:true,cielTyp:"udrzanie",okno:false,oknostart:12,syncId:"",syncOff:false,skupinaId:"",skupinaKod:"",skupinaNazov:"",cenaCiel:CENA_CIEL_DEF,sloty:DEFAULT_SLOTY.slice()}, S.profil||{});
S.profil.rezim=["plan","obchod","kuchyna"].indexOf(S.profil.rezim)>=0?S.profil.rezim:"plan"; // režim hustoty prežije reload
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
// C8: „list" je dve rôzne veci. List hlávkového šalátu/kelu váži ~8 g, list bazalky, oregana
// alebo bobkový list zlomok gramu. Bez rozlíšenia dával recept „Bobkový list 4 list" = 32 g
// (~100× viac, než myslí) a „Oregano 6 list" pripísalo šalátu 32 kcal na porciu navyše.
// Rozlišuje sa podľa ODDELENIA potraviny, nie podľa názvu — zoznam bylín patrí do potraviny.json.
const G_ZA_LIST_BYLINKA=0.5;
function gZaJednotku(j,p){
  if(j==="plátok"||j==="platok") return (p&&p.g_za_platok)||KS_DEF["plátok"];
  if(j==="list"&&p&&p.oddelenie==="Korenie a bylinky") return G_ZA_LIST_BYLINKA;
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
// B7: podiel suroviny, ktorý sa naozaj ZJE (0–1). Platí len pre výživu; nákup, špajza a cena
// pracujú s plným množstvom (`gramy`), lebo 600 ml oleja na vyprážanie sa musí kúpiť celých.
// Mimo rozsahu 0–1 alebo nečíslo = 1, teda „zje sa všetko" (pôvodné správanie pred B7).
function vsiaknuteho(ing){ const v=ing&&ing.vsiaknutie;
  return (typeof v==="number"&&isFinite(v)&&v>=0&&v<=1)?v:1; }
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
// B8: pásmo dôvery pre pomer q = (dopočet zo surovín) / (deklarované kcal_na_porciu).
// Mimo neho sa faktoru neverí — makrá sa škálujú len zovretým faktorom a výsledok nesie `sporne`.
const K_PASMO_LO=0.5, K_PASMO_HI=2;
function _vyzivaVypocet(r){
  let kc=0,b=0,t=0,s=0,cena=0,vl=0,na=0,zname=false,bezCeny=0;
  let hmota=0,hmotaVl=0,hmotaNa=0; // B6: koľko hmoty dňa má vôbec údaj o vláknine/sodíku
  (r.ingrediencie||[]).forEach(i=>{
    const p=najdiPotravinu(i.nazov);
    if(!p){ if(i.mnozstvo!=null){ zname=true; bezCeny++; hmota+=odhadHmoty(i); } return; }
    const g=gramy(i,p);
    if(!(g>0)&&i.mnozstvo!=null){ zname=true; return; } // B2: nedopočítaná hmotnosť → kcal je len odhad
    // B7: `vsiaknutie` (0–1) = podiel suroviny, ktorý sa naozaj DOSTANE DO JEDLA. Z 600 ml oleja
    // na vyprážanie (5300 kcal) sa zje 10–30 %; nálev z pohára sa zleje, marináda ostane v miske.
    // Do VÝŽIVY ide len zjedená hmota `gz`, do CENY a do nákupu naďalej celé `g` — olej sa musí
    // kúpiť celý. Príznak je na INGREDIENCII, nie na recepte: musaka má 600 ml oleja na vyprážanie
    // aj 170 g masla v bešamele, ktoré sa zje celé. Chýbajúca/neplatná hodnota = 1 (pôvodné správanie).
    const gz=g*vsiaknuteho(i);
    kc+=gz*p.kcal/100; b+=gz*p.bielkoviny/100; t+=gz*p.tuky/100; s+=gz*p.sacharidy/100;
    // B5: cena100 == null znamená NEZNÁMA cena (0 je platná cena, napr. voda z vodovodu)
    if(g>0 && p.cena100==null) bezCeny++;
    cena+=g*(p.cena100||0)/100; vl+=gz*(p.vlaknina||0)/100; na+=gz*(p.sodik||0)/100;
    hmota+=gz; if(p.vlaknina!=null)hmotaVl+=gz; if(p.sodik!=null)hmotaNa+=gz;
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
    if(v.kcal>5){ const q=v.kcal/j;
      // B8 (poistka): faktor `k` je dôveryhodný, len kým sa dopočet a deklarácia nerozchádzajú
      // rádovo. Mimo pásma ⟨0,5; 2⟩ je jedno z tých dvoch čísel zle (zlé `porcie`, chýbajúce
      // gramy, nenapárovaná surovina) a plné preškálovanie makrá VYMÝŠĽA: hovädzí steak z 500 g
      // krkovice ukazoval 12,7 g bielkovín namiesto 130 g, bruschetta naopak 8,8 g namiesto 1,7.
      // Preto sa faktor zovrie na pásmo a recept sa PRIZNÁ ako odhad (`sporne`) — ticho
      // preškálovať číslo, ktorému neveríme, je horšie než priznať, že ho nevieme.
      const k=Math.min(Math.max(1/q,1/K_PASMO_HI),1/K_PASMO_LO);
      ["b","t","s","cena"].forEach(x=>{v[x]*=k;});
      if(q<K_PASMO_LO||q>K_PASMO_HI){ v.sporne=true; v.q=q; }
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
  else if(v==="recepty") _gridDopln(); // mriežka sa kreslila skrytá — teraz dopočítaj, koľko sa naozaj zmestí
  zpristupniFormulare(el||document); // D6: menovky aj pre polia vykreslené až pri zobrazení sekcie
  aktualizujSkip();
  window.scrollTo(0, _scrollPos[v]||0); // E7: obnov scroll (0 pre novú obrazovku)
}
// A11y: k prvej karte receptu viedlo 33 stlačení Tab. Skip-link preto neskočí len „za navigáciu",
// ale rovno na to, po čom človek na danej obrazovke ide — v Receptoch na prvú kartu.
function preskocNaObsah(e){ if(e)e.preventDefault();
  const v=document.getElementById("v-"+_curView);
  let cil = v && _curView==="recepty" ? document.getElementById("grid") : null;
  if(!cil && v) cil = v.querySelector('button,a[href],input,select,textarea,[tabindex="0"]');
  if(!cil) cil = document.getElementById("obsah");
  if(!cil)return; try{ cil.focus({preventScroll:true}); }catch(_){ cil.focus(); }
  cil.scrollIntoView({block:"center"}); }
function aktualizujSkip(){ const a=document.querySelector("a.skip"); if(!a)return;
  a.textContent = _curView==="recepty" ? "Preskočiť na zoznam receptov" : "Preskočiť navigáciu"; }
function tik(){ try{ navigator.vibrate&&navigator.vibrate(8); }catch(e){} } // X1: jemná haptika na diskrétne akcie
function prepni(v){ tik(); if(("#"+v)!==location.hash){ location.hash=v; } zobrazView(v); } // E8: hash = zdroj pravdy pre deep-link/back
window.addEventListener("hashchange",()=>{ const v=location.hash.slice(1); if(v && v!==_curView && document.getElementById("v-"+v)) zobrazView(v); });
function otvorViac(){ const pol=[["vyziva","📊 Výživa"],["spajza","🧊 Špajza"],["nastavenia","⚙️ Nastavenia"]];
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Viac</h2></div><div class="content2">';
  pol.forEach(([v,t])=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();prepni('${v}')"><span class="nm">${t}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
// U1: bunka plánu mala 5 mini-liniek (20 ovládacích prvkov na obrazovku telefónu).
// Zostala primárna „✎ zmeniť", zvyšok je tu — rovnaký spodný panel ako „⋯ Viac".
// B1: rozvrh varenia (bloky) už nie je schovaný tu — má vlastný pás nad tabuľkou plánu
// a dialóg `otvorRozvrh()` s predvoľbami. Definícia je pri bloky()/hraniceInit().
function akcieSlotu(di,slot){
  const pol=[["➕ Pridať doplnok (príloha, pečivo…)",`pridajKomponent(${di},'${slot}')`],
             ["🎲 Vygenerovať toto jedlo znova",`regenerujSlot(${di},'${slot}')`],
             ["👥 Počet porcií pre toto jedlo",`upravSlotPorcie(${di},'${slot}')`],
             ["♻️ Rozpísať ako zvyšok do iného dňa",`pridajZvysok(${di},'${slot}')`]];
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${slot} · ${DNI[di]}</h2></div><div class="content2">`;
  pol.forEach(([t,fn])=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();${fn}"><span class="nm">${t}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
// --- Tlač -----------------------------------------------------------------------------
// Šablóna má základné @media print (skryje bočný panel, lištu, filtre). Chýbali jej tri veci,
// ktoré vie doplniť len kód, lebo závisia od TOHO, ČO sa práve tlačí:
//  1) Detail receptu: .overlay je v DOM MIMO .view, takže sa vytlačila aj celá mriežka
//     1956 receptov — jeden recept = 229 strán A4 a recept až na poslednej.
//  2) Týždenný plán na A4 na výšku má 794 px, čo spadne pod mobilný breakpoint 820 px,
//     a vytlačil sa JEDEN deň namiesto siedmich. Na šírku (1123 px) sa zmestí celý týždeň.
//  3) Na papieri ostávali ovládacie prvky: „✎ zmeniť", „⋯ viac", „✕", „+ pridať", steppery.
const TLAC_CSS = `@media print{
  .menu-wrap,.plan-den-nav,.view.printme > p.sub{display:none!important}
  .plan-cell .rm,.plan-cell a,.plan-cell.prazdne,.plan-varenia,.mchips,.ppl,tr.ctrl-row,
  .stepper,.seg,.doma-in{display:none!important}
  .plan-cell .kc{cursor:auto}
  table.plan td,table.plan th{page-break-inside:avoid;break-inside:avoid}
  .card,.sekcia,.krok,.sp-row{page-break-inside:avoid;break-inside:avoid}
  body.tlac-detail .view{display:none!important}
  body.tlac-detail .overlay:not(.open){display:none!important}
  body.tlac-detail .modal button,body.tlac-detail .modal select,
  body.tlac-detail .modal input,body.tlac-detail .modal textarea{display:none!important}
  /* prepínač porcií: počet porcií píše riadok „Spolu za N porcií" nižšie */
  body.tlac-detail .porcie-box{display:none!important}
  /* Plán potrebuje šírku (A4 na šírku), nákupný zoznam by na nej ale mrhal papierom —
     100 položiek by narástlo z 3 na 6 strán. V širokom režime ho lámeme do stĺpcov. */
  body.tlac-plan #nakup-list{column-count:3;column-gap:12mm}
  body.tlac-plan #nakup-list > *{break-inside:avoid;page-break-inside:avoid}
  body.tlac-plan table.plan{table-layout:fixed!important}
  body.tlac-plan table.plan td[data-d],body.tlac-plan table.plan th[data-d]{display:table-cell!important}
  body.tlac-plan table.plan tr.dni-hlavicka{display:table-row!important}
  /* P4: vlna 3 pridala do plánu aj nákupu skutočné <button> a na papier sa dostali.
     Rozlišujeme dva druhy. Tlačidlo, ktoré je LEN akcia (✕, ⓘ, ✎, „plán varenia →",
     „✂️ Upraviť rozvrh", prúžok postupu, panely „Mám doma"/„Trasa obchodom"), sa skryje.
     Tlačidlo, ktoré nesie OBSAH (názov jedla, kcal dňa), sa NESMIE skryť — inak by sa
     vytlačil prázdny plán. Dostane display:contents — schránka tlačidla zmizne
     (žiadny rám, žiadna afordancia, žiadny box v layoute), text zostane. */
  .plan-cell .pc-x,.plan-cell .pc-ed,.plan-varenia,.rozvrh-upr,.rozvrh-bloky,.plan-zbal,
  .nak-i,.nak-pruh,.nakup-suhrn button,#v-nakup > details.panel,
  .suhrn-viac > summary{display:none!important}
  .plan-cell .nm.pc-btn,.plan-cell .kc.pc-btn{display:contents}
  /* zbalené „podrobnosti" súhrnu nákupu sa na papieri vypíšu celé */
  .suhrn-viac,.suhrn-viac > .sv-in{display:contents!important}
}`;
const TLAC_PAGE_SIROKO = `@page{size:A4 landscape;margin:8mm}`;
function tlacStyl(id,css){ let el=document.getElementById(id);
  if(!css){ if(el)el.remove(); return; }
  if(!el){ el=document.createElement("style"); el.id=id; document.head.appendChild(el); }
  el.textContent=css; }
function tlacPriprav(rezim){ tlacStyl("tlac-css",TLAC_CSS);
  document.body.classList.toggle("tlac-plan",rezim==="plan");
  document.body.classList.toggle("tlac-detail",rezim==="detail");
  // Zbalený <details> sa nevytlačí — na papieri by chýbalo 14 dochucovadiel. Otvor ho
  // na čas tlače a po nej vráť späť (aby sa obrazovka nezmenila pod rukami).
  document.querySelectorAll("#v-nakup details.odd:not([open])").forEach(d=>{ d.dataset.tlacOpen="1"; d.open=true; });
  // @page sa nedá podmieniť triedou na <body>, preto ho pridávame/odoberáme celý.
  tlacStyl("tlac-page",rezim==="plan"?TLAC_PAGE_SIROKO:""); }
function tlacUprac(){ document.body.classList.remove("tlac-plan","tlac-detail"); tlacStyl("tlac-page","");
  document.querySelectorAll("#v-nakup details.odd[data-tlac-open]").forEach(d=>{ d.open=false; delete d.dataset.tlacOpen; }); }
window.addEventListener("afterprint",tlacUprac);
function tlacView(v){ prepni(v);
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("printme"));
  document.getElementById("v-"+v).classList.add("printme");
  tlacPriprav(v==="planovac"?"plan":""); window.print(); }
// Tlač receptu z otvoreného detailu — bez režimu "detail" sa tlačí aj mriežka za modálom.
function tlacRecept(){ tlacPriprav("detail"); window.print(); }
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
  const thumb=thumbHTML(r,true); // loading="lazy" — mriežka dopĺňa po 60 kartách, obrázky sa ťahajú až keď treba
  // A8 (WCAG 2.1.1): karta bola dva `div onclick` (.thumb + .body) — klávesnica ju nevidela.
  // Teraz je to JEDEN obal `.card-open` s role/tabindex a aria-label; ★ ostáva samostatné tlačidlo
  // (skutočný <button> vnútri role="button" by bol vnorené tlačidlo, preto je .fav SÚRODENEC, nie potomok).
  const lab=escHtml(r.nazov);
  return '<button class="fav" aria-pressed="'+(S.fav[r.id]?"true":"false")+'" aria-label="'+(S.fav[r.id]?"Odobrať z obľúbených: ":"Pridať do obľúbených: ")+lab+'" onclick="event.stopPropagation();toggleFav(\''+r.id+'\')">'+(S.fav[r.id]?"★":"☆")+'</button>'+
    '<div class="card-open" role="button" tabindex="0" aria-label="'+lab+' — otvoriť recept" onclick="otvor(\''+r.id+'\')">'+
    '<div class="'+thumbTrieda(r)+'" aria-hidden="true">'+thumb+'</div>'+
    '<div class="body">'+
      '<span class="kat">'+escHtml(r.kategoria||"")+'</span><h3>'+lab+'</h3>'+
      '<div class="meta">'+(r.cas?'<span>⏱ '+escHtml(r.cas)+'</span>':"")+(kc?'<span title="'+(v.pribl?"odhad — časť surovín sa nedá dopočítať":"")+'">🔥 '+(v.pribl?"≈ ":"")+kc+' kcal</span>':"")+(v.cena>0.01?'<span>💶 '+eur(v.cena)+'</span>':"")+'</div>'+
      (v.kcal>5?'<div class="macros">B '+fmt(v.b)+' · T '+fmt(v.t)+' · S '+fmt(v.s)+' g</div>':'')+
      '<div class="stars">'+(hod?starsHTML(hod):"")+'</div>'+
      spajzaMatchEl(r)+
      '<div class="diet">'+db+'</div></div></div>';
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
  // B4: predvolené (abecedné) radenie dávalo na prvú obrazovku 5 kokteilov zo 6 — „155 Belmont",
  // „3-Mile Long Island Iced Tea", „A midsummernight dream"… Nápojov a kokteilov je 125 a v pláne
  // na 1450 kcal ich nepoužiješ. Predvolené radenie ich preto posúva za jedlá; poradie v rámci
  // skupín zostáva pôvodné (abecedné), takže sa nič nestratí a chip „🍸 Kokteil" ich ukáže hneď.
  else { const napoj=r=>(r.kategoria==="Kokteil"||r.kategoria==="Nápoj")?1:0;
    zoz=zoz.map((r,i)=>[r,i]).sort((a,b)=>(napoj(a[0])-napoj(b[0]))||(a[1]-b[1])).map(x=>x[0]); }
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
  _gridZoz=zoz; _gridPos=0; _gridPridajDavku(); _gridSledujKoniec(); _gridDopln();
}
// A9 (výkon): mriežka vykresľovala všetkých 1956 receptov naraz (28 000 DOM uzlov, ~130–300 ms).
// Teraz sa vykreslí prvá dávka a ďalšie sa dopĺňajú, keď sa pätička priblíži k oknu (IntersectionObserver).
// Tlačidlo „Načítať ďalšie" je zároveň cieľom observera aj plnohodnotným ovládaním pre klávesnicu
// a pre prehliadače bez IO — filtrovanie, hľadanie ani počítadlá sa nemenia, tie pracujú nad `zoz`.
const GRID_DAVKA=60;
let _gridZoz=[], _gridPos=0, _gridIO=null;
function _gridPridajDavku(){
  const grid=document.getElementById("grid"); if(!grid)return 0;
  const koniec=Math.min(_gridPos+GRID_DAVKA,_gridZoz.length);
  for(let i=_gridPos;i<koniec;i++){ const r=_gridZoz[i];
    const c=document.createElement("div"); c.className="card"+(S.skryte[r.id]?" skryty":""); c.innerHTML=kartaHTML(r); grid.appendChild(c); }
  const pridane=koniec-_gridPos; _gridPos=koniec; _gridStavPatky(); return pridane;
}
function _gridStavPatky(){ const b=document.getElementById("grid-viac"); if(!b)return;
  const zvysok=_gridZoz.length-_gridPos;
  b.style.display=zvysok>0?"":"none";
  if(zvysok>0){ const d=Math.min(GRID_DAVKA,zvysok);
    b.textContent="Načítať ďalších "+d+" · zostáva "+zvysok;
    b.setAttribute("aria-label","Načítať ďalších "+d+" receptov, zostáva "+zvysok); } }
function gridViac(){ _gridPridajDavku(); }
// IO ohlási pretínanie len pri ZMENE — ak pätička ostane v okne aj po dávke, druhýkrát sa neozve.
// Preto po každej dávke skontrolujeme polohu pätičky sami a prípadne dopĺňame ďalej.
function _gridDopln(){ if(_gridPos>=_gridZoz.length)return;
  const b=document.getElementById("grid-viac"); if(!b||typeof b.getBoundingClientRect!=="function")return;
  const r=b.getBoundingClientRect(); const vh=(typeof window!=="undefined"&&window.innerHeight)||0;
  if(!vh)return;
  // Recepty sa vykresľujú aj keď je obrazovka skrytá (štart je na Domove) — vtedy má pätička nulový
  // rámček, `top` je 0 a bez tejto stráže by sa slučkou naliala celá zásoba (presne to, čomu sa vyhýbame).
  if(!r.width && !r.height) return;
  if(r.top < vh+600){ _gridPridajDavku(); if(typeof requestAnimationFrame==="function")requestAnimationFrame(_gridDopln); } }
function _gridSledujKoniec(){ if(typeof IntersectionObserver!=="function")return;
  const b=document.getElementById("grid-viac"); if(!b||_gridIO)return;
  _gridIO=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)) _gridDopln(); },{rootMargin:"600px 0px"});
  _gridIO.observe(b); }
function zrusFiltre(){ const h=document.getElementById("hladaj"); if(h)h.value=""; ["f-kuchyna","f-cas","f-diet"].forEach(id=>{const e=document.getElementById(id); if(e)e.value="";}); aktivnaKat="Všetko"; aktivnaKolekcia=""; renderChips(); renderKolekcie(); renderGrid(); } // R2
// P2: jedno miesto, kde sa pýtame „je to telefón?" — rovnaká hranica ako v CSS (820 px).
function jeMobil(){ return typeof matchMedia==="function" && matchMedia("(max-width:820px)").matches; }
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
    <div class="field"><label>Fotka (voliteľné)</label>
      <div id="nr-foto-box"></div>
      <input type="file" id="nr-foto-in" accept="image/*" onchange="nrFotoZmena(this)" style="${IST}">
      <p class="info" style="margin:4px 0 0">Odfoť hotové jedlo telefónom. Fotka sa v prehliadači zmenší na 320×180 a uloží sa priamo do appky — nič sa nikam neposiela.</p></div>
    <h4 class="sekcia">Ingrediencie (vyber zo zoznamu potravín)</h4><div id="nr-ing"></div>
    <button class="btn" onclick="pridajIngRiadok()">+ ďalšia surovina</button>
    <h4 class="sekcia">Postup (každý krok na nový riadok)</h4>
    <textarea id="nr-postup" class="doma-in" placeholder="Zmiešaj suroviny...&#10;Peč 20 minút..."></textarea>
    <div class="field"><label>Tip (voliteľné)</label><input id="nr-tip" style="${IST}"></div>
    <div class="btn-row"><button class="btn primary" onclick="ulozNovyRecept()">Uložiť recept</button></div></div>`;
  _nrFoto=""; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal");
  nrFotoNahlad(); pridajIngRiadok(); pridajIngRiadok(); pridajIngRiadok(); }

// ── Fotka z mobilu do vlastného receptu ────────────────────────────────────────
// Originál z fotoaparátu má 3–8 MB; do localStorage sa taký nezmestí (limit ~5 MB na celý
// stav appky). Preto sa v prehliadači cez canvas zmenší na presne ten istý formát,
// aký používa build (320×180 WebP) — ~10–15 kB na fotku.
let _nrFoto="";
const FOTO_W=320, FOTO_H=180, FOTO_MAX=90000; // znakov data: URI (~65 kB obrázka)
function fotoZObrazka(im){
  const c=document.createElement("canvas"); c.width=FOTO_W; c.height=FOTO_H;
  const g=c.getContext("2d"); if(!g) return "";
  const s=Math.max(FOTO_W/im.width, FOTO_H/im.height), w=im.width*s, h=im.height*s;
  g.drawImage(im,(FOTO_W-w)/2,(FOTO_H-h)*0.42,w,h); // jedlo býva mierne nad stredom
  let q=0.62, d=c.toDataURL("image/webp",q);
  const typ = d.slice(0,15)==="data:image/webp" ? "image/webp" : "image/jpeg"; // staršie Safari nevie WebP
  if(typ!=="image/webp") d=c.toDataURL(typ,0.72);
  let poistka=6;
  while(d.length>FOTO_MAX && q>0.28 && poistka-->0){ q-=0.1; d=c.toDataURL(typ,q); }
  return d.length>FOTO_MAX*1.6 ? "" : d; }
function nrFotoZmena(inp){ const f=inp&&inp.files&&inp.files[0]; if(!f)return;
  const fr=new FileReader();
  fr.onerror=function(){ toast("Súbor sa nedá prečítať."); };
  fr.onload=function(){ const im=new Image();
    im.onerror=function(){ toast("Toto nevyzerá ako obrázok."); };
    im.onload=function(){ const d=fotoZObrazka(im);
      if(!d){ toast("Fotka sa nedá dostatočne zmenšiť — skús inú."); return; }
      _nrFoto=d; nrFotoNahlad(); toast("Fotka pridaná ("+Math.round(d.length/1024)+" kB)."); };
    im.src=fr.result; };
  fr.readAsDataURL(f); }
function nrFotoZmaz(){ _nrFoto=""; const i=document.getElementById("nr-foto-in"); if(i)i.value=""; nrFotoNahlad(); }
function nrFotoNahlad(){ const b=document.getElementById("nr-foto-box"); if(!b)return;
  b.innerHTML = _nrFoto
    ? '<figure class="detail-foto"><img src="'+_nrFoto+'" alt="Náhľad fotky receptu"></figure><button type="button" class="btn" onclick="nrFotoZmaz()">🗑 Odobrať fotku</button>'
    : "";
  b.style.marginBottom = _nrFoto ? "8px" : "0"; }
// Fotka k UŽ uloženému vlastnému receptu — človek ju spraví až keď dovarí.
function fotkaKReceptu(id){ const r=receptById(id); if(!r||!r._moj){ toast("Fotku viem pridať len k vlastnému receptu."); return; }
  let inp=document.getElementById("foto-pick");
  if(!inp){ inp=document.createElement("input"); inp.type="file"; inp.id="foto-pick"; inp.accept="image/*"; inp.style.display="none"; document.body.appendChild(inp); }
  inp.value=""; inp.onchange=function(){ const f=inp.files&&inp.files[0]; if(!f)return;
    const fr=new FileReader();
    fr.onload=function(){ const im=new Image();
      im.onerror=function(){ toast("Toto nevyzerá ako obrázok."); };
      im.onload=function(){ const d=fotoZObrazka(im);
        if(!d){ toast("Fotka sa nedá dostatočne zmenšiť — skús inú."); return; }
        if(!fotoVojdeDoUloziska(d)){ toast("V pamäti prehliadača už nie je miesto na ďalšiu fotku."); return; }
        r.foto=d; const m=(S.mojeRecepty||[]).find(function(x){return x.id===id;}); if(m)m.foto=d;
        save(); renderGrid(); otvor(id,_poslednyCtx); toast("Fotka uložená."); };
      im.src=fr.result; };
    fr.readAsDataURL(f); };
  inp.click(); }
function odoberFotku(id){ const r=receptById(id); if(!r||!r._moj)return;
  r.foto=""; const m=(S.mojeRecepty||[]).find(function(x){return x.id===id;}); if(m)m.foto="";
  save(); renderGrid(); otvor(id,_poslednyCtx); toast("Fotka odobraná."); }
// localStorage má ~5 MB na celý stav appky a `uloz()` chybu ticho prehltne — bez tejto
// kontroly by pridaná fotka mohla zahodiť aj plán a nákup a človek by sa to nedozvedel.
function fotoVojdeDoUloziska(d){ try{ return (JSON.stringify(S).length + d.length) < 4200000; }catch(_){ return true; } }
function pridajIngRiadok(){ const box=document.getElementById("nr-ing"); if(!box)return;
  const d=document.createElement("div"); d.className="controls"; d.style.marginBottom="6px"; d.style.padding="0";
  // B7: „% zje" = koľko zo suroviny naozaj skončí v jedle (olej na vyprážanie ~20 %). Prázdne = 100 %.
  d.innerHTML=`<input list="potraviny-dl" class="nr-in" placeholder="surovina" style="flex:1;min-width:120px;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" class="nr-mn" placeholder="množ." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px"><input class="nr-jed" list="jedn-dl" placeholder="jedn." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" class="nr-vs" min="1" max="100" placeholder="% zje" title="Koľko percent suroviny sa naozaj zje (olej na vyprážanie ~20 %). Prázdne = celé." style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">`;
  box.appendChild(d); }
function ulozNovyRecept(){ const nazov=(document.getElementById("nr-nazov").value||"").trim(); if(!nazov){toast("Zadaj názov receptu.");return;}
  const ing=[]; document.querySelectorAll("#nr-ing .controls").forEach(row=>{ const n=(row.querySelector(".nr-in").value||"").trim(); if(!n)return;
    const mn=parseFloat(row.querySelector(".nr-mn").value); const jed=(row.querySelector(".nr-jed").value||"").trim();
    const vsEl=row.querySelector(".nr-vs"); const vsPct=vsEl?parseFloat(vsEl.value):NaN;
    const o={nazov:escHtml(n),mnozstvo:isNaN(mn)?null:mn,jednotka:escHtml(jed)};
    // B7: pole prežije uloženie aj načítanie z localStorage; mimo 1–99 % nemá zmysel ho ukladať
    if(!isNaN(vsPct)&&vsPct>0&&vsPct<100) o.vsiaknutie=Math.round(vsPct)/100;
    ing.push(o); });
  if(!ing.length){ toast("Pridaj aspoň jednu surovinu."); return; }
  const postup=(document.getElementById("nr-postup").value||"").split(/\n+/).map(x=>x.replace(/^\s*\d+[\.\)]\s*/,"").trim()).filter(Boolean);
  const r={ id:"moj-"+(S.spSid++), nazov, kategoria:document.getElementById("nr-kat").value, kuchyna:(document.getElementById("nr-kuch").value||"").trim(),
    porcie:parseInt(document.getElementById("nr-porcie").value)||2, cas:(document.getElementById("nr-cas").value||"").trim(), popis:"",
    ingrediencie:ing, postup, tipy:(document.getElementById("nr-tip").value||"").trim(),
    foto:(_nrFoto&&fotoVojdeDoUloziska(_nrFoto))?_nrFoto:"", tagy:["vlastný"], _moj:true };
  if(_nrFoto && !r.foto) toast("Recept uložím, ale na fotku už v pamäti prehliadača nie je miesto.");
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
  // Zdroj miniatúry je 320×180; v detaile ju preto nenaťahujeme cez celú šírku (max 480 px),
  // inak by bola na počítači rozmazaná. Pevný pomer 16:9 = žiadny posun rozloženia pri načítaní.
  const _fs=fotoSrc(r);
  const foto=_fs?`<figure class="detail-foto"><img src="${_fs}" alt="${escHtml(r.nazov)}" decoding="async" onerror="var f=this.parentNode;if(f&&f.parentNode)f.parentNode.removeChild(f)">${fotoPopisHTML(r)}</figure>`:"";
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
      <h2>${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</h2>
      <div class="subx">${escHtml([r.kategoria,r.kuchyna,r.cas].filter(Boolean).join(" · "))}</div></div>
    <div class="content2">${foto}
      ${r.popis?`<p class="popis">${escHtml(r.popis)}</p>`:""}
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
      ${r.tipy?`<div class="tipy">💡 <b>Tip:</b> ${escHtml(r.tipy)}</div>`:""}
      ${r.zdroj?`<div class="zdroj">Zdroj: ${r.zdroj_url?`<a href="${escHtml(r.zdroj_url)}" target="_blank" rel="noopener noreferrer">${escHtml(r.zdroj)}</a>`:escHtml(r.zdroj)}</div>`:""}
      <div class="hodnotenie"><span>Hodnotenie:</span><div class="starpick">${stars}</div>
        <button class="mini" onclick="hodnot('${r.id}',0)">zrušiť</button></div>
      <textarea class="pozn" id="poznamka" placeholder="Moja poznámka k receptu…" oninput="ulozPozn('${r.id}')">${escHtml(S.pozn[r.id]||"")}</textarea>
      <div class="btn-row">
        <button class="btn primary" onclick="spustiCook()">👨‍🍳 Variť</button>
        <button class="btn" onclick="pridajDoPlanu('${r.id}')">📅 Do plánu</button>
        <div class="menu-wrap"><button class="btn" onclick="toggleMenu('m-det')">⋯ Viac</button>
          <div class="menu" id="m-det">
            <a onclick="toggleSkryt('${r.id}');zavriMenu()">${S.skryte[r.id]?"👁 Zobraziť v generátore":"🚫 Skryť z generátora"}</a>
            <a onclick="zavriMenu();tlacRecept()">🖨 Tlačiť recept</a>
            ${r._moj?`<a onclick="zavriMenu();fotkaKReceptu('${r.id}')">📷 ${_fs?"Zmeniť fotku":"Pridať fotku"}</a>`:""}
            ${r._moj&&_fs?`<a onclick="zavriMenu();odoberFotku('${r.id}')">🖼 Odobrať fotku</a>`:""}
            ${r._moj?`<a style="color:var(--warn)" onclick="zavriMenu();zmazMojRecept('${r.id}')">🗑 Zmazať recept</a>`:""}
          </div>
        </div></div>
    </div>`;
  renderIng(); renderSubst(); zpristupniKliky(document.getElementById("modal"));
  document.getElementById("overlay").classList.add("open");
  document.body.style.overflow="hidden";
  _fokusDoModalu("modal"); // A8: fokus musí ísť do dialógu, inak Tab pokračuje v mriežke pod prekrytím
}
// prvé zmysluplné ovládanie v modáli = zatváracie „✕"; Escape a zavretie ho vrátia späť na kartu
function _fokusDoModalu(id){ const m=document.getElementById(id); if(!m||!m.querySelector)return;
  const el=m.querySelector(".close")||m.querySelector("button,[tabindex='0'],a[onclick]");
  if(el&&typeof el.focus==="function") setTimeout(()=>{ try{el.focus();}catch(_){} },0); }
function renderIng(){
  const r=aktualny; const fPocet=r.porcie?(aktPorcie/r.porcie):1; let rows="";
  (r.ingrediencie||[]).forEach(i=>{
    let mn="";
    if(i.mnozstvo!=null){ mn=prevodJednotka(skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,aktVelkost), i.jednotka||""); }
    else if(i.poznamka){ mn=i.poznamka; }
    const pozn=(i.mnozstvo!=null&&i.poznamka)?` <span class="pozn">(${escHtml(i.poznamka)})</span>`:"";
    // B7: bez tejto vety by kalórie porcie nesedeli s hrubým súčtom surovín a vyzeralo by to ako chyba
    const vs=vsiaknuteho(i);
    const vsPozn=(i.mnozstvo!=null&&vs<1)?` <span class="pozn">· do jedla ide ~${Math.round(vs*100)} %, zvyšok sa zleje</span>`:"";
    rows+=`<tr><td>${escHtml(i.nazov)}${pozn}${vsPozn}</td><td class="mn">${escHtml(mn)}</td></tr>`;
  });
  document.getElementById("ing-body").innerHTML=rows;
  const v=vyzivaReceptu(r); const box=document.getElementById("nutri");
  if(v.kcal>5){ box.style.display="grid";
    // B8: keď sa dopočet a deklarácia rozchádzajú viac než 2×, makrá sú odhad — povedz to naplno,
    // nie len značkou „≈". Používateľ podľa týchto čísel je.
    const sp=v.sporne?`<div style="grid-column:1/-1" class="info">≈ Makrá sú len odhad: suroviny vychádzajú na ${Math.round(v.q*Math.round(v.kcal))} kcal, recept hlási ${Math.round(v.kcal)} kcal na porciu. Skontroluj počet porcií alebo chýbajúce suroviny.</div>`:"";
    box.innerHTML=`<div><b>${v.pribl?"≈ ":""}${Math.round(v.kcal)}</b><small>kcal/porcia${v.pribl?" (odhad)":""}</small></div>
      <div><b>${fmt(v.b)} g</b><small>bielkoviny${v.sporne?" (odhad)":""}</small></div>
      <div><b>${fmt(v.t)} g</b><small>tuky</small></div>
      <div><b>${fmt(v.s)} g</b><small>sacharidy</small></div>${sp}`;
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
    if(nm.length>2 && (h.includes(nm)||(prve.length>3&&h.includes(prve)))) found.push(escHtml(i.nazov+" "+prevodJednotka(skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost),i.jednotka||""))); });
  return found.length? ` <span class="krok-mn">▸ ${found.join(" · ")}</span>`:""; }
function renderPostup(fPocet,fVelkost){ const ol=document.getElementById("postup-ol"); if(!ol)return;
  ol.innerHTML=(aktualny.postup||[]).map(k=>`<li>${escHtml(k)}${krokHint(k,fPocet,fVelkost)}</li>`).join(""); }
function renderSubst(){
  const r=aktualny; let items=[];
  (r.ingrediencie||[]).forEach(i=>{ const n=i.nazov.toLowerCase();
    for(const k in SUBSTITUCIE){ if(n.includes(k)){ items.push(`<b>${escHtml(i.nazov)}</b> → ${escHtml(SUBSTITUCIE[k].join(", "))}`); break; } }
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
function dlgZavri(v){ const o=document.getElementById("dlg-overlay"); o.classList.remove("open"); document.body.style.overflow=document.querySelector("#overlay.open,#pick-overlay.open,#cook.open")?"hidden":""; const r=o._res; o._res=null; _vratFokus(); if(r)r(v); }
function confirmModal(msg,okLabel){ return new Promise(res=>{ const o=document.getElementById("dlg-overlay"); o._res=res; o._cancel=false;
  document.getElementById("dlg-modal").innerHTML=`<div class="content2"><p>${escHtml(msg)}</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" onclick="dlgZavri(false)">Zrušiť</button><button class="btn primary" onclick="dlgZavri(true)">${escHtml(okLabel||"OK")}</button></div></div>`;
  o.classList.add("open"); document.body.style.overflow="hidden"; const bb=o.querySelector(".btn.primary"); if(bb)bb.focus(); }); }
function promptModal(msg,def){ return new Promise(res=>{ const o=document.getElementById("dlg-overlay"); o._res=res; o._cancel=null;
  document.getElementById("dlg-modal").innerHTML=`<div class="content2"><p>${escHtml(msg)}</p><input id="dlg-in" value="${escHtml(def==null?"":def)}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;font-size:15px"><div class="btn-row" style="justify-content:flex-end;margin-top:14px"><button class="btn" onclick="dlgZavri(null)">Zrušiť</button><button class="btn primary" onclick="dlgPromptOk()">OK</button></div></div>`;
  o.classList.add("open"); document.body.style.overflow="hidden"; const inp=document.getElementById("dlg-in"); if(inp){ inp.focus(); inp.select(); inp.addEventListener("keydown",e=>{ if(e.key==="Enter"){e.preventDefault();dlgPromptOk();} }); } }); }
function dlgPromptOk(){ const inp=document.getElementById("dlg-in"); dlgZavri(inp?inp.value:""); }
document.getElementById("dlg-overlay").addEventListener("click",e=>{ if(e.target.id==="dlg-overlay") dlgZavri(e.currentTarget._cancel); });

// A8 (WCAG 2.4.3): po zavretí modálu musí fokus skončiť tam, odkiaľ sa otváral — inak klávesnica
// spadne na začiatok stránky a používateľ sa k tej istej karte prebíja Tabom cez celú mriežku.
// Zapamätáme si prvok len pri klávesovom otvorení (Enter/medzerník); myš fokus aj tak nepresúva.
const MODALY_SEL="#overlay.open,#pick-overlay.open,#dlg-overlay.open,#cook.open";
let _fokusPred=null;
document.addEventListener("keydown",e=>{ if(e.key!=="Enter"&&e.key!==" ")return;
  const a=document.activeElement;
  if(a&&a!==document.body&&!(a.closest&&a.closest("#overlay,#pick-overlay,#dlg-overlay,#cook"))) _fokusPred=a; },true);
function _vratFokus(){ if(document.querySelector(MODALY_SEL))return; // ešte je otvorený iný modál (dialóg nad pickerom)
  const el=_fokusPred; _fokusPred=null;
  if(el&&typeof el.focus==="function") setTimeout(()=>{ try{ if(el.isConnected!==false) el.focus(); }catch(_){} },0); }
function zavri(){ document.getElementById("overlay").classList.remove("open"); document.body.style.overflow=""; _zahodHistoriuModalu(); _vratFokus(); }
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
    if(el.tagName==="BUTTON")return; // skutočné tlačidlo už klávesnicu má, pečiatka by len duplikovala rolu
    el.setAttribute("tabindex","0"); if(!el.getAttribute("role"))el.setAttribute("role","button");
    if(!el.getAttribute("aria-label")){ const t=(el.textContent||"").trim(); if(t)el.setAttribute("aria-label",t); } }); }
function zpristupniNav(){ zpristupniKliky();
  document.querySelectorAll(".side nav a:not([tabindex]),.side .foot a:not([tabindex]),.botnav a:not([tabindex])").forEach(a=>{ a.setAttribute("role","button"); if(!a.hasAttribute("tabindex"))a.setAttribute("tabindex","0"); const ic=a.querySelector(".ic"); if(ic)ic.setAttribute("aria-hidden","true"); if(!a.getAttribute("aria-label"))a.setAttribute("aria-label",a.textContent.trim()); }); }
// A8: jedno pravidlo pre VŠETKO, čo dostane rolu tlačidla — predtým tu chýbali `.plan-cell[tabindex]`
// (riadky pickerov boli fokusovateľné, ale Enter s nimi nič neurobil) aj nové karty receptov.
document.addEventListener("keydown",e=>{ const t=e.target; if(!t||!t.matches)return;
  if(e.key!=="Enter"&&e.key!==" ")return;
  if(t.matches('[role="button"][tabindex="0"],.side a,.botnav a,.menu a')){ e.preventDefault(); t.click(); } });

let cookKrok=0, cookKroky=[], wakeLock=null, cookRecept=null, cookAuto=false;
let casovace=[], casInterval=null, casId=0;
// Farby blokov na tmavej ploche varenia sú SVETLÉ varianty (svetlá slivka #6E2A55 by na
// #141210 dala 2,3:1). --akcent sa počíta na <html>, takže sa dnu neprefarbí sám —
// nastavujeme ho priamo na .cook podľa bloku, v ktorom sa tento recept varí.
const COOK_BLOKY=["#E39CC4","#6FCBE4","#BCD05E"];
function blokReceptu(id){ const it=planItems().find(x=>x.cid===id||x.r.id===id); return it?blokIndex(it.di):null; }
async function spustiCook(){ cookKroky=aktualny.postup||[]; cookKrok=0; cookRecept=aktualny.id;
  const bi=blokReceptu(aktualny.id);
  const el=document.getElementById("cook");
  el.style.setProperty("--akcent", bi==null?"#6FCBE4":COOK_BLOKY[bi%3]);
  document.getElementById("cook-title").innerHTML=(bi==null?"":`<span class="znak ${blokTrieda(bi)}">${blokPismeno(bi)}</span> `)+escHtml(aktualny.nazov);
  el.classList.add("open"); ukazKrok();
  if('wakeLock' in navigator){ try{wakeLock=await navigator.wakeLock.request('screen');}catch(e){} } }
function parseCasSek(t){ const m=t.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(min|minút|minut)/i); const se=t.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(sek|sekúnd|sekund)/i); if(m)return parseInt(m[1])*60; if(se)return parseInt(se[1]); return 0; }
function formatCas(x){ const m=Math.floor(x/60),s=x%60; return (m<10?"0":"")+m+":"+(s<10?"0":"")+s; }
function ukazKrok(){ const t=cookKroky[cookKrok]||"";
  document.getElementById("cook-step").textContent=(cookKrok+1)+". "+t;
  document.getElementById("cook-progress").textContent=(cookKrok+1)+" / "+cookKroky.length;
  const kr=document.getElementById("cook-kroky");
  if(kr) kr.innerHTML=cookKroky.map((_,i)=>`<i class="${i<cookKrok?"hot":(i===cookKrok?"tu":"")}"></i>`).join("");
  const sek=parseCasSek(t); const ab=document.getElementById("cook-add-timer");
  if(sek){ ab.style.display="inline-block"; ab.textContent="➕ "+formatCas(sek)+" časovač"; ab.dataset.sek=sek; } else ab.style.display="none";
  if(cookAuto) citajKrok();
}
function tickCasovace(){ casovace.forEach(c=>{ if(c.left>0){ c.left--; if(c.left<=0) pip(); } }); renderCasovace();
  if(!casovace.some(c=>c.left>0)){ clearInterval(casInterval); casInterval=null; } }
function renderCasovace(){ const box=document.getElementById("cook-timers"); if(!box)return;
  box.innerHTML=casovace.map(c=>`<span class="timer ${c.left>0?'run':''}" onclick="zmazCasovac(${c.id})">${c.left>0?'⏲ '+formatCas(c.left):'✅ hotovo'} · ${escHtml(c.label)} ✕</span>`).join(""); }
function pridajCasovacSek(sek,label){ if(!sek)return; casId++; casovace.push({id:casId,left:sek,label:label||formatCas(sek)}); if(!casInterval)casInterval=setInterval(tickCasovace,1000); renderCasovace(); }
function pridajKrokovyCasovac(){ const sek=parseInt(document.getElementById("cook-add-timer").dataset.sek)||0; pridajCasovacSek(sek,"krok "+(cookKrok+1)); }
async function pridajCasovac(){ const v=await promptModal("Časovač na koľko minút?","5"); if(v===null)return; const min=parseFloat(String(v).replace(",","."))||0; pridajCasovacSek(Math.round(min*60),fmt(min)+" min"); }
function zmazCasovac(id){ casovace=casovace.filter(c=>c.id!==id); renderCasovace(); if(!casovace.length&&casInterval){clearInterval(casInterval);casInterval=null;} }
function pip(){ try{const a=new (window.AudioContext||window.webkitAudioContext)();const o=a.createOscillator();o.connect(a.destination);o.frequency.value=880;o.start();setTimeout(()=>o.stop(),600);}catch(e){} }
function citajKrok(){ try{ if(!('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance((cookKrok+1)+". "+(cookKroky[cookKrok]||"")); u.lang="sk-SK"; u.rate=0.95; speechSynthesis.speak(u); }catch(e){} }
async function krok(d){ if(d>0 && cookKrok===cookKroky.length-1){ oznacUvarene(cookRecept); const rr=receptById(cookRecept); zavriCook(); if(rr && S.spajza.length && await confirmModal("Uvarené! Odpísať suroviny zo špajze?")) odpisRecept(rr); return; } cookKrok=Math.min(cookKroky.length-1,Math.max(0,cookKrok+d)); ukazKrok(); }
function zavriCook(){ if(!document.getElementById("cook").classList.contains("open"))return; document.getElementById("cook").classList.remove("open"); _zahodHistoriuModalu(); _vratFokus(); casovace=[]; if(casInterval){clearInterval(casInterval);casInterval=null;} renderCasovace(); try{speechSynthesis.cancel();}catch(e){} if(wakeLock){wakeLock.release();wakeLock=null;} }
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
// D1: memo. `masoTyp` aj `ranajkyBaza` púšťajú 5–13 regexov cez spojené názvy surovín a volajú
// sa pri KAŽDEJ výmene slotu (a od opravy stopy aj pri každom vrátení). Výsledok závisí len od
// receptu, takže sa cachuje natrvalo do `_memoBaza`/`_memoMaso`.
const _memoMaso=new Map(), _memoBaza=new Map();
function masoTyp(r){ if(!r)return ""; const mk=_memoMaso.get(r.id); if(mk!==undefined)return mk;
  const v=_masoTypVypocet(r); _memoMaso.set(r.id,v); return v; }
function _masoTypVypocet(r){ const s=bezDia((r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.nazov||""));
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
function applyVzhlad(){ document.body.classList.toggle("dark",!!S.profil.dark); document.body.classList.toggle("big",!!S.profil.big);
  // „svetla" je STAMP: bez neho platí @media(prefers-color-scheme:dark) a appka je tmavá
  // podľa systému ešte skôr, než sa JS dostane k slovu. S ním je voľba používateľa konečná.
  document.body.classList.toggle("svetla",!S.profil.dark);
  applyRezim(); nastavAkcent(); }

/* ── Režimy hustoty (koncepcia B) ──────────────────────────────────────────
   Tri fyzické situácie, nie tri appky: Plánovanie 1,0/44 px · Obchod 1,22/56 px ·
   Kuchyňa 1,5/64 px. Menia tokeny --skala a --cil na <html>; --skala zväčšuje obsah
   (.content a .modal majú zoom:var(--skala)), --cil dvíha dotykové ciele.
   Kuchyňa NEPREBÍJA režim varenia — dopĺňa ho: varenie sa otvára ako doteraz,
   len všetko okolo neho je väčšie. Voľba žije v S.profil.rezim a prežije reload. */
const REZIMY=["plan","obchod","kuchyna"];
function applyRezim(){ const r=REZIMY.includes(S.profil.rezim)?S.profil.rezim:"plan";
  document.documentElement.setAttribute("data-rezim",r);
  document.querySelectorAll("#rezimy button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.rezim===r))); }
function nastavRezim(r){ if(!REZIMY.includes(r))r="plan"; tik();
  S.profil.rezim=r; save(); applyRezim();
  if(r==="obchod" && _curView!=="nakup") prepni("nakup");
  else if(r==="plan" && _curView==="nakup") { /* nechaj obrazovku tak, mení sa len hustota */ }
  toast(r==="obchod"?"🛒 Režim Obchod — väčšie ciele na odškrtávanie."
      :r==="kuchyna"?"🍳 Režim Kuchyňa — väčšie písmo pre mastné ruky."
      :"📋 Režim Plánovanie — hustejšia informácia."); }

/* Blok = farba. Akcent je farba bloku, v ktorom sa práve nachádzam; token sa prepisuje
   na <html>, takže všetko, čo píše var(--accent) (aj inline štýly v app.js), sa prefarbí samo. */
const BLOK_TRIEDY=["blok-a","blok-b","blok-c"];
function dnesDi(){ return (new Date().getDay()+6)%7; }
function blokTrieda(bi){ return BLOK_TRIEDY[((bi%3)+3)%3]; }
function blokPismeno(bi){ return String.fromCharCode(65+bi); }
function blokIndex(di){ const b=bloky(); for(let i=0;i<b.length;i++) if(b[i].indexOf(di)>=0) return i; return 0; }
function znakBloku(bi,titul){ const t=blokTrieda(bi), p=blokPismeno(bi);
  return `<span class="znak ${t}" title="${titul||("Blok "+p)}" aria-label="Blok ${p}">${p}</span>`; }
function nastavAkcent(bi){ try{
    if(bi==null) bi=blokIndex(dnesDi());
    const t=blokTrieda(bi); const st=document.documentElement.style;
    st.setProperty("--akcent","var(--"+t+")"); st.setProperty("--akcent-tlac","var(--"+t+")");
  }catch(e){} }

function hraniceInit(){ if(!Array.isArray(S.hranice)||S.hranice.length!==7)S.hranice=[true,false,true,false,false,true,false]; S.hranice[0]=true; }
function bloky(){ hraniceInit(); const out=[]; let cur=null; for(let i=0;i<7;i++){ if(i===0||S.hranice[i]){ cur=[i]; out.push(cur); } else cur.push(i); } return out; }
function blokDni(di){ let start=di; while(start>0 && !S.hranice[start]) start--; const dni=[start]; for(let j=start+1;j<7;j++){ if(S.hranice[j])break; dni.push(j); } return dni; }
function prepniBlok(v){ S.blokMode=v; save(); renderPlan(); }
function denyBloku(di){ return S.blokMode?blokDni(di):[di]; }
function zmenDenPpl(di,delta){ const dni=denyBloku(di); const cur=(S.dayPpl[datumPre(di)]!=null)?S.dayPpl[datumPre(di)]:stravniciList().length; const nova=Math.max(1,cur+delta); dni.forEach(d=>{ S.dayPpl[datumPre(d)]=nova; }); save(); renderPlan(); }
function toggleDenSlot(di,slot){ const dni=denyBloku(di); const akt=slotyDna(di).slice(); const i=akt.indexOf(slot); if(i>=0)akt.splice(i,1); else { akt.push(slot); akt.sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b)); } dni.forEach(d=>{ S.daySloty[datumPre(d)]=akt.slice(); }); save(); renderPlan(); }
async function upravSlotPorcie(di,slot){ const cur=Math.round(porcieSlot(di,slot)); const v=await promptModal("Počet porcií pre toto jedlo (prázdne = podľa dňa):",cur); if(v===null)return; const dni=denyBloku(di); if(v.trim()===""){ dni.forEach(d=>{ const iso=datumPre(d); if(S.slotPpl[iso])delete S.slotPpl[iso][slot]; }); } else { const n=Math.max(1,parseInt(v)||cur); dni.forEach(d=>{ const iso=datumPre(d); S.slotPpl[iso]=S.slotPpl[iso]||{}; S.slotPpl[iso][slot]=n; }); } save(); renderPlan(); }

// ── Rozvrh varenia (bloky) ───────────────────────────────────────────────────
// B1: rozdelenie na bloky bolo schované v „⋯ Viac" v bunke plánu — používateľ o ňom nevedel.
// Teraz je nad tabuľkou pás, ktorý ho VETOU hovorí („Varíš v nedeľu večer na pondelok a utorok“),
// a jeden dialóg, kde sa dá vybrať predvoľba alebo poťukať hranice medzi dňami.
const DNI_V  = ["v pondelok","v utorok","v stredu","vo štvrtok","v piatok","v sobotu","v nedeľu"];
const DNI_NA = ["pondelok","utorok","stredu","štvrtok","piatok","sobotu","nedeľu"];
const ROZVRHY_PRED = [
  {id:"ja",  nazov:"Ako varím ja",        popis:"Ne · Ut · Pi večer",       hranice:[true,false,true,false,false,true,false]},
  {id:"2x",  nazov:"Dvakrát do týždňa",   popis:"Ne a St večer",            hranice:[true,false,false,true,false,false,false]},
  {id:"tv",  nazov:"Týždeň a víkend",     popis:"Ne a Pi večer",            hranice:[true,false,false,false,false,true,false]},
  {id:"1x",  nazov:"Raz na celý týždeň",  popis:"Ne večer na Po–Ne",        hranice:[true,false,false,false,false,false,false]},
  {id:"4x",  nazov:"Štyrikrát do týždňa", popis:"Ne · Ut · Št · So večer",  hranice:[true,false,true,false,true,false,true]},
];
function rovnakeHranice(a,b){ if(!Array.isArray(a)||!Array.isArray(b))return false; for(let i=1;i<7;i++){ if(!!a[i]!==!!b[i])return false; } return true; }
function varnyDen(prvyDenBloku){ return (prvyDenBloku+6)%7; }
function rozsahKratko(b){ return b.length===1?DNI[b[0]].slice(0,2):DNI[b[0]].slice(0,2)+"–"+DNI[b[b.length-1]].slice(0,2); }
// „Varíš v nedeľu večer na pondelok a utorok."
function vetaBloku(b){ const dni=b.map(d=>DNI_NA[d]);
  const na=dni.length===1?dni[0]:dni.slice(0,-1).join(", ")+" a "+dni[dni.length-1];
  return "Varíš "+DNI_V[varnyDen(b[0])]+" večer na "+na+"."; }
function rozvrhZhrnutie(){ if(!S.blokMode) return "Každý deň zvlášť — varí sa každý deň nanovo.";
  const varne=bloky().map(b=>DNI[varnyDen(b[0])].slice(0,2));
  const zoz=varne.length===1?varne[0]:varne.slice(0,-1).join(", ")+" a "+varne[varne.length-1];
  return "Varíš "+varne.length+"× do týždňa — "+zoz+" večer."; }
// Aktuálne nastavenie zodpovedá niektorej predvoľbe? (na odškrtnutie v dialógu)
function aktivnyRozvrhId(){ if(!S.blokMode) return "denne";
  const p=ROZVRHY_PRED.find(r=>rovnakeHranice(r.hranice,S.hranice)); if(p)return p.id;
  const v=(S.rozvrhy||[]).find(r=>rovnakeHranice(r.hranice,S.hranice)); return v?("u:"+v.id):""; }

// Zmena hraníc plán NEMAŽE — len môže rozbiť pravidlo „v jednom bloku sa je to isté".
// Toto vráti indexy blokov, kde majú dni rôzny obsah, aby sme to používateľovi vedeli povedať.
// P5: „nejednotný blok" je varovanie o BATCH COOKINGU — že sa v jednom bloku varí viackrát.
// Snackový slot sa nevarí (je to zabalený výrobok z regálu) a od vlny P5 sa zámerne líši deň
// od dňa, takže do tejto kontroly nepatrí — inak appka po každom generovaní hlási nejednotnosť,
// ktorá žiadnu prácu navyše nestojí.
function nejednotneBloky(){ const out=[];
  bloky().forEach((b,idx)=>{ if(b.length<2)return;
    const sloty=[...new Set(b.flatMap(d=>slotyDna(d)))].filter(s=>!jeSnackSlot(s));
    const zle=sloty.some(s=>{ const dni=b.filter(d=>slotyDna(d).includes(s)); if(dni.length<2)return false;
      const prvy=JSON.stringify(slotIds(dni[0],s)); return dni.some(d=>JSON.stringify(slotIds(d,s))!==prvy); });
    if(zle) out.push(idx); });
  return out; }
function planPrazdnyTyzden(){ return ![0,1,2,3,4,5,6].some(di=>{ const p=S.plan[datumPre(di)]; return p&&Object.keys(p).length; }); }
// Zrovná blok podľa jeho prvého NEPRÁZDNEHO dňa. Nič nemaže — kopíruje.
function zjednotBloky(){ let zmenene=0;
  bloky().forEach(b=>{ if(b.length<2)return;
    const zdroj=b.find(d=>slotyDna(d).some(s=>slotIds(d,s).length)); if(zdroj==null)return;
    const iso0=datumPre(zdroj); const vzor=S.plan[iso0]||{}; const vzorF=S.planF[iso0]||null;
    b.forEach(d=>{ if(d===zdroj)return; const iso=datumPre(d);
      if(JSON.stringify(S.plan[iso]||{})===JSON.stringify(vzor))return;
      S.plan[iso]=JSON.parse(JSON.stringify(vzor));
      if(vzorF)S.planF[iso]=JSON.parse(JSON.stringify(vzorF)); else delete S.planF[iso];
      zmenene++; }); });
  save(); renderPlan(); if(typeof renderRozvrhDialog==="function"&&document.getElementById("rozvrh-body"))renderRozvrhDialog();
  toast(zmenene?("Bloky zjednotené — "+zmenene+" dní prepísaných podľa prvého dňa bloku."):"Bloky už boli jednotné.");
  return zmenene; }

// Jediné miesto, kadiaľ ide zmena rozvrhu. Pamätá si predošlý stav, aby sa dal vrátiť.
let _rozvrhUndo=null;
function nastavRozvrh(hranice,blokMode){ hraniceInit();
  _rozvrhUndo=_rozvrhUndo||{hranice:S.hranice.slice(),blokMode:!!S.blokMode};
  if(Array.isArray(hranice)){ S.hranice=hranice.slice(0,7).map(Boolean); S.hranice[0]=true; }
  if(blokMode!==undefined) S.blokMode=!!blokMode;
  save(); renderPlan(); renderRozvrhDialog(); }
function vratRozvrh(){ if(!_rozvrhUndo){ toast("Niet čo vrátiť."); return; }
  S.hranice=_rozvrhUndo.hranice.slice(); S.blokMode=_rozvrhUndo.blokMode; _rozvrhUndo=null;
  save(); renderPlan(); renderRozvrhDialog(); toast("Pôvodný rozvrh vrátený."); }
function pouziRozvrh(id){ if(id==="denne"){ nastavRozvrh(null,false); return; }
  const p=ROZVRHY_PRED.find(r=>r.id===id)||(S.rozvrhy||[]).find(r=>("u:"+r.id)===id);
  if(!p)return; nastavRozvrh(p.hranice,true); }
function toggleHranica(i){ hraniceInit(); if(i<=0||i>6)return; const h=S.hranice.slice(); h[i]=!h[i]; nastavRozvrh(h,true); }
async function ulozRozvrh(){ hraniceInit();
  const bl=bloky(); const def="Môj rozvrh ("+bl.map(b=>DNI[varnyDen(b[0])].slice(0,2)).join("/")+")";
  const nazov=await promptModal("Názov rozvrhu:",def); if(nazov===null)return;
  const n=(nazov||"").trim()||def;
  S.rozvrhy=(S.rozvrhy||[]).filter(r=>!rovnakeHranice(r.hranice,S.hranice));
  S.rozvrhy.unshift({id:"r"+Date.now(),nazov:n,hranice:S.hranice.slice()});
  S.rozvrhy=S.rozvrhy.slice(0,8); save(); renderRozvrhDialog(); toast("Rozvrh „"+n+"“ uložený."); }
function zmazRozvrh(id){ S.rozvrhy=(S.rozvrhy||[]).filter(r=>r.id!==id); save(); renderRozvrhDialog(); }

// ── Pás nad tabuľkou plánu ───────────────────────────────────────────────────
// P2: na telefóne mal pás rozvrhu 189 px a odtlačil tabuľku plánu pod prehyb. Zbalený ukazuje
// jeden riadok („🍳 Rozvrh varenia · 3 bloky" + ✂️ + ▾); vetu a tri bloky rozbalí ťuknutie.
// Nič sa nestráca: blok práve zvoleného dňa aj s varným dňom je v hlavičke tabuľky pod pásom.
let _pasOtvoreny=false;
function prepniRozvrhPas(){ _pasOtvoreny=!_pasOtvoreny; renderRozvrhPas(); }
function renderRozvrhPas(){ const box=document.getElementById("rozvrh-pas"); if(!box)return;
  const upr='<button class="btn rozvrh-upr" onclick="otvorRozvrh()" aria-label="Upraviť rozvrh varenia — kedy varíš a na koľko dní">✂️ <span class="tl">Upraviť rozvrh</span></button>'
    +'<button class="btn plan-zbal" onclick="prepniRozvrhPas()" aria-expanded="'+(_pasOtvoreny?"true":"false")+'" aria-controls="rozvrh-pas" aria-label="'+(_pasOtvoreny?"Zbaliť":"Rozbaliť")+' podrobnosti rozvrhu varenia"><span aria-hidden="true">'+(_pasOtvoreny?"▴":"▾")+'</span></button>';
  const hlava=nadpis=>'<div class="rozvrh-hlava"><span class="rozvrh-nadpis">🍳 Rozvrh varenia'+nadpis+'</span>'+upr+'</div>';
  box.className="rozvrh-pas d"+planDen+(_pasOtvoreny?" otvoreny":"");
  if(!S.blokMode){ box.innerHTML=hlava("")
      +'<p class="info" style="margin:7px 0 0">Každý deň zvlášť — každý deň má vlastné jedlá a varí sa nanovo. Ak varíš na viac dní dopredu, zapni bloky v „Upraviť rozvrh“.</p>';
    zpristupniKliky(box); return; }
  const bl=bloky();
  let h=hlava(" · "+bl.length+(bl.length===1?" blok":(bl.length<5?" bloky":" blokov")))
    +'<p class="info" style="margin:7px 0 0">'+rozvrhZhrnutie()+'</p><div class="rozvrh-bloky">';
  bl.forEach((b,idx)=>{ const pism=String.fromCharCode(65+idx);
    h+='<button class="rozvrh-blok '+blokTrieda(idx)+'" data-d="'+b.join(" ")+'" onclick="planVarenia('+b[0]+')" aria-label="'+escHtml(vetaBloku(b))+' Otvoriť plán varenia pre blok '+pism+'">'
      +'<span class="rb-pis" aria-hidden="true">'+pism+'</span><span class="rb-txt"><b>'+escHtml(vetaBloku(b))+'</b>'
      +'<small>'+rozsahKratko(b)+' · '+b.length+(b.length===1?" deň":(b.length<5?" dni":" dní"))+' z jednej várky · plán varenia →</small></span></button>'; });
  h+='</div>'; box.innerHTML=h; zpristupniKliky(box); }
// ── Dialóg „Rozvrh varenia" ──────────────────────────────────────────────────
function otvorRozvrh(){ _rozvrhUndo=null;
  document.getElementById("pick-modal").innerHTML='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>🍳 Rozvrh varenia</h2><div class="subx">Kedy varíš a na koľko dní vydrží várka.</div></div><div class="content2" id="rozvrh-body"></div>';
  renderRozvrhDialog(); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function otvorRozdelenie(){ otvorRozvrh(); } // stará cesta z menu — nech nikoho nevyhodí
function renderRozvrhDialog(){ const box=document.getElementById("rozvrh-body"); if(!box)return; hraniceInit();
  const akt=aktivnyRozvrhId();
  const riadok=(id,nazov,popis,extra)=>'<div class="rozvrh-riadok"><button class="rozvrh-pred'+(akt===id?" on":"")+'" onclick="pouziRozvrh(\''+id+'\')" aria-pressed="'+(akt===id)+'">'
    +'<span class="rp-ok" aria-hidden="true">'+(akt===id?"✓":"")+'</span><span class="rp-t"><b>'+escHtml(nazov)+'</b><small>'+escHtml(popis)+'</small></span></button>'+(extra||"")+'</div>';
  let h='<h4 class="sekcia">Hotové rozvrhy</h4>';
  ROZVRHY_PRED.forEach(p=>{ const bl2=hraniceNaBloky(p.hranice); h+=riadok(p.id,p.nazov,p.popis+" → "+bl2.map(rozsahKratko).join(" · ")); });
  (S.rozvrhy||[]).forEach(r=>{ const bl2=hraniceNaBloky(r.hranice);
    h+=riadok("u:"+r.id,r.nazov,bl2.map(rozsahKratko).join(" · "),
      '<button class="lnk rozvrh-zmaz" onclick="zmazRozvrh(\''+r.id+'\')" aria-label="Zmazať rozvrh '+escHtml(r.nazov)+'">✕</button>'); });
  h+=riadok("denne","Každý deň zvlášť","Bez blokov — každý deň vlastné jedlo");

  h+='<h4 class="sekcia">Vlastné rozdelenie</h4><p class="info" style="margin:0 0 8px">Ťukni medzi dva dni: <b>✂</b> = tu sa začína nový blok (varíš deň predtým večer), <b>·</b> = dni patria do jedného bloku.</p>';
  h+='<div id="rozvrh-dni" class="rozvrh-dni">';
  if(!S.blokMode){ h+='<p class="info">Bloky sú vypnuté. Ťukni na hranicu a zapnú sa.</p>'; }
  const idxB={}; bloky().forEach((b,i)=>b.forEach(d=>idxB[d]=i));
  for(let i=0;i<7;i++){ const bi=idxB[i]||0; const tr=S.blokMode?blokTrieda(bi):"";
    h+='<span class="rozvrh-den '+tr+'" title="'+(S.blokMode?"Blok "+blokPismeno(bi):"")+'">'+DNI[i].slice(0,2)+(S.blokMode?'<b class="rd-p" aria-hidden="true">'+blokPismeno(bi)+'</b>':'')+'</span>';
    if(i<6){ const sp=!!S.hranice[i+1]&&S.blokMode; const tit=sp?"spojiť "+DNI[i]+" a "+DNI[i+1]+" do jedného bloku":"rozdeliť medzi "+DNI[i]+" a "+DNI[i+1];
      h+='<button class="hranica'+(sp?" rez":"")+'" onclick="toggleHranica('+(i+1)+')" title="'+tit+'" aria-label="'+tit+'">'+(sp?"✂":"·")+'</button>'; } }
  h+='</div>';

  if(S.blokMode){ h+='<div class="rozvrh-nahlad">';
    bloky().forEach((b,idx)=>{ h+='<div class="rn-row"><b>Blok '+String.fromCharCode(65+idx)+'</b> · '+rozsahKratko(b)+' — '+escHtml(vetaBloku(b))+'</div>'; });
    h+='</div><div class="btn-row" style="margin-top:10px"><button class="btn" onclick="ulozRozvrh()">💾 Uložiť ako môj rozvrh</button>'
      +(_rozvrhUndo?'<button class="btn" onclick="vratRozvrh()">↩︎ Vrátiť pôvodný</button>':'')+'</div>'; }
  else if(_rozvrhUndo){ h+='<div class="btn-row" style="margin-top:10px"><button class="btn" onclick="vratRozvrh()">↩︎ Vrátiť pôvodný</button></div>'; }

  // Čo sa stane s už naplneným plánom — povedz to skôr, než sa človek zľakne
  if(!planPrazdnyTyzden()){ const zle=nejednotneBloky();
    h+='<div class="rozvrh-info'+(zle.length?" warn":"")+'">';
    h+='<b>Čo to spraví s plánom tohto týždňa?</b><br>Zmena rozvrhu <b>nič nemaže</b> — každý deň si necháva svoje jedlá.';
    if(zle.length){ h+='<br>Ale '+zle.length+' '+(zle.length===1?"blok má":(zle.length<5?"bloky majú":"blokov má"))+' teraz v rôznych dňoch rôzne jedlá ('
        +zle.map(i=>"Blok "+String.fromCharCode(65+i)).join(", ")+'), takže by si varil viackrát.'
      +'<div class="btn-row" style="margin-top:8px"><button class="btn primary" onclick="zjednotBloky()">Zjednotiť bloky podľa prvého dňa</button><button class="btn" onclick="toast(\'Plán zostal, ako bol.\')">Nechať tak</button></div>'; }
    else h+='<br>Bloky sedia — v každom bloku sa je to isté.';
    h+='</div>'; }
  else h+='<div class="rozvrh-info">Plán tohto týždňa je prázdny — zmena rozvrhu nemá čo pokaziť.</div>';

  box.innerHTML=h; zpristupniKliky(box); }
// bloky() pre ĽUBOVOĽNÉ hranice (náhľad predvoľby bez toho, aby sme ju museli najprv použiť)
function hraniceNaBloky(hr){ const out=[]; let cur=null; for(let i=0;i<7;i++){ if(i===0||hr[i]){ cur=[i]; out.push(cur); } else cur.push(i); } return out; }
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
    ${jeTentoTyzden?"":'<span class="chip" style="cursor:pointer" onclick="skokNaDnesTyzden()" aria-label="Skočiť na tento týždeň">📅 <span class="tl">Tento týždeň</span></span>'}
  </div>`; }
function renderTyzdenNav(){ const el=document.getElementById("plan-kontext"); if(el){el.innerHTML=tyzdenNavHTML(); zpristupniKliky(el);} }
// Na mobile sa 7 stĺpcov nezmestí — ukazujeme jeden deň naraz (CSS skryje ostatné stĺpce, dáta ostávajú tie isté).
let planDen=(new Date().getDay()+6)%7;
function planDenNa(di){ planDen=di; renderPlan(); }
function renderDenNav(){ const box=document.getElementById("plan-den-nav"); if(!box)return;
  box.innerHTML=DNI.map((d,i)=>`<span class="chip${i===planDen?' active':''}" onclick="planDenNa(${i})">${d.slice(0,2)}</span>`).join("")
    +`<span class="chip" style="cursor:default;background:none;border:none;color:var(--muted)">${fmtD(datumPre(planDen))}</span>`;
  zpristupniKliky(box); }

// B2: prázdny plán neponúkal nič okrem 28× „+ pridať" v bunkách. Povedz, čo sa dá spraviť.
function renderPlanPrazdny(){ const el=document.getElementById("plan-prazdny"); if(!el)return;
  if(!planPrazdnyTyzden()){ el.style.display="none"; el.innerHTML=""; return; }
  el.style.display="";
  el.innerHTML='<b>Týždeň '+fmtD(S.viewOd)+'–'+fmtD(pridajDni(S.viewOd,6))+' je prázdny.</b><br>'
    +'<span class="info">Najrýchlejšie: <b>✨ Zostaviť jedálniček</b> vyplní celý týždeň podľa tvojho rozvrhu a kalórií. '
    +'Alebo ťukni <b>+ pridať</b> v bunke a vyber si sám.</span>'
    +'<div class="btn-row" style="margin-top:9px"><button class="btn" onclick="skopirujMinuly()">📋 Skopírovať minulý týždeň</button>'
    +'<button class="btn" onclick="otvorNacitat()">📥 Načítať uložený jedálniček</button></div>';
  zpristupniKliky(el); }
function renderPlan(){
  renderTyzdenNav(); hraniceInit(); renderRozvrhPas(); renderPlanPrazdny(); renderDenNav();
  const bl=bloky(); const idxBloku={}; bl.forEach((b,idx)=>b.forEach(di=>idxBloku[di]=idx));
  // trieda, nie inline background — inline štýl prebíja body.dark a v tmavom režime robí tabuľku nečitateľnou.
  // Koncepcia B: farba = blok (A slivka / B more / C oliva), nie striedanie dvoch odtieňov.
  // Farba nikdy nestojí sama — písmeno bloku je v hlavičke stĺpca aj v páse nad tabuľkou.
  const bIdx=di=>idxBloku[di]||0;
  const tint=di=>S.blokMode?("bunka-"+blokTrieda(bIdx(di)).slice(5)):'';
  const t=document.getElementById("plan-table"); 
  // table-layout:fixed berie šírky z PRVÉHO riadku; ten má v blokovom režime colspan bunky, takže
  // zvyšok šírky spadol do stĺpca s názvami jedál (718 px) a dni dostali 51 px. <colgroup> to určí priamo.
  let h='<colgroup><col class="c-slot"><col span="7"></colgroup>';
  // riadky = zjednotenie globálnych slotov + čokoľvek v per-deň maskách (aby slot v maske po zmene globálnych slotov nezmizol z UI, no stále sa počítal)
  const rowSloty=[...new Set([...SLOTY(), ...[0,1,2,3,4,5,6].flatMap(di=>(S.daySloty||{})[datumPre(di)]||[])])].filter(s=>VSETKY_SLOTY.includes(s)).sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b));
  if(S.blokMode){ h+='<tr><td class="slotname rohova"></td>';
    // B1: hlavička bloku hovorí aj VARNÝ DEŇ, nielen rozsah — bez toho sa dalo z tabuľky vyčítať
    // „Blok A · Po–Ut", ale nie „varíš v nedeľu večer". Celá veta je v title/aria a v páse nad tabuľkou.
    bl.forEach((b,idx)=>{ const pism=String.fromCharCode(65+idx); const vari=DNI[varnyDen(b[0])].slice(0,2); const veta=escHtml(vetaBloku(b));
      h+=`<td colspan="${b.length}" data-d="${b.join(" ")}" class="${blokTrieda(idx)} blok-hlava" title="${veta}"><b>${znakBloku(idx)} Blok ${pism} · ${rozsahKratko(b)}</b><br><span class="bh-vari">🍳 varíš ${vari} večer</span><br><button class="plan-varenia lnk" onclick="planVarenia(${b[0]})" aria-label="${veta} Otvoriť plán varenia pre blok ${pism}">plán varenia →</button></td>`; }); h+="</tr>"; }
  h+='<tr class="dni-hlavicka"><th>Jedlo</th>';
  DNI.forEach((d,di)=>{ const bi=bIdx(di);
    h+=`<th data-d="${di}" class="${blokTrieda(bi)}">${znakBloku(bi,"Blok "+blokPismeno(bi)+" · "+d)}${d.slice(0,3)}</th>`; });
  h+="</tr>";
  h+='<tr class="ctrl-row"><td class="slotname rohova"></td>';
  DNI.forEach((d,di)=>{ const custom=(S.dayPpl[datumPre(di)]!=null); const ppl=custom?S.dayPpl[datumPre(di)]:stravniciList().length;
    const chips=rowSloty.map(s=>{ const on=slotyDna(di).indexOf(s)>=0;
      return `<button class="mchip${on?' on':''}" title="${s}" aria-pressed="${on}" aria-label="${s} v deň ${DNI[di]} — ${on?'vypnúť':'zapnúť'}" onclick="toggleDenSlot(${di},'${s}')">${ikony[s]||s[0]}</button>`; }).join("");
    h+=`<td data-d="${di}" class="ctrl ${tint(di)}"><div class="ppl"><button aria-label="Menej stravníkov — ${DNI[di]}" onclick="zmenDenPpl(${di},-1)">−</button><span class="pplnum${custom?' cust':''}" title="Počet stravníkov v tento deň (presné porcie sú pri každom jedle cez 👥 porcie)">👥 ${ppl}</span><button aria-label="Viac stravníkov — ${DNI[di]}" onclick="zmenDenPpl(${di},1)">+</button></div><div class="mchips">${chips}</div></td>`;
  });
  h+="</tr>";
  rowSloty.forEach(slot=>{
    h+=`<tr><td class="slotname">${slot}</td>`;
    DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);
      if(slotyDna(di).indexOf(slot)<0){ h+=`<td data-d="${di}" class="${tint(di)}"><div class="plan-cell vyp">vyp.</div></td>`; return; }
      if(ids.length){ let kc=0;
        // A8 (WCAG 2.1.1): obsah bunky boli `span onclick` — klávesnicou nedosiahnuteľné. Teraz sú to
        // skutočné <button> (trieda `pc-btn` im zoberie vzhľad tlačidla, štýl ostáva z .nm/.kc/.rm).
        const kde=`${DNI[di]}, ${slot}`;
        const riadky=ids.map(cid=>{const k=komponent(cid); if(!k)return ""; kc+=kcalPorcia(k); const kn=escHtml(k.nazov);
          const nm=k._priloha?`<span class="nm">+ ${kn}</span>`
            :k._left?`<button class="nm pc-btn" onclick="otvor('${k._srcId}')" title="Zvyšok — zobraziť recept" aria-label="Zvyšok ${kn} — zobraziť recept">♻️ ${kn} <small>(zvyšok)</small></button>`
            :`<button class="nm pc-btn pc-odkaz" onclick="otvor('${cid}',{di:${di},slot:'${slot}'})" title="Zobraziť recept" aria-label="${kn} — zobraziť recept">${kn}</button>`;
          return `<div style="display:flex;justify-content:space-between;gap:4px;align-items:start">${nm}<button class="pc-btn pc-x" onclick="odoberKomponent(${di},'${slot}','${cid}')" title="odobrať" aria-label="Odobrať ${kn} z plánu — ${kde}">✕</button></div>`;}).join("");
        h+=`<td data-d="${di}" class="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')"><div class="plan-cell" draggable="true" ondragstart="dragStart(event,${di},'${slot}')" title="Potiahni pre presun">${riadky}<button class="kc pc-btn" title="Upraviť veľkosť porcie" aria-label="Upraviť veľkosť porcie — ${kde}" onclick="upravFaktor(${di},'${slot}')">${Math.round(kc*f)} kcal ${fmtPct(f)} <i class="pc-ed" aria-hidden="true">✎</i></button><span style="display:flex;gap:14px;margin-top:2px"><button class="rm pc-btn" style="color:var(--accent)" aria-label="Zmeniť jedlo — ${kde}" onclick="vyberDoPlanu(${di},'${slot}')">✎ zmeniť</button><button class="rm pc-btn" style="color:var(--accent)" onclick="akcieSlotu(${di},'${slot}')" title="Doplnok, znova, porcie, zvyšok" aria-label="Ďalšie akcie — ${kde}">⋯ viac</button></span></div></td>`;
      } else h+=`<td data-d="${di}" class="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')"><button class="plan-cell prazdne pc-btn pc-empty" aria-label="Pridať jedlo — ${DNI[di]}, ${slot}" onclick="vyberDoPlanu(${di},'${slot}')">+ pridať</button></td>`;
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
// P2: riadok so stravníkmi a slotmi dňa (👥 − 2 + · ikonky jedál) zaberal na telefóne 98 px
// nad prvým jedlom. Na mobile je skrytý a otvára ho položka „👥 Stravníci a jedlá dňa"
// v „⋯ Viac"; na počítači je stále rovno v tabuľke.
function prepniPlanCtrl(){ const on=!document.body.classList.contains("plan-ctrl");
  document.body.classList.toggle("plan-ctrl",on);
  const a=document.getElementById("m-plan-ctrl"); if(a)a.setAttribute("aria-pressed",on?"true":"false");
  toast(on?"Stravníci a jedlá dňa sú v tabuľke.":"Stravníci a jedlá dňa sú skryté."); }
let dragSrc=null;
function dragStart(e,di,slot){ dragSrc={di,slot}; try{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text","x");}catch(_){} }
function dragOver(e){ e.preventDefault(); try{e.dataTransfer.dropEffect="move";}catch(_){} }
function dragDrop(e,di,slot){ e.preventDefault(); if(!dragSrc)return; if(!(dragSrc.di===di&&dragSrc.slot===slot)) presunSlot(dragSrc.di,dragSrc.slot,di,slot); dragSrc=null; }
function setSlotComp(di,slot,comp){ const dni=S.blokMode?blokDni(di):[di]; dni.forEach(d=>{ const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; if(comp&&comp.length)S.plan[iso][slot]=comp.slice(); else if(S.plan[iso])delete S.plan[iso][slot]; }); }
function presunSlot(fromDi,fromSlot,toDi,toSlot){ const a=slotIds(fromDi,fromSlot), b=slotIds(toDi,toSlot);
  setSlotComp(toDi,toSlot,a); setSlotComp(fromDi,fromSlot,b); save(); renderPlan(); }
let pickCiel=null;
function vyberDoPlanu(di,slot){ pickCiel={di,slot,blok:S.blokMode}; ukazKatPicker(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
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
  return `<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</span><span class="kc">${ing?"🥕 "+escHtml(ing.nazov)+" · ":""}${escHtml(r.kategoria)}${r.kuchyna?" · "+escHtml(r.kuchyna):""} · ${kcalPorcia(r)} kcal</span></div>`; }
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
  list.forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</span><span class="kc">${escHtml(r.kategoria)}${r.kuchyna?" · "+escHtml(r.kuchyna):""} · ${kcalPorcia(r)} kcal</span></div>`; });
  h+="</div>";
  document.getElementById("pick-modal").innerHTML=h;
}
function nastavPlan(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  const r=receptById(id); let comp=[id];
  { const pr=jeHlavnyChodSlot(c.slot)?prilohaPre(r,0):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(c.slot) && r && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  dni.forEach(di=>{ const iso=datumPre(di); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][c.slot]=comp.slice(); });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); }
function pridajKomponent(di,slot){ pickCiel={di,slot,blok:S.blokMode,pridat:true}; ukazDoplnok(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function ukazDoplnok(){ let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Pridať doplnok</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  h+='<div class="chips">'; Object.keys(PRILOHY).forEach(k=>{ h+=`<span class="chip" onclick="pridajDoplnok('${k}')">${escHtml(PRILOHY[k].nazov)}</span>`; });
  h+='</div><h4 class="sekcia">Alebo recept (príloha / šalát)</h4><div style="max-height:40vh;overflow:auto">';
  RECEPTY.filter(r=>["Príloha","Šalát","Nátierka","Pečivo"].includes(r.kategoria)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="pridajDoplnok('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</span><span class="kc">${escHtml(r.kategoria)}</span></div>`; });
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
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>♻️ Zvyšok</h2><div class="subx">${escHtml(src.nazov)} → kam ho rozpísať?</div></div><div class="content2">`;
  for(let d=0;d<7;d++){ const sl=slotyDna(d); if(!sl.length)continue;
    h+=`<div class="sp-row" style="flex-wrap:wrap;gap:6px"><span style="min-width:60px"><b>${DNI[d].slice(0,2)}</b></span><span style="display:flex;gap:6px;flex-wrap:wrap">`;
    sl.forEach(s=>{ const same=(d===di&&s===slot); h+=`<button class="mini" ${same?"disabled":""} onclick="umiestniZvysok('${srcId}',${d},'${s}')">${ikony[s]||""} ${s}</button>`; });
    h+="</span></div>"; }
  h+='<p class="info" style="margin-top:10px">Zvyšok sa ráta do kalórií daného dňa, ale nepridáva sa do nákupu (navaríš raz).</p></div>';
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
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
function zavriPick(){ document.getElementById("pick-overlay").classList.remove("open"); _zahodHistoriuModalu(); _vratFokus(); }
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
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Do plánu: ${escHtml(r.nazov)}</h2></div><div class="content2">
    <div class="field"><label>Deň</label><select class="f" id="pdp-den">${dni.map((d,i)=>`<option value="${i}">${d}</option>`).join("")}</select></div>
    <div class="field"><label>Jedlo (slot)</label><select class="f" id="pdp-slot">${sloty.map(s=>`<option ${s===slot?"selected":""}>${s}</option>`).join("")}</select></div>
    <p class="info">Pridá sa na prvé miesto slotu${S.blokMode?" (na celý blok)":""}.</p>
    <div class="btn-row"><button class="btn primary" onclick="ulozDoPlanu('${id}')">📅 Pridať do plánu</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function ulozDoPlanu(id){ const di=parseInt(document.getElementById("pdp-den").value)||0; const slot=document.getElementById("pdp-slot").value; const r=receptById(id); if(!r)return;
  let comp=[id];
  { const pr=jeHlavnyChodSlot(slot)?prilohaPre(r,0):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  const cur=slotIds(di,slot).filter(x=>!comp.includes(x)); const nove=comp.concat(cur);
  const dni=S.blokMode?blokDni(di):[di]; dni.forEach(d=>{ const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][slot]=nove.slice(); });
  rescaleDen(dni); save(); zavriPick(); prepni("planovac"); }
// A7: skutočné triedy raňajok. Predtým všetko nesendvičové vrátilo unikát ("iná:id"),
// takže dedup báz nerobil nič a týždeň mohol byť 5× ovsená kaša.
function ranajkyBaza(r){ if(!r)return ""; const mk=_memoBaza.get(r.id); if(mk!==undefined)return mk;
  const v=_ranajkyBazaVypocet(r); _memoBaza.set(r.id,v); return v; }
function _ranajkyBazaVypocet(r){ const s=bezDia(r.nazov+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+((r.tagy||[]).join(" ")));
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
  // K8: prejdeProfil beží cez všetkých 1956 receptov a poolPreSlot sa volá pri každom výbere
  // aj pri každej opravnej výmene. Počas generovania sa výsledok cachuje (profil sa nemení).
  if(_genCache){ const c=_genCache.pool.get(slot); if(c!==undefined) return c; }
  const v=_poolPreSlotVypocet(slot);
  if(_genCache)_genCache.pool.set(slot,v);
  return v; }
// S1: Kokteil a Nápoj sa do jedálnička nedostanú NIKDY — ani cez záložnú vetvu. 125 receptov,
// ktoré sú nápoj (mojito, latte, sirup), nepatria do dňa na 1450 kcal ako jedlo.
// S2: v snackovom slote musí byť hotový kúpený výrobok. Filter je TVRDÝ (stačí jeden výrobok
// v poole), lebo „snack, čo sa varí" je presne to, čo používateľ zakázal — radšej ten istý
// jogurt druhýkrát než cuketové chipsy zo 7 surovín.
function _poolPreSlotVypocet(slot){
  let pool=RECEPTY.filter(r=>r.kategoria!=="Kokteil"&&r.kategoria!=="Nápoj"&&prejdeProfil(r));
  const kats=SLOT_KATEGORIE[slot]||[];
  let p=pool.filter(r=>kats.includes(r.kategoria));
  if(jeSnackSlot(slot)){ const v=p.filter(jeVyrobok); if(v.length) return _cenovyStrop(v,slot); }
  if(!p.length) p=pool.filter(r=>r.kategoria!=="Kokteil"&&r.kategoria!=="Nápoj");
  return _cenovyStrop(p,slot);
}
// R5: mäkký strop na luxus sa uplatní RAZ, na celom univerze receptov — nie zakaždým vo výbere.
// Prečo takto: opravné prechody (kcal, poradie, bielkoviny, vláknina) robia desiatky výmen a každý
// filter, ktorý im počas výmeny zúži pool, im zožerie pokus a deň skončí horší. Keď sa luxus
// vyhodí z univerza vopred, všetky prechody pracujú v tom istom (dostupnom) svete a nikto
// s cenou nesúťaží. Strop je na €/100 kcal, takže netrestá veľké jedlá, len drahé suroviny.
// Poistka: ak by strop zobral viac než 60 % poolu (úzky profil, drahá databáza), neuplatní sa —
// pravidlá slotu a pestrosť sú prednejšie než rozpočet.
// D2: v SNACKOVOM slote sa strop meria na PORCII, nie na 100 kcal. Snack je hotový kúpený
// výrobok s malým objemom, takže sa mu €/100 kcal počíta z 60–150 kcal a vyjde vysoké aj pri
// úplne bežnej cene: 88 kcal skyr za 0,98 € = 1,11 €/100 kcal a starý strop (3 × rozpočet na
// 100 kcal = 0,87) ho vyhodil. Spolu s ním vypadol VŠETOK skyr, proteínové nápoje aj jogurt,
// všetky tri šunky, tuniak, sušené hovädzie a kurací wrap — 19 z 90 výrobkov a práve tie
// najbielkovinovejšie (pool klesol na 71 s mediánom 3,5 g bielkovín/100 kcal).
// Rozpočet snacku je daný jeho PODIELOM NA DNI (~0,42 € pri 4,20 €/deň), nie jeho vlastnými
// kalóriami — inak si malé jedlo kúpi strop len tým, že je malé, a veľké lacné jedlo dostane
// rozpočet, ktorý nikdy neminie. Údený losos za 2,90 €/porcia stropom stále neprejde.
function _cenovyStrop(p,slot){
  const ref=cenaRef(); if(!(ref>0)||!p.length) return p;
  let test;
  if(slot && jeSnackSlot(slot)){
    // Základ rozpočtu = podiel snacku na dni, ale najmenej MEDIÁN ceny porcie v katalógu.
    // Rozpočet 0,42 €/porcia je na hotové balené výrobky nereálny (medián katalógu je ~0,9 €)
    // a sám by vyhodil aj obyčajnú šunku. Mediánová poistka robí zo stropu detektor OUTLIEROV
    // v rámci katalógu (dnes ~2,7 €: kurací wrap 3,06 € a balené cherry paradajky 2,75 €),
    // nie nástroj na škrtanie bielkovín. Týždenný rozpočet stráži `zlacniDen` a cenová pokuta
    // v `skoreJedla`, ktoré vidia celý deň — nie tento predfilter.
    const cielK=cielSlotu(slot,SLOTY(),S.profil.kcal||0);
    const ceny=p.map(r=>vyzivaReceptu(r).cena||0).filter(c=>c>0).sort((a,b)=>a-b);
    const med=ceny.length?ceny[ceny.length>>1]:0;
    const strop=Math.max(ref*Math.max(60,cielK)/100,med)*CENA_LUX;
    // pozn.: `med` sa tu počíta z `p` (ešte neexistuje pool slotu, práve ho staviame),
    // v `cenaSlotu` z hotového poolu cez `_medianCenaPoolu` — obe dávajú to isté číslo.
    test=r=>!((vyzivaReceptu(r).cena||0)>strop);
  } else test=r=>!(cenaNa100(r)>ref*CENA_LUX);
  const pc=p.filter(test);
  return (pc.length>=Math.max(MIN_POOL,Math.ceil(p.length*0.4)))?pc:p;
}
function akcieTokens(){ return (S.akcie||"").toLowerCase().split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); }
function jeVakcii(r){ const t=akcieTokens(); if(!t.length)return false; return (r.ingrediencie||[]).some(i=>{const n=i.nazov.toLowerCase(); return t.some(x=>n.includes(x));}); }
function ingVakcii(nazov){ const t=akcieTokens(); if(!t.length)return false; const n=nazov.toLowerCase(); return t.some(x=>n.includes(x)); }
function watchTokens(){ return (S.profil.watch||"").toLowerCase().split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean); }
function jeWatch(r){ const t=watchTokens(); if(!t.length)return false; return (r.ingrediencie||[]).some(i=>{const n=i.nazov.toLowerCase();return t.some(x=>n.includes(x));}); }
// g bielkovín na 100 kcal — hlavné kritérium kvality receptu (HS_HI=10 je „veľa")
function bielkovinyNa100(r){ const v=vyzivaReceptu(r); return v.kcal>5 ? v.b/(v.kcal/100) : 0; }
// K1: kcal/bielkoviny/vláknina CELÉHO jedla = hlavný chod + jeho príloha.
// Výber sa predtým porovnával s kcal SAMOTNÉHO hlavného chodu, ale do plánu sa zapísalo jedlo
// aj s prílohou (ryža 216, cestoviny 288, pečivo 216 kcal). 91 % obedov prílohu dostane, takže
// obed s cieľom 508 kcal reálne vyšiel na 606 a deň systematicky prestrelil 1450 → 1554 kcal.
// Faktor to potom sťahoval a visel na dolnom doraze (medián 0,9). Odtiaľ všetky tri problémy:
// slabá kcal-presnosť pred škálovaním, riedené bielkoviny (príloha je 200 kcal takmer bez bielkovín)
// aj zaseknutý zlepsiBielkoviny (deň už bol na kalorickom strope, ďalšia výmena ho prebila).
// ── P5: SNACK AKO DVOJICA (hotový výrobok + hotový doplnok) ───────────────────
// Zadanie používateľa: „ako snack tam môžu byť normálne veci, čo vieš kúpiť v supermarkete —
// nič, čo treba robiť alebo zvlášť vážiť. Normálne zabalené, ako sa to kúpi." To pravidlo
// platí ďalej: OBA komponenty snacku sú kategórie Snack, typ „vyrobok", 1 balenie = 1 porcia.
//
// Prečo dvojica. Slot Snack má pri 1450 kcal cieľ 145 kcal a okno 87–210. Jablko má 78 kcal,
// mandarínky 74, čučoriedky 71, reďkovky 32 — pod dolnú hranicu, takže sa do plánu NEMOHLI
// dostať vôbec (namerané: čerstvé ovocie tvorilo 2,5 % snackov). Rozšíriť okno nadol sa dá,
// ale potom je „desiata" 78 kcal a deň si to musí vybrať inde. Reálna desiata je pritom dvojica:
// jablko s hrsťou orieškov, jogurt s banánom, mrkva so syrovými niťami. Appka to vie —
// slot má viac komponentov (`slotIds`, `komponent`), presne ako hlavný chod s prílohou.
//
// Doplnok sa priradí, keď výrobok NIE JE snack sám o sebe:
//   • je príliš malý (< SNACK_SOLO_KCAL), alebo
//   • je výživovo chudobný (< SNACK_SOLO_B100 g bielkovín/100 kcal) — sem padá holý rožok,
//     holý chlieb, popcorn aj čokoláda. „Suchý rožok ako olovrant" tým prestáva existovať:
//     buď dostane šunku/syr, alebo mu súčet vypadne z kcal-okna a nevyberie sa.
// Ktorý doplnok: bielkovinový výrobok k ovociu/zelenine/pečivu/orechom, ovocie k mliečnym,
// syrom, mäsu a k sladkému. Voľba je DETERMINISTICKÁ (hash id + poradové číslo týždňa), aby
// `jedloVyziva` počítala presne to, čo `zlozSlot` naozaj zapíše do plánu — a aby sa dvojice
// medzi týždňami premiešali. Nákup ani prepočet porcií to nerozbíja: druhý komponent je
// obyčajný recept s jednou ingredienciou „1 ks", rovnako ako prvý.
const SNACK_SOLO_KCAL=85, SNACK_SOLO_B100=4;
const SNACK_DOPL_OVOCIE=["kup-jablko","kup-banan","kup-mandarinky","kup-hrozno","kup-hruska",
  "kup-broskyna","kup-nektarinka","kup-cucoriedky","kup-maliny","kup-jahody","kup-pomaranc",
  "kup-kiwi","kup-marhule","kup-ceresne","kup-mango-kus","kup-klementinky","kup-grep"];
const SNACK_DOPL_BIELKOVINA=["kup-skyr-biely","kup-grecky-jogurt-nula","kup-jogurt-biely-light",
  "kup-jogurt-biely","kup-sunka-dusena","kup-sunka-morcacia","kup-sunka-kuracia",
  "kup-kuracie-jerky","kup-krabie-tycinky","kup-mini-syry","kup-tavene-trojuholniky",
  "kup-cmar","kup-syrove-nite-male","kup-eidam-platky-male","kup-babybel","kup-varene-vajce",
  "kup-mozzarella-snack","kup-cottage-maly","kup-tuniak-mini","kup-kabanos-mini",
  "kup-skyr-pistacia"];
// koľko kcal smie mať náhradný doplnok navyše/menej oproti tomu, ktorý vyšiel z hashu.
// Náhrada sa hľadá len vtedy, keď je nominálny doplnok v týždni už použitý — vďaka pásmu
// zostáva `jedloVyziva` (ktorá počíta s nominálnym) v rámci ±20 kcal presná.
const SNACK_DOPL_KCAL_TOL=12, SNACK_DOPL_B100=8, SNACK_DOPL_B_TOL=2;
// druh snacku — používa sa na pestrosť v týždni (nie dvakrát to isté „oddelenie regálu")
// aj na voľbu doplnku. Poradie testov je zámerné: sušené ovocie nie je čerstvé ovocie,
// ovocná tyčinka nie je ovocie.
// koľkokrát smie ísť do týždňa ten istý druh: najprv sa skúsi „ani raz", potom „najviac dvakrát".
// Tvrdý strop 1 zúžil pool per-denného výberu na 5–14 kandidátov a polovica dní tak zostala
// s tým istým snackom ako prvý deň bloku.
const SNACK_DRUH_STROPY=[1,2,3];
function snackDruh(r){
  if(!r) return "iné";
  const t=new Set(r.tagy||[]);
  if(t.has("tyčinka")||t.has("sušienky")) return "tyčinka";
  if(t.has("sušené")) return "sušené";
  if(t.has("ovocie")) return "ovocie";
  if(t.has("zelenina")) return "zelenina";
  if(t.has("orechy")||t.has("semienka")) return "orechy";
  if(t.has("pečivo")||t.has("sendvič")||t.has("wrap")) return "pečivo";
  if(t.has("čokoláda")||t.has("dezert")) return "sladké";
  if(t.has("chrumkavé")||t.has("slané")) return "slané";
  if(t.has("syr")) return "syr";
  if(t.has("mäso")||t.has("ryba")) return "mäso";
  if(t.has("nápoj")) return "nápoj";
  if(t.has("mliečne")||t.has("jogurt")||t.has("skyr")||t.has("tvaroh")) return "mliečne";
  return "iné"; }
const SNACK_DRUH_DOPL={ovocie:"B",zelenina:"B",pečivo:"B",orechy:"B",sušené:"B",
  mliečne:"O",syr:"O",mäso:"O",nápoj:"O",sladké:"O",tyčinka:"O",slané:"O"};
let _snackDoplCache=null;
function _snackDoplZoznamy(){ if(_snackDoplCache) return _snackDoplCache;
  const ok=z=>z.filter(id=>{ const r=receptById(id); return !!r && jeVyrobok(r) && r.kategoria==="Snack"; });
  _snackDoplCache={O:ok(SNACK_DOPL_OVOCIE),B:ok(SNACK_DOPL_BIELKOVINA)};
  return _snackDoplCache; }
function _snackHash(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
// poradové číslo zobrazeného týždňa — dvojice sa tým medzi týždňami pretočia
function _snackTyzdenIx(){ const d=Date.parse((S.viewOd||"2026-01-05")+"T00:00:00Z");
  return isFinite(d)?Math.floor(d/6048e5):0; }
// Pamäť snackov platná pre celé jedno generovanie. Je tu preto, aby bol doplnok funkciou
// vecí, ktoré sa počas generovania NEMENIA (výrobok, týždeň, pamäť) — `jedloVyziva` tak
// počíta presne tú dvojicu, ktorú `zlozSlot` naozaj zapíše. Keby doplnok závisel od
// priebežne rastúceho `ctx.pouzite`, optimalizátor by rátal s jednou dvojicou a do plánu
// by sa zapísala iná (namerané: kcal-presnosť dňa spadla zo 100 na 98,6 %).
let _genPamatSnack=null;
function snackDoplnok(r){
  if(!r||!jeVyrobok(r)||r.kategoria!=="Snack") return null;
  if(kcalPorcia(r)>=SNACK_SOLO_KCAL && bielkovinyNa100(r)>=SNACK_SOLO_B100) return null;
  const z=_snackDoplZoznamy()[SNACK_DRUH_DOPL[snackDruh(r)]||"B"]||[];
  let kand=z.filter(id=>id!==r.id);
  if(!kand.length) return null;
  // doplnok z posledných TYZDNE_PAMATE_SNACK týždňov sa preskočí, ak je z čoho vyberať
  if(_genPamatSnack){ const c=kand.filter(id=>!_genPamatSnack.has(id)); if(c.length)kand=c; }
  return kand[(_snackHash(r.id)+_snackTyzdenIx())%kand.length]; }
// Pri skladaní slotu sa doplnok, ktorý je v týždni už použitý ALEBO bol nedávno, vymení za
// rovnako veľký iný. Bez toho visí jeden jogurt pri každom druhom ovocí (namerané 43× na
// 40 týždňov) a susedné týždne sa začnú opakovať. Náhrada sa hľadá v celom poole snacku,
// nie len v krátkom zozname, a v pásme ±SNACK_DOPL_KCAL_TOL okolo nominálneho doplnku —
// vďaka tomu zostáva `jedloVyziva` (ktorá počíta s nominálnym) presná.
// Náhradný doplnok musí sedieť s nominálnym nielen v kcal, ale aj v BIELKOVINÁCH — inak
// optimalizátor dňa počíta s jednou dvojicou a do plánu sa zapíše slabšia (namerané:
// 3,8 % dní pod 80 g bielkovín, keď sa strážili len kalórie).
function _snackDoplKandidati(r,slot,k0,b0,trieda,zle){
  return poolPreSlot(slot||"Snack").filter(x=>x.id!==r.id && !zle(x.id)
    && Math.abs(kcalPorcia(x)-k0)<=SNACK_DOPL_KCAL_TOL
    && vyzivaReceptu(x).b>=b0-SNACK_DOPL_B_TOL
    && (trieda==="O" ? snackDruh(x)==="ovocie" : bielkovinyNa100(x)>=SNACK_DOPL_B100)); }
function snackDoplnokPre(r,ctx,slot){
  const nom=snackDoplnok(r);
  if(!nom||!ctx||!ctx.pouzite) return nom;
  const uz=id=>ctx.pouzite.has(id);
  if(!uz(nom)) return nom;
  // nominálny doplnok je v tomto týždni už na tanieri — vymeň ho za VEĽMI podobný
  // (±SNACK_DOPL_KCAL_TOL kcal, ±SNACK_DOPL_B_TOL g bielkovín), aby odhad zostal presný.
  const rn=receptById(nom), trieda=SNACK_DRUH_DOPL[snackDruh(r)]||"B";
  const k0=kcalPorcia(rn), b0=vyzivaReceptu(rn).b;
  const pamat=(ctx.nedavneSnack||[]);
  for(let i=0;i<=pamat.length;i++){
    const p=pamat[i];
    const kand=_snackDoplKandidati(r,slot,k0,b0,trieda,id=>uz(id)||(p&&p.has(id)));
    if(kand.length) return kand[(_snackHash(r.id)+_snackTyzdenIx())%kand.length].id;
  }
  return nom; }
// hustota bielkovín CELÉHO snacku (výrobok + doplnok) — vstup do preferenčnej váhy.
// Bez toho by váha merala len prvú položku a jablko by sa do turnaja nedostalo, hoci
// „jablko + šunka" má rovnakú hustotu ako proteínový puding.
function snackHustotaB(r){ const d=snackDoplnok(r); if(!d) return bielkovinyNa100(r);
  const c=receptById(d); if(!c) return bielkovinyNa100(r);
  const k=kcalPorcia(r)+kcalPorcia(c), b=vyzivaReceptu(r).b+vyzivaReceptu(c).b;
  return k>5?b/(k/100):0; }
function prilohaTokenPre(r,slot,rot){
  if(!r) return null;
  if(jeHlavnyChodSlot(slot)) return prilohaPre(r,rot||0);
  if(jeSnackSlot(slot)) return snackDoplnok(r);
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") return "prf:pecivo";
  return null; }
function jedloVyziva(r,slot,rot){
  const kl=_genCache?(slot+"|"+((rot||0)%CARB_PRILOHY.length)+"|"+r.id):null;
  if(kl!==null){ const c=_genCache.jedlo.get(kl); if(c!==undefined) return c; }
  const vys=_jedloVyzivaVypocet(r,slot,rot);
  if(kl!==null)_genCache.jedlo.set(kl,vys);
  return vys; }
function _jedloVyzivaVypocet(r,slot,rot){
  const v=vyzivaReceptu(r); let k=kcalPorcia(r), b=v.b, vl=v.vl||0, ce=v.cena||0;
  const t=prilohaTokenPre(r,slot,rot);
  if(t){ const c=komponent(t); if(c){ const w=vyzivaReceptu(c); k+=kcalPorcia(c); b+=w.b; vl+=w.vl||0; ce+=w.cena||0; } }
  // R1: `c` = € za PORCIU celého jedla vrátane prílohy. Bez prílohy by generátor porovnával cenu
  // hlavného chodu s rozpočtom slotu, do ktorého sa potom zapíše jedlo aj s ryžou za 0,20 € —
  // presne tá istá chyba, akú mal pred opravou K1 kcal.
  return {k:k,b:b,vl:vl,c:ce,d:(k>5?b/(k/100):0)}; }
function jedloKcal(r,slot,rot){ return jedloVyziva(r,slot,rot).k; }
// ── R2: ROZPOČET ────────────────────────────────────────────────────────────────
// Cieľ je uložený ako € na osobu a deň (S.profil.cenaCiel). Generátor však vyberá JEDLÁ, nie dni,
// preto sa cieľ prepočíta na „€ na 100 kcal" a rozpočet slotu je až z neho: cielC = cenaRef × cielK/100.
// Prečo €/100 kcal a nie pevný podiel na slot:
//  • sumu dňa to drží automaticky (Σ kcal slotov = cieľ dňa), nemusí existovať druhá tabuľka podielov;
//  • je to škálovo neutrálne — 150 kcal snack aj 550 kcal obed sa merajú tým istým metrom,
//    takže rozpočet nesystematicky netrestá veľké jedlá (kde je 76 % ceny týždňa) ani netoleruje
//    drahé malé (raňajky s lososom).
function cenaCielDen(){ const c=parseFloat(S.profil&&S.profil.cenaCiel); return (c>0&&isFinite(c))?c:0; }
function cenaRef(){ const k=S.profil.kcal||0, c=cenaCielDen(); return (k>0&&c>0)?c/(k/100):0; }
// € na 100 kcal receptu — vstup do preferenčnej váhy (bez prílohy: váha nepozná rotáciu príloh)
function cenaNa100(r){ const v=vyzivaReceptu(r); return v.kcal>5?(v.cena||0)/(v.kcal/100):0; }
// hustota bielkovín už zloženého slotu (komponenty v pláne)
function slotHustota(ids){ let k=0,b=0; (ids||[]).forEach(id=>{ const c=komponent(id); if(!c)return;
    k+=kcalPorcia(c); b+=vyzivaReceptu(c).b; }); return k>5?b/(k/100):0; }
// A2: bielkoviny sú MULTIPLIKÁTOR váhy, nie prirážka +0,5 pri zapnutom cieli. Predtým mal celý pool
// v auguste len dve váhy a medián dňa bol 66 g bielkovín oproti cieľu ~109 g.
// K8: výkon. vahaReceptu sa volá pre KAŽDÝ recept v poole pri každom výbere (pool obeda má 743)
// a jeSezonne v nej prechádza všetky ingrediencie × 16 kľúčov SEZONA. jedloVyziva zasa cez
// prilohaPre/maCarb púšťa regex na spojené názvy surovín, a to raz na recept pri každom
// zúžení kcal-okna. Turnaj a druhý opravný prechod počet týchto volaní znásobili, preto majú
// obe funkcie cache platnú počas jedného generovania (S.hodn/akcie/watch/špajza sa v ňom nemenia).
let _genCache=null;
function _genCacheReset(zapni){ _genCache = zapni ? {vaha:new Map(), jedlo:new Map(), pool:new Map(), med:new Map()} : null; }
// D2b: mediánová cena PORCIE v poole slotu. Slúži ako realistický základ rozpočtu tam, kde je
// podiel slotu na dennom rozpočte nereálne malý (snack = 10 % dňa = 0,42 €, ale hotový výrobok
// pod 0,42 € v Kauflande prakticky nie je). Bez nej dostane KAŽDÝ výrobok plnú cenovú pokutu
// a cena prestane rozlišovať skyr za 0,98 € od údeného lososa za 2,60 €.
function _medianCenaPoolu(slot){
  if(_genCache){ const c=_genCache.med.get(slot); if(c!==undefined) return c; }
  const ceny=poolPreSlot(slot).map(r=>vyzivaReceptu(r).cena||0).filter(c=>c>0).sort((a,b)=>a-b);
  const v=ceny.length?ceny[ceny.length>>1]:0;
  if(_genCache)_genCache.med.set(slot,v);
  return v; }
function vahaReceptu(r,slot){
  const kl=_genCache?(slot+"|"+r.id):null;
  if(kl!==null){ const c=_genCache.vaha.get(kl); if(c!==undefined) return c; }
  const w=_vahaVypocet(r,slot);
  if(kl!==null)_genCache.vaha.set(kl,w);
  return w; }
function _vahaVypocet(r,slot){ let w=1+(S.hodn[r.id]||0); if(jeSezonne(r))w+=0.8; if(jeVakcii(r))w+=1.2; if(jeWatch(r))w+=1.0; w+=expBoost(r);
  // pri malom jedle (snack) je bielkovinový bonus miernejší — inak sa z 351 snackov točí 16 tvarohových
  // K2: váha je už len PREDVÝBER do turnaja, kvalitu rozhoduje skoreJedla. Preto je bielkovinový
  // multiplikátor plochší než predtým (0,4–2,0 → 0,7–1,6): ostrý multiplikátor + turnaj by z 743
  // hlavných chodov točil tú istú tridsiatku a využitie databázy by kleslo.
  // P5: v snackovom slote sa hustota berie z CELEJ dvojice (výrobok + doplnok), nie z prvej
  // položky — inak má „jablko" váhu 0,88 a „skyr" 1,35, hoci „jablko + šunka" je rovnako
  // bielkovinové ako skyr, a čerstvé ovocie sa do turnaja prakticky nedostane.
  w*= (slot==="Snack") ? (0.85+Math.min(0.5,snackHustotaB(r)/16)) : (0.7+Math.min(0.9,bielkovinyNa100(r)/12));
  // A5: „kupované" je preferencia, nie podmienka (tvrdý filter zúžil pool snackov z 351 na 36)
  if(slot==="Snack" && S.profil.kupSnack && (r.tagy||[]).includes("kupované")) w*=2;
  // P5: čerstvé ovocie má v snackovom slote prirážku. Nie je to kozmetika — jablko je
  // archetypálna desiata, ale v turnaji prehráva s proteínovým pudingom na hustote bielkovín
  // aj po tom, čo sa hustota počíta z dvojice. Bez prirážky vyšlo čerstvé ovocie na 14 %
  // snackov, s ňou na cieľových 15+ %.
  if(slot==="Snack" && snackDruh(r)==="ovocie") w*=1.35;
  // R3: cena je v predvýbere len JEMNÝ multiplikátor (0,7–1,3), rovnako plochý ako bielkovinový.
  // Zámerne je zhora zastropovaný: keby lacné jedlo dostávalo neobmedzený bonus, turnaj by sa
  // naplnil zemiakmi a cestovinami a pestrosť by spadla. Drahé jedlo sa NEVYRAĎUJE — len má
  // menšiu šancu dostať sa do turnaja.
  const ref=cenaRef();
  if(ref>0){ const c100=cenaNa100(r); w*= (c100>0)?(0.7+Math.min(0.6,0.6*ref/c100)):1.3; }
  return Math.max(0.02,w); }
// K2: výber je TURNAJ. Z poolu sa navzorkuje GEN_SK.turnaj kandidátov podľa preferenčnej váhy
// (hodnotenie, sezóna, akcie, expirácie, história) a vyhrá ten s najlepším skóre jedla.
// Preferencie tak rozhodujú, KTO sa do turnaja dostane; kvalita rozhoduje, KTO vyhrá.
// Predtým sa bralo prvé losovanie z okna so 700 kandidátmi, takže medián vyšiel na medián poolu
// (5,3 g bielkovín/100 kcal) bez ohľadu na to, že v tom istom okne bolo 117 receptov nad 8.
// bez cielK (regenerujSlot) sa správa presne ako pôvodné jedno losovanie.
// R4: `cena` je váha CENOVEJ POKUTY v skóre. Je nižšia než bielkoviny (1,15) aj kcal (1,0) —
// cena je ďalšie kritérium, nie hlavné. Pokuta sa počíta LEN nad rozpočtom slotu (lacnejšie
// jedlo nedostáva bonus), takže skóre netlačí týždeň k najlacnejšiemu možnému jedlu.
const GEN_SK={turnaj:24, b:1.15, kcal:1.0, vl:0.7, vlCiel:2.0, vlSilne:2.0, vlCielSilne:3.0, cena:0.9, cenaMax:1.0};
// mäkký strop: jedlo drahšie než CENA_LUX × rozpočet slotu sa z poolu vyradí, ale len ak
// v poole zostane aspoň MIN_POOL kandidátov. Toto je hlavná brzda na krevety/lososa/morského čerta.
const CENA_LUX=3.0;
// K14: vláknina má dva režimy. V bežnom výbere je len jemná preferencia (0,62) — silná váha
// súťaží s bielkovinami a kcal a zhoršila oba. Vlastný vlákninový prechod si ju na chvíľu
// zosilní; jeho výmeny sú aj tak zovreté tak, že bielkoviny ani kcal zhoršiť nesmú.
let _vlakninaRezim=false;
function skoreJedla(r,slot,cielK,rot,cielC){
  const v=jedloVyziva(r,slot,rot);
  const wv=_vlakninaRezim?GEN_SK.vlSilne:GEN_SK.vl, cv=_vlakninaRezim?GEN_SK.vlCielSilne:GEN_SK.vlCiel;
  // vláknina sa počíta ako HUSTOTA (g/100 kcal), nie absolútne gramy. S absolútnymi gramami
  // nemohol 145 kcal snack nikdy získať vlákninový bod a skóre ho tlačilo hore — snack potom
  // prerástol raňajky a padalo pravidlo poradia R > S.
  const vlD=v.k>5?v.vl/(v.k/100):0;
  let s=GEN_SK.b*Math.min(1.25,v.d/HS_HI) + wv*Math.min(1,vlD/cv);
  if(cielK>0 && v.k>0) s+=GEN_SK.kcal*(1-Math.min(1,Math.abs(v.k-cielK)/cielK));
  // R4: cena je POKUTA nad rozpočtom, nie bonus pod ním. Kritérium výživy tak nemôže prehrať
  // s cenou pri dvoch rovnako drahých jedlách a lacné jedlo si skóre nekupuje samotnou lacnosťou.
  if(cielC>0 && v.c>0) s-=GEN_SK.cena*Math.min(GEN_SK.cenaMax,Math.max(0,(v.c-cielC)/cielC));
  return s; }
function vyberVazene(pool,pouzite,slot,cielK,rot,cielC){
  let cand=pool.filter(r=>!pouzite.has(r.id)); if(!cand.length)cand=pool.slice(); if(!cand.length)return null;
  // kumulatívne váhy + binárne hľadanie: turnaj losuje 9×, lineárny prechod cez 700 kandidátov
  // by celé generovanie spomalil viac než 2×
  const kum=new Array(cand.length); let sum=0;
  for(let i=0;i<cand.length;i++){ sum+=vahaReceptu(cand[i],slot); kum[i]=sum; }
  const los=()=>{ const x=Math.random()*sum; let lo=0,hi=cand.length-1;
    while(lo<hi){ const m=(lo+hi)>>1; if(kum[m]<x)lo=m+1; else hi=m; } return cand[lo]; };
  if(!(cielK>0)) return los();
  let naj=null,najS=-1;
  for(let i=0;i<GEN_SK.turnaj;i++){ const r=los(); const sc=skoreJedla(r,slot,cielK,rot,cielC);
    if(sc>najS){ najS=sc; naj=r; } }
  return naj;
}
// ── A1: kcal-okná na slot ─────────────────────────────────────────────────────
// Cieľ dňa sa rozdelí medzi jedlá podľa podielov; z toho vzniká okno, v ktorom sa recept vôbec hľadá.
// Predtým sa cieľ trafil až dodatočným natiahnutím porcií (faktor 0,55–1,95×).
// K10: podiel presunutý z raňajok na obed/večeru. Pool raňajok má medián 3,3 g bielkovín
// na 100 kcal a len 16 receptov nad 8; obed/večera majú 5,3 a 126 receptov nad 8. Kalória
// presunutá z raňajok na obed nesie skoro dvojnásobok bielkovín. Poradie O > V > R > S drží.
const SLOT_PODIEL={"Raňajky":0.22,"Desiata":0.10,"Obed":0.37,"Olovrant":0.10,"Večera":0.31,"Snack":0.10};
const OKNO_DOLE=0.6, OKNO_HORE=1.45, MIN_POOL=8, MIN_KCAL_HLAVNY=300;
function cielSlotu(slot,sloty,ciel){
  const suma=(sloty||[]).reduce((a,s)=>a+(SLOT_PODIEL[s]||0.1),0)||1;
  return ciel*(SLOT_PODIEL[slot]||0.1)/suma; }
// zúž pool na recepty okolo cieľovej kcal; okno rozširuj, kým nemáš aspoň MIN_POOL kandidátov
function poolVOkne(pool,cielK,dole,hore,kcalFn){
  if(!(cielK>0)||!pool.length) return pool;
  const kf=kcalFn||kcalPorcia;
  let d=dole||OKNO_DOLE, h=hore||OKNO_HORE;
  for(let i=0;i<8;i++){
    const p=pool.filter(r=>{ const k=kf(r); return k>=cielK*d && k<=cielK*h; });
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
// K5: pamäť 4 → 10 týždňov. Pool hlavných chodov má 743 receptov, 10 týždňov blokuje ~60 —
// stále zostáva z čoho vyberať a využitie databázy stúpne. Cieľ dňa na vlákninu (g) je tu tiež,
// škáluje sa počtom slotov (4 jedlá = plný cieľ).
// S4: pamäť snackov 34 → 14 týždňov. 34 týždňov dávalo zmysel, kým bolo v poole 177 varených
// snackov (+ dezerty a nátierky). Katalóg je dnes 90 kúpených výrobkov a 34 týždňov × 3 bloky
// zablokovalo väčšinu regálu — generátor potom nebral najlepšie balenie, ale to, čo zostalo
// (medián bielkovín dňa klesol a vracal sa chvost dní pod 80 g). Kúpený jogurt sa navyše
// v reálnom nákupe pokojne opakuje — na rozdiel od upečeného koláča.
const TYZDNE_PAMATE=22, TYZDNE_PAMATE_SNACK=14, VLAKNINA_CIEL=22, KCAL_PASMO=0.09;
const PAMAT_STUPNE=[1,0.3,0.09]; // násobky TYZDNE_PAMATE: dlhá → stredná → minimálna (~2 týždne)
function nedavneRecepty(tyzdnov){
  const set=new Set(S.uvarene.slice(0,4).map(u=>u.id));
  const pridaj=v=>(Array.isArray(v)?v:[v]).forEach(id=>{ if(typeof id!=="string")return;
    set.add(id.indexOf("left:")===0?id.slice(5):id); });
  for(let di=-(tyzdnov||TYZDNE_PAMATE)*7;di<0;di++){ const d=S.plan[pridajDni(S.viewOd,di)]; if(d) Object.values(d).forEach(pridaj); }
  const a0=(S.archiv||[])[0]; if(a0&&a0.plan) Object.values(a0.plan).forEach(d=>Object.values(d||{}).forEach(pridaj));
  return set;
}
// jeden výber do slotu; ctx nesie filtre a pamäť bloku. cielK = stred kcal-okna.
// K11: pamäť je STUPŇOVITÁ a uplatní sa AŽ ZA tvrdými pravidlami slotu.
// Predtým sa dlhá pamäť aplikovala ako prvá, na celý pool. Sendvičových raňajok je len 48,
// takže pamäť dlhšia než ~8 týždňov ich vyprázdnila a pravidlo „vo všedný blok sendvič"
// potichu vypadlo (`if(ps.length)` ho preskočí). Preto sa najprv zúži pool podľa pravidiel
// a až potom sa berie najprísnejšia úroveň pamäte, ktorá ešte nechá aspoň MIN_POOL kandidátov.
// Prah je PODIEL poolu, nie pevné číslo: 8 kandidátov je dosť na to, aby výber niečo vrátil,
// ale primálo na to, aby v nich bolo kcal-okno aj slušná hustota bielkovín. Preto sa dlhá pamäť
// prijme len vtedy, keď v poole nechá aspoň 40 % receptov, inak sa spadne o stupeň nižšie.
// P5: v snackovom slote je prah nižší (0,25 namiesto 0,4). Pool snacku má dnes ~190 výrobkov
// a berie sa 7× do týždňa, takže 0,4 zastropovalo pamäť na ~9 týždňov — a snack, ktorý sa
// smie vrátiť po deviatich týždňoch, vyjde na 30-týždňovom horizonte trikrát. Pool zostáva
// aj po 0,25 dosť veľký (~47 výrobkov) na kcal-okno aj na bielkovinový prah.
function _uplatniPamat(pool,pamat,podiel){
  if(!pamat||!pamat.length) return pool;
  const dost=Math.max(MIN_POOL,Math.ceil(pool.length*(podiel||0.4)));
  for(let i=0;i<pamat.length;i++){ const p=pool.filter(r=>!pamat[i].has(r.id)); if(p.length>=dost) return p; }
  for(let i=pamat.length-1;i>=0;i--){ const p=pool.filter(r=>!pamat[i].has(r.id)); if(p.length) return p; }
  return null; }
// D1: doménové pravidlo raňajok na jednom mieste — aby sa dalo uplatniť aj na zálohu `sirsi`.
// Poradie je zámerné: najprv sendvič (vo všedný blok), potom iná báza než mali predošlé bloky.
// Ak by po báze nezostalo nič, pravidlo bázy sa skúsi ešte raz na CELOM poole (bez sendviča) —
// „iná báza/blok" je pre pestrosť dôležitejšie než „sendvič", lebo sendvičových raňajok je 48.
function _pravidlaRanajok(pool,ctx){
  let p=pool;
  if(ctx.vsednyBlok){ const ps=p.filter(r=>jeSendvic(r)); if(ps.length)p=ps; }
  const pb=p.filter(r=>!ctx.pouziteBazy.has(ranajkyBaza(r)));
  if(pb.length) return pb;
  const pb2=pool.filter(r=>!ctx.pouziteBazy.has(ranajkyBaza(r)));
  return pb2.length?pb2:p; }
// P5: stavba poolu je oddelená od losovania, aby si per-denný výber snacku vedel pool
// vypýtať raz a prechádzať ho BEZ VRÁTENIA — turnaj volaný n-krát vracia stále tých istých
// pár favoritov, takže 52 % dní zostalo s tým istým snackom ako prvý deň bloku.
function vyberDoSlotu(slot,ctx,cielK,minB100,medze,okrem){
  const pool=_poolVyberu(slot,ctx,cielK,minB100,medze,okrem);
  return vyberVazene(pool,ctx.pouzite,slot,cielK,ctx.prilRot,_cenaVypnuta?0:cenaSlotu(ctx,cielK,slot));
}
function _poolVyberu(slot,ctx,cielK,minB100,medze,okrem){
  const pamat=(slot==="Snack"||slot==="Desiata"||slot==="Olovrant")?ctx.nedavneSnack:ctx.nedavne;
  let pool=poolPreSlot(slot);
  // A3: hlavný chod pod 300 kcal je večera za 28 kcal (Kórejský uhorkový šalát), nie jedlo
  if(jeHlavnyChodSlot(slot)){ const p=pool.filter(r=>kcalPorcia(r)>=MIN_KCAL_HLAVNY); if(p.length>=MIN_POOL)pool=p; }
  if(ctx.kf && slot!=="Raňajky"){ const pk=pool.filter(r=>(r.kuchyna||"").toLowerCase()===ctx.kf.toLowerCase()); if(pk.length)pool=pk; }
  if(ctx.pr&&ctx.pr.veg){ const pv=pool.filter(r=>diety(r).veg); if(pv.length)pool=pv; }
  if(ctx.pr&&ctx.pr.maxCas>0){ const pc=pool.filter(r=>casMin(r)<=ctx.pr.maxCas); if(pc.length)pool=pc; }
  // D1: záloha pre pamäť. Uvoľniť sa smie len VOLITEĽNÉ zúženie (kuchyňa dňa, mäso za sebou) —
  // doménové pravidlo raňajok (sendvič vo všedný blok + iná báza/blok) platí aj na zálohe,
  // inak si pamäť cez `_uplatniPamat(sirsi,…)` prepašuje tú istú bázu do druhého bloku.
  const pred=pool; // záloha PRED voliteľným zúžením; doménové pravidlá sa na ňu dopočítajú lenivo
  const sirsi=()=>(slot==="Raňajky")?_pravidlaRanajok(pred,ctx):pred;
  if(ctx.cfg.neMasoZaSebou && jeHlavnyChodSlot(slot) && ctx.prevBlokMaso.size){ const pm=pool.filter(r=>{const mt=masoTyp(r); return !mt||!ctx.prevBlokMaso.has(mt);}); if(pm.length)pool=pm; }
  if(slot==="Raňajky"){ pool=_pravidlaRanajok(pool,ctx); }
  else { const zak=_kuchyneBloku(ctx,slot);
    const p2=pool.filter(r=>!r.kuchyna||!zak.has(r.kuchyna)); if(p2.length)pool=p2; }
  // P5: pestrosť snackov v rámci týždňa sa neriadi kuchyňou (výrobky žiadnu nemajú), ale
  // DRUHOM — regálom, z ktorého výrobok je. Bez toho vyšla polovica týždňa z jedného regálu
  // (namerané: 21 % snackov holé pečivo, 2,5 % čerstvé ovocie). Filter je mäkký: uplatní sa,
  // len ak po ňom zostane aspoň MIN_POOL kandidátov.
  if(jeSnackSlot(slot) && ctx.snackDruhy && ctx.snackDruhy.size){
    for(const strop of SNACK_DRUH_STROPY){
      const pd=pool.filter(r=>(ctx.snackDruhy.get(snackDruh(r))||0)<strop);
      if(pd.length>=MIN_POOL){ pool=pd; break; } } }
  // R9: ctx.bezPamate je posledná inštancia poistky poradia — zopakovať raňajky spred 22 týždňov
  // je menšie zlo než nechať raňajky väčšie ako obed.
  const podielPam=jeSnackSlot(slot)?0.35:0.4;
  if(!(ctx.bezPamate)) pool=_uplatniPamat(pool,pamat,podielPam)||_uplatniPamat(sirsi(),pamat,podielPam)||pool;
  const jk=r=>jedloKcal(r,slot,ctx.prilRot);
  if(medze&&(medze.min>0||medze.max>0)){
    const pm=pool.filter(r=>{ const k=jk(r);
      return (!(medze.min>0)||k>=medze.min) && (!(medze.max>0)||k<=medze.max); });
    // R9: `medze.tvrde` = medze poradia sa uplatnia, aj keď v poole nechajú menej než MIN_POOL
    // kandidátov. Mäkká verzia (>=MIN_POOL) je pre bežné prechody správna, ale poistke poradia
    // brala jediný nástroj: pri všedných sendvičových raňajkách zostávalo pod hranicou večere
    // menej než 8 receptov, filter sa zahodil a výber vrátil raňajky ešte väčšie než večera.
    if(pm.length>=(medze.tvrde?1:MIN_POOL))pool=pm; }
  if(minB100>0){ const pb=pool.filter(r=>jedloVyziva(r,slot,ctx.prilRot).d>=minB100); if(pb.length>=3)pool=pb; }
  pool=poolVOkne(pool,cielK,0,0,jk);
  // R5: mäkký strop na luxus. Uplatní sa AŽ ZA kcal-oknom a bielkovinovým prahom, takže výživa
  // rozhoduje prvá; a len ak po ňom zostane aspoň MIN_POOL kandidátov — inak by úzky pool
  // (48 sendvičových raňajok) rozpočet vyprázdnil a pravidlo slotu by ticho vypadlo.
  if(okrem){ const p=pool.filter(r=>r.id!==okrem); if(p.length)pool=p; }
  return pool;
}
// rozpočet jedla = referenčná cena za 100 kcal × kcal-cieľ slotu. ctx.cenaRef nesie korekciu
// bloku (viď R7); mimo generovania (regenerujSlot) sa berie čistý cieľ z profilu.
// R8: VÝŽIVA VYHRÁVA. Rozpočet sa vypína počas výživových opravných prechodov (opravDen,
// zlepsiBielkoviny, zlepsiVlakninu) — inak výmena, ktorá má dňu doplniť bielkoviny, súťaží
// s cenovou pokutou a nenájde, čo hľadá. Namerané: pri cene zapnutej vo všetkých prechodoch
// bolo 8,6 % dní pod 80 g bielkovín, po vypnutí 0 %. Cena teda vstupuje len do PRVÉHO výberu
// a do vlastného prechodu zlacniDen, ktorý má výživu zovretú ako tvrdú podmienku.
let _cenaVypnuta=false;
function bezRozpoctu(fn){ const p=_cenaVypnuta; _cenaVypnuta=true; try{ return fn(); } finally { _cenaVypnuta=p; } }
function sRozpoctom(fn){ const p=_cenaVypnuta; _cenaVypnuta=false; try{ return fn(); } finally { _cenaVypnuta=p; } }
// D2c: SKÚŠANÉ A ZAMIETNUTÉ — dať snacku realistický rozpočet (median ceny porcie) namiesto
// jeho 10 % podielu na dni. Znie to správne (dnes dostane plnú cenovú pokutu každý výrobok
// nad 0,84 €, čiže všetky bielkovinové), ale namerané je to horšie: dní pod 80 g bielkovín
// 1,6 → 3,2 %, poradie 100 → 99,4 %, cena len 170,5 → 168,4 €/týždeň. Slabá, ale rovnomerná
// pokuta funguje lepšie než ostrá pokuta na drahej polovici poolu. Cena zostáva na podiele.
function cenaSlotu(ctx,cielK,slot){ if(!(cielK>0)) return 0;
  const ref=(ctx&&ctx.cenaRef!=null)?ctx.cenaRef:cenaRef();
  return ref>0?ref*cielK/100:0; }
// zloží komponenty slotu (hlavné jedlo + príloha) a zapíše si do ctx, čo už bolo použité
// K12: stopa slotu sa PREPISUJE, nepribúda. Predtým každá výmena pridala ďalšiu kuchyňu do
// ctx.dayKuchyne a ďalšiu raňajkovú bázu do ctx.pouziteBazy, hoci pôvodné jedlo už v bloku
// nebolo. Filter „v jednom dni nie dvakrát tá istá kuchyňa" tak po dvoch desiatkach opravných
// výmen zrezal pool obeda zo 743 na 4 recepty — a s ním kvalitu aj rozmanitosť.
function _kuchyneBloku(ctx,okremSlot){ const z=new Set();
  for(const s in ctx.stopa){ if(s===okremSlot)continue; const k=ctx.stopa[s].kuchyna; if(k)z.add(k); }
  return z; }
function _stopaPre(r,slot){ return {kuchyna:r.kuchyna||"", baza:(slot==="Raňajky")?ranajkyBaza(r):"",
                   maso:(jeHlavnyChodSlot(slot)?masoTyp(r):"")||""}; }
// D1 (R6): VRÁTENIE SLOTU MUSÍ VRÁTIŤ AJ `ctx.stopa`. Toto bola skutočná príčina R6.
// `prehodSlot` zapíše stopu cez `zlozSlot` hneď pri výmene, ale štyri prechody dňa
// (`skusPrehod`, `zlepsiBielkoviny`, `zlepsiVlakninu`, `zlacniDen`) zamietnutú výmenu vracali
// len v `denPlan` + `ctx.pouzite`. V stope tak zostala báza receptu, ktorý v bloku NIE JE —
// a keďže sa hotová stopa na konci bloku sype do týždňovej `pouziteBazy`, blok A si zaregistroval
// napr. „bageta", hoci reálne podával toast. Blok B potom vylúčil bagetu, vybral toast a
// pravidlo „iná báza/blok" padlo. (Namerané: 4 z 12 týždňov.)
// P5: snack má dva REÁLNE komponenty, takže sa z „použitých" musia uvoľniť (a zabrať) oba —
// inak by v `ctx.pouzite` zostal doplnok zamietnutej výmeny a blok C by prišiel o jogurt,
// ktorý reálne nikde nie je.
function _uvolniKomp(comp,ctx){ (comp||[]).forEach(id=>{ if(typeof id==="string"&&id.indexOf("prf:")!==0)ctx.pouzite.delete(id); }); }
function _zaberKomp(comp,ctx){ (comp||[]).forEach(id=>{ if(typeof id==="string"&&id.indexOf("prf:")!==0)ctx.pouzite.add(id); }); }
function vratSlot(denPlan,slot,ctx,zaloha){
  const teraz=denPlan[slot]&&denPlan[slot][0]; if(teraz)ctx.pouzite.delete(teraz);
  if(jeSnackSlot(slot))_uvolniKomp(denPlan[slot],ctx);
  const stary=zaloha&&zaloha[0];
  if(zaloha){ denPlan[slot]=zaloha; if(stary)ctx.pouzite.add(stary); if(jeSnackSlot(slot))_zaberKomp(zaloha,ctx);
    const r0=komponent(stary); if(r0)ctx.stopa[slot]=_stopaPre(r0,slot); else delete ctx.stopa[slot]; }
  else { delete denPlan[slot]; delete ctx.stopa[slot]; }
}
function zlozSlot(r,slot,ctx){
  ctx.pouzite.add(r.id);
  ctx.stopa[slot]=_stopaPre(r,slot);
  const comp=[r.id];
  if(jeHlavnyChodSlot(slot)){ const pr=prilohaPre(r,ctx.prilRot++); if(pr)comp.push(pr); }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") comp.push("prf:pecivo");
  // P5: doplnok snacku je REÁLNY výrobok (nie virtuálny `prf:` token), takže má vlastnú
  // kartu receptu, vlastnú cenu a vlastný riadok v nákupe. Zapisuje sa aj do `ctx.pouzite`,
  // aby sa ten istý jogurt neobjavil v inom bloku ešte raz ako samostatný snack.
  if(jeSnackSlot(slot)){ const dp=snackDoplnokPre(r,ctx,slot); if(dp){ comp.push(dp); ctx.pouzite.add(dp); } }
  return comp;
}
// A1/A2/A3: namiesto naťahovania porcií prehoď jedlo. potrebaK = koľko kcal má slot mať.
function prehodSlot(denPlan,slot,ctx,potrebaK,minB100,medze){
  const stary=denPlan[slot]&&denPlan[slot][0];
  const zalohaK=denPlan[slot]?denPlan[slot].slice():null;
  if(stary)ctx.pouzite.delete(stary);
  if(jeSnackSlot(slot))_uvolniKomp(zalohaK,ctx);
  // K18: doterajší recept sa z výberu vylúči. Predtým sa len uvoľnil z „použitých", turnaj ho
  // ako najlepší v okne vrátil znova a prehodSlot ohlásil neúspech — opravDen sa potom vzdal
  // s dňom o 300 kcal vedľa. Týkalo sa to práve blokov s úzkym poolom (všedné raňajky = 48
  // sendvičov), kde je opakovaná voľba najpravdepodobnejšia.
  const r=vyberDoSlotu(slot,ctx,potrebaK,minB100,medze,stary);
  if(!r || r.id===stary){ if(stary)ctx.pouzite.add(stary); if(jeSnackSlot(slot))_zaberKomp(zalohaK,ctx); return false; }
  denPlan[slot]=zlozSlot(r,slot,ctx);
  return true;
}
// K18b: výmena „na skúšku". prehodSlot odteraz vylučuje doterajší recept, takže vždy niečo vráti;
// bez kontroly by opravDen prijal aj výmenu, ktorá deň zhoršila. Zmena sa preto ponechá len vtedy,
// keď kritérium `lepsie()` naozaj pokleslo — inak sa slot vráti do pôvodného stavu.
function skusPrehod(denPlan,slot,ctx,potrebaK,minB100,medze,lepsie){
  const zaloha=denPlan[slot]?denPlan[slot].slice():null, stary=zaloha&&zaloha[0];
  if(!prehodSlot(denPlan,slot,ctx,potrebaK,minB100,medze)) return false;
  if(!lepsie||lepsie()) return true;
  vratSlot(denPlan,slot,ctx,zaloha);
  return false; }
const PORADIE_SLOTOV=["Obed","Večera","Raňajky","Desiata","Olovrant","Snack"]; // od najväčšieho jedla po najmenšie
function denKcal(denPlan,sloty){ let dk=0; sloty.forEach(s=>{ if(denPlan[s])dk+=mealKcal(denPlan[s]); }); return dk; }
function denBielkoviny(denPlan,sloty){ let b=0; sloty.forEach(s=>(denPlan[s]||[]).forEach(id=>{ const k=komponent(id); if(k)b+=vyzivaReceptu(k).b; })); return b; }
// K17: bielkoviny aj vláknina sa merajú AŽ PO škálovaní. Deň sa na záver vynásobí faktorom
// ciel/dk (zovretým na 0,85–1,15), takže 100 g bielkovín v 1700 kcal dni je po zmenšení porcií
// reálne 85 g. Hill-climb preto cieli na hodnoty prepočítané faktorom — inak vyhlásil za hotový
// deň, ktorý po škálovaní spadol pod 80 g, a zároveň uprednostňoval objemné jedlá pred hustými.
function denFaktor(denPlan,sloty,ciel){ const dk=denKcal(denPlan,sloty);
  return (ciel>0&&dk>0)?Math.max(FAKTOR_MIN,Math.min(FAKTOR_MAX,ciel/dk)):1; }
function denBielkovinyPoSkal(denPlan,sloty,ciel){ return denBielkoviny(denPlan,sloty)*denFaktor(denPlan,sloty,ciel); }
function denVlakninaPoSkal(denPlan,sloty,ciel){ return denVlaknina(denPlan,sloty)*denFaktor(denPlan,sloty,ciel); }
function denVlaknina(denPlan,sloty){ let v=0; sloty.forEach(s=>(denPlan[s]||[]).forEach(id=>{ const k=komponent(id); if(k)v+=vyzivaReceptu(k).vl||0; })); return v; }
// R6: cena dňa na jedného stravníka, meraná AŽ PO škálovaní — rovnako ako bielkoviny (K17).
// Deň sa nakoniec vynásobí faktorom 0,85–1,15, takže 5 € v 1700 kcal dni je po zmenšení porcií
// reálne 4,25 €. Bez toho by sa rozpočet porovnával s číslom, ktoré domácnosť nikdy nezaplatí.
function denCena(denPlan,sloty){ let c=0; sloty.forEach(s=>(denPlan[s]||[]).forEach(id=>{ const k=komponent(id); if(k)c+=vyzivaReceptu(k).cena||0; })); return c; }
function denCenaPoSkal(denPlan,sloty,ciel){ return denCena(denPlan,sloty)*denFaktor(denPlan,sloty,ciel); }
// K15: Obed ≥ Večera je TVRDÉ doménové pravidlo, nie štatistika. Prehodenie obeda a večere nič
// nestojí (majú rovnaké kategórie), takže sa robí bezpodmienečne — na začiatku každej iterácie
// opravDen aj na úplnom konci dňa. Predtým sedelo len v kroku (b), kam sa opravDen pri
// nedoladených kcal vôbec nedostal, a 1,4 % blokov skončilo s väčšou večerou než obedom.
function zarovnajObedVeceru(denPlan,ctx){
  if(!(denPlan.Obed&&denPlan.Obed.length&&denPlan.Večera&&denPlan.Večera.length)) return false;
  if(mealKcal(denPlan.Večera)<=mealKcal(denPlan.Obed)) return false;
  const t=denPlan.Obed; denPlan.Obed=denPlan.Večera; denPlan.Večera=t;
  if(ctx&&ctx.stopa){ const st=ctx.stopa.Obed; ctx.stopa.Obed=ctx.stopa.Večera; ctx.stopa.Večera=st;
    if(ctx.stopa.Obed===undefined)delete ctx.stopa.Obed; if(ctx.stopa.Večera===undefined)delete ctx.stopa.Večera; }
  return true; }
// K16: kcal-medze slotu vyplývajúce z poradia jedál. Výmena slotu sa predtým hľadala len okolo
// cieľovej kcal, a okno poolVOkne siaha do 1,45×, takže „zmenši raňajky pod večeru" vrátilo
// raňajky ešte väčšie než večera. Tieto medze dostane výber ako mäkký filter, takže krok, ktorý
// mal poradie opraviť, ho už nemôže znova pokaziť.
function medzePoradia(napln,slot,kcal,tvrde){
  const por=PORADIE_SLOTOV.filter(s=>napln.indexOf(s)>=0&&kcal[s]!=null);
  const i=por.indexOf(slot); if(i<0) return null;
  const m={min:0,max:0};
  // Obed ≥ Večera pripúšťa rovnosť, ostatné dvojice musia byť ostro zoradené
  if(i>0){ const v=kcal[por[i-1]]; if(v>0) m.max=v*((por[i-1]==="Obed"&&slot==="Večera")?1:0.96); }
  if(i<por.length-1){ const v=kcal[por[i+1]]; if(v>0) m.min=v*1.04; }
  // R9: medze poradia sú TVRDÝ filter. Mäkká verzia (uplatní sa len ak zostane MIN_POOL kandidátov)
  // dovolila bielkovinovému aj vlákninovému prechodu vyrobiť raňajky väčšie než obed a poistka
  // poradia to potom už nevedela vrátiť — sendvičových raňajok pod hranicou večere je málo.
  // Prevencia je tu lacnejšia než oprava.
  // R9: medze poradia vedia byť TVRDÝ filter (uplatnia sa aj pri poole menšom než MIN_POOL).
  // Zapínajú si ho prechody typu „zlepši X a nič nepokaz" (bielkoviny, vláknina, cena, poradie) —
  // mäkká verzia im dovolila vyrobiť raňajky väčšie než obed a poistka poradia to už nevedela
  // vrátiť, lebo sendvičových raňajok pod hranicou večere je málo. Krok (a) opravDen (dorovnanie
  // kalórií) si naopak necháva mäkkú verziu, inak by nemal z čoho vyberať.
  if(tvrde)m.tvrde=true;
  return (m.min>0||m.max>0)?m:null; }
function poradiePorusenia(denPlan,sloty){
  const kc={}; sloty.forEach(s=>{ if(denPlan[s]&&denPlan[s].length)kc[s]=mealKcal(denPlan[s]); });
  const por=PORADIE_SLOTOV.filter(s=>kc[s]!=null); let n=0;
  for(let i=1;i<por.length;i++) if(kc[por[i]]>=kc[por[i-1]]) n++;
  return n; }
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
// K3: hill-climb s viacerými pokusmi na slot. Dve opravy oproti pôvodnej verzii:
//  (a) hustota sa meria na CELOM slote (jedlo + príloha), nie na hlavnom chode — príloha
//      je 200 kcal takmer bez bielkovín a práve ona rozhoduje, ktorý slot treba vymeniť;
//  (b) výmena sa prijme len vtedy, keď deň neodíde od kcal-cieľa. Predtým stačilo, že deň
//      ostal v pásme faktora (±15 %), takže každá bielkovinová výmena deň o kus nafúkla
//      a séria výmen ho spoľahlivo dotlačila na strop — faktor potom visel na 0,85–0,9.
// R8: výživové prechody bežia BEZ rozpočtu — cena im nesmie brať kandidátov (viď cenaSlotu)
function zlepsiBielkoviny(denPlan,sloty,ctx,ciel){ return bezRozpoctu(()=>_zlepsiBielkoviny(denPlan,sloty,ctx,ciel)); }
function _zlepsiBielkoviny(denPlan,sloty,ctx,ciel){
  const cielB=(cieloveMakra(ciel)||{}).b||0; if(!cielB) return;
  const pokusy={}; const MAX_POKUS=8;
  const odchylka=()=>Math.abs(denKcal(denPlan,sloty)-ciel);
  for(let i=0;i<40;i++){
    const b=denBielkovinyPoSkal(denPlan,sloty,ciel); if(b>=cielB) return;
    const d0=odchylka(), strop=Math.max(ciel*0.06,d0);
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length&&(pokusy[s]||0)<MAX_POKUS);
    // vyber slot s najväčším POTENCIÁLOM zisku (kcal × koľko bielkovín mu chýba do HS_HI),
    // nie ten s najhorším pomerom — inak sa vymieňa stále ten istý 145 kcal snack
    let naj=null,najB=0,najZisk=0;
    napln.forEach(s=>{ if(!denPlan[s].length)return;
      const x=slotHustota(denPlan[s]), zisk=mealKcal(denPlan[s])*Math.max(0,HS_HI-x)/100;
      if(zisk>najZisk){ najZisk=zisk; najB=x; naj=s; } });
    if(!naj) return;
    pokusy[naj]=(pokusy[naj]||0)+1;
    const zaloha=denPlan[naj].slice(), stary=zaloha[0];
    const kc={}; napln.forEach(s=>{ kc[s]=mealKcal(denPlan[s]); });
    if(!prehodSlot(denPlan,naj,ctx,mealKcal(zaloha),najB+1,medzePoradia(napln,naj,kc))) continue;
    if(denJeOk(denPlan,sloty,ciel) && denBielkovinyPoSkal(denPlan,sloty,ciel)>b && odchylka()<=strop) continue;
    vratSlot(denPlan,naj,ctx,zaloha); // späť (vrátane ctx.stopa — viď D1)
  } }
// K4: keď je deň už bielkovinovo v pláne, doladí sa vláknina — rovnaká mechanika, ale
// výmena musí nechať bielkoviny aj kcal tam, kde boli. Preto vláknina nemôže nič zhoršiť.
function zlepsiVlakninu(denPlan,sloty,ctx,ciel,cielVl){
  if(!(cielVl>0)) return;
  _vlakninaRezim=true; try{ bezRozpoctu(()=>_zlepsiVlakninu(denPlan,sloty,ctx,ciel,cielVl)); } finally { _vlakninaRezim=false; } }
function _zlepsiVlakninu(denPlan,sloty,ctx,ciel,cielVl){
  // D3: bielkoviny NAD denným cieľom sú voľná kapacita, ktorú smie vláknina minúť. Predtým
  // nesmela výmena zhoršiť bielkoviny o viac než 1 g bez ohľadu na to, či deň má 95 alebo 125 g —
  // po zvýšení bielkovín (D1/D2) tak vláknina stratila skoro každého kandidáta. Podlaha je denný
  // cieľ bielkovín; pod ním platí pôvodné „nesmie klesnúť" a vláknina znova ustúpi.
  const cielB=(cieloveMakra(ciel)||{}).b||0;
  const pokusy={}; const MAX_POKUS=3;
  const odchylka=()=>Math.abs(denKcal(denPlan,sloty)-ciel);
  for(let i=0;i<18;i++){
    const vl=denVlakninaPoSkal(denPlan,sloty,ciel); if(vl>=cielVl) return;
    const b0=denBielkovinyPoSkal(denPlan,sloty,ciel), d0=odchylka(), strop=Math.max(ciel*0.06,d0);
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length&&(pokusy[s]||0)<MAX_POKUS);
    let naj=null,najVl=1e9;
    napln.forEach(s=>{ let v=0; denPlan[s].forEach(id=>{ const c=komponent(id); if(c)v+=vyzivaReceptu(c).vl||0; });
      if(v<najVl){ najVl=v; naj=s; } });
    if(!naj) return;
    pokusy[naj]=(pokusy[naj]||0)+1;
    const zaloha=denPlan[naj].slice(), stary=zaloha[0];
    const kc={}; napln.forEach(s=>{ kc[s]=mealKcal(denPlan[s]); });
    if(!prehodSlot(denPlan,naj,ctx,mealKcal(zaloha),slotHustota(zaloha),medzePoradia(napln,naj,kc))) continue;
    const bMin=Math.min(b0-1,Math.max(cielB,0));
    if(denJeOk(denPlan,sloty,ciel) && denVlakninaPoSkal(denPlan,sloty,ciel)>vl
       && denBielkovinyPoSkal(denPlan,sloty,ciel)>=bMin && odchylka()<=strop) continue;
    vratSlot(denPlan,naj,ctx,zaloha);
  } }
// R6: „zlacni deň" — rovnaká mechanika ako zlepsiVlakninu, ale výmena musí nechať výživu tam,
// kde bola. Prijme sa LEN vtedy, keď deň zostane platný (kcal v pásme + poradie jedál), cena
// naozaj klesne, bielkoviny po škálovaní neklesnú a vláknina sa nezhorší viac než o 1 g.
// Preto sa rozpočet nemôže dostať pred výživu: v konflikte výmena jednoducho neprejde.
// Slot na výmenu sa vyberá podľa PREKROČENIA vlastného rozpočtu (cena − cielC), nie podľa
// absolútnej ceny — inak by sa vždy menil obed, aj keby bol jediný, kto je v rozpočte.
function zlacniDen(denPlan,sloty,ctx,ciel){ return sRozpoctom(()=>_zlacniDen(denPlan,sloty,ctx,ciel)); }
function _zlacniDen(denPlan,sloty,ctx,ciel){
  const ref=(ctx&&ctx.cenaRef!=null)?ctx.cenaRef:cenaRef();
  if(!(ref>0)||!(ciel>0)) return;
  const cielDen=ref*ciel/100;
  // D4: SKÚŠANÉ A ZAMIETNUTÉ — pustiť cenu do výživovej rezervy tak, ako to robí vláknina (D3):
  // bielkoviny smú klesnúť po denný cieľ, vláknina po svoj. Cena klesla len o 2 % (173,3 → 169,4 €
  // za týždeň, 36 týždňov), ale dní pod 80 g bielkovín stúplo z 1,3 na 2,1 % a vláknina klesla
  // z 22,2 na 21,5 g. Zlý obchod — cena zostáva zovretá tvrdo, rezervu dostáva len vláknina.
  const pokusy={}; const MAX_POKUS=3;
  const odchylka=()=>Math.abs(denKcal(denPlan,sloty)-ciel);
  for(let i=0;i<14;i++){
    const ce=denCenaPoSkal(denPlan,sloty,ciel); if(ce<=cielDen) return;
    const b0=denBielkovinyPoSkal(denPlan,sloty,ciel), vl0=denVlakninaPoSkal(denPlan,sloty,ciel);
    const d0=odchylka(), strop=Math.max(ciel*0.06,d0);
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length&&(pokusy[s]||0)<MAX_POKUS);
    const kc={}; sloty.filter(s=>denPlan[s]&&denPlan[s].length).forEach(s=>{ kc[s]=mealKcal(denPlan[s]); });
    let naj=null,najNad=0;
    napln.forEach(s=>{ let c=0; denPlan[s].forEach(id=>{ const k=komponent(id); if(k)c+=vyzivaReceptu(k).cena||0; });
      const nad=c-(ref*kc[s]/100); if(nad>najNad){ najNad=nad; naj=s; } });
    if(!naj) return;
    pokusy[naj]=(pokusy[naj]||0)+1;
    const zaloha=denPlan[naj].slice(), stary=zaloha[0];
    const naplnP=sloty.filter(s=>denPlan[s]&&denPlan[s].length);
    if(!prehodSlot(denPlan,naj,ctx,mealKcal(zaloha),slotHustota(zaloha),medzePoradia(naplnP,naj,kc))) continue;
    // tolerancia je nula: prechod má až 14 iterácií a „len o gram horšie" by sa cez ne nasčítalo
    // (pri tolerancii 1 g spadla vláknina z 18,7 na 16,7 g a dní pod 80 g bielkovín z 0 na 6,7 %).
    if(denJeOk(denPlan,sloty,ciel) && denCenaPoSkal(denPlan,sloty,ciel)<ce
       && denBielkovinyPoSkal(denPlan,sloty,ciel)>=b0
       && denVlakninaPoSkal(denPlan,sloty,ciel)>=vl0 && odchylka()<=strop) continue;
    vratSlot(denPlan,naj,ctx,zaloha);
  } }
// R9: POISTKA PORADIA. Poradie jedál je TVRDÉ doménové pravidlo, ale opravDen ho rieši ako jeden
// z troch krokov: keď sa výmena menšieho jedla nepodarí, celý opravDen sa vzdá a deň zostane
// s porušeným poradím. Namerané: 100 % poradia na seede 20260818 bolo náhoda — stačilo zmeniť
// GEN_SK.turnaj z 24 na 25 (bez akéhokoľvek vzťahu k výžive) a poradie spadlo na 97,1 %.
// Táto poistka beží úplne na konci dňa a rieši UŽ LEN poradie: skúša každý porušený pár,
// obe strany a viac pokusov, s tvrdou podmienkou, že bielkoviny nesmú spadnúť pod 82 g.
const PORADIE_MIN_B=82;
function dorovnajPoradie(denPlan,sloty,ctx,ciel){ return bezRozpoctu(()=>_dorovnajPoradie(denPlan,sloty,ctx,ciel)); }
function _dorovnajPoradie(denPlan,sloty,ctx,ciel){
  const pokusy={}; const MAX_POKUS=8;
  for(let it=0;it<16;it++){
    zarovnajObedVeceru(denPlan,ctx);
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length);
    const kcal={}; napln.forEach(s=>{ kcal[s]=mealKcal(denPlan[s]); });
    const por=PORADIE_SLOTOV.filter(s=>kcal[s]!=null);
    let zleI=-1; for(let i=1;i<por.length;i++) if(kcal[por[i]]>=kcal[por[i-1]]){ zleI=i; break; }
    if(zleI<0) return;
    const p0=poradiePorusenia(denPlan,napln);
    const b0=denBielkovinyPoSkal(denPlan,napln,ciel), dk0=Math.abs(denKcal(denPlan,napln)-ciel);
    // kcal-tolerancia je tu ZÁMERNE veľká: poradie je tvrdé pravidlo, kalórie sa dajú dorovnať
    // ďalším opravDen (a nakoniec faktorom), ale poradie sa dorovnať nedá ničím iným.
    // Pri tolerancii 12 % zostalo 2 z 90 blokov s raňajkami 584 kcal nad obedom 500 — výmena za
    // 400 kcal raňajky sa zamietla len preto, že deň klesol o 184 kcal.
    const strop=Math.max(ciel*0.22,dk0);
    // bielkoviny smú klesnúť, ale nikdy pod PORADIE_MIN_B — poradie je pravidlo, 80 g je podlaha
    const lepsie=()=>poradiePorusenia(denPlan,napln)<p0
      && denBielkovinyPoSkal(denPlan,napln,ciel)>=Math.min(b0,PORADIE_MIN_B)
      && Math.abs(denKcal(denPlan,napln)-ciel)<=strop;
    const maly=por[zleI], velky=por[zleI-1];
    let ok=false;
    const tvrdeMedze=sl=>Object.assign({min:0,max:0},medzePoradia(napln,sl,kcal,true)||{},{tvrde:true});
    for(const [sl,cielK] of [[maly,kcal[velky]*0.72],[velky,kcal[maly]*1.4],[maly,kcal[velky]*0.55],[velky,kcal[maly]*1.2]]){
      if((pokusy[sl]||0)>=MAX_POKUS) continue;
      pokusy[sl]=(pokusy[sl]||0)+1;
      if(skusPrehod(denPlan,sl,ctx,Math.max(60,cielK),0,tvrdeMedze(sl),lepsie)){ ok=true; break; }
    }
    if(!ok){
      const p0v=ctx.vsednyBlok; ctx.bezPamate=true; if(maly==="Raňajky")ctx.vsednyBlok=false;
      try{ for(const [sl,cielK] of [[maly,kcal[velky]*0.7],[maly,kcal[velky]*0.45],[velky,kcal[maly]*1.3]]){
        if(skusPrehod(denPlan,sl,ctx,Math.max(60,cielK),0,tvrdeMedze(sl),lepsie)){ ok=true; break; } } }
      finally { ctx.bezPamate=false; ctx.vsednyBlok=p0v; }
    }
    if(false && !ok && maly==="Raňajky" && ctx.vsednyBlok){
      // POSLEDNÁ INŠTANCIA: uvoľni preferenciu „vo všedný blok sendvič". Sendvičových raňajok je
      // 48 a po týždennej pamäti z nich pod hranicou večere nemusí zostať ani jedna — vtedy je
      // lepšie dať v stredu ovsenú kašu než nechať raňajky väčšie ako obed. Poradie jedál je
      // tvrdé pravidlo, sendvič je preferencia (vyberDoSlotu ju už dnes preskočí, ak je pool prázdny).
      ctx.vsednyBlok=false;
      try{ ok=skusPrehod(denPlan,maly,ctx,Math.max(60,kcal[velky]*0.72),0,tvrdeMedze(maly),lepsie); }
      finally { ctx.vsednyBlok=true; }
    }
    if(!ok) return;
  } }
// Oprava dňa: kcal → poradie jedál → bielkoviny. Každý krok rieši JEDEN slot a začne odznova.
// R8: beží bez rozpočtu — kalorický cieľ a poradie jedál majú prednosť pred cenou.
function opravDen(denPlan,sloty,ctx,ciel,maxIter){ return bezRozpoctu(()=>_opravDen(denPlan,sloty,ctx,ciel,maxIter)); }
function _opravDen(denPlan,sloty,ctx,ciel,maxIter){
  const cielB=(cieloveMakra(ciel)||{}).b||0;
  for(let iter=0;iter<(maxIter||32);iter++){
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length);
    if(!napln.length) return;
    zarovnajObedVeceru(denPlan,ctx); // K15: bezpodmienečne, hneď na začiatku iterácie
    const kcal={}; let dk=0;
    napln.forEach(s=>{ kcal[s]=mealKcal(denPlan[s]); dk+=kcal[s]; });
    const medz=s=>medzePoradia(napln,s,kcal);
    // (a) kcal dňa mimo ±15 % → prehoď slot s najväčšou odchýlkou od svojho podielu
    if(ciel>0 && dk>0){
      const pomer=ciel/dk;
      // K6: oprava sa spúšťa už pri ±9 % (predtým až mimo pásma faktora ±15 %). Deň, ktorý sa
      // zmestí do faktora, ešte nie je dobrý deň — faktor mu potom mení veľkosť porcií.
      if(Math.abs(dk-ciel)>ciel*KCAL_PASMO || pomer>FAKTOR_MAX || pomer<FAKTOR_MIN){
        // K13: skús VŠETKY sloty v poradí odchýlky, nielen ten najhorší. Keď sa najhorší slot
        // vymeniť nedá (turnaj vráti ten istý recept alebo je okno prázdne), opravDen sa predtým
        // rovno vzdal a deň zostal 200 kcal vedľa — odtiaľ chvost dní s korekciou nad 15 %.
        const kandidati=napln.map(s=>({s:s, d:(kcal[s]-cielSlotu(s,napln,ciel))/cielSlotu(s,napln,ciel)*(pomer<1?1:-1)}))
          .filter(x=>x.d>-0.5).sort((a,b)=>b.d-a.d);
        let podarilo=false;
        // R9: krok (a) je JEDINÝ prechod, ktorý vie poradie jedál pokaziť — ostatné majú v podmienke
        // denJeOk (tá poradie kontroluje). Dorovnanie kalórií preto odteraz nesmie pridať porušenie:
        // vymeniť raňajky za väčšie len preto, že dňu chýba 200 kcal, je zlý obchod.
        const pp0=poradiePorusenia(denPlan,napln);
        const bliz=()=>Math.abs(denKcal(denPlan,napln)-ciel)<Math.abs(dk-ciel)
          && poradiePorusenia(denPlan,napln)<=pp0;
        for(const k of kandidati){ if(skusPrehod(denPlan,k.s,ctx,kcal[k.s]+(ciel-dk),0,medz(k.s),bliz)){ podarilo=true; break; } }
        if(podarilo) continue;
      }
    }
    // (b) poradie jedál: Obed ≥ Večera > Raňajky > Snack
    const por=PORADIE_SLOTOV.filter(s=>kcal[s]!=null);
    let zleI=-1;
    for(let i=1;i<por.length;i++){ if(kcal[por[i]]>=kcal[por[i-1]]){ zleI=i; break; } }
    if(zleI>=0){
      const maly=por[zleI], velky=por[zleI-1];
      // menšie jedlo zmenši tesne pod väčšie; ak sa nedá, skús zväčšiť to väčšie.
      // K16: medze zabezpečia, že náhrada naozaj padne pod (resp. nad) susedný slot
      const p0=poradiePorusenia(denPlan,napln), menej=()=>poradiePorusenia(denPlan,napln)<p0;
      if(skusPrehod(denPlan,maly,ctx,Math.max(60,kcal[velky]*0.75),0,medz(maly),menej)) continue;
      if(skusPrehod(denPlan,velky,ctx,kcal[maly]*1.35,0,medz(velky),menej)) continue;
    }
    // (c) bielkoviny dňa pod 80 % cieľa → prehoď slot s najhorším pomerom bielkovín
    if(cielB>0){
      const db=denBielkovinyPoSkal(denPlan,napln,ciel);
      // K3: prah 0,8 → 0,9 a hustota sa meria na celom slote vrátane prílohy
      if(db<cielB*0.9){
        let naj=null,najB=1e9;
        napln.forEach(s=>{ if(!denPlan[s].length)return; const b=slotHustota(denPlan[s]); if(b<najB){najB=b;naj=s;} });
        const p0c=poradiePorusenia(denPlan,napln);
        const viacB=()=>denBielkovinyPoSkal(denPlan,napln,ciel)>db && poradiePorusenia(denPlan,napln)<=p0c;
        if(naj && skusPrehod(denPlan,naj,ctx,kcal[naj],Math.max(HS_LO,najB+2),medz(naj),viacB)) continue;
      }
    }
    return; // deň je v poriadku
  }
}
// ── P5b: SNACK SA MENÍ KAŽDÝ DEŇ ─────────────────────────────────────────────
// Doménové pravidlo „1 variant na slot a blok" je pravidlo BATCH COOKINGU: navarím raz a jem
// to dva-tri dni. Snack sa ale nevarí — je to zabalený výrobok z regálu, kúpim tri jogurty
// rovnako ľahko ako tri kusy jedného. Kým bol snack viazaný na blok, mal týždeň iba 3 ťahy
// a mesiac 12 — a to bol strop, nie výsledok výberu: namerané „12 unikátnych z 12 ťahov"
// je 100 % pestrosť, len na dvanástich ťahoch. Preto sa snack odteraz losuje pre KAŽDÝ DEŇ
// bloku zvlášť (28 ťahov za mesiac). Nákup to znesie — sú to kusové balenia.
//
// Deň bloku sa pritom nesmie výživovo rozísť: prvý deň si drží voľbu, ktorú vyoptimalizovali
// prechody dňa, a ostatné dni dostanú NÁHRADU V PÁSME — kcal do ±SNACK_DEN_KCAL_TOL a
// bielkoviny najviac o SNACK_DEN_B_TOL nižšie. Preto sa medián bielkovín ani kcal-presnosť
// nehýbu, hoci sa jedlo mení.
const SNACK_DEN_KCAL_TOL=0.35, SNACK_DEN_B_TOL=2, SNACK_DEN_VL_TOL=0.6, SNACK_DEN_POKUSOV=30;
// deň sa náhradou nesmie kaloricky vzdialiť od cieľa viac, než bol vzdialený predtým
// (a nikdy viac než SNACK_DEN_DEN_PASMO) — inak by pestrosť snacku zaplatila kcal-presnosť dňa.
const SNACK_DEN_PASMO=0.07;
// koľko bielkovín smie deň náhradou stratiť — a nikdy nie pod denný cieľ. Rovnaká logika
// ako D3 pri vláknine: míňať sa smie len to, čo je NAD cieľom. Bez tohto pravidla zamietla
// bielkovinová podmienka polovicu kandidátov (opravné prechody tlačia snack na maximum
// hustoty, takže „rovnako bielkovinová náhrada" pre 24 g tvaroh prakticky neexistuje).
const SNACK_DEN_B_MAX=5;
function _pridajDruh(ctx,d){ ctx.snackDruhy.set(d,(ctx.snackDruhy.get(d)||0)+1); }
function slotVyzivaKomp(ids){ let k=0,b=0,vl=0;
  (ids||[]).forEach(id=>{ const c=komponent(id); if(!c)return; const v=vyzivaReceptu(c);
    k+=kcalPorcia(c); b+=v.b; vl+=v.vl||0; });
  return {k:k,b:b,vl:vl}; }
// horná medza kcal je zovretá aj poradím jedál: snack musí zostať najmenším jedlom dňa.
function _inySnack(slot,ctx,cielK,v0,okrem,dkBez,ciel,strop,vlBez,vlCiel,dbBez,cielB){
  const hore=Math.min(v0.k*(1+SNACK_DEN_KCAL_TOL), strop>0?strop:Infinity);
  const medze={min:v0.k*(1-SNACK_DEN_KCAL_TOL), max:hore, tvrde:true};
  const odch0=(ciel>0)?Math.abs(dkBez+v0.k-ciel):0;
  const dovolena=(ciel>0)?Math.max(odch0,ciel*SNACK_DEN_PASMO):Infinity;
  // predfilter na hustotu bielkovín: bez neho turnaj vracia kandidátov, ktorých vzápätí
  // zamietne bielkovinová podmienka, a 77 % dní zostane s tým istým snackom ako prvý deň
  const d0=v0.k>5?v0.b/(v0.k/100):0;
  const minB=Math.max(0,d0-1.5);
  // turnaj beží vo vlákninovom režime: náhrada musí spravidla uniesť aj vlákninu dňa,
  // ktorú do bloku doniesol `zlepsiVlakninu` — inak zamietne kandidáta vlákninová podmienka
  // (namerané: 235 zamietnutí z vlákniny oproti 174 z bielkovín).
  const vlPred=_vlakninaRezim; _vlakninaRezim=true;
  const cielC=_cenaVypnuta?0:cenaSlotu(ctx,cielK,slot);
  let zvysok=_poolVyberu(slot,ctx,cielK,minB,medze,okrem);
  if(zvysok.length<3) zvysok=_poolVyberu(slot,ctx,cielK,0,medze,okrem);
  // SKÚŠANÉ A ZAMIETNUTÉ: keď pamäť + kcal-okno nenechajú z čoho vyberať, obísť pamäť úplne
  // (ctx.bezPamate, ako to robí R9 pri raňajkách). Podiel dní, ktoré zostanú s voľbou prvého
  // dňa bloku, tým klesol z 50 na 40 %, ale „najčastejší snack" na 30 týždňoch sa nezmenil
  // (7×) a zaplatili to dni pod 80 g bielkovín (0 → 1,4 %) a susedné týždne (0 → 1 z 29).
  zvysok=zvysok.filter(r=>!ctx.pouzite.has(r.id));
  try{
  for(let i=0;i<SNACK_DEN_POKUSOV && zvysok.length;i++){
    const r=vyberVazene(zvysok,ctx.pouzite,slot,cielK,ctx.prilRot,cielC);
    if(!r) break;
    zvysok=zvysok.filter(x=>x!==r);
    if(ctx.pouzite.has(r.id)) continue;
    const comp=[r.id]; const dp=snackDoplnokPre(r,ctx,slot); if(dp)comp.push(dp);
    const v=slotVyzivaKomp(comp);
    // stratiť sa smie najviac SNACK_DEN_B_MAX g a len to, čo je NAD denným cieľom;
    // SNACK_DEN_B_TOL g je vždy k dispozícii, inak by sa nedalo vymeniť vôbec nič.
    const rezerva=(cielB>0)?(dbBez+v0.b-cielB):SNACK_DEN_B_MAX;
    const strata=Math.min(SNACK_DEN_B_MAX,Math.max(SNACK_DEN_B_TOL,rezerva));
    if(v.b<v0.b-strata) continue;
    // vláknina: buď sa nezhorší, alebo deň aj tak zostane nad svojím vlákninovým cieľom
    // (rovnaká logika ako D3 pri bielkovinách — míňať sa smie len to, čo je NAD cieľom)
    if(v.vl<v0.vl-SNACK_DEN_VL_TOL && !(vlCiel>0 && vlBez+v.vl>=vlCiel-1)) continue;
    if(Math.abs(v.k-v0.k)>v0.k*SNACK_DEN_KCAL_TOL) continue;
    if(ciel>0 && Math.abs(dkBez+v.k-ciel)>dovolena) continue;
    _zaberKomp(comp,ctx);
    if(ctx.snackDruhy)_pridajDruh(ctx,snackDruh(r));
    return comp;
  }
  } finally { _vlakninaRezim=vlPred; }
  return null; }
function snackyPoDnoch(denPlan,sloty,dni,ctx,ciel){
  const von={};
  sloty.forEach(slot=>{ if(!jeSnackSlot(slot))return;
    const zaklad=denPlan[slot]; if(!zaklad||!zaklad.length)return;
    const r0=komponent(zaklad[0]); if(r0&&ctx.snackDruhy)_pridajDruh(ctx,snackDruh(r0));
    if(dni.length<2)return;
    const cielK=cielSlotu(slot,sloty,ciel), v0=slotVyzivaKomp(zaklad);
    let dkBez=0, vlBez=0, dbBez=0, strop=Infinity;
    sloty.forEach(s2=>{ if(s2===slot||!denPlan[s2])return;
      const w=slotVyzivaKomp(denPlan[s2]); dkBez+=w.k; vlBez+=w.vl; dbBez+=w.b; strop=Math.min(strop,w.k); });
    strop=isFinite(strop)?strop-1:0;
    const vlCiel=VLAKNINA_CIEL*sloty.length/4, cielB=(cieloveMakra(ciel)||{}).b||0;
    for(let i=1;i<dni.length;i++){
      const c=_inySnack(slot,ctx,cielK,v0,zaklad[0],dkBez,ciel,strop,vlBez,vlCiel,dbBez,cielB);
      if(c){ von[dni[i]]=von[dni[i]]||{}; von[dni[i]][slot]=c; }
    }
  });
  return von; }
async function generujJedalnicek(zamiesaj){
  const cfg=S.genCfg||{}; const zachovat=!!cfg.zachovat;
  const naplnene=[0,1,2,3,4,5,6].map(datumPre).some(iso=>S.plan[iso]&&Object.keys(S.plan[iso]).length);
  if(naplnene && !zamiesaj && !zachovat && !await confirmModal("Vygenerovať nový jedálniček? Prepíše sa tento týždeň.")) return;
  const pouzite=new Set(), pouziteBazy=new Set(), plan={}, planF={}, snackDruhy=new Map();
  const stupne=t=>PAMAT_STUPNE.map(x=>nedavneRecepty(Math.max(2,Math.round(t*x))));
  const nedavne=stupne(TYZDNE_PAMATE), nedavneSnack=stupne(TYZDNE_PAMATE_SNACK);
  _genPamatSnack=nedavneSnack[0];
  const ciel=cfg.cielMode?(S.profil.kcal||0):0;
  if(zachovat){ for(let di=0;di<7;di++) slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(id=>pouzite.add(id))); }
  const skupiny = S.blokMode ? bloky() : [[0],[1],[2],[3],[4],[5],[6]];
  let prilRot=0, prevBlokMaso=new Set(); const hotoveBloky=[];
  // R7: rozpočet sa nesleduje po dňoch, ale ako ZOSTATOK na týždeň. Bloky sa generujú za sebou,
  // takže drahší blok A automaticky utiahne rozpočet blokov B a C — to je zároveň odpoveď na
  // „drahé jedlá s odstupom": po drahom bloku sa luxusný strop posunie nadol a krevety sa
  // nezopakujú v tom istom týždni. Korekcia je zovretá na 0,75–1,3× nominálu, aby jeden drahý
  // blok nevyrobil päť dní zemiakov.
  const refZ=cenaRef();
  let dniZostava=skupiny.reduce((a,d)=>a+d.length,0);
  let rozpoctZostatok=cenaCielDen()*dniZostava;
  _genCacheReset(true);
  skupiny.forEach(dni=>{
    // B7: masku slotov ber ako ZJEDNOTENIE dní bloku — inak stačí mať preč prvý deň
    // a celý blok zostane bez jedla. Do konkrétneho dňa sa potom zapíšu len jeho vlastné sloty.
    const sloty=VSETKY_SLOTY.filter(s=>dni.some(d=>slotyDna(d).includes(s)));
    let cenaRefBlok=refZ;
    if(refZ>0 && dniZostava>0 && S.profil.kcal>0){
      const naDen=rozpoctZostatok/dniZostava;
      cenaRefBlok=Math.max(refZ*0.75,Math.min(refZ*1.3,naDen/(S.profil.kcal/100)));
    }
    const ctx={ cfg, pouzite, pouziteBazy, nedavne, nedavneSnack, stopa:{}, prevBlokMaso, snackDruhy,
      kf:filterKuchynaPreDen(dni[0]), pr:pravidloPreDen(dni[0]), vsednyBlok:dni.every(d=>d<5), prilRot,
      cenaRef:cenaRefBlok };
    const denPlan={};
    if(zachovat){ sloty.forEach(sl=>{ const d0=dni.find(d=>slotIds(d,sl).length); if(d0==null)return; const ex=slotIds(d0,sl); denPlan[sl]=ex.slice(); const r0=komponent(ex[0]);
      if(r0)ctx.stopa[sl]={kuchyna:r0.kuchyna||"", baza:(sl==="Raňajky")?ranajkyBaza(r0):"", maso:(jeHlavnyChodSlot(sl)?masoTyp(r0):"")||""}; }); }
    sloty.forEach(slot=>{ if(denPlan[slot])return;
      const r=vyberDoSlotu(slot,ctx,cielSlotu(slot,sloty,ciel));
      if(r) denPlan[slot]=zlozSlot(r,slot,ctx); });
    // K6/K9: poradie prechodov. kcal → bielkoviny → kcal → bielkoviny (druhý reštart hill-climbu
    // rieši chvost dní pod 80 g) → kcal → vláknina úplne na koniec. Vláknina je posledná preto,
    // že jej výmeny sú najviac zviazané (nesmú zhoršiť bielkoviny ani kcal), takže by ich
    // ktorýkoľvek ďalší prechod len zmazal.
    if(ciel>0){ opravDen(denPlan,sloty,ctx,ciel);
      zlepsiBielkoviny(denPlan,sloty,ctx,ciel);
      zlepsiVlakninu(denPlan,sloty,ctx,ciel,VLAKNINA_CIEL*sloty.length/4);
      opravDen(denPlan,sloty,ctx,ciel,20);
      zlepsiBielkoviny(denPlan,sloty,ctx,ciel);
      opravDen(denPlan,sloty,ctx,ciel,20);
      // K14b: druhý vlákninový prechod úplne na záver. Jeho výmeny sú zovreté tak, že nesmú
      // zhoršiť bielkoviny, kcal ani poradie, takže po ňom už netreba nič opravovať.
      zlepsiVlakninu(denPlan,sloty,ctx,ciel,VLAKNINA_CIEL*sloty.length/4);
      // R6: cena je posledná. Jej výmeny sú zovreté najprísnejšie (nesmú zhoršiť kcal, poradie,
      // bielkoviny ani vlákninu), takže by ich ktorýkoľvek ďalší prechod len zmazal — a naopak,
      // ona sama už nemá čo pokaziť.
      zlacniDen(denPlan,sloty,ctx,ciel);
      // R9: poradie → dorovnaj kalórie → poradie. Poistka poradia si na výmenu pýta veľkú
      // kcal-toleranciu, opravDen ju vzápätí stiahne späť a druhý priechod poistky zaručí,
      // že to opravDen nepokazil. Na dobrom dni sú oba prechody zadarmo (hneď sa vrátia).
      dorovnajPoradie(denPlan,sloty,ctx,ciel);
      opravDen(denPlan,sloty,ctx,ciel,16);
      dorovnajPoradie(denPlan,sloty,ctx,ciel);
      zarovnajObedVeceru(denPlan,ctx); } // K15: posledná poistka pred zápisom do plánu
    else if(denPlan.Obed && denPlan.Večera && mealKcal(denPlan.Večera)>mealKcal(denPlan.Obed)){ const t=denPlan.Obed; denPlan.Obed=denPlan.Večera; denPlan.Večera=t; }
    prilRot=ctx.prilRot;
    if(refZ>0){ rozpoctZostatok-=denCenaPoSkal(denPlan,sloty,ciel)*dni.length; }
    dniZostava-=dni.length;
    let fac=1;
    if(ciel>0){ let dk=0; sloty.forEach(s=>{ if(denPlan[s])dk+=mealKcal(denPlan[s]); }); if(dk>0) fac=Math.max(FAKTOR_MIN,Math.min(FAKTOR_MAX,Math.round(ciel/dk*20)/20)); }
    hotoveBloky.push({dni:dni.slice(),sloty:sloty,ctx:ctx,denPlan:denPlan});
    dni.forEach(di=>{ const sd=slotyDna(di); plan[di]={}; planF[di]={};
      sd.forEach(s2=>{ if(denPlan[s2]){ plan[di][s2]=denPlan[s2].slice(); if(fac!==1)planF[di][s2]=fac; } }); });
    // stopa hotového bloku ide do týždňovej pamäte až tu — počas opráv sa ešte mení
    prevBlokMaso=new Set();
    Object.keys(ctx.stopa).forEach(sl=>{ const st=ctx.stopa[sl];
      if(st.baza)pouziteBazy.add(st.baza); if(st.maso)prevBlokMaso.add(st.maso); });
  });
  // P5b: per-denné snacky sa dopĺňajú AŽ po dogenerovaní všetkých blokov. Keby bežali vnútri
  // bloku, ich voľby by cez `ctx.pouzite` zúžili pool nasledujúcich blokov a zaplatili by to
  // hlavné jedlá (namerané: kcal-presnosť dňa 99,3 → 98,7 %).
  hotoveBloky.forEach(b=>{ const sd=snackyPoDnoch(b.denPlan,b.sloty,b.dni,b.ctx,ciel);
    b.dni.forEach(di=>{ const x=sd[di]; if(!x)return;
      Object.keys(x).forEach(sl=>{ if(plan[di]&&plan[di][sl]) plan[di][sl]=x[sl].slice(); }); }); });
  _genCacheReset(false); _genPamatSnack=null;
  nacitajSablonuDoTyzdna(plan,planF); save(); renderPlan();
  if(document.getElementById("v-domov").classList.contains("active"))renderDash();
}
function kuchyneList(){ return [...new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"sk")); }
// Dotazník generovania — jedno okno, prednačíta z profilu, každá zmena píše priamo do S.profil/S.genCfg.
function otvorGen(){ renderGenWizard(); }
// B3: „✨ Generovať" v dotazníku aj „🎲 Zamiešať" volali generujJedalnicek(true), čo obchádza
// otázku vo vnútri generátora — hotový týždeň zmizol bez varovania. Otázka patrí sem, k tlačidlu.
async function generujTlacidlo(zamiesaj){
  if(!planPrazdnyTyzden() && !(S.genCfg&&S.genCfg.zachovat)){
    const t=zamiesaj?"Zamiešať tento týždeň? Terajšie jedlá sa prepíšu novými.":"Zostaviť nový jedálniček? Terajší plán tohto týždňa sa prepíše.";
    if(!await confirmModal(t+" (Plán si vieš pred tým uložiť cez ⋯ Viac → Uložiť tento plán.)", zamiesaj?"Zamiešať":"Prepísať")) return;
  }
  await generujJedalnicek(true); }
// Onboarding — ľahký privítač pri prvom spustení (reuse handlerov stravníkov/profilu)
function onboardingModal(){ normStravnici(); const l=stravniciList();
  const ct=S.profil.cielTyp||"udrzanie"; const opt=(v,t)=>`<option value="${v}" ${ct===v?"selected":""}>${t}</option>`;
  const IST="padding:8px;border:1px solid var(--line);border-radius:8px";
  const h=`<div class="hero"><button class="close" onclick="dokonciOnboarding();zavriPick()">✕</button><h2>👋 Vitaj v kuchárke</h2><p class="info" style="margin:4px 0 0;color:rgba(255,255,255,.85)">Pár vecí na začiatok — všetko sa dá zmeniť v Nastaveniach.</p></div><div class="content2">
    <h4 class="sekcia">👥 Pre koho varíš?</h4>
    ${stravniciRiadkyHTML("onboardingModal()")}
    <p class="info" style="margin:2px 0 8px">Každý môže mať iný kalorický cieľ — appka navarí raz a porcie rozdelí podľa toho.</p>
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
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function dokonciOnboarding(){ S.profil.onboarded=true; save(); }
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
    ${stravniciRiadkyHTML("renderGenWizard()")}
    <button class="btn ghost" onclick="pridajStravnika();renderGenWizard()">+ Pridať stravníka</button>

    <h4 class="sekcia">🎯 Cieľ</h4>
    <div class="field"><label>Zámer</label><select class="f" onchange="S.profil.cielTyp=this.value;save()">${opt("udrzanie","Udržať váhu")}${opt("chudnutie","Chudnutie")}${opt("priberanie","Priberanie")}</select></div>
    <div class="field"><label>Cieľ kcal / deň (hlavný stravník)</label><input type="number" value="${S.profil.kcal}" onchange="S.profil.kcal=parseInt(this.value)||1450;save()" style="width:130px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>
    <label class="switch"><input type="checkbox" ${cfg.cielMode?"checked":""} onchange="S.genCfg.cielMode=this.checked;save()"> Dorovnať dni na cieľ (upraví veľkosť porcií)</label>

    <h4 class="sekcia">🥗 Diéty a suroviny</h4>
    <label class="switch"><input type="checkbox" ${S.profil.ryby?"checked":""} onchange="S.profil.ryby=this.checked;save()"> Nejem ryby</label>
    <label class="switch"><input type="checkbox" ${S.profil.lepok?"checked":""} onchange="S.profil.lepok=this.checked;save()"> Bez lepku</label>
    <label class="switch"><input type="checkbox" ${S.profil.mlieko?"checked":""} onchange="S.profil.mlieko=this.checked;save()"> Bez laktózy</label>
    <div class="field"><label>Zakázané suroviny (nikdy, oddeľ čiarkou)</label><textarea onchange="S.profil.zakazane=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${escHtml(S.profil.zakazane)}</textarea></div>
    <div class="field"><label>Chcem uprednostniť / spotrebovať</label><textarea onchange="S.profil.watch=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${escHtml(S.profil.watch)}</textarea></div>
    <div class="field"><label>Min. bielkovín / deň (0 = neriešiť)</label><input type="number" value="${S.profil.biel||0}" onchange="S.profil.biel=parseInt(this.value)||0;save()" style="width:130px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>

    <h4 class="sekcia">🍳 Kuchyne a pravidlá</h4>
    <label class="switch"><input type="checkbox" ${cfg.zachovat?"checked":""} onchange="S.genCfg.zachovat=this.checked;save()"> Zachovať už naplánované jedlá (kotvy)</label>
    <label class="switch"><input type="checkbox" ${cfg.neMasoZaSebou?"checked":""} onchange="S.genCfg.neMasoZaSebou=this.checked;save()"> Nevariť rovnaké mäso v dvoch blokoch po sebe</label>
    <label class="switch"><input type="checkbox" ${S.profil.kupSnack!==false?"checked":""} onchange="S.profil.kupSnack=this.checked;save()"> Kupované snacky (nemusím ich variť)</label>
    <div class="field"><label>Suroviny v akcii (uprednostní ich)</label><textarea onchange="S.akcie=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${escHtml(S.akcie)}</textarea></div>
    <div class="field"><label>Pravidlo pre rozsah dní (kuchyňa / bezmäso / čas)</label>
    <div class="controls" style="align-items:center;flex-wrap:wrap">
      <select class="f" id="gf-od">${denOpts(0)}</select><span>–</span><select class="f" id="gf-do">${denOpts(6)}</select>
      <select class="f" id="gf-kuch"><option value="">(kuchyňa: ľubovoľná)</option>${kuch.map(k=>`<option>${k}</option>`).join("")}</select>
      <label class="switch" style="margin:0"><input type="checkbox" id="gf-veg"> bezmäso</label>
      <input type="number" id="gf-cas" placeholder="do min" style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">
      <button class="btn" onclick="pridajGenFilter()">+ Pridať pravidlo</button></div>
    <div id="gf-list" style="margin-top:8px">${fh}</div></div>`;
  const nav=`<div class="btn-row" style="margin-top:16px"><button class="btn primary" onclick="zavriPick();prepni('planovac');generujTlacidlo(false)">✨ Generovať</button></div>`;
  const h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>✨ Zostaviť jedálniček</h2><p class="info" style="margin:4px 0 0">Označ a vyplň, čo generovať</p></div><div class="content2">${c}${nav}</div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
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
  document.getElementById("v-planovac").classList.add("printme"); document.getElementById("v-nakup").classList.add("printme");
  tlacPriprav("plan"); window.print(); }

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
    // koncepcia B: v nákupe treba hneď vidieť, na ktorú várku položka je → nesieme index bloku
    if(!varenia[k])varenia[k]={r,porcie:porcieSlotBlok(di,slot,cid),fVelkost:pf(di,slot),bi:blokIndex(di)}; });
  Object.values(varenia).forEach(({r,porcie,fVelkost,bi})=>{ const fPocet=porcie/(r.porcie||1);
    (r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov);
      if(i.mnozstvo==null){ const kk=(p?p.kluc:i.nazov.toLowerCase()); if(!notes[kk])notes[kk]={nazov:i.nazov,pozn:i.poznamka||"podľa chuti",oddelenie:(p||{}).oddelenie||"Ostatné"}; return; }
      const j=(i.jednotka||"").toLowerCase().trim();
      const rodina=rodinaJednotky(j);
      const mn=skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost);
      if(p){ const kluc=p.kluc; if(!grp[kluc])grp[kluc]={key:kluc,nazov:i.nazov,oddelenie:p.oddelenie||"Ostatné",p:p,matched:true,grams:0,cena:0,hasKs:false,hasMl:false,hasG:false,pocty:{},ziadane:0,zdroje:[],bl:{}};
        const G=grp[kluc]; const g=gramy({mnozstvo:mn,jednotka:i.jednotka},p); if(bi!=null){G.bl=G.bl||{};G.bl[bi]=1;}
        // B5+: `ziadane` = surový súčet množstiev zo receptov. Slúži len na rozlíšenie „recept nič nepýta"
        // od „recept pýta, ale nevieme to previesť na gramy" — bez neho by druhý prípad ticho ukázal 0,00 €.
        G.ziadane+=Math.abs(mn); G.grams+=g; G.cena+=g/100*(p.cena100||0);
        G.zdroje.push({recept:r.nazov,id:r.id,ing:i.nazov,mn,jednotka:i.jednotka||""});
        // C1: pamätáme si PÔVODNÚ počítateľnú jednotku (strúčik, plátok, list), nie univerzálne „ks"
        if(rodina==="pocet"){ G.hasKs=true; G.pocty[i.jednotka||"ks"]=(G.pocty[i.jednotka||"ks"]||0)+mn; }
        else if(rodina==="ml")G.hasMl=true; else G.hasG=true;
      } else { const kluc="u|"+i.nazov.toLowerCase()+"|"+j; if(!grp[kluc])grp[kluc]={key:kluc,nazov:i.nazov,oddelenie:"Ostatné",matched:false,raw:0,grams:0,jednotka:i.jednotka||"",cena:0,ziadane:0,zdroje:[],bl:{}};
        if(bi!=null){grp[kluc].bl=grp[kluc].bl||{};grp[kluc].bl[bi]=1;}
        // B5+/N-obchod: aj surovina mimo databázy má hmotnosť, keď je jednotka prevediteľná
        // („Burrito seasoning mix 4 ČL" = 20 g). Cena zostáva neznáma — to rieši dovodBezCeny().
        grp[kluc].grams+=gramy({mnozstvo:mn,jednotka:i.jednotka},null);
        grp[kluc].ziadane+=Math.abs(mn); grp[kluc].raw+=mn; grp[kluc].zdroje.push({recept:r.nazov,id:r.id,ing:i.nazov,mn,jednotka:i.jednotka||""}); }
    });
  });
  // C9: „podľa chuti" surovina, ktorú iný recept už pýta s množstvom, robila DVA riadky na tú istú
  // vec („Soľ 4 g" + „Soľ podľa chuti", „Koriander 85 g" + „Koriander podľa chuti"). V obchode to
  // vyzerá ako dve položky a odškrtnúť treba obe. Riadok s množstvom je informatívnejší → nechaj ten.
  Object.keys(notes).forEach(k=>{ if(grp[k]) delete notes[k]; });
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
  // N-obchod: mililitre dávajú v obchode zmysel len pri tekutine. „Pekinská kapusta 750 ml"
  // (3 šálky) alebo „Sušený cesnak 36 ml" (7 ČL) je nezmysel — pevnú surovinu vypíš v gramoch.
  if(G.hasMl && !G.hasG && jeTekutina(p)){ return fmt(Math.round(G.grams/(p.hustota||1)))+" ml"; }
  // B5+: gramáž sa nedopočítala (neznáma jednotka / kus bez g_za_ks). „0 g" by klamalo — vypíš,
  // čo recepty naozaj pýtajú, v ich vlastných jednotkách.
  if(!(G.grams>0) && G.ziadane>0){
    const podlaJed={}; (G.zdroje||[]).forEach(z=>{ const jj=z.jednotka||"?"; podlaJed[jj]=(podlaJed[jj]||0)+z.mn; });
    return Object.keys(podlaJed).map(jj=>fmt(Math.round(podlaJed[jj]*100)/100)+" "+jj).join(" + ");
  }
  return fmt(Math.round(G.grams))+" g";
}
// C7: poradie oddelení v nákupe = poradie regálov v obchode. Musí obsahovať VŠETKY oddelenia,
// ktoré sa v potraviny.json vyskytujú, inak osamotené („Mrazené", „Alkohol") vypadnú až za „Ostatné".
const PORADIE_ODDELENI=["Zelenina a ovocie","Mäso a ryby","Mliečne a vajcia","Chladené","Mrazené","Pečivo",
  "Cestoviny a ryža","Trvanlivé a konzervy","Omáčky a dochucovadlá","Oleje a tuky","Orechy a semená",
  "Pečenie a sladké","Korenie a bylinky","Nápoje","Alkohol","Ostatné"];
// N-obchod: v Kauflande a v Lidli sa chodí inak, takže poradie nesmie byť konštanta. PORADIE_ODDELENI
// zostáva predvolenou trasou (Kaufland) a zároveň ZOZNAMOM VŠETKÝCH oddelení — presety a vlastné
// poradie sú len iné poradie tých istých názvov, nikdy nie iná množina.
const PORADIE_LIDL=["Pečivo","Zelenina a ovocie","Mliečne a vajcia","Chladené","Mäso a ryby","Mrazené",
  "Trvanlivé a konzervy","Cestoviny a ryža","Omáčky a dochucovadlá","Oleje a tuky","Pečenie a sladké",
  "Korenie a bylinky","Orechy a semená","Nápoje","Alkohol","Ostatné"];
const OBCHODY={kaufland:{nazov:"Kaufland",por:PORADIE_ODDELENI},lidl:{nazov:"Lidl",por:PORADIE_LIDL}};
// Vlastné poradie sa dopĺňa a čistí voči PORADIE_ODDELENI — po pridaní nového oddelenia do
// potraviny.json teda nikdy nevypadne položka na koniec zoznamu a nikdy tam nezostane duplicita.
function ozdravPoradie(por){ const von=[];
  (Array.isArray(por)?por:[]).forEach(o=>{ if(PORADIE_ODDELENI.includes(o) && !von.includes(o)) von.push(o); });
  PORADIE_ODDELENI.forEach(o=>{ if(!von.includes(o)) von.push(o); });
  return von; }
function poradieOddeleni(){ const k=S.obchod||"kaufland";
  if(k==="vlastne") return ozdravPoradie(S.obchodPor);
  return (OBCHODY[k]||OBCHODY.kaufland).por; }
function nastavObchod(k){ if(k==="vlastne" && !Array.isArray(S.obchodPor)) S.obchodPor=poradieOddeleni().slice();
  S.obchod=k; save(); renderTrasa(); renderNakup(); }
function posunOddelenie(i,smer){ const p=ozdravPoradie(S.obchodPor||poradieOddeleni()); const j=i+smer;
  if(j<0||j>=p.length) return;
  const t=p[i]; p[i]=p[j]; p[j]=t;
  S.obchod="vlastne"; S.obchodPor=p; save(); renderTrasa(); renderNakup(); }
// Zoznam sa kreslí až pri otvorení panela (`ontoggle`) — 16 riadkov navyše nesmie zaťažiť obrazovku,
// na ktorej sa v obchode odškrtáva. Ťahanie prstom je na telefóne bolestivé, preto šípky.
function renderTrasa(){ const el=document.getElementById("trasa-box"); if(!el) return;
  const akt=S.obchod||"kaufland";
  const chip=(k,n)=>`<button class="chip${akt===k?" active":""}" onclick="nastavObchod('${k}')">${n}</button>`;
  let h='<div class="chips" style="padding:0 0 10px">'+Object.keys(OBCHODY).map(k=>chip(k,OBCHODY[k].nazov)).join("")+chip("vlastne","Vlastné")+"</div>";
  const por=poradieOddeleni();
  h+='<div class="trasa-list">'+por.map((o,i)=>
    `<div class="trasa-row"><span class="trasa-n">${i+1}.</span><span class="trasa-o">${o}</span>`+
    `<span class="trasa-akc"><button class="mini" title="posunúť vyššie" aria-label="${o} vyššie" onclick="posunOddelenie(${i},-1)"${i===0?" disabled":""}>↑</button>`+
    `<button class="mini" title="posunúť nižšie" aria-label="${o} nižšie" onclick="posunOddelenie(${i},1)"${i===por.length-1?" disabled":""}>↓</button></span></div>`).join("")+"</div>";
  h+='<p class="info" style="margin:8px 0 0">Šípky prestavia poradie a prepnú ťa na „Vlastné“. Poradie platí pre nákupný zoznam aj tlač.</p>';
  el.innerHTML=h; }
// N-obchod: regál berieme z NÁZVU suroviny, keď názov jednoznačne hovorí, kde to v obchode leží.
// `najdiPotravinu` páruje na kmeň slova, takže „Cesnaková omáčka" sadne na „cesnak" (Zelenina a ovocie)
// a „Ananásový kompót" na „ananás" — a človek potom hľadá majonézu pri paradajkách. Mení sa LEN regál
// v nákupe; výživa aj párovanie zostávajú nedotknuté.
const ODD_PODLA_NAZVU=[
  [/omack|kecup|dresing|majonez|marinad|\bpesto|salsa|catni|chutney/, "Omáčky a dochucovadlá"],
  [/mrazen|zmrazen/, "Mrazené"],
  [/kompot|konzerv|sterilizovan|sterilovan|nakladan|v nalev|zavaran/, "Trvanlivé a konzervy"],
  [/\bdzem|lekvar|marmelad/, "Pečenie a sladké"]];
// sušené: bylinka/korenie ide do korenín, sušené ovocie a huby medzi trvanlivé
const SUSENE_KORENIE=/cesnak|cibul|chilli|chili|cili|paprik|vnat|bylin|koren|zazvor|majoran|tymian|oregano|bazalk|rozmarin|petrzlen|kmin|rasca|salvi|estragon|mat[ay]|ligurc/;
function oddelenieRiadku(nazov,zaklad){
  const n=bezDia(nazov||"");
  for(let i=0;i<ODD_PODLA_NAZVU.length;i++){ if(ODD_PODLA_NAZVU[i][0].test(n)) return ODD_PODLA_NAZVU[i][1]; }
  if(/susen/.test(n) && zaklad==="Zelenina a ovocie")
    return SUSENE_KORENIE.test(n)?"Korenie a bylinky":"Trvanlivé a konzervy";
  return zaklad||"Ostatné"; }
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
// B9: DVA ZDROJE PRAVDY O KALÓRIÁCH. Plán a Výživa hlásia `kcal_na_porciu` (B4), nákup kupuje
// SUROVINY. Rozdiel sa dá buď schovať (a domácnosť si domov donesie o desatinu jedla viac, než
// jej appka sľúbila), alebo priznať. Priznávame ho: nákup musí zostať fyzicky správny — recept
// sa nedá uvariť z preškálovaných surovín a špajza aj detail receptu pracujú s plným množstvom.
// Vracia {plan, nakup, pomer, top[]} za PRÁVE ZOBRAZENÝ týždeň; `top` sú recepty, ktoré rozdiel
// ťahajú najviac (surovinami majú viac kcal, než deklarujú).
function nakupVsPlan(){
  let plan=0;
  planItems().forEach(({r,di,slot})=>{ if(r._left)return;
    plan+=vyzivaReceptu(r).kcal*pocetPorciiDna(di,slot)*pf(di,slot); });
  const {grp}=nakupPolozky();
  let nakup=0; Object.values(grp).forEach(G=>{ if(G.matched&&G.grams>0) nakup+=G.grams*G.p.kcal/100; });
  // podiel jednotlivých receptov: (suroviny na porciu) − (deklarované) × počet uvarených porcií
  const top=[];
  const videne={};
  planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return;
    const k=(cid||r.id)+"|"+slot+"|"+denyBloku(di)[0]; if(videne[k])return; videne[k]=1;
    const j=r.kcal_na_porciu||0; if(!(j>0))return;
    let sur=0; (r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov); if(!p)return;
      const g=gramy(i,p)*vsiaknuteho(i); if(g>0) sur+=g*p.kcal/100; });
    const naPorciu=sur/(r.porcie||1); if(!(naPorciu>5))return;
    const porcie=porcieSlotBlok(di,slot,cid)*pf(di,slot);
    const rozdiel=(naPorciu-j)*porcie;
    if(rozdiel>0.02*plan/7) top.push({id:r.id,nazov:r.nazov,kcal:Math.round(rozdiel)});
  });
  top.sort((a,b)=>b.kcal-a.kcal);
  return {plan:plan,nakup:nakup,pomer:plan>0?nakup/plan:1,top:top.slice(0,5)};
}
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
// N-obchod: zakázané suroviny a „Mám doma" majú OPAČNÚ cenu chyby, takže nesmú zdieľať prísnosť.
//  · zákaz (alergia, diéta): radšej zablokuj viac — `obsahujeSurovinu` s voľným prefixom.
//  · „Mám doma": nadmerná zhoda znamená, že surovinu NEKÚPIŠ, hoci ju doma nemáš — a zistíš to
//    až pri hrnci. Preto tu prefixové pravidlo drží slovo pri tokene (max +3 znaky), takže
//    „med" chytí „medu"/„medom", ale už nie „medvedí cesnak", „medovku" ani „datle medjool".
function jeDoma(nazov,tok){ if(!tok||!tok.length) return false;
  const slova=_slova(nazov);
  return tok.some(t=>{ const x=_tokRozklad(t);
    if(x.kmene.length>0 && _sadneOd(slova,x.kmene)>=0) return true;
    if(!x.pref) return false;
    const dl=bezDia(t).length;
    return slova.some(w=>w.startsWith(x.pref) && w.length-dl<=3); }); }
// B5+: „1 ks" balíkovaného tovaru znamená 1 BALENIE. Toto je jediná cesta, ako dať cenu položke,
// ktorej gramáž nevieme (kus bez `g_za_ks`). Zámerne to NIE JE v gramy()/gZaJednotku: tam by
// „1 ks masla = 250 g" prepísalo výživu receptu a chybné „Maslo 25 ks" by dalo 6 kg a 45 000 kcal.
// V nákupe je to bezpečné — kupuješ balenia a v riadku je vidieť „2 ks (bal.: 2× 400 g)".
// Poistka: nad NAKUP_MAX_BALENI je množstvo evidentne chybné (25 balení masla) → radšej priznaj
// neznámu cenu, než nafúknuť nákup o desiatky eur.
const NAKUP_MAX_BALENI=6;
function nakupKsPocet(G){ let n=0; for(const j in (G.pocty||{}))
  if(KS_JEDNOTKY.includes((j||"").toLowerCase().trim())) n+=G.pocty[j]; return n; }
function nakupBalenie(G){ if(!(G.matched && G.p && G.p.balenie_g)) return null;
  if(G.grams>0){ const n=Math.max(1,Math.ceil(G.grams/G.p.balenie_g)); return {n:n,pop:G.p.balenie_popis,celkG:n*G.p.balenie_g}; }
  const ks=nakupKsPocet(G);
  if(ks>0){ let n=Math.max(1,Math.ceil(ks-1e-9));
    // veľký počet „ks" už nie sú balenia, ale jednotlivé kusy (18 olív) alebo chyba v recepte
    // („Maslo 25 ks"). Kupovať 18 pohárov olív je horšie než kúpiť jeden — zrež to na 1 balenie.
    if(n>NAKUP_MAX_BALENI) n=1;
    return {n:n,pop:G.p.balenie_popis,celkG:n*G.p.balenie_g,odhad:true}; }
  return null; }
// C2: celé balenia sa účtujú len keď ich používateľ chce vidieť — inak riadok hlásil 8 plátkov
// toastu a cena bola za celý bochník.
function nakupCena(G){ if(S.profil.balenia!==false){ const b=nakupBalenie(G); if(b) return b.celkG/100*((G.p&&G.p.cena100)||0); } return nakupCenaSpotreba(G); }
// spotreba = koľko suroviny recepty naozaj minú. Keď sa gramáž nedá dopočítať (kus bez g_za_ks),
// je najlepším známym odhadom spotreby práve to balenie, ktoré musíš kúpiť — inak by riadok tvrdil 0 €.
function nakupCenaSpotreba(G){ if(!(G.cena>0)){ const b=nakupBalenie(G); if(b&&b.odhad) return b.celkG/100*((G.p&&G.p.cena100)||0); } return G.cena||0; }
function nakupCenaBalenia(G){ const b=nakupBalenie(G); return b? b.celkG/100*((G.p&&G.p.cena100)||0) : (G.cena||0); }
// B5+: JEDINÉ miesto, kde sa rozhoduje, či je cena položky NEZNÁMA. Vracia dôvod ("" = cena je známa).
// Pozor: `cena100: 0` je ZNÁMA cena (voda z vodovodu je naozaj zadarmo), `cena100: null` je neznáma —
// tie dve sa nesmú zlúčiť. Ticho zobrazené „0,00 €" je horšie než priznané „cenu nepoznám".
function dovodBezCeny(G){
  if(!G) return "";
  if(!G.matched) return "surovina nie je v databáze potravín";
  if(G.p.cena100==null) return "potravina nemá cenu (cena100: null)";
  if(!(G.grams>0) && G.ziadane>0 && !nakupBalenie(G)) return "množstvo sa nedá previesť na gramy (jednotka „"+
    [...new Set((G.zdroje||[]).map(z=>z.jednotka||"?"))].join("/")+"“)";
  return ""; }
function nakupMnozstvo(G){ const ex=zobrazMnozstvo(G); if(S.profil.balenia!==false){ const b=nakupBalenie(G); if(b) return ex+` <span class="info">(bal.: ${b.n}× ${b.pop})</span>`; } return ex; }
async function upravFaktor(di,slot){ const cur=Math.round(pf(di,slot)*100); const v=await promptModal("Veľkosť porcie v % (100 = normál):",cur); if(v===null)return; let f=Math.max(10,Math.min(400,parseInt(v)||100))/100; const iso=datumPre(di); S.planF[iso]=S.planF[iso]||{}; S.planF[iso][slot]=Math.round(f*100)/100; save(); renderPlan(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }
function spajzaSedi(x,nazov,p){ const key=p?p.kluc:bezDia(nazov);
  const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||""; const xn=bezDia(x.nazov), n=bezDia(nazov);
  return (xk&&xk===key) || xn===n || xn.includes(n) || n.includes(xn); }
// S2: zásoba sa počíta len keď je KLADNÁ a NEEXPIROVANÁ. Expirovaná položka je odpad — keby
// zmenšila nákup, kúpiš málo a v deň varenia ti bude chýbať. `expiry` bez hodnoty = trvanlivé.
function zasobaPlatna(x){ if(!x||!(x.mnozstvo>0))return false; const d=dniDo(x.expiry); return d===null||d>=0; }
function mamVSpajzi(nazov){ const p=najdiPotravinu(nazov);
  return S.spajza.some(x=>zasobaPlatna(x) && spajzaSedi(x,nazov,p)); }
// C3: koľko GRAMOV tejto suroviny mám naozaj v špajzi (nie len „mám/nemám")
function spajzaGramy(nazov,p){ let g=0;
  (S.spajza||[]).forEach(x=>{ if(!zasobaPlatna(x))return; if(!spajzaSedi(x,nazov,p))return;
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
    const dovod=dovodBezCeny(G0); // z G0, nie z G — položka pokrytá špajzou má 0 g legitímne
    const odd=oddelenieRiadku(G.nazov,G.oddelenie);
    rows.push({key,gkey:G.key,odd,nazov:G.nazov,mnoz:nakupMnozstvo(G),cena:nakupCena(G),matched:!!G.matched,
      bloky:Object.keys(G.bl||{}).map(Number).sort((a,b)=>a-b),
      cenaSpotreba:nakupCenaSpotreba(G),cenaBalenia:nakupCenaBalenia(G),gramy:G.grams,zoSpajze:sg,
      bezCeny:!!dovod,dovodCeny:dovod,akc:ingVakcii(G.nazov),doma,vSpajzi,klik:true,zaklad:jeZakladnaVec({odd,gramy:G.grams}),ck:!!(S.nakupCheck[nakupCheckKey(key)]||doma)}); });
  Object.values(notes).forEach(N=>{ const key="note|"+bezDia(N.nazov); const doma=jeDoma(N.nazov,tok);
    rows.push({key,odd:oddelenieRiadku(N.nazov,N.oddelenie),nazov:N.nazov,mnoz:"<i>"+escHtml(N.pozn)+"</i>",akc:false,doma,klik:true,pozn:true,zaklad:true,ck:!!(S.nakupCheck[nakupCheckKey(key)]||doma)}); });
  return rows;
}
// N-obchod: 36 % zoznamu (16 z 85 riadkov korenia — Borievky 0 g, Čierne korenie 2 g — a 15 riadkov
// „podľa chuti") boli veci, ktoré v obchode nekupuješ. Nemiznú (keď dôjde soľ, musíš to vidieť), ale
// idú do zbalenej sekcie na koniec a nerátajú sa do počtu položiek ani do ceny hlavného zoznamu.
// Hranica 25 g: 2 g korenia si doma máš, 100 g sladkej papriky na guláš je nákup.
const ZAKLAD_MAX_G=25;
function jeZakladnaVec(r){ if(!r) return false;
  if(r.pozn) return true;                                     // „podľa chuti" — recept nepovie množstvo
  return r.odd==="Korenie a bylinky" && !(r.gramy>ZAKLAD_MAX_G); }
// P1 (jediná najhoršia interakcia v appke): riadok mal 361×38 px, ale odškrtlo ho len políčko
// 20×20 px — ťuknutie na názov otvorilo info-okno, lebo `preventDefault()` zrušil aktiváciu
// <label>. V obchode máš jednu ruku a košík v druhej. Preto teraz:
//   · celý <label> (≥48 px) je jeden cieľ a odškrtáva — žiadny onclick, žiadny preventDefault,
//   · „v ktorom recepte / čím nahradiť" má vlastné tlačidlo „ⓘ" 44×44 px vpravo,
//   · info-tlačidlo je SÚRODENEC labelu, nie jeho potomok (v labeli by ho klik prekryl).
// Koncepcia B: pri položke vidno, na ktorú várku je — farba bloku a K NEJ VŽDY písmeno.
// Bez písmena by bola farba jediným nosičom informácie (WCAG 1.4.1).
function znakyBlokov(bl){ if(!S.blokMode || !bl || !bl.length) return "";
  return '<span class="znaky">'+bl.map(bi=>znakBloku(bi,"Kupuješ na blok "+blokPismeno(bi))).join("")+'</span>'; }
function riadokNakup(r){ const en=escHtml(String(r.nazov||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'"));
  if(r.man){ return `<div class="nak-row${r.ck?' checked':''}"><label class="${r.ck?'checked':''}"><input type="checkbox" ${r.ck?'checked':''} onchange="checkManual('${escHtml(r.id)}',this.checked)"><span class="nm2">${escHtml(r.nazov)}${r.mnoz?' — <b>'+escHtml(r.mnoz)+'</b>':''} <span class="info">(ručné)</span></span></label><button class="nak-i warn" title="Zmazať položku" aria-label="Zmazať položku ${escHtml(r.nazov)}" onclick="zmazManual('${escHtml(r.id)}')">✕</button></div>`; } // N1: ručná položka v oddelení
  // B5+: položka bez ceny to musí priznať priamo v riadku — inak sa tvári, že stojí 0,00 €
  const bez=r.bezCeny?` <span class="badge price" title="${escHtml(r.dovodCeny||"neznáma cena")}">? cena</span>`:'';
  const info=r.klik&&r.gkey?`<button class="nak-i" title="v ktorom recepte · čím nahradiť" aria-label="Detail suroviny ${escHtml(r.nazov)}" onclick="surovinaInfo('${escHtml(String(r.gkey||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'"))}','${en}')">ⓘ</button>`:'';
  return `<div class="nak-row${r.ck?' checked':''}"><label class="${r.ck?'checked':''}"><input type="checkbox" ${r.ck?'checked':''} ${r.doma?'disabled':''} onchange="checkNakup('${escHtml(String(r.key||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'"))}',this.checked)"><span class="nm2">${znakyBlokov(r.bloky)}${escHtml(r.nazov)} — <b>${r.mnoz}</b>${bez}${r.akc?' <span class="badge price">🏷️ akcia</span>':''}${r.doma?' <span class="info">(máš doma)</span>':''}</span></label>${info}</div>`; }
function renderNakup(){
  const box=document.getElementById("nakup-list");
  const nk=document.getElementById("nakup-kontext"); if(nk){nk.innerHTML=tyzdenNavHTML(); zpristupniKliky(nk);} // nákup je na zvolený týždeň — treba to vidieť
  const domaEl=document.getElementById("doma-nakup"); if(domaEl){ if(document.activeElement===domaEl){S.domaNakup=domaEl.value;save();} else domaEl.value=S.domaNakup||""; }
  const rows=nakupItems();
  const lowStock=S.spajza.filter(x=>x.min>0 && x.mnozstvo<x.min);
  const manual=S.nakupManual||[];
  if(!rows.length && !lowStock.length && !manual.length){ box.innerHTML='<p class="info">Zatiaľ nič v pláne. Pridaj recepty v <b>Pláne</b>, alebo pridaj vlastnú položku vyššie.</p>'; return; }
  const poradie=poradieOddeleni();
  const nez=rows.filter(r=>!r.ck && !r.vSpajzi && !r.zaklad), zakl=rows.filter(r=>!r.ck && !r.vSpajzi && r.zaklad),
        vSp=rows.filter(r=>!r.ck && r.vSpajzi), zas=rows.filter(r=>r.ck);
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
  // koniec nákupu je vlastný stav: bez neho zostal na obrazovke len zoznam preškrtnutých názvov
  // a nebolo ako začať odznova (odškrtnutie je viazané na týždeň, takže sa samo nezmaže)
  if(!nez.length && !zakl.length && (zas.length||vSp.length))
    h+=`<div class="nakup-suhrn"><span><b>🎉 Máš všetko v košíku.</b></span>`+
      `<button class="btn" onclick="vycistiNakup()">Zrušiť odškrtnutie</button></div>`;
  // Prúžok postupu (koncepcia B): v obchode je najdôležitejšia otázka „koľko ešte".
  { const hotovo=rows.filter(r=>r.ck && !r.zaklad).length, spolu=rows.filter(r=>!r.zaklad).length;
    if(spolu) h+=`<div class="nak-pruh" role="img" aria-label="Odškrtnutých ${hotovo} zo ${spolu} položiek"><i style="width:${Math.round(hotovo/spolu*100)}%"></i></div>`; }
  // P2: súhrn mal na telefóne 205 px a odtlačil prvú položku pod prehyb. Hore zostáva to,
  // kvôli čomu človek na súhrn pozerá v obchode — koľko položiek a koľko to stojí; zvyšok
  // (dochucovadlá, celé balenia, akcie, rozdiel nákup/plán) je na telefóne pod „podrobnosti".
  // Na počítači je <details> otvorený, takže sa nič nemení; v tlači sa vypíše celý.
  if(nez.length){ const viac=
      (zakl.length?`<span class="info" title="Korenie a „podľa chuti“ — zbalené dole">+ ${zakl.length} dochucovadiel</span>`:"")+
      (sBaleniami>spotreba+0.01?`<span title="Vrátane zvyšku v celých baleniach">v celých baleniach ~ <b>${eur(sBaleniami)}</b></span>`:"")+
      `${akciaN?`<span class="badge price">🏷️ ${akciaN} v akcii</span>`:""}${nakupKryciePokrytieHTML()}`;
    h+=`<div class="nakup-suhrn"><span><b>${nez.length}</b> položiek na kúpu</span>`+
    `<span title="Suroviny spotrebované receptami">spotrebuješ ~ <b>${eur(spotreba)}</b>${bezCenyN?` <span class="info">(${bezCenyN} bez ceny)</span>`:""}</span>`+
    (viac?`<details class="suhrn-viac"${jeMobil()?"":" open"}><summary>podrobnosti</summary><div class="sv-in">${viac}</div></details>`:"")+
    `</div>`; }
  if(lowStock.length){ h+='<div class="odd"><h4>🧊 Doplniť zásoby (pod minimom)</h4>'; lowStock.forEach(x=>{ h+=`<label><span class="nm2">${escHtml(x.nazov)} — <b>${fmt(Math.max(0,x.min-x.mnozstvo))} ${escHtml(x.jednotka)}</b></span></label>`; }); h+="</div>"; }
  oddPor.forEach(o=>{ h+=`<div class="odd"><h4>${o}</h4>`; podla[o].sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; });
  // dochucovadlá a „podľa chuti" — zbalené, aby zoznam v obchode nemal o tretinu viac riadkov
  if(zakl.length){ h+=`<details class="odd zaklady"><summary>🧂 Dochucovadlá a základné veci — ${zakl.length} <span class="info">(kupuj, len ak ti došli)</span></summary>`;
    zakl.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</details>"; }
  if(vSp.length){ h+='<div class="odd done-sekcia"><h4>🏠 Mám v špajzi (over pred nákupom)</h4>'; vSp.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; }
  const zasVsetko=zas.concat(manRows.filter(r=>r.ck)); // N1: hotové ručné položky do „Už máme"
  if(zasVsetko.length){ h+='<div class="odd done-sekcia"><h4>✓ Už máme / v košíku</h4>'; zasVsetko.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>h+=riadokNakup(r)); h+="</div>"; }
  box.innerHTML=h;
}
// „začať nákup odznova" — maže len odškrtnutie TOHTO týždňa (kľúč je S.viewOd|surovina)
function vycistiNakup(){ const pre=nakupCheckKey("");
  Object.keys(S.nakupCheck).forEach(k=>{ if(k.indexOf(pre)===0) delete S.nakupCheck[k]; });
  (S.nakupManual||[]).forEach(m=>m.done=false);
  save(); renderNakup(); toast("Odškrtnutie zrušené."); }
// B9: jedna veta v súhrne nákupu, ktorá priznáva rozdiel medzi tým, čo plán sľubuje, a tým,
// čo sa naozaj kupuje. Pod 5 % sa nezobrazuje — to je bežné zaokrúhľovanie porcií, nie chyba dát.
function nakupKryciePokrytieHTML(){
  let d; try{ d=nakupVsPlan(); }catch(e){ return ""; }
  if(!(d.plan>0)) return "";
  const pct=Math.round((d.pomer-1)*100);
  if(Math.abs(pct)<5) return "";
  const preco=d.top.length? " Najviac: "+d.top.map(t=>t.nazov).slice(0,2).join(", ")+"." : "";
  return `<span class="info nak-pokrytie" style="flex-basis:100%" title="Plán a Výživa počítajú s kurátorovanou hodnotou kcal na porciu, nákup kupuje suroviny. Rozdiel znamená, že v týchto receptoch si suroviny a deklarované kalórie nesedia.">`+
    `⚠️ Nákup pokrýva ${pct>0?"o "+pct+" % viac":"o "+(-pct)+" % menej"} kalórií, než hlási plán.${preco}</span>`;
}
function checkNakup(key,val){ tik(); const k=nakupCheckKey(key); S.nakupCheck[k]=val; if(!val)delete S.nakupCheck[k]; save(); renderNakup(); }
function pridajNakupPolozku(){ const el=document.getElementById("nakup-manual"); if(!el)return; const v=(el.value||"").trim(); if(!v)return;
  const m=v.match(/^(.*?)[\s,]+(\d+(?:[.,]\d+)?\s*\S*)$/); // N1: "mlieko 2 l" → názov + množstvo
  let nazov=v, mnoz=""; if(m){ nazov=m[1].trim(); mnoz=m[2].trim(); }
  const p=najdiPotravinu(nazov); // N1: auto-oddelenie zo slovníka potravín
  S.nakupManual.push({id:"m"+(S.spSid++),nazov:nazov,mnoz:mnoz,odd:p?p.oddelenie:"Ostatné",done:false}); el.value=""; save(); renderNakup(); }
function checkManual(id,val){ tik(); const m=S.nakupManual.find(x=>x.id===id); if(m){m.done=val;save();renderNakup();} }
function zmazManual(id){ S.nakupManual=S.nakupManual.filter(x=>x.id!==id); save(); renderNakup(); }
// Rozpis musí byť z TOHO ISTÉHO výpočtu ako nákup (nakupPolozky.zdroje), nie z hrubého i.mnozstvo —
// inak tu svieti množstvo na 1 porciu receptu a v nákupe prepočítané na plán, a nesedí to.
function surovinaInfo(key,nazov){ const n=bezDia(nazov||key);
  const G=nakupPolozky().grp[key];
  const zdroje=(G&&G.zdroje)||[];
  let nah=[]; for(const k in SUBSTITUCIE){ if(n.includes(bezDia(k))){ nah=SUBSTITUCIE[k]; break; } }
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${escHtml(nazov||key)}</h2></div><div class="content2">`;
  h+=`<h4 class="sekcia">🍲 V ktorom recepte (z plánu)</h4>`;
  if(G) h+=`<p class="info" style="margin-top:0">Spolu na nákup: <b>${zobrazMnozstvo(G)}</b></p>`;
  if(!zdroje.length){ // „podľa chuti" položky nemajú množstvo — aspoň ukáž, ktoré recepty ju používajú
    planovaneRecepty().forEach(r=>{ if((r.ingrediencie||[]).some(i=>{const nn=bezDia(i.nazov);return nn.includes(n)||n.includes(nn.split(" ")[0]);})
      && !zdroje.some(z=>z.id===r.id)) zdroje.push({recept:r.nazov,id:r.id,ing:"",mn:null}); }); }
  h+= zdroje.length? zdroje.map(z=>{ const r=receptById(z.id);
      return `<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvor('${z.id}')"><span class="nm">${(r&&ikony[r.kategoria])||"🍴"} ${escHtml(z.recept)}${z.ing&&z.ing!==(G&&G.nazov)?` <small class="meta2">(${escHtml(z.ing)})</small>`:""}</span><span class="kc">${z.mn==null?"podľa chuti":escHtml(prevodJednotka(z.mn,z.jednotka))}</span></div>`; }).join("")
    : '<p class="info">V aktuálnom pláne túto surovinu nepoužíva žiadny recept.</p>';
  h+='<h4 class="sekcia">🔄 Čím nahradiť</h4>';
  h+= nah.length? `<p>${nah.join(", ")}</p>` : '<p class="info">Pre túto surovinu nemám návrh náhrady.</p>';
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function nakupText(){ // len nekúpené položky (pre kopírovanie/zdieľanie)
  // C4: položky zo špajze sa NEVYNECHÁVAJÚ — v obchode by chýbali, keď sa zásoba medzitým minula.
  // Idú na koniec s poznámkou „mám doma".
  const rows=nakupItems().filter(r=>!r.ck);
  const text=r=>r.nazov+" "+r.mnoz.replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
  // B5+: aj v skopírovanom zozname musí byť vidieť, že cenu tejto položky nepoznáme
  const text2=r=>text(r)+(r.bezCeny?" (cenu nepoznám)":"");
  const riadky=rows.filter(r=>!r.vSpajzi).map(text2);
  (S.nakupManual||[]).filter(m=>!m.done).forEach(m=>riadky.push(m.nazov));
  rows.filter(r=>r.vSpajzi).forEach(r=>riadky.push(text2(r)+" (mám doma)"));
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
  renderDashTyzden();
  renderDashStravnici();
  renderDnesPlan();
  vyberDnes();
  const fav=RECEPTY.filter(r=>S.fav[r.id]).slice(0,4);
  document.getElementById("dash-fav").innerHTML = fav.length? fav.map(r=>'<div class="card">'+kartaHTML(r)+'</div>').join("") : '<p class="info">Zatiaľ žiadne obľúbené — klikni na ★ pri recepte.</p>';
  // mini-štatistika + naposledy varené ako karty
  const favN=Object.keys(S.fav).length;
  const poc={}; S.uvarene.forEach(u=>poc[u.id]=(poc[u.id]||0)+1);
  let najId=null,najN=0; for(const id in poc){ if(poc[id]>najN){najN=poc[id];najId=id;} }
  const najR=najId?receptById(najId):null;
  const statLine=`<div class="hist-stats">❤️ <b>${favN}</b> obľúbených${najR&&najN>1?` · 🍳 najčastejšie varíš <b>${escHtml(najR.nazov)}</b> (${najN}×)`:""}</div>`;
  const hist=S.uvarene.slice(0,6).map(u=>{const r=receptById(u.id);return r?`<span class="hist-item">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)} <span class="hist-date">${escHtml(u.datum)}</span></span>`:null;}).filter(Boolean);
  document.getElementById("dash-hist").innerHTML = statLine + (hist.length? '<div class="hist-wrap">'+hist.join("")+'</div>' : '<p class="info">Nič zatiaľ. Po dokončení režimu varenia sa recept zapíše sem.</p>');
  renderDashSpajza(); renderOkno();
  S.viewOd=povodnyViewOd; // vráť späť — Plán nech ostane na týždni, ktorý si si zvolil
}
function uvarZoSpajze(){ prepni("spajza"); domaZoSpajze(); }
// B5: stravníci s RÔZNYMI kalóriami sú to, čo táto appka vie a konkurencia nie — a boli schovaní
// v Nastaveniach pod ⚙️. Na Domove je z nich jeden riadok a editor na jedno ťuknutie.
function renderDashStravnici(){ const el=document.getElementById("dash-stravnici"); if(!el)return;
  normStravnici(); const l=stravniciList();
  const zoz=l.map(p=>'<span class="strav-chip"><b>'+escHtml(p.nazov||"—")+'</b> '+(p.kcal||S.profil.kcal||0)+' kcal</span>').join("");
  const rozne=l.length>1 && l.some(p=>(p.kcal||0)!==(l[0].kcal||0));
  el.innerHTML='<div class="strav-riadok">'+zoz+'<button class="btn" onclick="otvorStravnici()">✎ Upraviť</button></div>'
    +'<p class="info" style="margin:7px 0 0">'+(l.length===1
      ? 'Varíš pre seba. Ak varíš pre viacerých, pridaj ich sem — appka rozdelí jednu várku podľa kalórií každého.'
      : (rozne? 'Každý má vlastný kalorický cieľ — porcie z jednej várky sa podľa toho rozdelia.'
              : 'Všetci majú rovnaký cieľ. Ak má niekto iný, prepíš mu kcal a porcie sa prerozdelia.'))+'</p>';
  zpristupniKliky(el); }
function stravniciRiadkyHTML(callback){ normStravnici(); const l=stravniciList(); const IST="padding:9px;border:1px solid var(--line);border-radius:10px";
  return l.map((p,i)=>'<div class="strav-row"><input value="'+escHtml(p.nazov||"")+'" onchange="zmenStravnika('+i+',\'nazov\',this.value)" placeholder="meno" title="meno stravníka" style="flex:1 1 110px;min-width:0;'+IST+'">'
    +'<input type="number" inputmode="numeric" value="'+(p.kcal||"")+'" onchange="zmenStravnika('+i+',\'kcal\',this.value)" title="kcal za deň" aria-label="kcal za deň — '+escHtml(p.nazov||("stravník "+(i+1)))+'" style="flex:0 0 92px;width:92px;'+IST+'">'
    +(l.length>1?'<button class="lnk strav-x" onclick="zmazStravnika('+i+');'+callback+'" title="odobrať stravníka" aria-label="Odobrať stravníka '+escHtml(p.nazov||(i+1))+'">✕</button>':"")
    +'</div>').join(""); }
function otvorStravnici(){ document.getElementById("pick-modal").innerHTML=
    '<div class="hero"><button class="close" onclick="zavriPick();renderDash()">✕</button><h2>👥 Pre koho varíš</h2><div class="subx">Meno a kalorický cieľ na deň. Jedna várka, porcie podľa cieľa každého.</div></div><div class="content2" id="stravnici-modal"></div>';
  renderStravniciModal(); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function renderStravniciModal(){ const box=document.getElementById("stravnici-modal"); if(!box)return;
  box.innerHTML=stravniciRiadkyHTML("renderStravniciModal()")
    +'<button class="btn ghost" onclick="pridajStravnika();renderStravniciModal()">+ Pridať stravníka</button>'
    +'<div class="tipy" style="margin-top:12px">Súčet: <b>'+stravniciList().reduce((a,p)=>a+(p.kcal||0),0)+' kcal/deň</b> za celú domácnosť. Podľa toho sa počítajú porcie aj nákup.</div>'
    +'<div class="btn-row" style="margin-top:14px;justify-content:flex-end"><button class="btn primary" onclick="zavriPick();renderDash();if(_curView===\'planovac\')renderPlan()">Hotovo</button></div>';
  zpristupniKliky(box); zpristupniFormulare(box); }
// Pás týždňa (koncepcia B): sedem dní, kcal na deň a POD nimi prúžok vo farbe bloku.
// Farba je len opakovanie toho, čo hovorí písmeno v titulku a v pláne — nikdy nie jediný nosič.
function renderDashTyzden(){
  const el=document.getElementById("dash-tyzden"); if(!el)return;
  const dnes=dnesDi();
  let h="";
  for(let di=0;di<7;di++){ let kc=0;
    slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)kc+=kcalPorcia(r)*f; }); });
    const bi=blokIndex(di); const pism=blokPismeno(bi);
    const popis=DNI[di]+(S.blokMode?" · blok "+pism:"")+" · "+(kc?Math.round(kc)+" kcal":"nič v pláne");
    h+=`<div class="d${di===dnes?" dnes":""}" title="${escHtml(popis)}"><span class="kc">${kc?Math.round(kc):"–"}</span>`
      +`<span class="dn">${DNI[di].slice(0,2)}${S.blokMode?" "+pism:""}</span>`
      +`<span class="pr ${S.blokMode?blokTrieda(bi):""}"></span></div>`; }
  el.innerHTML=h;
}
function renderDnesPlan(){
  const el=document.getElementById("dnes-plan"); if(!el)return;
  // S.viewOd je tu už prepnutý na reálny týždeň (rieši renderDash, jediný volajúci).
  // Kliky sa však vykonajú NESKÔR, preto si so sebou nesú vlastné prepnutie.
  const naTentoTyzden="S.viewOd=pondelokPre(dnesISO());";
  const di=(new Date().getDay()+6)%7;
  let hVar="";
  if(S.blokMode){ bloky().forEach((bk,idx)=>{ if((bk[0]+6)%7!==di)return;
    hVar+=`<div class="dnes-varenie-hero ${blokTrieda(idx)}"><b>${znakBloku(idx)} 🍳 Dnes večer treba navariť — Blok ${blokPismeno(idx)} (na ${bk.length} dni)</b>`;
    slotyDna(bk[0]).forEach(sl=>{ const ids=slotIds(bk[0],sl); if(!ids.length)return;
      ids.forEach(cid=>{ const k=komponent(cid); if(!k)return; const por=porcieSlotBlok(bk[0],sl,cid);
        hVar+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span>${pripravaVopred(k)?"⏰ ":""}${escHtml(k.nazov)} <small>(${por} porcií)</small></span></div>`; }); });
    hVar+=`<button class="lnk" style="font-size:13px;min-height:24px" onclick="${naTentoTyzden}planVarenia(${bk[0]})">celý plán varenia →</button></div>`;
  }); }
  let h="",kc=0,b=0,t=0,sx=0,any=false;
  slotyDna(di).forEach(sl=>{ const ids=slotIds(di,sl); const f=pf(di,sl);
    if(!ids.length){ h+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span class="info">—</span></div>`; return; }
    any=true;
    const mena=ids.map(cid=>{const k=komponent(cid); if(!k)return null; kc+=kcalPorcia(k)*f; const v=vyzivaReceptu(k); b+=v.b*f;t+=v.t*f;sx+=v.s*f;
      // odkaz na jedlo mal 18 px (pod hranicou 24 px z CLAUDE.md) a ako <span onclick> nebol
      // dosiahnuteľný klávesnicou — <button class="lnk"> rieši oboje, výška je v CSS
      return k._priloha?("+ "+escHtml(k.nazov)):`<button type="button" class="lnk sur-klik" onclick="${naTentoTyzden}otvor('${cid}',{di:${di},slot:'${sl}'})">${escHtml(k.nazov)}</button>`;}).filter(Boolean).join(", ");
    h+=`<div class="dnes-row"><span class="dnes-slot">${S.blokMode?znakBloku(blokIndex(di)):""} ${ikony[sl]||""} ${sl}</span><span>${mena}</span></div>`;
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
  const thumb=thumbHTML(r,false);
  el.innerHTML=`<div class="${thumbTrieda(r)}">${thumb}</div><div style="flex:1"><div class="nm">${escHtml(r.nazov)}</div><div class="mt">${escHtml([r.kategoria,r.cas,kcalPorcia(r)+" kcal"].filter(Boolean).join(" · "))}</div></div>
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
  out.innerHTML = navrhy.length ? navrhy.map(x=>`<div class="match"><b style="cursor:pointer" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${escHtml(x.r.nazov)}</b><div class="info" style="margin-top:4px">využije: ${escHtml(x.zhoda.slice(0,5).join(", "))}</div></div>`).join("") : '<p class="info">Nenašiel som recept, čo by využil rovnaké suroviny.</p>';
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
    h+=`<div class="sp-row"><span>${r._priloha?"+ ":""}<b>${escHtml(r.nazov)}</b> <span class="meta2">${escHtml(sl)}</span></span><span class="meta2">${Math.round(v.kcal*f)} kcal · B ${fmt(v.b*f)} · T ${fmt(v.t*f)} · S ${fmt(v.s*f)}</span></div>`; }); });
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
    const bi=blokIndex(i);
    ch+=`<div class="col"${sel} title="Zobraziť deň${S.blokMode?" · blok "+blokPismeno(bi):""}" onclick="vyzivaBar(${i})"><span class="v" style="${over?'color:var(--warn)':''}">${d.kc||""}</span><div class="bar2" style="height:${hgt}%">${seg}</div><span class="pruh-bloku ${S.blokMode?blokTrieda(bi):""}"></span><span class="d">${DNI[i].slice(0,2)}${S.blokMode?" "+blokPismeno(bi):""}</span></div>`; });
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
    ${makroBar("🟩","Bielkoviny","var(--blok-b)",src.b,cm?cm.b:0)}
    ${makroBar("🟨","Tuky","var(--blok-c)",src.t,cm?cm.t:0)}
    ${makroBar("🟫","Sacharidy","var(--blok-a)",src.s,cm?cm.s:0)}
    <p class="info" style="margin-top:6px">${isDen?DNI[vyzivaDi]:"Priemer na deň"}${cm?" oproti cieľu (z "+ciel+" kcal)":""}.</p>`;
  // ciele stravníkov
  const strav=stravniciList(); const sp=document.getElementById("vyziva-stravnici");
  if(sp) sp.innerHTML = strav.map(p=>{ const k=p.kcal||S.profil.kcal||0; const m=cieloveMakra(k);
    return `<div class="sp-row"><span><b>${escHtml(p.nazov||"Stravník")}</b></span><span class="meta2">${k} kcal · B ${m?m.b:"–"} g · T ${m?m.t:"–"} g · S ${m?m.s:"–"} g</span></div>`; }).join("");
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
function naplnKohoSelect(){ const s=document.getElementById("t-koho"); if(!s)return; const l=stravniciList(); const cur=parseInt(s.value); s.innerHTML=l.map((p,i)=>`<option value="${i}">${escHtml(p.nazov||("Osoba "+(i+1)))}</option>`).join(""); if(cur>=0&&cur<l.length)s.value=cur; }
function zalohuj(){ try{ const blob=new Blob([JSON.stringify(S)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="kucharka-zaloha.json"; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ toast("Zálohovanie zlyhalo."); } }
// Obnova zo zálohy je najnedôveryhodnejší vstup do appky — používateľ vyberie ľubovoľný súbor
// z disku. Preto: platný JSON → objekt → aspoň jedno známe pole kuchárky → očistenie typov.
// Bez toho stačilo obnoviť cudzí JSON a appka sa už nikdy nenaštartovala.
function jeZalohaKucharky(o){ if(!jeObjekt(o)) return false;
  for(const k in STAV_TYPY){ if(Object.prototype.hasOwnProperty.call(o,k)) return true; }
  return false; }
function obnov(file){ if(!file)return; const rd=new FileReader(); rd.onload=e=>{
  let o;
  try{ o=JSON.parse(e.target.result); }
  catch(err){ toast("Súbor sa nedá prečítať — nie je to platný JSON. Vyber súbor kucharka-zaloha.json zo Zálohovania."); return; }
  if(!jeZalohaKucharky(o)){ toast("Toto nie je záloha kuchárky — súbor neobsahuje žiadne známe dáta (plán, obľúbené, špajza…). Vyber súbor kucharka-zaloha.json."); return; }
  const poc=Object.keys(o).length; const cisty=ocistiVstup(o,STAV_TYPY); const zahodene=poc-Object.keys(cisty).length;
  S=normalizujStav(Object.assign(S,cisty)); save();
  toast(zahodene>0 ? ("Obnovené, "+zahodene+" poškodených polí som preskočil. Stránka sa načíta znova.")
                   : "Obnovené. Stránka sa načíta znova.");
  location.reload(); }; rd.readAsText(file); }
async function resetApp(){ if(!await confirmModal("Naozaj vymazať VŠETKY dáta (obľúbené, plán, špajza, profil, história)? Táto akcia sa nedá vrátiť."))return;
  if(!await confirmModal("Posledné varovanie — appka sa vráti do úvodného stavu. Pokračovať?"))return;
  try{ localStorage.removeItem(LS); }catch(e){} location.reload(); }
function normStravnici(){ if(!Array.isArray(S.profil.stravnici)||!S.profil.stravnici.length){ S.profil.stravnici=stravniciList(); } S.profil.osoby=S.profil.stravnici.length; }
function renderStravnici(){ const box=document.getElementById("stravnici-box"); if(!box)return; const l=stravniciList();
  box.innerHTML=stravniciRiadkyHTML("renderStravnici()"); naplnKohoSelect(); zpristupniFormulare(box); if(document.getElementById("stravnici-modal"))renderStravniciModal(); } // D6: menovky aj pre dynamicky vykreslené polia
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
function auMsg(t,err){ const m=document.getElementById("au-msg"); if(m){ m.textContent=t; m.style.color=err?"var(--signal)":"var(--blok-c)"; } }
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
      <b style="cursor:pointer" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${escHtml(x.r.nazov)}</b>
      <span style="color:var(--muted);font-size:14px;white-space:nowrap">${x.mame}/${x.spolu}</span></div>
    <div class="bar"><i style="width:${x.pct}%"></i></div>
    ${x.chyba.length?`<div style="font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;align-items:center"><span>${x.chyba.length<=2?'<b style="color:var(--accent-txt)">Chýba len:</b> ':'Chýba: '}${escHtml(x.chyba.slice(0,6).join(", "))}${x.chyba.length>6?"…":""}</span><button class="mini" onclick="pridajChybajuceDoNakupu('${x.r.id}')">+ do nákupu</button></div>`:'<div style="font-size:13px;color:var(--accent)">Máš všetko! 🎉</div>'}
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
  dl.innerHTML=mena.map(m=>`<option value="${escHtml(m)}"></option>`).join(""); }
function aktualizujJednotky(){ const sel=document.getElementById("sp-jed"); if(!sel)return;
  const nazov=(document.getElementById("sp-nazov")||{}).value||""; const p=najdiPotravinu(nazov); const cur=sel.value;
  const u=povoleneJednotky(p); sel.innerHTML=u.map(x=>`<option>${escHtml(x)}</option>`).join(""); if(u.includes(cur))sel.value=cur;
  const ex=document.getElementById("sp-exp"); if(ex&&!ex.value&&nazov.trim()){ ex.value=navrhExpiry(nazov,(document.getElementById("sp-miesto")||{}).value); } } // S1: predvyplň odhad expirácie
function pridajZasobu(){ const nazov=document.getElementById("sp-nazov").value.trim(); if(!nazov){toast("Zadaj surovinu.");return;}
  const p=najdiPotravinu(nazov);
  const miesto=document.getElementById("sp-miesto").value;
  S.spajza.push({id:S.spSid++,nazov:nazov,kluc:p?p.kluc:"",mnozstvo:parseFloat(document.getElementById("sp-mn").value)||0,jednotka:document.getElementById("sp-jed").value,miesto:miesto,expiry:document.getElementById("sp-exp").value||navrhExpiry(nazov,miesto),min:parseFloat(document.getElementById("sp-min").value)||0}); // S1: fallback odhad expirácie
  save(); ["sp-nazov","sp-mn","sp-exp","sp-min"].forEach(id=>document.getElementById(id).value=""); aktualizujJednotky(); renderSpajza(); }
function zmazZasobu(id){ S.spajza=S.spajza.filter(x=>x.id!==id); save(); renderSpajza(); }
function upravZasobu(id,dir){ const it=S.spajza.find(x=>x.id===id); if(!it)return; const k=krokPreJednotku(it.jednotka);
  it.mnozstvo=Math.max(0,Math.round((it.mnozstvo+dir*k)*100)/100); save(); renderSpajza(); }
function upravSpajzu(id){ const x=S.spajza.find(s=>s.id===id); if(!x)return; const st="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px";
  const jedn=povoleneJednotky(najdiPotravinu(x.nazov)); if(!jedn.includes(x.jednotka))jedn.unshift(x.jednotka);
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Upraviť: ${escHtml(x.nazov)}</h2></div><div class="content2">
    <div class="field"><label>Množstvo</label><input type="number" id="up-mn" value="${x.mnozstvo}" style="${st}"></div>
    <div class="field"><label>Jednotka</label><select class="f" id="up-jed">${jedn.map(u=>`<option ${u===x.jednotka?"selected":""}>${escHtml(u)}</option>`).join("")}</select></div>
    <div class="field"><label>Miesto</label><select class="f" id="up-miesto">${["Špajza","Chladnička","Mraznička"].map(m=>`<option ${m===x.miesto?"selected":""}>${m}</option>`).join("")}</select></div>
    <div class="field"><label>Dátum spotreby</label><input type="date" id="up-exp" value="${x.expiry||""}" style="${st}"></div>
    <div class="field"><label>Minimum (0 = vypnuté)</label><input type="number" id="up-min" value="${x.min||0}" style="${st}"></div>
    <div class="btn-row"><button class="btn primary" onclick="ulozSpajzu(${id})">Uložiť</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function ulozSpajzu(id){ const x=S.spajza.find(s=>s.id===id); if(!x)return;
  x.mnozstvo=parseFloat(document.getElementById("up-mn").value)||0; x.jednotka=document.getElementById("up-jed").value; x.miesto=document.getElementById("up-miesto").value; x.expiry=document.getElementById("up-exp").value||""; x.min=parseFloat(document.getElementById("up-min").value)||0;
  save(); zavriPick(); renderSpajza(); }
function spRow(x){ const low=x.min>0&&x.mnozstvo<x.min;
  return `<div class="sp-row"><span><b>${escHtml(x.nazov)}</b> <span class="meta2">${fmt(x.mnozstvo)} ${escHtml(x.jednotka)}${x.min?" · min "+fmt(x.min):""}${low?' <span class="low">(doplniť)</span>':""}${x.expiry?' · <span class="'+expTrieda(x.expiry)+'">'+expText(x.expiry)+'</span>':""}</span></span><span style="display:flex;gap:6px;align-items:center"><button class="mini" onclick="upravZasobu(${x.id},-1)">−</button><button class="mini" onclick="upravZasobu(${x.id},1)">+</button><button class="mini" onclick="upravSpajzu(${x.id})">✎</button><a onclick="zmazZasobu(${x.id})" style="color:var(--warn);cursor:pointer">✕</a></span></div>`; }
const SPAJZA_MIESTA=["Chladnička","Mraznička","Špajza"];
// S5: položka s neznámym `miesto` (zo synchronizácie, importu alebo staršej verzie) sa nevykreslila
// v ŽIADNEJ z troch sekcií — bola neviditeľná, ale `spajzaGramy` ju ďalej odrátaval z nákupu a
// nedala sa ani zmazať. Preto je zoskupenie vlastná funkcia s tvrdým pravidlom: každá položka
// špajze musí skončiť práve v jednej sekcii (stráži to test).
function spajzaSkupiny(){ const sk=[];
  const soon=(S.spajza||[]).filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=4;}).sort((a,b)=>dniDo(a.expiry)-dniDo(b.expiry));
  if(soon.length) sk.push({nadpis:"⏰ Spotrebuj čoskoro",polozky:soon,duplicit:true}); // upozornenie, položka je aj vo svojej sekcii
  const zorad=arr=>arr.slice().sort((a,b)=>String(a.nazov||"").localeCompare(String(b.nazov||""),"sk"));
  SPAJZA_MIESTA.forEach(m=>{ const arr=(S.spajza||[]).filter(x=>x.miesto===m); if(arr.length) sk.push({nadpis:m,polozky:zorad(arr)}); });
  const inde=(S.spajza||[]).filter(x=>!SPAJZA_MIESTA.includes(x.miesto));
  if(inde.length) sk.push({nadpis:'📦 Bez zaradenia <span class="info">(neznáme miesto — oprav cez ✎ alebo zmaž)</span>',polozky:zorad(inde)});
  return sk; }
function renderSpajza(){ const box=document.getElementById("spajza-list"); if(!box)return;
  if(!S.spajza.length){ box.innerHTML='<p class="info">Zatiaľ prázdne. Pridaj zásoby vyššie.</p>'; return; }
  let h="";
  spajzaSkupiny().forEach(s=>{ h+=`<div class="odd"><h4>${s.nadpis}</h4>`; s.polozky.forEach(x=>h+=spRow(x)); h+="</div>"; });
  box.innerHTML=h; }
function renderDashSpajza(){ const el=document.getElementById("dash-spajza"); if(!el)return;
  const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=4;}).sort((a,b)=>dniDo(a.expiry)-dniDo(b.expiry));
  const low=S.spajza.filter(x=>x.min>0&&x.mnozstvo<x.min); let h="";
  if(soon.length) h+="⏰ "+soon.map(x=>escHtml(x.nazov)+' <span class="'+expTrieda(x.expiry)+'">('+escHtml(expText(x.expiry))+')</span>').join(", ")+"<br>";
  if(low.length) h+="🛒 Doplniť: "+low.map(x=>escHtml(x.nazov)).join(", ");
  el.innerHTML=h||"Špajza je v poriadku."; }
function domaZoSpajze(){ document.getElementById("doma-in").value=S.spajza.map(x=>x.nazov).join(", "); renderDoma(); }
function expBoost(r){ const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=5;}).map(x=>x.nazov.toLowerCase());
  if(!soon.length)return 0; return (r.ingrediencie||[]).some(i=>{const nn=i.nazov.toLowerCase();return soon.some(sx=>nn.includes(sx)||sx.includes(nn.split(" ")[0]));})?1.5:0; }
// S3: zásoby tej istej suroviny sa míňajú FIFO — najskôr tá, ktorá expiruje najskôr. Predtým sa
// brala len PRVÁ nájdená položka (`find`), takže pri dvoch balíčkoch s rôznou expiráciou sa druhý
// nikdy nepoužil a zvyšok potreby sa ticho stratil (Math.max(0,…) ho zjedol).
// S4: `porcie`/`velkost` sa dajú zadať zvonka. Bez nich sa použije stav detailu receptu (aktPorcie),
// čo je správne len keď je otvorený TENTO recept — odpis receptu mimo plánu inak škáloval cudzím
// počtom porcií.
function spajzaKandidati(nazov,p){ const kk=p?p.kluc:"";
  return (S.spajza||[]).filter(x=>{ if(!(x.mnozstvo>0))return false;
      const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||""; if(kk&&xk&&kk===xk)return true;
      const a=bezDia(x.nazov),b=bezDia(nazov); return a.includes(b)||b.includes(a.split(" ")[0]); })
    .sort((a,b)=>{ const da=dniDo(a.expiry), db=dniDo(b.expiry);
      if(da===db)return 0; if(da===null)return 1; if(db===null)return -1; return da-db; }); }
function odpisRecept(r,porcie,velkost){ if(!r)return; if(!S.spajza.length){toast("Špajza je prázdna.");return;}
  const fPocet=(porcie!=null?porcie:(aktualny===r.id?aktPorcie:(r.porcie||1)))/(r.porcie||1);
  const fVelkost=velkost!=null?velkost:(aktualny===r.id?aktVelkost:1);
  let zmen=0, neviem=0;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null)return; const p=najdiPotravinu(i.nazov);
    const kand=spajzaKandidati(i.nazov,p); if(!kand.length)return;
    let potreba=skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost);
    if(!(potreba>0))return;
    const ji=(i.jednotka||"").toLowerCase().trim();
    let dotkol=false, neprevedol=false;
    for(const it of kand){ if(!(potreba>0))break;
      const jx=(it.jednotka||"").toLowerCase().trim();
      // koľko jednotiek ZÁSOBY zodpovedá zvyšku potreby
      let treba;
      if(jx===ji) treba=potreba;
      else { const g=gramy({mnozstvo:potreba,jednotka:i.jednotka},p); treba=g>0?gramyNaJed(g,it.jednotka,p):null; }
      if(treba==null||!(treba>0)){ neprevedol=true; break; }
      const uber=Math.min(it.mnozstvo,treba);
      it.mnozstvo=Math.max(0,Math.round((it.mnozstvo-uber)*100)/100); dotkol=true;
      // zvyšok potreby prepočítaj späť do jednotky receptu, nech ho dojedia ďalšie položky
      const zostava=treba-uber;
      if(!(zostava>0)){ potreba=0; break; }
      if(jx===ji) potreba=zostava;
      else { const gz=gramy({mnozstvo:zostava,jednotka:it.jednotka},p); const nz=gz>0?gramyNaJed(gz,i.jednotka,p):null;
        if(nz==null){ potreba=0; neprevedol=true; break; } potreba=nz; }
    }
    if(dotkol)zmen++; else if(neprevedol)neviem++; });
  S.spajza=S.spajza.filter(x=>x.mnozstvo>0); save();
  toast(zmen?("Odpísané zo špajze: "+zmen+" surovín."+(neviem?" ("+neviem+" sa nedalo previesť)":""))
            :"Nenašla sa zhoda (skontroluj názvy v špajzi)."); }
function toggleMenu(id){ document.querySelectorAll(".menu").forEach(m=>{ if(m.id!==id)m.classList.remove("open"); }); const el=document.getElementById(id); if(el)el.classList.toggle("open"); }
function zavriMenu(){ document.querySelectorAll(".menu").forEach(m=>m.classList.remove("open")); }
document.addEventListener("click",e=>{ if(!e.target.closest(".menu-wrap")) zavriMenu(); });
function otvorNacitat(){ const all=vsetkyJedalnicky(); if(!all.length){ toast("Zatiaľ žiadne uložené jedálničky. Najprv daj ⋯ Viac → Uložiť tento plán."); return; }
  const z=all.slice().sort((a,b)=>(b.od||b.id||"").localeCompare(a.od||a.id||""));
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Načítať jedálniček</h2></div><div class="content2" style="max-height:60vh;overflow:auto">';
  z.forEach(j=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nacitajJedalnicekId('${escHtml(String(j.id).replace(/\\/g,"\\\\").replace(/'/g,"\\'"))}')"><span class="nm">${(String(j.id)[0]==="a"?"🖫 ":"📅 ")}${escHtml(j.nazov||j.id)}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
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
    h+=`<div class="day${iso===dnes?' dnes':''}" style="cursor:pointer" title="Ísť na týždeň tohto dňa v Pláne" onclick="skokNaTyzdenDna('${iso}')"><div class="dn">${d}${naplanovane?'<span class="plan-dot" title="naplánované">●</span>':''}</div>${ev.map(n=>`<div class="ev" title="${escHtml(n)}">${escHtml(n)}</div>`).join("")}</div>`; }
  h+="</div>"; if(!(S.uvarene||[]).length) h+='<p class="info" style="margin-top:10px">Zatiaľ žiadna história. Po dokončení režimu varenia sa jedlo zapíše do kalendára.</p>';
  grid.innerHTML=h; }
function planVarenia(di){ const dni=blokDni(di); const den=S.plan[datumPre(dni[0])]||{};
  const bi=bloky().findIndex(b=>b[0]===dni[0]); const pism=String.fromCharCode(65+(bi<0?0:bi)); const vari=DNI[(dni[0]+6)%7].slice(0,2);
  let h=`<div class="hero"><button class="close" onclick="zavri()">✕</button><h2>🍳 Plán varenia — Blok ${pism}</h2><div class="subx">${escHtml(vetaBloku(dni))} Navaríš raz, ješ ${dni.length} ${dni.length===1?"deň":(dni.length<5?"dni":"dní")}.</div></div><div class="content2">`;
  let any=false;
  slotyDna(dni[0]).forEach(sl=>{ const ids=slotIds(dni[0],sl); if(!ids.length)return; any=true; h+=`<h4 class="sekcia">${ikony[sl]||""} ${sl}</h4>`;
    ids.forEach(cid=>{ const k=komponent(cid); if(!k)return; const por=porcieSlotBlok(dni[0],sl,cid); const btn=k._priloha?"":`<button class="mini" onclick="zavri();otvor('${cid}',{di:${dni[0]},slot:'${sl}'})">recept</button>`;
      h+=`<div class="sp-row"><span><b>${pripravaVopred(k)?"⏰ ":""}${escHtml(k.nazov)}</b> <span class="meta2">${por} porcií · ${Math.round(kcalPorcia(k))} kcal/porcia</span></span>${btn}</div>`; }); });
  if(!any) h+='<p class="info">V tomto bloku nie sú naplánované jedlá. Zostav jedálniček alebo klikni do buniek.</p>';
  else h+=`<div class="tipy">💡 Navar dávku na celý blok (${dni.length} dni × ${stravniciList().length} os.). Presné porcie sú pri každom jedle; suroviny spolu nájdeš v Nákupe.</div>`;
  h+="</div>"; document.getElementById("modal").innerHTML=h; document.getElementById("overlay").classList.add("open"); document.body.style.overflow="hidden"; _fokusDoModalu("modal"); }
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
  const dots=v.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.5" fill="var(--akcent)"></circle>`).join("");
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
// ZLYHANÝ PUSH NESMIE POSUNÚŤ _ts. Pôvodne sa _ts nastavil a uložil PRED fetchom: keď fetch
// padol (výpadok siete v obchode), zariadenie si myslelo, že je novšie ako server — svoje zmeny
// už nikdy nenahralo a cudzie si nikdy nestiahlo. Tichá divergencia. Preto: ts posúvame až po
// úspechu, inak si súbor označíme ako „nenahratý" a skúsime znova po pripojení.
// Anonymná synchronizácia cez „Sync ID" (HOSTING.md, Krok 2B). Pôvodne sa písalo a čítalo
// PRIAMO z tabuľky `kucharka`, čo si vynucovalo RLS politiku `using (true)` — a tá nefiltruje
// podľa `id`, takže ktokoľvek s (verejným) anon kľúčom si mohol stiahnuť aj prepísať riadky
// VŠETKÝCH domácností. Sync ID pritom nechránilo nič, hoci sa volalo tajné.
// Teraz sa ide cez funkcie `sync_nacitaj` / `sync_uloz` (SECURITY DEFINER): tabuľka je pre rolu
// anon zamknutá a Sync ID sa musí PREUKÁZAŤ ako argument, inak sa nevráti nič.
// Staršie projekty tie funkcie nemajú (HTTP 404) — vtedy sa raz prepneme na priamu tabuľku,
// nech existujúce nastavenie neprestane fungovať zo dňa na deň.
let _syncRpc=null; // null = ešte nevieme · true = funkcie · false = priamy prístup do tabuľky
function syncHlavicky(){ return {apikey:SYNC_CONFIG.key,Authorization:"Bearer "+SYNC_CONFIG.key,"Content-Type":"application/json"}; }
async function syncNacitajRiadok(){
  if(_syncRpc!==false){
    const r=await fetch(SYNC_CONFIG.url+"/rest/v1/rpc/sync_nacitaj",{method:"POST",headers:syncHlavicky(),body:JSON.stringify({p_id:syncId()})});
    if(r.ok){ _syncRpc=true; const j=await r.json(); return Array.isArray(j)?j[0]:j; }
    if(r.status!==404) throw new Error("HTTP "+r.status);
    _syncRpc=false; }
  const r2=await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka?id=eq."+encodeURIComponent(syncId())+"&select=data,ts",{headers:syncHlavicky()});
  if(!r2.ok) throw new Error("HTTP "+r2.status);
  const j2=await r2.json(); return Array.isArray(j2)?j2[0]:null; }
async function syncUlozRiadok(ts){
  if(_syncRpc!==false){
    const r=await fetch(SYNC_CONFIG.url+"/rest/v1/rpc/sync_uloz",{method:"POST",headers:syncHlavicky(),body:JSON.stringify({p_id:syncId(),p_data:S,p_ts:ts})});
    if(r.ok){ _syncRpc=true; return; }
    if(r.status!==404) throw new Error("HTTP "+r.status);
    _syncRpc=false; }
  const r2=await fetch(SYNC_CONFIG.url+"/rest/v1/kucharka",{method:"POST",headers:Object.assign(syncHlavicky(),{Prefer:"resolution=merge-duplicates"}),body:JSON.stringify({id:syncId(),data:S,ts})});
  if(!r2.ok) throw new Error("HTTP "+r2.status); }
function syncPush(){ if(!syncNakonfig())return; clearTimeout(syncTimer); syncTimer=setTimeout(async()=>{ const stary=S._ts||0; const ts=Date.now(); try{ setSyncStav("saving");
  await syncUlozRiadok(ts);
  S._ts=ts; S._dirty=false; localStorage.setItem(LS,JSON.stringify(S)); setSyncStav("ok"); }
  catch(e){ S._ts=stary; S._dirty=true; try{localStorage.setItem(LS,JSON.stringify(S));}catch(e2){} setSyncStav("error"); } },1500); }
async function syncPull(){ if(!syncNakonfig())return; try{
  const riadok=await syncNacitajRiadok(); setSyncStav("ok");
  if(riadok&&riadok.data&&riadok.ts>((S._ts)||0)){ S=normalizujStav(Object.assign(S,ocistiVstup(riadok.data,STAV_TYPY))); uloz(S); location.reload(); } }catch(e){ setSyncStav("error"); } }
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
const OSOB_META=["_ts","_osobTs","_skupTs","_uid","_dirty","_osobDirty","_skupDirty"];
function osobneExcl(){ return S.profil.skupinaId ? SHARED_FIELDS : []; }
function zbierOsobne(){ const o={}; const ex=osobneExcl(); for(const k in S){ if(OSOB_META.includes(k)||ex.includes(k))continue; o[k]=S[k]; } return o; }
function pouziOsobne(d){ const ex=osobneExcl(); const c=ocistiVstup(d,STAV_TYPY); for(const k in c){ if(OSOB_META.includes(k)||ex.includes(k))continue; S[k]=c[k]; } S=normalizujStav(S); }
// ponytail: osobný blob = posledný vyhráva; pull pri prihlásení/štarte (nie pri každom fokuse) — pre 1 osobu na viacerých zariadeniach stačí
function syncOsobnePush(hned){ if(!syncMozne()||!authUser())return Promise.resolve(); clearTimeout(osobTimer);
  return new Promise(res=>{ osobTimer=setTimeout(async()=>{ const stary=S._osobTs||0; const ts=Date.now(); try{ setSyncStav("saving");
    const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/pouzivatel_data",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({user_id:authUser().id,data:zbierOsobne(),ts})});
    if(!r.ok)throw new Error("HTTP "+r.status);
    S._osobTs=ts; S._osobDirty=false; uloz(S); setSyncStav("ok"); }
    catch(e){ S._osobTs=stary; S._osobDirty=true; uloz(S); setSyncStav("error"); } res(); }, hned?0:1500); }); }
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
  return new Promise(res=>{ skupTimer=setTimeout(async()=>{ const stary=S._skupTs||0; const ts=Date.now(); try{ setSyncStav("saving");
    const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/skupina_data",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({skupina_id:S.profil.skupinaId,data:zbierZdielane(),ts})});
    if(!r.ok)throw new Error("HTTP "+r.status);
    S._skupTs=ts; S._skupDirty=false; uloz(S); setSyncStav("ok"); }
    catch(e){ S._skupTs=stary; S._skupDirty=true; uloz(S); setSyncStav("error"); } res(); }, hned?0:1500); }); }
async function syncSkupinaPull(){ if(!skupinaNakonfig())return; try{
  const r=await authFetch(SYNC_CONFIG.url+"/rest/v1/skupina_data?skupina_id=eq."+encodeURIComponent(S.profil.skupinaId)+"&select=data,ts");
  const j=await r.json(); setSyncStav("ok"); if(Array.isArray(j)&&j[0]&&j[0].data&&j[0].ts>((S._skupTs)||0)){ const c=ocistiVstup(j[0].data,STAV_TYPY); SHARED_FIELDS.forEach(f=>{ if(c[f]!==undefined)S[f]=c[f]; }); S=normalizujStav(S); S._skupTs=j[0].ts; uloz(S);
    if(typeof renderPlan==="function")renderPlan(); if(typeof renderNakup==="function")renderNakup(); if(typeof renderDash==="function")renderDash(); } }catch(e){ setSyncStav("error"); } }
// Zmena spravená offline sa musí sama dotlačiť, keď sa sieť vráti — inak by nákupný zoznam
// odškrtnutý v obchode ostal len v telefóne až do najbližšieho uloženia.
function syncDotlac(){ if(S._dirty)syncPush(); if(S._osobDirty)syncOsobnePush(true); if(S._skupDirty)syncSkupinaPush(true); }
window.addEventListener("online",syncDotlac);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden){
  // Nenahraté lokálne zmeny majú prednosť: pull by ich prepísal serverovou (staršou) verziou.
  if(S._skupDirty||S._osobDirty||S._dirty){ syncDotlac(); return; }
  syncSkupinaPull(); } });
// --- PWA: service worker, aktualizácia, manifest -------------------------------------------
// sw.js dokument cachuje štýlom stale-while-revalidate: appka nabehne okamžite z cache
// a nový build sa ťahá na pozadí. Bez tohto oznámenia by používateľ videl starú verziu
// a nevedel, že stačí obnoviť stránku — najčastejšia chyba PWA.
let _novaVerziaOznamena=false;
function oznamNovuVerziu(){ if(_novaVerziaOznamena)return; _novaVerziaOznamena=true;
  if(typeof toast==="function") toast("🔄 Stiahla sa nová verzia kuchárky — obnov stránku a načíta sa."); }
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.addEventListener("message",e=>{ if(e.data&&e.data.typ==="nova-verzia")oznamNovuVerziu(); });
  navigator.serviceWorker.register('sw.js').then(reg=>{
    reg.addEventListener("updatefound",()=>{ const w=reg.installing; if(!w)return;
      w.addEventListener("statechange",()=>{ if(w.state==="installed" && navigator.serviceWorker.controller) oznamNovuVerziu(); }); });
    return navigator.serviceWorker.ready;
  }).then(reg=>{
    // SW nevie, ako sa súbor appky volá (kucharka.html na Netlify, index.html na GitHub Pages).
    // Bez tohto by po ÚPLNE prvom otvorení nebolo v cache nič a offline režim by nefungoval.
    const w=(reg&&reg.active)||navigator.serviceWorker.controller;
    if(w)w.postMessage({typ:"precache",url:location.href.split("#")[0]});
  }).catch(()=>{});
}
// Manifest zo šablóny má ešte zelené farby spred témy Organic a nemá start_url ani id:
// splash screen aj farba v prepínači úloh boli zelené a zmena URL by vyrobila druhú inštaláciu.
// Prepíšeme ho z reálneho <meta name="theme-color">, takže sa nemôže rozísť s témou.
(function opravManifest(){ try{
  const link=document.querySelector("link[rel=manifest]"), ico=document.querySelector("link[rel=icon]");
  if(!link||!ico)return;
  const tc=document.querySelector('meta[name="theme-color"]:not([media*="dark"])')||document.querySelector('meta[name="theme-color"]');
  const farba=(tc&&tc.getAttribute("content"))||"#E7E4DD";
  const start=location.href.split("#")[0], scope=start.replace(/[^/]*$/,"");
  const m={ id:start, name:"Moja kuchárka", short_name:"Kuchárka", lang:"sk", dir:"ltr",
    start_url:start, scope:scope, display:"fullscreen", orientation:"portrait",
    background_color:farba, theme_color:farba,
    icons:[{src:ico.href,sizes:"512x512",type:"image/png",purpose:"any"},
           {src:ico.href,sizes:"512x512",type:"image/png",purpose:"maskable"}] };
  link.href=URL.createObjectURL(new Blob([JSON.stringify(m)],{type:"application/manifest+json"}));
}catch(e){} })();
syncPull();
(async()=>{ try{ if(typeof authUser==="function"&&authUser())await syncOsobnePull(); }catch(e){} syncSkupinaPull(); })();
applyVzhlad(); naplnKuchyne(); renderChips(); renderKolekcie(); renderGrid(); naplnPotravinyDatalist(); aktualizujJednotky(); renderDash(); zbalNaMobile();
zpristupniNav(); zpristupniFormulare(); // E3 + D6
{ const hv=location.hash.slice(1); if(hv && hv!=="domov" && document.getElementById("v-"+hv)) zobrazView(hv); } // E8: obnov obrazovku z deep-linku
if(_prvySpust && !S.profil.onboarded) onboardingModal(); // Onboarding pri prvom spustení
