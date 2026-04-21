// api/forgot-password.js - À ajouter dans votre projet Vercel

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialiser Supabase (remplacez par vos vraies clés)
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

  // Générer un token unique
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 heure

  // Vérifier que l'utilisateur existe
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .single();

  if (userError || !user) {
    return res.status(404).json({ success: false, error: 'Email introuvable' });
  }

  // Sauvegarder le token de reset
  await supabase
    .from('reset_tokens')
    .upsert({ email: email.toLowerCase(), token, expires_at: expires.toISOString() });

  // Envoyer l'email via Resend (ou autre service)
  const resetLink = `https://www.iamlearningarabic.com?reset=${token}&email=${encodeURIComponent(email)}`;

  // Avec Resend:
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'noreply@iamlearningarabic.com',
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#d4a843">لِنَتَعَلَّمِ الْعَرَبِيَّة</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <a href="${resetLink}" style="display:inline-block;background:#d4a843;color:#000;padding:14px 28px;border-radius:50px;text-decoration:none;font-weight:bold;margin:20px 0">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#888;font-size:12px">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `
  });

  return res.status(200).json({ success: true });
};
