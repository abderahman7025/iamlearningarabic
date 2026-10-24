/* Page d'écoute sur le Bureau, lecture enchaînée. Usage :
   node outils/page-essais.js "Titre" lg:num[,num] ...   (compare N.mp3 et N-g.mp3) */
const fs = require('fs'), path = require('path');
const { phrases } = require('./voix-langues-prolong.js');
const NOM = { en:'Anglais', es:'Espagnol', de:'Allemand', ru:'Russe', pt:'Portugais', it:'Italien', nl:'Néerlandais', zh:'Chinois', id:'Indonésien', tr:'Turc', hi:'Hindi' };
const [titre, ...args] = process.argv.slice(2);
const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const au = (f, lab) => '<div class="c"><div class="t">' + lab + '</div><audio controls preload="none" src="data:audio/mpeg;base64,' + fs.readFileSync(f).toString('base64') + '"></audio></div>';
let H = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(titre) + '</title><style>body{font-family:system-ui,sans-serif;background:#f7f3ea;color:#2a1a00;margin:0;padding:24px 16px;max-width:860px}h2{margin-top:26px;border-bottom:2px solid #e8a020}button{background:#e8a020;color:#fff;border:0;border-radius:10px;padding:8px 14px;font-size:.95rem;cursor:pointer}.c{background:#fff;border-radius:14px;padding:10px 14px;margin-bottom:10px;border:2px solid transparent}.c.en-cours{border-color:#e8a020;background:#fff7e6}.t{margin-bottom:6px}.t span{font-family:Amiri,serif;color:#b45309;font-size:1.3em}.t i{color:#7a4a00;font-style:normal;font-size:.85rem}audio{width:100%}#barre{position:sticky;top:0;background:#f7f3ea;padding:8px 0;z-index:2}</style></head><body><h1>' + esc(titre) + '</h1><p>Rien n\'est en ligne. « Tout lire » enchaîne les écoutes.</p><div id="barre"><button onclick="lire(0)">▶ Tout lire</button> <button onclick="stop()">■ Stop</button></div>';
args.forEach((x) => {
  const [lg, ns, filtre] = x.split(':'), seul = filtre ? new RegExp(filtre) : null, P = phrases(lg), d = path.join(__dirname, 'captures', 'voix-langues-prolong', lg);
  H += '<h2>' + (NOM[lg] || lg) + '</h2>';
  ns.split(',').map(Number).forEach((n) => {
    const lab = '<b>' + n + '.</b> ' + esc(P[n - 1].t).replace(/([\u0600-\u06FF]+)/g, '<span>$1</span>');
    const av = path.join(d, n + '.mp3');
    if (fs.existsSync(av) && !(filtre && filtre === 'ordre')) H += au(av, lab + ' <i>— avant</i>');
    const LIB = { g: 'nouveau', auto: 'sans langue imposée', ar: 'langue arabe imposée', phon1: 'nouveau (phonétique)', dec: 'arabe décomposé وِ يُ', g2: 'intro néerlandaise plus longue', phon2: 'phonétique avec tirets', arwiyu: 'langue arabe imposée + وِي يو', mot: 'iyaaka en un seul mot', ordre: 'nouvel ordre « A और B अलग हैं »', arsep: 'langue arabe imposée + وِ يُ séparés' };
    fs.readdirSync(d).filter((f) => f.startsWith(n + '-') && f.endsWith('.mp3') && !/entier|separe|viyu/.test(f) && (!seul || seul.test(f))).forEach((f) => {
      const k = f.slice(String(n).length + 1, -4); H += au(path.join(d, f), lab + ' <i>— ' + (LIB[k] || k.replace('coupe', 'coupé à ') + ' s') + '</i>'); });
  });
});
H += '<script>var A=[].slice.call(document.querySelectorAll("audio")),k=-1;function stop(){A.forEach(function(a){a.pause();a.closest(".c").classList.remove("en-cours");});k=-1;}function lire(i){stop();if(i>=A.length)return;k=i;var a=A[i];a.currentTime=0;a.closest(".c").classList.add("en-cours");a.closest(".c").scrollIntoView({block:"center",behavior:"smooth"});a.play();}A.forEach(function(a,i){a.addEventListener("ended",function(){if(k===i)setTimeout(function(){lire(i+1);},600);});});</script>';
fs.writeFileSync('C:/Users/Abdu et Tati/Desktop/' + titre + '.html', H + '</body></html>');
console.log('ok');
