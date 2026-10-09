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
// FOTO_ZDROJE = atribúcia k fotke (autor, licencia, odkaz) — od 6. 10. 2026 sa NEvykresľuje
// (voľba používateľa); dáta ostávajú, aby sa dala vrátiť.
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
// Kolo 6 (vizuál): ilustrácia (pixel art) nie je fotka jedla — v tmavej téme sa stlmí, v Receptoch ide za fotky.
function jePix(r){ const z=r&&FOTO_ZDROJE&&FOTO_ZDROJE[r.id]; return !!(z&&/pixel art/i.test(z.a||"")); }
function thumbTrieda(r){ return "thumb "+fotoTon(r)+(maFoto(r)?" ma-foto":"")+(jePix(r)?" pix":""); }
const DNI = ["Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota","Nedeľa"];
const VSETKY_SLOTY = ["Raňajky","Desiata","Obed","Olovrant","Večera","Snack"];
const DEFAULT_SLOTY = ["Raňajky","Obed","Večera","Snack"];
function SLOTY(){ const v=S.profil&&S.profil.sloty; const akt=(Array.isArray(v)&&v.length)?v:DEFAULT_SLOTY; return VSETKY_SLOTY.filter(s=>akt.includes(s)); }
const ikony = {"Raňajky":"☕","Desiata":"🥐","Obed":"🍝","Olovrant":"🍏","Večera":"🍽️","Hlavné jedlo":"🍽️","Cestoviny":"🍝","Polievka":"🥣","Šalát":"🥗","Nátierka":"🧈","Snack":"🥪","Dezert":"🍰","Príloha":"🍚","Kokteil":"🍸","Nápoj":"🥤","Pečivo":"🥖"};
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
  if(/napuca|nechaj (napuc|namoc)/.test(s) || (r.ingrediencie||[]).some(i=>/(such|susen)\w* (cicer|fazul|hrach)|(cicer|fazul|hrach)\w* (such|susen)/.test(bezDia(i.nazov)))) return true;
  // kolo 3 (kuchár): chýbalo 80 z 216 receptov — „24 h", „8–12 hodín", „šesť hodín", namáčanie a marináda na hodiny
  return /cez noc|na noc\b|den vopred|vecer vopred|priprav\w* (vecer )?vopred|(?:^|[^\d,.])(?:[6-9]|1\d|2[0-4])(?:\s*[-–]\s*\d+)?\s*(?:hod|h\b)|(?:sest|sedem|osem|devat|desat|dvanast|dvadsatstyri) hod|(?:namoc|marin)\w*(?:(?!najviac)[^.]){0,40}(?:(?:^|[^\d,.])(?:[3-9]|1\d|2[0-4])(?:\s*[-–]\s*\d+)?\s*(?:hod|h\b)|(?:tri|styri|pat|sest|osem) hod|noc)/.test(s); }
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
  fav:"o", hodn:"o", pozn:"o", plan:"o", planF:"o", planM:"o", nakupCheck:"o", skryte:"o", dayPpl:"o",
  slotPpl:"o", daySloty:"o", tyzdenProfil:"o", genCfg:"o", profil:"o", zamky:"o", nakupVarky:"o",
  uvarene:"ao", archiv:"ao", spajza:"ao", vahy:"ao", nakupManual:"ao", mojeRecepty:"ao",
  hranice:"a",
  ciel:"s", domaNakup:"s", mamDoma:"s", bar:"s", akcie:"s", viewOd:"s", _uid:"s",
  spSid:"n", blokV:"n", escV:"n", _ts:"n", _osobTs:"n", _skupTs:"n",
  blokMode:"b", _dirty:"b", _osobDirty:"b", _skupDirty:"b" };
const PROFIL_TYPY={
  stravnici:"ao", sloty:"a",
  osoby:"n", kcal:"n", biel:"n", oknostart:"n",
  ryby:"b", lepok:"b", mlieko:"b", menejSoli:"b", diabetes:"b", domaca:"b", jedenHrniec:"b", dark:"b", temaAuto:"b", big:"b", balenia:"b", okno:"b", kupSnack:"b",
  syncOff:"b", onboarded:"b",
  watch:"s", mimo:"s", zakazane:"s", zdrojeOff:"s", cielTyp:"s", syncId:"s", skupinaId:"s", skupinaKod:"s", skupinaNazov:"s",
  rezim:"s", paleta:"s", pismo:"s", cenaCiel:"n" };
const GENCFG_TYPY={ zachovat:"b", cielMode:"b", neMasoZaSebou:"b", filtre:"ao" };
// Prvok poľa, ktorému chýba pole na zobrazenie alebo radenie, sa v UI nedá ani ukázať, ani
// zmazať — a `a.nazov.localeCompare(b.nazov)` v renderNakup na ňom zhodí celý Nákup. Zdieľaný
// blob zo skupiny (SHARED_FIELDS nesie `spajza` aj `nakupManual`) taký prvok priniesť vie,
// preto sa zahadzuje. Reťazcové polia musia byť neprázdne, číselné konečné.
const POVINNE_V_POLI={ spajza:{nazov:"s"}, nakupManual:{id:"s",nazov:"s"}, mojeRecepty:{id:"s",nazov:"s"},
  archiv:{id:"s"}, uvarene:{id:"s",datum:"s"}, vahy:{d:"s",kg:"n"} };
// Voliteľné pole zlého typu sa z prvku zmaže (prvok ostáva). `odd` ručnej položky ide do nadpisu
// oddelenia v Nákupe a prichádza aj synchronizáciou skupiny — objekt či číslo tam nemá čo robiť.
const VOLITELNE_V_POLI={ nakupManual:{odd:"s",mnoz:"s",tyzden:"s"} };
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
// Konštanty, ktoré používa normalizácia stavu — MUSIA byť pred `let S = normalizujStav(…)` (TDZ).
const CIEL_DEF=2000;
const KCAL_DEN_MIN=1000, KCAL_DEN_MAX=5000; // v34: dolná hranica 1000 (bolo 800) — rozumný denný cieľ stravníka (zmenStravnika, vypocitajCiel)
// v34 kolo 3: dieťa podľa veku (rodič: „koľko naložiť 4-ročnému"), senior. kcal a bielkoviny podľa EFSA DRV
// (priemerná aktivita; bielkoviny ~0,9–1 g/kg). „dieta" (bez veku) ostáva kvôli starým stavom = 7–10 r.
const TYP_STRAV={"":"Dospelý",dieta1:"Dieťa 1–3 r.",dieta4:"Dieťa 4–6 r.",dieta:"Dieťa 7–10 r.",dieta11:"Dieťa 11–14 r.",tehotna:"Tehotná / dojčiaca",senior:"Senior 65+"};
const TYP_KCAL={dieta1:1000,dieta4:1350,dieta:1700,dieta11:2100,senior:1800}, TYP_BIEL={dieta1:13,dieta4:19,dieta:28,dieta11:42};
// Vláknina (EFSA AI) a soľ (UK SACN) podľa veku — dospelý 30 g / 5 g. Kolo 3: dieťa 4–6 r. sa porovnávalo s 30 g a 5 g.
const TYP_VL={dieta1:10,dieta4:14,dieta:16,dieta11:19}, TYP_SOL={dieta1:2,dieta4:3};
function jeDieta(p){ return !!p && /^dieta/.test(p.typ||""); }
function normalizujStav(o){
  const s=ocistiVstup(jeObjekt(o)?o:{},STAV_TYPY);
  for(const k in STAV_TYPY){ const t=STAV_TYPY[k];
    if((t==="o"||t==="a"||t==="ao") && !sediTyp(s[k],t)) s[k]=prazdnaHodnota(t); }
  for(const k in POVINNE_V_POLI) s[k]=s[k].filter(x=>prvokPouzitelny(x,POVINNE_V_POLI[k]));
  for(const k in VOLITELNE_V_POLI) s[k].forEach(x=>{ for(const f in VOLITELNE_V_POLI[k]) if(x[f]!=null && !sediTyp(x[f],VOLITELNE_V_POLI[k][f])) delete x[f]; });
  // id zásoby ide do onclick (upravZasobu(id), zmazZasobu(id)) a prichádza aj synchronizáciou skupiny
  // a zo zálohy — textové `1);alert(1);(` by vložilo do stránky ľubovoľný JS. Musí to byť konečné
  // a jedinečné číslo; iné id dostane nové číslo a zásoba sa NEzahodí.
  { const ids=new Set(); let max=0; s.spajza.forEach(x=>{ if(sediTyp(x.id,"n")) max=Math.max(max,x.id); });
    s.spajza.forEach(x=>{ if(!sediTyp(x.id,"n")||ids.has(x.id)) x.id=++max; ids.add(x.id); });
    if(s.spajza.length && !(s.spSid>max)) s.spSid=max+1; }
  s.mojeRecepty=s.mojeRecepty.map(normVlastnyRecept).filter(Boolean);
  if(!sediTyp(s.profil.stravnici,"ao")) delete s.profil.stravnici;
  // v34: stravník prichádza aj zo zálohy a synchronizácie — kcal ide do HTML a do prepočtu porcií
  // (2. kolo: `kcal:"<img onerror…>"` sa vykonal a Nákup ukázal „NaN g"). Tvar sa vynúti tu.
  else s.profil.stravnici=s.profil.stravnici.map(p=>{ const k=+p.kcal;
    return {nazov:String(p.nazov==null?"":p.nazov).slice(0,40), kcal:(k>0&&isFinite(k))?Math.min(KCAL_DEN_MAX,Math.max(KCAL_DEN_MIN,Math.round(k))):CIEL_DEF,
      typ:(typeof p.typ==="string"&&Object.prototype.hasOwnProperty.call(TYP_STRAV,p.typ))?p.typ:"", veg:p.veg===true,
      ...(typeof p.mimo==="string"?{mimo:p.mimo.split("|").filter(x=>VSETKY_SLOTY.includes(x)).join("|")}:{})}; });
  if(!sediTyp(s.profil.sloty,"a")) delete s.profil.sloty;
  // téma a písmo len z povoleného zoznamu (kolo 4, QA: neplatná hodnota zo zálohy nechala Nastavenia bez voľby)
  if(s.profil.paleta!=null && !["teply","salvia","more","levandula","kontrast"].includes(s.profil.paleta)) delete s.profil.paleta;
  if(s.profil.pismo!=null && !["moderne","kucharka","zaoblene"].includes(s.profil.pismo)) delete s.profil.pismo;
  if(!sediTyp(s.genCfg.filtre,"ao")) s.genCfg.filtre=[];
  return s; }
// Vlastný recept prichádza z localStorage, zo zálohy aj zo synchronizácie. `ingrediencie:"abc"`,
// `[null]`, `{nazov:5}` či `tagy:"x"` zhodili štart appky (alergenyReceptu, hľadanie) a s ním
// Domov aj Recepty. Tu sa vynúti tvar, s ktorým zvyšok appky ráta; čo sa opraviť nedá, sa zahodí.
// Recept bez jedinej použiteľnej suroviny aj kroku nie je recept. `id` ide do onclick="otvor('…')"
// na desiatkach miest, preto smie mať len písmená, číslice, „-" a „_" (formulár dáva „moj-N").
function normVlastnyRecept(r){
  if(!/^[\w-]{1,80}$/.test(r.id)) return null;
  const pole=v=>(Array.isArray(v)?v:typeof v==="string"?[v]:[]).filter(x=>typeof x==="string"&&x.trim());
  const ing=(Array.isArray(r.ingrediencie)?r.ingrediencie:[]).filter(i=>jeObjekt(i)&&typeof i.nazov==="string"&&i.nazov.trim())
    .map(i=>{ const o={nazov:i.nazov, mnozstvo:(sediTyp(i.mnozstvo,"n")&&i.mnozstvo>0)?i.mnozstvo:null, jednotka:typeof i.jednotka==="string"?i.jednotka:""};
      if(typeof i.poznamka==="string") o.poznamka=i.poznamka;
      if(sediTyp(i.vsiaknutie,"n")&&i.vsiaknutie>0&&i.vsiaknutie<1) o.vsiaknutie=i.vsiaknutie;
      return o; });
  const postup=pole(r.postup);
  if(!ing.length && !postup.length) return null;
  ["kategoria","kuchyna","cas","popis","tipy","foto","zdroj","typ"].forEach(k=>{ if(k in r && typeof r[k]!=="string") delete r[k]; });
  if(!(typeof r.zdroj_url==="string" && /^https?:\/\//i.test(r.zdroj_url))) delete r.zdroj_url; // href="javascript:…"
  if(!(sediTyp(r.kcal_na_porciu,"n")&&r.kcal_na_porciu>0)) delete r.kcal_na_porciu;
  delete r._vyz; // cache výživy sa s receptom uloží — z cudzieho blobu sa jej veriť nedá
  return Object.assign(r,{ ingrediencie:ing, postup, tagy:pole(r.tagy),
    porcie:(sediTyp(r.porcie,"n")&&r.porcie>0)?r.porcie:1, _moj:true }); }
let S = normalizujStav(nacitaj());
S.ciel=S.ciel||""; S.domaNakup=S.domaNakup||""; S.mamDoma=S.mamDoma||"";
if(S.mamDoma.trim()){ S.domaNakup=[S.domaNakup.trim(),S.mamDoma.trim()].filter(Boolean).join(", "); S.mamDoma=""; } /* v34: jeden zoznam „mám doma" */ S.bar=S.bar||""; S.akcie=S.akcie||""; S.blokMode=(S.blokMode!==undefined?S.blokMode:true);
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
S.viewOd=/^\d{4}-\d{2}-\d{2}$/.test(S.viewOd)?S.viewOd:pondelokPre(dnesISO());
try{ const t=+localStorage.getItem("kucharka_view_t")||0; if(t&&Date.now()-t>6*3600e3) S.viewOd=pondelokPre(dnesISO()); }catch(e){} // nie len „nejaký reťazec" — nevalidný dátum by rozsypal celý Plánovač
// v33: ručná položka nákupu patrí týždňu (manualVidno) — doterajšie globálne patria tomuto týždňu
S.nakupManual.forEach(m=>{ if(!/^\d{4}-\d{2}-\d{2}$/.test(m.tyzden||"")) m.tyzden=pondelokPre(dnesISO()); });
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
// v3: ulozNovyRecept escapoval názov a jednotku suroviny aj po v2 („Soľ &amp; korenie" v detaile
// aj v Nákupe) — stav na v2 má preto escapované práve tieto dve polia vlastných receptov.
(function migrujEscape(){ if(S.escV===3)return;
  const pole=(o,k)=>{ if(o&&typeof o[k]==="string") o[k]=unescHtml(o[k]); };
  const ingPolia=r=>{ if(Array.isArray(r.ingrediencie)) r.ingrediencie.forEach(i=>{ pole(i,"nazov"); pole(i,"jednotka"); }); };
  if(S.escV===2) S.mojeRecepty.forEach(ingPolia);
  else {
  S.mojeRecepty.forEach(r=>{ ["nazov","kuchyna","cas","tipy","popis"].forEach(k=>pole(r,k));
    ingPolia(r);
    if(Array.isArray(r.postup)) r.postup=r.postup.map(unescHtml); });
  S.nakupManual.forEach(m=>{ pole(m,"nazov"); pole(m,"mnoz"); });
  S.spajza.forEach(x=>pole(x,"nazov")); }
  S.escV=3; })();
// v32: rodiny zdrojov sa zlúčili („Instagram @účet" → „Instagram", „RecipeTinEats.com" → „RecipeTin Eats").
// Staré vypnuté meno by sa už s ničím nezhodovalo a recepty by sa ticho vrátili — premapuj ho.
// Idempotentné, beží pri každom štarte (aj nad stavom zo synchronizácie).
if(typeof S.profil.zdrojeOff==="string" && S.profil.zdrojeOff)
  S.profil.zdrojeOff=[...new Set(S.profil.zdrojeOff.split("|").filter(Boolean)
    .map(z=>/^Instagram\b/.test(z)?"Instagram":z==="RecipeTinEats.com"?"RecipeTin Eats":z))].join("|");
// S.skryte (recepty skryté z generátora/plánu, nie zmazané — kľúč=id) a S.mojeRecepty už otypoval normalizujStav
S.mojeRecepty.forEach(r=>{ if(!RECEPTY.some(x=>x.id===r.id)) RECEPTY.push(r); });
const VERZIA="v34"; // zobrazuje sa v Nastaveniach; drž v súlade s CHANGELOG.md (sw.js má vlastnú VERZIA = názov cache)
// ROZPOČET: cieľ je „€ na OSOBU a DEŇ" — rovnaká jednotka ako kalorický cieľ, takže sa nemení
// pri pridaní stravníka ani pri neúplnom týždni, a dá sa priamo porovnať so štatistikou.
// Predvolená hodnota vychádza z ŠÚ SR (Výdavky súkromných domácností 2025, zverejnené 12. 8. 2026):
// potraviny a nealko nápoje = 112 €/osoba/mesiac = 3,68 €/os./deň (kraje 80,3 € BA … 128,8 € TT).
// Náš plán pokrýva 100 % jedál doma (priemer v štatistike má časť jedál mimo domu) a appka počíta
// cenu SPOTREBY, nie celých balení, preto je predvolený cieľ o kúsok vyššie: 4,20 €/os./deň
// (= 29,40 €/os./týždeň = 128 €/mesiac, teda na úrovni najdrahšieho kraja). 0 = rozpočet vypnutý.
const CENA_CIEL_DEF=4.2;
// v31: ceny appka neukazuje, rozpočet sa volí len úrovňou v „✨ Zostaviť jedálniček" (bez €).
// Hodnota = €/os./deň do S.profil.cenaCiel; 0 = cenová brzda generátora je vypnutá.
// Kalibrácia 30. 9. 2026 (4 seedy × 8 týždňov, 2 × 1450 kcal): medián týždňa 101 / 107 / 114 / 122 €
// (max 117 / 130 / 139 / 193 €); bielkoviny 117–121 g, 0 % dní pod 80 g a 100 % dní v ±10 % kcal
// na KAŽDEJ úrovni. Brzda sa pod ~2,6 a medzi 4,2–7 nasycuje (3,2 ≈ 2,6; 5,5 ≈ 4,2), preto 9.
const CENA_UROVNE=[[2.6,"Úsporne"],[CENA_CIEL_DEF,"Bežne"],[9,"Voľnejšie"],[0,"Na cene nezáleží"]];
// Predvolený kalorický cieľ pre NOVÚ inštaláciu. Bolo 1450 — to je hodnota pre chudnutie,
// takže prvý vygenerovaný týždeň vyzeral diétne aj tomu, kto si nič nenastavil. 2000 kcal je
// bežné udržanie dospelého; kto chce presne, má TDEE kalkulačku v Nastaveniach.
// temaAuto = tretí stav témy („podľa systému"). Bez neho bol `dark` iba boolean, takže
// applyVzhlad pečiatkoval `svetla` každému, kto si tmavý režim výslovne nezapol, a
// @media(prefers-color-scheme:dark) sa neuplatnilo nikdy. Migrácia: kto mal dark
// zapnutý, ostáva na výslovnej voľbe; všetkým ostatným sa zapne „podľa systému".
const _malDark = !!(S.profil && S.profil.dark);
S.profil=Object.assign({osoby:2,kcal:CIEL_DEF,biel:0,ryby:false,lepok:false,mlieko:false,dark:false,temaAuto:!_malDark,big:false,balenia:true,watch:"",zakazane:"",zdrojeOff:"",kupSnack:true,cielTyp:"udrzanie",okno:false,oknostart:12,syncId:"",syncOff:false,skupinaId:"",skupinaKod:"",skupinaNazov:"",cenaCiel:CENA_CIEL_DEF,sloty:DEFAULT_SLOTY.slice()}, S.profil||{});
S.profil.cenaCiel=CENA_CIEL_DEF; // v34: voľba rozpočtu je zrušená — starý uložený „Úsporne/Na cene nezáleží" by ostal skrytý a nemenný
// v34: dva režimy — „Normálne" (plan) a „Veľké písmo" (obchod). Kompakt → Normálne, Kuchyňa a „Väčšie písmo" → Veľké.
S.profil.rezim=({kompakt:"plan",plan:"plan",obchod:"obchod",kuchyna:"obchod"})[S.profil.rezim]||"plan";
if(S.profil.big){ S.profil.rezim="obchod"; S.profil.big=false; }
if(S.ciel && !S.profil._migr){ S.profil.kcal=parseInt(S.ciel)||S.profil.kcal; S.profil._migr=1; }
// JEDEN zdroj pravdy pre cieľ hlavného stravníka.
// Cieľ žil na dvoch nezávislých miestach: `S.profil.kcal` (generátor, ciele slotov, dorovnanie
// dňa, referenčná cena, stav vo Výžive — ~30 čítaní) a `stravnici[0].kcal` (rozdelenie porcií
// medzi stravníkov). Na jednej obrazovke boli obe polia vedľa seba, takže sa dali nastaviť
// rozdielne: riadok „Ja" hovoril 2200, generátor plánoval na 1450 a nikde to nebolo vidieť.
// Odteraz je zdrojom pravdy PRVÝ riadok stravníkov a `S.profil.kcal` je jeho zrkadlo —
// zrkadlo ostáva, lebo ho číta 30 miest, záloha aj uložený jedálniček (`ciel_kcal`).
function syncHlavnyCiel(){ const l=S.profil.stravnici;
  if(!Array.isArray(l)||!l.length) return S.profil.kcal;
  const k=parseInt(l[0].kcal)||0;
  if(k>0) S.profil.kcal=k; else l[0].kcal=parseInt(S.profil.kcal)||CIEL_DEF;
  return S.profil.kcal; }
// E6: prevzatie systémovej témy pri prvom spustení tu už netreba — `temaAuto` ju rešpektuje
// natrvalo, nielen raz za život inštalácie.
// Kolo 3 (QA): dve záložky sa navzájom prepisovali — uloz() serializuje celé S. Keď stav zmení INÁ záložka,
// táto už nezapisuje (jej starší stav by prepísal novší) a ponúkne načítanie. `var`: save() sa môže volať skôr.
var _cudziStav=false;
function _ponukniNacitanie(){ toast("Appku si zmenil(a) v inej záložke — táto sa preto neukladá.",{text:"↻ Načítať",fn:()=>location.reload()},60000); }
window.addEventListener("storage",e=>{ if(e.key!==LS||_cudziStav) return; _cudziStav=true; _ponukniNacitanie(); });
function save(){ if(_cudziStav){ _ponukniNacitanie(); return; } uloz(S); if(typeof syncPush==="function")syncPush(); if(typeof syncOsobnePush==="function")syncOsobnePush(); if(typeof syncSkupinaPush==="function")syncSkupinaPush();}

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
// Synonymá: „vajíčk" a „vajc", „rasca" a „kmín", „mozarel" a „mozzarella" sú tá istá vec v obchode,
// ale dva kľúče — nákup z nich robil dva riadky a dvakrát balenie (30 vajec na 16). Potravina môže
// niesť `kanon` = kľúč, pod ktorým sa ZOSKUPUJE v nákupe, špajzi a „Mám doma". Výživa a gramáž
// ostávajú na vlastnom kľúči (najdiPotravinu sa nemení). Reťaz kanon → kanon sa neuplatní.
let _kanonMapa=null;
function kanonPotr(kluc){
  if(!_kanonMapa){ const k=new Map(POTRAVINY.map(p=>[p.kluc,p])); _kanonMapa=new Map();
    POTRAVINY.forEach(p=>{ const c=p.kanon&&k.get(p.kanon); _kanonMapa.set(p.kluc,c&&!c.kanon?c:p); }); }
  return _kanonMapa.get(kluc)||null; }
function kanonKluc(kluc){ const c=kanonPotr(kluc); return c?c.kluc:kluc; }
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
  // bylinka predávaná pri zelenine (mäta) nesie hmotnosť lístka v potraviny.json — „8 list" nie je 64 g
  if(j==="list"&&p&&p.g_za_list>0) return p.g_za_list;
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
// Užší výber z jeTekutina: to, čo sa v obchode kupuje a v kuchyni meria ako TEKUTINA. Nákup ho
// vypíše v ml, aj keď recept dal gramy („Citrónová šťava 45 g", „Olivový olej 4 g"). Jogurt, med,
// kečup či masť (jeTekutina ich pustí kvôli jednotkám v špajzi) ostávajú v gramoch.
function jeLiata(p){ if(!jeTekutina(p)) return false; const k=bezDia(p.kluc);
  if(/susen|prask/.test(k)) return false;
  return p.oddelenie==="Oleje a tuky" ? /olej/.test(k) : /olej|ocot|stav|mliek|vyvar|vino|voda|dzus|napoj|pivo|sirup/.test(k); }
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
const HS_HI=10, HS_LO=5; // g bielkovín na 100 kcal: ≥HI green, ≥LO amber, inak red (laditeľné)
function healthScore(r){ const v=vyzivaReceptu(r); if(!(v.kcal>5)) return {p100:0,farba:"red"};
  const p100=v.b/(v.kcal/100); return {p100:p100, farba: p100>=HS_HI?"green":(p100>=HS_LO?"amber":"red")}; }
function alergenyReceptu(r){ const set=new Set();
  (r.ingrediencie||[]).forEach(i=>{const p=najdiPotravinu(i.nazov); if(p)(p.alergeny||[]).forEach(a=>set.add(a));});
  return Array.from(set); }
// Kolo 3: „bang-bang kuracie rezance" prešli ako vegetariánske — „kuracích pŕs" sa nespárovalo na potravinu.
const _MASO_NAZOV=/\b(kurac|kurat|kurca|bravc|hovadz|telac|telec|jahnac|morcac|kacac|husac|zverin|mlet\w* mas|slanin|sunk|klobas|salam|parok|spekacik|losos|tuniak|tresk|pstruh|makrel|sardin|krevet)/;
function diety(r){ const al=alergenyReceptu(r); let meso=false;
  (r.ingrediencie||[]).forEach(i=>{const p=najdiPotravinu(i.nazov), n=bezDia(i.nazov); if(p?(p.meso||(_MASO_NAZOV.test(n)&&!_MASO_NAZOV.test(bezDia(p.kluc))&&!/korenie|ochucovad|bujon|aroma/.test(n))):_MASO_NAZOV.test(n))meso=true;});
  return {veg:!meso&&!al.includes("ryby"), bezlepku:!al.includes("lepok"), bezlaktozy:!al.includes("mlieko"), ryby:al.includes("ryby")}; }

function fmt(n){ if(n==null)return ""; let x=Math.round(n*100)/100;
  if(Math.abs(x-Math.round(x))<0.01) return String(Math.round(x));
  return String(x).replace(".",","); }
// Makrá v gramoch sa zobrazujú na CELÉ čísla. „20,33 g bielkovín" predstiera presnosť,
// ktorú dáta nemajú (deklarované vs. dopočítané kcal sa líšia ~15 %), a dve desatinné
// miesta navyše lámu riadok na telefóne. `fmt` ostáva pre množstvá, kde desatiny nesú význam.
function fmtG(n){ return n==null?"":String(Math.round(n)); }
function bezDia(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); }
// „Čo mám doma" — zdieľané oknom „🍳 Čo uvarím" (coUvarim) aj Receptami (renderGrid)
function mamZoSpajze(){ return (S.spajza||[]).map(x=>bezDia(x.nazov)).filter(Boolean); }
// Soľ, korenie, voda a olej na varenie má doma každý — nerátajú sa ani do „mám", ani do „chýba".
// Do v32 „Lokše — chýba: Soľ". Hranica korenia je tá istá ako v Nákupe (jeZakladnaVec);
// olej na vyprážanie (vsiaknutie < 1, typicky 600 ml) samozrejmosť nie je — ten sa kupuje.
function _samozrejme(i){ const p=najdiPotravinu(i.nazov);
  if(jeZakladnaVec({pozn:i.mnozstvo==null, odd:p&&p.oddelenie, gramy:p?gramy(i,p):0})) return true;
  return !!p && (p.kluc==="voda" || (p.oddelenie==="Oleje a tuky" && /olej/.test(p.kluc) && !(i.vsiaknutie<1))); }
// `tok` = zoznam surovín bez diakritiky. Páruje `jeDoma` (kmeň + prefix): „vajce" chytí „Vajcia",
// ale „med" nechytí „medvedí cesnak" — nadmerná zhoda by tvrdila, že máš, čo nemáš.
function skoreReceptu(r, tok){ let mame=0,chyba=[];
  (r.ingrediencie||[]).forEach(i=>{ if(_samozrejme(i)) return;
    if(jeDoma(i.nazov,tok)) mame++; else chyba.push(i.nazov); });
  const spolu=mame+chyba.length;
  return {mame,spolu,pct:spolu?Math.round(mame/spolu*100):100,chyba}; }
// v34: „mám doma" je JEDEN zoznam — to, čo napíšeš v Nákupe aj v „Čo uvarím" (S.domaNakup), plus platné zásoby Špajze.
// Do v33 boli tri: Špajza, „Mám doma" v Nákupe a samostatný S.mamDoma v „Čo uvarím" (konkurencia aj používateľ: zbytočné).
function mamDomaTok(){ return [...new Set((S.domaNakup||"").split(/[\n,;]+/).map(x=>bezDia(x.trim())).filter(x=>x.length>=3)
  .concat((S.spajza||[]).filter(zasobaPlatna).map(x=>bezDia(x.nazov)).filter(x=>x.length>=3)))]; }
// Najprv čo uvaríš HNEĎ, potom čo potrebuje 1–2 veci; v skupine vyhráva recept, ktorý zužitkuje
// viac z toho, čo máš. Kúpené výrobky a nápoje nie sú varenie (do v32 boli na čele „1/1 Balkánsky syr").
// `mame > chyba` vyhodí šum typu „1/2 — máš cesnak, chýba tofu".
function coUvarim(tok){
  return RECEPTY.filter(r=>prejdeProfil(r) && !jeVyrobok(r) && r.kategoria!=="Nápoj" && r.kategoria!=="Kokteil")
    .map(r=>Object.assign({r},skoreReceptu(r,tok)))
    .filter(x=>x.chyba.length<=2 && x.mame>x.chyba.length)
    .sort((a,b)=>a.chyba.length-b.chyba.length || b.mame-a.mame || oblubenostVaha(b.r.id)-oblubenostVaha(a.r.id)); }
let _spajzaSkore=null; // v Receptoch pri režime radenia „zo špajze": mapa id → skóre (inak null)
function escHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
// Kolo 6 (vizuál): jeden formát času — „100 min" je „1 h 40 min" ako v pláne varenia.
function casText(t){ const s=String(t||"").replace(/(\d)\s*(hod\.?|hodín|hodiny|hodina)(?=\s|$)/g,"$1 h").replace(/\s+/g," ").trim();
  const m=s.match(/^(\d+)\s*min\.?$/); if(m&&+m[1]>=60){ const h=Math.floor(m[1]/60), r=m[1]%60; return h+" h"+(r?" "+r+" min":""); } return s; }
function casMin(r){ const m=(r.cas||"").match(/(\d+)\s*hod/); const mm=(r.cas||"").match(/(\d+)\s*min/);
  let t=0; if(m)t+=parseInt(m[1])*60; if(mm)t+=parseInt(mm[1]); return t||999; }
function receptById(id){ return RECEPTY.find(r=>r.id===id); }

const VIAC_VIEWS=["vyziva","spajza","nastavenia"]; // E5: schované za „⋯ Viac" na spodnej lište
const _scrollPos={}; let _curView="domov";
function zobrazView(v){ if(typeof toastSkry==="function") toastSkry(); // toast z inej obrazovky by zakryl obsah tejto
  if(!document.getElementById("v-"+v)) v="domov";
  if(v!==_curView) _scrollPos[_curView]=window.scrollY; // E7: zapamätaj scroll starej obrazovky
  // aria-current: aktívna položka lišty nesmie byť len farbou (WCAG 1.3.1/4.1.2)
  document.querySelectorAll(".side nav a,.side .foot a,.botnav a").forEach(t=>{ const akt=t.dataset.v===v || (t.dataset.v==="_viac"&&VIAC_VIEWS.includes(v));
    t.classList.toggle("active",akt); if(akt)t.setAttribute("aria-current","page"); else t.removeAttribute("aria-current"); });
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("active"));
  const el=document.getElementById("v-"+v); if(el)el.classList.add("active");
  _curView=v;
  // B: lišty sa merajú až tu. renderKolekcie/renderChips bežia aj kým je obrazovka skrytá,
  // a skrytý prvok má clientWidth 0 — pretečenie by sa nikdy nezistilo.
  if(v==="recepty" && typeof sledujPretecenie==="function") sledujPretecenie();
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
function tik(){ try{ navigator.vibrate&&navigator.vibrate(8); }catch(e){} }
function _pohyb(){ try{ return !matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return true; } }
function vibruj(v){ try{ navigator.vibrate&&navigator.vibrate(v); }catch(e){} }
const USPECH=[12,40,18]; // krátka „radosť" — zostavený týždeň, dokončený nákup, uvarené jedlo
// Animácia triedou: zmaž, reflow, pridaj — inak by sa druhé spustenie tej istej triedy neprehralo.
function animuj(el,tr){ if(!el||!_pohyb()) return; el.classList.remove(tr); void el.offsetWidth; el.classList.add(tr);
  el.addEventListener("animationend",()=>el.classList.remove(tr),{once:true}); } // X1: jemná haptika na diskrétne akcie
// Prechod z okna („⋯ Viac → Nastavenia"): zavriPick() si naplánoval history.back() na záznam okna.
// Keby sme tu pridali nový hash, ten back() by nás vrátil na predošlú obrazovku — Nastavenia
// na telefóne bliknú a zmiznú. Záznam okna preto NAHRADÍME novou obrazovkou a back() sa zruší.
// Menu sa zatvára PRED počítaním: položka „⋯ Viac → Výživa" volá prepni() skôr než zavriMenu().
// Viac zavretých vrstiev naraz (detail + varenie): vráť sa za ne a až potom pridaj obrazovku.
function prepni(v){ const bol=_curView; tik(); zavriMenu(); if(("#"+v)!==location.hash){ const navyse=_histPush-_pocetVrstiev();
    if(navyse===1){ _histPush--; history.replaceState(null,"","#"+v); }
    else if(navyse>1){ _histPush-=navyse; _ignorujPop++; _poNavrate=v; try{history.go(-navyse);}catch(e){ _ignorujPop--; _poNavrate=null; location.hash=v; } }
    else location.hash=v; }
  zobrazView(v);
  // Kolo 6 (rodič): na telefóne Plán tohto týždňa otvorí DNEŠNÝ blok — vo štvrtok bol blok „dnes" na 760 px pod blokom A.
  // Kolo 7 (ovládanie): len pri príchode z inej obrazovky a nad naplneným týždňom (prázdny schoval „✨ Zostaviť");
  // ťuk na už otvorený Plán vráti hore.
  if(v==="planovac"&&bol==="planovac"){ scrollTo({top:0,behavior:_pohyb()?"smooth":"auto"}); }
  else if(v==="planovac"&&jeMobil()&&S.blokMode&&S.viewOd===pondelokPre(dnesISO())&&!planPrazdnyTyzden()) requestAnimationFrame(()=>{
    const k=document.querySelector("#plan-bloky .blok-karta.je-dnes"); if(k&&k.previousElementSibling) k.scrollIntoView({block:"start"}); }); } // E8: hash = zdroj pravdy pre deep-link/back
window.addEventListener("hashchange",()=>{ const v=location.hash.slice(1)||"domov"; if(v!==_curView && document.getElementById("v-"+v)) zobrazView(v); });
// v29: prepínač hustoty sa presťahoval SEM z hornej lišty. Tam zaberal celý pruh na KAŽDEJ
// obrazovke, hoci sa režim prepína párkrát za deň (pred obchodom, pri sporáku) — cena za to
// bola trvalá, úžitok príležitostný. Tu je na dva ťuknutia zo spodnej lišty, z ktorejkoľvek
// obrazovky. Na počítači ostáva v bočnom paneli, kde miesto nechýba.
const REZIM_POPIS={plan:["Normálne","bežné písmo a tlačidlá"],
  obchod:["Veľké písmo","väčšie písmo a tlačidlá — do obchodu, ku sporáku aj pre slabší zrak"]};
function otvorVzhlad(){ prepni("nastavenia"); setTimeout(()=>{ const d=document.getElementById("nast-vzhlad"); if(!d) return; d.open=true;
  d.scrollIntoView({block:"start",behavior:_pohyb()?"smooth":"auto"}); const s=d.querySelector("summary"); if(s) s.focus({preventScroll:true}); },60); }
function otvorViac(){ const pol=[["vyziva","📊 Výživa"],["spajza","🧊 Špajza"],["nastavenia","⚙️ Nastavenia"]];
  const akt=REZIMY.includes(S.profil.rezim)?S.profil.rezim:"plan";
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Viac</h2></div><div class="content2">';
  pol.forEach(([v,t])=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();prepni('${v}')"><span class="nm">${t}</span></div>`; });
  h+='<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="otvorBar()"><span class="nm">🍸 Môj bar</span></div>';
  h+='<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvorVzhlad()"><span class="nm">🎨 Vzhľad — farby, písmo, tmavá téma</span></div>';
  h+='<h3 class="viac-nadpis">Veľkosť písma a tlačidiel</h3><div class="viac-rezimy" role="group" aria-label="Veľkosť písma">';
  REZIMY.forEach(r=>{ const [nz,po]=REZIM_POPIS[r]||[r,""];
    h+=`<button type="button" class="viac-rezim${r===akt?" on":""}" aria-pressed="${r===akt}" onclick="nastavRezim('${r}');zavriPick()"><b>${nz}</b><small>${po}</small></button>`; });
  h+="</div></div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
// U1: bunka plánu mala 5 mini-liniek (20 ovládacích prvkov na obrazovku telefónu).
// Zostala primárna „✎ zmeniť", zvyšok je tu — rovnaký spodný panel ako „⋯ Viac".
// B1: rozvrh varenia (bloky) už nie je schovaný tu — má vlastný pás nad tabuľkou plánu
// a dialóg `otvorRozvrh()` s predvoľbami. Definícia je pri bloky()/hraniceInit().
function inaPriloha(di,slot){ const ids=slotIds(di,slot), r=komponent(ids[0]); if(!r||r._left) return;
  const stara=ids.find((x,i)=>i&&!/^left:/.test(x)); let nova=null;
  const dr=_prilohaDruh(r), kand=Array.isArray(dr)?dr.filter(_prilohaPrejde):[...new Set(Array.from({length:40},(_,i)=>prilohaPre(r,i+1)).filter(Boolean))];
  nova=kand.find(p=>p!==stara&&!ids.includes(p))||null;
  if(!nova){ toast("K tomuto jedlu inú prílohu nemám."); return; }
  zapamatajTyzden(); const dni=denyBloku(di).filter(d=>slotIds(d,slot)[0]===ids[0]);
  dni.forEach(d=>{ const iso=datumPre(d), x=slotIds(d,slot); const i=x.indexOf(stara); if(i>0) x[i]=nova; else x.push(nova); S.plan[iso][slot]=x; });
  rescaleDen(dni); save(); renderPlan(); const k=komponent(nova); toastSpat("Príloha: "+(k?k.nazov:nova)+"."); }
function akcieSlotu(di,slot){
  const ids0=slotIds(di,slot), maPril=ids0.slice(1).some(x=>!/^left:/.test(x)) && jeHlavnyChodSlot(slot);
  const pol=[["🎲 Vymeniť za iné jedlo"+(S.blokMode?" (celý blok)":""),`regenerujSlot(${di},'${slot}')`],
             ["✎ Vybrať jedlo zo zoznamu",`vyberDoPlanu(${di},'${slot}')`],
             ["🍽 Veľkosť porcie (menšia / väčšia)",`upravFaktor(${di},'${slot}')`]];
  if(maPril) pol.push(["🔁 Iná príloha",`inaPriloha(${di},'${slot}')`]);
  pol.push(["➕ Pridať doplnok (príloha, pečivo…)",`pridajKomponent(${di},'${slot}')`],
             ["👥 Ručný počet porcií (hostia, niekto chýba)",`upravSlotPorcie(${di},'${slot}')`],
             ["♻️ Rozpísať ako zvyšok do iného dňa",`pridajZvysok(${di},'${slot}')`]);
  // v31: „už nezobrazovať" — len pri skutočnom recepte (nie zvyšok, nie príloha)
  const ids=slotIds(di,slot);
  { const k=komponent(ids[0]); if(k && !k._left && !k._priloha)
      pol.push(["🚫 Už nezobrazovať „"+escHtml(k.nazov)+"“ (vymení ho)",`nezobrazovatVSlote(${di},'${slot}')`]); }
  pol.push(jeZamknute(di,slot)?["🔓 Odomknúť toto jedlo",`prepniZamok(${di},'${slot}')`]
    :["🔒 Zamknúť toto jedlo (generátor ani 🎲 bloku ho nezmenia)",`prepniZamok(${di},'${slot}')`]);
  // B3: ✕ už nie je v bunke (24 px, 2–4 px od 🎲 a mazal z celého bloku bez návratu). Tu je
  // pomenovaný rozsah, ktorého sa týka, a po ňom toast s „↩ Späť".
  ids.forEach((cid,ix)=>{ const k=komponent(cid); if(!ix||!k)return;
    const co=k._left?"zvyšok":jeSnackSlot(slot)?"doplnok":"prílohu";
    pol.push(["✕ Odobrať "+co+" „"+escHtml(k.nazov)+"“",`odoberKomponent(${di},'${slot}','${cid}')`]); });
  pol.push(["✕ Odobrať z "+(S.blokMode?"bloku "+rozsahSlotu(di):"plánu ("+DNI[di]+")"),`odoberSlot(${di},'${slot}')`]);
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${S.blokMode?znakBloku(blokIndex(di)).replace("<span ","<span aria-hidden=\"true\" ")+" ":""}${slot} · ${S.blokMode?"blok "+rozsahSlotu(di):DNI[di]}</h2></div><div class="content2">`;
  pol.forEach(([t,fn])=>{ h+=`<div class="plan-cell akcia-pol" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();${fn}"><span class="nm">${t}</span></div>`; });
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
  .menu-wrap,.plan-den-nav,#plan-den-hlava,.view.printme > p.sub{display:none!important}
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
  /* téma zoomuje .modal režimom hustoty (Kuchyňa 1,5×) — na papieri by recept narástol o polovicu */
  body.tlac-detail .modal{zoom:1!important}
  /* Plán potrebuje šírku (A4 na šírku), nákupný zoznam by na nej ale mrhal papierom —
     100 položiek by narástlo z 3 na 6 strán. V širokom režime ho lámeme do stĺpcov. */
  body.tlac-plan #nakup-list{column-count:3;column-gap:12mm}
  body.tlac-plan #nakup-list > *{break-inside:avoid;page-break-inside:avoid}
  body.tlac-plan table.plan{table-layout:fixed!important}
  body.tlac-plan table.plan td[data-d],body.tlac-plan table.plan th[data-d]{display:table-cell!important}
  body.tlac-plan table.plan tr.dni-hlavicka{display:table-row!important}
  /* A4 na výšku je 794 px, teda POD breakpointom 820 px — na papieri platí mobilná media
     query. Tá skrýva prvý stĺpec (menovka jedla je v bunke) a riadok Σ (je v hlavičke dňa).
     Na papieri je ale sedem dní naraz, takže oboje treba vrátiť a .pc-slot naopak zhasnúť,
     inak by na hárku svietilo „RAŇAJKY" 7× v jednom riadku. Nie je to viazané na
     body.tlac-plan — plán tlačí aj „Tlačiť týždeň". */
  .plan-bloky{display:none!important}
  body.plan-bloky-on .plan-grid{display:block!important}
  table.plan td.slotname,table.plan td.rohova{display:table-cell!important}
  table.plan tr.suma{display:table-row!important}
  .pc-slot{display:none!important}
  /* P4: vlna 3 pridala do plánu aj nákupu skutočné <button> a na papier sa dostali.
     Rozlišujeme dva druhy. Tlačidlo, ktoré je LEN akcia (✕, ⓘ, ✎, „plán varenia →",
     „✂️ Upraviť rozvrh", prúžok postupu, panely „Mám doma"/„Trasa obchodom"), sa skryje.
     Tlačidlo, ktoré nesie OBSAH (názov jedla, kcal dňa), sa NESMIE skryť — inak by sa
     vytlačil prázdny plán. Dostane display:contents — schránka tlačidla zmizne
     (žiadny rám, žiadna afordancia, žiadny box v layoute), text zostane. */
  .plan-cell .pc-znova,.plan-cell .pc-ed,.plan-varenia,.rozvrh-upr,.rozvrh-bloky,.plan-zbal,
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
let aktVyrobky=false; // prepínač „🛒 aj kúpené výrobky" (renderGrid)
const KOLEKCIE=[
  {id:"rychle",   nazov:"Do 20 min",      ikona:"⏱", test:r=>casMin(r)<=20},
  {id:"protein",  nazov:"Vysoký proteín", ikona:"💪", test:r=>healthScore(r).farba==="green"},
  {id:"sezonne",  nazov:"Sezónne teraz",  ikona:"🌿", test:r=>jeSezonne(r)},
  {id:"oblubene", nazov:"Obľúbené",       ikona:"★",  test:r=>!!S.fav[r.id]}
];
function renderKolekcie(){ const box=document.getElementById("kolekcie"); if(!box)return;
  box.innerHTML=KOLEKCIE.map(k=>`<span class="kol-tile${aktivnaKolekcia===k.id?' active':''}" role="button" tabindex="0" aria-pressed="${aktivnaKolekcia===k.id}" onclick="nastavKolekciu('${k.id}')">${k.ikona} ${k.nazov}</span>`).join("");
  sledujPretecenie(); }
function nastavKolekciu(id){ drzFokus(()=>{ aktivnaKolekcia=(aktivnaKolekcia===id)?"":id; renderKolekcie(); renderGrid(); }); }
// B: vodorovná lišta (kolekcie, kategórie) na telefóne skrýva väčšinu obsahu — kategórie
// 767 z 1128 px. Zmiznutý okraj je náznak, že to pokračuje; nasadzuje sa podľa SKUTOČNÉHO
// scrollLeft, takže na začiatku nefaduje vľavo a na konci vpravo — inak by fade predstieral
// obsah, ktorý tam už nie je.
function oznacPretecenie(box){ if(!box)return;
  const preteka=box.scrollWidth-box.clientWidth>2;
  box.classList.toggle("pret-v", preteka && box.scrollLeft < box.scrollWidth-box.clientWidth-2);
  box.classList.toggle("pret-l", preteka && box.scrollLeft > 2); }
function sledujPretecenie(){ ["kolekcie","chips"].forEach(id=>{ const b=document.getElementById(id); if(!b)return;
  oznacPretecenie(b);
  if(!b._pretSleduje){ b._pretSleduje=true; b.addEventListener("scroll",()=>oznacPretecenie(b),{passive:true}); } }); }
addEventListener("resize",sledujPretecenie);
function kategorie(){ const s=new Set(RECEPTY.map(r=>r.kategoria).filter(Boolean)); return ["Všetko",...Array.from(s).sort()]; }
// D9: volá sa aj po pridaní vlastného receptu, preto musí byť idempotentná (inak by pribúdali duplikáty)
function naplnKuchyne(){ const sel=document.getElementById("f-kuchyna"); if(!sel)return;
  const drz=sel.value;
  sel.innerHTML='<option value="">Všetky kuchyne</option>';
  const s=new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean));
  Array.from(s).sort((a,b)=>a.localeCompare(b,"sk")).forEach(k=>{const o=document.createElement("option");o.value=k;o.textContent=k;sel.appendChild(o);});
  sel.value=drz;
  // Filter zdroja v Receptoch: len rodiny, ktoré nie sú vypnuté v Nastaveniach (vypnutá by dala prázdnu mriežku).
  const zs=document.getElementById("f-zdroj"); if(!zs)return;
  const zdrz=zs.value, off=zdrojeOffAktivne();
  zs.innerHTML='<option value="">Všetky zdroje</option>';
  zdrojeList().filter(([z])=>!off.has(z)).forEach(([z,n])=>{const o=document.createElement("option");o.value=z;o.textContent=z+" ("+n+")";zs.appendChild(o);});
  zs.value=zdrz; if(zs.value!==zdrz) zs.value=""; }
function renderChips(){ const box=document.getElementById("chips"); box.innerHTML="";
  kategorie().forEach(k=>{ const el=document.createElement("div"); el.className="chip"+(k===aktivnaKat?" active":""); el.textContent=k;
    el.tabIndex=0; el.setAttribute("role","button"); el.setAttribute("aria-pressed",k===aktivnaKat); el.dataset.fokus="kat:"+k;
    el.onclick=()=>drzFokus(()=>{aktivnaKat=k;renderChips();renderGrid();}); box.appendChild(el); });
  sledujPretecenie(); }
const ZAKAZ_ALIAS={oriesky:"orechy",oriesok:"orechy",orieskov:"orechy",nuts:"orechy","stromove orechy":"orechy","alergia na orechy":"orechy",lieskove:"orechy",
  gluten:"lepok",lepku:"lepok",lepkove:"lepok",lepkova:"lepok",lepkovy:"lepok",celiakia:"lepok",celiakie:"lepok",orechov:"orechy","tree nuts":"orechy",arasidov:"arasidy",laktoza:"mlieko",laktozy:"mlieko",mliecne:"mlieko",peanuts:"arasidy",burske:"arasidy",sezamove:"sezam",soja:"soja",vajicka:"vajcia"};
function zakazaneTokens(){ const t=(S.profil.zakazane||"").split(/[\n,;]+/).map(x=>bezDia(x.trim()).replace(/^(bez|alergia na|alergicky na|alergicka na|nesmiem)\s*/,"")).filter(Boolean);
  return t.concat(t.map(x=>ZAKAZ_ALIAS[x]).filter(Boolean)); }
// ponytail: matchujem názov receptu + tagy, nielen ingrediencie (chytí "Pečené kura" aj keď ingrediencia je "kurčatá")
function zakazaneChyta(r){ const zt=zakazaneTokens(); if(!zt.length)return false;
  const text=(r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.tagy||[]).join(" ");
  // U2: podstring sám nechytí skloňovanie („mlieko" nenájde „mlieka"), tvar slova zas nechytí
  // časť slova („syr" v „syrokrém"). Diétny filter má radšej blokovať viac, takže platí OR z oboch.
  // Cena: „med" zablokuje aj „medvedí cesnak" (podreťazec) — pôvodné chovanie, nemenené.
  // v33: zakázané „mäso" = všetko, čo nie je 🌱 veg (`meso` v potraviny.json, vrátane rýb) —
  // slovom by „Kuracie prsia" prešli. Do v33 blokovalo 770 receptov, z toho 470 len pre maslo.
  // Alergén EÚ zadaný ako zakázaná surovina („orechy", „horčica", „zeler", „sezam", „sója", „vajcia"…)
  // platí podľa alergénov potravín — slovom by „Vegeta" (zeler) ani „Majonéza" (horčica) neprešli.
  const al=alergenyReceptu(r).map(bezDia);
  return zt.some(t=>bezDia(text).includes(t)) || obsahujeSurovinu(text, zt)
    || (al.length && zt.some(t=>al.some(a=>_slovoJeTvar(t,_tvarSlova(a)))))
    || (zt.some(t=>_slovoJeTvar(t,_tvarSlova("maso"))) && !diety(r).veg); }
// Rodina zdroja = prvý segment pred pomlčkou, bez zátvorky a bez rímskeho čísla dielu:
// „Varecha.sk – Guláš (autor: jokin)" → „Varecha.sk", „Jíme zdravě s Fitrecepty II" → bez „II".
// Bez toho by bol každý varecha recept vlastný zdroj (1282 chipov namiesto jedného).
// Účet „@meno" sa odreže tiež: „Instagram @iankyo" → „Instagram" (účet ostáva v detaile aj v zdroj_url).
function zdrojRodina(r){ return (r.zdroj||"").split(/ [–—] /)[0].replace(/\s*\(.*$/,"").replace(/\s+@\S+$/,"").replace(/\s+I{1,3}$/,"").trim()||"(bez zdroja)"; }
// Zoznam pre Nastavenia: [rodina, počet] od najväčšieho. Bez cache — RECEPTY sa mení pri „+ Nový recept".
// Kúpené výrobky (typ „vyrobok" — 187 snackov z Kauflandu) sa NERÁTAJÚ: nie sú to recepty
// z kuchárky, ale čo sa kúpi v obchode. Filter zdrojov ich preto ani nevylučuje — vypnutie
// „Kaufland" by inak nechalo snackový slot bez výrobku a generátor by doň dal guláš.
function zdrojeList(){ const m=new Map(); RECEPTY.forEach(r=>{ if(jeVyrobok(r))return; const z=zdrojRodina(r); m.set(z,(m.get(z)||0)+1); });
  return [...m].sort((a,b)=>b[1]-a[1]); }
// Oddeľovač je „|“, nie čiarka — názvy zdrojov čiarku obsahovať môžu.
function zdrojeOff(){ return new Set((S.profil.zdrojeOff||"").split("|").filter(Boolean)); }
// Vypnuté zdroje, ktoré NAOZAJ platia. Vypnúť všetky sa splniť nedá (prázdne Recepty aj plán),
// vtedy filter neplatí vôbec a Nastavenia to priznajú (zdrojeStav). Cache podľa reťazca
// a počtu receptov — prejdeProfil to volá ~2000× na jedno prekreslenie mriežky.
let _zdrojeAkt={k:null,set:null};
function zdrojeOffAktivne(){ const k=(S.profil.zdrojeOff||"")+"#"+RECEPTY.length;
  if(_zdrojeAkt.k!==k){ const off=zdrojeOff();
    _zdrojeAkt={k, set:(off.size && zdrojeList().every(([z])=>off.has(z))) ? new Set() : off}; }
  return _zdrojeAkt.set; }
function prejdeProfil(r){
  if(S.skryte[r.id]) return false; // skryté recepty sa nikdy nedostanú do generátora/plánu/návrhov
  // v31: vypnutý zdroj sa neukáže NIKDE — Recepty, hľadanie, návrhy, generátor, Domov.
  // Recept, ktorý už je v pláne, ostáva (plán číta cez receptById, rovnako ako skryté recepty).
  if(!jeVyrobok(r)){ const off=zdrojeOffAktivne(); if(off.size && off.has(zdrojRodina(r))) return false; }
  const d=diety(r);
  if(S.profil.ryby && d.ryby) return false;
  if(S.profil.lepok && !d.bezlepku) return false;
  if(S.profil.mlieko && !d.bezlaktozy) return false;
  if(zakazaneChyta(r)) return false;
  return true;
}
// `q` = dopyt hľadania (len mriežka Receptov): pri zhode v surovine karta povie, ktorá sedí
function kartaHTML(r,q){
  const sedi=q?hladaSuroviny(r,q):[];
  const d=diety(r); const v=vyzivaReceptu(r); const kc=v.kcal>5?Math.round(v.kcal):(r.kcal_na_porciu||0); const hod=S.hodn[r.id]||0;
  const hs=healthScore(r); // bodka len pre proteínovo bohaté (green/amber); pri nízkom proteíne žiadna (aby karty neboli more červených)
  const dotEl=(hs.farba!=="red")?'<span class="hdot hs-'+hs.farba+'" title="proteín '+fmt(hs.p100)+' g/100 kcal"></span>':'';
  const db=[dotEl,jeWatch(r)?'<span class="badge">⭐</span>':'',jeVakcii(r)?'<span class="badge price">🏷️ akcia</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 veg</span>':'',pripravaVopred(r)?'<span class="badge" title="Priprav deň/noc vopred">⏰ vopred</span>':''].join('');
  const thumb=thumbHTML(r,true); // loading="lazy" — mriežka dopĺňa po 60 kartách, obrázky sa ťahajú až keď treba
  // A8 (WCAG 2.1.1): karta bola dva `div onclick` (.thumb + .body) — klávesnica ju nevidela.
  // Teraz je to JEDEN obal `.card-open` s role/tabindex a aria-label; ★ ostáva samostatné tlačidlo
  // (skutočný <button> vnútri role="button" by bol vnorené tlačidlo, preto je .fav SÚRODENEC, nie potomok).
  const lab=escHtml(r.nazov);
  const fv=_favStav(r.id,lab);
  return '<button class="fav" aria-pressed="'+fv.p+'" aria-label="'+fv.l+'" onclick="event.stopPropagation();toggleFav(\''+r.id+'\')">'+fv.h+'</button>'+
    '<div class="card-open" role="button" tabindex="0" aria-label="'+lab+' — otvoriť recept" onclick="otvor(\''+r.id+'\')">'+
    '<div class="'+thumbTrieda(r)+'" aria-hidden="true">'+thumb+'</div>'+
    '<div class="body">'+
      '<span class="kat">'+escHtml(r.kategoria||"")+'</span><h3>'+lab+'</h3>'+
      '<div class="meta">'+(r.cas?'<span>⏱ '+escHtml(casText(r.cas))+'</span>':"")+(kc?'<span title="'+(v.pribl?"odhad — časť surovín sa nedá dopočítať":"")+'">🔥 '+(v.pribl?"≈ ":"")+kc+' kcal</span>':"")+'</div>'+
      (v.kcal>5?'<div class="macros">B '+fmtG(v.b)+' · T '+fmtG(v.t)+' · S '+fmtG(v.s)+' g</div>':'')+
      (sedi.length?'<div class="sedi">🥕 sedí: '+escHtml(sedi.join(", "))+'</div>':'')+
      '<div class="stars">'+(hod?starsHTML(hod):"")+'</div>'+
      spajzaMatchEl(r)+
      '<div class="diet">'+db+'</div></div></div>';
}
function spajzaMatchEl(r){ if(!_spajzaSkore)return ""; const s=_spajzaSkore[r.id]; if(!s||s.mame<1)return "";
  const info = s.chyba.length ? "chýba: "+s.chyba.slice(0,3).join(", ")+(s.chyba.length>3?"…":"") : "máš všetko 🎉";
  return '<div class="spajza-match">🧊 '+s.mame+'/'+s.spolu+' · '+info+'</div>';
}
// ── TVAR SLOVA (v33) — hľadanie v Receptoch, picker aj zakázané suroviny ──────────────────
// Do v33 stačil spoločný začiatok 3–5 znakov a do +6 navyše: „mäso" chytilo maslo (470×) a masť,
// „zeler" zeleninu (400×), „kura" kurkumu a kuriatka, „karbonara" karbonátky. Slovo teraz sedí,
// keď je to kmeň tokenu + skutočná koncovka (`_TV_OK`: pád, prídavné meno -ový/-ný/-ací, -ata
// z kurča/kurčatá, zdrobnenina -k/-ičk), a od 4 znakov aj keď slovo tokenom ZAČÍNA — písanie po
// písmenkách („brok" → brokolica). Náhradné kmene: pohyblivá samohláska (koriander → koriandrové),
// k/h/ch → č/ž/š (mlieko → mliečny) a vsuvka v 2. páde množného čísla (paradajka → paradajok,
// vajce → vajec). „Mám doma" má vlastné, prísnejšie `jeDoma` (opačná cena chyby).
const _TV_KONC=["","a","e","i","o","u","y","ou","om","mi","ami","iami","ach","iach","am","iam","och","ov","ej","eho","emu","ym","ymi","ych","im","imi","ich","ia","ie","iu","ii","ieho","iemu"];
const _TV_OK=new Set(["","ov","n","ac","at","iat","k","ick"].flatMap(p=>_TV_KONC.map(k=>p+k)));
const _TV_ODREZ=_TV_KONC.filter(Boolean).sort((a,b)=>b.length-a.length);
const _tvarCache=new Map(), _tvTokCache=new Map();
function _tvarSlova(t){ let x=_tvarCache.get(t); if(x) return x;
  const k=t.length>3?_TV_ODREZ.find(k=>t.length-k.length>=3 && t.endsWith(k)):null, s=k?t.slice(0,-k.length):t;
  const alt=[s], m=s.match(/^(.*[^aeiouy])[eo]([^aeiouy])$/), m2=s.match(/^(.+?)(ch|k|h)$/), m3=s.match(/^(.*[^aeiouy])([^aeiouy])$/);
  if(m && s.length>=5) alt.push(m[1]+m[2]);
  if(m2 && s.length>=4) alt.push(m2[1]+{k:"c",h:"z",ch:"s"}[m2[2]]);
  x={t, alt, vsuvka:(m3 && s.length>=4)?["o","ie","e"].map(v=>m3[1]+v+m3[2]):[]};
  // `k` = začiatok (max. 3 znaky), ktorým začína KAŽDÝ možný tvar — rýchly predvýber podreťazcom
  let zac=s.slice(0,3); [t,...alt,...x.vsuvka].forEach(a=>{ while(!a.startsWith(zac)) zac=zac.slice(0,-1); }); x.k=" "+zac;
  _tvarCache.set(t,x); return x; }
function _slovoJeTvar(w,x){ if(x.t.length>=4 && w.startsWith(x.t)) return true;
  return x.vsuvka.includes(w) || x.alt.some(a=>w.startsWith(a) && _TV_OK.has(w.slice(a.length))); }
// token môže mať viac slov („kuracie prsia" v zákazoch) — vtedy musia sadnúť ZA SEBOU.
// `str` = " "+slova.join(" "): natívny podreťazec vyradí ~95 % receptov skôr, než sa skúšajú tvary
// (bez neho bolo hľadanie „kura" 5× pomalšie než pôvodný prefix).
function _tvarVSlovach(slova,t,str){ let ts=_tvTokCache.get(t); if(!ts){ ts=_slova(t).map(_tvarSlova); _tvTokCache.set(t,ts); }
  if(!ts.length || (str!==undefined && !str.includes(ts[0].k))) return false;
  if(ts.length===1) return slova.some(w=>_slovoJeTvar(w,ts[0]));
  for(let i=0;i+ts.length<=slova.length;i++) if(ts.every((x,j)=>_slovoJeTvar(slova[i+j],x))) return true;
  return false; }
// To isté iným slovom — platí obojsmerne v hľadaní aj v zákazoch („kinoa" 0 → quinoa, „vajíčka"
// 52 vs. „vajcia" 596). DRUHY platia len jedným smerom a len v hľadaní: „huby" nájde šampiňóny,
// ale zakázané „huby" šampiňóny neblokuje (test_ux U2) a „šampiňón" nenájde dubáky.
const SYNONYMA=[["vajce","vajicko"],["kinoa","quinoa"],["spagety","spaghetti","spagetti"],["karbonara","carbonara"],
  ["zeler","celer"],["kura","kurca","chicken"],["paradajka","rajcina","rajciak","tomato"],["zemiak","brambor"],
  ["sampinon","sampion","champignon"],["cuketa","zucchini","cukina"],["cicer","chickpea","garbanzo"],["hovadzie","beef"],["losos","salmon"]];
const DRUHY={huby:["sampinon","hrib","dubak","hliva","shiitake","kuriatko","bedla"]};
const _rozsirCache=new Map();
function _rozsir(t,druhy){ const kl=t+"|"+(druhy?1:0); let v=_rozsirCache.get(kl); if(v) return v;
  v=[t];
  if(!t.includes(" ")){ const je=m=>_slovoJeTvar(t,_tvarSlova(m)), pridaj=m=>{ if(!v.includes(m)) v.push(m); };
    SYNONYMA.forEach(g=>{ if(g.some(je)) g.forEach(pridaj); });
    if(druhy) for(const k in DRUHY) if(je(k)) DRUHY[k].forEach(pridaj); }
  _rozsirCache.set(kl,v); return v; }
// Dopyt: medzera/čiarka = AND, „bez X" a „-X" = vylúč X („kura bez ryže"). Spojky sa ignorujú
// („kura s ryžou"). Vylúčené „mäso" znamená všetko, čo nie je 🌱 veg — slovom by „Kuracie prsia" prešli.
const _STOP=new Set(["a","s","so","z","zo","na","v","vo","do","po","k","ku","o","pre","pri","aj","alebo","and","with","the","of"]);
const _dotazCache=new Map();
function _menejZhod(p,n){ let k=0; for(const r of RECEPTY) if(_hladaUroven(hladaHay(r),p,4)>=0 && ++k>=n) return false; return true; }
function _dotaz(q){ let d=_dotazCache.get(q); if(d) return d;
  d={plus:[],minus:[]}; const tok=q.split(/[\s,;]+/).filter(Boolean);
  for(let i=0;i<tok.length;i++){ let t=tok[i], neg=false;
    if(t==="bez"){ if(i+1>=tok.length) break; neg=true; t=tok[++i]; }
    if(t[0]==="-"){ neg=true; t=t.slice(1); }
    t=_slova(t).join(" "); if(!t || _STOP.has(t)) continue;
    const bezX=!neg&&/^bez(lepk|laktoz|mlie|masit|masov)/.test(t);
    if(bezX){ (/^bezlepk/.test(t)?d.minus.push({v:[],lepok:true}):/^bez(laktoz|mlie)/.test(t)?d.minus.push({v:[],mlieko:true}):d.minus.push({v:[],maso:true})); continue; }
    const p={v:_rozsir(t,true), maso:neg && _slovoJeTvar(t,_tvarSlova("maso")),
      // „bez lepku" / „bez laktózy" = diétny príznak, nie slovo: slovom prešlo 1339 receptov s múkou (audit 8. 10.)
      lepok:neg && _slovoJeTvar(t,_tvarSlova("lepok")), mlieko:neg && ["laktoza","mlieko"].some(m=>_slovoJeTvar(t,_tvarSlova(m)))};
    // Krátky token sa ešte píše: 1–2 znaky a 3 znaky bez jedinej zhody tvarom („bro" → brokolica)
    // hľadajú začiatok slova, inak by písanie po písmenkách ukazovalo „Nič sa nenašlo". Celé krátke
    // slovo so zhodou („med", „syr", „kur") ostáva prísne — medvedí cesnak ani kurkuma neprejdú.
    // Hranica sú 3 zhody, nie 0: jediný anglický názov („…Flat Broke") by inak „bro" prestal hľadať ako začiatok slova.
    if(!neg && (t.length<=2 || (t.length===3 && _menejZhod(p,3)))) p.zac=" "+t;
    (neg?d.minus:d.plus).push(p); }
  if(_dotazCache.size>300) _dotazCache.clear();
  _dotazCache.set(q,d); return d; }
// Hay sú štyri polia s váhou: názov 3 > tagy/kuchyňa/kategória 2 > suroviny 1 > popis/zdroj 0.
// Kuchyňa, kategória a zdroj v ňom do v33 chýbali („talianska" 62 vs. filter 114, „BBC" 0).
// Cachuje sa mimo receptu (nie ako `r._hay` — to by sa uložilo do localStorage pri vlastných receptoch).
const _hayCache=new Map();
function hladaHay(r){ let h=_hayCache.get(r.id);
  if(!h){ h=[_slova(""+(r.nazov||"")), _slova((r.tagy||[]).join(" ")+" "+(r.kuchyna||"")+" "+(r.kategoria||"")),
    _slova((r.ingrediencie||[]).map(i=>i.nazov).join(" ")), _slova((r.popis||"")+" "+zdrojRodina(r))];
    h.s=h.map(sl=>" "+sl.join(" ")); _hayCache.set(r.id,h); }
  return h; }
function _hladaUroven(h,p,polia){ for(let i=0;i<polia;i++) if(p.zac?h.s[i].includes(p.zac):p.v.some(t=>_tvarVSlovach(h[i],t,h.s[i]))) return 3-i; return -1; }
// −1 = nesedí; inak súčet úrovní cez tokeny dopytu (radenie podľa relevancie v Receptoch aj v pickri).
// Vylučuje sa podľa názvu, tagov a surovín — tých istých polí ako zakázané suroviny, nie popisu.
function hladaSkore(r,q){ if(!q) return 0; const d=_dotaz(q), h=hladaHay(r); let sk=0;
  for(const p of d.minus) if(_hladaUroven(h,p,3)>=0 || (p.maso && !diety(r).veg) || (p.lepok && !diety(r).bezlepku) || (p.mlieko && !diety(r).bezlaktozy)) return -1;
  for(const p of d.plus){ const u=_hladaUroven(h,p,4); if(u<0) return -1; sk+=u; }
  return sk; }
function hladaSedi(r,q){ return hladaSkore(r,q)>=0; }
// Ktoré suroviny sedia, keď zhoda NIE JE v názve ani v tagoch — karta v Receptoch aj riadok pickra
// („🥕 sedí: kuracie prsia"), inak výsledok vyzerá náhodne.
function hladaSuroviny(r,q){ const out=[]; if(!q) return out; const h=hladaHay(r);
  _dotaz(q).plus.forEach(p=>{ if(_hladaUroven(h,p,4)!==1) return;
    const i=(r.ingrediencie||[]).find(i=>{ const sl=_slova(i.nazov); return p.zac?(" "+sl.join(" ")).includes(p.zac):p.v.some(t=>_tvarVSlovach(sl,t)); });
    if(i && !out.includes(i.nazov)) out.push(i.nazov); });
  return out; }
function renderGrid(){
  const grid=document.getElementById("grid");
  const q=bezDia(document.getElementById("hladaj").value.trim());
  const fk=document.getElementById("f-kuchyna").value;
  const fz=(document.getElementById("f-zdroj")||{}).value||"";
  const fc=parseInt(document.getElementById("f-cas").value)||0;
  const fd=document.getElementById("f-diet").value;
  const fs=(document.getElementById("f-sort")||{}).value||"";
  grid.innerHTML="";
  { const cta=document.getElementById("bar-cta"); if(cta) cta.innerHTML=aktivnaKat==="Kokteil"?'<button class="btn" style="margin-bottom:12px" onclick="otvorBar()">🍸 Môj bar — čo namiešam z toho, čo mám</button>':""; }
  const showHidden=fd==="skryte";
  // v33: kúpené výrobky (187 snackov) v kolekciách a radení zaplavili výsledok — „Do 20 min" 187
  // z 739, „Najrýchlejšie" a „Vysoký proteín" samé balenia. Tam sú predvolene preč a vráti ich
  // prepínač „🛒 aj kúpené výrobky"; chip „Snack", „Obľúbené", A–Z a predvolené radenie ich ukazujú vždy.
  const vyrobkyZalezi=aktivnaKat!=="Snack" && ((aktivnaKolekcia && aktivnaKolekcia!=="oblubene") || (fs && fs!=="nazov"));
  const vyrobkyPrec=vyrobkyZalezi && !aktVyrobky;
  const skore=new Map(); let vyrobkovPrec=0;
  let zoz=RECEPTY.filter(r=>{
    if(showHidden) return !!S.skryte[r.id]; // správcovský pohľad: len skryté, ostatné filtre ignoruj
    if(!prejdeProfil(r)) return false; // prejdeProfil už vylučuje skryté
    if(aktivnaKolekcia){ const K=KOLEKCIE.find(k=>k.id===aktivnaKolekcia); if(K && !K.test(r)) return false; }
    if(aktivnaKat!=="Všetko"&&r.kategoria!==aktivnaKat) return false;
    if(fk&&r.kuchyna!==fk) return false;
    if(fz&&zdrojRodina(r)!==fz) return false;
    if(fc&&casMin(r)>fc) return false;
    if(fd==="fav"&&!S.fav[r.id]) return false;
    if(fd==="veg"&&!diety(r).veg) return false;
    if(fd==="lepok"&&!diety(r).bezlepku) return false;
    if(fd==="mlieko"&&!diety(r).bezlaktozy) return false;
    const s=hladaSkore(r,q); if(s<0) return false;
    if(vyrobkyPrec && jeVyrobok(r)){ vyrobkovPrec++; return false; }
    skore.set(r.id,s); return true;
  });
  _spajzaSkore=null;
  if(fs==="spajza"){ const mam=mamZoSpajze(); // radenie podľa zhody so špajzou + boost pre expirujúce
    if(mam.length){ _spajzaSkore={}; zoz.forEach(r=>{ const s=skoreReceptu(r,mam); _spajzaSkore[r.id]=Object.assign(s,{score:s.mame-1.5*s.chyba.length+expBoost(r)}); });
      zoz.sort((a,b)=>_spajzaSkore[b.id].score-_spajzaSkore[a.id].score); } }
  else if(fs==="nazov") zoz.sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk"));
  else if(fs==="cas") zoz.sort((a,b)=>(casMin(a)||999)-(casMin(b)||999));
  // recept bez kcal (0) na koniec — „Najmenej kcal" ho dávalo na prvé miesto
  else if(fs==="kcal") zoz.sort((a,b)=>(kcalPorcia(a)||1e9)-(kcalPorcia(b)||1e9));
  else if(fs==="kcald") zoz.sort((a,b)=>(kcalPorcia(b)||0)-(kcalPorcia(a)||0));
  else if(fs==="hodn") zoz.sort((a,b)=>(S.hodn[b.id]||0)-(S.hodn[a.id]||0));
  // B4: predvolené (abecedné) radenie dávalo na prvú obrazovku 5 kokteilov zo 6 — „155 Belmont",
  // „3-Mile Long Island Iced Tea", „A midsummernight dream"… Nápojov a kokteilov je 125 a v pláne
  // na 1450 kcal ich nepoužiješ. Predvolené radenie ich preto posúva za jedlá; poradie v rámci
  // skupín zostáva pôvodné (abecedné), takže sa nič nestratí a chip „🍸 Kokteil" ich ukáže hneď.
  // v33: pri hľadaní ide pred to relevancia (hladaSkore) — „kura" dávalo 4. „Baby Hokkaido polievku".
  else { const napoj=r=>(r.kategoria==="Kokteil"||r.kategoria==="Nápoj")?1:0, pix=r=>jePix(r)?1:0;
    zoz=zoz.map((r,i)=>[r,i]).sort((a,b)=>(skore.get(b[0].id)-skore.get(a[0].id))||(napoj(a[0])-napoj(b[0]))||(pix(a[0])-pix(b[0]))||(a[1]-b[1])).map(x=>x[0]); }
  const filtreAktivne = q||fk||fz||fc||fd||aktivnaKat!=="Všetko"||aktivnaKolekcia||vyrobkyPrec;
  // U1: na telefóne sú selecty schované za tlačidlom „Filtre" — bez počtu by používateľ nevidel, že filtruje
  const fcnt=document.getElementById("f-cnt"); if(fcnt){ const n=[fk,fz,fc,fd,fs].filter(Boolean).length; fcnt.textContent=n; fcnt.hidden=!n; }
  const vp=document.getElementById("vyrobky-prep");
  if(vp){ vp.hidden=!(vyrobkyZalezi && (aktVyrobky||vyrobkovPrec>0));
    vp.innerHTML=vp.hidden?"":`<button class="kol-tile${aktVyrobky?" active":""}" aria-pressed="${aktVyrobky}" onclick="prepniVyrobky()">🛒 aj kúpené výrobky${aktVyrobky?"":" (+"+vyrobkovPrec+")"}</button>`; }
  const em=document.getElementById("empty");
  em.style.display=zoz.length?"none":"block";
  if(!zoz.length) em.innerHTML = filtreAktivne ? prazdnyHTML(q) : "Zatiaľ žiadne recepty.";
  if(fs==="spajza" && !_spajzaSkore && zoz.length){ em.style.display="block"; em.innerHTML='🧊 Špajza je prázdna — pridaj zásoby v <a onclick="prepni(\'spajza\')" style="cursor:pointer;color:var(--accent);text-decoration:underline">Špajzi</a>, potom zoradím recepty podľa toho, čo máš doma.'; }
  // R3: živý počet výsledkov. v31: vypnuté zdroje sa nerátajú ani do celku — „2220 receptov" nad
  // mriežkou s 939 kartami by tvrdilo, že zvyšok niekde je.
  // v34: celok = recepty, ktoré profil (diéta, zákazy, zdroje, skryté) pustí — alergik videl „3593", hoci prešlo 1720
  const celok=RECEPTY.filter(r=>jeVyrobok(r)||prejdeProfil(r)).length, skryte=RECEPTY.length-celok;
  const pc=document.getElementById("pocet"); if(pc) pc.textContent = filtreAktivne ? (zoz.length+" / "+celok) : celok;
  const ps=document.getElementById("pocet-skryte"); if(ps) ps.textContent = skryte>0 ? " ("+skryte+" skrytých podľa diéty, zákazov a zdrojov)" : "";
  _gridZoz=zoz; _gridQ=q; _gridPos=0; _gridPridajDavku(); _gridSledujKoniec(); _gridDopln();
}
function prepniVyrobky(){ aktVyrobky=!aktVyrobky; renderGrid(); }
// Prázdny výsledok: rada + skutočné <button> (odkaz bez href klávesnica preskočila) a priznanie,
// že zhody sú vo vypnutých zdrojoch alebo medzi skrytými — inak to vyzerá, že recept neexistuje.
function prazdnyHTML(q){ let h='<p>Nič sa nenašlo'+(q?' pre „'+escHtml(document.getElementById("hladaj").value.trim())+'“':'')+'.</p>';
  if(q){ const off=zdrojeOffAktivne(); let vZdr=0,vSkr=0;
    RECEPTY.forEach(r=>{ if(!hladaSedi(r,q)) return; if(S.skryte[r.id]) vSkr++; else if(!jeVyrobok(r) && off.has(zdrojRodina(r))) vZdr++; });
    const kolko=n=>sklon(n,"recept je","recepty sú","receptov je");
    if(vZdr) h+='<p>'+kolko(vZdr)+' vo vypnutých zdrojoch — <button class="lnk" onclick="prepni(\'nastavenia\')">Nastavenia → 📚 Zdroje receptov</button></p>';
    if(vSkr) h+='<p>'+kolko(vSkr)+' medzi skrytými (Filtre a radenie → 🚫 Skryté).</p>';
    h+='<p class="info">Skús menej slov alebo základný tvar (kura, ryža). Surovinu vylúčiš: „kura bez ryže“.</p>'; }
  return h+'<button class="btn" onclick="zrusFiltre()">Zrušiť filtre</button>'; }
// A9 (výkon): mriežka vykresľovala všetkých 1956 receptov naraz (28 000 DOM uzlov, ~130–300 ms).
// Teraz sa vykreslí prvá dávka a ďalšie sa dopĺňajú, keď sa pätička priblíži k oknu (IntersectionObserver).
// Tlačidlo „Načítať ďalšie" je zároveň cieľom observera aj plnohodnotným ovládaním pre klávesnicu
// a pre prehliadače bez IO — filtrovanie, hľadanie ani počítadlá sa nemenia, tie pracujú nad `zoz`.
const GRID_DAVKA=60;
let _gridZoz=[], _gridPos=0, _gridIO=null, _gridQ="";
function _gridPridajDavku(){
  const grid=document.getElementById("grid"); if(!grid)return 0;
  const koniec=Math.min(_gridPos+GRID_DAVKA,_gridZoz.length);
  for(let i=_gridPos;i<koniec;i++){ const r=_gridZoz[i];
    const c=document.createElement("div"); c.className="card"+(S.skryte[r.id]?" skryty":""); c.innerHTML=kartaHTML(r,_gridQ); grid.appendChild(c); }
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
// R2. v33: vracia aj radenie — #f-cnt ho ráta („Filtre a radenie 1"), takže po „Zrušiť" svietila jednotka.
function zrusFiltre(){ const h=document.getElementById("hladaj"); if(h)h.value=""; ["f-kuchyna","f-zdroj","f-cas","f-diet","f-sort"].forEach(id=>{const e=document.getElementById(id); if(e)e.value="";}); aktivnaKat="Všetko"; aktivnaKolekcia=""; aktVyrobky=false; renderChips(); renderKolekcie(); renderGrid(); }
// P2: jedno miesto, kde sa pýtame „je to telefón?" — rovnaká hranica ako v CSS (820 px).
function jeMobil(){ return typeof matchMedia==="function" && matchMedia("(max-width:820px)").matches; }
// U1: sekundárne panely sú na telefóne zbalené; na počítači ostávajú otvorené (je tam miesto)
function zbalNaMobile(){ if(typeof matchMedia!=="function" || !matchMedia("(max-width:820px)").matches) return;
  document.querySelectorAll("details.mob-zbal[open]").forEach(d=>{ d.open=false; }); }
// U1: na telefóne sú filtre a radenie zbalené za jedno tlačidlo (4 selecty pod sebou zabrali celú obrazovku)
function prepniFiltre(){ const box=document.getElementById("rec-controls"); if(!box)return;
  const otv=box.classList.toggle("f-open"); const b=document.getElementById("f-toggle"); if(b)b.setAttribute("aria-expanded",otv?"true":"false"); }
// v31: ★ má tri stavy — ☆ nič → ½ „mám rád, občas" → ★ obľúbené → ☆. Staré `true` = celá hviezda.
// Obidva stavy sú „obľúbené" (filter, kolekcia, Domov); generátor ich odporúča rôzne silno.
function favStupen(id){ const v=S.fav[id]; return v===0.5?0.5:(v?1:0); }
// `lab` ide do HTML atribútu v kartaHTML (escapovaný), v toggleFav do setAttribute (surový)
function _favStav(id,lab){ const fs=favStupen(id); return {p:fs===1?"true":fs?"mixed":"false",
  l:(fs===1?"Odobrať z obľúbených: ":fs?"Napoly obľúbené, ťukni pre celú hviezdu: ":"Pridať do obľúbených (pol hviezdy): ")+lab,
  h:fs===1?"★":fs?'<span class="star-slot" aria-hidden="true"><span class="star-e">☆</span><span class="star-f" style="width:50%">★</span></span>':"☆"}; }
// ★ sa mení NA MIESTE: prekreslenie mriežky zahodilo fokus (klávesnica na <body>) aj kartu za 60.
// Prekresľuje sa len to, čo od obľúbených naozaj závisí (filter/kolekcia „obľúbené", Domov).
// „⚖️ Rozdeľ hrniec" (Nutriadapt „gramážová kuchárka"): hotové jedlo sa odváži a appka povie gramy pre každého
// a každý deň bloku. Porcie sú v jednotkách porcie hlavného stravníka, osoba j zje kcal_j/kcal_hlavného z nich.
// Kolo 3: delí sa NEzaokrúhleným pomerom — každé jedlo bloku (deň × slot) dostane podiel podľa svojich porcií,
// v ňom každý stravník podľa svojich kcal. Súčet krabičiek = presne hrniec (predtým 91–109 %, pri jednom hrnci 2×).
async function rozdelHrniec(id,di){ const c=_poslednyCtx||{}; if(di==null) di=c.di; if(!id) id=(di!=null&&c.slot&&slotIds(di,c.slot)[0])||(aktualny&&aktualny.id);
  const r=komponent(id); if(di==null||!r) return;
  const v=await promptModal("Koľko váži celý hotový hrniec „"+r.nazov+"“ (g, bez hrnca)?","","decimal","⚖️ Rozdeliť"); if(v===null) return;
  const W=parseFloat(String(v).replace(",",".")); if(!(W>0)||W>50000){ toast("Zadaj hmotnosť hrnca v gramoch (do 50 kg)."); return; }
  const jedla=[]; dniDoma(denyBloku(di)).forEach(d=>slotyDna(d).forEach(sl=>{ if(slotIds(d,sl).includes(id)) jedla.push({d,sl,p:porcieSlot(d,sl)*pf(d,sl)}); }));
  if(!jedla.length) jedla.push({d:di,sl:c.slot||"",p:1});
  const T=jedla.reduce((a,x)=>a+x.p,0)||1, l=stravniciList(), masite=vegPodiel()>0&&!diety(r).veg, _je=(p,d,sl)=>jeDomaVSlote(p,d,sl)&&!(masite&&p.veg);
  const sloty=[...new Set(jedla.map(x=>x.sl))], ndni=new Set(jedla.map(x=>x.d)).size;
  // kolo 4 (kuchár, QA, rodič): kto je v ten deň mimo domu, krabičku nedostane — hrniec je navarený len pre prítomných
  let krab=0;
  const riadky=l.map(p=>{ const casti=sloty.map(sl=>{ const vsetky=jedla.filter(x=>x.sl===sl), js=vsetky.filter(x=>_je(p,x.d,sl)); if(!js.length) return "";
      const g=js.map(x=>{ const pr=l.filter(q=>_je(q,x.d,sl)), s2=pr.reduce((a,q)=>a+(+q.kcal||0),0); return W*x.p/T*(s2>0?(+p.kcal||s2/pr.length)/s2:1/pr.length); });
      krab+=js.length; const dni=js.length<vsetky.length?" ("+js.map(x=>DNI[x.d].slice(0,2)).join(", ")+")":"";
      return (sloty.length>1?escHtml(sl.toLowerCase())+" ":"")+Math.round(g.reduce((a,b)=>a+b,0)/g.length/5)*5+"&nbsp;g"+dni; }).filter(Boolean);
    return '<div class="sp-row"><span><b>'+escHtml(p.nazov||"?")+'</b></span><span>'+(casti.length?casti.join(" · "):'<span class="info">'+(masite&&p.veg?"🌱 svoju porciu bez mäsa má zvlášť":"mimo domu")+'</span>')+'</span></div>'; }).join("");
  document.getElementById("pick-modal").innerHTML='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>⚖️ Rozdelenie hrnca</h2><div class="subx">'+escHtml(r.nazov)+' · '+fmt(W)+' g · '+escHtml(sloty.join(" a ").toLowerCase())+' na '+sklon(ndni,"deň","dni","dní")+'</div></div><div class="content2">'
    +'<p class="info">Do krabičky na jedno jedlo:</p>'+riadky+'<p class="info" style="margin-top:8px">Spolu '+sklon(krab,"krabička","krabičky","krabičiek")+' — každému na každé jedlo, keď je doma.</p><div class="btn-row"><button class="btn primary" onclick="zavriPick()">Hotovo</button></div></div>';
  document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
// Hlásenie ide do okna (riadok jedla), nie do toastu — toast zakrýval hviezdy 2–5 aj s fokusom (kolo 3, prístupnosť).
function chutiloVolba(id,i){ hodnot(id,i); const row=document.querySelector('#pick-modal .chutilo-riadok[data-id="'+id+'"]');
  if(row){ if(row._hotovo) return; row._hotovo=1; row.querySelectorAll(".star-cil").forEach((b,ix)=>{ const e=b.querySelector(".star-e"); if(e&&ix<i){ e.textContent="★"; e.style.color="var(--zlato)"; animuj(b,"puk"); } }); }
  const zvysne=[...document.querySelectorAll('#pick-modal .chutilo-riadok')].filter(x=>x!==row);
  setTimeout(()=>{ if(!zvysne.length){ zavriPick(); toast("Ďakujem — "+(i>=4?"budem ho ponúkať častejšie.":i<=2?"budem ho ponúkať zriedka.":"zapísané.")); return; }
    const b=zvysne[0].querySelector("button"); if(b) b.focus({preventScroll:true});
    if(row&&_pohyb()){ row.style.overflow="hidden"; row.style.height=row.offsetHeight+"px"; row.style.transition="height 180ms ease, opacity 180ms ease"; requestAnimationFrame(()=>{ row.style.height="0px"; row.style.opacity="0"; }); setTimeout(()=>row.remove(),200); } else if(row) row.remove(); }, _pohyb()?300:0); }
function akoChutilo(ids){ const rs=[].concat(ids).map(id=>receptById(id)).filter(Boolean); if(!rs.length) return; { const t=document.getElementById("toast"); if(t&&t._akcia) toastSkry(); }
  document.getElementById("pick-modal").innerHTML='<div class="hero"><button class="close" onclick="zavriPick()" aria-label="Zavrieť hodnotenie">✕</button><h2>Ako chutilo?</h2><div class="subx">'+(rs.length>1?"Ohodnoť jedlá, ktoré si navaril(a)":escHtml(rs[0].nazov))+'</div></div><div class="content2">'
    +rs.map(r=>'<div class="chutilo-riadok" data-id="'+r.id+'">'+(rs.length>1?'<p style="text-align:center;margin:10px 0 0"><b>'+escHtml(r.nazov)+'</b></p>':'')+'<div class="starpick" style="justify-content:center" role="group" aria-label="Hodnotenie: '+escHtml(r.nazov)+'">'+[1,2,3,4,5].map(i=>'<button type="button" class="star-cil" aria-label="'+i+' z 5" onclick="chutiloVolba(\''+r.id+'\','+i+')"><span class="star-slot" aria-hidden="true"><span class="star-e">☆</span></span></button>').join("")+'</div></div>').join("")
    +'<p class="info" style="text-align:center">Hodnotenie mení, ako často generátor jedlo ponúkne.</p><div class="btn-row" style="justify-content:center"><button class="btn" onclick="zavriPick()">Preskočiť</button></div></div>';
  document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function toggleFav(id){ const n=({0:0.5,0.5:1,1:0})[favStupen(id)]; if(n)S.fav[id]=n; else delete S.fav[id]; save();
  const r=receptById(id), fv=_favStav(id,r?r.nazov:"");
  document.querySelectorAll('.fav[onclick*="toggleFav(\''+id+'\')"]').forEach(b=>{ b.setAttribute("aria-pressed",fv.p); b.setAttribute("aria-label",fv.l); b.innerHTML=fv.h; animuj(b,"puk"); }); tik();
  if((document.getElementById("f-diet")||{}).value==="fav" || aktivnaKolekcia==="oblubene") drzFokus(renderGrid);
  if(document.getElementById("v-domov").classList.contains("active")) drzFokus(renderDash); }
function toggleSkryt(id){ if(S.skryte[id])delete S.skryte[id]; else S.skryte[id]=1; save(); renderGrid(); otvor(id,_poslednyCtx);
  if(S.skryte[id]) toast(SKRYTE_TOAST(receptById(id))); }
// v31: skrytie = „už nezobrazovať" — recept zmizne z Receptov, hľadania, návrhov aj generátora
// (prejdeProfil). Dá sa vrátiť, preto to toast hovorí nahlas.
const SKRYTE_TOAST=r=>"🚫 „"+(r?r.nazov:"Recept")+"“ sa už nezobrazí. Vrátiš ho v Receptoch: Filtre → 🚫 Skryté.";
// v31: „už nezobrazovať" priamo z plánu — recept sa skryje a v bloku ho hneď nahradí iný (ako 🎲).
function nezobrazovatVSlote(di,slot){ const k=komponent(slotIds(di,slot)[0]); if(!k||k._left||k._priloha)return;
  zapamatajTyzden(true); const n=_undoZ.length; // snímka aj so S.skryte — „↩ Späť" vráti jedlo aj skrytie
  S.skryte[k.id]=1; regenerujSlot(di,slot); _undoZ.length=n; renderGrid(); toastSpat(SKRYTE_TOAST(k)); }
// `id` = úprava vlastného receptu: ten istý formulár, predvyplnený; ulozNovyRecept(id) ho uloží
// na mieste (rovnaké id → obľúbené, hodnotenie, poznámka aj miesto v pláne ostanú).
function novyRecept(id){ const IST="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px";
  const kats=["Raňajky","Hlavné jedlo","Cestoviny","Polievka","Šalát","Nátierka","Príloha","Pečivo","Snack","Dezert","Nápoj","Kokteil"];
  const r=id?receptById(id):null, m=r&&r._moj?r:null, v=k=>m&&m[k]!=null?escHtml(m[k]):"";
  _nrZdroj=null;
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${m?"Upraviť recept":"Nový recept"}</h2></div><div class="content2">
    ${m?"":`<details class="panel" id="nr-imp-box"><summary>📥 Vložiť recept z webu alebo textu</summary>
      <textarea id="nr-imp" class="doma-in" placeholder="Vlož odkaz na recept, alebo celý skopírovaný text receptu (názov, suroviny, postup)…" style="min-height:90px"></textarea>
      <div class="btn-row"><button class="btn primary" onclick="importujRecept()">Načítať do formulára</button></div>
      <p class="info" style="margin:4px 0 0">Formulár sa predvyplní a pred uložením ho skontroluješ. Odkaz niektoré stránky prehliadaču nedovolia načítať — vtedy na stránke označ text receptu, skopíruj ho a vlož sem.</p></details>`}
    <div class="field"><label>Názov *</label><input id="nr-nazov" value="${v("nazov")}" style="${IST}"></div>
    <div class="field"><label>Kategória</label><select class="f" id="nr-kat">${kats.map(k=>`<option${(m?m.kategoria===k:k==="Hlavné jedlo")?" selected":""}>${k}</option>`).join("")}</select></div>
    <div class="field"><label>Kuchyňa</label><input id="nr-kuch" value="${v("kuchyna")}" placeholder="napr. Talianska" style="${IST}"></div>
    <div class="field"><label>Počet porcií</label><input id="nr-porcie" type="number" min="1" max="99" value="${m?v("porcie"):"2"}" style="${IST}"></div>
    <div class="field"><label>Čas</label><input id="nr-cas" value="${v("cas")}" placeholder="napr. 30 min" style="${IST}"></div>
    <div class="field"><label>Fotka (voliteľné)</label>
      <div id="nr-foto-box"></div>
      <input type="file" id="nr-foto-in" accept="image/*" onchange="nrFotoZmena(this)" style="${IST};border-color:var(--okraj)">
      <p class="info" style="margin:4px 0 0">Odfoť hotové jedlo telefónom. Fotka sa v prehliadači zmenší na 320×180 a uloží sa priamo do appky — nič sa nikam neposiela.</p></div>
    <h3 class="sekcia">Ingrediencie (vyber zo zoznamu potravín)</h3><div id="nr-ing"></div>
    <button class="btn" onclick="pridajIngRiadok()">+ ďalšia surovina</button>
    <h3 class="sekcia" id="nr-postup-l">Postup (každý krok na nový riadok)</h3>
    <textarea id="nr-postup" class="doma-in" aria-labelledby="nr-postup-l" placeholder="Zmiešaj suroviny...&#10;Peč 20 minút...">${m?escHtml((m.postup||[]).join("\n")):""}</textarea>
    <div class="field"><label>Tip (voliteľné)</label><input id="nr-tip" value="${v("tipy")}" style="${IST}"></div>
    <div class="btn-row"><button class="btn primary" onclick="ulozNovyRecept(${m?`'${m.id}'`:""})">${m?"Uložiť zmeny":"Uložiť recept"}</button></div></div>`;
  _nrFoto=m&&fotoSrc(m)?m.foto:""; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal");
  nrFotoNahlad();
  if(m){ (m.ingrediencie||[]).forEach(i=>pridajIngRiadok(i)); pridajIngRiadok(); }
  else { pridajIngRiadok(); pridajIngRiadok(); pridajIngRiadok(); } }

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
function pridajIngRiadok(i){ const box=document.getElementById("nr-ing"); if(!box)return;
  const d=document.createElement("div"); d.className="controls"; d.style.marginBottom="6px"; d.style.padding="0";
  const v=k=>i&&i[k]!=null?escHtml(i[k]):""; // `i` = surovina pri úprave receptu
  const n=box.children.length+1; // menovky polí s číslom riadku — čítačka inak počula N× „množ."
  // B7: „% zje" = koľko zo suroviny naozaj skončí v jedle (olej na vyprážanie ~20 %). Prázdne = 100 %.
  d.innerHTML=`<input list="potraviny-dl" class="nr-in" aria-label="Surovina ${n}" value="${v("nazov")}" placeholder="surovina" style="flex:1;min-width:120px;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" class="nr-mn" aria-label="Množstvo — surovina ${n}" min="0" value="${v("mnozstvo")}" placeholder="množ." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px"><input class="nr-jed" aria-label="Jednotka — surovina ${n}" list="jedn-dl" value="${v("jednotka")}" placeholder="jedn." style="width:90px;padding:8px;border:1px solid var(--line);border-radius:8px"><input type="number" class="nr-vs" aria-label="Percento, ktoré sa zje — surovina ${n}" min="1" max="100" value="${i&&i.vsiaknutie<1?Math.round(i.vsiaknutie*100):""}" placeholder="% zje" title="Koľko percent suroviny sa naozaj zje (olej na vyprážanie ~20 %). Prázdne = celé." style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">`;
  box.appendChild(d); }
// Ukladá sa SUROVÝ text — escapuje sa pri vykresľovaní (do v32 sa tu escapovalo pri zápise
// a „Soľ & korenie" svietilo v detaile aj v Nákupe ako „Soľ &amp; korenie").
// `id` = úprava existujúceho vlastného receptu na mieste.
function ulozNovyRecept(id){ const nazov=(document.getElementById("nr-nazov").value||"").trim(); if(!nazov){toast("Zadaj názov receptu.");return;}
  const ing=[]; let zle="";
  document.querySelectorAll("#nr-ing .controls").forEach(row=>{ const n=(row.querySelector(".nr-in").value||"").trim(); if(!n)return;
    const mnT=(row.querySelector(".nr-mn").value||"").trim(), mn=parseFloat(mnT); const jed=(row.querySelector(".nr-jed").value||"").trim();
    if(mnT && !(mn>0)){ zle=zle||n; return; }
    const vsEl=row.querySelector(".nr-vs"); const vsPct=vsEl?parseFloat(vsEl.value):NaN;
    const o={nazov:n,mnozstvo:mnT?mn:null,jednotka:jed};
    // B7: pole prežije uloženie aj načítanie z localStorage; mimo 1–99 % nemá zmysel ho ukladať
    if(!isNaN(vsPct)&&vsPct>0&&vsPct<100) o.vsiaknutie=Math.round(vsPct)/100;
    ing.push(o); });
  if(zle){ toast("Množstvo pri „"+zle+"“ musí byť kladné číslo — alebo ho nechaj prázdne (podľa chuti)."); return; }
  if(!ing.length){ toast("Pridaj aspoň jednu surovinu."); return; }
  const pT=(document.getElementById("nr-porcie").value||"").trim(), porcie=pT?parseFloat(pT):2;
  if(!(porcie>0 && porcie<=99)){ toast("Počet porcií musí byť kladné číslo (najviac 99)."); return; }
  const postup=(document.getElementById("nr-postup").value||"").split(/\n+/).map(x=>x.replace(/^\s*\d+[\.\)]\s*/,"").trim()).filter(Boolean);
  const stary=id?S.mojeRecepty.find(x=>x.id===id):null;
  const foto=_nrFoto&&((stary&&_nrFoto===stary.foto)||fotoVojdeDoUloziska(_nrFoto))?_nrFoto:"";
  const pol={ nazov, kategoria:document.getElementById("nr-kat").value, kuchyna:(document.getElementById("nr-kuch").value||"").trim(),
    porcie, cas:(document.getElementById("nr-cas").value||"").trim(),
    ingrediencie:ing, postup, tipy:(document.getElementById("nr-tip").value||"").trim(), foto };
  if(_nrFoto && !foto) toast("Recept uložím, ale na fotku už v pamäti prehliadača nie je miesto.");
  // úprava: ten istý objekt je v S.mojeRecepty aj v RECEPTY; cache podľa id (hľadanie, mäso, báza) by ostala stará
  if(stary){ Object.assign(stary,pol); _hayCache.delete(id); _memoMaso.delete(id); _memoBaza.delete(id);
    [_memoCerv,_memoCit,_memoDia,_memoRyba].forEach(m=>m.delete(id)); _memoPrilDruh.delete(id); _memoPrilDruh.delete(id+"|d"); }
  else { const r=Object.assign({id:"moj-"+(S.spSid++)},pol,{popis:"",tagy:["vlastný"],_moj:true},_nrZdroj||{}); S.mojeRecepty.push(r); RECEPTY.push(r); id=r.id; }
  zabudniVyzivu(); naplnKuchyne(); save(); zavriPick(); renderChips(); renderGrid(); otvor(id,stary?_poslednyCtx:undefined); }
// ── Import receptu (8. 10. 2026) ──────────────────────────────────────────────────────────
// Bez servera a bez knižnice: štruktúrovaný recept schema.org (JSON-LD, má ho väčšina receptových
// webov aj Varecha) alebo obyčajný skopírovaný text. Výsledok len PREDVYPLNÍ formulár — človek ho
// skontroluje a uloží ako vlastný recept (zdroj a odkaz sa zapíšu, detail ich ukáže).
let _nrZdroj=null;
const _IMP_JED=[[/^(g|gr|gramov|gramy|gram)$/,"g",1],[/^(dkg|dag|deka)$/,"g",10],[/^(kg|kil\w*|kíl\w*)$/,"g",1000],[/^(ml|mililitrov)$/,"ml",1],[/^(dl|deci)$/,"ml",100],[/^(l|liter|litre|litra|litrov)$/,"ml",1000],
  [/^(ks|kus|kusy|kusov|pc|pcs|piece|pieces)$/,"ks",1],[/^(pl|pol\.?\s*lyž\w*|lyžic\w*|lyžica|tbsp|tablespoons?)$/,"PL",1],[/^(čl|cl|kl|lyžičk\w*|lyžička|tsp|teaspoons?)$/,"ČL",1],
  [/^(strúčik\w*|strucik\w*|cloves?)$/,"strúčik",1],[/^(štipk\w*|stipk\w*|špetk\w*|spetk\w*|pinch)$/,"štipka",1],[/^(hrsť|hrste|hrstí|handful)$/,"hrsť",1],[/^(plát\w*|slices?)$/,"plátok",1],
  [/^(cups?|hrnč\w*|hrnček)$/,"ml",240],[/^(oz|ounces?)$/,"g",28],[/^(lbs?|pounds?)$/,"g",454]];
const _IMP_ZLOMKY={"½":0.5,"¼":0.25,"¾":0.75,"⅓":1/3,"⅔":2/3};
function _impCislo(t){ t=String(t).trim().replace(/[½¼¾⅓⅔]/g,z=>" "+_IMP_ZLOMKY[z]).trim();
  const z=t.match(/^(\d+)\s*\/\s*(\d+)$/); if(z) return +z[1]/+z[2];
  const p=t.split(/\s+/).map(x=>{ const y=x.match(/^(\d+)\/(\d+)$/); return y?+y[1]/+y[2]:parseFloat(x.replace(",",".")); });
  return p.every(isFinite)?p.reduce((a,b)=>a+b,0):NaN; }
function _impJednotka(u){ const x=(u||"").toLowerCase().replace(/\.$/,""); for(const [re,j,k] of _IMP_JED) if(re.test(x)) return {j,k}; return null; }
// „250 g hladkej múky", „2 PL oleja", „Múka hladká, 250 g", „1/2 cup sugar", „soľ podľa chuti"
// v34 (prieskum SK appiek): 9 z 20 bežných slovenských riadkov sa parsovalo zle — dkg, „pol cibule",
// „1 čajová lyžička", „1 sáčok prášku do pečiva" (→ pečivo), „1 konzerva paradajok (400 g)", genitív názvu.
const _IMP_SLOVA={pol:0.5,polovica:0.5,"štvrť":0.25,poldruha:1.5,jeden:1,jedna:1,jedno:1,dva:2,dve:2,tri:3,"štyri":4,"päť":5};
const _IMP_OBAL=/^(balen\w*|balíč\w*|plechov\w*|konzerv\w*|kock\w*|sáčo?k\w*|sáčk\w*|zväz\w*|vrecúš\w*|vreck\w*|tégl\w*|pohár\w*)\s+/i;
// Názov v 2. páde („hladkej múky", „masla") → tvar z databázy potravín, keď sa niektorý variant koncovky
// zhoduje s kľúčom potraviny (diakritika z kľúča). Inak ostane text, ako bol — spárovanie aj tak funguje.
const _NOM_KONC=[[/ec$/,"cia"],[/ec$/,"ce"],[/ého$/,"ý"],[/ej$/,"á"],[/([^aeiouyáéíóúý])([^aeiouyáéíóúý])u$/,"$1o$2"],[/kej$/,"ká"],[/ej$/,"á"],[/ých$/,"é"],[/ích$/,"ie"],[/^pŕs$/,"prsia"],[/ov$/,""],[/iek$/,"ka"],[/ok$/,"ka"],[/ia$/,"ie"],[/a$/,"o"],[/y$/,"a"],[/e$/,"a"],[/i$/,""],[/u$/,""],[/a$/,""],[/í$/,"ie"],[/e$/,"o"]];
let _impFq=null;
function _impTvarFq(){ if(_impFq) return _impFq; _impFq=new Map();
  RECEPTY.forEach(r=>(r.ingrediencie||[]).forEach(i=>bezDia(String(i.nazov||"").toLowerCase()).split(/[^a-z]+/).forEach(x=>{ if(x) _impFq.set(x,(_impFq.get(x)||0)+1); })));
  return _impFq; }
// `mnoz` = viac kusov (2 citróny) → tvar na -y/-e je množné číslo a ostane; pri gramoch (300 g klobásy) je to 2. pád.
function _impNominativ(n,mnoz){ const w=String(n).trim().split(/\s+/); if(!w[0]) return n;
  // „klobása" (1. pád) od „citróna" (2. pád) odlíši len jazyk — preto rozhodujú dáta: ktorý tvar je častejší ako názov
  // suroviny v receptoch (tie sú takmer vždy v 1. páde).
  const p0=najdiPotravinu(n), last=bezDia(w[w.length-1].toLowerCase()), kk=p0?bezDia(String(p0.kluc).split(" ").pop().toLowerCase()):"";
  // viacslovný kľúč („smotana na varenie"): aj PRVÉ slovo musí byť v tvare kľúča, inak je to 2. pád („smotany na varenie")
  const k1=p0?bezDia(String(p0.kluc).split(" ")[0].toLowerCase()):"", prve=bezDia(w[0].toLowerCase());
  const prveOk=!p0||String(p0.kluc).indexOf(" ")<0||w.length<2||prve===k1||(prve.startsWith(k1)&&!/(y|e|i)$/.test(prve.slice(k1.length)));
  if(kk&&prveOk&&last.startsWith(kk)&&["","a","y","ia","e","ie"].includes(last.slice(kk.length))&&!w.some(x=>/(ej|ého|ých|ích|ov)$/.test(x.toLowerCase()))){
    const fq=_impTvarFq(), f0=fq.get(last)||0;
    if(!_NOM_KONC.some(([re,z])=>{ if(!re.test(last)) return false; const v=last.replace(re,z); return (mnoz?v===kk:v.startsWith(kk))&&(fq.get(v)||0)>f0; })) return n[0].toUpperCase()+n.slice(1); }
  const varianty=x=>[x].concat(_NOM_KONC.filter(([re])=>re.test(x)).map(([re,z])=>x.replace(re,z)));
  const kombinacie=w.length===1?varianty(w[0]).map(v=>[v]):varianty(w[0]).flatMap(a=>varianty(w[w.length-1]).map(b=>[a].concat(w.slice(1,-1),[b])));
  for(const k of kombinacie){ const t=k.join(" "), p=najdiPotravinu(t); if(p && bezDia(p.kluc)===bezDia(t)) return p.kluc[0].toUpperCase()+p.kluc.slice(1); }
  // bez presnej zhody: prvý ZMENENÝ variant, ktorý sa spáruje („hladká múka", „paradajka"); pôvodný až nakoniec
  let naj=null, najSk=-1;
  kombinacie.slice(1).forEach(k=>{ const t=k.join(" "), p=najdiPotravinu(t); if(!p) return; const kw=bezDia(p.kluc).split(" ");
    if(k.some((x,i)=>{ const o=w[i===k.length-1?w.length-1:i]; return x!==o&&!kw.some(w=>bezDia(x).startsWith(w))&&!/(ého|ej|ých)$/.test(o); })) return; // prídavné meno v 2. páde sa mení vždy, podstatné len na slovo potraviny
    const sk=k.filter((x,i)=>x!==w[i===k.length-1?w.length-1:i]).length+(bezDia(k[k.length-1])===bezDia(p.kluc.split(" ").pop())?2:0);
    if(sk>najSk){ najSk=sk; naj=t; } });
  if(naj) return naj[0].toUpperCase()+naj.slice(1);
  return n[0].toUpperCase()+n.slice(1); }
function parseIngRiadok(s){ s=String(s||"").replace(/\s+/g," ").replace(/^[-•*·▢☐\s]+/,"").trim(); if(!s) return null;
  let poz="", gZatv=null;
  s=s.replace(/\((\d+(?:[.,]\d+)?)\s*(g|ml|kg|l)\)/i,(_,n,u)=>{ const x=parseFloat(n.replace(",",".")); gZatv={n:/k|^l$/i.test(u)?x*1000:x,u:/m?l$/i.test(u)?"ml":"g"}; return ""; }).replace(/\s+/g," ").trim();
  s=s.replace(/^(špetk\p{L}*|štipk\p{L}*)\s+/iu,"1 štipka "); // „špetka soli"
  // „šťava z 1 citróna", „kôra z pol pomaranča" → surovina s množstvom a poznámkou (kolo 4, QA)
  { const m=s.match(/^(šťav\p{L}*|kôr\p{L}*|kôrk\p{L}*)\s+(?:z|zo)\s+(\S+)\s+(.+)$/iu);
    if(m){ const w=m[2].toLowerCase(), n=_IMP_SLOVA[w]!=null?_IMP_SLOVA[w]:/^jedn/.test(w)?1:parseFloat(w.replace(",","."));
      if(n>0){ const r=_parseIngRiadok0(n+" "+m[3]); if(r){ r.nazov=_impNominativ(r.nazov); if(!r.jednotka) r.jednotka="ks"; r.poznamka=m[1].toLowerCase(); return r; } } } }
  s=s.replace(/(čajov\p{L}*|kávov\p{L}*)\s+lyžičk\p{L}*/giu,"ČL").replace(/(polievkov\p{L}*\s+lyžic\p{L}*|lyžic\p{L}*\s+polievkov\p{L}*)/giu,"PL");
  s=s.replace(/^(\d+(?:[.,]\d+)?)\s*(?:x|×)\s*(\d+(?:[.,]\d+)?)/i,(_,a,b)=>String(Math.round(parseFloat(a.replace(",","."))*parseFloat(b.replace(",","."))*100)/100)); // „2 x 400 g" → 800 g
  { const m=s.match(/^(\S+)\s/); const k=m&&m[1].toLowerCase(); if(k&&_IMP_SLOVA[k]!=null) s=_IMP_SLOVA[k]+" "+s.slice(m[0].length); }
  { const m=s.match(/^([\d.,½¼¾⅓⅔\/ ]+)\s*/); const rest=m?s.slice(m[0].length):s, o=rest.match(_IMP_OBAL);
    if(o){ const n=m?_impCislo(m[1].trim()):1; const naz=rest.slice(o[0].length);
      if(gZatv) return {nazov:_impNominativ(naz[0].toUpperCase()+naz.slice(1)),mnozstvo:Math.round((isFinite(n)&&n>0?n:1)*gZatv.n),jednotka:gZatv.u};
      return {nazov:_impNominativ(naz[0].toUpperCase()+naz.slice(1)),mnozstvo:isFinite(n)&&n>0?n:1,jednotka:"ks",poznamka:o[1].toLowerCase()}; } }
  { const c=s.match(/^(.*?\S)\s*,\s+([^\d].*)$/); if(c && /^\d|^[½¼¾]/.test(s)){ s=c[1]; poz=c[2]; } }
  const r0=_parseIngRiadok0(s); if(!r0) return null;
  if(gZatv && (r0.jednotka==="ks"||!r0.jednotka) && r0.mnozstvo!=null){ r0.mnozstvo=Math.round(r0.mnozstvo*gZatv.n); r0.jednotka=gZatv.u; }
  r0.nazov=_impNominativ(r0.nazov,(!r0.jednotka||r0.jednotka==="ks")&&r0.mnozstvo>=2); if(poz) r0.poznamka=poz; return r0; }
function _parseIngRiadok0(s){
  const C="(\\d+\\s*\\/\\s*\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[½¼¾⅓⅔]|\\s+\\d+\\/\\d+)?(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?|[½¼¾⅓⅔])";
  const vel=t=>{ const n=_impCislo(String(t).split(/[-–]/)[0]); return isFinite(n)&&n>0?n:null; };
  const ok=(nazov,n,u)=>{ const ju=_impJednotka(u); nazov=nazov.replace(/^(of|z|zo)\s+/i,"").replace(/[,;:]$/,"").trim();
    if(!nazov) return null; nazov=nazov[0].toUpperCase()+nazov.slice(1);
    if(n==null) return {nazov,mnozstvo:null,jednotka:""};
    return ju?{nazov,mnozstvo:Math.round(n*ju.k*100)/100,jednotka:ju.j}:{nazov:u?u+" "+nazov:nazov,mnozstvo:n,jednotka:u?"":"ks"}; };
  let m=s.match(new RegExp("^"+C+"\\s*([a-zA-ZčšžýáíéúôľňďťŕäóČŠŽÝÁÍÉÚÔĽŇĎŤŔÄÓ]+\\.?)?\\s+(.+)$"));
  if(m){ const ju=_impJednotka(m[2]); return ju?ok(m[3],vel(m[1]),m[2]):ok((m[2]?m[2]+" ":"")+m[3],vel(m[1]),""); }
  m=s.match(new RegExp("^(.+?)\\s*[,:\\-–]?\\s+"+C+"\\s*([a-zA-ZčšžýáíéúôľňďťŕäóČŠŽÝÁÍÉÚÔĽŇĎŤŔÄÓ]+\\.?)?$"));
  if(m && (_impJednotka(m[3])||!m[3])) return ok(m[1],vel(m[2]),m[3]||"");
  return ok(s.replace(/\s*[-–,]?\s*(podľa chuti|na dochutenie|to taste)$/i,""),null,""); }
function _impMinuty(iso){ const m=String(iso||"").match(/P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/i); if(!m) return 0; return (+m[1]||0)*60+(+m[2]||0); }
function _impCas(min){ return min>0?(min>=60?Math.floor(min/60)+" h"+(min%60?" "+(min%60)+" min":""):min+" min"):""; }
function _impKroky(x){ if(!x) return []; if(typeof x==="string") return _impTxt(x).split(/\n+|(?<=\.)\s+(?=\d+\.\s)/).map(t=>t.replace(/<[^>]+>/g,"").trim()).filter(Boolean);
  if(Array.isArray(x)) return x.flatMap(_impKroky);
  if(typeof x==="object") return x.itemListElement?_impKroky(x.itemListElement):_impKroky(x.text||x.name||""); return []; }
function _impNajdiRecept(o){ if(!o||typeof o!=="object") return null; if(Array.isArray(o)){ for(const x of o){ const r=_impNajdiRecept(x); if(r) return r; } return null; }
  const t=[].concat(o["@type"]||[]); if(t.some(x=>/recipe/i.test(x))) return o; return _impNajdiRecept(o["@graph"]||o.mainEntity||null); }
const _IMP_KAT=[[/ranajk|breakfast/,"Raňajky"],[/polievk|soup/,"Polievka"],[/salat|salad/,"Šalát"],[/dezert|dessert|kolac|cake|kolace|sladk/,"Dezert"],[/cestovin|pasta/,"Cestoviny"],
  [/natierk|spread|dip/,"Nátierka"],[/priloh|side/,"Príloha"],[/peciv|chlieb|bread/,"Pečivo"],[/napoj|drink|smoothie/,"Nápoj"],[/koktejl|kokteil|cocktail/,"Kokteil"]];
// Vráti {nazov,kategoria,kuchyna,porcie,cas,ingrediencie,postup,zdroj?,zdroj_url?} alebo null.
function _impTxt(s){ const ent=x=>x.replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&quot;/g,'"').replace(/&(#39|apos);/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&#(\d+);/g,(_,d)=>String.fromCharCode(+d)).replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))
    .replace(/&[a-z]+;/gi,m=>{ try{ const t=document.createElement("textarea"); t.innerHTML=m; return t.value||m; }catch(e){ return m; } });
  return ent(String(s==null?"":s)).replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi,"\n").replace(/<[^>]+>/g,"").replace(/[ \t]+/g," ").trim(); }
function parseReceptImport(text,url){ text=String(text||"").trim(); if(!text) return null;
  const lds=[]; text.replace(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,(_,j)=>{ lds.push(j); return ""; });
  if(/^[\[{]/.test(text)) lds.push(text);
  for(const j of lds){ let o; try{ o=JSON.parse(j.trim()); }catch(e){ continue; } const r=_impNajdiRecept(o); if(!r) continue;
    const y=String([].concat(r.recipeYield||"")[0]||"").match(/\d+/);
    const kat=bezDia([].concat(r.recipeCategory||"").join(" ")+" "+(r.name||"")), kk=_IMP_KAT.find(([re])=>re.test(kat));
    const autor=[].concat(r.author||r.publisher||[])[0];
    const u=typeof r.url==="string"&&/^https?:\/\//.test(r.url)?r.url:(url||"");
    return {nazov:_impTxt(r.name), kategoria:kk?kk[1]:"Hlavné jedlo", kuchyna:_impTxt([].concat(r.recipeCuisine||"")[0]||""),
      porcie:y?Math.min(99,Math.max(1,+y[0])):2, cas:_impCas(_impMinuty(r.totalTime)||(_impMinuty(r.prepTime)+_impMinuty(r.cookTime))),
      ingrediencie:[].concat(r.recipeIngredient||r.ingredients||[]).map(x=>parseIngRiadok(_impTxt(x).replace(/["„“”]/g,""))).filter(Boolean),
      postup:_impKroky(r.recipeInstructions),
      zdroj:[u?u.replace(/^https?:\/\/(www\.)?/,"").split("/")[0]:"",autor&&autor.name?_impTxt(autor.name):""].filter(Boolean).join(" — "), zdroj_url:u}; }
  // obyčajný text (aj HTML bez JSON-LD: značky preč)
  if(/<(html|body|div|p)\b/i.test(text)) text=text.replace(/<(script|style)[\s\S]*?<\/\1>/gi,"").replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&");
  const riadky=text.split(/\n/).map(x=>x.trim()).filter(Boolean); if(!riadky.length) return null;
  const HS=/^(suroviny|ingrediencie|ingredients|potrebujeme|budete potrebovat)\b/i, HP=/^(postup|priprava|príprava|instructions|method|directions|navod|návod)\b/i;
  const SUM=/(^|\s)(domov|recepty|zdielat|facebook|pinterest|twitter|instagram|komentar\w*|prihlas\w*|odhlas\w*|registr\w*|tlacit|hodnoten\w*|cookies|reklam\w*|odporucane|suvisiace|newsletter|uloz\w* recept|pacil\w*|ohodnot\w*|zdielaj\w*)(\s|$|:|\(|\?|!)|>|›|»/;
  const cist=riadky.filter(l=>!SUM.test(bezDia(l))||/^(postup|suroviny)/i.test(bezDia(l)));
  let rezim="", nazov=(cist.find(l=>l.length>3&&l.length<90&&!/^\d/.test(l))||riadky[0]), porcie=0, cas=""; const ing=[], postup=[];
  cist.filter(l=>l!==nazov).forEach(l0=>{ let l=l0; const b=bezDia(l);
    const pm0=b.match(/(?:^|\s)(?:pocet )?(?:porci\w*|osob\w*)\s*[:\-]\s*(\d+)/); if(pm0) porcie=+pm0[1];
    if(pm0&&/^(pocet )?(porci|osob)/.test(b)) return;
    const cm=b.match(/^(cas( pripravy| varenia)?|priprava)\s*[:\-]\s*(.+)$/); if(cm){ const m=_impMinuty("PT"+(b.match(/(\d+)\s*h/)?b.match(/(\d+)\s*h/)[1]+"H":"")+(b.match(/(\d+)\s*min/)?b.match(/(\d+)\s*min/)[1]+"M":"")); if(m) cas=_impCas(m); return; }
    const pp=l.match(/^(postup|príprava|priprava|návod|navod)\s*:\s*(.+)$/i); if(pp){ rezim="p"; pp[2].split(/(?<=[.!?])\s+(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/).forEach(x=>x.trim()&&postup.push(x.trim())); return; }
    const ps=l.match(/^(suroviny|ingrediencie|ingredients)\s*:\s*(.+)$/i); if(ps){ rezim="i"; ps[2].split(/[,;]\s*/).forEach(x=>{ const p=parseIngRiadok(x); if(p) ing.push(p); }); return; }
    if(HS.test(b)){ rezim="i"; return; } if(HP.test(b)){ rezim="p"; return; }
    if(pm0) return;
    const pm=b.match(/(\d+)\s*(porci|osob|servings|serves)/); if(pm && l.length<40){ porcie=+pm[1]; return; }
    const kr=l.replace(/^(\d+[\.\)]|krok\s*\d+[:.]?)\s*/i,"");
    if(rezim==="p"){ postup.push(kr); return; }
    const p=parseIngRiadok(l);
    if(rezim==="i" || (p && p.mnozstvo!=null && l.length<70 && !/\.\s*$/.test(l))) ing.push(p); else if(l.length>=25) postup.push(kr); });
  if(!ing.length && !postup.length) return null;
  const kk=_IMP_KAT.find(([re])=>re.test(bezDia(nazov))), kat=kk?kk[1]:"Hlavné jedlo";
  const odhad=!(porcie>0); if(odhad) porcie=/Dezert|Pečivo/.test(kat)?8:2;
  return {nazov, kategoria:kat, kuchyna:"", porcie:Math.min(99,Math.max(1,porcie)), porcieOdhad:odhad, cas, ingrediencie:ing.filter(Boolean), postup, zdroj:url?url.replace(/^https?:\/\/(www\.)?/,"").split("/")[0]:"", zdroj_url:url||""}; }
async function importujRecept(){ const el=document.getElementById("nr-imp"); const v=(el&&el.value||"").trim(); if(!v){ toast("Najprv vlož odkaz alebo text receptu."); return; }
  let text=v, url="";
  if(/^https?:\/\/\S+$/i.test(v)){ url=v;
    try{ const odp=await fetch(v,{mode:"cors"}); if(!odp.ok) throw new Error(odp.status); text=await odp.text(); }
    catch(e){ toast("Táto stránka nedovolí načítanie z prehliadača. Otvor ju, označ text receptu, skopíruj ho a vlož sem."); return; } }
  const r=parseReceptImport(text,url);
  if(!r||(!r.ingrediencie.length&&!r.postup.length)){ toast("Recept sa v tom nepodarilo nájsť. Skús vložiť text so surovinami a postupom."); return; }
  const set=(id,x)=>{ const e=document.getElementById(id); if(e&&x!=null&&x!=="") e.value=x; };
  set("nr-nazov",r.nazov); set("nr-kuch",r.kuchyna); set("nr-porcie",r.porcie); set("nr-cas",r.cas); set("nr-postup",r.postup.join("\n"));
  const ks=document.getElementById("nr-kat"); if(ks) ks.value=r.kategoria;
  const box=document.getElementById("nr-ing"); if(box){ box.innerHTML=""; r.ingrediencie.forEach(i=>pridajIngRiadok(i)); pridajIngRiadok(); }
  _nrZdroj=r.zdroj_url?{zdroj:r.zdroj||r.zdroj_url, zdroj_url:r.zdroj_url}:(r.zdroj?{zdroj:r.zdroj}:null);
  const d=document.getElementById("nr-imp-box"); if(d) d.open=false;
  const nezn=r.ingrediencie.filter(i=>!najdiPotravinu(i.nazov)).length;
  if(r.porcieOdhad){ const pe=document.getElementById("nr-porcie"); if(pe){ pe.classList.add("pole-pozor"); pe.addEventListener("input",()=>pe.classList.remove("pole-pozor"),{once:true}); } }
  toast("Načítané: "+sklon(r.ingrediencie.length,"surovina","suroviny","surovín")+", "+sklon(r.postup.length,"krok","kroky","krokov")+". Skontroluj a ulož."+(r.porcieOdhad?" Počet porcií recept neuvádza — odhadol som "+r.porcie+", over ho.":"")+(nezn?" "+sklon(nezn,"surovinu","suroviny","surovín")+" appka nepozná — výživa bude odhad.":"")); }
async function zmazMojRecept(id){ if(!await confirmModal("Zmazať tento vlastný recept?","🗑 Zmazať"))return;
  S.mojeRecepty=S.mojeRecepty.filter(r=>r.id!==id); const i=RECEPTY.findIndex(r=>r.id===id); if(i>=0)RECEPTY.splice(i,1);
  delete S.fav[id]; delete S.hodn[id]; zabudniVyzivu(); save(); zavri(); renderChips(); renderGrid(); }

let aktualny=null, aktPorcie=1, aktVelkost=1, jednotkaMode="metric", aktPrilohy=[];
// Prílohy (`prf:*`) v tom istom slote. Nemajú vlastnú kartu, takže ich gramáž aj postup
// patria do detailu hlavného jedla — inak sa „+ Ryža (príloha)" nedá nikde rozkliknúť.
// Porcie si príloha NEDRŽÍ vlastné — škáluje sa spolu s hlavným jedlom cez `aktPorcie`,
// inak po prepnutí porcií 2→4 narastie len hlavný recept a ryža ostane na dvoch.
// Recept z kategórie Príloha (generátor ho strieda s `prf:`) sa pripojí tiež — má síce vlastnú kartu,
// ale bez neho by bunka plánu rátala kcal s prílohou a detail bez nej. Druhý výrobok snackovej
// dvojice je kategória Snack, takže sem nepatrí.
function _prilohySlotu(id,ctx){ if(!(ctx&&ctx.di!=null))return [];
  return slotIds(ctx.di,ctx.slot).filter(c=>c!==id).map(c=>komponent(c))
    .filter(k=>k&&(k._priloha||(k.kategoria==="Príloha"&&!k._left))); }
let _poslednyCtx=null; // D8: kontext plánu (deň/slot/porcie), z ktorého bol detail otvorený
function otvor(id, ctx){
  const r=receptById(id); if(!r)return; aktualny=r; jednotkaMode="metric";
  _poslednyCtx=(ctx&&ctx.di!=null)?ctx:null;
  // Porcie (koľko štandardných porcií) a veľkosť porcie (%, kvôli dennému kalorickému cieľu) sú dve NEZÁVISLÉ veci —
  // predtým sa zaokrúhľovali dokopy na celé číslo, čím sa pri malom počte porcií % veľkosti niekedy stratilo úplne (zaokrúhlilo naspäť na 100 %).
  if(ctx&&ctx.di!==undefined){ aktVelkost=pf(ctx.di,ctx.slot); const vb=varenieBloku(denyBloku(ctx.di)).find(x=>x.cid===id);
    aktPorcie=vb&&vb.sloty.length>1?Math.round(vb.por/(aktVelkost||1)*100)/100:porcieSlotBlok(ctx.di,ctx.slot,id); }
  else { aktPorcie=r.porcie||1; aktVelkost=1; }
  aktPrilohy=_prilohySlotu(id,_poslednyCtx);
  const al=alergenyReceptu(r);
  // Zdroj miniatúry je 320×180; v detaile ju preto nenaťahujeme cez celú šírku (max 480 px),
  // inak by bola na počítači rozmazaná. Fotka sa ukazuje CELÁ (bez orezu, fotky z kníh nie sú 16:9)
  // a bez popisu zdroja — výslovná voľba používateľa (6. 10. 2026).
  const _fs=fotoSrc(r);
  const foto=_fs?`<figure class="detail-foto${jePix(r)?" pix":""}"><img src="${_fs}" alt="${escHtml(r.nazov)}" decoding="async" onerror="var f=this.parentNode;if(f&&f.parentNode)f.parentNode.removeChild(f)"></figure>`:"";
  // v31: pod popisom ostávajú LEN alergény (výslovná voľba používateľa). Bielkoviny/100 kcal,
  // podiel dňa, sezóna, akcia, diéty a „priprav vopred" boli šum — diéty a sezóna sú na karte
  // v mriežke, výživa v dlaždiciach `#nutri` nižšie.
  // Červená (--signal) a ⚠ len pri ZRÁŽKE s profilom domácnosti — mlieko pri každom druhom
  // recepte svietilo ako výstraha aj tým, ktorí laktózu neriešia. Zrážka nesie aj TEXT (1.4.1).
  const zt=zakazaneTokens();
  const zrazka=a=>(a==="lepok"&&S.profil.lepok)?"máš bez lepku":(a==="mlieko"&&S.profil.mlieko)?"máš bez laktózy"
    :(a==="ryby"&&S.profil.ryby)?"máš bez rýb":(zt.length&&(zt.some(t=>bezDia(a).includes(t))||obsahujeSurovinu(a,zt)))?"máš zakázané":"";
  const badges=al.map(a=>{ const z=zrazka(a); return z?`<span class="badge alerg zrazka">⚠ ${a} — ${z}</span>`:`<span class="badge alerg">${a}</span>`; }).join('');
  const hod=S.hodn[r.id]||0;
  const stars=starsHTML(hod,true);
  const uv=S.uvarene.filter(u=>u.id===r.id); const dparts=[];
  if(uv.length)dparts.push(`✅ uvarené ${uv.length}× (naposledy ${uv[0].datum})`);
  const detailMeta=dparts.length?`<div class="info detail-meta">${dparts.join(" · ")}</div>`:"";
  document.getElementById("modal").innerHTML=`
    <div class="hero"><button class="close" onclick="zavri()">✕</button>
      <h2>${maFoto(r)?"":(ikony[r.kategoria]||"🍴")+" "}${escHtml(r.nazov)}</h2>
      <div class="subx">${escHtml([r.kategoria,r.kuchyna,casText(r.cas)].filter(Boolean).join(" · "))}</div></div>
    <div class="content2">${foto}
      ${r.popis?`<p class="popis">${escHtml(r.popis)}</p>`:""}
      ${badges?`<div class="row-badges"><span class="info">Alergény:</span>${badges}</div>`:""}<p class="info" style="margin:2px 0 8px">${badges?"Alergény odhaduje appka zo surovín.":"Appka v surovinách nenašla bežný alergén."} Pri alergii si over etiketu výrobku.</p>
      <div class="porcie-box"><label>Porcie:</label>
        <div class="stepper"><button onclick="zmenPorcie(-1)" aria-label="Menej porcií">−</button><input id="pnum" type="number" aria-label="Počet porcií" min="1" max="99" value="${aktPorcie}" onchange="nastavPorcie(this.value)" onfocus="this.select()" title="Zadaj počet porcií" style="width:52px;text-align:center;border:1px solid var(--line);border-radius:8px;padding:5px;font-weight:600;font-size:16px"><button onclick="zmenPorcie(1)" aria-label="Viac porcií">+</button></div>
        <select class="mini" id="unit-mode" aria-label="Jednotky surovín" onchange="setUnitMode(this.value)"><option value="metric">g / ml</option><option value="spoon">lyžice</option><option value="imperial">oz / cup</option></select></div>
      ${Math.abs(aktVelkost-1)>=0.05?`<p class="info" style="margin-top:-6px">⚖️ Porcia je v tomto pláne <b>${aktVelkost>=1.3?"oveľa väčšia":aktVelkost>1?"o niečo väčšia":aktVelkost<=0.8?"oveľa menšia":"o niečo menšia"}</b> než v recepte (kvôli dennému cieľu) — suroviny a kalórie nižšie to už rátajú.</p>`:""}
      <div class="nutri" id="nutri"></div><p class="info" id="detail-sol" style="margin:4px 0 0"></p>${zadusenieText([r])?'<p class="info" style="margin:4px 0 0">'+zadusenieText([r])+'</p>':""}${S.profil.diabetes?(()=>{ const vv=vyzivaReceptu(r), sp=aktPrilohy.reduce((a,p)=>a+(vyzivaReceptu(p).s||0),0), g=Math.round(((vv.s||0)+sp)*aktVelkost);
        return `<p class="info" id="detail-dia" style="margin:4px 0 0">🩺 Sacharidy ≈ <b>${g} g</b> na porciu${aktPrilohy.length?" aj s prílohou":""} (≈ ${fmt(Math.round(g/10*2)/2)} SJ)${nevhodneDiabetu(r)?' — <span style="color:var(--signal)">pri diabete nevhodné ('+escHtml(dovodDiabetu(r))+')</span>':""}.</p>`; })():""}
      <div id="nutri-spolu" class="info" style="margin:-2px 0 6px"></div><p class="info" id="na-tanier" style="margin:0 0 6px"></p>
      ${detailMeta}
      <h3 class="sekcia">Ingrediencie</h3><table class="ing"><tbody id="ing-body"></tbody></table>${vegNahradaText(r)?`<p class="info veg-nahrada">${escHtml(vegNahradaText(r))}. Nákup s tým už počíta.</p>`:""}
      <div id="subst-box"></div>
      <h3 class="sekcia">Postup</h3><ol class="postup" id="postup-ol"></ol>
      ${r.tipy?`<div class="tipy">💡 <b>Tip:</b> ${escHtml(r.tipy)}</div>`:""}
      ${r.zdroj===ZDROJ_NAVRH?`<div class="zdroj">Recept appky — zatiaľ ho nikto neohodnotil. Keď ho uvaríš, daj mu hviezdičky.</div>`:r.zdroj?`<div class="zdroj">Zdroj: ${r.zdroj_url?`<a href="${escHtml(r.zdroj_url)}" target="_blank" rel="noopener noreferrer">${escHtml(r.zdroj)}</a>`:escHtml(r.zdroj)}</div>`:""}
      <div class="hodnotenie"><span id="hodn-lbl">Hodnotenie:</span><div class="starpick" role="slider" tabindex="0" aria-labelledby="hodn-lbl" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${hod}" aria-valuetext="${hodnotText(hod)}" onclick="hodnotKlik(event,'${r.id}')" onkeydown="hodnotKlaves(event,'${r.id}')">${stars}</div>
        <button class="mini hodn-zrus" onclick="hodnot('${r.id}',0)"${hod?"":" hidden"}>zrušiť</button></div>
      <textarea class="pozn" id="poznamka" placeholder="Moja poznámka k receptu…" oninput="ulozPozn('${r.id}')">${escHtml(S.pozn[r.id]||"")}</textarea>
      <div class="btn-row akcie-lepiva">
        ${_poslednyCtx
          ? `<button class="btn primary" onclick="spustiCook()">👨‍🍳 Variť</button>`
          : `<button class="btn primary" onclick="pridajDoPlanu('${r.id}')">📅 Do plánu</button>`}
        <div class="menu-wrap"><button class="btn" onclick="toggleMenu('m-det')">⋯ Viac</button>
          <div class="menu" id="m-det">
            ${_poslednyCtx
              ? `<a onclick="zavriMenu();pridajDoPlanu('${r.id}')">📅 Do plánu</a>`
              : `<a onclick="zavriMenu();spustiCook()">👨‍🍳 Variť</a>`}
            ${_poslednyCtx&&_poslednyCtx.di!=null?`<a onclick="zavriMenu();rozdelHrniec()">⚖️ Rozdeliť hotový hrniec podľa váhy</a>`:""}
            <a onclick="toggleSkryt('${r.id}');zavriMenu()">${S.skryte[r.id]?"👁 Znova zobrazovať":"🚫 Už nezobrazovať"}</a>
            <a onclick="zavriMenu();tlacRecept()">🖨 Tlačiť recept</a>
            ${r._moj?`<a onclick="zavriMenu();zavri();novyRecept('${r.id}')">✏️ Upraviť</a>`:""}
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
function _ingRiadok(i,fPocet){
  let mn="";
  if(i.mnozstvo!=null){ mn=prevodJednotka(skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,aktVelkost), i.jednotka||""); }
  else if(i.poznamka){ mn=i.poznamka; }
  const pozn=(i.mnozstvo!=null&&i.poznamka)?` <span class="pozn">(${escHtml(i.poznamka)})</span>`:"";
  // B7: bez tejto vety by kalórie porcie nesedeli s hrubým súčtom surovín a vyzeralo by to ako chyba
  const vs=vsiaknuteho(i);
  const vsPozn=(i.mnozstvo!=null&&vs<1)?` <span class="pozn">· do jedla ide ~${Math.round(vs*100)} %, zvyšok sa zleje</span>`:"";
  return `<tr><td>${escHtml(i.nazov)}${pozn}${vsPozn}</td><td class="mn">${escHtml(mn)}</td></tr>`;
}
function renderIng(){
  const r=aktualny; const fPocet=r.porcie?(aktPorcie/r.porcie):1; let rows="";
  ingrediencieNaNakup(r).forEach(i=>{ rows+=_ingRiadok(i,fPocet); }); // kolo 4 (kuchár): pri vegetariánovi mäso × podiel + tofu/cícer, ako nákup
  aktPrilohy.forEach(p=>{ const fp=aktPorcie/(p.porcie||1); const vk=vyzivaReceptu(p);
    rows+=`<tr class="ing-prf"><th colspan="2" scope="colgroup">+ ${escHtml(p.nazov)}${vk.kcal>5?` <span class="pozn">· ${Math.round(vk.kcal*aktPorcie*aktVelkost)} kcal spolu</span>`:""}</th></tr>`;
    (p.ingrediencie||[]).forEach(i=>{ rows+=_ingRiadok(i,fp); }); });
  document.getElementById("ing-body").innerHTML=rows;
  const v=vyzivaReceptu(r); const box=document.getElementById("nutri");
  if(v.kcal>5){ box.style.display="grid";
    { const nt=document.getElementById("na-tanier"), l=stravniciList(), hl=+(l[0]&&l[0].kcal)||S.profil.kcal||CIEL_DEF;
      const f=(_poslednyCtx&&_poslednyCtx.di!=null)?pf(_poslednyCtx.di,_poslednyCtx.slot):1;
      const c=_poslednyCtx||{}, preč=c.di!=null&&c.slot?l.filter(p=>!jeDomaVSlote(p,c.di,c.slot)):[], dl=l.filter(p=>!preč.includes(p));
      if(nt) nt.textContent=l.length>1?"🍽 Na tanier"+(aktPrilohy.length?" (bez prílohy)":"")+": "+dl.map(p=>{ const x=(+p.kcal||hl)/hl*f; const xr=Math.round(x*20)/20; return (p.nazov||"?")+" "+fmt(xr)+(xr===1?" porcia":" porcie")+" (≈ "+Math.round(v.kcal*x)+" kcal)"; }).join(" · ")
        +(preč.length?" · "+preč.map(p=>p.nazov||"?").join(", ")+" je mimo domu":""):""; }
    const solG=Math.round((v.na||0)*2.5/100)/10, solEl=document.getElementById("detail-sol");
    if(solEl) solEl.textContent=solG>0?`🧂 Soľ ≈ ${fmt(solG)} g na porciu${solG>2?" — viac ako 40 % denného limitu (5 g)":""}${r.ingrediencie&&r.ingrediencie.some(i=>/^so[lľ]/i.test(i.nazov)&&i.mnozstvo==null)?" + soľ podľa chuti":""}`:"";
    // B8: keď sa dopočet a deklarácia rozchádzajú viac než 2×, makrá sú odhad — povedz to naplno,
    // nie len značkou „≈". Používateľ podľa týchto čísel je.
    const sp=v.sporne?`<div style="grid-column:1/-1" class="info">≈ Makrá sú len odhad: suroviny vychádzajú na ${Math.round(v.q*Math.round(v.kcal))} kcal, recept hlási ${Math.round(v.kcal)} kcal na porciu. Skontroluj počet porcií alebo chýbajúce suroviny.</div>`:"";
    // G: makrá boli na dve desatinné miesta („15,84 g"), hoci kcal vedľa nich poctivo priznáva
    // „≈ (odhad)" a pochádzajú z tých istých dát. fmtG zaokrúhľuje na celé gramy — presnosť,
    // ktorú dáta unesú (princíp 7: číslo bez krytia je horšie než chýbajúce).
    box.innerHTML=`<div><b>${v.pribl?"≈ ":""}${Math.round(v.kcal)}</b><small>kcal/porcia${Math.abs((aktVelkost||1)-1)>=0.05?" receptu":""}${v.pribl?" (odhad)":""}</small></div>
      <div><b>${fmtG(v.b)} g</b><small>bielkoviny${v.sporne?" (odhad)":""}</small></div>
      <div><b>${fmtG(v.t)} g</b><small>tuky</small></div>
      <div><b>${fmtG(v.s)} g</b><small>sacharidy</small></div>${sp}`;
  } else box.style.display="none";
  // Bunka plánu sčíta kcal za CELÝ slot (hlavné jedlo + príloha), dlaždice vyššie sú len za recept.
  // Bez tohto riadku svieti v pláne 618 kcal a v detaile 420 — dve čísla za to isté jedlo.
  // `porcie` prílohy je 1 (komponent()), takže vyzivaReceptu(p) je rovno „na jednu porciu" ako kcalPorcia.
  const vp=aktPrilohy.reduce((a,p)=>{ const k=vyzivaReceptu(p);
    return {kcal:a.kcal+k.kcal,b:a.b+k.b,t:a.t+k.t,s:a.s+k.s}; },{kcal:0,b:0,t:0,s:0});
  const sp=document.getElementById("nutri-spolu");
  if(sp){ if(v.kcal>5 && (aktPrilohy.length||aktPorcie>1||aktVelkost!==1)){ sp.style.display="block";
      const nasobok=aktPorcie*aktVelkost; let sh="";
      if(aktPrilohy.length){ const av=aktVelkost||1; sh+=`S prílohou (${escHtml(aktPrilohy.map(p=>p.nazov.replace(/\s*\(príloha\)$/,"")).join(", "))})${Math.abs(av-1)>=0.05?", tvoja porcia":""}: <b>${Math.round((v.kcal+vp.kcal)*av)} kcal/porcia</b> · bielkoviny ${fmtG((v.b+vp.b)*av)} g · tuky ${fmtG((v.t+vp.t)*av)} g · sacharidy ${fmtG((v.s+vp.s)*av)} g<br>`; }
      if(aktPorcie>1||aktVelkost!==1) sh+=`Spolu za <b>${sklon(aktPorcie,"porciu","porcie","porcií")}${aktVelkost>1.145?" (väčšie porcie)":aktVelkost<0.855?" (menšie porcie)":""}</b>: ${Math.round((v.kcal+vp.kcal)*nasobok)} kcal · bielkoviny ${fmtG((v.b+vp.b)*nasobok)} g · tuky ${fmtG((v.t+vp.t)*nasobok)} g · sacharidy ${fmtG((v.s+vp.s)*nasobok)} g`;
      sp.innerHTML=sh;
    } else sp.style.display="none"; }
  const um=document.getElementById("unit-mode"); if(um)um.value=jednotkaMode;
  renderPostup(fPocet,aktVelkost);
}
// Surovina sedí aj v inom páde („cibuľu", „vývarom") — tvarom slova ako hľadanie. Do 8. 10. len podreťazec,
// takže množstvo sa ukázalo pri 42 % zmienok. Pri prídavnom mene vpredu („Hladká múka") rozhoduje podstatné meno.
function _krokSlovo(nazov){ const w=String(nazov).trim().split(/\s+/), p=w[0]||""; return _slova(/([áéýí]|ie)$/i.test(p)&&w.length>1?w[w.length-1]:p)[0]||""; }
function krokHint(text,fPocet,fVelkost,zdroj){ const h=bezDia(text), sl=_slova(text); const found=[];
  ingrediencieNaNakup(zdroj||aktualny).forEach(i=>{ if(i.mnozstvo==null)return; const nm=bezDia(i.nazov); const prve=nm.split(" ")[0], ks=_krokSlovo(i.nazov);
    const cele=w=>new RegExp("(^|[^a-z0-9])"+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+(w.length<=4?"([^a-z0-9]|$)":"")).test(h);
    if(nm.length>2 && (cele(nm)||(prve.length>3&&cele(prve))||(ks.length>3&&_tvarVSlovach(sl,ks)))) found.push(escHtml(i.nazov+" "+prevodJednotka(skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost),i.jednotka||""))); });
  return found.length? ` <span class="krok-mn">▸ ${found.join(" · ")}</span>`:""; }
function renderPostup(fPocet,fVelkost){ const ol=document.getElementById("postup-ol"); if(!ol)return;
  let h=(aktualny.postup||[]).map(k=>`<li>${escHtml(k)}${krokHint(k,fPocet,fVelkost)}</li>`).join("");
  aktPrilohy.forEach(p=>{ const fp=aktPorcie/(p.porcie||1);
    h+=(p.postup||[]).map((k,ix)=>`<li${ix===0?' class="krok-prf"':''}>${ix===0?`<b>${escHtml(p.nazov)}:</b> `:""}${escHtml(k)}${krokHint(k,fp,fVelkost,p)}</li>`).join(""); });
  ol.innerHTML=h; }
// Varenie musí ukázať to isté, čo detail — inak si používateľ prečíta postup prílohy a v kuchyni zmizne.
function _prilohaKroky(){ return aktPrilohy.reduce((a,p)=>a.concat((p.postup||[]).map((k,ix)=>ix===0?p.nazov+": "+k:k)),[]); }
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
// Kolo 4 (používateľ, Nákup): „6 hrsť", „15 plátok" — podstatné meno jednotky sa skloňuje podľa čísla.
const JED_SKLON={"hrsť":["hrsť","hrste","hrstí","hrste"],"plátok":["plátok","plátky","plátkov","plátku"],"strúčik":["strúčik","strúčiky","strúčikov","strúčika"],
  "štipka":["štipka","štipky","štipiek","štipky"],"rožok":["rožok","rožky","rožkov","rožka"],"žemľa":["žemľa","žemle","žemlí","žemle"],"bageta":["bageta","bagety","bagiet","bagety"],
  "list":["list","listy","listov","listu"],"vetvička":["vetvička","vetvičky","vetvičiek","vetvičky"],"konzerva":["konzerva","konzervy","konzerv","konzervy"],
  "plechovka":["plechovka","plechovky","plechoviek","plechovky"],"balenie":["balenie","balenia","balení","balenia"],"kocka":["kocka","kocky","kociek","kocky"],
  "šálka":["šálka","šálky","šálok","šálky"],"hrnček":["hrnček","hrnčeky","hrnčekov","hrnčeka"],"kus":["kus","kusy","kusov","kusa"],"zväzok":["zväzok","zväzky","zväzkov","zväzku"],
  "stonka":["stonka","stonky","stoniek","stonky"],"tortilla":["tortilla","tortilly","tortíl","tortilly"],"kelímok":["kelímok","kelímky","kelímkov","kelímka"],"hlávka":["hlávka","hlávky","hlávok","hlávky"],"lístok":["lístok","lístky","lístkov","lístka"],
  "pohár":["pohár","poháre","pohárov","pohára"],"vrecko":["vrecko","vrecká","vreciek","vrecka"],"vrecúško":["vrecúško","vrecúška","vrecúšok","vrecúška"]};
function jednotkaSklon(n,jed){ const t=JED_SKLON[String(jed||"").toLowerCase()]; if(!t) return jed;
  return n===1?t[0]:!Number.isInteger(n)?t[3]:(n>=2&&n<=4)?t[1]:t[2]; } // 1,5 strúčika · 2 strúčiky · 5 strúčikov
// v34: aj kusy sa škálujú veľkosťou porcie. Do v33 sa kus (vajce, prsia, rožok) škáloval len počtom porcií —
// pri faktore jedla 1,25–1,5 sa navarilo o 11–25 % menej, než plán hlásil (audit kuchára). Na celé kusy sa
// zaokrúhľuje až pri zobrazení (prevodJednotka) a v nákupe až na súčte, nie tu.
function skalovanaHodnota(mnozstvo,jednotka,fPocet,fVelkost){ return mnozstvo*fPocet*(fVelkost||1); }
// Kuchynské miery (PL, ČL, strúčik, hrsť…) sa merajú na polovice: „2,59 PL" nikto neodmeria.
// Pod 1 na štvrtiny — ¼ ČL je bežná miera a zaokrúhlenie na pol by ju zdvojnásobilo. Len zobrazenie.
function naPol(x){ const k=x<1?4:2; return Math.max(x>0?1/k:0,Math.round(x*k)/k); }
const METRICKE_JEDNOTKY=["g","gram","ml","l","dl","kg"];
function prevodJednotka(val, jed){
  const j=(jed||"").toLowerCase();
  if(NEDELITELNE_JEDNOTKY.includes(j)){ const n=Math.max(val>0?1:0,Math.round(val)); return n+" "+jednotkaSklon(n,jed); }
  // g/ml od 10 vyššie na celé: „603,75 g" predstiera presnosť, ktorú žiadna kuchynská váha nemá.
  // Pod 10 (droždie, soľ, korenie) desatina ešte niečo znamená, tam ostáva fmt.
  const cislo=((j==="g"||j==="gram"||j==="ml") && val>=10)?fmtG(val):METRICKE_JEDNOTKY.includes(j)?fmt(val):fmt(naPol(val));
  if(jednotkaMode==="spoon"){
    if(j==="ml"){ return val>=15 ? fmt(naPol(val/15))+" PL" : fmt(naPol(val/5))+" ČL"; }
    return cislo+(jed?(" "+jed):"");
  }
  if(jednotkaMode==="imperial"){
    if(j==="g"||j==="gram"){ return val>=454 ? fmt(val/453.6)+" lb" : fmt(val/28.35)+" oz"; }
    if(j==="ml"){ return val>=240 ? fmt(val/240)+" cup" : fmt(val/29.57)+" fl oz"; }
    return cislo+(jed?(" "+jed):"");
  }
  return cislo+(jed?(" "+jednotkaSklon(parseFloat(String(cislo).replace(",",".")),jed)):"");
}
// Hodnotenie sa mení NA MIESTE. Do v32 hodnot() prekreslil celý detail (otvor): detail skočil na
// vrch, zmenené porcie sa vrátili a jednotky prepli na g/ml. Karty v mriežke sa len doplnia.
function hodnotText(h){ return h?String(h).replace(".",",")+" z 5 hviezd":"bez hodnotenia"; }
function hodnot(id,n){ n=Math.max(0,Math.min(5,Math.round((+n||0)*2)/2)); if(n)S.hodn[id]=n; else delete S.hodn[id]; save();
  const sp=document.querySelector("#modal .starpick");
  { const zr=document.querySelector("#modal .hodn-zrus"); if(zr && aktualny && aktualny.id===id) zr.hidden=!n; }
  if(sp && aktualny && aktualny.id===id){ sp.innerHTML=starsHTML(n,true); tik(); animuj(sp.querySelector('.star-cil[data-i="'+Math.ceil(n)+'"]'),"puk"); sp.setAttribute("aria-valuenow",n); sp.setAttribute("aria-valuetext",hodnotText(n)); }
  document.querySelectorAll('.card-open[onclick="otvor(\''+id+'\')"] .stars').forEach(el=>{ el.innerHTML=n?starsHTML(n):""; }); }
// Dotyk: ťuk na hviezdu = celá, druhý ťuk na tú istú = pol (polovica podľa clientX mala cieľ 10 px).
function hodnotKlik(e,id){ const s=e.target.closest&&e.target.closest(".star-cil"); if(!s)return;
  const i=+s.dataset.i, cur=S.hodn[id]||0; hodnot(id,cur===i?i-0.5:i); }
// Klávesnica a čítačka: `role="slider"`, šípky po 0,5, Home = 0, End = 5 (WCAG 2.1.1, 4.1.2).
function hodnotKlaves(e,id){ const cur=S.hodn[id]||0, k={ArrowRight:.5,ArrowUp:.5,ArrowLeft:-.5,ArrowDown:-.5,PageUp:1,PageDown:-1}[e.key];
  const n=k!==undefined?cur+k:e.key==="Home"?0:e.key==="End"?5:null; if(n===null)return; e.preventDefault(); hodnot(id,n); }
// `ciel` = hviezdy v detaile: každá v obale .star-cil (dotykový cieľ ≥ 44 px); na karte len na čítanie
function starsHTML(hod,ciel){ let h=""; for(let i=1;i<=5;i++){ const fill=Math.max(0,Math.min(1,hod-(i-1)))*100;
  // prázdna hviezda v detaile je obrys ☆ — sivé plné ★ vyzerali ako 5★ (audit 8. 10.)
  const s=`<span class="star-slot" aria-hidden="true"><span class="star-e">${ciel?"☆":"★"}</span><span class="star-f" style="width:${fill}%">★</span></span>`;
  h+=ciel?`<span class="star-cil" data-i="${i}">${s}</span>`:s; }
  return h; }
function ulozPozn(id){ S.pozn[id]=document.getElementById("poznamka").value; save(); }
// --- vlastné dialógy namiesto natívnych (toast / confirm / prompt) ---
// `akcia` = {text, fn}: toast dostane skutočné <button> (napr. „↩ Späť") a vydrží 8 s namiesto 3.
// Text ide cez textContent (názvy receptov sú od používateľa), tlačidlo cez createElement.
// `toast._posl` = posledný text: akcia, ktorá volá funkciu s vlastným toastom (nacitajSablonuDoTyzdna
// hlási vymenené jedlá), ho pripojí k svojmu toastu so „↩ Späť" namiesto toho, aby ho prepísala.
function toast(msg,akcia,ms){ toast._posl=msg; const t=document.getElementById("toast"); if(!t)return; const uz=t.classList.contains("show"); t.textContent=msg; if(uz) animuj(t,"znova");
  t.classList.toggle("s-akciou",!!akcia);
  if(akcia){ const b=document.createElement("button"); b.type="button"; b.className="toast-akcia"; b.textContent=akcia.text;
    b.onclick=()=>{ toastSkry(); akcia.fn(); setTimeout(_fokusPoToaste,0); }; t.appendChild(b); }
  t._akcia=akcia&&!akcia.nieZ?akcia.fn:null;
  t.classList.add("show"); t._ms=ms||(akcia?10000:Math.min(8000,Math.max(3000,1500+55*String(msg).length))); _toastCas(t);
  if(!t._pauza){ t._pauza=1; const stoj=()=>clearTimeout(t._t), bez=()=>{ if(!t.matches(":hover")&&!t.contains(document.activeElement)) _toastCas(t,4000); };
    t.addEventListener("mouseenter",stoj); t.addEventListener("focusin",stoj); t.addEventListener("mouseleave",bez); t.addEventListener("focusout",bez); } }
function _toastCas(t,ms){ clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show","s-akciou"),ms||t._ms||3000); }
// Ctrl+Z / Cmd+Z vráti poslednú zmenu plánu — „↩ Späť" v toaste je pre klávesnicu desiatky Tabov ďaleko
document.addEventListener("keydown",e=>{ if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&(e.key==="z"||e.key==="Z")){ const a=document.activeElement;
  if(a&&(a.tagName==="TEXTAREA"||a.isContentEditable||(a.tagName==="INPUT"&&a.type!=="checkbox"))) return;
  const t=document.getElementById("toast"); if(t&&t.classList.contains("show")&&t._akcia&&!document.querySelector(MODALY_SEL)){ e.preventDefault(); const f=t._akcia; toastSkry(); f(); } } });
// Kolo 7 (prístupnosť): po akcii z toastu ide fokus na zmenené miesto (zablikaná bunka) alebo na prvý prvok obrazovky.
function _fokusPoToaste(){ const a=document.activeElement; if(a&&a!==document.body&&!a.closest("#toast")) return;
  const vrch=_vrchneOkno&&_vrchneOkno(), kor=vrch||document.getElementById("v-"+_curView); if(!kor) return;
  const c=kor.querySelector(".vymenene button,.vymenene [tabindex]")||_fokusovatelne(kor)[0]; if(c){ const rr=c.getBoundingClientRect(), vid=rr.bottom>0&&rr.top<innerHeight; c.focus({preventScroll:vid}); } }
// Kolo 9 (prístupnosť): JEDNO pravidlo pre všetky akcie z klávesnice (Enter/Space dá click s detail 0, Escape) —
// keď po nej fokus skončí na BODY (spúšťač sa prekreslil alebo okno zmizlo), ide na zmenené miesto / prvý prvok.
// Dotyk a myš sa nemenia (detail ≥ 1), aby fokus neskákal pod prstom.
document.addEventListener("click",e=>{ if(e.detail!==0||!e.isTrusted) return; const sp=e.target&&e.target.closest?e.target.closest("button,a,[role=button],[tabindex],summary,input")||e.target:null;
  setTimeout(()=>{ const a=document.activeElement; if(sp&&sp.isConnected&&sp.getClientRects().length&&getComputedStyle(sp).visibility!=="hidden") return; // spúšťač ostal — nie je čo opravovať
    if(!a||a===document.body||!a.isConnected) _fokusPoToaste(); },60); });
document.addEventListener("keyup",e=>{ if(e.key!=="Escape") return; setTimeout(()=>{ const a=document.activeElement; if(!a||a===document.body) _fokusPoToaste(); },60); });
function _plynule(fn,kedy){ if(kedy===false||!_pohyb()||!document.startViewTransition) return fn();
  try{ const t=document.startViewTransition(fn); ["ready","finished","updateCallbackDone"].forEach(k=>t[k]&&t[k].catch(()=>{})); }catch(e){ fn(); } }
function toastSkry(){ const t=document.getElementById("toast"); if(!t) return; clearTimeout(t._t); t.classList.remove("show","s-akciou"); t._akcia=null; }
// 1, 2–4, 5+: sklon(n,"jedlo","jedlá","jedál")
function sklon(n,a,b,c){ return n+" "+(n===1?a:(n>=2&&n<=4)?b:c); }
// ── ↩ SPÄŤ (jedna úroveň) ─────────────────────────────────────────────────────
// Každá akcia, ktorá mení plán týždňa (🎲 jedla/bloku, odobrať, ✎ zmeniť, už nezobrazovať,
// generovať, zamiešať, vyprázdniť, skopírovať), si pred zmenou odloží snímku 7 dní zobrazeného
// týždňa a toast ponúkne „↩ Späť". Pri „už nezobrazovať" ide do snímky aj S.skryte.
let _undoZ=[];
function zapamatajTyzden(sSkrytymi){ const u={od:S.viewOd,plan:{},planF:{},planM:{},zamky:{}};
  for(let di=0;di<7;di++){ const iso=datumPre(di);
    ["plan","planF","planM","zamky"].forEach(k=>{ if(S[k]&&S[k][iso]) u[k][iso]=JSON.parse(JSON.stringify(S[k][iso])); }); }
  if(sSkrytymi) u.skryte=Object.assign({},S.skryte);
  _undoZ.push(u); if(_undoZ.length>5) _undoZ.shift(); }
function vratSpat(){ if(document.body.classList.contains("generujem")){ toast("Počkaj, kým dokončím jedálniček."); return; } const u=_undoZ.pop(); if(!u){ toast("Nie je čo vrátiť."); return; }
  for(let di=0;di<7;di++){ const iso=pridajDni(u.od,di);
    ["plan","planF","planM","zamky"].forEach(k=>{ if(u[k]&&u[k][iso]) S[k][iso]=u[k][iso]; else delete S[k][iso]; }); }
  if(u.skryte){ S.skryte=u.skryte; renderGrid(); }
  save(); drzFokus(renderPlan); toast("↩ Vrátené, ako to bolo.",_undoZ.length?{text:"↩ Ešte krok ("+_undoZ.length+")",fn:vratSpat}:null); }
function toastSpat(msg){ toast(msg,_undoZ.length?{text:"↩ Späť",fn:vratSpat}:null); }
function dlgZavri(v){ const o=document.getElementById("dlg-overlay"); _odchodDuch("dlg-overlay"); o.classList.remove("open"); const r=o._res; o._res=null; _vratFokus(); if(r)r(v); }
// Dialóg je vrstva ako každé iné okno: _syncModal mu dá záznam v histórii (Späť = Zrušiť),
// inert pod ním a menovku z vety otázky (#dlg-text).
function confirmModal(msg,okLabel){ return new Promise(res=>{ const o=document.getElementById("dlg-overlay"); o._res=res; o._cancel=false;
  document.getElementById("dlg-modal").innerHTML=`<div class="content2"><p id="dlg-text">${escHtml(msg)}</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" onclick="dlgZavri(false)">Zrušiť</button><button class="btn primary" onclick="dlgZavri(true)">${escHtml(okLabel||"OK")}</button></div></div>`;
  o.classList.add("open"); document.body.style.overflow="hidden"; const bb=o.querySelector(".btn.primary"); if(bb)bb.focus(); }); }
// `inputmode` (napr. "decimal") = na telefóne číselná klávesnica namiesto písmen
function promptModal(msg,def,inputmode,okLabel){ return new Promise(res=>{ const o=document.getElementById("dlg-overlay"); o._res=res; o._cancel=null;
  document.getElementById("dlg-modal").innerHTML=`<div class="content2"><p id="dlg-text">${escHtml(msg)}</p><input id="dlg-in" aria-labelledby="dlg-text"${inputmode?` inputmode="${escHtml(inputmode)}"`:""} value="${escHtml(def==null?"":def)}" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;font-size:15px"><div class="btn-row" style="justify-content:flex-end;margin-top:14px"><button class="btn" onclick="dlgZavri(null)">Zrušiť</button><button class="btn primary" onclick="dlgPromptOk()">${escHtml(okLabel||"OK")}</button></div></div>`;
  o.classList.add("open"); document.body.style.overflow="hidden"; const inp=document.getElementById("dlg-in"); if(inp){ inp.focus(); inp.select(); inp.addEventListener("keydown",e=>{ if(e.key==="Enter"){e.preventDefault();dlgPromptOk();} });
    const fo=()=>{ if(inp.isConnected&&o.classList.contains("open")&&document.activeElement!==inp){ inp.focus(); inp.select(); } }; requestAnimationFrame(fo); setTimeout(fo,150); } }); }
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
  const el=_fokusPred; _fokusPred=null; if(!el) return; const k=_fokusKluc(el);
  setTimeout(()=>{ try{ let t=el.isConnected!==false?el:null;
    if(!t&&k) t=[...document.querySelectorAll("[data-fokus],[id],[onclick]")].find(x=>_fokusKluc(x)===k&&x.getClientRects().length);
    if(t&&typeof t.focus==="function") t.focus({preventScroll:true}); }catch(_){} },0); }
// Kolo 4 (pocit): okná sa zatvárali skokom. Stav sa mení HNEĎ (história, fokus, testy) — odchod hrá len kópia
// okna bez id a bez ovládania (inert, pointer-events:none), ktorá do 180 ms zmizne. Pri zníženom pohybe nič.
function _odchodDuch(oid){ try{ if(!_pohyb()) return; const o=document.getElementById(oid); if(!o||!o.classList.contains("open")) return;
  const m=o.id==="cook"?o:o.querySelector(".modal"); if(!m) return; const r=m.getBoundingClientRect(); if(!(r.height>0)) return;
  const bg=o.id==="cook"?"":getComputedStyle(o).backgroundColor;
  if(bg&&!/rgba\(0, 0, 0, 0\)|transparent/.test(bg)){ const d=document.createElement("div"); d.setAttribute("aria-hidden","true");
    Object.assign(d.style,{position:"fixed",inset:"0",background:bg,zIndex:"60",pointerEvents:"none",animation:"prekrytie-zmizni 180ms ease forwards"});
    document.body.appendChild(d); setTimeout(()=>d.remove(),200); }
  const z=parseFloat(getComputedStyle(m).zoom)||1, g=m.cloneNode(true);
  g.removeAttribute("id"); g.querySelectorAll("[id]").forEach(e=>e.removeAttribute("id")); g.setAttribute("aria-hidden","true"); g.inert=true; g.classList.add("modal-duch");
  Object.assign(g.style,{position:"fixed",left:r.left/z+"px",top:r.top/z+"px",width:r.width/z+"px",height:r.height/z+"px",margin:"0",zIndex:o.id==="cook"?"81":"61",pointerEvents:"none",overflow:"hidden",animation:"duch-von 180ms cubic-bezier(.4,0,1,1) forwards"});
  document.body.appendChild(g); setTimeout(()=>g.remove(),200); }catch(e){} }
// Kolo 4 (ovládanie): gestá na dotyk. Vo varení potiahnutie doľava = ďalší krok, doprava = späť (mastné ruky
// netrafia tlačidlo); hlavičku okna (.hero) potiahnuť nadol = zavrieť najvrchnejšie okno. Len prst, myš nie.
// Kolo 5 (pocit, ovládanie): okno aj krok počas ťahu SLEDUJÚ prst (translate), pustenie pod prahom ich vráti.
// Prah je dráha (okno 120 px, krok 80 px), rýchly švih stačí kratší (90/70 px do 700 ms) — pomalý ťah už neprepadne.
(function(){ let g=null;
  const vrat=x=>{ if(x&&x.el){ const el=x.el; el.style.transition="translate 180ms cubic-bezier(.2,.8,.2,1)"; el.style.translate="";
    setTimeout(()=>{ el.style.transition=""; },200); } if(x&&x.ov) x.ov.style.backgroundColor=""; };
  document.addEventListener("pointerdown",e=>{ if(e.pointerType!=="touch"){ g=null; return; }
    const cook=e.target.closest&&e.target.closest("#cook.open .cook-telo"), hero=e.target.closest&&e.target.closest(".overlay.open .hero");
    g=(cook||hero)?{x:e.clientX,y:e.clientY,t:Date.now(),cook:!!cook,el:cook||hero.closest(".modal")}:null;
    if(g&&hero){ const ov=hero.closest(".overlay"), m=ov&&getComputedStyle(ov).backgroundColor.match(/rgba?\(([^)]+)\)/); if(m){ const c=m[1].split(",").map(x=>x.trim()); g.ov=ov; g.rgb=c.slice(0,3).join(","); g.a=c.length>3?+c[3]:1; } } },{passive:true});
  document.addEventListener("pointermove",e=>{ if(!g||e.pointerType!=="touch"||!g.el||!_pohyb()) return; const dx=e.clientX-g.x, dy=e.clientY-g.y;
    if(g.cook){ if(Math.abs(dx)>Math.abs(dy)) g.el.style.translate=Math.round(dx*0.4)+"px 0"; }
    else if(dy>0&&dy>Math.abs(dx)){ g.el.style.translate="0 "+Math.round(dy)+"px"; if(g.ov) g.ov.style.backgroundColor="rgba("+g.rgb+","+(g.a*(1-Math.min(dy/400,0.6))).toFixed(3)+")"; } },{passive:true});
  document.addEventListener("pointerup",e=>{ if(!g||e.pointerType!=="touch") return; const dx=e.clientX-g.x, dy=e.clientY-g.y, rychlo=Date.now()-g.t<700, x=g; g=null;
    if(x.cook && Math.abs(dx)>(rychlo?70:80) && Math.abs(dx)>Math.abs(dy)*1.5){ vrat(x); krok(dx<0?1:-1); }
    else if(!x.cook && dy>(rychlo?90:120) && Math.abs(dy)>Math.abs(dx)*1.5){ zavriVrchnu(); if(x.el){ x.el.style.transition=""; x.el.style.translate=""; } if(x.ov) x.ov.style.backgroundColor=""; }
    else vrat(x); },{passive:true});
  document.addEventListener("pointercancel",()=>{ vrat(g); g=null; },{passive:true}); })();
function zavri(){ _odchodDuch("overlay"); document.getElementById("overlay").classList.remove("open"); document.body.style.overflow=""; _zahodHistoriuModalu(); _vratFokus(); }
document.getElementById("overlay").addEventListener("click",e=>{if(e.target.id==="overlay")zavri();});

// ── VRSTVY OKIEN (audit 30. 9.) ─────────────────────────────────────────────────────────────
// Okná ZHORA nadol: dialóg (z 90) > varenie (80) > výber (60, v DOM-e za detailom) > detail (60).
// Pravidlo: Escape aj systémové Späť zatvoria VŽDY LEN NAJVRCHNEJŠIU vrstvu (dialóg = Zrušiť).
// Otvorené „⋯ Viac" (.menu) je tiež vrstva — nie je modálne, ale Späť/Escape zatvárajú najprv jeho.
// Do v32 mal celý zásobník okien jeden záznam v histórii a dialóg ani menu žiadny: Späť z varenia
// zavrelo aj detail a Späť nad „Vyprázdniť týždeň?" prepol obrazovku a dialóg nechal visieť.
const VRSTVY=["dlg-overlay","cook","pick-overlay","overlay"];
function _vrchneOkno(){ for(const id of VRSTVY){ const el=document.getElementById(id); if(el&&el.classList.contains("open"))return el; } return null; }
function modalOtvoreny(){ return !!_vrchneOkno(); }
function _pocetVrstiev(){ return VRSTVY.filter(id=>{ const el=document.getElementById(id); return el&&el.classList.contains("open"); }).length
  +(document.querySelector(".menu.open")?1:0); }
function zavriVrchnu(){ const m=document.querySelector(".menu.open");
  if(m){ zavriMenu(); const b=m.parentElement&&m.parentElement.querySelector("button"); if(b&&b.focus)b.focus(); return true; }
  const top=_vrchneOkno(); if(!top)return false;
  if(top.id==="dlg-overlay") dlgZavri(top._cancel); else if(top.id==="cook") _cookSpat(); else if(top.id==="pick-overlay") zavriPick(); else zavri();
  return true; }
// Kolo 6 (ovládanie): okrajové gesto Späť sa v kuchyni spustí ľahko omylom — varenie sa zavrie, ale toast povie,
// kde si skončil, a vráti ťa tam jedným ťuknutím (krok aj zaškrtnuté suroviny ostávajú).
async function _cookSpat(){ const k=cookKrok, n=cookKroky.length; await zavriCook();
  if(document.getElementById("cook").classList.contains("open")||!cookRecept||!n) return;
  toast("Varenie prerušené na kroku "+(k+1)+" / "+n+".",{text:"↩ Pokračovať",fn:()=>{ const el=document.getElementById("cook"); cookKrok=k; el.classList.add("open"); ukazKrok(); _fokusDoModalu("cook"); _drzDisplej(); },nieZ:true}); }
// Pasca fokusu (WCAG 2.4.3, 4.1.2): Tab aj Shift+Tab cyklia v najvrchnejšom okne. Do v32 spadol
// fokus v detaile po 8. Tabe na <body> a 62 zo 70 zastávok bolo za prekrytím.
const FOKUS_SEL='a[href],button,input,select,textarea,summary,[tabindex]';
function _fokusovatelne(root){ return [...root.querySelectorAll(FOKUS_SEL)].filter(el=>el.tabIndex>=0 && !el.disabled && !el.closest("[inert]")
  && (el.checkVisibility?el.checkVisibility({checkVisibilityCSS:true,visibilityProperty:true}):el.getClientRects().length>0)); }
document.addEventListener("keydown",e=>{
  // D4: Escape zatvára aj režim varenia — v kuchyni so zamastenými rukami je „✕ Koniec" mimo dosahu
  if(e.key==="Escape"){ if(zavriVrchnu()) e.preventDefault(); return; }
  if(e.key!=="Tab")return;
  const top=_vrchneOkno(); if(!top)return;
  const f=_fokusovatelne(top); if(!f.length){ e.preventDefault(); return; }
  const a=document.activeElement, i=f.indexOf(a);
  if(i<0&&a&&top.contains(a)&&a!==top){ const n=e.shiftKey?[...f].reverse().find(x=>a.compareDocumentPosition(x)&Node.DOCUMENT_POSITION_PRECEDING)
      :f.find(x=>a.compareDocumentPosition(x)&Node.DOCUMENT_POSITION_FOLLOWING);
    e.preventDefault(); (n||(e.shiftKey?f[f.length-1]:f[0])).focus(); return; }
  const ciel=i<0?(e.shiftKey?f[f.length-1]:f[0]):(!e.shiftKey&&i===f.length-1)?f[0]:(e.shiftKey&&i===0)?f[f.length-1]:null;
  if(ciel){ e.preventDefault(); ciel.focus(); } });
// posledný fokus v každom okne — keď sa zavrie okno nad ním, fokus sa vráti sem, nie na <body>
document.addEventListener("focusin",e=>{ const l=e.target&&e.target.closest&&e.target.closest("#overlay,#pick-overlay,#dlg-overlay,#cook"); if(l) l._poslFokus=e.target; });
// Menovka okna = jeho nadpis (h2), v dialógu veta otázky. Obsah okien sa prekresľuje cez innerHTML,
// preto sa to robí pri každej zmene obsahu, nie raz v šablóne. Varenie má aria-labelledby v šablóne.
function _oznacDialog(box){ if(!box||box.id==="cook")return; const h=box.querySelector("h2,h3,p"); if(!h)return;
  if(!h.id)h.id=box.id+"-nadpis"; box.setAttribute("aria-labelledby",h.id); }

// E2+E4: centrálny stav modálov — zamkni scroll pozadia pri KTOROMKOĽVEK otvorenom modáli a podchyť „späť" (Android/PWA gesto)
let _histPush=0, _ignorujPop=0, _poNavrate=null, _syncT=null, _vrchPred=null;
function _syncModal(){ const top=_vrchneOkno();
  document.body.style.overflow = top ? "hidden" : "";
  // otvorenie myšou/dotykom: zapamätaj spúšťač skôr, než ho inert pripraví o fokus (textové pole nie —
  // fokus doň by na telefóne vysunul klávesnicu)
  if(top && !_vrchPred && !_fokusPred){ const a=document.activeElement;
    if(a&&a!==document.body&&a.closest&&!a.closest("#overlay,#pick-overlay,#dlg-overlay,#cook")&&!(a.matches&&a.matches("input,textarea,select"))) _fokusPred=a; }
  // aria-modal čítačke nestačí (Android, starší iOS) — obsah pod najvrchnejším oknom je `inert`
  [document.querySelector(".app"),document.getElementById("botnav"),document.querySelector("a.skip")].concat(VRSTVY.map(id=>document.getElementById(id)))
    .forEach(el=>{ if(el) el.inert = !!top && el!==top; });
  if(top){ const box=top.querySelector('[role="dialog"]')||top;
    _oznacDialog(box); zpristupniFormulare(box); zpristupniKliky(box); // D6 + A7 aj pre prekreslený obsah okna
    box.querySelectorAll("button.close:not([aria-label])").forEach(b=>b.setAttribute("aria-label","Zavrieť")); // „✕“ čítačke nič nepovie
    // zavrelo sa okno nad týmto → fokus späť tam, kde v ňom bol
    if(_vrchPred && _vrchPred!==top && !_vrchPred.classList.contains("open")){ const f=top._poslFokus;
      setTimeout(()=>{ if(_vrchneOkno()!==top || top.contains(document.activeElement))return;
        if(f&&f.isConnected&&top.contains(f)) f.focus(); else _fokusDoModalu(box.id); },0); } }
  _vrchPred=top;
  _zahodHistoriuModalu(); }
// D5: história má mať PRÁVE jeden záznam na každú otvorenú vrstvu. Zladí sa až po dobehnutí
// všetkého synchrónneho kódu (setTimeout 0), takže „zavri výber a otvor detail" v jednom kliku
// záznam len prevezme. Návrat, ktorý spustíme my (history.go), popstate ignoruje.
function _zahodHistoriuModalu(){ clearTimeout(_syncT); _syncT=setTimeout(_zladHistoriu,0); }
function _zladHistoriu(){ const n=_pocetVrstiev();
  if(_histPush<n){ for(;_histPush<n;_histPush++){ try{history.pushState({m:1},"");}catch(e){ _histPush=n; break; } } }
  else if(_histPush>n){ const d=_histPush-n; _histPush=n; _ignorujPop++; try{history.go(-d);}catch(e){ _ignorujPop--; } } }
["overlay","pick-overlay","dlg-overlay","cook"].forEach(id=>{ const el=document.getElementById(id); if(el) new MutationObserver(_syncModal).observe(el,{attributes:true,attributeFilter:["class"]}); });
["modal","pick-modal","dlg-modal"].forEach(id=>{ const el=document.getElementById(id); if(el) new MutationObserver(_syncModal).observe(el,{childList:true,subtree:true}); });
window.addEventListener("popstate",()=>{
  if(_ignorujPop>0){ _ignorujPop--; if(_poNavrate){ const v=_poNavrate; _poNavrate=null; if(location.hash!=="#"+v) location.hash=v; } return; }
  if(_histPush>0 && _pocetVrstiev()>0){ _histPush--; zavriVrchnu(); return; } // jedna vrstva na jedno Späť
  if(_kalHist){ _kalHist=false; if(_curView==="planovac"){ planZobraz("tyzden"); return; } }
  const v=location.hash.slice(1)||"domov"; if(v!==_curView && document.getElementById("v-"+v)) zobrazView(v);
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
// `.chart .col[onclick]` doplnené: 7 stĺpcov grafu Výživy bolo dostupných len myšou, takže
// rozpad jedál pre Ut–Ne sa klávesnicou nedal otvoriť vôbec (WCAG 2.1.1, úroveň A).
// Audit 30. 9.: posledná časť selektora berie AKÝKOĽVEK <span|div|b|a onclick> bez tabindexu —
// riadky výsledkov hľadania, dni kalendára, ✕ pravidla v sprievodcovi. Okná to volajú samy pri
// každej zmene obsahu (_syncModal), obrazovky pri prekreslení.
// Ikona položky menu do pevného stĺpca (kolo 4, dizajn: položky so ↩ 🗑 ✎ začínali o 5–12 px inde ako s emoji)
function _ikonyMenu(root){ (root||document).querySelectorAll(".menu a, .akcia-pol > .nm, .btn, details > summary, .panel > h3").forEach(el=>{ if(el.querySelector(".mi")) return;
  const t=el.firstChild; if(!t||t.nodeType!==3) return; const m=t.nodeValue.match(/^\s*([^\p{L}\p{N}\s]{1,3}(?:\uFE0F)?)\s+/u); if(!m) return;
  const sp=document.createElement("span"); sp.className="mi"; sp.setAttribute("aria-hidden","true"); sp.textContent=m[1]; t.nodeValue=" "+t.nodeValue.slice(m[0].length); el.insertBefore(sp,t); }); }
function zpristupniKliky(root){ try{ _ikonyMenu(root); }catch(e){} (root||document).querySelectorAll(".chip:not([tabindex]),.kol-tile:not([tabindex]),.menu a:not([tabindex]),.plan-cell[onclick]:not([tabindex]),.chart .col[onclick]:not([tabindex]),[onclick]:not(button,input,select,textarea,summary,label,option,a[href],[tabindex])").forEach(el=>{
    if(el.style.cursor==="default")return;
    if(el.tagName==="BUTTON")return; // skutočné tlačidlo už klávesnicu má, pečiatka by len duplikovala rolu
    el.setAttribute("tabindex","0"); if(!el.getAttribute("role"))el.setAttribute("role","button");
    // Menovka sa berie z `title` PRED textom. Chip, ktorého obsah je len znak („◀", „📅"),
    // by inak dostal aria-label="◀" a čítačka by prečítala názov znaku — vysvetlenie pritom
    // v `title` je, len bolo na telefóne nedosiahnuteľné (hover-only).
    if(!el.getAttribute("aria-label")&&!el.querySelector(".mi,.ic")){ let t=(el.getAttribute("title")||el.textContent||"").trim(); if(t==="✕")t="Odstrániť"; if(t)el.setAttribute("aria-label",t); } }); }
// Navigácia najprv: všeobecná časť zpristupniKliky by jej odkazom dala tabindex skôr a ikony
// by ostali čítačke („domček Domov").
function zpristupniNav(){
  document.querySelectorAll(".side nav a:not([tabindex]),.side .foot a:not([tabindex]),.botnav a:not([tabindex])").forEach(a=>{ a.setAttribute("role","button"); if(!a.hasAttribute("tabindex"))a.setAttribute("tabindex","0"); const ic=a.querySelector(".ic"); if(ic)ic.setAttribute("aria-hidden","true"); if(!a.getAttribute("aria-label")&&!ic)a.setAttribute("aria-label",a.textContent.trim()); });
  zpristupniKliky(); }
// Prekreslenie cez innerHTML zahodí fokusovaný prvok a klávesnica spadne na <body> (WCAG 2.4.3):
// ★ na karte, čipy, −/+ a ✕ v Špajzi, ✕ stravníka, rozvrh, šípky trasy. drzFokus(fn) si zapamätá
// kľúč prvku (data-fokus, inak id, inak onclick), prekreslí a fokus vráti. Keď prvok chýba (✕ zmazal
// riadok), dostane fokus ovládanie na tej istej pozícii; keď je zakázaný (↑ na prvom riadku), sused.
// `el` = spúšťač zachytený skôr (pred potvrdzovacím dialógom). Nákup a Plán ho zatiaľ nepoužívajú.
function _fokusKluc(el){ return el&&el.getAttribute?(el.getAttribute("data-fokus")||(el.id?"#"+el.id:"")||el.getAttribute("onclick")||""):""; }
function drzFokus(fn,el){ const a=el||document.activeElement;
  if(!a||a===document.body||!a.closest) return fn();
  const kor=a.closest(".view,.modal,.cook")||document.body, k=_fokusKluc(a), poz=_fokusovatelne(kor).indexOf(a);
  const v=fn();
  if(a.isConnected && document.activeElement===a) return v;
  const f=_fokusovatelne(kor); let ciel=k?f.find(x=>_fokusKluc(x)===k):null;
  if(!ciel && k){ const z=[...kor.querySelectorAll("[data-fokus],[id],[onclick]")].find(x=>_fokusKluc(x)===k);
    if(z&&z.parentElement) ciel=_fokusovatelne(z.parentElement)[0]; }
  if(!ciel && poz>=0 && f.length) ciel=f[Math.min(poz,f.length-1)];
  if(ciel) try{ ciel.focus({preventScroll:true}); }catch(_){}
  return v; }
// A8: jedno pravidlo pre VŠETKO, čo dostane rolu tlačidla — predtým tu chýbali `.plan-cell[tabindex]`
// (riadky pickerov boli fokusovateľné, ale Enter s nimi nič neurobil) aj nové karty receptov.
document.addEventListener("keydown",e=>{ const t=e.target; if(!t||!t.matches)return;
  if(e.key!=="Enter"&&e.key!==" ")return;
  if(t.matches('[role="button"][tabindex="0"],.side a,.botnav a,.menu a')){ e.preventDefault(); t.click(); } });

let cookKrok=0, cookKroky=[], wakeLock=null, cookRecept=null, cookAuto=false, cookBlokIds=[];
let casovace=[], casInterval=null, casId=0;
// Farby blokov na tmavej ploche varenia sú SVETLÉ varianty (svetlá slivka #6E2A55 by na
// #141210 dala 2,3:1). --akcent sa počíta na <body>, takže sa dnu neprefarbí sám —
// nastavujeme ho priamo na .cook podľa bloku, v ktorom sa tento recept varí.
const COOK_BLOKY=["#E39CC4","#6FCBE4","#BCD05E"];
function blokReceptu(id){ const it=planItems().find(x=>x.cid===id||x.r.id===id); return it?blokIndex(it.di):null; }
// cookZdroje[i] = [recept, faktor porcií] kroku i — krok varenia ukáže aj MNOŽSTVÁ surovín
// (detail ich pri kroku má, varenie ich do v32 zahadzovalo: „Zmiešaj všetko s jogurtom" — koľko?).
let cookZdroje=[];
// „🧺 Priprav si" je zaškrtávací zoznam: rovnaká surovina (kanonický kľúč) sa sčíta po jednotkách a zoradí podľa
// oddelenia. Kolo 3: pri varení bloku to bol odsek s 25–31 položkami („Soľ · Soľ 1 ČL", kuracie 840 g + 1000 g).
let cookPrip=[], cookPripPozor="", cookPripHotovo=new Set(), _varenieOdpis=null;
function pripravZoznam(z){ const m=new Map(), por=poradieOddeleni();
  z.forEach(([r,fp,fv])=>ingrediencieNaNakup(r).forEach(i=>{ const p=najdiPotravinu(i.nazov), k=p?kanonKluc(p.kluc):bezDia(i.nazov);
    let x=m.get(k); if(!x){ x={nazov:i.nazov,q:{},odd:p?p.oddelenie:""}; m.set(k,x); }
    if(i.mnozstvo!=null){ const j=i.jednotka||""; x.q[j]=(x.q[j]||0)+skalovanaHodnota(i.mnozstvo,i.jednotka,fp,fv||1); } }));
  m.forEach(x=>{ Object.keys(x.q).forEach(j=>{ if(/^(g|ml)$/.test(j)) x.q[j]=x.q[j]>=50?Math.round(x.q[j]/5)*5:x.q[j]>=10?Math.round(x.q[j]):Math.round(x.q[j]*2)/2; }); });
  const ix=o=>{ const i=por.indexOf(o); return i<0?99:i; };
  return [...m.values()].sort((a,b)=>ix(a.odd)-ix(b.odd)).map(x=>{ const q=Object.keys(x.q).map(j=>prevodJednotka(x.q[j],j)).join(" + "); return x.nazov+(q?" — "+q:""); }); }
// Kolo 6 (výživa): rada proti zaduseniu malého dieťaťa platí v detaile AJ v „Priprav si" pri sporáku — tam sa krája.
function zadusenieText(rs){ if(!maleDieta()) return ""; const t=[];
  if(rs.some(r=>r&&/orech(?!\w* (masl|mliek))|oriesk|arasid(?!\w* masl)|mandl(?!\w* (mliek|masl|muk))|kesu(?!\w* masl)|pistac|lieskov(?!\w* masl)|hrozn|cherry|cherr|olivy|parky/.test(bezDia((r.ingrediencie||[]).map(i=>i.nazov).join(" ")))))
    t.push("👶 Pre dieťa do 6 rokov: orechy pomeľ, hrozno, cherry paradajky, olivy a párky rozkroj na štvrtiny.");
  if(rs.some(r=>r&&!r._priloha&&jePaliveJedlo(r))) t.push("🌶 Porciu pre malé dieťa odober pred pridaním čili a pálivého korenia.");
  return t.join(" "); }
function _pripravSi(){ cookPrip=pripravZoznam([[aktualny,aktualny.porcie?aktPorcie/aktualny.porcie:1,aktVelkost]].concat(aktPrilohy.map(p=>[p,aktPorcie/(p.porcie||1),aktVelkost]))); cookPripPozor=zadusenieText([aktualny].concat(aktPrilohy));
  return cookPrip.length?"🧺 Priprav si":""; }
function prepniPrip(i,el){ if(el.checked) cookPripHotovo.add(i); else cookPripHotovo.delete(i); el.closest("li").classList.toggle("hot",el.checked); }
async function spustiCook(){ const prip=_pripravSi(); const kroky=(prip?[prip]:[]).concat(aktualny.postup||[],_prilohaKroky());
  cookZdroje=(prip?["prip"]:[]).concat((aktualny.postup||[]).map(()=>[aktualny,aktualny.porcie?aktPorcie/aktualny.porcie:1]))
    .concat(...aktPrilohy.map(p=>(p.postup||[]).map(()=>[p,aktPorcie/(p.porcie||1)])));
  cookBlokIds=[]; await _spustiVarenie(kroky,aktualny.id,blokReceptu(aktualny.id),aktualny.nazov); }
async function _spustiVarenie(kroky,id,bi,titul){
  // Ten istý recept sa po prerušení (Escape, Späť, zamknutý telefón) otvorí na kroku, kde si skončil.
  const pokracuj=cookRecept===id && cookKroky.length===kroky.length && cookKrok>0 && cookKrok<kroky.length;
  cookKroky=kroky; if(!pokracuj){ cookKrok=0; cookPripHotovo=new Set(); } cookRecept=id; toastSkry();
  const el=document.getElementById("cook");
  el.style.setProperty("--akcent", bi==null?"#EDE6DA":COOK_BLOKY[bi%3]); // recept mimo plánu nemá blok
  document.getElementById("cook-title").innerHTML=(bi==null?"":`<span class="znak ${blokTrieda(bi)}" aria-hidden="true">${blokPismeno(bi)}</span> `)+escHtml(titul);
  el.classList.add("open"); ukazKrok();
  if(pokracuj) toast("Pokračuješ krokom "+(cookKrok+1)+" z "+cookKroky.length+" — „← Späť“ ťa vráti.");
  // Bez tohto ostal fokus na karte receptu POD prekrytím (z-index 80) a Tab pokračoval
  // v mriežke za ním. `zavriCook` návrat fokusu už rieši, chýbal len vstup (WCAG 2.4.11).
  _fokusDoModalu("cook");
  _drzDisplej(); }
async function _drzDisplej(){ if(!('wakeLock' in navigator)) return; try{ if(wakeLock&&!wakeLock.released) return; wakeLock=await navigator.wakeLock.request('screen'); }catch(e){} }
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ const c=document.getElementById("cook"); if(c&&c.classList.contains("open")) _drzDisplej(); } });
// Prvé trvanie v kroku. Hodiny vrátane „1 hodinu 30 minút" a „pol hodiny" (do 8. 10. dostalo ~370 krokov
// s hodinami žiadny časovač a „1 h 30 min" časovač na 30 min). Pri rozsahu „20–25 min" dolná hranica — skontroluj skôr.
const _CAS_R="(\\d+(?:[.,]\\d+)?)(?:\\s*[–-]\\s*\\d+(?:[.,]\\d+)?)?\\s*";
const _CAS_VZORY=[[new RegExp(_CAS_R+"(?:hod\\w*|h)\\b(?:\\s*(?:a\\s*)?(\\d+)\\s*min)?"),x=>parseFloat(x[1].replace(",","."))*3600+(x[2]?parseInt(x[2])*60:0)],
  [/pol\s*hodin/,()=>1800],[new RegExp(_CAS_R+"min"),x=>parseFloat(x[1].replace(",","."))*60],[new RegExp(_CAS_R+"sek"),x=>parseInt(x[1])]];
const _CAS_SLOVA={jednu:1,jeden:1,dve:2,dva:2,tri:3,styri:4,pat:5,sest:6,sedem:7,osem:8,devat:9,desat:10,patnast:15,dvadsat:20,tridsat:30,styridsat:40,patdesiat:50};
function parseCasSek(t){ let s=bezDia(t).replace(/(\d)\s*½/g,"$1,5").replace(/½/g,"0,5").replace(/(\d+)\s*a\s*1\/2/g,(m,n)=>n+",5")
    .replace(/\b(jednu|jeden|dve|dva|tri|styri|pat|sest|sedem|osem|devat|desat|patnast|dvadsat|tridsat|styridsat|patdesiat)\s+(min|hod)/g,(m,w,u)=>_CAS_SLOVA[w]+" "+u)
    .replace(/(^|[^\d\s])\s*\bhodinu\b/g,"$1 1 hodinu");
  const kand=_CAS_VZORY.map(([re,f])=>{ const x=s.match(re); return x?{i:x.index,sek:Math.round(f(x))}:null; }).filter(Boolean).sort((a,b)=>a.i-b.i);
  return kand.length?kand[0].sek:0; }
function formatCas(x){ const h=Math.floor(x/3600), m=Math.floor(x/60)%60, s=x%60, d=n=>(n<10?"0":"")+n;
  return h?h+":"+d(m)+":"+d(s):d(Math.floor(x/60))+":"+d(s); } // kolo 6: 2 h = „2:00:00", nie „120:00"
// Kolo 6 (ovládanie): varenie bloku má 14–20 krokov — názov jedla nad krokom skočí na začiatok ďalšieho jedla.
function _cookJedla(){ const out=[]; cookZdroje.forEach((z,i)=>{ if(Array.isArray(z)&&z[2]&&(!out.length||out[out.length-1].r!==z[0])) out.push({r:z[0],i}); }); return out; }
function skokJedlo(){ const J=_cookJedla(); if(J.length<2) return; const z=cookZdroje[cookKrok];
  const ix=J.findIndex((x,k)=>x.r===(z&&z[0])&&cookKrok>=x.i&&(k===J.length-1||cookKrok<J[k+1].i)); const ciel=J[(ix+1)%J.length].i;
  krok(ciel-cookKrok); const b=document.querySelector("#cook-step .cook-jedlo"); if(b) b.focus({preventScroll:true}); }
function ukazKrok(){ const t=cookKroky[cookKrok]||"";
  const z=cookZdroje[cookKrok], mn=document.getElementById("cook-mn"), st=document.getElementById("cook-step");
  if(Array.isArray(z)&&z[2]){ const J=_cookJedla(), ix=J.findIndex((x,k)=>x.r===z[0]&&cookKrok>=x.i&&(k===J.length-1||cookKrok<J[k+1].i));
    st.innerHTML='<span>'+(J.length>1?'<button type="button" class="cook-jedlo" onclick="skokJedlo()" aria-label="'+escHtml(z[0].nazov)+' — jedlo '+(ix+1)+' z '+J.length+', skočiť na ďalšie">'+escHtml(z[0].nazov)+' <small>· jedlo '+(ix+1)+'/'+J.length+' ▸</small></button>':'<span class="cook-jedlo">'+escHtml(z[0].nazov)+'</span>')+(cookKrok+1)+". "+escHtml(z[2])+'</span>'; } // jeden flex potomok — .step je flex
  else st.textContent=(cookKrok+1)+". "+t;
  if(mn) mn.innerHTML=z==="prip"?(cookPripPozor?'<p class="krok-mn">'+escHtml(cookPripPozor)+'</p>':'')+'<ul class="prip-zoz">'+cookPrip.map((x,i)=>'<li'+(cookPripHotovo.has(i)?' class="hot"':'')+'><label><input type="checkbox"'+(cookPripHotovo.has(i)?" checked":"")+' onchange="prepniPrip('+i+',this)"> '+escHtml(x)+'</label></li>').join("")+'</ul>'
    :z?krokHint(z[2]||t,z[1],z[2]?1:aktVelkost,z[0]):"";
  document.getElementById("cook-progress").textContent=(cookKrok+1)+" / "+cookKroky.length;
  const kr=document.getElementById("cook-kroky");
  if(kr){ const zac=new Set(_cookJedla().slice(1).map(x=>x.i)); kr.innerHTML=cookKroky.map((_,i)=>`<i class="${i<cookKrok?"hot":(i===cookKrok?"tu":"")}${zac.has(i)?" nove-jedlo":""}"></i>`).join(""); }
  // posledný krok: tlačidlo hovorí, čo sa stane (zápis do histórie), nie „Ďalej" do prázdna
  const dal=document.getElementById("cook-dalej"); if(dal) dal.textContent=cookKrok>=cookKroky.length-1?"✓ Hotovo":"Ďalej →";
  const sek=parseCasSek(t); const ab=document.getElementById("cook-add-timer");
  if(sek&&sek<=3*3600){ ab.style.display="inline-block"; ab.textContent="➕ "+formatCas(sek)+" časovač"; ab.setAttribute("aria-label","Pridať časovač na "+formatCas(sek)); ab.dataset.sek=sek; } else ab.style.display="none";
  if(cookAuto) citajKrok();
}
// Časovač ráta podľa HODÍN (`koniec`), nie počtom tikov: setInterval sa na pozadí a pri zamknutom
// telefóne spomalí na raz za minútu a časovač by meškal o minúty.
function tickCasovace(){ const t=Date.now();
  casovace.forEach(c=>{ if(c.left>0){ c.left=Math.max(0,Math.ceil((c.koniec-t)/1000)); if(c.left<=0){ pip(); vibruj([220,120,220,120,420]); toast("⏲ Časovač „"+c.label+"“ dobehol.",{text:"✓ Vypnúť",fn:()=>zmazCasovac(c.id),nieZ:true},15000);
      { let n=0; const al=setInterval(()=>{ if(!casovace.includes(c)||++n>12){ clearInterval(al); return; } pip(); vibruj([220,120,220]); },10000); }
      setTimeout(()=>{ const b=document.querySelector('#cook-timers .timer[data-id="'+c.id+'"]'); if(b) b.classList.add("zvoni"); },0); } } });
  renderCasovace();
  if(!casovace.some(c=>c.left>0)){ clearInterval(casInterval); casInterval=null; } }
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && casInterval) tickCasovace(); });
// Prekresľuje sa len pri zmene zoznamu; každú sekundu sa mení iba text — inak by klávesnica
// stratila fokus na časovači každú sekundu. Tlačidlo, nie <span onclick> (2.1.1).
function renderCasovace(){ const box=document.getElementById("cook-timers"); if(!box)return;
  const ids=casovace.map(c=>c.id).join(",");
  if(box.dataset.ids!==ids){ box.dataset.ids=ids; box.innerHTML=casovace.map(c=>`<button type="button" class="timer" data-id="${c.id}" onclick="zmazCasovacKlik(${c.id})"></button>`).join(""); }
  casovace.forEach(c=>{ const b=box.querySelector('[data-id="'+c.id+'"]'); if(!b)return;
    b.classList.toggle("run",c.left>0);
    b.textContent=(c.left>0?"⏲ "+formatCas(c.left):"✅ hotovo")+" · "+c.label+" ✕";
    b.setAttribute("aria-label",c.left>0?"Časovač "+c.label+", zostáva "+formatCas(c.left)+". Vypnúť":"Časovač "+c.label+" dobehol. Odstrániť"); }); }
function pridajCasovacSek(sek,label){ if(!sek)return; zvukOdomkni(); casId++; casovace.push({id:casId,left:sek,koniec:Date.now()+sek*1000,label:label||formatCas(sek)}); if(!casInterval)casInterval=setInterval(tickCasovace,1000); renderCasovace(); }
function pridajKrokovyCasovac(){ const sek=parseInt(document.getElementById("cook-add-timer").dataset.sek)||0; const z=cookZdroje[cookKrok]; pridajCasovacSek(sek,(z&&z!=="prip"&&z[0]&&z[0].nazov?z[0].nazov.slice(0,28)+" · ":"")+"krok "+(cookKrok+1)); }
async function pridajCasovac(){ const v=await promptModal("Časovač na koľko minút? (1 až 600)","5","decimal","⏱ Spustiť"); if(v===null)return; const min=parseFloat(String(v).replace(",","."));
  if(!isFinite(min)||min<1||min>600){ toast("Časovač nastav na 1 až 600 minút — napríklad 25."); return; } pridajCasovacSek(Math.round(min*60),fmt(min)+" min"); }
// Ťuk na bežiaci časovač ho bez otázky zmazal — mastným prstom sa to stane ľahko.
async function zmazCasovacKlik(id){ const c=casovace.find(x=>x.id===id); if(!c)return;
  if(c.left>0 && !await confirmModal("Vypnúť časovač „"+c.label+"“? Zostáva "+formatCas(c.left)+".","Vypnúť časovač")) return;
  zmazCasovac(id); }
function zmazCasovac(id){ { const c=casovace.find(x=>x.id===id), t=document.getElementById("toast"); if(c&&t&&t.classList.contains("show")&&String(toast._posl||"").includes(c.label)) toastSkry(); } casovace=casovace.filter(c=>c.id!==id); renderCasovace(); if(!casovace.length&&casInterval){clearInterval(casInterval);casInterval=null;} }
// 3 mäkké pípnutia cez JEDNO AudioContext (do v33 nové pri každom pípnutí, nikdy nezatvorené, a vytvorené
// až pri dobehnutí — telefón ho nechal stlmené). Odomkne sa pri ťuku na „➕ časovač" (zvukOdomkni).
let _audio=null;
function zvukOdomkni(){ try{ _audio=_audio||new (window.AudioContext||window.webkitAudioContext)(); if(_audio.state==="suspended") _audio.resume(); }catch(e){} }
function pip(){ try{ zvukOdomkni(); const a=_audio; if(!a) return;
  [0,0.45,0.9].forEach(d=>{ const o=a.createOscillator(), g=a.createGain(), t0=a.currentTime+d; o.frequency.value=880;
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(0.25,t0+0.03); g.gain.linearRampToValueAtTime(0,t0+0.35);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0+0.36); }); }catch(e){} }
function citajKrok(){ try{ if(!('speechSynthesis' in window))return; speechSynthesis.cancel(); const mn=((document.getElementById("cook-mn")||{}).textContent||"").replace("▸","").trim(); const u=new SpeechSynthesisUtterance((cookKrok+1)+". "+(cookKroky[cookKrok]||"")+(mn?". "+mn:"")); u.lang="sk-SK"; u.rate=0.95; speechSynthesis.speak(u); }catch(e){} }
// Posledné „✓ Hotovo": zápis do histórie musí byť vidieť — pri prázdnej špajzi sa dovtedy
// varenie len ticho zavrelo.
async function krok(d){ if(d>0 && cookKrok===cookKroky.length-1 && cookBlokIds.length){ const ids=cookBlokIds.slice(), titul=(document.getElementById("cook-title")||{}).textContent||"";
    ids.forEach(oznacUvarene); cookRecept=null; cookBlokIds=[]; zavriCook(true);
    const rs=ids.map(id=>komponent(id)).filter(r=>r&&!r._priloha);
    if(rs.length && S.spajza.length && await confirmModal("Uvarené! "+sklon(rs.length,"jedlo je zapísané","jedlá sú zapísané","jedál je zapísaných")+" v histórii varenia. Odpísať suroviny zo špajze?","Odpísať zo špajze")){
      const vb=_varenieOdpis||{}; rs.forEach(r=>odpisRecept(r,vb[r.id]&&vb[r.id].porcie,vb[r.id]&&vb[r.id].velkost)); }
    else toast("✅ "+titul.replace(/^\s*[A-C]\s*/,"").replace(/^Varenie bloku/,"Blok")+" — uvarené a zapísané v histórii.");
    vibruj(USPECH); const neohod=rs.filter(r=>!S.hodn[r.id]).map(r=>r.id); if(neohod.length) setTimeout(()=>akoChutilo(neohod),400);
    return; }
  if(d>0 && cookKrok===cookKroky.length-1){ oznacUvarene(cookRecept); const rr=receptById(cookRecept); cookRecept=null; zavriCook(true);
    if(rr && S.spajza.length){ if(await confirmModal("Uvarené! „"+rr.nazov+"“ je zapísané v histórii varenia. Odpísať suroviny zo špajze?","Odpísať zo špajze")) odpisRecept(rr); }
    else toast("✅ Uvarené — „"+(rr?rr.nazov:"jedlo")+"“ je zapísané v histórii varenia.");
    vibruj(USPECH); if(rr && !S.hodn[rr.id]) setTimeout(()=>akoChutilo(rr.id),400);
    return; }
  cookKrok=Math.min(cookKroky.length-1,Math.max(0,cookKrok+d)); ukazKrok(); tik();
  const ct=document.querySelector("#cook .cook-telo"); if(ct){ ct.scrollTop=0; if(_pohyb()){ ct.classList.remove("krok-vstup","spat"); void ct.offsetWidth; ct.classList.add("krok-vstup"); if(d<0) ct.classList.add("spat"); } } }
// Escape, Späť aj „✕ Koniec" zahodili bežiace časovače bez varovania. `bezOtazky` = dovarené.
async function zavriCook(bezOtazky){ const el=document.getElementById("cook"); if(!el.classList.contains("open"))return;
  const bezi=casovace.filter(c=>c.left>0).length;
  if(bezi && !bezOtazky && !await confirmModal("Bežia časovače ("+bezi+"). Ukončiť varenie a vypnúť ich?","Ukončiť varenie")) return;
  _odchodDuch("cook"); el.classList.remove("open"); _zahodHistoriuModalu(); _vratFokus(); casovace=[]; if(casInterval){clearInterval(casInterval);casInterval=null;} renderCasovace(); try{speechSynthesis.cancel();}catch(e){} if(wakeLock){wakeLock.release();wakeLock=null;} }
function oznacUvarene(id){ if(!id)return; S.uvarene.unshift({id:id,datum:isoZDatumu(new Date())}); S.uvarene=S.uvarene.slice(0,30); save(); }
// Príloha nie je recept a nedá sa rozkliknúť — gramáž aj postup preto musí niesť sama,
// inak sa používateľ z plánu nedozvie ani koľko ryže dať variť, ani ako dlho.
const PRILOHY = {
 "prf:ryza":{nazov:"Ryža (príloha)", ing:{nazov:"Ryža",mnozstvo:60,jednotka:"g"},
   postup:["Ryžu prepláchni v studenej vode, kým voda neostane číra.","Zalej 1,5-násobkom vody (na každých 100 g ryže 150 ml), osoľ a priveď do varu.","Prikry a var na miernom ohni 12–15 min, kým sa voda nevsiakne. Potom nechaj 5 min odstáť pod pokrievkou.","Ryžu na ďalšie dni rozlož na plech, nech do hodiny vychladne, a hneď ju daj do chladničky (max. 3 dni). Ohrievaj do horúca."]},
 "prf:zemiaky":{nazov:"Zemiaky (príloha)", ing:{nazov:"Zemiaky",mnozstvo:250,jednotka:"g"},
   postup:["Zemiaky ošúp a nakrájaj na rovnako veľké kusy.","Zalej studenou osolenou vodou a var 20–25 min domäkka (nôž prejde bez odporu).","Vodu zleji a nechaj chvíľu odpariť."]},
 "prf:cestoviny":{nazov:"Cestoviny (príloha)", ing:{nazov:"Cestoviny",mnozstvo:80,jednotka:"g"},
   postup:["Na každých 100 g cestovín daj variť 1 l vody a 10 g soli.","Cestoviny var podľa obalu al dente, zvyčajne 8–11 min.","Pred zliatím si odlož hrnček vody z varenia — ňou sa riedi omáčka."]},
 "prf:pecivo":{nazov:"Pečivo", ing:{nazov:"Bageta",mnozstvo:80,jednotka:"g"},
   postup:["Pečivo kupuj čerstvé a krájaj až v deň jedenia — do zásoby sa nepripravuje.","Bagetu nakrájaj na hrubšie plátky.","Voliteľne opeč 3–4 min v hriankovači alebo na suchej panvici."]},
 "prf:salat":{nazov:"Zeleninový šalát", ing:{nazov:"Paradajky",mnozstvo:120,jednotka:"g"},
   postup:["Šalát priprav až v deň jedenia — nakrájané paradajky do druhého dňa pustia vodu.","Paradajky umy a nakrájaj na kúsky.","Zamiešaj s lyžicou olivového oleja, kvapkou octu, soľou a čerstvo mletým korením."]},
 // A3: polievka a šalát ako hlavné jedlo potrebujú doplnok, inak vyjde večera na 150 kcal
 "prf:bielkovina":{nazov:"Kuracie prsia (doplnok)", ing:{nazov:"Kuracie prsia",mnozstvo:120,jednotka:"g"},
   postup:["Kuracie prsia osoľ a okoreň.","Opekaj na lyžici oleja 5–6 min z každej strany, kým nie sú vnútri celkom biele (74 °C). Pri väčšom množstve po častiach, aby sa panvica nepreplnila — inak sa mäso dusí.","Nechaj 3 min odpočívať a nakrájaj na plátky."]},
 "prf:bielkovina_veg":{nazov:"Cottage syr (doplnok)", ing:{nazov:"Cottage syr",mnozstvo:150,jednotka:"g"},
   postup:["Cottage syr vyklop k jedlu, osoľ a okoreň. Nevarí sa."]},
 // Náhrady, keď základná príloha neprejde diétou (bez lepku / bez mlieka) — `prilohaPre` ich skúša v poradí.
 "prf:vajcia":{nazov:"Vajcia natvrdo (doplnok)", ing:{nazov:"Vajcia",mnozstvo:2,jednotka:"ks"},
   postup:["Vajcia vlož do vriacej vody a var 9–10 min.","Zlej, zalej studenou vodou, ošúp a rozkroj. V chladničke vydržia 3 dni."]},
 "prf:zelenina":{nazov:"Zeleninové tyčinky", ing:{nazov:"Mrkva",mnozstvo:120,jednotka:"g"},
   postup:["Mrkvu ošúp a nakrájaj na tyčinky. Pridať môžeš aj uhorku alebo papriku."]}
};
function komponent(id){ if(typeof id==="string" && id.indexOf("prf:")===0){ const p=PRILOHY[id]; if(!p)return null; return {id:id,nazov:p.nazov,kategoria:"Príloha",kuchyna:"",porcie:1,ingrediencie:[p.ing],postup:(p.postup||[]).slice(),_priloha:true}; }
  if(typeof id==="string" && id.indexOf("left:")===0){ const r=receptById(id.slice(5)); if(!r)return null; return Object.assign({},r,{id:id,_left:true,_srcId:r.id}); } // zvyšok: ráta do kcal, nie do nákupu
  return receptById(id); }
function slotIds(di,slot){ const v=(S.plan[datumPre(di)]||{})[slot]; if(!v)return []; return Array.isArray(v)?v.slice():[v]; }
// A4: sacharid hľadáme aj v NÁZVE receptu a poznáme tvary cestovín/pečiva — inak „Pizza Margherita"
// (múka, voda, droždie) a 39 z 89 receptov kategórie Cestoviny prešlo ako „bez sacharidu" a dostali ryžu.
function maCarb(r){ if(!r) return false; if(r.kategoria==="Cestoviny") return true;
  const s=bezDia((r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" "));
  return /quiche|calzon|galett|kolac|arep|empanad|cesto\b|lístkov\w* cest|listkov\w* cest|ryz|zemiak|cestovin|spaget|linguin|rezanc|tarhon|kuskus|bulgur|quinoa|chlieb|baget|tortill|rozok|zeml|nudl|halusk|knedl|pecivo|penne|rigatoni|fusilli|farfalle|orzo|tagliatell|bucatini|lasagne|gnocchi|pizza|taco|burrito|wrap|burger|sendvic|panini|toast|pita|plack|kasa|krupic|polenta|ovsen|granola|batat|musli|bagel|focacc|risott|pirohy|strapack|krup|pohan|palacink|lievan|ciabatt|flia[cč]k/.test(s); }
// A3: vráti prílohu pre hlavný chod (token `prf:` alebo id receptu z kategórie Príloha), alebo null.
// Polievka dostane pečivo, šalát bielkovinu. `pouzite` (voliteľné): recept-príloha, ktorý už v týždni
// je, sa preskočí — platí preň to isté „bez opakovania vareného receptu naprieč blokmi" ako pre
// hlavné jedlá. `prf:` v `pouzite` nikdy nie je, takže sa vždy niečo nájde.
// Diéta platí aj na prílohu (audit 8. 10.): pri „Bez lepku" dostalo 10–20 % jedál bagetu alebo
// cestoviny, pri „Bez mlieka" cottage — `prf:` tokeny profilom neprechádzali vôbec.
function prilohaPre(r,rot,pouzite){ if(!r) return null; const d=_prilohaDruh(r);
  if(!d) return null;
  if(Array.isArray(d)){ const mix=vegPodiel()>0; return d.find(t=>!(mix&&t==="prf:bielkovina")&&_prilohaPrejde(t))||null; }
  const moz=prilohyPreKuchynu(d), n=moz.length, i0=(rot||0)%n;
  for(let j=0;j<n;j++){ const t=moz[(i0+j)%n];
    if(t.indexOf("prf:")===0){ if(_prilohaPrejde(t)) return t; continue; }
    if(!(pouzite&&pouzite.has(t)) && _prilohaPrejde(t)) return t; }
  return moz.find(_prilohaPrejde)||null; }
// Pečivo k nátierke; bez lepku zeleninové tyčinky.
function natierkaPriloha(){ return ["prf:pecivo","prf:zelenina"].find(_prilohaPrejde)||null; }
// D1: druh prílohy závisí len od receptu, takže sa cachuje natrvalo (ako `_memoMaso`). Od receptov-príloh
// je `prilohaPre` v kľúči cache generátora a volá sa pri každom dopyte na výživu jedla.
// Výsledok: null (sacharid už má) | pole `prf:` tokenov (prvý, ktorý prejde diétou) | skupina kuchyne.
// Šalát dostane bielkovinu len keď jej má sám málo (< 20 g/porcia) — Niçoise s tuniakom a vajcom
// dostával ešte kuracie prsia (38 z 61 mäsitých šalátov).
const _memoPrilDruh=new Map();
// kolo 7 (diabetik): jedlo, ktoré má samo ≥ 35 g sacharidov (strukoviny: cícer, šošovica, fazuľa), dostane pri 🩺 len zeleninu
function _prilohaDruh(r){ const mk=r.id+(S.profil.diabetes?"|d":""); let v=_memoPrilDruh.get(mk); if(v!==undefined) return v;
  v=!isMain(r)?null:r.kategoria==="Polievka"?(S.profil.diabetes&&(vyzivaReceptu(r).s||0)>=20?null:["prf:pecivo"])
    :r.kategoria==="Šalát"?(vyzivaReceptu(r).b>=20?null:diety(r).veg?["prf:bielkovina_veg","prf:vajcia"]:["prf:bielkovina","prf:bielkovina_veg","prf:vajcia"])
    :maCarb(r)?null:(S.profil.diabetes&&(vyzivaReceptu(r).s||0)>=35)?["prf:zelenina"]
    :/sakshuk|shakshou|s(h)?aks(h)?o?uk|huevos|omelet|frittat|vajic\w* na|vajcia na|prazenic/.test(bezDia(r.nazov||""))?["prf:pecivo","prf:zelenina"]:kuchynaPrilohy(r.kuchyna);
  _memoPrilDruh.set(mk,v); return v; }
function potrebujePrilohu(r){ return !!prilohaPre(r,0); }
function mealKcal(compArr){ return (compArr||[]).reduce((a,id)=>a+kcalPorcia(komponent(id)),0); }
// A1: faktor je už len jemné dorovnanie (±15 %). Cieľ sa trafí výberom jedla, nie tým,
// že zjeme dve porcie melónového šalátu.
const FAKTOR_MIN=0.85, FAKTOR_MAX=1.15;
// v34 (8. 10. 2026): veľkosť porcie má KAŽDÉ JEDLO zvlášť, nie jeden faktor na celý deň/blok.
// Generátor vyberá jedlá pre rozumný deň (`genCiel`, 1300–2100 kcal) a cieľ mimo neho dorovná
// porciami — pri 2500 kcal sa inak brali 1000-kcal burgre a 71 % týždňov malo > 500 g červeného mäsa.
// Každé jedlo sa posunie k svojmu podielu dňa (√ — polovica cesty, nech sýte jedlo ostane sýte),
// potom sa deň dorovná na cieľ. Snack je kúpené balenie — ten sa neškáluje (1 kus = 1 porcia).
const GEN_KCAL_MIN=1300, GEN_KCAL_MAX=2100, FAKTOR_SLOT_MIN=0.7, FAKTOR_SLOT_MAX=1.5;
function genCiel(ciel){ if(!(ciel>0) || !(S.genCfg&&S.genCfg.cielMode)) return ciel;
  const g=Math.min(Math.max(ciel,GEN_KCAL_MIN),GEN_KCAL_MAX);
  return Math.min(Math.max(g,ciel/(FAKTOR_SLOT_MAX*0.93)),ciel/(FAKTOR_SLOT_MIN*1.07)); }
const _PORADIE=["Obed","Večera","Raňajky","Snack"];
function _poradieOk(napl,kc){ const p=_PORADIE.filter(s=>napl.includes(s));
  for(let i=0;i+1<p.length;i++){ const a=kc(p[i]), b=kc(p[i+1]); if(i===0&&p[i]==="Obed"&&p[1]==="Večera"?a<b:a<=b) return false; } return true; }
function faktorySlotov(denPlan,sloty,ciel){ const k={}, f={};
  sloty.forEach(s=>{ if(denPlan[s]&&denPlan[s].length){ const x=mealKcal(denPlan[s]); if(x>0)k[s]=x; } });
  const napl=sloty.filter(s=>k[s]>0); if(!(ciel>0)||!napl.length) return f;
  const zmen=napl.filter(s=>!jeSnackSlot(s)), fix=napl.filter(s=>jeSnackSlot(s)).reduce((a,s)=>a+k[s],0);
  const cl=x=>Math.max(FAKTOR_SLOT_MIN,Math.min(FAKTOR_SLOT_MAX,x));
  napl.forEach(s=>{ f[s]=jeSnackSlot(s)?1:cl(Math.sqrt(cielSlotu(s,napl,ciel)/k[s])); });
  for(let i=0;i<6;i++){ const v=zmen.reduce((a,s)=>a+k[s]*f[s],0); if(!(v>0)) break;
    const m=(ciel-fix)/v; if(Math.abs(m-1)<0.003) break; zmen.forEach(s=>{ f[s]=cl(f[s]*m); }); }
  zmen.forEach(s=>{ f[s]=Math.round(f[s]*20)/20; });
  if(!_poradieOk(napl,s=>k[s]*f[s])){ // poradie O ≥ V > R > S musí platiť aj po škálovaní — inak jeden faktor
    const v=zmen.reduce((a,s)=>a+k[s],0), u=v>0?Math.round(cl((ciel-fix)/v)*20)/20:1; zmen.forEach(s=>{ f[s]=u; }); }
  return f; }
// Po dňoch (2. kolo: deň s výnimkou v bloku dostal faktory prvého dňa a mal 128 % cieľa) × ručná voľba.
// Bez „Dorovnať na cieľ" sa automatika nepočíta a mení sa len slot s ručnou voľbou.
function rescaleDen(dni){ const auto=!!(S.genCfg&&S.genCfg.cielMode)&&(S.profil.kcal||0)>0;
  dni.forEach(d=>{ const iso=datumPre(d), sl=slotyDna(d); let fs={};
    if(auto && baseDayKcal(d)>0){ const dp={}; sl.forEach(s=>{ const ids=slotIds(d,s); if(ids.length) dp[s]=ids; }); fs=faktorySlotov(dp,sl,cielDna(d)); }
    SLOTY().forEach(s=>{ if(!slotIds(d,s).length)return; const m=rucnyMult(d,s); if(!auto && m===1) return;
      const fac=Math.round((fs[s]||1)*m*100)/100;
      if(fac!==1){ S.planF[iso]=S.planF[iso]||{}; S.planF[iso][s]=fac; } else if(S.planF[iso]) delete S.planF[iso][s]; }); }); }
// Faktor jedla (automatika × ručná voľba). Nečíselná hodnota zo synchronizácie/zálohy = 1, nie NaN v celom dni.
function pf(di,slot){ const d=S.planF[datumPre(di)], v=+(d&&d[slot]); return (v>0&&isFinite(v))?v:1; }
// Ručná voľba veľkosti porcie (S.planM, násobok automatiky) — platí na celý blok a prepočet ju nezmaže.
function rucnyMult(di,slot){ const d=S.planM&&S.planM[datumPre(di)], v=+(d&&d[slot]); return (v>0&&isFinite(v))?Math.min(2,Math.max(0.5,v)):1; }
function pfAuto(di,slot){ return pf(di,slot)/rucnyMult(di,slot); }
function stravniciList(){ const l=S.profil.stravnici; if(Array.isArray(l)&&l.length)return l; const o=S.profil.osoby||1,arr=[]; for(let i=0;i<o;i++)arr.push({nazov:i===0?"Ja":("Osoba "+(i+1)),kcal:S.profil.kcal||CIEL_DEF}); return arr; }
function baseDayKcal(di){ let s=0; slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(cid=>{const k=komponent(cid); if(k)s+=kcalPorcia(k);})); return s; }
function pocetPorcii(di){
  const st=stravniciList(), n=st.length, base=baseDayKcal(di);
  if(!(base>0)) return n;
  // B8: dorovnávanie viazané na prepínač „Dorovnať dni na cieľ", nie na magickú hranicu 200 kcal
  // (predtým 175 kcal → 1 porcia, 222 kcal → 6,53 porcie = 7× drahší nákup)
  if(!(S.genCfg&&S.genCfg.cielMode)) return n;
  const naplnene=slotyDna(di).filter(sl=>slotIds(di,sl).length).length;
  if(naplnene<2) return n; // jedno jedlo ešte nie je celý deň — nedorovnávaj ho na denný cieľ
  const dopyt=st.reduce((a,p)=>a+(p.kcal||S.profil.kcal||CIEL_DEF),0)*podielDna(di);
  return Math.min(n*2, dopyt/base); } // B8: strop = 2× počet stravníkov
function mnozMult(di,slot){ return porcieSlot(di,slot)*pf(di,slot); }
function tyzdenProfil(){ return S.tyzdenProfil&&S.tyzdenProfil[S.viewOd]; }
function tyzdenProfilEd(){ S.tyzdenProfil[S.viewOd]=S.tyzdenProfil[S.viewOd]||{ludia:null,prec:[]}; return S.tyzdenProfil[S.viewOd]; }
function nastavTyzdenLudia(v){ const tp=tyzdenProfilEd(); const n=parseInt(v); tp.ludia=(n>0)?n:null; save(); }
function toggleTyzdenPrec(di){ const tp=tyzdenProfilEd(); const i=(tp.prec||[]).indexOf(di); if(i>=0)tp.prec.splice(i,1); else (tp.prec=tp.prec||[]).push(di); save(); renderGenWizard(); }
function slotyDna(di){ const tp=tyzdenProfil(); if(tp&&(tp.prec||[]).includes(di))return [];
  const v=S.daySloty&&S.daySloty[datumPre(di)]; if(Array.isArray(v)) return VSETKY_SLOTY.filter(s=>v.includes(s));
  const m=mimoSloty(); return (m.size&&di<5)?SLOTY().filter(s=>!m.has(s)):SLOTY(); }
// „Jem mimo domu" (študent, rodič): jedlo, ktoré sa v pracovné dni je v práci/škole/menze. Na rozdiel od
// vypnutého slotu sa jeho podiel z dňa NEpresúva do ostatných jedál — o toľko sa zníži cieľ dňa aj nákup.
// Do v34 menza znamenala 2200 kcal natlačených do troch jedál.
// Kolo 3: „mimo domu" je na STRAVNÍKOVI (p.mimo = "Obed|Snack"). S.profil.mimo je staršia voľba pre celú domácnosť
// a platí pre toho, kto vlastnú nemá. Slot z pracovného dňa zmizne, len keď je mimo domu KAŽDÝ; inak ostane
// a jeho porcie sa zmenšia o tých, čo sú preč (vahaPritomnych). Do kola 3 „Peter má menzu" vypol obed celej rodine.
function mimoOsoby(p){ const v=(p&&typeof p.mimo==="string")?p.mimo:(S.profil.mimo||""); return new Set(v.split("|").filter(Boolean)); }
function mimoSloty(){ let m=null; stravniciList().forEach(p=>{ const x=mimoOsoby(p); m=m?new Set([...m].filter(s=>x.has(s))):x; }); return m||new Set(); }
function jeDomaVSlote(p,di,slot){ return !(di<5&&mimoOsoby(p).has(slot)); }
function mimoMena(di,slot){ return di>=5?[]:stravniciList().filter(p=>mimoOsoby(p).has(slot)).map(p=>p.nazov||"?"); }
function vahaPritomnych(di,slot){ if(di>=5||slot===undefined) return 1; const l=stravniciList(), d=l.filter(p=>!mimoOsoby(p).has(slot)); if(d.length===l.length||!d.length) return 1;
  if(!_autoPorcie(di)) return d.length/l.length; const s=l.reduce((a,p)=>a+(+p.kcal||0),0); return s>0?d.reduce((a,p)=>a+(+p.kcal||0),0)/s:d.length/l.length; }
function _podiel(m,di){ if(!m.size||di>=5) return 1; const vs=SLOTY();
  const sum=vs.reduce((a,s)=>a+(SLOT_PODIEL[s]||0.1),0), von=vs.filter(s=>m.has(s)).reduce((a,s)=>a+(SLOT_PODIEL[s]||0.1),0);
  return sum>0?Math.max(0.2,1-von/sum):1; }
function podielDna(di){ return _podiel(mimoSloty(),di); }
function podielOsoby(p,di){ return _podiel(mimoOsoby(p),di); }
function cielDna(di){ return Math.round((S.profil.kcal||0)*podielDna(di)); }
// % veľkosti porcie (rescaleDen) už nesie kcal-korekciu, preto sa ním delí — inak by pôsobila 2×
// (v pocetPorcii aj v pf). B9: delí sa vo VŠETKÝCH vetvách, aj pri ručnom počte ľudí —
// predtým „4 ľudia × 80 %" navarilo 3,2 porcie pre 4 ľudí.
function pocetPorciiDna(di,slot){
  const f=(slot!==undefined)?pf(di,slot):1;
  const n=S.dayPpl&&S.dayPpl[datumPre(di)]; if(n>0)return n/f;
  const tp=tyzdenProfil(); if(tp&&tp.ludia>0)return tp.ludia/f;
  // v34: pri automatickom dorovnaní sa delí PRIEMERNÝM faktorom dňa (váženým kcal), nie faktorom slotu.
  // Pri rovnakom faktore je to to isté ako doteraz; pri rôznych dostane každé jedlo množstvo úmerné
  // svojmu faktoru a deň spolu ostane presne dopyt domácnosti (D7).
  return pocetPorcii(di)/(_autoPorcie(di)?priemernyFaktorDna(di):f)*vahaPritomnych(di,slot); }
function _autoPorcie(di){ return !!(S.genCfg&&S.genCfg.cielMode) && baseDayKcal(di)>0 && slotyDna(di).filter(sl=>slotIds(di,sl).length).length>=2; }
function priemernyFaktorDna(di){ let k=0,kf=0; slotyDna(di).forEach(sl=>{ const x=mealKcal(slotIds(di,sl)); k+=x; kf+=x*pfAuto(di,sl); }); return k>0?kf/k:1; } // ručne väčšia porcia nezmenší ostatné jedlá dňa
function porcieSlot(di,slot){ const d=S.slotPpl&&S.slotPpl[datumPre(di)]; const o=d&&d[slot]; return (o>0)?(o/pf(di,slot)):pocetPorciiDna(di,slot); }
// ponytail: hrubá heuristika mäsa (bez NLP) — na "nie 2× rovnaké mäso za sebou"; morčacie spadá pod hydinu
// D1: memo. `masoTyp` aj `ranajkyBaza` púšťajú 5–13 regexov cez spojené názvy surovín a volajú
// sa pri KAŽDEJ výmene slotu (a od opravy stopy aj pri každom vrátení). Výsledok závisí len od
// receptu, takže sa cachuje natrvalo do `_memoBaza`/`_memoMaso`.
const _memoMaso=new Map(), _memoBaza=new Map();
function masoTyp(r){ if(!r)return ""; const mk=_memoMaso.get(r.id); if(mk!==undefined)return mk;
  const v=_masoTypVypocet(r); _memoMaso.set(r.id,v); return v; }
function _masoTypVypocet(r){ const s=bezDia((r.ingrediencie||[]).map(i=>i.nazov).join(" ")+" "+(r.nazov||""));
  if(/\bkura\b|kurac|kurca|kurci|slepac|sliepk|morcac|moriak|hydin/.test(s))return "hydina";
  if(/losos|tuniak|treska|\bryb(a|y|ac|ie|i\b)|kreveta|garnat|makrela|pstruh|sardin|krabie/.test(s))return "ryby";
  if(/bravc|slanin|sunk|klobas|parok|panenk|prosciutto/.test(s))return "bravcove";
  if(/hovadz|steak|rostenk|svieckov/.test(s))return "hovadzie";
  return ""; }
// Koľko CELÝCH porcií tohto slotu sa naraz varí (v bloku sa varí raz na celý blok).
// Jeden zdroj pravdy pre detail receptu aj nákupný zoznam — inak detail počíta so zaokrúhleným
// počtom porcií (5) a nákup s nezaokrúhleným (4,69) a množstvá si nesedia.
// B7: deň „preč" (alebo deň bez tohto slotu) sa do porcií nepočíta — inak blok Po–Ut s dovolenkou
// v utorok navarí 4 porcie namiesto 2 a nákup je rovnako drahý ako bez dovolenky.
// Jedlo sa v bloku varí RAZ, aj keď je v ňom viackrát: jeden hrniec (obed aj večera), obed mimo domu
// (obed len cez víkend, teda nie v prvom dni bloku). Porcie sa sčítajú po slotoch rovnako ako v nákupe
// (porcieSlotBlok × pf), takže plán varenia, varenie bloku, detail aj rozdelenie hrnca sedia s nákupom.
// Kolo 3 (kuchár, QA): brali len prvý deň a prvý slot → jeden hrniec navaril polovicu, víkendový obed chýbal.
function varenieBloku(dni){ const out=[], m={};
  dniDoma(dni).forEach(d=>slotyDna(d).forEach(sl=>slotIds(d,sl).forEach(cid=>{ const k=komponent(cid); if(!k) return;
    let x=m[cid]; if(!x){ x=m[cid]={k,cid,d0:d,sl0:sl,sloty:[],por:0,porN:0,min:k._priloha?parseCasSek((k.postup||[]).join(" "))/60:(casMin(k)%999)}; out.push(x); }
    if(x.sloty.includes(sl)) return; x.sloty.push(sl); const n=porcieSlotBlok(d,sl,cid); x.porN+=n; x.por+=n*pf(d,sl); })));
  return out; }
function porcieSlotBlok(di,slot,cid){ const dni=denyBloku(di).filter(d=>slotyDna(d).includes(slot) && (cid==null||slotIds(d,slot).includes(cid)));
  return Math.max(1,Math.round((dni.length?dni:[di]).reduce((a,d)=>a+porcieSlot(d,slot),0))); }
function jeSendvic(r){ const b=ranajkyBaza(r); if(["tortilla","bageta","toast","rožok","bagel"].includes(b))return true; const t=(r.tagy||[]).join(" ").toLowerCase(); return t.includes("wrap")||t.includes("sendvič")||t.includes("sendvic"); }
// Faktor veľkosti porcie (0,85–1,15) sa v bunke plánu MUSÍ pomenovať. Holé „110 %" vedľa kcal
// nikto nevysvetlí a jediné vysvetlenie bolo v title, teda na telefóne nedosiahnuteľné.
// v34: faktor má skoro každé jedlo (porcie sa delia podľa podielu dňa) — „porcie 130 %" bol žargón v každej bunke.
function fmtPct(f){ return Math.abs(f-1)<0.145?"":(f>1?" · väčšia porcia":" · menšia porcia"); }
function planItems(){ const out=[]; for(let di=0;di<7;di++){ slotyDna(di).forEach(sl=>{ slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)out.push({r,cid,di,slot:sl,f:pf(di,sl)}); }); }); } return out; }
function planovaneRecepty(){ return planItems().map(x=>x.r); }
function applyVzhlad(){ document.body.classList.toggle("big",!!S.profil.big);
  // Tri stavy: „podľa systému" (temaAuto) nedá na <body> ANI JEDNU triedu, takže rozhoduje
  // @media(prefers-color-scheme:dark){ body:not(.svetla) } — a rozhoduje aj po reštarte,
  // aj keď si používateľ prepne tému telefónu neskôr. Výslovná voľba pečiatkuje
  // `dark` alebo `svetla` a tým systém prebije.
  const auto = S.profil.temaAuto !== false;
  document.body.classList.toggle("dark",   !auto && !!S.profil.dark);
  document.body.classList.toggle("svetla", !auto && !S.profil.dark);
  const pal=PALETY.some(p=>p[0]===S.profil.paleta)&&S.profil.paleta!=="teply"?S.profil.paleta:"";
  if(pal) document.documentElement.dataset.paleta=pal; else delete document.documentElement.dataset.paleta;
  const pis=PISMA.some(p=>p[0]===S.profil.pismo)&&S.profil.pismo!=="moderne"?S.profil.pismo:"";
  if(pis) document.documentElement.dataset.pismo=pis; else delete document.documentElement.dataset.pismo;
  renderPalety(); // náhľady tém podľa práve zobrazenej svetlej/tmavej
  applyRezim(); nastavAkcent(); }
// Farebné témy (kolo 4): [kľúč, meno, vzorka zem/doska/tint/text]. CSS je v dizajn/tema-bloky.css (data-paleta na <html>).
// Vzorka = [podklad, karta, tón, text] svetlej a tmavej sady — náhľad ukazuje tú, ktorá sa práve zobrazuje.
const PALETY=[["teply","Teplý stôl",["#F2EEE7","#FFFFFF","#E9E4DA","#1E1B16"],["#1A1815","#24211C","#2F2B25","#F0EBE1"]],
  ["salvia","Šalvia",["#E3EBE0","#FBFDFA","#D3DFD0","#18201A"],["#0D1C12","#172A1D","#22382A","#E7EFE5"]],
  ["more","More",["#E1E9F1","#FBFDFF","#CFDBE7","#15202A"],["#0C1722","#152435","#1F3248","#E5ECF2"]],
  ["levandula","Levanduľa",["#EAE3F1","#FDFBFF","#DCD1E8","#1F1A25"],["#17111F","#231A30","#30253F","#EEE9F3"]],
  ["kontrast","Vysoký kontrast",["#FFFFFF","#FFFFFF","#EBEBEB","#000000"],["#000000","#0D0D0D","#1F1F1F","#FFFFFF"]]];
// Písmo (kolo 4): [kľúč, meno, rodina nadpisu na vzorku, popis]. CSS: data-pismo na <html>, tokeny --pismo-*.
const PISMA=[["moderne","Moderné","Archivo","čisté, výrazné nadpisy"],["kucharka","Kuchárka","Lora","nadpisy ako v knihe receptov"],["zaoblene","Zaoblené","Nunito","mäkké, priateľské"]];
function jeTmava(){ const b=document.body; return b.classList.contains("dark")||(!b.classList.contains("svetla")&&!!(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)); }
// Kolo 6 (prístupnosť): mení sa len „checked" a farby náhľadu — prekreslenie innerHTML pri zmene vyhodilo fokus
// zo skupiny rádií, takže šípkami sa dalo prejsť len o jednu voľbu.
function renderPalety(){ const pb=document.getElementById("pisma-box");
  if(pb){ const ap=S.profil.pismo||"moderne";
    if(pb.children.length===PISMA.length) PISMA.forEach(([k])=>{ const i=document.getElementById("p-pismo-"+k); if(i) i.checked=k===ap; });
    else pb.innerHTML=PISMA.map(([k,m,f,o])=>'<label class="paleta pismo"><input type="radio" name="p-pismo" id="p-pismo-'+k+'" value="'+k+'"'+(k===ap?" checked":"")+'><span class="pismo-vzor" style="font-family:\''+f+'\',serif" aria-hidden="true">Šš</span><span class="pismo-txt"><b style="font-family:\''+f+'\',serif">'+m+'</b><small class="info">'+o+'</small><span class="pismo-ukazka" style="font-family:\''+f+'\',serif" aria-hidden="true">Šošovicový guláš</span></span></label>').join(""); }
  const box=document.getElementById("palety-box"); if(!box) return; const akt=S.profil.paleta||"teply";
  const tm=jeTmava();
  if(box.children.length===PALETY.length&&box.dataset.tm===String(tm)){ PALETY.forEach(([k])=>{ const i=document.getElementById("p-paleta-"+k); if(i) i.checked=k===akt; }); return; }
  const vb=document.getElementById("velkost-box"); if(vb&&!vb.children.length){ const akr=REZIMY.includes(S.profil.rezim)?S.profil.rezim:"plan";
    vb.innerHTML=REZIMY.map(r=>{ const [nz,po]=REZIM_POPIS[r]||[r,""]; return `<button type="button" class="viac-rezim${r===akr?" on":""}" data-rezim="${r}" aria-pressed="${r===akr}" onclick="nastavRezim('${r}')"><b>${nz}</b><small>${po}</small></button>`; }).join(""); }
  box.dataset.tm=String(tm); box.innerHTML=PALETY.map(([k,m,sv,td])=>{ const v=tm?td:sv; return '<label class="paleta"><input type="radio" name="p-paleta" id="p-paleta-'+k+'" value="'+k+'"'+(k===akt?" checked":"")+'><span class="vzorka" aria-hidden="true">'
    +v.map(x=>'<i style="background:'+x+'"></i>').join("")+'</span>'+m+'</label>'; }).join(""); }

/* ── Režimy hustoty (koncepcia B) ──────────────────────────────────────────
   Štyri fyzické situácie, nie štyri appky: Kompakt 0,82/44 px · Plánovanie 1,0/44 px ·
   Obchod 1,22/56 px · Kuchyňa 1,5/64 px. Menia tokeny --skala a --cil na <html>; --skala zväčšuje obsah
   (.content a .modal majú zoom:var(--skala)), --cil dvíha dotykové ciele.
   Kuchyňa NEPREBÍJA režim varenia — dopĺňa ho: varenie sa otvára ako doteraz,
   len všetko okolo neho je väčšie. Voľba žije v S.profil.rezim a prežije reload. */
const REZIMY=["plan","obchod"]; // CSS pozná aj kompakt/kuchyna (staré stavy, testy), ponúkajú sa len dva
function applyRezim(){ const r=REZIMY.includes(S.profil.rezim)?S.profil.rezim:"plan";
  document.documentElement.setAttribute("data-rezim",r);
  document.querySelectorAll("#rezimy button,#velkost-box button").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.rezim===r)); if(b.classList.contains("viac-rezim")) b.classList.toggle("on",b.dataset.rezim===r); }); }
function nastavRezim(r){ if(!REZIMY.includes(r))r="plan"; tik();
  S.profil.rezim=r; save(); const a=document.activeElement, y0=a&&a!==document.body?a.getBoundingClientRect().top:null;
  _plynule(()=>{ applyRezim(); if(y0!=null&&a.isConnected){ const y1=a.getBoundingClientRect().top; if(Math.abs(y1-y0)>4) scrollBy(0,y1-y0); } });
  toast(r==="obchod"?"🔠 Veľké písmo a tlačidlá.":"Normálne písmo."); }

/* Blok = farba. Akcent je farba bloku, v ktorom sa práve nachádzam; token sa prepisuje
   na <body>, takže všetko, čo píše var(--accent) (aj inline štýly v app.js), sa prefarbí samo.
   NIE na <html>: var(--blok-b) by sa tam vyhodnotil zo SVETLEJ sady (tmavá ju prepisuje až
   na body) a tlačidlo, fokus aj odkazy mali v tmavej téme 2,15–2,4:1. */
const BLOK_TRIEDY=["blok-a","blok-b","blok-c"];
function dnesDi(){ return (new Date().getDay()+6)%7; }
function blokTrieda(bi){ return BLOK_TRIEDY[((bi%3)+3)%3]; }
function blokPismeno(bi){ return String.fromCharCode(65+bi); }
function blokIndex(di){ const b=bloky(); for(let i=0;i<b.length;i++) if(b[i].indexOf(di)>=0) return i; return 0; }
function znakBloku(bi,titul){ const t=blokTrieda(bi), p=blokPismeno(bi);
  return `<span class="znak ${t}" title="${titul||("Blok "+p)}" aria-label="Blok ${p}">${p}</span>`; }
// Od 8. 10. je akcent neutrálny (tokeny v téme). Funkcia len zmaže inline hodnoty zo starších behov.
function nastavAkcent(){ try{ const st=document.body.style; st.removeProperty("--akcent"); st.removeProperty("--akcent-tlac"); }catch(e){} }

function hraniceInit(){ if(!Array.isArray(S.hranice)||S.hranice.length!==7)S.hranice=[true,false,true,false,false,true,false]; S.hranice[0]=true; }
function bloky(){ hraniceInit(); const out=[]; let cur=null; for(let i=0;i<7;i++){ if(i===0||S.hranice[i]){ cur=[i]; out.push(cur); } else cur.push(i); } return out; }
function blokDni(di){ let start=di; while(start>0 && !S.hranice[start]) start--; const dni=[start]; for(let j=start+1;j<7;j++){ if(S.hranice[j])break; dni.push(j); } return dni; }
function prepniBlok(v){ S.blokMode=v; save(); renderPlan(); }
function denyBloku(di){ return S.blokMode?blokDni(di):[di]; }
// „B (St–Pi)" — ktorého rozsahu sa akcia v bloku týka (hlavička „⋯ viac", ✕ Odobrať, toasty)
function rozsahSlotu(di){ return blokPismeno(blokIndex(di))+" ("+rozsahKratko(blokDni(di))+")"; }
// Prvý deň bloku, v ktorý sa naozaj je doma. Deň „preč" nemá sloty, takže blok, ktorému
// chýba prvý deň, sa nesmie posudzovať podľa neho (🎲 bloku hlásilo „nenašiel som náhradu").
function prvyDenDoma(dni){ const d=dni.find(x=>slotyDna(x).length); return d==null?dni[0]:d; }
function dniDoma(dni){ const d=dni.filter(x=>slotyDna(x).length); return d.length?d:dni; }
// ── 🔒 ZÁMKY ────────────────────────────────────────────────────────────────────
// S.zamky[iso][slot] = id zamknutého jedla. Zamknuté jedlo generátor ani opravné prechody nezmenia
// a 🎲 bloku aj Zamiešať ho preskočia; ručná zmena (✎ zmeniť, ⋯ viac → 🎲) ostáva dovolená.
// Zámok drží ID, nie slot: keď v slote stojí iné jedlo (ručná zmena, vyprázdnenie, načítaný
// jedálniček), zámok neplatí — inak by sa po „Vyprázdniť" zamklo jedlo, ktoré generátor len vybral.
function jeZamknute(di,slot){ const z=S.zamky&&S.zamky[datumPre(di)], id=slotIds(di,slot)[0];
  return !!(z && id && z[slot]===id); }
function prepniZamok(di,slot){ const zap=!jeZamknute(di,slot);
  denyBloku(di).forEach(d=>{ const iso=datumPre(d), id=slotIds(d,slot)[0];
    if(zap){ if(!id)return; if(!jeObjekt(S.zamky[iso])) S.zamky[iso]={}; S.zamky[iso][slot]=id; }
    else if(jeObjekt(S.zamky[iso])){ delete S.zamky[iso][slot]; if(!Object.keys(S.zamky[iso]).length) delete S.zamky[iso]; } });
  save(); renderPlan();
  const kde=slot+" "+(S.blokMode?rozsahKratko(blokDni(di)):DNI[di]);
  toast(zap?"🔒 "+kde+" je zamknutý — generátor ho nezmení.":"🔓 "+kde+" je odomknutý."); }
function zmenDenPpl(di,delta){ const dni=denyBloku(di); const cur=(S.dayPpl[datumPre(di)]!=null)?S.dayPpl[datumPre(di)]:stravniciList().length; const nova=Math.max(1,cur+delta); dni.forEach(d=>{ S.dayPpl[datumPre(d)]=nova; }); save(); renderPlan(); }
function toggleDenSlot(di,slot){ const dni=denyBloku(di); const akt=slotyDna(di).slice(); const i=akt.indexOf(slot); if(i>=0)akt.splice(i,1); else { akt.push(slot); akt.sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b)); } dni.forEach(d=>{ S.daySloty[datumPre(d)]=akt.slice(); }); save(); renderPlan(); }
async function upravSlotPorcie(di,slot){ const cur=Math.round(porcieSlot(di,slot)); const v=await promptModal("Koľko porcií uvariť pre celú domácnosť? (Necháš prázdne = appka ich ráta sama podľa stravníkov.)",cur,"decimal","Nastaviť"); if(v===null)return; const dni=denyBloku(di); if(v.trim()===""){ dni.forEach(d=>{ const iso=datumPre(d); if(S.slotPpl[iso])delete S.slotPpl[iso][slot]; }); } else { const n=Math.max(1,parseInt(v)||cur); dni.forEach(d=>{ const iso=datumPre(d); S.slotPpl[iso]=S.slotPpl[iso]||{}; S.slotPpl[iso][slot]=n; }); } save(); renderPlan(); }

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
function zjednotBloky(){ let zmenene=0; zapamatajTyzden(); // v32: prepisuje dni bloku → ↩ Späť
  bloky().forEach(b=>{ if(b.length<2)return;
    const zdroj=b.find(d=>slotyDna(d).some(s=>slotIds(d,s).length)); if(zdroj==null)return;
    const iso0=datumPre(zdroj); const vzor=S.plan[iso0]||{}; const vzorF=S.planF[iso0]||null;
    b.forEach(d=>{ if(d===zdroj)return; const iso=datumPre(d);
      if(JSON.stringify(S.plan[iso]||{})===JSON.stringify(vzor))return;
      S.plan[iso]=JSON.parse(JSON.stringify(vzor));
      if(vzorF)S.planF[iso]=JSON.parse(JSON.stringify(vzorF)); else delete S.planF[iso];
      zmenene++; }); });
  save(); renderPlan(); if(typeof renderRozvrhDialog==="function"&&document.getElementById("rozvrh-body"))renderRozvrhDialog();
  if(zmenene) toastSpat("Bloky zjednotené — "+sklon(zmenene,"deň prepísaný","dni prepísané","dní prepísaných")+" podľa prvého dňa bloku."); else toast("Bloky už boli jednotné.");
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
function pouziRozvrh(id){ if(id==="denne"){ drzFokus(()=>nastavRozvrh(null,false)); return; }
  const p=ROZVRHY_PRED.find(r=>r.id===id)||(S.rozvrhy||[]).find(r=>("u:"+r.id)===id);
  if(!p)return; drzFokus(()=>nastavRozvrh(p.hranice,true)); }
function toggleHranica(i){ hraniceInit(); if(i<=0||i>6)return; const h=S.hranice.slice(); h[i]=!h[i]; drzFokus(()=>nastavRozvrh(h,true)); }
async function ulozRozvrh(){ hraniceInit();
  const bl=bloky(); const def="Môj rozvrh ("+bl.map(b=>DNI[varnyDen(b[0])].slice(0,2)).join("/")+")";
  const nazov=await promptModal("Názov rozvrhu:",def,"","Uložiť"); if(nazov===null)return;
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
  const upr='<button class="btn rozvrh-upr" onclick="otvorRozvrh()" aria-label="Upraviť rozvrh varenia — kedy varíš a na koľko dní">✎ <span class="tl">Upraviť</span><span class="tl tl-dlhe"> rozvrh</span></button>'
    +'<button class="btn plan-zbal" onclick="prepniRozvrhPas()" aria-expanded="'+(_pasOtvoreny?"true":"false")+'" aria-controls="rozvrh-pas" aria-label="'+(_pasOtvoreny?"Zbaliť":"Rozbaliť")+' podrobnosti rozvrhu varenia"><span aria-hidden="true">'+(_pasOtvoreny?"▴":"▾")+'</span></button>';
  const hlava=nadpis=>'<div class="rozvrh-hlava"><span class="rozvrh-nadpis">🗓️ Rozvrh varenia'+nadpis+'</span>'+upr+'</div>';
  box.className="rozvrh-pas d"+planDen+(_pasOtvoreny?" otvoreny":"");
  if(!S.blokMode){ box.innerHTML=hlava("")
      +'<p class="info" style="margin:7px 0 0">Každý deň zvlášť — každý deň má vlastné jedlá a varí sa nanovo. Ak varíš na viac dní dopredu, zapni bloky v „Upraviť rozvrh“.</p>';
    zpristupniKliky(box); return; }
  const bl=bloky();
  let h=hlava(" · varíš "+bl.length+"× týždenne")
    +'<p class="info" style="margin:7px 0 0">'+rozvrhZhrnutie()+'</p><div class="rozvrh-bloky">';
  bl.forEach((b,idx)=>{ const pism=String.fromCharCode(65+idx);
    h+='<button class="rozvrh-blok '+blokTrieda(idx)+'" data-d="'+b.join(" ")+'" onclick="planVarenia('+b[0]+')" aria-label="'+escHtml(vetaBloku(b))+' Otvoriť plán varenia pre blok '+pism+'">'
      +'<span class="rb-pis" aria-hidden="true">'+pism+'</span><span class="rb-txt"><b>'+escHtml(vetaBloku(b))+'</b>'
      +'<small>'+rozsahKratko(b)+' · '+b.length+(b.length===1?" deň":(b.length<5?" dni":" dní"))+' z jednej várky · plán varenia →</small></span></button>'; });
  h+='</div>'; box.innerHTML=h; zpristupniKliky(box); }
// ── Dialóg „Rozvrh varenia" ──────────────────────────────────────────────────
function otvorRozvrh(){ _rozvrhUndo=null;
  document.getElementById("pick-modal").innerHTML='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>🗓️ Rozvrh varenia</h2><div class="subx">Kedy varíš a na koľko dní vydrží várka.</div></div><div class="content2" id="rozvrh-body"></div>';
  renderRozvrhDialog(); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function otvorRozdelenie(){ otvorRozvrh(); } // stará cesta z menu — nech nikoho nevyhodí
function renderRozvrhDialog(){ const box=document.getElementById("rozvrh-body"); if(!box)return; hraniceInit();
  const akt=aktivnyRozvrhId();
  const riadok=(id,nazov,popis,extra)=>'<div class="rozvrh-riadok"><button class="rozvrh-pred'+(akt===id?" on":"")+'" onclick="pouziRozvrh(\''+id+'\')" aria-pressed="'+(akt===id)+'">'
    +'<span class="rp-ok" aria-hidden="true">'+(akt===id?"✓":"")+'</span><span class="rp-t"><b>'+escHtml(nazov)+'</b><small>'+escHtml(popis)+'</small></span></button>'+(extra||"")+'</div>';
  let h='<h3 class="sekcia">Hotové rozvrhy</h3>';
  ROZVRHY_PRED.forEach(p=>{ const bl2=hraniceNaBloky(p.hranice); h+=riadok(p.id,p.nazov,p.popis+" → "+bl2.map(rozsahKratko).join(" · ")); });
  (S.rozvrhy||[]).forEach(r=>{ const bl2=hraniceNaBloky(r.hranice);
    h+=riadok("u:"+r.id,r.nazov,bl2.map(rozsahKratko).join(" · "),
      '<button class="lnk rozvrh-zmaz" onclick="zmazRozvrh(\''+r.id+'\')" aria-label="Zmazať rozvrh '+escHtml(r.nazov)+'">✕</button>'); });
  h+=riadok("denne","Každý deň zvlášť","Bez blokov — každý deň vlastné jedlo");

  h+='<h3 class="sekcia">Vlastné rozdelenie</h3><p class="info" style="margin:0 0 8px">Ťukni medzi dva dni: <b>✂</b> = tu sa začína nový blok (varíš deň predtým večer), <b>·</b> = dni patria do jedného bloku.</p>';
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
function posunTyzden(delta){ if(document.body.classList.contains("generujem")){ toast("Počkaj, kým dokončím jedálniček."); return; } S.viewOd=pridajDni(S.viewOd,delta*7); try{ localStorage.setItem("kucharka_view_t",String(Date.now())); }catch(e){} save(); prekresliTyzden(); }
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
  // `je-dnes`, nie `dnes` — `.dnes` je panel „Čo variť dnes?" s display:flex a stavový
  // modifikátor by sa naň chytil (prázdny prúžok zmrštený na 0 px).
  box.innerHTML=DNI.map((d,i)=>`<span class="chip${i===planDen?' active':''}${datumPre(i)===dnesISO()?' je-dnes':''}" onclick="planDenNa(${i})" title="${d}${datumPre(i)===dnesISO()?' — dnes':''}">${d.slice(0,2)}</span>`).join("")
    +`<span class="chip" style="cursor:default;background:none;border:none;color:var(--muted)">${fmtD(datumPre(planDen))}</span>`;
  zpristupniKliky(box); }

// B2: prázdny plán neponúkal nič okrem 28× „+ pridať" v bunkách. Povedz, čo sa dá spraviť.
function renderPlanPrazdny(){ const el=document.getElementById("plan-prazdny"); if(!el)return;
  // kolo 4: na telefóne je „✨ Zostaviť" veľké len nad prázdnym týždňom; inak je v ⋯ Viac (CSS body.plan-plny)
  document.body.classList.toggle("plan-plny",!planPrazdnyTyzden());
  if(!planPrazdnyTyzden()){ el.style.display="none"; el.innerHTML=""; return; }
  el.style.display="";
  el.innerHTML='<b>Týždeň '+fmtD(S.viewOd)+'–'+fmtD(pridajDni(S.viewOd,6))+' je prázdny.</b><br>'
    +'<span class="info">Najrýchlejšie: <b>✨ Zostaviť jedálniček</b> vyplní celý týždeň podľa tvojho rozvrhu a kalórií. '
    +'Alebo ťukni <b>+ pridať</b> v bunke a vyber si sám.</span>'
    +'<div class="btn-row" style="margin-top:9px"><button class="btn" onclick="skopirujMinuly()">📋 Skopírovať minulý týždeň</button>'
    +'<button class="btn" onclick="otvorNacitat()">📥 Načítať uložený jedálniček</button></div>';
  zpristupniKliky(el); }
// Jedna bunka plánu. Používa ju tabuľka týždňa (počítač, tlač) AJ blokový zoznam (telefón),
// aby mali obe cesty rovnaký obsah, rovnaké dotykové ciele aj rovnaké správanie pri tlači.
// Vracia samotnú `.plan-cell` — obal (`<td>` alebo `<li>`) si doplní volajúci.
function planBunka(di,slot,menovka){
  // `.pc-slot` je menovka jedla V BUNKE. Na mobile nahrádza celý stĺpec `td.slotname`
  // (88 z 361 px na jedno slovo), na počítači a na papieri je skrytá — tam stĺpec ostáva.
  const slotLbl=`<span class="pc-slot">${menovka||slot}</span>`;
  if(slotyDna(di).indexOf(slot)<0) return di<5&&mimoSloty().has(slot)&&SLOTY().includes(slot)&&slotyDna(di).length
    ? `<div class="plan-cell mimo-domu">${slotLbl}🏢 mimo domu</div>` : `<div class="plan-cell vyp">${slotLbl}vyp.</div>`;
  const ids=slotIds(di,slot); const f=pf(di,slot);
  if(ids.length){ let kc=0, bl=0, sa=0;
        // A8 (WCAG 2.1.1): obsah bunky boli `span onclick` — klávesnicou nedosiahnuteľné. Teraz sú to
        // skutočné <button> (trieda `pc-btn` im zoberie vzhľad tlačidla, štýl ostáva z .nm/.kc/.rm).
        const kde=`${DNI[di]}, ${slot}`;
        const riadky=ids.map((cid,ix)=>{const k=komponent(cid); if(!k)return ""; kc+=kcalPorcia(k); const kn=escHtml(k.nazov).replace(/(\d) (?=(g|ml|kg|l|ks)\b)/g,"$1&nbsp;");
          // Bielkoviny na porciu (`.pc-data`). Cena tu od v31 nie je — ceny appka neukazuje.
          const _v=vyzivaReceptu(k); bl+=(_v.b||0); sa+=(_v.s||0);
          const nm=k._priloha?`<span class="nm pc-pril">+ ${kn}</span>`
            :k._left?`<button class="nm pc-btn" onclick="otvor('${k._srcId}')" title="Zvyšok — zobraziť recept" aria-label="Zvyšok ${kn} — zobraziť recept">♻️ ${kn} <small>(zvyšok)</small></button>`
            :`<button class="nm pc-btn pc-odkaz${ix>0?" pc-pril":""}" onclick="otvor('${cid}',{di:${di},slot:'${slot}'})" title="Zobraziť recept" aria-label="${kn} — zobraziť recept">${ix>0?"+ ":""}${kn}</button>`;
          // v31: 🎲 hneď vedľa názvu = okamžitá výmena (regenerujSlot — celý blok, výber ako generátor).
          // Len RAZ na slot, pri prvom (hlavnom) jedle: príloha, zvyšok aj druhý výrobok snackovej
          // dvojice sa menia s ním — 🎲 prehodí celý slot. Viditeľné len na telefóne (CSS).
          // B3: ✕ je v „⋯ viac" (s rozsahom a „↩ Späť"). Zamknuté jedlo má namiesto 🎲 len značku 🔒
          // (nie tlačidlo) — 🎲 vedľa neho by zvádzalo k omylu, vymeniť sa dá cez ✎ alebo ⋯ viac.
          const zn=(ix>0||k._priloha||k._left)?""
            :jeZamknute(di,slot)?`<span class="pc-zamok" role="img" title="Zamknuté — generátor ho nezmení" aria-label="zamknuté">🔒</span>`
            :`<button class="pc-btn pc-znova" onclick="regenerujSlot(${di},'${slot}')" title="Vymeniť za iné jedlo" aria-label="Vymeniť ${kn} za iné jedlo — ${kde}">🎲</button>`;
          return `<div style="display:flex;justify-content:space-between;gap:4px;align-items:start">${nm}${zn}</div>`;}).join("");
    // B3: kcal a bielkoviny v JEDNOM riadku (bunka mala 143–156 px na jedlo). Ručne nastavený počet
    // porcií (⋯ viac → 👥) sa dovtedy nikde neukázal — teraz je v tom istom riadku.
    const pp=(S.slotPpl[datumPre(di)]||{})[slot];
    const porc=pp>0?` · 👥 ${sklon(pp,"porcia","porcie","porcií")}`:"";
    const vn=vegNahradaText(komponent(ids[0])), k0=komponent(ids[0]);
    const nesedi=k0&&!k0._priloha&&!k0._left&&!vhodnyPrePlan(k0)?'<span class="pc-veg" role="note" style="color:var(--signal)">⚠ '+escHtml(dovodNevhodne(k0))+' — vymeň 🎲</span>':"";
    const mini=(k0&&!k0._priloha)?`<span class="${thumbTrieda(k0)} th-mini" aria-hidden="true">${thumbHTML(k0,true)}</span>`:"";
    const mm=mimoMena(di,slot), mimoTxt=mm.length?`<span class="pc-veg">🏢 ${escHtml(mm.join(", "))} ${mm.length>1?"sú":"je"} mimo domu — porcie sú menšie</span>`:"";
    return `<div class="plan-cell${mini?" s-fotkou":""}" data-bunka="${di}-${slot}" draggable="true" ondragstart="dragStart(event,${di},'${slot}')" title="Potiahni pre presun">${mini}${slotLbl}${riadky}${nesedi}${vn?`<span class="pc-veg">${escHtml(vn)}</span>`:""}${mimoTxt}<span class="pc-riadok"><span class="kc">${Math.round(kc*f)} kcal${fmtPct(rucnyMult(di,slot))}</span><span class="pc-data">${Math.round(bl*f)}&nbsp;g&nbsp;bielk.${S.profil.diabetes?" · "+Math.round(sa*f)+"&nbsp;g&nbsp;sach.":""}${porc}</span><button class="rm pc-btn pc-viac" data-fokus="pc-${di}-${slot}-viac" onclick="akcieSlotu(${di},'${slot}')" aria-label="⋯ viac — vymeniť, vybrať, veľkosť porcie, príloha — ${kde}">⋯<span class="viac-sl"> viac</span></button></span></div>`;
  }
  return `<button class="plan-cell prazdne pc-btn pc-empty" aria-label="Pridať jedlo — ${DNI[di]}, ${slot}" onclick="vyberDoPlanu(${di},'${slot}')">${slotLbl}+ pridať</button>`;
}
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
    DNI.forEach((d,di)=>{ const vyp=slotyDna(di).indexOf(slot)<0;
      // vypnutý slot nie je cieľ pre drag&drop — preto nemá ondragover/ondrop
      h+=vyp?`<td data-d="${di}" class="${tint(di)}">${planBunka(di,slot)}</td>`
            :`<td data-d="${di}" class="${tint(di)}" ondragover="dragOver(event)" ondrop="dragDrop(event,${di},'${slot}')">${planBunka(di,slot)}</td>`;
    });
    h+="</tr>";
  });
  const ciel=parseInt(S.profil.kcal)||0;
  let denSum=0, denSt=null; // súčet zobrazeného dňa pre #plan-den-hlava (rátame ho raz, tu)
  h+='<tr class="suma"><td>Σ kcal/deň</td>';
  DNI.forEach((d,di)=>{ let sum=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); sum=Math.round(sum);
    const cd=cielDna(di); // v34: deň s jedlom mimo domu má menší cieľ
    if(di===planDen){ denSum=sum; denSt=sum?stavCiel(sum,cd):null; }
    if(!sum){ h+=`<td data-d="${di}"></td>`; return; }
    const st=stavCiel(sum,cd); const over=cd&&sum>cd*1.1; const pct=cd?Math.min(100,Math.round(sum/cd*100)):0; // denný progress voči cieľu
    h+=`<td data-d="${di}" class="${over?'over':''}" title="${st.d?st.d+' kcal oproti cieľu':''}"><span style="color:${st.c}">${sum}${cd?'<span class="ciel-mini">/'+cd+'</span>':''}</span>${over?" ⚠":""}${cd?`<div class="kc-bar"><i style="width:${pct}%;background:${st.c||'var(--accent)'}"></i></div>`:""}</td>`; });
  h+="</tr>"; t.innerHTML=h; t.className="plan d"+planDen;
  renderDenHlavu(denSum,denSt,cielDna(planDen));
  renderPlanBloky(rowSloty,ciel);
}
// Hlavička zobrazeného dňa (len mobil, CSS rozhoduje): ktorý deň · dátum · či je to dnes ·
// koľko ten deň dáva voči cieľu. Čísla sú tie isté, ktoré práve vyrátal riadok Σ.
// ── BLOKOVÝ ZOZNAM (telefón) ────────────────────────────────────────────────
// Denný pohľad nútil preklikať 7 dní, aby si videl 16 jedál — z toho 9 varených sa
// opakuje 2–3×, lebo to je celý zmysel batch cookingu (navaríš raz, ješ dva dni).
// Blokový zoznam ukáže celý týždeň na jedno skrolovanie: 3 hlavičky + ~16 kariet.
// Bunku kreslí `planBunka`, teda tú istú ako tabuľka — žiadne druhé správanie.
// Keď je blok NEJEDNOTNÝ (človek si ručne vymenil jedlo v jeden deň), pohľad to
// PRIZNÁ a ukáže oba varianty s menovkou dní — nezatají to zobrazením prvého dňa.
function renderPlanBloky(rowSloty,ciel){
  const box=document.getElementById("plan-bloky"); if(!box)return;
  document.body.classList.toggle("plan-bloky-on",!!S.blokMode);
  if(!S.blokMode){ box.innerHTML=""; return; }
  const denKcal=di=>{ let sum=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl);
    slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); return Math.round(sum); };
  let h="";
  bloky().forEach((dni,bi)=>{ const pism=blokPismeno(bi); const veta=escHtml(vetaBloku(dni));
    // B3: blok sa posudzuje podľa dní, keď sa je doma — s „preč" v prvý deň karta tvrdila
    // „prázdny blok" a každý slot ukázala ako výnimku „Po: vyp.". Varí sa večer pred prvým z nich.
    const doma=dniDoma(dni), d0=doma[0];
    const vari=DNI_V[varnyDen(d0)];
    const kcal=doma.map(denKcal); const rovnake=kcal.every(k=>k===kcal[0]);
    const cbs=ciel?doma.map(cielDna):[0], cb=cbs[0], st=kcal[0]?stavCiel(kcal[0],cb):null, cRovn=cbs.every(c=>c===cb);
    const kcalTxt=!kcal[0]?'<span class="ciel-mini">prázdny blok</span>'
      :`<span style="color:${(cRovn&&st&&st.c)||'var(--na-bloku)'}">${rovnake?kcal[0]:Math.min(...kcal)+"–"+Math.max(...kcal)}</span>`
        +(cb?`<span class="ciel-mini">/${cRovn?cb:Math.min(...cbs)+"–"+Math.max(...cbs)}</span>`:"")+" kcal/deň";
    // ktorý blok je dnešný — v blokovom pohľade to inak nepovie nič (pás dní je preč)
    const dnesVBloku=dni.some(di=>datumPre(di)===dnesISO());
    h+=`<section class="blok-karta ${blokTrieda(bi)}${dnesVBloku?" je-dnes":""}" aria-label="Blok ${pism}, ${escHtml(rozsahKratko(dni))}${dnesVBloku?" — dnešný blok":""}">`
      +`<header class="bk-hlava"><span class="bk-nazov">${znakBloku(bi)} Blok ${pism} · ${rozsahKratko(dni)}</span>`
      +(dnesVBloku?`<span class="bk-dnes">dnes</span>`:"")
      +(kcal[0]?`<button class="bk-znova" onclick="regenerujBlokTlacidlo(${bi})" title="${veta}" aria-label="Vygenerovať blok ${pism} znova">🎲 <span class="tl">znova</span></button>`
        :!planPrazdnyTyzden()?`<button class="bk-znova" onclick="regenerujBlokTlacidlo(${bi})" aria-label="Zostaviť blok ${pism}">✨ <span class="tl">Zostaviť</span></button>`:"")+`</header>`
      +`<p class="bk-vari">👨‍🍳 varíš ${vari} večer · ${kcalTxt}</p>`;
    const hrniec=rowSloty.includes("Obed")&&rowSloty.includes("Večera")&&doma.every(di=>{ const o=slotIds(di,"Obed"), v=slotIds(di,"Večera");
      return o.length&&v.length&&o[0]===v[0]; });
    rowSloty.forEach(slot=>{
      if(hrniec&&slot==="Večera") return;
      if(hrniec&&slot==="Obed"){ h+=planBunka(d0,"Obed","Obed aj večera · 🍲 jeden hrniec"); return; }
      // varianty naprieč dňami bloku — pri jednotnom bloku je práve jeden
      // B3: kľúč nesie aj veľkosť porcie (faktor dňa, ručné porcie) — rovnaké jedlo s inou porciou
      // je iný variant s inými číslami; inak karta ukázala kcal/B prvého dňa za celý blok
      const mapa=new Map();
      doma.forEach(di=>{ const k=slotyDna(di).indexOf(slot)<0?"__vyp":slotIds(di,slot).join("+")+"|"+pf(di,slot)+"|"+((S.slotPpl[datumPre(di)]||{})[slot]||"");
        if(!mapa.has(k))mapa.set(k,[]); mapa.get(k).push(di); });
      if(mapa.size===1){ h+=planBunka(d0,slot); return; }
      mapa.forEach(dd=>{ h+=`<div class="bk-vynimka"><span class="bk-dni">${dd.map(d=>DNI[d].slice(0,2)).join(", ")}</span>${planBunka(dd[0],slot)}</div>`; });
    });
    if(kcal[0]) h+=`<p class="bk-varenia"><button class="lnk pc-btn" onclick="planVarenia(${d0})" aria-label="${veta} Otvoriť plán varenia pre blok ${pism}">plán varenia →</button></p>`;
    h+=`</section>`; });
  box.innerHTML=h; zpristupniKliky(box); }
function renderDenHlavu(sum,st,ciel){ const el=document.getElementById("plan-den-hlava"); if(!el)return;
  const iso=datumPre(planDen); const dnes=iso===dnesISO();
  el.innerHTML=`<span><span class="pdh-den">${DNI[planDen]} ${fmtD(iso)}</span>`
    +(dnes?'<span class="pdh-dnes">dnes</span>':'')+'</span>'
    +(sum?`<span class="pdh-kcal"${st&&st.d?` title="${st.d} kcal oproti cieľu"`:''}><span style="color:${(st&&st.c)||'var(--text)'}">${sum}</span>`
      +(ciel?`<span class="ciel-mini">/${ciel}</span>`:'')+' kcal</span>':'<span class="pdh-kcal ciel-mini">zatiaľ prázdny deň</span>'); }
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
// „Použiť na celý blok" JE predvolené (v31, výslovná voľba používateľa — audit 6. 9. ho vypol,
// ale v blokovom pláne sa jedlo takmer vždy mení pre celý blok; bez toho „✎ zmeniť" v blokovom
// zozname rozbilo blok na výnimky). Kto chce len jeden deň, odškrtne.
function vyberDoPlanu(di,slot){ pickCiel={di,slot,blok:!!S.blokMode}; ukazKatPicker(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function pickRozsah(){ if(S.blokMode && pickCiel.blok){ const d=blokDni(pickCiel.di); return DNI[d[0]].slice(0,2)+"–"+DNI[d[d.length-1]].slice(0,2); } return DNI[pickCiel.di]; }
function ukazKatPicker(){
  const kats=[...new Set(RECEPTY.filter(r=>vhodnyPrePlan(r)).map(r=>r.kategoria))];
  const odp=SLOT_KATEGORIE[pickCiel.slot]||[];
  kats.sort((a,b)=>((odp.includes(b)?1:0)-(odp.includes(a)?1:0)) || a.localeCompare(b,"sk"));
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Aké jedlo?</h2><div class="subx">${S.blokMode&&pickCiel.blok?znakBloku(blokIndex(pickCiel.di))+" ":""}${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  // výsledky hľadania sú zoznam v okne (ako Recepty), nie plávajúci box cez návrhy — návrhy sa počas hľadania skryjú
  h+=`<input id="pick-search" type="search" enterkeyhint="search" placeholder="🔍 Hľadať recept: kura bez ryže…" oninput="pickSearchInput(this.value)" autocomplete="off" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:15px;margin-bottom:14px">`;
  if(S.blokMode) h+=`<label class="switch" style="margin-bottom:12px"><input type="checkbox" ${pickCiel.blok?"checked":""} onchange="pickCiel.blok=this.checked;document.querySelector('#pick-modal .subx').textContent=pickRozsah()+' · '+pickCiel.slot"> Použiť na celý blok</label>`;
  h+='<div id="pick-search-results" style="display:none"></div><div id="pick-navrhy">'+pickNavrhyHTML();
  h+='<details style="margin-top:6px"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;gap:6px;color:var(--text2)">Prehľadať podľa typu jedla</summary><div class="chips" style="margin-top:8px">';
  kats.forEach(k=>{ const zvyr=odp.includes(k); h+=`<span class="chip${zvyr?' active':''}" onclick="ukazReceptyKat('${k.replace(/'/g,"")}')">${ikony[k]||"🍴"} ${k}</span>`; });
  h+=`</div><div class="btn-row"><button class="btn" onclick="ukazReceptyKat('')">Zobraziť všetky recepty</button></div></details></div></div>`;
  document.getElementById("pick-modal").innerHTML=h;
}
// Štyri hotové návrhy pre daný slot, každý s dôvodom. Appka pozná slot, kcal-okno, blok,
// špajzu aj pamäť — nemá zmysel pýtať od používateľa navigáciu v kategóriách.
// Poradie je deterministické: čo vidíš, to dostaneš (žiadny Math.random).
function pickNavrhyHTML(){
  let z; try{ z=_poolNavrhov(pickCiel.di,pickCiel.slot); }catch(e){ return ""; }
  const cielK=z.cielK; // B3: to, čo slotu v dni chýba do cieľa — ten istý cieľ ako 🎲 („Vyber za mňa")
  const uz=slotIds(pickCiel.di,pickCiel.slot);
  const kand=z.pool.filter(r=>uz.indexOf(r.id)<0).map(r=>{
    const v=vyzivaReceptu(r), kc=kcalPorcia(r);
    const p100=v.kcal>5?v.b/(v.kcal/100):0;
    // bližšie k cieľu slotu = lepšie; bielkoviny na 100 kcal ako druhé kritérium
    const odchylka=cielK>0?Math.abs(kc-cielK)/cielK:0;
    // v31: hodnotenie a obľúbené posúvajú návrh hore (5★ −0,19, 1★ +0,19) — tá istá váha ako v generátore
    return {r,kc,b:v.b,p100,nepouzity:!z.pouzite.has(r.id),skore:(z.pouzite.has(r.id)?1:0)+odchylka-p100/40-0.06*Math.log2(oblubenostVaha(r.id))};
  }).sort((a,b)=>a.skore-b.skore);
  // Rozptyl: bez neho vyjdú štyri varianty tej istej suroviny („Kuracie prsia…" ×4),
  // lebo skóre ťahá bielkovinová hustota. Rovnaký kľúč (mäso + raňajková báza) ako
  // používa generátor, takže návrhy sú pestré rovnako ako vygenerovaný týždeň.
  // Tri prechody so zvyšujúcim sa stropom na kľúč: najprv po jednom, potom po dvoch,
  // až nakoniec bez obmedzenia. Zaručí to pestrosť, ale nikdy nevráti menej návrhov,
  // než pool unesie (pri úzkom poole je aj 4× kura lepšie než prázdny zoznam).
  const pocet=new Map(), vyber=[];
  for(const strop of [1,2,99]){
    for(const k of kand){ if(vyber.length===4)break;
      if(vyber.indexOf(k)>=0)continue;
      // Pri raňajkách rozlišuje bázu (toast/rožok/ovsené…), inde druh mäsa. `ranajkyBaza`
      // vracia mimo raňajok unikátne „iná:<slug>", takže ako kľúč pestrosti by nefungovala.
      const kluc=pickCiel.slot==="Raňajky"?(ranajkyBaza(k.r)||"–"):(masoTyp(k.r)||"–");
      if((pocet.get(kluc)||0)>=strop)continue;
      pocet.set(kluc,(pocet.get(kluc)||0)+1); vyber.push(k); }
    if(vyber.length===4)break;
  }
  if(!vyber.length) return "";
  let h='<div class="info" style="margin:0 0 8px">Návrhy na '+escHtml(String(pickCiel.slot).toLowerCase())+':</div>';
  vyber.forEach(k=>{
    const dov=[];
    if(cielK>0 && Math.abs(k.kc-cielK)/cielK<=0.25) dov.push("sedí do kcal");
    if(k.p100>=HS_HI) dov.push(`${fmtG(k.p100)} g bielkovín/100 kcal`); // rovnaký prah ako zelená bodka na karte
    if(k.nepouzity) dov.push("nie je inde v týždni");
    h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${k.r.id}')">`
     + `<span class="nm">${ikony[k.r.kategoria]||"🍴"} ${escHtml(k.r.nazov)}</span>`
     + `<span class="kc">${k.kc} kcal · ${fmtG(k.b)} g bielk.${S.profil.diabetes?" · "+fmtG(vyzivaReceptu(k.r).s||0)+" g sach.":""}${dov.length?" · "+dov.join(" · "):""}</span></div>`;
  });
  h+=`<div class="btn-row" style="margin:10px 0 14px"><button class="btn" onclick="zavriPick();regenerujSlot(${pickCiel.di},'${pickCiel.slot}')">🎲 Vyber za mňa</button></div>`;
  return h;
}
// keď zhoda nie je v názve, ukáž ktorá ingrediencia sedí (hladaSuroviny — to isté ako karta v Receptoch)
function pickSearchRiadok(r,qq){ const ing=hladaSuroviny(r,qq).join(", ");
  return `<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</span><span class="kc">${ing?"🥕 "+escHtml(ing)+" · ":""}${escHtml(r.kategoria)}${r.kuchyna?" · "+escHtml(r.kuchyna):""} · ${kcalPorcia(r)} kcal</span></div>`; }
// v33: radí podľa relevancie (hladaSkore, ako Recepty) a za 30 riadkami priznáva zvyšok — „kura" má 228
// výsledkov a bez „Zobraziť všetky" sa ďalšie nedali nájsť inak než spresnením dopytu.
function pickSearchInput(q,vsetky){
  const box=document.getElementById("pick-search-results"); if(!box)return;
  const nav=document.getElementById("pick-navrhy");
  q=q.trim(); if(nav) nav.style.display=q?"none":"";
  if(!q){ box.style.display="none"; box.innerHTML=""; return; }
  const qq=bezDia(q), sk=new Map();
  const list=RECEPTY.filter(r=>{ if(!vhodnyPrePlan(r)) return false; const s=hladaSkore(r,qq); if(s<0) return false; sk.set(r.id,s); return true; })
    .sort((a,b)=>(sk.get(b.id)-sk.get(a.id)) || a.nazov.localeCompare(b.nazov,"sk"));
  const ukaz=vsetky?list:list.slice(0,30);
  box.style.display="block";
  box.innerHTML = list.length ? ukaz.map(r=>pickSearchRiadok(r,qq)).join("")
      +(list.length>ukaz.length?`<button class="btn" style="margin:8px" onclick="pickSearchInput(document.getElementById('pick-search').value,true)">Zobraziť všetky (${list.length})</button>`:"")
    : '<p class="info" style="padding:10px;margin:0">Nič sa nenašlo.</p>';
  zpristupniKliky(box);
}
function ukazReceptyKat(kat){
  let list=RECEPTY.filter(r=>vhodnyPrePlan(r) && (!kat||r.kategoria===kat)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk"));
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${kat||"Všetky recepty"}</h2><div class="subx"><button type="button" class="lnk spat-typy" onclick="ukazKatPicker()">← späť na typy jedál</button></div></div><div class="content2" style="max-height:60vh;overflow:auto">`;
  if(!list.length) h+='<p class="info">Žiadny recept v tejto kategórii.</p>';
  list.forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nastavPlan('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</span><span class="kc">${escHtml(r.kategoria)}${r.kuchyna?" · "+escHtml(r.kuchyna):""} · ${kcalPorcia(r)} kcal</span></div>`; });
  h+="</div>";
  document.getElementById("pick-modal").innerHTML=h;
}
function nastavPlan(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  const r=receptById(id); let comp=[id]; const k0=komponent(slotIds(c.di,c.slot)[0]); zapamatajTyzden();
  { const pr=jeHlavnyChodSlot(c.slot)?prilohaPre(r,0):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(c.slot) && r && r.kategoria==="Nátierka"){ const np=natierkaPriloha(); if(np) comp.push(np); }
  dni.forEach(di=>{ const iso=datumPre(di); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][c.slot]=comp.slice(); });
  rescaleDen(dni); save(); zavriPick(); renderPlan();
  toastSpat("✎ "+c.slot+" "+(dni.length>1?rozsahKratko(dni):DNI[c.di])+": "+(k0?k0.nazov+" → ":"")+(r?r.nazov:id)); }
function pridajKomponent(di,slot){ pickCiel={di,slot,blok:S.blokMode,pridat:true}; ukazDoplnok(); zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function ukazDoplnok(){ let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Pridať doplnok</h2><div class="subx">${pickRozsah()} · ${pickCiel.slot}</div></div><div class="content2">`;
  h+='<div class="chips">'; Object.keys(PRILOHY).forEach(k=>{ h+=`<span class="chip" onclick="pridajDoplnok('${k}')">${escHtml(PRILOHY[k].nazov)}</span>`; });
  h+='</div><h3 class="sekcia">Alebo recept (príloha / šalát)</h3><div style="max-height:40vh;overflow:auto">';
  RECEPTY.filter(r=>["Príloha","Šalát","Nátierka","Pečivo"].includes(r.kategoria) && vhodnyPrePlan(r)).sort((a,b)=>a.nazov.localeCompare(b.nazov,"sk")).forEach(r=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="pridajDoplnok('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)}</span><span class="kc">${escHtml(r.kategoria)}</span></div>`; });
  h+="</div></div>"; document.getElementById("pick-modal").innerHTML=h; }
function pridajDoplnok(id){ const c=pickCiel; const dni=(S.blokMode && c.blok)?blokDni(c.di):[c.di];
  dni.forEach(di=>{ const iso=datumPre(di); S.plan[iso]=S.plan[iso]||{}; const cur=slotIds(di,c.slot); if(cur.indexOf(id)<0)cur.push(id); S.plan[iso][c.slot]=cur; });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); }
function odoberKomponent(di,slot,cid){ const dni=S.blokMode?blokDni(di):[di]; const k=komponent(cid); zapamatajTyzden();
  dni.forEach(d=>{ const iso=datumPre(d); if(S.plan[iso]){ const cur=slotIds(d,slot).filter(x=>x!==cid); if(cur.length)S.plan[iso][slot]=cur; else delete S.plan[iso][slot]; } });
  rescaleDen(dni); save(); renderPlan();
  toastSpat("✕ Odobraté: "+(k?k.nazov:"položka")+" ("+slot+" "+(dni.length>1?rozsahKratko(dni):DNI[di])+")."); }
// B3: celý slot (jedlo aj s prílohou/doplnkom) v celom rozsahu bloku — z „⋯ viac", s „↩ Späť"
function odoberSlot(di,slot){ const dni=denyBloku(di), k=komponent(slotIds(di,slot)[0]); zapamatajTyzden();
  dni.forEach(d=>{ const iso=datumPre(d); if(S.plan[iso]) delete S.plan[iso][slot]; });
  rescaleDen(dni); save(); renderPlan();
  toastSpat("✕ Odobraté: "+(k?k.nazov:slot)+" ("+slot+" "+(dni.length>1?rozsahKratko(dni):DNI[di])+")."); }
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
// B3: 🎲 vyberá AKO GENERÁTOR. Dovtedy `vyberVazene(pool,pouzite)` bez slotu a kcal-cieľa —
// jedno vážené losovanie z celej kategórie: 22 % výmen porušilo poradie kcal, hlavné jedlo vyšlo
// pod 300 kcal, raňajky zopakovali bázu iného bloku a snack stratil doplnok (37 %). Teraz sa
// z toho, čo v týždni už je, zloží rovnaký `ctx`, aký si stavia generujJedalnicek pre blok,
// a výber ide cez `_poolVyberu` (kcal-okno, MIN_KCAL_HLAVNY, pravidlá raňajok, kuchyne bloku,
// pamäť, druh snacku) + turnaj `vyberVazene` so slotom a cieľom.
function _ctxSlotu(di,slot){ const dni=denyBloku(di);
  const bl=S.blokMode?bloky():[0,1,2,3,4,5,6].map(d=>[d]), bi=bl.findIndex(b=>b.indexOf(di)>=0);
  const pouzite=new Set(), pouziteBazy=new Set(), snackDruhy=new Map(), prevBlokMaso=new Set(), stopa={};
  for(let d=0;d<7;d++) slotyDna(d).forEach(sl=>slotIds(d,sl).forEach(id=>pouzite.add(id)));
  bl.forEach((b,i)=>{ if(i===bi)return; const d0=prvyDenDoma(b);
    slotyDna(d0).forEach(sl=>{ const k=komponent(slotIds(d0,sl)[0]); if(!k||k._priloha)return;
      if(sl==="Raňajky") pouziteBazy.add(ranajkyBaza(k));
      if(jeSnackSlot(sl)) snackDruhy.set(snackDruh(k),(snackDruhy.get(snackDruh(k))||0)+1);
      if(Math.abs(i-bi)===1 && jeHlavnyChodSlot(sl)){ const mt=masoTyp(k); if(mt)prevBlokMaso.add(mt); } }); });
  const d0=prvyDenDoma(dni);
  slotyDna(d0).forEach(sl=>{ if(sl===slot)return; const k=komponent(slotIds(d0,sl)[0]); if(k&&!k._priloha) stopa[sl]=_stopaPre(k,sl); });
  const stupne=t=>PAMAT_STUPNE.map(x=>nedavneRecepty(Math.max(2,Math.round(t*x))));
  const doma=dniDoma(dni);
  return {cfg:S.genCfg||{}, pouzite, pouziteBazy, nedavne:stupne(TYZDNE_PAMATE), nedavneSnack:stupne(TYZDNE_PAMATE_SNACK),
    stopa, prevBlokMaso, snackDruhy, kf:filterKuchynaPreDni(doma), pr:pravidloPreDni(doma), vsednyBlok:doma.every(d=>d<5),
    prilRot:Math.floor(Math.random()*1000), cenaRef:cenaRef()}; }
// Koľko kcal slotu v dni zostáva (cieľ dňa − ostatné jedlá; prázdny slot sa ráta svojím podielom)
// a medze poradia O ≥ V > R > S voči jedlám, ktoré v dňoch bloku už sú. Medze sú TVRDÉ a prienik
// cez všetky dni bloku — v nejednotnom bloku musí nové jedlo sedieť do každého dňa.
function _cielSlotuVDni(dni,slot){ const ciel=genCiel(cielDna(prvyDenDoma(dni))), m={min:0,max:0,tvrde:true}; let potreba=null;
  dni.filter(d=>slotyDna(d).includes(slot)).forEach(d=>{ const sl=slotyDna(d), kc={}, napln=[];
    sl.forEach(s=>{ if(s===slot){ kc[s]=0; napln.push(s); } else if(slotIds(d,s).length){ kc[s]=mealKcal(slotIds(d,s)); napln.push(s); } });
    const md=medzePoradia(napln,slot,kc,true);
    if(md){ if(md.min>m.min)m.min=md.min; if(md.max>0&&(!m.max||md.max<m.max))m.max=md.max; }
    if(potreba==null&&ciel>0) potreba=ciel-sl.filter(s=>s!==slot).reduce((a,s)=>a+(kc[s]!=null?kc[s]:cielSlotu(s,sl,ciel)),0); });
  const nom=cielSlotu(slot,slotyDna(prvyDenDoma(dni)),ciel);
  let k=(potreba==null||!(nom>0))?nom:Math.max(nom*OKNO_DOLE,Math.min(nom*OKNO_HORE,potreba));
  if(k>0&&m.max>0) k=Math.min(k,m.max*0.95);
  if(k>0&&m.min>0) k=Math.max(k,m.min*1.05);
  return {cielK:k, medze:(m.min>0||m.max>0)?m:null}; }
// Pool kandidátov pre jeden slot — ten istý, z ktorého vyberá 🎲 (a teda generátor). Dialóg
// „Aké jedlo?" z neho skladá štyri návrhy, takže ponúka len jedlá, ktoré sedia do dňa.
function _poolNavrhov(di,slot){ const dni=denyBloku(di), ctx=_ctxSlotu(di,slot), {cielK,medze}=_cielSlotuVDni(dni,slot);
  const stary=slotIds(prvyDenDoma(dni),slot)[0];
  const mal=!!_genCache; if(!mal)_genCacheReset(true);
  try{ return {dni, pool:_poolVyberu(slot,ctx,cielK,0,medze,typeof stary==="string"?stary:null), pouzite:ctx.pouzite, ctx, cielK, medze}; }
  finally{ if(!mal)_genCacheReset(false); } }
// Prehodenie jedného slotu. `_ticho` verzia nekreslí ani neukladá — volá ju `regenerujBlok`,
// aby sa pri prehodení celého bloku nekreslilo štyrikrát za sebou. `vylucit` (Set id) = jedlá,
// ktoré sa vrátiť nesmú (🎲 bloku vyprázdni sloty, takže ich `ctx.pouzite` už nevidí).
// Návrh, ktorý so svojou prílohou/doplnkom vypadne z medzí poradia, sa zahodí a skúsi sa ďalší.
function _regenerujSlotTicho(di,slot,vylucit){
  const mal=!!_genCache; if(!mal)_genCacheReset(true); const pam=_genPamatSnack; let vyber=null, dni;
  try{
    const z=_poolNavrhov(di,slot), {ctx,cielK,medze}=z, pouzite=z.pouzite; dni=z.dni;
    _genPamatSnack=ctx.nedavneSnack[0];
    let pool=z.pool; if(vylucit){ const p=pool.filter(x=>!vylucit.has(x.id)); if(p.length)pool=p; }
    const sedi=c=>{ const k=mealKcal(c); return !medze||((!(medze.min>0)||k>=medze.min)&&(!(medze.max>0)||k<=medze.max)); };
    for(let i=0;i<6&&pool.length;i++){
      const r=vyberVazene(pool,pouzite,slot,cielK,ctx.prilRot,cenaSlotu(ctx,cielK,slot)); if(!r)break;
      let comp=[r.id];
  { const pr=jeHlavnyChodSlot(slot)?prilohaPre(r,Math.floor(Math.random()*1000),pouzite):null; if(pr) comp.push(pr); }
      if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka"){ const np=natierkaPriloha(); if(np) comp.push(np); }
      if(jeSnackSlot(slot)){ const dp=snackDoplnokPre(r,ctx,slot); if(dp) comp.push(dp); }
      if(!vyber) vyber=comp;
      if(sedi(comp)){ vyber=comp; break; }
      pool=pool.filter(x=>x!==r); }
  } finally { if(!mal)_genCacheReset(false); _genPamatSnack=pam; }
  if(!vyber) return null;
  dni.forEach(d=>{ const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][slot]=vyber.slice(); });
  return dni; }
// 🍲 jeden hrniec: 🎲 obeda či večere vymení obe, ak boli v ten deň tým istým jedlom (ručne rozdelené ostanú rozdelené).
function _zrkadliHrniec(dni,zdroj,len){ if(!S.profil.jedenHrniec) return; const ciel=zdroj==="Obed"?"Večera":"Obed";
  dni.forEach(d=>{ const p=S.plan[datumPre(d)]; if(!p||!p[zdroj]||!slotyDna(d).includes(ciel)||jeZamknute(d,ciel)) return;
    if(len&&!len.has(d)) return; p[ciel]=p[zdroj].slice(); }); }
const _hody={};
function _zablikaj(di,slot){ setTimeout(()=>{ document.querySelectorAll('[data-bunka="'+di+'-'+slot+'"]').forEach(e=>animuj(e,"vymenene")); },0); }
function regenerujSlot(di,slot){ if(document.body.classList.contains("generujem")){ toast("Počkaj, kým dokončím jedálniček."); return; } const k0=komponent(slotIds(di,slot)[0]); zapamatajTyzden();
  const ina=slot==="Obed"?"Večera":slot==="Večera"?"Obed":null;
  const spolu=new Set(ina?denyBloku(di).filter(d=>slotIds(d,ina)[0]&&slotIds(d,ina)[0]===slotIds(d,slot)[0]):[]);
  const kl=S.viewOd+"|"+blokIndex(di)+"|"+slot, h=_hody[kl]=(_hody[kl]||[]); if(k0) h.push(k0.id); if(h.length>6) h.shift();
  const dni=_regenerujSlotTicho(di,slot,new Set(h)); if(!dni){ toast("Pre "+slot.toLowerCase()+" som nenašiel inú možnosť."); return; }
  if(spolu.size) _zrkadliHrniec(dni,slot,spolu);
  dni.forEach(d=>{ const m=S.planM&&S.planM[datumPre(d)]; if(m) delete m[slot]; }); // ručná veľkosť patrila starému jedlu
  rescaleDen(dni); save(); drzFokus(renderPlan); _zablikaj(dni[0],slot);
  // v31: výmena mení celý blok a appka to musí povedať (toast má aria-live) — inak po 🎲 nie je
  // jasné, čo zmizlo a že sa zmenili aj ostatné dni bloku.
  const k1=komponent(slotIds(dni[0],slot)[0]);
  tik(); if(k1) toastSpat("🎲 "+slot+": "+k1.nazov); }
// v29: 🎲 pri každom bloku. Doteraz sa dalo prehodiť buď jedno jedlo (⋯ viac → znova),
// alebo celý týždeň (⋯ Viac → Zamiešať) — blok, teda to, na čo sa človek v pláne pozerá,
// sa prehodiť nedal bez preklikávania slot po slote.
// B3: nezamknuté sloty bloku sa najprv vyprázdnia a plnia v poradí Obed → Večera → Raňajky → Snack,
// takže každé nové jedlo sa meria voči NOVÝM susedom (predtým voči tým, čo práve odchádzali,
// a poradie kcal padlo v 71 % dní). Sloty sa berú zo všetkých dní bloku, nie z prvého —
// keď bol prvý deň „preč", blok sa nedal prehodiť vôbec.
// 🎲 bloku z tlačidla: hneď odozva, výpočet až po vykreslení snímky (kolo 4, pocit). regenerujBlok ostáva synchrónny.
async function regenerujBlokTlacidlo(bi){ const bl=bloky(); const dni=bl[bi]; if(!dni||!dni.length)return;
  if(document.body.classList.contains("generujem")){ toast("Počkaj, kým dokončím jedálniček."); return; } tik(); const pas=document.querySelector(".gen-pas"), t0=pas?pas.textContent:"";
  if(pas) pas.textContent="🎲 Prehadzujem blok "+blokPismeno(bi)+"…"; document.body.classList.add("generujem");
  try{ await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))); regenerujBlok(bi); } finally { document.body.classList.remove("generujem"); if(pas) pas.textContent=t0; } }
function regenerujBlok(bi){ const bl=bloky(); const dni=bl[bi]; if(!dni||!dni.length)return;
  const doma=dni.filter(d=>slotyDna(d).length), P=blokPismeno(bi);
  if(!doma.length){ toast("V bloku "+P+" nie je deň, keď ješ doma."); return; }
  const volne=PORADIE_SLOTOV.filter(s=>doma.some(d=>slotyDna(d).includes(s)) && !dni.some(d=>jeZamknute(d,s)));
  if(!volne.length){ toast("V bloku "+P+" je všetko zamknuté — nie je čo prehodiť."); return; }
  zapamatajTyzden();
  const stare={}, vylucit=new Set();
  volne.forEach(s=>{ stare[s]=dni.map(d=>(S.plan[datumPre(d)]||{})[s]);
    stare[s].forEach(v=>{ const id=Array.isArray(v)?v[0]:v; if(id)vylucit.add(id); });
    dni.forEach(d=>{ const p=S.plan[datumPre(d)]; if(p) delete p[s]; }); });
  let n=0;
  volne.forEach(s=>{ if(_regenerujSlotTicho(doma.find(d=>slotyDna(d).includes(s)),s,vylucit)){ n++; return; }
    dni.forEach((d,i)=>{ if(stare[s][i]===undefined)return; const iso=datumPre(d); S.plan[iso]=S.plan[iso]||{}; S.plan[iso][s]=stare[s][i]; }); });
  if(!n){ toast("Pre tento blok som nenašiel náhradu."); return; }
  _zrkadliHrniec(dni,"Obed");
  dni.forEach(d=>{ const m=S.planM&&S.planM[datumPre(d)]; if(m) volne.forEach(s=>{ delete m[s]; }); });
  const bolPrazdny=volne.every(s=>stare[s].every(v=>v===undefined));
  rescaleDen(dni); save(); drzFokus(renderPlan); vibruj(USPECH); volne.forEach(s=>_zablikaj(doma[0],s));
  toastSpat((bolPrazdny?"✨ Blok "+P+" ("+rozsahKratko(dni)+") je zostavený — ":"🎲 Blok "+P+" ("+rozsahKratko(dni)+") je prehodený — ")+sklon(n,"jedlo","jedlá","jedál")+"."); }
// Privítanie zavreté AKOUKOĽVEK cestou (✕, Preskočiť, Escape, Späť, ťuk vedľa) sa už neukáže —
// do v32 ho dokončovali len ✕ a „Preskočiť", takže po Escape/Späť vyskočilo pri každom štarte.
// Spozná sa podľa vlastného tlačidla, aby sa onboardingModal nemusel meniť.
function zavriPick(){ if(document.querySelector('#pick-overlay.open [onclick*="dokonciOnboarding"]')) dokonciOnboarding(); _odchodDuch("pick-overlay");
  document.getElementById("pick-overlay").classList.remove("open"); _zahodHistoriuModalu(); _vratFokus(); }
document.getElementById("pick-overlay").addEventListener("click",e=>{if(e.target.id==="pick-overlay")zavriPick();});
// nahradí obsah PRÁVE ZOBRAZENÉHO týždňa (7 dátumov od S.viewOd) šablónou indexovanou 0-6 (z archívu/JEDALNICKY) — S.plan mimo tohto rozsahu (iné týždne) sa nedotkne
// Kópia dňa, nie odkaz — inak by každá úprava plánu (aj výmena nižšie) prepísala uložený jedálniček.
// Stačí plytká: polia slotov sa v appke nikde nemenia na mieste, vždy sa priraďuje nové.
function nacitajSablonuDoTyzdna(planTpl,planFTpl){
  for(let di=0;di<7;di++){ const iso=datumPre(di);
  if(planTpl&&planTpl[di])S.plan[iso]=Object.assign({},planTpl[di]); else delete S.plan[iso];
  if(planFTpl&&planFTpl[di])S.planF[iso]=Object.assign({},planFTpl[di]); else delete S.planF[iso];
  if(S.planM) delete S.planM[iso]; } // nový týždeň = bez ručných veľkostí porcií
  const n=_vymenNevhodne();
  if(n) toast("Vymenil som "+n+(n===1?" jedlo, ktoré nesedí":n<5?" jedlá, ktoré nesedia":" jedál, ktoré nesedia")+" s diétou, skrytými receptami alebo zdrojmi."); }
// Uložený jedálniček, šablóna aj minulý týždeň sú starší než profil: diéta, skryté recepty a vypnuté
// zdroje sa odvtedy mohli zmeniť (5 pribalených jedálničkov dávalo pri „bez lepku" 6–21 porušení).
// Hlavné jedlo slotu (nie `prf:` príloha), ktoré dnes neprejde prejdeProfil, vymení ten istý výber
// ako 🎲 — ale LEN v dňoch, kde to jedlo bolo; ostatné dni bloku ostanú, ako boli v šablóne.
function _vymenNevhodne(){ let n=0; const dotknute=new Set();
  for(let di=0;di<7;di++) Object.keys(S.plan[datumPre(di)]||{}).forEach(slot=>{
    const id=slotIds(di,slot)[0]; if(typeof id!=="string"||/^(prf|left):/.test(id))return;
    const r=receptById(id);
    if(r&&vhodnyPrePlan(r)){ // hlavné jedlo sedí — skontroluj prílohy a doplnky v slote
      for(let d=0;d<7;d++){ const ids=slotIds(d,slot); if(ids[0]!==id||ids.length<2) continue; const iso=datumPre(d);
        const ok=[ids[0]].concat(ids.slice(1).filter(x=>/^left:/.test(x)||_prilohaPrejde(x)));
        if(ok.length<ids.length){ const pr=jeHlavnyChodSlot(slot)?prilohaPre(r,0):null; if(pr&&!ok.includes(pr)&&ids.slice(1).some(x=>/^prf:/.test(x))) ok.push(pr);
          S.plan[iso][slot]=ok; dotknute.add(d); n++; } }
      return; }
    const pred=[0,1,2,3,4,5,6].map(d=>(S.plan[datumPre(d)]||{})[slot]);
    const dni=_regenerujSlotTicho(di,slot); if(!dni)return; n++;
    dni.forEach(d=>{ const p=pred[d], iso=datumPre(d);
      if((Array.isArray(p)?p[0]:p)===id){ dotknute.add(d); return; }
      if(p===undefined) delete S.plan[iso][slot]; else S.plan[iso][slot]=p; }); });
  dotknute.forEach(d=>rescaleDen([d]));
  return n; }
async function vymazPlan(){ if(await confirmModal("Vyprázdniť tento týždenný plán?","🗑 Vyprázdniť")){ zapamatajTyzden(); nacitajSablonuDoTyzdna({},{}); save(); renderPlan(); toastSpat("🗑 Týždeň je vyprázdnený."); } }
// B3: „Skopírovať minulý týždeň" = predchádzajúci KALENDÁRNY týždeň zo S.plan (podľa dátumov),
// nie posledný uložený z archívu (ten je v „📥 Načítať uložený"). Cieľ kcal sa NEMENÍ — kópia
// z archívu ho prepisovala hodnotou z archívu a rozišiel sa s prvým stravníkom.
// Ide cez nacitajSablonuDoTyzdna, takže jedlá, ktoré už nesedia s diétou/zdrojmi, sa vymenia.
async function skopirujMinuly(){ const od=pridajDni(S.viewOd,-7), rozsah=fmtD(od)+"–"+fmtD(pridajDni(od,6));
  const plan={}, planF={}; let n=0;
  for(let di=0;di<7;di++){ const iso=pridajDni(od,di);
    if(S.plan[iso]&&Object.keys(S.plan[iso]).length){ plan[di]=S.plan[iso]; n++; }
    if(S.planF[iso]) planF[di]=S.planF[iso]; }
  if(!n){ toast("Minulý týždeň ("+rozsah+") je prázdny. Uložené jedálničky sú v ⋯ Viac → 📥 Načítať uložený jedálniček."); return; }
  if(!planPrazdnyTyzden() && !await confirmModal("Skopírovať týždeň "+rozsah+" do tohto? Terajší plán sa prepíše.","Skopírovať"))return;
  zapamatajTyzden(); toast._posl="";
  nacitajSablonuDoTyzdna(plan,planF); save(); renderPlan();
  toastSpat("📋 Skopírovaný týždeň "+rozsah+"."+(toast._posl?" "+toast._posl:"")); }
function pridajDoPlanu(id){ const r=receptById(id); if(!r)return; zavri();
  const slot=slotPreKategoriu(r.kategoria); const dni=["Po","Ut","St","Št","Pi","So","Ne"]; const sloty=SLOTY();
  // Predvolený deň bol vždy Pondelok — v stredu tak recept potichu skončil v minulosti. Teraz dnešok
  // (ak je v Pláne zobrazený tento týždeň), resp. najbližší deň od neho, kde je slot ešte prázdny.
  const dnes=S.viewOd===pondelokPre(dnesISO())?(new Date(dnesISO()+"T00:00:00").getDay()+6)%7:-1;
  let den=Math.max(dnes,0); for(let d=den;d<7;d++) if(!slotIds(d,slot).length){ den=d; break; }
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Do plánu: ${escHtml(r.nazov)}</h2></div><div class="content2">
    <div class="field"><label>Deň · týždeň ${fmtD(S.viewOd)}–${fmtD(pridajDni(S.viewOd,6))}</label><select class="f" id="pdp-den">${dni.map((d,i)=>`<option value="${i}"${i===den?" selected":""}>${d} ${fmtD(datumPre(i))}${i===dnes?" (dnes)":""}</option>`).join("")}</select></div>
    <div class="field"><label>Jedlo (slot)</label><select class="f" id="pdp-slot">${sloty.map(s=>`<option ${s===slot?"selected":""}>${s}</option>`).join("")}</select></div>
    <p class="info">Pridá sa na prvé miesto slotu${S.blokMode?" (na celý blok)":""}.</p>
    <div class="btn-row"><button class="btn primary" onclick="ulozDoPlanu('${id}')">📅 Pridať do plánu</button></div></div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function ulozDoPlanu(id){ const di=parseInt(document.getElementById("pdp-den").value)||0; const slot=document.getElementById("pdp-slot").value; const r=receptById(id); if(!r)return;
  let comp=[id];
  { const pr=jeHlavnyChodSlot(slot)?prilohaPre(r,0):null; if(pr) comp.push(pr); }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka"){ const np=natierkaPriloha(); if(np) comp.push(np); }
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
// Univerzum generátora — presne to, z čoho vyberá slot. Nastavenia z toho hlásia počet, takže
// číslo pod prepínačmi zdrojov NEMÔŽE klamať: je to tá istá funkcia, nie druhý výpočet.
// Zdroje filtruje prejdeProfil (v31: vypnutý zdroj nie je nikde, ani v Receptoch). Poistka
// proti prázdnemu plánu je v zdrojeOffAktivne: vypnuté VŠETKO = filter neplatí.
// Ryba „naozaj": gramy surovín s alergénom ryby z oddelenia Mäso a ryby alebo konzerva (tuniak, sardinky…),
// bez omáčok a pást. 2. kolo: 73 z 221 „rybacích" jedál malo rybu len vo Worcestri — bonus odmeňoval čili.
const _memoRyba=new Map();
function jeRybaJedlo(r){ if(!r) return false; let v=_memoRyba.get(r.id); if(v!==undefined) return v; let g=0;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null) return; const p=najdiPotravinu(i.nazov); if(!p||!(p.alergeny||[]).includes("ryby")) return;
    if(/omack|sauce|pasta|vyvar|worcest/.test(bezDia(p.kluc))) return; g+=(gramy(i,p)||0)*(i.vsiaknutie>0&&i.vsiaknutie<1?i.vsiaknutie:1); });
  v=g/(r.porcie||1)>=50; _memoRyba.set(r.id,v); return v; }
// Smie byť v pláne tejto domácnosti: profil (diéty, zákazy, skryté, zdroje) + dieťa/tehotná + zmiešaná domácnosť
// (kúpený výrobok sa nedelí — mäsitý snack by vegetarián nezjedol, 42× v 2. kole).
// ryba, ktorej generátor uľaví (soľ, tuk) a ktorú v týždni bez ryby podporí: nie vyprážaná, do 2,5 g soli, nie pre malé dieťa
function _rybaUlava(r){ return _rybaVhodna(r)&&!maleDieta(); }
// ryba, ktorú generátor v týždni bez ryby podporí (aj pre rodinu s malým dieťaťom): nie vyprážaná, do 2,5 g soli
function _rybaVhodna(r){ if(!r||!isMain(r)||!jeRybaJedlo(r)) return false; const v=vyzivaReceptu(r);
  return (v.na||0)*2.5/1000<=2.5 && !/vypraz|trojobal|cestick|chips|nuget|tempur|pivn|obalov|slanin/.test(bezDia(r.nazov||"")); }
// odhad nasýtených tukov (dáta NMK nemáme): ≥ 25 g kokosového mlieka/smotany, masla, smotany, slaniny, masti alebo tvrdého syra na porciu
const _memoNmk=new Map();
function _nmkVela(r){ let x=_memoNmk.get(r.id); if(x!==undefined) return x; let g=0;
  (r.ingrediencie||[]).forEach(i=>{ const n=bezDia(i.nazov||""); if(i.mnozstvo==null||!/kokosov\w* (mliek|smotan|krem)|smotan|maslo|masla|slanin|mast\b|bravcov\w* mast|eidam|gouda|cheddar|parmezan|niva|hermelin/.test(n)) return;
    const p=najdiPotravinu(i.nazov); g+=(gramy(i,p)||0); });
  x=g/(r.porcie||1)>=25; _memoNmk.set(r.id,x); return x; }
function solNaPorciu(r){ const v=vyzivaReceptu(r); return (v.na||0)*2.5/1000; }
// Dieťa do 6 rokov: celé orechy a arašidy (riziko zadusenia), sušené mäso, proteínové a energetické výrobky (kolo 3: 46 zo 672 jedál).
function maleDieta(){ return stravniciList().some(p=>p&&(p.typ==="dieta1"||p.typ==="dieta4")); }
const _NEVHODNE_MALYM=/orech|oriesk|arasid|mandl|kesu|pistac|lieskov|studentsk|jerky|susen\w*( \w+)? mas|sunk|salam|parky|parok|kabanos|klobas|slanin|uden\w* (kurac|mas|prs|krkov|sunk)|protein|energet|popcorn|cukrik|lizank|hrozn|cherry|prazen\w* cicer|olivy/;
function nevhodneMalym(r){ return (jeVyrobok(r)||!!r._priloha||r.kategoria==="Príloha") && _NEVHODNE_MALYM.test(bezDia((r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" "))); }
const _PALIVE=/chilli|chili|jalapen|chipotle|kajensk|sriracha|habaner|feferon|paliv|harissa|gochuj|sambal|vindaloo|pikant/;
function jePaliveJedlo(r){ return _PALIVE.test(bezDia((r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" "))); }
// 🩺 Diabetes 2. typu (kolo 4): bez dezertov a sladkostí, jedlo s > 60 % energie zo sacharidov nie (biele pečivo,
// sladké raňajky), kúpený snack najviac 20 g sacharidov. Príloha (ryža, zemiaky) ostáva — tanier má mať štvrtinu škrobu,
// množstvo drží porcia a skóre generátora (GEN_SK.dia).
const _SLADKE=/cokol|cukrik|susienk|keks|oblat|puding|zmrzlin|nutel|dzus|limonad|sirup|\bmed(?:om|u|ik)?\b|medov|horalk|kolac|tort|bucht|muffin|donut|sisk|croissant|lekvar|dzem|marmelad|zakusk|karamel|cukrov|babovk|bublanin|vafl|wafl|lievan|livanc|palacin|crepe|francuzsk\w* toast|granol|mazan|paska|strudl|zavin|kolack|perni|brownie|cheesecake|panna cotta|tiramis/;
// Pridaný cukor (cukor, med, sirup, džem, čokoláda…) v gramoch na porciu — kolo 4: 115 receptov s ≥ 10 g prešlo filtrom.
const _CUKOR=/^(cukor|trstinov|kristal|med\b|medu\b|javorov\w* sirup|agavov|sirup|dzem|lekvar|marmelad|cokolad|nutell|karamel|kondenzovan|sladidlo)/;
function pridanyCukor(r){ let g=0; (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null) return; const p=najdiPotravinu(i.nazov), k=bezDia((p&&p.kluc)||i.nazov);
    if(!_CUKOR.test(k)) return; g+=(gramy(i,p)||0)*(i.vsiaknutie>0&&i.vsiaknutie<1?i.vsiaknutie:1); }); return g/(r.porcie||1); }
const _memoDia=new Map();
// Kolo 10: dôvod slovom (detail, bunka) — „" = vhodné
function dovodDiabetu(r){ if(!r||r._priloha) return ""; let x=_memoDia.get(r.id); if(x!==undefined) return x;
  const v=vyzivaReceptu(r), nz=bezDia(r.nazov||""), vyr=jeVyrobok(r), dr=vyr?snackDruh(r):"", podS=v.kcal>0?v.s*4/v.kcal:0;
  const sl=vyr ? ((_SLADKE.test(nz)||/kakao|vanil|ovocn|jahod|cokol/.test(nz)) && dr!=="ovocie" && podS>0.35)
    : (_SLADKE.test(nz) && (pridanyCukor(r)>=5 || r.kategoria==="Pečivo"));
  x=(r.kategoria==="Dezert" || sl) ? "sladké" : pridanyCukor(r)>10 ? "veľa pridaného cukru" : v.s>90 ? "veľa sacharidov"
    : (vyr && _SPRAC.test(nz) && (dr==="mäso"||!/uden|udene|udeny/.test(nz)) && !/tofu|losos|syr|ostiep|parenic|korbac/.test(nz)) ? "spracované mäso"
    : (!vyr && isMain(r) && v.kcal>0 && (v.t||0)*9/v.kcal>0.55) ? "veľa tuku"
    : (!vyr && isMain(r) && jeRybaJedlo(r) && /vypraz|trojobal|chips|pivn\w* cest|tempur|nuget|obalov|cestick/.test(nz)) ? "vyprážané"
    : (v.kcal>0 && (vyr ? (dr==="zelenina" ? v.s>20 : dr==="ovocie" ? v.s>25 : (v.s>20 || podS>0.60)) : podS>0.60)) ? "veľa sacharidov" : "";
  _memoDia.set(r.id,x); return x; }
function nevhodneDiabetu(r){ return !!dovodDiabetu(r); }
// Prečo jedlo v pláne nesedí — bunka to povie slovom, nie len „nesedí s diétou" (kolo 4, diabetik).
function dovodNevhodne(r){ if(!r) return ""; if(!prejdeProfil(r)) return "nesedí s diétou alebo zákazmi"; if(domacnostCitliva()&&nevhodneCitlivym(r)) return "nevhodné pre dieťa alebo tehotnú";
  if(maleDieta()&&nevhodneMalym(r)) return "nevhodné pre malé dieťa"; if(S.profil.diabetes&&nevhodneDiabetu(r)) return "pri diabete nevhodné ("+dovodDiabetu(r)+")";
  if(S.profil.menejSoli&&solNaPorciu(r)>1.5) return "príliš slané"; if(vegPodiel()>0&&jeVyrobok(r)&&!diety(r).veg) return "výrobok s mäsom pre vegetariána"; return "nesedí s nastavením"; }
function vhodnyPrePlan(r){ return !!r && prejdeProfil(r) && !(domacnostCitliva()&&nevhodneCitlivym(r)) && !(maleDieta()&&nevhodneMalym(r)) && !(S.profil.diabetes&&nevhodneDiabetu(r)) && !(vegPodiel()>0&&jeVyrobok(r)&&!diety(r).veg)
  && !(S.profil.menejSoli && solNaPorciu(r)>(jeVyrobok(r)?1:jeRybaJedlo(r)?2:1.5)) && !(!jeVyrobok(r)&&solNaPorciu(r)>5); }
// Červené a spracované mäso na porciu (surové g). WHO/WCRF: najviac ~350–500 g vareného (~700 g surového)
// týždenne. Kolo 2 (výživa): 2×2000 kcal malo 585–637 g a muž 2500 kcal 714 g surového, 54 % týždňov nad limit.
const _SPRAC=/jerky|sunk|slanin|klobas|salam|parok|park|spekacik|kabanos|prosciutto|chorizo|mortadell|pastrami|uden|pastet|oskvark|jerky/;
const _memoCerv=new Map();
function cerveneG(r){ if(!r) return {g:0,sp:0}; let v=_memoCerv.get(r.id); if(v) return v; let g=0, sp=0;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null) return; const p=najdiPotravinu(i.nazov); if(!p||!p.meso||p.oddelenie!=="Mäso a ryby") return;
    const k=bezDia(p.kluc); if((p.alergeny||[]).some(a=>a==="ryby"||a==="kôrovce"||a==="mäkkýše")||/kur|morc|kac|bazant|hydin|sliepk|kurcat|krevet|kalamar/.test(k)) return;
    const x=(gramy(i,p)||0)*(i.vsiaknutie>0&&i.vsiaknutie<1?i.vsiaknutie:1); g+=x; if(_SPRAC.test(k)) sp+=x; });
  v={g:g/(r.porcie||1), sp:sp/(r.porcie||1)}; _memoCerv.set(r.id,v); return v; }
let _tyzCerv=0; // surové g červeného/spracovaného mäsa na osobu, ktoré už generátor tento týždeň dal
let _tyzRyba=0, _tyzBlok=0; // rybacie jedlá a poradie bloku v práve generovanom týždni
function genUniverzum(){ return RECEPTY.filter(r=>r.kategoria!=="Kokteil"&&r.kategoria!=="Nápoj"&&vhodnyPrePlan(r)); }
// ── Typ stravníka a vegetarián v zmiešanej domácnosti (8. 10. 2026) ──────────────────────────
// Batch cooking = jedno jedlo pre všetkých, preto sa obmedzenie dieťaťa / tehotnej uplatní na CELÝ
// plán (generátor, 🎲) — Recepty ich ďalej ukazujú, dospelí ich jesť môžu.
function domacnostCitliva(){ return stravniciList().some(p=>p&&(jeDieta(p)||p.typ==="tehotna")); }
// Alkohol (aj varený — nevyparí sa celý), surové mäso/ryba/vajcia, pečeň, plesňové a nepasterizované syry, káva.
// 2. kolo: chýbala káva v tvaroch („kávový proteínový nápoj" 8× v pláne dieťaťa), plesňový syr, hermelín,
// údený losos, gravlax, carbonara (surový žĺtok), caesar, aioli; naopak „tatarská omáčka" a „surový cukor" padali zbytočne.
const _NEVHODNE_NAZOV=/tatar(?!sk)|\bpho\b|\bmirin|carpacc|sushi|sashimi|ceviche|\bpoke\b|tiramis|carbonar|caesar|cezar|gravlax|uden\w* losos|aioli|domac\w* majonez|surov\w* (vajc|mas|ryb|hovad|losos|zltk)|pecienk|\bpecen\b|pecenov|pastet|\bniva\b|plesnov|hermelin|gorgonzol|roquefort|camembert|\bbrie\b|espresso|\bkav(a|y|u|ou|ov\w*)\b|kofein|energet|\bmatch|steak z tuniak|tuniakov\w* steak/;
const _memoCit=new Map();
function nevhodneCitlivym(r){ if(!r) return false; let v=_memoCit.get(r.id); if(v!==undefined) return v;
  v=_NEVHODNE_NAZOV.test(bezDia((r.nazov||"")+" "+(r.ingrediencie||[]).map(i=>i.nazov).join(" ")))
    || (r.ingrediencie||[]).some(i=>{ const p=najdiPotravinu(i.nazov); return p&&p.oddelenie==="Alkohol"; });
  _memoCit.set(r.id,v); return v; }
// Vegetarián v domácnosti, kde ostatní mäso jedia: jedlo sa varí jedno, mäso sa vegetariánovi nahradí
// tofu. Podiel = jeho kcal / kcal domácnosti (porcie sa delia podľa kcal). 0 = nikto alebo všetci.
function vegPodiel(){ const l=stravniciList(); const sum=l.reduce((a,p)=>a+(+p.kcal||0),0), v=l.filter(p=>p.veg).reduce((a,p)=>a+(+p.kcal||0),0);
  return (sum>0 && v>0 && v<sum)?v/sum:0; }
function vegMena(){ return stravniciList().filter(p=>p.veg).map(p=>p.nazov||"vegetarián"); }
// Ingrediencie na nákup: pri mäsitom jedle v zmiešanej domácnosti mäso × (1 − podiel) a tofu za zvyšok.
// Čím sa živočíšna surovina vegetariánovi nahradí. Tofu len za PEVNÉ mäso a rybu (2. kolo auditu: tofu
// dostával aj za 2 l vývaru a masť). Vývar → zeleninový, masť → olej, želatína → agar (1:10 hmotnosti),
// omáčky/pasty (ustricová, ančovičková) sa len vynechajú. Pevné mäso: oddelenie Mäso a ryby alebo ryba v konzerve.
function _vegNahrada(p){ const k=bezDia(p.kluc);
  if(/vyvar|bujon/.test(k)) return {nazov:"Zeleninový vývar",k:1};
  if(/mast/.test(k)) return {nazov:"Olej",k:1};
  if(/zelatin/.test(k)) return {nazov:"Agar",k:0.1};
  if(/omack|sauce|pasta|pastet/.test(k)) return {nazov:"",k:0};
  if((p.alergeny||[]).includes("ryby")) return {nazov:"Cícer",k:1.3,strukovina:true};
  return {nazov:"Tofu",k:1.5,tofu:true}; }
function ingrediencieNaNakup(r){ const vp=vegPodiel(); if(!vp || r._priloha || jeVyrobok(r) || diety(r).veg) return r.ingrediencie||[];
  const pridaj={}; const out=(r.ingrediencie||[]).map(i=>{ const p=i.mnozstvo!=null&&najdiPotravinu(i.nazov);
    if(!p||!p.meso) return i; const n=_vegNahrada(p), g=gramy(i,p)||0;
    // pod 40 g mäsa na porciu (slanina na ochutenie) sa len vynechá — tofu za 15 g slaniny nedáva zmysel (kolo 4, kuchár)
    if(n.nazov&&g>0&&(!(n.tofu||n.strukovina)||g/(r.porcie||1)>=40)) pridaj[n.nazov]=(pridaj[n.nazov]||0)+g*n.k;
    return Object.assign({},i,{mnozstvo:i.mnozstvo*(1-vp),poznamka:(i.poznamka?i.poznamka+", ":"")+"bez vegetariánskej porcie"}); }); // kolo 8: prečo je mäsa menej
  Object.keys(pridaj).forEach(n=>{ const g=Math.round(pridaj[n]*vp); if(g>0) out.push({nazov:n,mnozstvo:g,jednotka:/vyvar/.test(bezDia(n))?"ml":"g",poznamka:"pre vegetariána"}); });
  return out; }
function vegNahradaText(r){ const vp=vegPodiel(); if(!vp || !r || r._priloha || jeVyrobok(r) || diety(r).veg) return "";
  // kolo 7 (kuchár, používateľ): tofu/cícer sľúb len tam, kde ho nákup naozaj pridá (≥ 40 g mäsa na porciu, ako ingrediencieNaNakup)
  // kolo 8: celé názvy surovín (nie kmene „slanin"), drobné mäso v jednej vete, náhrada povedaná raz
  let kus=false, ryba=false; const odob=[], ine=[]; const nm=i=>String(i.nazov||"").replace(/\s*\(.*?\)\s*/g," ").trim().toLowerCase();
  (r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov); if(p&&p.meso){ const x=_vegNahrada(p);
    const velke=(x.tofu||x.strukovina)&&i.mnozstvo!=null&&(gramy(i,p)||0)/(r.porcie||1)>=40;
    if(velke){ kus=true; if(x.strukovina) ryba=true; }
    else if(x.tofu||x.strukovina) odob.push(nm(i));
    else ine.push(x.nazov?nm(i)+" → "+x.nazov.toLowerCase():"vynechaj "+nm(i)); } });
  const nn=bezDia((r.nazov||"")+" "+(r.kategoria||"")), zaklad=/gulas|kari|curry|omack|polievk|chili|ragu|rizot|perkelt|dusen|stew|lecho|paprikas/.test(nn), skladane=/sendvic|wrap|bageta|bagel|burger|tortill|pita|toast|salat|steak|rezen|spiz/.test(nn);
  const n=[]; const nahr=ryba?"cícer":"tofu";
  if(kus) n.push(skladane?nahr+" priprav zvlášť a vlož namiesto "+(ryba?"ryby":"mäsa"):zaklad?"pred pridaním "+(ryba?"ryby":"mäsa")+" odober časť do vlastného hrnca a "+nahr+" opeč zvlášť":nahr+" opeč zvlášť a daj na tanier namiesto "+(ryba?"ryby":"mäsa"));
  if(odob.length) n.push("porciu bez mäsa odober pred pridaním: "+[...new Set(odob)].join(", "));
  ine.forEach(x=>n.push(x));
  return n.length?"🌱 "+vegMena().join(", ")+": "+n.join("; "):""; }
function _poolPreSlotVypocet(slot){
  let pool=genUniverzum();
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
  } else test=r=>!(cenaNa100(r)>ref*CENA_LUX*(jeRybaJedlo(r)?2:1)); // ryba je výživa, nie luxus: strop 2× vyšší
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
// Zoznamy vyššie sú KURÁTOROVANÉ JADRO, nie celý výber. Keď boli jediným zdrojom, 21 položiek
// na 210 snackových dní znamenalo, že sa ten istý doplnok nominoval stále dokola (namerané:
// najčastejší snack 12× za 30 týždňov). Preto sa jadro dopĺňa o VŠETKY výrobky z katalógu,
// ktoré spĺňajú tie isté podmienky ako náhradná vetva (`_snackDoplKandidati`) — ovocie podľa
// druhu, bielkovinový doplnok podľa g/100 kcal — obmedzené na veľkosť jadra, aby dvojica
// nenarástla. Kurátorované id zostávajú na začiatku, takže sa uprednostnia.
function _snackDoplZoznamy(){ if(_snackDoplCache) return _snackDoplCache;
  const ok=z=>z.filter(id=>{ const r=receptById(id); return !!r && jeVyrobok(r) && r.kategoria==="Snack"; });
  const jadro={O:ok(SNACK_DOPL_OVOCIE),B:ok(SNACK_DOPL_BIELKOVINA)};
  const strop=t=>{ const k=jadro[t].map(id=>kcalPorcia(receptById(id))).filter(x=>x>0);
    return k.length?Math.max.apply(null,k):SNACK_SOLO_KCAL*2; };
  const rozsir=(t,test)=>{ const max=strop(t), mam=new Set(jadro[t]);
    const dalsie=RECEPTY.filter(x=>x&&x.kategoria==="Snack"&&jeVyrobok(x)&&!mam.has(x.id)
      && kcalPorcia(x)>0 && kcalPorcia(x)<=max && test(x))
      .sort((a,b)=>String(a.id).localeCompare(String(b.id),"sk")).map(x=>x.id);
    return jadro[t].concat(dalsie); };
  _snackDoplCache={
    O:rozsir("O",x=>snackDruh(x)==="ovocie"),
    B:rozsir("B",x=>bielkovinyNa100(x)>=SNACK_DOPL_B100)};
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
  // doplnok je jedlo na tanieri ako každé iné: pri „bez laktózy" nesmie prísť skyr, pri „bez rýb" tuniak
  // (zoznamy sú cachované bez ohľadu na profil, preto sa filtruje tu). Keď neprejde žiadny, snack ostane sám.
  let kand=z.filter(id=>id!==r.id && vhodnyPrePlan(receptById(id)));
  if(S.profil.diabetes){ const s0=vyzivaReceptu(r).s||0; kand=kand.filter(id=>s0+(vyzivaReceptu(receptById(id)).s||0)<=25); } // 🩺 dvojica spolu ≤ 25 g sacharidov
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
    && (trieda==="O" ? snackDruh(x)==="ovocie" : bielkovinyNa100(x)>=SNACK_DOPL_B100)
    && (!S.profil.diabetes || (vyzivaReceptu(r).s||0)+(vyzivaReceptu(x).s||0)<=25)); }
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
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka") return natierkaPriloha();
  return null; }
function jedloVyziva(r,slot,rot){
  // kľúč nesie samotnú prílohu — zoznam kandidátov má pre každú kuchyňu inú dĺžku, takže `rot % n` nestačí
  const kl=_genCache?(slot+"|"+(jeHlavnyChodSlot(slot)?prilohaPre(r,rot):"")+"|"+r.id):null;
  if(kl!==null){ const c=_genCache.jedlo.get(kl); if(c!==undefined) return c; }
  const vys=_jedloVyzivaVypocet(r,slot,rot);
  if(kl!==null)_genCache.jedlo.set(kl,vys);
  return vys; }
function _jedloVyzivaVypocet(r,slot,rot){
  const v=vyzivaReceptu(r); let k=kcalPorcia(r), b=v.b, vl=v.vl||0, ce=v.cena||0, sa=v.s||0, na=v.na||0;
  const t=prilohaTokenPre(r,slot,rot);
  if(t){ const c=komponent(t); if(c){ const w=vyzivaReceptu(c); k+=kcalPorcia(c); b+=w.b; vl+=w.vl||0; ce+=w.cena||0; sa+=w.s||0; na+=w.na||0; } }
  // R1: `c` = € za PORCIU celého jedla vrátane prílohy. Bez prílohy by generátor porovnával cenu
  // hlavného chodu s rozpočtom slotu, do ktorého sa potom zapíše jedlo aj s ryžou za 0,20 € —
  // presne tá istá chyba, akú mal pred opravou K1 kcal.
  const tu=(v.t||0)+(t&&komponent(t)?(vyzivaReceptu(komponent(t)).t||0):0);
  return {k:k,b:b,vl:vl,c:ce,s:sa,na:na,t:tu,d:(k>5?b/(k/100):0)}; }
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
function _genCacheReset(zapni){ _genCache = zapni ? {vaha:new Map(), jedlo:new Map(), pool:new Map(), med:new Map(), pril:new Map()} : null; }
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
// v31: hodnotenie a obľúbené sú NÁSOBOK okolo neutrálu, nie prirážka. Do v30 bolo `w=1+hodn`,
// takže aj 1★ malo 2× vyššiu šancu než nehodnotené jedlo. Teraz 3^(h−3): nehodnotené = 3★ = 1,
// 4★ = 3, 5★ = 9, 1★ = 0,11; ½ obľúbené ×1,3, ★ ×1,8. Je to len predvýber do turnaja, takže
// výsledok je miernejší; preto má hodnotenie aj člen GEN_SK.hodn v skoreJedla (víťaz turnaja).
// Namerané 4. 10. (6 seedov × 12 týždňov): 5★ obed 2,5–2,9× častejšie, 1★ 0,3×.
// „Viac, nie stále" drží ctx.pouzite (nič dvakrát v týždni) a 22-týždňová pamäť nedavneRecepty
// (žiadny 5★ obed nebol za 12 týždňov dvakrát). Kontrola: test_generator.js „H1".
// Hodnota sa prevedie na číslo a zovrie: reťazec „5" zo zálohy by inak spravil „15".
const FAV_VAHA={0:1,0.5:1.3,1:1.8};
// Neoverený návrh (recept napísaný strojovo, nikto ho neuvaril) má polovičnú váhu, kým ho niekto
// neohodnotí — audit 8. 10.: tvorili 48 % varených jedál v pláne.
const ZDROJ_NAVRH="Jedlo — návrh (neoverený)";
function hodnVaha(id){ const h=+S.hodn[id]; if(h>0&&isFinite(h)) return Math.pow(3,Math.min(5,Math.max(0.5,h))-3);
  return jeNavrh(id)?0.5:1; }
let _navrhy={n:-1,set:null}; // receptById je lineárne a hodnVaha sa volá pri radení celého katalógu
function jeNavrh(id){ if(_navrhy.n!==RECEPTY.length) _navrhy={n:RECEPTY.length,set:new Set(RECEPTY.filter(r=>r.zdroj===ZDROJ_NAVRH).map(r=>r.id))};
  return _navrhy.set.has(id); }
function oblubenostVaha(id){ return hodnVaha(id)*FAV_VAHA[favStupen(id)]; }
function _vahaVypocet(r,slot){ let w=1; if(jeSezonne(r))w+=0.8; if(jeVakcii(r))w+=1.2; if(jeWatch(r))w+=1.0; w+=expBoost(r);
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
  // Zmiešaná domácnosť (jeden vegetarián): bezmäsité jedlo netreba upravovať — má prednosť.
  if(isMain(r) && vegPodiel()>0 && diety(r).veg) w*=3;
  if(S.profil.domaca && isMain(r) && DOMACE_KUCHYNE.test(bezDia((r.kuchyna||"").toLowerCase()))) w*=3; // senior: halušky, kapustnica, sviečková
  if(maleDieta() && jePaliveJedlo(r)) w*=0.2; // malé dieťa pálivé nezje (kolo 3: Huevos Rancheros, 40 g chilli)
  // kolo 3 (rodič): exotické kuchyne 24 % plánu rodiny s 5-ročným — známe chute majú pri malom dieťati prednosť
  if(maleDieta() && isMain(r) && r.kuchyna && !/slovensk|cesk|madarsk|nemeck|rakusk|polsk|talian|americk|francuz|britsk|grec|stredomor|medzinarod/.test(bezDia(r.kuchyna.toLowerCase()))) w*=0.5;
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
  w*=oblubenostVaha(r.id);
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
const GEN_SK={turnaj:24, b:1.15, kcal:1.0, vl:0.7, vlCiel:2.0, vlSilne:2.0, vlCielSilne:3.0, cena:0.9, cenaMax:1.0, hodn:0.3, ryba:0.03, vegMix:0.3, domaca:0.45, dojed:0.5, maso:0.25, dia:1.0, sol:0.5, cas:0.4, rybaChyba:1.0};
// mäkký strop: jedlo drahšie než CENA_LUX × rozpočet slotu sa z poolu vyradí, ale len ak
// v poole zostane aspoň MIN_POOL kandidátov. Toto je hlavná brzda na krevety/lososa/morského čerta.
const CENA_LUX=3.0;
// K14: vláknina má dva režimy. V bežnom výbere je len jemná preferencia (0,62) — silná váha
// súťaží s bielkovinami a kcal a zhoršila oba. Vlastný vlákninový prechod si ju na chvíľu
// zosilní; jeho výmeny sú aj tak zovreté tak, že bielkoviny ani kcal zhoršiť nesmú.
let _vlakninaRezim=false;
// C: strop bielkovín. cieloveMakra dáva CIEĽ 30 % energie a zlepsiBielkoviny naň deň vytiahne,
// ale nadol deň neťahalo nič: cez 12 týždňov pri cieli 2000 kcal skončilo 27,4 % dní nad 35 %
// energie z bielkovín, medián 31,9 %, najhorší deň 44,5 %. 35 % je horná hranica pásma AMDR
// (10–35 % energie). V tomto režime skóre odmieňa NIŽŠIU hustotu bielkovín — rovnaká mechanika
// ako `_vlakninaRezim`, len opačným smerom, a zapína sa výhradne v znizBielkoviny().
let _bielStropRezim=false;
// Kolo 3 (výživa): pri 2000+ kcal 35 % energie dávalo ~2 g/kg (27 % energie pri cieli 20 %). Bielkoviny sa
// potrebujú podľa hmotnosti, nie energie — strop je preto aj v gramoch (nikdy nie pod cieľom stravníka).
const B_STROP_PODIEL=0.30, B_STROP_G=115;
function stropBielkovin(ciel){ if(!(ciel>0))return 0; const cielB=(cieloveMakra(ciel)||{}).b||0;
  return Math.max(cielB, Math.min(ciel*B_STROP_PODIEL/4, B_STROP_G)); }
function skoreJedla(r,slot,cielK,rot,cielC){
  const v=jedloVyziva(r,slot,rot);
  const wv=_vlakninaRezim?GEN_SK.vlSilne:GEN_SK.vl, cv=_vlakninaRezim?GEN_SK.vlCielSilne:GEN_SK.vlCiel;
  // vláknina sa počíta ako HUSTOTA (g/100 kcal), nie absolútne gramy. S absolútnymi gramami
  // nemohol 145 kcal snack nikdy získať vlákninový bod a skóre ho tlačilo hore — snack potom
  // prerástol raňajky a padalo pravidlo poradia R > S.
  const vlD=v.k>5?v.vl/(v.k/100):0;
  let s=(_bielStropRezim ? GEN_SK.b*(1-Math.min(1,v.d/HS_HI)) : GEN_SK.b*Math.min(1.25,v.d/HS_HI))
        + wv*Math.min(1,vlD/cv);
  if(cielK>0 && v.k>0) s+=GEN_SK.kcal*(1-Math.min(1,Math.abs(v.k-cielK)/cielK));
  // R4: cena je POKUTA nad rozpočtom, nie bonus pod ním. Kritérium výživy tak nemôže prehrať
  // s cenou pri dvoch rovnako drahých jedlách a lacné jedlo si skóre nekupuje samotnou lacnosťou.
  if(cielC>0 && v.c>0) s-=GEN_SK.cena*Math.min(GEN_SK.cenaMax,Math.max(0,(v.c-cielC)/cielC));
  // v32: hodnotenie a ★ aj pri VÍŤAZOVI turnaja, nie len pri vstupe doň. Keď kcal-okno a kotvy
  // zúžia výber pod 24 kandidátov, váha pri vstupe nerozhodne a 5★ obed vychádzal len 1,2×
  // častejšie. log₉ → 5★ +hodn, 1★ −hodn, nehodnotené 0 — bez hodnotení sa skóre nemení.
  s+=GEN_SK.hodn*Math.log(oblubenostVaha(r.id))/Math.log(9);
  // Ryba 1–2× týždenne (WHO/EFSA). Audit 8. 10.: 54–67 % týždňov bez ryby. S týmto bonusom a 2× vyšším
  // cenovým stropom pre rybu (3 seedy × 8 týž.): 0,9–2 rôzne rybacie jedlá/týž., bez ryby 4–29 % týždňov.
  // Pozor: 0,3 dalo 3–4,5 rybacích jedál týždenne — batch ich naťahuje na 2–3 dni, takže skoro denne.
  if(GEN_SK.ryba && isMain(r) && jeRybaJedlo(r)) s+=GEN_SK.ryba+(!_tyzRyba&&_tyzBlok>=1&&_rybaVhodna(r)?GEN_SK.rybaChyba:0); // týždeň bez ryby dostane rybu v ďalšom bloku
  // Jeden vegetarián v domácnosti: bezmäsité jedlo ušetrí náhradu tofu (váha ×3 v predvýbere nestačila —
  // turnaj na hustote bielkovín vyberal mäso, bezmäsitých hlavných bolo 19 %).
  if(GEN_SK.vegMix && isMain(r) && diety(r).veg && vegPodiel()>0) s+=GEN_SK.vegMix;
  { const due=dueSkore(r); if(due) s+=GEN_SK.dojed*Math.min(1,due/20); } // zásoby pred expiráciou
  if(GEN_SK.maso && isMain(r)){ const c=cerveneG(r); if(c.g>0){ const nad=(_tyzCerv+c.g*3)/700; // ~3 dni bloku
    s-=GEN_SK.maso*Math.min(1,c.g/150)*(nad>1?1.6:0.5) + (c.sp>30?GEN_SK.maso*0.6:0); } }
  // 🏡 domáca kuchyňa — váha ×3 v predvýbere nestačila (13 → 14 zo 42 hlavných), turnaj musí vedieť tiež
  if(S.profil.domaca && isMain(r) && DOMACE_KUCHYNE.test(bezDia((r.kuchyna||"").toLowerCase()))) s+=GEN_SK.domaca;
  // Kolo 4 (výživa): bez 🧂 generátor soľ nevidel — 6,5 g/deň, 58 % dní nad 5 g (WHO). Mierna pokuta nad 0,25 g soli
  // na 100 kcal (= 5 g pri 2000 kcal); spracované mäso stojí body aj v raňajkách a snackoch, nielen v hlavnom jedle.
  // Kolo 5 (rodič): 16 z 36 blokov malo cez 3 h varenia. Dlhé jedlo (nad 60 min, plná pokuta pri 3 h) stojí body;
  // čakanie cez noc (marináda, namáčanie) sa neráta — robí sa deň vopred.
  if(GEN_SK.cas && !jeVyrobok(r)){ let m=casMin(r); if(m>=999) m=0; if(pripravaVopred(r)&&m>=180) m=Math.min(m,120); if(m>60) s-=GEN_SK.cas*Math.min(1,(m-60)/120); }
  // kolo 8 (výživa, diabetik): úľava rybe len pre neprážanú rybu do 2 g soli na porciu a nikdy pri malom dieťati —
  // celá výnimka v kole 7 pustila do plánu fish & chips (4,8 g soli) a slané rybacie polievky
  const rybaUlava=_rybaUlava(r);
  if(GEN_SK.sol && v.k>0){ const sd=(v.na||0)*2.5/1000/(v.k/100); const pr=5/(Math.max(1500,S.profil.kcal||2000)/100)*(rybaUlava?1.5:1); s-=GEN_SK.sol*Math.min(1,Math.max(0,(sd-pr)/0.35)); } // prah = 5 g na celý deň
  if(GEN_SK.maso && !isMain(r)){ const c=cerveneG(r); if(c.sp>15) s-=GEN_SK.maso*Math.min(1,c.sp/50); }
  if(S.profil.diabetes && v.k>0 && (!jeVyrobok(r)||!["orechy","ovocie"].includes(snackDruh(r)))){ const th=(v.t||0)*9/v.k; s-=GEN_SK.dia*(rybaUlava?0.4:1.4)*Math.min(1,Math.max(0,(th-0.32)/0.15)); }
  if(S.profil.diabetes && jeVyrobok(r) && snackDruh(r)==="syr") s-=GEN_SK.dia*0.4; // 🩺 syrový snack nesie nasýtené tuky (kolo 8)
  if(!jeVyrobok(r) && _nmkVela(r)) s-=S.profil.diabetes?GEN_SK.dia*0.5:0.25; // nasýtené tuky — proxy podľa surovín (kolo 9; WHO < 10 % E platí pre každého, kolo 10)
  if(S.profil.diabetes && cielK>0 && !jeVyrobok(r)){ const cs=cielK*0.45/4; if((v.s||0)>cs) s-=GEN_SK.dia*0.7*Math.min(1,((v.s||0)-cs)/cs); } // 🩺 sacharidy na JEDLO nad cieľ slotu
  if(S.profil.diabetes && v.k>0){ const sh=(v.s||0)*4/v.k; s-=GEN_SK.dia*Math.min(1,Math.max(0,(sh-0.40)/0.2)); s+=GEN_SK.dia*0.5*Math.min(1,vlD/cv); }
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
// Skutočné recepty z kategórie Príloha, ktoré generátor strieda so základnými `prf:` prílohami.
// Zoznam je RUČNÝ: kategória Príloha je zmes — sú v nej aj omáčky, nakladačky, chipsy, pečivo
// na pečenie a celé jedlá (sviečková, kačacie stehná), ktoré sa k hlavnému jedlu nedávajú.
// Nový recept-príloha sa do generátora dostane až zápisom sem.
// Rodina určuje kuchyňu: k ázijskej len ryža, knedľa a kapusta len k stredoeurópskej.
const PRILOHY_RECEPTY={
  ryza:["priloha-ryza-varena","priloha-ryza-cibulka","chutna-dusena-ryza","priloha-ryza-jazminova","basmati-ryza-s-bylinkami"],
  zemiaky:["priloha-zemiaky-varene","priloha-pecene-zemiaky","priloha-americke-zemiaky","zemiakova-kasa","zapekane-zemiaky-so-syrom","zemiakove-placky","patatas-bravas"],
  obilnina:["priloha-bulgur-s-petrzlenovou-vnatou","priloha-krupy-so-zeleninou","priloha-pohanka-s-cibulkou","priloha-quinoa-s-mandlami","priloha-kuskus","bulgur-so-zeleninou"],
  zelenina:["priloha-pecena-korenova-zelenina","grilovana-zelenina","pecena-zelenina-s-balzamikovym-octom","karfiolove-pyre","dynstuvana-zelenina"],
  domace:["varena-knedla","kysnute-knedle","moje-nadychane-knedle","zemiakove-knedle","priloha-dusena-kapusta-s-jablkom","marinovana-cervena-kapusta-k-pecenemu-masu"]
};
const DOMACE_KUCHYNE=/slovensk|cesk|madarsk|nemeck|rakusk|polsk/;
function kuchynaPrilohy(kuchyna){ const k=(kuchyna||"").toLowerCase();
  return ASIJSKE.some(a=>k.includes(a))?"az":(DOMACE_KUCHYNE.test(bezDia(k))?"dom":"ine"); }
// Kandidáti na prílohu pre skupinu kuchyne. Index 0 je základná `prf:` príloha ako doteraz
// (`potrebujePrilohu`, `ulozDoPlanu` aj E2E 03-detail stoja na `prilohaPre(r,0)`); recepty rodín
// idú za ňou striedavo po jednom, aby dva po sebe idúce sloty nedostali dve ryže.
const _prilohyKuchyne={};
function prilohyPreKuchynu(kl){ if(_prilohyKuchyne[kl]) return _prilohyKuchyne[kl];
  const rod=kl==="az"?["ryza"]:["ryza","zemiaky","obilnina","zelenina"].concat(kl==="dom"?["domace"]:[]);
  const zoz=rod.map(f=>PRILOHY_RECEPTY[f]), out=kl==="az"?["prf:ryza"]:CARB_PRILOHY.slice();
  for(let i=0;zoz.some(z=>i<z.length);i++) zoz.forEach(z=>{ if(i<z.length) out.push(z[i]); });
  return (_prilohyKuchyne[kl]=out); }
// Recept-príloha, ktorý neprejde profilom (alergén, skrytý, vypnutý zdroj) alebo neexistuje, sa preskočí.
// Profil sa počas generovania nemení, takže výsledok stačí držať na jeden beh (`receptById` je lineárne).
function _prilohaPrejde(id){ if(_genCache&&_genCache.pril.has(id)) return _genCache.pril.get(id);
  const p=id.indexOf("prf:")===0?komponent(id):receptById(id), v=vhodnyPrePlan(p); if(_genCache)_genCache.pril.set(id,v); return v; }
// B3: pravidlo pre rozsah dní platí pre CELÝ blok, ak ho má ktorýkoľvek jeho deň (blok má na slot
// jedno jedlo pre všetky dni). Dovtedy rozhodoval len prvý deň bloku: „Št bezmäso" v bloku St–Pi
// platilo v 8 % týždňov. Najprísnejšie vyhráva: bezmäso, ak ho má aspoň jeden deň; čas = minimum;
// kuchyňa = prvý deň bloku, ktorý ju predpisuje. `dni` = dni bloku, v ktoré sa je doma (dniDoma).
const _vRozsahu=(x,dni)=>dni.some(di=>di>=x.od&&di<=x.do);
function filterKuchynaPreDni(dni){ const f=(S.genCfg.filtre||[]).find(x=>x.kuchyna&&_vRozsahu(x,dni)); return f?f.kuchyna:null; }
function pravidloPreDni(dni){ const fs=(S.genCfg.filtre||[]).filter(x=>_vRozsahu(x,dni)); if(!fs.length)return null;
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
// ktorý reálne nikde nie je. To isté platí pre recept-prílohu hlavného jedla (PRILOHY_RECEPTY).
function _uvolniKomp(comp,ctx){ (comp||[]).forEach(id=>{ if(typeof id==="string"&&id.indexOf("prf:")!==0)ctx.pouzite.delete(id); }); }
function _zaberKomp(comp,ctx){ (comp||[]).forEach(id=>{ if(typeof id==="string"&&id.indexOf("prf:")!==0)ctx.pouzite.add(id); }); }
function vratSlot(denPlan,slot,ctx,zaloha){
  const teraz=denPlan[slot]&&denPlan[slot][0]; if(teraz)ctx.pouzite.delete(teraz);
  _uvolniKomp(denPlan[slot],ctx);
  const stary=zaloha&&zaloha[0];
  if(zaloha){ denPlan[slot]=zaloha; if(stary)ctx.pouzite.add(stary); _zaberKomp(zaloha,ctx);
    const r0=komponent(stary); if(r0)ctx.stopa[slot]=_stopaPre(r0,slot); else delete ctx.stopa[slot]; }
  else { delete denPlan[slot]; delete ctx.stopa[slot]; }
}
function zlozSlot(r,slot,ctx){
  ctx.pouzite.add(r.id);
  ctx.stopa[slot]=_stopaPre(r,slot);
  const comp=[r.id];
  // recept-príloha: nie dvakrát v týždni (`pouzite`) ani v susednom týždni — pamäť len najkratšieho
  // stupňa (~2 týždne); dlhšia by pri ~25 receptoch-prílohách nechala len základné `prf:`
  if(jeHlavnyChodSlot(slot)){ const pam=(ctx.nedavne||[])[(ctx.nedavne||[]).length-1];
    const pr=prilohaPre(r,ctx.prilRot++,{has:t=>ctx.pouzite.has(t)||!!(pam&&pam.has(t))});
    if(pr){ comp.push(pr); _zaberKomp([pr],ctx); } }
  if(jeNatierkovySlot(slot) && r.kategoria==="Nátierka"){ const np=natierkaPriloha(); if(np) comp.push(np); }
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
  _uvolniKomp(zalohaK,ctx);
  // K18: doterajší recept sa z výberu vylúči. Predtým sa len uvoľnil z „použitých", turnaj ho
  // ako najlepší v okne vrátil znova a prehodSlot ohlásil neúspech — opravDen sa potom vzdal
  // s dňom o 300 kcal vedľa. Týkalo sa to práve blokov s úzkym poolom (všedné raňajky = 48
  // sendvičov), kde je opakovaná voľba najpravdepodobnejšia.
  const r=vyberDoSlotu(slot,ctx,potrebaK,minB100,medze,stary);
  if(!r || r.id===stary){ if(stary)ctx.pouzite.add(stary); _zaberKomp(zalohaK,ctx); return false; }
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
// B3: KOTVA (zamknuté jedlo / „Zachovať") je pre opravné prechody nedotknuteľná. Stráž je tu,
// vo VOLAJÚCICH, nie v prehodSlot/vratSlot: každý prechod si pevný slot vyradí z kandidátov,
// no do kcal dňa a medzí poradia ho počíta ďalej.
function _pevny(ctx,s){ return !!(ctx&&ctx.pevne&&ctx.pevne.has(s)); }
function zarovnajObedVeceru(denPlan,ctx){
  if(!(denPlan.Obed&&denPlan.Obed.length&&denPlan.Večera&&denPlan.Večera.length)) return false;
  if(_pevny(ctx,"Obed")||_pevny(ctx,"Večera")) return false; // výmena by kotvu presunula do iného slotu
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
    napln.forEach(s=>{ if(!denPlan[s].length||_pevny(ctx,s))return;
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
    napln.forEach(s=>{ if(_pevny(ctx,s))return; let v=0; denPlan[s].forEach(id=>{ const c=komponent(id); if(c)v+=vyzivaReceptu(c).vl||0; });
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
// C: „stiahni bielkoviny pod strop" — zrkadlo zlepsiBielkoviny. Beží len na dni, ktoré sú NAD
// stropom, a výmena sa prijme len vtedy, keď deň zostane platný (kcal v pásme + poradie jedál),
// bielkoviny naozaj klesnú a NEKLESNÚ pod denný cieľ. Preto strop nemôže vyrobiť chudobný deň:
// v konflikte výmena jednoducho neprejde a deň ostane taký, aký bol.
function znizBielkoviny(denPlan,sloty,ctx,ciel){
  const strop=stropBielkovin(ciel); if(!(strop>0)) return;
  _bielStropRezim=true;
  try{ bezRozpoctu(()=>_znizBielkoviny(denPlan,sloty,ctx,ciel,strop)); }
  finally { _bielStropRezim=false; } }
function _znizBielkoviny(denPlan,sloty,ctx,ciel,strop){
  const cielB=(cieloveMakra(ciel)||{}).b||0;
  const hustotaStropu=strop/(ciel/100); // g bielkovín na 100 kcal, ktoré deň ako celok znesie
  const pokusy={}; const MAX_POKUS=6;
  const odchylka=()=>Math.abs(denKcal(denPlan,sloty)-ciel);
  for(let i=0;i<30;i++){
    const b=denBielkovinyPoSkal(denPlan,sloty,ciel); if(b<=strop) return;
    const d0=odchylka(), tolK=Math.max(ciel*0.06,d0);
    const napln=sloty.filter(s=>denPlan[s]&&denPlan[s].length&&(pokusy[s]||0)<MAX_POKUS);
    // slot s najväčším PREBYTKOM nad hustotou stropu (kcal × koľko g/100 kcal je navyše)
    let naj=null,najPreb=0;
    napln.forEach(s=>{ if(_pevny(ctx,s))return; const preb=mealKcal(denPlan[s])*Math.max(0,slotHustota(denPlan[s])-hustotaStropu)/100;
      if(preb>najPreb){ najPreb=preb; naj=s; } });
    if(!naj) return;
    pokusy[naj]=(pokusy[naj]||0)+1;
    const zaloha=denPlan[naj].slice();
    const kc={}; napln.forEach(s=>{ kc[s]=mealKcal(denPlan[s]); });
    if(!prehodSlot(denPlan,naj,ctx,mealKcal(zaloha),0,medzePoradia(napln,naj,kc))) continue;
    const nove=denBielkovinyPoSkal(denPlan,sloty,ciel);
    if(denJeOk(denPlan,sloty,ciel) && nove<b && nove>=cielB && odchylka()<=tolK) continue;
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
    napln.forEach(s=>{ if(_pevny(ctx,s))return; let c=0; denPlan[s].forEach(id=>{ const k=komponent(id); if(k)c+=vyzivaReceptu(k).cena||0; });
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
      if((pokusy[sl]||0)>=MAX_POKUS||_pevny(ctx,sl)) continue;
      pokusy[sl]=(pokusy[sl]||0)+1;
      if(skusPrehod(denPlan,sl,ctx,Math.max(60,cielK),0,tvrdeMedze(sl),lepsie)){ ok=true; break; }
    }
    if(!ok){
      const p0v=ctx.vsednyBlok; ctx.bezPamate=true; if(maly==="Raňajky")ctx.vsednyBlok=false;
      try{ for(const [sl,cielK] of [[maly,kcal[velky]*0.7],[maly,kcal[velky]*0.45],[velky,kcal[maly]*1.3]]){
        if(!_pevny(ctx,sl) && skusPrehod(denPlan,sl,ctx,Math.max(60,cielK),0,tvrdeMedze(sl),lepsie)){ ok=true; break; } } }
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
          .filter(x=>x.d>-0.5&&!_pevny(ctx,x.s)).sort((a,b)=>b.d-a.d);
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
      if(!_pevny(ctx,maly) && skusPrehod(denPlan,maly,ctx,Math.max(60,kcal[velky]*0.75),0,medz(maly),menej)) continue;
      if(!_pevny(ctx,velky) && skusPrehod(denPlan,velky,ctx,kcal[maly]*1.35,0,medz(velky),menej)) continue;
    }
    // (c) bielkoviny dňa pod 80 % cieľa → prehoď slot s najhorším pomerom bielkovín
    if(cielB>0){
      const db=denBielkovinyPoSkal(denPlan,napln,ciel);
      // K3: prah 0,8 → 0,9 a hustota sa meria na celom slote vrátane prílohy
      if(db<cielB*0.9){
        let naj=null,najB=1e9;
        napln.forEach(s=>{ if(!denPlan[s].length||_pevny(ctx,s))return; const b=slotHustota(denPlan[s]); if(b<najB){najB=b;naj=s;} });
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
// v29: snack je v bloku ROVNAKY, ako kazde ine jedlo bloku.
// Do v29 sa losoval na kazdy den zvlast (pestrost), lenze nakupovat sa tym musel kazdy den
// iny vyrobok — 7 druhov na tyzden namiesto 3, cize viac otvorenych baleni a drahsi nakup.
// Funkcia uz nevyraba per-denne varianty, len zaregistruje druh zakladneho snacku do ctx,
// aby pestrost medzi BLOKMI fungovala dalej.
function snackyPoDnoch(denPlan,sloty,dni,ctx,ciel){
  sloty.forEach(slot=>{ if(!jeSnackSlot(slot))return;
    const zaklad=denPlan[slot]; if(!zaklad||!zaklad.length)return;
    const r0=komponent(zaklad[0]); if(r0&&ctx.snackDruhy)_pridajDruh(ctx,snackDruh(r0));
  });
  return {}; }
// `bezKotiev` (🎲 Zamiešať): „Zachovať už naplánované jedlá" sa neuplatní — zamiešať plný týždeň
// so zapnutými kotvami by inak neurobilo nič. Zamknuté jedlá (🔒) platia vždy.
async function generujJedalnicek(zamiesaj,bezKotiev){ const _od0=S.viewOd;
  const cfg=S.genCfg||{}; const zachovat=!!cfg.zachovat && !bezKotiev;
  const naplnene=[0,1,2,3,4,5,6].map(datumPre).some(iso=>S.plan[iso]&&Object.keys(S.plan[iso]).length);
  if(naplnene && !zamiesaj && !zachovat && !await confirmModal("Vygenerovať nový jedálniček? Prepíše sa tento týždeň.","Prepísať")) return;
  // B3: plný týždeň + „Zachovať" = generátor nemá čo dopĺňať a dovtedy ticho neurobil nič
  const dniT=[0,1,2,3,4,5,6];
  if(zachovat && dniT.some(di=>slotyDna(di).length) && dniT.every(di=>slotyDna(di).every(sl=>slotIds(di,sl).length))){
    toast("Týždeň je plný a „Zachovať už naplánované jedlá“ je zapnuté — nie je čo dopĺňať. Nový týždeň: vypni to v ✨ Zostaviť jedálniček, alebo ⋯ Viac → 🎲 Zamiešať.");
    return; }
  zapamatajTyzden();
  // B3: KOTVA = zamknuté jedlo (🔒) alebo, pri „Zachovať", každé už naplánované. Kotva sa vloží do
  // bloku a opravné prechody ju NESMÚ vymeniť (ctx.pevne) — dovtedy ju vložil len prvý výber
  // a kcal/bielkovinové prechody ju vzápätí prehodili (obed 881 kcal prežil 0 z 8 behov).
  const kotva=(di,sl)=>jeZamknute(di,sl)||(zachovat&&slotIds(di,sl).length>0);
  const pouzite=new Set(), pouziteBazy=new Set(), plan={}, planF={}, snackDruhy=new Map();
  const stupne=t=>PAMAT_STUPNE.map(x=>nedavneRecepty(Math.max(2,Math.round(t*x))));
  const nedavne=stupne(TYZDNE_PAMATE), nedavneSnack=stupne(TYZDNE_PAMATE_SNACK);
  _genPamatSnack=nedavneSnack[0];
  // B3: „Dorovnať dni na cieľ" vypína LEN škálovanie porcií (faktor nižšie). Výber jedál a opravné
  // prechody idú podľa cieľa vždy — dovtedy vypnutie zhodilo celé riadenie kalórií (dni −19 až
  // +61 %, poradie jedál 27 zo 42 dní).
  // v34: `ciel` je cieľ, pre ktorý sa jedlá VYBERAJÚ (genCiel); skutočný cieľ dorovnajú porcie (faktorySlotov).
  const cielSkut0=S.profil.kcal||0; let cielSkut=cielSkut0, ciel=genCiel(cielSkut);
  for(let di=0;di<7;di++) slotyDna(di).forEach(sl=>{ if(kotva(di,sl)) slotIds(di,sl).forEach(id=>pouzite.add(id)); });
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
  _tyzCerv=0; _tyzRyba=0; _tyzBlok=0;
  for(const [_gi,dni] of skupiny.entries()){
    if(document.body.classList.contains("generujem")){ const pas=document.querySelector(".gen-pas");
      if(pas&&S.blokMode) pas.textContent="✨ Zostavujem blok "+blokPismeno(_gi)+" z "+skupiny.length+"…"; await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))); S.viewOd=_od0; }
    cielSkut=Math.round(cielSkut0*podielDna(prvyDenDoma(dni))); ciel=genCiel(cielSkut); // v34: jedlo mimo domu
    // B7: masku slotov ber ako ZJEDNOTENIE dní bloku — inak stačí mať preč prvý deň
    // a celý blok zostane bez jedla. Do konkrétneho dňa sa potom zapíšu len jeho vlastné sloty.
    const sloty=VSETKY_SLOTY.filter(s=>dni.some(d=>slotyDna(d).includes(s)));
    let cenaRefBlok=refZ;
    if(refZ>0 && dniZostava>0 && S.profil.kcal>0){
      const naDen=rozpoctZostatok/dniZostava;
      cenaRefBlok=Math.max(refZ*0.75,Math.min(refZ*1.3,naDen/(S.profil.kcal/100)));
    }
    const doma=dniDoma(dni), pevne=new Set();
    const ctx={ cfg, pouzite, pouziteBazy, nedavne, nedavneSnack, stopa:{}, prevBlokMaso, snackDruhy,
      kf:filterKuchynaPreDni(doma), pr:pravidloPreDni(doma), vsednyBlok:dni.every(d=>d<5), prilRot,
      cenaRef:cenaRefBlok, pevne };
    const denPlan={};
    sloty.forEach(sl=>{ let d0=dni.find(d=>jeZamknute(d,sl)); if(d0==null&&zachovat) d0=dni.find(d=>slotIds(d,sl).length); if(d0==null)return;
      const ex=slotIds(d0,sl); denPlan[sl]=ex.slice(); pevne.add(sl); const r0=komponent(ex[0]);
      if(r0)ctx.stopa[sl]={kuchyna:r0.kuchyna||"", baza:(sl==="Raňajky")?ranajkyBaza(r0):"", maso:(jeHlavnyChodSlot(sl)?masoTyp(r0):"")||""}; });
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
      // C: strop hneď za posledným dvíhaním bielkovín — nasledujúci opravDen dorovná kcal,
      // ktoré výmena mohla rozhýbať, a vláknina aj cena majú potom viac miesta.
      znizBielkoviny(denPlan,sloty,ctx,ciel);
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
    else zarovnajObedVeceru(denPlan,ctx);
    prilRot=ctx.prilRot;
    if(refZ>0){ rozpoctZostatok-=denCenaPoSkal(denPlan,sloty,ciel)*dni.length; }
    dniZostava-=dni.length;
    // 🍲 „Obed aj večera z jedného hrnca" — voliteľné; doménové pravidlo obed ≠ večera tým vedome ustupuje.
    // Porcie a nákup sa dorovnajú faktormi (večera dostane menšiu porciu toho istého jedla).
    if(S.profil.jedenHrniec && denPlan["Obed"] && denPlan["Večera"] && !pevne.has("Večera")){
      ctx.pouzite.delete((denPlan["Večera"]||[])[0]); denPlan["Večera"]=denPlan["Obed"].slice(); }
    const fs=(cielSkut>0 && cfg.cielMode)?faktorySlotov(denPlan,sloty,cielSkut):{};
    sloty.forEach(sl=>{ const k=denPlan[sl]&&komponent(denPlan[sl][0]); if(k&&isMain(k)){ _tyzCerv+=cerveneG(k).g*(fs[sl]||1)*dniDoma(dni).length; if(jeRybaJedlo(k)) _tyzRyba++; } });
    _tyzBlok++;
    hotoveBloky.push({dni:dni.slice(),sloty:sloty,ctx:ctx,denPlan:denPlan});
    // kotva ostáva v dni, kde stála (nejednotný blok so „Zachovať" sa nezjednotí cez cudzí deň)
    dni.forEach(di=>{ const sd=slotyDna(di); plan[di]={}; planF[di]={};
      sd.forEach(s2=>{ if(denPlan[s2]){ plan[di][s2]=(pevne.has(s2)&&kotva(di,s2)?slotIds(di,s2):denPlan[s2]).slice(); if(fs[s2]&&fs[s2]!==1)planF[di][s2]=fs[s2]; } }); });
    // stopa hotového bloku ide do týždňovej pamäte až tu — počas opráv sa ešte mení
    prevBlokMaso=new Set();
    Object.keys(ctx.stopa).forEach(sl=>{ const st=ctx.stopa[sl];
      if(st.baza)pouziteBazy.add(st.baza); if(st.maso)prevBlokMaso.add(st.maso); });
  }
  // Snack sa od v29 drží bloku ako ostatné jedlá (jeden výrobok na blok, kupuje sa raz).
  // Beží to až tu, po dogenerovaní všetkých blokov: keby to bežalo vnútri bloku, voľby by
  // cez `ctx.pouzite` zúžili pool nasledujúcich blokov a zaplatili by to hlavné jedlá.
  hotoveBloky.forEach(b=>{ const sd=snackyPoDnoch(b.denPlan,b.sloty,b.dni,b.ctx,ciel);
    b.dni.forEach(di=>{ const x=sd[di]; if(!x)return;
      Object.keys(x).forEach(sl=>{ if(plan[di]&&plan[di][sl]) plan[di][sl]=x[sl].slice(); }); }); });
  _genCacheReset(false); _genPamatSnack=null;
  nacitajSablonuDoTyzdna(plan,planF);
  if(cfg.cielMode){ const roz=dniT.filter(d=>slotyDna(d).length&&cielDna(d)!==cielDna(prvyDenDoma(denyBloku(d)))); if(roz.length) rescaleDen(roz); }
  save(); _plynule(renderPlan, document.body.classList.contains("generujem")); // kolo 7: výsledok sa prelínaním objaví na mieste prázdneho stavu (CLS 0,34)
  if(document.getElementById("v-domov").classList.contains("active"))renderDash();
  const jedla=new Set(); dniT.forEach(di=>slotyDna(di).forEach(sl=>{ const id=slotIds(di,sl)[0]; if(id)jedla.add(id); }));
  toastSpat("✨ Týždeň je zostavený — "+sklon(jedla.size,"jedlo","jedlá","jedál")+".");
}
function kuchyneList(){ return [...new Set(RECEPTY.map(r=>r.kuchyna).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"sk")); }
// Dotazník generovania — jedno okno, prednačíta z profilu, každá zmena píše priamo do S.profil/S.genCfg.
function otvorGen(){ renderGenWizard(); }
// B3: „✨ Generovať" v dotazníku aj „🎲 Zamiešať" volali generujJedalnicek(true), čo obchádza
// otázku vo vnútri generátora — hotový týždeň zmizol bez varovania. Otázka patrí sem, k tlačidlu.
async function generujTlacidlo(zamiesaj){
  if(document.body.classList.contains("generujem")) return; // ťuk počas zostavovania sa nezaradí druhýkrát (kolo 3, pocit)
  if(!planPrazdnyTyzden() && !(S.genCfg&&S.genCfg.zachovat&&!zamiesaj)){
    const t=zamiesaj?"Zamiešať tento týždeň? Terajšie jedlá sa prepíšu novými (🔒 zamknuté ostanú).":"Zostaviť nový jedálniček? Terajší plán tohto týždňa sa prepíše (🔒 zamknuté jedlá ostanú).";
    if(!await confirmModal(t+" (Plán si vieš pred tým uložiť cez ⋯ Viac → Uložiť tento plán.)", zamiesaj?"Zamiešať":"Prepísať")) return;
  }
  const od=S.viewOd; document.body.classList.add("generujem"); await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0))); S.viewOd=od;
  const pas=document.querySelector(".gen-pas"), t0=pas?pas.textContent:"";
  try{ await generujJedalnicek(true,!!zamiesaj); vibruj(USPECH); } finally { document.body.classList.remove("generujem"); if(pas) pas.textContent=t0; }
  // kolo 9 (používateľ): po zostavení (aj z uvítania) ukáž dnešný blok, nie minulý blok A
  if(_curView==="planovac"&&jeMobil()&&S.blokMode&&S.viewOd===pondelokPre(dnesISO())) setTimeout(()=>{ const k=document.querySelector("#plan-bloky .blok-karta.je-dnes");
    if(k&&k.previousElementSibling) k.scrollIntoView({block:"start",behavior:_pohyb()?"smooth":"auto"}); },300); }
// Onboarding — ľahký privítač pri prvom spustení (reuse handlerov stravníkov/profilu)
function onboardingModal(){ normStravnici(); const l=stravniciList();
  const IST="padding:8px;border:1px solid var(--line);border-radius:8px";
  const h=`<div class="hero"><button class="close" onclick="dokonciOnboarding();zavriPick()">✕</button><h2>👋 Vitaj v kuchárke</h2><p class="info" style="margin:4px 0 0">Appka zostaví jedálniček na týždeň, navaríš 3× do zásoby a rozdelí porcie každému podľa jeho kalórií. Nákupný zoznam spraví sama.</p></div><div class="content2">
    <div class="btn-row" role="group" aria-label="Veľkosť písma" style="margin:0 0 6px"><span class="info">Veľkosť písma:</span>${REZIMY.map(r=>`<button type="button" class="btn${S.profil.rezim===r?" primary":""}" aria-pressed="${S.profil.rezim===r}" onclick="nastavRezim('${r}');onboardingModal()">${REZIM_POPIS[r][0]}</button>`).join("")}</div>
    <h3 class="sekcia">👥 Pre koho varíš?</h3>
    ${stravniciRiadkyHTML("onboardingModal()")}
    <p class="info" style="margin:2px 0 8px">Každý môže mať iný kalorický cieľ — appka navarí raz a porcie rozdelí podľa toho.</p>
    <button class="btn ghost" onclick="pridajStravnika();onboardingModal()">+ Pridať stravníka</button>
    <p class="info">Číslo pri mene je kcal na deň. Nevieš koľko? Bežne 1800–2000 pre ženu a 2200–2500 pre muža; presnejšie to spočíta ⚙️ Nastavenia → 🧮 Vypočítať kalorický cieľ.</p>
    <h3 class="sekcia">🥗 Máš nejaké obmedzenia?</h3>
    <label class="switch"><input type="checkbox" ${jeBezMasa()?"checked":""} onchange="bezMasaNastav(this.checked)"> 🌱 Bez mäsa (vegetarián)</label>
    <label class="switch"><input type="checkbox" ${S.profil.ryby?"checked":""} onchange="S.profil.ryby=this.checked;save();opravPlanPoZmene('diétou')"> 🐟 Bez rýb</label>
    <label class="switch"><input type="checkbox" ${S.profil.lepok?"checked":""} onchange="S.profil.lepok=this.checked;save();opravPlanPoZmene('diétou')"> 🌾 Bez lepku</label>
    <label class="switch"><input type="checkbox" ${S.profil.mlieko?"checked":""} onchange="S.profil.mlieko=this.checked;save();opravPlanPoZmene('diétou')"> 🥛 Bez laktózy</label>
    <label class="switch"><input type="checkbox" ${S.profil.menejSoli?"checked":""} onchange="S.profil.menejSoli=this.checked;save();opravPlanPoZmene('diétou')"> 🧂 Menej soli (vysoký tlak)</label>
    <label class="switch"><input type="checkbox" ${S.profil.diabetes?"checked":""} onchange="S.profil.diabetes=this.checked;save();opravPlanPoZmene('diétou')"> 🩺 Diabetes 2. typu (menej sacharidov)</label>
    <label class="switch"><input type="checkbox" ${S.profil.domaca?"checked":""} onchange="S.profil.domaca=this.checked;save()"> 🏡 Najmä domáca kuchyňa</label>
    <div class="btn-row akcie-lepiva" style="margin-top:18px;justify-content:space-between"><button class="btn ghost" onclick="dokonciOnboarding();zavriPick()">Preskočiť</button><button class="btn primary" onclick="dokonciOnboarding();zavriPick();if(new Date().getDay()%6===0)S.viewOd=pridajDni(pondelokPre(dnesISO()),7);prepni('planovac');generujTlacidlo(false)">✨ Zostaviť prvý jedálniček</button></div>
  </div>`;
  document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function dokonciOnboarding(){ S.profil.onboarded=true; save(); }
// Vegetarián = zakázané „mäso" (zakazaneChyta ho berie ako „nie 🌱 veg") — jeden zdroj pravdy, žiadny nový kľúč stavu.
function jeBezMasa(){ return zakazaneTokens().some(t=>_slovoJeTvar(t,_tvarSlova("maso"))); }
function bezMasaNastav(on){ const z=(S.profil.zakazane||"").split(/[\n,;]+/).map(x=>x.trim()).filter(x=>x && !_slovoJeTvar(bezDia(x),_tvarSlova("maso")));
  if(on) z.unshift("mäso"); S.profil.zakazane=z.join(", "); save(); }
function renderGenWizard(){ const cfg=S.genCfg; const dni=["Po","Ut","St","Št","Pi","So","Ne"]; const kuch=kuchyneList();
  normStravnici(); const l=stravniciList();
  
  const popisPr=f=>[f.kuchyna,(f.veg?"bezmäso":""),(f.maxCas>0?("do "+f.maxCas+" min"):"")].filter(Boolean).join(" · ")||"(bez podmienky)";
  const fh=(cfg.filtre||[]).map((f,i)=>`<div class="sp-row"><span>${dni[f.od]}–${dni[f.do]}: <b>${popisPr(f)}</b></span><a onclick="zmazGenFilter(${i})" style="color:var(--warn);cursor:pointer">✕</a></div>`).join("")||'<p class="info">Zatiaľ žiadne pravidlá.</p>';
  const denOpts=sel=>dni.map((d,i)=>`<option value="${i}" ${i===sel?"selected":""}>${d}</option>`).join("");
  const tp=S.tyzdenProfil[S.viewOd]||{};
  const c=`
    <h3 class="sekcia">📆 Tento týždeň (${fmtD(S.viewOd)}–${fmtD(pridajDni(S.viewOd,6))})</h3>
    <div class="field"><label>Koľko ľudí tento týždeň (prázdne = ako obvykle)</label><input type="number" min="1" value="${tp.ludia||""}" placeholder="${stravniciList().length}" onchange="nastavTyzdenLudia(this.value)" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>
    <div class="field"><label>Dni, keď ste preč (nič sa nevarí — hostia inde, dovolenka)</label><div class="mimo-riadok" role="group" aria-label="Dni, keď ste preč">${dni.map((d,i)=>`<label class="switch"><input type="checkbox" data-fokus="prec-${i}" ${(tp.prec||[]).includes(i)?"checked":""} onchange="drzFokus(()=>toggleTyzdenPrec(${i}),this)"> ${d}</label>`).join("")}</div></div>
    <h3 class="sekcia">👥 Stravníci</h3>
    ${stravniciRiadkyHTML("renderGenWizard()")}
    <button class="btn ghost" onclick="pridajStravnika();renderGenWizard()">+ Pridať stravníka</button>

    <h3 class="sekcia">🎯 Cieľ</h3>
    <p class="info">Kalorický cieľ sa berie z riadkov stravníkov vyššie — <b>prvý riadok je hlavný stravník</b>.</p>
    <!-- v34: voľba rozpočtu zrušená (rozhodnutie 8. 10.): ceny appka neukazuje a „Úsporne" ≈ „Bežne"; generátor drží predvolenú brzdu na luxus -->
    <label class="switch"><input type="checkbox" ${cfg.cielMode?"checked":""} onchange="S.genCfg.cielMode=this.checked;save()"> Dorovnať dni na cieľ (upraví veľkosť porcií)</label>

    <h3 class="sekcia">🥗 Diéty a suroviny</h3>
    <label class="switch"><input type="checkbox" ${S.profil.ryby?"checked":""} onchange="S.profil.ryby=this.checked;save();opravPlanPoZmene('diétou')"> 🐟 Bez rýb</label>
    <label class="switch"><input type="checkbox" ${S.profil.lepok?"checked":""} onchange="S.profil.lepok=this.checked;save();opravPlanPoZmene('diétou')"> 🌾 Bez lepku</label>
    <label class="switch"><input type="checkbox" ${S.profil.mlieko?"checked":""} onchange="S.profil.mlieko=this.checked;save();opravPlanPoZmene('diétou')"> 🥛 Bez laktózy</label>
    <div class="field"><label>Zakázané suroviny (nikdy, oddeľ čiarkou)</label><textarea onchange="S.profil.zakazane=this.value;save();opravPlanPoZmene('diétou')" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${escHtml(S.profil.zakazane)}</textarea></div>
    <div class="field"><label>Chcem uprednostniť / spotrebovať</label><textarea onchange="S.profil.watch=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${escHtml(S.profil.watch)}</textarea></div>
    <div class="field"><label>Min. bielkovín / deň (0 = neriešiť)</label><input type="number" value="${S.profil.biel||0}" onchange="S.profil.biel=parseInt(this.value)||0;save()" style="width:130px;padding:8px;border:1px solid var(--line);border-radius:8px"></div>

    <h3 class="sekcia">🌍 Kuchyne a pravidlá</h3>
    <label class="switch"><input type="checkbox" ${cfg.zachovat?"checked":""} onchange="S.genCfg.zachovat=this.checked;save()"> Ponechať jedlá, ktoré už v pláne sú</label>
    <label class="switch"><input type="checkbox" ${cfg.neMasoZaSebou?"checked":""} onchange="S.genCfg.neMasoZaSebou=this.checked;save()"> Nevariť rovnaké mäso v dvoch blokoch po sebe</label>
    <p class="info" style="margin:6px 0">📚 Zdroje receptov: ${zdrojeStav()} <button class="lnk" onclick="zavriPick();prepni('nastavenia')">zmeniť v Nastaveniach →</button></p>
    <div class="field"><label>Suroviny v akcii (uprednostní ich)</label><textarea onchange="S.akcie=this.value;save()" style="width:100%;min-height:52px;padding:8px;border:1px solid var(--line);border-radius:8px">${escHtml(S.akcie)}</textarea></div>
    <div class="field"><label>Pravidlo pre rozsah dní (kuchyňa / bezmäso / čas)</label>
    <div class="controls" style="align-items:center;flex-wrap:wrap">
      <select class="f" id="gf-od">${denOpts(0)}</select><span>–</span><select class="f" id="gf-do">${denOpts(6)}</select>
      <select class="f" id="gf-kuch"><option value="">(kuchyňa: ľubovoľná)</option>${kuch.map(k=>`<option>${k}</option>`).join("")}</select>
      <label class="switch" style="margin:0"><input type="checkbox" id="gf-veg"> bezmäso</label>
      <input type="number" id="gf-cas" placeholder="do min" style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">
      <button class="btn" onclick="pridajGenFilter()">+ Pridať pravidlo</button></div>
    <div id="gf-list" style="margin-top:8px">${fh}</div></div>`;
  // B3: „✨ Generovať" bolo až na konci 2100 px formulára — lepivá pätička (tá istá ako v detaile receptu)
  const nav=`<div class="btn-row akcie-lepiva"><button class="btn primary" onclick="zavriPick();prepni('planovac');generujTlacidlo(false)">✨ Generovať</button></div>`;
  const h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>✨ Zostaviť jedálniček</h2><p class="info" style="margin:4px 0 0">Označ a vyplň, čo generovať</p></div><div class="content2">${c}${nav}</div>`;
  // B3: „+ Pridať pravidlo", deň „preč" aj stravník prekreslia celé okno — pozícia skrolovania
  // (panel na telefóne, prekrytie na počítači) sa vráti a fokus sa neťahá hore na ✕.
  const pm=document.getElementById("pick-modal"), ov=document.getElementById("pick-overlay");
  const znova=ov.classList.contains("open") && !!document.getElementById("gf-list"), y=[pm.scrollTop,ov.scrollTop];
  pm.innerHTML=h; zpristupniKliky(pm); ov.classList.add("open");
  if(znova){ pm.scrollTop=y[0]; ov.scrollTop=y[1]; } else _fokusDoModalu("pick-modal"); }
function pridajGenFilter(){ const od=parseInt(document.getElementById("gf-od").value)||0, doo=parseInt(document.getElementById("gf-do").value)||0, kuchyna=document.getElementById("gf-kuch").value, veg=document.getElementById("gf-veg").checked, maxCas=parseInt(document.getElementById("gf-cas").value)||0;
  if(doo<od){ toast("Koniec rozsahu je pred začiatkom."); return; }
  if(!kuchyna && !veg && !(maxCas>0)){ toast("Nastav aspoň jednu podmienku (kuchyňa, bezmäso alebo čas)."); return; }
  const pr={od,do:doo}; if(kuchyna)pr.kuchyna=kuchyna; if(veg)pr.veg=true; if(maxCas>0)pr.maxCas=maxCas;
  S.genCfg.filtre.push(pr); save(); renderGenWizard(); }
function zmazGenFilter(i){ S.genCfg.filtre.splice(i,1); save(); renderGenWizard(); }
// Jedna veta o tom, čo filter zdrojov práve robí. Číslo je z genUniverzum(), teda z toho istého
// poolu, z ktorého vyberá generátor — bez neho sa nedalo overiť, či prepínač vôbec zabral.
// Pomenúva aj stav „vypnuté je všetko": zúženie je mäkké, takže sa vtedy TICHO neuplatní
// a počet receptov neklesne. To treba priznať, nie nechať používateľa hádať.
function zdrojeStav(){ const off=zdrojeOff(), vsetky=zdrojeList(), n=genUniverzum().length;
  const vyp=vsetky.filter(([z])=>off.has(z)).length; // staré mená (napr. rodina, ktorá už neexistuje) sa nerátajú
  if(!vyp) return "zapnuté sú všetky, generátor vyberá z "+n+" receptov";
  if(vyp>=vsetky.length) return "vypnuté sú VŠETKY — to sa nedá splniť, appka ich preto ignoruje a berie zo všetkých "+n+" receptov";
  return "zapnutých "+(vsetky.length-vyp)+" z "+vsetky.length+", Recepty aj generátor berú z "+n+" receptov"; }
function vsetkyJedalnicky(){ return JEDALNICKY.concat(S.archiv||[]); }
// vytiahne PRÁVE ZOBRAZENÝ týždeň (7 dátumov od S.viewOd) a re-key na 0-6 pre prenosný archívny formát
function tydenAkoSablonu(){ const plan={},planF={}; for(let di=0;di<7;di++){ const iso=datumPre(di); if(S.plan[iso])plan[di]=S.plan[iso]; if(S.planF[iso])planF[di]=S.planF[iso]; } return {plan,planF}; }
async function ulozPlanArchiv(){ const {plan,planF}=tydenAkoSablonu(); if(!Object.keys(plan).length){toast("Plán je prázdny.");return;}
  const nazov=await promptModal("Názov jedálnička:", "Týždeň "+new Date().toLocaleDateString("sk"),"","💾 Uložiť"); if(!nazov)return;
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
// Kolo 4 (pocit): jedno odškrtnutie počítalo nakupPolozky 4× (114 ms, pri 4× CPU 1,6 s). Výsledok závisí len od
// plánu týždňa a domácnosti — podpis tých vstupov rozhodne, či sa dá vziať zapamätaný. Volajúci výsledok nemenia
// (gPreBloky aj zmensiOSpajzu robia kópie). Vlastné recepty: počet aj JSON (úprava receptu zmení nákup).
let _npMemo=null;
function _npPodpis(){ const w=[0,1,2,3,4,5,6].map(datumPre), z=o=>o?w.map(d=>o[d]):null;
  return JSON.stringify([S.viewOd,z(S.plan),z(S.planF),z(S.planM),z(S.slotPpl),z(S.dayPpl),z(S.daySloty),S.tyzdenProfil&&S.tyzdenProfil[S.viewOd],
    S.profil.stravnici,S.profil.mimo,S.profil.sloty,S.profil.kcal,S.profil.osoby,S.blokMode,S.hranice,S.genCfg&&S.genCfg.cielMode,RECEPTY.length,S.mojeRecepty]); }
function nakupPolozky(){ const k=_npPodpis(); if(_npMemo&&_npMemo.k===k) return _npMemo.v; const v=_nakupPolozkyVypocet(); _npMemo={k,v}; return v; }
function _nakupPolozkyVypocet(){
  const grp={}, notes={};
  // Recept sa v bloku varí RAZ, aj keď je v pláne na viac dní — zoskup podľa (recept, slot, blok)
  // a použi rovnaký počet porcií (porcieSlotBlok) aj rovnaké škálovanie (skalovanaHodnota) ako detail
  // receptu, inak si nákup a recept nesedia (nezaokrúhlené porcie, % veľkosti porcie na kusoch).
  const varenia={};
  planItems().forEach(({r,di,slot,cid})=>{ if(r._left)return; // zvyšok = už uvarené v inom bloku
    const k=(cid||r.id)+"|"+slot+"|"+denyBloku(di)[0];
    // koncepcia B: v nákupe treba hneď vidieť, na ktorú várku položka je → nesieme index bloku
    if(!varenia[k])varenia[k]={r,porcie:porcieSlotBlok(di,slot,cid),fVelkost:pf(di,slot),bi:blokIndex(di)}; });
  // Nákup po várkach (audit 30. 9.): každá surovina sa sčíta do celku G aj do svojej várky G.po[bi].
  // Výber „Nakupujem na: A · B · C" (gPreBloky) a odškrtnutie po várkach potrebujú vedieť, koľko
  // z riadku patrí ktorému bloku — mäso na blok C sa nemá kupovať v pondelok.
  const nova=z=>Object.assign({grams:0,cena:0,kcal:0,raw:0,ziadane:0,hasKs:false,hasMl:false,hasG:false,pocty:{},zdroje:[]},z);
  Object.values(varenia).forEach(({r,porcie,fVelkost,bi})=>{ const fPocet=porcie/(r.porcie||1);
    ingrediencieNaNakup(r).forEach(i=>{ const p=najdiPotravinu(i.nazov);
      // riadok sa zoskupuje pod kanonickým kľúčom (synonymá „vajíčk"/„vajc" = jeden riadok, jedno balenie)
      const kp=p&&(kanonPotr(p.kluc)||p);
      if(i.mnozstvo==null){ const kk=(kp?kp.kluc:i.nazov.toLowerCase()); if(!notes[kk])notes[kk]={nazov:i.nazov,pozn:i.poznamka||"podľa chuti",oddelenie:(kp||{}).oddelenie||"Ostatné",p:kp,bl:{}}; notes[kk].bl[bi]=1; return; }
      const j=(i.jednotka||"").toLowerCase().trim();
      const rodina=rodinaJednotky(j);
      const mn=skalovanaHodnota(i.mnozstvo,i.jednotka,fPocet,fVelkost);
      const zdroj={recept:r.nazov,id:r.id,ing:i.nazov,mn,jednotka:i.jednotka||""};
      let G, g, cast=null;
      if(p){ if(!grp[kp.kluc])grp[kp.kluc]=nova({key:kp.kluc,nazov:i.nazov,oddelenie:kp.oddelenie||"Ostatné",p:kp,matched:true,bl:{},po:{}});
        G=grp[kp.kluc]; g=gramy({mnozstvo:mn,jednotka:i.jednotka},p);
        // C1: pamätáme si PÔVODNÚ počítateľnú jednotku (strúčik, plátok, list), nie univerzálne „ks".
        // Kusy synonyma sa s kusmi kanonu nesčítajú (12 cherry paradajok nie je 12 vaničiek) — idú v gramoch.
        cast=(rodina==="pocet"&&kp!==p)?"g":rodina;
      } else { const kluc="u|"+i.nazov.toLowerCase()+"|"+j;
        if(!grp[kluc])grp[kluc]=nova({key:kluc,nazov:i.nazov,oddelenie:"Ostatné",matched:false,jednotka:i.jednotka||"",bl:{},po:{}});
        // B5+/N-obchod: aj surovina mimo databázy má hmotnosť, keď je jednotka prevediteľná
        // („Burrito seasoning mix 4 ČL" = 20 g). Cena zostáva neznáma — to rieši dovodBezCeny().
        G=grp[kluc]; g=gramy({mnozstvo:mn,jednotka:i.jednotka},null); }
      G.bl[bi]=1;
      if(!G.po[bi]) G.po[bi]=nova({key:G.key,nazov:G.nazov,oddelenie:G.oddelenie,p:G.p,matched:G.matched,jednotka:G.jednotka});
      [G,G.po[bi]].forEach(T=>{
        // B5+: `ziadane` = surový súčet množstiev zo receptov. Slúži len na rozlíšenie „recept nič nepýta"
        // od „recept pýta, ale nevieme to previesť na gramy" — bez neho by druhý prípad ticho ukázal 0,00 €.
        T.ziadane+=Math.abs(mn); T.grams+=g; T.zdroje.push(zdroj);
        if(!p){ T.raw+=mn; return; }
        T.cena+=g/100*(p.cena100||0); T.kcal+=g*p.kcal/100;   // cena aj kcal z VLASTNEJ potraviny suroviny
        if(cast==="pocet"){ T.hasKs=true; T.pocty[i.jednotka||"ks"]=(T.pocty[i.jednotka||"ks"]||0)+mn; }
        else if(cast==="ml")T.hasMl=true; else T.hasG=true; });
    });
  });
  // C9 („podľa chuti" vedľa riadku s množstvom) rieši nakupItems — závisí od zvolených várok.
  return {grp,notes};
}
// Riadok nákupu obmedzený na zvolené várky (sel = pole indexov blokov, null = celý týždeň).
// null = surovina v zvolených várkach nie je.
function gPreBloky(G,sel){ if(!sel) return G;
  let T=null;
  sel.forEach(b=>{ const P=G.po&&G.po[b]; if(!P) return;
    if(!T) T=Object.assign({},G,{grams:0,cena:0,kcal:0,raw:0,ziadane:0,hasKs:false,hasMl:false,hasG:false,pocty:{},zdroje:[],bl:{}});
    T.bl[b]=1; ["grams","cena","kcal","raw","ziadane"].forEach(k=>{ T[k]+=P[k]; });
    T.hasKs=T.hasKs||P.hasKs; T.hasMl=T.hasMl||P.hasMl; T.hasG=T.hasG||P.hasG;
    for(const j in P.pocty) T.pocty[j]=(T.pocty[j]||0)+P.pocty[j];
    T.zdroje=T.zdroje.concat(P.zdroje); });
  return T; }
// C1: rodina jednotky sa určí z tabuliek, nie z „všetko okrem g a ml je ks".
// Vďaka tomu skončí PL/ČL medzi objemami a strúčik/plátok/list ostane počítateľnou jednotkou.
function rodinaJednotky(jed){ const j=(jed||"").toLowerCase().trim();
  if(j==="ml"||j==="l"||ML_JED[j]!=null) return "ml";
  if(j==="g"||j==="gram"||j==="gramov"||j==="kg"||j==="") return "g";
  if(KS_DEF[j]!=null||KS_JEDNOTKY.includes(j)) return "pocet";
  return "g"; }
// Vracia HTML. Jednotka nenapárovanej suroviny je text z receptu (aj vlastného, aj zo synchronizácie)
// — escapuje sa tu, pri vykreslení.
// `kratko` = bez „(≈ 726 g)" pri kusoch — v nákupe je to už vedľajší údaj vedľa balenia.
function zobrazMnozstvo(G,kratko){
  // Kusy sa kupujú NAHOR a až na súčte: „Červená čakanka 1,32 ks" je 2 ks, nie 1 (o 24 % menej).
  // Tolerancia 1e-6 len pre šum zo škálovania porcií (2,0000001 ks nie je 3 ks).
  const kusov=x=>Math.max(1,Math.ceil(x-1e-6));
  if(!G.matched){ const cnt=rodinaJednotky(G.jednotka)==="pocet"; const val=cnt?kusov(G.raw):Math.round(G.raw*10)/10; return fmt(val)+(G.jednotka?" "+escHtml(G.jednotka):""); }
  const p=G.p;
  // počítateľné len keď sú počítateľné VŠETKY zdroje — inak riadok hlási „12 ks" pri receptoch,
  // čo pýtajú 200 g + 990 g. A vypíše sa pôvodná jednotka („22 strúčik"), nie univerzálne „ks".
  const poc=Object.keys(G.pocty||{});
  if(G.hasKs && !G.hasG && !G.hasMl && poc.length===1){
    const n=kusov(G.pocty[poc[0]]);
    const g=Math.round(G.grams);
    return fmt(n)+" "+jednotkaSklon(n,poc[0])+(g>0&&!kratko?` <span class="info">(≈ ${fmt(g)} g)</span>`:"");
  }
  // N-obchod: mililitre dávajú v obchode zmysel len pri tekutine. „Pekinská kapusta 750 ml"
  // (3 šálky) alebo „Sušený cesnak 36 ml" (7 ČL) je nezmysel — pevnú surovinu vypíš v gramoch.
  // Olej, šťava, ocot či mlieko sú v ml aj keď ich recept zadal v gramoch („Olivový olej 4 g").
  if((G.hasMl && !G.hasG && jeTekutina(p)) || (G.grams>0 && jeLiata(p))){ return fmt(Math.round(G.grams/(p.hustota||1)))+" ml"; }
  // B5+: gramáž sa nedopočítala (neznáma jednotka / kus bez g_za_ks). „0 g" by klamalo — vypíš,
  // čo recepty naozaj pýtajú, v ich vlastných jednotkách.
  if(!(G.grams>0) && G.ziadane>0){
    const podlaJed={}; (G.zdroje||[]).forEach(z=>{ const jj=z.jednotka||"?"; podlaJed[jj]=(podlaJed[jj]||0)+z.mn; });
    return Object.keys(podlaJed).map(jj=>fmt(Math.round(podlaJed[jj]*100)/100)+" "+escHtml(jj)).join(" + ");
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
  S.obchod="vlastne"; S.obchodPor=p; save(); drzFokus(renderTrasa); renderNakup(); }
// Zoznam sa kreslí až pri otvorení panela (`ontoggle`) — 16 riadkov navyše nesmie zaťažiť obrazovku,
// na ktorej sa v obchode odškrtáva. Ťahanie prstom je na telefóne bolestivé, preto šípky.
function renderTrasa(){ const el=document.getElementById("trasa-box"); if(!el) return;
  const akt=S.obchod||"kaufland";
  const chip=(k,n)=>`<button class="chip${akt===k?" active":""}" onclick="nastavObchod('${k}')">${n}</button>`;
  let h='<div class="chips" style="padding:0 0 10px">'+Object.keys(OBCHODY).map(k=>chip(k,OBCHODY[k].nazov)).join("")+chip("vlastne","Vlastné")+"</div>";
  const por=poradieOddeleni();
  h+='<div class="trasa-list">'+por.map((o,i)=>
    `<div class="trasa-row"><span class="trasa-n">${i+1}.</span><span class="trasa-o">${o}</span>`+
    `<span class="trasa-akc"><button class="mini" title="posunúť vyššie" aria-label="${o} vyššie" data-fokus="trasa:${o}:-1" onclick="posunOddelenie(${i},-1)"${i===0?" disabled":""}>↑</button>`+
    `<button class="mini" title="posunúť nižšie" aria-label="${o} nižšie" data-fokus="trasa:${o}:1" onclick="posunOddelenie(${i},1)"${i===por.length-1?" disabled":""}>↓</button></span></div>`).join("")+"</div>";
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
  let nakup=0; Object.values(grp).forEach(G=>{ if(G.matched&&G.grams>0) nakup+=G.kcal; }); // kcal z vlastnej potraviny (synonymá v jednom riadku)
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
// Rozklad tokenu pre „Mám doma" (jeDoma): kmeň + prefix 3–5 znakov. Cachuje sa — rovnaké tokeny
// idú cez všetkých ~2000 receptov. U4: „koriander" → „koriandrová" mení kmeň, nie príponu.
const _tokCache=new Map();
function _tokRozklad(t){ let x=_tokCache.get(t);
  if(!x){ const kmene=_slova(t).map(_kmen), pref=t.slice(0,Math.max(3,Math.min(5,t.length-1)));
    x={kmene,pref:(kmene.length===1&&pref.length>=3)?pref:null}; _tokCache.set(t,x); }
  return x; }
// Zakázané suroviny: tvar slova (`_tvarVSlovach`, viď hľadanie) + synonymá (kura = kurča = chicken).
// v33: voľný prefix (3–5 znakov, +6 navyše) zahodený — „zeler" blokoval zeleninu, „mäso" maslo.
function _surovinaVSlovach(slova,tok){ if(!tok||!tok.length) return false;
  const str=" "+slova.join(" ");
  return tok.some(t=>_rozsir(t,false).some(v=>_tvarVSlovach(slova,v,str))); }
function obsahujeSurovinu(text,tok){ return _surovinaVSlovach(_slova(text),tok); }
// N-obchod: zakázané suroviny a „Mám doma" majú OPAČNÚ cenu chyby, takže nesmú zdieľať prísnosť.
//  · zákaz (alergia, diéta): radšej zablokuj viac — tvar slova OR podreťazec (zakazaneChyta).
//  · „Mám doma": nadmerná zhoda znamená, že surovinu NEKÚPIŠ, hoci ju doma nemáš — a zistíš to
//    až pri hrnci. Preto tu prefixové pravidlo drží slovo pri tokene (max +3 znaky), takže
//    „med" chytí „medu"/„medom", ale už nie „medvedí cesnak", „medovku" ani „datle medjool".
//  · Prídavné meno na -ový/-ová/-ové je INÝ výrobok než surovina, z ktorej je odvodené: „cesnak"
//    nie je „Cesnakový dresing", „olivy" nie sú „Olivový olej". Prejde, len keď je také aj slovo tokenu
//    (aj kľúč-kmeň „bravčov", „špaldov" z potraviny.json). Rovnakú cenu chyby má špajza (spajzaSedi).
const _adjOv=w=>/ov(y|a|e|i|eho|ej|ou|ym|ych|ymi|emu)$/.test(w);
const _slovoSedi=(w,tw)=>!_adjOv(w)||_adjOv(tw)||/ov$/.test(tw);
function jeDoma(nazov,tok){ if(!tok||!tok.length) return false;
  const slova=_slova(nazov);
  return tok.some(t=>{ const x=_tokRozklad(t), ts=_slova(t);
    if(x.kmene.length>0){ const i=_sadneOd(slova,x.kmene);
      if(i>=0 && x.kmene.every((k,j)=>_slovoSedi(slova[i+j],ts[j]))) return true; }
    if(!x.pref) return false;
    const dl=bezDia(t).length;
    return slova.some(w=>w.startsWith(x.pref) && w.length-dl<=3 && _slovoSedi(w,ts[0])); }); }
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
// Audit 30. 9. (P2-5): hlavný údaj riadku je to, čo VEZMEŠ Z REGÁLU („1× 1 kg"), nie spotreba
// („888 g") — tá ostáva menším písmom. Výrobok, kde 1 ks = 1 balenie („Hruška, balenie 1 ks (170 g)"),
// je len „6 ks": balenie by zopakovalo to isté a riadok mal v Obchode 144 px.
function nakupMnozstvo(G){ const b=S.profil.balenia!==false?nakupBalenie(G):null;
  const ex=zobrazMnozstvo(G,!!b);
  if(!b) return "<b>"+ex+"</b>";
  if(/^1 ks\b/.test(b.pop||"")) return "<b>"+fmt(b.n)+" ks</b>";
  if(/^\d+ ks\b/.test(b.pop||"") && G.hasKs && !G.hasG && !G.hasMl) return "<b>"+sklon(b.n,"balenie","balenia","balení")+" po "+escHtml(b.pop)+"</b>"+(ex===b.n+" ks"?"":" <span class=\"info\">(do jedál "+ex+")</span>");
  // spotreba v gramoch: „masť 500 g (treba 33 ml)" miešalo jednotku balenia a receptu
  return `<b>${b.n}× ${escHtml(b.pop||"")}</b> <span class="info">(do jedál ${G.grams>0&&!G.hasKs&&!/\d\s*m?l\b/.test(b.pop||"")?fmtG(G.grams)+" g":ex})</span>`; }
// Veľkosť porcie: tri voľby namiesto čísla v %, na celý blok (rovnaké jedlo v ostatných dňoch), s ↩ Späť.
const PORCIA_VOLBY=[[0.85,"Menšia"],[1,"Normálna"],[1.2,"Väčšia"],[1.4,"Oveľa väčšia"]];
function upravFaktor(di,slot){ const m=rucnyMult(di,slot), k=komponent(slotIds(di,slot)[0]);
  const b=PORCIA_VOLBY.map(([v,t])=>'<button class="btn'+(Math.abs(m-v)<0.01?' primary':'')+'" aria-pressed="'+(Math.abs(m-v)<0.01)+'" onclick="nastavPorciuSlotu('+di+',\''+slot+'\','+v+')">'+t+'</button>').join("");
  document.getElementById("pick-modal").innerHTML='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Veľkosť porcie</h2><div class="subx">'+escHtml(slot)+(k?' · '+escHtml(k.nazov):'')+'</div></div><div class="content2"><div class="btn-row" style="flex-wrap:wrap">'+b+'</div><p class="info">Platí pre celý blok. Nákup a plán varenia sa prepočítajú; ostatné jedlá dňa ostanú.</p></div>';
  zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
function nastavPorciuSlotu(di,slot,m){ zapamatajTyzden(); const id=slotIds(di,slot)[0];
  const dni=denyBloku(di).filter(d=>slotIds(d,slot)[0]===id); S.planM=S.planM||{};
  dni.forEach(d=>{ const iso=datumPre(d); S.planM[iso]=S.planM[iso]||{}; if(m===1) delete S.planM[iso][slot]; else S.planM[iso][slot]=m; });
  rescaleDen(dni); save(); zavriPick(); renderPlan(); if(document.getElementById("v-domov").classList.contains("active"))renderDash();
  const t=(PORCIA_VOLBY.find(x=>x[0]===m)||[0,""])[1]; toastSpat(t+" porcia — "+slot+" na celý blok."); }
// Zásoba sedí na surovinu, len keď je to TÁ ISTÁ vec. Do v32 to bol podreťazec, takže „Mlieko"
// pokrylo „Kokosové mlieko", „Maslo" „Arašidové maslo" a „Olej" „Sezamový olej" — nákup ich
// nekúpil a odpis ich odrátal z cudzej zásoby. Keď obe strany poznajú potravinu, rozhoduje kľúč
// (a jeDoma nad ním vyradí „Cesnakový dresing", ktorý najdiPotravinu priradí cesnaku); inak
// meno zásoby cez jeDoma — „Mlieko" stále sedí na „Mlieko polotučné", „Vajcia" na „Vajcia M".
// Jediné párovanie pre nákup (spajzaGramy, mamVSpajzi) aj odpis (spajzaKandidati).
// Kľúče sa porovnávajú cez kanon („Vajíčka" v špajzi kryjú „Vajcia"); kontrola slov ide nad VLASTNÝM
// kľúčom suroviny — nákup sem posiela kanonickú potravinu riadku, ktorej kľúč v názve byť nemusí.
function spajzaSedi(x,nazov,p){ const xk=x.kluc||(najdiPotravinu(x.nazov)||{}).kluc||"";
  const pn=najdiPotravinu(nazov)||p;
  if(xk&&pn) return kanonKluc(xk)===kanonKluc(pn.kluc) && (jeDoma(nazov,[bezDia(pn.kluc)]) || jeDoma(nazov,[bezDia(x.nazov)]));
  return jeDoma(nazov,[bezDia(x.nazov)]); }
// S2: zásoba sa počíta len keď je KLADNÁ a NEEXPIROVANÁ. Expirovaná položka je odpad — keby
// zmenšila nákup, kúpiš málo a v deň varenia ti bude chýbať. `expiry` bez hodnoty = trvanlivé.
function zasobaPlatna(x){ if(!x||!(x.mnozstvo>0))return false; const d=dniDo(x.expiry); return d===null||d>=0; }
// Koľko chýba do minimálnej zásoby. Expirovaná ani záporná zásoba nič nekryje (zasobaPlatna) —
// do v32 ju „🧊 Doplniť zásoby" rátal ako plnú, takže pokazenú ryžu nad minimom nehlásil.
function chybaDoMinima(x){ return x&&x.min>0 ? Math.max(0,x.min-(zasobaPlatna(x)?x.mnozstvo:0)) : 0; }
function mamVSpajzi(nazov){ const p=najdiPotravinu(nazov);
  return S.spajza.some(x=>zasobaPlatna(x) && spajzaSedi(x,nazov,p)); }
// C3: koľko GRAMOV tejto suroviny mám naozaj v špajzi (nie len „mám/nemám").
// `zost` = Map zásoba → nevyčerpaný podiel (0–1), ktorú nakupItems nesie cez VŠETKY riadky: jedna
// zásoba sa tak rozdelí raz a riadku sa pridelí najviac jeho `potreba`. Do v32 sa rátala pre
// každý riadok zvlášť a „Jogurt 500 g" pokryl celý jeden riadok a zároveň 500 g z druhého.
// Riadok s neznámou potrebou (0 g) vidí zvyšok zásoby, ale nič z nej neminie.
function spajzaGramy(nazov,p,potreba,zost){ let g=0;
  (S.spajza||[]).forEach(x=>{ if(!zasobaPlatna(x))return; if(!spajzaSedi(x,nazov,p))return;
    const pp=p||najdiPotravinu(x.nazov);
    const gg=gramy({mnozstvo:x.mnozstvo,jednotka:x.jednotka},pp);
    if(!(gg>0))return;
    const f=zost&&zost.has(x)?zost.get(x):1;
    if(!zost||!(potreba>0)){ g+=gg*f; return; }
    const vez=Math.min(gg*f,Math.max(0,potreba-g)); g+=vez; zost.set(x,f-vez/gg); });
  return g; }
// zvyšok po odpočítaní zásoby — položka nezmizne z nákupu, len sa zmenší
function zmensiOSpajzu(G,sg){ const zvysok=Math.max(0,(G.grams||0)-sg); const k=G.grams>0?zvysok/G.grams:0;
  const pocty={}; for(const j in (G.pocty||{})) pocty[j]=G.pocty[j]*k;
  return Object.assign({},G,{grams:zvysok,cena:(G.cena||0)*k,pocty:pocty,zoSpajze:sg}); }
// "už kúpené" sa viaže na KONKRÉTNY zobrazený týždeň (S.viewOd), nie natrvalo na názov suroviny —
// inak by odfajknutý cesnak z minulotýždňového nákupu ostal navždy odfajknutý aj v úplne iných týždňoch.
function nakupCheckKey(key){ return S.viewOd+"|"+key; }
// Odškrtnutie nesie MNOŽSTVO a VÁRKU (audit 30. 9.): S.nakupCheck[týždeň|kľúč] = {blok: kúpené},
// v gramoch (alebo v surovom množstve receptu, keď gramáž nevieme). Do v33 to bolo `true` na názov,
// takže Paprika ✓ „kúpené 304 g" ostala kúpená aj keď plán narástol na 357 g, a čo si v pondelok
// kúpil na A+B, svietilo v stredu ako kúpené aj pre C. Starý tvar `true` platí ďalej ako „kúpené celé".
function kupeneVBloku(v,b){ if(v===true) return Infinity; if(!jeObjekt(v)) return 0; const x=+v[b]; return x>0&&isFinite(x)?x:0; }
// Stav riadku po várkach. `po` = {blok: potreba}, `zvys` = zásoba zo špajze v tej istej miere.
// Špajza sa míňa chronologicky (A pred B pred C) a len na to, čo ešte NIE JE kúpené — keď si A+B
// kúpil a nedal do špajze, zásoba ostane pre C. Mimo `sel` sa blok počíta (spotrebuje zásobu),
// ale do výsledku nejde. `res` = čo treba ešte kúpiť, `otv` = čo nie je kúpené (pred špajzou).
function stavPoBlokoch(po,v,zvys,sel){ const o={potreba:0,kupene:0,kupeneQ:0,spajza:0,chyba:0,res:{},otv:{}};
  Object.keys(po).map(Number).sort((a,b)=>a-b).forEach(b=>{ const need=po[b]||0, k=kupeneVBloku(v,b);
    const otv=Math.max(0,need-k), s=Math.min(otv,zvys); zvys-=s;
    if(sel&&!sel.includes(b)) return;
    o.potreba+=need; o.kupene+=Math.min(k,need); o.kupeneQ+=isFinite(k)?k:need; o.spajza+=s; o.chyba+=otv-s;
    o.res[b]=otv-s; o.otv[b]=otv; });
  return o; }
// „Mám doma" cez synonymum: „vajíčka" pokryje riadok „Vajcia". Token musí potravinu menovať presne
// (jeDoma nad jej kľúčom) — „cesnakový" nesmie cez najdiPotravinu pokryť „Cesnak".
function domaPotraviny(tok){ const s=new Set();
  (tok||[]).forEach(t=>{ const p=najdiPotravinu(t); if(p && jeDoma(t,[bezDia(p.kluc)])) s.add(kanonKluc(p.kluc)); });
  return s; }
// „Nakupujem na: A · B · C" — viazané na týždeň (nový týždeň = všetky várky). null = celý týždeň.
// Kolo 4 (rodič, používateľ): vo štvrtok nákup obsahoval aj už zjedenú várku A. V AKTUÁLNOM týždni ponúkne
// výber várok tlačidlo „Len od dneška" = várky, ktoré sa ešte nezačali. Predvolene ostáva celý týždeň (nič sa neskryje ticho).
function nakupVyberOdDnes(){ if(!S.blokMode||S.viewOd!==pondelokPre(dnesISO())) return null;
  const dnes=(new Date().getDay()+6)%7, b=bloky(), bl=b.map((d,i)=>i).filter(i=>b[i][0]>dnes);
  return bl.length&&bl.length<b.length?bl:null; }
function nakupVyber(){ const v=S.nakupVarky;
  if(!S.blokMode||!jeObjekt(v)||v.od!==S.viewOd||!Array.isArray(v.bl)) return null;
  const n=bloky().length, bl=[...new Set(v.bl)].filter(b=>Number.isInteger(b)&&b>=0&&b<n).sort((a,b)=>a-b);
  return bl.length&&bl.length<n?bl:null; }
// `sel` = várky (indexy blokov), null = celý týždeň. cenaTyzdna a generátor volajú bez neho.
function nakupItems(sel){ sel=sel||null;
  const {grp,notes}=nakupPolozky(); const tok=domaTokens(), tokP=domaPotraviny(tok); const rows=[]; const zost=new Map();
  const EPS=0.01;
  Object.values(grp).forEach(G0=>{ const key=G0.key.replace(/'/g,"");
    if(G0.p&&bezDia(G0.p.kluc)==="voda") return; // voda z vodovodu sa nekupuje
    const doma=jeDoma(G0.nazov,tok)||!!(G0.p&&tokP.has(G0.p.kluc));
    // C3: od potreby odpočítaj skutočnú zásobu (jedna zásoba sa delí medzi riadky raz — podľa celej potreby)
    const sg=spajzaGramy(G0.nazov,G0.p,G0.grams,zost);
    const Gs=gPreBloky(G0,sel); if(!Gs) return;            // surovina nie je v zvolených várkach
    const gr=G0.grams>0, po={};
    for(const b in G0.po) po[b]=gr?G0.po[b].grams:G0.po[b].ziadane;
    // riadok s neznámou gramážou: akákoľvek zásoba ho kryje celý (ako doteraz)
    const st=stavPoBlokoch(po,S.nakupCheck[nakupCheckKey(key)],gr?sg:(sg>0?Infinity:0),sel);
    const hotovo=st.chyba<EPS, ck=(hotovo&&st.kupene>0)||doma, vSpajzi=!ck&&hotovo&&st.spajza>0;
    // zobrazené množstvo: otvorený riadok = čo ešte treba kúpiť; kúpený = potreba mínus špajza (ako doteraz)
    const odober=vSpajzi?0:(ck?st.spajza:st.potreba-st.chyba);
    const G=(gr&&odober>0)?zmensiOSpajzu(Gs,odober):Gs;
    const dovod=dovodBezCeny(G0); // z G0, nie z G — položka pokrytá špajzou má 0 g legitímne
    const odd=oddelenieRiadku(G0.nazov,G0.oddelenie);
    const b=nakupBalenie(G);
    rows.push({key,gkey:G0.key,odd,nazov:String(G0.nazov).replace(/,\s*balenie\b.*$/i,"").trim()||G0.nazov,p:G0.p,
      mnoz:nakupMnozstvo(G),cena:nakupCena(G),matched:!!G0.matched,
      bloky:Object.keys(Gs.bl||{}).map(Number).sort((a,b)=>a-b),
      cenaSpotreba:nakupCenaSpotreba(G),cenaBalenia:nakupCenaBalenia(G),gramy:G.grams,zoSpajze:st.spajza,
      bezCeny:!!dovod,dovodCeny:dovod,akc:ingVakcii(G0.nazov),doma,vSpajzi,dokupit:!doma&&!hotovo&&st.kupene>0,
      klik:true,zaklad:jeZakladnaVec({odd,gramy:G.grams,voda:!!(G0.p&&G0.p.kluc==="voda"),balG:b&&!b.odhad?b.celkG:0}),ck,
      // pre odškrtnutie a „Kúpené do špajze": miera (g = gramy, z = surové množstvo), po várkach
      mer:gr?"g":"z",potreba:st.potreba,kupene:st.kupene,kupeneQ:st.kupeneQ,res:st.res,otv:st.otv,
      balG:b&&gr&&!b.odhad?b.celkG:0,
      kusy:gr&&G0.p&&G0.p.g_za_ks>0&&G.hasKs&&!G.hasG&&!G.hasMl&&Object.keys(G.pocty).every(j=>KS_JEDNOTKY.includes(j.toLowerCase().trim()))}); });
  Object.keys(notes).forEach(kk=>{ const N=notes[kk];
    // C9: „podľa chuti", ktorú iný recept vo zvolených várkach pýta s množstvom, nerobí druhý riadok
    // („Soľ 4 g" + „Soľ podľa chuti" = dve položky na tú istú vec). Riadok s množstvom je informatívnejší.
    if(grp[kk] && gPreBloky(grp[kk],sel)) return;
    const bl=Object.keys(N.bl).map(Number).sort((a,b)=>a-b).filter(b=>!sel||sel.includes(b)); if(!bl.length) return;
    const key="note|"+bezDia(N.nazov); const doma=jeDoma(N.nazov,tok)||!!(N.p&&tokP.has(N.p.kluc));
    const po={}; Object.keys(N.bl).forEach(b=>{ po[b]=1; });
    const st=stavPoBlokoch(po,S.nakupCheck[nakupCheckKey(key)],0,sel);
    rows.push({key,odd:oddelenieRiadku(N.nazov,N.oddelenie),nazov:N.nazov,p:N.p,mnoz:"<i>"+escHtml(N.pozn)+"</i>",akc:false,doma,klik:true,pozn:true,zaklad:true,
      ck:(st.chyba<EPS&&st.kupene>0)||doma,bloky:bl,mer:"n",potreba:st.potreba,kupene:st.kupene,kupeneQ:st.kupeneQ,res:st.res,otv:st.otv}); });
  return rows;
}
// N-obchod: 36 % zoznamu (16 z 85 riadkov korenia — Borievky 0 g, Čierne korenie 2 g — a 15 riadkov
// „podľa chuti") boli veci, ktoré v obchode nekupuješ. Nemiznú (keď dôjde soľ, musíš to vidieť), ale
// idú do zbalenej sekcie na koniec a nerátajú sa do počtu položiek ani do ceny hlavného zoznamu.
// Hranica 25 g: 2 g korenia si doma máš, 100 g sladkej papriky na guláš je nákup.
const ZAKLAD_MAX_G=25;
// Audit 8. 10.: voda z vodovodu sa nekupuje; a keď recepty minú do 60 g z balenia a menej než 10 % z neho
// (čili olej 1 l pri 55 ml, kokos 200 g pri 2 g), je to vec „mám doma / kúpim raz na dlho", nie týždenný nákup.
function jeZakladnaVec(r){ if(!r) return false;
  if(r.pozn || r.voda) return true;                           // „podľa chuti" — recept nepovie množstvo
  if(r.balG>0 && r.gramy>0 && r.gramy<=60 && r.gramy<r.balG*0.1 && r.odd!=="Zelenina a ovocie") return true; // čerstvé sa kupuje vždy
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
  // id ručnej položky prichádza aj synchronizáciou skupiny: samotné escHtml v onclick nestačí —
  // prehliadač &#39; v atribúte dekóduje späť na ' ešte pred spustením JS. Preto najprv JS-reťazec.
  if(r.man){ const ei=escHtml(String(r.id||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'"));
    return `<div class="nak-row${r.ck?' checked':''}"><label class="${r.ck?'checked':''}"><input type="checkbox" data-fokus="nakm:${ei}" ${r.ck?'checked':''} onchange="checkManual('${ei}',this.checked)"><span class="nm2">${escHtml(r.nazov)}${r.mnoz?' — <b>'+escHtml(r.mnoz)+'</b>':''} <span class="info">(ručné)</span></span></label><button class="nak-i warn" title="Zmazať položku" aria-label="Zmazať položku ${escHtml(r.nazov)}" onclick="zmazManual('${ei}')">✕</button></div>`; } // N1: ručná položka v oddelení
  const js=s=>escHtml(String(s||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'"));
  const info=r.klik&&r.gkey?`<button class="nak-i" title="v ktorom recepte · čím nahradiť" aria-label="Detail suroviny ${escHtml(r.nazov)}" onclick="surovinaInfo('${js(r.gkey)}','${en}')">ⓘ</button>`:'';
  // `mnoz` je HTML (nakupMnozstvo / nakupZoznam ho escapujú). „dokúpiť +" = plán narástol po odškrtnutí.
  return `<div class="nak-row${r.ck?' checked':''}"><label class="${r.ck?'checked':''}"><input type="checkbox" data-fokus="nak:${escHtml(r.key)}" ${r.ck?'checked':''} ${r.doma?'disabled':''} onchange="checkNakup('${js(r.key)}',this.checked)"><span class="nm2"><span class="nak-nazov">${escHtml(r.nazov)}${znakyBlokov(r.bloky)}</span><span class="sr-only"> — </span><span class="nak-mn">${r.dokupit?'<span class="nak-dokup">dokúpiť +</span>':''}${r.mnoz}${r.doplnit?` <span class="info">+ doplniť zásobu ${escHtml(r.doplnit)}</span>`:''}${r.low?' <span class="info">🧊 pod minimom</span>':''}${r.akc?' <span class="badge price">🏷️ akcia</span>':''}${r.doma?' <span class="info">(máš doma)</span>':''}</span></span></label>${info}</div>`; }
// Ručná položka patrí týždňu (audit 30. 9.: odškrtnutý toaletný papier visel v „Už máme" každý
// ďalší týždeň). Nekúpená sa nesie dopredu, kým ju neodškrtneš. Bez `tyzden` (sync zo staršej
// verzie, „+ do nákupu" z Čo mám doma) patrí tomuto týždňu.
function manualVidno(m){ const t=/^\d{4}-\d{2}-\d{2}$/.test(m.tyzden||"")?m.tyzden:pondelokPre(dnesISO());
  return t===S.viewOd || (!m.done && t<S.viewOd); }
const podlaMena=(a,b)=>String(a.nazov).localeCompare(String(b.nazov),"sk");
// JEDEN výpočet zoznamu pre obrazovku (renderNakup) aj pre kopírovanie a zdieľanie (nakupText):
// oddelenia v poradí trasy, ručné položky a „🧊 Doplniť zásoby" v nich, dochucovadlá zvlášť.
// `spolu`/`hotovo` je jediné pravidlo pre počítadlo, prúžok aj 🎉: položky na kúpu = všetko okrem
// dochucovadiel a toho, čo kryje špajza, VRÁTANE ručných položiek a zásob pod minimom.
function nakupZoznam(sel){
  const rows=nakupItems(sel);
  const man=(S.nakupManual||[]).filter(manualVidno).map(m=>({man:true,id:m.id,nazov:m.nazov,mnoz:m.mnoz||"",odd:m.odd||"Ostatné",ck:!!m.done})); // N1
  // Zásoba pod minimom je skutočná položka s políčkom v svojom oddelení (do v33 <label> bez
  // checkboxu navrchu zoznamu). Keď tú istú vec pýta aj plán (olivový olej), pribudne k jeho riadku.
  const low=[];
  (S.spajza||[]).forEach(x=>{ const ch=chybaDoMinima(x); if(!(ch>0)) return; const t=fmt(ch)+" "+(x.jednotka||"");
    const r=rows.find(r=>!r.ck&&!r.vSpajzi&&!r.doma&&spajzaSedi(x,r.nazov,r.p));
    if(r){ r.doplnit=t; r.zaklad=false; return; }
    const p=najdiPotravinu(String(x.nazov)), key="low|"+x.id;
    low.push({low:true,key,nazov:x.nazov,mnoz:"<b>"+escHtml(t)+"</b>",odd:oddelenieRiadku(x.nazov,(p&&p.oddelenie)||"Ostatné"),
      ck:!!S.nakupCheck[nakupCheckKey(key)],zaklad:false}); });
  const U=rows.filter(r=>!r.zaklad&&!(r.vSpajzi&&!r.ck)).concat(man,low);
  const otv=U.filter(r=>!r.ck);
  const podla=Object.create(null); otv.forEach(r=>(podla[r.odd]=podla[r.odd]||[]).push(r)); // bez prototypu: `odd` ručnej položky je cudzí text („__proto__")
  const por=poradieOddeleni();
  return {oddelenia:por.filter(o=>podla[o]).concat(Object.keys(podla).filter(o=>!por.includes(o))).map(o=>({odd:o,rows:podla[o].sort(podlaMena)})),
    zaklady:rows.filter(r=>!r.ck&&!r.vSpajzi&&r.zaklad).sort(podlaMena), vSpajzi:rows.filter(r=>!r.ck&&r.vSpajzi).sort(podlaMena),
    hotove:rows.filter(r=>r.ck).concat(man.filter(r=>r.ck),low.filter(r=>r.ck)).sort(podlaMena),
    spolu:U.length, hotovo:U.length-otv.length, akcia:otv.filter(r=>r.akc).length, prazdne:!rows.length&&!man.length&&!low.length}; }
// „Nakupujem na: A · B · C" — skutočné prepínače s aria-pressed, NIE .chip.active: v okne generátora
// znamená tmavý chip VYPNUTÝ deň, rovnaká bublina by tu znamenala opak. Bez blokov sa nekreslí.
// Riadok sedí v súhrne nákupu (v Obchode by vlastný riadok s menovkou odsunul prvú položku o ~60 px);
// čo tlačidlá robia, povie skupina čítačke (aria-label), titulok a toast po prepnutí.
function varkyHTML(sel,bezOdDnes){ if(!S.blokMode) return ""; const b=bloky(); if(b.length<2) return "";
  // Viditeľná menovka (audit 8. 10.): bez nej ťuk na „A Po–Ut" vyzeral ako filter a položky „zmizli".
  return `<div class="nak-varky" role="group" aria-label="Nakupujem na várky" title="Nakupujem na várky"><span class="info" aria-hidden="true">Nakupujem na:</span>`+
    b.map((dni,bi)=>{ const on=!sel||sel.includes(bi), od=DNI[dni[0]].slice(0,2), po=DNI[dni[dni.length-1]].slice(0,2), dn=od+(dni.length>1?"–"+po:"");
      return `<button type="button" id="varka-${bi}" class="btn varka" aria-pressed="${on}" title="Nakupujem na várku ${blokPismeno(bi)} (${dn})" onclick="prepniVarku(${bi})">${znakBloku(bi)}<span class="varka-dni">${dn}</span></button>`; }).join("")
    +(()=>{ const od=bezOdDnes?null:nakupVyberOdDnes(); return od&&JSON.stringify(od)!==JSON.stringify(sel)?`<button type="button" class="btn varka-dnes" onclick="nakupOdDnes()">Len od dneška (${od.map(blokPismeno).join(" + ")})</button>`:""; })()+`</div>`; }
function nakupOdDnes(){ const od=nakupVyberOdDnes(); if(!od) return; tik(); S.nakupVarky={od:S.viewOd,bl:od}; save(); drzFokus(renderNakup);
  toast("Nakupuješ len na "+(od.length>1?"várky ":"várku ")+od.map(blokPismeno).join(" + ")+" — začaté várky sa nerátajú."); }
function prepniVarku(bi){ tik(); const n=bloky().length; let bl=nakupVyber()||[...Array(n).keys()];
  bl=bl.includes(bi)?bl.filter(b=>b!==bi):bl.concat(bi);
  if(!bl.length){ toast("Aspoň jedna várka musí ostať zapnutá."); return; }
  S.nakupVarky={od:S.viewOd,bl:bl.sort((a,b)=>a-b)}; save(); renderNakup();
  toast(bl.length===n?"Nakupuješ na celý týždeň.":"Nakupuješ len na "+(bl.length>1?"várky ":"várku ")+bl.map(blokPismeno).join(" + ")+" — zvyšok týždňa sa neráta."); }
// Dochucovadlá sú rozbalené (v31), ale ručné zbalenie platí do konca relácie — do v33 sa otvorili
// znova pri každom odškrtnutí inej položky.
let _zakladyOtvorene=true;
function renderNakup(){
  const box=document.getElementById("nakup-list");
  const nk=document.getElementById("nakup-kontext"); if(nk){nk.innerHTML=tyzdenNavHTML(); zpristupniKliky(nk);} // nákup je na zvolený týždeň — treba to vidieť
  const domaEl=document.getElementById("doma-nakup"); if(domaEl){ if(document.activeElement===domaEl){S.domaNakup=domaEl.value;save();} else domaEl.value=S.domaNakup||""; }
  const sel=nakupVyber(), Z=nakupZoznam(sel);
  let h=""; const vk=varkyHTML(sel,Z.prazdne);
  const plus='<button type="button" class="btn nak-plus" onclick="pridajNakupRychlo()" aria-label="Pridať vlastnú položku" title="Pridať vlastnú položku">＋</button>';
  // výber várok ostáva aj nad prázdnym zoznamom — inak by sa z „várka C nemá nič" nedalo vrátiť
  if(Z.prazdne) h+=vk+`<p class="info">${sel?"Vo zvolených várkach nie je nič na nákup.":"Zatiaľ nič v pláne — nákup sa poskladá sám z jedál v Pláne."} Môžeš pridať aj <button type="button" class="lnk" onclick="pridajNakupRychlo()">vlastnú položku</button>.</p>`
    +(sel?"":`<div class="btn-row"><button class="btn primary" onclick="prepni('planovac');generujTlacidlo()">✨ Zostaviť jedálniček</button></div>`);
  else {
  // v31: ceny v Nákupe nie sú (výslovná voľba používateľa) — cenaTyzdna/dovodBezCeny ostávajú
  // pre generátor a testy, na obrazovku sa už nevypisujú.
  // Koniec nákupu je vlastný stav: bez neho zostal na obrazovke len zoznam preškrtnutých názvov.
  // Svieti PRÁVE vtedy, keď je prúžok na 100 % (do v33 mali každý iné pravidlo).
  if(Z.spolu && Z.hotovo===Z.spolu)
    h+=`<div class="nakup-suhrn nak-hotovo"><span><b>🎉 Máš všetko v košíku.</b></span>`+
      `<button type="button" class="btn primary" onclick="kupeneDoSpajze()">📥 Kúpené do špajze</button>`+
      `<button type="button" class="btn" onclick="vycistiNakup()">Zrušiť odškrtnutie</button></div>`;
  // P2: súhrn mal na telefóne 205 px a odtlačil prvú položku pod prehyb. Hore zostáva to,
  // kvôli čomu človek na súhrn pozerá v obchode — koľko ešte; zvyšok (dochucovadlá, akcie,
  // rozdiel nákup/plán) je na telefóne pod „podrobnosti". Počítadlo a prúžok sú jedno číslo.
  const viac=(Z.zaklady.length?`<span class="info" title="Korenie a „podľa chuti“ — na konci zoznamu">+ ${Z.zaklady.length} dochucovadiel</span>`:"")+
    `${Z.akcia?`<span class="badge price">🏷️ ${Z.akcia} v akcii</span>`:""}${nakupKryciePokrytieHTML()}`;
  h+=`<div class="nakup-suhrn">`+vk+(Z.spolu?`<span class="nak-pocet"><b>${Z.hotovo}</b> / ${Z.spolu} v košíku</span>`:`<span>Nič na kúpu — všetko máš.</span>`)+plus+
    (viac?`<details class="suhrn-viac"${jeMobil()?"":" open"}><summary>podrobnosti</summary><div class="sv-in">${viac}</div></details>`:"")+
    (Z.spolu?`<div class="nak-pruh" role="progressbar" aria-label="V košíku" aria-valuemin="0" aria-valuemax="${Z.spolu}" aria-valuenow="${Z.hotovo}" aria-valuetext="${Z.hotovo} zo ${Z.spolu} položiek v košíku"><i style="width:${Math.round(Z.hotovo/Z.spolu*100)}%"></i></div>`:"")+
    `</div>`;
  Z.oddelenia.forEach(o=>{ h+=`<div class="odd"><h3>${escHtml(o.odd)}</h3>`+o.rows.map(riadokNakup).join("")+"</div>"; }); // oddelenie ručnej položky je text zo stavu
  if(Z.zaklady.length) h+=`<details class="odd zaklady"${_zakladyOtvorene?" open":""} ontoggle="_zakladyOtvorene=this.open"><summary>🧂 Dochucovadlá a základné veci — ${Z.zaklady.length} <span class="info">(kupuj, len ak ti došli)</span></summary>`+
    Z.zaklady.map(riadokNakup).join("")+"</details>";
  if(Z.vSpajzi.length) h+='<div class="odd done-sekcia"><h3>🏠 Mám v špajzi (over pred nákupom)</h3>'+Z.vSpajzi.map(riadokNakup).join("")+"</div>";
  if(Z.hotove.length){
    if(Z.hotovo<Z.spolu && Z.hotove.some(r=>!r.man&&!r.doma)) h+='<div class="nak-dospajze"><button type="button" class="btn" onclick="kupeneDoSpajze()">📥 Odškrtnuté do špajze</button></div>';
    h+='<div class="odd done-sekcia"><h3>✓ Už máme / v košíku</h3>'+Z.hotove.map(riadokNakup).join("")+"</div>"; }
  }
  // Po prekreslení vráť fokus na rozumné miesto — klávesnica a TalkBack padali na <body>.
  // Odškrtnutá položka odišla do „Už máme", takže na jej indexe je teraz ďalšia položka.
  const ae=document.activeElement, vnutri=!!(ae&&box.contains&&box.contains(ae));
  const fid=vnutri&&ae.id?ae.id:null, pol=vnutri&&ae.type==="checkbox"?[...box.querySelectorAll("input[type=checkbox]")].indexOf(ae):-1;
  box.innerHTML=h;
  const ciel=fid?document.getElementById(fid):(pol>=0?box.querySelectorAll("input[type=checkbox]")[pol]||[...box.querySelectorAll("input[type=checkbox]")].pop():null);
  if(ciel&&ciel.focus){ try{ ciel.focus({preventScroll:true}); }catch(e){} }
}
// „začať nákup odznova" — maže odškrtnutie TOHTO týždňa a zvolených várok. Do v33 bez potvrdenia
// a bez cesty späť (celý nákup preč jedným ťuknutím), teraz s „↩ Späť".
function bezVarok(v,sel,n){ const o={}; // odškrtnutie mimo várok `sel`; `true` (kúpené celé) sa rozpíše
  for(let b=0;b<n;b++){ if(sel.includes(b)) continue; const k=kupeneVBloku(v,b); if(k>0) o[b]=isFinite(k)?k:1e9; }
  return Object.keys(o).length?o:null; }
function vycistiNakup(){ const pre=nakupCheckKey(""), sel=nakupVyber(), n=bloky().length;
  const pred=JSON.parse(JSON.stringify(S.nakupCheck)), predMan=(S.nakupManual||[]).map(m=>[m,m.done,m.tyzden]);
  Object.keys(S.nakupCheck).forEach(k=>{ if(k.indexOf(pre)!==0) return;
    const v=(sel&&k.slice(pre.length).indexOf("low|")!==0)?bezVarok(S.nakupCheck[k],sel,n):null;
    if(v) S.nakupCheck[k]=v; else delete S.nakupCheck[k]; });
  if(!sel) (S.nakupManual||[]).forEach(m=>{ if(manualVidno(m)) m.done=false; });
  save(); renderNakup();
  toast("Odškrtnutie zrušené.",{text:"↩ Späť",fn:()=>{ S.nakupCheck=pred; predMan.forEach(([m,d,t])=>{ m.done=d; m.tyzden=t; }); save(); renderNakup(); }},5000); } // v obchode krátko — toast leží nad ďalšími riadkami
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
// Odškrtnutie si zapamätá, KOĽKO a NA KTORÚ VÁRKU si kúpil: to, čo ešte chýbalo (`res`), a keď
// riadok hovorí „1× 1 kg" na 888 g, celé balenie (rozdelené pomerne medzi várky). Keď plán neskôr
// narastie, riadok sa vráti medzi nekúpené ako „dokúpiť +53 g". Odškrtnutie odsunie položku do
// „Už máme" — toast ponúkne „↩ Späť", lebo pod prstom je zrazu iná položka.
function checkNakup(key,val){ tik(); const k=nakupCheckKey(key), sel=nakupVyber(), n=bloky().length, pred=S.nakupCheck[k];
  let meno="";
  if(key.indexOf("low|")===0){ if(val) S.nakupCheck[k]=true; else delete S.nakupCheck[k]; }   // zásoba pod minimom nemá várku
  else if(!val){ const v=sel?bezVarok(pred,sel,n):null; if(v) S.nakupCheck[k]=v; else delete S.nakupCheck[k]; }
  else if(pred!==true){ const r=nakupItems(sel).find(x=>x.key===key), o=jeObjekt(pred)?Object.assign({},pred):{};
    if(r){ meno=r.nazov; let chyba=0; for(const b in r.res) chyba+=r.res[b];
      const zdroj=chyba>0?r.res:r.otv;                 // riadok krytý špajzou = „vzal som zo špajze"
      const f=(chyba>0&&r.balG>chyba)?r.balG/chyba:1;
      let pridane=0; for(const b in zdroj) if(zdroj[b]>0){ o[b]=(o[b]||0)+zdroj[b]*f; pridane++; }
      if(!pridane) (r.bloky||[]).forEach(b=>{ o[b]=1e9; }); }
    S.nakupCheck[k]=Object.keys(o).length?o:true; }
  save(); const hot=val&&_nakupDokonceny(); _nakupPrekresli("nak:"+key,val,hot); if(!val) toastSkry();
  if(val) toast(hot?"🎉 Máš všetko v košíku.":"✓ "+(meno||"Položka")+" v košíku",null,hot?8000:1400); }
// Kolo 6–7 (pocit, ovládanie): odškrtnutý riadok OSTANE na mieste (prečiarknutý) a zoznam sa preusporiada až po 1,2 s
// bez ďalšieho ťuku — inak druhý rýchly ťuk trafil susednú položku, ktorá sa medzitým posunula o 72 px.
// Počítadlo a prúžok sa menia hneď (ten istý prvok, takže šírka plynulo dobehne). Posledná položka = hneď 🎉.
let _nakT=null;
function _fokusNak(f){ const i=[...document.querySelectorAll("#nakup-list input[data-fokus]")].find(x=>x.dataset.fokus===f); if(i) i.focus({preventScroll:true}); }
function _nakupPrekresli(fokus,val,hot){ clearTimeout(_nakT); _nakT=null;
  // kolo 8 (prístupnosť): kto odškrtáva klávesnicou, ostane na ĎALŠEJ položke — odškrtnutá odišla na koniec zoznamu
  const vsetky=[...document.querySelectorAll("#nakup-list input[data-fokus]")].filter(x=>!x.checked||x.dataset.fokus===fokus), ix=vsetky.findIndex(x=>x.dataset.fokus===fokus);
  const dalsi=val&&ix>=0?(vsetky[ix+1]||vsetky[ix-1]):null, dalsiF=dalsi&&dalsi.dataset.fokus;
  const hotovo=()=>{ const a=document.activeElement, mal=a&&a.dataset&&a.dataset.fokus===fokus; const pred=new Map(); if(_pohyb()) document.querySelectorAll("#nakup-list .nak-row input[data-fokus]").forEach(i=>pred.set(i.dataset.fokus,i.closest(".nak-row").getBoundingClientRect().top));
    drzFokus(()=>renderNakup());
    if(pred.size) document.querySelectorAll("#nakup-list .nak-row input[data-fokus]").forEach(i=>{ const y0=pred.get(i.dataset.fokus); if(y0==null) return; const row=i.closest(".nak-row"), dy=y0-row.getBoundingClientRect().top; if(Math.abs(dy)<2||Math.abs(dy)>600) return;
      row.style.transition="none"; row.style.translate="0 "+dy+"px"; requestAnimationFrame(()=>{ row.style.transition="translate 220ms cubic-bezier(.2,.8,.2,1)"; row.style.translate=""; setTimeout(()=>{ row.style.transition=""; },260); }); }); if(mal&&dalsiF) _fokusNak(dalsiF); if(hot){ const b=document.querySelector("#v-nakup .nak-hotovo"); if(b&&b.scrollIntoView) b.scrollIntoView({block:"center",behavior:_pohyb()?"smooth":"auto"}); } };
  const inp=val&&!hot&&fokus?[...document.querySelectorAll("#nakup-list input[data-fokus]")].find(x=>x.dataset.fokus===fokus):null, row=inp&&inp.closest(".nak-row");
  if(!row){ hotovo(); return; }
  row.classList.add("odchadza"); const lab=row.querySelector("label"); if(lab) lab.classList.add("checked");
  try{ const Z=nakupZoznam(nakupVyber()), b=document.querySelector("#v-nakup .nak-pocet b"), p=document.querySelector("#v-nakup .nak-pruh");
    if(b) b.textContent=Z.hotovo; if(p){ p.setAttribute("aria-valuenow",Z.hotovo); p.setAttribute("aria-valuetext",Z.hotovo+" zo "+Z.spolu+" položiek v košíku"); const i=p.querySelector("i"); if(i&&Z.spolu) i.style.width=Math.round(Z.hotovo/Z.spolu*100)+"%"; } }catch(e){}
  _nakHotovo=hotovo; _nakT=setTimeout(()=>{ _nakT=null; _nakHotovo=null; hotovo(); },1600); }
// kolo 8 (ovládanie): ďalší dotyk v zozname počas čakania čakanie predĺži — zoznam sa nepreusporiada pod prstom
let _nakHotovo=null;
document.addEventListener("pointerdown",e=>{ if(_nakT&&_nakHotovo&&e.target.closest&&e.target.closest("#nakup-list")){ clearTimeout(_nakT); const h=_nakHotovo; _nakT=setTimeout(()=>{ _nakT=null; _nakHotovo=null; h(); },1600); } },true);
// Posledný ťuk v obchode je udalosť, nie ďalší riadok: banner 🎉 bol na y = −1080 a ostala len 8 ms vibrácia (kolo 3, pocit).
function _nakupDokonceny(){ const Z=nakupZoznam(nakupVyber()); if(!(Z.spolu&&Z.hotovo===Z.spolu)) return false;
  vibruj(USPECH); return true; } // banner 🎉 posunie do pohľadu _nakupPrekresli až po prekreslení
// „mlieko 2 l" aj „2 l mlieka" → názov + množstvo. Číslo na začiatku musí mať za sebou slovo,
// takže „100 % pomarančový džús" ostane celé názvom.
function parsujManual(v){ let m=v.match(/^(\d+(?:[.,]\d+)?)\s*(kg|dkg|g|ml|dl|l|ks|bal\.?|balenia|balení|balenie|x|×)?\s+(\p{L}.*)$/iu);
  if(m) return {nazov:m[3].trim(),mnoz:(m[1]+(m[2]?" "+m[2]:"")).trim()};
  m=v.match(/^(.*?)[\s,]+(\d+(?:[.,]\d+)?\s*\S*)$/); // N1: "mlieko 2 l" → názov + množstvo
  return m?{nazov:m[1].trim(),mnoz:m[2].trim()}:{nazov:v,mnoz:""}; }
function spojMnozstva(a,b){ if(!a) return b||""; if(!b) return a;
  const x=a.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/), y=b.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if(x&&y&&x[2].toLowerCase()===y[2].toLowerCase()) return fmt(parseFloat(x[1].replace(",","."))+parseFloat(y[1].replace(",",".")))+(x[2]?" "+x[2]:"");
  return a+" + "+b; }
// `txt` = text zvonka (rýchle pridanie v režime Obchod); bez neho sa číta pole pod zoznamom.
function pridajNakupPolozku(txt){ const el=document.getElementById("nakup-manual");
  const v=String(txt!=null?txt:(el&&el.value)||"").trim();
  if(!v){ toast("Napíš, čo pridať — napr. „mlieko 2 l“."); if(el&&txt==null&&el.focus) el.focus(); return; }
  const {nazov,mnoz}=parsujManual(v);
  const p=najdiPotravinu(nazov); // N1: auto-oddelenie zo slovníka potravín
  // Dvakrát zadané „mlieko" (aj „Mlieko", „mlieka", „vajíčka" k „vajcia") je jedna položka — množstvá sa
  // sčítajú. Potravinou len keď názov JE tá potravina (rovnako slov ako kľúč): „Celozrnný chlieb" ≠ „Chlieb".
  const presne=(meno,pp)=>pp&&_slova(meno).length===_slova(pp.kluc).length;
  const kk=presne(nazov,p)?kanonKluc(p.kluc):null;
  const ist=S.nakupManual.find(m=>{ if(m.done||!manualVidno(m)) return false; if(bezDia(m.nazov)===bezDia(nazov)) return true;
    const pm=najdiPotravinu(m.nazov); return !!kk&&presne(m.nazov,pm)&&kanonKluc(pm.kluc)===kk; });
  if(ist){ ist.mnoz=spojMnozstva(ist.mnoz||"",mnoz); toast("„"+ist.nazov+"“ už v zozname je — zlúčené"+(ist.mnoz?" ("+ist.mnoz+")":"")+"."); }
  else S.nakupManual.push({id:"m"+(S.spSid++),nazov:nazov,mnoz:mnoz,odd:p?p.oddelenie:"Ostatné",done:false,tyzden:S.viewOd});
  if(el&&txt==null) el.value=""; save(); renderNakup(); }
// Režim Obchod skrýva riadok „+ Pridať" (zoznam má byť hore), pridať sa však musí dať aj pri regáli.
async function pridajNakupRychlo(){ const v=await promptModal("Pridať do nákupu (napr. mlieko 2 l):","","","+ Pridať"); if(v===null) return; pridajNakupPolozku(String(v)); }
function checkManual(id,val){ tik(); const m=S.nakupManual.find(x=>x.id===id); if(!m) return;
  const pred=[m.done,m.tyzden]; m.done=val; if(val) m.tyzden=S.viewOd;   // prenesená nekúpená položka patrí týždňu, v ktorom si ju kúpil
  save(); const hot=val&&_nakupDokonceny(); _nakupPrekresli("nakm:"+id,val,hot); if(!val) toastSkry();
  if(val){ toast(hot?"🎉 Máš všetko v košíku.":"✓ "+m.nazov+" v košíku.",{text:"↩ Späť",fn:()=>{ m.done=pred[0]; m.tyzden=pred[1]; save(); renderNakup(); }},hot?8000:4000); } }
function zmazManual(id){ S.nakupManual=S.nakupManual.filter(x=>x.id!==id); save(); renderNakup(); }
// Rozpis musí byť z TOHO ISTÉHO výpočtu ako nákup (nakupPolozky.zdroje), nie z hrubého i.mnozstvo —
// inak tu svieti množstvo na 1 porciu receptu a v nákupe prepočítané na plán, a nesedí to.
function surovinaInfo(key,nazov){ const n=bezDia(nazov||key);
  const G=nakupPolozky().grp[key];
  const zdroje=(G&&G.zdroje)||[];
  let nah=[]; for(const k in SUBSTITUCIE){ if(n.includes(bezDia(k))){ nah=SUBSTITUCIE[k]; break; } }
  let h=`<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>${escHtml(nazov||key)}</h2></div><div class="content2">`;
  h+=`<h3 class="sekcia">🍲 V ktorom recepte (z plánu)</h3>`;
  if(G) h+=`<p class="info" style="margin-top:0">Spolu na nákup: <b>${zobrazMnozstvo(G)}</b></p>`;
  if(!zdroje.length){ // „podľa chuti" položky nemajú množstvo — aspoň ukáž, ktoré recepty ju používajú
    planovaneRecepty().forEach(r=>{ if((r.ingrediencie||[]).some(i=>{const nn=bezDia(i.nazov);return nn.includes(n)||n.includes(nn.split(" ")[0]);})
      && !zdroje.some(z=>z.id===r.id)) zdroje.push({recept:r.nazov,id:r.id,ing:"",mn:null}); }); }
  h+= zdroje.length? zdroje.map(z=>{ const r=receptById(z.id);
      return `<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvor('${z.id}')"><span class="nm">${(r&&ikony[r.kategoria])||"🍴"} ${escHtml(z.recept)}${z.ing&&z.ing!==(G&&G.nazov)?` <small class="meta2">(${escHtml(z.ing)})</small>`:""}</span><span class="kc">${z.mn==null?"podľa chuti":escHtml(prevodJednotka(z.mn,z.jednotka))}</span></div>`; }).join("")
    : '<p class="info">V aktuálnom pláne túto surovinu nepoužíva žiadny recept.</p>';
  h+='<h3 class="sekcia">🔄 Čím nahradiť</h3>';
  h+= nah.length? `<p>${nah.join(", ")}</p>` : '<p class="info">Pre túto surovinu nemám návrh náhrady.</p>';
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
// Len nekúpené položky (pre kopírovanie/zdieľanie) — z TOHO ISTÉHO výpočtu ako obrazovka (nakupZoznam),
// teda v poradí trasy s hlavičkami oddelení, ručné položky s množstvom („mlieko 2 l", do v33 len
// „mlieko"), zásoby pod minimom v ich oddelení, dochucovadlá a „mám doma" zvlášť na konci.
// C4: položky zo špajze sa NEVYNECHÁVAJÚ — v obchode by chýbali, keď sa zásoba medzitým minula.
// Vracia riadky; `.poloziek` = počet položiek bez hlavičiek.
function nakupText(){ const Z=nakupZoznam(nakupVyber()), out=[]; let n=0;
  const pol=r=>{ n++; return r.man?r.nazov+(r.mnoz?" "+r.mnoz:""):
    r.nazov+" "+(r.dokupit?"dokúpiť +":"")+unescHtml(String(r.mnoz||"").replace(/<[^>]+>/g,"")).replace(/\s+/g," ").trim()+(r.doplnit?" + doplniť zásobu "+r.doplnit:""); };
  Z.oddelenia.forEach(o=>{ out.push(o.odd+":"); o.rows.forEach(r=>out.push(pol(r))); });
  if(Z.zaklady.length){ out.push("Dochucovadlá (len ak došli):"); Z.zaklady.forEach(r=>out.push(pol(r))); }
  if(Z.vSpajzi.length){ out.push("Mám doma (over):"); Z.vSpajzi.forEach(r=>out.push(pol(r)+" (mám doma)")); }
  out.poloziek=n; return out;
}
function kopirujListonic(){
  const riadky=nakupText();
  if(!riadky.length){ toast("Zoznam je prázdny."); return; }
  const txt=riadky.join("\n");
  if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(()=>toast("Skopírované ("+sklon(riadky.poloziek,"položka","položky","položiek")+")."),()=>promptFallback(txt)); }
  else promptFallback(txt);
}
// B (audit 30. 9.): odškrtnuté jedným ťuknutím do špajze. Množstvo = čo si kúpil (odškrtnutie si
// pamätá aj celé balenie), jednotka podľa riadku (ks / ml / g), expirácia odhadom z TRVANLIVOST_DNI
// (navrhExpiry). „Máš doma" ani ručné položky sa nepresúvajú; dochucovadlo len odškrtnuté (jedno
// balenie). Presunuté sa odškrtnú späť — kryje ich špajza, takže druhé ťuknutie nič nezdvojí.
function kupeneDoZasoby(r){ const p=r.p;
  if(r.mer==="n") return p&&p.balenie_g>0?(jeLiata(p)?{mn:Math.round(p.balenie_g/(p.hustota||1)),jed:"ml"}:{mn:p.balenie_g,jed:"g"}):null;
  if(r.mer!=="g") return null;                        // gramáž nevieme → nevieme ani, koľko si kúpil
  const g=Math.max(r.kupeneQ||0,r.balG||0); if(!(g>0)) return null;
  if(p&&r.kusy) return {mn:Math.max(1,Math.ceil(g/p.g_za_ks-1e-6)),jed:"ks"};
  if(p&&jeLiata(p)) return {mn:Math.round(g/(p.hustota||1)),jed:"ml"};
  return {mn:Math.round(g),jed:"g"}; }
const MIESTO_ODDELENIA={"Mäso a ryby":"Chladnička","Mliečne a vajcia":"Chladnička","Chladené":"Chladnička","Mrazené":"Mraznička"};
// Pripočíta k platnej zásobe tej istej potraviny (aj synonyma) na tom istom mieste, inak nová zásoba.
// Expirácia zlúčenej zásoby = skoršia z dvoch: radšej upozorniť skôr, než nechať pokaziť.
function pridajDoSpajze(nazov,p,mn,jed){ const miesto=MIESTO_ODDELENIA[(p&&p.oddelenie)||""]||"Špajza";
  const exp=navrhExpiry(nazov,miesto), kk=p?kanonKluc(p.kluc):"";
  const x=S.spajza.find(z=>zasobaPlatna(z)&&z.miesto===miesto&&(kk?kanonKluc(z.kluc||(najdiPotravinu(String(z.nazov))||{}).kluc||"")===kk:bezDia(z.nazov)===bezDia(nazov)));
  if(x){ const q=x.jednotka===jed?mn:gramyNaJed(gramy({mnozstvo:mn,jednotka:jed},p),x.jednotka,p);
    if(q>0){ x.mnozstvo=Math.round((x.mnozstvo+q)*100)/100; x.expiry=[x.expiry,exp].filter(Boolean).sort()[0]||""; return; } }
  S.spajza.push({id:S.spSid++,nazov:nazov,kluc:p?p.kluc:"",mnozstvo:mn,jednotka:jed,miesto:miesto,expiry:exp,min:0}); }
function kupeneDoSpajze(){ const sel=nakupVyber(), n=bloky().length;
  const rows=nakupItems(sel).filter(r=>r.ck&&!r.doma&&r.kupene>0);
  const low=(S.spajza||[]).filter(x=>chybaDoMinima(x)>0&&S.nakupCheck[nakupCheckKey("low|"+x.id)]);
  const pred={spajza:JSON.parse(JSON.stringify(S.spajza)),check:JSON.parse(JSON.stringify(S.nakupCheck)),spSid:S.spSid};
  let pocet=0;
  low.forEach(x=>{ const ch=chybaDoMinima(x);       // expirovaná zásoba je odpad — kúpené ju nahradí
    if(zasobaPlatna(x)) x.mnozstvo=Math.round((x.mnozstvo+ch)*100)/100; else { x.mnozstvo=ch; x.expiry=navrhExpiry(x.nazov,x.miesto); }
    delete S.nakupCheck[nakupCheckKey("low|"+x.id)]; pocet++; });
  rows.forEach(r=>{ const q=kupeneDoZasoby(r); if(!q) return;
    pridajDoSpajze(r.nazov,r.p,q.mn,q.jed); pocet++;
    const k=nakupCheckKey(r.key), v=sel?bezVarok(S.nakupCheck[k],sel,n):null; if(v) S.nakupCheck[k]=v; else delete S.nakupCheck[k]; });
  if(!pocet){ toast("Nič odškrtnuté na presun — najprv odškrtni, čo máš v košíku."); return; }
  save(); renderNakup(); renderSpajza();
  toast("📥 Do špajze: "+sklon(pocet,"položka","položky","položiek")+".",{text:"↩ Späť",fn:()=>{
    S.spajza=pred.spajza; S.nakupCheck=pred.check; S.spSid=pred.spSid; save(); renderNakup(); renderSpajza(); }}); }
function zdielajNakup(){
  const riadky=nakupText();
  if(!riadky.length){ toast("Zoznam je prázdny."); return; }
  const txt="🛒 Nákupný zoznam:\n"+riadky.join("\n");
  if(navigator.share){ navigator.share({title:"Nákupný zoznam",text:txt}).catch(()=>{}); }
  else kopirujListonic();
}
function promptFallback(txt){ window.prompt("Skopíruj (Ctrl+C):",txt); }

// Pozdrav bez mena. Predvolené meno prvého stravníka je „Ja", takže appka vítala slovami
// „Dobré ráno, Ja". Meno tu aj tak nič nerieši — domácnosť pozná samu seba.
// Rovnako ráta hláška po zostavení týždňa (prvé jedlo slotu, bez opakovaní) — do 8. 10. Domov hlásil
// 42 „jedál v pláne" (obsadené sloty) a hláška 12 jedál za ten istý týždeň.
function roznychJedal(){ const s=new Set(); for(let di=0;di<7;di++) slotyDna(di).forEach(sl=>{ const id=slotIds(di,sl)[0]; if(id)s.add(id); }); return s.size; }
function pozdravText(){ const h=new Date().getHours(); return h<10?"Dobré ráno":(h<18?"Dobrý deň":"Dobrý večer"); }
function renderDash(){
  // Domov hovorí vždy o REÁLNOM tomto týždni — aj keď si v Pláne listuješ dopredu. Prepneme na tento týždeň,
  // vykreslíme všetko (vrátane renderDnesPlan) a na konci S.viewOd vrátime.
  const povodnyViewOd=S.viewOd; S.viewOd=pondelokPre(dnesISO());
  const plan=planItems();
  const pz=document.getElementById("pozdrav"); if(pz)pz.textContent=pozdravText();
  let totB=0; const dniSet={};
  // bielkoviny = na osobu (voči osobnému cieľu)
  plan.forEach(p=>{ const v=vyzivaReceptu(p.r); totB+=v.b*p.f; dniSet[p.di]=1; });
  const nd=Object.keys(dniSet).length||1;
  { const dt=document.getElementById("dash-tiles"); if(dt) dt.style.display=plan.length?"":"none"; } // kolo 10: nuly nič nehovoria
  document.getElementById("dash-tiles").innerHTML=`
    <div class="tile" title="Koľko rôznych jedál navaríš — v bloku sa jedno jedlo je 2–3 dni"><div class="lbl">Rôznych jedál</div><div class="val">${roznychJedal()}</div></div>
    <div class="tile" title="Koľko dní týždňa má naplánované aspoň jedno jedlo"><div class="lbl">Dní naplánovaných</div><div class="val">${Object.keys(dniSet).length}<small> / 7</small></div></div>
    <div class="tile"><div class="lbl">Priemer bielkovín/deň</div><div class="val">${plan.length?fmtG(totB/nd)+"<small> g</small>":"–"}</div></div>`;
  renderDashTyzden();
  renderDashStravnici();
  renderDnesPlan();
  vyberDnes();
  const favVid=RECEPTY.filter(r=>S.fav[r.id] && prejdeProfil(r)); // vypnutý zdroj / skrytý recept sa nerátá ani neukazuje
  const fav=favVid.slice().sort((a,b)=>favStupen(b.id)-favStupen(a.id)).slice(0,4); // celé ★ pred polovičnými
  document.getElementById("dash-fav").innerHTML = fav.length? fav.map(r=>'<div class="card">'+kartaHTML(r)+'</div>').join("") : '<p class="info">Zatiaľ žiadne obľúbené — klikni na ★ pri recepte.</p>';
  // mini-štatistika + naposledy varené ako karty
  const favN=favVid.length;
  const poc={}; S.uvarene.forEach(u=>poc[u.id]=(poc[u.id]||0)+1);
  let najId=null,najN=0; for(const id in poc){ if(poc[id]>najN){najN=poc[id];najId=id;} }
  const najR=najId?receptById(najId):null;
  const statLine=`<div class="hist-stats">❤️ <b>${favN}</b> obľúbených${najR&&najN>1?` · 👨‍🍳 najčastejšie varíš <b>${escHtml(najR.nazov)}</b> (${najN}×)`:""}</div>`;
  const hist=S.uvarene.slice(0,6).map(u=>{const r=receptById(u.id);return r?`<span class="hist-item">${ikony[r.kategoria]||"🍴"} ${escHtml(r.nazov)} <span class="hist-date">${escHtml(u.datum)}</span></span>`:null;}).filter(Boolean);
  document.getElementById("dash-hist").innerHTML = statLine + (hist.length? '<div class="hist-wrap">'+hist.join("")+'</div>' : '<p class="info">Nič zatiaľ. Po dokončení režimu varenia sa recept zapíše sem.</p>');
  renderDashSpajza(); renderOkno(); renderBarDom();
  S.viewOd=povodnyViewOd; // vráť späť — Plán nech ostane na týždni, ktorý si si zvolil
}
// B5: stravníci s RÔZNYMI kalóriami sú to, čo táto appka vie a konkurencia nie — a boli schovaní
// v Nastaveniach pod ⚙️. Na Domove je z nich jeden riadok a editor na jedno ťuknutie.
function renderDashStravnici(){ const el=document.getElementById("dash-stravnici"); if(!el)return;
  normStravnici(); const l=stravniciList();
  const zoz=l.map(p=>'<span class="strav-chip"><b>'+escHtml(p.nazov||"—")+'</b> '+(p.kcal||S.profil.kcal||0)+' kcal'+(p.veg?' 🌱':"")+(jeDieta(p)?' · '+TYP_STRAV[p.typ].toLowerCase():p.typ==="senior"?' · senior':p.typ==="tehotna"?' · tehotná':"")+'</span>').join("");
  const rozne=l.length>1 && l.some(p=>(p.kcal||0)!==(l[0].kcal||0));
  el.innerHTML='<div class="strav-riadok">'+zoz+'<button class="btn" onclick="otvorStravnici()">✎ Upraviť</button></div>'
    +'<p class="info" style="margin:7px 0 0">'+(l.length===1
      ? 'Varíš pre seba. Ak varíš pre viacerých, pridaj ich sem — appka rozdelí jednu várku podľa kalórií každého.'
      : (rozne? 'Každý má vlastný kalorický cieľ — porcie z jednej várky sa podľa toho rozdelia.'
              : 'Všetci majú rovnaký cieľ. Ak má niekto iný, prepíš mu kcal a porcie sa prerozdelia.'))+'</p>';
  zpristupniKliky(el); }
function stravniciRiadkyHTML(callback){ normStravnici(); const l=stravniciList(); const IST="padding:9px;border:1px solid var(--okraj);border-radius:10px";
  // Každá zmena prekreslí riadky — drzFokus + data-fokus vráti fokus na ten istý prvok (a11y 2.4.3:
  // šípka v selecte typu hneď uložila a fokus spadol na BODY, ďalšia voľba sa nedala vybrať).
  const zm=(i,k,v)=>'var v='+v+';drzFokus(function(){zmenStravnika('+i+',\''+k+'\',v);'+callback+'})';
  return l.map((p,i)=>{ const meno=escHtml(p.nazov||("stravník "+(i+1)));
    return '<div class="strav-row"><input data-fokus="st-n'+i+'" value="'+escHtml(p.nazov||"")+'" onchange="'+zm(i,"nazov","this.value")+'" placeholder="meno" aria-label="Meno — '+(i+1)+'. stravník" style="flex:1 1 110px;min-width:0;'+IST+'">'
    +'<input data-fokus="st-k'+i+'" type="number" inputmode="numeric" value="'+(+p.kcal||"")+'" onchange="'+zm(i,"kcal","this.value")+'" aria-label="kcal za deň — '+meno+'" style="flex:0 0 92px;width:92px;'+IST+'"><span class="info" aria-hidden="true">kcal/deň</span>'
    +(l.length>1?'<button class="lnk strav-x" data-fokus="st-x'+i+'" onclick="drzFokus(function(){zmazStravnika('+i+');'+callback+'})" title="odobrať stravníka" aria-label="Odobrať stravníka '+meno+'">✕</button>':"")
    // typ a 🌱 na druhom riadku — na 393 px sa k menu a kcal nevojdú
    +'<div class="strav-row2"><select class="f" data-fokus="st-t'+i+'" aria-label="Typ — '+meno+'" onchange="'+zm(i,"typ","this.value")+'">'
      +Object.keys(TYP_STRAV).map(k=>'<option value="'+k+'"'+((p.typ||"")===k?" selected":"")+'>'+TYP_STRAV[k]+'</option>').join("")+'</select>'
    +'<label class="switch"><input type="checkbox" data-fokus="st-v'+i+'" aria-label="'+meno+' je vegetarián"'+(p.veg?" checked":"")+' onchange="'+zm(i,"veg","this.checked")+'"> 🌱 vegetarián</label></div>'
    +'</div>'; }).join("")
    +(domacnostCitliva()?'<p class="info" role="note">👶 Pre dieťa a tehotnú appka do plánu nedá jedlá s alkoholom, surovým mäsom či rybou, pečeňou, plesňovými syrmi ani kávou.</p>':"")
    +(vegPodiel()>0?'<p class="info" role="note">🌱 Varí sa jedno jedlo pre všetkých. Generátor uprednostní bezmäsité; pri mäsitom dostane vegetarián tofu namiesto mäsa a nákup sa podľa toho prepočíta.</p>':"")
    // Poistka nízkeho cieľa (audit 8. 10.): 800 kcal sa prijalo bez slova a pri 1200 kcal mala
    // vlákninu ≥ 25 g len tretina dní.
    +(l.some(p=>!jeDieta(p) && (parseInt(p.kcal)||0)>0 && parseInt(p.kcal)<1200)?'<p class="info" role="note" style="color:var(--warn)">⚠ Pod 1200 kcal na deň sa ťažko pokryje vláknina, vitamíny a minerály. Dlhodobo takto jedz len po dohode s lekárom.</p>':""); }
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
    h+=`<div class="d${di===dnes?" je-dnes":""}" title="${escHtml(popis)}"><span class="dn">${DNI[di].slice(0,2)}${S.blokMode?" "+pism:""}</span>`
      +`<span class="kc">${kc?Math.round(kc):"–"}</span>`
      // D: farbu bloku dostane len deň, v ktorom NIEČO je. Prázdny týždeň mal sedem plne
      // vyfarbených prúžkov nad siedmimi pomlčkami — farba tvrdila „tu je blok", obsah „nič".
      +`<span class="pr ${S.blokMode&&kc?blokTrieda(bi):""}"></span></div>`; }
  el.innerHTML=h;
}
const MESIACE_G=["januára","februára","marca","apríla","mája","júna","júla","augusta","septembra","októbra","novembra","decembra"];
function renderDnesPlan(){
  const el=document.getElementById("dnes-plan"); if(!el)return;
  { const ds=document.getElementById("datum-sub"), d=new Date(), dd=(d.getDay()+6)%7, bi=S.blokMode?bloky().findIndex(b=>b.includes(dd)):-1;
    if(ds) ds.textContent=DNI[dd]+" "+d.getDate()+". "+MESIACE_G[d.getMonth()]+(bi>=0&&slotyDna(dd).length&&!planPrazdnyTyzden()?" · dnes ješ blok "+blokPismeno(bi):""); }
  // S.viewOd je tu už prepnutý na reálny týždeň (rieši renderDash, jediný volajúci).
  // Kliky sa však vykonajú NESKÔR, preto si so sebou nesú vlastné prepnutie.
  const naTentoTyzden="S.viewOd=pondelokPre(dnesISO());";
  const di=(new Date().getDay()+6)%7;
  // kolo 7: pri prázdnom TOMTO týždni nesie primárnu akciu hlavné tlačidlo Domova — karty budúceho týždňa sú tiché
  let hVar="", prazdnyBuduci=false; const tentoPrazdny=planPrazdnyTyzden();
  { const hb=document.querySelector("#v-domov .akcie > .btn"); if(hb) hb.classList.toggle("primary",tentoPrazdny); }
  // Kolo 4 (rodič, dizajn): karta varného dňa a „zajtra varíš" pre blok, ktorý ZAČÍNA o 1–2 dni — aj keď začína
  // až v pondelok (nedeľa = varenie bloku A BUDÚCEHO týždňa; dovtedy appka ponúkala minulotýždňový blok A).
  // varenieBloku číta plán cez S.viewOd, preto sa týždeň na chvíľu prepne a hneď vráti.
  if(S.blokMode){ const od0=S.viewOd, nm=pridajDni(od0,7), kand=[];
    try{ [od0,nm].forEach(tyz=>{ S.viewOd=tyz; bloky().forEach((bk,idx)=>{ const doStartu=(tyz===od0?0:7)+bk[0]-di;
      if(doStartu===1||doStartu===2) kand.push({bk,idx,doStartu,tyz,vb:varenieBloku(bk).map(x=>Object.assign(x,{plus:!!x.k._priloha||slotIds(x.d0,x.sl0).indexOf(x.cid)>0}))}); }); }); } finally { S.viewOd=od0; }
    kand.sort((a,b)=>a.doStartu-b.doStartu).forEach(({bk,idx,doStartu,tyz,vb})=>{ const P=blokPismeno(idx), prep="S.viewOd='"+tyz+"';";
      const dop0=vb.filter(x=>!jeVyrobok(x.k)&&skladovanie(x.k)==="dopredu"), hlDen=new Set(vb.filter(x=>!x.plus&&!dop0.includes(x)).map(x=>x.d0+"|"+x.sl0));
      const dop=dop0.filter(x=>!(x.plus&&hlDen.has(x.d0+"|"+x.sl0))), ine=vb.filter(x=>!dop.includes(x));
      if(!vb.length){ if(doStartu===1||!hVar){ const bud=tyz===nm; if(bud) prazdnyBuduci=true;
        const prazdnyTyz=![0,1,2,3,4,5,6].some(i=>{ const p=S.plan[pridajDni(tyz,i)]; return p&&Object.keys(p).length; });
        const akc=prazdnyTyz?(bud?`<button class="btn${tentoPrazdny?"":" primary"}" onclick="${prep}prepni('planovac');generujTlacidlo()">✨ Naplánovať budúci týždeň</button>`:"")
          :`<button class="btn primary" onclick="${prep}prepni('planovac');regenerujBlokTlacidlo(${idx})">✨ Zostaviť blok ${P}</button>`;
        hVar+=`<div class="dnes-varenie-hero dnes-zajtra ${blokTrieda(idx)}"><b>${prazdnyTyz&&!bud?"🗓️ Tento týždeň ešte nemáš naplánovaný.":znakBloku(idx)+" Blok "+P+(bud?" budúceho týždňa":"")+" ("+rozsahKratko(bk)+") ešte nemáš naplánovaný."}</b>${akc?'<div class="btn-row">'+akc+'</div>':""}</div>`; } return; }
      if(doStartu===1){
        hVar+=`<div class="dnes-varenie-hero ${blokTrieda(idx)}"><b>${znakBloku(idx)} 👨‍🍳 Dnes večer treba navariť — Blok ${P} (na ${sklon(dniDoma(bk).length||bk.length,"deň","dni","dní")})</b>`;
        // príloha a druhé jedlo slotu = „+ názov" pod hlavným, nie druhý riadok „Obed" (kolo 4, dizajn/vizuál)
        dop.forEach(x=>{ const plus=x.plus;
          hVar+=`<div class="dnes-row${plus?" dnes-plus":""}"><span class="dnes-slot">${plus?"":(ikony[x.sl0]||"")+" "+escHtml(x.sloty.join(" + "))}</span><span>${pripravaVopred(x.k)?"⏰ ":""}${plus?"+ ":""}${escHtml(x.k.nazov)} <small>(${sklon(Math.max(1,Math.round(x.por)),"porcia","porcie","porcií")})</small></span></div>`; });
        // kolo 7: čo sa pripraví v deň jedenia (sendvič, fish & chips) nie je „kúpiť" — rovnako ako v pláne varenia
        const vDen=ine.filter(x=>!jeVyrobok(x.k)&&x.k.id!=="prf:pecivo"), kup=ine.filter(x=>jeVyrobok(x.k)||x.k.id==="prf:pecivo");
        if(vDen.length) hVar+=`<div class="dnes-row"><span class="dnes-slot">🥪 V deň jedenia</span><span class="info">${escHtml(vDen.map(x=>x.k.nazov).join(", "))}</span></div>`;
        if(kup.length) hVar+=`<div class="dnes-row"><span class="dnes-slot">🛒 Len kúpiť</span><span class="info">${escHtml(kup.map(x=>x.k.nazov).join(", "))}</span></div>`;
        hVar+=`<div class="btn-row">${dop.length?`<button class="btn primary" onclick="${prep}spustiCookBlok(${prvyDenDoma(bk)})">👨‍🍳 Variť blok ${P}</button>`:""}<button class="btn" onclick="${prep}planVarenia(${bk[0]})">Plán varenia</button></div></div>`;
      } else if(!hVar && dop.length){ // deň PRED varným dňom: marináda a namáčanie sa robia už dnes, nákup tiež
        const vop=dop.filter(x=>pripravaVopred(x.k));
        hVar+=`<div class="dnes-varenie-hero dnes-zajtra ${blokTrieda(idx)}"><b>${znakBloku(idx)} 📅 Zajtra večer varíš blok ${P}</b><p class="info" style="margin:4px 0 0">${escHtml(dop.filter(x=>!x.plus).map(x=>x.k.nazov).join(" · "))}</p>`
          +(vop.length?`<p class="info" style="margin:4px 0 0">⏰ Už dnes: <b>${escHtml(vop.map(x=>x.k.nazov).join(", "))}</b> — marináda, namáčanie alebo kysnutie cez noc.</p>`:"")
          +`<div class="btn-row"><button class="btn primary" onclick="${prep}S.nakupVarky={od:S.viewOd,bl:[${idx}]};save();prepni('nakup')">🛒 Nákup na blok ${P}</button><button class="btn" onclick="${prep}planVarenia(${bk[0]})">Plán varenia</button></div></div>`; } }); }
  // Kolo 4 (ovládanie): od piatku, keď budúci týždeň ešte nie je naplánovaný, je to na jeden ťuk.
  if(di>=4 && !prazdnyBuduci && !tentoPrazdny){ const nm=pridajDni(pondelokPre(dnesISO()),7);
    if(![0,1,2,3,4,5,6].some(i=>{ const p=S.plan[pridajDni(nm,i)]; return p&&Object.keys(p).length; }))
      hVar+=`<div class="dnes-varenie-hero dnes-zajtra"><b>🗓️ Budúci týždeň (${fmtD(nm)}–${fmtD(pridajDni(nm,6))}) ešte nemáš naplánovaný.</b><div class="btn-row"><button class="btn${hVar?"":" primary"}" onclick="S.viewOd='${nm}';prepni('planovac');generujTlacidlo()">✨ Naplánovať budúci týždeň</button></div></div>`; }
  let h="",kc=0,b=0,t=0,sx=0,any=false;
  slotyDna(di).forEach(sl=>{ const ids=slotIds(di,sl); const f=pf(di,sl);
    if(!ids.length){ h+=`<div class="dnes-row"><span class="dnes-slot">${ikony[sl]||""} ${sl}</span><span class="info">—</span></div>`; return; }
    any=true;
    const casti=ids.map(cid=>{const k=komponent(cid); if(!k)return null; kc+=kcalPorcia(k)*f; const v=vyzivaReceptu(k); b+=v.b*f;t+=v.t*f;sx+=v.s*f;
      // odkaz na jedlo mal 18 px (pod hranicou 24 px z CLAUDE.md) a ako <span onclick> nebol
      // dosiahnuteľný klávesnicou — <button class="lnk"> rieši oboje, výška je v CSS
      return k._priloha?{pr:true,h:"+ "+escHtml(k.nazov)}
        :{pr:false,h:`<button type="button" class="lnk sur-klik" onclick="${naTentoTyzden}otvor('${cid}',{di:${di},slot:'${sl}'})">${escHtml(k.nazov)}</button>`};}).filter(Boolean);
    // F: doplnok („+ Kuracie prsia") sa pripája medzerou, nie čiarkou. Pri zalomení riadku
    // na telefóne inak riadok začínal interpunkciou: „, + Kuracie prsia (doplnok)".
    const mena=casti.map((x,ix)=>'<span class="dnes-jedlo'+(x.pr?' pril':'')+'">'+(ix&&!x.pr?"+ ":"")+x.h+'</span>').join("");
    const k0=komponent(ids[0]), mini=k0&&!k0._priloha?`<span class="${thumbTrieda(k0)} th-mini" aria-hidden="true">${thumbHTML(k0,true)}</span>`:"";
    h+=`<div class="dnes-row${mini?" s-fotkou":""}">${mini}<span class="dnes-slot">${S.blokMode?znakBloku(blokIndex(di)):""} ${ikony[sl]||""} ${sl}</span><span class="dnes-jedla">${mena}</span></div>`;
  });
  const cot=document.getElementById("cotvarit-panel");
  const panel=document.getElementById("dnes-plan-panel");
  // E: keď na dnes nič nie je, panel „Dnešný plán" sa celý skryje. Jeho jediným obsahom
  // bola veta „nič naplánované" a tlačil primárnu akciu o ~140 px nižšie; to isté povie
  // panel „Čo variť dnes?" aj tlačidlo „✨ Zostaviť jedálniček", ktoré tým vyjdú vyššie.
  if(!any && !hVar){ el.innerHTML=""; if(panel)panel.style.display="none"; if(cot)cot.style.display=""; return; }
  if(panel)panel.style.display="";
  if(cot)cot.style.display="none";
  let out=hVar;
  if(any){ const ciel=cielDna(di);
    out+=(hVar?'<h3 class="sekcia" style="margin-top:0">Čo dnes ješ</h3>':'')+h+`<div class="dnes-makra"><b>${Math.round(kc)}${ciel?" / "+ciel:""}</b> kcal · bielkoviny ${fmtG(b)} g · tuky ${fmtG(t)} g · sacharidy ${fmtG(sx)} g</div>`;
  }
  el.innerHTML=out;
  // kolo 9 (rodič): keď karta na Domove už nesie primárnu akciu (Variť, Nákup na blok), hlavné „Zostaviť" je obrysové
  { const hb=document.querySelector("#v-domov .akcie > .btn"); if(hb&&/btn primary/.test(hVar)) hb.classList.remove("primary"); }
}
let _dnesId=null; // naposledy ukázaný návrh — „Iný návrh" ho nesmie vrátiť hneď späť
function vyberDnes(){
  const nedavne=new Set(S.uvarene.slice(0,5).map(u=>u.id));
  const el=document.getElementById("dnes");
  let kand=RECEPTY.filter(r=>prejdeProfil(r) && isMain(r) && !nedavne.has(r.id) && r.id!==_dnesId);
  if(!kand.length)kand=RECEPTY.filter(r=>prejdeProfil(r));
  // D10: komparátor s Math.random() nie je konzistentný — preto najprv ZAMIEŠAŤ (Fisher–Yates)
  // a až potom stabilne zoradiť podľa hodnotenia. v31: bez zamiešania mala väčšina receptov
  // rovnakú váhu, takže „Iný návrh" točil stále abecednú osmičku (Adana kebab, Adzuki…).
  for(let i=kand.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [kand[i],kand[j]]=[kand[j],kand[i]]; }
  kand.sort((a,b)=>oblubenostVaha(b.id)-oblubenostVaha(a.id)); // nehodnotené = 3★, 1★ ide dole, obľúbené hore
  // z vrchných 20 vážene: 5★ má 9× vyššiu šancu než nehodnotené, ale nie istotu („viac, nie stále")
  const top=kand.slice(0,20); let los=top.reduce((a,x)=>a+oblubenostVaha(x.id),0)*Math.random();
  const r=top.find(x=>(los-=oblubenostVaha(x.id))<0)||top[0]||RECEPTY[0];
  if(!r){el.innerHTML="Žiadny recept.";return;}
  _dnesId=r.id;
  const thumb=thumbHTML(r,false);
  el.innerHTML=`<div class="${thumbTrieda(r)}">${thumb}</div><div style="flex:1"><div class="nm">${escHtml(r.nazov)}</div><div class="mt">${escHtml([r.kategoria,casText(r.cas),kcalPorcia(r)+" kcal"].filter(Boolean).join(" · "))}</div></div>
    <div style="display:flex;gap:8px"><button class="btn primary" onclick="otvor('${r.id}')">Zobraziť</button><button class="btn" onclick="vyberDnes()">Iný návrh</button></div>`;
}
function dojedzZvysky(){
  const plan=planovaneRecepty(); const out=document.getElementById("zvysky-out");
  if(!plan.length){ out.innerHTML='<p class="info">Najprv si naplánuj týždeň — potom nájdem recepty, čo dojedia zvyšné suroviny.</p>'; return; }
  const planId=new Set(plan.map(r=>r.id));
  const suroviny=new Set(); plan.forEach(r=>(r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov); if(p && ["Zelenina a ovocie","Mliečne a vajcia","Mäso a ryby"].includes(p.oddelenie)) suroviny.add(p.kluc); }));
  const navrhy=RECEPTY.filter(r=>!planId.has(r.id) && !jeVyrobok(r) && prejdeProfil(r)).map(r=>{ // kúpený výrobok nie je „uvar zo zvyškov"
    let zhoda=[]; (r.ingrediencie||[]).forEach(i=>{const p=najdiPotravinu(i.nazov); if(p&&suroviny.has(p.kluc))zhoda.push(i.nazov);});
    return {r,zhoda};
  }).filter(x=>x.zhoda.length>=2).sort((a,b)=>b.zhoda.length-a.zhoda.length).slice(0,4);
  out.innerHTML = navrhy.length ? navrhy.map(x=>`<div class="match"><button type="button" class="cu-nazov" onclick="otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${escHtml(x.r.nazov)}</button><div class="info" style="margin-top:4px">využije: ${escHtml(x.zhoda.slice(0,5).join(", "))}</div></div>`).join("") : '<p class="info">Nenašiel som recept, čo by využil rovnaké suroviny.</p>';
}

// Predvolený cieľ bielkovín 20 % energie (EFSA: 10–35 %, ~0,83 g/kg je referencia; 20 % pri 2000 kcal
// = 100 g ≈ 1,4 g/kg). Do 8. 10. 30 % — ~2,4 g/kg, 3× referencia. Kto chce viac, nastaví „Min. bielkovín".
const B_PODIEL_DEF=0.20;
function cieloveMakra(kcal,p){ if(!kcal)return null;
  if(S.profil.diabetes&&!(p&&jeDieta(p))){ const b=(p&&TYP_BIEL[p.typ])||((!p||p===stravniciList()[0])&&S.profil.biel)||Math.round(kcal*B_PODIEL_DEF/4);
    const s=Math.round(kcal*0.40/4), t=Math.max(0,Math.min(Math.round(kcal*0.35/9),Math.round((kcal-b*4-s*4)/9))); return {b,t,s}; } // 🩺 sacharidy ~40 % E, tuk ≤ 35 % E
  const b=(p&&TYP_BIEL[p.typ])||((!p||p===stravniciList()[0])&&S.profil.biel)||Math.round(kcal*B_PODIEL_DEF/4); const t=Math.round(kcal*0.30/9); const s=Math.max(0,Math.round((kcal-b*4-t*9)/4)); return {b,t,s}; }
// V1/V2: farba voči cieľu (±10 % tolerancia). floor=true → pod cieľ je zle (bielkoviny)
function stavCiel(act,tgt,floor){ if(!tgt||!act)return {c:"",d:""}; const r=act/tgt;
  const c = floor ? (r<0.9?"var(--warn)":"var(--accent)") : (r>1.1?"var(--warn)":(r<0.9?"var(--muted)":"var(--accent)"));
  const diff=Math.round(act-tgt); return {c, d:(diff>0?"+":"")+diff}; }
// Makro má na celej Výžive JEDNU farbu — tú istú ako jeho diel v stĺpcovom grafe (.segB/.segT/.segS),
// a štvorček pred menom je legenda. Farby blokov sú identita blokov, nie makier (boli tu B/C/A
// a k nim zelený/žltý/hnedý emoji). --warn len pri prekročení STROPU — bielkoviny strop nemajú.
function makroBar(seg,label,act,tgt,strop){ const pct=tgt?Math.min(100,Math.round(act/tgt*100)):0; const over=strop&&tgt&&act>tgt*1.1;
  return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span><span class="lg ${seg}"></span>${label}</span><span style="${over?'color:var(--warn)':''}">${fmtG(act)}${tgt?" / "+fmtG(tgt):""} g</span></div><div style="height:10px;background:var(--doska);border:1px solid var(--okraj);border-radius:6px;overflow:hidden"><div class="${seg}" style="width:${pct}%;height:100%"></div></div></div>`; }
let vyzivaMode="tyzden", vyzivaDi=null;
function vyzivaZobraz(m){ vyzivaMode=m; if(m==="den"&&vyzivaDi==null) vyzivaDi=(new Date().getDay()+6)%7;
  const tt=document.getElementById("vt-tyzden"), td=document.getElementById("vt-den");
  if(tt)tt.classList.toggle("active",m==="tyzden"); if(td)td.classList.toggle("active",m==="den");
  if(tt)tt.setAttribute("aria-pressed",m==="tyzden"); if(td)td.setAttribute("aria-pressed",m==="den"); renderVyziva(); }
function vyzivaDenPosun(delta){ vyzivaDi=((vyzivaDi==null?0:vyzivaDi)+delta+7)%7; renderVyziva(); }
function vyzivaBar(i){ vyzivaDi=i; if(vyzivaMode==="den") renderVyziva(); else { ukazDenVyzivu(i); document.querySelectorAll("#v-vyziva .chart .col").forEach((c,ix)=>c.setAttribute("aria-pressed",String(ix===i))); } }
// kruhový ukazovateľ (donut) — act/tgt s farbou stavu
function ring(act,tgt,col,label){ const R=26,C=2*Math.PI*R,pct=tgt?Math.min(1,act/tgt):0,off=C*(1-pct),c=col||"var(--accent)";
  return `<div style="text-align:center;flex:1;min-width:68px"><svg viewBox="0 0 64 64" style="width:60px;height:60px"><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--line)" stroke-width="7"></circle><circle cx="32" cy="32" r="${R}" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 32 32)"></circle><text x="32" y="31" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${Math.round(act)}</text><text x="32" y="44" text-anchor="middle" font-size="8" fill="var(--muted)">${tgt?"/"+Math.round(tgt):""}</text></svg><div style="font-size:12px;color:var(--muted)">${label}</div></div>`; }
let _vyzPomer=1, _vyzMeno=""; // rozpad dňa v porciách osoby vybranej v „Pre koho"
function ukazDenVyzivu(di){ const el=document.getElementById("vyziva-den"); if(!el)return; let h=`<h3 class="sekcia">${DNI[di]} — rozpad jedál${_vyzMeno?" · "+escHtml(_vyzMeno):""}</h3>`; let any=false,dk=0;
  const os=stravniciList()[vyzivaOsoba];
  slotyDna(di).forEach(sl=>{ if(di<5&&os&&mimoOsoby(os).has(sl)) return; const f=pf(di,sl)*_vyzPomer; slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(!r)return; any=true; const v=vyzivaReceptu(r); dk+=v.kcal*f;
    h+=`<div class="sp-row"><span>${r._priloha?"+ ":""}<b>${escHtml(r.nazov)}</b> <span class="meta2">${escHtml(sl)}</span></span><span class="meta2">${Math.round(v.kcal*f)}&nbsp;kcal · bielkoviny&nbsp;${fmtG(v.b*f)}&nbsp;g · tuky&nbsp;${fmtG(v.t*f)}&nbsp;g · sacharidy&nbsp;${fmtG(v.s*f)}&nbsp;g</span></div>`; }); });
  if(any)h+=`<div class="dnes-makra"><b>Spolu ${Math.round(dk)} kcal</b></div>`;
  el.innerHTML = any? h : `<p class="info">${DNI[di]}: nič naplánované.</p>`; }
let vyzivaOsoba=0; // index stravníka na obrazovke Výživa
function renderVyziva(){ const osMimo=(di,sl)=>di<5&&mimoOsoby(stravniciList()[vyzivaOsoba]).has(sl);
  const dni=[]; for(let di=0;di<7;di++){ let kc=0,b=0,t=0,sx=0,vl=0,na=0,hm=0,hmVl=0,hmNa=0; slotyDna(di).forEach(sl=>{ if(osMimo(di,sl)) return; const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r){const v=vyzivaReceptu(r); kc+=v.kcal*f;b+=v.b*f;t+=v.t*f;sx+=v.s*f;vl+=(v.vl||0)*f;na+=(v.na||0)*f;hm+=(v.hmota||0)*f;hmVl+=(v.hmotaVl||0)*f;hmNa+=(v.hmotaNa||0)*f;}}); }); dni.push({kc:Math.round(kc),b,t,s:sx,vl:vl,na:na,hm:hm,hmVl:hmVl,hmNa:hmNa}); }
  // v34 kolo 3: Výživa po stravníkoch. Porcie sa delia podľa kcal, takže príjem osoby = hlavný stravník × pomer.
  // Do v34 obrazovka ukazovala čísla prvého stravníka a nikde to nepovedala (dieťa „malo" 94 g bielkovín).
  const stl=stravniciList(), hlK=+(stl[0]&&stl[0].kcal)||S.profil.kcal||CIEL_DEF; if(vyzivaOsoba>=stl.length) vyzivaOsoba=0;
  const osoba=stl[vyzivaOsoba]||{}, pomer=(+osoba.kcal||hlK)/hlK, kcOs=+osoba.kcal||S.profil.kcal||0;
  _vyzPomer=pomer; _vyzMeno=stl.length>1?(osoba.nazov||""):"";
  if(pomer!==1) dni.forEach(d=>{ ["kc","b","t","s","vl","na"].forEach(k=>{ d[k]*=pomer; }); d.kc=Math.round(d.kc); });
  // Kolo 3: cieľ dňa bez jedál mimo domu (cielDna) — dovtedy menza hlásila „−539 kcal oproti cieľu" pri splnenom pláne.
  const cielD=i=>Math.round(kcOs*podielOsoby(osoba,i)), dniC=dni.map((d,i)=>i).filter(i=>dni[i].kc>0);
  const cielKc=(vyzivaMode==="den"&&vyzivaDi!=null)?cielD(vyzivaDi):Math.round((dniC.length?dniC:[0,1,2,3,4,5,6]).reduce((a,i)=>a+cielD(i),0)/((dniC.length||7)));
  const cmOs=cieloveMakra(cielKc,osoba), cielB=cmOs?cmOs.b:0, cielVl=TYP_VL[osoba.typ]||30, cielSol=TYP_SOL[osoba.typ]||5;
  { const os=document.getElementById("vyziva-osoba"); if(os) os.innerHTML=stl.length>1?'<label class="info">Pre koho: <select class="f" data-fokus="vyziva-osoba" onchange="vyzivaOsoba=+this.value;drzFokus(renderVyziva,this)">'+stl.map((p,i)=>'<option value="'+i+'"'+(i===vyzivaOsoba?" selected":"")+'>'+escHtml(p.nazov||("Stravník "+(i+1)))+' — '+(+p.kcal||hlK)+' kcal</option>').join("")+'</select></label>':""; }
  const maxKc=Math.max(cielKc||0,...dni.map(d=>d.kc),1);
  const akt=dni.filter(d=>d.kc>0);
  const priemKc=akt.length?Math.round(akt.reduce((a,d)=>a+d.kc,0)/akt.length):0;
  const priemB=akt.length?akt.reduce((a,d)=>a+d.b,0)/akt.length:0;
  const priemVl=akt.length?akt.reduce((a,d)=>a+d.vl,0)/akt.length:0;
  const priemNa=akt.length?akt.reduce((a,d)=>a+d.na,0)/akt.length:0;
  const priemT=akt.length?akt.reduce((a,d)=>a+d.t,0)/akt.length:0;
  const priemS=akt.length?akt.reduce((a,d)=>a+d.s,0)/akt.length:0;
  const vahaKg=S.vahy.length?S.vahy[S.vahy.length-1].kg:0;
  // deň vs týždeň: src = hodnoty pre zvolený deň alebo priemer týždňa
  const isDen = vyzivaMode==="den" && vyzivaDi!=null;
  const sum=f=>akt.reduce((a,d)=>a+f(d),0);
  const src = isDen ? dni[vyzivaDi] : {kc:priemKc,b:priemB,t:priemT,s:priemS,vl:priemVl,na:priemNa,
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
  const sK=stavCiel(src.kc,cielKc), sB=stavCiel(src.b,cielB,true); // V1/V2
  const lblK = isDen ? "kcal · "+DNI[vyzivaDi].slice(0,2) : "Priemer kcal/deň";
  const lblB = isDen ? "Bielkoviny · "+DNI[vyzivaDi].slice(0,2) : "Priemer bielkovín/deň";
  document.getElementById("vyziva-tiles").innerHTML=`
    <div class="tile"><div class="lbl">${lblK}</div><div class="val" style="color:${sK.c}">${maPlan?src.kc:"–"}<small> /${cielKc}</small></div>${(sK.d&&maPlan)?`<div class="lbl" style="color:${sK.c}">${sK.d} kcal oproti cieľu</div>`:""}</div>
    <div class="tile"><div class="lbl">${lblB}</div><div class="val" style="color:${cielB?sB.c:''}">${maPlan?fmtG(src.b)+" g":"–"}${cielB?'<small> /'+cielB+'</small>':''}</div>${(cielB&&sB.d&&maPlan)?(jeDieta(osoba)&&src.b>=cielB?(src.b>2*cielB?`<div class="lbl">viac než treba — daj menej mäsa, viac prílohy a zeleniny</div>`:`<div class="lbl">min. ${cielB} g ✓</div>`):`<div class="lbl" style="color:${sB.c}">${sB.d} g oproti cieľu</div>`):""}</div>
    <div class="tile"><div class="lbl">Naplánovaných dní</div><div class="val">${akt.length}/7</div></div>
    <div class="tile"><div class="lbl">Vláknina${isDen?" · "+DNI[vyzivaDi].slice(0,2):"/deň"}</div><div class="val">${maPlan?dlazdicaHodnota(fmtG(src.vl)+" g",pokrVl):"–"}<small> /${cielVl}</small></div></div>
    ${S.profil.diabetes?`<div class="tile" title="Pri diabete 2. typu sa odporúča sacharidy rozložiť rovnomerne do jedál a uprednostniť tie s vlákninou."><div class="lbl">Sacharidy${isDen?" · "+DNI[vyzivaDi].slice(0,2):"/deň"}</div><div class="val">${maPlan?fmtG(src.s)+" g":"–"}</div>${maPlan&&src.kc?`<div class="lbl">${Math.round(src.s*4/src.kc*100)} % energie</div>`:""}</div>`:""}
    <div class="tile" title="Soľ = sodík × 2,5. WHO: najviac 5 g denne, deti menej. Soľ „podľa chuti“ v receptoch sa nedá zrátať, skutočnosť je vyššia."><div class="lbl">Soľ${isDen?" · "+DNI[vyzivaDi].slice(0,2):"/deň"}</div><div class="val" style="${(src.na*2.5/1000>cielSol&&pokrNa>=PRAH_POKRYTIA)?'color:var(--warn)':''}">${maPlan?dlazdicaHodnota(fmt(Math.round(src.na*2.5/100)/10)+" g",pokrNa):"–"}<small> /${cielSol} g</small></div><div class="lbl">${pokrNa>=PRAH_POKRYTIA&&src.na*2.5/1000>cielSol?"nad limitom · ":pokrNa>=PRAH_POKRYTIA&&src.na*2.5/1000>cielSol*0.8?"blízko limitu · ":""}${jeDieta(osoba)?"dieťaťu nesoľ — osoľ až dospelým na tanieri":"+ soľ podľa chuti"}</div></div>
    ${vahaKg&&vyzivaOsoba===0?`<div class="tile"><div class="lbl">Bielkoviny na kg</div><div class="val">${maPlan?fmt(src.b/vahaKg)+"<small> g/kg</small>":"–"}</div></div>`:""}`;
  const ciel=cielKc;
  let ch = ciel?`<div class="cielline" style="bottom:${Math.min(100,ciel/maxKc*100)}%"><span>cieľ ${ciel}</span></div>`:"";
  dni.forEach((d,i)=>{ const hgt=Math.round(d.kc/maxKc*100); const over=ciel&&d.kc>ciel*1.1;
    const mc=d.b*4+d.t*9+d.s*4||1;
    const seg=d.kc>0?`<div class="seg segB" style="height:${d.b*4/mc*100}%"></div><div class="seg segT" style="height:${d.t*9/mc*100}%"></div><div class="seg segS" style="height:${d.s*4/mc*100}%"></div>`:"";
    const sel=isDen&&vyzivaDi===i?' style="cursor:pointer;font-weight:700;text-decoration:underline"':' style="cursor:pointer"';
    const bi=blokIndex(i);
    ch+=`<div class="col"${sel} title="${DNI[i]}: ${d.kc||0} kcal — zobraziť rozpad jedál${S.blokMode?" · blok "+blokPismeno(bi):""}" aria-pressed="${vyzivaDi===i}" onclick="vyzivaBar(${i})"><span class="v" style="${over?'color:var(--warn)':''}">${d.kc||""}</span><div class="bar2" style="height:${hgt}%">${seg}</div><span class="pruh-bloku ${S.blokMode?blokTrieda(bi):""}"></span><span class="d">${DNI[i].slice(0,2)}${S.blokMode?" "+blokPismeno(bi):""}</span></div>`; });
  document.getElementById("vyziva-chart").innerHTML=ch;
  zpristupniKliky(document.getElementById("vyziva-chart")); // stĺpce grafu = 7 dní klávesnicou
  const rozne=[0,1,2,3,4,5,6].some(i=>cielD(i)!==cielD(0));
  document.getElementById("vyziva-ciel").innerHTML = (ciel? `Prerušovaná čiara = ${rozne?"priemerný ":""}denný cieľ ${ciel} kcal${rozne?" (Po–Pi "+cielD(0)+", So–Ne "+cielD(6)+" — jedlo mimo domu sa nepočíta)":""}. Klikni na stĺpec pre rozpad jedál dňa.` : "Nastav si denný cieľ v Nastaveniach.") + ` <span class="chart-leg"><span><span class="lg segB"></span>bielkoviny</span><span><span class="lg segT"></span>tuky</span><span><span class="lg segS"></span>sacharidy</span></span>`;
  // makrá: rings (na prvý pohľad) + detailné pruhy pod nimi
  const cm=cmOs;
  const rB=stavCiel(src.b,cielB,true).c;
  document.getElementById("vyziva-makro").innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      ${ring(src.kc,ciel,sK.c,"kcal")}
      ${ring(src.b,cm?cm.b:0,rB,"Biel. g")}
      ${ring(src.t,cm?cm.t:0,"var(--accent)","Tuky g")}
      ${ring(src.s,cm?cm.s:0,"var(--accent)","Sach. g")}</div>
    ${makroBar("segB","Bielkoviny",src.b,cm?cm.b:0,false)}
    ${makroBar("segT","Tuky",src.t,cm?cm.t:0,true)}
    ${makroBar("segS","Sacharidy",src.s,cm?cm.s:0,true)}
    <p class="info" style="margin-top:6px">${isDen?DNI[vyzivaDi]:"Priemer na deň"}${cm?" oproti cieľu (z "+ciel+" kcal)":""}.</p>`;
  // ciele stravníkov
  const strav=stravniciList(); const sp=document.getElementById("vyziva-stravnici");
  if(sp) sp.innerHTML = strav.map(p=>{ const k=p.kcal||S.profil.kcal||0; const m=cieloveMakra(k,p); // dieťa: bielkoviny podľa veku, nie 20 % energie dospelého
    return `<div class="sp-row"><span><b>${escHtml(p.nazov||"Stravník")}</b></span><span class="meta2">${k}&nbsp;kcal · bielkoviny&nbsp;${m?m.b:"–"}&nbsp;g · tuky&nbsp;${m?m.t:"–"}&nbsp;g · sacharidy&nbsp;${m?m.s:"–"}&nbsp;g</span></div>`; }).join("");
  // rozpad jedál: v deň režime zvolený deň, inak prvý naplánovaný
  if(isDen){ ukazDenVyzivu(vyzivaDi); }
  else { const prvy=dni.findIndex(d=>d.kc>0); if(prvy>=0) ukazDenVyzivu(prvy); else { const dd=document.getElementById("vyziva-den"); if(dd)dd.innerHTML=""; } }
}

// Vstupy sa zovrú na rozumný rozsah a oprava sa POVIE (toast) aj ukáže v poli — vek −5, výška 0
// a váha 5000 kg dávali cieľ 79 240 kcal/deň a uložil sa potichu.
function vypocitajCiel(){ const poh=document.getElementById("t-poh").value; const opr=[];
  const cislo=(id,def,lo,hi,co)=>{ const el=document.getElementById(id), v=parseFloat(el.value), x=isFinite(v)?v:def, n=Math.min(hi,Math.max(lo,x));
    if(n!==x){ opr.push(co+" "+n); el.value=n; } return n; };
  const vek=cislo("t-vek",30,10,100,"vek"), vys=cislo("t-vyska",175,100,230,"výška (cm)"), vah=cislo("t-vaha",75,30,250,"váha (kg)"); const akt=parseFloat(document.getElementById("t-akt").value)||1.55;
  const bmr=10*vah+6.25*vys-5*vek+(poh==="m"?5:-161); let tdee=bmr*akt;
  const cielTyp=((document.getElementById("p-cieltyp")||{}).value)||"udrzanie";
  // ponytail: fixný deficit/surplus -15 %/+10 %; ak treba jemnejšie, sprav z toho pole
  if(cielTyp==="chudnutie")tdee*=0.85; else if(cielTyp==="priberanie")tdee*=1.10;
  tdee=Math.max(1000,Math.round(tdee/10)*10);
  if(tdee>KCAL_DEN_MAX){ opr.push("cieľ "+KCAL_DEN_MAX+" kcal"); tdee=KCAL_DEN_MAX; }
  if(opr.length) toast("Mimo rozumného rozsahu — upravil som: "+opr.join(", ")+".");
  normStravnici();
  const idx=Math.min(Math.max(0,parseInt((document.getElementById("t-koho")||{}).value)||0), S.profil.stravnici.length-1);
  if(S.profil.stravnici[idx])S.profil.stravnici[idx].kcal=tdee;
  syncHlavnyCiel(); // cieľ pre plánovanie sa dvíha len cez prvý riadok — TDEE ho nastaví, zrkadlo sa dotiahne
  S.profil.cielTyp=cielTyp; save(); renderStravnici(); renderHlavnyCielInfo();
  const meno=(S.profil.stravnici[idx]&&S.profil.stravnici[idx].nazov)||"stravník";
  const popis={chudnutie:"chudnutie −15 %",priberanie:"priberanie +10 %",udrzanie:"udržanie"}[cielTyp];
  document.getElementById("tdee-ok").textContent=meno+": "+tdee+" kcal/deň ("+popis+"). Uložené ✓"; }
function naplnKohoSelect(){ const s=document.getElementById("t-koho"); if(!s)return; const l=stravniciList(); const cur=parseInt(s.value); s.innerHTML=l.map((p,i)=>`<option value="${i}">${escHtml(p.nazov||("Osoba "+(i+1)))}</option>`).join(""); if(cur>=0&&cur<l.length)s.value=cur; }
function zalohuj(){ try{ const blob=new Blob([JSON.stringify(S)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="kucharka-zaloha.json"; document.body.appendChild(a); a.click(); a.remove(); try{ localStorage.setItem("kucharka_zaloha_t",String(Date.now())); }catch(e){} }catch(e){ toast("Zálohovanie zlyhalo."); } }
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
  S=normalizujStav(Object.assign(S,cisty)); _cudziStav=false; save();
  toast(zahodene>0 ? ("Obnovené, "+zahodene+" poškodených polí som preskočil. Stránka sa načíta znova.")
                   : "Obnovené. Stránka sa načíta znova.");
  location.reload(); }; rd.readAsText(file); }
async function resetApp(){ if(!await confirmModal("Naozaj vymazať VŠETKY dáta (obľúbené, plán, špajza, profil, história)? Táto akcia sa nedá vrátiť.","Vymazať všetko"))return;
  if(!await confirmModal("Posledné varovanie — appka sa vráti do úvodného stavu. Pokračovať?","Áno, vymazať"))return;
  try{ localStorage.removeItem(LS); }catch(e){} location.reload(); }
function normStravnici(){ if(!Array.isArray(S.profil.stravnici)||!S.profil.stravnici.length){ S.profil.stravnici=stravniciList(); } S.profil.osoby=S.profil.stravnici.length; syncHlavnyCiel(); }
function renderStravnici(){ const box=document.getElementById("stravnici-box"); if(!box)return; const l=stravniciList();
  box.innerHTML=stravniciRiadkyHTML("renderStravnici()"); naplnKohoSelect(); zpristupniFormulare(box); renderHlavnyCielInfo(); if(document.getElementById("stravnici-modal"))renderStravniciModal(); }
// Nastavenia už nemajú samostatné pole „Cieľ kalórií na deň" — bolo to druhé, tichšie miesto
// toho istého údaja. Namiesto vstupu je tu čítaný údaj, aby bolo vidieť, s čím generátor počíta.
function renderHlavnyCielInfo(){ const el=document.getElementById("p-kcal-info"); if(!el)return;
  normStravnici(); const l=stravniciList(); const hl=l[0]||{};
  const sucet=l.reduce((a,p)=>a+(parseInt(p.kcal)||0),0);
  el.innerHTML='Plánuje sa na <b>'+(parseInt(hl.kcal)||0)+' kcal/deň</b> ('+escHtml(hl.nazov||"hlavný stravník")+' — prvý riadok vyššie)'
    +(l.length>1?'. Spolu za domácnosť <b>'+sucet+' kcal/deň</b>, podľa toho sa delia porcie a počíta nákup.':'.'); } // D6: menovky aj pre dynamicky vykreslené polia
function pridajStravnika(){ const l=stravniciList().slice(); l.push({nazov:"Ďalší",kcal:CIEL_DEF,typ:"",veg:false}); S.profil.stravnici=l; S.profil.osoby=l.length; save(); renderStravnici();
  const k="st-n"+(l.length-1); setTimeout(()=>{ const e=[...document.querySelectorAll('[data-fokus="'+k+'"]')].find(x=>x.getClientRects().length); if(e){ e.focus(); e.select&&e.select(); } },0); }
// kcal stravníka sa zovrie na KCAL_DEN_MIN–MAX a povie sa to (do v32 prešlo −500 aj 99 999);
// prázdne/nečíselné pole vráti doterajší cieľ.
function _prepocitajPlan(){ if(!(S.genCfg&&S.genCfg.cielMode)) return; rescaleDen([0,1,2,3,4,5,6]); save(); renderPlan(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); }
function zmenStravnika(i,k,v){ const l=stravniciList().slice(); if(!l[i])return;
  if(k==="kcal"){ const x=parseInt(v), n=Math.min(KCAL_DEN_MAX,Math.max(KCAL_DEN_MIN,isFinite(x)?x:(l[i].kcal||CIEL_DEF)));
    l[i].kcal=n;
    if(n!==x){ if(isFinite(x)) toast("Denný cieľ musí byť "+KCAL_DEN_MIN+"–"+KCAL_DEN_MAX+" kcal — nastavil som "+n+"."); renderStravnici(); }
    else if(n<1200&&!jeDieta(l[i])) toast("⚠ Pod 1200 kcal na deň sa ťažko pokryje vláknina, vitamíny a minerály. Dlhodobo len po dohode s lekárom.");
    else setTimeout(()=>{ if(S.genCfg&&S.genCfg.cielMode) toast("Porcie som prepočítal ("+(l[i].nazov||"stravník")+": "+n+" kcal)."); },0);
    setTimeout(_prepocitajPlan,0); }
  else if(k==="typ"||k==="veg"){ if(k==="veg") l[i].veg=!!v;
    else { const pred=l[i].typ||"", kc=+l[i].kcal; l[i].typ=v;
      // Typ predvyplní kcal len vtedy, keď boli predvolené (CIEL_DEF alebo z predošlého typu) — ručne zadané 1700/2000 neprepíše.
      if(v==="tehotna") setTimeout(()=>toast("🤰 Tehotná / dojčiaca: appka vynechá surové mäso a ryby, plesňové syry, alkohol a kávu. Bryndzu a syry kupuj pasterizované, klíčky tepelne uprav. V 2. trimestri pridaj ~250 kcal, v 3. a pri dojčení ~500 kcal. Jód, kyselinu listovú a DHA appka nesleduje — tie rieš s lekárom.",null,12000),0);
      if(TYP_KCAL[v] && (!kc||kc===CIEL_DEF||kc===TYP_KCAL[pred])){ l[i].kcal=TYP_KCAL[v]; toast(TYP_STRAV[v]+": nastavil som "+TYP_KCAL[v]+" kcal na deň (odporúčanie EFSA pri bežnom pohybe). Upraviť ho môžeš."); setTimeout(()=>{ renderStravnici(); _prepocitajPlan(); },0); } }
    setTimeout(()=>opravPlanPoZmene("domácnosťou"),0); }
  else l[i][k]=v;
  S.profil.stravnici=l; S.profil.osoby=l.length; syncHlavnyCiel(); save(); }
function zmazStravnika(i){ let l=stravniciList().slice(); if(l.length<=1)return; const zal=l.slice(), prec=l[i]; l.splice(i,1);
  setTimeout(()=>toast("Odobratý stravník: "+(prec.nazov||"bez mena")+".",{text:"↩ Späť",fn:()=>{ S.profil.stravnici=zal; S.profil.osoby=zal.length; syncHlavnyCiel(); save(); renderStravnici(); renderDashStravnici(); }}),0); S.profil.stravnici=l; S.profil.osoby=l.length; syncHlavnyCiel(); save(); renderStravnici(); if(typeof naplnProfil==="function"&&document.getElementById("p-kcal-info"))renderHlavnyCielInfo(); }
function renderSlotyBox(){ const box=document.getElementById("sloty-box"); if(!box)return;
  const akt=(Array.isArray(S.profil.sloty)&&S.profil.sloty.length)?S.profil.sloty:DEFAULT_SLOTY;
  const m=mimoSloty();
  box.innerHTML=VSETKY_SLOTY.map(s=>`<label class="switch"><input type="checkbox" data-slot="${s}" ${akt.includes(s)?"checked":""}> ${ikony[s]||""} ${s}</label>`).join("")
    +'<p class="info" style="margin:10px 0 4px">🏢 Kto je v pracovné dni mimo domu (v práci, v škole, v menze)? To jedlo mu appka Po–Pi nepočíta — porcie, cieľ dňa aj nákup sa zmenšia. Kým je doma aspoň jeden, jedlo sa varí.</p>'
    +akt.filter(s=>VSETKY_SLOTY.includes(s)).map(s=>{ const l=stravniciList();
      return l.length<2?`<label class="switch"><input type="checkbox" data-mimo="${s}" data-os="0" data-fokus="mimo-${s}-0" ${mimoOsoby(l[0]).has(s)?"checked":""}> ${s} mimo domu</label>`
        :`<div class="mimo-riadok" role="group" aria-label="${s} mimo domu"><span class="info">${s}:</span> `+l.map((p,i)=>`<label class="switch"><input type="checkbox" data-mimo="${s}" data-os="${i}" data-fokus="mimo-${s}-${i}" ${mimoOsoby(p).has(s)?"checked":""}> ${escHtml(p.nazov||"Stravník "+(i+1))}</label>`).join("")+`</div>`; }).join(""); }
// Vzor je renderSlotyBox: zaškrtávacie políčka s data-atribútom, ktoré si ulozProfil prečíta späť.
// ZÁMERNE to nie sú chipy — v generátorovom okne znamená `.chip.active` u „Dni bez varenia"
// VYPNUTÝ deň, takže tá istá tmavá bublina by u zdrojov znamenala presný opak. Políčko so
// štítkom je jednoznačné: zaškrtnuté = generátor ten zdroj používa.
function renderZdrojeBox(){ const box=document.getElementById("zdroje-box"); if(!box)return;
  const off=zdrojeOff();
  box.innerHTML=zdrojeList().map(([z,n])=>`<label class="switch"><input type="checkbox" data-zdroj="${escHtml(z)}" ${off.has(z)?"":"checked"} onchange="ulozZdroje()"> ${escHtml(z)} <span class="info">${n} receptov</span></label>`).join("");
  zdrojeInfo(); }
function zdrojeInfo(){ const el=document.getElementById("zdroje-info"); if(el)el.textContent=zdrojeStav().replace(/^./,c=>c.toUpperCase())+"."; }
// Píše sa hneď pri kliknutí (nie až na „Uložiť nastavenia") — inak sa počet pod zoznamom
// nehne a používateľ nemá ako zistiť, či prepínač niečo urobil. Prekresľuje sa LEN veta,
// nie celý box, aby políčko pod prstom neprišlo o fokus.
function ulozZdroje(){ const box=document.getElementById("zdroje-box"); if(!box)return;
  S.profil.zdrojeOff=[...box.querySelectorAll("input[data-zdroj]")].filter(i=>!i.checked).map(i=>i.dataset.zdroj).join("|");
  save(); zdrojeInfo(); naplnKuchyne(); renderGrid(); }
function naplnProfil(){ renderStravnici(); renderSlotyBox(); renderZdrojeBox(); renderHlavnyCielInfo();
  { const d=document.getElementById("p-diabetes"); if(d) d.checked=!!S.profil.diabetes; }
  document.getElementById("p-biel").value=S.profil.biel||0; document.getElementById("p-ryby").checked=!!S.profil.ryby; { const a=document.getElementById("p-menejsoli"), b=document.getElementById("p-domaca"), c=document.getElementById("p-jedenhrniec"); if(a)a.checked=!!S.profil.menejSoli; if(b)b.checked=!!S.profil.domaca; if(c)c.checked=!!S.profil.jedenHrniec; } { const pv=document.getElementById("p-veg"); if(pv) pv.checked=jeBezMasa(); }
  document.getElementById("p-lepok").checked=!!S.profil.lepok; document.getElementById("p-mlieko").checked=!!S.profil.mlieko; renderPalety(); var pd=document.getElementById("p-dark-"+((S.profil.temaAuto!==false)?"auto":(S.profil.dark?"tmava":"svetla"))); if(pd)pd.checked=true; var pb=document.getElementById("p-big"); if(pb)pb.checked=!!S.profil.big; var pa=document.getElementById("p-akcie"); if(pa)pa.value=S.akcie||""; var pbal=document.getElementById("p-balenia"); if(pbal)pbal.checked=(S.profil.balenia!==false); var pw=document.getElementById("p-watch"); if(pw)pw.value=S.profil.watch||""; var pz=document.getElementById("p-zakazane"); if(pz)pz.value=S.profil.zakazane||""; var pks=document.getElementById("p-kupsnack"); if(pks)pks.checked=(S.profil.kupSnack!==false); var pct=document.getElementById("p-cieltyp"); if(pct)pct.value=S.profil.cielTyp||"udrzanie"; var pok=document.getElementById("p-okno"); if(pok)pok.checked=!!S.profil.okno; var pos=document.getElementById("p-oknostart"); if(pos)pos.value=S.profil.oknostart||12;
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
async function uiLogout(){ if(!await confirmModal("Odhlásiť sa? Tvoje údaje ostanú uložené v účte a načítajú sa po ďalšom prihlásení. Z tohto zariadenia sa vyčistia.","Odhlásiť sa"))return; await authLogout(); }
async function uiSkupinaVytvor(){ try{ await skupinaVytvor(document.getElementById("au-nazov").value.trim()); naplnUcet(); }catch(e){ auMsg(e.message,true); } }
async function uiSkupinaPripoj(){ try{ await skupinaPripoj(document.getElementById("au-kod").value); naplnUcet(); renderPlan(); renderNakup(); renderDash(); }catch(e){ auMsg(e.message,true); } }
async function uiSkupinaOpusti(){ if(!await confirmModal("Opustiť skupinu? Zdieľaný plán a nákup sa prestanú synchronizovať.","Opustiť skupinu"))return; await skupinaOpusti(); naplnUcet(); }
document.addEventListener("change",e=>{ const el=e.target; if(!el||!el.closest) return;
  if(!el.closest("#v-nastavenia")||el.closest("#stravnici-box,#zdroje-box")) return;
  if(/^(t-|v-vaha|sync|sk-|ucet)/.test(el.id||"")) return;
  // kolo 6 (pocit): téma, písmo a svetlá/tmavá sa prelínajú, nie preskočia naraz
  if(/^p-(paleta|pismo|dark)/.test(el.id||"")){ _plynule(()=>ulozProfil()); return; }
  if((el.id&&/^p-/.test(el.id))||el.matches("#sloty-box input")) ulozProfil(); });
function ulozProfil(){ normStravnici(); const dietaPred=JSON.stringify([S.profil.ryby,S.profil.lepok,S.profil.mlieko,S.profil.zakazane,S.profil.menejSoli,S.profil.diabetes]);
  const sbox=document.getElementById("sloty-box"); if(sbox){ const izb=[...sbox.querySelectorAll("input[data-slot]")].filter(i=>i.checked).map(i=>i.dataset.slot); S.profil.sloty=izb.length?izb:DEFAULT_SLOTY.slice();
    const l=stravniciList(), mPred=JSON.stringify(l.map(p=>[...mimoOsoby(p)].sort()));
    l.forEach((p,i)=>{ p.mimo=[...sbox.querySelectorAll('input[data-mimo][data-os="'+i+'"]')].filter(x=>x.checked).map(x=>x.dataset.mimo).join("|"); }); S.profil.mimo="";
    if(mPred!==JSON.stringify(l.map(p=>[...mimoOsoby(p)].sort()))){ rescaleDen([0,1,2,3,4,5,6]);
      const kto=l.filter(p=>p.mimo).map(p=>(p.nazov||"?")+": "+p.mimo.split("|").join(", ").toLowerCase());
      const ak=document.activeElement; setTimeout(()=>{ drzFokus(()=>{ renderSlotyBox(); renderPlan(); },ak); toast(kto.length?"🏢 Mimo domu Po–Pi — "+kto.join(" · ")+". Porcie a nákup som prepočítal.":"🏢 Všetci jedia doma — porcie a nákup som prepočítal."); },0); } }
  syncHlavnyCiel(); // cieľ sa už needituje tu — drží ho prvý riadok stravníkov
  S.profil.biel=parseInt(document.getElementById("p-biel").value)||0;
  S.profil.ryby=document.getElementById("p-ryby").checked; { const a=document.getElementById("p-menejsoli"), b=document.getElementById("p-domaca"), c=document.getElementById("p-jedenhrniec"); if(a)S.profil.menejSoli=a.checked; const hrPred=!!S.profil.jedenHrniec, domPred=!!S.profil.domaca; if(b)S.profil.domaca=b.checked; if(c)S.profil.jedenHrniec=c.checked;
    if(hrPred!==!!S.profil.jedenHrniec||domPred!==!!S.profil.domaca) setTimeout(()=>toast((hrPred!==!!S.profil.jedenHrniec?(S.profil.jedenHrniec?"🍲 Obed aj večera z jedného hrnca":"🍲 Obed a večera zvlášť"):(S.profil.domaca?"🏡 Najmä domáca kuchyňa":"🏡 Všetky kuchyne"))+" — platí od ďalšieho zostavenia.",{text:"✨ Zostaviť teraz",fn:()=>{ prepni("planovac"); generujTlacidlo(); }},8000),0); } S.profil.lepok=document.getElementById("p-lepok").checked; S.profil.mlieko=document.getElementById("p-mlieko").checked; var _tema=(document.querySelector('input[name="p-dark-r"]:checked')||{}).value||"auto";
  S.profil.temaAuto=(_tema==="auto"); S.profil.dark=(_tema==="tmava"); { const pr=document.querySelector('input[name="p-paleta"]:checked'); if(pr) S.profil.paleta=pr.value; const ps=document.querySelector('input[name="p-pismo"]:checked'); if(ps) S.profil.pismo=ps.value; } S.akcie=document.getElementById("p-akcie").value; S.profil.balenia=document.getElementById("p-balenia").checked; S.profil.watch=document.getElementById("p-watch").value; S.profil.zakazane=document.getElementById("p-zakazane").value; { const pv=document.getElementById("p-veg"); if(pv && pv.checked!==jeBezMasa()) bezMasaNastav(pv.checked); }; S.profil.kupSnack=document.getElementById("p-kupsnack").checked; S.profil.cielTyp=document.getElementById("p-cieltyp").value; S.profil.okno=document.getElementById("p-okno").checked; S.profil.oknostart=parseInt(document.getElementById("p-oknostart").value)||12;
  applyVzhlad(); save(); { const ok=document.getElementById("profil-ok"); if(ok){ ok.textContent="Uložené ✓"; clearTimeout(ok._t); ok._t=setTimeout(()=>{ ok.textContent="Zmeny sa ukladajú hneď."; },2500); } } renderGrid();
  { const d=document.getElementById("p-diabetes"); if(d) S.profil.diabetes=d.checked; }
  if(dietaPred!==JSON.stringify([S.profil.ryby,S.profil.lepok,S.profil.mlieko,S.profil.zakazane,S.profil.menejSoli,S.profil.diabetes])) opravPlanPoZmene("diétou"); }
// Po zmene diéty, zákazov alebo stravníkov (dieťa, vegetarián) sa naplánovaný týždeň neprepočítal — nákup kúpil bagetu celiatikovi.
function opravPlanPoZmene(coho){ zapamatajTyzden(); let n=_vymenNevhodne();
  // Kolo 3 (alergik): opravil sa len zobrazený týždeň, nasledujúci mal ďalej bagetu a orieškový puding.
  const od0=S.viewOd, od=pondelokPre(dnesISO());
  [...new Set(Object.keys(S.plan||{}).filter(iso=>/^\d{4}-\d\d-\d\d$/.test(iso)).map(pondelokPre))].filter(t=>t>=od&&t!==od0).forEach(t=>{ S.viewOd=t; n+=_vymenNevhodne(); });
  S.viewOd=od0;
  if(n){ save(); renderPlan(); if(document.getElementById("v-domov").classList.contains("active"))renderDash(); toastSpat("Vymenil som "+sklon(n,"jedlo","jedlá","jedál")+", ktoré nesedeli s "+coho+"."); } }

// v32: „🍳 Čo uvarím z toho, čo mám" — okno z Domova (a zo Špajze). v34: zoznam je ten istý ako „Mám doma"
// v Nákupe (S.domaNakup) a zásoby Špajze sa rátajú vždy — netreba ich pripisovať.
function otvorCoUvarim(){ const nSp=(S.spajza||[]).filter(zasobaPlatna).length;
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>🥕 Čo uvarím z toho, čo mám</h2></div><div class="content2">'
    +'<textarea class="doma-in" id="cu-in" aria-label="Čo máš doma" placeholder="napr. vajcia, syr, paprika, cestoviny" oninput="cuZmena(this.value)">'+escHtml(S.domaNakup)+'</textarea>'
    +'<p class="info" style="margin:6px 0 0">Oddeľ čiarkou. Je to ten istý zoznam ako „Mám doma" v Nákupe'+(nSp?' a rátam aj '+sklon(nSp,"zásobu","zásoby","zásob")+' zo Špajze':'')+'. Soľ, korenie, olej a vodu beriem ako samozrejmosť.</p>'
    +'<div id="cu-out" style="margin-top:14px"></div></div>';
  document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal");
  renderCoUvarim(); }
let _cuTimer=null;
function cuZmena(v){ S.domaNakup=v; clearTimeout(_cuTimer); _cuTimer=setTimeout(()=>{ save(); renderCoUvarim(); },300); }
// pripíše platné zásoby, ktoré v zozname ešte nie sú (expirované nie — tie už nemáš)
function cuZoSpajze(){ renderCoUvarim(); } // v34: Špajza sa ráta vždy (mamDomaTok); ostáva kvôli starým volaniam
function _cuRiadok(x){
  return `<div class="match">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <button class="cu-nazov" onclick="zavriPick();otvor('${x.r.id}')">${ikony[x.r.kategoria]||"🍴"} ${escHtml(x.r.nazov)}</button>
      <span style="color:var(--muted);font-size:14px;white-space:nowrap">${x.mame}/${x.spolu}</span></div>
    <div class="bar"><i style="width:${x.pct}%"></i></div>
    ${x.chyba.length?`<div style="font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;align-items:center"><span>Chýba: ${escHtml(x.chyba.join(", "))}</span><button class="btn" onclick="pridajChybajuceDoNakupu('${x.r.id}')">+ do nákupu</button></div>`:''}
  </div>`; }
function renderCoUvarim(){ const out=document.getElementById("cu-out"); if(!out)return;
  const tok=mamDomaTok();
  if(!tok.length){ out.innerHTML='<p class="info">Napíš, čo máš doma — aspoň jednu surovinu.</p>'; return; }
  const z=coUvarim(tok), hned=z.filter(x=>!x.chyba.length), skoro=z.filter(x=>x.chyba.length);
  if(!z.length){ out.innerHTML='<p class="info">Z toho sa zatiaľ nič nedá uvariť — pridaj ďalšie suroviny.</p>'; return; }
  const sekcia=(t,l)=>l.length?'<h3 class="sekcia">'+t+' ('+l.length+')</h3>'+l.slice(0,15).map(_cuRiadok).join(""):"";
  out.innerHTML=sekcia("✅ Uvaríš hneď",hned)+sekcia("🛒 Chýba 1–2 suroviny",skoro); }
function pridajChybajuceDoNakupu(id){ const r=receptById(id); if(!r)return;
  const chyb=skoreReceptu(r,mamDomaTok()).chyba;
  if(!chyb.length){ toast("Nič nechýba 🎉"); return; }
  pridajDoNakupu(chyb); }
function pridajDoNakupu(nazvy){
  nazvy.forEach(nz=>{ if(!S.nakupManual.some(m=>bezDia(m.nazov)===bezDia(nz))) S.nakupManual.push({id:"m"+(S.spSid++),nazov:nz,done:false}); });
  save(); toast("Pridané do nákupu: "+nazvy.join(", ")); }

// v33: „🍸 Môj bar" (ako My Cocktail Bar) — zaškrtneš fľaše a suroviny, ktoré máš, a okno povie,
// čo namiešaš hneď, čomu chýba jedna vec a ktorá fľaša odomkne najviac drinkov. S.bar = „|"-zoznam kľúčov.
// Páruje sa KĽÚČOM potraviny, nie textom ako „Čo uvarím": zoznam na zaškrtnutie aj skóre idú
// z barKluc, takže „mám" a „chýba" sa nemôžu rozísť. Surovina bez množstva je ozdoba (plátok
// citróna na okraj) a nepočíta sa — inak by Negroni „chýbal pomaranč".
const BAR_SAMOZREJME=new Set(["ľad","voda","cukor","soľ"]);
const BAR_SKUPINY=[["Alkohol","🥃 Destiláty, likéry, víno"],["Nápoje","🥤 Mixéry a džúsy"],["Zelenina a ovocie","🍋 Ovocie, šťavy, bylinky"],["","🧂 Ostatné"]];
const BAR_ZAKLAD=[["Gin",/gin/],["Vodka",/vodk/],["Rum",/rum|cacha/],["Whisky",/whisk|bourbon/],["Tequila",/tequil|mezcal/],
  ["Brandy",/brandy|koňak|cognac|kalvados|pisco/],["Aperitívy a bitter",/campari|aperol|vermút|lillet|amaro|fernet|bitter|becherovka|sherry|portsk/],
  ["Víno a bublinky",/víno|prosecco|šampan|cabernet|pivo|cider/]];
// Všeobecnú surovinu v recepte splní ktorýkoľvek konkrétny druh: „Whisky" bourbon aj škótska.
// Opačne nie — kto má len „whisky", nevie, či je to bourbon, ktorý Old Fashioned chce.
const BAR_NAHRADY={"rum":["biely rum","tmavý rum"],"whisky":["bourbon","škótska whisky","ražná whisky","írska whisky"]};
let _barFilter="Všetky";
function barKluc(i){ const p=najdiPotravinu(i.nazov); return p?kanonKluc(p.kluc):bezDia(i.nazov).trim(); }
function _barSuroviny(r){ return [...new Set((r.ingrediencie||[]).filter(i=>i.mnozstvo!=null).map(barKluc))].filter(k=>!BAR_SAMOZREJME.has(k)); }
function barMam(){ return new Set((S.bar||"").split("|").filter(Boolean)); }
function barKokteily(){ return RECEPTY.filter(r=>r.kategoria==="Kokteil" && prejdeProfil(r)); }
function barSkore(r,mam){ const s=_barSuroviny(r), chyba=s.filter(k=>!mam.has(k) && !(BAR_NAHRADY[k]||[]).some(x=>mam.has(x))); return {mame:s.length-chyba.length, spolu:s.length, chyba}; }
// kľúč → {k, n (počet drinkov), nazov (najčastejší názov v receptoch — kľúč býva kmeň „limetk"), odd}
function barKatalog(){ const m=new Map();
  barKokteily().forEach(r=>{ const v=new Set();
    (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null) return; const k=barKluc(i); if(BAR_SAMOZREJME.has(k)) return;
      const z=m.get(k)||{k,n:0,nazvy:{},odd:(najdiPotravinu(i.nazov)||{}).oddelenie||""};
      z.nazvy[i.nazov]=(z.nazvy[i.nazov]||0)+1; if(!v.has(k)){ v.add(k); z.n++; } m.set(k,z); }); });
  m.forEach(z=>{ z.nazov=Object.entries(z.nazvy).sort((a,b)=>b[1]-a[1])[0][0]; });
  return m; }
// rodina podľa alkoholu s najväčším množstvom (Negroni 30/30/30 → prvý, gin)
function zakladDrinku(r){ let naj=null;
  (r.ingrediencie||[]).forEach(i=>{ if(i.mnozstvo==null) return; const p=najdiPotravinu(i.nazov);
    if(p && p.oddelenie==="Alkohol" && (!naj || i.mnozstvo>naj.m)) naj={m:i.mnozstvo,k:p.kluc}; });
  if(!naj) return "Nealko";
  const z=BAR_ZAKLAD.find(([,re])=>re.test(naj.k)); return z?z[0]:"Likéry"; }
// ktorá jedna vec odomkne najviac drinkov: kľúč → počet drinkov, kde chýba LEN on
function coDokupit(zoz,mam){ const c=new Map();
  zoz.forEach(r=>{ const ch=barSkore(r,mam).chyba; if(ch.length===1) c.set(ch[0],(c.get(ch[0])||0)+1); });
  return [...c].sort((a,b)=>b[1]-a[1]); }
function otvorBar(){
  const h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>🍸 Môj bar</h2></div><div class="content2">'
    +'<div class="chips" id="bar-chips" role="group" aria-label="Podľa destilátu"></div>'
    +'<details class="panel" id="bar-mam"'+(barMam().size?'':' open')+'><summary id="bar-sum"></summary><div id="bar-zoz"></div></details>'
    +'<div id="bar-out" style="margin-top:14px"></div></div>';
  document.getElementById("pick-modal").innerHTML=h; document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal");
  const kat=barKatalog(), mam=barMam();
  document.getElementById("bar-zoz").innerHTML=BAR_SKUPINY.map(([odd,t])=>{
    const l=[...kat.values()].filter(z=>odd?z.odd===odd:!BAR_SKUPINY.some(s=>s[0]&&s[0]===z.odd)).sort((a,b)=>b.n-a.n||a.nazov.localeCompare(b.nazov,"sk"));
    return l.length?'<h3 class="sekcia">'+t+'</h3>'+l.map(z=>`<label class="switch"><input type="checkbox" data-bar="${escHtml(z.k)}" ${mam.has(z.k)?"checked":""} onchange="ulozBar()"> ${escHtml(z.nazov)} <span class="info">${z.n}×</span></label>`).join(""):""; }).join("");
  renderBar(); }
// Prekresľuje sa len výsledok a súhrn, nie zoznam — políčko pod prstom nepríde o fokus (vzor ulozZdroje).
function ulozBar(){ S.bar=[...document.querySelectorAll("#bar-zoz input[data-bar]")].filter(i=>i.checked).map(i=>i.dataset.bar).join("|"); save(); renderBar(); renderBarDom(); }
// Tlačidlo na Domove hovorí rovno výsledok (ako My Cocktail Bar na úvode): koľko drinkov namiešaš hneď.
function renderBarDom(){ const b=document.getElementById("bar-dom"); if(!b) return; const mam=barMam();
  const n=mam.size?barKokteily().filter(r=>!barSkore(r,mam).chyba.length).length:0;
  b.textContent=n?"🍸 Môj bar — namiešaš "+n+" "+(n===1?"kokteil":n<5?"kokteily":"kokteilov"):"🍸 Môj bar — čo namiešam"; }
function barFilter(z){ _barFilter=z; drzFokus(renderBar); }
function _barRiadok(x,kat){ const r=x.r, fav=S.fav[r.id]?"★ ":"";
  const ch=(x.chyba||[]).map(k=>(kat.get(k)||{nazov:k}).nazov);
  return `<div class="match">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <button class="cu-nazov" onclick="zavriPick();otvor('${r.id}')">${fav}🍸 ${escHtml(r.nazov)}</button>
      <span style="color:var(--muted);font-size:14px;white-space:nowrap">${escHtml(zakladDrinku(r))}</span></div>
    ${ch.length?`<div style="font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;align-items:center"><span>Chýba: ${escHtml(ch.join(", "))}</span><button class="btn" data-k="${escHtml(x.chyba[0])}" onclick="barDoNakupu(this.dataset.k)">+ do nákupu</button></div>`:''}
  </div>`; }
function barDoNakupu(k){ const z=barKatalog().get(k); pridajDoNakupu([z?z.nazov:k]); }
function renderBar(){ const out=document.getElementById("bar-out"); if(!out) return;
  const mam=barMam(), kat=barKatalog(), vsetky=barKokteily();
  const rodiny=["Všetky",...[...BAR_ZAKLAD.map(z=>z[0]),"Likéry","Nealko"].filter(z=>vsetky.some(r=>zakladDrinku(r)===z))];
  if(!rodiny.includes(_barFilter)) _barFilter="Všetky";
  document.getElementById("bar-chips").innerHTML=rodiny.map(z=>`<button type="button" class="chip${z===_barFilter?" active":""}" aria-pressed="${z===_barFilter}" data-fokus="bar-${escHtml(z)}" data-z="${escHtml(z)}" onclick="barFilter(this.dataset.z)">${escHtml(z)}</button>`).join("");
  document.getElementById("bar-sum").textContent="🧴 Čo mám doma ("+mam.size+")";
  const zoz=vsetky.filter(r=>_barFilter==="Všetky"||zakladDrinku(r)===_barFilter)
    .sort((a,b)=>oblubenostVaha(b.id)-oblubenostVaha(a.id)||a.nazov.localeCompare(b.nazov,"sk"));
  const sekcia=(t,l)=>l.length?'<h3 class="sekcia">'+t+' ('+l.length+')</h3>'+l.map(x=>_barRiadok(x,kat)).join(""):"";
  if(!mam.size){ out.innerHTML='<p class="info">Zaškrtni fľaše a suroviny, ktoré máš doma — ukážem, čo z nich namiešaš.</p>'+sekcia("🍸 Kokteily",zoz.map(r=>({r}))); return; }
  const sk=zoz.map(r=>Object.assign({r},barSkore(r,mam)));
  const hned=sk.filter(x=>!x.chyba.length), skoro=sk.filter(x=>x.chyba.length===1 && x.mame>0);
  const dok=coDokupit(zoz,mam).slice(0,5);
  out.innerHTML=(hned.length||skoro.length?"":'<p class="info">Z toho, čo máš, zatiaľ nič nenamiešaš — pozri, čo dokúpiť.</p>')
    +sekcia("✅ Namiešaš hneď",hned)+sekcia("🛒 Chýba 1 vec",skoro)
    +(dok.length?'<h3 class="sekcia">🛍 Čo dokúpiť</h3>'+dok.map(([k,n])=>`<div class="match" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span><b>${escHtml((kat.get(k)||{nazov:k}).nazov)}</b> → +${n} ${n===1?"kokteil":n<5?"kokteily":"kokteilov"}</span><button class="btn" data-k="${escHtml(k)}" onclick="barDoNakupu(this.dataset.k)">+ do nákupu</button></div>`).join(""):""); }
// D1: prekreslenie 1336 kariet po každom znaku trvalo 8,2 s. Debounce 200 ms a len „input"
// (pri <select> chodí input aj change, takže render bežal 2×).
// v33: 150 ms — údery pri písaní na telefóne idú po ~120 ms, takže mriežka sa počas písania
// neprekresľuje, a výsledok je o 50 ms skôr. Enter (enterkeyhint="search") vykreslí hneď
// a zavrie klávesnicu, aby bolo vidieť výsledky.
let _gridTimer=null;
function renderGridDebounce(){ clearTimeout(_gridTimer); _gridTimer=setTimeout(renderGrid,150); }
["hladaj","f-kuchyna","f-zdroj","f-cas","f-diet","f-sort"].forEach(id=>{
  const el=document.getElementById(id); if(!el)return;
  el.addEventListener("input",renderGridDebounce);
  if(id==="hladaj") el.addEventListener("keydown",e=>{ if(e.key==="Enter"){ clearTimeout(_gridTimer); renderGrid(); el.blur(); } });
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
// ✕ bolo <a> bez href (12×23 px, klávesnica ho nevidela) a mazalo bez opýtania.
async function zmazZasobu(id){ const x=S.spajza.find(s=>s.id===id); if(!x)return; const a=document.activeElement;
  if(!await confirmModal("Zmazať „"+x.nazov+"“ zo špajze?","Zmazať")) return;
  S.spajza=S.spajza.filter(s=>s.id!==id); save(); drzFokus(renderSpajza,a); }
function upravZasobu(id,dir){ const it=S.spajza.find(x=>x.id===id); if(!it)return; const k=krokPreJednotku(it.jednotka);
  it.mnozstvo=Math.max(0,Math.round((it.mnozstvo+dir*k)*100)/100); save(); drzFokus(renderSpajza); }
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
// `id` ide do onclick bez úvodzoviek — normalizujStav ho drží ako číslo; tu sa vloží LEN číslo,
// keby zásoba prišla inou cestou (0 = neexistujúca zásoba, klik nič neurobí).
function spRow(x){ const low=chybaDoMinima(x)>0, id=sediTyp(x.id,"n")?x.id:0;
  return `<div class="sp-row"><span><b>${escHtml(x.nazov)}</b> <span class="meta2">${fmt(x.mnozstvo)} ${escHtml(x.jednotka)}${x.mnozstvo<0?' <span class="low">(záporné množstvo — oprav ✎)</span>':""}${x.min?" · min "+fmt(x.min):""}${low?' <span class="low">(doplniť)</span>':""}${x.expiry?' · <span class="'+expTrieda(x.expiry)+'">'+expText(x.expiry)+'</span>':""}</span></span><span class="sp-akc"><button class="mini" onclick="upravZasobu(${id},-1)" aria-label="Ubrať ${escHtml(x.nazov)}">−</button><button class="mini" onclick="upravZasobu(${id},1)" aria-label="Pridať ${escHtml(x.nazov)}">+</button><button class="mini" onclick="upravSpajzu(${id})" aria-label="Upraviť ${escHtml(x.nazov)}">✎</button><button class="mini sp-x" onclick="zmazZasobu(${id})" aria-label="Zmazať ${escHtml(x.nazov)}">✕</button></span></div>`; }
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
  // Prázdna špajza: „➕ Pridať zásobu" je otvorené aj na telefóne (mob-zbal ho inak zbalí) a
  // primárne „Nájdi recepty zo špajze" sa neponúka nad prázdnou špajzou (audit 30. 9.).
  const pd=document.getElementById("sp-pridaj"); if(pd&&!S.spajza.length) pd.open=true;
  const cu=document.getElementById("sp-uvarim"); if(cu) cu.hidden=!S.spajza.length;
  if(!S.spajza.length){ box.innerHTML='<p class="info">Zatiaľ prázdne. Čo tu zapíšeš (aj s dátumom spotreby), to nákup nekúpi znova a generátor to uprednostní, kým sa nepokazí. Do špajze sa dostane aj odškrtnutý nákup cez „📥 Kúpené do špajze“.</p><div class="btn-row"><button class="btn" onclick="otvorCoUvarim()">🥕 Čo uvarím z toho, čo mám</button></div>'; return; }
  let h="";
  spajzaSkupiny().forEach(s=>{ h+=`<div class="odd"><h3>${s.nadpis}</h3>`; s.polozky.forEach(x=>h+=spRow(x)); h+="</div>"; });
  box.innerHTML=h; }
function renderDashSpajza(){ const el=document.getElementById("dash-spajza"); if(!el)return;
  const soon=S.spajza.filter(x=>{const n=dniDo(x.expiry);return n!==null&&n<=4;}).sort((a,b)=>dniDo(a.expiry)-dniDo(b.expiry));
  const low=S.spajza.filter(x=>chybaDoMinima(x)>0); let h="";
  if(soon.length) h+="⏰ "+soon.map(x=>escHtml(x.nazov)+' <span class="'+expTrieda(x.expiry)+'">('+escHtml(expText(x.expiry))+')</span>').join(", ")+"<br>";
  if(low.length) h+="🛒 Doplniť: "+low.map(x=>escHtml(x.nazov)).join(", ");
  el.innerHTML=h||"Špajza je v poriadku."; }
// „Dojedz, čo sa kazí" (Grocy due score): zásoba, ktorej zostávajú ≤ 2 dni = 20 bodov, ≤ 5 dní = 10, ≤ 7 dní = 1.
// Párovanie cez spajzaSedi (ten istý kľúč potraviny ako nákup), nie voľný podreťazec — do v33 expBoost
// vracal len 0 alebo 1,5 a v meraní študenta nemal žiadny účinok (22/56 vs. 24/56).
let _due={k:"",m:new Map()};
function dueSkore(r){ const k=(S.spajza||[]).length+"|"+dnesISO(); if(_due.k!==k) _due={k,m:new Map()};
  let v=_due.m.get(r.id); if(v!==undefined) return v;
  const zas=(S.spajza||[]).filter(x=>zasobaPlatna(x)&&x.expiry).map(x=>({x,d:dniDo(x.expiry)})).filter(z=>z.d!==null&&z.d<=7);
  v=0; if(zas.length) (r.ingrediencie||[]).forEach(i=>{ const p=najdiPotravinu(i.nazov); const z=zas.find(z=>spajzaSedi(z.x,i.nazov,p)); if(z) v+=z.d<=2?20:z.d<=5?10:1; });
  _due.m.set(r.id,v); return v; }
function expBoost(r){ return Math.min(3,dueSkore(r)/10); }
// S3: zásoby tej istej suroviny sa míňajú FIFO — najskôr tá, ktorá expiruje najskôr. Predtým sa
// brala len PRVÁ nájdená položka (`find`), takže pri dvoch balíčkoch s rôznou expiráciou sa druhý
// nikdy nepoužil a zvyšok potreby sa ticho stratil (Math.max(0,…) ho zjedol).
// S4: `porcie`/`velkost` sa dajú zadať zvonka. Bez nich sa použije stav detailu receptu (aktPorcie),
// čo je správne len keď je otvorený TENTO recept — odpis receptu mimo plánu inak škáloval cudzím
// počtom porcií.
// Párovanie aj platnosť sú TIE ISTÉ ako v nákupe (spajzaSedi, zasobaPlatna): expirovaná zásoba
// sa neminie ako prvá (do v32 ju FIFO bralo prednostne, lebo expiruje „najskôr").
function spajzaKandidati(nazov,p){
  return (S.spajza||[]).filter(x=>zasobaPlatna(x) && spajzaSedi(x,nazov,p))
    .sort((a,b)=>{ const da=dniDo(a.expiry), db=dniDo(b.expiry);
      if(da===db)return 0; if(da===null)return 1; if(db===null)return -1; return da-db; }); }
// `aktualny` je OBJEKT receptu — do v32 sa porovnával s `r.id`, podmienka neplatila nikdy a varenie
// z plánu (blok na 4 porcie, veľkosť 95 %) odpísalo surovín ako na 2 porcie receptu.
function odpisRecept(r,porcie,velkost){ if(!r)return; if(!S.spajza.length){toast("Špajza je prázdna.");return;}
  const jeDetail=!!aktualny&&aktualny.id===r.id;
  const fPocet=(porcie!=null?porcie:(jeDetail?aktPorcie:(r.porcie||1)))/(r.porcie||1);
  const fVelkost=velkost!=null?velkost:(jeDetail?aktVelkost:1);
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
  toast(zmen?("Odpísané zo špajze: "+sklon(zmen,"surovina","suroviny","surovín")+"."+(neviem?" ("+sklon(neviem,"sa nedala","sa nedali","sa nedalo")+" previesť)":""))
            :"Nenašla sa zhoda (skontroluj názvy v špajzi)."); }
// Otvorené menu je vrstva v histórii (Späť ho zavrie) — _zahodHistoriuModalu zladí počet záznamov.
function _menuStav(m){ const b=m.parentElement&&m.parentElement.querySelector("button"); if(b)b.setAttribute("aria-expanded",m.classList.contains("open")); }
function toggleMenu(id){ document.querySelectorAll(".menu").forEach(m=>{ if(m.id!==id){ m.classList.remove("open"); _menuStav(m); } }); const el=document.getElementById(id); if(el){ el.classList.toggle("open"); _menuStav(el); } _zahodHistoriuModalu(); }
function zavriMenu(){ document.querySelectorAll(".menu.open").forEach(m=>{ m.classList.remove("open"); _menuStav(m); }); _zahodHistoriuModalu(); }
document.addEventListener("click",e=>{ if(!e.target.closest(".menu-wrap")) zavriMenu(); });
function otvorNacitat(){ const all=vsetkyJedalnicky(); if(!all.length){ toast("Zatiaľ žiadne uložené jedálničky. Najprv daj ⋯ Viac → Uložiť tento plán."); return; }
  const z=all.slice().sort((a,b)=>(b.od||b.id||"").localeCompare(a.od||a.id||""));
  let h='<div class="hero"><button class="close" onclick="zavriPick()">✕</button><h2>Načítať jedálniček</h2></div><div class="content2" style="max-height:60vh;overflow:auto">';
  z.forEach(j=>{ h+=`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="nacitajJedalnicekId('${escHtml(String(j.id).replace(/\\/g,"\\\\").replace(/'/g,"\\'"))}')"><span class="nm">${(String(j.id)[0]==="a"?"🖫 ":"📅 ")}${escHtml(j.nazov||j.id)}</span></div>`; });
  h+="</div>"; document.getElementById("pick-modal").innerHTML=h; zpristupniKliky(document.getElementById("pick-modal")); document.getElementById("pick-overlay").classList.add("open"); _fokusDoModalu("pick-modal"); }
async function nacitajJedalnicekId(id){ const j=vsetkyJedalnicky().find(x=>x.id===id); if(!j)return; if(!await confirmModal(`Načítať „${j.nazov||j.id}"? Prepíše sa tento týždeň.`,"Načítať"))return;
  nacitajSablonuDoTyzdna(j.plan||{},j.planF||{}); if(j.ciel_kcal)S.profil.kcal=j.ciel_kcal; save(); zavriPick(); renderPlan(); }
let _kalHist=false;
function planZobraz(m){
  if(m==="kalendar"&&!_kalHist){ try{ history.pushState({kal:1},""); _kalHist=true; }catch(e){} }
  else if(m==="tyzden"&&_kalHist){ _kalHist=false; _ignorujPop++; try{ history.back(); }catch(e){ _ignorujPop--; } }
  const t=document.getElementById("plan-tyzden"), k=document.getElementById("plan-kal");
  if(t)t.style.display=(m==="tyzden")?"":"none"; if(k)k.style.display=(m==="kalendar")?"":"none";
  const tt=document.getElementById("tab-tyzden"), tk=document.getElementById("tab-kal");
  if(tt)tt.classList.toggle("active",m==="tyzden"); if(tk)tk.classList.toggle("active",m==="kalendar");
  if(tt)tt.setAttribute("aria-pressed",m==="tyzden"); if(tk)tk.setAttribute("aria-pressed",m==="kalendar"); // stav nie len farbou (4.1.2)
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
    // deň je ovládanie (role=button cez zpristupniKliky) — menovka nesie dátum aj obsah, inak by čítačka
    // 30× prečítala ten istý title „Ísť na týždeň tohto dňa"
    const men=d+". "+(mes+1)+"."+(iso===dnes?" (dnes)":"")+(naplanovane?" · naplánované":"")+(ev.length?" · uvarené: "+ev.join(", "):"")+" — ísť na týždeň v Pláne";
    h+=`<div class="day${iso===dnes?' je-dnes':''}" style="cursor:pointer" title="Ísť na týždeň tohto dňa v Pláne" aria-label="${escHtml(men)}"${iso===dnes?' aria-current="date"':''} onclick="skokNaTyzdenDna('${iso}')"><div class="dn">${d}${naplanovane?'<span class="plan-dot" title="naplánované">●</span>':''}</div>${ev.map(n=>`<div class="ev" title="${escHtml(n)}">${escHtml(n)}</div>`).join("")}</div>`; }
  h+="</div>"; if(!(S.uvarene||[]).length) h+='<p class="info" style="margin-top:10px">Zatiaľ žiadna história. Po dokončení režimu varenia sa jedlo zapíše do kalendára.</p>';
  grid.innerHTML=h; zpristupniKliky(grid); }
// Ako sa jedlo chystá v batch cookingu: "dopredu" (navar na celý blok) | "den" (čerstvé — pripraví sa v deň
// jedenia: sendviče, šaláty, surová ryba, pečivo) | "kup" (hotový výrobok). Heuristika podľa názvu a kategórie.
// 2. kolo (kuchár): burgre, pity, tacos, vyprážané a vaječné jedlá patria do „v deň jedenia";
// šalát zo strukovín/obilnín (bez listovej zeleniny) 3 dni vydrží → „dopredu".
const _CERSTVE=/sendvic|toast|wrap|bageta|baget|tortill|panini|bagel|rozok|zeml|tatarak|carpacc|sushi|ceviche|\bpoke\b|avokad|smoothie|burger|\bpit[aye]\b|\btac|ciabatt|vyprazan|rezen|obal|omelet|prazenic|s(h)?aks(h)?o?uk|huevos|benedikt|poutine|kyjevsk|chilaquil|volsk|hemendex|podavaj hned|carbonar|alfredo|cacio|tempur|kroket|fish (and|&) chips|schnitz|fried|chrumkav|rezn|rezne|nugetk|volsk\w* ok|steak|pizza/;
// Kolo 3 (kuchár): burger, tacos či pita s dlho dusenou náplňou (pollo pibil 80 min) sa nevarí každý deň bloku —
// náplň sa navarí dopredu a v deň jedenia sa len skladá. Vyprážané, surové a vaječné ostávajú „v deň jedenia".
const _LEN_SKLADA=/burger|\bpit[aye]\b|\btac|tortill|wrap|bageta|baget|sendvic|panini|ciabatt|bagel|rozok|zeml/, _NIE_DOPREDU=/vyprazan|rezen|obal|tatarak|carpacc|sushi|ceviche|\bpoke\b|omelet|prazenic|volsk|tempur|fried|schnitz/;
function skladajVDen(k){ if(!k||k._priloha||jeVyrobok(k)||k.kategoria==="Šalát") return false; const n=bezDia(k.nazov||""), m=casMin(k);
  return _LEN_SKLADA.test(n) && !_NIE_DOPREDU.test(n) && m>=45 && m<999; }
const _SALAT_VYDRZI=/cicer|fazul|sosovic|quinoa|kinoa|bulgur|kuskus|cestovin|ryz|krup|pohank|zemiak/, _LISTOVE=/hlavkov|rukol|ladov|rimsk|polnick|spenat listy|baby spenat|salatove listy|lollo|zeruch|cerstv\w* spenat|mlad\w* spenat|mangold|frisee|endiv/;
function skladovanie(k){ if(!k) return "dopredu"; if(jeVyrobok(k)) return "kup";
  if(k._priloha) return k.id==="prf:pecivo"?"kup":/prf:(salat|zelenina|bielkovina_veg)$/.test(k.id)?"den":"dopredu";
  const n=bezDia(k.nazov||""), sur=bezDia((k.ingrediencie||[]).map(i=>i.nazov).join(" "));
  if(k.kategoria==="Šalát") return (!_NIE_DOPREDU.test(n)&&!/avokad/.test(n)&&_SALAT_VYDRZI.test(n+" "+sur.replace(/ryzov\w* ocot/g,""))&&!_LISTOVE.test(sur))?"dopredu":"den";
  if(skladajVDen(k)) return "dopredu";
  if(_CERSTVE.test(n)) return "den";
  const post=bezDia((k.postup||[]).join(" "));
  return /podavaj (ihned|hned|okamzite)|vypraz\w* (zo vsetkych stran|do zlat|dozlat)|(vloz|vhod)\w* do (vacsieho mnozstva )?rozohriat\w* olej|frituj|vo friteze/.test(post)?"den":"dopredu"; }
// Vajce navrch (volské oko, pošírované): základ sa navarí dopredu, vajce sa robí čerstvé pri jedení (kolo 7, kuchár).
function vajceCerstve(k){ return !!k&&!k._priloha&&/volsk\w* ok|na makko|posirovan|vajc\w* (navrch|do jamiek)/.test(bezDia((k.postup||[]).join(" "))); }
// Ryba, mleté mäso a varená ryža sa v chladničke držia kratšie (2 dni) — pri bloku na 3+ dni to treba povedať pri jedle.
function kratkaTrvanlivost(k){ if(!k||jeVyrobok(k)||k.kategoria==="Šalát") return false; if(k._priloha) return k.id==="prf:ryza";
  return jeRybaJedlo(k) || (k.ingrediencie||[]).some(i=>/mlet/.test(bezDia(i.nazov))&&(najdiPotravinu(i.nazov)||{}).meso) || /ryz/.test(bezDia(k.nazov||"")); }
// Varenie celého bloku naraz: spoločné „Priprav si", potom jedlá od najdlhšieho; pri každom kroku meno jedla,
// množstvá za celý blok a časovač pomenovaný receptom. Len jedlá „navar dopredu" (čerstvé sa robia v deň jedenia).
async function spustiCookBlok(d0){
  const it=varenieBloku(denyBloku(d0)).filter(x=>!jeVyrobok(x.k)&&skladovanie(x.k)==="dopredu").map(x=>Object.assign(x,{fp:x.por/(x.k.porcie||1)}));
  if(!it.length){ toast("V tomto bloku nie je čo navariť dopredu."); return; }
  it.sort((a,b)=>b.min-a.min); aktVelkost=1;
  cookPrip=pripravZoznam(it.map(x=>[x.k,x.fp,1])); cookPripPozor=zadusenieText(it.map(x=>x.k));
  const kroky=["🧺 Priprav si na celý blok","Poradie: "+it.map((x,i)=>(i+1)+". "+x.k.nazov).join(", ")+". Začni najdlhším — kým sa dusí alebo pečie, pokračuj ďalším."], zdr=["prip",null];
  { const vg=it.map(x=>{ const t=x.k._priloha?"":vegNahradaText(x.k); return t?x.k.nazov+" — "+t.replace(/^🌱 [^:]+: /,""):""; }).filter(Boolean);
    if(vg.length){ kroky.push("🌱 "+vegMena().join(", ")+" (bez mäsa): "+vg.join(" · ")); zdr.push(null); } }
  // [recept, faktor, text kroku BEZ mena jedla] — krokHint hľadá suroviny len v texte kroku (názov receptu
  // „Quinoa s cícerom a tahini" pridával cícer a tahini ku kroku „Rúru predhrej").
  it.forEach(x=>(x.k.postup||[]).forEach(t=>{ kroky.push(x.k.nazov+": "+t); zdr.push([x.k,x.fp,t]); }));
  cookZdroje=zdr; cookBlokIds=it.filter(x=>!x.k._priloha).map(x=>x.cid);
  _varenieOdpis={}; it.forEach(x=>{ _varenieOdpis[x.cid]={porcie:x.fp*(x.k.porcie||1),velkost:1}; });
  const bi=bloky().findIndex(b=>b.includes(d0));
  await _spustiVarenie(kroky,"blok:"+datumPre(d0),bi<0?null:bi,"Varenie bloku "+(bi<0?"":blokPismeno(bi))+" — "+sklon(it.length,"jedlo","jedlá","jedál")); }
function planVarenia(di){ const dni=blokDni(di); const den=S.plan[datumPre(dni[0])]||{};
  const bi=bloky().findIndex(b=>b[0]===dni[0]); const pism=String.fromCharCode(65+(bi<0?0:bi)); const vari=DNI[(dni[0]+6)%7].slice(0,2);
  let h=`<div class="hero"><button class="close" onclick="zavri()">✕</button><h2>${bi>=0?znakBloku(bi)+" ":""}Plán varenia — Blok ${pism}</h2><div class="subx">${escHtml(vetaBloku(dni))} Navaríš raz, ješ ${dni.length} ${dni.length===1?"deň":(dni.length<5?"dni":"dní")}.</div></div><div class="content2">`;
  // Audit 8. 10. (kuchár): plán bol len zoznam — sendvič s avokádom ako „6 porcií" na 3 dni dopredu, snacky
  // s tlačidlom „recept", bez poradia práce a bez slova o skladovaní. Teraz tri skupiny podľa toho, čo s jedlom
  // v deň varenia robíš; dopredu sa varí od najdlhšieho (to dlhé beží, kým pripravuješ ostatné).
  const d0=prvyDenDoma(dni); // B3: prvý deň „preč" nemá sloty — plán varenia by bol prázdny
  const sk={dopredu:[],den:[],kup:[]};
  varenieBloku(dni).forEach(x=>{ x.sl=x.sloty.join(" + "); x.por=Math.max(1,Math.round(x.por)); sk[skladovanie(x.k)].push(x); }); // casMin: 999 = neznámy čas
  sk.dopredu.sort((a,b)=>b.min-a.min);
  const riadok=x=>{ const btn=x.k._priloha||jeVyrobok(x.k)?"":`<button class="mini" aria-label="Recept: ${escHtml(x.k.nazov)}" onclick="zavri();otvor('${x.cid}',{di:${x.d0},slot:'${x.sl0}'})">Recept</button>`;
    const rz=skladovanie(x.k)==="dopredu"&&!x.k._priloha&&!jeVyrobok(x.k)&&x.k.kategoria!=="Pečivo"&&!skladajVDen(x.k)&&!/lievan|plack|palacin|chlieb|chlebik|bagel|rozok|muffin|kolac|bucht|rezn|kotlet|burger|pizza|vafl|wafl|sendvic|wrap|toast|bageta/.test(bezDia(x.k.nazov||""))?`<button class="mini" aria-label="Rozdeliť hrniec: ${escHtml(x.k.nazov)}" onclick="rozdelHrniec('${x.cid}',${x.d0})">⚖️ Rozdeliť</button>`:"";
    const vn=x.k._priloha?"":vegNahradaText(x.k);
    return `<div class="sp-row"${vn?' style="flex-wrap:wrap"':""}><span class="pv-nazov"><b>${pripravaVopred(x.k)?"⏰ ":""}${escHtml(x.k.nazov)}</b> <span class="meta2">${escHtml(x.sl)} · ${sklon(x.por,"porcia","porcie","porcií")}${x.min>0&&!jeVyrobok(x.k)?" · ~"+cas(aktMin(x))+(aktMin(x)<x.min?" + vopred":""):""}${skladajVDen(x.k)?" · náplň dopredu, skladaj v deň jedenia":""}${vajceCerstve(x.k)?" · 🍳 vajce urob čerstvé pri jedení":""}</span></span><span class="pv-akcie">${rz}${btn}</span>${vn?`<span class="info" style="flex-basis:100%">${escHtml(vn)}</span>`:""}</div>`; };
  const any=sk.dopredu.length+sk.den.length+sk.kup.length>0;
  const aktMin=x=>(pripravaVopred(x.k)&&x.min>=180)?Math.min(x.min,120):(x.min||0); // čakanie cez noc (namáčanie, marináda) sa v deň varenia nepočíta
  const spolu=sk.dopredu.reduce((a,x)=>a+aktMin(x),0), najdlh=sk.dopredu.reduce((a,x)=>Math.max(a,aktMin(x)),0);
  const vopred=sk.dopredu.concat(sk.den).filter(x=>pripravaVopred(x.k)), kratke=dni.length>=3?sk.dopredu.filter(x=>kratkaTrvanlivost(x.k)):[];
  const cas=m=>m>=60?Math.floor(m/60)+" h"+(m%60?" "+Math.round(m%60)+" min":""):Math.round(m)+" min";
  if(spolu>0) h+=`<p class="info" style="margin:0 0 6px">⏱ Spolu ~${cas(spolu)} práce a čakania; keď varíš súbežne, okolo ${cas(Math.max(najdlh,spolu*0.6))}.${najdlh>=180?" Najdlhšie jedlo trvá "+cas(najdlh)+" — začni s ním čo najskôr.":""}</p>`;
  { const zt=zadusenieText(sk.dopredu.concat(sk.den).map(x=>x.k)); if(zt) h+=`<div class="tipy">${escHtml(zt)}</div>`; }
  if(vopred.length) h+=`<div class="tipy">📅 Deň vopred (${DNI[(dni[0]+5)%7].slice(0,2)}): ${vopred.map(x=>escHtml(x.k.nazov)).join(", ")} — marináda, namáčanie alebo kysnutie cez noc.</div>`;
  if(sk.dopredu.filter(x=>!jeVyrobok(x.k)).length>=2) h+=`<div class="btn-row"><button class="btn primary blok-tlac ${S.blokMode?blokTrieda(blokIndex(d0)):""}" onclick="spustiCookBlok(${d0})">👨‍🍳 Variť celý blok naraz</button></div>`;
  if(sk.dopredu.length) h+=`<h3 class="sekcia">🍲 Navar dopredu (${vari})</h3><p class="info">Začni najdlhším — kým sa dusí alebo pečie, priprav ostatné.</p>`+sk.dopredu.map(riadok).join("");
  if(sk.den.length) h+=`<h3 class="sekcia">🥪 Priprav v deň jedenia</h3><p class="info">Čerstvé jedlá nevydržia ${dni.length>1?sklon(dni.length,"deň","dni","dní"):"do druhého dňa"} — suroviny máš z nákupu, pripravíš ich ráno alebo večer pred jedlom.</p>`+sk.den.map(riadok).join("");
  if(sk.kup.length) h+=`<h3 class="sekcia">🛒 Len kúpiť</h3>`+sk.kup.map(riadok).join("");
  if(kratke.length) h+=`<div class="tipy">🧊 ${kratke.map(x=>escHtml(x.k.nazov)).join(", ")}: v chladničke najviac 2 dni — porcie na ${DNI_NA[dni[2]]}${dni.length>3?" a ďalej":""} daj hneď po vychladnutí do mrazničky a deň vopred ich prelož do chladničky.</div>`;
  if(!any) h+='<p class="info">V tomto bloku nie sú naplánované jedlá. Zostav jedálniček alebo klikni do buniek.</p>';
  else h+=`<div class="tipy">💡 Navar dávku na celý blok (${sklon(dni.length,"deň","dni","dní")} × ${stravniciList().length} os.). Uvarené jedlo nechaj do hodiny vychladnúť, rozdeľ do uzavretých nádob a daj do chladničky — vydrží 3 dni; ryba, ryža a mleté mäso radšej do 2 dní.${dni.length>=4?" Blok má "+dni.length+" dni: porcie na "+DNI_NA[dni[3]]+(dni.length>4?" a ďalej":"")+" daj hneď do mrazničky a deň vopred ich prelož do chladničky. Šaláty, vyprážané a cestoviny s krémovou omáčkou mrazenie nezvládnu — tie priprav v deň jedenia.":""} Ohrievaj raz a do horúca. Suroviny spolu nájdeš v Nákupe.</div>`;
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
  normStravnici();
  const nove=Math.max(1200,(parseInt(S.profil.kcal)||CIEL_DEF)+uprava); // automatika nejde pod 1200 (bezpečné minimum bez dozoru)
  if(S.profil.stravnici[0])S.profil.stravnici[0].kcal=nove; // opäť len cez zdroj pravdy
  syncHlavnyCiel(); save(); naplnProfil();
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
  // Supabase v sync-config.js ešte nič nesynchronizuje — treba Sync ID alebo prihlásenie. Do v32 tu
  // svietilo „🟢 Synchronizované", hoci neodišla ani jedna požiadavka.
  if(!syncNakonfig() && !authUser()){ el.innerHTML='<span class="info">Synchronizácia nie je nastavená — zadaj Sync ID alebo sa prihlás. Dáta sú zatiaľ len v tomto zariadení.</span>'; return; }
  let ic,txt;
  if(!navigator.onLine){ ic="⚪"; txt=(S._dirty||S._osobDirty||S._skupDirty)?"Offline — zmeny sa nahrajú po pripojení":"Offline — všetko je nahraté"; }
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
const SHARED_FIELDS=["plan","planF","planM","zamky","nakupCheck","nakupManual","spajza","spSid"]; // v32: 🔒 zámky patria k plánu — bez nich by druhý člen skupiny zamknuté jedlo prepísal
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
    start_url:start, scope:scope, display:"fullscreen",
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
// Dáta sú len v localStorage: požiadaj o trvalé úložisko (Safari/Chrome ho inak môžu pri nedostatku
// miesta či po týždňoch nečinnosti zmazať) a bez synchronizácie raz za 30 dní pripomeň zálohu.
try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(e){}
try{ const syncOn=window.SYNC_CONFIG&&S.profil.syncId&&!S.profil.syncOff, t=Date.now(), DEN=864e5;
  const zal=+localStorage.getItem("kucharka_zaloha_t")||0, pr=+localStorage.getItem("kucharka_pripomienka_t")||0;
  if(!_prvySpust && !syncOn && Object.keys(S.plan||{}).length>=10 && t-zal>30*DEN && t-pr>30*DEN){
    localStorage.setItem("kucharka_pripomienka_t",String(t));
    setTimeout(()=>{ const tt=document.getElementById("toast"); if(tt&&tt.classList.contains("show")&&tt._akcia) return; toast("💾 Tvoje dáta sú len v tomto prehliadači. Zálohuj si ich: ⚙️ Nastavenia → Zálohovať do súboru."); },2500); } }catch(e){}
// Koniec štartu: zhasni indikátor „Načítavam recepty…" (čisté CSS v šablóne, html:not(.nacitane)).
// Pri 4× pomalšom CPU trvá štart 4,4 s a shell dovtedy vyzeral hotový, ale nereagoval.
document.documentElement.classList.add("nacitane"); { const ob=document.getElementById("obsah"); if(ob&&ob.removeAttribute) ob.removeAttribute("aria-busy"); }
