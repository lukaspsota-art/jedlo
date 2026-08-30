# -*- coding: utf-8 -*-
"""B6 — oprava CHYBNÝCH párovaní a doplnenie pokrytia v data/potraviny.json.

Skript je idempotentný: kľúč, ktorý už existuje, sa NEPREPÍŠE novou hodnotou
(okrem explicitných opráv v ZMENY), takže sa dá spustiť opakovane.

  python3 scripts/doplnit_potraviny_b6.py [--dry]

Pozadie: `najdiPotravinu` vyberá NAJDLHŠÍ kľúč, ktorý sadne na súvislú postupnosť slov
názvu. Preto sa spracovaná surovina opraví tak, že sa pridá DLHŠÍ, presnejší kľúč
(„olej olivový" 12 znakov porazí „olivy" 5), nie tak, že sa mení matchovací algoritmus.
"""
import json, os, sys

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(KOREN, "data", "potraviny.json")

def P(kluc, odd, kcal, b, t, s, cena, vl=0, na=0, alerg=None, hustota=1, meso=False,
      ks=None, platok=None, bal=None, balp=None):
    z = {"kluc": kluc, "oddelenie": odd, "alergeny": alerg or [], "kcal": kcal,
         "bielkoviny": b, "tuky": t, "sacharidy": s, "g_za_ks": ks, "hustota": hustota,
         "meso": meso, "cena100": cena, "vlaknina": vl, "sodik": na}
    if bal is not None:
        z["balenie_g"] = bal; z["balenie_popis"] = balp or (str(bal) + " g")
    if platok is not None:
        z["g_za_platok"] = platok
    return z

ZEL = "Zelenina a ovocie"; MAS = "Mäso a ryby"; MLI = "Mliečne a vajcia"
PEC = "Pečivo"; CES = "Cestoviny a ryža"; TRV = "Trvanlivé a konzervy"
OMA = "Omáčky a dochucovadlá"; OLE = "Oleje a tuky"; ORE = "Orechy a semená"
SLA = "Pečenie a sladké"; KOR = "Korenie a bylinky"; NAP = "Nápoje"; ALK = "Alkohol"
MRA = "Mrazené"; CHL = "Chladené"; OST = "Ostatné"

# ── 1) OPRAVY existujúcich záznamov ─────────────────────────────────────────────
# kľúč -> {pole: nová hodnota}   (dôvod je v komentári)
ZMENY = {
    # „celozrn" chytal 80 výskytov MÚKY (Celozrnná špaldová múka 48×) a dával im hodnoty
    # celozrnného PEČIVA — 245 kcal a 450 mg sodíka na 100 g múky. Záznam je preto múka;
    # pečivo má vlastné kľúče („celozrnný chlieb", „celozrnné pečivo").
    "celozrn": {"oddelenie": SLA, "kcal": 340, "bielkoviny": 13, "tuky": 2.5, "sacharidy": 65,
                "vlaknina": 10.7, "sodik": 5, "cena100": 0.35, "g_za_ks": None,
                "balenie_g": 1000, "balenie_popis": "1 kg"},
    # „fazuľov" má kmeň „fazul", takže prebíjal „fazuľa" a všetkým fazuliam dával 30 kcal
    # zelených strukov. Kľúč sa zužuje na „fazuľka"; struky majú vlastné kľúče nižšie.
    "fazuľov": {"kluc": "fazuľka"},
    # 335 kcal a 30 g vlákniny je KANDIZOVANÁ kôra; recepty myslia čerstvo nastrúhanú.
    "citrónová kôra": {"kcal": 47, "bielkoviny": 1.5, "tuky": 0.3, "sacharidy": 16, "vlaknina": 10.6, "sodik": 6},
    # kypriace prostriedky sú sodíkové soli — 25 mg/100 g bolo o tri rády vedľa
    "kypriac": {"sodik": 10000},
    "kypriaci prášok": {"sodik": 10000},
    "prášok do pečiva": {"sodik": 10000},
}

