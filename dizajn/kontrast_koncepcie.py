# -*- coding: utf-8 -*-
"""Kontrola kontrastu oboch navrhovaných paliet (WCAG 2.1 AA).

Obdoba `scripts/kontrast_organic.py`, ale číta tokeny priamo z prototypov
`dizajn/koncepcia-a.html` a `dizajn/koncepcia-b.html`, takže test padne,
keď niekto tokeny prepíše. Spustenie:

    python3 dizajn/kontrast_koncepcie.py

Návratový kód 1 = aspoň jeden pár je pod prahom.
"""
import pathlib, re, sys

DIZ = pathlib.Path(__file__).resolve().parent

AA_TEXT = 4.5   # bežný text
AA_VELKY = 3.0  # text ≥ 24 px / ≥ 19 px bold a netextové prvky (WCAG 1.4.11)


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
    """Vytiahne --nazov:#hex z jedného bloku v prototype."""
    m = re.search(re.escape(selektor) + r"\s*\{(.*?)\}", src, re.S)
    if not m:
        raise SystemExit("nenašiel som blok %r" % selektor)
    return dict(re.findall(r"--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})", m.group(1)))


# ── Koncepcia A „Modrotlač" ──────────────────────────────────────────────────
# text -> pozadie, prah
A_PARY = [
    ("tus", "platno", AA_TEXT), ("tus", "forma", AA_TEXT), ("tus", "zrno", AA_TEXT),
    ("tus2", "platno", AA_TEXT), ("tus2", "forma", AA_TEXT), ("tus2", "zrno", AA_TEXT),
    ("indigo", "platno", AA_TEXT), ("indigo", "forma", AA_TEXT), ("indigo", "zrno", AA_TEXT),
    ("raz", "platno", AA_TEXT), ("raz", "forma", AA_TEXT),
    ("rast", "platno", AA_TEXT), ("rast", "forma", AA_TEXT),
    ("zlt", "platno", AA_TEXT), ("zlt", "forma", AA_TEXT),
    # netextové (WCAG 1.4.11 = 3:1): --okraj ohraničuje OVLÁDACIE prvky, preto musí prejsť.
    # --linka je len vlasové zoskupenie riadkov (dekoratívny oddeľovač) — vypisuje sa, negatuje.
    ("okraj", "platno", AA_VELKY), ("okraj", "forma", AA_VELKY), ("okraj", "zrno", AA_VELKY),
]
# biely text na farebnej ploche
A_BIELE = [("indigo-tlac", AA_TEXT)]

# ── Koncepcia B „Bloky" ──────────────────────────────────────────────────────
B_PARY = [
    ("text", "zem", AA_TEXT), ("text", "doska", AA_TEXT),
    ("text2", "zem", AA_TEXT), ("text2", "doska", AA_TEXT),
    ("blok-a", "zem", AA_TEXT), ("blok-a", "doska", AA_TEXT),
    ("blok-b", "zem", AA_TEXT), ("blok-b", "doska", AA_TEXT),
    ("blok-c", "zem", AA_TEXT), ("blok-c", "doska", AA_TEXT),
    ("signal", "zem", AA_TEXT), ("signal", "doska", AA_TEXT),
    ("okraj", "zem", AA_VELKY), ("okraj", "doska", AA_VELKY),
]
# každá farba bloku je aj PLOCHA pod vyrazeným textom
B_PLOCHY_SVETLA = [("blok-a", "#ffffff"), ("blok-b", "#ffffff"), ("blok-c", "#ffffff")]
B_PLOCHY_TMAVA = [("blok-a", "#151310"), ("blok-b", "#151310"), ("blok-c", "#151310")]
# plocha varenia je tmavá VŽDY a má vlastnú sadu farieb
VARENIE_POZADIE = "#141210"
VARENIE_TEXT = "#F4EFE6"


