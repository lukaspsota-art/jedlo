# -*- coding: utf-8 -*-
"""Vloží dizajnový systém „Bloky" (koncepcia B) do data/sablona.html.

Zdroj tém: dizajn/tema-bloky.css (bez fontov)
Zdroj fontov: dizajn/fonty/*.woff2 → base64 data: URI (appka zostáva offline single-file)

Blok v šablóne je ohraničený značkami „Bloky theme — start/end" a pôvodné CSS nad ním
iba PREBÍJA — nič sa v ňom nemaže. Odstránenie témy = zmazať všetko medzi značkami.

    python3 scripts/vloz_temu.py
"""
import base64, pathlib, re, sys

KOREN = pathlib.Path(__file__).resolve().parent.parent
TPL = KOREN / "data" / "sablona.html"
CSS = KOREN / "dizajn" / "tema-bloky.css"
FONTY = KOREN / "dizajn" / "fonty"

LATIN_EXT = ("U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,"
             "U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,"
             "U+2113,U+2C60-2C7F,U+A720-A7FF")
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,"
         "U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")

# (rodina, rozsah váh, súbor, unicode-range) — oba fonty sú PREMENLIVÉ (os wght),
# takže jeden súbor na podmnožinu obslúži všetky použité rezy.
FACES = [
    ("Archivo",        "400 800", "Archivo-latin-ext-600.woff2",          LATIN_EXT),
    ("Archivo",        "400 800", "Archivo-latin-600.woff2",              LATIN),
    ("Instrument Sans", "400 700", "Instrument_Sans-latin-ext-400.woff2", LATIN_EXT),
    ("Instrument Sans", "400 700", "Instrument_Sans-latin-400.woff2",     LATIN),
]

ZAC = "  /* Bloky theme — start"
KON = "  /* Bloky theme — end ------------------------------------------------------ */"
# spätná kompatibilita: prvé spustenie nahrádza ešte blok Organic
ZAC_STARY = "  /* Organic theme — start"
KON_STARY = "  /* Organic theme — end -------------------------------------------------- */"


def font_faces():
    out = []
    for rodina, vahy, subor, rng in FACES:
        p = FONTY / subor
        if not p.exists():
            sys.exit("chýba font %s" % p)
        b64 = base64.b64encode(p.read_bytes()).decode("ascii")
        out.append("@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;"
                   "src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}"
                   % (rodina, vahy, b64, rng))
    return "\n  ".join(out)


def main():
    src = TPL.read_text(encoding="utf-8")
    zac, kon = (ZAC, KON) if ZAC in src else (ZAC_STARY, KON_STARY)
    i = src.index(zac)
    j = src.index(kon) + len(kon)

    hlava = ("  /* Bloky theme — start ---------------------------------------------------\n"
             "     Dizajnový systém „Bloky\" (koncepcia B). Týždeň má tri varné bloky a každý\n"
             "     má vlastnú farbu, ktorá ide cez plán, nákup, domov aj varenie. Farba je\n"
             "     vždy doplnená písmenom A/B/C — nikdy nie je jediným nosičom informácie.\n"
             "     Blok len PREBÍJA pôvodné CSS vyššie — nič sa v ňom nemaže.\n"
             "     Odstránenie témy = zmazať všetko medzi „start\" a „end\".\n"
             "     Fonty sú base64 data: URI — appka musí zostať offline, bez CDN a @import.\n"
             "     Kontrast overuje scripts/kontrast_bloky.py (WCAG AA, obe témy). */\n")
    telo = CSS.read_text(encoding="utf-8")
    novy = hlava + "  " + font_faces() + "\n" + telo.rstrip("\n") + "\n" + KON

    if "</script>" in novy:
        sys.exit("téma obsahuje literál </script>")
    src = src[:i] + novy + src[j:]

    # farba prehliadača / PWA splash musí sedieť s témou
    src = re.sub(r'<meta name="theme-color" content="#[0-9a-fA-F]{6}" media="\(prefers-color-scheme: light\)">',
                 '<meta name="theme-color" content="#E7E4DD" media="(prefers-color-scheme: light)">', src)
    src = re.sub(r'<meta name="theme-color" content="#[0-9a-fA-F]{6}" media="\(prefers-color-scheme: dark\)">',
                 '<meta name="theme-color" content="#151310" media="(prefers-color-scheme: dark)">', src)

    TPL.write_text(src, encoding="utf-8")
    print("téma Bloky vložená: %d znakov (fonty %d KB)"
          % (len(novy), sum((FONTY / f[2]).stat().st_size for f in FACES) // 1024))


if __name__ == "__main__":
    main()
