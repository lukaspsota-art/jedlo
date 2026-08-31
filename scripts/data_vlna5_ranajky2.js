// Vlna 5, druhá dávka raňajok — 24 receptov, VÝHRADNE na iné bázy než toast.
//
// Po prvej dávke vyzeralo rozloženie sendvičových raňajok v kcal-okne slotu takto:
//   toast 37 · tortilla 20 · rožok 19 · bageta 16 · bagel 10
// Toast tvoril 36 % poolu, hoci `report-generator-doladenie.md` §2 hovorí výslovne
// „toast nepridávať". Táto dávka preto pridáva len bagel (+8), bagetu (+7),
// rožok/žemľu/croissant (+5) a tortillu (+4) — po nej je toast na ~30 % a pravidlo
// „iná báza na blok" má na každú z piatich tried aspoň 18 kandidátov.
//
// POZOR na tagy: `_ranajkyBazaVypocet` triedi podľa názvu + surovín + TAGOV a poradie
// vzoriek je tortilla → bagel → bageta → toast → rožok. Tag „sendvič" obsahuje reťazec
// „sendvic", takže na recepte z rožka/žemle/croissantu by ho preklopil do triedy „toast".
// Rožkové recepty preto nesú tag „obložené pečivo" (rovnako ako prvá dávka), nie „sendvič".
"use strict";
const i = (nazov, mnozstvo, jednotka, poznamka) => ({ nazov, mnozstvo, jednotka, poznamka: poznamka || "" });
const T = ["raňajky"];

module.exports = [

// ── BAGEL (8) ─────────────────────────────────────────────────────────────────
{ id:"ranajkovy-bagel-s-tvarohom-a-cviklou", nazov:"Celozrnný bagel s tvarohom a cviklou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Celozrnný bagel, tvarohová nátierka a nastrúhaná cvikla — sýte raňajky s výraznou farbou.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Tvaroh",200,"g"),i("Cvikla",120,"g",'varená'),i("Pažítka",10,"g"),i("Horčica",10,"g")],
  postup:["Rozmiešaj tvaroh s horčicou a nasekanou pažítkou do hladkej nátierky.","Nastrúhaj varenú cviklu nahrubo a zľahka ju vytlač, aby nátierku nerozmočila.","Prekroj bagely, natri ich tvarohom a poukladaj navrch cviklu."],
  tipy:"Cviklu si uvar do zásoby na celý týždeň — v chladničke vydrží päť dní.", tagy:[...T,"sendvič","bagel","vegetariánske"] },

{ id:"ranajkovy-bagel-s-morcacou-sunkou-a-uhorkou", nazov:"Celozrnný bagel s morčacou šunkou a uhorkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Morčacia šunka",
  popis:"Chudá morčacia šunka a chrumkavá uhorka v celozrnnom bageli — vyše 8 g bielkovín na 100 kcal.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Morčacia šunka",120,"g"),i("Uhorka",100,"g"),i("Horčica",10,"g"),i("Ľadový šalát",30,"g")],
  postup:["Prekroj bagely a natri spodné polovice horčicou.","Nakrájaj uhorku na tenké kolieska a natrhaj šalát na menšie kúsky.","Poukladaj šunku, uhorku a šalát do bagela a prikry vrchnou polovicou."],
  tipy:"Morčacia šunka má takmer dvojnásobok bielkovín oproti bravčovej pri nižšom tuku.", tagy:[...T,"sendvič","bagel","vysoký obsah bielkovín"] },

{ id:"ranajkovy-bagel-s-tuniakovou-natierkou", nazov:"Celozrnný bagel s tuniakovou nátierkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tuniak",
  popis:"Tuniak s gréckym jogurtom a kaparami namiesto majonézy — bielkoviny bez zbytočného tuku.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Tuniak v konzerve",150,"g"),i("Grécky jogurt",60,"g"),i("Jarná cibuľka",30,"g"),i("Kapary",10,"g")],
  postup:["Sceď tuniak a poriadne ho nechaj odkvapkať.","Rozmiešaj ho s jogurtom, nasekanou cibuľkou a posekanými kaparami.","Prekroj bagely a rozdeľ do nich nátierku."],
  tipy:"Tuniak vo vlastnej šťave má o tretinu menej kalórií než ten v oleji.", tagy:[...T,"sendvič","bagel","ryba","vysoký obsah bielkovín"] },

