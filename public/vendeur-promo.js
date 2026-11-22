/* ============================================================================
   vendeur-promo.js — AJOUTS de l'espace vendeur (chargé APRÈS vendeur.js, qu'il ne modifie pas)
   ----------------------------------------------------------------------------
   1. BANNIÈRE PROMO : interrupteur ON/OFF + 3 diapositives (image, titre, texte) éditables.
      • Les images passent par la même compression que les photos produits (NB.compresserImage, exposée par vendeur.js) :
        ≤ 120 Ko → envoyées telles quelles ; sinon WebP ≤ 130 Ko. Stockage : bucket « boutique-images », dossier « promo/ ».
      • Enregistrement : envoi des nouvelles images → mise à jour des 3 lignes de « promo_slides » → interrupteur (boutique.promo_actif)
        → suppression des anciennes images remplacées/retirées. En cas d'échec, les images envoyées pour rien sont effacées.
   2. RÉSEAUX SOCIAUX : liens TikTok et Facebook (boutique.tiktok_url / facebook_url). Le vendeur peut écrire « @pseudo »
      ou coller l'adresse complète ; le lien est normalisé en https:// et contrôlé (bon réseau, sans espace).
   • Client Supabase : celui de vendeur.js (NB.sb) → même session, mêmes droits. La vraie protection est côté base (RLS) :
     seul le Gmail du propriétaire peut écrire, quoi que fasse cette page.
   • Les sections se chargent quand le tableau de bord devient visible (après vérification du propriétaire).
   • Tout texte saisi est affiché via textContent / value : aucune injection HTML possible.
   ============================================================================ */
