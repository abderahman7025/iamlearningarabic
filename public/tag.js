/* ══ LA MESURE ET LE CONSENTEMENT ══════════════════════════════════════
   Un seul fichier pour les deux pages — le site public et l'application —
   afin que l'identifiant du conteneur ne vive qu'à UN endroit. Les deux le
   chargent par `<script src="/tag.js">`.

   Trois choses, dans cet ordre, et l'ordre compte :

     1. LES REFUS PAR DÉFAUT. Le Consent Mode v2 doit être posé AVANT que
        Google Tag Manager ne s'exécute, sinon la première mesure part sans
        consentement et la loi comme Google le reprochent.
     2. GTM, qui chargera ensuite ce que vous y aurez mis (GA4, Ads, ce que
        vous voudrez) — sans jamais écrire de cookie publicitaire tant que le
        visiteur n'a pas dit oui.
     3. LE BANDEAU, qui transforme les refus en accords si le visiteur le
        souhaite. Deux boutons de même poids : accepter et refuser. Un choix
        où seul « accepter » est visible ne vaut pas consentement.

   Rien ne se charge tant que `CONTENEUR` est vide : pas de balise, pas de
   bandeau, pas de cookie. On peut donc déployer avant d'avoir l'identifiant.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ⇩⇩ L'IDENTIFIANT DU CONTENEUR — la seule ligne à remplir ⇩⇩
     Un conteneur PROPRE à ce site, pas celui d'alyanco : deux sites dans le
     même conteneur obligent à filtrer chaque déclencheur par nom de domaine,
     et un réglage fait pour l'un casse le suivi de l'autre. */
  var CONTENEUR = '';          /* ex. 'GTM-XXXXXXX' */

  if (!CONTENEUR) return;

  var CLE = 'consentement_v2';
  var dl = (window.dataLayer = window.dataLayer || []);
  function gtag() { dl.push(arguments); }
  window.gtag = window.gtag || gtag;

  /* ── 1. Les refus par défaut ───────────────────────────────────────── */
  var SIGNAUX = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'];
  function etat(oui) {
    var e = {};
    SIGNAUX.forEach(function (s) { e[s] = oui ? 'granted' : 'denied'; });
    /* Ces deux-là ne servent pas la publicité : la langue choisie et la
       protection contre la fraude n'ont pas à être refusées. */
    e.functionality_storage = 'granted';
    e.security_storage = 'granted';
    return e;
  }
  var choisi = null;
  try { choisi = localStorage.getItem(CLE); } catch (e) {}
  var deja = (choisi === 'oui' || choisi === 'non');

  var defauts = etat(choisi === 'oui');
  /* `wait_for_update` laisse à un visiteur déjà décidé le temps que sa
     réponse remonte avant le premier envoi. Inutile s'il a déjà tranché. */
  if (!deja) defauts.wait_for_update = 500;
  gtag('consent', 'default', defauts);

  /* ── 2. Google Tag Manager ─────────────────────────────────────────── */
  dl.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var s0 = document.getElementsByTagName('script')[0];
  var js = document.createElement('script');
  js.async = true;
  js.src = 'https://www.googletagmanager.com/gtm.js?id=' + CONTENEUR;
  s0.parentNode.insertBefore(js, s0);

  /* ── 3. Le bandeau ─────────────────────────────────────────────────── */
  var TEXTES = {
    fr: { t: 'Nous mesurons l’audience de ce site et l’efficacité de nos publicités. Vous pouvez refuser : le site fonctionne exactement pareil.',
          o: 'Accepter', n: 'Refuser', s: 'Cookies' },
    en: { t: 'We measure this site’s audience and how well our ads work. You can decline — the site works exactly the same.',
          o: 'Accept', n: 'Decline', s: 'Cookies' },
    es: { t: 'Medimos la audiencia del sitio y la eficacia de nuestros anuncios. Puede rechazarlo: el sitio funciona igual.',
          o: 'Aceptar', n: 'Rechazar', s: 'Cookies' },
    de: { t: 'Wir messen die Reichweite dieser Website und die Wirkung unserer Anzeigen. Sie können ablehnen — die Website funktioniert genauso.',
          o: 'Annehmen', n: 'Ablehnen', s: 'Cookies' },
    nl: { t: 'We meten het bereik van deze site en hoe goed onze advertenties werken. U kunt weigeren — de site werkt precies hetzelfde.',
          o: 'Accepteren', n: 'Weigeren', s: 'Cookies' },
    it: { t: 'Misuriamo il pubblico del sito e l’efficacia dei nostri annunci. Puoi rifiutare: il sito funziona allo stesso modo.',
          o: 'Accetta', n: 'Rifiuta', s: 'Cookie' },
    pt: { t: 'Medimos a audiência do site e a eficácia dos anúncios. Pode recusar — o site funciona exatamente igual.',
          o: 'Aceitar', n: 'Recusar', s: 'Cookies' },
    ru: { t: 'Мы измеряем посещаемость сайта и эффективность рекламы. Вы можете отказаться — сайт будет работать так же.',
          o: 'Принять', n: 'Отклонить', s: 'Cookies' },
    tr: { t: 'Bu sitenin ziyaretçi sayısını ve reklamlarımızın etkisini ölçüyoruz. Reddedebilirsiniz: site aynı şekilde çalışır.',
          o: 'Kabul et', n: 'Reddet', s: 'Çerezler' },
    zh: { t: '我们会统计本站访问情况和广告效果。您可以拒绝，网站照常使用。',
          o: '接受', n: '拒绝', s: 'Cookie' },
    id: { t: 'Kami mengukur jumlah pengunjung situs dan efektivitas iklan kami. Anda boleh menolak — situs tetap berjalan sama.',
          o: 'Terima', n: 'Tolak', s: 'Cookie' },
    ur: { t: 'ہم اس سائٹ کے ناظرین اور اشتہارات کی کارکردگی ماپتے ہیں۔ آپ انکار کر سکتے ہیں — سائٹ اسی طرح چلتا رہے گا۔',
          o: 'قبول کریں', n: 'انکار', s: 'کوکیز' },
    hi: { t: 'हम इस साइट के दर्शकों और अपने विज्ञापनों की सफलता मापते हैं। आप मना कर सकते हैं — साइट वैसे ही चलती रहेगी।',
          o: 'स्वीकार', n: 'अस्वीकार', s: 'कुकीज़' }
  };
  function langue() {
    var l = '';
    try { l = localStorage.getItem('lang') || ''; } catch (e) {}
    if (!l) l = (navigator.language || 'fr').slice(0, 2);
    return TEXTES[l] ? l : 'fr';
  }

  function repond(oui) {
    try { localStorage.setItem(CLE, oui ? 'oui' : 'non'); } catch (e) {}
    gtag('consent', 'update', etat(oui));
    var b = document.getElementById('bandeau-consentement');
    if (b) { b.style.opacity = '0'; setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 260); }
  }

  function bandeau() {
    if (document.getElementById('bandeau-consentement')) return;
    var T = TEXTES[langue()];
    var b = document.createElement('div');
    b.id = 'bandeau-consentement';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', T.s);
    b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;'
      + 'max-width:640px;margin:0 auto;padding:14px 16px;border-radius:14px;'
      + 'background:rgba(16,12,28,.96);color:#f2ecdf;border:1px solid rgba(245,200,66,.35);'
      + 'box-shadow:0 12px 40px rgba(0,0,0,.45);font-family:Outfit,system-ui,sans-serif;'
      + 'font-size:.86rem;line-height:1.45;display:flex;flex-wrap:wrap;gap:10px;'
      + 'align-items:center;justify-content:center;text-align:center;opacity:0;'
      + 'transition:opacity .3s ease';
    var p = document.createElement('div');
    p.textContent = T.t;
    p.style.cssText = 'flex:1 1 260px;min-width:220px';
    b.appendChild(p);
    /* Les deux boutons ont le MÊME poids visuel : même taille, même graisse,
       même surface. Un « refuser » en gris pâle à côté d'un « accepter » doré
       n'est pas un choix libre, et c'est ce que les sanctions visent. */
    function bouton(txt, oui, or) {
      var x = document.createElement('button');
      x.type = 'button';
      x.textContent = txt;
      x.style.cssText = 'flex:0 0 auto;padding:9px 18px;border-radius:50px;cursor:pointer;'
        + 'font:600 .86rem Outfit,system-ui,sans-serif;'
        + (or ? 'background:#f5c842;color:#221803;border:1px solid #f5c842;'
              : 'background:transparent;color:#f2ecdf;border:1px solid rgba(242,236,223,.5);');
      x.onclick = function () { repond(oui); };
      return x;
    }
    b.appendChild(bouton(T.n, false, false));
    b.appendChild(bouton(T.o, true, true));
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.style.opacity = '1'; });
  }

  /* On peut toujours revenir sur son choix : c'est la loi, et c'est aussi
     ce qu'on veut si quelqu'un a refusé par réflexe. */
  window.rouvrirConsentement = function () {
    try { localStorage.removeItem(CLE); } catch (e) {}
    bandeau();
  };

  /* ── L'ACHAT ───────────────────────────────────────────────────────────
     Un vrai événement, avec son MONTANT et son identifiant de transaction.
     Compter une conversion sur la simple vue d'une page de remerciement,
     comme le fait l'autre site, coûte deux choses : on ne sait pas ce que la
     vente a rapporté — donc pas de ROAS, donc pas d'enchère au retour — et un
     rechargement de la page compte une deuxième vente. L'identifiant permet à
     Google d'écarter les doublons. */
  window.tagAchat = function (id, valeur, devise) {
    dl.push({ ecommerce: null });
    dl.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: String(id || ''),
        value: Number(valeur || 0),
        currency: devise || 'EUR',
        items: [{ item_id: 'acces-vie', item_name: 'Acces a vie', price: Number(valeur || 0), quantity: 1 }]
      }
    });
  };

  if (!deja) {
    if (document.body) bandeau();
    else document.addEventListener('DOMContentLoaded', bandeau);
  }
})();
