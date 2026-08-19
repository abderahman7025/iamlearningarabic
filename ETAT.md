# État du projet — où on en est

Fichier de reprise. À lire en premier au début d'une nouvelle session.

Site : iamlearningarabic.com · Vercel + Supabase + Stripe + Brevo

Deux fichiers, désormais :

| Fichier | Qui le reçoit | Contenu |
|---|---|---|
| `public/index.html` (211 Ko) | tout le monde | vente, connexion, inscription, paiement |
| `app/app.html` (≈ 0,86 Mo) | **comptes payants seulement**, via `api/app.js` | toute l'application |

Après CHAQUE modification de `app/app.html` ou de `public/index.html` :
incrémenter la version dans `public/sw.js` — **aux deux endroits** — et
dans `_VERSION_REPLI` de `app/app.html`, committer, pousser. Vercel
déploie tout seul. Puis vérifier en ligne que `iamlearningarabic.com/sw.js`
affiche bien le nouveau numéro.

Pour regarder soi-même ce qu'on vient de changer, sans passer par la
production ni par le client : `node outils/serveur-local.js`
(voir « Le banc EN LOCAL » plus bas).

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
  formes tenables. Un pixel non touché prend le rang de son plus proche
  voisin d'encre déjà rangé, DE PROCHE EN PROCHE à travers le trait — surtout
  pas « l'endroit du chemin le plus proche » : la barre horizontale posée sous
  la boucle du ف se voyait alors dès le début du geste, le chemin de la boucle
  passant juste au-dessus d'elle.
  **Le chemin est PLAQUÉ SUR L'ENCRE** (`_cheminSurEncre`). C'est la
  correction la plus importante du moteur. Le geste ne donne que l'ordre :
  ses points sont posés à la main, et la CORDE qui joint deux points voisins
  traversait le trait au lieu de le suivre. Le pinceau touchait alors les
  deux bords d'une tête en même temps, et la lettre paraissait s'essuyer
  d'un bloc, « comme si on cachait la lettre avec une feuille verticale
  qu'on déplace vers la gauche » — mots du client, sur la tête du ʿayn au
  milieu. Désormais chaque point du geste est ramené sur le trait le plus
  proche (rayon 0,14 em), et d'un point au suivant on chemine DANS l'encre,
  de proche en proche, au lieu de couper tout droit. Deux garde-fous : si
  l'encre ne relie pas les deux points (le crayon se lève), ou si le détour
  dépasse 3 fois la corde, on garde la corde.
  Mesuré sur les 65 gestes, part du pinceau qui tombe sur le trait :
  **75 % → 98 %** de moyenne. Les pires avant : ṭā isolé 36 %, rā isolé
  48 %, fā isolé 51 %, kāf début 56 %. Restent sous 90 % : qāf fin (88 %) et
  kāf fin (78 %), imprécisions de la table, pas du moteur.
  **Conséquence à retenir** : quand une animation paraît fausse, regarder
  d'abord si le pinceau reste sur le trait, AVANT de toucher à la table des
  gestes — l'ordre y était juste dans les quinze formes que le client a
  redessinées.
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
- Vérification automatique à refaire après toute retouche de la table, **à la
  taille réelle d'une case (PX=104)** : une carte d'ordre tracée plus grand
  agrège les pixels et cache les défauts — c'est comme cela qu'un « bout de
  barre » révélé dès 20 % du geste m'a échappé. Contrôler aussi qu'aucun
  dixième ne découvre plus de 45 % du corps d'un coup. Pour
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

**La règle des formes attachées, dictée par le client.** Une forme attachée,
c'est le trait de liaison de la DROITE vers la GAUCHE, puis **exactement le
geste de l'isolée ou du début** — même sens. J'ai essayé d'inverser les
boucles des formes attachées (wāw, fā, qāf) en croyant bien faire : le client
a refusé net. Ne pas y revenir.

**Ce que le client a validé et qu'il ne faut plus toucher** : lām début,
milieu et fin ; kāf isolé et fin ; ʿayn début ; ṣād début ; mīm milieu ;
hā isolé et fin ; djīm début et milieu ; ṭā isolé et début ; wāw isolé et
début. Quand une forme est juste, elle sert de modèle à ses sœurs.