(function () {
  'use strict';

  var NB = window.NB;
  if (!NB) return;
  var cfg = NB.cfg, $ = NB.$;

  var BUCKET = 'boutique-images';
  var DOSSIER = 'promo';
  var NB_DIAPOS = 3;
  var MAX_TITRE = 60, MAX_TEXTE = 140;                 // doivent rester identiques aux contrôles du SQL (promo_slides)
  var CLE_CACHE = cfg.cleCache + '_promo';             // ⚠️ même expression que promo.js : permet d'invalider le cache visiteur

  var P = { charge: false, chargement: false, diapos: [], cartes: [] };

  /* ───────────────────────────── Utilitaires (mêmes comportements que vendeur.js) ───────────────────────────── */
  function sb() { return NB.sb || null; }
  function creer(tag, attrs, enfants) { return NB.el(tag, attrs, enfants); }
  var timerToast = null;
  function toast(msg) { var t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(timerToast); timerToast = setTimeout(function () { t.classList.remove('show'); }, 3200); }
  function occupe(msg) { var b = $('busy'); if (!b) return; if (msg) { $('busy-msg').textContent = msg; b.classList.remove('hidden'); } else b.classList.add('hidden'); }
  function erreur(id, msg) { var e = $(id); if (!e) return; e.textContent = msg || ''; e.classList.toggle('hidden', !msg); }
  function occupeBtn(btn, oui, msg) {
    if (!btn) return;
    if (oui) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>' + (msg || 'Patientez…'); }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function octets(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko'; }
  function invaliderCache() { NB.effacer(CLE_CACHE); }

  var MSG_SQL = 'La base de données n’est pas à jour : exécutez le fichier SQL/4-promo-reseaux.sql dans Supabase (SQL Editor), puis rechargez cette page.';
  function messageErreur(e) {
    var m = String((e && (e.message || e.error_description)) || e || 'Erreur inconnue');
    if (/PGRST20[45]|42P01|42703|does not exist|Could not find (the )?(table|column)|schema cache/i.test(m)) return MSG_SQL;
    if (/row-level security|violates row|permission denied|PGRST116|42501/i.test(m)) return 'Accès refusé : reconnectez-vous avec le compte propriétaire.';
    if (/check constraint|violates check/i.test(m)) return 'Une valeur est refusée par la base (texte trop long ou lien invalide).';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
    if (/Payload too large|exceeded the maximum|too large/i.test(m)) return 'Image trop lourde.';
    return m;
  }
  function afficherSetup(msg) {
    ['promo-setup', 'social-setup'].forEach(function (id) { erreur(id, msg); });
    var bloque = !!msg;
    ['btn-promo-save', 'btn-social-save'].forEach(function (id) { var b = $(id); if (b) b.disabled = bloque; });
  }

  /* ───────────────────────────── Stockage des images ───────────────────────────── */
  function envoyer(photo) {
    var chemin = DOSSIER + '/' + uuid() + '.' + photo.ext;
    return sb().storage.from(BUCKET).upload(chemin, photo.blob, { contentType: photo.type, cacheControl: '31536000', upsert: false }).then(function (r) {
      if (r.error) throw r.error;
      return { url: sb().storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl };
    });
  }
  function cheminDepuisUrl(u) { return NB.cheminImage(u, BUCKET); }
  function supprimerFichiers(urls) {
    var chemins = (urls || []).map(cheminDepuisUrl).filter(Boolean);
    if (!chemins.length) return Promise.resolve();
    return sb().storage.from(BUCKET).remove(chemins).then(function () { /* nettoyage : l'échec n'est pas bloquant */ }, function () { });
  }

  /* ───────────────────────────── 1) BANNIÈRE : éditeur des 3 diapositives ───────────────────────────── */
  function libererApercu(s) { if (s.nouveau && s.nouveau.apercu) { try { URL.revokeObjectURL(s.nouveau.apercu); } catch (e) { /* sans gravité */ } } }

  /** Met à jour l'aperçu de l'image d'une diapositive + libellés des boutons */
  function majImage(i) {
    var s = P.diapos[i], c = P.cartes[i];
    var src = s.nouveau ? s.nouveau.apercu : (s.retire ? '' : NB.urlImage(s.image_url));
    c.zone.textContent = ''; c.zone.classList.toggle('filled', !!src);
    c.zone.appendChild(src ? creer('img', { src: src, alt: 'Image de la diapositive ' + (i + 1) }) : creer('i', { 'class': 'fas fa-image' }));
    c.choisir.innerHTML = '<i class="fas fa-camera"></i> ' + (src ? 'Changer l’image' : 'Choisir une image');
    c.retirer.hidden = !src;
    c.info.textContent = s.nouveau
      ? (s.nouveau.compresse ? 'Image prête : ' + octets(s.nouveau.origine) + ' → ' + octets(s.nouveau.taille) : 'Image prête : ' + octets(s.nouveau.taille) + ' (déjà légère, inchangée)')
      : (src ? 'Image actuelle.' : 'Pas d’image : le texte occupera toute la largeur.');
  }

  function majCompteur(i) {
    var s = P.diapos[i], c = P.cartes[i];
    c.cptTitre.textContent = s.titre.length + ' / ' + MAX_TITRE;
    c.cptTexte.textContent = s.texte.length + ' / ' + MAX_TEXTE;
  }

  /** Construit la carte d'édition d'une diapositive (une seule fois par chargement) */
  function construireCarte(i) {
    var s = P.diapos[i];
    var fichier = creer('input', { type: 'file', accept: 'image/*', hidden: true });
    var zone = creer('div', { 'class': 'promo-ed-img' });
    var choisir = creer('button', { type: 'button', 'class': 'prod-act prod-edit' });
    var retirer = creer('button', { type: 'button', 'class': 'prod-act prod-del' });
    retirer.innerHTML = '<i class="fas fa-trash"></i> Retirer';
    var info = creer('p', { 'class': 'text-xs text-slate-500 mt-2' });

    var cptTitre = creer('span', { 'class': 'font-normal text-slate-400' });
    var cptTexte = creer('span', { 'class': 'font-normal text-slate-400' });
    var titre = creer('input', { 'class': 'field', type: 'text', maxlength: MAX_TITRE, placeholder: 'Ex : -30 % sur les montres', autocomplete: 'off' });
    var texte = creer('textarea', { 'class': 'field', rows: 3, maxlength: MAX_TEXTE, placeholder: 'Ex : Livraison offerte jusqu’à dimanche. Paiement à la livraison.' });
    titre.value = s.titre; texte.value = s.texte;

    var carte = creer('article', { 'class': 'promo-ed' }, [
      creer('h4', { 'class': 'font-extrabold text-brand-navy mb-3', text: 'Diapositive ' + (i + 1) + ' sur ' + NB_DIAPOS }),
      creer('div', { 'class': 'flex gap-3 items-start' }, [
        zone,
        creer('div', { 'class': 'min-w-0 flex-1' }, [creer('div', { 'class': 'flex flex-wrap gap-2' }, [choisir, retirer]), info])
      ]),
      creer('div', { 'class': 'mt-3' }, [
        creer('label', { 'class': 'field-label' }, ['Titre ', cptTitre, titre]),
      ]),
      creer('div', { 'class': 'mt-3' }, [
        creer('label', { 'class': 'field-label' }, ['Texte descriptif ', cptTexte, texte])
      ]),
      fichier
    ]);

    P.cartes[i] = { carte: carte, zone: zone, choisir: choisir, retirer: retirer, info: info, cptTitre: cptTitre, cptTexte: cptTexte };

    // Saisie : on recopie dans l'état (les compteurs se mettent à jour)
    titre.addEventListener('input', function () { s.titre = titre.value; majCompteur(i); });
    texte.addEventListener('input', function () { s.texte = texte.value; majCompteur(i); });

    // Choix d'une image : compression puis aperçu
    choisir.onclick = function () { fichier.click(); };
    fichier.addEventListener('change', function () {
      var f = fichier.files && fichier.files[0]; fichier.value = '';
      if (!f) return;
      if (!NB.compresserImage) { erreur('promo-error', 'Outil de compression indisponible : rechargez la page.'); return; }
      erreur('promo-error', ''); occupe('Optimisation de l’image…');
      NB.compresserImage(f).then(function (r) {
        libererApercu(s);
        s.nouveau = { blob: r.blob, type: r.type, ext: r.ext, apercu: URL.createObjectURL(r.blob), taille: r.taille, origine: r.origine, compresse: r.compresse };
        s.retire = false; majImage(i);
      }).catch(function (e) { erreur('promo-error', (e && e.message) || 'Image illisible.'); })
        .then(function () { occupe(false); });
    });
    // Retirer : la diapositive n'aura plus d'image à l'enregistrement
    retirer.onclick = function () { libererApercu(s); s.nouveau = null; s.retire = true; majImage(i); };

    majImage(i); majCompteur(i);
    return carte;
  }

  function dessinerDiapos() {
    var boite = $('promo-slides'); boite.textContent = ''; P.cartes = [];
    for (var i = 0; i < NB_DIAPOS; i++) boite.appendChild(construireCarte(i));
  }

  function enregistrerBanniere() {
    erreur('promo-error', '');
    var actif = $('promo-actif').checked, btn = $('btn-promo-save');
    var rempli = P.diapos.some(function (s) { return (s.nouveau || (!s.retire && s.image_url)) || s.titre.trim() || s.texte.trim(); });
    if (actif && !rempli) return erreur('promo-error', 'Ajoutez une image, un titre ou un texte à au moins une diapositive, ou désactivez la bannière.');

    var envoyes = [], aSupprimer = [], lignes = [], etape = 0;      // etape 0 = rien d'écrit en base ; 1 = diapositives enregistrées
    occupeBtn(btn, true, 'Enregistrement…'); occupe('Enregistrement de la bannière…');

    // 1) envoi des NOUVELLES images (dans l'ordre) ; les images déjà en ligne sont conservées
    P.diapos.reduce(function (chaine, s) {
      return chaine.then(function () {
        var ligne = { rang: s.rang, titre: s.titre.trim(), texte: s.texte.trim(), image_url: s.retire ? null : (s.image_url || null) };
        if (s.retire && s.image_url) aSupprimer.push(s.image_url);
        if (!s.nouveau) { lignes.push(ligne); return; }
        return envoyer(s.nouveau).then(function (r) {
          envoyes.push(r.url); if (s.image_url) aSupprimer.push(s.image_url);
          ligne.image_url = r.url; lignes.push(ligne);
        });
      });
    }, Promise.resolve())
      // 2) les 3 diapositives (upsert sur « rang »)
      .then(function () { return sb().from('promo_slides').upsert(lignes, { onConflict: 'rang' }).select(); })
      .then(function (r) { if (r.error) throw r.error; etape = 1; })
      // 3) l'interrupteur ON/OFF
      .then(function () { return sb().from('boutique').update({ promo_actif: actif }).eq('id', 1).select().single(); })
      .then(function (r) { if (r.error) throw r.error; return supprimerFichiers(aSupprimer); })      // 4) nettoyage des anciennes images
      .then(function () { invaliderCache(); return charger(); })
      .then(function () { toast(actif ? 'Bannière enregistrée ✓ Visible sur le site d’ici ' + cfg.cacheMinutes + ' min environ.' : 'Bannière enregistrée ✓ (désactivée : elle n’apparaît pas sur le site).'); })
      .catch(function (e) {
        // échec avant l'écriture en base : on retire les images envoyées pour rien
        return (etape === 0 ? supprimerFichiers(envoyes) : Promise.resolve()).then(function () { erreur('promo-error', 'Échec : ' + messageErreur(e)); });
      })
      .then(function () { occupe(false); occupeBtn(btn, false); });
  }

  /* ───────────────────────────── 2) RÉSEAUX SOCIAUX ───────────────────────────── */
  var RESEAUX = {
    tiktok:   { nom: 'TikTok',   base: 'https://www.tiktok.com/@', domaine: /(^|\.)tiktok\.com$/i,                          hote: /^(www\.|m\.|vm\.|vt\.)?tiktok\.com/i,                      exemple: '@monpseudo ou https://www.tiktok.com/@monpseudo' },
    facebook: { nom: 'Facebook', base: 'https://www.facebook.com/', domaine: /(^|\.)(facebook\.com|fb\.com|fb\.me|fb\.watch)$/i, hote: /^(www\.|m\.|web\.|business\.)?(facebook\.com|fb\.com|fb\.me|fb\.watch)/i, exemple: 'nom-de-ma-page ou https://www.facebook.com/nom-de-ma-page' }
  };

  /**
   * Transforme ce que saisit le vendeur en lien https:// valide.
   * Retourne { ok: true, valeur: 'https://…' | null (champ vide) } ou { ok: false, message }.
   */
  function normaliserLien(reseau, brut) {
    var r = RESEAUX[reseau], v = String(brut || '').trim();
    if (!v) return { ok: true, valeur: null };
    var invalide = { ok: false, message: 'Lien ' + r.nom + ' invalide. Écrivez par exemple : ' + r.exemple + '.' };
    if (/\s/.test(v)) return invalide;

    var url;
    if (/^https?:\/\//i.test(v)) url = 'https://' + v.replace(/^https?:\/\//i, '');         // http:// est converti en https://
    else if (v.indexOf('/') >= 0 || r.hote.test(v)) url = 'https://' + v;                     // « facebook.com/ma-page » sans https://
    else {                                                                                     // simple pseudo
      var pseudo = v.replace(/^@/, '');
      if (!/^[A-Za-z0-9._-]{2,60}$/.test(pseudo)) return invalide;
      url = r.base + pseudo;
    }
    var u;
    try { u = new URL(url); } catch (e) { return invalide; }
    if (u.protocol !== 'https:' || !r.domaine.test(u.hostname)) return { ok: false, message: 'Ce lien ne semble pas être un lien ' + r.nom + '. Exemple : ' + r.exemple + '.' };
    if (url.length > 300) return { ok: false, message: 'Lien ' + r.nom + ' trop long (300 caractères maximum).' };
    return { ok: true, valeur: url };
  }

  function enregistrerReseaux() {
    erreur('social-error', '');
    var tt = normaliserLien('tiktok', $('s-tiktok').value), fb = normaliserLien('facebook', $('s-facebook').value);
    if (!tt.ok) return erreur('social-error', tt.message);
    if (!fb.ok) return erreur('social-error', fb.message);
    var btn = $('btn-social-save'); occupeBtn(btn, true, 'Enregistrement…');
    sb().from('boutique').update({ tiktok_url: tt.valeur, facebook_url: fb.valeur }).eq('id', 1).select().single()
      .then(function (r) { if (r.error) throw r.error; invaliderCache(); $('s-tiktok').value = tt.valeur || ''; $('s-facebook').value = fb.valeur || ''; })
      .then(function () { toast('Liens enregistrés ✓ Visibles sur le site d’ici ' + cfg.cacheMinutes + ' min environ.'); })
      .catch(function (e) { erreur('social-error', 'Échec : ' + messageErreur(e)); })
      .then(function () { occupeBtn(btn, false); });
  }

  /* ───────────────────────────── Chargement ───────────────────────────── */
  function charger() {
    var c = sb(); if (!c) return Promise.resolve();
    return Promise.all([
      c.from('boutique').select('tiktok_url,facebook_url,promo_actif').eq('id', 1).maybeSingle(),
      c.from('promo_slides').select('rang,titre,texte,image_url').order('rang', { ascending: true })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      if (r[1].error) throw r[1].error;
      var b = r[0].data || {}, lignes = r[1].data || [];
      P.diapos.forEach(libererApercu);
      P.diapos = [];
      for (var i = 1; i <= NB_DIAPOS; i++) {
        var l = lignes.filter(function (x) { return x.rang === i; })[0] || {};
        P.diapos.push({ rang: i, titre: l.titre || '', texte: l.texte || '', image_url: l.image_url || null, nouveau: null, retire: false });
      }
      $('promo-actif').checked = b.promo_actif === true;
      $('s-tiktok').value = b.tiktok_url || '';
      $('s-facebook').value = b.facebook_url || '';
      dessinerDiapos();
      afficherSetup('');
    });
  }

  /** Charge une fois par connexion, dès que le tableau de bord est affiché (propriétaire vérifié). */
  function surChangementVue() {
    var dash = $('view-dashboard');
    var visible = !!dash && !dash.classList.contains('hidden');
    if (!visible) { P.charge = false; return; }                         // déconnexion : on rechargera à la prochaine connexion
    if (P.charge || P.chargement || !sb()) return;
    P.chargement = true;
    charger().then(function () { P.charge = true; })
      .catch(function (e) { afficherSetup(messageErreur(e)); })
      .then(function () { P.chargement = false; });
  }

  function init() {
    if (!$('view-dashboard') || !$('promo-slides')) return;             // vendeur.html sans les nouvelles sections : rien à faire
    $('btn-promo-save').onclick = enregistrerBanniere;
    $('btn-social-save').onclick = enregistrerReseaux;
    if ('MutationObserver' in window) new MutationObserver(surChangementVue).observe($('view-dashboard'), { attributes: true, attributeFilter: ['class'] });
    surChangementVue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
