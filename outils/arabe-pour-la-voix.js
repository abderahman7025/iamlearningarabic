/*
 * L'ARABE TEL QU'ON LE DONNE À LA VOIX — module partagé, À NE PAS DÉPLOYER.
 *
 * Le client (11 octobre 2026) : la voix Narrateur v4 prononce parfaitement
 * les mots arabes, mais devant une lettre seule elle dit « L » au lieu de
 * « lām », et devant un signe seul « a » au lieu de « fatḥa ». On lui écrit
 * donc le NOM de la lettre ou du signe en toutes lettres, et l'on retire la
 * voyelle de la dernière lettre du DERNIER mot (« hamzatou l-waṣl », pas
 * « …l-waṣli »). La liste a été relue et validée par lui :
 * Bureau/mots-arabes-voix.txt (« tout est ok »).
 *
 * Le texte AFFICHÉ sur le site ne change pas, ni la clé de l'enregistrement :
 * seul le texte envoyé à ElevenLabs passe par `pourLaVoix`.
 */
const LETTRES = {
  'ا': 'أَلِف', 'ب': 'بَاء', 'ت': 'تَاء', 'ث': 'ثَاء', 'ج': 'جِيم', 'ح': 'حَاء', 'خ': 'خَاء',
  'د': 'دَال', 'ذ': 'ذَال', 'ر': 'رَاء', 'ز': 'زَاي', 'س': 'سِين', 'ش': 'شِين', 'ص': 'صَاد',
  'ض': 'ضَاد', 'ط': 'طَاء', 'ظ': 'ظَاء', 'ع': 'عَيْن', 'غ': 'غَيْن', 'ف': 'فَاء', 'ق': 'قَاف',
  'ك': 'كَاف', 'ل': 'لَام', 'م': 'مِيم', 'ن': 'نُون', 'ه': 'هَاء', 'و': 'وَاو', 'ي': 'يَاء',
  'ء': 'هَمْزَة', 'ة': 'تَاء مَرْبُوطَة',
  'أ': 'هَمْزَة', 'إ': 'هَمْزَة', 'ؤ': 'هَمْزَة', 'ئ': 'هَمْزَة', 'ى': 'أَلِف مَقْصُورَة', 'آ': 'أَلِف مَدّ',
};
const SIGNES = {
  'َ': 'فَتْحَة', 'ِ': 'كَسْرَة', 'ُ': 'ضَمَّة', 'ْ': 'سُكُون', 'ّ': 'شَدَّة',
  'ً': 'فَتْحَتَان', 'ٍ': 'كَسْرَتَان', 'ٌ': 'ضَمَّتَان',
};
/* les mots et groupes, du plus long au plus court */
const MOTS = [
  ['هَمْزَةُ الْوَصْلِ', 'هَمْزَةُ الْوَصْل'],
  ['بِسْمِ اللَّهِ', 'بِسْمِ اللَّه'],
  ['مُفَخَّمَةٌ', 'مُفَخَّمَة'], ['مُرَقَّقَةٌ', 'مُرَقَّقَة'],
  ['قَمَرِيَّةٌ', 'قَمَرِيَّة'], ['شَمْسِيَّةٌ', 'شَمْسِيَّة'],
  ['الله', 'اللَّه'], ['بِسْمِ', 'بِسْم'],
  ['ال', 'أَلْ'],                      /* « un seul déterminant : al » */
];
const AR = '\\u0600-\\u06FF';
function pourLaVoix(t) {
  const garde = [];
  /* 1. les mots : mis de côté pour que les lettres seules ne les touchent pas */
  MOTS.forEach(([de, vers]) => {
    const re = new RegExp('(^|[^' + AR + '])' + de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![' + AR + '])', 'g');
    t = t.replace(re, (m, avant) => { garde.push(vers); return avant + '\u0001' + (garde.length - 1) + '\u0002'; });
  });
  /* 2. un signe posé seul (éventuellement sur un trait ou un rond porteur) */
  t = t.replace(new RegExp('(^|[^' + AR + '])[\\u0640\\u25CC]?([\\u064B-\\u0652])(?![' + AR + '])', 'g'),
    (m, avant, s) => avant + (SIGNES[s] || s));
  /* 3. une lettre seule */
  t = t.replace(new RegExp('(^|[^' + AR + '])([' + Object.keys(LETTRES).join('') + '])(?![' + AR + '])', 'g'),
    (m, avant, l) => avant + LETTRES[l]);
  return t.replace(/\u0001(\d+)\u0002/g, (m, n) => garde[+n]);
}
module.exports = { pourLaVoix, LETTRES, SIGNES, MOTS };