**Départ d'un trait vertical** : mettre des points RAPPROCHéS au début du
chemin. Espacés, le pinceau ouvre le haut et le bas ensemble et le trait
semble monter au lieu de descendre (vu sur le rā et le nūn).

**Les lettres qui n'ont pas toutes les formes.** Le tā marbūṭa ne vit qu'en
fin de mot : ni début, ni milieu, ni déduction, ni prolongation, et jamais de
soukoun. La hamza s'écrit toujours pareil : une seule forme, l'isolée — mais
elle garde ses voyelles et ses prolongations. Le ع et le غ n'ont pas de
déduction non plus : ce sont les exceptions annoncées. Tout cela tient dans
`finDeMot`, `formeUnique` et `sansDeduction`, en tête de `_boyLetterCourse`.

---

## FAIT — Écrire en grand (mode plein écran du tracé)

Constat du client : ses enfants n'arrivent pas à écrire, la case est trop
petite. Mesuré sur un téléphone de 390 px : le panneau ne laisse que 294 px,
une case de tracé à quatre formes tombe à **73 px** et le modèle à 45 px.

**Ce qu'une page web n'a PAS le droit de faire : faire pivoter l'appareil.**
`screen.orientation.lock()` n'existe que sur Chrome Android, et seulement en
plein écran. Safari sur iPhone n'a ni plein écran ni verrouillage
d'orientation. Ne pas repartir sur cette piste : elle est fermée.

Ce qui a été fait à la place :

- `_blocEcriture(hote,o)` — les deux calques, la barre de boutons,
  l'animation et les gestes, sortis de `api.tracer` en **une fonction qu'on
  appelle deux fois** : une pour le panneau, une pour le calque plein écran.
  Toutes les tailles descendent d'un seul facteur `k` mesuré sur la place
  disponible, donc le plein écran garde **exactement** les proportions où le
  client a réglé les gestes. `k` ne descend jamais sous 1 : à taille de
  panneau, l'écran est rigoureusement celui d'avant.
- Bouton **« ⛶ AGRANDIR »** sur chaque écran de tracé. Le choix est retenu
  pour la session (`_boyPleinEcran`) : les tracés suivants s'ouvrent déjà en
  grand. « ⤡ RÉDUIRE » l'oublie ; « SUIVANT » depuis le calque le garde —
  et ne quitte pas le plein écran natif, qu'on ne pourrait pas redemander
  sans un appui de doigt.
- Le calque est un `position:fixed` qui prend tout l'écran : ça marche
  partout, iPhone compris. On demande **en plus** le plein écran natif et le
  paysage, et on se passe très bien d'un refus.
- Moins de 560 px de large : une carte « 📱↻ Tourne ton téléphone » plutôt
  qu'un agrandissement qui n'apporterait rien. Elle se remplace toute seule
  dès l'appareil tourné (`resize`, `orientationchange`, et le `resize` du
  `visualViewport`, seul fiable quand la barre d'adresse se replie).
- L'encre déjà posée suit l'enfant dans les deux sens (`reprendreEncre`), et
  le bloc caché derrière le calque est **arrêté** (`stop`) : `isConnected`
  reste vrai pour un panneau seulement masqué, il tournerait pour rien.

Gain mesuré, téléphone 844 × 390 en paysage : la case passe de 73 à 175 px,
soit **2,4 fois** plus grande.

---

## FAIT — Le banc d'essai des gestes (`/banc`)

Adresse réservée au compte `abder.jah@hotmail.com`, servie par la MÊME
fonction que l'application (`api/app.js`, paramètre `banc`) : aucune
fonction ajoutée, on reste aux douze autorisées.

La page ne contient **aucune copie du moteur**. Elle récupère
`/app?f=<horodatage>` — le paramètre est indispensable, voir les pièges —
en extrait les scripts et rejoue les formes côte à côte, toutes au même
rythme. Elle affiche la version d'`app.html` reçue, le nombre de gestes
d'une forme et ses coordonnées : c'est ce qui permet de distinguer « la
table qui arrive sur l'appareil est vieille » de « la table est bonne mais
le rendu l'ignore ».

`AREVOIR`, en tête du script, liste les formes montrées par défaut : on y
met celles que le client signale, et on en retire ce qu'il valide.
`/banc?tout=1` montre l'alphabet entier, `/banc?l=و,ك` quelques lettres.

