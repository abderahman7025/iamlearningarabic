const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { sendEmail, resetPasswordEmail } = require('./_brevo');
const { applyMiddleware, rateLimit, sanitizeEmail, validateUserData, logEvent, getClientIp } = require('./_security');

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

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const validation = validateUserData({ email });
  if (!validation.valid) return res.status(400).json({ error: validation.errors[0] });

  const cleanEmail = sanitizeEmail(email);

  const { data: user } = await supabase
    .from('users').select('email, paid').eq('email', cleanEmail).single();

  // Réponse générique pour ne pas révéler l'existence d'un compte
  if (!user || !user.paid) {
    logEvent('forgot_no_payment', { email: cleanEmail, ip });
    return res.status(200).json({ success: true });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 heure

  await supabase.from('reset_tokens')
    .upsert({ email: cleanEmail, token, expires_at: expires.toISOString() });

  const resetLink = `https://www.iamlearningarabic.com/app?reset=${token}&email=${encodeURIComponent(cleanEmail)}`;

  try {
    await sendEmail({
      to: cleanEmail,
      subject: '🔐 Réinitialisation de votre mot de passe — I Am Learning Arabic',
      html: resetPasswordEmail(resetLink),
    });
    logEvent('forgot_email_sent', { email: cleanEmail, ip });
  } catch (err) {
    console.error('[Brevo] resetPasswordEmail failed:', err.message);
    logEvent('forgot_email_failed', { email: cleanEmail, ip, error: err.message });
    return res.status(500).json({ error: 'Erreur envoi email.' });
  }

  return res.status(200).json({ success: true });
};
