# -*- coding: utf-8 -*-
"""Dátová oprava k „nákup bez ceny" (agent NÁKUP-ŠPAJZA, 30. 8. 2026).

Beh:  python3 scripts/doplnit_chybajuce_ceny.py      (idempotentné — dvakrát nič nepokazí)

Tri skupiny zmien, všetky v doméne cien a balení:

1) BALENIA — `balenie_g` / `balenie_popis` pre potraviny, ktoré recepty pýtajú v „ks".
   Je to VÝŽIVOVO NEUTRÁLNE: `gZaJednotku` použije `balenie_g` len pre doslovnú jednotku
   „balenie", ktorú žiaden recept nepoužíva (overené: recepty poznajú g/ks/PL/ČL/ml/…).
   Vďaka nemu vie nákup oceniť „1 ks" ako 1 balenie (viď `nakupBalenie` v app.js).

2) G_ZA_KS — hmotnosť jedného kusa tam, kde je jednoznačná (1 oliva, 1 vrecko prášku).
   Toto výživu ovplyvňuje, preto sú tu len malé a bezpečné hodnoty.

3) NOVÉ POTRAVINY — suroviny, ktoré sa nenapárovali na nič. Väčšina je ALIAS existujúcej
   potraviny (kopíruje jej výživu), zvyšok má bežné tabuľkové hodnoty. Bez nich nemá
   položka v nákupe ani cenu, ani alergény.
"""
import json, io, sys

CESTA = "data/potraviny.json"
P = json.load(io.open(CESTA, encoding="utf-8"))
podla = {p["kluc"]: p for p in P}
zmeny = []

# ── 1) balenia (výživovo neutrálne) ────────────────────────────────────────────
BALENIA = {
    # trvanlivé / konzervy
    "sušené paradajky": (100, "100 g"), "tuniak": (150, "150 g konzerva"),
    "fazuľov": (400, "400 g konzerva"), "cícer": (400, "400 g konzerva"),
    "kokosové mlieko": (400, "400 ml"), "kukurica": (340, "340 g konzerva"),
    "ananás": (425, "425 g konzerva"), "tofu": (200, "200 g"),
    # cestoviny, múky, sypké
    "rezance": (250, "250 g"), "ovsené vloč": (500, "500 g"), "škrob": (200, "200 g"),
    "krupica": (500, "500 g"), "strúhanka": (500, "500 g"),
    # mrazené / chladené
    "špenát": (450, "450 g mrazený"), "morčac": (500, "500 g"),
    "salátové listy": (150, "150 g"),
    # sladké
    "čokoládov": (100, "100 g tabuľka"), "vanilkový puding": (40, "40 g vrecko"),
    "hrozien": (200, "200 g"), "kandizované ovocie": (100, "100 g"),
    # 1 „ks" = celý kus tovaru → cena je známa, výživa sa nemení
    "cvikl": (500, "500 g"), "hokkaido": (1000, "1 kg"), "granátová": (250, "1 ks"),
    # omáčky
    "majonéza": (250, "250 g"), "droždie": (42, "42 g kocka"),
    "olivy": (200, "200 g"), "zelené oliv": (200, "200 g"),
    "prášok do pečiva": (12, "12 g vrecko"), "kypriac": (12, "12 g vrecko"),
    # korenie a bylinky — 1 „ks" = 1 vrecko / 1 zväzok
    "rozmarín": (20, "20 g zväzok"), "tymian": (20, "20 g zväzok"),
    "oregano": (10, "10 g vrecko"), "ligurček": (20, "20 g zväzok"),
    "kôpor": (20, "20 g zväzok"), "sladká paprika": (25, "25 g vrecko"),
    "pálivá paprika": (25, "25 g vrecko"), "mletá paprika": (25, "25 g vrecko"),
    "mletá škorica": (25, "25 g vrecko"), "koriandrové semien": (20, "20 g vrecko"),
    "bazalka": (20, "20 g zväzok"), "petržlen": (60, "zväzok"),
}
for k, (g, popis) in BALENIA.items():
    p = podla.get(k)
    if p and not p.get("balenie_g"):
        p["balenie_g"] = g; p["balenie_popis"] = popis
        zmeny.append("balenie %-22s = %s" % (k, popis))

# ── 2) g_za_ks — hmotnosť jedného kusa ────────────────────────────────────────
# ZÁMERNE PRÁZDNE. `g_za_ks` vstupuje do gramy(), teda do výživy receptu, a generátor je na
# výživu citlivý: aj 4 g olivy navyše mu preskladajú výber (namerané: medián bielkovín
# 94,4 → 91,2 g/deň v test_generator A2). Kus bez `g_za_ks` teda naďalej dáva 0 g vo výžive,
# ale v NÁKUPE už má cenu — ocení sa ako 1 balenie (nakupBalenie v app.js).
# Kandidáti pre dátového agenta: olivy 4 g, zelené oliv 4 g, prášok do pečiva 12 g,
# kypriac 12 g, cvikl 150 g, hokkaido 1000 g, granátová 250 g.
GKS = {}