**Sans ce banc, on ne peut pas travailler les gestes.** Avant lui, chaque
correction partait en production et le client servait d'œil ; cinq tours
ont été perdus sur des mesures qui disaient l'inverse de ce qu'il voyait.

### Le banc EN LOCAL — `outils/serveur-local.js`

En ligne, `/banc` est derrière `api/app.js` et n'est ouvert qu'au compte du
client : on ne peut donc pas y regarder un geste soi-même. Ce petit serveur
sert la même arborescence depuis la machine, sans aucune vérification :

```
node outils/serveur-local.js      → http://localhost:3456
/banc  ·  /banc?tout=1  ·  /banc?l=ه
/fille/accueil  ·  /garcon/accueil
```

Il pose lui-même un faux jeton dans `localStorage` (sinon l'application
repart vers `/connexion`) et désinscrit le service worker, pour toujours
servir le fichier qui vient d'être écrit. Rien de tout cela n'est en ligne :
le fichier vit hors de `api/` et de `public/`, il ne compte donc pas dans
les douze fonctions et Vercel ne le déploie pas.

**Il accepte aussi une capture** : `POST /capture?f=nom.png` avec un
`toDataURL()` en corps écrit l'image dans `outils/captures/` (ignoré par
git). C'est ce qui permet de REGARDER une animation au lieu de la décrire
— on peint les étapes d'un geste côte à côte dans un canvas, on dépose, on
ouvre. Trois pièges levés d'un coup de cette façon dans la session du
19 août : les planètes appelées en `.png` alors qu'elles sont en `.svg`,
l'anneau d'Uranus qui ressemblait à deux rayures, et le hā milieu qui se
révèle par plaques.

**Un onglet caché ne bat pas** : `requestAnimationFrame` ne se déclenche
pas tant que la fenêtre n'est pas affichée. Pour mesurer une animation
depuis un onglet en arrière-plan, remplacer l'horloge avant toute chose :

```js
window.requestAnimationFrame=function(f){return setTimeout(function(){f(Date.now());},16);};
```

---

## LEÇONS SUR LES GESTES — à lire avant d'y toucher

Cinq allers-retours perdus tiennent dans ces quatre points.

1. **Recopier, jamais adapter.** Quand le client dit « sers-toi du fā
   milieu », il faut prendre ses points, dans son ordre, **sans les
   étirer**. Le ʿayn isolé, le fā isolé, le fā fin, le ṣād milieu et fin,
   le kāf : tous ont été bons du premier coup le jour où la forme validée
   a été recopiée telle quelle. Toutes mes mises à l'échelle « pour
   épouser la boucle cible » ont retourné le parcours.
2. **La liaison à part, crayon levé.** Une forme attachée dont la boucle
   sort à l'envers, c'est presque toujours le pinceau qui finit la
   liaison en frôlant le flanc de la boucle. Couper la liaison en geste
   séparé règle ça (ṣād, wāw, fā fin).
3. **Le défaut peut être dans la TABLE, pas dans le moteur** — et
   l'inverse. Le triangle du ʿayn milieu était écrit à l'envers dans la
   table (aire signée −0,088) et le moteur le dessinait fidèlement à
   l'envers. Trois corrections du moteur n'y ont rien changé.
   **Le sens se calcule** : aire signée du contour en coordonnées écran
   (y vers le bas), **positif = sens des aiguilles d'une montre**.
4. **Ne pas se fier à un indicateur qui ne mesure pas la question.**
   J'ai successivement utilisé l'aire signée, le « haut vers le bas » et
   le « gauche avant droite » ; les trois répondaient à côté, et les
   trois m'ont fait affirmer des choses fausses. Le seul contrôle qui
   vaut, c'est de **regarder** sur `/banc`.

Deux réglages du moteur, trouvés par la mesure :

- **Le pinceau fait 0,026 em de rayon**, pas 0,055. Mesuré à la taille
  réelle d'une case : le trou de la boucle du fā fait 32 pixels, celui du
  qāf 22, celui du wāw 16 — le pinceau large les couvrait entièrement,
  et **aucun chemin ne pouvait alors donner un sens de rotation**. Il est
  aujourd'hui plus fin que le trait, ce qui ne pose plus problème depuis
  que les pixels non touchés se rattachent de proche en proche à travers
  l'encre.
