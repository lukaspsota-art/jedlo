#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pixel-art ilustrácia pre recepty, ku ktorým sa nenašla použiteľná fotka.

Recept bez `recepty/fotky/<id>.webp` dostane 480×270 obrázok: mriežka 96×54 „pixelov“
zväčšená 5× bez vyhladenia. Druh obrázka (polievka, koktail v správnom pohári, burger,
koláč, fľaša sirupu…) určí názov a kategória, farby sa zmiešajú zo surovín podľa množstva
(pomarančový džús + grenadína = oranžovočervený drink). Výsledok je deterministický
(náhodnosť je semienko z id), takže opakovaný beh dá ten istý obrázok.

Zápis do `ZDROJE.json`: autor „Jedlo — pixel art“, `pixelart: true`. Ďalší beh
`stiahni_fotky.py --zdroj hladaj` takú fotku nechá tak (súbor existuje) — ak chceš
skúsiť skutočnú fotku, zmaž pixel art cez `--zamietni id`.

Spusti:  py scripts/pixel_art_fotky.py                 # všetky recepty bez fotky
         py scripts/pixel_art_fotky.py --len id1,id2   # len tieto (prepíše aj existujúci pixel art)
         py scripts/pixel_art_fotky.py --nahlad DIR    # nič nezapíše, uloží PNG do DIR
         py scripts/pixel_art_fotky.py --test          # samokontrola zaradenia
