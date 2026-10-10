/*
 * Voix de l'interface 3-5 ans dans une autre langue — À NE PAS DÉPLOYER.
 *
 *   node outils/voix-petit.js outils/captures/petit-en.json en eleven_v4 [--sans-depot]
 *
 * Le fichier vient du banc : { o:{phrase française: traduction}, album:[[nom
 * fr, nom traduit, phrase d'album traduite]] }, calculé avec `te()` et
 * `teF()` dans la langue voulue (voir ETAT.md, v3.0.4).
 *
 * L'ÉMOTION de chaque phrase est celle que le client a écrite pour le
 * français dans `Bureau/phrases-3-5-ans.txt` (numéro | phrase | émotion) :
 * on la relit ici, et on la traduit en balise. La clé déposée est
 * « petit| » + la phrase TRADUITE — celle que `_clesSon` cherche quand
 * `st.age==='petit'`.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU'; // Narrateur
const inv = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const langue = process.argv[3];
const modele = process.argv[4] || 'eleven_v4';
const sansDepot = process.argv.includes('--sans-depot');
const dest = path.join(__dirname, 'captures', 'voix-petit-' + langue);
fs.mkdirSync(dest, { recursive: true });

const BALISE = {
  'chaleureux': '[warmly]', 'chaleureux, sans reproche': '[warmly]',
  'enthousiaste': '[enthusiastic]', 'très enthousiaste': '[very excited]',
  'encourageant': '[encouraging]', 'excité': '[excited]',
  'très excité, la voix qui monte': '[very excited]',
  'joueur': '[playfully]', 'curieux': '[curious]', 'curieux, joueur': '[curious] [playfully]',
  'admiratif': '[impressed]', 'très joyeux': '[joyfully]', 'émerveillé': '[amazed]',
  'fier, puis doux': '[proudly]',
};
/* les émotions du client, par phrase française (la première ligne gagne) */
const emotion = {};
const liste = path.join(os.homedir(), 'Desktop', 'phrases-3-5-ans.txt');
fs.readFileSync(liste, 'utf8').replace(/^﻿/, '').split(/\r?\n/).forEach((l) => {
  const p = l.split(' | ');
  if (p.length < 3 || !/^\d+$/.test(p[0].trim())) return;
  const fr = p[1].replace(/\s*SON\s*\??\s*$/, '').trim();
  if (!(fr in emotion)) emotion[fr] = p[2].trim();
});
emotion['Éclate les ballons avec la lettre'] = emotion['Éclate les bulles avec la lettre'] || 'excité';

const lot = [];
Object.keys(inv.o).forEach((fr) => lot.push({ fr, tr: inv.o[fr], emo: emotion[fr] || 'chaleureux' }));
inv.album.forEach((a) => lot.push({ fr: 'album ' + a[0], tr: a[2], emo: 'très enthousiaste' }));

(async () => {
  let car = 0; const rates = []; const sans = lot.filter((x) => !BALISE[x.emo]).map((x) => x.emo);
  if (sans.length) console.log('émotions sans balise :', [...new Set(sans)]);
  for (const x of lot) {
    const cle = 'petit|' + x.tr;
    const f = path.join(dest, Buffer.from(cle).toString('hex').slice(0, 90) + '.mp3');
    let texte = (BALISE[x.emo] || '[warmly]') + ' ' + x.tr;
    /* « fier, puis doux » : la seconde phrase se dit doucement */
    if (x.emo === 'fier, puis doux') texte = texte.replace(/([.!])\s+([^.!?]+\?)\s*$/, '$1 [softly] $2');
    try {
      if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
        const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: texte, model_id: modele, language_code: langue,
            voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
        });
        if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        car += x.tr.length;
      }
      if (!sansDepot) {
        const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: cle, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
      }
      console.log('ok', x.emo.replace(/[^\x20-\x7e]/g, '?'), '|', x.tr);
    } catch (e) { rates.push(cle); console.log('ECHEC', x.tr, String(e.message).slice(0, 200)); }
  }
  console.log('phrases', lot.length, 'caracteres generes', car, 'echecs', rates.length);
})();
