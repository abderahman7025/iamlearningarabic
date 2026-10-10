/*
 * Voix de l'interface ados/adultes — À NE PAS DÉPLOYER (hors de api/ et public/).
 *
 * Génère avec ElevenLabs (voix Narrateur, v3, ton posé) les textes que
 * l'interface lit au clic, et les dépose par POST /api/audio.
 *
 *   node outils/voix-adulte.js outils/captures/inv-adulte-fr.json fr [--sans-depot]
 *
 * Le fichier d'inventaire vient du banc : `speakText` remplacé par un
 * enregistreur, puis chaque page adulte rendue et cliquée (voir ETAT.md).
 * Il contient { fr:[{t,src}], mixte:[…] } ; `mixte` — les textes qui portent
 * de l'écriture arabe — n'est PAS généré : l'IA ne dit jamais d'arabe.
 *
 * LA CLÉ : le texte lui-même jusqu'à 180 caractères, sinon « long| » +
 * `_hacheTexte(texte)`. Ce calcul est copié de app/app.html (`_clesSon`) :
 * les deux doivent bouger ensemble.
 */
const fs = require('fs');
const path = require('path');

function _hacheTexte(t) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  for (i = 0; i < t.length; i++) {
    c = t.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
}
const cle = (t) => (t.length > 180 ? 'long|' + _hacheTexte(t) : t);

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU'; // Narrateur
const inv = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const langue = process.argv[3] || 'fr';
const sansDepot = process.argv.includes('--sans-depot');
const dest = path.join(__dirname, 'captures', 'voix-adulte-' + langue);
fs.mkdirSync(dest, { recursive: true });

/* Ce qu'on DIT n'est pas tout à fait ce qu'on écrit : les puces et les
   espaces avant un point ne se prononcent pas. La clé, elle, reste le texte
   exact que l'application passe à `speakText`. */
const aDire = (t) => t.replace(/\s*•\s*/g, ' ').replace(/\s+([.,])/g, '$1').replace(/\s+/g, ' ').trim();

(async () => {
  const textes = inv.fr.map((x) => x.t);
  let car = 0; const rates = [];
  for (const t of textes) {
    const k = cle(t);
    const f = path.join(dest, Buffer.from(k).toString('hex').slice(0, 80) + '.mp3');
    try {
      if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
        const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: '[calm] ' + aDire(t), model_id: 'eleven_v3', language_code: langue,
            voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true },
          }),
        });
        if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        car += t.length;
      }
      if (!sansDepot) {
        const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
      }
      console.log('ok', t.length, k.slice(0, 40).replace(/[^\x20-\x7e]/g, '?'));
    } catch (e) { rates.push(k); console.log('ECHEC', String(e.message).slice(0, 200)); }
  }
  console.log('textes', textes.length, 'caracteres generes', car, 'echecs', rates.length);
})();
