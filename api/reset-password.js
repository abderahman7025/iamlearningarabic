const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { applyMiddleware, rateLimit, sanitizeEmail, validateUserData, logEvent, getClientIp } = require('./_security');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 5 tentatives / 15 min par IP ────────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'reset', 5, 15 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' });
  }

  const { token, email, password } = req.body || {};

  if (!token || !email || !password) return res.status(400).json({ error: 'Données manquantes.' });

  // ── Validation stricte ─────────────────────────────────────────────────────
  const validation = validateUserData({ email, password });
  if (!validation.valid) return res.status(400).json({ error: validation.errors[0] });

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    logEvent('reset_invalid_token', { ip });
    return res.status(400).json({ error: 'Token invalide.' });
  }

  const cleanEmail = sanitizeEmail(email);

  const { data: resetData, error: tokenError } = await supabase
    .from('reset_tokens').select('*')
    .eq('token', token).eq('email', cleanEmail).single();

  if (tokenError || !resetData) {
    logEvent('reset_token_not_found', { email: cleanEmail, ip });
    return res.status(400).json({ error: 'Lien invalide ou expiré.' });
  }

  if (new Date(resetData.expires_at) < new Date()) {
    await supabase.from('reset_tokens').delete().eq('token', token);
    logEvent('reset_token_expired', { email: cleanEmail, ip });
    return res.status(400).json({ error: 'Lien expiré. Faites une nouvelle demande.' });
  }

  const hashed = await bcrypt.hash(password, 12);
  const { error: updateError } = await supabase.from('users')
    .update({ password_hash: hashed }).eq('email', cleanEmail);

  if (updateError) {
    logEvent('reset_update_error', { email: cleanEmail, ip, error: updateError.message });
    return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }

  await supabase.from('reset_tokens').delete().eq('token', token);

  logEvent('reset_success', { email: cleanEmail, ip });
  return res.status(200).json({ success: true });
};