{ id:"ranajkovy-bagel-s-bryndzou-a-paprikou", nazov:"Celozrnný bagel s bryndzou a paprikou", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Bryndza",
  popis:"Bryndzová nátierka so smotanou a sladkou paprikou v celozrnnom bageli.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Bryndza",90,"g"),i("Paprika červená",120,"g"),i("Jarná cibuľka",30,"g"),i("Kyslá smotana",30,"g")],
  postup:["Rozmiešaj bryndzu s kyslou smotanou do roztierateľnej nátierky.","Nakrájaj papriku na tenké prúžky a nasekaj jarnú cibuľku.","Natri bagely bryndzou, posyp paprikou a cibuľkou a prikry vrchnou polovicou."],
  tipy:"Bryndza je sama o sebe slaná — soľ do nátierky nepridávaj.", tagy:[...T,"sendvič","bagel","slovenská"] },

{ id:"ranajkovy-bagel-s-vajcom-a-klickami", nazov:"Celozrnný bagel s vajcom a klíčkami", kat:"Raňajky", kuchyna:"Slovenská", cas:"14 min", hlavna:"Vajcia",
  popis:"Natvrdo uvarené vajcia, horčica a klíčky — jednoduchý bagel s chrumkavým vrchom.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Vajcia",3,"ks"),i("Klíčky",40,"g"),i("Horčica",10,"g"),i("Rukola",20,"g")],
  postup:["Uvar vajcia natvrdo, asi desať minút, a schlaď ich v studenej vode.","Olúp ich a nakrájaj na kolieska.","Natri prekrojené bagely horčicou, poukladaj vajcia, rukolu a klíčky a prikry."],
  tipy:"Vajcia si uvar večer predtým — ráno ich stačí len nakrájať.", tagy:[...T,"sendvič","bagel","vajcia","vegetariánske"] },

{ id:"ranajkovy-bagel-s-cottage-a-kyslou-kapustou", nazov:"Celozrnný bagel s cottage syrom a kyslou kapustou", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Cottage syr",
  popis:"Netradičná, ale výborná dvojica — jemný cottage syr a kyslá kapusta so slnečnicovými semienkami.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Cottage syr",200,"g"),i("Kyslá kapusta",100,"g"),i("Jarná cibuľka",20,"g"),i("Slnečnicové semienka",10,"g")],
  postup:["Sceď kyslú kapustu a nakrájaj ju nakrátko, aby sa dala jesť v sendviči.","Rozotri cottage syr na prekrojené bagely.","Poukladaj navrch kapustu, posyp cibuľkou a slnečnicovými semienkami."],
  tipy:"Kyslá kapusta prináša vlákninu aj mliečne kvasenie — nepreplachuj ju vodou, stačí sceď.", tagy:[...T,"sendvič","bagel","vláknina"] },

{ id:"ranajkovy-bagel-s-tvarohom-a-jahodami", nazov:"Celozrnný bagel s tvarohom a jahodami", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Tvaroh",
  popis:"Sladká verzia bagela — tvaroh, čerstvé jahody a lyžica medu.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Tvaroh",200,"g"),i("Jahody",120,"g"),i("Med",15,"g")],
  postup:["Rozmiešaj tvaroh s medom do hladkého krému.","Nakrájaj jahody na plátky.","Natri bagely tvarohom a poukladaj navrch jahody."],
  tipy:"Mimo sezóny fungujú aj mrazené jahody — nechaj ich rozmraziť a sceď šťavu.", tagy:[...T,"sendvič","bagel","sladké"] },

