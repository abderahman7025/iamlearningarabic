/**
 * L'INSCRIPTION GRATUITE — un compte pour essayer la première leçon.
 *
 * Elle ne ressemble pas à `register.js`, et c'est voulu : celle-là ne fait
 * que POSER UN MOT DE PASSE sur une ligne déjà créée par le paiement. Ici il
 * n'y a pas eu de paiement, donc pas de ligne : on la crée, avec `paid` à
 * faux. C'est ce faux-là qui, partout ailleurs, borne l'accès à la leçon
 * offerte.
 *
 * Une adresse qui a DÉJÀ PAYÉ ne passe pas par ici : on la renvoie se
 * connecter, sinon un client existant se fabriquerait un compte d'essai sur
 * sa propre adresse et perdrait son accès.
 */
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const {
  applyMiddleware, rateLimit, sanitizeEmail, validateUserData,
  logEvent, getClientIp, generateToken,
} = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  /* Plus permissif que l'inscription payante — on veut des essais — mais
     borné : c'est une porte ouverte sur la création de comptes. */
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'essai', 10, 60 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 heure.' });
  }

  const { email, password } = req.body || {};
  const validation = validateUserData({ email, password });
  if (!validation.valid) return res.status(400).json({ error: validation.errors[0] });

  const cleanEmail = sanitizeEmail(email);

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: existant } = await supabase
      .from('users').select('email, paid, password_hash').eq('email', cleanEmail).single();

    if (existant) {
      logEvent('essai_deja_inscrit', { email: cleanEmail, ip, paid: !!existant.paid });
      /* Le message ne dit pas si le compte a payé ou non : sinon la page
         devient un moyen de savoir qui est client. */
      return res.status(409).json({
        error: 'Un compte existe déjà pour cet email. Connectez-vous.',
        existe: true,
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const { error } = await supabase.from('users').insert({
      email: cleanEmail,
      password_hash: hash,
      paid: false,
    });
    if (error) {
      console.error('[Essai] Création impossible :', error.message);
      return res.status(500).json({ error: 'Création impossible.' });
    }

    logEvent('essai_cree', { email: cleanEmail, ip });

    /* On connecte tout de suite : demander de se reconnecter juste après
       s'être inscrit fait perdre la moitié des gens. */
    const token = generateToken(cleanEmail, 30 * 24 * 3600);
    /* Le cookie est pose par le CLIENT, comme apres une connexion ordinaire.
       Un cookie HttpOnly pose ici serait plus strict, mais la deconnexion de
       l'application l'efface en JavaScript : il resterait collant. */
    return res.json({ success: true, token, email: cleanEmail, paid: false });
  } catch (e) {
    console.error('[Essai] Erreur :', e.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
