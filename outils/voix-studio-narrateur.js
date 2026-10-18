/*
 * TES SONS DU STUDIO, PASSÉS DANS LA VOIX DU NARRATEUR — À NE PAS DÉPLOYER.
 *
 *   node outils/voix-studio-narrateur.js ب        → essai sur une lettre
 *   node outils/voix-studio-narrateur.js tout     → les 30 lettres
 *   (rien n'est mis en ligne ; --depot pour le faire, après accord du client)
 *
 * Le client (18 octobre) : la voix de synthèse prononce mal les petites
 * syllabes (بَ, بْ…) ; il veut garder SA prononciation, mais avec un son
 * propre et la voix du Narrateur. C'est le « Voice Changer » d'ElevenLabs
 * (speech-to-speech) : on lui donne l'enregistrement, il le redit avec la
 * voix choisie, en gardant le rythme et l'intonation. Le bruit de fond est
 * retiré au passage (remove_background_noise).
 * Coût : 1 000 caractères par minute d'audio traité.
 *
 * Les sons du studio sont lus EN LIGNE (GET /api/audio), clé = la lettre ou
 * la syllabe (outils/voix-lettres.json). Résultats :
 * outils/captures/studio-narrateur/, et une page d'écoute ecoute-studio.html
 * (ta voix / ta voix en Narrateur / Narrateur seul si l'essai existe).
 */
const fs = require('fs');
const path = require('path');

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU'; // Narrateur
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'voix-lettres.json'), 'utf8'));
const depot = process.argv.includes('--depot');
const demandees = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const toutes = demandees.includes('tout') || !demandees.length;
const dest = path.join(__dirname, 'captures', 'studio-narrateur');
const tts = path.join(__dirname, 'captures', 'voix-lettres');
const hex = (s) => Buffer.from(s).toString('hex');

(async () => {
  const studio = (await (await fetch('https://iamlearningarabic.com/api/audio')).json()).urls || {};
  fs.mkdirSync(dest, { recursive: true });
  let ok = 0, echecs = 0, absents = 0, secondes = 0;
  const lignes = [];
  for (const L of LISTE) {
    const sons = [{ cle: L.ar, lat: L.nom, nom: '00-' + L.ar + '-nom' }]
      .concat(L.variantes.map((v, i) => ({ cle: v[0], lat: v[1], nom: String(i + 1).padStart(2, '0') + '-' + v[1] })));
    const choisie = toutes || demandees.includes(L.ar);
    const bloc = { L, sons: [] };
    for (const s of sons) {
      const f = path.join(dest, hex(s.cle) + '.mp3');
      const url = studio[s.cle] || '';
      if (choisie && url && (!fs.existsSync(f) || fs.statSync(f).size < 500)) {
        try {
          const brut = Buffer.from(await (await fetch(url)).arrayBuffer());
          const ext = (url.split('?')[0].match(/\.(\w+)$/) || [, 'webm'])[1];
          const fd = new FormData();
          fd.append('audio', new Blob([brut]), 'son.' + ext);
          fd.append('model_id', 'eleven_multilingual_sts_v2');
          fd.append('remove_background_noise', 'true');
          fd.append('voice_settings', JSON.stringify({ stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true }));
          const r = await fetch('https://api.elevenlabs.io/v1/speech-to-speech/' + VOIX + '?output_format=mp3_44100_128',
            { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY }, body: fd });
          if (!r.ok) throw new Error('voice changer ' + r.status + ' ' + (await r.text()).slice(0, 160));
          const out = Buffer.from(await r.arrayBuffer());
          fs.writeFileSync(f, out);
          secondes += out.length / 16000;   /* mp3 128 kb/s ≈ 16 Ko par seconde */
          ok++; console.log('ok', L.ar, s.lat);
        } catch (e) { echecs++; console.log('ECHEC', L.ar, s.lat, String(e.message).slice(0, 200)); }
      } else if (choisie && !url) { absents++; console.log('pas de son du studio pour', s.cle); }
      if (depot && choisie && fs.existsSync(f)) {
        const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
          method: 'POST', headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: s.cle, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        console.log(r2.ok ? 'en ligne' : 'ECHEC depot', s.cle);
      }
      /* l'essai Narrateur seul (voix-lettres.js), s'il existe */
      const dT = path.join(tts, L.lat.replace(/[^\w]/g, '_') + '-' + hex(L.ar), s.nom.replace(/[\\/:*?"<>|]/g, '_') + '.mp3');
      bloc.sons.push({ s, url, conv: fs.existsSync(f) ? path.basename(f) : '', tts: fs.existsSync(dT) ? path.relative(dest, dT).split(path.sep).map(encodeURIComponent).join('/') : '' });
    }
    lignes.push(bloc);
  }
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Ta voix en Narrateur</title><link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@700&display=swap" rel="stylesheet"><style>'
    + 'body{margin:0;font-family:system-ui,sans-serif;background:#fdf8ee;color:#3a2600;padding:16px}h1{font-size:1.3rem;margin:4px 0}p{margin:0 0 16px;opacity:.75;font-size:.9rem}'
    + '.l{background:#fff;border:1px solid #ecd9a8;border-radius:16px;padding:12px;margin-bottom:12px}.t{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}.t b{font:700 2.2rem "Scheherazade New",serif}'
    + '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.s{border:1px solid #f0e2bd;border-radius:12px;padding:6px 8px;text-align:center}'
    + '.a{font:700 1.9rem "Scheherazade New",serif;line-height:1.3}.lat{font-size:.75rem;opacity:.7}'
    + 'button{display:block;width:100%;border:0;border-radius:99px;padding:5px 8px;margin:4px 0 0;font-weight:700;cursor:pointer;font-size:.75rem}'
    + '.m{background:#0ea5e9;color:#fff}.c{background:#16a34a;color:#fff}.n{background:#e8a020;color:#fff}button:disabled{opacity:.25;cursor:default}'
    + '</style></head><body><h1>Ta voix, transformée en Narrateur</h1>'
    + '<p>Bleu = ta voix (studio). Vert = ta voix transformée en Narrateur (son nettoyé). Orange = Narrateur tout seul (synthèse), si l\'essai a été fait.</p>';
  for (const b of lignes) {
    html += '<div class="l"><div class="t"><b>' + esc(b.L.ar) + '</b><span>' + esc(b.L.nom) + '</span></div><div class="g">';
    for (const x of b.sons) {
      const btn = (cls, src, lib) => '<button class="' + cls + '" ' + (src ? 'onclick="j(\'' + esc(src) + '\')"' : 'disabled') + '>' + lib + '</button>';
      html += '<div class="s"><div class="a">' + esc(x.s.cle) + '</div><div class="lat">' + esc(x.s.lat) + '</div>'
        + btn('m', x.url, 'Ma voix') + btn('c', x.conv, 'Ma voix → Narrateur') + btn('n', x.tts, 'Narrateur seul') + '</div>';
    }
    html += '</div></div>';
  }
  html += '<script>var A=new Audio();function j(u){A.pause();A.src=u;A.play();}</script></body></html>';
  fs.writeFileSync(path.join(dest, 'ecoute-studio.html'), html);
  console.log('\nTermine :', ok, 'transformes,', echecs, 'echec(s),', absents, 'sans son du studio, environ',
    Math.round(secondes), 's d\'audio (~' + Math.round(secondes / 60 * 1000) + ' credits).');
  console.log(depot ? 'Mis en ligne.' : 'Rien n\'a ete mis en ligne.');
})();
