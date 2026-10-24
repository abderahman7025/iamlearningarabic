/* 24 octobre 2026 — « Example: » et « Illustration: » seuls sortent en
   français. On les fait dire AVEC la phrase d'après (la voix comprend que
   c'est de l'anglais), puis on coupe l'audio juste après le mot, grâce aux
   temps de chaque lettre que donne ElevenLabs. Sans « [calm] ».
   Rien en ligne. À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const dest = path.join(__dirname, 'captures', 'voix-anglais-tout');
const R = [
  { n: 1, mot: `Example:`, t: `Example: "I truly love you" is said لَأُحِبُّك` },
  { n: 5, mot: `Illustration:`, t: `Illustration: وَإِ is different from وَا` },
];
/* Coupe un MP3 (MPEG-1 couche III) à la trame près, sans outil externe. */
function couper(buf, sec) {
  const BR = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320], SR = [44100,48000,32000];
  let i = 0;
  if (buf.slice(0, 3).toString() === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  const debut = i; let t = 0;
  while (i + 4 < buf.length && t < sec) {
    if (buf[i] !== 0xFF || (buf[i + 1] & 0xE0) !== 0xE0) { i++; continue; }
    const br = BR[buf[i + 2] >> 4] * 1000, sr = SR[(buf[i + 2] >> 2) & 3], pad = (buf[i + 2] >> 1) & 1;
    if (!br || !sr) { i++; continue; }
    i += Math.floor(144 * br / sr) + pad; t += 1152 / sr;
  }
  return Buffer.concat([buf.slice(0, debut), buf.slice(debut, i)]);
}
(async () => {
  let car = 0;
  for (const p of R) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU/with-timestamps?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: p.t, model_id: 'eleven_v4', language_code: 'en',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', p.n, r.status, (await r.text()).slice(0, 200)); continue; }
    const j = await r.json(); car += p.t.length;
    const audio = Buffer.from(j.audio_base64, 'base64');
    fs.writeFileSync(path.join(dest, p.n + '-entier.mp3'), audio);
    const A = j.alignment || j.normalized_alignment;
    const fin = A.character_end_times_seconds[p.mot.length - 1];
    let k = p.mot.length; while (k < A.characters.length && /\s/.test(A.characters[k])) k++;
    const suite = A.character_start_times_seconds[k];
    const cut = Math.min(fin + 0.25, (fin + suite) / 2 + 0.05);
    fs.writeFileSync(path.join(dest, p.n + '-c.mp3'), couper(audio, cut));
    console.log('ok', p.n, 'fin du mot', fin.toFixed(2), 'suite', suite.toFixed(2), 'coupe', cut.toFixed(2));
  }
  const au = (f) => '<audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio>';
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anglais - Example et Illustration</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:860px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{font-size:1.1rem;margin-bottom:8px}.t span{font-family:Amiri,serif;color:#b45309;font-size:1.3em}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}.g b{font-size:.85rem;color:#7a4a00}audio{width:100%}@media(max-width:600px){.g{grid-template-columns:1fr}}</style></head><body><h1>« Example: » et « Illustration: » dits avec la phrase d\'après</h1><p>À gauche la phrase entière, à droite le mot seul coupé. Rien n\'est en ligne.</p>';
  R.forEach((p) => { const e = path.join(dest, p.n + '-entier.mp3'), c = path.join(dest, p.n + '-c.mp3'); if (!fs.existsSync(c)) return;
    H += '<div class="c"><div class="t"><b>' + p.n + '.</b> ' + p.t.replace(/([\u0600-\u06FF]+)/g, '<span>$1</span>') + '</div><div class="g"><div><b>phrase entière</b>' + au(e) + '</div><div><b>' + p.mot + ' seul (coupé)</b>' + au(c) + '</div></div></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Anglais - Example et Illustration.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car);
})();
