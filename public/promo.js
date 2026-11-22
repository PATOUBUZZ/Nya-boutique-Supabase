/* ============================================================================
   promo.js — AJOUTS du site visiteur (chargé APRÈS app.js, qu'il ne modifie pas)
   ----------------------------------------------------------------------------
   1. Icônes TikTok / Facebook dans l'en-tête (liens saisis par le vendeur dans vendeur.html).
   2. Bannière promo : carrousel INFINI de 3 diapositives (image d'un côté, titre + texte de l'autre).
   • Données : colonnes boutique.tiktok_url / facebook_url / promo_actif + table promo_slides (SQL/4-promo-reseaux.sql),
     lues en lecture seule via l'API REST publique de Supabase, avec le même principe de CACHE que app.js
     (config.cacheMinutes) mais une clé de cache séparée.
   • Si le script SQL n'a pas encore été exécuté, ou si le réseau est coupé : AUCUNE erreur n'est montrée au visiteur,
     l'en-tête et la grille de produits fonctionnent exactement comme avant.
   • Sécurité : tout le texte passe par textContent, les images doivent être en https, les liens sociaux en https :
     aucune injection HTML possible.
   • Carrousel : défilement automatique (5 s), flèches (ordinateur), points, balayage au doigt / à la souris,
     pause au survol, au focus clavier, hors écran et onglet masqué ; pas de défilement auto si « réduire les animations ».
   ============================================================================ */
