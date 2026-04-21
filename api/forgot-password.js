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

  // Vérifier que l'utilisateur existe
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .single();

  if (userError || !user) {
    return res.status(404).json({ success: false, error: 'Email introuvable' });
  }

  // Générer un token unique
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 heure

  // Sauvegarder le token
  await supabase
    .from('reset_tokens')
    .upsert({ email: email.toLowerCase(), token, expires_at: expires.toISOString() });

  // Lien de reset
  const resetLink = `https://www.iamlearningarabic.com?reset=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

  // Envoyer l'email via Resend API (fetch natif, pas de package)
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
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#0d0b1a;color:#f0ece4;border-radius:16px">
          <h2 style="color:#f5c842;text-align:center">لِنَتَعَلَّمِ الْعَرَبِيَّة</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="${resetLink}" style="background:#f5c842;color:#0a0718;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:800;font-size:1rem">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center">Ce lien expire dans 1 heure.<br>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `
    })
  });

  if (!emailRes.ok) {
    const errData = await emailRes.json();
    console.error('Resend error:', errData);
    return res.status(500).json({ success: false, error: 'Erreur envoi email' });
  }

  return res.status(200).json({ success: true });
};
