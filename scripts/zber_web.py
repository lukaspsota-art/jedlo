"""Zber receptov z verejných webov (schema.org Recipe JSON-LD) do import_web/raw.jsonl.

Nepreraziteľné pravidlá: robots.txt pre náš UA aj pre všetkých Anthropic agentov, najviac
1 request / 4 s na doménu, poctivý User-Agent, pri 403 / 429 / Cloudflare výzve / CAPTCHA
sa web preskočí a nič sa neobchádza. Z HTML sa číta LEN JSON-LD Recipe — fotky, úvody
a komentáre nie. Anglický postup ide do raw.jsonl len ako predloha pre vlastný slovenský
text; súbor je v .gitignore a po importe sa maže.

Pokračovateľné: raw.jsonl a preskocene.jsonl sú append-only s kľúčom URL, každá URL sa
skúša najviac raz. Po prerušení stačí spustiť ten istý príkaz znova.

  py scripts/zber_web.py urls              sitemapy → import_web/urls_<web>.txt (raz)
  py scripts/zber_web.py zber <kat> <n>    dozbiera n receptov kategórie (striedavo z webov)
  py scripts/zber_web.py stav              počty raw / staging podľa kategórie a webu → progress.json
Kategórie: ranajky polievky maso bezmaso prilohy salaty dezerty pecenie
"""
import html, json, random, re, sys, time, urllib.error, urllib.request, urllib.robotparser
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
KOREN = Path(__file__).resolve().parent.parent
DIR = KOREN / "import_web"
RAW, PRESK, STAGING, PROGRESS = (DIR / f for f in ("raw.jsonl", "preskocene.jsonl", "staging.jsonl", "progress.json"))
UA = "JedloKucharka/1.0 (personal offline cookbook import; run by Claude Code on the owner's behalf)"
AGENTI = [UA, "*", "ClaudeBot", "Claude-User", "anthropic-ai", "Claude-SearchBot"]
ODSTUP = 4.0
LIMIT_WEB = 150
CIEL = {"ranajky": 30, "polievky": 40, "maso": 70, "bezmaso": 40,
        "prilohy": 25, "salaty": 25, "dezerty": 40, "pecenie": 30}

WEBY = {
    "bbcgf": {"nazov": "BBC Good Food", "sitemap": "https://www.bbcgoodfood.com/sitemap.xml",
              "sub": r"-recipe\.xml$", "url": r"^https://www\.bbcgoodfood\.com/recipes/[a-z0-9-]+$"},
    "natasha": {"nazov": "Natasha's Kitchen", "sitemap": "https://natashaskitchen.com/sitemap_index.xml",
                "sub": r"/post-sitemap\d*\.xml$", "url": r"^https://natashaskitchen\.com/[a-z0-9-]+/$"},
}
NIE_RECEPT = r"recipes|best-|ideas|round-?up|gift|review|giveaway|menu|guide"

