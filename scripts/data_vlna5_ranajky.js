// Vlna 5 — 63 nových raňajok. Dva ciele:
//  a) rozšíriť pool SENDVIČOVÝCH raňajok (bolo 40, z toho 32 v kcal-okne) a rozložiť ich
//     na viac báz — pravidlo „iná báza na blok" funguje len vtedy, keď je báz z čoho brať;
//  b) doplniť VYSOKOBIELKOVINOVÉ raňajky nad 8 g bielkovín na 100 kcal (bolo ich nula).
// Pozn.: `ranajkyBaza` v app.js pozná len 5 sendvičových tried (tortilla/bagel/bageta/toast/
// rožok). Pita, kváskový a ražný chlieb preto spadnú do triedy „toast" — skutočná báza
// v recepte je však iná a človek to na tanieri vidí.
"use strict";
const i = (nazov, mnozstvo, jednotka, poznamka) => ({ nazov, mnozstvo, jednotka, poznamka: poznamka || "" });
const T = ["raňajky"];

module.exports = [

// ── TORTILLA / WRAP ────────────────────────────────────────────────────────────
{ id:"ranajkovy-wrap-s-cottage-a-mrkvou", nazov:"Raňajkový wrap s cottage syrom a mrkvou", kat:"Raňajky", kuchyna:"Slovenská", cas:"10 min", hlavna:"Cottage syr",
  popis:"Celozrnná tortilla, cottage syr a nastrúhaná mrkva — hotové skôr, než sa uvarí káva.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Cottage syr",200,"g"),i("Mrkva",120,"g"),i("Rukola",30,"g"),i("Horčica",10,"g")],
  postup:["Nastrúhaj mrkvu nahrubo a osuš ju v utierke, aby wrap nerozmočila.","Natri tortilly tenkou vrstvou horčice a rozotri po nich cottage syr.","Posyp mrkvou a rukolou, zroluj a prekroj napoly."],
  tipy:"Mrkvu strúhaj až tesne pred plnením — postrúhaná rýchlo pustí vodu.", tagy:[...T,"sendvič","wrap","rýchle","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-s-tuniakom-a-kukuricou", nazov:"Raňajkový wrap s tuniakom a kukuricou", kat:"Raňajky", kuchyna:"Stredomorská", cas:"10 min", hlavna:"Tuniak",
  popis:"Sýty wrap s tuniakom, kukuricou a gréckym jogurtom namiesto majonézy.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Tuniak v konzerve",180,"g"),i("Kukurica sladká",80,"g"),i("Grécky jogurt",60,"g"),i("Jarná cibuľka",30,"g")],
  postup:["Sceď tuniak aj kukuricu a nechaj ich odkvapkať.","Rozmiešaj tuniak s jogurtom a nasekanou jarnou cibuľkou.","Rozotri zmes po tortillách, posyp kukuricou a pevne zroluj."],
  tipy:"Jogurt drží náplň pokope lepšie než majonéza a wrap nepremastí papier.", tagy:[...T,"sendvič","wrap","ryba","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-s-kuracim-a-paprikou", nazov:"Raňajkový wrap s kuracím mäsom a paprikou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Kuracie prsia",
  popis:"Wrap s opečeným kuracím mäsom, paprikou a jogurtovým dresingom.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Kuracie prsia",180,"g"),i("Paprika červená",120,"g"),i("Grécky jogurt",50,"g"),i("Olivový olej",5,"g")],
  postup:["Nakrájaj kuracie prsia na tenké prúžky a osoľ ich.","Opeč mäso na kvapke oleja dozlatista, asi päť minút.","Natri tortilly jogurtom, rozdeľ na ne mäso a nakrájanú papriku a zroluj."],
  tipy:"Mäso opeč večer predtým — ráno ho len rozdelíš do tortíl.", tagy:[...T,"sendvič","wrap","mäso","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-s-vajcom-a-spenatom", nazov:"Raňajkový wrap s vajcom a špenátom", kat:"Raňajky", kuchyna:"Slovenská", cas:"12 min", hlavna:"Vajcia",
  popis:"Miešané vajce so špenátom a syrom zabalené do celozrnnej tortilly.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Vajcia",2,"ks"),i("Špenát",80,"g"),i("Syr eidam",40,"g"),i("Maslo",5,"g")],
  postup:["Rozšľahaj vajcia so štipkou soli.","Orestuj špenát na masle, kým nespadne, a prilej vajcia.","Premiešaj do hustej zmesi, rozdeľ na tortilly, posyp nastrúhaným syrom a zabaľ."],
  tipy:"Špenát pred restovaním osuš, inak vajcia zvodnatejú.", tagy:[...T,"sendvič","wrap","vajcia"] },

{ id:"ranajkovy-wrap-s-hummusom-a-zeleninou", nazov:"Raňajkový wrap s hummusom a zeleninou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"10 min", hlavna:"Hummus",
  popis:"Bezmäsitý wrap s hummusom a chrumkavou zeleninou.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Hummus",120,"g"),i("Mrkva",100,"g"),i("Uhorka",100,"g"),i("Ľadový šalát",40,"g")],
  postup:["Nakrájaj mrkvu a uhorku na tenké prúžky.","Rozotri hummus po tortillách až k okrajom.","Vylož zeleninu s natrhaným šalátom do stredu a wrap pevne zroluj."],
  tipy:"Zabaľ wrap do papiera na pečenie — do práce dorazí celý.", tagy:[...T,"sendvič","wrap","vegetariánske","vláknina"] },

{ id:"ranajkovy-wrap-s-bryndzou-a-redkovkou", nazov:"Raňajkový wrap s bryndzou a reďkovkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Bryndza",
  popis:"Slovenská klasika v modernom obale — bryndza, reďkovka a pažítka v tortille.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Bryndza",100,"g"),i("Reďkovka",80,"g"),i("Pažítka",10,"g"),i("Kyslá smotana",30,"g")],
  postup:["Rozmiešaj bryndzu so smotanou do roztierateľnej nátierky.","Nakrájaj reďkovky na tenké kolieska a nasekaj pažítku.","Natri bryndzu na tortilly, posyp reďkovkou a pažítkou a zroluj."],
  tipy:"Bryndza je slaná — soľ už nepridávaj.", tagy:[...T,"sendvič","wrap","slovenská"] },

{ id:"ranajkovy-wrap-s-udenym-lososom", nazov:"Raňajkový wrap s údeným lososom", kat:"Raňajky", kuchyna:"Škandinávska", cas:"8 min", hlavna:"Údený losos",
  popis:"Sviatočnejší wrap s lososom, smotanovým syrom a kôprom.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Údený losos",100,"g"),i("Žervé",60,"g"),i("Uhorka",80,"g"),i("Kôpor",6,"g")],
  postup:["Natri tortilly žervé a posyp nasekaným kôprom.","Vylož plátky lososa a uhorku nakrájanú na tenké prúžky.","Zroluj wrap natesno a prekroj ho šikmo napoly."],
  tipy:"Losos rozbaľ až tesne pred prípravou, na vzduchu rýchlo osychá.", tagy:[...T,"sendvič","wrap","ryba"] },

