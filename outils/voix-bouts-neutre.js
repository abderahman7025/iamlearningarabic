/* 24 octobre 2026 — bouts 2, 3, 4 des prolongations : le client les veut
   « sans émotion ». Deux façons : v3 [neutral] et v4 [neutral]. Page sur le
   Bureau, rien en ligne. À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { PHRASES } = require('./voix-bouts-francais.js');
const NUM = [2, 3, 4];
const FACONS = [
  { nom: 'v3 sans émotion', model: 'eleven_v3', tag: '[neutral, flat, no emotion] ' },
  { nom: 'v4 sans émotion', model: 'eleven_v4', tag: '[neutral, flat, no emotion] ' },
];
const dest = path.join(__dirname, 'captures', 'voix-bouts-neutre'); fs.mkdirSync(dest, { recursive: true });
(async () => {
  let car = 0;
  for (const n of NUM) for (let k = 0; k < FACONS.length; k++) {
    const F = FACONS[k], t = PHRASES.fr[n - 1], f = path.join(dest, n + '-' + (k + 1) + '.mp3');
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: F.tag + t, model_id: F.model, language_code: 'fr',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', n, k + 1, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); car += (F.tag + t).length;
    console.log('ok', n, F.nom);
  }
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const au = (p) => fs.existsSync(p) ? '<audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(p).toString('base64') + '"></audio>' : '<i>échec</i>';
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bouts 2 3 4 - sans émotion</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:860px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{font-size:1.05rem;margin-bottom:8px}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}.g div b{font-size:.85rem;color:#7a4a00}audio{width:100%}@media(max-width:600px){.g{grid-template-columns:1fr}}</style></head><body><h1>Bouts 2, 3, 4 — sans émotion</h1><p>Rien n\'est en ligne. Dis-moi la colonne qui convient.</p>';
  NUM.forEach((n) => { H += '<div class="c"><div class="t"><b>' + n + '.</b> ' + esc(PHRASES.fr[n - 1]) + '</div><div class="g">' + FACONS.map((F, k) => '<div><b>' + F.nom + '</b>' + au(path.join(dest, n + '-' + (k + 1) + '.mp3')) + '</div>').join('') + '</div></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Bouts 2 3 4 - sans émotion.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car, '— page sur le Bureau');
})();
