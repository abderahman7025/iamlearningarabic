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

  const ev = event.type;
  console.log('Stripe event:', ev);

  // ── Abonnement créé / paiement validé ──────────────────────────
  if (ev === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_email;
    if (email) {
      await supabase.from('users').upsert({
        email: email.toLowerCase(),
        paid: true,
        stripe_session_id: session.id,
        stripe_customer_id: session.customer || null,
        password_hash: 'PENDING',
        subscribed_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    }
  }

  // ── Renouvellement mensuel réussi ──────────────────────────────
  else if (ev === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    if (customerId) {
      // Récupérer l'email depuis Stripe
      try {
        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email;
        if (email) {
          await supabase.from('users')
            .update({ paid: true, last_renewal: new Date().toISOString() })
            .eq('email', email.toLowerCase());
        }
      } catch (e) {
        console.error('Error retrieving customer:', e.message);
      }
    }
  }

  // ── Abonnement annulé / paiement échoué ───────────────────────
  else if (ev === 'customer.subscription.deleted' || ev === 'invoice.payment_failed') {
    const obj = event.data.object;
    const customerId = obj.customer;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        const email = customer.email;
        if (email) {
          await supabase.from('users')
            .update({ paid: false, cancelled_at: new Date().toISOString() })
            .eq('email', email.toLowerCase());
        }
      } catch (e) {
        console.error('Error on subscription cancel:', e.message);
      }
    }
  }

  res.json({ received: true });
};
