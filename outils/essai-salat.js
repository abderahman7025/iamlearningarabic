/*
 * ESSAI — « ﷺ » : la voix le traduit en français (« que la paix et le salut
 * d'Allah soient sur lui ») au lieu de dire ṣallā llāhu ʿalayhi wa sallam.
 *   node outils/essai-salat.js     — 4 versions, rien en ligne, ~300 car.
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const P = 'Le prophète Muhammad ', S = ' a dit : « Les actions ne valent que par les intentions. »';
const ESSAIS = [
  ['1', 'le signe ﷺ, voix v4', P + 'ﷺ' + S, 'eleven_v4'],
  ['2', 'le signe ﷺ, voix v3 (celle des premiers textes français)', P + 'ﷺ' + S, 'eleven_v3'],
  ['3', 'en arabe sans voyelles : صلى الله عليه وسلم (v4)', P + 'صلى الله عليه وسلم' + S, 'eleven_v4'],
  ['4', 'en lettres latines : sallallahou alayhi wa sallam (v4)', P + 'sallallahou alayhi wa sallam' + S, 'eleven_v4'],
];
const dest = path.join(__dirname, 'captures', 'essai-salat');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  for (const [n, nom, texte, modele] of ESSAIS) {
    const f = path.join(dest, n + '.mp3');
    if (fs.existsSync(f)) continue;
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + texte, model_id: modele, language_code: 'fr',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.log('ECHEC', n, r.status, (await r.text()).slice(0, 160)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    console.log('ok', n, nom);
  }
  let h = '<!doctype html><meta charset="utf-8"><title>ﷺ</title><body style="font-family:system-ui;background:#fdf8ee;padding:20px;max-width:600px;margin:auto"><h2>Quelle version dit bien ﷺ en arabe ?</h2>';
  for (const [n, nom] of ESSAIS) h += '<p style="background:#fff;padding:12px 16px;border-radius:12px"><b>' + n + '.</b> ' + nom + '<br><audio controls src="' + n + '.mp3"></audio></p>';
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  console.log('\nTermine. La page s\'ouvre dans Chrome.');
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
