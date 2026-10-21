/*
 * MISE EN LIGNE — voix 6-11 des 11 langues, selon l'écoute du client
 * (21 octobre). Ne génère RIEN : dépose les sons déjà faits.
 *   - phrases où l'ANCIEN son est bon, ou où rien ne va : on ne touche pas
 *     (le son en ligne reste) ;
 *   - phrases refaites en essai : la façon choisie (A ou B) ;
 *   - toutes les autres : le nouveau son (noms en arabe, v4 posé).
 *   node outils/voix-6-11-langues-depot.js
 */
const fs = require('fs');
const path = require('path');
function hache(t) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  for (i = 0; i < t.length; i++) { c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
}
const cle = (t) => ((t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) ? 'long|' + hache(t) : t);
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const SITE = 'https://iamlearningarabic.com';
/* on ne touche pas : l'ancien est bon, ou aucune version ne va */
const GARDER = { es: [5, 16, 19, 20, 21], pt: [22, 24], id: [4, 5, 11, 15], hi: [6, 11, 12, 19, 20, 22, 23] };
/* la façon choisie dans l'essai */
const CHOIX = {
  es: { 4: 'A', 17: 'A', 25: 'B', 26: 'B', 27: 'A' },
  de: { 7: 'B', 8: 'A', 9: 'B', 11: 'B', 16: 'B', 19: 'B', 24: 'B' },
  nl: { 14: 'A', 16: 'B' },
  pt: { 5: 'A', 13: 'A', 14: 'A', 15: 'A', 23: 'A' },
  ru: { 24: 'B' }, id: { 1: 'B' }, hi: { 1: 'B', 9: 'A', 13: 'B', 25: 'B' },
};
const s = fs.readFileSync(path.join(__dirname, 'voix-6-11-langues-gen.js'), 'utf8');
eval(s.slice(s.indexOf('const AR ='), s.indexOf('const data =')).replace(/^const /gm, 'var '));
const data = require('./voix-6-11-langues.json');
const neuf = path.join(__dirname, 'captures', 'voix-6-11-langues');
const essai = path.join(__dirname, 'captures', 'essai-langues-refaire');
(async () => {
  let ok = 0, gardes = 0, rates = 0;
  for (const lg of Object.keys(data)) {
    for (const x of data[lg]) {
      if (pourLaVoix(x.t, lg) === x.t) continue;                       /* jamais refaite */
      if ((GARDER[lg] || []).indexOf(x.n) >= 0) { gardes++; continue; }
      const k = cle(x.t);
      const c = (CHOIX[lg] || {})[x.n];
      const f = c ? path.join(essai, lg + '-' + x.n + '-' + c + '.mp3')
                  : path.join(neuf, lg, Buffer.from(k).toString('hex').slice(0, 80) + '.mp3');
      try {
        if (!fs.existsSync(f)) throw new Error('fichier absent ' + path.basename(f));
        const r = await fetch(SITE + '/api/audio', { method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }) });
        if (!r.ok) throw new Error('depot ' + r.status + ' ' + (await r.text()).slice(0, 160));
        ok++; console.log('ok', lg, x.n, c ? '(' + c + ')' : '');
      } catch (e) { rates++; console.log('ECHEC', lg, x.n, String(e.message).slice(0, 200)); }
    }
  }
  console.log('\nmis en ligne', ok, '- anciens gardes', gardes, '- echecs', rates);
  console.log(rates ? 'Il y a des echecs : envoie-moi ce qui est ecrit au-dessus.' : 'Termine. Ferme et rouvre l\'appli pour entendre les nouvelles voix.');
})();
