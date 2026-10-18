/*
 * ESSAI — le tanwin : la voix dit « èn » au lieu du son [n]. À NE PAS DÉPLOYER.
 *   node outils/essai-son-n.js
 * Fabrique 5 façons d'écrire le son pour la voix Narrateur (eleven_v4), sans
 * rien mettre en ligne, et ouvre une page pour les écouter. ~330 caractères.
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const DEBUT = "Lorsque l'on double une des trois voyelles, on ajoute le son ";
const ESSAIS = [
  ['1', 'comme aujourd\'hui : « n »', 'n.'],
  ['2', 'écrit « nn »', '« nn ».'],
  ['3', 'écrit « n\' »', "« n' »."],
  ['4', 'écrit en arabe « نْ »', 'نْ.'],
  ['5', 'écrit « nnn »', '« nnn ».'],
];
const dest = path.join(__dirname, 'captures', 'essai-son-n');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  for (const [n, nom, fin] of ESSAIS) {
    const f = path.join(dest, n + '.mp3');
    if (fs.existsSync(f)) continue;
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + DEBUT + fin, model_id: 'eleven_v4', language_code: 'fr',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.log('ECHEC', n, r.status, (await r.text()).slice(0, 160)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    console.log('ok', n, nom);
  }
  let h = '<!doctype html><meta charset="utf-8"><title>Le son n</title><body style="font-family:system-ui;background:#fdf8ee;padding:20px;max-width:600px;margin:auto"><h2>Le tanwin : quelle version dit bien [n] ?</h2>';
  for (const [n, nom] of ESSAIS) h += '<p style="background:#fff;padding:12px 16px;border-radius:12px"><b>' + n + '.</b> ' + nom + '<br><audio controls src="' + n + '.mp3"></audio></p>';
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  console.log('\nTermine. La page s\'ouvre dans Chrome.');
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
