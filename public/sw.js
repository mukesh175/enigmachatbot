// Minimal service worker — enables PWA installability.
// Not doing offline caching yet; that can be layered in later if needed.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Pass-through network fetch — no caching strategy yet.
});
