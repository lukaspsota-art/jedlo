#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Zosúladí pole `foto` v recepty/*.json s obsahom priečinka recepty/fotky/.

Súbor `<id>.webp` v recepty/fotky/  →  "foto": "<id>.webp"
Súbor chýba                        →  "foto": ""
Vlastnú fotku (data: URI) v recepte nechá tak.

Build to zvládne aj bez tohto skriptu (dohľadá si `<id>.webp` sám), ale dátový model
v CLAUDE.md hovorí, že `foto` je pole receptu — nech teda v JSONe naozaj je.

Spusti: python3 scripts/synchronizuj_foto.py
"""
import json, os, glob, sys

ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECEPTY = os.path.join(ZAKLAD, "recepty")
FOTKY = os.path.join(RECEPTY, "fotky")
PRIPONY = (".webp", ".jpg", ".jpeg", ".png", ".avif")


def main():
    mam = {}
    for cesta in glob.glob(os.path.join(FOTKY, "*")):
        n = os.path.basename(cesta)
        koren, pripona = os.path.splitext(n)
        if pripona.lower() in PRIPONY:
            mam[koren] = n

    pridane = vycistene = 0
    for cesta in sorted(glob.glob(os.path.join(RECEPTY, "*.json"))):
        with open(cesta, encoding="utf-8") as f:
            r = json.load(f)
        rid = r.get("id") or ""
        stare = r.get("foto") or ""
        if isinstance(stare, str) and stare.startswith("data:"):
            continue  # vlastná fotka používateľa
        nove = mam.get(rid, "")
        if nove == stare:
            continue
        r["foto"] = nove
        with open(cesta, "w", encoding="utf-8") as f:
            json.dump(r, f, ensure_ascii=False, indent=1)
            f.write("\n")
        if nove:
            pridane += 1
        else:
            vycistene += 1

    print(f"Fotiek v {os.path.relpath(FOTKY, ZAKLAD)}: {len(mam)}")
    print(f"Receptov s doplneným poľom „foto“: {pridane}, vyprázdnených: {vycistene}")
    chybne = [k for k in mam if not os.path.exists(os.path.join(RECEPTY, k + ".json"))]
    if chybne:
        print(f"Fotky bez receptu ({len(chybne)}): " + ", ".join(sorted(chybne)[:10]), file=sys.stderr)


if __name__ == "__main__":
    main()
