// ── Security middleware partagé ──────────────────────────────────────────────
'use strict';

const crypto = require('crypto');
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

// ── Blocage d'email après N tentatives échouées ──────────────────────────────
const _emailBlocks = new Map(); // email -> { count, blockedUntil }

function checkEmailBlock(email) {
  const record = _emailBlocks.get(email);
  if (!record) return { blocked: false };
  if (Date.now() > record.blockedUntil) {
    _emailBlocks.delete(email);
    return { blocked: false };
  }
  return { blocked: true, blockedUntil: record.blockedUntil };
}

function recordFailedLogin(email) {
  const record = _emailBlocks.get(email) || { count: 0, blockedUntil: 0 };
  record.count++;
  if (record.count >= 5) {
    record.blockedUntil = Date.now() + 30 * 60 * 1000; // 30 min bloc
  }
  _emailBlocks.set(email, record);
  logEvent('login_failed', { email, attempt: record.count });
}

function clearEmailBlock(email) {
  _emailBlocks.delete(email);
}

// ── Tokens signés avec HMAC + expiration ──────────────────────────────────────
function generateToken(email, expiresInSeconds) {
  expiresInSeconds = expiresInSeconds || 24 * 60 * 60; // 24h par défaut
  const payload = email + ':' + (Date.now() + expiresInSeconds * 1000);
  const secret = process.env.TOKEN_SECRET || 'fallback-secret';
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return payload + ':' + signature;
}

function verifyToken(token, email) {
  if (typeof token !== 'string' || !token.includes(':')) return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [tokenEmail, expiresStr, signature] = parts;
  const secret = process.env.TOKEN_SECRET || 'fallback-secret';
  const payload = tokenEmail + ':' + expiresStr;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Protection timing attack
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return false;
  }

  if (Date.now() > parseInt(expiresStr)) return false;
  if (tokenEmail !== email) return false;

  return true;
}

// ── Logging des événements de sécurité ────────────────────────────────────────
function logEvent(eventType, details) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, eventType, ...details };
  console.log('[SECURITY]', JSON.stringify(logEntry));
}

// ── Validation email ─────────────────────────────────────────────────────────
function isValidEmail(email) {
  return typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

// ── Validation mot de passe ──────────────────────────────────────────────────
function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 6 || password.length > 128) return false;
  // Évite les caractères de contrôle et autres non-printables
  return !/[\x00-\x1F\x7F]/.test(password);
}

// ── Sanitization email (trim, lowercase) ──────────────────────────────────────
function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().slice(0, 254);
}

// ── Validation objet utilisateur ─────────────────────────────────────────────
function validateUserData(data) {
  const errors = [];

  if (data.email !== undefined) {
    if (!isValidEmail(data.email)) errors.push('Email invalide.');
  }

  if (data.password !== undefined) {
    if (!isValidPassword(data.password)) errors.push('Mot de passe invalide.');
  }

  if (data.device_id !== undefined) {
    if (typeof data.device_id !== 'string' || data.device_id.length < 1 || data.device_id.length > 256) {
      errors.push('Device ID invalide.');
    }
  }

  return { valid: errors.length === 0, errors };
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

// ── IP Whitelisting pour admin ───────────────────────────────────────────────
function isAdminIpAllowed(req) {
  const allowedIps = (process.env.ADMIN_IPS || '').split(',').map(ip => ip.trim()).filter(ip => ip);
  if (allowedIps.length === 0) return true; // Si pas configuré, autoriser tous

  const clientIp = getClientIp(req);
  const isAllowed = allowedIps.includes(clientIp);

  if (!isAllowed) {
    logEvent('admin_ip_blocked', { ip: clientIp });
  }

  return isAllowed;
}

module.exports = {
  setCors,
  setSecurityHeaders,
  rateLimit,
  checkEmailBlock,
  recordFailedLogin,
  clearEmailBlock,
  generateToken,
  verifyToken,
  logEvent,
  isValidEmail,
  isValidPassword,
  sanitizeEmail,
  validateUserData,
  getClientIp,
  applyMiddleware,
  isAdminRequest,
  isAdminIpAllowed,
};
