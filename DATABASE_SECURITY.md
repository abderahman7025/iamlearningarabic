# Step 5 : Database Security - Guide complet

## 1️⃣ AUDIT TRAIL (Historique complet)

**Quoi :** Enregistrer **tous** les événements de sécurité dans une table `audit_logs`.

**Pourquoi :** Si ton site se fait attacker, tu peux voir:
- Qui a essayé de se connecter (email, IP, heure)
- Combien de fois ils ont échoué
- Quand les comptes ont été créés/modifiés
- Quand les passwords ont été changés

Exécute ce SQL dans Supabase (SQL Editor) :

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  email VARCHAR(254),
  ip_address VARCHAR(45),
  attempt_number INT,
  success BOOLEAN,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour chercher vite par email
CREATE INDEX idx_audit_logs_email ON audit_logs(email);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
```

**Après :** Chaque fois que quelqu'un se connecte/reset/register, c'est enregistré avec email + IP + heure.

---

## 2️⃣ ROW-LEVEL SECURITY (Isolation des comptes)

**Quoi :** Un utilisateur ne peut **JAMAIS** voir/modifier les données d'un autre utilisateur, même s'il hack ta base directement.

**Pourquoi :** Même un attaquant avec accès Supabase ne peut voler qu'**un seul compte à la fois**, pas tous les 10000.

**Setup (via interface Supabase, pas SQL) :**

1. Va dans Supabase → ton projet → **Authentication** → **Policies**
2. Sur la table `users` :
   - Enable RLS (toggle)
   - Ajoute une policy :
     ```
     Name: Users can only read own data
     Target roles: authenticated
     Permissions: SELECT
     USING expression: auth.uid()::text = id::text
     ```

3. Ajoute une policy pour UPDATE :
     ```
     Name: Users can only update own data
     Target roles: authenticated
     Permissions: UPDATE
     USING expression: auth.uid()::text = id::text
     WITH CHECK expression: auth.uid()::text = id::text
     ```

**Résultat :** Si quelqu'un essaie de lire les données d'un autre via Supabase, il reçoit une erreur "permission denied".

---

## 3️⃣ INDEXES DE SÉCURITÉ (Requêtes rapides = moins de charge)

**Quoi :** Créer des indexes sur les colonnes qu'on cherche souvent.

**Pourquoi :** 
- Login rapide = moins de charge serveur = moins vulnérable aux DDoS
- Index sur `email` = très important (on cherche par email à chaque login)

```sql
-- Déjà fait probablement, mais à confirmer:
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Autres indexes utiles:
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_reset_tokens_email ON reset_tokens(email);
CREATE INDEX idx_reset_tokens_expires ON reset_tokens(expires_at);
```

---

## 4️⃣ COLONNES "READONLY" (Protection contre escalade de privilèges)

**Quoi :** Certaines colonnes (comme `is_admin`) ne peuvent **jamais** être modifiées par l'API, seulement par Supabase directement.

**Pourquoi :** Un attaquant ne peut pas se faire admin en hackant ton API.

Via RLS, tu peux faire une policy :
```sql
Name: Only service role can modify is_admin
Target roles: authenticated
Permissions: UPDATE
WITH CHECK expression: is_admin = OLD.is_admin
```

Cela signifie : même si quelqu'un essaie de changer `is_admin`, ça reste la même valeur (readonly).

---

## 5️⃣ CHIFFREMENT AT REST (Données chiffrées dans la base)

**Quoi :** Les données sont chiffrées **avant** d'être écrites sur le disque de Supabase.

**Pourquoi :** Si quelqu'un vol le disque physiquement, les données sont juste du charabia chiffré.

**Status :** Supabase/PostgreSQL fait ça **automatiquement** → tu n'as rien à faire. ✅

Vérifie : Supabase → Settings → **Database** → tu devrais voir "Encryption at rest: Enabled"

---

## 6️⃣ BACKUPS AUTOMATIQUES (Récupération après disaster)

**Quoi :** Supabase sauvegarde ta base de données **automatiquement** chaque jour.

**Pourquoi :** Si tu te fais attacker et tes données effacées, tu peux restaurer une backup d'hier.

**Setup :**
1. Va dans Supabase → Settings → **Backups**
2. Tu devrais voir des backups quotidiennes
3. Tu peux restaurer une backup en 1 clic

**Rétention :** Par défaut 7 jours (il y a une backup de chaque jour pendant 7 jours)

---

## 📋 CHECKLIST FINAL

- [ ] Exécuté le SQL audit_logs dans Supabase SQL Editor
- [ ] Activé RLS sur la table `users`
- [ ] Ajouté les policies RLS (SELECT + UPDATE)
- [ ] Créé les indexes de sécurité
- [ ] Vérifié Encryption at rest = Enabled
- [ ] Vérifié que les Backups quotidiennes sont actives
- [ ] (Optionnel) Configuré les colonnes readonly via RLS

---

## 🚀 NEXT STEPS

Après Step 5, ton site est **vraiment** sécurisé:
- ✅ API protégée (rate limit, CORS, headers)
- ✅ Paiements sûrs (webhooks vérifiés)
- ✅ Comptes protégés (tokens expiration, blocage)
- ✅ Inputs validés (CSP, validation stricte)
- ✅ Base de données sécurisée (RLS, audit, backups)

C'est un niveau **enterprise-grade** de sécurité. 🎯
