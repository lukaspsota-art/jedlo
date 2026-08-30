# -*- coding: utf-8 -*-
"""B8 — opravy, ktoré našiel `node scripts/audit_potraviny.js` (konzistencia databázy).

  python3 scripts/oprav_potraviny_b8.py

Rieši: nedosiahnuteľné (prekryté) kľúče, chybnú energetickú bilanciu, chýbajúce alergény,
chýbajúcu vlákninu a nezmyselnú hustotu. Idempotentné.
"""
import json, os, sys

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CESTA = os.path.join(KOREN, "data", "potraviny.json")

# ── kľúče, ktoré NIKDY nevyhrajú (dlhší kľúč s rovnakým kmeňom ich vždy prebije) ──
# „čokoláda" (8) aj „čokolád" (7) majú rovnaký kmeň ako „čokoládov" (9) → mŕtve dáta.
VYMAZ = ["čokolád", "čokoláda", "kakao", "tortill", "droždi", "šalvi", "vanilka"]

# ── premenovania (kolízia kmeňov) ────────────────────────────────────────────────
# „mušl" (mušle) vs. „müsli": kmeň oboch je „musl", vyhrával dlhší „müsli" — 3× „Mušle"
# dostávalo 380 kcal cereálií. Müsli sa v receptoch ako surovina nevyskytuje.
PREMENUJ = {"mušl": "mušle", "müsli": "müsli zmes"}

# ── opravy hodnôt ───────────────────────────────────────────────────────────────
ZMENY = {
    # kakaový prášok má 228 kcal a 33 g vlákniny; 456 kcal je hodnota bližšia kakaovému maslu.
    # Dotýka sa 77 výskytov („Kakao", „Holandské kakao", „Kakaový prášok").
    "kakaov": {"kcal": 228, "bielkoviny": 19.6, "tuky": 13.7, "sacharidy": 58, "vlaknina": 33, "sodik": 21},
    "rozmarín": {"hustota": 0.35},          # 0.2 g/ml je mimo rozsahu, ktorý appka pripúšťa
    "worcester": {"alergeny": ["ryby"]},
    "hummus": {"alergeny": ["sezam"]},
    "sezamový olej": {"alergeny": ["sezam"]},
    "krúpy": {"alergeny": ["lepok"]},        # jačmeň obsahuje lepok
    "mandľová aróma": {"alergeny": ["orechy"]},
    "orech": {"alergeny": ["orechy"]},
    "kešu orechy": {"alergeny": ["orechy"]},
    "orechy kešu": {"alergeny": ["orechy"]},
    "omáčka sójová": {"alergeny": ["sója", "lepok"]},
    "sójová svetlá omáčka": {"alergeny": ["sója", "lepok"]},
    "sójová sladká omáčka": {"alergeny": ["sója", "lepok"]},
    "sójová hubová omáčka": {"alergeny": ["sója", "lepok"]},
    "teriyaki": {"alergeny": ["sója", "lepok"]},
    "hoisin sauce": {"alergeny": ["sója", "lepok"]},
    "oyster sauce": {"alergeny": ["mäkkýše"]},
    "fish sauce": {"alergeny": ["ryby"]},
    "worchester": {"alergeny": ["ryby"]},
    "worcestrov": {"alergeny": ["ryby"]},
    "worchestrov": {"alergeny": ["ryby"]},
    "worcestrersk": {"alergeny": ["ryby"]},
    "sardel": {"alergeny": ["ryby"]},
    # čerstvé droždie má 105 kcal, sušené 325 — kľúč „droždie" pokrýval oboje
    "kvások": {"vlaknina": 3},
    # „Sóda" je v receptoch 8× nápoj (sódová voda) a 30× jedlá sóda. Kľúč „sóda" preto ostáva
    # nápojom (25 mg Na/100 ml); bikarbónu dostali vlastné, dlhšie kľúče v OPRAVY (B6).
    "sóda": {"sodik": 25, "oddelenie": "Nápoje"},
    # energia z etikety nesedela s makrami (takmer čistá vláknina / prakticky nulová energia)
    "xantan": {"kcal": 160},
    "matcha": {"kcal": 230},
}

