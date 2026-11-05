// Offline cache, cache-first. Never rename this file. Bump VERSION on every release:
// that is how phones find out there is a new version.
const VERSION = 'hb-3';
const FILES = ['./', './index.html', './engine.js', './content.js', './manifest.webmanifest',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores old files.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Notifications sent by the repo's GitHub Actions workflow: {title, body, url}. iOS revokes the subscription
// when pushes show nothing, so every push shows a notification. A tap opens a page of this app only.
const inApp = u => { try { const h = new URL(u || './#home', self.registration.scope).href; return h.startsWith(self.registration.scope) ? h : null; } catch (e) { return null; } };
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (err) { m = { body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(m.title || 'הדרך הביתה', {
    body: m.body || 'יש הודעה חדשה באפליקציה.', lang: 'he', dir: 'rtl', icon: 'icons/icon-192.png', tag: m.tag || 'hb',
    data: { url: inApp(m.url) || inApp('./#home') },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && inApp(e.notification.data.url)) || inApp('./#home');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow(url);
  }));
});
