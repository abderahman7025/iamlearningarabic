/*
 * DONNER À UN SON LE MÊME ENREGISTREMENT QU'UN AUTRE — À NE PAS DÉPLOYER.
 *   node outils/copie-son.js <hex source> <hex cible>
 * Prend le son nettoyé de la source (captures/studio-propre/apres-fort) et
 * le met en ligne sous la clé de la cible. Ex. : ءَا reçoit le son de آ.
 */
const fs = require('fs');
const path = require('path');
const env = {};
try { fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); }); } catch (e) {}
const [src, cible] = process.argv.slice(2);
const fichier = path.join(__dirname, 'captures', 'studio-propre', 'apres-fort', src + '.mp3');
const ar = Buffer.from(cible, 'hex').toString('utf8');
(async () => {
  if (!fs.existsSync(fichier)) { console.log('Introuvable :', fichier); process.exit(1); }
  const r = await fetch('https://iamlearningarabic.com/api/audio', { method: 'POST',
    headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ar, audioBase64: fs.readFileSync(fichier).toString('base64') }) });
  console.log(r.ok ? 'en ligne : ' + Buffer.from(src, 'hex').toString('utf8') + ' -> ' + ar : 'ECHEC ' + r.status);
})();