# ── 2) OPRAVA CHYBNÝCH PÁROVANÍ — presnejšie (dlhšie) kľúče ─────────────────────
OPRAVY = [
    # mäso: konkrétny diel vs. generický kľúč zvieraťa
    P("prsia kuracie", MAS, 165, 31, 3.6, 0, 0.9, meso=True, ks=180, bal=500, balp="500 g"),
    P("stehno kuracie", MAS, 209, 18, 15, 0, 0.6, na=80, meso=True, ks=130),
    P("mäso kuracie", MAS, 190, 24, 10, 0, 0.7, na=70, meso=True),
    P("hydinové prsia", MAS, 165, 31, 3.6, 0, 0.9, meso=True, ks=180),
    P("pečeň kuracia", MAS, 119, 17, 5, 1, 0.5, na=71, meso=True, bal=400, balp="400 g"),
    P("hydinová pečeň", MAS, 119, 17, 5, 1, 0.5, na=71, meso=True),
    P("bravčová pečeň", MAS, 134, 21, 3.6, 2.5, 0.4, na=87, meso=True),
    P("pečeň bravčová", MAS, 134, 21, 3.6, 2.5, 0.4, na=87, meso=True),
    P("bravčová panenka", MAS, 143, 21, 6, 0, 1.2, na=55, meso=True, ks=400),
    P("bravčové stehno", MAS, 145, 21, 7, 0, 0.7, na=55, meso=True),
    P("bravčové pliecko", MAS, 210, 17, 16, 0, 0.7, na=60, meso=True),
    P("bravčové karé", MAS, 190, 20, 12, 0, 0.8, na=55, meso=True),
    P("karé bravčové", MAS, 190, 20, 12, 0, 0.8, na=55, meso=True),
    P("stehno hovädzie", MAS, 130, 21, 5, 0, 1.1, na=55, meso=True),
    P("hovädzia roštenka", MAS, 190, 21, 12, 0, 1.4, na=55, meso=True),
    # vývar vs. mäso — „Hovädzí vývar" mal 250 kcal namiesto 4
    P("hovädzí vývar", OST, 4, 0.5, 0.1, 0.3, 0.15, na=350, ks=10),
    P("vývar hovädzí", OST, 4, 0.5, 0.1, 0.3, 0.15, na=350, ks=10),
    # masť vs. mäso — „Bravčová masť" (49×) mala 242 kcal namiesto 900
    P("bravčová masť", OLE, 900, 0, 100, 0, 0.35, bal=500, balp="500 g"),
    P("masť bravčová", OLE, 900, 0, 100, 0, 0.35, bal=500, balp="500 g"),
    # olej vs. plod/semeno — „Olej olivový extra virgin" (18×) mal 145 kcal olív namiesto 884
    P("olej olivový", OLE, 884, 0, 100, 0, 0.7, na=1, hustota=0.91, bal=920, balp="1 l"),
    P("olivový panenský olej", OLE, 884, 0, 100, 0, 0.7, na=1, hustota=0.91, bal=920, balp="1 l"),
    P("olivový kvalitný olej", OLE, 884, 0, 100, 0, 0.7, na=1, hustota=0.91, bal=920, balp="1 l"),
    P("sezamový olej", OLE, 884, 0, 100, 0, 2.5, hustota=0.92, bal=250, balp="250 ml"),
    P("arašidový olej", OLE, 884, 0, 100, 0, 1.2, hustota=0.92, bal=500, balp="500 ml"),
    P("tekvicový olej", OLE, 884, 0, 100, 0, 4, hustota=0.92, bal=250, balp="250 ml"),
    # škrob / múka vs. zrno
    P("kukuričný škrob", SLA, 381, 0.3, 0.1, 91, 0.35, vl=1, na=9, bal=200, balp="200 g"),
    P("kukuričná múka", SLA, 361, 7, 3.9, 77, 0.6, vl=7, na=5, bal=500, balp="500 g"),
    P("cícerová múka", SLA, 387, 22, 6.7, 58, 0.9, vl=10.8, na=64, bal=500, balp="500 g"),
    P("celozrnná ryža", CES, 360, 7.5, 2.7, 76, 0.3, vl=3.5, na=5, bal=1000, balp="1 kg"),
    P("celozrnný kuskus", CES, 368, 12, 1, 72, 0.5, vl=5, na=10, alerg=["lepok"], bal=500, balp="500 g"),
    P("celozrnné pečivo", PEC, 245, 9, 3, 43, 0.35, vl=6, na=450, alerg=["lepok"], ks=50),
    # šťava vs. celý plod — „Citrónová šťava" je 148× najčastejšia chybne párovaná surovina
    P("citrónová šťava", ZEL, 22, 0.35, 0.24, 6.9, 0.4, vl=0.3, na=1, hustota=1.02, bal=200, balp="200 ml"),
    P("šťava z citróna", ZEL, 22, 0.35, 0.24, 6.9, 0.4, vl=0.3, na=1, hustota=1.02),
    P("limetková šťava", ZEL, 25, 0.4, 0.1, 8.4, 0.8, vl=0.4, na=2, hustota=1.02),
    P("šťava z limetky", ZEL, 25, 0.4, 0.1, 8.4, 0.8, vl=0.4, na=2, hustota=1.02),
    P("pomarančová šťava", NAP, 45, 0.7, 0.2, 10.4, 0.25, vl=0.2, na=1, hustota=1.04, bal=1000, balp="1 l"),
    P("jablková šťava", NAP, 46, 0.1, 0.1, 11, 0.2, vl=0.2, na=4, hustota=1.04, bal=1000, balp="1 l"),
    # pesto / soľ / cukor / ocot pod cudzím kľúčom
    P("bazalkové pesto", OMA, 450, 5, 45, 6, 1.2, vl=2.5, na=1200, alerg=["mlieko", "orechy"], bal=190, balp="190 g"),
    P("bylinková soľ", KOR, 0, 0, 0, 0, 0.6, na=30000, bal=100, balp="100 g"),
    P("kokosový cukor", SLA, 375, 0, 0, 93, 1.5, na=30, bal=250, balp="250 g"),
    P("škoricový cukor", SLA, 390, 0.2, 0.1, 97, 0.5, na=0, bal=250, balp="250 g"),
    P("krupicový cukor", SLA, 400, 0, 0, 100, 0.12, bal=1000, balp="1 kg"),
    P("cukor krupica", SLA, 400, 0, 0, 100, 0.12, bal=1000, balp="1 kg"),
    P("krupica cukor", SLA, 400, 0, 0, 100, 0.12, bal=1000, balp="1 kg"),
    P("jablkový ocot", OMA, 22, 0, 0, 0.9, 0.25, na=5, hustota=1.01, bal=500, balp="500 ml"),
    # rímska rasca (kmín) padala na kľúč „rímsky" = rímsky šalát, 17 kcal
    P("rasca rímska", KOR, 375, 18, 22, 44, 2.5, vl=10.5, na=168, hustota=0.5),
    P("rímska rasca", KOR, 375, 18, 22, 44, 2.5, vl=10.5, na=168, hustota=0.5),
    # zelené fazuľové struky (kľúč „fazuľov" sa premenoval na „fazuľka")
    P("fazuľové struky", ZEL, 30, 2, 0.1, 5, 0.8, vl=2.6, na=8),
    P("zelená fazuľa", ZEL, 30, 2, 0.1, 5, 0.8, vl=2.6, na=8),
    P("fazuľové výhonky", ZEL, 30, 3, 0.2, 4, 0.9, vl=1.8, na=6),
    # kyslá kapusta má proti čerstvej 660 mg sodíka
    P("kyslá kapusta", ZEL, 19, 0.9, 0.1, 1.8, 0.25, vl=2.9, na=660, bal=500, balp="500 g"),
    P("kvasená kapusta", ZEL, 19, 0.9, 0.1, 1.8, 0.25, vl=2.9, na=660, bal=500, balp="500 g"),
    P("medvedí cesnak", ZEL, 35, 2.4, 0.3, 3, 2, vl=2.5, na=15),
    P("paradajky sušené", TRV, 258, 14, 3, 43, 2.2, vl=12, na=2100, bal=100, balp="100 g"),
    # jedlá sóda (bikarbóna) má 27 000 mg Na/100 g; kľúč „sóda" ostáva sódovej vode
    P("sóda bikarbóna", SLA, 0, 0, 0, 0, 0.1, na=27000, bal=100, balp="100 g"),
    P("jedlá sóda", SLA, 0, 0, 0, 0, 0.1, na=27000, bal=100, balp="100 g"),
]

