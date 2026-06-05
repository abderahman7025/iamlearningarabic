const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { sendEmail, accountCreatedEmail } = require('./_brevo');
const { applyMiddleware, rateLimit, isValidEmail, getClientIp } = require('./_security');

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

  const { email, password } = req.body || {};

  // ── Validation ────────────────────────────────────────────────────────────
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide.' });
  if (typeof password !== 'string' || password.length < 6 || password.length > 128)
    return res.status(400).json({ error: 'Mot de passe : 6 à 128 caractères requis.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: user } = await supabase
    .from('users').select('paid, password_hash').eq('email', email.toLowerCase().trim()).single();

  if (!user || !user.paid)
    return res.status(403).json({ error: 'Aucun paiement validé pour cet email.' });
  if (user.password_hash !== 'PENDING')
    return res.status(409).json({ error: 'Un compte existe déjà pour cet email.' });

  const hash = await bcrypt.hash(password, 12); // 12 rounds (plus sûr que 10)
  await supabase.from('users').update({ password_hash: hash }).eq('email', email.toLowerCase().trim());

  sendEmail({
    to: email,
    subject: '✅ Votre compte I Am Learning Arabic est prêt',
    html: accountCreatedEmail(email),
  }).catch(err => console.error('[Brevo] accountCreatedEmail failed:', err.message));

  res.json({ success: true });
};
