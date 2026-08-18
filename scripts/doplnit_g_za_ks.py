#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B2: doplní g_za_ks potravinám, ktoré sa v receptoch vyskytujú s jednotkou ks/kus/rožok/žemľa.
Zoznam vyrobil scripts/najdi_ks.py; hodnoty sú bežné kuchynské hmotnosti jedného kusa.
Idempotentné — prepíše len tam, kde je g_za_ks prázdne. Beh: py scripts/doplnit_g_za_ks.py
"""
import json, os, sys, collections

sys.stdout.reconfigure(encoding="utf-8")
ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(ZAKLAD, "data", "potraviny.json")

# kľúč potraviny → hmotnosť JEDNÉHO kusa v gramoch
G_ZA_KS = {
    # korenie a bylinky — malé, ale reálne hmotnosti (predtým 60 g za klinček!)
    "bobkový list": 0.1, "klinčeky": 0.1, "kardamóm": 0.3, "boriev": 0.1,
    "korenie": 0.05,          # zrnko čierneho/nového korenia
    "badián": 0.3,            # celá hviezdička
    "škorica": 2.6,           # celá tyčinka
    "citrónová kôra": 6,      # kôra z jedného citróna
    # zelenina a ovocie
    "čili": 8, "feferón": 15, "čakank": 80, "šampiňóny": 20, "reďkovky": 10,
    "batát": 200, "červená repa": 150, "repa predvarená": 150, "jahody": 12,
    "hrozno": 5, "čerešn": 8, "sušené slivky": 8,
    "kapusta": 40,            # jeden list (celá hlávka ide cez jednotku „hlávka")
    # mäso a ryby
    "kura": 180,              # porcia (prsia/stehno); celé kura má vlastný kľúč
    "kuracie steh": 130, "bravčov": 150, "klobás": 80, "slanin": 25,
    "losos": 150, "šťuky": 150, "zubáča": 150, "ančovič": 4,
    # pečivo a trvanlivé
    "chlieb": 40, "celozrnný chlieb": 40,
    "droždie": 7,             # sáčok sušeného droždia
    "kypriaci prášok": 12,    # sáčok
    "vývar": 10,              # kocka bujónu
    "espresso": 30,           # jedno espresso (30 ml)
    "chilli omáčka": 15,      # jedna dávka ≈ 1 PL
}
# potraviny, ktoré v databáze chýbali a recepty ich používajú v kusoch
NOVE = [
    {"kluc": "celé kura", "oddelenie": "Mäso a ryby", "alergeny": [], "kcal": 239, "bielkoviny": 18,
     "tuky": 17, "sacharidy": 0, "g_za_ks": 1300, "hustota": 1, "meso": True, "cena100": 0.45,
     "vlaknina": 0, "sodik": 70},
    {"kluc": "kuracie prsia", "oddelenie": "Mäso a ryby", "alergeny": [], "kcal": 165, "bielkoviny": 31,
     "tuky": 3.6, "sacharidy": 0, "g_za_ks": 180, "hustota": 1, "meso": True, "cena100": 0.9,
     "balenie_g": 500, "balenie_popis": "500 g", "vlaknina": 0, "sodik": 70},
    {"kluc": "reďkev", "oddelenie": "Zelenina a ovocie", "alergeny": [], "kcal": 16, "bielkoviny": 1,
     "tuky": 0, "sacharidy": 3, "g_za_ks": 120, "hustota": 1, "meso": False, "cena100": 0.5,
     "vlaknina": 1.6, "sodik": 39},
    {"kluc": "sušienky", "oddelenie": "Pečenie a sladké", "alergeny": ["lepok"], "kcal": 450,
     "bielkoviny": 6, "tuky": 18, "sacharidy": 66, "g_za_ks": 12, "hustota": 1, "meso": False,
     "cena100": 0.8, "balenie_g": 200, "balenie_popis": "200 g", "vlaknina": 2, "sodik": 400},
    {"kluc": "klinček", "oddelenie": "Korenie a bylinky", "alergeny": [], "kcal": 274, "bielkoviny": 6,
     "tuky": 13, "sacharidy": 66, "g_za_ks": 0.1, "hustota": 1, "meso": False, "cena100": 5,
     "vlaknina": 34, "sodik": 277},
    {"kluc": "žemľa", "oddelenie": "Pečivo", "alergeny": ["lepok"], "kcal": 270, "bielkoviny": 9,
     "tuky": 3, "sacharidy": 50, "g_za_ks": 60, "hustota": 1, "meso": False, "cena100": 0.35,
     "vlaknina": 3, "sodik": 490},
]


def main():
    with open(CESTA, encoding="utf-8") as f:
        potraviny = json.load(f)
    podla = {p["kluc"]: p for p in potraviny}
    zmen, chyba = 0, []
    for kluc, hodnota in G_ZA_KS.items():
        p = podla.get(kluc)
        if not p:
            chyba.append(kluc)
            continue
        if not p.get("g_za_ks"):
            p["g_za_ks"] = hodnota
            zmen += 1
    pridane = 0
    for novy in NOVE:
        if novy["kluc"] not in podla:
            potraviny.append(novy)
            pridane += 1
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(potraviny, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("g_za_ks doplnené: %d, nové potraviny: %d, potravín spolu: %d" % (zmen, pridane, len(potraviny)))
    if chyba:
        print("POZOR, kľúč v databáze neexistuje:", ", ".join(chyba))
    dup = [k for k, n in collections.Counter(p["kluc"] for p in potraviny).items() if n > 1]
    if dup:
        raise SystemExit("duplicitné kľúče: " + ", ".join(dup))


if __name__ == "__main__":
    main()
