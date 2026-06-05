const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { sendEmail, resetPasswordEmail } = require('./_brevo');
const { applyMiddleware, rateLimit, isValidEmail, getClientIp } = require('./_security');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 3 tentatives / heure par IP ─────────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'forgot', 3, 60 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans 1 heure.' });
  }

  const { email } = req.body || {};
  if (!email || !isValidEmail(email))
    return res.status(400).json({ error: 'Email invalide.' });

  const { data: user } = await supabase
    .from('users').select('email, paid').eq('email', email.toLowerCase().trim()).single();

  // Réponse générique pour ne pas révéler l'existence d'un compte
  if (!user || !user.paid) return res.status(200).json({ success: true });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 heure

  await supabase.from('reset_tokens')
    .upsert({ email: email.toLowerCase().trim(), token, expires_at: expires.toISOString() });

  const resetLink = `https://www.iamlearningarabic.com/app?reset=${token}&email=${encodeURIComponent(email.toLowerCase().trim())}`;

  try {
    await sendEmail({
      to: email,
      subject: '🔐 Réinitialisation de votre mot de passe — I Am Learning Arabic',
      html: resetPasswordEmail(resetLink),
    });
  } catch (err) {
    console.error('[Brevo] resetPasswordEmail failed:', err.message);
    return res.status(500).json({ error: 'Erreur envoi email.' });
  }

  return res.status(200).json({ success: true });
};
