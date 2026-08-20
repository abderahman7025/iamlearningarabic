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
 * POUR LES REMPLACER par de vraies illustrations : déposer les fichiers
 * sous `public/images/monde-<nom>.png` et changer l'extension dans le
 * tableau `images` de l'habillage `licorne`, dans app/app.html.
 *
 * TROIS RÈGLES QUI TIENNENT TOUT LE FICHIER
 *
 * 1. Chaque monde est un DISQUE de rayon `r` au milieu d'un carré de 400.
 *    La fille se pose sur le haut de ce disque, et le sommet se calcule :
 *    (200 - r) / 400. Rien n'est mesuré sur les pixels, rien n'est deviné.
 * 2. Tout ce qui décore le monde reste DANS le disque. Une tour de château
 *    ou une corne qui dépasserait ferait poser la licorne dans le vide —
 *    c'est l'erreur qui a coûté trois tours sur l'anneau d'Uranus.
 * 3. ÇA BOUGE. Le client veut des mondes vivants : les cœurs battent, les
 *    nuages dérivent, les papillons battent des ailes, les animaux
 *    respirent. Les animations sont écrites en CSS DANS le fichier SVG :
 *    elles tournent même quand l'image est servie par une balise `<img>`,
 *    contrairement à un script, qui lui n'y tourne jamais.
 *    Pour qu'un `transform` CSS s'applique au bon endroit sur une forme
 *    SVG, il faut `transform-box:fill-box` — sans lui, l'origine est celle
 *    du canevas entier et la forme part à l'autre bout de l'image.
 */
const fs = require('fs');
const path = require('path');

const SORTIE = path.join(__dirname, '..', 'public', 'images');

/* ── LE MOUVEMENT ──────────────────────────────────────────────────────
   Une feuille de style commune à tous les mondes. Chaque motif porte une
   classe, et le décalage (`--d`) évite que tout batte à l'unisson. */
const MOUVEMENT = `
  <style>
    .anim{transform-box:fill-box;transform-origin:center}
    .bat    {animation:bat 1.6s ease-in-out infinite;animation-delay:var(--d,0s)}
    .respire{animation:respire 3.4s ease-in-out infinite;animation-delay:var(--d,0s)}
    .flotte {animation:flotte 4.2s ease-in-out infinite;animation-delay:var(--d,0s)}
    .derive {animation:derive 16s linear infinite;animation-delay:var(--d,0s)}
    .aileG  {animation:aileG 0.5s ease-in-out infinite;animation-delay:var(--d,0s);
             transform-box:fill-box;transform-origin:right center}
    .aileD  {animation:aileD 0.5s ease-in-out infinite;animation-delay:var(--d,0s);
             transform-box:fill-box;transform-origin:left center}
    .queue  {animation:queue 1.3s ease-in-out infinite;animation-delay:var(--d,0s);
             transform-box:fill-box;transform-origin:left bottom}
    .dodeline{animation:dodeline 2.8s ease-in-out infinite;animation-delay:var(--d,0s);
             transform-box:fill-box;transform-origin:center bottom}
    .brille {animation:brille 2.6s ease-in-out infinite;animation-delay:var(--d,0s)}
    /* Un cœur ne fait pas que battre : il paraît, il grossit, il s'efface,
       et un autre prend sa place. */
    .vitcoeur{animation:vitcoeur 6s ease-in-out infinite;animation-delay:var(--d,0s)}
    /* Un nuage TRAVERSE son monde et revient par l'autre bord. Le disque
       découpe l'image : il disparaît donc tout seul en sortant. */
    .traverse{animation:traverse var(--t,22s) linear infinite;animation-delay:var(--d,0s)}
    @keyframes vitcoeur{
      0%   {opacity:0;transform:scale(.35)}
      12%  {opacity:1;transform:scale(1.12)}
      20%  {transform:scale(.96)}
      30%  {transform:scale(1.08)}
      40%  {transform:scale(.98)}
      52%  {opacity:1;transform:scale(1.14)}
      70%  {opacity:.85;transform:scale(1)}
      88%  {opacity:0;transform:scale(.45)}
      100% {opacity:0;transform:scale(.35)}
    }
    @keyframes traverse{
      0%  {transform:translateX(-330px)}
      100%{transform:translateX(330px)}
    }
    @keyframes bat     {0%,100%{transform:scale(1)}18%{transform:scale(1.16)}30%{transform:scale(1.02)}45%{transform:scale(1.10)}}
    @keyframes respire {0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
    @keyframes flotte  {0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes derive  {0%{transform:translateX(-26px)}50%{transform:translateX(26px)}100%{transform:translateX(-26px)}}
    @keyframes aileG   {0%,100%{transform:scaleX(1)}50%{transform:scaleX(.42) }}
    @keyframes aileD   {0%,100%{transform:scaleX(1)}50%{transform:scaleX(.42) }}
    @keyframes queue   {0%,100%{transform:rotate(-13deg)}50%{transform:rotate(15deg)}}
    @keyframes dodeline{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}
    @keyframes brille  {0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.12)}}
  </style>`;

/* Le décalage d'une animation, à poser sur n'importe quel motif. */
function d(sec) { return ' style="--d:' + sec + 's"'; }

/* ── LES MOTIFS ────────────────────────────────────────────────────────
   Dessinés GROS et simples : à la taille où un monde est vu sur la carte,
   un détail de moins de six pixels disparaît. */

/* Un cœur, par ses deux lobes. */
function coeur(x, y, s, f, op, cls, del) {
  return '<path class="anim ' + (cls || '') + '"' + (del !== undefined ? d(del) : '')
    + ' d="M ' + x + ' ' + (y + s * 0.72)
    + ' C ' + (x - s * 1.15) + ' ' + (y - s * 0.15) + ' ' + (x - s * 0.52) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.28)
    + ' C ' + (x + s * 0.52) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.15) + ' ' + (y - s * 0.15) + ' ' + x + ' ' + (y + s * 0.72)
    + ' Z" fill="' + f + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
}

/* Une fleur en VOLUME : chaque pétale a son dégradé et son ombre, le cœur
   est bombé, et la fleur dodeline sur sa tige. Le client n'en voulait plus
   « en 2D ». */
function fleur(id, x, y, s, clair, fonce, mil, del) {
  let d2 = '<defs>'
    + '<radialGradient id="p-' + id + '" cx="38%" cy="30%" r="72%">'
    + '<stop offset="0%" stop-color="' + clair + '"/><stop offset="100%" stop-color="' + fonce + '"/></radialGradient>'
    + '<radialGradient id="m-' + id + '" cx="36%" cy="30%" r="70%">'
    + '<stop offset="0%" stop-color="#fff6c4"/><stop offset="100%" stop-color="' + mil + '"/></radialGradient>'
    + '</defs>';
  let p = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    const px = (x + Math.cos(a) * s * 0.60).toFixed(1);
    const py = (y + Math.sin(a) * s * 0.60).toFixed(1);
    p += '<ellipse cx="' + px + '" cy="' + py + '" rx="' + (s * 0.42).toFixed(1) + '" ry="' + (s * 0.56).toFixed(1)
      + '" fill="url(#p-' + id + ')" stroke="' + fonce + '" stroke-opacity=".35" stroke-width="2"'
      + ' transform="rotate(' + (i * 60) + ' ' + px + ' ' + py + ')"/>';
  }
  return d2 + '<g class="anim dodeline"' + d(del || 0) + '>' + p
    + '<circle cx="' + x + '" cy="' + y + '" r="' + (s * 0.36) + '" fill="url(#m-' + id + ')"/>'
    + '<circle cx="' + (x - s * 0.10) + '" cy="' + (y - s * 0.12) + '" r="' + (s * 0.10) + '" fill="#ffffff" opacity=".55"/>'
    + '</g>';
}

