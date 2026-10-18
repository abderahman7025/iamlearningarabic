/*
 * ESSAI — ﷺ dans chaque langue, écrit en lettres de la langue (le n° 4 du
 * français). À NE PAS DÉPLOYER. Rien n'est mis en ligne. ~550 caractères.
 *   node outils/essai-salat-langues.js
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'essai-salat-langues.json'), 'utf8'));
const NOMS = { fr: 'Français', en: 'Anglais', es: 'Espagnol', de: 'Allemand', nl: 'Néerlandais', it: 'Italien', pt: 'Portugais', ru: 'Russe', tr: 'Turc', zh: 'Chinois', id: 'Indonésien', hi: 'Hindi' };
const dest = path.join(__dirname, 'captures', 'essai-salat');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  for (const x of LISTE) {
    const f = path.join(dest, 'l-' + x.langue + '.mp3');
    if (fs.existsSync(f)) continue;
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + x.texte, model_id: 'eleven_v4', language_code: x.langue,
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.log('ECHEC', x.langue, r.status, (await r.text()).slice(0, 160)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    console.log('ok', x.langue);
  }
  let h = '<!doctype html><meta charset="utf-8"><title>ﷺ langues</title><body style="font-family:system-ui;background:#fdf8ee;padding:20px;max-width:640px;margin:auto"><h2>ﷺ : la formule est-elle bien dite ?</h2>';
  for (const x of LISTE) h += '<p style="background:#fff;padding:12px 16px;border-radius:12px"><b>' + NOMS[x.langue] + '</b><br><small>' + x.texte + '</small><br><audio controls src="l-' + x.langue + '.mp3"></audio></p>';
  fs.writeFileSync(path.join(dest, 'ecoute-langues.html'), h);
  console.log('\nTermine. La page s\'ouvre dans Chrome.');
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute-langues.html') + '"');
})();
