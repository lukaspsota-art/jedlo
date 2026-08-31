# -*- coding: utf-8 -*-
"""P5: doplnenie katalógu snackov o hotové balené výrobky z Kauflandu.
Každý výrobok: kategória Snack, typ „vyrobok", 1 ingrediencia „1 ks", 1 krok postupu,
výživa REÁLNA a NA BALENIE (nie na 100 g), cena podľa slovenského Kauflandu 2026.
Beh: python3 scripts/doplnit_snacky_p5.py
"""
import json, io, os

REC = "recepty"; POT = "data/potraviny.json"

# id, názov výrobku (bez zátvorky), popis balenia, g/ml balenia, kľúč potraviny,
# oddelenie, alergény, kcal/100, B/100, T/100, S/100, vláknina/100, sodík/100 (mg),
# cena €/100 g, hustota, tagy navyše, postup, tip
V = [
 # ── čerstvé ovocie, ako sa kúpi ─────────────────────────────────────────────
 ("kup-marhule","Marhule","balenie 250 g",250,"marhule balenie","Zelenina a ovocie",[],
  48,1.4,0.4,9.1,2.0,1,0.60,1,["ovocie"],"Opláchni a zjedz. Nič sa nevarí ani neváži.",
  "Kôstku vypľuj — inak sa nič robiť nemusí."),
 ("kup-ceresne","Čerešne","balenie 200 g",200,"čerešne balenie","Zelenina a ovocie",[],
  63,1.1,0.3,13.0,1.6,1,1.20,1,["ovocie"],"Opláchni a zjedz. Nič sa nevarí ani neváži.",
  "V sezóne (jún–júl) sú najlacnejšie a najsladšie."),
 ("kup-mango-kus","Mango","1 ks (170 g jedlá časť)",170,"mango kus balenie","Zelenina a ovocie",[],
  60,0.8,0.4,13.0,1.6,2,0.65,1,["ovocie"],"Olúp, odkroj od kôstky a zjedz. Nič sa nevarí ani neváži.",
  "Zrelé mango povolí pod palcom pri stopke."),
 ("kup-klementinky","Klementínky","2 ks (150 g)",150,"klementínky balenie","Zelenina a ovocie",[],
  47,0.9,0.2,10.0,1.7,1,0.30,1,["ovocie"],"Olúp a zjedz. Nič sa nevarí ani neváži.",
  "Šupka ide dole rukou — ideálna desiata do tašky."),
 ("kup-grep","Grep ružový","1 ks (250 g)",250,"grep ružový balenie","Zelenina a ovocie",[],
  42,0.8,0.1,9.0,1.6,1,0.30,1,["ovocie"],"Prekroj a vyjedz lyžičkou. Nič sa nevarí ani neváži.",
  "Ružový je sladší než žltý."),
 # ── zelenina na chrumkanie v menšom balení ──────────────────────────────────
 ("kup-cherry-mini","Cherry paradajky mini","vanička 250 g",250,"cherry paradajky mini balenie","Zelenina a ovocie",[],
  18,0.9,0.2,3.0,1.2,5,0.60,1,["zelenina"],"Opláchni a chrumkaj. Nič sa nevarí ani neváži.",
  "Menšia vanička sa zje naraz a nezvädne v chladničke."),
 ("kup-baby-mrkva","Baby mrkva","vrecko 100 g",100,"baby mrkva balenie","Zelenina a ovocie",[],
  41,0.9,0.2,7.0,2.8,60,0.60,1,["zelenina"],"Otvor vrecko a chrumkaj. Nič sa nevarí ani neváži.",
  "Očistená a umytá — nič sa nešúpe."),
 # ── syry v malom balení (aj ako doplnok k ovociu a zelenine) ────────────────
 ("kup-syrove-nite-male","Syrové nite mini","balenie 40 g",40,"syrové nite mini balenie","Mliečne a vajcia",["mlieko"],
  305,26.0,22.0,1.0,0,900,1.70,1,["bielkoviny","syr"],"Otvor balenie a trhaj po niti. Nič sa nevarí ani neváži.",
  "Údené nite vydržia v taške celý deň."),
 ("kup-eidam-platky-male","Eidamské plátky mini","balenie 40 g",40,"eidamské plátky mini balenie","Mliečne a vajcia",["mlieko"],
  252,32.0,14.0,0.1,0,700,1.25,1,["bielkoviny","syr"],"Otvor balenie a zjedz. Nič sa nevarí ani neváži.",
  "32 g bielkovín na 100 g pri 30 % tuku v sušine."),
 ("kup-babybel","Mini syr vo vosku","2 ks (40 g)",40,"mini syr vo vosku balenie","Mliečne a vajcia",["mlieko"],
  295,22.0,23.0,0.0,0,600,2.20,1,["bielkoviny","syr"],"Odlúp vosk a zjedz. Nič sa nevarí ani neváži.",
  "Vo vosku vydrží mimo chladničky pár hodín."),
 ("kup-mozzarella-snack","Mozzarella snack","balenie 60 g (odkvapkaná)",60,"mozzarella snack balenie","Mliečne a vajcia",["mlieko"],
  230,18.0,17.0,1.0,0,300,1.20,1,["bielkoviny","syr"],"Odkvapkaj a zjedz. Nič sa nevarí ani neváži.",
  "Guľôčky sú akurát na jednu desiatu."),
 ("kup-gouda-platky-mini","Gouda plátky mini","balenie 50 g",50,"gouda plátky mini balenie","Mliečne a vajcia",["mlieko"],
  356,25.0,28.0,0.0,0,800,1.20,1,["bielkoviny","syr"],"Otvor balenie a zjedz. Nič sa nevarí ani neváži.",
  "Polovičné balenie sa zje naraz a nevysychá."),
 ("kup-cottage-maly","Cottage cheese malý","vanička 100 g",100,"cottage cheese malý balenie","Mliečne a vajcia",["mlieko"],
  98,12.5,4.3,3.0,0,300,0.70,1,["bielkoviny","mliečne"],"Odlep viečko a zjedz lyžičkou. Nič sa nevarí ani neváži.",
  "Malá vanička je akurát ako doplnok k ovociu."),
 ("kup-varene-vajce","Varené vajce balené","1 ks (55 g)",55,"varené vajce balené balenie","Mliečne a vajcia",["vajcia"],
  143,12.6,9.5,0.7,0,140,0.90,1,["bielkoviny"],"Olúp a zjedz. Nič sa nevarí ani neváži.",
  "Predvarené a olúpateľné — nič sa nevarí."),
 # ── mäso a ryba v malom balení ──────────────────────────────────────────────
 ("kup-kabanos-mini","Kabanos mini","1 ks (25 g)",25,"kabanos mini balenie","Mäso a ryby",[],
  420,25.0,35.0,1.0,0,1500,1.50,1,["bielkoviny","mäso"],"Odbaľ a zjedz. Nič sa nevarí ani neváži.",
  "Jedna klobáska stačí — je slaná."),
 ("kup-tuniak-mini","Tuniak v konzerve mini","konzerva 80 g (odkvapkaný 60 g)",60,"tuniak v konzerve mini balenie","Trvanlivé a konzervy",["ryby"],
  100,24.0,0.8,0.0,0,300,1.30,1,["bielkoviny","ryba"],"Otvor konzervu, zlej šťavu a zjedz. Nič sa nevarí ani neváži.",
  "Malá konzerva sa zje naraz, nič nezostane v chladničke."),
 # ── orechy a semienka v porciovom vrecku ───────────────────────────────────
 ("kup-mandle-porcia","Mandle porciové","vrecko 25 g",25,"mandle porciové balenie","Orechy a semená",["orechy"],
  600,21.0,51.0,5.0,12.0,2,2.20,1,["orechy","vláknina"],"Otvor vrecko a zjedz. Nič sa nevarí ani neváži.",
  "25 g je presne tá hrsť, ktorú si inak navážiš."),
 ("kup-vlasske-porcia","Vlašské orechy porciové","vrecko 25 g",25,"vlašské orechy porciové balenie","Orechy a semená",["orechy"],
  654,15.0,65.0,7.0,6.7,2,1.90,1,["orechy"],"Otvor vrecko a zjedz. Nič sa nevarí ani neváži.",
  "Najlepší rastlinný zdroj omega-3 v regáli."),
 ("kup-kesu-porcia","Kešu porciové","vrecko 25 g",25,"kešu porciové balenie","Orechy a semená",["orechy"],
  580,18.0,44.0,27.0,3.0,400,2.40,1,["orechy"],"Otvor vrecko a zjedz. Nič sa nevarí ani neváži.",
  "Sladšie než mandle — dobre sadnú k ovociu."),
 ("kup-arasidy-porcia","Arašidy porciové","vrecko 30 g",30,"arašidy porciové balenie","Orechy a semená",["arašidy"],
  590,25.0,49.0,8.0,8.0,400,0.90,1,["bielkoviny","orechy"],"Otvor vrecko a zjedz. Nič sa nevarí ani neváži.",
  "Najlacnejšie bielkoviny z celého orechového regálu."),
 # ── sušené ovocie ───────────────────────────────────────────────────────────
 ("kup-susene-slivky","Sušené slivky bez kôstky","vrecko 50 g",50,"sušené slivky balenie","Trvanlivé a konzervy",[],
  240,2.2,0.4,55.0,7.0,3,1.30,1,["sušené","vláknina"],"Otvor vrecko a zjedz. Nič sa nevarí ani neváži.",
  "Tri slivky denne robia s trávením viac než akýkoľvek doplnok."),
 # ── mliečne dezerty a nápoje ───────────────────────────────────────────────
 ("kup-tvarohovy-dezert-cokolada","Tvarohový dezert čokoládový","kelímok 90 g",90,"tvarohový dezert čokoládový balenie","Mliečne a vajcia",["mlieko"],
  160,5.2,7.0,18.0,0.5,60,0.60,1,["dezert","tvaroh"],"Odlep viečko a zjedz lyžičkou. Nič sa nevarí ani neváži.",
  "Malý kelímok — sladké bez toho, aby to bol zákusok."),
 ("kup-skyr-pistacia","Skyr pistáciový","kelímok 140 g",140,"skyr pistáciový balenie","Mliečne a vajcia",["mlieko","orechy"],
  74,9.6,0.5,8.0,0.4,45,0.75,1,["bielkoviny","skyr"],"Odlep viečko a zjedz lyžičkou. Nič sa nevarí ani neváži.",
  "Rovnaké bielkoviny ako biely skyr, iná chuť."),
 ("kup-proteinovy-puding-oriesok","Proteínový puding orieškový","kelímok 200 g",200,"proteínový puding orieškový balenie","Mliečne a vajcia",["mlieko","orechy"],
  76,10.0,1.9,4.5,0.8,80,0.63,1,["bielkoviny","mliečne"],"Odlep viečko a zjedz lyžičkou. Nič sa nevarí ani neváži.",
  "20 g bielkovín v jednom kelímku."),
 ("kup-grecky-jogurt-marhula","Grécky jogurt s marhuľou","kelímok 150 g",150,"grécky jogurt s marhuľou balenie","Mliečne a vajcia",["mlieko"],
  88,7.5,2.5,9.0,0.3,50,0.60,1,["bielkoviny","jogurt"],"Odlep viečko a zjedz lyžičkou. Nič sa nevarí ani neváži.",
  "Hustejší než bežný ovocný jogurt a s dvojnásobkom bielkovín."),
 ("kup-acidko-jahoda","Acidofilné mlieko jahodové","fľaša 250 ml",250,"acidofilné mlieko jahodové balenie","Mliečne a vajcia",["mlieko"],
  66,3.2,1.5,10.0,0,45,0.24,1.03,["mliečne","nápoj"],"Otvor fľašu a vypi. Nič sa nevarí ani neváži.",
  "Acidko je kefírový bratranec — ľahšie sa pije."),
 # ── chrumkavé a sladké ─────────────────────────────────────────────────────
 ("kup-hummus-mini","Hummus mini téglik","téglik 60 g",60,"hummus mini téglik balenie","Chladené",["sezam"],
  290,7.5,22.0,12.0,6.0,450,1.10,1,["nátierka","strukoviny"],"Odlep viečko a namáčaj alebo jedz lyžičkou. Nič sa nevarí ani neváži.",
  "Porciový téglik — akurát k mrkve alebo paprike."),
 ("kup-ryzove-chlebicky-poleva","Ryžové chlebíčky s jogurtovou polevou","2 ks (32 g)",32,"ryžové chlebíčky s jogurtovou polevou balenie","Pečenie a sladké",["mlieko"],
  450,5.5,17.0,68.0,1.5,150,1.50,1,["bezlepkové","čokoláda"],"Otvor balenie a zjedz. Nič sa nevarí ani neváži.",
  "Sladké, ale ľahšie než sušienka."),
 ("kup-krekry-celozrnne","Celozrnné krekry","balenie 30 g",30,"celozrnné krekry balenie","Pečivo",["lepok"],
  435,10.0,14.0,65.0,5.0,600,1.50,1,["chrumkavé","vláknina"],"Otvor balenie a chrumkaj. Nič sa nevarí ani neváži.",
  "Malé balenie sa zje naraz — nezostane otvorený sáčok."),
 ("kup-horka-cokolada-85","Horká čokoláda 85 %","4 kocky (20 g)",20,"horká čokoláda 85 balenie","Pečenie a sladké",["sója"],
  590,12.0,47.0,22.0,11.0,10,1.45,1,["čokoláda","vláknina"],"Odlom štyri kocky a zjedz. Nič sa nevarí ani neváži.",
  "Čím vyššie percento kakaa, tým menej cukru."),
 ("kup-ovocne-pyre","Ovocné pyré jablko-banán","kapsička 90 g",90,"ovocné pyré kapsička balenie","Trvanlivé a konzervy",[],
  70,0.5,0.2,16.0,1.5,3,0.50,1,["dezert"],"Odskrutkuj vrchnák a vycicaj. Nič sa nevarí ani neváži.",
  "Kapsička bez pridaného cukru — do tašky aj do auta."),
 ("kup-ryzove-chipsy","Ryžové chipsy paprikové","balenie 30 g",30,"ryžové chipsy balenie","Trvanlivé a konzervy",[],
  425,6.5,12.0,72.0,2.0,700,2.00,1,["chrumkavé","slané"],"Otvor balenie a chrumkaj. Nič sa nevarí ani neváži.",
  "Menej tuku než zemiakové lupienky, rovnaké chrumkanie."),
 # ── pečivo, ale S NIEČÍM (nie holý rožok) ──────────────────────────────────
 ("kup-bageta-mini-sunka-syr","Mini bageta so šunkou a syrom","balenie 80 g",80,"mini bageta so šunkou a syrom balenie","Chladené",["lepok","mlieko"],
  250,11.0,10.0,29.0,1.8,700,1.60,1,["pečivo","sendvič"],"Rozbaľ a zjedz. Nič sa nevarí ani neváži.",
  "Pečivo ako desiata má zmysel len s bielkovinou — táto ju už v balení má."),
 ("kup-rozok-sunka-syr","Obložený rožok so šunkou a syrom","balenie 110 g",110,"obložený rožok so šunkou a syrom balenie","Chladené",["lepok","mlieko"],
  245,11.0,10.0,28.0,1.7,680,1.35,1,["pečivo","sendvič"],"Rozbaľ a zjedz. Nič sa nevarí ani neváži.",
  "Náhrada za holý rožok: rovnaké pečivo, ale s bielkovinou."),
]

