const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { sendEmail, addContact, welcomeEmail } = require('./_brevo');

// ── CRITIQUE : désactiver le body parser Vercel pour que Stripe
//              puisse vérifier sa signature sur le body brut ──────────────────
module.exports.config = { api: { bodyParser: false } };

// Lecture du body brut (stream)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Sécurité : webhook Stripe uniquement en POST
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'Signature manquante.' });

  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Lecture du body impossible.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] Signature invalide:', err.message);
    return res.status(400).json({ error: 'Signature invalide.' });
  }

  async function handlePayment(email, meta = {}) {
    if (!email) return;
    const normalizedEmail = email.toLowerCase().trim();

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_email;
    await handlePayment(email, { sessionId: session.id, customerId: session.customer });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const email = pi.metadata?.email || pi.receipt_email;
    await handlePayment(email, { paymentIntentId: pi.id, customerId: pi.customer });
  }

  res.json({ received: true });
};
