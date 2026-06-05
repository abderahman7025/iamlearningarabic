// ── Security middleware partagé ──────────────────────────────────────────────
'use strict';

const ALLOWED_ORIGINS = [
  'https://iamlearningarabic.com',
  'https://www.iamlearningarabic.com',
];

// ── CORS strict ──────────────────────────────────────────────────────────────
function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

// ── Headers sécurité HTTP ────────────────────────────────────────────────────
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

// ── Rate limiter en mémoire (par instance serverless) ────────────────────────
// Fiable pour bloquer les bursts — se remet à 0 sur cold start (acceptable)
const _store = new Map();

function rateLimit(ip, action, maxAttempts, windowMs) {
  maxAttempts = maxAttempts || 5;
  windowMs    = windowMs    || 15 * 60 * 1000; // 15 min par défaut
  const key = ip + ':' + action;
  const now = Date.now();
  let rec = _store.get(key);

  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + windowMs };
  }
  rec.count++;
  _store.set(key, rec);

  if (rec.count > maxAttempts) {
    const retryAfterSec = Math.ceil((rec.resetAt - now) / 1000);
    return { limited: true, retryAfter: retryAfterSec };
  }
  return { limited: false };
}

// ── Validation email ─────────────────────────────────────────────────────────
function isValidEmail(email) {
  return typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ── IP client (Vercel forwarde l'IP réelle) ──────────────────────────────────
function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown'
  );
}

// ── Middleware complet : CORS + sécurité + gestion OPTIONS ───────────────────
// Retourne true si la requête est terminée (OPTIONS).
function applyMiddleware(req, res) {
  setCors(req, res);
  setSecurityHeaders(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}

// ── Vérification admin (header Authorization: Bearer <ADMIN_SECRET>) ─────────
function isAdminRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  return token.length > 0 && token === process.env.ADMIN_SECRET;
}

module.exports = {
  setCors,
  setSecurityHeaders,
  rateLimit,
  isValidEmail,
  getClientIp,
  applyMiddleware,
  isAdminRequest,
};
