/* 24 octobre 2026 — six façons d'écrire « Allah » pour le Narrateur v4 posé
   (la fatha n'a rien changé : « au nom d'illah », « Alla »). Fichiers dans
   captures/voix-allah-essais, page d'écoute sur le Bureau. Rien n'est mis en
   ligne. À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const ESSAIS = [
  "Au nom de اللَّه. Place ta confiance en اللَّه.",
  "Au nom d'Allâh. Place ta confiance en Allâh.",
  "Au nom d'Allaah. Place ta confiance en Allaah.",
  "Au nom d'Al-lah. Place ta confiance en Al-lah.",
  "Au nom d'اللّٰه. Place ta confiance en اللّٰه.",
  "Au nom de Allahh. Place ta confiance en Allahh.",
];
const dest = path.join(__dirname, 'captures', 'voix-allah-essais'); fs.mkdirSync(dest, { recursive: true });
(async () => {
  let car = 0;
  for (let i = 0; i < ESSAIS.length; i++) {
    const f = path.join(dest, 'essai-' + (i + 1) + '.mp3');
    if (fs.existsSync(f) && fs.statSync(f).size > 500) { console.log('deja', i + 1); continue; }
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + ESSAIS[i], model_id: 'eleven_v4', language_code: 'fr',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', i + 1, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    car += ESSAIS[i].length + 7;
    console.log('ok', i + 1);
  }
  fs.writeFileSync(path.join(dest, 'essais.json'), JSON.stringify(ESSAIS, null, 1));
  console.log('caracteres', car);
})();
