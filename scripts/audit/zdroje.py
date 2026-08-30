#!/usr/bin/env python3
"""AUDIT: zdroje receptov — pokrytie, zakázané domény, Varecha Content Policy (aktívny odkaz)."""
import json, glob, os, collections, urllib.parse
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ZAKAZANE = ["allrecipes", "seriouseats", "simplyrecipes", "people.com", "food52", "epicurious", "nytimes", "bonappetit"]
recepty = [json.load(open(c, encoding="utf-8")) for c in sorted(glob.glob(os.path.join(R,"recepty","*.json")))]
print("receptov:", len(recepty))

bez_zdroja = [r["id"] for r in recepty if not (r.get("zdroj") or "").strip()]
print("bez `zdroj`:", len(bez_zdroja), bez_zdroja[:10])
bez_url = [r["id"] for r in recepty if not (r.get("zdroj_url") or "").strip()]
print("bez `zdroj_url`:", len(bez_url))

zdroje = collections.Counter()
for r in recepty:
    z = (r.get("zdroj") or "").split("–")[0].split(" - ")[0].strip()
    zdroje[z] += 1
print("\nrozdelenie podľa zdroja:")
for z, n in zdroje.most_common(15):
    print(f"  {n:5d}  {z}")

print("\ndomény v zdroj_url:")
dom = collections.Counter()
for r in recepty:
    u = (r.get("zdroj_url") or "").strip()
    if u:
        dom[urllib.parse.urlparse(u).netloc] += 1
for d, n in dom.most_common(20):
    print(f"  {n:5d}  {d}")

print("\nZAKÁZANÉ zdroje (Allrecipes / Serious Eats / Simply Recipes …):")
zas = [(r["id"], r.get("zdroj"), r.get("zdroj_url")) for r in recepty
       if any(z in ((r.get("zdroj") or "") + " " + (r.get("zdroj_url") or "")).lower() for z in ZAKAZANE)]
print("  nájdených:", len(zas), zas[:5])

print("\nVarecha — Content Policy vyžaduje atribúciu + AKTÍVNY odkaz:")
var = [r for r in recepty if "varecha" in ((r.get("zdroj") or "") + (r.get("zdroj_url") or "")).lower()]
print("  varecha receptov:", len(var))
bez = [r["id"] for r in var if not (r.get("zdroj_url") or "").strip()]
print("  bez zdroj_url (porušenie):", len(bez), bez[:10])
zle = [r["id"] for r in var if (r.get("zdroj_url") or "") and not (r.get("zdroj_url") or "").startswith("http")]
print("  zdroj_url nie je http(s):", len(zle), zle[:10])

print("\nprázdne / podozrivé URL naprieč všetkými:")
zle2 = [(r["id"], r.get("zdroj_url")) for r in recepty
        if (r.get("zdroj_url") or "") and not str(r.get("zdroj_url")).startswith("http")]
print("  ", len(zle2), zle2[:10])
dupl = collections.Counter(r["id"] for r in recepty)
print("duplicitné id:", [k for k, v in dupl.items() if v > 1])
