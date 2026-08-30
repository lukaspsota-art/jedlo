# Hosting a synchronizácia PC ↔ mobil

Appka je pripravená ako **PWA** (dá sa nainštalovať a funguje offline) a má **voliteľnú synchronizáciu** dát medzi zariadeniami. Deje sa to v dvoch krokoch.

## Krok 1 — dať appku online (10 min, zadarmo)

Potrebné súbory: **`kucharka.html` + `sw.js`** (a `sync-config.js`, ak ho vytvoríš v kroku 2).
`kucharka.html` je jeden samostatný súbor — recepty aj databázu potravín má v sebe, priečinky
`recepty/` a `data/` na hosting **netreba**. Bez `sw.js` vedľa nej appka nebude fungovať offline.

Pre GitHub Pages je všetko pripravené v priečinku **`docs/`** — `python3 generuj_kucharku.py`
tam sám skopíruje `index.html`, `sw.js` aj `sync-config.js` (ak existuje).
`docs/index.html` a `docs/sw.js` sú vygenerované súbory a v repozitári nie sú — pri hostovaní
cez GitHub Pages ich po builde commitni (`git add docs/index.html docs/sw.js`).

Najjednoduchšie cez **Netlify Drop**:
1. Choď na https://app.netlify.com/drop
2. Pretiahni tam celý priečinok Jedlo (alebo jeho kópiu bez veľkých PDF).
3. Dostaneš adresu typu `https://nieco.netlify.app`. Otvor ju v prehliadači na PC aj na mobile.
4. Na mobile daj v prehliadači „Pridať na plochu" — appka sa nainštaluje a funguje aj offline.

Alternatívy: GitHub Pages, Cloudflare Pages, Vercel — čokoľvek, čo servíruje statické súbory cez https.

> Po tomto kroku máš appku všade, ale obľúbené/plán sú stále uložené v každom zariadení zvlášť. Na spoločné dáta pokračuj krokom 2.

### Ako sa appka aktualizuje po novom builde
`sw.js` drží dokument v režime **stale-while-revalidate**:

1. Appka sa otvorí **okamžite z cache** (aj offline, aj na pomalých dátach — `kucharka.html` má ~4,7 MB).
2. Na pozadí sa podmieneným requestom overí, či server nemá novšiu verziu. Ak nie, vráti sa 304 a nesťahuje sa nič.
3. Keď nový build existuje, stiahne sa na pozadí a appka ukáže hlášku
   *„🔄 Stiahla sa nová verzia kuchárky — obnov stránku a načíta sa."*
4. Po obnovení stránky beží nová verzia.

Používateľ teda **nikdy neuviazne na starej verzii** a zároveň nečaká na 4,7 MB pri každom spustení.
Cache sa volá `kucharka-<VERZIA>`; konštantu `VERZIA` v `sw.js` treba zvýšiť len vtedy, keď chceš
vynútiť vyhodenie celej starej cache (zmena stratégie, poškodený obsah) — na bežnú zmenu obsahu nie.

## Krok 2 — synchronizácia dát (Supabase, zadarmo)

Toto musíš spraviť ty (vytvorenie účtu a kľúčov neviem urobiť za teba), ja som appku už pripravil.

1. Vytvor si zadarmo účet na https://supabase.com a nový projekt.
2. V **Settings → API** skopíruj **Project URL** a **anon public** kľúč.
3. Skopíruj **`sync-config.example.js`** ako **`sync-config.js`** a doplň svoje `url` a `key`:
   ```js
   window.SYNC_CONFIG = {
     url: "https://TVOJ-PROJEKT.supabase.co",  // Settings -> API -> Project URL
     key: "TVOJ-ANON-PUBLIC-KEY",              // Settings -> API -> anon public
     id:  ""                                    // pri prihlásení (Krok 3) sa nepoužíva
   };
   ```
   Do `docs/` ho kopírovať netreba — spraví to `generuj_kucharku.py`.
   Oba súbory (`sync-config.js` aj `docs/sync-config.js`) sú v `.gitignore`.
4. Nahraj/aktualizuj na hosting (krok 1). Prihlásenie a skupiny nastavíš v **Kroku 3**.

