/* VZOR pre sync-config.js — synchronizácia PC ↔ mobil (voliteľná).
 *
 * Bez tohto súboru appka beží úplne normálne, len bez synchronizácie
 * (dáta ostávajú v localStorage každého zariadenia zvlášť).
 *
 * Postup:
 *   1. Skopíruj tento súbor ako `sync-config.js` (vedľa kucharka.html).
 *   2. Vyplň `url` a `key` zo Supabase → Settings → API.
 *   3. Spusti `python3 generuj_kucharku.py` — generátor ho skopíruje aj do docs/
 *      (GitHub Pages beží z priečinka docs/).
 *   Podrobný postup vrátane SQL pre účty a skupiny: HOSTING.md.
 *
 * `sync-config.js` je v .gitignore a NESMIE sa commitnúť. Anon public key síce patrí
 * do frontendu a nie je tajomstvo v pravom zmysle, ale spolu s „Sync ID" nižšie by
 * ktokoľvek s prístupom k repozitáru vedel čítať a prepisovať vaše dáta.
 * Tento vzorový súbor commitnutý byť MÁ — nesmie však obsahovať skutočné hodnoty.
 */
window.SYNC_CONFIG = {
  // Supabase → Settings → API → Project URL
  url: "https://TVOJ-PROJEKT.supabase.co",

  // Supabase → Settings → API → anon public — NIE servisný kľúč (ten patrí výhradne na server)
  key: "TVOJ-ANON-PUBLIC-KEY",

  // Staršia možnosť bez prihlásenia: tajné „Sync ID", ktoré zdieľajú tvoje zariadenia.
  // S prihlásením a skupinami (Krok 3 v HOSTING.md) nechaj prázdne.
  id: ""
};
