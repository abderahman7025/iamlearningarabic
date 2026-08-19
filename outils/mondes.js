/*
 * Fabrique les douze décors du parcours de la fille — À LANCER À LA MAIN.
 *
 *   node outils/mondes.js
 *
 * Il écrit `public/images/monde-*.svg`. Rien ne l'appelle au chargement du
 * site : les fichiers produits sont des images ordinaires, servies telles
 * quelles. Le script est gardé pour qu'une couleur se retouche ici, en un
 * endroit, plutôt qu'à la main dans douze fichiers.
 *
 * C'est le pendant exact de `planetes.js` côté garçon, et pour la même
 * raison : le client veut des illustrations, son compte de génération est à
 * zéro crédit, et un décor dessiné vaut mieux qu'une case vide. POUR LES
 * REMPLACER par de vraies illustrations : déposer les fichiers sous
 * `public/images/monde-<nom>.png` et changer l'extension dans le tableau
 * `images` de l'habillage `licorne`, dans app/app.html. Rien d'autre.
 *
 * DEUX RÈGLES QUI TIENNENT TOUT LE FICHIER
 *
 * 1. Chaque monde est un DISQUE de rayon `r` au milieu d'un carré de 400.
 *    La fille se pose sur le haut de ce disque, et le sommet se calcule :
 *    (200 - r) / 400. Rien n'est mesuré sur les pixels, rien n'est deviné.
 * 2. Tout ce qui décore le monde reste DANS le disque. Une tour de château
 *    ou une corne qui dépasserait ferait poser la licorne dans le vide —
 *    c'est l'erreur qui a coûté trois tours sur l'anneau d'Uranus.
 */
const fs = require('fs');
const path = require('path');

const SORTIE = path.join(__dirname, '..', 'public', 'images');

/* ── LES MOTIFS ────────────────────────────────────────────────────────
   De petites formes, dessinées grosses et simples : à la taille où le
   décor est vu sur la carte (140 px de large), un détail de moins de six
   pixels disparaît. */

/* Un cœur, par ses deux lobes : deux arcs qui se rejoignent en pointe. */
function coeur(x, y, s, f, op) {
  return '<path d="M ' + x + ' ' + (y + s * 0.72)
    + ' C ' + (x - s * 1.15) + ' ' + (y - s * 0.15) + ' ' + (x - s * 0.52) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.28)
    + ' C ' + (x + s * 0.52) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.15) + ' ' + (y - s * 0.15) + ' ' + x + ' ' + (y + s * 0.72)
    + ' Z" fill="' + f + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
}

/* Une fleur : cinq pétales autour d'un cœur jaune. */
function fleur(x, y, s, pet, mil) {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 90) * Math.PI / 180;
    const px = (x + Math.cos(a) * s * 0.62).toFixed(1);
    const py = (y + Math.sin(a) * s * 0.62).toFixed(1);
    d += '<ellipse cx="' + px + '" cy="' + py
      + '" rx="' + (s * 0.44).toFixed(1) + '" ry="' + (s * 0.58).toFixed(1) + '" fill="' + pet
      + '" transform="rotate(' + (i * 72).toFixed(0) + ' ' + px + ' ' + py + ')"/>';
  }
  return d + '<circle cx="' + x + '" cy="' + y + '" r="' + (s * 0.38) + '" fill="' + mil + '"/>';
}

/* Un nuage : un corps allongé et deux bosses, comme celui du fond. */
function nuage(x, y, s, f, op) {
  return '<g opacity="' + (op || 1) + '">'
    + '<rect x="' + (x - s) + '" y="' + (y - s * 0.30) + '" width="' + (s * 2) + '" height="' + (s * 0.60)
    + '" rx="' + (s * 0.30) + '" fill="' + f + '"/>'
    + '<circle cx="' + (x - s * 0.34) + '" cy="' + (y - s * 0.32) + '" r="' + (s * 0.50) + '" fill="' + f + '"/>'
    + '<circle cx="' + (x + s * 0.32) + '" cy="' + (y - s * 0.18) + '" r="' + (s * 0.36) + '" fill="' + f + '"/>'
    + '</g>';
}

/* Un papillon. Les AILES font le papillon : les grandes en haut, les
   petites en bas, et un corps COURT au milieu. La premiere version avait
   un corps long et des ailes serrees — on n'y voyait qu'une forme. */