{ id:"ranajkovy-wrap-s-morcacou-sunkou-a-syrom", nazov:"Raňajkový wrap s morčacou šunkou a syrom", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Morčacia šunka",
  popis:"Rýchly wrap z bielej tortilly, morčacej šunky a eidamu.",
  ing:[i("Tortilla",2,"ks"),i("Morčacia šunka",150,"g"),i("Syr eidam",40,"g"),i("Ľadový šalát",40,"g"),i("Horčica",10,"g")],
  postup:["Natri tortilly horčicou.","Poukladaj na ne šunku, plátky syra a natrhaný šalát.","Zroluj wrap a prekroj ho napoly."],
  tipy:"Morčacia šunka má menej tuku než bravčová a wrap nezmastí.", tagy:[...T,"sendvič","wrap","mäso"] },

{ id:"ranajkove-burrito-s-fazulou-a-vajcom", nazov:"Raňajkové burrito s fazuľou a vajcom", kat:"Raňajky", kuchyna:"Mexická", cas:"15 min", hlavna:"Fazuľa",
  popis:"Mexické raňajky: miešané vajce, fazuľa a paradajka v celozrnnej tortille.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Fazuľa červená",160,"g"),i("Vajcia",2,"ks"),i("Paradajky",80,"g"),i("Cibuľa červená",40,"g")],
  postup:["Prepláchni fazuľu pod studenou vodou a nechaj ju odkvapkať.","Orestuj nasekanú cibuľu, pridaj fazuľu s nakrájanou paradajkou a krátko prehrej.","Rozšľahaj vajcia, prilej ich k fazuli, premiešaj do hustnutia a naplň tortilly."],
  tipy:"Burrito zabaľ najprv zboku a potom zrolu — náplň ti nevytečie.", tagy:[...T,"sendvič","wrap","vláknina","strukoviny"] },

// ── BAGETA ─────────────────────────────────────────────────────────────────────
{ id:"ranajkova-bageta-s-cottage-a-paradajkou", nazov:"Raňajková bageta s cottage syrom a paradajkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Cottage syr",
  popis:"Celozrnná bageta s cottage syrom, paradajkou a bazalkou.",
  ing:[i("Celozrnná bageta",140,"g"),i("Cottage syr",200,"g"),i("Paradajky",120,"g"),i("Bazalka",4,"g"),i("Olivový olej",5,"g")],
  postup:["Prekroj bagetu pozdĺžne a zľahka ju opeč v hriankovači.","Rozotri po nej cottage syr.","Poukladaj kolieska paradajok, posyp natrhanou bazalkou a pokvapkaj olejom."],
  tipy:"Paradajky pred vyložením osoľ a nechaj chvíľu odstáť — zvýrazní to chuť.", tagy:[...T,"sendvič","bageta","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-s-tvarohom-a-redkovkou", nazov:"Raňajková bageta s tvarohom a reďkovkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Tvarohová nátierka s pažítkou na celozrnnej bagete, k tomu chrumkavá reďkovka.",
  ing:[i("Celozrnná bageta",120,"g"),i("Tvaroh",300,"g"),i("Reďkovka",80,"g"),i("Pažítka",10,"g"),i("Horčica",10,"g")],
  postup:["Rozmiešaj tvaroh s horčicou a nasekanou pažítkou a osoľ.","Prekroj bagetu a natri ju hrubou vrstvou nátierky.","Poukladaj na vrch kolieska reďkoviek."],
  tipy:"Tvaroh je najlacnejší zdroj bielkovín v obchode — 250 g má okolo 30 g bielkovín.", tagy:[...T,"sendvič","bageta","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-s-vajcom-a-sunkou", nazov:"Raňajková bageta s vajcom a šunkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Vajcia",
  popis:"Bageta s vajcom natvrdo, šunkou a listom šalátu.",
  ing:[i("Bageta",140,"g"),i("Vajcia",2,"ks"),i("Šunka",60,"g"),i("Ľadový šalát",30,"g"),i("Horčica",10,"g")],
  postup:["Uvar vajcia natvrdo, desať minút od varu, a schlaď ich v studenej vode.","Prekroj bagetu, natri ju horčicou a vylož list šalátu.","Poukladaj šunku a kolieska vajca a bagetu prikry."],
  tipy:"Vajcia uvar na celý týždeň naraz — v škrupine vydržia v chladničke päť dní.", tagy:[...T,"sendvič","bageta","vajcia"] },

{ id:"ranajkova-bageta-s-kuracim-a-avokadom", nazov:"Raňajková bageta s kuracím mäsom a avokádom", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Kuracie prsia",
  popis:"Celozrnná bageta s opečeným kuracím mäsom, avokádom a rukolou.",
  ing:[i("Celozrnná bageta",140,"g"),i("Kuracie prsia",140,"g"),i("Avokádo",60,"g"),i("Rukola",30,"g"),i("Olivový olej",5,"g")],
  postup:["Nakrájaj kuracie prsia na plátky, osoľ ich a opeč na kvapke oleja.","Roztlač avokádo vidličkou a rozotri ho po prekrojenej bagete.","Poukladaj mäso s rukolou a bagetu prikry."],
  tipy:"Avokádo pokvapkaj citrónom, aby na reze nestmavlo.", tagy:[...T,"sendvič","bageta","mäso","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-caprese", nazov:"Raňajková bageta caprese", kat:"Raňajky", kuchyna:"Talianska", cas:"8 min", hlavna:"Mozzarella",
  popis:"Bageta s mozzarellou, paradajkou a bazalkou — tri suroviny, hotovo.",
  ing:[i("Bageta",140,"g"),i("Mozzarella",100,"g"),i("Paradajky",120,"g"),i("Bazalka",6,"g"),i("Olivový olej",10,"g")],
  postup:["Nakrájaj mozzarellu a paradajky na kolieska.","Prekroj bagetu a poukladaj na ňu striedavo syr a paradajku.","Posyp natrhanou bazalkou, pokvapkaj olejom a osoľ."],
  tipy:"Mozzarellu nechaj pred krájaním odkvapkať na papierovej utierke.", tagy:[...T,"sendvič","bageta","vegetariánske"] },

{ id:"ranajkova-bageta-s-bryndzou-a-cibulkou", nazov:"Raňajková bageta s bryndzou a jarnou cibuľkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Bryndza",
  popis:"Celozrnná bageta s bryndzovou nátierkou a jarnou cibuľkou.",
  ing:[i("Celozrnná bageta",140,"g"),i("Bryndza",120,"g"),i("Jarná cibuľka",40,"g"),i("Kyslá smotana",30,"g"),i("Paprika červená",60,"g")],
  postup:["Rozmiešaj bryndzu so smotanou do hladkej nátierky.","Nasekaj jarnú cibuľku a vmiešaj polovicu do bryndze.","Natri bagetu, posyp zvyškom cibuľky a doplň prúžkami papriky."],
  tipy:"Ak je bryndza príliš tuhá, zjemni ju lyžicou mlieka.", tagy:[...T,"sendvič","bageta","slovenská"] },

{ id:"ranajkova-bageta-s-hummusom-a-paprikou", nazov:"Raňajková bageta s hummusom a paprikou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"8 min", hlavna:"Hummus",
  popis:"Celozrnná bageta s hummusom, pečenou paprikou a rukolou.",
  ing:[i("Celozrnná bageta",140,"g"),i("Hummus",120,"g"),i("Paprika červená",120,"g"),i("Rukola",20,"g"),i("Sezamové semienka",6,"g")],
  postup:["Prekroj bagetu a natri ju hrubou vrstvou hummusu.","Nakrájaj papriku na tenké prúžky a poukladaj ju na hummus.","Posyp rukolou a sezamom a bagetu prikry."],
  tipy:"Hummus si sprav z konzervy cíceru — vyjde lacnejšie než kúpený.", tagy:[...T,"sendvič","bageta","vegetariánske","vláknina"] },

// ── ROŽOK / ŽEMĽA / CROISSANT ──────────────────────────────────────────────────
{ id:"ranajkovy-grahamovy-rozok-so-sunkou-a-syrom", nazov:"Grahamový rožok so šunkou a syrom", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Šunka",
  popis:"Najjednoduchšie školské raňajky — grahamový rožok, šunka, syr a uhorka.",
  ing:[i("Grahamový rožok",2,"ks"),i("Šunka",60,"g"),i("Syr eidam",40,"g"),i("Uhorka",60,"g"),i("Maslo",10,"g")],
  postup:["Prekroj rožky a natri ich tenkou vrstvou masla.","Poukladaj šunku a plátky syra.","Doplň kolieska uhorky a rožky prikry."],
  tipy:"Grahamový rožok má proti bielemu takmer dvojnásobok vlákniny.", tagy:[...T,"obložené pečivo","rožok","rýchle"] },

{ id:"ranajkovy-rozok-s-vajickovou-natierkou", nazov:"Rožok s vajíčkovou nátierkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Vajcia",
  popis:"Vajíčková nátierka na gréckom jogurte namiesto majonézy, v grahamovom rožku.",
  ing:[i("Grahamový rožok",2,"ks"),i("Vajcia",2,"ks"),i("Grécky jogurt",60,"g"),i("Horčica",10,"g"),i("Pažítka",10,"g")],
  postup:["Uvar vajcia natvrdo a nechaj ich vychladnúť v studenej vode.","Roztlač ich vidličkou, primiešaj jogurt, horčicu a nasekanú pažítku a osoľ.","Prekroj rožky a naplň ich nátierkou."],
  tipy:"Nátierka vydrží v chladničke dva dni — sprav si dvojnásobok.", tagy:[...T,"obložené pečivo","rožok","vajcia"] },

{ id:"ranajkovy-rozok-s-tvarohom-a-medom", nazov:"Rožok s tvarohom a medom", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Tvaroh",
  popis:"Sladká verzia — tvaroh s medom a škoricou na grahamovom rožku.",
  ing:[i("Grahamový rožok",2,"ks"),i("Tvaroh",200,"g"),i("Med",20,"g"),i("Škorica",1,"g"),i("Jablko",100,"g")],
  postup:["Rozmiešaj tvaroh s medom a štipkou škorice.","Prekroj rožky a natri ich tvarohom.","Poukladaj na vrch tenké plátky jablka aj so šupkou."],
  tipy:"Jablko krájaj so šupkou — je v nej väčšina vlákniny.", tagy:[...T,"obložené pečivo","rožok","sladké"] },

{ id:"ranajkova-zemla-s-cottage-a-uhorkou", nazov:"Celozrnná žemľa s cottage syrom a uhorkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Cottage syr",
  popis:"Celozrnná žemľa, cottage syr, uhorka a reďkovka.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Cottage syr",240,"g"),i("Uhorka",100,"g"),i("Reďkovka",40,"g"),i("Pažítka",8,"g")],
  postup:["Prekroj žemle a rozotri po nich cottage syr.","Nakrájaj uhorku a reďkovky na tenké kolieska.","Poukladaj zeleninu na syr, posyp pažítkou a osoľ."],
  tipy:"Cottage syr vyber odkvapkaný — vodnatý ti pečivo rozmočí.", tagy:[...T,"obložené pečivo","žemľa","vysoký obsah bielkovín"] },

{ id:"ranajkova-zemla-so-sunkou-a-chrenom", nazov:"Celozrnná žemľa so šunkou a chrenom", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Šunka",
  popis:"Ostrejšie raňajky — šunka s chrenom a listom šalátu v celozrnnej žemli.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Šunka",100,"g"),i("Chren",20,"g"),i("Ľadový šalát",30,"g"),i("Maslo",10,"g")],
  postup:["Prekroj žemle a natri ich maslom zmiešaným s chrenom.","Vylož listy šalátu.","Poukladaj šunku a žemle prikry."],
  tipy:"Chren miešaj do masla, nie priamo na pečivo — inak preráža všetko ostatné.", tagy:[...T,"obložené pečivo","žemľa","mäso"] },

