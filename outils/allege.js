/**
 * FABRIQUE LA VERSION D'ESSAI — `app/app-essai.html`.
 *
 * Le fichier de l'application contient TOUT : les douze leçons, les trente
 * lettres, les exercices. Servi tel quel à un compte gratuit, il suffirait
 * d'ouvrir les outils du navigateur pour déverrouiller ce qu'on n'a pas payé :
 * un verrou écrit dans le fichier qu'on donne au visiteur n'est pas un verrou.
 *
 * On lui sert donc un fichier AMPUTÉ, où le contenu payant n'existe
 * physiquement pas. Rien à déverrouiller.
 *
 * CE QUI RESTE : les voyelles et la première leçon de lettres — ا و ي — avec
 * tout le moteur, les trois interfaces et les exercices de cette leçon-là.
 *
 * CE QUI PART : les onze leçons de l'alphabet, et les vingt-sept lettres
 * qu'elles enseignent.
 *
 * ── Pourquoi on REMPLACE au lieu de SUPPRIMER ──
 * `CHILD_ISLAND_LETTERS` désigne les lettres par leur RANG dans
 * `CHILD_LETTERS`. Retirer des entrées décalerait tous les rangs suivants et
 * les îles pointeraient sur les mauvaises lettres. On garde donc le même
 * nombre d'entrées, et on vide celles qui ne sont pas offertes. Les index
 * restent justes, et le contenu n'y est plus.
 *
 * Ce fichier est REFABRIQUÉ à chaque déploiement : rien n'est à reporter à la
 * main, et une correction faite dans `app.html` s'y retrouve toute seule.
 *
 * Usage :  node outils/allege.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'app', 'app.html');
const CIBLE = path.join(__dirname, '..', 'app', 'app-essai.html');

/* Les rangs, dans CHILD_LETTERS, des lettres offertes : ا و ي. Ils viennent
   de `CHILD_ISLAND_LETTERS[1]`, et on le vérifie plus bas plutôt que de le
   croire — si le parcours change, on veut un arrêt, pas une fuite. */
const OFFERTES = [0, 1, 2];

/* Une lettre vidée. Elle garde la forme d'une lettre pour que rien ne casse,
   mais n'enseigne rien. Le point d'interrogation arabe est un vrai caractère
   de la police : il s'affiche au lieu d'un rectangle vide. */
const VIDE = "{ar:'؟',name:'—',emoji:'🔒',wordAr:'',wordLat:''}";

/* ── LIRE DU CODE SANS SE FAIRE PIÉGER ──
   On compte des crochets et des accolades, en sautant ce qui n'en est pas :
   les chaînes, et surtout LES COMMENTAIRES. Une apostrophe française dans un
   commentaire — « l'île », « d'abord » — ouvre sinon une fausse chaîne qui
   court jusqu'à l'apostrophe suivante et avale les crochets au passage. C'est
   exactement ce qui est arrivé sur `ADMIN_SOUNDS` : le comptage filait jusqu'au
   bas du fichier. */
function parcours(src, depart, ouvre, ferme, auNiveauZero) {
  let n = 0, guillemet = null, entree = -1;
  for (let k = depart; k < src.length; k++) {
    const c = src[k];
    if (guillemet) {
      if (c === '\\') { k++; continue; }
      if (c === guillemet) guillemet = null;
      continue;
    }
    if (c === '/' && src[k + 1] === '/') { k = src.indexOf('\n', k); if (k < 0) break; continue; }
    if (c === '/' && src[k + 1] === '*') { k = src.indexOf('*/', k + 2); if (k < 0) break; k++; continue; }
    if (c === "'" || c === '"' || c === '`') { guillemet = c; continue; }
    if (c === ouvre) { if (!n) entree = k; n++; }
    else if (c === ferme) {
      n--;
      if (!n) { const stop = auNiveauZero(entree, k + 1); if (stop) return stop; }
      if (n < 0) break;
    }
  }
  return null;
}

