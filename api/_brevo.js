/**
 * Helpers Brevo (anciennement Sendinblue)
 * Vars d'env nécessaires :
 *   BREVO_API_KEY       — clé API Brevo
 *   BREVO_LIST_ID       — ID de la liste newsletter (ex: 3)
 *   BREVO_SENDER_EMAIL  — email expéditeur vérifié dans Brevo
 *   BREVO_SENDER_NAME   — nom de l'expéditeur
 */

const API = 'https://api.brevo.com/v3';

function headers() {
  return {
    'api-key': process.env.BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function sender() {
  return {
    name:  process.env.BREVO_SENDER_NAME  || 'I Am Learning Arabic',
    email: process.env.BREVO_SENDER_EMAIL || 'contact@iamlearningarabic.com',
  };
}

/**
 * Envoyer un email transactionnel
 */
async function sendEmail({ to, subject, html }) {
  const res = await fetch(`${API}/smtp/email`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      sender: sender(),
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Brevo] sendEmail error:', JSON.stringify(err));
    throw new Error(err.message || 'Brevo sendEmail failed');
  }
  return res.json();
}

/**
 * Ajouter / mettre à jour un contact + l'ajouter à la liste newsletter
 */
async function addContact(email, attributes = {}) {
  const listId = process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID) : null;
  const body = {
    email,
    attributes,
    updateEnabled: true,
  };
  if (listId) body.listIds = [listId];

  const res = await fetch(`${API}/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  // 204 = mis à jour, pas d'erreur
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    // Code 300 = contact déjà dans la liste — pas grave
    if (err.code !== 'duplicate_parameter') {
      console.error('[Brevo] addContact error:', JSON.stringify(err));
    }
  }
}

/* ====================================================================
   TEMPLATES EMAIL
   ==================================================================== */

function emailBase(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060810;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#0d1124;border-radius:18px;overflow:hidden;border:1px solid rgba(212,160,23,.18)">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#0d1124 0%,#111830 100%);padding:32px 36px;text-align:center;border-bottom:1px solid rgba(212,160,23,.18)">
        <div style="font-size:2.2rem;color:#f5c842;direction:rtl;line-height:1.3;margin-bottom:6px">لِنَتَعَلَّمِ الْعَرَبِيَّة</div>
        <div style="color:rgba(255,255,255,.35);font-size:.78rem;letter-spacing:.1em;text-transform:uppercase">I Am Learning Arabic</div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:36px 36px 28px">
        ${content}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#070a14;padding:20px 36px;text-align:center;border-top:1px solid rgba(255,255,255,.06)">
        <p style="color:rgba(255,255,255,.22);font-size:.72rem;margin:0 0 6px">
          © 2025 I Am Learning Arabic &nbsp;·&nbsp;
          <a href="https://www.iamlearningarabic.com" style="color:rgba(245,200,66,.45);text-decoration:none">iamlearningarabic.com</a>
        </p>
        <p style="color:rgba(255,255,255,.15);font-size:.7rem;margin:0">
          Vous recevez cet email suite à votre achat sur notre site.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

function welcomeEmail(email) {
  return emailBase(`
    <h1 style="color:#f5c842;font-size:1.45rem;margin:0 0 6px">جَزَاكَ اللهُ خَيْرًا 🌟</h1>
    <p style="color:rgba(255,255,255,.5);font-size:.8rem;margin:0 0 20px;font-style:italic">Que Allah vous récompense du bien</p>

    <p style="color:rgba(255,255,255,.82);line-height:1.75;margin:0 0 14px">
      Votre paiement a été confirmé. Bienvenue dans la famille <strong style="color:#f5c842">I Am Learning Arabic</strong> !
    </p>
    <p style="color:rgba(255,255,255,.72);line-height:1.75;margin:0 0 28px">
      Vous avez désormais un accès <strong style="color:#fff">à vie</strong> à toute l'application.
      Il ne vous reste plus qu'à créer votre mot de passe pour commencer votre voyage avec le Coran.
    </p>

    <div style="text-align:center;margin:0 0 32px">
      <a href="https://www.iamlearningarabic.com/inscription?email=${encodeURIComponent(email)}"
         style="display:inline-block;background:#d4a017;color:#0a0e1a;padding:14px 34px;border-radius:50px;text-decoration:none;font-weight:800;font-size:.95rem">
        Créer mon compte →
      </a>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.04);border:1px solid rgba(212,160,23,.14);border-radius:12px;margin-bottom:28px">
      <tr><td style="padding:20px 24px">
        <p style="color:#f5c842;font-weight:700;font-size:.88rem;margin:0 0 14px">Ce qui vous attend :</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;color:rgba(255,255,255,.75);font-size:.85rem">✦&nbsp; 28 lettres arabes avec 6 activités chacune (~30 min / lettre)</td></tr>
          <tr><td style="padding:4px 0;color:rgba(255,255,255,.75);font-size:.85rem">✦&nbsp; Mode adulte &amp; mode enfant (dès 5 ans) inclus</td></tr>
          <tr><td style="padding:4px 0;color:rgba(255,255,255,.75);font-size:.85rem">✦&nbsp; Jeux, quiz, tracé interactif, prononciation audio native</td></tr>
          <tr><td style="padding:4px 0;color:rgba(255,255,255,.75);font-size:.85rem">✦&nbsp; Application PWA — disponible hors-ligne sur téléphone</td></tr>
          <tr><td style="padding:4px 0;color:rgba(255,255,255,.75);font-size:.85rem">✦&nbsp; Toutes les mises à jour futures incluses à vie</td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;padding:18px 0 0;border-top:1px solid rgba(255,255,255,.07)">
      <div style="font-size:1.25rem;color:#f5c842;direction:rtl;line-height:1.7;margin-bottom:8px">إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ</div>
      <p style="color:rgba(255,255,255,.35);font-size:.78rem;font-style:italic;margin:0">
        « Les actes ne valent que par leurs intentions. » — Hadith
      </p>
    </div>
  `);
}

function accountCreatedEmail(email) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#1a1a1a;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.1)">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%);padding:32px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,.1)">
        <div style="font-size:2.2rem;color:#fff;direction:rtl;line-height:1.3;margin-bottom:6px">لِنَتَعَلَّمِ الْعَرَبِيَّة</div>
        <div style="color:rgba(255,255,255,.5);font-size:.78rem;letter-spacing:.1em;text-transform:uppercase">I Am Learning Arabic</div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#1a1a1a;padding:36px 36px 28px">
        <p style="color:rgba(255,255,255,.9);line-height:1.75;margin:0 0 18px">Bienvenue dans la famille I Am Learning Arabic ! Votre souscription est effective !</p>

        <p style="color:rgba(255,255,255,.8);line-height:1.75;margin:0 0 18px">
          Vous avez désormais un accès à vie à notre plateforme. Il ne vous reste plus qu'à en profiter pleinement.
          N'oubliez pas : nous sommes joignable via l'onglet "contact" de notre site, et il n'y a absolument aucune question bête !
        </p>

        <div style="text-align:center;margin:28px 0">
          <a href="https://www.iamlearningarabic.com/app"
             style="display:inline-block;background:#000;color:#fff;padding:14px 34px;border-radius:50px;text-decoration:none;font-weight:800;font-size:.95rem;border:1px solid rgba(255,255,255,.3)">
            Accéder à mon compte →
          </a>
        </div>

        <p style="color:rgba(255,255,255,.7);font-size:.9rem;line-height:1.8;margin:0 0 18px">Parmi ce qui vous attend :</p>

        <p style="color:rgba(255,255,255,.75);font-size:.9rem;line-height:2;margin:0">
          ✦ &nbsp;Des cours parfaitement pensés, structurés et expliqués.<br>
          ✦ &nbsp;Mode adulte & modes enfants (dès 5 ans).<br>
          ✦ &nbsp;Jeux, quiz, tracé interactif, prononciation audio native.<br>
          ✦ &nbsp;Application PWA — disponible hors-ligne sur téléphone.<br>
          ✦ &nbsp;Toutes les mises à jour futures incluses à vie.
        </p>

        <p style="color:rgba(255,255,255,.5);font-size:.85rem;line-height:1.8;margin:24px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);text-align:center;font-style:italic">
          إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ<br>
          « Les actes ne valent que par leurs intentions. » — Hadith
        </p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#0f0f0f;padding:20px 36px;text-align:center;border-top:1px solid rgba(255,255,255,.1)">
        <p style="color:rgba(255,255,255,.4);font-size:.72rem;margin:0 0 6px">
          © 2025 I Am Learning Arabic &nbsp;·&nbsp;
          <a href="https://www.iamlearningarabic.com" style="color:rgba(255,255,255,.5);text-decoration:none">iamlearningarabic.com</a>
        </p>
        <p style="color:rgba(255,255,255,.3);font-size:.7rem;margin:0">
          Vous recevez cet email suite à votre achat sur notre site.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

function resetPasswordEmail(resetLink) {
  return emailBase(`
    <h1 style="color:#f5c842;font-size:1.35rem;margin:0 0 18px">🔐 Réinitialisation du mot de passe</h1>

    <p style="color:rgba(255,255,255,.82);line-height:1.75;margin:0 0 22px">
      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous.
    </p>

    <div style="text-align:center;margin:0 0 28px">
      <a href="${resetLink}"
         style="display:inline-block;background:#d4a017;color:#0a0e1a;padding:14px 34px;border-radius:50px;text-decoration:none;font-weight:800;font-size:.95rem">
        Réinitialiser mon mot de passe →
      </a>
    </div>

    <p style="color:rgba(255,255,255,.32);font-size:.78rem;text-align:center;margin:0">
      Ce lien expire dans <strong style="color:rgba(255,255,255,.5)">1 heure</strong>.<br>
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
  `);
}

module.exports = { sendEmail, addContact, welcomeEmail, accountCreatedEmail, resetPasswordEmail };