{ id:"ranajkova-zemla-s-lososom-a-zerve", nazov:"Celozrnná žemľa s lososom a žervé", kat:"Raňajky", kuchyna:"Škandinávska", cas:"7 min", hlavna:"Údený losos",
  popis:"Údený losos so smotanovým syrom a kôprom v celozrnnej žemli.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Údený losos",90,"g"),i("Žervé",50,"g"),i("Uhorka",60,"g"),i("Kôpor",6,"g")],
  postup:["Prekroj žemle a natri ich žervé.","Posyp nasekaným kôprom a poukladaj plátky lososa.","Doplň tenké plátky uhorky a žemle prikry."],
  tipy:"Kvapka citrónu na lososa mu vráti sviežosť aj z balíčka.", tagy:[...T,"obložené pečivo","žemľa","ryba"] },

{ id:"ranajkovy-croissant-so-sunkou-a-syrom", nazov:"Croissant so šunkou a syrom", kat:"Raňajky", kuchyna:"Francúzska", cas:"10 min", hlavna:"Šunka",
  popis:"Zapečený croissant so šunkou a eidamom — víkendová klasika.",
  ing:[i("Croissant",2,"ks"),i("Šunka",50,"g"),i("Syr eidam",30,"g"),i("Ľadový šalát",20,"g"),i("Horčica",8,"g")],
  postup:["Predhrej rúru na 180 °C.","Prekroj croissanty, natri ich horčicou a naplň šunkou a syrom.","Zapeč päť minút, kým sa syr nerozpustí, a doplň list šalátu."],
  tipy:"Croissant zapekaj otvorený a prikry ho až po vybratí — syr sa tak rozpustí rovnomerne.", tagy:[...T,"obložené pečivo","croissant","zapekané"] },

{ id:"ranajkovy-croissant-s-tvarohom-a-jahodami", nazov:"Croissant s tvarohom a jahodami", kat:"Raňajky", kuchyna:"Francúzska", cas:"7 min", hlavna:"Tvaroh",
  popis:"Sladký croissant s tvarohovým krémom a čerstvými jahodami.",
  ing:[i("Croissant",2,"ks"),i("Tvaroh",160,"g"),i("Jahody",120,"g"),i("Med",15,"g"),i("Vanilkový cukor",8,"g")],
  postup:["Rozmiešaj tvaroh s medom a vanilkovým cukrom do hladkého krému.","Prekroj croissanty a natri ich krémom.","Poukladaj na vrch polené jahody a croissanty prikry."],
  tipy:"Mimo sezóny funguje rovnako dobre mrazené ovocie — nechaj ho odkvapkať.", tagy:[...T,"obložené pečivo","croissant","sladké"] },

