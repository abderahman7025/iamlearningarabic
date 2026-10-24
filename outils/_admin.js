/* v3.8.8 — la liste GET /api/audio est réservée : les outils la lisent avec
   le jeton admin de .env.local.  fetch(url, require('./_admin.js')) */
const fs = require('fs'), path = require('path');
let s = '';
try { const m = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').match(/^ADMIN_SECRET=(.*)$/m); if (m) s = m[1].trim().replace(/^["']|["']$/g, ''); } catch (e) {}
module.exports = { headers: { Authorization: 'Bearer ' + s } };
