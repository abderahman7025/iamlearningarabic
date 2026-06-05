const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, isAdminRequest, isAdminIpAllowed, rateLimit, logEvent, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);

  // ── Admin uniquement + vérification IP ──────────────────────────────────────
  if (!isAdminRequest(req)) {
    logEvent('audio_upload_no_auth', { ip });
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  // ── Vérification IP admin (optionnel, mais très utile) ──────────────────────
  if (!isAdminIpAllowed(req)) {
    logEvent('audio_upload_ip_blocked', { ip });
    return res.status(403).json({ error: 'Accès refusé : IP non autorisée.' });
  }

  // ── Rate limit : 60 uploads / 10 min ─────────────────────────────────────────
  const { limited } = rateLimit(ip, 'audio-upload', 60, 10 * 60 * 1000);
  if (limited) {
    logEvent('audio_upload_rate_limited', { ip });
    return res.status(429).json({ error: 'Trop de requêtes.' });
  }

  const { ar, audioBase64 } = req.body || {};

  if (!ar || !audioBase64) return res.status(400).json({ error: 'Données manquantes.' });
  if (typeof ar !== 'string' || ar.length > 50)
    return res.status(400).json({ error: 'Caractère arabe invalide.' });

  // ── Limite taille fichier : 2 MB ──────────────────────────────────────────
  const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
  if (base64Data.length > 2 * 1024 * 1024 * 1.34)
    return res.status(413).json({ error: 'Fichier trop volumineux (max 2 MB).' });

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = Buffer.from(ar).toString('hex') + '.webm';

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await supabase.storage
      .from('audio').upload(fileName, buffer, { contentType: 'audio/webm', upsert: true });

    if (error) {
      logEvent('audio_upload_error', { ip, error: error.message });
      return res.status(500).json({ error: 'Erreur lors de l\'upload.' });
    }

    const { data } = supabase.storage.from('audio').getPublicUrl(fileName);
    logEvent('audio_upload_success', { ip, ar });
    res.json({ success: true, url: data.publicUrl });
  } catch (err) {
    console.error('[Audio-Upload] Error:', err.message);
    logEvent('audio_upload_exception', { ip, error: err.message });
    res.status(500).json({ error: 'Erreur lors de l\'upload.' });
  }
};
