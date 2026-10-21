/*
 * ESSAI — les 26 phrases des autres langues où ni l'ancien ni le nouveau son
 * ne vont (écoute du client, 21 octobre). Deux façons nouvelles par phrase :
 *   A — noms en arabe (comme le nouveau) + balise d'accent de la langue
 *       (« [Spanish accent] »…), contre l'accent français du Narrateur ;
 *   B — noms en lettres latines écrites pour l'oreille de la langue
 *       (« uau », « Kasrra », « वाउ »…).
 * Rien n'est mis en ligne. ~2 300 caractères.
 *   node outils/essai-langues-refaire.js
 */
const fs = require('fs');
const path = require('path');
const env = {};
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
});
const VOIX = 'Wm3eSTpNFfFtDgCxf6AU';
const data = require('./voix-6-11-langues.json');
const ACCENT = { es: 'Spanish', de: 'German', nl: 'Dutch', pt: 'European Portuguese', ru: 'Russian', id: 'Indonesian', hi: 'Hindi' };
const NOMS = { es: 'Espagnol', de: 'Allemand', nl: 'Néerlandais', pt: 'Portugais', ru: 'Russe', id: 'Indonésien', hi: 'Hindi' };
const A_REFAIRE = { es: [4, 17, 25, 26, 27], de: [7, 8, 9, 11, 16, 19, 24], nl: [14, 16], pt: [5, 13, 14, 15, 23],
  ru: [24], id: [1], hi: [1, 9, 11, 13, 25] };
const AR = { fatha: 'فَتْحَة', kasra: 'كَسْرَة', damma: 'ضَمَّة', soukoun: 'سُكُون', chadda: 'شَدَّة', alif: 'أَلِف', waw: 'وَاوْ', ya: 'يَاء' };
/* A : les noms en arabe (wāw avec soukoun : sans lui, « wawf ») */
const enArabe = {
  es: [[/fat[hḥ]a/gi, AR.fatha], [/kasra/gi, AR.kasra], [/[dḍ]amma/gi, AR.damma], [/shadda/gi, AR.chadda], [/alif/gi, AR.alif], [/\bwaw\b/gi, AR.waw], [/(la )ya\b/gi, '$1' + AR.ya]],
  de: [[/Fat[hḥ]a/g, AR.fatha], [/Kasra/g, AR.kasra], [/Ḍamma|Damma/g, 'ضَمَّهْ'], [/Alif/g, AR.alif], [/W[aā]w/g, AR.waw], [/Yā|Ya\b/g, AR.ya]],
  nl: [[/fat[hḥ]a/gi, AR.fatha], [/kasra/gi, AR.kasra]],
  pt: [[/fat[hḥ]a/gi, AR.fatha], [/kasra/gi, AR.kasra], [/[dḍ]amma/gi, AR.damma], [/\bwaw\b/gi, AR.waw]],
  ru: [[/вавом/g, AR.waw]],
  id: [[/bunyi n\./, 'bunyi نْ.']],
  hi: [[/\bn\b/g, 'نْ'], [/ज़म्मा/g, AR.damma], [/वाव/g, AR.waw], [/अलिफ़/g, AR.alif], [/कसरा/g, AR.kasra]],
};
/* B : les noms en lettres latines (ou dans l'écriture de la langue), écrits
   pour être bien dits : r roulé (rr), w prononcé « ou », ḥ séparé. */
const pourOreille = {
  es: [[/fat[hḥ]a/gi, 'fat-ha'], [/kasra/gi, 'kasrra'], [/shadda/gi, 'shad-da'], [/alif/gi, 'álif'], [/\bwaw\b/gi, 'uau'], [/(la )ya\b/gi, '$1yá']],
  de: [[/Fat[hḥ]a/g, 'Fat-ha'], [/Kasra/g, 'Kasrra'], [/Ḍamma/g, 'Damma'], [/Alif/g, 'Alif'], [/W[aā]w/g, 'Uau'], [/Yā/g, 'Ja']],
  nl: [[/fat[hḥ]a/gi, 'fat-ha'], [/kasra/gi, 'kasrra']],
  pt: [[/fat[hḥ]a/gi, 'fát-ha'], [/kasra/gi, 'kásrra'], [/[dḍ]amma/gi, 'dámma'], [/\bwaw\b/gi, 'uáu']],
  ru: [[/вавом/g, 'уау']],
  id: [[/bunyi n\./, "bunyi 'n'."]],
  hi: [[/\bn\b/g, 'न्'], [/वाव/g, 'वाउ'], [/कसरा/g, 'कस्रा']],
};
const remplace = (t, regles) => { (regles || []).forEach(([re, r]) => { t = t.replace(re, r); }); return t; };
const dest = path.join(__dirname, 'captures', 'essai-langues-refaire');
fs.mkdirSync(dest, { recursive: true });
(async () => {
  let h = '<!doctype html><meta charset="utf-8"><title>Phrases à refaire</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:760px;margin:auto">'
    + '<h2>Phrases à refaire : façon A puis façon B</h2><p>Pour chaque phrase, dis A, B, ou aucune.</p>'
    + '<button id="go" style="position:fixed;top:12px;right:12px;font-size:1.1rem;padding:12px 18px;border-radius:12px;border:0;background:#1e88e5;color:#fff">▶ Tout écouter</button>';
  for (const lg of Object.keys(A_REFAIRE)) {
    h += '<h3>' + NOMS[lg] + '</h3>';
    for (const n of A_REFAIRE[lg]) {
      const x = (data[lg] || []).find((y) => y.n === n); if (!x) continue;
      const vA = remplace(x.t, enArabe[lg]), vB = remplace(x.t, pourOreille[lg]);
      h += '<div style="background:#fff;padding:8px 12px;border-radius:10px;margin:6px 0"><b>' + lg + ' ' + n + '.</b> ' + x.t;
      for (const [nom, texte, balise] of [['A', vA, '[calm] [' + ACCENT[lg] + ' accent]'], ['B', vB, '[calm]']]) {
        const f = lg + '-' + n + '-' + nom + '.mp3';
        if (!fs.existsSync(path.join(dest, f))) {
          const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOIX + '?output_format=mp3_44100_128', {
            method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({ text: balise + ' ' + texte, model_id: 'eleven_v4', language_code: lg,
              voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0, use_speaker_boost: true } }),
          });
          if (!r.ok) { console.log('ECHEC', lg, n, nom, r.status, (await r.text()).slice(0, 160)); continue; }
          fs.writeFileSync(path.join(dest, f), Buffer.from(await r.arrayBuffer()));
        }
        console.log('ok', lg, n, nom);
        h += '<br><b>' + nom + '</b> <small style="color:#678">' + texte + '</small><br><audio controls src="' + f + '"></audio>';
      }
      h += '</div>';
    }
  }
  h += '<script>var L=[].slice.call(document.querySelectorAll("audio")),i=0;function joue(){document.querySelectorAll("div").forEach(function(d){d.style.outline="";});if(i>=L.length)return;var a=L[i],dv=a.closest("div");'
    + 'dv.style.outline="4px solid #1e88e5";dv.scrollIntoView({block:"center",behavior:"smooth"});a.onended=function(){i++;setTimeout(joue,600);};a.play().catch(function(){i++;joue();});}'
    + 'document.getElementById("go").onclick=function(){i=0;joue();};setTimeout(joue,600);<\/script>';
  fs.writeFileSync(path.join(dest, 'ecoute.html'), h);
  require('child_process').exec('start chrome "' + path.join(dest, 'ecoute.html') + '"');
})();