# ── chýbajúca vláknina (K9) — korenie, omáčky a pasty, ktoré ju reálne majú ──────
VLAKNINA = {
    "garam masala": 25, "gochujang": 4, "doubanjiang": 5, "hoisin omáčka": 2.8,
    "karí listy": 6, "kaffir listy": 6, "badián": 14.6, "fenikel": 3.1, "šafran": 3.9,
    "senovka": 25, "s'-čchuanské korenie": 25, "kajenské korenie": 27, "cibuľový prášok": 15,
    "cesnakový prášok": 9, "oreo sušienky": 3, "massaman kari pasta": 4, "kokosová smotana": 2.2,
    "koktejlová višňa": 1, "ligurček": 6, "sečuánske korenie": 25, "bylinkový zväzok": 3,
    "kešu maslo": 3.3, "nutella": 5.4, "matcha": 38, "kimchi": 2.4, "miso pasta": 5.4,
    "fazuľová pasta": 6, "tzatziki": 0.6, "vegeta": 2, "bujón": 1, "granátová": 0.2,
    "pomarančový džús": 0.2, "gelfix": 20, "karí listy": 6, "mirin": 0.2,
    "ustricová omáčka": 0.3, "tonkatsu omáčka": 1, "sladkokyslá zmes": 0.5,
    "kondenzované mlieko": 0, "husacia masť": 0,
}

# ── vláknina korenín bola paušálnych 10 g; skutočné hodnoty (USDA) opravujú aj K1 ────
VLAKNINA_OPRAVA = {
    "škorica": 53, "mletá škorica": 53, "klinčeky": 34, "klinček": 34, "cayenne": 27,
    "kajenské korenie": 27, "sladká paprika": 21, "mletá paprika": 21, "údená paprika": 21,
    "pálivá paprika": 21, "chilli mleté": 28, "mleté chilli": 28, "chilli suš": 28,
    "chilli vločky": 28, "čili vločky": 28, "chilli prášok": 28, "mleté čili": 28,
    "oregano": 43, "tymian": 37, "majorán": 40, "majoránk": 40, "bobkový list": 26,
    "rozmarín": 14, "šalvia": 40, "kmín": 11, "rasca": 11, "mleté rasca": 11,
    "rasca rímska": 10.5, "rímska rasca": 10.5, "koriandrové semien": 42, "horčicové semienka": 12,
}

# ── g_za_ks tam, kde recepty píšu „1 ks" a hmotnosť sa nedala dopočítať ──────────
# Bez g_za_ks vráti `gramy()` nulu → surovina nemá ani kalórie, ani cenu (riadky „bez ceny"
# v nákupe). POZOR: recepty majú `kcal_na_porciu` dopočítané zo STARÝCH dát a appka mu verí —
# pridanie veľkej hmotnosti („1 ks tekvica" = 1,2 kg) preto NEzvýši kcal, ale ZRIEDI makrá.
# Preto sa dopĺňajú len malé, jednoznačné balenia (vrecko, kocka, plátok) do ~50 g.
G_ZA_KS = {
    "prášok do pečiva": 12, "kypriaci prášok": 12, "kypriac": 12, "bujón": 10,
    "vanilkový puding": 37, "puding": 37, "želatín": 10, "zlatý klas": 40,
    "krémový prášok": 40, "tortill": 40, "tortilla": 40,
}

