#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""C1 + C7: mleté koreniny dostanú vlastný kľúč (aby sa nezlučovali s čerstvou zeleninou
v nákupnom zozname) a oddelenie „Ryby a morské plody" splynie s „Mäso a ryby".
Beh: py scripts/doplnit_koreniny.py
"""
import json, os, sys, collections

sys.stdout.reconfigure(encoding="utf-8")
ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(ZAKLAD, "data", "potraviny.json")


def K(kluc, kcal, b, t, s, cena, vlaknina, sodik, hustota=0.5):
    """korenina: hustota 0,5 g/ml — lyžička mletého korenia váži ~2,5 g, nie 5 g"""
    return {"kluc": kluc, "oddelenie": "Korenie a bylinky", "alergeny": [], "kcal": kcal,
            "bielkoviny": b, "tuky": t, "sacharidy": s, "g_za_ks": None, "hustota": hustota,
            "meso": False, "cena100": cena, "vlaknina": vlaknina, "sodik": sodik}


NOVE = [
    K("mletá paprika", 282, 14, 13, 54, 1.2, 35, 68),
    K("údená paprika", 282, 14, 13, 54, 2.0, 35, 68),
    K("sladká paprika", 282, 14, 13, 54, 1.2, 35, 68),
    K("pálivá paprika", 282, 14, 13, 54, 1.5, 35, 68),
    K("mleté čili", 282, 13, 14, 50, 1.8, 35, 1640),
    K("čili vločky", 318, 12, 17, 57, 2.5, 27, 30),
    K("chilli prášok", 282, 13, 14, 50, 1.8, 35, 1640),
    K("mleté rasca", 375, 18, 22, 44, 2.5, 11, 168),
    K("mletý zázvor", 335, 9, 4, 72, 3.0, 14, 27),
    K("mletá škorica", 247, 4, 1.2, 81, 3.0, 53, 10),
]


def main():
    with open(CESTA, encoding="utf-8") as f:
        potraviny = json.load(f)
    existuje = {p["kluc"] for p in potraviny}
    pridane = [n for n in NOVE if n["kluc"] not in existuje]
    potraviny.extend(pridane)
    zluc = 0
    for p in potraviny:
        if p.get("oddelenie") == "Ryby a morské plody":
            p["oddelenie"] = "Mäso a ryby"
            zluc += 1
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(potraviny, f, ensure_ascii=False, indent=2)
        f.write("\n")
    dup = [k for k, n in collections.Counter(p["kluc"] for p in potraviny).items() if n > 1]
    if dup:
        raise SystemExit("duplicitné kľúče: " + ", ".join(dup))
    print("pridané koreniny: %d (%s)" % (len(pridane), ", ".join(p["kluc"] for p in pridane)))
    print("presunuté do „Mäso a ryby“: %d" % zluc)
    print("oddelenia: %s" % sorted({p["oddelenie"] for p in potraviny}))


if __name__ == "__main__":
    main()
