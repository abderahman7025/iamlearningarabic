/* Les phrases DITES par la voix restaient en français dans les treize langues.
   Le texte affiché passait bien par t(), mais l'argument de speakText était
   une phrase française écrite en dur : la voix turque lisait du français.

   Ce script pose les traductions de `voix-adulte.json` dans la table T, entre
   deux marqueurs, et remplace chaque phrase française de speakText par sa clé.
   Il est rejouable : relancé, il réécrit simplement le bloc entre marqueurs.

   Usage :  node outils/injecte-voix.js
*/
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', 'app', 'app.html');
const DEBUT = '/* DEBUT VOIX TRADUITE */';
const FIN = '/* FIN VOIX TRADUITE */';
const LANGUES = ['fr', 'en', 'es', 'de', 'nl', 'it', 'pt', 'ru', 'tr', 'zh', 'id', 'ur', 'hi'];

const V = JSON.parse(fs.readFileSync(path.join(__dirname, 'voix-adulte.json'), 'utf8'));
let src = fs.readFileSync(HTML, 'utf8');

/* ── 1. Vérifier le corpus avant d'y toucher ── */
let trous = 0;
Object.keys(V).forEach(function (k) {
  LANGUES.forEach(function (l) {
    if (!V[k][l]) { console.log('MANQUE : ' + k + ' en ' + l); trous++; }
  });
});
if (trous) { console.log('corpus incomplet, rien n\'est écrit.'); process.exit(1); }

/* ── 2. Remplacer les phrases françaises de speakText par leur clé ──
   On compare la phrase DÉSÉCHAPPÉE : dans la page elle est écrite
   'Lorsque l\'on double...', avec des antislashs. */
function desechappe(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) {
    return String.fromCharCode(parseInt(h, 16));
  }).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}
const parPhrase = {};
Object.keys(V).forEach(function (k) { parPhrase[V[k].fr] = k; });

let remplaces = 0, inconnues = [];
src = src.replace(/speakText\('((?:[^'\\]|\\.)*)'/g, function (tout, corps) {
  const fr = desechappe(corps);
  const cle = parPhrase[fr];
  if (!cle) { inconnues.push(fr.slice(0, 60)); return tout; }
  remplaces++;
  return "speakText(t('" + cle + "')";
});

/* ── 3. Poser la table, juste avant t() ── */
const lignes = Object.keys(V).map(function (k) {
  const par = LANGUES.map(function (l) {
    return l + ':' + JSON.stringify(V[k][l]);
  }).join(',');
  return '    ' + k + ':{' + par + '}';
}).join(',\n');

const bloc = DEBUT + '\n'
  + '/* Phrases lues à voix haute. Elles ne sont pas dans la table T principale :\n'
  + '   elles viennent de outils/voix-adulte.json, régénérées par\n'
  + '   `node outils/injecte-voix.js`. Ne pas les modifier ici. */\n'
  + '(function(){\n'
  + '  var V={\n' + lignes + '\n  };\n'
  + '  Object.keys(V).forEach(function(k){\n'
  + '    Object.keys(V[k]).forEach(function(l){\n'
  + '      if(!T[l])T[l]={};\n'
  + '      T[l][k]=V[k][l];\n'
  + '    });\n'
  + '  });\n'
  + '})();\n'
  + FIN;

const a = src.indexOf(DEBUT), b = src.indexOf(FIN);
if (a !== -1 && b !== -1) {
  src = src.slice(0, a) + bloc + src.slice(b + FIN.length);
} else {
  const ANCRE = '\nfunction t(k){';
  if (src.indexOf(ANCRE) === -1) { console.log('ancre t() introuvable'); process.exit(1); }
  src = src.replace(ANCRE, '\n' + bloc + '\n' + ANCRE);
}

fs.writeFileSync(HTML, src);
console.log(Object.keys(V).length + ' phrases dites, ' + LANGUES.length + ' langues chacune.');
console.log(remplaces + ' appels speakText branchés sur une clé.');
if (inconnues.length) {
  console.log('ENCORE EN FRANÇAIS DANS speakText :');
  inconnues.forEach(function (p) { console.log('  · ' + p); });
} else {
  console.log('aucune phrase française ne reste dans speakText.');
}
