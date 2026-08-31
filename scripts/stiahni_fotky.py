#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stiahne ilustračné fotky k receptom LEN z právne jednoznačných zdrojov a ku každej
uloží, odkiaľ je a pod akou licenciou (recepty/fotky/ZDROJE.json).

Povolené zdroje (overené 31. 8. 2026):
  * TheCocktailDB / TheMealDB — robots.txt „Allow: /", AGENTS.md výslovne hovorí
    „Use ready-to-display meal artwork" a „Credit TheMealDB as the data and image source".
  * Wikibooks Cookbook (en) + Wikimedia Commons — CC BY / CC BY-SA / CC0 / public domain;
    berieme LEN súbory s voľnou licenciou a ukladáme autora + licenciu.
  * Slovenská/anglická Wikipédia (Commons) pre kanonické názvy jedál — rovnaké pravidlo.

ZAKÁZANÉ a v skripte vôbec nie sú:
  * Varecha.sk — server vracia 403 na každý automatizovaný request (aj pre Claude-User,
    ktorého robots.txt povoľuje). 403 je výslovné odmietnutie, obchádzať sa nesmie.
  * Allrecipes / Serious Eats / Simply Recipes (People Inc.) — `Disallow: /`, zákaz TDM.
  * BBC Good Food — robots.txt síce crawl povoľuje, ale fotky sú chránené autorským právom
    Immediate Media a licenciu na ďalšie šírenie nemáme.

Spustenie:
    python3 scripts/stiahni_fotky.py            # všetky povolené zdroje
    python3 scripts/stiahni_fotky.py --zdroj cocktaildb
    python3 scripts/stiahni_fotky.py --limit 20 --suchy   # nič nezapíše