# slug-nápoveda: ktoré URL sa oplatí stiahnuť pre danú kategóriu (o zaradení rozhoduje až JSON-LD)
SLUG = {
    "ranajky": r"breakfast|pancake|waffle|omelet|frittata|granola|porridge|oats|french-toast|shakshuka|crepe|brunch|scrambled|benedict|hash-brown",
    "polievky": r"soup|chowder|bisque|gazpacho|minestrone|broth|borscht|ramen|laksa",
    "maso": r"chicken|beef|pork|lamb|turkey|sausage|meatball|steak|salmon|fish|prawn|shrimp|cod|bacon|ham|bolognese|stroganoff|goulash|lasagn|casserole|stew|curry|pie|burger|taco|fajita|roast",
    "bezmaso": r"vegetarian|vegan|veggie|lentil|chickpea|bean|halloumi|tofu|paneer|mushroom|aubergine|eggplant|cauliflower|squash|spinach|risotto|gnocchi|pasta|mac-and-cheese|dhal|dal|falafel",
    "prilohy": r"potato|mash|wedges|chips|fries|rice|pilaf|couscous|gratin|dauphinoise|carrot|green-bean|broccoli|brussels|cabbage|side|yorkshire|polenta|corn|asparagus|roasted-veg",
    "salaty": r"salad|slaw",
    "dezerty": r"cheesecake|brownie|cookie|pudding|crumble|tart|mousse|trifle|pavlova|tiramisu|panna-cotta|ice-cream|fudge|dessert|cake|sundae|parfait|souffle|eclair|profiterole|churro|blondie",
    "pecenie": r"bread|loaf|rolls|buns|focaccia|scone|muffin|brioche|bagel|pretzel|flatbread|naan|sourdough|cinnamon-roll|babka|challah|ciabatta|biscuit|pizza-dough|croissant|danish|teacake",
}
MASO = r"\b(chicken|beef|pork|lamb|mutton|turkey|duck|veal|venison|bacon|ham|gammon|sausages?|chorizo|pancetta|prosciutto|salami|pepperoni|mince|steaks?|meatballs?|salmon|tuna|cod|haddock|mackerel|trout|sea bass|fish|prawns?|shrimps?|mussels|squid|crab|lobster|scallops?|anchov\w*|sardines?|clams?|kielbasa)\b"
VYVAR = r"\b(chicken|beef|lamb|pork|fish|turkey)\s+(stock|broth|bouillon|gravy)\w*|fish sauce|oyster sauce"
ZIVOCISNE = VYVAR + r"|anchov|gelatin|lard|suet|worcestershire"
HLAVNE = r"curry|pasta|spaghetti|risotto|stew|pie|lasagn|burger|taco|bake|casserole|gnocchi|dhal|dal\b|chilli|chili|stir.?fry|noodle|pizza|enchilada|quesadilla|falafel|tart|frittata|fritters|burrito|mac and cheese|shakshuka|ragu|stuffed|traybake|bowl"
SLADKE_NIE = r"(fish|crab|potato|rice|pan|salmon)\s?cakes?\b"

# ---------- HTTP s odstupom na doménu ----------
_posledny, _robots = {}, {}


def get(url):
    dom = url.split("/")[2]
    cakaj = _posledny.get(dom, 0) + ODSTUP - time.time()
    if cakaj > 0:
        time.sleep(cakaj)
    _posledny[dom] = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,application/xml"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:
        return 0, ""


def blokovane(status, txt):
    # bežné stránky s 200 majú vložený Cloudflare skript (challenge-platform/scripts/jsd) aj reCAPTCHA
    # pre komentáre — výzva je až samotná stránka výzvy
    return status in (401, 403, 429, 503) or bool(re.search(
        r"<title>\s*(Just a moment|Attention Required)|_cf_chl_opt|cf-chl-widget|g-recaptcha[^>]*data-callback=\"onSubmit", txt[:20000], re.I))


def smie(url):
    base = "/".join(url.split("/")[:3])
    if base not in _robots:
        st, txt = get(base + "/robots.txt")
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(txt.splitlines() if st == 200 else ["User-agent: *", "Disallow: /"])
        _robots[base] = rp
    return all(_robots[base].can_fetch(a, url) for a in AGENTI)


# ---------- JSON-LD ----------
def jsonld_recept(txt):
    for blok in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', txt, re.S):
        try:
            d = json.loads(blok)
        except Exception:
            continue
        for x in (d if isinstance(d, list) else d.get("@graph", [d])):
            t = x.get("@type") if isinstance(x, dict) else None
            if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
                return x
    return None


def cisty(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(s)))).strip()


def kroky(ins):
    if isinstance(ins, str):
        return [cisty(x) for x in re.split(r"\n+|<br\s*/?>|</p>", ins) if cisty(x)]
    out = []
    for x in ins or []:
        if isinstance(x, str):
            out.append(cisty(x))
        elif x.get("@type") == "HowToSection":
            out += kroky(x.get("itemListElement"))
        else:
            out.append(cisty(x.get("text") or x.get("name") or ""))
    return [s for s in out if s]


