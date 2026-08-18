#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B3: hmotnosť jedného PLÁTKU tam, kde paušálnych 20 g z KS_DEF nesedí.
Predtým sa na plátok použilo g_za_ks (hmotnosť celého kusa), takže „6 plátkov nori" bolo 6 hlávok.
Beh: py scripts/doplnit_g_za_platok.py
"""
import json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(ZAKLAD, "data", "potraviny.json")

G_ZA_PLATOK = {
    "toastový chlieb": 28, "chlieb": 40, "celozrnný chlieb": 40, "ražný chlieb": 45,
    "nori riasa": 3, "želatín": 2,
    "eidam": 20, "gouda": 20, "ementál": 20, "syr": 20, "cheddar": 20, "mozzarella": 20,
    "šunka": 15, "slanin": 25, "saláma": 12, "prosciutto": 12,
    "uhorka": 8,          # nakladaná uhorka na kolieska
    "cibuľa": 10, "citrón": 8, "limetk": 6, "zázvor": 2, "galangal": 2, "avokádo": 25,
    "paradajk": 15, "ananás": 60, "tofu": 30,
}


def main():
    with open(CESTA, encoding="utf-8") as f:
        potraviny = json.load(f)
    podla = {p["kluc"]: p for p in potraviny}
    zmen, chyba = 0, []
    for kluc, hodnota in G_ZA_PLATOK.items():
        p = podla.get(kluc)
        if not p:
            chyba.append(kluc)
            continue
        if not p.get("g_za_platok"):
            p["g_za_platok"] = hodnota
            zmen += 1
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(potraviny, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("g_za_platok doplnené: %d" % zmen)
    if chyba:
        print("kľúč v databáze neexistuje (preskočené):", ", ".join(chyba))


if __name__ == "__main__":
    main()
