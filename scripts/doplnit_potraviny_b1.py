#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""B1: presné kľúče pre potraviny, ktoré sa doteraz párovali na nesprávny (kratší) kľúč
alebo nepárovali vôbec. Ceny sú orientačné SK Kaufland/Lidl 2026 v € / 100 g.
Beh: py scripts/doplnit_potraviny_b1.py
"""
import json, os, sys, collections

sys.stdout.reconfigure(encoding="utf-8")
ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(ZAKLAD, "data", "potraviny.json")


def P(kluc, odd, kcal, b, t, s, cena, **kw):
    z = {"kluc": kluc, "oddelenie": odd, "alergeny": kw.get("alergeny", []), "kcal": kcal,
         "bielkoviny": b, "tuky": t, "sacharidy": s, "g_za_ks": kw.get("g_za_ks"),
         "hustota": kw.get("hustota", 1), "meso": kw.get("meso", False), "cena100": cena,
         "vlaknina": kw.get("vlaknina", 0), "sodik": kw.get("sodik", 0)}
    for pole in ("balenie_g", "balenie_popis", "g_za_platok"):
        if pole in kw:
            z[pole] = kw[pole]
    return z


NOVE = [
    # tuky a mlieko
    P("kokosový olej", "Oleje a tuky", 862, 0, 100, 0, 0.9, hustota=0.92, balenie_g=500, balenie_popis="500 ml"),
    P("kondenzované mlieko", "Trvanlivé a konzervy", 321, 8, 9, 54, 0.6, alergeny=["mlieko"],
      hustota=1.3, balenie_g=397, balenie_popis="397 g", sodik=127),
    # rastlinné smotany — kľúčové je, že NEMAJÚ alergén mlieko (predtým sa párovali na „smotana")
    P("rastlinná smotana", "Mliečne a vajcia", 190, 1, 19, 3, 0.6, hustota=1, balenie_g=200, balenie_popis="200 ml"),
    P("kokosová smotana", "Trvanlivé a konzervy", 230, 2, 24, 3, 0.7, hustota=1, balenie_g=200, balenie_popis="200 ml"),
    P("sójová smotana", "Mliečne a vajcia", 180, 3, 17, 2, 0.6, alergeny=["sója"], hustota=1),
    P("ryžová smotana", "Mliečne a vajcia", 170, 0.5, 16, 6, 0.6, hustota=1),
    P("ovsená smotana", "Mliečne a vajcia", 180, 1, 17, 5, 0.6, alergeny=["lepok"], hustota=1),
    P("smotanový syr", "Mliečne a vajcia", 250, 6, 24, 3, 0.9, alergeny=["mlieko"],
      balenie_g=150, balenie_popis="150 g", sodik=350),
    P("ementál", "Mliečne a vajcia", 380, 28, 30, 0, 1.5, alergeny=["mlieko"], g_za_platok=20,
      balenie_g=150, balenie_popis="150 g", sodik=450),
    # zelenina a ovocie
    P("maslová tekvica", "Zelenina a ovocie", 45, 1, 0.1, 10, 0.25, vlaknina=2, sodik=4),
    P("sladké zemiak", "Zelenina a ovocie", 90, 2, 0.1, 20, 0.7, g_za_ks=200, vlaknina=3, sodik=55),
    P("sušené paradajky", "Trvanlivé a konzervy", 258, 14, 3, 43, 2.2, vlaknina=12, sodik=2100),
    P("sušené hríby", "Trvanlivé a konzervy", 280, 25, 3, 45, 8, balenie_g=20, balenie_popis="20 g",
      vlaknina=20, sodik=15),
    P("kel", "Zelenina a ovocie", 49, 4.3, 0.9, 9, 0.5, g_za_ks=900, vlaknina=3.6, sodik=38),
    # trvanlivé, cestoviny, pečivo
    P("paradajkový pretlak", "Trvanlivé a konzervy", 82, 4, 0.5, 16, 0.35, hustota=1.1,
      balenie_g=140, balenie_popis="140 g", vlaknina=3, sodik=40),
    P("krupica", "Cestoviny a ryža", 360, 12, 1, 73, 0.2, alergeny=["lepok"], balenie_g=1000,
      balenie_popis="1 kg", vlaknina=3, sodik=1),
    P("lasagne plát", "Cestoviny a ryža", 355, 12, 1.5, 72, 0.45, alergeny=["lepok"],
      balenie_g=500, balenie_popis="500 g", vlaknina=3, sodik=10),
    P("bucatini", "Cestoviny a ryža", 355, 12, 1.5, 72, 0.3, alergeny=["lepok"], balenie_g=500,
      balenie_popis="500 g", vlaknina=3, sodik=10),
    P("fliačky", "Cestoviny a ryža", 355, 12, 1.5, 72, 0.25, alergeny=["lepok"], balenie_g=500,
      balenie_popis="500 g", vlaknina=3, sodik=10),
    P("lístkové cesto", "Mrazené", 380, 6, 24, 35, 0.55, alergeny=["lepok"], balenie_g=400,
      balenie_popis="400 g", vlaknina=2, sodik=450),
    P("vanilkový cukor", "Pečenie a sladké", 390, 0, 0, 98, 1.5, g_za_ks=8, balenie_g=8,
      balenie_popis="8 g vrecko"),
    P("džem", "Pečenie a sladké", 250, 0.4, 0.1, 60, 0.5, balenie_g=340, balenie_popis="340 g",
      vlaknina=1, sodik=10),
    # omáčky a dochucovadlá
    P("tzatziki", "Omáčky a dochucovadlá", 120, 3, 10, 3, 1.2, alergeny=["mlieko"], hustota=1,
      balenie_g=200, balenie_popis="200 g", sodik=450),
    P("balzamikový krém", "Omáčky a dochucovadlá", 250, 0.5, 0.1, 60, 1.6, hustota=1.2,
      balenie_g=250, balenie_popis="250 ml", sodik=30),
    P("tamarindová pasta", "Omáčky a dochucovadlá", 240, 2.8, 0.6, 63, 2, hustota=1.2,
      balenie_g=200, balenie_popis="200 g", vlaknina=5, sodik=30),
    P("hp omáčka", "Omáčky a dochucovadlá", 120, 1, 0.2, 27, 1, hustota=1.2, sodik=1700),
    P("remoulade", "Omáčky a dochucovadlá", 380, 1, 38, 8, 1, hustota=1, alergeny=["vajcia"], sodik=800),
    P("umeocot", "Omáčky a dochucovadlá", 30, 0.3, 0, 6, 3, hustota=1, sodik=8000),
    # mäso
    P("krabie mäso", "Mäso a ryby", 90, 15, 1, 4, 1.8, alergeny=["ryby"], meso=True,
      balenie_g=250, balenie_popis="250 g", sodik=800),
    P("sliepka", "Mäso a ryby", 239, 18, 17, 0, 0.5, meso=True, g_za_ks=1400, sodik=70),
    P("kuracia pečeň", "Mäso a ryby", 119, 17, 5, 1, 0.5, meso=True, balenie_g=400,
      balenie_popis="400 g", sodik=71),
]


def main():
    with open(CESTA, encoding="utf-8") as f:
        potraviny = json.load(f)
    existuje = {p["kluc"] for p in potraviny}
    pridane = [n for n in NOVE if n["kluc"] not in existuje]
    potraviny.extend(pridane)
    # „kokosové" (660 kcal = strúhaný kokos) je pasca: chytá kokosové mlieko/smotanu/olej.
    # Zostáva kľúč „kokos" a „kokos strúh", tento premenujeme na jednoznačný.
    for p in potraviny:
        if p["kluc"] == "kokosové":
            p["kluc"] = "kokosová múčka"
    with open(CESTA, "w", encoding="utf-8") as f:
        json.dump(potraviny, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("pridané: %d (%s)" % (len(pridane), ", ".join(p["kluc"] for p in pridane)))
    dup = [k for k, n in collections.Counter(p["kluc"] for p in potraviny).items() if n > 1]
    if dup:
        raise SystemExit("duplicitné kľúče: " + ", ".join(dup))
    print("potravín spolu: %d" % len(potraviny))


if __name__ == "__main__":
    main()
