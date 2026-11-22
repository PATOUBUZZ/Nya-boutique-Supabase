/* pwa.js — enregistre le service worker de l'application vendeur (installation depuis Chrome : menu ⋮ > « Installer l'application »). */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var ok = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!ok) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () { /* sans conséquence : le site fonctionne normalement */ });
  });
})();
