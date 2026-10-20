/*
 * Voix 6-11 ans : les phrases à NOMS ARABES (v4 CHALEUREUX, comme le reste) — À NE PAS DÉPLOYER (hors de api/ et public/).
 *
 * Choix du client (20 octobre, après l'essai `essai-ton-6-11.js`) : « v4 posé
 * arabe ». Les phrases françaises des 6-11 ans passent du v4 chaleureux
 * ([warmly]) au v4 POSÉ ([calm], comme l'adulte), et les noms de lettres et de
 * voyelles écrits en lettres latines sont envoyés à la voix EN ARABE — sinon
 * elle les lit à la française (« fata », « vaw »). Le texte affiché et la clé
 * ne changent pas.
 *
 *   node outils/voix-6-11-pose.js outils/voix-6-11-noms.json --sans-depot   (écoute)
 *   node outils/voix-6-11-pose.js outils/voix-6-11-noms.json                (mise en ligne)
 * Choix final du client : CHALEUREUX ([warmly]) + noms en arabe, seulement
 * les 25 phrases concernées.
 *
 * Avant d'écraser, l'enregistrement actuel est téléchargé dans
 * captures/voix-6-11-pose/avant/ (retour arrière possible).
 * La clé : copie de `_clesSon` (voir voix-adulte.js).
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
const SITE = 'https://iamlearningarabic.com';
const liste = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const sansDepot = process.argv.includes('--sans-depot');
const dest = path.join(__dirname, 'captures', 'voix-6-11-pose');
const avant = path.join(dest, 'avant');
fs.mkdirSync(avant, { recursive: true });

/* Les noms écrits en latin, dits en arabe. Mots entiers seulement. */
const NOMS = [
  [/\bfat[hḥ]as?\b/gi, 'فَتْحَة'], [/\bdammas?\b/gi, 'ضَمَّة'], [/\bkasras?\b/gi, 'كَسْرَة'],
  [/\bsoukoune?s?\b/gi, 'سُكُون'], [/\bchaddah?s?\b/gi, 'شَدَّة'], [/\btanw[iî]ne?s?\b/gi, 'تَنْوِين'],
  [/\bw[aā]w\b/gi, 'وَاو'], [/\balif\b/gi, 'أَلِف'], [/\by[aā]\b/gi, 'يَاء'],
  /* hamzah : laissé en lettres latines — le client l'a choisi à l'oreille
     (« hamzah », chaleureux) ; en arabe la voix disait un ḥ fort. */
];
const enArabe = (t) => {
  /* Le client : « la phrase 16 se lit bien avec le déterminant "la" devant
     kasra ; mets-le aussi pour la damma et la fatha ». Pour la voix seulement :
     à l'écran, la voyelle est dessinée. */
  t = t.replace(/^(fat[hḥ]a|damma|kasra) est prolongé/i, 'la $1 est prolongé');
  NOMS.forEach(([re, ar]) => { t = t.replace(re, ar); });
  /* Le son du tanwin : « n' » — c'est la façon que le client a validée pour
     le français (voir voix-correction.json), sinon la voix dit « èn ». */
  t = t.replace(/\bson n\b(?!')/g, 'son « n\' »');
  return t;
};
const aDire = (t) => t.replace(/\s*•\s*/g, ' ').replace(/\s+([.,])/g, '$1').replace(/\.(?=[A-ZÀ-Ü])/g, '. ').replace(/\s+/g, ' ').trim();

(async () => {
  let urls = {};
  try { urls = (await (await fetch(SITE + '/api/audio')).json()).urls || {}; } catch (e) { console.log('liste en ligne illisible :', e.message); }
  /* --refaire=14,15,16 : ces numéros (1 = première phrase) sont regénérés */
  const _rf = (process.argv.find((x) => x.indexOf('--refaire=') === 0) || '').slice(10).split(',').map(Number).filter(Boolean);
  const _mo = (process.argv.find((x) => x.indexOf('--montrer=') === 0) || '').slice(10).split(',').map(Number).filter(Boolean);
  _rf.forEach((n) => { const t = liste[n - 1]; if (!t) return;
    const f0 = path.join(dest, Buffer.from(cle(t)).toString('hex').slice(0, 80) + '.mp3');
    if (fs.existsSync(f0)) fs.unlinkSync(f0); });
  let car = 0; const rates = [];
  for (const t of liste) {
    const k = cle(t);
    const nom = Buffer.from(k).toString('hex').slice(0, 80) + '.mp3';
    const f = path.join(dest, nom);
    try {
      /* l'ancien, gardé de côté */
      const fa = path.join(avant, nom);
      if (urls[k] && !fs.existsSync(fa)) {
        const ra = await fetch(urls[k]); if (ra.ok) fs.writeFileSync(fa, Buffer.from(await ra.arrayBuffer()));
      }
      if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
        const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
          method: 'POST',
          headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: '[warmly] ' + enArabe(aDire(t)), model_id: 'eleven_v4', language_code: 'fr',
            voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true },
          }),
        });
        if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        car += t.length;
      }
      if (!sansDepot) {
        const r2 = await fetch(SITE + '/api/audio', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }),
        });
        if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
      }
      console.log('ok', t.slice(0, 60));
    } catch (e) { rates.push(t); console.log('ECHEC', t.slice(0, 40), String(e.message).slice(0, 200)); }
  }
  console.log('\nphrases', liste.length, '- caracteres generes', car, '- echecs', rates.length);
  let h = '<!doctype html><meta charset="utf-8"><title>Voix 6-11</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:720px;margin:auto"><h2>' + (sansDepot ? 'À écouter avant mise en ligne' : 'Mis en ligne') + '</h2>';
  /* Avec --refaire, la page ne montre QUE les phrases refaites. */
  liste.forEach((t, i) => {
    const _vu = _mo.length ? _mo : _rf;
    if (_vu.length && _vu.indexOf(i + 1) < 0) return;
    const nom = Buffer.from(cle(t)).toString('hex').slice(0, 80) + '.mp3';
    h += '<div style="background:#fff;padding:10px 14px;border-radius:12px;margin:10px 0"><b>' + (i + 1) + '.</b> ' + t
      + '<br><small style="color:#567">dit : ' + enArabe(aDire(t)) + '</small><br>'
      + (fs.existsSync(path.join(avant, nom)) ? 'avant <audio controls src="avant/' + nom + '"></audio><br>' : '')
      /* ?v= : sans lui, Chrome rejoue l'ancien son gardé en mémoire quand une
         phrase est refaite sous le même nom de fichier. */
      + 'nouveau <audio controls src="' + nom + '?v=' + (fs.existsSync(path.join(dest, nom)) ? Math.round(fs.statSync(path.join(dest, nom)).mtimeMs) : 0) + '"></audio></div>';
  });
  /* Lecture à la suite : les 25 nouveaux sons s'enchaînent, la phrase en
     cours est surlignée. Chrome refuse parfois de jouer sans un premier
     clic : le bouton est là pour ça. */
  h += '<button id="go" style="position:fixed;top:12px;right:12px;font-size:1.1rem;padding:12px 18px;border-radius:12px;border:0;background:#1e88e5;color:#fff;cursor:pointer">▶ Tout écouter</button>'
    + '<script>var L=[].slice.call(document.querySelectorAll("audio")).filter(function(a){return a.getAttribute("src").indexOf("avant/")<0;}),i=0;'
    + 'function joue(){if(i>=L.length){document.getElementById("go").textContent="✔ Fini";return;}'
    + 'document.querySelectorAll("div").forEach(function(d){d.style.outline="";});var a=L[i],d=a.closest("div");d.style.outline="4px solid #1e88e5";d.scrollIntoView({block:"center",behavior:"smooth"});'
    + 'a.onended=function(){i++;setTimeout(joue,700);};a.play().catch(function(){document.getElementById("go").textContent="▶ Tout écouter (clique)";});}'
    + 'document.getElementById("go").onclick=function(){i=0;joue();};setTimeout(joue,600);<\/script>';
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