{ id:"ranajkovy-bagel-so-sunkou-a-eidamom", nazov:"Celozrnný bagel so šunkou a eidamom", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Šunka",
  popis:"Klasika bez rozmýšľania — šunka, eidam, uhorka a horčica v celozrnnom bageli.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Šunka",100,"g"),i("Syr eidam",40,"g"),i("Uhorka",80,"g"),i("Horčica",10,"g")],
  postup:["Prekroj bagely a natri ich horčicou.","Nakrájaj uhorku na kolieska a syr na tenké plátky.","Poukladaj šunku, syr a uhorku a prikry vrchnou polovicou bagela."],
  tipy:"Bagel na dve minúty do hriankovača — kôrka schrumká a syr sa zľahka rozpustí.", tagy:[...T,"sendvič","bagel","rýchle"] },

// ── BAGETA (7) ────────────────────────────────────────────────────────────────
{ id:"ranajkova-bageta-s-tuniakom-a-cibulkou", nazov:"Celozrnná bageta s tuniakom a cibuľkou", kat:"Raňajky", kuchyna:"Stredomorská", cas:"8 min", hlavna:"Tuniak",
  popis:"Tuniak s jogurtom a jarnou cibuľkou v celozrnnej bagete — takmer 10 g bielkovín na 100 kcal.",
  ing:[i("Celozrnná bageta",140,"g"),i("Tuniak v konzerve",150,"g"),i("Grécky jogurt",50,"g"),i("Jarná cibuľka",30,"g"),i("Uhorka",80,"g")],
  postup:["Sceď tuniak a rozmiešaj ho s jogurtom a nasekanou cibuľkou.","Prekroj bagetu pozdĺžne a rozdeľ ju na dve porcie.","Naplň ju tuniakovou zmesou a poukladaj navrch kolieska uhorky."],
  tipy:"Zvyšnú zmes odlož do chladničky — na druhý deň je ešte chutnejšia.", tagy:[...T,"sendvič","bageta","ryba","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-so-sunkou-a-chrenom", nazov:"Celozrnná bageta so šunkou a chrenom", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Šunka",
  popis:"Šunka, maslo a lyžička chrenu — bageta, ktorá zobudí aj v pondelok.",
  ing:[i("Celozrnná bageta",140,"g"),i("Šunka",120,"g"),i("Chren",20,"g"),i("Ľadový šalát",40,"g"),i("Maslo",10,"g")],
  postup:["Prekroj bagetu pozdĺžne a natri ju tenkou vrstvou masla.","Rozmiešaj chren s maslom alebo ho natri zvlášť podľa toho, ako ostré to máš rád.","Poukladaj šunku a natrhaný šalát a bagetu zavri."],
  tipy:"Chren pridávaj až tesne pred jedlom — na vzduchu rýchlo stráca ostrosť.", tagy:[...T,"sendvič","bageta","rýchle"] },

{ id:"ranajkova-bageta-s-vajeckovou-natierkou", nazov:"Celozrnná bageta s vajíčkovou nátierkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Vajcia",
  popis:"Vajíčková nátierka s gréckym jogurtom a pažítkou v celozrnnej bagete.",
  ing:[i("Celozrnná bageta",140,"g"),i("Vajcia",3,"ks"),i("Grécky jogurt",50,"g"),i("Pažítka",10,"g"),i("Horčica",10,"g")],
  postup:["Uvar vajcia natvrdo a schlaď ich v studenej vode.","Roztlač ich vidličkou a zmiešaj s jogurtom, horčicou a nasekanou pažítkou.","Prekroj bagetu, rozdeľ ju na dve porcie a naplň nátierkou."],
  tipy:"Jogurt namiesto majonézy ušetrí asi 90 kcal na porciu.", tagy:[...T,"sendvič","bageta","vajcia","vegetariánske"] },

{ id:"ranajkova-bageta-s-mozzarellou-a-rukolou", nazov:"Celozrnná bageta s mozzarellou a rukolou", kat:"Raňajky", kuchyna:"Talianska", cas:"7 min", hlavna:"Mozzarella",
  popis:"Mozzarella, paradajky a rukola s kvapkou olivového oleja — talianske ráno v bagete.",
  ing:[i("Celozrnná bageta",140,"g"),i("Mozzarella",100,"g"),i("Paradajky",120,"g"),i("Rukola",20,"g"),i("Olivový olej",5,"g")],
  postup:["Nakrájaj mozzarellu a paradajky na plátky a nechaj ich chvíľu odkvapkať.","Prekroj bagetu pozdĺžne a pokvapkaj ju olivovým olejom.","Poukladaj mozzarellu, paradajky a rukolu a bagetu zavri."],
  tipy:"Paradajky osoľ zvlášť pár minút vopred — pustia šťavu a nerozmočia pečivo.", tagy:[...T,"sendvič","bageta","vegetariánske"] },

{ id:"ranajkova-bageta-s-morcacou-sunkou-a-rukolou", nazov:"Celozrnná bageta s morčacou šunkou a rukolou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Morčacia šunka",
  popis:"Ľahká bageta s chudou morčacou šunkou, uhorkou a rukolou.",
  ing:[i("Celozrnná bageta",140,"g"),i("Morčacia šunka",120,"g"),i("Uhorka",100,"g"),i("Horčica",10,"g"),i("Rukola",20,"g")],
  postup:["Prekroj bagetu pozdĺžne a natri ju horčicou.","Nakrájaj uhorku na tenké kolieska.","Poukladaj šunku, uhorku a rukolu a bagetu zavri."],
  tipy:"Rukola dá bagete horkastý tón — ak ju nemáš, funguje aj poľníček.", tagy:[...T,"sendvič","bageta","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-s-lososom-a-koprom", nazov:"Celozrnná bageta s údeným lososom a kôprom", kat:"Raňajky", kuchyna:"Škandinávska", cas:"8 min", hlavna:"Údený losos",
  popis:"Údený losos, žervé a kôpor — sviatočnejšia bageta na víkendové ráno.",
  ing:[i("Celozrnná bageta",140,"g"),i("Údený losos",100,"g"),i("Žervé",60,"g"),i("Uhorka",60,"g"),i("Kôpor",6,"g")],
  postup:["Natri prekrojenú bagetu žervé a posyp ju nasekaným kôprom.","Nakrájaj uhorku na tenké pásiky škrabkou na zeleninu.","Poukladaj plátky lososa a uhorku a bagetu zavri."],
  tipy:"Losos rozbaľ až tesne pred prípravou — na vzduchu rýchlo osychá.", tagy:[...T,"sendvič","bageta","ryba"] },

{ id:"ranajkova-bageta-s-vajcom-a-avokadom", nazov:"Celozrnná bageta s vajcom a avokádom", kat:"Raňajky", kuchyna:"Slovenská", cas:"14 min", hlavna:"Avokádo",
  popis:"Roztlačené avokádo, uvarené vajce a rukola v celozrnnej bagete.",
  ing:[i("Celozrnná bageta",140,"g"),i("Vajcia",2,"ks"),i("Avokádo",70,"g"),i("Rukola",20,"g"),i("Citrónová šťava",10,"g")],
  postup:["Uvar vajcia natvrdo a nechaj ich vychladnúť v studenej vode.","Roztlač avokádo vidličkou, pokvapkaj citrónovou šťavou a osoľ.","Natri avokádo na prekrojenú bagetu, poukladaj nakrájané vajcia a rukolu."],
  tipy:"Citrónová šťava drží avokádo zelené — bez nej do desiatich minút zhnedne.", tagy:[...T,"sendvič","bageta","vegetariánske","vláknina"] },

// ── ROŽOK / ŽEMĽA / CROISSANT (5) ────────────────────────────────────────────
{ id:"ranajkovy-grahamovy-rozok-s-tuniakom", nazov:"Grahamový rožok s tuniakom a uhorkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tuniak",
  popis:"Grahamový rožok s tuniakovou nátierkou na jogurte — 10 g bielkovín na 100 kcal.",
  ing:[i("Grahamový rožok",2,"ks"),i("Tuniak v konzerve",150,"g"),i("Grécky jogurt",50,"g"),i("Uhorka",80,"g"),i("Jarná cibuľka",20,"g")],
  postup:["Sceď tuniak a rozmiešaj ho s jogurtom a nasekanou cibuľkou.","Prekroj rožky a naplň ich tuniakovou zmesou.","Poukladaj navrch kolieska uhorky a rožok zavri."],
  tipy:"Grahamový rožok má proti bielemu takmer dvojnásobok vlákniny.", tagy:[...T,"obložené pečivo","rožok","ryba","vysoký obsah bielkovín"] },

{ id:"ranajkovy-grahamovy-rozok-s-bryndzou", nazov:"Grahamový rožok s bryndzou a reďkovkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Bryndza",
  popis:"Bryndzová nátierka so smotanou, reďkovkou a pažítkou na grahamovom rožku.",
  ing:[i("Grahamový rožok",2,"ks"),i("Bryndza",100,"g"),i("Reďkovka",60,"g"),i("Pažítka",10,"g"),i("Kyslá smotana",30,"g")],
  postup:["Rozmiešaj bryndzu s kyslou smotanou do hladkej nátierky.","Nakrájaj reďkovky na tenké kolieska a nasekaj pažítku.","Natri rožky bryndzou a poukladaj navrch reďkovku s pažítkou."],
  tipy:"Bryndzu nechaj chvíľu mimo chladničky — vlažná sa roztiera oveľa ľahšie.", tagy:[...T,"obložené pečivo","rožok","slovenská"] },

{ id:"ranajkova-zemla-s-vajcom-a-paradajkou", nazov:"Celozrnná žemľa s vajcom a paradajkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Vajcia",
  popis:"Uvarené vajcia, paradajka a pažítka na celozrnnej žemli s maslom.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Vajcia",3,"ks"),i("Paradajky",120,"g"),i("Pažítka",10,"g"),i("Maslo",10,"g")],
  postup:["Uvar vajcia natvrdo a schlaď ich v studenej vode.","Prekroj žemle a natri ich tenkou vrstvou masla.","Poukladaj kolieska vajec a paradajky, posyp pažítkou a osoľ."],
  tipy:"Paradajku pred ukladaním osuš papierovou utierkou, aby žemľa nezvlhla.", tagy:[...T,"obložené pečivo","rožok","vajcia","vegetariánske"] },

