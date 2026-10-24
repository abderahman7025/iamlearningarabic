/*
 * NETTOYER ET MONTER LE VOLUME des sons du studio — À NE PAS DÉPLOYER.
 * Gratuit : tout se fait sur l'ordinateur avec ffmpeg (paquet ffmpeg-static,
 * installé par le .bat). Aucune IA, aucun crédit : c'est TA voix, nettoyée.
 *
 *   node outils/nettoie-studio.js            → traite les 373 sons, rien en ligne
 *   node outils/nettoie-studio.js --depot    → et les met en ligne (après accord)
 *
 * Pour chaque son arabe du studio (outils/sons-studio.json, tiré de
 * ADMIN_SOUNDS) :
 *   1. on retire les graves sourds (< 70 Hz : souffle, chocs du micro) et les
 *      aigus inutiles (> 11 kHz), puis le BRUIT DE FOND (afftdn, débruitage
 *      par spectre) ;
 *   2. on mesure le point le plus fort, et l'on monte le tout jusqu'à -1 dB
 *      (le maximum sans saturer), un limiteur en sécurité.
 * Avant / après : outils/captures/studio-propre/, page ecoute-propre.html.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
let FF;
try { FF = require('ffmpeg-static'); } catch (e) { console.log('ffmpeg-static manquant : npm i --no-save ffmpeg-static'); process.exit(1); }

const env = {};
try { fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); }); } catch (e) {}
const depot = process.argv.includes('--depot');
let LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'sons-studio.json'), 'utf8'));
/* --refaire=رٌ,ش,… : seulement ces sons, RÉENREGISTRÉS au studio — on jette
   les anciennes copies et l'on reprend la nouvelle version en ligne. */
const _r = (process.argv.find((a) => a.startsWith('--refaire=')) || '').slice(10);
const REFAIRE = _r ? _r.split(',').map((x) => x.trim()).filter(Boolean) : null;
const dest = path.join(__dirname, 'captures', 'studio-propre');
/* v2 (client : « volume trop bas ») : compression douce puis gain jusqu'à une
   SONIE cible (-10 LUFS par défaut, --cible=-8 pour plus fort), limiteur
   à -1 dB. Dossier « apres-fort » : les anciens résultats restent à côté. */