function bloc(src, debut) {
  const i = src.indexOf(debut);
  if (i < 0) throw new Error('introuvable : ' + debut);
  const ouvrant = src.indexOf('[', i);
  const r = parcours(src, ouvrant, '[', ']', (a, b) => ({ debut: a, fin: b }));
  if (!r) throw new Error('crochet jamais refermé : ' + debut);
  return r;
}

function entrees(corps) {
  /* Les accolades de premier niveau du tableau : une par lettre. */
  const out = [];
  parcours(corps, 0, '{', '}', (a, b) => { out.push([a, b]); return null; });
  return out;
}

function main() {
  let s = fs.readFileSync(SOURCE, 'utf8');
  const avant = s.length;

  /* ── 1. Vérifier que le parcours n'a pas bougé sous nos pieds ── */
  /* Le tableau porte un commentaire par ligne : on les retire avant de lire,
     sinon l'expression bute dessus. */
  const zi = bloc(s, 'var CHILD_ISLAND_LETTERS=');
  const iles = s.slice(zi.debut, zi.fin).split('\n')
    .map(function (l) { return l.replace(/\/\/.*$/, ''); }).join('\n');
  const m = /\[\s*\[\s*\]\s*,\s*\[([0-9,\s]*)\]/.exec(iles);
  if (!m) throw new Error('CHILD_ISLAND_LETTERS : forme inattendue');
  const ile1 = m[1].split(',').map(x => Number(x.trim())).filter(x => !isNaN(x));
  if (ile1.join(',') !== OFFERTES.join(',')) {
    throw new Error('la premiere ile a change : ' + ile1.join(',')
      + ' au lieu de ' + OFFERTES.join(',') + ' — relire ce script avant de continuer');
  }

  /* ── 2. Vider les lettres non offertes ── */
  const z = bloc(s, 'var CHILD_LETTERS=');
  const corps = s.slice(z.debut, z.fin);
  const lettres = entrees(corps);
  if (lettres.length < 20) throw new Error('CHILD_LETTERS : ' + lettres.length + ' entrees, trop peu');
  let neuf = '';
  let curseur = 0, vides = 0;
  lettres.forEach(([a, b], rang) => {
    neuf += corps.slice(curseur, a);
    if (OFFERTES.indexOf(rang) >= 0) neuf += corps.slice(a, b);
    else { neuf += VIDE; vides++; }
    curseur = b;
  });
  neuf += corps.slice(curseur);
  s = s.slice(0, z.debut) + neuf + s.slice(z.fin);

  /* ── 3. Retirer les lecons de l'alphabet ── */
  const l = bloc(s, 'const LS=');
  const nLecons = entrees(s.slice(l.debut, l.fin)).length;
  s = s.slice(0, l.debut) + '[]' + s.slice(l.fin);

  /* ── 4. Vider les cartes des prolongations ── */
  const p = bloc(s, "const SP={id:2,type:'prolong',emoji:'🌊',cards:");
  s = s.slice(0, p.debut) + '[]' + s.slice(p.fin);

  /* ── 5. Vider la liste du studio d'enregistrement ──
     Elle ne sert qu'a l'administrateur, mais elle porte TOUT le vocabulaire
     du cours — les mots de chaque lettre, avec leur traduction. Inutile ici,
     et c'est du contenu paye. */
  const a = bloc(s, 'var ADMIN_SOUNDS');
  const nSons = entrees(s.slice(a.debut, a.fin)).length;
  s = s.slice(0, a.debut) + '[]' + s.slice(a.fin);

  /* ── 6. Marquer le fichier ── */
  if (s.indexOf('<head>') < 0) throw new Error('pas de <head>');
  s = s.replace('<head>', '<head><script>window.__ESSAI=1;</script>');

  fs.writeFileSync(CIBLE, s);
  console.log('app-essai.html fabrique');
  console.log('  ' + vides + ' lettres videes sur ' + lettres.length);
  console.log('  ' + nLecons + ' lecons de l alphabet retirees');
  console.log('  ' + nSons + ' entrees du studio retirees');
  console.log('  ' + Math.round(avant / 1024) + ' Ko -> ' + Math.round(s.length / 1024) + ' Ko');
}

main();
