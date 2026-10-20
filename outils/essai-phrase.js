/*
 * ESSAI — une phrase, en v4 posé ET en v4 chaleureux, noms en arabe.
 *   node outils/essai-phrase.js "la kasra est prolongé par le"
 *   node outils/essai-phrase.js --brut "…"   (texte envoyé tel quel)
 * ~2 × la longueur de la phrase en caractères. Rien en ligne.
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const brut = process.argv.includes('--brut');
const t = process.argv.slice(2).filter((x) => x !== '--brut').join(' ').trim();
if (!t) { console.log('Il manque la phrase.'); process.exit(1); }
const NOMS = [
  [/\bfat[hḥ]as?\b/gi, 'فَتْحَة'], [/\bdammas?\b/gi, 'ضَمَّة'], [/\bkasras?\b/gi, 'كَسْرَة'],
  [/\bsoukoune?s?\b/gi, 'سُكُون'], [/\bchaddah?s?\b/gi, 'شَدَّة'], [/\btanw[iî]ne?s?\b/gi, 'تَنْوِين'],
  [/\bw[aā]w\b/gi, 'وَاو'], [/\balif\b/gi, 'أَلِف'], [/\by[aā]\b/gi, 'يَاء'], [/\bhamzah?\b/gi, 'هَمْزَة'],
];
let dit = t; if (!brut) NOMS.forEach(([re, ar]) => { dit = dit.replace(re, ar); });
const dest = path.join(__dirname, 'captures', 'essai-phrase');
fs.mkdirSync(dest, { recursive: true });
const base = Date.now().toString(36);
(async () => {
  let h = '<!doctype html><meta charset="utf-8"><title>Essai</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:680px;margin:auto">'
    + '<h2>« ' + t + ' »</h2><p style="color:#567">envoyé à la voix : ' + dit + '</p>';
  for (const [nom, balise] of [['posé', '[calm]'], ['chaleureux', '[warmly]']]) {
    const f = base + '-' + (balise === '[calm]' ? 'pose' : 'chaud') + '.mp3';
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: balise + ' ' + dit, model_id: 'eleven_v4', language_code: 'fr',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
    });
    if (!r.ok) { console.log('ECHEC', nom, r.status, (await r.text()).slice(0, 160)); continue; }
    fs.writeFileSync(path.join(dest, f), Buffer.from(await r.arrayBuffer()));
    console.log('ok', nom);
    h += '<div style="background:#fff;padding:12px 16px;border-radius:14px;margin:14px 0"><b>' + nom + '</b><br><audio controls src="' + f + '"></audio></div>';
  }
  h += '<button id="go" style="font-size:1.1rem;padding:12px 18px;border-radius:12px;border:0;background:#1e88e5;color:#fff">▶ Tout écouter</button>'
    + '<script>var L=[].slice.call(document.querySelectorAll("audio")),i=0;function joue(){if(i>=L.length)return;var a=L[i];a.closest("div").style.outline="4px solid #1e88e5";'
    + 'a.onended=function(){a.closest("div").style.outline="";i++;setTimeout(joue,700);};a.play().catch(function(){});}'
    + 'document.getElementById("go").onclick=function(){i=0;joue();};setTimeout(joue,600);<\/script>';
  const page = path.join(dest, base + '.html');
  fs.writeFileSync(page, h);
  require('child_process').exec('start chrome "' + page + '"');
})();
