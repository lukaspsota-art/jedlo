#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B5: doplní cena100 (€/100 g) potravinám, ktoré ju nemali — tichá nula podhodnocovala
týždeň o ~20 % a robila z drahých receptov „Lacné do 1,5 €".
Ceny sú orientačné, SK Kaufland/Lidl 2026. Beh: py scripts/doplnit_ceny.py
"""
import json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(ZAKLAD, "data", "potraviny.json")

CENY = {
    "voda": 0.0,              # z vodovodu — cena 0 je ZNÁMA, nie chýbajúca
    "vývar": 0.15, "rybia omáčka": 1.2, "majonéza": 0.5, "chilli omáčka": 1.0, "peri-peri": 1.5,
    "bazalka": 3.0, "rasca": 3.0, "cajun": 4.0, "cayenne": 4.0, "žerucha": 3.0,
    "zeler": 0.25, "brokolica": 0.4, "šalát": 0.6, "uhorka": 0.25, "zázvor": 0.6,
    "kukurica": 0.35, "zeleninová zmes": 0.3, "fazuľa": 0.35,
    "gouda": 1.1, "tuniak": 1.5, "bravčov": 0.8, "saláma": 1.2, "mäso": 0.9,
    "chlieb": 0.25, "kaizerka": 0.4, "rezance": 0.25, "škrob": 0.35,
}


def main():
    with open(CESTA, encoding="utf-8") as f:
        potraviny = json.load(f)
    podla = {p["kluc"]: p for p in potraviny}
    zmen, chyba = 0, []
    for kluc, cena in CENY.items():
        p = podla.get(kluc)
        if not p:
            chyba.append(kluc)
            continue
        if p.get("cena100") is None:
            p["cena100"] = cena
            zmen += 1
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(potraviny, f, ensure_ascii=False, indent=2)
        f.write("\n")
    bez = [p["kluc"] for p in potraviny if p.get("cena100") is None]
    print("ceny doplnené: %d, stále bez ceny: %d %s" % (zmen, len(bez), bez))
    if chyba:
        print("kľúč neexistuje (preskočené):", ", ".join(chyba))


if __name__ == "__main__":
    main()
