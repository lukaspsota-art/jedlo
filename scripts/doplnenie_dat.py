#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doplnenie a zjednotenie metadát receptov: Unicode NFC, kuchyňa, kategória, čas, popis.

Spusti: python3 scripts/doplnenie_dat.py [--dry]
"""
import json, glob, re, sys, os, unicodedata

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

# ── 1. kuchyňa pre recepty, ktoré ju nemali ──────────────────────────────
# Odvodené z obsahu receptu (suroviny + postup + zdroj), nie z názvu — pri
# „snack-*" sa názov a obsah rozchádzajú (viď report).
KUCHYNA = {
 # raňajky a pečivo
 "bageta-ostiepok":"Slovenská","chlieb-so-sunkou-a-uhorkou":"Slovenská",
 "chlieb-so-syrom-a-paradajkou":"Slovenská","oblozene-rozky-sunka-syr":"Slovenská",
 "toast-sunka":"Slovenská","vajcova-tortilla":"Mexická",
 "pecivo-bageta":"Francúzska","pecivo-celozrnny":"Slovenská","pecivo-toast":"Medzinárodná",
 # prílohy
 "priloha-americke-zemiaky":"Americká","priloha-hranolky":"Medzinárodná",
 "priloha-kuskus":"Stredomorská","priloha-opekane-zemiaky":"Medzinárodná",
 "priloha-pecene-zemiaky":"Slovenská","priloha-ryza-cibulka":"Slovenská",
 "priloha-ryza-jazminova":"Ázijská","priloha-ryza-varena":"Slovenská",
 "priloha-zemiakova-kasa":"Slovenská","priloha-zemiaky-varene":"Slovenská",
 # snacky
 "snack-acidko":"Slovenská","snack-banan":"Slovenská","snack-cerealna-tycinka":"Slovenská",
 "snack-cherry-paradajky":"Stredomorská","snack-cokoladka":"Slovenská",
 "snack-cottage":"Talianska","snack-cucoriedky":"Slovenská",
 "snack-grecky-jogurt-med":"Slovenská","snack-horka-cokolada":"Slovenská",
 "snack-hruska":"Slovenská","snack-hummus-zelenina":"Blízkovýchodná","snack-jablko":"Slovenská",
 "snack-kefir":"Slovenská","snack-kiwi":"Slovenská","snack-krekry":"Slovenská",
 "snack-mandarinka":"Slovenská","snack-misa-typ":"Slovenská","snack-mrkva-hummus":"Slovenská",
 "snack-musli-jogurt":"Medzinárodná","snack-olivy":"Slovenská","snack-oriesky":"Slovenská",
 "snack-pomaranc":"Slovenská","snack-proteinova-tycinka":"Medzinárodná",
 "snack-proteinovy-puding":"Slovenská","snack-puding":"Slovenská",
 "snack-ryzove-chlebicky":"Slovenská","snack-skyr":"Medzinárodná","snack-susene-ovocie":"Slovenská",
 "snack-syr-hrozno":"Slovenská","snack-tvaroh":"Slovenská","snack-tvarohovy-dezert":"Slovenská",
 "snack-uhorka":"Slovenská",
}

# ── 2. kategórie, kde zaradenie nesedelo na obsah ────────────────────────
# Presúva sa len v rámci tej istej skupiny slotov generátora (SLOT_KATEGORIE
# v app.js), takže sa nemení, čo generátor môže vybrať do ktorého jedla.
KATEGORIA = dict(
 [(i, "Kokteil") for i in ["alice-cocktail", "citrusovy-brandy-royal"]] +
 [(i, "Dezert") for i in """babovka-zo-spaldovej-muky-s-cucoriedkami babovka
    bananove-palacinkove-kusky bananove-palacinky-lievance cokoladova-torta-s-jahodami-a-ceresnami
    cucoriedkove-muffiny detska-vyziva-s-pudingom gastanovy-dezert
    kysnuta-orechovo-kakaova-babovka lekvarove-buchty majkine-tvarohove-buchty
    makovo-malinove-muffiny makovo-tarohovy-kolac-so-slivkami moj-jablkovy-kolac
    nektarinkovy-kolacik palacinky-s-pribinacikom prazsky-kolac proteinovy-dezert
    snack-tvarohovy-dezert tradicna-doma-pecena-visnova-strudla""".split()] +
 [(i, "Cestoviny") for i in """baklazanove-lasagne bang-bang-kuracie-rezance
    cestovina-s-bobom-slaninkou-a-rukolou cestoviny-na-sposob-pizze chutne-pizza-cestoviny
    cuketove-lasagne cuketove-spagety cuketove-tagliatelle-so-spenatom
    domace-tagliatelle-s-krevetami flambovane-linguine-s-hovadzim-masom-a-so-syrom
    gnocchi-s-hovadzim-ragu hovadzie-lasagne kukuricne-spagety-s-restovanymi-paradajkami
    lasagne-s-mletym-masom-a-zeleninou lasagne-s-tvarohom lasagne-zo-sladkych-zemiakov
    obalovany-morsky-cert-s-cestovinou-fregola soba-rezance-s-mletym-masom
    sojove-rezance-s-kari spagety-bolognese spagety-colore tagliatelle-s-mletym-masom
    udon-rezance-maeso-brokolica vyborne-lasagne""".split()] +
 [(i, "Šalát") for i in """azijsky-cestovinovy-salat-s-arasidovou-omackou
    cestovinovy-salat-pesto-cherry cestovinovy-salat-s-kuracim-masom
    cestovinovy-salat-s-mozzarellou-cucoriedkami-a-ribezlami
    cestovinovy-salatik-s-krabimi-tycinkami orzo-salat salat-mexicka-pasta-s-ciernou-fazulou
    sezamovy-cestovinovy-salat studeny-cestovinovy-salat-feta-oliv
    studeny-cestovinovy-salat-s-hraskom-a-matou studeny-cestovinovy-salat-s-kuracim-a-curry
    studeny-cestovinovy-salat-so-zelenym-pestom studeny-rezancovy-salat-s-kokosom-a-limetkou
    studeny-rezancovy-salat-s-krevetami-a-mangom
    teply-kuskusovy-salat-s-fazulou-a-cerstvou-matou""".split()]
)

# ── 3. čas ───────────────────────────────────────────────────────────────
def norm_cas(c):
    """„1,5 h" → „1 hod 30 min"; „50 min + chladenie" → („50 min", „chladenie")"""
    c = c.strip()
    if not c: return "", ""
    navyse = ""
    m = re.search(r"[(\s]\+\s*([^)]+)\)?$", c)
    if m:
        navyse = m.group(1).strip().rstrip(")")
        c = c[:m.start()].strip().rstrip("(").strip()
    c = c.replace("hodín", "hod").replace("hodiny", "hod").replace("hodina", "hod")
    m = re.fullmatch(r"(\d+)[,.](\d+)\s*(h|hod)", c)
    if m:
        h, des = int(m.group(1)), int(m.group(2))
        mins = round(des / (10 ** len(m.group(2))) * 60)
        c = f"{h} hod {mins} min" if mins else f"{h} hod"
    m = re.fullmatch(r"(\d+)\s*h(?:od)?\s*(?:(\d+)\s*min)?", c)
    if m:
        c = f"{m.group(1)} hod" + (f" {m.group(2)} min" if m.group(2) else "")
    m = re.fullmatch(r"(\d+)\s*min", c)
    if m: c = f"{m.group(1)} min"
    return c, navyse

