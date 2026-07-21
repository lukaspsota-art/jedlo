# Vylepšenia generátora a plánu (Dávka 2) — Implementačný plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pridať generátoru per-deň počet porcií, masku jedál (vynechať jedlo/deň) a nové filtre (bezmäso, strop času, mäso-pestrosť), s ovládaním v mriežke plánu a v gen-config okne.

**Architecture:** Vanilla JS single-file appka. Zdroje `data/app.js` (všetok JS) + `data/sablona.html` (HTML+CSS) sa buildujú do `kucharka.html` cez `python generuj_kucharku.py`. Nový stav sú 3 mapy v `S` (localStorage `kucharka_v2`), napojené cez helpery `slotyDna`/`pocetPorciiDna`/`porcieSlot` a jediný choke-point `mnozMult`. Všetko spätne kompatibilné (prázdne mapy = staré správanie).

**Tech Stack:** Vanilla JS (ES2017), žiadny framework, žiadny build okrem `generuj_kucharku.py`. Testy = Playwright MCP `browser_evaluate` proti `http://localhost:8123/kucharka.html`.

## Global Constraints

- `data/app.js` **NESMIE** obsahovať literál `</script>` (rozbil by inline vloženie).
- Po KAŽDEJ zmene `data/app.js` alebo `data/sablona.html` spustiť `python generuj_kucharku.py` (na Windows: `py generuj_kucharku.py`). `kucharka.html` sa needituje ručne.
- Stav používateľa: `localStorage` kľúč `kucharka_v2` (objekt `S`). Zmeny sa ukladajú cez `save()`.
- Offline single-file: žiadne CDN/nové závislosti.
- Spätná kompatibilita: nové `S.dayPpl` / `S.slotPpl` / `S.daySloty` prázdne = pôvodné správanie. Žiadna migrácia.
- Sloty: `VSETKY_SLOTY = ["Raňajky","Desiata","Obed","Olovrant","Večera","Snack"]`, `SLOTY()` = aktívne globálne.
- Commit len explicitnými cestami (`git add data/app.js data/sablona.html kucharka.html docs/index.html`), NIKDY `git add -A` (v strome sú nesúvisiace untracked recepty/PNG používateľa).

## Testovací cyklus (referencovaný z úloh)

Predpoklad: server beží — ak nie, spusti `py -m http.server 8123` v roote projektu (background).

Po zmene zdrojov vždy:
```
node --check data/app.js          # syntax; musí prejsť
py generuj_kucharku.py            # rebuild kucharka.html + docs/index.html
```
Potom v prehliadači (Playwright MCP): `browser_navigate http://localhost:8123/kucharka.html`, následne `browser_evaluate` s assert-snippetom danej úlohy.

Assert-konvencia: snippet vráti objekt; kľúče s prefixom `ok_` musia byť `true`. Ak nie, test zlyhal.

---

## Task 1: Stav + core helpery (slotyDna, pocetPorciiDna, porcieSlot, masoTyp)

**Files:**
- Modify: `data/app.js` — inicializácia stavu (blok pri `S.genCfg=...`, ~riadok 27) a nové funkcie (za `mnozMult`, ~riadok 356)

**Interfaces:**
- Produces:
  - `slotyDna(di:number) -> string[]` — aktívne sloty dňa; `S.daySloty[di]` (ak je pole) filtrované cez `VSETKY_SLOTY`, inak `SLOTY()`. Prázdne pole `[]` → `[]` (deň von).
  - `pocetPorciiDna(di:number) -> number` — `S.dayPpl[di]` ak `>0`, inak `pocetPorcii(di)`.
  - `porcieSlot(di:number, slot:string) -> number` — `S.slotPpl[di][slot]` ak `>0`, inak `pocetPorciiDna(di)`.
  - `masoTyp(r:Recept) -> "hydina"|"bravcove"|"hovadzie"|"ryby"|""` — keyword scan ingrediencií+názvu (bezDia).

- [ ] **Step 1: Napíš failing test**

Assert-snippet (spusti cez `browser_evaluate` po reload; teraz musí hodiť chybu, lebo funkcie neexistujú):
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"];
  const out={};
  // slotyDna: bez override = globálne
  out.ok_default = JSON.stringify(slotyDna(0))===JSON.stringify(SLOTY());
  // override maskou
  S.daySloty[1]=["Obed","Večera"];
  out.ok_maska = JSON.stringify(slotyDna(1))===JSON.stringify(["Obed","Večera"]);
  // prázdna maska = deň von
  S.daySloty[2]=[];
  out.ok_denVon = slotyDna(2).length===0;
  // pocetPorciiDna override
  S.profil.stravnici=[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]; S.profil.osoby=2;
  out.ok_pplDefault = Math.round(pocetPorciiDna(0))===2 || pocetPorciiDna(0)>0;
  S.dayPpl[0]=4; out.ok_pplOverride = pocetPorciiDna(0)===4;
  // porcieSlot: slot override má prednosť
  out.ok_slotDeň = porcieSlot(0,"Obed")===4;
  S.slotPpl[0]={Obed:6}; out.ok_slotOverride = porcieSlot(0,"Obed")===6 && porcieSlot(0,"Večera")===4;
  // masoTyp
  out.ok_maso = masoTyp({ingrediencie:[{nazov:"Kuracie prsia"}],nazov:""})==="hydina"
             && masoTyp({ingrediencie:[{nazov:"Losos"}],nazov:""})==="ryby"
             && masoTyp({ingrediencie:[{nazov:"Paradajka"}],nazov:"Šalát"})==="";
  return out;
}
```
Expected: chyba `slotyDna is not defined` (alebo `ReferenceError`).

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_navigate` + `browser_evaluate` (snippet vyššie).
Expected: ReferenceError / niektorý `ok_*` chýba.

