const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, verifyToken, rateLimit, getClientIp, logEvent } = require('./_security');

/**
 * Sert l'application de cours UNIQUEMENT aux comptes ayant payé.
 *
 * public/index.html ne contient plus que la page publique (vente, connexion,
 * inscription, paiement). L'application entière vit dans app/app.html, hors
 * du dossier servi en statique : elle ne peut être obtenue que par ici.
 *
 * Le jeton est signé (HMAC) et contient l'email et sa date d'expiration ;
 * on revérifie ensuite en base que le compte est bien payant, pour qu'un
 * jeton encore valide d'un compte désactivé ne donne plus accès.
 *
 * Une navigation ordinaire ne peut pas porter d'en-tête Authorization :
 * le jeton est lu dans le cookie arab_token, posé à la connexion.
 */

// app/app.html n'est jamais servi en statique : c'est tout l'intérêt.
function chemins(fichier) {
  return [
    path.join(process.cwd(), 'app', fichier),
    path.join(__dirname, '..', 'app', fichier),
  ];
}

/**
 * Le fichier est relu à chaque requête, volontairement.
 *
 * Il était auparavant gardé en mémoire dans l'instance (`_cacheHtml`). Sur
 * une plateforme sans serveur, une instance encore chaude d'un déploiement
 * PRÉCÉDENT continue de répondre un moment après la mise en ligne suivante :
 * elle resservait alors l'ancienne application, indéfiniment tant qu'elle
 * restait chaude. Une correction poussée pouvait donc n'arriver sur
 * l'appareil que bien plus tard, ou pas du tout — sans que rien ne le
 * signale. Une lecture de fichier par requête ne coûte rien à côté de ça.
 */
function lireFichier(fichier) {
  for (const p of chemins(fichier)) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch (e) { /* on essaie le suivant */ }
  }
  return null;
}

/**
 * Banc d'essai des gestes de lettres, réservé au compte du client.
 *
 * Il charge l'application réellement servie et rejoue ses animations côte à
 * côte : c'est le seul moyen de voir, SUR L'APPAREIL, ce que le moteur
 * dessine vraiment — sans quoi la vérification d'un geste repose sur une
 * capture d'écran et une description.
 */
const BANC_AUTORISE = ['abder.jah@hotmail.com'];

function jetonDeLaRequete(req) {
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.indexOf('Bearer ') === 0) return auth.slice(7);
  const cookie = (req.headers && req.headers.cookie) || '';
  const m = /(?:^|;\s*)arab_token=([^;]+)/.exec(cookie);
  if (m) return decodeURIComponent(m[1]);
  if (req.query && req.query.t) return String(req.query.t);
  return null;
}

// Une navigation attend une page, pas du JSON : on la renvoie vers la page
// publique, en gardant l'adresse demandée pour y revenir après connexion.
function estUneNavigation(req) {
  const accept = (req.headers && req.headers.accept) || '';
  return accept.indexOf('text/html') >= 0;
}

// L'adresse d'origine (/fille/lecon/...) est passée par la réécriture, car la
// fonction, elle, est appelée sur /api/app. Tout ce qui n'est pas un chemin
// simple est ignoré : on renverra vers la page de connexion sans destination.
function cheminDemande(req) {
  try {
    const s = (req.query && req.query.suite) || '';
    return /^\/[A-Za-z0-9/_-]*$/.test(s) ? s : null;
  } catch (e) { return null; }
}

function versPagePublique(req, res, suite) {
  const url = suite && suite !== '/'
    ? '/connexion?suite=' + encodeURIComponent(suite)
    : '/connexion';
  res.setHeader('Location', url);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(302).end();
}

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;

  const ip = getClientIp(req);
  const { limited } = rateLimit(ip, 'app', 60, 60 * 1000);
  if (limited) return res.status(429).send('Trop de requêtes.');

  const navigation = estUneNavigation(req);
  const suite = cheminDemande(req);

  let essai = false;
  const token = jetonDeLaRequete(req);
  if (!token) {
    logEvent('app_no_token', { ip });
    if (navigation) return versPagePublique(req, res, suite);
    return res.status(401).json({ error: 'Connexion requise.' });
  }

  // l'email est le premier segment du jeton signé
  const email = String(token).split(':')[0];
  if (!email || !verifyToken(token, email)) {
    logEvent('app_bad_token', { ip });
    if (navigation) return versPagePublique(req, res, suite);
    return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
  }

  // le jeton peut être valide alors que le compte ne l'est plus
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: user } = await supabase
      .from('users').select('email, paid').eq('email', email.toLowerCase()).single();
    if (!user) {
      logEvent('app_inconnu', { ip, email });
      if (navigation) return versPagePublique(req, res, null);
      return res.status(403).json({ error: 'Compte introuvable.' });
    }
    /* UN COMPTE GRATUIT entre, mais en ESSAI : l'application le saura par le
       drapeau pose plus bas et ne lui ouvrira que la premiere lecon. */
    essai = !user.paid;
  } catch (e) {
    console.error('[App] Vérification du compte impossible :', e.message);
    return res.status(500).json({ error: 'Vérification impossible.' });
  }

  // Le banc d'essai : même porte, même vérification, un seul compte.
  const veutLeBanc = !!(req.query && req.query.banc);
  /* UN COMPTE GRATUIT RECOIT UN AUTRE FICHIER. Pas le meme avec un verrou :
     un verrou ecrit dans le fichier qu'on donne au visiteur se retire en
     trois clics. `app-essai.html` est fabrique par `outils/allege.js` et ne
     CONTIENT PAS les lecons payantes — il n'y a rien a deverrouiller. */
  const fichier = (veutLeBanc && BANC_AUTORISE.indexOf(email.toLowerCase()) >= 0)
    ? 'banc.html' : (essai ? 'app-essai.html' : 'app.html');

  const html = lireFichier(fichier);
  if (!html) {
    console.error('[App] Fichier introuvable :', fichier);
    return res.status(500).json({ error: 'Application indisponible.' });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // jamais mis en cache par un intermédiaire : le contenu est réservé
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent('app_served', { ip, email, fichier, essai });
  return res.status(200).send(html);
};
