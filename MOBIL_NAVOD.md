# Pridávanie receptov z mobilu (cez Claude appku)

## Dve rôzne veci — nepomýliť si ich
| | „+ Nový recept" v kuchárke | fotka do projektu Jedlo |
|---|---|---|
| kde to žije | len v pamäti prehliadača na tom zariadení | v `recepty/` — v projekte, natrvalo |
| prečíta recept z fotky | **nie**, vyplníš ho ručne (fotku si len priložíš ako obrázok) | **áno**, prečítam ho ja |
| dostane sa na druhé zariadenie | nie | áno, po najbližšom builde |

Kuchárka teda vie **odfotiť jedlo** a pripnúť fotku k vlastnému receptu (nič sa neposiela von,
obrázok sa zmenší a uloží v zariadení). **Prečítať recept z fotky, textu alebo odkazu appka
nevie** — to robím ja. Preto tento postup.

## Postup na telefóne
1. Otvor appku **Claude** → projekt **Jedlo**.
2. Priamo do projektu (alebo do chatu v projekte) **pridaj fotku receptu**.
   - Najlepšie fotka celej strany receptu, čitateľná, jedna strana = jeden recept.
   - Môžeš pridať aj viac fotiek naraz.
3. (Voliteľné) Ak chceš recept hneď prečítať aj na mobile, pošli k fotke túto správu:

   > Prečítaj recept z fotky a vypíš ho po slovensky: názov, kategória (Raňajky / Hlavné jedlo /
   > Šalát / Polievka / Nátierka / Príloha / Pečivo / Snack / Dezert), kuchyňa, počet porcií,
   > čas, zoznam surovín s množstvami (v g/ml/ks) a postup krok po kroku.
   > Množstvá odhadni, ak chýbajú.

## Keď si pri počítači
Otvor Cowork a napíš mi napr. **„pozri nové recepty z mobilu"**. Ja:
- prečítam nové fotky pridané do projektu Jedlo,
- vytvorím recept(y) v `recepty/`, doplním chýbajúce suroviny do `data/potraviny.json`
  (bez toho by položka v nákupe nemala cenu),
- znova vygenerujem kuchárku a poviem, čo pribudlo.

## Poznámky
- Fotku môžeš na mobile uložiť aj do OneDrive priečinka Jedlo — spracujem ju rovnako.
- **Automaticky to zatiaľ nebeží.** Viem nastaviť naplánovanú úlohu, ktorá nové fotky spracuje
  sama, ale musíme ju vedome zapnúť.
- Ak je recept z webu, pošli radšej **odkaz** než fotku — z odkazu viem prevziať aj výživové
  hodnoty a uložiť zdroj, ktorý appka pri recepte zobrazí ako aktívny odkaz (niektoré zdroje
  to priamo vyžadujú).
