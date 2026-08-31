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

> Anon kľúč je verejný (patrí do frontendu), commit do repa je v poriadku. **Sám o sebe však nechráni nič** — čo z databázy uvidí ktokoľvek na internete, rozhoduje výhradne RLS. Tvoje dáta chráni prihlásenie + RLS (Krok 3).

### ⛔ Politika `using (true)` — ak si ju už spustil, oprav ju hneď

Staršie znenie tohto návodu odporúčalo tabuľku `kucharka` s politikou
`create policy "verejne" on kucharka for all using (true) with check (true);`.
**Toto je bezpečnostná diera, nie „jednoduchšia možnosť".** RLS nevie o filtri `?id=eq....`,
ktorý posiela appka — vyhodnocuje sa nad každým riadkom zvlášť. Pri `using (true)` teda:

- `GET /rest/v1/kucharka?select=*` s obyčajným anon kľúčom (a ten je verejne stiahnuteľný
  z `sync-config.js` na tvojom hostingu) vráti **riadky všetkých domácností**,
- `POST` na tú istú tabuľku ich vie **prepísať**.

V blobe je plán, nákupný zoznam, špajza, TDEE profil, **váhový denník** aj história varenia.
„Sync ID" nechránilo nič — tajné na ňom nebolo nič.

Oprava (SQL Editor, bezpečné spustiť aj keď si tabuľku nikdy nevytvoril):

```sql
drop policy if exists "verejne" on kucharka;
revoke all on table kucharka from anon, authenticated;
alter table if exists kucharka enable row level security;
```

Potom si vyber jednu z dvoch bezpečných ciest: **Krok 3 (odporúčané)**, alebo **Krok 2B** nižšie.

## Krok 2B — synchronizácia bez účtov (len ak nechceš prihlásenie)

Appka nemá vlastné účty pre túto cestu, takže sa treba preukázať niečím iným. Riešenie:
**tabuľka je pre anon rolu úplne zamknutá** a číta/píše sa výhradne cez dve funkcie, ktorým
sa Sync ID musí odovzdať ako argument. Funkcia vráti len ten jeden riadok, ktorého `id` sedí —
nikdy nie cudzie. `security definer` znamená, že funkcia beží s právami vlastníka, preto sa
tabuľka nemusí sprístupniť nikomu; `set search_path = public` bráni podstrčeniu inej tabuľky.

1. V **SQL Editor** spusti:
   ```sql
   create table if not exists kucharka (id text primary key, data jsonb, ts bigint);
   alter table kucharka enable row level security;   -- žiadna politika = anon nevidí ani riadok
   revoke all on table kucharka from anon, authenticated;

   create or replace function sync_nacitaj(p_id text)
     returns table (data jsonb, ts bigint)
     language sql security definer set search_path = public as $$
       select k.data, k.ts from kucharka k where k.id = p_id and length(p_id) >= 20;
     $$;

   create or replace function sync_uloz(p_id text, p_data jsonb, p_ts bigint)
     returns void
     language sql security definer set search_path = public as $$
       insert into kucharka(id, data, ts) values (p_id, p_data, p_ts)
       on conflict (id) do update set data = excluded.data, ts = excluded.ts;
     $$;

   revoke all on function sync_nacitaj(text) from public;
   revoke all on function sync_uloz(text, jsonb, bigint) from public;
   grant execute on function sync_nacitaj(text) to anon;
   grant execute on function sync_uloz(text, jsonb, bigint) to anon;
   ```
2. **Vygeneruj si Sync ID ako náhodný reťazec, nie ako slovo.** Je to jediné tajomstvo tejto
   cesty — kto ho pozná, vidí a prepíše celý tvoj stav. Podmienka `length(p_id) >= 20` vyššie
   je poistka proti „rodina" a podobným; skutočnú silu dáva náhodnosť, nie dĺžka.
   V prehliadači (F12 → Console) alebo v termináli:
   ```js
   crypto.randomUUID() + "-" + crypto.randomUUID()
   ```
3. To isté Sync ID vyplň na **každom** zariadení: buď do `sync-config.js` (`id: "…"`),
   alebo v appke v **Nastavenia → Synchronizácia → Sync ID**. Zariadenia s rovnakým Sync ID
   zdieľajú celý stav.
4. Hotovo. Appka funkcie nájde sama; ak v projekte nie sú (staré nastavenie), vráti sa
   k priamemu prístupu do tabuľky — vtedy si **nedokončil opravu vyššie** a dáta sú stále verejné.

Čo táto cesta **nechráni**: Sync ID je zdieľané tajomstvo v štýle hesla. Neposielaj ho cez
verejné kanály, nedávaj do commitu (`sync-config.js` je v `.gitignore`) a pri podozrení ho zmeň
a starý riadok zmaž: `delete from kucharka where id = 'STARE-SYNC-ID';`.
Ak chceš zdieľať plán s ďalšou osobou a mať zvlášť súkromné a spoločné dáta, choď na **Krok 3**.

## Krok 3 — účty a skupiny (odporúčané; nutné na zdieľanie plánu s ďalšou osobou)

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

   -- set search_path: bez neho by sa dala funkcii bežiacej s právami vlastníka podstrčiť
   -- iná tabuľka „skupiny" cez search_path volajúceho (P3-5 z auditu).
   create or replace function pridaj_sa(kod text) returns uuid
     language plpgsql security definer set search_path = public as $$
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
>
> **Prečo je toto bezpečné a `using (true)` nie:** každá politika vyššie porovnáva riadok
> s `auth.uid()`, teda s identitou z prihlasovacieho tokenu. Riadky cudzieho používateľa alebo
> cudzej skupiny sa nevrátia ani vtedy, keď si ich niekto vypýta priamo cez REST API s anon
> kľúčom. `pouzivatel_data` vidí len vlastník, `skupina_data` len člen skupiny.

### Ako si overiť, že RLS naozaj drží
Po nastavení skús v termináli (nahraď `URL` a `ANON_KEY` svojimi hodnotami) stiahnuť tabuľky
bez prihlásenia — každý dotaz musí vrátiť prázdne pole `[]`, nie dáta:

```bash
for t in kucharka pouzivatel_data skupina_data skupiny clenstvo; do
  echo -n "$t: "; curl -s "URL/rest/v1/$t?select=*" -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY"; echo
done
```

Ak niektorý riadok vráti tvoje dáta, politika pre tú tabuľku je zle — oprav ju skôr, než dáš
appku online.

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