function papillon(x, y, s, a, b) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<ellipse cx="-52" cy="-30" rx="50" ry="40" fill="' + a + '" transform="rotate(-22 -52 -30)"/>'
    + '<ellipse cx="52" cy="-30" rx="50" ry="40" fill="' + a + '" transform="rotate(22 52 -30)"/>'
    + '<ellipse cx="-40" cy="34" rx="36" ry="30" fill="' + b + '" transform="rotate(-12 -40 34)"/>'
    + '<ellipse cx="40" cy="34" rx="36" ry="30" fill="' + b + '" transform="rotate(12 40 34)"/>'
    + '<circle cx="-56" cy="-34" r="13" fill="#ffffff" opacity=".55"/>'
    + '<circle cx="56" cy="-34" r="13" fill="#ffffff" opacity=".55"/>'
    + '<ellipse cx="0" cy="0" rx="9" ry="44" fill="#6b4a63"/>'
    + '<circle cx="0" cy="-44" r="11" fill="#6b4a63"/>'
    + '<path d="M -5 -52 Q -20 -74 -30 -66 M 5 -52 Q 20 -74 30 -66"'
    + ' stroke="#6b4a63" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '</g>';
}

/* Une tête de licorne, de profil : le museau, l'oreille, la corne et la
   crinière. C'est la CORNE qui la fait reconnaître — elle est donc large
   et rayée, pas un trait fin qui disparaîtrait. */
function licorne(x, y, s, robe, criniere, corne, cerne) {
  const c = cerne || '#9a5cbc';
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    /* La criniere passe DERRIERE la tete : posee devant, elle lui mange la
       joue et la licorne redevient une tache blanche. */
    + '<path d="M -10 -46 Q -52 -26 -46 18 Q -42 52 -20 72 Q -54 62 -64 22 Q -74 -26 -34 -50 Z"'
    + ' fill="' + criniere + '" stroke="' + c + '" stroke-width="3" stroke-opacity=".45" stroke-linejoin="round"/>'
    /* L'oreille, puis la tete : le museau en bas a droite, la nuque a gauche. */
    + '<path d="M 16 -46 L 34 -62 L 30 -34 Z" fill="' + robe + '" stroke="' + c + '" stroke-width="3.5" stroke-linejoin="round"/>'
    + '<path d="M -14 74 Q -40 48 -34 8 Q -28 -34 6 -50 Q 40 -64 56 -36 Q 68 -14 54 10 L 36 38 Q 22 66 -14 74 Z"'
    + ' fill="' + robe + '" stroke="' + c + '" stroke-width="4" stroke-linejoin="round"/>'
    /* La CORNE, ce qui la fait reconnaitre : large, doree, rayee. */
    + '<path d="M -4 -52 L 12 -114 L 28 -54 Z" fill="' + corne + '" stroke="#e0a32c" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M 1 -72 L 21 -74 M 5 -88 L 17 -90" stroke="#ffffff" stroke-opacity=".85" stroke-width="4.5" stroke-linecap="round"/>'
    + '<circle cx="30" cy="-18" r="6" fill="#5c3350"/>'
    + '<circle cx="32" cy="-20" r="2" fill="#ffffff"/>'
    + '<ellipse cx="55" cy="6" rx="6.5" ry="4.5" fill="#5c3350" opacity=".5"/>'
    + '</g>';
}

/* Une couronne : trois pointes, une bande, et ses pierres. */
function couronne(x, y, s, or, ombre, pierre) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<path d="M -62 26 L -74 -46 L -34 -12 L 0 -60 L 34 -12 L 74 -46 L 62 26 Z" fill="' + or + '"/>'
    + '<path d="M -62 26 L 62 26 L 60 40 L -60 40 Z" fill="' + ombre + '"/>'
    + '<circle cx="-74" cy="-52" r="9" fill="' + pierre + '"/>'
    + '<circle cx="0" cy="-66" r="10" fill="' + pierre + '"/>'
    + '<circle cx="74" cy="-52" r="9" fill="' + pierre + '"/>'
    + '<circle cx="-32" cy="8" r="8" fill="' + pierre + '"/>'
    + '<circle cx="32" cy="8" r="8" fill="' + pierre + '"/>'
    + '</g>';
}

