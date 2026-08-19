/*
 * Fabrique les douze décors du parcours du garçon — À LANCER À LA MAIN.
 *
 *   node outils/planetes.js
 *
 * Il écrit `public/images/planete-*.svg`. Rien ne l'appelle au chargement du
 * site : les fichiers produits sont des images ordinaires, servies telles
 * quelles. Le script est gardé pour qu'une couleur se retouche ici, en un
 * endroit, plutôt qu'à la main dans douze fichiers.
 *
 * POURQUOI DU SVG. Le client demande des images RENDUES, pas une sphère
 * calculée en 3D dans le navigateur — c'est bien ce que sont ces fichiers :
 * un disque peint, avec ses dégradés et ses taches, décidé une fois pour
 * toutes. Ils prennent 2 Ko au lieu de 300, ils restent nets à toutes les
 * tailles, et ils ne coûtent rien.
 *
 * POUR LES REMPLACER par de vraies illustrations : déposer les fichiers
 * sous `public/images/planete-<nom>.png` et changer l'extension dans le
 * tableau `images` de l'habillage `garcon`, dans app/app.html.
 */
const fs = require('fs');
const path = require('path');

const SORTIE = path.join(__dirname, '..', 'public', 'images');

/* Le halo, les cratères et les bandes sont les mêmes d'une planète à
   l'autre : seules les couleurs et les détails changent. */