{ id:"ranajkova-zemla-s-morcacou-sunkou", nazov:"Celozrnná žemľa s morčacou šunkou a chrenom", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Morčacia šunka",
  popis:"Chudá morčacia šunka s chrenom a šalátom na celozrnnej žemli.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Morčacia šunka",120,"g"),i("Chren",20,"g"),i("Ľadový šalát",40,"g"),i("Maslo",10,"g")],
  postup:["Prekroj žemle a natri ich maslom.","Rozotri po masle tenkú vrstvu chrenu.","Poukladaj šunku a natrhaný šalát a žemľu zavri."],
  tipy:"Chren kupuj v malom pohári — otvorený vydrží ostrý len pár týždňov.", tagy:[...T,"obložené pečivo","rožok","vysoký obsah bielkovín"] },

{ id:"ranajkovy-croissant-s-cottage-a-paradajkou", nazov:"Croissant s cottage syrom a paradajkou", kat:"Raňajky", kuchyna:"Francúzska", cas:"7 min", hlavna:"Cottage syr",
  popis:"Slaná verzia croissantu — cottage syr, paradajka a rukola.",
  ing:[i("Croissant",2,"ks"),i("Cottage syr",180,"g"),i("Paradajky",100,"g"),i("Rukola",20,"g")],
  postup:["Prekroj croissanty pozdĺžne, ale neprerezávaj ich úplne.","Rozotri do nich cottage syr a osoľ.","Poukladaj kolieska paradajky a rukolu a croissant zľahka stlač."],
  tipy:"Croissant na tri minúty do rúry na 160 °C — chutí ako od pekára.", tagy:[...T,"obložené pečivo","rožok","vegetariánske"] },

