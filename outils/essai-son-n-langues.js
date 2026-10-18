/*
 * ESSAI — le son [n] du tanwin dans les 12 autres langues. À NE PAS DÉPLOYER.
 *   node outils/essai-son-n-langues.js
 * En français, la voix disait « èn » ; le client a choisi « n' ». Ici, pour
 * chaque langue : 1 = comme aujourd'hui, 3 = « n' », 4 = نْ en arabe.
 * Narrateur, eleven_v4, rien n'est mis en ligne. ~2 600 caractères.
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'essai-son-n-langues.json'), 'utf8'));
const dest = path.join(__dirname, 'captures', 'essai-son-n');
fs.mkdirSync(dest, { recursive: true });
const NOMS = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', nl: 'Néerlandais', it: 'Italien', pt: 'Portugais', ru: 'Russe', tr: 'Turc', zh: 'Chinois', id: 'Indonésien', ur: 'Ourdou', hi: 'Hindi' };
(async () => {
  for (const L of LISTE) for (const [n, , texte] of L.essais) {
    const f = path.join(dest, L.langue + '-' + n + '.mp3');
    if (fs.existsSync(f)) continue;
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + texte, model_id: 'eleven_v4', language_code: L.langue,
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.log('ECHEC', L.langue, n, r.status, (await r.text()).slice(0, 160)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    console.log('ok', L.langue, n);
  }
  let h = '<!doctype html><meta charset="utf-8"><title>Le son n, langues</title><body style="font-family:system-ui;background:#fdf8ee;padding:20px;max-width:760px;margin:auto"><h2>Le tanwin : quelle version dit bien [n] ?</h2>';
  for (const L of LISTE) {
    h += '<div style="background:#fff;padding:12px 16px;border-radius:12px;margin:12px 0"><h3 style="margin:0 0 6px">' + (NOMS[L.langue] || L.langue) + '</h3>';
    for (const [n, nom, texte] of L.essais) h += '<p style="margin:6px 0"><b>' + n + '.</b> ' + nom + '<br><small>' + texte + '</small><br><audio controls src="' + L.langue + '-' + n + '.mp3"></audio></p>';
    h += '</div>';
  }
  fs.writeFileSync(path.join(dest, 'ecoute-langues.html'), h);
  console.log('\nTermine. La page s\'ouvre dans Chrome.');
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute-langues.html') + '"');
})();
