# Vylepšenia receptov a nákupu (Dávka 3) — Implementačný plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development alebo superpowers:executing-plans. Kroky používajú checkbox (`- [ ]`).

**Goal:** Pridať health indikátor na recepty (farebná bodka na karte, skóre+krúžok v detaile), fixnú sadu auto-kolekcií v Recepty a množstvo suroviny na recept v `surovinaInfo`.

**Architecture:** Vanilla JS single-file. Zdroje `data/app.js` + `data/sablona.html` → build `python generuj_kucharku.py` → `kucharka.html`. Všetko derived z existujúcich funkcií (`vyzivaReceptu`, `kcalPorcia`, `casMin`, `cenaPorcia`, `jeSezonne`, `S.fav`), žiadny nový perzistentný stav.

**Tech Stack:** Vanilla JS (ES2017), žiadny framework. Testy = Playwright MCP `browser_evaluate` proti `http://localhost:8123/kucharka.html`.

## Global Constraints

- `data/app.js` NESMIE obsahovať literál `</script>`.
- Po zmene `data/app.js`/`data/sablona.html` spustiť `py generuj_kucharku.py`. `kucharka.html` sa needituje ručne.
- Žiadny nový perzistentný stav v `S` (health/kolekcie sú derived/runtime) → žiadny dopad na sync/účty.
- Offline single-file, žiadne CDN/závislosti.
- Commit explicitnými cestami (`git add data/app.js data/sablona.html kucharka.html docs/index.html`), NIE `git add -A`.
- Farby skóre: green `#2e7d54`, amber `#e0a800`, red `#c0392b`.

## Testovací cyklus (referencovaný z úloh)

Server: ak nebeží, `py -m http.server 8123` v roote (background). Po zmene zdrojov vždy:
```
node --check data/app.js
py generuj_kucharku.py
```
Potom `browser_navigate http://localhost:8123/kucharka.html` + `browser_evaluate` s assert-snippetom. Konvencia: kľúče `ok_*` musia byť `true`.

---

## Task 1: Helpery healthScore + podielCiela

**Files:**
- Modify: `data/app.js` — za `cenaPorcia` (funkcia blízko `vyzivaReceptu`, ~riadok 80)

**Interfaces:**
- Consumes: `vyzivaReceptu(r)`, `kcalPorcia(r)`, `S.profil.kcal` (existujúce).
- Produces:
  - `healthScore(r) -> { p100:number, farba:"green"|"amber"|"red" }` — `p100` = g bielkovín/100 kcal (0 ak kcal≤5).
  - `podielCiela(r) -> number` — kcalPorcia/cieľ, orezané [0,1].

- [ ] **Step 1: Napíš failing test**

```js
() => {
  const out={};
  out.ok_exist = typeof healthScore==="function" && typeof podielCiela==="function";
  return out;
}
```
Expected: `ok_exist` = undefined/false (ReferenceError chytený? nie — typeof je bezpečné → `ok_exist:false`).

- [ ] **Step 2: Over že test zlyhá**

Run `browser_evaluate` (vyššie). Expected: `ok_exist:false`.

- [ ] **Step 3: Nájdi kotvu a pridaj helpery**

V `data/app.js` nájdi:
```js
function cenaPorcia(r){ return vyzivaReceptu(r).cena; }
```
Pridaj hneď ZA tento riadok:
```js
const HS_HI=10, HS_LO=5; // g bielkovín na 100 kcal: ≥HI green, ≥LO amber, inak red (laditeľné)
function healthScore(r){ const v=vyzivaReceptu(r); if(!(v.kcal>5)) return {p100:0,farba:"red"};
  const p100=v.b/(v.kcal/100); return {p100:p100, farba: p100>=HS_HI?"green":(p100>=HS_LO?"amber":"red")}; }
function podielCiela(r){ const ciel=S.profil.kcal||0; if(!(ciel>0)) return 0; return Math.max(0,Math.min(1, kcalPorcia(r)/ciel)); }
```

