/* 24 octobre 2026 — v3.8.5 : turc « A ile B farklıdır », hindi « ऐसे कहते हैं: »
   et « कुछ उदाहरण: ». Phrases groupées puis coupées. */
const fs = require('fs'), path = require('path');
const { groupe, trames, extrait } = require('./voix-groupe-couper.js');
const D = (lg) => path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
(async () => {
  let c = 0;
  c += await groupe('tr', [6, 7, 9, 10], 'tr-ile', { intro: 'Şimdi Türkçe olarak şu örnekleri dikkatle dinleyin.' });
  /* « ile » et « farklıdır » seuls (phrase 8 : voix du studio pour l'arabe) */
  const j = JSON.parse(fs.readFileSync(path.join(D('tr'), 'groupe-tr-ile.json'), 'utf8')), A = j.A;
  const buf = fs.readFileSync(path.join(D('tr'), 'groupe-tr-ile.mp3')), F = trames(buf), txt = A.characters.join('');
  const r6 = txt.indexOf('وَإِ ile وَا farklıdır');
  [['ile', 'diff.mp3'], ['farklıdır', 'diff2.mp3']].forEach(([m, f]) => {
    const k = txt.indexOf(m, r6), a = A.character_start_times_seconds[k] - 0.05, b = A.character_end_times_seconds[k + m.length - 1] + 0.1;
    fs.writeFileSync(path.join(D('tr'), f), extrait(buf, F, Math.max(0, a), b)); console.log('tr', m, a.toFixed(2), '→', b.toFixed(2));
  });
  c += await groupe('hi', [2, 4], 'hi-24');
  c += await groupe('hi', [5, 6], 'hi-5', { seg: ['कुछ उदाहरण:', 'Wai से अलग Waa'] });
  console.log('caracteres', c);
})();