(function () {
  'use strict';

  var NB = window.NB;
  if (!NB) return;                                   // shared.js absent : on ne fait rien
  var cfg = NB.cfg, el = NB.el, $ = NB.$;

  var CLE_CACHE = cfg.cleCache + '_promo';           // ⚠️ même expression dans vendeur-promo.js (invalidation du cache)
  var DELAI_AUTO = 5000;                             // 5 s entre deux diapositives
  var DUREE_ANIM = 700;                              // filet de sécurité si « transitionend » ne se déclenche pas

  /* ───────────────────────────── Chargement des données (avec cache) ───────────────────────────── */
  function rest(chemin) { return NB.lirePublic(chemin); }   // Supabase (config.js)
  function telecharger() {
    return Promise.all([
      rest('boutique?select=tiktok_url,facebook_url,promo_actif&id=eq.1'),
      rest('promo_slides?select=rang,titre,texte,image_url&order=rang.asc')
    ]).then(function (r) {
      var b = r[0][0] || {};
      return { tiktok_url: b.tiktok_url || '', facebook_url: b.facebook_url || '', promo_actif: b.promo_actif === true, slides: r[1] || [] };
    });
  }
  /** Données fraîches (< cacheMinutes) → aucun appel réseau. Sinon on télécharge ; en cas d'échec réseau, on retombe sur le cache périmé. */
  function charger() {
    var c = NB.lire(CLE_CACHE), valide = !!(c && c.t && c.donnees);
    if (valide && (Date.now() - c.t) < cfg.cacheMinutes * 60000) return Promise.resolve(c.donnees);
    return telecharger().then(function (d) { NB.ecrire(CLE_CACHE, { t: Date.now(), donnees: d }); return d; })
      .catch(function (e) { if (valide) return c.donnees; throw e; });
  }

  /** Adresse acceptée pour un lien social : https uniquement (jamais javascript:, data:…) */
  function lienHttps(u) { u = String(u || '').trim(); return /^https:\/\/[^\s]+$/i.test(u) ? u : ''; }

  /* ───────────────────────────── 1) Icônes TikTok / Facebook ───────────────────────────── */
  // Logos officiels simplifiés (SVG 24×24, remplissage = couleur du texte). Contenu fixe, jamais issu d'une saisie.
  var LOGOS = {
    tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z'
  };
  function logo(reseau) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    p.setAttribute('d', LOGOS[reseau]); s.appendChild(p);
    return s;
  }

  /** Affiche uniquement les icônes dont le vendeur a renseigné le lien (pas de lien mort). */
  function construireReseaux(d) {
    var boite = $('header-social'); if (!boite) return;
    boite.textContent = '';
    [['tiktok', 'TikTok', d.tiktok_url], ['facebook', 'Facebook', d.facebook_url]].forEach(function (r) {
      var u = lienHttps(r[2]); if (!u) return;
      var a = el('a', { 'class': 'social-btn social-' + r[0], href: u, target: '_blank', rel: 'noopener noreferrer', title: r[1], 'aria-label': r[1] + ' (s’ouvre dans un nouvel onglet)' });
      a.appendChild(logo(r[0]));
      boite.appendChild(a);
    });
    boite.hidden = !boite.childNodes.length;
  }

  /* ───────────────────────────── 2) Carrousel infini ─────────────────────────────
     Principe de la boucle sans à-coup : on place une COPIE de la dernière diapositive avant la première et une COPIE de
     la première après la dernière :   [copie 3] [1] [2] [3] [copie 1]
     Quand l'animation arrive sur une copie, on « saute » sans animation sur la vraie diapositive correspondante.        */
  var C = {                                    // état du carrousel
    n: 0, pos: 1, occupe: false,               // n = nombre de diapositives réelles ; pos = index dans la piste (copies comprises)
    piste: null, points: [],
    minuteur: null, garde: null,
    pauses: { souris: false, focus: false, onglet: false, ecran: false },
    reduit: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  };

  function indexReel() { return (C.pos - 1 + C.n) % C.n; }          // 0 … n-1 (la copie de fin = 0, la copie de début = n-1)

  function majPoints() {
    var k = indexReel();
    C.points.forEach(function (p, i) { p.setAttribute('aria-current', i === k ? 'true' : 'false'); });
  }
  /** Positionne la piste. animer=false → saut instantané (utilisé pour la boucle). */
  function placer(animer) {
    C.piste.style.transition = animer ? '' : 'none';
    C.piste.style.transform = 'translateX(' + (-C.pos * 100) + '%)';
    if (!animer) { void C.piste.offsetWidth; C.piste.style.transition = ''; }   // force le recalcul puis réactive l'animation
    majPoints();
  }
  /** Fin d'une animation : si l'on est sur une copie, on saute sur la vraie diapositive. */
  function normaliser() {
    if (!C.occupe) return;
    clearTimeout(C.garde);
    if (C.pos === C.n + 1) C.pos = 1; else if (C.pos === 0) C.pos = C.n;
    placer(false);
    C.occupe = false;
  }
  function allerA(pos) {
    if (C.occupe || C.n < 2 || pos === C.pos) return;
    C.occupe = true; C.pos = pos; placer(true);
    clearTimeout(C.garde); C.garde = setTimeout(normaliser, DUREE_ANIM);
  }
  function suivante() { allerA(C.pos + 1); }
  function precedente() { allerA(C.pos - 1); }

  /* Défilement automatique : actif seulement si aucune pause n'est demandée */
  function peutDefiler() { return C.n > 1 && !C.reduit && !C.pauses.souris && !C.pauses.focus && !C.pauses.onglet && !C.pauses.ecran; }
  function planifier() {
    clearTimeout(C.minuteur);
    if (!peutDefiler()) return;
    C.minuteur = setTimeout(function () { suivante(); planifier(); }, DELAI_AUTO);
  }
  function arreter() { clearTimeout(C.minuteur); clearTimeout(C.garde); C.minuteur = null; C.garde = null; }

  /** Une diapositive : [image] à gauche, [titre + texte] à droite. */
  function creerDiapo(s, i, n, copie) {
    var url = NB.urlImage(s.image_url), titre = (s.titre || '').trim(), texte = (s.texte || '').trim();
    var classe = 'promo-slide' + (url ? '' : ' no-img') + (titre || texte ? '' : ' no-text');
    var d = el('div', { 'class': classe, role: 'group', 'aria-roledescription': 'diapositive', 'aria-label': (i + 1) + ' sur ' + n, 'aria-hidden': copie ? 'true' : false });
    var interieur = el('div', { 'class': 'promo-inner' });
    if (url) interieur.appendChild(el('div', { 'class': 'promo-img' }, [el('img', { src: url, alt: titre || 'Produit en promotion', width: 480, height: 480, decoding: 'async', draggable: 'false' })]));
    if (titre || texte) interieur.appendChild(el('div', { 'class': 'promo-text' }, [
      titre ? el('h2', { 'class': 'promo-title', text: titre }) : null,
      texte ? el('p', { 'class': 'promo-desc', text: texte }) : null
    ]));
    d.appendChild(interieur);
    return d;
  }

  function construireBanniere(d) {
    var sec = $('promo-banner'); if (!sec) return;
    arreter(); sec.textContent = ''; C.n = 0; C.points = [];

    // Une diapositive s'affiche si elle contient au moins une image, un titre ou un texte
    var slides = (d.slides || []).filter(function (s) { return s && (NB.urlImage(s.image_url) || (s.titre || '').trim() || (s.texte || '').trim()); }).slice(0, 3);
    if (!d.promo_actif || !slides.length) { sec.hidden = true; return; }

    var n = slides.length; C.n = n; C.pos = n > 1 ? 1 : 0; C.occupe = false;
    var vue = el('div', { 'class': 'promo-viewport' });
    C.piste = el('div', { 'class': 'promo-track' });
    if (n > 1) C.piste.appendChild(creerDiapo(slides[n - 1], n - 1, n, true));                        // copie de la dernière
    slides.forEach(function (s, i) { C.piste.appendChild(creerDiapo(s, i, n, false)); });
    if (n > 1) C.piste.appendChild(creerDiapo(slides[0], 0, n, true));                                // copie de la première
    vue.appendChild(C.piste);
    sec.appendChild(vue);
    sec.setAttribute('aria-roledescription', 'carrousel');

    if (n > 1) {
      var prec = el('button', { 'class': 'promo-nav promo-prev', type: 'button', 'aria-label': 'Diapositive précédente' }, [NB.icon('left', 20)]);
      var suiv = el('button', { 'class': 'promo-nav promo-next', type: 'button', 'aria-label': 'Diapositive suivante' }, [NB.icon('right', 20)]);
      prec.onclick = function () { precedente(); planifier(); };
      suiv.onclick = function () { suivante(); planifier(); };
      var pts = el('div', { 'class': 'promo-dots' });
      for (var k = 0; k < n; k++) (function (k) {
        var p = el('button', { 'class': 'promo-dot', type: 'button', 'aria-label': 'Aller à la diapositive ' + (k + 1) });
        p.onclick = function () { allerA(k + 1); planifier(); };
        C.points.push(p); pts.appendChild(p);
      })(k);
      sec.appendChild(prec); sec.appendChild(suiv); sec.appendChild(pts);

      C.piste.addEventListener('transitionend', function (e) { if (e.target === C.piste && e.propertyName === 'transform') normaliser(); });

      // Balayage (doigt ou souris) : un geste horizontal > 40 px change de diapositive
      var x0 = null, y0 = null;
      vue.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
      vue.addEventListener('pointerup', function (e) {
        if (x0 === null) return;
        var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) suivante(); else precedente(); planifier(); }
      });
      vue.addEventListener('pointercancel', function () { x0 = null; });

      // Pauses : souris dessus (pas au toucher, sinon le défilement s'arrêterait après un simple appui), focus clavier
      sec.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { C.pauses.souris = true; planifier(); } });
      sec.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { C.pauses.souris = false; planifier(); } });
      // (focus CLAVIER uniquement : après un simple clic/tap sur un point, le bouton garde le focus et bloquerait le défilement à vie)
      sec.addEventListener('focusin', function (e) { var clavier = false; try { clavier = e.target.matches(':focus-visible'); } catch (x) { /* navigateur ancien */ } if (clavier) { C.pauses.focus = true; planifier(); } });
      sec.addEventListener('focusout', function () { C.pauses.focus = false; planifier(); });
      // Pause quand la bannière n'est pas à l'écran (économise la batterie)
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entrees) {
          C.pauses.ecran = !entrees.some(function (x) { return x.isIntersecting; }); planifier();
        }, { threshold: 0.2 }).observe(sec);
      }
    }
    placer(false);
    sec.hidden = false;
    planifier();
  }

  /* ───────────────────────────── Démarrage ───────────────────────────── */
  function init() {
    // Pause quand l'onglet est masqué (listener posé une seule fois)
    document.addEventListener('visibilitychange', function () { C.pauses.onglet = document.visibilityState === 'hidden'; planifier(); });

    if (!NB.configOk()) return;   // config.js pas encore rempli
    charger().then(function (d) { construireReseaux(d); construireBanniere(d); })
      .catch(function (e) { if (window.console) console.warn('[promo] bannière / réseaux non chargés :', e && e.message); });   // silencieux pour le visiteur
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
