/* ============================================================================
   config.js — LE SEUL FICHIER À PERSONNALISER pour chaque nouvelle boutique
   (le nom, le logo, la description, le WhatsApp… se règlent ensuite depuis
    l'espace propriétaire « vendeur.html », sans toucher au code).
   ============================================================================ */
window.NB_CONFIG = {

  /* ── 0) BACK-END : SUPABASE (version « Supabase » du projet) ───────────────────────────────────────────── */
  backend: 'supabase',

  /* ── 1) SUPABASE (Supabase > Project Settings > API) ───────────────────────
     • supabaseUrl : « Project URL »            ex. https://abcdefgh.supabase.co
     • supabaseKey : clé PUBLIQUE (« anon » ou « publishable »).
       ⚠️ Ne mettez JAMAIS la clé « service_role » / « secret » ici.            */
  supabaseUrl: 'https://rsezkoimmpjygdxhfihm.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZXprb2ltbXBqeWdkeGhmaWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNTgxNTksImV4cCI6MjExMDkzNDE1OX0.K9RiSB35OxFiwdIed0rDyj8BSxQblCDUHz5ns-kfcr4',

  /* ── 2) CACHE : durée pendant laquelle le navigateur du visiteur réutilise les
        données sans interroger Supabase. Les modifications du propriétaire
        apparaissent donc chez les visiteurs après ce délai (5 à 10 minutes).    */
  cacheMinutes: 5,

  /* ── 3) APPARENCE ───────────────────────────────────────────────────────────  */
  couleur: '#2563eb',        // couleur principale de la boutique (bleu par défaut)
  devise: 'FCFA',            // texte affiché après les prix
  lotAffichage: 12,          // nombre de produits ajoutés à chaque défilement (chargement progressif)
  vitesseBande: 45,          // vitesse de la bande défilante en haut (pixels par seconde)

  /* ── 2 bis) LOGO DU VENDEUR — simple : un fichier dans GitHub ─────────────────────────────────────────────
        1. Dans votre dépôt GitHub, ouvrez le dossier « public » et créez-y un dossier « logo » (s'il n'existe pas).
        2. Déposez l'image dedans : carrée, 256 × 256 px, PNG / WebP / SVG, moins de 100 Ko.   Ex. : public/logo/logo.webp
        3. Écrivez ci-dessous son chemin, SANS « public/ » :       logo: 'logo/logo.webp'
        Le logo apparaît sur le site, dans l'espace vendeur et comme icône d'onglet.
        Vous remplacez l'image sans changer son nom et l'ancienne s'affiche encore ? Ajoutez un numéro : 'logo/logo.webp?v=2'
        '' (vide) = pas de fichier : l'ancien réglage de la base de données (logo_url) est alors utilisé s'il existe. */
  logo: 'logo/logo.jpg',

  /* ── 2 ter) PROTECTION DU CONTENU (site visiteur et espace vendeur) ─────────────────────────────────────────
        true = activé (recommandé) · false = désactivé. Les champs de saisie (formulaires) restent normaux.
        • selectionTexte       : empêche de sélectionner / copier les textes
        • menuContextuel       : bloque le menu d'appui long (Android) et le clic droit
        • telechargementImages : bloque « Télécharger l'image », le glisser-déposer et l'appui long sur les photos
        ⚠️ C'est un frein, pas un coffre-fort : les captures d'écran restent possibles. */
  protection: { selectionTexte: true, menuContextuel: true, telechargementImages: true },

  /* ── 3 bis bis) BOUTONS SUR LA GRILLE ───────────────────────────────────────────────────────────────────
        true  = chaque produit de la grille 2×2 affiche « Commander » et « Ajouter au panier » (recommandé)
        false = grille d'origine (les boutons restent uniquement dans la fiche du produit)                        */
  boutonsGrille: true,

  /* ── 3 ter) EN-TÊTE AVEC IMAGE : conteneur à dimensions fixes (en pixels) ───────────────────────────────
        L'image de l'en-tête ne dépasse JAMAIS ces dimensions : elle est centrée et recadrée dans ce cadre.
        • largeurMax     : largeur maximale du cadre (ordinateur/tablette). Au-delà, des bandes de couleur l'entourent.
        • hauteur        : hauteur du cadre sur tablette et ordinateur (≥ 700 px d'écran).
        • hauteurMobile  : hauteur du cadre sur téléphone.
        • positionImage  : partie de l'image qu'on garde quand elle est recadrée : 'center' (défaut), 'top', 'bottom',
                           'left', 'right' ou un pourcentage ex. 'center 30%'.
        • voile          : voile sombre derrière les textes, de 0 (aucun) à 1 (normal). Mettez 0 avec une image claire
                           et un texte foncé (voir « theme » ci-dessous).
        Sécurité : la hauteur ne dépasse jamais 2/7 de la hauteur de l'écran (téléphone tenu en paysage, par exemple). */
  enteteImage: { largeurMax: 1000, hauteur: 250, hauteurMobile: 150, positionImage: 'center', voile: 1 },

  /* ── 3 quater) THÈME : personnalisation fine pour chaque vendeur ─────────────────────────────────────────
        TOUT est facultatif : laissez '' (ou supprimez la ligne) pour garder le style d'origine.
        Les couleurs s'écrivent en hexadécimal : '#fff', '#ffffff', '#1e293b'. Une valeur invalide est ignorée.

        EN-TÊTE
        • couleurNom         : couleur du NOM de la boutique                         ex. '#ffffff'
        • couleurDescription : couleur de la petite description sous le nom          ex. '#fde68a'
        • couleurIcones      : couleur des icônes du panier (TikTok/Facebook gardent leurs couleurs)
        • couleurFondEntete  : couleur UNIE de l'en-tête (remplace le dégradé de couleurPrincipale)
        • tailleNom          : taille du nom, en rem (0.8 à 2.4)   — 1 = normal, 1.3 = plus grand
        • tailleDescription  : taille de la description, en rem (0.6 à 1.4)
        • ombreTexteEntete   : false = supprime l'ombre derrière les textes de l'en-tête (utile si texte foncé)

        RESTE DU SITE
        • couleurBande / couleurTexteBande : fond et texte de la bande défilante (annonces)
        • couleurPromo       : couleur des prix barrés, étiquettes « -20 % », badge du panier
        • couleurFond        : fond des pages          • couleurCartes : fond des cartes produits
        • couleurTitres      : couleur des titres et noms de produits
        • couleurWhatsApp    : couleur des boutons WhatsApp
        • arrondis           : forme des coins : 'carre' | 'doux' (défaut) | 'rond'
        • police             : police du site, ex. "Georgia, serif" ou "'Trebuchet MS', sans-serif"
                               (polices déjà présentes sur l'appareil ; une police Google Fonts doit d'abord être ajoutée
                               dans <head> de index.html).

        EXEMPLE — image d'en-tête claire avec texte foncé :
          enteteImage: { …, voile: 0 },
          theme: { couleurNom: '#0f172a', couleurDescription: '#334155', couleurIcones: '#0f172a', ombreTexteEntete: false }   */
  theme: {
    couleurNom: '',
    couleurDescription: '',
    couleurIcones: '',
    couleurFondEntete: '',
    tailleNom: '',
    tailleDescription: '',
    ombreTexteEntete: true,
    couleurBande: '',
    couleurTexteBande: '',
    couleurPromo: '',
    couleurFond: '',
    couleurCartes: '',
    couleurTitres: '',
    couleurWhatsApp: '',
    arrondis: 'doux',
    police: ''
  },

  /* ── 3 bis) WHATSAPP DU DÉVELOPPEUR (boutons « Notifiez-nous » / « Contactez-nous » de l'espace propriétaire)
        Format international sans + ni espaces, ex. '22961000000'. Laissez '' pour masquer la barre.      */
  whatsappSupport: '22961196907',

  /* ── 4) RÉGLAGES AVANCÉS ────────────────────────────────────────────────────  */
  cleCache: 'nb_cache_v1',   // nom de la mémoire du navigateur (changez-le pour forcer une mise à jour chez tous)
  cleePanier: 'nb_panier_v1'
};