def cislo(x):
    s = ("%.1f" % x).replace(".", ",")
    return s[:-2] if s.endswith(",0") else s

pot = json.load(io.open(POT, encoding="utf-8"))
existujuce = {e["kluc"] for e in pot}
novych_r = novych_p = 0
for (rid, nazov, popis, g, kluc, odd, alerg, k100, b100, t100, s100, vl100, na100, c100, hust, tagy, postup, tip) in V:
    kcal = round(k100 * g / 100.0)
    b = round(b100 * g / 100.0, 1)
    ing = "%s, balenie %s" % (nazov, popis)
    rec = {
        "id": rid, "nazov": "%s (%s)" % (nazov, popis), "kategoria": "Snack", "typ": "vyrobok",
        "kuchyna": "", "zdroj": "Kaufland", "zdroj_url": "https://www.kaufland.sk/",
        "porcie": 1, "cas": "1 min", "kcal_na_porciu": kcal, "kcal_zdroj": "balenie",
        "popis": "Hotový výrobok z Kauflandu — %s. Jedno balenie = jedna porcia (%d kcal, %s g bielkovín). Nič sa nepripravuje ani neváži." % (popis, kcal, cislo(b)),
        "ingrediencie": [{"nazov": ing, "mnozstvo": 1, "jednotka": "ks", "poznamka": popis}],
        "postup": [postup], "tipy": tip, "foto": "",
        "tagy": sorted(set(["bez prípravy", "kupované", "kúpené", "snack"] + tagy)),
    }
    cesta = os.path.join(REC, rid + ".json")
    io.open(cesta, "w", encoding="utf-8").write(json.dumps(rec, ensure_ascii=False, indent=1) + "\n")
    novych_r += 1
    if kluc not in existujuce:
        pot.append({"kluc": kluc, "oddelenie": odd, "alergeny": alerg, "kcal": k100,
                    "bielkoviny": b100, "tuky": t100, "sacharidy": s100, "g_za_ks": g,
                    "hustota": hust, "meso": odd == "Mäso a ryby", "cena100": c100,
                    "balenie_g": g, "balenie_popis": popis, "vlaknina": vl100, "sodik": na100})
        existujuce.add(kluc); novych_p += 1
io.open(POT, "w", encoding="utf-8").write(json.dumps(pot, ensure_ascii=False, indent=1) + "\n")
print("receptov:", novych_r, "· potravín:", novych_p, "· potravín spolu:", len(pot))
