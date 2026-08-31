#!/usr/bin/env node
// Rieši 58 skupín receptov, ktoré majú ZHODNÝ zoznam surovín aj ZHODNÝ postup.
// Príčina: import z Varechy vyrobil z jedného zdrojového receptu N „variantov“ s vymyslenými
// názvami — obsah je jeden a ten istý, názov klame (napr. „Fazuľová polievka bez mäsa“
// má v surovinách údené rebierka). V každej skupine zostáva jeden recept s pravdivým názvom,
// ostatné sa mažú. Odkazy v jedalnicky/*.json sa prepíšu na ponechaný recept.
// Skupiny s kategóriou Snack sa NERIEŠIA — patria inému agentovi.
// Spusti: node scripts/oprav_duplicity.js [--dry]
"use strict";
const fs = require("fs"), path = require("path");
const L = require("./lib_recepty");
const DRY = process.argv.includes("--dry");

// [ponechaj, novýNázov|null, novaKategoria|null, ...zmaž]
const SKUPINY = [
  ["vajickovo-avokadova-natierka", null, null, "avokadova-natierka-s-limetkou", "kremova-avokadova-natierka-s-koriandrom"],
  ["ciccerova-natierka-s-bazalkou", "Cícerová nátierka s pórom a rozmarínom", null, "avokadovo-cicerova-natierka"],
  ["sezamovy-cestovinovy-salat", "Cestovinový šalát s tuniakom a fazuľovými strukmi", null, "azijsky-cestovinovy-salat-s-arasidovou-omackou"],
  ["domace-bagety", null, null, "bageta-ostiepok", "bageta-s-makom", "bagety-s-bylinkami", "cottage-bagety", "pecivo-bageta"],
  ["domaca-citronova-limonada", "Bylinková limonáda s citrusmi", null, "bazalkova-limonada", "broskynova-limonada", "jablcna-limonada-so-skoricou", "kivi-limonada"],
  ["klasicke-palacinky", "Palacinky s mandľami a hrozienkami", null, "bielkovinove-palacinky", "palacinky-s-cokoladou"],
  ["bravcove-peceny-s-cesnakom-a-rozmarinom", "Pečená bravčová panenka s rozmarínom", null, "bravcove-so-slivkami-a-rozmarinom"],
  ["brynzovy-sendvic-slaninka", "Sendvič so šunkou, syrom a tatárskou omáčkou", null, "menemenovy-sendvic", "musubi-sunka-vajce-havajsky", "simit-syrovy-sendvic"],
  ["bulgur-so-zeleninou", "Libanonský bulgur so zeleninou (tabbouleh štýl)", null, "bulgur-s-pecenou-zeleninou"],
  ["bylinkovo-cesnakova-natierka-na-chlieb", "Cesnaková nátierka so syrokrémom", null, "cesnakova-natierka-s-bazalkou-a-olivovym-olejom"],
  ["celozrnne-palacinky-so-skoricou", "Celozrnno-orechové palacinky", null, "celozrnne-palacinky-s-bananom"],
  ["celozrnny-toastovy-chlieb", null, null, "celozrnny-toast-s-hummusom-a-zeleninou"],
  ["syrova-natierka-s-cesnakom-a-bylinkami", "Syrová nátierka s cesnakom", null, "cesnakova-natierka-so-smotanovym-syrom"],
  ["cesnakova-polievka", "Cesnaková polievka so zemiakmi", null, "zemiakovo-cesnakova-polievka"],
  ["cestoviny-pesto-genovese", "Domáce vaječné cestoviny", "Cestoviny", "cestoviny-s-cicerom-a-rozmarinom"],
  ["cestoviny-quattro-formaggi", null, null, "pizza-quattro-formaggi"],
  ["cestoviny-s-brokolicou-a-cesnakom", "Cestoviny s brokolicou, cesnakom a ančovičkami", null, "cestoviny-s-brokolicou-cesnakom-a-citronom"],
  ["cestoviny-s-cesnakovymi-krevetami-a-citronom", null, null, "cestoviny-s-krevetami-a-cesnakovym-maslom"],
  ["cestoviny-s-cuketou-a-citronom", "Cestoviny s cuketou a sušenými paradajkami", null, "cestoviny-s-cuketou-matou-a-fetou", "cestoviny-s-fetou-a-cuketou"],
  ["cestoviny-s-tekvicou-a-salviou", "Cestoviny s tekvicou hokkaido a slaninou", null, "cestoviny-s-tekvicovymi-semienkami-a-fetou"],
  ["cezar-salat-s-kuracim-masom", null, null, "cezar-salat-s-krevetami"],
  ["salat-z-peceneho-karfiolu-a-cicerku-s-kurkumou", "Cícerový šalát s pečeným karfiolom a avokádom", null, "cicerovy-salat-s-pecenou-paprikou", "karfiolovy-salat-peceny-s-tahini"],
  ["cornell-chicken", "Pomarančové kuracie (orange chicken)", null, "peri-peri-chicken"],
  ["cottage-chlebik", "Domáci kvasnicový chlieb", null, "ovsenobananovy-chlebik"],
  ["domace-tortilly", null, null, "vajcova-tortilla"],
  ["priloha-ryza-cibulka", "Dusená ryža s cibuľkou", null, "dusena-ryza-so-zeleninou"],
  ["fazulova-polievka-so-slaninou", "Fazuľová polievka s údenými rebierkami", null, "fazulova-kremova-polievka", "fazulova-polievka-bez-masa"],
  ["horuca-cokolada", "Domáca horúca čokoláda", null, "horuca-biela-cokolada"],
  ["zeleninovy-stir-fry-s-kesu", "Zeleninový stir-fry s tofu a cícerom", null, "hovadzi-stir-fry-so-zeleninou"],
  ["sabich-wrap", "Fresh wrap s hummusom a avokádom", null, "injera-vajcovy-wrap-etiopsky"],
  ["jablkova-strudla", "Jablková štrúdľa (závin)", null, "jablkovy-strudla"],
  ["priloha-ryza-jazminova", "Jazmínová ryža s bazalkou a arašidmi", null, "jazminova-ryza-s-kokosom"],
  ["karfiolova-natierka-pecena", "Pečeňová nátierka", null, "natierka-z-pecenej-cvikly-s-fetou"],
  ["marhulove-smoothie", "Ovocné smoothie s jahodami a banánom", null, "kavove-smoothie-s-bananom"],
  ["kuracie-curry-so-zemiakmi", null, null, "kuracie-curry-so-sosovicou"],
  ["morciacie-fasirky-v-paradajkovej-omacke", "Morčacie fašírky pečené v rúre", null, "morciacie-fasirky-v-kari-omacke", "morciacie-fasirky-v-tekvicovej-omacke"],
  ["natierka-z-peceneho-cesnaku", "Nátierka z pečeného cesnaku so syrom a tvarohom", null, "natierka-z-peceneho-cesnaku-a-fazule", "natierka-z-pecenej-papriky-s-cesnakom"],
  ["tuniakova-natierka-so-smotanovym-jogurtom", "Tuniaková nátierka s taveným syrom", null, "natierka-z-tuniaka-a-kukurice", "natierka-z-tuniaka-s-kaparmi", "tuniakova-natierka-s-vajcom"],
  ["zemiakovy-salat-s-vajcom-a-horcicou", "Zemiakový šalát s majonézou a hráškom", null, "nemecky-zemiakovy-salat"],
  ["ovocny-salat-s-citrusmi-a-matou", "Ovocný šalát s mangom, papájou a kiwi", null, "ovocny-salat-s-jogurtom-a-granolou", "ovocny-salat-s-medovo-limetkovym-dresingom"],
  ["ovsene-susienky-na-ranajky", null, null, "ovsene-susienky-s-cokoladou"],
  ["slane-susienky-s-parmezanom", "Kakaové sušienky so slaným karamelom", "Dezert", "ovsene-susienky-slane"],
  ["panini-kurca-pesto-mozzarella", "Panini s parmskou šunkou, mozzarellou a pestom", null, "panini-morcacie-avokado"],
  ["priloha-opekane-zemiaky", "Opekané zemiaky s klobáskou a rozmarínom", null, "zemiakove-kocky-opekane-s-paprikou"],
  ["priloha-pecene-zemiaky", "Pečené zemiaky z plechu so syrom", null, "zemiakove-kolieska-pecene-s-parmezanom", "zemiakove-wedges-pecene", "zemiaky-pecene-v-supke-s-tvarohom"],
  ["zemiakova-kasa", "Zemiaková kaša s hráškom a kukuricou", null, "priloha-zemiakova-kasa"],
  ["razny-chlieb-so-semienkami", null, null, "razny-chlieb"],
  ["rybacia-polievka", null, null, "rybacia-kari-polievka"],
  ["salat-z-pecenej-mrkvy-s-fetou", "Šalát z pečenej cvikly s fetou a hovädzím", null, "salat-z-peceneho-bataty-s-fetou"],
  ["sampinonova-polievka-so-smotanou", "Šampiňónová polievka so zemiakmi", null, "sampinonova-polievka-s-kari"],
  ["skoricove-jablka-pecene", "Pečené jablká s hrozienkami a škoricou", null, "skoricove-jablkove-tasticky-pecene"],
  ["studeny-cestovinovy-salat-feta-oliv", "Studený cestovinový šalát s uhorkou a syrom", null,
    "studeny-cestovinovy-salat-s-hraskom-a-matou", "studeny-cestovinovy-salat-s-kuracim-a-curry",
    "studeny-cestovinovy-salat-so-zelenym-pestom", "studeny-rezancovy-salat-s-kokosom-a-limetkou",
    "studeny-rezancovy-salat-s-krevetami-a-mangom"],
  ["toast-s-hummusom-a-vajcom", "Zapekaný toast so šunkou, syrom a vajcom", null, "tiropita-toast-fetovy"],
  ["vajickova-natierka", null, null, "vajickova-natierka-s-kaparmi"],
  ["zapekane-cestoviny-so-spenatom-a-ricottou", "Zapekané cestoviny s morčacím mäsom a šampiňónmi", null, "zapekane-cestoviny-s-karfiolom-a-syrom"],
];

