#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B6: doplní vlákninu (g/100 g) a sodík (mg/100 g) tam, kde chýbali a rátali sa ako nula.
Najhoršie boli práve oddelenia, ktoré o sodíku rozhodujú — sójová omáčka prispievala 0 mg
namiesto ~5500 mg. Hodnoty sú z bežných nutričných tabuliek.

Kľúče vypísané v HODNOTY sú konkrétne potraviny; ODDELENIE_DEFAULT je hrubý priemer oddelenia
pre zvyšok (použije sa len tam, kde hodnota chýba úplne).
Beh: py scripts/doplnit_vlaknina_sodik.py
"""
import json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(ZAKLAD, "data", "potraviny.json")

# kľúč: (vláknina g/100 g, sodík mg/100 g)
HODNOTY = {
    # ── Omáčky a dochucovadlá (tu je hlavný zdroj sodíka v jedálničku)
    "sójová omáčka": (0.8, 5500), "tmavá sójová omáčka": (0.8, 5200), "tamari": (0.9, 4800),
    "rybia omáčka": (0, 7800), "worcester": (0, 3300), "sriracha": (1.5, 3300),
    "kečup": (1.0, 900), "horčica": (3.3, 1100), "majonéza": (0, 600), "pesto": (2.5, 1200),
    "kari pasta": (3, 2500), "chilli omáčka": (1, 1500), "peri-peri": (2, 2000),
    "kapar": (3.2, 2350), "tahin": (9, 30), "shaoxing": (0, 800),
    "ocot": (0, 5), "jablčný ocot": (0, 5), "sirup": (0, 10), "grenadína": (0, 10),
    # ── Mäso a ryby
    "klobás": (0, 1200), "saláma": (0, 1500), "škvarky": (0, 900),
    "tuniak": (0, 350), "bravčov": (0, 60), "mäso": (0, 70), "morčac": (0, 60),
    "krkovičk": (0, 70), "roštenka": (0, 55), "lopatka": (0, 65), "jarné kurčatá": (0, 70),
    "krevet": (0, 250), "mušl": (0, 290), "filé z pstruha": (0, 45), "filety z pstruha": (0, 45),
    "šťuky": (0, 45), "zubáča": (0, 45),
    # ── Trvanlivé a konzervy
    "kokosové mlieko": (2.2, 15), "tofu": (1.2, 12), "tempeh": (7, 9),
    "fazuľa": (6, 240), "fazul": (6, 240), "biele fazule": (6, 240),
    "cícer": (7, 240), "predvarený cícer": (7, 240), "cícer predvarený": (7, 240),
    "šošovic": (8, 6), "hrach": (8, 15), "sterilovaný hrášok": (5, 250),
    "sušené hub": (20, 15), "ríbezľ": (4.3, 2),
    "zelené oliv": (3.3, 1550), "nakladané uhorky": (1.2, 800), "nori riasa": (30, 1200),
    # ── Pečivo
    "strúhanka": (4, 700), "kaizerka": (3, 500), "celozrnné žeml": (6, 450),
    "tortill": (3, 550), "celozrn": (6, 450),
    # ── Mliečne a vajcia
    "parmezán": (0, 1600), "pecorino": (0, 1800), "gorgonzola": (0, 1400), "čedar": (0, 620),
    "gouda": (0, 820), "feta": (0, 1100), "bryndza": (0, 1200), "oštiepok": (0, 1000),
    "olomoucké tvarôžky": (0, 1200), "mozzarell": (0, 400), "mozzarel": (0, 400),
    "ricott": (0, 100), "smotana": (0, 40), "šľahačka": (0, 35), "smotanový jogurt": (0, 50),
    "podmasl": (0, 105), "srvátk": (0, 54),
    "žĺtok": (0, 48), "žĺtk": (0, 48), "bielok": (0, 166), "bielka": (0, 166), "vaječné bielky": (0, 166),
    "čokolád": (7, 20),
    # ── Ostatné / oleje
    "voda": (0, 1), "ľad": (0, 1), "vývar": (0, 350), "kvasnice": (26, 50), "acai": (30, 7),
    "rastlinný olej": (0, 0), "ghí": (0, 2), "masten": (0, 0),
}

# hrubý priemer oddelenia pre zvyšok (lepší odhad ako tvrdá nula)
ODDELENIE_DEFAULT = {
    "Zelenina a ovocie": (2.0, 8),
    "Korenie a bylinky": (10.0, 30),
    "Orechy a semená": (8.0, 5),
    "Cestoviny a ryža": (2.5, 5),
    "Pečenie a sladké": (1.0, 25),
    "Nápoje": (0.0, 8),
    "Oleje a tuky": (0.0, 1),
    "Mäso a ryby": (0.0, 70),
    "Mliečne a vajcia": (0.0, 120),
    "Trvanlivé a konzervy": (3.0, 200),
    "Pečivo": (4.0, 480),
    "Omáčky a dochucovadlá": (1.0, 900),
    "Ostatné": (0.0, 20),
    "Chladené": (0.0, 200),
    "Mrazené": (2.0, 30),
    "Alkohol": (0.0, 5),
    "Ryby a morské plody": (0.0, 90),
}


def main():
    with open(CESTA, encoding="utf-8") as f:
        potraviny = json.load(f)
    presne, priemer, chyba = 0, 0, []
    znama = set(HODNOTY)
    for p in potraviny:
        h = HODNOTY.get(p["kluc"])
        if h:
            znama.discard(p["kluc"])
            zmenene = False
            if p.get("vlaknina") is None:
                p["vlaknina"] = h[0]; zmenene = True
            if p.get("sodik") is None:
                p["sodik"] = h[1]; zmenene = True
            presne += 1 if zmenene else 0
            continue
        d = ODDELENIE_DEFAULT.get(p.get("oddelenie"))
        if not d:
            continue
        zmenene = False
        if p.get("vlaknina") is None:
            p["vlaknina"] = d[0]; zmenene = True
        if p.get("sodik") is None:
            p["sodik"] = d[1]; zmenene = True
        priemer += 1 if zmenene else 0
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(potraviny, f, ensure_ascii=False, indent=2)
        f.write("\n")
    bezV = [p["kluc"] for p in potraviny if p.get("vlaknina") is None]
    bezN = [p["kluc"] for p in potraviny if p.get("sodik") is None]
    print("doplnené presné: %d, z priemeru oddelenia: %d" % (presne, priemer))
    print("stále bez vlákniny: %d, bez sodíka: %d" % (len(bezV), len(bezN)))
    if znama:
        print("kľúč v databáze neexistuje:", ", ".join(sorted(znama)))


if __name__ == "__main__":
    main()
