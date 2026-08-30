// AUDIT: kde sa POUŽÍVATEĽSKÉ dáta (S.*) dostávajú do innerHTML bez escapovania.
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..","..");
const src=fs.readFileSync(path.join(R,"data","app.js"),"utf8").split("\n");
// polia stavu, ktoré plní používateľ (alebo cudzie zariadenie cez Supabase sync)
const POLIA=["S.pozn","S.spajza","S.nakupManual","S.profil.stravnici","S.profil.watch","S.profil.zakazane",
  "S.akcie","S.domaNakup","S.archiv","S.mojeRecepty","x.nazov","m.nazov","p.nazov","j.nazov","N.nazov","r.nazov","G.nazov"];
console.log("Riadky, kde sa do HTML reťazca vkladá používateľská hodnota:");
src.forEach((l,i)=>{
  if(!/innerHTML|`|\+=/.test(l))return;
  POLIA.forEach(p=>{
    const re=new RegExp("\\$\\{[^}]*"+p.replace(/[.$]/g,"\\$&")+"|\"\\s*\\+\\s*"+p.replace(/[.$]/g,"\\$&"));
    if(re.test(l)){
      const esc=/escHtml|genWEsc|replace\(\/</.test(l);
      console.log(`  app.js:${i+1} ${esc?"[escapované]":"[BEZ ESCAPU]"} ${p}  →  ${l.trim().slice(0,150)}`);
    }
  });
});