"""
import argparse, colorsys, datetime, glob, hashlib, json, os, random, re, sys, unicodedata
from PIL import Image, ImageDraw

ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECEPTY = os.path.join(ZAKLAD, "recepty")
FOTKY = os.path.join(RECEPTY, "fotky")
ZDROJE = os.path.join(FOTKY, "ZDROJE.json")
W, H, S = 96, 54, 5


def ascii_(s):
    return unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()


# ─────────────────────────── farby ───────────────────────────
def _hls(rgb):
    return colorsys.rgb_to_hls(*[c / 255 for c in rgb])


def _rgb(h, l, s):
    return tuple(int(max(0, min(1, c)) * 255 + .5) for c in colorsys.hls_to_rgb(h % 1, l, s))


def _k_odtienu(h, ciel, o):
    d = ((ciel - h + .5) % 1) - .5
    return h + max(-o, min(o, d))


def rampa(rgb):
    """5 tónov s posunom odtieňa: tiene do modra, svetlá do žlta (žiadna čierna ani biela)."""
    h, l, s = _hls(rgb)
    return {
        "o": _rgb(_k_odtienu(h, .7, .06), l * .42, min(1, s * .9 + .05)),
        "d": _rgb(_k_odtienu(h, .7, .035), l * .74, min(1, s * 1.05)),
        "m": tuple(rgb),
        "l": _rgb(_k_odtienu(h, .14, .025), l + (1 - l) * .32, s * .95),
        "h": _rgb(_k_odtienu(h, .14, .04), l + (1 - l) * .62, s * .8),
    }


def mix(a, b, t):
    return tuple(int(a[i] * (1 - t) + b[i] * t + .5) for i in range(3))


# kľúčové slovo v surovine/názve → farba. Poradie: špecifickejšie skôr.
FARBY = [
    ("curacao|klitori|motyli hrach|modr", (60, 125, 225)),
    ("ube|fialk|fialov|levandul", (150, 95, 190)),
    ("cucoried|cernic|cassis|ostruzin|ruzinz", (95, 55, 135)),
    ("grenadin|granat|malin|jahod|cerešn|ceresn|visn|brusnic|rebarbor|cvikl|opunci|kirsch|maraschino|campari|aperol|krv", (205, 45, 70)),
    ("ruzov", (240, 130, 160)),
    ("matcha|melonov|midori|chartreuse|zelen|mat|spenat|pesto|bazalk|brokol|hrasok|hrach|kel|avokad|guacam|uhork|petrzlen|kopor|kôpor|pazit|rukol|salat|edamame|wakame|rias|limet|kiwi|jalapen|cuket", (95, 170, 70)),
    ("kari|curry|kurkum|safran|horcic", (225, 165, 35)),
    ("paradaj|rajc|kecup|salsa|harissa|chilli|cili|paprik|sriracha|ranchero|bloody", (205, 60, 40)),
    ("tekvic|batat|mrkv|pomaranc|mang|broskyn|marhul|aperol|papaj|kaki|losos|krevet|homar", (238, 135, 45)),
    ("citron|banan|ananas|yuzu|grapefruit|med|javor|vajc|vajic|zlt|kukuric|syr|cedar|ementál|ementál|gouda|polent|zemiak|hranolk|cesto|muk|cereal", (238, 205, 90)),
    ("cokolad|kakao|kav|espresso|cola|kola|pern|melas|brownie|hoisin|soj|teriyaki|worcester|balzam|cierne fazul|tmave pivo|stout|porter", (95, 55, 35)),
    ("whisk|bourbon|rum|brandy|konak|calvados|amaretto|cider|most|caj|pivo|ale|medovin|karamel|hnedy cukor|vermut|sherry|rezn|vypraz|panko|chlieb|bageta|pecivo|toast", (200, 125, 50)),
    ("hovadz|bravc|mas|klobas|slanin|saunk|sunk|rebr|steak|brisket|kacka|zverin|jahnac|telac|pecen|salam|parky|parok|mlete", (150, 75, 50)),
    ("kurac|kura|morc|tofu|tempura", (220, 165, 95)),
    ("smotan|mliek|bechamel|jogurt|kokos|tvaroh|mozzarell|feta|majonez|aioli|ranch|ryz|maslo|biela fazul|cottage|crème|creme|lassi|ovsen", (242, 232, 210)),
    ("gin|vodk|biely rum|sake|soju|tequil|mezcal|pisco|prosecc|sampan|sumiv|sodov|voda|tonik|sprite|limonad|sirup|cukor|sol|absint|liker", (226, 236, 240)),
]
_FARBY_RE = [(re.compile(k), c) for k, c in FARBY]
BEZFARBY = re.compile(r"\b(sol|korenie|ladu?|kocky ladu|voda na varenie)\b")


def farba_slova(t):
    t = ascii_(t)
    for r, c in _FARBY_RE:
        if r.search(t):
            return c
    return None


def gramy(i):
    m = i.get("mnozstvo")
    try:
        m = float(m)
    except (TypeError, ValueError):
        return 5.0
    j = ascii_(i.get("jednotka") or "")
    return m * {"ks": 60, "pl": 15, "cl": 5, "kl": 5, "dl": 100, "l": 1000, "kg": 1000, "dash": 1,
                "strek": 1, "kvapka": .2, "platok": 15, "hrst": 30, "stipka": .5}.get(j, 1)


def farba_zmesi(r, vyluc=(), predvolena=(200, 140, 70)):
    """Vážený priemer farieb surovín podľa hmotnosti (bez soli, ľadu a vybraných slov)."""
    sp, wsum = [0, 0, 0], 0
    for i in r.get("ingrediencie") or []:
        n = ascii_(i.get("nazov"))
        if BEZFARBY.search(n) or any(v in n for v in vyluc):
            continue
        c = farba_slova(n)
        if not c:
            continue
        g = min(gramy(i), 600)
        for k in range(3):
            sp[k] += c[k] * g
        wsum += g
    if not wsum:
        return predvolena
    return tuple(int(v / wsum) for v in sp)


def suroviny(r):
    return " ".join(ascii_(i.get("nazov")) for i in r.get("ingrediencie") or [])


# ─────────────────────────── plátno ───────────────────────────
class Platno:
    def __init__(s):
        s.img = Image.new("RGB", (W, H))
        s.px = s.img.load()

    def _maska(s, kresli):
        m = Image.new("1", (W, H), 0)
        kresli(ImageDraw.Draw(m))
        return m

    def tvar(s, kresli, farba, obrys=True, tien=True, svetlo=(-.55, -.85), ymin=None, ymax=None,
             obrys_farba=None, tonov=5):
        """Vyplní tvar s tieňovaním podľa polohy v ohraničení (svetlo zľava hore) a obrysom."""
        m = s._maska(kresli)
        mp = m.load()
        bb = m.getbbox()
        if not bb:
            return
        x0, y0, x1, y1 = bb
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rx, ry = max(1, (x1 - x0) / 2), max(1, (y1 - y0) / 2)
        R = rampa(farba)
        lx, ly = svetlo

        def dnu(x, y):
            return 0 <= x < W and 0 <= y < H and mp[x, y] and (ymin is None or y >= ymin) and (ymax is None or y <= ymax)

        for y in range(y0, y1):
            for x in range(x0, x1):
                if not dnu(x, y):
                    continue
                okraj = not (dnu(x - 1, y) and dnu(x + 1, y) and dnu(x, y - 1) and dnu(x, y + 1))
                if okraj and obrys:
                    s.px[x, y] = obrys_farba or R["o"]
                    continue
                if not tien:
                    s.px[x, y] = R["m"]
                    continue
                v = (((x + .5 - cx) / rx) * lx + ((y + .5 - cy) / ry) * ly)
                if v > .62 and tonov >= 5:
                    c = R["h"]
                elif v > .25:
                    c = R["l"]
                elif v < -.45:
                    c = R["d"]
                else:
                    c = R["m"]
                s.px[x, y] = c

    def tint(s, kresli, farba, t):
        """Prifarbí to, čo už je pod tvarom (sklo, para, tieň)."""
        m = s._maska(kresli).load()
        for y in range(H):
            for x in range(W):
                if m[x, y]:
                    s.px[x, y] = mix(s.px[x, y], farba, t)

    def bod(s, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            s.px[int(x), int(y)] = c

    # skratky
    def el(s, box, c, **k):
        s.tvar(lambda d: d.ellipse(box, fill=1), c, **k)

    def ob(s, box, c, **k):
        s.tvar(lambda d: d.rectangle(box, fill=1), c, **k)

    def zaobl(s, box, r, c, **k):
        s.tvar(lambda d: d.rounded_rectangle(box, r, fill=1), c, **k)

    def poly(s, pts, c, **k):
        s.tvar(lambda d: d.polygon(pts, fill=1), c, **k)

    def ciara(s, pts, c, w=1):
        d = ImageDraw.Draw(s.img)
        d.line(pts, fill=c, width=w)

    def tien_pod(s, box):
        s.tint(lambda d: d.ellipse(box, fill=1), (30, 20, 30), .28)

    def para(s, x, y, rng, n=3):
        for k in range(n):
            xx = x + k * 6 + rng.randint(-1, 1)
            for t in range(9):
                s.tint(lambda d, a=xx + (1 if (t // 3) % 2 else 0), b=y - t: d.point((a, b), fill=1),
                       (255, 255, 255), .45 - t * .04)


# ─────────────────────────── pozadia ───────────────────────────
POZADIA = {
    "Hlavné jedlo": (196, 92, 80), "Cestoviny": (200, 110, 70), "Polievka": (80, 120, 170),
    "Šalát": (110, 150, 90), "Príloha": (190, 140, 70), "Raňajky": (215, 170, 70),
    "Pečivo": (180, 135, 90), "Dezert": (205, 120, 150), "Nátierka": (150, 130, 100),
    "Nápoj": (70, 150, 150), "Snack": (130, 140, 170),
}


def pozadie_obrus(p, kat, rng):
    """Kockovaný obrus — svetlý, aby jedlo vyniklo."""
    base = POZADIA.get(kat, (150, 140, 130))
    svetla = mix(base, (250, 244, 232), .78)
    pruh = mix(base, (250, 244, 232), .5)
    kriz = mix(base, (120, 90, 80), .05)
    c = 6
    ox, oy = rng.randint(0, c - 1), rng.randint(0, c - 1)
    for y in range(H):
        for x in range(W):
            a = ((x + ox) // c) % 2
            b = ((y + oy) // c) % 2
            p.px[x, y] = kriz if a and b else (pruh if a or b else svetla)
    # jemná vinieta hore, aby obrus nebol plochý
    for y in range(H):
        for x in range(W):
            t = max(0, (12 - y) / 12) * .12
            if t:
                p.px[x, y] = mix(p.px[x, y], (60, 40, 40), t)


def pozadie_bar(p, rng):
    """Bar: tmavá stena s policou a drevený pult."""
    stena = (38, 42, 66)
    for y in range(H):
        for x in range(W):
            c = stena if (x // 8) % 2 else mix(stena, (20, 22, 40), .25)
            if y < 34:
                p.px[x, y] = mix(c, (10, 10, 20), (34 - y) / 34 * .3)
    # polica s fľašami
    p.ob((0, 12, W - 1, 13), (90, 60, 40), obrys=False)
    for k in range(9):
        x = 3 + k * 11 + rng.randint(-1, 1)
        fc = rng.choice([(70, 120, 60), (140, 80, 40), (90, 60, 120), (170, 150, 90), (60, 90, 130)])
        hgt = rng.randint(6, 9)
        p.tint(lambda d, x=x, hgt=hgt: d.rectangle((x, 12 - hgt, x + 3, 11), fill=1), fc, .55)
        p.tint(lambda d, x=x, hgt=hgt: d.rectangle((x + 1, 12 - hgt - 3, x + 2, 12 - hgt), fill=1), fc, .55)
    # pult
    for y in range(34, H):
        for x in range(W):
            dr = (122, 74, 42) if ((y - 34) // 3) % 2 == 0 else (112, 66, 38)
            if (x * 7 + (y // 3) * 13) % 31 == 0:
                dr = mix(dr, (70, 40, 25), .5)
            p.px[x, y] = dr
    p.ob((0, 34, W - 1, 35), (160, 105, 60), obrys=False)


# ─────────────────────────── kúsky ───────────────────────────
TANIER = (238, 236, 228)


def tanier(p, cx=48, y=44, rx=26, ry=7):
    p.tien_pod((cx - rx - 1, y - ry + 3, cx + rx + 3, y + ry + 4))
    p.el((cx - rx, y - ry, cx + rx, y + ry), TANIER)
    p.el((cx - rx + 5, y - ry + 2, cx + rx - 5, y + ry - 2), mix(TANIER, (200, 200, 205), .25), obrys=False, tien=False)


def miska(p, obsah, cx=48, top=24, rx=20, hlbka=18, farba=(232, 228, 220), zelenina=None, rng=None,
          kopa=False):
    p.tien_pod((cx - rx + 2, top + hlbka - 3, cx + rx + 4, top + hlbka + 4))
    p.tvar(lambda d: d.chord((cx - rx, top - hlbka + 4, cx + rx, top + hlbka), 0, 180, fill=1), farba)
    p.ob((cx - 7, top + hlbka - 2, cx + 7, top + hlbka), mix(farba, (0, 0, 0), .2), obrys=False)
    p.el((cx - rx, top - 4, cx + rx, top + 4), mix(farba, (255, 255, 255), .3))
    if kopa:
        p.tvar(lambda d: d.chord((cx - rx + 2, top - 10, cx + rx - 2, top + 3), 180, 360, fill=1), obsah)
    else:
        p.el((cx - rx + 2, top - 3, cx + rx - 2, top + 3), obsah, obrys=False)


def posyp(p, x0, y0, x1, y1, farby, n, rng, vel=1):
    for _ in range(n):
        x, y = rng.randint(x0, x1), rng.randint(y0, y1)
        c = rng.choice(farby)
        R = rampa(c)
        p.bod(x, y, R["m"])
        if vel > 1:
            p.bod(x + 1, y, R["l"])
            p.bod(x, y + 1, R["d"])
            p.bod(x + 1, y + 1, R["d"])


def lyzica(p, x=72, y=40):
    p.tvar(lambda d: d.line((x, y, x + 12, y - 12), fill=1, width=2), (180, 185, 195), obrys=False)
    p.el((x - 4, y - 2, x + 3, y + 3), (190, 195, 205))


# ─────────────────────────── obrázky jedál ───────────────────────────
def kresli_polievka(p, r, rng, n, sur):
    c = farba_zmesi(r, vyluc=("vyvar", "voda", "bujon"), predvolena=(225, 160, 70))
    if re.search(r"kremov|krem\b|bisque|smotan", n):
        c = mix(c, (245, 235, 215), .25)
    miska(p, c)
    if re.search(r"rezanc|ramen|udon|cestovin|nudl", n + sur):
        for k in range(5):
            y = 22 + (k % 3)
            p.ciara([(32 + k * 6, y), (35 + k * 6, y - 1), (38 + k * 6, y + 1)], (245, 220, 140))
        if "vajc" in sur:
            p.el((52, 20, 59, 25), (250, 250, 240))
            p.el((54, 21, 57, 24), (245, 170, 40), obrys=False)
        posyp(p, 32, 21, 62, 25, [(90, 160, 60)], 8, rng)
    else:
        top = [(90, 160, 60), mix(c, (255, 255, 255), .5)]
        if "slanin" in sur or "hovadz" in sur or "bravc" in sur:
            top.append((160, 80, 50))
        posyp(p, 32, 21, 62, 25, top, 14, rng)
    p.para(40, 15, rng)
    lyzica(p, 70, 36)


def kresli_salat(p, r, rng, n, sur):
    miska(p, (110, 175, 70), kopa=True, farba=(225, 235, 230))
    listy = [(95, 170, 70), (130, 190, 80), (70, 140, 60)]
    posyp(p, 31, 13, 63, 22, listy, 50, rng, 2)
    dopl = []
    if re.search(r"paradaj|cherry|caprese", sur + n):
        dopl.append((215, 55, 45))
    if re.search(r"mozzarell|feta|syr|vajc", sur):
        dopl.append((248, 244, 228))
    if re.search(r"losos|krevet", sur):
        dopl.append((240, 140, 100))
    if re.search(r"tuniak|kurac|kura", sur):
        dopl.append((215, 170, 110))
    if re.search(r"hrusk|jablk|kukuric|kari", sur):
        dopl.append((235, 200, 80))
    if re.search(r"hub|orech", sur):
        dopl.append((150, 105, 70))
    if re.search(r"rezanc", n):
        dopl.append((240, 215, 150))
    for c in dopl or [(215, 55, 45)]:
        for _ in range(4):
            x, y = rng.randint(33, 58), rng.randint(14, 21)
            p.el((x, y, x + 3, y + 3), c)


def kresli_tanier_jedlo(p, r, rng, n, sur, typ):
    tanier(p)
    maso_c = farba_zmesi(r, predvolena=(150, 80, 50))
    if typ == "ryba":
        if "chips" in n or "hranol" in sur:
            for k in range(7):
                x = 52 + k * 3
                p.ob((x, 33 - (k % 3), x + 2, 44), (240, 195, 90))
        telo = (225, 165, 80) if re.search(r"vypraz|chips|cestick|obal", n + sur) else (
            (240, 140, 100) if "losos" in n else (190, 200, 210))
        p.poly([(50, 37), (60, 30), (58, 37), (60, 44)], mix(telo, (90, 100, 120), .25))
        p.el((20, 31, 54, 44), telo)
        p.poly([(32, 32), (38, 27), (44, 32)], mix(telo, (90, 100, 120), .25))
        for x in (34, 39, 44):
            p.ciara([(x, 34), (x - 1, 41)], mix(telo, (60, 70, 90), .3))
        p.ciara([(28, 33), (27, 42)], mix(telo, (60, 70, 90), .4))
        p.bod(24, 36, (30, 30, 40))
        p.bod(25, 36, (250, 250, 250))
        p.el((40, 41, 47, 46), (245, 220, 70))
        p.el((42, 42, 45, 45), (252, 245, 200), obrys=False)
        posyp(p, 22, 44, 50, 48, [(90, 160, 60)], 6, rng, 2)
    elif typ == "kuracie_stehna":
        for k, (x, y) in enumerate([(28, 32), (42, 34), (54, 31)]):
            p.el((x, y, x + 13, y + 9), (205, 120, 55))
            p.ob((x + 12, y + 3, x + 17, y + 5), (245, 238, 220))
            p.el((x + 16, y + 2, x + 19, y + 6), (245, 238, 220))
        posyp(p, 26, 40, 70, 46, [(100, 170, 70)], 10, rng, 2)
    elif typ == "spiz":
        for k in range(3):
            y = 32 + k * 4
            p.ciara([(22, y + 4), (74, y - 4)], (190, 150, 100))
            for j in range(5):
                x = 28 + j * 9
                yy = y + 2 - int((x - 22) * 8 / 52)
                c = [maso_c, (210, 60, 40), (100, 160, 60), maso_c, (240, 200, 80)][(j + k) % 5]
                p.zaobl((x, yy - 3, x + 6, yy + 3), 2, c)
    elif typ == "krevety":
        for k in range(5):
            x, y = 28 + k * 8, 34 + (k % 2) * 3
            p.tvar(lambda d, x=x, y=y: d.arc((x, y, x + 9, y + 9), 160, 380, fill=1, width=3), (240, 120, 80))
        posyp(p, 26, 40, 70, 46, [(100, 170, 70), (240, 230, 80)], 10, rng, 2)
    elif typ == "placky":
        for k, (x, y) in enumerate([(26, 33), (40, 30), (54, 33)]):
            p.el((x, y, x + 16, y + 10), (215, 160, 70))
            posyp(p, x + 3, y + 2, x + 13, y + 8, [(180, 120, 50), (110, 160, 60)], 6, rng)
        p.el((44, 39, 54, 45), (248, 245, 235))
    elif typ == "pirohy":
        for k, (x, y) in enumerate([(24, 32), (38, 30), (52, 32), (31, 37), (46, 37)]):
            p.tvar(lambda d, x=x, y=y: d.chord((x, y, x + 15, y + 12), 180, 360, fill=1), (245, 232, 200))
        posyp(p, 26, 30, 66, 40, [(170, 70, 50), (235, 190, 90)], 16, rng, 2)
        posyp(p, 26, 30, 66, 42, [(90, 160, 60)], 5, rng)
    elif typ == "zemiaky":
        zc = farba_slova(hlava_nazvu(n)) or (225, 175, 80)
        for k in range(7):
            x, y = 26 + (k % 4) * 10 + rng.randint(-1, 1), 31 + (k // 4) * 6
            p.el((x, y, x + 9, y + 7), zc)
        posyp(p, 26, 31, 68, 44, [(90, 160, 60), (240, 240, 230)], 12, rng)
    elif typ == "vajcia":
        for x in (30, 48):
            p.tvar(lambda d, x=x: d.polygon([(x, 36), (x + 3, 31), (x + 10, 30), (x + 15, 33), (x + 16, 39),
                                             (x + 10, 43), (x + 3, 42)], fill=1), (250, 248, 240))
            p.el((x + 5, 33, x + 11, 39), (245, 170, 35))
        if re.search(r"slanin|klobas|fazul|parky", sur):
            p.zaobl((62, 34, 72, 37), 1, (180, 70, 55))
            p.zaobl((62, 39, 72, 42), 1, (180, 70, 55))
        posyp(p, 26, 40, 70, 46, [(100, 170, 70)], 6, rng)
    elif typ == "hriby":
        for k in range(5):
            x, y = 26 + k * 9, 32 + (k % 2) * 3
            p.el((x, y, x + 9, y + 8), (165, 130, 100))
            p.el((x + 2, y + 1, x + 7, y + 5), mix(farba_zmesi(r, ("hub", "sampin")), (240, 220, 150), .4), obrys=False)
    elif typ == "tekvica":
        p.tien_pod((30, 42, 70, 50))
        p.el((30, 22, 66, 46), (230, 125, 40))
        for x in (40, 48, 56):
            p.ciara([(x, 24), (x, 44)], (190, 95, 30))
        p.el((36, 22, 60, 30), mix(maso_c, (120, 70, 40), .3))
        p.ob((46, 16, 49, 22), (110, 130, 60))
        return
    elif typ == "rezen":
        p.poly([(24, 36), (30, 30), (52, 29), (58, 34), (54, 42), (28, 43)], (220, 160, 70))
        posyp(p, 26, 31, 54, 41, [(190, 130, 50), (240, 200, 110)], 30, rng)
        p.el((58, 32, 70, 42), (240, 225, 120))
    else:  # mäso + príloha
        maso_c = mix(maso_c, (150, 80, 50), .4)
        p.zaobl((24, 31, 48, 42), 4, maso_c)
        omacka = farba_zmesi(r, vyluc=("hovadz", "bravc", "kurac", "mas", "zemiak", "ryz", "knedl"),
                             predvolena=(170, 100, 50))
        p.tvar(lambda d: d.ellipse((26, 35, 50, 44), fill=1), mix(omacka, maso_c, .3), obrys=False, ymin=39)
        if re.search(r"ryz|bulgur|kus|quinoa", sur):
            p.el((50, 30, 70, 43), (245, 242, 232))
            posyp(p, 51, 31, 69, 42, [(215, 210, 200)], 14, rng)
        elif re.search(r"knedl|pudding|yorkshir", sur + n):
            for k in range(3):
                p.el((50 + k * 6, 31, 57 + k * 6, 40), (245, 238, 215))
        elif re.search(r"zemiak|pyre|kas|polent", sur):
            p.el((50, 30, 70, 43), (245, 220, 140))
        else:
            for k in range(4):
                p.el((50 + (k % 2) * 8, 30 + (k // 2) * 6, 58 + (k % 2) * 8, 37 + (k // 2) * 6), (225, 175, 80))
        posyp(p, 26, 30, 68, 44, [(90, 160, 60)], 8, rng, 2)


def kresli_hrniec(p, r, rng, n, sur):
    c = farba_zmesi(r, vyluc=("vyvar", "voda", "bujon"), predvolena=(170, 80, 45))
    kov = (70, 75, 85) if rng.random() < .5 else (175, 70, 45)
    p.tien_pod((24, 44, 74, 52))
    p.ob((18, 26, 26, 29), kov)
    p.ob((70, 26, 78, 29), kov)
    p.zaobl((24, 22, 72, 48), 4, kov)
    p.el((24, 18, 72, 28), mix(kov, (255, 255, 255), .2))
    p.el((27, 20, 69, 26), c, obrys=False)
    kusy = [mix(c, (90, 40, 30), .35), mix(c, (255, 230, 180), .35)]
    if "mrkv" in sur: kusy.append((235, 130, 40))
    if "zemiak" in sur: kusy.append((240, 210, 130))
    if "fazul" in sur: kusy.append((140, 50, 40))
    if "tofu" in sur: kusy.append((245, 240, 225))
    posyp(p, 30, 21, 66, 25, kusy, 22, rng, 2)
    posyp(p, 30, 21, 66, 25, [(90, 160, 60)], 5, rng)
    p.para(38, 15, rng)


def kresli_ryza_miska(p, r, rng, n, sur):
    miska(p, (245, 242, 232), kopa=True, farba=(200, 70, 60) if rng.random() < .5 else (40, 60, 90))
    posyp(p, 31, 14, 63, 22, [(225, 222, 212)], 25, rng)
    c = farba_zmesi(r, vyluc=("ryz",), predvolena=(200, 120, 60))
    p.zaobl((34, 13, 46, 20), 2, c)
    if "vajc" in sur:
        p.el((48, 13, 58, 20), (250, 245, 230))
        p.el((51, 14, 55, 18), (245, 175, 40), obrys=False)
    if re.search(r"losos|avokad|edamame|uhork|mang", sur):
        for x, cc in ((48, (240, 130, 90)), (55, (120, 180, 70))):
            p.ob((x, 16, x + 5, 20), cc)
    posyp(p, 33, 13, 62, 21, [(90, 160, 60), (30, 35, 30)], 8, rng)


def kresli_cestoviny(p, r, rng, n, sur):
    tanier(p)
    cest = (62, 62, 74) if re.search(r"cierne|sepi", n) else (240, 210, 120)
    p.el((28, 26, 68, 44), cest)
    R = rampa(cest)
    for k in range(18):
        x, y = rng.randint(30, 64), rng.randint(28, 41)
        p.tvar(lambda d, x=x, y=y: d.arc((x, y, x + 6, y + 4), 0, 200, fill=1), R["d"], obrys=False, tien=False)
        p.bod(x + 2, y, R["h"])
    om = farba_zmesi(r, vyluc=("cestovin", "spaget", "rezanc", "penne", "muk", "vod", "gnocch"), predvolena=(205, 60, 40))
    if "zapec" in n:
        om = mix(om, (240, 190, 90), .5)
    p.el((36, 26, 60, 35), om)
    posyp(p, 36, 26, 60, 34, [mix(om, (255, 255, 255), .4), (90, 160, 60)], 14, rng)


def kresli_pizza(p, r, rng, n, sur):
    p.tien_pod((22, 40, 76, 52))
    p.el((22, 18, 74, 48), (215, 150, 70))
    p.el((25, 20, 71, 45), (205, 60, 40), obrys=False)
    for _ in range(14):
        x, y = rng.randint(28, 64), rng.randint(22, 40)
        p.el((x, y, x + 5, y + 3), (248, 236, 190), obrys=False)
    top = [(45, 45, 40)] if "oliv" in sur else []
    if re.search(r"klobas|salam|sunk", sur): top.append((170, 50, 40))
    if "paprik" in sur: top.append((235, 120, 40))
    top.append((80, 150, 60))
    for _ in range(12):
        x, y = rng.randint(28, 66), rng.randint(22, 41)
        p.el((x, y, x + 3, y + 2), rng.choice(top))
    p.ciara([(48, 19), (48, 47)], (190, 120, 60))
    p.ciara([(23, 33), (73, 33)], (190, 120, 60))


def kresli_burger(p, r, rng, n, sur, dlhy=False):
    plnka = farba_zmesi(r, vyluc=("bageta", "chlieb", "zeml", "pecivo", "muk", "bagel", "toast"), predvolena=(150, 80, 50))
    if dlhy and "bagel" in n:
        tanier(p)
        for x in (24, 48):
            p.el((x, 26, x + 24, 44), (205, 140, 70))
            p.el((x + 2, 27, x + 22, 41), mix(plnka, (250, 245, 235), .35), obrys=False)
            p.el((x + 9, 32, x + 15, 37), mix(TANIER, (200, 200, 205), .25))
            posyp(p, x + 3, 28, x + 21, 40, [(210, 50, 70) if "jahod" in n else (110, 180, 70), plnka], 9, rng, 2)
        return
    if dlhy and re.search(r"toast|rarebit|sendvic z|basket|kosik|sandwich", n) and not re.search(r"bageta|\bsub\b", n):
        tanier(p)
        for x, smer in ((22, 1), (48, -1)):
            pts = [(x, 44), (x + 24, 44), (x + 12 + 10 * smer, 22)] if smer > 0 else [(x, 44), (x + 24, 44), (x + 2, 22)]
            p.poly(pts, (215, 160, 85))
            p.poly([(a + (2 if a < x + 12 else -2), b - (2 if b > 30 else -3)) for a, b in pts], (245, 228, 185), obrys=False)
            posyp(p, x + 4, 34, x + 20, 42, [plnka, (110, 180, 70), (240, 210, 80)], 10, rng, 2)
        return
    if dlhy:
        p.tien_pod((18, 40, 80, 50))
        p.zaobl((18, 33, 78, 42), 4, (225, 160, 80))
        plnka = farba_zmesi(r, vyluc=("bageta", "chlieb", "zeml", "pecivo", "muk"), predvolena=(150, 80, 50))
        p.zaobl((20, 27, 76, 34), 3, plnka)
        posyp(p, 22, 27, 74, 30, [(110, 180, 70), (230, 200, 70), (210, 60, 40)], 18, rng, 2)
        p.tvar(lambda d: d.chord((18, 14, 78, 32), 180, 360, fill=1), (220, 150, 70))
        posyp(p, 26, 17, 70, 22, [(240, 220, 170)], 6, rng)
        return
    for k, ox in enumerate([0] if not re.search(r"slider|mini", n) else [-14, 14]):
        cx = 48 + ox
        w = 18 if ox == 0 else 12
        p.tien_pod((cx - w, 44, cx + w + 2, 51))
        p.zaobl((cx - w, 40, cx + w, 46), 3, (220, 150, 70))
        maso = (110, 60, 40) if not re.search(r"falafel|krevet|kurac", n + sur) else (
            (150, 120, 60) if "falafel" in n else (235, 140, 90) if "krevet" in n else (220, 160, 80))
        p.zaobl((cx - w - 1, 33, cx + w + 1, 40), 3, maso)
        if re.search(r"syr|cedar|ced", sur):
            p.poly([(cx - w, 33), (cx + w, 33), (cx + w - 2, 36), (cx + 4, 35), (cx, 38), (cx - 4, 35), (cx - w + 2, 36)],
                   (245, 195, 50))
        p.zaobl((cx - w - 1, 30, cx + w + 1, 33), 1, (110, 180, 70))
        p.tvar(lambda d: d.chord((cx - w, 12 if ox == 0 else 18, cx + w, 38), 180, 360, fill=1), (225, 155, 70))
        posyp(p, cx - w + 4, 17 if ox == 0 else 22, cx + w - 4, 23 if ox == 0 else 25, [(250, 240, 200)], 7, rng)


def kresli_wrap(p, r, rng, n, sur):
    tanier(p)
    for k, x in enumerate((26, 46)):
        p.poly([(x, 42), (x + 4, 26), (x + 18, 24), (x + 20, 40)], (235, 210, 150))
        p.el((x + 3, 22, x + 19, 30), farba_zmesi(r, ("tortill", "wrap", "chlieb", "muk"), (170, 100, 60)))
        posyp(p, x + 5, 23, x + 17, 28, [(110, 180, 70), (210, 60, 40), (240, 230, 220)], 10, rng)


def kresli_zapekane(p, r, rng, n, sur):
    """Zapekaná misa / musaka / koláč so slaným plnením."""
    p.tien_pod((20, 42, 80, 52))
    p.zaobl((18, 22, 78, 47), 3, (230, 230, 235))
    p.ob((14, 30, 18, 34), (230, 230, 235))
    p.ob((78, 30, 82, 34), (230, 230, 235))
    c = farba_zmesi(r, predvolena=(220, 150, 70))
    p.ob((21, 24, 75, 44), mix(c, (230, 170, 80), .5), obrys=False)
    R = rampa(mix(c, (230, 170, 80), .5))
    for _ in range(45):
        x, y = rng.randint(22, 73), rng.randint(25, 42)
        p.bod(x, y, rng.choice([R["d"], R["l"], R["h"], (160, 90, 40)]))
    if re.search(r"tart|kolac|pie|cest", n):
        for x in range(26, 74, 8):
            p.ciara([(x, 24), (x + 4, 44)], (235, 190, 110))


def kresli_kolac(p, r, rng, n, sur, slany=False):
    """Okrúhly koláč v forme s mriežkou (jablkový, čerešňový, tekvicový)."""
    p.tien_pod((22, 40, 76, 52))
    p.el((22, 20, 74, 46), (215, 155, 80))
    plnka = farba_zmesi(r, vyluc=("muk", "maslo", "cukor", "vajc"), predvolena=(200, 60, 60))
    p.el((26, 22, 70, 43), plnka, obrys=False)
    if re.search(r"mriezk|jablk|ceresn|pie|tart", n) and "tekvic" not in n:
        for k in range(5):
            x = 30 + k * 8
            p.ciara([(x, 22), (x, 43)], (240, 190, 110), 2)
        for k in range(3):
            y = 26 + k * 6
            p.ciara([(26, y), (70, y)], (240, 190, 110), 2)
    else:
        posyp(p, 30, 24, 66, 40, [mix(plnka, (255, 255, 255), .3)], 20, rng)


def kresli_torta(p, r, rng, n, sur):
    c = farba_zmesi(r, vyluc=("muk", "vajc", "cukor", "prasok"), predvolena=(245, 225, 200))
    if re.search(r"cokolad|kakao|nutell|poleno", n + sur):
        c = (110, 65, 40)
    if "cheesecake" in n:
        c = (248, 236, 200)
    p.tien_pod((22, 44, 76, 52))
    if "poleno" in n:
        p.zaobl((18, 26, 78, 46), 9, c)
        for x in range(24, 74, 6):
            p.ciara([(x, 29), (x + 2, 43)], mix(c, (0, 0, 0), .3))
        p.el((70, 26, 80, 46), mix(c, (200, 160, 120), .5))
        posyp(p, 22, 22, 72, 26, [(250, 250, 250)], 8, rng)
        return
    p.ob((26, 22, 70, 46), c)
    p.el((26, 40, 70, 50), c, ymin=44)
    p.el((26, 17, 70, 27), mix(c, (255, 255, 255), .35))
    # poleva steká
    for x in range(28, 69, 5):
        p.ob((x, 25, x + 2, 25 + rng.randint(1, 5)), mix(c, (255, 255, 255), .35), obrys=False)
    p.ciara([(27, 33), (69, 33)], mix(c, (255, 240, 230), .5))
    ovocie = (200, 30, 50) if re.search(r"ceresn|jahod|malin", n + sur) else (
        (90, 60, 140) if "cucoried" in sur else (240, 170, 60) if "broskyn" in sur else (200, 30, 50))
    for x in (34, 44, 54, 62):
        p.el((x, 15, x + 4, 19), ovocie)


def kresli_susienky(p, r, rng, n, sur):
    tanier(p, ry=8)
    c = (120, 70, 40) if re.search(r"cokolad|kakao|cierne|red velvet|brownie", n) else (225, 170, 90)
    if "makron" in n:
        for k, x in enumerate((26, 40, 54)):
            for dy in (0, 6):
                p.el((x, 28 + dy, x + 13, 34 + dy), (60, 50, 70) if "cier" in n else (240, 150, 180))
            p.ob((x + 1, 33, x + 12, 34), (120, 70, 50), obrys=False)
        return
    for k, (x, y) in enumerate([(24, 32), (38, 29), (52, 33), (34, 37), (48, 38)]):
        p.el((x, y, x + 15, y + 9), c)
        posyp(p, x + 3, y + 2, x + 12, y + 7, [(70, 40, 25)] if "cokolad" in sur else [mix(c, (255, 230, 180), .5)], 4, rng)


def kresli_kocky(p, r, rng, n, sur):
    """Brownies, karamely, marshmallows, bloky."""
    c = farba_zmesi(r, vyluc=("muk", "vajc", "cukor", "maslo"), predvolena=(110, 65, 40))
    if re.search(r"marshmallow|cloud|mrak", n):
        c = (250, 245, 240)
    elif re.search(r"brownie|cokolad|dirt|block", n):
        c = (100, 60, 35)
    elif "ube" in n or "purple" in n:
        c = (160, 110, 200)
    elif "med" in n or "honey" in n:
        c = (235, 175, 60)
    p.tien_pod((22, 44, 76, 52))
    for k, (x, y) in enumerate([(24, 32), (40, 32), (56, 32), (32, 20), (48, 20)]):
        p.ob((x, y, x + 15, y + 13), c)
        p.ob((x + 1, y + 1, x + 14, y + 3), mix(c, (255, 255, 255), .25), obrys=False)


def kresli_puding(p, r, rng, n, sur):
    c = farba_zmesi(r, vyluc=("cukor",), predvolena=(245, 225, 170))
    if re.search(r"cokolad|kakao", n): c = (120, 70, 40)
    if re.search(r"nanuk|zmrzlin|popsicle", n):
        tanier(p)
        for k, x in enumerate((28, 42, 56)):
            p.ob((x + 4, 38, x + 6, 46), (220, 190, 140))
            p.zaobl((x, 18, x + 10, 39), 4, mix(c, (255, 255, 255), .15 * k))
            posyp(p, x + 2, 20, x + 8, 37, [(40, 40, 45)] if "chia" in n else [mix(c, (255, 255, 255), .5)], 6, rng)
        return
    if "mochi" in n:
        tanier(p)
        for k, x in enumerate((28, 42, 56)):
            p.el((x, 28, x + 13, 41), (150, 190, 240) if "modr" in n else (250, 235, 235))
        return
    sklo = (210, 225, 235)
    p.tien_pod((30, 44, 68, 52))
    p.poly([(30, 18), (66, 18), (60, 46), (36, 46)], c)
    p.ciara([(30, 18), (36, 46)], sklo)
    p.ciara([(66, 18), (60, 46)], sklo)
    p.ciara([(36, 46), (60, 46)], sklo)
    p.ciara([(33, 22), (36, 40)], (255, 255, 255))
    p.el((30, 14, 66, 22), (250, 248, 240))
    ov = (90, 60, 140) if "cucoried" in sur else (200, 30, 50)
    posyp(p, 34, 14, 62, 19, [ov], 6, rng, 2)


def kresli_palacinky(p, r, rng, n, sur):
    tanier(p)
    if "vafl" in n:
        p.ob((26, 26, 70, 44), (225, 170, 80))
        for x in range(28, 70, 5):
            p.ciara([(x, 27), (x, 43)], (180, 120, 50))
        for y in range(28, 44, 5):
            p.ciara([(27, y), (69, y)], (180, 120, 50))
        if "pizz" in n:
            posyp(p, 28, 28, 68, 42, [(205, 60, 40), (250, 240, 200)], 20, rng, 2)
        return
    for k in range(5):
        p.el((28, 38 - k * 4, 68, 45 - k * 4), (230, 175, 90))
    p.el((28, 18, 68, 26), (235, 180, 95))
    p.tvar(lambda d: d.polygon([(32, 21), (64, 21), (62, 28), (58, 24), (52, 32), (46, 25), (38, 30), (34, 24)], fill=1),
           (180, 90, 30) if "javor" in sur or "sirup" in sur else (110, 60, 30), obrys=False)
    posyp(p, 34, 17, 62, 23, [(90, 60, 140) if "cucoried" in sur else (210, 40, 60), (250, 250, 245)], 10, rng, 2)


def kresli_sisky(p, r, rng, n, sur):
    tanier(p)
    for x, y in ((24, 26), (42, 28), (58, 26)):
        p.el((x, y, x + 16, y + 14), (220, 150, 70))
        p.el((x + 2, y + 1, x + 14, y + 7), (250, 245, 235), obrys=False)
        p.el((x + 6, y + 6, x + 10, y + 9), (200, 40, 60))


def kresli_cupcake(p, r, rng, n, sur):
    for k, x in enumerate((22, 40, 58)):
        p.tien_pod((x, 44, x + 18, 51))
        p.poly([(x + 1, 32), (x + 17, 32), (x + 15, 46), (x + 3, 46)], (210, 150, 90) if k % 2 else (230, 120, 140))
        for xx in range(x + 4, x + 16, 3):
            p.ciara([(xx, 33), (xx, 45)], (180, 110, 70) if k % 2 else (200, 90, 110))
        krem = farba_zmesi(r, ("muk", "vajc", "maslo", "cukor"), (250, 240, 235))
        p.el((x - 1, 22, x + 19, 34), mix(krem, (255, 255, 255), .3))
        p.el((x + 4, 17, x + 14, 25), mix(krem, (255, 255, 255), .45))
        p.el((x + 7, 14, x + 11, 18), (200, 30, 50))


def kresli_ovocie(p, r, rng, n, sur):
    if re.search(r"spiz|skewer", n):
        tanier(p)
        for k in range(3):
            y = 30 + k * 5
            p.ciara([(22, y), (74, y)], (190, 150, 100))
            for j in range(6):
                c = [(200, 30, 50), (120, 180, 60), (240, 200, 70), (90, 60, 140), (240, 140, 50), (200, 30, 50)][(j + k) % 6]
                p.el((26 + j * 8, y - 3, 31 + j * 8, y + 2), c)
        return
    if re.search(r"lupien|chips", n):
        tanier(p)
        for _ in range(9):
            x, y = rng.randint(26, 60), rng.randint(27, 38)
            p.el((x, y, x + 10, y + 7), (240, 215, 140))
            p.bod(x + 5, y + 3, (190, 120, 60))
        return
    miska(p, (200, 50, 60), kopa=True, farba=(240, 240, 245))
    farby = [(200, 30, 50), (90, 60, 140), (120, 180, 60), (240, 200, 70), (240, 140, 50)]
    for _ in range(26):
        x, y = rng.randint(31, 61), rng.randint(13, 21)
        p.el((x, y, x + 3, y + 3), rng.choice(farby))
    if "smotan" in sur or "slahack" in sur:
        p.el((40, 9, 56, 16), (250, 248, 240))


def kresli_knedle(p, r, rng, n, sur):
    miska(p, (190, 110, 50), farba=(240, 238, 230))
    for x, y in ((34, 17), (44, 18), (54, 16), (39, 21), (50, 21)):
        p.el((x, y, x + 8, y + 6), (245, 235, 210))
    if "mak" in sur: posyp(p, 34, 16, 62, 25, [(40, 40, 50)], 25, rng)


def kresli_chlieb(p, r, rng, n, sur):
    c = (215, 150, 70)
    if re.search(r"cokolad|kakao", n): c = (120, 70, 40)
    if re.search(r"croissant|rozk|rohl", n):
        for k, x in enumerate((20, 46)):
            p.tien_pod((x, 40, x + 30, 50))
            p.tvar(lambda d, x=x: d.chord((x, 22, x + 30, 52), 180, 360, fill=1), c)
            for j in range(4):
                p.ciara([(x + 6 + j * 6, 26), (x + 4 + j * 6, 36)], mix(c, (0, 0, 0), .3))
        return
    if re.search(r"cesto|korpus", n):
        p.ob((14, 36, 82, 50), (200, 150, 100), obrys=False)
        for y in range(37, 50, 3):
            p.ciara([(14, y), (82, y)], (185, 135, 90))
        p.tint(lambda d: d.ellipse((24, 32, 72, 48), fill=1), (255, 255, 255), .35)
        if "korpus" in n or "kolac" in n:
            p.el((28, 22, 68, 42), (230, 185, 110))
            p.el((32, 24, 64, 39), (240, 205, 140), obrys=False)
        else:
            p.el((32, 20, 64, 42), (245, 225, 185))
        p.ob((66, 24, 86, 28), (190, 140, 90))
        return
    if re.search(r"buchty|zeml|bun|conch|nikuman|pity|bowl|misk|chlebicek|loptick|bump", n):
        cols = [(225, 165, 90)] * 3
        if "conch" in n: cols = [(240, 170, 190), (245, 215, 120), (150, 100, 70)]
        if "nikuman" in n: cols = [(248, 245, 238)] * 3
        if "pity" in n:
            for k in range(3):
                p.el((24 + k * 4, 34 - k * 5, 64 + k * 4, 46 - k * 5), (235, 205, 150))
            return
        for k, (x, y) in enumerate([(22, 28), (40, 24), (58, 28)]):
            p.tien_pod((x, y + 14, x + 18, y + 20))
            p.el((x, y, x + 17, y + 16), cols[k])
            if "conch" in n:
                for j in range(3):
                    p.ciara([(x + 3 + j * 4, y + 3), (x + 4 + j * 4, y + 9)], mix(cols[k], (0, 0, 0), .2))
        return
    if re.search(r"trojuholn", n):
        for k, x in enumerate((22, 42, 60)):
            p.poly([(x, 44), (x + 9, 26), (x + 18, 44)], (235, 175, 80))
            posyp(p, x + 4, 32, x + 14, 42, [(240, 140, 40), (90, 160, 60)], 5, rng)
        return
    # veka / bochník
    p.tien_pod((18, 42, 80, 52))
    p.zaobl((18, 22, 78, 46), 11, c)
    for x in range(28, 72, 10):
        p.ciara([(x, 26), (x + 5, 32)], mix(c, (250, 230, 180), .5), 2)


def kresli_natierka(p, r, rng, n, sur):
    c = farba_zmesi(r, vyluc=("olej", "sol"), predvolena=(225, 200, 150))
    # chlieb vľavo, miska vpravo
    for k in range(2):
        x = 18 + k * 7
        p.zaobl((x, 26 - k * 2, x + 22, 46 - k * 2), 4, (215, 160, 80))
        p.zaobl((x + 2, 28 - k * 2, x + 20, 44 - k * 2), 3, (245, 225, 175), obrys=False)
    p.zaobl((27, 26, 45, 34), 3, c, obrys=False)
    p.tien_pod((50, 40, 82, 50))
    p.tvar(lambda d: d.chord((50, 22, 80, 48), 0, 180, fill=1), (220, 225, 230))
    p.el((50, 30, 80, 38), c)
    posyp(p, 54, 31, 76, 36, [mix(c, (255, 255, 255), .4), (90, 160, 60), (200, 60, 40)], 8, rng)


def kresli_poharik(p, r, rng, n, sur, typ):
    """Omáčky, dresingy, džemy, korenie: pohár s viečkom alebo miska s lyžičkou."""
    c = farba_zmesi(r, vyluc=("olej",), predvolena=(205, 60, 40))
    if typ == "korenie":
        p.tien_pod((24, 42, 72, 52))
        p.tvar(lambda d: d.chord((24, 18, 72, 50), 0, 180, fill=1), (150, 105, 70))
        p.tvar(lambda d: d.chord((28, 26, 68, 38), 180, 360, fill=1), c)
        posyp(p, 30, 26, 66, 33, [(140, 40, 30), (230, 190, 90), (90, 120, 50), (70, 45, 30)], 50, rng)
        p.ciara([(66, 34), (82, 24)], (190, 150, 100), 2)
        return
    if typ == "popcorn":
        miska(p, (250, 240, 200), kopa=True, farba=(205, 50, 50))
        for _ in range(28):
            x, y = rng.randint(30, 62), rng.randint(9, 21)
            p.el((x, y, x + 4, y + 3), rng.choice([(252, 248, 225), (245, 220, 140)]), obrys=False)
            p.bod(x + 1, y + 1, (255, 255, 255))
        return
    if typ == "chipsy":
        miska(p, (240, 200, 110), kopa=True, farba=(90, 120, 170))
        for _ in range(14):
            x, y = rng.randint(30, 58), rng.randint(9, 19)
            p.el((x, y, x + 8, y + 5), rng.choice([(240, 200, 100), (225, 170, 70), (110, 150, 70)]))
        return
    if typ == "dip":
        tanier(p)
        p.el((34, 22, 62, 38), (240, 240, 245))
        p.el((37, 24, 59, 34), c, obrys=False)
        posyp(p, 39, 25, 57, 32, [mix(c, (255, 255, 255), .45), (90, 160, 60)], 8, rng)
        for k, x in enumerate((22, 64, 30, 60)):
            p.poly([(x, 44), (x + 4, 36), (x + 9, 44)], (230, 180, 90))
        return
    # pohár s viečkom
    p.tien_pod((32, 44, 66, 52))
    p.zaobl((32, 18, 64, 47), 4, (225, 235, 240))
    p.zaobl((34, 24, 62, 45), 3, c, obrys=False)
    p.ob((31, 12, 65, 18), (190, 60, 50) if rng.random() < .5 else (200, 170, 60))
    p.ob((38, 29, 58, 38), (248, 240, 220))
    p.ciara([(41, 33), (55, 33)], (150, 140, 130))
    p.ciara([(35, 21), (35, 42)], (255, 255, 255))


def kresli_flasa(p, r, rng, n, sur):
    c = farba_zmesi(r, vyluc=("voda", "cukor") if not re.search(r"^cukrov|jednoduch|zakladn", n) else (),
                    predvolena=(230, 210, 170))
    if re.search(r"cukrov|cukor 1|jednoduch|zakladn.*sirup|sol|roztok", n):
        c = (238, 240, 236)
    if re.search(r"hned", n): c = (170, 100, 40)
    p.tien_pod((34, 44, 64, 52))
    sklo = (210, 228, 235)
    p.zaobl((36, 20, 60, 47), 5, sklo)
    p.ob((44, 9, 52, 20), sklo)
    p.zaobl((38, 26, 58, 45), 4, c, obrys=False)
    p.ob((43, 5, 53, 9), (150, 100, 60))
    p.ob((40, 30, 56, 38), (245, 238, 215))
    p.ciara([(43, 34), (53, 34)], (130, 110, 100))
    p.ciara([(39, 23), (39, 43)], (255, 255, 255))
    if re.search(r"citron|limet", sur):
        p.el((62, 38, 72, 46), (245, 220, 70))
        p.el((64, 40, 70, 44), (250, 245, 200), obrys=False)


def chut_vyrobku(n):
    for vz, c in ((r"jahod|cerešn|ceresn|malin", (235, 110, 140)), (r"banan|vanilk", (245, 220, 120)),
                  (r"kav|cokolad|kakao", (140, 90, 60)), (r"kokos|natural|biely|light|jemny|pitny|acidofil", (245, 245, 240)),
                  (r"pazit|cottage", (120, 180, 80)), (r"paradaj", (215, 60, 45))):
        if re.search(vz, n):
            return c
    return (110, 160, 210)


def kresli_vyrobok(p, r, rng, n, sur):
    """Kúpený snack: tvar balenia podľa slova v zátvorke (kelímok, fľaša, vrecko, konzerva…)."""
    obal = n.split("(")[-1] if "(" in n else n
    meno = n.split("(")[0]
    chut = chut_vyrobku(meno)
    znacka = mix(chut, (40, 60, 120), .35)
    if re.search(r"flas", obal):
        p.tien_pod((36, 44, 62, 52))
        p.zaobl((38, 18, 58, 47), 4, (245, 245, 240))
        p.ob((43, 10, 53, 18), (245, 245, 240))
        p.ob((42, 6, 54, 10), znacka)
        p.ob((38, 26, 58, 39), chut, obrys=False)
        p.ob((38, 31, 58, 33), znacka, obrys=False)
        p.ciara([(40, 21), (40, 44)], (255, 255, 255))
        return
    if re.search(r"vreck", obal) or re.search(r"jerky|susen", meno):
        obsah = (190, 140, 90) if re.search(r"kesu|orech|mandl", meno) else (235, 130, 45) if "mrkv" in meno else (150, 80, 50)
        p.tien_pod((30, 44, 66, 52))
        p.poly([(32, 14), (64, 14), (66, 46), (30, 46)], mix(znacka, (255, 255, 255), .2))
        p.ob((32, 14, 64, 18), mix(znacka, (0, 0, 0), .2))
        p.el((38, 24, 58, 40), (240, 240, 235))
        for _ in range(9):
            x, y = rng.randint(40, 53), rng.randint(26, 36)
            p.el((x, y, x + 4, y + 3), obsah)
        return
    if re.search(r"konzerv", obal):
        p.tien_pod((24, 40, 74, 50))
        p.el((24, 26, 72, 46), (190, 195, 205))
        p.el((27, 28, 69, 43), (150, 120, 70), obrys=False)
        for k in range(4):
            p.zaobl((31 + k * 9, 30, 38 + k * 9, 41), 3, (200, 190, 175) if "tuniak" in meno else (170, 175, 185))
        p.tvar(lambda d: d.arc((62, 20, 74, 30), 0, 360, fill=1, width=2), (205, 210, 220))
        return
    if re.search(r"platk|balenie 100|tofu", obal + meno) and not re.search(r"syr|mozzarell", meno):
        c = (245, 235, 220) if "tofu" in meno else (235, 160, 150) if re.search(r"sunk|prsia", meno) else (200, 120, 90)
        p.tien_pod((20, 40, 78, 52))
        p.zaobl((20, 20, 76, 46), 3, (225, 235, 240))
        for k in range(4):
            p.el((24 + k * 11, 24, 40 + k * 11, 42), c)
        p.ob((54, 34, 74, 44), znacka)
        return
    if re.search(r"rozok|chlebick", meno):
        tanier(p)
        if "rozok" in meno:
            p.zaobl((26, 28, 70, 40), 6, (200, 140, 80))
            for x in range(32, 68, 7):
                p.ciara([(x, 29), (x + 3, 39)], (165, 105, 55))
        else:
            for k in range(3):
                p.el((26 + k * 14, 26, 44 + k * 14, 42), (235, 215, 160))
                if "cokolad" in meno: p.el((28 + k * 14, 27, 42 + k * 14, 34), (110, 65, 40), obrys=False)
                if "polev" in meno or "jogurt" in meno: p.el((28 + k * 14, 27, 42 + k * 14, 34), (248, 245, 235), obrys=False)
                posyp(p, 28 + k * 14, 28, 42 + k * 14, 40, [(205, 180, 120)], 8, rng)
        return
    if re.search(r"ceresn|ovoc|jablk|banan|mandarin|hrozn|kiwi", meno):
        kresli_ovocie(p, r, rng, n, sur)
        return
    if re.search(r"olivy", meno):
        p.tien_pod((30, 44, 66, 52))
        p.zaobl((32, 20, 64, 47), 4, (225, 235, 240))
        for k in range(10):
            x, y = 35 + (k % 4) * 7, 25 + (k // 4) * 7
            p.el((x, y, x + 6, y + 5), (110, 140, 50))
            p.bod(x + 2, y + 2, (200, 80, 60))
        p.ob((31, 14, 65, 20), (60, 110, 60))
        return
    # kelímok / vanička / téglik / mini syry
    obsah = (245, 240, 230)
    if "hummus" in meno: obsah = (225, 195, 130)
    if re.search(r"mozzarell|mini syr", meno):
        tanier(p)
        for k in range(7):
            x, y = 28 + (k % 4) * 9, 30 + (k // 4) * 7
            p.el((x, y, x + 8, y + 7), (250, 248, 238))
        return
    p.tien_pod((28, 44, 68, 52))
    p.poly([(28, 20), (68, 20), (63, 47), (33, 47)], (245, 245, 240))
    p.poly([(29, 27), (67, 27), (65, 38), (31, 38)], chut, obrys=False)
    p.ciara([(30, 32), (66, 32)], znacka)
    p.el((26, 14, 70, 24), (205, 210, 220))
    p.el((32, 16, 64, 22), obsah, obrys=False)
    if "pazit" in meno: posyp(p, 34, 16, 62, 21, [(90, 160, 60)], 10, rng)
    if "paradaj" in meno: posyp(p, 34, 16, 62, 21, [(210, 55, 45)], 8, rng, 2)


# ─────────────────────────── nápoje ───────────────────────────
JASNE = re.compile(r"gin|vodk|biely rum|sake|soju|tequil|mezcal|pisco|sodov|voda|tonik|led|sprite|sumiv|prosecc|sampan")


def farba_napoja(r, n):
    if re.search(r"modr|blue|curacao", n): return (55, 130, 230)
    if re.search(r"zelen|green|grasshopper|matcha|melonov|poison", n): return (110, 200, 80)
    if re.search(r"ruzov|pink", n): return (245, 140, 175)
    if re.search(r"tmav[ey] pivo|stout|espresso|kav|cokolad|white russian|cola|kole", n): return (90, 55, 35)
    if re.search(r"smotan|mliecn|lassi|kokos|cream|white", n): return (245, 230, 205)
    c = farba_zmesi(r, predvolena=(225, 236, 240))
    return c


def kresli_napoj(p, r, rng, n, sur, typ):
    tekut = farba_napoja(r, n)
    sklo = (215, 230, 240)
    horuci = typ in ("hrnek", "salka")
    if typ == "panak":
        p.tien_pod((38, 44, 60, 50))
        p.tint(lambda d: d.polygon([(38, 24), (58, 24), (56, 46), (40, 46)], fill=1), (255, 255, 255), .2)
        p.tvar(lambda d: d.polygon([(38, 24), (58, 24), (56, 46), (40, 46)], fill=1), tekut, ymin=29, obrys=False)
        if "vrstv" in n:
            p.tvar(lambda d: d.polygon([(38, 24), (58, 24), (56, 46), (40, 46)], fill=1), (240, 200, 90), ymin=36, ymax=40, obrys=False)
            p.tvar(lambda d: d.polygon([(38, 24), (58, 24), (56, 46), (40, 46)], fill=1), (200, 40, 60), ymin=41, obrys=False)
        p.ob((40, 43, 56, 46), mix(sklo, (255, 255, 255), .4), obrys=False)
        for a, b in (((38, 24), (40, 46)), ((58, 24), (56, 46)), ((38, 24), (58, 24))):
            p.ciara([a, b], sklo)
        p.ciara([(41, 27), (42, 42)], (255, 255, 255))
        return
    if typ == "martini":
        p.tien_pod((38, 46, 60, 51))
        p.tint(lambda d: d.polygon([(30, 12), (66, 12), (48, 32)], fill=1), (255, 255, 255), .15)
        p.tvar(lambda d: d.polygon([(30, 12), (66, 12), (48, 32)], fill=1), tekut, ymin=15, obrys=False)
        p.ciara([(30, 12), (48, 32), (66, 12)], sklo)
        p.ciara([(30, 12), (66, 12)], sklo)
        p.ob((47, 32, 49, 45), sklo, obrys=False)
        p.el((38, 44, 58, 48), sklo)
        p.ciara([(34, 14), (44, 25)], (255, 255, 255))
        if re.search(r"oliv|dirty|filthy|kapar", n + sur):
            p.ciara([(52, 8), (46, 22)], (150, 110, 70))
            p.el((45, 19, 50, 24), (110, 140, 50))
        elif re.search(r"citron|limet|pomaranc|yuzu", sur):
            p.el((60, 6, 70, 16), (245, 210, 60))
            p.el((62, 8, 68, 14), (252, 240, 180), obrys=False)
        else:
            p.el((56, 7, 62, 13), (190, 25, 45))
        return
    if typ == "vino":
        p.tien_pod((38, 46, 60, 51))
        tvar = lambda d: d.polygon([(41, 6), (55, 6), (54, 28), (48, 32), (42, 28)], fill=1)
        p.tint(tvar, (255, 255, 255), .15)
        p.tvar(tvar, tekut, ymin=12, obrys=False)
        for k in range(6):
            p.bod(45 + (k * 3) % 7, 26 - k * 2, (255, 255, 240))
        p.ciara([(41, 6), (42, 28), (48, 32), (54, 28), (55, 6)], sklo)
        p.ob((47, 32, 49, 45), sklo, obrys=False)
        p.el((39, 44, 57, 48), sklo)
        p.ciara([(43, 9), (44, 25)], (255, 255, 255))
        return
    if typ == "pivo":
        p.tien_pod((32, 44, 66, 52))
        p.tvar(lambda d: d.arc((52, 20, 66, 38), 270, 90, fill=1, width=3), sklo, obrys=False)
        p.tint(lambda d: d.rectangle((34, 12, 58, 47), fill=1), (255, 255, 255), .15)
        p.ob((34, 16, 58, 47), tekut if tekut != (226, 236, 240) else (230, 170, 50), obrys=False)
        p.el((32, 8, 60, 20), (252, 248, 236))
        p.el((36, 6, 50, 14), (255, 252, 244), obrys=False)
        p.ciara([(34, 14), (34, 47), (58, 47), (58, 14)], sklo)
        for k in range(5):
            p.bod(40 + k * 4, 40 - k * 4 % 9, (255, 240, 200))
        p.ciara([(37, 20), (37, 44)], (255, 255, 255))
        return
    if horuci:
        p.tien_pod((28, 44, 70, 52))
        if typ == "salka":
            p.el((24, 41, 72, 49), (240, 238, 232))
        hrnek = (200, 80, 60) if rng.random() < .5 else (240, 238, 232)
        p.tvar(lambda d: d.arc((54, 22, 68, 38), 270, 90, fill=1, width=3), hrnek)
        p.zaobl((32, 18, 60, 44), 4, hrnek)
        p.el((32, 15, 60, 22), mix(hrnek, (255, 255, 255), .2))
        p.el((34, 16, 58, 21), tekut, obrys=False)
        if re.search(r"smotan|con panna|slahack|marshm", n + sur):
            p.el((36, 11, 56, 19), (252, 250, 245))
        p.para(39, 11, rng)
        return
    # highball / tumbler
    nizky = typ == "tumbler"
    x0, x1, y0 = (36, 60, 24) if nizky else (38, 58, 8)
    y1 = 46
    tvar = lambda d: d.rectangle((x0, y0, x1, y1), fill=1)
    p.tien_pod((x0 - 2, y1 - 2, x1 + 4, y1 + 5))
    p.tint(tvar, (255, 255, 255), .18)
    hladina = y0 + (3 if nizky else 5)
    if "frozen" in n or "mrazen" in n or "smoothie" in n or "lassi" in n:
        p.tvar(tvar, tekut, ymin=hladina, obrys=False)
        p.el((x0, hladina - 4, x1, hladina + 3), mix(tekut, (255, 255, 255), .3), obrys=False)
    else:
        p.tvar(tvar, tekut, ymin=hladina, obrys=False)
        if not horuci and typ != "smoothie":
            for k in range(2 if nizky else 3):
                xx = x0 + 3 + (k % 2) * 8 + rng.randint(0, 2)
                yy = hladina + 2 + k * 7
                p.tint(lambda d, a=xx, b=yy: d.rectangle((a, b, a + 7, b + 6), fill=1), (255, 255, 255), .45)
                p.tint(lambda d, a=xx, b=yy: d.line((a, b, a + 7, b), fill=1), (255, 255, 255), .6)
    if "vrstv" in n or "sunrise" in n:
        p.tvar(tvar, (205, 40, 60), ymin=y1 - 9, obrys=False)
    p.ob((x0 + 1, y1 - 2, x1 - 1, y1), mix(sklo, (255, 255, 255), .3), obrys=False)
    p.ciara([(x0, y0), (x0, y1), (x1, y1), (x1, y0)], sklo)
    p.ciara([(x0 + 2, y0 + 3), (x0 + 2, y1 - 4)], (255, 255, 255))
    if not nizky:
        p.ciara([(x0 + 10, y0 + 6), (x0 + 16, y0 - 6)], (230, 60, 70), 2)
    if re.search(r"limet|citron|pomaranc|grapefruit|yuzu", sur):
        cc = (130, 190, 60) if "limet" in sur else (245, 160, 40) if re.search("pomaranc|grapefruit", sur) else (245, 215, 60)
        p.el((x1 - 5, y0 - 5, x1 + 6, y0 + 6), cc)
        p.el((x1 - 3, y0 - 3, x1 + 4, y0 + 4), mix(cc, (255, 255, 240), .6), obrys=False)
    if re.search(r"mat[ay]|mojito", sur + n):
        posyp(p, x0 + 2, hladina - 2, x1 - 2, hladina + 1, [(70, 160, 60)], 6, rng, 2)
    if re.search(r"ceres|maraschino", sur) and nizky:
        p.el((x0 + 8, hladina - 3, x0 + 12, hladina + 1), (190, 25, 45))


# ─────────────────────────── zaradenie ───────────────────────────
def hlava_nazvu(n):
    """Hlavné podstatné meno popisu: „Burgat – modré kuracie špízy s arašidovou omáčkou“ → „modré kuracie špízy“.
    Omáčka, sirup či džem za predložkou je príchuť, nie to, čo je na obrázku."""
    if " – " in n:
        n = n.split(" – ", 1)[1]
    return re.split(r" (?:s|so|v|vo|na|z|zo|do|pod|namiesto|typu|ako) ", n, maxsplit=1)[0]


def druh(r):
    """(funkcia, typ) podľa názvu, kategórie a surovín — prvé pravidlo, ktoré sedí, vyhráva."""
    n = ascii_(r.get("nazov"))
    h = hlava_nazvu(n)
    kat = r.get("kategoria") or ""
    if kat == "Snack" or r.get("typ") == "vyrobok":
        return "vyrobok"
    if kat != "Kokteil" and re.search(r"sirup|liker|tinktur|bitter|roztok|extract|koncentr|concentrate|ochuten|grenadin|syrup", h):
        return "flasa"
    if kat in ("Kokteil", "Nápoj") or re.search(r"\b(bourbon|rum|whisk|vodk)", h) and kat == "Príloha":
        if re.search(r"shot|panak|bomb\b|bombdrop|stimpak|pip-boy|robobrain|ad victorium", n):
            return "napoj:panak"
        if re.search(r"martini|vespertini|saketini|algonquin|mary pickford|memory|quicksilver|perfection|mystery|graygarden|elasa|weeping", n):
            return "napoj:martini"
        if re.search(r"pivo|\bale\b|shandy|rad-ler|radler|beer", n):
            return "napoj:pivo"
        if re.search(r"spritz|bellini|sampan|prosecc|\bmead|medovin|sherry cobbler|tall moose|fizz|umi.s", n):
            return "napoj:vino"
        if re.search(r"rusty nail|sour|old fashion|c\.a\.m\.p|tuchanka|horse choker|dirty squirrel|giddyup|white russian|italian|rum relay", n):
            return "napoj:tumbler"
        horuce = r"horuc|\bhot\b|mulled|grog" if kat == "Kokteil" else \
            r"horuc|\bhot\b|mulled|grog|caj\b|\btea\b|kav[ay]\b|coffee|espresso|cokolad|latte|matcha"
        if re.search(horuce, n) and not re.search(r"ladov|studen|divini|smoothie|limonad", n):
            return "napoj:salka" if re.search(r"caj|\btea\b|espresso|kav|coffee", n) else "napoj:hrnek"
        return "napoj:highball"
    if kat == "Príloha" and re.search(r"korenist|zmes|rub\b|spice", h):
        return "pohar:korenie"
    if re.search(r"popcorn|pukanc", h):
        return "pohar:popcorn"
    if kat == "Príloha" and re.search(r"chips|lupienk|orech|semienk|snack", h):
        return "pohar:chipsy"
    if kat in ("Príloha", "Nátierka") and re.search(r"dresing|dressing|aioli|\bdip\b|salsa|guacamol|omack|sauce|kecup|harissa|venom|horcic|aspik", h) \
            or re.search(r"dzem|\bjam\b|catni", h):
        return "pohar:dip" if re.search(r"dip|guacamol|aioli|salsa", h) else "pohar:pohar"
    if kat == "Nátierka" or re.search(r"natierk|pasta\b|maslo\b|butter|hummus", h):
        return "natierka"
    if kat == "Polievka" or re.search(r"polievk|bisque|ramen|\budon", n):
        return "polievka"
    if re.search(r"muffin|mafin", n):
        return "cupcake"
    if kat == "Pečivo":
        return "chlieb"
    if re.search(r"susienk|cookie|tycink", h):
        return "susienky"
    if re.search(r"pizz", n) and "vafl" not in n:
        return "pizza"
    if re.search(r"burger|slider", n):
        return "burger"
    if re.search(r"sendvic|sandwich|bageta|\bsub\b|cubano|toast|rarebit|bagel|basket|zeml[ae]\b", n):
        return "burger:dlhy"
    if re.search(r"wrap|burrito|tamal|donair|tortil|taco|tostad", n):
        return "wrap"
    if kat == "Dezert":
        if re.search(r"polievk|shiruko", n): return "polievka"
        if re.search(r"knedl|dumpling|sulanc", n): return "knedle"
        if re.search(r"makron|susienk|cookie|kolacik|crunch|biscuit|gingerbeard", n): return "susienky"
        if re.search(r"\bpie\b|kolac|tart", n): return "kolac"
        if re.search(r"nanuk|zmrzlin", n): return "puding"
        if re.search(r"bataty", n): return "tanier:zemiaky"
        if re.search(r"jablk|ovoc", h): return "ovocie"
        if re.search(r"brownie|block|kock|karamel|marshmallow|cloud|sweets|honey", n): return "kocky"
        if re.search(r"cupcake|kosick", n): return "cupcake"
        if re.search(r"sisk|donut|obanyaki", n): return "sisky"
        if re.search(r"palacink|lievan|crepe|vafl", n): return "palacinky"
        if re.search(r"puding|pudding|pena|mochi|krem", n): return "puding"
        if re.search(r"ovocn|berries|banan|lupienk|spiz", n): return "ovocie"
        return "torta"
    if kat == "Pečivo" or re.search(r"croissant|cesto\b|korpus", n):
        return "chlieb"
    if re.search(r"vafl|palacink|lievan|blinc|crepe", n):
        return "palacinky"
    if re.search(r"omelet|vajc|vajic|benedict|huevos|deviled", h) or re.search(r"anglicke ranajky", n):
        return "tanier:vajcia"
    if re.search(r"chlebick", h) and "chlieb" not in h:
        return "vyrobok"
    if re.search(r"poke|bento|katsudon", h):
        return "ryza"
    if re.search(r"bowl|misk|kasa|granol|acai|oats", h):
        return "ovocie"
    if re.search(r"\bryz|bulgur|quinoa|kuskus", h):
        return "ryza"
    if re.search(r"plack", h):
        return "tanier:placky"
    if re.search(r"piroh", h):
        return "tanier:pirohy"
    if re.search(r"halusk|sulanc", h):
        return "knedle"
    if re.search(r"chlieb|chlebic", h):
        return "chlieb"
    if re.search(r"tekvic|batat", h) and not re.search(r"plnen|polievk|krem|kari|curry", h):
        return "tanier:zemiaky"
    if re.search(r"musak|zapek|zapec", h):
        return "zapekane"
    if kat == "Šalát" or re.search(r"salat", h):
        return "salat"
    if kat == "Cestoviny" or re.search(r"rezanc|cestovin|spaget|gnocch|noodl", h):
        return "cestoviny"
    if kat in ("Hlavné jedlo", "Polievka") and re.search(
            r"kari|curry|chili|cili|gulas|ragu|waterzooi|sukiyaki|nikujaga|sosovic|lepenic|fondue|chvost|\blick|sterc", n):
        return "hrniec"
    if re.search(r"spiz|kebab|yakitori|satay|skewer|burgat|bites|balance", h):
        return "tanier:spiz"
    if re.search(r"krevet|shrimp|chobotn", h):
        return "tanier:krevety"
    if re.search(r"ryba|treska|fish|losos|morsk", n):
        return "tanier:ryba"
    if re.search(r"poutine|zemiak|samos|bataty", h) and not re.search(r"zapek|zapec|plnen", h):
        return "tanier:zemiaky"
    if re.search(r"kridl|stehn|stehien|rebr|wings", h):
        return "tanier:kuracie_stehna"
    if re.search(r"hranol|fries|finger|stripsy|tenders|rezen|vyprazan|tempura", n):
        return "tanier:rezen"
    if re.search(r"tekvic", n) and "plnen" in n:
        return "tanier:tekvica"
    if re.search(r"sampinon|hub[ya]", h):
        return "tanier:hriby"
    if re.search(r"\bpie\b|kolac|tart|musak|zapek|zapec|balick|puff|kosick|smorgas|torta", n):
        return "zapekane"
    if re.search(r"mortadel|salam|sekan|rolad|aspik", h):
        return "tanier:maso"
    if kat == "Raňajky":
        return "ovocie" if re.search(r"jogurt|ovoc", suroviny(r)) else "burger:dlhy"
    if kat == "Príloha" and re.search(r"syr", n):
        return "natierka"
    return "tanier:maso"


def kresli(r):
    rid = r["id"]
    rng = random.Random(int(hashlib.md5(rid.encode()).hexdigest()[:8], 16))
    n = ascii_(r.get("nazov"))
    sur = suroviny(r)
    d = druh(r)
    hlavny, _, typ = d.partition(":")
    p = Platno()
    if hlavny in ("napoj",) or (hlavny == "flasa" and r.get("kategoria") in ("Kokteil", "Nápoj")):
        pozadie_bar(p, rng)
    else:
        pozadie_obrus(p, r.get("kategoria"), rng)
    f = {
        "polievka": kresli_polievka, "salat": kresli_salat, "hrniec": kresli_hrniec, "ryza": kresli_ryza_miska,
        "cestoviny": kresli_cestoviny, "pizza": kresli_pizza, "wrap": kresli_wrap, "zapekane": kresli_zapekane,
        "kolac": kresli_kolac, "torta": kresli_torta, "susienky": kresli_susienky, "kocky": kresli_kocky,
        "puding": kresli_puding, "palacinky": kresli_palacinky, "sisky": kresli_sisky, "cupcake": kresli_cupcake,
        "ovocie": kresli_ovocie, "knedle": kresli_knedle, "chlieb": kresli_chlieb, "natierka": kresli_natierka,
        "flasa": kresli_flasa, "vyrobok": kresli_vyrobok,
    }
    if hlavny == "napoj":
        kresli_napoj(p, r, rng, n, sur, typ)
    elif hlavny == "tanier":
        kresli_tanier_jedlo(p, r, rng, n, sur, typ)
    elif hlavny == "burger":
        kresli_burger(p, r, rng, n, sur, dlhy=typ == "dlhy")
    elif hlavny == "pohar":
        kresli_poharik(p, r, rng, n, sur, typ)
    else:
        f[hlavny](p, r, rng, n, sur)
    return p.img.resize((W * S, H * S), Image.NEAREST), d


def _kontrola():
    """Prípady, na ktorých sa zaradenie raz pokazilo (spusti: --test)."""
    pr = [("Exquisite Katsudon – ryža s vyprážaným bravčovým rezňom a vajcom", "Hlavné jedlo", "ryza"),
          ("Garr’s Limeade – bazalková limetková limonáda", "Nápoj", "napoj:highball"),
          ("Yanjem’s Sweet Dumplings – sladké knedlíčky v korenenom javorovom sirupe s rumom", "Dezert", "knedle"),
          ("Burgat – modré kuracie špízy s arašidovou omáčkou", "Príloha", "tanier:spiz"),
          ("Kaidan’s Steak Sandwich – bageta so steakom a slaninovo-pivným džemom", "Hlavné jedlo", "burger:dlhy"),
          ("Balíčky z lístkového cesta s prosciuttom, špargľou a čedarom", "Príloha", "zapekane"),
          ("Tupo Concentrate – sirup z granátového jablka", "Príloha", "flasa"),
          ("Stimpak – vodkový shot s broskyňovým likérom a energetickým nápojom", "Kokteil", "napoj:panak"),
          ("Kešu porciové (vrecko 25 g)", "Snack", "vyrobok")]
    for nazov, kat, cak in pr:
        d = druh({"nazov": nazov, "kategoria": kat, "ingrediencie": []})
        assert d == cak, (nazov, d, cak)
    print(f"OK: {len(pr)} prípadov zaradenia")


def main():
    if "--test" in sys.argv:
        return _kontrola()
    ap = argparse.ArgumentParser()
    ap.add_argument("--len", help="id1,id2,… — len tieto recepty (prepíše aj existujúci pixel art)")
    ap.add_argument("--nahlad", help="adresár: nič nezapíše do receptov, uloží PNG s druhom v názve")
    a = ap.parse_args()
    recepty = {}
    for c in glob.glob(os.path.join(RECEPTY, "*.json")):
        with open(c, encoding="utf-8") as fh:
            r = json.load(fh)
        recepty[r["id"]] = r
    zdroje = json.load(open(ZDROJE, encoding="utf-8")) if os.path.exists(ZDROJE) else {}
    if a.len:
        ids = [i for i in a.len.split(",") if i in recepty]
        ids = [i for i in ids if not os.path.exists(os.path.join(FOTKY, i + ".webp"))
               or (zdroje.get(i) or {}).get("pixelart") or a.nahlad]
    else:
        ids = sorted(i for i, r in recepty.items()
                     if not os.path.exists(os.path.join(FOTKY, i + ".webp"))
                     and not str(r.get("foto") or "").startswith("data:"))
    dnes = datetime.date.today().isoformat()
    for i in ids:
        img, d = kresli(recepty[i])
        if a.nahlad:
            os.makedirs(a.nahlad, exist_ok=True)
            img.save(os.path.join(a.nahlad, f"{d.replace(':', '-')}__{i}.png"))
            continue
        cesta = os.path.join(FOTKY, i + ".webp")
        img.save(cesta, "WEBP", lossless=True, quality=100, method=6)
        zdroje[i] = {"autor": "Jedlo — pixel art", "licencia": "vlastná ilustrácia (vygenerovaná)",
                     "pixelart": True, "druh": d, "rozmer": f"{W * S}x{H * S}", "stiahnute": dnes,
                     "bajtov": os.path.getsize(cesta), "zdroj": "scripts/pixel_art_fotky.py"}
    if not a.nahlad:
        with open(ZDROJE, "w", encoding="utf-8") as f:
            json.dump(zdroje, f, ensure_ascii=False, indent=1, sort_keys=True)
    print(f"{'Náhľad' if a.nahlad else 'Pixel art'}: {len(ids)} receptov")


if __name__ == "__main__":
    main()