- [ ] **Step 4: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, potom:
```js
() => {
  const out={};
  out.ok_exist = typeof healthScore==="function" && typeof podielCiela==="function";
  // vysoký proteín (kuracie) → green; dezert → red
  const kur=RECEPTY.find(r=>/kuracie prsia|kuracie mäso/i.test((r.ingrediencie||[]).map(i=>i.nazov).join(" ")));
  const dez=RECEPTY.find(r=>r.kategoria==="Dezert");
  out.ok_kurGreen = kur? healthScore(kur).p100>0 : true;
  out.ok_dezertNizke = dez? healthScore(dez).farba!=="green" : true;
  // podielCiela v [0,1]
  S.profil.kcal=1450; const pc=podielCiela(RECEPTY[0]); out.ok_podiel = pc>=0 && pc<=1;
  // farba prahy
  out.ok_prahy = healthScore({ingrediencie:[],porcie:1}).farba==="red"; // kcal 0 → red
  return out;
}
```
Expected: všetky `ok_*` = `true`.

- [ ] **Step 5: Commit**
```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(recepty): healthScore (proteín/100kcal) + podielCiela"
```

---

## Task 2: Auto-kolekcie (fixná sada) v Recepty

**Files:**
- Modify: `data/app.js` — pridať `KOLEKCIE`, `aktivnaKolekcia`, `renderKolekcie`, `nastavKolekciu`; filter v `renderGrid` (~riadok 161); volanie `renderKolekcie()` v init (~riadok s `renderChips()`)
- Modify: `data/sablona.html` — kontajner `<div id="kolekcie">` v pohľade Recepty + CSS

**Interfaces:**
- Consumes: `healthScore` (Task 1), `casMin`, `cenaPorcia`, `jeSezonne`, `S.fav`, `renderGrid`, `RECEPTY`, `prejdeProfil`.
- Produces: `KOLEKCIE` (pole), `aktivnaKolekcia` (string), `renderKolekcie()`, `nastavKolekciu(id)`.

- [ ] **Step 1: Napíš failing test**
```js
() => ({ ok_exist: typeof KOLEKCIE!=="undefined" && typeof nastavKolekciu==="function" })
```
Expected: `ok_exist:false` (ReferenceError na KOLEKCIE) — ak hodí chybu, to je tiež „fail".

- [ ] **Step 2: Over že test zlyhá**

Run `browser_evaluate`. Expected: chyba alebo `ok_exist:false`.

- [ ] **Step 3: Pridaj KOLEKCIE + stav + funkcie**

V `data/app.js` nájdi:
```js
let aktivnaKat="Všetko";
```
Pridaj hneď ZA:
```js
let aktivnaKolekcia="";
const KOLEKCIE=[
  {id:"rychle",   nazov:"Do 20 min",      ikona:"⏱", test:r=>casMin(r)<=20},
  {id:"protein",  nazov:"Vysoký proteín", ikona:"💪", test:r=>healthScore(r).farba==="green"},
  {id:"sezonne",  nazov:"Sezónne teraz",  ikona:"🌿", test:r=>jeSezonne(r)},
  {id:"lacne",    nazov:"Lacné do 1,5 €", ikona:"💶", test:r=>{const c=cenaPorcia(r); return c>0.01 && c<1.5;}},
  {id:"oblubene", nazov:"Obľúbené",       ikona:"★",  test:r=>!!S.fav[r.id]}
];
function renderKolekcie(){ const box=document.getElementById("kolekcie"); if(!box)return;
  box.innerHTML=KOLEKCIE.map(k=>`<span class="kol-tile${aktivnaKolekcia===k.id?' active':''}" onclick="nastavKolekciu('${k.id}')">${k.ikona} ${k.nazov}</span>`).join(""); }
function nastavKolekciu(id){ aktivnaKolekcia=(aktivnaKolekcia===id)?"":id; renderKolekcie(); renderGrid(); }
```

- [ ] **Step 4: Pridaj filter do renderGrid**

V `data/app.js` nájdi (v `renderGrid`):
```js
    if(!prejdeProfil(r)) return false; // prejdeProfil už vylučuje skryté
    if(aktivnaKat!=="Všetko"&&r.kategoria!==aktivnaKat) return false;
```
Vlož MEDZI tieto dva riadky:
```js
    if(aktivnaKolekcia){ const K=KOLEKCIE.find(k=>k.id===aktivnaKolekcia); if(K && !K.test(r)) return false; }
```

- [ ] **Step 5: Zaregistruj render v init**