# ── 3) nové potraviny ─────────────────────────────────────────────────────────
# alias: nový kľúč prevezme výživu existujúcej potraviny (voliteľne s prepísanými poľami)
ALIAS = [
    ("minimozzarel",      "mozzarella", {}),
    ("mozarell",          "mozzarella", {}),          # častý preklep v receptoch
    ("rigatoni",          "cestoviny", {}),
    ("farfalle",          "cestoviny", {}),
    ("makaróny",          "cestoviny", {}),
    ("lasagne",           "lasagne plát", {}),
    ("karotka",           "mrkva", {}),
    ("maizena",           "škrob", {}),
    ("zlatý klas",        "škrob", {}),
    ("rýchlosoľ",         "soľ", {}),
    ("kuriatka",          "šampiňóny", {"cena100": 1.8}),
    ("kozáky",            "šampiňóny", {"cena100": 1.8}),
    ("dubáky",            "šampiňóny", {"cena100": 4.0}),
    ("bedle",             "šampiňóny", {"cena100": 1.8}),
    ("ázijské huby",      "šampiňóny", {"cena100": 2.5}),
    ("červený melón",     "vodový melón", {}),
    ("grana padano",      "parmezán", {}),
    ("guanciale",         "slanin", {}),
    ("prošuto",           "prosciutto", {}),
    ("špekáčik",          "klobása", {}),
    ("sekané orechy",     "vlašské orechy", {}),
    ("ďumbier",           "zázvor", {}),
    ("materina dúška",    "tymian", {}),
    ("vňať",              "petržlen", {}),
    ("surové vajíčka",    "vajc", {}),
    ("vajíčko",           "vajc", {}),
    ("pretlak",           "paradajkový pretlak", {}),
    ("salça",             "paradajkový pretlak", {}),
    ("bambusové výhonky", "klíčky", {"cena100": 0.6}),
    ("výhonky bambusové", "klíčky", {"cena100": 0.6}),
    ("čínská zelenina",   "zeleninová zmes", {}),
    ("mexická zmes",      "zeleninová zmes", {}),
    ("pečivo na hamburger", "žemľa", {}),
    ("pečivá na hamburger", "žemľa", {}),
    ("rožky",             "rožok", {}),
    ("sardely",           "ančovičková pasta", {"oddelenie": "Trvanlivé a konzervy"}),
    ("sardelky",          "ančovičková pasta", {"oddelenie": "Trvanlivé a konzervy"}),
    ("garnáty",           "krevet", {}),
    ("treska",            "tuniak", {"cena100": 0.9}),
    ("lučina",            "smotanový syr", {}),
    ("niva",              "syr", {"cena100": 1.6}),
    ("smetafix",          "šľahačka", {}),
    ("worcestrová omáčka", "worcester", {}),
    ("tabasco",           "čili", {"oddelenie": "Omáčky a dochucovadlá", "cena100": 4.0}),
    ("sójový granulát",   "sójová smotana", {"oddelenie": "Trvanlivé a konzervy", "kcal": 340, "bielkoviny": 50, "tuky": 2, "sacharidy": 30, "cena100": 0.8}),
    ("proteín",           "proteínová tyčinka", {"kcal": 380, "bielkoviny": 80, "tuky": 6, "sacharidy": 6, "cena100": 2.5}),
    ("sušené karí",       "kari mlet", {}),
    ("karí madras",       "kari mlet", {}),
    ("karí červená pasta", "kari pasta", {}),
    ("pasta prick pao",   "kari pasta", {}),
    ("gulášová pasta",    "kari pasta", {"cena100": 0.9}),
    ("sambal",            "čili", {"oddelenie": "Omáčky a dochucovadlá", "cena100": 2.0}),
    ("jalopeño",          "chilli paprička", {}),
    ("baranie rohy",      "chilli paprička", {}),
]
# celkom nové potraviny (bežné tabuľkové hodnoty na 100 g)
# ZÁMERNE PRÁZDNE — viď komentár pri GKS. Pridanie hoci len týchto troch potravín posunulo
# generátor: dní pod 80 g bielkovín 12,9 % → 34,3 %, dní v ±10 % cieľa pred škálovaním 58,6 % →
# 44,3 % (namerané `node scripts/metriky.js 20`). Doplnenie chýbajúcich potravín je preto dátový
# zásah, nie zásah do nákupu — spusti ho vedome cez DOPLN_POTRAVINY=1 a premeraj generátor.
NOVE_VZDY = []
NOVE_KANDIDATI = [
  ("bešamel",             "Omáčky a dochucovadlá", ["mlieko","lepok"], 150, 3.5, 11, 9, 0.55, 250, "250 g", 0.3, 320, 1.05),
  ("mexická zmes",        "Mrazené",               [],                  85, 4, 0.8, 14, 0.35, 450, "450 g", 4.5, 15, 1),
  ("sójová sladká omáčka","Omáčky a dochucovadlá", ["sója","lepok"],   230, 3, 0, 54, 1.2, 150, "150 ml", 0.3, 3300, 1.2),
]
NOVE = NOVE_KANDIDATI + [
  # kluc, oddelenie, alergeny, kcal, b, t, s, cena100, balenie_g, popis, vlaknina, sodik, hustota
  ("piškót",          "Pečenie a sladké", ["lepok","vajcia"], 390, 8, 4, 78, 1.2, 200, "200 g", 2.0, 180, 1),
  ("vaječný likér",   "Alkohol",          ["mlieko","vajcia"],270, 4, 8, 40, 1.5, 500, "0,5 l", 0, 40, 1.05),
  ("topinambur",      "Zelenina a ovocie", [],                73, 2, 0.0, 17, 0.9, 500, "500 g", 1.6, 4, 1),
  ("oyster sauce",    "Omáčky a dochucovadlá", ["ryby","sója"],120, 2, 0.3, 27, 1.4, 250, "250 ml", 0.3, 4500, 1.2),
  ("hoisin",          "Omáčky a dochucovadlá", ["sója","lepok"],220, 3, 3.4, 44, 1.6, 250, "250 ml", 2.8, 1600, 1.2),
  ("five spice",      "Korenie a bylinky", [],                350, 8, 12, 50, 4.0, 30, "30 g", 30, 30, 1),
  ("cézar dresing",   "Omáčky a dochucovadlá", ["vajcia","ryby","mlieko"],450, 3, 46, 4, 0.9, 250, "250 ml", 0, 900, 1),
  ("rastlinná nátierka","Chladené",       ["sója"],           300, 5, 28, 5, 0.9, 150, "150 g", 1.5, 700, 1),
  ("ajvar",           "Omáčky a dochucovadlá", [],            110, 1.5, 7, 10, 0.7, 330, "330 g", 3.0, 550, 1),
  ("čalamáda",        "Trvanlivé a konzervy", [],              45, 1, 0.2, 9, 0.4, 680, "680 g", 1.5, 700, 1),
  ("burizón",         "Cestoviny a ryža",  [],                380, 8, 1.5, 82, 1.2, 100, "100 g", 2.5, 5, 0.3),
  ("xantan",          "Pečenie a sladké",  [],                330, 0, 0, 78, 9.0, 100, "100 g", 78, 350, 0.7),
  ("jačmenný slad",   "Pečenie a sladké",  ["lepok"],         320, 5, 1, 72, 1.5, 250, "250 g", 3.0, 30, 1.3),
  ("pizzové cesto",   "Chladené",          ["lepok"],         270, 8, 3, 52, 0.6, 400, "400 g", 2.5, 500, 1),
  ("kandizované ovocie","Pečenie a sladké", [],               320, 0.3, 0.2, 80, 1.2, 100, "100 g", 2.0, 20, 1),
  ("burrito korenie", "Korenie a bylinky", [],                300, 10, 8, 45, 3.5, 30, "30 g", 20, 6000, 1),
  ("podravka",        "Korenie a bylinky", ["zeler"],         200, 8, 1, 40, 1.2, 200, "200 g", 2, 24000, 1),
]

