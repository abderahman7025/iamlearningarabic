const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { sendEmail, accountCreatedEmail } = require('./_brevo');
const { applyMiddleware, rateLimit, sanitizeEmail, validateUserData, logEvent, getClientIp } = require('./_security');

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
