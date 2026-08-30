#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Doplnenie poľa `tipy` tam, kde bolo prázdne.

Pravidlá sú viazané na SKUTOČNÝ obsah receptu (surovina alebo technika v postupe),
nie na kategóriu — tip má povedať niečo o tomto jedle, nie o varení vo všeobecnosti.
Recept, na ktorý nesadne žiadne pravidlo, zostáva bez tipu (radšej prázdne než vata).

Spusti: python3 scripts/doplnit_tipy.py [--dry] [--vzorka N]
"""
import json, glob, re, sys, os

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recepty")

# (regex nad surovinami, regex nad postupom (alebo None), tip)
# Poradie = priorita, berie sa prvé pravidlo, ktoré sadne.
PRAVIDLA = [
 (r"such[áa] fazuľa|suchá fazuľa|fazuľa such|cícer such|šošovica such|fazuľa biela|fazuľa strakat", None,
  "Suché strukoviny namoč cez noc a prvú vodu po pár minútach varu zlej — jedlo bude ľahšie stráviteľné."),
 (None, r"namoč.{0,30}(cez noc|vopred|8 hod|do rána)",
  "Namáčanie sa nedá uponáhľať — s kratším časom zostane vnútro tvrdé, aj keď povrch vyzerá hotovo."),
 (r"želatín", None, "Želatínu nikdy nevar — nad 60 °C stráca schopnosť tuhnúť."),
 (r"baklažán", None,
  "Baklažán pred pečením posoľ a nechaj 20 minút odstáť. Pustí horkú vodu a nasaje menej oleja."),
 (r"tofu", None, "Tofu pred opekaním vylisuj medzi dvomi utierkami — čím menej vody, tým lepšia kôrka."),
 (r"kuskus", None,
  "Kuskus zalej rovnakým objemom vriacej tekutiny, prikry a 5 minút nechaj napučať. Potom ho rozčeš vidličkou, nemiešaj lyžicou."),
 (r"avokád", None, "Avokádo pokvapkaj citrónovou šťavou — bez kyseliny zhnedne do pár minút."),
 (None, r"šejk|pretrep.{0,20}ľad|shakerd|do šejkra",
  "Šejkruj s ľadom 10–15 sekúnd. Nápoj sa nielen vychladí, ale aj mierne zriedi — a to k nemu patrí."),
 (None, r"(zmraz|mrazen).{0,25}(ovoci|banán|jahod|malin)|mrazené (banán|ovocie|jahod|malin)",
  "Ovocie si zamraz vopred — nápoj bude hustý aj bez ľadu, ktorý chuť len riedi."),
 (r"droždie|kvások|sušené droždie", None,
  "Cesto nechaj kysnúť na teplom mieste bez prievanu. Hotové je, keď zdvojnásobí objem — nie po presnom počte minút."),
 (None, r"olej na vypráž|vypráž|frit[ée]z|smaž.{0,25}v hlbok",
  "Olej rozohrej na 170–180 °C. Pri nižšej teplote sa obal napije tuku, pri vyššej sa spáli skôr, než sa vnútro prehreje."),
 (r"bielk|bielok|sneh z bielk", r"sneh|vyšľahaj",
  "Bielky šľahaj v úplne čistej a suchej mise. Stopa žĺtka alebo tuku sneh nezdvihne."),
 (r"smotana na šľahanie|šľahačka", None,
  "Smotanu aj metly daj pred šľahaním do chladničky. Teplá smotana sa nevyšľahá, len sa zrazí."),
 (r"čokolád", r"rozpust|tav|nad parou|roztop",
  "Čokoládu top nad parou, nie priamo na platni — nad 50 °C sa zráža a zrnie."),
 (r"šampiňón|hríb|hliva|huby|pečiark", r"resto|opraž|osmaž|panvic|opeč|smaž",
  "Huby daj na horúcu panvicu v jednej vrstve a nesoľ ich hneď. Inak pustia vodu a namiesto opekania sa dusia."),
 (r"rizoto|arborio|carnaroli", None,
  "Vývar prilievaj po naberačkách a horúci — studený zastaví varenie a ryža sa uvarí nerovnomerne."),
 (r"špenát", None, "Čerstvý špenát sa scvrkne takmer na desatinu objemu — nezľakni sa množstva na začiatku."),
 (r"paradajkový pretlak|passata|drven[ée] paradajk|paradajky v konzerv|paradajkov[áé] omáčk", None,
  "Paradajkovú omáčku var aspoň 20 minút. Kyslosť sa vytratí a chuť sa zaokrúhli — štipka cukru pomôže."),
 (r"cestovin|špagety|penne|tagliatell|fusilli|makarón|rigaton|linguine|farfalle", r"sceď|scedí|uvar",
  "Pohár vody z varenia cestovín si odlož. Škrob v nej spojí omáčku s cestovinami lepšie než smotana."),
 (r"ryža|rizot", None,
  "Ryžu pred varením prepláchni, kým voda neostane číra, a počas varenia ju nemiešaj — inak sa rozvarí na kašu."),
 (r"mleté mäso", None,
  "Mleté mäso rozprestri po panvici a chvíľu ho nemiešaj. Až keď zospodu zhnedne, začne sa opekať namiesto dusenia."),
 (None, r"marinuj|marinád|nechaj.{0,20}(marin|naložen)",
  "Marinuj v chladničke, nie na linke. Mäso pred opekaním nechaj chvíľu zohriať na izbovú teplotu — inak sa zvonku spáli a vnútri zostane surové."),
 (None, r"gril",
  "Grilovaciu mriežku poriadne rozpáľ a namasti, až potom prilož mäso. Na studenej mriežke sa prilepí a roztrhá."),
 (r"guláš|hovädzie|krkovič|bôčik|pliecko|stehno hovädz", r"dus|pomaly|hodin",
  "Dusené mäso sa nedá uponáhľať — zmäkne až po hodinách mierneho dusenia. Prudký var ho naopak vysuší."),
 (r"kuracie prsia|prsia kuracie|morčacie prsia", None,
  "Kuracie prsia stiahni z ohňa hneď, ako vnútri stratia ružovú farbu. Prepečené sa už zachrániť nedajú."),
 (r"losos|treska|pstruh|tuniak čerstv|ryb[ae]|filet z", None,
  "Rybu nesoľ dlho vopred a peč ju krátko. Hotová je, keď sa mäso dá vidličkou ľahko oddeliť."),
 (r"zemiak", r"zemiakov[áú] kaš|\bkaša\b|\bkašu\b|pyré",
  "Na kašu ber múčnaté zemiaky a mixuj ich čo najmenej. Z prílišného mixovania sa stane lepidlo."),
 (r"zemiak", r"rúr|peč|plech|hranolk",
  "Zemiaky pred pečením osuš a rozlož na plech v jednej vrstve. Natlačené na sebe sa dusia a nezhnednú."),
 (r"vajc|vajíčk", r"omelet|praženic|miešan",
  "Vajcia miešaj na miernom ohni a stiahni ich z platne, kým sú ešte trochu tekuté — dohotovia sa vlastným teplom."),
 (None, r"palacink|lievanc|vafl",
  "Cesto nechaj pred pečením 20 minút odpočívať. Múka nasiakne a palacinky budú vláčnejšie, nie gumové."),
 (r"cesnak", r"resto|opraž|osmaž|na panvic",
  "Cesnak pridaj až na koniec restovania. Pripáli sa oveľa rýchlejšie než cibuľa a spálený zhorkne."),
]

# tipy podľa kategórie — až keď nesadne nič konkrétnejšie
KATEGORIA = {
 "Šalát": "Dresing primiešaj tesne pred podávaním. Inak šalát pustí vodu a zvädne.",
 "Nátierka": "Nátierku nechaj pred podávaním aspoň hodinu v chladničke — chute sa prepoja a natiera sa lepšie.",
 "Polievka": "Polievku dochuť až nakoniec. Počas varenia sa tekutina odparí a chute zosilnejú.",
 "Kokteil": "Pohár vychlaď vopred. Vo vlažnom pohári kokteil rýchlo zovšednie a chutí sladšie, než má.",
 "Pečivo": "Pečivo nechaj úplne vychladnúť, až potom ho krájaj — v teplom sa strieda ešte dopeká.",
}

SLABE = [
(r"citrón|limetk", None,
  "Šťavu vytlač až tesne pred použitím a nezabudni na kôru — väčšina arómy je v nej, nie v šťave."),
 (None, r"sterilizuj|zaváran|do pohárov|kompót",
  "Poháre aj viečka pred plnením sterilizuj a plň ich horúce. Studený obsah v studenom pohári dlho nevydrží."),
 (None, r"strúhan[ýé] syr|posyp.{0,20}syr|zapeč.{0,25}syr",
  "Syr si nastrúhaj z bloku. Balený strúhaný má protihrudkovací škrob a roztápa sa horšie."),
 (None, r"rúr[ae]|predhrej|piecť|upeč",
  "Rúru predhrej naprázdno aspoň 15 minút a upečenosť skontroluj špajľou v strede — musí vyjsť suchá."),
 (r"celé korenie|rasca|koriander|kmín|kardamó|klinček|fenikel semien", None,
  "Celé koreniny krátko opraž nasucho, kým nezavoňajú. Uvoľnia oveľa viac chuti než rovno vhodené do jedla."),
 (r"petržlenová vňať|bazalka|kôpor|pažítka|mäta|koriander čerstv", None,
  "Čerstvé bylinky pridaj až na tanier. Teplo z nich vôňu vyženie za pár minút."),
 (None, r"strúhan[ýé] syr|posyp.{0,20}syr|zapeč.{0,25}syr",
  "Syr si nastrúhaj z bloku. Balený strúhaný má protihrudkovací škrob a roztápa sa horšie."),
 (None, r"rúr[ae]|predhrej|piecť|upeč",
  "Rúru predhrej naprázdno aspoň 15 minút a upečenosť skontroluj špajľou v strede — musí vyjsť suchá."),
 (r"med", r"zohrej|var|horúc",
  "Med primiešaj až do vlažnej zmesi. Nad 40 °C stráca vôňu aj časť enzýmov."),
]

def text(d):
    return " ".join(d["postup"]) + " " + d.get("popis", "")

def ingr(d):
    return " ".join(i["nazov"] for i in d["ingrediencie"])

def _skus(pravidla, i, t):
    for r_ing, r_post, tip in pravidla:
        if r_ing and not re.search(r_ing, i): continue
        if r_post and not re.search(r_post, t): continue
        if not r_ing and not r_post: continue
        return tip
    return ""

def tip_pre(d):
    """Poradie: konkrétna surovina/technika → kategória → všeobecnejšia rada."""
    i, t = ingr(d).lower(), text(d).lower()
    return _skus(PRAVIDLA, i, t) or KATEGORIA.get(d["kategoria"], "") or _skus(SLABE, i, t)

def main():
    dry = "--dry" in sys.argv
    vz = int(sys.argv[sys.argv.index("--vzorka") + 1]) if "--vzorka" in sys.argv else 0
    n = prazdne = 0; uk = []
    for f in sorted(glob.glob(os.path.join(DIR, "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        if d["tipy"].strip(): continue
        tip = tip_pre(d)
        if not tip: prazdne += 1; continue
        d["tipy"] = tip; n += 1
        if len(uk) < vz: uk.append((d["id"], d["nazov"], tip))
        if not dry:
            with open(f, "w", encoding="utf-8") as fh:
                json.dump(d, fh, ensure_ascii=False, indent=1); fh.write("\n")
    print("doplnených tipov:", n, "| zostáva bez tipu:", prazdne)
    for a, b, c in uk: print("  •", b, "→", c[:90])

if __name__ == "__main__":
    main()
