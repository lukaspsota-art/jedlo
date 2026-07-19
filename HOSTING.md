# Hosting a synchronizácia PC ↔ mobil

Appka je pripravená ako **PWA** (dá sa nainštalovať a funguje offline) a má **voliteľnú synchronizáciu** dát medzi zariadeniami. Deje sa to v dvoch krokoch.

## Krok 1 — dať appku online (10 min, zadarmo)

Potrebné súbory (celý priečinok): `kucharka.html`, `sw.js`, priečinky `recepty/` a `data/` (a `sync-config.js`, ak ho vytvoríš v kroku 2).

Najjednoduchšie cez **Netlify Drop**:
1. Choď na https://app.netlify.com/drop
2. Pretiahni tam celý priečinok Jedlo (alebo jeho kópiu bez veľkých PDF).
3. Dostaneš adresu typu `https://nieco.netlify.app`. Otvor ju v prehliadači na PC aj na mobile.
4. Na mobile daj v prehliadači „Pridať na plochu" — appka sa nainštaluje a funguje aj offline.

Alternatívy: GitHub Pages, Cloudflare Pages, Vercel — čokoľvek, čo servíruje statické súbory cez https.

> Po tomto kroku máš appku všade, ale obľúbené/plán sú stále uložené v každom zariadení zvlášť. Na spoločné dáta pokračuj krokom 2.

## Krok 2 — synchronizácia dát (Supabase, zadarmo)

Toto musíš spraviť ty (vytvorenie účtu a kľúčov neviem urobiť za teba), ja som appku už pripravil.

1. Vytvor si zadarmo účet na https://supabase.com a nový projekt.
2. V projekte otvor **SQL Editor** a spusti:
   ```sql
   create table kucharka (id text primary key, data jsonb, ts bigint);
   alter table kucharka enable row level security;
   create policy "verejne" on kucharka for all using (true) with check (true);
   ```
3. V **Settings → API** skopíruj **Project URL** a **anon public** kľúč.
4. V priečinku Jedlo skopíruj `sync-config.example.js` ako **`sync-config.js`** a vyplň `url`, `key` a `id`
   (`id` = ľubovoľné spoločné heslo, napr. „psota-domacnost" — rovnaké na PC aj mobile).
5. Nahraj/aktualizuj priečinok na hosting (krok 1). Hotovo — zmeny na jednom zariadení sa objavia na druhom.

> `id` je jediné, čo chráni tvoje dáta, zvoľ ho ako dlhšie heslo. Anon kľúč je verejný (patrí do frontendu), to je v poriadku.

## Poznámky
- Bez `sync-config.js` appka beží úplne normálne, len bez synchronizácie.
- Zálohu dát máš aj tak v Nastaveniach (export/import do súboru).
- Ak chceš, s nastavením Supabase ti v ďalšom kroku pomôžem krok za krokom.
