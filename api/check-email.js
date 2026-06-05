const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, isValidEmail } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !isValidEmail(email)) return res.status(200).json({ exists: false });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data } = await supabase
      .from('users')
      .select('email, paid')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (data && data.paid) {
      return res.status(200).json({ exists: true });
    }
  } catch (e) { /* ignore */ }

  return res.status(200).json({ exists: false });
};