def skontroluj(nazov, p, pary, biele=(), plochy=(), plocha_text="#ffffff"):
    zle = []
    print("\n  %s" % nazov)
    for a, b, prah in pary:
        if a not in p or b not in p:
            zle.append("chýba token %s alebo %s v %s" % (a, b, nazov)); continue
        v = kontrast(p[a], p[b])
        ok = v >= prah
        print("    %-11s na %-8s %5.2f  (prah %.1f)  %s" % (a, b, v, prah, "OK" if ok else "PADÁ"))
        if not ok:
            zle.append("%s/%s v %s = %.2f < %.1f" % (a, b, nazov, v, prah))
    for k, prah in biele:
        v = kontrast("#ffffff", p[k])
        print("    %-11s pod bielym   %5.2f  (prah %.1f)  %s" % (k, v, prah, "OK" if v >= prah else "PADÁ"))
        if v < prah:
            zle.append("biela/%s v %s = %.2f" % (k, nazov, v))
    for k, txt in plochy:
        v = kontrast(txt, p[k])
        print("    %-11s pod %s %5.2f  (prah %.1f)  %s" % (k, txt, v, AA_TEXT, "OK" if v >= AA_TEXT else "PADÁ"))
        if v < AA_TEXT:
            zle.append("%s/%s v %s = %.2f" % (txt, k, nazov, v))
    return zle


def main():
    zle = []

    src_a = (DIZ / "koncepcia-a.html").read_text(encoding="utf-8")
    a_svetla = tokeny(src_a, ":root")
    a_tmava = tokeny(src_a, ':root[data-tema="tmava"]')
    print("\n=== KONCEPCIA A — Modrotlač ===")
    zle += skontroluj("svetlá", a_svetla, A_PARY, A_BIELE)
    zle += skontroluj("tmavá", a_tmava, A_PARY, A_BIELE)

    src_b = (DIZ / "koncepcia-b.html").read_text(encoding="utf-8")
    b_svetla = tokeny(src_b, ":root")
    b_tmava = tokeny(src_b, ':root[data-tema="tmava"]')
    varenie = tokeny(src_b, ".varenie")
    print("\n=== KONCEPCIA B — Bloky ===")
    zle += skontroluj("svetlá", b_svetla, B_PARY, plochy=B_PLOCHY_SVETLA)
    zle += skontroluj("tmavá", b_tmava, B_PARY, plochy=B_PLOCHY_TMAVA)
    # režim varenia má vlastnú, natrvalo tmavú sadu
    print("\n  varenie (natrvalo tmavá plocha %s)" % VARENIE_POZADIE)
    for k in ("blok-a", "blok-b", "blok-c"):
        v = kontrast(varenie[k], VARENIE_POZADIE)
        print("    %-11s na varení  %5.2f  (prah %.1f)  %s" % (k, v, AA_TEXT, "OK" if v >= AA_TEXT else "PADÁ"))
        if v < AA_TEXT:
            zle.append("varenie/%s = %.2f" % (k, v))
        # tlačidlo „Ďalej": tmavý text na farbe bloku
        v2 = kontrast(VARENIE_POZADIE, varenie[k])
        if v2 < AA_TEXT:
            zle.append("varenie tlačidlo/%s = %.2f" % (k, v2))
    v = kontrast(VARENIE_TEXT, VARENIE_POZADIE)
    print("    %-11s na varení  %5.2f  (prah %.1f)  %s" % ("text", v, AA_TEXT, "OK" if v >= AA_TEXT else "PADÁ"))
    if v < AA_TEXT:
        zle.append("varenie/text = %.2f" % v)

    # informatívne: vlasové oddeľovače (nezapočítavajú sa — WCAG 1.4.11 sa na čisto
    # dekoratívne oddeľovače nevzťahuje; uvádzame ich, aby bolo číslo na stole)
    print("\n  informatívne (vlasové oddeľovače, nie sú predmetom 1.4.11)")
    for nz, p_, poz in (("A svetlá", a_svetla, ("platno", "forma")), ("A tmavá", a_tmava, ("platno", "forma")),
                        ("B svetlá", b_svetla, ("zem", "doska")), ("B tmavá", b_tmava, ("zem", "doska"))):
        print("    %-9s linka: %s" % (nz, "  ".join("%.2f na %s" % (kontrast(p_["linka"], p_[b]), b) for b in poz)))

    print()
    if zle:
        print("PADÁ — %d párov pod prahom:" % len(zle))
        for z in zle:
            print("  -", z)
        sys.exit(1)
    print("VŠETKO OK — každý textový pár spĺňa WCAG AA v svetlom aj tmavom režime.")


if __name__ == "__main__":
    main()
