/* Little Bloom service worker — offline after first load */
const CACHE = "little-bloom-v11";
const ASSETS = [
  "./", "./index.html", "./week.html", "./month.html", "./breathe.html", "./kicks.html",
  "./diet.html", "./checklist.html", "./bag.html", "./signs.html", "./partner.html",
  "./about.html", "./menu.html", "./play.html",
  "./sanskar.html", "./gita.html",
  "./css/styles-v7.css",
  "./js/i18n-v8.js", "./js/content-weeks-1.js", "./js/content-weeks-2.js",
  "./js/content-weeks-3.js", "./js/content-weeks-4.js", "./js/content-months.js",
  "./js/content-extra-v4.js",
  "./js/content-food.js", "./js/content-sanskar.js", "./js/app-v10.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./manifest.webmanifest",
  "./audio/mantra-1.m4a", "./audio/mantra-2.m4a", "./audio/mantra-3.m4a", "./audio/mantra-4.m4a", "./audio/mantra-5.m4a", "./audio/mantra-6.m4a", "./audio/mantra-7.m4a", "./audio/mantra-8.m4a", "./audio/mantra-9.m4a", "./audio/mantra-10.m4a", "./audio/mantra-11.m4a", "./audio/mantra-12.m4a"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
