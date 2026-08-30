#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Anglické zvyšky z importu (TheCocktailDB, BBC Good Food) → slovenčina.

• 71 kokteilov/nápojov malo v `popis` iba surové metadáta „Ordinary Drink · Collins Glass".
  Nahrádzame ich vetou o tom, z čoho nápoj je a v čom sa podáva.
• 12 receptov z BBC Good Food malo anglický popis — preložené ručne (slovník nižšie).
• Zvyšné anglické kroky postupu preložené ručne.

Spusti: python3 scripts/oprav_anglictinu.py [--dry]
"""
import json, glob, re, sys, os

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

TYP = {"ordinary drink": "Miešaný nápoj", "cocktail": "Kokteil", "other / unknown": "Nápoj",
       "punch / party drink": "Punč do väčšej spoločnosti", "shake": "Šejk",
       "cocoa": "Horúca čokoláda", "coffee / tea": "Teplý nápoj", "soft drink": "Nealkoholický nápoj",
       "beer": "Pivný nápoj", "homemade liqueur": "Domáci likér"}
POHAR = {"cocktail glass": "kokteilovom pohári", "old-fashioned glass": "nízkom pohári (tumbler)",
         "highball glass": "vysokom pohári", "collins glass": "vysokom pohári collins",
         "coffee mug": "hrnčeku", "wine glass": "pohári na víno", "white wine glass": "pohári na biele víno",
         "champagne flute": "flaute na šampanské", "martini glass": "martini pohári",
         "irish coffee cup": "šálke na írsku kávu", "copper mug": "medenom hrnčeku",
         "punch bowl": "punčovej mise", "hurricane glass": "pohári hurricane",
         "shot glass": "pohári na panáka", "beer mug": "pivnom pohári", "pitcher": "džbáne"}

ZAKLAD = re.compile(r"^(ľad|lad|voda|sóda|soda|cukor|soľ|sol|štipka)", re.I)

# ručné preklady popisov z BBC Good Food
POPIS = {
 "baklazanova-natierka-baba-ganoush":
   "Dymová nátierka z pečeného baklažánu s tahini a citrónom. Výborná s teplým plackovým chlebom alebo pita chlebom.",
 "butter-chicken":
   "Krémové kuracie karí na masle a kešu masle s paradajkovým pretlakom a množstvom korenín. Sýte a výrazné, ale nie pálivé.",
 "cestoviny-puttanesca":
   "Klasická omáčka z jednej panvice — ančovičky, olivy, kapary a paradajky. Lacná, rýchla a hotová v čase, kým sa uvaria špagety.",
 "cestoviny-s-baklazanom-alla-norma":
   "Ľahšia verzia sicílskej alla norma: baklažán sa pečie, nevypráža. Zamiešaný do špagiet s paradajkovou omáčkou a ricottou.",
 "focaccia-s-paradajkami-a-olivami":
   "Domáca verzia klasického talianskeho pečiva. Rozmarínová focaccia sa hodí k cestovinám aj samostatne s olivovým olejom.",
 "harira": "Marocká polievka plná strukovín, paradajok, hovädzieho mäsa a korenín. Zahreje a zasýti ako plnohodnotné jedlo.",
 "kuracie-fajitas":
   "Fajitas, ktoré si každý poskladá sám — zábava pre deti a menej práce pre kuchára. Podávaj s guacamole a kyslou smotanou.",
 "kuracie-na-sposob-vindaloo":
   "Poriadne pálivé domáce kuracie vindaloo s množstvom aromatických korenín. Podávaj s ryžou alebo plackovým chlebom.",
 "mapo-tofu":
   "Aj keď tofu nie je tvoja obľúbená surovina, tomuto daj šancu. Pálivé a výrazné vďaka fazuľovej čili paste a sečuánskemu korenie.",
 "marocke-kuracie-tagine-s-citronom":
   "Jednoduché jedlo z jedného hrnca pre zaneprázdnených. Kuracie tagine sa výborne hodí ku kuskusu.",
 "naan-chlieb":
   "Domáce indické placky, po ktorých už kupované nebudeš chcieť. Najlepšie chutia teplé, hneď z panvice.",
 "tabbouleh":
   "Klasický blízkovýchodný šalát z bulguru s množstvom petržlenovej vňate a mäty. Skvelý k rybe aj ku grilovanému mäsu.",
}

POSTUP = {
 ("afterglow", 1): "Podávaj na ľade.",
 ("banana-strawberry-shake", 0): "Všetko spolu rozmixuj v mixéri dohladka.",
 ("kiwi-papaya-smoothie", 0): "Všetko daj do mixéra a rozmixuj dohladka.",
}

def popis_napoja(d, typ, pohar):
    ing = []
    for i in d["ingrediencie"]:
        n = re.split(r"[,(/]", i["nazov"])[0].strip()
        if not n or ZAKLAD.match(n): continue
        n = n[0].lower() + n[1:]
        if n not in ing: ing.append(n)
        if len(ing) >= 3: break
    t = TYP.get(typ.lower(), "Nápoj")
    veta = t + (". Základ: " + ", ".join(ing) + "." if ing else ".")
    p = POHAR.get(pohar.lower())
    if p: veta += " Podávaj vo " + p + "." if p.startswith("v") else " Podávaj v " + p + "."
    return veta

def main():
    dry = "--dry" in sys.argv
    n_nap = n_bbc = n_post = 0
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        raw = open(f, encoding="utf-8").read()
        d = json.loads(raw)
        m = re.fullmatch(r"(.+?) · (.+)", d["popis"].strip())
        if m and re.search(r"glass|bowl|mug|cup|flute|shot|pitcher", m.group(2), re.I):
            d["popis"] = popis_napoja(d, m.group(1), m.group(2)); n_nap += 1
        if d["id"] in POPIS:
            d["popis"] = POPIS[d["id"]]; n_bbc += 1
        for (rid, i), txt in POSTUP.items():
            if d["id"] == rid and i < len(d["postup"]) and d["postup"][i] != txt:
                d["postup"][i] = txt; n_post += 1
        novy = json.dumps(d, ensure_ascii=False, indent=1) + "\n"
        if novy != raw and not dry: open(f, "w", encoding="utf-8").write(novy)
    print("popisy nápojov:", n_nap, "| popisy BBC:", n_bbc, "| kroky postupu:", n_post)

if __name__ == "__main__":
    main()
