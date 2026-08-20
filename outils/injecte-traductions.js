/*
 * Écrit la table des traductions enfant dans `app/app.html`.
 *
 *   node outils/injecte-traductions.js
 *
 * On traduit dans `outils/traductions-enfant.json`, jamais dans le HTML :
 * le JSON se relit, se compare et se vérifie, une accolade oubliée dans une
 * page d'un mégaoctet, non.
 *
 * Le fichier JSON a la forme :
 *   { "phrase française" : { "en": "…", "es": "…", … } }
 * La clé EST la phrase française : rien à inventer, et une phrase sans
 * traduction reste en français au lieu de disparaître.
 *
 * Le script vérifie au passage :
 *   — que chaque clé du JSON existe encore dans le code ;
 *   — que chaque phrase du code a bien sa ligne dans le JSON ;
 *   — que le balisage <b>…</b> est équilibré dans chaque langue.
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const HTML = path.join(RACINE, 'app', 'app.html');
/* La table est découpée en morceaux — un par cours — pour rester lisible :
   `traductions-enfant.json`, `-2.json`, `-3.json`… Tous sont fusionnés. */
const MORCEAUX = fs.readdirSync(__dirname)
  .filter(function (f) { return /^traductions-enfant.*\.json$/.test(f); })
  .sort();
const LANGUES = ['en', 'es', 'de', 'nl', 'it', 'pt', 'ru', 'tr', 'zh', 'id', 'ur', 'hi'];

const src = fs.readFileSync(HTML, 'utf8');
const trad = {};
MORCEAUX.forEach(function (f) {
  const part = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
  Object.keys(part).forEach(function (k) { trad[k] = part[k]; });
});
console.log('morceaux lus : ' + MORCEAUX.join(', '));

/* Les phrases telles qu'elles sont appelées dans les cours. */
const DEBUT = src.indexOf('function _boyVowelCourse');
const FIN = src.indexOf('function renderSessions(ca){');
const bloc = src.slice(DEBUT, FIN);
const CLE = /\b(?:TB|te)\('((?:[^'\\]|\\.)*)'\)/g;
const duCode = new Set();
let m;
while ((m = CLE.exec(bloc))) duCode.add(dejs(m[1]));

/* Le code porte des chaînes JavaScript : \' et « y sont échappés.
   Le JSON, lui, porte le texte tel quel. */
function dejs(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) {
    return String.fromCharCode(parseInt(h, 16));
  }).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}
function enjs(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/* ── Les contrôles ────────────────────────────────────────────────────── */
let soucis = 0;
Object.keys(trad).forEach(function (fr) {
  if (!duCode.has(fr)) {
    console.log('CLE INCONNUE DU CODE : ' + fr.slice(0, 70));
    soucis++;
  }
  const ouvre = (fr.match(/<b>/g) || []).length;
  LANGUES.forEach(function (l) {
    const v = trad[fr][l];
    if (v === undefined || v === '') { console.log('MANQUE ' + l + ' : ' + fr.slice(0, 60)); soucis++; return; }
    if ((v.match(/<b>/g) || []).length !== ouvre || (v.match(/<\/b>/g) || []).length !== ouvre) {
      console.log('BALISE <b> DESEQUILIBREE [' + l + '] : ' + fr.slice(0, 60));
      soucis++;
    }
  });
});
let sansTrad = 0;
duCode.forEach(function (fr) { if (!trad[fr]) sansTrad++; });

/* ── L'écriture ───────────────────────────────────────────────────────── */
const lignes = Object.keys(trad).map(function (fr) {
  const parts = LANGUES.map(function (l) { return l + ":'" + enjs(trad[fr][l] || fr) + "'"; });
  return "'" + enjs(fr) + "':{" + parts.join(',') + "}";
});
const table = 'var _TE={\n' + lignes.join(',\n') + '\n};';

const A = '/* DEBUT TRADUCTIONS ENFANT */';
const B = '/* FIN TRADUCTIONS ENFANT */';
const i = src.indexOf(A), j = src.indexOf(B);
if (i < 0 || j < 0) { console.error('reperes introuvables dans app.html'); process.exit(1); }
const neuf = src.slice(0, i + A.length) + '\n' + table + '\n' + src.slice(j);
fs.writeFileSync(HTML, neuf, 'utf8');

console.log(Object.keys(trad).length + ' phrases ecrites dans app.html, '
  + LANGUES.length + ' langues chacune.');
console.log(duCode.size + ' phrases dans le code, ' + sansTrad + ' encore sans traduction.');
console.log(soucis ? soucis + ' SOUCIS ci-dessus.' : 'aucun souci.');
