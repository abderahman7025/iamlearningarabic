/* 24 octobre 2026 — essai 7 : وِيُ décomposé en arabe (tr, nl, ru), autre
   phonétique russe, néerlandais 5 avec une intro plus longue. Rien en ligne. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { groupe } = require('./voix-groupe-couper.js');
const D = (lg) => path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
const SEULES = [
  ['tr', 8, 'dec', 'وِ يُ farklıdır وِي'],
  ['nl', 8, 'dec', 'وِ يُ verschilt van وِي'],
  ['ru', 8, 'dec', 'وِ يُ отличается от وِي'],
  ['ru', 8, 'phon2', 'У-и-ю отличается от У-и-и.'],
];
(async () => {
  let c = 0;
  for (const [lg, n, k, t] of SEULES) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: t, model_id: 'eleven_v4', language_code: lg, voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', lg, n, r.status); continue; }
    fs.writeFileSync(path.join(D(lg), n + '-' + k + '.mp3'), Buffer.from(await r.arrayBuffer())); c += t.length;
  }
  c += await groupe('nl', [5, 6], 'nl-intro2', { intro: 'Goedendag. Luister nu heel goed naar de volgende voorbeelden, die ik in het Nederlands uitleg.', suffixe: 'g2' });
  console.log('caracteres', c);
})();
