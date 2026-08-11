# État du projet — où on en est

Fichier de reprise. À lire en premier au début d'une nouvelle session.

Site : iamlearningarabic.com · Vercel + Supabase + Stripe + Brevo

Deux fichiers, désormais :

| Fichier | Qui le reçoit | Contenu |
|---|---|---|
| `public/index.html` (211 Ko) | tout le monde | vente, connexion, inscription, paiement |
| `app/app.html` (907 Ko) | **comptes payants seulement**, via `api/app.js` | toute l'application |

Après CHAQUE modification de `app/app.html` ou de `public/index.html` :
incrémenter la version dans `public/sw.js`, committer, pousser. Vercel
déploie tout seul.

---

## Vérifié en ligne le 11 août 2026

Déployé et essayé sur le site réel : `app/app.html` arrive bien dans la
fonction (`includeFiles`), le cookie `arab_token` est accepté en HTTPS, la
connexion et les leçons marchent, et `/fille` sans compte renvoie à la page
de connexion. La séparation tient.

Reste à essayer une fois : le tunnel d'achat complet (paiement Stripe →
création du mot de passe → première connexion).

---

## FAIT — Chantier 1 : protéger le contenu payant

Le problème d'origine : `public/index.html` était servi à tout visiteur, et la
page de connexion ne faisait que masquer des écrans une fois le contenu déjà
livré. N'importe qui lisait les cours dans le code source.

| Étape | État |
|---|---|
| 1. Sortir les 24 images base64 en fichiers | **fait** |
| 2. `api/app.js` : point d'entrée protégé (jeton + compte payant) | **fait** |
| 3. Séparer la page publique de l'application | **fait, branché** |

### Comment ça marche maintenant

- `public/index.html` : la page de vente et ses écrans (connexion,
  inscription, paiement, nouveau mot de passe). Elle ne contient plus une
  ligne de cours — seulement 36 clés de traduction, celles de ces écrans.
- `app/app.html` : l'application entière. Le dossier `app/` n'est pas servi en
  statique : `/app.html` répond 404.
- `api/app.js` : vérifie le jeton signé **et** que le compte est toujours
  `paid` en base, puis renvoie `app/app.html`. Une navigation sans droits est
  redirigée (302) vers `/connexion` ; un appel XHR reçoit 401 ou 403.
- Le jeton voyage dans le cookie `arab_token` (24 h) : une navigation
  ordinaire ne peut pas porter d'en-tête `Authorization`. Il est posé à la
  connexion, effacé à la déconnexion.
- `vercel.json` : `/`, `/connexion`, `/inscription`, `/paiement`, `/accueil`
  → page publique. `/app`, `/interface`, `/fille`, `/garcon`, `/adulte`,
  `/girl`, `/boy`, `/adult`, `/cours/*`, `/admin/*` → `api/app.js`.
- Déconnexion : cookie effacé **et** cache hors ligne vidé, sinon les pages de
  l'application resteraient lisibles sur l'appareil après la déconnexion.

### Ce qui reste public, sciemment

Les 51 images de `public/images/` (mascottes, îles) et les feuilles de style.
Aucune n'est le cours ; les déplacer demanderait de servir chaque image par
une fonction.

### Le plan précédent était faux, ne pas y revenir

L'ancien ETAT.md proposait de sortir `LS`/`SP`/`SV`/`T` vers une API de
contenu, en estimant ces blocs à 485 Ko. Mesuré : `T` = 208 Ko (surtout de la
duplication entre 13 langues), les données des lettres = 14 Ko,
`CHILD_LETTERS` = 3 Ko. Les 695 Ko restants — l'essentiel du cours — sont
**dans le code** : scènes narrées fille et garçon, rendu des leçons adultes,
exercices. Extraire les données n'aurait protégé qu'un quart du fichier.

---

## À FAIRE ENSUITE

### Chantier 2 — Traductions : tout, partout
Décision du client : **tout doit être traduit dans les 13 langues**.
- L'interface adulte est à 95–98 % (audit fait, trous comblés).
- **L'interface enfant (fille et garçon) est 100 % en français codé en dur** :
  ~86 phrases narrées + les libellés, aucun appel à `t()`, et la narration
  est forcée en `fr-FR`.
