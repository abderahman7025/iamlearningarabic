/*
 * Les LETTRES et leurs VARIANTES dites par le Narrateur — À NE PAS DÉPLOYER.
 *
 *   node outils/voix-lettres.js ب ع ق        → essai sur ces lettres, fichiers
 *                                              seulement (rien en ligne)
 *   node outils/voix-lettres.js tout          → les 30 lettres, fichiers seulement
 *   node outils/voix-lettres.js tout --depot  → et mise en ligne
 *
 * Liste : outils/voix-lettres.json (nom de la lettre + ses variantes, celles
 * des cours : بَ بَا بً بِ بِي بٍ بُ بُو بٌ بْ). Le nom est dit pour la lettre
 * seule (ETAT : l'IA dit « L » devant une lettre isolée), chaque variante
 * telle qu'écrite. Narrateur, eleven_v4, langue « ar ».
 *
 * ATTENTION — LE DÉPÔT REMPLACE LES SONS DU STUDIO : la clé d'une variante
 * (« بَ ») est celle de l'enregistrement fait par le client avec SA voix.
 * N'utiliser --depot qu'avec son accord explicite, après écoute de l'essai.
 * Les fichiers d'essai : outils/captures/voix-lettres/<lettre>/.
 */
const fs = require('fs');
const path = require('path');

const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU'; // Narrateur
const LISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'voix-lettres.json'), 'utf8'));
const depot = process.argv.includes('--depot');
const demandees = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const toutes = demandees.includes('tout') || !demandees.length;
const dest = path.join(__dirname, 'captures', 'voix-lettres');

(async () => {
  let ok = 0, echecs = 0, car = 0;
  for (const L of LISTE) {
    if (!toutes && !demandees.includes(L.ar)) continue;
    const dossier = path.join(dest, L.lat.replace(/[^\w]/g, '_') + '-' + Buffer.from(L.ar).toString('hex'));
    fs.mkdirSync(dossier, { recursive: true });
    const sons = [{ cle: L.ar, dire: L.nom, nom: '00-' + L.ar + '-nom' }]
      .concat(L.variantes.map((v, i) => ({ cle: v[0], dire: v[0], nom: String(i + 1).padStart(2, '0') + '-' + v[1] })));
    for (const s of sons) {
      const f = path.join(dossier, s.nom.replace(/[\\/:*?"<>|]/g, '_') + '.mp3');
      try {
        if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
          const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
            method: 'POST',
            headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({ text: s.dire, model_id: 'eleven_v4', language_code: 'ar',
              voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
          });
          if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
          fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
          car += s.dire.length;
        }
        if (depot) {
          const r2 = await fetch('https://iamlearningarabic.com/api/audio', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ar: s.cle, audioBase64: fs.readFileSync(f).toString('base64') }),
          });
          if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
        }
        ok++; console.log('ok', s.nom);
      } catch (e) { echecs++; console.log('ECHEC', s.nom, String(e.message).slice(0, 200)); }
    }
  }
  console.log('\nTermine :', ok, 'ok,', echecs, 'echec(s),', car, 'caracteres generes.');
  console.log(depot ? 'Mis en ligne.' : 'Rien n\'a ete mis en ligne : ecoute les fichiers dans outils\\captures\\voix-lettres');
})();
