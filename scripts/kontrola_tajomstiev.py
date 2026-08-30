#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kontrola tajomstiev v repozitári.

GitHub Pages servíruje priečinok docs/ VEREJNE. Ak sa do neho (alebo do kucharka.html,
alebo do commitnutých súborov) dostane Supabase kľúč, JWT alebo tajné „Sync ID",
ktokoľvek dokáže čítať a prepisovať dáta domácnosti.

Spusti: python3 scripts/kontrola_tajomstiev.py
Vráti 1, ak niečo našiel — dá sa zavesiť do CI alebo pre-commit hooku.
"""
import os, re, sys, subprocess

ZAKLAD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Súbory, ktoré sa smú (a majú) prehľadať. Binárky a fotky preskakujeme.
PRESKOC_ADRESARE = {".git", "node_modules", "__pycache__", "superpowers", ".superpowers"}
PRESKOC_PRIPONY = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".woff", ".woff2", ".ttf", ".zip"}

# Vzory hľadané v KAŽDOM súbore. Tieto tvary sa v projekte nesmú vyskytnúť nikdy.
VZORY = [
    ("Supabase projekt URL", re.compile(r"https://[a-z0-9]{15,}\.supabase\.(co|in)\b")),
    ("JWT (Supabase anon/service key)", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
    ("Supabase publishable/secret key", re.compile(r"\bsb_(publishable|secret)_[A-Za-z0-9]{10,}")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}")),
    ("OpenAI/Anthropic kľúč", re.compile(r"\bsk-(ant|proj)-[A-Za-z0-9_-]{20,}")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
]

# Vzory hľadané LEN v sync-config*.js. Inde by `id:` a `key:` chytali bežný kód
# (napr. KOLEKCIE v app.js majú tiež pole `id`).
VZORY_KONFIG = [
    ("vyplnené Sync ID", re.compile(r"""\bid\s*:\s*["']([A-Za-z0-9_-]{4,})["']""")),
    ("vyplnený anon key", re.compile(r"""\bkey\s*:\s*["']([^"']{8,})["']""")),
    ("service_role kľúč (patrí len na server!)", re.compile(r"(service_role)")),
]

# Miesta, kde smú byť ukážkové (neplatné) hodnoty — tento skript sám a vzorová konfigurácia.
VYNIMKY_SUBOROV = {"scripts/kontrola_tajomstiev.py"}
# Ukážkové/zástupné hodnoty — nie sú to skutočné kľúče.
UKAZKY = re.compile(r"TVOJ|NIECO|PROJEKT|EXAMPLE|YOUR-|xxxx|^<|>$", re.I)


def subory():
    for koren, adresare, mena in os.walk(ZAKLAD):
        adresare[:] = [d for d in adresare if d not in PRESKOC_ADRESARE]
        for m in mena:
            cesta = os.path.join(koren, m)
            if os.path.splitext(m)[1].lower() in PRESKOC_PRIPONY:
                continue
            yield cesta


def rel(c):
    return os.path.relpath(c, ZAKLAD).replace(os.sep, "/")


def gitignorovany(cesta):
    try:
        return subprocess.run(["git", "check-ignore", "-q", cesta], cwd=ZAKLAD).returncode == 0
    except OSError:
        return False


def main():
    nalezy, kontrolovanych = [], 0
    for cesta in subory():
        r = rel(cesta)
        if r in VYNIMKY_SUBOROV:
            continue
        try:
            with open(cesta, encoding="utf-8", errors="ignore") as f:
                obsah = f.read()
        except OSError:
            continue
        kontrolovanych += 1
        ignorovany = gitignorovany(cesta)
        vzory = list(VZORY)
        if os.path.basename(cesta).startswith("sync-config"):
            vzory += VZORY_KONFIG
        for nazov, vzor in vzory:
            for m in vzor.finditer(obsah):
                utrzok = m.group(0)
                hodnota = m.group(m.lastindex or 0)
                if UKAZKY.search(hodnota) or hodnota.strip() == "":
                    continue
                riadok = obsah.count("\n", 0, m.start()) + 1
                nalezy.append((r, riadok, nazov, utrzok[:60], ignorovany))

    # Tajné súbory MUSIA byť v .gitignore, inak by ich prvý `git add .` poslal na GitHub.
    for tajny in ("sync-config.js", "docs/sync-config.js"):
        if not gitignorovany(os.path.join(ZAKLAD, tajny)):
            nalezy.append((tajny, 0, "NIE JE v .gitignore (a má byť)", "", False))

    verejne = [n for n in nalezy if not n[4]]
    print(f"Prehľadaných súborov: {kontrolovanych}")
    if not nalezy:
        print("✅ Žiadne tajomstvá v repozitári, v kucharka.html ani v docs/.")
        return 0
    for r, riadok, nazov, utrzok, ign in nalezy:
        znacka = "  (v .gitignore — necommituje sa)" if ign else "  ⛔ COMMITUJE SA / JE VEREJNÉ"
        print(f"{r}:{riadok}  {nazov}: {utrzok}{znacka}")
    if verejne:
        print(f"\n⛔ {len(verejne)} nálezov v súboroch, ktoré NIE SÚ v .gitignore.")
        return 1
    print("\n⚠ Nálezy sú len v ignorovaných súboroch — do repozitára sa nedostanú.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
