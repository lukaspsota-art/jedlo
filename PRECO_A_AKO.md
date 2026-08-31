# Prečo a ako

Krátky úvod do kuchárky pre toho, kto ju bude používať. Zoznam všetkých funkcií je
v `NAVOD.md`, technické veci v `CLAUDE.md`.

---

## Čo to rieši

Týždenné jedlo je jedna úloha rozdelená do troch večerov a jedného nákupu, a väčšina roboty
sa minie na to, že tie štyri veci o sebe nevedia. Vymyslíš jedlá, ale nevieš, koľko z nich
kúpiť. Nakúpiš, ale v stredu zistíš, že chýba jedna surovina. Navaríš, ale v piatok nikto
nevie, čo zostalo. A keď máte doma dvoch ľudí s rôznym kalorickým príjmom, tak sa k tomu
pridá ešte delenie jednej várky na dve rôzne porcie.

Kuchárka je jeden súbor, ktorý drží celý ten reťazec pokope: **recepty → plán týždňa →
nákupný zoznam → varenie → čo zostalo v chladničke.** Zmena na jednom konci sa premietne
na druhý. Keď v pláne vymeníš stredajšiu večeru, nákupný zoznam sa prepočíta sám.

Funguje **bez internetu**. Nie je to webová stránka, ktorá potrebuje signál v suteréne
Kauflandu — je to jeden súbor, ktorý sa raz stiahne a potom sa otvára okamžite.

---

## Tri situácie, tri režimy

Appka vie, že plánovanie pri stole, nákup v obchode a varenie pri sporáku nie sú to isté.
Preto má v menu prepínač **Plánovanie · Obchod · Kuchyňa**. Nemení, čo appka vie — mení,
ako veľké to je a koľko toho naraz ukáže.

### 1. Plánovanie (v pokoji, pri stole)

Otvoríš **Plán** a stlačíš **„✨ Zostaviť jedálniček"**. Appka poskladá celý týždeň —
raňajky, obed, snack a večeru na každý deň — tak, aby:

- každý deň sedel na kalorický cieľ domácnosti,
- obed bol väčší než večera, večera než raňajky a snack bol najmenší,
- sa v jednom týždni neopakovalo to isté jedlo,
- raňajky vo všedný deň boli sendvič alebo wrap, a v každom bloku na inej báze
  (nie tri toasty za sebou),
- sa to dalo naozaj navariť na tri várky.

Nič ti to nevnúti. Ťuknutím na jedlo sa otvorí recept, cez **„✎ zmeniť"** ho vymeníš,
cez **„⋯ viac"** pridáš prílohu alebo jedlo z bunky odstrániš. Pod tabuľkou je riadok
**„Σ kcal/deň"** s pásikom — hneď vidíš, či deň sedí, a keď je nad cieľom, riadok to povie.

Keď máte doma dvoch ľudí s rôznym príjmom, zadáš to v Nastaveniach ako dvoch stravníkov
(napr. *Ja 1450 · Žena 1200*). Appka potom navarí **jednu várku** a rozdelí ju na porcie
tak, aby každý dostal svoj príjem — nemusíš variť dvakrát ani nič vážiť navyše.

### 2. Obchod (jedna ruka, košík v druhej)

Prepni na **Obchod**. Písmo aj tlačidlá sa zväčšia a z Nákupu zmizne všetko, čo pri regáli
nepotrebuješ — nadpisy, panely, nastavenia. Zostane zoznam.

Zoznam vznikne sám z plánu: suroviny zo všetkých receptov týždňa sa spočítajú, prepočítajú na
počet porcií a zoradia **podľa oddelení v obchode**, aby si nechodil tam a späť. Poradie
oddelení si prestavíš v paneli **„🏪 Trasa obchodom"** — vyberieš *Kaufland*, *Lidl* alebo
*Vlastné* a šípkami ↑↓ si ich usporiadaš tak, ako naozaj chodíš.

