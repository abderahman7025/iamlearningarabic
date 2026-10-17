/*
 * La doua de l'introduction (ados/adultes), dite par le Narrateur — À NE PAS
 * DÉPLOYER (hors de api/ et public/).
 *
 *   node outils/voix-doua.js            → les 13 langues
 *   node outils/voix-doua.js fr en      → seulement celles-ci
 *   node outils/voix-doua.js --sans-depot
 *
 * Le client (17 octobre 2026) : la basmala est écrite EN ARABE dans le texte
 * envoyé à ElevenLabs, et le Narrateur la lit comme il faut ; puis il lit sa
 * traduction et « Seigneur, accroîs mes connaissances ».
 *
 * Les textes et leurs clés viennent de l'application elle-même
 * (`_texteDua()` langue par langue) : outils/doua-textes.json. Si une
 * traduction change dans app/app.html, régénérer ce fichier — la clé est le
 * texte exact.
 *
 * Pas de `pourLaVoix` ici : il est fait pour des lettres et des signes isolés
 * et remplacerait l'article « ال » au milieu des mots de la basmala.
 * Modèle eleven_v4 : c'est lui qui prononce bien l'arabe (ETAT, « LES VOIX »).
 */
const fs = require('fs');
const path = require('path');

function _hacheTexte(t) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  for (i = 0; i < t.length; i++) {
    c = t.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
}
const cle = (t) => ((t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) ? 'long|' + _hacheTexte(t) : t);

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU'; // Narrateur
const TEXTES = JSON.parse(fs.readFileSync(path.join(__dirname, 'doua-textes.json'), 'utf8'));
const sansDepot = process.argv.includes('--sans-depot');
const demandees = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const langues = demandees.length ? demandees : Object.keys(TEXTES);
const dest = path.join(__dirname, 'captures', 'voix-doua');
fs.mkdirSync(dest, { recursive: true });

/* Ce qu'on DIT : quelques traductions écrivent « Alla » (une ancienne
   correction de la synthèse du navigateur) — le Narrateur, lui, dit Allah. */
const aDire = (t) => t.replace(/\bAlla\b/g, 'Allah').replace(/\s+/g, ' ').trim();

(async () => {
  let car = 0, echecs = 0;
  for (const l of langues) {
    const t = TEXTES[l] && TEXTES[l].texte;
    if (!t) { console.log('langue inconnue', l); continue; }
    const k = cle(t);
    const f = path.join(dest, l + '.mp3');
    try {
      if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
        const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: '[calm] ' + aDire(t), model_id: 'eleven_v4', language_code: l,
            voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true },
          }),
        });
        if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        car += t.length;
      }
      if (!sansDepot) {
        const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
      }
      console.log('ok', l, t.length + ' car.', '→', f);
    } catch (e) { echecs++; console.log('ECHEC', l, String(e.message).slice(0, 200)); }
  }
  console.log('langues', langues.length, 'caracteres generes', car, 'echecs', echecs);
})();
