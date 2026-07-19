# Pridávanie receptov z mobilu (cez Claude appku)

## Ako to funguje
Mobilná Claude appka nevie priamo zapisovať do tohto priečinka. Preto ide fotka
cez **projekt Jedlo** a ja ju doplním do kuchárky, keď si najbližšie pri počítači
(alebo automaticky cez naplánovanú úlohu, ak si ju zapneme).

## Postup na telefóne
1. Otvor appku **Claude** → projekt **Jedlo**.
2. Priamo do projektu (alebo do chatu v projekte) **pridaj fotku receptu**.
   - Najlepšie fotka celej strany receptu, čitateľná, jedna strana = jeden recept.
   - Môžeš pridať aj viac fotiek naraz.
3. (Voliteľné) Ak chceš recept hneď prečítať aj na mobile, pošli k fotke túto správu:

   > Prečítaj recept z fotky a vypíš ho po slovensky: názov, kategória (Raňajky/Obed/Večera/Snack/Dezert), kuchyňa, počet porcií, čas, zoznam surovín s množstvami (v g/ml/ks) a postup krok po kroku. Množstvá odhadni ak chýbajú.

## Keď si pri počítači
Otvor Cowork a napíš mi napr. **„pozri nové recepty z mobilu"**. Ja:
- prečítam nové fotky pridané do projektu Jedlo,
- vytvorím recept(y) v `recepty/`, doplním chýbajúce suroviny do databázy,
- znova vygenerujem kuchárku.

## Poznámky
- Fotku môžeš na mobile uložiť aj do OneDrive priečinka Jedlo — spracujem ju rovnako.
- Ak chceš, aby to bežalo bez tvojho vyzvania, viem nastaviť naplánovanú úlohu, ktorá
  nové fotky spracuje sama (beží, keď je appka spustená).
