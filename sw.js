'use strict';
// Fast-open cache for the flat build. Bump VERSION on every release.
const VERSION = 'mn-flat-4.3.0';
const SHELL = ['./', 'index.html', 'fonts.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
async function refresh(req, key, notify) {
  try {
    const r = await fetch(req, {cache: 'no-cache'});
    if (!r.ok) return;
    const c = await caches.open(VERSION), old = await c.match(key);
    let changed = false;
    if (old) { const a = await old.clone().text(), b = await r.clone().text(); changed = a.length !== b.length || a !== b; }
    await c.put(key, r.clone());
    if (changed && notify) { const cl = await self.clients.matchAll(); cl.forEach(x => x.postMessage('upd')); }
  } catch (e) {}
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(hit => { const upd = refresh('index.html', 'index.html', true); e.waitUntil(upd); return hit || fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => { const upd = refresh(req, req, false); e.waitUntil(upd); return hit || fetch(req); }));
});
