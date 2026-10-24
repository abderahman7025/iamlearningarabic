/*
 * ÉCOUTE — les phrases « à noms » des 6-11 ans (les équivalents des 25 françaises), telles qu'elles sont
 * AUJOURD'HUI sur le site, dans les 11 autres langues. Rien n'est généré :
 * la page lit les sons en ligne.
 *   node outils/ecoute-langues-6-11.js
 * Données : outils/voix-6-11-langues.json { langue: [{n, fr, t}] } (relevé au
 * banc : la même page du même cours, dans chaque langue).
 */
const fs = require('fs');
const path = require('path');
const SITE = 'https://iamlearningarabic.com';
const NOMS = { en: 'Anglais', es: 'Espagnol', de: 'Allemand', nl: 'Néerlandais', it: 'Italien', pt: 'Portugais',
  ru: 'Russe', tr: 'Turc', zh: 'Chinois', id: 'Indonésien', hi: 'Hindi' };
function hache(t) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57, i, c;
  for (i = 0; i < t.length; i++) { c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ('0000000' + (h2 >>> 0).toString(16)).slice(-8) + ('0000000' + (h1 >>> 0).toString(16)).slice(-8);
}
function cles(t) {
  const l = [t, t.replace(/([^\s])([!?;:…])/g, '$1 $2')];
  if (t.length > 180 || Buffer.byteLength(t, 'utf8') > 360) l.push('long|' + hache(t));
  return l;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  const data = require('./voix-6-11-langues.json');
  let urls = {};
  try { urls = (await (await fetch(SITE + '/api/audio', require('./_admin.js'))).json()).urls || {}; } catch (e) { console.log('Site injoignable :', e.message); return; }
  let h = '<!doctype html><meta charset="utf-8"><title>Voix 6-11 — langues</title><body style="font-family:system-ui;background:#eef6ff;padding:20px;max-width:760px;margin:auto">'
    + '<h2>Les phrases avec un nom de lettre ou de voyelle, telles qu\'elles sont sur le site</h2><p>Un bouton par langue lit ses phrases à la suite. La phrase en cours est encadrée.</p>';
  let manque = 0;
  Object.keys(NOMS).forEach((lg) => {
    const L = data[lg] || [];
    h += '<section id="' + lg + '" style="margin:26px 0"><h3 style="display:flex;gap:12px;align-items:center">' + NOMS[lg]
      + ' <button onclick="lis(\'' + lg + '\')" style="font-size:1rem;padding:8px 14px;border-radius:10px;border:0;background:#1e88e5;color:#fff;cursor:pointer">▶ Lire les ' + L.length + '</button></h3>';
    L.forEach((x) => {
      const k = cles(x.t).find((c) => urls[c]);
      if (!k) manque++;
      h += '<div style="background:#fff;padding:8px 12px;border-radius:10px;margin:6px 0"><b>' + x.n + '.</b> ' + esc(x.t)
        + (x.fr ? '<br><small style="color:#678">' + esc(x.fr) + '</small>' : '') + '<br>'
        + (k ? '<audio controls preload="none" src="' + urls[k] + '"></audio>' : '<i style="color:#c00">pas de son en ligne (voix du navigateur)</i>') + '</div>';
    });
    h += '</section>';
  });
  h += '<script>var cours=null;function lis(lg){if(cours)cours.pause();var L=[].slice.call(document.querySelectorAll("#"+lg+" audio")),i=0;'
    + 'function un(){document.querySelectorAll("div").forEach(function(d){d.style.outline="";});if(i>=L.length)return;var a=L[i];cours=a;var d=a.closest("div");'
    + 'd.style.outline="4px solid #1e88e5";d.scrollIntoView({block:"center",behavior:"smooth"});a.onended=function(){i++;setTimeout(un,600);};a.play().catch(function(){i++;un();});}un();}<\/script>';
  const dest = path.join(__dirname, 'captures', 'ecoute-langues-6-11.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, h);
  console.log('Page prête' + (manque ? ' (' + manque + ' phrases sans son en ligne)' : '') + '.');
  require('child_process').exec('start chrome "' + dest + '"');
})();
