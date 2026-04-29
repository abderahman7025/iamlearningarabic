const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { ar, audioBase64 } = req.body;

  if (!ar || !audioBase64) return res.status(400).json({ error: 'Données manquantes' });

  const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = Buffer.from(ar).toString('hex') + '.webm';

  const { error } = await supabase.storage
    .from('audio')
    .upload(fileName, buffer, { contentType: 'audio/webm', upsert: true });

  if (error) return res.status(500).json({ error: error.message });
  
  const { data } = supabase.storage.from('audio').getPublicUrl(fileName);
  res.json({ success: true, url: data.publicUrl });
};