def minuty(iso):
    m = re.match(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?", str(iso or ""))
    return (int(m[1] or 0) * 1440 + int(m[2] or 0) * 60 + int(m[3] or 0)) if m else 0


def fahrenheit(s):
    return re.sub(r"(\d{3})\s*°?\s*F\b", lambda m: f"{m[1]} °F (= {round((int(m[1]) - 32) * 5 / 9 / 5) * 5} °C)", s)


# ---------- prevod ingrediencií ----------
ZLOMKY = {"½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅛": "1/8"}
Q = r"(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)"
JED = [  # (regex, jednotka, násobok) — poradie je dôležité (fl oz pred oz)
    (r"fl\.?\s*oz|fluid ounces?", "ml", 29.57), (r"oz|ounces?", "g", 28.35), (r"lbs?|pounds?", "g", 453.6),
    (r"kg|kilograms?", "g", 1000), (r"g|grams?", "g", 1), (r"ml|millilit(?:er|re)s?", "ml", 1),
    (r"l|lit(?:er|re)s?", "ml", 1000), (r"tbsp|tablespoons?|tbs|tbl", "PL", 1), (r"tsp|teaspoons?", "ČL", 1),
    (r"cups?", "cup", 1), (r"pinch(?:es)?", "štipka", 1), (r"cloves?", "strúčik", 1), (r"slices?", "plátok", 1),
    (r"bunch(?:es)?", "zväzok", 1), (r"handfuls?", "hrsť", 1), (r"sprigs?", "vetvička", 1), (r"sticks?", "stick", 1),
]
# g na 1 US cup (240 ml); "ml" = tekutina. Prvá zhoda vyhráva. Čo tu nie je, dostane príznak.
CUP = [
    (r"water|milk|buttermilk|cream\b|half.and.half|broth|stock|juice|wine|oil|vinegar|sauce|syrup|coffee|beer", "ml"),
    (r"bread flour", 130), (r"whole wheat flour|wholemeal", 120), (r"flour", 125), (r"cornstarch|cornflour", 128),
    (r"powdered sugar|icing sugar|confectioner", 120), (r"brown sugar", 220), (r"sugar", 200), (r"honey", 340),
    (r"butter", 227), (r"cooked rice", 160), (r"rice", 185), (r"oats", 90), (r"cocoa", 85),
    (r"cream cheese", 230), (r"ricotta|cottage", 240), (r"parmesan", 90), (r"cheese", 100),
    (r"chocolate chips", 170), (r"walnut|pecan|almond|cashew|peanuts|hazelnut", 120), (r"panko", 60),
    (r"bread ?crumbs", 108), (r"sauerkraut", 142), (r"cabbage", 89), (r"celery", 101), (r"quinoa", 170),
    (r"grapes", 151), (r"cherries", 154), (r"parsley", 60), (r"yogh?urt|sour cream", 245), (r"mayonnaise|mayo", 220), (r"peanut butter", 250),
    (r"peas|corn\b|sweetcorn", 145), (r"beans|chickpeas|lentils", 180), (r"onion", 160),
    (r"tomatoes", 180), (r"spinach|kale|arugula|rocket|lettuce", 30), (r"berries|blueberr|raspberr|strawberr", 150),
    (r"raisins|cranberries", 150), (r"coconut", 85), (r"shredded chicken|cooked chicken", 140),
]


def cislo(t):
    t = t.strip().replace(",", ".")
    if " " in t:
        a, b = t.split(None, 1)
        return cislo(a) + cislo(b)
    if "/" in t:
        a, b = t.split("/")
        return float(a) / float(b)
    return float(t)


def ingrediencia(orig):
    s = cisty(orig)
    s = re.sub(r"(\d)?\s*([½⅓⅔¼¾⅛])", lambda m: (m[1] + " " if m[1] else "") + ZLOMKY[m[2]], s)
    out = {"orig": s, "q": None, "u": None, "co": s, "flag": None}
    m = re.match(rf"\s*{Q}\s*x\s*{Q}\s*(g|ml)\b\s*(.*)", s, re.I)            # „2 x 400g cans“
    if m:
        out.update(q=round(cislo(m[1]) * cislo(m[2])), u=m[3].lower(), co=m[4])
        return out
    m = re.match(rf"\s*{Q}(?:\s*(?:-|–|to)\s*{Q})?\s*(.*)", s)
    if not m:
        return out
    q, zvysok = cislo(m[1]), m[3]
    m2 = re.match(rf"\(\s*{Q}\s*(oz|ounces?|g|ml)\s*\)\s*(?:cans?|tins?|packages?|pkgs?|jars?|boxes?|bags?|containers?)?\s*(.*)", zvysok, re.I)
    if m2:                                                                   # „1 (15 oz) can beans“
        n = 28.35 if m2[2].lower().startswith(("oz", "ounce")) else 1
        out.update(q=round(q * cislo(m2[1]) * n), u="ml" if m2[2].lower() == "ml" else "g", co=m2[3])
        return out
    for rx, u, k in JED:
        m3 = re.match(rf"({rx})\.?(?![a-z])\s*(?:of\s+)?(.*)", zvysok, re.I)
        if not m3:
            continue
        co = m3[2]
        if u == "cup":
            for rxc, g in CUP:
                if re.search(rxc, co, re.I):
                    out.update(q=round(q * (240 if g == "ml" else g)), u="ml" if g == "ml" else "g", co=co)
                    return out
            out.update(q=q, u="šálka", co=co, flag=f"cup bez známej hustoty: {s}")
            return out
        if u == "stick":
            if re.search(r"butter", co, re.I):
                out.update(q=round(q * 113), u="g", co=co)
            elif re.search(r"celery", co, re.I):                             # „1 stick celery“ = 1 stonka
                out.update(q=q, u="ks", co=co)
            else:
                out.update(q=q, u="ks", co=co, flag=f"neznámy „stick“: {s}")
            return out
        qq = q * k
        out.update(q=round(qq) if u in ("g", "ml") else round(qq, 2), u=u, co=co)
        return out
    out.update(q=round(q, 2), u="ks", co=zvysok)                              # „2 large eggs“
    return out


# ---------- zaradenie do kategórie ----------
def pasuje(kat, r, slug):
    meno = (r["nazov_en"] + " " + slug).lower()
    kw = (r["kategoria_web"] + " " + r.get("_kw", "")).lower()
    ing = " | ".join(i["orig"] for i in r["ing"]).lower()
    maso = bool(re.search(MASO, re.sub(VYVAR, "", ing)))
    if kat == "polievky":
        return bool(re.search(SLUG["polievky"], meno))
    if kat == "salaty":
        return bool(re.search(r"salad|slaw", meno)) and "dressing" not in meno
    if kat == "pecenie":
        return bool(re.search(SLUG["pecenie"], meno)) and not maso
    if kat == "dezerty":
        return (bool(re.search(SLUG["dezerty"], meno)) or "dessert" in kw) and not maso \
            and not re.search(SLADKE_NIE, meno) and not re.search(SLUG["pecenie"], meno)
    if kat == "ranajky":
        return bool(re.search(SLUG["ranajky"], meno) or re.search(r"breakfast|brunch", kw))
    if kat == "prilohy":
        return (bool(re.search(r"side", kw)) or bool(re.search(SLUG["prilohy"], meno))) and not maso \
            and not re.search(r"soup|salad|cake|bread", meno)
    if kat == "maso":
        return maso and not re.search(r"soup|salad|breakfast", meno)
    if kat == "bezmaso":
        return not re.search(ZIVOCISNE, ing) and not re.search(MASO, ing) \
            and bool(re.search(HLAVNE, meno) or re.search(r"main|dinner|supper", kw)) \
            and not re.search(r"soup|salad|cake|bread|dessert", meno) \
            and not re.search(r"dessert|sweet|baking|afternoon tea|treat", kw)
    return False


def zarad(ciel, r, slug, volne):
    if pasuje(ciel, r, slug) and volne.get(ciel, 0) > 0:
        return ciel
    for k in CIEL:
        if k != ciel and volne.get(k, 0) > 0 and pasuje(k, r, slug):
            return k
    return None


# ---------- stav ----------
def citaj(p):
    return [json.loads(x) for x in p.read_text(encoding="utf-8").splitlines() if x.strip()] if p.exists() else []


def pripis(p, obj):
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def v_db():
    urls, mena = set(), set()
    for f in (KOREN / "recepty").glob("*.json"):
        d = json.loads(f.read_text(encoding="utf-8"))
        urls.add(str(d.get("zdroj_url", "")).rstrip("/"))
        mena.add(norm(str(d.get("zdroj", "")).split(" – ")[-1]))
    return urls, mena


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).replace(" recipe", "").strip()


