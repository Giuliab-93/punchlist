const CACHE = "punchlist-v12";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  // reload: scarico dalla rete vera, senza passare dalla cache HTTP del browser
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u =>
        fetch(new Request(u, { cache: "reload" }))
          .then(r => (r.ok ? c.put(u, r) : null))
          .catch(() => null)
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete per prima con ricaduta sulla copia locale:
// online prendi sempre la versione aggiornata, in cantiere senza campo funziona lo stesso.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Le chiamate ai servizi di traduzione non passano dalla cache dell'app.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  // GitHub Pages dice al browser di tenersi i file per dieci minuti: senza
  // "reload" il telefono risponde con la copia vecchia e l'app non si aggiorna mai.
  const fresh = new Request(e.request.url, { cache: "reload", credentials: "same-origin" });
  e.respondWith(
    fetch(fresh)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
  );
});