# odhad času pre recepty, ktoré ho nemajú — z počtu a obsahu krokov
BUMP = [(r"kys(nú|ne|ni)|kvások|droždie", 90), (r"marinuj|marináda|cez noc|do rána", 60),
        (r"chladnič|vychladn|stuhnúť|tuhnúť|mrazn|mraz", 30),
        (r"rúr[ae]|pečie|upeč|piecť|zapeč", 35), (r"var|dus|povar|tlakov", 20),
        (r"panvic|opeč|osmaž|resto|praž", 10)]

def odhad_cas(d):
    t = " ".join(d["postup"]).lower()
    zaklad = 10 + 4 * len(d["postup"]) + len(t) // 400
    for pat, plus in BUMP:
        if re.search(pat, t): zaklad += plus
    if d["kategoria"] in ("Kokteil", "Nápoj"): zaklad = min(zaklad, 15)
    if d["kategoria"] in ("Nátierka", "Šalát"): zaklad = min(zaklad, 45)
    m = 5 * round(zaklad / 5)
    return f"{m//60} hod {m%60} min" if m >= 60 and m % 60 else (f"{m//60} hod" if m >= 60 else f"{m} min")

# ── 4. popis ─────────────────────────────────────────────────────────────
ZAKLAD = re.compile(r"^(soľ|sol|čierne|cierne|mleté|mlete|korenie|voda|olej|slnečnicový olej|"
                    r"olivový olej|cukor|kryštálový|vegeta|bobkový|nové korenie|štipka|"
                    r"maslo|masť|mast|ocot|kypriaci|prášok do pečiva|vanilkový cukor)", re.I)
MASO = re.compile(r"mäso|maso|kur|hovädz|bravč|morč|slanin|klobás|šunk|údené|udene|ryb|losos|"
                  r"tuniak|kreve|treska|kačic|husac|jahňac|zverin|bažant|králič|párk|saláma", re.I)