const _c = (process.argv.find((a) => a.startsWith('--cible=')) || '').slice(8);
const CIBLE = _c ? parseFloat(_c) : -10;
const avant = path.join(dest, 'avant'), apres = path.join(dest, 'apres-fort');
[avant, apres].forEach((d) => fs.mkdirSync(d, { recursive: true }));
const hex = (s) => Buffer.from(s).toString('hex');
if (REFAIRE) {
  /* les sons absents de sons-studio.json (les sons FAUTIFS « خè »…) sont
     pris quand même, sous leur propre clé */
  const vus = LISTE.filter((s) => REFAIRE.includes(s.ar) || REFAIRE.includes(hex(s.ar)));
  REFAIRE.forEach((x) => {
    const ar = /^[0-9a-f]+$/.test(x) ? Buffer.from(x, 'hex').toString('utf8') : x;
    if (!vus.some((s) => s.ar === ar)) vus.push({ ar, label: ar });
  });
  LISTE = vus;
}
function ff(args) { return execFileSync(FF, ['-hide_banner', '-loglevel', 'info', '-y'].concat(args), { stdio: ['ignore', 'pipe', 'pipe'] }); }
function sonie(fichier) {
  const r = require('child_process').spawnSync(FF, ['-hide_banner', '-i', fichier, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const t = (r.stderr || '').split('Summary:').pop();
  const m = /I:\s*(-?[\d.]+) LUFS/.exec(t);
  return m ? parseFloat(m[1]) : null;
}
function picVolume(fichier) {
  const r = require('child_process').spawnSync(FF, ['-hide_banner', '-i', fichier, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /max_volume:\s*(-?[\d.]+) dB/.exec(r.stderr || '');
  return m ? parseFloat(m[1]) : null;
}

(async () => {
  const urls = (await (await fetch('https://iamlearningarabic.com/api/audio', require('./_admin.js'))).json()).urls || {};
  let ok = 0, absents = 0, echecs = 0;
  const lignes = [];
  for (const s of LISTE) {
    const url = urls[s.ar];
    if (!url) { absents++; continue; }
    const h = hex(s.ar).slice(0, 100);
    const ext = (url.split('?')[0].match(/\.(\w+)$/) || [, 'webm'])[1];
    const fa = path.join(avant, h + '.' + ext), tmp = path.join(apres, h + '.tmp.wav'), fp = path.join(apres, h + '.mp3');
    try {
      if (REFAIRE) [avant, apres].forEach((d) => fs.readdirSync(d)
        .filter((f) => f.startsWith(h + '.')).forEach((f) => fs.unlinkSync(path.join(d, f))));
      if (!fs.existsSync(fa)) fs.writeFileSync(fa, Buffer.from(await (await fetch(url)).arrayBuffer()));
      if (!fs.existsSync(fp)) {
        ff(['-i', fa, '-af', 'highpass=f=70,lowpass=f=11000,afftdn=nr=14:nf=-38,acompressor=threshold=0.1:ratio=4:attack=10:release=120:knee=4', '-ac', '1', '-ar', '44100', tmp]);
        const I = sonie(tmp);
        /* un enregistrement presque VIDE (ءْ, ◌ْ… mesurés à -67 / -77 dB) : le
           monter de 30 dB ne fait sortir que du souffle — le « gros bruit
           bizarre ». On le laisse tel quel et on le signale. */
        if (I === null || I < -50) { console.log('VIDE (a reenregistrer) :', s.ar); }
        const gain = (I === null || I < -50) ? 0 : Math.max(0, Math.min(30, CIBLE - I));
        ff(['-i', tmp, '-af', 'volume=' + gain.toFixed(1) + 'dB,alimiter=limit=0.89:attack=5:release=60:asc=1:level=false', '-b:a', '128k', fp]);
        fs.unlinkSync(tmp);
        console.log('ok', s.label, '(+' + gain.toFixed(1) + ' dB)');
      }
      /* un original presque vide n'est jamais mis en ligne nettoyé : il
         faut le réenregistrer */
      const _sa = depot ? sonie(fa) : 0;
      const vide = depot && (_sa === null || _sa < -50);
      if (vide) console.log('NON MIS EN LIGNE (vide, a reenregistrer) :', s.ar);
      if (depot && !vide) {
        const r = await fetch('https://iamlearningarabic.com/api/audio', { method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: s.ar, audioBase64: fs.readFileSync(fp).toString('base64') }) });
        if (!r.ok) throw new Error('depot ' + r.status);
        console.log('en ligne :', s.label);
      }
      ok++;
      lignes.push({ s, a: 'avant/' + path.basename(fa), p: 'apres-fort/' + path.basename(fp) });
    } catch (e) { echecs++; console.log('ECHEC', s.label, String(e.message).slice(0, 160)); try { fs.unlinkSync(tmp); } catch (x) {} }
  }
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ta voix nettoyée</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@700&display=swap" rel="stylesheet"><style>'
    + 'body{margin:0;font-family:system-ui,sans-serif;background:#fdf8ee;color:#3a2600;padding:16px}h1{font-size:1.3rem;margin:0 0 4px}p{margin:0 0 14px;opacity:.75;font-size:.9rem}'
    + '.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.s{background:#fff;border:1px solid #f0e2bd;border-radius:12px;padding:6px 8px;text-align:center}'
    + '.a{font:700 1.9rem "Scheherazade New",serif;line-height:1.3}.lat{font-size:.72rem;opacity:.7;min-height:1.2em}'
    + 'button{border:0;border-radius:99px;padding:5px 10px;margin:3px 2px 0;font-weight:700;cursor:pointer;font-size:.78rem}.av{background:#94a3b8;color:#fff}.ap{background:#16a34a;color:#fff}'
    + '</style></head><body><h1>Ta voix : avant / après nettoyage</h1><p>Gris = avant (en ligne aujourd\'hui). Vert = après : bruit de fond retiré, volume nettement monté. Rien n\'est encore en ligne.</p><div class="g">';
  for (const x of lignes) html += '<div class="s"><div class="a">' + esc(x.s.ar) + '</div><div class="lat">' + esc(x.s.label) + '</div>'
    + '<button class="av" onclick="j(\'' + esc(x.a) + '\')">Avant</button><button class="ap" onclick="j(\'' + esc(x.p) + '\')">Après</button></div>';
  html += '</div><script>var A=new Audio();function j(u){A.pause();A.src=u;A.play();}</script></body></html>';
  if (!REFAIRE) fs.writeFileSync(path.join(dest, 'ecoute-propre.html'), html);
  console.log('\nTermine :', ok, 'sons,', echecs, 'echec(s),', absents, 'absents du site.', depot ? 'Mis en ligne.' : 'Rien n\'a ete mis en ligne.');
})();
