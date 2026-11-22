/* ============================================================================
   vendeur-header.js — EN-TÊTE DE LA BOUTIQUE (chargé APRÈS vendeur.js, qu'il ne modifie pas)
   • Image de fond de l'en-tête fixe du site (occupe 2/7 de la hauteur de l'écran) — dossier de stockage « header/ ».
   • Petite description (≤ 90 caractères) affichée sous le nom de la boutique.
   Passe par le même client (NB.sb) et la même compression (NB.compresserImage) que le reste de l'espace vendeur.
   Colonnes : boutique.header_image_url, boutique.description_courte (modifiables par le propriétaire uniquement).
   ============================================================================ */
(function () {
  'use strict';
  var NB = window.NB; if (!NB) return;
  var cfg = NB.cfg, $ = NB.$, BUCKET = 'boutique-images', DOSSIER = 'header', MAX = 90;
  var H = { charge: false, chargement: false, url: null, nouveau: null, retire: false };

  function sb() { return NB.sb || null; }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function octets(n) { return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko'; }
  function erreur(id, msg) { var e = $(id); if (!e) return; e.textContent = msg || ''; e.classList.toggle('hidden', !msg); }
  function toast(msg) { var t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 3000); }
  function occupe(btn, oui) {
    if (oui) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enregistrement…'; }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }
  function messageErreur(e) {
    var m = String((e && e.message) || e || 'Erreur inconnue');
    if (/column .*does not exist|42703|schema cache/i.test(m)) return 'Base à mettre à jour : exécutez SQL/5-header-personnalise.sql dans Supabase (SQL Editor), puis rechargez.';
    if (/permission denied|42501|PGRST116/i.test(m)) return 'Accès refusé : reconnectez-vous avec le compte propriétaire.';
    if (/check constraint|violates check/i.test(m)) return 'Une valeur est refusée par la base (texte trop long ou lien invalide).';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
    if (/too large|trop lourde/i.test(m)) return 'Image trop lourde.';
    return m;
  }

  function dessinerImage(dimensions) {
    var src = H.nouveau ? H.nouveau.apercu : (H.retire ? '' : NB.urlImage(H.url)), z = $('h-zone');
    z.textContent = ''; z.classList.toggle('filled', !!src);
    if (src) { var i = document.createElement('img'); i.src = src; i.alt = 'Aperçu de l’image de l’en-tête'; z.appendChild(i); }
    else { var ic = document.createElement('i'); ic.className = 'fas fa-image'; z.appendChild(ic); }
    $('h-choose').innerHTML = '<i class="fas fa-camera"></i> ' + (src ? 'Changer l’image' : 'Choisir une image');
    $('h-remove').hidden = !src;
    var t = H.nouveau
      ? 'Image prête : ' + (H.nouveau.compresse ? octets(H.nouveau.origine) + ' → ' + octets(H.nouveau.taille) : octets(H.nouveau.taille) + ' (déjà légère, inchangée)')
      : (src ? 'Image actuelle.' : 'Pas d’image pour le moment : l’en-tête reste simple.');
    if (dimensions) t += ' — ' + dimensions;
    $('h-info').textContent = t;
  }

  function choisir(fichier) {
    erreur('header-error', '');
    NB.compresserImage(fichier).then(function (r) {
      if (H.nouveau && H.nouveau.apercu) URL.revokeObjectURL(H.nouveau.apercu);
      r.apercu = URL.createObjectURL(r.blob); H.nouveau = r; H.retire = false;
      var probe = new Image();
      probe.onload = function () {
        var w = probe.naturalWidth, h = probe.naturalHeight, ratio = w / h, avis = '';
        if (w < 1000 || ratio < 2.5 || ratio > 5.5) avis = ' ⚠️ ' + w + '×' + h + ' px : idéal 1600×400 (4:1) pour un rendu net sur tous les écrans.';
        else avis = w + '×' + h + ' px ✓';
        dessinerImage(avis);
      };
      probe.onerror = function () { dessinerImage(''); };
      probe.src = r.apercu; dessinerImage('');
    }).catch(function (e) { erreur('header-error', messageErreur(e)); });
  }

  function charger() {
    var c = sb(); if (!c) return Promise.resolve();
    return c.from('boutique').select('description_courte,header_image_url').eq('id', 1).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      var b = r.data || {};
      H.url = b.header_image_url || null; H.nouveau = null; H.retire = false;
      $('h-desc').value = b.description_courte || ''; $('h-count').textContent = $('h-desc').value.length;
      dessinerImage(''); erreur('header-setup', '');
    });
  }

  function enregistrer() {
    erreur('header-error', '');
    var court = $('h-desc').value.trim(), btn = $('btn-header-save');
    if (court.length > MAX) return erreur('header-error', 'La petite description fait ' + MAX + ' caractères maximum.');
    occupe(btn, true);
    var nouvelle = null, ancienne = H.url, urlFinale = H.retire ? null : (H.url || null);
    var etape = H.nouveau ? sb().storage.from(BUCKET).upload(DOSSIER + '/' + uuid() + '.' + H.nouveau.ext, H.nouveau.blob, { contentType: H.nouveau.type, cacheControl: '31536000', upsert: false })
      .then(function (r) {
        if (r.error) throw r.error;
        var chemin = r.data && r.data.path;
        nouvelle = sb().storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl; urlFinale = nouvelle;
      }) : Promise.resolve();
    etape.then(function () {
      return sb().from('boutique').update({ description_courte: court, header_image_url: urlFinale }).eq('id', 1).select().single();
    }).then(function (r) {
      if (r.error) throw r.error;
      var vieux = (H.nouveau || H.retire) && ancienne ? NB.cheminImage(ancienne, BUCKET) : null;
      NB.effacer(cfg.cleCache);
      return (vieux ? sb().storage.from(BUCKET).remove([vieux]).catch(function () { }) : Promise.resolve()).then(function () { return charger(); });
    }).then(function () {
      toast('En-tête enregistré ✓ Visible sur le site d’ici ' + cfg.cacheMinutes + ' min environ.');
    }).catch(function (e) {
      var chemin = nouvelle && NB.cheminImage(nouvelle, BUCKET);
      if (chemin) sb().storage.from(BUCKET).remove([chemin]).catch(function () { });   // image envoyée pour rien : on la retire
      erreur('header-error', 'Échec : ' + messageErreur(e));
    }).then(function () { occupe(btn, false); });
  }

  function surChangementVue() {
    var dash = $('view-dashboard'), visible = !!dash && !dash.classList.contains('hidden');
    if (!visible) { H.charge = false; return; }
    if (H.charge || H.chargement || !sb()) return;
    H.chargement = true;
    charger().then(function () { H.charge = true; }).catch(function (e) { erreur('header-setup', messageErreur(e)); }).then(function () { H.chargement = false; });
  }

  function init() {
    if (!$('view-dashboard') || !$('header-card')) return;
    $('h-choose').onclick = function () { $('h-file').click(); };
    $('h-file').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; if (f) choisir(f); e.target.value = ''; });
    $('h-remove').onclick = function () { if (H.nouveau && H.nouveau.apercu) URL.revokeObjectURL(H.nouveau.apercu); H.nouveau = null; H.retire = true; dessinerImage(''); };
    $('h-desc').addEventListener('input', function () { $('h-count').textContent = this.value.length; });
    $('btn-header-save').onclick = enregistrer;
    if ('MutationObserver' in window) new MutationObserver(surChangementVue).observe($('view-dashboard'), { attributes: true, attributeFilter: ['class'] });
    surChangementVue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