def uloz(zoznam, dry=False):
    if dry:
        return
    # súbor je v repozitári s CRLF — zachovaj to, inak je diff celý súbor
    with open(CESTA, "w", encoding="utf-8", newline="\r\n") as f:
        json.dump(zoznam, f, ensure_ascii=False, indent=1)
        f.write("\n")

def main():
    dry = "--dry" in sys.argv
    with open(CESTA, encoding="utf-8") as f:
        pot = json.load(f)
    idx = {p["kluc"]: p for p in pot}

    zmenene = 0
    for kluc, patch in ZMENY.items():
        p = idx.get(kluc)
        if not p:
            print("  ! ZMENY: kľúč '%s' neexistuje" % kluc); continue
        for k, v in patch.items():
            if p.get(k) != v:
                p[k] = v; zmenene += 1
        if "kluc" in patch:
            idx.pop(kluc, None); idx[patch["kluc"]] = p

    try:
        from doplnit_potraviny_b7 import NOVE as NOVE7   # voliteľná druhá dávka
    except Exception:
        NOVE7 = []
    pridane = 0
    for z in OPRAVY + list(NOVE7):
        if z["kluc"] in idx:
            continue
        pot.append(z); idx[z["kluc"]] = z; pridane += 1

    uloz(pot, dry)
    print("potraviny.json: %d záznamov (+%d nových, %d opravených polí)%s"
          % (len(pot), pridane, zmenene, "  [DRY RUN]" if dry else ""))

if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