- [ ] **Step 3: Pridaj inicializáciu stavu**

V `data/app.js` nájdi riadok:
```js
S.genCfg=Object.assign({zachovat:false,cielMode:true,filtre:[]}, S.genCfg||{});
```
Pridaj hneď ZA tento riadok:
```js
S.dayPpl=S.dayPpl||{}; S.slotPpl=S.slotPpl||{}; S.daySloty=S.daySloty||{};
```

- [ ] **Step 4: Pridaj helpery**

V `data/app.js` nájdi:
```js
function mnozMult(di,slot){ return pocetPorcii(di)*pf(di,slot); }
```
Pridaj hneď ZA tento riadok:
```js
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
```

- [ ] **Step 5: Rebuild + over že test prejde**

Run:
```
node --check data/app.js
py generuj_kucharku.py
```
Potom `browser_navigate http://localhost:8123/kucharka.html` + `browser_evaluate` (snippet zo Step 1).
Expected: všetky `ok_*` = `true`.

- [ ] **Step 6: Commit**

```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(gen): stav dayPpl/slotPpl/daySloty + helpery slotyDna/pocetPorciiDna/porcieSlot/masoTyp"
```

---

## Task 2: Porcie do mnozMult (napojenie na nákup + varenie)

**Files:**
- Modify: `data/app.js` — `mnozMult` (~riadok 356)

**Interfaces:**
- Consumes: `porcieSlot(di,slot)` (Task 1).
- Produces: `mnozMult(di,slot)` teraz zohľadňuje per-deň/per-slot porcie; `nakupPolozky`, `porcieNaVar` to dedia automaticky (už volajú `mnozMult`).

- [ ] **Step 1: Napíš failing test**

Snippet (po reload; teraz musí zlyhať, lebo `mnozMult` ešte používa `pocetPorcii`):
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.stravnici=[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]; S.profil.osoby=2;
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"];
  S.blokMode=false;
  const base = mnozMult(0,"Obed");
  S.dayPpl[0]=4;
  const den4 = mnozMult(0,"Obed");
  S.slotPpl[0]={Obed:6};
  const slot6 = mnozMult(0,"Obed");
  const vecera4 = mnozMult(0,"Večera"); // slotPpl len pre Obed → deň = 4
  return {
    base, den4, slot6, vecera4,
    ok_denNasobok: Math.abs(den4 - base*2) < 0.01,   // 4 osoby = 2× oproti 2
    ok_slotPrednost: Math.abs(slot6 - base*3) < 0.01, // 6 = 3× base
    ok_veceraDen: Math.abs(vecera4 - base*2) < 0.01
  };
}
```
Expected: `ok_denNasobok=false` (mnozMult ignoruje dayPpl).

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_evaluate` (snippet vyššie). Expected: `ok_denNasobok=false`.

- [ ] **Step 3: Uprav mnozMult**

Nájdi:
```js
function mnozMult(di,slot){ return pocetPorcii(di)*pf(di,slot); }
```
Nahraď za:
```js
function mnozMult(di,slot){ return porcieSlot(di,slot)*pf(di,slot); }
```

- [ ] **Step 4: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, `browser_evaluate` (Step 1).
Expected: `ok_denNasobok`, `ok_slotPrednost`, `ok_veceraDen` = `true`.

- [ ] **Step 5: Over dopad na nákup (regresný check)**

Snippet:
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={}; S.profil.sloty=["Raňajky","Obed","Večera","Snack"];
  S.blokMode=false; generujJedalnicek(true);
  const pred = nakupItems().length;
  S.dayPpl[0]=6; // viac porcií deň 0
  const po = nakupItems().length;
  return { ok_nakupFunguje: po>0 && pred>0 }; // nespadne, položky existujú
}
```
Expected: `ok_nakupFunguje=true`.

- [ ] **Step 6: Commit**

```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(gen): mnozMult zohľadňuje per-deň/per-slot porcie (nákup+varenie dedia)"
```

---

## Task 3: Maska jedál vo výpočtoch a generátore

**Files:**
- Modify: `data/app.js` — `baseDayKcal` (~354), `planItems` (~360), `generujJedalnicek` (~511), `renderDnesPlan` (~695), `renderVyziva` (~747), `ukazDenVyzivu` (~742), `planVarenia` (~949)

**Interfaces:**
- Consumes: `slotyDna(di)` (Task 1).
- Produces: výpočty a generátor iterujú sloty per deň cez `slotyDna(di)`; slot mimo masky sa negeneruje a neráta.

- [ ] **Step 1: Napíš failing test**

Snippet (po reload; teraz zlyhá, lebo generátor plní všetky globálne sloty):
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"]; S.blokMode=false;
  S.daySloty[0]=["Obed","Večera"];      // deň 0 bez raňajok/snacku
  S.daySloty[3]=[];                      // deň 3 celý von
  S.genCfg={zachovat:false,cielMode:true,filtre:[]}; S.uvarene=[];
  generujJedalnicek(true);
  const den0Ranajky = slotIds(0,"Raňajky").length;
  const den0Obed = slotIds(0,"Obed").length;
  const den3any = ["Raňajky","Obed","Večera","Snack"].reduce((a,s)=>a+slotIds(3,s).length,0);
  const den3kcal = baseDayKcal(3);
  return {
    ok_maskaRanajkyPrazdne: den0Ranajky===0,
    ok_maskaObedPlny: den0Obed>0,
    ok_denVonPrazdny: den3any===0,
    ok_denVonKcal0: den3kcal===0
  };
}
```
Expected: `ok_maskaRanajkyPrazdne=false` (generátor naplní raňajky).

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_evaluate` (vyššie). Expected: `ok_maskaRanajkyPrazdne=false`.

- [ ] **Step 3: Uprav generátor**

V `generujJedalnicek` nájdi:
```js
  const pouzite=new Set(), pouziteBazy=new Set(), nedavne=new Set(S.uvarene.slice(0,4).map(u=>u.id)), plan={}, planF={}, sloty=SLOTY();
