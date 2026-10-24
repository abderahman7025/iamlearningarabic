const { groupe } = require('./voix-groupe-couper.js');
(async () => {
  let c = 0;
  c += await groupe('es', [6, 7, 8, 9], 'es-intro', { intro: 'Ahora escucha con atención estos ejemplos en español.' });
  c += await groupe('de', [5, 6], 'de-intro', { intro: 'Hören Sie jetzt gut zu, auf Deutsch.' });
  c += await groupe('de', [8], 'de8-auto', { code: null, suffixe: 'auto' });
  c += await groupe('de', [8], 'de8-ar', { code: 'ar', suffixe: 'ar' });
  console.log('caracteres', c);
})();
