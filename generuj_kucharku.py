#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generátor kuchárky.
Prečíta recepty z recepty/*.json, databázu potravín z data/potraviny.json
a šablónu data/sablona.html, a vytvorí offline stránku kucharka.html.

Spusti: python3 generuj_kucharku.py
"""
import argparse, base64, json, os, glob, datetime, re, shutil, subprocess, sys, tempfile, zlib

ZAKLAD = os.path.dirname(os.path.abspath(__file__))
RECEPTY_DIR = os.path.join(ZAKLAD, "recepty")
JEDALNICKY_DIR = os.path.join(ZAKLAD, "jedalnicky")
POTRAVINY = os.path.join(ZAKLAD, "data", "potraviny.json")
SABLONA = os.path.join(ZAKLAD, "data", "sablona.html")
APPJS = os.path.join(ZAKLAD, "data", "app.js")
SW = os.path.join(ZAKLAD, "sw.js")
SYNC_CONFIG = os.path.join(ZAKLAD, "sync-config.js")
VYSTUP = os.path.join(ZAKLAD, "kucharka.html")
EXPORT = os.path.join(ZAKLAD, "export", "jedlo_data.json")  # strojovo čitateľný výpis dát
DOCS = os.path.join(ZAKLAD, "docs")
DOCS_INDEX = os.path.join(DOCS, "index.html")  # GitHub Pages entry point (kópia kucharka.html)


def kratko(cesta):
    """Cesta relatívne k projektu — v hláške sa ľahšie hľadá."""
    try:
        return os.path.relpath(cesta, ZAKLAD)
    except ValueError:
        return cesta


def zomri(nadpis, riadky=()):
    """Zrozumiteľná slovenská hláška namiesto Python tracebacku."""
    print("\n" + nadpis, file=sys.stderr)
    for r in riadky:
        print("  - " + str(r), file=sys.stderr)
    print("\nBuild zastavený, kucharka.html sa NEPREPÍSALA.", file=sys.stderr)
    raise SystemExit(1)


def nacitaj_text(cesta, popis):
    if not os.path.exists(cesta):
        zomri(f"CHÝBA SÚBOR: {kratko(cesta)} ({popis}).",
              ["Skontroluj, či si ho nepremenoval alebo nezmazal."])
    try:
        with open(cesta, encoding="utf-8") as f:
            return f.read()
    except OSError as e:
        zomri(f"NEDÁ SA PREČÍTAŤ {kratko(cesta)} ({popis}): {e}")


def nacitaj_json(cesta, popis):
    surove = nacitaj_text(cesta, popis)
    try:
        return json.loads(surove)
    except json.JSONDecodeError as e:
        zomri(f"POKAZENÝ JSON: {kratko(cesta)} ({popis})",
              [f"riadok {e.lineno}, stĺpec {e.colno}: {e.msg}",
               "Najčastejšie: čiarka navyše pred } alebo ], chýbajúce úvodzovky okolo názvu poľa."])


def nacitaj_json_zoznam(adresar, popis):
    """Vráti [(cesta, data)]. Pokazený súbor build ZASTAVÍ — pôvodne sa iba vypísala hláška
    a recept sa ticho zahodil, takže z kuchárky nenápadne zmizol."""
    out, chyby = [], []
    for cesta in sorted(glob.glob(os.path.join(adresar, "*.json"))):
        try:
            with open(cesta, encoding="utf-8") as f:
                out.append((cesta, json.load(f)))
        except json.JSONDecodeError as e:
            chyby.append(f"{kratko(cesta)}: pokazený JSON — riadok {e.lineno}, stĺpec {e.colno}: {e.msg}")
        except OSError as e:
            chyby.append(f"{kratko(cesta)}: nedá sa prečítať — {e}")
    if chyby:
        zomri(f"CHYBNÉ SÚBORY V {kratko(adresar)} ({popis}): {len(chyby)}", chyby)
    return out


# jednotky, ktoré vie gramy() v app.js previesť na gramy — musí sedieť s ML_JED / KS_DEF / gramy()
ZNAME_JEDNOTKY = {
    "g", "gram", "gramov", "kg", "ml", "ks", "kus", "rožok", "rozok", "žemľa", "zemla",
    "pl", "lyžica", "lyzica", "polievková lyžica", "čl", "cl", "lyžička", "lyzicka",
    "šálka", "salka", "hrnček", "hrncek", "pohár", "pohar", "dcl", "dl", "l", "liter",
    "strúčik", "strucik", "plátok", "platok", "list", "lístok", "listok", "hlávka", "hlavka",
    "hrsť", "hrst", "štipka", "stipka", "zväzok", "zvazok", "vetvička", "vetvicka",
    "stredná", "stredny", "stredné",
}


def skontroluj_recepty(recepty):
    """Množstvo bez jednotky app.js ticho ráta ako kusy, neznámu jednotku ako 0 g — oboje pokazí
    nákupný zoznam aj kalórie. Recept bez `id` sa nedá dať do plánu ani do jedálnička,
    dve rovnaké `id` sa v appke prebijú. Radšej padnúť pri builde než variť podľa zlého zoznamu."""
    chyby = []
    videne = {}
    for cesta, r in recepty:
        kde = kratko(cesta)
        rid = r.get("id")
        if not isinstance(r, dict):
            chyby.append(f"{kde}: súbor neobsahuje objekt receptu")
            continue
        if not rid:
            chyby.append(f"{kde}: chýba pole „id“ (bez neho sa recept nedá dať do plánu)")
        elif rid in videne:
            chyby.append(f"{kde}: id „{rid}“ už používa {videne[rid]}")
        else:
            videne[rid] = kde
        if not (r.get("nazov") or "").strip():
            chyby.append(f"{kde}: chýba pole „nazov“")
        for i in r.get("ingrediencie", []):
            if i.get("mnozstvo") is None:
                continue
            j = (i.get("jednotka") or "").strip()
            if not j:
                chyby.append(f"{kde} (id {rid}): „{i.get('nazov')}“ má množstvo {i['mnozstvo']} bez jednotky")
            elif j.lower() not in ZNAME_JEDNOTKY:
                chyby.append(f"{kde} (id {rid}): „{i.get('nazov')}“ má neznámu jednotku „{j}“ "
                             f"(app.js ju neprepočíta na gramy → 0 kcal a 0 € v nákupe)")
    if chyby:
        zomri(f"CHYBY V DÁTACH RECEPTOV: {len(chyby)}", chyby)
    return videne


# ── poistka proti poškodeným množstvám (P1, august 2026) ────────────────────────────────
# Zber receptov z webu vyrobil 127 receptov, kde bola gramáž nafúknutá 10–1000× („Celozrnný
# starší chlieb 4000 g", „Hladká múka 24 000 g", „Krevety 7200 g"). Appka to nevidela: plán
# hlási kurátorované `kcal_na_porciu` (pravidlo B4), zatiaľ čo nákupný zoznam kupuje suroviny —
# a ten pýtal 2,4× viac jedla, než plán sľuboval. Dáta sa budú zbierať ďalej, takže build to
# odteraz kontroluje sám.
#
# PRAH: 700 g jedla na porciu. Bežná porcia hlavného jedla váži 300–500 g, veľká polievková
# 600 g. Vody, vývary, nálevy a marinády sa NERÁTAJÚ — tie sú legitímne v litroch. Prah je
# nastavený tak, aby nechal prejsť skutočné zaváraniny a várky (klobásy z 10 kg mäsa na
# 24 porcií), a zároveň zachytil každú desatinnú čiarku posunutú o rád.
#
# NIE JE to tvrdý pád: legitímne prípady existujú (zaváranie, kysnuté cestá, kura v soľnej
# kruste) a build, ktorý padá na správnych dátach, sa naučíš obchádzať. Je to výpis, ktorý sa
# nedá prehliadnuť — a `--striktne` ho na želanie zmení na pád (hodí sa do CI).
HMOTNOST_NA_PORCIU_PRAH = 700          # g jedla na porciu (bez vody, vývaru a nálevu)
JEDNA_SUROVINA_PRAH = 700              # g jednej suroviny na porciu
_TEKUTE_LEGITIMNE = re.compile(
    r"voda|vody|vodou|n[áa]lev|marin[áa]d|v[ýy]var|buj[óo]n|ľad|olej na vypr[áa]žanie", re.I)
# jednotky, ktoré vieme previesť na gramy bez databázy potravín (hustota ~1)
_G_ZA_JEDNOTKU = {"g": 1, "gram": 1, "gramov": 1, "kg": 1000, "ml": 1, "l": 1000, "liter": 1000,
                  "dcl": 100, "dl": 100, "pl": 15, "lyžica": 15, "lyzica": 15,
                  "polievková lyžica": 15, "čl": 5, "cl": 5, "lyžička": 5, "lyzicka": 5,
                  "šálka": 250, "salka": 250, "hrnček": 250, "hrncek": 250,
                  "pohár": 250, "pohar": 250}


def skontroluj_mnozstva(recepty, striktne=False):
    """Vypíše recepty, ktoré pýtajú nereálne veľa jedla na porciu. Vracia počet nálezov."""
    nalezy = []
    for cesta, r in recepty:
        if not isinstance(r, dict):
            continue
        # Nápoje a kokteily sú z definície tekutina — ich hmotnosť je voda a prah pre jedlo
        # na ne nesedí (džbán limonády na dvoch je legitímne 1,5 kg).
        if r.get("kategoria") in ("Nápoj", "Kokteil"):
            continue
        porcie = r.get("porcie") or 1
        try:
            porcie = max(1, float(porcie))
        except (TypeError, ValueError):
            porcie = 1
        spolu, velke = 0.0, []
        for i in r.get("ingrediencie", []):
            m = i.get("mnozstvo")
            if not isinstance(m, (int, float)):
                continue
            nazov = str(i.get("nazov") or "")
            if _TEKUTE_LEGITIMNE.search(nazov):
                continue
            g = m * _G_ZA_JEDNOTKU.get((i.get("jednotka") or "").strip().lower(), 0)
            if g <= 0:
                continue
            spolu += g
            if g / porcie > JEDNA_SUROVINA_PRAH:
                velke.append(f"{nazov} {m} {i.get('jednotka')} = {round(g / porcie)} g/porcia")
        na_porciu = spolu / porcie
        if na_porciu > HMOTNOST_NA_PORCIU_PRAH or velke:
            nalezy.append((round(na_porciu), r.get("id") or kratko(cesta), r.get("nazov") or "", velke))
    if not nalezy:
        return 0
    nalezy.sort(key=lambda x: -x[0])
    riadky = []
    for na_porciu, rid, nazov, velke in nalezy:
        riadky.append(f"{na_porciu} g/porcia · {nazov} [{rid}]")
        riadky += ["    " + v for v in velke[:3]]
    nadpis = (f"⚠️  NEREÁLNE MNOŽSTVÁ: {len(nalezy)} receptov pýta viac než "
              f"{HMOTNOST_NA_PORCIU_PRAH} g jedla na porciu (bez vody a vývaru)")
    if striktne:
        zomri(nadpis, riadky)
    print("\n" + "=" * 78, file=sys.stderr)
    print(nadpis, file=sys.stderr)
    print("Bežná porcia hlavného jedla váži 300–500 g. Skontroluj ich cez\n"
          "  node scripts/qa/klasifikuj_mnozstva.js   a oprav cez  node scripts/oprav_mnozstva.js",
          file=sys.stderr)
    for r in riadky:
        print("  - " + r, file=sys.stderr)
    print("=" * 78 + "\n", file=sys.stderr)
    return len(nalezy)


POV_CISLA = ("kcal", "bielkoviny", "tuky", "sacharidy")


def skontroluj_potraviny(potraviny):
    """Potravina bez `oddelenie` vypadne z radenia nákupu, bez výživy dá recept 0 kcal.
    `cena100` smie byť None (neznáma cena) — 0 znamená naozaj zadarmo."""
    chyby = []
    if not isinstance(potraviny, list):
        zomri(f"{kratko(POTRAVINY)} musí byť zoznam potravín (JSON pole), nie {type(potraviny).__name__}.")
    videne = set()
    for idx, p in enumerate(potraviny):
        if not isinstance(p, dict):
            chyby.append(f"položka #{idx + 1} nie je objekt")
            continue
        kluc = (p.get("kluc") or "").strip()
        if not kluc:
            chyby.append(f"položka #{idx + 1} nemá „kluc“ (podľa neho sa surovina páruje na potravinu)")
            continue
        if kluc in videne:
            chyby.append(f"„{kluc}“ je v databáze dvakrát")
        videne.add(kluc)
        if not (p.get("oddelenie") or "").strip():
            chyby.append(f"„{kluc}“ nemá „oddelenie“ (vypadne z radenia nákupného zoznamu)")
        for pole in POV_CISLA:
            if not isinstance(p.get(pole), (int, float)):
                chyby.append(f"„{kluc}“ nemá číselné pole „{pole}“ (recepty s ňou budú mať 0 kcal)")
        cena = p.get("cena100", None)
        if cena is not None and not isinstance(cena, (int, float)):
            chyby.append(f"„{kluc}“ má „cena100“ = {cena!r} (musí byť číslo, alebo null = neznáma cena)")
    if chyby:
        zomri(f"CHYBY V {kratko(POTRAVINY)}: {len(chyby)}", chyby)
    return videne


def skontroluj_jedalnicky(jedalnicky, id_receptov):
    """Uložený jedálniček s neexistujúcim id sa načíta ako prázdny slot — používateľ by
    si to všimol až v obchode, keď mu v nákupe chýbajú suroviny."""
    chyby = []
    for cesta, j in jedalnicky:
        kde = kratko(cesta)
        if not j.get("id"):
            chyby.append(f"{kde}: chýba pole „id“")
        plan = j.get("plan") or {}
        if not isinstance(plan, dict):
            chyby.append(f"{kde}: pole „plan“ musí byť objekt {{\"0\": {{…}}, …}}")
            continue
        for den, sloty in plan.items():
            if den not in ("0", "1", "2", "3", "4", "5", "6"):
                chyby.append(f"{kde}: deň „{den}“ — povolené sú len „0“ (pondelok) až „6“ (nedeľa)")
            for slot, v in (sloty or {}).items():
                for rid in (v if isinstance(v, list) else [v]):
                    if isinstance(rid, str) and rid.startswith("prf:"):
                        continue  # virtuálna príloha (PRILOHY v app.js)
                    if rid not in id_receptov:
                        chyby.append(f"{kde}: deň {den}, {slot} → recept „{rid}“ neexistuje v recepty/")
    if chyby:
        zomri(f"CHYBY V ULOŽENÝCH JEDÁLNIČKOCH: {len(chyby)}", chyby)


# Placeholdery, ktoré generátor nahrádza. Reťazec, ktorý sa dostane do dát (napr. z rozbitého
# parsera receptov), by sa v ďalšom kroku nahradil znova — recept s názvom „__POTRAVINY__ test“
# do seba vtiahol celú databázu potravín a appka skončila so SyntaxError. Preto sa nahrádza
# JEDNÝM prechodom (viď jednorazova_nahrada) a navyše sa dáta na placeholdery kontrolujú.
PLACEHOLDERY = ("__APP_JS__", "__DATA__", "__POTRAVINY__", "__JEDALNICKY__", "__DATUM__", "__POCET__")


def prejdi_retazce(o, cesta=""):
    """Rekurzívne vydá (cesta k poľu, text) pre KAŽDÝ reťazec v dátach — nech hláška vie povedať,
    v ktorom recepte a v ktorom poli je problém, nie len „niekde v dátach“."""
    if isinstance(o, str):
        yield (cesta or "(celý súbor)"), o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from prejdi_retazce(v, (cesta + "." if cesta else "") + str(k))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from prejdi_retazce(v, f"{cesta}[{i}]")


def skontroluj_bezpecnost_dat(polozky, popis):
    """Dáta idú inline do <script> v jednom HTML súbore. Doteraz sa nekontrolovali vôbec:
    recept s `</script>` v postupe alebo s placeholderom v názve prešiel buildom s kódom 0
    a `kucharka.html` mala syntaktickú chybu — appka bola mŕtva a nič to nepovedalo.

    Prečo padnúť a nie ticho escapovať: 1365 receptov je parsovaných z webu, takže `<script>`
    alebo `__DATA__` v recepte neznamená „exotický text“, ale ROZBITÝ IMPORT — a ten treba
    opraviť v dátach, nie zamaskovať. Escapovanie (`</` → `<\/`, jednorazová náhrada
    placeholderov) tu je NAVYŠE, ako poistka pre prípad, že táto kontrola niečo prepustí."""
    chyby = []
    for cesta, data in polozky:
        kde = kratko(cesta)
        for pole, txt in prejdi_retazce(data):
            nizke = txt.lower()
            if "</script" in nizke or "<script" in nizke:
                chyby.append(f"{kde} → pole „{pole}“ obsahuje značku <script> "
                             f"(vložené inline do stránky ukončí blok skriptu a appka sa nespustí)")
            for ph in PLACEHOLDERY:
                if ph in txt:
                    chyby.append(f"{kde} → pole „{pole}“ obsahuje placeholder generátora {ph} "
                                 f"(generátor doň vkladá dáta — v recepte nemá čo robiť)")
            if "\u2028" in txt or "\u2029" in txt:
                chyby.append(f"{kde} → pole „{pole}“ obsahuje neviditeľný oddeľovač riadkov "
                             f"U+2028/U+2029 (v JavaScripte zalomí reťazec → SyntaxError)")
    if chyby:
        zomri(f"NEBEZPEČNÝ OBSAH V DÁTACH ({popis}): {len(chyby)}", chyby)


def json_do_scriptu(o):
    """JSON pripravený na vloženie do inline <script>.
    `</` → `<\/`: v JavaScripte je to ten istý znak, dáta ostávajú bajt na bajt rovnaké,
    ale `</script>` už nemôže ukončiť blok. U+2028/U+2029 sú v JSON legálne, v JS zdroji
    však zalomia reťazec.
    Oddeľovače sú bez medzier — pri 1961 receptoch je „, “ a „: “ navyše 216 kB."""
    return (json.dumps(o, ensure_ascii=False, separators=(",", ":"))
            .replace("</", "<\\/")
            .replace("\u2028", "\\u2028")
            .replace("\u2029", "\\u2029"))


# P3: recepty ako obyčajný JSON zaberali 3,95 MB z 5,35 MB súboru — na 4 Mbit/s je to
# ~11 s prvého načítania. Ten istý JSON skomprimovaný (raw DEFLATE) a v base64 má 1,80 MB.
# Appka ho rozbalí synchrónne (`_rozbal` + `_zlInflate` v data/app.js), takže kuchárka
# zostáva jeden offline súbor bez knižnice a bez siete. Fotky sú vnútri: base64 WebP
# sa síce nezmenší (base64 → deflate → base64 je zhruba nula), ale ani nezväčší.
def data_do_scriptu(o, rezim):
    """Vráti (JS výraz s dátami, bajtov pred, bajtov po) — buď JSON, alebo base64 DEFLATE."""
    if rezim == "json":
        v = json_do_scriptu(o)
        return v, len(v.encode("utf-8")), len(v.encode("utf-8"))
    raw = json.dumps(o, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    d = zlib.compressobj(9, zlib.DEFLATED, -15)   # -15 = raw deflate, bez zlib hlavičky
    b64 = base64.b64encode(d.compress(raw) + d.flush()).decode("ascii")
    # base64 abeceda je A–Z a–z 0–9 + / = — v JS reťazci ani v HTML nemá čo ukončiť.
    if not re.fullmatch(r"[A-Za-z0-9+/=]*", b64):
        zomri("base64 dát obsahuje znak mimo abecedy — nevkladám to do <script>.")
    return '"' + b64 + '"', len(raw), len(b64) + 2


def jednorazova_nahrada(text, nahrady):
    """Nahradí placeholdery JEDNÝM prechodom. Reťazená `.replace()` prepúšťala placeholder
    vložený v predchádzajúcom kroku (dáta → ďalší placeholder), takže obsah receptu vedel
    do stránky vtiahnuť ďalší blok dát. Vložený text sa už neprehľadáva."""
    vzor = re.compile("|".join(re.escape(k) for k in nahrady))
    return vzor.sub(lambda m: nahrady[m.group(0)], text)


def over_syntax_js(html, cesta_html):
    """Po builde over, že inline JavaScript je naozaj syntakticky platný. Bez toho vedel build
    skončiť úspechom a vyrobiť stránku, ktorá v prehliadači nespustí ani riadok."""
    bloky = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S)
    if not bloky:
        zomri(f"{kratko(cesta_html)} neobsahuje žiadny inline <script> — appka by bola prázdna.")
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        print("POZOR: node sa nenašiel — syntax vygenerovaného JavaScriptu sa neoverila.", file=sys.stderr)
        return
    for idx, kod in enumerate(bloky, 1):
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as f:
            f.write(kod)
            docasny = f.name
        try:
            v = subprocess.run(["node", "--check", docasny], capture_output=True, text=True)
        finally:
            os.unlink(docasny)
        if v.returncode != 0:
            hlaska = [r for r in (v.stderr or "").splitlines() if r.strip()][:6]
            zomri(f"VYGENEROVANÝ JAVASCRIPT NIE JE PLATNÝ ({kratko(cesta_html)}, blok #{idx} z {len(bloky)}).",
                  hlaska + ["Appka by sa v prehliadači vôbec nespustila.",
                            "Najčastejšie: nebezpečný obsah v dátach (</script>, placeholder) alebo chyba v data/app.js."])
# ─────────────────────────── fotky receptov ───────────────────────────
FOTKY_DIR = os.path.join(RECEPTY_DIR, "fotky")
FOTKY_ZDROJE = os.path.join(FOTKY_DIR, "ZDROJE.json")
# Rozpočet na inline fotky. Nad ním sa `kucharka.html` predlžuje o načítanie, ktoré
# používateľ na 4 Mbit/s pocíti — merania sú v reporty/report-fotky.md.
# Nie je to tvrdý limit (build nepadne), ale build to VYPÍŠE, aby to nikto neprehliadol.
FOTKY_ROZPOCET_MB = 2.5
MIME = {".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".avif": "image/avif"}


def foto_subor(recept):
    """Vráti názov súboru fotky pre recept, alebo None.
    Zdroj pravdy je pole `foto` v recepte; ak nie je vyplnené, skúsi sa `recepty/fotky/<id>.webp`,
    aby stačilo doplniť súbor a nemuselo sa editovať 1956 JSONov."""
    f = (recept.get("foto") or "").strip()
    if f.startswith("data:"):
        return f  # už vložená fotka (vlastný recept exportovaný z appky)
    if not f:
        f = str(recept.get("id") or "") + ".webp"
    if not re.match(r"^[A-Za-z0-9._-]{1,80}\.(webp|jpg|jpeg|png|avif)$", f):
        return None
    return f if os.path.exists(os.path.join(FOTKY_DIR, f)) else None


def priprav_fotky(recepty, rezim):
    """Nastaví pole `foto` podľa režimu buildu a vráti (počet, bajtov_inline, hlásenia).

    inline  — fotka ide do HTML ako data: URI. Kuchárka zostáva JEDEN offline súbor
              (dvojklik, kópia do telefónu, „Pridať na plochu" — všade rovnako).
    subor   — v poli `foto` ostane názov súboru a `recepty/fotky/` sa skopíruje k výstupu.
              Menší HTML, ale appka prestáva byť jeden súbor: samotný kucharka.html
              prenesený do telefónu ukáže emoji namiesto fotiek.
    ziadne  — fotky sa vynechajú (build na porovnanie / úsporný režim).
    """
    poc, bajtov, hlasenia = 0, 0, []
    chybajuce = 0
    for r in recepty:
        f = foto_subor(r)
        if f and f.startswith("data:"):
            poc += 1; bajtov += len(f); continue
        if (r.get("foto") or "").strip() and not f:
            chybajuce += 1
        if not f or rezim == "ziadne":
            r["foto"] = ""
            continue
        if rezim == "subor":
            r["foto"] = f; poc += 1; continue
        cesta = os.path.join(FOTKY_DIR, f)
        try:
            with open(cesta, "rb") as fh:
                sur = fh.read()
        except OSError as e:
            hlasenia.append(f"fotka {f} sa nedá prečítať ({e}) — recept ju nedostane")
            r["foto"] = ""
            continue
        mime = MIME.get(os.path.splitext(f)[1].lower(), "image/webp")
        r["foto"] = "data:" + mime + ";base64," + base64.b64encode(sur).decode("ascii")
        poc += 1; bajtov += len(r["foto"])
    if chybajuce:
        hlasenia.append(f"{chybajuce} receptov má vyplnené pole „foto“, ale súbor v recepty/fotky/ chýba "
                        f"(appka na nich ukáže emoji — to je v poriadku, len o tom vedz)")
    return poc, bajtov, hlasenia


def foto_zdroje_pre_appku():
    """Kompaktná mapa atribúcie pre UI: {id: {a: autor, l: licencia, lu: odkaz na licenciu, u: zdroj}}.
    Wikimedia (CC BY-SA) aj TheMealDB/TheCocktailDB vyžadujú uvedenie autora a licencie
    PRI fotke — appka to vykresľuje ako popisku pod obrázkom v detaile receptu."""
    if not os.path.exists(FOTKY_ZDROJE):
        return {}
    surove = nacitaj_json(FOTKY_ZDROJE, "pôvod a licencie fotiek")
    out = {}
    for rid, z in (surove or {}).items():
        if not isinstance(z, dict):
            continue
        out[rid] = {k: v for k, v in (("a", (z.get("autor") or "").strip()[:120]),
                                      ("l", (z.get("licencia") or "").strip()[:120]),
                                      ("lu", z.get("licencia_url") or ""),
                                      ("u", z.get("obrazok_url") or z.get("zdroj_url") or "")) if v}
    return out


def main():
    ap = argparse.ArgumentParser(description="Poskladá kucharka.html zo zdrojov.")
    ap.add_argument("--fotky", choices=("inline", "subor", "ziadne"), default="inline",
                    help="inline = fotky do HTML ako data: URI (jeden offline súbor, predvolené); "
                         "subor = necháva recepty/fotky/ vedľa; ziadne = bez fotiek")
    ap.add_argument("--striktne", action="store_true",
                    help="varovanie o nereálnych množstvách zmení na pád buildu (do CI)")
    ap.add_argument("--data", choices=("zbalene", "json"), default="zbalene",
                    help="zbalene = recepty a potraviny sa vkladajú skomprimované "
                         "(raw DEFLATE + base64, appka ich rozbalí sama; predvolené); "
                         "json = čitateľný JSON priamo v súbore (o ~2,7 MB väčší, na ladenie)")
    args = ap.parse_args()

    recepty_p = nacitaj_json_zoznam(RECEPTY_DIR, "recepty")
    if not recepty_p:
        zomri(f"V {kratko(RECEPTY_DIR)} nie je ani jeden recept (*.json).")
    id_receptov = skontroluj_recepty(recepty_p)
    pocet_mnozstiev = skontroluj_mnozstva(recepty_p, striktne=args.striktne)

    jedalnicky_p = nacitaj_json_zoznam(JEDALNICKY_DIR, "uložené jedálničky")
    skontroluj_jedalnicky(jedalnicky_p, id_receptov)

    potraviny = nacitaj_json(POTRAVINY, "databáza potravín")
    skontroluj_potraviny(potraviny)

    skontroluj_bezpecnost_dat(recepty_p, "recepty/")
    skontroluj_bezpecnost_dat(jedalnicky_p, "jedalnicky/")
    skontroluj_bezpecnost_dat([(POTRAVINY, potraviny)], "data/potraviny.json")

    sablona = nacitaj_text(SABLONA, "HTML šablóna")
    appjs = nacitaj_text(APPJS, "JavaScript appky")
    if "</script>" in appjs:
        zomri(f"{kratko(APPJS)} obsahuje literál </script>.",
              ["Vložený inline do šablóny by predčasne ukončil <script> a appka by sa nespustila.",
               "Rozdeľ ho napr. na \"<\\/script>\"."])
    for cesta, text, placeholdery in ((SABLONA, sablona, ("__APP_JS__", "__DATUM__", "__POCET__")),
                                      (APPJS, appjs, ("__DATA__", "__POTRAVINY__", "__JEDALNICKY__", "__FOTO_ZDROJE__"))):
        for placeholder in placeholdery:
            poc = text.count(placeholder)
            if poc == 0:
                zomri(f"{kratko(cesta)} nemá placeholder {placeholder}.",
                      ["Generátor doň vkladá dáta — bez neho by appka bola prázdna."])
            # Placeholder navyše (aj v komentári!) sa nahradí tiež — 1,9 MB dát dvakrát.
            if poc > 1:
                zomri(f"{kratko(cesta)} má placeholder {placeholder} {poc}×.",
                      ["Generátor nahrádza VŠETKY výskyty, takže by sa dáta vložili viackrát",
                       "(a to aj vtedy, keď je druhý výskyt len v komentári).",
                       "Nechaj v súbore jediný výskyt a v komentároch ho neopisuj doslova."])

    recepty = [r for _, r in recepty_p]
    jedalnicky = [j for _, j in jedalnicky_p]
    # Export ide von PRED vložením fotiek: v `recepty` by po ňom boli data: URI a strojový
    # výpis by narástol o megabajty base64, ktoré v ňom nikomu nepomôžu.
    # export/jedlo_data.json je strojovo čitateľný výpis receptov + potravín (pre skripty
    # a import do iných nástrojov). Generujeme ho, aby sa nemohol nenápadne rozísť so zdrojmi —
    # dovtedy to bola ručná kópia, ktorá pri prvej zmene receptu prestala platiť.
    os.makedirs(os.path.dirname(EXPORT), exist_ok=True)
    with open(EXPORT, "w", encoding="utf-8") as f:
        json.dump({"potraviny": potraviny, "recepty": recepty}, f, ensure_ascii=False, separators=(",", ":"))

    foto_poc, foto_bajtov, foto_hlasenia = priprav_fotky(recepty, args.fotky)
    for h in foto_hlasenia:
        print("Pozor: " + h, file=sys.stderr)
    data_json, dat_pred, dat_po = data_do_scriptu(recepty, args.data)
    potraviny_json, pot_pred, pot_po = data_do_scriptu(potraviny, args.data)
    jedalnicky_json, _, _ = data_do_scriptu(jedalnicky, args.data)
    foto_zdroje_json, _, _ = data_do_scriptu(foto_zdroje_pre_appku(), args.data)
    datum = datetime.date.today().strftime("%d.%m.%Y")
    # Dva prechody, každý jednorazový: najprv dáta do app.js, potom hotový app.js do šablóny.
    # Vložený text sa už neprehľadáva, takže placeholder v dátach nemôže vtiahnuť ďalší blok.
    appjs_hotovy = jednorazova_nahrada(appjs, {
        "__DATA__": data_json, "__POTRAVINY__": potraviny_json,
        "__JEDALNICKY__": jedalnicky_json, "__FOTO_ZDROJE__": foto_zdroje_json})
    html_out = jednorazova_nahrada(sablona, {
        "__APP_JS__": appjs_hotovy, "__DATUM__": datum, "__POCET__": str(len(recepty))})
    over_syntax_js(html_out, VYSTUP)
    with open(VYSTUP, "w", encoding="utf-8") as f:
        f.write(html_out)

    os.makedirs(DOCS, exist_ok=True)
    shutil.copyfile(VYSTUP, DOCS_INDEX)
    # Bez sw.js vedľa index.html nemá GitHub Pages service worker — appka by tam vôbec
    # nefungovala offline, hoci na Netlify áno.
    if os.path.exists(SW):
        shutil.copyfile(SW, os.path.join(DOCS, "sw.js"))
    # sync-config.js je tajný a je v .gitignore (aj v docs/) — kopírujeme ho, len ak existuje.
    if os.path.exists(SYNC_CONFIG):
        shutil.copyfile(SYNC_CONFIG, os.path.join(DOCS, "sync-config.js"))

    if args.fotky == "subor" and os.path.isdir(FOTKY_DIR):
        ciel = os.path.join(DOCS, "recepty", "fotky")
        shutil.rmtree(ciel, ignore_errors=True)
        shutil.copytree(FOTKY_DIR, ciel)

    velkost = os.path.getsize(VYSTUP)
    print(f"Hotovo: {VYSTUP}")
    print(f"Veľkosť: {velkost/1048576:.2f} MB  ·  ~{velkost*8/4e6:.1f} s na 4 Mbit/s")
    if args.data == "zbalene":
        print(f"Dáta: recepty {dat_pred/1048576:.2f} → {dat_po/1048576:.2f} MB, "
              f"potraviny {pot_pred/1048576:.2f} → {pot_po/1048576:.2f} MB "
              f"(raw DEFLATE + base64; --data=json vypne)")
    else:
        print("Dáta: nekomprimovaný JSON (--data=json)")
    if args.fotky == "inline":
        print(f"Fotky: {foto_poc} inline ({foto_bajtov/1048576:.2f} MB base64 = "
              f"{foto_bajtov*100.0/max(velkost,1):.0f} % súboru)")
        if foto_bajtov / 1048576 > FOTKY_ROZPOCET_MB:
            print(f"POZOR: inline fotky prekročili rozpočet {FOTKY_ROZPOCET_MB} MB. "
                  f"Zváž menej fotiek alebo --fotky=subor (viď reporty/report-fotky.md).", file=sys.stderr)
    elif args.fotky == "subor":
        print(f"Fotky: {foto_poc} zo súborov v {kratko(FOTKY_DIR)} "
              f"(kuchárka UŽ NIE JE jeden súbor — priečinok musí ísť s ňou)")
    else:
        print("Fotky: vypnuté (--fotky=ziadne)")
    print(f"GitHub Pages: {DOCS_INDEX}" + (" (+ sw.js)" if os.path.exists(SW) else ""))
    print(f"Dátový výpis: {EXPORT}")
    print(f"Receptov: {len(recepty)} · potravín: {len(potraviny)} · jedálničkov: {len(jedalnicky)}")
    if pocet_mnozstiev:
        print(f"⚠️  Receptov s nereálnym množstvom na porciu: {pocet_mnozstiev} (podrobnosti vyššie)")


if __name__ == "__main__":
    main()