def _skrat(n):
    n = re.split(r"[,(/–-]", n)[0].strip()
    if len(n) > 26: n = " ".join(n.split()[:2])
    return n

def hlavne_suroviny(d, n=3):
    out = []
    for i in d["ingrediencie"]:
        nz = _skrat(i["nazov"])
        if not nz or ZAKLAD.match(nz) or len(nz) < 3: continue
        nz = nz[0].lower() + nz[1:]
        if nz not in out: out.append(nz)
        if len(out) >= n: break
    return out

TECH = [(r"rúr[ae]|pečie|upeč|piecť|zapeč", "Pečie sa v rúre"),
        (r"gril", "Griluje sa"),
        (r"mixér|rozmixuj|ponorn", "Všetko sa rozmixuje"),
        (r"panvic|opeč|osmaž|resto|praž", "Robí sa na panvici"),
        (r"hrnc|dus|povar|var", "Varí sa v jednom hrnci")]
UVOD = {
 "Hlavné jedlo": ("Sýte mäsité hlavné jedlo.", "Bezmäsité hlavné jedlo."),
 "Cestoviny": ("Cestoviny s mäsom.", "Bezmäsité cestoviny."),
 "Polievka": ("Vývarová polievka s mäsom.", "Zeleninová polievka."),
 "Šalát": ("Výdatný šalát s mäsom.", "Zeleninový šalát."),
 "Nátierka": ("Nátierka na pečivo.", "Bezmäsitá nátierka na pečivo."),
 "Príloha": ("Príloha k hlavnému jedlu.", "Príloha k hlavnému jedlu."),
 "Raňajky": ("Sýte raňajky.", "Ľahké raňajky."),
 "Pečivo": ("Domáce pečivo.", "Domáce pečivo."),
 "Snack": ("Malé jedlo medzi hlavnými chodmi.", "Malé jedlo medzi hlavnými chodmi."),
 "Dezert": ("Sladká dobrota.", "Sladká dobrota."),
 "Kokteil": ("Miešaný nápoj.", "Miešaný nápoj."),
 "Nápoj": ("Domáci nápoj.", "Domáci nápoj."),
}

def urob_popis(d):
    s = hlavne_suroviny(d)
    if not s: return ""
    ing_txt = ", ".join(i["nazov"] for i in d["ingrediencie"])
    maso = bool(MASO.search(ing_txt))
    veta = UVOD.get(d["kategoria"], ("Recept.", "Recept."))[0 if maso else 1]
    veta += " Základ: " + ", ".join(s) + "."
    t = " ".join(d["postup"]).lower()
    for pat, tx in TECH:
        if re.search(pat, t): veta += " " + tx + "."; break
    if d["kategoria"] in ("Hlavné jedlo", "Cestoviny", "Polievka"):
        veta += " Navariť sa dá dopredu na celý blok."
    return veta

def nfc(x):
    if isinstance(x, str): return unicodedata.normalize("NFC", x)
    if isinstance(x, list): return [nfc(i) for i in x]
    if isinstance(x, dict): return {k: nfc(v) for k, v in x.items()}
    return x

def main():
    dry = "--dry" in sys.argv
    st = dict(nfc=0, kuch=0, kat=0, cas_norm=0, cas_odhad=0, popis=0, navyse=0)
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        raw = open(f, encoding="utf-8").read()
        d = json.loads(raw)
        pred = json.dumps(d, ensure_ascii=False, sort_keys=True)
        d2 = nfc(d)
        if json.dumps(d2, ensure_ascii=False, sort_keys=True) != pred: st["nfc"] += 1
        d = d2
        i = d["id"]
        if i in KUCHYNA and not d["kuchyna"].strip(): d["kuchyna"] = KUCHYNA[i]; st["kuch"] += 1
        if i in KATEGORIA and d["kategoria"] != KATEGORIA[i]: d["kategoria"] = KATEGORIA[i]; st["kat"] += 1
        c, navyse = norm_cas(d["cas"])
        if c != d["cas"]:
            d["cas"] = c; st["cas_norm"] += 1
        if navyse:
            st["navyse"] += 1
            veta = "Okrem uvedeného času počítaj ešte s časom na " + navyse.lower() + "."
            d["tipy"] = (d["tipy"].strip() + " " + veta).strip() if d["tipy"].strip() else veta
        if not d["cas"].strip():
            d["cas"] = odhad_cas(d); st["cas_odhad"] += 1
        if not d["popis"].strip():
            p = urob_popis(d)
            if p: d["popis"] = p; st["popis"] += 1
        novy = json.dumps(d, ensure_ascii=False, indent=1) + "\n"
        if novy != raw and not dry:
            open(f, "w", encoding="utf-8").write(novy)
    for k, v in st.items(): print(f"{k:10s} {v}")

if __name__ == "__main__":
    main()
