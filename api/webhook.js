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

  // Paiement unique validé → accès à vie
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_email;

    if (email) {
      const normalizedEmail = email.toLowerCase();

      // 1. Enregistrer dans Supabase
      await supabase.from('users').upsert({
        email: normalizedEmail,
        paid: true,
        stripe_session_id: session.id,
        stripe_customer_id: session.customer || null,
        password_hash: 'PENDING',
        purchased_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      // 2. Ajouter à la liste Brevo (newsletter)
      try {
        await addContact(normalizedEmail, {
          SOURCE: 'iamlearningarabic',
          PAID: true,
          PAID_AT: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Brevo] addContact failed:', err.message);
        // Ne pas bloquer — l'achat est déjà enregistré
      }

      // 3. Envoyer l'email de bienvenue
      try {
        await sendEmail({
          to: email,
          subject: 'جَزَاكَ اللهُ خَيْرًا — Votre accès I Am Learning Arabic est actif 🌟',
          html: welcomeEmail(email),
        });
      } catch (err) {
        console.error('[Brevo] welcomeEmail failed:', err.message);
        // Ne pas bloquer — l'achat est déjà enregistré
      }
    }
  }

  res.json({ received: true });
};