def stav(vypis=True):
    raw, st, pr = citaj(RAW), citaj(STAGING), citaj(PRESK)
    by = lambda rows, k: {x: sum(1 for r in rows if r.get(k) == x) for x in sorted({r.get(k) for r in rows})}
    p = {"raw_kat": by(raw, "kat"), "raw_web": by(raw, "web"), "staging_kat": by(st, "_kat"),
         "staging_web": by(st, "_web"), "preskocene": len(pr), "ciel": CIEL,
         "cas": time.strftime("%Y-%m-%d %H:%M")}
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding="utf-8")
    if vypis:
        print(json.dumps(p, ensure_ascii=False))
    return raw


# ---------- príkazy ----------
def urls():
    for kod, w in WEBY.items():
        if not smie(w["sitemap"]):
            print(f"{w['nazov']}: sitemap zakázaná robots.txt — preskakujem")
            continue
        st, idx = get(w["sitemap"])
        if blokovane(st, idx) or st != 200:
            print(f"{w['nazov']}: sitemap HTTP {st} — preskakujem")
            continue
        subs = [u for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", idx) if re.search(w["sub"], u)]
        zoz = []
        for s in subs:
            st, x = get(s)
            zoz += [u for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", x) if re.search(w["url"], u)]
        zoz = sorted({u for u in zoz if not re.search(NIE_RECEPT, u.rstrip("/").rsplit("/", 1)[-1])})
        (DIR / f"urls_{kod}.txt").write_text("\n".join(zoz) + "\n", encoding="utf-8")
        print(f"{w['nazov']}: {len(subs)} sitemap, {len(zoz)} URL")


def zber(ciel, n):
    raw = stav(False)
    hotovo = {r["url"] for r in raw} | {r["url"] for r in citaj(PRESK)}
    db_urls, db_mena = v_db()
    mena = {norm(r["nazov_en"]) for r in raw} | db_mena
    volne = {k: CIEL[k] - sum(1 for r in raw if r["kat"] == k) for k in CIEL}
    web_n = {k: sum(1 for r in raw if r["web"] == k) for k in WEBY}
    fronty = {}
    for kod in WEBY:
        p = DIR / f"urls_{kod}.txt"
        zoz = p.read_text(encoding="utf-8").split() if p.exists() else []
        random.Random(7).shuffle(zoz)                       # deterministické poradie = pokračovateľné
        fronty[kod] = iter([u for u in zoz if u not in hotovo and u.rstrip("/") not in db_urls
                            and re.search(SLUG[ciel], u.rstrip("/").rsplit("/", 1)[-1])])
    ok = {k: 0 for k in WEBY}; zle = {k: 0 for k in WEBY}; ziskane = 0; aktivne = set(WEBY)
    while ziskane < n and volne[ciel] > 0 and aktivne:
        for kod in list(aktivne):
            if ziskane >= n or volne[ciel] <= 0:
                break
            if web_n[kod] >= LIMIT_WEB:
                aktivne.discard(kod); continue
            url = next(fronty[kod], None)
            if url is None:
                aktivne.discard(kod); continue
            if not smie(url):
                pripis(PRESK, {"url": url, "web": kod, "dovod": "robots.txt zakazuje"}); continue
            st, txt = get(url)
            if blokovane(st, txt):
                pripis(PRESK, {"url": url, "web": kod, "dovod": f"HTTP {st} / výzva — web preskočený"})
                print(f"✗ {WEBY[kod]['nazov']}: HTTP {st} alebo výzva — web vyraďujem"); aktivne.discard(kod); continue
            if st != 200:
                zle[kod] += 1
                pripis(PRESK, {"url": url, "web": kod, "dovod": f"HTTP {st}"})
            else:
                ok[kod] += 1
                j = jsonld_recept(txt)
                if not j or not j.get("recipeIngredient") or not j.get("recipeInstructions"):
                    pripis(PRESK, {"url": url, "web": kod, "dovod": "bez úplného Recipe JSON-LD"}); continue
                kw = j.get("keywords", ""); kw = ", ".join(kw) if isinstance(kw, list) else str(kw)
                kat_web = j.get("recipeCategory", ""); kat_web = ", ".join(kat_web) if isinstance(kat_web, list) else str(kat_web)
                cu = j.get("recipeCuisine", ""); cu = ", ".join(cu) if isinstance(cu, list) else str(cu)
                y = j.get("recipeYield"); y = y[0] if isinstance(y, list) and y else y
                my = re.search(r"\d+", str(y or ""))
                kc = re.search(r"\d+", str((j.get("nutrition") or {}).get("calories", "")))
                r = {"url": url, "web": kod, "kat": None, "nazov_en": cisty(j.get("name", "")),
                     "porcie": int(my[0]) if my else None,
                     "min": minuty(j.get("totalTime")) or minuty(j.get("prepTime")) + minuty(j.get("cookTime")),
                     "kuchyna_web": cu, "kategoria_web": kat_web, "kcal_web": int(kc[0]) if kc else None,
                     "ing": [ingrediencia(i) for i in j["recipeIngredient"]],
                     "kroky": [fahrenheit(k) for k in kroky(j["recipeInstructions"])], "_kw": kw}
                if norm(r["nazov_en"]) in mena:
                    pripis(PRESK, {"url": url, "web": kod, "dovod": f"duplicita názvu: {r['nazov_en']}"}); continue
                kat = zarad(ciel, r, url.rstrip("/").rsplit("/", 1)[-1], volne)
                if not kat:
                    pripis(PRESK, {"url": url, "web": kod, "dovod": f"nesedí kategória / plná: {r['nazov_en']}"}); continue
                r["kat"] = kat; del r["_kw"]
                pripis(RAW, r); mena.add(norm(r["nazov_en"]))
                volne[kat] -= 1; web_n[kod] += 1
                if kat == ciel:
                    ziskane += 1
                print(f"+ {kat:9} {kod:8} {r['nazov_en'][:60]}")
            t = ok[kod] + zle[kod]
            if t >= 10 and zle[kod] / t > 0.2:
                print(f"STOP: {WEBY[kod]['nazov']} zlyháva {zle[kod]}/{t} requestov (> 20 %)"); stav(); sys.exit(2)
    stav()
    if ziskane < n:
        print(f"! {ciel}: získaných len {ziskane}/{n} — kandidáti vyčerpaní alebo kategória plná")


def test():
    t = lambda s: (lambda x: (x["q"], x["u"], x["flag"] is not None))(ingrediencia(s))
    assert t("2 cups all-purpose flour") == (250, "g", False)
    assert t("1 ½ cups whole milk") == (360, "ml", False)
    assert t("1 (15 oz) can black beans, drained") == (425, "g", False)
    assert t("2 x 400g cans chopped tomatoes") == (800, "g", False)
    assert t("400g can chopped tomatoes") == (400, "g", False)
    assert t("1 lb ground beef") == (454, "g", False)
    assert t("2 tbsp olive oil") == (2, "PL", False)
    assert t("1/2 tsp salt") == (0.5, "ČL", False)
    assert t("1 stick butter, softened") == (113, "g", False)
    assert t("3 garlic cloves") == (3, "ks", False)
    assert t("2 cloves garlic") == (2, "strúčik", False)
    assert t("1 cup mystery mix") == (1, "šálka", True)
    assert t("salt and pepper") == (None, None, False)
    assert fahrenheit("Bake at 350°F for 20") == "Bake at 350 °F (= 175 °C) for 20"
    print("ok")


if __name__ == "__main__":
    DIR.mkdir(exist_ok=True)
    a = sys.argv[1:]
    if a[:1] == ["test"]:
        test()
    elif a[:1] == ["urls"]:
        urls()
    elif a[:1] == ["zber"] and len(a) == 3 and a[1] in CIEL:
        zber(a[1], int(a[2]))
    elif a[:1] == ["stav"]:
        stav()
    else:
        print(__doc__)
