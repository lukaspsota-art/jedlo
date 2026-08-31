// Vlna 5, tretia dávka — cielene na dva sloty, ktoré po druhej dávke ťahali priemer vlákniny dole:
//   Raňajky  hustota 1,34 g vlákniny / 100 kcal  (4,4 g na porciu)
//   Večera   hustota 1,60                        (7,3 g)
// `skoreJedla` sýti vlákninový člen pri hustote 2,0 g/100 kcal, takže recept, ktorý má naraz
// hustotu vlákniny ≥ 2,2 a hustotu bielkovín ≥ 6,5, vyhráva turnaj proti čistému mäsu (0 vlákniny)
// aj proti čistej strukovine (nízke bielkoviny). Celý zoznam je postavený na tomto vzorci:
// celozrnná/ražná báza + chudá bielkovina (tvaroh, cottage, skyr, tuniak, kura) + veľa zeleniny.
// Večerné jedlá majú zámerne rozpoznateľný sacharid (zemiaky, bulgur, celozrnné cestoviny),
// aby im `prilohaPre` nepridala ešte ryžu — inak by slot prerástol svoje kcal-okno.
"use strict";
const i = (nazov, mnozstvo, jednotka, poznamka) => ({ nazov, mnozstvo, jednotka, poznamka: poznamka || "" });
const T = ["raňajky"];

