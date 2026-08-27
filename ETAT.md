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

**Cette vérification passe par le NAVIGATEUR**, pas par `curl` : le bac à
sable qui exécute les commandes n'a pas toujours accès au réseau, et `curl`
répond alors « code http 000 » sans rien dire de plus — ce qui ressemble à
un déploiement raté alors que tout va bien. Ouvrir l'adresse dans le
navigateur intégré et lire les deux premières lignes.

Pour regarder soi-même ce qu'on vient de changer, sans passer par la
production ni par le client : `node outils/serveur-local.js`
(voir « Le banc EN LOCAL » plus bas).

---

## OÙ ON EN EST — soir du 21 août 2026, production en v129

La soirée a porté sur l'interface adulte. Sont **faits et en ligne** : le code
couleur des formes (trait de liaison en blanc, coupe en L pour ne pas emporter
les points), le ʿayn et le ġayn sans couleur, les lettres posées sur la ligne
d'écriture dans les canvas, les voyelles seules écartées de la ligne, la page
des cours devenue un parcours, le modèle qui s'écrit tout seul dans les canvas
adulte, et la rangée de voyelles sous les formes avec ses deux règles.

**Ce que le client doit trancher ou préciser :**

1. **Les autres lettres.** Il a dit : « il reste quelques soucis sur les autres
   lettres non citées, on verra demain. » Lesquelles, il ne l'a pas dit. Les
   cinq familles déjà réglées sont dans `_LIAISON_EM` ; en ajouter une ne coûte
   qu'une ligne. La règle de référence, tirée du nūn : **le blanc s'arrête au
   pied de la dent**, la petite verticale qui remonte appartient à la lettre.
2. **« Les spécificités de chaque lettre »**, au pluriel. Seul le tā marbūṭa
   sans soukoun a été nommé et fait (`_SANS_SOUKOUN`). Lui demander la suite —
   l'alif et la hamza sans son propre ? les lettres qui ne s'attachent pas ?
3. **Voyelle impossible : éteinte ou cachée ?** Choix fait : éteinte, pour que
   l'élève voie qu'elle existe et qu'elle ne va pas là. À confirmer.

**Deux habitudes prises avec lui, à garder :**
- Avant un gros chantier, annoncer le plan et attendre son avis. Les
  corrections bornées, non : celles-là se font d'un trait.
- Pour un réglage à l'œil, lui envoyer une planche d'images plutôt que de
  deviner — c'est plus rapide qu'un aller-retour par la production. Et n'y
  mettre QUE ce qu'il a demandé : les témoins « inchangés » l'ont agacé, une
  phrase suffit à dire qu'on n'y a pas touché.

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

**DÉSINSCRIRE LE SERVICE WORKER NE SUFFIT PAS.** Le serveur local le
désinscrit à chaque page, et pourtant on peut passer une demi-heure à
regarder une version d'avant : une page DÉJÀ contrôlée par un service
worker continue d'être servie par son cache, et l'application le
réinstalle au chargement suivant. Le symptôme est reconnaissable :
`curl` montre le fichier neuf, le navigateur montre l'ancien. Il faut
vider les caches EN PLUS de désinscrire, puis recharger :

```js
Promise.all([
  navigator.serviceWorker.getRegistrations().then(l=>Promise.all(l.map(r=>r.unregister()))),
  caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n))))
]).then(()=>location.reload());
```

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

### FAIT — Le hā milieu, dicté par le client

Il traînait depuis le début, et il a été réglé en **demandant**, pas en
devinant. La question posée le 19 août, et la réponse :

> **Par où entre le crayon, et dans quel sens tourne chaque ventre ?**
> Le trait de liaison arrive de la droite, puis le ventre du **BAS** en
> entier, puis le ventre du **HAUT**, puis la sortie à gauche sur la
> ligne. Un seul trait, sans lever le crayon. **Les deux ventres tournent
> dans le même sens.**

Le client n'a pas nommé le sens : il a été **repris du hā isolé**, qu'il
avait validé — recopier, jamais adapter. Mesuré sur sa table, aire signée
en coordonnées écran : **+0,044, donc sens des aiguilles d'une montre**.

Avant, les deux ventres tournaient en sens contraires (+0,020 et −0,030)
et celui du haut passait le premier : la lettre se révélait par plaques,
les deux ventres poussant ensemble, avec un fragment détaché qui
apparaissait tout seul en haut à 45 % du geste.

**Piège relevé au passage** : le commentaire du hā *début* annonçait
« sens inverse des aiguilles » alors que sa boucle mesure +0,049 — donc
l'inverse. Le sens **se calcule**, il ne se relit pas dans un commentaire.

### Ce qui reste ouvert sur les gestes

Rien de signalé. Les deux points laissés ouverts par la session
précédente — le point du yā et le hā milieu — sont réglés et regardés sur
le banc. `AREVOIR`, en tête de `app/banc.html`, liste encore les formes de
la session d'avant : à vider quand le client aura revalidé.

---

## À FAIRE ENSUITE

**L'ordre compte** : garçon validé → fille alignée dessus → traductions →
voix. Inversé, chaque étape jette le travail de la précédente — traduire
95 phrases × 13 langues sur une interface qu'on va refaire, puis enregistrer
les voix sur des textes qui vont changer.

**Où on en est.** Le garçon est fini et validé : moteur, habillage,
planètes, vol, atterrissage. La fille aussi : douze mondes, fond pastel,
licorne, couronne à partir du monde 2 — **validés par le client le 27 août
2026**.

Les traductions sont faites : la table `_TE` porte plus de trois cents
entrées en treize langues, les nouveaux écrans compris.

**LE SEUL CHANTIER OUVERT est le 3, LES VOIX.** `ADMIN_SOUNDS` compte
370 sons ; le studio d'enregistrement est dans l'application et les fichiers
vont sur Supabase (`AUDIO_URLS`). Tant qu'ils manquent, tout l'arabe passe
par la synthèse vocale du navigateur, qui le prononce mal et parfois pas du
tout selon l'appareil.

**Abandonné par le client, ne pas y revenir :**
- l'ORDRE D'APPARITION des lettres modèles dans le canvas — le geste qui
  écrit la lettre trait par trait. Reprises v133 à v143 sur le wāw milieu et
  fin, le ṭāʾ début et fin, le ʿayn fin ; « laisse les lettres comme elles
  sont actuellement, stop » ;
- le TRAIT DE LIAISON sur les lettres autres que celles déjà traitées : la
  liste n'a jamais été donnée.

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

**L'équipage du garçon** (`_equipage`). Ce qui se déplace n'est plus une
mascotte unique : la photo du personnage a été retirée de la carte. Il y a
maintenant **deux dessins du client**, détourés de leur fond vert, et une
flamme dessinée en CSS :

| | |
|---|---|
| `vaisseau` | sa fusée, avec le feu dessous. Elle voyage, et c'est elle seule qui s'incline dans le sens du vol. |
| `pilote` | l'enfant en scaphandre. Il se pose **seul** sur la planète, et l'attend debout entre deux voyages. |

L'arrivée se joue en trois temps, et c'est ce que le client a demandé :
la fusée atteint sa destination et **coupe le feu**, elle **monte au-dessus**
de la planète et s'y tient, puis l'enfant sort et **descend seul** pendant
qu'elle s'efface. Mesuré : vol 0 → 975 ms, vol stationnaire 975 → 1 400 ms,
descente 1 400 → 1 960 ms, et le cours s'ouvre ensuite.

Côté fille, l'habillage ne donne **ni vaisseau ni flamme** : sa mascotte
vole et se pose d'un bloc, exactement comme avant. Tout ce mécanisme est
donc neutre pour elle.

**Il se pose sur le SOMMET de la planète**, pas là où la trajectoire
traverse sa carte — sinon l'astronaute a les pieds au milieu du globe. Le
vol se termine donc par une **approche** : la courbe s'arrête où elle
s'arrêtait, et la fusée rejoint le sommet en glissant, feu encore allumé.

Le sommet, c'est celui du CORPS de l'astre, pas de l'image : une planète
est peinte au milieu d'un carré, entourée d'un halo. Il est **mesuré sur
les pixels** (`_hautDuDessin`) — rien à noter planète par planète, et une
illustration remplacée est mesurée toute seule.

**Deux versions ont échoué avant la bonne, gardées ici pour qu'on ne les
refasse pas.**

*Le premier pixel opaque* : l'anneau d'Uranus monte plus haut que sa
sphère, la queue de la comète aussi. Mesure à l'appui, premier pixel opaque
à **7 %** pour Uranus quand sa sphère commence à 22 % : le personnage se
posait sur l'anneau, dans le vide.

*La première rangée assez large pour être le corps* : bonne pour onze
astres, fausse pour la comète — sa queue est large, elle aussi. Le client
l'a vue tout de suite : « sur la comète seulement, il se pose sur
l'auréole ».

**Ce qui marche : on ne mesure pas ce qu'on a dessiné soi-même.**
`outils/planetes.js` connaît le rayon de chaque corps ; il imprime le
tableau des sommets, qui se recopie dans `_HABILLAGES.garcon.sommets`.
Exact par construction, pour les douze.

La mesure sur les pixels reste, en second, pour une illustration que le
client fournirait : `_hautDuDessin` cherche la première rangée assez large,
avec un seuil d'opacité haut qui écarte le halo. Elle suffit pour une
sphère nue ; pour un décor à queue ou à anneau, il faudra ajouter une
entrée au tableau — c'est une ligne.