/* Une tige et ses deux feuilles, à poser sous une fleur. */
function tige(x, yHaut, yBas, c) {
  return '<path d="M ' + x + ' ' + yBas + ' C ' + (x - 4) + ' ' + ((yBas + yHaut) / 2) + ' ' + (x + 4) + ' ' + ((yBas + yHaut) / 2) + ' ' + x + ' ' + yHaut + '"'
    + ' stroke="' + c + '" stroke-width="7" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="' + (x - 15) + '" cy="' + (yBas - (yBas - yHaut) * 0.45) + '" rx="15" ry="8" fill="' + c + '" transform="rotate(-22 ' + (x - 15) + ' ' + (yBas - (yBas - yHaut) * 0.45) + ')"/>'
    + '<ellipse cx="' + (x + 15) + '" cy="' + (yBas - (yBas - yHaut) * 0.25) + '" rx="13" ry="7" fill="' + c + '" transform="rotate(22 ' + (x + 15) + ' ' + (yBas - (yBas - yHaut) * 0.25) + ')"/>';
}

/* Un nuage : un corps allongé et deux bosses. */
function nuage(x, y, s, f, op, del, traverse, duree) {
  var cls = traverse ? 'anim traverse' : 'anim derive';
  var sty = traverse
    ? ' style="--d:' + (del || 0) + 's;--t:' + (duree || 22) + 's"'
    : d(del || 0);
  return '<g class="' + cls + '" opacity="' + (op || 1) + '"' + sty + '>'
    + '<rect x="' + (x - s) + '" y="' + (y - s * 0.30) + '" width="' + (s * 2) + '" height="' + (s * 0.60)
    + '" rx="' + (s * 0.30) + '" fill="' + f + '"/>'
    + '<circle cx="' + (x - s * 0.34) + '" cy="' + (y - s * 0.32) + '" r="' + (s * 0.50) + '" fill="' + f + '"/>'
    + '<circle cx="' + (x + s * 0.32) + '" cy="' + (y - s * 0.18) + '" r="' + (s * 0.36) + '" fill="' + f + '"/>'
    + '</g>';
}

/* Un papillon qui BAT DES AILES : les deux paires d'un côté sont groupées,
   et chaque groupe se replie vers le corps. Il flotte en même temps. */
function papillon(x, y, s, a, b, del) {
  const k = s / 100;
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">'
    + '<g class="anim flotte"' + d(del || 0) + '>'
    + '<g class="anim aileG">'
    + '<ellipse cx="-52" cy="-30" rx="50" ry="40" fill="' + a + '" transform="rotate(-22 -52 -30)"/>'
    + '<ellipse cx="-40" cy="34" rx="36" ry="30" fill="' + b + '" transform="rotate(-12 -40 34)"/>'
    + '<circle cx="-56" cy="-34" r="13" fill="#ffffff" opacity=".55"/>'
    + '<circle cx="-44" cy="34" r="9" fill="#ffffff" opacity=".45"/>'
    + '</g>'
    + '<g class="anim aileD">'
    + '<ellipse cx="52" cy="-30" rx="50" ry="40" fill="' + a + '" transform="rotate(22 52 -30)"/>'
    + '<ellipse cx="40" cy="34" rx="36" ry="30" fill="' + b + '" transform="rotate(12 40 34)"/>'
    + '<circle cx="56" cy="-34" r="13" fill="#ffffff" opacity=".55"/>'
    + '<circle cx="44" cy="34" r="9" fill="#ffffff" opacity=".45"/>'
    + '</g>'
    + '<ellipse cx="0" cy="0" rx="9" ry="44" fill="#6b4a63"/>'
    + '<circle cx="0" cy="-44" r="11" fill="#6b4a63"/>'
    + '<path d="M -5 -52 Q -20 -74 -30 -66 M 5 -52 Q 20 -74 30 -66" stroke="#6b4a63" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<circle cx="-30" cy="-66" r="5" fill="#6b4a63"/><circle cx="30" cy="-66" r="5" fill="#6b4a63"/>'
    + '</g></g>';
}

/* Une couronne dessinée — gardée pour mémoire, le monde 2 porte
   maintenant l'image du client, posée par la carte. */
function couronne(x, y, s, or, ombre, pierre) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<path d="M -62 26 L -74 -46 L -34 -12 L 0 -60 L 34 -12 L 74 -46 L 62 26 Z" fill="' + or + '"/>'
    + '<path d="M -62 26 L 62 26 L 60 40 L -60 40 Z" fill="' + ombre + '"/>'
    + '<circle cx="0" cy="-66" r="10" fill="' + pierre + '"/>'
    + '</g>';
}

/* Un pingouin : corps, ventre, ailerons, bec, pieds. Il dodeline. */
function pingouin(x, y, s, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim dodeline"' + d(del || 0) + '>'
    + '<ellipse cx="-26" cy="52" rx="14" ry="7" fill="#f6a23c"/><ellipse cx="26" cy="52" rx="14" ry="7" fill="#f6a23c"/>'
    + '<ellipse cx="0" cy="4" rx="42" ry="52" fill="#3d3f56"/>'
    + '<ellipse cx="0" cy="12" rx="28" ry="40" fill="#fdfbff"/>'
    + '<ellipse cx="-44" cy="6" rx="12" ry="30" fill="#33354a" transform="rotate(14 -44 6)"/>'
    + '<ellipse cx="44" cy="6" rx="12" ry="30" fill="#33354a" transform="rotate(-14 44 6)"/>'
    + '<circle cx="-13" cy="-20" r="6" fill="#ffffff"/><circle cx="13" cy="-20" r="6" fill="#ffffff"/>'
    + '<circle cx="-12" cy="-19" r="3" fill="#2a2b3a"/><circle cx="14" cy="-19" r="3" fill="#2a2b3a"/>'
    + '<path d="M -9 -6 L 9 -6 L 0 8 Z" fill="#f6a23c"/>'
    + '</g></g>';
}

/* Une tortue de profil, entière : carapace bombée à écailles, plastron,
   tête qui sort, quatre pattes, petite queue. Elle respire. */
function tortue(id, x, y, s, hautClair, hautFonce, peau, del) {
  return '<defs><radialGradient id="t-' + id + '" cx="36%" cy="24%" r="78%">'
    + '<stop offset="0%" stop-color="' + hautClair + '"/><stop offset="100%" stop-color="' + hautFonce + '"/>'
    + '</radialGradient></defs>'
    + '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim respire"' + d(del || 0) + '>'
    /* pattes et queue, sous la carapace */
    + '<ellipse cx="-40" cy="40" rx="17" ry="11" fill="' + peau + '"/>'
    + '<ellipse cx="34" cy="40" rx="17" ry="11" fill="' + peau + '"/>'
    + '<path d="M -66 26 q -18 6 -22 -8 q 12 -6 22 -4 Z" fill="' + peau + '"/>'
    /* la carapace */
    + '<path d="M -72 28 q 0 -60 72 -60 q 72 0 72 60 Z" fill="url(#t-' + id + ')"/>'
    + '<g opacity=".5" fill="none" stroke="' + hautFonce + '" stroke-width="4" stroke-linejoin="round">'
    + '<path d="M -26 -22 l 22 -8 l 20 8 l -8 24 l -26 0 Z"/>'
    + '<path d="M -62 10 q 14 -16 34 -14 M 62 10 q -14 -16 -32 -14"/>'
    + '</g>'
    + '<path d="M -74 28 L 74 28 q 0 14 -22 14 L -52 42 q -22 0 -22 -14 Z" fill="' + peau + '" opacity=".9"/>'
    /* LA TETE, DEVANT la carapace : dessinee avant, elle disparaissait
       dessous et la tortue devenait un caillou vert. */
    + '<g class="anim dodeline"' + d((del || 0) + 0.5) + '>'
    + '<path d="M 56 8 q 30 -22 44 2 q 8 24 -14 30 q -24 4 -30 -14 Z" fill="' + peau + '"/>'
    + '<circle cx="90" cy="10" r="5.5" fill="#3d5a4a"/><circle cx="91.6" cy="8.4" r="2" fill="#fff"/>'
    + '<path d="M 86 26 q 10 2 14 -3" stroke="#3d5a4a" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '</g>'
    + '</g></g>';
}

