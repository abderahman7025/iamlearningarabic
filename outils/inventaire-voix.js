/*
 * INVENTAIRE DES PHRASES DITES par les leçons des 6-11 ans — À NE PAS DÉPLOYER.
 *
 * Ce fichier ne tourne pas sous Node : c'est le texte d'une fonction à coller
 * dans la console du banc local (http://localhost:3456/garcon/child), ou à
 * passer à l'outil de navigateur. Elle rend la liste des phrases SANS
 * écriture arabe que `speakText` a reçues, pour une langue donnée.
 *
 *   await inventaireVoix('en')      → { dits:[…], pages:n, cours:n }
 *
 * Pourquoi par exécution et pas par lecture du code : une phrase traduite
 * est coupée en morceaux autour des sons arabes (« Avec l'alif, on obtient »
 * + le son), et les morceaux n'existent nulle part tels quels dans la table
 * des traductions — 84 des 152 clés françaises sont dans ce cas.
 *
 * Trois précautions :
 * - HORLOGE VIRTUELLE : un onglet caché bride ses minuteries à une par
 *   seconde ; `setTimeout`, `setInterval`, `Date.now` et
 *   `requestAnimationFrame` sont remplacés et pompés à la main.
 * - `speakText` et `speak` sont remplacés par un enregistreur : rien ne
 *   sonne, et la narration, n'entendant rien, enchaîne au bout de 1,2 s
 *   (virtuelle).
 * - Sur chaque page on touche aussi les réponses (`.boy-cible`, `.boy-flotte`,
 *   `.boy-hublot`, `.rec-case`) : certaines phrases ne se disent qu'après.
 *
 * AVANT DE LANCER : remplir `AUDIO_URLS` avec les clés ARABES en ligne
 * (GET /api/audio, filtré sur l'écriture arabe). Sans cela la narration
 * croit qu'aucun son n'est enregistré et dit des phrases ENTIÈRES, sons
 * translittérés compris (« Prenons la lettre ba. Seule, elle se dit b. ») —
 * ce n'est pas ce que la production dit : 81 des 152 phrases connues
 * seulement étaient retrouvées. Depuis localhost l'API refuse (CORS) :
 * copier la liste dans public/_audio.json le temps du relevé.
 *
 * RECHARGER LA PAGE après usage : l'horloge reste remplacée.
 */
async function inventaireVoix(langue, profils, maxLettres) {
  var now = Date.now(), q = [], id = 1;
  var tic = function () { return new Promise(function (r) { var c = new MessageChannel(); c.port1.onmessage = r; c.port2.postMessage(0); }); };
  window.setTimeout = function (f, d) { var a = [].slice.call(arguments, 2), i = id++; q.push({ i: i, t: now + Math.max(1, +d || 0), f: f, a: a }); return i; };
  window.setInterval = function (f, d) { var a = [].slice.call(arguments, 2), i = id++; q.push({ i: i, t: now + (+d || 16), f: f, a: a, rep: Math.max(4, +d || 16) }); return i; };
  window.clearTimeout = window.clearInterval = function (i) { for (var k = q.length - 1; k >= 0; k--) if (q[k].i === i) q.splice(k, 1); };
  Date.now = function () { return now; };
  try { performance.now = function () { return now; }; } catch (e) {}
  window.requestAnimationFrame = function (f) { return window.setTimeout(function () { f(now); }, 1000); };   /* une image par seconde suffit : on releve des phrases, pas des animations */
  window.cancelAnimationFrame = window.clearTimeout;
  async function avance(ms) {
    var fin = now + ms, n = 0;
    for (;;) {
      var k = -1, t = Infinity;
      for (var j = 0; j < q.length; j++) if (q[j].t < t) { t = q[j].t; k = j; }
      if (k < 0 || t > fin) break;
      var x = q[k];
      if (x.rep) x.t = t + x.rep; else q.splice(k, 1);
      now = Math.max(now, t);
      try { typeof x.f === 'function' && x.f.apply(null, x.a); } catch (e) {}
      window.__n = (window.__n || 0) + 1;
      if (++n % 300 === 0) await tic();
    }
    now = fin; await tic();
  }
  var dits = {}, ordre = [];
  var dernier = 0;
  /* On attend que la page ait TOUT dit : 2,6 s (virtuelles) sans nouvelle
     phrase. Un délai fixe coupait les pages bavardes — « à retenir » dit
     quatre phrases, les deux dernières n'étaient jamais relevées, et en
     anglais c'est la voix du navigateur qui les disait. */
  async function silence() {
    var debut = now;
    while (now - debut < 60000) { await avance(400); if (now - debut > 1800 && now - dernier > 2600) break; }
  }
  window.speakText = function (t) { dernier = now; t = String(t || ''); if (t && !/[؀-ۿ]/.test(t) && !dits[t]) { dits[t] = 1; ordre.push(t); } };
  window.speak = function () {};
  try { window.stopSpeech = function () {}; } catch (e) {}
  var vraie = window._boyScene, B = null;
  window._boyScene = function () { B = vraie.apply(this, arguments); return B; };
  var ca = document.getElementById('ca'), pages = 0, cours = 0, erreurs = [];
  st.lang = langue; st.age = 'grand'; st.soundOn = true;
  async function joue(nom, lance) {
    B = null;
    try { lance(); } catch (e) { erreurs.push(nom + ' : ' + e.message); return; }
    if (!B) { erreurs.push(nom + ' : pas de scène'); return; }
    cours++;
    var b = B;
    window.__prog = nom + ' — ' + pages + ' pages, ' + ordre.length + ' phrases';
    for (var n = 0; n < 160 && b.wrap && b.wrap.isConnected; n++) {
      await silence();
      var cibles = [].slice.call(b.wrap.querySelectorAll('.boy-cible,.boy-flotte,.boy-hublot,.rec-case'));
      for (var c = 0; c < cibles.length && c < 6; c++) {
        try { cibles[c].click(); } catch (e) {}
        await silence();
        if (!b.wrap.isConnected) break;
      }
      pages++;
      if (!b.wrap.isConnected) break;
      if (b.wrap.querySelector('[data-fin]')) { await avance(3000); break; }
      try { b.suivant(); } catch (e) { erreurs.push(nom + ' suivant : ' + e.message); break; }
    }
    try { b.wrap.remove(); } catch (e) {}
  }
  var P = profils || ['boy', 'girl'];
  for (var p = 0; p < P.length; p++) {
    st.profile = P[p];
    try { _HAB = _habDuProfil(); } catch (e) {}
    await joue(P[p] + ' voyelles', function () { _boySession = ALL_S.filter(function (x) { return x.type === 'vowels'; })[0]; _boyVowelCourse(ca); });
    await joue(P[p] + ' prolong', function () { _boySession = ALL_S.filter(function (x) { return x.type === 'prolong'; })[0]; _boyProlongCourse(ca); });
    for (var i = 0; i < Math.min(CHILD_LETTERS.length, maxLettres || 99); i++) {
      (function (idx) {
        var ses = ALL_S.filter(function (x) { return x.letters && x.letters.some(function (l) { return l.ar === CHILD_LETTERS[idx].ar; }); })[0];
        window.__ses = ses; window.__idx = idx;
      })(i);
      await joue(P[p] + ' lettre ' + i, function () { _boySession = window.__ses; _boyLetterCourse(ca, window.__idx, false); });
    }
  }
  return { dits: ordre, pages: pages, cours: cours, erreurs: erreurs.slice(0, 10) };
}
