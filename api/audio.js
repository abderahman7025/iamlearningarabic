const { createClient } = require('@supabase/supabase-js');
const { applyMiddleware, isAdminRequest, isAdminIpAllowed, rateLimit, logEvent, getClientIp } = require('./_security');

/**
 * Les enregistrements du studio, en lecture et en écriture.
 *
 *   GET  → la liste des sons disponibles (nom arabe → URL publique)
 *   POST → dépose un enregistrement (studio d'enregistrement, admin)
 *
 * Les deux moitiés étaient deux fonctions séparées (audio-get, audio-upload).
 * Le forfait Hobby de Vercel n'en accepte que douze par déploiement : elles
 * ont été réunies, le métier étant le même — le bucket « audio » de Supabase.
 *
 * Le nom du fichier est le mot arabe encodé en hexadécimal : un nom de
 * fichier ne peut pas contenir n'importe quel caractère.
 */

async function lireLesSons(req, res, ip) {
  // ── Rate limit : 30 requêtes / min par IP ────────────────────────────────
  const { limited, retryAfter } = rateLimit(ip, 'audio-get', 30, 60 * 1000);
  if (limited) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // On lit AUSSI `error` : sans ça un bucket absent ou une erreur de
    // permission renvoyait data=null, donc {urls:{}} avec un code 200,
    // impossible à distinguer d'un stockage réellement vide.
    const { data, error: listError } = await supabase.storage
      .from('audio')
      .list('', { limit: 1000 });

    if (listError) {
      console.error('[Audio] Storage list failed:', listError.message);
      logEvent('audio_get_error', { ip, error: listError.message });
      return res.status(500).json({ error: 'Erreur lors du chargement des sons.' });
    }

    // list() sur un bucket INEXISTANT renvoie [] sans erreur : indiscernable
    // d'un bucket vide. On ne lève le doute que dans ce cas (pas de requête
    // supplémentaire quand des sons existent).
    if (!data || data.length === 0) {
      const { error: bucketError } = await supabase.storage.getBucket('audio');
      if (bucketError) {
        console.error('[Audio] Bucket "audio" introuvable:', bucketError.message);
        logEvent('audio_get_no_bucket', { ip, error: bucketError.message });
        return res.status(500).json({ error: 'Stockage audio non configuré.' });
      }
    }

    const urls = {};
    if (data) {
      data.forEach(file => {
        try {
          const ar = Buffer.from(file.name.replace('.webm', ''), 'hex').toString('utf8');
          const { data: urlData } = supabase.storage.from('audio').getPublicUrl(file.name);
          urls[ar] = urlData.publicUrl;
        } catch (err) {
          // Ignore les fichiers invalides
          console.error('[Audio] Invalid file:', file.name, err.message);
        }
      });
    }

    res.json({ urls });
  } catch (err) {
    console.error('[Audio] Error:', err.message);
    logEvent('audio_get_error', { ip, error: err.message });
    res.status(500).json({ error: 'Erreur lors du chargement des sons.' });
  }
}

async function deposerUnSon(req, res, ip) {
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
    console.error('[Audio] Upload error:', err.message);
    logEvent('audio_upload_exception', { ip, error: err.message });
    res.status(500).json({ error: 'Erreur lors de l\'upload.' });
  }
}

module.exports = async (req, res) => {
  if (applyMiddleware(req, res)) return;

  const ip = getClientIp(req);
  if (req.method === 'GET') return lireLesSons(req, res, ip);
  if (req.method === 'POST') return deposerUnSon(req, res, ip);
  return res.status(405).json({ error: 'Method not allowed' });
};
