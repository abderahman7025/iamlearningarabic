const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const APP_URL = process.env.APP_URL || 'https://www.iamlearningarabic.com';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: 'payment',                // paiement unique - accès à vie
      customer_email: email,
      // Après paiement réussi → page inscription pour créer son mot de passe
      success_url: `${APP_URL}/inscription?email=${encodeURIComponent(email)}&payment=success`,
      // Annulation → retour accueil avec message
      cancel_url: `${APP_URL}/?payment=cancel`,
      metadata: { email },
      locale: 'fr',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
