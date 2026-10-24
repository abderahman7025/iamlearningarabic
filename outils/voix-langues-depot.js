/* 24 octobre 2026 — met en ligne les phrases des prolongations validées par
   le client, 11 langues (pas le français, pas l'ourdou). Clé = le texte
   exact que lit le site (voir _phraseEntiere dans app.html, v3.8.3).
   node outils/voix-langues-depot.js            → liste seulement
   node outils/voix-langues-depot.js --depot    → dépose
   À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { phrases } = require('./voix-langues-prolong.js');
const { T } = require('./textes-prolong.js');
/* versions retenues par le client (sinon N.mp3) */
const CHOIX = {
  es: { 6: '6-g', 7: '7-g', 8: '8-g', 9: '9-g' },
  de: { 5: '5-g', 8: '8-phon1' },
  pt: { 8: '8-g', 9: '9-g' },
  it: { 8: '8-phon1' },
  nl: { 5: '5-g2', 8: null },
  ru: { 8: null },
  tr: { 6: '6-g', 7: '7-g', 8: null, 9: '9', 10: '10-g' },
  zh: { 1: '1-coupe0.90' },
  id: { 8: '8-phon1', 10: '10-phon1' },
  hi: { 2: '2-g', 4: '4-g', 5: '5-g', 6: '6-ordre', 7: '7-ordre', 8: '8-ordre', 9: '9-mot', 10: '10-ordre' },
};
const LANGS = ['en', 'es', 'de', 'ru', 'pt', 'it', 'nl', 'zh', 'id', 'tr', 'hi'];
function h(t){var h1=0xdeadbeef,h2=0x41c6ce57,i,c;for(i=0;i<t.length;i++){c=t.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return ('0000000'+(h2>>>0).toString(16)).slice(-8)+('0000000'+(h1>>>0).toString(16)).slice(-8);}
const cle = (t) => ((t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) ? 'long|' + h(t) : t);
const L = [], vus = {};
LANGS.forEach((lg) => {
  const D = path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
  phrases(lg).forEach((p, i) => {
    const n = i + 1, c = CHOIX[lg] || {};
    if (c[n] === null) return;
    const f = path.join(D, (c[n] || String(n)) + '.mp3');
    if (vus[p.t]) return; vus[p.t] = 1;
    L.push({ lg, n, k: p.t, f });
  });
  if (fs.existsSync(path.join(D, 'diff.mp3'))) L.push({ lg, n: 'diff', k: T[lg].prolong_diff, f: path.join(D, 'diff.mp3') });
  if (T[lg].prolong_diff2 && fs.existsSync(path.join(D, 'diff2.mp3'))) L.push({ lg, n: 'diff2', k: T[lg].prolong_diff2, f: path.join(D, 'diff2.mp3') });
});
(async () => {
  const depot = process.argv.includes('--depot');
  let ok = 0;
  for (const x of L) {
    if (!fs.existsSync(x.f)) { console.log('MANQUE', x.lg, x.n, x.f); continue; }
    if (!depot) { console.log(x.lg, x.n, path.basename(x.f), '|', x.k.slice(0, 60)); continue; }
    const r = await fetch('https://iamlearningarabic.com/api/audio', { method: 'POST',
      headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ar: cle(x.k), audioBase64: fs.readFileSync(x.f).toString('base64') }) });
    if (r.ok) ok++; else console.log('ECHEC', x.lg, x.n, r.status);
  }
  console.log(L.length, 'audios', depot ? ok + ' en ligne' : '(liste)');
})();
