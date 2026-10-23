/* 24 octobre 2026 — le client trouve le ton v4 posé « abusé » sur les phrases
   mixtes. Quatre réglages essayés sur la phrase n° 2 ; page sur le Bureau.
   Rien n'est mis en ligne. À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const T = `alors que... "Je ne t'aime pas" se dit لَا أُحِبُّك`;
const ESSAIS = [
  { nom: 'v3 posé (comme les phrases adultes en français)', model: 'eleven_v3', tag: '[calm] ', vs: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } },
  { nom: 'v4 posé, plus stable', model: 'eleven_v4', tag: '[calm] ', vs: { stability: 0.85, similarity_boost: 0.95, style: 0, use_speaker_boost: true } },
  { nom: 'v4 sans balise de ton', model: 'eleven_v4', tag: '', vs: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } },
  { nom: 'v4 neutre, sobre', model: 'eleven_v4', tag: '[neutral, matter-of-fact] ', vs: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } },
];
const dest = path.join(__dirname, 'captures', 'voix-ton-essais'); fs.mkdirSync(dest, { recursive: true });
(async () => {
  let car = 0;
  for (let i = 0; i < ESSAIS.length; i++) {
    const e = ESSAIS[i], f = path.join(dest, 'essai-' + (i + 1) + '.mp3');
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: e.tag + T, model_id: e.model, language_code: 'fr', voice_settings: e.vs }) });
    if (!r.ok) { console.log('ECHEC', i + 1, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); car += (e.tag + T).length;
    console.log('ok', i + 1, e.nom);
  }
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ton - 4 essais</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:820px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{margin-bottom:8px}audio{width:100%}</style></head><body><h1>Ton de la voix : 4 essais</h1><p>Phrase : ' + esc(T) + '</p><p>Dis-moi le numéro qui convient.</p>';
  ESSAIS.forEach((e, i) => { const f = path.join(dest, 'essai-' + (i + 1) + '.mp3'); if (!fs.existsSync(f)) return; H += '<div class="c"><div class="t"><b>' + (i + 1) + '.</b> ' + esc(e.nom) + '</div><audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Ton - 4 essais.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car, '— page sur le Bureau');
})();
