/*
 * Relève les phrases françaises écrites en dur dans l'interface enfant.
 *
 *   node outils/phrases.js            → la liste, triée, avec son poids
 *   node outils/phrases.js --lignes   → avec le numéro de ligne de chacune
 *
 * À QUOI ÇA SERT. Le client veut tout le site dans les treize langues.
 * L'interface adulte passe par `t()` ; l'interface enfant, elle, a été
 * écrite en français, phrase par phrase, dans le moteur des cours. Avant de
 * traduire, il faut savoir CE QU'IL Y A — et pouvoir revérifier plus tard
 * qu'il n'en reste plus.
 *
 * CE QU'ON CHERCHE : les chaînes qui arrivent devant l'enfant, c'est-à-dire
 * celles qu'on DIT (`dire`, `plusTard`, `speakText`) et celles qu'on ÉCRIT
 * (`textContent`, `innerHTML`, les libellés de boutons). Les noms de
 * classes, les couleurs et les fragments de code n'y sont pas.
 */
const fs = require('fs');
const path = require('path');

const FICHIER = path.join(__dirname, '..', 'app', 'app.html');
const src = fs.readFileSync(FICHIER, 'utf8');

/* Le moteur enfant : du début des scènes à la fin des cours de lettres. */
const DEBUT = src.indexOf('function _boyScene(ca,reprise){');
const FIN = src.indexOf('function renderMiniGames');
const bloc = src.slice(DEBUT, FIN > DEBUT ? FIN : src.length);
const avant = src.slice(0, DEBUT);
const ligneDepart = avant.split('\n').length;

/* Une chaîne JavaScript complète, apostrophes échappées comprises. */
const CHAINE = "'((?:[^'\\\\]|\\\\.)*)'";

const SOURCES = [
  ['dit', new RegExp('\\b(?:dire|plusTard)\\s*\\(\\s*' + CHAINE, 'g')],
  ['dit', new RegExp('speakText\\s*\\(\\s*' + CHAINE, 'g')],
  ['écrit', new RegExp('\\.textContent\\s*=\\s*' + CHAINE, 'g')],
  ['écrit', new RegExp('\\.innerHTML\\s*=\\s*' + CHAINE, 'g')],
  ['écrit', new RegExp('\\bbouton\\s*\\([^,]+,\\s*' + CHAINE, 'g')],
  ['écrit', new RegExp('\\btitre\\s*\\([^,]*,?\\s*' + CHAINE, 'g')],
];

/* Du français : un mot accentué, ou un mot courant de la langue. */
const MOTS = /\b(le|la|les|un|une|des|du|de|et|est|tu|te|ton|ta|tes|sur|dans|avec|pour|bien|bravo|écoute|regarde|appuie|touche|choisis|lettre|lettres|mot|mots|son|sons|voyelle|voyelles|maintenant|encore|essaie|trouve|suivant|recommence)\b/i;
const ACCENT = /[éèêëàâäîïôöùûüç]/i;

const vues = new Map();
SOURCES.forEach(function (paire) {
  const genre = paire[0], re = paire[1];
  let m;
  while ((m = re.exec(bloc))) {
    const texte = m[1];
    if (!texte || texte.length < 2) continue;
    if (!(ACCENT.test(texte) || MOTS.test(texte))) continue;
    if (/^[<{]/.test(texte)) continue;                 /* du balisage nu */
    const ligne = ligneDepart + bloc.slice(0, m.index).split('\n').length - 1;
    if (!vues.has(texte)) vues.set(texte, { genre: genre, lignes: [] });
    vues.get(texte).lignes.push(ligne);
  }
});

const liste = [...vues.entries()].sort(function (a, b) {
  return a[1].lignes[0] - b[1].lignes[0];
});

const avecLignes = process.argv.indexOf('--lignes') >= 0;
liste.forEach(function (e, i) {
  console.log(String(i + 1).padStart(3) + '. [' + e[1].genre + '] ' + e[0]
    + (avecLignes ? '   (l. ' + e[1].lignes.join(', ') + ')' : ''));
});
const poids = liste.reduce(function (n, e) { return n + e[0].length; }, 0);
console.log('');
console.log(liste.length + ' phrases, ' + poids + ' caracteres.');
console.log('Pour les treize langues : ' + (poids * 13) + ' caracteres environ.');
