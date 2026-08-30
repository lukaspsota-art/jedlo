#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Zjednotenie tónu postupu: 1. os. mn. č. („nakrájame") → rozkazovací spôsob 2. os. j. č. („nakrájaj").

Prevádza sa CELÝ recept alebo žiadny — inak by v jednom postupe zostali oba tvary.
Recept sa preloží len vtedy, keď KAŽDÝ nájdený tvar 1. os. mn. č. má overený preklad.

Spusti:  python3 scripts/tonuj_postup.py [--dry]
"""
import json, glob, re, sys, os, unicodedata

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

# ── slová končiace na -me, ktoré NIE sú sloveso v 1. os. mn. č. ────────────
NEMEN = set("""samozrejme forme jame kome dome krme rme šme zme sme prieme jemne temne
tme creme crème poďme ideme známe neznáme priame vzájomne písme plátne strieme
nadarmo ame vame lame same rume zrejme zime kurkume strome name pryme
smozrejme samorejme príjenme prijemne povedzme objeme režime rezime systéme
filme prijme žíme zíme programe diagrame kréme kreme extréme objme sedme ôsme siedme piatme""".split())

# ── nepravidelné tvary (aj tie, kde 1. os. mn. č. nie je rozkaz) ───────────
OVERRIDE = {
    # modálne / oznamovacie – zostávajú v oznamovacom spôsobe, len 2. os. j. č.
    "môžeme":"môžeš","môžme":"môžeš","mozeme":"môžeš","možme":"môžeš","mozme":"môžeš",
    "máme":"máš","mame":"máš","nemáme":"nemáš","nemame":"nemáš",
    "musíme":"musíš","musime":"musíš","nemusíme":"nemusíš","nemusime":"nemusíš",
    "chceme":"chceš","nechceme":"nechceš","budeme":"budeš","nebudeme":"nebudeš",
    "potrebujeme":"potrebuješ","nepotrebujeme":"nepotrebuješ","vidíme":"vidíš","vidime":"vidíš",
    "uvidíme":"uvidíš","zistíme":"zistíš","poznáme":"poznáš","cítime":"cítiš","citime":"cítiš",
    "riskujeme":"riskuješ","dosiahneme":"dosiahneš","docielime":"docieliš","docielíme":"docieliš",
    # -ieme
    "pečieme":"peč","opečieme":"opeč","upečieme":"upeč","dopečieme":"dopeč","zapečieme":"zapeč",
    "pecieme":"peč","opecieme":"opeč","vypečieme":"vypeč","prepečieme":"prepeč",
    "vyberieme":"vyber","oberieme":"ober","odoberieme":"odober","zoberieme":"zober",
    "preberieme":"prever","rozoberieme":"rozober","poberieme":"pober","naberieme":"naber",
    "potrieme":"potri","natrieme":"natri","rozotrieme":"rozotri","vytrieme":"vytri",
    "utrieme":"utri","pretrieme":"pretri","zotrieme":"zotri","rozprestrieme":"rozprestri",
    "uzavrieme":"uzavri","zavrieme":"zavri","otvrieme":"otvor",
    "pomelieme":"pomeľ","zomelieme":"zomeľ","umelieme":"umeľ","melieme":"meľ",
    "vystelieme":"vystel","postelieme":"postel",
    "kladieme":"klaď","pokladieme":"poklaď","ukladieme":"ulož","prekladieme":"prelož",
    "uvedieme":"uveď","privedieme":"priveď","dovedieme":"doveď",
    "zapletieme":"zapleť","prehnetieme":"prehneť","upletieme":"upleť",
    "prenesieme":"prenes","nanesieme":"nanes","donesieme":"dones","vynesieme":"vynes",
    "zvinieme":"zviň","presunieme":"presuň","posunieme":"posuň","zavinieme":"zaviň",
    "vezmeme":"vezmi","zjeme":"zjedz","jeme":"jedz","prejdeme":"prejdi","nájdeme":"nájdeš",
    "najdeme":"nájdeš","dostaneme":"dostaneš","získame":"získaš","ziskame":"získaš",
    # -níme (plniť)
    "plníme":"plň","naplníme":"naplň","doplníme":"doplň","vyplníme":"vyplň","naplnime":"naplň",
    "doplnime":"doplň","plnime":"plň",
    # pust-
    "rozpustíme":"rozpusť","pustíme":"pusť","vypustíme":"vypusť","spustíme":"spusť",
    "rozpustime":"rozpusť","pripustíme":"pripusť",
    # bez diakritiky (import z Varechy)
    "vlozime":"vlož","ulozime":"ulož","odlozime":"odlož","polozime":"polož","zlozime":"zlož",
    "prilozime":"prilož","oprazime":"opraž","uprazime":"upraž","osmazime":"osmaž",
    "usmazime":"usmaž","smazime":"smaž","opeciem":"opeč","pridavame":"pridávaj",
    "podavame":"podávaj","pokrajame":"pokrájaj","nakrajame":"nakrájaj","varime":"var",
    "uvarime":"uvar","povarime":"povar","dusime":"dus","udusime":"udus","osolime":"osoľ",
    "posolime":"posoľ","okorenime":"okoreň","dochutime":"dochuť","urobime":"urob",
    "spravime":"sprav","pripravime":"priprav","rozdelime":"rozdeľ","odstavime":"odstav",
    "namocime":"namoč","naplnime":"naplň","premiesime":"premies","vymiesime":"vymies",
    "zamiesime":"zames","miesime":"mies","zmiesame":"zmiešaj","premiesame":"premiešaj",
    "miesame":"miešaj","nechame":"nechaj","dame":"daj","pridame":"pridaj","mozeme":"môžeš",
    "opekame":"opekaj","zapekame":"zapekaj","poopekame":"poopekaj","narezeme":"narež",
    "osupeme":"ošúp","pecieme":"peč","umyjeme":"umyj",
    # preklepy v zdroji
    "polložíme":"polož","opražime":"opraž",
    # ostatné nepravidelné
    "zapneme":"zapni","vypneme":"vypni","zahneme":"zahni","prehneme":"prehni",
    "ohneme":"ohni","stiahneme":"stiahni","vytiahneme":"vytiahni","roztiahneme":"roztiahni",
    "natiahneme":"natiahni","pritiahneme":"pritiahni","osmahneme":"osmahni","šupneme":"šupni",
    "začneme":"začni","zacneme":"začni","prepláchneme":"prepláchni","opláchneme":"opláchni",
    "prepachneme":"prepláchni","opachneme":"opláchni","vyfúkneme":"vyfúkni",
    "cvakneme":"cvakni","ťukneme":"ťukni","švihneme":"švihni","siahneme":"siahni",
    "zdvihneme":"zdvihni","dvihneme":"dvihni","zhasneme":"zhasni","posunieme":"posuň",
    "zmiernime":"zmierni","zmierníme":"zmierni",
    "snažíme":"snaž","usilujeme":"usiluj",
    # krátke tvary (pod dĺžkovým prahom)
    "dáme":"daj","dame":"daj","jeme":"jedz","zjeme":"zjedz","lejeme":"lej",
    # doplnené po prvom behu
    "potrasieme":"potras","pretrasieme":"pretras","nakladieme":"naklaď",
    "spletieme":"spleť","prepletieme":"prepleť","hnetieme":"hneť","votrieme":"votri",
    "zasunieme":"zasuň","odsunieme":"odsuň","vsunieme":"vsuň","navinieme":"naviň",
    "zvynieme":"zviň","zahrnieme":"zahrň","prehrnieme":"prehrň","uberieme":"uber",
    "natieme":"natri","nepečieme":"nepeč","predpečieme":"predpeč","upecieme":"upeč",
    "dopecieme":"dopeč","pozrieme":"pozri","posypme":"posyp","rátajme":"rátaj",
    "premiesyme":"premies",
    "neprežeňme":"neprežeň","opešieme":"opeč","prestrieme":"prestri","naplánujme":"naplánuj",
    "trasieme":"tras","zatrasieme":"zatras","otrasieme":"otras","berieme":"ber",
    "zapecieme":"zapeč","popečieme":"popeč","zachovajme":"zachovaj","otočome":"otoč",
    "nepodceňme":"nepodceň","uhnetieme":"uhneť","roztrieme":"roztri","oprieme":"opri",
    "kúpme":"kúp","potrebujme":"potrebuj","pletieme":"pleť","vykonajme":"vykonaj",
    "neminieme":"neminieš","minieme":"minieš","nevieme":"nevieš","vieme":"vieš",
    "nesmieme":"nesmieš","smieme":"smieš",
}

SHORT = {"á":"a","é":"e","í":"i","ý":"y","ú":"u","ó":"o","ô":"o"}
MAKKE = {"d":"ď","t":"ť","n":"ň","l":"ľ"}
SAMOHL = set("aáäeéiíoóôuúyýrl")   # r, l ako slabikotvorné

def imper(w):
    if w in OVERRIDE: return OVERRIDE[w]
    if w in NEMEN: return None
    if len(w) < 5: return None
    if w.endswith("ujeme"): return w[:-4] + "j"          # rozmixujeme → rozmixuj
    if w.endswith("ávame"): return w[:-2] + "j"          # podávame → podávaj
    if w.endswith("ame") or w.endswith("áme"):
        return w[:-3] + "aj"                              # pridáme → pridaj
    if w.endswith("neme"): return w[:-3] + "i"            # prepláchneme → prepláchni
    if w.endswith("ieme"): return None                    # nepravidelné, len cez OVERRIDE
    if w.endswith("íme") or w.endswith("ime"):
        st = w[:-3]
        if len(st) >= 2 and st[-1] not in SAMOHL and st[-2] not in SAMOHL:
            return st + "i"                               # očistíme → očisti
        if st[-1] in MAKKE: return st[:-1] + MAKKE[st[-1]]  # osolíme → osoľ
        return st                                         # varíme → var
    if w.endswith("eme"): return w[:-3]                   # posypeme → posyp
    return None

def zachovaj_velkost(orig, novy):
    if orig[:1].isupper(): return novy[:1].upper() + novy[1:]
    return novy

TOKEN = re.compile(r"\b[^\W\d_]+me\b", re.UNICODE)

# vo vedľajšej vete („…, ktoré rozmiešame…", „kým pripravíme…") nejde o výzvu,
# ale o oznámenie — tam patrí 2. os. j. č. oznamovacieho spôsobu (-me → -š).
# („ako", „až", „zatiaľ" tu zámerne nie sú — bývajú príslovky: „Ako prvé pridáme…")
PODRAD = re.compile(r"\b(ktor\w+|čo|keď|kým|ak|aby|pokiaľ|či|lebo|pretože|"
                    r"keby|akonáhle|že)\b", re.IGNORECASE | re.UNICODE)

def je_vedlajsia(text, poz):
    """Je token na pozícii `poz` vo vedľajšej vete? Hranicou je najbližšia , ; : . ! ?"""
    zac = max([text.rfind(c, 0, poz) for c in ",;:.!?"] + [-1]) + 1
    return bool(PODRAD.search(text[zac:poz]))

def oznam(w):
    """1. os. mn. č. → 2. os. j. č. oznamovacieho spôsobu (pridáme → pridáš)"""
    if w in NEMEN or len(w) < 4: return None
    return w[:-2] + "š"

def preloz_krok(t):
    """vráti (novy_text, nepreloz_tvary)"""
    chyba = []
    def rep(m):
        w = m.group(0)
        low = w.lower()
        if low in NEMEN: return w
        n = oznam(low) if je_vedlajsia(t, m.start()) else imper(low)
        if n is None:
            chyba.append(low); return w
        return zachovaj_velkost(w, n)
    out = TOKEN.sub(rep, t)
    return out, chyba

def main():
    dry = "--dry" in sys.argv
    zmenene = preskocene = 0
    nepokryte = {}
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        raw = open(f, encoding="utf-8").read()
        d = json.loads(raw)
        novy, chyby = [], []
        for k in d["postup"]:
            n, ch = preloz_krok(unicodedata.normalize("NFC", k))
            novy.append(n); chyby += ch
        if chyby:
            preskocene += 1
            for c in chyby: nepokryte[c] = nepokryte.get(c, 0) + 1
            continue
        if novy != d["postup"]:
            d["postup"] = novy
            zmenene += 1
            if not dry:
                with open(f, "w", encoding="utf-8") as fh:
                    json.dump(d, fh, ensure_ascii=False, indent=1)
                    fh.write("\n")
    print("prevedených receptov:", zmenene)
    print("preskočených (neznámy tvar):", preskocene)
    print("najčastejšie nepokryté tvary:")
    for w, n in sorted(nepokryte.items(), key=lambda x: -x[1])[:40]:
        print("  %-22s %d" % (w, n))

if __name__ == "__main__":
    main()
