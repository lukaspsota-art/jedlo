#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generátor kuchárky.
Prečíta recepty z recepty/*.json, databázu potravín z data/potraviny.json
a šablónu data/sablona.html, a vytvorí offline stránku kucharka.html.

Spusti: python3 generuj_kucharku.py
"""
import json, os, glob, datetime, shutil

ZAKLAD = os.path.dirname(os.path.abspath(__file__))
RECEPTY_DIR = os.path.join(ZAKLAD, "recepty")
JEDALNICKY_DIR = os.path.join(ZAKLAD, "jedalnicky")
POTRAVINY = os.path.join(ZAKLAD, "data", "potraviny.json")
SABLONA = os.path.join(ZAKLAD, "data", "sablona.html")
APPJS = os.path.join(ZAKLAD, "data", "app.js")
VYSTUP = os.path.join(ZAKLAD, "kucharka.html")
DOCS_INDEX = os.path.join(ZAKLAD, "docs", "index.html")  # GitHub Pages entry point (kópia kucharka.html)

def nacitaj_json_zoznam(vzor):
    out = []
    for cesta in sorted(glob.glob(vzor)):
        try:
            with open(cesta, encoding="utf-8") as f:
                out.append(json.load(f))
        except Exception as e:
            print("Chyba pri čítaní", cesta, ":", e)
    return out

def main():
    recepty = nacitaj_json_zoznam(os.path.join(RECEPTY_DIR, "*.json"))
    jedalnicky = nacitaj_json_zoznam(os.path.join(JEDALNICKY_DIR, "*.json"))
    with open(POTRAVINY, encoding="utf-8") as f:
        potraviny = json.load(f)
    with open(SABLONA, encoding="utf-8") as f:
        sablona = f.read()
    with open(APPJS, encoding="utf-8") as f:
        appjs = f.read()
    sablona = sablona.replace("__APP_JS__", appjs)
    datum = datetime.date.today().strftime("%d.%m.%Y")
    html_out = (sablona
        .replace("__DATA__", json.dumps(recepty, ensure_ascii=False))
        .replace("__POTRAVINY__", json.dumps(potraviny, ensure_ascii=False))
        .replace("__JEDALNICKY__", json.dumps(jedalnicky, ensure_ascii=False))
        .replace("__DATUM__", datum)
        .replace("__POCET__", str(len(recepty))))
    with open(VYSTUP, "w", encoding="utf-8") as f:
        f.write(html_out)
    os.makedirs(os.path.dirname(DOCS_INDEX), exist_ok=True)
    shutil.copyfile(VYSTUP, DOCS_INDEX)
    print(f"Hotovo: {VYSTUP}")
    print(f"GitHub Pages: {DOCS_INDEX}")
    print(f"Receptov: {len(recepty)} · potravín: {len(potraviny)} · jedálničkov: {len(jedalnicky)}")

if __name__ == "__main__":
    main()
