#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B2: vypíše ingrediencie, ktoré sa v receptoch vyskytujú s počítateľnou jednotkou (ks/kus/rožok/žemľa),
ale napárovaná potravina nemá g_za_ks — app.js im dnes ticho priradí 60 g za kus.

Beh:  py scripts/najdi_ks.py            (zoznam)
      py scripts/najdi_ks.py --csv      (nazov;kluc;pocet_vyskytov;priklad)
"""
import json, glob, os, sys, collections

sys.stdout.reconfigure(encoding="utf-8")  # Windows konzola je cp1250

ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JEDNOTKY = {"ks", "kus", "rožok", "rozok", "žemľa", "zemla"}


def najdi_potravinu(nazov, potraviny):
    """Rovnaké pravidlo ako app.js: najdlhší kľúč, ktorý je podreťazcom názvu."""
    n = nazov.lower()
    best, dl = None, -1
    for p in potraviny:
        k = p["kluc"]
        if k in n and len(k) > dl:
            best, dl = p, len(k)
    return best


def main():
    potraviny = json.load(open(os.path.join(ZAKLAD, "data", "potraviny.json"), encoding="utf-8"))
    chyba = collections.OrderedDict()
    for cesta in sorted(glob.glob(os.path.join(ZAKLAD, "recepty", "*.json"))):
        r = json.load(open(cesta, encoding="utf-8"))
        for i in r.get("ingrediencie", []):
            if i.get("mnozstvo") is None:
                continue
            if (i.get("jednotka") or "").lower().strip() not in JEDNOTKY:
                continue
            p = najdi_potravinu(i["nazov"], potraviny)
            if p and p.get("g_za_ks"):
                continue
            kl = (i["nazov"].lower())
            z = chyba.setdefault(kl, {"nazov": i["nazov"], "kluc": p["kluc"] if p else "(nenapárované)",
                                      "n": 0, "priklad": ""})
            z["n"] += 1
            if not z["priklad"]:
                z["priklad"] = "%s: %s %s %s" % (r.get("id"), i["nazov"], i["mnozstvo"], i.get("jednotka"))

    poradie = sorted(chyba.values(), key=lambda z: -z["n"])
    if "--csv" in sys.argv:
        for z in poradie:
            print("%s;%s;%d;%s" % (z["nazov"], z["kluc"], z["n"], z["priklad"]))
    else:
        for z in poradie:
            print("%4d×  %-38s → kľúč %-28s  %s" % (z["n"], z["nazov"][:38], z["kluc"][:28], z["priklad"]))
    print("\nSPOLU: %d rôznych ingrediencií bez g_za_ks (%d výskytov)"
          % (len(poradie), sum(z["n"] for z in poradie)))
    print("Dotknutých kľúčov potravín: %d" % len({z["kluc"] for z in poradie if z["kluc"] != "(nenapárované)"}))


if __name__ == "__main__":
    main()
