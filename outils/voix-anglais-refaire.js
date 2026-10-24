/* 24 octobre 2026 — anglais : refaire 1, 3, 5 sans « [calm] » (sortis en
   français, ton pas aimé) et 6 avec وَإِ (hamza sous l'alif). Les anciens sont
   gardés à côté pour comparer. Rien en ligne. À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const dest = path.join(__dirname, 'captures', 'voix-anglais-tout');
const R = [
  { n: 1, t: `Example:`, tag: '' },
  { n: 3, t: `whereas...`, tag: '' },
  { n: 5, t: `Illustration:`, tag: '' },
  { n: 6, t: `وَإِ is different from وَا`, tag: '[calm] ' },
];
(async () => {
  let car = 0;
  for (const p of R) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: p.tag + p.t, model_id: 'eleven_v4', language_code: 'en',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', p.n, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(path.join(dest, p.n + '-b.mp3'), Buffer.from(await r.arrayBuffer())); car += (p.tag + p.t).length;
    console.log('ok', p.n);
  }
  const au = (f) => '<audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio>';
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anglais - 1 3 5 6 refaites</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:860px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{font-size:1.1rem;margin-bottom:8px}.t span{font-family:Amiri,serif;color:#b45309;font-size:1.3em}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}.g b{font-size:.85rem;color:#7a4a00}audio{width:100%}@media(max-width:600px){.g{grid-template-columns:1fr}}</style></head><body><h1>Anglais — 1, 3, 5, 6 refaites</h1><p>Rien n\'est en ligne.</p>';
  R.forEach((p) => { const nv = path.join(dest, p.n + '-b.mp3'); if (!fs.existsSync(nv)) return;
    H += '<div class="c"><div class="t"><b>' + p.n + '.</b> ' + p.t.replace(/([\u0600-\u06FF]+)/g, '<span>$1</span>') + '</div><div class="g"><div><b>avant' + (p.n === 6 ? ' (وَاِ)' : ' (posé)') + '</b>' + au(path.join(dest, p.n + '.mp3')) + '</div><div><b>nouveau' + (p.n === 6 ? ' (وَإِ)' : ' (sans posé)') + '</b>' + au(nv) + '</div></div></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Anglais - 1 3 5 6 refaites.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car);
})();
