const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  // Paiement unique validé → accès à vie
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_email;
    if (email) {
      await supabase.from('users').upsert({
        email: email.toLowerCase(),
        paid: true,
        stripe_session_id: session.id,
        stripe_customer_id: session.customer || null,
        password_hash: 'PENDING',
        purchased_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    }
  }

  res.json({ received: true });
};
