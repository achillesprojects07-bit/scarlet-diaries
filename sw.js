// The Scarlet Diaries — Service Worker (offline support)
// Strategy:
//   - App shell (HTML/CSS/JS/foods.json/icons): cache-first with background refresh
//   - Firebase SDK from gstatic: cache-first (versioned URLs never change)
//   - Firestore API calls: never intercepted (Firestore has its own offline handling)

const CACHE = "scarlet-v5.0.1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./firebase-config.js",
  "./foods.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Never intercept Firestore/auth traffic — the SDK manages its own offline queue.
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com")) return;

  // Firebase SDK modules from gstatic are versioned — safe to cache forever.
  if (url.hostname === "www.gstatic.com") {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // Same-origin shell: cache-first, refresh in background (stale-while-revalidate).
  if (url.origin === self.location.origin && e.request.method === "GET") {
    e.respondWith(
      caches.match(e.request).then(hit => {
        const refresh = fetch(e.request).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || refresh;
      })
    );
  }
});