/* Un ours BRUN entier : corps, tête, museau, quatre pattes. Le client n'en
   voulait plus « juste des têtes ». Il respire, et sa tête dodeline. */
function ours(x, y, s, poil, poilClair, museau, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim respire"' + d(del || 0) + '>'
    /* pattes arrière et avant */
    + '<ellipse cx="-34" cy="62" rx="20" ry="14" fill="' + poil + '"/>'
    + '<ellipse cx="34" cy="62" rx="20" ry="14" fill="' + poil + '"/>'
    + '<ellipse cx="-34" cy="64" rx="11" ry="7" fill="' + museau + '"/>'
    + '<ellipse cx="34" cy="64" rx="11" ry="7" fill="' + museau + '"/>'
    /* corps */
    + '<ellipse cx="0" cy="26" rx="48" ry="42" fill="' + poil + '"/>'
    + '<ellipse cx="0" cy="34" rx="28" ry="27" fill="' + poilClair + '" opacity=".75"/>'
    /* tête */
    + '<g class="anim dodeline"' + d((del || 0) + 0.4) + '>'
    + '<circle cx="-30" cy="-38" r="15" fill="' + poil + '"/><circle cx="30" cy="-38" r="15" fill="' + poil + '"/>'
    + '<circle cx="-30" cy="-38" r="7.5" fill="' + museau + '"/><circle cx="30" cy="-38" r="7.5" fill="' + museau + '"/>'
    + '<circle cx="0" cy="-18" r="38" fill="' + poil + '"/>'
    + '<ellipse cx="0" cy="0" rx="21" ry="16" fill="' + museau + '"/>'
    + '<ellipse cx="0" cy="-8" rx="8" ry="6" fill="#4a3128"/>'
    + '<path d="M 0 -2 v 7 M 0 5 q -8 6 -13 0 M 0 5 q 8 6 13 0" stroke="#4a3128" stroke-width="3.4" fill="none" stroke-linecap="round"/>'
    + '<circle cx="-15" cy="-28" r="5" fill="#4a3128"/><circle cx="15" cy="-28" r="5" fill="#4a3128"/>'
    + '<circle cx="-13.5" cy="-29.5" r="1.8" fill="#fff"/><circle cx="16.5" cy="-29.5" r="1.8" fill="#fff"/>'
    + '</g>'
    + '</g></g>';
}

/* Un chat entier, de profil : corps, tête, oreilles pointues, moustaches,
   et la QUEUE qui balaie. */
function chat(x, y, s, poil, clair, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim respire"' + d(del || 0) + '>'
    + '<path class="anim queue" d="M 44 34 q 34 6 30 -30 q -2 -20 -16 -18 q -10 2 -6 14 q 4 10 -8 12 Z" fill="' + poil + '"' + d((del || 0) + 0.2) + '/>'
    + '<ellipse cx="-16" cy="56" rx="13" ry="9" fill="' + poil + '"/><ellipse cx="26" cy="56" rx="13" ry="9" fill="' + poil + '"/>'
    + '<ellipse cx="6" cy="30" rx="46" ry="30" fill="' + poil + '"/>'
    + '<ellipse cx="2" cy="40" rx="30" ry="18" fill="' + clair + '" opacity=".7"/>'
    + '<g class="anim dodeline"' + d((del || 0) + 0.5) + '>'
    + '<path d="M -58 -18 L -50 -46 L -32 -26 Z" fill="' + poil + '"/>'
    + '<path d="M -16 -30 L -6 -52 L 4 -26 Z" fill="' + poil + '"/>'
    + '<path d="M -55 -22 L -50 -38 L -40 -26 Z" fill="#ffb8cf"/><path d="M -14 -32 L -7 -45 L 0 -30 Z" fill="#ffb8cf"/>'
    + '<circle cx="-28" cy="-4" r="30" fill="' + poil + '"/>'
    + '<circle cx="-38" cy="-10" r="5.5" fill="#3f3145"/><circle cx="-16" cy="-10" r="5.5" fill="#3f3145"/>'
    + '<circle cx="-36.5" cy="-11.5" r="2" fill="#fff"/><circle cx="-14.5" cy="-11.5" r="2" fill="#fff"/>'
    + '<path d="M -27 3 l -5 4 l 5 4 l 5 -4 Z" fill="#ff9ec4"/>'
    + '<path d="M -30 8 q -3 6 -9 5 M -24 8 q 3 6 9 5" stroke="#3f3145" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    + '<path d="M -44 4 L -66 0 M -44 10 L -66 12 M -10 4 L 10 0 M -10 10 L 10 12" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>'
    + '</g>'
    + '</g></g>';
}

/* Un chien entier, de profil : corps, tête ronde, oreilles tombantes,
   museau, et la queue qui remue. */
function chien(x, y, s, poil, clair, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim respire"' + d(del || 0) + '>'
    + '<path class="anim queue" d="M 46 22 q 30 -8 26 -30 q -2 -12 -12 -8 q -8 4 -4 12 q 3 8 -10 12 Z" fill="' + poil + '"' + d((del || 0) + 0.15) + '/>'
    + '<ellipse cx="-14" cy="58" rx="14" ry="10" fill="' + poil + '"/><ellipse cx="30" cy="58" rx="14" ry="10" fill="' + poil + '"/>'
    + '<ellipse cx="8" cy="30" rx="46" ry="31" fill="' + poil + '"/>'
    + '<ellipse cx="4" cy="42" rx="30" ry="17" fill="' + clair + '" opacity=".7"/>'
    + '<g class="anim dodeline"' + d((del || 0) + 0.6) + '>'
    + '<circle cx="-30" cy="-6" r="31" fill="' + poil + '"/>'
    + '<ellipse cx="-58" cy="-4" rx="12" ry="24" fill="' + poil + '" transform="rotate(12 -58 -4)"/>'
    + '<ellipse cx="-58" cy="-4" rx="7" ry="17" fill="' + clair + '" opacity=".55" transform="rotate(12 -58 -4)"/>'
    + '<ellipse cx="-22" cy="14" rx="21" ry="15" fill="' + clair + '"/>'
    + '<ellipse cx="-30" cy="8" rx="8" ry="6" fill="#3f3145"/>'
    + '<path d="M -30 14 v 6 M -30 20 q -7 5 -12 0 M -30 20 q 7 5 12 0" stroke="#3f3145" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<circle cx="-42" cy="-14" r="5.5" fill="#3f3145"/><circle cx="-18" cy="-14" r="5.5" fill="#3f3145"/>'
    + '<circle cx="-40.5" cy="-15.5" r="2" fill="#fff"/><circle cx="-16.5" cy="-15.5" r="2" fill="#fff"/>'
    + '</g>'
    + '</g></g>';
}

/* ── LES SUCRERIES : il en faut BEAUCOUP, et de toutes sortes ────────── */

function sucette(x, y, s, a, b, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim flotte"' + d(del || 0) + '>'
    + '<rect x="-4" y="28" width="8" height="58" rx="4" fill="#fff6e0"/>'
    + '<circle cx="0" cy="0" r="34" fill="' + a + '"/>'
    + '<path d="M 0 -27 a 27 27 0 0 1 24 14 a 20 20 0 0 0 -18 -10 a 14 14 0 0 1 12 8 a 7 7 0 0 0 -6 -4"'
    + ' fill="none" stroke="' + b + '" stroke-width="8" stroke-linecap="round"/>'
    + '<path d="M 0 27 a 27 27 0 0 1 -24 -14 a 20 20 0 0 0 18 10 a 14 14 0 0 1 -12 -8 a 7 7 0 0 0 6 4"'
    + ' fill="none" stroke="' + b + '" stroke-width="8" stroke-linecap="round"/>'
    + '<ellipse cx="-11" cy="-13" rx="7" ry="5" fill="#ffffff" opacity=".55"/>'
    + '</g></g>';
}

