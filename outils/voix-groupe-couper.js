/* 24 octobre 2026 — plusieurs phrases dites d'UN SEUL tenant (la voix garde
   l'accent de la langue), puis découpées phrase par phrase grâce aux temps de
   chaque lettre (ElevenLabs with-timestamps). Les temps sont gardés dans
   <dossier>/groupe-<nom>.json.
   node outils/voix-groupe-couper.js es 6,7,8,9   → crée N-g.mp3 pour chacun
   À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { phrases } = require('./voix-langues-prolong.js');
function trames(buf) {
  const BR = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320], SR = [44100,48000,32000], F = [];
  let i = 0; if (buf.slice(0, 3).toString() === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  let t = 0;
  while (i + 4 < buf.length) {
    if (buf[i] !== 0xFF || (buf[i + 1] & 0xE0) !== 0xE0) { i++; continue; }
    const br = BR[buf[i + 2] >> 4] * 1000, sr = SR[(buf[i + 2] >> 2) & 3], pad = (buf[i + 2] >> 1) & 1;
    if (!br || !sr) { i++; continue; }
    const n = Math.floor(144 * br / sr) + pad; F.push({ a: i, b: i + n, t }); i += n; t += 1152 / sr;
  }
  return F;
}
const extrait = (buf, F, a, b) => Buffer.concat(F.filter((f) => f.t >= a && f.t < b).map((f) => buf.slice(f.a, f.b)));
async function groupe(lg, nums, nom, o) {
  o = o || {};
  const P = phrases(lg), dest = path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
  /* le texte dit = les phrases à la suite ; on retire la balise [calm] */
  const seg = o.seg || nums.map((n) => (P[n - 1].mot || P[n - 1].dire || P[n - 1].t).replace(/^\[calm\] /, ''));
  /* o.intro : une phrase dans la langue, dite avant puis retirée ; o.code : autre language_code (null = aucun) */
  const dire = (o.intro ? o.intro + ' ' : '') + seg.join(' ');
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU/with-timestamps?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: dire, model_id: 'eleven_v4', ...(o.code === null ? {} : { language_code: o.code || lg }),
      voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
  if (!r.ok) { console.log('ECHEC', lg, r.status, (await r.text()).slice(0, 200)); return 0; }
  const j = await r.json(), A = j.alignment, buf = Buffer.from(j.audio_base64, 'base64');
  fs.writeFileSync(path.join(dest, 'groupe-' + nom + '.mp3'), buf);
  fs.writeFileSync(path.join(dest, 'groupe-' + nom + '.json'), JSON.stringify({ dire, A }));
  const txt = A.characters.join(''), F = trames(buf), fin = F.length ? F[F.length - 1].t + 0.03 : 99;
  let pos = o.intro ? o.intro.length : 0; const debut = seg.map((s) => { const k = txt.indexOf(s, pos); pos = k + s.length; return k; });
  nums.forEach((n, i) => {
    const a = Math.max(0, A.character_start_times_seconds[debut[i]] - (i === 0 && o.intro ? 0.03 : 0.06));
    const b = i + 1 < nums.length ? A.character_start_times_seconds[debut[i + 1]] - 0.04 : fin;
    fs.writeFileSync(path.join(dest, n + '-' + (o.suffixe || 'g') + '.mp3'), extrait(buf, F, a, b));
    console.log(lg, n, a.toFixed(2), '→', b.toFixed(2));
  });
  return dire.length;
}
module.exports = { groupe, trames, extrait };
if (require.main === module) groupe(process.argv[2], process.argv[3].split(',').map(Number), process.argv[4] || process.argv[3].replace(/,/g, '')).then((c) => console.log('caracteres', c));
