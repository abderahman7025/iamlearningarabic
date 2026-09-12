/*
 * Fabrique les douze animaux du parcours des 3-7 ans — À LANCER À LA MAIN.
 *
 *   node outils/animaux.js
 *
 * Il écrit `public/images/animal-*.svg`. Rien ne l'appelle au chargement du
 * site : les fichiers produits sont des images ordinaires, servies telles
 * quelles. Le script est gardé pour qu'une couleur se retouche ici, en un
 * endroit, plutôt qu'à la main dans douze fichiers. C'est la même façon de
 * faire que `outils/planetes.js`, dont il reprend la structure.
 *
 * POURQUOI DU SVG. Le client veut des couleurs franches, différentes d'une
 * vignette à l'autre — pas un thème d'une seule teinte. Un fichier de 2 Ko
 * reste net à toute taille, ne coûte rien à charger, et se retouche.
 *
 * POUR LES REMPLACER par de vraies illustrations : déposer les fichiers sous
 * `public/images/animal-<nom>.png` et changer l'extension dans le tableau
 * `images` de l'habillage `animaux`, dans app/app.html. Rien d'autre.
 *
 * COMMENT C'EST DESSINÉ. Chaque animal est une TÊTE vue de face, posée dans
 * un carré de 400. Le même squelette sert aux douze — oreilles, tête, museau,
 * yeux — et chacun n'écrit que ce qui le distingue. Les yeux sont toujours
 * les mêmes : deux blancs, deux pupilles, deux reflets. C'est ce qui donne
 * l'air de famille d'une planche à l'autre.
 */
const fs = require('fs');
const path = require('path');

const SORTIE = path.join(__dirname, '..', 'public', 'images');

/* Les deux yeux, à la même place pour tous : c'est ce qui fait la famille.
   `e` écarte, `y` monte ou descend, `r` grossit. */
function yeux(o) {
  o = o || {};
  const e = o.e || 52, y = o.y || 196, r = o.r || 26, p = o.p || 12;
  function oeil(cx) {
    return '<ellipse cx="' + cx + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.06) + '" fill="#fff"/>'
      + '<circle cx="' + cx + '" cy="' + (y + 3) + '" r="' + p + '" fill="#2b2b33"/>'
      + '<circle cx="' + (cx - p * 0.36) + '" cy="' + (y - p * 0.4) + '" r="' + (p * 0.36) + '" fill="#fff"/>';
  }
  return oeil(200 - e) + oeil(200 + e);
}

/* Un museau : le rond clair, le nez, et la bouche en deux arcs. */
function museau(o) {
  o = o || {};
  const y = o.y || 252, rx = o.rx || 54, ry = o.ry || 40;
  const clair = o.clair || '#fff3e0', nez = o.nez || '#3a3a44';
  return '<ellipse cx="200" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + clair + '"/>'
    + '<ellipse cx="200" cy="' + (y - 8) + '" rx="15" ry="11" fill="' + nez + '"/>'
    + '<path d="M200 ' + (y + 3) + ' v14" stroke="' + nez + '" stroke-width="6" stroke-linecap="round"/>'
    + '<path d="M200 ' + (y + 17) + ' q-16 12 -28 -2 M200 ' + (y + 17) + ' q16 12 28 -2" fill="none" stroke="'
    + nez + '" stroke-width="6" stroke-linecap="round"/>';
}

function svg(corps) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">\n  '
    + corps + '\n</svg>\n';
}

/* ── LES DOUZE ────────────────────────────────────────────────────────
   `couleur` est la teinte de l'animal ; elle est reprise telle quelle par la
   vignette, dans app/app.html. Les deux doivent bouger ensemble. */
