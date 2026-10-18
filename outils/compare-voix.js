/*
 * COMPARER DES VOIX sur quelques lettres — À NE PAS DÉPLOYER, rien en ligne.
 *
 *   node outils/compare-voix.js ID1 ID2 ID3 -- ب ع ق
 *
 * Pour chaque voix (identifiants ElevenLabs) et chaque son (nom de la lettre
 * + ses 10 variantes, outils/voix-lettres.json) :
 *   - « lu »        : la voix lit le texte arabe (eleven_v4, langue ar) ;
 *   - « ta voix → » : ton enregistrement du studio redit par cette voix
 *                     (Voice Changer, bruit de fond retiré).
 * Plus ta voix d'origine et le Narrateur. Une seule page :
 * outils/captures/compare-voix/compare.html
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const NARRATEUR = 'Wm3eSTpNFfFtDgCxf6AU';
const args = process.argv.slice(2), sep = args.indexOf('--');
const voix = [NARRATEUR].concat((sep < 0 ? args : args.slice(0, sep)).filter((a) => /^\w{15,}$/.test(a)));
const lettres = sep < 0 ? ['ب', 'ع', 'ق'] : args.slice(sep + 1);
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'voix-lettres.json'), 'utf8')).filter((L) => lettres.includes(L.ar));
const dest = path.join(__dirname, 'captures', 'compare-voix');
fs.mkdirSync(dest, { recursive: true });
const hex = (s) => Buffer.from(s).toString('hex');
const H = { 'xi-api-key': env.ELEVENLABS_API_KEY };
const VS = JSON.stringify({ stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true });

async function lu(v, texte, f) {
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + v + '?output_format=mp3_44100_128', {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, H),
    body: JSON.stringify({ text: texte, model_id: 'eleven_v4', language_code: 'ar', voice_settings: JSON.parse(VS) }) });
  if (!r.ok) throw new Error('lu ' + r.status + ' ' + (await r.text()).slice(0, 140));
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
}
async function change(v, brut, ext, f) {
  const fd = new FormData();
  fd.append('audio', new Blob([brut]), 'son.' + ext);
  fd.append('model_id', 'eleven_multilingual_sts_v2');
  fd.append('remove_background_noise', 'true');
  fd.append('voice_settings', VS);
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-speech/' + v + '?output_format=mp3_44100_128', { method: 'POST', headers: H, body: fd });
  if (!r.ok) throw new Error('change ' + r.status + ' ' + (await r.text()).slice(0, 140));
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
}

(async () => {
  const studio = (await (await fetch('https://iamlearningarabic.com/api/audio')).json()).urls || {};
  const noms = {};
  for (const v of voix) {
    try { const r = await fetch('https://api.elevenlabs.io/v1/voices/' + v, { headers: H }); noms[v] = r.ok ? (await r.json()).name : v; }
    catch (e) { noms[v] = v; }
  }
  const lignes = [];
  let echecs = 0;
  for (const L of LISTE) {
    const sons = [{ cle: L.ar, dire: L.nom, lat: L.nom }].concat(L.variantes.map((x) => ({ cle: x[0], dire: ' ' + x[0], lat: x[1] })));
    for (const s of sons) {
      const ligne = { s, studio: studio[s.cle] || '', res: {} };
      let brut = null, ext = 'webm';
      if (ligne.studio) {
        try { brut = Buffer.from(await (await fetch(ligne.studio)).arrayBuffer()); ext = (ligne.studio.split('?')[0].match(/\.(\w+)$/) || [, 'webm'])[1]; } catch (e) {}
      }
      for (const v of voix) {
        const fl = path.join(dest, v + '-lu-' + hex(s.cle) + '.mp3'), fc = path.join(dest, v + '-ch-' + hex(s.cle) + '.mp3');
        try { if (!fs.existsSync(fl)) await lu(v, s.dire, fl); } catch (e) { echecs++; console.log('ECHEC', noms[v], s.lat, e.message); }
        try { if (brut && !fs.existsSync(fc)) await change(v, brut, ext, fc); } catch (e) { echecs++; console.log('ECHEC', noms[v], s.lat, e.message); }
        ligne.res[v] = { lu: fs.existsSync(fl) ? path.basename(fl) : '', ch: fs.existsSync(fc) ? path.basename(fc) : '' };
      }
      console.log('ok', L.ar, s.lat);
      lignes.push(ligne);
    }
  }
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const btn = (cls, src, lib) => '<button class="' + cls + '" ' + (src ? 'onclick="j(\'' + esc(src) + '\')"' : 'disabled') + '>' + lib + '</button>';
  let html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comparer les voix</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@700&display=swap" rel="stylesheet"><style>'
    + 'body{margin:0;font-family:system-ui,sans-serif;background:#fdf8ee;color:#3a2600;padding:16px}h1{font-size:1.3rem;margin:0 0 4px}p{margin:0 0 14px;opacity:.75;font-size:.9rem}'
    + 'table{border-collapse:collapse;width:100%;background:#fff;border-radius:14px;overflow:hidden}th,td{border-bottom:1px solid #f0e2bd;padding:6px;text-align:center;vertical-align:middle}'
    + 'th{background:#fbefd0;font-size:.85rem}.a{font:700 2rem "Scheherazade New",serif;line-height:1.2}.lat{font-size:.72rem;opacity:.7}'
    + 'button{border:0;border-radius:99px;padding:5px 9px;margin:2px;font-weight:700;cursor:pointer;font-size:.75rem}'
    + '.m{background:#0ea5e9;color:#fff}.l{background:#e8a020;color:#fff}.c{background:#16a34a;color:#fff}button:disabled{opacity:.2;cursor:default}'
    + '</style></head><body><h1>Comparer les voix</h1><p>Bleu = ta voix (studio). Orange = la voix LIT le texte arabe. Vert = TA voix redite par cette voix.</p>'
    + '<table><tr><th>Son</th><th>Ta voix</th>' + voix.map((v) => '<th>' + esc(noms[v]) + (v === NARRATEUR ? ' (Narrateur)' : '') + '</th>').join('') + '</tr>';
  for (const x of lignes) {
    html += '<tr><td><div class="a">' + esc(x.s.cle) + '</div><div class="lat">' + esc(x.s.lat) + '</div></td><td>' + btn('m', x.studio, 'Ta voix') + '</td>'
      + voix.map((v) => '<td>' + btn('l', x.res[v].lu, 'Lu') + btn('c', x.res[v].ch, 'Ta voix →') + '</td>').join('') + '</tr>';
  }
  html += '</table><script>var A=new Audio();function j(u){A.pause();A.src=u;A.play();}</script></body></html>';
  fs.writeFileSync(path.join(dest, 'compare.html'), html);
  console.log('\nTermine,', echecs, 'echec(s). Rien n\'a ete mis en ligne.');
})();
