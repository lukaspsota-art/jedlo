#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generátor kuchárky.
Prečíta recepty z recepty/*.json, databázu potravín z data/potraviny.json
a šablónu data/sablona.html, a vytvorí offline stránku kucharka.html.

Spusti: python3 generuj_kucharku.py
"""
import json, os, glob, datetime, shutil, sys

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


def main():
    recepty_p = nacitaj_json_zoznam(RECEPTY_DIR, "recepty")
    if not recepty_p:
        zomri(f"V {kratko(RECEPTY_DIR)} nie je ani jeden recept (*.json).")
    id_receptov = skontroluj_recepty(recepty_p)

    jedalnicky_p = nacitaj_json_zoznam(JEDALNICKY_DIR, "uložené jedálničky")
    skontroluj_jedalnicky(jedalnicky_p, id_receptov)

    potraviny = nacitaj_json(POTRAVINY, "databáza potravín")
    skontroluj_potraviny(potraviny)

    sablona = nacitaj_text(SABLONA, "HTML šablóna")
    appjs = nacitaj_text(APPJS, "JavaScript appky")
    if "</script>" in appjs:
        zomri(f"{kratko(APPJS)} obsahuje literál </script>.",
              ["Vložený inline do šablóny by predčasne ukončil <script> a appka by sa nespustila.",
               "Rozdeľ ho napr. na \"<\\/script>\"."])
    for cesta, text, placeholdery in ((SABLONA, sablona, ("__APP_JS__", "__DATUM__", "__POCET__")),
                                      (APPJS, appjs, ("__DATA__", "__POTRAVINY__", "__JEDALNICKY__"))):
        for placeholder in placeholdery:
            if placeholder not in text:
                zomri(f"{kratko(cesta)} nemá placeholder {placeholder}.",
                      ["Generátor doň vkladá dáta — bez neho by appka bola prázdna."])

    recepty = [r for _, r in recepty_p]
    jedalnicky = [j for _, j in jedalnicky_p]
    data_json = json.dumps(recepty, ensure_ascii=False)
    potraviny_json = json.dumps(potraviny, ensure_ascii=False)
    jedalnicky_json = json.dumps(jedalnicky, ensure_ascii=False)
    # Dáta idú inline do <script>. Literál </script> kdekoľvek v texte receptu by ho ukončil
    # a appka by sa vôbec nespustila.
    for popis, txt in (("recepty/", data_json), ("data/potraviny.json", potraviny_json),
                       ("jedalnicky/", jedalnicky_json)):
        if "</script>" in txt:
            zomri(f"V dátach ({popis}) je literál </script>.",
                  ["Vložený inline do stránky by predčasne ukončil <script> a appka by sa nespustila.",
                   f"Nájdi ho: grep -rl '</script>' {popis}"])
    sablona = sablona.replace("__APP_JS__", appjs)
    datum = datetime.date.today().strftime("%d.%m.%Y")
    html_out = (sablona
        .replace("__DATA__", data_json)
        .replace("__POTRAVINY__", potraviny_json)
        .replace("__JEDALNICKY__", jedalnicky_json)
        .replace("__DATUM__", datum)
        .replace("__POCET__", str(len(recepty))))
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

    # export/jedlo_data.json je strojovo čitateľný výpis receptov + potravín (pre skripty
    # a import do iných nástrojov). Generujeme ho, aby sa nemohol nenápadne rozísť so zdrojmi —
    # dovtedy to bola ručná kópia, ktorá pri prvej zmene receptu prestala platiť.
    os.makedirs(os.path.dirname(EXPORT), exist_ok=True)
    with open(EXPORT, "w", encoding="utf-8") as f:
        json.dump({"potraviny": potraviny, "recepty": recepty}, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Hotovo: {VYSTUP}")
    print(f"GitHub Pages: {DOCS_INDEX}" + (" (+ sw.js)" if os.path.exists(SW) else ""))
    print(f"Dátový výpis: {EXPORT}")
    print(f"Receptov: {len(recepty)} · potravín: {len(potraviny)} · jedálničkov: {len(jedalnicky)}")


if __name__ == "__main__":
    main()
