// AUDIT: koľko stojí jeden klik na hviezdičku (toggleFav → renderGrid + renderDash)
const { load } = require("../../test_harness");
const app = load({stav:{viewOd:"2026-08-17",hranice:[true,false,true,false,false,true,false],blokMode:true,
  genCfg:{zachovat:false,cielMode:true,filtre:[]},
  profil:{osoby:2,kcal:1450,stravnici:[{nazov:"A",kcal:1450},{nazov:"B",kcal:1450}]}}, seed:4});
(async()=>{
await app.generujJedalnicek(true);
const t=(f,n)=>{ const a=Date.now(); for(let i=0;i<n;i++)f(); return (Date.now()-a)/n; };
console.log("  renderGrid (1956 kariet):", t(app.__orig.renderGrid,3).toFixed(0),"ms");
console.log("  renderDash:", t(app.__orig.renderDash,3).toFixed(0),"ms  (volá cenaTyzdna → nakupItems → celý nákupný zoznam)");
console.log("  renderNakup:", t(app.__orig.renderNakup,3).toFixed(0),"ms");
console.log("  nakupItems():", t(app.nakupItems,5).toFixed(0),"ms");
console.log("  → toggleFav() volá renderGrid + (ak je Domov aktívny) renderDash");
console.log("  Poznámka: v node bez layoutu. Prehliadač k renderGrid pridá layout ~19 000 uzlov.");

console.log("\n=== escHtml pri zápise láme vyhľadávanie a párovanie ===");
const nazov=app.escHtml("Kuracie & ryža");
console.log("  uložený názov vlastného receptu:",JSON.stringify(nazov));
const r={id:"moj-x",nazov,kategoria:"Hlavné jedlo",porcie:2,ingrediencie:[{nazov:app.escHtml("Cesnak & soľ"),mnozstvo:2,jednotka:"strúčik"}],postup:[],tagy:[]};
console.log("  hladaSedi(r,'kuracie & ryza') =", app.hladaSedi(r, app.bezDia("kuracie & ryza")));
console.log("  hladaSedi(r,'amp') =", app.hladaSedi(r, "amp"), " ← entita sa stala hľadateľným slovom");
console.log("  najdiPotravinu('"+r.ingrediencie[0].nazov+"') →", (app.najdiPotravinu(r.ingrediencie[0].nazov)||{}).kluc);
console.log("  najdiPotravinu('Cesnak & soľ') →", (app.najdiPotravinu("Cesnak & soľ")||{}).kluc);
})();
