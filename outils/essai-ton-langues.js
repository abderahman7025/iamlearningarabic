/*
 * ESSAI — une phrase par langue (la ḍamma qui ressemble à un petit wāw), en
 * v4 POSÉ puis CHALEUREUX, noms en arabe pour la voix. Rien en ligne.
 *   node outils/essai-ton-langues.js      ~1 000 caractères
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
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
const NOMS = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', nl: 'Néerlandais', it: 'Italien', pt: 'Portugais',
  ru: 'Russe', tr: 'Turc', zh: 'Chinois', id: 'Indonésien', hi: 'Hindi' };
const dest = path.join(__dirname, 'captures', 'essai-ton-langues');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  let h = '<!doctype html><meta charset="utf-8"><title>Posé ou chaleureux</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:720px;margin:auto"><h2>Une phrase par langue : posé, puis chaleureux</h2>'
    + '<button id="go" style="position:fixed;top:12px;right:12px;font-size:1.1rem;padding:12px 18px;border-radius:12px;border:0;background:#1e88e5;color:#fff">▶ Tout écouter</button>';
  for (const lg of Object.keys(NOMS)) {
    const L = data[lg] || [];
    /* la phrase de la ḍamma et du wāw : la plus parlante pour les noms */
    const x = L.find((y) => pourLaVoix(y.t, lg).indexOf(AR.damma) >= 0 && pourLaVoix(y.t, lg).indexOf(AR.waw) >= 0)
      || L.find((y) => pourLaVoix(y.t, lg) !== y.t);
    if (!x) continue;
    const dit = pourLaVoix(x.t, lg);
    h += '<div style="background:#fff;padding:10px 14px;border-radius:12px;margin:12px 0"><b>' + NOMS[lg] + '</b> — ' + x.t
      + '<br><small style="color:#678">dit : ' + dit + '</small>';
    for (const [nom, balise] of [['posé', '[calm]'], ['chaleureux', '[warmly]']]) {
      const f = lg + '-' + (balise === '[calm]' ? 'pose' : 'chaud') + '.mp3';
      if (!fs.existsSync(path.join(dest, f))) {
        const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
          method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: balise + ' ' + dit, model_id: 'eleven_v4', language_code: lg,
            voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
        });
        if (!r.ok) { console.log('ECHEC', lg, nom, r.status, (await r.text()).slice(0, 160)); continue; }
        fs.writeFileSync(path.join(dest, f), Buffer.from(await r.arrayBuffer()));
      }
      console.log('ok', lg, nom);
      h += '<p style="margin:6px 0 0">' + nom + '<br><audio controls src="' + f + '"></audio></p>';
    }
    h += '</div>';
  }
  h += '<script>var L=[].slice.call(document.querySelectorAll("audio")),i=0;function joue(){document.querySelectorAll("div").forEach(function(d){d.style.outline="";});if(i>=L.length)return;var a=L[i],d=a.closest("div");'
    + 'd.style.outline="4px solid #1e88e5";d.scrollIntoView({block:"center",behavior:"smooth"});a.onended=function(){i++;setTimeout(joue,700);};a.play().catch(function(){});}'
    + 'document.getElementById("go").onclick=function(){i=0;joue();};setTimeout(joue,600);<\/script>';
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