V `data/app.js` nájdi inicializačný riadok obsahujúci `renderChips();` (blízko konca súboru, kde sa volá `renderGrid()`, `naplnKuchyne()`…). Za `renderChips();` v tom istom riadku pridaj `renderKolekcie();`. Napr. ak je:
```js
applyVzhlad(); naplnKuchyne(); renderChips(); renderGrid(); naplnJedalnicky();
```
zmeň na:
```js
applyVzhlad(); naplnKuchyne(); renderChips(); renderKolekcie(); renderGrid(); naplnJedalnicky();
```

- [ ] **Step 6: Pridaj kontajner do sablona.html**

V `data/sablona.html` nájdi element s `id="chips"` (v pohľade Recepty, `id="v-recepty"`). Hneď PRED `<div ... id="chips"...>` (alebo pred jeho riadok) vlož:
```html
<div id="kolekcie" class="kolekcie"></div>
```

- [ ] **Step 7: Pridaj CSS**

V `data/sablona.html` nájdi CSS `.chip{` (definícia chipu). Hneď PRED ňu pridaj:
```css
  .kolekcie{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px}
  .kol-tile{padding:7px 12px;border:1px solid var(--line);border-radius:20px;cursor:pointer;font-size:14px;background:var(--card);white-space:nowrap;user-select:none}
  .kol-tile.active{background:var(--accent);color:#fff;border-color:var(--accent)}
```

- [ ] **Step 8: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, potom:
```js
() => {
  const out={};
  out.ok_exist = typeof KOLEKCIE!=="undefined" && typeof nastavKolekciu==="function";
  // každá kolekcia filtruje správne
  out.ok_rychle = RECEPTY.filter(KOLEKCIE.find(k=>k.id==="rychle").test).every(r=>casMin(r)<=20);
  out.ok_lacne = RECEPTY.filter(KOLEKCIE.find(k=>k.id==="lacne").test).every(r=>{const c=cenaPorcia(r);return c>0.01&&c<1.5;});
  out.ok_protein = RECEPTY.filter(KOLEKCIE.find(k=>k.id==="protein").test).every(r=>healthScore(r).farba==="green");
  // aktivácia + renderGrid nespadne, kombinuje s kategóriou
  aktivnaKolekcia="rychle"; aktivnaKat="Všetko";
  document.getElementById("hladaj").value=""; document.getElementById("f-kuchyna").value=""; document.getElementById("f-cas").value=""; document.getElementById("f-diet").value=""; 
  renderGrid(); out.ok_grid = document.getElementById("grid").children.length>0;
  // tiles vykreslené
  renderKolekcie(); out.ok_tiles = document.getElementById("kolekcie").children.length===5;
  aktivnaKolekcia="";
  return out;
}
```
Expected: všetky `ok_*` = `true`.

- [ ] **Step 9: Vizuálna kontrola**

`browser_evaluate`: `() => { prepni("recepty"); aktivnaKolekcia="protein"; renderKolekcie(); renderGrid(); return "ok"; }` → `browser_take_screenshot`; over riadok dlaždíc nad kategóriami, aktívna zvýraznená, grid zúžený.

- [ ] **Step 10: Commit**
```
git add data/app.js data/sablona.html kucharka.html docs/index.html
git commit -m "feat(recepty): auto-kolekcie (fixná sada) — do 20 min / proteín / sezónne / lacné / obľúbené"
```

---

## Task 3: Health indikátor na karte + v detaile

**Files:**
- Modify: `data/app.js` — `kartaHTML` (~riadok 139, pridať bodku do `db`); `otvor` badges (~riadok 222, pridať skóre+krúžok)
- Modify: `data/sablona.html` — CSS `.hdot`, `.badge.hs-*`, `.ring`

**Interfaces:**
- Consumes: `healthScore`, `podielCiela` (Task 1), `fmt`, `eur`.
- Produces: vizuálny indikátor; žiadny nový symbol pre iné tasky.

- [ ] **Step 1: Napíš failing test**
```js
() => {
  const r=RECEPTY[0]; const html=kartaHTML(r);
  return { ok_dotNaKarte: html.includes("hdot") };
}
```
Expected: `ok_dotNaKarte:false`.

- [ ] **Step 2: Over že test zlyhá**

Run `browser_evaluate`. Expected: `ok_dotNaKarte:false`.

- [ ] **Step 3: Pridaj bodku do kartaHTML**

