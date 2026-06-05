const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { applyMiddleware, rateLimit, checkEmailBlock, recordFailedLogin, clearEmailBlock, generateToken, logEvent, isValidEmail, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 10 tentatives / 15 min par IP ───────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'login', 10, 15 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} min.` });
  }

  const { email, password, device_id } = req.body || {};

  // ── Validation ────────────────────────────────────────────────────────────
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide.' });
  if (typeof password !== 'string' || password.length > 128)
    return res.status(400).json({ error: 'Mot de passe invalide.' });

  const cleanEmail = email.toLowerCase().trim();

  // ── Vérifier si l'email est temporairement bloqué ──────────────────────────
  const emailBlock = checkEmailBlock(cleanEmail);
  if (emailBlock.blocked) {
    const minutesLeft = Math.ceil((emailBlock.blockedUntil - Date.now()) / 60000);
    logEvent('login_blocked', { email: cleanEmail, ip, reason: 'email_blocked' });
    return res.status(429).json({ error: `Compte temporairement bloqué. Réessayez dans ${minutesLeft} min.` });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: user } = await supabase
    .from('users')
    .select('email, paid, password_hash, device_id, is_admin')
    .eq('email', cleanEmail)
    .single();

  // Réponse volontairement vague pour ne pas révéler si l'email existe
  if (!user || !user.paid) {
    recordFailedLogin(cleanEmail);
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  if (user.password_hash === 'PENDING') {
    return res.status(403).json({ error: 'Compte non activé. Veuillez créer votre mot de passe.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    recordFailedLogin(cleanEmail);
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }

  // ── Vérification appareil (admins exemptés via colonne is_admin) ──────────
  const isAdmin = !!user.is_admin;
  if (device_id && !isAdmin) {
    if (user.device_id && user.device_id !== device_id) {
      logEvent('login_device_mismatch', { email: cleanEmail, ip });
      return res.status(403).json({
        error: "Ce compte est déjà utilisé sur un autre appareil. Contactez le support.",
        device_locked: true,
      });
    }
    if (!user.device_id) {
      await supabase.from('users').update({ device_id }).eq('email', cleanEmail);
    }
  }

  // ── Login réussi : générer token signé + effacer blocage ────────────────────
  clearEmailBlock(cleanEmail);
  const token = generateToken(cleanEmail, 24 * 60 * 60); // 24h expiration
  logEvent('login_success', { email: cleanEmail, ip, is_admin: isAdmin });

  res.json({ success: true, token, email: user.email });
};
