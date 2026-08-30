# -*- coding: utf-8 -*-
"""Kontrola kontrastu palety Organic (WCAG 2.1 AA).

Farby cita PRIAMO z bloku „Organic theme" v data/sablona.html, takze test
padne, ak niekto tokeny prepise. Spustenie:

    py scripts/kontrast_organic.py
"""
import pathlib, re, sys

TPL = pathlib.Path(__file__).resolve().parent.parent / "data" / "sablona.html"


def _lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def jas(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def kontrast(a, b):
    la, lb = sorted((jas(a), jas(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def tokeny(src, selektor):
    """Vytiahne --nazov:#hex z jedneho bloku v Organic temе."""
    blok = re.search(re.escape(selektor) + r"\{(.*?)\}", src, re.S).group(1)
    return dict(re.findall(r"--([a-z-]+):\s*(#[0-9a-fA-F]{6})", blok))


# text -> pozadie; kazdy par musi mat aspon 4,5:1 (AA, bezny text)
#
# --accent je tu zamerne: app.js ho pise do INLINE stylov ako farbu textu
# (data/app.js:381, :383 odkazy v prazdnom stave, :811+:1555 sucet kcal v pláne).
# Inline styl prebije kazde CSS pravidlo, takze jedina obrana je hodnota tokenu.
PARY = [
    ("ink", "bg"), ("ink", "panel"), ("ink", "chip"),
    ("muted", "bg"), ("muted", "panel"), ("muted", "chip"),
    ("accent-txt", "bg"), ("accent-txt", "panel"), ("accent-txt", "chip"),
    ("accent", "bg"), ("accent", "panel"), ("accent", "chip"),
    ("warn", "bg"), ("warn", "panel"),
]

# tonovane plochy z Organic bloku, na ktorych tiez konci text vo farbe --accent
# (suctovy riadok planu, podfarbenie blokov, badge, hero dnesneho varenia)
PLOCHY = ["#f0e6d6", "#f2e6d4", "#f9f2e6", "#f2e7d6", "#f7ecdd", "#f5eadb", "#fbf4e9"]
# biely text na tychto plochach (bocny panel, hero, hlavicka planu, toast, .btn.primary)
BIELE = ["accent-fill", "accent-dark"]


def skontroluj(nazov, p):
    zle = []
    for a, b in PARY:
        v = kontrast(p[a], p[b])
        print("  %-11s na %-6s %5.2f %s" % (a, b, v, "OK" if v >= 4.5 else "PADA"))
        if v < 4.5:
            zle.append("%s/%s v %s = %.2f" % (a, b, nazov, v))
    for k in BIELE:
        v = kontrast("#ffffff", p[k])
        print("  %-11s pod bielym  %5.2f %s" % (k, v, "OK" if v >= 4.5 else "PADA"))
        if v < 4.5:
            zle.append("biela/%s v %s = %.2f" % (k, nazov, v))
    return zle


src = TPL.read_text(encoding="utf-8")
assert "Organic theme — start" in src, "v sablone chyba blok Organic theme"
organic = src.split("Organic theme — start")[1]

chyby = []
for nazov, sel in (("svetly", ":root"), ("tmavy", "body.dark")):
    print("==", nazov)
    chyby += skontroluj(nazov, tokeny(organic, sel))

# --accent ako text na svetlych tonovanych plochach (len svetly rezim: v tmavom
# su tieto plochy prekryte pravidlami body.dark ...)
print("== --accent na tonovanych plochach (svetly)")
p = tokeny(organic, ":root")
for ploc in PLOCHY:
    v = kontrast(p["accent"], ploc)
    print("  accent na %s %5.2f %s" % (ploc, v, "OK" if v >= 4.5 else "PADA"))
    if v < 4.5:
        chyby.append("accent/%s = %.2f" % (ploc, v))

if chyby:
    print("\nPADA:", *chyby, sep="\n  ")
    sys.exit(1)
print("\nVsetky pary spĺňajú WCAG AA.")
