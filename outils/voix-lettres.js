/*
 * Les LETTRES et leurs VARIANTES dites par le Narrateur — À NE PAS DÉPLOYER.
 *
 *   node outils/voix-lettres.js ب ع ق        → essai sur ces lettres, fichiers
 *                                              seulement (rien en ligne)
 *   node outils/voix-lettres.js tout          → les 30 lettres, fichiers seulement
 *   node outils/voix-lettres.js tout --depot  → et mise en ligne
 *
 * Liste : outils/voix-lettres.json (nom de la lettre + ses variantes, celles
 * des cours : بَ بَا بً بِ بِي بٍ بُ بُو بٌ بْ). Le nom est dit pour la lettre
 * seule (ETAT : l'IA dit « L » devant une lettre isolée), chaque variante
 * telle qu'écrite, PRÉCÉDÉE D'UN ESPACE (idée du client : sur le site, le
 * Narrateur dit bien « lām » quand la lettre suit un espace dans la phrase).
 * Narrateur, eleven_v4, langue « ar ».
 *
 * ATTENTION — LE DÉPÔT REMPLACE LES SONS DU STUDIO : la clé d'une variante
 * (« بَ ») est celle de l'enregistrement fait par le client avec SA voix.
 * N'utiliser --depot qu'avec son accord explicite, après écoute de l'essai.
 * Les fichiers d'essai : outils/captures/voix-lettres/<lettre>/.
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
const dest = path.join(__dirname, 'captures', 'voix-lettres');

(async () => {
  let ok = 0, echecs = 0, car = 0;
  for (const L of LISTE) {
    if (!toutes && !demandees.includes(L.ar)) continue;
    const dossier = path.join(dest, L.lat.replace(/[^\w]/g, '_') + '-' + Buffer.from(L.ar).toString('hex'));
    fs.mkdirSync(dossier, { recursive: true });
    const sons = [{ cle: L.ar, dire: L.nom, nom: '00-' + L.ar + '-nom' }]
      .concat(L.variantes.map((v, i) => ({ cle: v[0], dire: ' ' + v[0], nom: String(i + 1).padStart(2, '0') + '-' + v[1] })));
    for (const s of sons) {
      const f = path.join(dossier, s.nom.replace(/[\\/:*?"<>|]/g, '_') + '.mp3');
      try {
        if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
          const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
            method: 'POST',
            headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({ text: s.dire, model_id: 'eleven_v4', language_code: 'ar',
              voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
          });
          if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
          fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
          car += s.dire.length;
        }
        if (depot) {
          const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ar: s.cle, audioBase64: fs.readFileSync(f).toString('base64') }),
          });
          if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
        }
        ok++; console.log('ok', s.nom);
      } catch (e) { echecs++; console.log('ECHEC', s.nom, String(e.message).slice(0, 200)); }
    }
  }
  /* LA PAGE D'ÉCOUTE : toutes les lettres sur une seule page, la voix du
     Narrateur (fichiers d'essai) à côté de la voix du studio (en ligne). */
  let studio = {};
  try { studio = (await (await fetch('https://iamlearningarabic.com/api/audio')).json()).urls || {}; } catch (e) {}
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Lettres — Narrateur ou studio</title><style>'
    + 'body{margin:0;font-family:system-ui,sans-serif;background:#fdf8ee;color:#3a2600;padding:16px}'
    + 'h1{font-size:1.3rem;margin:4px 0 4px}p{margin:0 0 16px;opacity:.75;font-size:.9rem}'
    + '.l{background:#fff;border:1px solid #ecd9a8;border-radius:16px;padding:12px;margin-bottom:12px}'
    + '.t{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}.t b{font:700 2.2rem "Scheherazade New",serif}'
    + '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}'
    + '.s{border:1px solid #f0e2bd;border-radius:12px;padding:6px 8px;text-align:center}'
    + '.a{font:700 1.9rem "Scheherazade New",serif;line-height:1.3}.lat{font-size:.75rem;opacity:.7}'
    + 'button{border:0;border-radius:99px;padding:5px 9px;margin:3px 2px 0;font-weight:700;cursor:pointer;font-size:.78rem}'
    + '.n{background:#e8a020;color:#fff}.m{background:#0ea5e9;color:#fff}button:disabled{opacity:.3;cursor:default}'
    + '</style><link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@700&display=swap" rel="stylesheet"></head><body>'
    + '<h1>Les lettres : Narrateur ou ta voix ?</h1><p>Orange = Narrateur (essai, pas en ligne). Bleu = ta voix du studio (en ligne).</p>';
  for (const L of LISTE) {
    const dossier = path.join(dest, L.lat.replace(/[^\w]/g, '_') + '-' + Buffer.from(L.ar).toString('hex'));
    const sons = [{ cle: L.ar, a: L.ar, lat: L.nom, nom: '00-' + L.ar + '-nom' }]
      .concat(L.variantes.map((v, i) => ({ cle: v[0], a: v[0], lat: v[1], nom: String(i + 1).padStart(2, '0') + '-' + v[1] })));
    html += '<div class="l"><div class="t"><b>' + esc(L.ar) + '</b><span>' + esc(L.nom) + '</span></div><div class="g">';
    for (const s of sons) {
      const f = path.join(dossier, s.nom.replace(/[\\/:*?"<>|]/g, '_') + '.mp3');
      const rel = fs.existsSync(f) ? path.relative(dest, f).split(path.sep).map(encodeURIComponent).join('/') : '';
      const st = studio[s.cle] || '';
      html += '<div class="s"><div class="a">' + esc(s.a) + '</div><div class="lat">' + esc(s.lat) + '</div>'
        + '<button class="n" ' + (rel ? 'onclick="j(\'' + rel + '\')"' : 'disabled') + '>Narrateur</button>'
        + '<button class="m" ' + (st ? 'onclick="j(\'' + esc(st) + '\')"' : 'disabled') + '>Ma voix</button></div>';
    }
    html += '</div></div>';
  }
  html += '<script>var A=new Audio();function j(u){A.pause();A.src=u;A.play();}</script></body></html>';
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'ecoute.html'), html);
  console.log('\nTermine :', ok, 'ok,', echecs, 'echec(s),', car, 'caracteres generes.');
  console.log(depot ? 'Mis en ligne.' : 'Rien n\'a ete mis en ligne : ecoute les fichiers dans outils\\captures\\voix-lettres');
})();
