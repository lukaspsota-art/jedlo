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

   alter table skupiny enable row level security;
   alter table clenstvo enable row level security;
   alter table skupina_data enable row level security;

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

## Poznámky
- Bez `sync-config.js` appka beží úplne normálne, len bez synchronizácie.
- Zálohu dát máš aj tak v Nastaveniach (export/import do súboru).
- Ak chceš, s nastavením Supabase ti v ďalšom kroku pomôžem krok za krokom.