function bonbon(x, y, s, f, clair, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim dodeline"' + d(del || 0) + '>'
    + '<path d="M -28 0 L -60 -24 L -52 0 L -60 24 Z" fill="' + f + '" opacity=".85"/>'
    + '<path d="M 28 0 L 60 -24 L 52 0 L 60 24 Z" fill="' + f + '" opacity=".85"/>'
    + '<circle cx="0" cy="0" r="29" fill="' + f + '"/>'
    + '<circle cx="0" cy="0" r="29" fill="none" stroke="' + clair + '" stroke-width="5" stroke-opacity=".75"/>'
    + '<ellipse cx="-9" cy="-9" rx="10" ry="7" fill="' + clair + '" opacity=".9"/>'
    + '</g></g>';
}

function donut(x, y, s, pate, glacage, del) {
  let vermicelles = '';
  const cs = ['#ff6fae', '#7fd0f0', '#ffe36a', '#ffffff', '#a8e8d4'];
  for (let i = 0; i < 9; i++) {
    const a = (i * 40) * Math.PI / 180, r = 26 + (i % 3) * 5;
    vermicelles += '<rect x="' + (Math.cos(a) * r - 5).toFixed(1) + '" y="' + (Math.sin(a) * r - 2).toFixed(1)
      + '" width="10" height="4.5" rx="2.2" fill="' + cs[i % cs.length] + '"'
      + ' transform="rotate(' + (i * 47) + ' ' + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1) + ')"/>';
  }
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim flotte"' + d(del || 0) + '>'
    + '<circle cx="0" cy="0" r="42" fill="' + pate + '"/>'
    + '<path d="M -42 -2 a 42 42 0 0 1 84 0 a 42 30 0 0 1 -84 0 Z" fill="' + glacage + '"/>'
    + '<circle cx="0" cy="0" r="15" fill="#fff3e6"/>'
    + '<circle cx="0" cy="0" r="15" fill="none" stroke="' + pate + '" stroke-width="4"/>'
    + vermicelles
    + '</g></g>';
}

function cupcake(x, y, s, caisse, creme, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim flotte"' + d(del || 0) + '>'
    + '<path d="M -34 6 L -26 52 q 26 8 52 0 L 34 6 Z" fill="' + caisse + '"/>'
    + '<path d="M -34 6 L -26 52 q 26 8 52 0 L 34 6 Z" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="4"/>'
    + '<path d="M -36 6 q 6 -22 22 -20 q 4 -22 26 -14 q 20 -4 24 18 q 10 4 6 16 Z" fill="' + creme + '"/>'
    + '<circle cx="6" cy="-34" r="8" fill="#ff5f8f"/>'
    + '<circle cx="-16" cy="-6" r="4" fill="#ffffff" opacity=".7"/>'
    + '</g></g>';
}

function glace(x, y, s, boule1, boule2, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim dodeline"' + d(del || 0) + '>'
    + '<path d="M -22 6 L 0 62 L 22 6 Z" fill="#e8b06a"/>'
    + '<path d="M -14 18 L 4 22 M -8 34 L 10 30 M -2 48 L 8 44" stroke="#c9903f" stroke-width="3" stroke-linecap="round"/>'
    + '<circle cx="-9" cy="-4" r="21" fill="' + boule1 + '"/>'
    + '<circle cx="12" cy="-2" r="19" fill="' + boule2 + '"/>'
    + '<circle cx="1" cy="-26" r="18" fill="' + boule1 + '" opacity=".92"/>'
    + '<circle cx="-6" cy="-32" r="5" fill="#ffffff" opacity=".6"/>'
    + '<path d="M 1 -44 l 4 8 l -8 0 Z" fill="#ff5f8f"/>'
    + '</g></g>';
}

function canne(x, y, s, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim dodeline"' + d(del || 0) + '>'
    + '<path d="M -8 56 L -8 -12 a 20 20 0 0 1 40 0 L 32 6" stroke="#ffffff" stroke-width="17" fill="none" stroke-linecap="round"/>'
    + '<path d="M -8 56 L -8 -12 a 20 20 0 0 1 40 0 L 32 6" stroke="#ff5f8f" stroke-width="17" fill="none"'
    + ' stroke-linecap="round" stroke-dasharray="9 13"/>'
    + '</g></g>';
}

function nounours(x, y, s, del) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 100) + ')">'
    + '<g class="anim bat"' + d(del || 0) + '>'
    + '<circle cx="-26" cy="-24" r="12" fill="#ff9ec4"/><circle cx="26" cy="-24" r="12" fill="#ff9ec4"/>'
    + '<circle cx="0" cy="-14" r="22" fill="#ff9ec4"/>'
    + '<ellipse cx="0" cy="22" rx="26" ry="28" fill="#ff9ec4"/>'
    + '<ellipse cx="-30" cy="14" rx="11" ry="17" fill="#ff9ec4" transform="rotate(20 -30 14)"/>'
    + '<ellipse cx="30" cy="14" rx="11" ry="17" fill="#ff9ec4" transform="rotate(-20 30 14)"/>'
    + '<ellipse cx="-16" cy="46" rx="12" ry="9" fill="#ff9ec4"/><ellipse cx="16" cy="46" rx="12" ry="9" fill="#ff9ec4"/>'
    + '<circle cx="-7" cy="-18" r="3.4" fill="#a8386a"/><circle cx="7" cy="-18" r="3.4" fill="#a8386a"/>'
    + '<ellipse cx="0" cy="-8" rx="6" ry="4.5" fill="#a8386a"/>'
    + '</g></g>';
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
    + '<path class="anim dodeline" d="M 0 -92 L 0 -104 L 22 -98 L 0 -92 Z" fill="#ff9ec4"/>'
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

