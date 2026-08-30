// Textové úpravy recepty/*.json, ktoré NEPREFORMÁTUJÚ zvyšok súboru.
// Súbory majú tri rôzne štýly odsadenia (1 medzera, 2 medzery, kompaktné ingrediencie
// na jednom riadku) — JSON.stringify by celý súbor prepísal a diff by sa nedal prečítať.
// Preto sa mení len konkrétny kľúč a výsledok sa vždy overí cez JSON.parse.
const fs = require("fs");

function _telo(txt, odKluca) {           // vráti [start,end] JSON objektu, v ktorom kľúč leží
  let i = txt.lastIndexOf("{", odKluca);
  let hlbka = 0, vRetazci = false, esc = false;
  for (let k = i; k < txt.length; k++) {
    const c = txt[k];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') vRetazci = !vRetazci;
    if (vRetazci) continue;
    if (c === "{") hlbka++;
    else if (c === "}") { hlbka--; if (!hlbka) return [i, k]; }
  }
  throw new Error("neuzavretý objekt");
}

// Nastaví kľúč najvyššej úrovne (kcal_na_porciu, kcal_zdroj…). Ak neexistuje, vloží ho za `po`.
function nastavPole(txt, kluc, hodnota, po) {
  const val = JSON.stringify(hodnota);
  const re = new RegExp('("' + kluc + '"\\s*:\\s*)(null|true|false|"(?:[^"\\\\]|\\\\.)*"|-?[0-9.]+)');
  const m = re.exec(txt);
  if (m) return txt.slice(0, m.index) + m[1] + val + txt.slice(m.index + m[0].length);
  const reP = new RegExp('("' + po + '"\\s*:\\s*(?:null|true|false|"(?:[^"\\\\]|\\\\.)*"|-?[0-9.]+))(,?)');
  const mp = reP.exec(txt);
  if (!mp) throw new Error("nenašiel som kľúč " + po + ", za ktorý vložiť " + kluc);
  const riadok = txt.slice(txt.lastIndexOf("\n", mp.index) + 1, mp.index);
  const odsad = riadok.match(/^\s*/)[0];
  const nl = txt.includes("\r\n") ? "\r\n" : "\n";   // súbory z Varechy majú CRLF — neprepínaj im koniec riadku
  return txt.slice(0, mp.index + mp[1].length) + "," + nl + odsad + '"' + kluc + '": ' + val +
    txt.slice(mp.index + mp[1].length + mp[2].length) .replace(/^/, mp[2] ? "," : "");
}

// Vloží/nastaví kľúč vnútri objektu ingrediencie s daným názvom (prvý výskyt od `odIndexu`).
function nastavVIngrediencii(txt, nazov, kluc, hodnota, odIndexu) {
  const hladaj = '"nazov": ' + JSON.stringify(nazov);
  let i = txt.indexOf(hladaj, odIndexu || 0);
  if (i < 0) { const h2 = '"nazov":' + JSON.stringify(nazov); i = txt.indexOf(h2, odIndexu || 0); }
  if (i < 0) throw new Error("ingrediencia „" + nazov + "“ sa v súbore nenašla");
  const [a, b] = _telo(txt, i);
  const obj = txt.slice(a, b + 1);
  const val = JSON.stringify(hodnota);
  const re = new RegExp('("' + kluc + '"\\s*:\\s*)(null|true|false|"(?:[^"\\\\]|\\\\.)*"|-?[0-9.]+)');
  let novy;
  if (re.test(obj)) novy = obj.replace(re, "$1" + val);
  else if (obj.includes("\n")) {                       // rozvinutý objekt → nový riadok
    const nl = obj.includes("\r\n") ? "\r\n" : "\n";
    const posl = obj.lastIndexOf(nl);
    const odsad = obj.slice(obj.indexOf("\n") + 1).match(/^[ \t]*/)[0];
    novy = obj.slice(0, posl) + "," + nl + odsad + '"' + kluc + '": ' + val + obj.slice(posl);
  } else novy = obj.slice(0, -1).replace(/\s*$/, "") + ', "' + kluc + '": ' + val + "}";
  return { txt: txt.slice(0, a) + novy + txt.slice(b + 1), koniec: a + novy.length };
}

function nacitaj(cesta) { return fs.readFileSync(cesta, "utf8"); }
function zapis(cesta, txt) { JSON.parse(txt); fs.writeFileSync(cesta, txt, "utf8"); }  // parse = poistka

module.exports = { nastavPole, nastavVIngrediencii, nacitaj, zapis };
