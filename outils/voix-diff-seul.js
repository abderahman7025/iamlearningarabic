/* 24 octobre 2026 — néerlandais, russe, turc, phrase 8 : le client garde SA
   voix du studio pour وِيُ et وِي ; le Narrateur ne dit que « est différent
   de », découpé dans une phrase entière (sinon l'accent part). */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { trames, extrait } = require('./voix-groupe-couper.js');
const { T } = require('./textes-prolong.js');
const D = (lg) => path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
function couper(lg, dire, A, buf) {
  const d = T[lg].prolong_diff, txt = A.characters.join(''), k = txt.lastIndexOf(d);
  const a = A.character_start_times_seconds[k] - 0.05, b = A.character_end_times_seconds[k + d.length - 1] + 0.12;
  fs.writeFileSync(path.join(D(lg), 'diff.mp3'), extrait(buf, trames(buf), Math.max(0, a), b));
  console.log(lg, d, a.toFixed(2), '→', b.toFixed(2));
}
(async () => {
  let c = 0;
  const j = JSON.parse(fs.readFileSync(path.join(D('nl'), 'groupe-nl-intro2.json'), 'utf8'));
  couper('nl', j.dire, j.A, fs.readFileSync(path.join(D('nl'), 'groupe-nl-intro2.mp3')));
  const INTRO = { ru: 'Слушайте внимательно следующие примеры на русском языке.', tr: 'Şimdi Türkçe olarak şu örnekleri dikkatle dinleyin.' };
  for (const lg of ['ru', 'tr']) {
    const dire = INTRO[lg] + ' وَإِ ' + T[lg].prolong_diff + ' وَا';
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU/with-timestamps?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: dire, model_id: 'eleven_v4', language_code: lg, voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', lg, r.status); continue; }
    const jj = await r.json(); c += dire.length;
    const buf = Buffer.from(jj.audio_base64, 'base64');
    fs.writeFileSync(path.join(D(lg), 'groupe-diff.mp3'), buf); fs.writeFileSync(path.join(D(lg), 'groupe-diff.json'), JSON.stringify({ dire, A: jj.alignment }));
    couper(lg, dire, jj.alignment, buf);
  }
  console.log('caracteres', c);
})();