module.exports = [

// ── RAŇAJKY: sendvič s vysokou vlákninou AJ bielkovinou ───────────────────────
{ id:"ranajkovy-sendvic-razny-s-cottage-a-zeleninou", nazov:"Ražný sendvič s cottage syrom a zeleninou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Cottage syr",
  popis:"Ražný chlieb, cottage syr a plný tanier zeleniny — 9 g vlákniny a 23 g bielkovín.",
  ing:[i("Ražný chlieb",120,"g"),i("Cottage syr",300,"g"),i("Uhorka",200,"g"),i("Mrkva",120,"g"),i("Reďkovka",80,"g")],
  postup:["Nastrúhaj mrkvu nahrubo a nakrájaj uhorku a reďkovky na kolieska.","Natri plátky ražného chleba cottage syrom a osoľ.","Poukladaj na ne zeleninu a sendviče prikry."],
  tipy:"Mrkva na sendviči znie čudne, kým to raz neskúsiš — potom ju budeš dávať všade.",
  tagy:[...T,"sendvič","ražný chlieb","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-sendvic-razny-s-tvarohom-a-mrkvou", nazov:"Ražný sendvič s tvarohom a mrkvou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Ražný chlieb s tvarohovou nátierkou, mrkvou a pažítkou.",
  ing:[i("Ražný chlieb",120,"g"),i("Tvaroh",280,"g"),i("Mrkva",160,"g"),i("Reďkovka",80,"g"),i("Pažítka",10,"g")],
  postup:["Rozmiešaj tvaroh s nasekanou pažítkou a osoľ.","Natri nátierku na plátky ražného chleba.","Posyp nastrúhanou mrkvou a poukladaj kolieska reďkoviek."],
  tipy:"Tvaroh s mrkvou drží lepšie, keď mrkvu po nastrúhaní zľahka vytlačíš.",
  tagy:[...T,"sendvič","ražný chlieb","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-sendvic-razny-s-tuniakom-a-kukuricou", nazov:"Ražný sendvič s tuniakom a kukuricou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tuniak",
  popis:"Ražný chlieb s tuniakovou nátierkou na jogurte, kukuricou a uhorkou.",
  ing:[i("Ražný chlieb",120,"g"),i("Tuniak v konzerve",160,"g"),i("Kukurica sladká",100,"g"),i("Grécky jogurt",60,"g"),i("Uhorka",160,"g")],
  postup:["Sceď tuniak aj kukuricu a nechaj ich odkvapkať.","Rozmiešaj tuniak s jogurtom a kukuricou a osoľ.","Natri nátierku na ražný chlieb a doplň kolieska uhorky."],
  tipy:"Nátierka vydrží v chladničke dva dni — sprav si ju na celý blok.",
  tagy:[...T,"sendvič","ražný chlieb","vláknina","ryba","vysoký obsah bielkovín"] },

{ id:"ranajkovy-toast-celozrnny-s-cottage-a-mrkvou", nazov:"Celozrnný toast s cottage syrom a mrkvou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Cottage syr",
  popis:"Celozrnný toast s cottage syrom, strúhanou mrkvou a klíčkami.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Cottage syr",280,"g"),i("Mrkva",160,"g"),i("Klíčky",40,"g"),i("Uhorka",120,"g")],
  postup:["Opeč plátky chleba v hriankovači dozlatista.","Rozotri po nich cottage syr a osoľ.","Posyp nastrúhanou mrkvou a klíčkami a doplň kolieska uhorky."],
  tipy:"Klíčky pridávajú vlákninu aj chrumkavosť za pár kalórií.",
  tagy:[...T,"sendvič","toast","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-toast-celozrnny-s-tvarohom-a-cviklou", nazov:"Celozrnný toast s tvarohom a cviklou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Celozrnný toast s tvarohom, strúhanou cviklou a tekvicovými semienkami.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Tvaroh",260,"g"),i("Cvikla",160,"g"),i("Tekvicové semienka",16,"g"),i("Reďkovka",60,"g")],
  postup:["Opeč plátky chleba a nechaj ich chvíľu vychladnúť.","Rozmiešaj tvaroh so soľou a natri ho na toasty.","Posyp nastrúhanou cviklou, semienkami a kolieskami reďkoviek."],
  tipy:"Cviklu si uvar dopredu — v chladničke vydrží päť dní.",
  tagy:[...T,"sendvič","toast","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-toast-celozrnny-s-kuracim-a-kapustou", nazov:"Celozrnný toast s kuracím mäsom a kapustou", kat:"Raňajky", kuchyna:"Slovenská", cas:"15 min", hlavna:"Kuracie prsia",
  popis:"Celozrnný toast s opečeným kuracím mäsom a chrumkavým kapustovým šalátom.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Kuracie prsia",180,"g"),i("Kapusta biela",200,"g"),i("Mrkva",100,"g"),i("Grécky jogurt",60,"g")],
  postup:["Nakrájaj kuracie prsia na plátky, osoľ ich a opeč na suchej panvici.","Nakrájaj kapustu na tenké pásiky, nastrúhaj mrkvu a zamiešaj ich s jogurtom.","Opeč chlieb, poukladaj naň mäso a doplň kapustový šalát."],
  tipy:"Kapustu po nakrájaní osoľ a prehnietaj rukou — zmäkne za dve minúty.",
  tagy:[...T,"sendvič","toast","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-celozrnna-s-tvarohom-a-zeleninou", nazov:"Celozrnná bageta s tvarohom a zeleninou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Celozrnná bageta s tvarohom, uhorkou, mrkvou a reďkovkou.",
  ing:[i("Celozrnná bageta",120,"g"),i("Tvaroh",280,"g"),i("Uhorka",160,"g"),i("Mrkva",120,"g"),i("Pažítka",10,"g")],
  postup:["Rozmiešaj tvaroh s pažítkou a soľou.","Prekroj bagetu a natri ju nátierkou.","Poukladaj kolieska uhorky a nastrúhanú mrkvu."],
  tipy:"Celozrnná bageta má proti bielej vyše dvojnásobok vlákniny.",
  tagy:[...T,"sendvič","bageta","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkova-bageta-celozrnna-s-cottage-a-brokolicou", nazov:"Celozrnná bageta s cottage syrom a brokolicou", kat:"Raňajky", kuchyna:"Slovenská", cas:"12 min", hlavna:"Cottage syr",
  popis:"Celozrnná bageta s cottage syrom a blanšírovanou brokolicou.",
  ing:[i("Celozrnná bageta",120,"g"),i("Cottage syr",300,"g"),i("Brokolica",200,"g"),i("Cherry paradajky",120,"g"),i("Slnečnicové semienka",12,"g")],
  postup:["Rozober brokolicu na malé ružičky a blanšíruj ju tri minúty, potom ju schlaď.","Prekroj bagetu a rozotri po nej cottage syr.","Poukladaj brokolicu a polené paradajky a posyp semienkami."],
  tipy:"Blanšírovanú brokolicu hneď schlaď v studenej vode — zostane zelená.",
  tagy:[...T,"sendvič","bageta","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-celozrnny-s-kuracim-a-cicerom", nazov:"Celozrnný wrap s kuracím mäsom a cícerom", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"15 min", hlavna:"Kuracie prsia",
  popis:"Celozrnná tortilla s kuracím mäsom, cícerom a rukolou.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Kuracie prsia",120,"g"),i("Cícer",160,"g"),i("Rukola",30,"g"),i("Grécky jogurt",50,"g")],
  postup:["Nakrájaj kuracie prsia na prúžky, osoľ ich a opeč na suchej panvici.","Sceď cícer, prepláchni ho a zľahka roztlač vidličkou.","Natri tortilly jogurtom, rozdeľ na ne cícer, mäso a rukolu a zroluj."],
  tipy:"Roztlačený cícer drží náplň pokope lepšie než celý.",
  tagy:[...T,"sendvič","wrap","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-celozrnny-s-tvarohom-a-mrkvou", nazov:"Celozrnný wrap s tvarohom a mrkvou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Celozrnná tortilla s tvarohovou nátierkou, mrkvou a kapustou.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Tvaroh",240,"g"),i("Mrkva",140,"g"),i("Kapusta biela",120,"g"),i("Pažítka",10,"g")],
  postup:["Rozmiešaj tvaroh s pažítkou a soľou.","Nastrúhaj mrkvu a nakrájaj kapustu na tenké pásiky.","Natri tvaroh na tortilly, posyp zeleninou a wrap zroluj."],
  tipy:"Kapusta vo wrape drží chrumkavosť dlhšie než šalát.",
  tagy:[...T,"sendvič","wrap","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-wrap-celozrnny-s-tuniakom-a-fazulou", nazov:"Celozrnný wrap s tuniakom a fazuľou", kat:"Raňajky", kuchyna:"Mexická", cas:"10 min", hlavna:"Tuniak",
  popis:"Celozrnná tortilla s tuniakom, bielou fazuľou a paprikou.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Tuniak v konzerve",140,"g"),i("Fazuľa biela",160,"g"),i("Paprika červená",120,"g"),i("Grécky jogurt",50,"g")],
  postup:["Sceď tuniak aj fazuľu a fazuľu prepláchni studenou vodou.","Rozmiešaj tuniak s jogurtom a zľahka roztlačenou fazuľou.","Natri zmes na tortilly, doplň prúžky papriky a zroluj."],
  tipy:"Biela fazuľa je jemnejšia než červená — v nátierke ju necítiť.",
  tagy:[...T,"sendvič","wrap","vláknina","ryba","vysoký obsah bielkovín"] },

