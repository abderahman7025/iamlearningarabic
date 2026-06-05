-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: DATABASE SECURITY
-- Exécute ce SQL dans Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. TABLE AUDIT_LOGS (Historique complet)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  email VARCHAR(254),
  ip_address VARCHAR(45),
  attempt_number INT,
  success BOOLEAN,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour chercher vite
CREATE INDEX IF NOT EXISTS idx_audit_logs_email ON audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip_address);

-- ───────────────────────────────────────────────────────────────────────────
-- 2. INDEXES DE SÉCURITÉ (Requêtes rapides)
-- ───────────────────────────────────────────────────────────────────────────

-- Sur la table users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_paid ON users(paid);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Sur la table reset_tokens
CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON reset_tokens(expires_at);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. FUNCTION POUR ÉCRIRE DANS AUDIT_LOGS (optionnel, utile pour triggers)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_audit(
  p_event_type VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL,
  p_attempt_number INT DEFAULT NULL,
  p_success BOOLEAN DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (event_type, email, ip_address, attempt_number, success, details, created_at)
  VALUES (p_event_type, p_email, p_ip_address, p_attempt_number, p_success, p_details, NOW());
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. PERMISSIONS (Security)
-- ───────────────────────────────────────────────────────────────────────────

-- Audit logs : seulement service role et authenticated users peuvent lire (pas modifier)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can read their own audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Users table : RLS pour isolation des comptes
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Policy: Users can only update their own data (mais PAS is_admin)
CREATE POLICY "Users can update own data (not is_admin)" ON users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (
    email = auth.jwt() ->> 'email'
    AND is_admin = OLD.is_admin  -- is_admin ne peut pas changer
  );

-- Policy: Admin users can read all data (optionnel, si tu as une colonne is_admin)
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    (SELECT is_admin FROM users WHERE email = auth.jwt() ->> 'email') = true
  );

-- Reset tokens: seulement service role peut les manipuler
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage reset tokens" ON reset_tokens
  FOR ALL TO service_role
  WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. VIEWS POUR AUDIT (optionnel, pour voir les stats facilement)
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_login_attempts_last_24h AS
SELECT
  email,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN success = true THEN 1 END) as successful,
  COUNT(CASE WHEN success = false THEN 1 END) as failed,
  array_agg(DISTINCT ip_address) as ips_used,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE event_type IN ('login_success', 'login_failed', 'login_blocked')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email
ORDER BY failed DESC;

CREATE OR REPLACE VIEW v_suspicious_ips AS
SELECT
  ip_address,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(CASE WHEN success = false THEN 1 END) as failed_attempts,
  array_agg(DISTINCT email) as emails_tried
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 20
ORDER BY total_attempts DESC;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. VÉRIFICATIONS FINALES
-- ───────────────────────────────────────────────────────────────────────────

-- Vérifie que les tables principales sont protégées
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('users', 'reset_tokens', 'audit_logs')
ORDER BY tablename;

-- Vérifie les indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('users', 'reset_tokens', 'audit_logs')
ORDER BY tablename, indexname;
