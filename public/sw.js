// Hand-rolled service worker for the workout-app PWA.
//
// Strategy:
//   - install: precache the offline fallback + icons.
//   - fetch: navigation requests use network-first with a cache fallback,
//     then /offline as a last resort. Same-origin /_next/static/* is
//     cache-first (immutable hashed filenames). Everything else is
//     network-only — Supabase / RSC / auth must always go to the wire so
//     stale data doesn't bleed through.
//   - message: {type:"warm-routes"} pre-fetches a small allowlist of
//     documents so they exist in the cache before the network drops.
//   - activate: claim clients and prune caches whose version doesn't
//     match. Bump CACHE_VERSION when changing cached shape.
//
// Why warming exists. Every in-app route change is a client-side router
// push, which fetches an RSC payload rather than a document — so the
// browser never issues a *navigation* request for /workout/{id}, and the
// navigation cache above never fills for it. Reopening an active workout
// offline (a cold PWA launch, i.e. a real navigation) therefore always
// missed and dead-ended on /offline, even though every set was already
// in IndexedDB. The workout page now asks us, while it is online, to
// fetch and store its own document plus the routes it can reach.
//
// Staleness. Warmed documents are only ever *fallbacks*: navigations stay
// network-first, so a reachable server always wins. Each warm re-fetches
// and overwrites, and the page warms on mount and on every `online`
// event, so an entry is at most one offline session old. The workout page
// then merges Dexie over the document's server snapshot, so stale set
// data inside a warmed document is corrected during hydration. A warmed
// document and the /_next/static chunks it references come from the same
// build because they are fetched in the same session, and a
// CACHE_VERSION bump drops the lot.

const CACHE_VERSION = "v2";
const CACHE = `workout-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Documents a client is allowed to ask us to warm. An allowlist, not a
// filter: warming stores an authenticated HTML document under a URL, so
// the set of URLs that can end up in the cache stays something we chose.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const WARMABLE_PATHS = [
  /^\/$/,
  /^\/history$/,
  /^\/workout\/new$/,
  new RegExp(`^/workout/${UUID}$`, "i"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/");

const isAuthRoute = (url) => url.pathname.startsWith("/auth/");

// A redirected response body belongs to a *different* URL than the one we
// would file it under — caching a /login redirect as "/" is how an app
// starts serving the wrong screen offline. Non-2xx is no better.
const isCacheableDocument = (response) =>
  response.ok && !response.redirected && response.type === "basic";

const warmRoutes = async (urls) => {
  const cache = await caches.open(CACHE);
  await Promise.all(
    urls.map(async (raw) => {
      if (typeof raw !== "string") return;
      let url;
      try {
        url = new URL(raw, self.location.origin);
      } catch {
        return;
      }
      if (url.origin !== self.location.origin) return;
      if (!WARMABLE_PATHS.some((re) => re.test(url.pathname))) return;

      try {
        // Same-origin fetch sends cookies by default, so this is the
        // user's own authenticated render. No RSC header, so we get the
        // full HTML document a navigation would have got.
        const response = await fetch(url.href, { credentials: "same-origin" });
        if (!isCacheableDocument(response)) return;
        await cache.put(url.href, response);
      } catch {
        // Offline, or the server said no. Nothing to warm; whatever is
        // already cached stays put.
      }
    }),
  );
};

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "warm-routes") return;
  if (!Array.isArray(data.urls)) return;
  event.waitUntil(warmRoutes(data.urls));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin (Supabase, fonts, anything else): leave to the network.
  if (url.origin !== self.location.origin) return;

  // Auth routes mutate cookies; never cache them.
  if (isAuthRoute(url)) return;

  // RSC payload requests carry an RSC header. Don't cache them — they're
  // tied to per-user data and would serve stale state.
  if (request.headers.get("RSC")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(request);
          if (isCacheableDocument(fresh)) {
            event.waitUntil(cache.put(request, fresh.clone()));
          }
          return fresh;
        } catch {
          // Exact URL first, then the same path with any query string —
          // /workout/{id}?we={weId} is the same page as /workout/{id},
          // and a deep link shouldn't be the difference between resuming
          // a session and a dead end.
          const cached =
            (await cache.match(request)) ??
            (await cache.match(request, { ignoreSearch: true }));
          if (cached) return cached;
          const offline = await cache.match("/offline");
          if (offline) return offline;
          return new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      })(),
    );
  }
});
