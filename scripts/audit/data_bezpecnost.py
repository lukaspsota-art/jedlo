#!/usr/bin/env python3
"""AUDIT: reťazce v dátach, ktoré rozbijú build (inline <script> a placeholdery generátora)."""
import json, glob, os, sys, re
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NEBEZPECNE = ["</script", "<script", "__DATA__", "__POTRAVINY__", "__JEDALNICKY__", "__APP_JS__", "__DATUM__", "__POCET__", "<!--", "-->"]

def prehladaj(obj, cesta=""):
    if isinstance(obj, str):
        for n in NEBEZPECNE:
            if n.lower() in obj.lower():
                yield (cesta, n, obj[:80])
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from prehladaj(v, cesta + "." + str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from prehladaj(v, cesta + "[" + str(i) + "]")

celkom = 0
for vzor, meno in [(os.path.join(R,"recepty","*.json"),"recept"),
                   (os.path.join(R,"jedalnicky","*.json"),"jedálniček")]:
    for c in sorted(glob.glob(vzor)):
        d = json.load(open(c, encoding="utf-8"))
        for cesta, n, uk in prehladaj(d):
            celkom += 1
            print(f"  {os.path.basename(c)}{cesta}: obsahuje „{n}\" → {uk!r}")
p = json.load(open(os.path.join(R,"data","potraviny.json"), encoding="utf-8"))
for cesta, n, uk in prehladaj(p, "potraviny"):
    celkom += 1
    print(f"  potraviny.json{cesta}: „{n}\" → {uk!r}")
print(f"Nebezpečných reťazcov v dátach: {celkom}")
print("Kontroluje to skontroluj_recepty()?",
      "áno" if "script" in open(os.path.join(R,"generuj_kucharku.py"),encoding="utf-8").read() else "NIE")
