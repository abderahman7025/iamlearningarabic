/* 24 octobre 2026 — met en ligne les 7 bouts français choisis par le client :
   1, 5, 6, 7 en v3 posé ; 2, 3, 4 en v3 « sans émotion ». Clé = le texte
   exact (t() en français). À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { PHRASES } = require('./voix-bouts-francais.js');
const C = path.join(__dirname, 'captures');
const FICHIER = (n) => [2, 3, 4].includes(n) ? path.join(C, 'voix-bouts-neutre', n + '-1.mp3') : path.join(C, 'voix-bouts-francais-v3', 'fr', n + '.mp3');
(async () => {
  for (let n = 1; n <= 7; n++) {
    const t = PHRASES.fr[n - 1];
    const r = await fetch('https://iamlearningarabic.com/api/audio', { method: 'POST',
      headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ar: t, audioBase64: fs.readFileSync(FICHIER(n)).toString('base64') }) });
    console.log(r.ok ? 'en ligne' : 'ECHEC ' + r.status, n, t.slice(0, 50));
  }
})();