V `data/app.js` nájdi (v `kartaHTML`):
```js
  const db=[jeWatch(r)?'<span class="badge">⭐</span>':'',jeVakcii(r)?'<span class="badge price">🏷️ akcia</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 veg</span>':''].join('');
```
Nahraď za (pridaná farebná bodka podľa healthScore):
```js
  const hs=healthScore(r);
  const dotEl=hs.p100>0?'<span class="hdot hs-'+hs.farba+'" title="proteín '+fmt(hs.p100)+' g/100 kcal"></span>':'';
  const db=[dotEl,jeWatch(r)?'<span class="badge">⭐</span>':'',jeVakcii(r)?'<span class="badge price">🏷️ akcia</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 veg</span>':''].join('');
```

- [ ] **Step 4: Pridaj skóre + krúžok do detailu (otvor)**

V `data/app.js` nájdi (v `otvor`):
```js
  const badges=[jeVakcii(r)?'<span class="badge price">🏷️ v akcii</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 vegetariánske</span>':'',d.bezlepku?'<span class="badge">bez lepku</span>':'',d.bezlaktozy?'<span class="badge">bez laktózy</span>':'',...al.map(a=>`<span class="badge alerg">⚠ ${a}</span>`)].join('');
```
Nahraď za (pred badges pripočíta health skóre + krúžok):
```js
  const hs=healthScore(r); const pod=Math.round(podielCiela(r)*100);
  const hsBadge=hs.p100>0?`<span class="badge hs-${hs.farba}" title="bielkoviny na 100 kcal">💪 ${fmt(hs.p100)} g/100 kcal</span>`:'';
  const ringBadge=pod>0?`<span class="ring" style="background:conic-gradient(var(--accent) ${pod*3.6}deg, var(--line) 0)" title="podiel jednej porcie na dennom cieli"><b>${pod}%</b></span> <span class="badge">podiel dňa</span>`:'';
  const badges=[hsBadge,ringBadge,jeVakcii(r)?'<span class="badge price">🏷️ v akcii</span>':'',jeSezonne(r)?'<span class="badge">🌿 sezónne</span>':'',d.veg?'<span class="badge">🌱 vegetariánske</span>':'',d.bezlepku?'<span class="badge">bez lepku</span>':'',d.bezlaktozy?'<span class="badge">bez laktózy</span>':'',...al.map(a=>`<span class="badge alerg">⚠ ${a}</span>`)].join('');
```

- [ ] **Step 5: Pridaj CSS**

V `data/sablona.html` za CSS `.kolekcie` (z Task 2) pridaj:
```css
  .hdot{display:inline-block;width:9px;height:9px;border-radius:50%;vertical-align:middle;margin-right:4px}
  .hs-green{background:#2e7d54} .hs-amber{background:#e0a800} .hs-red{background:#c0392b}
  .badge.hs-green{background:#e3f1e9;color:#2e7d54} .badge.hs-amber{background:#fbf0cf;color:#8a6d00} .badge.hs-red{background:#f6dedb;color:#c0392b}
  .ring{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;font-size:11px;vertical-align:middle}
  .ring b{background:var(--card);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700}
```
Poznámka: `.hdot.hs-green` funguje aj cez samostatné `.hs-green` (background) — obe triedy na jednom elemente.

- [ ] **Step 6: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, potom:
```js
() => {
  const out={};
  const r=RECEPTY.find(x=>vyzivaReceptu(x).kcal>5)||RECEPTY[0];
  out.ok_dotNaKarte = kartaHTML(r).includes("hdot hs-");
  otvor(r.id);
  const modal=document.getElementById("modal").innerHTML;
  out.ok_detailSkore = modal.includes("g/100 kcal");
  out.ok_detailRing = modal.includes("ring") && modal.includes("podiel dňa");
  zavri();
  return out;
}
```
Expected: všetky `ok_*` = `true`.

- [ ] **Step 7: Vizuálna kontrola**

`browser_take_screenshot` gridu (bodky na kartách) a otvoreného receptu (skóre badge + krúžok). Over light aj dark (`S.profil.dark`).

- [ ] **Step 8: Commit**
```
git add data/app.js data/sablona.html kucharka.html docs/index.html
git commit -m "feat(recepty): health indikátor — farebná bodka na karte, skóre + krúžok v detaile"
```

---

## Task 4: surovinaInfo — množstvo suroviny na recept

**Files:**
- Modify: `data/app.js` — `surovinaInfo` (~riadok 713)

