const { createClient } = require('@supabase/supabase-js');

/**
 * Maintient le projet Supabase actif.
 *
 * Les projets Supabase gratuits se mettent en pause après ~7 jours sans
 * activité sur la base. Cette fonction est appelée automatiquement chaque
 * jour par Vercel Cron (voir "crons" dans vercel.json) et fait une requête
 * minimale : cela suffit à compter comme activité.
 *
 * Elle ne lit aucune donnée personnelle et ne renvoie qu'un compteur.
 */
module.exports = async (req, res) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // requête la plus légère possible : on ne demande que le nombre de lignes
    const { count, error } = await supabase
      .from('users')
      .select('email', { count: 'exact', head: true });

    if (error) {
      console.error('[Keepalive] Supabase a répondu une erreur :', error.message);
      return res.status(500).json({ ok: false, error: 'db' });
    }

    console.log('[Keepalive] OK — base active, ' + count + ' compte(s)');
    return res.status(200).json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    console.error('[Keepalive] Exception :', err.message);
    return res.status(500).json({ ok: false, error: 'exception' });
  }
};