**MESURER UNE ANIMATION DEPUIS UN ONGLET CACHÉ.** `requestAnimationFrame`
ne bat pas, on le sait ; mais `setTimeout` et `setInterval` non plus au-delà
de **cinq secondes** — Chrome les ralentit alors à un appel par minute. Une
mesure de vol s'arrêtait donc net à 5 s, sans erreur, et donnait à croire
que l'animation se figeait. La seule horloge qui tienne est un
**`MessageChannel`** : ce n'est pas une minuterie, rien ne la bride.

```js
var mc=new MessageChannel(),file=[];
mc.port1.onmessage=function(){var f=file.shift();if(f)f(Date.now());};
window.requestAnimationFrame=function(f){file.push(f);mc.port2.postMessage(0);};
```

**PAS DE RETOURNEMENT HORIZONTAL.** Il y en avait un quand le trajet
partait vers la gauche (`scaleX(-1)`). Posé sur un élément qui porte une
*transition* de transform, il ne bascule pas d'un coup : il passe par
`scaleX(0)`. La fusée s'aplatit jusqu'à disparaître puis se retourne —
« elle fait un tour sur elle-même et devient très fine », et on voit que ce
n'est pas un volume. Le client l'a refusé. Il ne servait de toute façon à
rien côté fille : la mascotte porte une animation CSS, qui gagne toujours
sur un `transform` posé à la main.

À la place, deux façons de s'orienter, selon l'habillage :
- `aligne:true` (garçon) — **le nez suit la trajectoire**. L'image de la
  fusée pointe vers le haut : on tourne donc de l'angle de la tangente plus
  un quart de tour. Piège : il faut **dérouler** l'angle (prendre toujours
  le chemin le plus court d'une image à l'autre), sinon la fusée fait un
  tour complet quand la tangente passe de +179° à −179° ;
- `aligne:false` (fille) — une simple inclinaison plafonnée à 24° : une
  licorne ne se met pas la tête en bas parce que le chemin descend.

**Le rythme**, rallongé deux fois à sa demande : vol **3,7 s** par saut
(3,3 s en portrait), approche 1,56 s, tenue au-dessus du sommet 0,7 s,
pose 0,78 s, puis l'enfant paraît, 0,9 s.

**La fusée se GARE, l'enfant paraît devant elle.** Elle ne s'efface plus :
elle reste posée sur l'étape, et c'est de là qu'elle redécollera.

**Deux dessins de fusée, pas un.** En vol, celle où l'enfant est au hublot ;
posée et l'enfant sorti, la fusée **vide**. Il ne peut pas être à la fois
dedans et devant. C'est `vaisseau` et `vaisseauVide` dans l'habillage, et
`vaisseauHabite()` qui bascule de l'un à l'autre.

**S'ASSEOIR DANS LA COURBURE.** Viser le sommet exact ne suffit pas : le
vaisseau a une base LARGE, un astre une surface COURBE. Posé pile au
sommet, sa base ne touche qu'en un point et ses bords surplombent le vide —
c'est ce que le client voyait sur la comète, dont le noyau est le plus
petit de tous, et que trois corrections du *sommet* n'ont pas réglé parce
que le sommet, lui, était juste.
On l'enfonce donc de la flèche de l'arc sur la largeur de son appui : pour
un demi-appui `w` sur un astre de rayon `R`, la surface descend de
`R − √(R² − w²)`. Mesuré : 4,3 px sur Jupiter, 10,7 px sur la comète —
l'enfoncement suit la taille de l'astre tout seul, sans rien régler à la
main.

**Sur la Terre, il descend sans combinaison** : il y a de l'air. C'est
`pilotesEtape`, dans l'habillage, une image par rang d'étape.

**La fusée part de là où elle est vraiment.** Elle se posait avant sur
l'étape juste avant la visée, ce qui la faisait apparaître d'un coup à
l'autre bout de la carte. Elle fait maintenant tout le trajet, et **la
caméra la suit** — sans ce défilement, un long voyage se joue hors de
l'écran : on clique, rien ne bouge, le cours s'ouvre.
**Un saut LOINTAIN se fait en ligne droite** (`volDroit`). D'une étape à sa
voisine on suit la courbe : elle contourne joliment. Mais enchaîner huit
courbes pour traverser la carte fait serpenter le vaisseau d'un bord à
l'autre, alors qu'il va tout droit quelque part. Le décollage et l'approche
ne changent pas — ce sont des phases à part. La durée suit la distance,
bornée entre 1,6 s et 9 s.

**La trajectoire ne se dessine plus.** Elle a été un sentier de terre, puis
un pointillé clair ; le client n'en veut plus rien voir. Les courbes
restent — ce sont elles qui portent le vol — mais `_traceVol` est vide.

**Le fond d'espace** (`.fond-espace`, `_fondEnfant`). Un dégradé de bleu
très foncé vers un bleu plus clair, avec un champ de 46 étoiles, 4 étoiles
filantes et 3 astéroïdes — les ballons de foot et les éclairs ont disparu,
ils n'avaient rien à faire dans l'espace.

**Une traînée doit être DANS L'AXE du mouvement.** La première version la
dessinait à l'horizontale alors que l'astre partait en diagonale : la queue
traînait de travers, et le client l'a vu tout de suite. La correction tient
à l'ORDRE des transformations — on tourne l'élément de son cap, PUIS on le
fait avancer le long de son propre axe des x :

```css
transform: rotate(var(--cap)) translateX(var(--course));
```

La queue, dessinée vers l'arrière de cet axe, est alors parallèle au trajet
par construction, quel que soit le cap, sans un seul calcul dans le
keyframe. Le cap est posé élément par élément, ce qui donne du même coup
des directions variées au lieu d'un défilé nord-est → sud-ouest.
Deux précautions :
- il est posé sur le **body**, pas sur le conteneur qui défile. Le fond
  d'un élément qui défile s'étire sur toute sa longueur — des milliers de
  pixels ici — et le dégradé devient un aplat qui glisse pendant qu'on
  descend ;
- il ne vaut **que pour la carte et le cours**, et se retire à chaque
  changement de page. Le menu et les réglages du garçon sont écrits en bleu
  sombre sur clair : les passer au noir demanderait de refaire tout son
  thème, ce qui n'a pas été demandé. Les libellés des étapes, eux, étaient
  déjà en blanc avec une ombre portée — ils n'attendaient que ce fond.

Deux réglages trouvés en REGARDANT, pas en devinant :
- **la flamme sort bas et étroite** (`bottom:-36%`, hauteur 48 %, largeur
  26 %). Les ailerons de la fusée descendent jusqu'au bas de sa boîte : une
  flamme qui ne dépassait que d'un cinquième restait cachée derrière eux ;
- **le décor du garçon est à 1,5** (`_HAB.decor`, variable CSS `--decor`).
  Une planète est dessinée dans un carré, elle occupait donc bien moins de
  place qu'une île peinte en paysage. Le facteur s'applique aux DEUX
  endroits qui fixent la hauteur : la règle CSS et le calcul en paysage —
  sinon les planètes redeviennent petites dès que l'écran est large.
  Les îles de la fille restent à 1 : elles sont validées.

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

### FAIT — Chantier 1 ter : le PARCOURS DE LA FILLE, ses douze mondes

**Dicté par le client le 19 août 2026, fait le même jour.** Les douze
mondes, le fond pastel, les vols, la pose sur le monde : tout est en place
et regardé sur des captures. Ce qui suit décrit ce qui a été demandé, puis
ce qu'il a fallu corriger.

#### Les douze mondes, à la place des îles

| # | monde |
|---|---|
| 1 | le monde des **licornes** — plusieurs licornes dedans |
| 2 | le monde de la **couronne** — **c'est de là que la fille porte la couronne** |
| 3 | le monde des **nuages** |
| 4 | le monde des **fleurs** |
| 5 | le monde des **cœurs** — rose, rouge… |
| 6 | le monde des **pingouins** — banquise |
| 7 | le monde des **papillons** |
| 8 | l'**île de la tortue** |
| 9 | le monde des **chats et des chiens** |
| 10 | le monde des **ours bruns** |
| 11 | le monde des **sucreries** |
| 12 | le **château de la princesse** — la fille retrouve son château |

Ce sont les libellés ET les décors : ils remplacent les îles actuelles.
Comme pour les planètes, ils vont dans `etapes`, `slugs` et `images` de
l'habillage. Le douzième clôt l'histoire — elle rentre chez elle — de la
même façon que la dernière étape du garçon clôt la sienne.

#### Le fond — FAIT

Un dégradé **du bleu en haut, au jaune au milieu, au rose en bas**, dans
des **couleurs bien pastel**, avec des dégradés francs entre les trois. Il
se pose exactement comme celui du garçon : la classe `.fond-licorne`,
allumée par `_fondEnfant` depuis `_HABILLAGES.licorne.fond`, **sur le body**
et non sur le conteneur qui défile (voir le piège plus haut), et seulement
sur la carte et le cours.

Trois choses apprises en le posant :

- **Le bleu ne passe pas directement au jaune** : mélangés, les deux
  donnent un vert d'eau qui barrait le ciel en travers, vu tout de suite
  sur la capture. Ils se croisent donc par un blanc très pâle, et le jaune
  rejoint le rose par une pêche pâle. Chaque couleur tient sa bande avant
  de passer à la suivante — un dégradé à trois arrêts seulement les
  mélangerait du haut en bas.
