/*
 * « ALLAH » DIT EN ARABE PAR LE NARRATEUR — À NE PAS DÉPLOYER.
 *
 *   node outils/voix-allah.js               → génère et met en ligne
 *   node outils/voix-allah.js --sans-depot  → fichiers seulement
 *
 * Le client (18 octobre) : dans tout le site et toutes les langues, quand
 * le texte dit « Allah » (Аллах, अल्लाह, 真主…), la voix doit dire l'arabe
 * الله ; « ﷻ » se dit جَلَّ جَلَالُهُ ; « an-niyyah » est remplacé dans le
 * texte par النِّيَّة. Liste : outils/voix-allah.json (relevé du banc :
 * introduction et bonus, 13 langues, textes contenant Allah ou un de ces
 * signes) — `dire` = le texte avec ces remplacements (ﷺ → صَلَّى اللَّهُ
 * عَلَيْهِ وَسَلَّمَ), puis `pourLaVoix` pour les lettres seules.
 * v3.3.9 : + la doua de l'introduction avec « رَبِّ زِدْنِي عِلْمَا » (13 langues),
 * et la phrase du tanwin en français, le son écrit « n' » (essai choisi
 * par le client : la voix disait « èn »).
 * Narrateur, eleven_v4, [calm]. La clé = le texte tel que `speakText` le
 * reçoit (« long| » + hachage au-delà de 180 caractères / 360 octets, comme
 * `_clesSon` dans app/app.html).
 */
const fs = require('fs');
const path = require('path');
const { pourLaVoix } = require('./arabe-pour-la-voix.js');

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
/* v3.4.3 : une autre liste en argument (node outils/voix-allah.js voix-correction.json),
   rangée dans son propre dossier — les fichiers déjà faits ne sont pas repris. */
const NOM = (process.argv.slice(2).find((a) => a.endsWith('.json')) || 'voix-allah.json');
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, NOM), 'utf8'));
const sansDepot = process.argv.includes('--sans-depot');
const dest = path.join(__dirname, 'captures', NOM.replace(/\.json$/, ''));
fs.mkdirSync(dest, { recursive: true });

(async () => {
  let car = 0, ok = 0, echecs = 0;
  for (const e of LISTE) {
    const k = cle(e.cle);
    /* `brut` (la doua) : pas de pourLaVoix, qui toucherait la basmala */
    const dire = (e.brut ? e.dire : pourLaVoix(e.dire)).replace(/\s+([:;!?])/g, '$1');
    const f = path.join(dest, e.langue + '-' + Buffer.from(k, 'utf8').toString('hex').slice(0, 100) + '.mp3');
    try {
      if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
        const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: '[calm] ' + dire, model_id: 'eleven_v4', language_code: e.langue,
            voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true },
          }),
        });
        if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        car += dire.length;
      }
      if (!sansDepot) {
        const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
      }
      ok++;
      console.log('ok', e.langue, dire.slice(0, 60));
    } catch (x) { echecs++; console.log('ECHEC', e.langue, e.cle.slice(0, 40), String(x.message).slice(0, 200)); }
  }
  console.log('\nTermine :', ok, 'ok,', echecs, 'echec(s),', car, 'caracteres generes.');
})();
