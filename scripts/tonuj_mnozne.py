#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Štvrtý tvar: rozkazovací spôsob 2. os. MN. č. („pridajte", „pečte" – vykanie)
→ 2. os. j. č. („pridaj", „peč"), aby mala celá databáza jeden tón.

Tvorenie je pravidelné: rozkaz mn. č. = rozkaz j. č. + „-te". Prepisujeme teda
len odseknutím „-te" a len pri tvaroch, ktoré sú naozaj rozkazom — oznamovací
spôsob 2. os. mn. č. („môžete", „necháte") a podstatné mená („na mieste",
„v recepte") sú vylúčené.

Spusti: python3 scripts/tonuj_mnozne.py [--dry] [--vzorka N]
"""
import json, glob, re, sys, os, unicodedata

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")
SAM = set("aeiouyáéíóúýäô")

# nie sú to rozkazy: podstatné mená v lokáli, príslovky, oznamovací spôsob
NIE_ROZKAZ = set("""mieste určite recepte dente ceste hrste okamžite kapuste chrbte sivaste
gumovite omackovite paste galette köfte mesquite kopcovite proste komente vidite možte môžte
mozte zložite vlozite mlete nakysnute poliate zaliate naliate vychladnute vykysnute kuchte
teste liste moste svete podstate minúte príchute nasvete šaláte cukete robote vňate chute
teplote pošte sviete kvete lete note bruste feste počte objeme vrste kôrte""".split()) - {"necháte", "opepríte"}

# preklepy v zdrojových dátach
OPRAVA = {"scedte": "sceď", "hnette": "hneť", "prehnette": "prehneť", "posmazte": "posmaž",
          "vymieste": "vymies", "necháte": "nechaj", "opepríte": "opepri", "prepichajte": "poprepichuj", "zopeňte": "zopeň"}

TOKEN = re.compile(r"\b[^\W\d_]{3,}te\b", re.UNICODE)

def na_jednotne(w):
    if w in NIE_ROZKAZ: return None
    if w in OPRAVA: return OPRAVA[w]
    st = w[:-2]
    if len(st) < 3: return None
    # „-ite" je dvojznačné: „očistite" je rozkaz, „navštívite" oznamovací spôsob.
    # Rozlišuje ich dĺžka predchádzajúcej slabiky (rytmický zákon).
    if w.endswith("ite") and re.search(r"[áéíóúýôä]|ia|ie|iu", st[-4:]):
        return None
    if w.endswith("jte") or st[-1] not in SAM or st[-1] in "iy":
        return st
    return None

def preloz_krok(t):
    def rep(m):
        w = m.group(0); low = w.lower()
        n = na_jednotne(low)
        if not n: return w
        return n[:1].upper() + n[1:] if w[:1].isupper() else n
    return TOKEN.sub(rep, t)

def main():
    dry = "--dry" in sys.argv
    vz = int(sys.argv[sys.argv.index("--vzorka") + 1]) if "--vzorka" in sys.argv else 0
    zm = 0; uk = []
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        novy = [preloz_krok(unicodedata.normalize("NFC", k)) for k in d["postup"]]
        if novy != d["postup"]:
            for a, b in zip(d["postup"], novy):
                if a != b and len(uk) < vz: uk.append((a, b))
            zm += 1; d["postup"] = novy
            if not dry:
                with open(f, "w", encoding="utf-8") as fh:
                    json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("prepísaných receptov:", zm)
    for a, b in uk:
        print("\n•", a[:160]); print("→", b[:160])

if __name__ == "__main__":
    main()
