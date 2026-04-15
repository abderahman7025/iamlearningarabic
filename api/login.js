const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });
  const { data: user } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  if (!user.paid) return res.status(403).json({ error: 'Aucun paiement validé pour ce compte.' });
  if (user.password_hash === 'PENDING') return res.status(403).json({ error: 'Compte non activé. Veuillez créer votre mot de passe.' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
  res.json({ success: true, token, email: user.email });
};
