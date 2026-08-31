// Vlna 5, druhá dávka — recepty, ktoré majú VYSOKÚ VLÁKNINU AJ VYSOKÚ HUSTOTU BIELKOVÍN.
// Dôvod: `skoreJedla` sčítava bielkovinový a vlákninový člen. Čisto strukovinové jedlo má
// hustotu bielkovín 3,5–4,5 g/100 kcal a v turnaji prehráva s mäsom (7–9), takže sa do plánu
// dostane zriedka a priemer vlákniny sa nehne. Kombinácia strukovina + chudé mäso/tvaroh
// vyhráva oba členy naraz. Druhá polovica dávky sú SENDVIČOVÉ raňajky nad 8 g vlákniny —
// raňajkový slot má dnes najnižší absolútny prínos vlákniny zo všetkých troch hlavných slotov.
"use strict";
const i = (nazov, mnozstvo, jednotka, poznamka) => ({ nazov, mnozstvo, jednotka, poznamka: poznamka || "" });
const T = ["raňajky"];

module.exports = [

// ── STRUKOVINY + BIELKOVINA ────────────────────────────────────────────────────
{ id:"kuracie-prsia-s-cicerom-a-spenatom", nazov:"Kuracie prsia s cícerom a špenátom", kat:"Hlavné jedlo", kuchyna:"Stredomorská", cas:"30 min", porcie:4, hlavna:"Kuracie prsia",
  popis:"Panvica z kuracích pŕs, cíceru a špenátu — bielkoviny aj vláknina v jednom.",
  ing:[i("Kuracie prsia",400,"g"),i("Cícer",720,"g"),i("Špenát",400,"g"),i("Olivový olej",32,"g"),i("Cesnak",16,"g"),i("Paradajkový pretlak",120,"g")],
  postup:["Nakrájaj kuracie prsia na kocky, osoľ ich a opeč na oleji dozlatista.","Pridaj plátky cesnaku a paradajkový pretlak a krátko prehrej.","Vmiešaj scedený cícer a špenát a dus päť minút, kým špenát nespadne."],
  tipy:"Cícer z konzervy je rovnako výživný ako varený zo suchého — ušetríš hodinu.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"sosovicova-polievka-s-kuracim-masom-a-kelom", nazov:"Šošovicová polievka s kuracím mäsom a kelom", kat:"Polievka", kuchyna:"Slovenská", cas:"40 min", porcie:4, hlavna:"Šošovica",
  popis:"Hustá šošovicová polievka s kuracím mäsom, kelom a mrkvou.",
  ing:[i("Šošovica",280,"g"),i("Kuracie prsia",280,"g"),i("Mrkva",400,"g"),i("Kel",400,"g"),i("Cibuľa",160,"g"),i("Zeleninový vývar",1400,"ml"),i("Olivový olej",20,"g")],
  postup:["Nakrájaj kuracie prsia na kocky a opeč ich na oleji.","Pridaj nasekanú cibuľu, mrkvu a prepláchnutú šošovicu a zalej vývarom.","Var 25 minút, pridaj kel nakrájaný na pásiky a dovar päť minút. Osoľ."],
  tipy:"Kuracie mäso opeč najprv nasucho — polievka bude mať výraznejšiu chuť.",
  tagy:["polievka","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"fazulovy-salat-s-tuniakom", nazov:"Fazuľový šalát s tuniakom", kat:"Šalát", kuchyna:"Talianska", cas:"15 min", porcie:2, hlavna:"Tuniak",
  popis:"Toskánsky šalát z bielej fazule a tuniaka s červenou cibuľou.",
  ing:[i("Fazuľa biela",400,"g"),i("Tuniak v konzerve",200,"g"),i("Paprika červená",200,"g"),i("Cibuľa červená",80,"g"),i("Olivový olej",20,"g"),i("Citrónová šťava",20,"g"),i("Petržlenová vňať",20,"g")],
  postup:["Sceď fazuľu aj tuniak a prepláchni fazuľu studenou vodou.","Nakrájaj papriku a cibuľu na tenké prúžky.","Zmiešaj všetko s olejom a citrónovou šťavou, osoľ a posyp nasekanou vňaťou."],
  tipy:"Cibuľu nechaj päť minút v citrónovej šťave — stratí ostrosť.",
  tagy:["šalát","strukoviny","vláknina","ryba","vysoký obsah bielkovín"] },

{ id:"celozrnne-cestoviny-s-kuracim-a-brokolicou", nazov:"Celozrnné cestoviny s kuracím mäsom a brokolicou", kat:"Cestoviny", kuchyna:"Talianska", cas:"25 min", porcie:4, hlavna:"Kuracie prsia",
  popis:"Celozrnné cestoviny s kuracím mäsom, brokolicou a cesnakom.",
  ing:[i("Celozrnné cestoviny",220,"g"),i("Kuracie prsia",440,"g"),i("Brokolica",600,"g"),i("Cícer",240,"g"),i("Olivový olej",32,"g"),i("Cesnak",16,"g")],
  postup:["Uvar cestoviny v osolenej vode a posledných päť minút k nim pridaj ružičky brokolice.","Nakrájaj kuracie prsia na prúžky a opeč ich na oleji s cesnakom.","Vmiešaj scedený cícer a scedené cestoviny s brokolicou a prehrej."],
  tipy:"Celozrnné cestoviny potrebujú o dve minúty dlhšie než biele — skús ich na skusmo.",
  tagy:["cestoviny","celozrnné","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"cicerovy-salat-s-kuracim-masom-a-rukolou", nazov:"Cícerový šalát s kuracím mäsom a rukolou", kat:"Šalát", kuchyna:"Stredomorská", cas:"20 min", porcie:2, hlavna:"Cícer",
  popis:"Šalát z cíceru, opečeného kuracieho mäsa a rukoly s citrónovým dresingom.",
  ing:[i("Cícer",360,"g"),i("Kuracie prsia",200,"g"),i("Rukola",60,"g"),i("Cherry paradajky",200,"g"),i("Olivový olej",16,"g"),i("Citrónová šťava",20,"g")],
  postup:["Nakrájaj kuracie prsia na prúžky, osoľ ich a opeč na oleji.","Sceď cícer a prepláchni ho studenou vodou.","Zmiešaj cícer s polenými paradajkami, mäsom a rukolou a pokvapkaj citrónovou šťavou."],
  tipy:"Mäso nechaj na šalát vychladnúť — horúce by rukolu zvarilo.",
  tagy:["šalát","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"sosovicovy-salat-s-vajcom-a-spenatom", nazov:"Šošovicový šalát s vajcom a špenátom", kat:"Šalát", kuchyna:"Slovenská", cas:"30 min", porcie:2, hlavna:"Šošovica",
  popis:"Vlažný šalát z varenej šošovice, vajec natvrdo a čerstvého špenátu.",
  ing:[i("Šošovica",130,"g"),i("Vajcia",3,"ks"),i("Špenát",120,"g"),i("Cherry paradajky",200,"g"),i("Olivový olej",16,"g"),i("Horčica",10,"g"),i("Citrónová šťava",20,"g")],
  postup:["Uvar prepláchnutú šošovicu 20 minút domäkka a sceď ju.","Uvar vajcia natvrdo a schlaď ich v studenej vode.","Rozšľahaj olej s horčicou a citrónom, zamiešaj do šošovice a doplň špenát, paradajky a polené vajcia."],
  tipy:"Dresing pridaj do teplej šošovice — nasiakne ho lepšie než studená.",
  tagy:["šalát","strukoviny","vláknina","vajcia","vysoký obsah bielkovín"] },

{ id:"krupy-s-kuracim-masom-a-zeleninou", nazov:"Krúpy s kuracím mäsom a zeleninou", kat:"Hlavné jedlo", kuchyna:"Slovenská", cas:"40 min", porcie:4, hlavna:"Krúpy", narocnost:"stredná",
  popis:"Jačmenné krúpy dusené s kuracím mäsom, mrkvou a zelerom.",
  ing:[i("Krúpy",240,"g"),i("Kuracie prsia",400,"g"),i("Mrkva",320,"g"),i("Zeler",200,"g"),i("Cibuľa",160,"g"),i("Olivový olej",28,"g"),i("Majoránka",4,"g")],
  postup:["Nakrájaj kuracie prsia na kocky a opeč ich na oleji dozlatista.","Pridaj nasekanú cibuľu, mrkvu a zeler a krátko orestuj.","Vsyp prepláchnuté krúpy, zalej trojnásobkom vody a dus 25 minút. Dochuť majoránkou."],
  tipy:"Krúpy pri dusení naberajú vodu — ak zhustnú priskoro, podlej ich vývarom.",
  tagy:["hlavné jedlo","celozrnné","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"kuracie-kari-s-cicerom-a-brokolicou", nazov:"Kuracie kari s cícerom a brokolicou", kat:"Hlavné jedlo", kuchyna:"Indická", cas:"35 min", porcie:4, hlavna:"Kuracie prsia",
  popis:"Kuracie kari s cícerom, brokolicou a kokosovým mliekom.",
  ing:[i("Kuracie prsia",400,"g"),i("Cícer",560,"g"),i("Brokolica",480,"g"),i("Kokosové mlieko",200,"g"),i("Cibuľa",160,"g"),i("Karí korenie",16,"g"),i("Olivový olej",24,"g")],
  postup:["Nakrájaj kuracie prsia na kocky a opeč ich na oleji.","Pridaj nasekanú cibuľu s karí korením a krátko opraž.","Vlož ružičky brokolice a scedený cícer, zalej kokosovým mliekom a dus 15 minút."],
  tipy:"Kari podávaj s celozrnnou ryžou — vláknina sa tým ešte zdvihne.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"mexicka-panvica-s-mletym-masom-a-fazulou", nazov:"Mexická panvica s mletým mäsom a fazuľou", kat:"Hlavné jedlo", kuchyna:"Mexická", cas:"30 min", porcie:4, hlavna:"Mleté hovädzie mäso",
  popis:"Mleté hovädzie mäso s červenou fazuľou, kukuricou a paprikou.",
  ing:[i("Mleté hovädzie mäso",320,"g"),i("Fazuľa červená",640,"g"),i("Kukurica sladká",240,"g"),i("Paprika červená",320,"g"),i("Paradajkový pretlak",200,"g"),i("Cibuľa",160,"g"),i("Chilli",16,"g")],
  postup:["Opeč mleté mäso na suchej panvici, kým sa nerozpadne a nezhnedne.","Pridaj nasekanú cibuľu, papriku a chilli a krátko orestuj.","Vmiešaj pretlak, scedenú fazuľu a kukuricu, podlej vodou a dus 15 minút."],
  tipy:"Mäso nemieš hneď — nechaj ho minútu chytiť kôrku, potom rozober vareškou.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"zapekany-karfiol-s-cicerom-a-syrom", nazov:"Zapekaný karfiol s cícerom a syrom", kat:"Hlavné jedlo", kuchyna:"Slovenská", cas:"45 min", porcie:4, hlavna:"Karfiol", narocnost:"stredná",
  popis:"Karfiol a cícer zapečené s vajcovo-mliečnou zálievkou a eidamom.",
  ing:[i("Karfiol",1000,"g"),i("Cícer",480,"g"),i("Syr eidam",160,"g"),i("Vajcia",3,"ks"),i("Mlieko",300,"ml"),i("Cesnak",12,"g")],
  postup:["Rozober karfiol na ružičky a blanšíruj ho päť minút.","Vylož karfiol so scedeným cícerom do zapekacej misy.","Rozšľahaj vajcia s mliekom a cesnakom, zalej tým misu, posyp syrom a zapekaj 25 minút pri 190 °C."],
  tipy:"Karfiol po blanšírovaní dobre osuš — inak zapekanie zvodnatie.",
  tagy:["hlavné jedlo","strukoviny","vláknina","zapekané","vysoký obsah bielkovín"] },

{ id:"tuniakovy-salat-s-cicerom-a-uhorkou", nazov:"Tuniakový šalát s cícerom a uhorkou", kat:"Šalát", kuchyna:"Stredomorská", cas:"12 min", porcie:2, hlavna:"Tuniak",
  popis:"Rýchly šalát z tuniaka, cíceru a uhorky s jogurtovým dresingom.",
  ing:[i("Cícer",360,"g"),i("Tuniak v konzerve",180,"g"),i("Uhorka",240,"g"),i("Grécky jogurt",80,"g"),i("Jarná cibuľka",40,"g"),i("Citrónová šťava",20,"g")],
  postup:["Sceď cícer aj tuniak a prepláchni cícer studenou vodou.","Nakrájaj uhorku na kocky a jarnú cibuľku na kolieska.","Zmiešaj všetko s jogurtom a citrónovou šťavou a osoľ."],
  tipy:"Jogurtový dresing drží šalát vláčny aj na druhý deň v obedári.",
  tagy:["šalát","strukoviny","vláknina","ryba","vysoký obsah bielkovín"] },

{ id:"fazulova-polievka-s-udenym-masom", nazov:"Fazuľová polievka s údeným mäsom", kat:"Polievka", kuchyna:"Slovenská", cas:"40 min", porcie:4, hlavna:"Fazuľa",
  popis:"Sýta fazuľová polievka s údeným mäsom, mrkvou a zemiakmi.",
  ing:[i("Fazuľa biela",720,"g"),i("Údené mäso",240,"g"),i("Mrkva",240,"g"),i("Zemiaky",320,"g"),i("Cibuľa",160,"g"),i("Zeleninový vývar",1400,"ml"),i("Majoránka",4,"g")],
  postup:["Nakrájaj údené mäso na kocky a opeč ho na suchom hrnci.","Pridaj nasekanú cibuľu, mrkvu a zemiaky a zalej vývarom.","Var 20 minút, vmiešaj scedenú fazuľu a dochuť majoránkou."],
  tipy:"Údené mäso je slané — polievku osoľ až na konci.",
  tagy:["polievka","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

{ id:"sakshuka-so-sosovicou", nazov:"Šakšuka so šošovicou", kat:"Hlavné jedlo", kuchyna:"Blízkovýchodná", cas:"35 min", porcie:4, hlavna:"Vajcia", narocnost:"stredná",
  popis:"Vajcia zapečené v paradajkovej omáčke s červenou šošovicou a paprikou.",
  ing:[i("Šošovica červená",200,"g"),i("Vajcia",4,"ks"),i("Paradajkový pretlak",240,"g"),i("Paprika červená",400,"g"),i("Cibuľa",200,"g"),i("Olivový olej",28,"g"),i("Rasca",4,"g")],
  postup:["Orestuj nasekanú cibuľu s paprikou na oleji a pridaj rascu.","Vmiešaj pretlak a prepláchnutú červenú šošovicu, zalej vodou a var 20 minút.","Vytvor v omáčke jamky, rozklepni do nich vajcia, prikry a dus päť minút."],
  tipy:"Vajcia dus prikryté — bielok stuhne a žĺtok zostane tekutý.",
  tagy:["hlavné jedlo","strukoviny","vláknina","vajcia","vysoký obsah bielkovín"] },

{ id:"bravcove-so-sosovicou-a-kapustou", nazov:"Bravčové stehno so šošovicou a kapustou", kat:"Hlavné jedlo", kuchyna:"Slovenská", cas:"45 min", porcie:4, hlavna:"Bravčové stehno", narocnost:"stredná",
  popis:"Dusené bravčové stehno so šošovicou a kyslou kapustou.",
  ing:[i("Bravčové stehno",400,"g"),i("Šošovica",240,"g"),i("Kyslá kapusta",400,"g"),i("Cibuľa",160,"g"),i("Olivový olej",24,"g"),i("Rasca",4,"g")],
  postup:["Nakrájaj bravčové stehno na kocky a opeč ho na oleji zo všetkých strán.","Pridaj nasekanú cibuľu s rascou a krátko orestuj.","Vsyp prepláchnutú šošovicu, pridaj kyslú kapustu, zalej vodou a dus 30 minút."],
  tipy:"Kyslá kapusta šošovicu spomaľuje — pridaj ju až keď je šošovica takmer mäkká.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","slovenská"] },

{ id:"cicerova-panvica-s-tofu-a-spenatom", nazov:"Cícerová panvica s tofu a špenátom", kat:"Hlavné jedlo", kuchyna:"Ázijská", cas:"25 min", porcie:4, hlavna:"Tofu",
  popis:"Cícer a údené tofu restované so špenátom a sójovou omáčkou.",
  ing:[i("Cícer",640,"g"),i("Tofu",400,"g"),i("Špenát",400,"g"),i("Sójová omáčka",40,"g"),i("Olivový olej",28,"g"),i("Cesnak",16,"g"),i("Sezamové semienka",20,"g")],
  postup:["Nakrájaj tofu na kocky a opeč ho na oleji dozlatista.","Pridaj plátky cesnaku a scedený cícer a krátko prehrej.","Vmiešaj špenát so sójovou omáčkou, nechaj ho spadnúť a posyp sezamom."],
  tipy:"Tofu pred opekaním osuš v utierke — inak sa neopečie, ale dusí.",
  tagy:["hlavné jedlo","strukoviny","vláknina","bezmäsité","vysoký obsah bielkovín"] },

{ id:"hovadzi-gulas-s-fazulou-a-zeleninou", nazov:"Hovädzí guláš s fazuľou a zeleninou", kat:"Hlavné jedlo", kuchyna:"Maďarská", cas:"45 min", porcie:4, hlavna:"Mleté hovädzie mäso", narocnost:"stredná",
  popis:"Hovädzí guláš s bielou fazuľou, mrkvou a paprikou.",
  ing:[i("Mleté hovädzie mäso",320,"g"),i("Fazuľa biela",640,"g"),i("Mrkva",320,"g"),i("Paprika červená",320,"g"),i("Paradajkový pretlak",160,"g"),i("Cibuľa",200,"g"),i("Rasca",4,"g")],
  postup:["Opeč mleté mäso na suchom hrnci dohneda.","Pridaj nasekanú cibuľu, mrkvu, papriku a rascu a krátko orestuj.","Vmiešaj pretlak a scedenú fazuľu, zalej vodou a dus 25 minút. Osoľ."],
  tipy:"Guláš je hustejší, keď hrsť fazule roztlačíš priamo v hrnci.",
  tagy:["hlavné jedlo","strukoviny","vláknina","mäso","vysoký obsah bielkovín"] },

// ── SENDVIČOVÉ RAŇAJKY S VYSOKOU VLÁKNINOU ────────────────────────────────────
{ id:"ranajkovy-wrap-s-fazulou-a-cottage", nazov:"Raňajkový wrap s fazuľou a cottage syrom", kat:"Raňajky", kuchyna:"Mexická", cas:"10 min", hlavna:"Fazuľa",
  popis:"Celozrnná tortilla s roztlačenou fazuľou a cottage syrom — 10 g vlákniny na porciu.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Fazuľa červená",200,"g"),i("Cottage syr",160,"g"),i("Paradajky",80,"g"),i("Jarná cibuľka",30,"g")],
  postup:["Sceď fazuľu, prepláchni ju a roztlač vidličkou na hrubú kašu.","Natri fazuľu na tortilly a doplň cottage syr.","Posyp nakrájanou paradajkou a jarnou cibuľkou a wrap zroluj."],
  tipy:"Fazuľu dochuť štipkou rasce — chuť sa priblíži mexickým refried beans.",
  tagy:[...T,"sendvič","wrap","vláknina","strukoviny"] },

{ id:"ranajkovy-wrap-s-hummusom-a-sosovicou", nazov:"Raňajkový wrap s hummusom a šošovicou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"10 min", hlavna:"Šošovica",
  popis:"Celozrnná tortilla s hummusom, varenou šošovicou a mrkvou.",
  ing:[i("Celozrnná tortilla",2,"ks"),i("Hummus",100,"g"),i("Šošovica",50,"g"),i("Mrkva",100,"g"),i("Rukola",30,"g")],
  postup:["Uvar prepláchnutú šošovicu 20 minút domäkka a sceď ju.","Natri hummus na tortilly a rozdeľ na ne vychladnutú šošovicu.","Posyp nastrúhanou mrkvou a rukolou a wrap zroluj."],
  tipy:"Šošovicu uvar večer na dvakrát — ušetríš ranné minúty.",
  tagy:[...T,"sendvič","wrap","vláknina","strukoviny"] },

{ id:"ranajkova-bageta-s-hummusom-a-cicerom", nazov:"Raňajková bageta s hummusom a cícerom", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"8 min", hlavna:"Cícer",
  popis:"Celozrnná bageta s hummusom, cícerom a paradajkou — 11 g vlákniny.",
  ing:[i("Celozrnná bageta",140,"g"),i("Hummus",100,"g"),i("Cícer",120,"g"),i("Cherry paradajky",100,"g"),i("Petržlenová vňať",10,"g")],
  postup:["Prekroj bagetu a natri ju hummusom.","Sceď cícer, prepláchni ho a rozdeľ na bagetu.","Poukladaj polené paradajky, posyp vňaťou a osoľ."],
  tipy:"Časť cíceru roztlač priamo na bagetu — lepšie drží.",
  tagy:[...T,"sendvič","bageta","vláknina","strukoviny"] },

{ id:"ranajkovy-bagel-s-hummusom-a-mrkvou", nazov:"Bagel s hummusom a mrkvou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"7 min", hlavna:"Hummus",
  popis:"Celozrnný bagel s hummusom, strúhanou mrkvou a slnečnicovými semienkami.",
  ing:[i("Celozrnný bagel",2,"ks"),i("Hummus",100,"g"),i("Mrkva",120,"g"),i("Rukola",20,"g"),i("Slnečnicové semienka",16,"g")],
  postup:["Prekroj bagely a opeč ich v hriankovači.","Natri ich hummusom a posyp nastrúhanou mrkvou.","Doplň rukolu, posyp semienkami a osoľ."],
  tipy:"Semienka pred posypaním krátko opraž — chuť je výraznejšia.",
  tagy:[...T,"sendvič","bagel","vláknina"] },

{ id:"ranajkovy-rozok-s-hummusom-a-zeleninou", nazov:"Grahamový rožok s hummusom a zeleninou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"7 min", hlavna:"Hummus",
  popis:"Grahamový rožok s hummusom, uhorkou a reďkovkou.",
  ing:[i("Grahamový rožok",2,"ks"),i("Hummus",100,"g"),i("Uhorka",100,"g"),i("Reďkovka",60,"g"),i("Slnečnicové semienka",16,"g")],
  postup:["Prekroj rožky a natri ich hummusom.","Poukladaj kolieska uhorky a reďkoviek.","Posyp semienkami, osoľ a rožky prikry."],
  tipy:"Hummus rozotri až k okrajom — pečivo tak nevysychá.",
  tagy:[...T,"obložené pečivo","rožok","vláknina"] },

{ id:"ranajkovy-sendvic-z-razneho-chleba-s-hummusom", nazov:"Sendvič z ražného chleba s hummusom a reďkovkou", kat:"Raňajky", kuchyna:"Slovenská", cas:"6 min", hlavna:"Hummus",
  popis:"Ražný chlieb s hummusom, reďkovkou a klíčkami.",
  ing:[i("Ražný chlieb",4,"plátok"),i("Hummus",120,"g"),i("Reďkovka",80,"g"),i("Klíčky",40,"g"),i("Tekvicové semienka",16,"g")],
  postup:["Natri plátky ražného chleba hummusom.","Poukladaj kolieska reďkoviek a klíčky.","Posyp tekvicovými semienkami a zľahka osoľ."],
  tipy:"Ražný chlieb má 8 g vlákniny na 100 g — dvojnásobok bieleho.",
  tagy:[...T,"sendvič","ražný chlieb","vláknina"] },

{ id:"ranajkovy-toast-s-avokadom-a-fazulou", nazov:"Celozrnný toast s avokádom a fazuľou", kat:"Raňajky", kuchyna:"Mexická", cas:"8 min", hlavna:"Fazuľa",
  popis:"Celozrnný toast s roztlačenou fazuľou, avokádom a paradajkou.",
  ing:[i("Celozrnný toastový chlieb",4,"plátok"),i("Fazuľa červená",160,"g"),i("Avokádo",60,"g"),i("Paradajky",80,"g"),i("Limetková šťava",15,"g")],
  postup:["Opeč plátky chleba v hriankovači dozlatista.","Roztlač fazuľu s avokádom a limetkovou šťavou a osoľ.","Natri zmes na toasty a poukladaj kolieska paradajok."],
  tipy:"Limetka drží avokádo zelené aj po hodine v obedári.",
  tagy:[...T,"sendvič","toast","vláknina","strukoviny"] },

{ id:"ranajkova-pita-s-fazulovou-natierkou", nazov:"Pita s fazuľovou nátierkou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"10 min", hlavna:"Fazuľa",
  popis:"Celozrnná pita naplnená fazuľovou nátierkou a čerstvou zeleninou.",
  ing:[i("Celozrnná pita",2,"ks"),i("Fazuľa biela",200,"g"),i("Grécky jogurt",60,"g"),i("Paprika červená",100,"g"),i("Cesnak",6,"g")],
  postup:["Sceď fazuľu, prepláchni ju a rozmixuj s jogurtom a cesnakom dohladka.","Nahrej pity a rozrež ich na vrecko.","Naplň ich nátierkou a prúžkami papriky a osoľ."],
  tipy:"Nátierka vydrží v chladničke tri dni — sprav si ju na celý blok.",
  tagy:[...T,"sendvič","pita","vláknina","strukoviny"] },

{ id:"ranajkova-zemla-s-hummusom-a-cviklou", nazov:"Celozrnná žemľa s hummusom a cviklou", kat:"Raňajky", kuchyna:"Blízkovýchodná", cas:"7 min", hlavna:"Hummus",
  popis:"Celozrnná žemľa s hummusom, nastrúhanou cviklou a rukolou.",
  ing:[i("Celozrnná žemľa",2,"ks"),i("Hummus",100,"g"),i("Cvikla",120,"g"),i("Rukola",30,"g"),i("Tekvicové semienka",16,"g")],
  postup:["Prekroj žemle a natri ich hummusom.","Nastrúhaj varenú cviklu nahrubo a rozdeľ ju na žemle.","Doplň rukolu, posyp semienkami a žemle prikry."],
  tipy:"Cviklu si uvar dopredu — v chladničke vydrží päť dní.",
  tagy:[...T,"obložené pečivo","žemľa","vláknina"] },

{ id:"ranajkova-bageta-s-avokadom-a-cicerom", nazov:"Raňajková bageta s avokádom a cícerom", kat:"Raňajky", kuchyna:"Stredomorská", cas:"8 min", hlavna:"Avokádo",
  popis:"Celozrnná bageta s roztlačeným avokádom, cícerom a cherry paradajkami.",
  ing:[i("Celozrnná bageta",140,"g"),i("Avokádo",80,"g"),i("Cícer",120,"g"),i("Cherry paradajky",100,"g"),i("Citrónová šťava",15,"g")],
  postup:["Roztlač avokádo s citrónovou šťavou a osoľ.","Prekroj bagetu a natri ju avokádom.","Poukladaj scedený cícer a polené paradajky."],
  tipy:"Cícer zľahka roztlač — nebude sa z bagety kotúľať.",
  tagy:[...T,"sendvič","bageta","vláknina","strukoviny"] }
];