- **Le chemin ne recule jamais** le long de sa corde (`_cheminSurEncre`).
  Sans cette règle, le plus court chemin dans l'encre contournait une
  petite boucle par le mauvais côté — le couloir seul ne suffit pas, les
  deux côtés d'une boucle de la taille de la tête du ʿayn y tiennent.
- **Pour situer une boucle, la repérer par son TROU**, pas par sa boîte :
  le trou est le seul fond que l'encre enferme, et sa boîte élargie de
  l'épaisseur du trait délimite la boucle sans la queue ni la barre. La
  boîte de la lettre, elle, donne toute la largeur et fausse tout report.

### FAIT — Le point du yā attend la fin du corps

Ce n'était pas un seuil à déplacer, c'était le **critère** qui ne mesurait
pas la bonne chose. « Quelle part de la tache le pinceau a-t-il couverte »
a été essayé au quart, au tiers et à la moitié : au quart le point du yā
passait pour un morceau de lettre — le crayon longe la ligne juste
au-dessus de lui et l'effleure — et plus haut c'est le petit kāf logé dans
le ك qui basculait du côté des points. Aucune valeur ne séparait les deux.

Ce qui les sépare, c'est le **passage du crayon** : le petit kāf est
traversé sur sa longueur, la pointe se pose dessus pas après pas ; le point
du yā est détaché et hors du chemin, seule l'épaisseur du pinceau vient le
mordre. `estCorps` compte donc les pas où la POINTE est sur la tache, plus
les pixels que l'épaisseur a touchés. Deux pas suffisent ; la part couverte
reste en filet, mais à 70 %, où une tache est peinte et non effleurée.

Au passage, le rattrapage du centre hors encre cherche par **cercles** (un
pixel, puis deux) au lieu de balayer un carré de cinq : le crayon
s'accroche au trait le plus proche, donc à celui qu'il suit.

Mesuré sur les 65 gestes à PX=104 : les points du yā (quatre formes)
tombent à `pointe 0, couverte 0 %` ; le petit kāf du ك isolé est à
`pointe 18` et celui du ك fin à `pointe 65`. Aucune tache n'est sauvée par
le filet, aucune forme n'a plus de deux taches. Regardé image par image sur
le banc : le yā écrit son corps entier avant qu'un point paraisse.

**`_revelateur` renvoie `diag`**, le classement tache par tache (pixels,
part couverte, pas de pointe, verdict). Sans lui, « le point sort trop
tôt » ne dit pas si la tache est mal classée ou si l'ordre du geste est
faux — et on repart pour un tour.

### Ce qui reste ouvert sur les gestes

- **Le hā milieu.** Le client le signale depuis le début et ne nomme
  aucune forme modèle — ses deux ventres n'existent nulle part ailleurs.
  Il faut lui demander par où entre le crayon et dans quel sens tourne
  chaque ventre. Ne rien inventer : c'est là que tout a dérapé.
  **Regardé sur le banc (19 août 2026)** : le défaut est visible et net.
  Le geste part bien du trait de liaison, mais les deux ventres poussent
  ENSEMBLE et par morceaux — à 45 % un fragment détaché apparaît en haut,
  à 60 % le ventre du bas commence alors que celui du haut n'est pas fini.
  Ce n'est donc pas un défaut de rendu : la table donne un ordre qui ne
  suit aucun tracé continu. Le hā **isolé**, lui, se déroule proprement.

---

## À FAIRE ENSUITE

**L'ordre compte** : garçon validé → fille alignée dessus → traductions →
voix. Inversé, chaque étape jette le travail de la précédente — traduire
95 phrases × 13 langues sur une interface qu'on va refaire, puis enregistrer
les voix sur des textes qui vont changer.

**Les deux premières étapes sont faites.** Le chantier ouvert est celui des
traductions ; l'arabe des enregistrements peut partir en parallèle, il ne
dépend de rien (voir chantier 3).

### FAIT — Chantier 1 bis : la fille sur le moteur du garçon, univers licorne

**Décidé et fait le 19 août 2026.** Il n'y a plus qu'**un moteur de scènes,
un jeu de cours et une carte**, pour la fille comme pour le garçon. Ce qui
distingue les deux univers tient dans un seul objet, `_HABILLAGES`, et dans
deux blocs de variables CSS (`.boy-wrap` / `.boy-wrap.licorne`).