const R = L.nacitaj();
const podlaId = Object.fromEntries(R.map(r => [r.id, r]));
const remap = {};
let zmazane = 0, premenovane = 0;

for (const [keep, novyNazov, novaKat, ...del] of SKUPINY) {
  const k = podlaId[keep];
  if (!k) { console.error("CHÝBA ponechaný recept:", keep); continue; }
  if (L.jeSnack(k)) { console.error("preskakujem Snack:", keep); continue; }
  if (novyNazov && k.nazov !== novyNazov) { k.nazov = novyNazov; premenovane++; }
  if (novaKat) k.kategoria = novaKat;
  if (!DRY && (novyNazov || novaKat)) L.zapis(k);
  for (const d of del) {
    const r = podlaId[d];
    if (!r) { console.error("CHÝBA na zmazanie:", d); continue; }
    if (L.jeSnack(r)) { console.error("nemažem Snack:", d); continue; }
    remap[d] = keep;
    if (!DRY) L.zmaz(r);
    zmazane++;
  }
}

// prepis odkazov v jedálničkoch
let opravene = 0;
const JD = path.join(__dirname, "..", "jedalnicky");
for (const f of fs.readdirSync(JD).filter(x => x.endsWith(".json"))) {
  const p = path.join(JD, f), txt = fs.readFileSync(p, "utf8");
  const j = JSON.parse(txt);
  let zmena = false;
  for (const den of Object.values(j.plan || {}))
    for (const [slot, v] of Object.entries(den)) {
      if (Array.isArray(v)) { v.forEach((x, i) => { if (remap[x]) { v[i] = remap[x]; zmena = true; opravene++; } }); }
      else if (remap[v]) { den[slot] = remap[v]; zmena = true; opravene++; }
    }
  const ind = (txt.match(/\n([ \t]*)"/) || [, " "])[1].length || 1;
  if (zmena && !DRY) fs.writeFileSync(p, JSON.stringify(j, null, ind) + "\n", "utf8");
}

console.log((DRY ? "[DRY] " : "") + "zmazaných: " + zmazane + " · premenovaných: " + premenovane +
  " · opravených odkazov v jedálničkoch: " + opravene);
if (process.argv.includes("--zoznam")) console.log(JSON.stringify(remap, null, 1));