# ── chýbajúce balenia (B5 „balenia" režim ceny) ─────────────────────────────────
BALENIA = {
    "droždie": (42, "42 g"), "smotana": (200, "200 ml"), "kyslá smotana": (200, "200 ml"),
    "cesnak": (150, "150 g"), "cibuľa": (1000, "1 kg"), "mrkva": (1000, "1 kg"),
    "zemiak": (2500, "2,5 kg"), "paradajk": (500, "500 g"), "paprik": (500, "500 g"),
    "uhorka": (400, "400 g"), "citrón": (500, "500 g"), "limetk": (250, "250 g"),
    "banán": (1000, "1 kg"), "jablk": (1000, "1 kg"), "šampiňóny": (400, "400 g"),
    "špenát": (300, "300 g"), "brokolica": (500, "500 g"), "karfiol": (700, "700 g"),
    "kapusta": (1000, "1 kg"), "kel": (700, "700 g"), "pór": (400, "400 g"),
    "zeler": (500, "500 g"), "petržlen": (250, "250 g"), "cvikl": (500, "500 g"),
    "šalát": (200, "200 g"), "rukol": (100, "100 g"), "avokádo": (200, "200 g"),
    "hrášok": (400, "400 g"), "kukurica": (340, "340 g"), "šošovic": (500, "500 g"),
    "cícer": (400, "400 g"), "fazuľa": (400, "400 g"), "krúpy": (500, "500 g"),
    "bulgur": (500, "500 g"), "kuskus": (500, "500 g"), "quinoa": (500, "500 g"),
    "pohanka": (500, "500 g"), "polenta": (500, "500 g"), "krupica": (1000, "1 kg"),
    "strúhanka": (500, "500 g"), "sirup": (250, "250 ml"), "med": (500, "500 g"),
    "horčica": (200, "200 g"), "kečup": (500, "500 g"), "majonéza": (400, "400 g"),
    "ocot": (500, "500 ml"), "sójová omáčka": (250, "250 ml"), "vývar": (1000, "1 l"),
    "bujón": (66, "6 kociek"), "rasca": (25, "25 g"), "škorica": (25, "25 g"),
    "oregano": (10, "10 g"), "tymian": (10, "10 g"), "majorán": (10, "10 g"),
    "bobkový list": (10, "10 g"), "mletá paprika": (50, "50 g"), "korenie": (25, "25 g"),
    "soľ": (1000, "1 kg"), "kokosové mlieko": (400, "400 ml"), "tofu": (200, "200 g"),
    "šunka": (100, "100 g"), "slanin": (200, "200 g"), "klobás": (300, "300 g"),
    "vlašské orechy": (200, "200 g"), "mandle": (200, "200 g"), "kešu": (200, "200 g"),
    "arašid": (200, "200 g"), "sezam": (100, "100 g"), "mak": (200, "200 g"),
    "ovsené vloč": (500, "500 g"), "hrozien": (200, "200 g"), "kokos": (200, "200 g"),
    "tvaroh": (250, "250 g"), "bryndza": (250, "250 g"), "jogurt": (400, "400 g"),
    "grécky jogurt": (400, "400 g"), "smotanový syr": (150, "150 g"), "žemľa": (300, "6 ks"),
    "rožok": (270, "6 ks"), "rožky": (270, "6 ks"), "rohlík": (270, "6 ks"),
    "chlieb": (500, "500 g"), "tortilla": (320, "8 ks"), "ryža": (1000, "1 kg"),
    "kvasnice": (100, "100 g"), "želatín": (20, "20 g"), "škrob": (200, "200 g"),
    "kakaov": (100, "100 g"), "vanilkový cukor": (8, "8 g"), "prášok do pečiva": (12, "12 g"),
    "kypriaci prášok": (12, "12 g"), "kypriac": (12, "12 g"), "sóda": (100, "100 g"),
}

def main():
    with open(CESTA, encoding="utf-8") as f:
        pot = json.load(f)
    idx = {p["kluc"]: p for p in pot}

    n_vymaz = 0
    for k in VYMAZ:
        if k in idx:
            pot.remove(idx.pop(k)); n_vymaz += 1

    n_prem = 0
    for stary, novy in PREMENUJ.items():
        p = idx.get(stary)
        if p and novy not in idx:
            idx.pop(stary); p["kluc"] = novy; idx[novy] = p; n_prem += 1

    n_zmen = 0
    for k, patch in ZMENY.items():
        p = idx.get(k)
        if not p:
            print("  ! ZMENY: chýba kľúč '%s'" % k); continue
        for pole, hodnota in patch.items():
            if p.get(pole) != hodnota:
                p[pole] = hodnota; n_zmen += 1

    n_vl = 0
    for k, v in VLAKNINA.items():
        p = idx.get(k)
        if p and not p.get("vlaknina"):
            p["vlaknina"] = v; n_vl += 1

    for k, v in VLAKNINA_OPRAVA.items():
        p = idx.get(k)
        if p and p.get("vlaknina") != v:
            p["vlaknina"] = v; n_vl += 1

    n_ks = 0
    for k, v in G_ZA_KS.items():
        p = idx.get(k)
        if p and p.get("g_za_ks") is None:
            p["g_za_ks"] = v; n_ks += 1

    n_bal = 0
    for k, (g, popis) in BALENIA.items():
        p = idx.get(k)
        if p and p.get("balenie_g") is None:
            p["balenie_g"] = g; p["balenie_popis"] = popis; n_bal += 1

    with open(CESTA, "w", encoding="utf-8", newline="\r\n") as f:
        json.dump(pot, f, ensure_ascii=False, indent=1); f.write("\n")
    print("B8: -%d mŕtvych kľúčov, %d premenovaní, %d opravených polí, +%d vláknin, +%d g_za_ks, +%d balení  (%d záznamov)"
          % (n_vymaz, n_prem, n_zmen, n_vl, n_ks, n_bal, len(pot)))

if __name__ == "__main__":
    main()
