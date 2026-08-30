#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doplnenie tagov receptom, ktoré ich mali menej než 3.

Tagy idú do fulltextu (app.js `renderGrid` hľadá v názve, popise, tagoch aj
surovinách), takže chýbajúci tag = recept sa horšie nájde. Nové tagy berieme
zo slovníka, ktorý sa v databáze už používa — nechceme rozbiť existujúcu slovnú
zásobu novými synonymami.

Spusti: python3 scripts/doplnit_tagy.py [--dry]
"""
import json, glob, re, sys, os

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

# tag → regex nad surovinami (poradie = priorita)
ZO_SUROVIN = [
 ("gin", r"\bgin\b"), ("rum", r"\brum\b|rumu"), ("vodka", r"vodk"),
 ("whisky", r"whisk|bourbon|scotch"), ("tequila", r"tequil"), ("brandy", r"brandy|cognac|koňak"),
 ("vermút", r"vermút|vermut"), ("likér", r"likér|liker|cointreau|amaretto|limoncello|curaç|kahlúa|baileys"),
 ("šampanské", r"šampan|prosecco|sekt"), ("víno", r"\bvíno|vína|rose\b"),
 ("káva", r"\bkáva|espresso|kávov"), ("čaj", r"\bčaj\b|čaju"),
 ("kuracie", r"kurac|kur[čc]a|prsia kuracie"), ("morčacie", r"morčac"),
 ("bravčové", r"bravčov|bôčik|krkovič|slanin|údené mäso"), ("hovädzie", r"hovädz"),
 ("ryba", r"losos|treska|pstruh|tuniak|makrela|sardin|filé z ryb|rybie"),
 ("krevety", r"kreve|garnát|krab"), ("vajcia", r"\bvajc|vajíčk|žĺtk|bielk"),
 ("syr", r"\bsyr|mozzarell|parmez|feta|bryndz|gouda|eidam|niva|cottage"),
 ("tvaroh", r"tvaroh"), ("strukoviny", r"fazuľ|cícer|šošovic|hrach\b"),
 ("zemiaky", r"zemiak"), ("ryža", r"\bryž"), ("cestoviny", r"cestovin|špaget|penne|tagliatell|makarón"),
 ("huby", r"šampiňón|hríb|hliva|huby"), ("čokoláda", r"čokolád|kakao"),
 ("orechy", r"orech|mandľ|kešu|pistác|lieskov"), ("ovocie", r"jahod|malin|čučoried|banán|jablk|hrušk|broskyň|marhuľ|slivk|mango|ananás"),
 ("zelenina", r"mrkva|brokolic|karfiol|cuket|paprik|paradajk|špenát|kapust|uhork"),
]

def main():
    dry = "--dry" in sys.argv
    n = 0; pridane = 0
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        if len(d["tagy"]) >= 3: continue
        tagy = list(d["tagy"])
        # tag kategórie a kuchyne (ak ešte nie sú)
        kat = d["kategoria"].lower()
        if kat not in tagy and kat != "hlavné jedlo": tagy.append(kat)
        ing = " ".join(i["nazov"] for i in d["ingrediencie"]).lower()
        for tag, rx in ZO_SUROVIN:
            if len(tagy) >= 4: break
            if tag in tagy: continue
            if re.search(rx, ing): tagy.append(tag)
        kuch = d["kuchyna"].lower()
        if len(tagy) < 3 and kuch and kuch not in tagy: tagy.append(kuch)
        if tagy != d["tagy"]:
            pridane += len(tagy) - len(d["tagy"]); n += 1
            d["tagy"] = tagy
            if not dry:
                with open(f, "w", encoding="utf-8") as fh:
                    json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("receptov s doplnenými tagmi:", n, "| nových tagov spolu:", pridane)

if __name__ == "__main__":
    main()
