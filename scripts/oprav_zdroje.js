#!/usr/bin/env node
// Zdroje a licencie — pozri report-cistka-dat.md, sekcia „Zdroje a licencie“.
// 1) 6 receptov malo v poli `zdroj` portál, ktorý CLAUDE.md výslovne zakazuje
//    (Allrecipes / Serious Eats / Simply Recipes — People Inc., `Disallow: /` pre `anthropic-ai`;
//    Bon Appétit — Condé Nast). Všetkých 6 je kanonické jedlo. Kde stránku doložiť viem
//    (overené cez MediaWiki API a HTTP status), zdroj sa prepisuje na povolený portál;
//    kde sa doložiť nedá, ostáva pravdivé „vlastná zostava“ — nie výmysel zdroja.
// 2) 6 receptov malo `zdroj: "internet (@handle)"` bez odkazu — dopĺňa sa odkaz na profil.
"use strict";
const L = require("./lib_recepty");
const DRY = process.argv.includes("--dry");

const ZDROJE = {
  // kanonické jedlo, stránka overená (HTTP 200 / MediaWiki API)
  "shakshuka": ["Wikibooks Cookbook – Shakshuka (CC BY-SA)", "https://en.wikibooks.org/wiki/Cookbook:Shakshuka"],
  "pasta-e-fagioli": ["Wikibooks Cookbook – Pasta and Bean Soup (Pasta e Fagioli) (CC BY-SA)",
    "https://en.wikibooks.org/wiki/Cookbook:Pasta_and_Bean_Soup_(Pasta_e_Fagioli)"],
  "domace-hovadzie-burgery": ["Wikibooks Cookbook – Hamburger (CC BY-SA)", "https://en.wikibooks.org/wiki/Cookbook:Hamburger"],
  "cacio-e-pepe": ["BBC Good Food – Cacio e pepe", "https://www.bbcgoodfood.com/recipes/cacio-e-pepe"],
  // kanonické jedlo, povolenú predlohu som nenašiel → pravdivý, nie vymyslený zdroj
  "thai-basil-pork": ["Vlastná zostava (kanonické jedlo Pad Krapow Moo)", ""],
  "bageta-udena-sunka-gouda": ["Vlastná zostava (skladaná bageta, bez prevzatej predlohy)", ""],
};

// zdroj „internet (@handle)“ → odkaz na profil, aby atribúcia viedla niekam
const HANDLE = /^internet \(@([A-Za-z0-9_.]+)\)$/;

const R = L.nacitaj();
let a = 0, b = 0;
for (const r of R) {
  let zmena = false;
  if (ZDROJE[r.id]) {
    const [z, u] = ZDROJE[r.id];
    r.zdroj = z;
    if (u) r.zdroj_url = u; else delete r.zdroj_url;
    zmena = true; a++;
  }
  const m = HANDLE.exec(r.zdroj || "");
  if (m && !(r.zdroj_url || "").trim()) {
    r.zdroj = "Instagram @" + m[1];
    r.zdroj_url = "https://www.instagram.com/" + m[1] + "/";
    zmena = true; b++;
  }
  if (zmena && !DRY) L.zapis(r);
}
console.log((DRY ? "[DRY] " : "") + `prepísaných zakázaných zdrojov: ${a} · doplnených odkazov na profil: ${b}`);