/* Un pingouin : un corps, un ventre, deux ailerons, un bec et deux pieds. */
function pingouin(x, y, s) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<ellipse cx="-26" cy="52" rx="14" ry="7" fill="#f6a23c"/><ellipse cx="26" cy="52" rx="14" ry="7" fill="#f6a23c"/>'
    + '<ellipse cx="0" cy="4" rx="42" ry="52" fill="#3d3f56"/>'
    + '<ellipse cx="0" cy="12" rx="28" ry="40" fill="#fdfbff"/>'
    + '<ellipse cx="-44" cy="6" rx="12" ry="30" fill="#33354a" transform="rotate(14 -44 6)"/>'
    + '<ellipse cx="44" cy="6" rx="12" ry="30" fill="#33354a" transform="rotate(-14 44 6)"/>'
    + '<circle cx="-13" cy="-20" r="6" fill="#ffffff"/><circle cx="13" cy="-20" r="6" fill="#ffffff"/>'
    + '<circle cx="-12" cy="-19" r="3" fill="#2a2b3a"/><circle cx="14" cy="-19" r="3" fill="#2a2b3a"/>'
    + '<path d="M -9 -6 L 9 -6 L 0 8 Z" fill="#f6a23c"/>'
    + '</g>';
}

/* Une tortue, de profil : la carapace et ses écailles, la tête, les pattes. */
function tortue(x, y, s) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<ellipse cx="-34" cy="34" rx="15" ry="10" fill="#8fd6a6"/><ellipse cx="30" cy="34" rx="15" ry="10" fill="#8fd6a6"/>'
    + '<ellipse cx="56" cy="4" rx="22" ry="18" fill="#a5e2b8"/>'
    + '<circle cx="66" cy="-2" r="4.5" fill="#3f5a49"/>'
    + '<path d="M -66 22 Q -66 -34 0 -34 Q 66 -34 66 22 Z" fill="#57a878"/>'
    + '<path d="M -66 22 Q -66 -28 0 -28 Q 66 -28 66 22 Z" fill="#6fc08d"/>'
    + '<path d="M -30 -22 l 16 0 l 7 20 l -15 8 l -15 -8 Z M 8 -26 l 16 0 l 8 22 l -16 8 l -15 -8 Z"'
    + ' fill="#3f8c60" opacity=".55"/>'
    + '<ellipse cx="-40" cy="-2" rx="12" ry="10" fill="#3f8c60" opacity=".45"/>'
    + '<ellipse cx="44" cy="-2" rx="12" ry="10" fill="#3f8c60" opacity=".45"/>'
    + '<path d="M -74 24 L 74 24" stroke="#3f8c60" stroke-width="6" stroke-linecap="round" opacity=".5"/>'
    + '</g>';
}

/* Une empreinte de patte : le coussinet et ses quatre doigts. */
function patte(x, y, s, f) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')" fill="' + f + '">'
    + '<ellipse cx="0" cy="22" rx="30" ry="24"/>'
    + '<ellipse cx="-30" cy="-14" rx="12" ry="15" transform="rotate(-18 -30 -14)"/>'
    + '<ellipse cx="-10" cy="-28" rx="11" ry="14"/>'
    + '<ellipse cx="12" cy="-28" rx="11" ry="14"/>'
    + '<ellipse cx="31" cy="-13" rx="12" ry="15" transform="rotate(18 31 -13)"/>'
    + '</g>';
}

/* Une tête d'ours : la boule, deux oreilles, le museau. */
function ours(x, y, s, poil, museau) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<circle cx="-42" cy="-40" r="20" fill="' + poil + '"/><circle cx="42" cy="-40" r="20" fill="' + poil + '"/>'
    + '<circle cx="-42" cy="-40" r="10" fill="' + museau + '"/><circle cx="42" cy="-40" r="10" fill="' + museau + '"/>'
    + '<circle cx="0" cy="0" r="52" fill="' + poil + '"/>'
    + '<ellipse cx="0" cy="22" rx="28" ry="22" fill="' + museau + '"/>'
    + '<ellipse cx="0" cy="10" rx="10" ry="8" fill="#4a3128"/>'
    + '<path d="M 0 18 v 10 M 0 28 q -10 8 -16 0 M 0 28 q 10 8 16 0" stroke="#4a3128" stroke-width="4" fill="none" stroke-linecap="round"/>'
    + '<circle cx="-19" cy="-14" r="6" fill="#4a3128"/><circle cx="19" cy="-14" r="6" fill="#4a3128"/>'
    + '</g>';
}