{ id:"ranajkovy-croissant-s-morcacou-sunkou-a-rukolou", nazov:"Croissant s morčacou šunkou a rukolou", kat:"Raňajky", kuchyna:"Francúzska", cas:"6 min", hlavna:"Morčacia šunka",
  popis:"Ľahší croissant — morčacia šunka, rukola a horčica.",
  ing:[i("Croissant",2,"ks"),i("Morčacia šunka",80,"g"),i("Rukola",30,"g"),i("Horčica",10,"g"),i("Paradajky",60,"g")],
  postup:["Prekroj croissanty a natri ich horčicou.","Poukladaj morčaciu šunku a kolieska paradajok.","Doplň rukolu a croissanty prikry."],
  tipy:"Rukolu daj až navrch — pod teplou náplňou by zvädla.", tagy:[...T,"obložené pečivo","croissant","mäso"] },

// ── BAGEL ──────────────────────────────────────────────────────────────────────
{ id:"ranajkovy-bagel-s-lososom-a-kaparami", nazov:"Bagel s údeným lososom a kaparami", kat:"Raňajky", kuchyna:"Americká", cas:"8 min", hlavna:"Údený losos",
  popis:"Celozrnný bagel so smotanovým syrom, lososom, kaparami a červenou cibuľou.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Údený losos",100,"g"),i("Žervé",40,"g"),i("Kapary",10,"g"),i("Cibuľa červená",30,"g")],
  postup:["Prekroj bagely a zľahka ich opeč v hriankovači.","Natri ich žervé a poukladaj plátky lososa.","Posyp kaparami a tenkými kolieskami červenej cibule."],
  tipy:"Kapary pred použitím prepláchni — inak sendvič presolia.", tagy:[...T,"sendvič","bagel","ryba"] },

{ id:"ranajkovy-bagel-s-vajcom-a-avokadom", nazov:"Bagel s vajcom a avokádom", kat:"Raňajky", kuchyna:"Americká", cas:"12 min", hlavna:"Vajcia",
  popis:"Celozrnný bagel s roztlačeným avokádom a vajcom.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Vajcia",2,"ks"),i("Avokádo",80,"g"),i("Cherry paradajky",80,"g"),i("Pažítka",8,"g")],
  postup:["Uvar vajcia namäkko, sedem minút od varu, a schlaď ich.","Roztlač avokádo vidličkou, osoľ a rozotri po prekrojených bageloch.","Poukladaj polené vajcia a paradajky a posyp pažítkou."],
  tipy:"Sedem minút je hranica, keď je bielok pevný a žĺtok ešte krémový.", tagy:[...T,"sendvič","bagel","vajcia"] },

{ id:"ranajkovy-bagel-s-cottage-a-redkovkou", nazov:"Bagel s cottage syrom a reďkovkou", kat:"Raňajky", kuchyna:"Americká", cas:"7 min", hlavna:"Cottage syr",
  popis:"Celozrnný bagel s cottage syrom, reďkovkou a pažítkou.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Cottage syr",200,"g"),i("Reďkovka",60,"g"),i("Pažítka",10,"g"),i("Uhorka",60,"g")],
  postup:["Prekroj bagely a opeč ich v hriankovači dozlatista.","Rozotri po nich cottage syr a osoľ.","Poukladaj kolieska reďkoviek a uhorky a posyp pažítkou."],
  tipy:"Opečený bagel unesie aj vlhkú nátierku a nerozmočí sa.", tagy:[...T,"sendvič","bagel","vysoký obsah bielkovín"] },

{ id:"ranajkovy-bagel-s-arasidovym-maslom-a-bananom", nazov:"Bagel s arašidovým maslom a banánom", kat:"Raňajky", kuchyna:"Americká", cas:"5 min", hlavna:"Arašidové maslo",
  popis:"Sladké raňajky pred tréningom — arašidové maslo, banán a škorica.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Arašidové maslo",30,"g"),i("Banán",100,"g"),i("Škorica",1,"g"),i("Med",10,"g")],
  postup:["Prekroj bagely a opeč ich v hriankovači.","Natri ich arašidovým maslom.","Poukladaj kolieska banánu, pokvapkaj medom a posyp škoricou."],
  tipy:"Vyber arašidové maslo bez pridaného cukru — v zložení majú byť len arašidy a soľ.", tagy:[...T,"sendvič","bagel","sladké"] },

{ id:"ranajkovy-bagel-so-sunkou-a-horcicou", nazov:"Bagel so šunkou a horčicou", kat:"Raňajky", kuchyna:"Americká", cas:"6 min", hlavna:"Šunka",
  popis:"Bagel so šunkou, horčicou a listom šalátu.",
  ing:[i("Bagel",2,"ks"),i("Šunka",80,"g"),i("Horčica",16,"g"),i("Ľadový šalát",30,"g"),i("Paradajky",60,"g")],
  postup:["Prekroj bagely a natri ich horčicou.","Vylož listy šalátu a poukladaj šunku.","Doplň kolieska paradajok a bagely prikry."],
  tipy:"Bagel je hutnejší než rožok — na raňajky stačí jeden na osobu.", tagy:[...T,"sendvič","bagel","mäso"] },

{ id:"ranajkovy-bagel-s-tvarohom-a-cucoriedkami", nazov:"Bagel s tvarohom a čučoriedkami", kat:"Raňajky", kuchyna:"Americká", cas:"6 min", hlavna:"Tvaroh",
  popis:"Celozrnný bagel s tvarohovým krémom a čučoriedkami.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Tvaroh",200,"g"),i("Čučoriedky",100,"g"),i("Med",15,"g"),i("Ľanové semienka",10,"g")],
  postup:["Rozmiešaj tvaroh s medom do hladka.","Prekroj bagely a natri ich tvarohom.","Posyp čučoriedkami a mletými ľanovými semienkami."],
  tipy:"Ľanové semienka pomeľ — celé prejdú tráviacim traktom bez úžitku.", tagy:[...T,"sendvič","bagel","sladké","vysoký obsah bielkovín"] },

{ id:"ranajkovy-bagel-s-kuracim-a-paprikou", nazov:"Bagel s kuracím mäsom a paprikou", kat:"Raňajky", kuchyna:"Americká", cas:"15 min", hlavna:"Kuracie prsia",
  popis:"Celozrnný bagel s opečeným kuracím mäsom a paprikovým dresingom.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Kuracie prsia",140,"g"),i("Paprika červená",100,"g"),i("Grécky jogurt",40,"g"),i("Olivový olej",5,"g")],
  postup:["Nakrájaj kuracie prsia na plátky, osoľ ich a opeč na kvapke oleja.","Rozmiešaj jogurt so štipkou mletej papriky a natri ním prekrojené bagely.","Poukladaj mäso a prúžky papriky a bagely prikry."],
  tipy:"Mäso nechaj po opečení dve minúty odpočinúť — zostane šťavnaté.", tagy:[...T,"sendvič","bagel","mäso","vysoký obsah bielkovín"] },

// ── TOAST ──────────────────────────────────────────────────────────────────────
{ id:"ranajkovy-toast-s-tvarohom-a-redkovkou", nazov:"Celozrnný toast s tvarohom a reďkovkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Tvaroh",
  popis:"Dva celozrnné toasty s tvarohovou nátierkou a reďkovkou.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Tvaroh",320,"g"),i("Reďkovka",60,"g"),i("Pažítka",10,"g"),i("Horčica",10,"g")],
  postup:["Opeč plátky chleba v hriankovači dozlatista.","Rozmiešaj tvaroh s horčicou a pažítkou a osoľ.","Natri nátierku na toasty a poukladaj kolieska reďkoviek."],
  tipy:"Tvaroh rozmiešaj lyžicou mlieka, ak je príliš tuhý.", tagy:[...T,"sendvič","toast","vysoký obsah bielkovín"] },

