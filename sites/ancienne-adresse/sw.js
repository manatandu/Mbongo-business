// Remplace le service worker de l'ancienne adresse : efface l'appli gardée en mémoire,
// se retire, puis recharge les pages ouvertes, qui tombent sur la redirection.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const cle of await caches.keys()) await caches.delete(cle);
      await self.registration.unregister();
      for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
    })(),
  );
});