function sphere(o) {
  const id = o.nom;
  const cr = (o.crateres || []).map(function (c) {
    return '<ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="' + c[2] + '" ry="' + (c[3] || c[2] * 0.86)
      + '" fill="' + (o.crat || '#00000022') + '"/>';
  }).join('');
  const bd = (o.bandes || []).map(function (b) {
    return '<ellipse cx="200" cy="' + b[0] + '" rx="' + b[1] + '" ry="' + b[2] + '" fill="' + b[3] + '"/>';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <radialGradient id="c-${id}" cx="34%" cy="28%" r="78%">
      <stop offset="0%" stop-color="${o.clair}"/>
      <stop offset="52%" stop-color="${o.moyen}"/>
      <stop offset="100%" stop-color="${o.fonce}"/>
    </radialGradient>
    <radialGradient id="h-${id}" cx="50%" cy="50%" r="50%">
      <stop offset="62%" stop-color="${o.halo}" stop-opacity="0"/>
      <stop offset="82%" stop-color="${o.halo}" stop-opacity=".30"/>
      <stop offset="100%" stop-color="${o.halo}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="d-${id}"><circle cx="200" cy="200" r="${o.r}"/></clipPath>
  </defs>
  <circle cx="200" cy="200" r="${o.r + 46}" fill="url(#h-${id})"/>
  ${o.arriere || ''}
  <circle cx="200" cy="200" r="${o.r}" fill="url(#c-${id})"/>
  <g clip-path="url(#d-${id})">${bd}${o.taches || ''}${cr}</g>
  <circle cx="200" cy="200" r="${o.r}" fill="none" stroke="${o.fonce}" stroke-opacity=".35" stroke-width="3"/>
  <ellipse cx="${200 - o.r * 0.36}" cy="${200 - o.r * 0.42}" rx="${o.r * 0.26}" ry="${o.r * 0.17}"
     fill="#ffffff" opacity=".33" transform="rotate(-28 ${200 - o.r * 0.36} ${200 - o.r * 0.42})"/>
  ${o.devant || ''}
  ${etincelles(o.etincelles || [])}
</svg>`;
}

/* Les mêmes petites étoiles à quatre branches que sur les îles : c'est ce
   qui rend les deux décors parents. */
function etincelles(l) {
  return l.map(function (e) {
    const [x, y, s] = e;
    return '<path d="M ' + x + ' ' + (y - s) + ' Q ' + x + ' ' + y + ' ' + (x + s) + ' ' + y
      + ' Q ' + x + ' ' + y + ' ' + x + ' ' + (y + s)
      + ' Q ' + x + ' ' + y + ' ' + (x - s) + ' ' + y
      + ' Q ' + x + ' ' + y + ' ' + x + ' ' + (y - s) + ' Z" fill="#ffffff" opacity=".85"/>';
  }).join('');
}

const PLANETES = [
  { nom: 'soleil', r: 128, clair: '#fff6d8', moyen: '#ffc247', fonce: '#f57c00', halo: '#ffb300',
    taches: '<ellipse cx="150" cy="250" rx="46" ry="30" fill="#ff980022"/><ellipse cx="262" cy="160" rx="38" ry="26" fill="#ff6f0022"/>',
    devant: '<circle cx="200" cy="200" r="150" fill="none" stroke="#ffca28" stroke-opacity=".45" stroke-width="7" stroke-dasharray="3 22" stroke-linecap="round"/>',
    etincelles: [[64, 96, 17], [340, 132, 13], [92, 316, 12], [318, 300, 15]] },

  { nom: 'mercure', r: 104, clair: '#e6ded4', moyen: '#a89a8c', fonce: '#6d6157', halo: '#cbbfae',
    crateres: [[168, 168, 20], [232, 214, 14], [186, 246, 11], [246, 152, 9], [148, 220, 8]],
    etincelles: [[86, 118, 12], [318, 268, 13]] },

  { nom: 'venus', r: 116, clair: '#fff3d0', moyen: '#f5c469', fonce: '#c8853a', halo: '#f7d089',
    bandes: [[158, 130, 20, '#fff0c455'], [208, 132, 16, '#e0a45a44'], [252, 118, 18, '#fff0c444']],
    etincelles: [[76, 132, 13], [330, 258, 12]] },

  { nom: 'terre', r: 122, clair: '#bfe6ff', moyen: '#3f9fd8', fonce: '#12557f', halo: '#63c2f0',
    taches: '<path d="M110 176 q42-34 84-12 t54 6 q20 26-8 44 t-62 10 q-42-6-58-26z" fill="#5eb85a"/>'
      + '<path d="M150 262 q34-16 62 2 t44 26 q-24 22-62 18 t-52-28z" fill="#4aa84f"/>'
      + '<ellipse cx="262" cy="146" rx="30" ry="16" fill="#ffffff" opacity=".55"/>'
      + '<ellipse cx="132" cy="252" rx="34" ry="15" fill="#ffffff" opacity=".45"/>',
    etincelles: [[74, 120, 13], [332, 272, 14]] },

  { nom: 'lune', r: 100, clair: '#ffffff', moyen: '#dcdde2', fonce: '#9b9daa', halo: '#e8eaf2',
    crat: '#00000018',
    crateres: [[172, 172, 22], [238, 208, 15], [190, 250, 12], [244, 148, 10], [148, 226, 9]],
    etincelles: [[84, 112, 13], [318, 274, 12], [300, 100, 9]] },

  { nom: 'mars', r: 110, clair: '#ffd3ac', moyen: '#e0703a', fonce: '#98341c', halo: '#f08a52',
    taches: '<ellipse cx="160" cy="230" rx="44" ry="26" fill="#8c2f1a33"/><ellipse cx="246" cy="176" rx="32" ry="20" fill="#8c2f1a2e"/>'
      + '<ellipse cx="200" cy="106" rx="40" ry="15" fill="#ffffff" opacity=".72"/>'
      + '<ellipse cx="200" cy="296" rx="34" ry="13" fill="#ffffff" opacity=".62"/>',
    etincelles: [[80, 126, 12], [326, 262, 13]] },

  { nom: 'jupiter', r: 132, clair: '#fff0d6', moyen: '#e0a86c', fonce: '#9c6633', halo: '#e8b884',
    bandes: [[142, 140, 15, '#fff3dc66'], [176, 142, 12, '#b9793f55'], [212, 142, 16, '#fff3dc55'],
             [246, 138, 13, '#a96a3555'], [280, 126, 14, '#fff3dc4d']],
    taches: '<ellipse cx="246" cy="228" rx="34" ry="21" fill="#d1502f" opacity=".85"/>'
      + '<ellipse cx="246" cy="228" rx="20" ry="12" fill="#ef7757" opacity=".8"/>',
    etincelles: [[62, 106, 14], [344, 286, 13]] },

  { nom: 'saturne', r: 108, clair: '#fff4d9', moyen: '#e8c98c', fonce: '#a8823f', halo: '#f0d69f',
    bandes: [[168, 116, 12, '#fff6e055'], [212, 118, 14, '#c9a05c4d'], [250, 104, 11, '#fff6e04d']],
    arriere: '<ellipse cx="200" cy="212" rx="182" ry="46" fill="none" stroke="#e5c07a" stroke-opacity=".85" stroke-width="15" transform="rotate(-17 200 212)"/>'
      + '<ellipse cx="200" cy="212" rx="152" ry="38" fill="none" stroke="#c99a4e" stroke-opacity=".6" stroke-width="7" transform="rotate(-17 200 212)"/>',
    devant: '<path d="M 42 246 A 182 46 -17 0 0 358 178" fill="none" stroke="#f0d9a4" stroke-opacity=".95" stroke-width="15"/>'
      + '<path d="M 66 238 A 152 38 -17 0 0 334 182" fill="none" stroke="#d3a659" stroke-opacity=".7" stroke-width="7"/>',
    etincelles: [[64, 92, 13], [344, 306, 12]] },

  /* L'anneau d'Uranus est presque vertical. Il se dessine DEUX fois : la
     même ellipse derrière la planète, puis la même encore devant, découpée
     à la moitié droite de l'image. La moitié gauche reste donc cachée
     derrière le globe, la droite passe devant — et l'anneau fait le tour.
     Écrit à la main comme deux arcs séparés, ça donnait deux rayures qui
     ne se rejoignaient nulle part. */
  { nom: 'uranus', r: 112, clair: '#e2fbff', moyen: '#7fd8e2', fonce: '#328c9e', halo: '#93e2ea',
    bandes: [[176, 122, 11, '#ffffff33'], [232, 120, 13, '#2f8a9c33']],
    arriere: '<ellipse cx="200" cy="200" rx="46" ry="172" fill="none" stroke="#a9e8ef" stroke-opacity=".6" stroke-width="9" transform="rotate(14 200 200)"/>',
    devant: '<clipPath id="ur-devant"><rect x="200" y="0" width="200" height="400"/></clipPath>'
      + '<ellipse cx="200" cy="200" rx="46" ry="172" fill="none" stroke="#c9f2f8" stroke-opacity=".95" stroke-width="9"'
      + ' transform="rotate(14 200 200)" clip-path="url(#ur-devant)"/>',
    etincelles: [[78, 296, 13], [330, 108, 12]] },

  { nom: 'neptune', r: 114, clair: '#cfe0ff', moyen: '#4a7fe0', fonce: '#1b3f96', halo: '#6d9bf0',
    bandes: [[158, 126, 12, '#ffffff2e'], [226, 128, 14, '#12307a33'], [268, 110, 11, '#ffffff26'],
    ],
    taches: '<ellipse cx="164" cy="234" rx="30" ry="18" fill="#0f2a66" opacity=".38"/>',
    etincelles: [[76, 122, 13], [328, 272, 12]] },

  { nom: 'pluton', r: 94, clair: '#fdeee4', moyen: '#d6b8a4', fonce: '#9c7a66', halo: '#e6cdba',
    taches: '<path d="M172 224 q26-30 52-8 t34 30 q-16 30-48 28 t-44-24 q-8-16 6-26z" fill="#fff6ee" opacity=".85"/>',
    crateres: [[236, 166, 12], [166, 168, 9]],
    etincelles: [[92, 122, 12], [312, 276, 11]] },

  { nom: 'comete', r: 62, clair: '#ffffff', moyen: '#9fe4f5', fonce: '#3f9ec4', halo: '#8fdcf2',
    arriere: '<path d="M232 168 L392 40 Q330 150 250 226 Z" fill="#bdeeff" opacity=".55"/>'
      + '<path d="M240 196 L396 128 Q320 200 254 230 Z" fill="#ffffff" opacity=".42"/>'
      + '<path d="M226 152 L352 26 Q318 128 246 200 Z" fill="#7fd6f0" opacity=".45"/>',
    crateres: [[184, 210, 12], [222, 232, 8]],
    etincelles: [[112, 116, 14], [318, 320, 13], [96, 300, 11]] },
];

if (!fs.existsSync(SORTIE)) fs.mkdirSync(SORTIE, { recursive: true });
PLANETES.forEach(function (p) {
  const f = path.join(SORTIE, 'planete-' + p.nom + '.svg');
  fs.writeFileSync(f, sphere(p), 'utf8');
  console.log('écrit : ' + path.relative(path.join(__dirname, '..'), f));
});
console.log(PLANETES.length + ' décors écrits.');