const ANIMAUX = [
  {
    nom: 'lion', couleur: '#F5A524',
    dessin:
      /* la crinière : un anneau de pétales */
      '<g fill="#E2761B">' +
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return '<ellipse cx="' + (200 + Math.cos(a) * 118).toFixed(1) + '" cy="' + (210 + Math.sin(a) * 118).toFixed(1)
          + '" rx="44" ry="38" transform="rotate(' + ((a * 180 / Math.PI) + 90).toFixed(1) + ' '
          + (200 + Math.cos(a) * 118).toFixed(1) + ' ' + (210 + Math.sin(a) * 118).toFixed(1) + ')"/>';
      }).join('') + '</g>' +
      '<circle cx="200" cy="210" r="112" fill="#F5A524"/>' +
      '<ellipse cx="128" cy="150" rx="30" ry="30" fill="#F5A524"/>' +
      '<ellipse cx="272" cy="150" rx="30" ry="30" fill="#F5A524"/>' +
      '<ellipse cx="128" cy="150" rx="15" ry="15" fill="#E2761B"/>' +
      '<ellipse cx="272" cy="150" rx="15" ry="15" fill="#E2761B"/>' +
      yeux({ y: 196, e: 50 }) + museau({ y: 256, clair: '#FFE0B2' })
  },
  {
    nom: 'elephant', couleur: '#7FA9D4',
    dessin:
      '<ellipse cx="92" cy="196" rx="70" ry="82" fill="#6C93BC"/>' +
      '<ellipse cx="308" cy="196" rx="70" ry="82" fill="#6C93BC"/>' +
      '<ellipse cx="92" cy="196" rx="44" ry="54" fill="#9BBFE0"/>' +
      '<ellipse cx="308" cy="196" rx="44" ry="54" fill="#9BBFE0"/>' +
      '<ellipse cx="200" cy="190" rx="104" ry="106" fill="#7FA9D4"/>' +
      /* la trompe */
      '<path d="M200 250 v66 q0 34 32 34 q26 0 26 -26" fill="none" stroke="#7FA9D4" ' +
      'stroke-width="48" stroke-linecap="round"/>' +
      '<path d="M178 280 h44 M182 306 h40" stroke="#6C93BC" stroke-width="6" stroke-linecap="round"/>' +
      yeux({ y: 178, e: 50 })
  },
  {
    nom: 'girafe', couleur: '#F2C230',
    dessin:
      /* les cornes */
      '<path d="M150 96 v-40 M250 96 v-40" stroke="#C68C1F" stroke-width="13" stroke-linecap="round"/>' +
      '<circle cx="150" cy="52" r="15" fill="#8B5E1A"/><circle cx="250" cy="52" r="15" fill="#8B5E1A"/>' +
      '<ellipse cx="88" cy="176" rx="34" ry="46" fill="#E0AE22"/>' +
      '<ellipse cx="312" cy="176" rx="34" ry="46" fill="#E0AE22"/>' +
      '<ellipse cx="200" cy="190" rx="104" ry="112" fill="#F2C230"/>' +
      '<g fill="#C68C1F"><ellipse cx="146" cy="126" rx="20" ry="16"/><ellipse cx="256" cy="122" rx="17" ry="14"/>' +
      '<ellipse cx="112" cy="212" rx="15" ry="18"/><ellipse cx="292" cy="216" rx="16" ry="14"/></g>' +
      yeux({ y: 186, e: 50 }) + museau({ y: 262, rx: 60, ry: 42, clair: '#FFEAA7', nez: '#8B5E1A' })
  },
  {
    nom: 'panda', couleur: '#4C5566',
    dessin:
      '<circle cx="106" cy="120" r="46" fill="#2F3640"/>' +
      '<circle cx="294" cy="120" r="46" fill="#2F3640"/>' +
      '<ellipse cx="200" cy="200" rx="112" ry="106" fill="#FFFFFF"/>' +
      '<ellipse cx="146" cy="192" rx="38" ry="44" fill="#2F3640" transform="rotate(-16 146 192)"/>' +
      '<ellipse cx="254" cy="192" rx="38" ry="44" fill="#2F3640" transform="rotate(16 254 192)"/>' +
      yeux({ y: 192, e: 54, r: 19, p: 10 }) +
      museau({ y: 262, rx: 48, ry: 34, clair: '#F3F4F6', nez: '#2F3640' })
  },
  {
    nom: 'renard', couleur: '#EF7042',
    dessin:
      '<path d="M96 176 L84 52 L182 122 Z" fill="#EF7042"/>' +
      '<path d="M304 176 L316 52 L218 122 Z" fill="#EF7042"/>' +
      '<path d="M112 158 L106 88 L166 132 Z" fill="#F9C7A8"/>' +
      '<path d="M288 158 L294 88 L234 132 Z" fill="#F9C7A8"/>' +
      '<ellipse cx="200" cy="200" rx="108" ry="100" fill="#EF7042"/>' +
      '<path d="M200 152 q-72 20 -66 78 q6 54 66 62 q60 -8 66 -62 q6 -58 -66 -78 Z" fill="#FFF3EA"/>' +
      yeux({ y: 190, e: 52, r: 22, p: 11 }) +
      '<ellipse cx="200" cy="252" rx="17" ry="13" fill="#3a3a44"/>' +
      '<path d="M200 262 v14 M200 276 q-16 12 -28 -2 M200 276 q16 12 28 -2" fill="none" stroke="#3a3a44" ' +
      'stroke-width="6" stroke-linecap="round"/>'
  },
  {
    nom: 'grenouille', couleur: '#57C84D',
    dessin:
      '<circle cx="126" cy="118" r="52" fill="#57C84D"/>' +
      '<circle cx="274" cy="118" r="52" fill="#57C84D"/>' +
      '<circle cx="126" cy="114" r="32" fill="#fff"/><circle cx="274" cy="114" r="32" fill="#fff"/>' +
      '<circle cx="126" cy="118" r="16" fill="#2b2b33"/><circle cx="274" cy="118" r="16" fill="#2b2b33"/>' +
      '<circle cx="119" cy="110" r="6" fill="#fff"/><circle cx="267" cy="110" r="6" fill="#fff"/>' +
      '<ellipse cx="200" cy="232" rx="122" ry="98" fill="#57C84D"/>' +
      '<ellipse cx="200" cy="262" rx="86" ry="52" fill="#7FDA76"/>' +
      '<path d="M132 258 q68 56 136 0" fill="none" stroke="#2E7D32" stroke-width="9" stroke-linecap="round"/>' +
      '<circle cx="168" cy="222" r="7" fill="#2E7D32"/><circle cx="232" cy="222" r="7" fill="#2E7D32"/>'
  },
  {
    nom: 'hibou', couleur: '#9B7EDE',
    dessin:
      '<path d="M108 118 L96 44 L166 96 Z" fill="#7A5FC0"/>' +
      '<path d="M292 118 L304 44 L234 96 Z" fill="#7A5FC0"/>' +
      '<ellipse cx="200" cy="212" rx="118" ry="118" fill="#9B7EDE"/>' +
      '<ellipse cx="200" cy="252" rx="82" ry="76" fill="#B9A2EA"/>' +
      '<circle cx="150" cy="188" r="46" fill="#F3EEFF"/><circle cx="250" cy="188" r="46" fill="#F3EEFF"/>' +
      '<circle cx="150" cy="188" r="22" fill="#2b2b33"/><circle cx="250" cy="188" r="22" fill="#2b2b33"/>' +
      '<circle cx="142" cy="180" r="8" fill="#fff"/><circle cx="242" cy="180" r="8" fill="#fff"/>' +
      '<path d="M200 214 l22 30 l-22 22 l-22 -22 Z" fill="#F5A524"/>'
  },
  {
    nom: 'poisson', couleur: '#2FC4D6',
    dessin:
      '<path d="M300 200 q54 -34 92 -66 q-18 66 0 132 q-38 -32 -92 -66 Z" fill="#1B9AAA"/>' +
      '<ellipse cx="186" cy="200" rx="140" ry="102" fill="#2FC4D6"/>' +
      '<path d="M186 98 q-10 -54 34 -70 q-6 42 18 62" fill="#1B9AAA"/>' +
      '<ellipse cx="150" cy="238" rx="66" ry="44" fill="#7FE3EE" opacity=".55"/>' +
      '<circle cx="112" cy="180" r="30" fill="#fff"/>' +
      '<circle cx="106" cy="184" r="14" fill="#2b2b33"/>' +
      '<circle cx="100" cy="178" r="5" fill="#fff"/>' +
      '<path d="M74 226 q22 20 46 6" fill="none" stroke="#12707C" stroke-width="8" stroke-linecap="round"/>' +
      '<g fill="#1B9AAA" opacity=".45"><circle cx="232" cy="164" r="16"/><circle cx="268" cy="204" r="16"/>' +
      '<circle cx="228" cy="242" r="16"/></g>'
  },
  {
    nom: 'abeille', couleur: '#F5C518',
    dessin:
      '<path d="M148 92 q-34 -46 -66 -50 M252 92 q34 -46 66 -50" fill="none" stroke="#3A3A44" ' +
      'stroke-width="9" stroke-linecap="round"/>' +
      '<circle cx="82" cy="42" r="15" fill="#3A3A44"/><circle cx="318" cy="42" r="15" fill="#3A3A44"/>' +
      '<g stroke="#9EC9E8" stroke-width="6">' +
      '<ellipse cx="104" cy="168" rx="66" ry="82" fill="#DCEEFB" transform="rotate(-24 104 168)"/>' +
      '<ellipse cx="296" cy="168" rx="66" ry="82" fill="#DCEEFB" transform="rotate(24 296 168)"/></g>' +
      '<ellipse cx="200" cy="216" rx="106" ry="112" fill="#F5C518"/>' +
      '<path d="M104 252 h192 M118 300 h164" stroke="#3A3A44" stroke-width="22" stroke-linecap="round"/>' +
      yeux({ y: 190, e: 46, r: 24, p: 12 }) +
      '<path d="M200 232 q-18 16 -32 2 M200 232 q18 16 32 2" fill="none" stroke="#3A3A44" ' +
      'stroke-width="6" stroke-linecap="round"/>'
  },
  {
    nom: 'pingouin', couleur: '#3C4A5A',
    dessin:
      '<ellipse cx="200" cy="212" rx="116" ry="126" fill="#3C4A5A"/>' +
      '<ellipse cx="200" cy="246" rx="80" ry="98" fill="#FFFFFF"/>' +
      '<ellipse cx="86" cy="240" rx="30" ry="72" fill="#33404E" transform="rotate(14 86 240)"/>' +
      '<ellipse cx="314" cy="240" rx="30" ry="72" fill="#33404E" transform="rotate(-14 314 240)"/>' +
      yeux({ y: 176, e: 44, r: 23, p: 12 }) +
      '<path d="M200 200 l30 26 l-30 22 l-30 -22 Z" fill="#F5A524"/>' +
      '<path d="M156 344 q-34 22 4 26 q30 2 40 -18 M244 344 q34 22 -4 26 q-30 2 -40 -18" fill="#F5A524"/>'
  },
  {
    nom: 'tortue', couleur: '#7CB342',
    dessin:
      '<ellipse cx="200" cy="240" rx="140" ry="106" fill="#7CB342"/>' +
      '<ellipse cx="200" cy="240" rx="112" ry="82" fill="#9CCC65"/>' +
      '<g fill="none" stroke="#4F7A21" stroke-width="8">' +
      '<circle cx="200" cy="240" r="42"/>' +
      '<path d="M200 198 v-40 M200 282 v40 M158 240 h-46 M242 240 h46 M170 210 l-32 -26 M230 210 l32 -26 ' +
      'M170 270 l-32 26 M230 270 l32 26"/></g>' +
      '<ellipse cx="200" cy="112" rx="58" ry="52" fill="#8BC34A"/>' +
      yeux({ y: 104, e: 24, r: 16, p: 8 }) +
      '<path d="M182 136 q18 14 36 0" fill="none" stroke="#4F7A21" stroke-width="6" stroke-linecap="round"/>'
  },
  {
    nom: 'papillon', couleur: '#EC6EA8',
    dessin:
      '<ellipse cx="112" cy="150" rx="82" ry="70" fill="#EC6EA8" transform="rotate(-18 112 150)"/>' +
      '<ellipse cx="288" cy="150" rx="82" ry="70" fill="#EC6EA8" transform="rotate(18 288 150)"/>' +
      '<ellipse cx="126" cy="286" rx="66" ry="58" fill="#B368D9" transform="rotate(16 126 286)"/>' +
      '<ellipse cx="274" cy="286" rx="66" ry="58" fill="#B368D9" transform="rotate(-16 274 286)"/>' +
      '<circle cx="106" cy="146" r="22" fill="#FFE3F0"/><circle cx="294" cy="146" r="22" fill="#FFE3F0"/>' +
      '<circle cx="122" cy="290" r="16" fill="#F2D9FF"/><circle cx="278" cy="290" r="16" fill="#F2D9FF"/>' +
      '<path d="M184 88 q-24 -40 -54 -50 M216 88 q24 -40 54 -50" fill="none" stroke="#5B4B7A" ' +
      'stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="130" cy="38" r="12" fill="#5B4B7A"/><circle cx="270" cy="38" r="12" fill="#5B4B7A"/>' +
      '<ellipse cx="200" cy="226" rx="21" ry="104" fill="#5B4B7A"/>' +
      '<circle cx="200" cy="122" r="32" fill="#6E5B92"/>' +
      yeux({ y: 118, e: 14, r: 11, p: 6 })
  }
];

let n = 0;
ANIMAUX.forEach(function (a) {
  fs.writeFileSync(path.join(SORTIE, 'animal-' + a.nom + '.svg'), svg(a.dessin));
  n++;
});
console.log(n + ' animaux ecrits dans ' + SORTIE);
console.log('couleurs : ' + ANIMAUX.map(function (a) { return a.nom + ' ' + a.couleur; }).join(', '));
