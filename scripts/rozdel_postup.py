#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Jednokrokové postupy → viac krokov tam, kde je v jednom odseku viac úkonov.

Kritérium (merateľné, viď report): rozdeľuje sa postup, ktorý má JEDEN krok
a zároveň ≥ 2 vety alebo > 150 znakov. Zvyšné jednokrokové recepty (kokteily
typu „Premiešaj na ľade, preceď a podávaj") sú naozaj jeden úkon a zostávajú.

Spusti: python3 scripts/rozdel_postup.py [--dry]
"""
import json, os, sys

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

KROKY = {
 "bananovo-arasidove-smoothie": [
   "Suroviny daj do blendera a mixuj 30–40 sekúnd.",
   "Nalej do pohára a ozdob chia semienkami."],
 "bananovy-napoj": [
   "Banán ošúp a nakrájaj na kolieska.",
   "K banánu pridaj ostatné suroviny a vymiešaj v mixéri.",
   "Rozlej do 2–3 pohárov a podľa chuti ozdob."],
 "broskynove-smoothie": [
   "Umyté odkôstkované broskyne nakrájaj na menšie kúsky.",
   "Daj ich do mixéra, zalej acidkom, džúsom a tekutým medom.",
   "Vymiešaj dohladka a pi hneď — nápoj rýchlo stráca farbu."],
 "malinove-smoothie": [
   "Maliny umy, banány ošúp a nakrájaj.",
   "Ovocie daj do mixéra, prilej kokosové mlieko a pomixuj na hladkú krémovú zmes.",
   "Dosladiť netreba — zrelé banány sú sladké dosť."],
 "melonove-smoothie": [
   "Umy žltý melón, prekroj na polovicu a odstráň šupu.",
   "Pokrájaj ho na kocky a vlož do nádoby na mixovanie.",
   "Pridaj olúpaný a pokrájaný banán a za hrsť ovsených vločiek.",
   "Pomixuj dohladka. Melón pustí vodu, takže iné sladidlo netreba."],
 "sviezi-bazalkovy-napoj": [
   "Lístky bazalky natrhaj a jahody nakrájaj.",
   "Všetky suroviny vymiešaj v sekáčiku.",
   "Prelej do 2 pohárov a ozdob."],
 "sviezi-jahodovy-napoj": [
   "Čerstvé očistené jahody narež na polovice.",
   "V mixéri ich naraz vymiešaj s ostatnými surovinami.",
   "Rozlej do pohárov a ozdob."],
 "zeleny-smoothie-s-uhorkou": [
   "Datle namoč vopred, ideálne už večer.",
   "Do mixovacej nádoby daj vodu, banán a chia semiačka.",
   "Pridaj bylinky (petržlenovú a mrkvovú vňať pokojne aj s korienkami), uhorku a ovocie podľa sezóny.",
   "Všetko dôkladne rozmixuj dohladka."],
 "zeleny-smoothie-so-spenatom-a-ananasom": [
   "Datle namoč vopred, ideálne už večer.",
   "Do mixovacej nádoby daj vodu, banán a chia semiačka.",
   "Pridaj špenát, ananás a bylinky podľa chuti.",
   "Všetko dôkladne rozmixuj dohladka."],
}

def main():
    dry = "--dry" in sys.argv
    n = 0
    for rid, kroky in KROKY.items():
        f = os.path.join(DIR, rid + ".json")
        d = json.load(open(f, encoding="utf-8"))
        if d["postup"] == kroky: continue
        d["postup"] = kroky; n += 1
        if not dry:
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("rozdelených postupov:", n)

if __name__ == "__main__":
    main()
