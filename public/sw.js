/* ============================================================================
   sw.js — Service worker MINIMAL de l'application vendeur (rend le site installable sous Chrome)
   • Ne met RIEN en cache : aucune donnée, aucun produit, aucune photo n'est stocké sur l'appareil.
   • N'intercepte que les ouvertures de PAGE (navigation) : si le réseau est coupé, il affiche un petit message.
   • Ne touche jamais à /api/ (connexion Google, base Neon, images) ni aux requêtes de données.
   ============================================================================ */
'use strict';
var HORS_LIGNE = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Hors connexion</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B1F4D;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}' +
  'h1{font-size:1.2rem;margin:0 0 8px}p{opacity:.85;margin:0 0 18px}button{border:0;border-radius:999px;padding:12px 22px;font-weight:700;background:#fff;color:#0B1F4D}</style></head>' +
  '<body><div><h1>Pas de connexion Internet</h1><p>Vérifiez votre réseau, puis réessayez.</p><button onclick="location.reload()">Réessayer</button></div></body></html>';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.mode !== 'navigate') return;                              // données, images, scripts : le navigateur gère seul
  var u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname.indexOf('/api/') === 0) return;   // connexion Google / API : on ne s'en mêle pas
  e.respondWith(fetch(r).catch(function () { return new Response(HORS_LIGNE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }); }));
});
