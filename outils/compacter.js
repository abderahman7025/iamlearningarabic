/* v3.8.8 — LA VERSION EN LIGNE SANS LES COMMENTAIRES
   Le client : « éviter que quelqu'un demande à une IA de refaire pareil ».
   app/app.html garde tous ses commentaires (c'est notre mémoire) ; le site
   sert app/app.min.html : commentaires retirés, blancs resserrés. Le code
   lui-même n'est PAS renommé (pas de « mangle ») : la lecture automatique
   lit le texte des fonctions (`String(onclick)`), un nom changé la casserait.
   La 1re ligne porte l'empreinte d'app.html : api/app.js ne sert la version
   compacte que si elle correspond à app.html, sinon app.html (jamais une
   version périmée).
   node outils/compacter.js        (à lancer avant chaque mise en ligne)
   Modules : npm install --no-save --prefix outils terser html-minifier-terser */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { minify } = require('./node_modules/html-minifier-terser');
const SRC = path.join(__dirname, '..', 'app', 'app.html'), DEST = path.join(__dirname, '..', 'app', 'app.min.html');
(async () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const h = crypto.createHash('sha1').update(src.replace(/\r\n/g, '\n')).digest('hex');
  const t0 = Date.now();
  const out = await minify(src, {
    removeComments: true,
    collapseWhitespace: true, conservativeCollapse: true,
    minifyCSS: true,
    minifyJS: { compress: false, mangle: false, format: { comments: false } },
  });
  fs.writeFileSync(DEST, '<!--h:' + h + '-->' + out, 'utf8');
  console.log('app.min.html', (src.length / 1e6).toFixed(2), 'Mo →', (out.length / 1e6).toFixed(2), 'Mo en', ((Date.now() - t0) / 1000).toFixed(1), 's');
})().catch((e) => { console.error('ECHEC', e.message); process.exit(1); });
