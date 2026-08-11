# État du projet — où on en est

Fichier de reprise. À lire en premier au début d'une nouvelle session.

Site : iamlearningarabic.com · Vercel + Supabase + Stripe + Brevo
Seul fichier servi pour l'app : `public/index.html` (850 Ko).
Après CHAQUE modification de ce fichier : incrémenter la version dans
`public/sw.js`, committer, pousser. Vercel déploie tout seul.

---

## EN COURS — Chantier 1 : protéger le contenu payant

**Le problème** : `public/index.html` est servi à tout visiteur, connecté ou
non. La page de connexion ne fait que masquer des écrans une fois le contenu
déjà livré. N'importe qui lit les cours dans le code source. Vérifié en
direct sur le site en ligne, sans compte.

| Étape | État |
|---|---|
| 1. Sortir les 24 images base64 en fichiers (6,08 Mo → 850 Ko) | **fait** |
| 2. `api/app.js` : point d'entrée protégé (jeton + compte payant) | **fait, testé, pas encore branché** |
| 3. Extraire le contenu vers une API authentifiée | **à faire** |

### Étape 3 — plan précis

Contenu vendable restant dans `public/index.html` (~485 Ko) :
- `const LS=[...]`, `const SP={...}`, `const SV={...}` — données des cours
  adultes (lettres, positions, harakat, mots) : ~307 Ko
- `const T={...}` — textes des leçons mêlés aux libellés d'interface : ~176 Ko
- `var CHILD_LETTERS=[...]` : ~2 Ko

À faire :
1. Créer `api/content.js` sur le modèle exact de `api/app.js` (même double
   vérification : jeton HMAC valide **et** compte toujours `paid` en base),
   renvoyant ces blocs en JSON.
2. Les retirer de `public/index.html`, les remplacer par des variables vides
   (`let LS=[]` au lieu de `const`).
3. Après connexion réussie — et au démarrage si un jeton existe déjà —
   appeler `api/content.js`, remplir les variables, **puis seulement**
   afficher le menu.
4. Vérifier dans l'ordre : la page de vente s'affiche sans compte ; la
   connexion marche ; les cours se chargent une fois connecté ; et surtout
   **rien de vendable n'apparaît dans le code source d'un visiteur non
   connecté**.

Point de vigilance : ces données sont aujourd'hui utilisées dès le
chargement. Les rendre asynchrones touche à l'initialisation, à la connexion
et à l'affichage. C'est l'endroit où une erreur casse le site pour les
clients — avancer par petits pas vérifiés.

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
Pages publiques (accueil, tarifs, contact, mentions) en vraies pages avec
menu, pied de page et URL propres, indexables. L'application reste derrière
la vérification de paiement (chantier 1).

---

## Fait récemment (ne pas refaire)

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
- Écrire dans `public/index.html` : toujours en écriture atomique (fichier
  temporaire puis remplacement) — une écriture directe l'a déjà tronqué à
  zéro octet une fois.
