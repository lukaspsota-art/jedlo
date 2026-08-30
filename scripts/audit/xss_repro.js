// AUDIT REPRO: meno stravníka / názov uloženého jedálnička sa dostane do innerHTML neescapované.
const { load } = require("../../test_harness");
const UTOK = '<img src=x onerror="alert(1)">';
const app = load({stav:{
  viewOd:"2026-08-17", blokMode:true, genCfg:{cielMode:true,filtre:[]},
  profil:{osoby:1,kcal:1450,biel:100,stravnici:[{nazov:UTOK,kcal:1450}]},
  archiv:[{id:"a1",nazov:UTOK,od:"2026-08-10",plan:{},planF:{}}],
  spajza:[], plan:{}
}, seed:1});

// 1) Výživa → „ciele stravníkov"
app.__orig.renderVyziva();
const el=app.document.getElementById("vyziva-stravnici");
console.log("1) #vyziva-stravnici (app.js:1636):", el.innerHTML.includes(UTOK) ? "❌ ÚTOK PRENIKOL DO innerHTML" : "ok");
console.log("   výsek:", el.innerHTML.slice(0,120));

// 2) Nastavenia → zoznam stravníkov (input value)
const orig=app.renderStravnici;
// renderStravnici je stubnutá harness-om; zavoláme priamy dopad cez naplnKohoSelect
app.naplnKohoSelect();
const sel=app.document.getElementById("t-koho");
console.log("2) #t-koho (app.js:1656):", sel.innerHTML.includes("<img") ? "❌ prenikol" : "ok (< je odstránené)");

// 3) Načítať jedálniček — zoznam archívu
app.otvorNacitat();
const pm=app.document.getElementById("pick-modal");
console.log("3) #pick-modal / otvorNacitat (app.js:1807):", pm.innerHTML.includes(UTOK) ? "❌ ÚTOK PRENIKOL DO innerHTML" : "ok");

// 4) escapovanie pri ZÁPISE (spajza/vlastný recept) → dvojité escapovanie v dátach
console.log("\n4) escHtml pri zápise deformuje dáta:");
console.log("   escHtml('Jahody & smotana') =", app.escHtml("Jahody & smotana"));
console.log("   → takto sa to uloží do S.spajza[].nazov a takto ide do 'Mám doma', do schránky (Listonic) aj do najdiPotravinu()");