{ id:"ranajkovy-toast-s-vajcom-a-avokadom", nazov:"Celozrnný toast s vajcom a avokádom", kat:"Raňajky", kuchyna:"Slovenská", cas:"12 min", hlavna:"Avokádo",
  popis:"Roztlačené avokádo a vajce namäkko na celozrnnom toaste.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Vajcia",2,"ks"),i("Avokádo",80,"g"),i("Cherry paradajky",80,"g"),i("Pažítka",8,"g")],
  postup:["Uvar vajcia namäkko a schlaď ich v studenej vode.","Opeč chlieb a rozotri naň roztlačené avokádo so štipkou soli.","Poukladaj polené vajcia a paradajky a posyp pažítkou."],
  tipy:"Avokádo roztlač až tesne pred jedlom, na vzduchu rýchlo stmavne.", tagy:[...T,"sendvič","toast","vajcia"] },

{ id:"ranajkovy-toast-s-cottage-a-paradajkou", nazov:"Celozrnný toast s cottage syrom a paradajkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Cottage syr",
  popis:"Cottage syr, paradajka a bazalka na opečenom celozrnnom chlebe.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Cottage syr",280,"g"),i("Paradajky",120,"g"),i("Bazalka",4,"g"),i("Olivový olej",5,"g")],
  postup:["Opeč plátky chleba v hriankovači.","Rozotri po nich cottage syr a osoľ.","Poukladaj kolieska paradajok, posyp bazalkou a pokvapkaj olejom."],
  tipy:"Toast natieraj až po vychladnutí — na horúcom sa cottage rozteká.", tagy:[...T,"sendvič","toast","vysoký obsah bielkovín"] },

{ id:"ranajkovy-toast-so-sunkou-a-syrom", nazov:"Toast so šunkou a syrom", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Šunka",
  popis:"Zapečený toast so šunkou a eidamom — dve minúty v sendvičovači.",
  ing:[i("Toastový chlieb",4,"plátok"),i("Šunka",60,"g"),i("Syr eidam",40,"g"),i("Horčica",10,"g"),i("Uhorka",60,"g")],
  postup:["Natri plátky chleba horčicou.","Poukladaj šunku a syr a toasty prikry druhým plátkom.","Zapeč ich v sendvičovači tri minúty a podávaj s uhorkou."],
  tipy:"Bez sendvičovača ich opeč na suchej panvici a pritlač pokrievkou.", tagy:[...T,"sendvič","toast","zapekané"] },

{ id:"ranajkovy-toast-s-hummusom-a-klickami", nazov:"Celozrnný toast s hummusom a klíčkami", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"6 min", hlavna:"Hummus",
  popis:"Hummus, klíčky a paradajka na celozrnnom toaste.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Hummus",120,"g"),i("Klíčky",40,"g"),i("Paradajky",80,"g"),i("Sezamové semienka",6,"g")],
  postup:["Opeč plátky chleba dozlatista.","Natri ich hrubou vrstvou hummusu.","Poukladaj kolieska paradajok, posyp klíčkami a sezamom."],
  tipy:"Klíčky kupuj chladené a spotrebuj do dvoch dní.", tagy:[...T,"sendvič","toast","vegetariánske","vláknina"] },

{ id:"ranajkovy-toast-s-arasidovym-maslom-a-jablkom", nazov:"Celozrnný toast s arašidovým maslom a jablkom", kat:"Raňajky", kuchyna:"Americká", cas:"5 min", hlavna:"Arašidové maslo",
  popis:"Arašidové maslo, tenké plátky jablka a škorica na celozrnnom toaste.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Arašidové maslo",40,"g"),i("Jablko",120,"g"),i("Škorica",1,"g"),i("Med",10,"g")],
  postup:["Opeč plátky chleba v hriankovači.","Natri ich arašidovým maslom.","Poukladaj tenké plátky jablka so šupkou, pokvapkaj medom a posyp škoricou."],
  tipy:"Jablko krájaj na tenké plátky mandolínou — držia lepšie než hrubé.", tagy:[...T,"sendvič","toast","sladké"] },

// ── PITA, KVÁSKOVÝ A RAŽNÝ CHLIEB (v app.js triedené ako „toast") ──────────────
{ id:"ranajkova-pita-s-kuracim-a-salatom", nazov:"Pita s kuracím mäsom a šalátom", kat:"Raňajky", kuchyna:"Grécka", cas:"15 min", hlavna:"Kuracie prsia",
  popis:"Celozrnná pita vrecko naplnené kuracím mäsom, šalátom a jogurtovým dresingom.",
  ing:[i("Celozrnná pita",2,"ks"),i("Kuracie prsia",140,"g"),i("Ľadový šalát",40,"g"),i("Grécky jogurt",50,"g"),i("Uhorka",60,"g")],
  postup:["Nakrájaj kuracie prsia na prúžky, osoľ ich a opeč na suchej panvici.","Nahrej pity v hriankovači a opatrne ich rozrež na vrecko.","Naplň ich mäsom, natrhaným šalátom a uhorkou a polej jogurtom."],
  tipy:"Pita sa lepšie otvára teplá — studená praská.", tagy:[...T,"sendvič","pita","mäso","vysoký obsah bielkovín"] },

{ id:"ranajkova-pita-s-vajcom-a-hummusom", nazov:"Pita s vajcom a hummusom", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"15 min", hlavna:"Vajcia",
  popis:"Celozrnná pita s hummusom, vajcom natvrdo a paradajkou.",
  ing:[i("Celozrnná pita",2,"ks"),i("Vajcia",2,"ks"),i("Hummus",80,"g"),i("Paradajky",80,"g"),i("Petržlenová vňať",10,"g")],
  postup:["Uvar vajcia natvrdo a schlaď ich v studenej vode.","Nahrej pity a rozrež ich na vrecko.","Natri dovnútra hummus, vlož kolieska vajca a paradajky a posyp nasekanou vňaťou."],
  tipy:"Do hummusu vmiešaj lyžičku citrónovej šťavy — rozjasní chuť.", tagy:[...T,"sendvič","pita","vajcia","vláknina"] },

{ id:"ranajkovy-sendvic-z-kvaskoveho-chleba-s-cottage", nazov:"Sendvič z kváskového chleba s cottage syrom", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Cottage syr",
  popis:"Kváskový chlieb s cottage syrom, reďkovkou a pažítkou.",
  ing:[i("Kváskový chlieb",4,"plátok"),i("Cottage syr",200,"g"),i("Reďkovka",60,"g"),i("Pažítka",10,"g"),i("Maslo",10,"g")],
  postup:["Opeč plátky kváskového chleba na suchej panvici.","Natri ich tenkou vrstvou masla a rozotri cottage syr.","Poukladaj kolieska reďkoviek a posyp pažítkou."],
  tipy:"Kváskový chlieb má nižší glykemický index než bežný pšeničný.", tagy:[...T,"sendvič","kváskový chlieb"] },

