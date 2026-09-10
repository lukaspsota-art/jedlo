#!/usr/bin/env python3
"""Očistí popisy receptov od cudzích historiek v prvej osobe.

Beh:  python3 scripts/oprav_popisy.py [--zapis]
Bez --zapis len vypíše, čo by sa stalo.

Prečo: popis je prvé, čo v detaile receptu prečítaš — veľkou kurzívou cez ~330 px
telefónu. U 399 z 2220 receptov to bola prevzatá blogová historka v prvej osobe
(„manželka mi dala za úlohu zlikvidovať starú fazuľu…"). Nič sa nedopisuje:
vety v prvej osobe sa VYPUSTIA, zvyšok popisu ostáva. Keď po očistení nezostane
zmysluplná veta, popis sa zmaže celý — appka ho nepotrebuje.
"""
import json, glob, re, sys, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ZAPIS = "--zapis" in sys.argv

# 1. osoba j. č. aj mn. č. + privlastňovacie. Zámerne úzke — radšej vetu nechať,
# než zmazať vetu, ktorá o recepte niečo hovorí.
PRVA_OSOBA = re.compile(
    r"\b(som|sme|mi|mne|ma|nás|nám|môj|moja|moje|môjho|mojej|mojim|náš|naša|naše|nášho|našej|manželka|manžel|svokra|u nás doma|mám rád|máme radi)\b",
    re.I)

def vety(text):
    # delenie na vety, ktoré nerozseká skratky typu „napr." ani desatinné čísla
    return [v.strip() for v in re.split(r'(?<=[.!?])\s+(?=[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ])', text.strip()) if v.strip()]

zmenene, zmazane, netknute = 0, 0, 0
for f in sorted(glob.glob("recepty/*.json")):
    try:
        r = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    p = (r.get("popis") or "").strip()
    if not p or not PRVA_OSOBA.search(p):
        netknute += 1
        continue
    ostane = [v for v in vety(p) if not PRVA_OSOBA.search(v)]
    novy = " ".join(ostane).strip()
    if len(novy) < 20:          # nezostala veta, ktorá by o recepte niečo povedala
        novy = ""
        zmazane += 1
    else:
        zmenene += 1
    if ZAPIS:
        if novy: r["popis"] = novy
        else: r.pop("popis", None)
        json.dump(r, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print(f"popisy: {zmenene} skrátených · {zmazane} zmazaných · {netknute} nedotknutých")
print("(skúšobný beh — spusti s --zapis)" if not ZAPIS else "zapísané")
