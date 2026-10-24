/* 24 octobre 2026 — essai demandé par le client : trois phrases ENTIÈRES dites
   par le Narrateur v4 posé, arabe compris, en anglais. Page sur le Bureau,
   rien en ligne. À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const P = [
  `إِيَاكَ is different from إِيَّاكَ`,
  `أَوَاهْ is different from أَوَّاهْ`,
  `وِيُ is different from وِي`,
];
const dest = path.join(__dirname, 'captures', 'voix-essai-anglais'); fs.mkdirSync(dest, { recursive: true });
(async () => {
  let car = 0;
  for (let i = 0; i < P.length; i++) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + P[i], model_id: 'eleven_v4', language_code: 'en',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', i + 1, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(path.join(dest, (i + 1) + '.mp3'), Buffer.from(await r.arrayBuffer())); car += P[i].length + 7;
    console.log('ok', i + 1);
  }
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Essai anglais - 3 phrases</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:820px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{font-size:1.1rem;margin-bottom:8px}.t span{font-family:Amiri,serif;color:#b45309;font-size:1.3em}audio{width:100%}</style></head><body><h1>Essai — anglais, phrase entière par le Narrateur v4 posé</h1><p>Rien n\'est en ligne.</p>';
  P.forEach((t, i) => { const f = path.join(dest, (i + 1) + '.mp3'); if (!fs.existsSync(f)) return; H += '<div class="c"><div class="t"><b>' + (i + 1) + '.</b> ' + esc(t).replace(/([\u0600-\u06FF]+)/g, '<span>$1</span>') + '</div><audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Essai anglais - 3 phrases.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car);
})();
