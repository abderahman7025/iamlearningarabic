const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { sendEmail, addContact, welcomeEmail } = require('./_brevo');

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

  async function handlePayment(email, meta = {}) {
    if (!email) return;
    const normalizedEmail = email.toLowerCase();

    await supabase.from('users').upsert({
      email: normalizedEmail,
      paid: true,
      stripe_session_id: meta.sessionId || null,
      stripe_payment_intent_id: meta.paymentIntentId || null,
      stripe_customer_id: meta.customerId || null,
      password_hash: 'PENDING',
      purchased_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    try {
      await addContact(normalizedEmail, {
        SOURCE: 'iamlearningarabic',
        PAID: true,
        PAID_AT: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Brevo] addContact failed:', err.message);
    }

    try {
      await sendEmail({
        to: email,
        subject: 'جَزَاكَ اللهُ خَيْرًا — Votre accès I Am Learning Arabic est actif 🌟',
        html: welcomeEmail(email),
      });
    } catch (err) {
      console.error('[Brevo] welcomeEmail failed:', err.message);
    }
  }

  // Paiement via Checkout Session (ancien flow embedded)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_email;
    await handlePayment(email, {
      sessionId: session.id,
      customerId: session.customer,
    });
  }

  // Paiement via Payment Element (nouveau flow custom)
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const email = pi.metadata?.email || pi.receipt_email;
    await handlePayment(email, {
      paymentIntentId: pi.id,
      customerId: pi.customer,
    });
  }

  res.json({ received: true });
};
