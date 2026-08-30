// AUDIT: nepoužívané funkcie a konštanty v data/app.js (hľadá aj v sablona.html — onclick handlery)
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..","..");
const app=fs.readFileSync(path.join(R,"data","app.js"),"utf8");
const sab=fs.readFileSync(path.join(R,"data","sablona.html"),"utf8");
const sw =fs.existsSync(path.join(R,"sw.js"))?fs.readFileSync(path.join(R,"sw.js"),"utf8"):"";
const vsetko=app+"\n"+sab+"\n"+sw;

const fnRe=/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
const mena=new Set(); let m;
while((m=fnRe.exec(app))) mena.add(m[1]);
const constRe=/^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/gm;
const konst=new Set(); while((m=constRe.exec(app))) konst.add(m[1]);

function pocet(n){ const re=new RegExp("\\b"+n.replace(/\$/g,"\\$")+"\\b","g"); return (vsetko.match(re)||[]).length; }
const nepouzite=[...mena].filter(n=>pocet(n)<=1).sort();
const konstNepouzite=[...konst].filter(n=>pocet(n)<=1).sort();
console.log("funkcií celkom:",mena.size,"· top-level const/let:",konst.size);
console.log("\nFUNKCIE definované a NIKDE nevolané ("+nepouzite.length+"):");
nepouzite.forEach(n=>{ const ln=app.split("\n").findIndex(l=>new RegExp("function\\s+"+n+"\\s*\\(").test(l))+1; console.log("  app.js:"+ln+"  "+n); });
console.log("\nKONŠTANTY/premenné definované a nikde nepoužité ("+konstNepouzite.length+"):");
konstNepouzite.forEach(n=>{ const ln=app.split("\n").findIndex(l=>new RegExp("(const|let)\\s+"+n+"\\b").test(l))+1; console.log("  app.js:"+ln+"  "+n); });

// funkcie volané z HTML atribútov, ktoré neexistujú
console.log("\nHandlery v HTML/JS, ktoré volajú neexistujúcu funkciu:");
const volania=new Set();
const hRe=/\bon(?:click|change|input|submit|focus|blur|dragover|drop|dragstart)\s*=\s*(["'])([\s\S]*?)\1/g;
let h; const zdroj=app+"\n"+sab;
while((h=hRe.exec(zdroj))){ const kod=h[2]; let c; const cRe=/([A-Za-z_$][\w$]*)\s*\(/g;
  while((c=cRe.exec(kod))) volania.add(c[1]); }
const glob=new Set(["if","for","while","return","Math","JSON","parseInt","parseFloat","Number","String","Array","Object","Set","Map","console","document","window","setTimeout","alert","event","this","typeof","new","Date","encodeURIComponent","confirm","prompt"]);
const chybne=[...volania].filter(n=>!mena.has(n)&&!glob.has(n)&&!/^[A-Z]/.test(n)).sort();
console.log(" ",chybne.length?chybne.join(", "):"(žiadne)");

// poradie top-level const-ov: použitie PRED definíciou v top-level kóde
console.log("\nTop-level const/let použité v kóde nad svojou definíciou (TDZ riziko):");
const riadky=app.split("\n");
const defR={}; [...konst].forEach(n=>{ const i=riadky.findIndex(l=>new RegExp("^(const|let)\\s+"+n.replace(/\$/g,"\\$")+"\\b").test(l)); if(i>=0)defR[n]=i+1; });
// top-level príkazy = riadky, ktoré nie sú vnútri funkcie (hrubá heuristika: nezačínajú medzerou a nie sú 'function')
let hlbka=0, problemy=[];
riadky.forEach((l,i)=>{
  const jeFn=/^\s*(?:async\s+)?function\s/.test(l);
  const topLevel = hlbka===0 && !jeFn;
  if(topLevel){ for(const n in defR){ if(defR[n]>i+1 && new RegExp("\\b"+n.replace(/\$/g,"\\$")+"\\b").test(l)) problemy.push("app.js:"+(i+1)+" používa "+n+" (definované na :"+defR[n]+")"); } }
  hlbka += (l.match(/\{/g)||[]).length - (l.match(/\}/g)||[]).length;
  if(hlbka<0)hlbka=0;
});
console.log(problemy.length?problemy.map(x=>"  "+x).join("\n"):"  (žiadne)");
