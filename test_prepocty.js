// Beh: node test_prepocty.js
// Pripína pravidlo, ktoré sa raz už pokazilo: kusy (baklažán, vajce, rožok) sa škálujú LEN počtom porcií,
// nie percentom veľkosti porcie — inak nákupný zoznam pýta menej kusov, než recept pri varení potrebuje.
const assert = require("assert");
const fs = require("fs");

// ponytail: app.js je browser skript (localStorage, document) — vytiahneme len čisté prepočtové funkcie
const src = fs.readFileSync(__dirname + "/data/app.js", "utf8");
function vyrez(od, po) {
  const a = src.indexOf(od), b = src.indexOf(po, a);
  assert.ok(a >= 0 && b > a, "nenašiel som v app.js: " + od);
  return src.slice(a, b);
}
const kod = vyrez("const ML_JED=", "function jeTekutina")
          + vyrez("const NEDELITELNE_JEDNOTKY=", "function prevodJednotka");
const { gramy, skalovanaHodnota } = new Function(kod + "; return {gramy, skalovanaHodnota};")();

const baklazan = { kluc: "baklažán", g_za_ks: 250 };
const fPocet = 1.5, fVelkost = 0.7; // 1,5× porcií, veľkosť porcie 70 % (kcal brzda)

// kusy: % veľkosti porcie sa neuplatní ani v detaile receptu, ani v nákupe
assert.strictEqual(skalovanaHodnota(2, "ks", fPocet, fVelkost), 3);
assert.strictEqual(gramy({ mnozstvo: skalovanaHodnota(2, "ks", fPocet, fVelkost), jednotka: "ks" }, baklazan), 750);

// gramy/ml: % veľkosti porcie sa uplatní
assert.ok(Math.abs(skalovanaHodnota(200, "g", fPocet, fVelkost) - 210) < 1e-9);

// jednotka sa musí dať previesť na gramy, inak by ingrediencia ticho vypadla z nákupu aj z kalórií
for (const j of ["g", "ks", "ml", "PL", "ČL", "strúčik", "plátok", "hrsť", "štipka", "hlávka", "list"])
  assert.ok(gramy({ mnozstvo: 1, jednotka: j }, baklazan) > 0, "neznáma jednotka: " + j);

console.log("OK");
