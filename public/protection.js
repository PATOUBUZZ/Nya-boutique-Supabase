/* ============================================================================
   protection.js — Protège le contenu commercial (site visiteur ET espace vendeur)
   Réglable dans config.js > protection : { selectionTexte, menuContextuel, telechargementImages } (true par défaut).
     • selectionTexte        : empêche de sélectionner / copier les textes (sauf dans les champs de saisie)
     • menuContextuel        : bloque le menu de l'appui long / clic droit (« Copier », « Ouvrir dans un nouvel onglet »…)
     • telechargementImages  : bloque « Télécharger l'image », le glisser-déposer et l'appui long sur les photos
   Les champs de saisie (formulaires, recherche, lien à copier) restent normaux : on peut y taper, y sélectionner et y copier.
   ⚠️ Limite : c'est un frein pour le public, pas un coffre-fort. Les captures d'écran, l'outil développeur du navigateur
   et « afficher le code source » restent possibles ; une photo publiée sur Internet ne peut jamais être protégée à 100 %.
   ============================================================================ */
(function () {
  'use strict';
  var p = (window.NB && window.NB.cfg && window.NB.cfg.protection) || (window.NB_CONFIG && window.NB_CONFIG.protection) || {};
  function actif(k) { return p[k] !== false; }

  var CHAMPS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .nb-selectable';
  function elementDe(n) { return n && n.nodeType === 3 ? n.parentElement : n; }
  function dansChamp(n) { n = elementDe(n); return !!(n && n.closest && n.closest(CHAMPS)); }
  function estImage(n) { n = elementDe(n); return !!(n && n.closest && n.closest('img, picture, canvas, video')); }

  var css = [];
  if (actif('selectionTexte')) {
    css.push('html, body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }');
    css.push('input, textarea, select, [contenteditable=""], [contenteditable="true"], .nb-selectable { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }');
  }
  if (actif('telechargementImages')) {
    css.push('img, picture, canvas, video { -webkit-user-drag: none; user-drag: none; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }');
  }
  if (css.length) { var st = document.createElement('style'); st.setAttribute('data-nb', 'protection'); st.textContent = css.join('\n'); (document.head || document.documentElement).appendChild(st); }

  // Menu d'appui long (Android/iOS) et clic droit (ordinateur)
  document.addEventListener('contextmenu', function (e) {
    if (dansChamp(e.target)) return;
    if (actif('menuContextuel') || (actif('telechargementImages') && estImage(e.target))) e.preventDefault();
  }, true);
  // Début de sélection de texte
  document.addEventListener('selectstart', function (e) {
    if (actif('selectionTexte') && !dansChamp(e.target)) e.preventDefault();
  }, true);
  // Copie : bloquée hors des champs (la copie « Copier le lien » du site utilise un champ ou l'API presse-papiers : non affectée)
  document.addEventListener('copy', function (e) {
    if (actif('selectionTexte') && !dansChamp(e.target) && !dansChamp(document.activeElement)) e.preventDefault();
  }, true);
  // Glisser une photo hors de la page
  document.addEventListener('dragstart', function (e) {
    if (actif('telechargementImages') && estImage(e.target)) e.preventDefault();
  }, true);
})();
