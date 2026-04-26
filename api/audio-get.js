const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  const { data } = await supabase.storage
    .from('audio')
    .list('', { limit: 1000 });

  const urls = {};
  if (data) {
    data.forEach(file => {
      const ar = decodeURIComponent(file.name.replace('.webm', ''));
      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(file.name);
      urls[ar] = urlData.publicUrl;
    });
  }

  res.json({ urls });
};