- **`_fondEnfant` ne connaissait que l'espace** : il retirait `fond-espace`,
  écrit en dur. Il parcourt maintenant `_HABILLAGES` et retire le fond de
  tous les univers, sinon un enfant qui change de profil garde celui de
  l'autre.
- **Ce qui est écrit sur le fond, sans rien derrière, était blanc** — le
  titre de la carte et la ligne de progression, dessinés pour l'espace du
  garçon. Sur le pastel, ils disparaissent. Côté fille seulement, ils
  passent en prune (`#4a1040`) sur un halo blanc, et la barre de
  progression, un blanc à 8 %, passe en prune très pâle. Ces couleurs-là
  sont posées EN LIGNE par le rendu : il faut `!important` pour les
  reprendre, et deux classes (`sess-gp-lbl`, `sess-gp-bar`) pour les
  attraper. **Les noms des mondes ne bougent pas** : ils sont posés SUR le
  décor, et leur ombre noire les tient sur n'importe quelle illustration.

#### Les déplacements : les mêmes que le garçon

Rien à inventer, tout est déjà écrit et se déclenche par l'habillage :
saut court en courbe, **saut lointain en ligne droite**, caméra qui suit,
pose sur le sommet du décor avec enfoncement dans la courbure, rythme.
Il suffit de mettre `poseSommet:true`, `aligne` (voir ci-dessous),
`sommets` si les décors sont dessinés, et les durées.

#### Le personnage : ce qui change vraiment

- **En vol** : la fille SUR sa licorne. Deux images selon le sens de la
  marche — c'est le client qui les a faites, il ne faut donc PAS retomber
  sur le retournement horizontal, qui a déjà été refusé côté garçon.
  Le moteur choisit aujourd'hui son inclinaison avec `aligne` ; il faudra
  y ajouter le choix de l'image selon le signe de la direction.
- **La couronne** : la fille la porte **à partir du monde 2**. Un vol qui
  PART du monde 1 se fait donc sans couronne ; tous les autres avec.
- **À l'arrivée** : elle se retrouve **devant la licorne**, et **on doit
  voir la tête de la licorne** — c'est la contrainte à respecter en posant
  les deux.

#### Les images sont déjà prêtes

Détourées de leur fond et installées dans `public/images/` :

| fichier | taille | ce que c'est |
|---|---|---|
| `fille-seule.png` | 427×614 | la fille seule, sans couronne |
| `fille-couronne.png` | 316×707 | la fille seule, avec la couronne |
| `licorne-fille.png` | 800×1024 | la fille et sa licorne, sans couronne |
| `licorne-couronne-gd.png` | 800×1194 | avec couronne, sens **gauche → droite** |
| `licorne-couronne-dg.png` | 800×1194 | avec couronne, sens **droite → gauche** |
| `licorne-seule-gd.png` | 799×839 | la licorne seule, tournée **vers la droite** |
| `licorne-seule-dg.png` | 799×840 | la licorne seule, tournée **vers la gauche** |

La correspondance avec le garçon est donc complète :

| rôle | garçon | fille |
|---|---|---|
| monture en vol | `fusee-garcon.png` | `licorne-couronne-gd/dg.png`, et `licorne-fille.png` avant la couronne |
| monture posée | `fusee-vide.png` | `licorne-seule-gd/dg.png` |
| personnage descendu | `astronaute-garcon.png` (`enfant-garcon.png` sur la Terre) | `fille-seule.png`, puis `fille-couronne.png` dès le monde 2 |

Le détourage se fait au navigateur, par le serveur local : dominante verte
quand le fond est vert, remplissage depuis les bords quand il est clair
(deux des images l'étaient), puis rognage des marges vides pour que la
boîte colle au dessin. La recette est dans l'historique de la session.

#### La pose, une fois le monde atteint

Le client a fourni la **licorne seule** dans les deux sens : la composition
est donc exactement celle du garçon, et il n'y a plus rien à deviner.
La licorne posée reste sur le monde, la fille paraît **devant** elle —
`vaisseauVide` / `pilote` dans l'habillage, `vaisseauHabite()` bascule.
La seule contrainte propre à elle : **on doit voir la tête de la licorne**.
Sa tête est à l'AVANT de l'image, du côté où elle regarde ; c'est donc en
décalant la fille vers l'arrière de la monture qu'on la dégage, et le
décalage change de côté avec le sens — contrairement au garçon, dont la
fusée est symétrique et l'enfant simplement centré.

#### Ce qui a été fait, et comment

- **Les douze décors** sont dessinés par `outils/mondes.js`, le pendant
  exact de `planetes.js` : un disque pastel par monde, ses motifs dedans,
  et le tableau des sommets imprimé à la fin, à recopier dans l'habillage.
  Ils se remplacent en déposant `public/images/monde-<nom>.png` et en
  changeant l'extension dans `images` — rien d'autre.
  Deux motifs ont dû être refaits **après les avoir regardés** : les
  licornes n'étaient que des taches blanches (il leur fallait un cerne, une
  crinière posée DERRIÈRE la tête et une corne large), et les papillons ne
  ressemblaient à rien (corps trop long, ailes trop serrées).
- **La fille sans couronne** garde son unique image de vol : elle ne sert
  qu'au premier vol, celui qui part du monde 1, et personne n'y a vu de
  manque. `couronneDes:2` dans l'habillage porte la règle.
- **Les vols** : rien à écrire, tout venait de l'habillage — saut court en
  courbe, saut lointain en ligne droite, caméra qui suit, pose sur le
  sommet avec enfoncement dans la courbure. Vérifié sur un vol du monde 12
  au monde 1 : trajet droit, inclinaison plafonnée à 24°, `licorne-couronne-gd`
  en vol, `licorne-seule-gd` posée, `fille-seule` à l'arrivée sur le
  monde 1 (pas encore la couronne), écart au sommet de −5 px.
- **Le sens de la marche** choisit le dessin (`vaisseauSens`,
  `vaisseauVideSens`), et la fille se décale vers l'ARRIÈRE de la monture
  (`piloteDecale`, 24 points de pourcentage) pour qu'on voie la tête de la
  licorne — la contrainte du client. Réglé en regardant quatre poses côte
  à côte : à 19 elle mordait sur le museau.

#### Trois pièges qui ont coûté du temps

1. **`_hautDuDessin` ne reconnaissait que `planete-…`.** Son expression
   régulière était `/planete-([a-z]+)\./` : aucun `monde-…` n'y répondait,
   la table des sommets était ignorée, et la mesure sur les pixels prenait
   le HALO pour le corps — la licorne se posait soixante pixels au-dessus
   de son monde. Elle lit maintenant le nom du fichier quel que soit son
   préfixe, et retente sans le préfixe (`monde-tortue` → `tortue`). Un nom
   à tiret (`chats-chiens`) passait déjà à la trappe avec l'ancienne.
2. **NE PAS MESURER PENDANT UNE TRANSITION D'ÉCRAN.** `#ca` porte un
   `matrix3d` le temps du basculement de page. Toutes les mesures prises
   pendant ce temps sont fausses — une boîte de 140×140 se mesurait
   88×148, et la licorne paraissait flotter très haut au-dessus de son
   monde. J'ai corrigé un défaut qui n'existait pas avant de m'en
   apercevoir. Retirer les classes `tx-*` (ou attendre) avant toute
   mesure.
3. **Un onglet caché ne bat pas**, déjà noté plus haut, mais il faut le
   relire : sans l'horloge `MessageChannel`, un vol lancé depuis un onglet
   en arrière-plan reste figé à son point de départ, et on croit que le
   moteur est cassé.

Et la consigne qui vaut toujours : sur ce qui n'est pas écrit ici, **on
demande, on n'invente pas**. C'est ce qui a coûté le plus cher sur le
hā milieu.

### Chantier 2 — Traductions : FAIT (20 août 2026)

**Tout l'enfant est traduit dans les treize langues : 302 phrases.**

- Toutes les phrases des cours enfant passent par `te()` (le texte dit) ou
  `TB()` (le texte écrit). **La clé EST la phrase française** : rien à
  inventer, rien à décaler, et une phrase oubliée s'affiche en français au
  lieu de disparaître.
- Le mot mis en avant est marqué `<b>…</b>` dans la phrase et prend la
  couleur de l'univers au dernier moment. Avant, il était collé par
  concaténation (`'…'+b('mot')+'…'`) : impossible à traduire, l'ordre des
  mots change d'une langue à l'autre.
- **La voix suit la langue** (`_voixEnfant()`), au lieu d'être forcée en
  `fr-FR`.
- La table vit dans `outils/traductions-enfant*.json` — un fichier par
  cours — et s'écrit dans la page par
  `node outils/injecte-traductions.js`, qui vérifie que chaque clé existe
  encore dans le code et que le balisage `<b>` est équilibré dans les
  treize langues. **On traduit dans le JSON, jamais dans le HTML.**
- `node outils/phrases.js` relève ce qui reste en dur.

**Fait** : les trois cours (voyelles, prolongations, lettres), les libellés
du moteur de scène, ET les mots d'univers — mission ou aventure, planète ou
monde, les douze noms de mondes, les douze noms de planètes. Ces derniers
passent par `_habTraduit`, qui traduit une COPIE de l'habillage : les
`slugs` et les `sommets`, eux, ne bougent pas — ce sont des adresses et des
mesures, pas du texte. Vérifié : en turc, la carte s'affiche traduite et
`_slugEtape` répond toujours `licornes`.