| | fille | garçon |
|---|---|---|
| habillage | **licorne** 🦄, rose | **fusée** 🚀, bleu |
| décor du parcours | **les îles, gardées** | **les planètes** |
| noms des étapes | les lieux (L'Arche de Nouh…) | les planètes (Saturne…) |
| mots | aventure · départ · envol · bulle | mission · briefing · décollage · hublot |
| déplacement | **vole** d'île en île | **vole** de planète en planète |

**Ce qu'il ne faut plus jamais refaire** : un second moteur. `_kidScene` et
toute la chaîne de leçons de la fille — 49 fonctions, 2 600 lignes — ont
été supprimées. Pour un troisième univers, il suffit d'ajouter une entrée à
`_HABILLAGES` : rien d'autre.

**Où poser quoi**
- un mot, un emblème, une couleur qui change d'un univers à l'autre →
  `_HABILLAGES` ;
- une couleur d'écran → une variable `--sk-*` dans les deux blocs CSS.
  **Aucune couleur en dur dans les classes `.boy-*`** : sinon la licorne
  repasse au bleu sans qu'on comprenne pourquoi ;
- une couleur peinte dans un canvas → les champs `fonce`, `moyen`, `rgb`,
  `rgbF` de l'habillage : un contexte 2D ne sait pas lire une variable CSS,
  ces champs doublent donc les `--sk-*` et doivent bouger avec elles.

**Le vol** (`_volCarte`, `_traceVol`). Le personnage ne marche plus le long
d'un sentier. La courbe de Bézier reste la trajectoire — elle a la bonne
forme et passe par les bons points — mais elle n'est plus peinte en chemin
de terre à trois couches : il n'en reste qu'un pointillé clair. Trois
choses distinguent un vol d'une marche, et il faut **les trois**, sinon on
voit un personnage qui glisse au sol :

1. la vitesse n'est pas constante — on décolle, on file, on se pose. Une
   vitesse fixe, c'est exactement ce que faisait l'ancienne marche ;
2. le personnage s'incline vers là où il va. L'angle se prend sur la
   **tangente** de la courbe, pas sur la droite qui joint les deux étapes :
   dans un virage, les deux n'ont rien à voir. Il se redresse en se posant,
   sinon il reste planté de travers sur l'étape ;
3. il laisse une traînée qui s'efface derrière lui.

Piège : l'inclinaison vit sur le **conteneur**, le flottement sur l'**image**
qu'il contient. Une seule balise ne peut pas porter les deux — une animation
CSS écrase le `transform` posé à la main à chaque image.

**Les planètes.** Huit ne suffisent pas pour douze étapes : la Lune et le
Soleil complètent, comme prévu, puis Pluton et une comète. Elles sont
fabriquées par `outils/planetes.js`, qui écrit douze **SVG** dans
`public/images/` — des images rendues, décidées une fois pour toutes, pas
une sphère calculée dans le navigateur. Le client voulait des illustrations
générées ; son compte de génération est à zéro crédit sur forfait gratuit.
**Pour les remplacer** : déposer les fichiers sous le même nom et changer
l'extension dans le tableau `images` de l'habillage `garcon`. Rien d'autre.
`rmBg` ne détoure pas les `.svg` : déjà transparents, ils n'y gagneraient
rien et en ressortiraient rasterisés en 300 px.

**La progression de la fille a été reprise** (`_migreProgressionFille`).
Elle comptait ses lettres dans `child_girl_day`, un simple numéro ; le
garçon retient île par île les lettres faites (`boy_lettres_<id>`), et
c'est ce que la carte lit. Sans cette conversion — faite une fois, jamais
dans l'autre sens — une enfant qui avait appris douze lettres retrouvait
une carte vierge.

**Ce qui reste à décider avec le client**
- les douze planètes sont dessinées, pas illustrées : à remplacer le jour
  où il veut le même rendu peint que les îles ;
- la carte enfant n'est plus traduite (elle ne l'était qu'à moitié) — elle
  rejoint le chantier 2, où l'interface enfant est de toute façon
  entièrement en français.

Piège gardé : l'arc-en-ciel ferait une mauvaise ligne d'écriture, il est
courbe. La ligne doit rester droite, c'est celle du cours adulte.

### Chantier 2 — Traductions : tout, partout — LE CHANTIER OUVERT
Décision du client : **tout doit être traduit dans les 13 langues**.
- L'interface adulte est à 95–98 % (audit fait, trous comblés).
- **L'interface enfant est 100 % en français codé en dur** : ~86 phrases
  narrées + les libellés, aucun appel à `t()`, et la narration est forcée
  en `fr-FR`.
- Corpus mesuré : ~95 phrases par langue, ~4 800 caractères, ~62 000 pour
  les 13 langues.
- À faire avant les enregistrements audio, sinon la génération est à refaire.
- **Bonne nouvelle depuis le portage** : il n'y a plus qu'un jeu de phrases
  à traduire au lieu de deux. Elles vivent dans `_boyVowelCourse`,
  `_boyProlongCourse` et `_boyLetterCourse`, et les mots d'univers — fusée
  ou licorne — sont déjà sortis dans `_HABILLAGES` : ce sont eux, et eux
  seuls, qui diffèrent d'un profil à l'autre.
- Le titre de la carte enfant et les libellés des étapes en français
  passent par là aussi (`titreCarte`, `etapes`).

### Chantier 3 — Voix naturelles

**Le micro est arrivé et fonctionne (19 août 2026).** Le client veut
enregistrer ce week-end. L'ordre habituel — traductions AVANT voix —
n'est à respecter que pour une partie du corpus, et il faut savoir
laquelle :

- **L'ARABE peut s'enregistrer tout de suite, sans risque.** Lettres,
  voyelles, syllabes, les 30 mots illustrés : ce corpus ne dépend ni de
  l'interface ni des traductions. Il ne changera pas.
- **La narration FRANÇAISE des cours enfant peut maintenant s'enregistrer.**
  Elle devait attendre le portage de la fille, qui allait la remanier : le
  portage est fait. Ses phrases sont dans `_boyVowelCourse`,
  `_boyProlongCourse` et `_boyLetterCourse`, et elles ne bougeront plus que
  sur demande du client. Réserve : les quelques mots d'univers
  (« mission » / « aventure », « décollage » / « envol »…) diffèrent entre
  la fille et le garçon — il faut donc DEUX prises pour ces phrases-là, ou
  les enregistrer sans le mot d'univers. Elles sont listées dans
  `_HABILLAGES` : il n'y en a qu'une poignée.

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

- **Interface garçon en paysage** : plein écran demandé dès l'ouverture
  d'un cours de lettre (et non plus au seul écran de tracé) ; panneau en
  **deux colonnes** — la phrase à gauche, ce qu'elle montre à droite, les
  boutons en bas ; texte agrandi sur des lignes longues au lieu de quatre
  mots par ligne ; le cadre **remplit** la hauteur, en grandissant quand
  la place est là et en se réduisant quand elle manque. Les boutons
  « REVOIR » et « RÉDUIRE » ont été retirés à la demande du client.
- **Page de déduction** : les deux lignes suivent l'ordre des RANGÉES du
  tableau — « Fin = isolée + — » en haut, « Milieu = début + — » en bas.
  La phrase dite suit le même ordre, sinon la voix nomme une ligne pendant
  que l'autre s'anime.
- **Carte des îles** : au retour d'une lettre, le centrage se fait sur le
  MILIEU entre l'île quittée et la suivante, plus sur le personnage
  (`_centreDeuxIles`, utilisée aux quatre points de défilement).
- **Numéro de version** en bas à droite du menu principal, collé sous la
  barre du bas et calé sur son bord droit.
- **Le bandeau « appuyez sur Échap »** du plein écran appartient au
  navigateur : aucune ligne de code ne l'enlève. Le client l'accepte.
  Et **une page web ne peut pas faire pivoter un appareil** : Safari sur
  iPhone n'a ni plein écran ni verrouillage d'orientation. Ne pas
  reprendre cette piste, elle est fermée.

- **La hamza n'a pas de trait de liaison, même prolongée.** Les écrans
  d'allongement lui fabriquaient ses cases comme à une lettre ordinaire :
  un tatweel devant (case « fin »), un derrière (case « milieu »), soit
  « ـءَا ». Elle n'a plus qu'**une seule case**, la syllabe telle quelle, et
  pas de nom de forme dessous. Effet de bord bienvenu : une case seule se
  dessine à PX=150 au lieu de 104.
- **Retour automatique de fin d'île** : il vérifie que l'écran de fin est
  encore à l'affiche (`api.wrap.isConnected`). Sans ce garde-fou, le minuteur
  renvoyait à la carte le cours que l'enfant venait d'ouvrir.
- Le tā marbūṭa se trace en « forme **attachée** » (`nomForme()`), à
  l'observation comme au tracé.
- Les jumelles se comparent à la PREMIÈRE lettre de leur famille : ḥā et khā
  au djīm, pas l'inverse (`_CL_JUMELLES`).

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

- **Supprimer du code mort : deux précautions.** En retirant les 2 600
  lignes du moteur fille, deux pièges se sont refermés d'un coup.
  *Un* : un commentaire n'est pas un appel. Une simple note « voir
  `_machin` » posée hors de toute fonction suffisait à faire passer
  `_machin` pour vivant — il faut masquer les commentaires avant de
  chercher les racines, sinon la moitié du code mort reste.
  *Deux* : en absorbant les commentaires qui précèdent une fonction, ne
  jamais prendre une ligne parce qu'elle SE TERMINE par `*/`. Une ligne
  de code suivie d'une note de fin de ligne partait alors avec, et le
  fichier ne parsait plus — sans que la suppression elle-même soit en
  cause, ce qui coûte une heure à comprendre. **Contrôler la syntaxe de
  chaque bloc `<script>` avant d'écrire le fichier.**
- **Il reste six fonctions mortes**, antérieures à ce chantier et
  laissées telles quelles : `_applyProfileSafe`, `_mkVerset`,
  `_quitterPleinEcranPaysage`, `checkCompletion`, `showCompletionModal`,
  `markPracticeToday`. 70 lignes en tout.
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

- **`sw.js` porte le numéro à DEUX endroits** : la ligne de commentaire et
  `const CACHE`. La v80 est partie avec le commentaire à jour et le cache
  resté à `arab-v79` : le service worker changeait, mais le cache n'étant
  pas renommé, l'ancienne application pouvait continuer d'être servie. Une
  correction poussée n'arrivait alors jamais sur l'appareil, sans que rien
  ne le signale. Toujours vérifier les deux lignes.
- **Le numéro affiché dans le menu vient du FICHIER, pas du cache.**
  Première version : il lisait `caches.keys()`. C'était trompeur — le
  cache se renomme dès le nouveau `sw.js` récupéré, alors que la page
  ouverte fait toujours tourner l'ancien `app.html`. On lisait « v81 » en
  exécutant v79. Il lit maintenant `_VERSION_REPLI`, gravé dans le
  fichier, et prévient en jaune si le cache annonce plus récent.
  **`_VERSION_REPLI` est à tenir au même numéro que `sw.js`.**
- **Le service worker sert « cache d'abord » tout ce qui n'est pas une
  navigation.** Un `fetch('/app')` — celui du banc d'essai, par exemple —
  reçoit donc une vieille copie. D'où le paramètre horodaté
  `/app?f=<date>` : aucune entrée du cache ne correspond, la requête part
  sur le réseau. Ne PAS nommer ce paramètre `banc`, c'est lui qui fait
  servir la page du banc côté serveur.
- **`api/app.js` ne garde plus le HTML en mémoire.** Il le faisait
  (`_cacheHtml`) : sur une plateforme sans serveur, une instance encore
  chaude d'un déploiement précédent resservait l'ancienne application tant
  qu'elle restait chaude. Le fichier est relu à chaque requête ; la
  lecture ne coûte rien à côté du risque.
- **`.boy-btn` étale un bouton sur toute la largeur** (`display:block;
  width:100%`). Dans une barre en `flex-wrap`, les boutons s'empilaient donc
  les uns sous les autres, et le calque plein écran débordait de l'écran. Un
  bouton posé dans une barre doit porter `width:auto` en style en ligne.
- **Un onglet en arrière-plan ne bat pas.** `requestAnimationFrame` ne se
  déclenche pas tant que la page n'est pas affichée : sur un banc d'essai
  automatique, une animation semble donc à l'arrêt alors qu'elle va très
  bien. Remplacer l'horloge (`requestAnimationFrame` par un `setTimeout`)
  avant de conclure quoi que ce soit.
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
