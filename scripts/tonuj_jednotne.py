#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tretí tvar rozprávania: 1. os. j. č. prítomného času („Ako prvé si urobím kvások")
→ rozkazovací spôsob („Ako prvé si urob kvások").

Tvar 1. os. j. č. sa líši od 1. os. mn. č. len koncovým -m/-me, takže sa dá
prehnať cez rovnaký overený slovník (`tonuj_postup.imper`). Podstatné mená
v datíve/inštrumentáli (korením, surovinám, droždím…) sú vylúčené zoznamom.

Spusti: python3 scripts/tonuj_jednotne.py [--dry] [--vzorka N]
"""
import json, glob, re, sys, os, unicodedata, types

BASE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(BASE, "..", "recepty")
_src = open(os.path.join(BASE, "tonuj_postup.py"), encoding="utf-8").read() \
       .replace('if __name__ == "__main__":\n    main()', '')
T = types.ModuleType("t"); T.__file__ = os.path.join(BASE, "tonuj_postup.py")
exec(compile(_src, "t", "exec"), T.__dict__)

# Pracujeme s VÝSLOVNÝM zoznamom slovies – tvary 1. os. j. č. sa tvarovo neodlíšia
# od datívu/inštrumentálu podstatných mien („surovinám", „korením", „videám").
# Zoznam vznikol ručnou kontrolou všetkých kandidátov s výskytom ≥ 2.
NIE_SLOVESO = set("""korením korenim surovinám surovinam jedlám jedlam cestovinám cestovinam
vajciam vajíčkam vajickam polievkam polievkám jahodám jahodam stehienkam paradajkám paradajkam
droždím drozdim horúcim horucim hovädzím kuracím domácim menším ďalším pečiacim kypriacim
program programom ovocím mliekom olejom cukrom medom syrom soľou kusom časom razom
rukám nohám deťom hosťom kúskam kúskom dielom smerom typom
tam sem dom nám vám ním tým kým čím sám im am em om um dnom snom stom rôznym takým
samým iným celým bielym tuhým hustým žltým tmavým jemným""".split())

# autorov komentár – necháva sa tak (nie je to pokyn čitateľovi)
KOMENTAR = set("""prajem ďakujem ospravedlňujem odporúčam neodporúčam odporucam používam
nepoužívam pouzivam zvyknem robievam myslím myslim neviem viem nebudem budem potrebujem
kupujem preferujem koštujem skladujem vyskúšam priznam dúfam mám nemám chcem musím
milujem obľubujem uprednostňujem spomínam pamätám viem nechcem""".split())

SLOVESA = """pridám pridam pridavam pridávam nechám necham nechavam posypem pečiem
pripravím pripravujem zalejem vyberiem premiešam premiesam primiešam pomiešam potriem
vložím vložim urobím urobim podávam rozdelím pokrájam pokrajam opečiem nakrájam nakrajam
použijem uvarím prikryjem povarím rozvaľkám uložím zmiešam rozmixujem odložím preložím
ukladám vkladám premiesim vymiesim zamiesim miesim zamiešam odstavím vypracujem zakryjem
vytiahnem osolím osolim posolím nesolím privediem miešam vyšľahám vypnem poukladám
osmahnem spracujem prihodim prilejem nalejem začnem nastrúham upečiem dopečiem pražím
opražím popražím narežem umyjem prilievam nasekám nerobím mixujem ošúpem zavriem uzavriem
prisypem prelejem podlejem vysypem polejem tvarujem orestujem vyklopím znížim krájam
nasypem vyložím vsypem rozložím pichnem nasolím nakorením okorením ocukrujem varím
dám osmažím usmažím opekám zapekám podusím udusím dusím sparím scedím obalím zabalím
vytvarujem naplním doplním rozotriem vytriem rozohrejem zohrejem predhrejem odlejem
zlejem dolejem prisolím dosolím posekám rozmiešam vymiešam natriem potieram zapracujem otvorim roztopím
precedím ozdobím vymažem pokračujem spravím poprášim vlejem prepláchnem napĺňam zahustim
prevarím očistím naklepem klepem dochutím prichystámdám""".split()
SLOVESA = set(SLOVESA)

TOKEN = re.compile(r"\b[^\W\d_]{1,}(?:ám|am|ím|im|em)\b", re.UNICODE)
# veta s „ja"/„by" je autorov komentár, nie pokyn
STOP = re.compile(r"\b(ja|by|mne|mi|my)\b", re.IGNORECASE | re.UNICODE)
SENT = re.compile(r"[^.!?]*[.!?]|[^.!?]+")

# tvary, ktoré vyzerajú ako sloveso, ale sú to mená (datív/inštrumentál) — ignorujeme ich
NOUNISH = re.compile(r"(ním|tím|ším|cím|ým|dzím|žím)$", re.UNICODE)

def je_meno(low):
    return low in NIE_SLOVESO or (NOUNISH.search(low) and low not in SLOVESA)

def preloz_krok(t):
    """Prepisujeme po vetách a len celé vety: keď je vo vete čo i len jeden neznámy
    tvar 1. os. j. č., vetu nechávame — inak by v jednej vete stáli oba tvary."""
    out = []
    for veta in SENT.findall(t):
        if STOP.search(veta):
            out.append(veta); continue
        neznamy = [m.group(0).lower() for m in TOKEN.finditer(veta)
                   if m.group(0).lower() not in SLOVESA
                   and not je_meno(m.group(0).lower())
                   and m.group(0).lower() not in KOMENTAR]
        if neznamy:
            out.append(veta); continue
        def rep(m):
            w = m.group(0); low = w.lower()
            if low not in SLOVESA: return w
            n = T.oznam(low + "e") if T.je_vedlajsia(t, m.start()) else T.imper(low + "e")
            return T.zachovaj_velkost(w, n) if n else w
        out.append(TOKEN.sub(rep, veta))
    return "".join(out)

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
            zm += 1
            d["postup"] = novy
            if not dry:
                with open(f, "w", encoding="utf-8") as fh:
                    json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("prepísaných receptov:", zm)
    for a, b in uk:
        print("\n•", a[:170]); print("→", b[:170])

if __name__ == "__main__":
    main()