{ id:"ranajkovy-bagel-celozrnny-s-tvarohom-a-uhorkou", nazov:"Celozrnný bagel s tvarohom a uhorkou", kat:"Raňajky", kuchyna:"Americká", cas:"8 min", hlavna:"Tvaroh",
  popis:"Celozrnný bagel s tvarohom, uhorkou a reďkovkou.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Tvaroh",240,"g"),i("Uhorka",180,"g"),i("Reďkovka",80,"g"),i("Pažítka",10,"g")],
  postup:["Prekroj bagely a opeč ich v hriankovači.","Rozmiešaj tvaroh s pažítkou a soľou a natri ho na bagely.","Poukladaj kolieska uhorky a reďkoviek."],
  tipy:"Bagel opeč rezom nadol — nasiakne menej vlhkosti z nátierky.",
  tagy:[...T,"sendvič","bagel","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-bagel-celozrnny-s-cottage-a-cviklou", nazov:"Celozrnný bagel s cottage syrom a cviklou", kat:"Raňajky", kuchyna:"Americká", cas:"8 min", hlavna:"Cottage syr",
  popis:"Celozrnný bagel s cottage syrom, cviklou a tekvicovými semienkami.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Cottage syr",220,"g"),i("Cvikla",140,"g"),i("Tekvicové semienka",10,"g"),i("Rukola",30,"g")],
  postup:["Prekroj bagely a opeč ich dozlatista.","Rozotri po nich cottage syr a osoľ.","Posyp nastrúhanou cviklou, rukolou a tekvicovými semienkami."],
  tipy:"Cvikla farbí — natieraj ju až na syr, nie priamo na pečivo.",
  tagy:[...T,"sendvič","bagel","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkova-zemla-celozrnna-s-tvarohom-a-kapustou", nazov:"Celozrnná žemľa s tvarohom a kapustou", kat:"Raňajky", kuchyna:"Slovenská", cas:"8 min", hlavna:"Tvaroh",
  popis:"Celozrnná žemľa s tvarohom a kapustovo-mrkvovým šalátom.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Tvaroh",260,"g"),i("Kapusta biela",160,"g"),i("Mrkva",120,"g"),i("Kôpor",8,"g")],
  postup:["Nakrájaj kapustu na tenké pásiky, nastrúhaj mrkvu a osoľ ich.","Rozmiešaj tvaroh s nasekaným kôprom.","Prekroj žemle, natri ich tvarohom a naplň kapustovým šalátom."],
  tipy:"Šalát nechaj desať minút odstáť — kapusta pustí vodu a zmäkne.",
  tagy:[...T,"obložené pečivo","žemľa","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkovy-rozok-grahamovy-s-cottage-a-redkovkou", nazov:"Grahamový rožok s cottage syrom a reďkovkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"7 min", hlavna:"Cottage syr",
  popis:"Grahamový rožok s cottage syrom, reďkovkou a mrkvou.",
  ing:[i("Grahamový rožok",2,"ks"),i("Cottage syr",280,"g"),i("Reďkovka",100,"g"),i("Mrkva",120,"g"),i("Pažítka",10,"g")],
  postup:["Prekroj rožky a rozotri po nich cottage syr.","Nastrúhaj mrkvu a nakrájaj reďkovky na kolieska.","Poukladaj zeleninu, posyp pažítkou a osoľ."],
  tipy:"Grahamový rožok drží tvar lepšie než biely, aj keď je nátierka vlhká.",
  tagy:[...T,"obložené pečivo","rožok","vláknina","vysoký obsah bielkovín"] },

