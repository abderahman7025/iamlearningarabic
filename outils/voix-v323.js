/*
 * Les voix qui manquaient à l'interface ados/adultes (v3.2.3) — À NE PAS
 * DÉPLOYER (hors de api/ et public/).
 *
 *   node outils/voix-v323.js                → tout
 *   node outils/voix-v323.js bonus          → un groupe (bonus, explications, 200-questions)
 *   node outils/voix-v323.js --sans-depot   → fichiers seulement, rien en ligne
 *
 * Liste : outils/voix-v323.json, tirée d'un relevé du banc (chaque page
 * adulte, 13 langues, tous les `onclick`) comparé aux sons EN LIGNE :
 *  - bonus : les titres arabes et les trois exemples de « لَفْظُ الْجَلَالَةِ »,
 *    dits SANS la voyelle finale du dernier mot (demande du client : innahu
 *    llaah, allaahu akbar, ittaqi llaah) ;
 *  - explications : les deux phrases sous les versets (solaire / lunaire),
 *    12 langues — l'ourdou reste de côté (ETAT, v3.0.8) ; l'arabe y est
 *    écrit en toutes lettres par `pourLaVoix` ;
 *  - 200-questions : les mots arabes (de VRAIS mots depuis la v3.2.5), dits en
 *    entier, voyelles comprises ; ceux déjà enregistrés au studio sont exclus.
 * Narrateur, eleven_v4, [calm]. La clé = le texte affiché (« long| » + hachage
 * au-delà de 180 caractères / 360 octets, comme `_clesSon`).
 */
const fs = require('fs');
const path = require('path');
const { pourLaVoix } = require('./arabe-pour-la-voix.js');

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU'; // Narrateur
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'voix-v323.json'), 'utf8'));
const sansDepot = process.argv.includes('--sans-depot');
const groupes = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dest = path.join(__dirname, 'captures', 'voix-v323');
fs.mkdirSync(dest, { recursive: true });
const nomFichier = (k) => Buffer.from(k, 'utf8').toString('hex').slice(0, 120) + '.mp3';

(async () => {
  let car = 0, ok = 0, echecs = 0;
  for (const e of LISTE) {
    if (groupes.length && !groupes.includes(e.groupe)) continue;
    const dire = e.mixte ? pourLaVoix(e.texte).replace(/\s+([:;!?])/g, '$1') : e.dire;
    const f = path.join(dest, e.groupe + '-' + nomFichier(e.cle));
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
          body: JSON.stringify({ ar: e.cle, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
      }
      ok++;
      console.log('ok', e.groupe, e.langue, dire.slice(0, 60));
    } catch (x) { echecs++; console.log('ECHEC', e.groupe, e.langue, (e.dire || e.texte || '').slice(0, 40), String(x.message).slice(0, 200)); }
  }
  console.log('\nTermine :', ok, 'ok,', echecs, 'echec(s),', car, 'caracteres generes.');
})();