- Corpus mesuré : ~95 phrases par langue, ~4 800 caractères, ~62 000 pour
  les 13 langues.
- À faire avant les enregistrements audio, sinon la génération est à refaire.

### Chantier 3 — Voix naturelles
- Arabe **et français** : la voix du client, avec son micro, via le studio
  d'enregistrement (panneau admin, 370 entrées).
- Les 12 autres langues : **Azure Speech** (compte créé, 200 USD de crédits).
  Générer les fichiers une fois par script, les déposer dans Supabase
  Storage, le site les jouera comme les enregistrements.
- Prérequis technique : la recherche d'enregistrement est réservée à l'arabe
  dans `speak()`, et la clé ne contient pas la langue. À lever avant de
  générer quoi que ce soit.

### Chantier 4 — Vraies pages séparées
La séparation est faite côté serveur ; il reste à étoffer la page publique :
accueil, tarifs, contact, mentions légales en vraies pages avec menu, pied de
page et URL propres, indexables. Elles se rangent à côté de
`public/index.html` et ne touchent plus à l'application.

---

## Fait récemment (ne pas refaire)

- Séparation page publique / application (chantier 1 ci-dessus).
- **Reprise** : l'écran courant est gardé dans `localStorage.arab_reprise`
  (page, leçon adulte et lettre affichée, ou cours enfant et numéro de
  scène) ; `tryAutoLogin` le rejoue. L'adresse, elle, ne descend pas plus bas
  que l'île — c'est pourquoi un rechargement retombait sur la carte.
  Trois points de vigilance : `chooseProfile` affiche le menu et note donc un
  écran, il faut lire l'état **avant** de l'appeler ; une adresse qui désigne
  une île précise (`/fille/lecon/arche-nouh`) passe devant la reprise ; la
  déconnexion efface l'état, pour qu'un élève ne reprenne pas celui d'un
  autre. La reprise ne s'applique qu'au rechargement d'une adresse de
  l'application, pas après le choix du profil : celui-ci mène toujours au
  menu.
- `verifyToken` : un jeton bricolé à la main faisait tomber la fonction en
  erreur 500 (`timingSafeEqual` exige deux tampons de même longueur). Refus
  propre désormais.
- `public/connexion.html` et `public/inscription.html` supprimées : pages
  autonomes datées du 27 mai, du temps du tunnel Stripe séparé, que plus rien
  ne référençait. L'historique git les garde si besoin.
- Interface fille : cours voyelles / prolongations / lettres au format scènes
  narrées (`_kidScene`), une idée par écran, tracé de chaque forme.
- Interface garçon : conception distincte « missions spatiales »
  (`_boyScene`) — hublot, piste d'atterrissage reprenant la ligne d'écriture
  du cours adulte, jauge de décollage, tableau des positions avec code
  couleur, déblocage séquentiel des lettres.
- Studio d'enregistrement : 370 entrées, dont les 30 mots illustrés et les
  7 voyelles seules qui manquaient.
- Bucket Supabase `audio` créé (public). **Aucun son encore enregistré.**
- Ping quotidien `api/keepalive.js` + cron dans `vercel.json` : empêche la
  mise en pause de Supabase.
- Cache : mise à jour visible en un seul rechargement
  (`updateViaCache:'none'`, `reg.update()`, rechargement sur
  `controllerchange`).

## Pièges connus

- Les projets Supabase gratuits se mettent en pause après ~7 jours sans
  activité. Le cron s'en charge désormais.
- `Authentication → Users` dans Supabase n'est **pas** utilisé par le site :
  l'app lit la table `public.users`. Ne pas réactiver le RLS.
- Le cercle pointillé `◌` sert de support d'affichage aux voyelles seules et
  de clé d'enregistrement. Ne pas le filtrer comme un emoji.
- Écrire dans `app/app.html` : toujours en écriture atomique (fichier
  temporaire puis remplacement) — une écriture directe a déjà tronqué
  l'ancien index.html à zéro octet.
- Le service worker ne met plus en cache une réponse redirigée : sans cela, la
  page de connexion se retrouvait rangée sous l'adresse d'un cours.
