const { createClient } = require('@supabase/supabase-js');
const { verifyToken, rateLimit, logEvent } = require('./_security');
const { sendEmail } = require('./_brevo');

/**
 * LE BOUTON « ALERTER » (v3.2.3).
 *
 * Un élève qui ne comprend pas quelque chose touche le bouton en bas à
 * droite : la page part, avec une capture d'écran et son message, chez le
 * propriétaire du site, qui peut alors lui répondre.
 *
 * Branché sur POST /api/audio avec un corps { alerte: {...} } : le forfait
 * Vercel est à douze fonctions, toutes prises (les fichiers « _ » ne
 * comptent pas).
 *
 * Variables d'environnement (Vercel) :
 *   ALERTE_EMAIL       — où arrive l'alerte par e-mail
 *                        (défaut : contact@iamlearningarabic.com)
 *   CALLMEBOT_APIKEY   — clé CallMeBot, pour le WhatsApp
 *   ALERTE_WHATSAPP    — le numéro qui reçoit, au format international
 *                        (+33612345678)
 *   Sans les deux dernières, l'alerte part par e-mail seulement.
 *
 * La capture va dans le bucket Supabase « alertes » (créé au premier envoi,
 * public — le lien est envoyé au propriétaire ; le nom est aléatoire).
 */

function jeton(req) {
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.indexOf('Bearer ') === 0) return auth.slice(7);
  const m = /(?:^|;\s*)arab_token=([^;]+)/.exec((req.headers && req.headers.cookie) || '');
  return m ? decodeURIComponent(m[1]) : null;
}

const echappe = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

module.exports = async function alerte(req, res, ip) {
  const tk = jeton(req);
  const email = tk ? String(tk).split(':')[0] : '';
  if (!email || !verifyToken(tk, email)) {
    logEvent('alerte_no_auth', { ip });
    return res.status(401).json({ error: 'Connexion requise.' });
  }
  const lim = rateLimit(email, 'alerte', 6, 10 * 60 * 1000);
  if (lim.limited) {
    res.setHeader('Retry-After', lim.retryAfter);
    return res.status(429).json({ error: 'Trop d’alertes.', retryAfter: lim.retryAfter });
  }

  const a = (req.body && req.body.alerte) || {};
  const message = String(a.message || '').slice(0, 1500);
  const page = String(a.page || '').slice(0, 300);
  const profil = String(a.profil || '').slice(0, 40);
  const langue = String(a.langue || '').slice(0, 8);
  const appareil = String(a.appareil || '').slice(0, 300);
  let lien = '';

  /* La capture : un JPEG en base64, 3 Mo au plus. */
  const img = String(a.capture || '');
  const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(img);
  if (m && m[2].length < 4 * 1024 * 1024) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const b = await supabase.storage.getBucket('alertes');
      if (b.error) await supabase.storage.createBucket('alertes', { public: true });
      const nom = new Date().toISOString().slice(0, 10) + '/' +
        Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + (m[1] === 'png' ? 'png' : 'jpg');
      const up = await supabase.storage.from('alertes')
        .upload(nom, Buffer.from(m[2], 'base64'), { contentType: 'image/' + m[1], upsert: false });
      if (!up.error) lien = supabase.storage.from('alertes').getPublicUrl(nom).data.publicUrl;
      else console.error('[Alerte] capture non déposée :', up.error.message);
    } catch (e) { console.error('[Alerte] capture :', e.message); }
  }

  const envois = [];
  /* 1. WhatsApp (CallMeBot) — texte et lien de la capture. */
  if (process.env.CALLMEBOT_APIKEY && process.env.ALERTE_WHATSAPP) {
    const texte = '🔔 Alerte iamlearningarabic\n' +
      'De : ' + email + '\nPage : ' + page + (profil ? ' (' + profil + ')' : '') +
      (message ? '\nMessage : ' + message : '') + (lien ? '\nCapture : ' + lien : '');
    const u = 'https://api.callmebot.com/whatsapp.php?phone=' +
      encodeURIComponent(process.env.ALERTE_WHATSAPP.replace(/[^\d+]/g, '')) +
      '&text=' + encodeURIComponent(texte) + '&apikey=' + encodeURIComponent(process.env.CALLMEBOT_APIKEY);
    envois.push(fetch(u).then((r) => { if (!r.ok) throw new Error('callmebot ' + r.status); return 'whatsapp'; }));
  }
  /* 2. E-mail (Brevo), toujours : la capture y est visible directement, et
        « Répondre » écrit à l'élève. */
  envois.push(sendEmail({
    to: process.env.ALERTE_EMAIL || 'contact@iamlearningarabic.com',
    subject: '🔔 Alerte de ' + email + ' — ' + (page || 'page ?'),
    html: '<div style="font-family:Arial,sans-serif;font-size:15px">' +
      '<p><b>' + echappe(email) + '</b> n’a pas compris quelque chose.</p>' +
      '<p>Page : <b>' + echappe(page) + '</b> · profil ' + echappe(profil) + ' · langue ' + echappe(langue) + '</p>' +
      (message ? '<p style="padding:12px;background:#fff7e0;border-radius:8px">' + echappe(message).replace(/\n/g, '<br>') + '</p>' : '<p><i>Pas de message.</i></p>') +
      (lien ? '<p><img src="' + echappe(lien) + '" style="max-width:420px;border:1px solid #ddd;border-radius:8px"></p><p><a href="' + echappe(lien) + '">Ouvrir la capture</a></p>' : '<p><i>Pas de capture.</i></p>') +
      '<p style="color:#888;font-size:12px">' + echappe(appareil) + '</p>' +
      '<p><a href="mailto:' + echappe(email) + '">Répondre à ' + echappe(email) + '</a></p></div>',
  }).then(() => 'email'));

  const r = await Promise.allSettled(envois);
  const ok = r.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const ko = r.filter((x) => x.status === 'rejected').map((x) => String(x.reason && x.reason.message || x.reason).slice(0, 200));
  ko.forEach((m) => console.error('[Alerte] envoi :', m));
  logEvent('alerte', { email, page, ok: ok.join(','), ko: ko.join(' | ') });
  /* 500 et non 502 : Cloudflare remplace les réponses 502 par sa propre page,
     et l'on perdait la raison de l'échec. */
  if (!ok.length) return res.status(500).json({ error: 'Envoi impossible.', raisons: ko, capture: !!lien });
  return res.status(200).json({ ok: true, par: ok });
};