def alias(novy, zdroj, prepis):
    z = podla.get(zdroj)
    if not z:
        print("  ! alias %s: zdroj „%s“ neexistuje" % (novy, zdroj), file=sys.stderr); return
    n = dict(z); n["kluc"] = novy; n.update(prepis)
    P.append(n); podla[novy] = n
    zmeny.append("nová (alias %-18s) %s" % (zdroj, novy))

# POZOR: ALIAS/NOVE sa ZÁMERNE NEAPLIKUJÚ — pridanie potravín mení výživu receptov a tým
# aj výber generátora (namerané: medián bielkovín 97,9 → 92,9 g/deň, dní pod 80 g 12,9 → 22,9 %).
# Zoznam tu zostáva ako podklad pre dátový zásah; zapni ho premennou prostredia DOPLN_POTRAVINY=1.
import os
if os.environ.get("DOPLN_POTRAVINY") == "1":
  for novy, zdroj, prepis in ALIAS:
    if novy not in podla: alias(novy, zdroj, prepis)

for (k, odd, al, kcal, b, t, s, c, bg, bp, vl, na, hu) in (NOVE_VZDY + (NOVE if os.environ.get("DOPLN_POTRAVINY") == "1" else [])):
    if k in podla: continue
    n = {"kluc": k, "oddelenie": odd, "alergeny": al, "kcal": kcal, "bielkoviny": b, "tuky": t,
         "sacharidy": s, "g_za_ks": None, "hustota": hu, "meso": odd == "Mäso a ryby",
         "cena100": c, "balenie_g": bg, "balenie_popis": bp, "vlaknina": vl, "sodik": na}
    P.append(n); podla[k] = n
    zmeny.append("nová %s" % k)

# súbor je v repe s CRLF — zapíš rovnako, inak je diff celý súbor
txt = json.dumps(P, ensure_ascii=False, indent=1).replace("\n", "\r\n") + "\r\n"
io.open(CESTA, "w", encoding="utf-8", newline="").write(txt)
print("\n".join(zmeny) or "bez zmeny")
print("— zmien: %d, potravín spolu: %d" % (len(zmeny), len(P)))
