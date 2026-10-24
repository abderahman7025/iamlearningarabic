/* 24 octobre 2026 — leçon des prolongations, langues autres que le français :
   chaque phrase est dite EN ENTIER par le Narrateur v4, SANS balise de ton
   (le ton validé par le client sur « Example: » et « Examples: »).
   - Les mots seuls (Exemple, alors que, Illustration) sont dits avec la phrase
     d'après puis coupés juste après le mot, sinon la voix les lit en français.
   - إِيَاكَ est écrit « إِ يَا كَ » pour la voix ; وَاِ est écrit « وَإِ ».
   node outils/voix-langues-prolong.js en            → génère (page Bureau)
   node outils/voix-langues-prolong.js en --compter  → compte les caractères
   À NE PAS DÉPLOYER. */
const fs = require('fs'), path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); });
const { T } = require('./textes-prolong.js');
const LOVE = 'لَأُحِبُّك', NOLOVE = 'لَا أُحِبُّك';
const RANGS = [['وَاِ', 'وَا', 'وَإِ'], ['يُوَ', 'يُو'], ['وِيُ', 'وِي'], ['إِيَاكَ', 'إِيَّاكَ', 'إِ يَا كَ'], ['أَوَاهْ', 'أَوَّاهْ']];
function phrases(lg) {
  const x = T[lg], d = (r) => (r[2] || r[0]) + ' ' + x.prolong_diff + ' ' + r[1];
  const P = [
    { t: x.prolong_exemple, dire: x.prolong_exemple + ' ' + x.prolong_love + ' ' + LOVE, mot: x.prolong_exemple },
    { t: x.prolong_love + ' ' + LOVE },
    { t: x.prolong_alors, dire: x.prolong_alors + ' ' + x.prolong_nolove + ' ' + NOLOVE, mot: x.prolong_alors },
    { t: x.prolong_nolove + ' ' + NOLOVE },
    { t: x.prolong_illus, dire: x.prolong_illus + ' ' + d(RANGS[0]), mot: x.prolong_illus },
  ];
  /* وِيُ : sans balise de ton, la voix dit « viyu » ; avec [calm] elle dit
     bien « wiyu » (validé en anglais). */
  RANGS.forEach((r) => P.push({ t: r[0] + ' ' + x.prolong_diff + ' ' + r[1], dire: (r[0] === 'وِيُ' ? '[calm] ' : '') + d(r) }));
  P.push({ t: x.not_essential });
  return P;
}
/* Coupe un MP3 (MPEG-1 couche III) à la trame près, sans outil externe. */
function couper(buf, sec) {
  const BR = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320], SR = [44100,48000,32000];
  let i = 0; if (buf.slice(0, 3).toString() === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  let t = 0;
  while (i + 4 < buf.length && t < sec) {
    if (buf[i] !== 0xFF || (buf[i + 1] & 0xE0) !== 0xE0) { i++; continue; }
    const br = BR[buf[i + 2] >> 4] * 1000, sr = SR[(buf[i + 2] >> 2) & 3], pad = (buf[i + 2] >> 1) & 1;
    if (!br || !sr) { i++; continue; }
    i += Math.floor(144 * br / sr) + pad; t += 1152 / sr;
  }
  return buf.slice(0, i);
}
module.exports = { phrases };
const lg = process.argv[2];
if (require.main === module) (async () => {
  const P = phrases(lg);
  const dest = path.join(__dirname, 'captures', 'voix-langues-prolong', lg); fs.mkdirSync(dest, { recursive: true });
  if (process.argv.includes('--compter')) { console.log(lg, P.reduce((s, p) => s + (p.dire || p.t).length, 0)); return; }
  let car = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], f = path.join(dest, (i + 1) + '.mp3');
    if (fs.existsSync(f) && fs.statSync(f).size > 500) continue;
    const dire = p.dire || p.t;
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/Wm3eSTpNFfFtDgCxf6AU/with-timestamps?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: dire, model_id: 'eleven_v4', language_code: lg,
        voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }) });
    if (!r.ok) { console.log('ECHEC', lg, i + 1, r.status, (await r.text()).slice(0, 200)); continue; }
    const j = await r.json(); car += dire.length;
    let audio = Buffer.from(j.audio_base64, 'base64');
    if (p.mot) {
      fs.writeFileSync(path.join(dest, (i + 1) + '-entier.mp3'), audio);
      const A = j.alignment, fin = A.character_end_times_seconds[p.mot.length - 1];
      let k = p.mot.length; while (k < A.characters.length && /\s/.test(A.characters[k])) k++;
      const suite = A.character_start_times_seconds[k];
      audio = couper(audio, Math.min(fin + 0.25, (fin + suite) / 2 + 0.05));
    }
    fs.writeFileSync(f, audio);
    console.log('ok', lg, i + 1);
  }
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prolongations - ' + lg + '</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:820px}h1{font-size:1.3rem}.c{background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 4px 14px rgba(0,0,0,.08)}.t{font-size:1.1rem;margin-bottom:8px}.t span{font-family:Amiri,serif;color:#b45309;font-size:1.3em}audio{width:100%}</style></head><body><h1>Leçon des prolongations — ' + lg + '</h1><p>Narrateur v4, sans balise de ton. Rien n\'est en ligne. Dis-moi les numéros à refaire.</p>';
  P.forEach((p, i) => { const f = path.join(dest, (i + 1) + '.mp3'); if (!fs.existsSync(f)) return; H += '<div class="c"><div class="t"><b>' + (i + 1) + '.</b> ' + esc(p.t).replace(/([\u0600-\u06FF]+)/g, '<span>$1</span>') + '</div><audio controls preload="auto" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio></div>'; });
  fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/Prolongations - ' + lg + '.html', H + '</body></html>', 'utf8');
  console.log('caracteres', car);
})();
