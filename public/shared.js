/* ============================================================================
   shared.js — petits outils communs au site visiteur (app.js) et à l'espace
   propriétaire (vendeur.js). Aucune logique métier ici.
   ============================================================================ */
(function () {
  'use strict';

  var DEFAUTS = {
    backend: 'supabase', apiUrl: '/api', supabaseUrl: '', supabaseKey: '', cacheMinutes: 5, couleur: '#2563eb', devise: 'FCFA',
    lotAffichage: 12, vitesseBande: 45, whatsappSupport: '', cleCache: 'nb_cache_v1', cleePanier: 'nb_panier_v1',
    boutonsGrille: true, logo: '', protection: {}, enteteImage: {}, theme: {}   // réglages avancés (config.js) : lus par appliquerTheme()
  };
  var cfg = {};
  var src = window.NB_CONFIG || {};
  Object.keys(DEFAUTS).forEach(function (k) { cfg[k] = (src[k] !== undefined && src[k] !== null) ? src[k] : DEFAUTS[k]; });
  cfg.cleePanier = src.cleePanier || DEFAUTS.cleePanier;


  // ── Choix du back-end : 'supabase' (comme avant) ou 'neon' (API Cloudflare Pages Functions + base Neon)
  var NEON = String(cfg.backend).toLowerCase() === 'neon';
  var API = String(cfg.apiUrl || '/api').replace(/\/+$/, '');

  /** true si config.js est rempli pour le back-end choisi */
  function configOk() {
    if (NEON) return true;   // Neon : aucune clé dans le navigateur (tout est côté serveur)
    return !!cfg.supabaseUrl && !/VOTRE/i.test(cfg.supabaseUrl) && !/VOTRE/i.test(cfg.supabaseKey);
  }
  /** Lecture publique (site visiteur) : même syntaxe de requête dans les deux modes */
  function lirePublic(chemin) {
    var url, h = { Accept: 'application/json' };
    if (NEON) { url = API + '/rest/' + chemin; }
    else {
      url = cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + chemin;
      h.apikey = cfg.supabaseKey;
      if (/^eyJ/.test(cfg.supabaseKey)) h.Authorization = 'Bearer ' + cfg.supabaseKey;   // ancienne clé « anon » (JWT)
    }
    return fetch(url, { headers: h }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  /** Chemin de stockage (« produits/uuid.webp ») retrouvé depuis l'adresse publique d'une image */
  function cheminImage(u, bucket) {
    u = String(u || '');
    var marque = '/object/public/' + bucket + '/', i = u.indexOf(marque);
    if (i >= 0) return decodeURIComponent(u.slice(i + marque.length).split('?')[0]);
    var m = /\/([a-z0-9_-]{1,40}\/[0-9a-f-]{36}\.(?:webp|jpe?g|png))(?:\?.*)?$/i.exec(u);   // Neon / Cloudflare R2
    return NEON && m ? m[1] : null;
  }

  // ── Icônes (SVG fixes, écrites ici : jamais construites à partir de données saisies par un utilisateur)
  var ICONES = {
    cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20.5 8H6"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    whatsapp: '<path d="M3 21l1.6-5A9 9 0 1 1 8 19.4L3 21z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.5-2-1-1 .8a3.5 3.5 0 0 1-1.6-1.6l.8-1-1-2z"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    close: '<path d="M5 5l14 14M19 5L5 19"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a3 3 0 0 0 5.3 1.9A3 3 0 0 0 12 12a3 3 0 0 0 2.7-1.1A3 3 0 0 0 20 9M9.5 20v-5h5v5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    up: '<path d="M5 15l7-7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/>',
    logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };

  function icon(nom, taille) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', String(taille || 20));
    s.setAttribute('height', String(taille || 20));
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.innerHTML = ICONES[nom] || '';          // contenu 100 % interne (table ICONES ci-dessus)
    return s;
  }

  /** Crée un élément : el('div', {class:'a', 'data-x':1}, [enfants texte ou nœuds]) */
  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] === false || attrs[k] === null || attrs[k] === undefined) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k] === true ? '' : String(attrs[k]));
    });
    (enfants || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function prix(n) {
    var v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + cfg.devise;
  }

  /** Adresse d'image acceptée : https uniquement */
  function urlImage(u) { u = String(u || '').trim(); return /^https:\/\//i.test(u) ? u : ''; }

  /** Logo de la boutique : le fichier indiqué dans config.js (logo: 'logo/mon-logo.webp') passe en premier ;
      sinon on garde l'ancien réglage de la base (boutique.logo_url) : rien ne casse pour les sites déjà configurés. */
  function logoUrl(b) {
    var l = String(cfg.logo || '').trim();
    if (/^(\.\/)?[A-Za-z0-9_\-][A-Za-z0-9_\-.\/ ]*\.(png|jpe?g|webp|svg|gif|avif)(\?[A-Za-z0-9=._&-]{1,40})?$/i.test(l) && l.indexOf('..') < 0) return l.replace(/ /g, '%20');
    if (/^https:\/\//i.test(l)) return l;
    return urlImage(b && b.logo_url);
  }

  /** Lien de la bande défilante accepté : https://, /chemin, ?requête ou #ancre (jamais javascript:, data:…) */
  function urlLien(u) { u = String(u || '').trim(); return /^(https:\/\/|\/|\?|#)/i.test(u) ? u : ''; }

  function chiffres(t) { return String(t || '').replace(/\D+/g, ''); }

  function nbMots(t) { t = String(t || '').trim(); return t ? t.split(/\s+/).length : 0; }

  /** Couleur principale : applique --brand et dérive une version sombre */
  function appliquerCouleur() {
    var c = /^#[0-9a-f]{6}$/i.test(String(cfg.couleur)) ? cfg.couleur : '#2563eb';
    document.documentElement.style.setProperty('--brand', c);
    appliquerTheme();
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', c);
  }


  /** Personnalisation avancée (config.js) → variables CSS. Toute valeur vide ou invalide est ignorée : le style d'origine reste. */
  function appliquerTheme() {
    var racine = document.documentElement.style;
    var poser = function (nom, v) { if (v !== null && v !== undefined && v !== '') racine.setProperty(nom, v); };
    var couleur = function (v) { v = String(v || '').trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : ''; };
    var nombre = function (v, def, min, max) { v = parseFloat(v); return (v >= min && v <= max) ? v : def; };
    var entier = function (v, def, min, max) { v = parseInt(v, 10); return (v >= min && v <= max) ? v : def; };
    var t = cfg.theme || {}, e = cfg.enteteImage || {};

    // Cadre de l'image d'en-tête
    poser('--hdr-w', entier(e.largeurMax, 1000, 320, 2400) + 'px');
    poser('--hdr-h', entier(e.hauteur, 250, 60, 800) + 'px');
    poser('--hdr-h-m', entier(e.hauteurMobile, 150, 60, 800) + 'px');
    if (/^(center|top|bottom|left|right|[0-9]{1,3}%)( (center|top|bottom|left|right|[0-9]{1,3}%))?$/.test(String(e.positionImage || '').trim()))
      poser('--hdr-pos', String(e.positionImage).trim());
    poser('--hdr-veil', nombre(e.voile, 1, 0, 1));

    // Couleurs de l'en-tête
    poser('--hdr-name-color', couleur(t.couleurNom));
    poser('--hdr-desc-color', couleur(t.couleurDescription));
    poser('--hdr-icons', couleur(t.couleurIcones));
    poser('--hdr-bg', couleur(t.couleurFondEntete));
    if (t.ombreTexteEntete === false) poser('--hdr-shadow', 'none');
    if (t.tailleNom) poser('--hdr-name-size', nombre(t.tailleNom, 1, 0.8, 2.4) + 'rem');
    if (t.tailleDescription) poser('--hdr-desc-size', nombre(t.tailleDescription, 0.8, 0.6, 1.4) + 'rem');

    // Reste du site
    poser('--ticker-bg', couleur(t.couleurBande));
    poser('--ticker-text', couleur(t.couleurTexteBande));
    poser('--deal', couleur(t.couleurPromo));
    poser('--bg', couleur(t.couleurFond));
    poser('--card', couleur(t.couleurCartes));
    poser('--ink', couleur(t.couleurTitres));
    poser('--wa', couleur(t.couleurWhatsApp));
    var rayons = { carre: ['2px', '4px', '6px'], doux: ['10px', '16px', '22px'], rond: ['16px', '26px', '34px'] }[String(t.arrondis || '').toLowerCase()];
    if (rayons) { racine.setProperty('--r-sm', rayons[0]); racine.setProperty('--r-md', rayons[1]); racine.setProperty('--r-lg', rayons[2]); }
    if (/^[\w\s,'"-]{2,160}$/.test(String(t.police || ''))) poser('--font', String(t.police));
  }

  function lire(cle) { try { return JSON.parse(localStorage.getItem(cle)); } catch (e) { return null; } }
  function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage bloqué : sans gravité */ } }
  function effacer(cle) { try { localStorage.removeItem(cle); } catch (e) { /* idem */ } }

  window.NB = {
    cfg: cfg, neon: NEON, api: API, configOk: configOk, lirePublic: lirePublic, cheminImage: cheminImage, icon: icon, el: el, prix: prix, urlImage: urlImage, logoUrl: logoUrl, urlLien: urlLien,
    chiffres: chiffres, nbMots: nbMots, appliquerCouleur: appliquerCouleur, appliquerTheme: appliquerTheme,
    lire: lire, ecrire: ecrire, effacer: effacer,
    $: function (id) { return document.getElementById(id); }
  };
})();
