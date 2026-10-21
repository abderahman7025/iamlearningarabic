/*
 * Voix 6-11 ans, 11 LANGUES : les phrases qui contiennent un nom de lettre ou
 * de voyelle (outils/voix-6-11-langues.json), refaites en eleven_v4 avec les
 * noms envoyés à la voix EN ARABE — comme le français (20-21 octobre).
 * Ton : [calm], celui de ces langues aujourd'hui (le français seul est en
 * [warmly], choix du client). « hamza » reste écrit tel quel (choix du client
 * à l'oreille en français). Le son du tanwin : نْ, sauf hindi « न' ».
 *
 *   node outils/voix-6-11-langues-gen.js --sans-depot      génère + page d'écoute
 *   node outils/voix-6-11-langues-gen.js                   met en ligne (ne regénère rien)
 *   option --langue=en,es    seulement ces langues
 *   option --refaire=en:3,ru:7   regénère ces numéros
 */
const fs = require('fs');
const path = require('path');
function hache(t) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  for (i = 0; i < t.length; i++) { c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
}
const cle = (t) => ((t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) ? 'long|' + hache(t) : t);
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const SITE = 'https://iamlearningarabic.com';
const AR = { fatha: 'فَتْحَة', kasra: 'كَسْرَة', damma: 'ضَمَّة', soukoun: 'سُكُون', chadda: 'شَدَّة', tanwin: 'تَنْوِين',
  alif: 'أَلِف', waw: 'وَاو', ya: 'يَاء' };
/* Les noms, par alphabet. Un « mot » se borne par des lettres de TOUS les
   alphabets (\p{L}) : `\b` ne connaît que l'ASCII, et ratait ḍamma, Ötre,
   şedde. Les terminaisons (russe : фатхи, алифом…) partent avec le mot. */