/* Une sucette : le bâton et sa spirale. */
function sucette(x, y, s, a, b) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<rect x="-4" y="30" width="8" height="56" rx="4" fill="#fff6e0"/>'
    + '<circle cx="0" cy="0" r="38" fill="' + a + '"/>'
    + '<path d="M 0 -30 a 30 30 0 0 1 26 15 a 22 22 0 0 0 -19 -11 a 15 15 0 0 1 13 8 a 8 8 0 0 0 -7 -4"'
    + ' fill="none" stroke="' + b + '" stroke-width="9" stroke-linecap="round"/>'
    + '<path d="M 0 30 a 30 30 0 0 1 -26 -15 a 22 22 0 0 0 19 11 a 15 15 0 0 1 -13 -8 a 8 8 0 0 0 7 4"'
    + ' fill="none" stroke="' + b + '" stroke-width="9" stroke-linecap="round"/>'
    + '</g>';
}

/* Un bonbon dans son papier. */
function bonbon(x, y, s, f, clair) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<path d="M -30 0 L -64 -26 L -56 0 L -64 26 Z" fill="' + f + '" opacity=".85"/>'
    + '<path d="M 30 0 L 64 -26 L 56 0 L 64 26 Z" fill="' + f + '" opacity=".85"/>'
    + '<circle cx="0" cy="0" r="30" fill="' + f + '"/>'
    + '<circle cx="0" cy="0" r="30" fill="none" stroke="' + clair + '" stroke-width="5" stroke-opacity=".75"/>'
    + '<ellipse cx="-9" cy="-9" rx="11" ry="8" fill="' + clair + '" opacity=".9"/>'
    + '</g>';
}

/* Le château : trois tours, leurs toits, la porte. */
function chateau(x, y, s, mur, ombre, toit) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<rect x="-72" y="-20" width="34" height="86" fill="' + mur + '"/>'
    + '<rect x="38" y="-20" width="34" height="86" fill="' + mur + '"/>'
    + '<rect x="-26" y="-46" width="52" height="112" fill="' + mur + '"/>'
    + '<rect x="-26" y="-46" width="16" height="112" fill="' + ombre + '" opacity=".35"/>'
    + '<path d="M -78 -20 L -55 -58 L -32 -20 Z" fill="' + toit + '"/>'
    + '<path d="M 32 -20 L 55 -58 L 78 -20 Z" fill="' + toit + '"/>'
    + '<path d="M -32 -46 L 0 -92 L 32 -46 Z" fill="' + toit + '"/>'
    + '<path d="M 0 -92 L 0 -104 L 22 -98 L 0 -92 Z" fill="#ff9ec4"/>'
    + '<path d="M -10 66 v -32 a 10 10 0 0 1 20 0 v 32 Z" fill="' + ombre + '"/>'
    + '<circle cx="-55" cy="-2" r="6" fill="' + ombre + '"/><circle cx="55" cy="-2" r="6" fill="' + ombre + '"/>'
    + '<circle cx="0" cy="-28" r="7" fill="' + ombre + '"/>'
    + '</g>';
}

/* Un arc-en-ciel, en bandes concentriques. */
function arcEnCiel(x, y, r, ep) {
  const cs = ['#ff9ec4', '#ffc48a', '#fff2a8', '#bfe8b0', '#a8d8ff', '#c9b6ff'];
  return cs.map(function (c, i) {
    const rr = r - i * ep;
    return '<path d="M ' + (x - rr) + ' ' + y + ' a ' + rr + ' ' + rr + ' 0 0 1 ' + (2 * rr) + ' 0"'
      + ' fill="none" stroke="' + c + '" stroke-width="' + ep + '"/>';
  }).join('');
}

/* Les mêmes petites étoiles à quatre branches que sur les planètes : c'est
   ce qui rend les deux parcours parents. */
function etincelles(l) {
  return l.map(function (e) {
    const x = e[0], y = e[1], s = e[2];
    return '<path d="M ' + x + ' ' + (y - s) + ' Q ' + x + ' ' + y + ' ' + (x + s) + ' ' + y
      + ' Q ' + x + ' ' + y + ' ' + x + ' ' + (y + s)
      + ' Q ' + x + ' ' + y + ' ' + (x - s) + ' ' + y
      + ' Q ' + x + ' ' + y + ' ' + x + ' ' + (y - s) + ' Z" fill="#ffffff" opacity=".85"/>';
  }).join('');
}

