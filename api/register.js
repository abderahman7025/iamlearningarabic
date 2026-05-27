const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { sendEmail, accountCreatedEmail } = require('./_brevo');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { email, password } = req.body;

  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: 'Email et mot de passe (6 car. min) requis.' });

  const { data: user } = await supabase
    .from('users').select('*').eq('email', email.toLowerCase()).single();

  if (!user || !user.paid)
    return res.status(403).json({ error: 'Aucun paiement validé pour cet email.' });

  if (user.password_hash !== 'PENDING')
    return res.status(409).json({ error: 'Un compte existe déjà pour cet email.' });

  const hash = await bcrypt.hash(password, 10);
  await supabase.from('users').update({ password_hash: hash }).eq('email', email.toLowerCase());

  // Email de confirmation de compte (non bloquant)
  sendEmail({
    to: email,
    subject: '✅ Votre compte I Am Learning Arabic est prêt',
    html: accountCreatedEmail(email),
  }).catch(err => console.error('[Brevo] accountCreatedEmail failed:', err.message));

  res.json({ success: true });
};
