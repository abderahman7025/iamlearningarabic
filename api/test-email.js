/**
 * Endpoint de test Brevo — À SUPPRIMER après vérification
 * Usage : POST /api/test-email   { "email": "ton@email.com" }
 */
const { sendEmail, welcomeEmail } = require('./_brevo');

module.exports = async (req, res) => {
  // Sécurité basique : clé secrète dans le body
  if (req.body?.secret !== process.env.TEST_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  try {
    await sendEmail({
      to: email,
      subject: '🧪 Test Brevo — I Am Learning Arabic',
      html: welcomeEmail(email),
    });
    res.json({ success: true, message: `Email envoyé à ${email}` });
  } catch (err) {
    console.error('[test-email]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
