"""Recepty z EPUB kuchárok (Downloads\\Kuchárky) do import_knihy/epub/<kod>_raw.jsonl.

Formát riadku je rovnaký ako import_web/raw.jsonl (preklad podľa import_web/PREKLAD.md,
import cez scripts/import_web.js --staging). Fotka receptu sa vyreže na 480×270 WebP do
import_knihy/epub/fotky/<kod>-<n>.webp a jej cesta ide do poľa `foto`.

Knihy (Insight Editions) majú rovnakú kostru, len iné triedy: ingrediencia = trieda *item,
krok = *step, názov = h2 (GTA h3.h3rec), celostranová fotka = samostatná stránka div.ipadfp.
Recept môže pokračovať na ďalšej stránke — zbiera sa až po ďalší názov.

  py scripts/zber_epub.py <kniha.epub> [--kod minecraft] [--nasucho]
"""
import html, io, json, re, sys, zipfile, posixpath
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from zber_web import ingrediencia, fahrenheit, cisty   # noqa: E402
from stiahni_fotky import na_webp                      # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
KOREN = Path(__file__).resolve().parent.parent
VYSTUP = KOREN / "import_knihy" / "epub"

TAG = re.compile(r'<(h[1-4]|p|li)\b([^>]*)>(.*?)(?=<(?:h[1-4]|p|li|/ul|/ol|/div|/section)\b|$)', re.S | re.I)
ITEM = re.compile(r"^(r-?|rec)?items?[a-z0-9]?$|^item$")           # li.item, li.ritem, li.r-item, p.item, li.itema
SKUP = re.compile(r"^(r-?)?(itemh(ead)?\d?[a-z]?|ingredhead|r-itemhead)$")
KROK = re.compile(r"^(r-?)?steps?[a-z0-9]?$|^step-para$|^num$")
META = re.compile(r"serv|prep|yield|spec|stats|difficulty")


def trieda(attrs):
    m = re.search(r'class="([^"]+)"', attrs)
    return m[1].split()[0] if m else ""


def spine(z):
    opf = re.search(r'full-path="([^"]+)"', z.read("META-INF/container.xml").decode())[1]
    t = z.read(opf).decode("utf8", "replace")
    man = {m[1]: m[2] for m in re.finditer(r'<item\b[^>]*id="([^"]+)"[^>]*href="([^"]+)"', t)}
    man.update({m[2]: m[1] for m in re.finditer(r'<item\b[^>]*href="([^"]+)"[^>]*id="([^"]+)"', t)})
    zaklad = posixpath.dirname(opf)
    return [posixpath.normpath(posixpath.join(zaklad, html.unescape(man[i])))
            for i in re.findall(r'<itemref\b[^>]*idref="([^"]+)"', t) if i in man]


def stranka(z, cesta):
    t = z.read(cesta).decode("utf8", "replace")
    t = t.split("<body", 1)[-1]
    s = {"cesta": cesta, "nazov": "", "kapitola": "", "ing": [], "kroky": [], "meta": [], "img": [], "text": 0,
         "strany": [int(x) for x in re.findall(r'id="page_(\d+)"', t)]}
    strana = None                                # obrázok patrí strane poslednej značky pred ním
    for m in re.finditer(r'id="page_(\d+)"|<img\b[^>]*src="([^"]+)"', t):
        if m[1]:
            strana = int(m[1]); continue
        p = posixpath.normpath(posixpath.join(posixpath.dirname(cesta), html.unescape(m[2])))
        if p in z.NameToInfo and z.getinfo(p).file_size > 150_000:     # ikonky, ozdoby a herné ilustrácie sú menšie
            s["img"].append((p, strana))
    skupina = ""
    for m in TAG.finditer(t):
        tag, cl, obsah = m[1].lower(), trieda(m[2]), cisty(m[3])
        if not obsah:
            continue
        s["text"] += len(obsah)
        if tag == "h1":
            s["kapitola"] = s["kapitola"] or obsah
        elif tag in ("h2", "h3") and not s["nazov"] and not s["ing"] and (tag == "h2" or "rec" in cl):
            s["nazov"] = obsah
        elif SKUP.match(cl):
            skupina = obsah.rstrip(":")
        elif ITEM.match(cl) and not re.match(r"\d+[.,]\s+[A-Z]", obsah):   # „10. Cut into…“ = krok s triedou item
            s["ing"].append((skupina, obsah))
        elif ITEM.match(cl):
            s["kroky"].append(re.sub(r"^\d+[.,]\s*", "", obsah))
        elif KROK.match(cl):
            s["kroky"].append(re.sub(r"^\d+\.\s*", "", obsah))
        elif META.search(cl) and len(obsah) < 300:
            s["meta"].append(obsah)
    return s


def palce(s):
    return re.sub(r"(\d+(?:\.\d+)?)[- ]?inch(es)?\b", lambda m: f"{m[0]} (= {round(float(m[1]) * 2.54)} cm)", s)


def cislo_z(txt, rx):
    m = re.search(rx, txt, re.I)
    return int(m[1]) if m else 0