**Interfaces:**
- Consumes: `bezDia`, `fmt` (existujúce).
- Produces: rozšírený výpis (žiadny nový symbol).

- [ ] **Step 1: Napíš failing test**
```js
() => {
  // nájdi surovinu v pláne
  const pl=planovaneRecepty(); if(!pl.length){ generujJedalnicek(true); }
  const r=planovaneRecepty()[0]; const ing=(r&&r.ingrediencie||[]).find(i=>i.mnozstvo!=null);
  if(!ing) return {ok_skip:true};
  surovinaInfo(ing.nazov);
  const html=document.getElementById("pick-modal").innerHTML; zavriPick();
  // pred zmenou: výpis receptov nemá množstvo (žiadny "kc"-span s množstvom pri recepte)
  return { ok_maMnozstvo: /class="kc"/.test(html) };
}
```
Expected: `ok_maMnozstvo:false` (pôvodný výpis nemá množstvo).

- [ ] **Step 2: Over že test zlyhá**

Run `browser_evaluate`. Expected: `ok_maMnozstvo:false` (alebo `ok_skip:true` — vtedy naplň plán a spusti znova).

- [ ] **Step 3: Pridaj množstvo do výpisu**

V `data/app.js` nájdi (v `surovinaInfo`):
```js
  h+= recepty.length? recepty.map(r=>`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvor('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span></div>`).join("") : '<p class="info">V aktuálnom pláne túto surovinu nepoužíva žiadny recept.</p>';
```
Nahraď za:
```js
  const mnozVRecepte=r=>{ const i=(r.ingrediencie||[]).find(x=>{const nn=bezDia(x.nazov);return nn.includes(n)||n.includes(nn.split(" ")[0]);}); if(!i)return ""; return i.mnozstvo!=null?(fmt(i.mnozstvo)+" "+(i.jednotka||"")).trim():(i.poznamka||"podľa chuti"); };
  h+= recepty.length? recepty.map(r=>`<div class="plan-cell" style="border-bottom:1px solid var(--line);border-radius:0" onclick="zavriPick();otvor('${r.id}')"><span class="nm">${ikony[r.kategoria]||"🍴"} ${r.nazov}</span><span class="kc">${mnozVRecepte(r)}</span></div>`).join("") : '<p class="info">V aktuálnom pláne túto surovinu nepoužíva žiadny recept.</p>';
```

- [ ] **Step 4: Rebuild + over že test prejde**

Run: `node --check data/app.js && py generuj_kucharku.py`, reload, potom (rovnaký snippet ako Step 1).
Expected: `ok_maMnozstvo:true`.

- [ ] **Step 5: Commit**
```
git add data/app.js kucharka.html docs/index.html
git commit -m "feat(nakup): surovinaInfo ukazuje množstvo suroviny v každom recepte"
```

---

## Záverečná verifikácia (po Task 4)

- [ ] **Regresia Recepty:** `browser_evaluate` — kombinácia `aktivnaKolekcia` + `aktivnaKat` + hľadanie + `f-diet` naraz → `renderGrid` nespadne, vráti podmnožinu; prepnutie kolekcie off vráti plný zoznam.
- [ ] **Vizuál:** grid s bodkami, otvorený recept so skóre+krúžkom, riadok kolekcií — light aj dark.
- [ ] **CHANGELOG.md:** pridať `v17` (health indikátor, auto-kolekcie, množstvo v surovinaInfo) + bump `VERZIA` na `v17` v `data/app.js`.
- [ ] Rebuild a commit CHANGELOG/VERZIA.

## Self-review poznámky (autor plánu)

- Spec coverage: A health indikátor (Task 1 helpery + Task 3 zobrazenie), B auto-kolekcie (Task 2), C surovinaInfo množstvo (Task 4), testy v každom tasku + záver. ✔
- Typy konzistentné: `healthScore(r)→{p100,farba}` použité v Task 2 (protein test) aj Task 3 (bodka/badge). `podielCiela` v Task 3. `KOLEKCIE`/`aktivnaKolekcia`/`nastavKolekciu`/`renderKolekcie` definované v Task 2, `renderKolekcie` volané v init. ✔
- Bez placeholderov; každý krok má reálny kód a príkaz.
- Žiadny nový perzistentný stav → žiadna migrácia, žiadny dopad na sync/účty (v16+).