// ── TORTILLA / WRAP (4) ──────────────────────────────────────────────────────
{ id:"ranajkovy-wrap-s-vajcom-a-kyslou-kapustou", nazov:"Raňajkový wrap s vajcom a kyslou kapustou", kat:"Raňajky", kuchyna:"Slovenská", cas:"12 min", hlavna:"Vajcia",
  popis:"Miešané vajcia s kyslou kapustou a cibuľkou zabalené do celozrnnej tortilly.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Vajcia",3,"ks"),i("Kyslá kapusta",100,"g"),i("Jarná cibuľka",20,"g"),i("Olivový olej",5,"g")],
  postup:["Sceď kyslú kapustu a nakrájaj ju nakrátko.","Rozšľahaj vajcia, nalej ich na rozohriaty olej a miešaj do hustej zmesi.","Rozdeľ vajcia na tortilly, posyp kapustou a cibuľkou a wrap zroluj."],
  tipy:"Kapusta dodá wrapu kyslosť aj vlákninu — nahrádza tak nakladané uhorky.", tagy:[...T,"sendvič","wrap","vajcia","vláknina"] },

{ id:"ranajkovy-wrap-s-morcacou-sunkou-a-cviklou", nazov:"Raňajkový wrap s morčacou šunkou a cviklou", kat:"Raňajky", kuchyna:"Slovenská", cas:"10 min", hlavna:"Morčacia šunka",
  popis:"Morčacia šunka, varená cvikla a jogurtový dresing v celozrnnej tortille.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Morčacia šunka",120,"g"),i("Cvikla",100,"g",'varená'),i("Grécky jogurt",50,"g"),i("Rukola",20,"g")],
  postup:["Nastrúhaj varenú cviklu nahrubo a zľahka ju vytlač.","Natri tortilly gréckym jogurtom.","Poukladaj šunku, cviklu a rukolu a wrap pevne zroluj."],
  tipy:"Cviklu strúhaj v rukaviciach — z rúk schádza pomalšie než z dosky.", tagy:[...T,"sendvič","wrap","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-s-tvarohom-a-kapustou", nazov:"Raňajkový wrap s tvarohom a kyslou kapustou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Tvarohová nátierka s horčicou a kyslou kapustou v celozrnnej tortille.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Tvaroh",200,"g"),i("Kyslá kapusta",100,"g"),i("Jarná cibuľka",20,"g"),i("Horčica",10,"g")],
  postup:["Rozmiešaj tvaroh s horčicou a nasekanou cibuľkou.","Sceď kapustu a nakrájaj ju nakrátko.","Rozotri tvaroh po tortillách, posyp kapustou a zroluj."],
  tipy:"Tvaroh v vaničke býva hustejší než v alobale — na wrap sa hodí lepšie.", tagy:[...T,"sendvič","wrap","vegetariánske","vláknina"] },

{ id:"ranajkove-burrito-s-vajcom-a-syrom", nazov:"Raňajkové burrito s vajcom a syrom", kat:"Raňajky", kuchyna:"Mexická", cas:"12 min", hlavna:"Vajcia",
  popis:"Miešané vajcia s paprikou a eidamom v celozrnnej tortille — teplé raňajky do ruky.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Vajcia",2,"ks"),i("Syr eidam",30,"g"),i("Paprika červená",100,"g"),i("Olivový olej",5,"g")],
  postup:["Nakrájaj papriku na malé kocky a opeč ju na oleji domäkka.","Prilej rozšľahané vajcia a miešaj, kým nezhustnú.","Rozdeľ zmes na tortilly, posyp nastrúhaným eidamom a burrito pevne zabaľ."],
  tipy:"Zabaľ burrito do alobalu — dovnútra sa nedostane vzduch a syr zostane roztopený.", tagy:[...T,"sendvič","wrap","vajcia","teplé"] }

];