def minuty(txt):
    spolu = 0
    for m in re.finditer(r"(?:prep|cook|chill|rest|bake|total)[a-z ]*time[: ]+([^|]*)", txt, re.I):
        if re.search(r"total", m[0], re.I):
            spolu = 0
        h = cislo_z(m[1], r"(\d+)\s*(?:hours?|hrs?)")
        mi = cislo_z(m[1], r"(\d+)\s*(?:minutes?|mins?)")
        spolu += h * 60 + mi
        if re.search(r"total", m[0], re.I):
            return spolu
    return spolu


def zber(epub, kod, nasucho=False):
    z = zipfile.ZipFile(epub)
    opf = z.read(re.search(r'full-path="([^"]+)"', z.read("META-INF/container.xml").decode())[1]).decode("utf8", "replace")
    dc = lambda k: html.unescape((re.findall(rf"<dc:{k}[^>]*>([^<]+)", opf) or [""])[0]).strip()
    kniha, vydavatel = dc("title"), dc("publisher")
    strany = [stranka(z, c) for c in spine(z) if c in z.NameToInfo]
    recepty, akt, kapitola = [], None, ""
    for i, s in enumerate(strany):
        kapitola = s["kapitola"] or kapitola
        if s["nazov"]:
            akt = {"strany": [i], "nazov": s["nazov"], "kap": kapitola, "ing": list(s["ing"]),
                   "kroky": list(s["kroky"]), "meta": list(s["meta"])}
            recepty.append(akt)
        elif akt and (s["ing"] or s["kroky"]) and not s["kapitola"]:
            akt["strany"].append(i)
            akt["ing"] += s["ing"]; akt["kroky"] += s["kroky"]; akt["meta"] += s["meta"]
        elif s["kapitola"]:
            akt = None
    recepty = [r for r in recepty if len(r["ing"]) >= 2 and r["kroky"]]
    if sum(bool(r["meta"]) for r in recepty) > len(recepty) / 2:     # kniha s meta: bez nej = plán menu, úvod
        recepty = [r for r in recepty if r["meta"]]

    # fotka: podľa strany tlačenej knihy. EPUB zhŕňa celostranové fotky do samostatných súborov
    # mimo poradia, ale recept a jeho fotka ležia na jednej dvojstrane (2k, 2k+1). Poradie:
    # tá istá strana → tá istá dvojstrana → susedná strana. Najväčší obrázok vyhráva.
    for r in recepty:
        r["p"] = {p for j in r["strany"] for p in strany[j]["strany"]}
    kandidati = {}
    for s in strany:
        for img, p in s["img"]:
            if p is None:
                continue
            for test in (lambda q: q == p, lambda q: q // 2 == p // 2, lambda q: abs(q - p) == 1):
                r = next((r for r in recepty if any(test(q) for q in r["p"])), None)
                if r:
                    kandidati.setdefault(id(r), []).append(img); break
    def textura(p):          # ozdobná celostranová textúra (Minecraft: hlina): po zmenšení jednoliata, fotky ≥ 16
        from PIL import Image, ImageStat
        return ImageStat.Stat(Image.open(io.BytesIO(z.read(p))).convert("L").resize((12, 7))).stddev[0] < 6
    for r in recepty:
        imgs = [p for p in kandidati.get(id(r), []) if not textura(p)]
        r["img"] = max(imgs, key=lambda p: z.getinfo(p).file_size) if imgs else None

    VYSTUP.joinpath("fotky").mkdir(parents=True, exist_ok=True)
    riadky, bez_fotky, flagy = [], 0, 0
    for n, r in enumerate(recepty, 1):
        meta = " | ".join(r["meta"])
        foto = ""
        if r["img"] and not nasucho:
            web = na_webp(z.read(r["img"]))
            if web:
                foto = f"import_knihy/epub/fotky/{kod}-{n:03d}.webp"
                (KOREN / foto).write_bytes(web)
        elif r["img"]:
            foto = r["img"]
        bez_fotky += not foto
        ing = []
        for skup, t in r["ing"]:
            x = ingrediencia(t)
            if skup:
                x["skupina"] = skup
            flagy += bool(x["flag"])
            ing.append(x)
        riadky.append({
            "url": f"kniha:{kod}/{posixpath.basename(strany[r['strany'][0]]['cesta'])}", "web": kod,
            "kniha": kniha, "vydavatel": vydavatel,
            "nazov_en": r["nazov"].title() if r["nazov"].isupper() else r["nazov"],
            "porcie": cislo_z(meta, r"(?:yield|serves|servings|makes)[: ]*(?:about\s+)?(\d+)"),
            "min": minuty(meta), "kategoria_web": r["kap"], "meta": meta, "kcal_web": None,
            "ing": ing, "kroky": [palce(fahrenheit(k)) for k in r["kroky"]], "foto": foto})

    print(f"{Path(epub).name}: strán {len(strany)} · receptov {len(riadky)} · bez fotky {bez_fotky} · "
          f"bez porcií {sum(not x['porcie'] for x in riadky)} · bez času {sum(not x['min'] for x in riadky)} · "
          f"ingrediencií s príznakom {flagy}")
    if not nasucho:
        out = VYSTUP / f"{kod}_raw.jsonl"
        out.write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in riadky), encoding="utf-8")
        print(f"→ {out.relative_to(KOREN)}")
    return riadky


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    kod = next((x[6:] for x in sys.argv if x.startswith("--kod=")), None) or re.sub(r"[^a-z0-9]+", "", Path(a[0]).stem.lower())[:20]
    zber(a[0], kod, "--nasucho" in sys.argv)