```
Nahraď `sloty=SLOTY()` tak, aby sa sloty brali per blok. Zmeň riadok na:
```js
  const pouzite=new Set(), pouziteBazy=new Set(), nedavne=new Set(S.uvarene.slice(0,4).map(u=>u.id)), plan={}, planF={};
```
Potom vnútri `skupiny.forEach(dni=>{` nájdi začiatok tela (riadok `const kf=filterKuchynaPreDen(dni[0]);`) a hneď PRED `const denPlan={}, dayKuchyne=new Set();` vlož:
```js
    const sloty=slotyDna(dni[0]);
```
Poznámka: `sloty` sa v tele bloku už používa (`sloty.forEach`, `if(zachovat){ sloty.forEach... }`) — týmto je teraz per-blok. Skontroluj, že všetky výskyty `sloty` v tele `skupiny.forEach` sú po tomto priradení (sú — telo začína práve tu).

Na konci bloku nájdi:
```js
    dni.forEach(di=>{ plan[di]={}; sloty.forEach(s2=>{ if(denPlan[s2])plan[di][s2]=denPlan[s2].slice(); }); planF[di]={}; if(fac!==1) sloty.forEach(s2=>{ if(denPlan[s2])planF[di][s2]=fac; }); });
```
Toto ostáva (používa lokálne `sloty`). OK.

- [ ] **Step 4: Uprav baseDayKcal**

Nájdi:
```js
function baseDayKcal(di){ let s=0; SLOTY().forEach(sl=>slotIds(di,sl).forEach(cid=>{const k=komponent(cid); if(k)s+=kcalPorcia(k);})); return s; }
```
Nahraď `SLOTY()` za `slotyDna(di)`:
```js
function baseDayKcal(di){ let s=0; slotyDna(di).forEach(sl=>slotIds(di,sl).forEach(cid=>{const k=komponent(cid); if(k)s+=kcalPorcia(k);})); return s; }
```

- [ ] **Step 5: Uprav planItems**

Nájdi:
```js
function planItems(){ const out=[]; for(let di=0;di<7;di++){ SLOTY().forEach(sl=>{ slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)out.push({r,di,slot:sl,f:pf(di,sl)}); }); }); } return out; }
```
Nahraď `SLOTY()` za `slotyDna(di)`:
```js
function planItems(){ const out=[]; for(let di=0;di<7;di++){ slotyDna(di).forEach(sl=>{ slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(r)out.push({r,di,slot:sl,f:pf(di,sl)}); }); }); } return out; }
```

- [ ] **Step 6: Uprav renderDnesPlan, renderVyziva, ukazDenVyzivu, planVarenia**

V `renderDnesPlan` nájdi `SLOTY().forEach(sl=>{ const ids=slotIds(di,sl);` a nahraď `SLOTY()` za `slotyDna(di)`.

V `renderVyziva` nájdi (vnútri `for(let di=0;di<7;di++)`):
```js
SLOTY().forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r){const v=vyzivaReceptu(r); kc+=v.kcal*f;
```
a nahraď `SLOTY()` za `slotyDna(di)`.

V `ukazDenVyzivu(di)` nájdi `SLOTY().forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{ const r=komponent(cid); if(!r)return; any=true;` a nahraď `SLOTY()` za `slotyDna(di)`.

V `planVarenia(di)` nájdi `SLOTY().forEach(sl=>{ const ids=slotIds(dni[0],sl); if(!ids.length)return;` a nahraď `SLOTY()` za `slotyDna(dni[0])`.

- [ ] **Step 7: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, `browser_evaluate` (Step 1).
Expected: `ok_maskaRanajkyPrazdne`, `ok_maskaObedPlny`, `ok_denVonPrazdny`, `ok_denVonKcal0` = `true`.

- [ ] **Step 8: Regresný test (opakované generovanie nedoplní masku)**

Snippet:
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"]; S.blokMode=false;
  S.daySloty[0]=["Obed","Večera"]; S.genCfg={zachovat:false,cielMode:true,filtre:[]}; S.uvarene=[];
  let stale=true;
  for(let n=0;n<10;n++){ generujJedalnicek(true); if(slotIds(0,"Raňajky").length){stale=false;break;} }
  return { ok_maskaStabilna: stale };
}
```
Expected: `ok_maskaStabilna=true`.

- [ ] **Step 9: Commit**

```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(gen): maska jedál (slotyDna) v generátore a výpočtoch — vynechať jedlo/deň"
```

---

## Task 4: renderPlan — sivé „vyp." bunky pre maskované jedlá

**Files:**
- Modify: `data/app.js` — `renderPlan` (~376-401)
- Modify: `data/sablona.html` — CSS trieda `.vyp`

**Interfaces:**
- Consumes: `slotyDna(di)` (Task 1).
- Produces: bunky slotov mimo masky sa vykreslia ako sivé „vyp." (needitovateľné); denná Σ ráta cez `slotyDna(di)`.

- [ ] **Step 1: Napíš failing test**

Snippet (po reload; teraz zlyhá — bunka sa vykreslí ako „+ pridať", nie „vyp."):
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"]; S.blokMode=false;
  S.daySloty[0]=["Obed","Večera"]; S.plan={}; S.planF={};
  prepni("planovac"); renderPlan();
  const html=document.getElementById("plan-table").innerHTML;
  return { ok_maVyp: html.includes("vyp") };
}
```
Expected: `ok_maVyp=false`.

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_evaluate` (vyššie). Expected: `ok_maVyp=false`.

- [ ] **Step 3: Uprav renderPlan — riadok slotov**

V `renderPlan` nájdi celý blok vykresľovania bunky (začína `SLOTY().forEach(slot=>{`):
```js
  SLOTY().forEach(slot=>{
    h+=`<tr><td class="slotname">${slot}</td>`;
    DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);
      if(ids.length){ let kc=0;
```
Vlož vetvu pre maskovaný slot: hneď po `DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);` vlož podmienku:
```js
      if(slotyDna(di).indexOf(slot)<0){ h+=`<td style="${tint(di)}"><div class="plan-cell vyp">vyp.</div></td>`; return; }
```
Výsledok (kontext):
```js
    DNI.forEach((d,di)=>{ const ids=slotIds(di,slot); const f=pf(di,slot);
      if(slotyDna(di).indexOf(slot)<0){ h+=`<td style="${tint(di)}"><div class="plan-cell vyp">vyp.</div></td>`; return; }
      if(ids.length){ let kc=0;
```

- [ ] **Step 4: Uprav dennú Σ v renderPlan**

Nájdi:
```js
  DNI.forEach((d,di)=>{ let sum=0; SLOTY().forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); sum=Math.round(sum);
```
Nahraď `SLOTY()` za `slotyDna(di)`:
```js
  DNI.forEach((d,di)=>{ let sum=0; slotyDna(di).forEach(sl=>{ const f=pf(di,sl); slotIds(di,sl).forEach(cid=>{const r=komponent(cid); if(r)sum+=kcalPorcia(r)*f;}); }); sum=Math.round(sum);
```

- [ ] **Step 5: Pridaj CSS**

V `data/sablona.html` nájdi definíciu `.plan-cell.prazdne` (alebo `.prazdne`). Hneď za ňu pridaj:
```css
.plan-cell.vyp{color:var(--muted);background:repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(0,0,0,.03) 6px,rgba(0,0,0,.03) 12px);text-align:center;font-size:12px;opacity:.6;cursor:default;min-height:32px;display:flex;align-items:center;justify-content:center}
body.dark .plan-cell.vyp{background:repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(255,255,255,.04) 6px,rgba(255,255,255,.04) 12px)}
```

- [ ] **Step 6: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, `browser_evaluate` (Step 1).
Expected: `ok_maVyp=true`.

- [ ] **Step 7: Vizuálna kontrola**

`browser_evaluate`: `() => { S.daySloty={0:["Obed","Večera"],3:[]}; prepni("planovac"); renderPlan(); return "ok"; }`
Potom `browser_take_screenshot` (fullPage) a skontroluj: deň 0 má raňajky/snack sivé „vyp.", deň 3 celý sivý.

- [ ] **Step 8: Commit**

```
git add data/app.js data/sablona.html kucharka.html docs/index.html
git commit -m "feat(plan): sivé 'vyp.' bunky pre maskované jedlá v mriežke"
```

---

## Task 5: Filtre generátora (bezmäso, strop času, nie 2× mäso za sebou)

**Files:**
- Modify: `data/app.js` — `generujJedalnicek` (~511-538)

**Interfaces:**
- Consumes: `masoTyp(r)` (Task 1), `diety(r)`, `casMin(r)` (existujúce).
- Produces: generátor rešpektuje `genCfg.filtre[i].veg`, `genCfg.filtre[i].maxCas`, `genCfg.neMasoZaSebou`. Nový helper `pravidloPreDen(di) -> {veg?,maxCas?} | null`.

- [ ] **Step 1: Napíš failing test**

Snippet (po reload; teraz zlyhá — filtre veg/maxCas/neMasoZaSebou neexistujú):
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"]; S.blokMode=true; S.uvarene=[];
  // veg + maxCas pre celý týždeň
  S.genCfg={zachovat:false,cielMode:true,filtre:[{od:0,do:6,veg:true,maxCas:30}], neMasoZaSebou:true};
  generujJedalnicek(true);
  const items=planItems();
  const mainy=items.filter(x=>isMain(x.r));
  const nonVeg=mainy.filter(x=>!diety(x.r).veg).length;
  const nadCas=items.filter(x=>casMin(x.r)>30 && casMin(x.r)!==999).length;
  return {
    ok_vegRozsah: nonVeg===0,
    ok_casStrop: nadCas===0
  };
}
```
Expected: `ok_vegRozsah=false` (veg filter neexistuje).

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_evaluate` (vyššie). Expected: `ok_vegRozsah=false`.

- [ ] **Step 3: Pridaj helper pravidloPreDen**

V `data/app.js` nájdi:
```js
function filterKuchynaPreDen(di){ const f=(S.genCfg.filtre||[]).find(x=>di>=x.od&&di<=x.do&&x.kuchyna); return f?f.kuchyna:null; }
```
Pridaj hneď ZA tento riadok:
```js
function pravidloPreDen(di){ const f=(S.genCfg.filtre||[]).find(x=>di>=x.od&&di<=x.do&&(x.veg||x.maxCas>0)); return f||null; }
```

- [ ] **Step 4: Aplikuj veg + maxCas v generátore**

V `generujJedalnicek` nájdi vnútri `skupiny.forEach(dni=>{` riadok:
```js
    const kf=filterKuchynaPreDen(dni[0]);
```
Pridaj hneď ZA:
```js
    const pr=pravidloPreDen(dni[0]);
```
Potom nájdi v tele slotu (`sloty.forEach(slot=>{ ... `) blok, kde sa skladá pool:
```js
      let pool=poolPreSlot(slot).filter(r=>!nedavne.has(r.id)); if(!pool.length)pool=poolPreSlot(slot);
      if(kf && slot!=="Raňajky"){ const pk=pool.filter(r=>(r.kuchyna||"").toLowerCase()===kf.toLowerCase()); if(pk.length)pool=pk; }
```
Pridaj hneď ZA druhý riadok (mäkké filtre — ak vyprázdnia, uvoľnia):
```js
      if(pr&&pr.veg){ const pv=pool.filter(r=>diety(r).veg); if(pv.length)pool=pv; }
      if(pr&&pr.maxCas>0){ const pc=pool.filter(r=>casMin(r)<=pr.maxCas); if(pc.length)pool=pc; }
```

- [ ] **Step 5: Aplikuj „nie 2× mäso za sebou"**

V `generujJedalnicek` nájdi deklaráciu pred `skupiny.forEach`:
```js
  let prilRot=0;
```
Pridaj hneď ZA:
```js
  let prevBlokMaso=new Set();
```
Vnútri `skupiny.forEach(dni=>{`, hneď za `const pr=pravidloPreDen(dni[0]);` (z kroku 4) pridaj:
```js
    const blokMaso=new Set();
```
Potom v tele slotu, za veg/maxCas filtre (Step 4), pridaj mäso-pestrosť pre hlavné sloty:
```js
      if(S.genCfg.neMasoZaSebou && jeHlavnyChodSlot(slot) && prevBlokMaso.size){ const pm=pool.filter(r=>{const mt=masoTyp(r); return !mt||!prevBlokMaso.has(mt);}); if(pm.length)pool=pm; }
```
Nájdi kde sa vybraný recept zapisuje (`const r=vyberVazene(pool,pouzite); if(r){ let comp=[r.id]; pouzite.add(r.id);`) a hneď za `pouzite.add(r.id);` pridaj:
```js
        { const mt=masoTyp(r); if(mt)blokMaso.add(mt); }
```
Na koniec tela `skupiny.forEach(dni=>{` (za `dni.forEach(di=>{ plan[di]={}; ... });`, teda tesne pred zatváraciu `});` bloku forEach) pridaj:
```js
    prevBlokMaso=blokMaso;
```

- [ ] **Step 6: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, `browser_evaluate` (Step 1).
Expected: `ok_vegRozsah=true`, `ok_casStrop=true`.

- [ ] **Step 7: Test „nie 2× mäso za sebou" + regresia**

Snippet:
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={};
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"]; S.blokMode=true; S.uvarene=[];
  S.profil.lepok=false;S.profil.mlieko=false;S.profil.ryby=false;S.profil.zakazane="";
  S.genCfg={zachovat:false,cielMode:true,filtre:[], neMasoZaSebou:true};
  let porusenia=0, behov=15;
  for(let n=0;n<behov;n++){ generujJedalnicek(true);
    const bl=bloky(); let prev=null;
    for(const b of bl){ const di=b[0]; const masaBloku=new Set();
      ["Obed","Večera"].forEach(sl=>slotIds(di,sl).forEach(id=>{const k=komponent(id); if(k){const mt=masoTyp(k); if(mt)masaBloku.add(mt);}}));
      if(prev){ for(const m of masaBloku) if(prev.has(m)){ porusenia++; } }
      prev=masaBloku; }
  }
  // mäkké pravidlo — malé % porušení OK keď pool nedovolí; hlavne že to beží a väčšinou drží
  return { ok_vacsinouDrzi: porusenia <= behov, porusenia, behov };
}
```
Expected: `ok_vacsinouDrzi=true`.

- [ ] **Step 8: Commit**

```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(gen): filtre bezmäso + strop času (per-rozsah) + nie 2x mäso za sebou"
```

---

## Task 6: UI — control-riadok v mriežke (porcie + maska)

**Files:**
- Modify: `data/app.js` — `renderPlan` / `renderBlokEditor` (~369-401), nové funkcie pre stepper/chip/override
- Modify: `data/sablona.html` — CSS control-riadka

**Interfaces:**
- Consumes: `slotyDna`, `pocetPorciiDna`, `blokDni`, `save`, `renderPlan` (existujúce/Task 1).
- Produces: funkcie `zmenDenPpl(di,delta)`, `toggleDenSlot(di,slot)`, `upravSlotPorcie(di,slot)` — zapisujú do `S.dayPpl`/`S.daySloty`/`S.slotPpl` (per blok v blokovom režime) a volajú `renderPlan`.

- [ ] **Step 1: Napíš failing test (setter funkcie)**

Snippet (po reload; zlyhá — funkcie neexistujú):
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={}; S.blokMode=false;
  S.profil.sloty=["Raňajky","Obed","Večera","Snack"];
  zmenDenPpl(0, 2); // z default (2) na... nastaví absolútnu bázu +2? konvencia: +delta od aktuálnej
  const ppl = S.dayPpl[0];
  toggleDenSlot(0,"Raňajky"); // vypni
  const maska = slotyDna(0);
  toggleDenSlot(0,"Raňajky"); // zapni späť
  const maska2 = slotyDna(0);
  return {
    ok_ppl: ppl>0,
    ok_vypni: maska.indexOf("Raňajky")<0,
    ok_zapni: maska2.indexOf("Raňajky")>=0
  };
}
```
Expected: ReferenceError `zmenDenPpl is not defined`.

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_evaluate` (vyššie). Expected: ReferenceError.

- [ ] **Step 3: Pridaj setter funkcie**

V `data/app.js` nájdi `function toggleHranica(i){` a pridaj PRED ňu:
```js
function denyBloku(di){ return S.blokMode?blokDni(di):[di]; }
function zmenDenPpl(di,delta){ const dni=denyBloku(di); const cur=(S.dayPpl[di]!=null)?S.dayPpl[di]:Math.max(1,Math.round(pocetPorcii(di))); const nova=Math.max(1,cur+delta); dni.forEach(d=>{ S.dayPpl[d]=nova; }); save(); renderPlan(); }
function toggleDenSlot(di,slot){ const dni=denyBloku(di); const akt=slotyDna(di).slice(); const i=akt.indexOf(slot); if(i>=0)akt.splice(i,1); else { akt.push(slot); akt.sort((a,b)=>VSETKY_SLOTY.indexOf(a)-VSETKY_SLOTY.indexOf(b)); } dni.forEach(d=>{ S.daySloty[d]=akt.slice(); }); save(); renderPlan(); }
function upravSlotPorcie(di,slot){ const cur=Math.round(porcieSlot(di,slot)); const v=prompt("Počet porcií pre toto jedlo (prázdne = podľa dňa):",cur); if(v===null)return; const dni=denyBloku(di); if(v.trim()===""){ dni.forEach(d=>{ if(S.slotPpl[d])delete S.slotPpl[d][slot]; }); } else { const n=Math.max(1,parseInt(v)||cur); dni.forEach(d=>{ S.slotPpl[d]=S.slotPpl[d]||{}; S.slotPpl[d][slot]=n; }); } save(); renderPlan(); }
```

- [ ] **Step 4: Pridaj control-riadok do renderPlan**

V `renderPlan` nájdi hlavičku dní:
```js
  h+="<tr><th>Jedlo</th>"; DNI.forEach((d,di)=>h+=`<th>${d.slice(0,3)}</th>`); h+="</tr>";
```
Pridaj PRED tento riadok blok, čo vykreslí control-riadok (porcie + chips masky) per stĺpec dňa:
```js
  h+='<tr class="ctrl-row"><td class="slotname" style="background:#fff;border:none"></td>';
  DNI.forEach((d,di)=>{ const ppl=Math.max(1,Math.round(pocetPorciiDna(di))); const custom=(S.dayPpl[di]!=null);
    const chips=SLOTY().map(s=>{ const on=slotyDna(di).indexOf(s)>=0; return `<span class="mchip${on?' on':''}" title="${s}" onclick="toggleDenSlot(${di},'${s}')">${ikony[s]||s[0]}</span>`; }).join("");
    h+=`<td class="ctrl"><div class="ppl"><button onclick="zmenDenPpl(${di},-1)">−</button><span class="pplnum${custom?' cust':''}" title="Počet porcií">👥 ${ppl}</span><button onclick="zmenDenPpl(${di},1)">+</button></div><div class="mchips">${chips}</div></td>`;
  });
  h+="</tr>";
```

- [ ] **Step 5: Pridaj per-slot override do bunky**

V `renderPlan` v naplnenej bunke nájdi span s „✎ zmeniť / + doplnok / 🎲 znova":
```js
<span class="rm" style="color:var(--accent)" onclick="regenerujSlot(${di},'${slot}')" title="Vygenerovať znova len toto jedlo">🎲 znova</span></span>
```
Za `🎲 znova</span>` (pred zatváracie `</span>` skupiny) pridaj:
```js
<span class="rm" style="color:var(--accent)" onclick="upravSlotPorcie(${di},'${slot}')" title="Počet porcií pre toto jedlo">👥 porcie</span>
```

- [ ] **Step 6: Pridaj CSS control-riadka**

V `data/sablona.html` za CSS `.plan-cell.vyp` (z Task 4) pridaj:
```css
.ctrl-row td.ctrl{padding:4px;text-align:center;vertical-align:top}
.ctrl-row .ppl{display:flex;gap:4px;align-items:center;justify-content:center;margin-bottom:4px}
.ctrl-row .ppl button{width:22px;height:22px;border:1px solid var(--line);background:var(--card);border-radius:6px;cursor:pointer;font-size:14px;line-height:1}
.ctrl-row .pplnum{font-size:12px;min-width:34px}
.ctrl-row .pplnum.cust{font-weight:700;color:var(--accent-dark)}
.ctrl-row .mchips{display:flex;gap:3px;justify-content:center;flex-wrap:wrap}
.mchip{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;font-size:13px;background:var(--line);opacity:.35;filter:grayscale(1);user-select:none}
.mchip.on{opacity:1;filter:none;background:var(--accent-light,#e8f1eb)}
```

- [ ] **Step 7: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, `browser_evaluate` (Step 1).
Expected: `ok_ppl`, `ok_vypni`, `ok_zapni` = `true`.

- [ ] **Step 8: Vizuálna kontrola**

`browser_evaluate`: `() => { S.dayPpl={}; S.daySloty={}; prepni("planovac"); renderPlan(); return "ok"; }`
`browser_take_screenshot` (fullPage) — over: nad mriežkou je riadok s `👥 N` stepperom a chip-mi jedál pre každý deň; klik na chip vypne jedlo (sivé).

- [ ] **Step 9: Commit**

```
git add data/app.js data/sablona.html kucharka.html docs/index.html
git commit -m "feat(plan): control-riadok — počet porcií (deň/blok) + maska jedál + per-jedlo porcie"
```

---

## Task 7: UI — gen-config okno (veg/čas per rozsah + switch mäso)

**Files:**
- Modify: `data/app.js` — `otvorGenConfig` (~543-557), `pridajGenFilter` (~558-560)

**Interfaces:**
- Consumes: `S.genCfg.filtre`, `S.genCfg.neMasoZaSebou`, `kuchyneList`, `save`, `otvorGenConfig` (existujúce).
- Produces: gen-config okno umožní pri pravidle nastaviť kuchyňu + ☐ bezmäso + „do N min"; globálny switch „nie 2× mäso za sebou".

- [ ] **Step 1: Napíš failing test**

Snippet (po reload; zlyhá — pridajGenFilter nečíta veg/maxCas z DOM, switch neexistuje):
```js
() => {
  S.genCfg={zachovat:false,cielMode:true,filtre:[]};
  otvorGenConfig();
  const maSwitch = !!document.querySelector('input[data-gen="nemaso"]') || document.getElementById("pick-modal").innerHTML.includes("mäso v dvoch blokoch");
  const maVeg = document.getElementById("pick-modal").innerHTML.includes("bezmäso") || !!document.getElementById("gf-veg");
  const maCas = !!document.getElementById("gf-cas");
  zavriPick();
  return { ok_switch: maSwitch, ok_veg: maVeg, ok_cas: maCas };
}
```
Expected: `ok_switch=false` (alebo `ok_veg=false`).

- [ ] **Step 2: Over že test zlyhá**

Run: `browser_evaluate` (vyššie). Expected: aspoň jeden `ok_*=false`.

- [ ] **Step 3: Rozšír otvorGenConfig — riadok pravidla + switch**

V `otvorGenConfig` nájdi zoznam pravidiel (premenná `fh`):
```js
  const fh=(cfg.filtre||[]).map((f,i)=>`<div class="sp-row"><span>${dni[f.od]}–${dni[f.do]}: <b>${f.kuchyna}</b></span><a onclick="zmazGenFilter(${i})" style="color:var(--warn);cursor:pointer">✕</a></div>`).join("")||'<p class="info">Zatiaľ žiadne filtre.</p>';
```
Nahraď za (zobrazí všetky podmienky pravidla):
```js
  const popisPr=f=>[f.kuchyna,(f.veg?"bezmäso":""),(f.maxCas>0?("do "+f.maxCas+" min"):"")].filter(Boolean).join(" · ")||"(bez podmienky)";
  const fh=(cfg.filtre||[]).map((f,i)=>`<div class="sp-row"><span>${dni[f.od]}–${dni[f.do]}: <b>${popisPr(f)}</b></span><a onclick="zmazGenFilter(${i})" style="color:var(--warn);cursor:pointer">✕</a></div>`).join("")||'<p class="info">Zatiaľ žiadne pravidlá.</p>';
```
Potom nájdi ovládanie na pridanie pravidla:
```js
    <div class="controls" style="align-items:center">
      <select class="f" id="gf-od">${denOpts(0)}</select><span>–</span><select class="f" id="gf-do">${denOpts(6)}</select>
      <select class="f" id="gf-kuch">${kuch.map(k=>`<option>${k}</option>`).join("")}</select>
      <button class="btn" onclick="pridajGenFilter()">+ Pridať</button></div>
```
Nahraď za (kuchyňa má prázdnu voľbu + veg checkbox + čas):
```js
    <div class="controls" style="align-items:center;flex-wrap:wrap">
      <select class="f" id="gf-od">${denOpts(0)}</select><span>–</span><select class="f" id="gf-do">${denOpts(6)}</select>
      <select class="f" id="gf-kuch"><option value="">(kuchyňa: ľubovoľná)</option>${kuch.map(k=>`<option>${k}</option>`).join("")}</select>
      <label class="switch" style="margin:0"><input type="checkbox" id="gf-veg"> bezmäso</label>
      <input type="number" id="gf-cas" placeholder="do min" style="width:80px;padding:8px;border:1px solid var(--line);border-radius:8px">
      <button class="btn" onclick="pridajGenFilter()">+ Pridať pravidlo</button></div>
```
Nájdi switch sekciu (za `cielMode` label) — nájdi:
```js
    <label class="switch"><input type="checkbox" ${cfg.cielMode?"checked":""} onchange="S.genCfg.cielMode=this.checked;save()"> Dorovnať dni na cieľ ${S.profil.kcal} kcal (upraví veľkosť porcií)</label>
```
Pridaj hneď ZA tento riadok:
```js
    <label class="switch"><input type="checkbox" data-gen="nemaso" ${cfg.neMasoZaSebou?"checked":""} onchange="S.genCfg.neMasoZaSebou=this.checked;save()"> Nevariť rovnaké mäso v dvoch blokoch po sebe</label>
```

- [ ] **Step 4: Rozšír pridajGenFilter**

Nájdi:
```js
function pridajGenFilter(){ const od=parseInt(document.getElementById("gf-od").value)||0, doo=parseInt(document.getElementById("gf-do").value)||0, kuchyna=document.getElementById("gf-kuch").value;
  if(doo<od){ alert("Koniec rozsahu je pred začiatkom."); return; } if(!kuchyna){ alert("Vyber kuchyňu."); return; }
  S.genCfg.filtre.push({od,do:doo,kuchyna}); save(); otvorGenConfig(); }
```
Nahraď za (kuchyňa voliteľná; musí byť aspoň jedna podmienka):
```js
function pridajGenFilter(){ const od=parseInt(document.getElementById("gf-od").value)||0, doo=parseInt(document.getElementById("gf-do").value)||0, kuchyna=document.getElementById("gf-kuch").value, veg=document.getElementById("gf-veg").checked, maxCas=parseInt(document.getElementById("gf-cas").value)||0;
  if(doo<od){ alert("Koniec rozsahu je pred začiatkom."); return; }
  if(!kuchyna && !veg && !(maxCas>0)){ alert("Nastav aspoň jednu podmienku (kuchyňa, bezmäso alebo čas)."); return; }
  const pr={od,do:doo}; if(kuchyna)pr.kuchyna=kuchyna; if(veg)pr.veg=true; if(maxCas>0)pr.maxCas=maxCas;
  S.genCfg.filtre.push(pr); save(); otvorGenConfig(); }
```

- [ ] **Step 5: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, `browser_evaluate` (Step 1).
Expected: `ok_switch`, `ok_veg`, `ok_cas` = `true`.

- [ ] **Step 6: End-to-end test (pravidlo z UI ovplyvní generovanie)**

Snippet:
```js
() => {
  S.dayPpl={}; S.slotPpl={}; S.daySloty={}; S.profil.sloty=["Raňajky","Obed","Večera","Snack"];
  S.blokMode=true; S.uvarene=[];
  S.genCfg={zachovat:false,cielMode:true,filtre:[{od:0,do:6,veg:true}], neMasoZaSebou:false};
  generujJedalnicek(true);
  const nonVeg=planItems().filter(x=>isMain(x.r)&&!diety(x.r).veg).length;
  return { ok_e2e: nonVeg===0 };
}
```
Expected: `ok_e2e=true`.

- [ ] **Step 7: Commit**

```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(gen): gen-config UI — veg/čas per pravidlo + switch nie 2x mäso za sebou"
```

---

## Záverečná verifikácia (po Task 7)

- [ ] **Full regresný beh:** `browser_evaluate` — 30 behov `generujJedalnicek(true)` s default profilom; over invarianty: žiadny nechcený prázdny slot (mimo masky), žiadne opakovanie naprieč blokmi, obed≥večera, kcal deň v ±10 % keď `cielMode`. Rovnaký harness ako pri úvodnom audite.
- [ ] **Vizuálna kontrola** všetkých modulov (Domov, Plán, Nákup, Výživa, Špajza) — nič sa nerozbilo, control-riadok a „vyp." bunky sedia v light aj dark režime.
- [ ] **Aktualizuj `CHANGELOG.md`** stručným záznamom (verzia, dátum, 3 nové funkcie + 2 fixy B1/B2).
- [ ] **Zváž bump `VERZIA`** v `data/app.js` (v15 → v16) ak sa vydáva.

## Self-review poznámky (autor plánu)

- Spec coverage: porcie (Task 2,6), maska (Task 3,4,6), veg/čas/mäso filtre (Task 5,7), kuchyňa (existuje, Task 7 nechal voliteľnú), UI hybrid (Task 6 mriežka + Task 7 gen-config), testy (každý task + záver). Sivé „vyp." (Task 4). Spätná kompat. (Task 1 init). ✔
- B1/B2 fixy (Dávka 1) sú už aplikované v `data/app.js` (necommitnuté) — prvý commit v Task 1 ich zahrnie spolu s Task 1 zmenami (rovnaký súbor). To je OK, sú súvisiace (generátor/plán). Ak chce executor čistú separáciu, môže ich commitnúť zvlášť pred Task 1.
- Typy konzistentné: `slotyDna`/`pocetPorciiDna`/`porcieSlot`/`masoTyp` použité rovnako naprieč Task 2–7. `zmenDenPpl`/`toggleDenSlot`/`upravSlotPorcie`/`denyBloku`/`pravidloPreDen` definované v Task 5/6, použité v UI. Žiadny mŕtvy kód.
