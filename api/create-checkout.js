const Stripe = require('stripe');
const { applyMiddleware, rateLimit, isValidEmail, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 10 tentatives / heure par IP ─────────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'checkout', 10, 60 * 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 1 heure.' });
  }

  const { email, embedded } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email invalide.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const APP_URL = process.env.APP_URL || 'https://www.iamlearningarabic.com';
  const cleanEmail = email.toLowerCase().trim();

  try {
    if (embedded) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        customer_email: cleanEmail,
        ui_mode: 'embedded',
        return_url: `${APP_URL}/inscription?email=${encodeURIComponent(cleanEmail)}&session_id={CHECKOUT_SESSION_ID}`,
        metadata: { email: cleanEmail },
        locale: 'fr',
      });
      res.json({ clientSecret: session.client_secret });
    } else {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        mode: 'payment',
        customer_email: cleanEmail,
        success_url: `${APP_URL}/inscription?email=${encodeURIComponent(cleanEmail)}&payment=success`,
        cancel_url: `${APP_URL}/?payment=cancel`,
        metadata: { email: cleanEmail },
        locale: 'fr',
      });
      res.json({ url: session.url });
    }
  } catch (err) {
    console.error('[Stripe] Checkout error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
  }
};
