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

## Déploiement — débloqué le 11 août 2026, après deux pannes empilées

Pendant plusieurs sessions, la production est restée figée sur `c6206e0`
sans que rien ne le signale : les commits partaient sur GitHub, le site
servait une vieille version, et les vérifications « en ligne » mentaient.
Deux causes, l'une cachant l'autre.

1. `vercel.json` contenait un motif `source` avec un groupe imbriqué
   (ajouté par `18f775f`). Vercel **rejette un fichier invalide avant de
   créer le déploiement** : rien n'apparaît dans la liste, pas même une
   erreur. C'est le piège le plus vicieux du projet.
2. Une fois corrigé : quatorze fonctions dans `api/` pour un plafond de
   douze sur le forfait Hobby. Réglé en supprimant `create-checkout.js`
   (mort) et en réunissant `audio-get` et `audio-upload` dans `audio.js`.

Vérifié en ligne après déblocage : page publique de 210 Ko sans une ligne
de cours, `/fille` sans compte refusé, `/api/audio` et `/api/keepalive`
qui répondent, images servies, `sw.js` à jour.

**Réflexe à garder** : après un push, jeter un œil à la page Deployments.
Une liste qui ne bouge pas ne veut pas dire « tout va bien ».

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

## FAIT — Animer le modèle à repasser (interface garçon)

Les deux animations validées avec le client sont en place, pour **les trente
lettres**.

**1. Le modèle s'écrit tout seul, dans les canvas de tracé.**

