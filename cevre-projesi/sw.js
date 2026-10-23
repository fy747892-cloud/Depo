const cacheName = 'ecobildirim-v2';
const staticAssets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './İkonlar/logo.jpeg'
];
self.addEventListener('install', async e => {
  const cache = await caches.open(cacheName);
  await cache.addAll(staticAssets);
  return self.skipWaiting();
});
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});