Odškrtávaš ťuknutím **kamkoľvek na riadok**, nie do malého štvorčeka. Pri každej položke je
cena, koľko jej treba a koľko balení to je (*„Mlieko 640 ml · bal.: 1× 1 l"*), a písmeno
bloku, na ktorý sa kupuje. Prúžok hore ukazuje, koľko ešte zostáva.

Čo už máš doma, napíšeš do **„🏠 Mám doma"** (alebo si to appka vezme zo Špajze) a zo zoznamu
aj z ceny to zmizne.

### 3. Kuchyňa (mastné ruky, telefón opretý)

Prepni na **Kuchyňu** — všetko je o polovicu väčšie. A keď začneš variť, otvor recept
a stlač **„Variť"**. Obrazovka stmavne, zostane na nej **jeden krok naraz** veľkým písmom,
telefón nezhasne, a keď je v kroku čas („varte 12 minút"), pridáš si **časovač** — aj viac
naraz. Ak máš plné ruky, dáš si kroky **prečítať nahlas**.

Po dovarení sa ťa appka spýta, či má suroviny odpísať zo špajze, a recept si zapíše do
kalendára („naposledy varené").

---

## Ako fungujú varné bloky

Toto je jadro celej appky, tak si to zaslúži odsek navyše.

**Blok = jedna várka, ktorá vydrží na viac dní.** Týždeň má tri:

> **A** Varíš v nedeľu večer na pondelok a utorok.
> **B** Varíš v utorok večer na stredu, štvrtok a piatok.
> **C** Varíš v piatok večer na sobotu a nedeľu.

Praktický dôsledok: v pondelok a utorok je **to isté jedlo** — nie preto, že by appka nemala
nápady, ale preto, že si to navaril raz. Nákup to vie a rovno vynásobí množstvá počtom dní
v bloku. V hlavičke bloku je **„🍳 plán varenia"**, ktorý ti pred varením vypíše, čo a na
koľko porcií presne navariť pre celý blok naraz.

**Rozvrh sa dá prestaviť**, keď sa týždeň pohne. V Pláne je **„✂️ Upraviť rozvrh"** a v ňom
hotové možnosti jedným ťuknutím — *Ako varím ja*, *Dvakrát do týždňa*, *Týždeň a víkend*,
*Raz na celý týždeň*, *Štyrikrát*, *Každý deň zvlášť*. Ak ti nesedí ani jedna, je pod nimi
pás dní `Po · Ut ✂ St · Št · Pi ✂ So · Ne` a ťuknutím medzi dva dni určíš, kde nový blok
začína. Pod pásom sa hneď píše celou vetou, čo z toho vyšlo. Vlastný rozvrh si uložíš
a nabudúce vyberieš zo zoznamu.

Zmena rozvrhu **nič nemaže** — každý deň si necháva jedlá, ktoré mal. Ak po zmene v niektorom
bloku vyjdú rôzne jedlá (varil by si viackrát), appka to povie a ponúkne
**„Zjednotiť bloky podľa prvého dňa"** alebo **„Nechať tak"**. A je tam aj
**„↩︎ Vrátiť pôvodný"**.

**Snack je z tohto vyňatý.** Snack sa nevarí — je to hotová vec z regálu (skyr, cottage,
šunka, jablko, porciové orechy), takže tri rôzne jogurty sa kupujú rovnako ľahko ako tri
rovnaké. Preto sa losuje na každý deň zvlášť a v mesiaci uvidíš vyše tridsať rôznych.
Niekedy je to dvojica — *Jablko + Biely jogurt*, *Baby mrkva + Skyr* — lebo samotné jablko
je na desiatu málo a suchý rožok nie je desiata.

---

## Čo znamenajú farby

Jedna myšlienka, ktorá platí všade: **farba = varný blok.**

| | blok | farba |
|---|---|---|
| **A** | prvý blok týždňa | slivková |
| **B** | druhý blok | modrá ako more |
| **C** | tretí blok | olivová |

Tá istá farba je v pláne v hlavičke bloku, pri každej položke nákupu, na Domove v páse týždňa,
v grafe výživy aj pri varení. V obchode teda hneď vidíš, či danú vec kupuješ na nedeľné
varenie alebo až na piatkové.

**Farba nikdy nie je jediná informácia.** Vždy je pri nej aj **písmeno A / B / C**, takže to
funguje aj načierno na papieri, aj keď farby nerozoznávaš. Položka, ktorá sa použije vo
viacerých blokoch (cesnak, olej), má písmen viac: **A B C**.

**Červená znamená stav, nikdy nie blok.** Nad kalorickým cieľom, po expirácii, „odobrať".
Keď niekde svieti červená, appka niečo hlási — nie je to len iná várka.

Appka má aj **tmavý režim**. Riadi sa nastavením telefónu, ale v Nastaveniach si to môžeš
prepnúť ručne.

---

## Čo robiť, keď niečo nesedí

**„Nad zoznamom svieti ⚠️ Nákup pokrýva o X % viac kalórií."**
Appka porovnáva, čo sľubuje plán, s tým, čo naozaj kupuješ, a keď sa to rozíde, povie to
namiesto toho, aby to schovala. Malý rozdiel (do ~15 %) je normálny — kupuješ celé balenia
a nie každý recept má kalórie spočítané na gram presne. Veľký rozdiel znamená chybu
v niektorom recepte: otvor si najväčšie položky zoznamu a pozri, či niektorá surovina nemá
nezmyselné množstvo (kilo chleba na porciu).

**Pri položke je „? cena".**
Appka nepozná cenu tej suroviny a **nepočíta ju ako nulu**. V bublinke je dôvod: surovina
nie je v databáze, alebo sa jej množstvo nedá previesť na gramy. Povedz mi to a doplním ju.

**Pri kalóriách receptu je „≈ odhad".**
Znamená to, že súčet zo surovín nesedí s číslom uvedeným pri recepte. Väčšinou preto, že
niektorú surovinu appka nevie oceniť („podľa chuti"). Recept je použiteľný, len číslu never
na desatinu.

**Jedlo v pláne mi nesedí.**
Ťuknutie na jedlo otvorí recept. **„✎ zmeniť"** ho vymení (v bloku sa vieš rozhodnúť, či
meníš celý blok alebo len jeden deň), **„⋯ viac"** pridá prílohu alebo jedlo odoberie.
Ak nesedí celý týždeň, stlač generovanie znova — appka sa najprv spýta a pripomenie, že si
plán môžeš uložiť.

**Chcem jedlo, ktoré appka nikdy nedá.**
Pravdepodobne nesedí do kalorického okna slotu alebo ho vyradil diétny filter. Nájdeš ho
v **Receptoch** a do plánu ho pridáš ručne — vždy vyhráva tvoje rozhodnutie.

**Appka sa tvári divne / niečo sa nezobrazuje.**
Zavri a otvor ju znova. Ak to nepomôže, choď do Nastavení → **Zálohovať** (uloží plán,
obľúbené a špajzu do súboru) a napíš mi, čo sa dialo.

**Zmeny sa neukladajú.**
Ak si v súkromnom okne prehliadača alebo je pamäť plná, appka to povie hláškou a kreslí
ďalej — ale po zatvorení bude plán preč. Otvor ju v normálnom okne.

**Recept, ktorý som si pridal v appke, nevidím na druhom zariadení.**
Recepty pridané cez „+ Nový recept" žijú len v tom jednom prehliadači. Ak majú byť naozaj
v kuchárke, pošli mi ich (viď `MOBIL_NAVOD.md`) a ja ich doplním do projektu.