const W = (motif, fin) => new RegExp('(?<![\\p{L}\\p{M}])(?:' + motif + ')' + (fin || '') + '(?![\\p{L}\\p{M}])', 'giu');
const LATIN = [
  [W('fat[hḥ]ah?s?'), AR.fatha], [W('kasrah?s?'), AR.kasra], [W('[dḍ]ammah?s?'), AR.damma],
  [W('suk[uū]n'), AR.soukoun], [W('sh?add?ah?|šadda|schadda|syaddah'), AR.chadda], [W('tanw[iī]n'), AR.tanwin],
  [W('alif'), AR.alif], [W('w[aā]w|wau'), AR.waw], [new RegExp('(?<![\\p{L}])(?:y[aā]|Yā)(?![\\p{L}])', 'gu'), AR.ya],
];
const PAR_LANGUE = {
  de: [[new RegExp('(?<![\\p{L}])Ya(?![\\p{L}])', 'gu'), AR.ya]],
  tr: [[W('fet[hḥ]a', '\\p{L}*'), AR.fatha], [W('esre', '\\p{L}*'), AR.kasra], [W('ötre', '\\p{L}*'), AR.damma],
       [W('sükûn', '\\p{L}*'), AR.soukoun], [W('şedde', '\\p{L}*'), AR.chadda], [W('tenvin', '\\p{L}*'), AR.tanwin],
       [W('elif', '\\p{L}*'), AR.alif], [W('vav', '\\p{L}*'), AR.waw], [W('ye(nin|yi|ye)?'), AR.ya]],
  ru: [[W('фатх', '[а-яё]*'), AR.fatha], [W('каср', '[а-яё]*'), AR.kasra], [W('дамм', '[а-яё]*'), AR.damma],
       [W('сукун', '[а-яё]*'), AR.soukoun], [W('шадд', '[а-яё]*'), AR.chadda], [W('танвин', '[а-яё]*'), AR.tanwin],
       [W('алиф', '[а-яё]*'), AR.alif], [W('вав', '[а-яё]*'), AR.waw], [W('йа'), AR.ya]],
  zh: [[/法特哈/g, AR.fatha], [/卡斯拉/g, AR.kasra], [/达姆/g, AR.damma], [/静符/g, AR.soukoun], [/沙达/g, AR.chadda],
       [/艾利夫/g, AR.alif], [/瓦乌/g, AR.waw], [/亚/g, AR.ya]],
  hi: [[/फ़तहा/g, AR.fatha], [/कसरा/g, AR.kasra], [/ज़म्मा/g, AR.damma], [/सुकून/g, AR.soukoun], [/शद्दा/g, AR.chadda],
       [/तनवीन/g, AR.tanwin], [/अलिफ़/g, AR.alif], [/वाव/g, AR.waw],
       /* « या » est aussi « ou » : seulement là où c'est la lettre */
       [/(^|\s)या(?=\s(के|पर|लंबा|को))/g, '$1' + AR.ya]],
};
function pourLaVoix(t, lg) {
  (PAR_LANGUE[lg] || []).forEach(([re, ar]) => { t = t.replace(re, ar); });
  if (lg !== 'tr' && lg !== 'hi') LATIN.forEach(([re, ar]) => { t = t.replace(re, ar); });
  /* le son du tanwin */
  t = lg === 'hi' ? t.replace(/\bn\b(?!')/g, "न'") : t.replace(/(^|[\s«"(])n(?=[\s»",.)]|$)/g, '$1نْ');
  return t;
}
const data = require('./voix-6-11-langues.json');
const sansDepot = process.argv.includes('--sans-depot');
const arg = (n) => (process.argv.find((x) => x.indexOf('--' + n + '=') === 0) || '').slice(n.length + 3);
const langues = arg('langue') ? arg('langue').split(',') : Object.keys(data);
const refaire = {}; arg('refaire').split(',').filter(Boolean).forEach((x) => { const [l, n] = x.split(':'); (refaire[l] = refaire[l] || []).push(+n); });
const dest = path.join(__dirname, 'captures', 'voix-6-11-langues');
const NOMS = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', nl: 'Néerlandais', it: 'Italien', pt: 'Portugais',
  ru: 'Russe', tr: 'Turc', zh: 'Chinois', id: 'Indonésien', hi: 'Hindi' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  let urls = {};
  try { urls = (await (await fetch(SITE + '/api/audio')).json()).urls || {}; } catch (e) { console.log('liste en ligne illisible :', e.message); }
  let car = 0, rates = 0;
  let h = '<!doctype html><meta charset="utf-8"><title>Voix 6-11 — langues</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:760px;margin:auto">'
    + '<h2>' + (sansDepot ? 'À écouter avant mise en ligne' : 'Mis en ligne') + '</h2><p>Un bouton par langue lit les NOUVEAUX sons à la suite.</p>';
  for (const lg of langues) {
    const L = data[lg] || []; if (!L.length) continue;
    const dl = path.join(dest, lg), av = path.join(dl, 'avant');
    fs.mkdirSync(av, { recursive: true });
    h += '<section id="' + lg + '"><h3 style="display:flex;gap:12px;align-items:center">' + (NOMS[lg] || lg)
      + ' <button onclick="lis(\'' + lg + '\')" style="font-size:1rem;padding:8px 14px;border-radius:10px;border:0;background:#1e88e5;color:#fff;cursor:pointer">▶ Lire</button></h3>';
    for (const x of L) {
      /* Rien à dire en arabe dans la phrase (« hamza », un faux ami) : on n'y
         touche pas, elle est déjà en v4 posé. */
      if (pourLaVoix(x.t, lg) === x.t) continue;
      const t = x.t, k = cle(t), nom = Buffer.from(k).toString('hex').slice(0, 80) + '.mp3';
      const f = path.join(dl, nom), fa = path.join(av, nom);
      try {
        if (urls[k] && !fs.existsSync(fa)) { const ra = await fetch(urls[k]); if (ra.ok) fs.writeFileSync(fa, Buffer.from(await ra.arrayBuffer())); }
        if ((refaire[lg] || []).indexOf(x.n) >= 0 && fs.existsSync(f)) fs.unlinkSync(f);
        if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
          const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
            method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({ text: '[calm] ' + pourLaVoix(t, lg), model_id: 'eleven_v4', language_code: lg,
              voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
          });
          if (!r.ok) throw new Error('generation ' + r.status + ' ' + (await r.text()).slice(0, 160));
          fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); car += t.length;
        }
        if (!sansDepot) {
          const r2 = await fetch(SITE + '/api/audio', { method: 'POST',
            headers: { Authorization: 'Bearer ' + env.ADMIN_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ar: k, audioBase64: fs.readFileSync(f).toString('base64') }) });
          if (!r2.ok) throw new Error('depot ' + r2.status + ' ' + (await r2.text()).slice(0, 160));
        }
        console.log('ok', lg, x.n, t.slice(0, 50));
      } catch (e) { rates++; console.log('ECHEC', lg, x.n, String(e.message).slice(0, 200)); }
      const v = fs.existsSync(f) ? Math.round(fs.statSync(f).mtimeMs) : 0;
      h += '<div style="background:#fff;padding:8px 12px;border-radius:10px;margin:6px 0"><b>' + x.n + '.</b> ' + esc(t)
        + '<br><small style="color:#678">dit : ' + esc(pourLaVoix(t, lg)) + '</small><br>'
        + 'nouveau <audio class="neuf" controls preload="none" src="' + lg + '/' + nom + '?v=' + v + '"></audio>'
        + (fs.existsSync(fa) ? ' avant <audio controls preload="none" src="' + lg + '/avant/' + nom + '"></audio>' : '') + '</div>';
    }
    h += '</section>';
  }
  h += '<script>var cours=null;function lis(lg){if(cours)cours.pause();var L=[].slice.call(document.querySelectorAll("#"+lg+" audio.neuf")),i=0;'
    + 'function un(){document.querySelectorAll("div").forEach(function(d){d.style.outline="";});if(i>=L.length)return;var a=L[i];cours=a;var d=a.closest("div");'
    + 'd.style.outline="4px solid #1e88e5";d.scrollIntoView({block:"center",behavior:"smooth"});a.onended=function(){i++;setTimeout(un,600);};a.play().catch(function(){i++;un();});}un();}<\/script>';
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  console.log('\ncaracteres generes', car, '- echecs', rates);
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