"""
import json, os, glob, re, sys, time, io, argparse, unicodedata
import urllib.request, urllib.parse, urllib.error

ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECEPTY = os.path.join(ZAKLAD, "recepty")
FOTKY = os.path.join(RECEPTY, "fotky")
ZDROJE = os.path.join(FOTKY, "ZDROJE.json")

# Cieľový rozmer inline miniatúry. Karta má 82 px (mobil) / 120 px (počítač) výšky,
# detail zobrazuje ten istý súbor do max. 480 px šírky — pri 320 px zdroji je to
# nanajvýš 1,5× zväčšenie. Väčší rozmer sa nezmestí do rozpočtu (viď report-fotky.md).
SIRKA, VYSKA, KVALITA = 320, 180, 62
PAUZA = 1.5  # sekundy medzi požiadavkami — sťahujeme šetrne, sériovo

# Wikimedia vyžaduje popisný User-Agent — generický aj AI-bot UA vracia 429.
# Pre TheMealDB/TheCocktailDB je robots.txt Allow: / pre všetkých.
UA_WIKI = "KucharkaJedlo/1.0 (osobna offline kucharka pre jednu domacnost; nekomercne; max 1 poziadavka za 3 s) Python-urllib/3"
UA_API = "Claude-User (user-initiated fetch pre osobnu offline kucharku)"


def je_wiki(url):
    return ("wikimedia.org" in url) or ("wikibooks.org" in url) or ("wikipedia.org" in url)


def ua_pre(url):
    return UA_WIKI if je_wiki(url) else UA_API

VOLNE_LICENCIE = re.compile(
    r"^(cc0|cc[- ]?by([- ]?sa)?([- ]?\d(\.\d)?)*|public domain|pd|"
    r"attribution|attribution[- ]sharealike)", re.I)


def stiahni(url, retry=3):
    # Wikimedia odmieta (429) požiadavky s holým `Accept: */*` — vyzerá to ako bot bez prehliadača.
    # Overené: rovnaká URL s `Accept: image/*` a Accept-Language prejde na prvý pokus.
    hlavicky = {"User-Agent": ua_pre(url), "Accept": "*/*"}
    if je_wiki(url):
        hlavicky.update({"Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
                         "Accept-Language": "sk,en;q=0.8",
                         "Accept-Encoding": "gzip, deflate"})
    req = urllib.request.Request(url, headers=hlavicky)
    for pokus in range(retry + 1):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                telo = r.read()
                if (r.headers.get("Content-Encoding") or "").lower() == "gzip":
                    import gzip
                    telo = gzip.decompress(telo)
                return telo
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                raise
            if pokus == retry:
                raise
            if e.code == 429:   # „spomaľ", nie „nemáš prístup" — počkaj a skús znova
                time.sleep(25 + pokus * 25)
        except Exception:
            if pokus == retry:
                raise
        time.sleep(2 + pokus * 2)


def json_get(url):
    return json.loads(stiahni(url).decode("utf-8", "replace"))


def nacitaj_recepty():
    out = []
    for cesta in sorted(glob.glob(os.path.join(RECEPTY, "*.json"))):
        with open(cesta, encoding="utf-8") as f:
            out.append((cesta, json.load(f)))
    return out


# ─────────────────────────── konverzia ───────────────────────────
def na_webp(bajty):
    """Orež na 16:9 (stred) a ulož ako WebP. Vráti bajty alebo None."""
    from PIL import Image
    im = Image.open(io.BytesIO(bajty))
    im = im.convert("RGB")
    sw, sh = im.size
    if sw < 200 or sh < 120:
        return None  # príliš malý zdroj, na karte by bol rozmazaný
    s = max(SIRKA / sw, VYSKA / sh)
    im = im.resize((max(SIRKA, int(sw * s + .5)), max(VYSKA, int(sh * s + .5))), Image.LANCZOS)
    l = (im.width - SIRKA) // 2
    t = max(0, int((im.height - VYSKA) * 0.42))  # jedlo býva mierne nad stredom
    im = im.crop((l, t, l + SIRKA, t + VYSKA))
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=KVALITA, method=6)
    return buf.getvalue()


# ─────────────────────────── zdroje ───────────────────────────
def z_thedb(recepty, domena, api, meno, limit):
    """TheCocktailDB / TheMealDB — id je v zdroj_url."""
    kluc = "drinks" if "cocktail" in domena else "meals"
    pole = "strDrinkThumb" if kluc == "drinks" else "strMealThumb"
    najdene = []
    for _, r in recepty:
        u = r.get("zdroj_url") or ""
        if domena not in u:
            continue
        m = re.search(r"/(\d+)(?:$|[/?#])", u)
        if m:
            najdene.append((r, m.group(1)))
    for r, rid in najdene[:limit]:
        try:
            d = json_get(api + rid)
        except Exception as e:
            print(f"  ! {r['id']}: API {e}"); time.sleep(PAUZA); continue
        polozky = (d or {}).get(kluc) or []
        if not polozky:
            time.sleep(PAUZA); continue
        thumb = polozky[0].get(pole)
        if not thumb:
            time.sleep(PAUZA); continue
        yield r, thumb + "/medium", {
            "zdroj": meno,
            "zdroj_url": r.get("zdroj_url"),
            "autor": meno,
            "licencia": meno + " — voľné použitie s uvedením zdroja (AGENTS.md: Credit " + meno + " as the data and image source)",
            "licencia_url": f"https://www.{domena}/api.php",
            "obrazok_url": thumb,
        }
        time.sleep(PAUZA)


def commons_meta(nazov_suboru):
    """Vráti (url, meta) pre súbor na Commons, ak má voľnú licenciu."""
    api = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
           "&iiprop=url|extmetadata&iiurlwidth=320&titles=" + urllib.parse.quote(nazov_suboru))
    d = json_get(api)
    pages = ((d or {}).get("query") or {}).get("pages") or {}
    for _, p in pages.items():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii:
            continue
        em = ii.get("extmetadata") or {}
        def v(k):
            x = em.get(k) or {}
            s = x.get("value") or ""
            return re.sub(r"<[^>]+>", "", str(s)).strip()
        lic = v("LicenseShortName") or v("License")
        if not lic or not VOLNE_LICENCIE.match(lic.replace("‑", "-")):
            return None, {"odmietnute": lic or "neznáma licencia"}
        return ii.get("thumburl") or ii.get("url"), {
            "autor": v("Artist") or "neuvedený",
            "licencia": lic,
            "licencia_url": v("LicenseUrl") or "https://commons.wikimedia.org/wiki/Commons:Licensing",
            "obrazok_url": ii.get("descriptionurl"),
        }
    return None, {"odmietnute": "súbor nenájdený"}


def wiki_lead_images(wiki, tituly):
    """Hlavné obrázky pre až 50 stránok naraz (prop=pageimages).
    Vráti {pôvodný titul: "File:…"} — cez `normalized`/`redirects` mapujeme späť na to,
    na čo sme sa pýtali, inak by sme obrázok priradili nesprávnemu receptu."""
    out = {}
    for i in range(0, len(tituly), 50):
        davka = tituly[i:i + 50]
        api = (f"https://{wiki}/w/api.php?action=query&format=json&prop=pageimages"
               "&piprop=name&redirects=1&titles=" + urllib.parse.quote("|".join(davka)))
        try:
            d = json_get(api)
        except Exception as e:
            print(f"  ! {wiki} dávka {i}: {e}"); time.sleep(PAUZA); continue
        q = (d or {}).get("query") or {}
        # reťazec premenovaní: pýtané → normalizované → presmerované → finálne
        mapa = {}
        for k in ("normalized", "redirects"):
            for m in q.get(k) or []:
                mapa[m["from"]] = m["to"]
        def finalny(t):
            videne = set()
            while t in mapa and t not in videne:
                videne.add(t); t = mapa[t]
            return t
        podla_titulu = {p.get("title"): p for p in (q.get("pages") or {}).values()}
        for t in davka:
            p = podla_titulu.get(finalny(t))
            if p and "missing" not in p and p.get("pageimage"):
                out[t] = "File:" + p["pageimage"]
        time.sleep(PAUZA)
    return out


def commons_meta_davka(subory):
    """Licencie a URL pre až 50 súborov naraz. Vráti {subor: (url, meta)} len pre VOĽNÉ licencie."""
    out = {}
    subory = list(dict.fromkeys(subory))
    for i in range(0, len(subory), 50):
        davka = subory[i:i + 50]
        api = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
               "&iiprop=url|extmetadata&iiurlwidth=320&redirects=1&titles="
               + urllib.parse.quote("|".join(davka)))
        try:
            d = json_get(api)
        except Exception as e:
            print(f"  ! commons dávka {i}: {e}"); time.sleep(PAUZA); continue
        q = (d or {}).get("query") or {}
        mapa = {}
        for k in ("normalized", "redirects"):
            for m in q.get(k) or []:
                mapa[m["from"]] = m["to"]
        def finalny(t):
            videne = set()
            while t in mapa and t not in videne:
                videne.add(t); t = mapa[t]
            return t
        podla = {p.get("title"): p for p in (q.get("pages") or {}).values()}
        for sub in davka:
            p = podla.get(finalny(sub))
            ii = ((p or {}).get("imageinfo") or [None])[0]
            if not ii:
                continue
            em = ii.get("extmetadata") or {}
            def v(k):
                x = (em.get(k) or {}).get("value") or ""
                return re.sub(r"<[^>]+>", " ", str(x)).replace("&amp;", "&").strip()
            lic = (v("LicenseShortName") or v("License")).replace("\u2011", "-")
            if not lic or not VOLNE_LICENCIE.match(lic):
                print(f"  – {sub}: licencia „{lic or 'neznáma'}" + "\u201c → preskočené")
                continue
            out[sub] = (ii.get("thumburl") or ii.get("url"), {
                "autor": re.sub(r"\s+", " ", v("Artist")) or "neuvedený",
                "licencia": lic,
                "licencia_url": v("LicenseUrl") or "https://commons.wikimedia.org/wiki/Commons:Licensing",
                "obrazok_url": ii.get("descriptionurl"),
                "subor": sub,
            })
        time.sleep(PAUZA)
    return out


ZLE_SUBORY = re.compile(r"(icon|logo|flag|map|symbol|commons-|wiki|edit|ambox|question|"
                        r"disambig|stub|crystal|nuvola|gnome|padlock|arrow|blank|placeholder)", re.I)


def z_wikibooks(recepty, limit):
    """Wikibooks Cookbook — anglický názov stránky je v poli `zdroj` (alebo v `zdroj_url`)."""
    kandidati = []
    for _, r in recepty:
        z = r.get("zdroj") or ""
        if not z.startswith("Wikibooks Cookbook"):
            continue
        u = r.get("zdroj_url") or ""
        if u:
            titul = urllib.parse.unquote(u.rsplit("/", 1)[-1]).replace("_", " ")
        else:
            m = re.match(r"Wikibooks Cookbook\s*[\u2013-]\s*(.+?)\s*\(CC BY-SA\)\s*$", z)
            if not m:
                continue
            titul = "Cookbook:" + m.group(1)
        kandidati.append((r, titul))
    kandidati = kandidati[:limit]
    print(f"  kandidátov: {len(kandidati)}")
    obr = wiki_lead_images("en.wikibooks.org", [t for _, t in kandidati])
    obr = {t: s for t, s in obr.items() if not ZLE_SUBORY.search(s)}
    print(f"  s obrázkom: {len(obr)}")
    meta_map = commons_meta_davka(list(obr.values()))
    print(f"  s voľnou licenciou: {len(meta_map)}")
    for r, titul in kandidati:
        sub = obr.get(titul)
        if not sub or sub not in meta_map:
            continue
        url, meta = meta_map[sub]
        meta = dict(meta)
        meta.update({"zdroj": "Wikimedia Commons (cez Wikibooks Cookbook: " + titul + ")",
                     "zdroj_url": "https://en.wikibooks.org/wiki/" + urllib.parse.quote(titul.replace(" ", "_"))})
        yield r, url, meta


def norm(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\(.*?\)", " ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def z_wikipedia(recepty, limit, hotove):
    """Kanonické názvy jedál: sk/cs Wikipédia → hlavný obrázok na Commons.
    PRÍSNE: názov článku sa musí po normalizácii ROVNAŤ názvu receptu. Voľnejšie
    párovanie dávalo nezmysly („Šalát s kuracím mäsom" → článok „Šalát")."""
    kandidati = [r for _, r in recepty
                 if r["id"] not in hotove and 1 <= len(norm(r["nazov"]).split()) <= 4]
    # jeden článok = jeden recept (prvý v abecede), inak by 5 „palaciniek" dostalo tú istú fotku
    podla_nazvu = {}
    for r in kandidati:
        podla_nazvu.setdefault(norm(r["nazov"]), r)
    tituly = {}
    for n, r in podla_nazvu.items():
        t = r["nazov"].strip()
        tituly[t[:1].upper() + t[1:]] = r
    print(f"  kandidátov (unikátnych názvov): {len(tituly)}")
    zostava = dict(tituly)
    najdene = {}
    for wiki in ("sk.wikipedia.org", "cs.wikipedia.org"):
        if not zostava:
            break
        obr = wiki_lead_images(wiki, list(zostava))
        for t, sub in obr.items():
            if ZLE_SUBORY.search(sub):
                continue
            najdene[t] = (wiki, sub)
            zostava.pop(t, None)
        print(f"  {wiki}: +{len(obr)} (zostáva {len(zostava)})")
    meta_map = commons_meta_davka([s for _, s in najdene.values()])
    print(f"  s voľnou licenciou: {len(meta_map)}")
    n = 0
    for t, (wiki, sub) in najdene.items():
        if n >= limit:
            break
        if sub not in meta_map:
            continue
        r = tituly[t]
        url, meta = meta_map[sub]
        meta = dict(meta)
        meta.update({"zdroj": "Wikimedia Commons (cez " + wiki + ": " + t + ")",
                     "zdroj_url": "https://" + wiki + "/wiki/" + urllib.parse.quote(t.replace(" ", "_"))})
        n += 1
        yield r, url, meta


# ─────────────────────────── beh ───────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zdroj", default="vsetko",
                    choices=["vsetko", "cocktaildb", "mealdb", "wikibooks", "wikipedia"])
    ap.add_argument("--limit", type=int, default=10 ** 6)
    ap.add_argument("--suchy", action="store_true", help="nič nezapisuj")
    a = ap.parse_args()

    os.makedirs(FOTKY, exist_ok=True)
    recepty = nacitaj_recepty()
    zdroje = {}
    if os.path.exists(ZDROJE):
        zdroje = json.load(open(ZDROJE, encoding="utf-8"))

    prudy = []
    if a.zdroj in ("vsetko", "cocktaildb"):
        prudy.append(("TheCocktailDB", z_thedb(recepty, "thecocktaildb.com",
                      "https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=", "TheCocktailDB", a.limit)))
    if a.zdroj in ("vsetko", "mealdb"):
        prudy.append(("TheMealDB", z_thedb(recepty, "themealdb.com",
                      "https://www.themealdb.com/api/json/v1/1/lookup.php?i=", "TheMealDB", a.limit)))
    if a.zdroj in ("vsetko", "wikibooks"):
        prudy.append(("Wikibooks Cookbook", z_wikibooks(recepty, a.limit)))
    if a.zdroj in ("vsetko", "wikipedia"):
        prudy.append(("Wikipédia/Commons", z_wikipedia(recepty, a.limit, set(zdroje))))

    ulozene = 0
    for meno, prud in prudy:
        print(f"\n── {meno} ──")
        for r, url, meta in prud:
            rid = r["id"]
            if rid in zdroje and os.path.exists(os.path.join(FOTKY, rid + ".webp")):
                continue
            try:
                sur = stiahni(url)
            except Exception as e:
                print(f"  ! {rid}: sťahovanie {e}")
                time.sleep(PAUZA * 3); continue
            time.sleep(PAUZA * (2 if je_wiki(url) else 1))
            try:
                web = na_webp(sur)
            except Exception as e:
                print(f"  ! {rid}: konverzia {e}"); continue
            if not web:
                print(f"  – {rid}: zdroj príliš malý"); continue
            if not a.suchy:
                with open(os.path.join(FOTKY, rid + ".webp"), "wb") as f:
                    f.write(web)
                meta["bajtov"] = len(web)
                meta["rozmer"] = f"{SIRKA}x{VYSKA}"
                meta["stiahnute"] = time.strftime("%Y-%m-%d")
                zdroje[rid] = meta
                with open(ZDROJE, "w", encoding="utf-8") as f:
                    json.dump(zdroje, f, ensure_ascii=False, indent=1, sort_keys=True)
            ulozene += 1
            print(f"  ✓ {rid}  {len(web)} B  ({meta.get('licencia','')[:40]})")

    print(f"\nUložených nových fotiek: {ulozene}. Spolu v ZDROJE.json: {len(zdroje)}")


if __name__ == "__main__":
    main()
