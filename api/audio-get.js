const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, rateLimit, logEvent, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limit : 30 requêtes / min par IP ────────────────────────────────
  const ip = getClientIp(req);
  const { limited, retryAfter } = rateLimit(ip, 'audio-get', 30, 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data } = await supabase.storage
      .from('audio')
      .list('', { limit: 1000 });

    const urls = {};
    if (data) {
      data.forEach(file => {
        try {
          const ar = Buffer.from(file.name.replace('.webm', ''), 'hex').toString('utf8');
          const { data: urlData } = supabase.storage.from('audio').getPublicUrl(file.name);
          urls[ar] = urlData.publicUrl;
        } catch (err) {
          // Ignore les fichiers invalides
          console.error('[Audio-Get] Invalid file:', file.name, err.message);
        }
      });
    }

    res.json({ urls });
  } catch (err) {
    console.error('[Audio-Get] Error:', err.message);
    logEvent('audio_get_error', { ip, error: err.message });
    res.status(500).json({ error: 'Erreur lors du chargement des sons.' });
  }
};
