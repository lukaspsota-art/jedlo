#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rovnaký tón aj v poliach `tipy` a `popis`.

Detail receptu zobrazuje popis aj tip hneď nad postupom — keď je postup
v rozkazovacom spôsobe a tip v 1. os. mn. č. („pečieme 30 minút"), pôsobí to
rozbito. Používame tie isté overené slovníky ako pri postupe.

Spusti: python3 scripts/tonuj_tipy_popis.py [--dry] [--vzorka N]
"""
import json, glob, sys, os, types, unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(BASE, "..", "recepty")

def _load(name):
    src = open(os.path.join(BASE, name), encoding="utf-8").read() \
          .replace('if __name__ == "__main__":\n    main()', '')
    m = types.ModuleType(name); m.__file__ = os.path.join(BASE, name)
    exec(compile(src, name, "exec"), m.__dict__)
    return m

MN = _load("tonuj_postup.py")      # 1. os. mn. č. → rozkaz
JED = _load("tonuj_jednotne.py")   # 1. os. j. č. → rozkaz
VYK = _load("tonuj_mnozne.py")     # vykanie → rozkaz

import re
# vety, v ktorých autor hovorí o sebe („u nás to máme radi"), nechávame tak
JA = re.compile(r"\b(ja|my|mám|máme|nemám|nemáme|náš|naša|naše|našej|našich|moj\w+|"
                r"u nás|nás|mne|mi)\b", re.IGNORECASE | re.UNICODE)
VETY = re.compile(r"[^.!?]*[.!?]|[^.!?]+")

def preloz(t):
    t = unicodedata.normalize("NFC", t)
    out = []
    for veta in VETY.findall(t):
        if JA.search(veta): out.append(veta); continue
        nove, chyby = MN.preloz_krok(veta)
        if chyby: out.append(veta); continue   # neznámy tvar → radšej nechať
        out.append(VYK.preloz_krok(JED.preloz_krok(nove)))
    return "".join(out)

def main():
    dry = "--dry" in sys.argv
    vz = int(sys.argv[sys.argv.index("--vzorka") + 1]) if "--vzorka" in sys.argv else 0
    n = {"tipy": 0, "popis": 0}; uk = []
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        zmena = False
        for pole in ("tipy", "popis"):
            if not d[pole].strip(): continue
            novy = preloz(d[pole])
            if novy != d[pole]:
                if len(uk) < vz: uk.append((pole, d[pole], novy))
                d[pole] = novy; n[pole] += 1; zmena = True
        if zmena and not dry:
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("upravené tipy:", n["tipy"], "| upravené popisy:", n["popis"])
    for p, a, b in uk:
        print("\n•", p, "|", a[:150]); print("→", " " * len(p), b[:150])

if __name__ == "__main__":
    main()
