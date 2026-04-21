// api/reset-password.js - À ajouter dans votre projet Vercel

const { createClient } = require('@supabase/supabase-js');

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

  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    return res.status(400).json({ error: 'Données manquantes' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court' });
  }

  // Vérifier que le token existe et n'est pas expiré
  const { data: resetData, error: tokenError } = await supabase
    .from('reset_tokens')
    .select('*')
    .eq('token', token)
    .eq('email', email.toLowerCase())
    .single();

  if (tokenError || !resetData) {
    return res.status(400).json({ success: false, error: 'Lien invalide ou expiré' });
  }

  if (new Date(resetData.expires_at) < new Date()) {
    await supabase.from('reset_tokens').delete().eq('token', token);
    return res.status(400).json({ success: false, error: 'Lien expiré. Faites une nouvelle demande.' });
  }

  // Hasher le nouveau mot de passe
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(password, 10);

  // Mettre à jour le mot de passe
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashed })
    .eq('email', email.toLowerCase());

  if (updateError) {
    return res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour' });
  }

  // Supprimer le token utilisé
  await supabase.from('reset_tokens').delete().eq('token', token);

  return res.status(200).json({ success: true });
};