- Le chemin n'est jamais dessiné, et il ne suit PAS la lettre au pixel près :
  il donne l'**ordre du parcours**. On promène un pinceau le long du geste, et
  chaque pixel prend le rang du moment où le pinceau le couvre pour la
  première fois. Un pixel jamais atteint reprend le rang de l'endroit du
  chemin dont il est le plus proche : la lettre est donc toujours révélée en
  entier, même sous un chemin grossier — c'est ce qui a rendu les cent trois
  formes tenables.
  **Deux fausses bonnes idées, déjà essayées, à ne pas refaire** : masquer la
  lettre avec un gros trait posé le long du chemin (il faut alors des
  coordonnées au pixel près, et un chemin un peu à côté laisse un morceau
  invisible) ; et ranger les pixels par « endroit du chemin le plus proche »
  sans promener de pinceau (dès qu'un trait revient sur lui-même ou fait une
  boucle, les deux côtés sont à égale distance et la lettre se révèle par
  plaques — c'est ce que le client a vu sur le م, le ه, le ص).
- **Trois temps, dans l'ordre où la main écrit** : le corps de la lettre au
  fil du geste, PUIS ses points un par un de droite à gauche, PUIS sa voyelle
  de la même façon. L'avancement va donc de 0 à 3, un temps par phase, et un
  temps vide (pas de point, pas de voyelle) est sauté. Les pixels de la
  voyelle sont repérés en peignant la même chaîne sans ses signes : les
  lettres, elles, se dessinent exactement pareil.
- Ce qui est corps et ce qui est point ne se décide PAS à la taille de la
  tache mais au passage du crayon : le petit kāf logé dans le ك est minuscule
  et fait pourtant partie de la lettre — il s'écrit donc, du haut vers le bas,
  après le corps.
- **Rayon du pinceau : 0,055 em.** Large, il découvrait d'un coup tout un
  trait de liaison (vu par le client sur l'alif attaché) et, sur une petite
  boucle comme celle du و ou du ق, il couvrait les deux côtés à la fois, et
  il mordait sur la barre horizontale posée juste sous la boucle du ف. Il doit
  rester juste au-dessus de l'épaisseur du trait. Le point bas des boucles du
  ف et du ق est aussi remonté d'un cheveu, pour la même raison.
- `_TRACE_MODELE` : un geste par base et par forme (seule, début, milieu,
  fin), en « em » depuis l'ancre du glyphe, donc valable à toutes les tailles.
  `_BASE_TRACE` renvoie chaque lettre à sa base : seuls les points changent,
  donc le geste s'écrit une fois pour la famille. Les sens de tracé des 19
  bases sont dans `SENS-ECRITURE.md`, dictés par le client.
- **Deux canvas superposés** : le modèle animé dessous, l'encre de l'enfant
  au-dessus. Sinon chaque tour d'animation efface son tracé. « EFFACER » ne
  nettoie que l'encre.
- L'animation tourne sur **la case voisine, à gauche de celle où l'enfant
  écrit** : au départ celle de droite ; dès son premier trait, elle saute d'un
  cran à gauche ; sur la dernière case, elle s'arrête. La case qu'elle quitte
  reste entière.
- Un bouton « ▶ REVOIR » relance l'animation sur la case en cours.
- Rythme : 1,05 s d'écriture, 0,28 s de souffle, les points, 0,33 s. Le client
  a demandé plus rapide, et que ça enchaîne sans temps mort une fois la lettre
  finie. Trois constantes en tête de la boucle.
- Vérification automatique à refaire après toute retouche de la table : pour
  les 103 formes, le corps doit être entièrement révélé à la fin du geste, et
  le départ comme l'arrivée du chemin doivent tomber à moins de 0,12 em de
  l'encre. C'est ce qui a rattrapé le ع et le ق, dont le départ était dans le
  vide.

**2. Le tableau des formes s'anime.** À l'arrivée, seules isolée et début sont
visibles. La phrase est découpée en quatre morceaux : chacun est dit, et son
geste part en même temps — le corps de la forme paraît, puis le trait de
liaison vient s'y coller par la droite. On attend le silence (`surSilence()`)
avant le morceau suivant, avec un filet de 2,6 s au cas où la voix ne rendrait
jamais la main.

**Le trait de liaison n'est pas un tiret.** Une forme attachée est donc
affichée en DEUX EXEMPLAIRES superposés de la même chaîne, découpés par
`clip-path` : l'un ne montre que la lettre, l'autre que son trait. Couper la
chaîne en deux balises casserait la liaison arabe et le trait redeviendrait un
tiret tout droit — le client l'a vu tout de suite. La part revenant au trait
se mesure avec `_partLiaison()`.

**Les lettres qui n'ont pas toutes les formes.** Le tā marbūṭa ne vit qu'en
fin de mot : ni début, ni milieu, ni déduction, ni prolongation, et jamais de
soukoun. La hamza s'écrit toujours pareil : une seule forme, l'isolée — mais
elle garde ses voyelles et ses prolongations. Le ع et le غ n'ont pas de
déduction non plus : ce sont les exceptions annoncées. Tout cela tient dans
`finDeMot`, `formeUnique` et `sansDeduction`, en tête de `_boyLetterCourse`.

---

## À FAIRE ENSUITE

**L'ordre compte** : garçon validé → fille alignée dessus → traductions →
voix. Inversé, chaque étape jette le travail de la précédente — traduire
95 phrases × 13 langues sur une interface qu'on va refaire, puis enregistrer
les voix sur des textes qui vont changer.

### Chantier 1 bis — Aligner l'interface fille sur celle du garçon

Décision du client : ne pas toucher aux deux interfaces enfant en même
temps. L'interface fille actuelle sert de repli tant que le garçon n'est pas
validé. Une fois validé, la fille reprend **exactement** la mécanique du
garçon, avec un autre univers que l'espace.

- Seuil de déclenchement : non pas « le garçon est parfait », mais « je ne
  veux plus rien changer à sa **structure** » — découpage des écrans et leur
  ordre, contenu de chaque écran, déblocage des lettres, rôle de la ligne
  d'écriture. Les formulations, couleurs et animations peuvent encore bouger
  après.
- Le portage doit produire **un seul moteur de scènes avec deux habillages**,
  pas un second code recopié : aujourd'hui `_kidScene` et `_boyScene` sont
  deux chemins séparés, et toute correction est à faire deux fois.
- Univers proposés pour la fille, avec la correspondance pièce par pièce
  (hublot → cadre de la lettre, piste → ligne d'écriture, jauge de décollage
  → progression) : licorne (chemin d'étoiles, corne qui s'allume — reprend
  les licornes déjà présentes dans le décor animé), montgolfière (horizon,
  brûleur), jardin (allée, arrosoir, fleur qui éclôt), pâtisserie. **Choix du
  client en attente.**
- Piège : l'arc-en-ciel ferait une mauvaise ligne d'écriture, il est courbe.
  La ligne doit rester droite, c'est celle du cours adulte.

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

- **Carte des îles** : la carte reste CACHÉE le temps de poser le personnage
  et de faire défiler jusqu'à lui — sinon on voyait le haut du chemin une
  fraction de seconde, puis un saut. Elle attend le chargement des images
  d'îles (`_quandCartePrete`, 1,5 s au pire) plutôt qu'un délai fixe.
- **Rotation du téléphone** : le test portait sur `st._curPage==='sessions'`
  alors que la carte se marque `'sessions-map'` — la carte ne se redessinait
  donc JAMAIS en tournant l'appareil. Corrigé, et `orientationchange` écoute
  aussi, Android ne déclenchant pas toujours `resize`.
- **Sons de bonne et mauvaise réponse** : chaque appel créait un nouveau
  contexte audio. Les navigateurs en limitent le nombre (six sur Chrome) :
  passé la sixième réponse, plus aucun son jusqu'au rechargement. Un seul
  contexte désormais, réveillé s'il s'est mis en pause.
- **Un signe se pose sur la LETTRE, pas sur son trait de liaison**
  (`_avecSigne`) : « خـ » + fatḥa donnait « خـَ », la voyelle sur le tiret.
- **Carte des îles** : le personnage n'arrive plus au coin en haut à gauche.
  `_ileDepart()` le pose sur l'île qu'on vient de quitter (retenue dans
  `arab_ile` au clic), sinon la dernière entamée, sinon la dernière validée.
  Et revenir en arrière ne refait plus tout le chemin : on se pose sur l'île
  qui suit la visée, il ne reste qu'un pas à marcher.
- **La dernière île** ne promet plus « la prochaine aventure » : elle renvoie
  aux exercices, par le menu principal.
- L'écran « toute seule, elle s'écrit ainsi » a été supprimé pour toutes les
  lettres : l'identification le dit déjà (« Voici X. Isolée, elle s'écrit
  ainsi. »).
- Retours du client sur les écrans : voyelles en apesanteur qui sortaient du
  hublot (amplitude de dérive divisée par deux), kasra et tanwīn kasr montrés
  seuls qui collaient à la ligne (descendus de 0,24 em, comme dans les
  canvas), trait de liaison du socle trop long dans les syllabes en deux
  couleurs (la moitié du tiret revient à la prolongation).
- **Fin d'un cours sur une île déjà bouclée** : on revient à la liste des
  lettres de l'île, pas à la carte. `_boyLettreFinie` répond désormais
  `{finie, deja}` — « deja » se lit AVANT d'enregistrer la lettre du jour.
- **Le cercle pointillé ◌ ne s'affiche plus nulle part.** Il reste la clé des
  enregistrements (« ◌َ »), mais tout ce qui montre un glyphe passe par
  `_sansCercle()`. Un signe seul n'ayant aucune largeur, on lui réserve de la
  place là où il faut pouvoir le toucher (hublot, cibles, grosses lettres).
- **La ligne d'écriture est dans TOUS les hublots**, y compris pour une lettre
  sans voyelle et pour le soukoun. Quand le hublot est un canvas (syllabe en
  deux couleurs), la ligne est tracée dedans, sur la ligne de base exacte du
  glyphe, et celle du CSS est retirée — sinon on en voyait deux, à deux pixels
  l'une de l'autre.
- **Le bā fantôme est parti** : voir le piège du ZWJ dans le canvas, plus bas.
- De l'air autour d'une lettre arabe posée dans une phrase française
  (`.ar-air`) : sans cela le mot d'avant et la virgule d'après se collaient
  dessus.
- L'écran du NOM des voyelles joue le nom (« fatha », « damma », « kasra »)
  quand on appuie dessus, plus leur son : c'est de leur nom qu'il parle.
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

- **Douze fonctions au maximum** dans `api/` (forfait Vercel Hobby ; les
  fichiers commençant par `_` ne comptent pas). On y est exactement : la
  treizième fera échouer la construction. Pour en ajouter une, il faudra en
  réunir deux autres — comme `audio.js`, qui a absorbé `audio-get` et
  `audio-upload` — ou passer au forfait Pro.
- **`vercel.json` : pas de groupe dans un groupe** dans un motif `source`.
  `/((a|b)(/.*)?|c)` est refusé, `/(a|b)` et `/(a|b)/(.*)` passent. Un fichier
  invalide est rejeté avant la création du déploiement : rien n'apparaît dans
  la liste, pas même une erreur. Vérifier la page Deployments après un push
  qui touche à ce fichier.

- **Le canvas n'applique pas le liant invisible (ZWJ).** `fillText('ب'+ZWJ)`
  sort la forme ISOLÉE, pas la forme de début — mesuré : même largeur et même
  tracé que `'ب'` seul. C'est ce qui posait un gros bā bleu en travers des
  syllabes en deux couleurs. Dans un canvas, la liaison se force avec le
  **tiret de liaison visible (tatweel `ـ`)**, jamais avec le ZWJ. En HTML, le
  ZWJ fonctionne — d'où le piège, ça marche d'un côté et pas de l'autre.

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
