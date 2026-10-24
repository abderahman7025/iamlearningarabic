/* 24 octobre 2026 — corrections demandées par le client : phonétique de la
   langue pour و (sinon « v »), phrases groupées pour l'accent. Rien en ligne. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { groupe } = require('./voix-groupe-couper.js');
const D = (lg) => path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
const SEULES = [
  ['ru', 8, 'Уию отличается от Уии.'],
  ['it', 8, 'Uiyu è diverso da Uii.'],
  ['nl', 8, 'Oeiejoe verschilt van Oeie.'],
  ['tr', 8, 'Uiyu farklıdır Uii.'],
  ['id', 8, 'Wiyu berbeda dari Wii.'],
  ['id', 10, 'Awaah berbeda dari Awwaah.'],
  ['hi', 6, 'Wai से अलग Waa'],
  ['hi', 7, 'Yuwa से अलग Yuu'],
  ['hi', 8, 'Wiyu से अलग Wii'],
  ['hi', 10, 'Awaah से अलग Awwaah'],
];
(async () => {
  let c = 0;
  for (const [lg, n, t] of SEULES) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: t, model_id: 'eleven_v4', language_code: lg, voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', lg, n, r.status); continue; }
    fs.writeFileSync(path.join(D(lg), n + '-phon1.mp3'), Buffer.from(await r.arrayBuffer())); c += t.length;
  }
  c += await groupe('pt', [8, 9], 'pt89', { seg: ['Uiyu é diferente de Uii.', 'إِ يَا كَ é diferente de إِيَّاكَ'] });
  c += await groupe('nl', [5, 6], 'nl-intro', { intro: 'Luister nu goed, in het Nederlands.' });
  console.log('caracteres', c);
})();
