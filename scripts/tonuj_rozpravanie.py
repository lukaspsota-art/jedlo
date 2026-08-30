#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prerozprávanie autorovho rozprávania („Cibuľu som nakrájala") na návod
v rozkazovacom spôsobe („Cibuľu nakrájaj").

Prevádza sa po VETÁCH a len vtedy, keď je vzor jednoznačný:
  • veta má práve jedno „som"/„sme",
  • všetky l-príčastia vo vete majú overený rozkazovací tvar,
  • veta nie je komentár (bola/mala/chcela/myslela… → nechávame tak).
Ostatné vety zostávajú nedotknuté — radšej menej zmien než zlá gramatika.

Spusti: python3 scripts/tonuj_rozpravanie.py [--dry] [--vzorka N]
"""
import json, glob, re, sys, os, unicodedata

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

# príčastia, pri ktorých vetu NIKDY neprepisujeme (komentár, stav, modalita)
BLOK = set("""bol bola boli bolo mal mala mali malo nemal nemala nemali mohol mohla mohli
chcel chcela chceli musel musela museli vedel vedela vedeli videl videla videli
myslel myslela mysleli stal stala stali ostal ostala ostali zostal zostala zostali
dostal dostala dostali našiel našla našli páčil páčila páčili podarilo podaril
rozhodol rozhodla rozhodli zvykol zvykla skúsil skúsila skúsili vyšiel vyšla vyšlo
šiel šla išiel išla urobil urobila robil robila robili trval trvala vydržal vydržala
zdalo zdal potreboval potrebovala potrebovali začal začala začali""".split())

SHORT = {"á":"a","é":"e","í":"i","ý":"y","ú":"u","ó":"o","ô":"o"}
MAKKE = {"d":"ď","t":"ť","n":"ň","l":"ľ"}
SAMOHL = set("aáäeéiíoóôuúyý")

# nepravidelné príčastia → rozkazovací spôsob
OVER = {
 "posypal":"posyp","posypala":"posypali posyp".split()[1],"nasypal":"nasyp","nasypala":"nasyp",
 "vysypal":"vysyp","vysypala":"vysyp","zasypal":"zasyp","zasypala":"zasyp","vsypal":"vsyp","vsypala":"vsyp",
 "prisypal":"prisyp","prisypala":"prisyp","sypal":"syp","sypala":"syp",
 "naklepal":"naklep","naklepala":"naklep","vyklepal":"vyklep","vyklepala":"vyklep",
 "zapol":"zapni","zapla":"zapni","vypol":"vypni","vypla":"vypni",
 "ošúpal":"ošúp","ošúpala":"ošúp","olúpal":"olúp","olúpala":"olúp","zlial":"zlej","zliala":"zlej",
 "vzal":"vezmi","vzala":"vezmi","zobral":"zober","zobrala":"zober","vybral":"vyber","vybrala":"vyber",
 "odobral":"odober","odobrala":"odober","obral":"ober","obrala":"ober","nabral":"naber","nabrala":"naber",
 "piekol":"peč","piekla":"peč","upiekol":"upeč","upiekla":"upeč","opiekol":"opeč","opiekla":"opeč",
 "dopiekol":"dopeč","dopiekla":"dopeč","zapiekol":"zapeč","zapiekla":"zapeč","napiekla":"napeč","napiekol":"napeč",
 "potrel":"potri","potrela":"potri","natrel":"natri","natrela":"natri","rozotrel":"rozotri","rozotrela":"rozotri",
 "utrel":"utri","utrela":"utri","pretrel":"pretri","pretrela":"pretri","vytrel":"vytri","vytrela":"vytri",
 "zomlel":"zomeľ","zomlela":"zomeľ","pomlel":"pomeľ","pomlela":"pomeľ","mlel":"meľ","mlela":"meľ",
 "použil":"použi","použila":"použi","použili":"použi","opláchol":"opláchni","opláchla":"opláchni",
 "prepláchol":"prepláchni","prepláchla":"prepláchni","stiahol":"stiahni","stiahla":"stiahni",
 "vytiahol":"vytiahni","vytiahla":"vytiahni","natiahol":"natiahni","natiahla":"natiahni",
 "prehol":"prehni","prehla":"prehni","zohol":"zohni","zohla":"zohni","osmahol":"osmahni","osmahla":"osmahni",
 "jedol":"jedz","jedla":"jedz","zjedol":"zjedz","zjedla":"zjedz",
 "priviedol":"priveď","priviedla":"priveď","uviedol":"uveď","uviedla":"uveď",
 "poslal":"pošli","poslala":"pošli","zmiesil":"zmies","zmiesila":"zmies","vymiesil":"vymies","vymiesila":"vymies",
 "premiesil":"premies","premiesila":"premies","zamiesil":"zames","zamiesila":"zames",
 "rozpustil":"rozpusť","rozpustila":"rozpusť","napustil":"napusť","napustila":"napusť",
 "naplnil":"naplň","naplnila":"naplň","doplnil":"doplň","doplnila":"doplň","plnil":"plň","plnila":"plň",
 "kúpil":"kúp","kúpila":"kúp","hodil":"hoď","hodila":"hoď","vyhodil":"vyhoď","vyhodila":"vyhoď",
 "prihodil":"prihoď","prihodila":"prihoď","vhodil":"vhoď","vhodila":"vhoď",
 "zvolil":"zvoľ","zvolila":"zvoľ","navlhčil":"navlhči","navlhčila":"navlhči",
 "zmiernil":"zmierni","zmiernila":"zmierni","spomalil":"spomaľ","spomalila":"spomaľ",
}

def imper_z_pricastia(w):
    if w in BLOK: return None
    if w in OVER: return OVER[w]
    for k in ("ovala","oval","ovali","ovalo"):
        if w.endswith(k): return w[:-len(k)] + "uj"
    for k in ("iala","ial","iali","ialo"):
        if w.endswith(k): return w[:-len(k)] + "ej"
    for k in ("ala","al","ali","alo"):
        if w.endswith(k):
            st = w[:-len(k)]
            if len(st) < 2: return None
            return st + "aj"
    for k in ("ila","il","ili","ilo"):
        if w.endswith(k):
            st = w[:-len(k)]
            if len(st) < 2: return None
            if st[-1] not in SAMOHL and len(st) >= 2 and st[-2] not in SAMOHL: return st + "i"
            if st[-1] in MAKKE: return st[:-1] + MAKKE[st[-1]]
            return st
    return None

PRIC = re.compile(r"\b[^\W\d_]{3,}(?:oval|ovala|ovali|ovalo|ial|iala|iali|ialo|al|ala|ali|alo|"
                  r"il|ila|ili|ilo|el|ela|eli|elo|ol|ola|oli|kol|kla)\b", re.UNICODE)
SOM = re.compile(r"\b(som|sme)\b", re.IGNORECASE)
SENT = re.compile(r"[^.!?]*[.!?]|[^.!?]+")
# vo vete sa nesmie vyskytnúť nič z tohto — inak nejde o návod, ale o komentár
STOP = re.compile(r"\b(by|ja|my|mne|nám|nam|vraj|myslím|podľa mňa|náš|naša|naše|našej|našich)\b",
                  re.IGNORECASE | re.UNICODE)
PODRAD = re.compile(r"\b(ktor\w+|keď|kým|ak|aby|pokiaľ|lebo|pretože|keby|akonáhle|že|čo)\b",
                    re.IGNORECASE | re.UNICODE)
# slovesá, ktoré aj po prepise zostanú komentárom
KOMENT = set("""skúšaj vyskúšaj poskúšaj potrebuj nepotrebuj povedz odporúčaj odporuč
priznaj priznávaj dúfaj veriť ver čítaj hľadaj kupuj páč objavuj spomínaj""".split())

def velk(orig, novy):
    return novy[:1].upper() + novy[1:] if orig[:1].isupper() else novy

def preloz_vetu(s):
    """Vráti prepísanú vetu alebo None, keď vzor nie je jednoznačný."""
    if len(SOM.findall(s)) != 1: return None
    if STOP.search(s): return None                    # komentár, nie návod
    pric = [m for m in PRIC.finditer(s)]
    if not pric: return None
    ms = SOM.search(s)
    # hranice vetnej časti, v ktorej stojí „som" — mimo nej neprepisujeme
    hr = [-1] + [i for i, c in enumerate(s) if c in ";:()"] + [len(s)]
    zac = max(i for i in hr if i < ms.start()) + 1
    kon = min(i for i in hr if i > ms.end())
    if PODRAD.search(s[zac:ms.start()]): return None
    mapy = []
    for m in pric:
        if not (zac <= m.start() and m.end() <= kon): return None   # príčastie mimo vety so „som"
        if PODRAD.search(s[zac:m.start()]): return None             # vedľajšia veta
        n = imper_z_pricastia(m.group(0).lower())
        if n is None or n in KOMENT: return None
        mapy.append((m, n))
    out, pos = [], 0
    for m, n in mapy:
        out.append(s[pos:m.start()]); out.append(velk(m.group(0), n)); pos = m.end()
    out.append(s[pos:])
    t = "".join(out)
    # odstráň „som"/„sme" aj zámená 1. os., ktoré po prepise nedávajú zmysel
    t = re.sub(r"\bJa\s+som\b", "", t)
    t = re.sub(r"\bJa\s+", "", t)
    t = re.sub(r"\s*\b(som|sme)\b", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s{2,}", " ", t).strip()
    t = re.sub(r"^([,;]\s*)", "", t)
    if not t: return None
    return velk("A", t) if s.lstrip()[:1].isupper() else t

def main():
    dry = "--dry" in sys.argv
    vz = int(sys.argv[sys.argv.index("--vzorka") + 1]) if "--vzorka" in sys.argv else 0
    zmen_r = zmen_v = zost_v = 0
    ukazky = []
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        novy, zmena = [], False
        for k in d["postup"]:
            k = unicodedata.normalize("NFC", k)
            if not SOM.search(k): novy.append(k); continue
            kusy, out = SENT.findall(k), []
            for s in kusy:
                if SOM.search(s):
                    n = preloz_vetu(s)
                    if n:
                        zmen_v += 1
                        if len(ukazky) < vz: ukazky.append((s.strip(), n))
                        # zachovaj medzeru za vetou
                        out.append(n + (" " if s.endswith(" ") else ""))
                        zmena = True
                        continue
                    zost_v += 1
                out.append(s)
            novy.append("".join(out))
        if zmena:
            zmen_r += 1
            d["postup"] = novy
            if not dry:
                with open(f, "w", encoding="utf-8") as fh:
                    json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("prepísaných receptov:", zmen_r)
    print("prepísaných viet:", zmen_v, " ponechaných viet so som/sme:", zost_v)
    for a, b in ukazky:
        print("\n•", a[:190]); print("→", b[:190])

if __name__ == "__main__":
    main()
