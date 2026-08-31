# -*- coding: utf-8 -*-
"""Kontrola kontrastu dizajnového systému „Bloky" (WCAG 2.1 AA).

Farby číta PRIAMO z bloku „Bloky theme" v data/sablona.html, takže test padne,
ak niekto tokeny prepíše. Nástupca scripts/kontrast_organic.py.

    python3 scripts/kontrast_bloky.py

Návratový kód 1 = aspoň jeden pár je pod prahom.
"""
import pathlib, re, sys

TPL = pathlib.Path(__file__).resolve().parent.parent / "data" / "sablona.html"

AA_TEXT = 4.5   # bežný text
AA_VELKY = 3.0  # netextové prvky a okraje ovládania (WCAG 1.4.11)


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


def blok_temy(src):
    i = src.index("/* Bloky theme — start")
    j = src.index("/* Bloky theme — end")
    return src[i:j]


def tokeny(blok, selektor):
    m = re.search(re.escape(selektor) + r"\s*\{(.*?)\n\s*\}", blok, re.S)
    if not m:
        sys.exit("nenašiel som blok %r v téme" % selektor)
    return dict(re.findall(r"--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})", m.group(1)))


# text -> plocha, prah
PARY = [
    ("text", "zem", AA_TEXT), ("text", "doska", AA_TEXT), ("text", "tint", AA_TEXT),
    ("text2", "zem", AA_TEXT), ("text2", "doska", AA_TEXT), ("text2", "tint", AA_TEXT),
    ("blok-a", "zem", AA_TEXT), ("blok-a", "doska", AA_TEXT), ("blok-a", "tint", AA_TEXT),
    ("blok-b", "zem", AA_TEXT), ("blok-b", "doska", AA_TEXT), ("blok-b", "tint", AA_TEXT),
    ("blok-c", "zem", AA_TEXT), ("blok-c", "doska", AA_TEXT), ("blok-c", "tint", AA_TEXT),
    ("signal", "zem", AA_TEXT), ("signal", "doska", AA_TEXT), ("signal", "tint", AA_TEXT),
    ("zlato", "zem", AA_TEXT), ("zlato", "doska", AA_TEXT), ("zlato", "tint", AA_TEXT),
    ("na-tlaci", "tlac", AA_TEXT),
    # --okraj ohraničuje OVLÁDACIE prvky (tlačidlá, polia, chipy) → 1.4.11 = 3:1.
    # --linka je vlasový oddeľovač, nie ohraničenie ovládania — vypisuje sa informatívne.
    ("okraj", "zem", AA_VELKY), ("okraj", "doska", AA_VELKY), ("okraj", "tint", AA_VELKY),
]
# každá farba bloku je aj PLOCHA, z ktorej sa vyráža text (--na-bloku)
PLOCHY = ["blok-a", "blok-b", "blok-c"]

# režim varenia má natrvalo tmavú plochu a vlastnú sadu farieb blokov
VARENIE_POZADIE = "#141210"
VARENIE_TEXT = "#F4EFE6"
VARENIE_NA_BLOKU = "#141210"


def skontroluj(nazov, p):
    zle = []
    print("\n  %s" % nazov)
    for a, b, prah in PARY:
        if a not in p or b not in p:
            zle.append("chýba token %s alebo %s v %s" % (a, b, nazov))
            continue
        v = kontrast(p[a], p[b])
        ok = v >= prah
        print("    %-9s na %-6s %5.2f  (prah %.1f)  %s" % (a, b, v, prah, "OK" if ok else "PADÁ"))
        if not ok:
            zle.append("%s/%s v %s = %.2f < %.1f" % (a, b, nazov, v, prah))
    for k in PLOCHY:
        v = kontrast(p["na-bloku"], p[k])
        print("    %-9s pod --na-bloku %5.2f  (prah %.1f)  %s" % (k, v, AA_TEXT, "OK" if v >= AA_TEXT else "PADÁ"))
        if v < AA_TEXT:
            zle.append("na-bloku/%s v %s = %.2f" % (k, nazov, v))
    print("    linka  (informatívne, vlasový oddeľovač): %.2f na zemi · %.2f na doske"
          % (kontrast(p["linka"], p["zem"]), kontrast(p["linka"], p["doska"])))
    return zle


def main():
    blok = blok_temy(TPL.read_text(encoding="utf-8"))
    svetla = tokeny(blok, ":root")
    tmava = tokeny(blok, "body.dark")
    system = tokeny(blok, "body:not(.svetla)")

    zle = []
    print("=== Dizajnový systém „Bloky\" (koncepcia B) ===")
    zle += skontroluj("svetlá téma", svetla)
    zle += skontroluj("tmavá téma (voľba používateľa, body.dark)", tmava)

    # systémová tmavá (stav bez stampu) musí byť BITKA ROVNAKÁ ako výslovná voľba,
    # inak by appka pred spustením JS vyzerala inak než po ňom
    print("\n  tmavá téma bez stampu (@media prefers-color-scheme)")
    for k, v in tmava.items():
        if system.get(k) != v:
            print("    %-9s %s vs %s  PADÁ" % (k, v, system.get(k)))
            zle.append("systémová tmavá sa líši v %s (%s vs %s)" % (k, v, system.get(k)))
    if not any("systémová" in z for z in zle):
        print("    zhodná s body.dark vo všetkých %d tokenoch  OK" % len(tmava))

    print("\n  režim varenia (natrvalo tmavá plocha %s)" % VARENIE_POZADIE)
    var = dict(re.findall(r"--([a-z0-9-]+):(#[0-9a-fA-F]{6})", re.search(r"\.cook\{(.*?)\}", blok, re.S).group(1)))
    for k in ("blok-a", "blok-b", "blok-c"):
        v = kontrast(var[k], VARENIE_POZADIE)
        print("    %-9s na varení %5.2f  (prah %.1f)  %s" % (k, v, AA_TEXT, "OK" if v >= AA_TEXT else "PADÁ"))
        if v < AA_TEXT:
            zle.append("varenie/%s = %.2f" % (k, v))
        # tlačidlo „Ďalej": tmavý text na farbe bloku
        v2 = kontrast(VARENIE_NA_BLOKU, var[k])
        if v2 < AA_TEXT:
            zle.append("varenie tlačidlo/%s = %.2f" % (k, v2))
    v = kontrast(VARENIE_TEXT, VARENIE_POZADIE)
    print("    %-9s na varení %5.2f  (prah %.1f)  %s" % ("text", v, AA_TEXT, "OK" if v >= AA_TEXT else "PADÁ"))
    if v < AA_TEXT:
        zle.append("varenie/text = %.2f" % v)

    print()
    if zle:
        print("PADÁ — %d párov pod prahom:" % len(zle))
        for z in zle:
            print("  -", z)
        sys.exit(1)
    print("VŠETKO OK — každý textový pár spĺňa WCAG AA v svetlom aj tmavom režime.")


if __name__ == "__main__":
    main()
