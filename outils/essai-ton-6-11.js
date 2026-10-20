/*
 * ESSAI — voix des 6-11 ans : la version ACTUELLE (v4 chaleureux, téléchargée
 * depuis le site) à côté de la v4 POSÉE ([calm], comme l'adulte), et de la v4
 * posée avec les noms de lettres/voyelles écrits en ARABE pour la voix
 * (fatha → فَتْحَة, waw → وَاو…). Rien n'est mis en ligne.
 *   node outils/essai-ton-6-11.js     — 5 phrases × 2 versions, ~650 caractères.
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const SITE = 'https://iamlearningarabic.com';
const PHRASES = [
  'Ici le waw porte une fatha. On ne dit pas bouu, mais bouwa.',
  'La voyelle damma ressemble à un petit waw. On la prolonge donc avec le waw.',
  'Avec le soukoun, on ne prononce rien.',
  'fatha est prolongé par le',
  'Avec ce petit chapeau, on insiste sur la lettre.',
];
const NOMS = [
  [/\bfatha\b/gi, 'فَتْحَة'], [/\bdamma\b/gi, 'ضَمَّة'], [/\bkasra\b/gi, 'كَسْرَة'],
  [/\bsoukoun\b/gi, 'سُكُون'], [/\bchaddah?\b/gi, 'شَدَّة'], [/\bwaw\b/gi, 'وَاو'],
  [/\balif\b/gi, 'أَلِف'], [/\bya\b/gi, 'يَاء'],
];
function enArabe(t) { NOMS.forEach(([re, ar]) => { t = t.replace(re, ar); }); return t; }
function cles(t) {
  const l = [t, t.replace(/([^\s])([!?;:…])/g, '$1 $2'), t.trim(), t + ' ', t.replace(/[.\s]+$/, '')];
  return l.filter((x, i) => l.indexOf(x) === i);
}
async function tts(texte, f) {
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: '[calm] ' + texte, model_id: 'eleven_v4', language_code: 'fr',
      voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
  });
  if (!r.ok) { console.log('ECHEC', r.status, (await r.text()).slice(0, 160)); return false; }
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); return true;
}
const dest = path.join(__dirname, 'captures', 'essai-ton-6-11');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  let urls = {};
  try { urls = (await (await fetch(SITE + '/api/audio')).json()).urls || {}; } catch (e) { console.log('Site injoignable :', e.message); }
  const lignes = [];
  for (let i = 0; i < PHRASES.length; i++) {
    const p = PHRASES[i], n = String(i + 1);
    const ligne = { p, actuelle: null, pose: null, arabe: null };
    // 1. la version actuelle, telle qu'elle est en ligne
    const k = cles(p).find((x) => urls[x]);
    if (k) {
      const f = path.join(dest, n + '-actuelle.mp3');
      if (!fs.existsSync(f)) { const r = await fetch(urls[k]); if (r.ok) fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
      if (fs.existsSync(f)) ligne.actuelle = n + '-actuelle.mp3';
    } else console.log('pas de version actuelle en ligne pour :', p);
    // 2. v4 posé, texte tel quel
    let f2 = path.join(dest, n + '-pose.mp3');
    if (fs.existsSync(f2) || await tts(p, f2)) ligne.pose = n + '-pose.mp3';
    // 3. v4 posé, noms en arabe (seulement s'il y en a)
    const ar = enArabe(p);
    if (ar !== p) {
      const f3 = path.join(dest, n + '-pose-arabe.mp3');
      if (fs.existsSync(f3) || await tts(ar, f3)) ligne.arabe = n + '-pose-arabe.mp3';
    }
    console.log('ok', n, p);
    lignes.push(ligne);
  }
  let h = '<!doctype html><meta charset="utf-8"><title>Voix 6-11</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:680px;margin:auto">'
    + '<h2>Voix des 6-11 ans : actuelle ou posée ?</h2>';
  lignes.forEach((l, i) => {
    h += '<div style="background:#fff;padding:12px 16px;border-radius:14px;margin:14px 0"><b>' + (i + 1) + '. « ' + l.p + ' »</b>';
    [['Actuelle (v4 chaleureux)', l.actuelle], ['v4 posé', l.pose], ['v4 posé, noms en arabe pour la voix', l.arabe]].forEach(([t, s]) => {
      if (s) h += '<p style="margin:8px 0 0">' + t + '<br><audio controls src="' + s + '"></audio></p>';
    });
    h += '</div>';
  });
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  console.log('\nTermine. La page s\'ouvre dans Chrome.');
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
