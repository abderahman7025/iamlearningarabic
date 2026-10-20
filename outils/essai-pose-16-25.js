/*
 * ESSAI — phrases 16 et 25 de voix-6-11-noms.json en v4 POSÉ ([calm]), noms
 * en arabe, à comparer avec la version chaleureuse déjà générée.
 * Le client : « kasra avec le r pas roulé », « Hamza au lieu de hamza ».
 *   node outils/essai-pose-16-25.js     — ~65 caractères, rien en ligne.
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const liste = require('./voix-6-11-noms.json');
const NUMEROS = [16, 25];
const NOMS = [
  [/\bfat[hḥ]as?\b/gi, 'فَتْحَة'], [/\bdammas?\b/gi, 'ضَمَّة'], [/\bkasras?\b/gi, 'كَسْرَة'],
  [/\bsoukoune?s?\b/gi, 'سُكُون'], [/\bchaddah?s?\b/gi, 'شَدَّة'], [/\btanw[iî]ne?s?\b/gi, 'تَنْوِين'],
  [/\bw[aā]w\b/gi, 'وَاو'], [/\balif\b/gi, 'أَلِف'], [/\by[aā]\b/gi, 'يَاء'], [/\bhamzah?\b/gi, 'هَمْزَة'],
];
const enArabe = (t) => { NOMS.forEach(([re, ar]) => { t = t.replace(re, ar); }); return t; };
function cle(t) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  if (!(t.length > 180 || Buffer.byteLength(t, 'utf8') > 360)) return t;
  for (i = 0; i < t.length; i++) { c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'long|' + ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
}
const chaud = path.join(__dirname, 'captures', 'voix-6-11-pose');
const dest = path.join(chaud, 'essai-pose');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  let h = '<!doctype html><meta charset="utf-8"><title>Posé ou chaleureux</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:680px;margin:auto"><h2>16 et 25 : chaleureux puis posé</h2>';
  for (const n of NUMEROS) {
    const t = liste[n - 1];
    const nom = Buffer.from(cle(t)).toString('hex').slice(0, 80) + '.mp3';
    const f = path.join(dest, n + '-pose.mp3');
    if (!fs.existsSync(f)) {
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
        method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: '[calm] ' + enArabe(t), model_id: 'eleven_v4', language_code: 'fr',
          voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
      });
      if (!r.ok) { console.log('ECHEC', n, r.status, (await r.text()).slice(0, 160)); continue; }
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    }
    console.log('ok', n, t);
    h += '<div style="background:#fff;padding:12px 16px;border-radius:14px;margin:14px 0"><b>' + n + '. ' + t + '</b>'
      + '<p>chaleureux<br><audio controls src="../' + nom + '"></audio></p>'
      + '<p>posé<br><audio controls src="' + n + '-pose.mp3"></audio></p></div>';
  }
  h += '<button id="go" style="font-size:1.1rem;padding:12px 18px;border-radius:12px;border:0;background:#1e88e5;color:#fff">▶ Tout écouter</button>'
    + '<script>var L=[].slice.call(document.querySelectorAll("audio")),i=0;function joue(){if(i>=L.length)return;var a=L[i];a.closest("div").style.outline="4px solid #1e88e5";'
    + 'a.onended=function(){a.closest("div").style.outline="";i++;setTimeout(joue,700);};a.play().catch(function(){});}'
    + 'document.getElementById("go").onclick=function(){i=0;joue();};setTimeout(joue,600);<\/script>';
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
