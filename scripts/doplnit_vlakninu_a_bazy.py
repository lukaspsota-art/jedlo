#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Agent RAŇAJKY-A-VLÁKNINA (vlna 5) — dve opravy v `data/potraviny.json`.

1) DIERY VO `vlaknina`. Hodnota 2,5 g/100 g je v databáze zjavný výplňový default:
   nesie ju naraz bulgur, pohánka, quinoa, ovsené vločky, jačmenné a žitné vločky,
   celozrnné špagety aj červená šošovica — teda presne tie suroviny, ktoré majú
   vlákniny najviac. V jedálničku to vyzerá ako chýbajúca vláknina, hoci chýba len
   číslo v databáze. Opravené hodnoty sú na SUCHÚ surovinu (kcal v databáze sú tiež
   na suchú) podľa USDA FoodData Central / SK tabuliek zloženia potravín.

2) NOVÉ BÁZY PEČIVA a pár surovín, ktoré sa nemali na čo napárovať
   („Paštrnák" sa pároval na „pastrami", „Celozrnné cestoviny" na obyčajné cestoviny).

Spustenie:  python3 scripts/doplnit_vlakninu_a_bazy.py [--dry]
Skript je idempotentný — druhý beh nič nezmení.
"""
import json, os, sys

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(KOREN, "data", "potraviny.json")
DRY = "--dry" in sys.argv

# kľúč → (nová vláknina, zdôvodnenie)
OPRAVY = {
    "bulgur":             (12.5, "bulgur suchý, USDA 18,3 g; opatrne 12,5"),
    "ovsené vloč":        (10.0, "ovsené vločky, USDA 10,1 g"),
    "vločky jemne mlet":  (10.0, "ovsené vločky jemné"),
    "mleté vločk":        (10.0, "mleté ovsené vločky"),
    "ovsen":              (10.0, "ovsená surovina 370 kcal = suchá"),
    "quinoa":             (7.0,  "quinoa suchá, USDA 7,0 g"),
    "quino":              (7.0,  "quinoa suchá"),
    "čierna quinoa":      (7.0,  "quinoa suchá"),
    "pohanka":            (10.0, "pohánka suchá, USDA 10,0 g"),
    "pohánk":             (10.0, "pohánka suchá"),
    "pohankov":           (10.0, "pohánka suchá"),
    "pohánkov":           (10.0, "pohánka suchá"),
    "celozrnné špaget":   (9.0,  "celozrnné cestoviny suché, 8–9 g"),
    "červená šošovica":   (10.8, "červená šošovica suchá, USDA 10,8 g"),
    "jačmenné vločky":    (10.0, "jačmenné vločky"),
    "žitné vločky":       (15.0, "raž celozrnná, 15 g"),
    "špaldov":            (8.0,  "špaldová celozrnná surovina"),
    "jáhl":               (8.5,  "proso/jáhly suché"),
    "kukuričn":           (7.0,  "kukuričná krupica/múka celozrnná"),
    "polenta":            (6.0,  "kukuričná polenta suchá"),
    "chia":               (34.0, "chia semienka, USDA 34,4 g — bolo 8"),
    "datl":               (8.0,  "sušené datle, USDA 8,0 g"),
    "datle":              (8.0,  "sušené datle"),
    "figy":               (9.8,  "sušené figy, USDA 9,8 g"),
    "sušené slivky":      (7.1,  "sušené slivky, USDA 7,1 g"),
    "rezance":            (3.2,  "biele cestoviny suché"),
    "penne":              (3.2,  "biele cestoviny suché"),
    "tarhoňa":            (3.2,  "biele cestoviny suché"),
    "múka":               (2.7,  "hladká pšeničná múka, USDA 2,7 g"),
    "hranolky":           (3.0,  "zemiakové hranolky"),
    "avokádo":            (6.7,  "avokádo, USDA 6,7 g — bolo 2,0"),
    "malin":              (6.5,  "maliny, USDA 6,5 g — bolo 2,0"),
    "černic":             (5.3,  "černice, USDA 5,3 g"),
    "arašidové maslo":    (6.0,  "arašidové maslo, USDA 6,0 g — bolo 1,0"),
    "hummus":             (6.0,  "hummus, USDA 6,0 g"),
    "goji":               (13.0, "sušené goji"),
    "goji ber":           (13.0, "sušené goji"),
    "goji sušené":        (13.0, "sušené goji"),
    "brusnice sušené":    (5.7,  "sušené brusnice, USDA 5,7 g"),
    "brusnice sušené bez cukru": (5.7, "sušené brusnice"),
    "hrozien":            (3.7,  "hrozienka, USDA 3,7 g"),
    "kiwi":               (3.0,  "kiwi, USDA 3,0 g"),
    "baklažán":           (3.0,  "baklažán, USDA 3,0 g"),
    # druhá dávka (po audite vlákniny naprieč rastlinnými oddeleniami) — hodnota 8,0 g je
    # rovnaký výplňový default ako predtým 2,5 g: nesú ju naraz ľanové, sezamové aj
    # slnečnicové semienka a lieskové orechy, hoci sa reálne líšia trojnásobne.
    "ľanové semien":      (27.3, "ľanové semienka, USDA 27,3 g — bolo 8,0"),
    "ľanov":              (27.3, "ľanové semienka, USDA 27,3 g — bolo 8,0"),
    "ľanové semienko":    (27.3, "ľanové semienka, USDA 27,3 g — bolo 8,0"),
    "sezamové semien":    (11.8, "sezamové semienka celé, USDA 11,8 g — bolo 8,0"),
    "sezamové":           (11.8, "sezamové semienka celé, USDA 11,8 g"),
    "sezam":              (11.8, "sezamové semienka celé, USDA 11,8 g"),
    "šošovic":            (10.7, "šošovica suchá, USDA 10,7 g — bolo 8; kcal 352 = suchá"),
    "hrušky":             (3.1,  "hrušky so supkou, USDA 3,1 g - kluc hruska uz 3,1 mal"),
    "batát":              (3.0,  "batát surový, USDA 3,0 g — bolo 2,0"),
}

# nové potraviny — bázy raňajok a suroviny bez správneho páru
NOVE = [
    # kluc, oddelenie, alergeny, kcal, B, T, S, vl, sodik, cena100, g_za_ks, g_za_platok, balenie_g, balenie_popis
    ("celozrnná bageta",        "Pečivo", ["lepok"], 250, 10.0, 2.5, 43, 7.0,  480, 0.40, 250, 30,  250, "250 g"),
    ("celozrnná tortilla",      "Pečivo", ["lepok"], 300, 9.0,  7.0, 44, 6.5,  590, 0.75, 62,  None, 370, "6 ks"),
    ("grahamový rožok",         "Pečivo", ["lepok"], 265, 9.5,  3.0, 47, 5.5,  470, 0.35, 60,  None, 300, "5 ks"),
    ("celozrnný bagel",         "Pečivo", ["lepok"], 255, 10.5, 1.5, 45, 6.5,  460, 0.75, 90,  None, 360, "4 ks"),
    ("knäckebrot",              "Pečivo", ["lepok"], 330, 10.0, 2.0, 60, 16.0, 400, 0.90, 11,  None, 250, "250 g"),
    ("pita chlieb",             "Pečivo", ["lepok"], 275, 9.0,  1.5, 55, 2.8,  500, 0.55, 60,  None, 300, "5 ks"),
    ("celozrnná pita",          "Pečivo", ["lepok"], 265, 10.0, 2.0, 48, 7.5,  480, 0.65, 60,  None, 300, "5 ks"),
    ("kváskový chlieb",         "Pečivo", ["lepok"], 255, 8.5,  1.5, 50, 4.5,  480, 0.40, 500, 45,  500, "500 g"),
    ("ražný chlieb",            "Pečivo", ["lepok"], 250, 8.0,  1.5, 46, 8.0,  500, 0.35, 500, 40,  500, "500 g"),
    ("celozrnný toastový chlieb","Pečivo",["lepok"], 245, 10.0, 3.5, 38, 7.0,  440, 0.50, 32,  32,  500, "500 g"),
    ("celozrnná žemľa",         "Pečivo", ["lepok"], 255, 10.0, 3.0, 44, 6.0,  470, 0.50, 60,  None, 300, "5 ks"),
    ("celozrnné cestoviny",     "Cestoviny a ryža", ["lepok"], 348, 13.0, 2.5, 62, 8.0, 8, 0.30, None, None, 500, "500 g"),
    ("ryža natural",            "Cestoviny a ryža", [],        360, 7.5,  2.7, 72, 3.5, 5, 0.30, None, None, 500, "500 g"),
    ("ovsené otruby",           "Cestoviny a ryža", ["lepok"], 246, 17.0, 7.0, 50, 15.4, 4, 0.50, None, None, 500, "500 g"),
    ("paštrnák",                "Zelenina a ovocie", [],        75, 1.2,  0.3, 13, 4.9, 10, 0.60, 150, None, None, None),
    ("ružičkový kel",           "Zelenina a ovocie", [],        43, 3.4,  0.3, 9,  3.8, 25, 0.90, 20,  None, 500, "500 g"),
    ("edamame",                 "Mrazené",           ["sója"], 121, 12.0, 5.0, 9,  5.2, 6,  0.90, None, None, 400, "400 g"),
]


def main():
    with open(CESTA, encoding="utf-8") as f:
        data = json.load(f)
    idx = {p["kluc"]: p for p in data}

    zmenene, preskocene = [], []
    for kluc, (nova, preco) in OPRAVY.items():
        p = idx.get(kluc)
        if not p:
            preskocene.append(kluc + " (kľúč neexistuje)")
            continue
        stara = p.get("vlaknina")
        if stara == nova:
            continue
        p["vlaknina"] = nova
        zmenene.append(f"{kluc}: {stara} → {nova} g  ({preco})")

    pridane = []
    for (kluc, odd, alerg, kcal, b, t, s, vl, na, cena, gks, gpl, bal, balp) in NOVE:
        if kluc in idx:
            continue
        p = {"kluc": kluc, "oddelenie": odd, "alergeny": alerg, "kcal": kcal,
             "bielkoviny": b, "tuky": t, "sacharidy": s, "g_za_ks": gks,
             "hustota": 1, "meso": False, "cena100": cena, "vlaknina": vl, "sodik": na}
        if bal:
            p["balenie_g"] = bal
            p["balenie_popis"] = balp
        if gpl:
            p["g_za_platok"] = gpl
        # NA ZAČIATOK zoznamu: `najdiPotravinu` rieši rovnako dlhé kľúče poradím v poli.
        # „Paštrnák" (8 znakov) sa doteraz pároval na „pastrami" (tiež 8) — mäso namiesto
        # koreňovej zeleniny. Nový kľúč musí byť skôr, inak remízu prehrá.
        data.insert(0, p)
        pridane.append(kluc)

    print(f"opravená vláknina: {len(zmenene)}")
    for z in zmenene:
        print("  " + z)
    if preskocene:
        print("preskočené: " + ", ".join(preskocene))
    print(f"nové potraviny: {len(pridane)}")
    for p in pridane:
        print("  + " + p)

    if DRY:
        print("\n(suchý beh — spusti bez --dry)")
        return
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("\nzapísané: " + CESTA)


main()