{ id:"ranajkova-pita-celozrnna-s-cottage-a-zeleninou", nazov:"Celozrnná pita s cottage syrom a zeleninou", kat:"Raňajky", kuchyna:"Grécka", cas:"10 min", hlavna:"Cottage syr",
  popis:"Celozrnná pita naplnená cottage syrom, uhorkou, paradajkou a rukolou.",
  ing:[i("Celozrnná pita",2,"ks"),i("Cottage syr",280,"g"),i("Uhorka",160,"g"),i("Cherry paradajky",140,"g"),i("Rukola",30,"g")],
  postup:["Nahrej pity v hriankovači a rozrež ich na vrecko.","Nakrájaj uhorku na kocky a paradajky napoly.","Naplň pity cottage syrom, zeleninou a rukolou a osoľ."],
  tipy:"Pitu plň až tesne pred jedlom — vlhká zelenina ju rozmočí.",
  tagy:[...T,"sendvič","pita","vláknina","vysoký obsah bielkovín"] },

// ── VEČERNÉ HLAVNÉ JEDLÁ (rozpoznaný sacharid, 380–470 kcal) ──────────────────
{ id:"kuracie-prsia-s-bulgurom-a-kelom", nazov:"Kuracie prsia s bulgurom a kelom", kat:"Hlavné jedlo", kuchyna:"Blízkovýchodná", cas:"30 min", porcie:4, hlavna:"Kuracie prsia",
  popis:"Bulgur dusený s kelom a mrkvou, k tomu opečené kuracie prsia.",
  ing:[i("Bulgur",180,"g"),i("Kuracie prsia",400,"g"),i("Kel",480,"g"),i("Mrkva",240,"g"),i("Olivový olej",20,"g"),i("Cesnak",12,"g")],
  postup:["Nakrájaj kuracie prsia na kocky, osoľ ich a opeč na oleji dozlatista.","Pridaj nastrúhanú mrkvu, kel nakrájaný na pásiky a cesnak a krátko orestuj.","Vsyp bulgur, zalej dvojnásobkom vody, prikry a dus 15 minút."],
  tipy:"Bulgur nemieš počas dusenia — nasiakne rovnomerne sám.",
  tagy:["hlavné jedlo","celozrnné","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"zemiakovy-gulas-s-cicerom-a-kuracim", nazov:"Zemiakový guláš s cícerom a kuracím mäsom", kat:"Hlavné jedlo", kuchyna:"Slovenská", cas:"35 min", porcie:4, hlavna:"Zemiaky",
  popis:"Zemiakový guláš obohatený o cícer a kuracie mäso.",
  ing:[i("Zemiaky",800,"g"),i("Cícer",400,"g"),i("Kuracie prsia",320,"g"),i("Paprika červená",320,"g"),i("Cibuľa",160,"g"),i("Paradajkový pretlak",120,"g"),i("Rasca",4,"g")],
  postup:["Nakrájaj kuracie prsia na kocky a opeč ich na suchom hrnci.","Pridaj nasekanú cibuľu, papriku a rascu a krátko orestuj.","Vlož nakrájané zemiaky, pretlak a scedený cícer, zalej vodou a var 20 minút."],
  tipy:"Cícer pridaj až na koniec — pri dlhom varení sa rozpadne.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"celozrnne-cestoviny-s-tuniakom-a-brokolicou", nazov:"Celozrnné cestoviny s tuniakom a brokolicou", kat:"Cestoviny", kuchyna:"Talianska", cas:"25 min", porcie:4, hlavna:"Tuniak",
  popis:"Celozrnné cestoviny s tuniakom, brokolicou a cesnakom.",
  ing:[i("Celozrnné cestoviny",220,"g"),i("Tuniak v konzerve",360,"g"),i("Brokolica",600,"g"),i("Olivový olej",24,"g"),i("Cesnak",16,"g"),i("Cherry paradajky",240,"g")],
  postup:["Uvar cestoviny v osolenej vode a posledných päť minút pridaj ružičky brokolice.","Orestuj plátky cesnaku na oleji a pridaj polené paradajky.","Vmiešaj scedený tuniak a scedené cestoviny s brokolicou a prehrej."],
  tipy:"Tuniak vmiešaj až mimo platne — dlhým varením vyschne.",
  tagy:["cestoviny","celozrnné","vláknina","ryba","vysoký obsah bielkovín"] },

{ id:"zemiaky-zapekane-s-brokolicou-a-cottage", nazov:"Zemiaky zapekané s brokolicou a cottage syrom", kat:"Hlavné jedlo", kuchyna:"Slovenská", cas:"45 min", porcie:4, hlavna:"Zemiaky", narocnost:"stredná",
  popis:"Zemiaky a brokolica zapečené s cottage syrom a vajcom.",
  ing:[i("Zemiaky",800,"g"),i("Brokolica",600,"g"),i("Cottage syr",480,"g"),i("Vajcia",3,"ks"),i("Syr eidam",100,"g"),i("Cesnak",12,"g")],
  postup:["Uvar zemiaky v šupke domäkka, nechaj ich vychladnúť a nakrájaj na kolieska.","Blanšíruj ružičky brokolice tri minúty a osuš ich.","Vylož zemiaky s brokolicou do misy, zalej cottage syrom rozšľahaným s vajcami a cesnakom, posyp syrom a zapekaj 25 minút pri 190 °C."],
  tipy:"Zemiaky uvarené deň dopredu držia tvar a nerozpadnú sa.",
  tagy:["hlavné jedlo","zelenina","vláknina","zapekané","vysoký obsah bielkovín"] },

{ id:"bulgur-s-kuracim-a-cicerom", nazov:"Bulgur s kuracím mäsom a cícerom", kat:"Hlavné jedlo", kuchyna:"Blízkovýchodná", cas:"30 min", porcie:4, hlavna:"Bulgur",
  popis:"Bulgur s kuracím mäsom, cícerom a paprikou.",
  ing:[i("Bulgur",160,"g"),i("Kuracie prsia",360,"g"),i("Cícer",400,"g"),i("Paprika červená",320,"g"),i("Cibuľa",160,"g"),i("Olivový olej",20,"g"),i("Rasca",4,"g")],
  postup:["Nakrájaj kuracie prsia na kocky a opeč ich na oleji.","Pridaj nasekanú cibuľu, papriku a rascu a krátko orestuj.","Vsyp bulgur so scedeným cícerom, zalej dvojnásobkom vody a dus 15 minút."],
  tipy:"Rascu opraž na tuku pred pridaním vody — vôňa je potom výraznejšia.",
  tagy:["hlavné jedlo","celozrnné","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"zemiakova-polievka-s-fazulou-a-hribmi", nazov:"Zemiaková polievka s fazuľou a hríbmi", kat:"Polievka", kuchyna:"Slovenská", cas:"40 min", porcie:4, hlavna:"Zemiaky",
  popis:"Hustá zemiaková polievka s bielou fazuľou, hríbmi a mrkvou.",
  ing:[i("Zemiaky",640,"g"),i("Fazuľa biela",480,"g"),i("Šampiňóny",320,"g"),i("Mrkva",240,"g"),i("Cibuľa",160,"g"),i("Zeleninový vývar",1400,"ml"),i("Majoránka",4,"g")],
  postup:["Orestuj nasekanú cibuľu a nakrájané šampiňóny na suchom hrnci.","Pridaj nakrájané zemiaky a mrkvu a zalej vývarom.","Var 20 minút, vmiešaj scedenú fazuľu, dochuť majoránkou a osoľ."],
  tipy:"Zemiakovú polievku zahustíš tak, že pár kociek zemiakov roztlačíš priamo v hrnci.",
  tagy:["polievka","strukoviny","vláknina","slovenská"] },

{ id:"kuracie-so-sosovicou-a-zemiakmi", nazov:"Kuracie mäso so šošovicou a zemiakmi", kat:"Hlavné jedlo", kuchyna:"Slovenská", cas:"40 min", porcie:4, hlavna:"Kuracie prsia",
  popis:"Dusené kuracie mäso so šošovicou, zemiakmi a mrkvou.",
  ing:[i("Kuracie prsia",360,"g"),i("Šošovica",180,"g"),i("Zemiaky",560,"g"),i("Mrkva",240,"g"),i("Cibuľa",160,"g"),i("Olivový olej",20,"g"),i("Majoránka",4,"g")],
  postup:["Nakrájaj kuracie prsia na kocky a opeč ich na oleji dozlatista.","Pridaj nasekanú cibuľu, mrkvu a prepláchnutú šošovicu a zalej vodou.","Var 20 minút, pridaj nakrájané zemiaky a dovar 15 minút. Dochuť majoránkou."],
  tipy:"Zemiaky pridávaj až k takmer mäkkej šošovici — inak sa rozvaria.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"zemiakovy-salat-s-fazulou-a-vajcom", nazov:"Zemiakový šalát s fazuľou a vajcom", kat:"Šalát", kuchyna:"Slovenská", cas:"30 min", porcie:2, hlavna:"Zemiaky",
  popis:"Vlažný zemiakový šalát s bielou fazuľou, vajcom a horčicovým dresingom.",
  ing:[i("Zemiaky",300,"g"),i("Fazuľa biela",240,"g"),i("Vajcia",2,"ks"),i("Jarná cibuľka",40,"g"),i("Horčica",12,"g"),i("Olivový olej",12,"g"),i("Citrónová šťava",20,"g")],
  postup:["Uvar zemiaky v šupke domäkka a vajcia natvrdo.","Olúp zemiaky, nakrájaj ich na kocky a zmiešaj so scedenou fazuľou.","Rozšľahaj olej s horčicou a citrónom, zalej tým šalát a doplň polené vajcia a cibuľku."],
  tipy:"Dresing prilej do ešte teplých zemiakov — nasiaknu ho oveľa lepšie.",
  tagy:["šalát","strukoviny","vláknina","vajcia"] },

{ id:"celozrnne-cestoviny-s-cottage-a-spenatom", nazov:"Celozrnné cestoviny s cottage syrom a špenátom", kat:"Cestoviny", kuchyna:"Talianska", cas:"20 min", porcie:4, hlavna:"Celozrnné cestoviny",
  popis:"Celozrnné cestoviny s cottage syrom, špenátom a cesnakom — omáčka bez smotany.",
  ing:[i("Celozrnné cestoviny",220,"g"),i("Cottage syr",480,"g"),i("Špenát",400,"g"),i("Cesnak",16,"g"),i("Olivový olej",20,"g"),i("Cherry paradajky",240,"g")],
  postup:["Uvar cestoviny v osolenej vode a odlož si šálku vody z varenia.","Orestuj plátky cesnaku na oleji, pridaj špenát a nechaj ho spadnúť.","Vmiešaj cottage syr, polené paradajky a scedené cestoviny a rozrieď vodou z varenia."],
  tipy:"Cottage syr rozmixuj, ak chceš hladkú omáčku bez hrudiek.",
  tagy:["cestoviny","celozrnné","vláknina","vysoký obsah bielkovín"] },

{ id:"pecene-zemiaky-s-cicerom-a-fetou", nazov:"Pečené zemiaky s cícerom a fetou", kat:"Hlavné jedlo", kuchyna:"Grécka", cas:"45 min", porcie:4, hlavna:"Zemiaky", narocnost:"stredná",
  popis:"Zemiaky a cícer pečené s paprikou a fetou.",
  ing:[i("Zemiaky",800,"g"),i("Cícer",480,"g"),i("Paprika červená",320,"g"),i("Feta",160,"g"),i("Olivový olej",32,"g"),i("Oregano",4,"g")],
  postup:["Predhrej rúru na 200 °C a nakrájaj zemiaky na mesiačiky.","Zmiešaj zemiaky so scedeným cícerom a paprikou, pokvapkaj olejom a posyp oreganom.","Peč 30 minút, potom posyp rozdrobenou fetou a dopeč päť minút."],
  tipy:"Cícer po pečení chrumká — nechaj mu na plechu miesto, nech sa nedusí.",
  tagy:["hlavné jedlo","strukoviny","vláknina","bezmäsité"] },

{ id:"bulgurova-panvica-s-tuniakom-a-zeleninou", nazov:"Bulgurová panvica s tuniakom a zeleninou", kat:"Hlavné jedlo", kuchyna:"Stredomorská", cas:"25 min", porcie:4, hlavna:"Bulgur",
  popis:"Bulgur dusený s paprikou a cuketou, na konci vmiešaný tuniak.",
  ing:[i("Bulgur",180,"g"),i("Tuniak v konzerve",360,"g"),i("Paprika červená",320,"g"),i("Cuketa",320,"g"),i("Cibuľa",160,"g"),i("Olivový olej",20,"g"),i("Petržlenová vňať",20,"g")],
  postup:["Orestuj nasekanú cibuľu, papriku a cuketu na oleji.","Vsyp bulgur, zalej dvojnásobkom vody, prikry a dus 15 minút.","Vmiešaj scedený tuniak, osoľ a posyp nasekanou vňaťou."],
  tipy:"Tuniak vo vlastnej šťave má tretinu kalórií oproti tomu v oleji.",
  tagy:["hlavné jedlo","celozrnné","vláknina","ryba","vysoký obsah bielkovín"] },

{ id:"zapekane-cestoviny-s-cicerom-a-brokolicou", nazov:"Zapekané celozrnné cestoviny s cícerom a brokolicou", kat:"Cestoviny", kuchyna:"Talianska", cas:"45 min", porcie:4, hlavna:"Celozrnné cestoviny", narocnost:"stredná",
  popis:"Celozrnné cestoviny zapečené s cícerom, brokolicou a syrom.",
  ing:[i("Celozrnné cestoviny",200,"g"),i("Cícer",400,"g"),i("Brokolica",520,"g"),i("Syr eidam",120,"g"),i("Mlieko",280,"ml"),i("Vajcia",2,"ks")],
  postup:["Uvar cestoviny na skusmo a posledné tri minúty pridaj ružičky brokolice.","Zmiešaj scedené cestoviny s brokolicou a scedeným cícerom a vylož do zapekacej misy.","Rozšľahaj vajcia s mliekom, zalej tým misu, posyp syrom a zapekaj 25 minút pri 190 °C."],
  tipy:"Cestoviny nedovar úplne — v rúre sa dopečú a zostanú pevné.",
  tagy:["cestoviny","strukoviny","vláknina","zapekané","vysoký obsah bielkovín"] }
];
