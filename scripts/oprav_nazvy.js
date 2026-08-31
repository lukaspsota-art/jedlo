#!/usr/bin/env node
// Recepty, ktorých názov sľuboval surovinu, čo v recepte nie je (nájdené cez
// scripts/audit_nazvy.js, každý prípad overený ručne proti surovinám aj postupu).
// Názov sa mení tak, aby hovoril pravdu o tom, čo sa naozaj uvarí — `id` zostáva,
// aby sa nerozbili hodnotenia a poznámky v localStorage ani odkazy v jedálničkoch.
// Spusti: node scripts/oprav_nazvy.js [--dry]
"use strict";
const L = require("./lib_recepty");
const DRY = process.argv.includes("--dry");

// id: [nový názov, nová kategória alebo null]
const N = {
  // ── názov sľuboval surovinu, ktorá v recepte nie je ──────────────────────
  "kuracie-stehna-dusene-s-olivami-a-citronom": ["Kuracie stehná dusené na cibuli", null],
  "pizza-sunkova-prosciutto": ["Pizza so salámou, olivami a paprikou", null],
  "tvarohova-natierka-s-medom-a-orechmi": ["Tvarohová nátierka s horčicou a uhorkou", null],
  "cesnakove-rozky-s-bylinkovym-maslom": ["Cesnakové rožky s maslom", null],
  "cesnakovy-chlieb": ["Cesnakový chlieb so semienkami", null],
  "cestoviny-cuketove-pesto-krevety": ["Cestoviny s cuketou, krevetami a citrónom", null],
  "cestoviny-s-hraskom-a-slaninou": ["Cestoviny so slaninou a šampiňónmi", null],
  "cestoviny-s-tuniakom-a-citronom": ["Cestoviny s tuniakom a syrokrémom", null],
  "cestoviny-s-tuniakom-a-olivami": ["Cestoviny s paradajkami, olivami a čili", null],
  "cestoviny-so-spenatom-a-piniovymi-orieskami": ["Domáce špenátové cestoviny", null],
  "cestoviny-s-brokolicou-a-kuracim-masom": ["Cestoviny s hubami a kuracím mäsom v smotanovej omáčke", null],
  "cestoviny-s-cicerom-a-paradajkami": ["Cestoviny s mangoldom, ricottou a paradajkami", null],
  "cestoviny-s-cviklovou-omackou": ["Cestoviny s bravčovým mäsom v paprikovej omáčke", null],
  "cestoviny-s-krevetami-v-paradajkovej": ["Cestoviny s krevetami v smotanovej omáčke", null],
  "cestovinovy-salat-pesto-cherry": ["Cestovinový šalát s bazalkou a cherry paradajkami", null],
  "cottage-natierka-s-paradajkou-a-bazalkou": ["Cottage nátierka s vajcom a cibuľou", null],
  "cottage-natierka-s-redkovkou": ["Cottage nátierka so šunkou a syrom", null],
  "cviklovy-salat-s-fetou-a-orechmi": ["Cviklový šalát s fetou a hráškom", null],
  "cicerovo-uhorkovy-salat-s-matou": ["Cícerový šalát s granátovým jablkom a rukolou", null],
  "cicerova-polievka-s-korenim": ["Cícerová polievka s údenými rebrami", null],
  "focaccia-s-rozmarinom": ["Focaccia s olivovým olejom a morskou soľou", null],
  "focaccia-s-paradajkami-a-olivami": ["Focaccia s rozmarínom a morskou soľou", null],
  "grilovane-bravcove-rebra-s-medovou-glazurou": ["Bravčové rebrá plnené mletým mäsom", null],
  "hovadzi-steak-s-cesnakovym-maslom": ["Hovädzia krkovica na borievkach", null],
  "hrachovy-hummus": ["Cícerový hummus s gréckym jogurtom", null],
  "jahodovo-bananove-smoothie": ["Banánové smoothie s ovsenými vločkami", null],
  "kari-kokosova-polievka-so-zeleninou": ["Kokosová polievka s kuracím mäsom a čili", null],
  "kuracie-prsia-s-pecenymi-zemiakmi-a-brokolicou": ["Kuracie prsia s pečenými zemiakmi", null],
  "kuracie-s-brokolicou-a-mandlami": ["Kuracia pečeň restovaná s cibuľou", null],
  "kuracie-s-brokolicou-na-sojovej": ["Kuracie na sójovej omáčke so zázvorom a mrkvou", null],
  "kuracia-polievka-s-rezancami": ["Kuracia polievka z drobkov", null],
  "kuracie-so-spenatom-sag": ["Špenátové lasagne so zvyškovým kurčaťom", null],
  "kynute-livance-so-svestkami-a-zakysanou-smotanou": ["Kysnuté celozrnné lievance", null],
  "ladova-kava-s-karamelom": ["Ľadová káva s medom a škoricou", null],
  "losos-s-medovo-horcicovou-korkou": ["Losos s lučinovo-mandľovou kôrkou", null],
  "marocke-kuracie-s-kuskusom": ["Marocké kuracie stehná s basmati ryžou", null],
  "medovo-orechova-natierka": ["Orechová nátierka s cesnakom", null],
  "morciacie-prsia-s-brusnicovou-plnkou": ["Morčacie prsia s jablkovou plnkou", null],
  "morciacie-rezne-s-brusnicovou-omackou": ["Morčacie rezne v nivovej omáčke", null],
  "natierka-z-fazule-a-cesnaku": ["Nátierka z bielej fazule s pečenou paprikou", null],
  "ovsena-kasa-s-brusnicami-a-orechmi": ["Ovsená kaša s kakaom a škoricou", null],
  "ovsena-kasa-s-hruskou-a-skoricou": ["Ovsená kaša s hruškou a banánom", null],
  "ovocny-salat-s-kozim-syrom": ["Špenátový šalát s krvavým pomarančom a kozím syrom", null],
  "pecena-cvikla-s-tymianom": ["Pečená cvikla s fetou a vlašskými orechmi", null],
  "pecena-zelenina-s-balzamikovym-octom": ["Pečená zelenina s cesnakom a kurkumou", null],
  "polievka-z-bazanta-s-bielym-vinom-chardonnay": ["Polievka z bažanta so sušenými dubákmi", "Polievka"],
  "redkovkova-natierka-s-jogurtom": ["Reďkovková nátierka s tatárskou omáčkou", null],
  "rezancovy-nakyp": ["Ryžový nákyp s vanilkou", null],
  "rukolovy-salat-s-hruskou-a-orechmi": ["Rukolový šalát s hruškou a parmezánom", null],
  "ryzova-priloha-so-zeleninou-a-vajcom": ["Restovaná cuketa s cesnakom", null],
  "ryzove-rezance-s-hovadzim-a-zeleninou": ["Ryžové rezance so zeleninou a šampiňónmi", null],
  "salat-z-hnedej-ryze-so-zeleninou": ["Šalát z basmati ryže a krúp so zeleninou", null],
  "salat-z-pecenej-papriky-a-paradajok": ["Panzanella — šalát z paradajok a chleba", null],
  "salat-z-quinoi-s-peceenym-karfiolom": ["Šalát z quinoi s pečenou tekvicou", null],
  "salat-z-peceneho-karfiolu-s-hrozienkami": ["Karfiolový šalát s majonézou a vajcom", null],
  "salat-z-pecenej-repy-s-fetou": ["Šalát z pečenej repy s tofu a šampiňónmi", null],
  "salat-z-cerveneho-zelia-coleslaw": ["Šalát so zelerom, kukuricou a krabími tyčinkami", null],
  "sladke-zemle": ["Sladké tvarohové žemličky (bezlepkové)", null],
  "slane-slimaky-so-syrom-a-bylinkami": ["Slimáky s orechovou plnkou", null],
  "slane-makove-tycinky": ["Slané tyčinky z kyslej smotany", null],
  "slane-mafiny-so-spenatom-a-fetou": ["Makové rezy so slivkovým lekvárom", "Dezert"],
  "spenatovy-salat-s-jahodami-a-orechmi": ["Špenátový šalát s jahodami a mandľami", null],
  "syrove-rozky-s-bylinkami": ["Syrové rožky s fetou a sušenými paradajkami", null],
  "toast-s-avokadom-a-vajcom": ["Toast s avokádom a smotanovým syrom", null],
  "treska-v-cesticku": ["Biela ryba v cestíčku s kuskusom", null],
  "tvarohovo-jahodovy-kolac-studeny": ["Jahodový studený koláč (bez pečenia)", null],
  "tvarohovo-kokosove-gulky-pecene": ["Kokosové guľky pečené", null],
  "tvarohovo-malinovy-kolac": ["Kakaovo-malinový koláč", null],
  "vajecne-muffiny-so-zeleninou": ["Čokoládové muffiny", "Dezert"],
  "vajicne-pohare-so-slaninou-a-syrom": ["Tvarohové poháre s jablkom a mrkvou", null],
  "vegetarianska-musaka-so-sosovicou": ["Musaka s mletým hovädzím a baklažánom", null],
  "zapekane-cestoviny-s-kuracim-a-brokolicou": ["Zapekané cestoviny s kuracím mäsom a cherry paradajkami", null],
  "zeleninove-karbonatky-so-syrom": ["Zeleninové karbonátky s tofu", null],
  "zeleninovy-salat-s-tuniakom-a-vajcom": ["Zeleninový šalát s tuniakom a artičokmi", null],
  "zeleninovy-vyvar-s-rezancami": ["Zeleninový vývar s kuracím mäsom", null],
  "zelerovo-jablkova-polievka": ["Zelerovo-paradajková polievka", null],
  "zemiakovo-uhorkovy-salat": ["Uhorkový šalát v octovom náleve", null],
  "zemiaky-na-masle-s-koprom": ["Nakladané zemiaky v octovom náleve", null],
  "quinoa-salat-s-avokadom-a-fazuľou": ["Quinoa šalát s cícerom a zeleninou", null],
  "bravcove-so-zelim-a-zemiakmi": ["Bravčové so šampiňónmi a nakladanými uhorkami", null],
  "bravcove-kare-s-jablkami-a-cibulou": ["Bravčové karé s jablkami, šunkou a syrom", null],
  "bravcove-rezne-s-hubovou-omackou": ["Bravčové rezne v kečupovo-medovej marináde", null],
  "bruschetta-s-vajcom": ["Bruschetta s paradajkami a ajvarom", null],
  "basmati-ryza-s-bylinkami": ["Basmati ryža s mandľami a hrozienkami", null],
  "azijske-rezance-s-tofu": ["Ázijské ryžové rezance s hovädzím", null],
  "avokadovo-vajickovy-salat-na-ranajky": ["Avokádovo-jablkový šalát na raňajky", null],
  "avokadovo-bananovy-jogurt-na-ranajkovu-pohodu": ["Avokádovo-banánová raňajková miska s kakaom", null],
  "zeleny-caj-s-medom-a-citronom": ["Jablkový čaj s perníkovým korením", null],
  "grecke-kuracie-so-zemiakmi": ["Grécky kurací šalát s jogurtovým dresingom", "Šalát"],
  "hovadzie-chilli-s-fazulou": ["Hovädzie dusené na červenom víne", null],
  "hruskova-salatova-miska-s-orechmi-a-syrom": ["Šalátová miska v pizzovom ceste so šunkou a kuracím mäsom", null],
  "jablkovo-zelerovy-salat": ["Zelerový šalát s ananásom a šunkou", null],
  "kapustovo-mrkvovy-salat-s-jablkom": ["Kapustovo-mrkvový šalát v octovom náleve", null],
  "kokosove-makronky": ["Mandľové makrónky s ricottovým krémom", null],
  "kokosovo-cokoladove-gulky": ["Kokosové guľky s krupicou", null],
  "kremove-cestoviny-so-spenatom-a-fetou": ["Krémové cestoviny so šampiňónmi a hráškom", null],
  "chlieb-so-sunkou-a-uhorkou": ["Domáci chlieb z chlebovej zmesi", "Pečivo"],
  "oblozene-rozky-sunka-syr": ["Domáce maslové rožky", "Pečivo"],
  "rajcinova-polievka-s-ryzou": ["Paradajková polievka s bazalkou", null],
  // ── názov je pravdivý, ale nepresný alebo nečitateľný ────────────────────
  "fasirkova-variacia-na-tanieri-plnom-farieb": ["Fašírky so syrovou a broskyňovou omáčkou", null],
  "morcacie-kuracie-spizy-trocha-inak": ["Morčacie špízy so syrom a kečupovou marinádou", null],
  "salat-mexicka-pasta-s-ciernou-fazulou": ["Mexický cestovinový šalát s čiernou fazuľou", null],
  "rybi-salat-feferonovy-takmer-podla-csn": ["Rybací šalát s feferónmi", null],
  "cestoviny-s-bravcovym-gulasom": ["Cestoviny s bravčovým ragú", null],
  "pita-chlieb": ["Pita chlieb so sušenými paradajkami a sezamom", null],
  "tunakova-pomazanka-s-chilli": ["Tuniaková nátierka s čili", null],
  "uhorkovy-salat-s-koprom": ["Uhorkový šalát s kôprom a smotanou", null],
  // ── zle zaradená kategória (obsah je hlavné jedlo, nie príloha/šalát) ────
  "kuracinka-na-hrasku-s-ryzou": ["Kuracie na hrášku v smotanovej omáčke", "Hlavné jedlo"],
  "cuketove-rezance-s-morcacimi-gulkami-a-omackou-s-baklazano": ["Cuketové rezance s morčacími guľkami a baklažánovou omáčkou", "Hlavné jedlo"],
  "zdrave-kura-s-provensalskym-grilovanym-salatom": ["Kuracie prsia s grilovanou zeleninou", "Hlavné jedlo"],
  "domaca-bajcovana-sunka": ["Domáca bajcovaná šunka", "Hlavné jedlo"],
  "domaci-biely-zemiakovy-chlieb-s-rascou": ["Biely zemiakový chlieb s rascou", "Pečivo"],
  "hubove-knedlicky-do-polievky": ["Hubové knedličky do polievky", "Príloha"],
};

const R = L.nacitaj();
const podlaId = Object.fromEntries(R.map(r => [r.id, r]));
let n = 0, kat = 0, chyba = 0;
for (const [id, [nazov, kategoria]] of Object.entries(N)) {
  const r = podlaId[id];
  if (!r) { console.error("chýba recept:", id); chyba++; continue; }
  if (L.jeSnack(r)) { console.error("preskakujem Snack:", id); continue; }
  let z = false;
  if (r.nazov !== nazov) { r.nazov = nazov; z = true; n++; }
  if (kategoria && r.kategoria !== kategoria) { r.kategoria = kategoria; z = true; kat++; }
  if (z && !DRY) L.zapis(r);
}
console.log((DRY ? "[DRY] " : "") + `premenovaných: ${n} · zmenená kategória: ${kat} · nenájdených: ${chyba}`);