/* Un sol arrondi au bas du disque : l'herbe, la banquise, le sable. */
function sol(couleur, hauteur, second) {
  return '<ellipse cx="200" cy="' + (400 - hauteur) + '" rx="190" ry="' + (hauteur * 1.5) + '" fill="' + couleur + '"/>'
    + (second ? '<ellipse cx="200" cy="' + (400 - hauteur * 0.55) + '" rx="190" ry="' + (hauteur * 1.1) + '" fill="' + second + '"/>' : '');
}

/* Le monde lui-même : un disque pastel, son halo, son sol, et ce qu'on y
   pose. Tout le contenu est découpé au disque — rien ne dépasse. */
function monde(o) {
  const id = o.nom;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">\n'
    + '  <defs>\n'
    + '    <radialGradient id="c-' + id + '" cx="36%" cy="26%" r="80%">\n'
    + '      <stop offset="0%" stop-color="' + o.clair + '"/>\n'
    + '      <stop offset="54%" stop-color="' + o.moyen + '"/>\n'
    + '      <stop offset="100%" stop-color="' + o.fonce + '"/>\n'
    + '    </radialGradient>\n'
    + '    <radialGradient id="h-' + id + '" cx="50%" cy="50%" r="50%">\n'
    + '      <stop offset="60%" stop-color="' + o.halo + '" stop-opacity="0"/>\n'
    + '      <stop offset="80%" stop-color="' + o.halo + '" stop-opacity=".34"/>\n'
    + '      <stop offset="100%" stop-color="' + o.halo + '" stop-opacity="0"/>\n'
    + '    </radialGradient>\n'
    + '    <clipPath id="d-' + id + '"><circle cx="200" cy="200" r="' + o.r + '"/></clipPath>\n'
    + '  </defs>\n'
    + '  <circle cx="200" cy="200" r="' + (o.r + 44) + '" fill="url(#h-' + id + ')"/>\n'
    + '  <circle cx="200" cy="200" r="' + o.r + '" fill="url(#c-' + id + ')"/>\n'
    + '  <g clip-path="url(#d-' + id + ')">' + (o.sol || '') + (o.dedans || '') + '</g>\n'
    + '  <circle cx="200" cy="200" r="' + o.r + '" fill="none" stroke="' + o.trait + '" stroke-opacity=".38" stroke-width="3"/>\n'
    + '  <ellipse cx="' + (200 - o.r * 0.36) + '" cy="' + (200 - o.r * 0.44) + '" rx="' + (o.r * 0.26) + '" ry="' + (o.r * 0.16) + '"'
    + ' fill="#ffffff" opacity=".30" transform="rotate(-28 ' + (200 - o.r * 0.36) + ' ' + (200 - o.r * 0.44) + ')"/>\n'
    + '  ' + etincelles(o.etincelles || []) + '\n'
    + '</svg>\n';
}

