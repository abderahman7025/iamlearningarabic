// api/activate-payment.js
// Appelé immédiatement après le paiement côté client.
// Vérifie le PaymentIntent Stripe et marque l'utilisateur comme payé dans Supabase.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, isValidEmail } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, paymentIntentId } = req.body || {};
  if (!email || !isValidEmail(email) || !paymentIntentId) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }
  if (!paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'PaymentIntent invalide.' });
  }

  try {
    // Vérifier que le paiement est bien succeeded côté Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return res.status(402).json({ error: 'Paiement non confirmé.' });
    }

    // Vérifier que l'email correspond
    const piEmail = pi.metadata?.email || pi.receipt_email;
    if (piEmail && piEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Email non correspondant.' });
    }

    // Créer ou mettre à jour l'utilisateur dans Supabase
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: existing } = await supabase
      .from('users').select('email, paid, password_hash').eq('email', email.toLowerCase()).single();

    if (existing && existing.paid && existing.password_hash !== 'PENDING') {
      // Compte déjà actif
      return res.status(200).json({ success: true, alreadyActive: true });
    }

    // Insérer ou mettre à jour
    await supabase.from('users').upsert({
      email: email.toLowerCase(),
      paid: true,
      password_hash: existing?.password_hash || 'PENDING',
      stripe_payment_intent_id: paymentIntentId,
    }, { onConflict: 'email' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[activate-payment]', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