> Anon kľúč je verejný (patrí do frontendu), commit do repa je v poriadku. Tvoje dáta chráni prihlásenie + RLS (Krok 3).
>
> **Staršia možnosť bez prihlásenia** (zdieľanie celej blob medzi *tvojimi* zariadeniami cez tajné „Sync ID"): navyše vytvor tabuľku
> `create table kucharka (id text primary key, data jsonb, ts bigint);` s otvoreným RLS
> `create policy "verejne" on kucharka for all using (true) with check (true);` a vyplň `id` v `sync-config.js`. S prihlásením (Krok 3) to nepotrebuješ.

## Krok 3 — účty a skupiny (voliteľné, na zdieľanie plánu s ďalšou osobou)

Toto pridá prihlásenie a „skupiny": pozvaný člen uvidí a môže upravovať **tvoj plán, nákupný zoznam a špajzu**. Obľúbené, poznámky, váhy a TDEE profil ostávajú u každého súkromné. Vyžaduje hotový Krok 2 (`sync-config.js` s `url` a `key`).

1. V Supabase **Authentication → Providers → Email**: zapni **Email**, a **vypni „Confirm email"** (Confirmations = off) — pre domácnosť netreba potvrdzovacie e-maily/SMTP.
2. V **SQL Editor** spusti:
   ```sql
   create table skupiny (
     id uuid primary key default gen_random_uuid(),
     nazov text, kod text unique not null,
     owner uuid references auth.users default auth.uid(),
     created_at timestamptz default now());
   create table clenstvo (
     skupina_id uuid references skupiny on delete cascade,
     user_id uuid references auth.users default auth.uid(),
     primary key (skupina_id, user_id));
   create table skupina_data (
     skupina_id uuid primary key references skupiny on delete cascade,
     data jsonb, ts bigint);
   -- osobné dáta viazané na účet (obľúbené, plán, nastavenia… každý používateľ svoje)
   create table pouzivatel_data (
     user_id uuid primary key references auth.users default auth.uid(),
     data jsonb, ts bigint);

   alter table skupiny enable row level security;
   alter table clenstvo enable row level security;
   alter table skupina_data enable row level security;
   alter table pouzivatel_data enable row level security;
   create policy ud_all on pouzivatel_data for all
     using (user_id = auth.uid()) with check (user_id = auth.uid());

   create policy sk_sel on skupiny for select
     using (id in (select skupina_id from clenstvo where user_id = auth.uid()));
   create policy sk_ins on skupiny for insert with check (owner = auth.uid());
   create policy cl_sel on clenstvo for select using (user_id = auth.uid());
   create policy cl_ins on clenstvo for insert with check (user_id = auth.uid());
   create policy cl_del on clenstvo for delete using (user_id = auth.uid());
   create policy sd_all on skupina_data for all
     using (skupina_id in (select skupina_id from clenstvo where user_id = auth.uid()))
     with check (skupina_id in (select skupina_id from clenstvo where user_id = auth.uid()));

   create or replace function pridaj_sa(kod text) returns uuid
     language plpgsql security definer as $$
   declare sid uuid;
   begin
     select id into sid from skupiny where skupiny.kod = pridaj_sa.kod;
     if sid is null then raise exception 'zly kod'; end if;
     insert into clenstvo(skupina_id,user_id) values (sid, auth.uid()) on conflict do nothing;
     return sid;
   end $$;
   ```
3. V appke → **Nastavenia → Účet a skupina**: zaregistruj sa (e-mail + heslo), **Vytvor skupinu**, skopíruj **pozývací kód**.
4. Pošli kód druhej osobe. Ona sa v appke zaregistruje a v tom istom paneli zadá kód → **Pripojiť sa**. Odvtedy obaja zdieľate plán, nákup a špajzu (zmeny sa objavia po prepnutí späť na kartu appky).

> Prístup k zdieľaným dátam chráni prihlásenie + kód skupiny. Zmeny fungujú štýlom „posledná úprava vyhráva" — pre 2–4-člennú domácnosť to stačí.

### Čo sa stane pri výpadku siete a pri konflikte
- **Výpadok počas ukladania:** zmena ostane v `localStorage` a označí sa ako nenahratá.
  Appka ju dotlačí sama, keď sa sieť vráti (`online`) alebo keď sa vrátiš na kartu s appkou.
  Dovtedy svieti stav „🔴 Chyba synchronizácie" / „⚪ Offline".
- **Kým máš nenahraté zmeny, appka nesťahuje serverovú verziu** — inak by ti prepísala to,
  čo si práve odškrtol v obchode. Najprv sa nahrá tvoja zmena, potom sa ťahá.
- **Konflikt (zmena na PC aj na mobile súčasne):** vyhráva ten, kto uložil **neskôr**, a to
  **celým blokom** — plán, nákup a špajza sa prenášajú ako jeden celok. Ak teda jeden odškrtne
  „mlieko" a druhý v tej istej chvíli „chlieb", ostane len jedna z tých zmien.
  Pre domácnosť, kde sa nakupuje po jednom, to stačí; pre súbežné odškrtávanie by bolo treba
  zlučovanie po položkách (otvorené, viď report).
- **Obľúbené, poznámky, váhy a TDEE profil** sú osobné (tabuľka `pouzivatel_data`)
  a synchronizujú sa len medzi tvojimi zariadeniami, nie so skupinou.

## Poznámky
- Bez `sync-config.js` appka beží úplne normálne, len bez synchronizácie (overené: appka sa
  načíta, funguje offline a v Nastaveniach píše „Nie je nastavená — dáta sú len v tomto zariadení").
- **Pred každým `git push` spusti `python3 scripts/kontrola_tajomstiev.py`.** Prehľadá repozitár
  vrátane `kucharka.html` a `docs/` (GitHub Pages je verejné!) a padne, ak nájde Supabase URL,
  JWT, servisný kľúč alebo vyplnené Sync ID v súbore, ktorý nie je v `.gitignore`.
- Zálohu dát máš aj tak v Nastaveniach (export/import do súboru).
- Ak chceš, s nastavením Supabase ti v ďalšom kroku pomôžem krok za krokom.
