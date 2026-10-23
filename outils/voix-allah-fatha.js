/* v3.8.1 — textes 3 et 5 de voix-allah.json (fr) : le client entend « Alla »
   et « au nom d'illah ». Allah écrit اَللَّه (fatha sur le alif) dans ce que
   la voix lit. Hors basmala (اللَّهِ). À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const { pourLaVoix } = require('./arabe-pour-la-voix.js');
function h(t){var h1=0xdeadbeef,h2=0x41c6ce57,i,c;for(i=0;i<t.length;i++){c=t.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return ('0000000'+(h2>>>0).toString(16)).slice(-8)+('0000000'+(h1>>>0).toString(16)).slice(-8);}
const cle = (t) => ((t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) ? 'long|' + h(t) : t);
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const L = require('./voix-allah.json').filter((e) => e.langue === 'fr');
/* 24 octobre : la fatha n'a rien changé ; l'essai n° 5 (alif suscrit,
   اللّٰه) est celui que le client a retenu (le 2, « Allâh », aussi). */
const ALLAH = 'الل' + String.fromCharCode(0x651, 0x670) + 'ه';
const dest = path.join(__dirname, 'captures', 'voix-allah-alif'); fs.mkdirSync(dest, { recursive: true });
(async () => {
  for (const i of [2, 4]) {
    const e = L[i], k = cle(e.cle);
    let dire = (e.brut ? e.dire : pourLaVoix(e.dire)).replace(/\s+([:;!?])/g, '$1');
    // « Allah » seul (pas اللَّهِ de la basmala, suivi d'une kasra)
    dire = dire.replace(/ال?لَّه(?![ٍِ])|الله(?![ِ])/g, (m, off, s) => (s.slice(off - 9, off).includes('بِسْمِ') ? m : ALLAH));
    console.log('---', i + 1, dire.slice(0, 200));
    const f = path.join(dest, 'fr-' + (i + 1) + '.mp3');
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: '[calm] ' + dire, model_id: 'eleven_v4', language_code: 'fr',
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    const r2 = await fetch('https://iamlearningarabic.com/api/audio', { method: 'POST',
      headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }) });
    console.log(r2.ok ? 'en ligne' : 'ECHEC depot ' + r2.status, dire.length, 'car.');
  }
})();
