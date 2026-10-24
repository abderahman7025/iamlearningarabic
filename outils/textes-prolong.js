/* Extrait de app.html la table T (lignes de « const T={ » à la fin des
   compléments), et rend les textes des prolongations pour chaque langue. */
const fs = require('fs'), path = require('path');
const L = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.html'), 'utf8').split('\n');
const a = L.findIndex((l) => /^const T=\{/.test(l));
let b = a; for (let i = a; i < L.length; i++) { if (/^function t\(k\)/.test(L[i])) { b = i; break; } }
const T = new Function(L.slice(a, b).join('\n').replace(/^const T=/, 'var T=') + '\nreturn T;')();
const CLES = ['prolong_exemple', 'prolong_love', 'prolong_alors', 'prolong_nolove', 'prolong_illus', 'prolong_diff', 'not_essential'];
module.exports = { T, CLES };
if (require.main === module) Object.keys(T).forEach((k) => console.log(k, JSON.stringify(CLES.map((c) => T[k][c]))));
