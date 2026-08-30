// Service worker kuchárky — offline režim a aktualizácie.
//
// VERZIA bumpni RUČNE len keď chceš vynútiť vyhodenie starej cache (zmena stratégie,
// poškodený obsah). Na bežnú aktualizáciu obsahu ju meniť NETREBA: dokument beží
// v režime „stale-while-revalidate“, čiže appka sa načíta okamžite z cache a nová
// verzia sa doťahuje na pozadí (viď správa „nova-verzia“ nižšie).
const VERZIA = "v19";
const CACHE = "kucharka-" + VERZIA;

// sync-config.js sú TVOJE Supabase kľúče — nikdy ho necachuj, inak by sa zmena kľúčov
// alebo Sync ID prejavila až po vyčistení dát prehliadača.
const NIKDY_CACHE = ["sync-config.js", "sw.js"];
const necachuj = (url) => NIKDY_CACHE.some(n => url.pathname.endsWith("/" + n) || url.pathname.endsWith(n));

// „Odtlačok“ odpovede — na rozoznanie, či server naozaj vydal nový build.
const odtlacok = (resp) => resp ? [resp.headers.get("etag"), resp.headers.get("last-modified"),
                                   resp.headers.get("content-length")].join("|") : "";

async function oznam(sprava){
  const kl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  kl.forEach(c => c.postMessage(sprava));
}

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Prvá návšteva: dokument prišiel po sieti EŠTE PRED tým, než sme prevzali kontrolu,
    // takže v cache nič nie je. Bez tohto by appka po prvom otvorení offline nefungovala.
    const kl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const c = await caches.open(CACHE);
    await Promise.all(kl.map(async cl => {
      try {
        const u = new URL(cl.url);
        if (u.origin !== self.location.origin) return;
        if (await c.match(u.href)) return;
        const r = await fetch(u.href, { cache: "reload" });
        if (r && r.ok) await c.put(u.href, r.clone());
      } catch (err) { /* offline pri aktivácii — nevadí, nacachuje sa pri ďalšom načítaní */ }
    }));
  })());
});

// Náhrada, keď sme offline a presná URL nie je v cache (napr. /kucharka.html vs /index.html
// vs /?utm=…). Vezmi hociktorý uložený dokument — appka je jeden súbor, takže je to ona.
async function nejakyDokument(cache){
  const ks = await cache.keys();
  const doc = ks.find(r => { const p = new URL(r.url).pathname; return p.endsWith(".html") || p.endsWith("/"); });
  return doc ? cache.match(doc) : undefined;
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Cudzie originy (Supabase sync) NIKDY necachuj — inak by sa GET na /rest/v1 chytil do
  // cache-first vetvy a zariadenie by navždy čítalo prvú odpoveď namiesto aktuálnych dát skupiny.
  if (url.origin !== self.location.origin) return;
  if (necachuj(url)) return;

  const isDoc = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");

  if (isDoc) {
    // stale-while-revalidate: kucharka.html má ~4,7 MB. Network-first by ju sťahoval pri
    // KAŽDOM spustení (na mobilných dátach desiatky sekúnd), hoci je identická. Takto sa
    // appka otvorí okamžite z cache a nový build sa stiahne na pozadí.
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request, { ignoreSearch: true });
      // cache:"no-cache" = vždy sa server opýtaj, či je novšia verzia (podmienený request,
      // pri nezmenenom súbore vráti 304 a nestiahne 4,7 MB). Bez toho Chrome odpovie
      // z vlastnej HTTP cache a nový build sa nikdy nedoťahal.
      // Request sa nedá skonštruovať z navigačného e.request — berieme len URL.
      const zoSiete = fetch(new Request(e.request.url, { cache: "no-cache", credentials: "same-origin" }))
        .then(async resp => {
          if (resp && resp.ok) {
            const novy = odtlacok(resp) !== odtlacok(cached);
            await cache.put(e.request.url, resp.clone());
            if (cached && novy) oznam({ typ: "nova-verzia" });
          }
          return resp;
        }).catch(() => undefined);
      if (cached) { e.waitUntil(zoSiete); return cached; }
      return (await zoSiete) || (await nejakyDokument(cache)) ||
             new Response("Kuchárka nie je uložená offline. Pripoj sa raz k internetu.",
                          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })());
  } else {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const resp = await fetch(e.request);
      if (resp && resp.ok) cache.put(e.request, resp.clone()).catch(() => {});
      return resp;
    })());
  }
});

// Appka po registrácii pošle svoju vlastnú URL — funguje aj pre /kucharka.html (Netlify)
// aj pre /index.html (GitHub Pages), bez natvrdo zapísaného názvu súboru.
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.typ === "precache" && d.url) {
    e.waitUntil((async () => {
      try {
        const u = new URL(d.url, self.location.origin);
        if (u.origin !== self.location.origin) return;
        const cache = await caches.open(CACHE);
        if (await cache.match(u.href)) return;
        const r = await fetch(u.href, { cache: "reload" });
        if (r && r.ok) await cache.put(u.href, r.clone());
      } catch (err) { /* offline — nacachuje sa neskôr */ }
    })());
  }
});
