const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { sendEmail, accountCreatedEmail } = require('./_brevo');
const { applyMiddleware, rateLimit, sanitizeEmail, validateUserData, logEvent, getClientIp, generateToken } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 5 tentatives / heure par IP ─────────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'register', 5, 60 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 heure.' });
  }

  const { email, password, essai } = req.body || {};

  /* ── L'INSCRIPTION GRATUITE ──
     Elle vit ICI et non dans sa propre route : le plan Vercel plafonne les
     fonctions a douze, une treizieme et plus rien ne se deploie. Le
     symptome est muet — les commits partent, la mise en ligne n'arrive
     jamais et l'ancienne version continue d'etre servie.

     Elle ne fait pas la meme chose que l'inscription payante : celle-la
     POSE UN MOT DE PASSE sur une ligne deja creee par le paiement ; ici il
     n'y a pas eu de paiement, donc pas de ligne. On la cree, avec `paid` a
     faux — c'est ce faux-la qui, partout ailleurs, borne l'acces a la lecon
     offerte. */
  if (essai) return inscriptionGratuite(req, res, ip, email, password);

  // ── Validation stricte ─────────────────────────────────────────────────────
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const validation = validateUserData({ email, password });
  if (!validation.valid) return res.status(400).json({ error: validation.errors[0] });

  const cleanEmail = sanitizeEmail(email);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: user } = await supabase
    .from('users').select('paid, password_hash').eq('email', cleanEmail).single();

  if (!user || !user.paid) {
    logEvent('register_no_payment', { email: cleanEmail, ip });
    return res.status(403).json({ error: 'Aucun paiement validé pour cet email.' });
  }
  if (user.password_hash !== 'PENDING') {
    logEvent('register_already_exists', { email: cleanEmail, ip });
    return res.status(409).json({ error: 'Un compte existe déjà pour cet email.' });
  }

  const hash = await bcrypt.hash(password, 12);
  await supabase.from('users').update({ password_hash: hash }).eq('email', cleanEmail);

  logEvent('register_success', { email: cleanEmail, ip });

  try {
    console.log('[register] Attempting to send email to:', cleanEmail);
    await sendEmail({
      to: cleanEmail,
      subject: 'Votre accès I Am Learning Arabic est actif ⭐',
      html: accountCreatedEmail(cleanEmail),
    });
    console.log('[Brevo] Email sent successfully to:', cleanEmail);
  } catch (err) {
    console.error('[Brevo] Email failed:', err.message);
    console.error('[Brevo] Full error:', JSON.stringify(err));
  }

  res.json({ success: true });
};

/* Voir l'appel plus haut. Separee pour que la lecture de l'inscription
   payante ne soit pas coupee en deux. */
async function inscriptionGratuite(req, res, ip, email, password) {
  const { limited, retryAfter } = rateLimit(ip, 'essai', 10, 60 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 heure.' });
  }
  const validation = validateUserData({ email, password });
  if (!validation.valid) return res.status(400).json({ error: validation.errors[0] });
  const cleanEmail = sanitizeEmail(email);
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: existant } = await supabase
      .from('users').select('email, paid').eq('email', cleanEmail).single();
    if (existant) {
      logEvent('essai_deja_inscrit', { email: cleanEmail, ip, paid: !!existant.paid });
      /* Le message ne dit pas si le compte a paye : sinon la page devient un
         moyen de savoir qui est client. */
      return res.status(409).json({
        error: 'Un compte existe déjà pour cet email. Connectez-vous.', existe: true });
    }
    const hash = await bcrypt.hash(password, 12);
    const { error } = await supabase.from('users')
      .insert({ email: cleanEmail, password_hash: hash, paid: false });
    if (error) {
      console.error('[Essai] Création impossible :', error.message);
      return res.status(500).json({ error: 'Création impossible.' });
    }
    logEvent('essai_cree', { email: cleanEmail, ip });
    /* On connecte tout de suite : redemander de se connecter juste apres
       s'etre inscrit fait perdre la moitie des gens. */
    const token = generateToken(cleanEmail, 30 * 24 * 3600);
    return res.json({ success: true, token, email: cleanEmail, paid: false });
  } catch (e) {
    console.error('[Essai] Erreur :', e.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
