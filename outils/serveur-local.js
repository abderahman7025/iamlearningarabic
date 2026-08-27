/*
 * Serveur local de développement — À NE PAS DÉPLOYER.
 *
 * Vercel ne construit que `api/` et `public/` : ce fichier vit hors des deux,
 * il ne compte donc pas dans les douze fonctions autorisées et n'est jamais
 * mis en ligne.
 *
 * Pourquoi il existe : le banc d'essai (`app/banc.html`) charge l'application
 * par `fetch('/app?f=…')`. En production, cette adresse est protégée par
 * `api/app.js` et n'est ouverte qu'au compte du client — impossible d'y
 * regarder un geste soi-même. Ici, la même arborescence est servie sans
 * aucune vérification, sur la machine, et le banc fonctionne à l'identique.
 *
 *   node outils/serveur-local.js        → http://localhost:3456
 *   /banc                               → le banc d'essai des gestes
 *   /banc?tout=1                        → tout l'alphabet
 *   /fille/accueil, /garcon/accueil     → l'application
 *
 * L'application veut un jeton dans localStorage, sinon elle repart vers
 * /connexion : le serveur pose donc un petit script d'amorçage sur les pages
 * de l'application, qui invente un jeton local. Il n'ouvre rien — la
 * vérification réelle est côté serveur, et ce serveur-ci n'est pas en ligne.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3456);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};

/* Le compte est simulé côté navigateur : sans jeton, app.html s'en va tout
   de suite vers /connexion et on ne voit jamais l'application. */
const AMORCE = `<script>
try{
  if(!localStorage.getItem('arab_token')){
    localStorage.setItem('arab_token','local:0:essai');
    localStorage.setItem('arab_email','essai@local');
  }
}catch(e){}
/* Le service worker garderait en cache la version d'avant : en local on veut
   TOUJOURS le fichier qui vient d'être écrit. */
try{
  if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)
    navigator.serviceWorker.getRegistrations().then(function(l){
      l.forEach(function(r){r.unregister();});
    });
}catch(e){}
</script>`;

function envoie(res, code, type, corps) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(corps);
}

function pageApplication(res, fichier, amorcer) {
  const p = path.join(RACINE, 'app', fichier);
  if (!fs.existsSync(p)) return envoie(res, 404, 'text/plain; charset=utf-8', 'Introuvable : ' + fichier);
  let html = fs.readFileSync(p, 'utf8');
  /* Après <head> : le script doit tourner AVANT celui de l'application. */
  if (amorcer) html = html.replace(/<head([^>]*)>/i, '<head$1>' + AMORCE);
  envoie(res, 200, TYPES['.html'], html);
}

/* Dépôt d'images, pour REGARDER.
 *
 * Un canvas de la page sait se rendre en PNG ; encore faut-il pouvoir
 * ouvrir ce PNG. La page l'envoie ici en base64, le serveur l'écrit dans
 * `outils/captures/`, et on l'ouvre comme n'importe quelle image :
 *
 *   fetch('/capture?f=carte.png',{method:'POST',body:cv.toDataURL()})
 *
 * C'est ce qui permet de contrôler soi-même une animation ou une mise en
 * page, au lieu de demander au client de regarder à sa place. */
const CAPTURES = path.join(__dirname, 'captures');
function depose(req, res, nom) {
  let corps = '';
  req.on('data', (c) => { corps += c; });
  req.on('end', () => {
    try {
      const b64 = corps.replace(/^data:[^,]*,/, '');
      if (!fs.existsSync(CAPTURES)) fs.mkdirSync(CAPTURES, { recursive: true });
      const f = path.join(CAPTURES, path.basename(nom || 'capture.png'));
      fs.writeFileSync(f, Buffer.from(b64, 'base64'));
      console.log('capture : ' + f + ' (' + Math.round(b64.length / 1024) + ' Ko)');
      envoie(res, 200, 'text/plain', f);
    } catch (e) { envoie(res, 500, 'text/plain', String(e.message)); }
  });
}

const serveur = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const chemin = decodeURIComponent(url.pathname);

  if (chemin === '/capture' && req.method === 'POST')
    return depose(req, res, url.searchParams.get('f'));
  if (chemin === '/banc') return pageApplication(res, 'banc.html', true);
  /* La version d'essai, pour la verifier comme le fait un compte gratuit. */
  if (chemin === '/essai' || chemin.indexOf('/essai/') === 0)
    return pageApplication(res, 'app-essai.html', true);
  /* Le banc appelle /app?f=… ; l'application elle-même arrive par ses
     adresses de profil. Dans les deux cas c'est app/app.html. */
  if (chemin === '/app' || /^\/(fille|garcon|adulte|girl|boy|adult|interface|cours|admin)(\/|$)/.test(chemin))
    return pageApplication(res, 'app.html', true);

  let rel = chemin === '/' ? '/index.html' : chemin;
  const f = path.join(RACINE, 'public', rel);
  /* Un chemin qui remonte hors de public/ n'a rien à faire ici. */
  if (!f.startsWith(path.join(RACINE, 'public'))) return envoie(res, 403, 'text/plain', 'Refusé');
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    const t = TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': t, 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(f));
  }
  /* Les adresses de la page publique (/connexion, /inscription…) */
  const idx = path.join(RACINE, 'public', 'index.html');
  if (fs.existsSync(idx)) return envoie(res, 200, TYPES['.html'], fs.readFileSync(idx, 'utf8'));
  envoie(res, 404, 'text/plain; charset=utf-8', 'Introuvable');
});

serveur.listen(PORT, () => {
  console.log('Serveur local : http://localhost:' + PORT);
  console.log('  banc des gestes : http://localhost:' + PORT + '/banc');
  console.log('  application     : http://localhost:' + PORT + '/fille/accueil');
});
