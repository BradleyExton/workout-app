// Hand-rolled service worker for the workout-app PWA.
//
// Strategy:
//   - install: precache the offline fallback + icons.
//   - fetch: navigation requests use network-first with a cache fallback,
//     then /offline as a last resort. Same-origin /_next/static/* is
//     cache-first (immutable hashed filenames). Everything else is
//     network-only — Supabase / RSC / auth must always go to the wire so
//     stale data doesn't bleed through.
//   - activate: claim clients and prune caches whose version doesn't
//     match. Bump CACHE_VERSION when changing cached shape.

const CACHE_VERSION = "v1";
const CACHE = `workout-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
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
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(request);
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
