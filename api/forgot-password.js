// api/forgot-password.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

  // Chercher dans Supabase Auth
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Supabase auth error:', error);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }

  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ success: false, error: 'Email introuvable' });
  }

  // Générer un token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000);

  // Sauvegarder dans reset_tokens
  await supabase
    .from('reset_tokens')
    .upsert({ email: email.toLowerCase(), token, expires_at: expires.toISOString() });

  const resetLink = `https://www.iamlearningarabic.com?reset=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

  // Envoyer via Resend (fetch natif)
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@iamlearningarabic.com',
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d0b1a;color:#f0ece4;border-radius:16px"><h2 style="color:#f5c842;text-align:center">لِنَتَعَلَّمِ الْعَرَبِيَّة</h2><p>Bonjour,</p><p>Vous avez demandé à réinitialiser votre mot de passe.</p><div style="text-align:center;margin:28px 0"><a href="${resetLink}" style="background:#f5c842;color:#0a0718;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:800">Réinitialiser mon mot de passe</a></div><p style="color:#888;font-size:12px;text-align:center">Ce lien expire dans 1 heure.</p></div>`
    })
  });

  if (!emailRes.ok) {
    const err = await emailRes.json();
    console.error('Resend error:', err);
    return res.status(500).json({ success: false, error: 'Erreur envoi email' });
  }

  return res.status(200).json({ success: true });
};
