const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, verifyToken, rateLimit, getClientIp, logEvent } = require('./_security');

/**
 * Sert l'application de cours UNIQUEMENT aux comptes ayant payé.
 *
 * Aujourd'hui le fichier de l'application est envoyé à tout visiteur, et la
 * page de connexion ne fait que masquer des écrans une fois le contenu déjà
 * livré : n'importe qui peut lire les cours dans le code source. Cette
 * fonction est le point d'entrée qui remplacera ce service statique.
 *
 * Le jeton est signé (HMAC) et contient l'email et sa date d'expiration ;
 * on revérifie ensuite en base que le compte est bien payant, pour qu'un
 * jeton encore valide d'un compte désactivé ne donne plus accès.
 */

// Emplacements possibles du fichier applicatif, dans l'ordre de préférence.
// app/app.html n'est pas servi statiquement par Vercel : c'est la cible.
const CHEMINS = [
  path.join(process.cwd(), 'app', 'app.html'),
  path.join(process.cwd(), 'public', 'index.html'),
];

let _cacheHtml = null;

function lireApplication() {
  if (_cacheHtml) return _cacheHtml;
  for (const p of CHEMINS) {
    try {
      if (fs.existsSync(p)) {
        _cacheHtml = fs.readFileSync(p, 'utf8');
        return _cacheHtml;
      }
    } catch (e) { /* on essaie le suivant */ }
  }
  return null;
}

function jetonDeLaRequete(req) {
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.indexOf('Bearer ') === 0) return auth.slice(7);
  const cookie = (req.headers && req.headers.cookie) || '';
  const m = /(?:^|;\s*)arab_token=([^;]+)/.exec(cookie);
  if (m) return decodeURIComponent(m[1]);
  if (req.query && req.query.t) return String(req.query.t);
  return null;
}

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;

  const ip = getClientIp(req);
  const { limited } = rateLimit(ip, 'app', 60, 60 * 1000);
  if (limited) return res.status(429).send('Trop de requêtes.');

  const token = jetonDeLaRequete(req);
  if (!token) {
    logEvent('app_no_token', { ip });
    return res.status(401).json({ error: 'Connexion requise.' });
  }

  // l'email est le premier segment du jeton signé
  const email = String(token).split(':')[0];
  if (!email || !verifyToken(token, email)) {
    logEvent('app_bad_token', { ip });
    return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
  }

  // le jeton peut être valide alors que le compte ne l'est plus
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: user } = await supabase
      .from('users').select('email, paid').eq('email', email.toLowerCase()).single();
    if (!user || !user.paid) {
      logEvent('app_not_paid', { ip, email });
      return res.status(403).json({ error: 'Accès réservé aux comptes actifs.' });
    }
  } catch (e) {
    console.error('[App] Vérification du compte impossible :', e.message);
    return res.status(500).json({ error: 'Vérification impossible.' });
  }

  const html = lireApplication();
  if (!html) {
    console.error('[App] Fichier applicatif introuvable');
    return res.status(500).json({ error: 'Application indisponible.' });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // jamais mis en cache par un intermédiaire : le contenu est réservé
  res.setHeader('Cache-Control', 'private, no-store');
  logEvent('app_served', { ip, email });
  return res.status(200).send(html);
};