{ id:"ranajkovy-sendvic-z-razneho-chleba-s-tvarohom-a-cviklou", nazov:"Sendvič z ražného chleba s tvarohom a cviklou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Ražný chlieb s tvarohom, varenou cviklou a chrenom.",
  ing:[i("Ražný chlieb",4,"plátok"),i("Tvaroh",200,"g"),i("Cvikla",100,"g"),i("Chren",10,"g"),i("Pažítka",8,"g")],
  postup:["Rozmiešaj tvaroh s chrenom a osoľ.","Natri nátierku na plátky ražného chleba.","Poukladaj nastrúhanú cviklu a posyp pažítkou."],
  tipy:"Ražný chlieb má trikrát viac vlákniny než biely toastový.", tagy:[...T,"sendvič","ražný chlieb","vláknina"] },

{ id:"ranajkovy-sendvic-z-razneho-chleba-s-lososom", nazov:"Sendvič z ražného chleba s údeným lososom", kat:"Raňajky", kuchyna:"Škandinávska", cas:"7 min", hlavna:"Údený losos",
  popis:"Ražný chlieb, smotanový syr, losos a kôpor.",
  ing:[i("Ražný chlieb",4,"plátok"),i("Údený losos",90,"g"),i("Žervé",40,"g"),i("Uhorka",60,"g"),i("Kôpor",6,"g")],
  postup:["Natri plátky ražného chleba žervé.","Poukladaj plátky lososa a tenké plátky uhorky.","Posyp nasekaným kôprom a zľahka pomel čierne korenie."],
  tipy:"Kôpor daj až na koniec — teplo mu berie vôňu.", tagy:[...T,"sendvič","ražný chlieb","ryba"] },

{ id:"ranajkovy-sendvic-z-kvaskoveho-chleba-s-vajcom-a-sunkou", nazov:"Sendvič z kváskového chleba s vajcom a šunkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Vajcia",
  popis:"Kváskový chlieb s vajcom natvrdo, šunkou a horčicou.",
  ing:[i("Kváskový chlieb",4,"plátok"),i("Vajcia",2,"ks"),i("Šunka",50,"g"),i("Horčica",10,"g"),i("Ľadový šalát",30,"g")],
  postup:["Uvar vajcia natvrdo a nechaj ich vychladnúť.","Natri plátky chleba horčicou a vylož listy šalátu.","Poukladaj šunku a kolieska vajca a osoľ."],
  tipy:"Vajcia krájaj krájačom na vajcia — plátky držia tvar.", tagy:[...T,"sendvič","kváskový chlieb","vajcia"] },

// ── ALTERNATÍVNE BÁZY BEZ SENDVIČOVÉHO TAGU (vlastná trieda bázy) ─────────────
{ id:"ranajkove-knackebroty-s-tvarohom-a-redkovkou", nazov:"Knäckebroty s tvarohom a reďkovkou", kat:"Raňajky", kuchyna:"Škandinávska", cas:"6 min", hlavna:"Tvaroh",
  popis:"Chrumkavý ražný knäckebrot s tvarohom, reďkovkou a pažítkou.",
  ing:[i("Knäckebrot",8,"ks"),i("Tvaroh",240,"g"),i("Reďkovka",80,"g"),i("Pažítka",10,"g"),i("Horčica",8,"g")],
  postup:["Rozmiešaj tvaroh s horčicou a nasekanou pažítkou.","Natri nátierku na knäckebroty.","Poukladaj kolieska reďkoviek a zľahka osoľ."],
  tipy:"Knäckebrot má okolo 16 g vlákniny na 100 g — z pečiva najviac.", tagy:[...T,"knäckebrot","vláknina","rýchle"] },

