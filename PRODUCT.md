# Product

## Register

product

## Users
Jedna domácnosť (2 dospelí, rôzne kalorické cieľe). Dva režimy použitia:

- **Telefón (hlavný, one-handed):** nákup v obchode (odškrtávanie po oddeleniach),
  „čo dnes varím" + režim varenia pri sporáku, plánovanie/zámena jedál v týždni.
- **Počítač:** dlhé úlohy — nastavenia domácnosti, správa špajze, kontrola výživy,
  generovanie jedálnička z letáku.

Kontext na telefóne je nepriateľský: jedna ruka, košík v druhej, mokré ruky pri sporáku,
zlé svetlo v obchode. Používateľ nikdy nič nehľadá v menu — buď to vidí, alebo to nepotrebuje.

## Product Purpose
Offline single-file kuchárka + meal-prep plánovač. Úspech = v piatok sa zostaví týždeň,
v obchode sa nakúpi presne to, čo treba, a počas týždňa sa nikto nepýta „čo dnes jeme".

Tri odlišné situácie, každá chce niečo iné — a appka to má rozlišovať, nie priemerovať:
**plánovanie** (v pokoji, hustá informácia, tabuľka týždňa) · **obchod** (jedna ruka, veľké
ciele, rýchle odškrtávanie) · **kuchyňa** (mastné ruky, telefón opretý, veľké písmo, krok po kroku).

## Brand Personality
Vecná, tichá, domácka. Nie fitness-app, nie SaaS dashboard. Emoji ako ikony sú súčasťou
identity — sú ľudské a fungujú offline bez ikon-fontu.

Paleta stojí na jednej myšlienke: **farba = varný blok**. Týždeň má tri bloky, každý má svoju
farbu (slivka / more / oliva) a tá ide cez plán, nákup, Domov aj varenie, takže v nákupe hneď
vidno, na ktorú várku položka patrí. Podklad je teplá šeď, nie krém. Červená je vyhradená na
**stav** (nad cieľom, po expirácii), nikdy na identitu.

## Anti-references
- Fitness/kalorické appky, ktoré na úvod ukážu 12 metrík a 5 CTA (MyFitnessPal dashboard).
- Recepty-weby s modálmi, bannerami a „prihlás sa" prekážkami.
- Admin-dashboard estetika: toolbar plný ikoniek bez menoviek.
- Appky, ktoré na telefóne ukážu to isté ako na monitore, len menšie.

## Design Principles
1. **Jedna primárna akcia na obrazovku.** Zvyšok za jedným `⋯` — nie päť rovnako
   vyzerajúcich tlačidiel v riadku.
2. **Telefón vidí len to, čo sa na telefóne robí.** Sekundárne veci sú zbalené, nie zmazané —
   domácnosť ich používa na počítači.
3. **Obsah je nad prehybom.** Merateľné: na 393×850 s naplneným plánom musí byť **prvé jedlo
   v Pláne a prvá položka v Nákupe viditeľná bez skrolovania** vo všetkých troch režimoch
   hustoty. Ovládanie sa pred obsah nestavia.
4. **Menovka, nie hádanie.** Každé tlačidlo má text; emoji je ozdoba, nie význam.
   A **farba nikdy nie je jediný nosič informácie** — k farbe bloku patrí písmeno A/B/C.
5. **Palec dosiahne všetko.** Akcie dole, dotykové ciele ≥44 px (56 px v Obchode, 64 px
   v Kuchyni), žiadne hover-only.
6. **Nič nesmie závisieť od siete.** Žiadne CDN, žiadne fonty z webu, jeden súbor.
7. **Appka radšej prizná, že nevie.** Neznáma cena je „? cena" s dôvodom, nie tiché 0,00 €;
   kalórie, ktoré nesedia so surovinami, sú „≈ odhad". Číslo bez krytia je horšie než chýbajúce.

## Accessibility & Inclusion
WCAG 2.2 AA ako cieľ: kontrast textu ≥4,5:1 v svetlom aj tmavom režime (strážené skriptom,
ktorý pri poklese padne), dotykové ciele ≥44 px na mobile a nikdy pod 24 px ani na počítači,
všetko dosiahnuteľné klávesnicou vrátane kariet receptov a buniek plánu, viditeľný
`:focus-visible`, návrat fokusu po zatvorení dialógu, `prefers-reduced-motion`, tmavý režim
(výslovná voľba aj podľa systému) a „väčšie písmo" ako explicitné prepínače.
Inputy ≥16 px, aby iOS nezoomoval.
