/* 24 octobre 2026 — phrases MIXTES des cours adultes (prolongations,
   note des voyelles), lues d'un seul tenant par le Narrateur v4 posé.
   node outils/voix-mixtes-prolong.js fr            → génère (pas de dépôt)
   node outils/voix-mixtes-prolong.js fr --depot    → dépose ce qui est généré
   La clé de dépôt = le texte exact (voir le branchement dans app.html).
   À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
/* Correction du client : le Narrateur ne dit QUE le français ; l'arabe
   (لَأُحِبُّك, وَا…) est dit par SA voix du studio, juste après. Les phrases
   mixtes générées d'abord (captures/voix-mixtes-prolong/fr) ne servent pas. */
const PHRASES = {
  fr: [
    `Exemple :`,
    `"Je t'aime vraiment" se dit`,
    `alors que...`,
    `"Je ne t'aime pas" se dit`,
    `Illustration :`,
    `est différent de`,
    `(Il n'est pas essentiel, pour le moment, de retenir le nom des voyelles, mais plutôt leur son).`,
  ],
};
function h(t){var h1=0xdeadbeef,h2=0x41c6ce57,i,c;for(i=0;i<t.length;i++){c=t.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return ('0000000'+(h2>>>0).toString(16)).slice(-8)+('0000000'+(h1>>>0).toString(16)).slice(-8);}
const cle = (t) => ((t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) ? 'long|' + h(t) : t);
const langue = process.argv[2] || 'fr', depot = process.argv.includes('--depot');
/* --v3 : Narrateur v3 posé ([calm]), comme les phrases adultes 100 % françaises. */
const V3 = process.argv.includes('--v3');
const L = PHRASES[langue]; if (!L) { console.log('langue inconnue'); process.exit(1); }
const dest = path.join(__dirname, 'captures', 'voix-bouts-francais' + (V3 ? '-v3' : ''), langue); fs.mkdirSync(dest, { recursive: true });
module.exports = { PHRASES };
if (require.main === module) (async () => {
  let car = 0;
  for (let i = 0; i < L.length; i++) {
    const t = L[i], f = path.join(dest, (i + 1) + '.mp3');
    if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
      const dire = t.replace(/\bAllah\b/g, 'Allâh');
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
        method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: (V3 ? '[calm] ' : '') + dire, model_id: V3 ? 'eleven_v3' : 'eleven_v4', language_code: langue,
          voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
      if (!r.ok) { console.log('ECHEC', i + 1, r.status, (await r.text()).slice(0, 200)); continue; }
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); car += dire.length;
      console.log('genere', i + 1);
    }
    if (depot) {
      const r2 = await fetch('https://iamlearningarabic.com/api/audio', { method: 'POST',
        headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ar: cle(t), audioBase64: fs.readFileSync(f).toString('base64') }) });
      console.log(r2.ok ? 'en ligne' : 'ECHEC depot ' + r2.status, i + 1);
    }
  }
  console.log('caracteres generes', car);
})();
