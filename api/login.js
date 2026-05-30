const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { email, password, device_id } = req.body;

  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  if (!user.paid) return res.status(403).json({ error: 'Aucun paiement validé pour ce compte.' });
  if (user.password_hash === 'PENDING') return res.status(403).json({ error: 'Compte non activé. Veuillez créer votre mot de passe.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

  // Comptes admin — jamais bloqués par la vérification d'appareil
  const ADMIN_EMAILS = ['abder.jah@gmail.com', 'abder.jah@hotmail.com', 'contact@iamlearningarabic.com'];
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

  // Vérification appareil unique
  if (device_id && !isAdmin) {
    if (user.device_id && user.device_id !== device_id) {
      // Un autre appareil est déjà enregistré
      return res.status(403).json({ 
        error: 'Ce compte est déjà utilisé sur un autre appareil. Contactez le support pour changer d\'appareil.',
        device_locked: true
      });
    }
    // Enregistrer l'appareil si pas encore fait
    if (!user.device_id) {
      await supabase
        .from('users')
        .update({ device_id: device_id })
        .eq('email', email.toLowerCase());
    }
  }

  const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
  res.json({ success: true, token, email: user.email });
};
