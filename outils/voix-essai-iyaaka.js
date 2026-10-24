/* 24 octobre 2026 — phrase 1 en anglais : le Narrateur v4 dit presque
   « iyyaaka » pour إِيَاكَ. Trois autres façons d'écrire le mot pour la voix
   (le texte affiché ne change pas). Page sur le Bureau, rien en ligne.
   À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const P = [
  { nom: 'lettres séparées', t: `إِ يَا كَ is different from إِيَّاكَ` },
  { nom: 'coupé avant le ya', t: `إِ-يَاكَ is different from إِيَّاكَ` },
  { nom: 'translittération', t: `i-yaa-ka is different from إِيَّاكَ` },
];
const dest = path.join(__dirname, 'captures', 'voix-essai-iyaaka'); fs.mkdirSync(dest, { recursive: true });
(async () => {
  let car = 0;
  for (let i = 0; i < P.length; i++) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + P[i].t, model_id: 'eleven_v4', language_code: 'en',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', i + 1, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(path.join(dest, (i + 1) + '.mp3'), Buffer.from(await r.arrayBuffer())); car += P[i].t.length + 7;
    console.log('ok', i + 1);
  }
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Essai iyaaka - 3 façons</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:820px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{font-size:1.1rem;margin-bottom:8px}.t span{font-family:Amiri,serif;color:#b45309;font-size:1.3em}.n{font-size:.85rem;color:#7a4a00}audio{width:100%}</style></head><body><h1>Phrase 1 (iyaaka) — 3 façons d\'écrire pour la voix</h1><p>Le texte affiché sur le site ne change pas. Rien n\'est en ligne. Dis-moi le numéro qui convient.</p>';
  P.forEach((p, i) => { const f = path.join(dest, (i + 1) + '.mp3'); if (!fs.existsSync(f)) return; H += '<div class="c"><div class="n">' + (i + 1) + '. ' + esc(p.nom) + '</div><div class="t">' + esc(p.t).replace(/([\u0600-\u06FF]+)/g, '<span>$1</span>') + '</div><audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Essai iyaaka - 3 façons.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car);
})();
