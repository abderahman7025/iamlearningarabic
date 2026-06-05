const Stripe = require('stripe');
const { applyMiddleware, rateLimit, isValidEmail, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 10 tentatives / heure par IP ─────────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'payment-intent', 10, 60 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 heure.' });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const amount = parseInt(process.env.STRIPE_AMOUNT_CENTS || '7499');

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      receipt_email: email.toLowerCase().trim(),
      description: 'I Am Learning Arabic — Accès à vie',
      metadata: { email: email.toLowerCase().trim() },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('[Stripe] PaymentIntent error:', err.message);
    // Ne pas exposer le message d'erreur Stripe au client
    res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
  }
};