/* Les petites étoiles à quatre branches des planètes : elles scintillent. */
function etincelles(l) {
  return l.map(function (e, i) {
    const x = e[0], y = e[1], s = e[2];
    return '<path class="anim brille"' + d((i * 0.7).toFixed(1))
      + ' d="M ' + x + ' ' + (y - s) + ' Q ' + x + ' ' + y + ' ' + (x + s) + ' ' + y
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

/* Le monde : un disque pastel, son halo, son sol, et ce qu'on y pose. */
function monde(o) {
  const id = o.nom;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">\n'
    + MOUVEMENT + '\n'
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
  /* 1 — les licornes. Le décor est un ciel d'arc-en-ciel et de nuages : LA
     LICORNE, c'est celle du client, posée sur le monde par la carte tant
     que la fille ne l'a pas rejointe. Aucune licorne dessinée ici. */
  { nom: 'licornes', r: 128,
    /* Un ciel d'arc-en-ciel au-dessus d'une prairie mauve. */
    ciel: ['#d8ecff', '#f4dcff', '#e8c4fa'], terre: '#c9a2ec',
    paysage: arcEnCiel(700, 640, 470, 40)
      + nuage(300, 190, 70, '#ffffff', .9, 0, true, 46)
      + nuage(1050, 250, 56, '#ffffff', .8, -18, true, 38)
      + '<ellipse cx="700" cy="900" rx="900" ry="200" fill="#dcb8f8" opacity=".55"/>', clair: '#fdeaff', moyen: '#e8c0fa', fonce: '#b478d8', halo: '#e0a8ff', trait: '#9a5cbc',
    sol: sol('#dcaef2', 62, '#ecc8ff'),
    dedans: arcEnCiel(200, 214, 116, 11)
      + nuage(126, 148, 40, '#ffffff', .92, 0)
      + nuage(280, 176, 34, '#ffffff', .85, 3)
      + nuage(196, 296, 46, '#ffffff', .8, 6)
      + coeur(96, 236, 16, '#ffffff', '.75', 'bat', 0.4)
      + coeur(306, 250, 14, '#ffffff', '.75', 'bat', 1.1),
    etincelles: [[86, 118, 13], [318, 130, 11], [96, 300, 10]] },

  /* 2 — la couronne. Le décor porte le COUSSIN ; la couronne elle-même est
     l'image du client, posée par la carte, et elle disparaît quand la
     fille la gagne. */
  { nom: 'couronne', r: 126,
    /* Une salle du trône : ciel doré, tapis rouge, coussin au milieu. */
    ciel: ['#fff8e8', '#ffeccc', '#f7d5a0'], terre: '#e8b06a',
    paysage: '<path d="M 470 900 L 620 620 L 780 620 L 930 900 Z" fill="#e8628f" opacity=".55"/>'
      + '<g class="anim flotte"><path d="M 560 610 q 140 -52 280 0 q 12 46 -28 62 q -112 30 -224 0 q -40 -16 -28 -62 Z" fill="#e86a9c"/>'
      + '<path d="M 560 610 q 140 -52 280 0 q -140 52 -280 0 Z" fill="#ff9ec4"/></g>'
      + coeur(240, 300, 34, '#ff9ec4', '.8', 'vitcoeur', 0)
      + coeur(1160, 260, 30, '#ff9ec4', '.8', 'vitcoeur', 2.4), clair: '#fff7e6', moyen: '#ffe1b0', fonce: '#e8a86a', halo: '#ffd08a', trait: '#c98a4a',
    sol: sol('#f7cf9a', 58, '#ffe2b8'),
    dedans: '<ellipse cx="200" cy="214" rx="96" ry="90" fill="#ffffff" opacity=".34"/>'
      + '<g class="anim flotte">'
      + '<path d="M 128 268 q 72 -26 144 0 q 6 24 -14 32 q -58 16 -116 0 q -20 -8 -14 -32 Z" fill="#e86a9c"/>'
      + '<path d="M 128 268 q 72 -26 144 0 q -72 26 -144 0 Z" fill="#ff9ec4"/>'
      + '<circle cx="132" cy="296" r="9" fill="#ffd34e"/><circle cx="268" cy="296" r="9" fill="#ffd34e"/>'
      + '</g>'
      + coeur(112, 196, 16, '#ff9ec4', null, 'bat', 0.2)
      + coeur(292, 190, 14, '#ff9ec4', null, 'bat', 0.9),
    etincelles: [[96, 112, 14], [312, 128, 12], [300, 300, 11], [200, 150, 13]] },

  /* 3 — les nuages, qui dérivent lentement. */
  { nom: 'nuages', r: 128,
    /* Rien que du ciel : les nuages le traversent de part en part. */
    ciel: ['#bfe6ff', '#dcf2ff', '#a8d8f4'], terre: '#c8e8ff',
    paysage: nuage(700, 170, 90, '#ffffff', .95, 0, true, 52)
      + nuage(700, 330, 66, '#ffffff', .9, -16, true, 40)
      + nuage(700, 520, 104, '#ffffff', .85, -30, true, 62)
      + nuage(700, 700, 74, '#ffffff', .8, -46, true, 46), clair: '#f2fbff', moyen: '#c5e9ff', fonce: '#79b8e8', halo: '#a8dcff', trait: '#5f9fd0',
    dedans: nuage(200, 150, 54, '#ffffff', .95, 0, true, 24)
      + nuage(200, 208, 44, '#ffffff', .9, -7, true, 19)
      + nuage(200, 262, 62, '#ffffff', .85, -14, true, 28)
      + nuage(200, 122, 30, '#ffffff', .8, -4, true, 16)
      + nuage(200, 310, 36, '#ffffff', .75, -18, true, 21),
    etincelles: [[92, 120, 12], [318, 296, 12], [110, 316, 10]] },

  /* 4 — les fleurs, en volume, qui dodelinent sur leurs tiges. */
  { nom: 'fleurs', r: 128,
    /* Un pré fleuri sous un ciel tendre. */
    ciel: ['#e8f8ff', '#f4ffe8', '#cfeeb0'], terre: '#8fce78',
    paysage: '<ellipse cx="700" cy="920" rx="900" ry="220" fill="#a8dc8c" opacity=".7"/>'
      + tige(180, 560, 900, '#5f9e4c') + tige(1220, 580, 900, '#5f9e4c')
      + tige(430, 500, 900, '#5f9e4c') + tige(980, 520, 900, '#5f9e4c')
      + tige(700, 600, 900, '#68a854')
      + fleur('gg1', 180, 548, 92, '#ffc9e0', '#ff6fae', '#ffcf4e', 0)
      + fleur('gg2', 1220, 568, 86, '#d8c8ff', '#9a6fd8', '#ffcf4e', 1.4)
      + fleur('gg3', 430, 488, 104, '#ffffff', '#e8c0f4', '#ffbe3c', 0.7)
      + fleur('gg4', 980, 508, 96, '#ffe0b8', '#f0a04c', '#ff8ec4', 2.1)
      + fleur('gg5', 700, 588, 76, '#c8e8ff', '#4fa8e0', '#ffd34e', 2.8)
      + nuage(560, 190, 60, '#ffffff', .85, 0, true, 44), clair: '#f6ffef', moyen: '#d6f2c0', fonce: '#8fc879', halo: '#bfe8a8', trait: '#6aa858',
    sol: sol('#8fce78', 74, '#a8dc8c'),
    dedans: tige(106, 226, 322, '#5f9e4c') + tige(200, 206, 330, '#5f9e4c') + tige(294, 226, 322, '#5f9e4c')
      + tige(152, 276, 336, '#68a854') + tige(250, 272, 336, '#68a854')
      + fleur('f1', 106, 216, 32, '#ffc9e0', '#ff6fae', '#ffcf4e', 0)
      + fleur('f2', 200, 196, 36, '#ffffff', '#e8c0f4', '#ffbe3c', 0.6)
      + fleur('f3', 294, 216, 32, '#d8c8ff', '#9a6fd8', '#ffcf4e', 1.2)
      + fleur('f4', 152, 266, 26, '#ffe0b8', '#f0a04c', '#ff8ec4', 1.8)
      + fleur('f5', 250, 262, 26, '#c8e8ff', '#4fa8e0', '#ffd34e', 2.4)
      + fleur('f6', 200, 300, 24, '#ffd8ee', '#e86ab0', '#ffcf4e', 3.0),
    etincelles: [[96, 122, 12], [312, 128, 11], [300, 306, 10]] },

  /* 5 — les cœurs, qui BATTENT. */
  { nom: 'coeurs', r: 128,
    /* Une pluie de cœurs, du haut en bas. */
    ciel: ['#fff0f6', '#ffd8e8', '#ffb3d1'], terre: '#ff9ec4',
    paysage: coeur(260, 240, 90, '#ff5f8f', null, 'vitcoeur', 0)
      + coeur(1140, 300, 74, '#ff85b5', null, 'vitcoeur', 1.2)
      + coeur(700, 200, 56, '#ffffff', '.9', 'vitcoeur', 2.4)
      + coeur(420, 640, 64, '#ff2e6b', '.9', 'vitcoeur', 3.6)
      + coeur(1000, 700, 80, '#ffb3d1', null, 'vitcoeur', 4.8)
      + coeur(120, 620, 48, '#ffc9df', null, 'vitcoeur', 1.8), clair: '#fff2f7', moyen: '#ffd0e4', fonce: '#f07aae', halo: '#ff9ecf', trait: '#d4568f',
    dedans: coeur(196, 204, 62, '#ff5f8f', null, 'bat', 0)
      + coeur(126, 172, 34, '#ff9ec4', null, 'vitcoeur', 0)
      + coeur(272, 174, 30, '#ffb3d1', null, 'vitcoeur', 0.9)
      + coeur(140, 286, 32, '#ff85b5', null, 'vitcoeur', 1.8)
      + coeur(266, 282, 38, '#ff2e6b', '.9', 'vitcoeur', 2.7)
      + coeur(206, 302, 22, '#ffc9df', null, 'vitcoeur', 3.6)
      + coeur(200, 118, 18, '#ffffff', '.9', 'vitcoeur', 4.5)
      + coeur(158, 232, 20, '#ffffff', '.8', 'vitcoeur', 5.4)
      + coeur(246, 236, 24, '#ff85b5', null, 'vitcoeur', 1.35)
      + coeur(304, 226, 18, '#ffc9df', null, 'vitcoeur', 3.15),
    etincelles: [[92, 232, 12], [306, 234, 11], [150, 120, 12]] },

  /* 6 — les pingouins sur la banquise. */
  { nom: 'pingouins', r: 128, bouquetsCiel: false,
    /* LA BANQUISE : un ciel polaire, la glace, ses blocs et son eau. */
    ciel: ['#cfeeff', '#eaf8ff', '#ffffff'], terre: '#ffffff',
    paysage: '<path d="M 0 780 L 220 600 L 430 780 Z" fill="#ffffff"/>'
      + '<path d="M 320 800 L 560 560 L 800 800 Z" fill="#f4fbff"/>'
      + '<path d="M 900 790 L 1120 590 L 1340 790 Z" fill="#ffffff"/>'
      + '<path d="M 0 700 L 220 600 L 300 660 Z" fill="#dceeff" opacity=".8"/>'
      + '<path d="M 560 560 L 700 690 L 460 690 Z" fill="#dceeff" opacity=".8"/>'
      + '<ellipse cx="700" cy="900" rx="900" ry="150" fill="#bfe4ff" opacity=".6"/>'
      + nuage(400, 180, 62, '#ffffff', .9, 0, true, 50)
      + nuage(1060, 240, 48, '#ffffff', .8, -22, true, 40), clair: '#fbfeff', moyen: '#dbf1ff', fonce: '#94c8e8', halo: '#bfe4ff', trait: '#6ea8cc',
    sol: sol('#eaf8ff', 84, '#ffffff'),
    /* Les pingouins sont ceux du client, poses par la carte : ici, la
       banquise seule. */
    dedans: '<path d="M 84 302 L 128 252 L 172 302 Z" fill="#ffffff" opacity=".9"/>'
      + '<path d="M 232 298 L 286 240 L 336 298 Z" fill="#f2fbff" opacity=".9"/>'
      + '<ellipse cx="200" cy="316" rx="86" ry="16" fill="#ffffff" opacity=".75"/>'
      + nuage(150, 146, 34, '#ffffff', .85, 0, true, 26)
      + nuage(260, 176, 26, '#ffffff', .8, -9, true, 20),
    etincelles: [[98, 128, 12], [306, 132, 11], [200, 104, 10]] },

  /* 7 — les papillons, qui battent des ailes en flottant. */
  { nom: 'papillons', r: 128, bouquetsCiel: false,
    /* Une prairie de lavande, pour que les papillons s'y détachent. */
    ciel: ['#f4ecff', '#e8dcff', '#cbb4f2'], terre: '#b79ae8',
    paysage: '<ellipse cx="700" cy="920" rx="900" ry="210" fill="#c9b0f0" opacity=".7"/>'
      + '<path d="M 120 900 v -120 M 260 900 v -150 M 420 900 v -110 M 980 900 v -140 M 1150 900 v -120 M 1300 900 v -100"'
      + ' stroke="#9a7fd0" stroke-width="9" stroke-linecap="round" opacity=".55"/>'
      + nuage(340, 200, 54, '#ffffff', .75, 0, true, 46)
      + nuage(1000, 280, 44, '#ffffff', .7, -14, true, 38), clair: '#fdf4ff', moyen: '#e8d8ff', fonce: '#a98fd8', halo: '#c9b6ff', trait: '#8a6ec0',
    sol: sol('#c2a8ec', 56, '#d8c4ff'),
    /* Les papillons sont ceux du client, et ils volent : ici, le pre et le
       ciel qui les portent. */
    dedans: nuage(180, 140, 30, '#ffffff', .8, 0, true, 24)
      + nuage(230, 186, 24, '#ffffff', .7, -8, true, 18)
      + '<path d="M 96 306 q 30 -20 58 -2 t 58 -2 t 58 4" stroke="#b49ae0" stroke-width="6" fill="none" opacity=".55"/>'
      + '<path d="M 120 316 v -16 M 168 320 v -20 M 224 318 v -18 M 276 312 v -16"'
      + ' stroke="#9a7fd0" stroke-width="5" stroke-linecap="round" opacity=".5"/>',
    etincelles: [[94, 122, 12], [312, 300, 11], [104, 306, 10]] },

  /* 8 — l'île de la tortue : plusieurs tortues, qui respirent. */
  { nom: 'tortue', r: 128, bouquetsCiel: false,
    /* Une plage : la mer en haut, le sable en bas, et le ressac entre les
       deux. */
    ciel: ['#d8f6ff', '#a8e8e0', '#6fc8c0'], terre: '#ffe9b8',
    paysage: '<path class="anim derive" d="M 0 640 q 140 -30 280 0 t 280 0 t 280 0 t 280 0 t 280 0" stroke="#ffffff" stroke-width="10" fill="none" opacity=".75"/>'
      + '<path class="anim derive" style="--d:-8s" d="M 0 690 q 160 -26 320 0 t 320 0 t 320 0 t 320 0" stroke="#ffffff" stroke-width="8" fill="none" opacity=".6"/>'
      + '<ellipse cx="700" cy="930" rx="900" ry="190" fill="#fff3d4" opacity=".8"/>'
      + '<ellipse cx="300" cy="840" rx="70" ry="20" fill="#ffdca8"/>'
      + '<ellipse cx="1120" cy="800" rx="56" ry="16" fill="#ffdca8"/>'
      + nuage(420, 180, 58, '#ffffff', .85, 0, true, 48), clair: '#f2fffb', moyen: '#c4f0e2', fonce: '#6fc0a8', halo: '#a8e8d4', trait: '#4f9c88',
    sol: sol('#ffe9b8', 66, '#fff3d4'),
    /* Les tortues sont celles du client : ici, la plage et le ressac. */
    dedans: '<path class="anim derive" d="M 60 296 q 34 -14 62 0 t 62 0 t 62 0 t 62 0" stroke="#8fdcc4" stroke-width="7" fill="none" opacity=".7"/>'
      + '<path class="anim derive" style="--d:-6s" d="M 60 316 q 34 -12 62 0 t 62 0 t 62 0 t 62 0" stroke="#a8e8d4" stroke-width="6" fill="none" opacity=".6"/>'
      + '<ellipse cx="286" cy="322" rx="26" ry="8" fill="#ffdca8"/>'
      + '<ellipse cx="126" cy="326" rx="20" ry="6" fill="#ffdca8"/>'
      + nuage(178, 148, 30, '#ffffff', .8, 0, true, 25),
    etincelles: [[96, 126, 12], [308, 134, 11], [312, 298, 10]] },

  /* 9 — les chats et les chiens, entiers, avec leurs queues qui remuent.
     Plus d'empreintes : le client n'en voulait pas. */
  { nom: 'chats-chiens', r: 128, bouquetsCiel: false,
    /* Un jardin, sa balle et sa niche. */
    ciel: ['#eaf6ff', '#fff4e0', '#ffe0bc'], terre: '#a8dc8c',
    paysage: '<ellipse cx="700" cy="920" rx="900" ry="210" fill="#8fce78" opacity=".75"/>'
      + '<circle cx="1120" cy="760" r="42" fill="#ff9ec4"/>'
      + '<path d="M 1082 742 q 38 -22 76 6 M 1084 780 q 38 18 74 -10" stroke="#ffffff" stroke-width="9" fill="none"/>'
      + '<path d="M 170 800 h 180 v -90 l -90 -70 l -90 70 Z" fill="#c98a52"/>'
      + '<ellipse cx="260" cy="790" rx="46" ry="56" fill="#7a4f2c"/>'
      + coeur(700, 230, 44, '#ff9ec4', '.85', 'vitcoeur', 0)
      + coeur(1240, 300, 32, '#ffb3d1', '.8', 'vitcoeur', 2.6), clair: '#fff8f0', moyen: '#ffe2c4', fonce: '#e0a878', halo: '#ffcf9e', trait: '#c08a58',
    sol: sol('#a8dc8c', 66, '#bfe8a0'),
    /* Le chien et les chats sont ceux du client : ici, le pre, sa balle et
       ses coeurs. */
    dedans: '<circle cx="300" cy="306" r="16" fill="#ff9ec4"/>'
      + '<path d="M 286 300 q 14 -8 28 2 M 288 312 q 14 6 26 -4" stroke="#ffffff" stroke-width="4" fill="none"/>'
      + '<path d="M 96 312 q 12 -20 24 0 M 130 318 q 10 -16 20 0" stroke="#5f9e4c" stroke-width="6" fill="none" stroke-linecap="round"/>'
      + coeur(206, 140, 22, '#ff9ec4', '.85', 'vitcoeur', 0)
      + coeur(128, 178, 16, '#ffb3d1', '.8', 'vitcoeur', 2.2),
    etincelles: [[92, 122, 12], [314, 296, 11], [300, 130, 10]] },

  /* 10 — les ours bruns, ENTIERS. */
  { nom: 'ours', r: 128, bouquetsCiel: false,
    /* Une clairière : des sapins, l'herbe et le pot de miel. */
    ciel: ['#fff2dc', '#ffe4c0', '#f0d2a0'], terre: '#8fc878',
    paysage: '<ellipse cx="700" cy="920" rx="900" ry="220" fill="#a8dc8c" opacity=".75"/>'
      + '<g opacity=".9">'
      + '<path d="M 150 640 l 70 -170 l 70 170 Z" fill="#4f8c46"/><path d="M 150 720 l 70 -160 l 70 160 Z" fill="#5f9e4c"/>'
      + '<rect x="208" y="716" width="24" height="54" fill="#8f6a44"/>'
      + '<path d="M 1120 610 l 60 -150 l 60 150 Z" fill="#4f8c46"/><path d="M 1120 690 l 60 -140 l 60 140 Z" fill="#5f9e4c"/>'
      + '<rect x="1170" y="686" width="20" height="48" fill="#8f6a44"/>'
      + '</g>'
      + '<path d="M 620 830 q 70 -18 70 34 q 0 34 -70 34 q -70 0 -70 -34 q 0 -52 70 -34 Z" fill="#ffcf6a"/>'
      + '<rect x="548" y="818" width="144" height="30" rx="15" fill="#e8a83c"/>'
      + nuage(880, 200, 56, '#ffffff', .8, 0, true, 46), clair: '#fff6ea', moyen: '#f0d6b0', fonce: '#c99a68', halo: '#e8c096', trait: '#a87c4e',
    sol: sol('#8fc878', 70, '#a8dc8c'),
    /* Les ours sont ceux du client : ici, la clairiere, ses sapins et son
       petit pot de miel. */
    dedans: '<path d="M 96 306 q 12 -24 24 0 M 316 300 q 12 -22 22 0 M 138 316 q 10 -18 20 0"'
      + ' stroke="#5f9e4c" stroke-width="6" fill="none" stroke-linecap="round"/>'
      + '<path d="M 116 250 l 18 -44 l 18 44 Z" fill="#4f8c46" opacity=".85"/>'
      + '<path d="M 116 272 l 18 -40 l 18 40 Z" fill="#5f9e4c" opacity=".85"/>'
      + '<rect x="130" y="270" width="8" height="16" fill="#8f6a44"/>'
      + '<path d="M 268 300 q 22 -6 22 12 q 0 12 -22 12 q -22 0 -22 -12 q 0 -18 22 -12 Z" fill="#ffcf6a"/>'
      + '<rect x="248" y="296" width="44" height="10" rx="5" fill="#e8a83c"/>'
      + nuage(198, 146, 28, '#ffffff', .75, 0, true, 27),
    etincelles: [[94, 124, 12], [310, 130, 11], [304, 302, 10]] },

  /* 11 — les sucreries : il en faut BEAUCOUP, et de toutes sortes. */
  { nom: 'sucreries', r: 128, clair: '#fff4fb', moyen: '#ffd8ee', fonce: '#f08acc',
    halo: '#ffabe0', trait: '#d466ac',
    /* Un pays de sucre : ciel framboise, sol de glaçage — et des sucreries
       SEMÉES SUR TOUT L'ÉCRAN, régulièrement, comme le client l'a demandé :
       elles s'entassaient en bas avec un donut perdu dans un coin. */
    ciel: ['#fff0fa', '#ffd8ee', '#ffb3dc'], terre: '#ff9ed8', bouquetsCiel: false,
    paysage: '<ellipse cx="700" cy="920" rx="900" ry="200" fill="#ffc4e8" opacity=".8"/>'
      + '<path d="M 0 760 q 100 -60 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 t 200 0 L 1400 900 L 0 900 Z" fill="#ffffff" opacity=".7"/>'
      /* rangée haute */
      + sucette(150, 130, 96, '#ffffff', '#ff6fae', 0)
      + donut(430, 110, 96, '#e8a86a', '#ff9ec4', 0.7)
      + glace(700, 125, 92, '#a8e8d4', '#ffd34e', 1.4)
      + cupcake(980, 120, 92, '#ffb3d1', '#fff0f8', 2.1)
      + canne(1260, 130, 84, 2.8)
      /* rangée du milieu */
      + bonbon(120, 360, 84, '#a8e8d4', '#e8fff8', 0.4)
      + nounours(400, 350, 78, 1.1)
      + sucette(690, 355, 88, '#fff3b8', '#7fd0f0', 1.8)
      + donut(970, 345, 88, '#d8a86a', '#7fd0f0', 2.5)
      + glace(1250, 360, 84, '#ffc9e0', '#fff3b8', 3.2)
      /* rangée basse, posée sur le glaçage */
      + cupcake(180, 620, 96, '#c9b6ff', '#fff6d8', 0.9)
      + canne(450, 615, 92, 1.6)
      + nounours(720, 625, 84, 2.3)
      + bonbon(1000, 620, 90, '#ffe36a', '#fff8d8', 3.0)
      + sucette(1270, 610, 92, '#ffd6e8', '#a86ad8', 3.7)
      + coeur(280, 240, 26, '#ffffff', '.9', 'bat', 1.2)
      + coeur(840, 250, 22, '#ffffff', '.9', 'bat', 2.4)
      + coeur(1130, 480, 24, '#ffffff', '.9', 'bat', 0.6),
    /* DEUX FOIS PLUS de sucreries, demandees le 20 aout — et toutes DANS le
       disque : a y=320 il ne reste que 120 px de large, tout ce qui
       descendait plus bas etait rogne. */
    dedans: sucette(128, 150, 58, '#ffffff', '#ff6fae', 0)
      + sucette(200, 128, 46, '#fff3b8', '#7fd0f0', 0.4)
      + sucette(272, 152, 50, '#ffd6e8', '#a86ad8', 0.8)
      + sucette(316, 214, 42, '#d8f4ff', '#ff9ec4', 1.2)
      + donut(112, 214, 56, '#e8a86a', '#ff9ec4', 0.6)
      + donut(288, 276, 52, '#d8a86a', '#7fd0f0', 1.6)
      + cupcake(174, 206, 54, '#ffb3d1', '#fff0f8', 1.0)
      + cupcake(244, 214, 50, '#c9b6ff', '#fff6d8', 2.0)
      + glace(140, 276, 54, '#a8e8d4', '#ffd34e', 1.4)
      + glace(210, 286, 50, '#ffc9e0', '#fff3b8', 2.4)
      + canne(266, 172, 44, 1.8)
      + canne(96, 158, 40, 2.8)
      + bonbon(172, 320, 42, '#a8e8d4', '#e8fff8', 2.2)
      + bonbon(252, 322, 40, '#ffe36a', '#fff8d8', 3.0)
      + nounours(304, 122, 38, 0.7)
      + nounours(100, 292, 38, 2.6)
      + coeur(200, 172, 15, '#ffffff', '.9', 'bat', 1.5)
      + coeur(330, 172, 13, '#ffffff', '.9', 'bat', 2.4),
    etincelles: [[96, 250, 12], [310, 130, 11], [110, 130, 10]] },

  /* 12 — le château de la princesse : elle rentre chez elle. */
  { nom: 'chateau', r: 128,
    /* Le château au bout du chemin : elle rentre chez elle. */
    ciel: ['#fff0f8', '#ffd8ec', '#e8c0f4'], terre: '#c2a0dc',
    paysage: '<ellipse cx="700" cy="930" rx="900" ry="200" fill="#d8bcf0" opacity=".75"/>'
      + chateau(700, 620, 420, '#fff0f8', '#e8b8d4', '#ff7fb8')
      + '<path d="M 700 900 L 620 900 Q 660 800 700 780 Q 740 800 780 900 Z" fill="#f0dcff" opacity=".8"/>'
      + coeur(230, 280, 40, '#ffffff', '.85', 'vitcoeur', 0)
      + coeur(1180, 320, 34, '#ffffff', '.85', 'vitcoeur', 2.8)
      + nuage(380, 190, 58, '#ffffff', .8, 0, true, 48), clair: '#fff2f9', moyen: '#ffd6ea', fonce: '#e08ab8', halo: '#ffabd4', trait: '#c26a9c',
    sol: sol('#c2a0dc', 66, '#d8bcf0'),
    dedans: chateau(200, 220, 128, '#fff0f8', '#e8b8d4', '#ff7fb8')
      + coeur(110, 210, 18, '#ffffff', '.85', 'bat', 0.2)
      + coeur(292, 204, 16, '#ffffff', '.85', 'bat', 0.9)
      + nuage(288, 146, 26, '#ffffff', .8, 3)
      + '<path d="M 96 302 q 40 -18 72 0 t 72 0 t 64 0" stroke="#e8c4f8" stroke-width="6" fill="none" opacity=".8"/>',
    etincelles: [[92, 128, 13], [312, 132, 12], [200, 100, 11]] }
];

/* LA SCENE DU COURS. Quand la fille entre dans un monde, le cours doit
 * porter le meme decor qu'elle : des licornes chez les licornes, des
 * papillons chez les papillons. On reprend donc les MEMES motifs, semes
 * trois fois sur un cadre large et sans disque, en fond de page.
 * Les motifs sont dessines pour un carre de 400 : on les repose donc a
 * trois endroits, a trois tailles, plutot que de tout redessiner. */
/* LE PAYSAGE DU MONDE, en fond d'écran plein cadre.
 *
 * Quand la fille entre dans un monde, ce n'est plus le dégradé pastel de la
 * carte qu'elle voit derrière son cours, mais LE MONDE lui-même : la
 * banquise chez les pingouins, la plage chez les tortues, le pré chez les
 * ours. Le client l'a demandé le 20 août, et c'est ce qui fait la
 * différence entre « un décor » et « y être ».
 *
 * Le fichier est large (1400 × 900) et servi en `background-size:cover` :
 * il se recadre tout seul, du téléphone en portrait à l'écran de bureau.
 * Ce qui compte doit donc rester dans la bande du milieu — les bords sont
 * les premiers rognés.
 *
 * `ciel` donne les trois couleurs du fond, `terre` la couleur du sol, et
 * `paysage` ce qu'on y sème de propre à ce monde. Le reste — les bouquets
 * de motifs — vient du décor de la carte, repris tel quel : les deux
 * doivent se ressembler, sinon on ne comprend pas où l'on est. */
function ciel(o) {
  const c = o.ciel || [o.clair, o.moyen, o.fonce];
  const terre = o.terre || o.moyen;
  const W = 1400, H = 900, SOL = H * 0.72;
  function bouquet(cx, cy, k, op) {
    return '  <g transform="translate(' + (cx - 200 * k).toFixed(0) + ' ' + (cy - 230 * k).toFixed(0)
      + ') scale(' + k + ')" opacity="' + op + '">' + (o.dedans || '') + '</g>\n';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"'
    + ' width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid slice">\n'
    + MOUVEMENT + '\n'
    + '  <defs><linearGradient id="ciel-' + o.nom + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="' + c[0] + '"/>'
    + '<stop offset="52%" stop-color="' + c[1] + '"/>'
    + '<stop offset="100%" stop-color="' + c[2] + '"/></linearGradient></defs>\n'
    + '  <rect width="' + W + '" height="' + H + '" fill="url(#ciel-' + o.nom + ')"/>\n'
    /* le sol : une courbe douce, pas une ligne droite */
    + '  <path d="M 0 ' + (SOL + 40) + ' Q ' + (W * 0.25) + ' ' + (SOL - 40) + ' ' + (W * 0.5) + ' ' + SOL
    + ' T ' + W + ' ' + (SOL + 20) + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z" fill="' + terre + '"/>\n'
    + (o.paysage || '')
    /* Les bouquets de motifs restent AU SOL. Semés en plein ciel, un pot de
       miel ou une touffe d'herbe flottent — cela se voit tout de suite. Et
       les mondes qui ont les illustrations du client n'en portent pas : ses
       bêtes et le paysage suffisent, le reste ferait doublon. */
    + (o.bouquetsCiel === false ? ''
        : bouquet(250, 700, 1.0, '.9')
        + bouquet(1170, 690, 0.8, '.8')
        + bouquet(700, 780, 1.1, '.85'))
    + '</svg>\n';
}

/* La scene transparente a ete remplacee par le PAYSAGE plein cadre :
   dans un monde, on veut le monde, pas un filigrane. */


/* LES SUCRERIES EN PIÈCES DÉTACHÉES.
 *
 * Dans le cours du monde des sucreries, il en faut au premier plan, posées
 * en bas de l'écran — le paysage seul est recadré par `cover` et n'en
 * laisse presque rien voir. Chaque friandise est donc écrite dans son
 * propre fichier, comme les bêtes du client, et la page les sème.
 * Le motif est dessiné autour de (100, 120) : la boîte est la même pour
 * toutes, elles se posent donc à la même hauteur. */
const PIECES = [
  ['sucette-rose', sucette(100, 96, 92, '#ffffff', '#ff6fae', 0)],
  ['sucette-bleue', sucette(100, 96, 92, '#fff3b8', '#7fd0f0', 0.4)],
  ['sucette-mauve', sucette(100, 96, 92, '#ffd6e8', '#a86ad8', 0.8)],
  ['donut', donut(100, 110, 104, '#e8a86a', '#ff9ec4', 0.2)],
  ['cupcake', cupcake(100, 108, 104, '#ffb3d1', '#fff0f8', 0.6)],
  ['glace', glace(100, 104, 100, '#a8e8d4', '#ffd34e', 1.0)],
  ['canne', canne(100, 110, 96, 1.4)],
  ['bonbon-vert', bonbon(100, 130, 92, '#a8e8d4', '#e8fff8', 1.8)],
  ['bonbon-jaune', bonbon(100, 130, 88, '#ffe36a', '#fff8d8', 2.2)],
  ['nounours', nounours(100, 112, 92, 0.9)]
];

if (!fs.existsSync(SORTIE)) fs.mkdirSync(SORTIE, { recursive: true });
PIECES.forEach(function (pc) {
  const f = path.join(SORTIE, 'sucrerie-' + pc[0] + '.svg');
  fs.writeFileSync(f,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">\n'
    + MOUVEMENT + '\n  ' + pc[1] + '\n</svg>\n', 'utf8');
});
console.log(PIECES.length + ' sucreries en pieces detachees.');

MONDES.forEach(function (m) {
  const f = path.join(SORTIE, 'monde-' + m.nom + '.svg');
  fs.writeFileSync(f, monde(m), 'utf8');
  const f3 = path.join(SORTIE, 'ciel-' + m.nom + '.svg');
  fs.writeFileSync(f3, ciel(m), 'utf8');
  console.log('ecrit : ' + path.relative(path.join(__dirname, '..'), f) + ' + son paysage');
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
