# Čo povedal používateľ (30. 8. 2026) — záväzné

Doslovné znenie:

> „Len také veci že ako snack tam môžu a vlastne by aj mali byť normálne veci čo vieš kúpiť
> v supermarkete (kaufland) ako jogurty, syry, pečivo a podobne nič čo treba robiť alebo zvlášť
> vážiť. Normálne zabalené ako sa to kúpi. a tie kludne z celej aplikácie odstráň.
> A skús si sám vygenerovať týždeň či všetko sedí, či všetko funguje ako má.
> Ja osobne vačšinou varím na bloky. Začínam nedela večera a další blok je od utorka večere
> do piatka večere. Ale chcem to mať nastavitelné keď sa nejako ten týždeň hýbe.
> Nech je to uživatelsky prívetíve"

## Ako to čítať
1. **Snack = hotový kúpený výrobok.** Jogurt, skyr, tvaroh, syr, pečivo, orechy v balení, ovocie
   tak, ako sa kúpi. **Nič, čo sa varí, pečie, mixuje alebo váži.** Jedno balenie = jedna porcia.
2. **Súčasné snacky preč z celej aplikácie**, nielen z kategórie.
3. **Bloky:** používateľ varí Ne večer → Po–Ut, Ut večer → St–Pi, Pi večer → So–Ne.
   To je dnešný default a sedí. Ale **musí sa dať prestaviť**, keď sa týždeň pohne.
4. **Používateľská prívetivosť** je požiadavka, nie bonus.

## Čo som overil sám (generovaný týždeň, seed 20260830)
Do plánu padli ako snack: „Cuketové chipsy s parmezánom" (7 surovín, 7 krokov),
„Proteínové placky", „Plnené cuketové rolky". Presne to, čo používateľ nechce.

Zo **177 snackov nie je ani jeden hotový kúpený výrobok** (0 z 177 má ≤ 2 suroviny a ≤ 1 krok
bez varenia). Navyše dáta klamú:
- **„Banán"** = 19 surovín, 9 krokov, 311 kcal — v skutočnosti kakaová torta
- **„Pomaranč"** = 25 surovín, 7 krokov — piškótová roláda
- **„Jablko"** = 20 surovín, 5 krokov — bábovka
- **„Hruška"** = želatína + hrušky + cukor — hruškové želé
- **„Mandarínka"** = 12 surovín — zákusok
Slovenské zákusky pomenované po ovocí skončili v kategórii Snack.

## Rozdelenie receptov dnes
Hlavné jedlo 525 · Raňajky 227 · Šalát 192 · **Snack 177** · Dezert 153 · Cestoviny 123 ·
Nátierka 121 · Polievka 121 · Príloha 110 · Pečivo 82 · Kokteil 63 · Nápoj 62
