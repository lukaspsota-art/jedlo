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

## Brand Personality
Vecná, tichá, domácka. Nie fitness-app, nie SaaS dashboard. Zeleno-krémová paleta a emoji
ako ikony sú súčasťou identity — sú ľudské a fungujú offline bez ikon-fontu.

## Anti-references
- Fitness/kalorické appky, ktoré na úvod ukážu 12 metrík a 5 CTA (MyFitnessPal dashboard).
- Recepty-weby s modálmi, bannerami a „prihlás sa" prekážkami.
- Admin-dashboard estetika: toolbar plný ikoniek bez menoviek.

## Design Principles
1. **Jedna primárna akcia na obrazovku.** Zvyšok za jedným `⋯` — nie päť rovnako
   vyzerajúcich tlačidiel v riadku.
2. **Telefón vidí len to, čo sa na telefóne robí.** Sekundárne veci sú zbalené, nie zmazané —
   domácnosť ich používa na počítači.
3. **Menovka, nie hádanie.** Každé tlačidlo má text; emoji je ozdoba, nie význam.
4. **Palec dosiahne všetko.** Akcie dole, dotykové ciele ≥44 px, žiadne hover-only.
5. **Nič nesmie závisieť od siete.** Žiadne CDN, žiadne fonty z webu.

## Accessibility & Inclusion
WCAG 2.2 AA ako cieľ: kontrast textu ≥4,5:1 v svetlom aj tmavom režime, dotykové ciele
≥44 px na mobile, viditeľný `:focus-visible`, `prefers-reduced-motion`, tmavý režim
a „väčšie písmo" ako explicitné prepínače. Inputy ≥16 px, aby iOS nezoomoval.