**Ce qui reste du chantier 2** : l'interface adulte, déjà à 95–98 %, et les
quelques phrases qui se composent avec une variable (« Bravo ! Tu as fini
ta {île} ! ») — traduites en morceaux, ce qui suffit en français, anglais,
espagnol, allemand, mais reste perfectible en turc, en hindi et en ourdou,
où l'ordre des mots diffère. Les reprendre demanderait un vrai gabarit à
trous.

### Chantier 2 (rappel de la demande d'origine)
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

- **Le disque des sucreries était NOIR.** En réécrivant ce monde, ses cinq
  couleurs (`clair`, `moyen`, `fonce`, `halo`, `trait`) avaient sauté : les
  arrêts du dégradé sortaient en `stop-color="undefined"`, et un dégradé
  invalide se peint en noir. Les motifs, eux, s'affichaient — c'est ce qui
  rendait la panne trompeuse.
  **Contrôle ajouté au réflexe** : après un `node outils/mondes.js`,
  chercher `undefined` dans les vingt-quatre fichiers produits, et lire le
  pixel du centre de chaque disque. Un monde noir se voit en une ligne.

## Fait récemment (ne pas refaire)

- **Les points d'une boucle se posent SUR L'ANNEAU, par leur angle — v143.**
  C'est la clé de toute cette série. Porter un geste d'une forme à l'autre en
  étirant sa boîte sort les points de l'anneau : ils tombent dans le trou ou
  en dehors, `_cheminSurEncre` les rattache à la branche la plus proche —
  souvent la MAUVAISE — et la boucle se trace du mauvais côté. Le client
  voyait « la partie droite de la boucle avant la partie gauche », et la
  distance moyenne à l'encre restait pourtant bonne : elle ne dit pas SUR
  QUELLE branche on est tombé.
  La méthode qui marche : trouver le TROU de la boucle (les points vides
  entourés d'encre dans les quatre directions), prendre l'ANGLE de chaque
  point du modèle autour de son trou, puis reposer le point au même angle sur
  l'anneau de la forme visée, au milieu de son épaisseur. L'ordre de rotation
  est alors le même par construction.
  Appliqué au wāw fin (9 points) et au ṭāʾ fin (4 points de boucle).

- **« fin = isolée + trait » n'est pas vrai au pixel près — v142.** Le client
  l'a vu à l'œil : entre le trait de liaison et la boucle, le wāw final a un
  PETIT HORIZONTAL de plus, que l'isolé n'a pas. Relevé de l'encre colonne par
  colonne : de x = 0,26 à x = 0,12 la forme finale montre un trait plat
  d'épaisseur constante (0,087), et la boucle ne commence qu'à 0,10. Le geste
  sautait par-dessus, et ces pixels — sans point de passage — se remplissaient
  n'importe quand.
  **Avant de porter un geste d'une forme à l'autre, relever le profil de
  l'encre de la forme cible** (épaisseur colonne par colonne) : il montre les
  morceaux que le modèle n'a pas.

- **Deux pièges de geste, vus seulement en regardant les images du banc — v141.**
  *Un* : couper un geste en DEUX traits fait pousser deux morceaux à la fois.
  Le révélateur classe les pixels par leur point de passage le plus proche ;
  avec un lever de crayon entre le trait de liaison et la boucle, le départ de
  la boucle se remplissait en même temps que le trait. Le wāw fin est
  maintenant d'un seul tenant, comme l'isolé qui lui sert de modèle.
  *Deux* : un geste doit couvrir TOUTE l'encre de la forme. Le ṭāʾ fin
  s'arrêtait à −0,188 alors que sa base descend à −0,411 : dans la forme
  finale cette partie n'est pas un trait de liaison, c'est la lettre, et sans
  point de passage elle se remplissait n'importe quand.
  **Le banc `/banc` sert à ça** : il charge l'application réellement servie par
  le site et anime les formes en cause à côté de leur modèle. La liste par
  défaut (`AREVOIR`, dans `app/banc.html`) se change à chaque série de
  corrections ; `?tout=1` remet l'alphabet entier.

- **Porter un geste d'une forme à l'autre : il faut le METTRE À L'ÉCHELLE,
  pas seulement le décaler — v139.** Le wāw : la boucle de la forme finale
  est bien plus PLATE que celle de l'isolée (0,225 de haut contre 0,296),
  pour une largeur presque identique. Les points de l'isolée, même décalés,
  sortaient par le haut de l'encre ; `_cheminSurEncre` les rabattait, et la
  boucle ne se traçait plus dans le sens des aiguilles d'une montre. On porte
  maintenant les neuf points de la boucle sur la boîte de la boucle FINALE
  (0,98 en x, 0,76 en y), et la queue garde sa propre échelle verticale —
  mesurer la boîte du corps entier fausse le calcul, la queue et la boucle
  n'ont pas le même rapport.
  Le ṭāʾ fin est le geste du MILIEU privé de son dernier point — le trait de
  liaison qui suit la lettre, absent de la forme finale — porté sur la boucle
  de celle-ci (1,037 en x).
  **Le bon contrôle est l'écart MOYEN de chaque point à l'encre, pas le pire.**
  Relevé : wāw fin 0,004 (modèle 0,002), ṭāʾ fin 0,004 (modèle 0,006), ʿayn
  fin 0,007 (modèle 0,005).

- **Recopier les points d'une forme sur une autre ne suffit PAS — v138.**
  Les coordonnées d'un geste partent du CENTRE DE LA CHAÎNE. Deux formes de
  la même lettre n'ont pas la même largeur, donc le corps de la lettre n'y
  est pas au même endroit : les points recopiés tombent à côté de l'encre, et
  `_cheminSurEncre` les rabat sur le trait le plus proche — le tracé ne
  ressemble alors plus au modèle, alors que la table dit le contraire.
  C'est ce qui faisait que le ʿayn fin ne ressemblait pas au ʿayn milieu bien
  qu'ayant « les mêmes points ». Mesuré : sa tête est 0,028 em plus à GAUCHE
  que dans la forme milieu (l'ancien code la mettait 0,03 à droite), et sa
  grande boucle 0,007 plus à droite que celle de l'isolée.
  **Le contrôle à faire après toute retouche de geste : la distance de chaque
  point à l'encre la plus proche.** Elle doit rester du même ordre que celle
  de la forme modèle — au-delà, le moteur reprend la main. Relevé après
  correction : ʿayn fin 0,040 contre 0,030 pour le milieu ; wāw fin 0,028
  contre 0,005 pour l'isolé ; ṭāʾ début 0,033, fin 0,018, isolé 0,040.

- **Le ṭāʾ isolé commençait par son petit trait de gauche — v137.** Le geste
  partait de −0,34, le bout gauche : ce trait se remplissait avant la boucle.
  Même correction que sur la forme début, déjà validée — on part du pied de
  la boucle, on la fait, PUIS on file vers la gauche, et la barre verticale
  vient en dernier. Mesuré : à 15 % du tracé, le bord gauche de l'encre passe
  de −0,34 à −0,12 em, la valeur de la forme début.
  **Méthode qui a marché : mettre chaque forme corrigée en regard de sa forme
  RÉFÉRENCE, aux mêmes pourcentages d'avancement.** Le défaut saute aux yeux
  en une image, là où quatre échanges n'y étaient pas parvenus.

- **L'animation du modèle passait en un éclair — v136.** Le client ne voyait
  pas les corrections d'ordre de tracé, et pour cause : le révélateur découpe
  le tracé en TROIS temps — le corps, les points, la voyelle — et le temps
  était réparti sur les trois quoi qu'il arrive. Un wāw seul n'a ni point ni
  voyelle : son tracé se jouait dans le premier tiers, **0,7 seconde**, et
  les 1,5 restantes ne montraient rien. Le temps se répartit maintenant sur
  les seuls temps qui ont du contenu, le tracé dure 2,6 s, et il **se rejoue**
  après une pause tant que l'élève n'a pas posé le doigt.
  **Leçon : vérifier une animation, c'est mesurer sa COURBE dans le temps,
  pas seulement son image finale.** Le contrôle « le modèle est bien peint »
  passait, et l'animation était pourtant invisible.

- **Les dix dessins du 22 août — v134.** La fille est maintenant voilée, sur
  sa licorne, avec et sans couronne, dans les deux sens. Ils arrivaient en
  **JPG sur fond blanc** : posés tels quels sur le dégradé pastel on aurait vu
  un rectangle. `outils/detoure.py` enlève le fond — mais pas tout ce qui est
  blanc, le corps de la licorne l'est aussi : le fond se reconnaît à ce qu'il
  TOUCHE LE BORD, on part des quatre côtés et on n'avance que dans le blanc.
  Les bords sont adoucis, l'image recadrée sur le dessin. Rejouable :
  `python3 outils/detoure.py`.
- **Le `?v=` est indispensable** quand une image change SANS changer de nom :
  sinon le navigateur et le service worker gardent l'ancienne. Les huit
  dessins du personnage sont en `?v=133`.
- **Le cadrage de la fille debout a dû suivre.** Les nouveaux dessins sont
  plus hauts — elle y fait toute la hauteur de la composition — et à l'ancien
  cadrage elle masquait la tête de la licorne, que le client veut voir.
  Attention : `gauche` est la position CENTRÉE, `piloteDecale` la déplace
  ensuite de ±23 points selon le sens de marche. Une valeur de 2 envoyait la
  fille hors cadre.
- **La taille de la licorne posée et de la fille debout SE MESURE, elle ne se
  règle pas à l'œil.** Les dessins du client sont tous à la même échelle :
  dans la composition « licorne avec fille » (812 × 1327), la licorne seule
  fait 840 de haut et la fille 1327 — soit 63 % et 100 % de la boîte. Il
  suffit de reporter ces deux nombres (`montureEchelle` et `piloteBoite`)
  pour qu'elles gardent, posées, la taille qu'elles ont ensemble. Elles
  étaient à 78 % et 74 %, d'où « la licorne trop grosse et la fille trop
  petite ».

- **Quatre ordres de tracé, dictés par le client — v133.** wāw fin et milieu :
  le trait de liaison, puis EXACTEMENT le geste de l'isolée. Attention, les
  points d'un geste sont posés par rapport au centre de la CHAÎNE : la forme
  fin étant plus large de 0,088 em, le corps du wāw s'y trouve 0,044 em plus
  à gauche, et les points recopiés doivent être décalés d'autant, sinon ils
  tombent à côté de l'encre.
  ṭāʾ début : la boucle d'abord, le trait de liaison ensuite, la barre
  verticale en dernier — le geste partait du bout gauche, donc le trait se
  remplissait avant la boucle.
  ṭāʾ fin : comme le début du ṣād fin. Le geste filait jusqu'à −0,08 avant de
  monter, ce qui remplissait le petit trait de gauche trop tôt.
  ʿayn fin : le geste du milieu à l'identique, puis la grande boucle de
  l'isolée à la place de la sortie à gauche — elle tournait à l'envers.
  **Règle du client, à suivre sans l'interpréter : une forme juste sert de
  modèle à ses sœurs, on recopie ses points, on ne réinvente pas un tracé.**

- **Une coupe VERTICALE ne peut pas séparer certaines formes — v131.** C'est
  le client qui a fini par nommer le défaut : « certaines parties de la lettre
  sont à la même position sur une ligne d'abscisse, mais ordonnée
  différente ». Le jīm remonte à 45° après son trait ; le kāf croise sa propre
  diagonale. Aucune ligne verticale ne peut y passer, et j'ai perdu quatre
  tentatives à chercher le bon POURCENTAGE alors que le problème n'était pas
  là.
  Ces neuf formes (`_MASQUE_FORME` : jīm/ḥāʾ/khāʾ fin et milieu, kāf milieu,
  ṭāʾ/ẓāʾ milieu) sont découpées par leur FORME : on rastérise la forme
  attachée et sa forme de base — fin → isolée, milieu → début —, alignées par
  leur bord gauche et sur la ligne d'écriture, et ce que l'attachée a EN PLUS
  est le trait de liaison. La base est dilatée de 2 px avant comparaison,
  sinon les écarts de rendu laissent un liseré le long de la lettre.
  Le résultat est peint sur deux calques `<canvas>` posés sur un texte
  invisible qui réserve la boîte exacte du glyphe : aucune largeur calculée
  à la main. L'animation de l'enfant s'y branche pareil.
  **Toutes les autres lettres gardent la coupe droite** — nūn, bāʾ, yāʾ,
  kāf fin, ṭāʾ fin sont déclarées justes par le client : ne pas y toucher.
  Deux pièges rencontrés. Un canvas ne sait pas lire `var(--green)`, il
  retombe sur le noir : `_enRVB` résout la variable sur la racine avant de
  peindre. Et le POINT d'une lettre ne tombe pas au même endroit d'une forme
  à l'autre — il ressortait donc « en plus » et passait en blanc. Un trait de
  liaison tient au bord droit et est d'un seul tenant : on ne garde du masque
  que la tache qui part de la droite, et les points restent à la lettre quelle
  que soit leur hauteur.
  Coût mesuré : 25 à 50 ms par forme la première fois, puis rien.

- **Toutes les isolées étaient BLANCHES au lieu de bleues — v130.** Le client
  l'a signalé trois fois avant que je trouve : la couleur était posée sur
  `.pos-ar`, qu'une règle `!important` de l'habillage adulte (ligne ~1703)
  force en blanc. Les autres formes y échappaient parce que `_formeCoupee`
  pose leur couleur sur une balise INTÉRIEURE. L'isolée fait pareil désormais.
  **Leçon : ne jamais poser une couleur sur `.pos-ar` ni sur `.pos-lbl`.**
- **La rangée de voyelles se lisait à l'envers.** `direction:rtl` : en arabe
  on écrit de droite à gauche, la première voyelle va à droite.
- **Les voyelles offertes viennent des `harakat` de la lettre.** Le client :
  « sers-toi des lettres en forme de fleur ». La fleur est bâtie sur cette
  table, et elle porte déjà toutes les spécificités : l'alif n'y a pas de
  tanwīn, le tā marbūṭa pas de soukoun. La liste fixe et la table
  `_SANS_SOUKOUN` ont disparu — rien à tenir à jour à la main.
- **La hamza a enfin ses voyelles.** Elle reçoit volontairement une liste de
  formes VIDE (elle a son propre affichage à quatre supports), et le bloc
  entier était sauté. Les formes restent conditionnelles, les voyelles non.
- **Page de vente** : « 12 leçons détaillées » → « Leçons détaillées »,
  « Aide 24/7 » → « Accompagnement 24/7 », et la promesse devient « La
  meilleure formation pour lire l'arabe » — dans les treize langues, sinon
  le compte « 12 » resterait affiché ailleurs. Trois langues annonçaient
  « 9 langues » : corrigé.

- **Une rangée de voyelles sous les formes, dans le module d'écriture — v129.**
  Trois simples, leurs trois doublées, le soukoun, et « sans voyelle » pour
  revenir à la lettre nue. Le modèle à tracer prend la voyelle choisie, et
  comme le révélateur écrit le corps, puis les points, puis la voyelle, elle
  arrive en dernier — dans l'ordre où la main écrit.
  La marque se glisse APRÈS la lettre, pas au bout de la forme : dans
  « ـبـ » la lettre est au milieu, et posée au bout la voyelle tomberait sur
  le trait de liaison.
  Deux règles, demandées par le client :
  · une voyelle **doublée** ne tombe qu'en fin de mot — elle éteint les
    formes début et milieu, et ces formes éteignent les doublées ;
  · le **tā marbūṭa** n'a pas de soukoun (`_SANS_SOUKOUN`, une table : la
    prochaine exception ne coûtera qu'une ligne).
  Une voyelle impossible est ÉTEINTE, pas cachée : l'élève voit qu'elle
  existe et qu'elle ne va pas là.

- **Le modèle s'écrit tout seul dans les canvas adulte — v128.** Il a fallu
  d'abord lui donner SON CALQUE : le modèle partageait le canvas de l'élève,
  donc le redessiner effaçait son écriture, et une animation était
  impossible. C'est l'architecture de l'interface enfant. Effet de bord
  gagné au passage : masquer puis rafficher le modèle ne détruit plus le
  travail en cours (mesuré : 1252 pixels d'encre avant, 1252 après).
  Le tracé réutilise `_revelateur` / `_reveleJusqua`, déjà réglés pour
  l'enfant — le corps, puis les points, puis la voyelle. `_revelateur` prend
  une couleur en 9ᵉ argument ; sans elle il garde son gris-bleu.
  Deux pièges refermés : `doReset` comptait sur `redraw()` pour vider
  l'encre, il doit maintenant le faire lui-même ; et la mesure des voyelles
  seules doit se prendre sur le contexte du MODÈLE, seul endroit où la
  police arabe est posée.
- **Le blanc s'arrête au pied de la dent.** Le nūn, que le client donne pour
  parfait, s'arrête exactement là : 24 px au milieu. La petite verticale qui
  remonte appartient à la lettre. Le bāʾ et le yāʾ ont le même pied
  (0,171 em au milieu, 0,214 pour le bāʾ final).

- **La coupe du trait de liaison est en L, plus verticale — v127.** Une coupe
  droite ne sait pas séparer un POINT d'un trait : le point du bāʾ et les deux
  du yāʾ, au milieu, se trouvent sous le trait de liaison et partaient en
  blanc avec lui. Le trait n'est donc blanchi qu'AU-DESSUS de la ligne
  d'écriture — c'est là qu'il vit, entre −0,09 et 0 em. Tout ce qui pend sous
  la ligne reste à la lettre. `_basLigne(interligne)` dit où tombe la ligne de
  base dans une boîte de texte : la police monte à 1,34 em et descend à 0,70,
  donc la ligne est à `interligne/2 − 0,32` em du bas.
- **Cinq familles ont une longueur de liaison imposée** (`_LIAISON_EM`), le
  reste de l'alphabet garde la mesure automatique — le client a insisté :
  ne pas toucher aux lettres qui sont justes. La clé de lecture est le nūn,
  sa référence : il a la MÊME longueur sur ses deux formes. Le kāf en avait
  28 px en finale et 23 au milieu, le ṭāʾ 23 et 26 — leur milieu reprend
  maintenant la valeur de leur finale. Le jīm, le bāʾ et le yāʾ gardent un
  segment plat sur la ligne après le trait, sans creux où la mesure puisse
  s'arrêter : valeurs lues à l'œil (jīm 0,18/0,26 ; bāʾ 0,34/0,26 ;
  yāʾ milieu 0,26).

- **Le ʿayn et le ġayn n'ont plus de code couleur — v126.** Leurs quatre
  formes s'apprennent séparément (le cours enfant leur saute déjà le tableau
  de déduction) : les colorer annonçait une parenté qui n'existe pas. Toutes
  blanches, dans les deux interfaces.
- **Les points du yāʾ final revenus.** `clip-path:inset(0 …)` coupait aussi
  au ras de la boîte, en haut et en bas : les deux points, qui pendent SOUS
  la ligne, disparaissaient. Les marges sont maintenant négatives partout
  sauf sur la coupe verticale, la seule qui nous intéresse.
- **Les lettres des canvas adulte sont posées sur la ligne d'écriture.**
  Elles étaient remontées de 8 % de leur taille, au jugé. L'adulte appelle
  maintenant `_descenteGlyphe`, la fonction de l'interface enfant que le
  client trouve juste : ligne de base sur la ligne, et seuls les jambages du
  jīm, du ḥāʾ et du khāʾ isolés descendent (0,11 em).
- **Les voyelles seules respirent** : le jour est passé de 0,08 à 0,20 em.

- **Le trait de liaison ne prend plus la couleur de la lettre — v124.**
  Le cours enseigne « fin = isolée + — » et « milieu = début + — », avec
  l'isolée en bleu et le début en vert. Un bout du trait partait pourtant
  en couleur, dans les deux interfaces.
  Côté adulte le partage n'existait pas du tout : on colorait `p.g` dans la
  chaîne, mais la forme attachée porte son trait d'entrée DANS son propre
  dessin. Côté enfant le partage existait mais se calculait sur les largeurs
  d'AVANCE — une mesure qui ne dit rien de l'encre : −12 % sur le ʿayn (rien
  n'était gris) et +34 % sur le mīm (le gris mordait la lettre).
  `_partLiaison` regarde maintenant l'ENCRE : le trait de liaison est une
  barre posée sur la ligne d'écriture, la lettre quitte cette bande — vers le
  haut pour le ʿayn, vers le bas pour le bāʾ. On part du bord droit tant que
  la colonne tient dans la bande d'un tatweel seul. Repli pour le ʿayn et le
  ġayn, qui plongent dès leur premier trait : la longueur d'un tatweel.
  Vérifié à l'œil sur les 28 lettres, formes fin ET milieu.
  `_formeCoupee(forme,couleurCorps,couleurTrait)` sert les deux interfaces.
- **Les voyelles seules se posent contre la ligne d'écriture.** Dans le canvas
  du cours des voyelles, les décalages étaient devinés — et les mêmes pour
  tous les signes, alors que leur encre n'est pas à la même hauteur (à 120 px
  la fatha monte à 104, la damma à 119, le soukoun à 110). Chacune tombait à
  une distance différente de la ligne, et toutes trop loin. On demande
  maintenant à la police où est son encre : les huit signes ont le même petit
  jour de 8 % de la taille, au-dessus ou en dessous selon leur nature — et
  c'est la MESURE qui dit de quel côté, plus une liste de codes à tenir.
- **La page des cours de l'adulte est un parcours, plus une grille.** Douze
  cartes identiques qui scintillaient toutes pareil ne disaient ni où l'on en
  est, ni ce qu'il y a dans chacune. Les leçons sont enfilées sur un rail —
  doré derrière soi, éteint devant —, groupées en deux chapitres, avec une
  tête qui compte les leçons faites et les lettres apprises. Chaque carte dit
  ses lettres en grand ET leurs noms (بَاء · تَاء · ثَاء). Seule la leçon en
  cours respire : l'œil va là où il y a du travail. Six textes nouveaux dans
  les treize langues (`outils/textes-adulte.json`).

- **Les phrases à trous — v123.** Les phrases fabriquées à la colle
  (`'Bravo ! Tu as fini ta '+mission+' !'`) donnaient un résultat correct en
  anglais ou en espagnol et bancal en turc, en hindi et en ourdou, où les
  mots ne tombent pas dans cet ordre. Elles passent maintenant par `teF()` et
  `TBF()` : la phrase entière est une clé, avec des trous `{mission}`,
  `{lettre}`, `{n}`. Chaque langue place les trous où sa grammaire les veut.
  Une soixantaine de sites de code réécrits, les morceaux devenus inutiles
  retirés du corpus.
- **Les derniers mots français du moteur enfant.** Quatre fuites que le
  parcours automatique a débusquées, invisibles à la lecture :
  - `NOMS=['ISOLÉE','DÉBUT','MILIEU','FIN']` s'affichait tel quel au milieu
    du turc. Deux listes traduites maintenant, `NOMS` et `NOMSMIN` :
    **ne jamais `toLowerCase()` un mot traduit** — en turc le İ perd son
    point et devient un autre son.
  - `nomForme()`, `OU[0]`, `combien` (« ses 4 formes ») et les étiquettes du
    tableau de déduction : tous branchés sur `te()`.
  - Le bouton **EFFACER** du canvas restait français dans les treize langues.
  - Deux écrans des prolongations passaient `pa('au-dessus')` : `pa()` colore,
    il ne traduit pas.
- **La voix lisait du français dans toutes les langues.** Le texte affiché
  passait par `t()`, mais l'argument de `speakText` était une phrase française
  écrite en dur : la voix turque lisait du français avec un accent turc. Neuf
  phrases, treize langues, dans `outils/voix-adulte.json`, posées dans la
  table `T` par `node outils/injecte-voix.js` (rejouable, idempotent).
- **`_maj()` remplace `charAt(0).toUpperCase()`** sur les mots traduits :
  `toLocaleUpperCase(st.lang)` sait que le turc met un point sur le İ.

- **La traînée de la licorne est un RUBAN, pas un chapelet de points.** Le
  client la voulait « comme celle d'un avion ». Chaque position est donc
  reliée à la précédente par un segment arrondi (`ruban`), assez épais pour
  que deux voisins se chevauchent : un segment tous les neuf pixels pour
  quinze à dix-huit d'épaisseur. Le trait est continu, change de couleur en
  avançant, et s'efface par où il est venu. Mesuré en plein vol : écarts de
  4 à 9 px pour 18 px de large — jamais de trou. La densité a été divisée
  par deux après coup (175 éléments vivants d'un coup, c'est trop pour un
  téléphone). Le feu de la fusée ne bouge pas : il est validé, et seul
  l'habillage qui porte `traineeArc` passe au ruban.
- `chienchat1` remplacé par **`chienchat3`**, l'image que le client a
  redéposée.

- **Quatre retouches demandées le 20 août au soir.**
  - **Les sucreries en pièces détachées** (`sucrerie-*.svg`, dix fichiers
    écrits par `outils/mondes.js`). Le paysage seul est recadré par
    `cover` : on n'en voyait presque rien dans le cours. Elles sont
    maintenant posées AU PREMIER PLAN, une rangée en bas de l'écran.
  - **La couronne est toujours dans son monde**, à l'intérieur du cours —
    une grande sur son coussin, deux petites sur les côtés. Sur la carte
    elle disparaît quand la fille la gagne ; dans le monde, elle reste.
  - **L'ourson que le grand écrasait** a rejoint les deux de droite, un peu
    en retrait derrière eux.
  - **La traînée de la licorne est un ARC-EN-CIEL** (`traineeArc`) : chaque
    grain prend la couleur suivante de l'arc, plus gros et légèrement
    flouté — une fumée colorée au lieu du nuage blanc. Le garçon garde la
    sienne, l'habillage seul décide.

- **Dans un monde, le ciel de la carte s'éteint.** Le calque d'ambiance de
  la fille (`#girl-bg-anim` : étoiles, cœurs, nuages, licornes qui dérivent)
  est allumé sur TOUT le profil : on le retrouvait donc par-dessus la
  banquise et la clairière. Une règle à trois classes l'éteint pendant
  qu'on est dans un monde — c'est le paysage qui tient ce rôle une fois
  qu'on y est entré. Vérifié sur le cycle : menu (allumé) → monde (éteint)
  → retour carte (rallumé).

- **LE PAYSAGE D'UN MONDE, ET LE PIÈGE DE LA SPÉCIFICITÉ.** Après l'avoir
  fait repasser DERRIÈRE le cours (`z-index:-2`, inséré avant `#root`), il
  ne se voyait plus du tout : `body`/`#root` peignaient toujours le dégradé
  pastel par-dessus. La règle qui les rend transparents dans un monde avait
  le MÊME poids que celle du pastel (`body.profile-girl.fond-licorne`,
  `!important` des deux côtés) et était écrite AVANT elle dans la feuille —
  à égalité, la dernière gagne. Il a fallu une classe de plus.
  **La leçon** : une règle `!important` ajoutée plus haut dans le fichier ne
  bat pas une règle `!important` de même poids écrite plus bas. Vérifier la
  couleur CALCULÉE, pas la règle qu'on vient d'écrire.
  Un `background-color` de repli est posé sur le calque : le paysage est un
  fichier, et sans lui on voit le noir de la page pendant qu'il charge.
- **La carte efface le paysage en revenant** (`_decorMonde(ca,false)` en
  tête de `renderSessionsMap`) : `_fondEnfant` ne s'occupe que du dégradé,
  le monde quitté serait reste derrière la carte.
  Cycle vérifié d'un bout à l'autre : carte pastel → monde (fond du monde,
  body transparent) → retour carte pastel → menu rose.

- **Le décor d'un monde est un FOND, pas un premier plan — 20 août 2026.**
  En le déplaçant sur le `body` (pour qu'un `position:fixed` soit vraiment
  fixe), il est passé DEVANT le cours : `#root` est lui aussi positionné, et
  **deux éléments positionnés sans `z-index` se peignent dans l'ordre du
  document**. Le décor, ajouté après, gagnait — on ne voyait plus que lui.
  Il est maintenant inséré AVANT `#root`, en `z-index:-2` (les bêtes en
  `-1`), et `#root` devient transparent dans un monde pour le laisser voir.
  Contrôlé en interrogeant cinq points de l'écran : c'est bien le cours qui
  répond partout.
- **Ce qui marche est ancré au BAS de l'écran** (`b:` au lieu de `y:` dans
  les compositions). Placés à un pourcentage du HAUT, les ours, les chiens,
  les chats et les pingouins se retrouvaient suspendus en l'air dès que
  l'écran changeait de forme. Les pingouins arrivent toujours de loin, mais
  leur `transform-origin` est au sol : ils grossissent en posant les pieds.

- **Quatrième passe, 20 août 2026 — les retours du client, un par un.**

  - **UN `position:fixed` DANS `#ca` N'EST PAS FIXE.** Le décor d'un monde y
    était posé ; `#ca` défile et reçoit une animation de `transform` à
    chaque changement d'écran, ce qui en fait le bloc conteneur de ses
    descendants fixes. Résultat : en descendant dans un cours, le bas de la
    page laissait voir le fond de la carte. Le décor et les bêtes vivent
    maintenant sur le **body**. C'est le genre de défaut qu'on ne trouve
    qu'en faisant défiler pour de vrai.
  - **Le menu du garçon est dans l'espace**, comme sa carte. Ce que ETAT
    disait « demanderait de refaire tout son thème » tient en fait dans une
    poignée de règles : sur `body.fond-espace`, ses titres passent en clair
    et ses cartes prennent un bleu de nuit. Vérifié : plus aucun texte
    sombre posé directement sur l'espace.
  - **La fusée CONTINUE son tour en se posant.** Elle amorçait sa rotation
    puis repartait en sens inverse pour se remettre droite — visible en
    arrivant sur une planète plus basse. Le redressement vise désormais le
    tour complet SUIVANT dans le sens où elle tourne déjà, au lieu de
    ramener l'angle vers zéro.
  - **Une composition par monde** (`scenesBetes` est devenu un tableau de
    placements) : un ours géant et cinq petits, les chiens-chats une fois
    chacun mais énormes, les tortues posées en bas où on les voit, les
    papillons qui traversent l'écran, les pingouins qui arrivent de loin en
    grossissant et en se dandinant, les licornes qui vont dans tous les
    sens. Les sucreries, elles, sont semées sur tout le paysage en trois
    rangées régulières.
  - Retirés à sa demande : les deux grandes fleurs du monde des papillons
    (elles sont passées au monde des fleurs, en plus grand), et l'emblème
    en emoji au bout de la jauge côté fille.

- **Le monde devient le FOND D'ÉCRAN — 20 août 2026.** Entrer dans un monde
  ne change plus seulement un filigrane : le dégradé pastel de la carte
  laisse la place au **paysage du monde**, plein cadre. La banquise et ses
  blocs de glace chez les pingouins, la plage et son ressac chez les
  tortues, la clairière et ses sapins chez les ours, le champ de lavande
  chez les papillons, le pays de sucre, la salle du trône, le château.
  - `outils/mondes.js` écrit un `ciel-<nom>.svg` par monde, large
    (1400 × 900) et servi en `background-size:cover` : il se recadre seul du
    téléphone au bureau, donc **ce qui compte doit rester au milieu** — les
    bords sont les premiers rognés. Chaque monde donne son `ciel` (trois
    couleurs), sa `terre` et son `paysage`.
  - La scène transparente d'avant (`scene-*.svg`) est **supprimée** : dans
    un monde, on veut le monde, pas un filigrane.
  - **Ce qui marche reste au sol.** Les bêtes du client sont semées à des
    places fixes, mais deux tables : `AU_SOL` pour ce qui a des pattes,
    `EN_VOL` pour les papillons. Un ours accroché en plein ciel se voit tout
    de suite — c'était le cas du premier jet.
  - L'écran du choix de la lettre reçoit un **voile clair** : ses titres se
    posaient sinon directement sur la banquise.
  - **Piège de l'outil de capture, pas du site** : en peignant un écran dans
    un canevas, il faut CHARGER toutes les images puis peindre dans l'ordre.
    À dessiner au fil des `onload`, le fond — plus lourd — arrive en dernier
    et recouvre tout le reste ; j'ai cru deux fois que les bêtes avaient
    disparu.

- **Les mondes de la fille, troisième passe — 20 août 2026, ses images.**
  Le client a fourni douze illustrations (`bete-*.png` détourées, et
  **quatre GIF animés** de papillons) et demandé que les mondes s'en
  servent. Ce qui a été fait :

  - **Ses bêtes sont posées SUR leur monde** (`betesEtape`, `_poserBetes`),
    en pourcentage du DESSIN du monde — pas de la carte, qui est plus
    haute : le décor est peint dans un carré centré par `object-fit`, et
    c'est ce carré qui compte. Les animaux dessinés de ces cinq mondes ont
    été **retirés** : ils faisaient doublon derrière les siens. Le décor
    garde son sol — banquise, sable, herbe, clairière.
  - **Un monde où l'on entre en est PLEIN** (`scenesBetes`) : douze
    papillons volent dans le monde des papillons, des ours chez les ours,
    et ce **dès l'écran du choix de la lettre**, pas seulement dans le
    cours. Les places sont fixes et longent les bords, le milieu restant au
    cours. `#ca .boy-wrap{position:relative;z-index:1}` : sans cette règle,
    un élément positionné à `z-index:0` se peint AU-DESSUS du contenu
    ordinaire, et les papillons passaient devant la leçon.
  - **Les GIF animés marchent en DOM, pas en SVG.** Un `<img>` qui charge un
    GIF l'anime ; le même GIF encastré dans un SVG, non. C'est pour cela que
    les bêtes sont des balises `<img>` posées par-dessus le décor, et non
    des `<image>` dans le fichier SVG.
  - **Les cœurs vivent** (`vitcoeur` : ils paraissent, grossissent, battent
    et s'effacent), **les nuages traversent** leur monde et reviennent par
    l'autre bord (`traverse` — le disque les découpe, ils disparaissent donc
    tout seuls), et **les sucreries sont deux fois plus nombreuses**.
  - **Le papillon a quitté le monde des fleurs et la fleur celui des
    papillons**, à la demande du client.
  - **Un décor retouché ne se voit pas sans `?v=`.** Les douze images sont
    servies avec un numéro de version (`monde-*.svg?v=111`), sinon le cache
    du navigateur ET du service worker continuent de servir l'ancienne : je
    l'ai cru cassé deux fois avant de comprendre. **Il faut monter ce
    numéro à chaque retouche des décors.**

- **Le parcours de la fille, deuxième passe — 20 août 2026.** Le client a
  regardé le premier jet et a tout repris point par point. Ce qui a changé,
  et pourquoi :

  - **La monture posée avait changé de taille.** En vol, l'image porte la
    licorne ET la fille : elle est haute, et `object-fit:contain` la réduit
    d'autant. Posée, la licorne seule est presque carrée et remplissait
    toute la boîte — elle paraissait deux fois plus grosse, et la fille,
    dessinée à part, deux fois plus petite. `montureEchelle` (0,78) réduit
    la monture posée, ancrée en BAS et au CENTRE ; la boîte de la fille est
    passée à 55 × 88 %. Réglé en comparant les deux côte à côte sur une
    capture, pas au jugé.
  - **On arrive DIRECTEMENT au sommet.** Les segments joignent les milieux
    des étapes : la courbe déposait donc la monture au milieu du décor, et
    une « approche » la faisait remonter au sommet — « ils arrivent en bas
    du monde, ralentissent, puis remontent ». Le dernier segment est
    maintenant écarté vers le sommet (`versSommet`, l'écart croît en t²),
    le vol droit vise le sommet, et l'approche est sautée quand il ne
    reste rien à parcourir.
  - **En revenant d'un cours, on est SUR l'étape qu'on vient de quitter**,
    des deux côtés. `arab_ile` était mis en concurrence avec l'étape la
    plus avancée jamais entamée : un enfant qui revenait sur son troisième
    monde retrouvait sa monture posée sur le huitième. L'étape quittée
    gagne désormais sur tout le reste. Le client le demandait depuis
    longtemps.
  - **Le ciel de la fille** : plus de papillons, de fleurs ni de licornes
    en emoji. À la place, cinq de SES licornes, qui dérivent chacune dans
    sa direction comme les comètes du garçon. Il faut **trois étages** :
    le déplacement tourne l'élément de son cap puis le fait avancer, un
    étage intermédiaire **remet le dessin d'aplomb** (sinon la licorne
    voyage couchée), et l'image garde son flottement — une seule balise ne
    peut pas porter les trois animations. Le bas du dégradé est passé du
    rose au **violet pastel**.
  - **Le toboggan.** Un seul chemin est dessiné sur la carte : un ruban
    d'arc-en-ciel du coin haut-gauche au premier monde (`_arcEnCiel`, le
    même tracé repeint six fois de moins en moins large). La fille y glisse
    **seule** : tant que le monde 1 n'est pas fini, `_equipage` est
    construit sans monture.
  - **Ce qui attend sur un monde** (`objetsEtape`, `_poserObjets`) : sa
    licorne sur le monde 1, la couronne du client sur le monde 2. L'objet
    est posé sur le SOMMET du décor et **disparaît dès l'étape terminée** —
    il part avec elle. La couronne ne se porte donc qu'une fois le monde 2
    fini (`couronneEtape`), en vol comme à pied.
  - **Le cours porte le décor de son monde** (`scene-<slug>.svg`,
    `_decorMonde`) : les mêmes motifs animés, semés en quatre bouquets sur
    un cadre large et transparent. Le monde des licornes montre en plus
    l'image du client — un SVG servi par une balise `img` ne charge aucune
    image extérieure, elle est donc posée en DOM par-dessus.
  - **Les douze décors ont été refaits** : ours et chiens et chats
    entiers (plus de têtes ni d'empreintes), plusieurs tortues avec la tête
    DEVANT la carapace, papillons qui battent des ailes, fleurs en volume
    sur leurs tiges, cœurs qui battent, nuages qui dérivent, et neuf
    sortes de sucreries. Tout est animé en CSS **dans** le fichier SVG :
    une animation déclarative tourne dans une balise `img`, un script non.
  - **Deux pièges de ce travail, à ne pas refaire** :
    1. un `transform` CSS **écrase** l'attribut `transform` d'un élément
       SVG. Un motif placé par attribut et animé par classe repartait au
       coin de l'image, à la mauvaise taille. Chaque motif est donc un
       groupe de PLACEMENT qui contient un groupe d'ANIMATION. Et il faut
       `transform-box:fill-box`, sinon l'origine est celle du canevas.
    2. tout ce qui est dessiné sous **y = 328** sort du disque du monde
       (rayon 128 dans un carré de 400) et se fait rogner. À y = 300, il ne
       reste que 160 px de large.

- **Le ciel de la fille : nuages et cœurs** (). Cinq nuages
  qui dérivent et neuf cœurs qui montent en se balançant, en plus des
  étoiles, papillons et licornes déjà posés. Ils sont **dessinés en CSS**,
  pas écrits en emoji : un emoji nuage arrive avec le gris de sa police et
  se lit comme un pictogramme. Trois choses trouvées en REGARDANT une
  capture, pas en devinant : le blanc doit être **plein** avec la
  transparence sur l'élément entier — l'alpha dans la couleur fait
  s'additionner le corps et les bosses, et on voit les coutures du nuage ;
  un blanc sur le rose pâle a besoin d'une **ombre mauve** pour avoir un
  contour ; et les cœurs à 14–28 px se perdaient, ils sont à 20–38 px. Les
  délais d'animation sont **négatifs** : le ciel est peuplé dès la première
  image au lieu de se remplir pendant une demi-minute. Ils vivent sur le
  fond pastel bleu → jaune → rose, posé dans la foulée (voir
  « Le fond — FAIT » du chantier 1 ter).
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

- **Ne jamais faire décider un fait de LANGUE par une mesure de police.**
  Le côté où vit une voyelle — la kasra et son tanwīn sous la ligne, les six
  autres au-dessus — était déduit de `measureText`. Tant que Scheherazade New
  n'est pas chargée, on mesure la police de repli, où la kasra seule remonte
  au-dessus de la ligne de base (+9 au lieu de −47) : les deux seuls signes du
  bas passaient en haut, et rien ne les redescendait. Le client l'a vu tout de
  suite. Le côté se lit maintenant sur le CARACTÈRE (0650, 064D) ; la mesure ne
  sert plus qu'à l'écart. Corollaire : **tout ce qui est dessiné à partir de
  mesures de police doit être refait sur `document.fonts.ready`** — sinon le
  premier tracé garde le mauvais glyphe et les mauvaises mesures. Attention,
  dans le module d'écriture l'encre de l'enfant vit sur le MÊME canvas : ne
  redessiner que si l'enfant n'a pas encore écrit.

- **On ne peut PAS voir la page depuis ici.** Le volet du navigateur n'est
  pas affiché : il ne compose aucune image, donc la capture d'écran échoue
  ET le décodage d'images est suspendu. Une capture DOM → SVG `foreignObject`
  → canvas ne rend donc rien non plus : l'`<img>` reste muette, sans erreur,
  et le code attend indéfiniment. Ce qui marche : **dessiner soi-même sur un
  canvas** (`fetch('/capture?f=x.png',…)`) et **mesurer le DOM** (positions,
  tailles, couleurs calculées, débordements). C'est ainsi qu'ont été
  contrôlés le découpage du trait de liaison et le placement des voyelles.
- **`requestAnimationFrame` ne tourne pas dans cet onglet** (même cause).
  Tout ce qui doit se produire — remplir une barre, ouvrir une leçon après
  une animation — passe par `setTimeout`, jamais par rAF. Deux endroits de la
  page des cours en dépendaient : la barre restait à zéro et le clic
  n'ouvrait jamais la leçon. C'est vrai aussi pour un vrai téléphone dont
  l'onglet passe en arrière-plan.
- **Un `::before` en `position:absolute` sans `left` se pose à sa place
  statique**, pas au bord de son parent. Le rail du parcours passait huit
  pixels à côté des nœuds. `left:50%;margin-left:-1px` pour le centrer.

- **Un remplacement automatique large abîme les commentaires français.** Un
  passage de `'…'` vers `te('…')` a mordu sur des apostrophes de
  commentaires : `l'enfant` est devenu `lte('enfant`. Sans effet à
  l'exécution — c'est du commentaire — mais dix-sept notes sont devenues
  illisibles, et il a fallu les reconstituer. **Toujours restreindre la
  portée d'un tel remplacement au code, jamais au fichier entier.**
- **Le contrôle de syntaxe par `new Function` sur chaque `<script>` ment.**
  Il a annoncé « 0 erreur » sur un fichier réellement cassé
  (`onclick="navToPage('exercises')"` refermait la chaîne trop tôt) : la
  découpe des blocs `<script>` par expression régulière ne suit pas les
  chaînes. **La seule preuve est la console du navigateur, page rechargée.**
  Et pour un `onclick` imbriqué, écrire `&quot;` dans l'attribut plutôt que
  d'empiler les échappements.
- **Les heredocs de Bash mangent les antislashs** et cassent au-delà d'une
  certaine taille. Pour tout fichier un peu long, ou toute chaîne contenant
  `'`, écrire le script avec l'outil Write et le lancer ensuite. Sinon,
  choisir une ancre de remplacement sans antislash.

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
- **Un décor posé dans le conteneur du personnage hérite de ses
  transitions.** Le conteneur du pilote porte des `transition:transform` :
  la porte de lumière (v146), posée dedans, aurait glissé avec lui au lieu
  de rester sur le monde. Elle est posée dans le GLOBE de la carte, aux
  coordonnées du personnage calculées par `getBoundingClientRect`.
- **Le vol de la carte se mesure avec une horloge pilotee.** Ni
  `requestAnimationFrame` ni les transitions CSS ne battent dans le panneau
  d'essai. Pour observer un vol, on remplace `Date.now` par une horloge
  fausse et `requestAnimationFrame` par une file que l'on pompe image par
  image : le vol entier se joue alors en une seule expression, et l'angle
  pose comme le point de semis se lisent a chaque image. C'est ainsi qu'a
  ete trouve le saut de 200 degres du redressement (v149).
- **Un angle interpole vers « la verticale la plus proche » doit FIGER sa
  cible.** Recalculee a chaque image, `Math.round(a/360)*360` bascule de 0 a
  360 des que l'angle traverse 180 degres, et l'element fait un demi-tour
  brutal. On fige la cible au debut du mouvement.
- **Une image-cle l'emporte toujours sur la regle.** `.bg-rocket` portait
  `opacity:.5`, mais `@keyframes rocketLaunch` remettait `opacity:1` a
  chaque etape : les fusees du decor etaient opaques. Un plafond
  d'opacite se pose DANS les images-cles, jamais a cote.
- **Le decalage entre deux formes d'une lettre se mesure SUR LA LETTRE, pas
  sur les bords de la chaine.** Le tatweel n'a pas la meme longueur d'une
  forme a l'autre : compare bord a bord, le ta fin semblait decale de 0,025 em
  par rapport au milieu, alors que sa barre verticale et sa boucle le sont de
  0,060. On superpose les deux encres et on aligne sur un trait de la LETTRE
  — ici la barre. Mal places de 0,035, les points tombaient a cote de leur
  encre et `_cheminSurEncre` prenait un raccourci par la barre, qui
  s'allumait avant l'heure (v160-161).
- **Deux tableaux, deux traits.** Un commentaire peut annoncer qu'on leve le
  crayon sans que les donnees le fassent : le waw fin avait sa liaison et sa
  boucle dans un SEUL sous-tableau, et le pinceau allumait la boucle en
  finissant la liaison. Verifier les donnees, pas le commentaire.
