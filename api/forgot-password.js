const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { sendEmail, resetPasswordEmail } = require('./_brevo');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  // Chercher l'utilisateur dans la table users
  const { data: user } = await supabase
    .from('users')
    .select('email, paid')
    .eq('email', email.toLowerCase())
    .single();

  if (!user || !user.paid) {
    // Réponse générique pour ne pas révéler l'existence d'un compte
    return res.status(200).json({ success: true });
  }

  // Générer un token unique
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 heure

  await supabase
    .from('reset_tokens')
    .upsert({ email: email.toLowerCase(), token, expires_at: expires.toISOString() });

  const resetLink = `https://www.iamlearningarabic.com/app?reset=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

  try {
    await sendEmail({
      to: email,
      subject: '🔐 Réinitialisation de votre mot de passe — I Am Learning Arabic',
      html: resetPasswordEmail(resetLink),
    });
  } catch (err) {
    console.error('[Brevo] resetPasswordEmail failed:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur envoi email' });
  }

  return res.status(200).json({ success: true });
};