const MONDES = [
  /* 1 — les licornes. Le client en veut PLUSIEURS. */
  { nom: 'licornes', r: 128, clair: '#fdeaff', moyen: '#e8c0fa', fonce: '#b478d8', halo: '#e0a8ff', trait: '#9a5cbc',
    sol: sol('#dcaef2', 62, '#ecc8ff'),
    dedans: arcEnCiel(200, 172, 100, 10)
      + licorne(146, 252, 104, '#ffffff', '#ff8ec4', '#ffd34e')
      + licorne(268, 260, 82, '#fffaff', '#a8d8ff', '#ffd34e'),
    etincelles: [[86, 118, 13], [318, 130, 11], [96, 300, 10]] },

  /* 2 — la couronne. C'est d'ici que la fille la porte. */
  { nom: 'couronne', r: 126, clair: '#fff7e6', moyen: '#ffe1b0', fonce: '#e8a86a', halo: '#ffd08a', trait: '#c98a4a',
    sol: sol('#f7cf9a', 58, '#ffe2b8'),
    dedans: '<ellipse cx="200" cy="210" rx="94" ry="88" fill="#ffffff" opacity=".38"/>'
      + couronne(200, 204, 118, '#ffd34e', '#e8a92c', '#ff6fae')
      + coeur(112, 292, 16, '#ff9ec4') + coeur(292, 288, 14, '#ff9ec4'),
    etincelles: [[96, 112, 14], [312, 128, 12], [300, 300, 11]] },

  /* 3 — les nuages. */
  { nom: 'nuages', r: 128, clair: '#f2fbff', moyen: '#c5e9ff', fonce: '#79b8e8', halo: '#a8dcff', trait: '#5f9fd0',
    dedans: nuage(160, 168, 54, '#ffffff', .95) + nuage(262, 226, 44, '#ffffff', .9)
      + nuage(152, 272, 60, '#ffffff', .85) + nuage(268, 134, 32, '#ffffff', .8),
    etincelles: [[92, 120, 12], [318, 296, 12], [110, 316, 10]] },

  /* 4 — les fleurs. */
  { nom: 'fleurs', r: 128, clair: '#f6ffef', moyen: '#d6f2c0', fonce: '#8fc879', halo: '#bfe8a8', trait: '#6aa858',
    sol: sol('#8fce78', 74, '#a8dc8c'),
    dedans: '<path d="M 120 302 v -54 M 200 314 v -70 M 280 302 v -56 M 158 318 v -42 M 244 318 v -46"'
      + ' stroke="#5f9e4c" stroke-width="7" stroke-linecap="round"/>'
      + fleur(120, 240, 40, '#ff9ec4', '#ffe36a') + fleur(200, 232, 46, '#ffffff', '#ffd34e')
      + fleur(280, 240, 40, '#c9b6ff', '#ffe36a') + fleur(158, 272, 30, '#ffd6a8', '#ff9ec4')
      + fleur(244, 268, 30, '#a8d8ff', '#ffe36a'),
    etincelles: [[96, 122, 12], [312, 128, 11], [300, 306, 10]] },

  /* 5 — les cœurs, rose, rouge… */
  { nom: 'coeurs', r: 128, clair: '#fff2f7', moyen: '#ffd0e4', fonce: '#f07aae', halo: '#ff9ecf', trait: '#d4568f',
    dedans: coeur(196, 204, 62, '#ff5f8f') + coeur(126, 172, 34, '#ff9ec4')
      + coeur(272, 174, 30, '#ffb3d1') + coeur(140, 286, 32, '#ff85b5')
      + coeur(266, 282, 38, '#ff2e6b', '.9') + coeur(206, 300, 24, '#ffc9df'),
    etincelles: [[92, 232, 12], [306, 234, 11], [200, 108, 12]] },

  /* 6 — les pingouins, sur la banquise. */
  { nom: 'pingouins', r: 128, clair: '#fbfeff', moyen: '#dbf1ff', fonce: '#94c8e8', halo: '#bfe4ff', trait: '#6ea8cc',
    sol: sol('#eaf8ff', 84, '#ffffff'),
    dedans: '<path d="M 92 300 L 132 258 L 176 300 Z" fill="#ffffff" opacity=".9"/>'
      + '<path d="M 236 296 L 286 244 L 330 296 Z" fill="#f2fbff" opacity=".9"/>'
      + pingouin(154, 244, 84) + pingouin(254, 264, 66) + pingouin(206, 300, 52),
    etincelles: [[98, 128, 12], [306, 132, 11], [200, 104, 10]] },

  /* 7 — les papillons. */
  { nom: 'papillons', r: 128, clair: '#fdf4ff', moyen: '#e8d8ff', fonce: '#a98fd8', halo: '#c9b6ff', trait: '#8a6ec0',
    sol: sol('#c2a8ec', 56, '#d8c4ff'),
    dedans: papillon(160, 180, 54, '#ff9ec4', '#ffd6e8') + papillon(264, 226, 44, '#a8d8ff', '#d8eeff')
      + papillon(150, 270, 40, '#ffe36a', '#fff3b8') + papillon(258, 132, 30, '#ffffff', '#ffe8f4'),
    etincelles: [[94, 122, 12], [312, 300, 11], [104, 306, 10]] },

  /* 8 — l'île de la tortue. Elle garde son nom d'île : c'est le client. */
  { nom: 'tortue', r: 128, clair: '#f2fffb', moyen: '#c4f0e2', fonce: '#6fc0a8', halo: '#a8e8d4', trait: '#4f9c88',
    sol: sol('#ffe9b8', 66, '#fff3d4'),
    dedans: '<path d="M 74 292 q 34 -16 62 0 t 62 0 t 62 0 t 62 0" stroke="#8fdcc4" stroke-width="7" fill="none" opacity=".7"/>'
      + tortue(196, 240, 118)
      + '<ellipse cx="120" cy="316" rx="26" ry="8" fill="#ffdca8"/>'
      + '<ellipse cx="286" cy="312" rx="22" ry="7" fill="#ffdca8"/>',
    etincelles: [[96, 126, 12], [308, 134, 11], [312, 298, 10]] },

  /* 9 — les chats et les chiens. */
  { nom: 'chats-chiens', r: 128, clair: '#fff8f0', moyen: '#ffe2c4', fonce: '#e0a878', halo: '#ffcf9e', trait: '#c08a58',
    sol: sol('#f0c496', 62, '#ffdcb8'),
    dedans: patte(150, 192, 62, '#e08a5f') + patte(256, 178, 50, '#a8785f')
      + patte(128, 278, 46, '#c08a68') + patte(268, 270, 56, '#8f6a52')
      + patte(202, 234, 40, '#e8a882'),
    etincelles: [[92, 122, 12], [314, 296, 11], [200, 106, 10]] },

  /* 10 — les ours bruns. */
  { nom: 'ours', r: 128, clair: '#fff6ea', moyen: '#f0d6b0', fonce: '#c99a68', halo: '#e8c096', trait: '#a87c4e',
    sol: sol('#8fc878', 70, '#a8dc8c'),
    dedans: ours(168, 218, 104, '#a8714a', '#e8c096') + ours(270, 252, 76, '#8f5c3c', '#dcb088'),
    etincelles: [[94, 124, 12], [310, 130, 11], [304, 302, 10]] },

  /* 11 — les sucreries. */
  { nom: 'sucreries', r: 128, clair: '#fff4fb', moyen: '#ffd8ee', fonce: '#f08acc', halo: '#ffabe0', trait: '#d466ac',
    dedans: sucette(158, 190, 82, '#ffffff', '#ff6fae') + sucette(260, 218, 66, '#fff3b8', '#7fd0f0')
      + bonbon(160, 292, 62, '#ff9ec4', '#ffe8f4') + bonbon(268, 296, 52, '#a8e8d4', '#e8fff8')
      + coeur(206, 138, 20, '#ffffff', '.9'),
    etincelles: [[96, 250, 12], [310, 130, 11], [110, 130, 10]] },

  /* 12 — le château de la princesse : elle rentre chez elle. */
  { nom: 'chateau', r: 128, clair: '#fff2f9', moyen: '#ffd6ea', fonce: '#e08ab8', halo: '#ffabd4', trait: '#c26a9c',
    sol: sol('#c2a0dc', 66, '#d8bcf0'),
    dedans: chateau(200, 220, 128, '#fff0f8', '#e8b8d4', '#ff7fb8')
      + coeur(112, 214, 18, '#ffffff', '.85') + coeur(292, 208, 16, '#ffffff', '.85')
      + '<path d="M 96 302 q 40 -18 72 0 t 72 0 t 64 0" stroke="#e8c4f8" stroke-width="6" fill="none" opacity=".8"/>',
    etincelles: [[92, 128, 13], [312, 132, 12], [200, 100, 11]] }
];

if (!fs.existsSync(SORTIE)) fs.mkdirSync(SORTIE, { recursive: true });
MONDES.forEach(function (m) {
  const f = path.join(SORTIE, 'monde-' + m.nom + '.svg');
  fs.writeFileSync(f, monde(m), 'utf8');
  console.log('ecrit : ' + path.relative(path.join(__dirname, '..'), f));
});
console.log(MONDES.length + ' decors ecrits.');

/* Le SOMMET de chaque monde, en fraction de la hauteur de son image. La
 * licorne se pose dessus : on le CALCULE depuis le rayon du disque, on ne
 * le devine pas sur les pixels — c'est la leçon de la comète du garçon.
 * Ce tableau se recopie tel quel dans `_HABILLAGES.licorne.sommets`. */
console.log('');
console.log('A recopier dans _HABILLAGES.licorne.sommets :');
console.log('    sommets:{' + MONDES.map(function (m) {
  return "'" + m.nom + "':" + ((200 - m.r) / 400).toFixed(4).replace(/0+$/, '');
}).join(',') + '},');