{ id:"ranajkove-knackebroty-s-cottage-a-paradajkou", nazov:"Knäckebroty s cottage syrom a paradajkou", kat:"Raňajky", kuchyna:"Škandinávska", cas:"6 min", hlavna:"Cottage syr",
  popis:"Knäckebrot, cottage syr, paradajka a bazalka.",
  ing:[i("Knäckebrot",8,"ks"),i("Cottage syr",240,"g"),i("Paradajky",120,"g"),i("Bazalka",4,"g"),i("Olivový olej",5,"g")],
  postup:["Rozotri cottage syr po knäckebrotoch.","Poukladaj kolieska paradajok a osoľ.","Posyp natrhanou bazalkou a pokvapkaj olivovým olejom."],
  tipy:"Knäckebroty natieraj až tesne pred jedlom, inak zmäknú.", tagy:[...T,"knäckebrot","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkove-knackebroty-s-lososom-a-zerve", nazov:"Knäckebroty s lososom a žervé", kat:"Raňajky", kuchyna:"Škandinávska", cas:"6 min", hlavna:"Údený losos",
  popis:"Knäckebrot so smotanovým syrom, lososom a kôprom.",
  ing:[i("Knäckebrot",8,"ks"),i("Údený losos",90,"g"),i("Žervé",60,"g"),i("Uhorka",60,"g"),i("Kôpor",6,"g")],
  postup:["Natri knäckebroty žervé.","Poukladaj plátky lososa a tenké plátky uhorky.","Posyp nasekaným kôprom."],
  tipy:"Balíček lososa rozdeľ hneď po otvorení — otvorený vydrží dva dni.", tagy:[...T,"knäckebrot","ryba","vláknina"] },

{ id:"ranajkove-ryzove-chlebicky-s-arasidovym-maslom-a-bananom", nazov:"Ryžové chlebíčky s arašidovým maslom a banánom", kat:"Raňajky", kuchyna:"Americká", cas:"5 min", hlavna:"Arašidové maslo",
  popis:"Ryžové chlebíčky s arašidovým maslom, banánom a škoricou.",
  ing:[i("Ryžové chlebíčky",8,"ks"),i("Arašidové maslo",40,"g"),i("Banán",140,"g"),i("Škorica",1,"g"),i("Med",10,"g")],
  postup:["Natri ryžové chlebíčky arašidovým maslom.","Poukladaj kolieska banánu.","Pokvapkaj medom a posyp škoricou."],
  tipy:"Ryžové chlebíčky sú bezlepkové — hodia sa aj pre celiatikov.", tagy:[...T,"ryžové chlebíčky","sladké","rýchle"] },

{ id:"ranajkove-ryzove-chlebicky-s-avokadom-a-vajcom", nazov:"Ryžové chlebíčky s avokádom a vajcom", kat:"Raňajky", kuchyna:"Americká", cas:"12 min", hlavna:"Avokádo",
  popis:"Ryžové chlebíčky s roztlačeným avokádom a vajcom natvrdo.",
  ing:[i("Ryžové chlebíčky",8,"ks"),i("Avokádo",100,"g"),i("Vajcia",2,"ks"),i("Cherry paradajky",80,"g"),i("Pažítka",8,"g")],
  postup:["Uvar vajcia natvrdo a schlaď ich v studenej vode.","Roztlač avokádo vidličkou, osoľ a rozotri po chlebíčkoch.","Poukladaj kolieska vajca a polené paradajky a posyp pažítkou."],
  tipy:"Chlebíčky sú krehké — natieraj ich lyžicou, nie nožom.", tagy:[...T,"ryžové chlebíčky","vajcia"] },

{ id:"ranajkove-ryzove-chlebicky-s-hummusom-a-redkovkou", nazov:"Ryžové chlebíčky s hummusom a reďkovkou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"5 min", hlavna:"Hummus",
  popis:"Ryžové chlebíčky s hummusom, reďkovkou a rukolou.",
  ing:[i("Ryžové chlebíčky",8,"ks"),i("Hummus",140,"g"),i("Reďkovka",60,"g"),i("Rukola",20,"g"),i("Sezamové semienka",6,"g")],
  postup:["Natri hummus na ryžové chlebíčky.","Poukladaj kolieska reďkoviek a rukolu.","Posyp sezamom a zľahka osoľ."],
  tipy:"Hummus z konzervy cíceru s tahini a citrónom stojí polovicu kúpeného.", tagy:[...T,"ryžové chlebíčky","vegetariánske"] },

// ── VYSOKOBIELKOVINOVÉ RAŇAJKY BEZ PEČIVA ──────────────────────────────────────
{ id:"ranajkova-prazenica-s-cibulkou-a-sunkou", nazov:"Praženica s jarnou cibuľkou a šunkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"10 min", hlavna:"Vajcia",
  popis:"Klasická praženica so šunkou a jarnou cibuľkou.",
  ing:[i("Vajcia",4,"ks"),i("Šunka",80,"g"),i("Jarná cibuľka",40,"g"),i("Maslo",10,"g"),i("Paradajky",100,"g")],
  postup:["Nakrájaj šunku na kocky a jarnú cibuľku na kolieska.","Rozohrej maslo na panvici a orestuj šunku s cibuľkou.","Rozšľahaj vajcia, prilej ich na panvicu a miešaj do hustnutia. Podávaj s paradajkou."],
  tipy:"Praženicu stiahni z platne o chvíľu skôr — dohotoví sa vlastným teplom.", tagy:[...T,"vajcia","vysoký obsah bielkovín","rýchle"] },

{ id:"ranajkova-omeleta-so-spenatom-a-cottage", nazov:"Omeleta so špenátom a cottage syrom", kat:"Raňajky", kuchyna:"Slovenská", cas:"12 min", hlavna:"Vajcia",
  popis:"Nadýchaná omeleta so špenátom a cottage syrom.",
  ing:[i("Vajcia",4,"ks"),i("Cottage syr",200,"g"),i("Špenát",120,"g"),i("Maslo",8,"g"),i("Jarná cibuľka",20,"g")],
  postup:["Orestuj špenát na masle, kým nespadne, a odlož ho bokom.","Rozšľahaj vajcia so soľou a vylej ich na panvicu.","Vylož na polovicu omelety špenát s cottage syrom, preklop ju a posyp cibuľkou."],
  tipy:"Panvicu drž na strednom ohni — na vysokom omeleta zhnedne skôr, než sa prepečie.", tagy:[...T,"vajcia","vysoký obsah bielkovín"] },

{ id:"ranajkove-varene-vajcia-s-cottage-a-zeleninou", nazov:"Varené vajcia s cottage syrom a zeleninou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Vajcia",
  popis:"Miska s vajcami natvrdo, cottage syrom a čerstvou zeleninou.",
  ing:[i("Vajcia",4,"ks"),i("Cottage syr",240,"g"),i("Paradajky",160,"g"),i("Uhorka",100,"g"),i("Pažítka",10,"g")],
  postup:["Uvar vajcia natvrdo, desať minút od varu, a schlaď ich v studenej vode.","Nakrájaj paradajky a uhorku na kocky.","Rozdeľ do misiek cottage syr, polené vajcia a zeleninu a posyp pažítkou."],
  tipy:"Do vody na vajcia daj lyžicu octu — prípadná prasklina sa hneď zatiahne.", tagy:[...T,"vajcia","vysoký obsah bielkovín"] },

{ id:"ranajkove-vajecne-muffiny-so-sunkou-a-brokolicou", nazov:"Vaječné muffiny so šunkou a brokolicou", kat:"Raňajky", kuchyna:"Americká", cas:"20 min", hlavna:"Vajcia", narocnost:"stredná",
  popis:"Vajcia zapečené vo forme na muffiny — pripravíš ich dopredu na celý blok.",
  ing:[i("Vajcia",4,"ks"),i("Šunka",80,"g"),i("Brokolica",160,"g"),i("Syr eidam",40,"g"),i("Jarná cibuľka",20,"g")],
  postup:["Predhrej rúru na 180 °C a vysypanú formu na muffiny odlož nabok.","Nakrájaj brokolicu a šunku najemno a rozdeľ ich do formy.","Rozšľahaj vajcia so soľou, zalej nimi formu, posyp syrom a peč 18 minút."],
  tipy:"Muffiny vydržia v chladničke tri dni — ráno ich len prehreješ.", tagy:[...T,"vajcia","vysoký obsah bielkovín","meal prep"] },

{ id:"ranajkova-tvarohova-miska-s-jahodami-a-lanom", nazov:"Tvarohová miska s jahodami a ľanovým semienkom", kat:"Raňajky", kuchyna:"Slovenská", cas:"5 min", hlavna:"Tvaroh",
  popis:"Tvaroh s jahodami a mletým ľanovým semienkom — päť minút a 26 g bielkovín.",
  ing:[i("Tvaroh",400,"g"),i("Jahody",160,"g"),i("Ľanové semienka",20,"g"),i("Med",15,"g"),i("Škorica",1,"g")],
  postup:["Rozmiešaj tvaroh s medom do hladka.","Rozdeľ ho do misiek a posyp mletými ľanovými semienkami.","Doplň polené jahody a posyp škoricou."],
  tipy:"Ľanové semienka meľ vždy čerstvé — mleté rýchlo žltnú.", tagy:[...T,"tvaroh","vysoký obsah bielkovín","rýchle"] },

{ id:"ranajkova-cottage-miska-s-jahodami-a-chia", nazov:"Cottage miska s jahodami a chia semienkami", kat:"Raňajky", kuchyna:"Slovenská", cas:"5 min", hlavna:"Cottage syr",
  popis:"Cottage syr s jahodami, chia semienkami a medom.",
  ing:[i("Cottage syr",400,"g"),i("Jahody",160,"g"),i("Chia semienka",20,"g"),i("Med",15,"g"),i("Škorica",1,"g")],
  postup:["Rozdeľ cottage syr do dvoch misiek.","Posyp ho chia semienkami a pokvapkaj medom.","Doplň polené jahody a posyp škoricou."],
  tipy:"Chia semienka nechaj v miske päť minút napučať — zjemnia sa.", tagy:[...T,"vysoký obsah bielkovín","vláknina","rýchle"] },

{ id:"ranajkova-cottage-miska-s-uhorkou-a-tekvicovymi-semienkami", nazov:"Cottage miska s uhorkou a tekvicovými semienkami", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Cottage syr",
  popis:"Slaná verzia — cottage syr, uhorka, reďkovka a pražené tekvicové semienka.",
  ing:[i("Cottage syr",400,"g"),i("Uhorka",200,"g"),i("Tekvicové semienka",30,"g"),i("Reďkovka",60,"g"),i("Pažítka",10,"g")],
  postup:["Opraž tekvicové semienka na suchej panvici, kým nezačnú praskať.","Nakrájaj uhorku a reďkovky na kocky.","Rozdeľ cottage syr do misiek, doplň zeleninu, posyp semienkami a pažítkou."],
  tipy:"Semienka praž bez oleja a stále mieš — pripália sa za pár sekúnd.", tagy:[...T,"vysoký obsah bielkovín","rýchle"] },

{ id:"ranajkovy-skyr-s-cucoriedkami-a-orechmi", nazov:"Skyr s čučoriedkami a vlašskými orechmi", kat:"Raňajky", kuchyna:"Škandinávska", cas:"5 min", hlavna:"Skyr",
  popis:"Skyr s čučoriedkami a orechmi — najvyššia hustota bielkovín v celej kuchárke.",
  ing:[i("Skyr",400,"g"),i("Čučoriedky",160,"g"),i("Vlašské orechy",22,"g"),i("Med",12,"g"),i("Škorica",1,"g")],
  postup:["Rozdeľ skyr do dvoch misiek a pokvapkaj ho medom.","Nasekaj vlašské orechy nahrubo.","Posyp skyr čučoriedkami, orechmi a škoricou."],
  tipy:"Skyr je odtučnený islandský tvaroh — 100 g má okolo 10 g bielkovín a takmer žiadny tuk.", tagy:[...T,"vysoký obsah bielkovín","rýchle"] },

{ id:"ranajkovy-skyr-s-ovsenymi-otrubami-a-jablkom", nazov:"Skyr s ovsenými otrubami a jablkom", kat:"Raňajky", kuchyna:"Škandinávska", cas:"5 min", hlavna:"Skyr",
  popis:"Skyr s ovsenými otrubami a jablkom — bielkoviny aj vláknina naraz.",
  ing:[i("Skyr",500,"g"),i("Ovsené otruby",50,"g"),i("Jablko",200,"g"),i("Škorica",2,"g"),i("Med",10,"g")],
  postup:["Nastrúhaj jablko aj so šupkou nahrubo.","Vmiešaj do skyru ovsené otruby a nechaj päť minút napučať.","Vmiešaj jablko, pokvapkaj medom a posyp škoricou."],
  tipy:"Ovsené otruby majú okolo 15 g vlákniny na 100 g — trikrát viac než vločky.", tagy:[...T,"vysoký obsah bielkovín","vláknina"] },

{ id:"ranajkovy-skyr-s-pohankovou-granolou", nazov:"Skyr s pohánkovou granolou", kat:"Raňajky", kuchyna:"Škandinávska", cas:"10 min", hlavna:"Skyr",
  popis:"Skyr s domácou pohánkovou granolou opraženou na panvici.",
  ing:[i("Skyr",500,"g"),i("Pohánka",50,"g"),i("Med",20,"g"),i("Slnečnicové semienka",20,"g"),i("Škorica",2,"g")],
  postup:["Opraž pohánku so slnečnicovými semienkami na suchej panvici dozlatista.","Pokvapkaj ich medom, premiešaj a nechaj vychladnúť.","Rozdeľ skyr do misiek, posyp granolou a škoricou."],
  tipy:"Granolu si sprav na celý blok naraz — v zaváraninovom pohári vydrží týždeň.", tagy:[...T,"vysoký obsah bielkovín","vláknina"] },

{ id:"ranajkova-proteinova-ovsena-kasa-s-tvarohom", nazov:"Ovsená kaša s tvarohom", kat:"Raňajky", kuchyna:"Slovenská", cas:"10 min", hlavna:"Tvaroh",
  popis:"Ovsená kaša zjemnená tvarohom — hustota bielkovín ako pri praženici.",
  ing:[i("Ovsené vločky",48,"g"),i("Tvaroh",380,"g"),i("Mlieko",200,"ml"),i("Škorica",2,"g"),i("Med",15,"g")],
  postup:["Zalej vločky mliekom a povar ich dve minúty do zhustnutia.","Stiahni kašu z platne a vmiešaj tvaroh, aby sa nezrazil.","Rozdeľ do misiek, pokvapkaj medom a posyp škoricou."],
  tipy:"Tvaroh miešaj až mimo platne — vo vare by sa zrazil na hrudky.", tagy:[...T,"vysoký obsah bielkovín","vláknina"] },

{ id:"ranajkova-quinoa-kasa-so-skyrom-a-malinami", nazov:"Quinoa kaša so skyrom a malinami", kat:"Raňajky", kuchyna:"Slovenská", cas:"20 min", hlavna:"Quinoa", narocnost:"stredná",
  popis:"Quinoa uvarená na mlieku, doplnená skyrom a malinami.",
  ing:[i("Quinoa",48,"g"),i("Mlieko",180,"ml"),i("Skyr",420,"g"),i("Maliny",120,"g"),i("Med",15,"g")],
  postup:["Prepláchni quinou pod tečúcou vodou, aby stratila horkú stopku.","Zalej ju mliekom a povar 15 minút domäkka.","Nechaj kašu vychladnúť, vmiešaj skyr, doplň maliny a pokvapkaj medom."],
  tipy:"Quinou uvar večer — ráno ju len zmiešaš so skyrom.", tagy:[...T,"vysoký obsah bielkovín","vláknina"] },

{ id:"ranajkove-tvarohove-lievance-celozrnne", nazov:"Celozrnné tvarohové lievance", kat:"Raňajky", kuchyna:"Slovenská", cas:"20 min", hlavna:"Tvaroh", narocnost:"stredná",
  popis:"Lievance z tvarohu a celozrnnej múky — bez cukru v ceste.",
  ing:[i("Tvaroh",340,"g"),i("Vajcia",2,"ks"),i("Celozrnná múka",60,"g"),i("Mlieko",60,"ml"),i("Škorica",2,"g")],
  postup:["Rozšľahaj vajcia s tvarohom a mliekom do hladkého cesta.","Vmiešaj celozrnnú múku so štipkou soli a nechaj cesto päť minút odpočinúť.","Opeč lievance na suchej nepriľnavej panvici z oboch strán dozlatista."],
  tipy:"Cesto má byť hustejšie než palacinkové — lievance tak držia tvar.", tagy:[...T,"vysoký obsah bielkovín","tvaroh"] },

{ id:"ranajkovy-tvaroh-so-sunkou-a-paprikou", nazov:"Tvaroh so šunkou a paprikou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Tvaroh",
  popis:"Slaná tvarohová miska so šunkou a paprikou.",
  ing:[i("Tvaroh",360,"g"),i("Šunka",120,"g"),i("Paprika červená",160,"g"),i("Jarná cibuľka",30,"g"),i("Horčica",10,"g")],
  postup:["Rozmiešaj tvaroh s horčicou a osoľ.","Nakrájaj šunku a papriku na kocky a jarnú cibuľku na kolieska.","Vmiešaj šunku s paprikou do tvarohu a posyp cibuľkou."],
  tipy:"Nechaj misku hodinu v chladničke — chute sa prepoja.", tagy:[...T,"vysoký obsah bielkovín","rýchle"] },

{ id:"ranajkovy-tvaroh-s-ovsenymi-otrubami-a-uhorkou", nazov:"Tvaroh s ovsenými otrubami a uhorkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Tvaroh",
  popis:"Slaná tvarohová miska s ovsenými otrubami — bielkoviny aj vláknina bez pečiva.",
  ing:[i("Tvaroh",400,"g"),i("Ovsené otruby",30,"g"),i("Uhorka",200,"g"),i("Reďkovka",60,"g"),i("Pažítka",10,"g")],
  postup:["Vmiešaj do tvarohu ovsené otruby a nechaj ich päť minút napučať.","Nakrájaj uhorku a reďkovky na kocky.","Vmiešaj zeleninu do tvarohu, osoľ a posyp pažítkou."],
  tipy:"Otruby vodu z tvarohu viažu — miska nezvodnatie ani po hodine.", tagy:[...T,"vysoký obsah bielkovín","vláknina"] }
];
