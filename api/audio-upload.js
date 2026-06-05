const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, isAdminRequest, rateLimit, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Admin uniquement ──────────────────────────────────────────────────────
  if (!isAdminRequest(req)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  // ── Rate limit : 60 uploads / 10 min ─────────────────────────────────────
  const ip = getClientIp(req);
  const { limited } = rateLimit(ip, 'audio-upload', 60, 10 * 60 * 1000);
  if (limited) return res.status(429).json({ error: 'Trop de requêtes.' });

  const { ar, audioBase64 } = req.body || {};

  if (!ar || !audioBase64) return res.status(400).json({ error: 'Données manquantes.' });
  if (typeof ar !== 'string' || ar.length > 50)
    return res.status(400).json({ error: 'Caractère arabe invalide.' });

  // ── Limite taille fichier : 2 MB ─────────────────────────────────────────
  const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
  if (base64Data.length > 2 * 1024 * 1024 * 1.34) // 2MB en base64 ≈ 2.67MB chars
    return res.status(413).json({ error: 'Fichier trop volumineux (max 2 MB).' });

  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = Buffer.from(ar).toString('hex') + '.webm';

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { error } = await supabase.storage
    .from('audio').upload(fileName, buffer, { contentType: 'audio/webm', upsert: true });

  if (error) return res.status(500).json({ error: error.message });

  const { data } = supabase.storage.from('audio').getPublicUrl(fileName);
  res.json({ success: true, url: data.publicUrl });
};
